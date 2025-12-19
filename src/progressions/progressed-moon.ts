/**
 * Progressed Moon Specializations
 *
 * The progressed Moon is the most active indicator in secondary progressions,
 * moving approximately 12-15° per year (about 1° per month).
 *
 * @module progressions/progressed-moon
 *
 * @remarks
 * The progressed Moon:
 * - Completes a full zodiac cycle in ~27-28 years
 * - Changes sign approximately every 2.5 years
 * - Forms new aspects more frequently than other progressed bodies
 * - Is a key timer for life events and emotional shifts
 *
 * @see IMPL.md Section 3.1 for Moon progression methodology
 */

import { getMoonPosition } from '../ephemeris/moon.js';
import { getSunPosition } from '../ephemeris/sun.js';
import { MOON_MEAN_DAILY_MOTION, SIGN_NAMES } from './constants.js';
import { birthToJD, calculateAge, getProgressedJD, targetToJD } from './progression-date.js';
import type { ProgressionBirthData, ProgressionTargetDate, ProgressionType } from './types.js';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Lunar phase information for progressed Moon.
 */
export interface ProgressedLunarPhase {
  /** Current phase name */
  phaseName: string;
  /** Phase angle (0-360°, 0 = New Moon) */
  phaseAngle: number;
  /** Days until next phase change */
  daysUntilNextPhase: number;
  /** Description of current phase meaning */
  description: string;
}

/**
 * Moon sign transit information.
 */
export interface MoonSignTransit {
  /** Sign index (0-11) */
  signIndex: number;
  /** Sign name */
  signName: string;
  /** Entry date as years from birth */
  entryAge: number;
  /** Exit date as years from birth */
  exitAge: number;
  /** Duration in years */
  durationYears: number;
}

/**
 * Complete progressed Moon report.
 */
export interface ProgressedMoonReport {
  /** Current progressed Moon position */
  current: ProgressedPlanet;
  /** Lunar phase relative to progressed Sun */
  phase: ProgressedLunarPhase;
  /** Timeline of sign transits */
  signTransits: MoonSignTransit[];
  /** Estimated age at next sign change */
  ageAtNextSignChange: number;
  /** Total zodiac cycles completed since birth */
  zodiacCyclesCompleted: number;
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
  formatted: string;
} {
  const normalized = normalizeLongitude(longitude);
  const signIndex = Math.floor(normalized / 30);
  const positionInSign = normalized - signIndex * 30;
  const degree = Math.floor(positionInSign);
  const minuteDecimal = (positionInSign - degree) * 60;
  const minute = Math.floor(minuteDecimal);

  const signName = SIGN_NAMES[signIndex];
  const formatted = `${degree}°${minute.toString().padStart(2, '0')}' ${signName}`;

  return { signIndex, signName, degree, minute, formatted };
}

/**
 * Get lunar phase name and description from phase angle.
 */
function getLunarPhase(phaseAngle: number): { name: string; description: string } {
  const normalized = normalizeLongitude(phaseAngle);

  if (normalized < 45) {
    return {
      name: 'New Moon',
      description: 'New beginnings, planting seeds, initiation of cycles',
    };
  }
  if (normalized < 90) {
    return {
      name: 'Crescent',
      description: 'Struggle, challenges, building momentum',
    };
  }
  if (normalized < 135) {
    return {
      name: 'First Quarter',
      description: 'Crisis in action, decisive steps, building structures',
    };
  }
  if (normalized < 180) {
    return {
      name: 'Gibbous',
      description: 'Refinement, analysis, preparation for fulfillment',
    };
  }
  if (normalized < 225) {
    return {
      name: 'Full Moon',
      description: 'Culmination, awareness, relationships highlighted',
    };
  }
  if (normalized < 270) {
    return {
      name: 'Disseminating',
      description: 'Sharing, teaching, distributing results',
    };
  }
  if (normalized < 315) {
    return {
      name: 'Last Quarter',
      description: 'Crisis in consciousness, reorientation, letting go',
    };
  }
  return {
    name: 'Balsamic',
    description: 'Release, ending, preparation for new cycle',
  };
}

// =============================================================================
// CORE MOON CALCULATIONS
// =============================================================================

/**
 * Get progressed Moon position.
 *
 * @param birthJD - Julian Date of birth
 * @param targetJD - Julian Date to progress to
 * @param progressionType - Type of progression
 * @returns Progressed Moon position
 */
