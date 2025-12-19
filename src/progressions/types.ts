/**
 * Progressions Module - Type Definitions
 *
 * Core types for astrological progression calculations.
 *
 * @module progressions/types
 *
 * @remarks
 * Progressions are predictive techniques where time is symbolically compressed.
 * The most common is secondary progressions where 1 day = 1 year.
 *
 * @see IMPL.md for full implementation specification
 * @see KNOWLEDGE.md Section 13 for birth chart foundations
 */

import type { AspectType } from '../aspects/types.js';
import type { CelestialBody } from '../ephemeris/positions.js';

// =============================================================================
// PROGRESSION TYPE DEFINITIONS
// =============================================================================

/**
 * Progression system type.
 *
 * @remarks
 * - 'secondary': Day-for-a-year (most common, 1 day = 1 year)
 * - 'solar-arc': All points move at Sun's rate
 * - 'minor': Month-for-a-year (1 tropical month = 1 year)
 * - 'tertiary': Day-for-a-month (1 day = 1 lunar month)
 */
export type ProgressionType = 'secondary' | 'solar-arc' | 'minor' | 'tertiary';

/**
 * Method for calculating progressed angles (ASC, MC).
 *
 * @remarks
 * - 'solar-arc': ASC/MC advance by the solar arc (simpler, more common)
 * - 'true-angles': Astronomically recalculate for progressed time
 */
export type AngleProgressionMethod = 'solar-arc' | 'true-angles';

/**
 * Phase of a progressed aspect.
 */
export type ProgressedAspectPhase = 'applying' | 'exact' | 'separating';

// =============================================================================
// POSITION TYPES
// =============================================================================

/**
 * A progressed position (for angles, lots, etc.)
 */
export interface ProgressedPosition {
  /** Progressed longitude (0-360°) */
  longitude: number;

  /** Natal longitude for reference */
  natalLongitude: number;

  /** Arc traveled since birth (degrees) */
  arcFromNatal: number;

  /** Zodiac sign index (0-11, 0=Aries) */
  signIndex: number;

  /** Zodiac sign name */
  signName: string;

  /** Degree within sign (0-29) */
  degree: number;

  /** Minute within degree (0-59) */
  minute: number;

  /** Second within minute (0-59) */
  second: number;

  /** Formatted position string (e.g., "15°32' Leo") */
  formatted: string;

  /** Has the sign changed from natal? */
  hasChangedSign: boolean;
}

/**
 * A progressed planet position with full details.
 */
export interface ProgressedPlanet extends ProgressedPosition {
  /** Planet/body name */
  name: string;

  /** Celestial body enum value */
  body: CelestialBody;

  /** Direction of progressed planet */
  isRetrograde: boolean;

  /** Progressed daily motion (degrees/day) */
  longitudeSpeed: number;

  /** Did retrograde status change from natal? */
  retrogradeChanged: boolean;

  /** Natal retrograde status for reference */
  wasRetrograde: boolean;

  /** House placement (1-12) if available */
  house?: number;
}

// =============================================================================
// ANGLE TYPES
// =============================================================================

/**
 * Progressed chart angles (ASC, MC, DSC, IC).
 */
export interface ProgressedAngles {
  /** Progressed Ascendant (1st house cusp) */
  ascendant: ProgressedPosition;

  /** Progressed Midheaven (10th house cusp) */
  midheaven: ProgressedPosition;

  /** Progressed Descendant (7th house cusp) */
  descendant: ProgressedPosition;

  /** Progressed Imum Coeli (4th house cusp) */
  imumCoeli: ProgressedPosition;
}

// =============================================================================
// ASPECT TYPES
// =============================================================================

/**
 * Aspect between progressed and natal positions.
 *
 * @remarks
 * Progressed aspects use much tighter orbs than natal aspects,
 * typically 1° for major aspects and 0.5° for minor aspects.
 */
export interface ProgressedAspect {
  /** What is aspecting (progressed body name) */
  progressedBody: string;

  /** Progressed body enum value */
  progressedBodyEnum?: CelestialBody;

  /** Progressed body longitude */
  progressedLongitude: number;

  /** What is being aspected (natal body name) */
  natalBody: string;

  /** Natal body enum value */
  natalBodyEnum?: CelestialBody;

  /** Natal body longitude */
  natalLongitude: number;

  /** Aspect type */
  aspectType: AspectType;

  /** Aspect symbol (e.g., '☌', '□', '△') */
  symbol: string;

  /** Exact angle for this aspect type (0, 60, 90, 120, 180, etc.) */
  exactAngle: number;

