/**
 * Chart Module Type Definitions
 *
 * All TypeScript interfaces and types for the birth chart module.
 *
 * @module chart/types
 */

import type { Aspect, AspectPattern, AspectType } from '../aspects/types.js';
import type { CelestialBody } from '../ephemeris/positions.js';
import type { HouseSystem } from '../houses/types.js';
import type { DignityState, Sign } from '../zodiac/types.js';

// =============================================================================
// INPUT TYPES
// =============================================================================

/**
 * Birth data required to calculate a chart.
 *
 * @remarks
 * All times should be in local time; timezone offset handles conversion to UTC.
 */
export interface BirthData {
  /** Birth year (Gregorian calendar) */
  year: number;

  /** Birth month (1-12) */
  month: number;

  /** Birth day (1-31) */
  day: number;

  /** Birth hour in local time (0-23) */
  hour: number;

  /** Birth minute (0-59) */
  minute: number;

  /** Birth second (0-59), defaults to 0 */
  second?: number;

  /**
   * Timezone offset from UTC in hours.
   * Positive = east of Greenwich, negative = west.
   * Examples: -5 (EST), +1 (CET), +5.5 (IST)
   */
  timezone: number;

  /** Geographic latitude (-90 to +90, positive = north) */
  latitude: number;

  /** Geographic longitude (-180 to +180, positive = east) */
  longitude: number;
}

/**
 * Optional configuration for chart calculation.
 */
export interface ChartOptions {
  /** House system to use (default: 'placidus') */
  houseSystem?: HouseSystem;

  /** Include major asteroids: Ceres, Pallas, Juno, Vesta (default: true) */
  includeAsteroids?: boolean;

  /** Include Chiron (default: true) */
  includeChiron?: boolean;

  /**
   * Lilith calculation method.
   * - 'mean': Mean Black Moon Lilith (smooth motion)
   * - 'true': True/Oscillating Lilith (includes perturbations)
   * - 'both': Include both
   * - false: Exclude Lilith
   * Default: 'mean'
   */
  includeLilith?: 'mean' | 'true' | 'both' | false;

  /**
   * Lunar node calculation method.
   * - 'mean': Mean Node (smooth motion)
   * - 'true': True Node (includes oscillations)
   * - 'both': Include both
   * - false: Don't include nodes
   * Default: 'true'
   */
  includeNodes?: 'mean' | 'true' | 'both' | false;

  /** Include Part of Fortune and Part of Spirit (default: true) */
  includeLots?: boolean;

  /** Aspect types to calculate (default: major aspects) */
  aspectTypes?: AspectType[];

  /** Custom orbs per aspect type */
  aspectOrbs?: Partial<Record<AspectType, number>>;

  /** Detect aspect patterns like T-Square, Grand Trine (default: true) */
  includePatterns?: boolean;

  /** Minimum aspect strength to include (0-100, default: 0) */
  minimumAspectStrength?: number;
}

// =============================================================================
// CALCULATED DATA TYPES
// =============================================================================

/**
 * Intermediate calculated values used during chart generation.
 */
export interface CalculatedData {
  /** Julian Date of birth moment (UT) */
  julianDate: number;

  /** Julian Centuries from J2000.0 */
  julianCenturies: number;

  /** Local Sidereal Time in degrees (0-360) */
  localSiderealTime: number;

  /** Greenwich Mean Sidereal Time in degrees */
  greenwichSiderealTime: number;

  /** Obliquity of the ecliptic in degrees */
  obliquity: number;

  /** Birth date/time converted to UTC */
  utcDateTime: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
  };

  /** Whether Sun is above the horizon (for day/night chart) */
  isDaytime: boolean;
}

// =============================================================================
// PLANET TYPES
// =============================================================================

/**
 * Complete position and analysis for a celestial body.
 */
export interface ChartPlanet {
  /** Display name (e.g., "Sun", "Moon", "Mercury") */
  name: string;

  /** Internal body identifier */
  body: CelestialBody;

  // --- Position ---

  /** Ecliptic longitude (0-360°) */
  longitude: number;

  /** Ecliptic latitude (-90 to +90°) */
  latitude: number;

  /** Distance from Earth (AU for planets, Earth radii for Moon) */
  distance: number;

  /** Daily motion in longitude (degrees/day) */
  longitudeSpeed: number;

  /** True if currently in retrograde motion */
  isRetrograde: boolean;

  // --- Zodiac placement ---

