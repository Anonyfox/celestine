/**
 * Transit Timing Module
 *
 * Functions for calculating exact transit times using binary search
 * and determining when transits enter/leave orb.
 *
 * @module transits/transit-timing
 *
 * @remarks
 * This module provides precise timing calculations for transits:
 * - Find the exact moment a transiting body perfects an aspect
 * - Determine when a transit enters/leaves the orb
 * - Handle multiple exact passes due to retrograde motion
 *
 * The core algorithm uses binary search (bisection method) for
 * numerical precision, achieving ~0.36 arcsecond accuracy.
 *
 * @see IMPL.md Section 5.2 for algorithm details
 */

import { type CelestialBody, getPosition } from '../ephemeris/positions.js';
import {
  AVERAGE_DAILY_MOTION,
  EXACT_TIME_TOLERANCE,
  MAX_BINARY_SEARCH_ITERATIONS,
} from './constants.js';
import {
  angularSeparation,
  jdToTransitDate,
  normalizeAngle,
  signedAngularDifference,
} from './transit-detection.js';
import type { Transit, TransitDate, TransitTiming } from './types.js';

// =============================================================================
// CORE SEPARATION CALCULATION
// =============================================================================

/**
 * Calculate the signed deviation from an exact aspect.
 *
 * @param transitLongitude - Current longitude of transiting body
 * @param natalLongitude - Longitude of natal point
 * @param aspectAngle - Target aspect angle (0, 60, 90, 120, 180)
 * @returns Signed deviation from exact (negative = before exact, positive = after)
 *
 * @remarks
 * This is used by binary search to detect sign changes that indicate
 * the exact aspect crossing. The sign of the deviation tells us which
 * side of exact we are on.
 */
export function calculateSignedDeviation(
  transitLongitude: number,
  natalLongitude: number,
  aspectAngle: number,
): number {
  // Get the signed difference (where the transiting body is relative to natal)
  const signedDiff = signedAngularDifference(natalLongitude, transitLongitude);

  // Normalize to 0-360 range for comparison
  let normalizedDiff = signedDiff;
  if (normalizedDiff < 0) normalizedDiff += 360;

  // Calculate separation (0-180)
  const separation = angularSeparation(transitLongitude, natalLongitude);

  // Calculate deviation from aspect
  let deviation = separation - aspectAngle;

  // For aspects other than conjunction (0°) and opposition (180°),
  // we need to determine the "direction" of approach
  if (aspectAngle !== 0 && aspectAngle !== 180) {
    // Check if we're approaching or past the aspect
    // The sign depends on which "direction" would reach the aspect first
    if (normalizedDiff < aspectAngle || normalizedDiff > 360 - aspectAngle) {
      // Still approaching from one direction
      deviation = separation - aspectAngle;
    } else {
      // May have passed, check the complement
      const complementAspect = 360 - aspectAngle;
      if (Math.abs(normalizedDiff - complementAspect) < Math.abs(normalizedDiff - aspectAngle)) {
        deviation = separation - aspectAngle;
      }
    }
  }

  return deviation;
}

/**
 * Check if an aspect crossing exists in a time window.
 *
 * @param body - Transiting body
 * @param natalLongitude - Natal point longitude
 * @param aspectAngle - Target aspect angle
 * @param startJD - Start of search window
 * @param endJD - End of search window
 * @returns True if there's a crossing in this window
 */
export function hasCrossingInWindow(
  body: CelestialBody,
  natalLongitude: number,
  aspectAngle: number,
  startJD: number,
  endJD: number,
): boolean {
  const pos1 = getPosition(body, startJD);
  const pos2 = getPosition(body, endJD);

  const dev1 = calculateSignedDeviation(pos1.longitude, natalLongitude, aspectAngle);
  const dev2 = calculateSignedDeviation(pos2.longitude, natalLongitude, aspectAngle);

  // A crossing exists if the deviation changes sign
  return dev1 * dev2 < 0;
}

// =============================================================================
// BINARY SEARCH FOR EXACT TIME
// =============================================================================

/**
 * Find the exact time when a transit aspect becomes perfect using binary search.
 *
 * @param body - Transiting celestial body
 * @param natalLongitude - Natal point longitude (0-360°)
 * @param aspectAngle - Target aspect angle (0, 60, 90, 120, 180, etc.)
 * @param startJD - Start of search window (Julian Date)
 * @param endJD - End of search window (Julian Date)
 * @param tolerance - Angular tolerance in degrees (default: 0.0001°)
 * @returns Julian Date of exact aspect, or null if no crossing in window
 *
 * @remarks
 * Uses binary search (bisection method) to find the moment when the
 * transit becomes exact within the specified tolerance.
 *
 * Algorithm:
 * 1. Check if there's a zero-crossing in the window
 * 2. Bisect the interval, keeping the half with the crossing
 * 3. Repeat until deviation is within tolerance
 *
 * @example
 * ```ts
 * // Find exact Saturn conjunction to natal Sun
 * const exactJD = findExactTransitTime(
 *   CelestialBody.Saturn,
 *   280.37, // natal Sun longitude
 *   0,      // conjunction = 0°
 *   2460665, // start JD
 *   2460695  // end JD (30 days later)
 * );
 * ```
 */
