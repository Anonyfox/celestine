/**
 * Transit Detection Module
 *
 * Core algorithms for detecting transits between transiting planets
 * and natal chart positions.
 *
 * @module transits/transit-detection
 *
 * @remarks
 * A transit is detected when a transiting body's longitude forms
 * an aspect (angular relationship) with a natal point's longitude
 * within the configured orb tolerance.
 *
 * @see IMPL.md Section 5.1 for algorithm details
 */

import type { AspectType } from '../aspects/types.js';
import { type CelestialBody, getPosition } from '../ephemeris/positions.js';
import {
  ANGLE_ORB_EXTENSION,
  ASPECT_ANGLES,
  ASPECT_SYMBOLS,
  BODY_NAMES,
  DEFAULT_EXACT_THRESHOLD,
  DEFAULT_TRANSIT_CONFIG,
  DEFAULT_TRANSIT_ORBS,
  LUMINARIES,
  LUMINARY_ORB_EXTENSION,
  MAJOR_TRANSIT_ASPECTS,
  OUTER_PLANET_ORB_EXTENSION,
  SLOW_PLANETS,
  STATIONARY_SPEED_THRESHOLD,
} from './constants.js';
import type {
  NatalPoint,
  Transit,
  TransitConfig,
  TransitDate,
  TransitingBody,
  TransitPhase,
  TransitResult,
  TransitSummary,
} from './types.js';

// =============================================================================
// ANGULAR CALCULATIONS
// =============================================================================

/**
 * Calculate the shortest angular separation between two longitudes.
 *
 * @param long1 - First longitude (0-360°)
 * @param long2 - Second longitude (0-360°)
 * @returns Separation in degrees (0-180°)
 *
 * @example
 * ```ts
 * angularSeparation(10, 350); // 20° (not 340°)
 * angularSeparation(90, 180); // 90°
 * ```
 */
export function angularSeparation(long1: number, long2: number): number {
  let diff = Math.abs(long1 - long2);
  if (diff > 180) {
    diff = 360 - diff;
  }
  return diff;
}

/**
 * Calculate the signed angular difference between two longitudes.
 * Positive if long2 is "ahead" of long1 (in direct motion direction).
 *
 * @param long1 - First longitude (0-360°)
 * @param long2 - Second longitude (0-360°)
 * @returns Signed difference (-180 to +180°)
 */
export function signedAngularDifference(long1: number, long2: number): number {
  let diff = long2 - long1;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return diff;
}

/**
 * Normalize an angle to 0-360° range.
 *
 * @param angle - Any angle in degrees
 * @returns Normalized angle (0-360°)
 */
export function normalizeAngle(angle: number): number {
  let normalized = angle % 360;
  if (normalized < 0) normalized += 360;
  return normalized;
}

/**
 * Get the zodiac sign index (0-11) from a longitude.
 *
 * @param longitude - Ecliptic longitude (0-360°)
 * @returns Sign index (0=Aries, 11=Pisces)
 */
export function getSignIndex(longitude: number): number {
  return Math.floor(normalizeAngle(longitude) / 30);
}

// =============================================================================
// ORB CALCULATION
// =============================================================================

/**
 * Get the effective orb for a transit aspect.
 *
 * @param aspectType - The aspect type
 * @param natalPoint - The natal point being aspected
 * @param transitBodyEnum - The transiting body
 * @param config - Transit configuration (for custom orbs)
 * @returns Effective orb in degrees
 *
 * @remarks
 * The effective orb is the base orb plus any extensions for:
 * - Luminaries (Sun, Moon) as natal or transiting body
 * - Angles (ASC, MC) as natal point
 * - Outer planets (Saturn through Pluto) as transiting body
 */
