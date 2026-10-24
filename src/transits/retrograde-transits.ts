/**
 * Retrograde Transit Module
 *
 * Functions for handling retrograde motion in transits, including
 * detecting multiple exact passes and finding station points.
 *
 * @module transits/retrograde-transits
 *
 * @remarks
 * Retrograde motion is crucial for transit analysis because:
 *
 * - A single transit can have 3+ exact passes (direct → retrograde → direct)
 * - The retrograde pass is often the most intense
 * - Station points (where the planet appears to stop) are highly significant
 *
 * This module provides:
 * - **Station Detection**: Find when planets station retrograde/direct
 * - **Multiple Pass Detection**: Track all exact aspects during a transit
 * - **Retrograde Period Classification**: Determine motion phase
 *
 * @see IMPL.md Section 4.6 for specification
 * @see KNOWLEDGE.md for astronomical background on retrograde
 */

import { type CelestialBody, getPosition } from '../ephemeris/positions.js';
import { stationIn, stationStep, stations, wrap } from '../events/search.js';
import type { EventFrameOptions } from '../events/types.js';
import {
  AVERAGE_DAILY_MOTION,
  BODY_NAMES,
  MAX_BINARY_SEARCH_ITERATIONS,
  RETROGRADE_PLANETS,
  STATIONARY_SPEED_THRESHOLD,
} from './constants.js';
import { formatDate } from './format-date.js';
import { jdToTransitDate } from './transit-detection.js';
import type { RetrogradePeriod, StationPoint, TransitDate } from './types.js';

/** Retrograde period between a station retrograde and the following station direct. */
const period = (body: CelestialBody, r: StationPoint, d: StationPoint): RetrogradePeriod => ({
  body,
  stationRetroJD: r.jd,
  stationDirectJD: d.jd,
  stationRetroLongitude: r.longitude,
  stationDirectLongitude: d.longitude,
  durationDays: d.jd - r.jd,
});

// =============================================================================
// MOTION CLASSIFICATION
// =============================================================================

/**
 * Motion state of a celestial body.
 */
export type MotionState = 'direct' | 'retrograde' | 'stationary-retrograde' | 'stationary-direct';

/**
 * Classify the motion state of a body at a given time.
 *
 * @param body - Celestial body
 * @param jd - Julian Date
 * @returns Motion state
 *
 * @remarks
 * - Direct: Moving forward (positive longitude speed)
 * - Retrograde: Moving backward (negative longitude speed)
 * - Stationary-retrograde: About to turn retrograde (speed ≈ 0, decreasing)
 * - Stationary-direct: About to turn direct (speed ≈ 0, increasing)
 */
export function classifyMotion(body: CelestialBody, jd: number): MotionState {
  const pos = getPosition(body, jd);
  const speed = pos.longitudeSpeed;

  // Check if stationary
  if (Math.abs(speed) < STATIONARY_SPEED_THRESHOLD) {
    // Determine if about to go retrograde or direct by checking speed change
    const posBefore = getPosition(body, jd - 1);
    const posAfter = getPosition(body, jd + 1);

    // Speed is becoming more negative → stationary retrograde
    // Speed is becoming more positive → stationary direct
    if (posAfter.longitudeSpeed < posBefore.longitudeSpeed) {
      return 'stationary-retrograde';
    }
    return 'stationary-direct';
  }

  return speed > 0 ? 'direct' : 'retrograde';
}

/**
 * Check if a body can retrograde.
 *
 * @param body - Celestial body
 * @returns True if body can exhibit retrograde motion
 *
 * @remarks
 * Sun and Moon never retrograde. The lunar nodes are always retrograde
 * (mean) or mostly retrograde (true). All planets Mercury through Pluto
 * retrograde.
 */
export function canRetrograde(body: CelestialBody): boolean {
  return RETROGRADE_PLANETS.includes(body);
}

/**
 * Check if a body is currently retrograde.
 *
 * @param body - Celestial body
 * @param jd - Julian Date
 * @returns True if retrograde
 */
