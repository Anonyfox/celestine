import { getMoonPosition, moonLatitude } from '../ephemeris/moon.js';
import { getSunPosition } from '../ephemeris/sun.js';
import { meanObliquity } from '../houses/obliquity.js';
import { toUT } from '../time/delta-t.js';
import { getSignName } from '../zodiac/sign-properties.js';
import { findLunarPhases } from './lunar.js';
import { interval } from './search.js';
import type { EclipseEvent, EclipseKind, EventFrameOptions } from './types.js';

const rad = Math.PI / 180;
const earth = 6378.137;
const au = 149597870.7;
const solarRadius = 696000 / earth;
const kp = 0.2725076;
const ku = 0.272281;
const polar2 = (1 - 1 / 298.257) ** 2;
type Vector = [number, number, number];
const dot = (a: Vector, b: Vector) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const length = (v: Vector) => Math.hypot(...v);
const scaled = (v: Vector, s: number): Vector => [v[0] * s, v[1] * s, v[2] * s];
const subtract = (a: Vector, b: Vector): Vector => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
function vector(p: { longitude: number; latitude: number; distance: number }, eps: number): Vector {
  const l = p.longitude * rad;
  const b = p.latitude * rad;
  const r = (p.distance * au) / earth;
  return [
    r * Math.cos(b) * Math.cos(l),
    r * (Math.cos(b) * Math.sin(l) * Math.cos(eps) - Math.sin(b) * Math.sin(eps)),
    r * (Math.cos(b) * Math.sin(l) * Math.sin(eps) + Math.sin(b) * Math.cos(eps)),
  ];
}
function geometry(jd: number, kind: EclipseKind) {
  const eps = meanObliquity((jd - 2451545) / 36525) * rad;
  const s = vector(getSunPosition(jd, { includeSpeed: false }), eps);
  const m = vector(getMoonPosition(jd, { includeSpeed: false }), eps);
  const delta = kind === 'solar' ? subtract(s, m) : s;
  const distance = length(delta);
  const u = scaled(delta, 1 / distance);
  const z = dot(m, u);
  const p = subtract(m, scaled(u, z));
  const rho = length(p);
  const y = p[2] / Math.sqrt(1 - u[2] ** 2);
  const x = (p[1] * u[0] - p[0] * u[1]) / Math.sqrt(1 - u[2] ** 2);
  // Projected oblate Earth: x² + y²/b² <= 1. z0 is the midpoint of the
  // axis/ellipsoid chord; h is its half length, both along the Sunward axis.
  const b2 = 1 - (1 - polar2) * (1 - u[2] ** 2);
  const q = 1 + (1 / polar2 - 1) * u[2] ** 2;
  const z0 = (-(1 / polar2 - 1) * p[2] * u[2]) / q;
  const inside = 1 - x * x - (y * y) / b2;
  const h = Math.sqrt(Math.max(0, inside) / q);
  const f1 = (solarRadius + kp) / Math.sqrt(distance ** 2 - (solarRadius + kp) ** 2);
  const f2 = (solarRadius - ku) / Math.sqrt(distance ** 2 - (solarRadius - ku) ** 2);
  const l1 = z * f1 + kp * Math.sqrt(1 + f1 * f1);
  const l2 = z * f2 - ku * Math.sqrt(1 + f2 * f2);
  return { s, m, rho, gamma: Math.sign(y) * rho, x, y, b2, z0, h, inside, f1, f2, l1, l2 };
}
/** @internal Golden-section minimisation to <0.01 seconds. @example minimum(f, a, b) */
export function minimum(f: (jd: number) => number, a: number, b: number): number {
  const g = (Math.sqrt(5) - 1) / 2;
  let c = b - g * (b - a),
    d = a + g * (b - a);
  let fc = f(c),
    fd = f(d);
  while (b - a > 1e-7) {
    if (fc < fd) {
      b = d;
      d = c;
      fd = fc;
      c = b - g * (b - a);
      fc = f(c);
    } else {
      a = c;
      c = d;
      fc = fd;
      d = a + g * (b - a);
      fd = f(d);
    }
  }
  return (a + b) / 2;
}
function solar(jd: number) {
  const g = geometry(jd, 'solar');
  const central = g.inside >= 0;
  let z = g.z0 + g.h;
  let m = 0;
  if (!central) {
    // Nearest point on the projected ellipsoid, using its Lagrange multiplier.
    let lo = 0,
      hi = 4;
    for (let i = 0; i < 45; i++) {
      const t = (lo + hi) / 2;
      if ((g.x / (1 + t)) ** 2 + g.b2 * (g.y / (g.b2 + t)) ** 2 > 1) lo = t;
      else hi = t;
    }
    const x = g.x / (1 + hi),
      y = (g.b2 * g.y) / (g.b2 + hi);
    m = Math.hypot(g.x - x, g.y - y);
    z = (g.z0 * g.b2) / (g.b2 + hi);
  }
  const L1 = g.l1 - z * g.f1,
    L2 = g.l2 - z * g.f2;
  if (m >= L1) return null;
  let type: 'total' | 'annular' | 'hybrid' | 'partial' =
    central || m < Math.abs(L2) ? (L2 < 0 ? 'total' : 'annular') : 'partial';
  if (central) {
    for (const direction of [-1, 1]) {
      let a = jd,
        b = jd + direction * 0.3;
      for (let i = 0; i < 30; i++) {
        const t = (a + b) / 2;
        if (geometry(t, 'solar').inside > 0) a = t;
        else b = t;
      }
      const limb = geometry((a + b) / 2, 'solar');
      if (limb.l2 - limb.z0 * limb.f2 < 0 !== L2 < 0) type = 'hybrid';
    }
  }
  return {
    kind: 'solar' as const,
    type,
    central,
    gamma: g.gamma,
    magnitude: central ? (L1 - L2) / (L1 + L2) : (L1 - m) / (L1 + L2),
  };
}
/** @internal Shared NASA lunar shadow geometry. @example lunar(2461102.98) */
export function lunar(jd: number) {
  const g = geometry(jd, 'lunar');
  const r = length(g.m),
    s = length(g.s);
  const pm = Math.asin(1 / r),
    ss = Math.asin(solarRadius / s),
    ps = Math.asin(1 / s);
  const sm = Math.asin(kp / r);
  const sep = Math.asin(g.rho / r);
  const umbralMagnitude = (1.01 * pm - ss + ps + sm - sep) / (2 * sm);
  const penumbralMagnitude = (1.01 * pm + ss + ps + sm - sep) / (2 * sm);
  if (penumbralMagnitude <= 0) return null;
  const type: 'total' | 'partial' | 'penumbral' =
    umbralMagnitude >= 1 ? 'total' : umbralMagnitude > 0 ? 'partial' : 'penumbral';
  return {
    kind: 'lunar' as const,
    type,
    gamma: g.gamma,
    umbralMagnitude,
    penumbralMagnitude,
    magnitude: type === 'penumbral' ? penumbralMagnitude : umbralMagnitude,
  };
}
/**
 * Find greatest solar and lunar eclipses in an inclusive TT interval, using NASA Canon
 * shadow definitions. Longitudes are apparent geocentric, mean equinox/ecliptic of date
 * by default, or true equinox with includeNutation. jd is TT; jdUT uses time.toUT.
 * @param startJD - Inclusive start, TT Julian Date.
 * @param endJD - Inclusive end, TT Julian Date.
 * @param options - Frame and kinds to include (default both); duplicates are ignored.
 * @returns Chronologically ordered eclipses with signed gamma in Earth equatorial radii.
 * @example findEclipses(2460310.5, 2460676.5, { kinds: ['solar'] })
 */
