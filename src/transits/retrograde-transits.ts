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

import { CelestialBody, getPosition } from '../ephemeris/positions.js';
import {
  AVERAGE_DAILY_MOTION,
  BODY_NAMES,
  MAX_BINARY_SEARCH_ITERATIONS,
  RETROGRADE_PLANETS,
  STATIONARY_SPEED_THRESHOLD,
} from './constants.js';
import { jdToTransitDate } from './transit-detection.js';
import type { RetrogradePeriod, StationPoint, TransitDate } from './types.js';

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
): StationPoint[] {
  // Bodies that don't retrograde have no stations
  if (!canRetrograde(body)) {
    return [];
  }

  const stations: StationPoint[] = [];

  // Step size based on typical motion speed
  const avgMotion = Math.abs(AVERAGE_DAILY_MOTION[body] ?? 0.1);
  const stepDays = Math.max(1, Math.min(14, 5 / avgMotion));

  let prevJD = startJD;
  let prevPos = getPosition(body, prevJD);
  let currentJD = prevJD + stepDays;

  while (currentJD <= endJD) {
    const currentPos = getPosition(body, currentJD);

    // Check for sign change in speed (station)
    if (prevPos.longitudeSpeed * currentPos.longitudeSpeed < 0) {
      // Speed crossed zero - find exact station
      const stationJD = findExactStationTime(body, prevJD, currentJD);
      const stationPos = getPosition(body, stationJD);

      const stationType: 'station-retrograde' | 'station-direct' =
        prevPos.longitudeSpeed > 0 ? 'station-retrograde' : 'station-direct';

      stations.push({
        body,
        type: stationType,
        jd: stationJD,
        longitude: stationPos.longitude,
        date: jdToTransitDate(stationJD),
      });
    }

    prevJD = currentJD;
    prevPos = currentPos;
    currentJD += stepDays;
  }

  return stations;
}

/**
 * Find the exact time of a station using binary search.
 *
 * @internal
 */
