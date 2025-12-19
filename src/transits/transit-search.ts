/**
 * Transit Search Module
 *
 * Search for transits across a date range, combining detection, timing,
 * and retrograde analysis into comprehensive results.
 *
 * @module transits/transit-search
 *
 * @remarks
 * This module provides the high-level API for finding all transits in a period:
 *
 * - **Date Range Search**: Find all transits between two dates
 * - **Body-Specific Search**: Focus on specific transiting bodies
 * - **Monthly Grouping**: Organize results by calendar month
 * - **Summary Statistics**: Get overview of transit activity
 *
 * @see IMPL.md Section 4.4 for specification
 */

import { AspectType } from '../aspects/types.js';
import { type CelestialBody, getPosition } from '../ephemeris/positions.js';
import {
  BODY_NAMES,
  DEFAULT_TRANSIT_CONFIG,
  DEFAULT_TRANSITING_BODIES,
  FAST_PLANETS,
} from './constants.js';
import { angularSeparation, getEffectiveOrb, jdToTransitDate } from './transit-detection.js';
import { findAllExactTimes, findTransitTiming, getSearchStepForBody } from './transit-timing.js';
import type {
  NatalPoint,
  Transit,
  TransitConfig,
  TransitDate,
  TransitSearchParams,
  TransitSearchResult,
  TransitTiming,
} from './types.js';

// =============================================================================
// CORE SEARCH FUNCTION
// =============================================================================

/**
 * Search for all transits in a date range.
 *
 * @param params - Search parameters including date range and natal points
 * @returns Complete search results with timing for each transit
 *
 * @remarks
 * This is the main entry point for transit analysis. It:
 * 1. Scans the date range for all aspect formations
 * 2. Calculates exact times for each transit
 * 3. Groups results by month
 * 4. Provides summary statistics
 *
 * @example
 * ```ts
 * const natalPoints: NatalPoint[] = [
 *   { name: 'Sun', longitude: 280.37, type: 'luminary' },
 *   { name: 'Moon', longitude: 223.32, type: 'luminary' },
 *   { name: 'ASC', longitude: 101.65, type: 'angle' },
 * ];
 *
 * const result = searchTransits({
 *   startJD: julianDate(2025, 1, 1, 0, 0),
 *   endJD: julianDate(2025, 12, 31, 23, 59),
 *   natalPoints,
 * });
 *
 * console.log(`Found ${result.summary.totalTransits} transits in 2025`);
 *
 * for (const [month, transits] of Object.entries(result.byMonth)) {
 *   console.log(`${month}: ${transits.length} transits`);
 * }
 * ```
 */
export function searchTransits(params: TransitSearchParams): TransitSearchResult {
  const { startJD, endJD, natalPoints, config, stepDays } = params;

  const fullConfig = {
    ...DEFAULT_TRANSIT_CONFIG,
    ...config,
  };

  const bodies = fullConfig.transitingBodies ?? [...DEFAULT_TRANSITING_BODIES];
  const aspectTypes = fullConfig.aspectTypes ?? DEFAULT_TRANSIT_CONFIG.aspectTypes;

  // Track found transits to avoid duplicates
  const transitMap = new Map<string, TransitTiming>();

  // Search each body-natal point combination
  for (const body of bodies) {
    const step = stepDays ?? getSearchStepForBody(body);

    for (const natalPoint of natalPoints) {
      // Search for each aspect type
      for (const aspectType of aspectTypes) {
        const orb = getEffectiveOrb(aspectType, natalPoint, body, config);
        const aspectAngle = getAspectAngle(aspectType);

        // Find all exact times for this aspect
        const exactTimes = findAllExactTimes(
          body,
          natalPoint.longitude,
          aspectAngle,
          startJD,
          endJD,
          step,
        );

        // Create transit timing for each exact time
        for (const exactJD of exactTimes) {
          const key = `${body}-${natalPoint.name}-${aspectType}`;

          // Skip if we already found this transit
          if (transitMap.has(key)) {
            const existing = transitMap.get(key)!;
            // Check if this is the same transit event (within duration)
            const existingFirst = existing.exactJDs[0];
            const existingLast = existing.exactJDs[existing.exactJDs.length - 1];

            if (exactJD >= existingFirst - 30 && exactJD <= existingLast + 30) {
              // Same transit event, skip
              continue;
            }
          }

          // Get timing information
          const timing = findTransitTiming(
            body,
            natalPoint.longitude,
            aspectAngle,
            orb,
            startJD,
            endJD,
          );

          if (timing) {
            // Build the Transit object
            const pos = getPosition(body, exactJD);
            const sep = angularSeparation(pos.longitude, natalPoint.longitude);
            const deviation = Math.abs(sep - aspectAngle);

            const transit: Transit = {
              transitingBody: BODY_NAMES[body],
              transitingBodyEnum: body,
              natalPoint: natalPoint.name,
              aspectType,
              symbol: getAspectSymbol(aspectType),
              aspectAngle,
              separation: sep,
              deviation,
              orb,
              phase: 'exact',
              strength: 100,
              isRetrograde: pos.isRetrograde,
              isOutOfSign: false,
              exactJD,
              exactDate: jdToTransitDate(exactJD),
            };

            const transitTiming: TransitTiming = {
              ...timing,
              transit,
            };

            transitMap.set(`${key}-${Math.floor(exactJD)}`, transitTiming);
          }
        }
      }
    }
  }

  // Convert map to array and sort by first exact date
  const transits = Array.from(transitMap.values()).sort((a, b) => a.exactJDs[0] - b.exactJDs[0]);

  // Group by month
  const byMonth = groupTransitsByMonth(transits);

  // Generate summary
  const summary = generateSearchSummary(transits, startJD, endJD);

  return {
    params,
    transits,
    byMonth,
    summary,
  };
}

