/**
 * Moon Position Calculator
 *
 * Calculates the apparent geocentric position of the Moon.
 *
 * @module ephemeris/moon
 *
 * @remarks
 * The Moon is the most complex celestial body to calculate due to:
 * - Strong perturbations from the Sun
 * - Over 60 periodic terms for longitude
 * - Fast motion (~13°/day vs Sun's ~1°/day)
 *
 * Algorithm accuracy: ±10 arcseconds for longitude, ±4 arcseconds for latitude.
 * This is significantly better than our 1 arcminute target.
 *
 * @see Meeus, "Astronomical Algorithms", 2nd Ed., Chapter 47, pp. 337-345
 */

import { DAYS_PER_JULIAN_CENTURY, DEG_TO_RAD, J2000_EPOCH } from './constants.js';
import type { EphemerisOptions, PlanetPosition } from './types.js';

// =============================================================================
// FUNDAMENTAL ARGUMENTS
// =============================================================================

/**
 * Calculates the Moon's mean longitude (L').
 *
 * @param T - Julian centuries from J2000.0
 * @returns Mean longitude in degrees (not normalized)
 *
 * @source Meeus, "Astronomical Algorithms", Table 47.a, p. 338
 * @internal
 */
export function moonMeanLongitude(T: number): number {
  return (
    218.3164477 +
    481267.88123421 * T -
    0.0015786 * T * T +
    (T * T * T) / 538841 -
    (T * T * T * T) / 65194000
  );
}

/**
 * Calculates the mean elongation of the Moon from the Sun (D).
 *
 * @param T - Julian centuries from J2000.0
 * @returns Mean elongation in degrees
 *
 * @source Meeus, "Astronomical Algorithms", Table 47.a, p. 338
 * @internal
 */
export function moonMeanElongation(T: number): number {
  return (
    297.8501921 +
    445267.1114034 * T -
    0.0018819 * T * T +
    (T * T * T) / 545868 -
    (T * T * T * T) / 113065000
  );
}

/**
 * Calculates the Sun's mean anomaly (M) for Moon calculations.
 *
 * @param T - Julian centuries from J2000.0
 * @returns Sun's mean anomaly in degrees
 *
 * @source Meeus, "Astronomical Algorithms", Table 47.a, p. 338
 * @internal
 */
export function sunMeanAnomalyForMoon(T: number): number {
  return 357.5291092 + 35999.0502909 * T - 0.0001536 * T * T + (T * T * T) / 24490000;
}

/**
 * Calculates the Moon's mean anomaly (M').
 *
 * @param T - Julian centuries from J2000.0
 * @returns Moon's mean anomaly in degrees
 *
 * @source Meeus, "Astronomical Algorithms", Table 47.a, p. 338
 * @internal
 */
export function moonMeanAnomaly(T: number): number {
  return (
    134.9633964 +
    477198.8675055 * T +
    0.0087414 * T * T +
    (T * T * T) / 69699 -
    (T * T * T * T) / 14712000
  );
}

/**
 * Calculates the Moon's argument of latitude (F).
 *
 * @param T - Julian centuries from J2000.0
 * @returns Argument of latitude in degrees
 *
 * @source Meeus, "Astronomical Algorithms", Table 47.a, p. 338
 * @internal
 */
export function moonArgumentOfLatitude(T: number): number {
  return (
    93.272095 +
    483202.0175233 * T -
    0.0036539 * T * T -
    (T * T * T) / 3526000 +
    (T * T * T * T) / 863310000
  );
}

// =============================================================================
// PERIODIC TERMS FOR LONGITUDE AND DISTANCE
// =============================================================================

/**
 * Periodic terms for Moon's longitude (Σl) and distance (Σr).
 *
 * Each term: [D, M, M', F, Σl coefficient, Σr coefficient]
 * - D = Mean elongation of Moon
 * - M = Sun's mean anomaly
 * - M' = Moon's mean anomaly
 * - F = Moon's argument of latitude
 * - Σl = coefficient for longitude in 0.000001 degrees
 * - Σr = coefficient for distance in 0.001 km
 *
 * @source Meeus, "Astronomical Algorithms", Table 47.A, pp. 339-340
 */
