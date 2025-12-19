/**
 * Progressed Angles Calculations
 *
 * Calculate progressed ASC and MC using solar arc or time-based methods.
 *
 * @module progressions/progressed-angles
 *
 * @remarks
 * There are two primary methods for progressing chart angles:
 *
 * 1. **Solar Arc Method** (most common): ASC and MC advance by the same
 *    arc as the progressed Sun. Simple and widely used.
 *
 * 2. **Time-Based Method** (more complex): Calculate the angles for the
 *    exact progressed time, accounting for birth location sidereal time.
 *
 * @see IMPL.md Section 2.3 for angle progression methodology
 */

import { calculateAngles } from '../houses/angles.js';
import { meanObliquity } from '../houses/obliquity.js';
import type { HouseSystem } from '../houses/types.js';
import { toJulianCenturies } from '../time/julian-centuries.js';
import { localSiderealTime } from '../time/local-sidereal-time.js';
import { SIGN_NAMES } from './constants.js';
import { birthToJD, getProgressedJD, targetToJD } from './progression-date.js';
import { applySolarArc, calculateSolarArc } from './solar-arc.js';
import type {
  AngleProgressionMethod,
  ProgressedPosition,
  ProgressionBirthData,
  ProgressionTargetDate,
  ProgressionType,
} from './types.js';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Complete progressed angles result.
 */