export function getEffectiveOrb(
  aspectType: AspectType,
  natalPoint: NatalPoint,
  transitBodyEnum: CelestialBody,
  config?: TransitConfig,
): number {
  // Start with configured orb or default
  let orb = config?.orbs?.[aspectType] ?? DEFAULT_TRANSIT_ORBS[aspectType] ?? 2;

  // Extend for luminaries as transiting body
  if (LUMINARIES.includes(transitBodyEnum)) {
    orb += LUMINARY_ORB_EXTENSION;
  }

  // Extend for luminaries as natal point
  if (natalPoint.type === 'luminary') {
    orb += LUMINARY_ORB_EXTENSION;
  }

  // Extend for angles as natal point
  if (natalPoint.type === 'angle') {
    orb += ANGLE_ORB_EXTENSION;
  }

  // Extend for slow outer planets
  if (SLOW_PLANETS.includes(transitBodyEnum)) {
    orb += OUTER_PLANET_ORB_EXTENSION;
  }

  return orb;
}

// =============================================================================
// PHASE DETECTION
// =============================================================================

/**
 * Determine the phase of a transit (applying, exact, or separating).
 *
 * @param transitLongitude - Current longitude of transiting body
 * @param natalLongitude - Longitude of natal point
 * @param transitSpeed - Daily motion of transiting body (degrees/day)
 * @param aspectAngle - The exact aspect angle (0, 60, 90, 120, 180)
 * @param deviation - Current deviation from exact aspect
 * @param exactThreshold - Threshold for marking as 'exact'
 * @returns Transit phase
 *
 * @remarks
 * - Applying: The aspect is forming (deviation is decreasing)
 * - Exact: The aspect is at or very near exact
 * - Separating: The aspect is waning (deviation is increasing)
 *
 * The determination depends on:
 * 1. Whether the planet is direct or retrograde
 * 2. Whether the current separation is less than or greater than the aspect angle
 */
export function getTransitPhase(
  transitLongitude: number,
  natalLongitude: number,
  transitSpeed: number,
  aspectAngle: number,
  deviation: number,
  exactThreshold: number = DEFAULT_EXACT_THRESHOLD,
): TransitPhase {
  // If very close to exact, mark as exact
  if (deviation <= exactThreshold) {
    return 'exact';
  }

  // If stationary, treat as exact (maximum intensity)
  if (Math.abs(transitSpeed) < STATIONARY_SPEED_THRESHOLD) {
    return 'exact';
  }

  // Calculate current separation
  const separation = angularSeparation(transitLongitude, natalLongitude);

  // Determine if we're "before" or "after" exact aspect
  // For conjunction (0°): before means separation > 0, after means passed through 0
  // For other aspects: before means separation < angle, after means separation > angle
  const isPastExact = separation > aspectAngle;

  // For direct motion (positive speed):
  // - If separation < angle, we're approaching (applying)
  // - If separation > angle, we've passed (separating)
  // For retrograde motion (negative speed):
  // - The logic is reversed

  if (transitSpeed > 0) {
    // Direct motion
    // Need to consider if the natal point is ahead or behind
    const signedDiff = signedAngularDifference(transitLongitude, natalLongitude);

    if (aspectAngle === 0) {
      // Conjunction: applying if approaching from behind
      return signedDiff > 0 ? 'applying' : 'separating';
    }

    if (aspectAngle === 180) {
      // Opposition: always within 180° by definition
      return separation < 180 === isPastExact ? 'separating' : 'applying';
    }

    // For other aspects, check if moving toward or away from aspect angle
    // If separation is increasing from aspect angle, we're separating
    return isPastExact ? 'separating' : 'applying';
  }
  // Retrograde motion - reverse the logic
  if (aspectAngle === 0) {
    const signedDiff = signedAngularDifference(transitLongitude, natalLongitude);
    return signedDiff < 0 ? 'applying' : 'separating';
  }

  return isPastExact ? 'applying' : 'separating';
}

/**
 * Calculate transit strength as a percentage.
 * 100% = exact, 0% = at orb edge.
 *
 * @param deviation - Deviation from exact aspect in degrees
 * @param orb - Orb size in degrees
 * @returns Strength as percentage (0-100)
 */
export function calculateTransitStrength(deviation: number, orb: number): number {
  if (orb <= 0) return 0;
  const strength = (1 - deviation / orb) * 100;
  return Math.max(0, Math.min(100, strength));
}

