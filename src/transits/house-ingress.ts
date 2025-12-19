/**
 * House Ingress Module
 *
 * Functions for detecting when transiting planets enter and exit natal houses.
 *
 * @module transits/house-ingress
 *
 * @remarks
 * A house ingress occurs when a transiting planet crosses a house cusp.
 * This module provides:
 *
 * - **Ingress Detection**: Determine if a planet has crossed a cusp
 * - **Next Ingress Finding**: When will the next house change occur
 * - **Ingress Timeline**: All house changes in a date range
 *
 * House ingresses are significant in transit analysis as they show when
 * planetary energies shift from one life area to another.
 *
 * @see IMPL.md Section 5.4 for algorithm details
 */

import { type CelestialBody, getPosition } from '../ephemeris/positions.js';
import { getHousePosition } from '../houses/house-utils.js';
import { AVERAGE_DAILY_MOTION, BODY_NAMES, MAX_BINARY_SEARCH_ITERATIONS } from './constants.js';
import { jdToTransitDate, normalizeAngle } from './transit-detection.js';
import type { HouseIngress } from './types.js';

// =============================================================================
// CORE INGRESS DETECTION
// =============================================================================

/**
 * Detect if an ingress occurred between two positions.
 *
 * @param houseCusps - Array of 12 house cusp longitudes
 * @param currentLongitude - Current position of the body
 * @param previousLongitude - Previous position of the body
 * @param body - The celestial body (for naming)
 * @param isRetrograde - Whether the body is in retrograde motion
 * @returns HouseIngress if a cusp was crossed, null otherwise
 *
 * @remarks
 * This compares the house placement at two times to determine if
 * a house boundary was crossed. It handles both direct and retrograde
 * motion, as well as the 12→1 house wraparound.
 *
 * @example
 * ```ts
 * const cusps = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
 * const ingress = detectHouseIngress(cusps, 35, 25, CelestialBody.Saturn, false);
 * // Returns: { body: 'Saturn', house: 2, previousHouse: 1, direction: 'entering', isRetrograde: false }
 * ```
 */
export function detectHouseIngress(
  houseCusps: number[],
  currentLongitude: number,
  previousLongitude: number,
  body: CelestialBody,
  isRetrograde: boolean,
): HouseIngress | null {
  if (houseCusps.length !== 12) {
    throw new Error('houseCusps must contain exactly 12 elements');
  }

  const currentHouse = getHousePosition(currentLongitude, houseCusps);
  const previousHouse = getHousePosition(previousLongitude, houseCusps);

  // No ingress if house hasn't changed
  if (currentHouse === previousHouse) {
    return null;
  }

  // Determine direction - for direct motion, moving from lower to higher house
  // is "entering" (normal progression), for retrograde it's "exiting"
  let direction: 'entering' | 'exiting';

  // Handle wraparound (12→1 or 1→12)
  const isForwardMove =
    (currentHouse > previousHouse && currentHouse - previousHouse < 6) ||
    (currentHouse < previousHouse && previousHouse - currentHouse > 6);

  if (isRetrograde) {
    // Retrograde: backwards motion through houses
    direction = isForwardMove ? 'exiting' : 'entering';
  } else {
    // Direct: forwards motion through houses
    direction = isForwardMove ? 'entering' : 'exiting';
  }

  return {
    body: BODY_NAMES[body],
    bodyEnum: body,
    house: currentHouse,
    previousHouse,
    direction,
    isRetrograde,
  };
}

/**
 * Check if a house ingress occurs between two Julian Dates.
 *
 * @param body - Celestial body to check
 * @param houseCusps - Array of 12 house cusp longitudes
 * @param startJD - Start of time window
 * @param endJD - End of time window
 * @returns HouseIngress with timing info if found, null otherwise
 */
export function checkIngressInWindow(
  body: CelestialBody,
  houseCusps: number[],
  startJD: number,
  endJD: number,
): HouseIngress | null {
  const pos1 = getPosition(body, startJD);
  const pos2 = getPosition(body, endJD);

  const house1 = getHousePosition(pos1.longitude, houseCusps);
  const house2 = getHousePosition(pos2.longitude, houseCusps);

  if (house1 === house2) {
    return null;
  }

  // Ingress detected - find exact time
  const exactJD = findExactIngressTime(body, houseCusps, startJD, endJD, house2);

  const posAtIngress = getPosition(body, exactJD);

  return {
    body: BODY_NAMES[body],
    bodyEnum: body,
    house: house2,
    previousHouse: house1,
    direction: posAtIngress.isRetrograde ? 'exiting' : 'entering',
    isRetrograde: posAtIngress.isRetrograde,
    ingressJD: exactJD,
    ingressDate: jdToTransitDate(exactJD),
  };
}