export function findEclipses(
  startJD: number,
  endJD: number,
  options: EventFrameOptions & { kinds?: EclipseKind[] } = {},
): EclipseEvent[] {
  interval(startJD, endJD);
  const kinds = options.kinds ?? ['solar', 'lunar'];
  if (kinds.some((k) => k !== 'solar' && k !== 'lunar'))
    throw new RangeError('Unknown eclipse kind');
  const phases = findLunarPhases(startJD - 0.5, endJD + 0.5, {
    phases: kinds.flatMap((k) => (k === 'solar' ? ['new-moon' as const] : ['full-moon' as const])),
  });
  const result: EclipseEvent[] = [];
  for (const phase of phases) {
    if (Math.abs(moonLatitude((phase.jd - 2451545) / 36525)) > 1.8) continue;
    const kind = phase.phase === 'new-moon' ? 'solar' : 'lunar';
    // Canonical bracket makes an event bit-identical across overlapping search windows.
    const center = Math.round(phase.jd * 1000) / 1000;
    const jd = minimum((t) => geometry(t, kind).rho ** 2, center - 0.4, center + 0.4);
    if (jd < startJD - 1e-7 || jd > endJD + 1e-7) continue;
    const eclipse = kind === 'solar' ? solar(jd) : lunar(jd);
    if (!eclipse) continue;
    const frame = { includeNutation: options.includeNutation ?? options.nutation };
    const sunLongitude = getSunPosition(jd, frame).longitude;
    const moonLongitude = getMoonPosition(jd, frame).longitude;
    result.push({
      ...eclipse,
      jd,
      jdUT: toUT(jd),
      sunLongitude,
      sunSign: Math.floor(sunLongitude / 30),
      sunSignName: getSignName(Math.floor(sunLongitude / 30)),
      moonLongitude,
      moonSign: Math.floor(moonLongitude / 30),
      moonSignName: getSignName(Math.floor(moonLongitude / 30)),
    });
  }
  return result.sort((a, b) => a.jd - b.jd);
}

type EclipseSearchOptions = EventFrameOptions & { kinds?: EclipseKind[] };
function adjacent(jd: number, direction: number, options: EclipseSearchOptions): EclipseEvent {
  interval(jd, jd);
  // Overlap by a day so rounding of a phase candidate cannot hide a boundary event.
  for (let offset = 0; offset < 1200; offset += 200) {
    const a = jd + direction * offset;
    const b = jd + direction * (offset + 201);
    const events = findEclipses(Math.min(a, b), Math.max(a, b), options).filter(
      (e) => direction * (e.jd - jd) > 0,
    );
    if (events.length) return direction > 0 ? events[0] : events[events.length - 1];
  }
  throw new RangeError('No eclipse of the requested kinds within 1201 days');
}
/** Find the first eclipse strictly after a TT instant. @example findNextEclipse(2461041.5) */
export function findNextEclipse(jd: number, options: EclipseSearchOptions = {}): EclipseEvent {
  return adjacent(jd, 1, options);
}
/** Find the first eclipse strictly before a TT instant. @example findPreviousEclipse(2461041.5) */
export function findPreviousEclipse(jd: number, options: EclipseSearchOptions = {}): EclipseEvent {
  return adjacent(jd, -1, options);
}
