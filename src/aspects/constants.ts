/**
 * Aspects Module - Constants
 *
 * Aspect definitions, symbols, and default orb values.
 *
 * @module aspects/constants
 *
 * @remarks
 * All aspect angles and orbs are verified against authoritative sources:
 * - Ptolemy's "Tetrabiblos" (major aspects)
 * - Lilly's "Christian Astrology" (traditional orbs)
 * - Modern consensus (Astrograph, Astro.com)
 *
 * @see IMPL.md Section 2 and 3 for detailed specifications
 */

import type { AspectDefinition } from './types.js';
import { AspectType } from './types.js';

// =============================================================================
// ASPECT SYMBOLS (Unicode)
// =============================================================================

/**
 * Unicode symbols for aspect types.
 *
 * @remarks
 * These are standard astrological symbols used in chart displays.
 * Source: Unicode Block "Miscellaneous Symbols" (U+2600–U+26FF)
 */
export const ASPECT_SYMBOLS: Record<AspectType, string> = {
  [AspectType.Conjunction]: '☌',
  [AspectType.Sextile]: '⚹',
  [AspectType.Square]: '□',
  [AspectType.Trine]: '△',
  [AspectType.Opposition]: '☍',
  [AspectType.SemiSextile]: '⚺',
  [AspectType.SemiSquare]: '∠',
  [AspectType.Quintile]: 'Q',
  [AspectType.Sesquiquadrate]: '⚼',
  [AspectType.Biquintile]: 'bQ',
  [AspectType.Quincunx]: '⚻',
  // Kepler aspects (using abbreviations as no standard Unicode exists)
  [AspectType.Septile]: 'S',
  [AspectType.Novile]: 'N',
  [AspectType.Decile]: 'D',
} as const;

// =============================================================================
// ASPECT ANGLES
// =============================================================================

/**
 * Exact angles for each aspect type in degrees.
 *
 * @remarks
 * These are the mathematically exact angles. Aspects within orb
 * are detected when the separation is close to these values.
 *
 * Derivation (harmonic series):
 * - Conjunction: 360°/∞ = 0°
 * - Opposition: 360°/2 = 180°
 * - Trine: 360°/3 = 120°
 * - Square: 360°/4 = 90°
 * - Sextile: 360°/6 = 60°
 * - Semi-sextile: 360°/12 = 30°
 * - Quincunx: 5 × 30° = 150°
 * - Semi-square: 360°/8 = 45°
 * - Sesquiquadrate: 3 × 45° = 135°
 * - Quintile: 360°/5 = 72°
 * - Biquintile: 2 × 72° = 144°
 *
 * Kepler aspects (from "Harmonices Mundi", 1619):
 * - Septile: 360°/7 = 51.42857142857143°
 * - Novile: 360°/9 = 40°
 * - Decile: 360°/10 = 36°
 */
export const ASPECT_ANGLES: Record<AspectType, number> = {
  [AspectType.Conjunction]: 0,
  [AspectType.Sextile]: 60,
  [AspectType.Square]: 90,
  [AspectType.Trine]: 120,
  [AspectType.Opposition]: 180,
  [AspectType.SemiSextile]: 30,
  [AspectType.SemiSquare]: 45,
  [AspectType.Quintile]: 72,
  [AspectType.Sesquiquadrate]: 135,
  [AspectType.Biquintile]: 144,
  [AspectType.Quincunx]: 150,
  // Kepler aspects - mathematically exact values
  [AspectType.Septile]: 360 / 7, // 51.42857142857143°
  [AspectType.Novile]: 40, // 360/9 = 40° exactly
  [AspectType.Decile]: 36, // 360/10 = 36° exactly
} as const;

// =============================================================================
// DEFAULT ORBS
// =============================================================================

/**
 * Default orb values for each aspect type in degrees.
 *
 * @remarks
 * These are consensus values from modern astrological practice:
 * - Major aspects: 6-8° orbs
 * - Minor aspects: 2-3° orbs
 *
 * Sources:
 * - Astrograph.com aspect orb tables
 * - Astro.com default settings
 * - Robert Hand's recommendations
 *
 * Note: Luminaries (Sun/Moon) often use wider orbs (+2°).
 * This is handled via configuration, not built into these defaults.
 */
export const DEFAULT_ORBS: Record<AspectType, number> = {
  // Major aspects - wider orbs
  [AspectType.Conjunction]: 8,
  [AspectType.Opposition]: 8,
  [AspectType.Trine]: 8,
  [AspectType.Square]: 7,
  [AspectType.Sextile]: 6,

  // Minor aspects - tighter orbs
  [AspectType.SemiSextile]: 2,
  [AspectType.SemiSquare]: 2,
  [AspectType.Quintile]: 2,
  [AspectType.Sesquiquadrate]: 2,
  [AspectType.Biquintile]: 2,
  [AspectType.Quincunx]: 3,

  // Kepler aspects - very tight orbs (1-2°)
  [AspectType.Septile]: 1,
  [AspectType.Novile]: 1,
  [AspectType.Decile]: 1,
} as const;

// =============================================================================
// ASPECT NAMES
// =============================================================================

