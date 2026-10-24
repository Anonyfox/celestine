import { DEG_TO_RAD } from '../constants.js';
import { nutationInLongitude } from '../nutation.js';
import type { EphemerisOptions, PlanetPosition } from '../types.js';

/** Sum of A·cos(B + C·τ) over VSOP87 terms. */
function evaluateSeries(
  terms: readonly (readonly [number, number, number])[],
  tau: number,
): number {
  let sum = 0;
  for (const term of terms) sum += term[0] * Math.cos(term[1] + term[2] * tau);
  return sum;
}

// VSOP87D Earth: retain terms with A * 0.201^order >= 10 (1e-8 rad/AU).
const earthVsop: Vsop = [
  [
    [
      [175347046, 0, 0],
      [3341656, 4.669257, 6283.07585],
      [34894, 4.6261, 12566.1517],
      [3418, 2.829, 3.523],
      [3497, 2.744, 5753.385],
      [3136, 3.628, 77713.772],
      [2676, 4.418, 7860.419],
      [2343, 6.135, 3930.21],
      [1273, 2.037, 529.691],
      [1324, 0.743, 11506.77],
      [902, 2.04, 26.3],
      [1199, 1.11, 1577.343],
      [857, 3.51, 398.15],
      [780, 1.18, 5223.69],
      [990, 5.23, 5884.93],
      [753, 2.53, 5507.55],
      [505, 4.58, 18849.23],
      [492, 4.21, 775.52],
      [357, 2.92, 0.07],
      [284, 1.9, 796.3],
      [243, 0.34, 5486.78],
      [317, 5.85, 11790.63],
      [271, 0.32, 10977.08],
      [206, 4.81, 2544.31],
      [205, 1.87, 5573.14],
      [202, 2.46, 6069.78],
      [126, 1.08, 20.77],
      [156, 0.83, 213.3],
      [115, 0.65, 0.98],
      [103, 0.64, 4694],
      [102, 4.27, 7.11],
      [99, 6.21, 2146.16],
      [132, 3.41, 2942.46],
      [98, 0.68, 155.42],
      [85, 1.3, 6275.96],
      [75, 1.75, 5088.63],
      [102, 0.98, 15720.84],
      [85, 3.67, 71430.7],
      [74, 4.68, 801.82],
      [74, 3.5, 3154.69],
      [79, 3.04, 12036.46],
      [80, 1.81, 17260.15],
      [86, 5.98, 161000.69],
      [57, 2.78, 6286.6],
      [61, 1.82, 7084.9],
      [70, 0.83, 9437.76],
      [56, 4.39, 14143.5],
      [62, 3.98, 8827.39],
      [51, 0.28, 5856.48],
      [56, 3.47, 6279.55],
      [41, 5.37, 8429.24],
      [52, 1.33, 1748.02],
      [52, 0.19, 12139.55],
      [49, 0.49, 1194.45],
      [39, 6.17, 10447.39],
      [36, 1.78, 6812.77],
      [37, 6.04, 10213.29],
      [37, 2.57, 1059.38],
      [33, 0.59, 17789.85],
      [36, 1.71, 2352.87],
      [41, 2.4, 19651.05],
      [30, 2.74, 1349.87],
      [30, 0.44, 83996.85],
      [24, 0.48, 8031.09],
      [24, 2.06, 3340.61],
      [21, 4.15, 951.72],
      [25, 0.21, 3.59],
      [25, 3.17, 4690.48],
      [23, 5.22, 4705.73],
      [21, 1.43, 16730.46],
      [22, 5.56, 553.57],
      [17, 4.56, 135.06],
      [20, 5.22, 12168],
      [20, 5.78, 6309.37],
      [20, 0.37, 283.86],
      [14, 4.19, 242.73],
      [16, 5.99, 11769.85],
      [15, 4.2, 6256.78],
      [19, 3.82, 23581.26],
      [19, 5.39, 149854.4],
      [14, 3.72, 38.03],
      [18, 2.21, 13367.97],
      [12, 2.62, 955.6],
      [11, 0.18, 4164.31],
      [14, 4.4, 6681.23],
      [14, 1.89, 7632.94],
      [12, 1.13, 5.52],
      [10, 5.36, 1592.6],
      [10, 1, 11371.7],
      [10, 6.2, 6438.5],
      [12, 1, 632.78],
      [11, 0.33, 103.09],
      [10, 6.03, 5746.27],
      [11, 0.94, 11926.25],
      [10, 5.24, 27511.47],
    ],
    [
      [628331966747, 0, 0],
      [206059, 2.67823, 6283.07585],
      [4303, 2.635, 12566.152],
      [425, 1.59, 3.52],
      [109, 2.97, 1577.34],
      [93, 2.59, 18849.23],
      [119, 5.8, 26.3],
      [72, 1.14, 529.69],
      [68, 1.88, 398.15],
      [67, 4.41, 5507.55],
      [59, 2.89, 5223.69],
      [56, 2.17, 155.42],
    ],
    [
      [52919, 0, 0],
      [8720, 1.072, 6283.076],
      [309, 0.87, 12566.15],
    ],
  ],
  [
    [
      [280, 3.2, 84334.66],
      [102, 5.42, 5507.55],
      [80, 3.88, 5223.69],
      [44, 3.7, 2352.87],
      [32, 4, 1577.34],
      [23, 3.98, 1047.75],
      [16, 3.56, 5856.48],
      [18, 4.98, 6283.08],
      [14, 3.7, 9437.76],
      [14, 3.41, 10213.29],
      [11, 4.83, 14143.5],
      [11, 2.09, 6812.77],
      [10, 3.47, 4694],
      [10, 4.06, 71092.88],
    ],
  ],
  [
    [
      [100013989, 0, 0],
      [1670700, 3.098463, 6283.07585],
      [13956, 3.0553, 12566.1517],
      [3084, 5.199, 77713.772],
      [1628, 1.174, 5753.385],
      [1576, 2.847, 7860.419],
      [925, 5.45, 11506.77],
      [542, 4.56, 3930.21],
      [472, 3.66, 5884.93],
      [329, 5.9, 5223.69],
      [346, 0.96, 5507.55],
      [307, 0.3, 5573.14],
      [175, 3.01, 18849.23],
      [243, 4.27, 11790.63],
      [212, 5.85, 1577.34],
      [186, 5.02, 10977.08],
      [110, 5.05, 5486.78],
      [98, 0.89, 6069.78],
      [86, 5.69, 15720.84],
      [86, 1.27, 161000.69],
      [63, 0.92, 529.69],
      [57, 2.01, 83996.85],
      [65, 0.27, 17260.15],
      [49, 3.25, 2544.31],
      [56, 5.24, 71430.7],
      [43, 6.01, 6275.96],
      [47, 2.58, 775.52],
      [39, 5.36, 4694],
      [45, 5.54, 9437.76],
      [36, 1.68, 12036.46],
      [32, 0.18, 5088.63],
      [32, 1.78, 398.15],
      [33, 0.24, 7084.9],
      [38, 2.39, 8827.39],
      [28, 1.21, 6286.6],
      [37, 0.83, 19651.05],
      [37, 4.9, 12139.55],
      [35, 1.84, 2942.46],
      [26, 4.59, 10447.39],
      [25, 3.79, 8429.24],
      [24, 0.27, 796.3],
      [28, 1.9, 6279.55],
      [24, 5, 5856.48],
      [20, 4.65, 2146.16],
      [23, 2.81, 14143.5],
      [22, 1.95, 3154.69],
      [20, 5.38, 2352.87],
      [18, 0.2, 6812.77],
      [17, 4.43, 10213.29],
      [16, 5.23, 17789.85],
      [17, 6.15, 16730.46],
      [14, 5.19, 8031.09],
      [19, 0.67, 149854.4],
      [18, 2.25, 23581.26],
      [14, 3.69, 4705.73],
      [13, 0.65, 13367.97],
      [10, 4.33, 11769.85],
      [10, 4.2, 6309.37],
      [10, 1.59, 4690.48],
      [10, 3.68, 27511.47],
    ],
    [
      [103019, 1.10749, 6283.07585],
      [1721, 1.064, 12566.152],
      [702, 3.14, 0],
    ],
    [[4359, 5.785, 6283.076]],
  ],
];

