/**
 * Tests for Input Validation
 *
 * @remarks
 * Tests validate birth data validation logic.
 * No external astronomical reference data needed - pure date/time validation.
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  checkDayRollover,
  getAvailableHouseSystems,
  validateBirthData,
  validateChartOptions,
} from './input-validation.js';

describe('chart/input-validation', () => {
  describe('validateBirthData', () => {
    describe('Valid inputs', () => {
      it('should accept valid birth data', () => {
        const result = validateBirthData({
          year: 2000,
          month: 1,
          day: 1,
          hour: 12,
          minute: 0,
          second: 0,
          timezone: 0,
          latitude: 51.5074,
          longitude: -0.1278,
        });

        assert.equal(result.valid, true);
        assert.equal(result.errors.length, 0);
        assert.ok(result.normalized);
      });

      it('should accept leap year Feb 29', () => {
        const result = validateBirthData({
          year: 2000,
          month: 2,
          day: 29,
          hour: 12,
          minute: 0,
          timezone: 0,
          latitude: 0,
          longitude: 0,
        });

        assert.equal(result.valid, true);
      });

      it('should accept century leap year 2000', () => {
        // 2000 is divisible by 400, so it's a leap year
        const result = validateBirthData({
          year: 2000,
          month: 2,
          day: 29,
          hour: 0,
          minute: 0,
          timezone: 0,
          latitude: 0,
          longitude: 0,
        });

        assert.equal(result.valid, true);
      });

      it('should accept extreme but valid timezone (+14)', () => {
        const result = validateBirthData({
          year: 2000,
          month: 1,
          day: 1,
          hour: 12,
          minute: 0,
          timezone: 14, // Line Islands, Kiribati
          latitude: 0,
          longitude: 0,
        });

        assert.equal(result.valid, true);
      });

      it('should accept extreme but valid timezone (-12)', () => {
        const result = validateBirthData({
          year: 2000,
          month: 1,
          day: 1,
          hour: 12,
          minute: 0,
          timezone: -12,
          latitude: 0,
          longitude: 0,
        });

        assert.equal(result.valid, true);
      });

      it('should normalize second to 0 when not provided', () => {
        const result = validateBirthData({
          year: 2000,
          month: 1,
          day: 1,
          hour: 12,
          minute: 0,
          timezone: 0,
          latitude: 0,
          longitude: 0,
        });

        assert.equal(result.valid, true);
        assert.equal(result.normalized?.second, 0);
      });
    });

    describe('Year validation', () => {
      it('should reject year below minimum (-4001)', () => {
        const result = validateBirthData({
          year: -4001,
          month: 1,
          day: 1,
          hour: 12,
          minute: 0,
          timezone: 0,
          latitude: 0,
          longitude: 0,
        });

        assert.equal(result.valid, false);
        assert.ok(result.errors.some((e) => e.field === 'year'));
      });

      it('should reject year above maximum (4001)', () => {
        const result = validateBirthData({
          year: 4001,
          month: 1,
          day: 1,
          hour: 12,
          minute: 0,
          timezone: 0,
          latitude: 0,
          longitude: 0,
        });

        assert.equal(result.valid, false);
        assert.ok(result.errors.some((e) => e.field === 'year'));
      });

      it('should warn about year outside recommended range (1700)', () => {
        const result = validateBirthData({
          year: 1700,
          month: 1,
          day: 1,
          hour: 12,
          minute: 0,
          timezone: 0,
          latitude: 0,
          longitude: 0,
        });

        assert.equal(result.valid, true);
        assert.ok(result.warnings.length > 0);
      });

      it('should accept edge of valid range (-4000)', () => {
        const result = validateBirthData({
          year: -4000,
          month: 1,
          day: 1,
          hour: 12,
          minute: 0,
          timezone: 0,
          latitude: 0,
          longitude: 0,
        });

        assert.equal(result.valid, true);
      });
    });

    describe('Month validation', () => {
      it('should reject month 0', () => {
        const result = validateBirthData({
          year: 2000,
          month: 0,
          day: 1,
          hour: 12,
          minute: 0,
          timezone: 0,
          latitude: 0,
          longitude: 0,
        });

        assert.equal(result.valid, false);
        assert.ok(result.errors.some((e) => e.field === 'month'));
      });

      it('should reject month 13', () => {
        const result = validateBirthData({
          year: 2000,
          month: 13,
          day: 1,
          hour: 12,
          minute: 0,
          timezone: 0,
          latitude: 0,
          longitude: 0,
        });

        assert.equal(result.valid, false);
        assert.ok(result.errors.some((e) => e.field === 'month'));
      });

      it('should accept all valid months (1-12)', () => {
        for (let month = 1; month <= 12; month++) {
          const result = validateBirthData({
            year: 2000,
            month,
            day: 1,
            hour: 12,
            minute: 0,
            timezone: 0,
            latitude: 0,
            longitude: 0,
          });

          assert.equal(result.valid, true, `Month ${month} should be valid`);
        }
      });
    });

    describe('Day validation', () => {
      it('should reject day 0', () => {
        const result = validateBirthData({
          year: 2000,
          month: 1,
          day: 0,
          hour: 12,
          minute: 0,
          timezone: 0,
          latitude: 0,
          longitude: 0,
        });

        assert.equal(result.valid, false);
        assert.ok(result.errors.some((e) => e.field === 'day'));
      });

      it('should reject day 32', () => {
        const result = validateBirthData({
          year: 2000,
          month: 1,
          day: 32,
          hour: 12,
          minute: 0,
          timezone: 0,
          latitude: 0,
          longitude: 0,
        });

        assert.equal(result.valid, false);
        assert.ok(result.errors.some((e) => e.field === 'day'));
      });

      it('should reject Feb 30', () => {
        const result = validateBirthData({
          year: 2000,
          month: 2,
          day: 30,
          hour: 12,
          minute: 0,
          timezone: 0,
          latitude: 0,
          longitude: 0,
        });

        assert.equal(result.valid, false);
        assert.ok(result.errors.some((e) => e.field === 'day'));
      });

      it('should reject Feb 29 in non-leap year', () => {
        // 2001 is not a leap year
        const result = validateBirthData({
          year: 2001,
          month: 2,
          day: 29,
          hour: 12,
          minute: 0,
          timezone: 0,
          latitude: 0,
          longitude: 0,
        });

        assert.equal(result.valid, false);
        assert.ok(result.errors.some((e) => e.field === 'day'));
      });

      it('should reject Feb 29 in century non-leap year (1900)', () => {
        // 1900 is divisible by 100 but not 400, so NOT a leap year
        const result = validateBirthData({
          year: 1900,
          month: 2,
          day: 29,
          hour: 12,
          minute: 0,
          timezone: 0,
          latitude: 0,
          longitude: 0,
        });

        assert.equal(result.valid, false);
        assert.ok(result.errors.some((e) => e.field === 'day'));
      });

      it('should reject Apr 31', () => {
        const result = validateBirthData({
          year: 2000,
          month: 4,
          day: 31,
          hour: 12,
          minute: 0,
          timezone: 0,
          latitude: 0,
          longitude: 0,
        });

        assert.equal(result.valid, false);
        assert.ok(result.errors.some((e) => e.field === 'day'));
      });
    });

    describe('Hour validation', () => {
      it('should reject hour -1', () => {
        const result = validateBirthData({
          year: 2000,
          month: 1,
          day: 1,
          hour: -1,
          minute: 0,
          timezone: 0,
          latitude: 0,
          longitude: 0,
        });

        assert.equal(result.valid, false);
        assert.ok(result.errors.some((e) => e.field === 'hour'));
      });

      it('should reject hour 24', () => {
        const result = validateBirthData({
          year: 2000,
          month: 1,
          day: 1,
          hour: 24,
          minute: 0,
          timezone: 0,
          latitude: 0,
          longitude: 0,
        });

        assert.equal(result.valid, false);
        assert.ok(result.errors.some((e) => e.field === 'hour'));
      });

      it('should accept hours 0-23', () => {
        for (let hour = 0; hour < 24; hour++) {
          const result = validateBirthData({
            year: 2000,
            month: 1,
            day: 1,
            hour,
            minute: 0,
            timezone: 0,
            latitude: 0,
            longitude: 0,
          });

          assert.equal(result.valid, true, `Hour ${hour} should be valid`);
        }
      });
    });

    describe('Minute validation', () => {
      it('should reject minute -1', () => {
        const result = validateBirthData({
          year: 2000,
          month: 1,
          day: 1,
          hour: 12,
          minute: -1,
          timezone: 0,
          latitude: 0,
          longitude: 0,
        });

        assert.equal(result.valid, false);
        assert.ok(result.errors.some((e) => e.field === 'minute'));
      });

      it('should reject minute 60', () => {
        const result = validateBirthData({
          year: 2000,
          month: 1,
          day: 1,
          hour: 12,
          minute: 60,
          timezone: 0,
          latitude: 0,
          longitude: 0,
        });

        assert.equal(result.valid, false);
        assert.ok(result.errors.some((e) => e.field === 'minute'));
      });
    });

    describe('Latitude validation', () => {
      it('should reject latitude > 90', () => {
        const result = validateBirthData({
          year: 2000,
          month: 1,
          day: 1,
          hour: 12,
          minute: 0,
          timezone: 0,
          latitude: 91,
          longitude: 0,
        });

        assert.equal(result.valid, false);
        assert.ok(result.errors.some((e) => e.field === 'latitude'));
      });

      it('should reject latitude < -90', () => {
        const result = validateBirthData({
          year: 2000,
          month: 1,
          day: 1,
          hour: 12,
          minute: 0,
          timezone: 0,
          latitude: -91,
          longitude: 0,
        });

        assert.equal(result.valid, false);
        assert.ok(result.errors.some((e) => e.field === 'latitude'));
      });

      it('should accept latitude at poles (±90)', () => {
        const north = validateBirthData({
          year: 2000,
          month: 1,
          day: 1,
          hour: 12,
          minute: 0,
          timezone: 0,
          latitude: 90,
          longitude: 0,
        });

        const south = validateBirthData({
          year: 2000,
          month: 1,
          day: 1,
          hour: 12,
          minute: 0,
          timezone: 0,
          latitude: -90,
          longitude: 0,
        });

        assert.equal(north.valid, true);
        assert.equal(south.valid, true);
      });
    });

    describe('Longitude validation', () => {
      it('should reject longitude > 180', () => {
        const result = validateBirthData({
          year: 2000,
          month: 1,
          day: 1,
          hour: 12,
          minute: 0,
          timezone: 0,
          latitude: 0,
          longitude: 181,
        });

        assert.equal(result.valid, false);
        assert.ok(result.errors.some((e) => e.field === 'longitude'));
      });

      it('should reject longitude < -180', () => {
        const result = validateBirthData({
          year: 2000,
          month: 1,
          day: 1,
          hour: 12,
          minute: 0,
          timezone: 0,
          latitude: 0,
          longitude: -181,
        });

        assert.equal(result.valid, false);
        assert.ok(result.errors.some((e) => e.field === 'longitude'));
      });

      it('should accept longitude at date line (±180)', () => {
        const east = validateBirthData({
          year: 2000,
          month: 1,
          day: 1,
          hour: 12,
          minute: 0,
          timezone: 0,
          latitude: 0,
          longitude: 180,
        });

        const west = validateBirthData({
          year: 2000,
          month: 1,
          day: 1,
          hour: 12,
          minute: 0,
          timezone: 0,
          latitude: 0,
          longitude: -180,
        });

        assert.equal(east.valid, true);
        assert.equal(west.valid, true);
      });
    });

    describe('Invalid types', () => {
      it('should reject NaN values', () => {
        const result = validateBirthData({
          year: NaN,
          month: 1,
          day: 1,
          hour: 12,
          minute: 0,
          timezone: 0,
          latitude: 0,
          longitude: 0,
        });

        assert.equal(result.valid, false);
      });

      it('should reject Infinity', () => {
        const result = validateBirthData({
          year: 2000,
          month: 1,
          day: 1,
          hour: 12,
          minute: 0,
          timezone: Infinity,
          latitude: 0,
          longitude: 0,
        });

        assert.equal(result.valid, false);
      });
    });
  });

  describe('checkDayRollover', () => {
    it('should detect no rollover at noon UTC', () => {
      const result = checkDayRollover({
        year: 2000,
        month: 1,
        day: 1,
        hour: 12,
        minute: 0,
        timezone: 0,
        latitude: 0,
        longitude: 0,
      });

      assert.equal(result.rollsOver, false);
      assert.equal(result.direction, 'none');
    });

    it('should detect rollover to previous day', () => {
      // 01:00 CET (+1) = 00:00 UTC, no rollover
      // 00:00 CET (+1) = 23:00 UTC previous day
      const result = checkDayRollover({
        year: 2000,
        month: 1,
        day: 2,
        hour: 0,
        minute: 0,
        timezone: 1,
        latitude: 0,
        longitude: 0,
      });

      assert.equal(result.rollsOver, true);
      assert.equal(result.direction, 'previous');
    });

    it('should detect rollover to next day', () => {
      // 23:00 EST (-5) = 04:00 UTC next day
      const result = checkDayRollover({
        year: 2000,
        month: 1,
        day: 1,
        hour: 23,
        minute: 0,
        timezone: -5,
        latitude: 0,
        longitude: 0,
      });

      assert.equal(result.rollsOver, true);
      assert.equal(result.direction, 'next');
    });
  });

  describe('validateChartOptions', () => {
    it('should fallback Placidus at high latitude', () => {
      const { options, warnings } = validateChartOptions({ houseSystem: 'placidus' }, 70);

      assert.notEqual(options.houseSystem, 'placidus');
      assert.ok(warnings.length > 0);
    });

    it('should keep Placidus at normal latitude', () => {
      const { options, warnings } = validateChartOptions({ houseSystem: 'placidus' }, 45);

      assert.equal(options.houseSystem, 'placidus');
      // No warnings for normal latitudes
      assert.equal(warnings.length, 0);
    });

    it('should allow equal house at any latitude', () => {
      const { options } = validateChartOptions({ houseSystem: 'equal' }, 85);

      assert.equal(options.houseSystem, 'equal');
    });
  });

  describe('getAvailableHouseSystems', () => {
    it('should return all systems at equator', () => {
      const systems = getAvailableHouseSystems(0);

      assert.ok(systems.includes('placidus'));
      assert.ok(systems.includes('koch'));
      assert.ok(systems.includes('equal'));
      assert.ok(systems.includes('whole-sign'));
      assert.ok(systems.includes('porphyry'));
      assert.ok(systems.includes('regiomontanus'));
      assert.ok(systems.includes('campanus'));
    });

    it('should exclude Placidus/Koch at high latitude (70°)', () => {
      const systems = getAvailableHouseSystems(70);

      assert.ok(!systems.includes('placidus'));
      assert.ok(!systems.includes('koch'));
      assert.ok(systems.includes('equal'));
      assert.ok(systems.includes('porphyry'));
    });

    it('should only return whole-sign at extreme latitude (89.95°)', () => {
      const systems = getAvailableHouseSystems(89.95);

      assert.equal(systems.length, 1);
      assert.equal(systems[0], 'whole-sign');
    });

    it('should handle negative latitudes same as positive', () => {
      const north = getAvailableHouseSystems(70);
      const south = getAvailableHouseSystems(-70);

      assert.deepEqual(north, south);
    });
  });
});
