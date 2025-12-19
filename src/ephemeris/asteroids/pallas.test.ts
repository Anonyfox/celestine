/**
 * Tests for Pallas Position Calculator
 *
 * @remarks
 * Verifies Pallas position calculations against:
 * 1. JPL Horizons reference data (authoritative)
 * 2. Known orbital characteristics
 *
 * Pallas has the highest inclination (34.9°) of the major asteroids.
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { J2000_EPOCH } from '../constants.js';
import {
  getPallasPosition,
  PALLAS_ORBITAL_ELEMENTS,
  pallasHeliocentricDistance,
  pallasHeliocentricLongitude,
} from './pallas.js';

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
const JPL_PALLAS_REFERENCE = [
  {
    jd: 2451545.0,
    description: 'J2000.0 (2000-Jan-01 12:00 TT)',
    longitude: 134.043348,
    latitude: -48.3508335,
  },
  {
    jd: 2458849.0, // 2020-Jan-01 12:00
    description: '2020-Jan-01 12:00 TT (near epoch)',
    longitude: 263.0682893,
    latitude: 26.9644991,
  },
  {
    jd: 2460840.0, // 2025-Jun-15 12:00
    description: '2025-Jun-15 12:00 TT',
    longitude: 325.1210545,
    latitude: 31.8553253,
  },
] as const;

describe('ephemeris/asteroids/pallas', () => {
  describe('getPallasPosition', () => {
    describe('JPL Horizons reference validation', () => {
      // Pallas has higher inclination causing more complex geometry
      // Expect slightly larger errors than lower-inclination asteroids
      const tolerances: Record<number, number> = {
        2451545.0: 8.0, // J2000.0 - 25 years from epoch
        2458849.0: 3.0, // 2020 - 5 years from epoch
        2460840.0: 2.0, // 2025 - near epoch
      };

      for (const ref of JPL_PALLAS_REFERENCE) {
        const tolerance = tolerances[ref.jd] ?? 8.0;

        it(`should match JPL within ${tolerance}° at ${ref.description}`, () => {
          const pallas = getPallasPosition(ref.jd);

          let lonDiff = Math.abs(pallas.longitude - ref.longitude);
          if (lonDiff > 180) lonDiff = 360 - lonDiff;

          assert.ok(
            lonDiff < tolerance,
            `Longitude: expected ${ref.longitude.toFixed(4)}° (JPL), got ${pallas.longitude.toFixed(4)}° (diff: ${lonDiff.toFixed(2)}°)`,
          );
        });
      }
    });

    it('should return valid position at J2000.0', () => {
      const pallas = getPallasPosition(J2000_EPOCH);

      assert.ok(pallas.longitude >= 0 && pallas.longitude < 360);
      assert.ok(Math.abs(pallas.latitude) < 50, 'High inclination allows large latitude');
      assert.ok(pallas.distance > 1 && pallas.distance < 5);
    });

    it('should have high latitude values due to 34.9° inclination', () => {
      let maxLat = 0;
      const period = PALLAS_ORBITAL_ELEMENTS.orbitalPeriod;

      for (let i = 0; i < period; i += 30) {
        const pallas = getPallasPosition(J2000_EPOCH + i);
        maxLat = Math.max(maxLat, Math.abs(pallas.latitude));
      }

      assert.ok(maxLat > 20, `Max latitude ${maxLat.toFixed(1)}° should exceed 20°`);
    });

    it('should detect retrograde motion periods', () => {
      let retrogradeCount = 0;
      const totalDays = 500;

      for (let i = 0; i < totalDays; i++) {
        const pallas = getPallasPosition(J2000_EPOCH + i);
        if (pallas.isRetrograde) retrogradeCount++;
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
      const lon = pallasHeliocentricLongitude(J2000_EPOCH);
      assert.ok(lon >= 0 && lon < 360);
    });

    it('should have heliocentric distance within perihelion-aphelion range', () => {
      const dist = pallasHeliocentricDistance(J2000_EPOCH);
      // Pallas: perihelion ~2.13 AU, aphelion ~3.41 AU
      assert.ok(dist > 2.0 && dist < 3.5, `Distance ${dist.toFixed(3)} AU should be 2.0-3.5 AU`);
    });
  });

  describe('PALLAS_ORBITAL_ELEMENTS', () => {
    it('should have ~2.77 AU semi-major axis', () => {
      assert.ok(
        Math.abs(PALLAS_ORBITAL_ELEMENTS.semiMajorAxis - 2.77) < 0.05,
        'Semi-major axis should be ~2.77 AU',
      );
    });

    it('should have moderate eccentricity (~0.23)', () => {
      assert.ok(
        Math.abs(PALLAS_ORBITAL_ELEMENTS.eccentricity - 0.23) < 0.02,
        'Eccentricity should be ~0.23',
      );
    });

    it('should have highest inclination of major asteroids (~34.9°)', () => {
      assert.ok(PALLAS_ORBITAL_ELEMENTS.inclination > 30, 'Pallas has highest inclination > 30°');
    });

    it('should have ~4.6 year orbital period', () => {
      assert.ok(
        Math.abs(PALLAS_ORBITAL_ELEMENTS.orbitalPeriodYears - 4.6) < 0.2,
        'Orbital period should be ~4.6 years',
      );
    });
  });
});
