/**
 * Time Module
 *
 * Astronomical time calculations including Julian Date, Julian Centuries,
 * Sidereal Time conversions, and Delta T corrections.
 *
 * This module provides the foundational time functions needed for all
 * astronomical and astrological calculations.
 *
 * @module time
 */

// Calendar Date conversion (JD → Calendar)
export { calendarDate, fromJulianDate } from './calendar-date.js';
// Constants
export {
  ARCMINUTES_PER_DEGREE,
  ARCSECONDS_PER_DEGREE,
  DAYS_IN_MONTH,
  DAYS_IN_MONTH_LEAP,
  DAYS_PER_CENTURY,
  DEGREES_PER_CIRCLE,
  DEGREES_PER_HOUR,
  GREGORIAN_REFORM_JD,
  HOURS_PER_DAY,
  J2000_EPOCH,
  MINUTES_PER_DAY,
  MINUTES_PER_HOUR,
  MJD_EPOCH,
  MONTH_NAMES,
  SECONDS_PER_DAY,
  SECONDS_PER_HOUR,
  SECONDS_PER_MINUTE,
  SIDEREAL_DAY_IN_DAYS,
  SIDEREAL_DAY_RATIO,
  SOLAR_DAY_IN_SIDEREAL_DAYS,
  UNIX_EPOCH_JD,
} from './constants.js';

// Delta T (ΔT corrections)
export { deltaT, ttToUT, utToTT } from './delta-t.js';

// Julian Centuries conversion
export { fromJulianCenturies, toJulianCenturies } from './julian-centuries.js';

// Julian Date conversion
export { julianDate, toJulianDate } from './julian-date.js';

// Local Sidereal Time
export { localSiderealTime } from './local-sidereal-time.js';

// Sidereal Time
export {
  gmstRatePerHour,
  greenwichMeanSiderealTime,
  greenwichMeanSiderealTimeAt0h,
} from './sidereal-time.js';

// Utility functions
export {
  degreesToHours,
  formatJulianDate,
  formatSiderealTime,
  fractionOfDayToTime,
  hoursToDegrees,
  normalizeAngle,
  timeToFractionOfDay,
} from './time-utils.js';

// Validation
export {
  daysInMonth,
  isLeapYear,
  isValidDate,
  isValidTime,
  validateCalendarDateTime,
} from './time-validation.js';

// Type definitions
export type {
  CalendarDateTime,
  JulianCenturies,
  JulianDate,
  SiderealTime,
  TimeContext,
  TimeSystem,
  ValidationResult,
} from './types.js';