const LONGITUDE_TERMS: readonly (readonly [number, number, number, number, number, number])[] = [
  [0, 0, 1, 0, 6288774, -20905355],
  [2, 0, -1, 0, 1274027, -3699111],
  [2, 0, 0, 0, 658314, -2955968],
  [0, 0, 2, 0, 213618, -569925],
  [0, 1, 0, 0, -185116, 48888],
  [0, 0, 0, 2, -114332, -3149],
  [2, 0, -2, 0, 58793, 246158],
  [2, -1, -1, 0, 57066, -152138],
  [2, 0, 1, 0, 53322, -170733],
  [2, -1, 0, 0, 45758, -204586],
  [0, 1, -1, 0, -40923, -129620],
  [1, 0, 0, 0, -34720, 108743],
  [0, 1, 1, 0, -30383, 104755],
  [2, 0, 0, -2, 15327, 10321],
  [0, 0, 1, 2, -12528, 0],
  [0, 0, 1, -2, 10980, 79661],
  [4, 0, -1, 0, 10675, -34782],
  [0, 0, 3, 0, 10034, -23210],
  [4, 0, -2, 0, 8548, -21636],
  [2, 1, -1, 0, -7888, 24208],
  [2, 1, 0, 0, -6766, 30824],
  [1, 0, -1, 0, -5163, -8379],
  [1, 1, 0, 0, 4987, -16675],
  [2, -1, 1, 0, 4036, -12831],
  [2, 0, 2, 0, 3994, -10445],
  [4, 0, 0, 0, 3861, -11650],
  [2, 0, -3, 0, 3665, 14403],
  [0, 1, -2, 0, -2689, -7003],
  [2, 0, -1, 2, -2602, 0],
  [2, -1, -2, 0, 2390, 10056],
  [1, 0, 1, 0, -2348, 6322],
  [2, -2, 0, 0, 2236, -9884],
  [0, 1, 2, 0, -2120, 5751],
  [0, 2, 0, 0, -2069, 0],
  [2, -2, -1, 0, 2048, -4950],
  [2, 0, 1, -2, -1773, 4130],
  [2, 0, 0, 2, -1595, 0],
  [4, -1, -1, 0, 1215, -3958],
  [0, 0, 2, 2, -1110, 0],
  [3, 0, -1, 0, -892, 3258],
  [2, 1, 1, 0, -810, 2616],
  [4, -1, -2, 0, 759, -1897],
  [0, 2, -1, 0, -713, -2117],
  [2, 2, -1, 0, -700, 2354],
  [2, 1, -2, 0, 691, 0],
  [2, -1, 0, -2, 596, 0],
  [4, 0, 1, 0, 549, -1423],
  [0, 0, 4, 0, 537, -1117],
  [4, -1, 0, 0, 520, -1571],
  [1, 0, -2, 0, -487, -1739],
  [2, 1, 0, -2, -399, 0],
  [0, 0, 2, -2, -381, -4421],
  [1, 1, 1, 0, 351, 0],
  [3, 0, -2, 0, -340, 0],
  [4, 0, -3, 0, 330, 0],
  [2, -1, 2, 0, 327, 0],
  [0, 2, 1, 0, -323, 1165],
  [1, 1, -1, 0, 299, 0],
  [2, 0, 3, 0, 294, 0],
  [2, 0, -1, -2, 0, 8752],
];

// =============================================================================
// PERIODIC TERMS FOR LATITUDE
// =============================================================================

/**
 * Periodic terms for Moon's latitude (Σb).
 *
 * Each term: [D, M, M', F, Σb coefficient]
 * - Σb = coefficient for latitude in 0.000001 degrees
 *
 * @source Meeus, "Astronomical Algorithms", Table 47.B, p. 341
 */
