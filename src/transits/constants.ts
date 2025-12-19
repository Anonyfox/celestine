/**
 * Transit Module - Constants
 *
 * Default orbs, body lists, and other constants for transit calculations.
 *
 * @module transits/constants
 *
 * @remarks
 * Transit orbs are typically tighter than natal orbs because:
 * 1. Transits are time-sensitive (exact timing matters)
 * 2. Wider orbs would show too many simultaneous transits
 * 3. Traditional practice uses 1-3° for most transits
 *
 * @see IMPL.md for rationale and sources
 */

import { AspectType } from '../aspects/types.js';
import { CelestialBody } from '../ephemeris/positions.js';

// =============================================================================
// DEFAULT TRANSIT ORBS
// =============================================================================

/**
 * Default orbs for transit aspects (in degrees).
 *
 * @remarks
 * These are tighter than natal orbs. Major aspects get 2-3°,
 * minor aspects get 1° or less. These can be overridden via config.
 *
 * Source: Traditional astrological practice, consolidated from
 * Robert Hand "Planets in Transit" and other standard references.
 */
export const DEFAULT_TRANSIT_ORBS: Readonly<Record<AspectType, number>> = {
  // Major aspects (Ptolemaic)
  [AspectType.Conjunction]: 3,
  [AspectType.Opposition]: 3,
  [AspectType.Square]: 2,
  [AspectType.Trine]: 2,
  [AspectType.Sextile]: 1.5,

  // Minor aspects
  [AspectType.Quincunx]: 1,
  [AspectType.SemiSextile]: 1,
  [AspectType.SemiSquare]: 1,
  [AspectType.Sesquiquadrate]: 1,
  [AspectType.Quintile]: 0.5,
  [AspectType.Biquintile]: 0.5,

  // Kepler aspects (very tight orbs for transits)
  [AspectType.Septile]: 0.5,
  [AspectType.Novile]: 0.5,
  [AspectType.Decile]: 0.5,
};

/**
 * Major aspect types for quick filtering.
 */
export const MAJOR_TRANSIT_ASPECTS: readonly AspectType[] = [
  AspectType.Conjunction,
  AspectType.Sextile,
  AspectType.Square,
  AspectType.Trine,
  AspectType.Opposition,
];

/**
 * All supported transit aspect types.
 */
export const ALL_TRANSIT_ASPECTS: readonly AspectType[] = Object.values(AspectType);

// =============================================================================
// ORB MODIFIERS
// =============================================================================

/**
 * Orb extension for luminaries (Sun, Moon) as natal or transiting body.
 * Added to base orb when either body is a luminary.
 */
export const LUMINARY_ORB_EXTENSION = 1;

/**
 * Orb extension for chart angles (ASC, MC, DSC, IC) as natal point.
 * Angles are considered highly sensitive points.
 */
export const ANGLE_ORB_EXTENSION = 1;

/**
 * Orb extension for slow outer planets (Saturn through Pluto).
 * Their transits last longer and are given slightly wider orbs.
 */
export const OUTER_PLANET_ORB_EXTENSION = 0.5;

/**
 * Orb reduction for minor bodies (asteroids, Chiron).
 * Not as impactful as major planets.
 */
export const MINOR_BODY_ORB_REDUCTION = 0.5;

// =============================================================================
// TRANSITING BODIES
// =============================================================================

/**
 * All celestial bodies that can transit.
 *
 * @remarks
 * Excludes calculated points like Part of Fortune which don't "transit"
 * in the traditional sense (they're derived from other positions).
 */
export const TRANSITING_BODIES: readonly CelestialBody[] = [
  CelestialBody.Sun,
  CelestialBody.Moon,
  CelestialBody.Mercury,
  CelestialBody.Venus,
  CelestialBody.Mars,
  CelestialBody.Jupiter,
  CelestialBody.Saturn,
  CelestialBody.Uranus,
  CelestialBody.Neptune,
  CelestialBody.Pluto,
  CelestialBody.Chiron,
  CelestialBody.NorthNode,
];

/**
 * Default transiting bodies (most commonly used).
 * Excludes Moon (too fast for most analyses) and True Node.
 */
