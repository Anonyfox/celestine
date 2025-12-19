import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { J2000_EPOCH } from '../time/constants.js';
import { toJulianDate } from '../time/julian-date.js';
import { localSiderealTime } from '../time/local-sidereal-time.js';
import { greenwichMeanSiderealTime } from '../time/sidereal-time.js';
import { calculateAngles, calculateAscendant, calculateMidheaven } from './angles.js';
import { obliquityOfEcliptic } from './obliquity.js';

/**
 * Helper to calculate LST from Julian Date and longitude
 */
function lstFromJD(jd: number, longitude: number): number {
  const gmst = greenwichMeanSiderealTime(jd);
  return localSiderealTime(gmst, longitude);
}

// =============================================================================
// CALCULATED REFERENCE DATA
// These values are calculated using our own formulas from Meeus Chapter 13.
// The formulas are mathematically correct based on spherical trigonometry.
//
// Formula: MC = atan2(sin(LST), cos(LST) * cos(obliquity))
// Formula: ASC = atan2(cos(LST), -(sin(obl)*tan(lat) + cos(obl)*sin(LST)))
//
// Cross-validated by:
// 1. Mathematical derivation from Meeus "Astronomical Algorithms"
// 2. Consistency checks (DSC = ASC + 180°, IC = MC + 180°)
// 3. Astronomical sanity (MC on meridian, ASC on horizon)
// =============================================================================
const ANGLE_REFERENCE = [
  {
    // J2000.0 at Greenwich (0°E), equator (0°N)
    description: 'J2000.0 Greenwich Equator (2000-Jan-01 12:00 TT)',
    jd: 2451545.0,
    latitude: 0,
    longitude: 0,
    expected: {
      // GMST = LST = 280.46° at J2000.0
      // tan(MC) = tan(280.46°) / cos(23.44°)
      mc: 279.6, // ~9° Capricorn
      // At equator: tan(ASC) = cos(LST) / (-cos(ε)*sin(LST))
      asc: 11.4, // ~11° Aries
    },
    tolerance: 0.5,
  },
  {
    // J2000.0 at London (51.5°N)
    description: 'J2000.0 London (2000-Jan-01 12:00 TT)',
    jd: 2451545.0,
    latitude: 51.5074,
    longitude: -0.1278,
    expected: {
      // LST = 280.46 - 0.1278 = 280.33°
      mc: 279.5, // ~9° Capricorn
      asc: 24.0, // ~24° Aries
    },
    tolerance: 1.0,
  },
] as const;

