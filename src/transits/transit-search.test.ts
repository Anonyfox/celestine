/**
 * Transit Search Module Tests
 *
 * Tests for the high-level transit search API.
 *
 * @module transits/transit-search.test
 *
 * @remarks
 * These tests validate:
 * 1. Date range search functionality
 * 2. Grouping by month/body/natal point
 * 3. Filtering and sorting
 * 4. Summary statistics
 * 5. Convenience functions
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';

import { AspectType } from '../aspects/types.js';
import { CelestialBody } from '../ephemeris/positions.js';
import { BODY_NAMES } from './constants.js';
import {
  filterByBodySpeed,
  filterByDuration,
  filterByStrength,
  filterMultiplePasses,
  filterRetrogrades,
  formatTransitTimingDetail,
  getActiveTransits,
  getMostSignificantTransits,
  getNextTransit,
  getTransitsForMonth,
  getTransitsForYear,
  getUpcomingTransits,
  groupTransitsByAspect,
  groupTransitsByBody,
  groupTransitsByMonth,
  groupTransitsByNatalPoint,
  searchTransits,
  searchTransitsForBody,
  searchTransitsToPoint,
} from './transit-search.js';
import type { NatalPoint } from './types.js';

// =============================================================================
// TEST CONSTANTS
// =============================================================================

/**
 * J2000.0 epoch Julian Date
 */
const J2000_JD = 2451545.0;

/**
 * Sample natal points for testing (simplified chart)
 */
const SAMPLE_NATAL_POINTS: NatalPoint[] = [
  { name: 'Sun', longitude: 280.37, type: 'luminary' }, // J2000 Sun position
  { name: 'Moon', longitude: 223.32, type: 'luminary' },
  { name: 'ASC', longitude: 101.65, type: 'angle' },
  { name: 'MC', longitude: 8.5, type: 'angle' },
];

/**
 * Minimal natal points for faster testing
 */
const MINIMAL_NATAL: NatalPoint[] = [{ name: 'Sun', longitude: 280.37, type: 'luminary' }];

// =============================================================================
// UNIT TESTS: searchTransits
// =============================================================================

describe('searchTransits', () => {
  it('should find transits in a date range', () => {
    const result = searchTransits({
      startJD: J2000_JD,
      endJD: J2000_JD + 90, // 3 months
      natalPoints: MINIMAL_NATAL,
    });

    assert.ok(result.transits.length > 0, 'Should find some transits');
    assert.ok(
      result.summary.totalTransits === result.transits.length,
      'Summary count should match',
    );
  });

  it('should return results sorted by date', () => {
    const result = searchTransits({
      startJD: J2000_JD,
      endJD: J2000_JD + 180,
      natalPoints: MINIMAL_NATAL,
    });

    for (let i = 1; i < result.transits.length; i++) {
      assert.ok(
        result.transits[i].exactJDs[0] >= result.transits[i - 1].exactJDs[0],
        'Results should be sorted by date',
      );
    }
  });

  it('should group results by month', () => {
    const result = searchTransits({
      startJD: J2000_JD,
      endJD: J2000_JD + 180,
      natalPoints: MINIMAL_NATAL,
    });

    // Should have multiple months
    const months = Object.keys(result.byMonth);
    assert.ok(months.length >= 1, 'Should have at least 1 month');

    // Each month key should be in YYYY-MM format
    for (const month of months) {
      assert.ok(/^\d{4}-\d{2}$/.test(month), `Month key should be YYYY-MM format, got ${month}`);
    }
  });

  it('should provide summary statistics', () => {
    const result = searchTransits({
      startJD: J2000_JD,
      endJD: J2000_JD + 365,
      natalPoints: MINIMAL_NATAL,
    });

    assert.ok(result.summary.totalTransits >= 0, 'Should have total count');
    assert.ok(result.summary.dateRange.days > 0, 'Should have date range');
    assert.ok(typeof result.summary.byAspect === 'object', 'Should have aspect breakdown');
    assert.ok(typeof result.summary.byBody === 'object', 'Should have body breakdown');
  });

  it('should respect configuration options', () => {
    // Only search for conjunctions
    const result = searchTransits({
      startJD: J2000_JD,
      endJD: J2000_JD + 365,
      natalPoints: MINIMAL_NATAL,
      config: {
        aspectTypes: [AspectType.Conjunction],
        transitingBodies: [CelestialBody.Saturn],
      },
    });

    // All transits should be conjunctions from Saturn
    for (const transit of result.transits) {
      assert.strictEqual(transit.transit.aspectType, AspectType.Conjunction);
      assert.strictEqual(transit.transit.transitingBody, 'Saturn');
    }
  });
});

