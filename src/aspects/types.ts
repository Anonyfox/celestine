/**
 * Aspects Module - Type Definitions
 *
 * Core types for astrological aspect calculations.
 *
 * @module aspects/types
 *
 * @remarks
 * All angles are in degrees (0-360 for longitudes, 0-180 for separations).
 * Aspects are angular relationships between celestial bodies along the ecliptic.
 *
 * @see KNOWLEDGE.md Section 9 for conceptual foundations
 * @see IMPL.md for full implementation specification
 */

/**
 * Supported aspect types.
 *
 * @remarks
 * Major aspects (Ptolemaic) are the five traditional aspects used since antiquity.
 * Minor aspects provide additional nuance with tighter orbs.
 */
export enum AspectType {
  // Major Aspects (Ptolemaic)
  /** Conjunction: 0° - planets at same position, energies merge */
  Conjunction = 'conjunction',

  /** Sextile: 60° - opportunity, harmonious support */
  Sextile = 'sextile',

  /** Square: 90° - tension, challenge, dynamic action */
  Square = 'square',

  /** Trine: 120° - harmony, ease, natural flow */
  Trine = 'trine',

  /** Opposition: 180° - polarity, awareness, balance */
  Opposition = 'opposition',

  // Minor Aspects
  /** Semi-sextile: 30° - subtle friction, minor adjustment */
  SemiSextile = 'semi-sextile',

  /** Semi-square: 45° - irritation, minor tension */
  SemiSquare = 'semi-square',

  /** Quintile: 72° - creativity, talent, special gifts */
  Quintile = 'quintile',

  /** Sesquiquadrate: 135° - frustration, agitation */
  Sesquiquadrate = 'sesquiquadrate',

  /** Biquintile: 144° - creative mastery, refined talent */
  Biquintile = 'biquintile',

  /** Quincunx: 150° - adjustment needed, inconjunct, "blind spot" */
  Quincunx = 'quincunx',

  // Kepler Aspects (Harmonic)
  // Named after Johannes Kepler who introduced them in "Harmonices Mundi" (1619)

  /** Septile: 360°/7 ≈ 51.43° - fate, karma, spiritual connection */
  Septile = 'septile',

  /** Novile: 360°/9 = 40° - spiritual completion, divine order */
  Novile = 'novile',

  /** Decile: 360°/10 = 36° - growth, skill development */
  Decile = 'decile',
}

/**
 * Classification of aspect types.
 */
export type AspectClassification = 'major' | 'minor';

/**
 * Nature/quality of an aspect.
 *
 * @remarks
 * - Harmonious (soft): Easy energy flow (trine, sextile)
 * - Dynamic (hard): Tension requiring action (square, opposition)
 * - Neutral: Nature depends on planets involved (conjunction)
 */
export type AspectNature = 'harmonious' | 'dynamic' | 'neutral';

/**
 * Definition of an aspect type with its properties.
 *
 * @remarks
 * This defines the static properties of an aspect type (angle, symbol, etc.)
 * as opposed to a detected aspect between two specific bodies.
 */
export interface AspectDefinition {
  /** The aspect type identifier */
  type: AspectType;

  /** Exact angle in degrees (0-180) */
  angle: number;

  /** Unicode symbol for the aspect */
  symbol: string;

  /** Default orb in degrees */
  defaultOrb: number;

  /** Major or minor classification */
  classification: AspectClassification;

  /** Harmonious, dynamic, or neutral */
  nature: AspectNature;

  /** Human-readable name */
  name: string;

  /** Harmonic number (360 / angle) */
  harmonic: number;
}

/**
 * A detected aspect between two celestial bodies.
 *
 * @remarks
 * This represents an actual aspect found between two bodies at a specific time.
 * All angular values are in degrees.
 *
 * @example
 * ```typescript
 * const aspect: Aspect = {
 *   body1: 'Sun',
 *   body2: 'Saturn',
 *   type: AspectType.Trine,
 *   angle: 120,
 *   separation: 119.92,
 *   deviation: 0.08,
 *   orb: 8,
 *   strength: 99,
 *   isApplying: true,
 *   isOutOfSign: false,
 *   symbol: '△'
 * };
 * ```
 */
