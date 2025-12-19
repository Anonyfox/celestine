/**
 * Whole Sign House System
 *
 * Ancient system from Hellenistic astrology. Each house corresponds to one
 * complete zodiac sign. The house 1 cusp is the beginning of the sign
 * containing the Ascendant.
 *
 * This is the oldest house system, used by Ptolemy and other ancient astrologers.
 * Works at all latitudes except exact poles.
 *
 * @see Ptolemy, "Tetrabiblos"
 * @see Vettius Valens, "Anthologies"
 */

import { normalizeAngle } from '../house-utils.js';
import type { HouseCusps } from '../types.js';

/**
 * Calculate Whole Sign house cusps
 *
 * House 1 starts at 0° of the sign containing the Ascendant.
 * Each subsequent house is the next sign (30° increments).
 *
 * Example: If Ascendant is at 15° Aries:
 * - House 1: 0° Aries - 30° Aries
 * - House 2: 0° Taurus - 30° Taurus
 * - House 3: 0° Gemini - 30° Gemini
 * ... etc
 *
 * @param ascendant - Ascendant position in degrees (0-360)
 * @returns House cusps (1-12)
 *
 * @example
 * ```typescript
 * // Ascendant at 15.5° (15°30' Aries)
 * const cusps = wholeSignHouses(15.5);
 * console.log(cusps.cusps[0]);  // 0 (House 1 = 0° Aries)
 * console.log(cusps.cusps[1]);  // 30 (House 2 = 0° Taurus)
 * console.log(cusps.cusps[11]); // 330 (House 12 = 0° Pisces)
 * ```
 *
 * @example
 * ```typescript
 * // Ascendant at 195° (15° Libra)
 * const cusps = wholeSignHouses(195);
 * console.log(cusps.cusps[0]);  // 180 (House 1 = 0° Libra)
 * ```
 */
export function wholeSignHouses(ascendant: number): HouseCusps {
  // Find which sign the Ascendant is in
  // Each sign is 30°, so sign index = floor(ascendant / 30)
  const normalizedAsc = normalizeAngle(ascendant);
  const signIndex = Math.floor(normalizedAsc / 30);

  // House 1 starts at the beginning of that sign
  const house1Cusp = signIndex * 30;

  // Generate all 12 house cusps (each at the start of a sign)
  const cusps: number[] = [];
  for (let house = 0; house < 12; house++) {
    cusps.push(normalizeAngle(house1Cusp + house * 30));
  }

  return {
    cusps: cusps as [
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
    ],
  };
}
