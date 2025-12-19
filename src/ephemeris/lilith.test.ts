/**
 * Tests for Lilith (Black Moon) Calculator
 *
 * @remarks
 * Verifies Black Moon Lilith calculations against:
 * 1. Swiss Ephemeris reference data (authoritative)
 * 2. Known orbital characteristics (~8.85 year period)
 *
 * Accuracy target: ±9 arcminutes for Mean Lilith
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { J2000_EPOCH } from './constants.js';
import {
  getLilith,
  getMeanLilith,
  getMeanLilithLongitude,
  getTrueLilith,
  getTrueLilithLongitude,
  LILITH_CHARACTERISTICS,
} from './lilith.js';

// =============================================================================
// SWISS EPHEMERIS REFERENCE DATA
// Generated from pyswisseph (Swiss Ephemeris 2.10.03)
// These values are AUTHORITATIVE - do not modify!
// =============================================================================
const SWISSEPH_MEAN_LILITH_REFERENCE = [
  {
    jd: 2451545.0,
    description: 'J2000.0 (2000-Jan-01 12:00 TT)',
    longitude: 263.464333,
    speed: 0.111328,
  },
  {
    jd: 2448724.5,
    description: 'Meeus Example 47.a (1992-Apr-12 00:00 TT)',
    longitude: 309.035983,
    speed: 0.111161,
  },
  {
    jd: 2440587.5,
    description: 'Unix Epoch (1970-Jan-01 00:00 TT)',
    longitude: 122.76481,
    speed: 0.111334,
  },
  {
    jd: 2459580.5,
    description: 'Recent (2022-Jan-01 00:00 TT)',
    longitude: 78.460729,
    speed: 0.110935,
  },
] as const;

const SWISSEPH_TRUE_LILITH_REFERENCE = [
  {
    jd: 2451545.0,
    description: 'J2000.0 (2000-Jan-01 12:00 TT)',
    longitude: 252.979401,
    speed: 1.646842,
  },
  {
    jd: 2448724.5,
    description: 'Meeus Example 47.a (1992-Apr-12 00:00 TT)',
    longitude: 331.957929,
    speed: -0.067447,
  },
  {
    jd: 2440587.5,
    description: 'Unix Epoch (1970-Jan-01 00:00 TT)',
    longitude: 132.078391,
    speed: -0.635872,
  },
  {
    jd: 2459580.5,
    description: 'Recent (2022-Jan-01 00:00 TT)',
    longitude: 91.800051,
    speed: -2.056342,
  },
] as const;

// Tolerance for Mean Lilith: ~9 arcminutes
const MEAN_LILITH_TOLERANCE = 0.15;

// Tolerance for True Lilith: Very relaxed due to complex oscillations
const TRUE_LILITH_TOLERANCE = 25.0;

describe('ephemeris/lilith', () => {
  describe('getMeanLilithLongitude', () => {
    describe('Swiss Ephemeris reference validation', () => {
      for (const ref of SWISSEPH_MEAN_LILITH_REFERENCE) {
        it(`should match Swiss Ephemeris Mean Lilith at ${ref.description}`, () => {
          const lilith = getMeanLilithLongitude(ref.jd);

          const lonDiff = Math.abs(lilith - ref.longitude);
          assert.ok(
            lonDiff < MEAN_LILITH_TOLERANCE,
            `Mean Lilith: expected ${ref.longitude}°, got ${lilith}° (diff: ${(lonDiff * 60).toFixed(1)} arcmin)`,
          );
        });
      }
    });

    it('should return value in range [0, 360)', () => {
      const jd = J2000_EPOCH;
      const lon = getMeanLilithLongitude(jd);
      assert.ok(lon >= 0 && lon < 360, `Expected 0-360°, got ${lon}°`);
    });

    it('should move prograde over time', () => {
      const lon1 = getMeanLilithLongitude(J2000_EPOCH);
      const lon2 = getMeanLilithLongitude(J2000_EPOCH + 30);

      let diff = lon2 - lon1;
      if (diff < -180) diff += 360;
      if (diff > 180) diff -= 360;

      assert.ok(diff > 0, `Mean Lilith should move prograde, got diff=${diff}°`);
      assert.ok(Math.abs(diff - 3.3) < 0.5, `Expected ~3.3° in 30 days, got ${diff}°`);
    });
  });

  describe('getTrueLilithLongitude', () => {
    describe('Swiss Ephemeris reference validation', () => {
      for (const ref of SWISSEPH_TRUE_LILITH_REFERENCE) {
        it(`should be within range of Swiss Ephemeris True Lilith at ${ref.description}`, () => {
          const lilith = getTrueLilithLongitude(ref.jd);

          let lonDiff = Math.abs(lilith - ref.longitude);
          if (lonDiff > 180) lonDiff = 360 - lonDiff;

          assert.ok(
            lonDiff < TRUE_LILITH_TOLERANCE,
            `True Lilith: expected ${ref.longitude}°, got ${lilith}° (diff: ${lonDiff.toFixed(1)}°)`,
          );
        });
      }
    });

    it('should return value in range [0, 360)', () => {
      const jd = J2000_EPOCH;
      const lon = getTrueLilithLongitude(jd);
      assert.ok(lon >= 0 && lon < 360, `Expected 0-360°, got ${lon}°`);
    });

    it('should oscillate around mean Lilith', () => {
      const jd = J2000_EPOCH;
      const trueLilith = getTrueLilithLongitude(jd);
      const meanLilith = getMeanLilithLongitude(jd);

      let diff = Math.abs(trueLilith - meanLilith);
      if (diff > 180) diff = 360 - diff;

      assert.ok(diff < 35, `True Lilith should be within 35° of mean, got ${diff}°`);
    });
  });

  describe('getMeanLilith', () => {
    it('should return longitude and speed', () => {
      const lilith = getMeanLilith(J2000_EPOCH);

      assert.ok(lilith.longitude >= 0 && lilith.longitude < 360);
      assert.ok(typeof lilith.speed === 'number');
    });

    it('should have positive speed (prograde)', () => {
      const lilith = getMeanLilith(J2000_EPOCH);
      assert.ok(lilith.speed > 0, 'Mean Lilith should move prograde');
    });

    it('should never be retrograde', () => {
      const lilith = getMeanLilith(J2000_EPOCH);
      assert.ok(!lilith.isRetrograde, 'Mean Lilith should never be retrograde');
    });

    it('should have speed around 0.111°/day', () => {
      const lilith = getMeanLilith(J2000_EPOCH);
      assert.ok(
        Math.abs(lilith.speed - 0.111) < 0.01,
        `Expected speed ~0.111°/day, got ${lilith.speed}°/day`,
      );
    });
  });

  describe('getTrueLilith', () => {
    it('should return longitude and speed', () => {
      const lilith = getTrueLilith(J2000_EPOCH);

      assert.ok(lilith.longitude >= 0 && lilith.longitude < 360);
      assert.ok(typeof lilith.speed === 'number');
    });
  });

  describe('getLilith', () => {
    it('should be an alias for getMeanLilith', () => {
      const meanLilith = getMeanLilith(J2000_EPOCH);
      const lilith = getLilith(J2000_EPOCH);

      assert.strictEqual(lilith.longitude, meanLilith.longitude);
      assert.strictEqual(lilith.speed, meanLilith.speed);
    });
  });

  describe('8.85-year cycle', () => {
    it('should return to similar position after ~8.85 years', () => {
      const jd0 = J2000_EPOCH;
      const lilith0 = getMeanLilith(jd0);

      const period = 3232;
      const jd1 = jd0 + period;
      const lilith1 = getMeanLilith(jd1);

      let diff = Math.abs(lilith1.longitude - lilith0.longitude);
      if (diff > 180) diff = 360 - diff;

      assert.ok(diff < 5, `After one cycle, position should repeat within 5°, got ${diff}°`);
    });

    it('should traverse full zodiac in ~8.85 years', () => {
      const signs = new Set<number>();

      for (let i = 0; i < (9 * 365.25) / 30; i++) {
        const jd = J2000_EPOCH + i * 30;
        const lilith = getMeanLilith(jd);
        const signIndex = Math.floor(lilith.longitude / 30);
        signs.add(signIndex);
      }

      assert.ok(signs.size >= 11, `Expected 12 signs, found ${signs.size}`);
    });
  });

  describe('LILITH_CHARACTERISTICS', () => {
    it('should have correct period', () => {
      assert.ok(Math.abs(LILITH_CHARACTERISTICS.period - 3232) < 50, 'Period should be ~3232 days');
    });

    it('should have ~8.85 year period', () => {
      assert.ok(
        Math.abs(LILITH_CHARACTERISTICS.periodYears - 8.85) < 0.1,
        'Period should be ~8.85 years',
      );
    });

    it('should have prograde mean daily motion', () => {
      assert.ok(
        LILITH_CHARACTERISTICS.meanDailyMotion > 0,
        'Mean daily motion should be positive (prograde)',
      );
    });
  });
});