// =============================================================================
// EXACT INGRESS TIME FINDING
// =============================================================================

/**
 * Find the exact time a planet crosses into a specific house.
 *
 * @param body - Celestial body
 * @param houseCusps - Array of 12 house cusp longitudes
 * @param startJD - Start of search window
 * @param endJD - End of search window
 * @param targetHouse - The house being entered (1-12)
 * @returns Julian Date of the ingress
 *
 * @remarks
 * Uses binary search to find the moment when the planet crosses
 * the cusp of the target house.
 */
export function findExactIngressTime(
  body: CelestialBody,
  houseCusps: number[],
  startJD: number,
  endJD: number,
  targetHouse: number,
): number {
  // The cusp of the target house
  const targetCusp = houseCusps[targetHouse - 1];

  let lo = startJD;
  let hi = endJD;

  for (let i = 0; i < MAX_BINARY_SEARCH_ITERATIONS; i++) {
    const midJD = (lo + hi) / 2;
    const posMid = getPosition(body, midJD);
    const houseMid = getHousePosition(posMid.longitude, houseCusps);

    if (houseMid === targetHouse) {
      // We're in the target house - search earlier
      hi = midJD;
    } else {
      // Not yet in target house - search later
      lo = midJD;
    }

    // If interval is very small, refine using cusp proximity
    if (hi - lo < 0.0001) {
      // ~8.6 seconds
      break;
    }
  }

  // Fine-tune using cusp proximity
  return refineCuspCrossing(body, targetCusp, lo, hi);
}

/**
 * Refine the cusp crossing time using cusp proximity.
 *
 * @internal
 */
function refineCuspCrossing(
  body: CelestialBody,
  cuspLongitude: number,
  lo: number,
  hi: number,
): number {
  const tolerance = 0.001; // 0.001° precision

  for (let i = 0; i < 20; i++) {
    const midJD = (lo + hi) / 2;
    const posMid = getPosition(body, midJD);
    const distToCusp = signedDistanceToCusp(posMid.longitude, cuspLongitude);

    if (Math.abs(distToCusp) < tolerance) {
      return midJD;
    }

    // Determine which side of cusp we're on based on direction
    if (posMid.longitudeSpeed > 0) {
      // Direct motion
      if (distToCusp < 0) {
        lo = midJD; // Before cusp
      } else {
        hi = midJD; // After cusp
      }
    } else {
      // Retrograde motion
      if (distToCusp > 0) {
        lo = midJD;
      } else {
        hi = midJD;
      }
    }
  }

  return (lo + hi) / 2;
}

/**
 * Calculate signed distance to a cusp (positive = past cusp, negative = before).
 *
 * @internal
 */
function signedDistanceToCusp(longitude: number, cuspLongitude: number): number {
  let diff = normalizeAngle(longitude) - normalizeAngle(cuspLongitude);
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return diff;
}

// =============================================================================
// NEXT INGRESS FINDING
// =============================================================================

/**
 * Find when a body will next enter a different house.
 *
 * @param body - Celestial body
 * @param houseCusps - Array of 12 house cusp longitudes
 * @param fromJD - Starting Julian Date
 * @param maxSearchDays - Maximum days to search (default: 365)
 * @returns HouseIngress with timing, or null if not found
 *
 * @example
 * ```ts
 * const nextIngress = findNextIngress(
 *   CelestialBody.Saturn,
 *   houseCusps,
 *   currentJD
 * );
 *
 * if (nextIngress) {
 *   console.log(`Saturn enters house ${nextIngress.house} on ${nextIngress.ingressDate?.year}`);
 * }
 * ```
 */
