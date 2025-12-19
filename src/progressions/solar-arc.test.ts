/**
 * Tests for Solar Arc Calculations
 *
 * @remarks
 * Validates solar arc calculations against known values and astronomical data.
 *
 * Sources:
 * - Noel Tyl "Solar Arcs" for methodology
 * - Swiss Ephemeris for Sun positions
 * - Hand calculations for verification
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { SUN_MEAN_DAILY_MOTION } from './constants.js';
import { birthToJD, targetToJD } from './progression-date.js';
import {
  applySolarArc,
  applySolarArcToMany,
  calculateSolarArc,
  calculateSolarArcFromDates,
  createDirectedPosition,
  estimateAgeForDirectedPosition,
  estimateAgeForSolarArc,
  estimateSolarArc,
  formatSolarArc,
  formatSolarArcDMS,
  getNatalSunLongitude,
  getProgressedSunLongitude,
  isWithinAspectOrb,
  longitudeToZodiacPosition,
  solarArcForAspect,
} from './solar-arc.js';

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

// =============================================================================
// CORE SOLAR ARC CALCULATIONS
// =============================================================================

describe('progressions/solar-arc', () => {
  describe('calculateSolarArc', () => {
    it('should return 0 for birth date = target date', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const arc = calculateSolarArc(birthJD, birthJD);
      assert.ok(Math.abs(arc) < 0.01, `Expected ~0, got ${arc}`);
    });

    it('should return ~1° for 1 year of age', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const targetJD = birthJD + 365.25; // 1 year
      const arc = calculateSolarArc(birthJD, targetJD);
      // Sun moves ~0.9856° per day = ~0.9856° per year in progressions
      assert.ok(arc > 0.95 && arc < 1.05, `Expected ~1°, got ${arc}°`);
    });

    it('should return ~30° for 30 years of age', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const targetJD = birthJD + 30 * 365.25; // 30 years
      const arc = calculateSolarArc(birthJD, targetJD);
      // Should be close to 30° (varies slightly due to Sun's variable motion)
      assert.ok(arc > 29 && arc < 31, `Expected ~30°, got ${arc}°`);
    });

    it('should return ~90° for 90 years of age', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const targetJD = birthJD + 90 * 365.25; // 90 years
      const arc = calculateSolarArc(birthJD, targetJD);
      assert.ok(arc > 88 && arc < 92, `Expected ~90°, got ${arc}°`);
    });

    it('should calculate solar arc for Einstein at Nobel Prize', () => {
      const birthJD = birthToJD(EINSTEIN_BIRTH);
      const nobelDate = { year: 1921, month: 12, day: 10 };
      const targetJD = targetToJD(nobelDate);
      const arc = calculateSolarArc(birthJD, targetJD);
      // Age at Nobel ≈ 42.74 years → solar arc ≈ 42.74°
      assert.ok(arc > 42 && arc < 44, `Expected ~42.7°, got ${arc}°`);
    });
  });

  describe('calculateSolarArcFromDates', () => {
    it('should work with date objects', () => {
      const target = { year: 2030, month: 1, day: 1 };
      const arc = calculateSolarArcFromDates(J2000_BIRTH, target);
      // 30 years → ~30°
      assert.ok(arc > 29 && arc < 31, `Expected ~30°, got ${arc}°`);
    });
  });

  describe('estimateSolarArc', () => {
    it('should estimate ~0.9856° for 1 year', () => {
      const arc = estimateSolarArc(1);
      assert.ok(
        Math.abs(arc - SUN_MEAN_DAILY_MOTION) < 0.001,
        `Expected ${SUN_MEAN_DAILY_MOTION}, got ${arc}`,
      );
    });

    it('should estimate ~30° for ~30 years', () => {
      const arc = estimateSolarArc(30);
      const expected = 30 * SUN_MEAN_DAILY_MOTION;
      assert.ok(Math.abs(arc - expected) < 0.001, `Expected ${expected}, got ${arc}`);
    });

    it('should return 0 for age 0', () => {
      assert.equal(estimateSolarArc(0), 0);
    });
  });

  describe('getNatalSunLongitude', () => {
    it('should return Sun position at J2000.0', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const sunLong = getNatalSunLongitude(birthJD);
      // Sun at J2000.0 ≈ 280.37° (10°22' Capricorn)
      assert.ok(sunLong > 279 && sunLong < 282, `Expected ~280°, got ${sunLong}°`);
    });
  });

  describe('getProgressedSunLongitude', () => {
    it('should return natal Sun position for target = birth', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const natalSun = getNatalSunLongitude(birthJD);
      const progressedSun = getProgressedSunLongitude(birthJD, birthJD);
      assert.ok(
        Math.abs(progressedSun - natalSun) < 0.01,
        `Expected ${natalSun}, got ${progressedSun}`,
      );
    });

    it('should advance ~30° for 30 years', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const targetJD = birthJD + 30 * 365.25;
      const natalSun = getNatalSunLongitude(birthJD);
      const progressedSun = getProgressedSunLongitude(birthJD, targetJD);
      const advancement = (progressedSun - natalSun + 360) % 360;
      assert.ok(advancement > 29 && advancement < 31, `Expected ~30° advance, got ${advancement}°`);
    });
  });

  // =============================================================================
  // APPLYING SOLAR ARC
  // =============================================================================

  describe('applySolarArc', () => {
    it('should add arc to natal position', () => {
      const directed = applySolarArc(100, 30);
      assert.equal(directed, 130);
    });

    it('should handle wraparound at 360°', () => {
      const directed = applySolarArc(350, 30);
      assert.equal(directed, 20); // 350 + 30 = 380 → 20
    });

    it('should handle zero arc', () => {
      const directed = applySolarArc(100, 0);
      assert.equal(directed, 100);
    });

    it('should handle large arcs', () => {
      const directed = applySolarArc(100, 370);
      assert.equal(directed, 110); // 100 + 370 = 470 → 110
    });
  });

  describe('applySolarArcToMany', () => {
    it('should apply arc to multiple positions', () => {
      const natal = [0, 90, 180, 270];
      const directed = applySolarArcToMany(natal, 30);
      assert.deepEqual(directed, [30, 120, 210, 300]);
    });

    it('should handle wraparound for multiple positions', () => {
      const natal = [340, 350, 0, 10];
      const directed = applySolarArcToMany(natal, 30);
      assert.deepEqual(directed, [10, 20, 30, 40]);
    });
  });

  describe('longitudeToZodiacPosition', () => {
    it('should convert 0° to 0° Aries', () => {
      const result = longitudeToZodiacPosition(0);
      assert.equal(result.signIndex, 0);
      assert.equal(result.signName, 'Aries');
      assert.equal(result.degree, 0);
    });

    it('should convert 45° to 15° Taurus', () => {
      const result = longitudeToZodiacPosition(45);
      assert.equal(result.signIndex, 1);
      assert.equal(result.signName, 'Taurus');
      assert.equal(result.degree, 15);
    });

    it('should convert 280° to ~10° Capricorn', () => {
      const result = longitudeToZodiacPosition(280);
      assert.equal(result.signIndex, 9);
      assert.equal(result.signName, 'Capricorn');
      assert.equal(result.degree, 10);
    });

    it('should handle edge of sign', () => {
      const result = longitudeToZodiacPosition(29.99);
      assert.equal(result.signIndex, 0);
      assert.equal(result.signName, 'Aries');
      assert.equal(result.degree, 29);
    });

    it('should handle first degree of next sign', () => {
      const result = longitudeToZodiacPosition(30);
      assert.equal(result.signIndex, 1);
      assert.equal(result.signName, 'Taurus');
      assert.equal(result.degree, 0);
    });

    it('should include formatted string', () => {
      const result = longitudeToZodiacPosition(45.5);
      assert.ok(result.formatted.includes('Taurus'));
      assert.ok(result.formatted.includes('15'));
    });
  });

  describe('createDirectedPosition', () => {
    it('should create complete position object', () => {
      const result = createDirectedPosition(100, 30);

      assert.equal(result.longitude, 130);
      assert.equal(result.natalLongitude, 100);
      assert.equal(result.arcFromNatal, 30);
      assert.ok(result.signName);
      assert.ok(result.formatted);
    });

    it('should detect sign change', () => {
      // Natal at 29° Aries (29°), directed by 2° → 31° = 1° Taurus
      const result = createDirectedPosition(29, 2);
      assert.ok(result.hasChangedSign);
    });

    it('should detect no sign change', () => {
      // Natal at 10° Aries (10°), directed by 5° → 15° Aries
      const result = createDirectedPosition(10, 5);
      assert.ok(!result.hasChangedSign);
    });
  });

  // =============================================================================
  // REVERSE CALCULATIONS
  // =============================================================================

  describe('estimateAgeForSolarArc', () => {
    it('should return ~1 year for 1° arc', () => {
      const age = estimateAgeForSolarArc(SUN_MEAN_DAILY_MOTION);
      assert.ok(Math.abs(age - 1) < 0.01, `Expected ~1, got ${age}`);
    });

    it('should return ~30 years for ~30° arc', () => {
      const arc = 30 * SUN_MEAN_DAILY_MOTION;
      const age = estimateAgeForSolarArc(arc);
      assert.ok(Math.abs(age - 30) < 0.01, `Expected ~30, got ${age}`);
    });

    it('should return 0 for 0° arc', () => {
      assert.equal(estimateAgeForSolarArc(0), 0);
    });
  });

  describe('estimateAgeForDirectedPosition', () => {
    it('should calculate age for simple forward direction', () => {
      // Natal at 100°, target at 130° → arc of 30°
      const age = estimateAgeForDirectedPosition(100, 130);
      const expectedAge = 30 / SUN_MEAN_DAILY_MOTION;
      assert.ok(Math.abs(age - expectedAge) < 0.1, `Expected ~${expectedAge}, got ${age}`);
    });

    it('should handle wraparound', () => {
      // Natal at 350°, target at 20° → arc of 30° (crossing 0°)
      const age = estimateAgeForDirectedPosition(350, 20);
      const expectedAge = 30 / SUN_MEAN_DAILY_MOTION;
      assert.ok(Math.abs(age - expectedAge) < 0.1, `Expected ~${expectedAge}, got ${age}`);
    });
  });

  // =============================================================================
  // ASPECT CALCULATIONS
  // =============================================================================

  describe('solarArcForAspect', () => {
    it('should find arc for conjunction', () => {
      // Natal Mars at 100°, Natal Sun at 130°
      // Conjunction (0°) when Mars is directed to 130°
      // Arc needed = 130 - 100 = 30°
      const arcs = solarArcForAspect(100, 130, 0);
      assert.ok(arcs.includes(30) || arcs.some((a) => Math.abs(a - 30) < 0.1));
    });

    it('should find arc for square (90°)', () => {
      // Natal Mars at 100°, Natal Sun at 50°
      // Square when Mars at 140° (50 + 90) or 320° (50 - 90 + 360)
      const arcs = solarArcForAspect(100, 50, 90);
      // Arc to 140° = 40°, Arc to 320° = 220°
      assert.ok(
        arcs.some((a) => Math.abs(a - 40) < 0.1),
        `Expected arc ~40° in ${arcs}`,
      );
    });

    it('should return sorted arcs', () => {
      const arcs = solarArcForAspect(100, 50, 90);
      for (let i = 1; i < arcs.length; i++) {
        assert.ok(arcs[i] >= arcs[i - 1], 'Arcs should be sorted');
      }
    });
  });

  describe('isWithinAspectOrb', () => {
    it('should return true for exact aspect', () => {
      // Directed at 140°, Natal at 50° → separation = 90° (exact square)
      const result = isWithinAspectOrb(140, 50, 90, 1);
      assert.ok(result);
    });

    it('should return true within orb', () => {
      // Directed at 139°, Natal at 50° → separation = 89° (1° from square)
      const result = isWithinAspectOrb(139, 50, 90, 1);
      assert.ok(result);
    });

    it('should return false outside orb', () => {
      // Directed at 137°, Natal at 50° → separation = 87° (3° from square)
      const result = isWithinAspectOrb(137, 50, 90, 1);
      assert.ok(!result);
    });

    it('should handle conjunction', () => {
      const result = isWithinAspectOrb(100, 100.5, 0, 1);
      assert.ok(result);
    });

    it('should handle opposition', () => {
      const result = isWithinAspectOrb(100, 280, 180, 1);
      assert.ok(result);
    });
  });

  // =============================================================================
  // FORMATTING
  // =============================================================================

  describe('formatSolarArc', () => {
    it('should format with default precision', () => {
      const formatted = formatSolarArc(30.4567);
      assert.equal(formatted, '30.46°');
    });

    it('should format with custom precision', () => {
      const formatted = formatSolarArc(30.4567, 1);
      assert.equal(formatted, '30.5°');
    });

    it('should format zero', () => {
      const formatted = formatSolarArc(0);
      assert.equal(formatted, '0.00°');
    });
  });

  describe('formatSolarArcDMS', () => {
    it('should format whole degrees', () => {
      const formatted = formatSolarArcDMS(30);
      assert.equal(formatted, '30°00\'00"');
    });

    it('should format with minutes', () => {
      const formatted = formatSolarArcDMS(30.5);
      assert.equal(formatted, '30°30\'00"');
    });

    it('should format with seconds', () => {
      const formatted = formatSolarArcDMS(30.5167); // 30° 31' 00"
      assert.ok(formatted.includes('30°'));
      assert.ok(formatted.includes('31'));
    });
  });

  // =============================================================================
  // REAL-WORLD VALIDATION
  // =============================================================================

  describe('Real-world validation', () => {
    it('should produce consistent results for Einstein', () => {
      const birthJD = birthToJD(EINSTEIN_BIRTH);

      // At age 0, solar arc should be 0
      const arcAtBirth = calculateSolarArc(birthJD, birthJD);
      assert.ok(Math.abs(arcAtBirth) < 0.01, `Arc at birth: ${arcAtBirth}`);

      // At Nobel Prize (age ~42.74), arc should be ~42.74°
      const nobelDate = { year: 1921, month: 12, day: 10 };
      const nobelJD = targetToJD(nobelDate);
      const arcAtNobel = calculateSolarArc(birthJD, nobelJD);
      assert.ok(
        arcAtNobel > 42 && arcAtNobel < 44,
        `Arc at Nobel: ${arcAtNobel}, expected ~42.7°`,
      );
    });

    it('should maintain proportionality with age', () => {
      const birthJD = birthToJD(J2000_BIRTH);

      const arc10 = calculateSolarArc(birthJD, birthJD + 10 * 365.25);
      const arc20 = calculateSolarArc(birthJD, birthJD + 20 * 365.25);
      const arc30 = calculateSolarArc(birthJD, birthJD + 30 * 365.25);

      // Arc should be roughly proportional to age
      // arc20 should be roughly 2x arc10
      const ratio20to10 = arc20 / arc10;
      assert.ok(ratio20to10 > 1.9 && ratio20to10 < 2.1, `Ratio 20/10: ${ratio20to10}`);

      // arc30 should be roughly 3x arc10
      const ratio30to10 = arc30 / arc10;
      assert.ok(ratio30to10 > 2.9 && ratio30to10 < 3.1, `Ratio 30/10: ${ratio30to10}`);
    });
  });
});

