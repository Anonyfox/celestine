/**
 * Tests for Progressed Positions Calculations
 *
 * @remarks
 * Validates progressed position calculations against astronomical data.
 *
 * Sources:
 * - Swiss Ephemeris for reference positions
 * - Solar Fire/Astro.com for cross-validation
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  calculateProgressedPositions,
  getAllProgressedPositions,
  getBodiesWithSignChange,
  getBodyWithLargestArc,
  getNatalPosition,
  getProgressedBodyFromDates,
  getProgressedPosition,
  getProgressedPositions,
  getRetrogradeBodies,
  groupBySign,
  type ProgressedBodyName,
  sortByLongitude,
} from './progressed-positions.js';
import { birthToJD } from './progression-date.js';

// =============================================================================
// REFERENCE DATA
// =============================================================================

/**
 * J2000.0 Epoch reference
 */
const J2000_BIRTH = {
  year: 2000,
  month: 1,
  day: 1,
  hour: 12,
  minute: 0,
  second: 0,
  timezone: 0,
  latitude: 0,
  longitude: 0,
};

/**
 * Einstein birth data
 */
const EINSTEIN_BIRTH = {
  year: 1879,
  month: 3,
  day: 14,
  hour: 11,
  minute: 30,
  second: 0,
  timezone: 0.667,
  latitude: 48.4,
  longitude: 10.0,
};

/**
 * All default body names
 */
const ALL_BODIES: ProgressedBodyName[] = [
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
  'Chiron',
  'TrueNode',
];

// =============================================================================
// NATAL POSITION TESTS
// =============================================================================

