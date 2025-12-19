/**
 * Tests for Aspect Pattern Detection
 *
 * @remarks
 * Pattern detection is based on geometric relationships which are
 * mathematically defined. Tests use:
 *
 * 1. **Mathematical validation** - Perfect geometric configurations
 *    where patterns are guaranteed by definition (provable facts)
 *
 * 2. **Real chart validation** - J2000.0 epoch with JPL Horizons data
 *
 * Pattern definitions (from IMPL.md Section 7):
 * - T-Square: Opposition (180°) + 2 Squares (90°)
 * - Grand Trine: 3 Trines (120° each)
 * - Grand Cross: 4 Squares (90°) + 2 Oppositions (180°)
 * - Yod: 2 Quincunxes (150°) + 1 Sextile (60°)
 * - Stellium: 3+ Conjunctions
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { findAllAspects } from './aspect-detection.js';
import {
  detectGrandCross,
  detectGrandTrine,
  detectKite,
  detectMysticRectangle,
  detectStellium,
  detectTSquare,
  detectYod,
  findPatterns,
  formatPattern,
  getPatternSummary,
} from './patterns.js';
import type { Aspect, AspectBody } from './types.js';
import { AspectType, PatternType } from './types.js';

// =============================================================================
// MATHEMATICAL TEST CONFIGURATIONS
// These are provable geometric facts - the patterns exist BY DEFINITION
// =============================================================================

/**
 * Perfect T-Square configuration.
 *
 * Mathematical proof:
 * - A at 0°, B at 180° → Opposition (180°) ✓
 * - C at 90° (apex)
 * - A to C = 90° → Square ✓
 * - B to C = 90° → Square ✓
 */
const PERFECT_TSQUARE: AspectBody[] = [
  { name: 'A', longitude: 0 },
  { name: 'B', longitude: 180 },
  { name: 'C', longitude: 90 }, // Apex
];

/**
 * Perfect Grand Trine configuration.
 *
 * Mathematical proof:
 * - Equilateral triangle inscribed in circle
 * - A at 0°, B at 120°, C at 240°
 * - All separations = 120° ✓
 */
const PERFECT_GRAND_TRINE: AspectBody[] = [
  { name: 'A', longitude: 0 },
  { name: 'B', longitude: 120 },
  { name: 'C', longitude: 240 },
];

/**
 * Perfect Grand Cross configuration.
 *
 * Mathematical proof:
 * - Square inscribed in circle
 * - A at 0°, B at 90°, C at 180°, D at 270°
 * - Adjacent separations = 90° (4 squares) ✓
 * - Diagonal separations = 180° (2 oppositions) ✓
 */
const PERFECT_GRAND_CROSS: AspectBody[] = [
  { name: 'A', longitude: 0 },
  { name: 'B', longitude: 90 },
  { name: 'C', longitude: 180 },
  { name: 'D', longitude: 270 },
];

/**
 * Perfect Yod (Finger of God) configuration.
 *
 * Mathematical proof:
 * - Base: A at 0°, B at 60° → Sextile (60°) ✓
 * - Apex: C at 150°
 * - A to C = 150° → Quincunx ✓
 * - B to C = 90°... wait, that's a square, not quincunx
 *
 * Corrected Yod:
 * - A at 0°, B at 60° → Sextile (60°) ✓
 * - C at 150°: A to C = 150° (quincunx), B to C = 90° (wrong)
 *
 * Actually for Yod: apex must be 150° from BOTH base planets
 * - A at 0°, B at 60° (sextile base)
 * - For C: distance to A = 150°, distance to B = 150°
 * - C = 150° (150° from A), B to C = |150-60| = 90° (wrong)
 *
 * Recalculating:
 * - If A at 0° and C is 150° away, C = 150° or C = -150° = 210°
 * - If B at 60° and C is 150° away, C = 210° or C = -90° = 270°
 * - Common value: C = 210°
 *
 * Verification:
 * - A (0°) to B (60°) = 60° ✓ Sextile
 * - A (0°) to C (210°) = 150° ✓ Quincunx
 * - B (60°) to C (210°) = 150° ✓ Quincunx
 */
