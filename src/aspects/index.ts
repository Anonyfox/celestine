/**
 * Aspects Module
 *
 * Angular relationships between celestial bodies used in astrological interpretation.
 *
 * @module aspects
 *
 * @remarks
 * This module provides comprehensive aspect calculation capabilities:
 *
 * - **Aspect Detection**: Find aspects between any pair of bodies
 * - **Orb Configuration**: Customizable orbs for each aspect type
 * - **Strength Calculation**: Linear decay from exact to orb edge
 * - **Applying/Separating**: Determine if aspects are forming or waning
 * - **Out-of-Sign Detection**: Identify dissociate aspects
 *
 * @example
 * ```typescript
 * import { calculateAspects, AspectType } from 'celestine/aspects';
 *
 * const bodies = [
 *   { name: 'Sun', longitude: 280.37, longitudeSpeed: 1.02 },
 *   { name: 'Moon', longitude: 223.32, longitudeSpeed: 13.18 },
 *   { name: 'Mercury', longitude: 271.89, longitudeSpeed: 1.56 },
 * ];
 *
 * const result = calculateAspects(bodies);
 *
 * for (const aspect of result.aspects) {
 *   console.log(`${aspect.body1} ${aspect.symbol} ${aspect.body2} (${aspect.strength}%)`);
 * }
 * ```
 *
 * @see IMPL.md for detailed implementation specification
 */

// Angular separation utilities
export {
  anglesAreEqual,
  angularSeparation,
  getSignIndex,
  midpoint,
  normalizeAngle,
  signedAngle,
  signSeparation,
} from './angular-separation.js';
// Aspect detection
export {
  calculateAspects,
  detectAspect,
  filterAspectsByBody,
  filterAspectsByType,
  findAllAspects,
  formatAspect,
  getAspectSummary,
  getStrongestAspect,
  isOutOfSign,
} from './aspect-detection.js';
// Constants
export {
  ALL_ASPECTS,
  ASPECT_DEFINITIONS,
  ASPECT_SIGN_SEPARATIONS,
  DEFAULT_ORBS,
  KEPLER_ASPECTS,
  MAJOR_ASPECTS,
  MINOR_ASPECTS,
} from './constants.js';

// Orb handling
export {
  applyOutOfSignPenalty,
  calculateStrength,
  createAspectConfig,
  findAllMatchingAspects,
  findMatchingAspect,
  getOrb,
  isWithinOrb,
} from './orbs.js';
// Pattern detection
export {
  detectGrandCross,
  detectGrandTrine,
  detectKite,
  detectMysticRectangle,
  detectStellium,
  detectTSquare,
  detectYod,
  findPatterns,
  formatPattern,
  getPatternSummary,
} from './patterns.js';
// Types
export {
  type Aspect,
  type AspectBody,
  type AspectCalculationResult,
  type AspectConfig,
  type AspectDefinition,
  type AspectPattern,
  AspectType,
  PatternType,
} from './types.js';
