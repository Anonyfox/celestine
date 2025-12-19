/**
 * Sun Position Calculator
 *
 * Calculates the apparent geocentric position of the Sun.
 *
 * @module ephemeris/sun
 *
 * @remarks
 * The Sun is the foundation for all astrological calculations:
 * - Defines the ecliptic plane
 * - Determines day/night (for Part of Fortune calculation)
 * - Primary reference for all planetary aspects
 *
 * Algorithm accuracy: ±1 arcminute (±0.017°) for years 1800-2200.
 *
 * @see Meeus, "Astronomical Algorithms", 2nd Ed., Chapter 25, pp. 163-169
 */

import {
  ABERRATION_CONSTANT_ARCSEC,
  ARCSECONDS_PER_DEGREE,
  DAYS_PER_JULIAN_CENTURY,
  DEG_TO_RAD,
  EARTH_ECCENTRICITY,
  J2000_EPOCH,
  NUTATION_OMEGA,
  SUN_EQUATION_OF_CENTER,
  SUN_MEAN_ANOMALY,
  SUN_MEAN_LONGITUDE,
} from './constants.js';
import type { EphemerisOptions, PlanetPosition } from './types.js';

/**
 * Calculates the Sun's geometric mean longitude.
 *
 * @param T - Julian centuries from J2000.0
 * @returns Mean longitude L₀ in degrees (not normalized)
 *
 * @remarks
 * L₀ = 280.46646 + 36000.76983·T + 0.0003032·T²
 *
 * The geometric mean longitude is where the Sun would be if Earth's
 * orbit were perfectly circular and unperturbed.
 *
 * @source Meeus, "Astronomical Algorithms", Table 25.a, p. 163
 * @internal
 */
export function sunMeanLongitude(T: number): number {
  const { c0, c1, c2 } = SUN_MEAN_LONGITUDE;
  return c0 + c1 * T + c2 * T * T;
}

/**
 * Calculates the Sun's mean anomaly.
 *
 * @param T - Julian centuries from J2000.0
 * @returns Mean anomaly M in degrees (not normalized)
 *
 * @remarks
 * M = 357.52911 + 35999.05029·T - 0.0001537·T²
 *
 * The mean anomaly is the angle from perihelion if the body
 * moved uniformly in a circular orbit.
 *
 * @source Meeus, "Astronomical Algorithms", Table 25.a, p. 163
 * @internal
 */
export function sunMeanAnomaly(T: number): number {
  const { c0, c1, c2 } = SUN_MEAN_ANOMALY;
  return c0 + c1 * T + c2 * T * T;
}

/**
 * Calculates Earth's orbital eccentricity.
 *
 * @param T - Julian centuries from J2000.0
 * @returns Eccentricity e (dimensionless)
 *
 * @remarks
 * e = 0.016708634 - 0.000042037·T - 0.0000001267·T²
 *
 * Earth's eccentricity is slowly decreasing.
 *
 * @source Meeus, "Astronomical Algorithms", Eq. 25.4, p. 163
 * @internal
 */
export function earthEccentricity(T: number): number {
  const { c0, c1, c2 } = EARTH_ECCENTRICITY;
  return c0 + c1 * T + c2 * T * T;
}

/**
 * Calculates the equation of center for the Sun.
 *
 * @param M - Mean anomaly in degrees
 * @param T - Julian centuries from J2000.0
 * @returns Equation of center C in degrees
 *
 * @remarks
 * The equation of center converts mean anomaly to true anomaly
 * for the Sun. It's the difference between where the Sun actually
 * is and where it would be in a circular orbit.
 *
 * C = (1.914602 - 0.004817·T - 0.000014·T²)·sin(M)
 *   + (0.019993 - 0.000101·T)·sin(2M)
 *   + 0.000289·sin(3M)
 *
 * @source Meeus, "Astronomical Algorithms", Eq. 25.4, p. 164
 * @internal
 */
export function sunEquationOfCenter(M: number, T: number): number {
  const { c1_base, c1_t, c1_t2, c2_base, c2_t, c3 } = SUN_EQUATION_OF_CENTER;

  const Mrad = M * DEG_TO_RAD;

  const c1 = c1_base + c1_t * T + c1_t2 * T * T;
  const c2 = c2_base + c2_t * T;

  return c1 * Math.sin(Mrad) + c2 * Math.sin(2 * Mrad) + c3 * Math.sin(3 * Mrad);
}

/**
 * Calculates the Sun's true longitude.
 *
 * @param T - Julian centuries from J2000.0
 * @returns True longitude ☉ in degrees (not normalized)
 *
 * @remarks
 * ☉ = L₀ + C
 *
 * True longitude is the actual geometric position of the Sun
 * along the ecliptic.
 *
 * @internal
 */
export function sunTrueLongitude(T: number): number {
  const L0 = sunMeanLongitude(T);
  const M = sunMeanAnomaly(T);
  const C = sunEquationOfCenter(M, T);

  return L0 + C;
}

/**
 * Calculates the simplified nutation in longitude.
 *
 * @param T - Julian centuries from J2000.0
 * @returns Nutation Δψ in degrees
 *
 * @remarks
 * This is a simplified formula using only the dominant term.
 * Full nutation has many more terms but this gives ±0.5" accuracy
 * which is within our arcminute target.
 *
 * Δψ ≈ -0.00478·sin(Ω)
 *
 * where Ω is the longitude of the Moon's ascending node.
 *
 * @source Meeus, "Astronomical Algorithms", simplified from Ch. 22
 * @internal
 */