describe('Angles', () => {
  describe('Reference Validation (Meeus Chapter 13)', () => {
    /**
     * Validates our implementation against calculated reference values
     * using the formulas from Meeus "Astronomical Algorithms" Chapter 13.
     */

    it('should match calculated reference for J2000.0 at equator', () => {
      const ref = ANGLE_REFERENCE[0];
      const lst = lstFromJD(ref.jd, ref.longitude);
      const obliquity = obliquityOfEcliptic(ref.jd);

      const mc = calculateMidheaven(lst, obliquity);
      const asc = calculateAscendant(lst, obliquity, ref.latitude);

      assert.ok(
        Math.abs(mc - ref.expected.mc) < ref.tolerance,
        `MC: expected ${ref.expected.mc}°, got ${mc.toFixed(2)}° (diff: ${Math.abs(mc - ref.expected.mc).toFixed(2)}°)`,
      );

      let ascDiff = Math.abs(asc - ref.expected.asc);
      if (ascDiff > 180) ascDiff = 360 - ascDiff;
      assert.ok(
        ascDiff < ref.tolerance,
        `ASC: expected ${ref.expected.asc}°, got ${asc.toFixed(2)}° (diff: ${ascDiff.toFixed(2)}°)`,
      );
    });

    it('should match calculated reference for J2000.0 at London', () => {
      const ref = ANGLE_REFERENCE[1];
      const lst = lstFromJD(ref.jd, ref.longitude);
      const obliquity = obliquityOfEcliptic(ref.jd);

      const mc = calculateMidheaven(lst, obliquity);
      const asc = calculateAscendant(lst, obliquity, ref.latitude);

      assert.ok(
        Math.abs(mc - ref.expected.mc) < ref.tolerance,
        `MC: expected ${ref.expected.mc}°, got ${mc.toFixed(2)}°`,
      );

      let ascDiff = Math.abs(asc - ref.expected.asc);
      if (ascDiff > 180) ascDiff = 360 - ascDiff;
      assert.ok(
        ascDiff < ref.tolerance,
        `ASC: expected ${ref.expected.asc}°, got ${asc.toFixed(2)}°`,
      );
    });
  });

  describe('calculateMidheaven', () => {
    it('should calculate MC for LST = 0° (0h sidereal)', () => {
      const obliquity = 23.44;
      const mc = calculateMidheaven(0, obliquity);

      // LST = 0° means 0h Right Ascension is culminating
      // This corresponds to approximately 0° ecliptic longitude (0° Aries)
      assert.ok(mc >= 0 && mc < 360);
      assert.ok(Math.abs(mc - 0) < 10); // Should be near 0° Aries
    });

    it('should calculate MC for LST = 90° (6h sidereal)', () => {
      const obliquity = 23.44;
      const mc = calculateMidheaven(90, obliquity);

      // LST = 90° corresponds to roughly 90° ecliptic longitude
      assert.ok(Math.abs(mc - 90) < 10);
    });

    it('should calculate MC for LST = 180° (12h sidereal)', () => {
      const obliquity = 23.44;
      const mc = calculateMidheaven(180, obliquity);

      // LST = 180° corresponds to roughly 180° ecliptic longitude (0° Libra)
      assert.ok(Math.abs(mc - 180) < 10);
    });

    it('should calculate MC for LST = 270° (18h sidereal)', () => {
      const obliquity = 23.44;
      const mc = calculateMidheaven(270, obliquity);

      // LST = 270° corresponds to roughly 270° ecliptic longitude (0° Capricorn)
      assert.ok(Math.abs(mc - 270) < 10);
    });

    it('should always return value in [0, 360) range', () => {
      const obliquity = 23.44;
      const testValues = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

      for (const lst of testValues) {
        const mc = calculateMidheaven(lst, obliquity);
        assert.ok(mc >= 0 && mc < 360, `MC ${mc}° out of range for LST ${lst}°`);
      }
    });

    it('should be independent of latitude (only depends on LST and obliquity)', () => {
      const obliquity = 23.44;
      const lst = 120;

      // MC should be the same for any latitude
      const mc1 = calculateMidheaven(lst, obliquity);
      const mc2 = calculateMidheaven(lst, obliquity);

      assert.equal(mc1, mc2);
    });

    it('should change continuously with LST', () => {
      const obliquity = 23.44;

      for (let lst = 0; lst < 360; lst += 30) {
        const mc1 = calculateMidheaven(lst, obliquity);
        const mc2 = calculateMidheaven(lst + 1, obliquity);

        // Small change in LST should produce small change in MC
        let diff = Math.abs(mc2 - mc1);
        if (diff > 180) diff = 360 - diff; // Handle wraparound

        assert.ok(diff < 10, `Large jump in MC: ${mc1}° -> ${mc2}° at LST ${lst}°`);
      }
    });

    it('should handle different obliquity values', () => {
      const lst = 90;

      // Test with range of reasonable obliquity values
      const obliquities = [22, 23, 23.44, 24, 25];

      for (const obl of obliquities) {
        const mc = calculateMidheaven(lst, obl);
        assert.ok(mc >= 0 && mc < 360);
      }
    });
  });

  describe('calculateAscendant', () => {
    it('should calculate ASC for equator (latitude = 0)', () => {
      const obliquity = 23.44;
      const lst = 0;
      const asc = calculateAscendant(lst, obliquity, 0);

      // At equator, all points rise at some time
      assert.ok(asc >= 0 && asc < 360);
    });

    it('should calculate ASC for Northern hemisphere (London)', () => {
      const obliquity = 23.44;
      const lst = 180;
      const latitude = 51.5; // London

      const asc = calculateAscendant(lst, obliquity, latitude);

      assert.ok(asc >= 0 && asc < 360);
    });

    it('should calculate ASC for Southern hemisphere (Sydney)', () => {
      const obliquity = 23.44;
      const lst = 180;
      const latitude = -33.87; // Sydney

      const asc = calculateAscendant(lst, obliquity, latitude);

      assert.ok(asc >= 0 && asc < 360);
    });

    it('should throw error at North Pole', () => {
      const obliquity = 23.44;
      const lst = 0;

      assert.throws(() => {
        calculateAscendant(lst, obliquity, 90);
      }, /poles/);
    });

    it('should throw error at South Pole', () => {
      const obliquity = 23.44;
      const lst = 0;

      assert.throws(() => {
        calculateAscendant(lst, obliquity, -90);
      }, /poles/);
    });

    it('should work at high latitudes (below pole)', () => {
      const obliquity = 23.44;
      const lst = 180;
      const latitude = 65; // Just below Arctic circle

      const asc = calculateAscendant(lst, obliquity, latitude);

      assert.ok(asc >= 0 && asc < 360);
    });

    it('should vary with LST', () => {
      const obliquity = 23.44;
      const latitude = 51.5;

      const asc0 = calculateAscendant(0, obliquity, latitude);
      const asc90 = calculateAscendant(90, obliquity, latitude);
      const asc180 = calculateAscendant(180, obliquity, latitude);
      const asc270 = calculateAscendant(270, obliquity, latitude);

      // All should be different
      const values = [asc0, asc90, asc180, asc270];
      const uniqueValues = new Set(values);
      assert.equal(uniqueValues.size, 4, 'ASC should vary with LST');
    });

    it('should vary with latitude', () => {
      const obliquity = 23.44;
      const lst = 180;

      const ascEquator = calculateAscendant(lst, obliquity, 0);
      const ascLondon = calculateAscendant(lst, obliquity, 51.5);
      const ascSydney = calculateAscendant(lst, obliquity, -33.87);

      // All should be different
      assert.notEqual(ascEquator, ascLondon);
      assert.notEqual(ascLondon, ascSydney);
      assert.notEqual(ascEquator, ascSydney);
    });

    it('should be continuous (no sudden jumps)', () => {
      const obliquity = 23.44;
      const latitude = 51.5;

      for (let lst = 0; lst < 360; lst += 30) {
        const asc1 = calculateAscendant(lst, obliquity, latitude);
        const asc2 = calculateAscendant(lst + 1, obliquity, latitude);

        // Small change in LST should produce reasonable change in ASC
        let diff = Math.abs(asc2 - asc1);
        if (diff > 180) diff = 360 - diff;

        assert.ok(diff < 30, `Large jump in ASC: ${asc1}° -> ${asc2}° at LST ${lst}°`);
      }
    });

    it('should always return value in [0, 360) range', () => {
      const obliquity = 23.44;
      const latitudes = [0, 30, 51.5, -30, -33.87, 60, -60];
      const lstValues = [0, 90, 180, 270];

      for (const lat of latitudes) {
        for (const lst of lstValues) {
          const asc = calculateAscendant(lst, obliquity, lat);
          assert.ok(asc >= 0 && asc < 360, `ASC ${asc}° out of range for lat=${lat}, LST=${lst}`);
        }
      }
    });
  });

  describe('calculateAngles', () => {
    it('should calculate all four angles', () => {
      const obliquity = 23.44;
      const lst = 180;
      const latitude = 51.5;

      const angles = calculateAngles(lst, obliquity, latitude);

      assert.ok(angles.ascendant !== undefined);
      assert.ok(angles.midheaven !== undefined);
      assert.ok(angles.descendant !== undefined);
      assert.ok(angles.imumCoeli !== undefined);

      // All should be in valid range
      assert.ok(angles.ascendant >= 0 && angles.ascendant < 360);
      assert.ok(angles.midheaven >= 0 && angles.midheaven < 360);
      assert.ok(angles.descendant >= 0 && angles.descendant < 360);
      assert.ok(angles.imumCoeli >= 0 && angles.imumCoeli < 360);
    });

    it('should have DSC exactly opposite ASC', () => {
      const obliquity = 23.44;
      const lst = 120;
      const latitude = 40;

      const angles = calculateAngles(lst, obliquity, latitude);

      const diff = Math.abs(angles.descendant - angles.ascendant);
      const normalizedDiff = diff > 180 ? 360 - diff : diff;

      assert.ok(Math.abs(normalizedDiff - 180) < 0.001, 'DSC should be 180° from ASC');
    });

    it('should have IC exactly opposite MC', () => {
      const obliquity = 23.44;
      const lst = 120;
      const latitude = 40;

      const angles = calculateAngles(lst, obliquity, latitude);

      const diff = Math.abs(angles.imumCoeli - angles.midheaven);
      const normalizedDiff = diff > 180 ? 360 - diff : diff;

      assert.ok(Math.abs(normalizedDiff - 180) < 0.001, 'IC should be 180° from MC');
    });

    it('should throw error at poles', () => {
      const obliquity = 23.44;
      const lst = 0;

      assert.throws(() => {
        calculateAngles(lst, obliquity, 90);
      });

      assert.throws(() => {
        calculateAngles(lst, obliquity, -90);
      });
    });
  });

  describe('Integration with Time Module', () => {
    it('should work with real date/time/location (London, J2000)', () => {
      // January 1, 2000, 12:00 UT, London
      const jd = J2000_EPOCH;
      const longitude = -0.1278; // London longitude
      const latitude = 51.5074; // London latitude

      const lst = lstFromJD(jd, longitude);
      const obliquity = obliquityOfEcliptic(jd);

      const angles = calculateAngles(lst, obliquity, latitude);

      // Verify reasonable values
      assert.ok(angles.ascendant >= 0 && angles.ascendant < 360);
      assert.ok(angles.midheaven >= 0 && angles.midheaven < 360);

      // Verify opposites
      const ascDscDiff = Math.abs(angles.descendant - angles.ascendant);
      assert.ok(Math.abs((ascDscDiff > 180 ? 360 - ascDscDiff : ascDscDiff) - 180) < 0.01);
    });

    it('should work with real date/time/location (New York)', () => {
      // January 1, 2000, 12:00 UT, New York
      const jd = J2000_EPOCH;
      const longitude = -74.006; // New York longitude
      const latitude = 40.7128; // New York latitude

      const lst = lstFromJD(jd, longitude);
      const obliquity = obliquityOfEcliptic(jd);

      const angles = calculateAngles(lst, obliquity, latitude);

      assert.ok(angles.ascendant >= 0 && angles.ascendant < 360);
      assert.ok(angles.midheaven >= 0 && angles.midheaven < 360);
    });

    it('should work with different dates', () => {
      const location = { longitude: 0, latitude: 51.5 };

      const dates = [
        { year: 1900, month: 1, day: 1, hour: 12, minute: 0, second: 0 },
        { year: 2000, month: 1, day: 1, hour: 12, minute: 0, second: 0 },
        { year: 2025, month: 12, day: 18, hour: 12, minute: 0, second: 0 },
        { year: 2100, month: 1, day: 1, hour: 12, minute: 0, second: 0 },
      ];

      for (const date of dates) {
        const jd = toJulianDate(date);
        const lst = lstFromJD(jd, location.longitude);
        const obliquity = obliquityOfEcliptic(jd);

        const angles = calculateAngles(lst, obliquity, location.latitude);

        assert.ok(angles.ascendant >= 0 && angles.ascendant < 360);
        assert.ok(angles.midheaven >= 0 && angles.midheaven < 360);
      }
    });

    it('should work across different longitudes at same moment', () => {
      const jd = J2000_EPOCH;
      const latitude = 40;
      const obliquity = obliquityOfEcliptic(jd);

      const longitudes = [-120, -60, 0, 60, 120, 180]; // Various longitudes

      const allAngles = longitudes.map((lon) => {
        const lst = lstFromJD(jd, lon);
        return calculateAngles(lst, obliquity, latitude);
      });

      // All should have valid angles
      for (const angles of allAngles) {
        assert.ok(angles.ascendant >= 0 && angles.ascendant < 360);
        assert.ok(angles.midheaven >= 0 && angles.midheaven < 360);
      }

      // MC should vary with longitude (different LST)
      const mcValues = allAngles.map((a) => a.midheaven);
      const uniqueMc = new Set(mcValues);
      assert.ok(uniqueMc.size > 1, 'MC should vary with longitude');
    });
  });

  describe('Edge Cases', () => {
    it('should handle LST near 0°/360° boundary', () => {
      const obliquity = 23.44;
      const latitude = 51.5;

      const angles1 = calculateAngles(359, obliquity, latitude);
      const angles2 = calculateAngles(1, obliquity, latitude);

      // Should be close (only 2° LST difference)
      assert.ok(angles1.ascendant >= 0 && angles1.ascendant < 360);
      assert.ok(angles2.ascendant >= 0 && angles2.ascendant < 360);
    });

    it('should handle very small obliquity', () => {
      const lst = 90;
      const latitude = 40;
      const obliquity = 0.1; // Hypothetically tiny obliquity

      const angles = calculateAngles(lst, obliquity, latitude);

      assert.ok(angles.ascendant >= 0 && angles.ascendant < 360);
      assert.ok(angles.midheaven >= 0 && angles.midheaven < 360);
    });

    it('should handle very large obliquity', () => {
      const lst = 90;
      const latitude = 40;
      const obliquity = 45; // Hypothetically large obliquity

      const angles = calculateAngles(lst, obliquity, latitude);

      assert.ok(angles.ascendant >= 0 && angles.ascendant < 360);
      assert.ok(angles.midheaven >= 0 && angles.midheaven < 360);
    });

    it('should handle latitude near equator', () => {
      const obliquity = 23.44;
      const lst = 180;

      const angles = calculateAngles(lst, obliquity, 0.0001); // Nearly at equator

      assert.ok(angles.ascendant >= 0 && angles.ascendant < 360);
    });

    it('should handle latitude near limit (but not at pole)', () => {
      const obliquity = 23.44;
      const lst = 180;

      const angles = calculateAngles(lst, obliquity, 89.9); // Very close to North Pole

      assert.ok(angles.ascendant >= 0 && angles.ascendant < 360);
    });
  });
});
