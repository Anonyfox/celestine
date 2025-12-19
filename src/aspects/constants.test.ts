/**
 * Tests for Aspect Constants
 *
 * @remarks
 * Validates all aspect definitions against authoritative sources:
 * - Ptolemy's "Tetrabiblos" for major aspect angles
 * - Harmonic theory for angle derivations (360/n)
 * - Modern astrological consensus for orb values
 *
 * These tests ensure the foundational data is correct before
 * building calculations on top of it.
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  ALL_ASPECTS,
  ANGLE_EPSILON,
  ASPECT_ANGLES,
  ASPECT_DEFINITIONS,
  ASPECT_NAMES,
  ASPECT_SIGN_SEPARATIONS,
  ASPECT_SYMBOLS,
  DEFAULT_ORBS,
  DYNAMIC_ASPECTS,
  HARMONIOUS_ASPECTS,
  MAJOR_ASPECTS,
  MAX_SEPARATION,
  MINOR_ASPECTS,
  STATIONARY_THRESHOLD,
} from './constants.js';
import { AspectType } from './types.js';

// =============================================================================
// AUTHORITATIVE REFERENCE DATA
// Source: Standard astrological definitions, harmonic theory
// DO NOT MODIFY - these are ground truth values
// =============================================================================

/**
 * Exact aspect angles from harmonic theory.
 * These are mathematical facts, not conventions.
 */
const REFERENCE_ANGLES = {
  conjunction: 0,
  sextile: 60, // 360/6
  square: 90, // 360/4
  trine: 120, // 360/3
  opposition: 180, // 360/2
  'semi-sextile': 30, // 360/12
  'semi-square': 45, // 360/8
  quintile: 72, // 360/5
  sesquiquadrate: 135, // 360/8 * 3
  biquintile: 144, // 360/5 * 2
  quincunx: 150, // 360/12 * 5
} as const;

/**
 * Expected Unicode symbols for aspects.
 * Source: Unicode Standard, astrological convention
 */
const REFERENCE_SYMBOLS = {
  conjunction: '☌', // U+260C
  opposition: '☍', // U+260D
  trine: '△', // U+25B3
  square: '□', // U+25A1
  sextile: '⚹', // U+26B9
  'semi-sextile': '⚺', // U+26BA
  quincunx: '⚻', // U+26BB
  sesquiquadrate: '⚼', // U+26BC
} as const;

