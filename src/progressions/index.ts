/**
 * Progressions Module
 *
 * Astrological progression calculations including secondary progressions,
 * solar arc directions, and related techniques.
 *
 * @module progressions
 *
 * @example
 * ```ts
 * import { calculateProgression, formatProgressionResult } from 'celestine';
 *
 * const birth = {
 *   year: 1990, month: 6, day: 15, hour: 14, minute: 30, second: 0,
 *   timezone: -5, latitude: 40.7128, longitude: -74.006
 * };
 *
 * const target = { year: 2024, month: 1, day: 1 };
 *
 * const result = calculateProgression(birth, target);
 * console.log(formatProgressionResult(result));
 * ```
 */

// =============================================================================
// TYPES
// =============================================================================

export type {
  AngleProgressionMethod,
  ProgressedAngle,
  ProgressedBody,
  ProgressionAspect,
  ProgressionBirthData,
  ProgressionConfig,
  ProgressionError,
  ProgressionResult,
  ProgressionSummary,
  ProgressionTargetDate,
  ProgressionType,
} from './types.js';

// =============================================================================
// CONSTANTS
// =============================================================================

export {
  // Astronomical constants
  DAYS_PER_YEAR,
  MOON_MEAN_DAILY_MOTION,
  SUN_MEAN_DAILY_MOTION,
  SYNODIC_MONTH_DAYS,
  TROPICAL_MONTH_DAYS,

  // Progression rates
  MINOR_PROGRESSION_RATE,
  PROGRESSION_RATES,
  SECONDARY_PROGRESSION_RATE,
  TERTIARY_PROGRESSION_RATE,

  // Orbs
  EXACT_THRESHOLD,
  PROGRESSION_ORBS,

  // Body lists
  DEFAULT_PROGRESSION_BODIES,
  RETROGRADE_CAPABLE_BODIES,

  // Aspect lists
  MAJOR_PROGRESSION_ASPECTS,

  // Default config
  DEFAULT_PROGRESSION_CONFIG,

  // Zodiac
  SIGN_NAMES,
} from './constants.js';

// =============================================================================
// CORE CALCULATIONS
// =============================================================================

// Date calculations
export {
  birthToJD,
  targetToJD,
  calculateAge,
  calculateAgeInDays,
  ageToTargetJD,
  getProgressedJD,
  calculateProgressedJD,
  getProgressionDates,
  validateProgressionDates,
} from './progression-date.js';

// Solar arc
export {
  calculateSolarArc,
  calculateSolarArcFromDates,
  estimateSolarArc,
  applySolarArc,
  applySolarArcToMany,
  getNatalSunLongitude,
  getProgressedSunLongitude,
  estimateAgeForSolarArc,
  estimateAgeForDirectedPosition,
  solarArcForAspect,
  formatSolarArc,
  formatSolarArcDMS,
} from './solar-arc.js';

// =============================================================================
// POSITION CALCULATIONS
// =============================================================================

// Progressed positions
export {
  getNatalPosition,
  getProgressedPosition,
  getProgressedPositions,
  getAllProgressedPositions,
  calculateProgressedPositions,
  getProgressedBodyFromDates,
  getBodiesWithSignChange,
  getRetrogradeBodies,
  getBodyWithLargestArc,
  sortByLongitude,
  groupBySign,
  type ProgressedBodyName,
} from './progressed-positions.js';

// Progressed angles
export {
  getNatalAngles,
  getNatalAnglesFromBirth,
  getProgressedAngles,
  getProgressedAnglesSolarArc,
  getProgressedAnglesTimeBased,
  calculateProgressedAngles,
  getProgressedASC,
  getProgressedMC,
  hasASCChangedSign,
  hasMCChangedSign,
  estimateAgeForASCSign,
  estimateAgeForMCSign,
  formatProgressedAngles,
  type ProgressedAngles,
} from './progressed-angles.js';

// =============================================================================
// MOON SPECIALIZATIONS
// =============================================================================

export {
  getProgressedMoon,
  getProgressedMoonFromDates,
  getProgressedLunarPhase,
  calculateMoonSignTransits,
  getAgeAtNextMoonSignChange,
  getMoonZodiacCycles,
  getMoonReturnAges,
  getProgressedMoonReport,
  formatMoonTransit,
  formatProgressedMoonReport,
  type ProgressedLunarPhase,
  type MoonSignTransit,
  type ProgressedMoonReport,
} from './progressed-moon.js';

// =============================================================================
// ASPECT DETECTION
// =============================================================================

export {
  detectProgressedToNatalAspects,
  detectProgressedToProgressedAspects,
  detectProgressionAspects,
  calculateProgressionAspects,
  getAspectsToNatalBody,
  getAspectsFromProgressedBody,
  getStrongestAspect,
  getAspectsByType,
  sortByStrength,
  formatAspect,
  formatAspects,
  type AspectConfig,
  type AspectDetectionResult,
} from './progressed-aspects.js';

// =============================================================================
// HIGH-LEVEL API
// =============================================================================

export {
  calculateProgression,
  getMoonProgressionReport,
  getExactAspects,
  getSignChanges,
  formatProgressionResult,
} from './progression-summary.js';

