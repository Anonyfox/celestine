/**
 * Tests for Vesta Position Calculator
 *
 * @remarks
 * Verifies Vesta position calculations against:
 * 1. JPL Horizons reference data (authoritative)
 * 2. Known orbital characteristics
 *
 * Vesta is the second-largest asteroid and brightest as seen from Earth.
 * It has the shortest orbital period (~3.6 years) of the major asteroids.
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { J2000_EPOCH } from '../constants.js';
import {
  getVestaPosition,
  VESTA_ORBITAL_ELEMENTS,
  vestaHeliocentricDistance,
  vestaHeliocentricLongitude,
} from './vesta.js';

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
const JPL_VESTA_REFERENCE = [
  {
    jd: 2451545.0,
    description: 'J2000.0 (2000-Jan-01 12:00 TT)',
    longitude: 245.9719858,
    latitude: 4.2520361,
  },
  {
    jd: 2458849.0, // 2020-Jan-01 12:00
    description: '2020-Jan-01 12:00 TT (near epoch)',
    longitude: 42.1169156,
    latitude: -6.5366986,
  },
  {
    jd: 2460840.0, // 2025-Jun-15 12:00
    description: '2025-Jun-15 12:00 TT',
    longitude: 215.3596221,
    latitude: 8.4282921,
  },
] as const;

describe('ephemeris/asteroids/vesta', () => {
  describe('getVestaPosition', () => {
    describe('JPL Horizons reference validation', () => {
      // Vesta has shorter period so more orbits since J2000.0
      // This can accumulate more error for older dates
      const tolerances: Record<number, number> = {
        2451545.0: 8.0, // J2000.0 - ~7 orbits since epoch
        2458849.0: 3.0, // 2020 - ~1.5 orbits from epoch
        2460840.0: 1.5, // 2025 - near epoch
      };

      for (const ref of JPL_VESTA_REFERENCE) {
        const tolerance = tolerances[ref.jd] ?? 8.0;

        it(`should match JPL within ${tolerance}° at ${ref.description}`, () => {
          const vesta = getVestaPosition(ref.jd);

          let lonDiff = Math.abs(vesta.longitude - ref.longitude);
          if (lonDiff > 180) lonDiff = 360 - lonDiff;

          assert.ok(
            lonDiff < tolerance,
            `Longitude: expected ${ref.longitude.toFixed(4)}° (JPL), got ${vesta.longitude.toFixed(4)}° (diff: ${lonDiff.toFixed(2)}°)`,
          );
        });
      }
    });

    it('should return valid position at J2000.0', () => {
      const vesta = getVestaPosition(J2000_EPOCH);

      assert.ok(vesta.longitude >= 0 && vesta.longitude < 360);
      assert.ok(Math.abs(vesta.latitude) < 15, 'Low inclination ~7.1°');
      assert.ok(vesta.distance > 1 && vesta.distance < 4);
    });

    it('should move faster than other asteroids (~100°/year)', () => {
      const pos1 = getVestaPosition(J2000_EPOCH);
      const pos2 = getVestaPosition(J2000_EPOCH + 365.25);

      let lonDiff = pos2.longitude - pos1.longitude;
      if (lonDiff < -180) lonDiff += 360;
      if (lonDiff > 180) lonDiff -= 360;

      // Vesta moves ~99° per year (360° / 3.63 years)
      assert.ok(
        Math.abs(lonDiff) > 60 && Math.abs(lonDiff) < 140,
        `Should move 60-140° in one year (shorter period), got ${lonDiff.toFixed(1)}°`,
      );
    });

    it('should detect retrograde motion periods', () => {
      let retrogradeCount = 0;
      const totalDays = 500;

      for (let i = 0; i < totalDays; i++) {
        const vesta = getVestaPosition(J2000_EPOCH + i);
        if (vesta.isRetrograde) retrogradeCount++;
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
      const lon = vestaHeliocentricLongitude(J2000_EPOCH);
      assert.ok(lon >= 0 && lon < 360);
    });

    it('should have heliocentric distance within perihelion-aphelion range', () => {
      const dist = vestaHeliocentricDistance(J2000_EPOCH);
      // Vesta: perihelion ~2.15 AU, aphelion ~2.57 AU (nearly circular)
      assert.ok(dist > 2.1 && dist < 2.6, `Distance ${dist.toFixed(3)} AU should be 2.1-2.6 AU`);
    });

    it('should have small distance variation (low eccentricity)', () => {
      let minDist = Infinity;
      let maxDist = 0;

      const period = VESTA_ORBITAL_ELEMENTS.orbitalPeriod;
      for (let i = 0; i < period; i += 30) {
        const dist = vestaHeliocentricDistance(J2000_EPOCH + i);
        minDist = Math.min(minDist, dist);
        maxDist = Math.max(maxDist, dist);
      }

      const ratio = maxDist / minDist;
      assert.ok(ratio < 1.25, `Distance ratio ${ratio.toFixed(2)} should be < 1.25 for low e`);
    });
  });

  describe('VESTA_ORBITAL_ELEMENTS', () => {
    it('should have ~2.36 AU semi-major axis (innermost major asteroid)', () => {
      assert.ok(
        Math.abs(VESTA_ORBITAL_ELEMENTS.semiMajorAxis - 2.36) < 0.05,
        'Semi-major axis should be ~2.36 AU',
      );
    });

    it('should have low eccentricity (~0.09)', () => {
      assert.ok(
        VESTA_ORBITAL_ELEMENTS.eccentricity < 0.1,
        'Vesta has low eccentricity (nearly circular)',
      );
    });

    it('should have low inclination (~7.1°)', () => {
      assert.ok(
        Math.abs(VESTA_ORBITAL_ELEMENTS.inclination - 7.1) < 0.5,
        'Inclination should be ~7.1°',
      );
    });

    it('should have shortest period of major asteroids (~3.6 years)', () => {
      assert.ok(
        VESTA_ORBITAL_ELEMENTS.orbitalPeriodYears < 4,
        'Vesta has shortest period < 4 years',
      );
    });
  });
});