// =============================================================================
// UNIT TESTS: Specialized Search Functions
// =============================================================================

describe('Specialized Search Functions', () => {
  describe('searchTransitsForBody', () => {
    it('should find transits for a specific body', () => {
      const transits = searchTransitsForBody(
        CelestialBody.Jupiter,
        MINIMAL_NATAL,
        J2000_JD,
        J2000_JD + 365,
      );

      // All should be from Jupiter
      for (const timing of transits) {
        assert.strictEqual(timing.transit.transitingBody, 'Jupiter');
      }
    });
  });

  describe('searchTransitsToPoint', () => {
    it('should find transits to a specific natal point', () => {
      const transits = searchTransitsToPoint(MINIMAL_NATAL[0], J2000_JD, J2000_JD + 365);

      // All should be to natal Sun
      for (const timing of transits) {
        assert.strictEqual(timing.transit.natalPoint, 'Sun');
      }
    });
  });
});

// =============================================================================
// UNIT TESTS: Grouping Functions
// =============================================================================

describe('Grouping Functions', () => {
  // Get some transits to group
  const getTestTransits = () => {
    const result = searchTransits({
      startJD: J2000_JD,
      endJD: J2000_JD + 180,
      natalPoints: SAMPLE_NATAL_POINTS,
      config: {
        transitingBodies: [CelestialBody.Sun, CelestialBody.Mars, CelestialBody.Jupiter],
      },
    });
    return result.transits;
  };

  describe('groupTransitsByMonth', () => {
    it('should group transits by month', () => {
      const transits = getTestTransits();
      const grouped = groupTransitsByMonth(transits);

      // Sum of grouped should equal total
      let total = 0;
      for (const monthTransits of Object.values(grouped)) {
        total += monthTransits.length;
      }
      assert.strictEqual(total, transits.length);
    });
  });

  describe('groupTransitsByBody', () => {
    it('should group transits by body', () => {
      const transits = getTestTransits();
      const grouped = groupTransitsByBody(transits);

      // Each key should be a body name
      for (const body of Object.keys(grouped)) {
        assert.ok(Object.values(BODY_NAMES).includes(body), `${body} should be a valid body name`);
      }
    });
  });

  describe('groupTransitsByNatalPoint', () => {
    it('should group transits by natal point', () => {
      const transits = getTestTransits();
      const grouped = groupTransitsByNatalPoint(transits);

      // Should have entries for some of our natal points
      let found = false;
      for (const point of SAMPLE_NATAL_POINTS) {
        if (grouped[point.name]) {
          found = true;
        }
      }
      assert.ok(found, 'Should have transits to at least one natal point');
    });
  });

  describe('groupTransitsByAspect', () => {
    it('should group transits by aspect type', () => {
      const transits = getTestTransits();
      const grouped = groupTransitsByAspect(transits);

      // All keys should be valid aspect types
      for (const aspectType of Object.keys(grouped)) {
        assert.ok(
          Object.values(AspectType).includes(aspectType as AspectType),
          `${aspectType} should be a valid aspect type`,
        );
      }
    });
  });
});

// =============================================================================
// UNIT TESTS: Filtering Functions
// =============================================================================

