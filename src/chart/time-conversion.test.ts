/**
 * Tests for Time Conversion
 *
 * @remarks
 * Tests validate time conversion functions using well-known reference points.
 *
 * REFERENCE DATA SOURCES:
 * - Julian Date values: IAU standard definitions
 * - J2000.0 = JD 2451545.0 (January 1, 2000, 12:00 TT)
 * - Unix Epoch = JD 2440587.5 (January 1, 1970, 00:00 UTC)
 * - Timezone conversions: Mathematical fact (UTC = local - timezone offset)
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { calculateIsDaytime, calculateTimeData, localToUTC } from './time-conversion.js';

// =============================================================================
// IAU STANDARD REFERENCE VALUES
// These are definitional values - not approximations
// =============================================================================

/** J2000.0 epoch: January 1, 2000, 12:00 TT = JD 2451545.0 */
const J2000_JD = 2451545.0;

/** J2000.0 at midnight (00:00 TT) = JD 2451544.5 */
const J2000_MIDNIGHT_JD = 2451544.5;

/** Unix epoch: January 1, 1970, 00:00 UTC = JD 2440587.5 */
const UNIX_EPOCH_JD = 2440587.5;

describe('chart/time-conversion', () => {
  describe('localToUTC', () => {
    describe('No timezone offset (UTC)', () => {
      it('should return same time when timezone is 0', () => {
        const utc = localToUTC({
          year: 2000,
          month: 1,
          day: 1,
          hour: 12,
          minute: 30,
          second: 45,
          timezone: 0,
          latitude: 0,
          longitude: 0,
        });

        assert.equal(utc.year, 2000);
        assert.equal(utc.month, 1);
        assert.equal(utc.day, 1);
        assert.equal(utc.hour, 12);
        assert.equal(utc.minute, 30);
        assert.equal(utc.second, 45);
      });
    });

    describe('Positive timezone (East of Greenwich)', () => {
      it('should subtract positive timezone from local time', () => {
        // 14:00 CET (+1) = 13:00 UTC
        const utc = localToUTC({
          year: 2000,
          month: 1,
          day: 1,
          hour: 14,
          minute: 0,
          second: 0,
          timezone: 1,
          latitude: 0,
          longitude: 0,
        });

        assert.equal(utc.hour, 13);
        assert.equal(utc.day, 1);
      });

      it('should handle large positive timezone (Japan, +9)', () => {
        // 21:00 JST (+9) = 12:00 UTC
        const utc = localToUTC({
          year: 2000,
          month: 1,
          day: 1,
          hour: 21,
          minute: 0,
          second: 0,
          timezone: 9,
          latitude: 0,
          longitude: 0,
        });

        assert.equal(utc.hour, 12);
        assert.equal(utc.day, 1);
      });

      it('should rollover to previous day', () => {
        // 00:30 CET (+1) on Jan 2 = 23:30 UTC on Jan 1
        const utc = localToUTC({
          year: 2000,
          month: 1,
          day: 2,
          hour: 0,
          minute: 30,
          second: 0,
          timezone: 1,
          latitude: 0,
          longitude: 0,
        });

        assert.equal(utc.year, 2000);
        assert.equal(utc.month, 1);
        assert.equal(utc.day, 1);
        assert.equal(utc.hour, 23);
        assert.equal(utc.minute, 30);
      });

      it('should rollover to previous month', () => {
        // 00:30 CET (+1) on Mar 1 = 23:30 UTC on Feb 28/29
        const utc = localToUTC({
          year: 2001, // Non-leap year
          month: 3,
          day: 1,
          hour: 0,
          minute: 30,
          second: 0,
          timezone: 1,
          latitude: 0,
          longitude: 0,
        });

        assert.equal(utc.year, 2001);
        assert.equal(utc.month, 2);
        assert.equal(utc.day, 28);
        assert.equal(utc.hour, 23);
      });

      it('should rollover to previous year', () => {
        // 00:30 CET (+1) on Jan 1 = 23:30 UTC on Dec 31 previous year
        const utc = localToUTC({
          year: 2000,
          month: 1,
          day: 1,
          hour: 0,
          minute: 30,
          second: 0,
          timezone: 1,
          latitude: 0,
          longitude: 0,
        });

        assert.equal(utc.year, 1999);
        assert.equal(utc.month, 12);
        assert.equal(utc.day, 31);
        assert.equal(utc.hour, 23);
      });
    });

    describe('Negative timezone (West of Greenwich)', () => {
      it('should add negative timezone to local time', () => {
        // 12:00 EST (-5) = 17:00 UTC
        const utc = localToUTC({
          year: 2000,
          month: 1,
          day: 1,
          hour: 12,
          minute: 0,
          second: 0,
          timezone: -5,
          latitude: 0,
          longitude: 0,
        });

        assert.equal(utc.hour, 17);
        assert.equal(utc.day, 1);
      });

      it('should rollover to next day', () => {
        // 21:00 EST (-5) on Jan 1 = 02:00 UTC on Jan 2
        const utc = localToUTC({
          year: 2000,
          month: 1,
          day: 1,
          hour: 21,
          minute: 0,
          second: 0,
          timezone: -5,
          latitude: 0,
          longitude: 0,
        });

        assert.equal(utc.year, 2000);
        assert.equal(utc.month, 1);
        assert.equal(utc.day, 2);
        assert.equal(utc.hour, 2);
      });

      it('should rollover to next month', () => {
        // 23:00 EST (-5) on Jan 31 = 04:00 UTC on Feb 1
        const utc = localToUTC({
          year: 2000,
          month: 1,
          day: 31,
          hour: 23,
          minute: 0,
          second: 0,
          timezone: -5,
          latitude: 0,
          longitude: 0,
        });

        assert.equal(utc.year, 2000);
        assert.equal(utc.month, 2);
        assert.equal(utc.day, 1);
        assert.equal(utc.hour, 4);
      });

      it('should rollover to next year', () => {
        // 23:00 EST (-5) on Dec 31 = 04:00 UTC on Jan 1 next year
        const utc = localToUTC({
          year: 2000,
          month: 12,
          day: 31,
          hour: 23,
          minute: 0,
          second: 0,
          timezone: -5,
          latitude: 0,
          longitude: 0,
        });

        assert.equal(utc.year, 2001);
        assert.equal(utc.month, 1);
        assert.equal(utc.day, 1);
        assert.equal(utc.hour, 4);
      });
    });

    describe('Fractional timezone', () => {
      it('should handle +5:30 (India)', () => {
        // 17:30 IST (+5.5) = 12:00 UTC
        const utc = localToUTC({
          year: 2000,
          month: 1,
          day: 1,
          hour: 17,
          minute: 30,
          second: 0,
          timezone: 5.5,
          latitude: 0,
          longitude: 0,
        });

        assert.equal(utc.hour, 12);
        assert.equal(utc.minute, 0);
      });

      it('should handle +5:45 (Nepal)', () => {
        // 17:45 NPT (+5.75) = 12:00 UTC
        const utc = localToUTC({
          year: 2000,
          month: 1,
          day: 1,
          hour: 17,
          minute: 45,
          second: 0,
          timezone: 5.75,
          latitude: 0,
          longitude: 0,
        });

        assert.equal(utc.hour, 12);
        assert.equal(utc.minute, 0);
      });
    });

    describe('Leap year handling', () => {
      it('should handle Feb 29 in leap year (2000)', () => {
        const utc = localToUTC({
          year: 2000,
          month: 2,
          day: 29,
          hour: 12,
          minute: 0,
          second: 0,
          timezone: 0,
          latitude: 0,
          longitude: 0,
        });

        assert.equal(utc.month, 2);
        assert.equal(utc.day, 29);
      });

      it('should rollover correctly around Feb 28/29', () => {
        // 23:00 EST (-5) on Feb 29 2000 = 04:00 UTC on Mar 1
        const utc = localToUTC({
          year: 2000,
          month: 2,
          day: 29,
          hour: 23,
          minute: 0,
          second: 0,
          timezone: -5,
          latitude: 0,
          longitude: 0,
        });

        assert.equal(utc.month, 3);
        assert.equal(utc.day, 1);
      });
    });
  });

  describe('calculateTimeData', () => {
    describe('Julian Date calculation', () => {
      it('should calculate J2000.0 epoch JD', () => {
        // J2000.0: January 1, 2000, 12:00 TT/UTC = JD 2451545.0
        const data = calculateTimeData({
          year: 2000,
          month: 1,
          day: 1,
          hour: 12,
          minute: 0,
          second: 0,
          timezone: 0,
          latitude: 0,
          longitude: 0,
        });

        assert.equal(data.julianDate, J2000_JD);
      });

      it('should calculate J2000.0 midnight JD', () => {
        const data = calculateTimeData({
          year: 2000,
          month: 1,
          day: 1,
          hour: 0,
          minute: 0,
          second: 0,
          timezone: 0,
          latitude: 0,
          longitude: 0,
        });

        assert.equal(data.julianDate, J2000_MIDNIGHT_JD);
      });

      it('should calculate Unix epoch JD', () => {
        const data = calculateTimeData({
          year: 1970,
          month: 1,
          day: 1,
          hour: 0,
          minute: 0,
          second: 0,
          timezone: 0,
          latitude: 0,
          longitude: 0,
        });

        assert.equal(data.julianDate, UNIX_EPOCH_JD);
      });
    });

    describe('Julian Centuries', () => {
      it('should return T=0 at J2000.0', () => {
        const data = calculateTimeData({
          year: 2000,
          month: 1,
          day: 1,
          hour: 12,
          minute: 0,
          second: 0,
          timezone: 0,
          latitude: 0,
          longitude: 0,
        });

        assert.equal(data.julianCenturies, 0);
      });

      it('should return T=1 at J2100.0 (approx)', () => {
        // J2100.0 ≈ January 1, 2100, 12:00 TT
        const data = calculateTimeData({
          year: 2100,
          month: 1,
          day: 1,
          hour: 12,
          minute: 0,
          second: 0,
          timezone: 0,
          latitude: 0,
          longitude: 0,
        });

        // Should be approximately 1 century from J2000
        assert.ok(
          Math.abs(data.julianCenturies - 1.0) < 0.01,
          `Expected T≈1.0, got ${data.julianCenturies}`,
        );
      });

      it('should return negative T before J2000', () => {
        const data = calculateTimeData({
          year: 1900,
          month: 1,
          day: 1,
          hour: 12,
          minute: 0,
          second: 0,
          timezone: 0,
          latitude: 0,
          longitude: 0,
        });

        assert.ok(data.julianCenturies < -0.99, `Expected T<-0.99, got ${data.julianCenturies}`);
      });
    });

    describe('Sidereal Time', () => {
      it('should calculate GMST in valid range (0-360)', () => {
        const data = calculateTimeData({
          year: 2000,
          month: 1,
          day: 1,
          hour: 12,
          minute: 0,
          second: 0,
          timezone: 0,
          latitude: 0,
          longitude: 0,
        });

        assert.ok(data.greenwichSiderealTime >= 0);
        assert.ok(data.greenwichSiderealTime < 360);
      });

      it('should calculate LST based on longitude', () => {
        // At Greenwich (lon=0), LST = GMST
        const greenwich = calculateTimeData({
          year: 2000,
          month: 1,
          day: 1,
          hour: 12,
          minute: 0,
          second: 0,
          timezone: 0,
          latitude: 51.5,
          longitude: 0,
        });

        // At +90° longitude, LST = GMST + 90
        const east90 = calculateTimeData({
          year: 2000,
          month: 1,
          day: 1,
          hour: 12,
          minute: 0,
          second: 0,
          timezone: 0,
          latitude: 0,
          longitude: 90,
        });

        let expectedLST = greenwich.greenwichSiderealTime + 90;
        if (expectedLST >= 360) expectedLST -= 360;

        assert.ok(
          Math.abs(east90.localSiderealTime - expectedLST) < 0.001,
          `Expected LST=${expectedLST}, got ${east90.localSiderealTime}`,
        );
      });

      it('should handle negative longitude (West)', () => {
        const greenwich = calculateTimeData({
          year: 2000,
          month: 1,
          day: 1,
          hour: 12,
          minute: 0,
          second: 0,
          timezone: 0,
          latitude: 51.5,
          longitude: 0,
        });

        // At -90° longitude, LST = GMST - 90
        const west90 = calculateTimeData({
          year: 2000,
          month: 1,
          day: 1,
          hour: 12,
          minute: 0,
          second: 0,
          timezone: 0,
          latitude: 0,
          longitude: -90,
        });

        let expectedLST = greenwich.greenwichSiderealTime - 90;
        if (expectedLST < 0) expectedLST += 360;

        assert.ok(
          Math.abs(west90.localSiderealTime - expectedLST) < 0.001,
          `Expected LST=${expectedLST}, got ${west90.localSiderealTime}`,
        );
      });
    });

    describe('Obliquity', () => {
      it('should be approximately 23.44° at J2000', () => {
        const data = calculateTimeData({
          year: 2000,
          month: 1,
          day: 1,
          hour: 12,
          minute: 0,
          second: 0,
          timezone: 0,
          latitude: 0,
          longitude: 0,
        });

        // Obliquity at J2000 ≈ 23.439291°
        assert.ok(
          Math.abs(data.obliquity - 23.439) < 0.01,
          `Expected obliquity≈23.439°, got ${data.obliquity}°`,
        );
      });
    });

    describe('Timezone handling', () => {
      it('should convert timezone correctly in JD calculation', () => {
        // Noon in EST (-5) = 17:00 UTC
        const est = calculateTimeData({
          year: 2000,
          month: 1,
          day: 1,
          hour: 12,
          minute: 0,
          second: 0,
          timezone: -5,
          latitude: 40.7,
          longitude: -74,
        });

        // Direct UTC noon
        const utc = calculateTimeData({
          year: 2000,
          month: 1,
          day: 1,
          hour: 17,
          minute: 0,
          second: 0,
          timezone: 0,
          latitude: 40.7,
          longitude: -74,
        });

        // Should have same JD
        assert.ok(
          Math.abs(est.julianDate - utc.julianDate) < 0.0001,
          `EST JD=${est.julianDate}, UTC JD=${utc.julianDate}`,
        );
      });
    });
  });

  describe('calculateIsDaytime', () => {
    /**
     * Chart orientation (standard Western astrology):
     * - ASC (Ascendant) = eastern horizon, left side of chart
     * - DSC (Descendant) = western horizon, right side, = ASC + 180°
     * - MC (Midheaven) = top of chart, highest point
     * - IC (Imum Coeli) = bottom of chart
     *
     * Sun above horizon (daytime) = between DSC and ASC going counterclockwise
     *   through MC = houses 7, 8, 9, 10, 11, 12
     * Sun below horizon (nighttime) = between ASC and DSC going clockwise
     *   through IC = houses 1, 2, 3, 4, 5, 6
     *
     * With ASC=0°: DSC=180°
     * - Above horizon: 180° to 360° (through 270°)
     * - Below horizon: 0° to 180° (through 90°)
     */

    it('should return true when Sun is above horizon (near MC)', () => {
      // ASC at 0°, DSC at 180°, MC around 270°
      // Sun at 270° is at MC (above horizon)
      const result = calculateIsDaytime(270, 0);
      assert.equal(result, true);
    });

    it('should return false when Sun is below horizon (near IC)', () => {
      // ASC at 0°, DSC at 180°, IC around 90°
      // Sun at 90° is at IC (below horizon)
      const result = calculateIsDaytime(90, 0);
      assert.equal(result, false);
    });

    it('should return true when Sun is at DSC (setting)', () => {
      // Sun at 180° (DSC) is on the horizon - edge case, counts as above
      const result = calculateIsDaytime(180, 0);
      assert.equal(result, true);
    });

    it('should return false when Sun just past ASC (risen, entering H1)', () => {
      // Sun at 1° just past ASC is in house 12... wait no
      // Actually if ASC=0°, Sun at 1° is in house 1 (below horizon)
      const result = calculateIsDaytime(1, 0);
      assert.equal(result, false);
    });

    it('should return true when Sun just before ASC (about to rise, H12)', () => {
      // Sun at 359° is in house 12 (above horizon, about to rise)
      const result = calculateIsDaytime(359, 0);
      assert.equal(result, true);
    });
  });
});
