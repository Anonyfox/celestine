/**
 * Tests for Arabic Parts / Lots Calculator
 *
 * @remarks
 * Verifies Part of Fortune and related calculations against:
 * 1. Swiss Ephemeris reference data (authoritative)
 * 2. Manual formula verification
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { J2000_EPOCH } from './constants.js';
import {
  calculatePartOfFortune,
  calculatePartOfFortuneDayFormula,
  calculatePartOfSpirit,
  getPartOfFortune,
  getPartOfSpirit,
  LOTS_CHARACTERISTICS,
} from './lots.js';

// =============================================================================
// SWISS EPHEMERIS REFERENCE DATA
// Generated from pyswisseph (Swiss Ephemeris 2.10.03)
// Location: London (51.5074°N, 0.1278°W)
// These values are AUTHORITATIVE - do not modify!
// =============================================================================
const SWISSEPH_POF_REFERENCE = [
  {
    jd: 2451545.0,
    description: 'J2000.0 (2000-Jan-01 12:00 TT)',
    sunLon: 280.3689,
    moonLon: 223.3238,
    ascendant: 24.0146,
    isDayChart: true,
    partOfFortune: 326.9694,
  },
  {
    jd: 2448724.5,
    description: 'Meeus Example 47.a (1992-Apr-12 00:00 TT)',
    sunLon: 22.3404,
    moonLon: 133.1768,
    ascendant: 259.0374,
    isDayChart: false,
    partOfFortune: 148.2011,
  },
  {
    jd: 2459580.5,
    description: 'Recent (2022-Jan-01 00:00 TT)',
    sunLon: 280.5289,
    moonLon: 255.4796,
    ascendant: 187.4033,
    isDayChart: false,
    partOfFortune: 212.4527,
  },
] as const;

// Note: Since POF depends on Sun, Moon, and ASC, combined errors can accumulate

describe('ephemeris/lots', () => {
  describe('calculatePartOfFortune', () => {
    describe('Day formula: ASC + Moon - Sun', () => {
      it('should calculate correctly for J2000.0 reference', () => {
        const ref = SWISSEPH_POF_REFERENCE[0];
        const pof = calculatePartOfFortune(ref.sunLon, ref.moonLon, ref.ascendant, true);

        const diff = Math.abs(pof - ref.partOfFortune);
        assert.ok(
          diff < 0.01,
          `Expected ${ref.partOfFortune}°, got ${pof}° (diff: ${diff.toFixed(4)}°)`,
        );
      });

      it('should return value in range [0, 360)', () => {
        const pof = calculatePartOfFortune(280, 223, 24, true);
        assert.ok(pof >= 0 && pof < 360, `Expected 0-360°, got ${pof}°`);
      });

      it('should handle wraparound correctly', () => {
        const pof = calculatePartOfFortune(350, 20, 10, true);
        assert.ok(Math.abs(pof - 40) < 0.01, `Expected ~40°, got ${pof}°`);
      });
    });

    describe('Night formula: ASC + Sun - Moon', () => {
      it('should calculate correctly for night chart reference', () => {
        const ref = SWISSEPH_POF_REFERENCE[1];
        const pof = calculatePartOfFortune(ref.sunLon, ref.moonLon, ref.ascendant, false);

        const diff = Math.abs(pof - ref.partOfFortune);
        assert.ok(
          diff < 0.01,
          `Expected ${ref.partOfFortune}°, got ${pof}° (diff: ${diff.toFixed(4)}°)`,
        );
      });

      it('should return value in range [0, 360)', () => {
        const pof = calculatePartOfFortune(22, 133, 259, false);
        assert.ok(pof >= 0 && pof < 360, `Expected 0-360°, got ${pof}°`);
      });
    });

    describe('Formula verification', () => {
      it('day and night formulas should produce different results', () => {
        const day = calculatePartOfFortune(100, 200, 50, true);
        const night = calculatePartOfFortune(100, 200, 50, false);

        let diff = Math.abs(day - night);
        if (diff > 180) diff = 360 - diff;

        assert.ok(diff > 1, 'Day and night formulas should give different results');
      });

      it('day formula: ASC + Moon - Sun should equal manual calculation', () => {
        const sun = 100;
        const moon = 200;
        const asc = 50;

        const expected = (asc + moon - sun + 360) % 360;
        const actual = calculatePartOfFortune(sun, moon, asc, true);

        assert.ok(Math.abs(actual - expected) < 0.01, `Expected ${expected}°, got ${actual}°`);
      });

      it('night formula: ASC + Sun - Moon should equal manual calculation', () => {
        const sun = 100;
        const moon = 200;
        const asc = 50;

        const expected = (asc + sun - moon + 360) % 360;
        const actual = calculatePartOfFortune(sun, moon, asc, false);

        assert.ok(Math.abs(actual - expected) < 0.01, `Expected ${expected}°, got ${actual}°`);
      });
    });
  });

  describe('calculatePartOfFortuneDayFormula', () => {
    it('should always use day formula', () => {
      const sun = 100;
      const moon = 200;
      const asc = 50;

      const dayOnly = calculatePartOfFortuneDayFormula(sun, moon, asc);
      const dayExplicit = calculatePartOfFortune(sun, moon, asc, true);

      assert.strictEqual(dayOnly, dayExplicit);
    });
  });

  describe('getPartOfFortune', () => {
    it('should return all components', () => {
      const jd = J2000_EPOCH;
      const asc = 24.0146;
      const pof = getPartOfFortune(jd, asc);

      assert.ok(pof.longitude >= 0 && pof.longitude < 360);
      assert.ok(typeof pof.isDayChart === 'boolean');
      assert.ok(pof.sunLongitude >= 0 && pof.sunLongitude < 360);
      assert.ok(pof.moonLongitude >= 0 && pof.moonLongitude < 360);
      assert.strictEqual(pof.ascendant, asc);
    });

    it('should match Swiss Ephemeris with given inputs', () => {
      const ref = SWISSEPH_POF_REFERENCE[0];
      const pof = calculatePartOfFortune(ref.sunLon, ref.moonLon, ref.ascendant, ref.isDayChart);

      const diff = Math.abs(pof - ref.partOfFortune);
      assert.ok(
        diff < 0.01,
        `Expected ${ref.partOfFortune}°, got ${pof}° (diff: ${diff.toFixed(4)}°)`,
      );
    });

    it('should allow forcing day formula', () => {
      const jd = J2000_EPOCH;
      const asc = 24.0146;

      const pofForceDay = getPartOfFortune(jd, asc, { isDayChart: true });
      assert.ok(pofForceDay.isDayChart);
    });

    it('should allow forcing night formula', () => {
      const jd = J2000_EPOCH;
      const asc = 24.0146;

      const pofForceNight = getPartOfFortune(jd, asc, { isDayChart: false });
      assert.ok(!pofForceNight.isDayChart);
    });

    it('should always use day formula when useDayNightFormula is false', () => {
      const jd = J2000_EPOCH;
      const asc = 24.0146;

      const pof = getPartOfFortune(jd, asc, { useDayNightFormula: false });
      assert.ok(pof.isDayChart, 'Should use day formula when useDayNightFormula is false');
    });
  });

  describe('calculatePartOfSpirit', () => {
    it('should use opposite formula from Part of Fortune', () => {
      const sun = 100;
      const moon = 200;
      const asc = 50;

      const posDay = calculatePartOfSpirit(sun, moon, asc, true);
      const pofNight = calculatePartOfFortune(sun, moon, asc, false);

      assert.strictEqual(
        posDay,
        pofNight,
        'Part of Spirit (day) should equal Part of Fortune (night)',
      );
    });
  });

  describe('getPartOfSpirit', () => {
    it('should return valid result', () => {
      const jd = J2000_EPOCH;
      const asc = 24.0146;

      const pos = getPartOfSpirit(jd, asc);

      assert.ok(pos.longitude >= 0 && pos.longitude < 360);
      assert.ok(typeof pos.isDayChart === 'boolean');
    });

    it('should differ from Part of Fortune', () => {
      const jd = J2000_EPOCH;
      const asc = 24.0146;

      const pof = getPartOfFortune(jd, asc);
      const pos = getPartOfSpirit(jd, asc);

      assert.ok(
        Math.abs(pof.longitude - pos.longitude) > 0.1 ||
          Math.abs(pof.sunLongitude - pof.moonLongitude) < 1,
        'Part of Fortune and Spirit should differ',
      );
    });
  });

  describe('Day/Night chart detection', () => {
    it('should detect day chart when Sun is above horizon', () => {
      const jd = J2000_EPOCH;
      const asc = 24.0146;

      const pof = getPartOfFortune(jd, asc);

      assert.ok(pof.isDayChart, 'Should detect day chart at J2000.0 with ASC=24°');
    });
  });

  describe('LOTS_CHARACTERISTICS', () => {
    it('should have daily motion tied to Moon', () => {
      assert.ok(
        Math.abs(LOTS_CHARACTERISTICS.dailyMotion - 13) < 2,
        'Daily motion should be ~13° (Moon motion)',
      );
    });

    it('should have period of approximately lunar month', () => {
      assert.ok(
        Math.abs(LOTS_CHARACTERISTICS.period - 27.3) < 1,
        'Period should be ~27.3 days (lunar month)',
      );
    });
  });
});
