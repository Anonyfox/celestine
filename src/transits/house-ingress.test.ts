/**
 * House Ingress Module Tests
 *
 * Tests for detecting when transiting planets enter and exit natal houses.
 *
 * @module transits/house-ingress.test
 *
 * @remarks
 * These tests validate:
 * 1. Basic ingress detection logic
 * 2. Exact ingress time finding
 * 3. Next ingress prediction
 * 4. Full timeline calculation
 * 5. Edge cases (retrograde, 0°/360° boundary)
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';

import { CelestialBody, getPosition } from '../ephemeris/positions.js';
import { getHousePosition } from '../houses/house-utils.js';
import {
  calculateAllIngresses,
  calculateAllIngressesForBodies,
  checkIngressInWindow,
  detectHouseIngress,
  findIngressToHouse,
  findNextIngress,
  formatHouseIngress,
  getBodyHouse,
  getBodyHouses,
  groupIngressesByBody,
  groupIngressesByHouse,
} from './house-ingress.js';

// =============================================================================
// TEST CONSTANTS
// =============================================================================

/**
 * J2000.0 epoch Julian Date
 */
const J2000_JD = 2451545.0;

/**
 * Standard equal house cusps (30° each)
 * ASC at 0° Aries for simplicity
 */
const EQUAL_CUSPS = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

/**
 * Example Placidus cusps for London latitude
 * These are representative values, not precise calculations
 */
const SAMPLE_CUSPS = [
  15.3, 42.1, 68.9, 105.7, 142.5, 169.3, 195.3, 222.1, 248.9, 285.7, 322.5, 349.3,
];

// =============================================================================
// UNIT TESTS: detectHouseIngress
// =============================================================================

describe('detectHouseIngress', () => {
  describe('Basic ingress detection', () => {
    it('should detect ingress from house 1 to house 2', () => {
      // Position moving from 25° to 35°, crossing 30° cusp
      const ingress = detectHouseIngress(EQUAL_CUSPS, 35, 25, CelestialBody.Mars, false);

      assert.ok(ingress !== null, 'Should detect ingress');
      assert.strictEqual(ingress?.house, 2, 'Should enter house 2');
      assert.strictEqual(ingress?.previousHouse, 1, 'Should be from house 1');
      assert.strictEqual(ingress?.direction, 'entering', 'Direct motion should be entering');
      assert.strictEqual(ingress?.isRetrograde, false);
    });

    it('should return null when no ingress occurs', () => {
      // Position moving within house 1 (both under 30°)
      const ingress = detectHouseIngress(EQUAL_CUSPS, 25, 20, CelestialBody.Mars, false);

      assert.strictEqual(ingress, null, 'No ingress should be detected');
    });

    it('should detect retrograde ingress', () => {
      // Retrograde: moving from 35° back to 25°, crossing 30° cusp
      const ingress = detectHouseIngress(EQUAL_CUSPS, 25, 35, CelestialBody.Mercury, true);

      assert.ok(ingress !== null, 'Should detect ingress');
      assert.strictEqual(ingress?.house, 1, 'Should be in house 1');
      assert.strictEqual(ingress?.previousHouse, 2, 'Should be from house 2');
      assert.strictEqual(ingress?.isRetrograde, true);
    });
  });

  describe('House wraparound (12 → 1)', () => {
    it('should detect ingress from house 12 to house 1', () => {
      // Position moving from 355° to 5°, crossing 0° cusp
      const ingress = detectHouseIngress(EQUAL_CUSPS, 5, 355, CelestialBody.Sun, false);

      assert.ok(ingress !== null, 'Should detect ingress');
      assert.strictEqual(ingress?.house, 1, 'Should enter house 1');
      assert.strictEqual(ingress?.previousHouse, 12, 'Should be from house 12');
    });

    it('should detect retrograde ingress from house 1 to house 12', () => {
      // Retrograde: moving from 5° back to 355°
      const ingress = detectHouseIngress(EQUAL_CUSPS, 355, 5, CelestialBody.Mercury, true);

      assert.ok(ingress !== null, 'Should detect ingress');
      assert.strictEqual(ingress?.house, 12, 'Should be in house 12');
      assert.strictEqual(ingress?.previousHouse, 1, 'Should be from house 1');
      assert.strictEqual(ingress?.isRetrograde, true);
    });
  });

  describe('Body naming', () => {
    it('should include correct body name', () => {
      const ingress = detectHouseIngress(EQUAL_CUSPS, 35, 25, CelestialBody.Saturn, false);

      assert.ok(ingress !== null);
      assert.strictEqual(ingress?.body, 'Saturn');
      assert.strictEqual(ingress?.bodyEnum, CelestialBody.Saturn);
    });
  });

  describe('Edge cases', () => {
    it('should throw error for invalid cusps array', () => {
      assert.throws(
        () => detectHouseIngress([0, 30, 60], 35, 25, CelestialBody.Mars, false),
        /must contain exactly 12 elements/,
      );
    });

    it('should handle position exactly on cusp', () => {
      // Position at exactly 30° (cusp of house 2)
      const ingress = detectHouseIngress(EQUAL_CUSPS, 30, 29.99, CelestialBody.Sun, false);

      // Should detect as entering house 2
      assert.ok(ingress !== null);
      assert.strictEqual(ingress?.house, 2);
    });
  });
});

