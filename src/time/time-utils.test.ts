import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  degreesToHours,
  formatJulianDate,
  formatSiderealTime,
  fractionOfDayToTime,
  hoursToDegrees,
  normalizeAngle,
  timeToFractionOfDay,
} from './time-utils.js';

describe('Time Utilities', () => {
  describe('normalizeAngle', () => {
    it('should keep angles in range [0, 360)', () => {
      assert.equal(normalizeAngle(45), 45);
      assert.equal(normalizeAngle(180), 180);
      assert.equal(normalizeAngle(270), 270);
      assert.equal(normalizeAngle(0), 0);
    });

    it('should normalize angles >= 360', () => {
      assert.equal(normalizeAngle(360), 0);
      assert.equal(normalizeAngle(365), 5);
      assert.equal(normalizeAngle(720), 0);
      assert.equal(normalizeAngle(725), 5);
      assert.equal(normalizeAngle(450), 90);
    });

    it('should normalize negative angles', () => {
      assert.equal(normalizeAngle(-30), 330);
      assert.equal(normalizeAngle(-90), 270);
      assert.equal(normalizeAngle(-180), 180);
      assert.equal(normalizeAngle(-360), 0);
      assert.equal(normalizeAngle(-365), 355);
      assert.equal(normalizeAngle(-720), 0);
    });

    it('should handle very large positive angles', () => {
      assert.equal(normalizeAngle(1080), 0);
      assert.equal(normalizeAngle(3600), 0);
      assert.equal(normalizeAngle(3645), 45);
    });

    it('should handle very large negative angles', () => {
      assert.equal(normalizeAngle(-1080), 0);
      assert.equal(normalizeAngle(-3600), 0);
      assert.equal(normalizeAngle(-3645), 315);
    });

    it('should handle fractional angles', () => {
      assert.ok(Math.abs(normalizeAngle(45.5) - 45.5) < 1e-10);
      assert.ok(Math.abs(normalizeAngle(360.5) - 0.5) < 1e-10);
      assert.ok(Math.abs(normalizeAngle(-0.5) - 359.5) < 1e-10);
    });

    it('should handle zero', () => {
      assert.equal(normalizeAngle(0), 0);
    });

    it('should handle special boundary case 359.999', () => {
      const result = normalizeAngle(359.999);
      assert.ok(result >= 0 && result < 360);
      assert.ok(Math.abs(result - 359.999) < 1e-10);
    });
  });

  describe('degreesToHours', () => {
    it('should convert degrees to hours correctly', () => {
      assert.equal(degreesToHours(0), 0);
      assert.equal(degreesToHours(15), 1);
      assert.equal(degreesToHours(180), 12);
      assert.equal(degreesToHours(360), 24);
    });

    it('should handle fractional degrees', () => {
      assert.ok(Math.abs(degreesToHours(7.5) - 0.5) < 1e-10);
      assert.ok(Math.abs(degreesToHours(22.5) - 1.5) < 1e-10);
    });

    it('should handle values > 360', () => {
      assert.equal(degreesToHours(720), 48);
    });

    it('should handle negative values', () => {
      assert.equal(degreesToHours(-15), -1);
      assert.equal(degreesToHours(-180), -12);
    });
  });

  describe('hoursToDegrees', () => {
    it('should convert hours to degrees correctly', () => {
      assert.equal(hoursToDegrees(0), 0);
      assert.equal(hoursToDegrees(1), 15);
      assert.equal(hoursToDegrees(12), 180);
      assert.equal(hoursToDegrees(24), 360);
    });

    it('should handle fractional hours', () => {
      assert.ok(Math.abs(hoursToDegrees(0.5) - 7.5) < 1e-10);
      assert.ok(Math.abs(hoursToDegrees(1.5) - 22.5) < 1e-10);
    });

    it('should handle values > 24', () => {
      assert.equal(hoursToDegrees(48), 720);
    });

    it('should handle negative values', () => {
      assert.equal(hoursToDegrees(-1), -15);
      assert.equal(hoursToDegrees(-12), -180);
    });
  });

  describe('degrees/hours round-trip', () => {
    it('should convert back and forth without loss', () => {
      const testValues = [0, 45, 90, 135, 180, 225, 270, 315, 359.999];
      for (const degrees of testValues) {
        const hours = degreesToHours(degrees);
        const backToDegrees = hoursToDegrees(hours);
        assert.ok(Math.abs(backToDegrees - degrees) < 1e-10);
      }
    });
  });

  describe('fractionOfDayToTime', () => {
    it('should convert midnight (0.0) correctly', () => {
      const result = fractionOfDayToTime(0.0);
      assert.equal(result.hour, 0);
      assert.equal(result.minute, 0);
      assert.ok(Math.abs(result.second) < 1e-10);
    });

    it('should convert noon (0.5) correctly', () => {
      const result = fractionOfDayToTime(0.5);
      assert.equal(result.hour, 12);
      assert.equal(result.minute, 0);
      assert.ok(Math.abs(result.second) < 1e-10);
    });

    it('should convert 6 AM (0.25) correctly', () => {
      const result = fractionOfDayToTime(0.25);
      assert.equal(result.hour, 6);
      assert.equal(result.minute, 0);
      assert.ok(Math.abs(result.second) < 1e-10);
    });

    it('should convert 6 PM (0.75) correctly', () => {
      const result = fractionOfDayToTime(0.75);
      assert.equal(result.hour, 18);
      assert.equal(result.minute, 0);
      assert.ok(Math.abs(result.second) < 1e-10);
    });

    it('should handle fractional hours/minutes', () => {
      // 6:30 AM = 6.5 hours = 0.270833... days
      const result = fractionOfDayToTime(0.270833333);
      assert.equal(result.hour, 6);
      // Allow minute to be 29 or 30 due to floating point precision
      assert.ok(result.minute === 29 || result.minute === 30);
      assert.ok(Math.abs(result.second) < 60); // Allow rounding
    });

    it('should handle fraction > 1.0 (normalize)', () => {
      const result = fractionOfDayToTime(1.5);
      assert.equal(result.hour, 12); // Same as 0.5
      assert.equal(result.minute, 0);
    });

    it('should extract seconds correctly', () => {
      // 12:30:45 = 12.5125 hours = 0.52135416... days
      const result = fractionOfDayToTime(0.52135416666);
      assert.equal(result.hour, 12);
      assert.equal(result.minute, 30);
      assert.ok(Math.abs(result.second - 45) < 0.01);
    });
  });

  describe('timeToFractionOfDay', () => {
    it('should convert midnight correctly', () => {
      const result = timeToFractionOfDay(0, 0, 0);
      assert.ok(Math.abs(result - 0.0) < 1e-10);
    });

    it('should convert noon correctly', () => {
      const result = timeToFractionOfDay(12, 0, 0);
      assert.ok(Math.abs(result - 0.5) < 1e-10);
    });

    it('should convert 6 AM correctly', () => {
      const result = timeToFractionOfDay(6, 0, 0);
      assert.ok(Math.abs(result - 0.25) < 1e-10);
    });

    it('should convert 6 PM correctly', () => {
      const result = timeToFractionOfDay(18, 0, 0);
      assert.ok(Math.abs(result - 0.75) < 1e-10);
    });

    it('should handle minutes', () => {
      const result = timeToFractionOfDay(6, 30, 0);
      // 6.5 hours / 24 = 0.270833...
      assert.ok(Math.abs(result - 0.270833333) < 1e-6);
    });

    it('should handle seconds', () => {
      const result = timeToFractionOfDay(12, 30, 45);
      // 12.5125 hours / 24 = 0.52135416...
      assert.ok(Math.abs(result - 0.52135416666) < 1e-6);
    });

    it('should handle 23:59:59', () => {
      const result = timeToFractionOfDay(23, 59, 59);
      // Should be very close to 1.0 but not quite
      assert.ok(result > 0.999);
      assert.ok(result < 1.0);
    });
  });

  describe('time conversion round-trip', () => {
    it('should convert back and forth without significant loss', () => {
      const testCases = [
        { hour: 0, minute: 0, second: 0 },
        { hour: 6, minute: 0, second: 0 },
        { hour: 12, minute: 0, second: 0 },
        { hour: 18, minute: 0, second: 0 },
        { hour: 12, minute: 30, second: 45 },
        { hour: 23, minute: 59, second: 0 },
      ];

      for (const testCase of testCases) {
        const fraction = timeToFractionOfDay(testCase.hour, testCase.minute, testCase.second);
        const backToTime = fractionOfDayToTime(fraction);

        assert.equal(backToTime.hour, testCase.hour);
        assert.equal(backToTime.minute, testCase.minute);
        assert.ok(Math.abs(backToTime.second - testCase.second) < 0.01);
      }
    });
  });

  describe('formatJulianDate', () => {
    it('should format Julian Date correctly', () => {
      const result = formatJulianDate(2451545.0);
      assert.match(result, /JD 2451545\.0+/);
    });

    it('should handle fractional Julian Dates', () => {
      const result = formatJulianDate(2451545.5);
      assert.match(result, /JD 2451545\.5+/);
    });

    it('should format with fixed precision', () => {
      const result = formatJulianDate(2451545.123456789);
      // Should contain JD and the number with 6 decimal places (allowing for rounding)
      assert.match(result, /JD 2451545\.12345[67]/);
    });
  });

  describe('formatSiderealTime', () => {
    it('should format sidereal time with both degrees and hours', () => {
      const result = formatSiderealTime(180);
      assert.match(result, /180\.0+°/);
      assert.match(result, /12\.0+h/);
    });

    it('should handle 0 degrees', () => {
      const result = formatSiderealTime(0);
      assert.match(result, /0\.0+°/);
      assert.match(result, /0\.0+h/);
    });

    it('should handle 360 degrees', () => {
      const result = formatSiderealTime(360);
      assert.match(result, /360\.0+°/);
      assert.match(result, /24\.0+h/);
    });
  });
});