/**
 * Search transits for a specific body.
 *
 * @param body - Transiting body
 * @param natalPoints - Natal chart points
 * @param startJD - Start of search range
 * @param endJD - End of search range
 * @param config - Optional configuration
 * @returns Array of transit timings
 */
export function searchTransitsForBody(
  body: CelestialBody,
  natalPoints: NatalPoint[],
  startJD: number,
  endJD: number,
  config?: TransitConfig,
): TransitTiming[] {
  const result = searchTransits({
    startJD,
    endJD,
    natalPoints,
    config: {
      ...config,
      transitingBodies: [body],
    },
  });

  return result.transits;
}

/**
 * Search transits to a specific natal point.
 *
 * @param natalPoint - Single natal point to check
 * @param startJD - Start of search range
 * @param endJD - End of search range
 * @param config - Optional configuration
 * @returns Array of transit timings
 */
export function searchTransitsToPoint(
  natalPoint: NatalPoint,
  startJD: number,
  endJD: number,
  config?: TransitConfig,
): TransitTiming[] {
  const result = searchTransits({
    startJD,
    endJD,
    natalPoints: [natalPoint],
    config,
  });

  return result.transits;
}

// =============================================================================
// GROUPING FUNCTIONS
// =============================================================================

/**
 * Group transits by calendar month.
 *
 * @param transits - Array of transit timings
 * @returns Object mapping "YYYY-MM" to transits starting that month
 */
export function groupTransitsByMonth(transits: TransitTiming[]): Record<string, TransitTiming[]> {
  const grouped: Record<string, TransitTiming[]> = {};

  for (const timing of transits) {
    const firstExact = timing.exactDates[0];
    const key = `${firstExact.year}-${String(firstExact.month).padStart(2, '0')}`;

    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(timing);
  }

  return grouped;
}

/**
 * Group transits by transiting body.
 *
 * @param transits - Array of transit timings
 * @returns Object mapping body name to its transits
 */
export function groupTransitsByBody(transits: TransitTiming[]): Record<string, TransitTiming[]> {
  const grouped: Record<string, TransitTiming[]> = {};

  for (const timing of transits) {
    const body = timing.transit.transitingBody;

    if (!grouped[body]) {
      grouped[body] = [];
    }
    grouped[body].push(timing);
  }

  return grouped;
}

/**
 * Group transits by natal point.
 *
 * @param transits - Array of transit timings
 * @returns Object mapping natal point name to its transits
 */
export function groupTransitsByNatalPoint(
  transits: TransitTiming[],
): Record<string, TransitTiming[]> {
  const grouped: Record<string, TransitTiming[]> = {};

  for (const timing of transits) {
    const point = timing.transit.natalPoint;

    if (!grouped[point]) {
      grouped[point] = [];
    }
    grouped[point].push(timing);
  }

  return grouped;
}

/**
 * Group transits by aspect type.
 *
 * @param transits - Array of transit timings
 * @returns Object mapping aspect type to its transits
 */
export function groupTransitsByAspect(
  transits: TransitTiming[],
): Partial<Record<AspectType, TransitTiming[]>> {
  const grouped: Partial<Record<AspectType, TransitTiming[]>> = {};

  for (const timing of transits) {
    const aspect = timing.transit.aspectType;

    if (!grouped[aspect]) {
      grouped[aspect] = [];
    }
    grouped[aspect]!.push(timing);
  }

  return grouped;
}

