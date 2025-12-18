/**
 * Julian Date conversion
 *
 * Convert Gregorian calendar dates to Julian Date (JD), the standard
 * time measure in astronomical calculations.
 *
 * Algorithm from Jean Meeus, "Astronomical Algorithms" (2nd ed.), Chapter 7.
 *
 * Julian Date is a continuous count of days since noon Universal Time on
 * January 1, 4713 BCE (Julian calendar), which is November 24, 4714 BCE
 * in the Gregorian proleptic calendar.
 */

import { timeToFractionOfDay } from './time-utils.js';
import type { CalendarDateTime } from './types.js';

/**
 * Convert a calendar date/time to Julian Date
 *
 * Uses the Meeus algorithm which handles both Gregorian (post-1582) and
 * Julian (pre-1582) calendar dates automatically.
 *
 * The calendar reform occurred on October 15, 1582 (Gregorian), which was
 * October 4, 1582 (Julian). Days October 5-14, 1582 don't exist in the
 * Gregorian calendar.
 *
 * @param date - Calendar date and time (can include timezone)
 * @returns Julian Date (fractional days since JD epoch)
 *
 * @see "Astronomical Algorithms" by Jean Meeus, Chapter 7
 *
 * @example
 * // J2000.0 epoch: January 1, 2000, 12:00 UTC
 * toJulianDate({
 *   year: 2000, month: 1, day: 1,
 *   hour: 12, minute: 0, second: 0
 * })
 * // Returns: 2451545.0
 *
 * @example
 * // With timezone (converted to UTC)
 * toJulianDate({
 *   year: 2000, month: 1, day: 1,
 *   hour: 12, minute: 0, second: 0,
 *   timezone: -5  // EST
 * })
 * // Returns: 2451545.208333... (17:00 UTC)
 */
export function toJulianDate(date: CalendarDateTime): number {
  // Extract components
  let year = date.year;
  let month = date.month;
  let day = date.day;
  let hour = date.hour;
  const minute = date.minute;
  const second = date.second;

  // Convert local time to UTC if timezone is specified
  if (date.timezone !== undefined) {
    // Subtract timezone offset to get UTC
    // timezone = -5 means EST, so UTC = local - (-5) = local + 5
    hour -= date.timezone;

    // Handle hour overflow/underflow by adjusting day
    if (hour >= 24) {
      const extraDays = Math.floor(hour / 24);
      day += extraDays;
      hour = hour % 24;
    } else if (hour < 0) {
      const daysToSubtract = Math.floor((-hour + 23) / 24);
      day -= daysToSubtract;
      hour += daysToSubtract * 24;
    }
  }

  // Convert time to fractional day
  const fractionalDay = timeToFractionOfDay(hour, minute, second);

  // Meeus algorithm adjustment: treat January and February as months 13 and 14
  // of the previous year. This simplifies the leap year calculation.
  if (month <= 2) {
    year -= 1;
    month += 12;
  }

  // Determine if we should use Gregorian or Julian calendar
  // After the month adjustment, check using ORIGINAL calendar date
  // We check based on the actual input date, not the adjusted year
  let calendarCorrection = 0;

  // Use original date values for calendar check
  const originalYear = date.year;
  const originalMonth = date.month;
  const originalDay = date.day;

  if (
    originalYear > 1582 ||
    (originalYear === 1582 && originalMonth > 10) ||
    (originalYear === 1582 && originalMonth === 10 && originalDay + fractionalDay >= 15)
  ) {
    // Gregorian calendar: apply correction for century years
    // Use the ADJUSTED year for the correction calculation
    const a = Math.floor(year / 100);
    calendarCorrection = 2 - a + Math.floor(a / 4);
  }
  // else: Julian calendar, no correction (calendarCorrection = 0)

  // Meeus formula for Julian Date
  // This works for both positive and negative years
  const jd =
    Math.floor(365.25 * (year + 4716)) +
    Math.floor(30.6001 * (month + 1)) +
    day +
    fractionalDay +
    calendarCorrection -
    1524.5;

  return jd;
}

/**
 * Create a Julian Date from individual components
 *
 * Convenience function for creating JD without constructing a CalendarDateTime object.
 *
 * @param year - Full year
 * @param month - Month (1-12)
 * @param day - Day of month
 * @param hour - Hour (0-23), defaults to 0
 * @param minute - Minute (0-59), defaults to 0
 * @param second - Second (0-59.999...), defaults to 0
 * @returns Julian Date
 *
 * @example
 * julianDate(2000, 1, 1, 12, 0, 0)  // J2000.0 epoch
 * // Returns: 2451545.0
 */
export function julianDate(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
): number {
  return toJulianDate({ year, month, day, hour, minute, second });
}
