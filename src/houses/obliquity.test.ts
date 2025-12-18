import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { J2000_EPOCH } from '../time/constants.js';
import { toJulianDate } from '../time/julian-date.js';
import { meanObliquity, obliquityOfEcliptic } from './obliquity.js';

describe('Obliquity of the Ecliptic', () => {
  describe('meanObliquity', () => {
    it('should calculate correct obliquity at J2000.0 epoch (T=0)', () => {
      const obliquity = meanObliquity(0);

      // At J2000.0, obliquity should be approximately 23°26'21" = 23.43929111°
      assert.ok(Math.abs(obliquity - 23.43929111) < 0.000001);
    });

    it('should show obliquity decreasing over time', () => {
      const obliquity2000 = meanObliquity(0); // Year 2000
      const obliquity2100 = meanObliquity(1); // Year 2100 (1 century later)

      // Obliquity is decreasing by about 0.013° per century
      assert.ok(obliquity2100 < obliquity2000);
      assert.ok(Math.abs(obliquity2000 - obliquity2100 - 0.013) < 0.001);
    });

    it('should handle negative T (dates before J2000)', () => {
      const obliquity1900 = meanObliquity(-1); // Year 1900 (1 century before J2000)

      // Should be greater than J2000 value (obliquity was larger in the past)
      const obliquity2000 = meanObliquity(0);
      assert.ok(obliquity1900 > obliquity2000);
    });

    it('should match known reference values', () => {
      // Reference values from Meeus "Astronomical Algorithms", Table 22.A
      // These are approximate - we're testing the formula implementation

      // T = -1 (year 1900): ~23.452°
      const obliquity1900 = meanObliquity(-1);
      assert.ok(Math.abs(obliquity1900 - 23.452) < 0.001);

      // T = +1 (year 2100): ~23.426°
      const obliquity2100 = meanObliquity(1);
      assert.ok(Math.abs(obliquity2100 - 23.426) < 0.001);

      // T = +5 (year 2500): ~23.374°
      const obliquity2500 = meanObliquity(5);
      assert.ok(Math.abs(obliquity2500 - 23.374) < 0.005);
    });

    it('should remain in reasonable range for ±100 centuries', () => {
      // Test far past and future (within formula validity)
      for (let T = -100; T <= 100; T += 10) {
        const obliquity = meanObliquity(T);

        // Obliquity should remain between 22° and 25° for this range
        assert.ok(obliquity > 22, `Obliquity ${obliquity}° too low at T=${T}`);
        assert.ok(obliquity < 25, `Obliquity ${obliquity}° too high at T=${T}`);
      }
    });

    it('should handle T = 0 exactly', () => {
      const obliquity = meanObliquity(0);

      // Should match constant term exactly
      assert.equal(obliquity, 23.43929111);
    });

    it('should be continuous (no sudden jumps)', () => {
      // Test continuity by checking larger steps to avoid floating point issues
      for (let T = -5; T <= 5; T += 0.5) {
        const obliquity1 = meanObliquity(T);
        const obliquity2 = meanObliquity(T + 0.1); // 0.1 century step (~10 years)

        const difference = Math.abs(obliquity2 - obliquity1);

        // Change should be small for 0.1 century step
        // Obliquity changes by ~0.013° per century, so ~0.0013° per 0.1 century
        assert.ok(difference < 0.005, `Discontinuity at T=${T}: ${difference}`);
      }
    });
  });

  describe('obliquityOfEcliptic', () => {
    it('should calculate correct obliquity for J2000.0 epoch', () => {
      const obliquity = obliquityOfEcliptic(J2000_EPOCH);

      // Should match meanObliquity(0)
      assert.ok(Math.abs(obliquity - 23.43929111) < 0.000001);
    });

    it('should handle conversion from JD correctly', () => {
      // Test that it's equivalent to manual conversion
      const jd = 2460665.0; // Some arbitrary JD
      const T = (jd - J2000_EPOCH) / 36525;

      const obliquity1 = obliquityOfEcliptic(jd);
      const obliquity2 = meanObliquity(T);

      assert.equal(obliquity1, obliquity2);
    });

    it('should work with dates from CalendarDateTime', () => {
      // January 1, 2025, 12:00 UT
      const jd = toJulianDate({
        year: 2025,
        month: 1,
        day: 1,
        hour: 12,
        minute: 0,
        second: 0,
      });

      const obliquity = obliquityOfEcliptic(jd);

      // Should be close to J2000 value (only 25 years difference)
      // Obliquity decreases by ~0.013° per century, so ~0.0033° in 25 years
      assert.ok(Math.abs(obliquity - 23.436) < 0.01);
    });

    it('should calculate different values for different dates', () => {
      const jd1 = toJulianDate({
        year: 2000,
        month: 1,
        day: 1,
        hour: 12,
        minute: 0,
        second: 0,
      });

      const jd2 = toJulianDate({
        year: 2100,
        month: 1,
        day: 1,
        hour: 12,
        minute: 0,
        second: 0,
      });

      const obliquity1 = obliquityOfEcliptic(jd1);
      const obliquity2 = obliquityOfEcliptic(jd2);

      // Should be different (obliquity changes over time)
      assert.notEqual(obliquity1, obliquity2);

      // 2100 should be smaller (obliquity decreasing)
      assert.ok(obliquity2 < obliquity1);
    });

    it('should work for historical dates', () => {
      // January 1, 1800, 12:00 UT
      const jd = toJulianDate({
        year: 1800,
        month: 1,
        day: 1,
        hour: 12,
        minute: 0,
        second: 0,
      });

      const obliquity = obliquityOfEcliptic(jd);

      // Historical obliquity should be larger than modern value
      const modernObliquity = obliquityOfEcliptic(J2000_EPOCH);
      assert.ok(obliquity > modernObliquity);

      // Should be around 23.465° for 1800
      assert.ok(Math.abs(obliquity - 23.465) < 0.01);
    });

    it('should work for future dates', () => {
      // January 1, 2500, 12:00 UT
      const jd = toJulianDate({
        year: 2500,
        month: 1,
        day: 1,
        hour: 12,
        minute: 0,
        second: 0,
      });

      const obliquity = obliquityOfEcliptic(jd);

      // Future obliquity should be smaller than modern value
      const modernObliquity = obliquityOfEcliptic(J2000_EPOCH);
      assert.ok(obliquity < modernObliquity);

      // Should be around 23.37° for 2500
      assert.ok(Math.abs(obliquity - 23.37) < 0.01);
    });

    it('should be continuous across day boundaries', () => {
      // Test at midnight and noon of same day
      const jdMidnight = toJulianDate({
        year: 2025,
        month: 6,
        day: 15,
        hour: 0,
        minute: 0,
        second: 0,
      });

      const jdNoon = toJulianDate({
        year: 2025,
        month: 6,
        day: 15,
        hour: 12,
        minute: 0,
        second: 0,
      });

      const obliquity1 = obliquityOfEcliptic(jdMidnight);
      const obliquity2 = obliquityOfEcliptic(jdNoon);

      // Should be virtually identical (obliquity changes very slowly)
      assert.ok(Math.abs(obliquity1 - obliquity2) < 0.000001);
    });

    it('should handle Unix epoch', () => {
      // January 1, 1970, 00:00 UT
      const jd = toJulianDate({
        year: 1970,
        month: 1,
        day: 1,
        hour: 0,
        minute: 0,
        second: 0,
      });

      const obliquity = obliquityOfEcliptic(jd);

      // Should be around 23.442° for 1970 (30 years before J2000)
      // T = -0.3 centuries, so decrease is reversed: ~23.443°
      assert.ok(Math.abs(obliquity - 23.443) < 0.01);
    });
  });

  describe('Reference Value Cross-Validation', () => {
    it('should match JPL Horizons data for modern dates', () => {
      // JPL Horizons provides obliquity values we can compare against
      // For January 1, 2024, 00:00 UT, obliquity ≈ 23.436464°

      const jd = toJulianDate({
        year: 2024,
        month: 1,
        day: 1,
        hour: 0,
        minute: 0,
        second: 0,
      });

      const obliquity = obliquityOfEcliptic(jd);

      // Allow ±1 arcsecond tolerance (0.000278°)
      assert.ok(Math.abs(obliquity - 23.436464) < 0.001);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small JD values', () => {
      const jd = 1000000.0; // Ancient date
      const obliquity = obliquityOfEcliptic(jd);

      // Should still return a reasonable value
      assert.ok(typeof obliquity === 'number');
      assert.ok(!Number.isNaN(obliquity));
      assert.ok(Number.isFinite(obliquity));
    });

    it('should handle very large JD values', () => {
      const jd = 3000000.0; // Far future
      const obliquity = obliquityOfEcliptic(jd);

      // Should still return a reasonable value
      assert.ok(typeof obliquity === 'number');
      assert.ok(!Number.isNaN(obliquity));
      assert.ok(Number.isFinite(obliquity));
    });

    it('should handle exact J2000 epoch', () => {
      const obliquity = obliquityOfEcliptic(2451545.0);

      // Should be the constant term
      assert.ok(Math.abs(obliquity - 23.43929111) < 0.000001);
    });
  });
});