export function findExactTransitTime(
  body: CelestialBody,
  natalLongitude: number,
  aspectAngle: number,
  startJD: number,
  endJD: number,
  tolerance: number = EXACT_TIME_TOLERANCE,
): number | null {
  // Get initial positions and deviations
  const pos1 = getPosition(body, startJD);
  const pos2 = getPosition(body, endJD);

  const dev1 = calculateSignedDeviation(pos1.longitude, natalLongitude, aspectAngle);
  const dev2 = calculateSignedDeviation(pos2.longitude, natalLongitude, aspectAngle);

  // Check if we're already at exact
  if (Math.abs(dev1) < tolerance) {
    return startJD;
  }
  if (Math.abs(dev2) < tolerance) {
    return endJD;
  }

  // Check if there's a crossing in this window
  // A crossing requires a sign change in the deviation
  if (dev1 * dev2 > 0) {
    // No crossing - deviations have same sign
    return null;
  }

  // Binary search
  let lo = startJD;
  let hi = endJD;
  let sepLo = dev1;

  for (let i = 0; i < MAX_BINARY_SEARCH_ITERATIONS; i++) {
    const midJD = (lo + hi) / 2;
    const posMid = getPosition(body, midJD);
    const devMid = calculateSignedDeviation(posMid.longitude, natalLongitude, aspectAngle);

    // Check if we're within tolerance
    if (Math.abs(devMid) < tolerance) {
      return midJD;
    }

    // Determine which half contains the crossing
    if (sepLo * devMid < 0) {
      // Crossing is in lower half
      hi = midJD;
    } else {
      // Crossing is in upper half
      lo = midJD;
      sepLo = devMid;
    }

    // If interval is very small, return midpoint
    if (hi - lo < 0.00001) {
      // ~0.86 seconds
      return midJD;
    }
  }

  // Return best approximation
  return (lo + hi) / 2;
}

/**
 * Find multiple exact times in a window (for retrograde transits).
 *
 * @param body - Transiting body
 * @param natalLongitude - Natal point longitude
 * @param aspectAngle - Target aspect angle
 * @param startJD - Start of search window
 * @param endJD - End of search window
 * @param scanStep - Days between scans (default: based on body speed)
 * @returns Array of Julian Dates for each exact aspect
 *
 * @remarks
 * A slow outer planet can make 3 (or more) exact passes over a natal
 * point due to retrograde motion. This function scans the entire window
 * and finds all crossings.
 */
export function findAllExactTimes(
  body: CelestialBody,
  natalLongitude: number,
  aspectAngle: number,
  startJD: number,
  endJD: number,
  scanStep?: number,
): number[] {
  const exactTimes: number[] = [];

  // Determine scan step based on body speed
  const avgMotion = Math.abs(AVERAGE_DAILY_MOTION[body] ?? 0.1);
  const step = scanStep ?? Math.max(1, Math.min(7, 0.5 / avgMotion));

  let windowStart = startJD;

  while (windowStart < endJD) {
    const windowEnd = Math.min(windowStart + step, endJD);

    // Check for crossing in this sub-window
    const exactJD = findExactTransitTime(body, natalLongitude, aspectAngle, windowStart, windowEnd);

    if (exactJD !== null) {
      // Avoid duplicates (within 1 day)
      if (exactTimes.length === 0 || exactJD - exactTimes[exactTimes.length - 1] > 1) {
        exactTimes.push(exactJD);
      }
    }

    windowStart = windowEnd;
  }

  return exactTimes;
}

// =============================================================================
// ORB ENTRY/EXIT FINDING
// =============================================================================

/**
 * Find when a transit enters the orb.
 *
 * @param body - Transiting body
 * @param natalLongitude - Natal point longitude
 * @param aspectAngle - Target aspect angle
 * @param orb - Orb size in degrees
 * @param searchStartJD - Start of search (before expected entry)
 * @param searchEndJD - End of search
 * @returns Julian Date when entering orb, or null if not found
 *
 * @remarks
 * Searches backward from the exact time (or forward from search start)
 * to find when the deviation first becomes less than the orb.
 */
