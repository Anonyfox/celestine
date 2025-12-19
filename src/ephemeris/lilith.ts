/**
 * Lilith (Black Moon) Calculator
 *
 * Calculates the position of the Moon's apogee, known as Black Moon Lilith.
 *
 * @module ephemeris/lilith
 *
 * @remarks
 * Black Moon Lilith is the lunar apogee - the point in the Moon's elliptical
 * orbit that is farthest from Earth. It's not a physical body but a
 * mathematical point, significant in some astrological traditions.
 *
 * Two calculation methods are provided:
 * - **Mean Lilith**: Uses mean orbital elements, moves smoothly prograde
 * - **True Lilith**: Uses osculating (actual) elements, oscillates significantly
 *
 * Mean Lilith is more commonly used in astrology due to its predictability.
 *
 * Period: ~8.85 years (3232 days) for complete zodiac traversal.
 * Mean daily motion: ~0.111° (always prograde for Mean Lilith).
 *
 * @see Meeus, "Astronomical Algorithms", 2nd Ed., Chapter 47
 */

import { DAYS_PER_JULIAN_CENTURY, DEG_TO_RAD, J2000_EPOCH } from './constants.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Lilith position result.
 */
export interface LilithPosition {
  /** Longitude in degrees [0, 360) */
  longitude: number;
  /** Daily motion in degrees/day */
  speed: number;
  /** Whether Lilith is retrograde (Mean Lilith is never retrograde) */
  isRetrograde: boolean;
}

// =============================================================================
// Mean Lilith (Mean Black Moon)
// =============================================================================

/**
 * Calculate the Mean Black Moon Lilith longitude.
 *
 * Mean Lilith uses the Moon's mean orbital elements and moves smoothly
 * through the zodiac at ~0.111°/day (prograde).
 *
 * @param jd - Julian Date
 * @returns Mean Lilith longitude in degrees [0, 360)
 */
export function getMeanLilithLongitude(jd: number): number {
  const T = (jd - J2000_EPOCH) / DAYS_PER_JULIAN_CENTURY;
  const T2 = T * T;
  const T3 = T2 * T;
  const T4 = T3 * T;

  // Mean longitude of lunar perigee (Meeus, Chapter 47)
  const perigee = 83.3532465 + 4069.0137287 * T - 0.01032 * T2 - T3 / 80053 + T4 / 18999000;

  // Apogee (Lilith) is opposite to perigee
  let lilith = perigee + 180;

  // Normalize to [0, 360)
  lilith = lilith % 360;
  if (lilith < 0) lilith += 360;

  return lilith;
}

/**
 * Calculate the Mean Black Moon Lilith position.
 *
 * @param jd - Julian Date
 * @returns Mean Lilith position with longitude and speed
 */
export function getMeanLilith(jd: number): LilithPosition {
  const longitude = getMeanLilithLongitude(jd);

  // Calculate speed using numerical derivative
  const dt = 0.01;
  const lon1 = getMeanLilithLongitude(jd - dt);
  const lon2 = getMeanLilithLongitude(jd + dt);

  let lonDiff = lon2 - lon1;
  if (lonDiff > 180) lonDiff -= 360;
  if (lonDiff < -180) lonDiff += 360;

  const speed = lonDiff / (2 * dt);

  return {
    longitude,
    speed,
    isRetrograde: false, // Mean Lilith is always prograde
  };
}

// =============================================================================
// True Lilith (Osculating Black Moon)
// =============================================================================

/**
 * Calculate the True (Osculating) Black Moon Lilith longitude.
 *
 * True Lilith uses the actual instantaneous orbital elements, which causes
 * it to oscillate significantly around the mean position (up to ±30°).
 *
 * @param jd - Julian Date
 * @returns True Lilith longitude in degrees [0, 360)
 */
export function getTrueLilithLongitude(jd: number): number {
  const T = (jd - J2000_EPOCH) / DAYS_PER_JULIAN_CENTURY;
  const T2 = T * T;
  const T3 = T2 * T;
  const T4 = T3 * T;

  // Mean elements
  const D =
    (297.8501921 + 445267.1114034 * T - 0.0018819 * T2 + T3 / 545868 - T4 / 113065000) * DEG_TO_RAD;
  const M = (357.5291092 + 35999.0502909 * T - 0.0001536 * T2 + T3 / 24490000) * DEG_TO_RAD;
  const Mprime =
    (134.9633964 + 477198.8675055 * T + 0.0087414 * T2 + T3 / 69699 - T4 / 14712000) * DEG_TO_RAD;
  const F =
    (93.272095 + 483202.0175233 * T - 0.0036539 * T2 - T3 / 3526000 + T4 / 863310000) * DEG_TO_RAD;

  // Mean longitude of perigee
  const perigee = 83.3532465 + 4069.0137287 * T - 0.01032 * T2 - T3 / 80053 + T4 / 18999000;

  // Perturbations for true apogee position
  const perturbations =
    -1.6769 * Math.sin(2 * D - Mprime) +
    0.4589 * Math.sin(2 * D) +
    -0.1856 * Math.sin(Mprime) +
    -0.112 * Math.sin(2 * F) +
    0.0455 * Math.sin(2 * D - 2 * Mprime) +
    -0.0387 * Math.sin(D) +
    -0.0291 * Math.sin(2 * Mprime) +
    0.0234 * Math.sin(2 * D - M) +
    -0.0197 * Math.sin(D - Mprime) +
    0.0182 * Math.sin(2 * D + Mprime) +
    -0.0143 * Math.sin(2 * D - M - Mprime) +
    -0.0121 * Math.sin(M) +
    0.0118 * Math.sin(D + Mprime) +
    -0.0111 * Math.sin(2 * F - 2 * D) +
    0.0074 * Math.sin(2 * D + M);

  // Apogee (Lilith) is opposite to perigee, then add perturbations
  let lilith = perigee + 180 + perturbations;

  // Normalize to [0, 360)
  lilith = lilith % 360;
  if (lilith < 0) lilith += 360;

  return lilith;
}

/**
 * Calculate the True (Osculating) Black Moon Lilith position.
 *
 * @param jd - Julian Date
 * @returns True Lilith position with longitude and speed
 */
export function getTrueLilith(jd: number): LilithPosition {
  const longitude = getTrueLilithLongitude(jd);

  // Calculate speed using numerical derivative
  const dt = 0.01;
  const lon1 = getTrueLilithLongitude(jd - dt);
  const lon2 = getTrueLilithLongitude(jd + dt);

  let lonDiff = lon2 - lon1;
  if (lonDiff > 180) lonDiff -= 360;
  if (lonDiff < -180) lonDiff += 360;

  const speed = lonDiff / (2 * dt);

  return {
    longitude,
    speed,
    isRetrograde: speed < 0,
  };
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Get Black Moon Lilith position (alias for getMeanLilith).
 * In astrology, "Lilith" typically refers to Mean Lilith.
 *
 * @param jd - Julian Date
 * @returns Mean Lilith position
 */
export function getLilith(jd: number): LilithPosition {
  return getMeanLilith(jd);
}

/**
 * Black Moon Lilith characteristics (for reference).
 */
export const LILITH_CHARACTERISTICS = {
  /** Period in days for full zodiac traversal */
  period: 3232,
  /** Period in years */
  periodYears: 8.85,
  /** Mean daily motion in degrees (prograde) */
  meanDailyMotion: 0.111,
  /** Maximum oscillation of true Lilith from mean (degrees) */
  maxOscillation: 30,
} as const;
