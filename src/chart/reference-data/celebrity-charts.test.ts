/**
 * Celebrity Chart Validation Tests
 *
 * @remarks
 * Tests validate our chart calculations against known celebrity charts
 * from Astrodatabank with Rodden Rating AA (birth certificate accuracy).
 *
 * These tests use EXTERNAL reference data - do not modify expected values
 * without re-sourcing from authoritative data sources.
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { calculateChart } from '../chart.js';
import type { ReferenceChart } from './celebrity-charts.js';
import { CELEBRITY_CHARTS, EINSTEIN, J2000_EPOCH, QUEEN_ELIZABETH_II } from './celebrity-charts.js';

/**
 * Test a reference chart against calculated values
 */
function testReferenceChart(ref: ReferenceChart) {
  const chart = calculateChart(ref.birth);

  // Find planets/angles by name
  const findPlanet = (name: string) =>
    chart.planets.find((p) => p.name.toLowerCase() === name.toLowerCase());

  // Test each expected value
  for (const [body, expected] of Object.entries(ref.expected)) {
    if (!expected) continue;

    const tolerance = expected.tolerance ?? 2;

    if (body === 'ascendant') {
      assert.equal(
        chart.angles.ascendant.signName,
        expected.sign,
        `${ref.name}: ASC should be in ${expected.sign}, got ${chart.angles.ascendant.signName}`,
      );

      const degreeDiff = Math.abs(chart.angles.ascendant.degree - expected.degree);
      assert.ok(
        degreeDiff <= tolerance,
        `${ref.name}: ASC degree should be ~${expected.degree}°, got ${chart.angles.ascendant.degree}° (diff: ${degreeDiff}°)`,
      );
    } else if (body === 'midheaven') {
      assert.equal(
        chart.angles.midheaven.signName,
        expected.sign,
        `${ref.name}: MC should be in ${expected.sign}, got ${chart.angles.midheaven.signName}`,
      );

      const degreeDiff = Math.abs(chart.angles.midheaven.degree - expected.degree);
      assert.ok(
        degreeDiff <= tolerance,
        `${ref.name}: MC degree should be ~${expected.degree}°, got ${chart.angles.midheaven.degree}° (diff: ${degreeDiff}°)`,
      );
    } else {
      const planet = findPlanet(body);
      assert.ok(planet, `${ref.name}: Should find ${body} in chart`);

      assert.equal(
        planet.signName,
        expected.sign,
        `${ref.name}: ${body} should be in ${expected.sign}, got ${planet.signName}`,
      );

      const degreeDiff = Math.abs(planet.degree - expected.degree);
      assert.ok(
        degreeDiff <= tolerance,
        `${ref.name}: ${body} degree should be ~${expected.degree}°, got ${planet.degree}° (diff: ${degreeDiff}°)`,
      );
    }
  }
}

describe('Celebrity Charts (External Reference Data)', () => {
  describe('Albert Einstein (Rodden AA)', () => {
    /**
     * Einstein's chart is one of the most widely documented.
     * Source: Astrodatabank (birth certificate)
     * Birth: March 14, 1879, 11:30 AM LMT, Ulm, Germany
     */

    it('should calculate Einstein chart correctly', () => {
      testReferenceChart(EINSTEIN);
    });

    it('should have Sun in Pisces', () => {
      const chart = calculateChart(EINSTEIN.birth);
      const sun = chart.planets.find((p) => p.name === 'Sun');

      assert.ok(sun);
      assert.equal(sun.signName, 'Pisces');
    });

    it('should have Moon in Sagittarius', () => {
      const chart = calculateChart(EINSTEIN.birth);
      const moon = chart.planets.find((p) => p.name === 'Moon');

      assert.ok(moon);
      assert.equal(moon.signName, 'Sagittarius');
    });

    it('should have Cancer rising', () => {
      const chart = calculateChart(EINSTEIN.birth);

      assert.equal(chart.angles.ascendant.signName, 'Cancer');
    });

    it('should have Mercury in Aries', () => {
      const chart = calculateChart(EINSTEIN.birth);
      const mercury = chart.planets.find((p) => p.name === 'Mercury');

      assert.ok(mercury);
      assert.equal(mercury.signName, 'Aries');
    });
  });

  describe('Queen Elizabeth II (Rodden AA)', () => {
    /**
     * Source: Astrodatabank (Buckingham Palace records)
     * Birth: April 21, 1926, 2:40 AM BST, London
     */

    it('should calculate Queen Elizabeth II chart correctly', () => {
      testReferenceChart(QUEEN_ELIZABETH_II);
    });

    it('should have Sun at 0° Taurus (birthday is April 21)', () => {
      const chart = calculateChart(QUEEN_ELIZABETH_II.birth);
      const sun = chart.planets.find((p) => p.name === 'Sun');

      assert.ok(sun);
      assert.equal(sun.signName, 'Taurus');
      // Sun should be very early in Taurus (0-1°)
      assert.ok(sun.degree < 2, `Sun should be early Taurus, got ${sun.degree}°`);
    });

    it('should have Moon in Leo', () => {
      const chart = calculateChart(QUEEN_ELIZABETH_II.birth);
      const moon = chart.planets.find((p) => p.name === 'Moon');

      assert.ok(moon);
      assert.equal(moon.signName, 'Leo');
    });

    it('should have Capricorn rising', () => {
      const chart = calculateChart(QUEEN_ELIZABETH_II.birth);

      assert.equal(chart.angles.ascendant.signName, 'Capricorn');
    });
  });

  describe('J2000.0 Epoch (Baseline Reference)', () => {
    /**
     * Standard astronomical epoch used for validation.
     * These values are definitional / from Swiss Ephemeris.
     */

    it('should calculate J2000.0 epoch correctly', () => {
      testReferenceChart(J2000_EPOCH);
    });

    it('should have Julian Date = 2451545.0', () => {
      const chart = calculateChart(J2000_EPOCH.birth);

      assert.equal(chart.calculated.julianDate, 2451545.0);
    });

    it('should have Julian Centuries = 0', () => {
      const chart = calculateChart(J2000_EPOCH.birth);

      assert.equal(chart.calculated.julianCenturies, 0);
    });

    it('should have Sun at ~10° Capricorn', () => {
      const chart = calculateChart(J2000_EPOCH.birth);
      const sun = chart.planets.find((p) => p.name === 'Sun');

      assert.ok(sun);
      assert.equal(sun.signName, 'Capricorn');
      // Sun should be around 10°22' Capricorn
      assert.ok(
        sun.degree >= 9 && sun.degree <= 11,
        `Sun should be ~10° Capricorn, got ${sun.degree}°`,
      );
    });

    it('should have Moon at ~13° Scorpio', () => {
      const chart = calculateChart(J2000_EPOCH.birth);
      const moon = chart.planets.find((p) => p.name === 'Moon');

      assert.ok(moon);
      assert.equal(moon.signName, 'Scorpio');
      // Moon should be around 13°19' Scorpio
      assert.ok(
        moon.degree >= 12 && moon.degree <= 14,
        `Moon should be ~13° Scorpio, got ${moon.degree}°`,
      );
    });
  });

  describe('All Celebrity Charts', () => {
    it('should validate all reference charts without errors', () => {
      for (const [key, ref] of Object.entries(CELEBRITY_CHARTS)) {
        try {
          testReferenceChart(ref);
        } catch (error) {
          assert.fail(`Reference chart '${key}' (${ref.name}) failed: ${(error as Error).message}`);
        }
      }
    });
  });
});
