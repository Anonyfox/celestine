/**
 * Tests for Progressions Module Constants
 *
 * @remarks
 * Validates that all progression constants are properly defined
 * and have reasonable values based on astronomical data.
 *
 * Sources for validation:
 * - Meeus "Astronomical Algorithms" for astronomical values
 * - Robert Hand's progression recommendations for orbs
 * - Noel Tyl "Solar Arcs" for solar arc practice
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { AspectType } from '../aspects/types.js';
import { CelestialBody } from '../ephemeris/positions.js';
import {
  ALL_PROGRESSION_ASPECTS,
  ANGLE_ORB_EXTENSION,
  ASPECT_ANGLES,
  ASPECT_SYMBOLS,
  BODY_NAMES,
  DAYS_PER_YEAR,
  DEFAULT_PROGRESSION_BODIES,
  DEFAULT_PROGRESSION_CONFIG,
  EXACT_THRESHOLD,
  FUTURE_WARNING_YEARS,
  LUMINARIES,
  LUMINARY_ORB_EXTENSION,
  MAJOR_PROGRESSION_ASPECTS,
  MAX_PROGRESSION_AGE,
  MAX_TARGET_YEAR,
  MIN_BIRTH_YEAR,
  MINOR_PROGRESSION_RATE,
  MOON_MEAN_DAILY_MOTION,
  MOON_SIGN_PROGRESSION_MONTHS,
  MOON_ZODIAC_CYCLE_YEARS,
  PROGRESSED_ANNUAL_MOTION,
  PROGRESSION_ORBS,
  PROGRESSION_RATES,
  RETROGRADE_CAPABLE_BODIES,
  SECONDARY_PROGRESSION_RATE,
  SIGN_NAMES,
  STATIONARY_THRESHOLD,
  SUN_MEAN_DAILY_MOTION,
  SUN_SIGN_PROGRESSION_YEARS,
  SYNODIC_MONTH_DAYS,
  TERTIARY_PROGRESSION_RATE,
  TROPICAL_MONTH_DAYS,
} from './constants.js';

describe('progressions/constants', () => {
  describe('Astronomical Constants', () => {
    it('should have correct days per year (Julian year)', () => {
      assert.equal(DAYS_PER_YEAR, 365.25);
    });

    it('should have correct tropical month duration', () => {
      // Tropical month is ~27.32 days (Moon returns to same ecliptic longitude)
      assert.ok(TROPICAL_MONTH_DAYS > 27.3 && TROPICAL_MONTH_DAYS < 27.35);
    });

    it('should have correct synodic month duration', () => {
      // Synodic month is ~29.53 days (new moon to new moon)
      assert.ok(SYNODIC_MONTH_DAYS > 29.5 && SYNODIC_MONTH_DAYS < 29.55);
    });

    it('should have synodic month longer than tropical month', () => {
      assert.ok(SYNODIC_MONTH_DAYS > TROPICAL_MONTH_DAYS);
    });

    it('should have Sun mean daily motion close to 1°/day', () => {
      // Sun moves ~0.9856°/day
      assert.ok(SUN_MEAN_DAILY_MOTION > 0.98 && SUN_MEAN_DAILY_MOTION < 1.0);
    });

    it('should have Moon mean daily motion close to 13°/day', () => {
      // Moon moves ~13.18°/day
      assert.ok(MOON_MEAN_DAILY_MOTION > 13.0 && MOON_MEAN_DAILY_MOTION < 13.3);
    });

    it('should have Moon moving faster than Sun', () => {
      assert.ok(MOON_MEAN_DAILY_MOTION > SUN_MEAN_DAILY_MOTION);
    });
  });

  describe('Progression Rates', () => {
    it('should have secondary rate of 1 (day per year)', () => {
      assert.equal(SECONDARY_PROGRESSION_RATE, 1);
    });

    it('should have minor rate equal to tropical month', () => {
      assert.equal(MINOR_PROGRESSION_RATE, TROPICAL_MONTH_DAYS);
    });

    it('should have tertiary rate as 12 (days per year)', () => {
      // Tertiary: 1 day = 1 month, so 12 days = 1 year
      assert.equal(TERTIARY_PROGRESSION_RATE, 12);
    });

    it('should have rates for all progression types', () => {
      assert.ok(PROGRESSION_RATES.secondary !== undefined);
      assert.ok(PROGRESSION_RATES['solar-arc'] !== undefined);
      assert.ok(PROGRESSION_RATES.minor !== undefined);
      assert.ok(PROGRESSION_RATES.tertiary !== undefined);
    });

    it('should have solar-arc use same rate as secondary', () => {
      assert.equal(PROGRESSION_RATES['solar-arc'], PROGRESSION_RATES.secondary);
    });

    it('should have rates in correct order (secondary < minor)', () => {
      // Minor uses a month per year, so more days elapse
      assert.ok(PROGRESSION_RATES.minor > PROGRESSION_RATES.secondary);
    });
  });

  describe('PROGRESSION_ORBS', () => {
    it('should have orbs for all aspect types', () => {
      for (const aspectType of Object.values(AspectType)) {
        assert.ok(PROGRESSION_ORBS[aspectType] !== undefined, `Missing orb for ${aspectType}`);
      }
    });

    it('should have positive orb values', () => {
      for (const [aspect, orb] of Object.entries(PROGRESSION_ORBS)) {
        assert.ok(orb > 0, `Orb for ${aspect} should be positive, got ${orb}`);
      }
    });

    it('should have major aspects with 1° orb', () => {
      assert.equal(PROGRESSION_ORBS[AspectType.Conjunction], 1.0);
      assert.equal(PROGRESSION_ORBS[AspectType.Opposition], 1.0);
      assert.equal(PROGRESSION_ORBS[AspectType.Square], 1.0);
      assert.equal(PROGRESSION_ORBS[AspectType.Trine], 1.0);
      assert.equal(PROGRESSION_ORBS[AspectType.Sextile], 1.0);
    });

    it('should have minor aspects with 0.5° orb', () => {
      assert.equal(PROGRESSION_ORBS[AspectType.Quincunx], 0.5);
      assert.equal(PROGRESSION_ORBS[AspectType.SemiSextile], 0.5);
      assert.equal(PROGRESSION_ORBS[AspectType.SemiSquare], 0.5);
    });

    it('should have Kepler aspects with very tight orbs (<= 0.5°)', () => {
      assert.ok(PROGRESSION_ORBS[AspectType.Septile] <= 0.5);
      assert.ok(PROGRESSION_ORBS[AspectType.Novile] <= 0.5);
      assert.ok(PROGRESSION_ORBS[AspectType.Decile] <= 0.5);
    });

    it('should have progression orbs much tighter than typical natal orbs', () => {
      // Natal conjunction orb is typically 8°, progression is 1°
      assert.ok(PROGRESSION_ORBS[AspectType.Conjunction] <= 2);
    });
  });

  describe('Orb Extensions', () => {
    it('should have positive luminary extension', () => {
      assert.ok(LUMINARY_ORB_EXTENSION > 0);
      assert.ok(LUMINARY_ORB_EXTENSION <= 1);
    });

    it('should have positive angle extension', () => {
      assert.ok(ANGLE_ORB_EXTENSION > 0);
      assert.ok(ANGLE_ORB_EXTENSION <= 1);
    });
  });

  describe('Thresholds', () => {
    it('should have reasonable exact threshold', () => {
      // ~6 arcminutes = 0.1°
      assert.ok(EXACT_THRESHOLD >= 0.05 && EXACT_THRESHOLD <= 0.2);
    });

    it('should have very small stationary threshold', () => {
      assert.ok(STATIONARY_THRESHOLD > 0);
      assert.ok(STATIONARY_THRESHOLD < 0.01);
    });

    it('should have reasonable max progression age', () => {
      assert.ok(MAX_PROGRESSION_AGE >= 100);
      assert.ok(MAX_PROGRESSION_AGE <= 150);
    });

    it('should have reasonable future warning years', () => {
      assert.ok(FUTURE_WARNING_YEARS >= 30);
      assert.ok(FUTURE_WARNING_YEARS <= 100);
    });
  });

  describe('DEFAULT_PROGRESSION_BODIES', () => {
    it('should include luminaries', () => {
      assert.ok(DEFAULT_PROGRESSION_BODIES.includes(CelestialBody.Sun));
      assert.ok(DEFAULT_PROGRESSION_BODIES.includes(CelestialBody.Moon));
    });

    it('should include inner planets', () => {
      assert.ok(DEFAULT_PROGRESSION_BODIES.includes(CelestialBody.Mercury));
      assert.ok(DEFAULT_PROGRESSION_BODIES.includes(CelestialBody.Venus));
      assert.ok(DEFAULT_PROGRESSION_BODIES.includes(CelestialBody.Mars));
    });

    it('should include Jupiter and Saturn', () => {
      assert.ok(DEFAULT_PROGRESSION_BODIES.includes(CelestialBody.Jupiter));
      assert.ok(DEFAULT_PROGRESSION_BODIES.includes(CelestialBody.Saturn));
    });

    it('should NOT include outer planets (too slow for meaningful progressions)', () => {
      assert.ok(!DEFAULT_PROGRESSION_BODIES.includes(CelestialBody.Uranus));
      assert.ok(!DEFAULT_PROGRESSION_BODIES.includes(CelestialBody.Neptune));
      assert.ok(!DEFAULT_PROGRESSION_BODIES.includes(CelestialBody.Pluto));
    });

    it('should have exactly 7 bodies', () => {
      assert.equal(DEFAULT_PROGRESSION_BODIES.length, 7);
    });
  });

  describe('RETROGRADE_CAPABLE_BODIES', () => {
    it('should include Mercury (most frequent retrograde changes)', () => {
      assert.ok(RETROGRADE_CAPABLE_BODIES.includes(CelestialBody.Mercury));
    });

    it('should include Venus', () => {
      assert.ok(RETROGRADE_CAPABLE_BODIES.includes(CelestialBody.Venus));
    });

    it('should include Mars', () => {
      assert.ok(RETROGRADE_CAPABLE_BODIES.includes(CelestialBody.Mars));
    });

    it('should NOT include luminaries (never retrograde)', () => {
      assert.ok(!RETROGRADE_CAPABLE_BODIES.includes(CelestialBody.Sun));
      assert.ok(!RETROGRADE_CAPABLE_BODIES.includes(CelestialBody.Moon));
    });

    it('should NOT include outer planets (too slow to change direction in progressions)', () => {
      assert.ok(!RETROGRADE_CAPABLE_BODIES.includes(CelestialBody.Jupiter));
      assert.ok(!RETROGRADE_CAPABLE_BODIES.includes(CelestialBody.Saturn));
    });
  });

  describe('LUMINARIES', () => {
    it('should contain Sun and Moon', () => {
      assert.ok(LUMINARIES.includes(CelestialBody.Sun));
      assert.ok(LUMINARIES.includes(CelestialBody.Moon));
    });

    it('should have exactly 2 luminaries', () => {
      assert.equal(LUMINARIES.length, 2);
    });
  });

  describe('PROGRESSED_ANNUAL_MOTION', () => {
    it('should have motion values for default bodies', () => {
      for (const body of DEFAULT_PROGRESSION_BODIES) {
        assert.ok(PROGRESSED_ANNUAL_MOTION[body] !== undefined, `Missing motion for ${body}`);
      }
    });

    it('should have Sun motion close to 1°/year', () => {
      const sunMotion = PROGRESSED_ANNUAL_MOTION[CelestialBody.Sun]!;
      assert.ok(sunMotion > 0.98 && sunMotion < 1.0);
    });

    it('should have Moon motion close to 13°/year', () => {
      const moonMotion = PROGRESSED_ANNUAL_MOTION[CelestialBody.Moon]!;
      assert.ok(moonMotion > 13.0 && moonMotion < 13.3);
    });

    it('should have Moon as fastest body', () => {
      const moonMotion = PROGRESSED_ANNUAL_MOTION[CelestialBody.Moon]!;
      for (const [body, motion] of Object.entries(PROGRESSED_ANNUAL_MOTION)) {
        if (body !== String(CelestialBody.Moon) && motion) {
          assert.ok(moonMotion > motion, `Moon should be faster than ${body}`);
        }
      }
    });

    it('should have outer planets with very slow motion', () => {
      const uranusMotion = PROGRESSED_ANNUAL_MOTION[CelestialBody.Uranus]!;
      const neptuneMotion = PROGRESSED_ANNUAL_MOTION[CelestialBody.Neptune]!;
      const plutoMotion = PROGRESSED_ANNUAL_MOTION[CelestialBody.Pluto]!;

      assert.ok(uranusMotion < 0.02);
      assert.ok(neptuneMotion < 0.01);
      assert.ok(plutoMotion < 0.01);
    });

    it('should follow proper speed ordering (inner faster than outer)', () => {
      const mercury = PROGRESSED_ANNUAL_MOTION[CelestialBody.Mercury]!;
      const mars = PROGRESSED_ANNUAL_MOTION[CelestialBody.Mars]!;
      const jupiter = PROGRESSED_ANNUAL_MOTION[CelestialBody.Jupiter]!;
      const saturn = PROGRESSED_ANNUAL_MOTION[CelestialBody.Saturn]!;

      assert.ok(mercury > mars, 'Mercury faster than Mars');
      assert.ok(mars > jupiter, 'Mars faster than Jupiter');
      assert.ok(jupiter > saturn, 'Jupiter faster than Saturn');
    });
  });

  describe('Sign Progression Timing', () => {
    it('should have Sun sign progression around 30 years', () => {
      // Sun moves ~1°/year, sign = 30°, so ~30 years
      assert.ok(SUN_SIGN_PROGRESSION_YEARS > 29 && SUN_SIGN_PROGRESSION_YEARS < 32);
    });

    it('should have Moon sign progression around 27-28 months', () => {
      // Moon moves ~1°/month, sign = 30°, so ~27-30 months
      assert.ok(MOON_SIGN_PROGRESSION_MONTHS > 26 && MOON_SIGN_PROGRESSION_MONTHS < 30);
    });

    it('should have Moon zodiac cycle around 27 years', () => {
      // Moon moves ~13°/year, zodiac = 360°, so ~27.7 years
      assert.ok(MOON_ZODIAC_CYCLE_YEARS > 27 && MOON_ZODIAC_CYCLE_YEARS < 28);
    });

    it('should be mathematically consistent', () => {
      // Sun: 30° / ~1°/year ≈ 30 years per sign
      const sunYearsCalculated = 30 / SUN_MEAN_DAILY_MOTION;
      assert.ok(Math.abs(SUN_SIGN_PROGRESSION_YEARS - sunYearsCalculated) < 1);

      // Moon: 360° / ~13°/year ≈ 27.3 years for zodiac
      const moonYearsCalculated = 360 / MOON_MEAN_DAILY_MOTION;
      assert.ok(Math.abs(MOON_ZODIAC_CYCLE_YEARS - moonYearsCalculated) < 0.5);
    });
  });

  describe('MAJOR_PROGRESSION_ASPECTS', () => {
    it('should include the five Ptolemaic aspects', () => {
      assert.ok(MAJOR_PROGRESSION_ASPECTS.includes(AspectType.Conjunction));
      assert.ok(MAJOR_PROGRESSION_ASPECTS.includes(AspectType.Sextile));
      assert.ok(MAJOR_PROGRESSION_ASPECTS.includes(AspectType.Square));
      assert.ok(MAJOR_PROGRESSION_ASPECTS.includes(AspectType.Trine));
      assert.ok(MAJOR_PROGRESSION_ASPECTS.includes(AspectType.Opposition));
    });

    it('should have exactly 5 major aspects', () => {
      assert.equal(MAJOR_PROGRESSION_ASPECTS.length, 5);
    });
  });

  describe('ALL_PROGRESSION_ASPECTS', () => {
    it('should include all AspectType values', () => {
      const allAspects = Object.values(AspectType);
      assert.equal(ALL_PROGRESSION_ASPECTS.length, allAspects.length);
    });

    it('should include major aspects', () => {
      for (const major of MAJOR_PROGRESSION_ASPECTS) {
        assert.ok(ALL_PROGRESSION_ASPECTS.includes(major));
      }
    });
  });

  describe('ASPECT_ANGLES', () => {
    it('should have angles for all aspect types', () => {
      for (const aspectType of Object.values(AspectType)) {
        assert.ok(ASPECT_ANGLES[aspectType] !== undefined, `Missing angle for ${aspectType}`);
      }
    });

    it('should have correct Ptolemaic angles', () => {
      assert.equal(ASPECT_ANGLES[AspectType.Conjunction], 0);
      assert.equal(ASPECT_ANGLES[AspectType.Sextile], 60);
      assert.equal(ASPECT_ANGLES[AspectType.Square], 90);
      assert.equal(ASPECT_ANGLES[AspectType.Trine], 120);
      assert.equal(ASPECT_ANGLES[AspectType.Opposition], 180);
    });

    it('should have all angles in 0-180° range', () => {
      for (const [aspect, angle] of Object.entries(ASPECT_ANGLES)) {
        assert.ok(angle >= 0 && angle <= 180, `${aspect}: ${angle}° out of range`);
      }
    });

    it('should have septile at 360/7°', () => {
      const septile = ASPECT_ANGLES[AspectType.Septile];
      const expected = 360 / 7;
      assert.ok(Math.abs(septile - expected) < 0.0001);
    });
  });

  describe('ASPECT_SYMBOLS', () => {
    it('should have symbols for all aspect types', () => {
      for (const aspectType of Object.values(AspectType)) {
        assert.ok(ASPECT_SYMBOLS[aspectType] !== undefined, `Missing symbol for ${aspectType}`);
      }
    });

    it('should have non-empty symbols', () => {
      for (const [aspect, symbol] of Object.entries(ASPECT_SYMBOLS)) {
        assert.ok(symbol.length > 0, `Empty symbol for ${aspect}`);
      }
    });

    it('should have correct traditional symbols', () => {
      assert.equal(ASPECT_SYMBOLS[AspectType.Conjunction], '☌');
      assert.equal(ASPECT_SYMBOLS[AspectType.Opposition], '☍');
      assert.equal(ASPECT_SYMBOLS[AspectType.Square], '□');
      assert.equal(ASPECT_SYMBOLS[AspectType.Trine], '△');
      assert.equal(ASPECT_SYMBOLS[AspectType.Sextile], '⚹');
    });
  });

  describe('BODY_NAMES', () => {
    it('should have names for default progression bodies', () => {
      for (const body of DEFAULT_PROGRESSION_BODIES) {
        assert.ok(BODY_NAMES[body] !== undefined, `Missing name for ${body}`);
      }
    });

    it('should have proper planet names', () => {
      assert.equal(BODY_NAMES[CelestialBody.Sun], 'Sun');
      assert.equal(BODY_NAMES[CelestialBody.Moon], 'Moon');
      assert.equal(BODY_NAMES[CelestialBody.Mercury], 'Mercury');
    });
  });

  describe('SIGN_NAMES', () => {
    it('should have exactly 12 signs', () => {
      assert.equal(SIGN_NAMES.length, 12);
    });

    it('should start with Aries at index 0', () => {
      assert.equal(SIGN_NAMES[0], 'Aries');
    });

    it('should end with Pisces at index 11', () => {
      assert.equal(SIGN_NAMES[11], 'Pisces');
    });

    it('should have all zodiac signs in correct order', () => {
      const expectedOrder = [
        'Aries',
        'Taurus',
        'Gemini',
        'Cancer',
        'Leo',
        'Virgo',
        'Libra',
        'Scorpio',
        'Sagittarius',
        'Capricorn',
        'Aquarius',
        'Pisces',
      ];
      assert.deepEqual([...SIGN_NAMES], expectedOrder);
    });
  });

  describe('DEFAULT_PROGRESSION_CONFIG', () => {
    it('should have type as secondary', () => {
      assert.equal(DEFAULT_PROGRESSION_CONFIG.type, 'secondary');
    });

    it('should have angle method as solar-arc', () => {
      assert.equal(DEFAULT_PROGRESSION_CONFIG.angleMethod, 'solar-arc');
    });

    it('should have bodies matching DEFAULT_PROGRESSION_BODIES', () => {
      assert.deepEqual([...DEFAULT_PROGRESSION_CONFIG.bodies], [...DEFAULT_PROGRESSION_BODIES]);
    });

    it('should not include progressed-to-progressed aspects by default', () => {
      assert.equal(DEFAULT_PROGRESSION_CONFIG.includeProgressedAspects, false);
    });

    it('should include progressed-to-natal aspects by default', () => {
      assert.equal(DEFAULT_PROGRESSION_CONFIG.includeNatalAspects, true);
    });

    it('should use major aspects by default', () => {
      assert.deepEqual([...DEFAULT_PROGRESSION_CONFIG.aspectTypes], [...MAJOR_PROGRESSION_ASPECTS]);
    });

    it('should include solar arc positions by default', () => {
      assert.equal(DEFAULT_PROGRESSION_CONFIG.includeSolarArc, true);
    });

    it('should have zero minimum strength (include all)', () => {
      assert.equal(DEFAULT_PROGRESSION_CONFIG.minimumStrength, 0);
    });

    it('should have proper exact threshold', () => {
      assert.equal(DEFAULT_PROGRESSION_CONFIG.exactThreshold, EXACT_THRESHOLD);
    });
  });

  describe('Validation Constants', () => {
    it('should have reasonable min birth year', () => {
      assert.ok(MIN_BIRTH_YEAR >= 1600);
      assert.ok(MIN_BIRTH_YEAR <= 1900);
    });

    it('should have reasonable max target year', () => {
      assert.ok(MAX_TARGET_YEAR >= 2100);
      assert.ok(MAX_TARGET_YEAR <= 2500);
    });

    it('should have max target year after current year', () => {
      const currentYear = new Date().getFullYear();
      assert.ok(MAX_TARGET_YEAR > currentYear);
    });
  });
});
