import { getMoonPosition } from '../ephemeris/moon.js';
import { nutationInLongitude } from '../ephemeris/nutation.js';
import { getSunPosition } from '../ephemeris/sun.js';
import { meanObliquity } from '../houses/obliquity.js';
import { toUT } from '../time/delta-t.js';
import { greenwichMeanSiderealTime } from '../time/sidereal-time.js';
import { findEclipses, lunar, minimum } from './eclipses.js';
import { interval } from './search.js';
import type {
  EclipseObserver,
  LunarEclipseEvent,
  LunarEclipseLocal,
  SolarEclipseEvent,
  SolarEclipseLocal,
} from './types.js';

const rad = Math.PI / 180;
const au = 149597870.7 / 6378.137;
const kp = 0.2725076;
const ku = 0.272281;
type Vec = [number, number, number];
const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (v: Vec) => Math.hypot(...v);
const clamp = (x: number) => Math.max(-1, Math.min(1, x));
const instant = (jd: number) => ({ jd, jdUT: toUT(jd) });
function validate(observer: EclipseObserver) {
  const { latitude, longitude, elevation = 0 } = observer;
  if (
    !Number.isFinite(latitude) ||
    Math.abs(latitude) > 90 ||
    !Number.isFinite(longitude) ||
    Math.abs(longitude) > 180 ||
    !Number.isFinite(elevation) ||
    elevation <= -6378137
  )
    throw new RangeError(
      'Expected finite geodetic latitude [-90,90], longitude [-180,180] and elevation',
    );
}
function resolve(eclipse: SolarEclipseEvent | LunarEclipseEvent | number, kind: 'solar' | 'lunar') {
  const jd = typeof eclipse === 'number' ? eclipse : eclipse.jd;
  interval(jd, jd);
  if (typeof eclipse !== 'number' && eclipse.kind !== kind)
    throw new RangeError('Wrong eclipse kind');
  const event = findEclipses(jd - 0.5, jd + 0.5, { kinds: [kind] })[0];
  if (!event) throw new RangeError('Expected a greatest-eclipse TT instant');
  return event.jd;
}
function sky(jd: number, observer: EclipseObserver) {
  const t = (jd - 2451545) / 36525;
  // Four leading obliquity terms (Meeus 22); longitude uses the shared IAU 2000B series.
  const omega = (125.04452 - 1934.136261 * t) * rad;
  const ls = (280.4665 + 36000.7698 * t) * rad;
  const lm = (218.3165 + 481267.8813 * t) * rad;
  const deps =
    (9.2 * Math.cos(omega) +
      0.57 * Math.cos(2 * ls) +
      0.1 * Math.cos(2 * lm) -
      0.09 * Math.cos(2 * omega)) /
    3600;
  const eps = (meanObliquity(t) + deps) * rad;
  // Apparent sidereal time from UT, with the equation of the equinoxes evaluated at TT.
  const theta =
    (greenwichMeanSiderealTime(toUT(jd)) +
      nutationInLongitude(t) * Math.cos(eps) +
      observer.longitude) *
    rad;
  const phi = observer.latitude * rad;
  const sin = Math.sin(phi),
    cos = Math.cos(phi);
  const e2 = (1 / 298.257223563) * (2 - 1 / 298.257223563);
  const n = 1 / Math.sqrt(1 - e2 * sin * sin);
  const h = (observer.elevation ?? 0) / 6378137;
  const site: Vec = [
    (n + h) * cos * Math.cos(theta),
    (n + h) * cos * Math.sin(theta),
    (n * (1 - e2) + h) * sin,
  ];
  const up: Vec = [cos * Math.cos(theta), cos * Math.sin(theta), sin];
  const north: Vec = [-sin * Math.cos(theta), -sin * Math.sin(theta), cos];
  const east: Vec = [-Math.sin(theta), Math.cos(theta), 0];
  function body(p: { longitude: number; latitude: number; distance: number }) {
    const l = p.longitude * rad,
      b = p.latitude * rad,
      r = p.distance * au;
    const v: Vec = [
      r * Math.cos(b) * Math.cos(l) - site[0],
      r * (Math.cos(b) * Math.sin(l) * Math.cos(eps) - Math.sin(b) * Math.sin(eps)) - site[1],
      r * (Math.cos(b) * Math.sin(l) * Math.sin(eps) + Math.sin(b) * Math.cos(eps)) - site[2],
    ];
    const distance = norm(v);
    return {
      v,
      distance,
      altitude: Math.asin(clamp(dot(v, up) / distance)) / rad,
      azimuth: (Math.atan2(dot(v, east), dot(v, north)) / rad + 360) % 360,
    };
  }
  return {
    sun: body(getSunPosition(jd, { includeSpeed: false, includeNutation: true })),
    moon: body(getMoonPosition(jd, { includeSpeed: false, includeNutation: true })),
  };
}
function solarGeometry(jd: number, observer: EclipseObserver) {
  const { sun, moon } = sky(jd, observer);
  // atan2 avoids loss of angular precision near a central eclipse.
  const cross: Vec = [
    sun.v[1] * moon.v[2] - sun.v[2] * moon.v[1],
    sun.v[2] * moon.v[0] - sun.v[0] * moon.v[2],
    sun.v[0] * moon.v[1] - sun.v[1] * moon.v[0],
  ];
  return {
    sun,
    separation: Math.atan2(norm(cross), dot(sun.v, moon.v)),
    rs: Math.asin(696000 / 6378.137 / sun.distance),
    rp: Math.asin(kp / moon.distance),
    ru: Math.asin(ku / moon.distance),
  };
}
// Solve a sign-changing bracket to <0.01 seconds, including grazing short phases.
function root(f: (jd: number) => number, a: number, b: number) {
  let fa = f(a);
  while (b - a > 1e-7) {
    const c = (a + b) / 2;
    const fc = f(c);
    if (fc > 0 === fa > 0) {
      a = c;
      fa = fc;
    } else b = c;
  }
  return (a + b) / 2;
}
function contacts(f: (jd: number) => number, center: number): [number, number] | null {
  if (f(center) > 0) return null;
  const ends: number[] = [];
  for (const direction of [-1, 1]) {
    let outer = center;
    for (let i = 0; i < 48; i++) {
      outer += direction / 48;
      if (f(outer) > 0) break;
    }
    if (f(outer) <= 0) throw new RangeError('Contact not bracketed within one day');
    ends.push(root(f, Math.min(center, outer), Math.max(center, outer)));
  }
  return [ends[0], ends[1]];
}
// Include interior horizon crossings: endpoint-only checks miss rise-and-set intervals.
function above(f: (jd: number) => number, a: number, b: number) {
  if (f(a) > 0 || f(b) > 0) return true;
  // Each interval is shorter than a day; sample brackets then refine every local peak.
  const count = Math.max(8, Math.ceil((b - a) * 288));
  let prev = f(a),
    current = f(a + (b - a) / count);
  for (let i = 1; i < count; i++) {
    const next = f(a + ((b - a) * (i + 1)) / count);
    if (current > 0) return true;
    if (current >= prev && current >= next) {
      const peak = minimum(
        (t) => -f(t),
        a + ((b - a) * (i - 1)) / count,
        a + ((b - a) * (i + 1)) / count,
      );
      if (f(peak) > 0) return true;
    }
    prev = current;
    current = next;
  }
  return false;
}
function obscuration(d: number, s: number, m: number) {
  if (d >= s + m) return 0;
  if (d <= Math.abs(s - m)) return Math.min(1, (m / s) ** 2);
  const x = clamp((d * d + s * s - m * m) / (2 * d * s));
  const y = clamp((d * d + m * m - s * s) / (2 * d * m));
  const area =
    s * s * Math.acos(x) +
    m * m * Math.acos(y) -
    0.5 * Math.sqrt(Math.max(0, (-d + s + m) * (d + s - m) * (d - s + m) * (d + s + m)));
  return Math.max(0, Math.min(1, area / (Math.PI * s * s)));
}
/**
 * Topocentric local solar circumstances on WGS84. Horizon is geometric Sun centre >0°,
 * without refraction, terrain or lunar limb relief. Azimuth is north=0°, east=90°.
 * Contacts include below-horizon phases. Maximum maximizes diameter magnitude over ±0.4 day.
 * Solver convergence is <0.01 s, distinct from ephemeris or ΔT accuracy.
 * @example getSolarEclipseLocal(2461265.2403, { latitude: 64.1466, longitude: -21.9426 })
 */