export function isRetrograde(body: CelestialBody, jd: number): boolean {
  const pos = getPosition(body, jd);
  return pos.isRetrograde;
}

// =============================================================================
// STATION POINT DETECTION
// =============================================================================

/**
 * Find station points (where planet appears to stop) in a date range.
 *
 * @param body - Celestial body
 * @param startJD - Start of search range
 * @param endJD - End of search range
 * @param options - Frame: mean equinox of date (default) or `{ includeNutation: true }` for
 *   the true equinox, as in `celestine/events` (`nutation` is a deprecated alias)
 * @returns Array of station points
 *
 * @remarks
 * A station occurs when the planet's longitude speed crosses zero.
 * - Station Retrograde: Speed goes from positive to negative
 * - Station Direct: Speed goes from negative to positive
 *
 * @example
 * ```ts
 * const stations = findStationPoints(CelestialBody.Mercury, jdStart, jdEnd);
 * for (const station of stations) {
 *   console.log(`Mercury ${station.type} at ${station.longitude.toFixed(2)}°`);
 * }
 * ```
 */
export function findStationPoints(
  body: CelestialBody,
  startJD: number,
  endJD: number,
  options?: EventFrameOptions,
): StationPoint[] {
  // Empty/invalid ranges retain the legacy empty result; the shared solver throws.
  if (
    !canRetrograde(body) ||
    !(Number.isFinite(startJD) && Number.isFinite(endJD) && startJD <= endJD)
  )
    return [];

  // The one station solver shared with celestine/events findStations: rate sign changes
  // over the whole inclusive range, solved to 1e-7 d on getPosition's centred speed.
  // Same frame rule as the event searches (`nutation` is the deprecated alias).
  const frame = { includeNutation: options?.includeNutation ?? options?.nutation };
  return stations(
    (jd) => {
      const p = getPosition(body, jd, frame);
      return { value: p.longitude, rate: p.longitudeSpeed };
    },
    startJD,
    endJD,
    stationStep(body),
  ).map(({ jd, sample, retrograde }) => ({
    body,
    type: retrograde ? 'station-retrograde' : 'station-direct',
    jd,
    longitude: sample.value,
    date: jdToTransitDate(jd),
  }));
}

/**
 * Find the next station for a body.
 *
 * @param body - Celestial body
 * @param fromJD - Starting Julian Date
 * @param maxSearchDays - Maximum days to search
 * @param options - Frame, as in {@link findStationPoints}
 * @returns Next station point, or null if not found
 */
export function findNextStation(
  body: CelestialBody,
  fromJD: number,
  maxSearchDays: number = 365,
  options?: EventFrameOptions,
): StationPoint | null {
  return findStationPoints(body, fromJD, fromJD + maxSearchDays, options)[0] ?? null;
}

// =============================================================================
// RETROGRADE PERIOD DETECTION
// =============================================================================

/**
 * Find all retrograde periods for a body in a date range.
 *
 * @param body - Celestial body
 * @param startJD - Start of search range
 * @param endJD - End of search range
 * @param options - Frame, as in {@link findStationPoints}
 * @returns Array of retrograde periods
 *
 * @remarks
 * Each retrograde period is defined by:
 * - Station Retrograde: When retrograde begins
 * - Station Direct: When direct motion resumes
 *
 * Stations come from the shared station solver (the same instants as `findStations` in
 * `celestine/events` for the same frame). A period whose station direct lies in the range
 * is included even if its station retrograde precedes `startJD`; one still open at `endJD`
 * is not.
 *
 * @example
 * ```ts
 * const periods = findRetrogradePeriods(CelestialBody.Mercury, jdStart, jdEnd);
 * for (const period of periods) {
 *   console.log(`Mercury Rx from ${period.stationRetroJD} to ${period.stationDirectJD}`);
 *   console.log(`Duration: ${period.durationDays.toFixed(1)} days`);
 * }
 * ```
 */
