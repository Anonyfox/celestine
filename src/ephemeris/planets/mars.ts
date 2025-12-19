/**
 * Mars Position Calculator
 *
 * Calculates the apparent geocentric position of Mars.
 *
 * @module ephemeris/planets/mars
 *
 * @remarks
 * Mars is the first outer planet (orbit larger than Earth's).
 * It has notable eccentricity (0.0934) and an orbital period of ~687 days.
 * Mars opposition occurs every ~780 days when Earth passes between Mars and Sun.
 *
 * Algorithm accuracy: ±1 arcminute for longitude.
 *
 * @see Meeus, "Astronomical Algorithms", 2nd Ed., Chapter 33
 */

import { DAYS_PER_JULIAN_MILLENNIUM, J2000_EPOCH, RAD_TO_DEG } from '../constants.js';
import type { EphemerisOptions, PlanetPosition } from '../types.js';

// =============================================================================
// VSOP87 SERIES FOR MARS
// =============================================================================

/**
 * VSOP87 series terms for Mars's heliocentric longitude (L).
 * Format: [A, B, C] where term = A * cos(B + C * τ)
 * τ = Julian millennia from J2000.0
 *
 * @source Meeus, "Astronomical Algorithms", Table 33.a (Mars L0-L5)
 */

// L0 terms
const L0: readonly (readonly [number, number, number])[] = [
  [620347712, 0, 0],
  [18656368, 5.050371, 3340.6124267],
  [1108217, 5.4009984, 6681.2248534],
  [91798, 5.75479, 10021.83728],
  [27745, 5.9705, 3.52312],
  [12316, 0.84956, 2810.92146],
  [10610, 2.93959, 2281.2305],
  [8927, 4.157, 0.0173],
  [8716, 6.1101, 13362.4497],
  [7775, 3.3397, 5621.8429],
  [6798, 0.3646, 398.149],
  [4161, 0.2281, 2942.4634],
  [3575, 1.6619, 2544.3144],
  [3075, 0.857, 191.4483],
  [2938, 6.0789, 0.0673],
  [2628, 0.6481, 3337.0893],
  [2580, 0.03, 3344.1355],
  [2389, 5.039, 796.298],
  [1799, 0.6563, 529.691],
  [1546, 2.9158, 1751.5395],
  [1528, 1.1498, 6151.5339],
  [1286, 3.068, 2146.1654],
  [1264, 3.6228, 5092.152],
  [1025, 3.6933, 8962.4553],
  [892, 0.183, 16703.062],
  [859, 2.401, 2914.014],
  [833, 4.495, 3340.63],
  [833, 2.464, 3340.595],
  [749, 3.822, 155.42],
  [724, 0.675, 3738.761],
  [713, 3.663, 1059.382],
  [655, 0.489, 3127.313],
  [636, 2.922, 8432.764],
  [553, 4.475, 1748.016],
  [550, 3.81, 0.98],
  [472, 3.625, 1194.447],
  [426, 0.554, 6283.076],
  [415, 0.497, 213.299],
  [312, 0.999, 6677.702],
  [307, 0.381, 6684.748],
  [302, 4.486, 3532.061],
  [299, 2.783, 6254.627],
  [293, 4.221, 20.775],
  [284, 5.769, 3149.164],
  [281, 5.882, 1349.867],
  [274, 0.542, 3340.545],
  [274, 0.134, 3340.68],
  [239, 5.372, 4136.91],
  [236, 5.755, 3333.499],
  [231, 1.282, 3870.303],
  [221, 3.505, 382.897],
  [204, 2.821, 1221.849],
  [193, 3.357, 3.59],
  [189, 1.491, 9492.146],
  [179, 1.006, 951.718],
  [174, 2.414, 553.569],
  [172, 0.439, 5486.778],
  [160, 3.949, 4562.461],
  [144, 1.419, 135.065],
  [140, 3.326, 2700.715],
  [138, 4.301, 7.114],
  [131, 4.045, 12303.068],
  [128, 2.208, 1592.596],
  [128, 1.807, 5088.629],
];

