/**
 * Solar Arc Calculations
 *
 * Calculate solar arc for directions and apply to natal positions.
 *
 * @module progressions/solar-arc
 *
 * @remarks
 * Solar Arc is the arc (in degrees) that the Sun has traveled since birth.
 * All natal points can be "directed" by adding this arc.
 *
 * Formula: Solar Arc = Progressed Sun longitude - Natal Sun longitude
 *
 * @see IMPL.md Section 1.2 and 2.2 for solar arc theory
 * @see Noel Tyl "Solar Arcs" for authoritative reference
 */

import { getSunPosition } from '../ephemeris/sun.js';
import { SIGN_NAMES, SUN_MEAN_DAILY_MOTION } from './constants.js';
import { birthToJD, getProgressedJD, targetToJD } from './progression-date.js';
import type { ProgressedPosition, ProgressionBirthData, ProgressionTargetDate } from './types.js';

// =============================================================================
// CORE SOLAR ARC CALCULATIONS
// =============================================================================

/**
 * Calculate the solar arc for a given birth and target date.
 *
 * @param birthJD - Julian Date of birth
 * @param targetJD - Julian Date to calculate arc for
 * @returns Solar arc in degrees
 *
 * @remarks
 * The solar arc is the difference between the progressed Sun position
 * and the natal Sun position. For secondary progressions, this is
 * approximately 1° per year of life.
 *
 * @example
 * ```ts
 * const birthJD = 2451545.0; // J2000.0
 * const targetJD = birthJD + 30 * 365.25; // 30 years later
 * const arc = calculateSolarArc(birthJD, targetJD);
 * console.log(arc); // ~30° (about 1° per year)
 * ```
 */
export function calculateSolarArc(birthJD: number, targetJD: number): number {
  // Get natal Sun position
  const natalSun = getSunPosition(birthJD);

  // Get progressed JD (1 day per year)
  const progressedJD = getProgressedJD(birthJD, targetJD, 'secondary');

  // Get progressed Sun position
  const progressedSun = getSunPosition(progressedJD);

  // Calculate arc (handling wraparound at 0°/360°)
  let arc = progressedSun.longitude - natalSun.longitude;

  // Normalize to reasonable range
  // Solar arc should typically be positive (Sun always progresses forward in secondary)
  // but can be large for old charts
  while (arc < 0) arc += 360;
  while (arc >= 360) arc -= 360;

  return arc;
}

/**
 * Calculate solar arc from birth data and target date.
 *
 * @param birth - Birth data
 * @param target - Target date
 * @returns Solar arc in degrees
 */
export function calculateSolarArcFromDates(
  birth: ProgressionBirthData,
  target: ProgressionTargetDate,
): number {
  const birthJD = birthToJD(birth);
  const targetJD = targetToJD(target);
  return calculateSolarArc(birthJD, targetJD);
}

/**
 * Estimate solar arc from age (quick approximation).
 *
 * @param ageInYears - Age in years
 * @returns Estimated solar arc in degrees
 *
 * @remarks
 * This uses the Sun's mean daily motion (~0.9856°/day = ~0.9856°/year in progressions).
 * Actual solar arc varies slightly due to Earth's elliptical orbit.
 */
export function estimateSolarArc(ageInYears: number): number {
  return ageInYears * SUN_MEAN_DAILY_MOTION;
}

/**
 * Get the natal Sun longitude for reference.
 *
 * @param birthJD - Julian Date of birth
 * @returns Natal Sun longitude in degrees (0-360)
 */
export function getNatalSunLongitude(birthJD: number): number {
  return getSunPosition(birthJD).longitude;
}

/**
 * Get the progressed Sun longitude.
 *
 * @param birthJD - Julian Date of birth
 * @param targetJD - Julian Date to progress to
 * @returns Progressed Sun longitude in degrees (0-360)
 */
export function getProgressedSunLongitude(birthJD: number, targetJD: number): number {
  const progressedJD = getProgressedJD(birthJD, targetJD, 'secondary');
  return getSunPosition(progressedJD).longitude;
}

