/**
 * Transit Module - Type Definitions
 *
 * Core types for astrological transit calculations.
 *
 * @module transits/types
 *
 * @remarks
 * Transits track when current planetary positions form aspects to natal chart positions.
 * All angles are in degrees (0-360 for longitudes, 0-180 for separations).
 *
 * @see IMPL.md for full implementation specification
 * @see KNOWLEDGE.md Section 9 for aspect foundations
 */

import type { AspectType } from '../aspects/types.js';
import type { CelestialBody } from '../ephemeris/positions.js';

// =============================================================================
// NATAL POINT TYPES
// =============================================================================

/**
 * Type classification for natal points (affects orb calculation).
 */
export type NatalPointType = 'planet' | 'luminary' | 'angle' | 'node' | 'lot' | 'asteroid';

/**
 * A natal chart point that can receive transits.
 *
 * @remarks
 * This represents any point in the natal chart - planets, angles, nodes, etc.
 * The type field is used to determine orb extensions.
 */
export interface NatalPoint {
  /** Identifier (e.g., "Sun", "Moon", "ASC", "North Node") */
  name: string;

  /** Ecliptic longitude at birth (0-360°) */
  longitude: number;

  /** Point type for orb calculation */
  type: NatalPointType;

  /** Optional: house placement (1-12) */
  house?: number;

  /** Optional: zodiac sign index (0-11, 0=Aries) */
  signIndex?: number;
}

// =============================================================================
// TRANSITING BODY TYPES
// =============================================================================

/**
 * A transiting (current position) celestial body.
 *
 * @remarks
 * Contains the current position and motion of a celestial body.
 * The longitudeSpeed is essential for determining transit phase (applying/separating).
 */
export interface TransitingBody {
  /** Body identifier */
  name: string;

  /** Celestial body enum value */
  body: CelestialBody;

  /** Current ecliptic longitude (0-360°) */
  longitude: number;

  /** Daily motion in longitude (degrees/day, negative if retrograde) */
  longitudeSpeed: number;

  /** Whether currently in retrograde motion */
  isRetrograde: boolean;

  /** Optional: current zodiac sign index (0-11) */
  signIndex?: number;
}

// =============================================================================
// TRANSIT RESULT TYPES
// =============================================================================

/**
 * Phase of a transit aspect.
 *
 * @remarks
 * - 'applying': Aspect is forming (separation decreasing toward exact)
 * - 'exact': Aspect is at or very near exact (deviation < threshold)
 * - 'separating': Aspect is waning (separation increasing from exact)
 */
export type TransitPhase = 'applying' | 'exact' | 'separating';

/**
 * A detected transit aspect between a transiting body and natal point.
 *
 * @remarks
 * This represents an active transit - a current planetary position forming
 * an aspect to a natal chart position.
 *
 * @example
 * ```typescript
 * const transit: Transit = {
 *   transitingBody: 'Saturn',
 *   natalPoint: 'Sun',
 *   aspectType: AspectType.Square,
 *   symbol: '□',
 *   aspectAngle: 90,
 *   separation: 88.5,
 *   deviation: 1.5,
 *   orb: 2,
 *   phase: 'applying',
 *   strength: 25,
 *   isRetrograde: false,
 * };
 * ```
 */
export interface Transit {
  /** Transiting body name */
  transitingBody: string;

  /** Transiting body enum (for lookups) */
  transitingBodyEnum: CelestialBody;

  /** Natal point being aspected */
  natalPoint: string;

  /** Aspect type */
  aspectType: AspectType;

  /** Aspect symbol (e.g., '☌', '□', '△') */
  symbol: string;

  /** Exact angle for this aspect type (0, 60, 90, 120, 180, etc.) */
  aspectAngle: number;

  /** Current angular separation between transiting and natal positions */
  separation: number;

  /** Deviation from exact aspect (always positive) */
  deviation: number;

  /** Orb used for this detection */
  orb: number;

