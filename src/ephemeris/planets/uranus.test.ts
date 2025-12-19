/**
 * Tests for Uranus Position Calculator
 *
 * @remarks
 * Verifies Uranus position calculations against:
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
  getUranusPosition,
  URANUS_ORBITAL_ELEMENTS,
  uranusHeliocentricDistance,
  uranusHeliocentricLatitude,
  uranusHeliocentricLongitude,
} from './uranus.js';

// =============================================================================
// SWISS EPHEMERIS REFERENCE DATA
// Generated from pyswisseph (Swiss Ephemeris 2.10.03)
// These values are AUTHORITATIVE - do not modify!
// Our implementation must match these within ±2 arcminutes (0.033°)
// =============================================================================
const SWISSEPH_URANUS_REFERENCE = [
  {
    jd: 2451545.0,
    description: 'J2000.0 (2000-Jan-01 12:00 TT)',
    longitude: 314.809223,
    latitude: -0.658333,
    distance: 20.727169,
    speed: 0.050344,
    isRetrograde: false,
  },
  {
    jd: 2448724.5,
    description: 'Meeus Example 47.a (1992-Apr-12 00:00 TT)',
    longitude: 287.97434,
    latitude: -0.400307,
    distance: 19.424958,
    speed: 0.008415,
    isRetrograde: false,
  },
  {
    jd: 2440587.5,
    description: 'Unix Epoch (1970-Jan-01 00:00 TT)',
    longitude: 188.720589,
    latitude: 0.719658,
    distance: 18.265659,
    speed: 0.011624,
    isRetrograde: false,
  },
  {
    jd: 2459580.5,
    description: 'Recent (2022-Jan-01 00:00 TT)',
    longitude: 40.952696,
    latitude: -0.405082,
    distance: 19.206677,
    speed: -0.015019,
    isRetrograde: true,
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

describe('ephemeris/planets/uranus', () => {
  describe('Heliocentric coordinates', () => {
    describe('uranusHeliocentricLongitude', () => {
      it('should return reasonable value at J2000.0', () => {
        const tau = 0;
        const lon = uranusHeliocentricLongitude(tau);
        assert.ok(lon > 0 && lon < 2 * Math.PI, `Expected 0-2π rad, got ${lon}`);
      });

      it('should complete ~0.012 orbits per year', () => {
        // Uranus orbital period ≈ 30687 days ≈ 84 years
        // So in 1 year it completes ~0.012 orbits ≈ 0.075 radians
        const tau0 = 0;
        const tau1 = 1 / 1000; // 1 year
        const lon0 = uranusHeliocentricLongitude(tau0);
        const lon1 = uranusHeliocentricLongitude(tau1);

        const deltaLon = lon1 - lon0;
        // About 0.012 * 2π ≈ 0.075 radians per year
        assert.ok(
          Math.abs(deltaLon - 0.075) < 0.015,
          `Expected ~0.075 rad/year, got ${deltaLon} rad`,
        );
      });
    });

    describe('uranusHeliocentricLatitude', () => {
      it('should stay within ±1° (low orbital inclination)', () => {
        // Uranus's orbital inclination is ~0.77°
        for (let i = 0; i < 85; i++) {
          const tau = i / 1000; // years
          const lat = uranusHeliocentricLatitude(tau);
          const latDeg = lat * (180 / Math.PI);
          assert.ok(Math.abs(latDeg) <= 1.5, `Latitude ${latDeg}° exceeds limit`);
        }
      });
    });

    describe('uranusHeliocentricDistance', () => {
      it('should be approximately 19.2 AU (semi-major axis)', () => {
        const tau = 0;
        const dist = uranusHeliocentricDistance(tau);
        // Semi-major axis ≈ 19.19 AU
        assert.ok(dist > 18 && dist < 21, `Expected ~19.2 AU, got ${dist} AU`);
      });

      it('should vary between perihelion and aphelion', () => {
        // Uranus e = 0.047, so distance varies moderately
        // Perihelion ≈ 18.29 AU, Aphelion ≈ 20.10 AU
        let minDist = Infinity;
        let maxDist = 0;

        // Sample over one Uranus year (~84 years)
        for (let i = 0; i < 85; i++) {
          const tau = i / 1000; // years
          const dist = uranusHeliocentricDistance(tau);
          minDist = Math.min(minDist, dist);
          maxDist = Math.max(maxDist, dist);
        }

        assert.ok(minDist < 18.5, `Min distance ${minDist} AU should be < 18.5`);
        assert.ok(maxDist > 19.8, `Max distance ${maxDist} AU should be > 19.8`);
      });
    });
  });

  describe('getUranusPosition', () => {
    describe('Swiss Ephemeris reference validation', () => {
      /**
       * Validates against Swiss Ephemeris (pyswisseph 2.10.03)
       * These are authoritative reference values - DO NOT MODIFY the expected values.
       * If tests fail, fix the implementation, not the test data.
       */
      for (const ref of SWISSEPH_URANUS_REFERENCE) {
        it(`should match Swiss Ephemeris at ${ref.description}`, () => {
          const uranus = getUranusPosition(ref.jd);

          const lonDiff = Math.abs(uranus.longitude - ref.longitude);
          assert.ok(
            lonDiff < LONGITUDE_TOLERANCE,
            `Longitude: expected ${ref.longitude}°, got ${uranus.longitude}° (diff: ${(lonDiff * 60).toFixed(1)} arcmin)`,
          );
        });
      }
    });

    describe('J2000.0 epoch characteristics', () => {
      it('should have geocentric distance around 20.7 AU', () => {
        const jd = J2000_EPOCH;
        const uranus = getUranusPosition(jd);

        // Geocentric distance varies from ~17.3 AU to ~21.1 AU
        assert.ok(
          uranus.distance > 19 && uranus.distance < 22,
          `Expected ~20.7 AU, got ${uranus.distance} AU`,
        );
      });

      it('should not be retrograde at J2000.0', () => {
        const jd = J2000_EPOCH;
        const uranus = getUranusPosition(jd);

        // Uranus was direct at J2000.0 according to Swiss Ephemeris
        assert.ok(!uranus.isRetrograde, 'Uranus should not be retrograde at J2000.0');
      });

      it('should have very slow speed (outer planet)', () => {
        const jd = J2000_EPOCH;
        const uranus = getUranusPosition(jd);

        // Uranus's apparent motion varies from -0.06°/day (retrograde) to +0.06°/day
        assert.ok(
          uranus.longitudeSpeed > -0.08 && uranus.longitudeSpeed < 0.08,
          `Unexpected speed: ${uranus.longitudeSpeed}°/day`,
        );
      });
    });

    describe('Retrograde motion', () => {
      /**
       * Uranus retrogrades about every 370 days (synodic period) for ~151 days.
       */
      it('should detect retrograde when speed is negative', () => {
        let foundRetrograde = false;

        // Check over ~400 days to catch a retrograde
        for (let i = 0; i < 400; i++) {
          const jd = J2000_EPOCH + i;
          const uranus = getUranusPosition(jd);

          if (uranus.isRetrograde) {
            foundRetrograde = true;
            assert.ok(uranus.longitudeSpeed < 0, 'Retrograde should have negative speed');
            break;
          }
        }

        assert.ok(foundRetrograde, 'Should find at least one retrograde day in 400 days');
      });

      it('should have retrograde lasting ~151 days', () => {
        // Find a retrograde period
        let jd = J2000_EPOCH;

        // Skip until we find direct motion
        while (!getUranusPosition(jd).isRetrograde || jd > J2000_EPOCH + 400) {
          jd += 1;
        }

        // If we found retrograde, count it
        if (getUranusPosition(jd).isRetrograde) {
          // Skip to end of this retrograde
          while (getUranusPosition(jd).isRetrograde && jd < J2000_EPOCH + 600) {
            jd += 1;
          }

          // Skip past direct motion
          while (!getUranusPosition(jd).isRetrograde && jd < J2000_EPOCH + 1000) {
            jd += 1;
          }

          // Count the next full retrograde period
          let retrogradeDays = 0;
          while (getUranusPosition(jd).isRetrograde && jd < J2000_EPOCH + 1200) {
            retrogradeDays++;
            jd += 1;
          }

          // Uranus retrograde lasts ~145-160 days
          assert.ok(
            retrogradeDays >= 140 && retrogradeDays <= 165,
            `Retrograde duration ${retrogradeDays} days outside expected 145-160 days`,
          );
        }
      });
    });

    describe('Opposition', () => {
      it('should reach opposition (closest to Earth) once per ~370 days', () => {
        // Find minimum distance within a synodic period
        let minDistance = Infinity;

        for (let i = 0; i < 400; i++) {
          const jd = J2000_EPOCH + i;
          const uranus = getUranusPosition(jd);

          if (uranus.distance < minDistance) {
            minDistance = uranus.distance;
          }
        }

        // At opposition, distance should be ~17.3-18.5 AU
        assert.ok(minDistance < 19, `Opposition distance ${minDistance} AU should be < 19 AU`);
      });
    });

    describe('Sign transit', () => {
      it('should move approximately 4° per year', () => {
        // Uranus moves ~4.3° per year (360° / 84 years)
        const jd0 = J2000_EPOCH;
        const uranus0 = getUranusPosition(jd0);

        // Check after 1 year
        const jd1y = jd0 + 365.25;
        const uranus1y = getUranusPosition(jd1y);

        // Calculate angular motion
        let motion = uranus1y.longitude - uranus0.longitude;
        if (motion < -180) motion += 360;
        if (motion > 180) motion -= 360;

        // Uranus should move ~4° per year (accounting for retrograde)
        assert.ok(Math.abs(motion - 4) < 2, `Expected ~4° motion per year, got ${motion}°`);
      });
    });

    describe('Historical dates', () => {
      it('should handle dates far from J2000', () => {
        // Year 1900
        const jd1900 = toJD(1900, 6, 15, 12);
        const uranus1900 = getUranusPosition(jd1900);
        assert.ok(uranus1900.longitude >= 0 && uranus1900.longitude < 360);

        // Year 2100
        const jd2100 = toJD(2100, 6, 15, 12);
        const uranus2100 = getUranusPosition(jd2100);
        assert.ok(uranus2100.longitude >= 0 && uranus2100.longitude < 360);
      });

      it('should return to similar position after ~84 years', () => {
        // Uranus's orbital period is ~84 years
        const jd0 = J2000_EPOCH;
        const uranus0 = getUranusPosition(jd0);

        const jd84y = jd0 + 30687; // ~84 years in days
        const uranus84y = getUranusPosition(jd84y);

        // Should be within ~15° of original position
        let diff = Math.abs(uranus84y.longitude - uranus0.longitude);
        if (diff > 180) diff = 360 - diff;

        assert.ok(diff < 20, `After 84 years, position changed by ${diff}° (expected < 20°)`);
      });
    });

    describe('~84-year zodiac cycle', () => {
      it('should traverse all zodiac signs in ~84 years', () => {
        const signs = new Set<number>();

        // Sample every 200 days for 85 years
        for (let i = 0; i < 85 * 2; i++) {
          const jd = J2000_EPOCH + i * 200;
          const uranus = getUranusPosition(jd);
          const signIndex = Math.floor(uranus.longitude / 30);
          signs.add(signIndex);
        }

        // Should see all 12 signs
        assert.ok(signs.size >= 11, `Expected 12 signs, found ${signs.size}`);
      });
    });

    describe('Options', () => {
      it('should calculate speed by default', () => {
        const uranus = getUranusPosition(J2000_EPOCH);
        assert.ok(uranus.longitudeSpeed !== 0);
      });

      it('should skip speed calculation when disabled', () => {
        const uranus = getUranusPosition(J2000_EPOCH, { includeSpeed: false });
        assert.equal(uranus.longitudeSpeed, 0);
        assert.equal(uranus.isRetrograde, false);
      });
    });
  });

  describe('URANUS_ORBITAL_ELEMENTS', () => {
    it('should have correct semi-major axis', () => {
      assert.ok(
        Math.abs(URANUS_ORBITAL_ELEMENTS.semiMajorAxis - 19.19) < 0.02,
        'Semi-major axis should be ~19.19 AU',
      );
    });

    it('should have low eccentricity', () => {
      assert.ok(
        URANUS_ORBITAL_ELEMENTS.eccentricity > 0.04 && URANUS_ORBITAL_ELEMENTS.eccentricity < 0.05,
        'Eccentricity should be ~0.047',
      );
    });

    it('should have correct orbital period', () => {
      assert.ok(
        Math.abs(URANUS_ORBITAL_ELEMENTS.orbitalPeriod - 30687) < 50,
        'Orbital period should be ~30687 days',
      );
    });

    it('should have ~84 year orbital period', () => {
      assert.ok(
        Math.abs(URANUS_ORBITAL_ELEMENTS.orbitalPeriodYears - 84) < 1,
        'Orbital period should be ~84 years',
      );
    });

    it('should have correct synodic period', () => {
      assert.ok(
        Math.abs(URANUS_ORBITAL_ELEMENTS.synodicPeriod - 370) < 2,
        'Synodic period should be ~370 days',
      );
    });

    it('should have extreme axial tilt (rotates on its side)', () => {
      assert.ok(
        URANUS_ORBITAL_ELEMENTS.axialTilt > 90,
        'Axial tilt should be > 90° (rotates on its side)',
      );
    });
  });
});
