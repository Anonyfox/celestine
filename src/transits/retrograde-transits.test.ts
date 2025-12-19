/**
 * Retrograde Transit Module Tests
 *
 * Tests for retrograde motion handling, station detection,
 * and multiple transit passes.
 *
 * @module transits/retrograde-transits.test
 *
 * @remarks
 * These tests validate:
 * 1. Motion classification (direct/retrograde/stationary)
 * 2. Station point detection
 * 3. Retrograde period finding
 * 4. Multiple transit passes
 * 5. Reference data validation against known retrograde dates
 *
 * Reference sources:
 * - Swiss Ephemeris for planetary positions
 * - Astronomical almanacs for known retrograde dates
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';

import { CelestialBody, getPosition } from '../ephemeris/positions.js';
import { julianDate } from '../time/julian-date.js';
import { BODY_NAMES, RETROGRADE_PLANETS } from './constants.js';
import {
  canRetrograde,
  classifyMotion,
  estimatePassCount,
  findNextStation,
  findRetrogradePeriods,
  findStationPoints,
  findTransitPasses,
  formatRetrogradePeriod,
  formatStationPoint,
  getAllRetrogradePeriods,
  getCurrentRetrogradePeriod,
  getRetrogradeShadow,
  isRetrograde,
  type MotionState,
} from './retrograde-transits.js';

// =============================================================================
// TEST CONSTANTS
// =============================================================================

/**
 * J2000.0 epoch Julian Date
 */
const J2000_JD = 2451545.0;

// =============================================================================
// UNIT TESTS: Motion Classification
// =============================================================================

describe('Motion Classification', () => {
  describe('classifyMotion', () => {
    it('should classify direct motion correctly', () => {
      // Sun is always direct
      const motion = classifyMotion(CelestialBody.Sun, J2000_JD);
      assert.strictEqual(motion, 'direct', 'Sun should always be direct');
    });

    it('should return valid motion state', () => {
      const validStates: MotionState[] = [
        'direct',
        'retrograde',
        'stationary-retrograde',
        'stationary-direct',
      ];

      const motion = classifyMotion(CelestialBody.Mercury, J2000_JD);
      assert.ok(
        validStates.includes(motion),
        `Motion should be one of valid states, got ${motion}`,
      );
    });
  });

  describe('canRetrograde', () => {
    it('should return false for Sun and Moon', () => {
      assert.strictEqual(canRetrograde(CelestialBody.Sun), false, 'Sun cannot retrograde');
      assert.strictEqual(canRetrograde(CelestialBody.Moon), false, 'Moon cannot retrograde');
    });

    it('should return true for planets', () => {
      assert.strictEqual(canRetrograde(CelestialBody.Mercury), true, 'Mercury can retrograde');
      assert.strictEqual(canRetrograde(CelestialBody.Venus), true, 'Venus can retrograde');
      assert.strictEqual(canRetrograde(CelestialBody.Mars), true, 'Mars can retrograde');
      assert.strictEqual(canRetrograde(CelestialBody.Jupiter), true, 'Jupiter can retrograde');
      assert.strictEqual(canRetrograde(CelestialBody.Saturn), true, 'Saturn can retrograde');
    });

    it('should return true for outer planets', () => {
      assert.strictEqual(canRetrograde(CelestialBody.Uranus), true);
      assert.strictEqual(canRetrograde(CelestialBody.Neptune), true);
      assert.strictEqual(canRetrograde(CelestialBody.Pluto), true);
    });
  });

  describe('isRetrograde', () => {
    it('should detect retrograde motion', () => {
      // Test at J2000 - check if any planet is retrograde
      const planets = [
        CelestialBody.Mercury,
        CelestialBody.Venus,
        CelestialBody.Mars,
        CelestialBody.Jupiter,
        CelestialBody.Saturn,
      ];

      for (const planet of planets) {
        const retro = isRetrograde(planet, J2000_JD);
        const pos = getPosition(planet, J2000_JD);
        assert.strictEqual(
          retro,
          pos.isRetrograde,
          `isRetrograde should match ephemeris for ${BODY_NAMES[planet]}`,
        );
      }
    });

    it('should return false for Sun', () => {
      assert.strictEqual(isRetrograde(CelestialBody.Sun, J2000_JD), false);
    });
  });
});

