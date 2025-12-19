/**
 * Time Conversion for Chart Calculation
 *
 * Converts birth data to astronomical time values needed for chart calculation.
 *
 * @module chart/time-conversion
 */

import { meanObliquity } from '../houses/obliquity.js';
import { toJulianCenturies } from '../time/julian-centuries.js';
import { toJulianDate } from '../time/julian-date.js';
import { localSiderealTime } from '../time/local-sidereal-time.js';
import { greenwichMeanSiderealTime } from '../time/sidereal-time.js';
import type { CalendarDateTime } from '../time/types.js';
import type { BirthData, CalculatedData } from './types.js';

/**
 * Convert local birth time to UTC.
 *
 * @param birth - Birth data with local time and timezone
 * @returns UTC datetime
 *
 * @remarks
 * Handles day rollover when timezone conversion crosses midnight.
 *
 * @example
 * ```typescript
 * // 18:00 EST (-5) = 23:00 UTC
 * const utc = localToUTC({
 *   year: 2000, month: 1, day: 1,
 *   hour: 18, minute: 0, second: 0,
 *   timezone: -5, latitude: 0, longitude: 0
 * });
 * // { year: 2000, month: 1, day: 1, hour: 23, minute: 0, second: 0 }
 * ```
 */
export function localToUTC(birth: BirthData): CalendarDateTime {
  const second = birth.second ?? 0;

  // Convert to decimal hours in UTC
  let utcHour = birth.hour + birth.minute / 60 + second / 3600 - birth.timezone;

  let year = birth.year;
  let month = birth.month;
  let day = birth.day;

  // Handle day rollover backward (UTC time is in previous day)
  while (utcHour < 0) {
    utcHour += 24;
    day--;

    // Handle month rollback
    if (day < 1) {
      month--;
      if (month < 1) {
        month = 12;
        year--;
      }
      day = getDaysInMonth(year, month);
    }
  }

  // Handle day rollover forward (UTC time is in next day)
  while (utcHour >= 24) {
    utcHour -= 24;
    day++;

    // Handle month advance
    const daysInMonth = getDaysInMonth(year, month);
    if (day > daysInMonth) {
      day = 1;
      month++;
      if (month > 12) {
        month = 1;
        year++;
      }
    }
  }

  // Extract components from decimal hour
  const hour = Math.floor(utcHour);
  const remainingMinutes = (utcHour - hour) * 60;
  const minute = Math.floor(remainingMinutes);
  const utcSecond = Math.round((remainingMinutes - minute) * 60);

  return {
    year,
    month,
    day,
    hour,
    minute,
    second: utcSecond,
  };
}

/**
 * Calculate all time-related values needed for chart calculation.
 *
 * @param birth - Validated birth data
 * @returns Calculated time values (JD, T, LST, obliquity, etc.)
 *
 * @example
 * ```typescript
 * const data = calculateTimeData({
 *   year: 2000, month: 1, day: 1,
 *   hour: 12, minute: 0, second: 0,
 *   timezone: 0,
 *   latitude: 51.5, longitude: -0.1
 * });
 *
 * console.log(data.julianDate); // 2451545.0
 * console.log(data.localSiderealTime); // ~degrees
 * ```
 */
export function calculateTimeData(birth: BirthData): CalculatedData {
  // Step 1: Convert local time to UTC
  const utcDateTime = localToUTC(birth);

  // Step 2: Calculate Julian Date (UT)
  const julianDate = toJulianDate(utcDateTime);

  // Step 3: Calculate Julian Centuries from J2000.0
  const julianCenturies = toJulianCenturies(julianDate);

  // Step 4: Calculate Greenwich Mean Sidereal Time (in degrees)
  const greenwichSiderealTime = greenwichMeanSiderealTime(julianDate);

  // Step 5: Calculate Local Sidereal Time (in degrees)
  // LST = GMST + longitude (east positive)
  const lst = localSiderealTime(greenwichSiderealTime, birth.longitude);

  // Step 6: Calculate obliquity of the ecliptic
  const obliquity = meanObliquity(julianCenturies);

  // Step 7: Determine if it's daytime (Sun above horizon)
  // This is a simplified check - Sun is above horizon roughly 6am-6pm local
  // For accurate day/night, we'd need to calculate Sun position first
  // We'll refine this when we have the Sun position
  const localHour = birth.hour + birth.minute / 60;
  const isDaytime = localHour >= 6 && localHour < 18;

  return {
    julianDate,
    julianCenturies,
    localSiderealTime: lst,
    greenwichSiderealTime,
    obliquity,
    utcDateTime,
    isDaytime, // Will be recalculated with actual Sun position
  };
}

/**
 * Recalculate isDaytime based on actual Sun position.
 *
 * @param sunLongitude - Sun's ecliptic longitude
 * @param ascendant - Ascendant longitude
 * @returns True if Sun is above horizon (in houses 7-12)
 *
 * @remarks
 * Sun is above horizon when it's in the upper half of the chart.
 * This is determined by whether it's in houses 7-12 (above ASC-DSC axis).
 */
export function calculateIsDaytime(sunLongitude: number, ascendant: number): boolean {
  // Normalize angles
  const sun = normalizeAngle(sunLongitude);
  const asc = normalizeAngle(ascendant);
  const dsc = normalizeAngle(ascendant + 180);

  // Sun is above horizon if it's between DSC and ASC (going counter-clockwise)
  // This means houses 7-12
  if (dsc < asc) {
    // DSC is "behind" ASC in the circle
    return sun >= dsc && sun < asc;
  }
  // DSC is "ahead" of ASC (crosses 0°)
  return sun >= dsc || sun < asc;
}

/**
 * Get the number of days in a month.
 */
function getDaysInMonth(year: number, month: number): number {
  const daysPerMonth = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  if (month === 2 && isLeapYear(year)) {
    return 29;
  }

  return daysPerMonth[month] ?? 31;
}

/**
 * Check if a year is a leap year.
 */
function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Normalize an angle to 0-360 degrees.
 */
function normalizeAngle(angle: number): number {
  let result = angle % 360;
  if (result < 0) {
    result += 360;
  }
  return result;
}
