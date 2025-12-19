/**
 * Tests for the main Celestine exports.
 *
 * These tests verify that all public APIs are properly exported
 * and functioning from the root module.
 */
import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
// Also import types to verify they're exported
import type { BirthData, CalendarDateTime, ChartOptions } from './index.js';
import {
  // Constants
  ALL_ASPECTS,
  // Aspects
  AspectType,
  // Namespaces
  aspects,
  // Ephemeris
  CelestialBody,
  // Houses
  calculateAngles,
  calculateAspects,
  // Chart API
  calculateChart,
  calculateHouseCusps,
  calculateHouses,
  calculatePlanets,
  chart,
  DEFAULT_ORBS,
  // Zodiac
  DignityState,
  // Time utilities
  deltaT,
  detectAspect,
  Element,
  eclipticToZodiac,
  ephemeris,
  findPatterns,
  formatChart,
  formatZodiacPosition,
  fromJulianDate,
  getAllPositions,
  getAvailableHouseSystems,
  getMoonPosition,
  getPlanetaryDignity,
  getPosition,
  getSignInfo,
  getSunPosition,
  greenwichMeanSiderealTime,
  houses,
  J2000_EPOCH,
  localSiderealTime,
  MAJOR_ASPECTS,
  Modality,
  obliquityOfEcliptic,
  PatternType,
  Planet,
  Sign,
  time,
  toJulianDate,
  validateBirth,
  zodiac,
} from './index.js';