export function findNextIngress(
  body: CelestialBody,
  houseCusps: number[],
  fromJD: number,
  maxSearchDays: number = 365,
): HouseIngress | null {
  const avgMotion = Math.abs(AVERAGE_DAILY_MOTION[body] ?? 0.1);
  // Step size based on speed - larger steps for slower planets
  const stepDays = Math.max(0.5, Math.min(7, 5 / avgMotion));

  let prevJD = fromJD;
  const prevPos = getPosition(body, prevJD);
  let prevHouse = getHousePosition(prevPos.longitude, houseCusps);

  let currentJD = prevJD + stepDays;
  const endJD = fromJD + maxSearchDays;

  while (currentJD <= endJD) {
    const currentPos = getPosition(body, currentJD);
    const currentHouse = getHousePosition(currentPos.longitude, houseCusps);

    if (currentHouse !== prevHouse) {
      // Ingress found - get exact time
      const exactJD = findExactIngressTime(body, houseCusps, prevJD, currentJD, currentHouse);
      const posAtIngress = getPosition(body, exactJD);

      return {
        body: BODY_NAMES[body],
        bodyEnum: body,
        house: currentHouse,
        previousHouse: prevHouse,
        direction: posAtIngress.isRetrograde ? 'exiting' : 'entering',
        isRetrograde: posAtIngress.isRetrograde,
        ingressJD: exactJD,
        ingressDate: jdToTransitDate(exactJD),
      };
    }

    prevJD = currentJD;
    prevHouse = currentHouse;
    currentJD += stepDays;
  }

  return null;
}

/**
 * Find when a body will enter a specific house.
 *
 * @param body - Celestial body
 * @param houseCusps - House cusp longitudes
 * @param targetHouse - House to find entry to (1-12)
 * @param fromJD - Starting Julian Date
 * @param maxSearchDays - Maximum days to search
 * @returns HouseIngress or null if not found
 */
export function findIngressToHouse(
  body: CelestialBody,
  houseCusps: number[],
  targetHouse: number,
  fromJD: number,
  maxSearchDays: number = 365 * 2,
): HouseIngress | null {
  const avgMotion = Math.abs(AVERAGE_DAILY_MOTION[body] ?? 0.1);
  const stepDays = Math.max(1, Math.min(14, 10 / avgMotion));

  let prevJD = fromJD;
  const prevPos = getPosition(body, prevJD);
  let prevHouse = getHousePosition(prevPos.longitude, houseCusps);

  let currentJD = prevJD + stepDays;
  const endJD = fromJD + maxSearchDays;

  while (currentJD <= endJD) {
    const currentPos = getPosition(body, currentJD);
    const currentHouse = getHousePosition(currentPos.longitude, houseCusps);

    if (currentHouse === targetHouse && prevHouse !== targetHouse) {
      // Found entry to target house
      const exactJD = findExactIngressTime(body, houseCusps, prevJD, currentJD, targetHouse);
      const posAtIngress = getPosition(body, exactJD);

      return {
        body: BODY_NAMES[body],
        bodyEnum: body,
        house: targetHouse,
        previousHouse: prevHouse,
        direction: posAtIngress.isRetrograde ? 'exiting' : 'entering',
        isRetrograde: posAtIngress.isRetrograde,
        ingressJD: exactJD,
        ingressDate: jdToTransitDate(exactJD),
      };
    }

    prevJD = currentJD;
    prevHouse = currentHouse;
    currentJD += stepDays;
  }

  return null;
}

// =============================================================================
// INGRESS TIMELINE
// =============================================================================

/**
 * Find all house ingresses for a body in a date range.
 *
 * @param body - Celestial body
 * @param houseCusps - House cusp longitudes
 * @param startJD - Start of search range
 * @param endJD - End of search range
 * @returns Array of all ingresses, sorted by date
 *
 * @example
 * ```ts
 * const ingresses = calculateAllIngresses(
 *   CelestialBody.Mars,
 *   houseCusps,
 *   jdStart,
 *   jdEnd
 * );
 *
 * for (const ing of ingresses) {
 *   console.log(`Mars enters house ${ing.house} on ${ing.ingressDate?.year}-${ing.ingressDate?.month}`);
 * }
 * ```
 */
