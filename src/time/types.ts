/**
 * Time module type definitions
 *
 * Core types for astronomical time calculations, including calendar dates,
 * Julian dates, and sidereal time representations.
 */

/**
 * Gregorian calendar date and time representation
 *
 * Used as the primary input format for astronomical calculations.
 * All components must be valid according to the Gregorian calendar rules.
 *
 * @property year - Full year (e.g., 2025, -100 for 101 BCE). Note: Year 0 doesn't exist historically.
 * @property month - Month of year, 1-12 (January = 1, December = 12)
 * @property day - Day of month, 1-31 (depending on month and year)
 * @property hour - Hour of day, 0-23 (0 = midnight, 12 = noon)
 * @property minute - Minute of hour, 0-59
 * @property second - Second of minute, 0-59.999... (fractional seconds allowed)
 * @property timezone - Optional hours offset from UTC (e.g., -5 for EST, +1 for CET)
 */
export interface CalendarDateTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  timezone?: number;
}

/**
 * Julian Date representation
 *
 * A continuous count of days and fractional days since noon (12:00 UT)
 * on January 1, 4713 BCE in the proleptic Julian calendar.
 * This is the standard time measure in astronomical calculations.
 *
 * @property jd - Julian Date value (fractional days)
 *
 * @example
 * // J2000.0 epoch (January 1, 2000, 12:00 TT)
 * { jd: 2451545.0 }
 *
 * @example
 * // December 18, 2025, 18:00 UTC
 * { jd: 2460665.25 }
 */
export interface JulianDate {
  jd: number;
}

/**
 * Julian Centuries from J2000.0 epoch
 *
 * Time expressed as centuries from the J2000.0 epoch (JD 2451545.0).
 * Most modern ephemeris formulas use T as their time variable.
 *
 * @property T - Centuries from J2000.0 (can be negative for dates before 2000)
 *
 * @example
 * // J2000.0 epoch (January 1, 2000, 12:00 TT)
 * { T: 0 }
 *
 * @example
 * // One century after J2000.0
 * { T: 1.0 }
 *
 * @example
 * // One century before J2000.0
 * { T: -1.0 }
 */
export interface JulianCenturies {
  T: number;
}

/**
 * Sidereal time representation
 *
 * Time measured by Earth's rotation relative to the fixed stars
 * rather than the Sun. A sidereal day is ~23h 56m 4s.
 *
 * Can be expressed in either degrees (0-360) or hours (0-24).
 *
 * @property degrees - Sidereal time in degrees (0-360, where 360° = 24 hours)
 * @property hours - Optional sidereal time in hours (0-24)
 */
export interface SiderealTime {
  degrees: number;
  hours?: number;
}

/**
 * Time system classification
 *
 * Different time scales used in astronomy and daily life:
 * - UT: Universal Time (based on Earth's rotation)
 * - UTC: Coordinated Universal Time (civil time standard with leap seconds)
 * - TT: Terrestrial Time (uniform time scale for ephemeris, TT = UTC + ΔT)
 * - local: Local civil time (includes timezone offset)
 */
export type TimeSystem = 'UT' | 'UTC' | 'TT' | 'local';

/**
 * Complete time context for astronomical calculations
 *
 * Bundles all time representations together for convenience.
 * Useful when you need multiple time formats for a single moment.
 *
 * @property calendar - Calendar date and time representation
 * @property jd - Julian Date
 * @property T - Julian Centuries from J2000.0
 * @property gmst - Optional Greenwich Mean Sidereal Time in degrees
 * @property lst - Optional Local Sidereal Time in degrees
 * @property system - Which time system the calendar time is expressed in
 */
export interface TimeContext {
  calendar: CalendarDateTime;
  jd: number;
  T: number;
  gmst?: number;
  lst?: number;
  system: TimeSystem;
}

/**
 * Validation result for date/time validation functions
 *
 * @property valid - Whether the input is valid
 * @property errors - Array of error messages if invalid
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}