// L1 terms
const L1: readonly (readonly [number, number, number])[] = [
  [334085627474, 0, 0],
  [1458227, 3.6042605, 3340.6124267],
  [164901, 3.926313, 6681.224853],
  [19963, 4.26594, 10021.83728],
  [3452, 4.7321, 3.5231],
  [2485, 4.6128, 13362.4497],
  [842, 4.459, 2281.23],
  [538, 5.016, 398.149],
  [521, 4.994, 3344.136],
  [433, 2.561, 191.448],
  [430, 5.316, 155.42],
  [382, 3.539, 796.298],
  [314, 4.963, 16703.062],
  [283, 3.16, 2544.314],
  [206, 4.569, 2146.165],
  [169, 1.329, 3337.089],
  [158, 4.185, 1751.54],
  [134, 2.233, 0.98],
  [134, 5.974, 1748.016],
  [118, 6.024, 6151.534],
  [117, 2.213, 1059.382],
  [114, 2.129, 1194.447],
  [114, 5.428, 3738.761],
  [91, 1.1, 1349.87],
  [85, 3.91, 553.57],
  [83, 5.3, 6684.75],
  [81, 4.43, 529.69],
  [80, 2.25, 8962.46],
  [73, 2.5, 951.72],
  [72, 5.84, 242.73],
  [71, 3.86, 2914.01],
  [68, 5.02, 382.9],
  [65, 1.02, 3340.6],
  [65, 3.05, 3340.63],
  [62, 4.15, 3149.16],
  [57, 3.89, 4136.91],
  [48, 4.87, 213.3],
  [48, 1.18, 3333.5],
  [47, 1.31, 3185.19],
  [41, 0.71, 1592.6],
  [40, 2.73, 7.11],
  [40, 5.32, 20043.67],
  [33, 5.41, 6283.08],
  [28, 0.05, 9492.15],
  [27, 3.89, 1221.85],
  [27, 5.11, 2700.72],
];

// L2 terms
const L2: readonly (readonly [number, number, number])[] = [
  [58016, 2.04979, 3340.61243],
  [54188, 0, 0],
  [13908, 2.45742, 6681.22485],
  [2465, 2.8, 10021.8373],
  [398, 3.141, 13362.45],
  [222, 3.194, 3.523],
  [121, 0.543, 155.42],
  [62, 3.49, 16703.06],
  [54, 3.54, 3344.14],
  [34, 6.0, 2281.23],
  [32, 4.14, 191.45],
  [30, 1.56, 3337.09],
  [23, 2.02, 398.15],
  [22, 5.46, 796.3],
  [20, 0.85, 20043.67],
  [19, 5.86, 3185.19],
  [17, 5.68, 1751.54],
  [16, 4.26, 6151.53],
  [15, 4.07, 1059.38],
  [14, 5.78, 1748.02],
  [14, 2.61, 1349.87],
  [13, 2.54, 1194.45],
  [13, 5.47, 3149.16],
  [12, 4.44, 529.69],
  [12, 2.03, 5088.63],
  [10, 5.39, 382.9],
  [10, 0.42, 2544.31],
];

// L3 terms
const L3: readonly (readonly [number, number, number])[] = [
  [1482, 0.4443, 3340.6124],
  [662, 0.885, 6681.225],
  [188, 1.288, 10021.837],
  [41, 1.65, 13362.45],
  [26, 0, 0],
  [23, 2.05, 155.42],
  [10, 1.58, 3.52],
];

// L4 terms
const L4: readonly (readonly [number, number, number])[] = [
  [114, 3.1416, 0],
  [29, 5.64, 6681.22],
  [24, 5.14, 3340.61],
  [11, 6.03, 10021.84],
];

// L5 terms
const L5: readonly (readonly [number, number, number])[] = [
  [1, 3.14, 0],
  [1, 4.04, 6681.22],
];

/**
 * VSOP87 series terms for Mars's heliocentric latitude (B).
 */

// B0 terms
const B0: readonly (readonly [number, number, number])[] = [
  [3197135, 3.7683204, 3340.6124267],
  [298033, 4.10617, 6681.224853],
  [289105, 0, 0],
  [31366, 4.44651, 10021.83728],
  [3484, 4.7881, 13362.4497],
  [443, 5.026, 3344.136],
  [443, 5.652, 3337.089],
  [399, 5.131, 16703.062],
  [293, 3.793, 2281.23],
  [182, 6.136, 6151.534],
  [163, 4.264, 529.691],
  [160, 2.232, 1059.382],
  [149, 2.165, 5621.843],
  [143, 1.182, 3340.595],
  [143, 3.213, 3340.63],
];

