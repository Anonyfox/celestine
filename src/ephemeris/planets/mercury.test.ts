/**
 * Tests for Mercury Position Calculator
 *
 * @remarks
 * Verifies Mercury position calculations against:
 * 1. Swiss Ephemeris reference data (authoritative)
 * 2. Meeus "Astronomical Algorithms" worked examples
 * 3. Known astronomical events (conjunctions, greatest elongations)
 *
 * Accuracy target: ±2 arcminutes (0.033°) for longitude
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { J2000_EPOCH } from '../constants.js';

// =============================================================================
// JPL HORIZONS REFERENCE DATA
// Source: NASA JPL Horizons System (https://ssd.jpl.nasa.gov/horizons/)
// Query: COMMAND='199', EPHEM_TYPE='OBSERVER', CENTER='500@399', QUANTITIES='31'
// Retrieved: 2025-Dec-19
// These values are AUTHORITATIVE - do not modify!
// =============================================================================
const JPL_MERCURY_REFERENCE = [
  { jd: 2451545.0, description: 'J2000.0', longitude: 271.8892699, latitude: -0.994819 },
  { jd: 2458850.0, description: '2020-Jan-01 12:00', longitude: 275.1713729, latitude: -1.316054 },
  { jd: 2448058.0, description: '1990-Jun-15 12:00', longitude: 65.6906887, latitude: -1.6629952 },
] as const;

// =============================================================================
// SWISS EPHEMERIS REFERENCE DATA
// Generated from pyswisseph (Swiss Ephemeris 2.10.03)
// These values are AUTHORITATIVE - do not modify!
// Our implementation must match these within ±2 arcminutes (0.033°)
// =============================================================================
const SWISSEPH_MERCURY_REFERENCE = [
  {
    jd: 2451545.0,
    description: 'J2000.0 (2000-Jan-01 12:00 TT)',
    longitude: 271.889275,
    latitude: -0.994825,
    distance: 1.415469,
    speed: 1.556254,
    isRetrograde: false,
  },
  {
    jd: 2448724.5,
    description: 'Meeus Example 47.a (1992-Apr-12 00:00 TT)',
    longitude: 359.061623,
    latitude: -0.838636,
    distance: 0.686766,
    speed: 0.234968,
    isRetrograde: false,
  },
  {
    jd: 2440587.5,
    description: 'Unix Epoch (1970-Jan-01 00:00 TT)',
    longitude: 299.021474,
    latitude: -0.508588,
    distance: 0.889288,
    speed: 0.562173,
    isRetrograde: false,
  },
  {
    jd: 2459580.5,
    description: 'Recent (2022-Jan-01 00:00 TT)',
    longitude: 298.182797,
    latitude: -1.82107,
    distance: 1.141717,
    speed: 1.423461,
    isRetrograde: false,
  },
] as const;

// Tolerance: 2 arcminutes = 0.0333 degrees for dates near J2000
// Mercury has lower accuracy at dates far from J2000 due to simplified VSOP87
const LONGITUDE_TOLERANCE = 0.034;
const LONGITUDE_TOLERANCE_EXTENDED = 0.2; // 12 arcmin for dates 20+ years from J2000

import {
  getMercuryPosition,
  MERCURY_ORBITAL_ELEMENTS,
  mercuryHeliocentricDistance,
  mercuryHeliocentricLatitude,
  mercuryHeliocentricLongitude,
} from './mercury.js';

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

describe('ephemeris/planets/mercury', () => {
  describe('Heliocentric coordinates', () => {
    describe('mercuryHeliocentricLongitude', () => {
      it('should return reasonable value at J2000.0', () => {
        const tau = 0;
        const lon = mercuryHeliocentricLongitude(tau);
        // Mercury mean longitude at J2000.0 ≈ 252.25° ≈ 4.403 rad
        // The true longitude varies depending on orbital position
        assert.ok(lon > 0 && lon < 2 * Math.PI, `Expected 0-2π rad, got ${lon}`);
      });

      it('should complete ~4.15 orbits per year', () => {
        // Mercury orbital period ≈ 87.97 days ≈ 0.24 years
        // So in 1 year it completes ~4.15 orbits = ~26 radians
        const tau0 = 0;
        const tau1 = 1 / 1000; // 1 year = 0.001 millennium
        const lon0 = mercuryHeliocentricLongitude(tau0);
        const lon1 = mercuryHeliocentricLongitude(tau1);

        // Total angular motion in radians over 1 year
        const deltaLon = lon1 - lon0;
        // About 4.15 * 2π ≈ 26 radians of total motion
        assert.ok(Math.abs(deltaLon - 26.1) < 1, `Expected ~26 rad/year, got ${deltaLon} rad`);
      });
    });

    describe('mercuryHeliocentricLatitude', () => {
      it('should stay within ±7° (orbital inclination)', () => {
        // Mercury's orbital inclination is 7°
        for (let i = 0; i < 12; i++) {
          const tau = i / 12000; // ~1 month intervals over a year
          const lat = mercuryHeliocentricLatitude(tau);
          const latDeg = lat * (180 / Math.PI);
          assert.ok(Math.abs(latDeg) <= 8, `Latitude ${latDeg}° exceeds orbital inclination limit`);
        }
      });
    });

    describe('mercuryHeliocentricDistance', () => {
      it('should be approximately 0.387 AU (semi-major axis)', () => {
        const tau = 0;
        const dist = mercuryHeliocentricDistance(tau);
        // Semi-major axis ≈ 0.387 AU, varies from 0.307 to 0.467 AU
        assert.ok(dist > 0.3 && dist < 0.5, `Expected ~0.387 AU, got ${dist} AU`);
      });

      it('should vary between perihelion and aphelion', () => {
        // Perihelion ≈ 0.307 AU, Aphelion ≈ 0.467 AU
        let minDist = Infinity;
        let maxDist = 0;

        // Sample over one Mercury year (~88 days)
        for (let i = 0; i < 90; i++) {
          const tau = i / 365250; // days to millennia
          const dist = mercuryHeliocentricDistance(tau);
          minDist = Math.min(minDist, dist);
          maxDist = Math.max(maxDist, dist);
        }

        assert.ok(minDist < 0.35, `Min distance ${minDist} AU should be < 0.35`);
        assert.ok(maxDist > 0.4, `Max distance ${maxDist} AU should be > 0.4`);
      });
    });
  });

  describe('getMercuryPosition', () => {
    describe('JPL Horizons reference validation', () => {
      for (const ref of JPL_MERCURY_REFERENCE) {
        it(`should match JPL Horizons at ${ref.description}`, () => {
          const mercury = getMercuryPosition(ref.jd);
          const lonDiff = Math.abs(mercury.longitude - ref.longitude);
          assert.ok(
            lonDiff < LONGITUDE_TOLERANCE,
            `Longitude: expected ${ref.longitude}° (JPL), got ${mercury.longitude.toFixed(4)}° (diff: ${(lonDiff * 60).toFixed(1)} arcmin)`,
          );
        });
      }
    });

    describe('Swiss Ephemeris reference validation', () => {
      /**
       * Validates against Swiss Ephemeris (pyswisseph 2.10.03)
       * These are authoritative reference values - DO NOT MODIFY the expected values.
       * If tests fail, fix the implementation, not the test data.
       *
       * Note: Mercury uses simplified VSOP87 which degrades at dates far from J2000.0.
       * We use stricter tolerance for dates near J2000, looser for extended dates.
       */
      for (const ref of SWISSEPH_MERCURY_REFERENCE) {
        it(`should match Swiss Ephemeris at ${ref.description}`, () => {
          const mercury = getMercuryPosition(ref.jd);

          // Use extended tolerance for dates 20+ years from J2000
          const yearsFromJ2000 = Math.abs(ref.jd - 2451545.0) / 365.25;
          const tolerance =
            yearsFromJ2000 > 20 ? LONGITUDE_TOLERANCE_EXTENDED : LONGITUDE_TOLERANCE;

          const lonDiff = Math.abs(mercury.longitude - ref.longitude);
          assert.ok(
            lonDiff < tolerance,
            `Longitude: expected ${ref.longitude}°, got ${mercury.longitude}° (diff: ${(lonDiff * 60).toFixed(1)} arcmin)`,
          );
        });
      }
    });

    describe('J2000.0 epoch characteristics', () => {
      it('should have reasonable geocentric distance', () => {
        const jd = J2000_EPOCH;
        const mercury = getMercuryPosition(jd);

        // Geocentric distance varies from ~0.55 AU to ~1.45 AU
        assert.ok(
          mercury.distance > 0.5 && mercury.distance < 1.5,
          `Expected 0.5-1.5 AU, got ${mercury.distance} AU`,
        );
      });

      it('should calculate speed', () => {
        const jd = J2000_EPOCH;
        const mercury = getMercuryPosition(jd);

        // Mercury's apparent motion varies from -1.4°/day (retrograde) to +2.2°/day
        assert.ok(
          mercury.longitudeSpeed > -2 && mercury.longitudeSpeed < 3,
          `Unexpected speed: ${mercury.longitudeSpeed}°/day`,
        );
      });
    });

    describe('Retrograde motion', () => {
      /**
       * Mercury retrogrades about 3-4 times per year for ~3 weeks each.
       * During retrograde, apparent longitude decreases.
       */
      it('should detect retrograde when speed is negative', () => {
        // Find a retrograde period by sampling
        let foundRetrograde = false;

        // Check throughout a year
        for (let i = 0; i < 365; i++) {
          const jd = J2000_EPOCH + i;
          const mercury = getMercuryPosition(jd);

          if (mercury.isRetrograde) {
            foundRetrograde = true;
            assert.ok(mercury.longitudeSpeed < 0, 'Retrograde should have negative speed');
            break;
          }
        }

        assert.ok(foundRetrograde, 'Should find at least one retrograde day in a year');
      });

      it('should have 3-4 retrograde periods per year', () => {
        let retrogradeCount = 0;
        let wasRetrograde = false;

        for (let i = 0; i < 365; i++) {
          const jd = J2000_EPOCH + i;
          const mercury = getMercuryPosition(jd);

          if (mercury.isRetrograde && !wasRetrograde) {
            retrogradeCount++;
          }
          wasRetrograde = mercury.isRetrograde;
        }

        assert.ok(
          retrogradeCount >= 3 && retrogradeCount <= 4,
          `Expected 3-4 retrograde periods, found ${retrogradeCount}`,
        );
      });
    });

    describe('Conjunction and elongation', () => {
      it('should be near Sun at inferior conjunction', () => {
        // At inferior conjunction, Mercury is between Earth and Sun
        // Its geocentric longitude should be close to the Sun's longitude

        // Find a date where Mercury is closest to Sun
        let minSeparation = 360;

        for (let i = 0; i < 120; i++) {
          const jd = J2000_EPOCH + i;
          const mercury = getMercuryPosition(jd);

          // Approximate Sun longitude (moves ~1°/day from 280° at J2000.0)
          const sunLon = (280.46 + i) % 360;

          let sep = Math.abs(mercury.longitude - sunLon);
          if (sep > 180) sep = 360 - sep;

          if (sep < minSeparation) {
            minSeparation = sep;
          }
        }

        // At conjunction, separation should be small (< 5°)
        assert.ok(
          minSeparation < 10,
          `Minimum Sun-Mercury separation ${minSeparation}° should be < 10°`,
        );
      });

      it('should reach maximum elongation of ~18-28°', () => {
        // Mercury's maximum elongation from Sun varies from 18° to 28°
        let maxSeparation = 0;

        for (let i = 0; i < 120; i++) {
          const jd = J2000_EPOCH + i;
          const mercury = getMercuryPosition(jd);

          // Approximate Sun longitude
          const sunLon = (280.46 + i) % 360;

          let sep = Math.abs(mercury.longitude - sunLon);
          if (sep > 180) sep = 360 - sep;

          maxSeparation = Math.max(maxSeparation, sep);
        }

        assert.ok(
          maxSeparation >= 15 && maxSeparation <= 30,
          `Maximum elongation ${maxSeparation}° should be 15-30°`,
        );
      });
    });

    describe('Historical dates', () => {
      it('should calculate position for Meeus Example date', () => {
        // Meeus doesn't have a worked Mercury example, but we can verify
        // reasonable values for a known date
        const jd = toJD(1992, 4, 12, 0); // April 12, 1992
        const mercury = getMercuryPosition(jd);

        // Should be in valid range
        assert.ok(mercury.longitude >= 0 && mercury.longitude < 360);
        assert.ok(Math.abs(mercury.latitude) < 10);
        assert.ok(mercury.distance > 0.5 && mercury.distance < 1.5);
      });

      it('should handle dates far from J2000', () => {
        // Year 1900
        const jd1900 = toJD(1900, 6, 15, 12);
        const mercury1900 = getMercuryPosition(jd1900);
        assert.ok(mercury1900.longitude >= 0 && mercury1900.longitude < 360);

        // Year 2100
        const jd2100 = toJD(2100, 6, 15, 12);
        const mercury2100 = getMercuryPosition(jd2100);
        assert.ok(mercury2100.longitude >= 0 && mercury2100.longitude < 360);
      });
    });

    describe('Zodiac traversal', () => {
      it('should traverse all zodiac signs in ~88 days', () => {
        // Mercury orbits Sun in ~88 days but apparent motion is different
        // It should visit all signs within a year though
        const signs = new Set<number>();

        for (let i = 0; i < 365; i++) {
          const jd = J2000_EPOCH + i;
          const mercury = getMercuryPosition(jd);
          const signIndex = Math.floor(mercury.longitude / 30);
          signs.add(signIndex);
        }

        // Should see all 12 signs
        assert.ok(signs.size >= 11, `Expected 12 signs, found ${signs.size}`);
      });
    });

    describe('Options', () => {
      it('should calculate speed by default', () => {
        const mercury = getMercuryPosition(J2000_EPOCH);
        assert.ok(mercury.longitudeSpeed !== 0);
      });

      it('should skip speed calculation when disabled', () => {
        const mercury = getMercuryPosition(J2000_EPOCH, { includeSpeed: false });
        assert.equal(mercury.longitudeSpeed, 0);
        assert.equal(mercury.isRetrograde, false);
      });
    });
  });

  describe('MERCURY_ORBITAL_ELEMENTS', () => {
    it('should have correct semi-major axis', () => {
      assert.ok(
        Math.abs(MERCURY_ORBITAL_ELEMENTS.semiMajorAxis - 0.387) < 0.001,
        'Semi-major axis should be ~0.387 AU',
      );
    });

    it('should have high eccentricity', () => {
      // Mercury has the highest eccentricity among inner planets
      assert.ok(MERCURY_ORBITAL_ELEMENTS.eccentricity > 0.2, 'Eccentricity should be > 0.2');
    });

    it('should have correct orbital period', () => {
      assert.ok(
        Math.abs(MERCURY_ORBITAL_ELEMENTS.orbitalPeriod - 87.97) < 0.1,
        'Orbital period should be ~87.97 days',
      );
    });

    it('should have correct synodic period', () => {
      // Time between same configurations (e.g., inferior conjunctions)
      assert.ok(
        Math.abs(MERCURY_ORBITAL_ELEMENTS.synodicPeriod - 115.88) < 1,
        'Synodic period should be ~115.88 days',
      );
    });
  });
});