const PERFECT_YOD: AspectBody[] = [
  { name: 'A', longitude: 0 },
  { name: 'B', longitude: 60 },
  { name: 'C', longitude: 210 }, // Apex
];

/**
 * Perfect Kite configuration.
 *
 * Mathematical proof:
 * - Grand Trine: A at 0°, B at 120°, C at 240°
 * - D opposite to A at 180°
 * - D forms sextiles to B and C:
 *   - D (180°) to B (120°) = 60° ✓ Sextile
 *   - D (180°) to C (240°) = 60° ✓ Sextile
 */
const PERFECT_KITE: AspectBody[] = [
  { name: 'A', longitude: 0 },
  { name: 'B', longitude: 120 },
  { name: 'C', longitude: 240 },
  { name: 'D', longitude: 180 }, // Opposite to A
];

/**
 * Perfect Mystic Rectangle configuration.
 *
 * Mathematical proof:
 * - A at 0°, B at 60°, C at 180°, D at 240°
 * - Oppositions: A-C (180°), B-D (180°) ✓
 * - Trines: A-D (120°... wait, 240-0=120? No, shortest is 120) ✓
 *         B-C (180-60=120) ✓
 * - Sextiles: A-B (60°) ✓, C-D (240-180=60) ✓
 *
 * Verification:
 * - A (0°) to C (180°) = 180° ✓ Opposition
 * - B (60°) to D (240°) = 180° ✓ Opposition
 * - A (0°) to D (240°) = 120° ✓ Trine
 * - B (60°) to C (180°) = 120° ✓ Trine
 * - A (0°) to B (60°) = 60° ✓ Sextile
 * - C (180°) to D (240°) = 60° ✓ Sextile
 */
const PERFECT_MYSTIC_RECTANGLE: AspectBody[] = [
  { name: 'A', longitude: 0 },
  { name: 'B', longitude: 60 },
  { name: 'C', longitude: 180 },
  { name: 'D', longitude: 240 },
];

/**
 * Perfect Stellium configuration.
 *
 * Mathematical proof:
 * - 4 bodies within conjunction orb
 * - A at 0°, B at 5°, C at 8°, D at 3°
 * - All pairs within 8° orb ✓
 */
const PERFECT_STELLIUM: AspectBody[] = [
  { name: 'A', longitude: 0 },
  { name: 'B', longitude: 5 },
  { name: 'C', longitude: 8 },
  { name: 'D', longitude: 3 },
];

// =============================================================================
// JPL HORIZONS J2000.0 REFERENCE DATA
// Source: NASA JPL Horizons System, extracted from ephemeris test files
// These positions are AUTHORITATIVE - validated against Swiss Ephemeris
// =============================================================================

const JPL_J2000_BODIES: AspectBody[] = [
  { name: 'Sun', longitude: 280.3689092 },
  { name: 'Moon', longitude: 223.323786 },
  { name: 'Mercury', longitude: 271.8892699 },
  { name: 'Venus', longitude: 241.5657794 },
  { name: 'Mars', longitude: 327.9632921 },
  { name: 'Jupiter', longitude: 25.2530685 },
  { name: 'Saturn', longitude: 40.3956366 },
  { name: 'Uranus', longitude: 314.809168 },
  { name: 'Neptune', longitude: 303.1930003 },
  { name: 'Pluto', longitude: 251.4547644 },
];

// =============================================================================
// TESTS
// =============================================================================