// B1 terms
const B1: readonly (readonly [number, number, number])[] = [
  [350069, 5.368478, 3340.612427],
  [14116, 3.14159, 0],
  [9671, 5.4788, 6681.2249],
  [1472, 3.2021, 10021.8373],
  [426, 3.408, 13362.45],
  [102, 0.776, 3337.089],
  [79, 3.72, 16703.06],
  [33, 3.46, 5621.84],
  [26, 2.48, 2281.23],
];

// B2 terms
const B2: readonly (readonly [number, number, number])[] = [
  [16727, 0.60221, 3340.61243],
  [4987, 4.1416, 0],
  [302, 3.559, 6681.225],
  [26, 1.9, 13362.45],
  [21, 0.92, 10021.84],
  [12, 2.24, 3337.09],
];

// B3 terms
const B3: readonly (readonly [number, number, number])[] = [
  [607, 1.981, 3340.612],
  [43, 0, 0],
  [14, 1.8, 6681.22],
];

// B4 terms
const B4: readonly (readonly [number, number, number])[] = [
  [13, 0, 0],
  [11, 3.46, 3340.61],
];

/**
 * VSOP87 series terms for Mars's heliocentric distance (R).
 */

// R0 terms
const R0: readonly (readonly [number, number, number])[] = [
  [153033488, 0, 0],
  [14184953, 3.47971284, 3340.6124267],
  [660776, 3.817834, 6681.224853],
  [46179, 4.15595, 10021.83728],
  [8110, 5.5596, 2810.9215],
  [7485, 1.7724, 5621.8429],
  [5523, 1.3644, 2281.2305],
  [3825, 4.4941, 13362.4497],
  [2484, 4.9255, 2942.4634],
  [2307, 0.0908, 2544.3144],
  [1999, 5.3606, 3337.0893],
  [1960, 4.7425, 3344.1355],
  [1167, 2.1126, 5092.152],
  [1103, 5.0091, 398.149],
  [992, 5.839, 6151.534],
  [899, 4.408, 529.691],
  [807, 2.102, 1059.382],
  [798, 3.448, 796.298],
  [741, 1.499, 2146.165],
  [726, 1.245, 8432.764],
  [692, 2.134, 8962.455],
  [633, 0.894, 3340.63],
  [633, 2.924, 3340.595],
  [630, 1.287, 1751.54],
  [574, 0.829, 2914.014],
  [526, 5.383, 3738.761],
  [473, 5.199, 3127.313],
  [348, 4.832, 16703.062],
  [284, 2.907, 3532.061],
  [280, 5.257, 6283.076],
  [276, 1.218, 6254.627],
  [275, 2.908, 1748.016],
  [270, 3.764, 5884.927],
  [239, 2.037, 1194.447],
  [234, 5.105, 5486.778],
  [228, 3.255, 6872.673],
  [223, 4.199, 3149.164],
  [219, 5.583, 191.448],
  [208, 5.255, 3340.545],
  [208, 4.846, 3340.68],
  [186, 5.699, 6677.702],
  [183, 5.081, 6684.748],
  [179, 4.184, 3333.499],
  [176, 5.953, 3870.303],
  [164, 3.799, 4136.91],
];

// R1 terms
const R1: readonly (readonly [number, number, number])[] = [
  [1107433, 2.0325052, 3340.6124267],
  [103176, 2.370718, 6681.224853],
  [12877, 0, 0],
  [10816, 2.70888, 10021.83728],
  [1195, 3.047, 13362.4497],
  [439, 2.888, 2281.23],
  [396, 3.423, 3344.136],
  [183, 1.584, 2544.314],
  [136, 3.385, 16703.062],
  [128, 6.043, 3337.089],
  [119, 3.54, 3185.192],
  [108, 2.745, 2942.463],
  [93, 1.3, 2810.92],
  [81, 3.44, 398.15],
  [80, 4.04, 3149.16],
  [73, 2.76, 6151.53],
  [72, 5.02, 529.69],
  [71, 3.86, 1059.38],
  [66, 5.65, 1751.54],
  [60, 1.22, 6684.75],
  [59, 5.39, 155.42],
  [47, 4.57, 3738.76],
  [43, 6.02, 6677.7],
  [41, 5.47, 3340.6],
  [41, 5.09, 3340.63],
];