  /** Zodiac sign containing this body */
  sign: Sign;

  /** Sign name as string */
  signName: string;

  /** Degree within sign (0-29) */
  degree: number;

  /** Arc minute within degree (0-59) */
  minute: number;

  /** Arc second within minute (0-59) */
  second: number;

  /** Formatted position string (e.g., "15°24'30\" Aries") */
  formatted: string;

  // --- House placement ---

  /** House number containing this body (1-12) */
  house: number;

  // --- Dignity ---

  /** Essential dignity information */
  dignity: {
    /** Dignity state (Domicile, Exaltation, etc.) */
    state: DignityState;

    /** Numerical strength (-5 to +5) */
    strength: number;

    /** Human-readable description */
    description: string;
  };
}

/**
 * Lunar node position (North or South Node).
 */
export interface ChartNode {
  /** "North Node" or "South Node" */
  name: string;

  /** Calculation type ("Mean" or "True") */
  type: 'Mean' | 'True';

  /** Ecliptic longitude (0-360°) */
  longitude: number;

  /** Zodiac sign */
  sign: Sign;

  /** Sign name */
  signName: string;

  /** Degree within sign */
  degree: number;

  /** Minute within degree */
  minute: number;

  /** Formatted position */
  formatted: string;

  /** House placement */
  house: number;
}

/**
 * Lilith (Black Moon) position.
 */
export interface ChartLilith {
  /** "Mean Lilith" or "True Lilith" */
  name: string;

  /** Calculation type */
  type: 'Mean' | 'True';

  /** Ecliptic longitude */
  longitude: number;

  /** Zodiac sign */
  sign: Sign;

  /** Sign name */
  signName: string;

  /** Degree within sign */
  degree: number;

  /** Minute within degree */
  minute: number;

  /** Formatted position */
  formatted: string;

  /** House placement */
  house: number;
}

/**
 * Arabic Part/Lot position (e.g., Part of Fortune).
 */
export interface ChartLot {
  /** Lot name (e.g., "Part of Fortune") */
  name: string;

  /** Formula used (e.g., "ASC + Moon - Sun") */
  formula: string;

  /** Ecliptic longitude */
  longitude: number;

  /** Zodiac sign */
  sign: Sign;

  /** Sign name */
  signName: string;

  /** Degree within sign */
  degree: number;

  /** Minute within degree */
  minute: number;

  /** Formatted position */
  formatted: string;

  /** House placement */
  house: number;
}

// =============================================================================
// ANGLE & HOUSE TYPES
// =============================================================================

/**
 * A chart angle (ASC, MC, DSC, IC).
 */
export interface ChartAngle {
  /** Angle name */
  name: 'Ascendant' | 'Midheaven' | 'Descendant' | 'Imum Coeli';

  /** Abbreviation */
  abbrev: 'ASC' | 'MC' | 'DSC' | 'IC';

  /** Ecliptic longitude */
  longitude: number;

  /** Zodiac sign */
  sign: Sign;

  /** Sign name */
  signName: string;

  /** Degree within sign */
  degree: number;

  /** Minute within degree */
  minute: number;

  /** Second within minute */
  second: number;

  /** Formatted position */
  formatted: string;
}

/**
 * All four chart angles.
 */
export interface ChartAngles {
  ascendant: ChartAngle;
  midheaven: ChartAngle;
  descendant: ChartAngle;
  imumCoeli: ChartAngle;
}

/**
 * A single house cusp.
 */
export interface ChartHouseCusp {
  /** House number (1-12) */
  house: number;

  /** Ecliptic longitude of cusp */
  longitude: number;

  /** Zodiac sign on cusp */
  sign: Sign;

  /** Sign name */
  signName: string;

  /** Degree within sign */
  degree: number;

  /** Minute within degree */
  minute: number;

  /** Formatted position */
  formatted: string;

  /** Size of this house in degrees */
  size: number;
}

/**
 * Complete house data.
 */
export interface ChartHouses {
  /** House system used */
  system: HouseSystem;

  /** Human-readable system name */
  systemName: string;

  /** Array of 12 house cusps */
  cusps: ChartHouseCusp[];
}

// =============================================================================
// ASPECT TYPES
// =============================================================================

/**
 * Complete aspect analysis for the chart.
 */
export interface ChartAspects {
  /** All detected aspects */
  all: Aspect[];

  /** Aspects grouped by body */
  byBody: Record<string, Aspect[]>;

  /** Aspects grouped by type */
  byType: Record<AspectType, Aspect[]>;

