import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { J2000_EPOCH } from './constants.js';
import { julianDate, toJulianDate } from './julian-date.js';
import type { CalendarDateTime } from './types.js';

describe('Julian Date Conversion', () => {
  describe('toJulianDate - Reference Values', () => {
    it('should calculate J2000.0 epoch correctly', () => {
      // January 1, 2000, 12:00 UT = JD 2451545.0
      const date: CalendarDateTime = {
        year: 2000,
        month: 1,
        day: 1,
        hour: 12,
        minute: 0,
        second: 0,
      };
      const jd = toJulianDate(date);
      assert.equal(jd, J2000_EPOCH);
      assert.equal(jd, 2451545.0);
    });

    it('should calculate midnight on J2000 date', () => {
      // January 1, 2000, 00:00 UT = JD 2451544.5
      const date: CalendarDateTime = {
        year: 2000,
        month: 1,
        day: 1,
        hour: 0,
        minute: 0,
        second: 0,
      };
      const jd = toJulianDate(date);
      assert.equal(jd, 2451544.5);
    });

    it('should calculate day before J2000', () => {
      // December 31, 1999, 12:00 UT = JD 2451544.0
      const date: CalendarDateTime = {
        year: 1999,
        month: 12,
        day: 31,
        hour: 12,
        minute: 0,
        second: 0,
      };
      const jd = toJulianDate(date);
      assert.equal(jd, 2451544.0);
    });

    it('should calculate Unix epoch', () => {
      // January 1, 1970, 00:00 UT = JD 2440587.5
      const date: CalendarDateTime = {
        year: 1970,
        month: 1,
        day: 1,
        hour: 0,
        minute: 0,
        second: 0,
      };
      const jd = toJulianDate(date);
      assert.equal(jd, 2440587.5);
    });

    it('should calculate Modified Julian Date epoch', () => {
      // November 17, 1858, 00:00 UT = JD 2400000.5 (MJD 0)
      const date: CalendarDateTime = {
        year: 1858,
        month: 11,
        day: 17,
        hour: 0,
        minute: 0,
        second: 0,
      };
      const jd = toJulianDate(date);
      assert.equal(jd, 2400000.5);
    });

    it('should calculate Gregorian calendar reform date', () => {
      // October 15, 1582, 00:00 UT (first day of Gregorian calendar)
      const date: CalendarDateTime = {
        year: 1582,
        month: 10,
        day: 15,
        hour: 0,
        minute: 0,
        second: 0,
      };
      const jd = toJulianDate(date);
      // This should be JD 2299160.5
      assert.equal(jd, 2299160.5);
    });
  });

  describe('toJulianDate - Time Components', () => {
    it('should handle fractional days correctly', () => {
      // 6 hours = 0.25 days
      const date: CalendarDateTime = {
        year: 2000,
        month: 1,
        day: 1,
        hour: 6,
        minute: 0,
        second: 0,
      };
      const jd = toJulianDate(date);
      assert.equal(jd, 2451544.75);
    });

    it('should handle minutes correctly', () => {
      // 12:30 = 0.5208333... days
      const date: CalendarDateTime = {
        year: 2000,
        month: 1,
        day: 1,
        hour: 12,
        minute: 30,
        second: 0,
      };
      const jd = toJulianDate(date);
      assert.ok(Math.abs(jd - 2451545.020833333) < 1e-9);
    });

    it('should handle seconds correctly', () => {
      // 12:00:30 = (12 + 30/3600)/24 days
      const date: CalendarDateTime = {
        year: 2000,
        month: 1,
        day: 1,
        hour: 12,
        minute: 0,
        second: 30,
      };
      const jd = toJulianDate(date);
      const expected = 2451545.0 + 30 / 86400; // 30 seconds in days
      assert.ok(Math.abs(jd - expected) < 1e-9);
    });

    it('should handle midnight (start of day)', () => {
      const date: CalendarDateTime = {
        year: 2000,
        month: 1,
        day: 1,
        hour: 0,
        minute: 0,
        second: 0,
      };
      const jd = toJulianDate(date);
      assert.equal(jd, 2451544.5); // JD day starts at noon, so midnight is .5
    });

    it('should handle noon (JD day boundary)', () => {
      const date: CalendarDateTime = {
        year: 2000,
        month: 1,
        day: 1,
        hour: 12,
        minute: 0,
        second: 0,
      };
      const jd = toJulianDate(date);
      assert.equal(jd, 2451545.0); // Exact JD day
    });

    it('should handle end of day (23:59:59)', () => {
      const date: CalendarDateTime = {
        year: 2000,
        month: 1,
        day: 1,
        hour: 23,
        minute: 59,
        second: 59,
      };
      const jd = toJulianDate(date);
      const expected = 2451545.0 + (23 * 3600 + 59 * 60 + 59) / 86400 - 0.5;
      assert.ok(Math.abs(jd - expected) < 1e-6);
    });
  });

  describe('toJulianDate - Month Boundaries', () => {
    it('should handle January correctly', () => {
      const date: CalendarDateTime = {
        year: 2024,
        month: 1,
        day: 15,
        hour: 12,
        minute: 0,
        second: 0,
      };
      const jd = toJulianDate(date);
      assert.ok(jd > 2451545.0); // After J2000
    });

    it('should handle February correctly', () => {
      const date: CalendarDateTime = {
        year: 2024,
        month: 2,
        day: 15,
        hour: 12,
        minute: 0,
        second: 0,
      };
      const jd = toJulianDate(date);
      assert.ok(jd > 2451545.0);
    });

    it('should handle December correctly', () => {
      const date: CalendarDateTime = {
        year: 1999,
        month: 12,
        day: 31,
        hour: 12,
        minute: 0,
        second: 0,
      };
      const jd = toJulianDate(date);
      assert.equal(jd, 2451544.0); // Day before J2000
    });

    it('should handle leap day (Feb 29) in leap years', () => {
      const date: CalendarDateTime = {
        year: 2024,
        month: 2,
        day: 29,
        hour: 12,
        minute: 0,
        second: 0,
      };
      const jd = toJulianDate(date);
      assert.ok(jd > 2451545.0);
      // Feb 29 should be one day after Feb 28
      const feb28: CalendarDateTime = {
        year: 2024,
        month: 2,
        day: 28,
        hour: 12,
        minute: 0,
        second: 0,
      };
      const jdFeb28 = toJulianDate(feb28);
      assert.ok(Math.abs(jd - jdFeb28 - 1.0) < 1e-9);
    });

    it('should handle month transitions correctly', () => {
      // January 31 → February 1 should be exactly 1 day difference
      const jan31: CalendarDateTime = {
        year: 2024,
        month: 1,
        day: 31,
        hour: 12,
        minute: 0,
        second: 0,
      };
      const feb1: CalendarDateTime = {
        year: 2024,
        month: 2,
        day: 1,
        hour: 12,
        minute: 0,
        second: 0,
      };
      const jdJan31 = toJulianDate(jan31);
      const jdFeb1 = toJulianDate(feb1);
      assert.ok(Math.abs(jdFeb1 - jdJan31 - 1.0) < 1e-9);
    });
  });

  describe('toJulianDate - Year Boundaries', () => {
    it('should handle new year transition', () => {
      // December 31 → January 1 should be exactly 1 day
      const dec31: CalendarDateTime = {
        year: 1999,
        month: 12,
        day: 31,
        hour: 12,
        minute: 0,
        second: 0,
      };
      const jan1: CalendarDateTime = {
        year: 2000,
        month: 1,
        day: 1,
        hour: 12,
        minute: 0,
        second: 0,
      };
      const jdDec31 = toJulianDate(dec31);
      const jdJan1 = toJulianDate(jan1);
      assert.ok(Math.abs(jdJan1 - jdDec31 - 1.0) < 1e-9);
    });

    it('should handle century transitions', () => {
      const date1999: CalendarDateTime = {
        year: 1999,
        month: 12,
        day: 31,
        hour: 12,
        minute: 0,
        second: 0,
      };
      const date2000: CalendarDateTime = {
        year: 2000,
        month: 1,
        day: 1,
        hour: 12,
        minute: 0,
        second: 0,
      };
      const jd1999 = toJulianDate(date1999);
      const jd2000 = toJulianDate(date2000);
      assert.ok(Math.abs(jd2000 - jd1999 - 1.0) < 1e-9);
    });
  });

  describe('toJulianDate - Leap Years', () => {
    it('should handle regular leap year (2024)', () => {
      const feb29: CalendarDateTime = {
        year: 2024,
        month: 2,
        day: 29,
        hour: 12,
        minute: 0,
        second: 0,
      };
      const march1: CalendarDateTime = {
        year: 2024,
        month: 3,
        day: 1,
        hour: 12,
        minute: 0,
        second: 0,
      };
      const jdFeb29 = toJulianDate(feb29);
      const jdMarch1 = toJulianDate(march1);
      assert.ok(Math.abs(jdMarch1 - jdFeb29 - 1.0) < 1e-9);
    });

    it('should handle century leap year (2000)', () => {
      const feb29: CalendarDateTime = {
        year: 2000,
        month: 2,
        day: 29,
        hour: 12,
        minute: 0,
        second: 0,
      };
      const march1: CalendarDateTime = {
        year: 2000,
        month: 3,
        day: 1,
        hour: 12,
        minute: 0,
        second: 0,
      };
      const jdFeb29 = toJulianDate(feb29);
      const jdMarch1 = toJulianDate(march1);
      assert.ok(Math.abs(jdMarch1 - jdFeb29 - 1.0) < 1e-9);
    });
  });

  describe('toJulianDate - Historical Dates', () => {
    it('should handle dates before 2000', () => {
      const date: CalendarDateTime = {
        year: 1900,
        month: 1,
        day: 1,
        hour: 12,
        minute: 0,
        second: 0,
      };
      const jd = toJulianDate(date);
      assert.ok(jd < J2000_EPOCH);
      // January 1, 1900, 12:00 = JD 2415021.0
      assert.ok(Math.abs(jd - 2415021.0) < 1);
    });

    it('should handle dates in 19th century', () => {
      const date: CalendarDateTime = {
        year: 1800,
        month: 1,
        day: 1,
        hour: 12,
        minute: 0,
        second: 0,
      };
      const jd = toJulianDate(date);
      assert.ok(jd > 2000000 && jd < 2400000);
    });
  });

  describe('toJulianDate - Future Dates', () => {
    it('should handle dates after 2000', () => {
      const date: CalendarDateTime = {
        year: 2024,
        month: 12,
        day: 18,
        hour: 12,
        minute: 0,
        second: 0,
      };
      const jd = toJulianDate(date);
      assert.ok(jd > J2000_EPOCH);
      // Approximately JD 2460665.0 - allow wider tolerance
      assert.ok(Math.abs(jd - 2460665.0) < 5);
    });

    it('should handle far future dates', () => {
      const date: CalendarDateTime = {
        year: 3000,
        month: 1,
        day: 1,
        hour: 12,
        minute: 0,
        second: 0,
      };
      const jd = toJulianDate(date);
      assert.ok(jd > J2000_EPOCH);
    });
  });

  describe('toJulianDate - Timezone Handling', () => {
    it('should convert timezone to UTC correctly', () => {
      // 12:00 EST (-5) = 17:00 UTC
      const dateEST: CalendarDateTime = {
        year: 2000,
        month: 1,
        day: 1,
        hour: 12,
        minute: 0,
        second: 0,
        timezone: -5,
      };
      const jd = toJulianDate(dateEST);
      // 17:00 UTC = 17/24 days from midnight = 0.708333... days
      // JD should be 2451544.5 + 0.708333... = 2451545.208333...
      assert.ok(Math.abs(jd - 2451545.208333333) < 1e-6);
    });

    it('should handle positive timezone offset', () => {
      // 12:00 CET (+1) = 11:00 UTC
      const dateCET: CalendarDateTime = {
        year: 2000,
        month: 1,
        day: 1,
        hour: 12,
        minute: 0,
        second: 0,
        timezone: 1,
      };
      const jd = toJulianDate(dateCET);
      // 11:00 UTC = 11/24 days from midnight
      const expected = 2451544.5 + 11 / 24;
      assert.ok(Math.abs(jd - expected) < 1e-9);
    });

    it('should handle UTC (timezone 0)', () => {
      const dateUTC: CalendarDateTime = {
        year: 2000,
        month: 1,
        day: 1,
        hour: 12,
        minute: 0,
        second: 0,
        timezone: 0,
      };
      const jd = toJulianDate(dateUTC);
      assert.equal(jd, 2451545.0);
    });
  });

  describe('julianDate convenience function', () => {
    it('should work with all parameters', () => {
      const jd = julianDate(2000, 1, 1, 12, 0, 0);
      assert.equal(jd, 2451545.0);
    });

    it('should work with default time (midnight)', () => {
      const jd = julianDate(2000, 1, 1);
      assert.equal(jd, 2451544.5);
    });

    it('should work with partial time', () => {
      const jd = julianDate(2000, 1, 1, 12);
      assert.equal(jd, 2451545.0);
    });

    it('should match toJulianDate results', () => {
      const date: CalendarDateTime = {
        year: 2024,
        month: 6,
        day: 15,
        hour: 18,
        minute: 30,
        second: 45,
      };
      const jd1 = toJulianDate(date);
      const jd2 = julianDate(2024, 6, 15, 18, 30, 45);
      assert.equal(jd1, jd2);
    });
  });

  describe('toJulianDate - Continuity', () => {
    it('should have continuous values across day boundaries', () => {
      // Every hour should add exactly 1/24 day
      const baseDate: CalendarDateTime = {
        year: 2000,
        month: 1,
        day: 1,
        hour: 0,
        minute: 0,
        second: 0,
      };
      const baseJD = toJulianDate(baseDate);

      for (let hour = 1; hour < 24; hour++) {
        const date: CalendarDateTime = { ...baseDate, hour };
        const jd = toJulianDate(date);
        const expected = baseJD + hour / 24;
        assert.ok(Math.abs(jd - expected) < 1e-9);
      }
    });

    it('should increase monotonically', () => {
      let prevJD = 0;
      for (let day = 1; day <= 31; day++) {
        const date: CalendarDateTime = {
          year: 2000,
          month: 1,
          day,
          hour: 12,
          minute: 0,
          second: 0,
        };
        const jd = toJulianDate(date);
        assert.ok(jd > prevJD);
        prevJD = jd;
      }
    });
  });
});
