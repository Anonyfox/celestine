import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  getAvailableHouseSystems,
  getFallbackHouseSystem,
  isHouseSystemAvailable,
  normalizeLatitude,
  normalizeLongitude,
  validateLocation,
} from './validation.js';

describe('Validation', () => {
  describe('normalizeLatitude', () => {
    it('should keep valid latitudes unchanged', () => {
      assert.equal(normalizeLatitude(0), 0);
      assert.equal(normalizeLatitude(45), 45);
      assert.equal(normalizeLatitude(-45), -45);
      assert.equal(normalizeLatitude(90), 90);
      assert.equal(normalizeLatitude(-90), -90);
    });

    it('should fold latitudes beyond ±90', () => {
      assert.equal(normalizeLatitude(95), 85);
      assert.equal(normalizeLatitude(-95), -85);
      assert.equal(normalizeLatitude(100), 80);
      assert.equal(normalizeLatitude(-100), -80);
    });

    it('should handle latitude at 180 (equator on opposite side)', () => {
      assert.equal(normalizeLatitude(180), 0);
      assert.equal(normalizeLatitude(-180), 0);
    });

    it('should handle complete wraps (360+)', () => {
      assert.equal(normalizeLatitude(360), 0);
      assert.equal(normalizeLatitude(365), 5);
      assert.equal(normalizeLatitude(450), 90);
    });

    it('should handle decimal values', () => {
      assert.ok(Math.abs(normalizeLatitude(91.5) - 88.5) < 0.0001);
      assert.ok(Math.abs(normalizeLatitude(-91.5) - -88.5) < 0.0001);
    });
  });

  describe('normalizeLongitude', () => {
    it('should keep valid longitudes in -180/+180 range unchanged', () => {
      assert.equal(normalizeLongitude(0), 0);
      assert.equal(normalizeLongitude(45), 45);
      assert.equal(normalizeLongitude(-45), -45);
      assert.equal(normalizeLongitude(180), 180);
      // Note: -180 and 180 are equivalent; we normalize to 180
      assert.equal(normalizeLongitude(-180), 180);
    });

    it('should convert 180-360 range to negative', () => {
      assert.equal(normalizeLongitude(185), -175);
      assert.equal(normalizeLongitude(270), -90);
      assert.equal(normalizeLongitude(359), -1);
    });

    it('should wrap values beyond ±180', () => {
      assert.equal(normalizeLongitude(181), -179);
      assert.equal(normalizeLongitude(-181), 179);
      assert.equal(normalizeLongitude(360), 0);
      assert.equal(normalizeLongitude(-360), 0);
    });

    it('should handle complete wraps (720+)', () => {
      assert.equal(normalizeLongitude(720), 0);
      assert.equal(normalizeLongitude(725), 5);
      assert.equal(normalizeLongitude(-725), -5);
    });

    it('should handle decimal values', () => {
      assert.ok(Math.abs(normalizeLongitude(180.5) - -179.5) < 0.0001);
      assert.ok(Math.abs(normalizeLongitude(270.25) - -89.75) < 0.0001);
    });
  });

  describe('validateLocation', () => {
    it('should accept valid locations', () => {
      const result = validateLocation({
        latitude: 51.5074,
        longitude: -0.1278,
      });

      assert.ok(result.valid);
      assert.equal(result.errors.length, 0);
    });

    it('should accept locations at edge of valid range', () => {
      const result1 = validateLocation({
        latitude: 90,
        longitude: 180,
      });
      assert.ok(result1.valid);

      const result2 = validateLocation({
        latitude: -90,
        longitude: -180,
      });
      assert.ok(result2.valid);
    });

    it('should accept longitude in 0-360 format', () => {
      const result = validateLocation({
        latitude: 0,
        longitude: 270, // -90 in standard format
      });
      assert.ok(result.valid);
    });

    it('should reject latitude beyond ±90', () => {
      const result = validateLocation({
        latitude: 95,
        longitude: 0,
      });

      assert.ok(!result.valid);
      assert.ok(result.errors.length > 0);
      assert.ok(result.errors.some((e) => e.includes('Latitude')));
    });

    it('should reject longitude beyond ±360', () => {
      const result = validateLocation({
        latitude: 0,
        longitude: 400,
      });

      assert.ok(!result.valid);
      assert.ok(result.errors.length > 0);
      assert.ok(result.errors.some((e) => e.includes('Longitude')));
    });

    it('should reject non-numeric latitude', () => {
      const result = validateLocation({
        latitude: NaN,
        longitude: 0,
      });

      assert.ok(!result.valid);
      assert.ok(result.errors.some((e) => e.includes('Latitude')));
    });

    it('should reject infinite values', () => {
      const result = validateLocation({
        latitude: Number.POSITIVE_INFINITY,
        longitude: 0,
      });

      assert.ok(!result.valid);
    });

    it('should validate elevation if present', () => {
      const result1 = validateLocation({
        latitude: 0,
        longitude: 0,
        elevation: 100,
      });
      assert.ok(result1.valid);

      const result2 = validateLocation({
        latitude: 0,
        longitude: 0,
        elevation: 8848, // Mount Everest
      });
      assert.ok(result2.valid);
    });

    it('should reject unreasonable elevation values', () => {
      const result = validateLocation({
        latitude: 0,
        longitude: 0,
        elevation: 20000, // Too high
      });

      assert.ok(!result.valid);
      assert.ok(result.errors.some((e) => e.includes('Elevation')));
    });

    it('should accept negative elevation (below sea level)', () => {
      const result = validateLocation({
        latitude: 31.5,
        longitude: 35.5,
        elevation: -430, // Dead Sea
      });
      assert.ok(result.valid);
    });

    it('should accumulate multiple errors', () => {
      const result = validateLocation({
        latitude: 100,
        longitude: 400,
      });

      assert.ok(!result.valid);
      assert.ok(result.errors.length >= 2);
    });
  });

  describe('isHouseSystemAvailable', () => {
    describe('Placidus', () => {
      it('should be available at moderate latitudes', () => {
        assert.ok(isHouseSystemAvailable('placidus', 0)); // Equator
        assert.ok(isHouseSystemAvailable('placidus', 30)); // Subtropical
        assert.ok(isHouseSystemAvailable('placidus', 51.5)); // London
        assert.ok(isHouseSystemAvailable('placidus', -33.9)); // Sydney
      });

      it('should not be available at high latitudes', () => {
        assert.ok(!isHouseSystemAvailable('placidus', 70)); // Arctic
        assert.ok(!isHouseSystemAvailable('placidus', -70)); // Antarctic
        assert.ok(!isHouseSystemAvailable('placidus', 90)); // North Pole
        assert.ok(!isHouseSystemAvailable('placidus', -90)); // South Pole
      });

      it('should be available just below the threshold', () => {
        assert.ok(isHouseSystemAvailable('placidus', 66)); // Just below limit
        assert.ok(isHouseSystemAvailable('placidus', -66));
      });

      it('should not be available at the threshold', () => {
        assert.ok(!isHouseSystemAvailable('placidus', 66.6)); // Just above limit
      });
    });

    describe('Koch', () => {
      it('should have same limitations as Placidus', () => {
        assert.ok(isHouseSystemAvailable('koch', 51.5));
        assert.ok(!isHouseSystemAvailable('koch', 70));
        assert.ok(!isHouseSystemAvailable('koch', 90));
      });
    });

    describe('Equal', () => {
      it('should be available at all reasonable latitudes', () => {
        assert.ok(isHouseSystemAvailable('equal', 0));
        assert.ok(isHouseSystemAvailable('equal', 51.5));
        assert.ok(isHouseSystemAvailable('equal', 70));
        assert.ok(isHouseSystemAvailable('equal', 85));
      });

      it('should not be available at exact poles', () => {
        assert.ok(!isHouseSystemAvailable('equal', 90));
        assert.ok(!isHouseSystemAvailable('equal', -90));
      });
    });

    describe('Whole Sign', () => {
      it('should be available at all reasonable latitudes', () => {
        assert.ok(isHouseSystemAvailable('whole-sign', 0));
        assert.ok(isHouseSystemAvailable('whole-sign', 51.5));
        assert.ok(isHouseSystemAvailable('whole-sign', 70));
        assert.ok(isHouseSystemAvailable('whole-sign', 85));
      });

      it('should not be available at exact poles', () => {
        assert.ok(!isHouseSystemAvailable('whole-sign', 90));
        assert.ok(!isHouseSystemAvailable('whole-sign', -90));
      });
    });

    describe('Other systems', () => {
      it('should handle Porphyry', () => {
        assert.ok(isHouseSystemAvailable('porphyry', 51.5));
        assert.ok(isHouseSystemAvailable('porphyry', 70));
      });

      it('should handle Regiomontanus', () => {
        assert.ok(isHouseSystemAvailable('regiomontanus', 51.5));
        assert.ok(isHouseSystemAvailable('regiomontanus', 70));
      });

      it('should handle Campanus', () => {
        assert.ok(isHouseSystemAvailable('campanus', 51.5));
        assert.ok(isHouseSystemAvailable('campanus', 70));
      });
    });
  });

  describe('getAvailableHouseSystems', () => {
    it('should return all systems at moderate latitudes', () => {
      const systems = getAvailableHouseSystems(51.5);

      assert.ok(systems.includes('placidus'));
      assert.ok(systems.includes('koch'));
      assert.ok(systems.includes('equal'));
      assert.ok(systems.includes('whole-sign'));
      assert.ok(systems.includes('porphyry'));
      assert.ok(systems.includes('regiomontanus'));
      assert.ok(systems.includes('campanus'));
    });

    it('should exclude Placidus/Koch at high latitudes', () => {
      const systems = getAvailableHouseSystems(70);

      assert.ok(!systems.includes('placidus'));
      assert.ok(!systems.includes('koch'));
      assert.ok(systems.includes('equal'));
      assert.ok(systems.includes('whole-sign'));
    });

    it('should return minimal systems at exact poles', () => {
      const systems = getAvailableHouseSystems(90);

      // No systems should be available at exact poles
      // (Even Equal/Whole Sign can't define an Ascendant)
      assert.ok(systems.length === 0);
    });

    it('should handle equator', () => {
      const systems = getAvailableHouseSystems(0);

      // All systems work at equator
      assert.ok(systems.length === 7);
    });

    it('should be symmetric for Northern/Southern hemispheres', () => {
      const north = getAvailableHouseSystems(65);
      const south = getAvailableHouseSystems(-65);

      assert.equal(north.length, south.length);
      assert.deepEqual(north.sort(), south.sort());
    });
  });

  describe('getFallbackHouseSystem', () => {
    it('should return original system if available', () => {
      const result = getFallbackHouseSystem('placidus', 51.5);
      assert.equal(result, 'placidus');
    });

    it('should return fallback for Placidus at high latitudes', () => {
      const result = getFallbackHouseSystem('placidus', 70);
      assert.notEqual(result, 'placidus');
      assert.ok(isHouseSystemAvailable(result, 70));
    });

    it('should prefer Porphyry as first fallback', () => {
      const result = getFallbackHouseSystem('placidus', 70);
      assert.equal(result, 'porphyry');
    });

    it('should return Equal if requested at extreme latitude', () => {
      const result = getFallbackHouseSystem('equal', 85);
      assert.equal(result, 'equal');
    });

    it('should always return a working system', () => {
      const latitudes = [0, 30, 51.5, 60, 66, 70, 80, 85, 89];
      const systems: Array<'placidus' | 'koch' | 'equal'> = ['placidus', 'koch', 'equal'];

      for (const lat of latitudes) {
        for (const system of systems) {
          const fallback = getFallbackHouseSystem(system, lat);
          // The fallback should be available at this latitude
          // (unless we're at exactly 90°, but we're not testing that)
          assert.ok(
            isHouseSystemAvailable(fallback, lat),
            `Fallback ${fallback} should work at latitude ${lat}`,
          );
        }
      }
    });

    it('should handle whole-sign request', () => {
      const result = getFallbackHouseSystem('whole-sign', 51.5);
      assert.equal(result, 'whole-sign');
    });
  });

  describe('Real-World Locations', () => {
    it('should validate major cities', () => {
      const cities = [
        { name: 'London', lat: 51.5074, lon: -0.1278 },
        { name: 'New York', lat: 40.7128, lon: -74.006 },
        { name: 'Tokyo', lat: 35.6762, lon: 139.6503 },
        { name: 'Sydney', lat: -33.8688, lon: 151.2093 },
        { name: 'São Paulo', lat: -23.5505, lon: -46.6333 },
        { name: 'Mumbai', lat: 19.076, lon: 72.8777 },
        { name: 'Cairo', lat: 30.0444, lon: 31.2357 },
      ];

      for (const city of cities) {
        const result = validateLocation({
          latitude: city.lat,
          longitude: city.lon,
        });
        assert.ok(result.valid, `${city.name} should be valid`);

        // All systems should work at these latitudes
        const systems = getAvailableHouseSystems(city.lat);
        assert.ok(systems.length === 7, `All systems should work in ${city.name}`);
      }
    });

    it('should handle Arctic/Antarctic research stations', () => {
      const stations = [
        { name: 'Alert, Canada', lat: 82.5, lon: -62.3 },
        { name: 'McMurdo, Antarctica', lat: -77.85, lon: 166.67 },
      ];

      for (const station of stations) {
        const result = validateLocation({
          latitude: station.lat,
          longitude: station.lon,
        });
        assert.ok(result.valid, `${station.name} should be valid location`);

        // Placidus should NOT work here
        assert.ok(!isHouseSystemAvailable('placidus', station.lat));

        // But Equal and Whole Sign should
        assert.ok(isHouseSystemAvailable('equal', station.lat));
        assert.ok(isHouseSystemAvailable('whole-sign', station.lat));
      }
    });
  });
});
