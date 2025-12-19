/**
 * Lunar Nodes Calculator
 *
 * Calculates the positions of the Moon's orbital nodes (North Node / South Node).
 *
 * @module ephemeris/nodes
 *
 * @remarks
 * The Lunar Nodes are the two points where the Moon's orbit crosses the ecliptic:
 * - **North Node (Ascending)**: Where Moon crosses ecliptic going northward
 * - **South Node (Descending)**: Where Moon crosses ecliptic going southward (always 180° opposite)
 *
 * The nodes precess **westward** (retrograde) with a period of ~18.6 years.
 *
 * Two calculation methods are provided:
 * - **Mean Node**: Uses mean orbital elements, moves smoothly retrograde
 * - **True Node**: Includes perturbations, oscillates around mean position
 *
 * Both are used in astrology - some traditions prefer Mean, others True.
 *
 * Algorithm accuracy: ±1 arcminute for longitude.
 *
 * @see Meeus, "Astronomical Algorithms", 2nd Ed., Chapter 47
 */

import { DAYS_PER_JULIAN_CENTURY, DEG_TO_RAD, J2000_EPOCH } from './constants.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Lunar Node position result.
 */
export interface LunarNodePosition {
  /** Longitude of North Node in degrees [0, 360) */
  northNode: number;
  /** Longitude of South Node in degrees [0, 360) - always northNode + 180° */
  southNode: number;
  /** Daily motion in degrees/day (negative = retrograde) */
  speed: number;
  /** Whether the node is retrograde (always true for lunar nodes) */
  isRetrograde: boolean;
}

// =============================================================================
// Mean Lunar Node
// =============================================================================

/**
 * Calculate the Mean North Node longitude.
 *
 * The mean node moves smoothly retrograde at ~0.0529°/day.
 * This is the "averaged" position without perturbations.
 *
 * @param jd - Julian Date
 * @returns Mean North Node longitude in degrees [0, 360)
 *
 * @example
 * ```ts
 * import { getMeanNodeLongitude } from 'celestine';
 *
 * const jd = 2451545.0; // J2000.0
 * const meanNode = getMeanNodeLongitude(jd);
 * console.log(meanNode); // ~125.04°
 * ```
 */
export function getMeanNodeLongitude(jd: number): number {
  const T = (jd - J2000_EPOCH) / DAYS_PER_JULIAN_CENTURY;
  const T2 = T * T;
  const T3 = T2 * T;
  const T4 = T3 * T;

  // Mean longitude of the ascending node (Meeus, Chapter 47)
  // Ω = 125.0445479° - 1934.1362891°T + 0.0020754°T² + T³/467441 - T⁴/60616000
  let omega = 125.0445479 - 1934.1362891 * T + 0.0020754 * T2 + T3 / 467441 - T4 / 60616000;

  // Normalize to [0, 360)
  omega = omega % 360;
  if (omega < 0) omega += 360;

  return omega;
}

/**
 * Calculate the Mean Lunar Node position.
 *
 * @param jd - Julian Date
 * @returns Mean Lunar Node position with north/south nodes and speed
 *
 * @example
 * ```ts
 * import { getMeanNode } from 'celestine';
 *
 * const jd = 2451545.0;
 * const node = getMeanNode(jd);
 * console.log(node.northNode); // ~125.04° (Leo)
 * console.log(node.southNode); // ~305.04° (Aquarius)
 * ```
 */
export function getMeanNode(jd: number): LunarNodePosition {
  const northNode = getMeanNodeLongitude(jd);

  // South node is always exactly opposite
  let southNode = northNode + 180;
  if (southNode >= 360) southNode -= 360;

  // Calculate speed using numerical derivative
  const dt = 0.01;
  const lon1 = getMeanNodeLongitude(jd - dt);
  const lon2 = getMeanNodeLongitude(jd + dt);

  let lonDiff = lon2 - lon1;
  if (lonDiff > 180) lonDiff -= 360;
  if (lonDiff < -180) lonDiff += 360;

  const speed = lonDiff / (2 * dt);

  return {
    northNode,
    southNode,
    speed,
    isRetrograde: true, // Lunar nodes are always retrograde
  };
}

// =============================================================================
// True Lunar Node
// =============================================================================

/**
 * Calculate the True North Node longitude.
 *
 * The true node includes perturbations from the Sun, causing it to
 * oscillate around the mean node by up to ~1.5°.
 *
 * @param jd - Julian Date
 * @returns True North Node longitude in degrees [0, 360)
 *
 * @example
 * ```ts
 * import { getTrueNodeLongitude } from 'celestine';
 *
 * const jd = 2451545.0; // J2000.0
 * const trueNode = getTrueNodeLongitude(jd);
 * console.log(trueNode); // ~123.95°
 * ```
 */