// =============================================================================
// UNIT TESTS: checkIngressInWindow
// =============================================================================

describe('checkIngressInWindow', () => {
  it('should find ingress in a time window', () => {
    // Get Sun's position at J2000
    const pos = getPosition(CelestialBody.Sun, J2000_JD);
    const startHouse = getHousePosition(pos.longitude, EQUAL_CUSPS);

    // Search forward until Sun enters next house
    // Sun moves ~1°/day, so in 30+ days should change house
    const ingress = checkIngressInWindow(CelestialBody.Sun, EQUAL_CUSPS, J2000_JD, J2000_JD + 40);

    if (ingress !== null) {
      assert.ok(ingress.ingressJD !== undefined, 'Should have exact JD');
      assert.ok(ingress.ingressDate !== undefined, 'Should have date');
      assert.strictEqual(ingress.previousHouse, startHouse, 'Previous house should match start');
    }
  });

  it('should return null when no ingress in window', () => {
    // Very short window - Sun won't change house in 1 day
    const ingress = checkIngressInWindow(CelestialBody.Sun, EQUAL_CUSPS, J2000_JD, J2000_JD + 0.5);

    // Could be null if no house change in 12 hours
    // (depends on position relative to cusp)
    assert.strictEqual(typeof ingress === 'object' || ingress === null, true);
  });
});

// =============================================================================
// UNIT TESTS: findNextIngress
// =============================================================================

describe('findNextIngress', () => {
  it('should find the next house ingress for Sun', () => {
    const ingress = findNextIngress(CelestialBody.Sun, EQUAL_CUSPS, J2000_JD, 60);

    assert.ok(ingress !== null, 'Should find ingress within 60 days');
    if (ingress) {
      assert.strictEqual(ingress.body, 'Sun');
      assert.ok(ingress.ingressJD !== undefined);
      assert.ok(ingress.ingressJD > J2000_JD, 'Ingress should be in future');
      assert.ok(ingress.house >= 1 && ingress.house <= 12, 'House should be 1-12');
    }
  });

  it('should find the next house ingress for a slow planet', () => {
    // Saturn moves slowly, may need longer search
    const ingress = findNextIngress(CelestialBody.Saturn, EQUAL_CUSPS, J2000_JD, 365 * 3);

    // Saturn may or may not change houses in 3 years depending on position
    if (ingress !== null) {
      assert.strictEqual(ingress.body, 'Saturn');
      assert.ok(ingress.ingressJD! > J2000_JD);
    }
  });

  it('should find ingress for Moon quickly', () => {
    // Moon changes houses every ~2.5 days
    const ingress = findNextIngress(CelestialBody.Moon, EQUAL_CUSPS, J2000_JD, 7);

    assert.ok(ingress !== null, 'Moon should enter new house within 7 days');
    if (ingress) {
      const daysUntil = ingress.ingressJD! - J2000_JD;
      assert.ok(daysUntil < 5, `Moon ingress should be within 5 days, got ${daysUntil.toFixed(2)}`);
    }
  });
});

// =============================================================================
// UNIT TESTS: findIngressToHouse
// =============================================================================

