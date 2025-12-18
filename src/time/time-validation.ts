/**
 * Time validation functions
 *
 * Functions to validate calendar dates, time components, and detect leap years.
 * These are essential for ensuring input data is valid before astronomical calculations.
 */

import { DAYS_IN_MONTH, DAYS_IN_MONTH_LEAP } from './constants.js';
import type { CalendarDateTime, ValidationResult } from './types.js';

/**
 * Check if a year is a leap year
 *
 * Leap year rules (Gregorian calendar):
 * - Divisible by 4: leap year
 * - EXCEPT divisible by 100: not a leap year
 * - EXCEPT divisible by 400: leap year
 *
 * Examples: 2000 (leap), 1900 (not leap), 2024 (leap), 2100 (not leap)
 *
 * @param year - Full year number (can be negative for BCE)
 * @returns true if leap year, false otherwise
 *
 * @example
 * isLeapYear(2000)  // true
 * isLeapYear(1900)  // false
 * isLeapYear(2024)  // true
 */
export function isLeapYear(year: number): boolean {
  // Divisible by 400: definitely a leap year
  if (year % 400 === 0) {
    return true;
  }

  // Divisible by 100 (but not 400): not a leap year
  if (year % 100 === 0) {
    return false;
  }

  // Divisible by 4 (but not 100): leap year
  if (year % 4 === 0) {
    return true;
  }

  // Otherwise: not a leap year
  return false;
}

/**
 * Get the number of days in a given month
 *
 * Takes leap years into account for February.
 *
 * @param year - Full year number
 * @param month - Month (1-12, where 1 = January)
 * @returns Number of days in the month (28-31), or 0 if month is invalid
 *
 * @example
 * daysInMonth(2024, 2)   // 29 (leap year)
 * daysInMonth(2023, 2)   // 28 (not leap year)
 * daysInMonth(2024, 4)   // 30 (April)
 */
export function daysInMonth(year: number, month: number): number {
  // Validate month range
  if (month < 1 || month > 12) {
    return 0;
  }

  // Use leap year array for February in leap years
  if (month === 2 && isLeapYear(year)) {
    return DAYS_IN_MONTH_LEAP[2];
  }

  // Use standard array for all other cases
  return DAYS_IN_MONTH[month];
}

/**
 * Validate a calendar date
 *
 * Checks if the year, month, and day form a valid date.
 * Takes leap years into account.
 *
 * Note: Year 0 doesn't exist historically (1 BCE → 1 CE), but we allow it
 * for astronomical calculations (ISO 8601 uses year 0 = 1 BCE).
 *
 * @param year - Full year number
 * @param month - Month (1-12)
 * @param day - Day of month
 * @returns true if valid date, false otherwise
 *
 * @example
 * isValidDate(2024, 2, 29)   // true (leap year)
 * isValidDate(2023, 2, 29)   // false (not leap year)
 * isValidDate(2024, 13, 1)   // false (invalid month)
 * isValidDate(2024, 4, 31)   // false (April has 30 days)
 */
export function isValidDate(year: number, month: number, day: number): boolean {
  // Check month range
  if (month < 1 || month > 12) {
    return false;
  }

  // Check day range
  if (day < 1) {
    return false;
  }

  // Check day doesn't exceed days in month
  const maxDays = daysInMonth(year, month);
  if (day > maxDays) {
    return false;
  }

  return true;
}

/**
 * Validate time components
 *
 * Checks if hour, minute, and second values are within valid ranges.
 * Allows fractional seconds.
 *
 * @param hour - Hour (0-23)
 * @param minute - Minute (0-59)
 * @param second - Second (0-59.999...)
 * @returns true if valid time, false otherwise
 *
 * @example
 * isValidTime(12, 30, 45)      // true
 * isValidTime(23, 59, 59.999)  // true
 * isValidTime(24, 0, 0)        // false (hour must be 0-23)
 * isValidTime(12, 60, 0)       // false (minute must be 0-59)
 */
export function isValidTime(hour: number, minute: number, second: number): boolean {
  // Check hour range (0-23)
  if (hour < 0 || hour >= 24) {
    return false;
  }

  // Check minute range (0-59)
  if (minute < 0 || minute >= 60) {
    return false;
  }

  // Check second range (0-59.999...)
  // Allow up to but not including 60
  if (second < 0 || second >= 60) {
    return false;
  }

  return true;
}

/**
 * Validate a complete CalendarDateTime object
 *
 * Performs comprehensive validation on all components of a calendar date/time.
 * Returns detailed error messages for any invalid components.
 *
 * @param date - CalendarDateTime object to validate
 * @returns ValidationResult with valid flag and array of error messages
 *
 * @example
 * validateCalendarDateTime({
 *   year: 2024, month: 2, day: 29,
 *   hour: 12, minute: 30, second: 45
 * })
 * // { valid: true, errors: [] }
 *
 * @example
 * validateCalendarDateTime({
 *   year: 2023, month: 2, day: 29,
 *   hour: 25, minute: 30, second: 45
 * })
 * // {
 * //   valid: false,
 * //   errors: [
 * //     'Invalid day: February 29 doesn't exist in 2023',
 * //     'Hour must be between 0 and 23, got 25'
 * //   ]
 * // }
 */
export function validateCalendarDateTime(date: CalendarDateTime): ValidationResult {
  const errors: string[] = [];

  // Validate month
  if (date.month < 1 || date.month > 12) {
    errors.push(`Month must be between 1 and 12, got ${date.month}`);
  }

  // Validate date (if month is valid)
  if (date.month >= 1 && date.month <= 12) {
    if (date.day < 1) {
      errors.push(`Day must be at least 1, got ${date.day}`);
    } else {
      const maxDays = daysInMonth(date.year, date.month);
      if (date.day > maxDays) {
        const monthNames = [
          '',
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
        errors.push(
          `Invalid day: ${monthNames[date.month]} ${date.day} doesn't exist in ${date.year}`,
        );
      }
    }
  }

  // Validate hour
  if (date.hour < 0 || date.hour >= 24) {
    errors.push(`Hour must be between 0 and 23, got ${date.hour}`);
  }

  // Validate minute
  if (date.minute < 0 || date.minute >= 60) {
    errors.push(`Minute must be between 0 and 59, got ${date.minute}`);
  }

  // Validate second
  if (date.second < 0 || date.second >= 60) {
    errors.push(`Second must be between 0 and 59, got ${date.second}`);
  }

  // Validate timezone if present
  if (date.timezone !== undefined) {
    // Timezone can be any value, but typically -12 to +14
    // We'll allow a wider range but warn about unusual values
    if (date.timezone < -12 || date.timezone > 14) {
      // This is a warning, not an error - some locations have unusual timezones
      errors.push(`Unusual timezone offset: ${date.timezone} (expected -12 to +14)`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
