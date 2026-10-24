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
      // Rate's derivative is not supplied: bisect it, reusing endpoint samples.
      let l = lo;
      let r = hi;
      let sl = left;
      while (r - l > 1e-7) {
        const mid = (l + r) / 2;
        if (mid === l || mid === r) break;
        const sm = f(mid);
        if (sm.rate < 0 === sl.rate < 0) {
          l = mid;
          sl = sm;
        } else r = mid;
      }
      const t = (l + r) / 2;
      const station = f(t);
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
