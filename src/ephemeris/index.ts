/**
 * Ephemeris Module
 *
 * Calculate positions of celestial bodies (Sun, Moon, planets) at any moment.
 *
 * @module ephemeris
 *
 * @remarks
 * This module provides the core planetary position calculations needed for
 * birth chart generation and transit calculations.
 *
 * **Accuracy**: ±1 arcminute for years 1800-2200 (simplified formulas).
 *
 * **Algorithm source**: Jean Meeus, "Astronomical Algorithms" (2nd Ed., 1998)
 *
 * @example
 * ```typescript
 * import { getSunPosition, Planet } from 'celestine/ephemeris';
 *
 * // Get Sun position at J2000.0 epoch
 * const jd = 2451545.0; // January 1, 2000, 12:00 TT
 * const sun = getSunPosition(jd);
 *
 * console.log(sun.longitude);    // ~280.46° (Capricorn)
 * console.log(sun.distance);     // ~0.983 AU
 * console.log(sun.isRetrograde); // false (Sun never retrogrades)
 * ```
 */

// =============================================================================
// Types
// =============================================================================

export type {
  EphemerisOptions,
  EphemerisValidationResult,
  OrbitalElements,
  PlanetPosition,
  PlanetPositions,
  RectangularCoordinates,
  SphericalCoordinates,
} from './types.js';

export { Planet } from './types.js';

// =============================================================================
// Constants
// =============================================================================

export {
  ARCMINUTES_PER_DEGREE,
  ARCSEC_TO_RAD,
  ARCSECONDS_PER_ARCMINUTE,
  ARCSECONDS_PER_DEGREE,
  // Distance constants
  AU_IN_KM,
  DAYS_PER_JULIAN_CENTURY,
  DAYS_PER_JULIAN_MILLENNIUM,
  DEG_TO_RAD,
  // Angular constants
  DEGREES_PER_CIRCLE,
  // Time constants
  J2000_EPOCH,
  LIGHT_TIME_PER_AU_DAYS,
  MAX_JULIAN_DATE,
  // Validation
  MIN_JULIAN_DATE,
  OBLIQUITY_COEFFICIENTS,
  // Obliquity
  OBLIQUITY_J2000_DEG,
  RAD_TO_DEG,
  SPEED_OF_LIGHT_KM_S,
} from './constants.js';

// =============================================================================
// Sun
// =============================================================================

// Advanced: individual Sun calculation functions
export {
  earthEccentricity,
  getSunPosition,
  nutationInLongitude,
  sunApparentLongitude,
  sunDistance,
  sunEquationOfCenter,
  sunMeanAnomaly,
  sunMeanLongitude,
  sunTrueLongitude,
} from './sun.js';

// =============================================================================
// Moon
// =============================================================================

export {
  getMoonPosition,
  moonArgumentOfLatitude,
  moonDistance,
  moonDistanceAU,
  moonLatitude,
  moonLongitude,
  moonMeanAnomaly,
  moonMeanAscendingNode,
  moonMeanElongation,
  moonMeanLongitude,
  moonMeanPerigee,
  sunMeanAnomalyForMoon,
} from './moon.js';

// =============================================================================
// Planets
// =============================================================================

export {
  getJupiterPosition,
  JUPITER_ORBITAL_ELEMENTS,
  jupiterHeliocentricDistance,
  jupiterHeliocentricLatitude,
  jupiterHeliocentricLongitude,
} from './planets/jupiter.js';
export {
  getMarsPosition,
  MARS_ORBITAL_ELEMENTS,
  marsHeliocentricDistance,
  marsHeliocentricLatitude,
  marsHeliocentricLongitude,
} from './planets/mars.js';
export {
  getMercuryPosition,
  MERCURY_ORBITAL_ELEMENTS,
  mercuryHeliocentricDistance,
  mercuryHeliocentricLatitude,
  mercuryHeliocentricLongitude,
} from './planets/mercury.js';
export {
  getNeptunePosition,
  NEPTUNE_ORBITAL_ELEMENTS,
  neptuneHeliocentricDistance,
  neptuneHeliocentricLatitude,
  neptuneHeliocentricLongitude,
} from './planets/neptune.js';
export {
  getPlutoPosition,
  PLUTO_ORBITAL_ELEMENTS,
  plutoHeliocentricDistance,
  plutoHeliocentricLatitude,
  plutoHeliocentricLongitude,
} from './planets/pluto.js';
export {
  getSaturnPosition,
  SATURN_ORBITAL_ELEMENTS,
  saturnHeliocentricDistance,
  saturnHeliocentricLatitude,
  saturnHeliocentricLongitude,
} from './planets/saturn.js';
export {
  getUranusPosition,
  URANUS_ORBITAL_ELEMENTS,
  uranusHeliocentricDistance,
  uranusHeliocentricLatitude,
  uranusHeliocentricLongitude,
} from './planets/uranus.js';
export {
  getVenusPosition,
  VENUS_ORBITAL_ELEMENTS,
  venusHeliocentricDistance,
  venusHeliocentricLatitude,
  venusHeliocentricLongitude,
} from './planets/venus.js';

// =============================================================================
// Lunar Nodes
// =============================================================================

export type { LunarNodePosition } from './nodes.js';

export {
  getMeanNode,
  getMeanNodeLongitude,
  getNorthNode,
  getSouthNodeLongitude,
  getTrueNode,
  getTrueNodeLongitude,
  LUNAR_NODE_CHARACTERISTICS,
} from './nodes.js';

// =============================================================================
// Lilith (Black Moon)
// =============================================================================

export type { LilithPosition } from './lilith.js';

export {
  getLilith,
  getMeanLilith,
  getMeanLilithLongitude,
  getTrueLilith,
  getTrueLilithLongitude,
  LILITH_CHARACTERISTICS,
} from './lilith.js';

// =============================================================================
// Arabic Parts / Lots
// =============================================================================

export type { PartOfFortuneOptions, PartOfFortuneResult } from './lots.js';

export {
  calculatePartOfFortune,
  calculatePartOfFortuneDayFormula,
  calculatePartOfSpirit,
  getPartOfFortune,
  getPartOfSpirit,
  LOTS_CHARACTERISTICS,
} from './lots.js';

// =============================================================================
// Chiron (Centaur)
// =============================================================================

export {
  CHIRON_ORBITAL_ELEMENTS,
  chironHeliocentricDistance,
  chironHeliocentricLatitude,
  chironHeliocentricLongitude,
  getChironPosition,
} from './chiron.js';

// =============================================================================
// Utilities
// =============================================================================

export {
  eccentricToTrue,
  meanToTrue,
  radiusVector,
  solveKepler,
} from './utils/kepler.js';
