import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { DAYS_PER_CENTURY, J2000_EPOCH } from './constants.js';
import { fromJulianCenturies, toJulianCenturies } from './julian-centuries.js';

describe('Julian Centuries Conversion', () => {
  describe('toJulianCenturies', () => {
    it('should return 0 for J2000.0 epoch', () => {
      const T = toJulianCenturies(J2000_EPOCH);
      assert.equal(T, 0.0);
    });

    it('should return 1.0 for one century after J2000.0', () => {
      const jd = J2000_EPOCH + DAYS_PER_CENTURY;
      const T = toJulianCenturies(jd);
      assert.ok(Math.abs(T - 1.0) < 1e-10);
    });

    it('should return -1.0 for one century before J2000.0', () => {
      const jd = J2000_EPOCH - DAYS_PER_CENTURY;
      const T = toJulianCenturies(jd);
      assert.ok(Math.abs(T - -1.0) < 1e-10);
    });

    it('should handle fractional centuries', () => {
      // Half a century after J2000.0
      const jd = J2000_EPOCH + DAYS_PER_CENTURY / 2;
      const T = toJulianCenturies(jd);
      assert.ok(Math.abs(T - 0.5) < 1e-10);
    });

    it('should handle small time intervals', () => {
      // One day after J2000.0
      const jd = J2000_EPOCH + 1;
      const T = toJulianCenturies(jd);
      const expected = 1 / DAYS_PER_CENTURY;
      assert.ok(Math.abs(T - expected) < 1e-12);
    });

    it('should handle Unix epoch', () => {
      // January 1, 1970, 00:00 UTC
      const jd = 2440587.5;
      const T = toJulianCenturies(jd);
      // Should be negative (before J2000)
      assert.ok(T < 0);
      // About -0.3 centuries
      assert.ok(Math.abs(T - -0.3) < 0.01);
    });

    it('should handle very distant past', () => {
      // 1000 years before J2000 ≈ -10 centuries
      const jd = J2000_EPOCH - 365250; // Approximately 1000 years
      const T = toJulianCenturies(jd);
      assert.ok(T < -9 && T > -11);
    });

    it('should handle very distant future', () => {
      // 1000 years after J2000 ≈ 10 centuries
      const jd = J2000_EPOCH + 365250; // Approximately 1000 years
      const T = toJulianCenturies(jd);
      assert.ok(T > 9 && T < 11);
    });

    it('should be linear', () => {
      // T should increase linearly with JD
      const jd1 = J2000_EPOCH + 1000;
      const jd2 = J2000_EPOCH + 2000;
      const T1 = toJulianCenturies(jd1);
      const T2 = toJulianCenturies(jd2);
      const deltaT = T2 - T1;
      const expected = 1000 / DAYS_PER_CENTURY;
      assert.ok(Math.abs(deltaT - expected) < 1e-10);
    });

    it('should handle specific known dates', () => {
      // January 1, 2024, 00:00 UTC
      // JD ≈ 2460310.5
      const jd = 2460310.5;
      const T = toJulianCenturies(jd);
      // About 0.24 centuries after J2000
      assert.ok(T > 0.23 && T < 0.25);
    });
  });

  describe('fromJulianCenturies', () => {
    it('should return J2000_EPOCH for T = 0', () => {
      const jd = fromJulianCenturies(0.0);
      assert.equal(jd, J2000_EPOCH);
    });

    it('should return correct JD for T = 1.0', () => {
      const jd = fromJulianCenturies(1.0);
      const expected = J2000_EPOCH + DAYS_PER_CENTURY;
      assert.ok(Math.abs(jd - expected) < 1e-10);
    });

    it('should return correct JD for T = -1.0', () => {
      const jd = fromJulianCenturies(-1.0);
      const expected = J2000_EPOCH - DAYS_PER_CENTURY;
      assert.ok(Math.abs(jd - expected) < 1e-10);
    });

    it('should handle fractional centuries', () => {
      const jd = fromJulianCenturies(0.5);
      const expected = J2000_EPOCH + DAYS_PER_CENTURY / 2;
      assert.ok(Math.abs(jd - expected) < 1e-10);
    });

    it('should be linear', () => {
      const T1 = 0.1;
      const T2 = 0.2;
      const jd1 = fromJulianCenturies(T1);
      const jd2 = fromJulianCenturies(T2);
      const deltaJD = jd2 - jd1;
      const expected = 0.1 * DAYS_PER_CENTURY;
      assert.ok(Math.abs(deltaJD - expected) < 1e-10);
    });
  });

  describe('Round-trip conversion', () => {
    it('should convert back and forth without loss', () => {
      const testJDs = [
        J2000_EPOCH,
        J2000_EPOCH + 1,
        J2000_EPOCH - 1,
        J2000_EPOCH + DAYS_PER_CENTURY,
        J2000_EPOCH - DAYS_PER_CENTURY,
        2440587.5, // Unix epoch
        2460310.5, // Jan 1, 2024
      ];

      for (const originalJD of testJDs) {
        const T = toJulianCenturies(originalJD);
        const backToJD = fromJulianCenturies(T);
        assert.ok(Math.abs(backToJD - originalJD) < 1e-10);
      }
    });

    it('should convert T values back and forth without loss', () => {
      const testTs = [-2, -1, -0.5, 0, 0.5, 1, 2];

      for (const originalT of testTs) {
        const jd = fromJulianCenturies(originalT);
        const backToT = toJulianCenturies(jd);
        assert.ok(Math.abs(backToT - originalT) < 1e-10);
      }
    });
  });

  describe('Relationship with DAYS_PER_CENTURY', () => {
    it('should satisfy the conversion formula', () => {
      const jd = 2500000.0;
      const T = toJulianCenturies(jd);
      const expected = (jd - J2000_EPOCH) / DAYS_PER_CENTURY;
      assert.equal(T, expected);
    });

    it('should be consistent with constant', () => {
      // One century = DAYS_PER_CENTURY days
      const T = 1.0;
      const jd = fromJulianCenturies(T);
      const daysSinceJ2000 = jd - J2000_EPOCH;
      assert.equal(daysSinceJ2000, DAYS_PER_CENTURY);
    });
  });

  describe('Edge cases', () => {
    it('should handle zero JD', () => {
      const T = toJulianCenturies(0);
      // Should be a large negative number
      assert.ok(T < -60); // More than 60 centuries before J2000
    });

    it('should handle very large JD', () => {
      const jd = 10000000.0;
      const T = toJulianCenturies(jd);
      // Should be a large positive number
      assert.ok(T > 200); // More than 200 centuries after J2000
    });

    it('should handle negative JD', () => {
      const jd = -1000000.0;
      const T = toJulianCenturies(jd);
      // Should be a very large negative number
      assert.ok(T < -90);
    });
  });

  describe('Precision', () => {
    it('should maintain precision for small T values', () => {
      // One day = T ≈ 0.0000274
      const T = 1 / DAYS_PER_CENTURY;
      const jd = fromJulianCenturies(T);
      const backToT = toJulianCenturies(jd);
      assert.ok(Math.abs(backToT - T) < 1e-15);
    });

    it('should maintain precision for large T values', () => {
      const T = 100.0; // 10,000 years
      const jd = fromJulianCenturies(T);
      const backToT = toJulianCenturies(jd);
      assert.ok(Math.abs(backToT - T) < 1e-10);
    });
  });
});