export interface ProgressedAngles {
  ascendant: ProgressedPosition;
  midheaven: ProgressedPosition;
  descendant: ProgressedPosition;
  imumCoeli: ProgressedPosition;
  solarArc: number;
  method: AngleProgressionMethod;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Normalize longitude to 0-360 range.
 */
function normalizeLongitude(longitude: number): number {
  let result = longitude % 360;
  if (result < 0) result += 360;
  return result;
}

/**
 * Convert longitude to zodiac details.
 */
function longitudeToZodiac(longitude: number): {
  signIndex: number;
  signName: string;
  degree: number;
  minute: number;
  second: number;
  formatted: string;
} {
  const normalized = normalizeLongitude(longitude);
  const signIndex = Math.floor(normalized / 30);
  const positionInSign = normalized - signIndex * 30;
  const degree = Math.floor(positionInSign);
  const minuteDecimal = (positionInSign - degree) * 60;
  const minute = Math.floor(minuteDecimal);
  const second = Math.round((minuteDecimal - minute) * 60);

  const signName = SIGN_NAMES[signIndex];
  const formatted = `${degree}°${minute.toString().padStart(2, '0')}' ${signName}`;

  return { signIndex, signName, degree, minute, second, formatted };
}

/**
 * Create a ProgressedPosition object for an angle.
 */
function createProgressedAngle(
  _name: 'ASC' | 'MC' | 'DSC' | 'IC',
  natalLongitude: number,
  progressedLongitude: number,
): ProgressedPosition {
  const natalZodiac = longitudeToZodiac(natalLongitude);
  const progressedZodiac = longitudeToZodiac(progressedLongitude);

  let arcFromNatal = progressedLongitude - natalLongitude;
  // Normalize to -180 to 180
  while (arcFromNatal > 180) arcFromNatal -= 360;
  while (arcFromNatal < -180) arcFromNatal += 360;

  return {
    longitude: progressedLongitude,
    natalLongitude,
    arcFromNatal: Math.abs(arcFromNatal),
    signIndex: progressedZodiac.signIndex,
    signName: progressedZodiac.signName,
    degree: progressedZodiac.degree,
    minute: progressedZodiac.minute,
    second: progressedZodiac.second,
    formatted: progressedZodiac.formatted,
    hasChangedSign: progressedZodiac.signIndex !== natalZodiac.signIndex,
  };
}

// =============================================================================
// NATAL ANGLES
// =============================================================================

/**
 * Get natal ASC and MC for a birth location.
 *
 * @param birthJD - Julian Date of birth
 * @param latitude - Birth latitude
 * @param longitude - Birth longitude
 * @param _houseSystem - House system (unused, angles are same for all systems)
 * @returns Object with ASC and MC longitudes
 */
export function getNatalAngles(
  birthJD: number,
  latitude: number,
  longitude: number,
  _houseSystem: HouseSystem = 'placidus',
): { ascendant: number; midheaven: number } {
  // Calculate LST and obliquity
  const lst = localSiderealTime(birthJD, longitude);
  const T = toJulianCenturies(birthJD);
  const obliquity = meanObliquity(T);

  // Calculate angles
  const angles = calculateAngles(lst, obliquity, latitude);

  return {
    ascendant: angles.ascendant,
    midheaven: angles.midheaven,
  };
}

/**
 * Get natal angles from birth data.
 */
export function getNatalAnglesFromBirth(
  birth: ProgressionBirthData,
  houseSystem: HouseSystem = 'placidus',
): { ascendant: number; midheaven: number } {
  const birthJD = birthToJD(birth);
  return getNatalAngles(birthJD, birth.latitude, birth.longitude, houseSystem);
}

// =============================================================================
// SOLAR ARC ANGLE PROGRESSION
// =============================================================================

/**
 * Calculate progressed angles using solar arc method.
 *
 * @param birthJD - Julian Date of birth
 * @param targetJD - Julian Date to progress to
 * @param latitude - Birth latitude
 * @param longitude - Birth longitude
 * @param houseSystem - House system
 * @returns Progressed angles
 *
 * @remarks
 * Solar arc method is the most common approach:
 * - Calculate the solar arc (progressed Sun - natal Sun)
 * - Apply this arc to natal ASC and MC
 */
export function getProgressedAnglesSolarArc(
  birthJD: number,
  targetJD: number,
  latitude: number,
  longitude: number,
  houseSystem: HouseSystem = 'placidus',
): ProgressedAngles {
  // Get natal angles
  const natal = getNatalAngles(birthJD, latitude, longitude, houseSystem);

  // Calculate solar arc
  const solarArc = calculateSolarArc(birthJD, targetJD);

  // Apply solar arc to angles
  const progressedASC = applySolarArc(natal.ascendant, solarArc);
  const progressedMC = applySolarArc(natal.midheaven, solarArc);

  // Descendant and IC are always opposite
  const progressedDSC = normalizeLongitude(progressedASC + 180);
  const progressedIC = normalizeLongitude(progressedMC + 180);

  return {
    ascendant: createProgressedAngle('ASC', natal.ascendant, progressedASC),
    midheaven: createProgressedAngle('MC', natal.midheaven, progressedMC),
    descendant: createProgressedAngle(
      'DSC',
      normalizeLongitude(natal.ascendant + 180),
      progressedDSC,
    ),
    imumCoeli: createProgressedAngle('IC', normalizeLongitude(natal.midheaven + 180), progressedIC),
    solarArc,
    method: 'solar-arc',
  };
}

// =============================================================================
// TIME-BASED ANGLE PROGRESSION
// =============================================================================

/**
 * Calculate progressed angles using time-based method.
 *
 * @param birthJD - Julian Date of birth
 * @param targetJD - Julian Date to progress to
 * @param latitude - Birth latitude
 * @param longitude - Birth longitude
 * @param progressionType - Type of progression for date calculation
 * @param houseSystem - House system
 * @returns Progressed angles
 *
 * @remarks
 * Time-based method calculates angles for the actual progressed moment:
 * - Get the progressed Julian Date
 * - Calculate angles for that date/time at birth location
 * - This gives angles that account for precession and time passage
 *
 * This method is more astronomically accurate but less commonly used
 * in astrological practice.
 */
export function getProgressedAnglesTimeBased(
  birthJD: number,
  targetJD: number,
  latitude: number,
  longitude: number,
  progressionType: ProgressionType = 'secondary',
  houseSystem: HouseSystem = 'placidus',
): ProgressedAngles {
  // Get natal angles
  const natal = getNatalAngles(birthJD, latitude, longitude, houseSystem);

  // Get progressed Julian Date
  const progressedJD = getProgressedJD(birthJD, targetJD, progressionType);

  // Calculate angles for progressed time at birth location
  const progressed = getNatalAngles(progressedJD, latitude, longitude, houseSystem);

  // Calculate effective solar arc (for reference)
  const solarArc = calculateSolarArc(birthJD, targetJD);

  // Descendant and IC
  const natalDSC = normalizeLongitude(natal.ascendant + 180);
  const natalIC = normalizeLongitude(natal.midheaven + 180);
  const progressedDSC = normalizeLongitude(progressed.ascendant + 180);
  const progressedIC = normalizeLongitude(progressed.midheaven + 180);

  return {
    ascendant: createProgressedAngle('ASC', natal.ascendant, progressed.ascendant),
    midheaven: createProgressedAngle('MC', natal.midheaven, progressed.midheaven),
    descendant: createProgressedAngle('DSC', natalDSC, progressedDSC),
    imumCoeli: createProgressedAngle('IC', natalIC, progressedIC),
    solarArc,
    method: 'time-based',
  };
}

// =============================================================================
// UNIFIED API
// =============================================================================

/**
 * Calculate progressed angles using specified method.
 *
 * @param birthJD - Julian Date of birth
 * @param targetJD - Julian Date to progress to
 * @param latitude - Birth latitude
 * @param longitude - Birth longitude
 * @param method - Progression method ('solar-arc' or 'time-based')
 * @param progressionType - Type of progression (for time-based method)
 * @param houseSystem - House system
 * @returns Progressed angles
 */
export function getProgressedAngles(
  birthJD: number,
  targetJD: number,
  latitude: number,
  longitude: number,
  method: AngleProgressionMethod = 'solar-arc',
  progressionType: ProgressionType = 'secondary',
  houseSystem: HouseSystem = 'placidus',
): ProgressedAngles {
  if (method === 'solar-arc') {
    return getProgressedAnglesSolarArc(birthJD, targetJD, latitude, longitude, houseSystem);
  }
  return getProgressedAnglesTimeBased(
    birthJD,
    targetJD,
    latitude,
    longitude,
    progressionType,
    houseSystem,
  );
}

/**
 * Calculate progressed angles from birth data and target date.
 *
 * @param birth - Birth data
 * @param target - Target date
 * @param method - Progression method
 * @param progressionType - Type of progression
 * @param houseSystem - House system
 * @returns Progressed angles
 */
export function calculateProgressedAngles(
  birth: ProgressionBirthData,
  target: ProgressionTargetDate,
  method: AngleProgressionMethod = 'solar-arc',
  progressionType: ProgressionType = 'secondary',
  houseSystem: HouseSystem = 'placidus',
): ProgressedAngles {
  const birthJD = birthToJD(birth);
  const targetJD = targetToJD(target);

  return getProgressedAngles(
    birthJD,
    targetJD,
    birth.latitude,
    birth.longitude,
    method,
    progressionType,
    houseSystem,
  );
}

// =============================================================================
// SPECIALIZED QUERIES
// =============================================================================

/**
 * Get just the progressed ASC.
 */
export function getProgressedASC(
  birthJD: number,
  targetJD: number,
  latitude: number,
  longitude: number,
  method: AngleProgressionMethod = 'solar-arc',
): ProgressedPosition {
  const angles = getProgressedAngles(birthJD, targetJD, latitude, longitude, method);
  return angles.ascendant;
}

/**
 * Get just the progressed MC.
 */
export function getProgressedMC(
  birthJD: number,
  targetJD: number,
  latitude: number,
  longitude: number,
  method: AngleProgressionMethod = 'solar-arc',
): ProgressedPosition {
  const angles = getProgressedAngles(birthJD, targetJD, latitude, longitude, method);
  return angles.midheaven;
}

/**
 * Check if ASC has changed sign since birth.
 */
export function hasASCChangedSign(
  birthJD: number,
  targetJD: number,
  latitude: number,
  longitude: number,
  method: AngleProgressionMethod = 'solar-arc',
): boolean {
  const angles = getProgressedAngles(birthJD, targetJD, latitude, longitude, method);
  return angles.ascendant.hasChangedSign;
}

/**
 * Check if MC has changed sign since birth.
 */
export function hasMCChangedSign(
  birthJD: number,
  targetJD: number,
  latitude: number,
  longitude: number,
  method: AngleProgressionMethod = 'solar-arc',
): boolean {
  const angles = getProgressedAngles(birthJD, targetJD, latitude, longitude, method);
  return angles.midheaven.hasChangedSign;
}

/**
 * Estimate age at which ASC will reach a specific sign.
 *
 * @param natalASC - Natal ASC longitude
 * @param targetSignIndex - Index of target sign (0=Aries, 1=Taurus, etc.)
 * @returns Estimated age in years, or null if already past
 */
export function estimateAgeForASCSign(natalASC: number, targetSignIndex: number): number | null {
  const targetStart = targetSignIndex * 30;
  let arc = targetStart - natalASC;

  // If target is behind natal, we need to go around the full circle
  if (arc < 0) arc += 360;

  // Approximate: 1 year ≈ 1° of solar arc
  return arc;
}

/**
 * Estimate age at which MC will reach a specific sign.
 *
 * @param natalMC - Natal MC longitude
 * @param targetSignIndex - Index of target sign
 * @returns Estimated age in years
 */
export function estimateAgeForMCSign(natalMC: number, targetSignIndex: number): number | null {
  const targetStart = targetSignIndex * 30;
  let arc = targetStart - natalMC;

  if (arc < 0) arc += 360;

  return arc;
}

// =============================================================================
// FORMATTING
// =============================================================================

/**
 * Format progressed angles for display.
 */
export function formatProgressedAngles(angles: ProgressedAngles): string {
  const lines: string[] = [
    `Progressed Angles (${angles.method}, Solar Arc: ${angles.solarArc.toFixed(2)}°)`,
    `  ASC: ${angles.ascendant.formatted}`,
    `  MC:  ${angles.midheaven.formatted}`,
    `  DSC: ${angles.descendant.formatted}`,
    `  IC:  ${angles.imumCoeli.formatted}`,
  ];

  if (angles.ascendant.hasChangedSign) {
    lines.push(`  ⚠ ASC has changed sign`);
  }
  if (angles.midheaven.hasChangedSign) {
    lines.push(`  ⚠ MC has changed sign`);
  }

  return lines.join('\n');
}
