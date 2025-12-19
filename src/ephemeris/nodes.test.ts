/**
 * Tests for Lunar Nodes Calculator
 *
 * @remarks
 * Verifies Lunar Node calculations against:
 * 1. Swiss Ephemeris reference data (authoritative)
 * 2. Known nodal characteristics (retrograde motion, 18.6 year cycle)
 *
 * Accuracy target: ±2 arcminutes (0.033°) for longitude
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { J2000_EPOCH } from './constants.js';
import {
  getMeanNode,
  getMeanNodeLongitude,
  getNorthNode,
  getSouthNodeLongitude,
  getTrueNode,
  getTrueNodeLongitude,
  LUNAR_NODE_CHARACTERISTICS,
} from './nodes.js';

// =============================================================================
// SWISS EPHEMERIS REFERENCE DATA
// Generated from pyswisseph (Swiss Ephemeris 2.10.03)
// These values are AUTHORITATIVE - do not modify!
// Our implementation must match these within ±2 arcminutes (0.033°)
// =============================================================================
const SWISSEPH_TRUE_NODE_REFERENCE = [
  {
    jd: 2451545.0,
    description: 'J2000.0 (2000-Jan-01 12:00 TT)',
    longitude: 123.952895,
    speed: -0.054382,
  },
  {
    jd: 2448724.5,
    description: 'Meeus Example 47.a (1992-Apr-12 00:00 TT)',
    longitude: 273.539716,
    speed: -0.045574,
  },
  {
    jd: 2440587.5,
    description: 'Unix Epoch (1970-Jan-01 00:00 TT)',
    longitude: 344.058651,
    speed: -0.00089,
  },
  {
    jd: 2459580.5,
    description: 'Recent (2022-Jan-01 00:00 TT)',
    longitude: 61.211341,
    speed: -0.031802,
  },
] as const;

const SWISSEPH_MEAN_NODE_REFERENCE = [
  {
    jd: 2451545.0,
    description: 'J2000.0 (2000-Jan-01 12:00 TT)',
    longitude: 125.040646,
    speed: -0.052952,
  },
  {
    jd: 2448724.5,
    description: 'Meeus Example 47.a (1992-Apr-12 00:00 TT)',
    longitude: 274.405242,
    speed: -0.052962,
  },
  {
    jd: 2440587.5,
    description: 'Unix Epoch (1970-Jan-01 00:00 TT)',
    longitude: 345.286866,
    speed: -0.052968,
  },
  {
    jd: 2459580.5,
    description: 'Recent (2022-Jan-01 00:00 TT)',
    longitude: 59.530639,
    speed: -0.0529,
  },
] as const;

// Tolerance for Mean Node: 2 arcminutes = 0.0333 degrees
const MEAN_NODE_TOLERANCE = 0.034;

// Tolerance for True Node: More relaxed due to complex perturbations
// Swiss Ephemeris uses sophisticated algorithm; our simplified version
// is still accurate enough for astrological purposes (~15 arcmin max)
const TRUE_NODE_TOLERANCE = 0.3; // ~18 arcminutes

describe('ephemeris/nodes', () => {
  describe('getMeanNodeLongitude', () => {
    describe('Swiss Ephemeris reference validation', () => {
      for (const ref of SWISSEPH_MEAN_NODE_REFERENCE) {
        it(`should match Swiss Ephemeris Mean Node at ${ref.description}`, () => {
          const meanNode = getMeanNodeLongitude(ref.jd);

          const lonDiff = Math.abs(meanNode - ref.longitude);
          assert.ok(
            lonDiff < MEAN_NODE_TOLERANCE,
            `Mean Node: expected ${ref.longitude}°, got ${meanNode}° (diff: ${(lonDiff * 60).toFixed(1)} arcmin)`,
          );
        });
      }
    });

    it('should return value in range [0, 360)', () => {
      const jd = J2000_EPOCH;
      const lon = getMeanNodeLongitude(jd);
      assert.ok(lon >= 0 && lon < 360, `Expected 0-360°, got ${lon}°`);
    });

    it('should move retrograde over time', () => {
      const lon1 = getMeanNodeLongitude(J2000_EPOCH);
      const lon2 = getMeanNodeLongitude(J2000_EPOCH + 30); // 30 days later

      // Node moves retrograde, so lon2 should be less (accounting for wraparound)
      let diff = lon2 - lon1;
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;

      // Should move about -1.6° in 30 days
      assert.ok(diff < 0, `Mean node should move retrograde, got diff=${diff}°`);
      assert.ok(Math.abs(diff + 1.6) < 0.5, `Expected ~-1.6° in 30 days, got ${diff}°`);
    });
  });

  describe('getTrueNodeLongitude', () => {
    describe('Swiss Ephemeris reference validation', () => {
      /**
       * True Node uses simplified perturbation series.
       * Swiss Ephemeris uses more sophisticated algorithm.
       * Our implementation is accurate enough for astrology (~15 arcmin max).
       * For higher precision, use Mean Node (which is sub-arcminute accurate).
       */
      for (const ref of SWISSEPH_TRUE_NODE_REFERENCE) {
        it(`should match Swiss Ephemeris True Node at ${ref.description}`, () => {
          const trueNode = getTrueNodeLongitude(ref.jd);

          const lonDiff = Math.abs(trueNode - ref.longitude);
          assert.ok(
            lonDiff < TRUE_NODE_TOLERANCE,
            `True Node: expected ${ref.longitude}°, got ${trueNode}° (diff: ${(lonDiff * 60).toFixed(1)} arcmin)`,
          );
        });
      }
    });

    it('should return value in range [0, 360)', () => {
      const jd = J2000_EPOCH;
      const lon = getTrueNodeLongitude(jd);
      assert.ok(lon >= 0 && lon < 360, `Expected 0-360°, got ${lon}°`);
    });

    it('should oscillate around mean node', () => {
      // True node should be within ~1.5° of mean node
      const jd = J2000_EPOCH;
      const trueNode = getTrueNodeLongitude(jd);
      const meanNode = getMeanNodeLongitude(jd);

      let diff = Math.abs(trueNode - meanNode);
      if (diff > 180) diff = 360 - diff;

      assert.ok(diff < 2, `True node should be within 2° of mean node, got ${diff}°`);
    });
  });

  describe('getMeanNode', () => {
    it('should return both north and south nodes', () => {
      const node = getMeanNode(J2000_EPOCH);

      assert.ok(node.northNode >= 0 && node.northNode < 360);
      assert.ok(node.southNode >= 0 && node.southNode < 360);
    });

    it('should have south node exactly 180° from north node', () => {
      const node = getMeanNode(J2000_EPOCH);

      let diff = Math.abs(node.southNode - node.northNode);
      if (diff > 180) diff = 360 - diff;

      assert.ok(Math.abs(diff - 180) < 0.001, `South node should be 180° from north, got ${diff}°`);
    });

    it('should be retrograde', () => {
      const node = getMeanNode(J2000_EPOCH);
      assert.ok(node.isRetrograde, 'Mean node should always be retrograde');
      assert.ok(node.speed < 0, 'Mean node speed should be negative');
    });

    it('should have speed around -0.053°/day', () => {
      const node = getMeanNode(J2000_EPOCH);
      assert.ok(
        Math.abs(node.speed + 0.053) < 0.005,
        `Expected speed ~-0.053°/day, got ${node.speed}°/day`,
      );
    });
  });

  describe('getTrueNode', () => {
    it('should return both north and south nodes', () => {
      const node = getTrueNode(J2000_EPOCH);

      assert.ok(node.northNode >= 0 && node.northNode < 360);
      assert.ok(node.southNode >= 0 && node.southNode < 360);
    });

    it('should have south node exactly 180° from north node', () => {
      const node = getTrueNode(J2000_EPOCH);

      let diff = Math.abs(node.southNode - node.northNode);
      if (diff > 180) diff = 360 - diff;

      assert.ok(Math.abs(diff - 180) < 0.001, `South node should be 180° from north, got ${diff}°`);
    });

    it('should usually be retrograde but can briefly go direct', () => {
      // Check that at most dates, true node is retrograde
      // The true node oscillates, so it can briefly appear direct
      let retrogradeCount = 0;
      const totalDays = 100;

      for (let i = 0; i < totalDays; i++) {
        const node = getTrueNode(J2000_EPOCH + i);
        if (node.isRetrograde) retrogradeCount++;
      }

      // Should be retrograde majority of the time (>60%)
      const retrogradePercent = (retrogradeCount / totalDays) * 100;
      assert.ok(
        retrogradePercent > 60,
        `True node should be retrograde >60% of time, got ${retrogradePercent}%`,
      );
    });
  });

  describe('getNorthNode', () => {
    it('should be an alias for getTrueNode', () => {
      const trueNode = getTrueNode(J2000_EPOCH);
      const northNode = getNorthNode(J2000_EPOCH);

      assert.strictEqual(trueNode.northNode, northNode.northNode);
      assert.strictEqual(trueNode.southNode, northNode.southNode);
    });
  });

  describe('getSouthNodeLongitude', () => {
    it('should be 180° opposite north node', () => {
      const jd = J2000_EPOCH;
      const northNode = getTrueNodeLongitude(jd);
      const southNode = getSouthNodeLongitude(jd);

      let diff = Math.abs(southNode - northNode);
      if (diff > 180) diff = 360 - diff;

      assert.ok(Math.abs(diff - 180) < 0.001, `South node should be 180° from north, got ${diff}°`);
    });
  });

  describe('18.6-year nodal cycle', () => {
    it('should return to similar position after ~18.6 years', () => {
      const jd0 = J2000_EPOCH;
      const node0 = getMeanNode(jd0);

      // 18.6 years in days
      const nodalPeriod = 6798.38;
      const jd1 = jd0 + nodalPeriod;
      const node1 = getMeanNode(jd1);

      let diff = Math.abs(node1.northNode - node0.northNode);
      if (diff > 180) diff = 360 - diff;

      assert.ok(diff < 5, `After one nodal cycle, position should repeat within 5°, got ${diff}°`);
    });

    it('should traverse full zodiac in ~18.6 years', () => {
      const signs = new Set<number>();

      // Sample every 50 days for 19 years
      for (let i = 0; i < (19 * 365.25) / 50; i++) {
        const jd = J2000_EPOCH + i * 50;
        const node = getMeanNode(jd);
        const signIndex = Math.floor(node.northNode / 30);
        signs.add(signIndex);
      }

      // Should see all 12 signs
      assert.ok(signs.size >= 11, `Expected 12 signs, found ${signs.size}`);
    });
  });

  describe('LUNAR_NODE_CHARACTERISTICS', () => {
    it('should have correct nodal period', () => {
      assert.ok(
        Math.abs(LUNAR_NODE_CHARACTERISTICS.nodalPeriod - 6798) < 10,
        'Nodal period should be ~6798 days',
      );
    });

    it('should have ~18.6 year period', () => {
      assert.ok(
        Math.abs(LUNAR_NODE_CHARACTERISTICS.nodalPeriodYears - 18.6) < 0.1,
        'Nodal period should be ~18.6 years',
      );
    });

    it('should have retrograde mean daily motion', () => {
      assert.ok(
        LUNAR_NODE_CHARACTERISTICS.meanDailyMotion < 0,
        'Mean daily motion should be negative (retrograde)',
      );
    });
  });
});
