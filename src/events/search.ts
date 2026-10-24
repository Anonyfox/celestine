/** Internal angular root search. All times are TT days; rates are degrees/day. */
export type Sample = { value: number; rate: number };
export const wrap = (x: number): number => {
  const value = (((x % 360) + 540) % 360) - 180;
  return value === -180 ? 180 : value;
};
export const normalize = (x: number): number => ((x % 360) + 360) % 360;

export function interval(a: number, b: number): void {
  if (!Number.isFinite(a) || !Number.isFinite(b) || a > b)
    throw new RangeError('Expected finite TT Julian Dates with startJD <= endJD');
}

// Require both angular and time residuals: a tiny angle alone is insufficient
// close to a station, where a small positional residual can mean seconds of time.
function nearRoot(sample: Sample): boolean {
  return (
    sample.value === 0 ||
    (Math.abs(sample.value) < 1e-8 && Math.abs(sample.value / sample.rate) < 1e-7)
  );
}

// Bracket-preserving Newton, falling back to bisection. The angle residual check
// gives boundary accuracy even for the fast Moon; the bracket caps time error.
function refine(f: (t: number) => Sample, a: number, b: number, fa: Sample, fb: Sample): number {
  let x = Math.abs(fa.value) < Math.abs(fb.value) ? a : b;
  let fx = x === a ? fa : fb;
  for (let i = 0; i < 120; i++) {
    if (nearRoot(fx) || b - a < 1e-9) return x;
    const newton = x - fx.value / fx.rate;
    const t =
      i % 3 !== 2 && Number.isFinite(newton) && newton > a && newton < b ? newton : (a + b) / 2;
    if (t === a || t === b) return x;
    const ft = f(t);
    if (ft.value < 0 === fa.value < 0) {
      a = t;
      fa = ft;
    } else {
      b = t;
    }
    x = t;
    fx = ft;
  }
  return x;
}

/**
 * THE station solver: the zero of the rate in [lo, hi], whose end rates have opposite
 * signs. Regula falsi alternating with bisection (at least halves the bracket every two
 * evaluations, superlinear near a simple zero) to 1e-7 d (9 ms); returns the midpoint and
 * its sample as [jd, sample]. Used by roots() to split at rate reversals, by findStations and by transits'
 * findStationPoints.
 */
export function stationIn(
  f: (t: number) => Sample,
  lo: number,
  hi: number,
  fl: number,
  fr: number,
): [number, Sample] {
  for (let i = 0; hi - lo > 1e-7; i++) {
    let t = (lo * fr - hi * fl) / (fr - fl);
    if (i % 2 || !(t > lo && t < hi)) t = (lo + hi) / 2;
    const rate = f(t).rate;
    if (rate < 0 === fl < 0) {
      lo = t;
      fl = rate;
    } else {
      hi = t;
      fr = rate;
    }
  }
  const jd = (lo + hi) / 2;
  return [jd, f(jd)];
}

// Station scan steps (days): about a fifth of the shortest gap between stations over
// 1900–2100 (Mercury 19.8 d, Venus 40.9, Mars 59.9, Jupiter–Pluto and Chiron ≥117).
const STATION_STEPS: Record<string, number> = { Mercury: 4, Venus: 8, Mars: 12 };
export const stationStep = (body: string): number => STATION_STEPS[body] ?? 20;

/**
 * Every station (rate sign change) in [a, b] (validated by the caller), sampled every `step`
 * days; assumes at most one station per step. Each comes with its sample and the motion
 * that follows.
 */
export function stations(
  f: (t: number) => Sample,
  a: number,
  b: number,
  step: number,
): { jd: number; sample: Sample; retrograde: boolean }[] {
  const found: { jd: number; sample: Sample; retrograde: boolean }[] = [];
  let lo = a;
  let left = f(lo);
  while (lo < b) {
    const hi = Math.min(b, lo + step);
    const right = f(hi);
    if (left.rate < 0 !== right.rate < 0) {
      const [jd, sample] = stationIn(f, lo, hi, left.rate, right.rate);
      found.push({ jd, sample, retrograde: right.rate < 0 });
    }
    lo = hi;
    left = right;
  }
  return found;
}

/**
 * One shared core, including station splitting. Assumes at most one rate reversal
 * per sampling interval and <180 degrees of motion per interval. Tangencies are
 * returned once. Functions identically zero have no isolated event (return []).
 */
export function roots(f: (t: number) => Sample, a: number, b: number, step: number): number[] {
  interval(a, b);
  if (!(step > 0) || !Number.isFinite(step)) throw new RangeError('Expected positive finite step');
  const found: number[] = [];
  const add = (t: number) => found.push(t);
  const segment = (lo: number, hi: number, left: Sample, right: Sample) => {
    if (nearRoot(left) && (left.rate !== 0 || right.value !== 0)) add(lo);
    if (nearRoot(right) && (right.rate !== 0 || left.value !== 0)) add(hi);
    if (left.value * right.value < 0 && Math.abs(left.value) + Math.abs(right.value) < 180)
      add(refine(f, lo, hi, left, right));
  };
  let lo = a;
  let left = f(lo);
  if (a === b) segment(a, b, left, left);
  while (lo < b) {
    const hi = Math.min(b, lo + step);
    const right = f(hi);
    if (left.rate * right.rate < 0) {
      const [t, station] = stationIn(f, lo, hi, left.rate, right.rate);
      if (Math.abs(station.value) < 1e-12) add(t);
      segment(lo, t, left, station);
      segment(t, hi, station, right);
    } else segment(lo, hi, left, right);
    lo = hi;
    left = right;
  }
  return found.sort((x, y) => x - y).filter((t, i, all) => i === 0 || t - all[i - 1]! > 1e-6);
}

/** Reuse all sampled positions across target angles, including station samples. */
export function crossings(
  f: (t: number) => Sample,
  targets: readonly number[],
  a: number,
  b: number,
  step: number,
): { jd: number; target: number; rate: number }[] {
  interval(a, b);
  const cache = new Map<number, Sample>();
  const at = (t: number): Sample => {
    let s = cache.get(t);
    if (!s) {
      s = f(t);
      cache.set(t, s);
    }
    return s;
  };
  return targets
    .flatMap((target) =>
      roots(
        (t) => {
          const s = at(t);
          return { value: wrap(s.value - target), rate: s.rate };
        },
        a,
        b,
        step,
      ).map((jd) => ({ jd, target, rate: at(jd).rate })),
    )
    .sort((x, y) => x.jd - y.jd);
}
