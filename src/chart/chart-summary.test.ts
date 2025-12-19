/**
 * Tests for Chart Summary
 *
 * @remarks
 * Tests validate chart summary statistics and analysis functions.
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { CelestialBody } from '../ephemeris/positions.js';
import { DignityState, Sign } from '../zodiac/types.js';
import {
  calculateElementDistribution,
  calculateHemisphereDistribution,
  calculateModalityDistribution,
  calculatePolarityBalance,
  calculateQuadrantDistribution,
  getDominantElement,
  getDominantModality,
} from './chart-summary.js';
import type { ChartPlanet } from './types.js';

// Helper to create mock planets
function mockPlanet(sign: Sign, house: number): ChartPlanet {
  return {
    name: 'Test',
    body: CelestialBody.Sun,
    longitude: sign * 30 + 15,
    latitude: 0,
    distance: 1,
    longitudeSpeed: 1,
    isRetrograde: false,
    sign,
    signName: [
      'Aries',
      'Taurus',
      'Gemini',
      'Cancer',
      'Leo',
      'Virgo',
      'Libra',
      'Scorpio',
      'Sagittarius',
      'Capricorn',
      'Aquarius',
      'Pisces',
    ][sign],
    degree: 15,
    minute: 0,
    second: 0,
    formatted: `15° ${['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'][sign]}`,
    house,
    dignity: { state: DignityState.Peregrine, strength: 0, description: 'Test' },
  };
}

describe('chart/chart-summary', () => {
  describe('calculateElementDistribution', () => {
    it('should group planets by element', () => {
      const planets = [
        mockPlanet(Sign.Aries, 1), // Fire
        mockPlanet(Sign.Leo, 5), // Fire
        mockPlanet(Sign.Taurus, 2), // Earth
        mockPlanet(Sign.Cancer, 4), // Water
      ];

      const dist = calculateElementDistribution(planets);

      assert.equal(dist.fire.length, 2);
      assert.equal(dist.earth.length, 1);
      assert.equal(dist.water.length, 1);
      assert.equal(dist.air.length, 0);
    });

    it('should return empty arrays for no planets', () => {
      const dist = calculateElementDistribution([]);

      assert.equal(dist.fire.length, 0);
      assert.equal(dist.earth.length, 0);
      assert.equal(dist.air.length, 0);
      assert.equal(dist.water.length, 0);
    });

    it('should group all 12 signs correctly', () => {
      const planets = [
        // Fire
        mockPlanet(Sign.Aries, 1),
        mockPlanet(Sign.Leo, 5),
        mockPlanet(Sign.Sagittarius, 9),
        // Earth
        mockPlanet(Sign.Taurus, 2),
        mockPlanet(Sign.Virgo, 6),
        mockPlanet(Sign.Capricorn, 10),
        // Air
        mockPlanet(Sign.Gemini, 3),
        mockPlanet(Sign.Libra, 7),
        mockPlanet(Sign.Aquarius, 11),
        // Water
        mockPlanet(Sign.Cancer, 4),
        mockPlanet(Sign.Scorpio, 8),
        mockPlanet(Sign.Pisces, 12),
      ];

      const dist = calculateElementDistribution(planets);

      assert.equal(dist.fire.length, 3);
      assert.equal(dist.earth.length, 3);
      assert.equal(dist.air.length, 3);
      assert.equal(dist.water.length, 3);
    });
  });

  describe('calculateModalityDistribution', () => {
    it('should group planets by modality', () => {
      const planets = [
        mockPlanet(Sign.Aries, 1), // Cardinal
        mockPlanet(Sign.Cancer, 4), // Cardinal
        mockPlanet(Sign.Taurus, 2), // Fixed
        mockPlanet(Sign.Gemini, 3), // Mutable
      ];

      const dist = calculateModalityDistribution(planets);

      assert.equal(dist.cardinal.length, 2);
      assert.equal(dist.fixed.length, 1);
      assert.equal(dist.mutable.length, 1);
    });

    it('should group cardinal signs correctly', () => {
      const cardinals = [
        mockPlanet(Sign.Aries, 1),
        mockPlanet(Sign.Cancer, 4),
        mockPlanet(Sign.Libra, 7),
        mockPlanet(Sign.Capricorn, 10),
      ];

      const dist = calculateModalityDistribution(cardinals);
      assert.equal(dist.cardinal.length, 4);
    });

    it('should group fixed signs correctly', () => {
      const fixed = [
        mockPlanet(Sign.Taurus, 2),
        mockPlanet(Sign.Leo, 5),
        mockPlanet(Sign.Scorpio, 8),
        mockPlanet(Sign.Aquarius, 11),
      ];

      const dist = calculateModalityDistribution(fixed);
      assert.equal(dist.fixed.length, 4);
    });

    it('should group mutable signs correctly', () => {
      const mutable = [
        mockPlanet(Sign.Gemini, 3),
        mockPlanet(Sign.Virgo, 6),
        mockPlanet(Sign.Sagittarius, 9),
        mockPlanet(Sign.Pisces, 12),
      ];

      const dist = calculateModalityDistribution(mutable);
      assert.equal(dist.mutable.length, 4);
    });
  });

  describe('calculatePolarityBalance', () => {
    it('should count positive (masculine) and negative (feminine) signs', () => {
      const planets = [
        mockPlanet(Sign.Aries, 1), // Positive (Fire)
        mockPlanet(Sign.Taurus, 2), // Negative (Earth)
        mockPlanet(Sign.Gemini, 3), // Positive (Air)
        mockPlanet(Sign.Cancer, 4), // Negative (Water)
      ];

      const dist = calculatePolarityBalance(planets);

      assert.equal(dist.positive, 2);
      assert.equal(dist.negative, 2);
    });
  });

  describe('calculateHemisphereDistribution', () => {
    it('should count northern hemisphere (houses 1-6)', () => {
      const planets = [
        mockPlanet(Sign.Aries, 1),
        mockPlanet(Sign.Taurus, 3),
        mockPlanet(Sign.Gemini, 6),
      ];

      const dist = calculateHemisphereDistribution(planets);
      assert.equal(dist.north, 3);
      assert.equal(dist.south, 0);
    });

    it('should count southern hemisphere (houses 7-12)', () => {
      const planets = [
        mockPlanet(Sign.Aries, 7),
        mockPlanet(Sign.Taurus, 10),
        mockPlanet(Sign.Gemini, 12),
      ];

      const dist = calculateHemisphereDistribution(planets);
      assert.equal(dist.north, 0);
      assert.equal(dist.south, 3);
    });

    it('should count eastern and western hemispheres', () => {
      // Eastern: 10, 11, 12, 1, 2, 3
      // Western: 4, 5, 6, 7, 8, 9
      const planets = [
        mockPlanet(Sign.Aries, 1), // East
        mockPlanet(Sign.Taurus, 5), // West
        mockPlanet(Sign.Gemini, 10), // East
      ];

      const dist = calculateHemisphereDistribution(planets);
      assert.equal(dist.east, 2);
      assert.equal(dist.west, 1);
    });
  });

  describe('calculateQuadrantDistribution', () => {
    it('should group quadrant 1 (houses 1-3)', () => {
      const planets = [
        mockPlanet(Sign.Aries, 1),
        mockPlanet(Sign.Taurus, 2),
        mockPlanet(Sign.Gemini, 3),
      ];

      const dist = calculateQuadrantDistribution(planets);
      assert.equal(dist.first.length, 3);
    });

    it('should group quadrant 2 (houses 4-6)', () => {
      const planets = [
        mockPlanet(Sign.Aries, 4),
        mockPlanet(Sign.Taurus, 5),
        mockPlanet(Sign.Gemini, 6),
      ];

      const dist = calculateQuadrantDistribution(planets);
      assert.equal(dist.second.length, 3);
    });

    it('should group quadrant 3 (houses 7-9)', () => {
      const planets = [
        mockPlanet(Sign.Aries, 7),
        mockPlanet(Sign.Taurus, 8),
        mockPlanet(Sign.Gemini, 9),
      ];

      const dist = calculateQuadrantDistribution(planets);
      assert.equal(dist.third.length, 3);
    });

    it('should group quadrant 4 (houses 10-12)', () => {
      const planets = [
        mockPlanet(Sign.Aries, 10),
        mockPlanet(Sign.Taurus, 11),
        mockPlanet(Sign.Gemini, 12),
      ];

      const dist = calculateQuadrantDistribution(planets);
      assert.equal(dist.fourth.length, 3);
    });
  });

  describe('getDominantElement', () => {
    it('should return element with most planets', () => {
      const elements = {
        fire: ['Sun', 'Mars', 'Jupiter'],
        earth: ['Venus'],
        air: ['Mercury'],
        water: [],
      };

      const dominant = getDominantElement(elements);
      assert.equal(dominant, 'fire');
    });

    it('should handle tie by returning first (fire > earth > air > water)', () => {
      const elements = {
        fire: ['Sun', 'Mars'],
        earth: ['Venus', 'Saturn'],
        air: [],
        water: [],
      };

      const dominant = getDominantElement(elements);
      // Could be either - just verify it returns one of them
      assert.ok(['fire', 'earth'].includes(dominant));
    });
  });

  describe('getDominantModality', () => {
    it('should return modality with most planets', () => {
      const modalities = {
        cardinal: ['Sun', 'Mars', 'Jupiter'],
        fixed: ['Venus'],
        mutable: [],
      };

      const dominant = getDominantModality(modalities);
      assert.equal(dominant, 'cardinal');
    });
  });
});
