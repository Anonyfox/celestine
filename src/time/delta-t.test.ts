/**
 * NASA/Espenak–Meeus reference values retain their original error limits.
 * Historical values: https://eclipse.gsfc.nasa.gov/SEcat5/deltat.html
 * Polynomials: https://eclipse.gsfc.nasa.gov/SEcat5/deltatpoly.html
 * Observed values follow USNO; the complete reference fixtures below include
 * provenance and fitting-error measurements, distinct from physical uncertainty.
 * https://eclipse.gsfc.nasa.gov/SEhelp/deltaT2.html
 * https://maia.usno.navy.mil/ser7/historic_deltat.data
 * https://maia.usno.navy.mil/ser7/deltat.data
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { deltaT, deltaTAt, toTT, toUT, ttToUT, utToTT } from './delta-t.js';

describe('deltaT', () => {
  describe('NASA official reference values', () => {
    /**
     * These tests verify against official NASA/Espenak & Meeus reference values.
     * Source: https://eclipse.gsfc.nasa.gov/SEhelp/deltaT2.html
     *
     * Each test checks if computed value is within the standard error of the reference.
     * Standard errors reflect the uncertainty in historical observations/measurements.
     */

    describe('Ancient history (eclipse records)', () => {
      it('should match year -500 (501 BCE) within ±430s', () => {
        const dt = deltaT(-500, 1);
        const expected = 17190;
        const stdError = 430;
        assert.ok(
          Math.abs(dt - expected) <= stdError,
          `Expected ${expected}±${stdError}s, got ${dt.toFixed(2)}s (error: ${(dt - expected).toFixed(2)}s)`,
        );
      });

      it('should match year 0 (1 BCE) within ±260s', () => {
        const dt = deltaT(0, 1);
        const expected = 10580;
        const stdError = 260;
        assert.ok(
          Math.abs(dt - expected) <= stdError,
          `Expected ${expected}±${stdError}s, got ${dt.toFixed(2)}s (error: ${(dt - expected).toFixed(2)}s)`,
        );
      });

      it('should match year 500 within ±140s', () => {
        const dt = deltaT(500, 1);
        const expected = 5710;
        const stdError = 140;
        assert.ok(
          Math.abs(dt - expected) <= stdError,
          `Expected ${expected}±${stdError}s, got ${dt.toFixed(2)}s (error: ${(dt - expected).toFixed(2)}s)`,
        );
      });

      it('should match year 1000 within ±55s', () => {
        const dt = deltaT(1000, 1);
        const expected = 1570;
        const stdError = 55;
        assert.ok(
          Math.abs(dt - expected) <= stdError,
          `Expected ${expected}±${stdError}s, got ${dt.toFixed(2)}s (error: ${(dt - expected).toFixed(2)}s)`,
        );
      });

      it('should match year 1500 within ±20s', () => {
        const dt = deltaT(1500, 1);
        const expected = 200;
        const stdError = 20;
        assert.ok(
          Math.abs(dt - expected) <= stdError,
          `Expected ${expected}±${stdError}s, got ${dt.toFixed(2)}s (error: ${(dt - expected).toFixed(2)}s)`,
        );
      });
    });

    describe('Post-telescopic era (improved observations)', () => {
      it('should match year 1600 within ±20s', () => {
        const dt = deltaT(1600, 1);
        const expected = 120;
        const stdError = 20;
        assert.ok(
          Math.abs(dt - expected) <= stdError,
          `Expected ${expected}±${stdError}s, got ${dt.toFixed(2)}s (error: ${(dt - expected).toFixed(2)}s)`,
        );
      });

      it('should match year 1700 within ±5s', () => {
        const dt = deltaT(1700, 1);
        const expected = 9;
        const stdError = 5;
        assert.ok(
          Math.abs(dt - expected) <= stdError,
          `Expected ${expected}±${stdError}s, got ${dt.toFixed(2)}s (error: ${(dt - expected).toFixed(2)}s)`,
        );
      });

      it('should match year 1800 within ±1s', () => {
        const dt = deltaT(1800, 1);
        const expected = 14;
        const stdError = 1;
        assert.ok(
          Math.abs(dt - expected) <= stdError,
          `Expected ${expected}±${stdError}s, got ${dt.toFixed(2)}s (error: ${(dt - expected).toFixed(2)}s)`,
        );
      });

      it('should match year 1900 within ±1s', () => {
        const dt = deltaT(1900, 1);
        const expected = -3;
        const stdError = 1;
        assert.ok(
          Math.abs(dt - expected) <= stdError,
          `Expected ${expected}±${stdError}s, got ${dt.toFixed(2)}s (error: ${(dt - expected).toFixed(2)}s)`,
        );
      });
    });

    describe('Modern era (direct measurements)', () => {
      it('should match year 1950 within ±0.1s', () => {
        const dt = deltaT(1950, 1);
        const expected = 29.15;
        const stdError = 0.1;
        assert.ok(
          Math.abs(dt - expected) <= stdError,
          `Expected ${expected}±${stdError}s, got ${dt.toFixed(2)}s (error: ${(dt - expected).toFixed(2)}s)`,
        );
      });

      it('should match year 1960 within ±0.1s', () => {
        const dt = deltaT(1960, 1);
        const expected = 33.15;
        const stdError = 0.1;
        assert.ok(
          Math.abs(dt - expected) <= stdError,
          `Expected ${expected}±${stdError}s, got ${dt.toFixed(2)}s (error: ${(dt - expected).toFixed(2)}s)`,
        );
      });

      it('should match year 1970 within ±0.1s', () => {
        const dt = deltaT(1970, 1);
        const expected = 40.18;
        const stdError = 0.1;
        assert.ok(
          Math.abs(dt - expected) <= stdError,
          `Expected ${expected}±${stdError}s, got ${dt.toFixed(2)}s (error: ${(dt - expected).toFixed(2)}s)`,
        );
      });

      it('should match year 1980 within ±0.1s', () => {
        const dt = deltaT(1980, 1);
        const expected = 50.54;
        const stdError = 0.1;
        assert.ok(
          Math.abs(dt - expected) <= stdError,
          `Expected ${expected}±${stdError}s, got ${dt.toFixed(2)}s (error: ${(dt - expected).toFixed(2)}s)`,
        );
      });

      it('should match year 1990 within ±0.1s', () => {
        const dt = deltaT(1990, 1);
        const expected = 56.86;
        const stdError = 0.1;
        assert.ok(
          Math.abs(dt - expected) <= stdError,
          `Expected ${expected}±${stdError}s, got ${dt.toFixed(2)}s (error: ${(dt - expected).toFixed(2)}s)`,
        );
      });

      it('should match year 2000 (J2000.0 epoch) within ±0.1s', () => {
        const dt = deltaT(2000, 1);
        const expected = 63.83;
        const stdError = 0.1;
        assert.ok(
          Math.abs(dt - expected) <= stdError,
          `Expected ${expected}±${stdError}s, got ${dt.toFixed(2)}s (error: ${(dt - expected).toFixed(2)}s)`,
        );
      });

      it('should match year 2010 within ±0.2s', () => {
        const dt = deltaT(2010, 1);
        const expected = 66.07;
        // USNO observed data replaces the old extrapolation.
        const stdError = 0.2;
        assert.ok(
          Math.abs(dt - expected) <= stdError,
          `Expected ${expected}±${stdError}s, got ${dt.toFixed(2)}s (error: ${(dt - expected).toFixed(2)}s)`,
        );
      });

      it('should match year 2020 (IERS data) within ±0.5s', () => {
        const dt = deltaT(2020, 1);
        const expected = 69.36;
        const stdError = 0.5;
        assert.ok(
          Math.abs(dt - expected) <= stdError,
          `Expected ${expected}±${stdError}s, got ${dt.toFixed(2)}s (error: ${(dt - expected).toFixed(2)}s)`,
        );
      });
    });
  });

  describe('Known reference values', () => {
    it('should return ~69-72 seconds for year 2020', () => {
      const dt = deltaT(2020, 1);
      // NASA official value: 69.36 seconds (from IERS measurements)
      // Source: https://eclipse.gsfc.nasa.gov/SEhelp/deltaT2.html
      assert.ok(dt > 68 && dt < 71, `Expected ~69, got ${dt}`);
    });

    it('should return ~69.1 seconds for year 2025', () => {
      const dt = deltaT(2025, 1);
      // USNO monthly observations: approximately 69.1 seconds.
      assert.ok(dt > 69 && dt < 69.2, `Expected ~69.1, got ${dt}`);
    });

    it('should return ~64 seconds for year 2000', () => {
      const dt = deltaT(2000, 1);
      // NASA official value: 63.83 seconds
      // This is the J2000.0 epoch - a critical reference point
      assert.ok(dt > 62 && dt < 66, `Expected ~64, got ${dt}`);
    });

    it('should return ~54 seconds for year 1990', () => {
      const dt = deltaT(1990, 1);
      // NASA official value: 56.86 seconds
      assert.ok(dt > 52 && dt < 58, `Expected ~54-57, got ${dt}`);
    });

    it('should return ~29 seconds for year 1950', () => {
      const dt = deltaT(1950, 1);
      // NASA official value: 29.07 seconds
      assert.ok(dt > 25 && dt < 32, `Expected ~29, got ${dt}`);
    });

    it('should return negative values for early 1900s', () => {
      const dt = deltaT(1900, 1);
      // ΔT was negative (UT was ahead of TT) in early 1900s
      assert.ok(dt < 5 && dt > -10, `Expected negative or small positive, got ${dt}`);
    });

    it('should return ~16 seconds for year 1850', () => {
      const dt = deltaT(1850, 1);
      // Historical estimates place ΔT around 6-7 seconds in 1850
      assert.ok(dt > 5 && dt < 20, `Expected ~6-7, got ${dt}`);
    });

    it('should return ~17 seconds for year 1800', () => {
      const dt = deltaT(1800, 1);
      // ΔT was approximately 13-14 seconds in 1800
      assert.ok(dt > 10 && dt < 18, `Expected ~13-14, got ${dt}`);
    });

    it('should return small positive value for year 1700', () => {
      const dt = deltaT(1700, 1);
      // ΔT was approximately 9 seconds in 1700
      assert.ok(dt > 5 && dt < 15, `Expected ~9, got ${dt}`);
    });

    it('should return ~120 seconds for year 1600', () => {
      const dt = deltaT(1600, 1);
      // ΔT was approximately 120 seconds in 1600
      assert.ok(dt > 100 && dt < 140, `Expected ~120, got ${dt}`);
    });
  });

  describe('Historical dates (larger uncertainties)', () => {
    it('should return ~1600 seconds for year 1000', () => {
      const dt = deltaT(1000, 1);
      // NASA official value: 1570 seconds (±55s standard error)
      // Medieval period: ΔT derived from eclipse records
      assert.ok(dt > 1400 && dt < 1800, `Expected ~1600, got ${dt}`);
    });

    it('should return ~5700 seconds for year 500', () => {
      const dt = deltaT(500, 1);
      // NASA official value: 5710 seconds (±140s standard error)
      // Late antiquity period
      assert.ok(dt > 5000 && dt < 6500, `Expected ~5700, got ${dt}`);
    });

    it('should return ~10500 seconds for year 0', () => {
      const dt = deltaT(0, 1);
      // NASA official value: 10580 seconds (±260s standard error)
      // Around birth of Christ
      assert.ok(dt > 9500 && dt < 11500, `Expected ~10500, got ${dt}`);
    });

    it('should return ~17200 seconds for year -500 (501 BCE)', () => {
      const dt = deltaT(-500, 1);
      // NASA official value: 17190 seconds (±430s standard error)
      // Ancient Greece period
      assert.ok(dt > 16000 && dt < 18500, `Expected ~17200, got ${dt}`);
    });

    it('should return large positive values for ancient dates', () => {
      const dt = deltaT(-1000, 1);
      // Very ancient: ΔT increases parabolically
      assert.ok(dt > 10000, `Expected >10000 for 1001 BCE, got ${dt}`);
    });

    it('should return very large values for prehistoric dates', () => {
      const dt = deltaT(-3000, 1);
      // Prehistoric: ΔT very large
      assert.ok(dt > 30000, `Expected >30000 for 3001 BCE, got ${dt}`);
    });
  });

  describe('Future dates (extrapolated)', () => {
    it('should return increasing values for 2030', () => {
      const dt2025 = deltaT(2025, 1);
      const dt2030 = deltaT(2030, 1);
      // ΔT should continue increasing
      assert.ok(dt2030 > dt2025, 'ΔT should increase into the future');
    });

    it('should return reasonable values for 2050', () => {
      const dt = deltaT(2050, 1);
      // About 76 s in 2050 (Bulletin A trend toward the SMH 2016 parabola)
      assert.ok(dt > 70 && dt < 120, `Expected ~76, got ${dt}`);
    });

    it('should return extrapolated values for 2100', () => {
      const dt = deltaT(2100, 1);
      // Very uncertain, but should be larger
      assert.ok(dt > 100, `Expected >100, got ${dt}`);
    });

    it('should handle far future (3000 CE)', () => {
      const dt = deltaT(3000, 1);
      // Parabolic extrapolation for distant future
      assert.ok(dt > 1000, `Expected >1000 for year 3000, got ${dt}`);
    });
  });

  describe('Continuity across era boundaries', () => {
    it('should be continuous at year -500 boundary', () => {
      const dt1 = deltaT(-501, 6);
      const dt2 = deltaT(-500, 6);
      const dt3 = deltaT(-499, 6);
      // Values should be close (within ~100 seconds)
      assert.ok(Math.abs(dt2 - dt1) < 100, `Discontinuity at -500: ${dt1} vs ${dt2}`);
      assert.ok(Math.abs(dt3 - dt2) < 100, `Discontinuity at -500: ${dt2} vs ${dt3}`);
    });

    it('should be continuous at year 500 boundary', () => {
      const dt1 = deltaT(499, 6);
      const dt2 = deltaT(500, 6);
      const dt3 = deltaT(501, 6);
      assert.ok(Math.abs(dt2 - dt1) < 100, `Discontinuity at 500: ${dt1} vs ${dt2}`);
      assert.ok(Math.abs(dt3 - dt2) < 100, `Discontinuity at 500: ${dt2} vs ${dt3}`);
    });

    it('should be continuous at year 1600 boundary', () => {
      const dt1 = deltaT(1599, 6);
      const dt2 = deltaT(1600, 6);
      const dt3 = deltaT(1601, 6);
      assert.ok(Math.abs(dt2 - dt1) < 50, `Discontinuity at 1600: ${dt1} vs ${dt2}`);
      assert.ok(Math.abs(dt3 - dt2) < 50, `Discontinuity at 1600: ${dt2} vs ${dt3}`);
    });

    it('should be continuous at year 1700 boundary', () => {
      const dt1 = deltaT(1699, 6);
      const dt2 = deltaT(1700, 6);
      const dt3 = deltaT(1701, 6);
      assert.ok(Math.abs(dt2 - dt1) < 10, `Discontinuity at 1700: ${dt1} vs ${dt2}`);
      assert.ok(Math.abs(dt3 - dt2) < 10, `Discontinuity at 1700: ${dt2} vs ${dt3}`);
    });

    it('should be continuous at year 1800 boundary', () => {
      const dt1 = deltaT(1799, 6);
      const dt2 = deltaT(1800, 6);
      const dt3 = deltaT(1801, 6);
      assert.ok(Math.abs(dt2 - dt1) < 5, `Discontinuity at 1800: ${dt1} vs ${dt2}`);
      assert.ok(Math.abs(dt3 - dt2) < 5, `Discontinuity at 1800: ${dt2} vs ${dt3}`);
    });

    it('should be continuous at year 1900 boundary', () => {
      const dt1 = deltaT(1899, 6);
      const dt2 = deltaT(1900, 6);
      const dt3 = deltaT(1901, 6);
      assert.ok(Math.abs(dt2 - dt1) < 2, `Discontinuity at 1900: ${dt1} vs ${dt2}`);
      assert.ok(Math.abs(dt3 - dt2) < 2, `Discontinuity at 1900: ${dt2} vs ${dt3}`);
    });

    it('should be continuous at year 2000 boundary', () => {
      const dt1 = deltaT(1999, 6);
      const dt2 = deltaT(2000, 6);
      const dt3 = deltaT(2001, 6);
      assert.ok(Math.abs(dt2 - dt1) < 1, `Discontinuity at 2000: ${dt1} vs ${dt2}`);
      assert.ok(Math.abs(dt3 - dt2) < 1, `Discontinuity at 2000: ${dt2} vs ${dt3}`);
    });

    it('should be continuous at year 2050 boundary', () => {
      const dt1 = deltaT(2049, 6);
      const dt2 = deltaT(2050, 6);
      const dt3 = deltaT(2051, 6);
      assert.ok(Math.abs(dt2 - dt1) < 10, `Discontinuity at 2050: ${dt1} vs ${dt2}`);
      assert.ok(Math.abs(dt3 - dt2) < 10, `Discontinuity at 2050: ${dt2} vs ${dt3}`);
    });
  });

  describe('Month interpolation', () => {
    it('should vary slightly by month', () => {
      const jan = deltaT(2025, 1);
      const jul = deltaT(2025, 7);
      // Should be close but not identical due to month interpolation
      assert.ok(Math.abs(jan - jul) < 1, 'Monthly variation should be small');
    });

    it('should interpolate smoothly across months', () => {
      const values: number[] = [];
      for (let month = 1; month <= 12; month++) {
        values.push(deltaT(2025, month));
      }
      // Check that consecutive months don't differ drastically
      for (let i = 1; i < values.length; i++) {
        assert.ok(
          Math.abs(values[i] - values[i - 1]) < 0.5,
          `Large jump between month ${i} and ${i + 1}`,
        );
      }
    });
  });

  describe('Monotonicity (general trend)', () => {
    it('should generally increase from 1800 to present', () => {
      // Note: There are periods where ΔT decreased (e.g., 1600-1700)
      // But overall trend from 1800 onwards is increasing
      const dt1800 = deltaT(1800, 1);
      const dt1900 = deltaT(1900, 1);
      const dt2000 = deltaT(2000, 1);
      const dt2025 = deltaT(2025, 1);

      assert.ok(dt2025 > dt2000);
      assert.ok(dt2000 > dt1900);
      // 1800-1900 period is complex, so we check it stayed in reasonable range
      assert.ok(dt1800 > 0 && dt1900 > -10);
    });

    it('should increase into the future', () => {
      const dt2025 = deltaT(2025, 1);
      const dt2050 = deltaT(2050, 1);
      const dt2100 = deltaT(2100, 1);

      assert.ok(dt2050 > dt2025, '2050 should be greater than 2025');
      assert.ok(dt2100 > dt2050, '2100 should be greater than 2050');
    });

    it('should increase going back in time (before 500 CE)', () => {
      const dt500 = deltaT(500, 1);
      const dt0 = deltaT(0, 1);
      const dtMinus500 = deltaT(-500, 1);
      const dtMinus1000 = deltaT(-1000, 1);

      assert.ok(dt0 > dt500, 'Year 0 should have larger ΔT than 500');
      assert.ok(dtMinus500 > dt0, 'Year -500 should have larger ΔT than 0');
      assert.ok(dtMinus1000 > dtMinus500, 'Year -1000 should have larger ΔT than -500');
    });
  });

  describe('Reasonable bounds', () => {
    it('should be positive for most of history', () => {
      // ΔT is positive except for brief period in early 1900s
      assert.ok(deltaT(2000, 1) > 0);
      assert.ok(deltaT(1800, 1) > 0);
      assert.ok(deltaT(1000, 1) > 0);
      assert.ok(deltaT(-1000, 1) > 0);
    });

    it('should not exceed 100 seconds in modern era (1900-2050)', () => {
      for (let year = 1950; year <= 2025; year += 5) {
        const dt = deltaT(year, 1);
        assert.ok(dt < 100, `ΔT too large for modern era: ${dt} at year ${year}`);
      }
    });

    it('should be less than 100000 seconds for last 5000 years', () => {
      for (let year = -3000; year <= 2025; year += 500) {
        const dt = deltaT(year, 1);
        assert.ok(dt < 100000, `ΔT unreasonably large: ${dt} at year ${year}`);
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle year 0 (1 BCE)', () => {
      const dt = deltaT(0, 1);
      assert.ok(!Number.isNaN(dt), 'Year 0 should return valid ΔT');
      assert.ok(dt > 0, 'Year 0 ΔT should be positive');
    });

    it('should handle negative years', () => {
      const dt = deltaT(-100, 6);
      assert.ok(!Number.isNaN(dt), 'Negative year should return valid ΔT');
      assert.ok(dt > 0, 'Ancient dates should have positive ΔT');
    });

    it('should handle very large future years', () => {
      const dt = deltaT(10000, 1);
      assert.ok(!Number.isNaN(dt), 'Far future should return valid ΔT');
      assert.ok(dt > 1000, 'Far future should have large ΔT');
    });

    it('should handle all months (1-12)', () => {
      for (let month = 1; month <= 12; month++) {
        const dt = deltaT(2025, month);
        assert.ok(!Number.isNaN(dt), `Month ${month} should return valid ΔT`);
      }
    });
  });
});

