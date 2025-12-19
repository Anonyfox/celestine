/**
 * Input Validation for Birth Data
 *
 * Validates and normalizes birth data before chart calculation.
 *
 * @module chart/input-validation
 */

import { isValidDate } from '../time/time-validation.js';
import {
  FALLBACK_HOUSE_SYSTEM,
  LATITUDE_SENSITIVE_SYSTEMS,
  MAX_LATITUDE_ANY,
  MAX_LATITUDE_PLACIDUS,
  MAX_TIMEZONE,
  MAX_YEAR,
  MIN_TIMEZONE,
  MIN_YEAR,
  POLAR_FALLBACK_HOUSE_SYSTEM,
  RECOMMENDED_MAX_YEAR,
  RECOMMENDED_MIN_YEAR,
  VALIDATION_MESSAGES,
} from './constants.js';
import type { BirthData, ChartOptions, ValidationErrorDetail, ValidationResult } from './types.js';
import { ValidationError } from './types.js';

/**
 * Validate birth data for chart calculation.
 *
 * @param birth - Birth data to validate
 * @returns Validation result with errors and warnings
 *
 * @example
 * ```typescript
 * const result = validateBirthData({
 *   year: 2000, month: 1, day: 1,
 *   hour: 12, minute: 0, second: 0,
 *   timezone: 0,
 *   latitude: 51.5, longitude: -0.1
 * });
 *
 * if (!result.valid) {
 *   console.error(result.errors);
 * }
 * ```
 */
export function validateBirthData(birth: BirthData): ValidationResult {
  const errors: ValidationErrorDetail[] = [];
  const warnings: string[] = [];

  // --- Year validation ---
  if (typeof birth.year !== 'number' || !Number.isFinite(birth.year)) {
    errors.push({
      field: 'year',
      message: 'Year must be a finite number',
      value: birth.year,
    });
  } else if (birth.year < MIN_YEAR || birth.year > MAX_YEAR) {
    errors.push({
      field: 'year',
      message: VALIDATION_MESSAGES.invalidYear(birth.year),
      value: birth.year,
      suggestion: `Use a year between ${MIN_YEAR} and ${MAX_YEAR}`,
    });
  } else if (birth.year < RECOMMENDED_MIN_YEAR || birth.year > RECOMMENDED_MAX_YEAR) {
    warnings.push(VALIDATION_MESSAGES.yearOutOfRecommended(birth.year));
  }

  // --- Month validation ---
  if (typeof birth.month !== 'number' || !Number.isInteger(birth.month)) {
    errors.push({
      field: 'month',
      message: 'Month must be an integer',
      value: birth.month,
    });
  } else if (birth.month < 1 || birth.month > 12) {
    errors.push({
      field: 'month',
      message: VALIDATION_MESSAGES.invalidMonth(birth.month),
      value: birth.month,
      suggestion: 'Use a month between 1 and 12',
    });
  }

  // --- Day validation ---
  if (typeof birth.day !== 'number' || !Number.isInteger(birth.day)) {
    errors.push({
      field: 'day',
      message: 'Day must be an integer',
      value: birth.day,
    });
  } else if (birth.day < 1 || birth.day > 31) {
    errors.push({
      field: 'day',
      message: VALIDATION_MESSAGES.invalidDay(birth.day, birth.month, birth.year),
      value: birth.day,
    });
  } else if (
    typeof birth.year === 'number' &&
    typeof birth.month === 'number' &&
    !isValidDate(birth.year, birth.month, birth.day)
  ) {
    errors.push({
      field: 'day',
      message: VALIDATION_MESSAGES.invalidDay(birth.day, birth.month, birth.year),
      value: birth.day,
      suggestion: getMaxDayForMonth(birth.year, birth.month),
    });
  }

  // --- Hour validation ---
  if (typeof birth.hour !== 'number' || !Number.isFinite(birth.hour)) {
    errors.push({
      field: 'hour',
      message: 'Hour must be a finite number',
      value: birth.hour,
    });
  } else if (birth.hour < 0 || birth.hour >= 24) {
    errors.push({
      field: 'hour',
      message: VALIDATION_MESSAGES.invalidHour(birth.hour),
      value: birth.hour,
      suggestion: 'Use an hour between 0 and 23',
    });
  }

  // --- Minute validation ---
  if (typeof birth.minute !== 'number' || !Number.isInteger(birth.minute)) {
    errors.push({
      field: 'minute',
      message: 'Minute must be an integer',
      value: birth.minute,
    });
  } else if (birth.minute < 0 || birth.minute >= 60) {
    errors.push({
      field: 'minute',
      message: VALIDATION_MESSAGES.invalidMinute(birth.minute),
      value: birth.minute,
      suggestion: 'Use a minute between 0 and 59',
    });
  }

  // --- Second validation (optional field) ---
  if (birth.second !== undefined) {
    if (typeof birth.second !== 'number' || !Number.isFinite(birth.second)) {
      errors.push({
        field: 'second',
        message: 'Second must be a finite number',
        value: birth.second,
      });
    } else if (birth.second < 0 || birth.second >= 60) {
      errors.push({
        field: 'second',
        message: VALIDATION_MESSAGES.invalidSecond(birth.second),
        value: birth.second,
        suggestion: 'Use a second between 0 and 59',
      });
    }
  }

  // --- Timezone validation ---
  if (typeof birth.timezone !== 'number' || !Number.isFinite(birth.timezone)) {
    errors.push({
      field: 'timezone',
      message: 'Timezone must be a finite number',
      value: birth.timezone,
    });
  } else if (birth.timezone < MIN_TIMEZONE || birth.timezone > MAX_TIMEZONE) {
    errors.push({
      field: 'timezone',
      message: VALIDATION_MESSAGES.invalidTimezone(birth.timezone),
      value: birth.timezone,
      suggestion: `Use a timezone offset between ${MIN_TIMEZONE} and ${MAX_TIMEZONE}`,
    });
  }

  // --- Latitude validation ---
  if (typeof birth.latitude !== 'number' || !Number.isFinite(birth.latitude)) {
    errors.push({
      field: 'latitude',
      message: 'Latitude must be a finite number',
      value: birth.latitude,
    });
  } else if (birth.latitude < -90 || birth.latitude > 90) {
    errors.push({
      field: 'latitude',
      message: VALIDATION_MESSAGES.invalidLatitude(birth.latitude),
      value: birth.latitude,
      suggestion: 'Use a latitude between -90 and +90',
    });
  }

  // --- Longitude validation ---
  if (typeof birth.longitude !== 'number' || !Number.isFinite(birth.longitude)) {
    errors.push({
      field: 'longitude',
      message: 'Longitude must be a finite number',
      value: birth.longitude,
    });
  } else if (birth.longitude < -180 || birth.longitude > 180) {
    errors.push({
      field: 'longitude',
      message: VALIDATION_MESSAGES.invalidLongitude(birth.longitude),
      value: birth.longitude,
      suggestion: 'Use a longitude between -180 and +180',
    });
  }

  // Build result
  const result: ValidationResult = {
    valid: errors.length === 0,
    errors,
    warnings,
  };

  // Add normalized data if valid
  if (result.valid) {
    result.normalized = {
      ...birth,
      second: birth.second ?? 0,
    };
  }

  return result;
}

