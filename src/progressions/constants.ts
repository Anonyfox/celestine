/**
 * Progressions Module - Constants
 *
 * Progression rates, default orbs, and configuration constants.
 *
 * @module progressions/constants
 *
 * @remarks
 * All constants are verified against authoritative sources:
 * - Meeus "Astronomical Algorithms" for astronomical values
 * - Robert Hand & Noel Tyl for astrological practice
 *
 * @see IMPL.md Section 4 for detailed specifications
 */

import { AspectType } from '../aspects/types.js';
import { CelestialBody } from '../ephemeris/positions.js';
import type { AngleProgressionMethod, ProgressionConfig, ProgressionType } from './types.js';

// =============================================================================
// ASTRONOMICAL CONSTANTS
// =============================================================================

/**
 * Days in a Julian year.
 * Used for calculating age in years from Julian Date differences.
 */
export const DAYS_PER_YEAR = 365.25;

/**
 * Mean tropical month in days.
 * Used for minor progressions (month-for-a-year).
 *
 * @remarks
 * This is the average time for the Moon to return to the same
 * position relative to the vernal equinox.
 * Source: Meeus "Astronomical Algorithms"
 */
export const TROPICAL_MONTH_DAYS = 27.321582;

/**
 * Mean synodic month in days.
 * The time between successive new moons.
 */
export const SYNODIC_MONTH_DAYS = 29.530589;

/**
 * Sun's mean daily motion in degrees.
 * Source: Meeus "Astronomical Algorithms" Chapter 25
 */
export const SUN_MEAN_DAILY_MOTION = 0.9856473;

/**
 * Moon's mean daily motion in degrees.
 * Source: Meeus "Astronomical Algorithms" Chapter 47
 */
export const MOON_MEAN_DAILY_MOTION = 13.176358;

// =============================================================================
// PROGRESSION RATES
// =============================================================================

/**
 * Rate for secondary progressions.
 * 1 day of planetary motion = 1 year of life.
 */
export const SECONDARY_PROGRESSION_RATE = 1;

/**
 * Rate for minor progressions.
 * 1 tropical month of motion = 1 year of life.
 */
export const MINOR_PROGRESSION_RATE = TROPICAL_MONTH_DAYS;

/**
 * Rate for tertiary progressions (days of motion per year of life).
 * 1 day of motion = 1 month of life.
 * So 12 days of motion = 1 year of life.
 */
export const TERTIARY_PROGRESSION_RATE = 12;

/**
 * Progression rate lookup by type.
 *
 * @remarks
 * Value represents: how many days of motion per year of life.
 */
export const PROGRESSION_RATES: Record<ProgressionType, number> = {
  secondary: SECONDARY_PROGRESSION_RATE,
  'solar-arc': SECONDARY_PROGRESSION_RATE, // Solar arc uses secondary timing
  minor: MINOR_PROGRESSION_RATE,
  tertiary: TERTIARY_PROGRESSION_RATE,
};

// =============================================================================
// PROGRESSION ORBS
// =============================================================================

/**
 * Default orbs for progressed aspects (in degrees).
 *
 * @remarks
 * Progressed aspects use much tighter orbs than natal aspects because:
 * 1. Each degree of orb represents about 1 year of time
 * 2. Tighter orbs increase precision of timing
 * 3. Traditional practice uses 1° for major, 0.5° for minor
 *
 * Source: Robert Hand's recommendations, Noel Tyl "Solar Arcs"
 */
export const PROGRESSION_ORBS: Readonly<Record<AspectType, number>> = {
  // Major aspects - 1° orb
  [AspectType.Conjunction]: 1.0,
  [AspectType.Opposition]: 1.0,
  [AspectType.Square]: 1.0,
  [AspectType.Trine]: 1.0,
  [AspectType.Sextile]: 1.0,

  // Minor aspects - 0.5° orb
  [AspectType.Quincunx]: 0.5,
  [AspectType.SemiSextile]: 0.5,
  [AspectType.SemiSquare]: 0.5,
  [AspectType.Sesquiquadrate]: 0.5,
  [AspectType.Quintile]: 0.5,
  [AspectType.Biquintile]: 0.5,

  // Kepler aspects - very tight 0.3° orb
  [AspectType.Septile]: 0.3,
  [AspectType.Novile]: 0.3,
  [AspectType.Decile]: 0.3,
};

/**
 * Extended orb for luminaries (Sun, Moon) in progressions.
 * Added to base orb when Sun or Moon is involved.
 */