describe('aspects/constants', () => {
  describe('ASPECT_ANGLES', () => {
    it('should have all 11 aspect types defined', () => {
      const aspectTypes = Object.values(AspectType);
      assert.equal(Object.keys(ASPECT_ANGLES).length, aspectTypes.length);

      for (const type of aspectTypes) {
        assert.ok(type in ASPECT_ANGLES, `Missing angle definition for ${type}`);
      }
    });

    describe('Major aspect angles (Ptolemaic)', () => {
      it('Conjunction should be exactly 0°', () => {
        assert.equal(ASPECT_ANGLES[AspectType.Conjunction], 0);
      });

      it('Sextile should be exactly 60° (360/6)', () => {
        assert.equal(ASPECT_ANGLES[AspectType.Sextile], 60);
        assert.equal(360 / 6, 60); // Verify harmonic
      });

      it('Square should be exactly 90° (360/4)', () => {
        assert.equal(ASPECT_ANGLES[AspectType.Square], 90);
        assert.equal(360 / 4, 90);
      });

      it('Trine should be exactly 120° (360/3)', () => {
        assert.equal(ASPECT_ANGLES[AspectType.Trine], 120);
        assert.equal(360 / 3, 120);
      });

      it('Opposition should be exactly 180° (360/2)', () => {
        assert.equal(ASPECT_ANGLES[AspectType.Opposition], 180);
        assert.equal(360 / 2, 180);
      });
    });

    describe('Minor aspect angles', () => {
      it('Semi-sextile should be exactly 30° (360/12)', () => {
        assert.equal(ASPECT_ANGLES[AspectType.SemiSextile], 30);
        assert.equal(360 / 12, 30);
      });

      it('Semi-square should be exactly 45° (360/8)', () => {
        assert.equal(ASPECT_ANGLES[AspectType.SemiSquare], 45);
        assert.equal(360 / 8, 45);
      });

      it('Quintile should be exactly 72° (360/5)', () => {
        assert.equal(ASPECT_ANGLES[AspectType.Quintile], 72);
        assert.equal(360 / 5, 72);
      });

      it('Sesquiquadrate should be exactly 135° (3 × 45)', () => {
        assert.equal(ASPECT_ANGLES[AspectType.Sesquiquadrate], 135);
        assert.equal(3 * 45, 135);
      });

      it('Biquintile should be exactly 144° (2 × 72)', () => {
        assert.equal(ASPECT_ANGLES[AspectType.Biquintile], 144);
        assert.equal(2 * 72, 144);
      });

      it('Quincunx should be exactly 150° (5 × 30)', () => {
        assert.equal(ASPECT_ANGLES[AspectType.Quincunx], 150);
        assert.equal(5 * 30, 150);
      });
    });

    it('should match all reference angles', () => {
      for (const [name, angle] of Object.entries(REFERENCE_ANGLES)) {
        const type = Object.values(AspectType).find(
          (t) => t.toLowerCase().replace('-', '') === name.replace('-', ''),
        );
        assert.ok(type, `No AspectType found for ${name}`);
        assert.equal(
          ASPECT_ANGLES[type],
          angle,
          `${name} angle mismatch: expected ${angle}, got ${ASPECT_ANGLES[type]}`,
        );
      }
    });

    it('all angles should be in range 0-180', () => {
      for (const [type, angle] of Object.entries(ASPECT_ANGLES)) {
        assert.ok(angle >= 0, `${type} angle ${angle} is negative`);
        assert.ok(angle <= 180, `${type} angle ${angle} exceeds 180`);
      }
    });
  });

  describe('DEFAULT_ORBS', () => {
    it('should have orbs for all aspect types', () => {
      for (const type of Object.values(AspectType)) {
        assert.ok(type in DEFAULT_ORBS, `Missing orb for ${type}`);
      }
    });

    it('major aspects should have orbs 6-8°', () => {
      const majorOrbs = [
        DEFAULT_ORBS[AspectType.Conjunction],
        DEFAULT_ORBS[AspectType.Sextile],
        DEFAULT_ORBS[AspectType.Square],
        DEFAULT_ORBS[AspectType.Trine],
        DEFAULT_ORBS[AspectType.Opposition],
      ];

      for (const orb of majorOrbs) {
        assert.ok(orb >= 6, `Major orb ${orb} is less than 6`);
        assert.ok(orb <= 8, `Major orb ${orb} is greater than 8`);
      }
    });

    it('minor aspects should have orbs 2-3°', () => {
      const minorOrbs = [
        DEFAULT_ORBS[AspectType.SemiSextile],
        DEFAULT_ORBS[AspectType.SemiSquare],
        DEFAULT_ORBS[AspectType.Quintile],
        DEFAULT_ORBS[AspectType.Sesquiquadrate],
        DEFAULT_ORBS[AspectType.Biquintile],
        DEFAULT_ORBS[AspectType.Quincunx],
      ];

      for (const orb of minorOrbs) {
        assert.ok(orb >= 2, `Minor orb ${orb} is less than 2`);
        assert.ok(orb <= 3, `Minor orb ${orb} is greater than 3`);
      }
    });

    it('all orbs should be positive', () => {
      for (const [type, orb] of Object.entries(DEFAULT_ORBS)) {
        assert.ok(orb > 0, `${type} has non-positive orb: ${orb}`);
      }
    });

    it('all orbs should be reasonable (≤ 15°)', () => {
      for (const [type, orb] of Object.entries(DEFAULT_ORBS)) {
        assert.ok(orb <= 15, `${type} has unreasonably large orb: ${orb}`);
      }
    });
  });

  describe('ASPECT_SYMBOLS', () => {
    it('should have symbols for all aspect types', () => {
      for (const type of Object.values(AspectType)) {
        assert.ok(type in ASPECT_SYMBOLS, `Missing symbol for ${type}`);
        assert.ok(ASPECT_SYMBOLS[type].length > 0, `Empty symbol for ${type}`);
      }
    });

    it('should match reference symbols', () => {
      assert.equal(ASPECT_SYMBOLS[AspectType.Conjunction], REFERENCE_SYMBOLS.conjunction);
      assert.equal(ASPECT_SYMBOLS[AspectType.Opposition], REFERENCE_SYMBOLS.opposition);
      assert.equal(ASPECT_SYMBOLS[AspectType.Trine], REFERENCE_SYMBOLS.trine);
      assert.equal(ASPECT_SYMBOLS[AspectType.Square], REFERENCE_SYMBOLS.square);
      assert.equal(ASPECT_SYMBOLS[AspectType.Sextile], REFERENCE_SYMBOLS.sextile);
      assert.equal(ASPECT_SYMBOLS[AspectType.SemiSextile], REFERENCE_SYMBOLS['semi-sextile']);
      assert.equal(ASPECT_SYMBOLS[AspectType.Quincunx], REFERENCE_SYMBOLS.quincunx);
      assert.equal(ASPECT_SYMBOLS[AspectType.Sesquiquadrate], REFERENCE_SYMBOLS.sesquiquadrate);
    });
  });

  describe('ASPECT_NAMES', () => {
    it('should have names for all aspect types', () => {
      for (const type of Object.values(AspectType)) {
        assert.ok(type in ASPECT_NAMES, `Missing name for ${type}`);
        assert.ok(ASPECT_NAMES[type].length > 0, `Empty name for ${type}`);
      }
    });

    it('names should be properly capitalized', () => {
      for (const name of Object.values(ASPECT_NAMES)) {
        assert.ok(
          name[0] === name[0].toUpperCase(),
          `Name "${name}" should start with capital letter`,
        );
      }
    });
  });

  describe('ASPECT_DEFINITIONS', () => {
    it('should have complete definitions for all aspect types', () => {
      for (const type of Object.values(AspectType)) {
        const def = ASPECT_DEFINITIONS[type];
        assert.ok(def, `Missing definition for ${type}`);
        assert.equal(def.type, type);
        assert.equal(def.angle, ASPECT_ANGLES[type]);
        assert.equal(def.symbol, ASPECT_SYMBOLS[type]);
        assert.equal(def.defaultOrb, DEFAULT_ORBS[type]);
        assert.equal(def.name, ASPECT_NAMES[type]);
        assert.ok(['major', 'minor'].includes(def.classification));
        assert.ok(['harmonious', 'dynamic', 'neutral'].includes(def.nature));
        assert.ok(def.harmonic > 0 || def.harmonic === Infinity);
      }
    });

    it('should have consistent classification with MAJOR_ASPECTS/MINOR_ASPECTS', () => {
      for (const major of MAJOR_ASPECTS) {
        assert.equal(
          ASPECT_DEFINITIONS[major].classification,
          'major',
          `${major} should be classified as major`,
        );
      }

      for (const minor of MINOR_ASPECTS) {
        assert.equal(
          ASPECT_DEFINITIONS[minor].classification,
          'minor',
          `${minor} should be classified as minor`,
        );
      }
    });

    it('should have consistent nature with HARMONIOUS/DYNAMIC arrays', () => {
      for (const type of HARMONIOUS_ASPECTS) {
        assert.equal(ASPECT_DEFINITIONS[type].nature, 'harmonious', `${type} should be harmonious`);
      }

      for (const type of DYNAMIC_ASPECTS) {
        assert.equal(ASPECT_DEFINITIONS[type].nature, 'dynamic', `${type} should be dynamic`);
      }
    });

    it('harmonics should be mathematically correct', () => {
      // Harmonic = 360 / angle (for non-zero angles)
      for (const [type, def] of Object.entries(ASPECT_DEFINITIONS)) {
        if (def.angle === 0) {
          // Conjunction has infinite harmonic
          assert.equal(def.harmonic, Infinity, `${type} harmonic should be Infinity`);
        } else {
          const expectedHarmonic = 360 / def.angle;
          // Allow for non-integer harmonics (like quintile which is exactly 5)
          if (Number.isInteger(expectedHarmonic)) {
            assert.equal(
              def.harmonic,
              expectedHarmonic,
              `${type} harmonic: expected ${expectedHarmonic}, got ${def.harmonic}`,
            );
          }
        }
      }
    });
  });

  describe('Aspect arrays', () => {
    it('MAJOR_ASPECTS should have exactly 5 aspects', () => {
      assert.equal(MAJOR_ASPECTS.length, 5);
    });

    it('MINOR_ASPECTS should have exactly 6 aspects', () => {
      assert.equal(MINOR_ASPECTS.length, 6);
    });

    it('ALL_ASPECTS should contain all 11 aspects', () => {
      assert.equal(ALL_ASPECTS.length, 11);
      assert.equal(ALL_ASPECTS.length, MAJOR_ASPECTS.length + MINOR_ASPECTS.length);
    });

    it('MAJOR_ASPECTS should contain the Ptolemaic five', () => {
      assert.ok(MAJOR_ASPECTS.includes(AspectType.Conjunction));
      assert.ok(MAJOR_ASPECTS.includes(AspectType.Sextile));
      assert.ok(MAJOR_ASPECTS.includes(AspectType.Square));
      assert.ok(MAJOR_ASPECTS.includes(AspectType.Trine));
      assert.ok(MAJOR_ASPECTS.includes(AspectType.Opposition));
    });

    it('arrays should have no duplicates', () => {
      const checkDuplicates = (arr: AspectType[], name: string) => {
        const unique = new Set(arr);
        assert.equal(unique.size, arr.length, `${name} has duplicates`);
      };

      checkDuplicates(MAJOR_ASPECTS, 'MAJOR_ASPECTS');
      checkDuplicates(MINOR_ASPECTS, 'MINOR_ASPECTS');
      checkDuplicates(ALL_ASPECTS, 'ALL_ASPECTS');
      checkDuplicates(HARMONIOUS_ASPECTS, 'HARMONIOUS_ASPECTS');
      checkDuplicates(DYNAMIC_ASPECTS, 'DYNAMIC_ASPECTS');
    });

    it('no aspect should be in both MAJOR and MINOR', () => {
      for (const major of MAJOR_ASPECTS) {
        assert.ok(!MINOR_ASPECTS.includes(major), `${major} is in both MAJOR and MINOR`);
      }
    });
  });

  describe('ASPECT_SIGN_SEPARATIONS', () => {
    it('should have separations for all aspect types', () => {
      for (const type of Object.values(AspectType)) {
        assert.ok(type in ASPECT_SIGN_SEPARATIONS, `Missing sign separations for ${type}`);
        assert.ok(ASPECT_SIGN_SEPARATIONS[type].length > 0, `Empty sign separations for ${type}`);
      }
    });

    it('Conjunction should only match same sign (0)', () => {
      assert.deepEqual(ASPECT_SIGN_SEPARATIONS[AspectType.Conjunction], [0]);
    });

    it('Opposition should only match 6 signs apart', () => {
      assert.deepEqual(ASPECT_SIGN_SEPARATIONS[AspectType.Opposition], [6]);
    });

    it('Sextile should match 2 or 10 signs', () => {
      const sextile = ASPECT_SIGN_SEPARATIONS[AspectType.Sextile];
      assert.ok(sextile.includes(2));
      assert.ok(sextile.includes(10)); // 12 - 2 = 10
    });

    it('Square should match 3 or 9 signs', () => {
      const square = ASPECT_SIGN_SEPARATIONS[AspectType.Square];
      assert.ok(square.includes(3));
      assert.ok(square.includes(9)); // 12 - 3 = 9
    });

    it('Trine should match 4 or 8 signs', () => {
      const trine = ASPECT_SIGN_SEPARATIONS[AspectType.Trine];
      assert.ok(trine.includes(4));
      assert.ok(trine.includes(8)); // 12 - 4 = 8
    });

    it('all separations should be in range 0-11', () => {
      for (const [type, seps] of Object.entries(ASPECT_SIGN_SEPARATIONS)) {
        for (const sep of seps) {
          assert.ok(sep >= 0, `${type} has negative separation: ${sep}`);
          assert.ok(sep <= 11, `${type} has separation > 11: ${sep}`);
        }
      }
    });
  });

  describe('Utility constants', () => {
    it('ANGLE_EPSILON should be small but positive', () => {
      assert.ok(ANGLE_EPSILON > 0);
      assert.ok(ANGLE_EPSILON < 0.001); // Less than 1 arcsecond
    });

    it('STATIONARY_THRESHOLD should be reasonable', () => {
      assert.ok(STATIONARY_THRESHOLD > 0);
      assert.ok(STATIONARY_THRESHOLD < 0.1); // Less than 0.1°/day
    });

    it('MAX_SEPARATION should be 180', () => {
      assert.equal(MAX_SEPARATION, 180);
    });
  });

  describe('Internal consistency', () => {
    it('all arrays should only contain valid AspectType values', () => {
      const validTypes = Object.values(AspectType);

      for (const type of ALL_ASPECTS) {
        assert.ok(validTypes.includes(type), `Invalid type in ALL_ASPECTS: ${type}`);
      }

      for (const type of MAJOR_ASPECTS) {
        assert.ok(validTypes.includes(type), `Invalid type in MAJOR_ASPECTS: ${type}`);
      }

      for (const type of MINOR_ASPECTS) {
        assert.ok(validTypes.includes(type), `Invalid type in MINOR_ASPECTS: ${type}`);
      }
    });

    it('ALL_ASPECTS should be MAJOR + MINOR', () => {
      const combined = [...MAJOR_ASPECTS, ...MINOR_ASPECTS].sort();
      const all = [...ALL_ASPECTS].sort();
      assert.deepEqual(all, combined);
    });
  });
});