  /** Transit phase (applying, exact, or separating) */
  phase: TransitPhase;

  /** Transit strength as percentage (100 = exact, 0 = at orb edge) */
  strength: number;

  /** Is transiting body currently retrograde? */
  isRetrograde: boolean;

  /** Is this an out-of-sign (dissociate) aspect? */
  isOutOfSign: boolean;

  /** Julian Date when exact (populated if timing calculated) */
  exactJD?: number;

  /** Calendar date when exact (populated if timing calculated) */
  exactDate?: TransitDate;
}

/**
 * Calendar date representation for transit timing.
 */
export interface TransitDate {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second?: number;
}

// =============================================================================
// CONFIGURATION TYPES
// =============================================================================

/**
 * Configuration options for transit calculations.
 *
 * @remarks
 * All options are optional - sensible defaults are used when not specified.
 */
export interface TransitConfig {
  /**
   * Aspect types to detect.
   * @default Major aspects (conjunction, sextile, square, trine, opposition)
   */
  aspectTypes?: AspectType[];

  /**
   * Custom orbs per aspect type (overrides defaults).
   * Values in degrees.
   */
  orbs?: Partial<Record<AspectType, number>>;

  /**
   * Bodies to use as transiting.
   * @default All planets + Chiron + True Node
   */
  transitingBodies?: CelestialBody[];

  /**
   * Include house ingress events in results.
   * @default false
   */
  includeHouseIngress?: boolean;

  /**
   * Calculate exact transit times (slower but more info).
   * @default false
   */
  calculateExactTimes?: boolean;

  /**
   * Minimum strength (0-100) to include in results.
   * @default 0 (include all within orb)
   */
  minimumStrength?: number;

  /**
   * Include out-of-sign (dissociate) transits.
   * @default true
   */
  includeOutOfSign?: boolean;

  /**
   * Threshold for 'exact' phase determination (degrees).
   * Transits with deviation below this are marked 'exact'.
   * @default 0.1
   */
  exactThreshold?: number;
}

// =============================================================================
// RESULT AGGREGATION TYPES
// =============================================================================

/**
 * Result of calculating transits for a single moment.
 */
export interface TransitResult {
  /** Julian Date of calculation */
  julianDate: number;

  /** Calendar date of calculation */
  date: TransitDate;

  /** All active transits */
  transits: Transit[];

  /** Active house ingresses (if enabled) */
  houseIngresses?: HouseIngress[];

  /** Transits grouped by natal point */
  byNatalPoint: Record<string, Transit[]>;

  /** Transits grouped by transiting body */
  byTransitingBody: Record<string, Transit[]>;

  /** Summary statistics */
  summary: TransitSummary;

  /** Configuration used */
  config: Required<TransitConfig>;
}

/**
 * Summary statistics for transit results.
 */
export interface TransitSummary {
  /** Total number of active transits */
  total: number;

  /** Count by aspect type */
  byAspect: Partial<Record<AspectType, number>>;

  /** Count of applying vs separating */
  applying: number;
  separating: number;
  exact: number;

  /** Count of retrograde transiting bodies */
  retrograde: number;

  /** Strongest transit (highest strength) */
  strongest?: Transit;
}

// =============================================================================
// HOUSE INGRESS TYPES
// =============================================================================

/**
 * A house ingress event (planet entering/exiting a house).
 */
export interface HouseIngress {
  /** Transiting body name */
  body: string;

  /** Transiting body enum */
  bodyEnum: CelestialBody;

  /** House being entered */
  house: number;

  /** Previous house (body coming from) */
  previousHouse: number;

  /** Direction of movement */
  direction: 'entering' | 'exiting';

  /** Is body retrograde? (affects interpretation) */
  isRetrograde: boolean;

  /** Julian Date of ingress (when calculated) */
  ingressJD?: number;

  /** Calendar date of ingress */
  ingressDate?: TransitDate;
}

// =============================================================================
// TIMING TYPES
// =============================================================================

