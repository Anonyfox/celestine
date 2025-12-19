/**
 * Integration Tests for Chart Calculation
 *
 * @remarks
 * These tests validate the complete chart calculation pipeline using
 * real-world birth data. Reference values come from established sources.
 *
 * REFERENCE DATA SOURCES:
 * - Swiss Ephemeris (planetary positions)
 * - astro.com (house cusps, angles)
 * - Historical birth records
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { calculateChart, getAvailableHouseSystems, validateBirth } from './chart.js';
import { DEFAULT_OPTIONS } from './constants.js';
import type { BirthData } from './types.js';

// =============================================================================
// TEST FIXTURES - Famous Charts with Verified Data
// =============================================================================

/**
 * J2000.0 Epoch (January 1, 2000, 12:00 UTC) - Standard Reference Point
 * Location: Royal Greenwich Observatory
 */
const J2000_GREENWICH: BirthData = {
  year: 2000,
  month: 1,
  day: 1,
  hour: 12,
  minute: 0,
  second: 0,
  timezone: 0,
  latitude: 51.4769,
  longitude: 0.0005,
};

/**
 * Example birth data for testing
 * London, UK - Noon on Summer Solstice 2024
 */
const _SUMMER_SOLSTICE_2024: BirthData = {
  year: 2024,
  month: 6,
  day: 20,
  hour: 12,
  minute: 0,
  second: 0,
  timezone: 1, // BST
  latitude: 51.5074,
  longitude: -0.1278,
};

// Tolerance: 30 arcminutes (0.5°) for planetary positions
const POSITION_TOLERANCE = 0.5;