export function getTrueNodeLongitude(jd: number): number {
  const T = (jd - J2000_EPOCH) / DAYS_PER_JULIAN_CENTURY;
  const T2 = T * T;
  const T3 = T2 * T;
  const T4 = T3 * T;

  // Mean elongation of the Moon from the Sun
  const D =
    (297.8501921 + 445267.1114034 * T - 0.0018819 * T2 + T3 / 545868 - T4 / 113065000) * DEG_TO_RAD;

  // Sun's mean anomaly
  const M = (357.5291092 + 35999.0502909 * T - 0.0001536 * T2 + T3 / 24490000) * DEG_TO_RAD;

  // Moon's mean anomaly
  const Mprime =
    (134.9633964 + 477198.8675055 * T + 0.0087414 * T2 + T3 / 69699 - T4 / 14712000) * DEG_TO_RAD;

  // Moon's argument of latitude
  const F =
    (93.272095 + 483202.0175233 * T - 0.0036539 * T2 - T3 / 3526000 + T4 / 863310000) * DEG_TO_RAD;

  // Mean longitude of ascending node
  let omega = 125.0445479 - 1934.1362891 * T + 0.0020754 * T2 + T3 / 467441 - T4 / 60616000;

  // Comprehensive perturbation terms for true node
  // Based on more complete series from astronomical tables
  const perturbations =
    -1.4979 * Math.sin(2 * (D - F)) +
    -0.15 * Math.sin(M) +
    -0.1226 * Math.sin(2 * D) +
    0.1176 * Math.sin(2 * F) +
    -0.0801 * Math.sin(2 * (Mprime - F)) +
    0.0943 * Math.sin(2 * (D + F)) +
    0.0582 * Math.sin(2 * D - Mprime) +
    -0.0539 * Math.sin(Mprime - 2 * F) +
    -0.0458 * Math.sin(2 * D - M) +
    0.0327 * Math.sin(2 * D + Mprime) +
    -0.0304 * Math.sin(Mprime + 2 * F) +
    -0.0173 * Math.sin(2 * (D - Mprime)) +
    -0.0168 * Math.sin(M + 2 * F) +
    0.0119 * Math.sin(Mprime) +
    0.0107 * Math.sin(M - 2 * F) +
    -0.0102 * Math.sin(2 * D + M) +
    -0.0081 * Math.sin(2 * Mprime);

  omega += perturbations;

  // Normalize to [0, 360)
  omega = omega % 360;
  if (omega < 0) omega += 360;

  return omega;
}

/**
 * Calculate the True Lunar Node position.
 *
 * @param jd - Julian Date
 * @returns True Lunar Node position with north/south nodes and speed
 *
 * @example
 * ```ts
 * import { getTrueNode } from 'celestine';
 *
 * const jd = 2451545.0;
 * const node = getTrueNode(jd);
 * console.log(node.northNode); // ~123.95° (Leo)
 * console.log(node.southNode); // ~303.95° (Aquarius)
 * ```
 */
export function getTrueNode(jd: number): LunarNodePosition {
  const northNode = getTrueNodeLongitude(jd);

  // South node is always exactly opposite
  let southNode = northNode + 180;
  if (southNode >= 360) southNode -= 360;

  // Calculate speed using numerical derivative
  const dt = 0.01;
  const lon1 = getTrueNodeLongitude(jd - dt);
  const lon2 = getTrueNodeLongitude(jd + dt);

  let lonDiff = lon2 - lon1;
  if (lonDiff > 180) lonDiff -= 360;
  if (lonDiff < -180) lonDiff += 360;

  const speed = lonDiff / (2 * dt);

  return {
    northNode,
    southNode,
    speed,
    isRetrograde: speed < 0, // Usually retrograde, but can briefly go direct
  };
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Get the North Node position (alias for getTrueNode).
 * In astrology, "North Node" typically refers to the True Node.
 *
 * @param jd - Julian Date
 * @returns True Lunar Node position
 */
export function getNorthNode(jd: number): LunarNodePosition {
  return getTrueNode(jd);
}

/**
 * Get the South Node longitude.
 * The South Node is always exactly 180° opposite the North Node.
 *
 * @param jd - Julian Date
 * @returns South Node longitude in degrees [0, 360)
 */
export function getSouthNodeLongitude(jd: number): number {
  const northNode = getTrueNodeLongitude(jd);
  let southNode = northNode + 180;
  if (southNode >= 360) southNode -= 360;
  return southNode;
}

/**
 * Lunar Node orbital characteristics (for reference).
 */
export const LUNAR_NODE_CHARACTERISTICS = {
  /** Nodal period in days */
  nodalPeriod: 6798.38,
  /** Nodal period in years */
  nodalPeriodYears: 18.6,
  /** Mean daily motion in degrees (negative = retrograde) */
  meanDailyMotion: -0.0529,
  /** Maximum oscillation of true node from mean (degrees) */
  maxOscillation: 1.5,
} as const;
