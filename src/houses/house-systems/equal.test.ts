import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { oppositePoint } from '../house-utils.js';
import { equalHouses } from './equal.js';

describe('Equal Houses', () => {
  it('should create 12 cusps exactly 30° apart', () => {
    const asc = 15;
    const cusps = equalHouses(asc);

    for (let i = 0; i < 12; i++) {
      const expected = (asc + i * 30) % 360;
      assert.ok(
        Math.abs(cusps.cusps[i] - expected) < 0.0001,
        `House ${i + 1}: expected ${expected}, got ${cusps.cusps[i]}`,
      );
    }
  });

  it('should have House 1 = Ascendant', () => {
    const asc = 45.5;
    const cusps = equalHouses(asc);

    assert.equal(cusps.cusps[0], asc);
  });

  it('should have House 7 = Descendant (ASC + 180)', () => {
    const asc = 30;
    const cusps = equalHouses(asc);
    const expectedDsc = oppositePoint(asc);

    assert.equal(cusps.cusps[6], expectedDsc);
  });

  it('should handle ASC at 0°', () => {
    const cusps = equalHouses(0);

    assert.equal(cusps.cusps[0], 0);
    assert.equal(cusps.cusps[1], 30);
    assert.equal(cusps.cusps[2], 60);
    assert.equal(cusps.cusps[6], 180);
  });

  it('should handle ASC near 360°', () => {
    const cusps = equalHouses(350);

    assert.equal(cusps.cusps[0], 350);
    assert.ok(Math.abs(cusps.cusps[1] - 20) < 0.0001); // 350 + 30 = 380 = 20
    assert.ok(Math.abs(cusps.cusps[2] - 50) < 0.0001);
  });

  it('should return exactly 12 cusps', () => {
    const cusps = equalHouses(100);
    assert.equal(cusps.cusps.length, 12);
  });

  it('should work with decimal Ascendant values', () => {
    const cusps = equalHouses(15.75);

    assert.equal(cusps.cusps[0], 15.75);
    assert.ok(Math.abs(cusps.cusps[1] - 45.75) < 0.0001);
  });

  it('should create all cusps in valid range [0, 360)', () => {
    const testAscendants = [0, 45, 90, 135, 180, 225, 270, 315, 359.5];

    for (const asc of testAscendants) {
      const cusps = equalHouses(asc);

      for (let i = 0; i < 12; i++) {
        assert.ok(
          cusps.cusps[i] >= 0 && cusps.cusps[i] < 360,
          `Cusp ${i + 1} out of range: ${cusps.cusps[i]}`,
        );
      }
    }
  });

  it('should have houses progress in order', () => {
    const cusps = equalHouses(45);

    for (let i = 0; i < 11; i++) {
      let diff = cusps.cusps[i + 1] - cusps.cusps[i];
      if (diff < 0) diff += 360; // Handle wraparound

      assert.ok(
        Math.abs(diff - 30) < 0.0001,
        `Houses ${i + 1} and ${i + 2} not 30° apart: ${diff}°`,
      );
    }
  });

  it('should handle negative ASC (gets normalized)', () => {
    const cusps = equalHouses(-30);

    assert.equal(cusps.cusps[0], 330); // -30 normalized
    assert.ok(Math.abs(cusps.cusps[1] - 0) < 0.0001);
  });

  it('should handle ASC > 360 (gets normalized)', () => {
    const cusps = equalHouses(365);

    assert.equal(cusps.cusps[0], 5); // 365 normalized
    assert.equal(cusps.cusps[1], 35);
  });
});

