/**
 * Mercury Position Calculator
 *
 * Calculates the apparent geocentric position of Mercury.
 *
 * @module ephemeris/planets/mercury
 *
 * @remarks
 * Mercury is the fastest planet and has the highest eccentricity (0.2056)
 * among the inner planets. It orbits the Sun in ~88 days.
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
// VSOP87 SERIES FOR MERCURY
// =============================================================================

/**
 * VSOP87 series terms for Mercury's heliocentric longitude (L).
 * Format: [A, B, C] where term = A * cos(B + C * τ)
 * τ = Julian millennia from J2000.0
 *
 * @source Meeus, "Astronomical Algorithms", Table 33.a (Mercury L0-L5)
 */

// L0 terms (constant and main periodic terms)
const L0: readonly (readonly [number, number, number])[] = [
  [440250710, 0, 0],
  [40989415, 1.48302034, 26087.90314157],
  [5046294, 4.47785449, 52175.8062831],
  [855347, 1.165203, 78263.709425],
  [165590, 4.119692, 104351.612566],
  [34562, 0.77931, 130439.51571],
  [7583, 3.7135, 156527.4188],
  [3560, 1.512, 1109.0946],
  [1803, 4.1033, 5661.332],
  [1726, 0.3583, 182615.322],
  [1590, 2.9951, 25028.5212],
  [1365, 4.5992, 27197.2817],
  [1017, 0.8803, 31749.2352],
  [714, 1.541, 24978.525],
  [644, 5.303, 21535.95],
  [451, 6.05, 51116.424],
  [404, 3.282, 208703.225],
  [352, 5.242, 20426.571],
  [345, 2.792, 15874.618],
  [343, 5.765, 955.6],
  [339, 5.863, 25558.212],
  [325, 1.337, 53285.185],
  [273, 2.495, 529.691],
  [264, 3.917, 57837.138],
  [260, 0.987, 4551.953],
  [239, 0.113, 1059.382],
  [235, 0.267, 11322.664],
  [217, 0.66, 13521.751],
  [209, 2.092, 47623.853],
  [183, 2.629, 27043.503],
  [182, 2.434, 25661.305],
  [176, 4.536, 51066.428],
  [173, 2.452, 24498.83],
  [142, 3.36, 37410.567],
  [138, 0.291, 10213.286],
  [125, 3.721, 39609.655],
  [118, 2.781, 77204.327],
  [106, 4.206, 19804.827],
];

// L1 terms
const L1: readonly (readonly [number, number, number])[] = [
  [2608814706223, 0, 0],
  [44141826, 1.42385544, 26087.90314157],
  [10094479, 4.47466326, 52175.8062831],
  [1621224, 1.24388792, 78263.709425],
  [303471, 4.29561645, 104351.612566],
  [59820, 1.035, 130439.51571],
  [12069, 4.0649, 156527.4188],
  [2535, 0.8062, 182615.322],
  [534, 3.811, 208703.225],
];

// L2 terms
const L2: readonly (readonly [number, number, number])[] = [
  [53050, 0, 0],
  [16904, 4.69072, 26087.90314],
  [7397, 1.3474, 52175.8063],
  [3018, 4.4564, 78263.7094],
  [1107, 1.264, 104351.6126],
  [378, 4.32, 130439.516],
  [123, 1.069, 156527.419],
  [39, 4.08, 182615.32],
];

// L3 terms
const L3: readonly (readonly [number, number, number])[] = [
  [188, 0.035, 52175.806],
  [142, 3.125, 26087.903],
  [97, 3, 78263.71],
  [44, 6.02, 104351.61],
  [35, 0, 0],
];

// L4 terms
const L4: readonly (readonly [number, number, number])[] = [
  [114, 3.1416, 0],
  [2, 2.03, 26087.9],
  [2, 1.42, 78263.71],
  [2, 4.5, 52175.81],
];

// L5 terms
const L5: readonly (readonly [number, number, number])[] = [[1, 3.14, 0]];

/**
 * VSOP87 series terms for Mercury's heliocentric latitude (B).
 */

// B0 terms
const B0: readonly (readonly [number, number, number])[] = [
  [11737529, 1.98357499, 26087.90314157],
  [2388077, 5.03738959, 52175.8062831],
  [1222840, 3.14159265, 0],
  [543252, 1.79644364, 78263.709425],
  [129779, 4.83232503, 104351.612566],
  [31867, 1.58088496, 130439.51571],
  [7963, 4.6097, 156527.4188],
  [2014, 1.3532, 182615.322],
  [514, 4.378, 208703.225],
  [209, 2.02, 24978.52],
  [208, 4.918, 27197.28],
  [132, 1.119, 234791.13],
];

// B1 terms
const B1: readonly (readonly [number, number, number])[] = [
  [429151, 3.50169786, 26087.90314157],
  [146234, 3.14159265, 0],
  [22675, 0.01515, 52175.8063],
  [10895, 0.4854, 78263.7094],
  [6353, 3.4294, 104351.6126],
  [2496, 0.1605, 130439.516],
  [860, 3.185, 156527.419],
  [278, 6.21, 182615.32],
  [86, 2.95, 208703.23],
];

