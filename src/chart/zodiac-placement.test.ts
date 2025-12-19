/**
 * Tests for Zodiac Placement
 *
 * @remarks
 * Tests validate zodiac sign/house placement and dignity calculations.
 * Element/modality/polarity mappings are mathematical facts, not astronomical.
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { CelestialBody } from '../ephemeris/positions.js';
import type { PlanetPosition } from '../ephemeris/types.js';
import { Sign } from '../zodiac/types.js';
import type { ChartHouses } from './types.js';
import {
  buildChartLilith,
  buildChartLot,
  buildChartNode,
  buildChartPlanet,
  getElement,
  getHemisphere,
  getModality,
  getPolarity,
  getQuadrant,
  getSignForLongitude,
} from './zodiac-placement.js';

// Helper to create a mock ChartHouses object
function mockHouses(ascLongitude: number): ChartHouses {
  const cusps = Array.from({ length: 12 }, (_, i) => {
    let lon = ascLongitude + i * 30;
    if (lon >= 360) lon -= 360;
    return {
      house: i + 1,
      longitude: lon,
      sign: Math.floor(lon / 30) as Sign,
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
      ][Math.floor(lon / 30)],
      degree: Math.floor(lon % 30),
      minute: Math.floor((lon % 1) * 60),
      formatted: `${Math.floor(lon % 30)}° ${['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'][Math.floor(lon / 30)]}`,
      size: 30,
    };
  });

  return {
    system: 'equal',
    systemName: 'Equal',
    cusps,
  };
}

// Helper to create a mock PlanetPosition
function mockPlanetPosition(longitude: number, speed = 1): PlanetPosition {
  return {
    longitude,
    latitude: 0,
    distance: 1,
    longitudeSpeed: speed,
    isRetrograde: speed < 0,
  };
}

describe('chart/zodiac-placement', () => {
  describe('getSignForLongitude', () => {
    it('should return Aries for 0-30°', () => {
      assert.equal(getSignForLongitude(0), Sign.Aries);
      assert.equal(getSignForLongitude(15), Sign.Aries);
      assert.equal(getSignForLongitude(29.9), Sign.Aries);
    });

    it('should return Taurus for 30-60°', () => {
      assert.equal(getSignForLongitude(30), Sign.Taurus);
      assert.equal(getSignForLongitude(45), Sign.Taurus);
    });

    it('should return each sign for its range', () => {
      const signs = [
        Sign.Aries,
        Sign.Taurus,
        Sign.Gemini,
        Sign.Cancer,
        Sign.Leo,
        Sign.Virgo,
        Sign.Libra,
        Sign.Scorpio,
        Sign.Sagittarius,
        Sign.Capricorn,
        Sign.Aquarius,
        Sign.Pisces,
      ];

      for (let i = 0; i < 12; i++) {
        assert.equal(getSignForLongitude(i * 30 + 15), signs[i], `Sign at ${i * 30 + 15}°`);
      }
    });

    it('should handle values near 360° (Pisces)', () => {
      assert.equal(getSignForLongitude(350), Sign.Pisces);
      assert.equal(getSignForLongitude(359.9), Sign.Pisces);
    });

    it('should normalize values > 360', () => {
      assert.equal(getSignForLongitude(370), Sign.Aries); // 370 - 360 = 10
      assert.equal(getSignForLongitude(400), Sign.Taurus); // 400 - 360 = 40
    });
  });

  describe('getElement', () => {
    it('should return fire for fire signs', () => {
      assert.equal(getElement(Sign.Aries), 'fire');
      assert.equal(getElement(Sign.Leo), 'fire');
      assert.equal(getElement(Sign.Sagittarius), 'fire');
    });

    it('should return earth for earth signs', () => {
      assert.equal(getElement(Sign.Taurus), 'earth');
      assert.equal(getElement(Sign.Virgo), 'earth');
      assert.equal(getElement(Sign.Capricorn), 'earth');
    });

    it('should return air for air signs', () => {
      assert.equal(getElement(Sign.Gemini), 'air');
      assert.equal(getElement(Sign.Libra), 'air');
      assert.equal(getElement(Sign.Aquarius), 'air');
    });

    it('should return water for water signs', () => {
      assert.equal(getElement(Sign.Cancer), 'water');
      assert.equal(getElement(Sign.Scorpio), 'water');
      assert.equal(getElement(Sign.Pisces), 'water');
    });
  });

  describe('getModality', () => {
    it('should return cardinal for cardinal signs', () => {
      assert.equal(getModality(Sign.Aries), 'cardinal');
      assert.equal(getModality(Sign.Cancer), 'cardinal');
      assert.equal(getModality(Sign.Libra), 'cardinal');
      assert.equal(getModality(Sign.Capricorn), 'cardinal');
    });

    it('should return fixed for fixed signs', () => {
      assert.equal(getModality(Sign.Taurus), 'fixed');
      assert.equal(getModality(Sign.Leo), 'fixed');
      assert.equal(getModality(Sign.Scorpio), 'fixed');
      assert.equal(getModality(Sign.Aquarius), 'fixed');
    });

    it('should return mutable for mutable signs', () => {
      assert.equal(getModality(Sign.Gemini), 'mutable');
      assert.equal(getModality(Sign.Virgo), 'mutable');
      assert.equal(getModality(Sign.Sagittarius), 'mutable');
      assert.equal(getModality(Sign.Pisces), 'mutable');
    });
  });

  describe('getPolarity', () => {
    it('should return positive for masculine/positive signs', () => {
      assert.equal(getPolarity(Sign.Aries), 'positive');
      assert.equal(getPolarity(Sign.Gemini), 'positive');
      assert.equal(getPolarity(Sign.Leo), 'positive');
      assert.equal(getPolarity(Sign.Libra), 'positive');
      assert.equal(getPolarity(Sign.Sagittarius), 'positive');
      assert.equal(getPolarity(Sign.Aquarius), 'positive');
    });

    it('should return negative for feminine/negative signs', () => {
      assert.equal(getPolarity(Sign.Taurus), 'negative');
      assert.equal(getPolarity(Sign.Cancer), 'negative');
      assert.equal(getPolarity(Sign.Virgo), 'negative');
      assert.equal(getPolarity(Sign.Scorpio), 'negative');
      assert.equal(getPolarity(Sign.Capricorn), 'negative');
      assert.equal(getPolarity(Sign.Pisces), 'negative');
    });
  });

  describe('getQuadrant', () => {
    it('should return quadrant 1 for houses 1-3', () => {
      assert.equal(getQuadrant(1), 1);
      assert.equal(getQuadrant(2), 1);
      assert.equal(getQuadrant(3), 1);
    });

    it('should return quadrant 2 for houses 4-6', () => {
      assert.equal(getQuadrant(4), 2);
      assert.equal(getQuadrant(5), 2);
      assert.equal(getQuadrant(6), 2);
    });

    it('should return quadrant 3 for houses 7-9', () => {
      assert.equal(getQuadrant(7), 3);
      assert.equal(getQuadrant(8), 3);
      assert.equal(getQuadrant(9), 3);
    });

    it('should return quadrant 4 for houses 10-12', () => {
      assert.equal(getQuadrant(10), 4);
      assert.equal(getQuadrant(11), 4);
      assert.equal(getQuadrant(12), 4);
    });
  });

  describe('getHemisphere', () => {
    it('should return north for houses 1-6 (below horizon)', () => {
      for (let house = 1; house <= 6; house++) {
        const { vertical } = getHemisphere(house);
        assert.equal(vertical, 'north', `House ${house}`);
      }
    });

    it('should return south for houses 7-12 (above horizon)', () => {
      for (let house = 7; house <= 12; house++) {
        const { vertical } = getHemisphere(house);
        assert.equal(vertical, 'south', `House ${house}`);
      }
    });

    it('should return east for rising houses (10-12, 1-3)', () => {
      const eastern = [10, 11, 12, 1, 2, 3];
      for (const house of eastern) {
        const { horizontal } = getHemisphere(house);
        assert.equal(horizontal, 'east', `House ${house}`);
      }
    });

    it('should return west for setting houses (4-9)', () => {
      const western = [4, 5, 6, 7, 8, 9];
      for (const house of western) {
        const { horizontal } = getHemisphere(house);
        assert.equal(horizontal, 'west', `House ${house}`);
      }
    });
  });

  describe('buildChartPlanet', () => {
    it('should build a complete ChartPlanet object', () => {
      const houses = mockHouses(0); // ASC at 0° Aries
      const position = mockPlanetPosition(15); // 15° Aries
      const planet = buildChartPlanet(CelestialBody.Sun, position, houses);

      assert.equal(planet.name, 'Sun');
      assert.equal(planet.body, CelestialBody.Sun);
      assert.equal(planet.longitude, 15);
      assert.equal(planet.sign, Sign.Aries);
      assert.equal(planet.signName, 'Aries');
      assert.equal(planet.house, 1);
      assert.ok(planet.formatted.includes('Aries'));
    });

    it('should detect retrograde motion', () => {
      const houses = mockHouses(0);
      const directPosition = mockPlanetPosition(100, 0.5);
      const retroPosition = mockPlanetPosition(100, -0.5);

      const direct = buildChartPlanet(CelestialBody.Mars, directPosition, houses);
      const retro = buildChartPlanet(CelestialBody.Mars, retroPosition, houses);

      assert.equal(direct.isRetrograde, false);
      assert.equal(retro.isRetrograde, true);
    });

    it('should calculate dignity for traditional planets', () => {
      const houses = mockHouses(0);

      // Sun in Leo (Domicile)
      const sunInLeo = buildChartPlanet(
        CelestialBody.Sun,
        mockPlanetPosition(125), // Leo
        houses,
      );
      assert.equal(sunInLeo.dignity.state, 'Domicile');

      // Mars in Aries (Domicile)
      const marsInAries = buildChartPlanet(
        CelestialBody.Mars,
        mockPlanetPosition(15), // Aries
        houses,
      );
      assert.equal(marsInAries.dignity.state, 'Domicile');
    });
  });

  describe('buildChartNode', () => {
    it('should build North Node correctly', () => {
      const houses = mockHouses(0);
      const node = buildChartNode('North Node', 'True', 125, houses);

      assert.equal(node.name, 'North Node');
      assert.equal(node.type, 'True');
      assert.equal(node.longitude, 125);
      assert.equal(node.sign, Sign.Leo);
      assert.equal(node.signName, 'Leo');
      assert.ok(node.house >= 1 && node.house <= 12);
    });

    it('should build Mean Node', () => {
      const houses = mockHouses(0);
      const node = buildChartNode('North Node', 'Mean', 45, houses);

      assert.equal(node.type, 'Mean');
    });
  });

  describe('buildChartLilith', () => {
    it('should build Lilith correctly', () => {
      const houses = mockHouses(0);
      const lilith = buildChartLilith('Mean', 200, houses);

      assert.equal(lilith.name, 'Mean Lilith');
      assert.equal(lilith.type, 'Mean');
      assert.equal(lilith.longitude, 200);
      assert.equal(lilith.sign, Sign.Libra);
    });

    it('should handle True Lilith', () => {
      const houses = mockHouses(0);
      const lilith = buildChartLilith('True', 250, houses);

      assert.equal(lilith.name, 'True Lilith');
      assert.equal(lilith.type, 'True');
    });
  });

  describe('buildChartLot', () => {
    it('should build Part of Fortune correctly', () => {
      const houses = mockHouses(0);
      const lot = buildChartLot('Part of Fortune', 'ASC + Moon - Sun', 90, houses);

      assert.equal(lot.name, 'Part of Fortune');
      assert.equal(lot.formula, 'ASC + Moon - Sun');
      assert.equal(lot.longitude, 90);
      assert.equal(lot.sign, Sign.Cancer);
    });
  });
});
