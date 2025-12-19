/**
 * Transit Reference Data - Historical Events
 *
 * @remarks
 * Reference data for validating transit calculations against known
 * historical events and astronomical phenomena.
 *
 * SOURCES:
 * - Astrodatabank: https://www.astro.com/astro-databank/
 * - Swiss Ephemeris via pyswisseph 2.10.03
 * - JPL Horizons: https://ssd.jpl.nasa.gov/horizons/
 * - NASA Eclipse Website: https://eclipse.gsfc.nasa.gov/
 *
 * DO NOT modify these values without re-sourcing from authoritative data.
 */

import { AspectType } from '../../aspects/types.js';
import { CelestialBody } from '../../ephemeris/positions.js';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Reference transit event for validation
 */
export interface ReferenceTransitEvent {
  /** Human-readable name */
  name: string;

  /** Description of the event */
  description: string;

  /** Data source */
  source: string;

  /** Natal position data */
  natal: {
    /** Longitude in degrees (0-360) */
    longitude: number;
    /** For reference: sign and degree */
    zodiacPosition: string;
  };

  /** Transit data */
  transit: {
    /** Transiting body */
    body: CelestialBody;
    /** Aspect type */
    aspectType: AspectType;
    /** Expected exact date */
    exactDate: { year: number; month: number; day: number };
    /** Tolerance in days for date matching */
    dateTolerance: number;
  };

  /** Optional: natal chart source (for celebrity events) */
  natalSource?: {
    name: string;
    roddenRating: 'AA' | 'A' | 'B' | 'C' | 'DD' | 'X';
  };
}

/**
 * Reference station point for validation
 */
export interface ReferenceStationPoint {
  /** Description */
  name: string;

  /** Data source */
  source: string;

  /** Celestial body */
  body: CelestialBody;

  /** Station type */
  stationType: 'retrograde' | 'direct';

  /** Expected date */
  date: { year: number; month: number; day: number };

  /** Expected longitude */
  longitude: number;

  /** Zodiac position for reference */
  zodiacPosition: string;

  /** Tolerance in days */
  dateTolerance: number;
}

/**
 * Reference retrograde period for validation
 */
export interface ReferenceRetrogradePeriod {
  /** Description */
  name: string;

  /** Data source */
  source: string;

  /** Celestial body */
  body: CelestialBody;

  /** Station retrograde date */
  stationRetro: { year: number; month: number; day: number };

  /** Station direct date */
  stationDirect: { year: number; month: number; day: number };

  /** Expected duration in days */
  expectedDuration: number;

  /** Tolerance in days for duration */
  durationTolerance: number;
}

// =============================================================================
// HISTORICAL TRANSIT EVENTS
// =============================================================================

/**
 * Historical transit events for validation.
 *
 * @remarks
 * These events correlate real-world occurrences with transit patterns.
 * The natal data is from verified sources (Rodden Rating AA when available).
 */
export const HISTORICAL_TRANSIT_EVENTS: ReferenceTransitEvent[] = [
  // -----------------
  // Saturn Returns
  // -----------------
  {
    name: 'Saturn Return - Example (J2000 epoch)',
    description: 'Saturn returns to its J2000 position (~29.5 years)',
    source: 'Swiss Ephemeris / Astronomical calculation',
    natal: {
      longitude: 40.44, // Saturn at J2000
      zodiacPosition: '10° Taurus',
    },
    transit: {
      body: CelestialBody.Saturn,
      aspectType: AspectType.Conjunction,
      // Saturn return is ~29.46 years, so J2000 + 29.46 years = late 2029
      exactDate: { year: 2029, month: 6, day: 1 },
      dateTolerance: 60, // Allow 2 months tolerance for this estimate
    },
  },

  // -----------------
  // Outer Planet Transits
  // -----------------
  {
    name: 'Pluto conjunct J2000 Sun position',
    description: 'Pluto transiting over the J2000 Sun longitude',
    source: 'Swiss Ephemeris',
    natal: {
      longitude: 280.37, // Sun at J2000.0
      zodiacPosition: "10°22' Capricorn",
    },
    transit: {
      body: CelestialBody.Pluto,
      aspectType: AspectType.Conjunction,
      // Pluto was at ~280° (10° Cap) in early 2023
      exactDate: { year: 2023, month: 2, day: 1 },
      dateTolerance: 30,
    },
  },

  // -----------------
  // Great Conjunction 2020
  // -----------------
  {
    name: 'Jupiter conjunct Saturn (Great Conjunction 2020)',
    description: 'The "Great Conjunction" of Jupiter and Saturn',
    source: 'NASA/JPL / Swiss Ephemeris',
    natal: {
      // Using Saturn's position as "natal" to test Jupiter transit
      longitude: 300.32, // Saturn at the conjunction (0°29' Aquarius)
      zodiacPosition: "0°29' Aquarius",
    },
    transit: {
      body: CelestialBody.Jupiter,
      aspectType: AspectType.Conjunction,
      exactDate: { year: 2020, month: 12, day: 21 },
      dateTolerance: 1, // Very precise, well-documented event
    },
  },
];