// B2 terms
const B2: readonly (readonly [number, number, number])[] = [
  [11831, 4.79066, 26087.90314],
  [1914, 0, 0],
  [1045, 1.2122, 52175.8063],
  [266, 4.434, 78263.709],
  [170, 1.623, 104351.613],
  [96, 4.8, 130439.52],
  [45, 1.61, 156527.42],
  [18, 4.67, 182615.32],
];

// B3 terms
const B3: readonly (readonly [number, number, number])[] = [
  [235, 0.354, 26087.903],
  [161, 0, 0],
  [19, 4.36, 52175.81],
  [6, 2.51, 78263.71],
];

// B4 terms
const B4: readonly (readonly [number, number, number])[] = [
  [4, 1.75, 26087.9],
  [1, 3.14, 0],
];

/**
 * VSOP87 series terms for Mercury's heliocentric distance (R).
 */

// R0 terms
const R0: readonly (readonly [number, number, number])[] = [
  [39528272, 0, 0],
  [7834132, 6.19233723, 26087.90314157],
  [795526, 2.95989691, 52175.8062831],
  [121282, 6.01064154, 78263.709425],
  [21922, 2.7782, 104351.612566],
  [4354, 5.8289, 130439.51571],
  [918, 2.597, 156527.4188],
  [290, 1.424, 25028.521],
  [260, 3.028, 27197.282],
  [202, 5.647, 182615.322],
  [201, 5.592, 31749.235],
  [142, 6.253, 24978.525],
  [100, 3.734, 21535.95],
];

// R1 terms
const R1: readonly (readonly [number, number, number])[] = [
  [217348, 4.65617159, 26087.90314157],
  [44142, 1.42385545, 52175.8062831],
  [10094, 4.47466323, 78263.709425],
  [620, 0, 0],
  [3036, 1.2438, 104351.6126],
  [596, 4.297, 130439.516],
  [118, 1.03, 156527.419],
  [24, 4.07, 182615.32],
];

// R2 terms
const R2: readonly (readonly [number, number, number])[] = [
  [3118, 3.0823, 26087.9031],
  [1245, 6.1518, 52175.8063],
  [425, 2.926, 78263.709],
  [136, 5.98, 104351.61],
  [42, 2.75, 130439.52],
  [22, 3.14, 0],
];

// R3 terms
const R3: readonly (readonly [number, number, number])[] = [
  [33, 1.68, 26087.9],
  [24, 4.63, 52175.81],
  [12, 1.39, 78263.71],
];

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
 * Calculates Mercury's heliocentric longitude.
 *
 * @param tau - Julian millennia from J2000.0
 * @returns Heliocentric longitude in radians
 * @internal
 */
export function mercuryHeliocentricLongitude(tau: number): number {
  const L0sum = evaluateSeries(L0, tau);
  const L1sum = evaluateSeries(L1, tau);
  const L2sum = evaluateSeries(L2, tau);
  const L3sum = evaluateSeries(L3, tau);
  const L4sum = evaluateSeries(L4, tau);
  const L5sum = evaluateSeries(L5, tau);

  // L = L0 + L1*τ + L2*τ² + L3*τ³ + L4*τ⁴ + L5*τ⁵
  const tau2 = tau * tau;
  const tau3 = tau2 * tau;
  const tau4 = tau3 * tau;
  const tau5 = tau4 * tau;

  const L = L0sum + L1sum * tau + L2sum * tau2 + L3sum * tau3 + L4sum * tau4 + L5sum * tau5;

  // Divide by 10^8 to get radians
  return L / 100000000;
}

/**
 * Calculates Mercury's heliocentric latitude.
 *
 * @param tau - Julian millennia from J2000.0
 * @returns Heliocentric latitude in radians
 * @internal
 */
