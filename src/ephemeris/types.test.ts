/**
 * Tests for Ephemeris Type Definitions
 *
 * @remarks
 * These tests verify that type definitions are correctly structured
 * and that enum values are properly defined.
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import type { EphemerisOptions, PlanetPosition, PlanetPositions } from './types.js';
import { Planet } from './types.js';

describe('ephemeris/types', () => {
  describe('Planet enum', () => {
    it('should have all classical celestial bodies', () => {
      // The 7 classical "planets" (visible to naked eye)
      assert.equal(Planet.Sun, 'Sun');
      assert.equal(Planet.Moon, 'Moon');
      assert.equal(Planet.Mercury, 'Mercury');
      assert.equal(Planet.Venus, 'Venus');
      assert.equal(Planet.Mars, 'Mars');
      assert.equal(Planet.Jupiter, 'Jupiter');
      assert.equal(Planet.Saturn, 'Saturn');
    });

    it('should have modern planets', () => {
      // Discovered with telescopes
      assert.equal(Planet.Uranus, 'Uranus');
      assert.equal(Planet.Neptune, 'Neptune');
      assert.equal(Planet.Pluto, 'Pluto');
    });

    it('should have lunar nodes', () => {
      assert.equal(Planet.NorthNode, 'NorthNode');
      assert.equal(Planet.SouthNode, 'SouthNode');
    });

    it('should have additional points', () => {
      assert.equal(Planet.Lilith, 'Lilith');
      assert.equal(Planet.Chiron, 'Chiron');
    });

    it('should have exactly 18 bodies (including asteroids)', () => {
      const planetValues = Object.values(Planet);
      assert.equal(planetValues.length, 18);
    });

    it('should allow iteration over all planets', () => {
      const planets: Planet[] = [];
      for (const planet of Object.values(Planet)) {
        planets.push(planet);
      }
      assert.ok(planets.includes(Planet.Sun));
      assert.ok(planets.includes(Planet.Moon));
      assert.ok(planets.includes(Planet.Pluto));
    });
  });

  describe('PlanetPosition interface', () => {
    it('should accept valid position data', () => {
      // J2000.0 Sun position (approximately)
      const sunPosition: PlanetPosition = {
        longitude: 280.458,
        latitude: 0.0001,
        distance: 0.9833,
        longitudeSpeed: 1.0194,
        isRetrograde: false,
      };

      assert.equal(sunPosition.longitude, 280.458);
      assert.equal(sunPosition.latitude, 0.0001);
      assert.equal(sunPosition.distance, 0.9833);
      assert.equal(sunPosition.longitudeSpeed, 1.0194);
      assert.equal(sunPosition.isRetrograde, false);
    });

    it('should accept retrograde planet data', () => {
      // Example retrograde Mercury
      const mercuryRetrograde: PlanetPosition = {
        longitude: 45.5,
        latitude: -1.2,
        distance: 0.8,
        longitudeSpeed: -1.1,
        isRetrograde: true,
      };

      assert.ok(mercuryRetrograde.longitudeSpeed < 0);
      assert.equal(mercuryRetrograde.isRetrograde, true);
    });

    it('should handle boundary longitude values', () => {
      // 0° Aries
      const ariesStart: PlanetPosition = {
        longitude: 0,
        latitude: 0,
        distance: 1,
        longitudeSpeed: 1,
        isRetrograde: false,
      };
      assert.equal(ariesStart.longitude, 0);

      // Just before 360° (wraps to 0°)
      const pisces29: PlanetPosition = {
        longitude: 359.9999,
        latitude: 0,
        distance: 1,
        longitudeSpeed: 1,
        isRetrograde: false,
      };
      assert.ok(pisces29.longitude < 360);
    });
  });

  describe('EphemerisOptions interface', () => {
    it('should accept empty options (all defaults)', () => {
      const options: EphemerisOptions = {};
      assert.equal(options.includeSpeed, undefined);
      assert.equal(options.includeNutation, undefined);
    });

    it('should accept partial options', () => {
      const options: EphemerisOptions = {
        includeSpeed: true,
        includeNutation: false,
      };
      assert.equal(options.includeSpeed, true);
      assert.equal(options.includeNutation, false);
      assert.equal(options.includeAberration, undefined);
    });

    it('should accept full options', () => {
      const options: EphemerisOptions = {
        includeSpeed: true,
        includeNutation: true,
        includeAberration: true,
        includeLightTime: true,
      };
      assert.equal(options.includeSpeed, true);
      assert.equal(options.includeNutation, true);
      assert.equal(options.includeAberration, true);
      assert.equal(options.includeLightTime, true);
    });
  });

  describe('PlanetPositions type', () => {
    it('should work as a Map of Planet to PlanetPosition', () => {
      const positions: PlanetPositions = new Map();

      const sunPosition: PlanetPosition = {
        longitude: 280.458,
        latitude: 0,
        distance: 0.983,
        longitudeSpeed: 1.02,
        isRetrograde: false,
      };

      const moonPosition: PlanetPosition = {
        longitude: 218.32,
        latitude: 5.1,
        distance: 0.00257,
        longitudeSpeed: 13.2,
        isRetrograde: false,
      };

      positions.set(Planet.Sun, sunPosition);
      positions.set(Planet.Moon, moonPosition);

      assert.equal(positions.size, 2);
      assert.deepEqual(positions.get(Planet.Sun), sunPosition);
      assert.deepEqual(positions.get(Planet.Moon), moonPosition);
      assert.equal(positions.get(Planet.Mars), undefined);
    });
  });
});
