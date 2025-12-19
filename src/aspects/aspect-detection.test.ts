/**
 * Tests for Aspect Detection
 *
 * @remarks
 * Tests include:
 * - Mathematical correctness tests (no external data needed)
 * - Real planetary position tests using JPL Horizons data
 *
 * Reference data sourced from NASA JPL Horizons System.
 * These are AUTHORITATIVE values - do not modify!
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { angularSeparation } from './angular-separation.js';
import {
  calculateAspects,
  detectAspect,
  filterAspectsByBody,
  filterAspectsByType,
  findAllAspects,
  formatAspect,
  getAspectSummary,
  isOutOfSign,
} from './aspect-detection.js';
import type { AspectBody } from './types.js';
import { AspectType } from './types.js';

// =============================================================================
// JPL HORIZONS REFERENCE DATA - J2000.0 (2000-Jan-01 12:00 TT)
// Source: NASA JPL Horizons System (https://ssd.jpl.nasa.gov/horizons/)
// Retrieved from existing Celestine ephemeris test files
// These values are AUTHORITATIVE - do not modify!
// =============================================================================
const JPL_J2000_POSITIONS: Record<string, { longitude: number; speed?: number }> = {
  Sun: { longitude: 280.3689092 },
  Moon: { longitude: 223.323786, speed: 12.021183 },
  Mercury: { longitude: 271.8892699, speed: 1.556254 },
  Venus: { longitude: 241.5657794, speed: 1.24 },
  Mars: { longitude: 327.9632921, speed: 0.52 },
  Jupiter: { longitude: 25.2530685, speed: 0.083 },
  Saturn: { longitude: 40.3956366, speed: 0.033 },
  Uranus: { longitude: 314.809168, speed: 0.012 },
  Neptune: { longitude: 303.1930003, speed: 0.006 },
  Pluto: { longitude: 251.4547644, speed: 0.004 },
} as const;

/**
 * Helper to create AspectBody array from JPL data
 */
function createBodiesFromJPL(names: string[]): AspectBody[] {
  return names.map((name) => {
    const data = JPL_J2000_POSITIONS[name];
    return {
      name,
      longitude: data.longitude,
      longitudeSpeed: data.speed,
    };
  });
}

// =============================================================================
// KNOWN ASPECTS AT J2000.0
// Calculated from JPL positions and verified manually
// Angular separations calculated using angularSeparation function
// =============================================================================

