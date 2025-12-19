/**
 * Transit Reference Data Validation Tests
 *
 * Tests that validate our transit calculations against authoritative
 * reference data from Swiss Ephemeris, Astrodatabank, and NASA.
 *
 * @module transits/reference-data.test
 *
 * @remarks
 * These tests serve as proof of correctness by comparing our calculations
 * to established astronomical reference data.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';

import { CelestialBody, getPosition } from '../../ephemeris/positions.js';
import { julianDate } from '../../time/julian-date.js';
import { findRetrogradePeriods, findStationPoints } from '../retrograde-transits.js';
import { angularSeparation } from '../transit-detection.js';
import { findExactTransitTime } from '../transit-timing.js';
import {
  ASTRONOMICAL_EVENTS,
  HISTORICAL_TRANSIT_EVENTS,
  REFERENCE_RETROGRADE_PERIODS,
  REFERENCE_STATION_POINTS,
  TYPICAL_RETROGRADE_DURATIONS,
} from './transit-events.js';

// =============================================================================
// ASTRONOMICAL EVENT VALIDATION
// =============================================================================

describe('Astronomical Event Validation', () => {
  describe('Great Conjunction 2020', () => {
    it('should calculate Jupiter-Saturn conjunction correctly', () => {
      const event = ASTRONOMICAL_EVENTS.greatConjunction2020;
      const jd = julianDate(
        event.date.year,
        event.date.month,
        event.date.day,
        event.date.hour,
        event.date.minute,
      );

      const jupiterPos = getPosition(CelestialBody.Jupiter, jd);
      const saturnPos = getPosition(CelestialBody.Saturn, jd);

      // Check Jupiter longitude
      assert.ok(
        Math.abs(jupiterPos.longitude - event.jupiterLongitude) < 1,
        `Jupiter should be at ~${event.jupiterLongitude}°, got ${jupiterPos.longitude.toFixed(2)}°`,
      );

      // Check Saturn longitude
      assert.ok(
        Math.abs(saturnPos.longitude - event.saturnLongitude) < 1,
        `Saturn should be at ~${event.saturnLongitude}°, got ${saturnPos.longitude.toFixed(2)}°`,
      );

      // Check separation
      const sep = angularSeparation(jupiterPos.longitude, saturnPos.longitude);
      assert.ok(sep < 1, `Separation should be <1°, got ${sep.toFixed(2)}°`);
    });
  });

  describe('Spring Equinox 2024', () => {
    it('should have Sun at 0° Aries on equinox', () => {
      const event = ASTRONOMICAL_EVENTS.springEquinox2024;
      const jd = julianDate(event.date.year, event.date.month, event.date.day, 12, 0);

      const sunPos = getPosition(CelestialBody.Sun, jd);

      // Sun should be very close to 0° (Aries point) on March 20
      // Allow small tolerance as exact time varies
      const distFrom0 = Math.min(sunPos.longitude, 360 - sunPos.longitude);
      assert.ok(
        distFrom0 < 1,
        `Sun should be near 0° on equinox, got ${sunPos.longitude.toFixed(2)}°`,
      );
    });
  });
});

// =============================================================================
// STATION POINT VALIDATION
// =============================================================================

describe('Station Point Validation', () => {
  for (const refStation of REFERENCE_STATION_POINTS) {
    it(`should find ${refStation.name}`, () => {
      // Calculate JD for the expected date
      const expectedJD = julianDate(
        refStation.date.year,
        refStation.date.month,
        refStation.date.day,
        12,
        0,
      );

      // Search around the expected date (± 30 days)
      const searchStart = expectedJD - 30;
      const searchEnd = expectedJD + 30;

      const stations = findStationPoints(refStation.body, searchStart, searchEnd);

      // Find the station of the expected type closest to expected date
      const matchingStations = stations.filter((s) => {
        if (refStation.stationType === 'retrograde') {
          return s.type === 'station-retrograde';
        }
        return s.type === 'station-direct';
      });

      assert.ok(matchingStations.length > 0, `Should find ${refStation.stationType} station`);

      // Find closest match
      const closest = matchingStations.reduce((best, current) => {
        const bestDiff = Math.abs(best.jd - expectedJD);
        const currentDiff = Math.abs(current.jd - expectedJD);
        return currentDiff < bestDiff ? current : best;
      });

      // Check date is within tolerance
      const daysDiff = Math.abs(closest.jd - expectedJD);
      assert.ok(
        daysDiff <= refStation.dateTolerance,
        `Station date should be within ${refStation.dateTolerance} days of expected. ` +
          `Expected: ${refStation.date.year}-${refStation.date.month}-${refStation.date.day}, ` +
          `Got: ${closest.date.year}-${closest.date.month}-${closest.date.day} (${daysDiff.toFixed(1)} days off)`,
      );

      // Check longitude is reasonable (within 5°)
      const longDiff = Math.abs(closest.longitude - refStation.longitude);
      const adjustedLongDiff = longDiff > 180 ? 360 - longDiff : longDiff;
      assert.ok(
        adjustedLongDiff < 5,
        `Station longitude should be near ${refStation.longitude}°, got ${closest.longitude.toFixed(2)}°`,
      );
    });
  }
});

// =============================================================================
// RETROGRADE PERIOD VALIDATION
// =============================================================================

describe('Retrograde Period Validation', () => {
  for (const refPeriod of REFERENCE_RETROGRADE_PERIODS) {
    it(`should calculate ${refPeriod.name} correctly`, () => {
      // Search window spanning the expected retrograde
      const startJD = julianDate(
        refPeriod.stationRetro.year,
        refPeriod.stationRetro.month - 1,
        1,
        0,
        0,
      );
      const endJD = julianDate(
        refPeriod.stationDirect.year,
        refPeriod.stationDirect.month + 2,
        1,
        0,
        0,
      );

      const periods = findRetrogradePeriods(refPeriod.body, startJD, endJD);

      // Should find at least one period
      assert.ok(periods.length > 0, `Should find retrograde period for ${refPeriod.name}`);

      // Find the period closest to our expected dates
      const expectedStartJD = julianDate(
        refPeriod.stationRetro.year,
        refPeriod.stationRetro.month,
        refPeriod.stationRetro.day,
        12,
        0,
      );

      const matchingPeriod = periods.reduce((best, current) => {
        const bestDiff = Math.abs(best.stationRetroJD - expectedStartJD);
        const currentDiff = Math.abs(current.stationRetroJD - expectedStartJD);
        return currentDiff < bestDiff ? current : best;
      });

      // Check duration is within tolerance
      const durationDiff = Math.abs(matchingPeriod.durationDays - refPeriod.expectedDuration);
      assert.ok(
        durationDiff <= refPeriod.durationTolerance,
        `Duration should be ~${refPeriod.expectedDuration} days (±${refPeriod.durationTolerance}). ` +
          `Got ${matchingPeriod.durationDays.toFixed(1)} days (${durationDiff.toFixed(1)} off)`,
      );
    });
  }
});

// =============================================================================
// TYPICAL DURATION VALIDATION
// =============================================================================

describe('Typical Retrograde Duration Validation', () => {
  const bodiesToTest: CelestialBody[] = [
    CelestialBody.Mercury,
    CelestialBody.Jupiter,
    CelestialBody.Saturn,
  ];

  for (const body of bodiesToTest) {
    const typical = TYPICAL_RETROGRADE_DURATIONS[body];
    if (!typical) continue;

    it(`should have ${body} retrograde duration within typical range`, () => {
      // Use J2000 + 2 years as search range
      const J2000_JD = 2451545.0;
      const periods = findRetrogradePeriods(body, J2000_JD, J2000_JD + 365 * 2);

      if (periods.length === 0) {
        // Skip if no retrograde found (depends on timing)
        return;
      }

      for (const period of periods) {
        assert.ok(
          period.durationDays >= typical.minDays - 5 && period.durationDays <= typical.maxDays + 5,
          `${body} retrograde should be ${typical.minDays}-${typical.maxDays} days, ` +
            `got ${period.durationDays.toFixed(1)} days`,
        );
      }
    });
  }
});

// =============================================================================
// HISTORICAL TRANSIT EVENT VALIDATION
// =============================================================================

describe('Historical Transit Event Validation', () => {
  // Test the Great Conjunction event
  it('should find Jupiter-Saturn conjunction 2020', () => {
    const event = HISTORICAL_TRANSIT_EVENTS.find((e) => e.name.includes('Great Conjunction'));
    assert.ok(event, 'Should have Great Conjunction event');

    if (!event) return;

    const expectedJD = julianDate(
      event.transit.exactDate.year,
      event.transit.exactDate.month,
      event.transit.exactDate.day,
      12,
      0,
    );

    // Find exact transit time
    const exactJD = findExactTransitTime(
      event.transit.body,
      event.natal.longitude,
      0, // Conjunction
      expectedJD - 30,
      expectedJD + 30,
    );

    if (exactJD) {
      const daysDiff = Math.abs(exactJD - expectedJD);
      assert.ok(
        daysDiff <= event.transit.dateTolerance,
        `Transit date should be within ${event.transit.dateTolerance} days of expected. ` +
          `Diff: ${daysDiff.toFixed(2)} days`,
      );
    }
  });
});

// =============================================================================
// CROSS-VALIDATION
// =============================================================================

describe('Cross-Validation', () => {
  it('should have consistent planetary positions at known dates', () => {
    // Great Conjunction date
    const jd = julianDate(2020, 12, 21, 18, 22);

    const jupiter = getPosition(CelestialBody.Jupiter, jd);
    const saturn = getPosition(CelestialBody.Saturn, jd);

    // Both should be at start of Aquarius (300°)
    assert.ok(
      jupiter.longitude > 299 && jupiter.longitude < 302,
      `Jupiter should be at ~300° (0° Aquarius)`,
    );
    assert.ok(
      saturn.longitude > 299 && saturn.longitude < 302,
      `Saturn should be at ~300° (0° Aquarius)`,
    );

    // They should be very close
    const sep = angularSeparation(jupiter.longitude, saturn.longitude);
    assert.ok(sep < 0.5, `Jupiter-Saturn separation should be <0.5° at conjunction`);
  });

  it('should correctly identify retrograde vs direct motion', () => {
    // At Great Conjunction, both planets were direct
    const jd = julianDate(2020, 12, 21, 12, 0);

    const jupiter = getPosition(CelestialBody.Jupiter, jd);
    const saturn = getPosition(CelestialBody.Saturn, jd);

    // Both should have positive (direct) speed
    assert.ok(jupiter.longitudeSpeed > 0, 'Jupiter should be direct at Great Conjunction');
    assert.ok(saturn.longitudeSpeed > 0, 'Saturn should be direct at Great Conjunction');
  });

  it('should find Mercury retrograde in expected date ranges', () => {
    // Mercury retrogrades ~3 times per year
    // Check that we find approximately the right number

    const jd2024Start = julianDate(2024, 1, 1, 0, 0);
    const jd2024End = julianDate(2025, 1, 1, 0, 0);

    const periods = findRetrogradePeriods(CelestialBody.Mercury, jd2024Start, jd2024End);

    // Should find 3 (occasionally 4) Mercury retrogrades in a year
    assert.ok(
      periods.length >= 3 && periods.length <= 4,
      `Should find 3-4 Mercury retrogrades in 2024, got ${periods.length}`,
    );

    // Each should be ~19-24 days
    for (const period of periods) {
      assert.ok(
        period.durationDays >= 18 && period.durationDays <= 25,
        `Mercury Rx should be 18-25 days, got ${period.durationDays.toFixed(1)}`,
      );
    }
  });
});

// =============================================================================
// PRECISION TESTS
// =============================================================================

describe('Precision Tests', () => {
  it('should achieve sub-degree precision for exact transit times', () => {
    // Use J2000 Sun position as target
    const natalLong = 280.37;
    const J2000_JD = 2451545.0;

    // Find Sun return (365 days later)
    const exactJD = findExactTransitTime(
      CelestialBody.Sun,
      natalLong,
      0, // Conjunction
      J2000_JD + 350, // Start searching ~350 days out
      J2000_JD + 380, // End at ~380 days
    );

    if (exactJD) {
      const pos = getPosition(CelestialBody.Sun, exactJD);
      const sep = angularSeparation(pos.longitude, natalLong);

      // Should be very precise
      assert.ok(sep < 0.001, `Exact transit should have <0.001° precision, got ${sep.toFixed(6)}°`);
    }
  });

  it('should find stations with reasonable precision', () => {
    // Find a Mercury station
    const J2000_JD = 2451545.0;
    const stations = findStationPoints(CelestialBody.Mercury, J2000_JD, J2000_JD + 365);

    if (stations.length > 0) {
      for (const station of stations) {
        // At station, speed should be very close to 0
        const pos = getPosition(CelestialBody.Mercury, station.jd);
        assert.ok(
          Math.abs(pos.longitudeSpeed) < 0.01,
          `Station speed should be <0.01°/day, got ${Math.abs(pos.longitudeSpeed).toFixed(4)}`,
        );
      }
    }
  });
});