export function nutationInLongitude(T: number): number {
  // Longitude of Moon's ascending node
  const { c0, c1, c2, c3 } = NUTATION_OMEGA;
  const omega = c0 + c1 * T + c2 * T * T + c3 * T * T * T;
  const omegaRad = omega * DEG_TO_RAD;

  // Simplified nutation: dominant term only
  // Full formula: Δψ = -17.20"·sin(Ω) - 1.32"·sin(2L₀) - 0.23"·sin(2L') + 0.21"·sin(2Ω) + ...
  // Using just the dominant term: -17.20" ≈ -0.00478°
  const deltaPsi = (-17.2 / ARCSECONDS_PER_DEGREE) * Math.sin(omegaRad);

  return deltaPsi;
}

/**
 * Calculates the Sun's apparent longitude.
 *
 * @param T - Julian centuries from J2000.0
 * @param options - Calculation options
 * @returns Apparent longitude in degrees (not normalized)
 *
 * @remarks
 * Apparent longitude = True longitude + Nutation + Aberration
 *
 * Aberration is the apparent shift due to Earth's orbital velocity
 * combined with the finite speed of light.
 *
 * For the Sun: aberration ≈ -20.4898"/R where R is Earth-Sun distance in AU.
 * Since R ≈ 1 AU, aberration ≈ -20.5" ≈ -0.00569°
 *
 * @source Meeus, "Astronomical Algorithms", pp. 167-168
 * @internal
 */
export function sunApparentLongitude(T: number, options: EphemerisOptions = {}): number {
  const trueLongitude = sunTrueLongitude(T);

  // Aberration: always included for Sun (it's significant at ~20")
  // The formula is -20.4898" / R, but R ≈ 1, so we use the constant
  const aberration = -ABERRATION_CONSTANT_ARCSEC / ARCSECONDS_PER_DEGREE;

  // Nutation: optional (adds ~±0.005° = ±17")
  const nutation = options.includeNutation ? nutationInLongitude(T) : 0;

  return trueLongitude + aberration + nutation;
}

/**
 * Calculates the Sun's distance from Earth (radius vector).
 *
 * @param T - Julian centuries from J2000.0
 * @returns Distance R in Astronomical Units (AU)
 *
 * @remarks
 * R = 1.000001018 · (1 - e²) / (1 + e·cos(ν))
 *
 * where e is eccentricity and ν is true anomaly.
 *
 * Simplified: R ≈ 1.00014 - 0.01671·cos(M) - 0.00014·cos(2M)
 *
 * Range: ~0.983 AU (perihelion, ~Jan 3) to ~1.017 AU (aphelion, ~Jul 4)
 *
 * @source Meeus, "Astronomical Algorithms", Eq. 25.5, p. 164
 * @internal
 */
export function sunDistance(T: number): number {
  const M = sunMeanAnomaly(T);
  const Mrad = M * DEG_TO_RAD;

  // Simplified formula accurate to ~0.0001 AU
  return 1.00014 - 0.01671 * Math.cos(Mrad) - 0.00014 * Math.cos(2 * Mrad);
}

/**
 * Normalizes an angle to the range [0, 360).
 *
 * @param degrees - Angle in degrees
 * @returns Normalized angle in degrees [0, 360)
 *
 * @internal
 */
function normalizeAngle(degrees: number): number {
  let result = degrees % 360;
  if (result < 0) result += 360;
  return result;
}

/**
 * Calculates the geocentric position of the Sun.
 *
 * @param jd - Julian Date
 * @param options - Optional calculation parameters
 * @returns Sun's position including longitude, latitude, distance, and speed
 *
 * @remarks
 * The Sun's ecliptic latitude is always essentially 0° (by definition,
 * the Sun defines the ecliptic plane). Small deviations (~0.0001°) are
 * due to the barycenter of the solar system not being at the Sun's center.
 *
 * Accuracy: ±1 arcminute for years 1800-2200.
 *
 * @example
 * ```typescript
 * import { getSunPosition } from 'celestine/ephemeris';
 *
 * // J2000.0 epoch
 * const jd = 2451545.0;
 * const sun = getSunPosition(jd);
 * // sun.longitude ≈ 280.46° (Capricorn)
 * // sun.latitude ≈ 0°
 * // sun.distance ≈ 0.983 AU
 * // sun.longitudeSpeed ≈ 1.02°/day
 * ```
 *
 * @source Meeus, "Astronomical Algorithms", Chapter 25
 */
export function getSunPosition(jd: number, options: EphemerisOptions = {}): PlanetPosition {
  // Calculate Julian centuries from J2000.0
  const T = (jd - J2000_EPOCH) / DAYS_PER_JULIAN_CENTURY;

  // Calculate apparent longitude
  const apparentLongitude = sunApparentLongitude(T, options);

  // Normalize to [0, 360)
  const longitude = normalizeAngle(apparentLongitude);

  // Sun's ecliptic latitude is essentially 0
  // (by definition, the Sun defines the ecliptic)
  const latitude = 0;

  // Distance in AU
  const distance = sunDistance(T);

  // Calculate daily motion (speed) if requested
  let longitudeSpeed = 0;
  if (options.includeSpeed !== false) {
    // Calculate position tomorrow
    const T1 = (jd + 1 - J2000_EPOCH) / DAYS_PER_JULIAN_CENTURY;
    const longitude1 = normalizeAngle(sunApparentLongitude(T1, options));

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
    isRetrograde: longitudeSpeed < 0, // Sun never retrogrades
  };
}
