/**
 * Uranus Position Calculator
 *
 * Calculates the apparent geocentric position of Uranus.
 *
 * @module ephemeris/planets/uranus
 *
 * @remarks
 * Uranus is the 7th planet from the Sun with an orbital period of ~84 years.
 * It spends about 7 years in each zodiac sign.
 * Uranus is unique for its extreme axial tilt (97.77°) - it essentially rotates on its side.
 * Discovered by William Herschel in 1781.
 *
 * Algorithm accuracy: ±1 arcminute for longitude.
 *
 * @see Meeus, "Astronomical Algorithms", 2nd Ed., Chapter 33
 */

import { DAYS_PER_JULIAN_MILLENNIUM, J2000_EPOCH, RAD_TO_DEG } from '../constants.js';
import type { EphemerisOptions, PlanetPosition } from '../types.js';

// =============================================================================
// VSOP87 SERIES FOR URANUS
// =============================================================================

/**
 * VSOP87 series terms for Uranus's heliocentric longitude (L).
 * @source Meeus, "Astronomical Algorithms", Table 33.a (Uranus L0-L5)
 */

// L0 terms
const L0: readonly (readonly [number, number, number])[] = [
  [548129294, 0, 0],
  [9260408, 0.8910642, 74.7815986],
  [1504248, 3.6271926, 1.4844727],
  [365982, 1.899622, 73.297126],
  [272328, 3.358237, 149.563197],
  [70328, 5.39254, 63.7359],
  [68893, 6.09292, 76.26607],
  [61999, 2.26952, 2.96895],
  [61951, 2.85099, 11.0457],
  [26469, 3.14152, 71.81265],
  [25711, 6.1138, 454.90937],
  [21079, 4.36059, 148.07872],
  [17819, 1.74437, 36.64856],
  [14613, 4.73732, 3.93215],
  [11163, 5.82682, 224.3448],
  [10998, 0.48865, 138.5175],
  [9527, 2.9552, 35.1641],
  [7546, 5.2363, 109.9457],
  [4220, 3.2333, 70.8494],
  [4052, 2.2775, 151.0477],
  [3490, 5.4831, 146.5943],
  [3355, 1.0655, 4.4534],
  [3144, 4.752, 77.7505],
  [2927, 4.629, 9.5612],
  [2922, 5.3524, 85.8273],
  [2273, 4.366, 70.3282],
  [2149, 0.6075, 38.133],
  [2051, 1.5177, 0.1119],
  [1992, 4.9244, 277.035],
  [1667, 3.6274, 380.1278],
  [1533, 2.5856, 52.6902],
  [1376, 2.0428, 65.2204],
  [1372, 4.1964, 111.4302],
  [1284, 3.1135, 202.2534],
  [1282, 0.5427, 222.8603],
  [1244, 0.9161, 2.4477],
  [1221, 0.199, 108.4612],
  [1151, 4.179, 33.6796],
  [1150, 0.9334, 3.1814],
  [1090, 1.775, 12.5302],
  [1072, 0.2356, 62.2514],
  [946, 1.192, 127.472],
  [708, 5.183, 213.299],
];

// L1 terms
const L1: readonly (readonly [number, number, number])[] = [
  [7502543122, 0, 0],
  [154458, 5.242017, 74.781599],
  [24456, 1.71256, 1.48447],
  [9258, 0.4284, 11.0457],
  [8266, 1.5022, 63.7359],
  [7842, 1.3198, 149.5632],
  [3899, 0.4648, 3.9322],
  [2284, 4.1737, 76.2661],
  [1927, 0.5301, 2.9689],
  [1233, 1.5863, 70.8494],
  [791, 5.436, 3.181],
  [767, 1.996, 73.297],
  [482, 2.984, 85.827],
  [450, 4.138, 138.517],
  [446, 3.723, 224.345],
  [427, 4.731, 71.813],
  [354, 2.583, 148.079],
  [348, 2.454, 9.561],
  [317, 5.579, 52.69],
  [206, 2.363, 2.448],
  [189, 4.202, 56.622],
  [184, 0.284, 151.048],
  [180, 5.684, 12.53],
  [171, 3.001, 78.714],
  [158, 2.909, 0.963],
  [155, 5.591, 4.453],
  [154, 4.652, 35.164],
  [152, 2.942, 77.751],
  [143, 2.59, 62.251],
  [121, 4.148, 127.472],
  [116, 3.732, 65.22],
  [102, 4.188, 145.631],
  [102, 6.034, 0.112],
];

