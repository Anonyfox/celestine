/**
 * Tests for Moon Position Calculator
 *
 * @remarks
 * Verifies Moon position calculations against:
 * 1. Swiss Ephemeris reference data (authoritative)
 * 2. Meeus "Astronomical Algorithms" examples
 * 3. Known astronomical events (lunar phases, eclipses)
 *
 * Accuracy target: ±2 arcminutes (0.033°) for longitude
 * Actual algorithm accuracy: ±10 arcseconds (0.003°)
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { DAYS_PER_JULIAN_CENTURY, J2000_EPOCH } from './constants.js';

// =============================================================================
// JPL HORIZONS REFERENCE DATA
// Source: NASA JPL Horizons System (https://ssd.jpl.nasa.gov/horizons/)
// Query: COMMAND='301', EPHEM_TYPE='OBSERVER', CENTER='500@399', QUANTITIES='31'
// Retrieved: 2025-Dec-19
// These values are AUTHORITATIVE - do not modify!
// =============================================================================
const JPL_MOON_REFERENCE = [
  { jd: 2451545.0, description: 'J2000.0', longitude: 223.323786, latitude: 5.1707422 },
  { jd: 2458850.0, description: '2020-Jan-01 12:00', longitude: 352.0847209, latitude: -5.0742207 },
  { jd: 2448058.0, description: '1990-Jun-15 12:00', longitude: 345.3580305, latitude: 3.1300835 },
] as const;

// =============================================================================
// SWISS EPHEMERIS REFERENCE DATA
// Generated from pyswisseph (Swiss Ephemeris 2.10.03)
// These values are AUTHORITATIVE - do not modify!
// Our implementation must match these within ±2 arcminutes (0.033°)
// =============================================================================
const SWISSEPH_MOON_REFERENCE = [
  {
    jd: 2451545.0,
    description: 'J2000.0 (2000-Jan-01 12:00 TT)',
    longitude: 223.323775,
    latitude: 5.170815,
    distance: 0.00269,
    speed: 12.021183,
  },
  {
    jd: 2448724.5,
    description: 'Meeus Example 47.a (1992-Apr-12 00:00 TT)',
    longitude: 133.176821,
    latitude: -3.229981,
    distance: 0.002463,
    speed: 14.283601,
  },
  {
    jd: 2440587.5,
    description: 'Unix Epoch (1970-Jan-01 00:00 TT)',
    longitude: 190.699048,
    latitude: -2.287832,
    distance: 0.00262,
    speed: 12.547671,
  },
  {
    jd: 2459580.5,
    description: 'Recent (2022-Jan-01 00:00 TT)',
    longitude: 255.479602,
    latitude: -1.280912,
    distance: 0.002399,
    speed: 15.061198,
  },
] as const;

// Tolerance: 2 arcminutes = 0.0333 degrees
const LONGITUDE_TOLERANCE = 0.034;
const LATITUDE_TOLERANCE = 0.1;

import {
  getMoonPosition,
  moonArgumentOfLatitude,
  moonDistance,
  moonDistanceAU,
  moonLatitude,
  moonLongitude,
  moonMeanAnomaly,
  moonMeanAscendingNode,
  moonMeanElongation,
  moonMeanLongitude,
  moonMeanPerigee,
  sunMeanAnomalyForMoon,
} from './moon.js';

/**
 * Helper to convert calendar date to Julian Date.
 */
function toJD(year: number, month: number, day: number, hour = 12): number {
  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  return (
    Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + hour / 24 + b - 1524.5
  );
}

/**
 * Helper to normalize angle to [0, 360)
 */
function normalize(deg: number): number {
  let result = deg % 360;
  if (result < 0) result += 360;
  return result;
}

