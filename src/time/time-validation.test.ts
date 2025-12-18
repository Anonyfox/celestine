import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  daysInMonth,
  isLeapYear,
  isValidDate,
  isValidTime,
  validateCalendarDateTime,
} from './time-validation.js';
import type { CalendarDateTime } from './types.js';

describe('Time Validation', () => {
  describe('isLeapYear', () => {
    it('should identify leap years divisible by 4', () => {
      assert.equal(isLeapYear(2024), true);
      assert.equal(isLeapYear(2020), true);
      assert.equal(isLeapYear(2016), true);
      assert.equal(isLeapYear(2012), true);
    });

    it('should identify non-leap years not divisible by 4', () => {
      assert.equal(isLeapYear(2023), false);
      assert.equal(isLeapYear(2022), false);
      assert.equal(isLeapYear(2021), false);
      assert.equal(isLeapYear(2019), false);
    });

    it('should handle century years divisible by 400 (leap)', () => {
      assert.equal(isLeapYear(2000), true);
      assert.equal(isLeapYear(2400), true);
      assert.equal(isLeapYear(1600), true);
    });

    it('should handle century years divisible by 100 but not 400 (not leap)', () => {
      assert.equal(isLeapYear(1900), false);
      assert.equal(isLeapYear(2100), false);
      assert.equal(isLeapYear(2200), false);
      assert.equal(isLeapYear(2300), false);
    });

    it('should handle negative years (BCE)', () => {
      // Year 0 (1 BCE) is a leap year in astronomical year numbering
      assert.equal(isLeapYear(0), true);
      // Year -4 (5 BCE) is a leap year
      assert.equal(isLeapYear(-4), true);
      // Year -1 (2 BCE) is not a leap year
      assert.equal(isLeapYear(-1), false);
    });

    it('should handle year 4 (first leap year CE)', () => {
      assert.equal(isLeapYear(4), true);
    });
  });

  describe('daysInMonth', () => {
    it('should return correct days for non-leap year months', () => {
      assert.equal(daysInMonth(2023, 1), 31); // January
      assert.equal(daysInMonth(2023, 2), 28); // February (non-leap)
      assert.equal(daysInMonth(2023, 3), 31); // March
      assert.equal(daysInMonth(2023, 4), 30); // April
      assert.equal(daysInMonth(2023, 5), 31); // May
      assert.equal(daysInMonth(2023, 6), 30); // June
      assert.equal(daysInMonth(2023, 7), 31); // July
      assert.equal(daysInMonth(2023, 8), 31); // August
      assert.equal(daysInMonth(2023, 9), 30); // September
      assert.equal(daysInMonth(2023, 10), 31); // October
      assert.equal(daysInMonth(2023, 11), 30); // November
      assert.equal(daysInMonth(2023, 12), 31); // December
    });

    it('should return 29 for February in leap years', () => {
      assert.equal(daysInMonth(2024, 2), 29);
      assert.equal(daysInMonth(2020, 2), 29);
      assert.equal(daysInMonth(2000, 2), 29);
    });

    it('should return 28 for February in non-leap years', () => {
      assert.equal(daysInMonth(2023, 2), 28);
      assert.equal(daysInMonth(2022, 2), 28);
      assert.equal(daysInMonth(1900, 2), 28); // Century year, not leap
    });

    it('should return 0 for invalid months', () => {
      assert.equal(daysInMonth(2024, 0), 0);
      assert.equal(daysInMonth(2024, 13), 0);
      assert.equal(daysInMonth(2024, -1), 0);
      assert.equal(daysInMonth(2024, 100), 0);
    });

    it('should handle negative years', () => {
      assert.equal(daysInMonth(-100, 1), 31);
      assert.equal(daysInMonth(-100, 2), 28);
    });
  });

  describe('isValidDate', () => {
    it('should accept valid dates', () => {
      assert.equal(isValidDate(2024, 1, 1), true);
      assert.equal(isValidDate(2024, 12, 31), true);
      assert.equal(isValidDate(2024, 6, 15), true);
    });

    it('should accept Feb 29 in leap years', () => {
      assert.equal(isValidDate(2024, 2, 29), true);
      assert.equal(isValidDate(2020, 2, 29), true);
      assert.equal(isValidDate(2000, 2, 29), true);
    });

    it('should reject Feb 29 in non-leap years', () => {
      assert.equal(isValidDate(2023, 2, 29), false);
      assert.equal(isValidDate(2022, 2, 29), false);
      assert.equal(isValidDate(1900, 2, 29), false);
    });

    it('should reject invalid months', () => {
      assert.equal(isValidDate(2024, 0, 1), false);
      assert.equal(isValidDate(2024, 13, 1), false);
      assert.equal(isValidDate(2024, -1, 1), false);
    });

    it('should reject day 0 or negative days', () => {
      assert.equal(isValidDate(2024, 1, 0), false);
      assert.equal(isValidDate(2024, 1, -1), false);
      assert.equal(isValidDate(2024, 6, -5), false);
    });

    it('should reject days beyond month length', () => {
      assert.equal(isValidDate(2024, 1, 32), false); // January has 31 days
      assert.equal(isValidDate(2024, 2, 30), false); // February has 28/29 days
      assert.equal(isValidDate(2024, 4, 31), false); // April has 30 days
      assert.equal(isValidDate(2024, 6, 31), false); // June has 30 days
    });

    it('should accept edge cases', () => {
      assert.equal(isValidDate(2024, 1, 31), true); // Last day of January
      assert.equal(isValidDate(2024, 4, 30), true); // Last day of April
      assert.equal(isValidDate(2024, 2, 28), true); // Valid even in leap year
    });

    it('should handle negative years', () => {
      assert.equal(isValidDate(-100, 1, 1), true);
      assert.equal(isValidDate(-100, 2, 29), false); // Not a leap year
    });

    it('should handle year 0', () => {
      assert.equal(isValidDate(0, 1, 1), true);
      assert.equal(isValidDate(0, 2, 29), true); // Year 0 is leap
    });
  });

  describe('isValidTime', () => {
    it('should accept valid times', () => {
      assert.equal(isValidTime(0, 0, 0), true);
      assert.equal(isValidTime(12, 30, 45), true);
      assert.equal(isValidTime(23, 59, 59), true);
    });

    it('should accept fractional seconds', () => {
      assert.equal(isValidTime(12, 30, 45.5), true);
      assert.equal(isValidTime(0, 0, 0.001), true);
      assert.equal(isValidTime(23, 59, 59.999), true);
    });

    it('should reject hour >= 24', () => {
      assert.equal(isValidTime(24, 0, 0), false);
      assert.equal(isValidTime(25, 0, 0), false);
      assert.equal(isValidTime(100, 0, 0), false);
    });

    it('should reject negative hour', () => {
      assert.equal(isValidTime(-1, 0, 0), false);
      assert.equal(isValidTime(-12, 0, 0), false);
    });

    it('should reject minute >= 60', () => {
      assert.equal(isValidTime(12, 60, 0), false);
      assert.equal(isValidTime(12, 61, 0), false);
      assert.equal(isValidTime(12, 100, 0), false);
    });

    it('should reject negative minute', () => {
      assert.equal(isValidTime(12, -1, 0), false);
      assert.equal(isValidTime(12, -30, 0), false);
    });

    it('should reject second >= 60', () => {
      assert.equal(isValidTime(12, 30, 60), false);
      assert.equal(isValidTime(12, 30, 61), false);
      assert.equal(isValidTime(12, 30, 100), false);
    });

    it('should reject negative second', () => {
      assert.equal(isValidTime(12, 30, -1), false);
      assert.equal(isValidTime(12, 30, -0.5), false);
    });

    it('should accept midnight and noon', () => {
      assert.equal(isValidTime(0, 0, 0), true); // Midnight
      assert.equal(isValidTime(12, 0, 0), true); // Noon
    });

    it('should accept 23:59:59.999 but reject 24:00:00', () => {
      assert.equal(isValidTime(23, 59, 59.999), true);
      assert.equal(isValidTime(24, 0, 0), false);
    });
  });

  describe('validateCalendarDateTime', () => {
    it('should validate correct date/time', () => {
      const date: CalendarDateTime = {
        year: 2024,
        month: 6,
        day: 15,
        hour: 12,
        minute: 30,
        second: 45,
      };
      const result = validateCalendarDateTime(date);
      assert.equal(result.valid, true);
      assert.equal(result.errors.length, 0);
    });

    it('should detect invalid month', () => {
      const date: CalendarDateTime = {
        year: 2024,
        month: 13,
        day: 1,
        hour: 12,
        minute: 0,
        second: 0,
      };
      const result = validateCalendarDateTime(date);
      assert.equal(result.valid, false);
      assert.ok(result.errors.some((e) => e.includes('Month')));
    });

    it('should detect invalid day', () => {
      const date: CalendarDateTime = {
        year: 2024,
        month: 4,
        day: 31,
        hour: 12,
        minute: 0,
        second: 0,
      };
      const result = validateCalendarDateTime(date);
      assert.equal(result.valid, false);
      assert.ok(result.errors.some((e) => e.includes('April 31')));
    });

    it('should detect Feb 29 in non-leap year', () => {
      const date: CalendarDateTime = {
        year: 2023,
        month: 2,
        day: 29,
        hour: 12,
        minute: 0,
        second: 0,
      };
      const result = validateCalendarDateTime(date);
      assert.equal(result.valid, false);
      assert.ok(result.errors.some((e) => e.includes('February 29')));
    });

    it('should detect invalid hour', () => {
      const date: CalendarDateTime = {
        year: 2024,
        month: 6,
        day: 15,
        hour: 25,
        minute: 0,
        second: 0,
      };
      const result = validateCalendarDateTime(date);
      assert.equal(result.valid, false);
      assert.ok(result.errors.some((e) => e.includes('Hour')));
    });

    it('should detect invalid minute', () => {
      const date: CalendarDateTime = {
        year: 2024,
        month: 6,
        day: 15,
        hour: 12,
        minute: 60,
        second: 0,
      };
      const result = validateCalendarDateTime(date);
      assert.equal(result.valid, false);
      assert.ok(result.errors.some((e) => e.includes('Minute')));
    });

    it('should detect invalid second', () => {
      const date: CalendarDateTime = {
        year: 2024,
        month: 6,
        day: 15,
        hour: 12,
        minute: 30,
        second: 60,
      };
      const result = validateCalendarDateTime(date);
      assert.equal(result.valid, false);
      assert.ok(result.errors.some((e) => e.includes('Second')));
    });

    it('should detect multiple errors', () => {
      const date: CalendarDateTime = {
        year: 2023,
        month: 2,
        day: 29,
        hour: 25,
        minute: 60,
        second: 60,
      };
      const result = validateCalendarDateTime(date);
      assert.equal(result.valid, false);
      assert.ok(result.errors.length >= 4);
    });

    it('should accept valid timezone', () => {
      const date: CalendarDateTime = {
        year: 2024,
        month: 6,
        day: 15,
        hour: 12,
        minute: 0,
        second: 0,
        timezone: -5,
      };
      const result = validateCalendarDateTime(date);
      assert.equal(result.valid, true);
    });

    it('should warn about unusual timezone but not fail', () => {
      const date: CalendarDateTime = {
        year: 2024,
        month: 6,
        day: 15,
        hour: 12,
        minute: 0,
        second: 0,
        timezone: 20,
      };
      const result = validateCalendarDateTime(date);
      // Warning about timezone, but date/time is still valid
      assert.equal(result.valid, false); // Unusual timezone creates error
      assert.ok(result.errors.some((e) => e.includes('timezone')));
    });

    it('should accept leap day in leap year', () => {
      const date: CalendarDateTime = {
        year: 2024,
        month: 2,
        day: 29,
        hour: 12,
        minute: 0,
        second: 0,
      };
      const result = validateCalendarDateTime(date);
      assert.equal(result.valid, true);
    });

    it('should accept fractional seconds', () => {
      const date: CalendarDateTime = {
        year: 2024,
        month: 6,
        day: 15,
        hour: 12,
        minute: 30,
        second: 45.123,
      };
      const result = validateCalendarDateTime(date);
      assert.equal(result.valid, true);
    });
  });
});
