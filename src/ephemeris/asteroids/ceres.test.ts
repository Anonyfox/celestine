/**
 * Tests for Ceres Position Calculator
 *
 * @remarks
 * Verifies Ceres position calculations against:
 * 1. JPL Horizons reference data (authoritative)
 * 2. Known orbital characteristics
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { J2000_EPOCH } from '../constants.js';
import {
  CERES_ORBITAL_ELEMENTS,
  ceresHeliocentricDistance,
  ceresHeliocentricLongitude,
  getCeresPosition,
} from './ceres.js';

// =============================================================================
// JPL HORIZONS REFERENCE DATA
// Source: NASA JPL Horizons System (https://ssd.jpl.nasa.gov/horizons/)
// Query: Observer ecliptic longitude/latitude, geocentric, CENTER='500@399'
// Retrieved: 2025-Dec-19
// QUANTITIES='31' (ObsEcLon, ObsEcLat)
//
// These values are AUTHORITATIVE - do not modify!
// Our implementation results should match these within acceptable tolerance.
// =============================================================================
const JPL_CERES_REFERENCE = [
  {
    jd: 2451545.0, // J2000.0
    description: 'J2000.0 (2000-Jan-01 12:00 TT)',
    longitude: 184.4530625,
    latitude: 11.8375968,
  },
  {
    jd: 2458849.0, // 2020-Jan-01 12:00 (close to orbital elements epoch)
    description: '2020-Jan-01 12:00 TT (near epoch)',
    longitude: 288.1058401,
    latitude: -4.0206328,
  },
  {
    jd: 2460840.0, // 2025-Jun-15 12:00
    description: '2025-Jun-15 12:00 TT',
    longitude: 8.6170467,
    latitude: -10.3266894,
  },
] as const;

describe('ephemeris/asteroids/ceres', () => {
  describe('getCeresPosition', () => {
    describe('JPL Horizons reference validation', () => {
      // Note: Keplerian elements accuracy degrades further from the epoch
      // Near epoch (2025): expect < 1° error
      // At J2000.0 (25 years before epoch): expect < 5° error due to accumulated drift
      const tolerances: Record<number, number> = {
        2451545.0: 5.0, // J2000.0 - 25 years from epoch
        2458849.0: 2.0, // 2020 - 5 years from epoch
        2460840.0: 1.0, // 2025 - near epoch
      };

      for (const ref of JPL_CERES_REFERENCE) {
        const tolerance = tolerances[ref.jd] ?? 5.0;

        it(`should match JPL within ${tolerance}° at ${ref.description}`, () => {
          const ceres = getCeresPosition(ref.jd);

          let lonDiff = Math.abs(ceres.longitude - ref.longitude);
          if (lonDiff > 180) lonDiff = 360 - lonDiff;

          assert.ok(
            lonDiff < tolerance,
            `Longitude: expected ${ref.longitude.toFixed(4)}° (JPL), got ${ceres.longitude.toFixed(4)}° (diff: ${lonDiff.toFixed(2)}°)`,
          );
        });
      }
    });

    it('should return valid position at J2000.0', () => {
      const ceres = getCeresPosition(J2000_EPOCH);

      assert.ok(ceres.longitude >= 0 && ceres.longitude < 360, 'Longitude in valid range');
      assert.ok(Math.abs(ceres.latitude) < 20, 'Latitude reasonable for 10.6° inclination');
      assert.ok(ceres.distance > 1 && ceres.distance < 5, 'Distance in valid range');
    });

    it('should detect retrograde motion periods', () => {
      // Ceres retrogrades ~3 months per ~4.6 year orbit
      let retrogradeCount = 0;
      const totalDays = 500;

      for (let i = 0; i < totalDays; i++) {
        const ceres = getCeresPosition(J2000_EPOCH + i);
        if (ceres.isRetrograde) retrogradeCount++;
      }

      const retrogradePercent = (retrogradeCount / totalDays) * 100;
      assert.ok(
        retrogradePercent > 10 && retrogradePercent < 40,
        `Retrograde ${retrogradePercent.toFixed(1)}% should be 10-40%`,
      );
    });
  });

  describe('Heliocentric coordinates', () => {
    it('should have heliocentric longitude in [0, 360)', () => {
      const lon = ceresHeliocentricLongitude(J2000_EPOCH);
      assert.ok(lon >= 0 && lon < 360);
    });

    it('should have heliocentric distance within perihelion-aphelion range', () => {
      const dist = ceresHeliocentricDistance(J2000_EPOCH);
      // Ceres: perihelion ~2.56 AU, aphelion ~2.99 AU
      assert.ok(dist > 2.5 && dist < 3.0, `Distance ${dist.toFixed(3)} AU should be 2.5-3.0 AU`);
    });
  });

  describe('CERES_ORBITAL_ELEMENTS', () => {
    it('should have ~2.77 AU semi-major axis', () => {
      assert.ok(
        Math.abs(CERES_ORBITAL_ELEMENTS.semiMajorAxis - 2.77) < 0.05,
        'Semi-major axis should be ~2.77 AU',
      );
    });

    it('should have low eccentricity (~0.08)', () => {
      assert.ok(
        CERES_ORBITAL_ELEMENTS.eccentricity < 0.1,
        'Ceres has low eccentricity (nearly circular orbit)',
      );
    });

    it('should have ~4.6 year orbital period', () => {
      assert.ok(
        Math.abs(CERES_ORBITAL_ELEMENTS.orbitalPeriodYears - 4.6) < 0.2,
        'Orbital period should be ~4.6 years',
      );
    });

    it('should have ~10.6° inclination', () => {
      assert.ok(
        Math.abs(CERES_ORBITAL_ELEMENTS.inclination - 10.6) < 0.5,
        'Inclination should be ~10.6°',
      );
    });
  });
});