export function getProgressedMoon(
  birthJD: number,
  targetJD: number,
  progressionType: ProgressionType = 'secondary',
): ProgressedPlanet {
  // Get natal Moon
  const natal = getMoonPosition(birthJD);
  const natalZodiac = longitudeToZodiac(natal.longitude);

  // Get progressed position
  const progressedJD = getProgressedJD(birthJD, targetJD, progressionType);
  const progressed = getMoonPosition(progressedJD);
  const progressedZodiac = longitudeToZodiac(progressed.longitude);

  // Calculate arc from natal (account for multiple cycles)
  const yearsElapsed = calculateAge(birthJD, targetJD);
  // Moon moves ~13°/day in secondary progressions = ~13°/year
  // Total arc = yearsElapsed * 13° approximately
  const estimatedTotalArc = yearsElapsed * MOON_MEAN_DAILY_MOTION;

  // Calculate direct arc (may be < 360)
  let directArc = progressed.longitude - natal.longitude;
  while (directArc < 0) directArc += 360;

  // Determine how many full cycles (with small epsilon for floating point)
  // Add 0.001 to handle cases like 359.9999...
  const fullCycles = Math.floor((estimatedTotalArc + 0.001) / 360);
  const actualArc = fullCycles * 360 + directArc;

  return {
    name: 'Moon',
    natalLongitude: natal.longitude,
    natalSignIndex: natalZodiac.signIndex,
    natalSignName: natalZodiac.signName,
    natalDegree: natalZodiac.degree,
    natalMinute: natalZodiac.minute,
    natalFormatted: natalZodiac.formatted,
    progressedLongitude: progressed.longitude,
    progressedSignIndex: progressedZodiac.signIndex,
    progressedSignName: progressedZodiac.signName,
    progressedDegree: progressedZodiac.degree,
    progressedMinute: progressedZodiac.minute,
    progressedFormatted: progressedZodiac.formatted,
    arcFromNatal: actualArc,
    arcDirection: 'direct', // Moon always moves direct
    hasChangedSign: progressedZodiac.signIndex !== natalZodiac.signIndex,
    isRetrograde: false, // Moon never retrogrades
  };
}

/**
 * Get progressed Moon from birth and target dates.
 */
export function getProgressedMoonFromDates(
  birth: ProgressionBirthData,
  target: ProgressionTargetDate,
  progressionType: ProgressionType = 'secondary',
): ProgressedPlanet {
  const birthJD = birthToJD(birth);
  const targetJD = targetToJD(target);
  return getProgressedMoon(birthJD, targetJD, progressionType);
}

// =============================================================================
// LUNAR PHASE CALCULATIONS
// =============================================================================

/**
 * Calculate progressed lunar phase (Moon's relationship to progressed Sun).
 *
 * @param birthJD - Julian Date of birth
 * @param targetJD - Julian Date to progress to
 * @param progressionType - Type of progression
 * @returns Progressed lunar phase information
 */
export function getProgressedLunarPhase(
  birthJD: number,
  targetJD: number,
  progressionType: ProgressionType = 'secondary',
): ProgressedLunarPhase {
  const progressedJD = getProgressedJD(birthJD, targetJD, progressionType);

  // Get progressed Sun and Moon positions
  const moon = getMoonPosition(progressedJD);
  const sunPos = getSunPosition(progressedJD);

  // Phase angle: Moon longitude - Sun longitude
  let phaseAngle = moon.longitude - sunPos.longitude;
  phaseAngle = normalizeLongitude(phaseAngle);

  const phase = getLunarPhase(phaseAngle);

  // Calculate days until next phase (approximately)
  // Phases are roughly 45° apart
  const currentPhasePosition = phaseAngle % 45;
  const degreesToNextPhase = 45 - currentPhasePosition;
  // Moon gains ~12° on Sun per day (13° Moon - 1° Sun)
  const moonSunDailyGap = MOON_MEAN_DAILY_MOTION - 1;
  const daysUntilNextPhase = degreesToNextPhase / moonSunDailyGap;

  return {
    phaseName: phase.name,
    phaseAngle,
    daysUntilNextPhase: Math.round(daysUntilNextPhase * 10) / 10,
    description: phase.description,
  };
}

// =============================================================================
// SIGN TRANSIT CALCULATIONS
// =============================================================================

/**
 * Calculate when the progressed Moon enters each sign.
 *
 * @param birthJD - Julian Date of birth
 * @param yearsToCalculate - How many years ahead to calculate (default: 30)
 * @returns Array of Moon sign transits
 */
export function calculateMoonSignTransits(
  birthJD: number,
  yearsToCalculate = 30,
): MoonSignTransit[] {
  const transits: MoonSignTransit[] = [];
  const natal = getMoonPosition(birthJD);
  const natalSign = Math.floor(natal.longitude / 30);

  // Moon moves approximately 13° per day in secondary progressions
  // This means ~30° per 2.3 days ≈ 2.3 years per sign

  let currentAge = 0;
  let currentSign = natalSign;
  const _entryAge = 0;

  // Start from natal position within sign
  const natalPositionInSign = natal.longitude % 30;
  const degreesToNextSign = 30 - natalPositionInSign;
  const firstExitAge = degreesToNextSign / MOON_MEAN_DAILY_MOTION;

  // Add natal sign (partial)
  transits.push({
    signIndex: natalSign,
    signName: SIGN_NAMES[natalSign],
    entryAge: 0,
    exitAge: firstExitAge,
    durationYears: firstExitAge,
  });

  currentAge = firstExitAge;
  currentSign = (natalSign + 1) % 12;

  // Calculate full sign transits
  const avgYearsPerSign = 30 / MOON_MEAN_DAILY_MOTION; // ~2.3 years

  while (currentAge < yearsToCalculate) {
    const exitAge = currentAge + avgYearsPerSign;

    transits.push({
      signIndex: currentSign,
      signName: SIGN_NAMES[currentSign],
      entryAge: currentAge,
      exitAge: Math.min(exitAge, yearsToCalculate),
      durationYears: avgYearsPerSign,
    });

    currentAge = exitAge;
    currentSign = (currentSign + 1) % 12;
  }

  return transits;
}