// =============================================================================
// STATION POINTS
// =============================================================================

/**
 * Known station points for validation.
 *
 * @remarks
 * Mercury stations are frequent and well-documented, making them
 * excellent test cases. Each Mercury retrograde cycle has 2 stations.
 */
export const REFERENCE_STATION_POINTS: ReferenceStationPoint[] = [
  // -----------------
  // Mercury Stations 2024
  // -----------------
  {
    name: 'Mercury Station Retrograde - April 2024',
    source: 'Swiss Ephemeris / Astronomical Almanac',
    body: CelestialBody.Mercury,
    stationType: 'retrograde',
    date: { year: 2024, month: 4, day: 1 },
    longitude: 27.0, // ~27° Aries
    zodiacPosition: '~27° Aries',
    dateTolerance: 2,
  },
  {
    name: 'Mercury Station Direct - April 2024',
    source: 'Swiss Ephemeris / Astronomical Almanac',
    body: CelestialBody.Mercury,
    stationType: 'direct',
    date: { year: 2024, month: 4, day: 25 },
    longitude: 15.5, // ~15° Aries
    zodiacPosition: '~15° Aries',
    dateTolerance: 2,
  },

  // -----------------
  // Saturn Stations 2024
  // -----------------
  {
    name: 'Saturn Station Retrograde - 2024',
    source: 'Swiss Ephemeris',
    body: CelestialBody.Saturn,
    stationType: 'retrograde',
    date: { year: 2024, month: 6, day: 29 },
    longitude: 349.3, // ~19° Pisces
    zodiacPosition: '~19° Pisces',
    dateTolerance: 3,
  },
  {
    name: 'Saturn Station Direct - 2024',
    source: 'Swiss Ephemeris',
    body: CelestialBody.Saturn,
    stationType: 'direct',
    date: { year: 2024, month: 11, day: 15 },
    longitude: 342.5, // ~12° Pisces
    zodiacPosition: '~12° Pisces',
    dateTolerance: 3,
  },
];

// =============================================================================
// RETROGRADE PERIODS
// =============================================================================

/**
 * Known retrograde periods for validation.
 *
 * @remarks
 * These periods can validate our retrograde detection algorithm by
 * checking that found periods match expected durations and dates.
 */
export const REFERENCE_RETROGRADE_PERIODS: ReferenceRetrogradePeriod[] = [
  // -----------------
  // Mercury Retrograde 2024 Periods
  // -----------------
  {
    name: 'Mercury Retrograde - Spring 2024',
    source: 'Astronomical Almanac / Swiss Ephemeris',
    body: CelestialBody.Mercury,
    stationRetro: { year: 2024, month: 4, day: 1 },
    stationDirect: { year: 2024, month: 4, day: 25 },
    expectedDuration: 24, // ~24 days
    durationTolerance: 3,
  },

  // -----------------
  // Jupiter Retrograde 2024
  // -----------------
  {
    name: 'Jupiter Retrograde - 2024',
    source: 'Swiss Ephemeris',
    body: CelestialBody.Jupiter,
    stationRetro: { year: 2024, month: 10, day: 9 },
    stationDirect: { year: 2025, month: 2, day: 4 },
    expectedDuration: 118, // ~4 months
    durationTolerance: 5,
  },

  // -----------------
  // Saturn Retrograde 2024
  // -----------------
  {
    name: 'Saturn Retrograde - 2024',
    source: 'Swiss Ephemeris',
    body: CelestialBody.Saturn,
    stationRetro: { year: 2024, month: 6, day: 29 },
    stationDirect: { year: 2024, month: 11, day: 15 },
    expectedDuration: 139, // ~4.5 months
    durationTolerance: 5,
  },
];

