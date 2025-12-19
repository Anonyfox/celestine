/**
 * Tests for Venus Position Calculator
 *
 * @remarks
 * Verifies Venus position calculations against:
 * 1. Swiss Ephemeris reference data (authoritative)
 * 2. Known astronomical events (conjunctions, greatest elongations)
 * 3. Orbital characteristics unique to Venus
 *
 * Accuracy target: ±2 arcminutes (0.033°) for longitude
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { J2000_EPOCH } from '../constants.js';

// =============================================================================
// JPL HORIZONS REFERENCE DATA
// Source: NASA JPL Horizons System (https://ssd.jpl.nasa.gov/horizons/)
// Query: COMMAND='299', EPHEM_TYPE='OBSERVER', CENTER='500@399', QUANTITIES='31'
// Retrieved: 2025-Dec-19
// These values are AUTHORITATIVE - do not modify!
// =============================================================================
const JPL_VENUS_REFERENCE = [
  { jd: 2451545.0, description: 'J2000.0', longitude: 241.5657794, latitude: 2.0663548 },
  { jd: 2458850.0, description: '2020-Jan-01 12:00', longitude: 315.0222601, latitude: -1.8347157 },
  { jd: 2448058.0, description: '1990-Jun-15 12:00', longitude: 48.7775846, latitude: -1.9459914 },
] as const;

// =============================================================================
// SWISS EPHEMERIS REFERENCE DATA
// Generated from pyswisseph (Swiss Ephemeris 2.10.03)
// These values are AUTHORITATIVE - do not modify!
// Our implementation must match these within ±2 arcminutes (0.033°)
// =============================================================================
const SWISSEPH_VENUS_REFERENCE = [
  {
    jd: 2451545.0,
    description: 'J2000.0 (2000-Jan-01 12:00 TT)',
    longitude: 241.565798,
    latitude: 2.066348,
    distance: 1.137579,
    speed: 1.20904,
    isRetrograde: false,
  },
  {
    jd: 2448724.5,
    description: 'Meeus Example 47.a (1992-Apr-12 00:00 TT)',
    longitude: 5.792458,
    latitude: -1.511414,
    distance: 1.629291,
    speed: 1.232727,
    isRetrograde: false,
  },
  {
    jd: 2440587.5,
    description: 'Unix Epoch (1970-Jan-01 00:00 TT)',
    longitude: 274.45327,
    latitude: -0.260587,
    distance: 1.698669,
    speed: 1.258318,
    isRetrograde: false,
  },
  {
    jd: 2459580.5,
    description: 'Recent (2022-Jan-01 00:00 TT)',
    longitude: 293.294732,
    latitude: 2.884562,
    distance: 0.273759,
    speed: -0.485978,
    isRetrograde: true,
  },
] as const;

// Tolerance: 2 arcminutes = 0.0333 degrees
const LONGITUDE_TOLERANCE = 0.034;

import {
  getVenusPosition,
  VENUS_ORBITAL_ELEMENTS,
  venusHeliocentricDistance,
  venusHeliocentricLatitude,
  venusHeliocentricLongitude,
} from './venus.js';

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

describe('ephemeris/planets/venus', () => {
  describe('Heliocentric coordinates', () => {
    describe('venusHeliocentricLongitude', () => {
      it('should return reasonable value at J2000.0', () => {
        const tau = 0;
        const lon = venusHeliocentricLongitude(tau);
        // Venus's heliocentric longitude varies continuously
        assert.ok(lon > 0 && lon < 2 * Math.PI, `Expected 0-2π rad, got ${lon}`);
      });

      it('should complete ~1.6 orbits per year', () => {
        // Venus orbital period ≈ 225 days ≈ 0.615 years
        // So in 1 year it completes ~1.63 orbits ≈ 10.2 radians
        const tau0 = 0;
        const tau1 = 1 / 1000; // 1 year = 0.001 millennium
        const lon0 = venusHeliocentricLongitude(tau0);
        const lon1 = venusHeliocentricLongitude(tau1);

        const deltaLon = lon1 - lon0;
        // About 1.63 * 2π ≈ 10.2 radians of total motion
        assert.ok(Math.abs(deltaLon - 10.2) < 0.5, `Expected ~10.2 rad/year, got ${deltaLon} rad`);
      });
    });

    describe('venusHeliocentricLatitude', () => {
      it('should stay within ±3.4° (orbital inclination)', () => {
        // Venus's orbital inclination is 3.39°
        for (let i = 0; i < 12; i++) {
          const tau = i / 12000;
          const lat = venusHeliocentricLatitude(tau);
          const latDeg = lat * (180 / Math.PI);
          assert.ok(Math.abs(latDeg) <= 4, `Latitude ${latDeg}° exceeds orbital inclination limit`);
        }
      });
    });

    describe('venusHeliocentricDistance', () => {
      it('should be approximately 0.723 AU (semi-major axis)', () => {
        const tau = 0;
        const dist = venusHeliocentricDistance(tau);
        // Semi-major axis ≈ 0.723 AU
        assert.ok(dist > 0.7 && dist < 0.75, `Expected ~0.723 AU, got ${dist} AU`);
      });

      it('should have very small variation (nearly circular orbit)', () => {
        // Venus has the most circular orbit (e = 0.0068)
        // Distance varies only from 0.718 to 0.728 AU
        let minDist = Infinity;
        let maxDist = 0;

        // Sample over one Venus year (~225 days)
        for (let i = 0; i < 230; i++) {
          const tau = i / 365250;
          const dist = venusHeliocentricDistance(tau);
          minDist = Math.min(minDist, dist);
          maxDist = Math.max(maxDist, dist);
        }

        const variation = maxDist - minDist;
        // Variation should be small (< 0.02 AU)
        assert.ok(
          variation < 0.02,
          `Distance variation ${variation} AU too large for circular orbit`,
        );
      });
    });
  });

  describe('getVenusPosition', () => {
    describe('JPL Horizons reference validation', () => {
      for (const ref of JPL_VENUS_REFERENCE) {
        it(`should match JPL Horizons at ${ref.description}`, () => {
          const venus = getVenusPosition(ref.jd);
          const lonDiff = Math.abs(venus.longitude - ref.longitude);
          assert.ok(
            lonDiff < LONGITUDE_TOLERANCE,
            `Longitude: expected ${ref.longitude}° (JPL), got ${venus.longitude.toFixed(4)}° (diff: ${(lonDiff * 60).toFixed(1)} arcmin)`,
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
      for (const ref of SWISSEPH_VENUS_REFERENCE) {
        it(`should match Swiss Ephemeris at ${ref.description}`, () => {
          const venus = getVenusPosition(ref.jd);

          const lonDiff = Math.abs(venus.longitude - ref.longitude);
          assert.ok(
            lonDiff < LONGITUDE_TOLERANCE,
            `Longitude: expected ${ref.longitude}°, got ${venus.longitude}° (diff: ${(lonDiff * 60).toFixed(1)} arcmin)`,
          );
        });
      }
    });

    describe('J2000.0 epoch characteristics', () => {
      it('should calculate latitude around +2°', () => {
        const jd = J2000_EPOCH;
        const venus = getVenusPosition(jd);

        assert.ok(Math.abs(venus.latitude - 2) < 2, `Expected ~2°, got ${venus.latitude}°`);
      });

      it('should have reasonable geocentric distance', () => {
        const jd = J2000_EPOCH;
        const venus = getVenusPosition(jd);

        // Geocentric distance varies from ~0.26 AU to ~1.74 AU
        assert.ok(
          venus.distance > 0.2 && venus.distance < 1.8,
          `Expected 0.2-1.8 AU, got ${venus.distance} AU`,
        );
      });

      it('should calculate speed', () => {
        const jd = J2000_EPOCH;
        const venus = getVenusPosition(jd);

        // Venus's apparent motion varies from -0.6°/day (retrograde) to +1.3°/day
        assert.ok(
          venus.longitudeSpeed > -1 && venus.longitudeSpeed < 2,
          `Unexpected speed: ${venus.longitudeSpeed}°/day`,
        );
      });
    });

    describe('Retrograde motion', () => {
      /**
       * Venus retrogrades about every 584 days (synodic period) for ~40 days.
       * This is less frequent than Mercury.
       */
      it('should detect retrograde when speed is negative', () => {
        let foundRetrograde = false;

        // Need to check over ~600 days to catch a retrograde
        for (let i = 0; i < 600; i++) {
          const jd = J2000_EPOCH + i;
          const venus = getVenusPosition(jd);

          if (venus.isRetrograde) {
            foundRetrograde = true;
            assert.ok(venus.longitudeSpeed < 0, 'Retrograde should have negative speed');
            break;
          }
        }

        assert.ok(foundRetrograde, 'Should find at least one retrograde day in 600 days');
      });

      it('should have 1 retrograde period every ~584 days', () => {
        let retrogradeCount = 0;
        let wasRetrograde = false;

        // Check over 2 years
        for (let i = 0; i < 730; i++) {
          const jd = J2000_EPOCH + i;
          const venus = getVenusPosition(jd);

          if (venus.isRetrograde && !wasRetrograde) {
            retrogradeCount++;
          }
          wasRetrograde = venus.isRetrograde;
        }

        // Should have 1-2 retrograde periods in 2 years
        assert.ok(
          retrogradeCount >= 1 && retrogradeCount <= 2,
          `Expected 1-2 retrograde periods, found ${retrogradeCount}`,
        );
      });
    });

    describe('Maximum elongation', () => {
      it('should reach maximum elongation around 47°', () => {
        // Venus's maximum elongation is about 45-48° (varies with orbital positions)
        // Note: Our simple Sun longitude approximation introduces some error
        let maxSeparation = 0;

        for (let i = 0; i < 600; i++) {
          const jd = J2000_EPOCH + i;
          const venus = getVenusPosition(jd);

          // Approximate Sun longitude (simplified, ~1°/day from 280° at J2000.0)
          const sunLon = (280.46 + i * 0.9856) % 360;

          let sep = Math.abs(venus.longitude - sunLon);
          if (sep > 180) sep = 360 - sep;

          maxSeparation = Math.max(maxSeparation, sep);
        }

        // Venus reaches ~45-48° from Sun at maximum elongation
        // Allow wider tolerance due to simplified Sun position
        assert.ok(
          maxSeparation >= 44 && maxSeparation <= 50,
          `Maximum elongation ${maxSeparation}° should be ~47°`,
        );
      });

      it('should be near Sun at inferior conjunction', () => {
        // At inferior conjunction, Venus is between Earth and Sun
        let minSeparation = 360;

        for (let i = 0; i < 600; i++) {
          const jd = J2000_EPOCH + i;
          const venus = getVenusPosition(jd);

          const sunLon = (280.46 + i) % 360;

          let sep = Math.abs(venus.longitude - sunLon);
          if (sep > 180) sep = 360 - sep;

          if (sep < minSeparation) {
            minSeparation = sep;
          }
        }

        // At conjunction, separation should be small (< 10°)
        assert.ok(minSeparation < 10, `Minimum separation ${minSeparation}° should be < 10°`);
      });
    });

    describe('Historical dates', () => {
      it('should handle dates far from J2000', () => {
        // Year 1900
        const jd1900 = toJD(1900, 6, 15, 12);
        const venus1900 = getVenusPosition(jd1900);
        assert.ok(venus1900.longitude >= 0 && venus1900.longitude < 360);

        // Year 2100
        const jd2100 = toJD(2100, 6, 15, 12);
        const venus2100 = getVenusPosition(jd2100);
        assert.ok(venus2100.longitude >= 0 && venus2100.longitude < 360);
      });

      it('Venus transit of 2012 (June 5-6)', () => {
        // Venus transited the Sun on June 5-6, 2012
        // During transit, Venus should be very close to Sun
        const jd = toJD(2012, 6, 6, 0);
        const venus = getVenusPosition(jd);

        // Sun is around 75° (Gemini) in early June
        const sunLon = 75;
        let sep = Math.abs(venus.longitude - sunLon);
        if (sep > 180) sep = 360 - sep;

        // During transit, Venus should be within ~5° of Sun
        assert.ok(sep < 10, `Venus during transit should be near Sun, got ${sep}° separation`);
      });
    });

    describe('Zodiac traversal', () => {
      it('should traverse all zodiac signs in ~225 days orbital period', () => {
        // Venus orbits Sun in ~225 days, appearing in all signs
        const signs = new Set<number>();

        for (let i = 0; i < 600; i++) {
          const jd = J2000_EPOCH + i;
          const venus = getVenusPosition(jd);
          const signIndex = Math.floor(venus.longitude / 30);
          signs.add(signIndex);
        }

        // Should see all 12 signs
        assert.ok(signs.size >= 11, `Expected 12 signs, found ${signs.size}`);
      });
    });

    describe('Options', () => {
      it('should calculate speed by default', () => {
        const venus = getVenusPosition(J2000_EPOCH);
        assert.ok(venus.longitudeSpeed !== 0);
      });

      it('should skip speed calculation when disabled', () => {
        const venus = getVenusPosition(J2000_EPOCH, { includeSpeed: false });
        assert.equal(venus.longitudeSpeed, 0);
        assert.equal(venus.isRetrograde, false);
      });
    });
  });

  describe('VENUS_ORBITAL_ELEMENTS', () => {
    it('should have correct semi-major axis', () => {
      assert.ok(
        Math.abs(VENUS_ORBITAL_ELEMENTS.semiMajorAxis - 0.723) < 0.001,
        'Semi-major axis should be ~0.723 AU',
      );
    });

    it('should have very low eccentricity (most circular orbit)', () => {
      // Venus has the lowest eccentricity of all planets
      assert.ok(VENUS_ORBITAL_ELEMENTS.eccentricity < 0.01, 'Eccentricity should be < 0.01');
    });

    it('should have correct orbital period', () => {
      assert.ok(
        Math.abs(VENUS_ORBITAL_ELEMENTS.orbitalPeriod - 224.7) < 0.1,
        'Orbital period should be ~224.7 days',
      );
    });

    it('should have correct synodic period', () => {
      assert.ok(
        Math.abs(VENUS_ORBITAL_ELEMENTS.synodicPeriod - 583.92) < 1,
        'Synodic period should be ~583.92 days',
      );
    });

    it('should have correct maximum elongation', () => {
      assert.ok(
        Math.abs(VENUS_ORBITAL_ELEMENTS.maxElongation - 47.8) < 1,
        'Max elongation should be ~47.8°',
      );
    });
  });
});