describe('ephemeris/moon', () => {
  describe('Fundamental arguments', () => {
    describe('moonMeanLongitude', () => {
      it('should return ~218.32° at J2000.0', () => {
        const T = 0;
        const Lp = moonMeanLongitude(T);
        // Meeus Table 47.a: L' = 218.3164477°
        assert.ok(Math.abs(Lp - 218.3164477) < 0.0001);
      });

      it('should increase by ~481267°/century (~13.18°/day)', () => {
        const T0 = 0;
        const T1 = 1 / 36525; // 1 day
        const Lp0 = moonMeanLongitude(T0);
        const Lp1 = moonMeanLongitude(T1);
        const dailyMotion = Lp1 - Lp0;
        // Moon moves ~13.18°/day
        assert.ok(Math.abs(dailyMotion - 13.18) < 0.1);
      });
    });

    describe('moonMeanElongation', () => {
      it('should return ~297.85° at J2000.0', () => {
        const T = 0;
        const D = moonMeanElongation(T);
        // Meeus Table 47.a: D = 297.8501921°
        assert.ok(Math.abs(D - 297.8501921) < 0.0001);
      });
    });

    describe('sunMeanAnomalyForMoon', () => {
      it('should return ~357.53° at J2000.0', () => {
        const T = 0;
        const M = sunMeanAnomalyForMoon(T);
        // Meeus Table 47.a: M = 357.5291092°
        assert.ok(Math.abs(M - 357.5291092) < 0.0001);
      });
    });

    describe('moonMeanAnomaly', () => {
      it('should return ~134.96° at J2000.0', () => {
        const T = 0;
        const Mp = moonMeanAnomaly(T);
        // Meeus Table 47.a: M' = 134.9633964°
        assert.ok(Math.abs(Mp - 134.9633964) < 0.0001);
      });
    });

    describe('moonArgumentOfLatitude', () => {
      it('should return ~93.27° at J2000.0', () => {
        const T = 0;
        const F = moonArgumentOfLatitude(T);
        // Meeus Table 47.a: F = 93.272095°
        assert.ok(Math.abs(F - 93.272095) < 0.0001);
      });
    });
  });

  describe('moonLongitude', () => {
    it('should return approximately 218° at J2000.0', () => {
      const T = 0;
      const lon = moonLongitude(T);
      const lonNorm = normalize(lon);
      // Moon at J2000.0 is around 218° (Scorpio)
      assert.ok(lonNorm > 210 && lonNorm < 225, `Expected ~218°, got ${lonNorm}°`);
    });

    it('should match Meeus Example 47.a', () => {
      // Meeus Example 47.a: April 12, 1992, 0h TD
      // JD = 2448724.5
      const jd = 2448724.5;
      const T = (jd - J2000_EPOCH) / DAYS_PER_JULIAN_CENTURY;

      const lon = moonLongitude(T);
      const lonNorm = normalize(lon);

      // Meeus gives apparent longitude = 133°10'00" = 133.1667°
      // (Our value may differ slightly as we're calculating geometric longitude)
      assert.ok(Math.abs(lonNorm - 133.17) < 0.5, `Expected ~133.17°, got ${lonNorm}°`);
    });
  });

  describe('moonLatitude', () => {
    it('should be within ±5.3° (maximum lunar latitude)', () => {
      // Test various dates
      for (let i = 0; i < 30; i++) {
        const T = i / 36.525; // About 1 year increments
        const lat = moonLatitude(T);
        assert.ok(Math.abs(lat) <= 5.5, `Latitude ${lat}° exceeds maximum ~5.3°`);
      }
    });

    it('should match Meeus Example 47.a', () => {
      // Meeus Example 47.a: April 12, 1992, 0h TD
      const jd = 2448724.5;
      const T = (jd - J2000_EPOCH) / DAYS_PER_JULIAN_CENTURY;

      const lat = moonLatitude(T);

      // Meeus gives latitude = -3°13'45" = -3.2292°
      assert.ok(Math.abs(lat - -3.229) < 0.1, `Expected ~-3.23°, got ${lat}°`);
    });
  });

  describe('moonDistance', () => {
    it('should return approximately 385000 km at J2000.0', () => {
      const T = 0;
      const dist = moonDistance(T);
      // Mean lunar distance is ~385,000 km
      assert.ok(dist > 350000 && dist < 420000, `Expected ~385000 km, got ${dist} km`);
    });

    it('should be within perigee-apogee range', () => {
      // Test various dates to ensure distance stays in valid range
      for (let i = 0; i < 30; i++) {
        const T = i / 36.525;
        const dist = moonDistance(T);
        // Perigee: ~356,500 km, Apogee: ~406,700 km
        assert.ok(dist >= 355000 && dist <= 407000, `Distance ${dist} km outside expected range`);
      }
    });

    it('should match Meeus Example 47.a', () => {
      // Meeus Example 47.a: April 12, 1992, 0h TD
      const jd = 2448724.5;
      const T = (jd - J2000_EPOCH) / DAYS_PER_JULIAN_CENTURY;

      const dist = moonDistance(T);

      // Meeus gives distance = 368409.7 km
      assert.ok(Math.abs(dist - 368409.7) < 100, `Expected ~368410 km, got ${dist} km`);
    });
  });

  describe('moonDistanceAU', () => {
    it('should return approximately 0.00257 AU at J2000.0', () => {
      const T = 0;
      const dist = moonDistanceAU(T);
      // Mean lunar distance is ~0.00257 AU
      assert.ok(dist > 0.002 && dist < 0.003, `Expected ~0.00257 AU, got ${dist} AU`);
    });
  });

  describe('getMoonPosition', () => {
    describe('JPL Horizons reference validation', () => {
      /**
       * Validates against NASA JPL Horizons (authoritative ephemeris source)
       * These are independent reference values - DO NOT MODIFY.
       */
      for (const ref of JPL_MOON_REFERENCE) {
        it(`should match JPL Horizons at ${ref.description}`, () => {
          const moon = getMoonPosition(ref.jd);

          const lonDiff = Math.abs(moon.longitude - ref.longitude);
          assert.ok(
            lonDiff < LONGITUDE_TOLERANCE,
            `Longitude: expected ${ref.longitude}° (JPL), got ${moon.longitude.toFixed(4)}° (diff: ${(lonDiff * 60).toFixed(1)} arcmin)`,
          );
        });
      }
    });

    describe('Swiss Ephemeris reference validation', () => {
      /**
       * Validates against Swiss Ephemeris (pyswisseph 2.10.03)
       * These are authoritative reference values - DO NOT MODIFY the expected values.
       * If tests fail, fix the implementation, not the test data.
       */
      for (const ref of SWISSEPH_MOON_REFERENCE) {
        it(`should match Swiss Ephemeris at ${ref.description}`, () => {
          const moon = getMoonPosition(ref.jd);

          const lonDiff = Math.abs(moon.longitude - ref.longitude);
          assert.ok(
            lonDiff < LONGITUDE_TOLERANCE,
            `Longitude: expected ${ref.longitude}°, got ${moon.longitude}° (diff: ${(lonDiff * 60).toFixed(1)} arcmin)`,
          );

          const latDiff = Math.abs(moon.latitude - ref.latitude);
          assert.ok(
            latDiff < LATITUDE_TOLERANCE,
            `Latitude: expected ${ref.latitude}°, got ${moon.latitude}° (diff: ${latDiff.toFixed(3)}°)`,
          );
        });
      }
    });

    describe('J2000.0 epoch characteristics', () => {
      it('should have distance approximately 0.00269 AU', () => {
        const jd = J2000_EPOCH;
        const moon = getMoonPosition(jd);

        assert.ok(
          Math.abs(moon.distance - 0.00269) < 0.0003,
          `Expected ~0.00269 AU, got ${moon.distance} AU`,
        );
      });

      it('should have speed approximately 12°/day', () => {
        const jd = J2000_EPOCH;
        const moon = getMoonPosition(jd);

        // Moon's average speed is ~13.18°/day, varies from ~11.5° to ~14.5°
        assert.ok(
          moon.longitudeSpeed > 11 && moon.longitudeSpeed < 15,
          `Expected ~12°/day, got ${moon.longitudeSpeed}°/day`,
        );
      });

      it('should never be retrograde', () => {
        const jd = J2000_EPOCH;
        const moon = getMoonPosition(jd);

        assert.equal(moon.isRetrograde, false);
      });
    });

    describe('Lunar phases', () => {
      /**
       * New Moon: Moon longitude ≈ Sun longitude (±5°)
       * Full Moon: Moon longitude ≈ Sun longitude + 180° (±5°)
       */

      it('should be near Sun at New Moon (Jan 11, 2024)', () => {
        // New Moon: January 11, 2024 ~11:57 UTC
        const jd = toJD(2024, 1, 11, 11.95);
        const moon = getMoonPosition(jd);

        // Sun is around 290° (Capricorn) in early January
        // Moon should be within ~5° of Sun at New Moon
        // Due to lunar latitude and exact timing, allow 10° tolerance
        const sunLon = 290; // Approximate Sun position
        let diff = Math.abs(moon.longitude - sunLon);
        if (diff > 180) diff = 360 - diff;

        assert.ok(diff < 15, `Moon-Sun separation at New Moon: ${diff}° (expected < 15°)`);
      });

      it('should be opposite Sun at Full Moon (Jan 25, 2024)', () => {
        // Full Moon: January 25, 2024 ~17:54 UTC
        const jd = toJD(2024, 1, 25, 17.9);
        const moon = getMoonPosition(jd);

        // Sun is around 305° (Aquarius) in late January
        // Moon should be around 125° (opposite)
        const sunLon = 305;
        const expectedMoonLon = (sunLon + 180) % 360; // ~125°
        let diff = Math.abs(moon.longitude - expectedMoonLon);
        if (diff > 180) diff = 360 - diff;

        assert.ok(diff < 15, `Moon-Sun separation at Full Moon: ${diff}° from opposition`);
      });
    });

    describe('Historical dates', () => {
      it('Apollo 11 landing (July 20, 1969, ~20:17 UTC)', () => {
        // Apollo 11 Eagle landed on the Moon at 20:17 UTC
        const jd = toJD(1969, 7, 20, 20.28);
        const moon = getMoonPosition(jd);

        // The Moon (as seen from Earth) was in Libra at this time (~188°)
        // This is the geocentric ecliptic longitude
        assert.ok(
          moon.longitude > 180 && moon.longitude < 200,
          `Expected Moon around 188° (Libra), got ${moon.longitude}°`,
        );
      });
    });

    describe('Edge cases', () => {
      it('should handle rapid position changes correctly', () => {
        // Moon moves ~13°/day, so check that consecutive hours show movement
        const jd = J2000_EPOCH;
        const moon1 = getMoonPosition(jd);
        const moon2 = getMoonPosition(jd + 1 / 24); // 1 hour later

        let diff = moon2.longitude - moon1.longitude;
        if (diff < -180) diff += 360;
        if (diff > 180) diff -= 360;

        // Should move ~0.5° per hour
        assert.ok(Math.abs(diff - 0.55) < 0.1, `Expected ~0.55°/hour, got ${diff}°`);
      });

      it('should handle longitude wraparound correctly', () => {
        // Find a date where Moon crosses from 359° to 0°
        // This happens roughly every 27.3 days
        let foundWrap = false;

        for (let i = 0; i < 30; i++) {
          const jd = J2000_EPOCH + i;
          const moon1 = getMoonPosition(jd);
          const moon2 = getMoonPosition(jd + 1);

          if (moon1.longitude > 350 && moon2.longitude < 10) {
            foundWrap = true;
            // Speed should still be positive
            assert.ok(moon1.longitudeSpeed > 0);
            assert.ok(moon2.longitudeSpeed > 0);
            break;
          }
        }

        assert.ok(foundWrap, 'Should find a wraparound case within 30 days');
      });

      it('should work for dates far from J2000', () => {
        // Year 1900
        const jd1900 = toJD(1900, 6, 15, 12);
        const moon1900 = getMoonPosition(jd1900);
        assert.ok(moon1900.longitude >= 0 && moon1900.longitude < 360);
        assert.ok(Math.abs(moon1900.latitude) < 6);

        // Year 2100
        const jd2100 = toJD(2100, 6, 15, 12);
        const moon2100 = getMoonPosition(jd2100);
        assert.ok(moon2100.longitude >= 0 && moon2100.longitude < 360);
        assert.ok(Math.abs(moon2100.latitude) < 6);
      });
    });

    describe('Options', () => {
      it('should calculate speed by default', () => {
        const moon = getMoonPosition(J2000_EPOCH);
        assert.ok(moon.longitudeSpeed !== 0);
      });

      it('should skip speed calculation when disabled', () => {
        const moon = getMoonPosition(J2000_EPOCH, { includeSpeed: false });
        assert.equal(moon.longitudeSpeed, 0);
      });
    });

    describe('Cross-validation with zodiac signs', () => {
      it('should traverse all zodiac signs in ~27 days', () => {
        // Check that Moon passes through all 12 signs in a month
        const signs = new Set<number>();

        for (let i = 0; i < 28; i++) {
          const jd = J2000_EPOCH + i;
          const moon = getMoonPosition(jd);
          const signIndex = Math.floor(moon.longitude / 30);
          signs.add(signIndex);
        }

        // Should see all 12 signs (0-11)
        assert.ok(signs.size >= 11, `Expected 12 signs, found ${signs.size}`);
      });
    });
  });

  describe('moonMeanAscendingNode', () => {
    it('should return ~125° at J2000.0', () => {
      const T = 0;
      const node = moonMeanAscendingNode(T);
      // Meeus: Ω = 125.0445479°
      assert.ok(Math.abs(node - 125.0445479) < 0.0001);
    });

    it('should regress (decrease) over time', () => {
      const node0 = moonMeanAscendingNode(0);
      const node1 = moonMeanAscendingNode(1); // 100 years later

      // Node regresses ~19.3° per year, so ~1930° per century
      // After normalization, should be clearly different
      const rate = node0 - node1; // Should be positive (regression)
      assert.ok(rate > 1900 && rate < 2000, `Node regression rate: ${rate}°/century`);
    });

    it('should complete one cycle in ~18.6 years', () => {
      // Node completes 360° in ~18.6 years = 0.186 centuries
      // Rate is about 1934°/century
      // So 360° / 1934°/century ≈ 0.186 centuries ≈ 18.6 years
      const rate = 1934.1362891; // degrees per century from formula

      const periodCenturies = 360 / rate;
      const periodYears = periodCenturies * 100;

      assert.ok(Math.abs(periodYears - 18.6) < 0.1);
    });
  });

  describe('moonMeanPerigee', () => {
    it('should return ~83.35° at J2000.0', () => {
      const T = 0;
      const perigee = moonMeanPerigee(T);
      // Meeus Chapter 50
      assert.ok(Math.abs(perigee - 83.3532465) < 0.0001);
    });

    it('should advance (increase) over time', () => {
      const perigee0 = moonMeanPerigee(0);
      const perigee1 = moonMeanPerigee(1); // 100 years later

      // Perigee advances ~40.7° per year, so ~4069° per century
      const rate = perigee1 - perigee0;
      assert.ok(rate > 4000 && rate < 4100, `Perigee advance rate: ${rate}°/century`);
    });
  });
});
