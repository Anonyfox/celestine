/**
 * Tests for Angular Separation Calculations
 *
 * @remarks
 * Comprehensive tests covering:
 * - Basic angle calculations
 * - 360°/0° boundary handling
 * - Floating-point edge cases
 * - Symmetry properties
 * - Reference data validation
 *
 * All angular separation calculations must pass these tests before
 * aspect detection can be built on top.
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  anglesAreEqual,
  angularSeparation,
  getSignIndex,
  midpoint,
  normalizeAngle,
  signedAngle,
  signSeparation,
} from './angular-separation.js';
import { ANGLE_EPSILON } from './constants.js';

// =============================================================================
// MATHEMATICAL TEST DATA
// Note: Angular separation is pure trigonometry - no external reference needed.
// The correctness of these tests is verifiable mathematically.
//
// Planetary aspect DETECTION tests (in aspect-detection.test.ts) will use
// externally validated positions and Astro.com chart data.
// =============================================================================

describe('aspects/angular-separation', () => {
  describe('normalizeAngle', () => {
    describe('Basic normalization', () => {
      it('should return 0 for 0', () => {
        assert.equal(normalizeAngle(0), 0);
      });

      it('should return 180 for 180', () => {
        assert.equal(normalizeAngle(180), 180);
      });

      it('should return 359 for 359', () => {
        assert.equal(normalizeAngle(359), 359);
      });

      it('should keep angles in [0, 360) unchanged', () => {
        for (const angle of [0, 1, 45, 90, 180, 270, 359, 359.9]) {
          assert.equal(normalizeAngle(angle), angle);
        }
      });
    });

    describe('Wraparound at 360', () => {
      it('should return 0 for 360', () => {
        assert.equal(normalizeAngle(360), 0);
      });

      it('should return 10 for 370', () => {
        assert.equal(normalizeAngle(370), 10);
      });

      it('should return 0 for 720', () => {
        assert.equal(normalizeAngle(720), 0);
      });

      it('should handle large positive values', () => {
        assert.equal(normalizeAngle(3600), 0);
        assert.equal(normalizeAngle(3610), 10);
      });
    });

    describe('Negative angles', () => {
      it('should return 350 for -10', () => {
        assert.equal(normalizeAngle(-10), 350);
      });

      it('should return 0 for -360', () => {
        assert.equal(normalizeAngle(-360), 0);
      });

      it('should return 270 for -90', () => {
        assert.equal(normalizeAngle(-90), 270);
      });

      it('should handle large negative values', () => {
        assert.equal(normalizeAngle(-3600), 0);
        assert.equal(normalizeAngle(-3610), 350);
      });
    });

    describe('Floating-point precision', () => {
      it('should handle values very close to 360', () => {
        const result = normalizeAngle(359.99999999);
        assert.ok(result >= 0 && result < 360);
      });

      it('should handle values very close to 0', () => {
        const result = normalizeAngle(0.00000001);
        assert.ok(result >= 0 && result < 360);
      });
    });
  });

  describe('angularSeparation', () => {
    describe('Basic separations', () => {
      it('should return 0 for identical positions', () => {
        assert.equal(angularSeparation(0, 0), 0);
        assert.equal(angularSeparation(45, 45), 0);
        assert.equal(angularSeparation(180, 180), 0);
        assert.equal(angularSeparation(359.9, 359.9), 0);
      });

      it('should calculate 90° separation correctly', () => {
        assert.equal(angularSeparation(0, 90), 90);
        assert.equal(angularSeparation(90, 0), 90);
        assert.equal(angularSeparation(45, 135), 90);
        assert.equal(angularSeparation(270, 0), 90);
      });

      it('should calculate 180° separation correctly', () => {
        assert.equal(angularSeparation(0, 180), 180);
        assert.equal(angularSeparation(90, 270), 180);
        assert.equal(angularSeparation(180, 0), 180);
      });
    });

    describe('Always shortest arc (0-180)', () => {
      it('should return 90 for 0° and 270°', () => {
        // 270° apart could be seen as 270 or 90, should be 90
        assert.equal(angularSeparation(0, 270), 90);
      });

      it('should return 170 for 10° and 200°', () => {
        // 190° apart should give 170 (shorter arc)
        assert.equal(angularSeparation(10, 200), 170);
      });

      it('should never exceed 180', () => {
        for (let i = 0; i < 360; i += 10) {
          for (let j = 0; j < 360; j += 10) {
            const sep = angularSeparation(i, j);
            assert.ok(sep <= 180, `Separation ${sep} exceeds 180 for ${i}, ${j}`);
          }
        }
      });
    });

    describe('360°/0° boundary crossing', () => {
      it('should handle 350° to 10° (20° apart)', () => {
        assert.equal(angularSeparation(350, 10), 20);
      });

      it('should handle 359° to 1° (2° apart)', () => {
        assert.equal(angularSeparation(359, 1), 2);
      });

      it('should handle 1° to 359° (2° apart)', () => {
        assert.equal(angularSeparation(1, 359), 2);
      });

      it('should handle 355° to 5° (10° apart)', () => {
        assert.equal(angularSeparation(355, 5), 10);
      });

      it('should handle 340° to 20° (40° apart)', () => {
        assert.equal(angularSeparation(340, 20), 40);
      });
    });

    describe('Symmetry', () => {
      it('should be symmetric (order of arguments does not matter)', () => {
        const testPairs = [
          [0, 45],
          [100, 200],
          [350, 10],
          [180, 0],
          [45.5, 135.7],
        ];

        for (const [a, b] of testPairs) {
          assert.equal(
            angularSeparation(a, b),
            angularSeparation(b, a),
            `Asymmetric for ${a}, ${b}`,
          );
        }
      });
    });

    describe('Mathematical verification', () => {
      it('should satisfy triangle inequality property', () => {
        // For any three points A, B, C:
        // separation(A,C) ≤ separation(A,B) + separation(B,C)
        const A = 10;
        const B = 50;
        const C = 100;

        const AB = angularSeparation(A, B);
        const BC = angularSeparation(B, C);
        const AC = angularSeparation(A, C);

        assert.ok(AC <= AB + BC + ANGLE_EPSILON);
      });

      it('should be reflexive (distance to self is 0)', () => {
        for (const angle of [0, 45, 90, 180, 270, 359.99]) {
          assert.equal(angularSeparation(angle, angle), 0);
        }
      });

      it('should compute known mathematical separations correctly', () => {
        // These are mathematical facts, not astronomical observations
        // 90° separation (quarter circle)
        assert.equal(angularSeparation(0, 90), 90);
        assert.equal(angularSeparation(45, 135), 90);

        // 60° separation (sextile angle)
        assert.equal(angularSeparation(0, 60), 60);
        assert.equal(angularSeparation(300, 0), 60);

        // 120° separation (trine angle)
        assert.equal(angularSeparation(0, 120), 120);
        assert.equal(angularSeparation(240, 0), 120);
      });
    });

    describe('Aspect-relevant separations', () => {
      it('should detect exact conjunction (0°)', () => {
        assert.ok(angularSeparation(120, 120) < ANGLE_EPSILON);
      });

      it('should detect exact sextile (60°)', () => {
        assert.ok(Math.abs(angularSeparation(0, 60) - 60) < ANGLE_EPSILON);
      });

      it('should detect exact square (90°)', () => {
        assert.ok(Math.abs(angularSeparation(0, 90) - 90) < ANGLE_EPSILON);
      });

      it('should detect exact trine (120°)', () => {
        assert.ok(Math.abs(angularSeparation(0, 120) - 120) < ANGLE_EPSILON);
      });

      it('should detect exact opposition (180°)', () => {
        assert.ok(Math.abs(angularSeparation(0, 180) - 180) < ANGLE_EPSILON);
      });

      it('should detect trine crossing 0° boundary', () => {
        // 240° to 0° should be 120° (trine)
        assert.ok(Math.abs(angularSeparation(240, 0) - 120) < ANGLE_EPSILON);
      });
    });

    describe('Floating-point edge cases', () => {
      it('should handle very small separations', () => {
        const sep = angularSeparation(45.0001, 45.0002);
        assert.ok(sep < 0.001);
      });

      it('should handle separations very close to 180', () => {
        const sep = angularSeparation(0, 179.9999);
        assert.ok(Math.abs(sep - 180) < 0.001);
      });

      it('should return 0 for values within ANGLE_EPSILON', () => {
        const sep = angularSeparation(100, 100 + ANGLE_EPSILON / 2);
        assert.equal(sep, 0);
      });
    });
  });

  describe('signedAngle', () => {
    describe('Basic signed angles', () => {
      it('should return +10 for 0° to 10°', () => {
        assert.equal(signedAngle(0, 10), 10);
      });

      it('should return -10 for 10° to 0°', () => {
        assert.equal(signedAngle(10, 0), -10);
      });

      it('should return +90 for 0° to 90°', () => {
        assert.equal(signedAngle(0, 90), 90);
      });

      it('should return -90 for 90° to 0°', () => {
        assert.equal(signedAngle(90, 0), -90);
      });

      it('should return 0 for identical positions', () => {
        assert.equal(signedAngle(45, 45), 0);
      });
    });

    describe('Range is (-180, +180]', () => {
      it('should return +180 for 0° to 180°', () => {
        // At exactly 180, could be either direction, we use +180
        const result = signedAngle(0, 180);
        assert.ok(Math.abs(result) === 180);
      });

      it('should return -170 for 0° to 190° (via shorter path)', () => {
        assert.equal(signedAngle(0, 190), -170);
      });

      it('should return +170 for 190° to 0° (via shorter path)', () => {
        assert.equal(signedAngle(190, 0), 170);
      });
    });

    describe('Crossing 0°/360° boundary', () => {
      it('should return +20 for 350° to 10°', () => {
        assert.equal(signedAngle(350, 10), 20);
      });

      it('should return -20 for 10° to 350°', () => {
        assert.equal(signedAngle(10, 350), -20);
      });

      it('should return +2 for 359° to 1°', () => {
        assert.equal(signedAngle(359, 1), 2);
      });

      it('should return -2 for 1° to 359°', () => {
        assert.equal(signedAngle(1, 359), -2);
      });
    });

    describe('Relationship to angularSeparation', () => {
      it('absolute value should equal angularSeparation', () => {
        const testPairs = [
          [0, 45],
          [100, 200],
          [350, 10],
          [45.5, 135.7],
        ];

        for (const [a, b] of testPairs) {
          assert.ok(
            Math.abs(Math.abs(signedAngle(a, b)) - angularSeparation(a, b)) < ANGLE_EPSILON,
            `Mismatch for ${a}, ${b}`,
          );
        }
      });
    });
  });

  describe('anglesAreEqual', () => {
    it('should return true for identical angles', () => {
      assert.ok(anglesAreEqual(45, 45));
      assert.ok(anglesAreEqual(0, 0));
      assert.ok(anglesAreEqual(180, 180));
    });

    it('should return true for angles within epsilon', () => {
      assert.ok(anglesAreEqual(45, 45 + ANGLE_EPSILON / 2));
      assert.ok(anglesAreEqual(0, ANGLE_EPSILON / 2));
    });

    it('should return false for angles beyond epsilon', () => {
      assert.ok(!anglesAreEqual(45, 46));
      assert.ok(!anglesAreEqual(0, 1));
    });

    it('should handle wraparound at 360°/0°', () => {
      assert.ok(anglesAreEqual(0, 360));
      assert.ok(anglesAreEqual(359.99999, 0.00001, 0.001));
    });

    it('should accept custom epsilon', () => {
      assert.ok(anglesAreEqual(45, 46, 2)); // Within 2°
      assert.ok(!anglesAreEqual(45, 48, 2)); // Beyond 2°
    });
  });

  describe('midpoint', () => {
    describe('Basic midpoints', () => {
      it('should return 45 for 0° and 90°', () => {
        assert.equal(midpoint(0, 90), 45);
      });

      it('should return 90 for 0° and 180°', () => {
        assert.equal(midpoint(0, 180), 90);
      });

      it('should return 180 for 90° and 270°', () => {
        const result = midpoint(90, 270);
        // Could be 180 or 0, both are valid midpoints
        assert.ok(result === 180 || result === 0);
      });
    });

    describe('Crossing 0°/360° boundary', () => {
      it('should return 0 for 350° and 10°', () => {
        const result = midpoint(350, 10);
        assert.ok(Math.abs(result) < 1 || Math.abs(result - 360) < 1);
      });

      it('should return 355 for 350° and 0°', () => {
        const result = midpoint(350, 0);
        assert.ok(Math.abs(result - 355) < 1);
      });
    });

    describe('Symmetry', () => {
      it('midpoint should be same regardless of order', () => {
        const mp1 = midpoint(30, 90);
        const mp2 = midpoint(90, 30);
        assert.ok(anglesAreEqual(mp1, mp2, 0.001));
      });
    });
  });

  describe('getSignIndex', () => {
    describe('Sign boundaries', () => {
      it('should return 0 for Aries (0-30°)', () => {
        assert.equal(getSignIndex(0), 0);
        assert.equal(getSignIndex(15), 0);
        assert.equal(getSignIndex(29.9), 0);
      });

      it('should return 1 for Taurus (30-60°)', () => {
        assert.equal(getSignIndex(30), 1);
        assert.equal(getSignIndex(45), 1);
        assert.equal(getSignIndex(59.9), 1);
      });

      it('should return 6 for Libra (180-210°)', () => {
        assert.equal(getSignIndex(180), 6);
        assert.equal(getSignIndex(195), 6);
      });

      it('should return 11 for Pisces (330-360°)', () => {
        assert.equal(getSignIndex(330), 11);
        assert.equal(getSignIndex(359.9), 11);
      });
    });

    describe('All 12 signs', () => {
      const signStarts = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

      for (let i = 0; i < 12; i++) {
        it(`should return ${i} for ${signStarts[i]}°`, () => {
          assert.equal(getSignIndex(signStarts[i]), i);
        });
      }
    });

    describe('Normalization', () => {
      it('should handle values >= 360', () => {
        assert.equal(getSignIndex(360), 0);
        assert.equal(getSignIndex(370), 0);
        assert.equal(getSignIndex(390), 1);
      });

      it('should handle negative values', () => {
        assert.equal(getSignIndex(-10), 11); // 350°
        assert.equal(getSignIndex(-30), 11); // 330°
      });
    });
  });

  describe('signSeparation', () => {
    describe('Same sign', () => {
      it('should return 0 for positions in same sign', () => {
        assert.equal(signSeparation(5, 25), 0); // Both in Aries
        assert.equal(signSeparation(45, 55), 0); // Both in Taurus
      });
    });

    describe('Adjacent signs', () => {
      it('should return 1 for adjacent signs (forward)', () => {
        assert.equal(signSeparation(15, 45), 1); // Aries to Taurus
      });

      it('should return 11 for adjacent signs (backward)', () => {
        assert.equal(signSeparation(45, 15), 11); // Taurus to Aries (going around)
      });
    });

    describe('Aspect-related separations', () => {
      it('should return 3 or 9 for square signs', () => {
        const sep1 = signSeparation(0, 90); // Aries to Cancer
        const sep2 = signSeparation(0, 270); // Aries to Capricorn
        assert.equal(sep1, 3);
        assert.equal(sep2, 9);
      });

      it('should return 4 or 8 for trine signs', () => {
        const sep1 = signSeparation(0, 120); // Aries to Leo
        const sep2 = signSeparation(0, 240); // Aries to Sagittarius
        assert.equal(sep1, 4);
        assert.equal(sep2, 8);
      });

      it('should return 6 for opposition signs', () => {
        assert.equal(signSeparation(0, 180), 6); // Aries to Libra
        assert.equal(signSeparation(90, 270), 6); // Cancer to Capricorn
      });
    });

    describe('Crossing boundaries', () => {
      it('should handle Pisces to Aries', () => {
        assert.equal(signSeparation(350, 10), 1); // Pisces to Aries
      });

      it('should handle Aries to Pisces', () => {
        assert.equal(signSeparation(10, 350), 11); // Aries to Pisces (going around)
      });
    });
  });
});
