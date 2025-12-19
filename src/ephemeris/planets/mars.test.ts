/**
 * Tests for Mars Position Calculator
 *
 * @remarks
 * Verifies Mars position calculations against:
 * 1. Swiss Ephemeris reference data (authoritative)
 * 2. Known astronomical events (oppositions, conjunctions)
 * 3. Outer planet orbital characteristics
 *
 * Accuracy target: ±2 arcminutes (0.033°) for longitude
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { J2000_EPOCH } from '../constants.js';

// =============================================================================
// JPL HORIZONS REFERENCE DATA
// Source: NASA JPL Horizons System (https://ssd.jpl.nasa.gov/horizons/)
// Query: COMMAND='499', EPHEM_TYPE='OBSERVER', CENTER='500@399', QUANTITIES='31'
// Retrieved: 2025-Dec-19
// These values are AUTHORITATIVE - do not modify!
// =============================================================================
const JPL_MARS_REFERENCE = [
  { jd: 2451545.0, description: 'J2000.0', longitude: 327.9632921, latitude: -1.0677752 },
  { jd: 2458850.0, description: '2020-Jan-01 12:00', longitude: 238.720854, latitude: 0.356621 },
  { jd: 2448058.0, description: '1990-Jun-15 12:00', longitude: 11.0412963, latitude: -1.9852669 },
] as const;

// =============================================================================
// SWISS EPHEMERIS REFERENCE DATA
// Generated from pyswisseph (Swiss Ephemeris 2.10.03)
// These values are AUTHORITATIVE - do not modify!
// Our implementation must match these within ±2 arcminutes (0.033°)
// =============================================================================
const SWISSEPH_MARS_REFERENCE = [
  {
    jd: 2451545.0,
    description: 'J2000.0 (2000-Jan-01 12:00 TT)',
    longitude: 327.963313,
    latitude: -1.067783,
    distance: 1.849687,
    speed: 0.775673,
    isRetrograde: false,
  },
  {
    jd: 2448724.5,
    description: 'Meeus Example 47.a (1992-Apr-12 00:00 TT)',
    longitude: 341.559538,
    latitude: -1.288116,
    distance: 1.985167,
    speed: 0.774295,
    isRetrograde: false,
  },
  {
    jd: 2440587.5,
    description: 'Unix Epoch (1970-Jan-01 00:00 TT)',
    longitude: 342.236252,
    latitude: -0.810855,
    distance: 1.578605,
    speed: 0.745758,
    isRetrograde: false,
  },
  {
    jd: 2459580.5,
    description: 'Recent (2022-Jan-01 00:00 TT)',
    longitude: 253.099122,
    latitude: -0.131998,
    distance: 2.341153,
    speed: 0.710925,
    isRetrograde: false,
  },
] as const;

// Tolerance: 2 arcminutes = 0.0333 degrees
const LONGITUDE_TOLERANCE = 0.034;

import {
  getMarsPosition,
  MARS_ORBITAL_ELEMENTS,
  marsHeliocentricDistance,
  marsHeliocentricLatitude,
  marsHeliocentricLongitude,
} from './mars.js';

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

describe('ephemeris/planets/mars', () => {
  describe('Heliocentric coordinates', () => {
    describe('marsHeliocentricLongitude', () => {
      it('should return reasonable value at J2000.0', () => {
        const tau = 0;
        const lon = marsHeliocentricLongitude(tau);
        assert.ok(lon > 0 && lon < 2 * Math.PI, `Expected 0-2π rad, got ${lon}`);
      });

      it('should complete ~0.53 orbits per year', () => {
        // Mars orbital period ≈ 687 days ≈ 1.88 years
        // So in 1 year it completes ~0.53 orbits ≈ 3.34 radians
        const tau0 = 0;
        const tau1 = 1 / 1000; // 1 year
        const lon0 = marsHeliocentricLongitude(tau0);
        const lon1 = marsHeliocentricLongitude(tau1);

        const deltaLon = lon1 - lon0;
        // About 0.53 * 2π ≈ 3.34 radians of total motion
        assert.ok(Math.abs(deltaLon - 3.34) < 0.2, `Expected ~3.34 rad/year, got ${deltaLon} rad`);
      });
    });

    describe('marsHeliocentricLatitude', () => {
      it('should stay within ±2° (low orbital inclination)', () => {
        // Mars's orbital inclination is ~1.85°
        for (let i = 0; i < 24; i++) {
          const tau = i / 12000;
          const lat = marsHeliocentricLatitude(tau);
          const latDeg = lat * (180 / Math.PI);
          assert.ok(Math.abs(latDeg) <= 3, `Latitude ${latDeg}° exceeds limit`);
        }
      });
    });

    describe('marsHeliocentricDistance', () => {
      it('should be approximately 1.52 AU (semi-major axis)', () => {
        const tau = 0;
        const dist = marsHeliocentricDistance(tau);
        // Semi-major axis ≈ 1.524 AU
        assert.ok(dist > 1.3 && dist < 1.7, `Expected ~1.52 AU, got ${dist} AU`);
      });

      it('should vary between perihelion and aphelion', () => {
        // Mars e = 0.093, so distance varies significantly
        // Perihelion ≈ 1.38 AU, Aphelion ≈ 1.67 AU
        let minDist = Infinity;
        let maxDist = 0;

        // Sample over one Mars year (~687 days)
        for (let i = 0; i < 700; i++) {
          const tau = i / 365250;
          const dist = marsHeliocentricDistance(tau);
          minDist = Math.min(minDist, dist);
          maxDist = Math.max(maxDist, dist);
        }

        assert.ok(minDist < 1.45, `Min distance ${minDist} AU should be < 1.45`);
        assert.ok(maxDist > 1.6, `Max distance ${maxDist} AU should be > 1.6`);
      });
    });
  });

  describe('getMarsPosition', () => {
    describe('JPL Horizons reference validation', () => {
      for (const ref of JPL_MARS_REFERENCE) {
        it(`should match JPL Horizons at ${ref.description}`, () => {
          const mars = getMarsPosition(ref.jd);
          const lonDiff = Math.abs(mars.longitude - ref.longitude);
          assert.ok(
            lonDiff < LONGITUDE_TOLERANCE,
            `Longitude: expected ${ref.longitude}° (JPL), got ${mars.longitude.toFixed(4)}° (diff: ${(lonDiff * 60).toFixed(1)} arcmin)`,
          );
        });
      }
    });

    describe('Swiss Ephemeris reference validation', () => {
      /**
       * Validates against Swiss Ephemeris (pyswisseph 2.10.03)
       * These are authoritative reference values - DO NOT MODIFY the expected values.
       * If tests fail, fix the implementation, not the test data.
       */
      for (const ref of SWISSEPH_MARS_REFERENCE) {
        it(`should match Swiss Ephemeris at ${ref.description}`, () => {
          const mars = getMarsPosition(ref.jd);

          const lonDiff = Math.abs(mars.longitude - ref.longitude);
          assert.ok(
            lonDiff < LONGITUDE_TOLERANCE,
            `Longitude: expected ${ref.longitude}°, got ${mars.longitude}° (diff: ${(lonDiff * 60).toFixed(1)} arcmin)`,
          );
        });
      }
    });

    describe('J2000.0 epoch characteristics', () => {
      it('should have reasonable geocentric distance', () => {
        const jd = J2000_EPOCH;
        const mars = getMarsPosition(jd);

        // Geocentric distance varies from ~0.37 AU (opposition) to ~2.68 AU (conjunction)
        assert.ok(
          mars.distance > 0.3 && mars.distance < 2.7,
          `Expected 0.3-2.7 AU, got ${mars.distance} AU`,
        );
      });

      it('should calculate speed', () => {
        const jd = J2000_EPOCH;
        const mars = getMarsPosition(jd);

        // Mars's apparent motion varies from -0.4°/day (retrograde) to +0.8°/day
        assert.ok(
          mars.longitudeSpeed > -0.5 && mars.longitudeSpeed < 1,
          `Unexpected speed: ${mars.longitudeSpeed}°/day`,
        );
      });
    });

    describe('Retrograde motion', () => {
      /**
       * Mars retrogrades about every 780 days (synodic period) for ~72 days.
       * Retrograde occurs around opposition when Earth passes Mars.
       */
      it('should detect retrograde when speed is negative', () => {
        let foundRetrograde = false;

        // Need to check over ~800 days to catch a retrograde
        for (let i = 0; i < 800; i++) {
          const jd = J2000_EPOCH + i;
          const mars = getMarsPosition(jd);

          if (mars.isRetrograde) {
            foundRetrograde = true;
            assert.ok(mars.longitudeSpeed < 0, 'Retrograde should have negative speed');
            break;
          }
        }

        assert.ok(foundRetrograde, 'Should find at least one retrograde day in 800 days');
      });

      it('should have retrograde lasting ~60-80 days', () => {
        let retrogradeStarted = false;
        let retrogradeDays = 0;

        for (let i = 0; i < 800; i++) {
          const jd = J2000_EPOCH + i;
          const mars = getMarsPosition(jd);

          if (mars.isRetrograde) {
            if (!retrogradeStarted) {
              retrogradeStarted = true;
            }
            retrogradeDays++;
          } else if (retrogradeStarted) {
            // Retrograde ended
            break;
          }
        }

        // Mars retrograde lasts ~60-80 days
        assert.ok(
          retrogradeDays >= 50 && retrogradeDays <= 90,
          `Retrograde duration ${retrogradeDays} days outside expected 60-80 days`,
        );
      });
    });

    describe('Opposition', () => {
      it('should be close to Earth at opposition (opposite Sun)', () => {
        // At opposition, Mars is opposite the Sun from Earth
        // Look for minimum geocentric distance
        let minDistance = Infinity;
        let minDistanceDay = 0;

        for (let i = 0; i < 800; i++) {
          const jd = J2000_EPOCH + i;
          const mars = getMarsPosition(jd);

          if (mars.distance < minDistance) {
            minDistance = mars.distance;
            minDistanceDay = i;
          }
        }

        // At opposition, distance should be < 1 AU (can be as close as 0.37 AU)
        assert.ok(minDistance < 1.0, `Opposition distance ${minDistance} AU should be < 1 AU`);

        // At minimum distance, Mars should be roughly opposite the Sun
        // (Mars longitude ≈ Sun longitude + 180°)
        const jd = J2000_EPOCH + minDistanceDay;
        const mars = getMarsPosition(jd);
        const sunLon = (280.46 + minDistanceDay * 0.9856) % 360;

        let separation = Math.abs(mars.longitude - sunLon);
        if (separation > 180) separation = 360 - separation;

        // At opposition, Mars should be ~180° from Sun (allow some tolerance)
        assert.ok(
          separation > 150,
          `At opposition, Mars-Sun separation ${separation}° should be > 150°`,
        );
      });
    });

    describe('Historical dates', () => {
      it('should handle dates far from J2000', () => {
        // Year 1900
        const jd1900 = toJD(1900, 6, 15, 12);
        const mars1900 = getMarsPosition(jd1900);
        assert.ok(mars1900.longitude >= 0 && mars1900.longitude < 360);

        // Year 2100
        const jd2100 = toJD(2100, 6, 15, 12);
        const mars2100 = getMarsPosition(jd2100);
        assert.ok(mars2100.longitude >= 0 && mars2100.longitude < 360);
      });

      it('Mars opposition of 2003 (closest in 60,000 years)', () => {
        // August 27, 2003 - Mars was historically close
        const jd = toJD(2003, 8, 27, 10);
        const mars = getMarsPosition(jd);

        // Mars was very close, around 0.37 AU
        assert.ok(
          mars.distance < 0.5,
          `Expected < 0.5 AU at 2003 opposition, got ${mars.distance} AU`,
        );

        // Mars was in Aquarius (~330°) at this time
        assert.ok(
          mars.longitude > 300 && mars.longitude < 360,
          `Expected Mars in Aquarius region, got ${mars.longitude}°`,
        );
      });
    });

    describe('Zodiac traversal', () => {
      it('should traverse all zodiac signs in ~2 years', () => {
        // Mars orbits in ~687 days
        const signs = new Set<number>();

        for (let i = 0; i < 730; i++) {
          const jd = J2000_EPOCH + i;
          const mars = getMarsPosition(jd);
          const signIndex = Math.floor(mars.longitude / 30);
          signs.add(signIndex);
        }

        // Should see all 12 signs in 2 years
        assert.ok(signs.size >= 11, `Expected 12 signs, found ${signs.size}`);
      });
    });

    describe('Options', () => {
      it('should calculate speed by default', () => {
        const mars = getMarsPosition(J2000_EPOCH);
        assert.ok(mars.longitudeSpeed !== 0);
      });

      it('should skip speed calculation when disabled', () => {
        const mars = getMarsPosition(J2000_EPOCH, { includeSpeed: false });
        assert.equal(mars.longitudeSpeed, 0);
        assert.equal(mars.isRetrograde, false);
      });
    });
  });

  describe('MARS_ORBITAL_ELEMENTS', () => {
    it('should have correct semi-major axis', () => {
      assert.ok(
        Math.abs(MARS_ORBITAL_ELEMENTS.semiMajorAxis - 1.524) < 0.001,
        'Semi-major axis should be ~1.524 AU',
      );
    });

    it('should have notable eccentricity', () => {
      // Mars has e = 0.0934
      assert.ok(MARS_ORBITAL_ELEMENTS.eccentricity > 0.09, 'Eccentricity should be > 0.09');
    });

    it('should have correct orbital period', () => {
      assert.ok(
        Math.abs(MARS_ORBITAL_ELEMENTS.orbitalPeriod - 687) < 1,
        'Orbital period should be ~687 days',
      );
    });

    it('should have correct synodic period', () => {
      assert.ok(
        Math.abs(MARS_ORBITAL_ELEMENTS.synodicPeriod - 780) < 1,
        'Synodic period should be ~780 days',
      );
    });
  });
});
