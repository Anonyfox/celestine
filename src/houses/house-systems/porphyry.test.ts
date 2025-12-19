import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { oppositePoint } from '../house-utils.js';
import { porphyryHouses } from './porphyry.js';

describe('Porphyry Houses', () => {
  it('should have House 1 = ASC', () => {
    const asc = 15;
    const mc = 285;
    const cusps = porphyryHouses(asc, mc);

    assert.equal(cusps.cusps[0], asc);
  });

  it('should have House 4 = IC (MC + 180)', () => {
    const asc = 15;
    const mc = 285;
    const cusps = porphyryHouses(asc, mc);
    const expectedIc = oppositePoint(mc);

    assert.equal(cusps.cusps[3], expectedIc);
  });

  it('should have House 7 = DSC (ASC + 180)', () => {
    const asc = 15;
    const mc = 285;
    const cusps = porphyryHouses(asc, mc);
    const expectedDsc = oppositePoint(asc);

    assert.equal(cusps.cusps[6], expectedDsc);
  });

  it('should have House 10 = MC', () => {
    const asc = 15;
    const mc = 285;
    const cusps = porphyryHouses(asc, mc);

    assert.equal(cusps.cusps[9], mc);
  });

  it('should divide quadrants equally', () => {
    const asc = 0;
    const mc = 270; // Simple case: MC 90° before ASC

    const cusps = porphyryHouses(asc, mc);
    const ic = 90; // IC opposite MC
    const dsc = 180; // DSC opposite ASC

    // Quadrant 1: ASC (0) → IC (90) = 90° / 3 = 30° per house
    assert.equal(cusps.cusps[0], 0); // House 1 = ASC
    assert.ok(Math.abs(cusps.cusps[1] - 30) < 0.1); // House 2
    assert.ok(Math.abs(cusps.cusps[2] - 60) < 0.1); // House 3
    assert.equal(cusps.cusps[3], ic); // House 4 = IC

    // Quadrant 2: IC (90) → DSC (180) = 90° / 3 = 30° per house
    assert.ok(Math.abs(cusps.cusps[4] - 120) < 0.1); // House 5
    assert.ok(Math.abs(cusps.cusps[5] - 150) < 0.1); // House 6
    assert.equal(cusps.cusps[6], dsc); // House 7 = DSC
  });

  it('should handle wraparound at 0°/360°', () => {
    const asc = 350;
    const mc = 280;

    const cusps = porphyryHouses(asc, mc);

    // All cusps should be valid (0-360)
    for (let i = 0; i < 12; i++) {
      assert.ok(cusps.cusps[i] >= 0 && cusps.cusps[i] < 360);
    }

    // Angles should be correct
    assert.equal(cusps.cusps[0], 350); // ASC
    assert.equal(cusps.cusps[9], 280); // MC
  });

  it('should create cusps in ascending order (mod 360)', () => {
    const asc = 45;
    const mc = 315;

    const cusps = porphyryHouses(asc, mc);

    // Check that cusps progress (allowing for wraparound)
    for (let i = 0; i < 11; i++) {
      const current = cusps.cusps[i];
      const next = cusps.cusps[i + 1];

      // Next should be after current (with wraparound)
      let diff = next - current;
      if (diff < 0) diff += 360;

      assert.ok(diff > 0 && diff < 180, `Houses ${i + 1}-${i + 2} out of order`);
    }
  });

  it('should return exactly 12 cusps', () => {
    const cusps = porphyryHouses(100, 10);
    assert.equal(cusps.cusps.length, 12);
  });

  it('should work with any MC/ASC combination', () => {
    const testCases = [
      { asc: 0, mc: 270 },
      { asc: 90, mc: 0 },
      { asc: 180, mc: 90 },
      { asc: 270, mc: 180 },
      { asc: 15, mc: 285 },
      { asc: 350, mc: 260 },
    ];

    for (const { asc, mc } of testCases) {
      const cusps = porphyryHouses(asc, mc);

      // Verify angles
      assert.equal(cusps.cusps[0], asc);
      assert.equal(cusps.cusps[9], mc);

      // All cusps valid
      for (const cusp of cusps.cusps) {
        assert.ok(cusp >= 0 && cusp < 360);
      }
    }
  });

  it('should handle equal-sized quadrants', () => {
    // When MC is 90° from ASC, all quadrants are equal (90° each)
    const asc = 0;
    const mc = 270;

    const cusps = porphyryHouses(asc, mc);

    // Each quadrant should be divided into 30° houses
    // This is a special case where Porphyry = Equal houses
    for (let i = 1; i < 12; i++) {
      const expected = (i * 30) % 360;
      assert.ok(
        Math.abs(cusps.cusps[i] - expected) < 0.1,
        `House ${i + 1}: expected ~${expected}°, got ${cusps.cusps[i]}°`,
      );
    }
  });

  it('should handle unequal quadrants correctly', () => {
    const asc = 0;
    const mc = 300; // MC only 60° before ASC

    const cusps = porphyryHouses(asc, mc);
    const ic = 120; // IC opposite MC
    const dsc = 180; // DSC opposite ASC

    // Quadrant 4 (MC → ASC) is small: 60° / 3 = 20° per house
    assert.equal(cusps.cusps[9], mc); // House 10 = MC
    assert.ok(Math.abs(cusps.cusps[10] - 320) < 0.1); // House 11
    assert.ok(Math.abs(cusps.cusps[11] - 340) < 0.1); // House 12
    assert.equal(cusps.cusps[0], asc); // House 1 = ASC

    // Quadrant 1 (ASC → IC) is large: 120° / 3 = 40° per house
    assert.ok(Math.abs(cusps.cusps[1] - 40) < 0.1); // House 2
    assert.ok(Math.abs(cusps.cusps[2] - 80) < 0.1); // House 3
    assert.equal(cusps.cusps[3], ic); // House 4 = IC
  });

  it('should create all cusps in valid range [0, 360)', () => {
    const testCases = [
      { asc: 0, mc: 270 },
      { asc: 45, mc: 315 },
      { asc: 90, mc: 0 },
      { asc: 350, mc: 260 },
    ];

    for (const { asc, mc } of testCases) {
      const cusps = porphyryHouses(asc, mc);

      for (let i = 0; i < 12; i++) {
        assert.ok(
          cusps.cusps[i] >= 0 && cusps.cusps[i] < 360,
          `Cusp ${i + 1} out of range: ${cusps.cusps[i]}`,
        );
      }
    }
  });
});
