/**
 * Angular Separation Calculation
 *
 * Core functions for calculating angular distances between celestial bodies.
 *
 * @module aspects/angular-separation
 *
 * @remarks
 * All calculations use the shortest arc principle:
 * - Angular separation is always 0-180°
 * - Handles 360°/0° boundary correctly
 * - Uses floating-point arithmetic with appropriate precision
 *
 * @see IMPL.md Section 4 for algorithm specification
 */

import { ANGLE_EPSILON, MAX_SEPARATION } from './constants.js';

/**
 * Normalize an angle to the range [0, 360).
 *
 * @param angle - Angle in degrees (can be any value)
 * @returns Normalized angle in range [0, 360)
 *
 * @example
 * ```typescript
 * normalizeAngle(370)   // 10
 * normalizeAngle(-10)   // 350
 * normalizeAngle(360)   // 0
 * normalizeAngle(0)     // 0
 * ```
 */
export function normalizeAngle(angle: number): number {
  // Handle negative angles and values >= 360
  const normalized = ((angle % 360) + 360) % 360;

  // Handle edge case where result is exactly 360 due to floating point
  if (Math.abs(normalized - 360) < ANGLE_EPSILON) {
    return 0;
  }

  return normalized;
}

/**
 * Calculate the angular separation between two ecliptic longitudes.
 *
 * @param lon1 - First ecliptic longitude in degrees
 * @param lon2 - Second ecliptic longitude in degrees
 * @returns Shortest arc separation in degrees (0-180)
 *
 * @remarks
 * This function always returns the shortest arc between the two points.
 * The order of arguments doesn't matter (separation is symmetric).
 *
 * This is the foundation for all aspect detection.
 *
 * @example
 * ```typescript
 * // Simple cases
 * angularSeparation(0, 90)    // 90
 * angularSeparation(0, 180)   // 180
 * angularSeparation(45, 45)   // 0
 *
 * // Crossing 0°/360° boundary
 * angularSeparation(350, 10)  // 20
 * angularSeparation(359, 1)   // 2
 *
 * // Always shortest arc
 * angularSeparation(0, 270)   // 90 (not 270)
 * angularSeparation(10, 200)  // 170 (not 190)
 * ```
 */
export function angularSeparation(lon1: number, lon2: number): number {
  // Normalize both longitudes to [0, 360)
  const norm1 = normalizeAngle(lon1);
  const norm2 = normalizeAngle(lon2);

  // Calculate absolute difference
  let diff = Math.abs(norm1 - norm2);

  // Take the shorter arc (always ≤ 180°)
  if (diff > MAX_SEPARATION) {
    diff = 360 - diff;
  }

  // Handle floating-point edge case where diff is very close to 0
  if (diff < ANGLE_EPSILON) {
    return 0;
  }

  return diff;
}

/**
 * Calculate the signed angle from lon1 to lon2.
 *
 * @param lon1 - First ecliptic longitude in degrees
 * @param lon2 - Second ecliptic longitude in degrees
 * @returns Signed angle in degrees (-180 to +180)
 *
 * @remarks
 * Positive = lon2 is ahead of lon1 (going counterclockwise/eastward)
 * Negative = lon2 is behind lon1 (going clockwise/westward)
 *
 * This is needed for determining applying vs separating aspects.
 *
 * @example
 * ```typescript
 * signedAngle(0, 10)    // +10  (lon2 is 10° ahead)
 * signedAngle(10, 0)    // -10  (lon2 is 10° behind)
 * signedAngle(350, 10)  // +20  (crossing 0°)
 * signedAngle(10, 350)  // -20  (crossing 0°)
 * ```
 */
export function signedAngle(lon1: number, lon2: number): number {
  // Normalize both
  const norm1 = normalizeAngle(lon1);
  const norm2 = normalizeAngle(lon2);

  // Calculate raw difference
  let diff = norm2 - norm1;

  // Normalize to (-180, +180]
  if (diff > 180) {
    diff -= 360;
  } else if (diff <= -180) {
    diff += 360;
  }

  // Handle floating-point edge case
  if (Math.abs(diff) < ANGLE_EPSILON) {
    return 0;
  }

  return diff;
}

/**
 * Check if two angles are equal within epsilon tolerance.
 *
 * @param angle1 - First angle in degrees
 * @param angle2 - Second angle in degrees
 * @param epsilon - Tolerance in degrees
 * @returns True if angles are equal within tolerance
 *
 * @remarks
 * Handles wraparound at 360°/0° boundary correctly.
 */
export function anglesAreEqual(
  angle1: number,
  angle2: number,
  epsilon: number = ANGLE_EPSILON,
): boolean {
  return angularSeparation(angle1, angle2) < epsilon;
}

/**
 * Calculate the midpoint between two longitudes.
 *
 * @param lon1 - First ecliptic longitude in degrees
 * @param lon2 - Second ecliptic longitude in degrees
 * @returns Midpoint longitude in degrees (0-360)
 *
 * @remarks
 * Takes the midpoint of the shorter arc.
 * Handles 0°/360° boundary correctly.
 *
 * @example
 * ```typescript
 * midpoint(0, 90)     // 45
 * midpoint(350, 10)   // 0 (midpoint of 20° arc crossing 0°)
 * midpoint(90, 270)   // 180 or 0 (either midpoint is valid for opposition)
 * ```
 */
export function midpoint(lon1: number, lon2: number): number {
  const norm1 = normalizeAngle(lon1);
  const norm2 = normalizeAngle(lon2);

  // Get signed angle to find direction
  const signed = signedAngle(norm1, norm2);

  // Midpoint is halfway along the signed path
  return normalizeAngle(norm1 + signed / 2);
}

/**
 * Get the sign (0-11) for a given ecliptic longitude.
 *
 * @param longitude - Ecliptic longitude in degrees
 * @returns Sign index (0 = Aries, 11 = Pisces)
 *
 * @example
 * ```typescript
 * getSignIndex(0)     // 0 (Aries)
 * getSignIndex(45)    // 1 (Taurus)
 * getSignIndex(359)   // 11 (Pisces)
 * ```
 */
export function getSignIndex(longitude: number): number {
  const normalized = normalizeAngle(longitude);
  return Math.floor(normalized / 30);
}

/**
 * Calculate the sign separation between two longitudes.
 *
 * @param lon1 - First ecliptic longitude in degrees
 * @param lon2 - Second ecliptic longitude in degrees
 * @returns Sign separation (0-11)
 *
 * @remarks
 * Used for detecting out-of-sign aspects.
 * Returns the absolute sign difference (always positive).
 *
 * @example
 * ```typescript
 * signSeparation(0, 90)     // 3 (Aries to Cancer)
 * signSeparation(0, 120)    // 4 (Aries to Leo)
 * signSeparation(350, 10)   // 0 (both in Pisces/Aries area)
 * ```
 */
export function signSeparation(lon1: number, lon2: number): number {
  const sign1 = getSignIndex(lon1);
  const sign2 = getSignIndex(lon2);

  // Calculate forward separation (sign2 - sign1 in zodiac order)
  return (((sign2 - sign1) % 12) + 12) % 12;
}