// =============================================================================
// UNIT TESTS: Station Point Detection
// =============================================================================

describe('Station Point Detection', () => {
  describe('findStationPoints', () => {
    it('should find Mercury stations in a year', () => {
      // Mercury retrogrades ~3 times per year
      const stations = findStationPoints(CelestialBody.Mercury, J2000_JD, J2000_JD + 365);

      // Should find 6 stations (3 retrograde + 3 direct)
      assert.ok(
        stations.length >= 4,
        `Expected ≥4 Mercury stations in a year, got ${stations.length}`,
      );
      assert.ok(
        stations.length <= 8,
        `Expected ≤8 Mercury stations in a year, got ${stations.length}`,
      );
    });

    it('should return empty array for Sun', () => {
      const stations = findStationPoints(CelestialBody.Sun, J2000_JD, J2000_JD + 365);
      assert.strictEqual(stations.length, 0, 'Sun should have no stations');
    });

    it('should return empty array for Moon', () => {
      const stations = findStationPoints(CelestialBody.Moon, J2000_JD, J2000_JD + 365);
      assert.strictEqual(stations.length, 0, 'Moon should have no stations');
    });

    it('should alternate station-retrograde and station-direct', () => {
      const stations = findStationPoints(CelestialBody.Saturn, J2000_JD, J2000_JD + 365 * 2);

      // Check alternation (after sorting by date)
      for (let i = 1; i < stations.length; i++) {
        assert.notStrictEqual(
          stations[i].type,
          stations[i - 1].type,
          'Station types should alternate',
        );
      }
    });

    it('should include all required fields', () => {
      const stations = findStationPoints(CelestialBody.Jupiter, J2000_JD, J2000_JD + 500);

      for (const station of stations) {
        assert.strictEqual(station.body, CelestialBody.Jupiter);
        assert.ok(station.jd > 0, 'Should have JD');
        assert.ok(station.longitude >= 0 && station.longitude < 360, 'Longitude should be 0-360');
        assert.ok(station.date !== undefined, 'Should have date');
        assert.ok(
          station.type === 'station-retrograde' || station.type === 'station-direct',
          'Should have valid type',
        );
      }
    });
  });

  describe('findNextStation', () => {
    it('should find the next station for Jupiter', () => {
      const station = findNextStation(CelestialBody.Jupiter, J2000_JD, 365);

      // Jupiter stations once per year approximately
      assert.ok(station !== null, 'Should find Jupiter station within a year');
      if (station) {
        assert.ok(station.jd > J2000_JD, 'Station should be after start');
      }
    });

    it('should return null for Sun', () => {
      const station = findNextStation(CelestialBody.Sun, J2000_JD, 365);
      assert.strictEqual(station, null, 'Sun should have no stations');
    });
  });
});

// =============================================================================
// UNIT TESTS: Retrograde Period Detection
// =============================================================================