export function getSolarEclipseLocal(
  eclipse: SolarEclipseEvent | number,
  observer: EclipseObserver,
): SolarEclipseLocal {
  validate(observer);
  const jd = resolve(eclipse, 'solar');
  const magnitude = (t: number) => {
    const g = solarGeometry(t, observer);
    return (g.rs + g.rp - g.separation) / (2 * g.rs);
  };
  // Locate all candidate minima; a day can include two horizon passages.
  let maximum = jd,
    best = -Infinity;
  for (let i = 0; i < 16; i++) {
    const a = jd - 0.4 + i * 0.05;
    const t = minimum((t) => -magnitude(t), a, a + 0.05);
    const value = magnitude(t);
    if (value > best) {
      maximum = t;
      best = value;
    }
  }
  const g = solarGeometry(maximum, observer);
  const partial = contacts((t) => {
    const x = solarGeometry(t, observer);
    return x.separation - x.rs - x.rp;
  }, maximum);
  const centralFunction = (t: number) => {
    const x = solarGeometry(t, observer);
    return x.separation - Math.abs(x.rs - x.ru);
  };
  const centralMaximum = minimum(centralFunction, maximum - 0.02, maximum + 0.02);
  const central = partial ? contacts(centralFunction, centralMaximum) : null;
  const contact = (t: number) => ({ ...instant(t), sunAltitude: sky(t, observer).sun.altitude });
  return {
    kind: 'solar',
    localType: !partial ? 'none' : central ? (g.ru >= g.rs ? 'total' : 'annular') : 'partial',
    visible: partial ? above((t) => sky(t, observer).sun.altitude, ...partial) : false,
    maximum: {
      ...instant(maximum),
      magnitude: Math.max(0, best),
      obscuration: obscuration(g.separation, g.rs, g.rp),
      sunAltitude: g.sun.altitude,
      sunAzimuth: g.sun.azimuth,
    },
    partialBegin: partial ? contact(partial[0]) : null,
    partialEnd: partial ? contact(partial[1]) : null,
    centralBegin: central ? contact(central[0]) : null,
    centralEnd: central ? contact(central[1]) : null,
    duration: central ? (central[1] - central[0]) * 86400 : null,
  };
}
/**
 * Global NASA Canon contacts (1.01 enlarged umbra) with topocentric geometric Moon
 * centre altitudes, no refraction. Visibility means altitude >0° at any point of the phase;
 * visibleDuringUmbral is false for penumbral eclipses. Absent phase durations are zero.
 * @example getLunarEclipseLocal(2461102, { latitude: 40.7128, longitude: -74.006 })
 */