/**
 * Human-readable names for aspect types.
 */
export const ASPECT_NAMES: Record<AspectType, string> = {
  [AspectType.Conjunction]: 'Conjunction',
  [AspectType.Sextile]: 'Sextile',
  [AspectType.Square]: 'Square',
  [AspectType.Trine]: 'Trine',
  [AspectType.Opposition]: 'Opposition',
  [AspectType.SemiSextile]: 'Semi-sextile',
  [AspectType.SemiSquare]: 'Semi-square',
  [AspectType.Quintile]: 'Quintile',
  [AspectType.Sesquiquadrate]: 'Sesquiquadrate',
  [AspectType.Biquintile]: 'Biquintile',
  [AspectType.Quincunx]: 'Quincunx',
  [AspectType.Septile]: 'Septile',
  [AspectType.Novile]: 'Novile',
  [AspectType.Decile]: 'Decile',
} as const;

// =============================================================================
// ASPECT CLASSIFICATIONS
// =============================================================================

/**
 * Major aspects (Ptolemaic) - the five traditional aspects.
 */
export const MAJOR_ASPECTS: AspectType[] = [
  AspectType.Conjunction,
  AspectType.Sextile,
  AspectType.Square,
  AspectType.Trine,
  AspectType.Opposition,
] as const;

/**
 * Minor aspects - additional aspects with tighter orbs.
 */
export const MINOR_ASPECTS: AspectType[] = [
  AspectType.SemiSextile,
  AspectType.SemiSquare,
  AspectType.Quintile,
  AspectType.Sesquiquadrate,
  AspectType.Biquintile,
  AspectType.Quincunx,
] as const;

/**
 * Kepler aspects - harmonic aspects from Johannes Kepler's "Harmonices Mundi" (1619).
 *
 * @remarks
 * These aspects are derived from dividing the circle by 7, 9, and 10.
 * They have very tight orbs (1°) and are considered subtle influences.
 *
 * Mathematical derivation:
 * - Septile: 360°/7 = 51.42857142857143°
 * - Novile: 360°/9 = 40° exactly
 * - Decile: 360°/10 = 36° exactly
 */
export const KEPLER_ASPECTS: AspectType[] = [
  AspectType.Septile,
  AspectType.Novile,
  AspectType.Decile,
] as const;

/**
 * All supported aspect types.
 */
export const ALL_ASPECTS: AspectType[] = [
  ...MAJOR_ASPECTS,
  ...MINOR_ASPECTS,
  ...KEPLER_ASPECTS,
] as const;

/**
 * Harmonious/soft aspects - easy energy flow.
 */
export const HARMONIOUS_ASPECTS: AspectType[] = [AspectType.Trine, AspectType.Sextile] as const;

/**
 * Dynamic/hard aspects - tension requiring action.
 */
export const DYNAMIC_ASPECTS: AspectType[] = [
  AspectType.Square,
  AspectType.Opposition,
  AspectType.SemiSquare,
  AspectType.Sesquiquadrate,
] as const;

// =============================================================================
// COMPLETE ASPECT DEFINITIONS
// =============================================================================

/**
 * Complete definitions for all supported aspects.
 *
 * @remarks
 * This combines all aspect properties into a single reference object.
 * Use this for looking up aspect properties by type.
 *
 * @example
 * ```typescript
 * const trine = ASPECT_DEFINITIONS[AspectType.Trine];
 * console.log(trine.angle); // 120
 * console.log(trine.symbol); // '△'
 * console.log(trine.nature); // 'harmonious'
 * ```
 */