describe('Retrograde Period Detection', () => {
  describe('findRetrogradePeriods', () => {
    it('should find Mercury retrograde periods', () => {
      // Search 2 years for more reliable results
      const periods = findRetrogradePeriods(CelestialBody.Mercury, J2000_JD, J2000_JD + 365 * 2);

      // Mercury retrogrades ~3 times per year = ~6 in 2 years
      assert.ok(
        periods.length >= 4,
        `Expected ≥4 Mercury Rx periods in 2 years, got ${periods.length}`,
      );
      assert.ok(
        periods.length <= 8,
        `Expected ≤8 Mercury Rx periods in 2 years, got ${periods.length}`,
      );
    });

    it('should return empty array for non-retrograde bodies', () => {
      const periods = findRetrogradePeriods(CelestialBody.Sun, J2000_JD, J2000_JD + 365);
      assert.strictEqual(periods.length, 0);
    });

    it('should calculate correct duration', () => {
      const periods = findRetrogradePeriods(CelestialBody.Mercury, J2000_JD, J2000_JD + 365);

      for (const period of periods) {
        // Mercury retrograde typically lasts 19-24 days
        assert.ok(
          period.durationDays > 15,
          `Mercury Rx should be >15 days, got ${period.durationDays}`,
        );
        assert.ok(
          period.durationDays < 30,
          `Mercury Rx should be <30 days, got ${period.durationDays}`,
        );

        // Duration should match JD difference
        const calculatedDuration = period.stationDirectJD - period.stationRetroJD;
        assert.ok(
          Math.abs(period.durationDays - calculatedDuration) < 0.001,
          'Duration should match JD difference',
        );
      }
    });

    it('should have valid longitude values', () => {
      const periods = findRetrogradePeriods(CelestialBody.Saturn, J2000_JD, J2000_JD + 365 * 3);

      for (const period of periods) {
        assert.ok(
          period.stationRetroLongitude >= 0 && period.stationRetroLongitude < 360,
          'Station Rx longitude should be 0-360',
        );
        assert.ok(
          period.stationDirectLongitude >= 0 && period.stationDirectLongitude < 360,
          'Station Direct longitude should be 0-360',
        );
      }
    });
  });

  describe('getCurrentRetrogradePeriod', () => {
    it('should return null when not retrograde', () => {
      // Find a date when Mercury is direct
      // We'll test by checking - if Mercury is direct, should return null
      const pos = getPosition(CelestialBody.Mercury, J2000_JD);

      if (!pos.isRetrograde) {
        const period = getCurrentRetrogradePeriod(CelestialBody.Mercury, J2000_JD);
        assert.strictEqual(period, null, 'Should return null when direct');
      }
    });

    it('should return period when retrograde', () => {
      // Find a known retrograde date for any planet
      // Jupiter spends months retrograde each year
      const stations = findStationPoints(CelestialBody.Jupiter, J2000_JD, J2000_JD + 500);
      const stationRetro = stations.find((s) => s.type === 'station-retrograde');

      if (stationRetro) {
        // Mid-retrograde should be a few weeks after station Rx
        const midRetroJD = stationRetro.jd + 30;
        const period = getCurrentRetrogradePeriod(CelestialBody.Jupiter, midRetroJD);

        // Jupiter should be retrograde at this point
        const pos = getPosition(CelestialBody.Jupiter, midRetroJD);
        if (pos.isRetrograde) {
          assert.ok(period !== null, 'Should return period when retrograde');
        }
      }
    });
  });
});

// =============================================================================
// UNIT TESTS: Multiple Transit Passes
// =============================================================================

describe('Multiple Transit Passes', () => {
  describe('findTransitPasses', () => {
    it('should find single pass for Sun transit', () => {
      // Sun always moves direct, should have 1 pass
      // Use 180 days to avoid catching both passes at year boundary
      const passes = findTransitPasses(CelestialBody.Sun, 45, 0, J2000_JD, J2000_JD + 180);

      // Sun conjuncts every degree once per year, should find 0 or 1 in half year
      assert.ok(
        passes.length <= 1,
        `Sun should have at most 1 pass in 180 days, got ${passes.length}`,
      );

      if (passes.length > 0) {
        assert.strictEqual(passes[0].isRetrogradePass, false, 'Sun pass should not be retrograde');
      }
    });

    it('should potentially find multiple passes for outer planets', () => {
      // Saturn transit to a point might have 3 passes
      const pos = getPosition(CelestialBody.Saturn, J2000_JD);
      const targetLong = pos.longitude + 5; // 5° ahead

      // Search 2 years for Saturn (slow moving)
      const passes = findTransitPasses(
        CelestialBody.Saturn,
        targetLong,
        0,
        J2000_JD,
        J2000_JD + 365 * 2,
      );

      // Saturn may have 1 or 3 passes depending on retrograde
      assert.ok(passes.length >= 1, 'Should find at least 1 pass');
      assert.ok(passes.length <= 5, 'Should not exceed 5 passes');
    });

    it('should number passes sequentially', () => {
      const passes = findTransitPasses(CelestialBody.Jupiter, 40, 0, J2000_JD, J2000_JD + 365 * 2);

      for (let i = 0; i < passes.length; i++) {
        assert.strictEqual(passes[i].passNumber, i + 1, 'Pass numbers should be sequential');
      }
    });

    it('should include all required fields', () => {
      const passes = findTransitPasses(CelestialBody.Sun, 100, 0, J2000_JD, J2000_JD + 365);

      for (const pass of passes) {
        assert.ok(pass.passNumber >= 1, 'Should have pass number');
        assert.ok(pass.exactJD > 0, 'Should have exact JD');
        assert.ok(pass.exactDate !== undefined, 'Should have date');
        assert.ok(pass.longitude >= 0 && pass.longitude < 360, 'Longitude should be 0-360');
        assert.ok(typeof pass.isRetrogradePass === 'boolean', 'Should have retrograde flag');
      }
    });
  });

  describe('estimatePassCount', () => {
    it('should return 1 for non-retrograde bodies', () => {
      assert.strictEqual(estimatePassCount(CelestialBody.Sun, 30), 1);
      assert.strictEqual(estimatePassCount(CelestialBody.Moon, 5), 1);
    });

    it('should return 1 for short transits', () => {
      // Short transit duration should be single pass
      assert.strictEqual(estimatePassCount(CelestialBody.Saturn, 10), 1);
    });

    it('should return 3 for moderate transits of slow planets', () => {
      // Saturn Rx period is ~140 days
      // Transit spanning that duration should have 3 passes
      assert.strictEqual(estimatePassCount(CelestialBody.Saturn, 100), 3);
    });

    it('should return 5 for very long transits', () => {
      // Very long transit (2+ years) could have 5 passes
      const estimate = estimatePassCount(CelestialBody.Pluto, 1000);
      assert.ok(estimate >= 3, 'Long Pluto transit should have multiple passes');
    });
  });
});

