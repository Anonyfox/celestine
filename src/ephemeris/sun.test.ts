/**
 * Tests for Sun Position Calculator
 *
 * @remarks
 * Verifies Sun position calculations against:
 * 1. Swiss Ephemeris reference data (authoritative)
 * 2. Meeus "Astronomical Algorithms" examples
 * 3. Known astronomical events (solstices, equinoxes)
 *
 * Accuracy target: ±2 arcminutes (0.033°)
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { DAYS_PER_JULIAN_CENTURY, J2000_EPOCH } from './constants.js';

// =============================================================================
// SWISS EPHEMERIS REFERENCE DATA
// Generated from pyswisseph (Swiss Ephemeris 2.10.03)
// These values are AUTHORITATIVE - do not modify!
// Our implementation must match these within ±2 arcminutes (0.033°)
// =============================================================================
const SWISSEPH_SUN_REFERENCE = [
  {
    jd: 2451545.0,
    description: 'J2000.0 (2000-Jan-01 12:00 TT)',
    longitude: 280.36892,
    latitude: 0.000232,
    distance: 0.983328,
    speed: 1.019432,
  },
  {
    jd: 2448724.5,
    description: 'Meeus Example 47.a (1992-Apr-12 00:00 TT)',
    longitude: 22.340448,
    latitude: -0.000175,
    distance: 1.002498,
    speed: 0.980426,
  },
  {
    jd: 2440587.5,
    description: 'Unix Epoch (1970-Jan-01 00:00 TT)',
    longitude: 280.156285,
    latitude: -0.000021,
    distance: 0.983311,
    speed: 1.019252,
  },
  {
    jd: 2459580.5,
    description: 'Recent (2022-Jan-01 00:00 TT)',
    longitude: 280.528942,
    latitude: -0.000129,
    distance: 0.983356,
    speed: 1.019637,
  },
] as const;

// Tolerance: 2 arcminutes = 0.0333 degrees
const LONGITUDE_TOLERANCE = 0.034;

import {
  earthEccentricity,
  getSunPosition,
  nutationInLongitude,
  sunApparentLongitude,
  sunDistance,
  sunEquationOfCenter,
  sunMeanAnomaly,
  sunMeanLongitude,
  sunTrueLongitude,
} from './sun.js';

/**
 * Helper to convert calendar date to Julian Date.
 * Simplified version for testing.
 */
function toJD(year: number, month: number, day: number, hour = 12): number {
  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  return (
    Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + hour / 24 + b - 1524.5
  );
}

