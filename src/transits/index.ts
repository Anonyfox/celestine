/**
 * Transits Module
 *
 * Calculate astrological transits - when current planetary positions
 * form aspects to natal chart positions.
 *
 * @module transits
 *
 * @remarks
 * Transits are the foundation of predictive astrology. This module provides:
 *
 * - **Transit Detection**: Find active transits at any moment
 * - **Phase Determination**: Applying, exact, or separating
 * - **Strength Calculation**: Linear decay from exact to orb edge
 * - **Orb Handling**: Configurable with extensions for luminaries/angles
 *
 * @example
 * ```typescript
 * import { calculateTransits, type NatalPoint } from 'celestine/transits';
 *
 * const natalPoints: NatalPoint[] = [
 *   { name: 'Sun', longitude: 280.37, type: 'luminary' },
 *   { name: 'Moon', longitude: 223.32, type: 'luminary' },
 *   { name: 'ASC', longitude: 101.65, type: 'angle' },
 * ];
 *
 * // Calculate transits for today
 * const jd = 2460665.0; // December 2025
 * const result = calculateTransits(natalPoints, jd);
 *
 * for (const transit of result.transits) {
 *   console.log(`${transit.transitingBody} ${transit.symbol} ${transit.natalPoint}`);
 *   console.log(`  Strength: ${transit.strength.toFixed(0)}%, ${transit.phase}`);
 * }
 * ```
 *
 * @see IMPL.md for detailed implementation specification
 */

// =============================================================================
// Types
// =============================================================================

export type {
  HouseIngress,
  NatalPoint,
  NatalPointType,
  RetrogradePeriod,
  StationPoint,
  Transit,
  TransitConfig,
  TransitDate,
  TransitingBody,
  TransitPhase,
  TransitResult,
  TransitSearchParams,
  TransitSearchResult,
  TransitSummary,
  TransitTiming,
} from './types.js';

export { TransitCalculationError, TransitSearchError } from './types.js';

// =============================================================================
// Constants
// =============================================================================

export {
  ALL_TRANSIT_ASPECTS,
  ANGLE_ORB_EXTENSION,
  ASPECT_ANGLES,
  ASPECT_SYMBOLS,
  AVERAGE_DAILY_MOTION,
  BODY_NAMES,
  DEFAULT_EXACT_THRESHOLD,
  DEFAULT_TRANSIT_CONFIG,
  DEFAULT_TRANSIT_ORBS,
  DEFAULT_TRANSITING_BODIES,
  EXACT_TIME_TOLERANCE,
  FAST_PLANET_SEARCH_STEP,
  FAST_PLANETS,
  LUMINARIES,
  LUMINARY_ORB_EXTENSION,
  MAJOR_TRANSIT_ASPECTS,
  MAX_BINARY_SEARCH_ITERATIONS,
  MOON_SEARCH_STEP,
  OUTER_PLANET_ORB_EXTENSION,
  RETROGRADE_PLANETS,
  SLOW_PLANET_SEARCH_STEP,
  SLOW_PLANETS,
  STATIONARY_SPEED_THRESHOLD,
  TRANSITING_BODIES,
  TYPICAL_TRANSIT_DURATION_DAYS,
} from './constants.js';

// =============================================================================
// Transit Detection (Core API)
// =============================================================================

export {
  // Angular calculations
  angularSeparation,
  calculateTransitStrength,
  // Main calculation functions
  calculateTransits,
  detectAllTransits,
  detectTransit,
  // Filtering and querying
  filterByAspectType,
  filterByPhase,
  findAllTransits,
  // Formatting
  formatTransit,
  getApplyingTransits,
  // Orb calculation
  getEffectiveOrb,
  getSeparatingTransits,
  getSignIndex,
  getStrongestTransit,
  // Position helpers
  getTransitingBodies,
  // Phase detection
  getTransitPhase,
  getTransitsFromBody,
  getTransitsToPoint,
  // Grouping and summarizing
  groupByNatalPoint,
  groupByTransitingBody,
  // Out-of-sign detection
  isOutOfSign,
  // Date conversion
  jdToTransitDate,
  normalizeAngle,
  signedAngularDifference,
  summarizeTransits,
} from './transit-detection.js';

// =============================================================================
// Transit Timing (Exact Time Finding)
// =============================================================================

export {
  // Low-level calculations
  calculateSignedDeviation,
  // Estimation utilities
  estimateNextAspect,
  findAllExactTimes,
  // Core timing functions
  findExactTransitTime,
  // Orb boundary detection
  findOrbEntry,
  findOrbExit,
  findTransitTiming,
  // Formatting
  formatTransitTiming,
  getSearchStepForBody,
  hasCrossingInWindow,
} from './transit-timing.js';

// =============================================================================
// House Ingress Detection
// =============================================================================

export {
  // Timeline calculation
  calculateAllIngresses,
  calculateAllIngressesForBodies,
  checkIngressInWindow,
  // Core detection
  detectHouseIngress,
  findIngressToHouse,
  // Finding ingresses
  findNextIngress,
  // Grouping and formatting
  formatHouseIngress,
  // Utilities
  getBodyHouse,
  getBodyHouses,
  groupIngressesByBody,
  groupIngressesByHouse,
} from './house-ingress.js';

// =============================================================================
// Retrograde Transit Handling
// =============================================================================

export {
  canRetrograde,
  // Motion classification
  classifyMotion,
  estimatePassCount,
  findNextStation,
  // Retrograde periods
  findRetrogradePeriods,
  // Station detection
  findStationPoints,
  // Multiple transit passes
  findTransitPasses,
  // Formatting
  formatRetrogradePeriod,
  formatStationPoint,
  getAllRetrogradePeriods,
  getCurrentRetrogradePeriod,
  getRetrogradeShadow,
  isRetrograde,
  // Types
  type MotionState,
  type TransitPass,
} from './retrograde-transits.js';

// =============================================================================
// Transit Search (Date Range Analysis)
// =============================================================================

export {
  filterByBodySpeed,
  filterByDuration,
  // Filtering
  filterByStrength,
  filterMultiplePasses,
  filterRetrogrades,
  formatTransitTimingDetail,
  generateSearchSummary,
  getActiveTransits,
  getMostSignificantTransits,
  // Utilities
  getNextTransit,
  getTransitsForMonth,
  getTransitsForYear,
  // Convenience
  getUpcomingTransits,
  groupTransitsByAspect,
  groupTransitsByBody,
  // Grouping
  groupTransitsByMonth,
  groupTransitsByNatalPoint,
  // Main search
  searchTransits,
  searchTransitsForBody,
  searchTransitsToPoint,
} from './transit-search.js';

// =============================================================================
// Reference Data (for validation)
// =============================================================================

export {
  ASTRONOMICAL_EVENTS,
  HISTORICAL_TRANSIT_EVENTS,
  REFERENCE_RETROGRADE_PERIODS,
  REFERENCE_STATION_POINTS,
  type ReferenceRetrogradePeriod,
  type ReferenceStationPoint,
  type ReferenceTransitEvent,
  TYPICAL_RETROGRADE_DURATIONS,
} from './reference-data/index.js';