/**
 * Check if an aspect is out-of-sign (dissociate).
 *
 * @param transitLongitude - Transiting body longitude
 * @param natalLongitude - Natal point longitude
 * @param aspectAngle - The aspect angle
 * @returns True if the aspect crosses sign boundaries unexpectedly
 *
 * @remarks
 * An out-of-sign aspect occurs when two bodies are within orb of an aspect
 * but their signs don't match the expected relationship.
 * Example: Sun at 29° Aries, Saturn at 1° Capricorn = 88° (within square orb)
 * but Aries-Capricorn is not a square relationship (should be Aries-Cancer).
 */
export function isOutOfSign(
  transitLongitude: number,
  natalLongitude: number,
  aspectAngle: number,
): boolean {
  const transitSign = getSignIndex(transitLongitude);
  const natalSign = getSignIndex(natalLongitude);

  // Expected sign separation for each aspect type
  const expectedSignSeparation = Math.round(aspectAngle / 30) % 12;

  // Actual sign separation (0-11)
  let actualSignSeparation = Math.abs(transitSign - natalSign);
  if (actualSignSeparation > 6) {
    actualSignSeparation = 12 - actualSignSeparation;
  }

  // Check both possible separations (aspect angle and its complement)
  const complementSeparation = (12 - expectedSignSeparation) % 12;

  return (
    actualSignSeparation !== expectedSignSeparation && actualSignSeparation !== complementSeparation
  );
}

// =============================================================================
// SINGLE TRANSIT DETECTION
// =============================================================================

/**
 * Detect if a transit aspect exists between a transiting body and natal point.
 *
 * @param natalPoint - The natal point to check
 * @param transitingBody - The transiting body
 * @param config - Transit configuration
 * @returns Detected transit or null if no transit within orb
 *
 * @example
 * ```ts
 * const transit = detectTransit(
 *   { name: 'Sun', longitude: 280.37, type: 'luminary' },
 *   { name: 'Saturn', body: CelestialBody.Saturn, longitude: 282.5, longitudeSpeed: 0.03, isRetrograde: false }
 * );
 * // Returns conjunction transit if Saturn is within orb of natal Sun
 * ```
 */
export function detectTransit(
  natalPoint: NatalPoint,
  transitingBody: TransitingBody,
  config?: TransitConfig,
): Transit | null {
  const aspectTypes = config?.aspectTypes ?? MAJOR_TRANSIT_ASPECTS;
  const includeOutOfSign = config?.includeOutOfSign ?? true;
  const minimumStrength = config?.minimumStrength ?? 0;
  const exactThreshold = config?.exactThreshold ?? DEFAULT_EXACT_THRESHOLD;

  // Check each aspect type
  for (const aspectType of aspectTypes) {
    const aspectAngle = ASPECT_ANGLES[aspectType];
    const orb = getEffectiveOrb(aspectType, natalPoint, transitingBody.body, config);

    // Calculate separation and deviation
    const separation = angularSeparation(transitingBody.longitude, natalPoint.longitude);
    const deviation = Math.abs(separation - aspectAngle);

    // Check if within orb
    if (deviation <= orb) {
      const strength = calculateTransitStrength(deviation, orb);

      // Skip if below minimum strength
      if (strength < minimumStrength) {
        continue;
      }

      // Check out-of-sign
      const outOfSign = isOutOfSign(transitingBody.longitude, natalPoint.longitude, aspectAngle);

      // Skip out-of-sign if not included
      if (outOfSign && !includeOutOfSign) {
        continue;
      }

      // Determine phase
      const phase = getTransitPhase(
        transitingBody.longitude,
        natalPoint.longitude,
        transitingBody.longitudeSpeed,
        aspectAngle,
        deviation,
        exactThreshold,
      );

      return {
        transitingBody: transitingBody.name,
        transitingBodyEnum: transitingBody.body,
        natalPoint: natalPoint.name,
        aspectType,
        symbol: ASPECT_SYMBOLS[aspectType],
        aspectAngle,
        separation,
        deviation,
        orb,
        phase,
        strength,
        isRetrograde: transitingBody.isRetrograde,
        isOutOfSign: outOfSign,
      };
    }
  }

  return null;
}