export function getLunarEclipseLocal(
  eclipse: LunarEclipseEvent | number,
  observer: EclipseObserver,
): LunarEclipseLocal {
  validate(observer);
  const jd = resolve(eclipse, 'lunar');
  const phase = (which: 'penumbralMagnitude' | 'umbralMagnitude', level: number) =>
    contacts((t) => level - (lunar(t)?.[which] ?? -1), jd);
  const p = phase('penumbralMagnitude', 0),
    u = phase('umbralMagnitude', 0),
    total = phase('umbralMagnitude', 1);
  const altitude = (t: number) => sky(t, observer).moon.altitude;
  const contact = (t: number) => ({ ...instant(t), altitude: altitude(t) });
  const duration = (pair: [number, number] | null) => (pair ? (pair[1] - pair[0]) * 1440 : 0);
  const moonAltitude = altitude(jd);
  return {
    kind: 'lunar',
    maximum: instant(jd),
    moonAltitude,
    visibleAtMaximum: moonAltitude > 0,
    visibleDuringUmbral: u ? above(altitude, ...u) : false,
    visibleDuringEclipse: p ? above(altitude, ...p) : false,
    P1: p ? contact(p[0]) : null,
    P4: p ? contact(p[1]) : null,
    U1: u ? contact(u[0]) : null,
    U4: u ? contact(u[1]) : null,
    U2: total ? contact(total[0]) : null,
    U3: total ? contact(total[1]) : null,
    durations: { penumbral: duration(p), partial: duration(u), total: duration(total) },
  };
}
