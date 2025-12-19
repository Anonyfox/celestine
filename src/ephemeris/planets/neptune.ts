/**
 * Neptune Position Calculator
 *
 * Calculates the apparent geocentric position of Neptune.
 *
 * @module ephemeris/planets/neptune
 *
 * @remarks
 * Neptune is the 8th and outermost classical planet with an orbital period of ~165 years.
 * It spends about 14 years in each zodiac sign.
 * Neptune was discovered in 1846 through mathematical prediction - a triumph of celestial mechanics.
 * It has the most circular orbit of all planets (e = 0.0086).
 *
 * Algorithm accuracy: ±1 arcminute for longitude.
 *
 * @see Meeus, "Astronomical Algorithms", 2nd Ed., Chapter 33
 */

import { DAYS_PER_JULIAN_MILLENNIUM, J2000_EPOCH, RAD_TO_DEG } from '../constants.js';
import type { EphemerisOptions, PlanetPosition } from '../types.js';

// =============================================================================
// VSOP87 SERIES FOR NEPTUNE
// =============================================================================

/**
 * VSOP87 series terms for Neptune's heliocentric longitude (L).
 * @source Meeus, "Astronomical Algorithms", Table 33.a (Neptune L0-L5)
 */

// L0 terms
const L0: readonly (readonly [number, number, number])[] = [
  [531188633, 0, 0],
  [1798476, 2.9010127, 38.1330356],
  [1019728, 0.4858092, 1.4844727],
  [124532, 4.830081, 36.648563],
  [42064, 5.41055, 2.96895],
  [37715, 6.09222, 35.16409],
  [33785, 1.24489, 76.26607],
  [16483, 0.00008, 491.55793],
  [9199, 4.9375, 39.6175],
  [8994, 0.2746, 175.1661],
  [4216, 1.9871, 73.2971],
  [3365, 1.0359, 33.6796],
  [2285, 4.2061, 4.4534],
  [1434, 2.7834, 74.7816],
  [900, 2.076, 109.946],
  [745, 3.19, 71.813],
  [506, 5.748, 114.399],
  [400, 0.35, 1021.249],
  [345, 3.462, 41.102],
  [340, 3.304, 77.751],
  [323, 2.248, 32.195],
  [306, 0.497, 0.521],
  [287, 4.505, 0.048],
  [282, 2.246, 146.594],
  [267, 4.889, 0.963],
  [252, 5.782, 388.465],
  [245, 1.247, 9.561],
  [233, 2.505, 137.033],
  [227, 1.797, 453.425],
  [170, 3.324, 108.461],
  [151, 2.192, 33.94],
  [150, 2.997, 5.938],
  [148, 0.859, 111.43],
  [119, 3.677, 2.448],
  [109, 2.416, 183.243],
  [103, 0.041, 0.261],
  [103, 4.404, 70.328],
  [102, 5.705, 0.112],
];

// L1 terms
const L1: readonly (readonly [number, number, number])[] = [
  [3837687717, 0, 0],
  [16604, 4.86319, 1.48447],
  [15807, 2.27923, 38.13304],
  [3335, 3.682, 76.2661],
  [1306, 3.6732, 2.9689],
  [605, 1.505, 35.164],
  [179, 3.453, 39.618],
  [107, 2.451, 4.453],
  [106, 2.755, 33.68],
  [73, 5.49, 36.65],
  [57, 1.86, 114.4],
  [57, 5.22, 0.52],
  [35, 4.52, 74.78],
  [32, 5.9, 77.75],
  [30, 3.67, 388.47],
  [29, 5.17, 9.56],
  [29, 5.17, 2.45],
  [26, 5.25, 168.05],
];

// L2 terms
const L2: readonly (readonly [number, number, number])[] = [
  [53893, 0, 0],
  [296, 1.855, 1.484],
  [281, 1.191, 38.133],
  [270, 5.721, 76.266],
  [23, 1.21, 2.97],
  [9, 4.43, 35.16],
  [7, 0.54, 2.45],
];

// L3 terms
const L3: readonly (readonly [number, number, number])[] = [
  [31, 0, 0],
  [15, 1.35, 76.27],
  [12, 6.04, 1.48],
  [12, 6.11, 38.13],
];

// L4 terms
const L4: readonly (readonly [number, number, number])[] = [[114, 3.142, 0]];

/**
 * VSOP87 series terms for Neptune's heliocentric latitude (B).
 * @source Meeus, "Astronomical Algorithms", Table 33.b (Neptune B0-B2)
 */