export const LUMINARY_ORB_EXTENSION = 0.5;

/**
 * Extended orb for angles (ASC, MC) in progressions.
 * Angles are highly sensitive points.
 */
export const ANGLE_ORB_EXTENSION = 0.5;

// =============================================================================
// THRESHOLDS
// =============================================================================

/**
 * Threshold for marking an aspect as "exact" phase (degrees).
 * Aspects with deviation below this are considered exact.
 * ~6 arcminutes = very precise timing.
 */
export const EXACT_THRESHOLD = 0.1;

/**
 * Speed threshold for stationary determination (degrees/day).
 * Below this, aspect phase determination is unreliable.
 */
export const STATIONARY_THRESHOLD = 0.001;

/**
 * Maximum age to progress to (years).
 * Beyond this, accuracy decreases significantly.
 */
export const MAX_PROGRESSION_AGE = 120;

/**
 * Warning threshold for future progressions (years from current date).
 * Progressions far in the future have decreasing accuracy.
 */
export const FUTURE_WARNING_YEARS = 50;

// =============================================================================
// DEFAULT BODIES
// =============================================================================

/**
 * Default bodies to include in progressed charts.
 *
 * @remarks
 * Outer planets (Uranus, Neptune, Pluto) are excluded by default because
 * they move too slowly to produce meaningful progressions:
 * - Uranus: ~0.012°/year in progressions (barely noticeable)
 * - Neptune: ~0.006°/year
 * - Pluto: ~0.004°/year
 *
 * Inner planets and luminaries are the meaningful progressed bodies.
 */
export const DEFAULT_PROGRESSION_BODIES: readonly CelestialBody[] = [
  CelestialBody.Sun,
  CelestialBody.Moon,
  CelestialBody.Mercury,
  CelestialBody.Venus,
  CelestialBody.Mars,
  CelestialBody.Jupiter,
  CelestialBody.Saturn,
];

/**
 * Bodies that can meaningfully retrograde in progressions.
 *
 * @remarks
 * Mercury and Venus can turn retrograde or direct within a typical
 * human lifespan's worth of progressed time. Mars rarely does.
 * Outer planets effectively don't change direction in progressions.
 */
export const RETROGRADE_CAPABLE_BODIES: readonly CelestialBody[] = [
  CelestialBody.Mercury,
  CelestialBody.Venus,
  CelestialBody.Mars,
];

/**
 * Luminary bodies (for orb extension).
 */
export const LUMINARIES: readonly CelestialBody[] = [CelestialBody.Sun, CelestialBody.Moon];

// =============================================================================
// APPROXIMATE ANNUAL MOTION IN PROGRESSIONS
// =============================================================================

/**
 * Approximate annual motion for each body in secondary progressions (degrees/year).
 *
 * @remarks
 * In secondary progressions, 1 year = 1 day of motion.
 * So annual progressed motion ≈ daily motion.
 *
 * These values help estimate timing and are useful for:
 * - Predicting when aspects will perfect
 * - Estimating sign change dates
 * - Understanding significance (Moon changes sign frequently, Jupiter barely moves)
 *
 * Source: Mean daily motions from Meeus "Astronomical Algorithms"
 */
export const PROGRESSED_ANNUAL_MOTION: Readonly<Partial<Record<CelestialBody, number>>> = {
  [CelestialBody.Sun]: 0.9856, // ~1° per year
  [CelestialBody.Moon]: 13.176, // ~13° per year = ~1° per month
  [CelestialBody.Mercury]: 1.383, // Variable; can be retrograde
  [CelestialBody.Venus]: 1.2, // Variable; can be retrograde
  [CelestialBody.Mars]: 0.524, // ~0.5° per year
  [CelestialBody.Jupiter]: 0.083, // ~0.08° per year (nearly stationary)
  [CelestialBody.Saturn]: 0.034, // ~0.03° per year (nearly stationary)
  [CelestialBody.Uranus]: 0.012, // Essentially fixed
  [CelestialBody.Neptune]: 0.006, // Essentially fixed
  [CelestialBody.Pluto]: 0.004, // Essentially fixed
  [CelestialBody.Chiron]: 0.02, // Nearly stationary
};

/**
 * Years for Sun to progress through one sign (30°).
 * 30° / 0.9856°/year ≈ 30.4 years.
 */
export const SUN_SIGN_PROGRESSION_YEARS = 30.44;

