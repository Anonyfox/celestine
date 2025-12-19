/**
 * Chart Module Constants
 *
 * Default values, limits, and configuration constants.
 *
 * @module chart/constants
 */

import { AspectType } from '../aspects/types.js';
import type { HouseSystem } from '../houses/types.js';
import type { ChartOptions } from './types.js';

// =============================================================================
// INPUT LIMITS
// =============================================================================

/**
 * Minimum supported year for chart calculations.
 * Limited by ephemeris accuracy and historical calendar changes.
 */
export const MIN_YEAR = -4000;

/**
 * Maximum supported year for chart calculations.
 * Limited by ephemeris extrapolation accuracy.
 */
export const MAX_YEAR = 4000;

/**
 * Recommended minimum year for accurate calculations.
 * Before this, ephemeris accuracy degrades.
 */
export const RECOMMENDED_MIN_YEAR = 1800;

/**
 * Recommended maximum year for accurate calculations.
 * After this, ephemeris is extrapolated.
 */
export const RECOMMENDED_MAX_YEAR = 2200;

/**
 * Minimum timezone offset (hours from UTC).
 */
export const MIN_TIMEZONE = -12;

/**
 * Maximum timezone offset (hours from UTC).
 * +14 exists (e.g., Line Islands, Kiribati).
 */
export const MAX_TIMEZONE = 14;

/**
 * Maximum latitude for Placidus/Koch house systems.
 * These systems fail mathematically beyond this.
 */
export const MAX_LATITUDE_PLACIDUS = 66.0;

/**
 * Maximum latitude for any house calculation.
 * At the poles, only Whole Sign works properly.
 */
export const MAX_LATITUDE_ANY = 89.9;

// =============================================================================
// DEFAULT OPTIONS
// =============================================================================

/**
 * Default house system.
 */
export const DEFAULT_HOUSE_SYSTEM: HouseSystem = 'placidus';

/**
 * Fallback house system when primary fails (e.g., at polar latitudes).
 */
export const FALLBACK_HOUSE_SYSTEM: HouseSystem = 'porphyry';

/**
 * Fallback for extreme polar latitudes (>89°).
 */
export const POLAR_FALLBACK_HOUSE_SYSTEM: HouseSystem = 'whole-sign';

/**
 * Major aspects (Ptolemaic).
 */
export const MAJOR_ASPECTS: AspectType[] = [
  AspectType.Conjunction,
  AspectType.Sextile,
  AspectType.Square,
  AspectType.Trine,
  AspectType.Opposition,
];

/**
 * All aspects including minor and Kepler aspects.
 */
export const ALL_ASPECTS: AspectType[] = [
  AspectType.Conjunction,
  AspectType.SemiSextile,
  AspectType.SemiSquare,
  AspectType.Sextile,
  AspectType.Quintile,
  AspectType.Square,
  AspectType.Trine,
  AspectType.Sesquiquadrate,
  AspectType.Biquintile,
  AspectType.Quincunx,
  AspectType.Opposition,
];

/**
 * Default chart calculation options.
 */
export const DEFAULT_OPTIONS: Required<ChartOptions> = {
  houseSystem: DEFAULT_HOUSE_SYSTEM,
  includeAsteroids: true,
  includeChiron: true,
  includeLilith: 'mean',
  includeNodes: 'true',
  includeLots: true,
  aspectTypes: MAJOR_ASPECTS,
  aspectOrbs: {},
  includePatterns: true,
  minimumAspectStrength: 0,
};

// =============================================================================
// CELESTIAL BODY NAMES
// =============================================================================

/**
 * Standard names for celestial bodies in the chart.
 */
export const BODY_NAMES = {
  sun: 'Sun',
  moon: 'Moon',
  mercury: 'Mercury',
  venus: 'Venus',
  mars: 'Mars',
  jupiter: 'Jupiter',
  saturn: 'Saturn',
  uranus: 'Uranus',
  neptune: 'Neptune',
  pluto: 'Pluto',
  chiron: 'Chiron',
  ceres: 'Ceres',
  pallas: 'Pallas',
  juno: 'Juno',
  vesta: 'Vesta',
  northNode: 'North Node',
  southNode: 'South Node',
  meanLilith: 'Mean Lilith',
  trueLilith: 'True Lilith',
  partOfFortune: 'Part of Fortune',
  partOfSpirit: 'Part of Spirit',
} as const;

