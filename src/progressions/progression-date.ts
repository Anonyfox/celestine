/**
 * Progression Date Calculations
 *
 * Core Julian Date calculations for astrological progressions.
 *
 * @module progressions/progression-date
 *
 * @remarks
 * The fundamental calculation: convert a target date (when you want
 * the progressed chart for) into a progressed Julian Date (the symbolic
 * chart date in the ephemeris).
 *
 * Secondary: 1 day after birth = 1 year of life
 * Solar Arc: Same timing as secondary (for Sun position)
 * Minor: 1 month after birth = 1 year of life
 * Tertiary: 1 day after birth = 1 month of life
 *
 * @see IMPL.md Section 2.1 for algorithm details
 */

import { fromJulianDate, toJulianDate } from '../time/index.js';
import {
  DAYS_PER_YEAR,
  MAX_PROGRESSION_AGE,
  MAX_TARGET_YEAR,
  MIN_BIRTH_YEAR,
  PROGRESSION_RATES,
} from './constants.js';
import type {
  ProgressedDate,
  ProgressionBirthData,
  ProgressionTargetDate,
  ProgressionType,
} from './types.js';
import { ProgressionValidationError } from './types.js';

// =============================================================================
// DATE CONVERSION UTILITIES
// =============================================================================

/**
 * Convert birth data to Julian Date.
 *
 * @param birth - Birth data
 * @returns Julian Date
 */
export function birthToJD(birth: ProgressionBirthData): number {
  // Let toJulianDate handle the timezone conversion since it supports it natively
  return toJulianDate({
    year: birth.year,
    month: birth.month,
    day: birth.day,
    hour: birth.hour,
    minute: birth.minute,
    second: birth.second ?? 0,
    timezone: birth.timezone,
  });
}

/**
 * Convert target date to Julian Date.
 *
 * @param target - Target date (assumes noon UT if time not specified)
 * @returns Julian Date
 */
export function targetToJD(target: ProgressionTargetDate): number {
  return toJulianDate({
    year: target.year,
    month: target.month,
    day: target.day,
    hour: target.hour ?? 12,
    minute: target.minute ?? 0,
    second: target.second ?? 0,
  });
}

/**
 * Convert Julian Date to ProgressedDate.
 *
 * @param jd - Julian Date
 * @returns Calendar date
 */
export function jdToProgressedDate(jd: number): ProgressedDate {
  const date = fromJulianDate(jd);

  return {
    year: date.year,
    month: date.month,
    day: date.day,
    hour: date.hour,
    minute: date.minute,
    second: Math.round(date.second),
  };
}

/**
 * Get the number of days in a month.
 *
 * @param year - Year
 * @param month - Month (1-12)
 * @returns Days in month
 */
export function getDaysInMonth(year: number, month: number): number {
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  if (month === 2 && isLeapYear(year)) {
    return 29;
  }

  return daysInMonth[month - 1];
}

/**
 * Check if a year is a leap year.
 *
 * @param year - Year to check
 * @returns True if leap year
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

// =============================================================================
// AGE CALCULATIONS
// =============================================================================

/**
 * Calculate age in years from birth to target date.
 *
 * @param birthJD - Julian Date of birth
 * @param targetJD - Julian Date of target
 * @returns Age in years (fractional)
 *
 * @example
 * ```ts
 * const age = calculateAge(birthJD, targetJD);
 * console.log(`Age: ${age.toFixed(2)} years`);
 * ```
 */
export function calculateAge(birthJD: number, targetJD: number): number {
  return (targetJD - birthJD) / DAYS_PER_YEAR;
}

/**
 * Calculate age in days from birth to target date.
 *
 * @param birthJD - Julian Date of birth
 * @param targetJD - Julian Date of target
 * @returns Age in days
 */
export function calculateAgeInDays(birthJD: number, targetJD: number): number {
  return targetJD - birthJD;
}

/**
 * Calculate Julian Date from birth + age.
 *
 * @param birthJD - Julian Date of birth
 * @param ageInYears - Age in years
 * @returns Target Julian Date
 */
export function ageToTargetJD(birthJD: number, ageInYears: number): number {
  return birthJD + ageInYears * DAYS_PER_YEAR;
}

// =============================================================================
// PROGRESSED DATE CALCULATIONS
// =============================================================================

