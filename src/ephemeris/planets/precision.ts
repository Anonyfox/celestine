import { DEG_TO_RAD } from '../constants.js';

/** Sum of A·cos(B + C·τ) over VSOP87 terms. */
export function evaluateSeries(
  terms: readonly (readonly [number, number, number])[],
  tau: number,
): number {
  let sum = 0;
  for (const [A, B, C] of terms) {
    sum += A * Math.cos(B + C * tau);
  }
  return sum;
}

// Simplified Earth position from VSOP87 (main terms only)
// L0 terms for Earth
const earthL0: readonly (readonly [number, number, number])[] = [
  [175347046, 0.0, 0.0],
  [3341656, 4.669257, 6283.07585],
  [34894, 4.6261, 12566.1517],
  [3418, 2.829, 3.523],
  [3497, 2.744, 5753.385],
  [3136, 3.628, 77713.771],
  [2676, 4.418, 7860.419],
  [2343, 6.135, 3930.21],
  [1273, 2.037, 529.691],
  [1324, 0.742, 11506.77],
  [902, 2.05, 26.3],
  [1199, 1.11, 1577.344],
  [857, 3.51, 398.15],
  [780, 1.18, 5223.69],
  [990, 5.23, 5884.93],
  [753, 2.53, 5507.55],
  [505, 4.58, 18849.23],
  [492, 4.21, 775.52],
  [357, 2.92, 0.07],
  [284, 1.9, 796.3],
];

const earthL1: readonly (readonly [number, number, number])[] = [
  [628331966747, 0, 0],
  [206059, 2.678235, 6283.07585],
  [4303, 2.6351, 12566.1517],
];

const earthL2: readonly (readonly [number, number, number])[] = [
  [8722, 1.0725, 6283.0758],
  [52919, 0, 0],
];

const earthB0: readonly (readonly [number, number, number])[] = [[280, 3.199, 84334.662]];

const earthR0: readonly (readonly [number, number, number])[] = [
  [100013989, 0, 0],
  [1670700, 3.0984635, 6283.07585],
  [13956, 3.05525, 12566.1517],
  [3084, 5.1985, 77713.7715],
  [1628, 1.1739, 5753.3849],
  [1576, 2.8469, 7860.4194],
  [925, 5.453, 11506.77],
  [542, 4.564, 3930.21],
];

const earthR1: readonly (readonly [number, number, number])[] = [
  [103019, 1.10749, 6283.07585],
  [1721, 1.0644, 12566.1517],
];

export function earthHeliocentricPosition(tau: number): Spherical {
  const tau2 = tau * tau;

  const L0sum = evaluateSeries(earthL0, tau);
  const L1sum = evaluateSeries(earthL1, tau);
  const L2sum = evaluateSeries(earthL2, tau);
  const L = (L0sum + L1sum * tau + L2sum * tau2) / 100000000;

  const B0sum = evaluateSeries(earthB0, tau);
  const B = B0sum / 100000000;

  const R0sum = evaluateSeries(earthR0, tau);
  const R1sum = evaluateSeries(earthR1, tau);
  const R = (R0sum + R1sum * tau) / 100000000;

  return { longitude: L, latitude: B, distance: R };
}

type Spherical = { longitude: number; latitude: number; distance: number };

/** Heliocentric (rad, AU) minus Earth's heliocentric position → geocentric (longitude in [0, 2π)). */
export function helioToGeo(lon: number, lat: number, dist: number, earth: Spherical): Spherical {
  const e = earth.distance * Math.cos(earth.latitude);
  const x = dist * Math.cos(lat) * Math.cos(lon) - e * Math.cos(earth.longitude);
  const y = dist * Math.cos(lat) * Math.sin(lon) - e * Math.sin(earth.longitude);
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
  const pi = (174.876384 * 3600 - 869.8089 * t + 0.03536 * t * t) * a;
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