const LATITUDE_TERMS: readonly (readonly [number, number, number, number, number])[] = [
  [0, 0, 0, 1, 5128122],
  [0, 0, 1, 1, 280602],
  [0, 0, 1, -1, 277693],
  [2, 0, 0, -1, 173237],
  [2, 0, -1, 1, 55413],
  [2, 0, -1, -1, 46271],
  [2, 0, 0, 1, 32573],
  [0, 0, 2, 1, 17198],
  [2, 0, 1, -1, 9266],
  [0, 0, 2, -1, 8822],
  [2, -1, 0, -1, 8216],
  [2, 0, -2, -1, 4324],
  [2, 0, 1, 1, 4200],
  [2, 1, 0, -1, -3359],
  [2, -1, -1, 1, 2463],
  [2, -1, 0, 1, 2211],
  [2, -1, -1, -1, 2065],
  [0, 1, -1, -1, -1870],
  [4, 0, -1, -1, 1828],
  [0, 1, 0, 1, -1794],
  [0, 0, 0, 3, -1749],
  [0, 1, -1, 1, -1565],
  [1, 0, 0, 1, -1491],
  [0, 1, 1, 1, -1475],
  [0, 1, 1, -1, -1410],
  [0, 1, 0, -1, -1344],
  [1, 0, 0, -1, -1335],
  [0, 0, 3, 1, 1107],
  [4, 0, 0, -1, 1021],
  [4, 0, -1, 1, 833],
  [0, 0, 1, -3, 777],
  [4, 0, -2, 1, 671],
  [2, 0, 0, -3, 607],
  [2, 0, 2, -1, 596],
  [2, -1, 1, -1, 491],
  [2, 0, -2, 1, -451],
  [0, 0, 3, -1, 439],
  [2, 0, 2, 1, 422],
  [2, 0, -3, -1, 421],
  [2, 1, -1, 1, -366],
  [2, 1, 0, 1, -351],
  [4, 0, 0, 1, 331],
  [2, -1, 1, 1, 315],
  [2, -2, 0, -1, 302],
  [0, 0, 1, 3, -283],
  [2, 1, 1, -1, -229],
  [1, 1, 0, -1, 223],
  [1, 1, 0, 1, 223],
  [0, 1, -2, -1, -220],
  [2, 1, -1, -1, -220],
  [1, 0, 1, 1, -185],
  [2, -1, -2, -1, 181],
  [0, 1, 2, 1, -177],
  [4, 0, -2, -1, 176],
  [4, -1, -1, -1, 166],
  [1, 0, 1, -1, -164],
  [4, 0, 1, -1, 132],
  [1, 0, -1, -1, -119],
  [4, -1, 0, -1, 115],
  [2, -2, 0, 1, 107],
];

// =============================================================================
// CALCULATION FUNCTIONS
// =============================================================================

/**
 * Calculates the Moon's ecliptic longitude.
 *
 * @param T - Julian centuries from J2000.0
 * @returns Ecliptic longitude in degrees (not normalized)
 *
 * @remarks
 * Uses 60 periodic terms from Meeus Table 47.A.
 * Accuracy: approximately ±10 arcseconds.
 *
 * @source Meeus, "Astronomical Algorithms", Chapter 47
 * @internal
 */
export function moonLongitude(T: number): number {
  // Fundamental arguments in degrees
  const Lp = moonMeanLongitude(T);
  const D = moonMeanElongation(T);
  const M = sunMeanAnomalyForMoon(T);
  const Mp = moonMeanAnomaly(T);
  const F = moonArgumentOfLatitude(T);

  // Additional arguments for correction
  const A1 = 119.75 + 131.849 * T;
  const A2 = 53.09 + 479264.29 * T;

  // Eccentricity of Earth's orbit
  const E = 1 - 0.002516 * T - 0.0000074 * T * T;
  const E2 = E * E;

  // Convert to radians
  const Drad = D * DEG_TO_RAD;
  const Mrad = M * DEG_TO_RAD;
  const Mprad = Mp * DEG_TO_RAD;
  const Frad = F * DEG_TO_RAD;

  // Sum periodic terms for longitude
  let sumL = 0;

  for (const [d, m, mp, f, sl, _sr] of LONGITUDE_TERMS) {
    const arg = d * Drad + m * Mrad + mp * Mprad + f * Frad;

    let coefficient = sl;

    // Apply eccentricity correction for terms involving M
    if (Math.abs(m) === 1) {
      coefficient *= E;
    } else if (Math.abs(m) === 2) {
      coefficient *= E2;
    }

    sumL += coefficient * Math.sin(arg);
  }

  // Additional corrections (Meeus p. 338)
  sumL += 3958 * Math.sin(A1 * DEG_TO_RAD);
  sumL += 1962 * Math.sin((Lp - F) * DEG_TO_RAD);
  sumL += 318 * Math.sin(A2 * DEG_TO_RAD);

  // Convert from 0.000001 degrees to degrees
  const longitude = Lp + sumL / 1000000;

  return longitude;
}