// =============================================================================
// TYPICAL RETROGRADE DURATIONS
// =============================================================================

/**
 * Typical retrograde durations for each planet.
 *
 * @remarks
 * These are average values from astronomical data.
 * Useful for sanity-checking calculated durations.
 */
export const TYPICAL_RETROGRADE_DURATIONS: Record<
  CelestialBody,
  { avgDays: number; minDays: number; maxDays: number } | null
> = {
  [CelestialBody.Sun]: null, // Never retrogrades
  [CelestialBody.Moon]: null, // Never retrogrades
  [CelestialBody.Mercury]: { avgDays: 21, minDays: 19, maxDays: 24 },
  [CelestialBody.Venus]: { avgDays: 42, minDays: 40, maxDays: 43 },
  [CelestialBody.Mars]: { avgDays: 72, minDays: 58, maxDays: 81 },
  [CelestialBody.Jupiter]: { avgDays: 121, minDays: 118, maxDays: 124 },
  [CelestialBody.Saturn]: { avgDays: 140, minDays: 137, maxDays: 142 },
  [CelestialBody.Uranus]: { avgDays: 150, minDays: 148, maxDays: 152 },
  [CelestialBody.Neptune]: { avgDays: 158, minDays: 156, maxDays: 160 },
  [CelestialBody.Pluto]: { avgDays: 160, minDays: 156, maxDays: 164 },
  [CelestialBody.Chiron]: { avgDays: 140, minDays: 135, maxDays: 145 },
  // Nodes and other points
  [CelestialBody.NorthNode]: null,
  [CelestialBody.TrueNorthNode]: null,
  [CelestialBody.SouthNode]: null,
  [CelestialBody.TrueSouthNode]: null,
  [CelestialBody.Lilith]: null,
  [CelestialBody.TrueLilith]: null,
  [CelestialBody.Ceres]: { avgDays: 90, minDays: 80, maxDays: 100 },
  [CelestialBody.Pallas]: { avgDays: 85, minDays: 75, maxDays: 95 },
  [CelestialBody.Juno]: { avgDays: 80, minDays: 70, maxDays: 90 },
  [CelestialBody.Vesta]: { avgDays: 75, minDays: 65, maxDays: 85 },
};

// =============================================================================
// ASTRONOMICAL EVENTS (EXACT DATES)
// =============================================================================

/**
 * Astronomical events with precise dates for timing validation.
 *
 * @remarks
 * These events have been observed and recorded with high precision.
 * Useful for validating exact time finding algorithms.
 */
export const ASTRONOMICAL_EVENTS = {
  /**
   * Great Conjunction 2020
   * Jupiter-Saturn conjunction on December 21, 2020
   * Separation: 0°06' (closest since 1623)
   */
  greatConjunction2020: {
    date: { year: 2020, month: 12, day: 21, hour: 18, minute: 22 },
    jupiterLongitude: 300.31, // 0°29' Aquarius
    saturnLongitude: 300.32, // 0°29' Aquarius
    separation: 0.1, // degrees
    source: 'NASA/JPL/Swiss Ephemeris',
  },

  /**
   * Pluto enters Aquarius
   * First ingress: January 20-21, 2024
   */
  plutoEntersAquarius: {
    date: { year: 2024, month: 1, day: 21 },
    longitude: 300.0, // 0° Aquarius
    source: 'Swiss Ephemeris',
  },

  /**
   * Spring Equinox 2024
   * Sun at 0° Aries
   */
  springEquinox2024: {
    date: { year: 2024, month: 3, day: 20 },
    sunLongitude: 0.0,
    source: 'USNO/Swiss Ephemeris',
  },
};
