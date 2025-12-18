import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
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

describe('Time Constants', () => {
  describe('Epoch Constants', () => {
    it('should have correct J2000.0 epoch', () => {
      // J2000.0 is January 1, 2000, 12:00 TT
      assert.equal(J2000_EPOCH, 2451545.0);
    });

    it('should have correct MJD epoch offset', () => {
      // MJD 0 = JD 2400000.5
      assert.equal(MJD_EPOCH, 2400000.5);
    });

    it('should have correct Unix epoch', () => {
      // January 1, 1970, 00:00 UTC
      assert.equal(UNIX_EPOCH_JD, 2440587.5);
    });

    it('should have correct Gregorian reform date', () => {
      // October 15, 1582 (Gregorian)
      assert.equal(GREGORIAN_REFORM_JD, 2299160.5);
    });
  });

  describe('Time Unit Constants', () => {
    it('should have correct seconds per day', () => {
      assert.equal(SECONDS_PER_DAY, 86400);
      assert.equal(SECONDS_PER_DAY, 24 * 60 * 60);
    });

    it('should have correct minutes per day', () => {
      assert.equal(MINUTES_PER_DAY, 1440);
      assert.equal(MINUTES_PER_DAY, 24 * 60);
    });

    it('should have correct hours per day', () => {
      assert.equal(HOURS_PER_DAY, 24);
    });

    it('should have correct minutes per hour', () => {
      assert.equal(MINUTES_PER_HOUR, 60);
    });

    it('should have correct seconds per minute', () => {
      assert.equal(SECONDS_PER_MINUTE, 60);
    });

    it('should have correct seconds per hour', () => {
      assert.equal(SECONDS_PER_HOUR, 3600);
      assert.equal(SECONDS_PER_HOUR, 60 * 60);
    });

    it('should have correct days per century', () => {
      assert.equal(DAYS_PER_CENTURY, 36525);
      assert.equal(DAYS_PER_CENTURY, 365.25 * 100);
    });
  });

  describe('Angular Constants', () => {
    it('should have correct degrees per hour', () => {
      assert.equal(DEGREES_PER_HOUR, 15);
      assert.equal(DEGREES_PER_HOUR, 360 / 24);
    });

    it('should have correct degrees per circle', () => {
      assert.equal(DEGREES_PER_CIRCLE, 360);
    });

    it('should have correct arcminutes per degree', () => {
      assert.equal(ARCMINUTES_PER_DEGREE, 60);
    });

    it('should have correct arcseconds per degree', () => {
      assert.equal(ARCSECONDS_PER_DEGREE, 3600);
      assert.equal(ARCSECONDS_PER_DEGREE, 60 * 60);
    });
  });

  describe('Sidereal Time Constants', () => {
    it('should have correct sidereal day ratio', () => {
      assert.ok(Math.abs(SIDEREAL_DAY_RATIO - 0.99726957) < 1e-8);
    });

    it('should have correct sidereal day in days', () => {
      assert.ok(Math.abs(SIDEREAL_DAY_IN_DAYS - 0.99726957) < 1e-8);
    });

    it('should have correct solar day in sidereal days', () => {
      assert.ok(Math.abs(SOLAR_DAY_IN_SIDEREAL_DAYS - 1.00273791) < 1e-8);
    });

    it('should have reciprocal relationship between sidereal conversions', () => {
      const product = SIDEREAL_DAY_IN_DAYS * SOLAR_DAY_IN_SIDEREAL_DAYS;
      assert.ok(Math.abs(product - 1.0) < 1e-8);
    });

    it('should calculate sidereal day length', () => {
      // A sidereal day is about 23h 56m 4s
      const siderealDaySeconds = SIDEREAL_DAY_IN_DAYS * SECONDS_PER_DAY;
      const expectedSeconds = 23 * 3600 + 56 * 60 + 4; // 23h 56m 4s
      assert.ok(Math.abs(siderealDaySeconds - expectedSeconds) < 1);
    });
  });

  describe('Calendar Constants', () => {
    it('should have 12 months in DAYS_IN_MONTH', () => {
      // Index 0 is unused, so length should be 13
      assert.equal(DAYS_IN_MONTH.length, 13);
    });

    it('should have correct days in non-leap year months', () => {
      assert.equal(DAYS_IN_MONTH[1], 31); // January
      assert.equal(DAYS_IN_MONTH[2], 28); // February
      assert.equal(DAYS_IN_MONTH[3], 31); // March
      assert.equal(DAYS_IN_MONTH[4], 30); // April
      assert.equal(DAYS_IN_MONTH[5], 31); // May
      assert.equal(DAYS_IN_MONTH[6], 30); // June
      assert.equal(DAYS_IN_MONTH[7], 31); // July
      assert.equal(DAYS_IN_MONTH[8], 31); // August
      assert.equal(DAYS_IN_MONTH[9], 30); // September
      assert.equal(DAYS_IN_MONTH[10], 31); // October
      assert.equal(DAYS_IN_MONTH[11], 30); // November
      assert.equal(DAYS_IN_MONTH[12], 31); // December
    });

    it('should have correct days in leap year months', () => {
      assert.equal(DAYS_IN_MONTH_LEAP[2], 29); // February in leap year
      // All other months should be the same
      for (let i = 1; i <= 12; i++) {
        if (i !== 2) {
          assert.equal(DAYS_IN_MONTH_LEAP[i], DAYS_IN_MONTH[i]);
        }
      }
    });

    it('should have correct total days in non-leap year', () => {
      const total = DAYS_IN_MONTH.slice(1).reduce((sum, days) => sum + days, 0);
      assert.equal(total, 365);
    });

    it('should have correct total days in leap year', () => {
      const total = DAYS_IN_MONTH_LEAP.slice(1).reduce((sum, days) => sum + days, 0);
      assert.equal(total, 366);
    });

    it('should have 12 month names', () => {
      // Index 0 is unused, so length should be 13
      assert.equal(MONTH_NAMES.length, 13);
    });

    it('should have correct month names', () => {
      assert.equal(MONTH_NAMES[1], 'January');
      assert.equal(MONTH_NAMES[2], 'February');
      assert.equal(MONTH_NAMES[3], 'March');
      assert.equal(MONTH_NAMES[4], 'April');
      assert.equal(MONTH_NAMES[5], 'May');
      assert.equal(MONTH_NAMES[6], 'June');
      assert.equal(MONTH_NAMES[7], 'July');
      assert.equal(MONTH_NAMES[8], 'August');
      assert.equal(MONTH_NAMES[9], 'September');
      assert.equal(MONTH_NAMES[10], 'October');
      assert.equal(MONTH_NAMES[11], 'November');
      assert.equal(MONTH_NAMES[12], 'December');
    });

    it('should have index 0 as empty/unused', () => {
      assert.equal(DAYS_IN_MONTH[0], 0);
      assert.equal(DAYS_IN_MONTH_LEAP[0], 0);
      assert.equal(MONTH_NAMES[0], '');
    });
  });

  describe('Derived Calculations', () => {
    it('should correctly derive conversion factors', () => {
      // Verify time unit relationships
      assert.equal(SECONDS_PER_DAY, HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE);
      assert.equal(MINUTES_PER_DAY, HOURS_PER_DAY * MINUTES_PER_HOUR);
      assert.equal(SECONDS_PER_HOUR, MINUTES_PER_HOUR * SECONDS_PER_MINUTE);
    });

    it('should correctly derive angular relationships', () => {
      assert.equal(DEGREES_PER_HOUR, DEGREES_PER_CIRCLE / HOURS_PER_DAY);
      assert.equal(ARCSECONDS_PER_DEGREE, ARCMINUTES_PER_DEGREE * ARCMINUTES_PER_DEGREE);
    });
  });
});
