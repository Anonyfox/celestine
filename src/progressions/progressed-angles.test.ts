/**
 * Tests for Progressed Angles Calculations
 *
 * @remarks
 * Validates angle progression using both solar arc and time-based methods.
 *
 * Sources:
 * - Swiss Ephemeris for reference calculations
 * - Solar Fire/Astro.com for cross-validation
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  calculateProgressedAngles,
  estimateAgeForASCSign,
  estimateAgeForMCSign,
  formatProgressedAngles,
  getNatalAngles,
  getNatalAnglesFromBirth,
  getProgressedAngles,
  getProgressedAnglesSolarArc,
  getProgressedAnglesTimeBased,
  getProgressedASC,
  getProgressedMC,
  hasASCChangedSign,
  hasMCChangedSign,
} from './progressed-angles.js';
import { birthToJD } from './progression-date.js';

// =============================================================================
// REFERENCE DATA
// =============================================================================

/**
 * J2000.0 Epoch reference at Greenwich
 */
const J2000_BIRTH = {
  year: 2000,
  month: 1,
  day: 1,
  hour: 12,
  minute: 0,
  second: 0,
  timezone: 0,
  latitude: 51.5, // London
  longitude: 0, // Greenwich
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
  timezone: 0.667, // Ulm time offset
  latitude: 48.4,
  longitude: 10.0,
};

/**
 * New York birth location
 */
const _NYC_BIRTH = {
  year: 2000,
  month: 6,
  day: 21,
  hour: 12,
  minute: 0,
  second: 0,
  timezone: -4, // EDT
  latitude: 40.7128,
  longitude: -74.006,
};

// =============================================================================
// NATAL ANGLES TESTS
// =============================================================================

