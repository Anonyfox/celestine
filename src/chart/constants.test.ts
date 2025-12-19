/**
 * Tests for Chart Constants
 *
 * @remarks
 * Validates that all constants are properly defined and have valid values.
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { CelestialBody } from '../ephemeris/positions.js';
import {
  ALL_ASPECTS,
  BODY_NAMES,
  DEFAULT_HOUSE_SYSTEM,
  DEFAULT_OPTIONS,
  HOUSE_SYSTEM_NAMES,
  MAJOR_ASPECTS,
  MAX_LATITUDE_ANY,
  MAX_LATITUDE_PLACIDUS,
  MAX_YEAR,
  MIN_YEAR,
  PLANET_ORDER,
  RECOMMENDED_MAX_YEAR,
  RECOMMENDED_MIN_YEAR,
  STATIONARY_THRESHOLD,
} from './constants.js';

// BODY_NAMES uses string keys, not CelestialBody enum values
// The PLANET_ORDER array uses CelestialBody enum values

describe('chart/constants', () => {
  describe('DEFAULT_OPTIONS', () => {
    it('should have placidus as default house system', () => {
      assert.equal(DEFAULT_OPTIONS.houseSystem, 'placidus');
    });

    it('should include Chiron by default', () => {
      assert.equal(DEFAULT_OPTIONS.includeChiron, true);
    });

    it('should include asteroids by default', () => {
      assert.equal(DEFAULT_OPTIONS.includeAsteroids, true);
    });

    it('should include true nodes by default', () => {
      assert.equal(DEFAULT_OPTIONS.includeNodes, 'true');
    });

    it('should include mean Lilith by default', () => {
      assert.equal(DEFAULT_OPTIONS.includeLilith, 'mean');
    });

    it('should include lots by default', () => {
      assert.equal(DEFAULT_OPTIONS.includeLots, true);
    });

    it('should include patterns by default', () => {
      assert.equal(DEFAULT_OPTIONS.includePatterns, true);
    });

    it('should have aspectOrbs defined (can be empty for defaults)', () => {
      assert.ok(DEFAULT_OPTIONS.aspectOrbs !== undefined);
      assert.ok(typeof DEFAULT_OPTIONS.aspectOrbs === 'object');
    });

    it('should have aspectTypes defined', () => {
      assert.ok(DEFAULT_OPTIONS.aspectTypes);
      assert.ok(Array.isArray(DEFAULT_OPTIONS.aspectTypes));
      assert.ok(DEFAULT_OPTIONS.aspectTypes.length > 0);
    });

    it('should have minimumAspectStrength defined', () => {
      assert.equal(typeof DEFAULT_OPTIONS.minimumAspectStrength, 'number');
    });
  });

  describe('DEFAULT_HOUSE_SYSTEM', () => {
    it('should be placidus', () => {
      assert.equal(DEFAULT_HOUSE_SYSTEM, 'placidus');
    });
  });

  describe('MAJOR_ASPECTS', () => {
    it('should contain 5 Ptolemaic aspects', () => {
      assert.equal(MAJOR_ASPECTS.length, 5);
    });

    it('should include conjunction', () => {
      assert.ok(MAJOR_ASPECTS.includes('conjunction'));
    });

    it('should include opposition', () => {
      assert.ok(MAJOR_ASPECTS.includes('opposition'));
    });

    it('should include trine', () => {
      assert.ok(MAJOR_ASPECTS.includes('trine'));
    });

    it('should include square', () => {
      assert.ok(MAJOR_ASPECTS.includes('square'));
    });

    it('should include sextile', () => {
      assert.ok(MAJOR_ASPECTS.includes('sextile'));
    });
  });

  describe('ALL_ASPECTS', () => {
    it('should contain more aspects than MAJOR_ASPECTS', () => {
      assert.ok(ALL_ASPECTS.length > MAJOR_ASPECTS.length);
    });

    it('should include all major aspects', () => {
      for (const major of MAJOR_ASPECTS) {
        assert.ok(ALL_ASPECTS.includes(major));
      }
    });
  });

  describe('BODY_NAMES', () => {
    it('should have name for Sun', () => {
      assert.equal(BODY_NAMES.sun, 'Sun');
    });

    it('should have name for Moon', () => {
      assert.equal(BODY_NAMES.moon, 'Moon');
    });

    it('should have name for all planets', () => {
      assert.equal(BODY_NAMES.mercury, 'Mercury');
      assert.equal(BODY_NAMES.venus, 'Venus');
      assert.equal(BODY_NAMES.mars, 'Mars');
      assert.equal(BODY_NAMES.jupiter, 'Jupiter');
      assert.equal(BODY_NAMES.saturn, 'Saturn');
      assert.equal(BODY_NAMES.uranus, 'Uranus');
      assert.equal(BODY_NAMES.neptune, 'Neptune');
      assert.equal(BODY_NAMES.pluto, 'Pluto');
    });

    it('should have name for Chiron', () => {
      assert.equal(BODY_NAMES.chiron, 'Chiron');
    });

    it('should have names for asteroids', () => {
      assert.equal(BODY_NAMES.ceres, 'Ceres');
      assert.equal(BODY_NAMES.pallas, 'Pallas');
      assert.equal(BODY_NAMES.juno, 'Juno');
      assert.equal(BODY_NAMES.vesta, 'Vesta');
    });

    it('should have names for nodes and Lilith', () => {
      assert.equal(BODY_NAMES.northNode, 'North Node');
      assert.equal(BODY_NAMES.southNode, 'South Node');
      assert.equal(BODY_NAMES.meanLilith, 'Mean Lilith');
      assert.equal(BODY_NAMES.trueLilith, 'True Lilith');
    });

    it('should have names for lots', () => {
      assert.equal(BODY_NAMES.partOfFortune, 'Part of Fortune');
      assert.equal(BODY_NAMES.partOfSpirit, 'Part of Spirit');
    });
  });

  describe('PLANET_ORDER', () => {
    it('should start with Sun', () => {
      assert.equal(PLANET_ORDER[0], CelestialBody.Sun);
    });

    it('should have Moon second', () => {
      assert.equal(PLANET_ORDER[1], CelestialBody.Moon);
    });

    it('should end with Pluto (for main planets)', () => {
      assert.equal(PLANET_ORDER[9], CelestialBody.Pluto);
    });

    it('should have 10 main planets', () => {
      assert.ok(PLANET_ORDER.length >= 10);
    });

    it('should follow traditional order (Sun, Moon, Mercury...)', () => {
      const expected = [
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
      ];

      for (let i = 0; i < expected.length; i++) {
        assert.equal(PLANET_ORDER[i], expected[i]);
      }
    });
  });

  describe('HOUSE_SYSTEM_NAMES', () => {
    it('should have name for placidus', () => {
      assert.equal(HOUSE_SYSTEM_NAMES.placidus, 'Placidus');
    });

    it('should have name for koch', () => {
      assert.equal(HOUSE_SYSTEM_NAMES.koch, 'Koch');
    });

    it('should have name for equal', () => {
      assert.equal(HOUSE_SYSTEM_NAMES.equal, 'Equal');
    });

    it('should have name for whole-sign', () => {
      assert.equal(HOUSE_SYSTEM_NAMES['whole-sign'], 'Whole Sign');
    });

    it('should have name for porphyry', () => {
      assert.equal(HOUSE_SYSTEM_NAMES.porphyry, 'Porphyry');
    });

    it('should have name for regiomontanus', () => {
      assert.equal(HOUSE_SYSTEM_NAMES.regiomontanus, 'Regiomontanus');
    });

    it('should have name for campanus', () => {
      assert.equal(HOUSE_SYSTEM_NAMES.campanus, 'Campanus');
    });
  });

  describe('Year range constants', () => {
    it('should have reasonable MIN_YEAR', () => {
      assert.ok(MIN_YEAR <= -4000);
    });

    it('should have reasonable MAX_YEAR', () => {
      assert.ok(MAX_YEAR >= 4000);
    });

    it('should have RECOMMENDED_MIN_YEAR > MIN_YEAR', () => {
      assert.ok(RECOMMENDED_MIN_YEAR > MIN_YEAR);
    });

    it('should have RECOMMENDED_MAX_YEAR < MAX_YEAR', () => {
      assert.ok(RECOMMENDED_MAX_YEAR < MAX_YEAR);
    });

    it('should have recommended range within supported range', () => {
      assert.ok(RECOMMENDED_MIN_YEAR >= MIN_YEAR);
      assert.ok(RECOMMENDED_MAX_YEAR <= MAX_YEAR);
    });
  });

  describe('Latitude thresholds', () => {
    it('should have MAX_LATITUDE_PLACIDUS around 66.5', () => {
      assert.ok(MAX_LATITUDE_PLACIDUS >= 60 && MAX_LATITUDE_PLACIDUS <= 70);
    });

    it('should have MAX_LATITUDE_ANY > MAX_LATITUDE_PLACIDUS', () => {
      assert.ok(MAX_LATITUDE_ANY > MAX_LATITUDE_PLACIDUS);
    });

    it('should have MAX_LATITUDE_ANY < 90', () => {
      assert.ok(MAX_LATITUDE_ANY < 90);
    });
  });

  describe('STATIONARY_THRESHOLD', () => {
    it('should be a small positive number', () => {
      assert.ok(STATIONARY_THRESHOLD > 0);
      assert.ok(STATIONARY_THRESHOLD < 1);
    });
  });
});
