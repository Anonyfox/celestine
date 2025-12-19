/**
 * Utility functions for house calculations
 *
 * Helper functions for working with ecliptic coordinates, house cusps,
 * and angular relationships.
 */

/**
 * Normalize an angle to the range [0, 360)
 *
 * Reduces any angle to its equivalent value between 0 (inclusive) and 360 (exclusive).
 * Handles both positive and negative input values.
 *
 * @param degrees - Angle in degrees (can be any value)
 * @returns Normalized angle in range [0, 360)
 *
 * @example
 * ```typescript
 * normalizeAngle(45)    // 45
 * normalizeAngle(365)   // 5
 * normalizeAngle(-30)   // 330
 * normalizeAngle(720)   // 0
 * ```
 */
export function normalizeAngle(degrees: number): number {
  // Use modulo to wrap to 0-360 range
  // Add 360 and modulo again to handle negative values
  return ((degrees % 360) + 360) % 360;
}

/**
 * Calculate the opposite point on the ecliptic
 *
 * Returns the point 180° opposite the input position.
 * This is used to calculate DSC from ASC, and IC from MC.
 *
 * @param longitude - Ecliptic longitude in degrees (0-360)
 * @returns Opposite point in degrees (0-360)
 *
 * @example
 * ```typescript
 * oppositePoint(15)     // 195 (15° + 180°)
 * oppositePoint(195)    // 15  (195° + 180° = 375° = 15°)
 * oppositePoint(0)      // 180
 * oppositePoint(270)    // 90
 * ```
 */
export function oppositePoint(longitude: number): number {
  return normalizeAngle(longitude + 180);
}

/**
 * Calculate the shortest angular distance between two points on the ecliptic
 *
 * Returns the smallest angle between two positions, taking into account
 * the circular nature of the ecliptic (0° = 360°).
 *
 * @param angle1 - First angle in degrees
 * @param angle2 - Second angle in degrees
 * @returns Angular distance in degrees (0-180)
 *
 * @example
 * ```typescript
 * angularDistance(10, 50)    // 40
 * angularDistance(350, 10)   // 20 (not 340 - shortest distance)
 * angularDistance(0, 180)    // 180
 * angularDistance(270, 90)   // 180
 * ```
 */
export function angularDistance(angle1: number, angle2: number): number {
  const diff = Math.abs(normalizeAngle(angle1) - normalizeAngle(angle2));
  return diff > 180 ? 360 - diff : diff;
}

/**
 * Calculate the angular separation with sign (direction)
 *
 * Returns the signed angle from angle1 to angle2, moving in the positive
 * direction (counter-clockwise). Result is in range (-180, +180].
 *
 * Positive = angle2 is ahead (counter-clockwise)
 * Negative = angle2 is behind (clockwise)
 *
 * @param fromAngle - Starting angle in degrees
 * @param toAngle - Ending angle in degrees
 * @returns Signed angular separation in degrees (-180, +180]
 *
 * @example
 * ```typescript
 * signedAngularSeparation(10, 50)    // +40 (50 is ahead)
 * signedAngularSeparation(50, 10)    // -40 (10 is behind)
 * signedAngularSeparation(350, 10)   // +20 (crossing 0°)
 * signedAngularSeparation(10, 350)   // -20 (crossing 0° backwards)
 * ```
 */
export function signedAngularSeparation(fromAngle: number, toAngle: number): number {
  const from = normalizeAngle(fromAngle);
  const to = normalizeAngle(toAngle);

  let diff = to - from;

  // Normalize to (-180, +180]
  if (diff > 180) {
    diff -= 360;
  } else if (diff <= -180) {
    diff += 360;
  }

  return diff;
}

/**
 * Determine which house a given ecliptic position occupies
 *
 * Returns the house number (1-12) that contains the specified position.
 * Houses follow the natural order of the zodiac.
 *
 * @param longitude - Ecliptic longitude in degrees (0-360)
 * @param cusps - Array of 12 house cusps in degrees
 * @returns House number (1-12)
 *
 * @example
 * ```typescript
 * const cusps = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
 * getHousePosition(15, cusps)    // 1 (between cusp 1 and cusp 2)
 * getHousePosition(45, cusps)    // 2 (between cusp 2 and cusp 3)
 * getHousePosition(350, cusps)   // 12 (between cusp 12 and cusp 1)
 * ```
 */
