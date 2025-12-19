/**
 * Zodiac module - Public API
 *
 * Zodiac sign calculations, sign properties, and planetary dignities
 * for the tropical zodiac system.
 *
 * @module zodiac
 *
 * @example
 * ```typescript
 * import { eclipticToZodiac, getSignInfo, getPlanetaryDignity, Sign, Planet } from '@celestine/zodiac';
 *
 * // Convert ecliptic longitude to zodiac position
 * const position = eclipticToZodiac(217.411111);
 * // position.sign = Sign.Scorpio
 * // position.formatted = "7°24'40\" Scorpio"
 *
 * // Get sign properties
 * const ariesInfo = getSignInfo(Sign.Aries);
 * // ariesInfo.element = Element.Fire
 * // ariesInfo.modality = Modality.Cardinal
 *
 * // Check planetary dignity
 * const marsAries = getPlanetaryDignity(Planet.Mars, Sign.Aries);
 * // marsAries.state = DignityState.Domicile
 * // marsAries.strength = +5
 * ```
 */

// Constants
export {
  DIGNITY_STRENGTH,
  EXALTATIONS,
  PLANET_SYMBOLS,
  PLANETARY_RULERSHIPS,
  SIGN_DATA,
} from './constants.js';
// Dignities
export {
  getPlanetaryDignity,
  isDetriment,
  isExalted,
  isFall,
  isRuler,
} from './dignities.js';
// Sign properties
export { getSignInfo, getSignName, getSignSymbol } from './sign-properties.js';
// Types
export type {
  Dignity,
  ExaltationData,
  FormatOptions,
  SignInfo,
  ZodiacPosition,
} from './types.js';
export { DignityState, Element, Modality, Planet, Polarity, Sign } from './types.js';
// Core functions
export { eclipticToZodiac, formatZodiacPosition } from './zodiac.js';
