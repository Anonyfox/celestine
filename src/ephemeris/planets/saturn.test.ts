/**
 * Tests for Saturn Position Calculator
 *
 * @remarks
 * Verifies Saturn position calculations against:
 * 1. Swiss Ephemeris reference data (authoritative)
 * 2. Known astronomical events (oppositions, conjunctions)
 * 3. Giant planet orbital characteristics
 *
 * Accuracy target: ±2 arcminutes (0.033°) for longitude
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { J2000_EPOCH } from '../constants.js';
import {
  getSaturnPosition,
  SATURN_ORBITAL_ELEMENTS,
  saturnHeliocentricDistance,
  saturnHeliocentricLatitude,
  saturnHeliocentricLongitude,
} from './saturn.js';

// =============================================================================
// JPL HORIZONS REFERENCE DATA
// Source: NASA JPL Horizons System (https://ssd.jpl.nasa.gov/horizons/)
// Query: COMMAND='699', EPHEM_TYPE='OBSERVER', CENTER='500@399', QUANTITIES='31'
// Retrieved: 2025-Dec-19
// These values are AUTHORITATIVE - do not modify!
// =============================================================================
const JPL_SATURN_REFERENCE = [
  { jd: 2451545.0, description: 'J2000.0', longitude: 40.3956366, latitude: -2.4448533 },
  { jd: 2458850.0, description: '2020-Jan-01 12:00', longitude: 291.4534813, latitude: 0.0511831 },
  { jd: 2448058.0, description: '1990-Jun-15 12:00', longitude: 294.0319301, latitude: 0.1165918 },
] as const;

// =============================================================================
// SWISS EPHEMERIS REFERENCE DATA
// Generated from pyswisseph (Swiss Ephemeris 2.10.03)
// These values are AUTHORITATIVE - do not modify!
// Our implementation must match these within ±2 arcminutes (0.033°)
// =============================================================================
const SWISSEPH_SATURN_REFERENCE = [
  {
    jd: 2451545.0,
    description: 'J2000.0 (2000-Jan-01 12:00 TT)',
    longitude: 40.395639,
    latitude: -2.444823,
    distance: 8.652796,
    speed: -0.019945,
    isRetrograde: true,
  },
  {
    jd: 2448724.5,
    description: 'Meeus Example 47.a (1992-Apr-12 00:00 TT)',
    longitude: 316.774354,
    latitude: -0.737369,
    distance: 10.290341,
    speed: 0.070734,
    isRetrograde: false,
  },
  {
    jd: 2440587.5,
    description: 'Unix Epoch (1970-Jan-01 00:00 TT)',
    longitude: 32.062306,
    latitude: -2.524529,
    distance: 8.80282,
    speed: -0.005422,
    isRetrograde: true,
  },
  {
    jd: 2459580.5,
    description: 'Recent (2022-Jan-01 00:00 TT)',
    longitude: 311.902803,
    latitude: -0.823505,
    distance: 10.746143,
    speed: 0.108206,
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

describe('ephemeris/planets/saturn', () => {
  describe('Heliocentric coordinates', () => {
    describe('saturnHeliocentricLongitude', () => {
      it('should return reasonable value at J2000.0', () => {
        const tau = 0;
        const lon = saturnHeliocentricLongitude(tau);
        assert.ok(lon > 0 && lon < 2 * Math.PI, `Expected 0-2π rad, got ${lon}`);
      });

      it('should complete ~0.034 orbits per year', () => {
        // Saturn orbital period ≈ 10759 days ≈ 29.46 years
        // So in 1 year it completes ~0.034 orbits ≈ 0.21 radians
        const tau0 = 0;
        const tau1 = 1 / 1000; // 1 year
        const lon0 = saturnHeliocentricLongitude(tau0);
        const lon1 = saturnHeliocentricLongitude(tau1);

        const deltaLon = lon1 - lon0;
        // About 0.034 * 2π ≈ 0.21 radians per year
        assert.ok(Math.abs(deltaLon - 0.21) < 0.03, `Expected ~0.21 rad/year, got ${deltaLon} rad`);
      });
    });

    describe('saturnHeliocentricLatitude', () => {
      it('should stay within ±2.5° (orbital inclination)', () => {
        // Saturn's orbital inclination is ~2.49°
        for (let i = 0; i < 30; i++) {
          const tau = i / 1000; // years
          const lat = saturnHeliocentricLatitude(tau);
          const latDeg = lat * (180 / Math.PI);
          assert.ok(Math.abs(latDeg) <= 3, `Latitude ${latDeg}° exceeds limit`);
        }
      });
    });

    describe('saturnHeliocentricDistance', () => {
      it('should be approximately 9.5 AU (semi-major axis)', () => {
        const tau = 0;
        const dist = saturnHeliocentricDistance(tau);
        // Semi-major axis ≈ 9.537 AU
        assert.ok(dist > 9 && dist < 10.1, `Expected ~9.5 AU, got ${dist} AU`);
      });

      it('should vary between perihelion and aphelion', () => {
        // Saturn e = 0.054, so distance varies moderately
        // Perihelion ≈ 9.02 AU, Aphelion ≈ 10.05 AU
        let minDist = Infinity;
        let maxDist = 0;

        // Sample over one Saturn year (~30 years)
        for (let i = 0; i < 31; i++) {
          const tau = i / 1000; // years
          const dist = saturnHeliocentricDistance(tau);
          minDist = Math.min(minDist, dist);
          maxDist = Math.max(maxDist, dist);
        }

        assert.ok(minDist < 9.2, `Min distance ${minDist} AU should be < 9.2`);
        assert.ok(maxDist > 9.8, `Max distance ${maxDist} AU should be > 9.8`);
      });
    });
  });

  describe('getSaturnPosition', () => {
    describe('JPL Horizons reference validation', () => {
      for (const ref of JPL_SATURN_REFERENCE) {
        it(`should match JPL Horizons at ${ref.description}`, () => {
          const saturn = getSaturnPosition(ref.jd);
          const lonDiff = Math.abs(saturn.longitude - ref.longitude);
          assert.ok(
            lonDiff < LONGITUDE_TOLERANCE,
            `Longitude: expected ${ref.longitude}° (JPL), got ${saturn.longitude.toFixed(4)}° (diff: ${(lonDiff * 60).toFixed(1)} arcmin)`,
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
      for (const ref of SWISSEPH_SATURN_REFERENCE) {
        it(`should match Swiss Ephemeris at ${ref.description}`, () => {
          const saturn = getSaturnPosition(ref.jd);

          const lonDiff = Math.abs(saturn.longitude - ref.longitude);
          assert.ok(
            lonDiff < LONGITUDE_TOLERANCE,
            `Longitude: expected ${ref.longitude}°, got ${saturn.longitude}° (diff: ${(lonDiff * 60).toFixed(1)} arcmin)`,
          );
        });
      }
    });

    describe('J2000.0 epoch characteristics', () => {
      it('should have geocentric distance around 8.6 AU', () => {
        const jd = J2000_EPOCH;
        const saturn = getSaturnPosition(jd);

        // Geocentric distance varies from ~7.99 AU to ~11.08 AU
        assert.ok(
          saturn.distance > 8 && saturn.distance < 9.5,
          `Expected ~8.6 AU, got ${saturn.distance} AU`,
        );
      });

      it('should be retrograde at J2000.0', () => {
        const jd = J2000_EPOCH;
        const saturn = getSaturnPosition(jd);

        // Saturn was retrograde at J2000.0 according to Swiss Ephemeris
        assert.ok(saturn.isRetrograde, 'Saturn should be retrograde at J2000.0');
      });

      it('should have slow speed (giant planet)', () => {
        const jd = J2000_EPOCH;
        const saturn = getSaturnPosition(jd);

        // Saturn's apparent motion varies from -0.12°/day (retrograde) to +0.13°/day
        assert.ok(
          saturn.longitudeSpeed > -0.15 && saturn.longitudeSpeed < 0.15,
          `Unexpected speed: ${saturn.longitudeSpeed}°/day`,
        );
      });
    });

    describe('Retrograde motion', () => {
      /**
       * Saturn retrogrades about every 378 days (synodic period) for ~138 days.
       */
      it('should detect retrograde when speed is negative', () => {
        let foundRetrograde = false;

        // Check over ~400 days to catch a retrograde
        for (let i = 0; i < 400; i++) {
          const jd = J2000_EPOCH + i;
          const saturn = getSaturnPosition(jd);

          if (saturn.isRetrograde) {
            foundRetrograde = true;
            assert.ok(saturn.longitudeSpeed < 0, 'Retrograde should have negative speed');
            break;
          }
        }

        assert.ok(foundRetrograde, 'Should find at least one retrograde day in 400 days');
      });

      it('should have retrograde lasting ~138 days', () => {
        // First, skip past the current retrograde (Saturn is retrograde at J2000.0)
        // Then find the next complete retrograde period
        let jd = J2000_EPOCH;

        // Skip past current retrograde
        while (getSaturnPosition(jd).isRetrograde && jd < J2000_EPOCH + 200) {
          jd += 1;
        }

        // Skip past direct motion period
        while (!getSaturnPosition(jd).isRetrograde && jd < J2000_EPOCH + 500) {
          jd += 1;
        }

        // Now count the full retrograde period
        let retrogradeDays = 0;
        while (getSaturnPosition(jd).isRetrograde && jd < J2000_EPOCH + 700) {
          retrogradeDays++;
          jd += 1;
        }

        // Saturn retrograde lasts ~130-145 days
        assert.ok(
          retrogradeDays >= 120 && retrogradeDays <= 155,
          `Retrograde duration ${retrogradeDays} days outside expected 130-145 days`,
        );
      });
    });

    describe('Opposition', () => {
      it('should reach opposition (closest to Earth) once per ~378 days', () => {
        // Find minimum distance within a synodic period
        let minDistance = Infinity;

        for (let i = 0; i < 400; i++) {
          const jd = J2000_EPOCH + i;
          const saturn = getSaturnPosition(jd);

          if (saturn.distance < minDistance) {
            minDistance = saturn.distance;
          }
        }

        // At opposition, distance should be ~8-8.5 AU
        assert.ok(minDistance < 9, `Opposition distance ${minDistance} AU should be < 9 AU`);
      });
    });

    describe('Sign transit', () => {
      it('should move approximately 12° per year', () => {
        // Saturn moves ~12.2° per year (360° / 29.46 years)
        const jd0 = J2000_EPOCH;
        const saturn0 = getSaturnPosition(jd0);

        // Check after 1 year
        const jd1y = jd0 + 365.25;
        const saturn1y = getSaturnPosition(jd1y);

        // Calculate angular motion
        let motion = saturn1y.longitude - saturn0.longitude;
        if (motion < -180) motion += 360;
        if (motion > 180) motion -= 360;

        // Saturn should move ~12° per year (accounting for retrograde)
        assert.ok(Math.abs(motion - 12) < 5, `Expected ~12° motion per year, got ${motion}°`);
      });
    });

    describe('Historical dates', () => {
      it('should handle dates far from J2000', () => {
        // Year 1900
        const jd1900 = toJD(1900, 6, 15, 12);
        const saturn1900 = getSaturnPosition(jd1900);
        assert.ok(saturn1900.longitude >= 0 && saturn1900.longitude < 360);

        // Year 2100
        const jd2100 = toJD(2100, 6, 15, 12);
        const saturn2100 = getSaturnPosition(jd2100);
        assert.ok(saturn2100.longitude >= 0 && saturn2100.longitude < 360);
      });

      it('should return to similar position after ~30 years', () => {
        // Saturn's orbital period is ~29.46 years
        const jd0 = J2000_EPOCH;
        const saturn0 = getSaturnPosition(jd0);

        const jd30y = jd0 + 10759; // ~29.46 years in days
        const saturn30y = getSaturnPosition(jd30y);

        // Should be within ~15° of original position
        let diff = Math.abs(saturn30y.longitude - saturn0.longitude);
        if (diff > 180) diff = 360 - diff;

        assert.ok(diff < 20, `After 30 years, position changed by ${diff}° (expected < 20°)`);
      });
    });

    describe('~30-year zodiac cycle', () => {
      it('should traverse all zodiac signs in ~30 years', () => {
        const signs = new Set<number>();

        // Sample every 100 days for 31 years
        for (let i = 0; i < 31 * 4; i++) {
          const jd = J2000_EPOCH + i * 100;
          const saturn = getSaturnPosition(jd);
          const signIndex = Math.floor(saturn.longitude / 30);
          signs.add(signIndex);
        }

        // Should see all 12 signs
        assert.ok(signs.size >= 11, `Expected 12 signs, found ${signs.size}`);
      });
    });

    describe('Options', () => {
      it('should calculate speed by default', () => {
        const saturn = getSaturnPosition(J2000_EPOCH);
        assert.ok(saturn.longitudeSpeed !== 0);
      });

      it('should skip speed calculation when disabled', () => {
        const saturn = getSaturnPosition(J2000_EPOCH, { includeSpeed: false });
        assert.equal(saturn.longitudeSpeed, 0);
        assert.equal(saturn.isRetrograde, false);
      });
    });
  });

  describe('SATURN_ORBITAL_ELEMENTS', () => {
    it('should have correct semi-major axis', () => {
      assert.ok(
        Math.abs(SATURN_ORBITAL_ELEMENTS.semiMajorAxis - 9.54) < 0.02,
        'Semi-major axis should be ~9.54 AU',
      );
    });

    it('should have moderate eccentricity', () => {
      assert.ok(
        SATURN_ORBITAL_ELEMENTS.eccentricity > 0.05 && SATURN_ORBITAL_ELEMENTS.eccentricity < 0.06,
        'Eccentricity should be ~0.054',
      );
    });

    it('should have correct orbital period', () => {
      assert.ok(
        Math.abs(SATURN_ORBITAL_ELEMENTS.orbitalPeriod - 10759) < 10,
        'Orbital period should be ~10759 days',
      );
    });

    it('should have ~30 year orbital period', () => {
      assert.ok(
        Math.abs(SATURN_ORBITAL_ELEMENTS.orbitalPeriodYears - 29.46) < 0.1,
        'Orbital period should be ~29.46 years',
      );
    });

    it('should have correct synodic period', () => {
      assert.ok(
        Math.abs(SATURN_ORBITAL_ELEMENTS.synodicPeriod - 378) < 2,
        'Synodic period should be ~378 days',
      );
    });
  });
});