describe('chart/chart', () => {
  describe('calculateChart', () => {
    describe('J2000.0 Epoch Reference', () => {
      it('should calculate chart for J2000.0 epoch', () => {
        const chart = calculateChart(J2000_GREENWICH);

        assert.ok(chart);
        assert.ok(chart.planets.length > 0);
        assert.ok(chart.houses.cusps.length === 12);
        assert.ok(chart.aspects.count >= 0);
      });

      it('should have Sun in Capricorn at J2000.0', () => {
        const chart = calculateChart(J2000_GREENWICH);
        const sun = chart.planets.find((p) => p.name === 'Sun');

        assert.ok(sun);
        assert.equal(sun.signName, 'Capricorn');
        // Sun at J2000.0 ≈ 280.37° (10° Capricorn)
        assert.ok(
          Math.abs(sun.longitude - 280.37) < POSITION_TOLERANCE,
          `Sun longitude: expected ~280.37°, got ${sun.longitude.toFixed(2)}°`,
        );
      });

      it('should have Moon in Scorpio at J2000.0', () => {
        const chart = calculateChart(J2000_GREENWICH);
        const moon = chart.planets.find((p) => p.name === 'Moon');

        assert.ok(moon);
        // Moon at J2000.0 ≈ 223.32° (Scorpio)
        assert.ok(
          Math.abs(moon.longitude - 223.32) < POSITION_TOLERANCE * 2, // Moon moves fast, larger tolerance
          `Moon longitude: expected ~223.32°, got ${moon.longitude.toFixed(2)}°`,
        );
      });

      it('should calculate Julian Date correctly', () => {
        const chart = calculateChart(J2000_GREENWICH);

        // J2000.0 = JD 2451545.0
        assert.equal(chart.calculated.julianDate, 2451545.0);
      });

      it('should calculate Julian Centuries correctly', () => {
        const chart = calculateChart(J2000_GREENWICH);

        // T = 0 at J2000.0
        assert.equal(chart.calculated.julianCenturies, 0);
      });
    });

    describe('Chart Structure', () => {
      it('should include all traditional planets', () => {
        const chart = calculateChart(J2000_GREENWICH);

        const planetNames = chart.planets.map((p) => p.name);
        const traditional = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];

        for (const name of traditional) {
          assert.ok(planetNames.includes(name), `Missing planet: ${name}`);
        }
      });

      it('should include outer planets', () => {
        const chart = calculateChart(J2000_GREENWICH);

        const planetNames = chart.planets.map((p) => p.name);
        assert.ok(planetNames.includes('Uranus'));
        assert.ok(planetNames.includes('Neptune'));
        assert.ok(planetNames.includes('Pluto'));
      });

      it('should have four angles', () => {
        const chart = calculateChart(J2000_GREENWICH);

        assert.ok(chart.angles.ascendant);
        assert.ok(chart.angles.midheaven);
        assert.ok(chart.angles.descendant);
        assert.ok(chart.angles.imumCoeli);

        // DSC opposite ASC
        let expectedDSC = chart.angles.ascendant.longitude + 180;
        if (expectedDSC >= 360) expectedDSC -= 360;
        assert.ok(Math.abs(chart.angles.descendant.longitude - expectedDSC) < 0.01);

        // IC opposite MC
        let expectedIC = chart.angles.midheaven.longitude + 180;
        if (expectedIC >= 360) expectedIC -= 360;
        assert.ok(Math.abs(chart.angles.imumCoeli.longitude - expectedIC) < 0.01);
      });

      it('should have 12 house cusps', () => {
        const chart = calculateChart(J2000_GREENWICH);

        assert.equal(chart.houses.cusps.length, 12);

        for (let i = 0; i < 12; i++) {
          assert.equal(chart.houses.cusps[i].house, i + 1);
          assert.ok(chart.houses.cusps[i].longitude >= 0);
          assert.ok(chart.houses.cusps[i].longitude < 360);
        }
      });

      it('should detect aspects', () => {
        const chart = calculateChart(J2000_GREENWICH);

        // With 10 planets, there should be several aspects
        assert.ok(chart.aspects.count > 0, 'Should find at least some aspects');
        assert.ok(chart.aspects.all.length === chart.aspects.count);
      });

      it('should include lunar nodes', () => {
        const chart = calculateChart(J2000_GREENWICH);

        assert.ok(chart.nodes.length >= 2);
        const north = chart.nodes.find((n) => n.name === 'North Node');
        const south = chart.nodes.find((n) => n.name === 'South Node');
        assert.ok(north);
        assert.ok(south);

        // South opposite North
        let expectedSouth = north.longitude + 180;
        if (expectedSouth >= 360) expectedSouth -= 360;
        assert.ok(Math.abs(south.longitude - expectedSouth) < 0.01);
      });

      it('should have calculated time information', () => {
        const chart = calculateChart(J2000_GREENWICH);

        assert.ok(chart.calculated);
        assert.ok(chart.calculated.julianDate > 0);
        assert.ok(Number.isFinite(chart.calculated.julianCenturies));
        assert.ok(chart.calculated.greenwichSiderealTime >= 0);
        assert.ok(chart.calculated.greenwichSiderealTime < 360);
        assert.ok(chart.calculated.localSiderealTime >= 0);
        assert.ok(chart.calculated.localSiderealTime < 360);
        assert.ok(Math.abs(chart.calculated.obliquity - 23.44) < 0.1);
      });
    });

    describe('Options', () => {
      it('should use default house system (Placidus)', () => {
        const chart = calculateChart(J2000_GREENWICH);

        assert.equal(chart.houses.system, 'placidus');
      });

      it('should use specified house system', () => {
        const chart = calculateChart(J2000_GREENWICH, { houseSystem: 'equal' });

        assert.equal(chart.houses.system, 'equal');
      });

      it('should include Chiron when enabled', () => {
        const chart = calculateChart(J2000_GREENWICH, { includeChiron: true });

        const chiron = chart.planets.find((p) => p.name === 'Chiron');
        assert.ok(chiron);
      });

      it('should include asteroids when enabled', () => {
        const chart = calculateChart(J2000_GREENWICH, { includeAsteroids: true });

        const planetNames = chart.planets.map((p) => p.name);
        assert.ok(planetNames.includes('Ceres'));
        assert.ok(planetNames.includes('Pallas'));
        assert.ok(planetNames.includes('Juno'));
        assert.ok(planetNames.includes('Vesta'));
      });

      it('should include Lilith when enabled', () => {
        const chart = calculateChart(J2000_GREENWICH, { includeLilith: 'mean' });

        assert.ok(chart.lilith);
        assert.ok(chart.lilith.length > 0);
      });
    });

    describe('Timezone handling', () => {
      it('should handle positive timezone (CET)', () => {
        const berlin: BirthData = {
          year: 2000,
          month: 6,
          day: 21,
          hour: 12,
          minute: 0,
          second: 0,
          timezone: 2, // CEST
          latitude: 52.52,
          longitude: 13.405,
        };

        const chart = calculateChart(berlin);
        assert.ok(chart);
        assert.ok(chart.planets.length > 0);
      });

      it('should handle negative timezone (EST)', () => {
        const nyc: BirthData = {
          year: 2000,
          month: 1,
          day: 1,
          hour: 12,
          minute: 0,
          second: 0,
          timezone: -5,
          latitude: 40.7128,
          longitude: -74.006,
        };

        const chart = calculateChart(nyc);
        assert.ok(chart);
        assert.ok(chart.planets.length > 0);
      });

      it('should handle fractional timezone (India +5:30)', () => {
        const delhi: BirthData = {
          year: 2000,
          month: 1,
          day: 1,
          hour: 12,
          minute: 0,
          second: 0,
          timezone: 5.5,
          latitude: 28.6139,
          longitude: 77.209,
        };

        const chart = calculateChart(delhi);
        assert.ok(chart);
        assert.ok(chart.planets.length > 0);
      });
    });

    describe('Latitude handling', () => {
      it('should calculate chart at equator', () => {
        const equator: BirthData = {
          year: 2000,
          month: 1,
          day: 1,
          hour: 12,
          minute: 0,
          second: 0,
          timezone: 0,
          latitude: 0,
          longitude: 0,
        };

        const chart = calculateChart(equator);
        assert.ok(chart);
        assert.ok(chart.houses.cusps.length === 12);
      });

      it('should calculate chart in southern hemisphere', () => {
        const sydney: BirthData = {
          year: 2000,
          month: 1,
          day: 1,
          hour: 12,
          minute: 0,
          second: 0,
          timezone: 11,
          latitude: -33.8688,
          longitude: 151.2093,
        };

        const chart = calculateChart(sydney);
        assert.ok(chart);
        assert.ok(chart.houses.cusps.length === 12);
      });

      it('should fallback house system at high latitude', () => {
        const arctic: BirthData = {
          year: 2000,
          month: 6,
          day: 21,
          hour: 12,
          minute: 0,
          second: 0,
          timezone: 2,
          latitude: 70,
          longitude: 25,
        };

        const chart = calculateChart(arctic, { houseSystem: 'placidus' });
        assert.ok(chart);
        // Should fallback from Placidus at 70° latitude
        assert.notEqual(chart.houses.system, 'placidus');
      });
    });

    describe('Planet properties', () => {
      it('should include zodiac position for each planet', () => {
        const chart = calculateChart(J2000_GREENWICH);

        for (const planet of chart.planets) {
          assert.ok(planet.sign >= 0 && planet.sign < 12);
          assert.ok(planet.signName);
          assert.ok(planet.degree >= 0 && planet.degree < 30);
          assert.ok(planet.minute >= 0 && planet.minute < 60);
          assert.ok(planet.formatted);
        }
      });

      it('should include house placement for each planet', () => {
        const chart = calculateChart(J2000_GREENWICH);

        for (const planet of chart.planets) {
          assert.ok(planet.house >= 1 && planet.house <= 12);
        }
      });

      it('should include dignity for traditional planets', () => {
        const chart = calculateChart(J2000_GREENWICH);

        const traditionalNames = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];
        for (const planet of chart.planets) {
          if (traditionalNames.includes(planet.name)) {
            assert.ok(planet.dignity);
            assert.ok(planet.dignity.state);
          }
        }
      });

      it('should detect retrograde planets', () => {
        const chart = calculateChart(J2000_GREENWICH);

        // Check that retrograde property exists
        for (const planet of chart.planets) {
          assert.ok(typeof planet.isRetrograde === 'boolean');
        }
      });
    });
  });

  describe('getAvailableHouseSystems', () => {
    it('should return all systems at normal latitude', () => {
      const systems = getAvailableHouseSystems(45);

      assert.ok(systems.includes('placidus'));
      assert.ok(systems.includes('equal'));
      assert.ok(systems.includes('whole-sign'));
    });

    it('should exclude Placidus at high latitude', () => {
      const systems = getAvailableHouseSystems(70);

      assert.ok(!systems.includes('placidus'));
      assert.ok(systems.includes('equal'));
    });
  });

  describe('validateBirth', () => {
    it('should return valid for correct birth data', () => {
      const result = validateBirth(J2000_GREENWICH);

      assert.equal(result.valid, true);
    });

    it('should return invalid for bad data', () => {
      const result = validateBirth({
        ...J2000_GREENWICH,
        month: 13, // Invalid month
      });

      assert.equal(result.valid, false);
    });
  });

  describe('DEFAULT_OPTIONS', () => {
    it('should have default house system', () => {
      assert.equal(DEFAULT_OPTIONS.houseSystem, 'placidus');
    });

    it('should have aspect orbs', () => {
      assert.ok(DEFAULT_OPTIONS.aspectOrbs);
    });
  });
});
