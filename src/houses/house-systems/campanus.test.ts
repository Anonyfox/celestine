import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { oppositePoint } from '../house-utils.js';
import { campanusHouses } from './campanus.js';

describe('Campanus Houses', () => {
  const obliquity = 23.44;

  describe('Basic Structure', () => {
    it('should have House 1 = ASC', () => {
      const asc = 15;
      const mc = 285;
      const cusps = campanusHouses(asc, mc, 40, obliquity);

      assert.equal(cusps.cusps[0], asc);
    });

    it('should have House 4 = IC', () => {
      const asc = 15;
      const mc = 285;
      const cusps = campanusHouses(asc, mc, 40, obliquity);

      assert.equal(cusps.cusps[3], oppositePoint(mc));
    });

    it('should have House 7 = DSC', () => {
      const asc = 15;
      const mc = 285;
      const cusps = campanusHouses(asc, mc, 40, obliquity);

      assert.equal(cusps.cusps[6], oppositePoint(asc));
    });

    it('should have House 10 = MC', () => {
      const asc = 15;
      const mc = 285;
      const cusps = campanusHouses(asc, mc, 40, obliquity);

      assert.equal(cusps.cusps[9], mc);
    });

    it('should return exactly 12 cusps', () => {
      const cusps = campanusHouses(15, 285, 40, obliquity);
      assert.equal(cusps.cusps.length, 12);
    });

    it('should create all cusps in valid range [0, 360)', () => {
      const cusps = campanusHouses(15, 285, 40, obliquity);

      for (let i = 0; i < 12; i++) {
        assert.ok(
          cusps.cusps[i] >= 0 && cusps.cusps[i] < 360,
          `Cusp ${i + 1} out of range: ${cusps.cusps[i]}`,
        );
      }
    });
  });

  describe('All Latitudes', () => {
    it('should work at equator', () => {
      const cusps = campanusHouses(0, 270, 0, obliquity);

      assert.equal(cusps.cusps[0], 0);
      assert.equal(cusps.cusps[9], 270);
      assert.ok(cusps.cusps.every((c) => c >= 0 && c < 360));
    });

    it('should work at 30° latitude', () => {
      const cusps = campanusHouses(45, 315, 30, obliquity);

      assert.equal(cusps.cusps[0], 45);
      assert.equal(cusps.cusps[9], 315);
    });

    it('should work at 50° latitude', () => {
      const cusps = campanusHouses(15, 285, 51.5, obliquity);

      assert.equal(cusps.cusps[0], 15);
      assert.equal(cusps.cusps[9], 285);
    });

    it('should work at 60° latitude', () => {
      const cusps = campanusHouses(45, 315, 60, obliquity);

      assert.equal(cusps.cusps[0], 45);
      assert.equal(cusps.cusps[9], 315);
    });

    it('should work at 70° latitude', () => {
      const cusps = campanusHouses(15, 285, 70, obliquity);

      assert.equal(cusps.cusps[0], 15);
      assert.equal(cusps.cusps[9], 285);
    });

    it('should work in Southern hemisphere', () => {
      const cusps = campanusHouses(195, 105, -33.87, obliquity);

      assert.equal(cusps.cusps[0], 195);
      assert.equal(cusps.cusps[9], 105);
    });
  });

  describe('House Progression', () => {
    it('should have cusps in ascending order', () => {
      const cusps = campanusHouses(45, 315, 40, obliquity);

      for (let i = 0; i < 11; i++) {
        const current = cusps.cusps[i];
        const next = cusps.cusps[i + 1];

        let diff = next - current;
        if (diff < 0) diff += 360;

        assert.ok(diff > 0 && diff < 180, `Houses ${i + 1}-${i + 2} not in order`);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle various ASC/MC combinations', () => {
      const testCases = [
        { asc: 0, mc: 270 },
        { asc: 90, mc: 0 },
        { asc: 180, mc: 90 },
        { asc: 270, mc: 180 },
      ];

      for (const { asc, mc } of testCases) {
        const cusps = campanusHouses(asc, mc, 40, obliquity);
        assert.equal(cusps.cusps[0], asc);
        assert.equal(cusps.cusps[9], mc);
      }
    });

    it('should handle ASC/MC near 0°/360° boundary', () => {
      const cusps = campanusHouses(350, 280, 40, obliquity);

      assert.equal(cusps.cusps[0], 350);
      assert.equal(cusps.cusps[9], 280);
      assert.ok(cusps.cusps.every((c) => c >= 0 && c < 360));
    });
  });
});
