/**
 * Tests for Unified Position Calculator
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { J2000_EPOCH } from './constants.js';
import {
  CelestialBody,
  DEFAULT_BODIES,
  getAllPositions,
  getAllPositionsObject,
  getDegreeInSign,
  getPosition,
  getSign,
  isRetrograde,
} from './positions.js';
import { Planet } from './types.js';

describe('ephemeris/positions', () => {
  describe('getPosition', () => {
    it('should get Sun position using Planet enum', () => {
      const sun = getPosition(Planet.Sun, J2000_EPOCH);
      assert.ok(sun.longitude >= 0 && sun.longitude < 360);
      assert.ok(typeof sun.distance === 'number');
    });

    it('should get Sun position using CelestialBody enum', () => {
      const sun = getPosition(CelestialBody.Sun, J2000_EPOCH);
      assert.ok(sun.longitude >= 0 && sun.longitude < 360);
    });

    it('should get Sun position using string', () => {
      const sun = getPosition('Sun', J2000_EPOCH);
      assert.ok(sun.longitude >= 0 && sun.longitude < 360);
    });

    it('should get Moon position', () => {
      const moon = getPosition(Planet.Moon, J2000_EPOCH);
      assert.ok(moon.longitude >= 0 && moon.longitude < 360);
      assert.ok(Math.abs(moon.latitude) < 6); // Moon latitude < 6°
    });

    it('should get all classical planets', () => {
      const planets = [Planet.Mercury, Planet.Venus, Planet.Mars, Planet.Jupiter, Planet.Saturn];

      for (const planet of planets) {
        const pos = getPosition(planet, J2000_EPOCH);
        assert.ok(pos.longitude >= 0 && pos.longitude < 360, `${planet} longitude invalid`);
      }
    });

    it('should get modern planets', () => {
      const planets = [Planet.Uranus, Planet.Neptune, Planet.Pluto];

      for (const planet of planets) {
        const pos = getPosition(planet, J2000_EPOCH);
        assert.ok(pos.longitude >= 0 && pos.longitude < 360, `${planet} longitude invalid`);
      }
    });

    it('should get Mean North Node', () => {
      const node = getPosition(Planet.NorthNode, J2000_EPOCH);
      assert.ok(node.longitude >= 0 && node.longitude < 360);
      assert.ok(node.isRetrograde, 'Mean Node should be retrograde');
    });

    it('should get True North Node', () => {
      const node = getPosition(CelestialBody.TrueNorthNode, J2000_EPOCH);
      assert.ok(node.longitude >= 0 && node.longitude < 360);
    });

    it('should get South Node as opposite of North Node', () => {
      const north = getPosition(Planet.NorthNode, J2000_EPOCH);
      const south = getPosition(Planet.SouthNode, J2000_EPOCH);

      let diff = Math.abs(south.longitude - ((north.longitude + 180) % 360));
      if (diff > 180) diff = 360 - diff;

      assert.ok(diff < 0.01, 'South Node should be 180° from North Node');
    });

    it('should get True South Node', () => {
      const trueNorth = getPosition(CelestialBody.TrueNorthNode, J2000_EPOCH);
      const trueSouth = getPosition(CelestialBody.TrueSouthNode, J2000_EPOCH);

      let diff = Math.abs(trueSouth.longitude - ((trueNorth.longitude + 180) % 360));
      if (diff > 180) diff = 360 - diff;

      assert.ok(diff < 0.01, 'True South Node should be 180° from True North Node');
    });

    it('should get Mean Lilith', () => {
      const lilith = getPosition(Planet.Lilith, J2000_EPOCH);
      assert.ok(lilith.longitude >= 0 && lilith.longitude < 360);
    });

    it('should get True Lilith', () => {
      const lilith = getPosition(CelestialBody.TrueLilith, J2000_EPOCH);
      assert.ok(lilith.longitude >= 0 && lilith.longitude < 360);
    });

    it('should get Chiron', () => {
      const chiron = getPosition(Planet.Chiron, J2000_EPOCH);
      assert.ok(chiron.longitude >= 0 && chiron.longitude < 360);
      assert.ok(chiron.distance > 7, 'Chiron should be > 7 AU from Earth');
    });

    it('should throw for unknown body', () => {
      assert.throws(() => getPosition('Unknown' as Planet, J2000_EPOCH), /Unknown celestial body/);
    });

    it('should respect includeSpeed option', () => {
      const withSpeed = getPosition(Planet.Sun, J2000_EPOCH, { includeSpeed: true });
      const withoutSpeed = getPosition(Planet.Sun, J2000_EPOCH, { includeSpeed: false });

      assert.ok(withSpeed.longitudeSpeed !== 0);
      assert.strictEqual(withoutSpeed.longitudeSpeed, 0);
    });
  });

  describe('getAllPositions', () => {
    it('should return positions for all default bodies', () => {
      const positions = getAllPositions(J2000_EPOCH);

      assert.strictEqual(positions.size, DEFAULT_BODIES.length);

      for (const body of DEFAULT_BODIES) {
        assert.ok(positions.has(body), `Missing ${body}`);
        const pos = positions.get(body)!;
        assert.ok(pos.longitude >= 0 && pos.longitude < 360);
      }
    });

    it('should return Map type', () => {
      const positions = getAllPositions(J2000_EPOCH);
      assert.ok(positions instanceof Map);
    });

    it('should allow custom body list', () => {
      const bodies = [Planet.Sun, Planet.Moon];
      const positions = getAllPositions(J2000_EPOCH, bodies);

      assert.strictEqual(positions.size, 2);
      assert.ok(positions.has(Planet.Sun));
      assert.ok(positions.has(Planet.Moon));
    });

    it('should include extended bodies', () => {
      const bodies = [CelestialBody.TrueNorthNode, CelestialBody.TrueLilith];
      const positions = getAllPositions(J2000_EPOCH, bodies);

      assert.strictEqual(positions.size, 2);
    });
  });

  describe('getAllPositionsObject', () => {
    it('should return plain object', () => {
      const positions = getAllPositionsObject(J2000_EPOCH);

      assert.ok(typeof positions === 'object');
      assert.ok(!Array.isArray(positions));
      assert.ok(!(positions instanceof Map));
    });

    it('should have string keys', () => {
      const positions = getAllPositionsObject(J2000_EPOCH);

      assert.ok('Sun' in positions);
      assert.ok('Moon' in positions);
    });

    it('should be JSON serializable', () => {
      const positions = getAllPositionsObject(J2000_EPOCH);
      const json = JSON.stringify(positions);
      const parsed = JSON.parse(json);

      assert.ok(parsed.Sun.longitude > 0);
    });
  });

  describe('isRetrograde', () => {
    it('should return false for Sun', () => {
      assert.strictEqual(isRetrograde(Planet.Sun, J2000_EPOCH), false);
    });

    it('should return false for Moon', () => {
      assert.strictEqual(isRetrograde(Planet.Moon, J2000_EPOCH), false);
    });

    it('should detect retrograde nodes', () => {
      // Nodes are almost always retrograde
      const nodeRetro = isRetrograde(Planet.NorthNode, J2000_EPOCH);
      assert.ok(nodeRetro, 'Mean Node should be retrograde');
    });

    it('should detect retrograde planets over time', () => {
      // Mercury retrogrades ~3 times per year
      // Check 400 days to find at least one retrograde period
      let foundRetrograde = false;

      for (let i = 0; i < 400; i++) {
        if (isRetrograde(Planet.Mercury, J2000_EPOCH + i)) {
          foundRetrograde = true;
          break;
        }
      }

      assert.ok(foundRetrograde, 'Should find Mercury retrograde within a year');
    });
  });

  describe('getSign', () => {
    it('should return sign index 0-11', () => {
      const sign = getSign(Planet.Sun, J2000_EPOCH);
      assert.ok(sign >= 0 && sign <= 11);
    });

    it('should return correct sign for Sun at J2000.0', () => {
      // Sun at J2000.0 is at ~280° = Capricorn (sign 9)
      const sign = getSign(Planet.Sun, J2000_EPOCH);
      assert.strictEqual(sign, 9, 'Sun should be in Capricorn at J2000.0');
    });
  });

  describe('getDegreeInSign', () => {
    it('should return degree 0-30', () => {
      const degree = getDegreeInSign(Planet.Sun, J2000_EPOCH);
      assert.ok(degree >= 0 && degree < 30);
    });

    it('should be consistent with getSign', () => {
      const jd = J2000_EPOCH;
      const pos = getPosition(Planet.Sun, jd);
      const sign = getSign(Planet.Sun, jd);
      const degree = getDegreeInSign(Planet.Sun, jd);

      const reconstructed = sign * 30 + degree;
      assert.ok(Math.abs(reconstructed - pos.longitude) < 0.001);
    });
  });

  describe('DEFAULT_BODIES', () => {
    it('should include all major astrological bodies', () => {
      assert.ok(DEFAULT_BODIES.includes(Planet.Sun));
      assert.ok(DEFAULT_BODIES.includes(Planet.Moon));
      assert.ok(DEFAULT_BODIES.includes(Planet.Mercury));
      assert.ok(DEFAULT_BODIES.includes(Planet.Venus));
      assert.ok(DEFAULT_BODIES.includes(Planet.Mars));
      assert.ok(DEFAULT_BODIES.includes(Planet.Jupiter));
      assert.ok(DEFAULT_BODIES.includes(Planet.Saturn));
      assert.ok(DEFAULT_BODIES.includes(Planet.Uranus));
      assert.ok(DEFAULT_BODIES.includes(Planet.Neptune));
      assert.ok(DEFAULT_BODIES.includes(Planet.Pluto));
      assert.ok(DEFAULT_BODIES.includes(Planet.NorthNode));
      assert.ok(DEFAULT_BODIES.includes(Planet.SouthNode));
      assert.ok(DEFAULT_BODIES.includes(Planet.Lilith));
      assert.ok(DEFAULT_BODIES.includes(Planet.Chiron));
    });
  });
});