// L2 terms
const L2: readonly (readonly [number, number, number])[] = [
  [53033, 0, 0],
  [2358, 2.2601, 74.7816],
  [769, 4.526, 11.046],
  [552, 3.258, 63.736],
  [542, 2.276, 3.932],
  [529, 4.923, 1.484],
  [258, 3.691, 3.181],
  [239, 5.858, 149.563],
  [182, 6.218, 70.849],
  [54, 1.44, 76.27],
  [49, 6.03, 56.62],
  [45, 3.91, 2.45],
  [45, 0.81, 85.83],
  [38, 1.78, 52.69],
  [37, 4.46, 2.97],
  [33, 0.86, 9.56],
  [29, 5.1, 73.3],
  [24, 2.11, 18.16],
  [22, 5.99, 138.52],
  [22, 4.82, 78.71],
  [21, 2.4, 77.96],
  [21, 2.17, 224.34],
  [17, 2.54, 145.63],
  [17, 3.47, 12.53],
  [12, 0.02, 22.09],
  [11, 0.08, 127.47],
  [10, 5.16, 71.6],
  [10, 4.46, 62.25],
  [9, 4.26, 7.11],
];

// L3 terms
const L3: readonly (readonly [number, number, number])[] = [
  [121, 0.024, 74.782],
  [68, 4.12, 3.93],
  [53, 2.39, 11.05],
  [46, 0, 0],
  [45, 2.04, 3.18],
  [44, 2.96, 1.48],
  [25, 4.89, 63.74],
  [21, 4.55, 70.85],
  [20, 2.31, 149.56],
  [9, 1.58, 56.62],
  [4, 0.23, 18.16],
  [4, 5.39, 76.27],
  [4, 0.95, 77.96],
  [3, 4.98, 85.83],
  [3, 4.13, 52.69],
  [3, 0.37, 78.71],
  [2, 0.86, 145.63],
  [2, 5.66, 9.56],
];

// L4 terms
const L4: readonly (readonly [number, number, number])[] = [
  [114, 3.142, 0],
  [6, 4.58, 74.78],
  [3, 0.35, 11.05],
  [1, 3.42, 56.62],
];

// L5 terms
const L5: readonly (readonly [number, number, number])[] = [[1, 3.14, 0]];

/**
 * VSOP87 series terms for Uranus's heliocentric latitude (B).
 * @source Meeus, "Astronomical Algorithms", Table 33.b (Uranus B0-B4)
 */

// B0 terms
const B0: readonly (readonly [number, number, number])[] = [
  [1346278, 2.6187781, 74.7815986],
  [62341, 5.08111, 149.5632],
  [61601, 3.14159, 0],
  [9964, 1.616, 76.2661],
  [9926, 0.5763, 73.2971],
  [3259, 1.2612, 224.3448],
  [2972, 2.2437, 1.4845],
  [2010, 6.0555, 148.0787],
  [1522, 0.2796, 63.7359],
  [924, 4.038, 151.048],
  [761, 6.14, 71.813],
  [522, 3.321, 138.517],
  [463, 0.743, 85.827],
  [437, 3.381, 529.691],
  [435, 0.341, 77.751],
  [431, 3.554, 213.299],
  [420, 5.213, 11.046],
  [245, 0.788, 2.969],
  [233, 2.257, 222.86],
  [216, 1.591, 38.133],
  [180, 3.725, 299.126],
  [175, 1.236, 146.594],
  [174, 1.937, 380.128],
  [160, 5.336, 111.43],
  [144, 5.962, 35.164],
  [116, 5.739, 70.849],
];