describe('Celestine Public API', () => {
  describe('Module Namespaces', () => {
    it('should export aspects namespace', () => {
      assert.ok(aspects);
      assert.ok(typeof aspects.calculateAspects === 'function');
      assert.ok(typeof aspects.findPatterns === 'function');
    });

    it('should export chart namespace', () => {
      assert.ok(chart);
      assert.ok(typeof chart.calculateChart === 'function');
    });

    it('should export ephemeris namespace', () => {
      assert.ok(ephemeris);
      assert.ok(typeof ephemeris.getSunPosition === 'function');
      assert.ok(typeof ephemeris.getMoonPosition === 'function');
    });

    it('should export houses namespace', () => {
      assert.ok(houses);
      assert.ok(typeof houses.calculateHouses === 'function');
    });

    it('should export time namespace', () => {
      assert.ok(time);
      assert.ok(typeof time.toJulianDate === 'function');
    });

    it('should export zodiac namespace', () => {
      assert.ok(zodiac);
      assert.ok(typeof zodiac.eclipticToZodiac === 'function');
    });
  });

  describe('Chart API', () => {
    it('should export calculateChart function', () => {
      assert.ok(typeof calculateChart === 'function');
    });

    it('should export calculatePlanets function', () => {
      assert.ok(typeof calculatePlanets === 'function');
    });

    it('should export calculateHouseCusps function', () => {
      assert.ok(typeof calculateHouseCusps === 'function');
    });

    it('should export validateBirth function', () => {
      assert.ok(typeof validateBirth === 'function');
    });

    it('should export getAvailableHouseSystems function', () => {
      assert.ok(typeof getAvailableHouseSystems === 'function');
      const systems = getAvailableHouseSystems();
      assert.ok(systems.includes('placidus'));
      assert.ok(systems.includes('koch'));
      assert.ok(systems.includes('equal'));
    });

    it('should export formatChart function', () => {
      assert.ok(typeof formatChart === 'function');
    });

    it('should calculate a complete chart', () => {
      const birthData: BirthData = {
        year: 2000,
        month: 1,
        day: 1,
        hour: 12,
        minute: 0,
        second: 0,
        timezone: 0,
        latitude: 51.5074,
        longitude: -0.1278,
      };

      const result = calculateChart(birthData);

      assert.ok(result.planets.length > 0);
      assert.ok(result.angles);
      assert.ok(result.houses);
      assert.ok(result.aspects);
    });
  });

  describe('Time Utilities', () => {
    it('should export toJulianDate function', () => {
      assert.ok(typeof toJulianDate === 'function');

      const date: CalendarDateTime = {
        year: 2000,
        month: 1,
        day: 1,
        hour: 12,
        minute: 0,
        second: 0,
      };
      const jd = toJulianDate(date);
      assert.equal(jd, J2000_EPOCH); // 2451545.0
    });

    it('should export fromJulianDate function', () => {
      assert.ok(typeof fromJulianDate === 'function');

      const result = fromJulianDate(J2000_EPOCH);
      assert.equal(result.year, 2000);
      assert.equal(result.month, 1);
      assert.equal(result.day, 1);
    });

    it('should export greenwichMeanSiderealTime function', () => {
      assert.ok(typeof greenwichMeanSiderealTime === 'function');

      const gmst = greenwichMeanSiderealTime(J2000_EPOCH);
      assert.ok(gmst >= 0 && gmst < 360);
    });

    it('should export localSiderealTime function', () => {
      assert.ok(typeof localSiderealTime === 'function');
    });

    it('should export deltaT function', () => {
      assert.ok(typeof deltaT === 'function');

      // deltaT takes (year, month), not a Julian Date
      const dt = deltaT(2000, 1);
      assert.ok(typeof dt === 'number');
      // DeltaT at J2000.0 should be around 64 seconds
      assert.ok(dt > 50 && dt < 80);
    });

    it('should export J2000_EPOCH constant', () => {
      assert.equal(J2000_EPOCH, 2451545.0);
    });
  });

  describe('Ephemeris', () => {
    it('should export getSunPosition function', () => {
      assert.ok(typeof getSunPosition === 'function');

      const sun = getSunPosition(J2000_EPOCH);
      assert.ok(typeof sun.longitude === 'number');
      assert.ok(sun.longitude >= 0 && sun.longitude < 360);
    });

    it('should export getMoonPosition function', () => {
      assert.ok(typeof getMoonPosition === 'function');

      const moon = getMoonPosition(J2000_EPOCH);
      assert.ok(typeof moon.longitude === 'number');
    });

    it('should export getPosition function', () => {
      assert.ok(typeof getPosition === 'function');

      const mars = getPosition(CelestialBody.Mars, J2000_EPOCH);
      assert.ok(typeof mars.longitude === 'number');
    });

    it('should export getAllPositions function', () => {
      assert.ok(typeof getAllPositions === 'function');
    });

    it('should export CelestialBody enum', () => {
      assert.ok(CelestialBody);
      assert.ok(CelestialBody.Sun !== undefined);
      assert.ok(CelestialBody.Moon !== undefined);
      assert.ok(CelestialBody.Mars !== undefined);
    });
  });

  describe('Houses', () => {
    it('should export calculateHouses function', () => {
      assert.ok(typeof calculateHouses === 'function');
    });

    it('should export calculateAngles function', () => {
      assert.ok(typeof calculateAngles === 'function');
    });

    it('should export obliquityOfEcliptic function', () => {
      assert.ok(typeof obliquityOfEcliptic === 'function');

      const eps = obliquityOfEcliptic(J2000_EPOCH);
      // Obliquity at J2000.0 should be around 23.44°
      assert.ok(eps > 23 && eps < 24);
    });
  });

  describe('Zodiac', () => {
    it('should export eclipticToZodiac function', () => {
      assert.ok(typeof eclipticToZodiac === 'function');

      const pos = eclipticToZodiac(45.5);
      assert.equal(pos.sign, Sign.Taurus);
    });

    it('should export formatZodiacPosition function', () => {
      assert.ok(typeof formatZodiacPosition === 'function');
    });

    it('should export getPlanetaryDignity function', () => {
      assert.ok(typeof getPlanetaryDignity === 'function');

      const dignity = getPlanetaryDignity(Planet.Mars, Sign.Aries);
      assert.equal(dignity.state, DignityState.Domicile);
    });

    it('should export getSignInfo function', () => {
      assert.ok(typeof getSignInfo === 'function');

      const info = getSignInfo(Sign.Aries);
      assert.equal(info.element, Element.Fire);
      assert.equal(info.modality, Modality.Cardinal);
    });

    it('should export Sign enum', () => {
      assert.ok(Sign);
      assert.ok(Sign.Aries !== undefined);
      assert.ok(Sign.Pisces !== undefined);
    });

    it('should export Planet enum', () => {
      assert.ok(Planet);
      assert.ok(Planet.Mars !== undefined);
    });

    it('should export Element enum', () => {
      assert.ok(Element);
      assert.equal(Element.Fire, 'Fire');
    });

    it('should export Modality enum', () => {
      assert.ok(Modality);
      assert.equal(Modality.Cardinal, 'Cardinal');
    });

    it('should export DignityState enum', () => {
      assert.ok(DignityState);
      assert.ok(DignityState.Domicile !== undefined);
    });
  });

  describe('Aspects', () => {
    it('should export calculateAspects function', () => {
      assert.ok(typeof calculateAspects === 'function');
    });

    it('should export detectAspect function', () => {
      assert.ok(typeof detectAspect === 'function');
    });

    it('should export findPatterns function', () => {
      assert.ok(typeof findPatterns === 'function');
    });

    it('should export AspectType enum', () => {
      assert.ok(AspectType);
      assert.ok(AspectType.Conjunction !== undefined);
      assert.ok(AspectType.Trine !== undefined);
    });

    it('should export PatternType enum', () => {
      assert.ok(PatternType);
      assert.ok(PatternType.GrandTrine !== undefined);
      assert.ok(PatternType.TSquare !== undefined);
    });

    it('should export MAJOR_ASPECTS constant', () => {
      assert.ok(MAJOR_ASPECTS);
      assert.ok(Array.isArray(MAJOR_ASPECTS));
    });

    it('should export ALL_ASPECTS constant', () => {
      assert.ok(ALL_ASPECTS);
      assert.ok(Array.isArray(ALL_ASPECTS));
    });

    it('should export DEFAULT_ORBS constant', () => {
      assert.ok(DEFAULT_ORBS);
      assert.ok(typeof DEFAULT_ORBS === 'object');
    });
  });

  describe('Types (compile-time check)', () => {
    it('should export all chart types', () => {
      // These are compile-time checks - if TypeScript compiles, types are exported
      const _birthData: BirthData = {
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
      const _options: ChartOptions = {};

      // Just verify the types exist (compile-time check)
      assert.ok(true);
    });

    it('should export CalendarDateTime type', () => {
      const _date: CalendarDateTime = {
        year: 2000,
        month: 1,
        day: 1,
        hour: 12,
      };
      assert.ok(true);
    });
  });
});

describe('Integration: Calculate Einstein Chart', () => {
  it('should calculate Einstein chart correctly using public API', () => {
    const einstein: BirthData = {
      year: 1879,
      month: 3,
      day: 14,
      hour: 11,
      minute: 30,
      second: 0,
      timezone: 0.667, // LMT for Ulm
      latitude: 48.4,
      longitude: 10.0,
    };

    const chart = calculateChart(einstein);

    // Sun in Pisces
    const sun = chart.planets.find((p) => p.body === CelestialBody.Sun);
    assert.ok(sun);
    assert.equal(sun.signName, 'Pisces');

    // Moon in Sagittarius
    const moon = chart.planets.find((p) => p.body === CelestialBody.Moon);
    assert.ok(moon);
    assert.equal(moon.signName, 'Sagittarius');

    // Cancer rising (ASC ~11° Cancer)
    assert.equal(chart.angles.ascendant.signName, 'Cancer');

    // MC in Pisces (~12° Pisces) - Swiss Ephemeris verified
    assert.equal(chart.angles.midheaven.signName, 'Pisces');
  });
});