export function getHousePosition(longitude: number, cusps: number[]): number {
  if (cusps.length !== 12) {
    throw new Error('Cusps array must contain exactly 12 elements');
  }

  const pos = normalizeAngle(longitude);

  // Check each house in order
  for (let house = 1; house <= 12; house++) {
    const cuspStart = normalizeAngle(cusps[house - 1]);
    const cuspEnd = house === 12 ? normalizeAngle(cusps[0]) : normalizeAngle(cusps[house]);

    // Handle wraparound at 0°/360°
    if (cuspStart < cuspEnd) {
      // Normal case: house doesn't cross 0°
      if (pos >= cuspStart && pos < cuspEnd) {
        return house;
      }
    } else {
      // Wraparound case: house crosses 0°/360° boundary
      if (pos >= cuspStart || pos < cuspEnd) {
        return house;
      }
    }
  }

  // Fallback: if we get here (shouldn't happen), return house 1
  return 1;
}

/**
 * Check if a position is within a specified orb of an angle
 *
 * Used for determining if a planet is conjunct an angle (ASC, MC, DSC, IC).
 *
 * @param position - Position to check in degrees
 * @param angle - Angle (ASC, MC, etc.) in degrees
 * @param orb - Allowable orb in degrees (default: 10°)
 * @returns true if position is within orb of the angle
 *
 * @example
 * ```typescript
 * isOnAngle(15, 10, 10)    // true (5° from angle, within 10° orb)
 * isOnAngle(25, 10, 10)    // false (15° from angle, outside 10° orb)
 * isOnAngle(355, 5, 10)    // true (10° from angle, crossing 0°)
 * ```
 */
export function isOnAngle(position: number, angle: number, orb = 10): boolean {
  return angularDistance(position, angle) <= orb;
}

/**
 * Convert ecliptic longitude to zodiac sign and degree
 *
 * Returns which sign (0-11) and degree within that sign (0-30).
 *
 * @param longitude - Ecliptic longitude in degrees (0-360)
 * @returns Object with signIndex (0-11) and degreeInSign (0-30)
 *
 * @example
 * ```typescript
 * eclipticToZodiac(0)      // { signIndex: 0, degreeInSign: 0 } (0° Aries)
 * eclipticToZodiac(15.5)   // { signIndex: 0, degreeInSign: 15.5 } (15°30' Aries)
 * eclipticToZodiac(45)     // { signIndex: 1, degreeInSign: 15 } (15° Taurus)
 * eclipticToZodiac(359)    // { signIndex: 11, degreeInSign: 29 } (29° Pisces)
 * ```
 */
export function eclipticToZodiac(longitude: number): {
  signIndex: number;
  degreeInSign: number;
} {
  const normalized = normalizeAngle(longitude);
  const signIndex = Math.floor(normalized / 30);
  const degreeInSign = normalized % 30;

  return {
    signIndex,
    degreeInSign,
  };
}

/**
 * Get zodiac sign name from index
 *
 * @param signIndex - Sign index (0-11)
 * @returns Sign name
 *
 * @example
 * ```typescript
 * getSignName(0)   // 'Aries'
 * getSignName(6)   // 'Libra'
 * getSignName(11)  // 'Pisces'
 * ```
 */
export function getSignName(signIndex: number): string {
  const signs = [
    'Aries',
    'Taurus',
    'Gemini',
    'Cancer',
    'Leo',
    'Virgo',
    'Libra',
    'Scorpio',
    'Sagittarius',
    'Capricorn',
    'Aquarius',
    'Pisces',
  ];

  return signs[signIndex % 12];
}

/**
 * Format ecliptic longitude as zodiac position string
 *
 * Converts a raw ecliptic longitude into a human-readable zodiac position.
 *
 * @param longitude - Ecliptic longitude in degrees (0-360)
 * @returns Formatted string like "15°30' Aries"
 *
 * @example
 * ```typescript
 * formatZodiacPosition(0)       // "0°00' Aries"
 * formatZodiacPosition(15.5)    // "15°30' Aries"
 * formatZodiacPosition(45.75)   // "15°45' Taurus"
 * ```
 */
export function formatZodiacPosition(longitude: number): string {
  const { signIndex, degreeInSign } = eclipticToZodiac(longitude);
  const sign = getSignName(signIndex);

  const degrees = Math.floor(degreeInSign);
  const minutes = Math.round((degreeInSign - degrees) * 60);

  return `${degrees}°${minutes.toString().padStart(2, '0')}' ${sign}`;
}