  /** Current angular separation */
  separation: number;

  /** Deviation from exact aspect (always positive) */
  deviation: number;

  /** Orb used for this detection */
  orb: number;

  /** Aspect strength as percentage (100 = exact, 0 = at orb edge) */
  strength: number;

  /** Is this aspect applying, exact, or separating? */
  phase: ProgressedAspectPhase;

  /** Is the progressed planet retrograde? */
  isRetrograde: boolean;

  /** When will/did this aspect perfect? (Julian Date) */
  exactJD?: number;

  /** When will/did this aspect perfect? (Calendar date) */
  exactDate?: ProgressedDate;

  /** Age at which aspect perfects */
  exactAge?: number;
}

// =============================================================================
// DATE TYPES
// =============================================================================

/**
 * Calendar date representation for progressions.
 */
export interface ProgressedDate {
  year: number;
  month: number;
  day: number;
  hour?: number;
  minute?: number;
  second?: number;
}

/**
 * Date information for a progressed chart.
 */
export interface ProgressedChartDates {
  /** Natal chart Julian Date */
  natalJD: number;

  /** Natal calendar date */
  natalDate: ProgressedDate;

  /** Target date Julian Date (the date being progressed TO) */
  targetJD: number;

  /** Target calendar date */
  targetDate: ProgressedDate;

  /** Progressed chart Julian Date (the symbolic chart date) */
  progressedJD: number;

  /** Progressed calendar date */
  progressedDate: ProgressedDate;

  /** Days elapsed from birth to progressed chart date */
  daysFromBirth: number;

  /** Age at target date (in years, fractional) */
  ageInYears: number;
}

// =============================================================================
// CONFIGURATION TYPES
// =============================================================================

/**
 * Configuration options for progression calculations.
 *
 * @remarks
 * All options are optional - sensible defaults are used when not specified.
 */
export interface ProgressionConfig {
  /**
   * Progression system to use.
   * @default 'secondary'
   */
  type?: ProgressionType;

  /**
   * Method for angle progression (ASC, MC).
   * @default 'solar-arc'
   */
  angleMethod?: AngleProgressionMethod;

  /**
   * Bodies to include in progressed chart.
   * @default Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn
   */
  bodies?: CelestialBody[];

  /**
   * Include progressed-to-progressed aspects.
   * @default false
   */
  includeProgressedAspects?: boolean;

  /**
   * Include progressed-to-natal aspects.
   * @default true
   */
  includeNatalAspects?: boolean;

  /**
   * Aspect types to detect.
   * @default Major aspects (conjunction, sextile, square, trine, opposition)
   */
  aspectTypes?: AspectType[];

  /**
   * Custom orbs per aspect type (overrides defaults).
   * Values in degrees. Progression orbs are much tighter than natal.
   */
  orbs?: Partial<Record<AspectType, number>>;

  /**
   * Include solar arc directed positions.
   * @default true
   */
  includeSolarArc?: boolean;

  /**
   * Minimum strength (0-100) to include aspects in results.
   * @default 0 (include all within orb)
   */
  minimumStrength?: number;

  /**
   * Threshold for marking aspect as 'exact' phase (degrees).
   * @default 0.1 (~6 arcminutes)
   */
  exactThreshold?: number;
}

// =============================================================================
// SUMMARY TYPES
// =============================================================================

/**
 * Information about a sign change in progressions.
 */
export interface ProgressedSignChange {
  /** Body that changed signs */
  body: string;

  /** Body enum value */
  bodyEnum?: CelestialBody;

  /** Sign departed */
  fromSign: string;

  /** Sign entered */
  toSign: string;

  /** Approximate age when sign change occurred */
  approximateAge: number;

  /** Julian Date of sign change */
  changeJD?: number;
}

/**
 * Information about a retrograde status change.
 */
export interface ProgressedRetrogradeChange {
  /** Body that changed direction */
  body: string;

  /** Body enum value */
  bodyEnum?: CelestialBody;

  /** Direction of change */
  direction: 'turned-retrograde' | 'turned-direct';

  /** Approximate age when change occurred */
  approximateAge: number;

  /** Julian Date of direction change */
  changeJD?: number;

  /** Longitude at direction change */
  longitude?: number;
}

/**
 * Information about the progressed Moon (most significant progressed body).
 */
export interface ProgressedMoonInfo {
  /** Current progressed Moon sign */
  sign: string;

  /** Approximate months spent in current sign so far */
  monthsInSign: number;

  /** Approximate months until next sign change */
  monthsUntilNextSign: number;

