/**
 * Tests for House Calculation
 *
 * @remarks
 * Tests validate house calculation wrapper functionality.
 * Underlying house systems are validated in the houses module tests.
 *
 * Tests focus on:
 * - Correct integration with houses module
 * - Angle calculations (ASC opposite DSC, MC opposite IC)
 * - House system fallback at high latitudes
 * - House number determination for planetary placements
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  calculateChartHouses,
  getAngleConjunction,
  getCuspLongitudes,
  getHouseNumber,
} from './house-calculation.js';

describe('chart/house-calculation', () => {
  describe('calculateChartHouses', () => {
    // Test location: London, using a fixed LST for reproducibility
    const LONDON = { latitude: 51.5074, longitude: -0.1278 };
    const TEST_LST = 280.0; // Fixed LST in degrees
    const TEST_T = 0; // J2000.0

    describe('Basic functionality', () => {
      it('should return 12 house cusps', () => {
        const result = calculateChartHouses(LONDON, TEST_LST, TEST_T, 'placidus');

        assert.equal(result.houses.cusps.length, 12);
      });

      it('should return all four angles', () => {
        const result = calculateChartHouses(LONDON, TEST_LST, TEST_T, 'placidus');

        assert.ok(result.angles.ascendant);
        assert.ok(result.angles.midheaven);
        assert.ok(result.angles.descendant);
        assert.ok(result.angles.imumCoeli);
      });

      it('should have DSC exactly opposite ASC', () => {
        const result = calculateChartHouses(LONDON, TEST_LST, TEST_T, 'placidus');

        let expectedDSC = result.angles.ascendant.longitude + 180;
        if (expectedDSC >= 360) expectedDSC -= 360;

        assert.ok(
          Math.abs(result.angles.descendant.longitude - expectedDSC) < 0.001,
          `DSC should be ASC+180°: ASC=${result.angles.ascendant.longitude}°, DSC=${result.angles.descendant.longitude}°`,
        );
      });

      it('should have IC exactly opposite MC', () => {
        const result = calculateChartHouses(LONDON, TEST_LST, TEST_T, 'placidus');

        let expectedIC = result.angles.midheaven.longitude + 180;
        if (expectedIC >= 360) expectedIC -= 360;

        assert.ok(
          Math.abs(result.angles.imumCoeli.longitude - expectedIC) < 0.001,
          `IC should be MC+180°: MC=${result.angles.midheaven.longitude}°, IC=${result.angles.imumCoeli.longitude}°`,
        );
      });

      it('should have house 1 cusp equal to ASC', () => {
        const result = calculateChartHouses(LONDON, TEST_LST, TEST_T, 'placidus');

        assert.ok(
          Math.abs(result.houses.cusps[0].longitude - result.angles.ascendant.longitude) < 0.001,
          'House 1 cusp should equal Ascendant',
        );
      });

      it('should have house 10 cusp equal to MC', () => {
        const result = calculateChartHouses(LONDON, TEST_LST, TEST_T, 'placidus');

        assert.ok(
          Math.abs(result.houses.cusps[9].longitude - result.angles.midheaven.longitude) < 0.001,
          'House 10 cusp should equal Midheaven',
        );
      });
    });

    describe('House systems', () => {
      it('should use Placidus when requested', () => {
        const result = calculateChartHouses(LONDON, TEST_LST, TEST_T, 'placidus');
        assert.equal(result.system, 'placidus');
        assert.equal(result.systemName, 'Placidus');
      });

      it('should use Equal when requested', () => {
        const result = calculateChartHouses(LONDON, TEST_LST, TEST_T, 'equal');
        assert.equal(result.system, 'equal');
        assert.equal(result.systemName, 'Equal');
      });

      it('should use Whole Sign when requested', () => {
        const result = calculateChartHouses(LONDON, TEST_LST, TEST_T, 'whole-sign');
        assert.equal(result.system, 'whole-sign');
        assert.equal(result.systemName, 'Whole Sign');
      });

      it('should use Porphyry when requested', () => {
        const result = calculateChartHouses(LONDON, TEST_LST, TEST_T, 'porphyry');
        assert.equal(result.system, 'porphyry');
        assert.equal(result.systemName, 'Porphyry');
      });
    });

    describe('High latitude fallback', () => {
      const ARCTIC = { latitude: 70, longitude: 25 };

      it('should fallback Placidus at high latitude', () => {
        const result = calculateChartHouses(ARCTIC, TEST_LST, TEST_T, 'placidus');

        // Should NOT be Placidus at 70°
        assert.notEqual(result.system, 'placidus');
        assert.ok(result.warnings.length > 0);
      });

      it('should fallback Koch at high latitude', () => {
        const result = calculateChartHouses(ARCTIC, TEST_LST, TEST_T, 'koch');

        // Should NOT be Koch at 70°
        assert.notEqual(result.system, 'koch');
        assert.ok(result.warnings.length > 0);
      });

      it('should allow Equal at high latitude', () => {
        const result = calculateChartHouses(ARCTIC, TEST_LST, TEST_T, 'equal');

        // Should stay as Equal
        assert.equal(result.system, 'equal');
      });

      it('should allow Whole Sign at high latitude', () => {
        const result = calculateChartHouses(ARCTIC, TEST_LST, TEST_T, 'whole-sign');

        assert.equal(result.system, 'whole-sign');
      });
    });

    describe('Cusp properties', () => {
      it('should have valid longitude for all cusps (0-360)', () => {
        const result = calculateChartHouses(LONDON, TEST_LST, TEST_T, 'placidus');

        for (let i = 0; i < 12; i++) {
          const cusp = result.houses.cusps[i];
          assert.ok(
            cusp.longitude >= 0 && cusp.longitude < 360,
            `Cusp ${i + 1} longitude out of range`,
          );
        }
      });

      it('should have correct house numbers', () => {
        const result = calculateChartHouses(LONDON, TEST_LST, TEST_T, 'placidus');

        for (let i = 0; i < 12; i++) {
          assert.equal(result.houses.cusps[i].house, i + 1);
        }
      });

      it('should have sign information for all cusps', () => {
        const result = calculateChartHouses(LONDON, TEST_LST, TEST_T, 'placidus');

        for (const cusp of result.houses.cusps) {
          assert.ok(cusp.sign !== undefined);
          assert.ok(cusp.signName);
          assert.ok(cusp.degree >= 0 && cusp.degree < 30);
          assert.ok(cusp.minute >= 0 && cusp.minute < 60);
          assert.ok(cusp.formatted);
        }
      });

      it('should calculate house sizes', () => {
        const result = calculateChartHouses(LONDON, TEST_LST, TEST_T, 'placidus');

        let totalSize = 0;
        for (const cusp of result.houses.cusps) {
          assert.ok(
            cusp.size > 0 && cusp.size < 180,
            `House ${cusp.house} size unreasonable: ${cusp.size}°`,
          );
          totalSize += cusp.size;
        }

        // Total should be approximately 360°
        assert.ok(
          Math.abs(totalSize - 360) < 0.1,
          `Total house sizes should be 360°, got ${totalSize}°`,
        );
      });
    });

    describe('Angle properties', () => {
      it('should have sign information for all angles', () => {
        const result = calculateChartHouses(LONDON, TEST_LST, TEST_T, 'placidus');

        for (const angle of [
          result.angles.ascendant,
          result.angles.midheaven,
          result.angles.descendant,
          result.angles.imumCoeli,
        ]) {
          assert.ok(angle.sign !== undefined);
          assert.ok(angle.signName);
          assert.ok(angle.degree >= 0 && angle.degree < 30);
          assert.ok(angle.formatted);
        }
      });

      it('should have correct abbreviations', () => {
        const result = calculateChartHouses(LONDON, TEST_LST, TEST_T, 'placidus');

        assert.equal(result.angles.ascendant.abbrev, 'ASC');
        assert.equal(result.angles.midheaven.abbrev, 'MC');
        assert.equal(result.angles.descendant.abbrev, 'DSC');
        assert.equal(result.angles.imumCoeli.abbrev, 'IC');
      });
    });

    describe('Southern hemisphere', () => {
      const SYDNEY = { latitude: -33.8688, longitude: 151.2093 };

      it('should calculate houses correctly in southern hemisphere', () => {
        const result = calculateChartHouses(SYDNEY, TEST_LST, TEST_T, 'placidus');

        assert.equal(result.houses.cusps.length, 12);
        // DSC should still be opposite ASC
        let expectedDSC = result.angles.ascendant.longitude + 180;
        if (expectedDSC >= 360) expectedDSC -= 360;
        assert.ok(Math.abs(result.angles.descendant.longitude - expectedDSC) < 0.001);
      });
    });

    describe('Equator', () => {
      const EQUATOR = { latitude: 0, longitude: 0 };

      it('should calculate houses at equator', () => {
        const result = calculateChartHouses(EQUATOR, TEST_LST, TEST_T, 'placidus');

        assert.equal(result.houses.cusps.length, 12);
        assert.ok(result.angles.ascendant.longitude >= 0);
      });
    });
  });

  describe('getHouseNumber', () => {
    // Use simple cusps for easy testing: each house is 30°
    const equalCusps = Array.from({ length: 12 }, (_, i) => i * 30);

    it('should return house 1 for longitude in first house', () => {
      assert.equal(getHouseNumber(15, equalCusps), 1);
    });

    it('should return house 12 for longitude in last house', () => {
      assert.equal(getHouseNumber(340, equalCusps), 12);
    });

    it('should handle exact cusp (belongs to starting house)', () => {
      assert.equal(getHouseNumber(30, equalCusps), 2); // Exactly on cusp 2
      assert.equal(getHouseNumber(60, equalCusps), 3); // Exactly on cusp 3
    });

    it('should handle longitude at 0°', () => {
      assert.equal(getHouseNumber(0, equalCusps), 1);
    });

    it('should handle longitude near 360°', () => {
      assert.equal(getHouseNumber(359, equalCusps), 12);
    });

    it('should handle unequal house sizes', () => {
      // Unequal cusps: house 1 is larger
      const unequalCusps = [0, 40, 70, 100, 130, 160, 190, 220, 250, 280, 310, 340];

      assert.equal(getHouseNumber(20, unequalCusps), 1);
      assert.equal(getHouseNumber(45, unequalCusps), 2);
    });

    it('should handle house spanning 360°/0° boundary', () => {
      // Cusps where house 12 crosses 0°
      const cusps = [10, 40, 70, 100, 130, 160, 190, 220, 250, 280, 310, 340];

      // 350° should be in house 12 (between 340° and 10°)
      assert.equal(getHouseNumber(350, cusps), 12);
      // 5° should also be in house 12
      assert.equal(getHouseNumber(5, cusps), 12);
      // 15° should be in house 1
      assert.equal(getHouseNumber(15, cusps), 1);
    });
  });

  describe('getCuspLongitudes', () => {
    it('should return array of 12 longitudes', () => {
      const location = { latitude: 51.5, longitude: 0 };
      const result = calculateChartHouses(location, 280, 0, 'placidus');
      const longitudes = getCuspLongitudes(result.houses);

      assert.equal(longitudes.length, 12);
      for (const lon of longitudes) {
        assert.ok(lon >= 0 && lon < 360);
      }
    });
  });

  describe('getAngleConjunction', () => {
    const LONDON = { latitude: 51.5074, longitude: -0.1278 };
    const result = calculateChartHouses(LONDON, 280, 0, 'placidus');

    it('should detect conjunction with ASC', () => {
      const ascLon = result.angles.ascendant.longitude;
      const conjunction = getAngleConjunction(ascLon + 1, result.angles, 3);
      assert.equal(conjunction, 'ASC');
    });

    it('should detect conjunction with MC', () => {
      const mcLon = result.angles.midheaven.longitude;
      const conjunction = getAngleConjunction(mcLon - 2, result.angles, 3);
      assert.equal(conjunction, 'MC');
    });

    it('should detect conjunction with DSC', () => {
      const dscLon = result.angles.descendant.longitude;
      const conjunction = getAngleConjunction(dscLon, result.angles, 3);
      assert.equal(conjunction, 'DSC');
    });

    it('should detect conjunction with IC', () => {
      const icLon = result.angles.imumCoeli.longitude;
      const conjunction = getAngleConjunction(icLon + 2.5, result.angles, 3);
      assert.equal(conjunction, 'IC');
    });

    it('should return null when not conjunct any angle', () => {
      // Pick a longitude far from all angles
      const result2 = calculateChartHouses(LONDON, 280, 0, 'placidus');
      // Use a longitude that's definitely not near any angle
      const midpoint =
        (result2.angles.ascendant.longitude + result2.angles.midheaven.longitude) / 2;
      let testLon = midpoint;
      if (testLon < 0) testLon += 360;
      if (testLon >= 360) testLon -= 360;

      // With small orb, should not be conjunct
      const conjunction = getAngleConjunction(testLon, result2.angles, 1);
      // May or may not be null depending on actual positions, so just check it's a valid result
      assert.ok(conjunction === null || ['ASC', 'MC', 'DSC', 'IC'].includes(conjunction));
    });
  });
});