/**
 * Validate and adjust chart options for the given latitude.
 *
 * @param options - Chart options (may be modified)
 * @param latitude - Geographic latitude
 * @returns Adjusted options and any warnings
 */
export function validateChartOptions(
  options: ChartOptions | undefined,
  latitude: number,
): { options: ChartOptions; warnings: string[] } {
  const warnings: string[] = [];
  const result = { ...options };

  const absLatitude = Math.abs(latitude);
  const requestedSystem = options?.houseSystem ?? 'placidus';

  // Check if latitude is too high for requested house system
  if (LATITUDE_SENSITIVE_SYSTEMS.includes(requestedSystem)) {
    if (absLatitude > MAX_LATITUDE_PLACIDUS) {
      warnings.push(VALIDATION_MESSAGES.latitudeTooHighForSystem(latitude, requestedSystem));
      result.houseSystem = FALLBACK_HOUSE_SYSTEM;
    }
  }

  // Check for extreme polar latitude
  if (absLatitude > MAX_LATITUDE_ANY) {
    warnings.push(
      `Latitude ${latitude}° is extremely close to pole. Using ${POLAR_FALLBACK_HOUSE_SYSTEM} house system.`,
    );
    result.houseSystem = POLAR_FALLBACK_HOUSE_SYSTEM;
  }

  return { options: result, warnings };
}

/**
 * Validate birth data and throw if invalid.
 *
 * @param birth - Birth data to validate
 * @throws {ValidationError} If validation fails
 */
export function requireValidBirthData(birth: BirthData): void {
  const result = validateBirthData(birth);

  if (!result.valid) {
    const firstError = result.errors[0];
    throw new ValidationError(firstError.message, firstError.field, firstError.value);
  }
}

/**
 * Check if the given date/time results in day rollover when converting to UTC.
 *
 * @param birth - Birth data
 * @returns Object describing any day/month/year rollover
 */
export function checkDayRollover(birth: BirthData): {
  rollsOver: boolean;
  direction: 'previous' | 'next' | 'none';
} {
  const utcHour = birth.hour - birth.timezone;

  if (utcHour < 0) {
    return { rollsOver: true, direction: 'previous' };
  }
  if (utcHour >= 24) {
    return { rollsOver: true, direction: 'next' };
  }

  return { rollsOver: false, direction: 'none' };
}

/**
 * Get the maximum valid day for a given month and year.
 *
 * @param year - Year
 * @param month - Month (1-12)
 * @returns String like "Use a day between 1 and 28"
 */
function getMaxDayForMonth(year: number, month: number): string {
  const maxDays = [0, 31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const max = maxDays[month] ?? 31;
  return `Use a day between 1 and ${max} for month ${month}`;
}

/**
 * Check if a year is a leap year in the Gregorian calendar.
 */
function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Get available house systems for a given latitude.
 *
 * @param latitude - Geographic latitude
 * @returns Array of house systems that work at this latitude
 */
export function getAvailableHouseSystems(latitude: number): string[] {
  const absLatitude = Math.abs(latitude);

  if (absLatitude > MAX_LATITUDE_ANY) {
    return ['whole-sign'];
  }

  if (absLatitude > MAX_LATITUDE_PLACIDUS) {
    return ['equal', 'whole-sign', 'porphyry', 'regiomontanus', 'campanus'];
  }

  return ['placidus', 'koch', 'equal', 'whole-sign', 'porphyry', 'regiomontanus', 'campanus'];
}