function findExactStationTime(body: CelestialBody, startJD: number, endJD: number): number {
  const tolerance = STATIONARY_SPEED_THRESHOLD;
  let lo = startJD;
  let hi = endJD;

  for (let i = 0; i < MAX_BINARY_SEARCH_ITERATIONS; i++) {
    const midJD = (lo + hi) / 2;
    const pos = getPosition(body, midJD);

    if (Math.abs(pos.longitudeSpeed) < tolerance) {
      return midJD;
    }

    // Determine which half to search based on speed sign
    const posLo = getPosition(body, lo);
    if (posLo.longitudeSpeed * pos.longitudeSpeed < 0) {
      // Sign change is in lower half
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
 * Find the next station for a body.
 *
 * @param body - Celestial body
 * @param fromJD - Starting Julian Date
 * @param maxSearchDays - Maximum days to search
 * @returns Next station point, or null if not found
 */
export function findNextStation(
  body: CelestialBody,
  fromJD: number,
  maxSearchDays: number = 365,
): StationPoint | null {
  const stations = findStationPoints(body, fromJD, fromJD + maxSearchDays);
  return stations.length > 0 ? stations[0] : null;
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
 * @returns Array of retrograde periods
 *
 * @remarks
 * Each retrograde period is defined by:
 * - Station Retrograde: When retrograde begins
 * - Station Direct: When direct motion resumes
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
): RetrogradePeriod[] {
  if (!canRetrograde(body)) {
    return [];
  }

  const stations = findStationPoints(body, startJD, endJD);
  const periods: RetrogradePeriod[] = [];

  // Pair up station-retrograde with following station-direct
  for (let i = 0; i < stations.length; i++) {
    if (stations[i].type === 'station-retrograde') {
      // Find matching station-direct
      const stationRetro = stations[i];
      const stationDirect = stations[i + 1]?.type === 'station-direct' ? stations[i + 1] : null;

      if (stationDirect) {
        periods.push({
          body,
          stationRetroJD: stationRetro.jd,
          stationDirectJD: stationDirect.jd,
          stationRetroLongitude: stationRetro.longitude,
          stationDirectLongitude: stationDirect.longitude,
          durationDays: stationDirect.jd - stationRetro.jd,
        });
      }
    }
  }

  // Handle case where we start mid-retrograde
  if (stations.length > 0 && stations[0].type === 'station-direct') {
    // Currently in retrograde - find when it started
    const beforeStart = findStationPoints(body, startJD - 180, startJD);
    const prevStationRetro = beforeStart.filter((s) => s.type === 'station-retrograde').pop();

    if (prevStationRetro) {
      periods.unshift({
        body,
        stationRetroJD: prevStationRetro.jd,
        stationDirectJD: stations[0].jd,
        stationRetroLongitude: prevStationRetro.longitude,
        stationDirectLongitude: stations[0].longitude,
        durationDays: stations[0].jd - prevStationRetro.jd,
      });
    }
  }

  return periods;
}

/**
 * Check if a body is currently in a retrograde period.
 *
 * @param body - Celestial body
 * @param jd - Julian Date
 * @returns The retrograde period if currently retrograde, null otherwise
 */
export function getCurrentRetrogradePeriod(
  body: CelestialBody,
  jd: number,
): RetrogradePeriod | null {
  if (!isRetrograde(body, jd)) {
    return null;
  }

  // Find the station retrograde that started this period
  const beforeStations = findStationPoints(body, jd - 180, jd);
  const stationRetro = beforeStations.filter((s) => s.type === 'station-retrograde').pop();

  // Find the station direct that will end this period
  const afterStations = findStationPoints(body, jd, jd + 180);
  const stationDirect = afterStations.find((s) => s.type === 'station-direct');

  if (!stationRetro || !stationDirect) {
    return null;
  }

  return {
    body,
    stationRetroJD: stationRetro.jd,
    stationDirectJD: stationDirect.jd,
    stationRetroLongitude: stationRetro.longitude,
    stationDirectLongitude: stationDirect.longitude,
    durationDays: stationDirect.jd - stationRetro.jd,
  };
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

  // Approximate retrograde period lengths
  const retroPeriodDays: Partial<Record<CelestialBody, number>> = {
    [CelestialBody.Mercury]: 21,
    [CelestialBody.Venus]: 42,
    [CelestialBody.Mars]: 72,
    [CelestialBody.Jupiter]: 121,
    [CelestialBody.Saturn]: 140,
    [CelestialBody.Uranus]: 150,
    [CelestialBody.Neptune]: 158,
    [CelestialBody.Pluto]: 160,
    [CelestialBody.Chiron]: 140,
  };

  const retro = retroPeriodDays[body] ?? 60;

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
 * Get the "shadow" period before/after retrograde.
 *
 * @param period - Retrograde period
 * @returns Object with pre-shadow and post-shadow JDs
 *
 * @remarks
 * The retrograde "shadow" is the zone the planet transits three times:
 * - Pre-shadow: From when planet first reaches the station-direct degree
 * - Post-shadow: Until planet passes the station-retrograde degree
 */
export function getRetrogradeShadow(period: RetrogradePeriod): {
  preShadowStartJD: number;
  postShadowEndJD: number;
  shadowZoneStart: number;
  shadowZoneEnd: number;
} {
  // The shadow zone is between the two station longitudes
  const shadowZoneStart = Math.min(period.stationRetroLongitude, period.stationDirectLongitude);
  const shadowZoneEnd = Math.max(period.stationRetroLongitude, period.stationDirectLongitude);

  // Estimate pre-shadow based on typical motion before retrograde
  const avgMotion = Math.abs(AVERAGE_DAILY_MOTION[period.body] ?? 0.1);
  const shadowDegrees = shadowZoneEnd - shadowZoneStart;
  const shadowDays = shadowDegrees / avgMotion;

  return {
    preShadowStartJD: period.stationRetroJD - shadowDays,
    postShadowEndJD: period.stationDirectJD + shadowDays,
    shadowZoneStart,
    shadowZoneEnd,
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

  const startStr = `${startDate.year}-${String(startDate.month).padStart(2, '0')}-${String(startDate.day).padStart(2, '0')}`;
  const endStr = `${endDate.year}-${String(endDate.month).padStart(2, '0')}-${String(endDate.day).padStart(2, '0')}`;

  return (
    `${BODY_NAMES[period.body]} Rx: ${startStr} to ${endStr} (${period.durationDays.toFixed(0)} days)\n` +
    `  Station Rx at ${period.stationRetroLongitude.toFixed(2)}°\n` +
    `  Station Direct at ${period.stationDirectLongitude.toFixed(2)}°`
  );
}

/**
 * Format a station point for display.
 *
 * @param station - Station point
 * @returns Human-readable string
 */
export function formatStationPoint(station: StationPoint): string {
  const date = station.date;
  const dateStr = `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
  const typeStr = station.type === 'station-retrograde' ? 'Stations Retrograde' : 'Stations Direct';

  return `${BODY_NAMES[station.body]} ${typeStr} at ${station.longitude.toFixed(2)}° on ${dateStr}`;
}

/**
 * Get summary of all retrograde periods for multiple bodies.
 *
 * @param bodies - Array of celestial bodies
 * @param startJD - Start of search range
 * @param endJD - End of search range
 * @returns Object mapping body name to its retrograde periods
 */
export function getAllRetrogradePeriods(
  bodies: CelestialBody[],
  startJD: number,
  endJD: number,
): Map<string, RetrogradePeriod[]> {
  const result = new Map<string, RetrogradePeriod[]>();

  for (const body of bodies) {
    const periods = findRetrogradePeriods(body, startJD, endJD);
    if (periods.length > 0) {
      result.set(BODY_NAMES[body], periods);
    }
  }

  return result;
}