// B1 terms
const B1: readonly (readonly [number, number, number])[] = [
  [206366, 4.123943, 74.781599],
  [8563, 0.3382, 149.5632],
  [1726, 2.1219, 73.2971],
  [1374, 0, 0],
  [1369, 3.0686, 76.2661],
  [451, 3.777, 1.484],
  [400, 2.848, 224.345],
  [307, 1.255, 148.079],
  [154, 3.786, 63.736],
  [112, 5.573, 151.048],
  [111, 5.329, 138.517],
  [83, 3.59, 71.81],
  [56, 3.4, 85.83],
  [54, 1.7, 77.75],
  [42, 1.21, 11.05],
  [41, 4.45, 78.71],
  [32, 3.77, 222.86],
  [30, 2.56, 2.97],
  [27, 5.34, 213.3],
  [26, 0.42, 380.13],
];

// B2 terms
const B2: readonly (readonly [number, number, number])[] = [
  [9212, 5.8004, 74.7816],
  [557, 0, 0],
  [286, 2.177, 149.563],
  [95, 3.84, 73.3],
  [45, 4.88, 76.27],
  [20, 5.46, 1.48],
  [15, 0.88, 138.52],
  [14, 2.85, 148.08],
  [14, 5.07, 63.74],
  [10, 5.0, 224.34],
  [8, 6.27, 78.71],
];

// B3 terms
const B3: readonly (readonly [number, number, number])[] = [
  [268, 1.251, 74.782],
  [11, 3.14, 0],
  [6, 4.01, 149.56],
  [3, 5.78, 73.3],
];

// B4 terms
const B4: readonly (readonly [number, number, number])[] = [[6, 2.85, 74.78]];

/**
 * VSOP87 series terms for Uranus's heliocentric radius (R).
 * @source Meeus, "Astronomical Algorithms", Table 33.c (Uranus R0-R4)
 */

// R0 terms
const R0: readonly (readonly [number, number, number])[] = [
  [1921264848, 0, 0],
  [88784984, 5.60377527, 74.78159857],
  [3440836, 0.328361, 73.2971259],
  [2055653, 1.7829517, 149.5631971],
  [649322, 4.522473, 76.266071],
  [602248, 3.860038, 63.735898],
  [496404, 1.401399, 454.909367],
  [338526, 1.580027, 138.517497],
  [243508, 1.570866, 71.812653],
  [190522, 1.998094, 1.484473],
  [161858, 2.791379, 148.078724],
  [143706, 1.383686, 11.0457],
  [93192, 0.17437, 36.64856],
  [89806, 3.66105, 109.94569],
  [71424, 4.24509, 224.3448],
  [46677, 1.39977, 35.16409],
  [39026, 3.36235, 277.03499],
  [39010, 1.66971, 70.84945],
  [36755, 3.88649, 146.59425],
  [30349, 0.701, 151.04767],
  [29156, 3.18056, 77.75054],
  [25786, 3.78538, 85.8273],
  [25620, 5.25656, 380.12777],
  [22637, 0.72519, 529.69097],
  [20473, 2.7964, 70.32818],
  [20472, 1.55589, 202.2534],
  [17901, 0.55455, 2.96895],
  [15503, 5.35405, 38.13304],
  [14702, 4.90434, 108.46122],
  [12897, 2.62154, 111.43016],
  [12328, 5.96039, 127.4718],
  [11959, 1.75044, 65.22037],
  [11853, 0.99343, 52.6902],
  [11696, 3.29826, 3.93215],
  [11495, 0.43774, 222.86032],
  [10793, 1.42105, 213.2991],
  [9111, 4.9964, 62.2514],
  [8421, 5.2535, 9.5612],
  [8402, 5.0388, 144.1465],
  [7449, 0.7949, 3.1814],
  [7329, 3.9728, 33.6796],
  [6046, 5.6796, 78.7138],
  [5524, 3.115, 9.5612],
  [5445, 5.1058, 4.4534],
  [5238, 2.6296, 56.6224],
  [4079, 3.2206, 415.5525],
  [3919, 4.2502, 299.1264],
  [3802, 6.1099, 175.1661],
  [3781, 3.4581, 206.1855],
  [3687, 2.4873, 227.5262],
  [3102, 4.1403, 145.631],
  [2963, 0.8298, 135.549],
  [2942, 0.4239, 265.9893],
  [2940, 2.1464, 351.8166],
  [2938, 3.6766, 490.3341],
  [2865, 0.31, 98.8999],
  [2538, 4.8546, 45.5764],
  [2364, 0.4425, 4.1928],
  [2183, 2.9404, 68.8437],
];

