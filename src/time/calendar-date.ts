/**
 * Calendar Date Module
 *
 * Converts Julian Date back to Gregorian calendar date (reverse conversion).
 * Uses the inverse Meeus algorithm from "Astronomical Algorithms" Chapter 7.
 *
 * @module time/calendar-date
 */

import { fractionOfDayToTime } from './time-utils.js';
import type { CalendarDateTime } from './types.js';

/**
 * Converts a Julian Date to a Gregorian calendar date and time
 *
 * This is the inverse operation of toJulianDate(). It extracts the calendar
 * date components (year, month, day) and time components (hour, minute, second)
 * from a Julian Date number.
 *
 * The algorithm automatically handles:
 * - Gregorian calendar (dates after Oct 15, 1582)
 * - Julian calendar (dates before Oct 5, 1582)
 * - Fractional days → time components
 * - Negative years (BCE dates)
 *
 * @param jd - Julian Date (can be fractional)
 * @returns CalendarDateTime object with year, month, day, hour, minute, second
 *
 * @example
 * ```typescript
 * // J2000.0 epoch
 * const date = fromJulianDate(2451545.0);
 * // Returns: { year: 2000, month: 1, day: 1, hour: 12, minute: 0, second: 0 }
 *
 * // Unix epoch
 * const unix = fromJulianDate(2440587.5);
 * // Returns: { year: 1970, month: 1, day: 1, hour: 0, minute: 0, second: 0 }
 * ```
 */
export function fromJulianDate(jd: number): CalendarDateTime {
  // Add 0.5 to JD and split into integer and fractional parts
  const jdPlusHalf = jd + 0.5;
  const z = Math.floor(jdPlusHalf);
  const f = jdPlusHalf - z;

  let a: number;

  // Determine if we're in Gregorian or Julian calendar
  // Gregorian calendar reform: JD 2299161 = Oct 15, 1582
  if (z >= 2299161) {
    // Gregorian calendar
    const alpha = Math.floor((z - 1867216.25) / 36524.25);
    a = z + 1 + alpha - Math.floor(alpha / 4);
  } else {
    // Julian calendar
    a = z;
  }

  const b = a + 1524;
  const c = Math.floor((b - 122.1) / 365.25);
  const d = Math.floor(365.25 * c);
  const e = Math.floor((b - d) / 30.6001);

  // Calculate day (with fractional part)
  const dayWithFraction = b - d - Math.floor(30.6001 * e) + f;
  const day = Math.floor(dayWithFraction);
  const fractionalDay = dayWithFraction - day;

  // Calculate month
  let month: number;
  if (e < 14) {
    month = e - 1;
  } else {
    month = e - 13;
  }

  // Calculate year
  let year: number;
  if (month > 2) {
    year = c - 4716;
  } else {
    year = c - 4715;
  }

  // Convert fractional day to time components
  const { hour, minute, second } = fractionOfDayToTime(fractionalDay);

  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
  };
}

/**
 * Convenience function that returns CalendarDateTime from JD
 *
 * @param jd - Julian Date
 * @returns CalendarDateTime object
 *
 * @example
 * ```typescript
 * const date = calendarDate(2451545.0);
 * console.log(date); // { year: 2000, month: 1, day: 1, ... }
 * ```
 */
export function calendarDate(jd: number): CalendarDateTime {
  return fromJulianDate(jd);
}
