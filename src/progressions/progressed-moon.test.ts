/**
 * Tests for Progressed Moon Specializations
 *
 * @remarks
 * Validates Moon progression calculations, the fastest-moving progressed body.
 *
 * Sources:
 * - Swiss Ephemeris for reference positions
 * - Solar Fire for cross-validation of Moon transits
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { MOON_MEAN_DAILY_MOTION } from './constants.js';
import { birthToJD, targetToJD } from './progression-date.js';
import {
  calculateMoonSignTransits,
  formatMoonTransit,
  formatProgressedMoonReport,
  getAgeAtNextMoonSignChange,
  getMoonReturnAges,
  getMoonZodiacCycles,
  getProgressedLunarPhase,
  getProgressedMoon,
  getProgressedMoonFromDates,
  getProgressedMoonReport,
} from './progressed-moon.js';

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
  latitude: 51.5,
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
// CORE MOON CALCULATIONS
// =============================================================================

describe('progressions/progressed-moon', () => {
  describe('getProgressedMoon', () => {
    it('should return natal position when target = birth', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const moon = getProgressedMoon(birthJD, birthJD);

      assert.ok(
        Math.abs(moon.progressedLongitude - moon.natalLongitude) < 0.01,
        `Natal: ${moon.natalLongitude}, Progressed: ${moon.progressedLongitude}`,
      );
      assert.equal(moon.name, 'Moon');
      assert.ok(!moon.isRetrograde, 'Moon should never be retrograde');
    });

    it('should advance ~13° per year in secondary progressions', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const targetJD = birthJD + 365.25; // 1 year
      const moon = getProgressedMoon(birthJD, targetJD);

      // Moon moves ~13° per day in progressions
      const expectedArc = MOON_MEAN_DAILY_MOTION;
      assert.ok(
        moon.arcFromNatal > expectedArc * 0.9 && moon.arcFromNatal < expectedArc * 1.1,
        `Expected ~${expectedArc}°, got ${moon.arcFromNatal}°`,
      );
    });

    it('should complete one zodiac cycle in ~27-28 years', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const cycleYears = 360 / MOON_MEAN_DAILY_MOTION; // ~27.3 years
      const targetJD = birthJD + cycleYears * 365.25;
      const moon = getProgressedMoon(birthJD, targetJD);

      // After one cycle, Moon should be back near natal position
      // Arc should be ~360° (one full cycle)
      assert.ok(
        moon.arcFromNatal > 355 && moon.arcFromNatal < 365,
        `Expected ~360°, got ${moon.arcFromNatal}°`,
      );
    });

    it('should track multiple cycles for long periods', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const targetJD = birthJD + 60 * 365.25; // 60 years (~2.2 cycles)
      const moon = getProgressedMoon(birthJD, targetJD);

      // After 60 years at ~13°/year = ~780° = 2+ cycles
      assert.ok(
        moon.arcFromNatal > 750 && moon.arcFromNatal < 810,
        `Expected ~780° total arc, got ${moon.arcFromNatal}°`,
      );
    });

    it('should always report direct motion', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const moon = getProgressedMoon(birthJD, birthJD + 30 * 365.25);

      assert.equal(moon.arcDirection, 'direct');
      assert.ok(!moon.isRetrograde);
    });
  });

  describe('getProgressedMoonFromDates', () => {
    it('should work with date objects', () => {
      const target = { year: 2030, month: 1, day: 1 };
      const moon = getProgressedMoonFromDates(J2000_BIRTH, target);

      // 30 years → ~30 * 13° = ~390°
      assert.ok(moon.arcFromNatal > 380 && moon.arcFromNatal < 400);
    });
  });

  // =============================================================================
  // LUNAR PHASE CALCULATIONS
  // =============================================================================

  describe('getProgressedLunarPhase', () => {
    it('should return valid phase information', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const targetJD = birthJD + 10 * 365.25;
      const phase = getProgressedLunarPhase(birthJD, targetJD);

      assert.ok(phase.phaseName);
      assert.ok(phase.phaseAngle >= 0 && phase.phaseAngle < 360);
      assert.ok(phase.daysUntilNextPhase >= 0);
      assert.ok(phase.description);
    });

    it('should have phase names for all angles', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const phaseNames = new Set<string>();

      // Check phases at different times
      for (let years = 0; years < 30; years += 0.5) {
        const targetJD = birthJD + years * 365.25;
        const phase = getProgressedLunarPhase(birthJD, targetJD);
        phaseNames.add(phase.phaseName);
      }

      // Should encounter multiple different phases
      assert.ok(phaseNames.size >= 4, `Found ${phaseNames.size} different phases`);
    });
  });

  // =============================================================================
  // SIGN TRANSIT CALCULATIONS
  // =============================================================================

  describe('calculateMoonSignTransits', () => {
    it('should return transit array starting with natal sign', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const transits = calculateMoonSignTransits(birthJD);

      assert.ok(transits.length > 0);
      // First transit should start at age 0
      assert.equal(transits[0].entryAge, 0);
    });

    it('should have approximately 2.3 years per sign', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const transits = calculateMoonSignTransits(birthJD, 30);

      // After 30 years, should have ~12-13 sign changes
      assert.ok(
        transits.length >= 12 && transits.length <= 15,
        `Expected ~12-13 transits in 30 years, got ${transits.length}`,
      );

      // Full transits (not first or last partial) should be ~2.3 years
      if (transits.length > 2) {
        const midTransit = transits[Math.floor(transits.length / 2)];
        assert.ok(
          midTransit.durationYears > 2 && midTransit.durationYears < 3,
          `Expected ~2.3 years, got ${midTransit.durationYears}`,
        );
      }
    });

    it('should cover all 12 signs in ~28 years', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const transits = calculateMoonSignTransits(birthJD, 30);

      const signsVisited = new Set(transits.map((t) => t.signIndex));

      // Should visit all 12 signs in 30 years
      assert.equal(signsVisited.size, 12, `Expected 12 signs, got ${signsVisited.size}`);
    });

    it('should have contiguous sign indices', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const transits = calculateMoonSignTransits(birthJD, 30);

      for (let i = 1; i < transits.length; i++) {
        const prevSign = transits[i - 1].signIndex;
        const currentSign = transits[i].signIndex;
        const expectedSign = (prevSign + 1) % 12;
        assert.equal(
          currentSign,
          expectedSign,
          `Sign sequence broken at index ${i}: ${prevSign} -> ${currentSign}`,
        );
      }
    });
  });

  describe('getAgeAtNextMoonSignChange', () => {
    it('should return age greater than current age', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const currentAge = 10;
      const nextChange = getAgeAtNextMoonSignChange(birthJD, currentAge);

      assert.ok(nextChange > currentAge);
    });

    it('should be within ~2.3 years of current age', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const currentAge = 10;
      const nextChange = getAgeAtNextMoonSignChange(birthJD, currentAge);

      // Max time to next sign change is ~2.3 years
      assert.ok(
        nextChange - currentAge <= 2.5,
        `Expected <= 2.5 years until next sign, got ${nextChange - currentAge}`,
      );
    });
  });

  // =============================================================================
  // ZODIAC CYCLE CALCULATIONS
  // =============================================================================

  describe('getMoonZodiacCycles', () => {
    it('should return 0 complete cycles for short periods', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const targetJD = birthJD + 10 * 365.25; // 10 years
      const cycles = getMoonZodiacCycles(birthJD, targetJD);

      assert.equal(cycles.complete, 0);
      assert.ok(cycles.fractional > 0 && cycles.fractional < 1);
    });

    it('should return 1 complete cycle after ~27 years', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const cycleYears = 360 / MOON_MEAN_DAILY_MOTION;
      const targetJD = birthJD + cycleYears * 365.25;
      const cycles = getMoonZodiacCycles(birthJD, targetJD);

      assert.equal(cycles.complete, 1);
    });

    it('should return ~2 cycles after 55 years', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const targetJD = birthJD + 55 * 365.25;
      const cycles = getMoonZodiacCycles(birthJD, targetJD);

      // 55 years / 27.3 years per cycle ≈ 2 cycles
      assert.ok(cycles.complete >= 1 && cycles.complete <= 2);
    });

    it('should have consistent total degrees', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const targetJD = birthJD + 30 * 365.25;
      const cycles = getMoonZodiacCycles(birthJD, targetJD);

      // Total degrees = complete cycles * 360 + fractional * 360
      const expectedTotal = (cycles.complete + cycles.fractional) * 360;
      assert.ok(
        Math.abs(cycles.totalDegrees - expectedTotal) < 1,
        `Total degrees inconsistent: ${cycles.totalDegrees} vs ${expectedTotal}`,
      );
    });
  });

  describe('getMoonReturnAges', () => {
    it('should return array of return ages', () => {
      const returns = getMoonReturnAges();

      assert.equal(returns.length, 3);
      // First return at ~27 years
      assert.ok(returns[0] > 26 && returns[0] < 29);
      // Second return at ~54 years
      assert.ok(returns[1] > 53 && returns[1] < 56);
      // Third return at ~81 years
      assert.ok(returns[2] > 80 && returns[2] < 84);
    });
  });

  // =============================================================================
  // COMPREHENSIVE REPORT
  // =============================================================================

  describe('getProgressedMoonReport', () => {
    it('should generate complete report', () => {
      const target = { year: 2030, month: 1, day: 1 };
      const report = getProgressedMoonReport(J2000_BIRTH, target);

      assert.ok(report.current);
      assert.ok(report.phase);
      assert.ok(report.signTransits.length > 0);
      assert.ok(report.ageAtNextSignChange >= 0);
      assert.ok(typeof report.zodiacCyclesCompleted === 'number');
    });

    it('should have consistent current position', () => {
      const target = { year: 2030, month: 1, day: 1 };
      const report = getProgressedMoonReport(J2000_BIRTH, target);

      assert.equal(report.current.name, 'Moon');
      assert.ok(report.current.progressedLongitude >= 0);
      assert.ok(report.current.progressedLongitude < 360);
    });
  });

  // =============================================================================
  // FORMATTING
  // =============================================================================

  describe('formatMoonTransit', () => {
    it('should format transit information', () => {
      const transit = {
        signIndex: 3,
        signName: 'Cancer',
        entryAge: 5.5,
        exitAge: 7.8,
        durationYears: 2.3,
      };

      const formatted = formatMoonTransit(transit);

      assert.ok(formatted.includes('Cancer'));
      assert.ok(formatted.includes('5.5'));
      assert.ok(formatted.includes('7.8'));
    });
  });

  describe('formatProgressedMoonReport', () => {
    it('should format full report', () => {
      const target = { year: 2030, month: 1, day: 1 };
      const report = getProgressedMoonReport(J2000_BIRTH, target);
      const formatted = formatProgressedMoonReport(report);

      assert.ok(formatted.includes('Progressed Moon Report'));
      assert.ok(formatted.includes('Current Position'));
      assert.ok(formatted.includes('Lunar Phase'));
      assert.ok(formatted.includes('Sign Transits'));
    });
  });

  // =============================================================================
  // REAL-WORLD VALIDATION
  // =============================================================================

  describe('Real-world validation', () => {
    it('should calculate Einstein Moon at Nobel Prize', () => {
      const nobelTarget = { year: 1921, month: 12, day: 10 };
      const moon = getProgressedMoonFromDates(EINSTEIN_BIRTH, nobelTarget);

      // Age at Nobel ≈ 42.74 years
      // Moon moves ~13°/year → ~555° total arc
      assert.ok(
        moon.arcFromNatal > 540 && moon.arcFromNatal < 570,
        `Moon arc: ${moon.arcFromNatal}`,
      );
    });

    it('should produce reasonable sign transit timeline', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const transits = calculateMoonSignTransits(birthJD, 30);

      // Timeline should be monotonically increasing
      for (let i = 1; i < transits.length; i++) {
        assert.ok(
          transits[i].entryAge >= transits[i - 1].exitAge - 0.01,
          `Timeline not monotonic at ${i}: ${transits[i - 1].exitAge} -> ${transits[i].entryAge}`,
        );
      }
    });

    it('should have consistent Moon position across methods', () => {
      const birthJD = birthToJD(J2000_BIRTH);
      const targetJD = birthJD + 30 * 365.25;

      const moon = getProgressedMoon(birthJD, targetJD);
      const cycles = getMoonZodiacCycles(birthJD, targetJD);

      // Total arc from moon.arcFromNatal should roughly equal cycles.totalDegrees
      const arcDiff = Math.abs(moon.arcFromNatal - cycles.totalDegrees);
      assert.ok(
        arcDiff < 5,
        `Arc mismatch: ${moon.arcFromNatal} vs ${cycles.totalDegrees}`,
      );
    });
  });
});

