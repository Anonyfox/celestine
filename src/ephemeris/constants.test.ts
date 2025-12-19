/**
 * Tests for Ephemeris Constants
 *
 * @remarks
 * Verifies that all astronomical constants match their cited sources
 * and are internally consistent.
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  ABERRATION_CONSTANT_ARCSEC,
  ARCMINUTES_PER_DEGREE,
  ARCSEC_TO_RAD,
  ARCSECONDS_PER_ARCMINUTE,
  ARCSECONDS_PER_DEGREE,
  AU_IN_KM,
  CONVERGENCE_TOLERANCE,
  DAYS_PER_JULIAN_CENTURY,
  DAYS_PER_JULIAN_MILLENNIUM,
  DEG_TO_RAD,
  DEGREES_PER_CIRCLE,
  EARTH_ECCENTRICITY,
  J2000_EPOCH,
  LIGHT_TIME_PER_AU_DAYS,
  MAX_ITERATIONS,
  MAX_JULIAN_DATE,
  MIN_JULIAN_DATE,
  NUTATION_D,
  NUTATION_F,
  NUTATION_M,
  NUTATION_M_PRIME,
  NUTATION_OMEGA,
  OBLIQUITY_COEFFICIENTS,
  OBLIQUITY_J2000_DEG,
  RAD_TO_DEG,
  SPEED_OF_LIGHT_KM_S,
  SUN_EQUATION_OF_CENTER,
  SUN_MEAN_ANOMALY,
  SUN_MEAN_LONGITUDE,
} from './constants.js';

describe('ephemeris/constants', () => {
  describe('Time constants', () => {
    it('J2000 epoch should be January 1, 2000, 12:00 TT', () => {
      // This is the standard astronomical epoch
      // Verified against: USNO, IAU, Meeus
      assert.equal(J2000_EPOCH, 2451545.0);
    });

    it('Julian century should be exactly 36525 days', () => {
      // 100 years × 365.25 days/year
      assert.equal(DAYS_PER_JULIAN_CENTURY, 36525);
    });

    it('Julian millennium should be exactly 365250 days', () => {
      // 1000 years × 365.25 days/year
      assert.equal(DAYS_PER_JULIAN_MILLENNIUM, 365250);
      assert.equal(DAYS_PER_JULIAN_MILLENNIUM, DAYS_PER_JULIAN_CENTURY * 10);
    });
  });

  describe('Angular constants', () => {
    it('should have correct degree conversions', () => {
      assert.equal(DEGREES_PER_CIRCLE, 360);
      assert.equal(ARCMINUTES_PER_DEGREE, 60);
      assert.equal(ARCSECONDS_PER_DEGREE, 3600);
      assert.equal(ARCSECONDS_PER_ARCMINUTE, 60);
    });

    it('DEG_TO_RAD should correctly convert 180° to π', () => {
      const piRad = 180 * DEG_TO_RAD;
      assert.ok(Math.abs(piRad - Math.PI) < 1e-15);
    });

    it('RAD_TO_DEG should correctly convert π to 180°', () => {
      const piDeg = Math.PI * RAD_TO_DEG;
      assert.ok(Math.abs(piDeg - 180) < 1e-13);
    });

    it('DEG_TO_RAD and RAD_TO_DEG should be inverses', () => {
      const original = 45.5;
      const converted = original * DEG_TO_RAD * RAD_TO_DEG;
      assert.ok(Math.abs(converted - original) < 1e-14);
    });

    it('ARCSEC_TO_RAD should convert 1" correctly', () => {
      // 1" = 1/3600 degree = π/(180×3600) radians
      const expected = Math.PI / (180 * 3600);
      assert.ok(Math.abs(ARCSEC_TO_RAD - expected) < 1e-20);
    });
  });

  describe('Distance constants', () => {
    it('AU should be exactly 149,597,870.700 km (IAU 2012)', () => {
      // This is the exact IAU definition
      assert.equal(AU_IN_KM, 149_597_870.7);
    });

    it('Speed of light should be exactly 299,792.458 km/s (SI)', () => {
      // This is exact by SI definition
      assert.equal(SPEED_OF_LIGHT_KM_S, 299_792.458);
    });

    it('Light-time per AU should be approximately 0.00577 days (~8.3 minutes)', () => {
      // Light takes ~8.317 minutes to travel 1 AU
      // 8.317 minutes = 0.00577 days
      const expectedMinutes = AU_IN_KM / SPEED_OF_LIGHT_KM_S / 60;
      assert.ok(Math.abs(expectedMinutes - 8.317) < 0.001);

      const expectedDays = AU_IN_KM / (SPEED_OF_LIGHT_KM_S * 86400);
      assert.ok(Math.abs(LIGHT_TIME_PER_AU_DAYS - expectedDays) < 1e-10);
      assert.ok(Math.abs(LIGHT_TIME_PER_AU_DAYS - 0.00577552) < 0.00001);
    });
  });

  describe('Obliquity constants', () => {
    it('J2000 obliquity should be approximately 23.439°', () => {
      // IAU 1976: 23°26'21.448"
      // In degrees: 23 + 26/60 + 21.448/3600 = 23.4392911...
      assert.ok(Math.abs(OBLIQUITY_J2000_DEG - 23.4392911) < 0.0000001);
    });

    it('Obliquity coefficients c0 should match J2000 value', () => {
      assert.equal(OBLIQUITY_COEFFICIENTS.c0, OBLIQUITY_J2000_DEG);
    });

    it('Obliquity coefficients should produce correct values', () => {
      // At T=0 (J2000.0), should equal c0
      const { c0, c1, c2, c3 } = OBLIQUITY_COEFFICIENTS;
      const T = 0;
      const obliquity = c0 + c1 * T + c2 * T ** 2 + c3 * T ** 3;
      assert.equal(obliquity, c0);

      // At T=1 (year 2100), obliquity should be slightly less
      const T1 = 1;
      const obliquity2100 = c0 + c1 * T1 + c2 * T1 ** 2 + c3 * T1 ** 3;
      assert.ok(obliquity2100 < c0); // Obliquity is decreasing
      // Should be about 23.43° - 46.8"/century ≈ 23.426°
      assert.ok(Math.abs(obliquity2100 - 23.426) < 0.001);
    });
  });

  describe('Sun calculation constants', () => {
    it('Sun mean longitude at J2000 should be ~280.46°', () => {
      // From Meeus Table 25.a
      assert.ok(Math.abs(SUN_MEAN_LONGITUDE.c0 - 280.46646) < 0.00001);
    });

    it('Sun mean anomaly at J2000 should be ~357.53°', () => {
      // From Meeus Table 25.a
      assert.ok(Math.abs(SUN_MEAN_ANOMALY.c0 - 357.52911) < 0.00001);
    });

    it('Earth eccentricity at J2000 should be ~0.0167', () => {
      // Earth's orbit is nearly circular
      assert.ok(Math.abs(EARTH_ECCENTRICITY.c0 - 0.016708634) < 0.0000001);
    });

    it('Equation of center coefficients should be from Meeus', () => {
      // Primary coefficient ~1.9146° for sin(M)
      assert.ok(Math.abs(SUN_EQUATION_OF_CENTER.c1_base - 1.914602) < 0.000001);
    });
  });

  describe('Aberration constant', () => {
    it('should be approximately 20.496 arcseconds', () => {
      // IAU 1976 value: 20.49552"
      assert.ok(Math.abs(ABERRATION_CONSTANT_ARCSEC - 20.49552) < 0.00001);
    });
  });

  describe('Nutation fundamental arguments', () => {
    it('should have D (mean elongation) from Meeus Table 22.a', () => {
      assert.ok(Math.abs(NUTATION_D.c0 - 297.85036) < 0.00001);
    });

    it('should have M (Sun mean anomaly) from Meeus Table 22.a', () => {
      assert.ok(Math.abs(NUTATION_M.c0 - 357.52772) < 0.00001);
    });

    it("should have M' (Moon mean anomaly) from Meeus Table 22.a", () => {
      assert.ok(Math.abs(NUTATION_M_PRIME.c0 - 134.96298) < 0.00001);
    });

    it('should have F (Moon argument of latitude) from Meeus Table 22.a', () => {
      assert.ok(Math.abs(NUTATION_F.c0 - 93.27191) < 0.00001);
    });

    it("should have Ω (Moon's node) from Meeus Table 22.a", () => {
      assert.ok(Math.abs(NUTATION_OMEGA.c0 - 125.04452) < 0.00001);
    });
  });

  describe('Precision constants', () => {
    it('Convergence tolerance should be very small', () => {
      assert.equal(CONVERGENCE_TOLERANCE, 1e-10);
      assert.ok(CONVERGENCE_TOLERANCE < 1e-9);
    });

    it('Max iterations should be reasonable', () => {
      assert.equal(MAX_ITERATIONS, 50);
      assert.ok(MAX_ITERATIONS >= 10);
      assert.ok(MAX_ITERATIONS <= 100);
    });
  });

  describe('Validation constants', () => {
    it('MIN_JULIAN_DATE should be around year 1800', () => {
      // JD 2378497 = Jan 1, 1800
      assert.equal(MIN_JULIAN_DATE, 2378497);
    });

    it('MAX_JULIAN_DATE should be around year 2200', () => {
      // JD 2524594 = Jan 1, 2200
      assert.equal(MAX_JULIAN_DATE, 2524594);
    });

    it('J2000 should be within valid range', () => {
      assert.ok(J2000_EPOCH > MIN_JULIAN_DATE);
      assert.ok(J2000_EPOCH < MAX_JULIAN_DATE);
    });

    it('Valid range should span ~400 years', () => {
      const rangeDays = MAX_JULIAN_DATE - MIN_JULIAN_DATE;
      const rangeYears = rangeDays / 365.25;
      assert.ok(Math.abs(rangeYears - 400) < 1);
    });
  });

  describe('Cross-validation', () => {
    it('Sun mean longitude rate should be ~360°/year', () => {
      // Earth orbits Sun once per year
      // c1 is degrees per century = 36000.76983
      // Per year = 36000.76983 / 100 ≈ 360.0077
      const degreesPerYear = SUN_MEAN_LONGITUDE.c1 / 100;
      assert.ok(Math.abs(degreesPerYear - 360) < 1);
    });

    it('Sun mean anomaly rate should be ~360°/year', () => {
      // Mean anomaly also completes once per year
      const degreesPerYear = SUN_MEAN_ANOMALY.c1 / 100;
      assert.ok(Math.abs(degreesPerYear - 360) < 1);
    });
  });
});