/**
 * Calculate the progressed Julian Date for secondary progressions.
 *
 * @param birthJD - Julian Date of birth
 * @param targetJD - Julian Date to progress to
 * @returns Progressed Julian Date
 *
 * @remarks
 * Secondary progressions: 1 day = 1 year
 * Progressed JD = Birth JD + (age in years × 1 day)
 *
 * @example
 * ```ts
 * // Age 30 = 30 days after birth
 * const progJD = getProgressedJD(birthJD, targetJD);
 * // progJD is birthJD + 30 (if age is 30)
 * ```
 */
export function getProgressedJD(
  birthJD: number,
  targetJD: number,
  type: ProgressionType = 'secondary',
): number {
  const ageInYears = calculateAge(birthJD, targetJD);
  const rate = PROGRESSION_RATES[type];

  return birthJD + ageInYears * rate;
}

/**
 * Calculate progressed Julian Date from birth data and target date.
 *
 * @param birth - Birth data
 * @param target - Target date
 * @param type - Progression type
 * @returns Progressed Julian Date
 */
export function calculateProgressedJD(
  birth: ProgressionBirthData,
  target: ProgressionTargetDate,
  type: ProgressionType = 'secondary',
): number {
  const birthJD = birthToJD(birth);
  const targetJD = targetToJD(target);

  return getProgressedJD(birthJD, targetJD, type);
}

/**
 * Get complete date information for a progression.
 *
 * @param birth - Birth data
 * @param target - Target date
 * @param type - Progression type
 * @returns Object with natal, target, and progressed dates
 */
export function getProgressionDates(
  birth: ProgressionBirthData,
  target: ProgressionTargetDate,
  type: ProgressionType = 'secondary',
): {
  natalJD: number;
  natalDate: ProgressedDate;
  targetJD: number;
  targetDate: ProgressedDate;
  progressedJD: number;
  progressedDate: ProgressedDate;
  daysFromBirth: number;
  ageInYears: number;
} {
  const natalJD = birthToJD(birth);
  const targetJD = targetToJD(target);
  const progressedJD = getProgressedJD(natalJD, targetJD, type);
  const ageInYears = calculateAge(natalJD, targetJD);

  return {
    natalJD,
    natalDate: jdToProgressedDate(natalJD),
    targetJD,
    targetDate: {
      year: target.year,
      month: target.month,
      day: target.day,
      hour: target.hour ?? 12,
      minute: target.minute ?? 0,
      second: target.second ?? 0,
    },
    progressedJD,
    progressedDate: jdToProgressedDate(progressedJD),
    daysFromBirth: progressedJD - natalJD,
    ageInYears,
  };
}

// =============================================================================
// REVERSE CALCULATIONS (Age from Progressed JD)
// =============================================================================

/**
 * Calculate the target age for a given progressed Julian Date.
 *
 * @param birthJD - Julian Date of birth
 * @param progressedJD - Progressed Julian Date
 * @param type - Progression type
 * @returns Age in years
 */
export function progressedJDToAge(
  birthJD: number,
  progressedJD: number,
  type: ProgressionType = 'secondary',
): number {
  const rate = PROGRESSION_RATES[type];
  const daysFromBirth = progressedJD - birthJD;

  return daysFromBirth / rate;
}

/**
 * Calculate the target Julian Date for a given progressed Julian Date.
 *
 * @param birthJD - Julian Date of birth
 * @param progressedJD - Progressed Julian Date
 * @param type - Progression type
 * @returns Target Julian Date (real-world date)
 */
