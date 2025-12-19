/**
 * Tests for Transit Module Constants
 *
 * @remarks
 * Validates that all transit constants are properly defined
 * and have reasonable values based on astronomical data.
 *
 * Sources for validation:
 * - Meeus "Astronomical Algorithms" for planetary motions
 * - Traditional astrological practice for orb values
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { AspectType } from '../aspects/types.js';
import { CelestialBody } from '../ephemeris/positions.js';
import {
  ALL_TRANSIT_ASPECTS,
  ANGLE_ORB_EXTENSION,
  ASPECT_ANGLES,
  ASPECT_SYMBOLS,
  AVERAGE_DAILY_MOTION,
  BODY_NAMES,
  DEFAULT_EXACT_THRESHOLD,
  DEFAULT_TRANSIT_CONFIG,
  DEFAULT_TRANSIT_ORBS,
  DEFAULT_TRANSITING_BODIES,
  EXACT_TIME_TOLERANCE,
  FAST_PLANET_SEARCH_STEP,
  FAST_PLANETS,
  LUMINARIES,
  LUMINARY_ORB_EXTENSION,
  MAJOR_TRANSIT_ASPECTS,
  MAX_BINARY_SEARCH_ITERATIONS,
  MOON_SEARCH_STEP,
  OUTER_PLANET_ORB_EXTENSION,
  RETROGRADE_PLANETS,
  SLOW_PLANET_SEARCH_STEP,
  SLOW_PLANETS,
  STATIONARY_SPEED_THRESHOLD,
  TRANSITING_BODIES,
  TYPICAL_TRANSIT_DURATION_DAYS,
} from './constants.js';

describe('transits/constants', () => {
  describe('DEFAULT_TRANSIT_ORBS', () => {
    it('should have orbs for all aspect types', () => {
      for (const aspectType of Object.values(AspectType)) {
        assert.ok(DEFAULT_TRANSIT_ORBS[aspectType] !== undefined, `Missing orb for ${aspectType}`);
      }
    });

    it('should have positive orb values', () => {
      for (const [aspect, orb] of Object.entries(DEFAULT_TRANSIT_ORBS)) {
        assert.ok(orb > 0, `Orb for ${aspect} should be positive, got ${orb}`);
      }
    });

    it('should have major aspects with wider orbs than minor aspects', () => {
      const majorOrb = DEFAULT_TRANSIT_ORBS[AspectType.Conjunction];
      const minorOrb = DEFAULT_TRANSIT_ORBS[AspectType.Quintile];
      assert.ok(majorOrb > minorOrb, 'Major aspects should have wider orbs');
    });

    it('should have conjunction and opposition with same orb', () => {
      assert.equal(
        DEFAULT_TRANSIT_ORBS[AspectType.Conjunction],
        DEFAULT_TRANSIT_ORBS[AspectType.Opposition],
      );
    });

    it('should have reasonable transit orb range (0.5-3°)', () => {
      for (const orb of Object.values(DEFAULT_TRANSIT_ORBS)) {
        assert.ok(orb >= 0.5 && orb <= 3, `Orb ${orb} outside reasonable range`);
      }
    });
  });

  describe('Orb extensions', () => {
    it('should have positive luminary extension', () => {
      assert.ok(LUMINARY_ORB_EXTENSION > 0);
      assert.ok(LUMINARY_ORB_EXTENSION <= 2); // Should be modest
    });

    it('should have positive angle extension', () => {
      assert.ok(ANGLE_ORB_EXTENSION > 0);
      assert.ok(ANGLE_ORB_EXTENSION <= 2);
    });

    it('should have positive outer planet extension', () => {
      assert.ok(OUTER_PLANET_ORB_EXTENSION > 0);
      assert.ok(OUTER_PLANET_ORB_EXTENSION <= 1);
    });
  });

  describe('TRANSITING_BODIES', () => {
    it('should include all major planets', () => {
      const majorPlanets = [
        CelestialBody.Sun,
        CelestialBody.Moon,
        CelestialBody.Mercury,
        CelestialBody.Venus,
        CelestialBody.Mars,
        CelestialBody.Jupiter,
        CelestialBody.Saturn,
        CelestialBody.Uranus,
        CelestialBody.Neptune,
        CelestialBody.Pluto,
      ];

      for (const planet of majorPlanets) {
        assert.ok(TRANSITING_BODIES.includes(planet), `Missing ${planet} in TRANSITING_BODIES`);
      }
    });

    it('should include Chiron', () => {
      assert.ok(TRANSITING_BODIES.includes(CelestialBody.Chiron));
    });

    it('should include North Node', () => {
      assert.ok(TRANSITING_BODIES.includes(CelestialBody.NorthNode));
    });

    it('should not include Lots (calculated points)', () => {
      // Part of Fortune etc are not in CelestialBody enum
      // This test validates conceptually that we only include bodies that "transit"
      assert.ok(TRANSITING_BODIES.length <= 15, 'Should not have too many bodies');
    });
  });

  describe('DEFAULT_TRANSITING_BODIES', () => {
    it('should be a subset of TRANSITING_BODIES', () => {
      for (const body of DEFAULT_TRANSITING_BODIES) {
        assert.ok(
          TRANSITING_BODIES.includes(body),
          `${body} in defaults but not in all transiting bodies`,
        );
      }
    });

    it('should not include Moon by default (too fast)', () => {
      assert.ok(!DEFAULT_TRANSITING_BODIES.includes(CelestialBody.Moon));
    });

    it('should include Sun', () => {
      assert.ok(DEFAULT_TRANSITING_BODIES.includes(CelestialBody.Sun));
    });
  });

  describe('Planet speed classifications', () => {
    it('should classify Sun as fast', () => {
      assert.ok(FAST_PLANETS.includes(CelestialBody.Sun));
    });

    it('should classify Moon as fast', () => {
      assert.ok(FAST_PLANETS.includes(CelestialBody.Moon));
    });

    it('should classify Saturn as slow', () => {
      assert.ok(SLOW_PLANETS.includes(CelestialBody.Saturn));
    });

    it('should classify Pluto as slow', () => {
      assert.ok(SLOW_PLANETS.includes(CelestialBody.Pluto));
    });

    it('should have no overlap between fast and slow', () => {
      for (const fast of FAST_PLANETS) {
        assert.ok(!SLOW_PLANETS.includes(fast), `${fast} is in both fast and slow lists`);
      }
    });

    it('should classify luminaries correctly', () => {
      assert.ok(LUMINARIES.includes(CelestialBody.Sun));
      assert.ok(LUMINARIES.includes(CelestialBody.Moon));
      assert.equal(LUMINARIES.length, 2);
    });
  });

  describe('RETROGRADE_PLANETS', () => {
    it('should not include Sun (never retrogrades)', () => {
      assert.ok(!RETROGRADE_PLANETS.includes(CelestialBody.Sun));
    });

    it('should not include Moon (never retrogrades)', () => {
      assert.ok(!RETROGRADE_PLANETS.includes(CelestialBody.Moon));
    });

    it('should include Mercury (famous for retrogrades)', () => {
      assert.ok(RETROGRADE_PLANETS.includes(CelestialBody.Mercury));
    });

    it('should include all outer planets', () => {
      const outerPlanets = [
        CelestialBody.Jupiter,
        CelestialBody.Saturn,
        CelestialBody.Uranus,
        CelestialBody.Neptune,
        CelestialBody.Pluto,
      ];
      for (const planet of outerPlanets) {
        assert.ok(RETROGRADE_PLANETS.includes(planet), `${planet} should be in RETROGRADE_PLANETS`);
      }
    });
  });

  describe('AVERAGE_DAILY_MOTION', () => {
    it('should have values for all transiting bodies', () => {
      for (const body of TRANSITING_BODIES) {
        assert.ok(AVERAGE_DAILY_MOTION[body] !== undefined, `Missing daily motion for ${body}`);
      }
    });

    it('should have Moon as fastest body', () => {
      const moonMotion = AVERAGE_DAILY_MOTION[CelestialBody.Moon];
      for (const [body, motion] of Object.entries(AVERAGE_DAILY_MOTION)) {
        if (body !== CelestialBody.Moon.toString()) {
          assert.ok(Math.abs(moonMotion) > Math.abs(motion), `Moon should be faster than ${body}`);
        }
      }
    });

    it('should have Sun at ~1°/day', () => {
      const sunMotion = AVERAGE_DAILY_MOTION[CelestialBody.Sun];
      assert.ok(sunMotion > 0.98 && sunMotion < 1.0, `Sun motion: ${sunMotion}`);
    });

    it('should have Moon at ~13°/day', () => {
      const moonMotion = AVERAGE_DAILY_MOTION[CelestialBody.Moon];
      assert.ok(moonMotion > 12 && moonMotion < 14, `Moon motion: ${moonMotion}`);
    });

    it('should have Pluto as slowest planet', () => {
      const plutoMotion = Math.abs(AVERAGE_DAILY_MOTION[CelestialBody.Pluto]);
      const saturnMotion = Math.abs(AVERAGE_DAILY_MOTION[CelestialBody.Saturn]);
      assert.ok(plutoMotion < saturnMotion, 'Pluto should be slower than Saturn');
    });

    it('should have negative motion for nodes (retrograde)', () => {
      assert.ok(AVERAGE_DAILY_MOTION[CelestialBody.NorthNode] < 0);
      assert.ok(AVERAGE_DAILY_MOTION[CelestialBody.TrueNorthNode] < 0);
    });

    it('should follow proper speed ordering (inner to outer planets)', () => {
      const mercury = Math.abs(AVERAGE_DAILY_MOTION[CelestialBody.Mercury]);
      const mars = Math.abs(AVERAGE_DAILY_MOTION[CelestialBody.Mars]);
      const jupiter = Math.abs(AVERAGE_DAILY_MOTION[CelestialBody.Jupiter]);
      const saturn = Math.abs(AVERAGE_DAILY_MOTION[CelestialBody.Saturn]);
      const uranus = Math.abs(AVERAGE_DAILY_MOTION[CelestialBody.Uranus]);
      const neptune = Math.abs(AVERAGE_DAILY_MOTION[CelestialBody.Neptune]);
      const pluto = Math.abs(AVERAGE_DAILY_MOTION[CelestialBody.Pluto]);

      assert.ok(mercury > mars, 'Mercury faster than Mars');
      assert.ok(mars > jupiter, 'Mars faster than Jupiter');
      assert.ok(jupiter > saturn, 'Jupiter faster than Saturn');
      assert.ok(saturn > uranus, 'Saturn faster than Uranus');
      assert.ok(uranus > neptune, 'Uranus faster than Neptune');
      assert.ok(neptune > pluto, 'Neptune faster than Pluto');
    });
  });

  describe('TYPICAL_TRANSIT_DURATION_DAYS', () => {
    it('should have duration for all transiting bodies', () => {
      for (const body of TRANSITING_BODIES) {
        assert.ok(
          TYPICAL_TRANSIT_DURATION_DAYS[body] !== undefined,
          `Missing duration for ${body}`,
        );
      }
    });

    it('should have Moon with shortest duration (<1 day)', () => {
      const moonDuration = TYPICAL_TRANSIT_DURATION_DAYS[CelestialBody.Moon];
      assert.ok(moonDuration < 1, `Moon duration should be <1 day: ${moonDuration}`);
    });

    it('should have Pluto with longest duration (years)', () => {
      const plutoDuration = TYPICAL_TRANSIT_DURATION_DAYS[CelestialBody.Pluto];
      const neptuneDuration = TYPICAL_TRANSIT_DURATION_DAYS[CelestialBody.Neptune];
      assert.ok(plutoDuration > neptuneDuration, 'Pluto should have longest transits');
      assert.ok(plutoDuration > 365, 'Pluto transits should be >1 year');
    });

    it('should have reasonable Sun transit duration (~1 week)', () => {
      const sunDuration = TYPICAL_TRANSIT_DURATION_DAYS[CelestialBody.Sun];
      assert.ok(sunDuration >= 5 && sunDuration <= 10, `Sun: ${sunDuration} days`);
    });

    it('should follow inverse relationship with speed', () => {
      // Slower planets should have longer transits
      const mercury = TYPICAL_TRANSIT_DURATION_DAYS[CelestialBody.Mercury];
      const saturn = TYPICAL_TRANSIT_DURATION_DAYS[CelestialBody.Saturn];
      assert.ok(saturn > mercury, 'Saturn transits should last longer than Mercury');
    });
  });

  describe('Search parameters', () => {
    it('should have reasonable fast planet step', () => {
      assert.ok(FAST_PLANET_SEARCH_STEP >= 0.5 && FAST_PLANET_SEARCH_STEP <= 2);
    });

    it('should have larger slow planet step', () => {
      assert.ok(SLOW_PLANET_SEARCH_STEP > FAST_PLANET_SEARCH_STEP);
    });

    it('should have sub-day Moon step', () => {
      assert.ok(MOON_SEARCH_STEP < 1);
      assert.ok(MOON_SEARCH_STEP > 0);
    });

    it('should have sufficient binary search iterations', () => {
      assert.ok(MAX_BINARY_SEARCH_ITERATIONS >= 30);
      assert.ok(MAX_BINARY_SEARCH_ITERATIONS <= 100);
    });

    it('should have very small exact time tolerance', () => {
      assert.ok(EXACT_TIME_TOLERANCE < 0.001);
      assert.ok(EXACT_TIME_TOLERANCE > 0);
    });

    it('should have reasonable exact threshold', () => {
      assert.ok(DEFAULT_EXACT_THRESHOLD >= 0.05 && DEFAULT_EXACT_THRESHOLD <= 0.5);
    });

    it('should have very small stationary threshold', () => {
      assert.ok(STATIONARY_SPEED_THRESHOLD < 0.01);
      assert.ok(STATIONARY_SPEED_THRESHOLD > 0);
    });
  });

  describe('ASPECT_ANGLES', () => {
    it('should have angles for all aspect types', () => {
      for (const aspectType of Object.values(AspectType)) {
        assert.ok(ASPECT_ANGLES[aspectType] !== undefined, `Missing angle for ${aspectType}`);
      }
    });

    it('should have conjunction at 0°', () => {
      assert.equal(ASPECT_ANGLES[AspectType.Conjunction], 0);
    });

    it('should have opposition at 180°', () => {
      assert.equal(ASPECT_ANGLES[AspectType.Opposition], 180);
    });

    it('should have square at 90°', () => {
      assert.equal(ASPECT_ANGLES[AspectType.Square], 90);
    });

    it('should have trine at 120°', () => {
      assert.equal(ASPECT_ANGLES[AspectType.Trine], 120);
    });

    it('should have sextile at 60°', () => {
      assert.equal(ASPECT_ANGLES[AspectType.Sextile], 60);
    });

    it('should have all angles in 0-180° range', () => {
      for (const [aspect, angle] of Object.entries(ASPECT_ANGLES)) {
        assert.ok(angle >= 0 && angle <= 180, `${aspect}: ${angle}° out of range`);
      }
    });

    it('should have septile at 360/7°', () => {
      const septile = ASPECT_ANGLES[AspectType.Septile];
      const expected = 360 / 7;
      assert.ok(Math.abs(septile - expected) < 0.01);
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
    it('should have names for all celestial bodies', () => {
      for (const body of Object.values(CelestialBody)) {
        assert.ok(BODY_NAMES[body] !== undefined, `Missing name for ${body}`);
      }
    });

    it('should have proper planet names', () => {
      assert.equal(BODY_NAMES[CelestialBody.Sun], 'Sun');
      assert.equal(BODY_NAMES[CelestialBody.Moon], 'Moon');
      assert.equal(BODY_NAMES[CelestialBody.Mercury], 'Mercury');
      assert.equal(BODY_NAMES[CelestialBody.Pluto], 'Pluto');
    });

    it('should have non-empty names', () => {
      for (const [body, name] of Object.entries(BODY_NAMES)) {
        assert.ok(name.length > 0, `Empty name for ${body}`);
      }
    });
  });

  describe('MAJOR_TRANSIT_ASPECTS', () => {
    it('should include the five Ptolemaic aspects', () => {
      assert.ok(MAJOR_TRANSIT_ASPECTS.includes(AspectType.Conjunction));
      assert.ok(MAJOR_TRANSIT_ASPECTS.includes(AspectType.Sextile));
      assert.ok(MAJOR_TRANSIT_ASPECTS.includes(AspectType.Square));
      assert.ok(MAJOR_TRANSIT_ASPECTS.includes(AspectType.Trine));
      assert.ok(MAJOR_TRANSIT_ASPECTS.includes(AspectType.Opposition));
    });

    it('should have exactly 5 major aspects', () => {
      assert.equal(MAJOR_TRANSIT_ASPECTS.length, 5);
    });
  });

  describe('ALL_TRANSIT_ASPECTS', () => {
    it('should include all AspectType values', () => {
      const allAspects = Object.values(AspectType);
      assert.equal(ALL_TRANSIT_ASPECTS.length, allAspects.length);
    });

    it('should include major aspects', () => {
      for (const major of MAJOR_TRANSIT_ASPECTS) {
        assert.ok(ALL_TRANSIT_ASPECTS.includes(major));
      }
    });
  });

  describe('DEFAULT_TRANSIT_CONFIG', () => {
    it('should have aspectTypes as major aspects', () => {
      assert.deepEqual([...DEFAULT_TRANSIT_CONFIG.aspectTypes], [...MAJOR_TRANSIT_ASPECTS]);
    });

    it('should have default transiting bodies', () => {
      assert.deepEqual(
        [...DEFAULT_TRANSIT_CONFIG.transitingBodies],
        [...DEFAULT_TRANSITING_BODIES],
      );
    });

    it('should not include house ingress by default', () => {
      assert.equal(DEFAULT_TRANSIT_CONFIG.includeHouseIngress, false);
    });

    it('should not calculate exact times by default (performance)', () => {
      assert.equal(DEFAULT_TRANSIT_CONFIG.calculateExactTimes, false);
    });

    it('should include out-of-sign transits by default', () => {
      assert.equal(DEFAULT_TRANSIT_CONFIG.includeOutOfSign, true);
    });

    it('should have zero minimum strength (include all)', () => {
      assert.equal(DEFAULT_TRANSIT_CONFIG.minimumStrength, 0);
    });

    it('should have proper exact threshold', () => {
      assert.equal(DEFAULT_TRANSIT_CONFIG.exactThreshold, DEFAULT_EXACT_THRESHOLD);
    });
  });
});
