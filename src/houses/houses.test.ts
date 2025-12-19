import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  calculateAnglesOnly,
  calculateHouses,
  calculateMultipleSystems,
  getHouseSystemName,
  getSupportedHouseSystems,
  systemRequiresLatitude,
  systemWorksAtPolarCircle,
} from './houses.js';
import type { HouseSystem } from './types.js';

describe('Houses Module - Integration Tests', () => {
  // Test location: London
  const london = {
    latitude: 51.5074,
    longitude: -0.1278,
  };

  // Test time parameters
  const lst = 180.0; // Sidereal time
  const T = 0.0; // J2000.0 epoch

  describe('calculateHouses', () => {
    it('should calculate Placidus houses', () => {
      const result = calculateHouses(london, lst, T, 'placidus');

      assert.equal(result.system, 'placidus');
      assert.ok(result.angles);
      assert.ok(result.cusps);
      assert.equal(result.cusps.cusps.length, 12);

      // Verify ASC matches house 1
      assert.ok(
        Math.abs(result.cusps.cusps[0] - result.angles.ascendant) < 0.0001,
        'House 1 should equal ASC',
      );
      // Verify MC matches house 10
      assert.ok(
        Math.abs(result.cusps.cusps[9] - result.angles.midheaven) < 0.0001,
        'House 10 should equal MC',
      );
    });

    it('should calculate Equal houses', () => {
      const result = calculateHouses(london, lst, T, 'equal');

      assert.equal(result.system, 'equal');
      assert.equal(result.cusps.cusps.length, 12);

      // In Equal houses, each house should be exactly 30° apart
      for (let i = 0; i < 11; i++) {
        let diff = result.cusps.cusps[i + 1] - result.cusps.cusps[i];
        if (diff < 0) diff += 360;
        assert.ok(Math.abs(diff - 30) < 0.001, `Houses ${i + 1} and ${i + 2} not 30° apart`);
      }
    });

    it('should calculate Whole Sign houses', () => {
      const result = calculateHouses(london, lst, T, 'whole-sign');

      assert.equal(result.system, 'whole-sign');

      // Each house cusp should be at 0° of a sign (multiple of 30)
      for (const cusp of result.cusps.cusps) {
        assert.equal(cusp % 30, 0, `Cusp ${cusp} not at sign boundary`);
      }
    });

    it('should calculate all supported house systems', () => {
      const systems: Array<'placidus' | 'koch' | 'regiomontanus' | 'campanus' | 'porphyry'> = [
        'placidus',
        'koch',
        'regiomontanus',
        'campanus',
        'porphyry',
      ];

      for (const system of systems) {
        const result = calculateHouses(london, lst, T, system);
        assert.equal(result.system, system);
        assert.equal(result.cusps.cusps.length, 12);

        // All cusps should be valid angles
        for (const cusp of result.cusps.cusps) {
          assert.ok(cusp >= 0 && cusp < 360, `Invalid cusp: ${cusp}`);
        }
      }
    });

    it('should use Placidus as default', () => {
      const result = calculateHouses(london, lst, T);

      assert.equal(result.system, 'placidus');
    });

    it('should throw on invalid location', () => {
      const invalidLocation = { latitude: 100, longitude: 0 }; // Invalid latitude

      assert.throws(() => {
        calculateHouses(invalidLocation, lst, T);
      }, /Invalid location/);
    });

    it('should handle different latitudes', () => {
      const locations = [
        { latitude: 0, longitude: 0 }, // Equator
        { latitude: 40, longitude: -74 }, // New York
        { latitude: -33.87, longitude: 151.21 }, // Sydney
        { latitude: 60, longitude: 10 }, // High latitude
      ];

      for (const location of locations) {
        const result = calculateHouses(location, lst, T, 'placidus');
        assert.ok(result.cusps.cusps.every((c) => c >= 0 && c < 360));
      }
    });
  });

  describe('calculateAnglesOnly', () => {
    it('should calculate just the four angles', () => {
      const angles = calculateAnglesOnly(london, lst, T);

      assert.ok(typeof angles.ascendant === 'number');
      assert.ok(typeof angles.midheaven === 'number');
      assert.ok(typeof angles.descendant === 'number');
      assert.ok(typeof angles.imumCoeli === 'number');

      // DSC should be opposite ASC
      const expectedDSC = (angles.ascendant + 180) % 360;
      assert.ok(Math.abs(angles.descendant - expectedDSC) < 0.001);

      // IC should be opposite MC
      const expectedIC = (angles.midheaven + 180) % 360;
      assert.ok(Math.abs(angles.imumCoeli - expectedIC) < 0.001);
    });

    it('should throw on invalid location', () => {
      assert.throws(() => {
        calculateAnglesOnly({ latitude: -100, longitude: 0 }, lst, T);
      }, /Invalid location/);
    });
  });

  describe('calculateMultipleSystems', () => {
    it('should calculate multiple systems efficiently', () => {
      const systems: Array<'placidus' | 'koch' | 'equal'> = ['placidus', 'koch', 'equal'];
      const results = calculateMultipleSystems(london, lst, T, systems);

      assert.ok(results.placidus);
      assert.ok(results.koch);
      assert.ok(results.equal);

      // All should have same angles
      assert.equal(results.placidus.angles.ascendant, results.koch.angles.ascendant);
      assert.equal(results.placidus.angles.midheaven, results.equal.angles.midheaven);
    });

    it('should calculate all systems by default', () => {
      const results = calculateMultipleSystems(london, lst, T);

      const expectedSystems = [
        'equal',
        'whole-sign',
        'porphyry',
        'placidus',
        'koch',
        'regiomontanus',
        'campanus',
      ];

      for (const system of expectedSystems) {
        assert.ok(results[system as HouseSystem], `Missing system: ${system}`);
      }
    });

    it('should show differences between systems', () => {
      const results = calculateMultipleSystems(london, lst, T, ['placidus', 'equal']);

      // Equal House 2 should be exactly ASC + 30
      const equalH2 = results.equal.cusps.cusps[1];
      const expectedEqualH2 = (results.equal.angles.ascendant + 30) % 360;
      assert.ok(Math.abs(equalH2 - expectedEqualH2) < 0.001);
    });
  });

  describe('Utility Functions', () => {
    it('getSupportedHouseSystems should return all systems', () => {
      const systems = getSupportedHouseSystems();

      assert.ok(systems.includes('placidus'));
      assert.ok(systems.includes('koch'));
      assert.ok(systems.includes('equal'));
      assert.ok(systems.includes('whole-sign'));
      assert.ok(systems.includes('porphyry'));
      assert.ok(systems.includes('regiomontanus'));
      assert.ok(systems.includes('campanus'));
    });

    it('getHouseSystemName should return display names', () => {
      assert.equal(getHouseSystemName('placidus'), 'Placidus');
      assert.equal(getHouseSystemName('whole-sign'), 'Whole Sign');
      assert.equal(getHouseSystemName('koch'), 'Koch');
    });

    it('systemRequiresLatitude should identify systems correctly', () => {
      assert.equal(systemRequiresLatitude('equal'), false);
      assert.equal(systemRequiresLatitude('whole-sign'), false);
      assert.equal(systemRequiresLatitude('placidus'), true);
      assert.equal(systemRequiresLatitude('koch'), true);
      assert.equal(systemRequiresLatitude('campanus'), true);
    });

    it('systemWorksAtPolarCircle should identify systems correctly', () => {
      assert.equal(systemWorksAtPolarCircle('equal'), true);
      assert.equal(systemWorksAtPolarCircle('porphyry'), true);
      assert.equal(systemWorksAtPolarCircle('placidus'), false);
      assert.equal(systemWorksAtPolarCircle('koch'), false);
      assert.equal(systemWorksAtPolarCircle('regiomontanus'), true);
    });
  });

  describe('Real-World Scenarios', () => {
    it('should handle birth chart calculation', () => {
      // Example: Birth in New York, specific time
      const birthLocation = {
        latitude: 40.7128,
        longitude: -74.006,
      };
      const birthLST = 125.5;
      const birthTime = 0.1; // Some time after J2000

      const chart = calculateHouses(birthLocation, birthLST, birthTime, 'placidus');

      assert.ok(chart.angles.ascendant >= 0 && chart.angles.ascendant < 360);
      assert.ok(chart.cusps.cusps.every((c) => c >= 0 && c < 360));
    });

    it('should handle comparison of different house systems', () => {
      const comparison = calculateMultipleSystems(london, lst, T, ['placidus', 'koch', 'equal']);

      // All should have same ASC (House 1)
      const ascPlacidus = comparison.placidus.cusps.cusps[0];
      const ascKoch = comparison.koch.cusps.cusps[0];
      const ascEqual = comparison.equal.cusps.cusps[0];

      assert.ok(Math.abs(ascPlacidus - ascKoch) < 0.0001);
      assert.ok(Math.abs(ascPlacidus - ascEqual) < 0.0001);

      // Placidus and Koch should have MC at House 10
      // (Equal houses doesn't - MC floats independently)
      const mcPlacidus = comparison.placidus.cusps.cusps[9];
      const mcKoch = comparison.koch.cusps.cusps[9];

      assert.ok(Math.abs(mcPlacidus - mcKoch) < 0.0001, 'Placidus and Koch should have same MC');

      // Verify MC matches House 10 for Placidus and Koch
      assert.ok(
        Math.abs(mcPlacidus - comparison.placidus.angles.midheaven) < 0.0001,
        'Placidus House 10 should equal MC',
      );
      assert.ok(
        Math.abs(mcKoch - comparison.koch.angles.midheaven) < 0.0001,
        'Koch House 10 should equal MC',
      );

      // For Equal houses, House 10 is ASC + 270°, not MC
      const equalH10 = comparison.equal.cusps.cusps[9];
      const expectedEqualH10 = (ascEqual + 270) % 360;
      assert.ok(
        Math.abs(equalH10 - expectedEqualH10) < 0.001,
        'Equal House 10 should be ASC + 270°',
      );

      // Equal house 2 should be exactly ASC + 30
      const h2Equal = comparison.equal.cusps.cusps[1];
      const expectedEqualH2 = (ascEqual + 30) % 360;
      assert.ok(Math.abs(h2Equal - expectedEqualH2) < 0.001);
    });
  });

  describe('Edge Cases', () => {
    it('should handle LST at boundaries', () => {
      const testLSTs = [0, 90, 180, 270, 359.9];

      for (const testLST of testLSTs) {
        const result = calculateHouses(london, testLST, T);
        assert.ok(result.cusps.cusps.every((c) => c >= 0 && c < 360));
      }
    });

    it('should handle different epochs', () => {
      const epochs = [-1, 0, 0.5, 1]; // J2000 and surrounding times

      for (const epoch of epochs) {
        const result = calculateHouses(london, lst, epoch);
        assert.ok(result.cusps.cusps.every((c) => c >= 0 && c < 360));
      }
    });

    it('should handle Southern hemisphere', () => {
      const southern = {
        latitude: -33.87,
        longitude: 151.21,
      };

      const result = calculateHouses(southern, lst, T);
      assert.ok(result.cusps.cusps.every((c) => c >= 0 && c < 360));
    });
  });
});