export const ASPECT_DEFINITIONS: Record<AspectType, AspectDefinition> = {
  [AspectType.Conjunction]: {
    type: AspectType.Conjunction,
    angle: 0,
    symbol: '☌',
    defaultOrb: 8,
    classification: 'major',
    nature: 'neutral',
    name: 'Conjunction',
    harmonic: Infinity, // 360/0 is undefined, conjunction is the base
  },
  [AspectType.Sextile]: {
    type: AspectType.Sextile,
    angle: 60,
    symbol: '⚹',
    defaultOrb: 6,
    classification: 'major',
    nature: 'harmonious',
    name: 'Sextile',
    harmonic: 6,
  },
  [AspectType.Square]: {
    type: AspectType.Square,
    angle: 90,
    symbol: '□',
    defaultOrb: 7,
    classification: 'major',
    nature: 'dynamic',
    name: 'Square',
    harmonic: 4,
  },
  [AspectType.Trine]: {
    type: AspectType.Trine,
    angle: 120,
    symbol: '△',
    defaultOrb: 8,
    classification: 'major',
    nature: 'harmonious',
    name: 'Trine',
    harmonic: 3,
  },
  [AspectType.Opposition]: {
    type: AspectType.Opposition,
    angle: 180,
    symbol: '☍',
    defaultOrb: 8,
    classification: 'major',
    nature: 'dynamic',
    name: 'Opposition',
    harmonic: 2,
  },
  [AspectType.SemiSextile]: {
    type: AspectType.SemiSextile,
    angle: 30,
    symbol: '⚺',
    defaultOrb: 2,
    classification: 'minor',
    nature: 'neutral',
    name: 'Semi-sextile',
    harmonic: 12,
  },
  [AspectType.SemiSquare]: {
    type: AspectType.SemiSquare,
    angle: 45,
    symbol: '∠',
    defaultOrb: 2,
    classification: 'minor',
    nature: 'dynamic',
    name: 'Semi-square',
    harmonic: 8,
  },
  [AspectType.Quintile]: {
    type: AspectType.Quintile,
    angle: 72,
    symbol: 'Q',
    defaultOrb: 2,
    classification: 'minor',
    nature: 'harmonious',
    name: 'Quintile',
    harmonic: 5,
  },
  [AspectType.Sesquiquadrate]: {
    type: AspectType.Sesquiquadrate,
    angle: 135,
    symbol: '⚼',
    defaultOrb: 2,
    classification: 'minor',
    nature: 'dynamic',
    name: 'Sesquiquadrate',
    harmonic: 8, // 360/45 = 8, this is 3rd harmonic of octile
  },
  [AspectType.Biquintile]: {
    type: AspectType.Biquintile,
    angle: 144,
    symbol: 'bQ',
    defaultOrb: 2,
    classification: 'minor',
    nature: 'harmonious',
    name: 'Biquintile',
    harmonic: 5, // 2nd harmonic of quintile
  },
  [AspectType.Quincunx]: {
    type: AspectType.Quincunx,
    angle: 150,
    symbol: '⚻',
    defaultOrb: 3,
    classification: 'minor',
    nature: 'neutral',
    name: 'Quincunx',
    harmonic: 12, // 5th harmonic of semi-sextile
  },
  // Kepler aspects
  [AspectType.Septile]: {
    type: AspectType.Septile,
    angle: 360 / 7, // 51.42857142857143°
    symbol: 'S',
    defaultOrb: 1,
    classification: 'minor',
    nature: 'neutral', // Spiritual/karmic
    name: 'Septile',
    harmonic: 7,
  },
  [AspectType.Novile]: {
    type: AspectType.Novile,
    angle: 40, // 360/9 = 40° exactly
    symbol: 'N',
    defaultOrb: 1,
    classification: 'minor',
    nature: 'harmonious', // Spiritual completion
    name: 'Novile',
    harmonic: 9,
  },
  [AspectType.Decile]: {
    type: AspectType.Decile,
    angle: 36, // 360/10 = 36° exactly
    symbol: 'D',
    defaultOrb: 1,
    classification: 'minor',
    nature: 'harmonious', // Growth, skill
    name: 'Decile',
    harmonic: 10,
  },
} as const;

// =============================================================================
// SIGN RELATIONSHIPS FOR OUT-OF-SIGN DETECTION
// =============================================================================

/**
 * Expected sign separations for each aspect type.
 *
 * @remarks
 * Used to detect out-of-sign (dissociate) aspects.
 * An aspect is "out of sign" when the planets are in aspect by degree
 * but NOT in signs that traditionally form that aspect.
 *
 * Sign separation = (sign2 - sign1 + 12) % 12
 *
 * Example for Square (3 signs apart):
 * - Aries (0) to Cancer (3) = 3 ✓
 * - Aries (0) to Capricorn (9) = 9 (= 12 - 3) ✓
 */
export const ASPECT_SIGN_SEPARATIONS: Record<AspectType, number[]> = {
  [AspectType.Conjunction]: [0],
  [AspectType.Sextile]: [2, 10],
  [AspectType.Square]: [3, 9],
  [AspectType.Trine]: [4, 8],
  [AspectType.Opposition]: [6],
  [AspectType.SemiSextile]: [1, 11],
  [AspectType.SemiSquare]: [1, 2, 10, 11], // Can occur across 1 or 2 signs
  [AspectType.Quintile]: [2, 3, 9, 10], // ~2.4 signs
  [AspectType.Sesquiquadrate]: [4, 5, 7, 8], // 4.5 signs
  [AspectType.Biquintile]: [4, 5, 7, 8], // ~4.8 signs
  [AspectType.Quincunx]: [5, 7],
  // Kepler aspects - sign separations based on angle/30°
  [AspectType.Septile]: [1, 2, 10, 11], // 51.43°/30 ≈ 1.7 signs
  [AspectType.Novile]: [1, 2, 10, 11], // 40°/30 ≈ 1.3 signs
  [AspectType.Decile]: [1, 2, 10, 11], // 36°/30 = 1.2 signs
} as const;

// =============================================================================
// UTILITY CONSTANTS
// =============================================================================

/**
 * Tolerance for floating-point comparisons in degrees.
 * 0.0001° ≈ 0.36 arcseconds - well below astrological precision needs.
 */
export const ANGLE_EPSILON = 0.0001;

/**
 * Speed threshold for determining if a planet is stationary.
 * Below this speed (degrees/day), applying/separating is unreliable.
 */
export const STATIONARY_THRESHOLD = 0.01;

/**
 * Maximum angular separation to consider (always use shortest arc).
 */
export const MAX_SEPARATION = 180;