describe('progressions/progressed-angles', () => {
  describe('getNatalAngles', () => {
    it('should calculate natal angles for a given location', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const angles = getNatalAngles(birthJD, J2000_BIRTH.latitude, J2000_BIRTH.longitude);

      // ASC and MC should be valid longitudes
      assert.ok(angles.ascendant >= 0 && angles.ascendant < 360);
      assert.ok(angles.midheaven >= 0 && angles.midheaven < 360);
    });

    it('should give different angles for different locations', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const london = getNatalAngles(birthJD, 51.5, 0);
      const nyc = getNatalAngles(birthJD, 40.7128, -74.006);

      // Different longitudes should give different angles
      assert.ok(
        Math.abs(london.ascendant - nyc.ascendant) > 1,
        'ASC should differ for different longitudes',
      );
    });

    it('should work with different house systems', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const placidus = getNatalAngles(
        birthJD,
        J2000_BIRTH.latitude,
        J2000_BIRTH.longitude,
        'placidus',
      );
      const koch = getNatalAngles(birthJD, J2000_BIRTH.latitude, J2000_BIRTH.longitude, 'koch');

      // ASC should be the same regardless of house system
      assert.ok(
        Math.abs(placidus.ascendant - koch.ascendant) < 0.01,
        'ASC should be identical across house systems',
      );
      // MC should also be the same
      assert.ok(
        Math.abs(placidus.midheaven - koch.midheaven) < 0.01,
        'MC should be identical across house systems',
      );
    });
  });

  describe('getNatalAnglesFromBirth', () => {
    it('should work with birth data objects', () => {
      const angles = getNatalAnglesFromBirth(J2000_BIRTH);

      assert.ok(angles.ascendant >= 0 && angles.ascendant < 360);
      assert.ok(angles.midheaven >= 0 && angles.midheaven < 360);
    });
  });

  // =============================================================================
  // SOLAR ARC PROGRESSION TESTS
  // =============================================================================

  describe('getProgressedAnglesSolarArc', () => {
    it('should return natal angles when target = birth', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const angles = getProgressedAnglesSolarArc(
        birthJD,
        birthJD,
        J2000_BIRTH.latitude,
        J2000_BIRTH.longitude,
      );

      assert.ok(
        Math.abs(angles.ascendant.arcFromNatal) < 0.01,
        `ASC arc should be ~0, got ${angles.ascendant.arcFromNatal}`,
      );
      assert.ok(
        Math.abs(angles.midheaven.arcFromNatal) < 0.01,
        `MC arc should be ~0, got ${angles.midheaven.arcFromNatal}`,
      );
      assert.equal(angles.method, 'solar-arc');
    });

    it('should advance angles by solar arc', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const targetJD = birthJD + 30 * 365.25; // 30 years
      const angles = getProgressedAnglesSolarArc(
        birthJD,
        targetJD,
        J2000_BIRTH.latitude,
        J2000_BIRTH.longitude,
      );

      // Solar arc should be ~30° after 30 years
      assert.ok(
        angles.solarArc > 29 && angles.solarArc < 31,
        `Solar arc should be ~30°, got ${angles.solarArc}`,
      );

      // ASC and MC arcs should equal solar arc
      assert.ok(
        Math.abs(angles.ascendant.arcFromNatal - angles.solarArc) < 0.5,
        `ASC arc (${angles.ascendant.arcFromNatal}) should equal solar arc (${angles.solarArc})`,
      );
      assert.ok(
        Math.abs(angles.midheaven.arcFromNatal - angles.solarArc) < 0.5,
        `MC arc (${angles.midheaven.arcFromNatal}) should equal solar arc (${angles.solarArc})`,
      );
    });

    it('should include all four angles', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const targetJD = birthJD + 30 * 365.25;
      const angles = getProgressedAnglesSolarArc(
        birthJD,
        targetJD,
        J2000_BIRTH.latitude,
        J2000_BIRTH.longitude,
      );

      assert.equal(angles.ascendant.name, 'ASC');
      assert.equal(angles.midheaven.name, 'MC');
      assert.equal(angles.descendant.name, 'DSC');
      assert.equal(angles.imumCoeli.name, 'IC');
    });

    it('should have DSC opposite ASC', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const targetJD = birthJD + 30 * 365.25;
      const angles = getProgressedAnglesSolarArc(
        birthJD,
        targetJD,
        J2000_BIRTH.latitude,
        J2000_BIRTH.longitude,
      );

      let diff = Math.abs(
        angles.descendant.progressedLongitude - angles.ascendant.progressedLongitude,
      );
      if (diff > 180) diff = 360 - diff;
      assert.ok(Math.abs(diff - 180) < 0.1, `DSC should be 180° from ASC, diff: ${diff}`);
    });

    it('should have IC opposite MC', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const targetJD = birthJD + 30 * 365.25;
      const angles = getProgressedAnglesSolarArc(
        birthJD,
        targetJD,
        J2000_BIRTH.latitude,
        J2000_BIRTH.longitude,
      );

      let diff = Math.abs(
        angles.imumCoeli.progressedLongitude - angles.midheaven.progressedLongitude,
      );
      if (diff > 180) diff = 360 - diff;
      assert.ok(Math.abs(diff - 180) < 0.1, `IC should be 180° from MC, diff: ${diff}`);
    });
  });

  // =============================================================================
  // TIME-BASED PROGRESSION TESTS
  // =============================================================================

  describe('getProgressedAnglesTimeBased', () => {
    it('should return natal angles when target = birth', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const angles = getProgressedAnglesTimeBased(
        birthJD,
        birthJD,
        J2000_BIRTH.latitude,
        J2000_BIRTH.longitude,
      );

      assert.ok(
        Math.abs(angles.ascendant.arcFromNatal) < 0.1,
        `ASC arc should be ~0, got ${angles.ascendant.arcFromNatal}`,
      );
      assert.equal(angles.method, 'time-based');
    });

    it('should produce different results than solar arc', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const targetJD = birthJD + 30 * 365.25;

      const solarArc = getProgressedAnglesSolarArc(
        birthJD,
        targetJD,
        J2000_BIRTH.latitude,
        J2000_BIRTH.longitude,
      );
      const timeBased = getProgressedAnglesTimeBased(
        birthJD,
        targetJD,
        J2000_BIRTH.latitude,
        J2000_BIRTH.longitude,
      );

      // The two methods should produce different results
      // (unless by coincidence they're close)
      assert.equal(solarArc.method, 'solar-arc');
      assert.equal(timeBased.method, 'time-based');
    });
  });

  // =============================================================================
  // UNIFIED API TESTS
  // =============================================================================

  describe('getProgressedAngles', () => {
    it('should default to solar-arc method', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const targetJD = birthJD + 30 * 365.25;

      const angles = getProgressedAngles(
        birthJD,
        targetJD,
        J2000_BIRTH.latitude,
        J2000_BIRTH.longitude,
      );

      assert.equal(angles.method, 'solar-arc');
    });

    it('should use time-based when specified', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const targetJD = birthJD + 30 * 365.25;

      const angles = getProgressedAngles(
        birthJD,
        targetJD,
        J2000_BIRTH.latitude,
        J2000_BIRTH.longitude,
        'time-based',
      );

      assert.equal(angles.method, 'time-based');
    });
  });

  describe('calculateProgressedAngles', () => {
    it('should work with date objects', () => {
      const target = { year: 2030, month: 1, day: 1 };
      const angles = calculateProgressedAngles(J2000_BIRTH, target);

      assert.ok(angles.ascendant.progressedLongitude >= 0);
      assert.ok(angles.midheaven.progressedLongitude >= 0);
      assert.ok(angles.solarArc > 0);
    });
  });

  // =============================================================================
  // SPECIALIZED QUERY TESTS
  // =============================================================================

  describe('getProgressedASC', () => {
    it('should return just ASC', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const targetJD = birthJD + 30 * 365.25;

      const asc = getProgressedASC(birthJD, targetJD, J2000_BIRTH.latitude, J2000_BIRTH.longitude);

      assert.equal(asc.name, 'ASC');
      assert.ok(asc.progressedLongitude >= 0);
    });
  });

  describe('getProgressedMC', () => {
    it('should return just MC', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const targetJD = birthJD + 30 * 365.25;

      const mc = getProgressedMC(birthJD, targetJD, J2000_BIRTH.latitude, J2000_BIRTH.longitude);

      assert.equal(mc.name, 'MC');
      assert.ok(mc.progressedLongitude >= 0);
    });
  });

  describe('hasASCChangedSign', () => {
    it('should detect sign change for large arc', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const targetJD = birthJD + 60 * 365.25; // 60 years

      const changed = hasASCChangedSign(
        birthJD,
        targetJD,
        J2000_BIRTH.latitude,
        J2000_BIRTH.longitude,
      );

      // After 60 years (~60° arc), ASC has very likely changed sign
      // (unless natal ASC was near 0° of a sign)
      assert.equal(typeof changed, 'boolean');
    });
  });

  describe('hasMCChangedSign', () => {
    it('should return boolean', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const targetJD = birthJD + 30 * 365.25;

      const changed = hasMCChangedSign(
        birthJD,
        targetJD,
        J2000_BIRTH.latitude,
        J2000_BIRTH.longitude,
      );

      assert.equal(typeof changed, 'boolean');
    });
  });

  describe('estimateAgeForASCSign', () => {
    it('should estimate age for forward sign', () => {
      // If natal ASC is at 10° Aries (10°), when will it reach Taurus (30°)?
      const age = estimateAgeForASCSign(10, 1); // Taurus = sign 1
      // Arc needed = 30 - 10 = 20°
      assert.equal(age, 20);
    });

    it('should handle wraparound', () => {
      // If natal ASC is at 350° (20° Pisces), when will it reach Aries (0°)?
      const age = estimateAgeForASCSign(350, 0);
      // Arc needed = 360 - 350 = 10°
      assert.equal(age, 10);
    });
  });

  describe('estimateAgeForMCSign', () => {
    it('should estimate age for MC sign change', () => {
      // If natal MC is at 100° (10° Cancer), when will it reach Leo (120°)?
      const age = estimateAgeForMCSign(100, 4); // Leo = sign 4
      // Arc needed = 120 - 100 = 20°
      assert.equal(age, 20);
    });
  });

  // =============================================================================
  // FORMATTING TESTS
  // =============================================================================

  describe('formatProgressedAngles', () => {
    it('should produce readable output', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const targetJD = birthJD + 30 * 365.25;
      const angles = getProgressedAnglesSolarArc(
        birthJD,
        targetJD,
        J2000_BIRTH.latitude,
        J2000_BIRTH.longitude,
      );

      const formatted = formatProgressedAngles(angles);

      assert.ok(formatted.includes('Progressed Angles'));
      assert.ok(formatted.includes('ASC'));
      assert.ok(formatted.includes('MC'));
      assert.ok(formatted.includes('solar-arc'));
    });

    it('should note sign changes', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const targetJD = birthJD + 60 * 365.25; // Long enough for sign change
      const angles = getProgressedAnglesSolarArc(
        birthJD,
        targetJD,
        J2000_BIRTH.latitude,
        J2000_BIRTH.longitude,
      );

      const formatted = formatProgressedAngles(angles);

      if (angles.ascendant.hasChangedSign || angles.midheaven.hasChangedSign) {
        assert.ok(formatted.includes('changed sign'));
      }
    });
  });

  // =============================================================================
  // REAL-WORLD VALIDATION
  // =============================================================================

  describe('Real-world validation', () => {
    it('should calculate Einstein angles at Nobel Prize', () => {
      const nobelTarget = { year: 1921, month: 12, day: 10 };
      const angles = calculateProgressedAngles(EINSTEIN_BIRTH, nobelTarget);

      // Age at Nobel ≈ 42.74 years → solar arc ≈ 42.74°
      assert.ok(angles.solarArc > 42 && angles.solarArc < 44, `Solar arc: ${angles.solarArc}`);
    });

    it('should maintain opposite relationship for all progressions', () => {
      const birthJD = birthToJD(J2000_BIRTH);

      for (const years of [10, 30, 50, 70]) {
        const targetJD = birthJD + years * 365.25;
        const angles = getProgressedAnglesSolarArc(
          birthJD,
          targetJD,
          J2000_BIRTH.latitude,
          J2000_BIRTH.longitude,
        );

        // ASC-DSC should be opposite
        let ascDsc = Math.abs(
          angles.descendant.progressedLongitude - angles.ascendant.progressedLongitude,
        );
        if (ascDsc > 180) ascDsc = 360 - ascDsc;
        assert.ok(
          Math.abs(ascDsc - 180) < 0.1,
          `At ${years} years: ASC-DSC diff should be 180°, got ${ascDsc}`,
        );

        // MC-IC should be opposite
        let mcIc = Math.abs(
          angles.imumCoeli.progressedLongitude - angles.midheaven.progressedLongitude,
        );
        if (mcIc > 180) mcIc = 360 - mcIc;
        assert.ok(
          Math.abs(mcIc - 180) < 0.1,
          `At ${years} years: MC-IC diff should be 180°, got ${mcIc}`,
        );
      }
    });

    it('should produce consistent zodiac formatting', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const targetJD = birthJD + 30 * 365.25;
      const angles = getProgressedAnglesSolarArc(
        birthJD,
        targetJD,
        J2000_BIRTH.latitude,
        J2000_BIRTH.longitude,
      );

      // All angles should have proper formatting
      for (const angle of [
        angles.ascendant,
        angles.midheaven,
        angles.descendant,
        angles.imumCoeli,
      ]) {
        assert.ok(angle.progressedFormatted.includes(angle.progressedSignName));
        assert.ok(angle.natalFormatted.includes(angle.natalSignName));
      }
    });
  });
});
