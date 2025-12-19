/**
 * Venus Position Calculator
 *
 * Calculates the apparent geocentric position of Venus.
 *
 * @module ephemeris/planets/venus
 *
 * @remarks
 * Venus is the brightest planet and has the most circular orbit
 * of any planet (eccentricity 0.0067). It orbits the Sun in ~225 days.
 *
 * Algorithm accuracy: ±1 arcminute for longitude.
 *
 * The calculation involves:
 * 1. Heliocentric position using VSOP87-derived series (Meeus Tables 33.a)
 * 2. Conversion to geocentric coordinates
 * 3. Aberration correction
 *
 * @see Meeus, "Astronomical Algorithms", 2nd Ed., Chapter 33
 */

import { DAYS_PER_JULIAN_MILLENNIUM, J2000_EPOCH, RAD_TO_DEG } from '../constants.js';
import type { EphemerisOptions, PlanetPosition } from '../types.js';

// =============================================================================
// VSOP87 SERIES FOR VENUS
// =============================================================================

/**
 * VSOP87 series terms for Venus's heliocentric longitude (L).
 * Format: [A, B, C] where term = A * cos(B + C * τ)
 * τ = Julian millennia from J2000.0
 *
 * @source Meeus, "Astronomical Algorithms", Table 33.a (Venus L0-L5)
 */

// L0 terms
const L0: readonly (readonly [number, number, number])[] = [
  [317614667, 0, 0],
  [1353968, 5.5931332, 10213.2855462],
  [89892, 5.3065, 20426.57109],
  [5477, 4.4163, 7860.4194],
  [3456, 2.6996, 11790.6291],
  [2372, 2.9938, 3930.2097],
  [1664, 4.2502, 1577.3435],
  [1438, 4.1575, 9683.5946],
  [1317, 5.1867, 26.2983],
  [1201, 6.1536, 30639.8566],
  [769, 0.816, 9437.763],
  [761, 1.95, 529.691],
  [708, 1.065, 775.523],
  [585, 3.998, 191.448],
  [500, 4.123, 15720.839],
  [429, 3.586, 19367.189],
  [327, 5.677, 5507.553],
  [326, 4.591, 10404.734],
  [232, 3.163, 9153.904],
  [180, 4.653, 1109.379],
  [155, 5.57, 19651.048],
  [128, 4.226, 20.775],
  [128, 0.962, 5661.332],
];

// L1 terms
const L1: readonly (readonly [number, number, number])[] = [
  [1021352943053, 0, 0],
  [95708, 2.46424, 10213.28555],
  [14445, 0.51625, 20426.57109],
  [213, 1.795, 30639.857],
  [174, 2.655, 26.298],
  [152, 6.106, 1577.344],
  [82, 5.7, 191.45],
  [70, 2.68, 9437.76],
  [52, 3.6, 775.52],
  [38, 1.03, 529.69],
  [30, 1.25, 5507.55],
  [25, 6.11, 10404.73],
];

// L2 terms
const L2: readonly (readonly [number, number, number])[] = [
  [54127, 0, 0],
  [3891, 0.3451, 10213.2855],
  [1338, 2.0201, 20426.5711],
  [24, 2.05, 26.3],
  [19, 3.54, 30639.86],
];

// L3 terms
const L3: readonly (readonly [number, number, number])[] = [
  [136, 4.804, 10213.286],
  [78, 3.67, 20426.57],
  [26, 0, 0],
];

// L4 terms
const L4: readonly (readonly [number, number, number])[] = [
  [114, 3.1416, 0],
  [3, 5.21, 20426.57],
  [2, 2.51, 10213.29],
];

// L5 terms
const L5: readonly (readonly [number, number, number])[] = [[1, 3.14, 0]];

/**
 * VSOP87 series terms for Venus's heliocentric latitude (B).
 */