export function findRetrogradePeriods(
  body: CelestialBody,
  startJD: number,
  endJD: number,
  options?: EventFrameOptions,
): RetrogradePeriod[] {
  const stations = findStationPoints(body, startJD, endJD, options);
  const periods: RetrogradePeriod[] = [];

  // Pair each station retrograde with its immediately following station direct.
  for (let i = 0; i < stations.length; i++) {
    const r = stations[i];
    const d = stations[i + 1];
    if (r.type === 'station-retrograde' && d?.type === 'station-direct')
      periods.push(period(body, r, d));
  }

  // Handle case where we start mid-retrograde
  if (stations.length > 0 && stations[0].type === 'station-direct') {
    // Currently in retrograde - find when it started
    const beforeStart = findStationPoints(body, startJD - 180, startJD, options);
    const prevStationRetro = beforeStart.filter((s) => s.type === 'station-retrograde').pop();

    if (prevStationRetro) {
      periods.unshift(period(body, prevStationRetro, stations[0]));
    }
  }

  return periods;
}

/**
 * Check if a body is currently in a retrograde period.
 *
 * @param body - Celestial body
 * @param jd - Julian Date
 * @param options - Frame, as in {@link findStationPoints}
 * @returns The retrograde period if currently retrograde, null otherwise
 */
export function getCurrentRetrogradePeriod(
  body: CelestialBody,
  jd: number,
  options?: EventFrameOptions,
): RetrogradePeriod | null {
  // Retrograde exactly when the latest station before jd is a station retrograde; deciding
  // from the same solved stations keeps the answer consistent with findRetrogradePeriods.
  const stationRetro = findStationPoints(body, jd - 180, jd, options).pop();
  if (stationRetro?.type !== 'station-retrograde') return null;

  // The station direct that ends this period
  const stationDirect = findNextStation(body, jd, 180, options);
  if (stationDirect?.type !== 'station-direct') return null;

  return period(body, stationRetro, stationDirect);
}

// =============================================================================
// RETROGRADE TRANSIT PASSES
// =============================================================================

/**
 * Information about a single pass of a transit.
 */
export interface TransitPass {
  /** Pass number (1 = first, 2 = retrograde, 3 = direct again) */
  passNumber: number;

  /** Julian Date of exact aspect */
  exactJD: number;

  /** Calendar date of exact aspect */
  exactDate: TransitDate;

  /** Longitude of transiting body at exact */
  longitude: number;

  /** Motion state at this pass */
  motionState: MotionState;

  /** Is this the retrograde pass? */
  isRetrogradePass: boolean;
}

/**
 * Find all exact passes of a transit (accounting for retrograde).
 *
 * @param body - Transiting body
 * @param natalLongitude - Natal point longitude
 * @param aspectAngle - Target aspect angle (0, 60, 90, 120, 180)
 * @param startJD - Start of search range
 * @param endJD - End of search range
 * @returns Array of transit passes
 *
 * @remarks
 * A slow outer planet transit often has 3 passes:
 * 1. First pass (direct) - initial contact
 * 2. Second pass (retrograde) - often most intense
 * 3. Third pass (direct) - final release
 *
 * Fast planets typically have only 1 pass.
 *
 * @example
 * ```ts
 * const passes = findTransitPasses(
 *   CelestialBody.Saturn,
 *   natalSunLongitude,
 *   0, // conjunction
 *   jdStart,
 *   jdEnd
 * );
 *
 * console.log(`Saturn conjunct Sun has ${passes.length} exact pass(es)`);
 * for (const pass of passes) {
 *   console.log(`  Pass ${pass.passNumber}: ${pass.motionState} on ${pass.exactDate.year}-${pass.exactDate.month}`);
 * }
 * ```
 */