/**
 * Calculates the Moon's ecliptic latitude.
 *
 * @param T - Julian centuries from J2000.0
 * @returns Ecliptic latitude in degrees
 *
 * @remarks
 * Uses 60 periodic terms from Meeus Table 47.B.
 * Accuracy: approximately ±4 arcseconds.
 *
 * @source Meeus, "Astronomical Algorithms", Chapter 47
 * @internal
 */
export function moonLatitude(T: number): number {
  // Fundamental arguments in degrees
  const Lp = moonMeanLongitude(T);
  const D = moonMeanElongation(T);
  const M = sunMeanAnomalyForMoon(T);
  const Mp = moonMeanAnomaly(T);
  const F = moonArgumentOfLatitude(T);

  // Additional arguments for correction
  const A1 = 119.75 + 131.849 * T;
  const A3 = 313.45 + 481266.484 * T;

  // Eccentricity of Earth's orbit
  const E = 1 - 0.002516 * T - 0.0000074 * T * T;
  const E2 = E * E;

  // Convert to radians
  const Drad = D * DEG_TO_RAD;
  const Mrad = M * DEG_TO_RAD;
  const Mprad = Mp * DEG_TO_RAD;
  const Frad = F * DEG_TO_RAD;

  // Sum periodic terms for latitude
  let sumB = 0;

  for (const [d, m, mp, f, sb] of LATITUDE_TERMS) {
    const arg = d * Drad + m * Mrad + mp * Mprad + f * Frad;

    let coefficient = sb;

    // Apply eccentricity correction for terms involving M
    if (Math.abs(m) === 1) {
      coefficient *= E;
    } else if (Math.abs(m) === 2) {
      coefficient *= E2;
    }

    sumB += coefficient * Math.sin(arg);
  }

  // Additional corrections (Meeus p. 338)
  sumB -= 2235 * Math.sin(Lp * DEG_TO_RAD);
  sumB += 382 * Math.sin(A3 * DEG_TO_RAD);
  sumB += 175 * Math.sin((A1 - F) * DEG_TO_RAD);
  sumB += 175 * Math.sin((A1 + F) * DEG_TO_RAD);
  sumB += 127 * Math.sin((Lp - Mp) * DEG_TO_RAD);
  sumB -= 115 * Math.sin((Lp + Mp) * DEG_TO_RAD);

  // Convert from 0.000001 degrees to degrees
  const latitude = sumB / 1000000;

  return latitude;
}

/**
 * Calculates the Moon's distance from Earth.
 *
 * @param T - Julian centuries from J2000.0
 * @returns Distance in kilometers
 *
 * @remarks
 * Uses periodic terms from Meeus Table 47.A.
 * Mean distance: 385,000 km
 * Range: ~356,500 km (perigee) to ~406,700 km (apogee)
 *
 * @source Meeus, "Astronomical Algorithms", Chapter 47
 * @internal
 */
export function moonDistance(T: number): number {
  // Fundamental arguments in degrees
  const D = moonMeanElongation(T);
  const M = sunMeanAnomalyForMoon(T);
  const Mp = moonMeanAnomaly(T);
  const F = moonArgumentOfLatitude(T);

  // Eccentricity of Earth's orbit
  const E = 1 - 0.002516 * T - 0.0000074 * T * T;
  const E2 = E * E;

  // Convert to radians
  const Drad = D * DEG_TO_RAD;
  const Mrad = M * DEG_TO_RAD;
  const Mprad = Mp * DEG_TO_RAD;
  const Frad = F * DEG_TO_RAD;

  // Sum periodic terms for distance
  let sumR = 0;

  for (const [d, m, mp, f, _sl, sr] of LONGITUDE_TERMS) {
    if (sr === 0) continue;

    const arg = d * Drad + m * Mrad + mp * Mprad + f * Frad;

    let coefficient = sr;

    // Apply eccentricity correction for terms involving M
    if (Math.abs(m) === 1) {
      coefficient *= E;
    } else if (Math.abs(m) === 2) {
      coefficient *= E2;
    }

    sumR += coefficient * Math.cos(arg);
  }

  // Mean distance in km (Meeus p. 338)
  const meanDistance = 385000.56;

  // sumR is in 0.001 km
  const distance = meanDistance + sumR / 1000;

  return distance;
}