// B0 terms
const B0: readonly (readonly [number, number, number])[] = [
  [5923638, 0.2670278, 10213.2855462],
  [40108, 1.14737, 20426.57109],
  [32815, 3.14159, 0],
  [1011, 1.0895, 30639.8566],
  [149, 6.254, 18073.705],
  [138, 0.86, 1577.344],
  [130, 3.672, 9437.763],
  [120, 3.705, 2352.866],
  [108, 4.539, 22003.915],
];

// B1 terms
const B1: readonly (readonly [number, number, number])[] = [
  [513348, 1.803643, 10213.285546],
  [4380, 3.3862, 20426.5711],
  [199, 0, 0],
  [197, 2.53, 30639.857],
];

// B2 terms
const B2: readonly (readonly [number, number, number])[] = [
  [22378, 3.38509, 10213.28555],
  [282, 0, 0],
  [173, 5.256, 20426.571],
  [27, 3.87, 30639.86],
];

// B3 terms
const B3: readonly (readonly [number, number, number])[] = [
  [647, 4.992, 10213.286],
  [20, 3.14, 0],
  [6, 0.77, 20426.57],
];

// B4 terms
const B4: readonly (readonly [number, number, number])[] = [[14, 0.32, 10213.29]];

/**
 * VSOP87 series terms for Venus's heliocentric distance (R).
 */

// R0 terms
const R0: readonly (readonly [number, number, number])[] = [
  [72334821, 0, 0],
  [489824, 4.021518, 10213.285546],
  [1658, 4.9021, 20426.5711],
  [1632, 2.8455, 7860.4194],
  [1378, 1.1285, 11790.6291],
  [498, 2.587, 9683.595],
  [374, 1.423, 3930.21],
  [264, 5.529, 9437.763],
  [237, 2.551, 15720.839],
  [222, 2.013, 19367.189],
  [126, 2.728, 1577.344],
  [119, 3.02, 10404.734],
];

// R1 terms
const R1: readonly (readonly [number, number, number])[] = [
  [34551, 0.89199, 10213.28555],
  [234, 1.772, 20426.571],
  [234, 3.142, 0],
];

// R2 terms
const R2: readonly (readonly [number, number, number])[] = [
  [1407, 5.0637, 10213.2855],
  [16, 5.47, 20426.57],
  [13, 0, 0],
];

// R3 terms
const R3: readonly (readonly [number, number, number])[] = [[50, 3.22, 10213.29]];

// =============================================================================
// HELIOCENTRIC POSITION CALCULATION
// =============================================================================

/**
 * Evaluates a VSOP87 series.
 *
 * @param terms - Array of [A, B, C] coefficients
 * @param tau - Julian millennia from J2000.0
 * @returns Sum of A * cos(B + C * τ)
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
 * Calculates Venus's heliocentric longitude.
 *
 * @param tau - Julian millennia from J2000.0
 * @returns Heliocentric longitude in radians
 * @internal
 */