// B0 terms
const B0: readonly (readonly [number, number, number])[] = [
  [3088623, 1.4410437, 38.1330356],
  [27780, 5.91272, 76.26607],
  [27624, 0, 0],
  [15448, 3.50877, 39.61751],
  [15355, 2.52124, 36.64856],
  [2000, 1.51, 74.7816],
  [1968, 4.3778, 1.4845],
  [1015, 3.2156, 35.1641],
  [606, 2.802, 73.297],
  [595, 2.129, 41.102],
  [589, 3.187, 2.969],
  [402, 4.169, 114.399],
  [280, 1.682, 77.751],
  [262, 3.767, 213.299],
  [254, 3.271, 453.425],
  [206, 4.257, 529.691],
  [140, 3.53, 137.033],
];

// B1 terms
const B1: readonly (readonly [number, number, number])[] = [
  [227279, 3.807931, 38.133036],
  [1803, 1.9758, 76.2661],
  [1433, 3.1416, 0],
  [1386, 4.8256, 36.6486],
  [1073, 6.0805, 39.6175],
  [148, 3.858, 74.782],
  [136, 0.478, 1.484],
  [70, 6.19, 35.16],
  [52, 5.05, 73.3],
  [43, 0.31, 114.4],
  [37, 4.89, 41.1],
  [37, 5.76, 2.97],
  [26, 5.22, 213.3],
];

// B2 terms
const B2: readonly (readonly [number, number, number])[] = [
  [9691, 5.5712, 38.133],
  [79, 3.63, 76.27],
  [72, 0.45, 36.65],
  [59, 3.14, 0],
  [30, 1.61, 39.62],
  [6, 5.61, 74.78],
];

// B3 terms
const B3: readonly (readonly [number, number, number])[] = [
  [273, 1.017, 38.133],
  [2, 0, 0],
  [2, 2.37, 36.65],
  [2, 5.33, 76.27],
];

// B4 terms
const B4: readonly (readonly [number, number, number])[] = [[6, 2.67, 38.13]];

/**
 * VSOP87 series terms for Neptune's heliocentric radius (R).
 * @source Meeus, "Astronomical Algorithms", Table 33.c (Neptune R0-R3)
 */

// R0 terms
const R0: readonly (readonly [number, number, number])[] = [
  [3007013206, 0, 0],
  [27062259, 1.32999459, 38.13303564],
  [1691764, 3.2518614, 36.6485629],
  [807831, 5.185928, 1.484473],
  [537761, 4.521139, 35.16409],
  [495726, 1.571057, 491.557929],
  [274572, 1.845523, 175.16606],
  [135134, 3.372206, 39.617508],
  [121802, 5.797544, 76.266071],
  [100895, 0.377027, 73.297126],
  [69792, 3.79617, 2.96895],
  [46688, 5.74938, 33.67962],
  [24594, 0.50802, 109.94569],
  [16939, 1.59422, 71.81265],
  [14230, 1.07786, 74.7816],
  [12012, 1.92062, 1021.24889],
  [8395, 0.6782, 146.5943],
  [7572, 1.0715, 388.4652],
  [5721, 2.5906, 4.4534],
  [4840, 1.9069, 41.102],
  [4483, 2.9057, 529.691],
  [4421, 1.7499, 108.4612],
  [4354, 0.6799, 32.1951],
  [4270, 3.4134, 453.4249],
  [3381, 0.8481, 183.2428],
  [2881, 1.986, 137.033],
  [2879, 3.6742, 350.3321],
  [2636, 3.0976, 213.2991],
  [2530, 5.7984, 490.3341],
  [2523, 0.4863, 493.0424],
  [2306, 2.8096, 70.3282],
  [2087, 0.6186, 33.9402],
];

// R1 terms
const R1: readonly (readonly [number, number, number])[] = [
  [236339, 0.70498, 38.133036],
  [13220, 3.32015, 1.48447],
  [8622, 6.2163, 35.1641],
  [2702, 1.8814, 39.6175],
  [2155, 2.0943, 2.9689],
  [2153, 5.1687, 76.2661],
  [1603, 0, 0],
  [1464, 1.1842, 33.6796],
  [1136, 3.9189, 36.6486],
  [898, 5.241, 388.465],
  [790, 0.533, 168.053],
  [760, 0.021, 182.28],
  [607, 1.077, 1021.249],
  [572, 3.401, 484.444],
  [561, 2.887, 498.671],
];

// R2 terms
const R2: readonly (readonly [number, number, number])[] = [
  [4247, 5.8991, 38.133],
  [218, 0.346, 1.484],
  [163, 2.239, 168.053],
  [156, 4.594, 182.28],
  [127, 2.848, 35.164],
];

// R3 terms
const R3: readonly (readonly [number, number, number])[] = [
  [166, 4.552, 38.133],
  [18, 4.52, 1.48],
];

/**
 * Calculate heliocentric longitude of Neptune (L) in radians.
 * @param tau - Julian millennia from J2000.0
 * @returns Heliocentric longitude in radians
 */