/**
 * Find all aspects between a transiting body and natal point.
 * (A body might form multiple aspects, e.g., if orbs overlap)
 *
 * @param natalPoint - The natal point
 * @param transitingBody - The transiting body
 * @param config - Configuration
 * @returns Array of detected transits (usually 0 or 1, rarely 2)
 */
export function findAllTransits(
  natalPoint: NatalPoint,
  transitingBody: TransitingBody,
  config?: TransitConfig,
): Transit[] {
  const transits: Transit[] = [];
  const aspectTypes = config?.aspectTypes ?? MAJOR_TRANSIT_ASPECTS;
  const includeOutOfSign = config?.includeOutOfSign ?? true;
  const minimumStrength = config?.minimumStrength ?? 0;
  const exactThreshold = config?.exactThreshold ?? DEFAULT_EXACT_THRESHOLD;

  for (const aspectType of aspectTypes) {
    const aspectAngle = ASPECT_ANGLES[aspectType];
    const orb = getEffectiveOrb(aspectType, natalPoint, transitingBody.body, config);

    const separation = angularSeparation(transitingBody.longitude, natalPoint.longitude);
    const deviation = Math.abs(separation - aspectAngle);

    if (deviation <= orb) {
      const strength = calculateTransitStrength(deviation, orb);

      if (strength < minimumStrength) {
        continue;
      }

      const outOfSign = isOutOfSign(transitingBody.longitude, natalPoint.longitude, aspectAngle);

      if (outOfSign && !includeOutOfSign) {
        continue;
      }

      const phase = getTransitPhase(
        transitingBody.longitude,
        natalPoint.longitude,
        transitingBody.longitudeSpeed,
        aspectAngle,
        deviation,
        exactThreshold,
      );

      transits.push({
        transitingBody: transitingBody.name,
        transitingBodyEnum: transitingBody.body,
        natalPoint: natalPoint.name,
        aspectType,
        symbol: ASPECT_SYMBOLS[aspectType],
        aspectAngle,
        separation,
        deviation,
        orb,
        phase,
        strength,
        isRetrograde: transitingBody.isRetrograde,
        isOutOfSign: outOfSign,
      });
    }
  }

  return transits;
}

// =============================================================================
// BULK TRANSIT DETECTION
// =============================================================================

/**
 * Get current positions of transiting bodies from ephemeris.
 *
 * @param jd - Julian Date
 * @param bodies - Bodies to get positions for
 * @returns Array of transiting body data
 */
export function getTransitingBodies(
  jd: number,
  bodies: readonly CelestialBody[] = DEFAULT_TRANSIT_CONFIG.transitingBodies,
): TransitingBody[] {
  return bodies.map((body) => {
    const position = getPosition(body, jd);
    return {
      name: BODY_NAMES[body],
      body,
      longitude: position.longitude,
      longitudeSpeed: position.longitudeSpeed,
      isRetrograde: position.isRetrograde,
      signIndex: getSignIndex(position.longitude),
    };
  });
}

/**
 * Detect all active transits between multiple bodies and natal points.
 *
 * @param natalPoints - Array of natal chart positions
 * @param transitingBodies - Array of current transiting positions
 * @param config - Transit configuration
 * @returns Array of all detected transits
 */
export function detectAllTransits(
  natalPoints: NatalPoint[],
  transitingBodies: TransitingBody[],
  config?: TransitConfig,
): Transit[] {
  const transits: Transit[] = [];

  for (const natalPoint of natalPoints) {
    for (const transitingBody of transitingBodies) {
      const transit = detectTransit(natalPoint, transitingBody, config);
      if (transit) {
        transits.push(transit);
      }
    }
  }

  // Sort by strength (strongest first)
  transits.sort((a, b) => b.strength - a.strength);

  return transits;
}

// =============================================================================
// RESULT AGGREGATION
// =============================================================================

/**
 * Group transits by natal point.
 *
 * @param transits - Array of transits
 * @returns Object mapping natal point name to its transits
 */