// R2 terms
const R2: readonly (readonly [number, number, number])[] = [
  [44242, 0.47931, 3340.61243],
  [8138, 0.87, 6681.2249],
  [1275, 1.2259, 10021.8373],
  [187, 1.573, 13362.45],
  [52, 3.14, 0],
  [41, 1.97, 3344.14],
  [27, 1.92, 16703.06],
  [18, 4.43, 2281.23],
  [12, 2.24, 3185.19],
  [10, 5.39, 1059.38],
];

// R3 terms
const R3: readonly (readonly [number, number, number])[] = [
  [1113, 5.1499, 3340.6124],
  [424, 5.613, 6681.225],
  [100, 5.997, 10021.837],
  [20, 0.08, 13362.45],
  [5, 3.14, 0],
];

// R4 terms
const R4: readonly (readonly [number, number, number])[] = [
  [20, 3.58, 3340.61],
  [16, 4.05, 6681.22],
  [6, 4.46, 10021.84],
];

// =============================================================================
// HELIOCENTRIC POSITION CALCULATION
// =============================================================================

/**
 * Evaluates a VSOP87 series.
 * @internal
 */
function evaluateSeries(
  terms: readonly (readonly [number, number, number])[],
  tau: number,
): number {
  let sum = 0;
  for (const [A, B, C] of terms) {
    sum += A * Math.cos(B + C * tau);
  }
  return sum;
}

/**
 * Calculates Mars's heliocentric longitude.
 * @param tau - Julian millennia from J2000.0
 * @returns Heliocentric longitude in radians
 * @internal
 */
export function marsHeliocentricLongitude(tau: number): number {
  const L0sum = evaluateSeries(L0, tau);
  const L1sum = evaluateSeries(L1, tau);
  const L2sum = evaluateSeries(L2, tau);
  const L3sum = evaluateSeries(L3, tau);
  const L4sum = evaluateSeries(L4, tau);
  const L5sum = evaluateSeries(L5, tau);

  const tau2 = tau * tau;
  const tau3 = tau2 * tau;
  const tau4 = tau3 * tau;
  const tau5 = tau4 * tau;

  const L = L0sum + L1sum * tau + L2sum * tau2 + L3sum * tau3 + L4sum * tau4 + L5sum * tau5;

  return L / 100000000;
}

/**
 * Calculates Mars's heliocentric latitude.
 * @param tau - Julian millennia from J2000.0
 * @returns Heliocentric latitude in radians
 * @internal
 */
export function marsHeliocentricLatitude(tau: number): number {
  const B0sum = evaluateSeries(B0, tau);
  const B1sum = evaluateSeries(B1, tau);
  const B2sum = evaluateSeries(B2, tau);
  const B3sum = evaluateSeries(B3, tau);
  const B4sum = evaluateSeries(B4, tau);

  const tau2 = tau * tau;
  const tau3 = tau2 * tau;
  const tau4 = tau3 * tau;

  const B = B0sum + B1sum * tau + B2sum * tau2 + B3sum * tau3 + B4sum * tau4;

  return B / 100000000;
}

/**
 * Calculates Mars's heliocentric distance (radius vector).
 * @param tau - Julian millennia from J2000.0
 * @returns Distance in AU
 * @internal
 */
export function marsHeliocentricDistance(tau: number): number {
  const R0sum = evaluateSeries(R0, tau);
  const R1sum = evaluateSeries(R1, tau);
  const R2sum = evaluateSeries(R2, tau);
  const R3sum = evaluateSeries(R3, tau);
  const R4sum = evaluateSeries(R4, tau);

  const tau2 = tau * tau;
  const tau3 = tau2 * tau;
  const tau4 = tau3 * tau;

  const R = R0sum + R1sum * tau + R2sum * tau2 + R3sum * tau3 + R4sum * tau4;

  return R / 100000000;
}

// =============================================================================
// GEOCENTRIC POSITION CALCULATION
// =============================================================================

/**
 * Calculates Earth's heliocentric position.
 * @internal
 */