export function findOrbEntry(
  body: CelestialBody,
  natalLongitude: number,
  aspectAngle: number,
  orb: number,
  searchStartJD: number,
  searchEndJD: number,
): number | null {
  const avgMotion = Math.abs(AVERAGE_DAILY_MOTION[body] ?? 0.1);
  const step = Math.max(0.5, 0.25 / avgMotion); // Finer step for entry detection

  let prevJD = searchStartJD;
  const prevPos = getPosition(body, prevJD);
  const prevSep = angularSeparation(prevPos.longitude, natalLongitude);
  let prevDev = Math.abs(prevSep - aspectAngle);

  // Check if we're already within orb at the start
  if (prevDev <= orb) {
    return searchStartJD;
  }

  let currentJD = prevJD + step;

  while (currentJD <= searchEndJD) {
    const currentPos = getPosition(body, currentJD);
    const currentSep = angularSeparation(currentPos.longitude, natalLongitude);
    const currentDev = Math.abs(currentSep - aspectAngle);

    // Check if we crossed into orb
    if (prevDev > orb && currentDev <= orb) {
      // Binary search for exact entry
      return findBoundaryTime(body, natalLongitude, aspectAngle, orb, prevJD, currentJD, 'entry');
    }

    prevJD = currentJD;
    prevDev = currentDev;
    currentJD += step;
  }

  return null;
}

/**
 * Find when a transit exits the orb.
 *
 * @param body - Transiting body
 * @param natalLongitude - Natal point longitude
 * @param aspectAngle - Target aspect angle
 * @param orb - Orb size in degrees
 * @param searchStartJD - Start of search (after exact)
 * @param searchEndJD - End of search
 * @returns Julian Date when exiting orb, or null if not found
 */
export function findOrbExit(
  body: CelestialBody,
  natalLongitude: number,
  aspectAngle: number,
  orb: number,
  searchStartJD: number,
  searchEndJD: number,
): number | null {
  const avgMotion = Math.abs(AVERAGE_DAILY_MOTION[body] ?? 0.1);
  const step = Math.max(0.5, 0.25 / avgMotion);

  let prevJD = searchStartJD;
  const prevPos = getPosition(body, prevJD);
  const prevSep = angularSeparation(prevPos.longitude, natalLongitude);
  let prevDev = Math.abs(prevSep - aspectAngle);

  let currentJD = prevJD + step;

  while (currentJD <= searchEndJD) {
    const currentPos = getPosition(body, currentJD);
    const currentSep = angularSeparation(currentPos.longitude, natalLongitude);
    const currentDev = Math.abs(currentSep - aspectAngle);

    // Check if we crossed out of orb
    if (prevDev <= orb && currentDev > orb) {
      return findBoundaryTime(body, natalLongitude, aspectAngle, orb, prevJD, currentJD, 'exit');
    }

    prevJD = currentJD;
    prevDev = currentDev;
    currentJD += step;
  }

  // If we never exited, return end of search window
  if (prevDev <= orb) {
    return searchEndJD;
  }

  return null;
}

/**
 * Binary search for orb boundary (entry or exit point).
 *
 * @internal
 */
function findBoundaryTime(
  body: CelestialBody,
  natalLongitude: number,
  aspectAngle: number,
  orb: number,
  startJD: number,
  endJD: number,
  boundaryType: 'entry' | 'exit',
): number {
  const tolerance = 0.001; // 0.001° precision for boundary
  let lo = startJD;
  let hi = endJD;

  for (let i = 0; i < 30; i++) {
    const midJD = (lo + hi) / 2;
    const pos = getPosition(body, midJD);
    const sep = angularSeparation(pos.longitude, natalLongitude);
    const dev = Math.abs(sep - aspectAngle);

    const isWithinOrb = dev <= orb;

    if (boundaryType === 'entry') {
      // For entry: we want the moment when we go from outside to inside
      if (isWithinOrb) {
        hi = midJD;
      } else {
        lo = midJD;
      }
    } else {
      // For exit: we want the moment when we go from inside to outside
      if (isWithinOrb) {
        lo = midJD;
      } else {
        hi = midJD;
      }
    }

    if (Math.abs(dev - orb) < tolerance) {
      return midJD;
    }
  }

  return (lo + hi) / 2;
}

// =============================================================================
// COMPLETE TRANSIT TIMING
// =============================================================================

/**
 * Calculate complete timing information for a transit.
 *
 * @param transit - The detected transit
 * @param searchStartJD - Start of search window
 * @param searchEndJD - End of search window
 * @returns Complete transit timing information
 *
 * @remarks
 * This provides the full lifecycle of a transit:
 * - When it enters orb
 * - All exact passes (may be multiple due to retrograde)
 * - When it leaves orb
 * - Total duration
 */
