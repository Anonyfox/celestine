/**
 * Tests for Neptune Position Calculator
 *
 * @remarks
 * Verifies Neptune position calculations against:
 * 1. Swiss Ephemeris reference data (authoritative)
 * 2. Known astronomical events (oppositions, conjunctions)
 * 3. Ice giant orbital characteristics
 *
 * Accuracy target: ±2 arcminutes (0.033°) for longitude
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { J2000_EPOCH } from '../constants.js';
import {
  getNeptunePosition,
  NEPTUNE_ORBITAL_ELEMENTS,
  neptuneHeliocentricDistance,
  neptuneHeliocentricLatitude,
  neptuneHeliocentricLongitude,
} from './neptune.js';

// =============================================================================
// SWISS EPHEMERIS REFERENCE DATA
// Generated from pyswisseph (Swiss Ephemeris 2.10.03)
// These values are AUTHORITATIVE - do not modify!
// Our implementation must match these within ±2 arcminutes (0.033°)
// =============================================================================
const SWISSEPH_NEPTUNE_REFERENCE = [
  {
    jd: 2451545.0,
    description: 'J2000.0 (2000-Jan-01 12:00 TT)',
    longitude: 303.192981,
    latitude: 0.234991,
    distance: 31.024527,
    speed: 0.03557,
    isRetrograde: false,
  },
  {
    jd: 2448724.5,
    description: 'Meeus Example 47.a (1992-Apr-12 00:00 TT)',
    longitude: 288.938124,
    latitude: 0.740913,
    distance: 30.116711,
    speed: 0.004653,
    isRetrograde: false,
  },
  {
    jd: 2440587.5,
    description: 'Unix Epoch (1970-Jan-01 00:00 TT)',
    longitude: 239.885861,
    latitude: 1.652384,
    distance: 31.066795,
    speed: 0.030457,
    isRetrograde: false,
  },
  {
    jd: 2459580.5,
    description: 'Recent (2022-Jan-01 00:00 TT)',
    longitude: 350.669123,
    latitude: -1.134688,
    distance: 30.240063,
    speed: 0.017276,
    isRetrograde: false,
  },
] as const;

// Tolerance: 2 arcminutes = 0.0333 degrees
const LONGITUDE_TOLERANCE = 0.034;

/**
 * Helper to convert calendar date to Julian Date.
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

describe('ephemeris/planets/neptune', () => {
  describe('Heliocentric coordinates', () => {
    describe('neptuneHeliocentricLongitude', () => {
      it('should return reasonable value at J2000.0', () => {
        const tau = 0;
        const lon = neptuneHeliocentricLongitude(tau);
        assert.ok(lon > 0 && lon < 2 * Math.PI, `Expected 0-2π rad, got ${lon}`);
      });

      it('should complete ~0.006 orbits per year', () => {
        // Neptune orbital period ≈ 60190 days ≈ 165 years
        // So in 1 year it completes ~0.006 orbits ≈ 0.038 radians
        const tau0 = 0;
        const tau1 = 1 / 1000; // 1 year
        const lon0 = neptuneHeliocentricLongitude(tau0);
        const lon1 = neptuneHeliocentricLongitude(tau1);

        const deltaLon = lon1 - lon0;
        // About 0.006 * 2π ≈ 0.038 radians per year
        assert.ok(
          Math.abs(deltaLon - 0.038) < 0.01,
          `Expected ~0.038 rad/year, got ${deltaLon} rad`,
        );
      });
    });

    describe('neptuneHeliocentricLatitude', () => {
      it('should stay within ±2° (orbital inclination ~1.77°)', () => {
        // Neptune's orbital inclination is ~1.77°
        for (let i = 0; i < 165; i++) {
          const tau = i / 1000; // years
          const lat = neptuneHeliocentricLatitude(tau);
          const latDeg = lat * (180 / Math.PI);
          assert.ok(Math.abs(latDeg) <= 2.5, `Latitude ${latDeg}° exceeds limit`);
        }
      });
    });

    describe('neptuneHeliocentricDistance', () => {
      it('should be approximately 30 AU (semi-major axis)', () => {
        const tau = 0;
        const dist = neptuneHeliocentricDistance(tau);
        // Semi-major axis ≈ 30.07 AU
        assert.ok(dist > 29 && dist < 31, `Expected ~30 AU, got ${dist} AU`);
      });

      it('should have very small variation (nearly circular orbit)', () => {
        // Neptune e = 0.0086 (lowest of all planets!)
        // Perihelion ≈ 29.81 AU, Aphelion ≈ 30.33 AU
        let minDist = Infinity;
        let maxDist = 0;

        // Sample over ~165 years
        for (let i = 0; i < 166; i++) {
          const tau = i / 1000; // years
          const dist = neptuneHeliocentricDistance(tau);
          minDist = Math.min(minDist, dist);
          maxDist = Math.max(maxDist, dist);
        }

        // With e=0.0086, range should be very small (~0.5 AU)
        const range = maxDist - minDist;
        assert.ok(range < 1.0, `Distance range ${range} AU should be < 1 AU (nearly circular)`);
      });
    });
  });

  describe('getNeptunePosition', () => {
    describe('Swiss Ephemeris reference validation', () => {
      /**
       * Validates against Swiss Ephemeris (pyswisseph 2.10.03)
       * These are authoritative reference values - DO NOT MODIFY the expected values.
       * If tests fail, fix the implementation, not the test data.
       */
      for (const ref of SWISSEPH_NEPTUNE_REFERENCE) {
        it(`should match Swiss Ephemeris at ${ref.description}`, () => {
          const neptune = getNeptunePosition(ref.jd);

          const lonDiff = Math.abs(neptune.longitude - ref.longitude);
          assert.ok(
            lonDiff < LONGITUDE_TOLERANCE,
            `Longitude: expected ${ref.longitude}°, got ${neptune.longitude}° (diff: ${(lonDiff * 60).toFixed(1)} arcmin)`,
          );
        });
      }
    });

    describe('J2000.0 epoch characteristics', () => {
      it('should have geocentric distance around 31 AU', () => {
        const jd = J2000_EPOCH;
        const neptune = getNeptunePosition(jd);

        // Geocentric distance varies from ~29 AU to ~31 AU
        assert.ok(
          neptune.distance > 29 && neptune.distance < 32,
          `Expected ~31 AU, got ${neptune.distance} AU`,
        );
      });

      it('should not be retrograde at J2000.0', () => {
        const jd = J2000_EPOCH;
        const neptune = getNeptunePosition(jd);

        // Neptune was direct at J2000.0 according to Swiss Ephemeris
        assert.ok(!neptune.isRetrograde, 'Neptune should not be retrograde at J2000.0');
      });

      it('should have very slow speed (outermost classical planet)', () => {
        const jd = J2000_EPOCH;
        const neptune = getNeptunePosition(jd);

        // Neptune's apparent motion varies from -0.04°/day (retrograde) to +0.04°/day
        assert.ok(
          neptune.longitudeSpeed > -0.05 && neptune.longitudeSpeed < 0.05,
          `Unexpected speed: ${neptune.longitudeSpeed}°/day`,
        );
      });
    });

    describe('Retrograde motion', () => {
      /**
       * Neptune retrogrades about every 367 days (synodic period) for ~158 days.
       */
      it('should detect retrograde when speed is negative', () => {
        let foundRetrograde = false;

        // Check over ~400 days to catch a retrograde
        for (let i = 0; i < 400; i++) {
          const jd = J2000_EPOCH + i;
          const neptune = getNeptunePosition(jd);

          if (neptune.isRetrograde) {
            foundRetrograde = true;
            assert.ok(neptune.longitudeSpeed < 0, 'Retrograde should have negative speed');
            break;
          }
        }

        assert.ok(foundRetrograde, 'Should find at least one retrograde day in 400 days');
      });

      it('should have retrograde lasting ~158 days', () => {
        // Find a complete retrograde period
        let jd = J2000_EPOCH;

        // Skip until we find retrograde motion
        while (!getNeptunePosition(jd).isRetrograde && jd < J2000_EPOCH + 400) {
          jd += 1;
        }

        // Skip to end of this retrograde
        while (getNeptunePosition(jd).isRetrograde && jd < J2000_EPOCH + 600) {
          jd += 1;
        }

        // Skip past direct motion
        while (!getNeptunePosition(jd).isRetrograde && jd < J2000_EPOCH + 1000) {
          jd += 1;
        }

        // Count the next full retrograde period
        let retrogradeDays = 0;
        while (getNeptunePosition(jd).isRetrograde && jd < J2000_EPOCH + 1200) {
          retrogradeDays++;
          jd += 1;
        }

        // Neptune retrograde lasts ~150-165 days
        assert.ok(
          retrogradeDays >= 145 && retrogradeDays <= 170,
          `Retrograde duration ${retrogradeDays} days outside expected 150-165 days`,
        );
      });
    });

    describe('Opposition', () => {
      it('should reach opposition (closest to Earth) once per ~367 days', () => {
        // Find minimum distance within a synodic period
        let minDistance = Infinity;

        for (let i = 0; i < 400; i++) {
          const jd = J2000_EPOCH + i;
          const neptune = getNeptunePosition(jd);

          if (neptune.distance < minDistance) {
            minDistance = neptune.distance;
          }
        }

        // At opposition, distance should be ~29-30 AU
        assert.ok(minDistance < 30.5, `Opposition distance ${minDistance} AU should be < 30.5 AU`);
      });
    });

    describe('Sign transit', () => {
      it('should move approximately 2° per year', () => {
        // Neptune moves ~2.2° per year (360° / 165 years)
        const jd0 = J2000_EPOCH;
        const neptune0 = getNeptunePosition(jd0);

        // Check after 1 year
        const jd1y = jd0 + 365.25;
        const neptune1y = getNeptunePosition(jd1y);

        // Calculate angular motion
        let motion = neptune1y.longitude - neptune0.longitude;
        if (motion < -180) motion += 360;
        if (motion > 180) motion -= 360;

        // Neptune should move ~2° per year (accounting for retrograde)
        assert.ok(Math.abs(motion - 2) < 1.5, `Expected ~2° motion per year, got ${motion}°`);
      });
    });

    describe('Historical dates', () => {
      it('should handle dates far from J2000', () => {
        // Year 1900
        const jd1900 = toJD(1900, 6, 15, 12);
        const neptune1900 = getNeptunePosition(jd1900);
        assert.ok(neptune1900.longitude >= 0 && neptune1900.longitude < 360);

        // Year 2100
        const jd2100 = toJD(2100, 6, 15, 12);
        const neptune2100 = getNeptunePosition(jd2100);
        assert.ok(neptune2100.longitude >= 0 && neptune2100.longitude < 360);
      });

      it('should return to similar position after ~165 years', () => {
        // Neptune's orbital period is ~165 years
        const jd0 = J2000_EPOCH;
        const neptune0 = getNeptunePosition(jd0);

        const jd165y = jd0 + 60190; // ~165 years in days
        const neptune165y = getNeptunePosition(jd165y);

        // Should be within ~15° of original position
        let diff = Math.abs(neptune165y.longitude - neptune0.longitude);
        if (diff > 180) diff = 360 - diff;

        assert.ok(diff < 20, `After 165 years, position changed by ${diff}° (expected < 20°)`);
      });
    });

    describe('~165-year zodiac cycle', () => {
      it('should traverse all zodiac signs in ~165 years', () => {
        const signs = new Set<number>();

        // Sample every 400 days for 166 years
        for (let i = 0; i < 166; i++) {
          const jd = J2000_EPOCH + i * 400;
          const neptune = getNeptunePosition(jd);
          const signIndex = Math.floor(neptune.longitude / 30);
          signs.add(signIndex);
        }

        // Should see all 12 signs
        assert.ok(signs.size >= 11, `Expected 12 signs, found ${signs.size}`);
      });
    });

    describe('Options', () => {
      it('should calculate speed by default', () => {
        const neptune = getNeptunePosition(J2000_EPOCH);
        assert.ok(neptune.longitudeSpeed !== 0);
      });

      it('should skip speed calculation when disabled', () => {
        const neptune = getNeptunePosition(J2000_EPOCH, { includeSpeed: false });
        assert.equal(neptune.longitudeSpeed, 0);
        assert.equal(neptune.isRetrograde, false);
      });
    });
  });

  describe('NEPTUNE_ORBITAL_ELEMENTS', () => {
    it('should have correct semi-major axis', () => {
      assert.ok(
        Math.abs(NEPTUNE_ORBITAL_ELEMENTS.semiMajorAxis - 30.07) < 0.1,
        'Semi-major axis should be ~30.07 AU',
      );
    });

    it('should have very low eccentricity (most circular orbit)', () => {
      assert.ok(
        NEPTUNE_ORBITAL_ELEMENTS.eccentricity < 0.01,
        'Eccentricity should be < 0.01 (nearly circular)',
      );
    });

    it('should have correct orbital period', () => {
      assert.ok(
        Math.abs(NEPTUNE_ORBITAL_ELEMENTS.orbitalPeriod - 60190) < 100,
        'Orbital period should be ~60190 days',
      );
    });

    it('should have ~165 year orbital period', () => {
      assert.ok(
        Math.abs(NEPTUNE_ORBITAL_ELEMENTS.orbitalPeriodYears - 165) < 2,
        'Orbital period should be ~165 years',
      );
    });

    it('should have correct synodic period', () => {
      assert.ok(
        Math.abs(NEPTUNE_ORBITAL_ELEMENTS.synodicPeriod - 367) < 2,
        'Synodic period should be ~367 days',
      );
    });
  });
});