export const DEFAULT_TRANSITING_BODIES: readonly CelestialBody[] = [
  CelestialBody.Sun,
  CelestialBody.Mercury,
  CelestialBody.Venus,
  CelestialBody.Mars,
  CelestialBody.Jupiter,
  CelestialBody.Saturn,
  CelestialBody.Uranus,
  CelestialBody.Neptune,
  CelestialBody.Pluto,
];

/**
 * Fast-moving planets (inner planets + Sun).
 * Their transits are brief and may need smaller time steps.
 */
export const FAST_PLANETS: readonly CelestialBody[] = [
  CelestialBody.Sun,
  CelestialBody.Moon,
  CelestialBody.Mercury,
  CelestialBody.Venus,
  CelestialBody.Mars,
];

/**
 * Slow-moving planets (outer planets + Chiron).
 * Their transits last longer and may have multiple passes due to retrograde.
 */
export const SLOW_PLANETS: readonly CelestialBody[] = [
  CelestialBody.Jupiter,
  CelestialBody.Saturn,
  CelestialBody.Uranus,
  CelestialBody.Neptune,
  CelestialBody.Pluto,
  CelestialBody.Chiron,
];

/**
 * Planets that commonly go retrograde (affects transit duration).
 */
export const RETROGRADE_PLANETS: readonly CelestialBody[] = [
  CelestialBody.Mercury,
  CelestialBody.Venus,
  CelestialBody.Mars,
  CelestialBody.Jupiter,
  CelestialBody.Saturn,
  CelestialBody.Uranus,
  CelestialBody.Neptune,
  CelestialBody.Pluto,
  CelestialBody.Chiron,
];

/**
 * Luminary bodies (for orb extension checks).
 */
export const LUMINARIES: readonly CelestialBody[] = [CelestialBody.Sun, CelestialBody.Moon];

// =============================================================================
// AVERAGE DAILY MOTION
// =============================================================================

/**
 * Average daily motion for each body in degrees per day.
 *
 * @remarks
 * Used for:
 * - Estimating search step sizes
 * - Approximating transit duration
 * - Phase determination edge cases
 *
 * Values from Meeus "Astronomical Algorithms" and empirical observation.
 * Negative value for nodes indicates typical retrograde motion.
 */
export const AVERAGE_DAILY_MOTION: Readonly<Record<CelestialBody, number>> = {
  [CelestialBody.Sun]: 0.9856,
  [CelestialBody.Moon]: 13.176,
  [CelestialBody.Mercury]: 1.383,
  [CelestialBody.Venus]: 1.2,
  [CelestialBody.Mars]: 0.524,
  [CelestialBody.Jupiter]: 0.083,
  [CelestialBody.Saturn]: 0.034,
  [CelestialBody.Uranus]: 0.012,
  [CelestialBody.Neptune]: 0.006,
  [CelestialBody.Pluto]: 0.004,
  [CelestialBody.Chiron]: 0.02,
  [CelestialBody.NorthNode]: -0.053,
  [CelestialBody.TrueNorthNode]: -0.053,
  [CelestialBody.SouthNode]: -0.053,
  [CelestialBody.TrueSouthNode]: -0.053,
  [CelestialBody.Lilith]: 0.111,
  [CelestialBody.TrueLilith]: 0.111,
  [CelestialBody.Ceres]: 0.21,
  [CelestialBody.Pallas]: 0.23,
  [CelestialBody.Juno]: 0.23,
  [CelestialBody.Vesta]: 0.26,
};

// =============================================================================
// TYPICAL TRANSIT DURATIONS
// =============================================================================

/**
 * Typical transit duration in days for a 3° orb conjunction.
 *
 * @remarks
 * These are approximate and vary based on retrograde motion.
 * A retrograde transit can last 3-5x longer than the direct estimate.
 *
 * Formula: duration ≈ (2 × orb) / average_daily_motion
 */