// =============================================================================
// APPLYING SOLAR ARC TO POSITIONS
// =============================================================================

/**
 * Apply solar arc to a single natal longitude.
 *
 * @param natalLongitude - Natal longitude in degrees (0-360)
 * @param solarArc - Solar arc in degrees
 * @returns Directed longitude in degrees (0-360)
 *
 * @example
 * ```ts
 * // Natal Mars at 100°, solar arc of 30°
 * const directedMars = applySolarArc(100, 30);
 * console.log(directedMars); // 130°
 * ```
 */
export function applySolarArc(natalLongitude: number, solarArc: number): number {
  let directed = natalLongitude + solarArc;

  // Normalize to 0-360°
  while (directed < 0) directed += 360;
  while (directed >= 360) directed -= 360;

  return directed;
}

/**
 * Apply solar arc to multiple natal positions.
 *
 * @param natalPositions - Array of natal longitudes
 * @param solarArc - Solar arc in degrees
 * @returns Array of directed longitudes
 */
export function applySolarArcToMany(natalPositions: number[], solarArc: number): number[] {
  return natalPositions.map((pos) => applySolarArc(pos, solarArc));
}

/**
 * Convert longitude to zodiac position details.
 *
 * @param longitude - Ecliptic longitude (0-360°)
 * @returns Zodiac position details
 */
export function longitudeToZodiacPosition(longitude: number): {
  signIndex: number;
  signName: string;
  degree: number;
  minute: number;
  second: number;
  formatted: string;
} {
  // Normalize
  let long = longitude;
  while (long < 0) long += 360;
  while (long >= 360) long -= 360;

  const signIndex = Math.floor(long / 30);
  const positionInSign = long - signIndex * 30;
  const degree = Math.floor(positionInSign);
  const minuteDecimal = (positionInSign - degree) * 60;
  const minute = Math.floor(minuteDecimal);
  const second = Math.round((minuteDecimal - minute) * 60);

  const signName = SIGN_NAMES[signIndex];
  const formatted = `${degree}°${minute.toString().padStart(2, '0')}' ${signName}`;

  return { signIndex, signName, degree, minute, second, formatted };
}

/**
 * Create a complete directed position from natal position and solar arc.
 *
 * @param natalLongitude - Natal longitude
 * @param solarArc - Solar arc in degrees
 * @returns Complete progressed position object
 */
export function createDirectedPosition(
  natalLongitude: number,
  solarArc: number,
): ProgressedPosition {
  const directedLongitude = applySolarArc(natalLongitude, solarArc);
  const zodiac = longitudeToZodiacPosition(directedLongitude);
  const natalZodiac = longitudeToZodiacPosition(natalLongitude);

  return {
    longitude: directedLongitude,
    natalLongitude,
    arcFromNatal: solarArc,
    signIndex: zodiac.signIndex,
    signName: zodiac.signName,
    degree: zodiac.degree,
    minute: zodiac.minute,
    second: zodiac.second,
    formatted: zodiac.formatted,
    hasChangedSign: zodiac.signIndex !== natalZodiac.signIndex,
  };
}

// =============================================================================
// REVERSE CALCULATIONS
// =============================================================================

/**
 * Estimate the age at which a specific solar arc will be reached.
 *
 * @param solarArc - Target solar arc in degrees
 * @returns Estimated age in years
 *
 * @example
 * ```ts
 * // When will solar arc be 30°?
 * const age = estimateAgeForSolarArc(30);
 * console.log(age); // ~30.4 years
 * ```
 */
export function estimateAgeForSolarArc(solarArc: number): number {
  return solarArc / SUN_MEAN_DAILY_MOTION;
}

