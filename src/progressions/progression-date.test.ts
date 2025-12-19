/**
 * Tests for Progression Date Calculations
 *
 * @remarks
 * Validates the core Julian Date calculations for progressions.
 *
 * Sources for validation:
 * - Swiss Ephemeris for JD calculations
 * - Hand calculations for progression timing
 * - Known celebrity birth data from Astrodatabank
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  ageToTargetJD,
  birthToJD,
  calculateAge,
  calculateAgeInDays,
  calculateProgressedJD,
  daysUntilMilestone,
  formatProgressedDate,
  getDaysInMonth,
  getProgressedJD,
  getProgressionDates,
  isLeapYear,
  jdToProgressedDate,
  progressedJDToAge,
  progressedJDToTargetJD,
  targetToJD,
  validateProgressionDates,
  validateProgressionDatesSafe,
} from './progression-date.js';
import { ProgressionValidationError } from './types.js';

// =============================================================================
// REFERENCE DATA
// =============================================================================

/**
 * J2000.0 Epoch reference point.
 * JD = 2451545.0 at Jan 1, 2000, 12:00 UT
 */
const J2000_EPOCH = {
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
 * Albert Einstein birth data.
 * Source: Astrodatabank (Rodden AA)
 */
const EINSTEIN_BIRTH = {
  year: 1879,
  month: 3,
  day: 14,
  hour: 11,
  minute: 30,
  second: 0,
  timezone: 0.667, // LMT for Ulm (10°E)
  latitude: 48.4,
  longitude: 10.0,
};

/**
 * Queen Elizabeth II birth data.
 * Source: Astrodatabank (Rodden AA)
 */
const QE2_BIRTH = {
  year: 1926,
  month: 4,
  day: 21,
  hour: 2,
  minute: 40,
  second: 0,
  timezone: 1, // BST
  latitude: 51.5,
  longitude: -0.167,
};

// =============================================================================
// DATE UTILITIES
// =============================================================================

describe('progressions/progression-date', () => {
  describe('getDaysInMonth', () => {
    it('should return 31 for January', () => {
      assert.equal(getDaysInMonth(2000, 1), 31);
    });

    it('should return 28 for February in non-leap year', () => {
      assert.equal(getDaysInMonth(2023, 2), 28);
    });

    it('should return 29 for February in leap year', () => {
      assert.equal(getDaysInMonth(2024, 2), 29);
    });

    it('should return 30 for April', () => {
      assert.equal(getDaysInMonth(2000, 4), 30);
    });

    it('should return 31 for December', () => {
      assert.equal(getDaysInMonth(2000, 12), 31);
    });
  });

  describe('isLeapYear', () => {
    it('should identify 2000 as leap year (divisible by 400)', () => {
      assert.ok(isLeapYear(2000));
    });

    it('should identify 2024 as leap year (divisible by 4)', () => {
      assert.ok(isLeapYear(2024));
    });

    it('should NOT identify 1900 as leap year (divisible by 100 but not 400)', () => {
      assert.ok(!isLeapYear(1900));
    });

    it('should NOT identify 2023 as leap year', () => {
      assert.ok(!isLeapYear(2023));
    });
  });

  describe('birthToJD', () => {
    it('should calculate correct JD for J2000.0 epoch', () => {
      const jd = birthToJD(J2000_EPOCH);
      assert.equal(jd, 2451545.0);
    });

    it('should handle timezone conversion correctly', () => {
      // Noon local time at +1 timezone = 11:00 UT
      const birth = {
        year: 2000,
        month: 1,
        day: 1,
        hour: 12,
        minute: 0,
        second: 0,
        timezone: 1,
        latitude: 0,
        longitude: 0,
      };
      const jd = birthToJD(birth);
      // Should be 1 hour before J2000.0
      const expected = 2451545.0 - 1 / 24;
      assert.ok(Math.abs(jd - expected) < 0.0001, `Expected ~${expected}, got ${jd}`);
    });

    it('should handle negative timezone (west of Greenwich)', () => {
      // Noon local time at -5 timezone = 17:00 UT
      const birth = {
        year: 2000,
        month: 1,
        day: 1,
        hour: 12,
        minute: 0,
        second: 0,
        timezone: -5,
        latitude: 0,
        longitude: 0,
      };
      const jd = birthToJD(birth);
      // Should be 5 hours after J2000.0
      const expected = 2451545.0 + 5 / 24;
      assert.ok(Math.abs(jd - expected) < 0.0001, `Expected ~${expected}, got ${jd}`);
    });

    it('should handle day rollover from timezone (crossing midnight backward)', () => {
      // 1:00 local on Jan 1 at +5 timezone = 20:00 UT on Dec 31
      const birth = {
        year: 2000,
        month: 1,
        day: 1,
        hour: 1,
        minute: 0,
        second: 0,
        timezone: 5,
        latitude: 0,
        longitude: 0,
      };
      const jd = birthToJD(birth);
      // Should be Dec 31, 1999 at 20:00 UT
      // That's 16 hours before J2000.0
      const expected = 2451545.0 - 16 / 24;
      assert.ok(Math.abs(jd - expected) < 0.0001, `Expected ~${expected}, got ${jd}`);
    });
  });

  describe('targetToJD', () => {
    it('should calculate correct JD for target date', () => {
      const target = { year: 2000, month: 1, day: 1 };
      const jd = targetToJD(target);
      // Default is noon
      assert.equal(jd, 2451545.0);
    });

    it('should handle specified time', () => {
      const target = { year: 2000, month: 1, day: 1, hour: 18, minute: 0 };
      const jd = targetToJD(target);
      // 18:00 UT = J2000.0 + 6 hours
      const expected = 2451545.0 + 6 / 24;
      assert.ok(Math.abs(jd - expected) < 0.0001);
    });
  });

  describe('jdToProgressedDate', () => {
    it('should convert J2000.0 back to Jan 1, 2000', () => {
      const date = jdToProgressedDate(2451545.0);
      assert.equal(date.year, 2000);
      assert.equal(date.month, 1);
      assert.equal(date.day, 1);
      assert.equal(date.hour, 12);
    });

    it('should handle fractional days correctly', () => {
      // J2000.0 + 0.5 days = Jan 2, 2000 at 0:00 UT
      const date = jdToProgressedDate(2451545.5);
      assert.equal(date.year, 2000);
      assert.equal(date.month, 1);
      assert.equal(date.day, 2);
      assert.equal(date.hour, 0);
    });
  });

  // =============================================================================
  // AGE CALCULATIONS
  // =============================================================================

  describe('calculateAge', () => {
    it('should return 0 for same date', () => {
      const jd = birthToJD(J2000_EPOCH);
      const age = calculateAge(jd, jd);
      assert.equal(age, 0);
    });

    it('should return ~1 for one year later', () => {
      const birthJD = birthToJD(J2000_EPOCH);
      const targetJD = targetToJD({ year: 2001, month: 1, day: 1 });
      const age = calculateAge(birthJD, targetJD);
      // Should be very close to 1 year
      assert.ok(age > 0.99 && age < 1.01, `Expected ~1, got ${age}`);
    });

    it('should calculate correct age for Einstein at Nobel Prize', () => {
      const birthJD = birthToJD(EINSTEIN_BIRTH);
      const nobelDate = { year: 1921, month: 12, day: 10 };
      const targetJD = targetToJD(nobelDate);
      const age = calculateAge(birthJD, targetJD);
      // Einstein was 42 years old at Nobel Prize
      assert.ok(age > 42.5 && age < 43, `Expected ~42.7, got ${age}`);
    });
  });

  describe('calculateAgeInDays', () => {
    it('should return 0 for same date', () => {
      const jd = birthToJD(J2000_EPOCH);
      const days = calculateAgeInDays(jd, jd);
      assert.equal(days, 0);
    });

    it('should return ~365 for one year later', () => {
      const birthJD = birthToJD(J2000_EPOCH);
      const targetJD = targetToJD({ year: 2001, month: 1, day: 1 });
      const days = calculateAgeInDays(birthJD, targetJD);
      assert.ok(days > 364 && days < 367);
    });
  });

  describe('ageToTargetJD', () => {
    it('should return birth JD for age 0', () => {
      const birthJD = birthToJD(J2000_EPOCH);
      const targetJD = ageToTargetJD(birthJD, 0);
      assert.equal(targetJD, birthJD);
    });

    it('should return correct JD for age 30', () => {
      const birthJD = birthToJD(J2000_EPOCH);
      const targetJD = ageToTargetJD(birthJD, 30);
      const expectedJD = birthJD + 30 * 365.25;
      assert.ok(Math.abs(targetJD - expectedJD) < 0.0001);
    });
  });

  // =============================================================================
  // PROGRESSED DATE CALCULATIONS
  // =============================================================================

  describe('getProgressedJD', () => {
    describe('secondary progressions', () => {
      it('should return birth JD for target = birth', () => {
        const birthJD = birthToJD(J2000_EPOCH);
        const progJD = getProgressedJD(birthJD, birthJD, 'secondary');
        assert.equal(progJD, birthJD);
      });

      it('should add 1 day for 1 year of age', () => {
        const birthJD = birthToJD(J2000_EPOCH);
        const targetJD = ageToTargetJD(birthJD, 1);
        const progJD = getProgressedJD(birthJD, targetJD, 'secondary');
        // 1 year = 1 day in secondary progressions
        assert.ok(Math.abs(progJD - birthJD - 1) < 0.01);
      });

      it('should add ~30 days for 30 years of age', () => {
        const birthJD = birthToJD(J2000_EPOCH);
        const targetJD = ageToTargetJD(birthJD, 30);
        const progJD = getProgressedJD(birthJD, targetJD, 'secondary');
        // 30 years = 30 days
        const daysFromBirth = progJD - birthJD;
        assert.ok(Math.abs(daysFromBirth - 30) < 0.01, `Expected 30 days, got ${daysFromBirth}`);
      });

      it('should calculate correct progressed date for Einstein at age 42', () => {
        const birthJD = birthToJD(EINSTEIN_BIRTH);
        const nobelDate = { year: 1921, month: 12, day: 10 };
        const targetJD = targetToJD(nobelDate);
        const progJD = getProgressedJD(birthJD, targetJD, 'secondary');

        // Age at Nobel ≈ 42.74 years
        // Progressed chart = birth + 42.74 days
        const daysFromBirth = progJD - birthJD;
        assert.ok(
          daysFromBirth > 42.5 && daysFromBirth < 43,
          `Expected ~42.74 days, got ${daysFromBirth}`,
        );
      });
    });

    describe('solar-arc progressions', () => {
      it('should use same rate as secondary', () => {
        const birthJD = birthToJD(J2000_EPOCH);
        const targetJD = ageToTargetJD(birthJD, 30);
        const secondaryJD = getProgressedJD(birthJD, targetJD, 'secondary');
        const solarArcJD = getProgressedJD(birthJD, targetJD, 'solar-arc');
        assert.equal(solarArcJD, secondaryJD);
      });
    });

    describe('minor progressions', () => {
      it('should use ~27.3 days per year (tropical month)', () => {
        const birthJD = birthToJD(J2000_EPOCH);
        const targetJD = ageToTargetJD(birthJD, 1);
        const progJD = getProgressedJD(birthJD, targetJD, 'minor');
        // 1 year = 1 tropical month ≈ 27.32 days
        const daysFromBirth = progJD - birthJD;
        assert.ok(
          daysFromBirth > 27 && daysFromBirth < 28,
          `Expected ~27.32 days, got ${daysFromBirth}`,
        );
      });
    });

    describe('tertiary progressions', () => {
      it('should use 1 day per month (~12 days per year)', () => {
        const birthJD = birthToJD(J2000_EPOCH);
        const targetJD = ageToTargetJD(birthJD, 1);
        const progJD = getProgressedJD(birthJD, targetJD, 'tertiary');
        // Tertiary: 1 day = 1 month, so 1 year = 12 days
        const daysFromBirth = progJD - birthJD;
        assert.ok(
          daysFromBirth > 11.5 && daysFromBirth < 12.5,
          `Expected ~12 days, got ${daysFromBirth}`,
        );
      });
    });
  });

  describe('calculateProgressedJD', () => {
    it('should work with birth and target date objects', () => {
      const target = { year: 2030, month: 1, day: 1 };
      const progJD = calculateProgressedJD(J2000_EPOCH, target, 'secondary');
      // 30 years from J2000 = progressed JD is birthJD + 30 days
      const birthJD = birthToJD(J2000_EPOCH);
      const expected = birthJD + 30;
      assert.ok(Math.abs(progJD - expected) < 0.5, `Expected ~${expected}, got ${progJD}`);
    });
  });

  describe('getProgressionDates', () => {
    it('should return complete date information', () => {
      const target = { year: 2030, month: 1, day: 1 };
      const result = getProgressionDates(J2000_EPOCH, target, 'secondary');

      // Check all fields exist
      assert.ok(result.natalJD);
      assert.ok(result.natalDate);
      assert.ok(result.targetJD);
      assert.ok(result.targetDate);
      assert.ok(result.progressedJD);
      assert.ok(result.progressedDate);
      assert.ok(typeof result.daysFromBirth === 'number');
      assert.ok(typeof result.ageInYears === 'number');

      // Check values are reasonable
      assert.ok(result.ageInYears > 29.9 && result.ageInYears < 30.1);
      assert.ok(result.daysFromBirth > 29.9 && result.daysFromBirth < 30.1);
    });

    it('should have progressed date shortly after birth (for secondary)', () => {
      const target = { year: 2030, month: 1, day: 1 };
      const result = getProgressionDates(J2000_EPOCH, target, 'secondary');

      // Progressed date should be ~30 days after birth for 30 years
      assert.equal(result.progressedDate.year, 2000);
      assert.equal(result.progressedDate.month, 1);
      assert.ok(result.progressedDate.day >= 30 && result.progressedDate.day <= 31);
    });
  });

  // =============================================================================
  // REVERSE CALCULATIONS
  // =============================================================================

  describe('progressedJDToAge', () => {
    it('should return 0 for progressed JD = birth JD', () => {
      const birthJD = birthToJD(J2000_EPOCH);
      const age = progressedJDToAge(birthJD, birthJD, 'secondary');
      assert.equal(age, 0);
    });

    it('should return ~30 for 30 days after birth (secondary)', () => {
      const birthJD = birthToJD(J2000_EPOCH);
      const progJD = birthJD + 30;
      const age = progressedJDToAge(birthJD, progJD, 'secondary');
      assert.ok(Math.abs(age - 30) < 0.01, `Expected 30, got ${age}`);
    });

    it('should be inverse of getProgressedJD', () => {
      const birthJD = birthToJD(J2000_EPOCH);
      const targetJD = ageToTargetJD(birthJD, 42);
      const progJD = getProgressedJD(birthJD, targetJD, 'secondary');
      const recoveredAge = progressedJDToAge(birthJD, progJD, 'secondary');
      assert.ok(Math.abs(recoveredAge - 42) < 0.01);
    });
  });

  describe('progressedJDToTargetJD', () => {
    it('should return birth JD for progressed JD = birth JD', () => {
      const birthJD = birthToJD(J2000_EPOCH);
      const targetJD = progressedJDToTargetJD(birthJD, birthJD, 'secondary');
      assert.equal(targetJD, birthJD);
    });

    it('should be inverse of getProgressedJD', () => {
      const birthJD = birthToJD(J2000_EPOCH);
      const originalTargetJD = ageToTargetJD(birthJD, 42);
      const progJD = getProgressedJD(birthJD, originalTargetJD, 'secondary');
      const recoveredTargetJD = progressedJDToTargetJD(birthJD, progJD, 'secondary');
      assert.ok(Math.abs(recoveredTargetJD - originalTargetJD) < 0.01);
    });
  });

  // =============================================================================
  // VALIDATION
  // =============================================================================

  describe('validateProgressionDates', () => {
    it('should accept valid dates', () => {
      const target = { year: 2030, month: 1, day: 1 };
      assert.doesNotThrow(() => validateProgressionDates(J2000_EPOCH, target));
    });

    it('should reject birth year before MIN_BIRTH_YEAR', () => {
      const oldBirth = { ...J2000_EPOCH, year: 1600 };
      const target = { year: 2030, month: 1, day: 1 };
      assert.throws(
        () => validateProgressionDates(oldBirth, target),
        ProgressionValidationError,
      );
    });

    it('should reject target year after MAX_TARGET_YEAR', () => {
      const target = { year: 2500, month: 1, day: 1 };
      assert.throws(
        () => validateProgressionDates(J2000_EPOCH, target),
        ProgressionValidationError,
      );
    });

    it('should reject target before birth', () => {
      const target = { year: 1999, month: 1, day: 1 };
      assert.throws(
        () => validateProgressionDates(J2000_EPOCH, target),
        ProgressionValidationError,
      );
    });

    it('should reject invalid month', () => {
      const badBirth = { ...J2000_EPOCH, month: 13 };
      const target = { year: 2030, month: 1, day: 1 };
      assert.throws(
        () => validateProgressionDates(badBirth, target),
        ProgressionValidationError,
      );
    });

    it('should reject invalid day', () => {
      const badBirth = { ...J2000_EPOCH, day: 32 };
      const target = { year: 2030, month: 1, day: 1 };
      assert.throws(
        () => validateProgressionDates(badBirth, target),
        ProgressionValidationError,
      );
    });

    it('should reject Feb 29 in non-leap year', () => {
      const badBirth = { ...J2000_EPOCH, year: 2023, month: 2, day: 29 };
      const target = { year: 2030, month: 1, day: 1 };
      assert.throws(
        () => validateProgressionDates(badBirth, target),
        ProgressionValidationError,
      );
    });

    it('should accept Feb 29 in leap year', () => {
      const leapBirth = { ...J2000_EPOCH, month: 2, day: 29 };
      const target = { year: 2030, month: 1, day: 1 };
      assert.doesNotThrow(() => validateProgressionDates(leapBirth, target));
    });

    it('should reject invalid latitude', () => {
      const badBirth = { ...J2000_EPOCH, latitude: 100 };
      const target = { year: 2030, month: 1, day: 1 };
      assert.throws(
        () => validateProgressionDates(badBirth, target),
        ProgressionValidationError,
      );
    });

    it('should reject invalid longitude', () => {
      const badBirth = { ...J2000_EPOCH, longitude: -200 };
      const target = { year: 2030, month: 1, day: 1 };
      assert.throws(
        () => validateProgressionDates(badBirth, target),
        ProgressionValidationError,
      );
    });
  });

  describe('validateProgressionDatesSafe', () => {
    it('should return valid: true for valid dates', () => {
      const target = { year: 2030, month: 1, day: 1 };
      const result = validateProgressionDatesSafe(J2000_EPOCH, target);
      assert.ok(result.valid);
      assert.deepEqual(result.errors, []);
    });

    it('should return valid: false for invalid dates', () => {
      const target = { year: 1999, month: 1, day: 1 };
      const result = validateProgressionDatesSafe(J2000_EPOCH, target);
      assert.ok(!result.valid);
      assert.ok(result.errors.length > 0);
    });
  });

  // =============================================================================
  // UTILITY FUNCTIONS
  // =============================================================================

  describe('formatProgressedDate', () => {
    it('should format date without time', () => {
      const date = { year: 2000, month: 1, day: 15 };
      const formatted = formatProgressedDate(date);
      assert.equal(formatted, 'January 15, 2000');
    });

    it('should format date with time when requested', () => {
      const date = { year: 2000, month: 6, day: 15, hour: 14, minute: 30 };
      const formatted = formatProgressedDate(date, true);
      assert.equal(formatted, 'June 15, 2000 at 14:30');
    });

    it('should handle all months', () => {
      for (let month = 1; month <= 12; month++) {
        const date = { year: 2000, month, day: 1 };
        const formatted = formatProgressedDate(date);
        assert.ok(formatted.includes('2000'));
      }
    });
  });

  describe('daysUntilMilestone', () => {
    it('should return 0 for current age = milestone', () => {
      const birthJD = birthToJD(J2000_EPOCH);
      const days = daysUntilMilestone(birthJD, 30, 30, 'secondary');
      assert.equal(days, 0);
    });

    it('should return positive days for future milestone', () => {
      const birthJD = birthToJD(J2000_EPOCH);
      const days = daysUntilMilestone(birthJD, 30, 40, 'secondary');
      // 10 years = 10 days in secondary progressions
      assert.equal(days, 10);
    });

    it('should return negative days for past milestone', () => {
      const birthJD = birthToJD(J2000_EPOCH);
      const days = daysUntilMilestone(birthJD, 40, 30, 'secondary');
      assert.equal(days, -10);
    });
  });

  // =============================================================================
  // REAL-WORLD VALIDATION (Celebrity Data)
  // =============================================================================

  describe('Real-world validation', () => {
    it('should calculate Einstein birth JD correctly', () => {
      const jd = birthToJD(EINSTEIN_BIRTH);
      // Einstein born March 14, 1879 at 11:30 LMT Ulm
      // LMT offset for Ulm (10°E) = +40 minutes
      // UT = 11:30 - 0:40 = 10:50
      // Expected JD around 2407422.95
      assert.ok(jd > 2407422 && jd < 2407423, `Expected ~2407422.95, got ${jd}`);
    });

    it('should calculate QE2 birth JD correctly', () => {
      const jd = birthToJD(QE2_BIRTH);
      // QE2 born April 21, 1926 at 2:40 BST London
      // BST = UT + 1, so UT = 1:40 = 1.67h from midnight
      // JD at midnight is X.5, so at 1:40 UT it's X.5 + 1.67/24 = X.57
      // Expected JD around 2424626.57 (verified with Swiss Ephemeris style calculation)
      assert.ok(jd > 2424626 && jd < 2424627, `Expected ~2424626.57, got ${jd}`);
    });

    it('should calculate progressed dates for Einstein at key ages', () => {
      const birthJD = birthToJD(EINSTEIN_BIRTH);

      // Age 26 (1905 - Annus Mirabilis)
      const target1905 = { year: 1905, month: 6, day: 1 };
      const progJD1905 = calculateProgressedJD(EINSTEIN_BIRTH, target1905, 'secondary');
      const daysFrom1905 = progJD1905 - birthJD;
      assert.ok(
        daysFrom1905 > 26 && daysFrom1905 < 27,
        `Expected ~26 days for age 26, got ${daysFrom1905}`,
      );

      // Age 42.74 (Nobel Prize, Dec 1921)
      const targetNobel = { year: 1921, month: 12, day: 10 };
      const progJDNobel = calculateProgressedJD(EINSTEIN_BIRTH, targetNobel, 'secondary');
      const daysFromNobel = progJDNobel - birthJD;
      assert.ok(
        daysFromNobel > 42.5 && daysFromNobel < 43,
        `Expected ~42.74 days for Nobel, got ${daysFromNobel}`,
      );
    });

    it('should calculate progressed dates for QE2 at Coronation', () => {
      const birthJD = birthToJD(QE2_BIRTH);
      // Coronation: June 2, 1953 - age ~27.12
      const coronation = { year: 1953, month: 6, day: 2 };
      const progJD = calculateProgressedJD(QE2_BIRTH, coronation, 'secondary');
      const daysFromBirth = progJD - birthJD;
      assert.ok(
        daysFromBirth > 27 && daysFromBirth < 27.5,
        `Expected ~27.12 days for Coronation, got ${daysFromBirth}`,
      );
    });
  });

  // =============================================================================
  // EDGE CASES
  // =============================================================================

  describe('Edge cases', () => {
    it('should handle very old ages (90+)', () => {
      const birthJD = birthToJD(J2000_EPOCH);
      const targetJD = ageToTargetJD(birthJD, 90);
      const progJD = getProgressedJD(birthJD, targetJD, 'secondary');
      const daysFromBirth = progJD - birthJD;
      assert.ok(Math.abs(daysFromBirth - 90) < 0.01);
    });

    it('should handle fractional ages precisely', () => {
      const birthJD = birthToJD(J2000_EPOCH);
      const targetJD = ageToTargetJD(birthJD, 35.5);
      const progJD = getProgressedJD(birthJD, targetJD, 'secondary');
      const daysFromBirth = progJD - birthJD;
      assert.ok(Math.abs(daysFromBirth - 35.5) < 0.01);
    });

    it('should handle midnight births', () => {
      const midnightBirth = {
        ...J2000_EPOCH,
        hour: 0,
        minute: 0,
      };
      const jd = birthToJD(midnightBirth);
      // Midnight UT = 0.0 fractional day
      // JD for Jan 1, 2000 at 0:00 UT = 2451544.5
      assert.ok(Math.abs(jd - 2451544.5) < 0.0001);
    });

    it('should handle year boundary crossing in progressions', () => {
      // Birth: Dec 30, 1999
      const lateBirth = {
        ...J2000_EPOCH,
        year: 1999,
        month: 12,
        day: 30,
      };
      // Progress to age 5 → 5 days after birth
      // That's Jan 4, 2000
      const target = { year: 2005, month: 1, day: 1 };
      const result = getProgressionDates(lateBirth, target, 'secondary');
      // Check progressed date is in year 2000
      assert.equal(result.progressedDate.year, 2000);
    });
  });
});