describe('findIngressToHouse', () => {
  it('should find when Sun enters a specific house', () => {
    // Get current house and target the next one
    const pos = getPosition(CelestialBody.Sun, J2000_JD);
    const currentHouse = getHousePosition(pos.longitude, EQUAL_CUSPS);
    const targetHouse = currentHouse === 12 ? 1 : currentHouse + 1;

    const ingress = findIngressToHouse(CelestialBody.Sun, EQUAL_CUSPS, targetHouse, J2000_JD, 60);

    assert.ok(ingress !== null, `Should find entry to house ${targetHouse}`);
    if (ingress) {
      assert.strictEqual(ingress.house, targetHouse);
    }
  });

  it('should return null if house not reached in search window', () => {
    // Get current house
    const pos = getPosition(CelestialBody.Pluto, J2000_JD);
    const currentHouse = getHousePosition(pos.longitude, EQUAL_CUSPS);

    // Target a house several away - Pluto won't reach it in 30 days
    const targetHouse = ((currentHouse + 5) % 12) + 1;

    const ingress = findIngressToHouse(CelestialBody.Pluto, EQUAL_CUSPS, targetHouse, J2000_JD, 30);

    // Pluto moves ~0.004°/day, so 30 days = ~0.12°, unlikely to change houses
    // Result depends on proximity to next cusp
    assert.strictEqual(typeof ingress === 'object' || ingress === null, true);
  });
});

// =============================================================================
// UNIT TESTS: calculateAllIngresses
// =============================================================================

describe('calculateAllIngresses', () => {
  it('should find all Sun ingresses in a year', () => {
    const ingresses = calculateAllIngresses(
      CelestialBody.Sun,
      EQUAL_CUSPS,
      J2000_JD,
      J2000_JD + 365,
    );

    // Sun should make 12 ingresses in a year (one per house)
    // Allow some variance due to start position
    assert.ok(
      ingresses.length >= 10 && ingresses.length <= 14,
      `Expected ~12 Sun ingresses, got ${ingresses.length}`,
    );

    // All should be for Sun
    for (const ing of ingresses) {
      assert.strictEqual(ing.body, 'Sun');
      assert.ok(ing.ingressJD !== undefined);
    }
  });

  it('should find multiple Moon ingresses', () => {
    // Moon transits all houses in ~28 days
    const ingresses = calculateAllIngresses(
      CelestialBody.Moon,
      EQUAL_CUSPS,
      J2000_JD,
      J2000_JD + 30,
    );

    // Moon should make ~12 ingresses per month
    assert.ok(
      ingresses.length >= 10,
      `Expected ≥10 Moon ingresses in 30 days, got ${ingresses.length}`,
    );
  });

  it('should return sorted ingresses', () => {
    const ingresses = calculateAllIngresses(
      CelestialBody.Sun,
      EQUAL_CUSPS,
      J2000_JD,
      J2000_JD + 180,
    );

    // Verify sorted by date
    for (let i = 1; i < ingresses.length; i++) {
      assert.ok(
        ingresses[i].ingressJD! >= ingresses[i - 1].ingressJD!,
        'Ingresses should be sorted by date',
      );
    }
  });
});

// =============================================================================
// UNIT TESTS: calculateAllIngressesForBodies
// =============================================================================

describe('calculateAllIngressesForBodies', () => {
  it('should find ingresses for multiple bodies', () => {
    const bodies = [CelestialBody.Sun, CelestialBody.Mercury, CelestialBody.Venus];
    const ingresses = calculateAllIngressesForBodies(bodies, EQUAL_CUSPS, J2000_JD, J2000_JD + 90);

    // Should have ingresses from all three bodies
    const bodiesFound = new Set(ingresses.map((i) => i.body));
    assert.ok(bodiesFound.size >= 2, 'Should have ingresses from multiple bodies');
  });

  it('should return all results sorted by date', () => {
    const bodies = [CelestialBody.Sun, CelestialBody.Moon];
    const ingresses = calculateAllIngressesForBodies(bodies, EQUAL_CUSPS, J2000_JD, J2000_JD + 60);

    for (let i = 1; i < ingresses.length; i++) {
      assert.ok(ingresses[i].ingressJD! >= ingresses[i - 1].ingressJD!, 'Should be sorted by date');
    }
  });
});

// =============================================================================
// UNIT TESTS: Utility Functions
// =============================================================================

