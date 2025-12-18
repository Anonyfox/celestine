/**
 * Time module constants
 *
 * Fundamental constants for astronomical time calculations.
 * All values are based on IAU (International Astronomical Union) standards
 * and definitions from Jean Meeus "Astronomical Algorithms".
 */

/**
 * J2000.0 epoch: January 1, 2000, 12:00 TT (Terrestrial Time)
 *
 * This is the standard reference epoch for modern astronomical calculations.
 * Most ephemeris formulas and coordinate transformations are calibrated to this epoch.
 *
 * @constant
 * @see "Astronomical Algorithms" by Jean Meeus, Chapter 21
 */
export const J2000_EPOCH = 2451545.0;

/**
 * Number of days in a Julian century
 *
 * Used to convert Julian Date to Julian Centuries: T = (JD - J2000_EPOCH) / DAYS_PER_CENTURY
 *
 * @constant
 */
export const DAYS_PER_CENTURY = 36525;

/**
 * Modified Julian Date epoch offset
 *
 * MJD is defined as: MJD = JD - 2400000.5
 * Used in some modern systems to work with smaller numbers.
 * MJD 0 = JD 2400000.5 = November 17, 1858, 00:00 UT
 *
 * @constant
 */
export const MJD_EPOCH = 2400000.5;

/**
 * Unix epoch in Julian Date
 *
 * January 1, 1970, 00:00:00 UTC in Julian Date representation.
 * Useful for converting between Unix timestamps and Julian Dates.
 *
 * @constant
 */
export const UNIX_EPOCH_JD = 2440587.5;

/**
 * Number of seconds in a day
 *
 * @constant
 */
export const SECONDS_PER_DAY = 86400;

/**
 * Number of minutes in a day
 *
 * @constant
 */
export const MINUTES_PER_DAY = 1440;

/**
 * Number of hours in a day
 *
 * @constant
 */
export const HOURS_PER_DAY = 24;

/**
 * Minutes per hour
 *
 * @constant
 */
export const MINUTES_PER_HOUR = 60;

/**
 * Seconds per minute
 *
 * @constant
 */
export const SECONDS_PER_MINUTE = 60;

/**
 * Seconds per hour
 *
 * @constant
 */
export const SECONDS_PER_HOUR = 3600;

/**
 * Degrees per hour (for sidereal time conversions)
 *
 * Since a full rotation is 360° and 24 hours: 360° / 24h = 15°/h
 *
 * @constant
 */
export const DEGREES_PER_HOUR = 15;

/**
 * Degrees in a full circle
 *
 * @constant
 */
export const DEGREES_PER_CIRCLE = 360;

/**
 * Minutes of arc per degree
 *
 * @constant
 */
export const ARCMINUTES_PER_DEGREE = 60;

/**
 * Seconds of arc per degree
 *
 * @constant
 */
export const ARCSECONDS_PER_DEGREE = 3600;

/**
 * Ratio of sidereal day to solar day
 *
 * A sidereal day is the time it takes Earth to rotate 360° relative to the stars.
 * It's about 4 minutes shorter than a solar day (23h 56m 4.09s vs 24h).
 *
 * This ratio is: 1 sidereal day / 1 solar day ≈ 0.99726957
 *
 * @constant
 */
export const SIDEREAL_DAY_RATIO = 0.99726957;

/**
 * Length of a sidereal day in solar days
 *
 * @constant
 */
export const SIDEREAL_DAY_IN_DAYS = 0.99726957;

/**
 * Length of a solar day in sidereal days
 *
 * @constant
 */
export const SOLAR_DAY_IN_SIDEREAL_DAYS = 1.00273791;

/**
 * Gregorian calendar reform date: October 15, 1582 (JD)
 *
 * The Gregorian calendar was adopted on October 15, 1582 (Gregorian),
 * which was October 4, 1582 in the Julian calendar (10 days were skipped).
 * Dates before this should use Julian calendar rules, after this use Gregorian.
 *
 * @constant
 */
export const GREGORIAN_REFORM_JD = 2299160.5;

/**
 * Number of days in each month (non-leap year)
 *
 * Index 0 is unused, indices 1-12 correspond to January-December.
 *
 * @constant
 */
export const DAYS_IN_MONTH = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/**
 * Number of days in each month (leap year)
 *
 * Index 0 is unused, indices 1-12 correspond to January-December.
 *
 * @constant
 */
export const DAYS_IN_MONTH_LEAP = [0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/**
 * Month names
 *
 * Index 0 is unused, indices 1-12 correspond to January-December.
 *
 * @constant
 */
export const MONTH_NAMES = [
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
