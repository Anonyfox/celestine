/**
 * Tests for Calendar Date conversion (JD → Calendar)
 *
 * @module time/calendar-date.test
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { calendarDate, fromJulianDate } from './calendar-date.js';
import { GREGORIAN_REFORM_JD, J2000_EPOCH, UNIX_EPOCH_JD } from './constants.js';
import { toJulianDate } from './julian-date.js';

describe('fromJulianDate', () => {
  describe('Reference epochs', () => {
    it('should convert J2000.0 epoch correctly', () => {
      const date = fromJulianDate(J2000_EPOCH);
      assert.strictEqual(date.year, 2000);
      assert.strictEqual(date.month, 1);
      assert.strictEqual(date.day, 1);
      assert.strictEqual(date.hour, 12);
      assert.strictEqual(date.minute, 0);
      assert.ok(Math.abs(date.second) < 0.001);
    });

    it('should convert Unix epoch correctly', () => {
      const date = fromJulianDate(UNIX_EPOCH_JD);
      assert.strictEqual(date.year, 1970);
      assert.strictEqual(date.month, 1);
      assert.strictEqual(date.day, 1);
      assert.strictEqual(date.hour, 0);
      assert.strictEqual(date.minute, 0);
      assert.ok(Math.abs(date.second) < 0.001);
    });

    it('should convert Gregorian reform date correctly', () => {
      // Oct 15, 1582 (first day of Gregorian calendar)
      const date = fromJulianDate(GREGORIAN_REFORM_JD);
      assert.strictEqual(date.year, 1582);
      assert.strictEqual(date.month, 10);
      assert.strictEqual(date.day, 15);
      assert.strictEqual(date.hour, 0);
      assert.strictEqual(date.minute, 0);
      assert.ok(Math.abs(date.second) < 0.001);
    });
  });

  describe('Round-trip consistency', () => {
    it('should round-trip J2000.0 epoch', () => {
      const original = {
        year: 2000,
        month: 1,
        day: 1,
        hour: 12,
        minute: 0,
        second: 0,
      };
      const jd = toJulianDate(original);
      const converted = fromJulianDate(jd);
      assert.strictEqual(converted.year, original.year);
      assert.strictEqual(converted.month, original.month);
      assert.strictEqual(converted.day, original.day);
      assert.strictEqual(converted.hour, original.hour);
      assert.strictEqual(converted.minute, original.minute);
      assert.ok(Math.abs(converted.second - original.second) < 0.001);
    });

    it('should round-trip current date', () => {
      const original = {
        year: 2025,
        month: 12,
        day: 18,
        hour: 15,
        minute: 30,
        second: 45.5,
      };
      const jd = toJulianDate(original);
      const converted = fromJulianDate(jd);
      assert.strictEqual(converted.year, original.year);
      assert.strictEqual(converted.month, original.month);
      assert.strictEqual(converted.day, original.day);
      assert.strictEqual(converted.hour, original.hour);
      assert.strictEqual(converted.minute, original.minute);
      assert.ok(Math.abs(converted.second - original.second) < 0.001);
    });

    it('should round-trip leap year date', () => {
      const original = {
        year: 2024,
        month: 2,
        day: 29,
        hour: 23,
        minute: 59,
        second: 59.999,
      };
      const jd = toJulianDate(original);
      const converted = fromJulianDate(jd);
      assert.strictEqual(converted.year, original.year);
      assert.strictEqual(converted.month, original.month);
      assert.strictEqual(converted.day, original.day);
      assert.strictEqual(converted.hour, original.hour);
      assert.strictEqual(converted.minute, original.minute);
      assert.ok(Math.abs(converted.second - original.second) < 0.01);
    });

    it('should round-trip year boundary (Dec 31)', () => {
      const original = {
        year: 2023,
        month: 12,
        day: 31,
        hour: 23,
        minute: 59,
        second: 59,
      };
      const jd = toJulianDate(original);
      const converted = fromJulianDate(jd);
      assert.strictEqual(converted.year, original.year);
      assert.strictEqual(converted.month, original.month);
      assert.strictEqual(converted.day, original.day);
      assert.strictEqual(converted.hour, original.hour);
      assert.strictEqual(converted.minute, original.minute);
      assert.ok(Math.abs(converted.second - original.second) < 0.001);
    });

    it('should round-trip year boundary (Jan 1)', () => {
      const original = {
        year: 2024,
        month: 1,
        day: 1,
        hour: 0,
        minute: 0,
        second: 0,
      };
      const jd = toJulianDate(original);
      const converted = fromJulianDate(jd);
      assert.strictEqual(converted.year, original.year);
      assert.strictEqual(converted.month, original.month);
      assert.strictEqual(converted.day, original.day);
      assert.strictEqual(converted.hour, original.hour);
      assert.strictEqual(converted.minute, original.minute);
      assert.ok(Math.abs(converted.second - original.second) < 0.001);
    });
  });

  describe('Historical dates', () => {
    it('should convert dates before Gregorian reform (Julian calendar)', () => {
      // Oct 4, 1582 (last day of Julian calendar)
      const jd = GREGORIAN_REFORM_JD - 1;
      const date = fromJulianDate(jd);
      assert.strictEqual(date.year, 1582);
      assert.strictEqual(date.month, 10);
      assert.strictEqual(date.day, 4);
    });

    it('should handle ancient dates', () => {
      const original = {
        year: -100,
        month: 7,
        day: 15,
        hour: 12,
        minute: 0,
        second: 0,
      };
      const jd = toJulianDate(original);
      const converted = fromJulianDate(jd);
      assert.strictEqual(converted.year, original.year);
      assert.strictEqual(converted.month, original.month);
      assert.strictEqual(converted.day, original.day);
    });

    it('should handle very ancient dates', () => {
      const original = {
        year: -4712,
        month: 1,
        day: 1,
        hour: 12,
        minute: 0,
        second: 0,
      };
      const jd = toJulianDate(original);
      const converted = fromJulianDate(jd);
      assert.strictEqual(converted.year, original.year);
      assert.strictEqual(converted.month, original.month);
      assert.strictEqual(converted.day, original.day);
    });
  });

  describe('Future dates', () => {
    it('should handle year 3000', () => {
      const original = {
        year: 3000,
        month: 6,
        day: 15,
        hour: 18,
        minute: 30,
        second: 0,
      };
      const jd = toJulianDate(original);
      const converted = fromJulianDate(jd);
      assert.strictEqual(converted.year, original.year);
      assert.strictEqual(converted.month, original.month);
      assert.strictEqual(converted.day, original.day);
      assert.strictEqual(converted.hour, original.hour);
      assert.strictEqual(converted.minute, original.minute);
    });

    it('should handle year 10000', () => {
      const original = {
        year: 10000,
        month: 12,
        day: 31,
        hour: 23,
        minute: 59,
        second: 59,
      };
      const jd = toJulianDate(original);
      const converted = fromJulianDate(jd);
      assert.strictEqual(converted.year, original.year);
      assert.strictEqual(converted.month, original.month);
      assert.strictEqual(converted.day, original.day);
    });
  });

  describe('Time components', () => {
    it('should handle midnight (0:00:00)', () => {
      const jd = 2451545.5; // J2000.0 at midnight
      const date = fromJulianDate(jd);
      assert.strictEqual(date.year, 2000);
      assert.strictEqual(date.month, 1);
      assert.strictEqual(date.day, 2);
      assert.strictEqual(date.hour, 0);
      assert.strictEqual(date.minute, 0);
      assert.ok(Math.abs(date.second) < 0.001);
    });

    it('should handle noon (12:00:00)', () => {
      const jd = 2451545.0; // J2000.0 at noon
      const date = fromJulianDate(jd);
      assert.strictEqual(date.hour, 12);
      assert.strictEqual(date.minute, 0);
      assert.ok(Math.abs(date.second) < 0.001);
    });

    it('should handle 6 AM', () => {
      const original = {
        year: 2025,
        month: 6,
        day: 15,
        hour: 6,
        minute: 0,
        second: 0,
      };
      const jd = toJulianDate(original);
      const converted = fromJulianDate(jd);
      assert.strictEqual(converted.hour, 6);
      assert.strictEqual(converted.minute, 0);
      assert.ok(Math.abs(converted.second) < 0.001);
    });

    it('should handle 6 PM', () => {
      const original = {
        year: 2025,
        month: 6,
        day: 15,
        hour: 18,
        minute: 0,
        second: 0,
      };
      const jd = toJulianDate(original);
      const converted = fromJulianDate(jd);
      assert.strictEqual(converted.hour, 18);
      assert.strictEqual(converted.minute, 0);
      assert.ok(Math.abs(converted.second) < 0.001);
    });

    it('should handle fractional seconds', () => {
      const original = {
        year: 2025,
        month: 1,
        day: 1,
        hour: 12,
        minute: 30,
        second: 45.678,
      };
      const jd = toJulianDate(original);
      const converted = fromJulianDate(jd);
      assert.strictEqual(converted.hour, 12);
      assert.strictEqual(converted.minute, 30);
      assert.ok(Math.abs(converted.second - 45.678) < 0.001);
    });

    it('should handle millisecond precision', () => {
      const original = {
        year: 2025,
        month: 1,
        day: 1,
        hour: 0,
        minute: 0,
        second: 0.001,
      };
      const jd = toJulianDate(original);
      const converted = fromJulianDate(jd);
      assert.ok(Math.abs(converted.second - 0.001) < 0.00001);
    });
  });

  describe('Month boundaries', () => {
    it('should handle January 31', () => {
      const original = {
        year: 2025,
        month: 1,
        day: 31,
        hour: 12,
        minute: 0,
        second: 0,
      };
      const jd = toJulianDate(original);
      const converted = fromJulianDate(jd);
      assert.strictEqual(converted.month, 1);
      assert.strictEqual(converted.day, 31);
    });

    it('should handle February 28 (non-leap)', () => {
      const original = {
        year: 2025,
        month: 2,
        day: 28,
        hour: 12,
        minute: 0,
        second: 0,
      };
      const jd = toJulianDate(original);
      const converted = fromJulianDate(jd);
      assert.strictEqual(converted.month, 2);
      assert.strictEqual(converted.day, 28);
    });

    it('should handle February 29 (leap)', () => {
      const original = {
        year: 2024,
        month: 2,
        day: 29,
        hour: 12,
        minute: 0,
        second: 0,
      };
      const jd = toJulianDate(original);
      const converted = fromJulianDate(jd);
      assert.strictEqual(converted.month, 2);
      assert.strictEqual(converted.day, 29);
    });

    it('should handle March 1 after leap Feb', () => {
      const original = {
        year: 2024,
        month: 3,
        day: 1,
        hour: 12,
        minute: 0,
        second: 0,
      };
      const jd = toJulianDate(original);
      const converted = fromJulianDate(jd);
      assert.strictEqual(converted.month, 3);
      assert.strictEqual(converted.day, 1);
    });

    it('should handle April 30', () => {
      const original = {
        year: 2025,
        month: 4,
        day: 30,
        hour: 12,
        minute: 0,
        second: 0,
      };
      const jd = toJulianDate(original);
      const converted = fromJulianDate(jd);
      assert.strictEqual(converted.month, 4);
      assert.strictEqual(converted.day, 30);
    });
  });

  describe('All months', () => {
    it('should round-trip all 12 months', () => {
      for (let month = 1; month <= 12; month++) {
        const original = {
          year: 2025,
          month,
          day: 15,
          hour: 12,
          minute: 0,
          second: 0,
        };
        const jd = toJulianDate(original);
        const converted = fromJulianDate(jd);
        assert.strictEqual(converted.month, month, `Month ${month} failed round-trip`);
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle JD = 0 (far in the past)', () => {
      const date = fromJulianDate(0);
      assert.strictEqual(date.year, -4712);
      assert.strictEqual(date.month, 1);
      assert.strictEqual(date.day, 1);
      assert.strictEqual(date.hour, 12);
    });

    it('should handle negative JD', () => {
      const date = fromJulianDate(-100);
      assert.ok(date.year < -4712);
    });

    it('should handle very large JD (distant future)', () => {
      const jd = 5000000; // ~4800 CE
      const date = fromJulianDate(jd);
      assert.ok(date.year > 3000);
    });

    it('should handle century years (leap year rules)', () => {
      // 1900 is NOT a leap year (divisible by 100 but not 400)
      const date1900 = {
        year: 1900,
        month: 2,
        day: 28,
        hour: 12,
        minute: 0,
        second: 0,
      };
      const jd1900 = toJulianDate(date1900);
      const converted1900 = fromJulianDate(jd1900);
      assert.strictEqual(converted1900.year, 1900);
      assert.strictEqual(converted1900.month, 2);
      assert.strictEqual(converted1900.day, 28);

      // 2000 IS a leap year (divisible by 400)
      const date2000 = {
        year: 2000,
        month: 2,
        day: 29,
        hour: 12,
        minute: 0,
        second: 0,
      };
      const jd2000 = toJulianDate(date2000);
      const converted2000 = fromJulianDate(jd2000);
      assert.strictEqual(converted2000.year, 2000);
      assert.strictEqual(converted2000.month, 2);
      assert.strictEqual(converted2000.day, 29);
    });
  });

  describe('Precision tests', () => {
    it('should maintain precision for sequential days', () => {
      const jd1 = 2451545.0;
      const jd2 = 2451546.0;
      const date1 = fromJulianDate(jd1);
      const date2 = fromJulianDate(jd2);
      assert.strictEqual(date2.day - date1.day, 1);
    });

    it('should maintain precision across month boundary', () => {
      const jan31 = { year: 2025, month: 1, day: 31, hour: 12, minute: 0, second: 0 };
      const jdJan31 = toJulianDate(jan31);
      const jdFeb1 = jdJan31 + 1;
      const feb1 = fromJulianDate(jdFeb1);
      assert.strictEqual(feb1.month, 2);
      assert.strictEqual(feb1.day, 1);
    });

    it('should maintain precision across year boundary', () => {
      const dec31 = { year: 2024, month: 12, day: 31, hour: 12, minute: 0, second: 0 };
      const jdDec31 = toJulianDate(dec31);
      const jdJan1 = jdDec31 + 1;
      const jan1 = fromJulianDate(jdJan1);
      assert.strictEqual(jan1.year, 2025);
      assert.strictEqual(jan1.month, 1);
      assert.strictEqual(jan1.day, 1);
    });
  });
});

describe('calendarDate', () => {
  it('should be an alias for fromJulianDate', () => {
    const jd = J2000_EPOCH;
    const date1 = fromJulianDate(jd);
    const date2 = calendarDate(jd);
    assert.deepStrictEqual(date1, date2);
  });
});
