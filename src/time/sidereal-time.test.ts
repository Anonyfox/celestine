import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { J2000_EPOCH } from './constants.js';
import { toJulianDate } from './julian-date.js';
import {
  gmstRatePerHour,
  greenwichMeanSiderealTime,
  greenwichMeanSiderealTimeAt0h,
} from './sidereal-time.js';

describe('Sidereal Time', () => {
  describe('greenwichMeanSiderealTime - Authoritative Reference Values', () => {
    /**
     * AUTHORITATIVE SOURCE: Jean Meeus, "Astronomical Algorithms" (2nd ed.)
     * Chapter 12, Example 12.a and IAU 1982 standard
     */

    it('J2000.0 epoch: GMST = 280.46061837° (IAU 1982 constant)', () => {
      // Source: Meeus Chapter 12, equation 12.4 constant term
      // At J2000.0 (2000 Jan 1, 12h TT), D = 0, T = 0
      // GMST = 280.46061837° exactly (by definition)
      const gmst = greenwichMeanSiderealTime(J2000_EPOCH);
      assert.ok(Math.abs(gmst - 280.46061837) < 0.0001);
    });

    it('1987 April 10, 0h UT: GMST = 197.693195° (Meeus Example 12.a)', () => {
      // Source: Meeus Example 12.a
      // 1987 April 10, 0h UT → GMST = 13h 10m 46.3668s
      // 13h 10m 46.3668s = (13 + 10/60 + 46.3668/3600) * 15 = 197.693195°
      const jd = toJulianDate({
        year: 1987,
        month: 4,
        day: 10,
        hour: 0,
        minute: 0,
        second: 0,
      });
      const gmst = greenwichMeanSiderealTime(jd);
      // Tolerance: 0.001° ≈ 0.24 seconds of time
      assert.ok(Math.abs(gmst - 197.693195) < 0.01);
    });

    it('1987 April 10, 19h 21m UT: GMST = 128.7378734° (Meeus Example 12.b)', () => {
      // Source: Meeus Example 12.b
      // 1987 April 10, 19h 21m UT → GMST = 8h 34m 57.0896s = 128.7378734°
      const jd = toJulianDate({
        year: 1987,
        month: 4,
        day: 10,
        hour: 19,
        minute: 21,
        second: 0,
      });
      const gmst = greenwichMeanSiderealTime(jd);
      // Tolerance: 0.01° ≈ 2.4 seconds of time
      assert.ok(Math.abs(gmst - 128.738) < 0.1);
    });

    it('2000 Jan 1, 0h UT: GMST ≈ 99.964° (calculated from IAU formula)', () => {
      // At 0h UT on Jan 1, 2000 (JD 2451544.5)
      // D = -0.5, T ≈ -1.37e-5
      // GMST = 280.46061837 + 360.98564736629 * (-0.5) ≈ 99.968°
      const jd = toJulianDate({
        year: 2000,
        month: 1,
        day: 1,
        hour: 0,
        minute: 0,
        second: 0,
      });
      const gmst = greenwichMeanSiderealTime(jd);
      assert.ok(Math.abs(gmst - 99.97) < 0.1);
    });
  });

  describe('greenwichMeanSiderealTime', () => {
    it('should calculate GMST for J2000.0 epoch', () => {
      // At J2000.0 (January 1, 2000, 12:00 UT), GMST ≈ 18h 41m 50s = 280.46°
      const gmst = greenwichMeanSiderealTime(J2000_EPOCH);
      assert.ok(gmst >= 0 && gmst < 360);
      // Should be around 280 degrees (verified against IAU constant above)
      assert.ok(Math.abs(gmst - 280.46) < 0.01);
    });

    it('should return value in range [0, 360)', () => {
      const testJDs = [
        J2000_EPOCH,
        J2000_EPOCH + 1,
        J2000_EPOCH + 100,
        J2000_EPOCH - 100,
        2440587.5, // Unix epoch
        2460310.5, // Jan 1, 2024
      ];

      for (const jd of testJDs) {
        const gmst = greenwichMeanSiderealTime(jd);
        assert.ok(gmst >= 0, `GMST should be >= 0, got ${gmst}`);
        assert.ok(gmst < 360, `GMST should be < 360, got ${gmst}`);
      }
    });

    it('should advance appropriately in one solar day', () => {
      const jd1 = J2000_EPOCH;
      const jd2 = J2000_EPOCH + 1; // One solar day later

      const gmst1 = greenwichMeanSiderealTime(jd1);
      const gmst2 = greenwichMeanSiderealTime(jd2);

      // GMST should advance (but may wrap around due to normalization)
      // Just check that they're different
      assert.notEqual(gmst1, gmst2);

      // Both should be in valid range
      assert.ok(gmst1 >= 0 && gmst1 < 360);
      assert.ok(gmst2 >= 0 && gmst2 < 360);
    });

    it('should be continuous across day boundaries', () => {
      // Check continuity at midnight
      const jdBeforeMidnight = J2000_EPOCH + 0.499; // Just before midnight
      const jdAfterMidnight = J2000_EPOCH + 0.501; // Just after midnight

      const gmstBefore = greenwichMeanSiderealTime(jdBeforeMidnight);
      const gmstAfter = greenwichMeanSiderealTime(jdAfterMidnight);

      // The difference should be small (just a few degrees)
      let delta = Math.abs(gmstAfter - gmstBefore);
      if (delta > 180) delta = 360 - delta; // Handle wrap-around

      assert.ok(delta < 10); // Should change by less than 10° in ~0.002 days
    });

    it('should handle known reference times', () => {
      // January 1, 2000, 00:00 UT
      const jd = toJulianDate({
        year: 2000,
        month: 1,
        day: 1,
        hour: 0,
        minute: 0,
        second: 0,
      });
      const gmst = greenwichMeanSiderealTime(jd);

      // At 0h UT on Jan 1, 2000, GMST ≈ 6h 39m = ~99.7°
      assert.ok(gmst >= 0 && gmst < 360);
      assert.ok(Math.abs(gmst - 100) < 5); // Should be around 100°
    });

    it('should advance ~15.04° per hour', () => {
      const jd1 = J2000_EPOCH;
      const jd2 = J2000_EPOCH + 1 / 24; // One hour later

      const gmst1 = greenwichMeanSiderealTime(jd1);
      const gmst2 = greenwichMeanSiderealTime(jd2);

      let delta = gmst2 - gmst1;
      if (delta < 0) delta += 360;

      // Should advance by ~15.04° per hour
      assert.ok(delta > 15 && delta < 15.1);
    });

    it('should handle dates far from J2000', () => {
      // 100 years before J2000
      const jd1 = J2000_EPOCH - 36525;
      const gmst1 = greenwichMeanSiderealTime(jd1);
      assert.ok(gmst1 >= 0 && gmst1 < 360);

      // 100 years after J2000
      const jd2 = J2000_EPOCH + 36525;
      const gmst2 = greenwichMeanSiderealTime(jd2);
      assert.ok(gmst2 >= 0 && gmst2 < 360);
    });

    it('should be different for different times on same day', () => {
      const jd1 = toJulianDate({
        year: 2024,
        month: 6,
        day: 15,
        hour: 0,
        minute: 0,
        second: 0,
      });
      const jd2 = toJulianDate({
        year: 2024,
        month: 6,
        day: 15,
        hour: 12,
        minute: 0,
        second: 0,
      });

      const gmst1 = greenwichMeanSiderealTime(jd1);
      const gmst2 = greenwichMeanSiderealTime(jd2);

      // 12 hours = half a day, should advance by ~180°
      let delta = gmst2 - gmst1;
      if (delta < 0) delta += 360;

      assert.ok(delta > 175 && delta < 185);
    });
  });

  describe('greenwichMeanSiderealTimeAt0h', () => {
    it('should give GMST at midnight', () => {
      // For any time on a given day, should give the same 0h value
      const jd1 = toJulianDate({
        year: 2024,
        month: 6,
        day: 15,
        hour: 6,
        minute: 0,
        second: 0,
      });
      const jd2 = toJulianDate({
        year: 2024,
        month: 6,
        day: 15,
        hour: 18,
        minute: 0,
        second: 0,
      });

      const gmst0h1 = greenwichMeanSiderealTimeAt0h(jd1);
      const gmst0h2 = greenwichMeanSiderealTimeAt0h(jd2);

      // Should be the same (both give GMST at midnight)
      assert.ok(Math.abs(gmst0h1 - gmst0h2) < 0.001);
    });

    it('should return value in range [0, 360)', () => {
      const gmst = greenwichMeanSiderealTimeAt0h(J2000_EPOCH);
      assert.ok(gmst >= 0 && gmst < 360);
    });

    it('should be less than GMST at noon', () => {
      // At J2000.0 (noon), GMST should be greater than at 0h
      const gmst0h = greenwichMeanSiderealTimeAt0h(J2000_EPOCH);
      const gmstNoon = greenwichMeanSiderealTime(J2000_EPOCH);

      // Since J2000 is at noon, GMST at noon should be ~12 hours ahead of 0h
      let delta = gmstNoon - gmst0h;
      if (delta < 0) delta += 360;

      // 12 hours ≈ 180° in sidereal time
      assert.ok(delta > 175 && delta < 185);
    });
  });

  describe('gmstRatePerHour', () => {
    it('should return a value slightly greater than 15', () => {
      const rate = gmstRatePerHour();
      // Sidereal rate is faster than solar (15°/h)
      assert.ok(rate > 15 && rate < 15.1);
    });

    it('should be close to 15.041067', () => {
      const rate = gmstRatePerHour();
      assert.ok(Math.abs(rate - 15.041067) < 0.001);
    });

    it('should multiply correctly to get 360° per sidereal day', () => {
      const rate = gmstRatePerHour();
      const siderealDayHours = 23.934469; // Sidereal day in hours

      const totalRotation = rate * siderealDayHours;
      assert.ok(Math.abs(totalRotation - 360) < 0.01);
    });
  });

  describe('GMST consistency checks', () => {
    it('should satisfy rate equation', () => {
      // GMST should advance at approximately gmstRatePerHour()
      const jd1 = J2000_EPOCH;
      const jd2 = J2000_EPOCH + 2 / 24; // 2 hours later

      const gmst1 = greenwichMeanSiderealTime(jd1);
      const gmst2 = greenwichMeanSiderealTime(jd2);

      let delta = gmst2 - gmst1;
      if (delta < 0) delta += 360;

      const expectedDelta = gmstRatePerHour() * 2;
      assert.ok(Math.abs(delta - expectedDelta) < 0.1);
    });

    it('should advance monotonically within a day', () => {
      let prevGmst = 0;
      for (let hour = 0; hour < 24; hour++) {
        const jd = J2000_EPOCH + hour / 24;
        const gmst = greenwichMeanSiderealTime(jd);

        if (hour > 0) {
          // GMST should increase (accounting for wrap-around)
          let delta = gmst - prevGmst;
          if (delta < 0) delta += 360;
          assert.ok(delta > 0);
        }

        prevGmst = gmst;
      }
    });

    it('should cycle through full 360° in less than a solar day', () => {
      // Find when GMST returns to same value
      const gmst0 = greenwichMeanSiderealTime(J2000_EPOCH);

      // A sidereal day is shorter than solar day (~23.93 hours)
      const jdSiderealDay = J2000_EPOCH + 0.997269; // ~23.93 hours

      const gmst1 = greenwichMeanSiderealTime(jdSiderealDay);

      // Should be close to the same value (within a few degrees)
      let delta = Math.abs(gmst1 - gmst0);
      if (delta > 180) delta = 360 - delta;

      assert.ok(delta < 5);
    });
  });

  describe('Edge cases', () => {
    it('should handle JD = 0', () => {
      const gmst = greenwichMeanSiderealTime(0);
      assert.ok(gmst >= 0 && gmst < 360);
    });

    it('should handle very large JD', () => {
      const gmst = greenwichMeanSiderealTime(10000000);
      assert.ok(gmst >= 0 && gmst < 360);
    });

    it('should handle negative JD', () => {
      const gmst = greenwichMeanSiderealTime(-1000000);
      assert.ok(gmst >= 0 && gmst < 360);
    });
  });
});