export function progressedJDToTargetJD(
  birthJD: number,
  progressedJD: number,
  type: ProgressionType = 'secondary',
): number {
  const ageInYears = progressedJDToAge(birthJD, progressedJD, type);
  return birthJD + ageInYears * DAYS_PER_YEAR;
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate progression input dates.
 *
 * @param birth - Birth data
 * @param target - Target date
 * @throws ProgressionValidationError if validation fails
 */
export function validateProgressionDates(
  birth: ProgressionBirthData,
  target: ProgressionTargetDate,
): void {
  // Validate birth year
  if (birth.year < MIN_BIRTH_YEAR) {
    throw new ProgressionValidationError(
      `Birth year ${birth.year} is before minimum supported year ${MIN_BIRTH_YEAR}`,
      'birth.year',
      birth.year,
    );
  }

  // Validate target year
  if (target.year > MAX_TARGET_YEAR) {
    throw new ProgressionValidationError(
      `Target year ${target.year} is after maximum supported year ${MAX_TARGET_YEAR}`,
      'target.year',
      target.year,
    );
  }

  // Validate birth date components
  if (birth.month < 1 || birth.month > 12) {
    throw new ProgressionValidationError(
      `Birth month ${birth.month} is invalid (must be 1-12)`,
      'birth.month',
      birth.month,
    );
  }

  const daysInBirthMonth = getDaysInMonth(birth.year, birth.month);
  if (birth.day < 1 || birth.day > daysInBirthMonth) {
    throw new ProgressionValidationError(
      `Birth day ${birth.day} is invalid for month ${birth.month} (max: ${daysInBirthMonth})`,
      'birth.day',
      birth.day,
    );
  }

  if (birth.hour < 0 || birth.hour > 23) {
    throw new ProgressionValidationError(
      `Birth hour ${birth.hour} is invalid (must be 0-23)`,
      'birth.hour',
      birth.hour,
    );
  }

  if (birth.minute < 0 || birth.minute > 59) {
    throw new ProgressionValidationError(
      `Birth minute ${birth.minute} is invalid (must be 0-59)`,
      'birth.minute',
      birth.minute,
    );
  }

  // Validate target date components
  if (target.month < 1 || target.month > 12) {
    throw new ProgressionValidationError(
      `Target month ${target.month} is invalid (must be 1-12)`,
      'target.month',
      target.month,
    );
  }

  const daysInTargetMonth = getDaysInMonth(target.year, target.month);
  if (target.day < 1 || target.day > daysInTargetMonth) {
    throw new ProgressionValidationError(
      `Target day ${target.day} is invalid for month ${target.month} (max: ${daysInTargetMonth})`,
      'target.day',
      target.day,
    );
  }

  // Calculate and validate age
  const birthJD = birthToJD(birth);
  const targetJD = targetToJD(target);

  if (targetJD < birthJD) {
    throw new ProgressionValidationError('Target date is before birth date', 'target', target);
  }

  const age = calculateAge(birthJD, targetJD);
  if (age > MAX_PROGRESSION_AGE) {
    throw new ProgressionValidationError(
      `Age ${age.toFixed(1)} exceeds maximum supported age ${MAX_PROGRESSION_AGE}`,
      'age',
      age,
    );
  }

  // Validate latitude/longitude
  if (birth.latitude < -90 || birth.latitude > 90) {
    throw new ProgressionValidationError(
      `Birth latitude ${birth.latitude} is invalid (must be -90 to 90)`,
      'birth.latitude',
      birth.latitude,
    );
  }

  if (birth.longitude < -180 || birth.longitude > 180) {
    throw new ProgressionValidationError(
      `Birth longitude ${birth.longitude} is invalid (must be -180 to 180)`,
      'birth.longitude',
      birth.longitude,
    );
  }
}

/**
 * Validate progression dates and return validation result instead of throwing.
 *
 * @param birth - Birth data
 * @param target - Target date
 * @returns Validation result
 */
export function validateProgressionDatesSafe(
  birth: ProgressionBirthData,
  target: ProgressionTargetDate,
): { valid: boolean; errors: string[] } {
  try {
    validateProgressionDates(birth, target);
    return { valid: true, errors: [] };
  } catch (error) {
    if (error instanceof ProgressionValidationError) {
      return { valid: false, errors: [error.message] };
    }
    throw error;
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Format a progressed date for display.
 *
 * @param date - Progressed date
 * @param includeTime - Include time in output
 * @returns Formatted string
 */
export function formatProgressedDate(date: ProgressedDate, includeTime = false): string {
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const datePart = `${months[date.month - 1]} ${date.day}, ${date.year}`;

  if (includeTime && date.hour !== undefined) {
    const hour = date.hour ?? 0;
    const minute = date.minute ?? 0;
    const timePart = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    return `${datePart} at ${timePart}`;
  }

  return datePart;
}

/**
 * Calculate the number of days between progressed chart and a milestone age.
 *
 * @param birthJD - Birth Julian Date
 * @param currentAge - Current age in years
 * @param milestoneAge - Milestone age to calculate days until
 * @param type - Progression type
 * @returns Days in progressed chart until milestone
 */
export function daysUntilMilestone(
  _birthJD: number,
  currentAge: number,
  milestoneAge: number,
  type: ProgressionType = 'secondary',
): number {
  const rate = PROGRESSION_RATES[type];
  const yearsUntil = milestoneAge - currentAge;

  return yearsUntil * rate;
}