describe('ttToUT', () => {
  it('should convert TT to UT by subtracting ΔT', () => {
    const ttJD = 2451545.0; // J2000.0 in TT
    const utJD = ttToUT(ttJD, 2000, 1);

    // ΔT in 2000 was ~64 seconds = ~0.00074 days
    const expectedUT = ttJD - 64 / 86400;
    assert.ok(Math.abs(utJD - expectedUT) < 0.0001);
  });

  it('should return smaller JD for UT (UT is behind TT)', () => {
    const ttJD = 2451545.0;
    const utJD = ttToUT(ttJD, 2000, 1);
    assert.ok(utJD < ttJD, 'UT should be less than TT');
  });

  it('should handle different years', () => {
    const ttJD = 2400000.0;
    const utJD1850 = ttToUT(ttJD, 1850, 1);
    const utJD2020 = ttToUT(ttJD, 2020, 1);

    // Both should be less than TT, but by different amounts
    assert.ok(utJD1850 < ttJD);
    assert.ok(utJD2020 < ttJD);
    assert.notStrictEqual(utJD1850, utJD2020);
  });
});

describe('utToTT', () => {
  it('should convert UT to TT by adding ΔT', () => {
    const utJD = 2451545.0; // J2000.0 in UT
    const ttJD = utToTT(utJD, 2000, 1);

    // ΔT in 2000 was ~64 seconds = ~0.00074 days
    const expectedTT = utJD + 64 / 86400;
    assert.ok(Math.abs(ttJD - expectedTT) < 0.0001);
  });

  it('should return larger JD for TT (TT is ahead of UT)', () => {
    const utJD = 2451545.0;
    const ttJD = utToTT(utJD, 2000, 1);
    assert.ok(ttJD > utJD, 'TT should be greater than UT');
  });

  it('should be inverse of ttToUT', () => {
    const originalTT = 2451545.0;
    const year = 2000;
    const month = 1;

    // TT → UT → TT should return to original
    const ut = ttToUT(originalTT, year, month);
    const backToTT = utToTT(ut, year, month);

    assert.ok(
      Math.abs(backToTT - originalTT) < 0.000001,
      'Round-trip conversion should preserve value',
    );
  });

  it('should handle different years', () => {
    const utJD = 2400000.0;
    const ttJD1850 = utToTT(utJD, 1850, 1);
    const ttJD2020 = utToTT(utJD, 2020, 1);

    // Both should be greater than UT, but by different amounts
    assert.ok(ttJD1850 > utJD);
    assert.ok(ttJD2020 > utJD);
    assert.notStrictEqual(ttJD1850, ttJD2020);
  });
});

