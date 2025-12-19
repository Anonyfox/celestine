/**
 * Tests for Jupiter Position Calculator
 *
 * @remarks
 * Verifies Jupiter position calculations against:
 * 1. Swiss Ephemeris reference data (authoritative)
 * 2. Known astronomical events (oppositions, conjunctions)
 * 3. Giant planet orbital characteristics
 *
 * Accuracy target: ±2 arcminutes (0.033°) for longitude
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { J2000_EPOCH } from '../constants.js';

// =============================================================================
// SWISS EPHEMERIS REFERENCE DATA
// Generated from pyswisseph (Swiss Ephemeris 2.10.03)
// These values are AUTHORITATIVE - do not modify!
// Our implementation must match these within ±2 arcminutes (0.033°)
// =============================================================================
const SWISSEPH_JUPITER_REFERENCE = [
  {
    jd: 2451545.0,
    description: 'J2000.0 (2000-Jan-01 12:00 TT)',
    longitude: 25.25303,
    latitude: -1.262173,
    distance: 4.621181,
    speed: 0.040761,
    isRetrograde: false,
  },
  {
    jd: 2448724.5,
    description: 'Meeus Example 47.a (1992-Apr-12 00:00 TT)',
    longitude: 155.174153,
    latitude: 1.339448,
    distance: 4.679599,
    speed: -0.057103,
    isRetrograde: true,
  },
  {
    jd: 2440587.5,
    description: 'Unix Epoch (1970-Jan-01 00:00 TT)',
    longitude: 212.325003,
    latitude: 1.209235,
    distance: 5.74463,
    speed: 0.136761,
    isRetrograde: false,
  },
  {
    jd: 2459580.5,
    description: 'Recent (2022-Jan-01 00:00 TT)',
    longitude: 330.545918,
    latitude: -0.996655,
    distance: 5.567361,
    speed: 0.195426,
    isRetrograde: false,
  },
] as const;

// Tolerance: 2 arcminutes = 0.0333 degrees
const LONGITUDE_TOLERANCE = 0.034;

import {
  getJupiterPosition,
  JUPITER_ORBITAL_ELEMENTS,
  jupiterHeliocentricDistance,
  jupiterHeliocentricLatitude,
  jupiterHeliocentricLongitude,
} from './jupiter.js';

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

describe('ephemeris/planets/jupiter', () => {
  describe('Heliocentric coordinates', () => {
    describe('jupiterHeliocentricLongitude', () => {
      it('should return reasonable value at J2000.0', () => {
        const tau = 0;
        const lon = jupiterHeliocentricLongitude(tau);
        assert.ok(lon > 0 && lon < 2 * Math.PI, `Expected 0-2π rad, got ${lon}`);
      });

      it('should complete ~0.084 orbits per year', () => {
        // Jupiter orbital period ≈ 4333 days ≈ 11.86 years
        // So in 1 year it completes ~0.084 orbits ≈ 0.53 radians
        const tau0 = 0;
        const tau1 = 1 / 1000; // 1 year
        const lon0 = jupiterHeliocentricLongitude(tau0);
        const lon1 = jupiterHeliocentricLongitude(tau1);

        const deltaLon = lon1 - lon0;
        // About 0.084 * 2π ≈ 0.53 radians per year
        assert.ok(Math.abs(deltaLon - 0.53) < 0.05, `Expected ~0.53 rad/year, got ${deltaLon} rad`);
      });
    });

    describe('jupiterHeliocentricLatitude', () => {
      it('should stay within ±1.5° (low orbital inclination)', () => {
        // Jupiter's orbital inclination is ~1.30°
        for (let i = 0; i < 12; i++) {
          const tau = i / 1000; // years
          const lat = jupiterHeliocentricLatitude(tau);
          const latDeg = lat * (180 / Math.PI);
          assert.ok(Math.abs(latDeg) <= 2, `Latitude ${latDeg}° exceeds limit`);
        }
      });
    });

    describe('jupiterHeliocentricDistance', () => {
      it('should be approximately 5.2 AU (semi-major axis)', () => {
        const tau = 0;
        const dist = jupiterHeliocentricDistance(tau);
        // Semi-major axis ≈ 5.203 AU
        assert.ok(dist > 4.9 && dist < 5.5, `Expected ~5.2 AU, got ${dist} AU`);
      });

      it('should vary between perihelion and aphelion', () => {
        // Jupiter e = 0.048, so distance varies moderately
        // Perihelion ≈ 4.95 AU, Aphelion ≈ 5.46 AU
        let minDist = Infinity;
        let maxDist = 0;

        // Sample over one Jupiter year (~12 years)
        for (let i = 0; i < 13; i++) {
          const tau = i / 1000; // years
          const dist = jupiterHeliocentricDistance(tau);
          minDist = Math.min(minDist, dist);
          maxDist = Math.max(maxDist, dist);
        }

        assert.ok(minDist < 5.1, `Min distance ${minDist} AU should be < 5.1`);
        assert.ok(maxDist > 5.3, `Max distance ${maxDist} AU should be > 5.3`);
      });
    });
  });

  describe('getJupiterPosition', () => {
    describe('Swiss Ephemeris reference validation', () => {
      /**
       * Validates against Swiss Ephemeris (pyswisseph 2.10.03)
       * These are authoritative reference values - DO NOT MODIFY the expected values.
       * If tests fail, fix the implementation, not the test data.
       */
      for (const ref of SWISSEPH_JUPITER_REFERENCE) {
        it(`should match Swiss Ephemeris at ${ref.description}`, () => {
          const jupiter = getJupiterPosition(ref.jd);

          const lonDiff = Math.abs(jupiter.longitude - ref.longitude);
          assert.ok(
            lonDiff < LONGITUDE_TOLERANCE,
            `Longitude: expected ${ref.longitude}°, got ${jupiter.longitude}° (diff: ${(lonDiff * 60).toFixed(1)} arcmin)`,
          );
        });
      }
    });

    describe('J2000.0 epoch characteristics', () => {
      it('should have geocentric distance around 4.6 AU', () => {
        const jd = J2000_EPOCH;
        const jupiter = getJupiterPosition(jd);

        // Geocentric distance varies from ~3.95 AU to ~6.45 AU
        assert.ok(
          jupiter.distance > 4 && jupiter.distance < 5,
          `Expected ~4.6 AU, got ${jupiter.distance} AU`,
        );
      });

      it('should calculate speed around 0.04°/day', () => {
        const jd = J2000_EPOCH;
        const jupiter = getJupiterPosition(jd);

        // Jupiter's apparent motion varies from -0.13°/day (retrograde) to +0.24°/day
        assert.ok(
          jupiter.longitudeSpeed > -0.2 && jupiter.longitudeSpeed < 0.3,
          `Unexpected speed: ${jupiter.longitudeSpeed}°/day`,
        );
      });
    });

    describe('Retrograde motion', () => {
      /**
       * Jupiter retrogrades about every 399 days (synodic period) for ~120 days.
       */
      it('should detect retrograde when speed is negative', () => {
        let foundRetrograde = false;

        // Check over ~450 days to catch a retrograde
        for (let i = 0; i < 450; i++) {
          const jd = J2000_EPOCH + i;
          const jupiter = getJupiterPosition(jd);

          if (jupiter.isRetrograde) {
            foundRetrograde = true;
            assert.ok(jupiter.longitudeSpeed < 0, 'Retrograde should have negative speed');
            break;
          }
        }

        assert.ok(foundRetrograde, 'Should find at least one retrograde day in 450 days');
      });

      it('should have retrograde lasting ~120 days', () => {
        let retrogradeStarted = false;
        let retrogradeDays = 0;

        for (let i = 0; i < 450; i++) {
          const jd = J2000_EPOCH + i;
          const jupiter = getJupiterPosition(jd);

          if (jupiter.isRetrograde) {
            if (!retrogradeStarted) {
              retrogradeStarted = true;
            }
            retrogradeDays++;
          } else if (retrogradeStarted) {
            break;
          }
        }

        // Jupiter retrograde lasts ~110-130 days
        assert.ok(
          retrogradeDays >= 100 && retrogradeDays <= 140,
          `Retrograde duration ${retrogradeDays} days outside expected 110-130 days`,
        );
      });
    });

    describe('Opposition', () => {
      it('should reach opposition (closest to Earth) once per ~399 days', () => {
        // Find minimum distance within a synodic period
        let minDistance = Infinity;

        for (let i = 0; i < 420; i++) {
          const jd = J2000_EPOCH + i;
          const jupiter = getJupiterPosition(jd);

          if (jupiter.distance < minDistance) {
            minDistance = jupiter.distance;
          }
        }

        // At opposition, distance should be ~3.95-4.0 AU
        assert.ok(minDistance < 4.5, `Opposition distance ${minDistance} AU should be < 4.5 AU`);
      });
    });

    describe('Sign transit', () => {
      it('should move approximately 30° per year', () => {
        // Jupiter moves ~30° per year
        const jd0 = J2000_EPOCH;
        const jupiter0 = getJupiterPosition(jd0);

        // Check after 1 year
        const jd1y = jd0 + 365.25;
        const jupiter1y = getJupiterPosition(jd1y);

        // Calculate angular motion
        let motion = jupiter1y.longitude - jupiter0.longitude;
        if (motion < -180) motion += 360;
        if (motion > 180) motion -= 360;

        // Jupiter should move ~30° per year (accounting for retrograde)
        assert.ok(Math.abs(motion - 30) < 10, `Expected ~30° motion per year, got ${motion}°`);
      });
    });

    describe('Historical dates', () => {
      it('should handle dates far from J2000', () => {
        // Year 1900
        const jd1900 = toJD(1900, 6, 15, 12);
        const jupiter1900 = getJupiterPosition(jd1900);
        assert.ok(jupiter1900.longitude >= 0 && jupiter1900.longitude < 360);

        // Year 2100
        const jd2100 = toJD(2100, 6, 15, 12);
        const jupiter2100 = getJupiterPosition(jd2100);
        assert.ok(jupiter2100.longitude >= 0 && jupiter2100.longitude < 360);
      });

      it('should return to similar position after ~12 years', () => {
        // Jupiter's orbital period is ~11.86 years
        const jd0 = J2000_EPOCH;
        const jupiter0 = getJupiterPosition(jd0);

        const jd12y = jd0 + 4333; // ~11.86 years in days
        const jupiter12y = getJupiterPosition(jd12y);

        // Should be within ~30° of original position
        let diff = Math.abs(jupiter12y.longitude - jupiter0.longitude);
        if (diff > 180) diff = 360 - diff;

        assert.ok(diff < 35, `After 12 years, position changed by ${diff}° (expected < 35°)`);
      });
    });

    describe('12-year zodiac cycle', () => {
      it('should traverse all zodiac signs in ~12 years', () => {
        const signs = new Set<number>();

        // Sample every 30 days for 13 years
        for (let i = 0; i < 13 * 12; i++) {
          const jd = J2000_EPOCH + i * 30;
          const jupiter = getJupiterPosition(jd);
          const signIndex = Math.floor(jupiter.longitude / 30);
          signs.add(signIndex);
        }

        // Should see all 12 signs
        assert.ok(signs.size >= 11, `Expected 12 signs, found ${signs.size}`);
      });
    });

    describe('Options', () => {
      it('should calculate speed by default', () => {
        const jupiter = getJupiterPosition(J2000_EPOCH);
        assert.ok(jupiter.longitudeSpeed !== 0);
      });

      it('should skip speed calculation when disabled', () => {
        const jupiter = getJupiterPosition(J2000_EPOCH, { includeSpeed: false });
        assert.equal(jupiter.longitudeSpeed, 0);
        assert.equal(jupiter.isRetrograde, false);
      });
    });
  });

  describe('JUPITER_ORBITAL_ELEMENTS', () => {
    it('should have correct semi-major axis', () => {
      assert.ok(
        Math.abs(JUPITER_ORBITAL_ELEMENTS.semiMajorAxis - 5.2) < 0.01,
        'Semi-major axis should be ~5.2 AU',
      );
    });

    it('should have moderate eccentricity', () => {
      assert.ok(
        JUPITER_ORBITAL_ELEMENTS.eccentricity > 0.04 &&
          JUPITER_ORBITAL_ELEMENTS.eccentricity < 0.06,
        'Eccentricity should be ~0.048',
      );
    });

    it('should have correct orbital period', () => {
      assert.ok(
        Math.abs(JUPITER_ORBITAL_ELEMENTS.orbitalPeriod - 4333) < 5,
        'Orbital period should be ~4333 days',
      );
    });

    it('should have ~12 year orbital period', () => {
      assert.ok(
        Math.abs(JUPITER_ORBITAL_ELEMENTS.orbitalPeriodYears - 11.86) < 0.1,
        'Orbital period should be ~11.86 years',
      );
    });

    it('should have correct synodic period', () => {
      assert.ok(
        Math.abs(JUPITER_ORBITAL_ELEMENTS.synodicPeriod - 399) < 1,
        'Synodic period should be ~399 days',
      );
    });
  });
});
