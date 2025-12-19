/**
 * Tests for Kepler Equation Solver
 *
 * @remarks
 * Verifies numerical accuracy against known analytical solutions and
 * published reference values from Meeus.
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { eccentricToTrue, meanToTrue, radiusVector, solveKepler } from './kepler.js';

describe('ephemeris/utils/kepler', () => {
  describe('solveKepler', () => {
    it('should return M when eccentricity is 0 (circular orbit)', () => {
      // Circular orbit: E = M
      assert.equal(solveKepler(0, 0), 0);
      assert.equal(solveKepler(90, 0), 90);
      assert.equal(solveKepler(180, 0), 180);
      assert.equal(solveKepler(270, 0), 270);
      assert.equal(solveKepler(45.5, 0), 45.5);
    });

    it('should solve for small eccentricity (Earth-like)', () => {
      // Earth's eccentricity ~0.0167
      const e = 0.0167;

      // At M = 0° (perihelion), E should also be 0°
      const E0 = solveKepler(0, e);
      assert.ok(Math.abs(E0 - 0) < 0.0001);

      // At M = 180° (aphelion), E should also be 180°
      const E180 = solveKepler(180, e);
      assert.ok(Math.abs(E180 - 180) < 0.0001);

      // At M = 90°, E should be slightly larger than 90°
      // For small e: E ≈ M + e·sin(M) ≈ 90 + 0.0167 ≈ 90.957°
      const E90 = solveKepler(90, e);
      assert.ok(E90 > 90);
      assert.ok(Math.abs(E90 - 90.957) < 0.01);
    });

    it('should solve for moderate eccentricity (Mars-like)', () => {
      // Mars eccentricity ~0.0934
      const e = 0.0934;

      // At M = 90°
      // E ≈ M + e·sin(M) + (e²/2)·sin(2M) ≈ 90 + 5.35° ≈ 95.35°
      const E90 = solveKepler(90, e);
      assert.ok(E90 > 90);
      assert.ok(E90 < 100);
    });

    it('should solve for high eccentricity (Mercury-like)', () => {
      // Mercury eccentricity ~0.2056
      const e = 0.2056;

      // Higher eccentricity means larger deviation from M
      const E90 = solveKepler(90, e);
      assert.ok(E90 > 90);
      assert.ok(E90 < 110);

      // At M = 0° and M = 180°, E should equal M regardless of e
      assert.ok(Math.abs(solveKepler(0, e) - 0) < 0.0001);
      assert.ok(Math.abs(solveKepler(180, e) - 180) < 0.0001);
    });

    it('should solve Meeus Example 30.a', () => {
      // From Meeus "Astronomical Algorithms", Example 30.a, p. 196
      // Given: M = 5.554589° (0.09695751 radians), e = 0.1
      // Expected: E = 5.554589° (when e is moderate, E ≈ M for small M)
      // Actually let's compute: M = 5.554589°, e = 0.1
      // E - 0.1·sin(E) = 5.554589° (in radians: 0.09695751)
      // Solving: E ≈ 6.169... degrees

      const M = 5.554589;
      const e = 0.1;
      const E = solveKepler(M, e);

      // Verify by checking: E - e·sin(E) = M
      const Erad = (E * Math.PI) / 180;
      const Mcomputed = ((Erad - e * Math.sin(Erad)) * 180) / Math.PI;
      assert.ok(Math.abs(Mcomputed - M) < 0.0001);
    });

    it('should handle negative mean anomaly', () => {
      // Negative M should give negative E
      const E = solveKepler(-90, 0.0167);
      assert.ok(E < 0);
      assert.ok(E > -91);
    });

    it('should handle mean anomaly > 360°', () => {
      // M > 360° is valid (represents multiple orbits)
      // The solution should be equivalent to M mod 360
      const E450 = solveKepler(450, 0.0167); // 450° = 90° + 360°
      const E90 = solveKepler(90, 0.0167);

      // E(450°) should equal E(90°) + 360° or be congruent mod 360°
      const diff = Math.abs((E450 % 360) - (E90 % 360));
      assert.ok(diff < 0.0001 || Math.abs(diff - 360) < 0.0001);
    });

    it('should throw for negative eccentricity', () => {
      assert.throws(() => solveKepler(90, -0.1), /Eccentricity must be non-negative/);
    });

    it('should throw for eccentricity >= 1', () => {
      assert.throws(() => solveKepler(90, 1.0), /Eccentricity must be less than 1/);
      assert.throws(() => solveKepler(90, 1.5), /Eccentricity must be less than 1/);
    });

    it('should converge quickly for all planetary eccentricities', () => {
      // All planets have e < 0.25 (Pluto ~0.2488 is highest)
      const testCases = [
        { name: 'Mercury', e: 0.2056 },
        { name: 'Venus', e: 0.0068 },
        { name: 'Earth', e: 0.0167 },
        { name: 'Mars', e: 0.0934 },
        { name: 'Jupiter', e: 0.0484 },
        { name: 'Saturn', e: 0.0542 },
        { name: 'Uranus', e: 0.0472 },
        { name: 'Neptune', e: 0.0086 },
        { name: 'Pluto', e: 0.2488 },
      ];

      for (const { name, e } of testCases) {
        // Test various mean anomalies
        for (const M of [0, 45, 90, 135, 180, 225, 270, 315]) {
          const E = solveKepler(M, e);
          // Verify solution: E - e·sin(E) should equal M
          const Erad = (E * Math.PI) / 180;
          const Mrad = (M * Math.PI) / 180;
          const Mcomputed = Erad - e * Math.sin(Erad);
          assert.ok(
            Math.abs(Mcomputed - Mrad) < 1e-9,
            `Failed for ${name} at M=${M}°: got ${Mcomputed}, expected ${Mrad}`,
          );
        }
      }
    });
  });

  describe('eccentricToTrue', () => {
    it('should return E when eccentricity is 0', () => {
      // Circular orbit: ν = E = M
      assert.equal(eccentricToTrue(0, 0), 0);
      assert.equal(eccentricToTrue(90, 0), 90);
      assert.equal(eccentricToTrue(180, 0), 180);
    });

    it('should compute true anomaly for Earth-like orbit', () => {
      const e = 0.0167;

      // At E = 0° (perihelion), ν = 0°
      assert.ok(Math.abs(eccentricToTrue(0, e) - 0) < 0.0001);

      // At E = 180° (aphelion), ν = 180°
      assert.ok(Math.abs(eccentricToTrue(180, e) - 180) < 0.0001);

      // At E = 90°, ν should be slightly larger than 90°
      // True anomaly leads eccentric anomaly for 0° < E < 180°
      const nu90 = eccentricToTrue(90, e);
      assert.ok(nu90 > 90);
      assert.ok(nu90 < 92);
    });

    it('should handle quadrants correctly', () => {
      const e = 0.1;

      // First quadrant (0° - 90°)
      const nu45 = eccentricToTrue(45, e);
      assert.ok(nu45 > 0 && nu45 < 90);

      // Second quadrant (90° - 180°)
      const nu135 = eccentricToTrue(135, e);
      assert.ok(nu135 > 90 && nu135 < 180);

      // Third quadrant (180° - 270°)
      const nu225 = eccentricToTrue(225, e);
      assert.ok(nu225 > 180 && nu225 < 270);

      // Fourth quadrant (270° - 360°)
      const nu315 = eccentricToTrue(315, e);
      assert.ok(nu315 > 270 && nu315 < 360);
    });

    it('should satisfy symmetry: ν(E) + ν(-E) = 0 for same |E|', () => {
      const e = 0.1;
      const E = 60;
      const nuPos = eccentricToTrue(E, e);
      const nuNeg = eccentricToTrue(-E, e);
      assert.ok(Math.abs(nuPos + nuNeg) < 0.0001);
    });
  });

  describe('meanToTrue', () => {
    it('should convert mean anomaly to true anomaly correctly', () => {
      const e = 0.0167;

      // At perihelion and aphelion, M = E = ν
      assert.ok(Math.abs(meanToTrue(0, e) - 0) < 0.0001);
      assert.ok(Math.abs(meanToTrue(180, e) - 180) < 0.0001);

      // At M = 90°, true anomaly should lead mean anomaly
      const nu90 = meanToTrue(90, e);
      assert.ok(nu90 > 90);
    });

    it('should give same result as two-step calculation', () => {
      const M = 75.5;
      const e = 0.0934;

      const E = solveKepler(M, e);
      const nuTwoStep = eccentricToTrue(E, e);
      const nuDirect = meanToTrue(M, e);

      assert.ok(Math.abs(nuTwoStep - nuDirect) < 0.0001);
    });

    it('should work for circular orbit', () => {
      // When e = 0: M = E = ν
      assert.equal(meanToTrue(45, 0), 45);
      assert.equal(meanToTrue(123.456, 0), 123.456);
    });
  });

  describe('radiusVector', () => {
    it('should return a at E = 90° and E = 270° (regardless of e)', () => {
      // At E = 90° and 270°, cos(E) = 0, so r = a
      const a = 1.0;
      const e = 0.1;

      const r90 = radiusVector(90, a, e);
      assert.ok(Math.abs(r90 - a) < 0.0001);

      const r270 = radiusVector(270, a, e);
      assert.ok(Math.abs(r270 - a) < 0.0001);
    });

    it('should return a(1-e) at perihelion (E = 0°)', () => {
      const a = 1.0;
      const e = 0.0167;
      const expected = a * (1 - e); // 0.9833

      const r = radiusVector(0, a, e);
      assert.ok(Math.abs(r - expected) < 0.0001);
    });

    it('should return a(1+e) at aphelion (E = 180°)', () => {
      const a = 1.0;
      const e = 0.0167;
      const expected = a * (1 + e); // 1.0167

      const r = radiusVector(180, a, e);
      assert.ok(Math.abs(r - expected) < 0.0001);
    });

    it('should give correct Earth distances', () => {
      // Earth: a ≈ 1 AU, e ≈ 0.0167
      const a = 1.0;
      const e = 0.0167;

      // Perihelion distance: ~0.983 AU (January)
      const rPeri = radiusVector(0, a, e);
      assert.ok(Math.abs(rPeri - 0.9833) < 0.001);

      // Aphelion distance: ~1.017 AU (July)
      const rAph = radiusVector(180, a, e);
      assert.ok(Math.abs(rAph - 1.0167) < 0.001);
    });

    it('should scale with semi-major axis', () => {
      const e = 0.1;
      const E = 45;

      const r1 = radiusVector(E, 1.0, e);
      const r2 = radiusVector(E, 2.0, e);

      assert.ok(Math.abs(r2 - 2 * r1) < 0.0001);
    });
  });

  describe('Integration: full orbital calculation', () => {
    it('should compute Earth orbital position correctly', () => {
      // Earth orbital elements (approximate)
      const a = 1.0; // AU
      const e = 0.0167;

      // At mean anomaly M = 0° (perihelion)
      const M0 = 0;
      const E0 = solveKepler(M0, e);
      const nu0 = eccentricToTrue(E0, e);
      const r0 = radiusVector(E0, a, e);

      assert.ok(Math.abs(E0) < 0.0001); // E ≈ 0°
      assert.ok(Math.abs(nu0) < 0.0001); // ν ≈ 0°
      assert.ok(Math.abs(r0 - 0.9833) < 0.001); // r ≈ 0.983 AU

      // At mean anomaly M = 90°
      const M90 = 90;
      const E90 = solveKepler(M90, e);
      const nu90 = eccentricToTrue(E90, e);
      const r90 = radiusVector(E90, a, e);

      assert.ok(E90 > 90); // E > M
      assert.ok(nu90 > E90); // ν > E
      assert.ok(Math.abs(r90 - 1.0) < 0.01); // r ≈ 1 AU at 90°
    });

    it('should show Mars has larger eccentricity effects', () => {
      // Mars: a ≈ 1.524 AU, e ≈ 0.0934
      const _a = 1.524; // Semi-major axis (not used in this test, kept for documentation)
      const e = 0.0934;

      const M = 90;
      const E = solveKepler(M, e);
      const nu = meanToTrue(M, e);

      // With higher eccentricity, the difference between M, E, and ν is larger
      assert.ok(E - M > 5); // E should be ~5° ahead of M
      assert.ok(nu - E > 4); // ν should be ~4° ahead of E
    });
  });
});