describe('aspects/aspect-detection', () => {
  describe('isOutOfSign', () => {
    describe('In-sign aspects', () => {
      it('should return false for conjunction in same sign', () => {
        // Both positions in same sign (Capricorn: 270-300)
        assert.equal(isOutOfSign(275, 280, AspectType.Conjunction), false);
      });

      it('should return false for trine between fire signs', () => {
        // Aries (0°) to Leo (120°) = fire to fire
        assert.equal(isOutOfSign(15, 135, AspectType.Trine), false);
      });

      it('should return false for square between cardinal signs', () => {
        // Aries (0°) to Cancer (90°)
        assert.equal(isOutOfSign(15, 105, AspectType.Square), false);
      });

      it('should return false for opposition between opposite signs', () => {
        // Aries (0°) to Libra (180°)
        assert.equal(isOutOfSign(15, 195, AspectType.Opposition), false);
      });
    });

    describe('Out-of-sign aspects', () => {
      it('should return true for conjunction across sign boundary', () => {
        // 29° Pisces (359°) to 1° Aries (1°) - different signs
        assert.equal(isOutOfSign(359, 1, AspectType.Conjunction), true);
      });

      it('should return true for trine between non-trine signs', () => {
        // 28° Aries to 2° Virgo (not traditional trine signs)
        assert.equal(isOutOfSign(28, 152, AspectType.Trine), true);
      });

      it('should return true for square between non-square signs', () => {
        // 28° Aries to 1° Leo (92° separation but Aries-Leo not square signs)
        assert.equal(isOutOfSign(28, 121, AspectType.Square), true);
      });
    });
  });

  describe('detectAspect', () => {
    describe('Basic aspect detection', () => {
      it('should detect exact conjunction', () => {
        const body1: AspectBody = { name: 'Sun', longitude: 100 };
        const body2: AspectBody = { name: 'Moon', longitude: 100 };

        const aspect = detectAspect(body1, body2);

        assert.ok(aspect);
        assert.equal(aspect.type, AspectType.Conjunction);
        assert.equal(aspect.deviation, 0);
        assert.equal(aspect.strength, 100);
      });

      it('should detect exact square', () => {
        const body1: AspectBody = { name: 'Sun', longitude: 0 };
        const body2: AspectBody = { name: 'Mars', longitude: 90 };

        const aspect = detectAspect(body1, body2);

        assert.ok(aspect);
        assert.equal(aspect.type, AspectType.Square);
        assert.equal(aspect.deviation, 0);
        assert.equal(aspect.strength, 100);
      });

      it('should detect exact trine', () => {
        const body1: AspectBody = { name: 'Sun', longitude: 0 };
        const body2: AspectBody = { name: 'Jupiter', longitude: 120 };

        const aspect = detectAspect(body1, body2);

        assert.ok(aspect);
        assert.equal(aspect.type, AspectType.Trine);
        assert.equal(aspect.deviation, 0);
      });

      it('should detect aspect within orb', () => {
        const body1: AspectBody = { name: 'Sun', longitude: 0 };
        const body2: AspectBody = { name: 'Mars', longitude: 87 }; // 3° from exact square

        const aspect = detectAspect(body1, body2);

        assert.ok(aspect);
        assert.equal(aspect.type, AspectType.Square);
        assert.equal(aspect.deviation, 3);
        assert.ok(aspect.strength < 100 && aspect.strength > 50);
      });

      it('should return null when no aspect within orb', () => {
        const body1: AspectBody = { name: 'Sun', longitude: 0 };
        const body2: AspectBody = { name: 'Mars', longitude: 45 }; // Semi-square (not in default)

        const aspect = detectAspect(body1, body2);

        assert.equal(aspect, null);
      });
    });

    describe('Out-of-sign detection', () => {
      it('should mark out-of-sign aspect correctly', () => {
        // 29° Aries to 1° Virgo = 122° (trine by degree, but Aries-Virgo not trine signs)
        const body1: AspectBody = { name: 'Mars', longitude: 29 };
        const body2: AspectBody = { name: 'Jupiter', longitude: 151 };

        const aspect = detectAspect(body1, body2);

        assert.ok(aspect);
        assert.equal(aspect.type, AspectType.Trine);
        assert.equal(aspect.isOutOfSign, true);
      });

      it('should mark in-sign aspect correctly', () => {
        // 15° Aries to 15° Leo = exact trine, in-sign
        const body1: AspectBody = { name: 'Mars', longitude: 15 };
        const body2: AspectBody = { name: 'Jupiter', longitude: 135 };

        const aspect = detectAspect(body1, body2);

        assert.ok(aspect);
        assert.equal(aspect.type, AspectType.Trine);
        assert.equal(aspect.isOutOfSign, false);
      });
    });

    describe('Applying/separating', () => {
      it('should detect applying aspect when faster planet approaches', () => {
        // Moon at 5° (Aries) moving at 13°/day
        // Saturn at 92° (Cancer) moving at 0.03°/day
        // Separation: 87° - approaching 90° square
        // Tomorrow: Moon at 18°, Saturn at 92.03°, Sep: 74° (further from 90°)
        // Wait - that's separating! Let me recalculate...

        // For APPLYING: deviation should DECREASE tomorrow
        // Moon at 5°, Saturn at 95° = 90° separation (exact square)
        // Tomorrow: Moon at 18°, Saturn at 95.03° = 77° separation
        // Deviation: today 0°, tomorrow 13° - that's SEPARATING

        // For APPLYING square, we need Moon BEHIND Saturn by 90°
        // Moon at 355° (Pisces), Saturn at 85° (Gemini)
        // Separation = min(|355-85|, 360-|355-85|) = min(270, 90) = 90°
        // Tomorrow: Moon at 8°, Saturn at 85.03°
        // Separation = 77° - deviation from 90 is 13° (increased) - SEPARATING

        // Let's try: Moon at 355°, Saturn at 88°
        // Separation = min(|355-88|, 360-267) = min(267, 93) = 93° (3° from square)
        // Tomorrow: Moon at 8°, Saturn at 88.03°
        // Separation = 80° (10° from square) - SEPARATING

        // For APPLYING: faster body must be moving toward the aspect point
        // Moon at 175° moving +13°/day, Saturn at 85° moving +0.03°/day
        // Today separation: 90° (exact square)
        // Tomorrow: Moon 188°, Saturn 85.03°, Sep: 102.97° (13° from square)
        // That's SEPARATING because the Moon passed the exact square point

        // Moon at 173° approaching Saturn at 85°
        // Today separation: 88° (2° shy of 90° square)
        // Tomorrow: Moon 186°, Saturn 85.03°, Sep: 100.97° (11° past square)
        // The Moon crossed through the square - this is tricky

        // Let's use a cleaner example: slow planets
        // Sun at 0° moving +1°/day, Mars at 87° moving +0.5°/day
        // Separation: 87° (3° from square)
        // Tomorrow: Sun 1°, Mars 87.5°, Sep: 86.5° (3.5° from square)
        // Deviation INCREASED - that's SEPARATING

        // Try: Sun at 0° moving +1°/day, Mars at 93° moving +0.5°/day
        // Separation: 93° (3° past square)
        // Tomorrow: Sun 1°, Mars 93.5°, Sep: 92.5° (2.5° past square)
        // Deviation DECREASED from 3° to 2.5° - APPLYING!
        const sun: AspectBody = { name: 'Sun', longitude: 0, longitudeSpeed: 1 };
        const mars: AspectBody = { name: 'Mars', longitude: 93, longitudeSpeed: 0.5 };

        const aspect = detectAspect(sun, mars);

        assert.ok(aspect);
        assert.equal(aspect.type, AspectType.Square);
        assert.equal(aspect.isApplying, true);
      });

      it('should detect separating aspect when faster planet moves away', () => {
        // Sun at 0° moving +1°/day, Mars at 87° moving +0.5°/day
        // Separation: 87° (3° shy of 90° square)
        // Tomorrow: Sun 1°, Mars 87.5°, Sep: 86.5°
        // Deviation from 90: today 3°, tomorrow 3.5° - INCREASED = SEPARATING
        const sun: AspectBody = { name: 'Sun', longitude: 0, longitudeSpeed: 1 };
        const mars: AspectBody = { name: 'Mars', longitude: 87, longitudeSpeed: 0.5 };

        const aspect = detectAspect(sun, mars);

        assert.ok(aspect);
        assert.equal(aspect.type, AspectType.Square);
        assert.equal(aspect.isApplying, false);
      });

      it('should return null for isApplying when no speed data', () => {
        const body1: AspectBody = { name: 'Sun', longitude: 0 };
        const body2: AspectBody = { name: 'Mars', longitude: 90 };

        const aspect = detectAspect(body1, body2);

        assert.ok(aspect);
        assert.equal(aspect.isApplying, null);
      });
    });

    describe('Configuration options', () => {
      it('should respect custom orbs', () => {
        const body1: AspectBody = { name: 'Sun', longitude: 0 };
        const body2: AspectBody = { name: 'Mars', longitude: 82 }; // 8° from square

        // Default orb (7°) should not detect
        const noMatch = detectAspect(body1, body2);
        assert.equal(noMatch, null);

        // Custom wider orb should detect
        const match = detectAspect(body1, body2, { orbs: { [AspectType.Square]: 10 } });
        assert.ok(match);
        assert.equal(match.type, AspectType.Square);
      });

      it('should filter by minimum strength', () => {
        const body1: AspectBody = { name: 'Sun', longitude: 0 };
        const body2: AspectBody = { name: 'Mars', longitude: 84 }; // 6° from square, ~14% strength

        // No minimum - should detect
        const weak = detectAspect(body1, body2);
        assert.ok(weak);
        assert.ok(weak.strength < 20);

        // With minimum 50% - should not detect
        const filtered = detectAspect(body1, body2, { minimumStrength: 50 });
        assert.equal(filtered, null);
      });

      it('should filter out-of-sign when configured', () => {
        // Out-of-sign trine
        const body1: AspectBody = { name: 'Mars', longitude: 29 };
        const body2: AspectBody = { name: 'Jupiter', longitude: 151 };

        // Default - should detect
        const withOOS = detectAspect(body1, body2);
        assert.ok(withOOS);
        assert.equal(withOOS.isOutOfSign, true);

        // Filter out-of-sign - should not detect
        const withoutOOS = detectAspect(body1, body2, { includeOutOfSign: false });
        assert.equal(withoutOOS, null);
      });
    });
  });

  describe('findAllAspects', () => {
    it('should find all aspects between bodies', () => {
      const bodies: AspectBody[] = [
        { name: 'Sun', longitude: 0 },
        { name: 'Moon', longitude: 60 }, // Sextile to Sun
        { name: 'Mars', longitude: 120 }, // Trine to Sun, Sextile to Moon
      ];

      const aspects = findAllAspects(bodies);

      assert.equal(aspects.length, 3);
      assert.ok(
        aspects.some(
          (a) => a.body1 === 'Sun' && a.body2 === 'Moon' && a.type === AspectType.Sextile,
        ),
      );
      assert.ok(
        aspects.some((a) => a.body1 === 'Sun' && a.body2 === 'Mars' && a.type === AspectType.Trine),
      );
      assert.ok(
        aspects.some(
          (a) => a.body1 === 'Moon' && a.body2 === 'Mars' && a.type === AspectType.Sextile,
        ),
      );
    });

    it('should not include self-aspects', () => {
      const bodies: AspectBody[] = [{ name: 'Sun', longitude: 0 }];

      const aspects = findAllAspects(bodies);

      assert.equal(aspects.length, 0);
    });

    it('should sort by strength (strongest first)', () => {
      const bodies: AspectBody[] = [
        { name: 'Sun', longitude: 0 },
        { name: 'Moon', longitude: 62 }, // Sextile with 2° orb
        { name: 'Mars', longitude: 120 }, // Exact trine
      ];

      const aspects = findAllAspects(bodies);

      // Exact trine should be first (100% strength)
      assert.ok(aspects[0].strength >= aspects[1].strength);
    });
  });

  describe('Real J2000.0 planetary aspects (JPL Horizons data)', () => {
    /**
     * These tests verify aspect detection using authoritative JPL Horizons positions.
     * The positions come from the Celestine ephemeris test files.
     */

    describe('Sun aspects at J2000.0', () => {
      it('should detect Sun-Mercury conjunction only with wider orb (8.48° separation)', () => {
        const bodies = createBodiesFromJPL(['Sun', 'Mercury']);
        const separation = angularSeparation(
          JPL_J2000_POSITIONS.Sun.longitude,
          JPL_J2000_POSITIONS.Mercury.longitude,
        );

        // Verify the actual separation from JPL data
        assert.ok(Math.abs(separation - 8.48) < 0.01, `Expected ~8.48°, got ${separation}°`);

        // Default conjunction orb is 8°, so this is JUST outside
        const defaultAspects = findAllAspects(bodies);
        assert.equal(defaultAspects.length, 0, 'Should not detect with default 8° orb');

        // With 9° orb, should detect the conjunction
        const wideAspects = findAllAspects(bodies, { orbs: { [AspectType.Conjunction]: 9 } });
        assert.equal(wideAspects.length, 1);
        assert.equal(wideAspects[0].type, AspectType.Conjunction);
        assert.ok(Math.abs(wideAspects[0].deviation - 8.48) < 0.01);
      });

      it('should detect Sun-Venus trine (38.80° from exact - NO ASPECT)', () => {
        // Sun at 280.37°, Venus at 241.57° = 38.80° separation
        // This is NOT a trine (120°) - no aspect expected with default orbs
        const bodies = createBodiesFromJPL(['Sun', 'Venus']);
        const separation = angularSeparation(
          JPL_J2000_POSITIONS.Sun.longitude,
          JPL_J2000_POSITIONS.Venus.longitude,
        );

        assert.ok(Math.abs(separation - 38.8) < 0.1, `Expected ~38.8°, got ${separation}°`);

        const aspects = findAllAspects(bodies);
        assert.equal(aspects.length, 0); // No major aspect
      });

      it('should detect Sun-Moon sextile (57.05° separation)', () => {
        // Sun at 280.37°, Moon at 223.32° = 57.05° separation (close to 60° sextile)
        const bodies = createBodiesFromJPL(['Sun', 'Moon']);
        const separation = angularSeparation(
          JPL_J2000_POSITIONS.Sun.longitude,
          JPL_J2000_POSITIONS.Moon.longitude,
        );

        assert.ok(Math.abs(separation - 57) < 1, `Expected ~57°, got ${separation}°`);

        const aspects = findAllAspects(bodies);
        assert.equal(aspects.length, 1);
        assert.equal(aspects[0].type, AspectType.Sextile);
        assert.ok(aspects[0].deviation < 4); // Within sextile orb
      });
    });

    describe('Jupiter-Saturn conjunction at J2000.0', () => {
      it('should detect Jupiter-Saturn conjunction (15.14° separation - NO ASPECT)', () => {
        // Jupiter at 25.25°, Saturn at 40.40° = 15.14° separation
        // This is too wide for conjunction orb (8°)
        const bodies = createBodiesFromJPL(['Jupiter', 'Saturn']);
        const separation = angularSeparation(
          JPL_J2000_POSITIONS.Jupiter.longitude,
          JPL_J2000_POSITIONS.Saturn.longitude,
        );

        assert.ok(Math.abs(separation - 15.14) < 0.1, `Expected ~15.14°, got ${separation}°`);

        // No aspect with default orbs
        const aspects = findAllAspects(bodies);
        assert.equal(aspects.length, 0);

        // But with wider orb, should detect conjunction
        const wideOrb = findAllAspects(bodies, { orbs: { [AspectType.Conjunction]: 16 } });
        assert.equal(wideOrb.length, 1);
        assert.equal(wideOrb[0].type, AspectType.Conjunction);
      });
    });

    describe('All major planets at J2000.0', () => {
      it('should find expected number of aspects', () => {
        const bodies = createBodiesFromJPL([
          'Sun',
          'Moon',
          'Mercury',
          'Venus',
          'Mars',
          'Jupiter',
          'Saturn',
          'Uranus',
          'Neptune',
          'Pluto',
        ]);

        const result = calculateAspects(bodies);

        // Should check all pairs: 10 choose 2 = 45 pairs
        assert.equal(result.pairsChecked, 45);

        // Should find some aspects (exact number depends on orbs)
        assert.ok(result.aspects.length > 0, 'Should find at least one aspect');

        // All aspects should be valid
        for (const aspect of result.aspects) {
          assert.ok(aspect.strength >= 0 && aspect.strength <= 100);
          assert.ok(aspect.deviation <= aspect.orb);
        }
      });
    });
  });

  describe('Utility functions', () => {
    describe('getAspectSummary', () => {
      it('should count aspects by type', () => {
        const bodies: AspectBody[] = [
          { name: 'Sun', longitude: 0 },
          { name: 'Moon', longitude: 60 },
          { name: 'Mars', longitude: 120 },
          { name: 'Jupiter', longitude: 180 },
        ];

        const aspects = findAllAspects(bodies);
        const summary = getAspectSummary(aspects);

        // Should have entries for all aspect types
        assert.ok(AspectType.Conjunction in summary);
        assert.ok(AspectType.Sextile in summary);
        assert.ok(AspectType.Trine in summary);
        assert.ok(AspectType.Opposition in summary);
      });
    });

    describe('filterAspectsByType', () => {
      it('should filter by single type', () => {
        const bodies: AspectBody[] = [
          { name: 'Sun', longitude: 0 },
          { name: 'Moon', longitude: 60 },
          { name: 'Mars', longitude: 120 },
        ];

        const aspects = findAllAspects(bodies);
        const trines = filterAspectsByType(aspects, AspectType.Trine);

        assert.ok(trines.every((a) => a.type === AspectType.Trine));
      });

      it('should filter by multiple types', () => {
        const bodies: AspectBody[] = [
          { name: 'Sun', longitude: 0 },
          { name: 'Moon', longitude: 60 },
          { name: 'Mars', longitude: 120 },
        ];

        const aspects = findAllAspects(bodies);
        const filtered = filterAspectsByType(aspects, [AspectType.Trine, AspectType.Sextile]);

        assert.ok(
          filtered.every((a) => a.type === AspectType.Trine || a.type === AspectType.Sextile),
        );
      });
    });

    describe('filterAspectsByBody', () => {
      it('should return aspects involving specific body', () => {
        const bodies: AspectBody[] = [
          { name: 'Sun', longitude: 0 },
          { name: 'Moon', longitude: 60 },
          { name: 'Mars', longitude: 120 },
        ];

        const aspects = findAllAspects(bodies);
        const sunAspects = filterAspectsByBody(aspects, 'Sun');

        assert.ok(sunAspects.every((a) => a.body1 === 'Sun' || a.body2 === 'Sun'));
        assert.equal(sunAspects.length, 2); // Sun-Moon sextile, Sun-Mars trine
      });
    });

    describe('formatAspect', () => {
      it('should format aspect with all details', () => {
        const bodies: AspectBody[] = [
          { name: 'Sun', longitude: 0, longitudeSpeed: 1 },
          { name: 'Mars', longitude: 120, longitudeSpeed: 0.5 },
        ];

        const aspects = findAllAspects(bodies);
        const formatted = formatAspect(aspects[0]);

        assert.ok(formatted.includes('Sun'));
        assert.ok(formatted.includes('Mars'));
        assert.ok(formatted.includes('△')); // Trine symbol
        assert.ok(formatted.includes('%'));
      });

      it('should include out-of-sign indicator', () => {
        const body1: AspectBody = { name: 'Mars', longitude: 29 };
        const body2: AspectBody = { name: 'Jupiter', longitude: 151 };

        const aspect = detectAspect(body1, body2)!;
        const formatted = formatAspect(aspect);

        assert.ok(formatted.includes('out-of-sign'));
      });
    });
  });
});