describe('TT ↔ UT round-trip', () => {
  it('should round-trip for year 2025', () => {
    const original = 2460665.0;
    const ut = ttToUT(original, 2025, 12);
    const back = utToTT(ut, 2025, 12);
    assert.ok(Math.abs(back - original) < 1e-9);
  });

  it('should round-trip for year 1900', () => {
    const original = 2415020.0;
    const ut = ttToUT(original, 1900, 1);
    const back = utToTT(ut, 1900, 1);
    assert.ok(Math.abs(back - original) < 1e-9);
  });

  it('should round-trip for year 1600', () => {
    const original = 2305447.0;
    const ut = ttToUT(original, 1600, 6);
    const back = utToTT(ut, 1600, 6);
    assert.ok(Math.abs(back - original) < 1e-9);
  });

  it('should round-trip for ancient dates', () => {
    const original = 1721424.0; // ~1 CE
    const ut = ttToUT(original, 1, 1);
    const back = utToTT(ut, 1, 1);
    assert.ok(Math.abs(back - original) < 1e-8);
  });
});

describe('USNO observed ΔT and JD helpers', () => {
  const jdAt = (year: number) => 2451545 + (year - 2000) * 365.25;

  it('does not regress the existing ancient NASA reference errors', () => {
    // Previous Espenak–Meeus errors at the same mid-January decimal years.
    for (const [year, reference, previousError] of [
      [-500, 17190, 12.9027108],
      [0, 10580, 3.17733504],
      [500, 5710, 0.36852664],
      [1000, 1570, 3.96834154],
      [1500, 200, 1.72212159],
      [1600, 120, 0.04089326],
    ]) {
      assert.ok(Math.abs(deltaT(year, 1) - reference) <= previousError, `year ${year}`);
    }
  });

  it('retains original E–M coefficients outside the final-year continuity taper', () => {
    for (let y = 1600; y < 1800; y += 0.25) {
      const t = y - (y < 1700 ? 1600 : 1700);
      const expected =
        y < 1700
          ? 120 - 0.9808 * t - 0.01532 * t ** 2 + t ** 3 / 7129
          : 8.83 + 0.1603 * t - 0.0059285 * t ** 2 + 0.00013336 * t ** 3 - t ** 4 / 1174000;
      const taper = y < 1700 ? 0.16212793 * Math.max(0, y - 1699) : 0;
      assert.ok(Math.abs(deltaTAt(jdAt(y)) - (expected - taper)) < 1e-10, `year ${y}`);
    }
  });

  it('fits USNO rows from 1800, including the overlapping historic/monthly series', async () => {
    const { readFile } = await import('node:fs/promises');
    const rows: number[][] = [];
    for (const name of ['historic_deltat.data', 'deltat.data']) {
      const fixture = JSON.parse(
        await readFile(new URL(`./__fixtures__/delta-t/${name}.json`, import.meta.url), 'utf8'),
      );
      rows.push(...fixture.rows);
    }
    // In 1657–1799 the older USNO tabulation and NASA/M&S (2004) disagree;
    // we follow NASA there. The max USNO difference (12.681097 s) exceeds
    // its listed 10 s standard errors, so no USNO accuracy assertion there.
    // Measured max/RMS seconds from 1800: 1.346667/.462101, .320000/.103792,
    // .103977/.033801. Limits are rounded up, not observational uncertainty.
    for (const [start, end, count, maxLimit, rmsLimit] of [
      [1800, 1900, 200, 1.35, 0.463],
      [1900, 1955, 110, 0.321, 0.104],
      [1955, 2027, 705, 0.105, 0.034],
    ]) {
      const errors = rows
        .filter(([y]) => y >= start && y < end)
        .map(([y, seconds]) => Math.abs(deltaTAt(jdAt(y)) - seconds));
      assert.equal(errors.length, count);
      assert.ok(Math.max(...errors) < maxLimit, `max error at ${start}`);
      assert.ok(
        Math.sqrt(errors.reduce((sum, e) => sum + e * e, 0) / errors.length) < rmsLimit,
        `RMS error at ${start}`,
      );
    }
  });

  it('has no jumps above .05 seconds at polynomial, knot or extrapolation joins', () => {
    // Every quarter-year includes every encoded knot and all segment boundaries.
    for (const y of [-500, 500, 1600, ...Array.from({ length: 1973 }, (_, i) => 1657 + i / 4)]) {
      assert.ok(
        Math.abs(deltaTAt(jdAt(y - 1e-8)) - deltaTAt(jdAt(y + 1e-8))) < 0.05,
        `join at ${y}`,
      );
    }
  });

  it('extrapolates monotonically with matching slopes at the two Hermite endpoints', () => {
    let previous = deltaTAt(jdAt(2026.75));
    for (let y = 2026.76; y <= 2800; y += 0.01) {
      const next = deltaTAt(jdAt(y));
      assert.ok(next > previous);
      previous = next;
    }
    for (const y of [2026.75, 2800]) {
      const left = (deltaTAt(jdAt(y)) - deltaTAt(jdAt(y - 0.001))) / 0.001;
      const right = (deltaTAt(jdAt(y + 0.001)) - deltaTAt(jdAt(y))) / 0.001;
      assert.ok(Math.abs(left - right) < 0.001);
    }
    assert.ok(Math.abs(deltaTAt(jdAt(2026.75)) - 69.2) < 1e-10);
    assert.ok(Math.abs(deltaTAt(jdAt(2800)) - (-320 + 32.5 * 9.75 ** 2)) < 1e-9);
    assert.ok(Math.abs(deltaTAt(jdAt(3000)) - (-320 + 32.5 * 11.75 ** 2)) < 1e-9);
  });

  it('follows current USNO/IERS predictions after the last observation', () => {
    // Comparison data retrieved 2026-10-24 (not used for coefficients):
    // IERS Bulletin A via https://maia.usno.navy.mil/ser7/finals2000A.data (TAI−UTC 37 s),
    // ΔT = 69.184 − (UT1−UTC); and https://maia.usno.navy.mil/ser7/deltat.preds.
    const bulletinA: [number, number][] = [
      [61340, 69.2347],
      [61430, 69.3263],
      [61520, 69.4191],
      [61610, 69.3993],
      [61700, 69.3865],
    ];
    for (const [mjd, value] of bulletinA) {
      assert.ok(Math.abs(deltaTAt(mjd + 2400000.5) - value) < 0.12, `Bulletin A MJD ${mjd}`);
    }
    const preds: [number, number][] = [
      [2027, 69.14],
      [2028, 69.34],
      [2030, 69.97],
      [2032, 70.62],
      [2033.75, 71.25],
    ];
    for (const [year, value] of preds) {
      assert.ok(Math.abs(deltaTAt(jdAt(year)) - value) < 0.45, `deltat.preds ${year}`);
    }
  });

  it('inverts TT/UT to within 1e-9 day across −2000…3000, including joins', () => {
    for (let y = -2000; y <= 3000; y += 0.25) {
      const jd = jdAt(y);
      assert.ok(Math.abs(toTT(toUT(jd)) - jd) < 1e-9, `TT at ${y}`);
      assert.ok(Math.abs(toUT(toTT(jd)) - jd) < 1e-9, `UT at ${y}`);
      assert.equal(toTT(jd), jd + deltaTAt(jd) / 86400);
    }
  });

  it('inverts dates immediately around model joins without inverse gaps', () => {
    for (const year of [
      -500, 500, 1000, 1501, 1600, 1699, 1700, 1800, 1804, 2026.25, 2026.75, 2800,
    ]) {
      const tt = toTT(jdAt(year));
      for (let i = -100; i <= 100; i++) {
        const date = tt + i * 1e-8;
        assert.ok(Math.abs(toTT(toUT(date)) - date) < 1e-9, `join ${year}, offset ${i}`);
      }
    }
  });

  it('keeps month and JD entry points consistent', () => {
    for (let y = -2000; y <= 3000; y += 10) {
      for (let m = 1; m <= 12; m++) {
        assert.ok(Math.abs(deltaT(y, m) - deltaTAt(jdAt(y + (m - 0.5) / 12))) < 1e-9);
      }
    }
  });
});
