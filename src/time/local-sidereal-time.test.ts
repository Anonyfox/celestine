import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { localSiderealTime } from './local-sidereal-time.js';

describe('Local Sidereal Time', () => {
  describe('localSiderealTime', () => {
    it('should return GMST when longitude is 0 (Greenwich)', () => {
      const gmst = 280.5;
      const longitude = 0;
      const lst = localSiderealTime(gmst, longitude);
      assert.equal(lst, gmst);
    });

    it('should add positive longitude (East)', () => {
      const gmst = 100;
      const longitude = 50; // 50° East
      const lst = localSiderealTime(gmst, longitude);
      assert.equal(lst, 150);
    });

    it('should subtract negative longitude (West)', () => {
      const gmst = 200;
      const longitude = -50; // 50° West
      const lst = localSiderealTime(gmst, longitude);
      assert.equal(lst, 150);
    });

    it('should wrap around 360 degrees', () => {
      const gmst = 350;
      const longitude = 20;
      const lst = localSiderealTime(gmst, longitude);
      // 350 + 20 = 370, wrapped to 10
      assert.equal(lst, 10);
    });

    it('should handle wrap-around for negative result', () => {
      const gmst = 10;
      const longitude = -50;
      const lst = localSiderealTime(gmst, longitude);
      // 10 - 50 = -40, wrapped to 320
      assert.equal(lst, 320);
    });

    it('should return value in range [0, 360)', () => {
      const testCases = [
        { gmst: 0, longitude: 0 },
        { gmst: 180, longitude: 90 },
        { gmst: 270, longitude: -90 },
        { gmst: 359, longitude: 10 },
        { gmst: 1, longitude: -10 },
      ];

      for (const { gmst, longitude } of testCases) {
        const lst = localSiderealTime(gmst, longitude);
        assert.ok(lst >= 0, `LST should be >= 0, got ${lst}`);
        assert.ok(lst < 360, `LST should be < 360, got ${lst}`);
      }
    });

    it('should handle major world cities', () => {
      const gmst = 180;

      // London (0.1278° W)
      const lstLondon = localSiderealTime(gmst, -0.1278);
      assert.ok(Math.abs(lstLondon - 179.8722) < 0.001);

      // New York (74.006° W)
      const lstNY = localSiderealTime(gmst, -74.006);
      assert.ok(Math.abs(lstNY - 105.994) < 0.01);

      // Tokyo (139.6917° E)
      const lstTokyo = localSiderealTime(gmst, 139.6917);
      assert.ok(Math.abs(lstTokyo - 319.6917) < 0.001);

      // Sydney (151.2093° E)
      const lstSydney = localSiderealTime(gmst, 151.2093);
      assert.ok(Math.abs(lstSydney - 331.2093) < 0.001);
    });

    it('should handle extreme longitudes', () => {
      const gmst = 180;

      // 180° E
      const lst180E = localSiderealTime(gmst, 180);
      assert.equal(lst180E, 0); // 180 + 180 = 360 = 0

      // 180° W
      const lst180W = localSiderealTime(gmst, -180);
      assert.equal(lst180W, 0); // 180 - 180 = 0
    });

    it('should be linear with longitude', () => {
      const gmst = 100;

      // Each degree of longitude should add 1 degree to LST
      const lst1 = localSiderealTime(gmst, 10);
      const lst2 = localSiderealTime(gmst, 20);

      const delta = lst2 - lst1;
      assert.equal(delta, 10);
    });

    it('should handle fractional degrees', () => {
      const gmst = 100.5;
      const longitude = 25.75;
      const lst = localSiderealTime(gmst, longitude);
      assert.ok(Math.abs(lst - 126.25) < 1e-10);
    });

    it('should handle zero GMST', () => {
      const longitude = 45;
      const lst = localSiderealTime(0, longitude);
      assert.equal(lst, 45);
    });

    it('should handle 360° GMST (which normalizes to 0)', () => {
      const longitude = 45;
      const lst = localSiderealTime(360, longitude);
      assert.equal(lst, 45); // 360 + 45 normalizes to 45
    });

    it('should be symmetric for ±180°', () => {
      const gmst = 90;

      const lstEast = localSiderealTime(gmst, 180);
      const lstWest = localSiderealTime(gmst, -180);

      // Both should give the same result
      assert.equal(lstEast, lstWest);
    });

    it('should handle multiple wraps', () => {
      const gmst = 350;
      const longitude = 380; // More than 360°

      const lst = localSiderealTime(gmst, longitude);
      // 350 + 380 = 730 = 10 after normalization
      assert.equal(lst, 10);
    });

    it('should handle large negative longitudes', () => {
      const gmst = 10;
      const longitude = -400; // Less than -360°

      const lst = localSiderealTime(gmst, longitude);
      // 10 - 400 = -390 = 330 after normalization
      assert.equal(lst, 330);
    });
  });

  describe('Real-world scenarios', () => {
    it('should calculate LST for specific locations at specific GMST', () => {
      // Example: GMST = 250°

      const gmst = 250;

      // Los Angeles (118.2437° W)
      const lstLA = localSiderealTime(gmst, -118.2437);
      assert.ok(lstLA >= 0 && lstLA < 360);
      assert.ok(Math.abs(lstLA - 131.7563) < 0.001);

      // Paris (2.3522° E)
      const lstParis = localSiderealTime(gmst, 2.3522);
      assert.ok(lstParis >= 0 && lstParis < 360);
      assert.ok(Math.abs(lstParis - 252.3522) < 0.001);

      // Mumbai (72.8777° E)
      const lstMumbai = localSiderealTime(gmst, 72.8777);
      assert.ok(lstMumbai >= 0 && lstMumbai < 360);
      assert.ok(Math.abs(lstMumbai - 322.8777) < 0.001);
    });

    it('should show that LST differs across longitudes at same instant', () => {
      const gmst = 150; // Same moment in time

      const lst1 = localSiderealTime(gmst, 0); // Greenwich
      const lst2 = localSiderealTime(gmst, 90); // 90° East
      const lst3 = localSiderealTime(gmst, -90); // 90° West

      // All different
      assert.notEqual(lst1, lst2);
      assert.notEqual(lst1, lst3);
      assert.notEqual(lst2, lst3);

      // Correct values
      assert.equal(lst1, 150);
      assert.equal(lst2, 240);
      assert.equal(lst3, 60);
    });
  });

  describe('Edge cases', () => {
    it('should handle very small values', () => {
      const lst = localSiderealTime(0.001, 0.001);
      assert.ok(Math.abs(lst - 0.002) < 1e-10);
    });

    it('should handle values near 360', () => {
      const lst = localSiderealTime(359.999, 0.002);
      // Should wrap to just over 0
      assert.ok(lst >= 0 && lst < 1);
    });

    it('should handle negative GMST (edge case)', () => {
      // Technically GMST should always be 0-360, but function should handle it
      const lst = localSiderealTime(-10, 50);
      // -10 + 50 = 40
      assert.equal(lst, 40);
    });
  });
});