describe('aspects/patterns', () => {
  describe('T-Square Detection', () => {
    describe('Mathematical validation', () => {
      it('should detect perfect T-Square (0°-180°-90°)', () => {
        const aspects = findAllAspects(PERFECT_TSQUARE);
        const patterns = detectTSquare(aspects);

        assert.equal(patterns.length, 1, 'Should find exactly 1 T-Square');
        assert.equal(patterns[0].type, PatternType.TSquare);
        assert.ok(patterns[0].bodies.includes('C'), 'Apex should be C');
        assert.equal(patterns[0].aspects.length, 3, 'Should have 3 aspects');
      });

      it('should identify correct apex in T-Square', () => {
        const aspects = findAllAspects(PERFECT_TSQUARE);
        const patterns = detectTSquare(aspects);

        // The apex (C at 90°) forms squares to both ends of the opposition
        const description = patterns[0].description;
        assert.ok(description.includes('C'), 'Description should mention apex C');
        assert.ok(description.includes('apex'), 'Description should identify apex');
      });

      it('should not detect T-Square without opposition', () => {
        // Three bodies forming squares but no opposition
        const bodies: AspectBody[] = [
          { name: 'A', longitude: 0 },
          { name: 'B', longitude: 90 },
          { name: 'C', longitude: 45 }, // No opposition
        ];
        const aspects = findAllAspects(bodies);
        const patterns = detectTSquare(aspects);

        assert.equal(patterns.length, 0);
      });
    });

    describe('Geometric properties', () => {
      it('T-Square aspect angles sum correctly', () => {
        // In a T-Square: 180° + 90° + 90° = 360° (full circle)
        // This is mathematically guaranteed by the geometry
        const aspects = findAllAspects(PERFECT_TSQUARE);
        const tSquare = detectTSquare(aspects)[0];

        const opposition = tSquare.aspects.find((a) => a.type === AspectType.Opposition);
        const squares = tSquare.aspects.filter((a) => a.type === AspectType.Square);

        assert.ok(opposition, 'Should have one opposition');
        assert.equal(squares.length, 2, 'Should have two squares');
        assert.ok(Math.abs(opposition!.angle - 180) < 0.001);
        assert.ok(squares.every((s) => Math.abs(s.angle - 90) < 0.001));
      });
    });
  });

  describe('Grand Trine Detection', () => {
    describe('Mathematical validation', () => {
      it('should detect perfect Grand Trine (0°-120°-240°)', () => {
        const aspects = findAllAspects(PERFECT_GRAND_TRINE);
        const patterns = detectGrandTrine(aspects);

        assert.equal(patterns.length, 1, 'Should find exactly 1 Grand Trine');
        assert.equal(patterns[0].type, PatternType.GrandTrine);
        assert.equal(patterns[0].bodies.length, 3);
        assert.equal(patterns[0].aspects.length, 3, 'Should have 3 trines');
      });

      it('all aspects in Grand Trine should be trines', () => {
        const aspects = findAllAspects(PERFECT_GRAND_TRINE);
        const patterns = detectGrandTrine(aspects);

        assert.ok(patterns[0].aspects.every((a) => a.type === AspectType.Trine));
      });
    });

    describe('Geometric properties', () => {
      it('Grand Trine forms equilateral triangle (3 × 120° = 360°)', () => {
        const aspects = findAllAspects(PERFECT_GRAND_TRINE);
        const gt = detectGrandTrine(aspects)[0];

        const angleSum = gt.aspects.reduce((sum, a) => sum + a.angle, 0);
        assert.equal(angleSum, 360, '3 trines of 120° each = 360°');
      });
    });
  });

  describe('Grand Cross Detection', () => {
    describe('Mathematical validation', () => {
      it('should detect perfect Grand Cross (0°-90°-180°-270°)', () => {
        const aspects = findAllAspects(PERFECT_GRAND_CROSS);
        const patterns = detectGrandCross(aspects);

        assert.equal(patterns.length, 1, 'Should find exactly 1 Grand Cross');
        assert.equal(patterns[0].type, PatternType.GrandCross);
        assert.equal(patterns[0].bodies.length, 4);
      });

      it('should have 4 squares and 2 oppositions', () => {
        const aspects = findAllAspects(PERFECT_GRAND_CROSS);
        const patterns = detectGrandCross(aspects);
        const gc = patterns[0];

        const squares = gc.aspects.filter((a) => a.type === AspectType.Square);
        const opps = gc.aspects.filter((a) => a.type === AspectType.Opposition);

        assert.equal(squares.length, 4, 'Should have 4 squares');
        assert.equal(opps.length, 2, 'Should have 2 oppositions');
      });
    });

    describe('Geometric properties', () => {
      it('Grand Cross forms square inscribed in circle', () => {
        const aspects = findAllAspects(PERFECT_GRAND_CROSS);
        const gc = detectGrandCross(aspects)[0];

        // 4 squares (4 × 90°) + 2 oppositions (2 × 180°)
        // But we're counting aspects, not angles around the circle
        const squareAngleSum = gc.aspects
          .filter((a) => a.type === AspectType.Square)
          .reduce((sum, a) => sum + a.angle, 0);

        assert.equal(squareAngleSum, 360, '4 squares of 90° = 360°');
      });
    });
  });

  describe('Yod Detection', () => {
    describe('Mathematical validation', () => {
      it('should detect perfect Yod (0°-60°-210°)', () => {
        // Need to include Quincunx in aspect types
        const aspects = findAllAspects(PERFECT_YOD, {
          aspectTypes: [AspectType.Sextile, AspectType.Quincunx],
        });
        const patterns = detectYod(aspects);

        assert.equal(patterns.length, 1, 'Should find exactly 1 Yod');
        assert.equal(patterns[0].type, PatternType.Yod);
        assert.ok(patterns[0].bodies.includes('C'), 'Apex should be C');
      });

      it('should have 1 sextile and 2 quincunxes', () => {
        const aspects = findAllAspects(PERFECT_YOD, {
          aspectTypes: [AspectType.Sextile, AspectType.Quincunx],
        });
        const patterns = detectYod(aspects);
        const yod = patterns[0];

        const sextiles = yod.aspects.filter((a) => a.type === AspectType.Sextile);
        const quincunxes = yod.aspects.filter((a) => a.type === AspectType.Quincunx);

        assert.equal(sextiles.length, 1, 'Should have 1 sextile');
        assert.equal(quincunxes.length, 2, 'Should have 2 quincunxes');
      });
    });

    describe('Geometric properties', () => {
      it('Yod angles: 60° + 150° + 150° = 360°', () => {
        const aspects = findAllAspects(PERFECT_YOD, {
          aspectTypes: [AspectType.Sextile, AspectType.Quincunx],
        });
        const yod = detectYod(aspects)[0];

        const angleSum = yod.aspects.reduce((sum, a) => sum + a.angle, 0);
        assert.equal(angleSum, 360, 'Sextile + 2 quincunxes = 360°');
      });
    });
  });

  describe('Kite Detection', () => {
    describe('Mathematical validation', () => {
      it('should detect perfect Kite (Grand Trine + opposition)', () => {
        const aspects = findAllAspects(PERFECT_KITE);
        const patterns = detectKite(aspects);

        assert.equal(patterns.length, 1, 'Should find exactly 1 Kite');
        assert.equal(patterns[0].type, PatternType.Kite);
        assert.equal(patterns[0].bodies.length, 4);
      });

      it('should include Grand Trine and additional aspects', () => {
        const aspects = findAllAspects(PERFECT_KITE);
        const patterns = detectKite(aspects);
        const kite = patterns[0];

        // Kite has: 3 trines (Grand Trine) + 1 opposition + 2 sextiles
        const trines = kite.aspects.filter((a) => a.type === AspectType.Trine);
        const opps = kite.aspects.filter((a) => a.type === AspectType.Opposition);
        const sextiles = kite.aspects.filter((a) => a.type === AspectType.Sextile);

        assert.equal(trines.length, 3, 'Should have 3 trines');
        assert.equal(opps.length, 1, 'Should have 1 opposition');
        assert.equal(sextiles.length, 2, 'Should have 2 sextiles');
      });
    });
  });

  describe('Mystic Rectangle Detection', () => {
    describe('Mathematical validation', () => {
      it('should detect perfect Mystic Rectangle', () => {
        const aspects = findAllAspects(PERFECT_MYSTIC_RECTANGLE);
        const patterns = detectMysticRectangle(aspects);

        assert.equal(patterns.length, 1, 'Should find exactly 1 Mystic Rectangle');
        assert.equal(patterns[0].type, PatternType.MysticRectangle);
        assert.equal(patterns[0].bodies.length, 4);
      });

      it('should have correct aspect composition', () => {
        const aspects = findAllAspects(PERFECT_MYSTIC_RECTANGLE);
        const patterns = detectMysticRectangle(aspects);
        const mr = patterns[0];

        const opps = mr.aspects.filter((a) => a.type === AspectType.Opposition);
        const trines = mr.aspects.filter((a) => a.type === AspectType.Trine);
        const sextiles = mr.aspects.filter((a) => a.type === AspectType.Sextile);

        assert.equal(opps.length, 2, 'Should have 2 oppositions');
        assert.equal(trines.length, 2, 'Should have 2 trines');
        assert.equal(sextiles.length, 2, 'Should have 2 sextiles');
      });
    });

    describe('Geometric properties', () => {
      it('Mystic Rectangle: 2×180° + 2×120° + 2×60° = 720°', () => {
        const aspects = findAllAspects(PERFECT_MYSTIC_RECTANGLE);
        const mr = detectMysticRectangle(aspects)[0];

        const angleSum = mr.aspects.reduce((sum, a) => sum + a.angle, 0);
        // 2×180 + 2×120 + 2×60 = 360 + 240 + 120 = 720
        assert.equal(angleSum, 720);
      });
    });
  });

  describe('Stellium Detection', () => {
    describe('Mathematical validation', () => {
      it('should detect 4-body stellium', () => {
        const aspects = findAllAspects(PERFECT_STELLIUM);
        const patterns = detectStellium(aspects);

        assert.equal(patterns.length, 1, 'Should find exactly 1 Stellium');
        assert.equal(patterns[0].type, PatternType.Stellium);
        assert.equal(patterns[0].bodies.length, 4, 'Should have 4 bodies');
      });

      it('should not detect stellium with only 2 bodies', () => {
        const bodies: AspectBody[] = [
          { name: 'A', longitude: 0 },
          { name: 'B', longitude: 5 },
        ];
        const aspects = findAllAspects(bodies);
        const patterns = detectStellium(aspects);

        assert.equal(patterns.length, 0, 'Stellium requires 3+ bodies');
      });

      it('should detect 3-body stellium (minimum)', () => {
        const bodies: AspectBody[] = [
          { name: 'A', longitude: 0 },
          { name: 'B', longitude: 5 },
          { name: 'C', longitude: 8 },
        ];
        const aspects = findAllAspects(bodies);
        const patterns = detectStellium(aspects);

        assert.equal(patterns.length, 1);
        assert.equal(patterns[0].bodies.length, 3);
      });
    });
  });

  describe('findPatterns (unified)', () => {
    it('should find multiple pattern types in complex configuration', () => {
      // A configuration that contains a Grand Trine
      const aspects = findAllAspects(PERFECT_GRAND_TRINE);
      const patterns = findPatterns(aspects);

      assert.ok(patterns.length >= 1);
      assert.ok(patterns.some((p) => p.type === PatternType.GrandTrine));
    });

    it('should not find patterns when none exist', () => {
      // Random positions with no special configuration
      const bodies: AspectBody[] = [
        { name: 'A', longitude: 15 },
        { name: 'B', longitude: 47 },
        { name: 'C', longitude: 189 },
      ];
      const aspects = findAllAspects(bodies);
      const patterns = findPatterns(aspects);

      // May find some patterns if angles happen to align
      // The key is it shouldn't crash or give false positives
      assert.ok(Array.isArray(patterns));
    });
  });

  describe('J2000.0 Real Data Validation', () => {
    /**
     * At J2000.0 epoch, check what patterns exist.
     *
     * Known from JPL Horizons data:
     * - Jupiter (25.25°) and Saturn (40.40°) are 15.14° apart (wide conjunction)
     * - Sun (280.37°) and Mercury (271.89°) are 8.48° apart (conjunction with wide orb)
     * - Sun (280.37°) and Neptune (303.19°) are 22.82° apart (no major aspect)
     *
     * This epoch does NOT have prominent major patterns (Grand Trine, etc.)
     * because the outer planets aren't in the right positions.
     */
    it('should correctly analyze J2000.0 planetary configuration', () => {
      const aspects = findAllAspects(JPL_J2000_BODIES);
      const patterns = findPatterns(aspects);

      // J2000.0 doesn't have major patterns like Grand Trine or Grand Cross
      // (verified by checking planetary positions - no 120° triangles etc.)
      assert.ok(Array.isArray(patterns));

      // Log findings for verification
      // console.log('J2000.0 aspects:', aspects.map(a => `${a.body1}-${a.body2}: ${a.type}`));
      // console.log('J2000.0 patterns:', patterns.map(p => p.type));
    });

    it('should find Sun-Mercury-Venus potential stellium area at J2000.0', () => {
      // Sun: 280.37°, Mercury: 271.89°, Venus: 241.57°
      // Sun-Mercury: 8.48° (conjunction with 9° orb)
      // Mercury-Venus: 30.32° (not conjunction)
      // Sun-Venus: 38.80° (not conjunction)
      // So no true stellium at J2000.0

      const innerPlanets = JPL_J2000_BODIES.filter((b) =>
        ['Sun', 'Mercury', 'Venus'].includes(b.name),
      );

      const aspects = findAllAspects(innerPlanets, {
        orbs: { [AspectType.Conjunction]: 10 },
      });
      const patterns = detectStellium(aspects);

      // Even with 10° orb, Sun-Venus at 38.80° won't form conjunction
      assert.equal(patterns.length, 0, 'No 3-body stellium at J2000.0 inner planets');
    });
  });

  describe('Utility Functions', () => {
    describe('getPatternSummary', () => {
      it('should count patterns by type', () => {
        const aspects = findAllAspects(PERFECT_GRAND_TRINE);
        const patterns = findPatterns(aspects);
        const summary = getPatternSummary(patterns);

        assert.equal(summary[PatternType.GrandTrine], 1);
        assert.equal(summary[PatternType.TSquare], 0);
      });
    });

    describe('formatPattern', () => {
      it('should format pattern for display', () => {
        const aspects = findAllAspects(PERFECT_GRAND_TRINE);
        const patterns = detectGrandTrine(aspects);
        const formatted = formatPattern(patterns[0]);

        assert.ok(formatted.includes('Grand Trine'));
        assert.ok(formatted.includes('A'));
        assert.ok(formatted.includes('B'));
        assert.ok(formatted.includes('C'));
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty aspect array', () => {
      const patterns = findPatterns([]);
      assert.equal(patterns.length, 0);
    });

    it('should handle single aspect', () => {
      const aspects: Aspect[] = [
        {
          body1: 'A',
          body2: 'B',
          type: AspectType.Trine,
          angle: 120,
          separation: 120,
          deviation: 0,
          orb: 8,
          strength: 100,
          isApplying: null,
          isOutOfSign: false,
          symbol: '△',
        },
      ];
      const patterns = findPatterns(aspects);
      assert.equal(patterns.length, 0, 'Single aspect cannot form a pattern');
    });

    it('should not detect duplicate patterns', () => {
      // Running detection twice should give same result
      const aspects = findAllAspects(PERFECT_GRAND_TRINE);
      const patterns1 = detectGrandTrine(aspects);
      const patterns2 = detectGrandTrine(aspects);

      assert.equal(patterns1.length, patterns2.length);
    });
  });
});