export function findTransitPasses(
  body: CelestialBody,
  natalLongitude: number,
  aspectAngle: number,
  startJD: number,
  endJD: number,
): TransitPass[] {
  const passes: TransitPass[] = [];

  // Use the transit-timing module's logic to find all exact times
  // We'll implement a simplified version here
  const avgMotion = Math.abs(AVERAGE_DAILY_MOTION[body] ?? 0.1);
  const stepDays = Math.max(0.5, Math.min(7, 2 / avgMotion));

  let prevJD = startJD;
  let prevDev = calculateDeviation(body, prevJD, natalLongitude, aspectAngle);
  let currentJD = prevJD + stepDays;
  let passNumber = 1;

  while (currentJD <= endJD) {
    const currentDev = calculateDeviation(body, currentJD, natalLongitude, aspectAngle);

    // Check for sign change (crossed exact)
    if (prevDev * currentDev < 0) {
      // Find exact time
      const exactJD = findExactCrossingTime(body, natalLongitude, aspectAngle, prevJD, currentJD);
      const pos = getPosition(body, exactJD);
      const motion = classifyMotion(body, exactJD);

      passes.push({
        passNumber,
        exactJD,
        exactDate: jdToTransitDate(exactJD),
        longitude: pos.longitude,
        motionState: motion,
        isRetrogradePass: motion === 'retrograde' || motion === 'stationary-retrograde',
      });

      passNumber++;
    }

    prevJD = currentJD;
    prevDev = currentDev;
    currentJD += stepDays;
  }

  return passes;
}

/**
 * Calculate signed deviation from exact aspect.
 *
 * @internal
 */
function calculateDeviation(
  body: CelestialBody,
  jd: number,
  natalLongitude: number,
  aspectAngle: number,
): number {
  const pos = getPosition(body, jd);
  let diff = pos.longitude - natalLongitude;

  // Normalize to -180 to +180
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;

  return diff - aspectAngle;
}

/**
 * Find exact crossing time using binary search.
 *
 * @internal
 */
function findExactCrossingTime(
  body: CelestialBody,
  natalLongitude: number,
  aspectAngle: number,
  startJD: number,
  endJD: number,
): number {
  const tolerance = 0.0001; // degrees
  let lo = startJD;
  let hi = endJD;

  for (let i = 0; i < MAX_BINARY_SEARCH_ITERATIONS; i++) {
    const midJD = (lo + hi) / 2;
    const dev = calculateDeviation(body, midJD, natalLongitude, aspectAngle);

    if (Math.abs(dev) < tolerance) {
      return midJD;
    }

    const devLo = calculateDeviation(body, lo, natalLongitude, aspectAngle);
    if (devLo * dev < 0) {
      hi = midJD;
    } else {
      lo = midJD;
    }

    if (hi - lo < 0.0001) {
      break;
    }
  }

  return (lo + hi) / 2;
}

/**
 * Count the expected number of passes for a transit.
 *
 * @param body - Transiting body
 * @param transitDurationDays - Estimated transit duration
 * @returns Expected number of exact passes (1, 3, or 5)
 *
 * @remarks
 * Fast planets (Sun, Moon, Mercury, Venus, Mars) typically have 1 pass.
 * Slow planets (Jupiter through Pluto) may have 3 passes if the transit
 * spans a retrograde period. Very slow planets or very long transits
 * can have 5 passes.
 */
