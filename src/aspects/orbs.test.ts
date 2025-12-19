/**
 * Tests for Orb Handling and Configuration
 *
 * @remarks
 * Tests cover:
 * - Orb retrieval (default and custom)
 * - Strength calculation (linear model)
 * - Aspect matching within orbs
 * - Out-of-sign penalty application
 * - Configuration creation
 *
 * These are mathematical/logical tests - no external reference data needed.
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { DEFAULT_ORBS } from './constants.js';
import {
  applyOutOfSignPenalty,
  calculateStrength,
  createAspectConfig,
  findAllMatchingAspects,
  findMatchingAspect,
  getOrb,
  isWithinOrb,
} from './orbs.js';
import { AspectType } from './types.js';

describe('aspects/orbs', () => {
  describe('getOrb', () => {
    describe('Default orbs', () => {
      it('should return default orb when no config provided', () => {
        assert.equal(getOrb(AspectType.Conjunction), DEFAULT_ORBS[AspectType.Conjunction]);
        assert.equal(getOrb(AspectType.Trine), DEFAULT_ORBS[AspectType.Trine]);
        assert.equal(getOrb(AspectType.Square), DEFAULT_ORBS[AspectType.Square]);
      });

      it('should return default orb when config has no custom orbs', () => {
        const config = { aspectTypes: [AspectType.Trine] };
        assert.equal(getOrb(AspectType.Trine, config), DEFAULT_ORBS[AspectType.Trine]);
      });

      it('should return default orb for aspect not in custom orbs', () => {
        const config = { orbs: { [AspectType.Square]: 5 } };
        assert.equal(getOrb(AspectType.Trine, config), DEFAULT_ORBS[AspectType.Trine]);
      });
    });

    describe('Custom orbs', () => {
      it('should return custom orb when configured', () => {
        const config = { orbs: { [AspectType.Trine]: 6 } };
        assert.equal(getOrb(AspectType.Trine, config), 6);
      });

      it('should return custom orb of 0 (disables aspect)', () => {
        const config = { orbs: { [AspectType.Square]: 0 } };
        assert.equal(getOrb(AspectType.Square, config), 0);
      });

      it('should return custom orb larger than default', () => {
        const config = { orbs: { [AspectType.Conjunction]: 12 } };
        assert.equal(getOrb(AspectType.Conjunction, config), 12);
      });
    });
  });

  describe('calculateStrength', () => {
    describe('Exact aspects', () => {
      it('should return 100 for exact aspect (0 deviation)', () => {
        assert.equal(calculateStrength(0, 8), 100);
        assert.equal(calculateStrength(0, 6), 100);
        assert.equal(calculateStrength(0, 2), 100);
      });
    });

    describe('Linear decay', () => {
      it('should return 50 at halfway point', () => {
        assert.equal(calculateStrength(4, 8), 50);
        assert.equal(calculateStrength(3, 6), 50);
        assert.equal(calculateStrength(1, 2), 50);
      });

      it('should return 75 at quarter point', () => {
        assert.equal(calculateStrength(2, 8), 75);
      });

      it('should return 25 at three-quarter point', () => {
        assert.equal(calculateStrength(6, 8), 25);
      });
    });

    describe('At orb boundary', () => {
      it('should return 0 at exact orb boundary', () => {
        assert.equal(calculateStrength(8, 8), 0);
        assert.equal(calculateStrength(6, 6), 0);
      });

      it('should return 0 beyond orb boundary', () => {
        assert.equal(calculateStrength(9, 8), 0);
        assert.equal(calculateStrength(10, 6), 0);
      });
    });

    describe('Edge cases', () => {
      it('should handle negative deviation (use absolute)', () => {
        assert.equal(calculateStrength(-4, 8), 50);
      });

      it('should handle zero orb', () => {
        assert.equal(calculateStrength(0, 0), 100);
        assert.equal(calculateStrength(1, 0), 0);
      });

      it('should round to integer', () => {
        const strength = calculateStrength(3, 7);
        assert.ok(Number.isInteger(strength));
      });
    });

    describe('Known values', () => {
      // 8° orb examples
      it('1° deviation with 8° orb = 88% (rounded)', () => {
        assert.equal(calculateStrength(1, 8), 88);
      });

      it('2° deviation with 8° orb = 75%', () => {
        assert.equal(calculateStrength(2, 8), 75);
      });

      it('5° deviation with 8° orb = 38% (rounded)', () => {
        assert.equal(calculateStrength(5, 8), 38);
      });

      it('7° deviation with 8° orb = 13% (rounded)', () => {
        assert.equal(calculateStrength(7, 8), 13);
      });
    });
  });

  describe('isWithinOrb', () => {
    describe('Conjunction (0°)', () => {
      it('should match exact conjunction', () => {
        assert.ok(isWithinOrb(0, 0, 8));
      });

      it('should match conjunction within orb', () => {
        assert.ok(isWithinOrb(5, 0, 8));
        assert.ok(isWithinOrb(7.9, 0, 8));
      });

      it('should not match conjunction beyond orb', () => {
        assert.ok(!isWithinOrb(9, 0, 8));
      });
    });

    describe('Square (90°)', () => {
      it('should match exact square', () => {
        assert.ok(isWithinOrb(90, 90, 7));
      });

      it('should match square within orb', () => {
        assert.ok(isWithinOrb(87, 90, 7));
        assert.ok(isWithinOrb(93, 90, 7));
      });

      it('should not match square beyond orb', () => {
        assert.ok(!isWithinOrb(82, 90, 7));
        assert.ok(!isWithinOrb(98, 90, 7));
      });
    });

    describe('Opposition (180°)', () => {
      it('should match exact opposition', () => {
        assert.ok(isWithinOrb(180, 180, 8));
      });

      it('should match opposition within orb', () => {
        assert.ok(isWithinOrb(175, 180, 8));
        assert.ok(isWithinOrb(178, 180, 8));
      });
    });

    describe('Edge at orb boundary', () => {
      it('should match at exactly orb distance', () => {
        assert.ok(isWithinOrb(97, 90, 7)); // Exactly 7° away
      });

      it('should not match just beyond orb', () => {
        assert.ok(!isWithinOrb(97.1, 90, 7)); // 7.1° away
      });
    });
  });

  describe('findMatchingAspect', () => {
    describe('Major aspects with default orbs', () => {
      it('should find conjunction at 0°', () => {
        const result = findMatchingAspect(0);
        assert.ok(result);
        assert.equal(result.aspect.type, AspectType.Conjunction);
        assert.equal(result.deviation, 0);
      });

      it('should find sextile at 60°', () => {
        const result = findMatchingAspect(60);
        assert.ok(result);
        assert.equal(result.aspect.type, AspectType.Sextile);
        assert.equal(result.deviation, 0);
      });

      it('should find square at 90°', () => {
        const result = findMatchingAspect(90);
        assert.ok(result);
        assert.equal(result.aspect.type, AspectType.Square);
        assert.equal(result.deviation, 0);
      });

      it('should find trine at 120°', () => {
        const result = findMatchingAspect(120);
        assert.ok(result);
        assert.equal(result.aspect.type, AspectType.Trine);
        assert.equal(result.deviation, 0);
      });

      it('should find opposition at 180°', () => {
        const result = findMatchingAspect(180);
        assert.ok(result);
        assert.equal(result.aspect.type, AspectType.Opposition);
        assert.equal(result.deviation, 0);
      });
    });

    describe('Within orb', () => {
      it('should find square at 87° (3° orb)', () => {
        const result = findMatchingAspect(87);
        assert.ok(result);
        assert.equal(result.aspect.type, AspectType.Square);
        assert.equal(result.deviation, 3);
      });

      it('should find trine at 115° (5° orb)', () => {
        const result = findMatchingAspect(115);
        assert.ok(result);
        assert.equal(result.aspect.type, AspectType.Trine);
        assert.equal(result.deviation, 5);
      });
    });

    describe('No match', () => {
      it('should return null when no aspect within orb', () => {
        const result = findMatchingAspect(45); // Semi-square not in default
        assert.equal(result, null);
      });

      it('should return null for angle between aspects', () => {
        const result = findMatchingAspect(75); // Between sextile (60) and square (90)
        assert.equal(result, null);
      });
    });

    describe('Custom configuration', () => {
      it('should use custom orbs', () => {
        const result = findMatchingAspect(85, { orbs: { [AspectType.Square]: 10 } });
        assert.ok(result);
        assert.equal(result.aspect.type, AspectType.Square);
        assert.equal(result.deviation, 5);
      });

      it('should respect aspectTypes filter', () => {
        // 60° would match sextile, but sextile not in filter
        const result = findMatchingAspect(60, {
          aspectTypes: [AspectType.Square, AspectType.Trine],
        });
        assert.equal(result, null);
      });

      it('should find minor aspects when configured', () => {
        const result = findMatchingAspect(45, {
          aspectTypes: [AspectType.SemiSquare],
        });
        assert.ok(result);
        assert.equal(result.aspect.type, AspectType.SemiSquare);
      });
    });

    describe('Best match when multiple possible', () => {
      it('should return closest aspect when two are in orb', () => {
        // With wide orbs, 75° could match both sextile (60) and square (90)
        const result = findMatchingAspect(75, {
          orbs: {
            [AspectType.Sextile]: 20,
            [AspectType.Square]: 20,
          },
        });
        assert.ok(result);
        // Both are 15° away, but sextile has lower angle so may be picked first
        // Actually it should pick whichever has smaller deviation
        assert.equal(result.deviation, 15);
      });
    });
  });

  describe('findAllMatchingAspects', () => {
    it('should return empty array when no matches', () => {
      const result = findAllMatchingAspects(45);
      assert.equal(result.length, 0);
    });

    it('should return single match for exact aspect', () => {
      const result = findAllMatchingAspects(90);
      assert.equal(result.length, 1);
      assert.equal(result[0].aspect.type, AspectType.Square);
    });

    it('should return multiple matches with wide orbs', () => {
      const result = findAllMatchingAspects(75, {
        orbs: {
          [AspectType.Sextile]: 20,
          [AspectType.Square]: 20,
        },
      });
      assert.equal(result.length, 2);
    });

    it('should sort by deviation (closest first)', () => {
      const result = findAllMatchingAspects(85, {
        orbs: {
          [AspectType.Sextile]: 30,
          [AspectType.Square]: 30,
          [AspectType.Trine]: 40,
        },
      });
      // 85° is closest to 90 (square), then 60 (sextile), then 120 (trine)
      assert.ok(result.length >= 2);
      assert.ok(result[0].deviation <= result[1].deviation);
    });
  });

  describe('applyOutOfSignPenalty', () => {
    describe('No penalty', () => {
      it('should return original strength when not out-of-sign', () => {
        assert.equal(applyOutOfSignPenalty(80, false, 0.2), 80);
      });

      it('should return original strength when penalty is 0', () => {
        assert.equal(applyOutOfSignPenalty(80, true, 0), 80);
      });
    });

    describe('With penalty', () => {
      it('should reduce strength by 20% with 0.2 penalty', () => {
        // 80 × 0.8 = 64
        assert.equal(applyOutOfSignPenalty(80, true, 0.2), 64);
      });

      it('should reduce strength by 50% with 0.5 penalty', () => {
        assert.equal(applyOutOfSignPenalty(100, true, 0.5), 50);
      });

      it('should reduce to 0 with 1.0 penalty', () => {
        assert.equal(applyOutOfSignPenalty(80, true, 1.0), 0);
      });
    });

    describe('Edge cases', () => {
      it('should clamp penalty > 1 to 1', () => {
        assert.equal(applyOutOfSignPenalty(80, true, 1.5), 0);
      });

      it('should ignore negative penalty', () => {
        assert.equal(applyOutOfSignPenalty(80, true, -0.2), 80);
      });

      it('should round result', () => {
        const result = applyOutOfSignPenalty(77, true, 0.33);
        assert.ok(Number.isInteger(result));
      });
    });
  });

  describe('createAspectConfig', () => {
    it('should return full config with defaults when no input', () => {
      const config = createAspectConfig();

      assert.ok(Array.isArray(config.aspectTypes));
      assert.equal(config.aspectTypes.length, 5);
      assert.ok(config.aspectTypes.includes(AspectType.Conjunction));
      assert.ok(config.aspectTypes.includes(AspectType.Opposition));
      assert.deepEqual(config.orbs, {});
      assert.equal(config.includeOutOfSign, true);
      assert.equal(config.outOfSignPenalty, 0);
      assert.equal(config.minimumStrength, 0);
      assert.equal(config.includeApplying, true);
    });

    it('should merge partial config with defaults', () => {
      const config = createAspectConfig({
        orbs: { [AspectType.Trine]: 6 },
        minimumStrength: 50,
      });

      // Specified values
      assert.deepEqual(config.orbs, { [AspectType.Trine]: 6 });
      assert.equal(config.minimumStrength, 50);

      // Default values
      assert.equal(config.aspectTypes.length, 5);
      assert.equal(config.includeOutOfSign, true);
    });

    it('should use provided aspectTypes instead of defaults', () => {
      const config = createAspectConfig({
        aspectTypes: [AspectType.Conjunction, AspectType.Opposition],
      });

      assert.equal(config.aspectTypes.length, 2);
      assert.ok(config.aspectTypes.includes(AspectType.Conjunction));
      assert.ok(config.aspectTypes.includes(AspectType.Opposition));
      assert.ok(!config.aspectTypes.includes(AspectType.Trine));
    });
  });
});
