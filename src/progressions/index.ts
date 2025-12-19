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
  ProgressedAngles,
  ProgressedAspect,
  ProgressedAspectPhase,
  ProgressedChart,
  ProgressedDate,
  ProgressedMoonInfo,
  ProgressedPlanet,
  ProgressedPosition,
  ProgressedRetrogradeChange,
  ProgressedSignChange,
  ProgressionBirthData,
  ProgressionConfig,
  ProgressionSummary,
  ProgressionTargetDate,
  ProgressionType,
} from './types.js';

export { ProgressionCalculationError, ProgressionValidationError } from './types.js';

// =============================================================================
// CONSTANTS
// =============================================================================

export {
  // Astronomical constants
  DAYS_PER_YEAR,
  // Body lists
  DEFAULT_PROGRESSION_BODIES,
  // Default config
  DEFAULT_PROGRESSION_CONFIG,
  // Orbs
  EXACT_THRESHOLD,
  // Aspect lists
  MAJOR_PROGRESSION_ASPECTS,
  // Progression rates
  MINOR_PROGRESSION_RATE,
  MOON_MEAN_DAILY_MOTION,
  PROGRESSION_ORBS,
  PROGRESSION_RATES,
  RETROGRADE_CAPABLE_BODIES,
  SECONDARY_PROGRESSION_RATE,
  // Zodiac
  SIGN_NAMES,
  SUN_MEAN_DAILY_MOTION,
  SYNODIC_MONTH_DAYS,
  TERTIARY_PROGRESSION_RATE,
  TROPICAL_MONTH_DAYS,
} from './constants.js';

// =============================================================================
// CORE CALCULATIONS
// =============================================================================

// Date calculations
export {
  ageToTargetJD,
  birthToJD,
  calculateAge,
  calculateAgeInDays,
  calculateProgressedJD,
  getProgressedJD,
  getProgressionDates,
  targetToJD,
  validateProgressionDates,
} from './progression-date.js';

// Solar arc
export {
  applySolarArc,
  applySolarArcToMany,
  calculateSolarArc,
  calculateSolarArcFromDates,
  estimateAgeForDirectedPosition,
  estimateAgeForSolarArc,
  estimateSolarArc,
  formatSolarArc,
  formatSolarArcDMS,
  getNatalSunLongitude,
  getProgressedSunLongitude,
  solarArcForAspect,
} from './solar-arc.js';

// =============================================================================
// POSITION CALCULATIONS
// =============================================================================

// Progressed angles
export {
  calculateProgressedAngles,
  estimateAgeForASCSign,
  estimateAgeForMCSign,
  formatProgressedAngles,
  getNatalAngles,
  getNatalAnglesFromBirth,
  getProgressedAngles,
  getProgressedAnglesSolarArc,
  getProgressedAnglesTimeBased,
  getProgressedASC,
  getProgressedMC,
  hasASCChangedSign,
  hasMCChangedSign,
} from './progressed-angles.js';
// Progressed positions
export {
  calculateProgressedPositions,
  getAllProgressedPositions,
  getBodiesWithSignChange,
  getBodyWithLargestArc,
  getNatalPosition,
  getProgressedBodyFromDates,
  getProgressedPosition,
  getProgressedPositions,
  getRetrogradeBodies,
  groupBySign,
  type ProgressedBodyName,
  sortByLongitude,
} from './progressed-positions.js';

// =============================================================================
// MOON SPECIALIZATIONS
// =============================================================================

export {
  calculateMoonSignTransits,
  formatMoonTransit,
  formatProgressedMoonReport,
  getAgeAtNextMoonSignChange,
  getMoonReturnAges,
  getMoonZodiacCycles,
  getProgressedLunarPhase,
  getProgressedMoon,
  getProgressedMoonFromDates,
  getProgressedMoonReport,
  type MoonSignTransit,
  type ProgressedLunarPhase,
  type ProgressedMoonReport,
} from './progressed-moon.js';

// =============================================================================
// ASPECT DETECTION
// =============================================================================

export {
  type AspectConfig,
  type AspectDetectionResult,
  calculateProgressedAspects,
  detectProgressedAspects,
  detectProgressedToNatalAspects,
  detectProgressedToProgressedAspects,
  formatAspect,
  formatAspects,
  getAspectsByType,
  getAspectsFromProgressedBody,
  getAspectsToNatalBody,
  getStrongestAspect,
  sortByStrength,
} from './progressed-aspects.js';

// =============================================================================
// HIGH-LEVEL API
// =============================================================================

export {
  calculateProgression,
  formatProgressedChart,
  getExactAspects,
  getMoonProgressionReport,
  getSignChanges,
} from './progression-summary.js';