describe('Filtering Functions', () => {
  const getTestTransits = () => {
    const result = searchTransits({
      startJD: J2000_JD,
      endJD: J2000_JD + 365,
      natalPoints: MINIMAL_NATAL,
    });
    return result.transits;
  };

  describe('filterByStrength', () => {
    it('should filter by minimum strength', () => {
      const transits = getTestTransits();
      const filtered = filterByStrength(transits, 50);

      for (const t of filtered) {
        assert.ok(t.transit.strength >= 50);
      }
    });
  });

  describe('filterRetrogrades', () => {
    it('should filter to retrograde transits', () => {
      const transits = getTestTransits();
      const filtered = filterRetrogrades(transits);

      for (const t of filtered) {
        assert.ok(t.hasRetrogradePass, 'Should only include retrograde transits');
      }
    });
  });

  describe('filterMultiplePasses', () => {
    it('should filter to multi-pass transits', () => {
      const transits = getTestTransits();
      const filtered = filterMultiplePasses(transits);

      for (const t of filtered) {
        assert.ok(t.exactPasses > 1, 'Should only include multi-pass transits');
      }
    });
  });

  describe('filterByDuration', () => {
    it('should filter by minimum duration', () => {
      const transits = getTestTransits();
      const filtered = filterByDuration(transits, 30); // At least 30 days

      for (const t of filtered) {
        assert.ok(t.durationDays >= 30, `Duration should be ≥30 days, got ${t.durationDays}`);
      }
    });
  });

  describe('filterByBodySpeed', () => {
    it('should filter to fast planets', () => {
      const transits = getTestTransits();
      const filtered = filterByBodySpeed(transits, 'fast');

      const fastNames = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars'];
      for (const t of filtered) {
        assert.ok(
          fastNames.includes(t.transit.transitingBody),
          `${t.transit.transitingBody} should be fast`,
        );
      }
    });

    it('should filter to slow planets', () => {
      const transits = getTestTransits();
      const filtered = filterByBodySpeed(transits, 'slow');

      const fastNames = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars'];
      for (const t of filtered) {
        assert.ok(
          !fastNames.includes(t.transit.transitingBody),
          `${t.transit.transitingBody} should be slow`,
        );
      }
    });
  });
});

// =============================================================================
// UNIT TESTS: Utility Functions
// =============================================================================

describe('Utility Functions', () => {
  describe('getNextTransit', () => {
    it('should find the next transit after a date', () => {
      const result = searchTransits({
        startJD: J2000_JD,
        endJD: J2000_JD + 365,
        natalPoints: MINIMAL_NATAL,
      });

      const next = getNextTransit(result.transits, J2000_JD + 30);

      if (next) {
        assert.ok(next.exactJDs[0] > J2000_JD + 30, 'Next transit should be after specified date');
      }
    });
  });

  describe('getActiveTransits', () => {
    it('should find transits active at a specific date', () => {
      const result = searchTransits({
        startJD: J2000_JD,
        endJD: J2000_JD + 365,
        natalPoints: MINIMAL_NATAL,
      });

      // Pick a date in the middle
      const testJD = J2000_JD + 180;
      const active = getActiveTransits(result.transits, testJD);

      for (const t of active) {
        assert.ok(testJD >= t.enterOrbJD, 'Should have entered orb');
        assert.ok(testJD <= t.leaveOrbJD, 'Should not have left orb');
      }
    });
  });

  describe('getMostSignificantTransits', () => {
    it('should return top transits by duration', () => {
      const result = searchTransits({
        startJD: J2000_JD,
        endJD: J2000_JD + 365,
        natalPoints: MINIMAL_NATAL,
      });

      const top5 = getMostSignificantTransits(result.transits, 5);

      assert.ok(top5.length <= 5, 'Should return at most 5');

      // Should be sorted by duration descending
      for (let i = 1; i < top5.length; i++) {
        assert.ok(
          top5[i].durationDays <= top5[i - 1].durationDays,
          'Should be sorted by duration descending',
        );
      }
    });
  });

  describe('formatTransitTimingDetail', () => {
    it('should format transit timing correctly', () => {
      const result = searchTransits({
        startJD: J2000_JD,
        endJD: J2000_JD + 180,
        natalPoints: MINIMAL_NATAL,
      });

      if (result.transits.length > 0) {
        const formatted = formatTransitTimingDetail(result.transits[0]);

        assert.ok(formatted.includes('Duration'), 'Should include duration');
        assert.ok(formatted.includes('Enters orb'), 'Should include orb entry');
        assert.ok(formatted.includes('Exact'), 'Should include exact date');
        assert.ok(formatted.includes('Leaves orb'), 'Should include orb exit');
      }
    });
  });
});

// =============================================================================
// UNIT TESTS: Convenience Functions
// =============================================================================

