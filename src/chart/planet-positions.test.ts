/**
 * Tests for Planet Positions
 *
 * @remarks
 * Tests validate that the chart planet-positions module correctly wraps
 * the ephemeris module. The underlying ephemeris module is already validated
 * against Swiss Ephemeris - these tests verify correct integration.
 *
 * REFERENCE DATA SOURCES:
 * - Swiss Ephemeris via pyswisseph 2.10.03 (see ephemeris module tests)
 * - JPL Horizons (NASA authoritative source)
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { CelestialBody } from '../ephemeris/positions.js';
import { DEFAULT_OPTIONS } from './constants.js';
import {
  calculateLots,
  calculatePlanetPositions,
  getBodyName,
  isRetrograde,
  isStationary,
  sortedPlanetList,
} from './planet-positions.js';

// J2000.0 epoch Julian Date
const J2000_JD = 2451545.0;

// =============================================================================
// SWISS EPHEMERIS REFERENCE DATA
// Source: pyswisseph 2.10.03 - values from ephemeris module tests
// These values are AUTHORITATIVE - do not modify!
// =============================================================================

const SWISSEPH_J2000 = {
  Sun: { longitude: 280.3689, latitude: 0.0002 },
  Moon: { longitude: 223.3238, latitude: 5.1708 },
  Mercury: { longitude: 271.8893, latitude: -1.6753 },
  Venus: { longitude: 241.5658, latitude: -2.7084 },
  Mars: { longitude: 327.9633, latitude: 0.5896 },
  Jupiter: { longitude: 25.2531, latitude: 1.2649 },
  Saturn: { longitude: 40.3956, latitude: 2.4869 },
  Uranus: { longitude: 314.8092, latitude: -0.7241 },
  Neptune: { longitude: 303.193, latitude: 0.2573 },
  Pluto: { longitude: 251.4548, latitude: 11.0686 },
} as const;

// Tolerance: 2 arcminutes = 0.0333 degrees
const LONGITUDE_TOLERANCE = 0.034;

describe('chart/planet-positions', () => {
  describe('calculatePlanetPositions', () => {
    it('should return all 10 main planets', () => {
      const positions = calculatePlanetPositions(J2000_JD, {
        ...DEFAULT_OPTIONS,
        includeAsteroids: false,
        includeChiron: false,
        includeLilith: false,
        includeNodes: false,
      } as Required<typeof DEFAULT_OPTIONS>);

      assert.equal(positions.planets.size, 10);
      assert.ok(positions.planets.has(CelestialBody.Sun));
      assert.ok(positions.planets.has(CelestialBody.Moon));
      assert.ok(positions.planets.has(CelestialBody.Mercury));
      assert.ok(positions.planets.has(CelestialBody.Venus));
      assert.ok(positions.planets.has(CelestialBody.Mars));
      assert.ok(positions.planets.has(CelestialBody.Jupiter));
      assert.ok(positions.planets.has(CelestialBody.Saturn));
      assert.ok(positions.planets.has(CelestialBody.Uranus));
      assert.ok(positions.planets.has(CelestialBody.Neptune));
      assert.ok(positions.planets.has(CelestialBody.Pluto));
    });

    it('should include Chiron when enabled', () => {
      const positions = calculatePlanetPositions(J2000_JD, {
        ...DEFAULT_OPTIONS,
        includeChiron: true,
      } as Required<typeof DEFAULT_OPTIONS>);

      assert.ok(positions.chiron);
      assert.ok(Number.isFinite(positions.chiron.longitude));
    });

    it('should include asteroids when enabled', () => {
      const positions = calculatePlanetPositions(J2000_JD, {
        ...DEFAULT_OPTIONS,
        includeAsteroids: true,
      } as Required<typeof DEFAULT_OPTIONS>);

      assert.ok(positions.asteroids);
      assert.ok(positions.asteroids.ceres);
      assert.ok(positions.asteroids.pallas);
      assert.ok(positions.asteroids.juno);
      assert.ok(positions.asteroids.vesta);
    });

    it('should include true nodes when enabled', () => {
      const positions = calculatePlanetPositions(J2000_JD, {
        ...DEFAULT_OPTIONS,
        includeNodes: 'true',
      } as Required<typeof DEFAULT_OPTIONS>);

      assert.ok(positions.nodes);
      assert.ok(positions.nodes.trueNorth);
      assert.ok(positions.nodes.trueSouth);
      assert.ok(Number.isFinite(positions.nodes.trueNorth.longitude));
      assert.ok(Number.isFinite(positions.nodes.trueSouth.longitude));
    });

    it('should include mean nodes when enabled', () => {
      const positions = calculatePlanetPositions(J2000_JD, {
        ...DEFAULT_OPTIONS,
        includeNodes: 'mean',
      } as Required<typeof DEFAULT_OPTIONS>);

      assert.ok(positions.nodes);
      assert.ok(positions.nodes.meanNorth);
      assert.ok(positions.nodes.meanSouth);
    });

    it('should include both node types when configured', () => {
      const positions = calculatePlanetPositions(J2000_JD, {
        ...DEFAULT_OPTIONS,
        includeNodes: 'both',
      } as Required<typeof DEFAULT_OPTIONS>);

      assert.ok(positions.nodes);
      assert.ok(positions.nodes.trueNorth);
      assert.ok(positions.nodes.trueSouth);
      assert.ok(positions.nodes.meanNorth);
      assert.ok(positions.nodes.meanSouth);
    });

    it('should include mean Lilith when enabled', () => {
      const positions = calculatePlanetPositions(J2000_JD, {
        ...DEFAULT_OPTIONS,
        includeLilith: 'mean',
      } as Required<typeof DEFAULT_OPTIONS>);

      assert.ok(positions.lilith);
      assert.ok(positions.lilith.mean);
      assert.ok(Number.isFinite(positions.lilith.mean.longitude));
    });

    it('should include true Lilith when enabled', () => {
      const positions = calculatePlanetPositions(J2000_JD, {
        ...DEFAULT_OPTIONS,
        includeLilith: 'true',
      } as Required<typeof DEFAULT_OPTIONS>);

      assert.ok(positions.lilith);
      assert.ok(positions.lilith.true);
    });

    describe('Swiss Ephemeris validation', () => {
      /**
       * Validates planetary positions against Swiss Ephemeris reference data.
       * These tests ensure the ephemeris wrapper correctly passes through data.
       */

      it('should match Swiss Ephemeris Sun position at J2000.0', () => {
        const positions = calculatePlanetPositions(
          J2000_JD,
          DEFAULT_OPTIONS as Required<typeof DEFAULT_OPTIONS>,
        );
        const sun = positions.planets.get(CelestialBody.Sun);

        assert.ok(sun);
        const diff = Math.abs(sun.longitude - SWISSEPH_J2000.Sun.longitude);
        assert.ok(
          diff < LONGITUDE_TOLERANCE,
          `Sun longitude: expected ${SWISSEPH_J2000.Sun.longitude}°, got ${sun.longitude.toFixed(4)}°`,
        );
      });

      it('should match Swiss Ephemeris Moon position at J2000.0', () => {
        const positions = calculatePlanetPositions(
          J2000_JD,
          DEFAULT_OPTIONS as Required<typeof DEFAULT_OPTIONS>,
        );
        const moon = positions.planets.get(CelestialBody.Moon);

        assert.ok(moon);
        const diff = Math.abs(moon.longitude - SWISSEPH_J2000.Moon.longitude);
        assert.ok(
          diff < LONGITUDE_TOLERANCE,
          `Moon longitude: expected ${SWISSEPH_J2000.Moon.longitude}°, got ${moon.longitude.toFixed(4)}°`,
        );
      });

      it('should match Swiss Ephemeris Mercury position at J2000.0', () => {
        const positions = calculatePlanetPositions(
          J2000_JD,
          DEFAULT_OPTIONS as Required<typeof DEFAULT_OPTIONS>,
        );
        const mercury = positions.planets.get(CelestialBody.Mercury);

        assert.ok(mercury);
        const diff = Math.abs(mercury.longitude - SWISSEPH_J2000.Mercury.longitude);
        assert.ok(
          diff < LONGITUDE_TOLERANCE,
          `Mercury longitude: expected ${SWISSEPH_J2000.Mercury.longitude}°, got ${mercury.longitude.toFixed(4)}°`,
        );
      });
    });

    describe('Node calculations', () => {
      it('should have South Node opposite North Node', () => {
        const positions = calculatePlanetPositions(J2000_JD, {
          ...DEFAULT_OPTIONS,
          includeNodes: 'true',
        } as Required<typeof DEFAULT_OPTIONS>);

        const north = positions.nodes!.trueNorth!.longitude;
        const south = positions.nodes!.trueSouth!.longitude;

        let expectedSouth = north + 180;
        if (expectedSouth >= 360) expectedSouth -= 360;

        assert.ok(
          Math.abs(south - expectedSouth) < 0.001,
          `South Node should be opposite North Node: ${north}° + 180° = ${expectedSouth}°, got ${south}°`,
        );
      });

      it('should have nodes in valid range (0-360)', () => {
        const positions = calculatePlanetPositions(J2000_JD, {
          ...DEFAULT_OPTIONS,
          includeNodes: 'both',
        } as Required<typeof DEFAULT_OPTIONS>);

        assert.ok(positions.nodes!.trueNorth!.longitude >= 0);
        assert.ok(positions.nodes!.trueNorth!.longitude < 360);
        assert.ok(positions.nodes!.trueSouth!.longitude >= 0);
        assert.ok(positions.nodes!.trueSouth!.longitude < 360);
        assert.ok(positions.nodes!.meanNorth!.longitude >= 0);
        assert.ok(positions.nodes!.meanNorth!.longitude < 360);
        assert.ok(positions.nodes!.meanSouth!.longitude >= 0);
        assert.ok(positions.nodes!.meanSouth!.longitude < 360);
      });
    });
  });

  describe('calculateLots', () => {
    it('should calculate Part of Fortune', () => {
      const lots = calculateLots(280, 220, 0, true, true);

      assert.ok(lots.fortune);
      assert.ok(Number.isFinite(lots.fortune.longitude));
      assert.ok(lots.fortune.longitude >= 0);
      assert.ok(lots.fortune.longitude < 360);
    });

    it('should calculate Part of Spirit', () => {
      const lots = calculateLots(280, 220, 0, true, true);

      assert.ok(lots.spirit);
      assert.ok(Number.isFinite(lots.spirit.longitude));
    });

    it('should return empty object when disabled', () => {
      const lots = calculateLots(280, 220, 0, true, false);

      assert.equal(lots.fortune, undefined);
      assert.equal(lots.spirit, undefined);
    });

    it('should use correct day formula (ASC + Moon - Sun)', () => {
      // Day chart: Fortune = ASC + Moon - Sun
      // ASC=0, Moon=90, Sun=180 → Fortune = 0 + 90 - 180 = -90 → normalized to 270
      const lots = calculateLots(180, 90, 0, true, true);

      // Expected: 0 + 90 - 180 = -90 → 270°
      assert.ok(
        Math.abs(lots.fortune!.longitude - 270) < 1,
        `Day formula expected ~270°, got ${lots.fortune!.longitude}°`,
      );
    });

    it('should use correct night formula (ASC + Sun - Moon)', () => {
      // Night chart: Fortune = ASC + Sun - Moon
      // ASC=0, Moon=90, Sun=180 → Fortune = 0 + 180 - 90 = 90
      const lots = calculateLots(180, 90, 0, false, true);

      // Expected: 0 + 180 - 90 = 90°
      assert.ok(
        Math.abs(lots.fortune!.longitude - 90) < 1,
        `Night formula expected ~90°, got ${lots.fortune!.longitude}°`,
      );
    });
  });

  describe('isRetrograde', () => {
    it('should return true for negative speed', () => {
      assert.equal(
        isRetrograde({
          longitude: 0,
          latitude: 0,
          distance: 1,
          longitudeSpeed: -0.5,
          isRetrograde: true,
        }),
        true,
      );
    });

    it('should return false for positive speed', () => {
      assert.equal(
        isRetrograde({
          longitude: 0,
          latitude: 0,
          distance: 1,
          longitudeSpeed: 0.5,
          isRetrograde: false,
        }),
        false,
      );
    });

    it('should return false for zero speed', () => {
      assert.equal(
        isRetrograde({
          longitude: 0,
          latitude: 0,
          distance: 1,
          longitudeSpeed: 0,
          isRetrograde: false,
        }),
        false,
      );
    });
  });

  describe('isStationary', () => {
    it('should return true for very slow motion', () => {
      assert.equal(
        isStationary({
          longitude: 0,
          latitude: 0,
          distance: 1,
          longitudeSpeed: 0.005,
          isRetrograde: false,
        }),
        true,
      );
    });

    it('should return false for normal motion', () => {
      assert.equal(
        isStationary({
          longitude: 0,
          latitude: 0,
          distance: 1,
          longitudeSpeed: 0.5,
          isRetrograde: false,
        }),
        false,
      );
    });
  });

  describe('getBodyName', () => {
    it('should return correct name for Sun', () => {
      assert.equal(getBodyName(CelestialBody.Sun), 'Sun');
    });

    it('should return correct name for Moon', () => {
      assert.equal(getBodyName(CelestialBody.Moon), 'Moon');
    });

    it('should return correct name for planets', () => {
      assert.equal(getBodyName(CelestialBody.Mercury), 'Mercury');
      assert.equal(getBodyName(CelestialBody.Venus), 'Venus');
      assert.equal(getBodyName(CelestialBody.Mars), 'Mars');
      assert.equal(getBodyName(CelestialBody.Jupiter), 'Jupiter');
      assert.equal(getBodyName(CelestialBody.Saturn), 'Saturn');
      assert.equal(getBodyName(CelestialBody.Uranus), 'Uranus');
      assert.equal(getBodyName(CelestialBody.Neptune), 'Neptune');
      assert.equal(getBodyName(CelestialBody.Pluto), 'Pluto');
    });

    it('should return correct name for Chiron', () => {
      assert.equal(getBodyName(CelestialBody.Chiron), 'Chiron');
    });

    it('should return correct name for asteroids', () => {
      assert.equal(getBodyName(CelestialBody.Ceres), 'Ceres');
      assert.equal(getBodyName(CelestialBody.Pallas), 'Pallas');
      assert.equal(getBodyName(CelestialBody.Juno), 'Juno');
      assert.equal(getBodyName(CelestialBody.Vesta), 'Vesta');
    });
  });

  describe('sortedPlanetList', () => {
    it('should return planets in traditional order', () => {
      const positions = calculatePlanetPositions(
        J2000_JD,
        DEFAULT_OPTIONS as Required<typeof DEFAULT_OPTIONS>,
      );
      const sorted = sortedPlanetList(positions.planets);

      const names = sorted.map(([body]) => body);
      assert.deepEqual(names, [
        CelestialBody.Sun,
        CelestialBody.Moon,
        CelestialBody.Mercury,
        CelestialBody.Venus,
        CelestialBody.Mars,
        CelestialBody.Jupiter,
        CelestialBody.Saturn,
        CelestialBody.Uranus,
        CelestialBody.Neptune,
        CelestialBody.Pluto,
      ]);
    });
  });
});
