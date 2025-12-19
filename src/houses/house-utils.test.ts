import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  angularDistance,
  eclipticToZodiac,
  formatZodiacPosition,
  getHousePosition,
  getSignName,
  isOnAngle,
  normalizeAngle,
  oppositePoint,
  signedAngularSeparation,
} from './house-utils.js';

describe('House Utils', () => {
  describe('normalizeAngle', () => {
    it('should keep angles in 0-360 range unchanged', () => {
      assert.equal(normalizeAngle(0), 0);
      assert.equal(normalizeAngle(45), 45);
      assert.equal(normalizeAngle(180), 180);
      assert.equal(normalizeAngle(359.999), 359.999);
    });

    it('should wrap angles beyond 360', () => {
      assert.equal(normalizeAngle(360), 0);
      assert.equal(normalizeAngle(365), 5);
      assert.equal(normalizeAngle(720), 0);
      assert.equal(normalizeAngle(725), 5);
    });

    it('should wrap negative angles', () => {
      assert.equal(normalizeAngle(-30), 330);
      assert.equal(normalizeAngle(-90), 270);
      assert.equal(normalizeAngle(-180), 180);
      assert.equal(normalizeAngle(-360), 0);
    });

    it('should handle decimal values', () => {
      assert.ok(Math.abs(normalizeAngle(365.5) - 5.5) < 0.0001);
      assert.ok(Math.abs(normalizeAngle(-30.25) - 329.75) < 0.0001);
    });
  });

  describe('oppositePoint', () => {
    it('should calculate opposite points correctly', () => {
      assert.equal(oppositePoint(0), 180);
      assert.equal(oppositePoint(180), 0);
      assert.equal(oppositePoint(90), 270);
      assert.equal(oppositePoint(270), 90);
    });

    it('should handle any input angle', () => {
      assert.equal(oppositePoint(15), 195);
      assert.equal(oppositePoint(195), 15);
      assert.equal(oppositePoint(359), 179);
    });

    it('should wrap results properly', () => {
      assert.equal(oppositePoint(200), 20);
      assert.equal(oppositePoint(350), 170);
    });

    it('should handle negative inputs', () => {
      assert.equal(oppositePoint(-30), 150);
    });
  });

  describe('angularDistance', () => {
    it('should calculate distance for simple cases', () => {
      assert.equal(angularDistance(10, 50), 40);
      assert.equal(angularDistance(50, 10), 40); // symmetric
      assert.equal(angularDistance(0, 180), 180);
    });

    it('should take shortest path across 0°/360° boundary', () => {
      assert.equal(angularDistance(350, 10), 20); // not 340
      assert.equal(angularDistance(10, 350), 20); // symmetric
      assert.equal(angularDistance(5, 355), 10); // not 350
    });

    it('should never exceed 180°', () => {
      const testCases = [
        [0, 90],
        [0, 180],
        [0, 270],
        [90, 270],
        [180, 0],
        [270, 90],
        [350, 10],
      ];

      for (const [a1, a2] of testCases) {
        const dist = angularDistance(a1, a2);
        assert.ok(dist >= 0 && dist <= 180, `Distance ${dist} out of range for ${a1}-${a2}`);
      }
    });

    it('should handle identical angles', () => {
      assert.equal(angularDistance(45, 45), 0);
      assert.equal(angularDistance(0, 0), 0);
      assert.equal(angularDistance(0, 360), 0);
    });
  });

  describe('signedAngularSeparation', () => {
    it('should return positive for counter-clockwise motion', () => {
      assert.equal(signedAngularSeparation(10, 50), 40);
      assert.equal(signedAngularSeparation(0, 90), 90);
      assert.equal(signedAngularSeparation(270, 0), 90);
    });

    it('should return negative for clockwise motion', () => {
      assert.equal(signedAngularSeparation(50, 10), -40);
      assert.equal(signedAngularSeparation(90, 0), -90);
      assert.equal(signedAngularSeparation(0, 270), -90);
    });

    it('should handle 0°/360° boundary correctly', () => {
      assert.equal(signedAngularSeparation(350, 10), 20); // crossing forward
      assert.equal(signedAngularSeparation(10, 350), -20); // crossing backward
    });

    it('should return exactly 180 or -180 for opposite points', () => {
      const sep = signedAngularSeparation(0, 180);
      assert.ok(Math.abs(Math.abs(sep) - 180) < 0.0001);
    });

    it('should be anti-symmetric', () => {
      const cases = [
        [10, 50],
        [0, 90],
        [350, 10],
        // Note: 180 degrees is ambiguous (could be +180 or -180)
        // Skip the 0-180 case as it's a special case
      ];

      for (const [a1, a2] of cases) {
        const sep1 = signedAngularSeparation(a1, a2);
        const sep2 = signedAngularSeparation(a2, a1);
        assert.ok(
          Math.abs(sep1 + sep2) < 0.0001,
          `Not anti-symmetric: ${a1}->${a2}=${sep1}, ${a2}->${a1}=${sep2}`,
        );
      }
    });
  });

  describe('getHousePosition', () => {
    const equalCusps = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

    it('should return correct house for simple equal house cusps', () => {
      assert.equal(getHousePosition(15, equalCusps), 1); // 0-30
      assert.equal(getHousePosition(45, equalCusps), 2); // 30-60
      assert.equal(getHousePosition(75, equalCusps), 3); // 60-90
      assert.equal(getHousePosition(195, equalCusps), 7); // 180-210
      assert.equal(getHousePosition(285, equalCusps), 10); // 270-300
    });

    it('should handle positions at exact cusps', () => {
      // A position exactly on a cusp belongs to that house
      assert.equal(getHousePosition(0, equalCusps), 1);
      assert.equal(getHousePosition(30, equalCusps), 2);
      assert.equal(getHousePosition(90, equalCusps), 4);
    });

    it('should handle 12th house wrapping to 1st', () => {
      assert.equal(getHousePosition(350, equalCusps), 12);
      assert.equal(getHousePosition(359, equalCusps), 12);
    });

    it('should work with irregular house cusps', () => {
      // Placidus-style unequal cusps
      const irregularCusps = [0, 25, 55, 90, 130, 165, 180, 205, 235, 270, 310, 345];

      assert.equal(getHousePosition(10, irregularCusps), 1);
      assert.equal(getHousePosition(40, irregularCusps), 2);
      assert.equal(getHousePosition(70, irregularCusps), 3);
      assert.equal(getHousePosition(100, irregularCusps), 4);
    });

    it('should handle cusps that cross 0°/360° boundary', () => {
      // 12th house starts at 350° and ends at cusp 1 (10°)
      const cusps = [10, 40, 70, 100, 130, 160, 190, 220, 250, 280, 310, 350];

      assert.equal(getHousePosition(0, cusps), 12);
      assert.equal(getHousePosition(5, cusps), 12);
      assert.equal(getHousePosition(10, cusps), 1);
      assert.equal(getHousePosition(355, cusps), 12);
    });

    it('should throw error for invalid cusp array length', () => {
      assert.throws(() => {
        getHousePosition(0, [0, 30, 60]); // Only 3 cusps
      });
    });
  });

  describe('isOnAngle', () => {
    it('should return true when within orb', () => {
      assert.ok(isOnAngle(10, 10, 10)); // Exact
      assert.ok(isOnAngle(15, 10, 10)); // 5° away
      assert.ok(isOnAngle(5, 10, 10)); // 5° away
      assert.ok(isOnAngle(20, 10, 10)); // 10° away (at limit)
    });

    it('should return false when outside orb', () => {
      assert.ok(!isOnAngle(25, 10, 10)); // 15° away
      assert.ok(!isOnAngle(0, 10, 5)); // 10° away, orb only 5°
    });

    it('should handle 0°/360° boundary', () => {
      assert.ok(isOnAngle(355, 5, 10)); // 10° away crossing boundary
      assert.ok(isOnAngle(5, 355, 10)); // Same, reversed
      assert.ok(!isOnAngle(340, 5, 10)); // 25° away, outside orb
    });

    it('should use default orb of 10°', () => {
      assert.ok(isOnAngle(15, 10)); // 5° away, default orb
      assert.ok(!isOnAngle(25, 10)); // 15° away, outside default orb
    });
  });

  describe('eclipticToZodiac', () => {
    it('should convert beginning of signs correctly', () => {
      assert.deepEqual(eclipticToZodiac(0), { signIndex: 0, degreeInSign: 0 }); // 0° Aries
      assert.deepEqual(eclipticToZodiac(30), { signIndex: 1, degreeInSign: 0 }); // 0° Taurus
      assert.deepEqual(eclipticToZodiac(60), { signIndex: 2, degreeInSign: 0 }); // 0° Gemini
      assert.deepEqual(eclipticToZodiac(180), { signIndex: 6, degreeInSign: 0 }); // 0° Libra
    });

    it('should convert positions within signs', () => {
      const result1 = eclipticToZodiac(15.5);
      assert.equal(result1.signIndex, 0); // Aries
      assert.ok(Math.abs(result1.degreeInSign - 15.5) < 0.0001);

      const result2 = eclipticToZodiac(45.75);
      assert.equal(result2.signIndex, 1); // Taurus
      assert.ok(Math.abs(result2.degreeInSign - 15.75) < 0.0001);
    });

    it('should handle last sign (Pisces)', () => {
      const result1 = eclipticToZodiac(330);
      assert.equal(result1.signIndex, 11); // Pisces
      assert.equal(result1.degreeInSign, 0);

      const result2 = eclipticToZodiac(359);
      assert.equal(result2.signIndex, 11); // Pisces
      assert.equal(result2.degreeInSign, 29);
    });

    it('should normalize angles first', () => {
      const result1 = eclipticToZodiac(360);
      assert.deepEqual(result1, { signIndex: 0, degreeInSign: 0 });

      const result2 = eclipticToZodiac(-30);
      assert.equal(result2.signIndex, 11); // Pisces
      assert.equal(result2.degreeInSign, 0);
    });
  });

  describe('getSignName', () => {
    it('should return correct sign names', () => {
      assert.equal(getSignName(0), 'Aries');
      assert.equal(getSignName(1), 'Taurus');
      assert.equal(getSignName(2), 'Gemini');
      assert.equal(getSignName(3), 'Cancer');
      assert.equal(getSignName(4), 'Leo');
      assert.equal(getSignName(5), 'Virgo');
      assert.equal(getSignName(6), 'Libra');
      assert.equal(getSignName(7), 'Scorpio');
      assert.equal(getSignName(8), 'Sagittarius');
      assert.equal(getSignName(9), 'Capricorn');
      assert.equal(getSignName(10), 'Aquarius');
      assert.equal(getSignName(11), 'Pisces');
    });

    it('should wrap indices beyond 11', () => {
      assert.equal(getSignName(12), 'Aries');
      assert.equal(getSignName(13), 'Taurus');
    });
  });

  describe('formatZodiacPosition', () => {
    it('should format beginning of signs correctly', () => {
      assert.equal(formatZodiacPosition(0), "0°00' Aries");
      assert.equal(formatZodiacPosition(30), "0°00' Taurus");
      assert.equal(formatZodiacPosition(180), "0°00' Libra");
    });

    it('should format degrees and minutes', () => {
      assert.equal(formatZodiacPosition(15.5), "15°30' Aries");
      assert.equal(formatZodiacPosition(45.75), "15°45' Taurus");
      assert.equal(formatZodiacPosition(200.25), "20°15' Libra");
    });

    it('should pad minutes with leading zero', () => {
      const result = formatZodiacPosition(15.083333); // 15°05'
      assert.ok(result.includes("05'"), `Expected '05' in ${result}`);
    });

    it('should handle end of Pisces', () => {
      assert.equal(formatZodiacPosition(359), "29°00' Pisces");
      assert.equal(formatZodiacPosition(359.5), "29°30' Pisces");
    });

    it('should normalize angles first', () => {
      assert.equal(formatZodiacPosition(360), "0°00' Aries");
      assert.equal(formatZodiacPosition(-30), "0°00' Pisces");
    });
  });

  describe('Integration Tests', () => {
    it('should maintain consistency between functions', () => {
      const longitude = 45.5;

      // Convert to zodiac
      const zodiac = eclipticToZodiac(longitude);

      // Get sign name
      const signName = getSignName(zodiac.signIndex);

      // Format position
      const formatted = formatZodiacPosition(longitude);

      // Should all be consistent
      assert.ok(formatted.includes(signName));
      assert.ok(formatted.includes('15°30')); // 45.5 = 15.5° in second sign
    });

    it('should handle opposite points correctly', () => {
      const asc = 15; // Ascendant
      const dsc = oppositePoint(asc); // Descendant

      // Should be exactly 180° apart
      assert.equal(angularDistance(asc, dsc), 180);

      // Signed separation should be ±180
      assert.ok(Math.abs(Math.abs(signedAngularSeparation(asc, dsc)) - 180) < 0.0001);
    });

    it('should work with real-world house cusp calculation', () => {
      // Example: Equal houses with ASC at 15° Aries
      const asc = 15;
      const cusps: number[] = [];
      for (let i = 0; i < 12; i++) {
        cusps.push(normalizeAngle(asc + i * 30));
      }

      // Verify cusp 1 = ASC
      assert.equal(cusps[0], asc);

      // Verify cusp 7 = DSC (opposite)
      assert.equal(cusps[6], oppositePoint(asc));

      // Verify a planet at 20° Aries is in house 1
      assert.equal(getHousePosition(20, cusps), 1);

      // Verify a planet at 50° is in house 2
      assert.equal(getHousePosition(50, cusps), 2);
    });
  });
});
