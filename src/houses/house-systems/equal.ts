/**
 * Equal House System
 *
 * The simplest house system. Each house is exactly 30° from the previous,
 * starting from the Ascendant.
 *
 * The MC floats independently and is not necessarily on the 10th house cusp.
 * This system works at all latitudes except the exact poles.
 *
 * @see "The Houses: Temples of the Sky" by Deborah Houlding
 */

import { normalizeAngle } from '../house-utils.js';
import type { HouseCusps } from '../types.js';

/**
 * Calculate Equal house cusps
 *
 * Each house is exactly 30° from the previous, starting from the Ascendant.
 * House 1 cusp = Ascendant
 * House 2 cusp = Ascendant + 30°
 * House 3 cusp = Ascendant + 60°
 * ... and so on
 *
 * @param ascendant - Ascendant position in degrees (0-360)
 * @returns House cusps (1-12)
 *
 * @example
 * ```typescript
 * // Ascendant at 15° (15° Aries)
 * const cusps = equalHouses(15);
 * console.log(cusps.cusps[0]);  // 15 (House 1)
 * console.log(cusps.cusps[1]);  // 45 (House 2)
 * console.log(cusps.cusps[6]);  // 195 (House 7 = DSC)
 * ```
 */
export function equalHouses(ascendant: number): HouseCusps {
  const cusps: number[] = [];

  for (let house = 0; house < 12; house++) {
    cusps.push(normalizeAngle(ascendant + house * 30));
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