  /** Last sign change information */
  lastSignChange: {
    fromSign: string;
    toSign: string;
    age: number;
  } | null;

  /** Next sign change information */
  nextSignChange: {
    fromSign: string;
    toSign: string;
    age: number;
  } | null;
}

/**
 * Summary of significant progressions.
 */
export interface ProgressionSummary {
  /** Sign changes since birth */
  signChanges: ProgressedSignChange[];

  /** Retrograde status changes since birth */
  retrogradeChanges: ProgressedRetrogradeChange[];

  /** Currently exact aspects (within exactThreshold) */
  exactAspects: ProgressedAspect[];

  /** Approaching aspects (within 1°, applying) */
  approachingAspects: ProgressedAspect[];

  /** Progressed Moon analysis */
  progressedMoon: ProgressedMoonInfo | null;

  /** Most significant aspect (highest strength) */
  mostSignificantAspect: ProgressedAspect | null;

  /** Solar arc value in degrees */
  solarArc: number;
}

// =============================================================================
// RESULT TYPES
// =============================================================================

/**
 * Complete progressed chart result.
 *
 * @example
 * ```typescript
 * const progressed = calculateProgressedChart(birthData, targetDate);
 *
 * console.log(`Solar Arc: ${progressed.solarArc}°`);
 * console.log(`Progressed Sun: ${progressed.planets[0].formatted}`);
 *
 * for (const aspect of progressed.aspectsToNatal) {
 *   console.log(`P.${aspect.progressedBody} ${aspect.symbol} N.${aspect.natalBody}`);
 * }
 * ```
 */
export interface ProgressedChart {
  /** Date information */
  dates: ProgressedChartDates;

  /** Progressed planetary positions */
  planets: ProgressedPlanet[];

  /** Progressed angles (ASC, MC, DSC, IC) */
  angles: ProgressedAngles;

  /** Solar arc value in degrees */
  solarArc: number;

  /** Solar arc directed positions (if includeSolarArc is true) */
  solarArcPositions: ProgressedPlanet[];

  /** Progressed-to-Natal aspects */
  aspectsToNatal: ProgressedAspect[];

  /** Progressed-to-Progressed aspects (if enabled) */
  aspectsProgressed: ProgressedAspect[];

  /** Summary information */
  summary: ProgressionSummary;

  /** Configuration used */
  config: Required<ProgressionConfig>;
}

// =============================================================================
// INPUT TYPES
// =============================================================================

/**
 * Birth data for progression calculations.
 * Matches the BirthData type from chart module.
 */
export interface ProgressionBirthData {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second?: number;
  timezone: number;
  latitude: number;
  longitude: number;
}

/**
 * Target date specification for progressions.
 */
export interface ProgressionTargetDate {
  year: number;
  month: number;
  day: number;
  hour?: number;
  minute?: number;
  second?: number;
}

// =============================================================================
// ERROR TYPES
// =============================================================================

/**
 * Error thrown when progression calculation fails.
 */
export class ProgressionCalculationError extends Error {
  constructor(
    message: string,
    public step: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ProgressionCalculationError';
  }
}

/**
 * Error thrown when progression input is invalid.
 */
export class ProgressionValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public value: unknown,
  ) {
    super(message);
    this.name = 'ProgressionValidationError';
  }
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Result of finding a specific progression event (e.g., sign change).
 */
export interface ProgressionEvent {
  /** Event type */
  type: 'sign-change' | 'retrograde-change' | 'aspect-exact' | 'angle-change';

  /** Body involved */
  body: string;

  /** Julian Date of event */
  jd: number;

  /** Calendar date of event */
  date: ProgressedDate;

  /** Age at event */
  age: number;

  /** Event-specific details */
  details: Record<string, unknown>;
}

/**
 * Parameters for searching progression events over a time range.
 */
export interface ProgressionSearchParams {
  /** Birth data */
  birthData: ProgressionBirthData;

  /** Start age (years) */
  startAge: number;

  /** End age (years) */
  endAge: number;

  /** Bodies to track */
  bodies?: CelestialBody[];

  /** Event types to search for */
  eventTypes?: ProgressionEvent['type'][];

  /** Progression configuration */
  config?: ProgressionConfig;
}

/**
 * Result of searching progression events.
 */
export interface ProgressionSearchResult {
  /** Search parameters used */
  params: ProgressionSearchParams;

  /** Events found, sorted by date */
  events: ProgressionEvent[];

  /** Events grouped by type */
  byType: Record<ProgressionEvent['type'], ProgressionEvent[]>;

  /** Events grouped by body */
  byBody: Record<string, ProgressionEvent[]>;
}