export function calculateAllIngresses(
  body: CelestialBody,
  houseCusps: number[],
  startJD: number,
  endJD: number,
): HouseIngress[] {
  const ingresses: HouseIngress[] = [];

  const avgMotion = Math.abs(AVERAGE_DAILY_MOTION[body] ?? 0.1);
  const stepDays = Math.max(0.25, Math.min(7, 3 / avgMotion));

  let prevJD = startJD;
  const prevPos = getPosition(body, prevJD);
  let prevHouse = getHousePosition(prevPos.longitude, houseCusps);

  let currentJD = prevJD + stepDays;

  while (currentJD <= endJD) {
    const currentPos = getPosition(body, currentJD);
    const currentHouse = getHousePosition(currentPos.longitude, houseCusps);

    if (currentHouse !== prevHouse) {
      const exactJD = findExactIngressTime(body, houseCusps, prevJD, currentJD, currentHouse);
      const posAtIngress = getPosition(body, exactJD);

      ingresses.push({
        body: BODY_NAMES[body],
        bodyEnum: body,
        house: currentHouse,
        previousHouse: prevHouse,
        direction: posAtIngress.isRetrograde ? 'exiting' : 'entering',
        isRetrograde: posAtIngress.isRetrograde,
        ingressJD: exactJD,
        ingressDate: jdToTransitDate(exactJD),
      });

      prevHouse = currentHouse;
    }

    prevJD = currentJD;
    currentJD += stepDays;
  }

  return ingresses;
}

/**
 * Find all ingresses for multiple bodies.
 *
 * @param bodies - Array of celestial bodies
 * @param houseCusps - House cusp longitudes
 * @param startJD - Start of search range
 * @param endJD - End of search range
 * @returns Array of all ingresses, sorted by date
 */
export function calculateAllIngressesForBodies(
  bodies: CelestialBody[],
  houseCusps: number[],
  startJD: number,
  endJD: number,
): HouseIngress[] {
  const allIngresses: HouseIngress[] = [];

  for (const body of bodies) {
    const bodyIngresses = calculateAllIngresses(body, houseCusps, startJD, endJD);
    allIngresses.push(...bodyIngresses);
  }

  // Sort by date
  allIngresses.sort((a, b) => (a.ingressJD ?? 0) - (b.ingressJD ?? 0));

  return allIngresses;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get the current house position for a body.
 *
 * @param body - Celestial body
 * @param houseCusps - House cusp longitudes
 * @param jd - Julian Date
 * @returns House number (1-12)
 */
export function getBodyHouse(body: CelestialBody, houseCusps: number[], jd: number): number {
  const pos = getPosition(body, jd);
  return getHousePosition(pos.longitude, houseCusps);
}

/**
 * Get positions and house placements for multiple bodies.
 *
 * @param bodies - Array of celestial bodies
 * @param houseCusps - House cusp longitudes
 * @param jd - Julian Date
 * @returns Map of body name to house number
 */
export function getBodyHouses(
  bodies: CelestialBody[],
  houseCusps: number[],
  jd: number,
): Map<string, number> {
  const result = new Map<string, number>();

  for (const body of bodies) {
    result.set(BODY_NAMES[body], getBodyHouse(body, houseCusps, jd));
  }

  return result;
}

/**
 * Format a house ingress for display.
 *
 * @param ingress - The house ingress
 * @returns Human-readable string
 */
export function formatHouseIngress(ingress: HouseIngress): string {
  const date = ingress.ingressDate;
  const dateStr = date
    ? `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`
    : 'unknown date';

  const retro = ingress.isRetrograde ? ' ℞' : '';
  const direction = ingress.direction === 'entering' ? '→' : '←';

  return `${ingress.body}${retro} ${direction} House ${ingress.house} (from ${ingress.previousHouse}) on ${dateStr}`;
}

/**
 * Group ingresses by house.
 *
 * @param ingresses - Array of ingresses
 * @returns Object mapping house number to ingresses
 */
export function groupIngressesByHouse(ingresses: HouseIngress[]): Record<number, HouseIngress[]> {
  const grouped: Record<number, HouseIngress[]> = {};

  for (const ingress of ingresses) {
    if (!grouped[ingress.house]) {
      grouped[ingress.house] = [];
    }
    grouped[ingress.house].push(ingress);
  }

  return grouped;
}

/**
 * Group ingresses by body.
 *
 * @param ingresses - Array of ingresses
 * @returns Object mapping body name to ingresses
 */
export function groupIngressesByBody(ingresses: HouseIngress[]): Record<string, HouseIngress[]> {
  const grouped: Record<string, HouseIngress[]> = {};

  for (const ingress of ingresses) {
    if (!grouped[ingress.body]) {
      grouped[ingress.body] = [];
    }
    grouped[ingress.body].push(ingress);
  }

  return grouped;
}