/**
 * Calculates the Moon's distance in AU.
 *
 * @param T - Julian centuries from J2000.0
 * @returns Distance in Astronomical Units
 *
 * @internal
 */
export function moonDistanceAU(T: number): number {
  const km = moonDistance(T);
  // 1 AU = 149,597,870.7 km (IAU 2012)
  return km / 149597870.7;
}

/**
 * Normalizes an angle to the range [0, 360).
 *
 * @param degrees - Angle in degrees
 * @returns Normalized angle
 *
 * @internal
 */
function normalizeAngle(degrees: number): number {
  let result = degrees % 360;
  if (result < 0) result += 360;
  return result;
}

/**
 * Calculates the geocentric position of the Moon.
 *
 * @param jd - Julian Date
 * @param options - Optional calculation parameters
 * @returns Moon's position including longitude, latitude, distance, and speed
 *
 * @remarks
 * The Moon's position is calculated using Meeus' algorithm from Chapter 47,
 * which is based on the ELP-2000/82 lunar theory (simplified).
 *
 * Accuracy:
 * - Longitude: ±10 arcseconds (~0.003°)
 * - Latitude: ±4 arcseconds (~0.001°)
 *
 * This is well within our 1 arcminute (0.017°) target.
 *
 * @example
 * ```typescript
 * import { getMoonPosition } from 'celestine/ephemeris';
 *
 * // J2000.0 epoch
 * const jd = 2451545.0;
 * const moon = getMoonPosition(jd);
 * // moon.longitude ≈ 218.32° (Scorpio)
 * // moon.latitude ≈ 5.15°
 * // moon.distance ≈ 0.00257 AU (~385,000 km)
 * // moon.longitudeSpeed ≈ 13.2°/day
 * ```
 *
 * @source Meeus, "Astronomical Algorithms", Chapter 47
 */
export function getMoonPosition(jd: number, options: EphemerisOptions = {}): PlanetPosition {
  // Calculate Julian centuries from J2000.0
  const T = (jd - J2000_EPOCH) / DAYS_PER_JULIAN_CENTURY;

  // Calculate position
  const longitude = normalizeAngle(moonLongitude(T));
  const latitude = moonLatitude(T);
  const distance = moonDistanceAU(T);

  // Calculate daily motion (speed) if requested
  let longitudeSpeed = 0;
  if (options.includeSpeed !== false) {
    // Calculate position tomorrow
    const T1 = (jd + 1 - J2000_EPOCH) / DAYS_PER_JULIAN_CENTURY;
    const longitude1 = normalizeAngle(moonLongitude(T1));

    // Handle wraparound at 360°
    let diff = longitude1 - longitude;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    longitudeSpeed = diff;
  }

  return {
    longitude,
    latitude,
    distance,
    longitudeSpeed,
    isRetrograde: longitudeSpeed < 0, // Moon essentially never retrogrades
  };
}

/**
 * Calculates the Moon's longitude of the ascending node (mean node).
 *
 * @param T - Julian centuries from J2000.0
 * @returns Longitude of ascending node in degrees
 *
 * @remarks
 * The ascending node is where the Moon's orbit crosses the ecliptic going north.
 * This is the "mean" node - it doesn't include short-period oscillations.
 *
 * The node regresses (moves backward) through the zodiac, completing one
 * cycle in about 18.6 years (~19°/year or ~1.5°/month).
 *
 * @source Meeus, "Astronomical Algorithms", Eq. 47.7, p. 343
 */
export function moonMeanAscendingNode(T: number): number {
  return (
    125.0445479 -
    1934.1362891 * T +
    0.0020754 * T * T +
    (T * T * T) / 467441 -
    (T * T * T * T) / 60616000
  );
}

/**
 * Calculates the Moon's mean perigee (mean Lilith / Black Moon).
 *
 * @param T - Julian centuries from J2000.0
 * @returns Longitude of mean perigee in degrees
 *
 * @remarks
 * The lunar apogee (mean Black Moon Lilith) is 180° from the perigee.
 * The perigee advances through the zodiac, completing one cycle in about 8.85 years.
 *
 * @source Meeus, "Astronomical Algorithms", Chapter 50
 */
export function moonMeanPerigee(T: number): number {
  return (
    83.3532465 +
    4069.0137287 * T -
    0.01032 * T * T -
    (T * T * T) / 80053 +
    (T * T * T * T) / 18999000
  );
}