export function groupByNatalPoint(transits: Transit[]): Record<string, Transit[]> {
  const grouped: Record<string, Transit[]> = {};

  for (const transit of transits) {
    if (!grouped[transit.natalPoint]) {
      grouped[transit.natalPoint] = [];
    }
    grouped[transit.natalPoint].push(transit);
  }

  return grouped;
}

/**
 * Group transits by transiting body.
 *
 * @param transits - Array of transits
 * @returns Object mapping body name to its transits
 */
export function groupByTransitingBody(transits: Transit[]): Record<string, Transit[]> {
  const grouped: Record<string, Transit[]> = {};

  for (const transit of transits) {
    if (!grouped[transit.transitingBody]) {
      grouped[transit.transitingBody] = [];
    }
    grouped[transit.transitingBody].push(transit);
  }

  return grouped;
}

/**
 * Generate summary statistics for transits.
 *
 * @param transits - Array of transits
 * @returns Summary statistics
 */
export function summarizeTransits(transits: Transit[]): TransitSummary {
  const byAspect: Partial<Record<AspectType, number>> = {};
  let applying = 0;
  let separating = 0;
  let exact = 0;
  let retrograde = 0;
  let strongest: Transit | undefined;

  for (const transit of transits) {
    // Count by aspect type
    byAspect[transit.aspectType] = (byAspect[transit.aspectType] ?? 0) + 1;

    // Count by phase
    if (transit.phase === 'applying') applying++;
    else if (transit.phase === 'separating') separating++;
    else exact++;

    // Count retrograde
    if (transit.isRetrograde) retrograde++;

    // Track strongest
    if (!strongest || transit.strength > strongest.strength) {
      strongest = transit;
    }
  }

  return {
    total: transits.length,
    byAspect,
    applying,
    separating,
    exact,
    retrograde,
    strongest,
  };
}

/**
 * Convert Julian Date to TransitDate.
 *
 * @param jd - Julian Date
 * @returns Calendar date representation
 */
export function jdToTransitDate(jd: number): TransitDate {
  // Algorithm from Meeus "Astronomical Algorithms"
  const Z = Math.floor(jd + 0.5);
  const F = jd + 0.5 - Z;

  let A: number;
  if (Z < 2299161) {
    A = Z;
  } else {
    const alpha = Math.floor((Z - 1867216.25) / 36524.25);
    A = Z + 1 + alpha - Math.floor(alpha / 4);
  }

  const B = A + 1524;
  const C = Math.floor((B - 122.1) / 365.25);
  const D = Math.floor(365.25 * C);
  const E = Math.floor((B - D) / 30.6001);

  const day = B - D - Math.floor(30.6001 * E);
  const month = E < 14 ? E - 1 : E - 13;
  const year = month > 2 ? C - 4716 : C - 4715;

  const totalHours = F * 24;
  const hour = Math.floor(totalHours);
  const totalMinutes = (totalHours - hour) * 60;
  const minute = Math.floor(totalMinutes);
  const second = Math.floor((totalMinutes - minute) * 60);

  return { year, month, day, hour, minute, second };
}

// =============================================================================
// MAIN API
// =============================================================================

/**
 * Calculate all transits at a specific moment.
 *
 * @param natalPoints - Natal chart positions
 * @param jd - Julian Date to calculate transits for
 * @param config - Configuration options
 * @returns Complete transit result
 *
 * @example
 * ```ts
 * const natalPoints = [
 *   { name: 'Sun', longitude: 280.37, type: 'luminary' },
 *   { name: 'Moon', longitude: 223.32, type: 'luminary' },
 *   { name: 'ASC', longitude: 101.65, type: 'angle' },
 * ];
 *
 * const result = calculateTransits(natalPoints, 2460665.0);
 *
 * for (const transit of result.transits) {
 *   console.log(`${transit.transitingBody} ${transit.symbol} ${transit.natalPoint}`);
 * }
 * ```
 */