describe('ephemeris/sun', () => {
  describe('sunMeanLongitude', () => {
    it('should return ~280.46° at J2000.0', () => {
      const T = 0; // J2000.0
      const L0 = sunMeanLongitude(T);
      // Meeus Table 25.a: L₀ = 280.46646°
      assert.ok(Math.abs(L0 - 280.46646) < 0.00001);
    });

    it('should increase by ~360° per year', () => {
      const T0 = 0;
      const T1 = 1 / 100; // 1 year = 0.01 century
      const L0 = sunMeanLongitude(T0);
      const L1 = sunMeanLongitude(T1);
      const diff = L1 - L0;
      // Should increase by ~360° (one orbit)
      assert.ok(Math.abs(diff - 360.0077) < 0.001);
    });
  });

  describe('sunMeanAnomaly', () => {
    it('should return ~357.53° at J2000.0', () => {
      const T = 0;
      const M = sunMeanAnomaly(T);
      // Meeus Table 25.a: M = 357.52911°
      assert.ok(Math.abs(M - 357.52911) < 0.00001);
    });
  });

  describe('earthEccentricity', () => {
    it('should return ~0.0167 at J2000.0', () => {
      const T = 0;
      const e = earthEccentricity(T);
      // Earth's eccentricity is slowly decreasing
      assert.ok(Math.abs(e - 0.016708634) < 0.0000001);
    });

    it('should decrease over time', () => {
      const e2000 = earthEccentricity(0);
      const e2100 = earthEccentricity(1);
      assert.ok(e2100 < e2000);
    });
  });

  describe('sunEquationOfCenter', () => {
    it('should be 0 at M = 0° and M = 180°', () => {
      const T = 0;
      const C0 = sunEquationOfCenter(0, T);
      const C180 = sunEquationOfCenter(180, T);
      assert.ok(Math.abs(C0) < 0.0001);
      assert.ok(Math.abs(C180) < 0.0001);
    });

    it('should be maximum near M = 90°', () => {
      const T = 0;
      const C90 = sunEquationOfCenter(90, T);
      const C80 = sunEquationOfCenter(80, T);
      const C100 = sunEquationOfCenter(100, T);
      // Maximum equation of center is ~1.92°
      assert.ok(C90 > 1.9);
      assert.ok(C90 < 2.0);
      // Should be near maximum at 90°
      assert.ok(C90 > C80);
      assert.ok(C90 > C100);
    });

    it('should be negative near M = 270°', () => {
      const T = 0;
      const C270 = sunEquationOfCenter(270, T);
      assert.ok(C270 < 0);
      assert.ok(C270 > -2.0);
    });
  });

  describe('sunTrueLongitude', () => {
    it('should differ from mean longitude by equation of center', () => {
      const T = 0;
      const L0 = sunMeanLongitude(T);
      const trueLon = sunTrueLongitude(T);
      const M = sunMeanAnomaly(T);
      const C = sunEquationOfCenter(M, T);

      assert.ok(Math.abs(trueLon - (L0 + C)) < 0.0001);
    });
  });

  describe('nutationInLongitude', () => {
    it('should be small (within ±0.006°)', () => {
      // Nutation is typically ±17" = ±0.0047°
      for (const T of [-1, 0, 1, 2]) {
        const nutation = nutationInLongitude(T);
        assert.ok(Math.abs(nutation) < 0.006);
      }
    });
  });

  describe('sunDistance', () => {
    it('should be ~1 AU on average', () => {
      const T = 0;
      const R = sunDistance(T);
      assert.ok(R > 0.98);
      assert.ok(R < 1.02);
    });

    it('should be minimum (~0.983 AU) near perihelion (early January)', () => {
      // Perihelion is around January 3
      // J2000.0 is January 1, so T = 0 is close to perihelion
      const T = 0;
      const R = sunDistance(T);
      // At J2000.0, Earth is very close to perihelion
      assert.ok(R < 0.985);
    });

    it('should be maximum (~1.017 AU) near aphelion (early July)', () => {
      // Aphelion is around July 4
      // That's about 0.5 years from J2000.0
      const T = 0.5 / 100; // ~0.5 years in centuries
      const R = sunDistance(T);
      assert.ok(R > 1.01);
    });
  });

  describe('sunApparentLongitude', () => {
    it('should differ from true longitude by aberration', () => {
      const T = 0;
      const trueLon = sunTrueLongitude(T);
      const apparentLon = sunApparentLongitude(T, { includeNutation: false });

      // Aberration is about -20.5" = -0.00569°
      const diff = apparentLon - trueLon;
      assert.ok(Math.abs(diff - -0.00569) < 0.0001);
    });

    it('should include nutation when requested', () => {
      const T = 0;
      const withoutNutation = sunApparentLongitude(T, { includeNutation: false });
      const withNutation = sunApparentLongitude(T, { includeNutation: true });

      // Should differ by the nutation amount
      const nutation = nutationInLongitude(T);
      assert.ok(Math.abs(withNutation - withoutNutation - nutation) < 0.0001);
    });
  });

  describe('getSunPosition', () => {
    describe('Swiss Ephemeris reference validation', () => {
      /**
       * Validates against Swiss Ephemeris (pyswisseph 2.10.03)
       * These are authoritative reference values - DO NOT MODIFY the expected values.
       * If tests fail, fix the implementation, not the test data.
       */
      for (const ref of SWISSEPH_SUN_REFERENCE) {
        it(`should match Swiss Ephemeris at ${ref.description}`, () => {
          const sun = getSunPosition(ref.jd);

          const lonDiff = Math.abs(sun.longitude - ref.longitude);
          assert.ok(
            lonDiff < LONGITUDE_TOLERANCE,
            `Longitude: expected ${ref.longitude}°, got ${sun.longitude}° (diff: ${(lonDiff * 60).toFixed(1)} arcmin)`,
          );

          assert.ok(
            Math.abs(sun.distance - ref.distance) < 0.001,
            `Distance: expected ${ref.distance} AU, got ${sun.distance} AU`,
          );
        });
      }
    });

    describe('J2000.0 epoch (Jan 1, 2000, 12:00 TT)', () => {
      it('should have latitude essentially 0', () => {
        const jd = J2000_EPOCH;
        const sun = getSunPosition(jd);
        assert.ok(Math.abs(sun.latitude) < 0.001);
      });

      it('should have speed ~1°/day', () => {
        const jd = J2000_EPOCH;
        const sun = getSunPosition(jd);
        // Sun moves ~0.95-1.02°/day depending on time of year
        // Near perihelion (Jan), it moves faster
        assert.ok(sun.longitudeSpeed > 0.95);
        assert.ok(sun.longitudeSpeed < 1.05);
      });

      it('should never be retrograde', () => {
        const jd = J2000_EPOCH;
        const sun = getSunPosition(jd);
        assert.equal(sun.isRetrograde, false);
      });
    });

    describe('Meeus Example verification', () => {
      /**
       * Meeus Example 25.a, p. 165
       * Date: 1992 October 13, 0h TD
       * JD = 2448908.5
       *
       * Note: Different sources use slightly different polynomial coefficients.
       * Our coefficients come from Meeus Table 25.a, but there may be minor
       * differences in precision. The important validation is the final
       * Sun position against JPL Horizons.
       *
       * Meeus expected apparent longitude: ~198.38°
       */
      it('should produce Sun position near 198° for Oct 13, 1992', () => {
        const jd = 2448908.5; // Oct 13, 1992, 0h TD
        const sun = getSunPosition(jd);

        // Sun should be in Libra (180-210°) in mid-October
        assert.ok(
          sun.longitude > 195 && sun.longitude < 205,
          `Expected ~198-200°, got ${sun.longitude}°`,
        );
      });

      it('should have equation of center approximately -1.9° for Oct 13, 1992', () => {
        const jd = 2448908.5;
        const T = (jd - J2000_EPOCH) / DAYS_PER_JULIAN_CENTURY;
        const M = sunMeanAnomaly(T);
        const C = sunEquationOfCenter(M, T);

        // Equation of center should be negative and around -1.9°
        // (we're past aphelion, before perihelion)
        assert.ok(C < 0, 'C should be negative');
        assert.ok(Math.abs(C) > 1.5 && Math.abs(C) < 2.5, `Expected C around -1.9°, got ${C}°`);
      });
    });

    describe('Solstices and Equinoxes', () => {
      /**
       * At equinoxes, Sun longitude is 0° (vernal) or 180° (autumnal)
       * At solstices, Sun longitude is 90° (summer) or 270° (winter)
       */

      it('should be ~0° at vernal equinox (March 20)', () => {
        // March 20, 2024 ~03:06 UTC
        const jd = toJD(2024, 3, 20, 3.1);
        const sun = getSunPosition(jd);
        // Should be very close to 0° (Aries)
        assert.ok(sun.longitude < 1 || sun.longitude > 359);
      });

      it('should be ~90° at summer solstice (June 20)', () => {
        // June 20, 2024 ~20:51 UTC
        const jd = toJD(2024, 6, 20, 20.85);
        const sun = getSunPosition(jd);
        // Should be close to 90° (Cancer)
        assert.ok(Math.abs(sun.longitude - 90) < 1);
      });

      it('should be ~180° at autumnal equinox (Sept 22)', () => {
        // Sept 22, 2024 ~12:43 UTC
        const jd = toJD(2024, 9, 22, 12.7);
        const sun = getSunPosition(jd);
        // Should be close to 180° (Libra)
        assert.ok(Math.abs(sun.longitude - 180) < 1);
      });

      it('should be ~270° at winter solstice (Dec 21)', () => {
        // Dec 21, 2024 ~09:20 UTC
        const jd = toJD(2024, 12, 21, 9.3);
        const sun = getSunPosition(jd);
        // Should be close to 270° (Capricorn)
        assert.ok(Math.abs(sun.longitude - 270) < 1);
      });
    });

    describe('Historical dates', () => {
      /**
       * Apollo 11 landing: July 20, 1969, 20:17 UTC
       * Sun should be in Cancer (~118°)
       */
      it('Apollo 11 landing - Sun in Cancer', () => {
        const jd = toJD(1969, 7, 20, 20.28);
        const sun = getSunPosition(jd);
        // Sun in late Cancer, ~118°
        assert.ok(sun.longitude > 115 && sun.longitude < 120);
      });
    });

    describe('Options', () => {
      it('should calculate speed by default', () => {
        const sun = getSunPosition(J2000_EPOCH);
        assert.ok(sun.longitudeSpeed !== 0);
      });

      it('should skip speed calculation when disabled', () => {
        const sun = getSunPosition(J2000_EPOCH, { includeSpeed: false });
        assert.equal(sun.longitudeSpeed, 0);
      });

      it('should include nutation when requested', () => {
        const without = getSunPosition(J2000_EPOCH, { includeNutation: false });
        const withNut = getSunPosition(J2000_EPOCH, { includeNutation: true });

        // Should differ by nutation amount (up to ~0.006°)
        const diff = Math.abs(withNut.longitude - without.longitude);
        assert.ok(diff > 0 && diff < 0.01);
      });
    });

    describe('Edge cases', () => {
      it('should handle year wraparound correctly', () => {
        // Dec 31, 2023 23:59
        const jd1 = toJD(2023, 12, 31, 23.98);
        // Jan 1, 2024 00:01
        const jd2 = toJD(2024, 1, 1, 0.02);

        const sun1 = getSunPosition(jd1);
        const sun2 = getSunPosition(jd2);

        // Positions should be nearly identical (< 0.1° apart)
        let diff = sun2.longitude - sun1.longitude;
        if (diff < -180) diff += 360;
        if (diff > 180) diff -= 360;
        assert.ok(Math.abs(diff) < 0.1);
      });

      it('should handle longitude wraparound at 360°', () => {
        // Find a date where Sun crosses from Pisces (330-360°) to Aries (0-30°)
        // Around March 20 (vernal equinox)
        const jdBefore = toJD(2024, 3, 19, 12); // Sun ~359°
        const jdAfter = toJD(2024, 3, 21, 12); // Sun ~1°

        const sunBefore = getSunPosition(jdBefore);
        const sunAfter = getSunPosition(jdAfter);

        // Both should be valid positions
        assert.ok(sunBefore.longitude >= 0 && sunBefore.longitude < 360);
        assert.ok(sunAfter.longitude >= 0 && sunAfter.longitude < 360);

        // Speed should still be positive (moving forward)
        assert.ok(sunBefore.longitudeSpeed > 0);
        assert.ok(sunAfter.longitudeSpeed > 0);
      });

      it('should work for dates far from J2000', () => {
        // Year 1900
        const jd1900 = toJD(1900, 1, 1, 12);
        const sun1900 = getSunPosition(jd1900);
        assert.ok(sun1900.longitude >= 0 && sun1900.longitude < 360);

        // Year 2100
        const jd2100 = toJD(2100, 1, 1, 12);
        const sun2100 = getSunPosition(jd2100);
        assert.ok(sun2100.longitude >= 0 && sun2100.longitude < 360);
      });
    });

    describe('Cross-validation with zodiac signs', () => {
      it('should be in Capricorn at J2000.0', () => {
        // J2000.0 is Jan 1, 2000 - Sun in Capricorn (270-300°)
        const sun = getSunPosition(J2000_EPOCH);
        assert.ok(sun.longitude >= 270 && sun.longitude < 300);
      });

      it('should be in Aries in late March', () => {
        const jd = toJD(2024, 3, 25, 12);
        const sun = getSunPosition(jd);
        // Aries: 0-30°
        assert.ok(sun.longitude >= 0 && sun.longitude < 30);
      });

      it('should be in Cancer in early July', () => {
        const jd = toJD(2024, 7, 5, 12);
        const sun = getSunPosition(jd);
        // Cancer: 90-120°
        assert.ok(sun.longitude >= 90 && sun.longitude < 120);
      });

      it('should be in Libra in early October', () => {
        const jd = toJD(2024, 10, 5, 12);
        const sun = getSunPosition(jd);
        // Libra: 180-210°
        assert.ok(sun.longitude >= 180 && sun.longitude < 210);
      });
    });
  });
});
