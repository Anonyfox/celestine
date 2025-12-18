/**
 * Houses Module
 *
 * Calculate astrological house cusps using various house systems.
 * Supports all major traditional and modern house systems.
 *
 * @module houses
 */

// Main API
export {
  calculateAnglesOnly,
  calculateHouses,
  calculateMultipleSystems,
  getHouseSystemName,
  getSupportedHouseSystems,
  systemRequiresLatitude,
  systemWorksAtPolarCircle,
} from './houses.js';

// Angles calculations
export { calculateAngles, calculateAscendant, calculateMidheaven } from './angles.js';

// Individual house systems (for advanced use)
export { campanusHouses } from './house-systems/campanus.js';
export { equalHouses } from './house-systems/equal.js';
export { kochHouses } from './house-systems/koch.js';
export { placidusHouses } from './house-systems/placidus.js';
export { porphyryHouses } from './house-systems/porphyry.js';
export { regiomontanusHouses } from './house-systems/regiomontanus.js';
export { wholeSignHouses } from './house-systems/whole-sign.js';

// Utilities
export {
  angularDistance,
  eclipticToZodiac,
  formatZodiacPosition,
  getHousePosition,
  getSignName,
  isOnAngle,
  normalizeAngle,
  oppositePoint,
  signedAngularSeparation,
} from './house-utils.js';

// Validation
export {
  getFallbackHouseSystem,
  getAvailableHouseSystems,
  isHouseSystemAvailable,
  normalizeLatitude,
  normalizeLongitude,
  validateLocation,
} from './validation.js';

// Obliquity
export { meanObliquity, obliquityOfEcliptic } from './obliquity.js';

// Types
export type {
  Angles,
  GeographicLocation,
  HouseCusps,
  HouseData,
  HouseSystem,
  LocationValidationResult,
} from './types.js';

// Constants
export {
  CONVERGENCE_TOLERANCE,
  EPSILON,
  HOUSE_SYSTEM_NAMES,
  MAX_ABSOLUTE_LATITUDE,
  MAX_ABSOLUTE_LONGITUDE,
  MAX_ITERATIONS,
  MAX_LATITUDE_PLACIDUS,
  OBLIQUITY_COEFFICIENTS,
} from './constants.js';