  /** Total aspect count */
  count: number;

  /** Summary counts by aspect type */
  summary: {
    conjunctions: number;
    sextiles: number;
    squares: number;
    trines: number;
    oppositions: number;
    minor: number;
  };
}

// =============================================================================
// SUMMARY TYPES
// =============================================================================

/**
 * Element distribution in the chart.
 */
export interface ElementDistribution {
  /** Planets in fire signs */
  fire: string[];

  /** Planets in earth signs */
  earth: string[];

  /** Planets in air signs */
  air: string[];

  /** Planets in water signs */
  water: string[];
}

/**
 * Modality distribution in the chart.
 */
export interface ModalityDistribution {
  /** Planets in cardinal signs */
  cardinal: string[];

  /** Planets in fixed signs */
  fixed: string[];

  /** Planets in mutable signs */
  mutable: string[];
}

/**
 * Hemisphere distribution (by planet count).
 */
export interface HemisphereDistribution {
  /** Planets in houses 1-6 (below horizon) */
  north: number;

  /** Planets in houses 7-12 (above horizon) */
  south: number;

  /** Planets in houses 10-3 (eastern/rising) */
  east: number;

  /** Planets in houses 4-9 (western/setting) */
  west: number;
}

/**
 * Quadrant distribution.
 */
export interface QuadrantDistribution {
  /** Houses 1-3: Self, identity */
  first: string[];

  /** Houses 4-6: Personal, private */
  second: string[];

  /** Houses 7-9: Others, relationships */
  third: string[];

  /** Houses 10-12: Public, career */
  fourth: string[];
}

/**
 * Comprehensive chart summary.
 */
export interface ChartSummary {
  /** Element distribution */
  elements: ElementDistribution;

  /** Modality distribution */
  modalities: ModalityDistribution;

  /** Hemisphere emphasis */
  hemispheres: HemisphereDistribution;

  /** Quadrant distribution */
  quadrants: QuadrantDistribution;

  /** Polarity balance */
  polarity: {
    positive: number;
    negative: number;
  };

  /** List of retrograde planets */
  retrograde: string[];

  /** Detected aspect patterns */
  patterns: string[];

  /** Dignified planet groups */
  dignified: {
    domicile: string[];
    exalted: string[];
    detriment: string[];
    fall: string[];
    peregrine: string[];
  };
}

// =============================================================================
// MAIN CHART TYPE
// =============================================================================

/**
 * A complete astrological birth chart.
 */
export interface Chart {
  // --- Metadata ---

  /** Original birth data input */
  input: BirthData;

  /** Configuration options used */
  options: Required<ChartOptions>;

  /** Intermediate calculated values */
  calculated: CalculatedData;

  // --- Core positions ---

  /** All planetary positions (Sun, Moon, planets, asteroids, Chiron) */
  planets: ChartPlanet[];

  /** Lunar nodes */
  nodes: ChartNode[];

  /** Lilith positions */
  lilith: ChartLilith[];

  /** Arabic Parts/Lots */
  lots: ChartLot[];

  // --- Houses and angles ---

  /** Chart angles (ASC, MC, DSC, IC) */
  angles: ChartAngles;

  /** House cusps */
  houses: ChartHouses;

  // --- Analysis ---

  /** Aspect data */
  aspects: ChartAspects;

  /** Aspect patterns */
  patterns: AspectPattern[];

  /** Chart summary and statistics */
  summary: ChartSummary;
}

// =============================================================================
// ERROR TYPES
// =============================================================================

/**
 * Error thrown when birth data validation fails.
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public value: unknown,
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Error thrown when a calculation fails.
 */
export class CalculationError extends Error {
  constructor(
    message: string,
    public step: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'CalculationError';
  }
}

// =============================================================================
// VALIDATION TYPES
// =============================================================================

/**
 * Result of birth data validation.
 */
export interface ValidationResult {
  /** Whether data is valid */
  valid: boolean;

  /** List of validation errors */
  errors: ValidationErrorDetail[];

  /** List of warnings (non-fatal issues) */
  warnings: string[];

  /** Normalized birth data (if valid) */
  normalized?: BirthData;
}

/**
 * Details about a validation error.
 */
export interface ValidationErrorDetail {
  /** Field that failed validation */
  field: string;

  /** Error message */
  message: string;

  /** Invalid value */
  value: unknown;

  /** Suggested fix (if applicable) */
  suggestion?: string;
}