/**
 * Find the age at which a natal point will be directed to a specific longitude.
 *
 * @param natalLongitude - Natal longitude
 * @param targetLongitude - Target longitude to direct to
 * @returns Estimated age in years, or null if not reachable
 *
 * @remarks
 * This finds the arc needed and converts to age.
 * Note: If target < natal, the arc will be (360 - (natal - target)).
 */
export function estimateAgeForDirectedPosition(
  natalLongitude: number,
  targetLongitude: number,
): number {
  let arc = targetLongitude - natalLongitude;
  if (arc < 0) arc += 360;

  return estimateAgeForSolarArc(arc);
}

// =============================================================================
// ASPECT CALCULATIONS WITH SOLAR ARC
// =============================================================================

/**
 * Calculate the solar arc at which a directed planet will aspect a natal point.
 *
 * @param natalDirecting - Natal longitude of body being directed
 * @param natalReceiving - Natal longitude of body receiving the aspect
 * @param aspectAngle - Aspect angle (0, 60, 90, 120, 180)
 * @returns Solar arc at which aspect is exact
 *
 * @example
 * ```ts
 * // When will directed Mars (natal 100°) square natal Sun (natal 50°)?
 * // Square = 90°, so Mars at 140° squares Sun at 50°
 * // Arc needed = 140 - 100 = 40°
 * const arc = solarArcForAspect(100, 50, 90);
 * console.log(arc); // 40°
 * ```
 */
export function solarArcForAspect(
  natalDirecting: number,
  natalReceiving: number,
  aspectAngle: number,
): number[] {
  const arcs: number[] = [];

  // There can be two solutions for most aspects
  // Target position 1: receiving + aspectAngle
  // Target position 2: receiving - aspectAngle (or receiving + 360 - aspectAngle)

  const target1 = (natalReceiving + aspectAngle) % 360;
  const target2 = (natalReceiving - aspectAngle + 360) % 360;

  // Calculate arc to reach target1
  let arc1 = target1 - natalDirecting;
  if (arc1 < 0) arc1 += 360;
  arcs.push(arc1);

  // Calculate arc to reach target2 (if different from target1)
  if (Math.abs(target1 - target2) > 0.01) {
    let arc2 = target2 - natalDirecting;
    if (arc2 < 0) arc2 += 360;
    arcs.push(arc2);
  }

  // Sort by smallest arc first
  arcs.sort((a, b) => a - b);

  return arcs;
}

/**
 * Check if a directed position is within orb of aspecting a natal point.
 *
 * @param directedLongitude - Current directed longitude
 * @param natalLongitude - Natal point to check aspect with
 * @param aspectAngle - Aspect angle
 * @param orb - Orb in degrees
 * @returns True if within orb
 */
export function isWithinAspectOrb(
  directedLongitude: number,
  natalLongitude: number,
  aspectAngle: number,
  orb: number,
): boolean {
  const separation = Math.abs(directedLongitude - natalLongitude);
  const normalizedSeparation = separation > 180 ? 360 - separation : separation;

  const deviation = Math.abs(normalizedSeparation - aspectAngle);

  return deviation <= orb;
}

// =============================================================================
// FORMATTING UTILITIES
// =============================================================================

/**
 * Format solar arc for display.
 *
 * @param solarArc - Solar arc in degrees
 * @param precision - Decimal places (default 2)
 * @returns Formatted string like "30.44°"
 */
export function formatSolarArc(solarArc: number, precision = 2): string {
  return `${solarArc.toFixed(precision)}°`;
}

/**
 * Format solar arc with DMS (degrees, minutes, seconds).
 *
 * @param solarArc - Solar arc in degrees
 * @returns Formatted string like "30°26'24\""
 */
export function formatSolarArcDMS(solarArc: number): string {
  const degrees = Math.floor(solarArc);
  const minutesDecimal = (solarArc - degrees) * 60;
  const minutes = Math.floor(minutesDecimal);
  const seconds = Math.round((minutesDecimal - minutes) * 60);

  return `${degrees}°${minutes.toString().padStart(2, '0')}'${seconds.toString().padStart(2, '0')}"`;
}
