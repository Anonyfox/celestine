/**
 * Tests for Chiron Position Calculator
 *
 * @remarks
 * Verifies Chiron position calculations against:
 * 1. Orbital mechanics (period, distance range)
 * 2. Known astronomical characteristics
 *
 * Note: Chiron uses Keplerian orbital elements since Swiss Ephemeris
 * requires additional asteroid files. Accuracy is reasonable for
 * astrological purposes (~1° for dates near J2000).
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  CHIRON_ORBITAL_ELEMENTS,
  chironHeliocentricDistance,
  chironHeliocentricLatitude,
  chironHeliocentricLongitude,
  getChironPosition,
} from './chiron.js';
import { J2000_EPOCH } from './constants.js';

// =============================================================================
// JPL HORIZONS REFERENCE DATA
// Source: NASA JPL Horizons System (https://ssd.jpl.nasa.gov/horizons/)
// Query: COMMAND='2060;', EPHEM_TYPE='OBSERVER', CENTER='500@399', QUANTITIES='31'
// Retrieved: 2025-Dec-19
// These values are AUTHORITATIVE - do not modify!
// =============================================================================
const JPL_CHIRON_REFERENCE = [
  { jd: 2451545.0, description: 'J2000.0', longitude: 251.617609, latitude: 4.0717061 },
  { jd: 2458850.0, description: '2020-Jan-01 12:00', longitude: 1.6050359, latitude: 2.9200879 },
  { jd: 2448058.0, description: '1990-Jun-15 12:00', longitude: 106.0605042, latitude: -6.2666059 },
] as const;

describe('ephemeris/chiron', () => {
  describe('JPL Horizons reference validation', () => {
    // Chiron uses Keplerian elements - expect larger tolerance for dates far from epoch
    for (const ref of JPL_CHIRON_REFERENCE) {
      it(`should match JPL Horizons at ${ref.description}`, () => {
        const chiron = getChironPosition(ref.jd);
        let lonDiff = Math.abs(chiron.longitude - ref.longitude);
        if (lonDiff > 180) lonDiff = 360 - lonDiff;
        const tolerance = ref.jd === 2451545.0 ? 1.0 : 3.0; // Tighter for J2000.0
        assert.ok(
          lonDiff < tolerance,
          `Longitude: expected ${ref.longitude}° (JPL), got ${chiron.longitude.toFixed(4)}° (diff: ${lonDiff.toFixed(2)}°)`,
        );
      });
    }
  });
  describe('Heliocentric coordinates', () => {
    describe('chironHeliocentricLongitude', () => {
      it('should return value in range [0, 360)', () => {
        const jd = J2000_EPOCH;
        const lon = chironHeliocentricLongitude(jd);
        assert.ok(lon >= 0 && lon < 360, `Expected 0-360°, got ${lon}`);
      });

      it('should advance according to Keplerian motion', () => {
        const jd0 = J2000_EPOCH;
        const jd1 = J2000_EPOCH + 365.25;
        const lon0 = chironHeliocentricLongitude(jd0);
        const lon1 = chironHeliocentricLongitude(jd1);

        let deltaLon = lon1 - lon0;
        if (deltaLon < -180) deltaLon += 360;
        if (deltaLon > 180) deltaLon -= 360;

        // Mean motion is ~7.14°/year (360° / 50.4 years)
        // But Chiron was near perihelion at J2000.0 (MA=28°), so faster motion
        // At perihelion, speed can be ~1.6x mean (due to e=0.379)
        assert.ok(deltaLon > 5 && deltaLon < 15, `Expected 5-15°/year, got ${deltaLon}°`);
      });

      it('should complete orbit in ~50.4 years', () => {
        const jd0 = J2000_EPOCH;
        const jd1 = J2000_EPOCH + 50.4 * 365.25;
        const lon0 = chironHeliocentricLongitude(jd0);
        const lon1 = chironHeliocentricLongitude(jd1);

        let diff = Math.abs(lon1 - lon0);
        if (diff > 180) diff = 360 - diff;

        // Should return to nearly same position
        assert.ok(diff < 5, `After one orbit, should return within 5°, got ${diff}°`);
      });
    });

    describe('chironHeliocentricLatitude', () => {
      it('should be within ±7° (inclination is 6.93°)', () => {
        // Sample over several years
        let maxLat = -Infinity;
        let minLat = Infinity;

        for (let i = 0; i < 50; i++) {
          const jd = J2000_EPOCH + i * 365.25;
          const lat = chironHeliocentricLatitude(jd);
          maxLat = Math.max(maxLat, lat);
          minLat = Math.min(minLat, lat);
        }

        assert.ok(maxLat < 8, `Max latitude should be < 8°, got ${maxLat}°`);
        assert.ok(minLat > -8, `Min latitude should be > -8°, got ${minLat}°`);
      });
    });

    describe('chironHeliocentricDistance', () => {
      it('should be in range at J2000.0', () => {
        const jd = J2000_EPOCH;
        const dist = chironHeliocentricDistance(jd);

        // Chiron's distance varies from ~8.5 AU (perihelion) to ~18.8 AU (aphelion)
        assert.ok(dist > 8 && dist < 19, `Expected 8-19 AU, got ${dist} AU`);
      });

      it('should vary between perihelion and aphelion over orbit', () => {
        let minDist = Infinity;
        let maxDist = 0;

        // Sample over full orbit (~50 years)
        for (let i = 0; i < 50; i++) {
          const jd = J2000_EPOCH + i * 365.25;
          const dist = chironHeliocentricDistance(jd);
          minDist = Math.min(minDist, dist);
          maxDist = Math.max(maxDist, dist);
        }

        // Perihelion ~8.46 AU, Aphelion ~18.83 AU
        assert.ok(minDist < 10, `Min distance should be < 10 AU, got ${minDist} AU`);
        assert.ok(maxDist > 17, `Max distance should be > 17 AU, got ${maxDist} AU`);
      });
    });
  });

  describe('getChironPosition', () => {
    describe('J2000.0 epoch', () => {
      it('should return geocentric position', () => {
        const jd = J2000_EPOCH;
        const chiron = getChironPosition(jd);

        assert.ok(chiron.longitude >= 0 && chiron.longitude < 360);
        assert.ok(typeof chiron.latitude === 'number');
        assert.ok(chiron.distance > 0);
      });

      it('should have reasonable geocentric distance', () => {
        const jd = J2000_EPOCH;
        const chiron = getChironPosition(jd);

        // Geocentric distance varies with Earth's position
        // Range is roughly heliocentric ± 1 AU
        assert.ok(
          chiron.distance > 7 && chiron.distance < 20,
          `Expected 7-20 AU, got ${chiron.distance} AU`,
        );
      });
    });

    describe('Retrograde motion', () => {
      it('should detect retrograde periods', () => {
        // Chiron retrogrades about 140 days per year
        let retrogradeCount = 0;
        const totalDays = 400;

        for (let i = 0; i < totalDays; i++) {
          const jd = J2000_EPOCH + i;
          const chiron = getChironPosition(jd);
          if (chiron.isRetrograde) retrogradeCount++;
        }

        // Should be retrograde ~35-40% of time
        const retrogradePercent = (retrogradeCount / totalDays) * 100;
        assert.ok(
          retrogradePercent > 30 && retrogradePercent < 45,
          `Retrograde ${retrogradePercent}% should be 30-45%`,
        );
      });
    });

    describe('Options', () => {
      it('should calculate speed by default', () => {
        const chiron = getChironPosition(J2000_EPOCH);
        assert.ok(chiron.longitudeSpeed !== 0);
      });

      it('should skip speed calculation when disabled', () => {
        const chiron = getChironPosition(J2000_EPOCH, { includeSpeed: false });
        assert.equal(chiron.longitudeSpeed, 0);
        assert.equal(chiron.isRetrograde, false);
      });
    });

    describe('Historical dates', () => {
      it('should handle dates before and after J2000', () => {
        // 1970
        const chiron1970 = getChironPosition(2440587.5);
        assert.ok(chiron1970.longitude >= 0 && chiron1970.longitude < 360);

        // 2022
        const chiron2022 = getChironPosition(2459580.5);
        assert.ok(chiron2022.longitude >= 0 && chiron2022.longitude < 360);
      });
    });
  });

  describe('CHIRON_ORBITAL_ELEMENTS', () => {
    it('should have correct semi-major axis', () => {
      assert.ok(
        Math.abs(CHIRON_ORBITAL_ELEMENTS.semiMajorAxis - 13.65) < 0.5,
        'Semi-major axis should be ~13.65 AU',
      );
    });

    it('should have high eccentricity', () => {
      assert.ok(CHIRON_ORBITAL_ELEMENTS.eccentricity > 0.35, 'Eccentricity should be > 0.35');
    });

    it('should have moderate inclination', () => {
      assert.ok(
        CHIRON_ORBITAL_ELEMENTS.inclination > 5 && CHIRON_ORBITAL_ELEMENTS.inclination < 10,
        'Inclination should be 5-10°',
      );
    });

    it('should have ~50 year orbital period', () => {
      assert.ok(
        Math.abs(CHIRON_ORBITAL_ELEMENTS.orbitalPeriodYears - 50.4) < 1,
        'Orbital period should be ~50.4 years',
      );
    });

    it('should have perihelion inside Saturn orbit', () => {
      assert.ok(
        CHIRON_ORBITAL_ELEMENTS.perihelion < 10,
        'Perihelion should be < 10 AU (inside Saturn)',
      );
    });

    it('should have aphelion near Uranus orbit', () => {
      assert.ok(CHIRON_ORBITAL_ELEMENTS.aphelion > 18, 'Aphelion should be > 18 AU (near Uranus)');
    });
  });
});