// Bounded cache shared across all bodies.
const earthCache = new Map<number, Spherical>();
export function earthHeliocentricPosition(tau: number): Spherical {
  const cached = earthCache.get(tau);
  if (cached) return cached;
  const p = vsopSpherical(earthVsop, tau);
  if (earthCache.size >= 12) earthCache.clear();
  earthCache.set(tau, p);
  return p;
}

// Light time per AU in days, to the precision the light-time iteration has always used.
const LIGHT_DAYS_PER_AU = 0.0057755183;

type Spherical = {
  longitude: number;
  latitude: number;
  distance: number;
  velocity?: [number, number, number];
};

/** Linear step of a spherical position: `s + dt · rate` per component. */
function advance(s: Spherical, dt: number, rate: readonly number[]): Spherical {
  return {
    longitude: s.longitude + dt * rate[0],
    latitude: s.latitude + dt * rate[1],
    distance: s.distance + dt * rate[2],
  };
}

/** Heliocentric (rad, AU) minus Earth's heliocentric position → geocentric (longitude in [0, 2π)). */
export function helioToGeo(
  { longitude: lon, latitude: lat, distance: dist }: Spherical,
  earth: Spherical,
): Spherical {
  const e = earth.distance * Math.cos(earth.latitude);
  const c = dist * Math.cos(lat); // left-associative, so x and y are bit-identical to before
  const x = c * Math.cos(lon) - e * Math.cos(earth.longitude);
  const y = c * Math.sin(lon) - e * Math.sin(earth.longitude);
  const z = dist * Math.sin(lat) - earth.distance * Math.sin(earth.latitude);
  const distance = Math.hypot(x, y, z);
  const longitude = Math.atan2(y, x);
  return {
    longitude: longitude < 0 ? longitude + 2 * Math.PI : longitude,
    latitude: Math.asin(z / distance),
    distance,
  };
}

