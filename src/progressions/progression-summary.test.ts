/**
 * Tests for Progression Summary
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  calculateProgression,
  formatProgressionResult,
  getExactAspects,
  getMoonProgressionReport,
  getSignChanges,
} from './progression-summary.js';

const J2000_BIRTH = {
  year: 2000,
  month: 1,
  day: 1,
  hour: 12,
  minute: 0,
  second: 0,
  timezone: 0,
  latitude: 51.5,
  longitude: 0,
};

describe('progressions/progression-summary', () => {
  describe('calculateProgression', () => {
    it('should generate complete progression result', () => {
      const target = { year: 2030, month: 1, day: 1 };
      const result = calculateProgression(J2000_BIRTH, target);

      assert.equal(result.type, 'secondary');
      assert.ok(result.birthJD > 0);
      assert.ok(result.targetJD > result.birthJD);
      assert.ok(result.ageAtTarget > 0);
      assert.ok(result.solarArc > 0);
      assert.ok(result.bodies.length > 0);
      assert.ok(result.angles.ascendant);
      assert.ok(result.angles.midheaven);
      assert.ok(result.summary);
    });

    it('should respect progression type config', () => {
      const target = { year: 2030, month: 1, day: 1 };

      const secondary = calculateProgression(J2000_BIRTH, target, { type: 'secondary' });
      const solarArc = calculateProgression(J2000_BIRTH, target, { type: 'solar-arc' });

      assert.equal(secondary.type, 'secondary');
      assert.equal(solarArc.type, 'solar-arc');
    });

    it('should include summary statistics', () => {
      const target = { year: 2030, month: 1, day: 1 };
      const result = calculateProgression(J2000_BIRTH, target);

      assert.ok(typeof result.summary.totalAspects === 'number');
      assert.ok(typeof result.summary.exactAspects === 'number');
      assert.ok(Array.isArray(result.summary.bodiesChangedSign));
      assert.ok(typeof result.summary.ascChangedSign === 'boolean');
    });
  });

  describe('getMoonProgressionReport', () => {
    it('should return Moon report', () => {
      const target = { year: 2030, month: 1, day: 1 };
      const report = getMoonProgressionReport(J2000_BIRTH, target);

      assert.ok(report.current);
      assert.ok(report.phase);
      assert.ok(report.signTransits.length > 0);
    });
  });

  describe('getExactAspects', () => {
    it('should return exact aspects only', () => {
      const target = { year: 2030, month: 1, day: 1 };
      const exact = getExactAspects(J2000_BIRTH, target);

      for (const aspect of exact) {
        assert.ok(aspect.isExact);
      }
    });
  });

  describe('getSignChanges', () => {
    it('should return bodies that changed sign', () => {
      const target = { year: 2060, month: 1, day: 1 }; // Far enough for sign changes
      const changes = getSignChanges(J2000_BIRTH, target);

      for (const body of changes) {
        assert.ok(body.hasChangedSign);
      }
    });
  });

  describe('formatProgressionResult', () => {
    it('should format result nicely', () => {
      const target = { year: 2030, month: 1, day: 1 };
      const result = calculateProgression(J2000_BIRTH, target);
      const formatted = formatProgressionResult(result);

      assert.ok(formatted.includes('PROGRESSED CHART'));
      assert.ok(formatted.includes('SECONDARY'));
      assert.ok(formatted.includes('Solar Arc'));
      assert.ok(formatted.includes('POSITIONS'));
      assert.ok(formatted.includes('ANGLES'));
    });
  });
});
