import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { oppositePoint } from '../house-utils.js';
import { placidusHouses } from './placidus.js';

describe('Placidus Houses', () => {
  const obliquity = 23.44;

  describe('Basic Structure', () => {
    it('should have House 1 = ASC', () => {
      const asc = 15;
      const mc = 285;
      const cusps = placidusHouses(asc, mc, 40, obliquity);

      assert.equal(cusps.cusps[0], asc);
    });

    it('should have House 4 = IC', () => {
      const asc = 15;
      const mc = 285;
      const cusps = placidusHouses(asc, mc, 40, obliquity);

      assert.equal(cusps.cusps[3], oppositePoint(mc));
    });

    it('should have House 7 = DSC', () => {
      const asc = 15;
      const mc = 285;
      const cusps = placidusHouses(asc, mc, 40, obliquity);

      assert.equal(cusps.cusps[6], oppositePoint(asc));
    });

    it('should have House 10 = MC', () => {
      const asc = 15;
      const mc = 285;
      const cusps = placidusHouses(asc, mc, 40, obliquity);

      assert.equal(cusps.cusps[9], mc);
    });

    it('should return exactly 12 cusps', () => {
      const cusps = placidusHouses(15, 285, 40, obliquity);
      assert.equal(cusps.cusps.length, 12);
    });

    it('should create all cusps in valid range [0, 360)', () => {
      const cusps = placidusHouses(15, 285, 40, obliquity);

      for (let i = 0; i < 12; i++) {
        assert.ok(
          cusps.cusps[i] >= 0 && cusps.cusps[i] < 360,
          `Cusp ${i + 1} out of range: ${cusps.cusps[i]}`,
        );
      }
    });
  });

  describe('Moderate Latitudes', () => {
    it('should work at equator', () => {
      const cusps = placidusHouses(0, 270, 0, obliquity);

      assert.equal(cusps.cusps[0], 0); // ASC
      assert.equal(cusps.cusps[9], 270); // MC
      assert.ok(cusps.cusps.every((c) => c >= 0 && c < 360));
    });

    it('should work at 30° latitude', () => {
      const cusps = placidusHouses(45, 315, 30, obliquity);

      assert.equal(cusps.cusps[0], 45);
      assert.equal(cusps.cusps[9], 315);
      assert.ok(cusps.cusps.every((c) => c >= 0 && c < 360));
    });

    it('should work at 50° latitude (London)', () => {
      const cusps = placidusHouses(15, 285, 51.5, obliquity);

      assert.equal(cusps.cusps[0], 15);
      assert.equal(cusps.cusps[9], 285);
      assert.ok(cusps.cusps.every((c) => c >= 0 && c < 360));
    });

    it('should work in Southern hemisphere', () => {
      const cusps = placidusHouses(195, 105, -33.87, obliquity);

      assert.equal(cusps.cusps[0], 195);
      assert.equal(cusps.cusps[9], 105);
      assert.ok(cusps.cusps.every((c) => c >= 0 && c < 360));
    });
  });

  describe('House Progression', () => {
    it('should have cusps in ascending order', () => {
      const cusps = placidusHouses(45, 315, 40, obliquity);

      // Verify houses progress (allowing for wraparound)
      for (let i = 0; i < 11; i++) {
        const current = cusps.cusps[i];
        const next = cusps.cusps[i + 1];

        let diff = next - current;
        if (diff < 0) diff += 360;

        assert.ok(diff > 0 && diff < 180, `Houses ${i + 1}-${i + 2} not in order`);
      }
    });

    it('should have intermediate houses between angles', () => {
      const asc = 0;
      const mc = 270;
      const cusps = placidusHouses(asc, mc, 40, obliquity);

      // House 2 should be between ASC (0) and IC (90)
      const house2 = cusps.cusps[1];
      assert.ok(house2 > 0 && house2 < 90, `House 2 at ${house2}° not between ASC and IC`);

      // House 3 should also be between ASC and IC, after House 2
      const house3 = cusps.cusps[2];
      assert.ok(house3 > house2 && house3 < 90);
    });
  });

  describe('High Latitudes', () => {
    it('should work at 60° latitude', () => {
      const cusps = placidusHouses(45, 315, 60, obliquity);

      assert.equal(cusps.cusps[0], 45);
      assert.equal(cusps.cusps[9], 315);
      assert.ok(cusps.cusps.every((c) => c >= 0 && c < 360));
    });

    it('should work near limit (65°)', () => {
      const cusps = placidusHouses(15, 285, 65, obliquity);

      assert.equal(cusps.cusps[0], 15);
      assert.equal(cusps.cusps[9], 285);
    });

    it('should fall back to Porphyry above 66° latitude', () => {
      // Should not throw, but fall back to Porphyry gracefully
      const cusps = placidusHouses(15, 285, 70, obliquity);

      // Should still return valid cusps (via Porphyry)
      assert.equal(cusps.cusps[0], 15);
      assert.equal(cusps.cusps[9], 285);
      assert.ok(cusps.cusps.every((c) => c >= 0 && c < 360));
    });

    it('should fall back to Porphyry at North Pole', () => {
      const cusps = placidusHouses(0, 270, 90, obliquity);

      assert.equal(cusps.cusps[0], 0);
      assert.equal(cusps.cusps[9], 270);
    });

    it('should fall back to Porphyry at high Southern latitude', () => {
      const cusps = placidusHouses(0, 270, -70, obliquity);

      assert.equal(cusps.cusps[0], 0);
      assert.equal(cusps.cusps[9], 270);
    });
  });

  describe('Edge Cases', () => {
    it('should handle ASC/MC near 0°/360° boundary', () => {
      const cusps = placidusHouses(350, 280, 40, obliquity);

      assert.equal(cusps.cusps[0], 350);
      assert.equal(cusps.cusps[9], 280);
      assert.ok(cusps.cusps.every((c) => c >= 0 && c < 360));
    });

    it('should handle various ASC/MC combinations', () => {
      const testCases = [
        { asc: 0, mc: 270 },
        { asc: 90, mc: 0 },
        { asc: 180, mc: 90 },
        { asc: 270, mc: 180 },
      ];

      for (const { asc, mc } of testCases) {
        const cusps = placidusHouses(asc, mc, 40, obliquity);
        assert.equal(cusps.cusps[0], asc);
        assert.equal(cusps.cusps[9], mc);
      }
    });

    it('should handle small obliquity variations', () => {
      const cusps1 = placidusHouses(45, 315, 40, 23.4);
      const cusps2 = placidusHouses(45, 315, 40, 23.5);

      // Should both work and be similar
      assert.ok(cusps1.cusps.every((c) => c >= 0 && c < 360));
      assert.ok(cusps2.cusps.every((c) => c >= 0 && c < 360));
    });
  });

  describe('Compared to Simple Systems', () => {
    it('should differ from Equal houses', () => {
      const asc = 45;
      const mc = 315;

      const placidus = placidusHouses(asc, mc, 40, obliquity);

      // Equal houses would have House 2 at 75° (asc + 30)
      // Placidus should be different
      assert.notEqual(placidus.cusps[1], 75);
    });

    it('should have unequal house sizes (unlike Equal)', () => {
      const cusps = placidusHouses(45, 315, 40, obliquity);

      // Calculate house sizes
      const sizes: number[] = [];
      for (let i = 0; i < 12; i++) {
        const current = cusps.cusps[i];
        const next = cusps.cusps[(i + 1) % 12];
        let size = next - current;
        if (size < 0) size += 360;
        sizes.push(size);
      }

      // Houses should NOT all be 30° (unlike Equal houses)
      const allThirty = sizes.every((s) => Math.abs(s - 30) < 0.1);
      assert.ok(!allThirty, 'Placidus houses should not all be 30°');
    });
  });

  describe('Real-World Scenarios', () => {
    it('should work for typical birth chart (New York)', () => {
      // Typical New York coordinates: 40.7128° N
      const cusps = placidusHouses(100, 10, 40.7128, obliquity);

      assert.equal(cusps.cusps[0], 100);
      assert.equal(cusps.cusps[9], 10);
      assert.ok(cusps.cusps.every((c) => c >= 0 && c < 360));
    });

    it('should work for typical birth chart (Los Angeles)', () => {
      // Los Angeles: 34.0522° N
      const cusps = placidusHouses(200, 110, 34.0522, obliquity);

      assert.equal(cusps.cusps[0], 200);
      assert.equal(cusps.cusps[9], 110);
    });

    it('should work for typical birth chart (Paris)', () => {
      // Paris: 48.8566° N
      const cusps = placidusHouses(75, 345, 48.8566, obliquity);

      assert.equal(cusps.cusps[0], 75);
      assert.equal(cusps.cusps[9], 345);
    });
  });
});