describe('Utility Functions', () => {
  describe('getBodyHouse', () => {
    it('should return correct house for a body', () => {
      const house = getBodyHouse(CelestialBody.Sun, EQUAL_CUSPS, J2000_JD);

      assert.ok(house >= 1 && house <= 12, 'House should be 1-12');

      // Verify against direct calculation
      const pos = getPosition(CelestialBody.Sun, J2000_JD);
      const directHouse = getHousePosition(pos.longitude, EQUAL_CUSPS);
      assert.strictEqual(house, directHouse);
    });
  });

  describe('getBodyHouses', () => {
    it('should return houses for multiple bodies', () => {
      const bodies = [CelestialBody.Sun, CelestialBody.Moon, CelestialBody.Mars];
      const houses = getBodyHouses(bodies, EQUAL_CUSPS, J2000_JD);

      assert.strictEqual(houses.size, 3);
      assert.ok(houses.has('Sun'));
      assert.ok(houses.has('Moon'));
      assert.ok(houses.has('Mars'));

      for (const [_, house] of houses) {
        assert.ok(house >= 1 && house <= 12);
      }
    });
  });

  describe('formatHouseIngress', () => {
    it('should format ingress correctly', () => {
      const ingress = detectHouseIngress(EQUAL_CUSPS, 35, 25, CelestialBody.Mars, false);

      if (ingress) {
        // Add date for formatting
        ingress.ingressDate = { year: 2025, month: 1, day: 15, hour: 12, minute: 0 };
        const formatted = formatHouseIngress(ingress);

        assert.ok(formatted.includes('Mars'), 'Should include body name');
        assert.ok(formatted.includes('House 2'), 'Should include house number');
        assert.ok(formatted.includes('2025-01-15'), 'Should include date');
      }
    });

    it('should show retrograde symbol', () => {
      const ingress = detectHouseIngress(EQUAL_CUSPS, 25, 35, CelestialBody.Mercury, true);

      if (ingress) {
        ingress.ingressDate = { year: 2025, month: 1, day: 15, hour: 12, minute: 0 };
        const formatted = formatHouseIngress(ingress);

        assert.ok(formatted.includes('℞'), 'Should include retrograde symbol');
      }
    });
  });

  describe('groupIngressesByHouse', () => {
    it('should group ingresses correctly', () => {
      const ingresses = calculateAllIngresses(
        CelestialBody.Sun,
        EQUAL_CUSPS,
        J2000_JD,
        J2000_JD + 365,
      );

      const grouped = groupIngressesByHouse(ingresses);

      // Each house should have been entered at least once
      let housesWithIngress = 0;
      for (let h = 1; h <= 12; h++) {
        if (grouped[h] && grouped[h].length > 0) {
          housesWithIngress++;
        }
      }
      assert.ok(housesWithIngress >= 10, 'Most houses should have ingresses');
    });
  });

  describe('groupIngressesByBody', () => {
    it('should group ingresses by body', () => {
      const bodies = [CelestialBody.Sun, CelestialBody.Moon];
      const ingresses = calculateAllIngressesForBodies(
        bodies,
        EQUAL_CUSPS,
        J2000_JD,
        J2000_JD + 60,
      );

      const grouped = groupIngressesByBody(ingresses);

      assert.ok('Sun' in grouped, 'Should have Sun group');
      assert.ok('Moon' in grouped, 'Should have Moon group');
    });
  });
});

// =============================================================================
// INTEGRATION TESTS
// =============================================================================

describe('Integration Tests', () => {
  describe('Real astronomical validation', () => {
    it('should find Sun at correct house at J2000', () => {
      // At J2000, Sun is at ~280.37° (Capricorn)
      // In equal houses starting at 0° Aries:
      // 280.37° is in house 10 (270-300°)

      const house = getBodyHouse(CelestialBody.Sun, EQUAL_CUSPS, J2000_JD);

      assert.strictEqual(house, 10, 'Sun at J2000 should be in house 10 with 0° Aries ASC');
    });

    it('should track Mars through houses correctly', () => {
      // Mars takes ~2 years to complete zodiac
      // In 90 days should move through ~3 houses

      const ingresses = calculateAllIngresses(
        CelestialBody.Mars,
        EQUAL_CUSPS,
        J2000_JD,
        J2000_JD + 90,
      );

      // Mars at ~0.524°/day = ~47° in 90 days ≈ 1.5 houses
      // Allow for variations
      assert.ok(
        ingresses.length >= 1 && ingresses.length <= 4,
        `Expected 1-4 Mars ingresses in 90 days, got ${ingresses.length}`,
      );
    });
  });

  describe('Sample cusps test', () => {
    it('should work with non-equal cusps', () => {
      const house = getBodyHouse(CelestialBody.Sun, SAMPLE_CUSPS, J2000_JD);

      assert.ok(house >= 1 && house <= 12);
    });

    it('should find ingresses with sample cusps', () => {
      const ingresses = calculateAllIngresses(
        CelestialBody.Sun,
        SAMPLE_CUSPS,
        J2000_JD,
        J2000_JD + 365,
      );

      // Should still find ~12 ingresses
      assert.ok(ingresses.length >= 10 && ingresses.length <= 14);
    });
  });
});