// =============================================================================
// UNIT TESTS: Utility Functions
// =============================================================================

describe('Utility Functions', () => {
  describe('getRetrogradeShadow', () => {
    it('should calculate shadow zone', () => {
      const periods = findRetrogradePeriods(CelestialBody.Mercury, J2000_JD, J2000_JD + 365);

      if (periods.length > 0) {
        const shadow = getRetrogradeShadow(periods[0]);

        assert.ok(
          shadow.preShadowStartJD < periods[0].stationRetroJD,
          'Pre-shadow should be before Rx',
        );
        assert.ok(
          shadow.postShadowEndJD > periods[0].stationDirectJD,
          'Post-shadow should be after direct',
        );
        assert.ok(shadow.shadowZoneStart < shadow.shadowZoneEnd, 'Zone start should be before end');
      }
    });
  });

  describe('formatRetrogradePeriod', () => {
    it('should format period correctly', () => {
      const periods = findRetrogradePeriods(CelestialBody.Mercury, J2000_JD, J2000_JD + 365);

      if (periods.length > 0) {
        const formatted = formatRetrogradePeriod(periods[0]);

        assert.ok(formatted.includes('Mercury Rx'), 'Should include body name');
        assert.ok(formatted.includes('days'), 'Should include duration');
        assert.ok(formatted.includes('Station Rx'), 'Should include station info');
      }
    });
  });

  describe('formatStationPoint', () => {
    it('should format station correctly', () => {
      const stations = findStationPoints(CelestialBody.Jupiter, J2000_JD, J2000_JD + 365);

      if (stations.length > 0) {
        const formatted = formatStationPoint(stations[0]);

        assert.ok(formatted.includes('Jupiter'), 'Should include body name');
        assert.ok(formatted.includes('Station'), 'Should include station type');
        assert.ok(formatted.includes('°'), 'Should include longitude');
      }
    });
  });

  describe('getAllRetrogradePeriods', () => {
    it('should get periods for multiple bodies', () => {
      const bodies = [CelestialBody.Mercury, CelestialBody.Venus, CelestialBody.Mars];
      const periods = getAllRetrogradePeriods(bodies, J2000_JD, J2000_JD + 365 * 2);

      // Should have at least Mercury (frequent retrogrades)
      assert.ok(periods.has('Mercury'), 'Should find Mercury retrograde periods');
    });

    it('should not include non-retrograde bodies', () => {
      const bodies = [CelestialBody.Sun, CelestialBody.Moon, CelestialBody.Mercury];
      const periods = getAllRetrogradePeriods(bodies, J2000_JD, J2000_JD + 365);

      assert.ok(!periods.has('Sun'), 'Should not include Sun');
      assert.ok(!periods.has('Moon'), 'Should not include Moon');
    });
  });
});