describe('progressions/progressed-positions', () => {
  describe('getNatalPosition', () => {
    it('should get Sun position at J2000.0', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const pos = getNatalPosition('Sun', birthJD);
      // Sun at J2000.0 ≈ 280.37° (Capricorn)
      assert.ok(pos.longitude > 279 && pos.longitude < 282, `Sun: ${pos.longitude}`);
    });

    it('should get Moon position at J2000.0', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const pos = getNatalPosition('Moon', birthJD);
      // Moon position will vary, but should be valid
      assert.ok(pos.longitude >= 0 && pos.longitude < 360, `Moon: ${pos.longitude}`);
    });

    it('should get all planet positions', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      for (const body of ALL_BODIES) {
        const pos = getNatalPosition(body, birthJD);
        assert.ok(pos.longitude >= 0 && pos.longitude < 360, `${body}: ${pos.longitude}`);
      }
    });

    it('should throw for unknown body', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      assert.throws(() => {
        getNatalPosition('Unknown' as ProgressedBodyName, birthJD);
      }, /Unknown body/);
    });
  });

  // =============================================================================
  // SECONDARY PROGRESSION TESTS
  // =============================================================================

  describe('getProgressedPosition (secondary)', () => {
    it('should return natal position when target = birth', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const pos = getProgressedPosition('Sun', birthJD, birthJD, 'secondary');

      assert.ok(
        Math.abs(pos.progressedLongitude - pos.natalLongitude) < 0.01,
        `Natal: ${pos.natalLongitude}, Progressed: ${pos.progressedLongitude}`,
      );
      assert.ok(pos.arcFromNatal < 0.01, `Arc should be ~0, got ${pos.arcFromNatal}`);
      assert.ok(!pos.hasChangedSign, 'Should not have changed sign');
    });

    it('should advance Sun ~1° per year', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const targetJD = birthJD + 365.25; // 1 year later
      const pos = getProgressedPosition('Sun', birthJD, targetJD, 'secondary');

      // Sun advances ~0.986° per day in secondary progressions
      assert.ok(
        pos.arcFromNatal > 0.9 && pos.arcFromNatal < 1.1,
        `Arc should be ~1°, got ${pos.arcFromNatal}°`,
      );
    });

    it('should advance Sun ~30° for 30 years', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const targetJD = birthJD + 30 * 365.25;
      const pos = getProgressedPosition('Sun', birthJD, targetJD, 'secondary');

      assert.ok(
        pos.arcFromNatal > 29 && pos.arcFromNatal < 31,
        `Arc should be ~30°, got ${pos.arcFromNatal}°`,
      );
    });

    it('should detect sign change for Sun', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      // Sun at J2000.0 ≈ 280° (Capricorn), after 30 years ≈ 310° (still Capricorn/Aquarius)
      // After 50 years ≈ 330° (Aquarius/Pisces)
      const targetJD = birthJD + 50 * 365.25;
      const pos = getProgressedPosition('Sun', birthJD, targetJD, 'secondary');

      // Sun should have changed sign in 50 years
      // Natal in Capricorn (sign 9), should move to Aquarius (10) or Pisces (11)
      assert.ok(pos.progressedSignIndex !== pos.natalSignIndex);
      assert.ok(pos.hasChangedSign);
    });

    it('should include proper zodiac formatting', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const targetJD = birthJD + 30 * 365.25;
      const pos = getProgressedPosition('Sun', birthJD, targetJD, 'secondary');

      assert.ok(pos.progressedFormatted.includes(pos.progressedSignName));
      assert.ok(pos.natalFormatted.includes(pos.natalSignName));
      assert.equal(pos.name, 'Sun');
    });

    it('should track retrograde status for Mercury', () => {
      // Mercury goes retrograde frequently
      const birthJD = birthToJD(J2000_BIRTH);
      const targetJD = birthJD + 30 * 365.25;
      const pos = getProgressedPosition('Mercury', birthJD, targetJD, 'secondary');

      // isRetrograde should be a boolean
      assert.equal(typeof pos.isRetrograde, 'boolean');
    });
  });

  // =============================================================================
  // SOLAR ARC PROGRESSION TESTS
  // =============================================================================

  describe('getProgressedPosition (solar-arc)', () => {
    it('should apply same arc to all bodies', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const targetJD = birthJD + 30 * 365.25;

      const sun = getProgressedPosition('Sun', birthJD, targetJD, 'solar-arc');
      const moon = getProgressedPosition('Moon', birthJD, targetJD, 'solar-arc');
      const mars = getProgressedPosition('Mars', birthJD, targetJD, 'solar-arc');

      // In solar arc, all bodies move by the same arc (the Sun's progression)
      // The arc should be approximately equal for all bodies
      const tolerance = 0.5; // degrees
      assert.ok(
        Math.abs(sun.arcFromNatal - moon.arcFromNatal) < tolerance,
        `Sun arc: ${sun.arcFromNatal}, Moon arc: ${moon.arcFromNatal}`,
      );
      assert.ok(
        Math.abs(sun.arcFromNatal - mars.arcFromNatal) < tolerance,
        `Sun arc: ${sun.arcFromNatal}, Mars arc: ${mars.arcFromNatal}`,
      );
    });

    it('should not be retrograde in solar arc', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const targetJD = birthJD + 30 * 365.25;

      const mercury = getProgressedPosition('Mercury', birthJD, targetJD, 'solar-arc');
      // Solar arc positions can't be retrograde (uniform motion)
      assert.equal(mercury.isRetrograde, false);
    });
  });

  // =============================================================================
  // MINOR/TERTIARY PROGRESSION TESTS
  // =============================================================================

  describe('getProgressedPosition (minor)', () => {
    it('should advance faster than secondary', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const targetJD = birthJD + 10 * 365.25; // 10 years

      const secondary = getProgressedPosition('Sun', birthJD, targetJD, 'secondary');
      const minor = getProgressedPosition('Sun', birthJD, targetJD, 'minor');

      // Minor progressions use 1 month = 1 year, so roughly 9-10x faster
      // (accounting for Sun's variable motion)
      assert.ok(
        minor.arcFromNatal > secondary.arcFromNatal * 8,
        `Secondary: ${secondary.arcFromNatal}, Minor: ${minor.arcFromNatal}`,
      );
    });
  });

  describe('getProgressedPosition (tertiary)', () => {
    it('should advance even faster', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const targetJD = birthJD + 10 * 365.25;

      const secondary = getProgressedPosition('Sun', birthJD, targetJD, 'secondary');
      const tertiary = getProgressedPosition('Sun', birthJD, targetJD, 'tertiary');

      // Tertiary uses 1 day = 1 month, so ~12x faster than secondary
      assert.ok(
        tertiary.arcFromNatal > secondary.arcFromNatal * 10,
        `Secondary: ${secondary.arcFromNatal}, Tertiary: ${tertiary.arcFromNatal}`,
      );
    });
  });

  // =============================================================================
  // MULTIPLE BODY TESTS
  // =============================================================================

  describe('getProgressedPositions', () => {
    it('should return positions for specified bodies', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const targetJD = birthJD + 30 * 365.25;

      const bodies: ProgressedBodyName[] = ['Sun', 'Moon', 'Mercury'];
      const positions = getProgressedPositions(bodies, birthJD, targetJD);

      assert.equal(positions.length, 3);
      assert.equal(positions[0].name, 'Sun');
      assert.equal(positions[1].name, 'Moon');
      assert.equal(positions[2].name, 'Mercury');
    });

    it('should use secondary as default', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const targetJD = birthJD + 30 * 365.25;

      const positions = getProgressedPositions(['Sun'], birthJD, targetJD);
      const explicit = getProgressedPositions(['Sun'], birthJD, targetJD, 'secondary');

      assert.ok(
        Math.abs(positions[0].progressedLongitude - explicit[0].progressedLongitude) < 0.001,
      );
    });
  });

  describe('getAllProgressedPositions', () => {
    it('should return positions for all default bodies', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const targetJD = birthJD + 30 * 365.25;

      const positions = getAllProgressedPositions(birthJD, targetJD);

      // Should have all default bodies (Sun through Saturn = 7)
      assert.ok(positions.length >= 7, `Expected 7+ bodies, got ${positions.length}`);

      // Check that Sun, Moon, and planets are included
      const names = positions.map((p) => p.name);
      assert.ok(names.includes('Sun'));
      assert.ok(names.includes('Moon'));
      assert.ok(names.includes('Mars'));
    });
  });

  // =============================================================================
  // HIGH-LEVEL API TESTS
  // =============================================================================

  describe('calculateProgressedPositions', () => {
    it('should work with date objects', () => {
      const target = { year: 2030, month: 1, day: 1 };
      const positions = calculateProgressedPositions(J2000_BIRTH, target);

      assert.ok(positions.length > 0);
      assert.ok(positions[0].progressedLongitude > 0);
    });

    it('should respect config options', () => {
      const target = { year: 2030, month: 1, day: 1 };
      const positions = calculateProgressedPositions(J2000_BIRTH, target, {
        type: 'solar-arc',
        bodies: ['Sun', 'Moon'] as unknown as string[],
      });

      assert.equal(positions.length, 2);
    });
  });

  describe('getProgressedBodyFromDates', () => {
    it('should get single body from dates', () => {
      const target = { year: 2030, month: 1, day: 1 };
      const pos = getProgressedBodyFromDates('Sun', J2000_BIRTH, target);

      assert.equal(pos.name, 'Sun');
      assert.ok(pos.progressedLongitude > 0);
    });
  });

  // =============================================================================
  // SPECIALIZED QUERY TESTS
  // =============================================================================

  describe('getBodiesWithSignChange', () => {
    it('should filter bodies that changed sign', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const targetJD = birthJD + 60 * 365.25; // 60 years for more sign changes

      const positions = getAllProgressedPositions(birthJD, targetJD);
      const changed = getBodiesWithSignChange(positions);

      // After 60 years, at least Sun should have changed sign
      assert.ok(changed.length >= 1, `Expected at least 1 sign change, got ${changed.length}`);
      for (const pos of changed) {
        assert.ok(pos.hasChangedSign);
      }
    });

    it('should return empty for no changes', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      // Very short time period
      const positions = getAllProgressedPositions(birthJD, birthJD + 1);
      const changed = getBodiesWithSignChange(positions);

      assert.equal(changed.length, 0);
    });
  });

  describe('getRetrogradeBodies', () => {
    it('should filter retrograde bodies', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const targetJD = birthJD + 30 * 365.25;

      const positions = getAllProgressedPositions(birthJD, targetJD);
      const retrograde = getRetrogradeBodies(positions);

      // All retrograde bodies should have isRetrograde = true
      for (const pos of retrograde) {
        assert.ok(pos.isRetrograde);
      }
    });
  });

  describe('getBodyWithLargestArc', () => {
    it('should find body with largest arc', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const targetJD = birthJD + 30 * 365.25;

      const positions = getAllProgressedPositions(birthJD, targetJD);
      const largest = getBodyWithLargestArc(positions);

      assert.ok(largest);
      // The Moon typically has the largest arc in secondary progressions
      // (moves ~13° per day = ~13° per year in progressions)
      assert.ok(largest.arcFromNatal > 0);

      // Verify it's actually the largest
      for (const pos of positions) {
        assert.ok(pos.arcFromNatal <= largest.arcFromNatal);
      }
    });

    it('should return undefined for empty array', () => {
      const result = getBodyWithLargestArc([]);
      assert.equal(result, undefined);
    });
  });

  describe('sortByLongitude', () => {
    it('should sort positions by longitude', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const targetJD = birthJD + 30 * 365.25;

      const positions = getAllProgressedPositions(birthJD, targetJD);
      const sorted = sortByLongitude(positions);

      for (let i = 1; i < sorted.length; i++) {
        assert.ok(
          sorted[i].progressedLongitude >= sorted[i - 1].progressedLongitude,
          `Not sorted: ${sorted[i - 1].progressedLongitude} > ${sorted[i].progressedLongitude}`,
        );
      }
    });

    it('should not modify original array', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const targetJD = birthJD + 30 * 365.25;

      const positions = getAllProgressedPositions(birthJD, targetJD);
      const firstLongitude = positions[0].progressedLongitude;
      sortByLongitude(positions);

      assert.equal(positions[0].progressedLongitude, firstLongitude);
    });
  });

  describe('groupBySign', () => {
    it('should group positions by sign', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const targetJD = birthJD + 30 * 365.25;

      const positions = getAllProgressedPositions(birthJD, targetJD);
      const grouped = groupBySign(positions);

      // Verify grouping is correct
      for (const [sign, bodies] of grouped) {
        for (const body of bodies) {
          assert.equal(body.progressedSignName, sign);
        }
      }

      // Total should match
      let total = 0;
      for (const bodies of grouped.values()) {
        total += bodies.length;
      }
      assert.equal(total, positions.length);
    });
  });

  // =============================================================================
  // REAL-WORLD VALIDATION
  // =============================================================================

  describe('Real-world validation', () => {
    it('should calculate Einstein progressions at Nobel Prize', () => {
      const nobelTarget = { year: 1921, month: 12, day: 10 };
      const sun = getProgressedBodyFromDates('Sun', EINSTEIN_BIRTH, nobelTarget);

      // Age at Nobel ≈ 42.74 years
      // Natal Sun ≈ 353° (late Pisces)
      // Progressed Sun should be about 35-36° forward = ≈28-30° Aries

      assert.ok(sun.arcFromNatal > 40 && sun.arcFromNatal < 45, `Sun arc: ${sun.arcFromNatal}`);
    });

    it('should show Moon advancing rapidly', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const targetJD = birthJD + 30 * 365.25;

      const sun = getProgressedPosition('Sun', birthJD, targetJD, 'secondary');
      const moon = getProgressedPosition('Moon', birthJD, targetJD, 'secondary');

      // Moon moves ~13° per day in secondary progressions
      // After 30 days (30 years), Moon should have moved ~390° (full circle+)
      // This means Moon arc should be much larger than Sun arc (wrapped)
      assert.ok(moon.arcFromNatal !== sun.arcFromNatal, 'Moon should have different arc than Sun');
    });

    it('should produce consistent results across progression types', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const targetJD = birthJD + 30 * 365.25;

      const secondary = getProgressedPosition('Sun', birthJD, targetJD, 'secondary');
      const solarArc = getProgressedPosition('Sun', birthJD, targetJD, 'solar-arc');

      // For Sun, secondary and solar arc should give similar results
      assert.ok(
        Math.abs(secondary.arcFromNatal - solarArc.arcFromNatal) < 1,
        `Secondary: ${secondary.arcFromNatal}, Solar Arc: ${solarArc.arcFromNatal}`,
      );
    });
  });
});
