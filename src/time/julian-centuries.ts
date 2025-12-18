/**
 * Julian Centuries conversion
 *
 * Convert Julian Date to Julian Centuries from the J2000.0 epoch.
 * Most modern ephemeris formulas use T (Julian Centuries) as their time variable.
 *
 * Formula: T = (JD - 2451545.0) / 36525
 *
 * @see "Astronomical Algorithms" by Jean Meeus, Chapter 22
 */

import { DAYS_PER_CENTURY, J2000_EPOCH } from './constants.js';

/**
 * Convert Julian Date to Julian Centuries from J2000.0 epoch
 *
 * The J2000.0 epoch is January 1, 2000, 12:00 TT (JD 2451545.0).
 * Most planetary position formulas use T as the time parameter.
 *
 * @param jd - Julian Date
 * @returns Julian Centuries from J2000.0 (can be negative for dates before 2000)
 *
 * @example
 * // J2000.0 epoch
 * toJulianCenturies(2451545.0)  // Returns: 0.0
 *
 * @example
 * // One century after J2000.0
 * toJulianCenturies(2488070.0)  // Returns: 1.0
 *
 * @example
 * // One century before J2000.0
 * toJulianCenturies(2415020.0)  // Returns: -1.0
 */
export function toJulianCenturies(jd: number): number {
  return (jd - J2000_EPOCH) / DAYS_PER_CENTURY;
}

/**
 * Convert Julian Centuries to Julian Date
 *
 * Inverse of toJulianCenturies. Useful for converting T back to JD.
 *
 * @param T - Julian Centuries from J2000.0
 * @returns Julian Date
 *
 * @example
 * // J2000.0 epoch
 * fromJulianCenturies(0.0)  // Returns: 2451545.0
 *
 * @example
 * // One century after J2000.0
 * fromJulianCenturies(1.0)  // Returns: 2488070.0
 */
export function fromJulianCenturies(T: number): number {
  return J2000_EPOCH + T * DAYS_PER_CENTURY;
}
