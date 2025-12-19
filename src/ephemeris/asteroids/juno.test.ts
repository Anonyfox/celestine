/**
 * Tests for Juno Position Calculator
 *
 * @remarks
 * Verifies Juno position calculations against:
 * 1. JPL Horizons reference data (authoritative)
 * 2. Known orbital characteristics
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { J2000_EPOCH } from '../constants.js';
import {
  getJunoPosition,
  JUNO_ORBITAL_ELEMENTS,
  junoHeliocentricDistance,
  junoHeliocentricLongitude,
} from './juno.js';

// =============================================================================
// JPL HORIZONS REFERENCE DATA
// Source: NASA JPL Horizons System (https://ssd.jpl.nasa.gov/horizons/)
// Query: Observer ecliptic longitude/latitude, geocentric, CENTER='500@399'
// Retrieved: 2025-Dec-19
// QUANTITIES='31' (ObsEcLon, ObsEcLat)
// Note: Queried using COMMAND='3%3B' (3; for asteroid #3)
//
// These values are AUTHORITATIVE - do not modify!
// Our implementation results should match these within acceptable tolerance.
// =============================================================================
const JPL_JUNO_REFERENCE = [
  {
    jd: 2451545.0,
    description: 'J2000.0 (2000-Jan-01 12:00 TT)',
    longitude: 277.9960713,
    latitude: 9.4510491,
  },
  {
    jd: 2458849.0, // 2020-Jan-01 12:00
    description: '2020-Jan-01 12:00 TT (near epoch)',
    longitude: 197.465866,
    latitude: 1.7157831,
  },
  {
    jd: 2460840.0, // 2025-Jun-15 12:00
    description: '2025-Jun-15 12:00 TT',
    longitude: 228.0158939,
    latitude: 16.2848685,
  },
] as const;

describe('ephemeris/asteroids/juno', () => {
  describe('getJunoPosition', () => {
    describe('JPL Horizons reference validation', () => {
      // Tolerances scale with distance from J2000.0 epoch due to perturbations
      const tolerances: Record<number, number> = {
        2451545.0: 1.0, // J2000.0 - at epoch, best accuracy
        2458849.0: 2.0, // 2020 - 20 years from epoch
        2460840.0: 2.0, // 2025 - 25 years from epoch
      };

      for (const ref of JPL_JUNO_REFERENCE) {
        const tolerance = tolerances[ref.jd] ?? 6.0;

        it(`should match JPL within ${tolerance}° at ${ref.description}`, () => {
          const juno = getJunoPosition(ref.jd);

          let lonDiff = Math.abs(juno.longitude - ref.longitude);
          if (lonDiff > 180) lonDiff = 360 - lonDiff;

          assert.ok(
            lonDiff < tolerance,
            `Longitude: expected ${ref.longitude.toFixed(4)}° (JPL), got ${juno.longitude.toFixed(4)}° (diff: ${lonDiff.toFixed(2)}°)`,
          );
        });
      }
    });

    it('should return valid position at J2000.0', () => {
      const juno = getJunoPosition(J2000_EPOCH);

      assert.ok(
        juno.longitude >= 0 && juno.longitude < 360,
        `Longitude ${juno.longitude} out of range`,
      );
      assert.ok(
        Math.abs(juno.latitude) < 20,
        `Latitude ${juno.latitude} too extreme for 13° inclination`,
      );
      assert.ok(juno.distance > 1 && juno.distance < 5, `Distance ${juno.distance} out of range`);
    });

    it('should move through zodiac over time', () => {
      const pos1 = getJunoPosition(J2000_EPOCH);
      const pos2 = getJunoPosition(J2000_EPOCH + 365.25);

      let lonDiff = pos2.longitude - pos1.longitude;
      if (lonDiff < -180) lonDiff += 360;
      if (lonDiff > 180) lonDiff -= 360;

      // Juno moves ~82° per year on average (360° / 4.37 years)
      assert.ok(
        Math.abs(lonDiff) > 50 && Math.abs(lonDiff) < 120,
        `Should move 50-120° in one year, got ${lonDiff.toFixed(1)}°`,
      );
    });

    it('should detect retrograde motion periods', () => {
      let retrogradeCount = 0;
      const totalDays = 500;

      for (let i = 0; i < totalDays; i++) {
        const juno = getJunoPosition(J2000_EPOCH + i);
        if (juno.isRetrograde) retrogradeCount++;
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
      const lon = junoHeliocentricLongitude(J2000_EPOCH);
      assert.ok(lon >= 0 && lon < 360);
    });

    it('should have heliocentric distance within perihelion-aphelion range', () => {
      const dist = junoHeliocentricDistance(J2000_EPOCH);
      // Juno: perihelion ~1.99 AU, aphelion ~3.35 AU
      assert.ok(dist > 1.9 && dist < 3.5, `Distance ${dist.toFixed(3)} AU should be 1.9-3.5 AU`);
    });
  });

  describe('JUNO_ORBITAL_ELEMENTS', () => {
    it('should have ~2.67 AU semi-major axis', () => {
      assert.ok(
        Math.abs(JUNO_ORBITAL_ELEMENTS.semiMajorAxis - 2.67) < 0.05,
        'Semi-major axis should be ~2.67 AU',
      );
    });

    it('should have moderate eccentricity (~0.256)', () => {
      assert.ok(
        Math.abs(JUNO_ORBITAL_ELEMENTS.eccentricity - 0.256) < 0.02,
        'Eccentricity should be ~0.256',
      );
    });

    it('should have ~13° inclination', () => {
      assert.ok(Math.abs(JUNO_ORBITAL_ELEMENTS.inclination - 13) < 1, 'Inclination should be ~13°');
    });

    it('should have ~4.4 year orbital period', () => {
      assert.ok(
        Math.abs(JUNO_ORBITAL_ELEMENTS.orbitalPeriodYears - 4.37) < 0.2,
        'Orbital period should be ~4.4 years',
      );
    });
  });
});