// =============================================================================
// SUMMARY FUNCTIONS
// =============================================================================

/**
 * Generate summary statistics for search results.
 *
 * @param transits - Array of transit timings
 * @param startJD - Search start date
 * @param endJD - Search end date
 * @returns Summary statistics
 */
export function generateSearchSummary(
  transits: TransitTiming[],
  startJD: number,
  endJD: number,
): TransitSearchResult['summary'] {
  const byAspect: Partial<Record<AspectType, number>> = {};
  const byBody: Record<string, number> = {};

  for (const timing of transits) {
    // Count by aspect
    byAspect[timing.transit.aspectType] = (byAspect[timing.transit.aspectType] ?? 0) + 1;

    // Count by body
    byBody[timing.transit.transitingBody] = (byBody[timing.transit.transitingBody] ?? 0) + 1;
  }

  return {
    totalTransits: transits.length,
    byAspect,
    byBody,
    dateRange: {
      start: jdToTransitDate(startJD),
      end: jdToTransitDate(endJD),
      days: endJD - startJD,
    },
  };
}

// =============================================================================
// FILTERING FUNCTIONS
// =============================================================================

/**
 * Filter transits by minimum strength.
 *
 * @param transits - Array of transit timings
 * @param minStrength - Minimum strength (0-100)
 * @returns Filtered transits
 */
export function filterByStrength(transits: TransitTiming[], minStrength: number): TransitTiming[] {
  return transits.filter((t) => t.transit.strength >= minStrength);
}

/**
 * Filter to only retrograde transits.
 *
 * @param transits - Array of transit timings
 * @returns Transits that include a retrograde pass
 */
export function filterRetrogrades(transits: TransitTiming[]): TransitTiming[] {
  return transits.filter((t) => t.hasRetrogradePass);
}

/**
 * Filter to transits with multiple passes.
 *
 * @param transits - Array of transit timings
 * @returns Transits with 2+ exact passes
 */
export function filterMultiplePasses(transits: TransitTiming[]): TransitTiming[] {
  return transits.filter((t) => t.exactPasses > 1);
}

/**
 * Filter to long-duration transits.
 *
 * @param transits - Array of transit timings
 * @param minDays - Minimum duration in days
 * @returns Transits lasting at least minDays
 */
export function filterByDuration(transits: TransitTiming[], minDays: number): TransitTiming[] {
  return transits.filter((t) => t.durationDays >= minDays);
}

/**
 * Filter transits by body type (fast/slow).
 *
 * @param transits - Array of transit timings
 * @param type - 'fast' or 'slow'
 * @returns Filtered transits
 */