export function neptuneHeliocentricLongitude(tau: number): number {
  const tau2 = tau * tau;
  const tau3 = tau2 * tau;
  const tau4 = tau3 * tau;

  let L0sum = 0;
  for (const [A, B, C] of L0) {
    L0sum += A * Math.cos(B + C * tau);
  }

  let L1sum = 0;
  for (const [A, B, C] of L1) {
    L1sum += A * Math.cos(B + C * tau);
  }

  let L2sum = 0;
  for (const [A, B, C] of L2) {
    L2sum += A * Math.cos(B + C * tau);
  }

  let L3sum = 0;
  for (const [A, B, C] of L3) {
    L3sum += A * Math.cos(B + C * tau);
  }

  let L4sum = 0;
  for (const [A, B, C] of L4) {
    L4sum += A * Math.cos(B + C * tau);
  }

  const L = (L0sum + L1sum * tau + L2sum * tau2 + L3sum * tau3 + L4sum * tau4) / 1e8;

  return L;
}

/**
 * Calculate heliocentric latitude of Neptune (B) in radians.
 * @param tau - Julian millennia from J2000.0
 * @returns Heliocentric latitude in radians
 */
export function neptuneHeliocentricLatitude(tau: number): number {
  const tau2 = tau * tau;
  const tau3 = tau2 * tau;
  const tau4 = tau3 * tau;

  let B0sum = 0;
  for (const [A, B, C] of B0) {
    B0sum += A * Math.cos(B + C * tau);
  }

  let B1sum = 0;
  for (const [A, B, C] of B1) {
    B1sum += A * Math.cos(B + C * tau);
  }

  let B2sum = 0;
  for (const [A, B, C] of B2) {
    B2sum += A * Math.cos(B + C * tau);
  }

  let B3sum = 0;
  for (const [A, B, C] of B3) {
    B3sum += A * Math.cos(B + C * tau);
  }

  let B4sum = 0;
  for (const [A, B, C] of B4) {
    B4sum += A * Math.cos(B + C * tau);
  }

  const B_rad = (B0sum + B1sum * tau + B2sum * tau2 + B3sum * tau3 + B4sum * tau4) / 1e8;

  return B_rad;
}

/**
 * Calculate heliocentric distance of Neptune (R) in AU.
 * @param tau - Julian millennia from J2000.0
 * @returns Heliocentric distance in AU
 */
export function neptuneHeliocentricDistance(tau: number): number {
  const tau2 = tau * tau;
  const tau3 = tau2 * tau;

  let R0sum = 0;
  for (const [A, B, C] of R0) {
    R0sum += A * Math.cos(B + C * tau);
  }

  let R1sum = 0;
  for (const [A, B, C] of R1) {
    R1sum += A * Math.cos(B + C * tau);
  }

  let R2sum = 0;
  for (const [A, B, C] of R2) {
    R2sum += A * Math.cos(B + C * tau);
  }

  let R3sum = 0;
  for (const [A, B, C] of R3) {
    R3sum += A * Math.cos(B + C * tau);
  }

  const R = (R0sum + R1sum * tau + R2sum * tau2 + R3sum * tau3) / 1e8;

  return R;
}

/**
 * Calculate apparent geocentric position of Neptune.
 *
 * @param jd - Julian Date
 * @param options - Calculation options
 * @returns Neptune's apparent geocentric position
 *
 * @example
 * ```ts
 * import { getNeptunePosition } from 'celestine';
 *
 * const jd = 2451545.0; // J2000.0
 * const neptune = getNeptunePosition(jd);
 * console.log(neptune.longitude); // ~303.2° (Aquarius)
 * ```
 */
