/**
 * Sign properties and information
 *
 * Functions for retrieving detailed information about zodiac signs,
 * including elements, modalities, polarities, and rulers.
 *
 * @module zodiac/sign-properties
 */

import { SIGN_DATA } from './constants.js';
import type { Sign, SignInfo } from './types.js';

/**
 * Get complete information about a zodiac sign
 *
 * Returns all properties of a sign including element, modality, polarity,
 * rulers, and degree boundaries.
 *
 * @param sign - The zodiac sign (0-11)
 * @returns Complete sign information
 *
 * @example
 * ```typescript
 * const ariesInfo = getSignInfo(Sign.Aries);
 * // {
 * //   sign: Sign.Aries,
 * //   name: 'Aries',
 * //   symbol: '♈',
 * //   element: Element.Fire,
 * //   modality: Modality.Cardinal,
 * //   polarity: Polarity.Positive,
 * //   ruler: Planet.Mars,
 * //   ...
 * // }
 * ```
 *
 * @example
 * ```typescript
 * // For signs with modern rulers
 * const scorpioInfo = getSignInfo(Sign.Scorpio);
 * // scorpioInfo.ruler = Planet.Pluto (modern)
 * // scorpioInfo.traditionalRuler = Planet.Mars
 * // scorpioInfo.modernRuler = Planet.Pluto
 * ```
 *
 * @public
 */
export function getSignInfo(sign: Sign): SignInfo {
  // Validate sign is in valid range
  if (sign < 0 || sign > 11) {
    throw new Error(`Invalid sign: ${sign}. Must be 0-11.`);
  }

  return SIGN_DATA[sign];
}

/**
 * Get sign name from sign enum
 *
 * Convenience function to get just the sign name.
 *
 * @param sign - The zodiac sign (0-11)
 * @returns Sign name as string
 *
 * @example
 * ```typescript
 * getSignName(Sign.Leo);    // 'Leo'
 * getSignName(Sign.Pisces); // 'Pisces'
 * ```
 *
 * @public
 */
export function getSignName(sign: Sign): string {
  return getSignInfo(sign).name;
}

/**
 * Get sign symbol (Unicode) from sign enum
 *
 * @param sign - The zodiac sign (0-11)
 * @returns Unicode symbol
 *
 * @example
 * ```typescript
 * getSignSymbol(Sign.Aries);    // '♈'
 * getSignSymbol(Sign.Scorpio);  // '♏'
 * ```
 *
 * @public
 */
export function getSignSymbol(sign: Sign): string {
  return getSignInfo(sign).symbol;
}
