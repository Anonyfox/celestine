/**
 * Zodiac position calculations
 *
 * Core functions for converting ecliptic longitude to zodiac position (sign + degree).
 * Implements the tropical zodiac system where 0° Aries = vernal equinox point.
 *
 * **Algorithm Source:**
 * Based on Swiss Ephemeris `swe_split_deg()` by Dieter Koch and Alois Treindl.
 * Swiss Ephemeris is the authoritative implementation used by professional
 * astrological software worldwide.
 *
 * **Key Algorithm:**
 * ```
 * sign_index = floor(longitude / 30)    // 0-11 for the 12 signs
 * degree_in_sign = longitude % 30        // 0.0-29.999...
 * then convert to degrees, minutes, seconds
 * ```
 *
 * **Edge Cases Handled:**
 * - 360° wraps to 0° Aries
 * - Negative longitudes wrap backward through Pisces
 * - Rounding clamped to prevent sign boundary crossing
 *
 * @see Swiss Ephemeris: https://github.com/aloistr/swisseph
 * @module zodiac/zodiac
 */

import { SIGN_DATA } from './constants.js';
import type { ZodiacPosition } from './types.js';
import { Sign } from './types.js';

/**
 * Normalize longitude to 0-360° range
 *
 * Handles negative values and values > 360° by wrapping around.
 *
 * @param longitude - Ecliptic longitude in degrees (any value)
 * @returns Normalized longitude (0-360°)
 *
 * @example
 * ```typescript
 * normalizeLongitude(361);   // 1
 * normalizeLongitude(-1);    // 359
 * normalizeLongitude(720);   // 0
 * ```
 *
 * @internal
 */
function normalizeLongitude(longitude: number): number {
  // Handle the standard modulo for positive and negative numbers
  const normalized = ((longitude % 360) + 360) % 360;
  return normalized;
}

/**
 * Convert ecliptic longitude to zodiac position
 *
 * Takes a geocentric ecliptic longitude (0-360°) and determines which
 * tropical zodiac sign it falls in, along with the precise degree,
 * minute, and second within that sign.
 *
 * **Algorithm** (based on Swiss Ephemeris):
 * 1. Normalize longitude to 0-360° range
 * 2. Calculate sign index: `floor(longitude / 30)`
 * 3. Calculate degree within sign: `longitude % 30`
 * 4. Convert decimal degrees to degrees/minutes/seconds
 * 5. Handle rounding edge cases
 *
 * @param longitude - Ecliptic longitude in degrees (0-360, but accepts any value)
 * @returns Complete zodiac position with sign, degree, and formatting
 *
 * @example
 * ```typescript
 * // Simple example
 * const pos = eclipticToZodiac(15.5);
 * // pos.sign = Sign.Aries
 * // pos.degree = 15, pos.minute = 30, pos.second = 0
 * // pos.formatted = "15°30'00\" Aries"
 * ```
 *
 * @example
 * ```typescript
 * // Meeus Example 25.a: Venus on 1992 Oct 13
 * const venus = eclipticToZodiac(217.411111);
 * // venus.sign = Sign.Scorpio
 * // venus.degree = 7, venus.minute = 24, venus.second = 40
 * // venus.formatted = "7°24'40\" Scorpio"
 * ```
 *
 * @example
 * ```typescript
 * // Handles normalization
 * eclipticToZodiac(360);  // 0° Aries (wraps around)
 * eclipticToZodiac(-1);   // 29° Pisces (negative wraps backward)
 * ```
 *
 * @public
 */
export function eclipticToZodiac(longitude: number): ZodiacPosition {
  // Validate input
  if (!Number.isFinite(longitude)) {
    throw new Error('Invalid longitude: must be a finite number');
  }

  // Normalize to 0-360 range
  const normalized = normalizeLongitude(longitude);

  // Calculate sign index (0-11)
  // Sign 0 = Aries (0-30°), Sign 1 = Taurus (30-60°), etc.
  const signIndex = Math.floor(normalized / 30);

  // Handle edge case: 360° = 0° Aries
  const sign: Sign = signIndex === 12 ? Sign.Aries : (signIndex as Sign);

  // Calculate degree within sign (0.0 - 29.999...)
  const degreeInSign = normalized % 30;

  // Extract integer degrees
  const degree = Math.floor(degreeInSign);

  // Extract minutes
  const minutesFloat = (degreeInSign - degree) * 60;
  const minute = Math.floor(minutesFloat);

  // Extract seconds
  const secondsFloat = (minutesFloat - minute) * 60;
  let second = Math.round(secondsFloat);

  // Handle rounding edge case: 60 seconds -> next minute
  // But per Swiss Ephemeris approach, we clamp to 59 to avoid
  // the complexity of cascading into the next sign
  if (second === 60) {
    second = 59;
  }

  // Get sign name
  const signName = SIGN_DATA[sign].name;

  // Format as standard astrological notation
  const formatted = `${degree}°${minute.toString().padStart(2, '0')}'${second.toString().padStart(2, '0')}" ${signName}`;

  return {
    sign,
    signName,
    longitude: normalized,
    degreeInSign,
    degree,
    minute,
    second,
    formatted,
  };
}

/**
 * Format a zodiac position with custom options
 *
 * Provides flexible formatting for zodiac positions with various display options.
 *
 * @param position - The zodiac position to format
 * @param options - Formatting options
 * @returns Formatted string
 *
 * @example
 * ```typescript
 * const pos = eclipticToZodiac(15.5125);
 *
 * // Default: full format with seconds
 * formatZodiacPosition(pos);
 * // "15°30'45\" Aries"
 *
 * // Without seconds
 * formatZodiacPosition(pos, { includeSeconds: false });
 * // "15°30' Aries"
 *
 * // Decimal degrees
 * formatZodiacPosition(pos, { decimalDegrees: true });
 * // "15.51° Aries"
 *
 * // With symbol instead of name
 * formatZodiacPosition(pos, { useSymbol: true });
 * // "15°30'45\" ♈"
 *
 * // Longitude only (no sign)
 * formatZodiacPosition(pos, { includeSign: false });
 * // "15°30'45\""
 * ```
 *
 * @public
 */
export function formatZodiacPosition(
  position: ZodiacPosition,
  options: {
    includeSeconds?: boolean;
    includeSign?: boolean;
    useSymbol?: boolean;
    decimalDegrees?: boolean;
  } = {},
): string {
  const {
    includeSeconds = true,
    includeSign = true,
    useSymbol = false,
    decimalDegrees = false,
  } = options;

  let degreeStr: string;

  if (decimalDegrees) {
    // Format as decimal degrees
    degreeStr = `${position.degreeInSign.toFixed(2)}°`;
  } else {
    // Format as DMS
    const deg = position.degree;
    const min = position.minute.toString().padStart(2, '0');

    if (includeSeconds) {
      const sec = position.second.toString().padStart(2, '0');
      degreeStr = `${deg}°${min}'${sec}"`;
    } else {
      degreeStr = `${deg}°${min}'`;
    }
  }

  if (!includeSign) {
    return degreeStr;
  }

  const signStr = useSymbol ? SIGN_DATA[position.sign].symbol : position.signName;

  return `${degreeStr} ${signStr}`;
}