export function calculateTransitTiming(
  transit: Transit,
  searchStartJD: number,
  searchEndJD: number,
): TransitTiming | null {
  // We need to extract natal longitude from the transit context
  // This requires knowing the natal point's longitude
  // For now, we'll calculate from the transit's separation and aspect angle

  const natalLongitude = normalizeAngle(
    transit.separation > transit.aspectAngle
      ? transit.separation - transit.aspectAngle
      : transit.aspectAngle - transit.separation,
  );

  // Calculate using the body enum
  const body = transit.transitingBodyEnum;
  const aspectAngle = transit.aspectAngle;
  const orb = transit.orb;

  // Find all exact times
  const exactJDs = findAllExactTimes(body, natalLongitude, aspectAngle, searchStartJD, searchEndJD);

  if (exactJDs.length === 0) {
    return null;
  }

  // Find orb entry (search before first exact)
  const entrySearchStart = exactJDs[0] - 180; // Up to 6 months before
  const enterOrbJD =
    findOrbEntry(body, natalLongitude, aspectAngle, orb, entrySearchStart, exactJDs[0]) ??
    searchStartJD;

  // Find orb exit (search after last exact)
  const lastExactJD = exactJDs[exactJDs.length - 1];
  const exitSearchEnd = lastExactJD + 180; // Up to 6 months after
  const leaveOrbJD =
    findOrbExit(body, natalLongitude, aspectAngle, orb, lastExactJD, exitSearchEnd) ?? searchEndJD;

  // Determine if any pass was during retrograde
  let hasRetrogradePass = false;
  const exactDates: TransitDate[] = [];

  for (const jd of exactJDs) {
    const pos = getPosition(body, jd);
    if (pos.isRetrograde) {
      hasRetrogradePass = true;
    }
    exactDates.push(jdToTransitDate(jd));
  }

  return {
    transit,
    enterOrbJD,
    enterOrbDate: jdToTransitDate(enterOrbJD),
    exactJDs,
    exactDates,
    leaveOrbJD,
    leaveOrbDate: jdToTransitDate(leaveOrbJD),
    durationDays: leaveOrbJD - enterOrbJD,
    exactPasses: exactJDs.length,
    hasRetrogradePass,
  };
}

/**
 * Calculate transit timing from explicit natal longitude.
 *
 * @param body - Transiting body
 * @param natalLongitude - Natal point longitude
 * @param aspectAngle - Target aspect angle
 * @param orb - Orb to use
 * @param searchStartJD - Search window start
 * @param searchEndJD - Search window end
 * @returns Transit timing or null if not found
 *
 * @example
 * ```ts
 * // Find timing for Saturn square natal Sun
 * const timing = findTransitTiming(
 *   CelestialBody.Saturn,
 *   280.37, // natal Sun
 *   90,     // square
 *   3,      // 3° orb
 *   2460000,
 *   2461000
 * );
 *
 * if (timing) {
 *   console.log(`Enters orb: ${timing.enterOrbDate.year}-${timing.enterOrbDate.month}`);
 *   console.log(`${timing.exactPasses} exact pass(es)`);
 *   console.log(`Duration: ${timing.durationDays.toFixed(1)} days`);
 * }
 * ```
 */