export interface Aspect {
  /** First celestial body (by convention, the faster-moving body) */
  body1: string;

  /** Second celestial body */
  body2: string;

  /** Type of aspect */
  type: AspectType;

  /** Exact angle for this aspect type (e.g., 120 for trine) */
  angle: number;

  /** Actual angular separation between the bodies (0-180°) */
  separation: number;

  /** Deviation from exact aspect angle (always positive) */
  deviation: number;

  /** Orb used for this detection */
  orb: number;

  /** Aspect strength as percentage (100 = exact, 0 = at orb edge) */
  strength: number;

  /** Whether the aspect is applying (getting tighter) or separating */
  isApplying: boolean | null;

  /** Whether this is an out-of-sign (dissociate) aspect */
  isOutOfSign: boolean;

  /** The aspect symbol */
  symbol: string;
}

/**
 * Configuration options for aspect calculations.
 *
 * @remarks
 * Allows customization of which aspects to detect and how orbs are applied.
 */
export interface AspectConfig {
  /**
   * Which aspect types to detect.
   * @default Major aspects only (conjunction, sextile, square, trine, opposition)
   */
  aspectTypes?: AspectType[];

  /**
   * Custom orbs per aspect type (overrides defaults).
   * Values in degrees.
   */
  orbs?: Partial<Record<AspectType, number>>;

  /**
   * Whether to detect out-of-sign (dissociate) aspects.
   * @default true
   */
  includeOutOfSign?: boolean;

  /**
   * Strength multiplier for out-of-sign aspects (0-1).
   * Applied as: finalStrength = strength * (1 - outOfSignPenalty)
   * @default 0 (no penalty)
   */
  outOfSignPenalty?: number;

  /**
   * Minimum strength (0-100) to include in results.
   * @default 0 (include all within orb)
   */
  minimumStrength?: number;

  /**
   * Whether to calculate and include applying/separating info.
   * Requires longitudeSpeed data for the bodies.
   * @default true
   */
  includeApplying?: boolean;
}

/**
 * Input for aspect calculation: a body's position and optional speed.
 */
export interface AspectBody {
  /** Identifier for the celestial body */
  name: string;

  /** Ecliptic longitude in degrees (0-360) */
  longitude: number;

  /** Longitude speed in degrees per day (positive = direct, negative = retrograde) */
  longitudeSpeed?: number;
}

/**
 * Result of calculating all aspects for a chart.
 */
export interface AspectCalculationResult {
  /** All detected aspects */
  aspects: Aspect[];

  /** Configuration used for calculation */
  config: AspectConfig;

  /** Bodies that were analyzed */
  bodies: string[];

  /** Number of body pairs checked */
  pairsChecked: number;
}

/**
 * Types of aspect patterns (configurations of 3+ bodies).
 */
export enum PatternType {
  /** T-Square: 2 squares + 1 opposition forming a T shape */
  TSquare = 'T-Square',

  /** Grand Trine: 3 trines forming an equilateral triangle */
  GrandTrine = 'Grand Trine',

  /** Grand Cross: 4 squares + 2 oppositions forming a cross */
  GrandCross = 'Grand Cross',

  /** Yod (Finger of God): 2 quincunxes + 1 sextile */
  Yod = 'Yod',

  /** Kite: Grand Trine + 1 opposition */
  Kite = 'Kite',

  /** Mystic Rectangle: 2 trines + 2 sextiles + 2 oppositions */
  MysticRectangle = 'Mystic Rectangle',

  /** Stellium: 3+ planets conjunct */
  Stellium = 'Stellium',
}

/**
 * A detected aspect pattern.
 */
export interface AspectPattern {
  /** Type of pattern */
  type: PatternType;

  /** Bodies involved in the pattern */
  bodies: string[];

  /** Aspects forming the pattern */
  aspects: Aspect[];

  /** Human-readable description */
  description: string;
}