export function getNeptunePosition(jd: number, options: EphemerisOptions = {}): PlanetPosition {
  const { includeSpeed = true } = options;

  const tau = (jd - J2000_EPOCH) / DAYS_PER_JULIAN_MILLENNIUM;

  // Heliocentric coordinates of Neptune
  const neptuneL = neptuneHeliocentricLongitude(tau);
  const neptuneB = neptuneHeliocentricLatitude(tau);
  const neptuneR = neptuneHeliocentricDistance(tau);

  // We need Earth's heliocentric coordinates to convert to geocentric
  const earthL = earthHeliocentricLongitude(tau);
  const earthR = earthHeliocentricDistance(tau);

  // Convert heliocentric to geocentric
  // Neptune's rectangular heliocentric coordinates
  const neptuneX = neptuneR * Math.cos(neptuneB) * Math.cos(neptuneL);
  const neptuneY = neptuneR * Math.cos(neptuneB) * Math.sin(neptuneL);
  const neptuneZ = neptuneR * Math.sin(neptuneB);

  // Earth's rectangular heliocentric coordinates (B ≈ 0)
  const earthX = earthR * Math.cos(earthL);
  const earthY = earthR * Math.sin(earthL);

  // Geocentric rectangular coordinates
  const geoX = neptuneX - earthX;
  const geoY = neptuneY - earthY;
  const geoZ = neptuneZ;

  // Convert to geocentric ecliptic coordinates
  let geoLon = Math.atan2(geoY, geoX) * RAD_TO_DEG;
  const geoLat = Math.atan2(geoZ, Math.sqrt(geoX * geoX + geoY * geoY)) * RAD_TO_DEG;
  const geoDist = Math.sqrt(geoX * geoX + geoY * geoY + geoZ * geoZ);

  // Normalize longitude to [0, 360)
  while (geoLon < 0) geoLon += 360;
  while (geoLon >= 360) geoLon -= 360;

  // Apply aberration correction (approximate)
  const aberration = -0.005694;
  geoLon += aberration;

  // Normalize again
  while (geoLon < 0) geoLon += 360;
  while (geoLon >= 360) geoLon -= 360;

  // Calculate speed if requested
  let longitudeSpeed = 0;
  let isRetrograde = false;

  if (includeSpeed) {
    const dt = 0.01;
    const pos1 = getNeptunePosition(jd - dt, { includeSpeed: false });
    const pos2 = getNeptunePosition(jd + dt, { includeSpeed: false });

    let lonDiff = pos2.longitude - pos1.longitude;
    if (lonDiff > 180) lonDiff -= 360;
    if (lonDiff < -180) lonDiff += 360;

    longitudeSpeed = lonDiff / (2 * dt);
    isRetrograde = longitudeSpeed < 0;
  }

  return {
    longitude: geoLon,
    latitude: geoLat,
    distance: geoDist,
    longitudeSpeed,
    isRetrograde,
  };
}

/**
 * Simplified Earth heliocentric longitude for geocentric conversion.
 * @param tau - Julian millennia from J2000.0
 * @returns Earth's heliocentric longitude in radians
 */
function earthHeliocentricLongitude(tau: number): number {
  const tau2 = tau * tau;

  const earthL0: readonly (readonly [number, number, number])[] = [
    [175347046, 0, 0],
    [3341656, 4.6692568, 6283.07585],
    [34894, 4.6261, 12566.1517],
    [3497, 2.7441, 5753.3849],
    [3418, 2.8289, 3.5231],
    [3136, 3.6277, 77713.7715],
    [2676, 4.4181, 7860.4194],
    [2343, 6.1352, 3930.2097],
    [1324, 0.7425, 11506.7698],
    [1273, 2.0371, 529.691],
    [1199, 1.1096, 1577.3435],
  ];

  const earthL1: readonly (readonly [number, number, number])[] = [
    [628331966747, 0, 0],
    [206059, 2.678235, 6283.07585],
    [4303, 2.6351, 12566.1517],
  ];

  const earthL2: readonly (readonly [number, number, number])[] = [
    [8722, 1.0725, 6283.0758],
    [991, 3.1416, 0],
  ];

  let L0sum = 0;
  for (const [A, B, C] of earthL0) {
    L0sum += A * Math.cos(B + C * tau);
  }

  let L1sum = 0;
  for (const [A, B, C] of earthL1) {
    L1sum += A * Math.cos(B + C * tau);
  }

  let L2sum = 0;
  for (const [A, B, C] of earthL2) {
    L2sum += A * Math.cos(B + C * tau);
  }

  return (L0sum + L1sum * tau + L2sum * tau2) / 1e8;
}

/**
 * Simplified Earth heliocentric distance for geocentric conversion.
 * @param tau - Julian millennia from J2000.0
 * @returns Earth's heliocentric distance in AU
 */
function earthHeliocentricDistance(tau: number): number {
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

  let R0sum = 0;
  for (const [A, B, C] of earthR0) {
    R0sum += A * Math.cos(B + C * tau);
  }

  let R1sum = 0;
  for (const [A, B, C] of earthR1) {
    R1sum += A * Math.cos(B + C * tau);
  }

  return (R0sum + R1sum * tau) / 1e8;
}

/**
 * Neptune's mean orbital elements (for reference).
 */
export const NEPTUNE_ORBITAL_ELEMENTS = {
  /** Semi-major axis in AU */
  semiMajorAxis: 30.07,
  /** Orbital eccentricity (nearly circular - lowest of all planets!) */
  eccentricity: 0.0086,
  /** Orbital inclination in degrees */
  inclination: 1.77,
  /** Orbital period in days */
  orbitalPeriod: 60190,
  /** Orbital period in years */
  orbitalPeriodYears: 164.8,
  /** Synodic period in days (time between oppositions) */
  synodicPeriod: 367.49,
} as const;