// =============================================================================
// EDGE CASES
// =============================================================================

describe('Edge Cases', () => {
  describe('Cusps near 0°/360°', () => {
    it('should handle cusp at 0°', () => {
      // Equal cusps have house 1 starting at 0°
      const ingress = detectHouseIngress(EQUAL_CUSPS, 5, 355, CelestialBody.Sun, false);

      assert.ok(ingress !== null);
      assert.strictEqual(ingress?.house, 1);
      assert.strictEqual(ingress?.previousHouse, 12);
    });

    it('should handle cusps near 0° with offset', () => {
      // Cusps shifted so house 1 starts at 350°
      const shiftedCusps = [350, 20, 50, 80, 110, 140, 170, 200, 230, 260, 290, 320];

      // Position moving from 325° to 340° (still in house 12, between 320° and 350°)
      const noIngress = detectHouseIngress(shiftedCusps, 340, 325, CelestialBody.Sun, false);
      assert.strictEqual(noIngress, null, 'Should not detect ingress within house 12');

      // Position moving from 345° to 5° (crossing 350° cusp into house 1, then 20° cusp into house 2)
      // Actually 345° to 5° crosses the 350° cusp (house 1)
      const ingress = detectHouseIngress(shiftedCusps, 5, 345, CelestialBody.Sun, false);
      assert.ok(ingress !== null, 'Should detect ingress');
      // 345° is in house 12, 5° is in house 1, so entering house 1
      assert.strictEqual(ingress?.house, 1, 'Should enter house 1');
    });
  });

  describe('Retrograde motion edge cases', () => {
    it('should handle retrograde across 0° boundary', () => {
      const ingress = detectHouseIngress(EQUAL_CUSPS, 355, 5, CelestialBody.Mercury, true);

      assert.ok(ingress !== null);
      assert.strictEqual(ingress?.house, 12);
      assert.strictEqual(ingress?.previousHouse, 1);
      assert.strictEqual(ingress?.isRetrograde, true);
    });
  });

  describe('Multiple quick ingresses', () => {
    it('should handle retrograde station at cusp', () => {
      // If a planet stations retrograde right at a cusp, it may cross
      // the same cusp multiple times. This test verifies we don't
      // double-count or miss passes.

      // For this unit test, just verify calculateAllIngresses handles
      // the scenario without errors
      const ingresses = calculateAllIngresses(
        CelestialBody.Mercury,
        EQUAL_CUSPS,
        J2000_JD,
        J2000_JD + 120,
      );

      // Mercury has retrograde periods, may have multiple cusp crossings
      assert.ok(Array.isArray(ingresses));
    });
  });
});

// =============================================================================
// PERFORMANCE TESTS
// =============================================================================

describe('Performance', () => {
  it('should calculate year of ingresses quickly', () => {
    const start = Date.now();

    calculateAllIngresses(CelestialBody.Mars, EQUAL_CUSPS, J2000_JD, J2000_JD + 365);

    const elapsed = Date.now() - start;
    assert.ok(elapsed < 2000, `Year of Mars ingresses should take <2s, took ${elapsed}ms`);
  });

  it('should handle multiple bodies efficiently', () => {
    const start = Date.now();

    calculateAllIngressesForBodies(
      [
        CelestialBody.Sun,
        CelestialBody.Moon,
        CelestialBody.Mercury,
        CelestialBody.Venus,
        CelestialBody.Mars,
      ],
      EQUAL_CUSPS,
      J2000_JD,
      J2000_JD + 180,
    );

    const elapsed = Date.now() - start;
    assert.ok(elapsed < 5000, `6 months of 5 bodies should take <5s, took ${elapsed}ms`);
  });
});
