/**
 * Time utility functions
 *
 * Helper functions for time-related operations, including angle normalization,
 * unit conversions, and time component transformations.
 */

import { DEGREES_PER_CIRCLE, DEGREES_PER_HOUR, HOURS_PER_DAY } from './constants.js';

/**
 * Normalize an angle to the range [0, 360) degrees
 *
 * Reduces any angle to its equivalent value between 0 (inclusive) and 360 (exclusive).
 * Handles both positive and negative input values.
 *
 * @param degrees - Angle in degrees (can be any value)
 * @returns Normalized angle in range [0, 360)
 *
 * @example
 * normalizeAngle(45)    // 45
 * normalizeAngle(365)   // 5
 * normalizeAngle(-30)   // 330
 * normalizeAngle(720)   // 0
 */
export function normalizeAngle(degrees: number): number {
  // Use modulo to wrap to 0-360 range
  // Add 360 and modulo again to handle negative values
  return ((degrees % DEGREES_PER_CIRCLE) + DEGREES_PER_CIRCLE) % DEGREES_PER_CIRCLE;
}

/**
 * Convert degrees to hours
 *
 * Used for sidereal time conversions where 360° = 24 hours.
 *
 * @param degrees - Angle in degrees
 * @returns Equivalent in hours
 *
 * @example
 * degreesToHours(0)    // 0
 * degreesToHours(180)  // 12
 * degreesToHours(360)  // 24
 */
export function degreesToHours(degrees: number): number {
  return degrees / DEGREES_PER_HOUR;
}

/**
 * Convert hours to degrees
 *
 * Used for sidereal time conversions where 24 hours = 360°.
 *
 * @param hours - Time in hours
 * @returns Equivalent in degrees
 *
 * @example
 * hoursToDegrees(0)   // 0
 * hoursToDegrees(12)  // 180
 * hoursToDegrees(24)  // 360
 */
export function hoursToDegrees(hours: number): number {
  return hours * DEGREES_PER_HOUR;
}

/**
 * Convert a fractional day to time components
 *
 * Extracts hours, minutes, and seconds from a fractional day value.
 * A full day (1.0) = 24 hours.
 *
 * @param fraction - Fractional day (0.0 to 1.0, where 0.5 = noon)
 * @returns Object with hour (0-23), minute (0-59), and second (0-59.999...)
 *
 * @example
 * fractionOfDayToTime(0.0)    // { hour: 0, minute: 0, second: 0 }
 * fractionOfDayToTime(0.5)    // { hour: 12, minute: 0, second: 0 }
 * fractionOfDayToTime(0.75)   // { hour: 18, minute: 0, second: 0 }
 */
export function fractionOfDayToTime(fraction: number): {
  hour: number;
  minute: number;
  second: number;
} {
  // Normalize fraction to 0-1 range
  const normalizedFraction = fraction - Math.floor(fraction);

  // Convert to total hours
  const totalHours = normalizedFraction * HOURS_PER_DAY;
  const hour = Math.floor(totalHours);

  // Extract minutes from remaining fractional hours
  const fractionalHours = totalHours - hour;
  const totalMinutes = fractionalHours * 60;
  const minute = Math.floor(totalMinutes);

  // Extract seconds from remaining fractional minutes
  const fractionalMinutes = totalMinutes - minute;
  const second = fractionalMinutes * 60;

  return { hour, minute, second };
}

/**
 * Convert time components to a fractional day
 *
 * Combines hours, minutes, and seconds into a fractional day value.
 * A full day = 1.0.
 *
 * @param hour - Hour of day (0-23)
 * @param minute - Minute of hour (0-59)
 * @param second - Second of minute (0-59.999...)
 * @returns Fractional day (0.0 to <1.0)
 *
 * @example
 * timeToFractionOfDay(0, 0, 0)     // 0.0
 * timeToFractionOfDay(12, 0, 0)    // 0.5
 * timeToFractionOfDay(18, 0, 0)    // 0.75
 * timeToFractionOfDay(6, 30, 0)    // 0.270833...
 */
export function timeToFractionOfDay(hour: number, minute: number, second: number): number {
  // Convert all to hours
  const totalHours = hour + minute / 60 + second / 3600;

  // Convert to fraction of day
  return totalHours / HOURS_PER_DAY;
}

/**
 * Format a Julian Date as a string for debugging/display
 *
 * @param jd - Julian Date value
 * @returns Formatted string
 *
 * @example
 * formatJulianDate(2451545.0)  // "JD 2451545.0"
 */
export function formatJulianDate(jd: number): string {
  return `JD ${jd.toFixed(6)}`;
}

/**
 * Format sidereal time as a string
 *
 * Displays sidereal time in both degrees and hours format.
 *
 * @param degrees - Sidereal time in degrees (0-360)
 * @returns Formatted string
 *
 * @example
 * formatSiderealTime(180)  // "180.000000° (12.000000h)"
 */
export function formatSiderealTime(degrees: number): string {
  const hours = degreesToHours(degrees);
  return `${degrees.toFixed(6)}° (${hours.toFixed(6)}h)`;
}