/**
 * Calculate age at next Moon sign change.
 *
 * @param birthJD - Julian Date of birth
 * @param currentAge - Current age in years
 * @returns Age at next sign change
 */
export function getAgeAtNextMoonSignChange(birthJD: number, currentAge: number): number {
  const targetJD = birthJD + currentAge * 365.25;
  const progressedJD = getProgressedJD(birthJD, targetJD, 'secondary');
  const moon = getMoonPosition(progressedJD);

  const positionInSign = moon.longitude % 30;
  const degreesToNextSign = 30 - positionInSign;
  const yearsToNextSign = degreesToNextSign / MOON_MEAN_DAILY_MOTION;

  return currentAge + yearsToNextSign;
}

// =============================================================================
// ZODIAC CYCLE CALCULATIONS
// =============================================================================

/**
 * Calculate how many complete zodiac cycles the Moon has completed.
 *
 * @param birthJD - Julian Date of birth
 * @param targetJD - Target Julian Date
 * @returns Number of complete cycles (integer) and fractional progress
 */
export function getMoonZodiacCycles(
  birthJD: number,
  targetJD: number,
): { complete: number; fractional: number; totalDegrees: number } {
  const yearsElapsed = calculateAge(birthJD, targetJD);
  const totalDegrees = yearsElapsed * MOON_MEAN_DAILY_MOTION;
  // Add epsilon for floating point precision
  const complete = Math.floor((totalDegrees + 0.001) / 360);
  const fractional = (((totalDegrees % 360) + 360) % 360) / 360;

  return { complete, fractional, totalDegrees };
}

/**
 * Estimate age at which progressed Moon returns to natal position.
 *
 * @returns Array of ages at Moon returns
 */
export function getMoonReturnAges(): number[] {
  // Moon cycle ≈ 27.3 years (360° / 13.18° per year)
  const cycleLength = 360 / MOON_MEAN_DAILY_MOTION;
  return [cycleLength, cycleLength * 2, cycleLength * 3];
}

// =============================================================================
// COMPREHENSIVE REPORT
// =============================================================================

/**
 * Generate a complete progressed Moon report.
 *
 * @param birth - Birth data
 * @param target - Target date
 * @param yearsToProject - Years to project for transits (default: 30)
 * @returns Complete progressed Moon report
 */
export function getProgressedMoonReport(
  birth: ProgressionBirthData,
  target: ProgressionTargetDate,
  yearsToProject = 30,
): ProgressedMoonReport {
  const birthJD = birthToJD(birth);
  const targetJD = targetToJD(target);

  const current = getProgressedMoon(birthJD, targetJD);
  const phase = getProgressedLunarPhase(birthJD, targetJD);
  const signTransits = calculateMoonSignTransits(birthJD, yearsToProject);

  const currentAge = calculateAge(birthJD, targetJD);
  const ageAtNextSignChange = getAgeAtNextMoonSignChange(birthJD, currentAge);

  const cycles = getMoonZodiacCycles(birthJD, targetJD);

  return {
    current,
    phase,
    signTransits,
    ageAtNextSignChange,
    zodiacCyclesCompleted: cycles.complete,
  };
}

// =============================================================================
// FORMATTING
// =============================================================================

/**
 * Format Moon sign transit for display.
 */
export function formatMoonTransit(transit: MoonSignTransit): string {
  return `${transit.signName}: age ${transit.entryAge.toFixed(1)} - ${transit.exitAge.toFixed(1)} (${transit.durationYears.toFixed(1)} years)`;
}

/**
 * Format progressed Moon report for display.
 */
export function formatProgressedMoonReport(report: ProgressedMoonReport): string {
  const lines: string[] = [
    '=== Progressed Moon Report ===',
    '',
    `Current Position: ${report.current.progressedFormatted}`,
    `Natal Position: ${report.current.natalFormatted}`,
    `Arc from Natal: ${report.current.arcFromNatal.toFixed(2)}°`,
    `Zodiac Cycles Completed: ${report.zodiacCyclesCompleted}`,
    '',
    `Lunar Phase: ${report.phase.phaseName}`,
    `Phase Angle: ${report.phase.phaseAngle.toFixed(1)}°`,
    `${report.phase.description}`,
    '',
    `Age at Next Sign Change: ${report.ageAtNextSignChange.toFixed(1)}`,
    '',
    'Sign Transits:',
  ];

  for (const transit of report.signTransits.slice(0, 15)) {
    lines.push(`  ${formatMoonTransit(transit)}`);
  }

  return lines.join('\n');
}