function earthHeliocentricPosition(tau: number): {
  longitude: number;
  latitude: number;
  distance: number;
} {
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

/**
 * Converts heliocentric coordinates to geocentric ecliptic coordinates.
 * @internal
 */
function helioToGeo(
  planetLon: number,
  planetLat: number,
  planetDist: number,
  earthLon: number,
  earthLat: number,
  earthDist: number,
): { longitude: number; latitude: number; distance: number } {
  const cosB = Math.cos(planetLat);
  const x =
    planetDist * cosB * Math.cos(planetLon) - earthDist * Math.cos(earthLat) * Math.cos(earthLon);
  const y =
    planetDist * cosB * Math.sin(planetLon) - earthDist * Math.cos(earthLat) * Math.sin(earthLon);
  const z = planetDist * Math.sin(planetLat) - earthDist * Math.sin(earthLat);

  const distance = Math.sqrt(x * x + y * y + z * z);
  let longitude = Math.atan2(y, x);
  const latitude = Math.asin(z / distance);

  if (longitude < 0) longitude += 2 * Math.PI;

  return { longitude, latitude, distance };
}

/**
 * Normalizes an angle to the range [0, 360).
 * @internal
 */
function normalizeAngle(degrees: number): number {
  let result = degrees % 360;
  if (result < 0) result += 360;
  return result;
}

/**
 * Calculates the geocentric position of Mars.
 *
 * @param jd - Julian Date
 * @param options - Optional calculation parameters
 * @returns Mars's position including longitude, latitude, distance, and speed
 *
 * @remarks
 * Mars is the first outer planet (orbit larger than Earth's). Its opposition
 * occurs every ~780 days when Earth passes between Mars and Sun, making Mars
 * brightest and closest to Earth.
 *
 * Accuracy: ±1 arcminute for years 1800-2200.
 *
 * @example
 * ```typescript
 * import { getMarsPosition } from 'celestine/ephemeris';
 *
 * const jd = 2451545.0; // J2000.0
 * const mars = getMarsPosition(jd);
 * // mars.longitude ≈ 355° (Pisces)
 * ```
 *
 * @source Meeus, "Astronomical Algorithms", Chapter 33
 */
export function getMarsPosition(jd: number, options: EphemerisOptions = {}): PlanetPosition {
  const tau = (jd - J2000_EPOCH) / DAYS_PER_JULIAN_MILLENNIUM;

  const marsLon = marsHeliocentricLongitude(tau);
  const marsLat = marsHeliocentricLatitude(tau);
  const marsDist = marsHeliocentricDistance(tau);

  const earth = earthHeliocentricPosition(tau);

  const geo = helioToGeo(
    marsLon,
    marsLat,
    marsDist,
    earth.longitude,
    earth.latitude,
    earth.distance,
  );

  let longitude = geo.longitude * RAD_TO_DEG;
  const latitude = geo.latitude * RAD_TO_DEG;

  const aberration = -20.49552 / 3600;
  longitude = normalizeAngle(longitude + aberration);

  let longitudeSpeed = 0;
  if (options.includeSpeed !== false) {
    const tau1 = (jd + 1 - J2000_EPOCH) / DAYS_PER_JULIAN_MILLENNIUM;

    const marsLon1 = marsHeliocentricLongitude(tau1);
    const marsLat1 = marsHeliocentricLatitude(tau1);
    const marsDist1 = marsHeliocentricDistance(tau1);

    const earth1 = earthHeliocentricPosition(tau1);
    const geo1 = helioToGeo(
      marsLon1,
      marsLat1,
      marsDist1,
      earth1.longitude,
      earth1.latitude,
      earth1.distance,
    );

    const longitude1 = normalizeAngle(geo1.longitude * RAD_TO_DEG + aberration);

    let diff = longitude1 - longitude;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    longitudeSpeed = diff;
  }

  return {
    longitude,
    latitude,
    distance: geo.distance,
    longitudeSpeed,
    isRetrograde: longitudeSpeed < 0,
  };
}

/**
 * Mars's orbital elements (mean values at J2000.0).
 */
export const MARS_ORBITAL_ELEMENTS = {
  /** Semi-major axis in AU */
  semiMajorAxis: 1.52371034,
  /** Orbital eccentricity */
  eccentricity: 0.0933941,
  /** Orbital inclination in degrees */
  inclination: 1.84969142,
  /** Longitude of ascending node in degrees */
  ascendingNode: 49.55953891,
  /** Longitude of perihelion in degrees */
  perihelion: 336.04084219,
  /** Mean longitude at J2000.0 in degrees */
  meanLongitude: 355.45332,
  /** Orbital period in days */
  orbitalPeriod: 686.98,
  /** Synodic period in days (Mars-Earth) */
  synodicPeriod: 779.94,
} as const;