/** Meeus Ch.21: J2000 ecliptic to mean ecliptic/equinox of date. */
export function precessEcliptic(l: number, b: number, t: number): [number, number] {
  const a = DEG_TO_RAD / 3600;
  const eta = (47.0029 * t - 0.03302 * t * t + 0.00006 * t * t * t) * a;
  const pi = (629554.9824 - 869.8089 * t + 0.03536 * t * t) * a;
  const p = (5029.0966 * t + 1.11113 * t * t - 0.000006 * t * t * t) * a;
  const A = Math.cos(eta) * Math.cos(b) * Math.sin(pi - l) - Math.sin(eta) * Math.sin(b);
  const B = Math.cos(b) * Math.cos(pi - l);
  const C = Math.cos(eta) * Math.sin(b) + Math.sin(eta) * Math.cos(b) * Math.sin(pi - l);
  return [p + pi - Math.atan2(A, B), Math.asin(C)];
}
/** First-order annual aberration, Meeus Ch.23 (mean ecliptic of date). */
export function aberration(l: number, b: number, earthL: number, t: number): [number, number] {
  const k = (20.49552 / 3600) * DEG_TO_RAD;
  const e = 0.016708634 - 0.000042037 * t - 0.0000001267 * t * t;
  const peri = (102.93735 + 1.71946 * t + 0.00046 * t * t) * DEG_TO_RAD;
  const sun = earthL + Math.PI;
  return [
    l + (k * (-Math.cos(sun - l) + e * Math.cos(peri - l))) / Math.cos(b),
    b - k * Math.sin(b) * (Math.sin(sun - l) - e * Math.sin(peri - l)),
  ];
}

/** Shared apparent geocentric pipeline. JD is TT; default frame is mean ecliptic/equinox of date.
 * Speeds use a centered ±0.01-day derivative. The callback returns radians/AU of date.
 */
