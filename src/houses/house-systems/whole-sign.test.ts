import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { oppositePoint } from '../house-utils.js';
import { wholeSignHouses } from './whole-sign.js';

describe('Whole Sign Houses', () => {
  it('should start House 1 at beginning of sign containing ASC', () => {
    // ASC at 15° Aries (sign 0) -> House 1 should start at 0°
    const cusps1 = wholeSignHouses(15);
    assert.equal(cusps1.cusps[0], 0);

    // ASC at 45° Taurus (sign 1) -> House 1 should start at 30°
    const cusps2 = wholeSignHouses(45);
    assert.equal(cusps2.cusps[0], 30);

    // ASC at 195° Libra (sign 6) -> House 1 should start at 180°
    const cusps3 = wholeSignHouses(195);
    assert.equal(cusps3.cusps[0], 180);
  });

  it('should have each house cusp at 0° of a sign', () => {
    const cusps = wholeSignHouses(15);

    for (let i = 0; i < 12; i++) {
      const cusp = cusps.cusps[i];
      // Each cusp should be a multiple of 30
      assert.equal(cusp % 30, 0, `House ${i + 1} cusp ${cusp}° not at sign boundary`);
    }
  });

  it('should create 12 cusps exactly 30° apart', () => {
    const cusps = wholeSignHouses(45);

    for (let i = 0; i < 11; i++) {
      let diff = cusps.cusps[i + 1] - cusps.cusps[i];
      if (diff < 0) diff += 360; // Handle wraparound
      assert.equal(diff, 30, `Houses ${i + 1}-${i + 2} not 30° apart`);
    }
  });

  it('should handle ASC at exact sign boundary', () => {
    const cusps = wholeSignHouses(30); // Exactly at 0° Taurus

    assert.equal(cusps.cusps[0], 30); // House 1 starts at 0° Taurus
    assert.equal(cusps.cusps[1], 60); // House 2 starts at 0° Gemini
  });

  it('should handle ASC at end of sign', () => {
    const cusps = wholeSignHouses(29.9); // 29°54' Aries

    assert.equal(cusps.cusps[0], 0); // House 1 still starts at 0° Aries
  });

  it('should handle ASC in Pisces', () => {
    const cusps = wholeSignHouses(350); // 20° Pisces

    assert.equal(cusps.cusps[0], 330); // House 1 = 0° Pisces
    assert.equal(cusps.cusps[1], 0); // House 2 = 0° Aries (wraparound)
    assert.equal(cusps.cusps[11], 300); // House 12 = 0° Aquarius
  });

  it('should return exactly 12 cusps', () => {
    const cusps = wholeSignHouses(100);
    assert.equal(cusps.cusps.length, 12);
  });

  it('should work regardless of decimal ASC value within sign', () => {
    const cusps1 = wholeSignHouses(45.0);
    const cusps2 = wholeSignHouses(45.5);
    const cusps3 = wholeSignHouses(45.999);

    // All should have House 1 starting at 30° (Taurus)
    assert.equal(cusps1.cusps[0], 30);
    assert.equal(cusps2.cusps[0], 30);
    assert.equal(cusps3.cusps[0], 30);
  });

  it('should have House 7 opposite House 1', () => {
    const cusps = wholeSignHouses(45);
    const house1 = cusps.cusps[0];
    const house7 = cusps.cusps[6];

    assert.equal(house7, oppositePoint(house1));
  });

  it('should handle each zodiac sign correctly', () => {
    const testCases = [
      { asc: 5, expectedHouse1: 0 }, // Aries
      { asc: 35, expectedHouse1: 30 }, // Taurus
      { asc: 65, expectedHouse1: 60 }, // Gemini
      { asc: 95, expectedHouse1: 90 }, // Cancer
      { asc: 125, expectedHouse1: 120 }, // Leo
      { asc: 155, expectedHouse1: 150 }, // Virgo
      { asc: 185, expectedHouse1: 180 }, // Libra
      { asc: 215, expectedHouse1: 210 }, // Scorpio
      { asc: 245, expectedHouse1: 240 }, // Sagittarius
      { asc: 275, expectedHouse1: 270 }, // Capricorn
      { asc: 305, expectedHouse1: 300 }, // Aquarius
      { asc: 335, expectedHouse1: 330 }, // Pisces
    ];

    for (const { asc, expectedHouse1 } of testCases) {
      const cusps = wholeSignHouses(asc);
      assert.equal(
        cusps.cusps[0],
        expectedHouse1,
        `ASC ${asc}° should start house 1 at ${expectedHouse1}°`,
      );
    }
  });

  it('should create all cusps in valid range [0, 360)', () => {
    const testAscendants = [0, 45, 90, 135, 180, 225, 270, 315, 359.5];

    for (const asc of testAscendants) {
      const cusps = wholeSignHouses(asc);

      for (let i = 0; i < 12; i++) {
        assert.ok(
          cusps.cusps[i] >= 0 && cusps.cusps[i] < 360,
          `Cusp ${i + 1} out of range: ${cusps.cusps[i]}`,
        );
      }
    }
  });

  it('should handle normalized vs non-normalized ASC the same', () => {
    const cusps1 = wholeSignHouses(45);
    const cusps2 = wholeSignHouses(405); // 45 + 360
    const cusps3 = wholeSignHouses(-315); // 45 - 360

    assert.deepEqual(cusps1, cusps2);
    assert.deepEqual(cusps1, cusps3);
  });
});

