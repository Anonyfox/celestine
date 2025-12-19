/**
 * Kepler Equation Solver
 *
 * Solves Kepler's equation to find eccentric anomaly from mean anomaly.
 * This is fundamental to converting orbital elements to positions.
 *
 * @module ephemeris/utils/kepler
 *
 * @remarks
 * Kepler's equation: M = E - e·sin(E)
 * where:
 *   M = mean anomaly (known)
 *   E = eccentric anomaly (to find)
 *   e = orbital eccentricity
 *
 * This transcendental equation has no closed-form solution and must be
 * solved iteratively using Newton-Raphson method.
 *
 * @see Meeus, "Astronomical Algorithms", Chapter 30, pp. 195-197
 * @see Danby, J.M.A., "Fundamentals of Celestial Mechanics", Chapter 6
 */

import { CONVERGENCE_TOLERANCE, DEG_TO_RAD, MAX_ITERATIONS, RAD_TO_DEG } from '../constants.js';

/**
 * Solves Kepler's equation for eccentric anomaly.
 *
 * @param meanAnomaly - Mean anomaly M in degrees
 * @param eccentricity - Orbital eccentricity e (0 ≤ e < 1 for ellipse)
 * @returns Eccentric anomaly E in degrees
 *
 * @throws {Error} If eccentricity is out of range [0, 1)
 * @throws {Error} If iteration does not converge
 *
 * @remarks
 * Uses Newton-Raphson iteration:
 * E_{n+1} = E_n - (E_n - e·sin(E_n) - M) / (1 - e·cos(E_n))
 *
 * Convergence is typically achieved in 3-5 iterations for planetary
 * eccentricities (all < 0.25 except Pluto at ~0.25).
 *
 * @example
 * ```typescript
 * // Earth's eccentricity ~0.0167, mean anomaly 90°
 * const E = solveKepler(90, 0.0167);
 * // E ≈ 90.955° (slightly ahead of mean due to eccentricity)
 * ```
 *
 * @source Meeus, "Astronomical Algorithms", Eq. 30.7, p. 196
 */
export function solveKepler(meanAnomaly: number, eccentricity: number): number {
  // Validate eccentricity
  if (eccentricity < 0) {
    throw new Error(`Eccentricity must be non-negative, got: ${eccentricity}`);
  }
  if (eccentricity >= 1) {
    throw new Error(`Eccentricity must be less than 1 for elliptical orbit, got: ${eccentricity}`);
  }

  // Special case: circular orbit (e = 0)
  // When e = 0, E = M exactly
  if (eccentricity === 0) {
    return meanAnomaly;
  }

  // Convert to radians for trigonometric functions
  const M = meanAnomaly * DEG_TO_RAD;
  const e = eccentricity;

  // Initial guess for E
  // Meeus suggests: E₀ = M for small e, or E₀ = π for large e and M near π
  // A good general starting point is E₀ = M + e·sin(M)·(1 + e·cos(M))
  // But for planetary eccentricities (e < 0.25), E₀ = M works well
  let E = M;

  // Newton-Raphson iteration
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const sinE = Math.sin(E);
    const cosE = Math.cos(E);

    // f(E) = E - e·sin(E) - M
    const f = E - e * sinE - M;

    // f'(E) = 1 - e·cos(E)
    const fPrime = 1 - e * cosE;

    // Newton-Raphson step: E_{n+1} = E_n - f(E_n) / f'(E_n)
    const delta = f / fPrime;
    E = E - delta;

    // Check convergence (in radians)
    if (Math.abs(delta) < CONVERGENCE_TOLERANCE * DEG_TO_RAD) {
      return E * RAD_TO_DEG;
    }
  }

  // Should never reach here for planetary orbits
  throw new Error(
    `Kepler equation did not converge after ${MAX_ITERATIONS} iterations ` +
      `(M=${meanAnomaly}°, e=${eccentricity})`,
  );
}