// =============================================================================
// REFERENCE DATA VALIDATION
// =============================================================================

describe('Reference Data Validation', () => {
  describe('Known Mercury Retrograde Periods', () => {
    it('should find expected number of Mercury retrogrades per year', () => {
      // Mercury retrogrades approximately 3 times per year
      const periods = findRetrogradePeriods(
        CelestialBody.Mercury,
        julianDate(2024, 1, 1, 0, 0),
        julianDate(2025, 1, 1, 0, 0),
      );

      // Should find 3 (occasionally 4) retrograde periods
      assert.ok(periods.length >= 3, `Expected ≥3 Mercury Rx in 2024, got ${periods.length}`);
      assert.ok(periods.length <= 4, `Expected ≤4 Mercury Rx in 2024, got ${periods.length}`);
    });
  });

  describe('Outer Planet Retrograde Duration', () => {
    it('should have Jupiter Rx lasting ~4 months', () => {
      const periods = findRetrogradePeriods(CelestialBody.Jupiter, J2000_JD, J2000_JD + 365 * 2);

      for (const period of periods) {
        // Jupiter Rx typically 121 days
        assert.ok(
          period.durationDays > 100,
          `Jupiter Rx should be >100 days, got ${period.durationDays}`,
        );
        assert.ok(
          period.durationDays < 150,
          `Jupiter Rx should be <150 days, got ${period.durationDays}`,
        );
      }
    });

    it('should have Saturn Rx lasting ~4.5 months', () => {
      const periods = findRetrogradePeriods(CelestialBody.Saturn, J2000_JD, J2000_JD + 365 * 2);

      for (const period of periods) {
        // Saturn Rx typically 140 days
        assert.ok(
          period.durationDays > 120,
          `Saturn Rx should be >120 days, got ${period.durationDays}`,
        );
        assert.ok(
          period.durationDays < 160,
          `Saturn Rx should be <160 days, got ${period.durationDays}`,
        );
      }
    });
  });
});

// =============================================================================
// EDGE CASES
// =============================================================================

describe('Edge Cases', () => {
  describe('Station near 0°/360° boundary', () => {
    it('should handle station points crossing 0°', () => {
      // This is more of a robustness test
      // Find any station and verify it has valid longitude
      const stations = findStationPoints(CelestialBody.Mars, J2000_JD, J2000_JD + 365 * 3);

      for (const station of stations) {
        assert.ok(station.longitude >= 0, 'Longitude should be ≥0');
        assert.ok(station.longitude < 360, 'Longitude should be <360');
      }
    });
  });

  describe('Very slow planets', () => {
    it('should find Pluto retrograde periods', () => {
      // Pluto moves very slowly, need long search window
      const periods = findRetrogradePeriods(CelestialBody.Pluto, J2000_JD, J2000_JD + 365 * 3);

      // Pluto should have 2-3 Rx periods in 3 years
      assert.ok(periods.length >= 1, `Expected ≥1 Pluto Rx in 3 years, got ${periods.length}`);

      // Pluto Rx typically 5-6 months
      for (const period of periods) {
        assert.ok(period.durationDays > 140, `Pluto Rx should be >140 days`);
        assert.ok(period.durationDays < 200, `Pluto Rx should be <200 days`);
      }
    });
  });
});

// =============================================================================
// PERFORMANCE TESTS
// =============================================================================

describe('Performance', () => {
  it('should find station points quickly', () => {
    const start = Date.now();

    for (const body of RETROGRADE_PLANETS) {
      findStationPoints(body, J2000_JD, J2000_JD + 365);
    }

    const elapsed = Date.now() - start;
    assert.ok(elapsed < 5000, `Finding all planet stations should take <5s, took ${elapsed}ms`);
  });

  it('should find retrograde periods quickly', () => {
    const start = Date.now();

    findRetrogradePeriods(CelestialBody.Mercury, J2000_JD, J2000_JD + 365 * 5);

    const elapsed = Date.now() - start;
    assert.ok(elapsed < 3000, `5 years of Mercury Rx should take <3s, took ${elapsed}ms`);
  });
});