export function venusHeliocentricLongitude(tau: number): number {
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
 * Calculates Venus's heliocentric latitude.
 *
 * @param tau - Julian millennia from J2000.0
 * @returns Heliocentric latitude in radians
 * @internal
 */
export function venusHeliocentricLatitude(tau: number): number {
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
 * Calculates Venus's heliocentric distance (radius vector).
 *
 * @param tau - Julian millennia from J2000.0
 * @returns Distance in AU
 * @internal
 */
export function venusHeliocentricDistance(tau: number): number {
  const R0sum = evaluateSeries(R0, tau);
  const R1sum = evaluateSeries(R1, tau);
  const R2sum = evaluateSeries(R2, tau);
  const R3sum = evaluateSeries(R3, tau);

  const tau2 = tau * tau;
  const tau3 = tau2 * tau;

  const R = R0sum + R1sum * tau + R2sum * tau2 + R3sum * tau3;

  return R / 100000000;
}

// =============================================================================
// GEOCENTRIC POSITION CALCULATION
// =============================================================================

/**
 * Calculates Earth's heliocentric position.
 *
 * @param tau - Julian millennia from J2000.0
 * @returns Object with longitude (rad), latitude (rad), distance (AU)
 * @internal
 */
function earthHeliocentricPosition(tau: number): {
  longitude: number;
  latitude: number;
  distance: number;
} {
  // Simplified Earth position from VSOP87 (main terms only)
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
 *
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
 *
 * @internal
 */
function normalizeAngle(degrees: number): number {
  let result = degrees % 360;
  if (result < 0) result += 360;
  return result;
}

/**
 * Calculates the geocentric position of Venus.
 *
 * @param jd - Julian Date
 * @param options - Optional calculation parameters
 * @returns Venus's position including longitude, latitude, distance, and speed
 *
 * @remarks
 * Venus's position is calculated using VSOP87-derived series from Meeus.
 * Venus has the most circular orbit of any planet (e = 0.0067).
 *
 * Accuracy: ±1 arcminute for years 1800-2200.
 *
 * @example
 * ```typescript
 * import { getVenusPosition } from 'celestine/ephemeris';
 *
 * const jd = 2451545.0; // J2000.0
 * const venus = getVenusPosition(jd);
 * // venus.longitude ≈ 241.5° (Sagittarius)
 * ```
 *
 * @source Meeus, "Astronomical Algorithms", Chapter 33
 */
export function getVenusPosition(jd: number, options: EphemerisOptions = {}): PlanetPosition {
  const tau = (jd - J2000_EPOCH) / DAYS_PER_JULIAN_MILLENNIUM;

  // Get Venus's heliocentric position
  const venusLon = venusHeliocentricLongitude(tau);
  const venusLat = venusHeliocentricLatitude(tau);
  const venusDist = venusHeliocentricDistance(tau);

  // Get Earth's heliocentric position
  const earth = earthHeliocentricPosition(tau);

  // Convert to geocentric
  const geo = helioToGeo(
    venusLon,
    venusLat,
    venusDist,
    earth.longitude,
    earth.latitude,
    earth.distance,
  );

  // Convert to degrees
  let longitude = geo.longitude * RAD_TO_DEG;
  const latitude = geo.latitude * RAD_TO_DEG;

  // Apply aberration correction
  const aberration = -20.49552 / 3600;
  longitude = normalizeAngle(longitude + aberration);

  // Calculate daily motion
  let longitudeSpeed = 0;
  if (options.includeSpeed !== false) {
    const tau1 = (jd + 1 - J2000_EPOCH) / DAYS_PER_JULIAN_MILLENNIUM;

    const venusLon1 = venusHeliocentricLongitude(tau1);
    const venusLat1 = venusHeliocentricLatitude(tau1);
    const venusDist1 = venusHeliocentricDistance(tau1);

    const earth1 = earthHeliocentricPosition(tau1);
    const geo1 = helioToGeo(
      venusLon1,
      venusLat1,
      venusDist1,
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
 * Venus's orbital elements (mean values at J2000.0).
 */
export const VENUS_ORBITAL_ELEMENTS = {
  /** Semi-major axis in AU */
  semiMajorAxis: 0.72333566,
  /** Orbital eccentricity (lowest of all planets) */
  eccentricity: 0.00677672,
  /** Orbital inclination in degrees */
  inclination: 3.39467605,
  /** Longitude of ascending node in degrees */
  ascendingNode: 76.67984255,
  /** Longitude of perihelion in degrees */
  perihelion: 131.60246718,
  /** Mean longitude at J2000.0 in degrees */
  meanLongitude: 181.9790995,
  /** Orbital period in days */
  orbitalPeriod: 224.701,
  /** Synodic period in days (Venus-Earth) */
  synodicPeriod: 583.92,
  /** Maximum elongation from Sun in degrees */
  maxElongation: 47.8,
} as const;
