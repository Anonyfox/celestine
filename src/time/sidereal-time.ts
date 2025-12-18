/**
 * Sidereal Time calculations
 *
 * Calculate Greenwich Mean Sidereal Time (GMST) from Julian Date.
 * Sidereal time is based on Earth's rotation relative to the stars.
 *
 * A sidereal day is about 23h 56m 4s, roughly 4 minutes shorter than
 * a solar day. This is because Earth orbits the Sun, requiring slightly
 * more than 360° rotation to bring the Sun back to the same position.
 *
 * @see "Astronomical Algorithms" by Jean Meeus, Chapter 12
 */

import { toJulianCenturies } from './julian-centuries.js';
import { normalizeAngle } from './time-utils.js';

/**
 * Calculate Greenwich Mean Sidereal Time from Julian Date
 *
 * Uses the IAU 1982 formula from Jean Meeus "Astronomical Algorithms".
 * Returns GMST in degrees (0-360).
 *
 * GMST tells you what Right Ascension is currently on the Greenwich meridian.
 * It's needed for calculating the Ascendant and house cusps.
 *
 * @param jd - Julian Date (UT)
 * @returns Greenwich Mean Sidereal Time in degrees (0-360)
 *
 * @see "Astronomical Algorithms" by Jean Meeus, Chapter 12, page 88
 *
 * @example
 * // J2000.0 epoch (January 1, 2000, 12:00 UT)
 * greenwichMeanSiderealTime(2451545.0)
 * // Returns: ~280.46° (18h 42m)
 *
 * @example
 * // Calculate for a specific date
 * const jd = toJulianDate({ year: 2024, month: 6, day: 15, hour: 0, minute: 0, second: 0 });
 * const gmst = greenwichMeanSiderealTime(jd);
 */
export function greenwichMeanSiderealTime(jd: number): number {
  // Convert to Julian Centuries from J2000.0
  const T = toJulianCenturies(jd);

  // IAU 1982 formula (Meeus equation 12.4)
  // GMST at 0h UT = 280.46061837 + 360.98564736629 * D + 0.000387933 * T² - T³ / 38710000
  // where D = days since J2000.0

  // Calculate days since J2000.0 from JD
  const D = jd - 2451545.0;

  // Calculate GMST in degrees
  let gmst =
    280.46061837 + // Constant term
    360.98564736629 * D + // Linear term (rotation per day)
    0.000387933 * T * T - // Quadratic term
    (T * T * T) / 38710000; // Cubic term

  // Normalize to 0-360 degrees
  gmst = normalizeAngle(gmst);

  return gmst;
}

/**
 * Calculate Greenwich Mean Sidereal Time at 0h UT for a given Julian Date
 *
 * This gives the GMST at midnight (0h UT) on the given date, which is
 * useful as a reference point for calculating GMST at other times of day.
 *
 * @param jd - Julian Date
 * @returns GMST at 0h UT in degrees (0-360)
 *
 * @example
 * // GMST at midnight on J2000.0
 * greenwichMeanSiderealTimeAt0h(2451545.0)
 */
export function greenwichMeanSiderealTimeAt0h(jd: number): number {
  // Get the JD at 0h UT (midnight) of the same day
  // JD at noon = integer + 0.5, so JD at midnight = integer + 0.0
  const jd0h = Math.floor(jd - 0.5) + 0.5;

  return greenwichMeanSiderealTime(jd0h);
}

/**
 * Calculate the change in GMST per hour
 *
 * Due to Earth's rotation relative to the stars, GMST advances by about
 * 15.04° per hour (slightly more than 15° which would be for solar time).
 *
 * This is useful for interpolating GMST between known values.
 *
 * @returns Rate of change of GMST in degrees per hour
 */
export function gmstRatePerHour(): number {
  // Earth rotates 360° in one sidereal day
  // A sidereal day is 23h 56m 4.09s = 23.934469 hours
  // So the rate is 360 / 23.934469 ≈ 15.041067 degrees/hour
  return 360 / 23.934469;
}