export function mercuryHeliocentricLatitude(tau: number): number {
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
 * Calculates Mercury's heliocentric distance (radius vector).
 *
 * @param tau - Julian millennia from J2000.0
 * @returns Distance in AU
 * @internal
 */
export function mercuryHeliocentricDistance(tau: number): number {
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
 * Calculates the Sun's heliocentric position (from Earth's perspective, this is
 * the Earth's heliocentric position with signs flipped).
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
  // L0 terms for Earth
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
 * @param planetLon - Planet's heliocentric longitude (radians)
 * @param planetLat - Planet's heliocentric latitude (radians)
 * @param planetDist - Planet's heliocentric distance (AU)
 * @param earthLon - Earth's heliocentric longitude (radians)
 * @param earthLat - Earth's heliocentric latitude (radians)
 * @param earthDist - Earth's heliocentric distance (AU)
 * @returns Geocentric ecliptic coordinates
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
  // Convert to rectangular coordinates
  const cosB = Math.cos(planetLat);
  const x =
    planetDist * cosB * Math.cos(planetLon) - earthDist * Math.cos(earthLat) * Math.cos(earthLon);
  const y =
    planetDist * cosB * Math.sin(planetLon) - earthDist * Math.cos(earthLat) * Math.sin(earthLon);
  const z = planetDist * Math.sin(planetLat) - earthDist * Math.sin(earthLat);

  // Convert back to spherical
  const distance = Math.sqrt(x * x + y * y + z * z);
  let longitude = Math.atan2(y, x);
  const latitude = Math.asin(z / distance);

  // Normalize longitude to [0, 2π)
  if (longitude < 0) longitude += 2 * Math.PI;

  return { longitude, latitude, distance };
}

/**
 * Normalizes an angle to the range [0, 360).
 *
 * @param degrees - Angle in degrees
 * @returns Normalized angle
 * @internal
 */
function normalizeAngle(degrees: number): number {
  let result = degrees % 360;
  if (result < 0) result += 360;
  return result;
}

/**
 * Calculates the geocentric position of Mercury.
 *
 * @param jd - Julian Date
 * @param options - Optional calculation parameters
 * @returns Mercury's position including longitude, latitude, distance, and speed
 *
 * @remarks
 * Mercury's position is calculated using VSOP87-derived series from Meeus.
 * The calculation provides heliocentric coordinates which are then converted
 * to geocentric ecliptic coordinates.
 *
 * Accuracy: ±1 arcminute for years 1800-2200.
 *
 * @example
 * ```typescript
 * import { getMercuryPosition } from 'celestine/ephemeris';
 *
 * const jd = 2451545.0; // J2000.0
 * const mercury = getMercuryPosition(jd);
 * // mercury.longitude ≈ 250.2° (Sagittarius)
 * // mercury.isRetrograde depends on orbital position
 * ```
 *
 * @source Meeus, "Astronomical Algorithms", Chapter 33
 */
export function getMercuryPosition(jd: number, options: EphemerisOptions = {}): PlanetPosition {
  // Calculate Julian millennia from J2000.0
  const tau = (jd - J2000_EPOCH) / DAYS_PER_JULIAN_MILLENNIUM;

  // Get Mercury's heliocentric position
  const mercuryLon = mercuryHeliocentricLongitude(tau);
  const mercuryLat = mercuryHeliocentricLatitude(tau);
  const mercuryDist = mercuryHeliocentricDistance(tau);

  // Get Earth's heliocentric position
  const earth = earthHeliocentricPosition(tau);

  // Convert to geocentric
  const geo = helioToGeo(
    mercuryLon,
    mercuryLat,
    mercuryDist,
    earth.longitude,
    earth.latitude,
    earth.distance,
  );

  // Convert to degrees
  let longitude = geo.longitude * RAD_TO_DEG;
  const latitude = geo.latitude * RAD_TO_DEG;

  // Apply aberration correction (~20.5 arcseconds)
  // κ = 20.49552" (constant of aberration)
  // Simplified: aberration ≈ -20.5"/distance in arcseconds
  const aberration = -20.49552 / 3600; // degrees
  longitude = normalizeAngle(longitude + aberration);

  // Calculate daily motion (speed) if requested
  let longitudeSpeed = 0;
  if (options.includeSpeed !== false) {
    // Calculate position tomorrow
    const tau1 = (jd + 1 - J2000_EPOCH) / DAYS_PER_JULIAN_MILLENNIUM;

    const mercuryLon1 = mercuryHeliocentricLongitude(tau1);
    const mercuryLat1 = mercuryHeliocentricLatitude(tau1);
    const mercuryDist1 = mercuryHeliocentricDistance(tau1);

    const earth1 = earthHeliocentricPosition(tau1);
    const geo1 = helioToGeo(
      mercuryLon1,
      mercuryLat1,
      mercuryDist1,
      earth1.longitude,
      earth1.latitude,
      earth1.distance,
    );

    const longitude1 = normalizeAngle(geo1.longitude * RAD_TO_DEG + aberration);

    // Handle wraparound at 360°
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
 * Mercury's orbital elements (mean values at J2000.0).
 *
 * @remarks
 * These are provided for reference and educational purposes.
 */
export const MERCURY_ORBITAL_ELEMENTS = {
  /** Semi-major axis in AU */
  semiMajorAxis: 0.38709927,
  /** Orbital eccentricity */
  eccentricity: 0.20563593,
  /** Orbital inclination in degrees */
  inclination: 7.00497902,
  /** Longitude of ascending node in degrees */
  ascendingNode: 48.33076593,
  /** Longitude of perihelion in degrees */
  perihelion: 77.45779628,
  /** Mean longitude at J2000.0 in degrees */
  meanLongitude: 252.2503235,
  /** Orbital period in days */
  orbitalPeriod: 87.9691,
  /** Synodic period in days (Mercury-Earth) */
  synodicPeriod: 115.88,
} as const;