export const TYPICAL_TRANSIT_DURATION_DAYS: Readonly<Record<CelestialBody, number>> = {
  [CelestialBody.Sun]: 6,
  [CelestialBody.Moon]: 0.5, // ~12 hours
  [CelestialBody.Mercury]: 4, // Can be 3 weeks if retrograde
  [CelestialBody.Venus]: 5, // Can be 6 weeks if retrograde
  [CelestialBody.Mars]: 11, // Can be 2 months if retrograde
  [CelestialBody.Jupiter]: 72, // ~2.5 months, often 3 passes
  [CelestialBody.Saturn]: 176, // ~6 months, usually 3 passes
  [CelestialBody.Uranus]: 500, // ~16 months, usually 3 passes
  [CelestialBody.Neptune]: 1000, // ~2.7 years, usually 3-5 passes
  [CelestialBody.Pluto]: 1500, // ~4 years, usually 3-5 passes
  [CelestialBody.Chiron]: 300, // ~10 months
  [CelestialBody.NorthNode]: 113, // ~4 months
  [CelestialBody.TrueNorthNode]: 113,
  [CelestialBody.SouthNode]: 113,
  [CelestialBody.TrueSouthNode]: 113,
  [CelestialBody.Lilith]: 54,
  [CelestialBody.TrueLilith]: 54,
  [CelestialBody.Ceres]: 29,
  [CelestialBody.Pallas]: 26,
  [CelestialBody.Juno]: 26,
  [CelestialBody.Vesta]: 23,
};

// =============================================================================
// SEARCH PARAMETERS
// =============================================================================

/**
 * Default search step in days for fast planets.
 */
export const FAST_PLANET_SEARCH_STEP = 1;

/**
 * Default search step in days for slow planets.
 * Can use larger steps because transits last longer.
 */
export const SLOW_PLANET_SEARCH_STEP = 3;

/**
 * Search step for Moon transits (in days).
 * Moon moves ~13°/day so needs sub-daily precision.
 */
export const MOON_SEARCH_STEP = 0.25; // 6 hours

/**
 * Maximum iterations for binary search when finding exact times.
 */
export const MAX_BINARY_SEARCH_ITERATIONS = 50;

/**
 * Tolerance for exact time finding (degrees).
 * ~0.36 arcseconds, more than sufficient for astrology.
 */
export const EXACT_TIME_TOLERANCE = 0.0001;

/**
 * Default threshold for marking a transit as "exact" phase (degrees).
 * Transits with deviation less than this are labeled 'exact'.
 */
export const DEFAULT_EXACT_THRESHOLD = 0.1;

/**
 * Speed threshold for considering a planet "stationary" (degrees/day).
 * Planets moving slower than this are treated as stationary.
 */
export const STATIONARY_SPEED_THRESHOLD = 0.001;

// =============================================================================
// BODY NAMES
// =============================================================================

/**
 * Display names for celestial bodies.
 */
export const BODY_NAMES: Readonly<Record<CelestialBody, string>> = {
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
  [CelestialBody.SouthNode]: 'South Node',
  [CelestialBody.TrueSouthNode]: 'True South Node',
  [CelestialBody.Lilith]: 'Lilith',
  [CelestialBody.TrueLilith]: 'True Lilith',
  [CelestialBody.Ceres]: 'Ceres',
  [CelestialBody.Pallas]: 'Pallas',
  [CelestialBody.Juno]: 'Juno',
  [CelestialBody.Vesta]: 'Vesta',
};

/**
 * Aspect symbols for transit formatting.
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

/**
 * Aspect angles in degrees.
 */
export const ASPECT_ANGLES: Readonly<Record<AspectType, number>> = {
  [AspectType.Conjunction]: 0,
  [AspectType.SemiSextile]: 30,
  [AspectType.Decile]: 36,
  [AspectType.Novile]: 40,
  [AspectType.SemiSquare]: 45,
  [AspectType.Septile]: 51.4286, // 360/7
  [AspectType.Sextile]: 60,
  [AspectType.Quintile]: 72,
  [AspectType.Square]: 90,
  [AspectType.Trine]: 120,
  [AspectType.Sesquiquadrate]: 135,
  [AspectType.Biquintile]: 144,
  [AspectType.Quincunx]: 150,
  [AspectType.Opposition]: 180,
};

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

/**
 * Default transit configuration.
 */
export const DEFAULT_TRANSIT_CONFIG = {
  aspectTypes: MAJOR_TRANSIT_ASPECTS,
  transitingBodies: DEFAULT_TRANSITING_BODIES,
  includeHouseIngress: false,
  calculateExactTimes: false,
  minimumStrength: 0,
  includeOutOfSign: true,
  exactThreshold: DEFAULT_EXACT_THRESHOLD,
} as const;