// R1 terms
const R1: readonly (readonly [number, number, number])[] = [
  [1479896, 3.6720571, 74.7815986],
  [71212, 6.22601, 63.7359],
  [68627, 6.13411, 149.5632],
  [24060, 3.14159, 0],
  [21468, 2.60177, 76.26607],
  [20857, 5.24625, 11.0457],
  [11405, 0.01848, 70.84945],
  [7497, 0.4236, 73.2971],
  [4244, 1.4169, 85.8273],
  [3927, 3.1551, 71.8127],
  [3578, 2.3116, 224.3448],
  [3506, 2.5835, 138.5175],
  [3229, 5.255, 3.9322],
  [3060, 0.1532, 1.4845],
  [2564, 0.9808, 148.0787],
  [2429, 3.9944, 52.6902],
  [1645, 2.6535, 127.4718],
  [1584, 1.4305, 78.7138],
  [1508, 5.06, 151.0477],
  [1490, 2.6756, 56.6224],
  [1413, 4.5746, 202.2534],
  [1403, 1.3699, 77.7505],
  [1228, 1.047, 62.2514],
  [1033, 0.2646, 131.4039],
  [992, 2.172, 65.22],
  [862, 5.055, 351.817],
  [744, 3.076, 35.164],
  [687, 2.499, 77.963],
  [647, 4.473, 70.328],
  [624, 0.863, 9.561],
  [604, 0.907, 984.6],
  [575, 3.231, 447.796],
  [562, 2.718, 462.023],
  [530, 5.917, 213.299],
  [528, 5.151, 2.969],
];

// R2 terms
const R2: readonly (readonly [number, number, number])[] = [
  [22440, 0.69953, 74.7816],
  [4727, 1.699, 63.7359],
  [1682, 4.6483, 70.8494],
  [1650, 3.0966, 11.0457],
  [1434, 3.5212, 149.5632],
  [770, 0, 0],
  [500, 6.172, 76.266],
  [461, 0.767, 3.932],
  [390, 4.496, 56.622],
  [390, 5.527, 85.827],
  [292, 0.204, 52.69],
  [287, 3.534, 73.297],
  [273, 3.847, 138.517],
  [220, 1.964, 131.404],
  [216, 0.848, 77.963],
  [205, 3.248, 78.714],
  [149, 4.898, 127.472],
  [129, 2.081, 3.181],
];

// R3 terms
const R3: readonly (readonly [number, number, number])[] = [
  [1164, 4.7345, 74.7816],
  [212, 3.343, 63.736],
  [196, 2.98, 70.849],
  [105, 0.958, 11.046],
  [73, 1.0, 149.56],
  [72, 0.03, 56.62],
  [55, 2.59, 3.93],
  [36, 5.65, 77.96],
  [34, 3.82, 76.27],
  [32, 3.6, 131.4],
];

// R4 terms
const R4: readonly (readonly [number, number, number])[] = [
  [53, 3.01, 74.78],
  [10, 1.91, 56.62],
];

/**
 * Calculate heliocentric longitude of Uranus (L) in radians.
 * @param tau - Julian millennia from J2000.0
 * @returns Heliocentric longitude in radians
 */
