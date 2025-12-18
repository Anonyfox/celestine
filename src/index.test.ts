import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { eclipticToZodiac, greet, julianDate } from './index.js';

describe('greet', () => {
  it('should return a celestial greeting', () => {
    const result = greet('Stargazer');
    assert.equal(result, 'Hello from the stars, Stargazer!');
  });

  it('should handle empty string', () => {
    const result = greet('');
    assert.equal(result, 'Hello from the stars, !');
  });
});

describe('julianDate', () => {
  it('should calculate J2000.0 epoch correctly', () => {
    // January 1, 2000, 12:00 UT = JD 2451545.0
    const jd = julianDate(2000, 1, 1, 12);
    assert.equal(jd, 2451545.0);
  });

  it('should calculate dates with decimal hours', () => {
    // January 1, 2000, 00:00 UT
    const jd = julianDate(2000, 1, 1, 0);
    assert.equal(jd, 2451544.5);
  });

  it('should handle dates in different months', () => {
    // December 31, 1999, 12:00 UT
    const jd = julianDate(1999, 12, 31, 12);
    assert.equal(jd, 2451544.0);
  });
});

describe('eclipticToZodiac', () => {
  it('should convert 0° to Aries', () => {
    const result = eclipticToZodiac(0);
    assert.equal(result.signIndex, 0);
    assert.equal(result.signName, 'Aries');
    assert.equal(result.degree, 0);
  });

  it('should convert 45.5° to Taurus', () => {
    const result = eclipticToZodiac(45.5);
    assert.equal(result.signIndex, 1);
    assert.equal(result.signName, 'Taurus');
    assert.equal(Math.round(result.degree * 10) / 10, 15.5);
  });

  it('should convert 359° to Pisces', () => {
    const result = eclipticToZodiac(359);
    assert.equal(result.signIndex, 11);
    assert.equal(result.signName, 'Pisces');
  });

  it('should handle values over 360°', () => {
    const result = eclipticToZodiac(365);
    assert.equal(result.signIndex, 0);
    assert.equal(result.signName, 'Aries');
    assert.equal(result.degree, 5);
  });

  it('should format degree output correctly', () => {
    const result = eclipticToZodiac(45.5);
    assert.match(result.formatted, /15°30' Taurus/);
  });
});