export function geocentricApparent(
  heliocentric: (jd: number, observationJD: number) => Spherical,
  jd: number,
  options: EphemerisOptions = {},
  lightTimeDistance?: (jd: number) => number,
): PlanetPosition {
  const baseTau = (jd - 2451545) / 365250;
  const baseEarth = earthHeliocentricPosition(baseTau);
  const speed = options.includeSpeed !== false;
  if (speed && !baseEarth.velocity) {
    baseEarth.velocity = earthVsop.map((orders) => vsopDerivative(orders, baseTau)) as [
      number,
      number,
      number,
    ];
  }
  const rate = speed ? baseEarth.velocity : undefined;
  const position = (time: number) => {
    const T = ((time - 2451545) / 365250) * 10; // centuries, bit-identical to τ · 10
    const offset = time - jd;
    const earth = rate && offset !== 0 ? advance(baseEarth, offset, rate) : baseEarth;
    const p = heliocentric(
      time - (lightTimeDistance ? lightTimeDistance(time) * LIGHT_DAYS_PER_AU : 0),
      time,
    );
    let geo = helioToGeo(p, earth);
    if (!lightTimeDistance && p.distance !== 0) {
      const delay = geo.distance * LIGHT_DAYS_PER_AU;
      // p + (−delay)·v is bit-identical to p − delay·v.
      geo = helioToGeo(
        p.velocity ? advance(p, -delay, p.velocity) : heliocentric(time - delay, time),
        earth,
      );
    }
    const [lon, lat] = aberration(geo.longitude, geo.latitude, earth.longitude, T);
    return {
      longitude:
        (((lon / DEG_TO_RAD + (options.includeNutation ? nutationInLongitude(T) : 0)) % 360) +
          360) %
        360,
      latitude: lat / DEG_TO_RAD,
      distance: geo.distance,
      longitudeSpeed: 0,
      isRetrograde: false,
    };
  };
  // A literal, not a spread: object spread here measurably slows every position call.
  if (!speed) return position(jd);
  // Two evaluations at jd ± 0.001 d give the centered speed; their midpoint is the position at jd
  // to within h²/2·|acceleration| (< 0.001″ even for Mercury), saving a third evaluation.
  const before = position(jd - 0.001);
  const after = position(jd + 0.001);
  const delta = ((after.longitude - before.longitude + 540) % 360) - 180;
  const longitudeSpeed = delta / 0.002;
  return {
    longitude: (before.longitude + delta / 2 + 360) % 360,
    latitude: (before.latitude + after.latitude) / 2,
    distance: (before.distance + after.distance) / 2,
    longitudeSpeed,
    isRetrograde: longitudeSpeed < 0,
  };
}

/** Dominant harmonics give first-order retarded motion to <0.1″ for the retained series. */
export function heliocentricVelocity(
  l: readonly (readonly [number, number, number])[],
  b: readonly (readonly [number, number, number])[],
  r: readonly (readonly [number, number, number])[],
  meanMotion: number,
  tau: number,
): [number, number, number] {
  const derivative = (terms: readonly (readonly [number, number, number])[]) => {
    let sum = 0;
    for (let i = 0; i < Math.min(6, terms.length); i++) {
      const [a, b, c] = terms[i];
      sum -= a * c * Math.sin(b + c * tau);
    }
    return sum / 1e8 / 365250;
  };
  return [derivative(l) + meanMotion / 1e8 / 365250, derivative(b), derivative(r)];
}

/** VSOP87D coordinates L/B/R, with trailing empty orders omitted. */
type Series = readonly (readonly [number, number, number])[];
export type Vsop = readonly [readonly Series[], readonly Series[], readonly Series[]];

/** Horner evaluation in Julian millennia; amplitudes are in 1e-8 rad/AU. */
export function vsopSum(orders: readonly Series[], tau: number): number {
  let sum = 0;
  for (let i = orders.length - 1; i >= 0; i--) sum = sum * tau + evaluateSeries(orders[i], tau);
  return sum / 1e8;
}

function vsopSpherical(vsop: Vsop, tau: number): Spherical {
  return {
    longitude: vsopSum(vsop[0], tau),
    latitude: vsopSum(vsop[1], tau),
    distance: vsopSum(vsop[2], tau),
  };
}

/** Shared first-order light-time callback for VSOP87D planets. */
export function vsopHeliocentric(vsop: Vsop): (jd: number) => Spherical {
  return (jd) => {
    const tau = (jd - 2451545) / 365250;
    return {
      longitude: vsopSum(vsop[0], tau),
      latitude: vsopSum(vsop[1], tau),
      distance: vsopSum(vsop[2], tau),
      velocity: heliocentricVelocity(vsop[0][0], vsop[1][0], vsop[2][0], vsop[0][1][0][0], tau),
    };
  };
}

export { nutationInLongitude };

/** Full analytic derivative for centered Earth propagation (rad/AU per day). */
function vsopDerivative(orders: readonly Series[], tau: number): number {
  let sum = 0;
  for (let i = orders.length - 1; i >= 0; i--) {
    let derivative = 0;
    for (const term of orders[i])
      derivative -= term[0] * term[2] * Math.sin(term[1] + term[2] * tau);
    sum =
      sum * tau +
      derivative +
      (i + 1 < orders.length ? (i + 1) * evaluateSeries(orders[i + 1], tau) : 0);
  }
  return sum / 1e8 / 365250;
}