export function filterByBodySpeed(
  transits: TransitTiming[],
  type: 'fast' | 'slow',
): TransitTiming[] {
  const fastBodies = FAST_PLANETS.map((b) => BODY_NAMES[b]);

  if (type === 'fast') {
    return transits.filter((t) => fastBodies.includes(t.transit.transitingBody));
  }
  return transits.filter((t) => !fastBodies.includes(t.transit.transitingBody));
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get the next significant transit after a date.
 *
 * @param transits - Array of transit timings
 * @param afterJD - Julian Date to search after
 * @returns Next transit, or undefined if none
 */
export function getNextTransit(
  transits: TransitTiming[],
  afterJD: number,
): TransitTiming | undefined {
  for (const transit of transits) {
    if (transit.exactJDs[0] > afterJD) {
      return transit;
    }
  }
  return undefined;
}

/**
 * Get transits currently active at a specific date.
 *
 * @param transits - Array of transit timings
 * @param jd - Julian Date to check
 * @returns Transits active (within orb) at that date
 */
export function getActiveTransits(transits: TransitTiming[], jd: number): TransitTiming[] {
  return transits.filter((t) => jd >= t.enterOrbJD && jd <= t.leaveOrbJD);
}

/**
 * Find the most significant transits (longest duration).
 *
 * @param transits - Array of transit timings
 * @param limit - Maximum number to return
 * @returns Top transits by duration
 */
export function getMostSignificantTransits(
  transits: TransitTiming[],
  limit: number = 10,
): TransitTiming[] {
  return [...transits].sort((a, b) => b.durationDays - a.durationDays).slice(0, limit);
}

/**
 * Format a transit timing for display.
 *
 * @param timing - Transit timing
 * @returns Human-readable string
 */
export function formatTransitTimingDetail(timing: TransitTiming): string {
  const { transit } = timing;

  const retro = timing.hasRetrogradePass ? ' (includes retrograde)' : '';
  const passes = timing.exactPasses > 1 ? ` - ${timing.exactPasses} exact passes` : '';

  const lines = [
    `${transit.transitingBody} ${transit.symbol} ${transit.natalPoint}${retro}${passes}`,
    `  Duration: ${timing.durationDays.toFixed(1)} days`,
    `  Enters orb: ${formatDate(timing.enterOrbDate)}`,
  ];

  for (let i = 0; i < timing.exactDates.length; i++) {
    lines.push(`  Exact #${i + 1}: ${formatDate(timing.exactDates[i])}`);
  }

  lines.push(`  Leaves orb: ${formatDate(timing.leaveOrbDate)}`);

  return lines.join('\n');
}

/**
 * Format a TransitDate for display.
 *
 * @internal
 */
function formatDate(date: TransitDate): string {
  return `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
}

/**
 * Get aspect angle from type.
 *
 * @internal
 */
function getAspectAngle(aspectType: AspectType): number {
  const angles: Record<AspectType, number> = {
    [AspectType.Conjunction]: 0,
    [AspectType.SemiSextile]: 30,
    [AspectType.Decile]: 36,
    [AspectType.Novile]: 40,
    [AspectType.SemiSquare]: 45,
    [AspectType.Septile]: 51.4286,
    [AspectType.Sextile]: 60,
    [AspectType.Quintile]: 72,
    [AspectType.Square]: 90,
    [AspectType.Trine]: 120,
    [AspectType.Sesquiquadrate]: 135,
    [AspectType.Biquintile]: 144,
    [AspectType.Quincunx]: 150,
    [AspectType.Opposition]: 180,
  };
  return angles[aspectType];
}

/**
 * Get aspect symbol from type.
 *
 * @internal
 */
function getAspectSymbol(aspectType: AspectType): string {
  const symbols: Record<AspectType, string> = {
    [AspectType.Conjunction]: '☌',
    [AspectType.Sextile]: '⚹',
    [AspectType.Square]: '□',
    [AspectType.Trine]: '△',
    [AspectType.Opposition]: '☍',
    [AspectType.SemiSextile]: '⚺',
    [AspectType.SemiSquare]: '∠',
    [AspectType.Quintile]: 'Q',
    [AspectType.Sesquiquadrate]: '⚼',
    [AspectType.Biquintile]: 'bQ',
    [AspectType.Quincunx]: '⚻',
    [AspectType.Septile]: 'S',
    [AspectType.Novile]: 'N',
    [AspectType.Decile]: 'D',
  };
  return symbols[aspectType];
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Get a quick overview of upcoming transits.
 *
 * @param natalPoints - Natal chart points
 * @param fromJD - Starting Julian Date
 * @param days - Number of days to search
 * @param config - Optional configuration
 * @returns Search results for the period
 */
export function getUpcomingTransits(
  natalPoints: NatalPoint[],
  fromJD: number,
  days: number = 30,
  config?: TransitConfig,
): TransitSearchResult {
  return searchTransits({
    startJD: fromJD,
    endJD: fromJD + days,
    natalPoints,
    config,
  });
}

/**
 * Get transits for a specific month.
 *
 * @param natalPoints - Natal chart points
 * @param year - Year
 * @param month - Month (1-12)
 * @param config - Optional configuration
 * @returns Search results for the month
 */
export function getTransitsForMonth(
  natalPoints: NatalPoint[],
  year: number,
  month: number,
  config?: TransitConfig,
): TransitSearchResult {
  // Calculate JD for start and end of month
  const startJD = dateToJD(year, month, 1);
  const endJD = month === 12 ? dateToJD(year + 1, 1, 1) : dateToJD(year, month + 1, 1);

  return searchTransits({
    startJD,
    endJD,
    natalPoints,
    config,
  });
}

/**
 * Get transits for a year.
 *
 * @param natalPoints - Natal chart points
 * @param year - Year
 * @param config - Optional configuration
 * @returns Search results for the year
 */
export function getTransitsForYear(
  natalPoints: NatalPoint[],
  year: number,
  config?: TransitConfig,
): TransitSearchResult {
  const startJD = dateToJD(year, 1, 1);
  const endJD = dateToJD(year + 1, 1, 1);

  return searchTransits({
    startJD,
    endJD,
    natalPoints,
    config,
  });
}

/**
 * Convert calendar date to Julian Date (simple implementation).
 *
 * @internal
 */
function dateToJD(year: number, month: number, day: number): number {
  // Algorithm from Meeus "Astronomical Algorithms"
  if (month <= 2) {
    year -= 1;
    month += 12;
  }

  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);

  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + B - 1524.5;
}