/**
 * Order of planets in chart output (traditional order).
 */
export const PLANET_ORDER = [
  'Sun',
  'Moon',
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
  'Pluto',
  'Chiron',
  'Ceres',
  'Pallas',
  'Juno',
  'Vesta',
] as const;

// =============================================================================
// HOUSE SYSTEMS THAT FAIL AT HIGH LATITUDES
// =============================================================================

/**
 * House systems that use time-based division and fail at polar latitudes.
 */
export const LATITUDE_SENSITIVE_SYSTEMS: HouseSystem[] = ['placidus', 'koch'];

/**
 * House systems that work at any latitude.
 */
export const LATITUDE_SAFE_SYSTEMS: HouseSystem[] = [
  'equal',
  'whole-sign',
  'porphyry',
  'regiomontanus',
  'campanus',
];

// =============================================================================
// PRECISION CONSTANTS
// =============================================================================

/**
 * Precision for comparing longitudes (degrees).
 * 0.001° ≈ 3.6 arcseconds
 */
export const LONGITUDE_PRECISION = 0.001;

/**
 * Threshold for considering a planet stationary (degrees/day).
 * Below this speed, the planet is nearly stationary.
 */
export const STATIONARY_THRESHOLD = 0.01;

// =============================================================================
// VALIDATION MESSAGES
// =============================================================================

/**
 * Validation error messages.
 */
export const VALIDATION_MESSAGES = {
  invalidYear: (year: number) => `Year ${year} is outside valid range (${MIN_YEAR} to ${MAX_YEAR})`,
  invalidMonth: (month: number) => `Month ${month} is invalid (must be 1-12)`,
  invalidDay: (day: number, month: number, year: number) =>
    `Day ${day} is invalid for ${month}/${year}`,
  invalidHour: (hour: number) => `Hour ${hour} is invalid (must be 0-23)`,
  invalidMinute: (minute: number) => `Minute ${minute} is invalid (must be 0-59)`,
  invalidSecond: (second: number) => `Second ${second} is invalid (must be 0-59)`,
  invalidTimezone: (tz: number) =>
    `Timezone ${tz} is outside valid range (${MIN_TIMEZONE} to ${MAX_TIMEZONE})`,
  invalidLatitude: (lat: number) => `Latitude ${lat} is invalid (must be -90 to +90)`,
  invalidLongitude: (lon: number) => `Longitude ${lon} is invalid (must be -180 to +180)`,
  yearOutOfRecommended: (year: number) =>
    `Year ${year} is outside recommended range (${RECOMMENDED_MIN_YEAR}-${RECOMMENDED_MAX_YEAR}). ` +
    'Results may be less accurate.',
  latitudeTooHighForSystem: (lat: number, system: HouseSystem) =>
    `Latitude ${lat}° is too high for ${system} house system. ` +
    `Using ${FALLBACK_HOUSE_SYSTEM} instead.`,
} as const;

// =============================================================================
// HOUSE SYSTEM DISPLAY NAMES
// =============================================================================

/**
 * Human-readable names for house systems.
 */
export const HOUSE_SYSTEM_NAMES: Record<HouseSystem, string> = {
  placidus: 'Placidus',
  koch: 'Koch',
  equal: 'Equal',
  'whole-sign': 'Whole Sign',
  porphyry: 'Porphyry',
  regiomontanus: 'Regiomontanus',
  campanus: 'Campanus',
};

// =============================================================================
// ANGLE ABBREVIATIONS
// =============================================================================

/**
 * Full names and abbreviations for chart angles.
 */
export const ANGLE_INFO = {
  ascendant: { name: 'Ascendant', abbrev: 'ASC' },
  midheaven: { name: 'Midheaven', abbrev: 'MC' },
  descendant: { name: 'Descendant', abbrev: 'DSC' },
  imumCoeli: { name: 'Imum Coeli', abbrev: 'IC' },
} as const;