/**
 * Months for Moon to progress through one sign (30°).
 * In progressions, Moon moves ~1° per month.
 * 30° / 1.1°/month ≈ 27-28 months.
 */
export const MOON_SIGN_PROGRESSION_MONTHS = 27.3;

/**
 * Years for progressed Moon to complete the zodiac.
 * 360° / 13.176°/year ≈ 27.3 years.
 */
export const MOON_ZODIAC_CYCLE_YEARS = 27.32;

// =============================================================================
// ASPECT CONSTANTS
// =============================================================================

/**
 * Major aspects for progressions (Ptolemaic).
 */
export const MAJOR_PROGRESSION_ASPECTS: readonly AspectType[] = [
  AspectType.Conjunction,
  AspectType.Sextile,
  AspectType.Square,
  AspectType.Trine,
  AspectType.Opposition,
];

/**
 * All supported progression aspect types.
 */
export const ALL_PROGRESSION_ASPECTS: readonly AspectType[] = Object.values(AspectType);

/**
 * Aspect angles in degrees.
 */
export const ASPECT_ANGLES: Readonly<Record<AspectType, number>> = {
  [AspectType.Conjunction]: 0,
  [AspectType.SemiSextile]: 30,
  [AspectType.Decile]: 36,
  [AspectType.Novile]: 40,
  [AspectType.SemiSquare]: 45,
  [AspectType.Septile]: 360 / 7, // 51.4286°
  [AspectType.Sextile]: 60,
  [AspectType.Quintile]: 72,
  [AspectType.Square]: 90,
  [AspectType.Trine]: 120,
  [AspectType.Sesquiquadrate]: 135,
  [AspectType.Biquintile]: 144,
  [AspectType.Quincunx]: 150,
  [AspectType.Opposition]: 180,
};

/**
 * Aspect symbols for display.
 */
export const ASPECT_SYMBOLS: Readonly<Record<AspectType, string>> = {
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
  [AspectType.Septile]: 'S',
  [AspectType.Novile]: 'N',
  [AspectType.Decile]: 'D',
};

// =============================================================================
// BODY NAMES
// =============================================================================

/**
 * Display names for celestial bodies.
 */
export const BODY_NAMES: Readonly<Partial<Record<CelestialBody, string>>> = {
  [CelestialBody.Sun]: 'Sun',
  [CelestialBody.Moon]: 'Moon',
  [CelestialBody.Mercury]: 'Mercury',
  [CelestialBody.Venus]: 'Venus',
  [CelestialBody.Mars]: 'Mars',
  [CelestialBody.Jupiter]: 'Jupiter',
  [CelestialBody.Saturn]: 'Saturn',
  [CelestialBody.Uranus]: 'Uranus',
  [CelestialBody.Neptune]: 'Neptune',
  [CelestialBody.Pluto]: 'Pluto',
  [CelestialBody.Chiron]: 'Chiron',
  [CelestialBody.NorthNode]: 'North Node',
  [CelestialBody.TrueNorthNode]: 'True North Node',
};

/**
 * Zodiac sign names by index (0-11).
 */
export const SIGN_NAMES: readonly string[] = [
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

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

/**
 * Default progression configuration.
 *
 * @remarks
 * These defaults represent common astrological practice:
 * - Secondary progressions (most popular system)
 * - Solar arc for angles (simpler, widely used)
 * - Inner planets only (outer planets move too slowly)
 * - Major aspects only (with tight orbs)
 */
export const DEFAULT_PROGRESSION_CONFIG: Required<ProgressionConfig> = {
  type: 'secondary' as ProgressionType,
  angleMethod: 'solar-arc' as AngleProgressionMethod,
  bodies: [...DEFAULT_PROGRESSION_BODIES],
  includeProgressedAspects: false,
  includeNatalAspects: true,
  aspectTypes: [...MAJOR_PROGRESSION_ASPECTS],
  orbs: { ...PROGRESSION_ORBS },
  includeSolarArc: true,
  minimumStrength: 0,
  exactThreshold: EXACT_THRESHOLD,
};

// =============================================================================
// VALIDATION CONSTANTS
// =============================================================================

/**
 * Minimum valid birth year for progressions.
 * Earlier dates have significant ΔT uncertainty.
 */
export const MIN_BIRTH_YEAR = 1800;

/**
 * Maximum reasonable target year.
 * Far future calculations have decreasing accuracy.
 */
export const MAX_TARGET_YEAR = 2200;

