/**
 * Celestine - Astronomical and Astrological Calculations
 *
 * A TypeScript library for calculating planetary positions, birth charts,
 * and other astrological data based on astronomical principles.
 *
 * @packageDocumentation
 *
 * @example
 * ```typescript
 * import { calculateChart, time, ephemeris, zodiac } from 'celestine';
 *
 * // Calculate a complete birth chart
 * const chart = calculateChart({
 *   year: 2000, month: 1, day: 1,
 *   hour: 12, minute: 0, second: 0,
 *   timezone: 0,
 *   latitude: 51.5074,  // London
 *   longitude: -0.1278
 * });
 *
 * console.log(`Rising sign: ${chart.angles.ascendant.signName}`);
 * console.log(`Sun: ${chart.planets[0].formatted}`);
 *
 * // Or use individual modules
 * const jd = time.toJulianDate({ year: 2000, month: 1, day: 1, hour: 12 });
 * const sun = ephemeris.getSunPosition(jd);
 * const position = zodiac.eclipticToZodiac(sun.longitude);
 * ```
 */

// =============================================================================
// Module Namespaces
// =============================================================================

/** Aspect calculations and pattern detection */
export * as aspects from './aspects/index.js';

/** Complete chart calculations */
export * as chart from './chart/index.js';

/** Planetary position calculations */
export * as ephemeris from './ephemeris/index.js';

/** House system calculations */
export * as houses from './houses/index.js';

/** Time and date conversions */
export * as time from './time/index.js';

/** Zodiac sign calculations and dignities */
export * as zodiac from './zodiac/index.js';

// =============================================================================
// Primary Chart API (most common entry point)
// =============================================================================

export {
  /** Calculate a complete birth chart */
  calculateChart,
  /** Calculate only house cusps */
  calculateHouseCusps,
  /** Calculate only planetary positions */
  calculatePlanets,
  /** Format a chart for display */
  formatChart,
  /** Get available house systems */
  getAvailableHouseSystems,
  /** Validate birth data */
  validateBirth,
} from './chart/index.js';

// =============================================================================
// Chart Types (for TypeScript users)
// =============================================================================

export type {
  /** Birth data input */
  BirthData,
  /** Complete chart output */
  Chart,
  /** Chart angles (ASC, MC, etc.) */
  ChartAngles,
  /** Aspect data */
  ChartAspects,
  /** House cusps */
  ChartHouses,
  /** Chart options */
  ChartOptions,
  /** Chart planet position */
  ChartPlanet,
  /** Chart summary/analysis */
  ChartSummary,
} from './chart/index.js';

// =============================================================================
// Time Utilities (commonly needed)
// =============================================================================

export type {
  /** Calendar date/time input */
  CalendarDateTime,
} from './time/index.js';
export {
  /** Calculate Delta T correction */
  deltaT,
  /** Convert Julian Date to calendar date */
  fromJulianDate,
  /** Calculate Greenwich Mean Sidereal Time */
  greenwichMeanSiderealTime,
  /** Calculate Local Sidereal Time */
  localSiderealTime,
  /** Convert calendar date to Julian Date */
  toJulianDate,
} from './time/index.js';

// =============================================================================
// Ephemeris (planetary positions)
// =============================================================================

export type {
  /** Planet position data */
  PlanetPosition,
} from './ephemeris/index.js';
export {
  /** Celestial body enumeration */
  CelestialBody,
  /** Get all planet positions at Julian Date */
  getAllPositions,
  /** Get Moon position at Julian Date */
  getMoonPosition,
  /** Get any planet position at Julian Date */
  getPosition,
  /** Get Sun position at Julian Date */
  getSunPosition,
} from './ephemeris/index.js';

// =============================================================================
// Houses (house systems)
// =============================================================================

export type {
  /** House cusp data */
  HouseData,
  /** House system type */
  HouseSystem,
} from './houses/index.js';
export {
  /** Calculate only ASC and MC */
  calculateAngles,
  /** Calculate house cusps for any system */
  calculateHouses,
  /** Calculate obliquity of ecliptic */
  obliquityOfEcliptic,
} from './houses/index.js';

// =============================================================================
// Zodiac (signs and dignities)
// =============================================================================

export type {
  /** Dignity information */
  Dignity,
  /** Zodiac position data */
  ZodiacPosition,
} from './zodiac/index.js';
export {
  /** Dignity state enumeration */
  DignityState,
  /** Element enumeration */
  Element,
  /** Convert ecliptic longitude to zodiac position */
  eclipticToZodiac,
  /** Format zodiac position for display */
  formatZodiacPosition,
  /** Get planetary dignity in a sign */
  getPlanetaryDignity,
  /** Get sign properties */
  getSignInfo,
  /** Modality enumeration */
  Modality,
  /** Planet enumeration (for dignities) */
  Planet,
  /** Zodiac sign enumeration */
  Sign,
} from './zodiac/index.js';

// =============================================================================
// Aspects (angular relationships)
// =============================================================================

export type {
  /** Aspect data */
  Aspect,
  /** Body for aspect calculation */
  AspectBody,
  /** Aspect pattern data */
  AspectPattern,
} from './aspects/index.js';
export {
  /** Aspect type enumeration */
  AspectType,
  /** Calculate all aspects between bodies */
  calculateAspects,
  /** Detect specific aspect between two bodies */
  detectAspect,
  /** Find chart patterns (T-Square, Grand Trine, etc.) */
  findPatterns,
  /** Pattern type enumeration */
  PatternType,
} from './aspects/index.js';

// =============================================================================
// Constants
// =============================================================================

export {
  /** All aspect definitions */
  ALL_ASPECTS,
  /** Default orb values */
  DEFAULT_ORBS,
  /** Major aspect definitions */
  MAJOR_ASPECTS,
} from './aspects/index.js';
export {
  /** J2000.0 epoch Julian Date */
  J2000_EPOCH,
} from './time/index.js';