/**
 * Calculates true anomaly from eccentric anomaly and eccentricity.
 *
 * @param eccentricAnomaly - Eccentric anomaly E in degrees
 * @param eccentricity - Orbital eccentricity e
 * @returns True anomaly ν (nu) in degrees
 *
 * @remarks
 * The true anomaly is the actual angular position of the body as seen
 * from the focus of the ellipse (where the Sun is).
 *
 * Formula: tan(ν/2) = √((1+e)/(1-e)) · tan(E/2)
 *
 * Using atan2 for proper quadrant handling.
 *
 * @example
 * ```typescript
 * // If E = 90.955° and e = 0.0167
 * const nu = eccentricToTrue(90.955, 0.0167);
 * // nu ≈ 91.91° (true anomaly leads eccentric anomaly)
 * ```
 *
 * @source Meeus, "Astronomical Algorithms", Eq. 30.1, p. 195
 */
export function eccentricToTrue(eccentricAnomaly: number, eccentricity: number): number {
  const E = eccentricAnomaly * DEG_TO_RAD;
  const e = eccentricity;

  // Special case: circular orbit
  if (e === 0) {
    return eccentricAnomaly;
  }

  // tan(ν/2) = √((1+e)/(1-e)) · tan(E/2)
  // Using the formula that avoids the tangent half-angle:
  // cos(ν) = (cos(E) - e) / (1 - e·cos(E))
  // sin(ν) = √(1-e²)·sin(E) / (1 - e·cos(E))

  const cosE = Math.cos(E);
  const sinE = Math.sin(E);
  const denominator = 1 - e * cosE;

  const cosNu = (cosE - e) / denominator;
  const sinNu = (Math.sqrt(1 - e * e) * sinE) / denominator;

  // Use atan2 for correct quadrant (returns [-π, π])
  let nu = Math.atan2(sinNu, cosNu);

  // Normalize to same range as input E
  // If E was in [0, 2π), nu should be too
  // If E was negative, nu should be negative
  if (eccentricAnomaly >= 0 && nu < 0) {
    nu += 2 * Math.PI;
  } else if (eccentricAnomaly < 0 && nu > 0) {
    nu -= 2 * Math.PI;
  }

  return nu * RAD_TO_DEG;
}

/**
 * Calculates true anomaly directly from mean anomaly and eccentricity.
 *
 * @param meanAnomaly - Mean anomaly M in degrees
 * @param eccentricity - Orbital eccentricity e
 * @returns True anomaly ν (nu) in degrees
 *
 * @remarks
 * Convenience function that combines solveKepler and eccentricToTrue.
 * This is the most commonly used function for orbital calculations.
 *
 * @example
 * ```typescript
 * // Convert mean anomaly to true anomaly for Earth
 * const trueAnomaly = meanToTrue(90, 0.0167);
 * // trueAnomaly ≈ 91.91°
 * ```
 */
export function meanToTrue(meanAnomaly: number, eccentricity: number): number {
  const E = solveKepler(meanAnomaly, eccentricity);
  return eccentricToTrue(E, eccentricity);
}

/**
 * Calculates the radius vector (distance from focus) given eccentric anomaly.
 *
 * @param eccentricAnomaly - Eccentric anomaly E in degrees
 * @param semiMajorAxis - Semi-major axis a (in any unit, typically AU)
 * @param eccentricity - Orbital eccentricity e
 * @returns Distance r from the focus (in same units as semiMajorAxis)
 *
 * @remarks
 * r = a · (1 - e·cos(E))
 *
 * At perihelion (E = 0°): r = a(1-e)
 * At aphelion (E = 180°): r = a(1+e)
 *
 * @example
 * ```typescript
 * // Earth at E = 0° (perihelion)
 * const r = radiusVector(0, 1.0, 0.0167);
 * // r ≈ 0.9833 AU
 * ```
 *
 * @source Meeus, "Astronomical Algorithms", Eq. 30.2, p. 195
 */
export function radiusVector(
  eccentricAnomaly: number,
  semiMajorAxis: number,
  eccentricity: number,
): number {
  const E = eccentricAnomaly * DEG_TO_RAD;
  return semiMajorAxis * (1 - eccentricity * Math.cos(E));
}