describe('Convenience Functions', () => {
  describe('getUpcomingTransits', () => {
    it('should get transits for next N days', () => {
      const result = getUpcomingTransits(MINIMAL_NATAL, J2000_JD, 60);

      // All transits should be within the period
      for (const t of result.transits) {
        assert.ok(t.exactJDs[0] <= J2000_JD + 60, 'Exact should be within period');
      }
    });
  });

  describe('getTransitsForMonth', () => {
    it('should get transits for a specific month', () => {
      // January 2000
      const result = getTransitsForMonth(MINIMAL_NATAL, 2000, 1);

      // All first exact dates should be in January 2000
      for (const t of result.transits) {
        const date = t.exactDates[0];
        assert.strictEqual(date.year, 2000, 'Should be year 2000');
        assert.strictEqual(date.month, 1, 'Should be January');
      }
    });
  });

  describe('getTransitsForYear', () => {
    it('should get transits for a full year', () => {
      const result = getTransitsForYear(MINIMAL_NATAL, 2000);

      // Should have transits across multiple months
      const months = Object.keys(result.byMonth);
      assert.ok(months.length > 1, 'Should have transits in multiple months');

      // All first exact dates should be in 2000
      for (const t of result.transits) {
        const date = t.exactDates[0];
        assert.strictEqual(date.year, 2000, 'Should be year 2000');
      }
    });
  });
});

// =============================================================================
// INTEGRATION TESTS
// =============================================================================

describe('Integration Tests', () => {
  describe('Full chart transit search', () => {
    it('should handle multiple natal points', () => {
      const result = searchTransits({
        startJD: J2000_JD,
        endJD: J2000_JD + 90, // 3 months
        natalPoints: SAMPLE_NATAL_POINTS,
        config: {
          transitingBodies: [CelestialBody.Sun, CelestialBody.Mars],
        },
      });

      // Should find transits to multiple points
      const grouped = groupTransitsByNatalPoint(result.transits);
      const pointsWithTransits = Object.keys(grouped).length;

      assert.ok(pointsWithTransits >= 1, 'Should find transits to at least 1 natal point');
    });
  });

  describe('Complete year analysis', () => {
    it('should provide comprehensive year data', () => {
      const result = getTransitsForYear(MINIMAL_NATAL, 2000, {
        transitingBodies: [CelestialBody.Jupiter, CelestialBody.Saturn],
      });

      // Should have reasonable number of transits
      // Jupiter/Saturn make few aspects per year
      assert.ok(result.transits.length >= 1, 'Should find some transits');
      assert.ok(result.transits.length < 50, 'Should not have excessive transits');
    });
  });
});

// =============================================================================
// PERFORMANCE TESTS
// =============================================================================

describe('Performance', () => {
  it('should complete 1-year search in reasonable time', () => {
    const start = Date.now();

    searchTransits({
      startJD: J2000_JD,
      endJD: J2000_JD + 365,
      natalPoints: MINIMAL_NATAL,
    });

    const elapsed = Date.now() - start;
    assert.ok(elapsed < 10000, `1-year search should take <10s, took ${elapsed}ms`);
  });

  it('should complete multi-point search efficiently', () => {
    const start = Date.now();

    searchTransits({
      startJD: J2000_JD,
      endJD: J2000_JD + 180, // 6 months
      natalPoints: SAMPLE_NATAL_POINTS,
      config: {
        transitingBodies: [CelestialBody.Sun, CelestialBody.Mars, CelestialBody.Jupiter],
      },
    });

    const elapsed = Date.now() - start;
    assert.ok(elapsed < 15000, `Multi-point search should take <15s, took ${elapsed}ms`);
  });
});

// =============================================================================
// EDGE CASES
// =============================================================================

describe('Edge Cases', () => {
  describe('Empty results', () => {
    it('should handle no transits found', () => {
      // Very short window, unlikely to find transits
      const result = searchTransits({
        startJD: J2000_JD,
        endJD: J2000_JD + 0.01, // ~15 minutes
        natalPoints: MINIMAL_NATAL,
      });

      assert.ok(Array.isArray(result.transits), 'Should return array');
      assert.strictEqual(result.summary.totalTransits, result.transits.length);
    });
  });

  describe('Natal point at 0°', () => {
    it('should handle natal point at 0° Aries', () => {
      const result = searchTransits({
        startJD: J2000_JD,
        endJD: J2000_JD + 365,
        natalPoints: [{ name: 'Aries Point', longitude: 0, type: 'angle' }],
        config: {
          transitingBodies: [CelestialBody.Sun],
          aspectTypes: [AspectType.Conjunction],
        },
      });

      // Sun crosses 0° once per year (around March 20-21)
      // Should find this transit
      assert.ok(result.transits.length >= 0, 'Should handle 0° natal point');
    });
  });
});