/**
 * Complete timing information for a transit.
 *
 * @remarks
 * This captures the full lifecycle of a transit including:
 * - When it enters orb
 * - All exact passes (may be multiple due to retrograde)
 * - When it leaves orb
 */
export interface TransitTiming {
  /** The base transit information */
  transit: Transit;

  /** Julian Date when entering orb */
  enterOrbJD: number;

  /** Calendar date when entering orb */
  enterOrbDate: TransitDate;

  /** Julian Date(s) when exact (multiple if retrograde transit) */
  exactJDs: number[];

  /** Calendar dates when exact */
  exactDates: TransitDate[];

  /** Julian Date when leaving orb */
  leaveOrbJD: number;

  /** Calendar date when leaving orb */
  leaveOrbDate: TransitDate;

  /** Total duration in days */
  durationDays: number;

  /** Number of exact passes (1 = direct only, 3 = typical retrograde) */
  exactPasses: number;

  /** Whether transit includes retrograde period */
  hasRetrogradePass: boolean;
}

// =============================================================================
// SEARCH TYPES
// =============================================================================

/**
 * Parameters for searching transits in a date range.
 */
export interface TransitSearchParams {
  /** Start Julian Date */
  startJD: number;

  /** End Julian Date */
  endJD: number;

  /** Natal chart positions to check */
  natalPoints: NatalPoint[];

  /** House cusps (needed for house ingress detection) */
  houseCusps?: number[];

  /** Configuration options */
  config?: TransitConfig;

  /**
   * Search step in days.
   * Smaller = more precise but slower.
   * @default 1 for fast planets, 7 for slow planets
   */
  stepDays?: number;
}

/**
 * Result of searching transits in a date range.
 */
export interface TransitSearchResult {
  /** Search parameters used */
  params: TransitSearchParams;

  /** All transit timings found, sorted by first exact date */
  transits: TransitTiming[];

  /** House ingresses found (if enabled) */
  houseIngresses?: HouseIngress[];

  /** Transits grouped by month (YYYY-MM key) */
  byMonth: Record<string, TransitTiming[]>;

  /** Summary statistics */
  summary: {
    /** Total transits found */
    totalTransits: number;

    /** Transit count by aspect type */
    byAspect: Partial<Record<AspectType, number>>;

    /** Transit count by transiting body */
    byBody: Record<string, number>;

    /** Date range covered */
    dateRange: {
      start: TransitDate;
      end: TransitDate;
      days: number;
    };
  };
}

// =============================================================================
// RETROGRADE TYPES
// =============================================================================

/**
 * Information about a planet's retrograde period.
 */
export interface RetrogradePeriod {
  /** Body in retrograde */
  body: CelestialBody;

  /** Julian Date when retrograde begins (station retrograde) */
  stationRetroJD: number;

  /** Julian Date when direct motion resumes (station direct) */
  stationDirectJD: number;

  /** Longitude at station retrograde */
  stationRetroLongitude: number;

  /** Longitude at station direct */
  stationDirectLongitude: number;

  /** Duration in days */
  durationDays: number;
}

/**
 * Station point (where planet appears to stop moving).
 */
export interface StationPoint {
  /** Body stationing */
  body: CelestialBody;

  /** Type of station */
  type: 'station-retrograde' | 'station-direct';

  /** Julian Date of station */
  jd: number;

  /** Longitude at station */
  longitude: number;

  /** Calendar date */
  date: TransitDate;
}

// =============================================================================
// ERROR TYPES
// =============================================================================

/**
 * Error thrown when transit calculation fails.
 */
export class TransitCalculationError extends Error {
  constructor(
    message: string,
    public step: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'TransitCalculationError';
  }
}

/**
 * Error thrown when transit search parameters are invalid.
 */
export class TransitSearchError extends Error {
  constructor(
    message: string,
    public field: string,
    public value: unknown,
  ) {
    super(message);
    this.name = 'TransitSearchError';
  }
}