export function findTransitTiming(
  body: CelestialBody,
  natalLongitude: number,
  aspectAngle: number,
  orb: number,
  searchStartJD: number,
  searchEndJD: number,
): Omit<TransitTiming, 'transit'> | null {
  // Find all exact times
  const exactJDs = findAllExactTimes(body, natalLongitude, aspectAngle, searchStartJD, searchEndJD);

  if (exactJDs.length === 0) {
    return null;
  }

  // Estimate search buffers based on body speed and orb
  const avgMotion = Math.abs(AVERAGE_DAILY_MOTION[body] ?? 0.1);
  const estimatedBuffer = Math.ceil((orb / avgMotion) * 2);

  // Find orb entry
  const entrySearchStart = Math.max(searchStartJD, exactJDs[0] - estimatedBuffer);
  const enterOrbJD =
    findOrbEntry(body, natalLongitude, aspectAngle, orb, entrySearchStart, exactJDs[0]) ??
    searchStartJD;

  // Find orb exit
  const lastExactJD = exactJDs[exactJDs.length - 1];
  const exitSearchEnd = Math.min(searchEndJD, lastExactJD + estimatedBuffer);
  const leaveOrbJD =
    findOrbExit(body, natalLongitude, aspectAngle, orb, lastExactJD, exitSearchEnd) ?? searchEndJD;

  // Check for retrograde during passes
  let hasRetrogradePass = false;
  const exactDates: TransitDate[] = [];

  for (const jd of exactJDs) {
    const pos = getPosition(body, jd);
    if (pos.isRetrograde) {
      hasRetrogradePass = true;
    }
    exactDates.push(jdToTransitDate(jd));
  }

  return {
    enterOrbJD,
    enterOrbDate: jdToTransitDate(enterOrbJD),
    exactJDs,
    exactDates,
    leaveOrbJD,
    leaveOrbDate: jdToTransitDate(leaveOrbJD),
    durationDays: leaveOrbJD - enterOrbJD,
    exactPasses: exactJDs.length,
    hasRetrogradePass,
  };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Estimate when the next aspect will occur.
 *
 * @param body - Transiting body
 * @param natalLongitude - Natal point longitude
 * @param aspectAngle - Target aspect angle
 * @param fromJD - Starting Julian Date
 * @returns Estimated Julian Date of next aspect, or null
 *
 * @remarks
 * This provides a rough estimate (within a few days) for when an aspect
 * will occur. Use findExactTransitTime for precision.
 */
export function estimateNextAspect(
  body: CelestialBody,
  natalLongitude: number,
  aspectAngle: number,
  fromJD: number,
): number | null {
  const pos = getPosition(body, fromJD);
  const currentLong = pos.longitude;
  const speed = pos.longitudeSpeed;

  // Calculate target longitude for this aspect
  // For direct motion: target = natal + aspectAngle
  // For retrograde: target = natal - aspectAngle
  const target1 = normalizeAngle(natalLongitude + aspectAngle);
  const target2 = normalizeAngle(natalLongitude - aspectAngle);

  // Choose target based on motion direction and current position
  let targetLong: number;

  if (speed >= 0) {
    // Direct motion - find next target ahead
    const dist1 = normalizeAngle(target1 - currentLong);
    const dist2 = normalizeAngle(target2 - currentLong);
    targetLong = dist1 < dist2 ? target1 : target2;
  } else {
    // Retrograde - find next target behind
    const dist1 = normalizeAngle(currentLong - target1);
    const dist2 = normalizeAngle(currentLong - target2);
    targetLong = dist1 < dist2 ? target1 : target2;
  }

  // Calculate distance to target
  let distance: number;
  if (speed >= 0) {
    distance = normalizeAngle(targetLong - currentLong);
  } else {
    distance = normalizeAngle(currentLong - targetLong);
  }

  // Estimate time based on average motion
  const avgMotion = Math.abs(AVERAGE_DAILY_MOTION[body] ?? speed);
  if (avgMotion < 0.0001) return null;

  const estimatedDays = distance / avgMotion;

  return fromJD + estimatedDays;
}

/**
 * Get the search step size appropriate for a body.
 *
 * @param body - Celestial body
 * @returns Recommended step in days
 */
export function getSearchStepForBody(body: CelestialBody): number {
  const avgMotion = Math.abs(AVERAGE_DAILY_MOTION[body] ?? 0.1);

  // For fast bodies (Moon), use smaller steps
  if (avgMotion > 5) return 0.25; // 6 hours for Moon
  if (avgMotion > 1) return 1; // Daily for Sun, Mercury, Venus
  if (avgMotion > 0.1) return 3; // Every 3 days for Mars
  if (avgMotion > 0.01) return 7; // Weekly for Jupiter through Pluto

  return 7;
}

/**
 * Format a transit timing result for display.
 *
 * @param timing - Transit timing result
 * @returns Human-readable summary
 */
export function formatTransitTiming(
  timing: TransitTiming | Omit<TransitTiming, 'transit'>,
): string {
  const enter = timing.enterOrbDate;
  const exit = timing.leaveOrbDate;

  const lines: string[] = [
    `Enters orb: ${enter.year}-${String(enter.month).padStart(2, '0')}-${String(enter.day).padStart(2, '0')}`,
    `Exact passes: ${timing.exactPasses}`,
  ];

  for (let i = 0; i < timing.exactDates.length; i++) {
    const d = timing.exactDates[i];
    lines.push(
      `  Pass ${i + 1}: ${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`,
    );
  }

  lines.push(
    `Leaves orb: ${exit.year}-${String(exit.month).padStart(2, '0')}-${String(exit.day).padStart(2, '0')}`,
    `Duration: ${timing.durationDays.toFixed(1)} days`,
  );

  if (timing.hasRetrogradePass) {
    lines.push('(Includes retrograde period)');
  }

  return lines.join('\n');
}