export function calculateTransits(
  natalPoints: NatalPoint[],
  jd: number,
  config?: TransitConfig,
): TransitResult {
  // Merge config with defaults
  const fullConfig: Required<TransitConfig> = {
    aspectTypes: config?.aspectTypes ?? [...MAJOR_TRANSIT_ASPECTS],
    orbs: config?.orbs ?? {},
    transitingBodies: config?.transitingBodies ?? [...DEFAULT_TRANSIT_CONFIG.transitingBodies],
    includeHouseIngress: config?.includeHouseIngress ?? false,
    calculateExactTimes: config?.calculateExactTimes ?? false,
    minimumStrength: config?.minimumStrength ?? 0,
    includeOutOfSign: config?.includeOutOfSign ?? true,
    exactThreshold: config?.exactThreshold ?? DEFAULT_EXACT_THRESHOLD,
  };

  // Get current positions of transiting bodies
  const transitingBodies = getTransitingBodies(jd, fullConfig.transitingBodies);

  // Detect all transits
  const transits = detectAllTransits(natalPoints, transitingBodies, fullConfig);

  // Group and summarize
  const byNatalPoint = groupByNatalPoint(transits);
  const byTransitingBody = groupByTransitingBody(transits);
  const summary = summarizeTransits(transits);

  return {
    julianDate: jd,
    date: jdToTransitDate(jd),
    transits,
    byNatalPoint,
    byTransitingBody,
    summary,
    config: fullConfig,
  };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Format a transit for display.
 *
 * @param transit - The transit to format
 * @returns Human-readable string
 *
 * @example
 * ```ts
 * formatTransit(transit); // "Saturn □ Sun (1.5°, 25%, applying)"
 * ```
 */
export function formatTransit(transit: Transit): string {
  const retro = transit.isRetrograde ? ' ℞' : '';
  const oos = transit.isOutOfSign ? ' [OOS]' : '';
  return (
    `${transit.transitingBody}${retro} ${transit.symbol} ${transit.natalPoint} ` +
    `(${transit.deviation.toFixed(2)}°, ${transit.strength.toFixed(0)}%, ${transit.phase})${oos}`
  );
}

/**
 * Get transits to a specific natal point.
 *
 * @param result - Transit result
 * @param natalPointName - Name of natal point
 * @returns Array of transits to that point
 */
export function getTransitsToPoint(result: TransitResult, natalPointName: string): Transit[] {
  return result.byNatalPoint[natalPointName] ?? [];
}

/**
 * Get transits from a specific transiting body.
 *
 * @param result - Transit result
 * @param bodyName - Name of transiting body
 * @returns Array of transits from that body
 */
export function getTransitsFromBody(result: TransitResult, bodyName: string): Transit[] {
  return result.byTransitingBody[bodyName] ?? [];
}

/**
 * Filter transits by aspect type.
 *
 * @param transits - Array of transits
 * @param aspectType - Aspect type to filter for
 * @returns Filtered transits
 */
export function filterByAspectType(transits: Transit[], aspectType: AspectType): Transit[] {
  return transits.filter((t) => t.aspectType === aspectType);
}

/**
 * Filter transits by phase.
 *
 * @param transits - Array of transits
 * @param phase - Phase to filter for
 * @returns Filtered transits
 */
export function filterByPhase(transits: Transit[], phase: TransitPhase): Transit[] {
  return transits.filter((t) => t.phase === phase);
}

/**
 * Get only applying transits.
 *
 * @param transits - Array of transits
 * @returns Only applying transits
 */
export function getApplyingTransits(transits: Transit[]): Transit[] {
  return filterByPhase(transits, 'applying');
}

/**
 * Get only separating transits.
 *
 * @param transits - Array of transits
 * @returns Only separating transits
 */
export function getSeparatingTransits(transits: Transit[]): Transit[] {
  return filterByPhase(transits, 'separating');
}

/**
 * Get the strongest transit in a list.
 *
 * @param transits - Array of transits
 * @returns Strongest transit or undefined if empty
 */
export function getStrongestTransit(transits: Transit[]): Transit | undefined {
  if (transits.length === 0) return undefined;
  return transits.reduce((strongest, t) => (t.strength > strongest.strength ? t : strongest));
}