export function estimatePassCount(body: CelestialBody, transitDurationDays: number): number {
  if (!canRetrograde(body)) {
    return 1;
  }

  // In RETROGRADE_PLANETS order: Mercury through Pluto, then Chiron.
  const retro = [21, 42, 72, 121, 140, 150, 158, 160, 140][RETROGRADE_PLANETS.indexOf(body)] ?? 60;

  // If transit is shorter than retrograde period, likely 1 pass
  if (transitDurationDays < retro * 0.5) {
    return 1;
  }

  // If transit spans roughly one retrograde cycle, 3 passes
  if (transitDurationDays < retro * 2) {
    return 3;
  }

  // Very long transits can have 5 passes
  return 5;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Solve the longitude crossings bounding a retrograde shadow, in TT Julian Dates.
 *
 * The pre-shadow starts at the last crossing of the station-direct longitude before
 * station retrograde; the post-shadow ends at the first crossing of the
 * station-retrograde longitude after station direct. Roots are refined to within 1e-6 day.
 *
 * @param period - Period computed in the same frame as options
 * @param options - Mean equinox of date by default; includeNutation selects the true
 *   equinox of date (nutation is a deprecated alias), as in findStationPoints
 * @returns Shadow times and the forward zodiac arc from station-direct longitude
 *   (shadowZoneStart) to station-retrograde longitude (shadowZoneEnd). Start greater
 *   than end means the zone crosses 0° Aries.
 * @throws RangeError if no crossing is found within 800 days of either station
 *   (longer than any planetary synodic period).
 */
export function getRetrogradeShadow(
  period: RetrogradePeriod,
  options?: EventFrameOptions,
): {
  preShadowStartJD: number;
  postShadowEndJD: number;
  shadowZoneStart: number;
  shadowZoneEnd: number;
} {
  const frame = { includeNutation: options?.includeNutation ?? options?.nutation };
  const crossing = (start: number, target: number, direction: number): number => {
    const f = (offset: number) => ({
      value: 0,
      rate: wrap(getPosition(period.body, start + direction * offset, frame).longitude - target),
    });
    const step = stationStep(period.body);
    let left = f(0).rate;
    for (let b = step; b <= 800; b += step) {
      const right = f(b).rate;
      if (left * right <= 0 && Math.abs(left - right) < 180)
        return start + direction * stationIn(f, b - step, b, left, right)[0];
      left = right;
    }
    throw new RangeError();
  };
  return {
    preShadowStartJD: crossing(period.stationRetroJD, period.stationDirectLongitude, -1),
    postShadowEndJD: crossing(period.stationDirectJD, period.stationRetroLongitude, 1),
    shadowZoneStart: period.stationDirectLongitude,
    shadowZoneEnd: period.stationRetroLongitude,
  };
}

/**
 * Format a retrograde period for display.
 *
 * @param period - Retrograde period
 * @returns Human-readable string
 */
export function formatRetrogradePeriod(period: RetrogradePeriod): string {
  const startDate = jdToTransitDate(period.stationRetroJD);
  const endDate = jdToTransitDate(period.stationDirectJD);

  const startStr = formatDate(startDate);
  const endStr = formatDate(endDate);

  return `${BODY_NAMES[period.body]} Rx: ${startStr} to ${endStr} (${period.durationDays.toFixed(0)} days)\n  Station Rx at ${period.stationRetroLongitude.toFixed(2)}°\n  Station Direct at ${period.stationDirectLongitude.toFixed(2)}°`;
}

/**
 * Format a station point for display.
 *
 * @param station - Station point
 * @returns Human-readable string
 */
export function formatStationPoint(station: StationPoint): string {
  const date = station.date;
  const dateStr = formatDate(date);
  const typeStr = station.type === 'station-retrograde' ? 'Stations Retrograde' : 'Stations Direct';

  return `${BODY_NAMES[station.body]} ${typeStr} at ${station.longitude.toFixed(2)}° on ${dateStr}`;
}

/**
 * Get summary of all retrograde periods for multiple bodies.
 *
 * @param bodies - Array of celestial bodies
 * @param startJD - Start of search range
 * @param endJD - End of search range
 * @param options - Frame, as in {@link findStationPoints}
 * @returns Map from body name to its retrograde periods (bodies without one are left out).
 * JSON.stringify gives a plain object keyed by body name, as Object.fromEntries(map).
 */
export function getAllRetrogradePeriods(
  bodies: CelestialBody[],
  startJD: number,
  endJD: number,
  options?: EventFrameOptions,
): Map<string, RetrogradePeriod[]> {
  const result = new Map<string, RetrogradePeriod[]>();

  for (const body of bodies) {
    const periods = findRetrogradePeriods(body, startJD, endJD, options);
    if (periods.length > 0) {
      result.set(BODY_NAMES[body], periods);
    }
  }

  return Object.assign(result, { toJSON: () => Object.fromEntries(result) });
}