export function uranusHeliocentricLongitude(tau: number): number {
  const tau2 = tau * tau;
  const tau3 = tau2 * tau;
  const tau4 = tau3 * tau;
  const tau5 = tau4 * tau;

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

  let L5sum = 0;
  for (const [A, B, C] of L5) {
    L5sum += A * Math.cos(B + C * tau);
  }

  const L = (L0sum + L1sum * tau + L2sum * tau2 + L3sum * tau3 + L4sum * tau4 + L5sum * tau5) / 1e8;

  return L;
}

/**
 * Calculate heliocentric latitude of Uranus (B) in radians.
 * @param tau - Julian millennia from J2000.0
 * @returns Heliocentric latitude in radians
 */
export function uranusHeliocentricLatitude(tau: number): number {
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
 * Calculate heliocentric distance of Uranus (R) in AU.
 * @param tau - Julian millennia from J2000.0
 * @returns Heliocentric distance in AU
 */
export function uranusHeliocentricDistance(tau: number): number {
  const tau2 = tau * tau;
  const tau3 = tau2 * tau;
  const tau4 = tau3 * tau;

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

  let R4sum = 0;
  for (const [A, B, C] of R4) {
    R4sum += A * Math.cos(B + C * tau);
  }

  const R = (R0sum + R1sum * tau + R2sum * tau2 + R3sum * tau3 + R4sum * tau4) / 1e8;

  return R;
}

/**
 * Calculate apparent geocentric position of Uranus.
 *
 * @param jd - Julian Date
 * @param options - Calculation options
 * @returns Uranus's apparent geocentric position
 *
 * @example
 * ```ts
 * import { getUranusPosition } from 'celestine';
 *
 * const jd = 2451545.0; // J2000.0
 * const uranus = getUranusPosition(jd);
 * console.log(uranus.longitude); // ~314.8° (Aquarius)
 * ```
 */
export function getUranusPosition(jd: number, options: EphemerisOptions = {}): PlanetPosition {
  const { includeSpeed = true } = options;

  const tau = (jd - J2000_EPOCH) / DAYS_PER_JULIAN_MILLENNIUM;

  // Heliocentric coordinates of Uranus
  const uranusL = uranusHeliocentricLongitude(tau);
  const uranusB = uranusHeliocentricLatitude(tau);
  const uranusR = uranusHeliocentricDistance(tau);

  // We need Earth's heliocentric coordinates to convert to geocentric
  const earthL = earthHeliocentricLongitude(tau);
  const earthR = earthHeliocentricDistance(tau);

  // Convert heliocentric to geocentric
  // Uranus's rectangular heliocentric coordinates
  const uranusX = uranusR * Math.cos(uranusB) * Math.cos(uranusL);
  const uranusY = uranusR * Math.cos(uranusB) * Math.sin(uranusL);
  const uranusZ = uranusR * Math.sin(uranusB);

  // Earth's rectangular heliocentric coordinates (B ≈ 0)
  const earthX = earthR * Math.cos(earthL);
  const earthY = earthR * Math.sin(earthL);

  // Geocentric rectangular coordinates
  const geoX = uranusX - earthX;
  const geoY = uranusY - earthY;
  const geoZ = uranusZ;

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
    const pos1 = getUranusPosition(jd - dt, { includeSpeed: false });
    const pos2 = getUranusPosition(jd + dt, { includeSpeed: false });

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
 * Uranus's mean orbital elements (for reference).
 */
export const URANUS_ORBITAL_ELEMENTS = {
  /** Semi-major axis in AU */
  semiMajorAxis: 19.19,
  /** Orbital eccentricity */
  eccentricity: 0.0472,
  /** Orbital inclination in degrees */
  inclination: 0.77,
  /** Orbital period in days */
  orbitalPeriod: 30687,
  /** Orbital period in years */
  orbitalPeriodYears: 84.01,
  /** Synodic period in days (time between oppositions) */
  synodicPeriod: 369.66,
  /** Axial tilt in degrees (unique: rotates on its side) */
  axialTilt: 97.77,
} as const;
