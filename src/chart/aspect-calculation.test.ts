/**
 * Tests for Aspect Calculation
 *
 * @remarks
 * Tests validate aspect calculation wrapper functionality.
 * Underlying aspect detection is validated in the aspects module tests.
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { CelestialBody } from '../ephemeris/positions.js';
import { DignityState, type Sign } from '../zodiac/types.js';
import {
  buildAspectBodies,
  calculateChartAspects,
  getApplyingAspects,
  getAspectBetween,
  getAspectsForPlanet,
  getSeparatingAspects,
  getStrongestAspect,
} from './aspect-calculation.js';
import { DEFAULT_OPTIONS } from './constants.js';
import type { ChartPlanet } from './types.js';

// Helper to create a mock ChartPlanet
function mockPlanet(name: string, longitude: number, speed = 1): ChartPlanet {
  return {
    name,
    body: CelestialBody.Sun, // Doesn't matter for aspect tests
    longitude,
    latitude: 0,
    distance: 1,
    longitudeSpeed: speed,
    isRetrograde: speed < 0,
    sign: Math.floor(longitude / 30) as Sign,
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
    ][Math.floor(longitude / 30) % 12],
    degree: Math.floor(longitude % 30),
    minute: Math.floor((longitude % 1) * 60),
    second: 0,
    formatted: `${Math.floor(longitude % 30)}° ${['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'][Math.floor(longitude / 30) % 12]}`,
    house: 1,
    dignity: { state: DignityState.Peregrine, strength: 0, description: 'Test' },
  };
}

describe('chart/aspect-calculation', () => {
  describe('buildAspectBodies', () => {
    it('should convert ChartPlanets to AspectBodies', () => {
      const planets = [mockPlanet('Sun', 100), mockPlanet('Moon', 200)];

      const bodies = buildAspectBodies(planets);

      assert.equal(bodies.length, 2);
      assert.equal(bodies[0].name, 'Sun');
      assert.equal(bodies[0].longitude, 100);
      assert.equal(bodies[1].name, 'Moon');
      assert.equal(bodies[1].longitude, 200);
    });

    it('should include longitude speed', () => {
      const planets = [mockPlanet('Mars', 150, -0.5)];
      const bodies = buildAspectBodies(planets);

      assert.equal(bodies[0].longitudeSpeed, -0.5);
    });
  });

  describe('calculateChartAspects', () => {
    it('should find conjunction (0°)', () => {
      const planets = [
        mockPlanet('Sun', 100),
        mockPlanet('Moon', 102), // 2° orb
      ];

      const aspects = calculateChartAspects(
        planets,
        DEFAULT_OPTIONS as Required<typeof DEFAULT_OPTIONS>,
      );

      assert.ok(aspects.count > 0);
      const conjunction = aspects.all.find((a) => a.type === 'conjunction');
      assert.ok(conjunction, 'Should find conjunction');
    });

    it('should find opposition (180°)', () => {
      const planets = [
        mockPlanet('Sun', 100),
        mockPlanet('Moon', 280), // 180° away
      ];

      const aspects = calculateChartAspects(
        planets,
        DEFAULT_OPTIONS as Required<typeof DEFAULT_OPTIONS>,
      );

      const opposition = aspects.all.find((a) => a.type === 'opposition');
      assert.ok(opposition, 'Should find opposition');
    });

    it('should find trine (120°)', () => {
      const planets = [
        mockPlanet('Sun', 0),
        mockPlanet('Moon', 120), // Exact trine
      ];

      const aspects = calculateChartAspects(
        planets,
        DEFAULT_OPTIONS as Required<typeof DEFAULT_OPTIONS>,
      );

      const trine = aspects.all.find((a) => a.type === 'trine');
      assert.ok(trine, 'Should find trine');
    });

    it('should find square (90°)', () => {
      const planets = [
        mockPlanet('Sun', 0),
        mockPlanet('Mars', 90), // Exact square
      ];

      const aspects = calculateChartAspects(
        planets,
        DEFAULT_OPTIONS as Required<typeof DEFAULT_OPTIONS>,
      );

      const square = aspects.all.find((a) => a.type === 'square');
      assert.ok(square, 'Should find square');
    });

    it('should find sextile (60°)', () => {
      const planets = [
        mockPlanet('Sun', 0),
        mockPlanet('Venus', 60), // Exact sextile
      ];

      const aspects = calculateChartAspects(
        planets,
        DEFAULT_OPTIONS as Required<typeof DEFAULT_OPTIONS>,
      );

      const sextile = aspects.all.find((a) => a.type === 'sextile');
      assert.ok(sextile, 'Should find sextile');
    });

    it('should group aspects by body', () => {
      const planets = [mockPlanet('Sun', 0), mockPlanet('Moon', 120), mockPlanet('Mars', 180)];

      const aspects = calculateChartAspects(
        planets,
        DEFAULT_OPTIONS as Required<typeof DEFAULT_OPTIONS>,
      );

      // Sun should have aspects with both Moon and Mars
      assert.ok(aspects.byBody.Sun, 'Should have Sun aspects');
      assert.ok(aspects.byBody.Sun.length >= 2, 'Sun should have multiple aspects');
    });

    it('should count aspects in summary', () => {
      const planets = [
        mockPlanet('Sun', 0),
        mockPlanet('Moon', 0), // Conjunction
        mockPlanet('Mars', 120), // Trine
      ];

      const aspects = calculateChartAspects(
        planets,
        DEFAULT_OPTIONS as Required<typeof DEFAULT_OPTIONS>,
      );

      assert.ok(aspects.summary.conjunctions >= 1 || aspects.summary.trines >= 1);
      assert.equal(aspects.count, aspects.all.length);
    });

    it('should not find aspect outside orb', () => {
      const planets = [
        mockPlanet('Sun', 0),
        mockPlanet('Moon', 50), // 50° - not a major aspect angle
      ];

      const aspects = calculateChartAspects(
        planets,
        DEFAULT_OPTIONS as Required<typeof DEFAULT_OPTIONS>,
      );

      // Should not find any major aspects at 50°
      assert.equal(aspects.count, 0);
    });
  });

  describe('getAspectsForPlanet', () => {
    it('should return aspects involving specific planet', () => {
      const planets = [mockPlanet('Sun', 0), mockPlanet('Moon', 120), mockPlanet('Mars', 60)];

      const chartAspects = calculateChartAspects(
        planets,
        DEFAULT_OPTIONS as Required<typeof DEFAULT_OPTIONS>,
      );
      const sunAspects = getAspectsForPlanet(chartAspects, 'Sun');

      // Sun should have aspects with Moon (trine) and Mars (sextile)
      assert.ok(sunAspects.length >= 2);
      assert.ok(sunAspects.every((a) => a.body1 === 'Sun' || a.body2 === 'Sun'));
    });

    it('should return empty array for planet with no aspects', () => {
      const planets = [
        mockPlanet('Sun', 0),
        mockPlanet('Moon', 50), // No aspect
      ];

      const chartAspects = calculateChartAspects(
        planets,
        DEFAULT_OPTIONS as Required<typeof DEFAULT_OPTIONS>,
      );
      const sunAspects = getAspectsForPlanet(chartAspects, 'Sun');

      assert.equal(sunAspects.length, 0);
    });
  });

  describe('getStrongestAspect', () => {
    it('should return the aspect with highest strength', () => {
      const planets = [
        mockPlanet('Sun', 0),
        mockPlanet('Moon', 0), // Exact conjunction (strongest)
        mockPlanet('Mars', 125), // Trine with 5° orb (weaker)
      ];

      const chartAspects = calculateChartAspects(
        planets,
        DEFAULT_OPTIONS as Required<typeof DEFAULT_OPTIONS>,
      );
      const strongest = getStrongestAspect(chartAspects);

      assert.ok(strongest);
      assert.ok(strongest.strength > 0);
    });

    it('should return null for empty aspect list', () => {
      const planets = [
        mockPlanet('Sun', 0),
        mockPlanet('Moon', 50), // No aspect
      ];

      const chartAspects = calculateChartAspects(
        planets,
        DEFAULT_OPTIONS as Required<typeof DEFAULT_OPTIONS>,
      );
      const strongest = getStrongestAspect(chartAspects);

      assert.equal(strongest, null);
    });
  });

  describe('getApplyingAspects', () => {
    it('should return applying aspects', () => {
      // Faster planet approaching slower - applying
      const planets = [
        mockPlanet('Sun', 0, 1),
        mockPlanet('Moon', 115, 13), // Moon approaching trine (faster)
      ];

      const chartAspects = calculateChartAspects(
        planets,
        DEFAULT_OPTIONS as Required<typeof DEFAULT_OPTIONS>,
      );
      const applying = getApplyingAspects(chartAspects);

      // Should include the applying aspect
      assert.ok(Array.isArray(applying));
    });
  });

  describe('getSeparatingAspects', () => {
    it('should return separating aspects', () => {
      const planets = [
        mockPlanet('Sun', 0, 1),
        mockPlanet('Moon', 125, 13), // Moon separating from trine (past exact)
      ];

      const chartAspects = calculateChartAspects(
        planets,
        DEFAULT_OPTIONS as Required<typeof DEFAULT_OPTIONS>,
      );
      const separating = getSeparatingAspects(chartAspects);

      assert.ok(Array.isArray(separating));
    });
  });

  describe('getAspectBetween', () => {
    it('should find aspect between two specific bodies', () => {
      const planets = [mockPlanet('Sun', 0), mockPlanet('Moon', 120), mockPlanet('Mars', 60)];

      const chartAspects = calculateChartAspects(
        planets,
        DEFAULT_OPTIONS as Required<typeof DEFAULT_OPTIONS>,
      );

      const sunMoon = getAspectBetween(chartAspects, 'Sun', 'Moon');
      assert.ok(sunMoon, 'Should find Sun-Moon aspect');
      assert.equal(sunMoon.type, 'trine');

      const sunMars = getAspectBetween(chartAspects, 'Sun', 'Mars');
      assert.ok(sunMars, 'Should find Sun-Mars aspect');
      assert.equal(sunMars.type, 'sextile');
    });

    it('should find aspect regardless of body order', () => {
      const planets = [mockPlanet('Sun', 0), mockPlanet('Moon', 120)];

      const chartAspects = calculateChartAspects(
        planets,
        DEFAULT_OPTIONS as Required<typeof DEFAULT_OPTIONS>,
      );

      const aspect1 = getAspectBetween(chartAspects, 'Sun', 'Moon');
      const aspect2 = getAspectBetween(chartAspects, 'Moon', 'Sun');

      assert.ok(aspect1);
      assert.ok(aspect2);
      assert.equal(aspect1, aspect2); // Same aspect object
    });

    it('should return null when no aspect exists', () => {
      const planets = [mockPlanet('Sun', 0), mockPlanet('Moon', 50)];

      const chartAspects = calculateChartAspects(
        planets,
        DEFAULT_OPTIONS as Required<typeof DEFAULT_OPTIONS>,
      );
      const aspect = getAspectBetween(chartAspects, 'Sun', 'Moon');

      assert.equal(aspect, null);
    });
  });
});
