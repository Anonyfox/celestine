/**
 * Tests for Progressed Aspects Detection
 *
 * @remarks
 * Validates aspect detection between progressed and natal positions.
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  calculateProgressionAspects,
  detectProgressedToNatalAspects,
  detectProgressedToProgressedAspects,
  detectProgressionAspects,
  formatAspect,
  formatAspects,
  getAspectsByType,
  getAspectsFromProgressedBody,
  getAspectsToNatalBody,
  getStrongestAspect,
  sortByStrength,
} from './progressed-aspects.js';
import { getNatalPosition, getProgressedPosition } from './progressed-positions.js';
import { birthToJD } from './progression-date.js';

// =============================================================================
// REFERENCE DATA
// =============================================================================

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

// =============================================================================
// TESTS
// =============================================================================

describe('progressions/progressed-aspects', () => {
  describe('detectProgressedToNatalAspects', () => {
    it('should detect aspects between progressed and natal', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const targetJD = birthJD + 30 * 365.25;

      const progressed = getProgressedPosition('Sun', birthJD, targetJD, 'secondary');
      const natalPositions = [
        { name: 'Sun', longitude: getNatalPosition('Sun', birthJD).longitude },
        { name: 'Moon', longitude: getNatalPosition('Moon', birthJD).longitude },
        { name: 'Mars', longitude: getNatalPosition('Mars', birthJD).longitude },
      ];

      const aspects = detectProgressedToNatalAspects(progressed, natalPositions);

      // Should return an array
      assert.ok(Array.isArray(aspects));
      // All aspects should have required properties
      for (const aspect of aspects) {
        assert.ok(aspect.progressedBody);
        assert.ok(aspect.natalBody);
        assert.ok(aspect.aspectType);
        assert.ok(typeof aspect.strength === 'number');
      }
    });

    it('should not include self-aspects', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const targetJD = birthJD + 30 * 365.25;

      const progressed = getProgressedPosition('Sun', birthJD, targetJD, 'secondary');
      const natalPositions = [
        { name: 'Sun', longitude: getNatalPosition('Sun', birthJD).longitude },
      ];

      const aspects = detectProgressedToNatalAspects(progressed, natalPositions);

      // Should not include Sun-Sun aspect
      assert.equal(aspects.filter((a) => a.natalBody === 'Sun').length, 0);
    });

    it('should respect orb configuration', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const targetJD = birthJD + 30 * 365.25;

      const progressed = getProgressedPosition('Sun', birthJD, targetJD, 'secondary');
      const natalPositions = [
        { name: 'Moon', longitude: getNatalPosition('Moon', birthJD).longitude },
      ];

      // With very tight orbs
      const tightAspects = detectProgressedToNatalAspects(progressed, natalPositions, {
        orbs: { conjunction: 0.1, opposition: 0.1, trine: 0.1, square: 0.1, sextile: 0.1 },
      });

      // With loose orbs
      const looseAspects = detectProgressedToNatalAspects(progressed, natalPositions, {
        orbs: { conjunction: 5, opposition: 5, trine: 5, square: 5, sextile: 5 },
      });

      // Loose orbs should find same or more aspects
      assert.ok(looseAspects.length >= tightAspects.length);
    });
  });

  describe('detectProgressedToProgressedAspects', () => {
    it('should detect aspects between progressed positions', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const targetJD = birthJD + 30 * 365.25;

      const positions = [
        getProgressedPosition('Sun', birthJD, targetJD, 'secondary'),
        getProgressedPosition('Moon', birthJD, targetJD, 'secondary'),
        getProgressedPosition('Mercury', birthJD, targetJD, 'secondary'),
      ];

      const aspects = detectProgressedToProgressedAspects(positions, {
        orbs: { conjunction: 3, opposition: 3, trine: 3, square: 3, sextile: 3 },
      });

      // All aspects should be P-to-P
      for (const aspect of aspects) {
        assert.ok(aspect.natalBody.startsWith('P.'));
      }
    });
  });

  describe('detectProgressionAspects', () => {
    it('should return complete detection result', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const targetJD = birthJD + 30 * 365.25;

      const result = detectProgressionAspects(birthJD, targetJD);

      assert.ok(result.aspects);
      assert.ok(result.exactAspects);
      assert.ok(result.applyingAspects);
      assert.ok(result.separatingAspects);
      assert.ok(result.summary);
      assert.equal(typeof result.summary.total, 'number');
    });

    it('should categorize aspects correctly', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const targetJD = birthJD + 30 * 365.25;

      const result = detectProgressionAspects(birthJD, targetJD);

      // Summary counts should match
      assert.equal(result.aspects.length, result.summary.total);
      assert.equal(result.exactAspects.length, result.summary.exact);

      // All exact aspects should have isExact = true
      for (const aspect of result.exactAspects) {
        assert.ok(aspect.isExact);
      }
    });

    it('should include P-to-P when configured', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const targetJD = birthJD + 30 * 365.25;

      const withPtoP = detectProgressionAspects(birthJD, targetJD, 'secondary', {
        includeProgressedToProgressed: true,
      });

      const withoutPtoP = detectProgressionAspects(birthJD, targetJD, 'secondary', {
        includeProgressedToProgressed: false,
      });

      // With P-to-P should have same or more aspects
      assert.ok(withPtoP.aspects.length >= withoutPtoP.aspects.length);
    });
  });

  describe('calculateProgressionAspects', () => {
    it('should work with date objects', () => {
      const target = { year: 2030, month: 1, day: 1 };
      const result = calculateProgressionAspects(J2000_BIRTH, target);

      assert.ok(result.aspects);
      assert.ok(result.summary);
    });
  });

  // =============================================================================
  // QUERY FUNCTIONS
  // =============================================================================

  describe('getAspectsToNatalBody', () => {
    it('should filter by natal body', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const targetJD = birthJD + 30 * 365.25;
      const result = detectProgressionAspects(birthJD, targetJD);

      const sunAspects = getAspectsToNatalBody(result.aspects, 'Sun');

      for (const aspect of sunAspects) {
        assert.equal(aspect.natalBody, 'Sun');
      }
    });
  });

  describe('getAspectsFromProgressedBody', () => {
    it('should filter by progressed body', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const targetJD = birthJD + 30 * 365.25;
      const result = detectProgressionAspects(birthJD, targetJD);

      const moonAspects = getAspectsFromProgressedBody(result.aspects, 'Moon');

      for (const aspect of moonAspects) {
        assert.equal(aspect.progressedBody, 'Moon');
      }
    });
  });

  describe('getStrongestAspect', () => {
    it('should return strongest aspect', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const targetJD = birthJD + 30 * 365.25;
      const result = detectProgressionAspects(birthJD, targetJD);

      if (result.aspects.length > 0) {
        const strongest = getStrongestAspect(result.aspects);
        assert.ok(strongest);

        // Verify it's actually the strongest
        for (const aspect of result.aspects) {
          assert.ok(aspect.strength <= strongest.strength);
        }
      }
    });

    it('should return undefined for empty array', () => {
      const result = getStrongestAspect([]);
      assert.equal(result, undefined);
    });
  });

  describe('getAspectsByType', () => {
    it('should filter by aspect type', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const targetJD = birthJD + 30 * 365.25;
      const result = detectProgressionAspects(birthJD, targetJD);

      const conjunctions = getAspectsByType(result.aspects, 'conjunction');

      for (const aspect of conjunctions) {
        assert.equal(aspect.aspectType, 'conjunction');
      }
    });
  });

  describe('sortByStrength', () => {
    it('should sort strongest first', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const targetJD = birthJD + 30 * 365.25;
      const result = detectProgressionAspects(birthJD, targetJD);

      const sorted = sortByStrength(result.aspects);

      for (let i = 1; i < sorted.length; i++) {
        assert.ok(
          sorted[i].strength <= sorted[i - 1].strength,
          'Should be sorted by strength descending',
        );
      }
    });

    it('should not modify original array', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const targetJD = birthJD + 30 * 365.25;
      const result = detectProgressionAspects(birthJD, targetJD);

      if (result.aspects.length > 0) {
        const firstStrength = result.aspects[0].strength;
        sortByStrength(result.aspects);
        assert.equal(result.aspects[0].strength, firstStrength);
      }
    });
  });

  // =============================================================================
  // FORMATTING
  // =============================================================================

  describe('formatAspect', () => {
    it('should format aspect information', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const targetJD = birthJD + 30 * 365.25;
      const result = detectProgressionAspects(birthJD, targetJD);

      if (result.aspects.length > 0) {
        const formatted = formatAspect(result.aspects[0]);
        assert.ok(formatted.includes(result.aspects[0].progressedBody));
        assert.ok(formatted.includes(result.aspects[0].aspectType));
      }
    });
  });

  describe('formatAspects', () => {
    it('should format full result', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const targetJD = birthJD + 30 * 365.25;
      const result = detectProgressionAspects(birthJD, targetJD);

      const formatted = formatAspects(result);

      assert.ok(formatted.includes('Progression Aspects'));
      assert.ok(formatted.includes('Total:'));
    });
  });

  // =============================================================================
  // REAL-WORLD VALIDATION
  // =============================================================================

  describe('Real-world validation', () => {
    it('should find aspects after significant time', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const targetJD = birthJD + 30 * 365.25;

      const result = detectProgressionAspects(birthJD, targetJD);

      // After 30 years of progressions, there should be some aspects
      assert.ok(result.aspects.length > 0, 'Should find at least one aspect after 30 years');
    });

    it('should have reasonable strength values', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const targetJD = birthJD + 30 * 365.25;

      const result = detectProgressionAspects(birthJD, targetJD);

      for (const aspect of result.aspects) {
        assert.ok(aspect.strength >= 0 && aspect.strength <= 100);
        assert.ok(aspect.orb >= 0);
      }
    });
  });
});
