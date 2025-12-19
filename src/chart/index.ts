/**
 * Chart Module
 *
 * Calculate complete astrological birth charts by integrating all
 * Celestine modules: time, ephemeris, houses, zodiac, and aspects.
 *
 * @module chart
 *
 * @example
 * ```typescript
 * import { calculateChart } from 'celestine/chart';
 *
 * const chart = calculateChart({
 *   year: 2000, month: 1, day: 1,
 *   hour: 12, minute: 0, second: 0,
 *   timezone: 0,
 *   latitude: 51.5074,  // London
 *   longitude: -0.1278
 * });
 *
 * // Access planetary positions
 * for (const planet of chart.planets) {
 *   console.log(`${planet.name}: ${planet.formatted} in House ${planet.house}`);
 * }
 *
 * // Access chart angles
 * console.log(`Rising: ${chart.angles.ascendant.signName}`);
 * console.log(`Midheaven: ${chart.angles.midheaven.formatted}`);
 *
 * // Access aspects
 * for (const aspect of chart.aspects.all) {
 *   console.log(`${aspect.body1} ${aspect.symbol} ${aspect.body2}`);
 * }
 *
 * // Check summary
 * console.log('Fire planets:', chart.summary.elements.fire);
 * console.log('Retrograde:', chart.summary.retrograde);
 * ```
 */

// Aspect calculation
export {
  buildAspectBodies,
  calculateChartAspects,
  detectChartPatterns,
  getApplyingAspects,
  getAspectBetween,
  getAspectsForPlanet,
  getSeparatingAspects,
  getStrongestAspect,
} from './aspect-calculation.js';
// Main API
export {
  calculateChart,
  calculateHouseCusps,
  calculatePlanets,
  formatChart,
  getAvailableHouseSystems,
  validateBirth,
} from './chart.js';
// Chart summary
export {
  calculateElementDistribution,
  calculateHemisphereDistribution,
  calculateModalityDistribution,
  calculatePolarityBalance,
  calculateQuadrantDistribution,
  categorizeByDignity,
  generateChartSummary,
  getChartEmphasis,
  getDominantElement,
  getDominantModality,
  getRetrogradePlanets,
} from './chart-summary.js';
// Constants
export {
  ALL_ASPECTS,
  BODY_NAMES,
  DEFAULT_HOUSE_SYSTEM,
  DEFAULT_OPTIONS,
  HOUSE_SYSTEM_NAMES,
  MAJOR_ASPECTS,
  MAX_YEAR,
  MIN_YEAR,
  PLANET_ORDER,
  RECOMMENDED_MAX_YEAR,
  RECOMMENDED_MIN_YEAR,
} from './constants.js';
// House calculation
export {
  calculateChartHouses,
  getAngleConjunction,
  getCuspLongitudes,
  getHouseNumber,
} from './house-calculation.js';
// Input validation
export { checkDayRollover, validateBirthData, validateChartOptions } from './input-validation.js';
// Planet positions
export {
  calculateLots,
  calculatePlanetPositions,
  getBodyName,
  getPlanetOrder,
  isRetrograde,
  isStationary,
} from './planet-positions.js';
// Time conversion
export { calculateIsDaytime, calculateTimeData, localToUTC } from './time-conversion.js';
// Types
export type {
  BirthData,
  CalculatedData,
  Chart,
  ChartAngle,
  ChartAngles,
  ChartAspects,
  ChartHouseCusp,
  ChartHouses,
  ChartLilith,
  ChartLot,
  ChartNode,
  ChartOptions,
  ChartPlanet,
  ChartSummary,
  ElementDistribution,
  HemisphereDistribution,
  ModalityDistribution,
  QuadrantDistribution,
  ValidationErrorDetail,
  ValidationResult,
} from './types.js';
export { CalculationError, ValidationError } from './types.js';
// Zodiac placement
export {
  buildChartLilith,
  buildChartLot,
  buildChartNode,
  buildChartPlanet,
  getElement,
  getHemisphere,
  getModality,
  getPolarity,
  getQuadrant,
  getSignForLongitude,
} from './zodiac-placement.js';
