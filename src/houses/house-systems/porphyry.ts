/**
 * Porphyry House System
 *
 * Simple trisection of the four quadrants defined by the angles.
 * Each quadrant (ASC to IC, IC to DSC, DSC to MC, MC to ASC) is divided
 * into three equal parts.
 *
 * Named after the philosopher Porphyry of Tyros (3rd century CE).
 * Works at all latitudes.
 *
 * @see Porphyry of Tyros (234-305 CE)
 */

import { normalizeAngle, signedAngularSeparation } from '../house-utils.js';
import type { HouseCusps } from '../types.js';

/**
 * Calculate Porphyry house cusps
 *
 * Divides each quadrant into three equal parts:
 * - Quadrant 1 (ASC → IC): Houses 1, 2, 3
 * - Quadrant 2 (IC → DSC): Houses 4, 5, 6
 * - Quadrant 3 (DSC → MC): Houses 7, 8, 9
 * - Quadrant 4 (MC → ASC): Houses 10, 11, 12
 *
 * @param ascendant - Ascendant position in degrees (0-360)
 * @param midheaven - Midheaven position in degrees (0-360)
 * @returns House cusps (1-12)
 *
 * @example
 * ```typescript
 * const asc = 15;  // 15° Aries
 * const mc = 285;  // 15° Capricorn
 * const cusps = porphyryHouses(asc, mc);
 * console.log(cusps.cusps[0]);  // 15 (House 1 = ASC)
 * console.log(cusps.cusps[9]);  // 285 (House 10 = MC)
 * ```
 */
export function porphyryHouses(ascendant: number, midheaven: number): HouseCusps {
  const asc = normalizeAngle(ascendant);
  const mc = normalizeAngle(midheaven);
  const dsc = normalizeAngle(asc + 180); // Descendant
  const ic = normalizeAngle(mc + 180); // Imum Coeli

  // Calculate the size of each quadrant (in degrees)
  // Using signed separation to handle wraparound correctly
  const quadrant1Size = signedAngularSeparation(asc, ic); // ASC → IC
  const quadrant2Size = signedAngularSeparation(ic, dsc); // IC → DSC
  const quadrant3Size = signedAngularSeparation(dsc, mc); // DSC → MC
  const quadrant4Size = signedAngularSeparation(mc, asc); // MC → ASC

  // Divide each quadrant into three equal parts
  const house2 = normalizeAngle(asc + quadrant1Size / 3);
  const house3 = normalizeAngle(asc + (quadrant1Size * 2) / 3);

  const house5 = normalizeAngle(ic + quadrant2Size / 3);
  const house6 = normalizeAngle(ic + (quadrant2Size * 2) / 3);

  const house8 = normalizeAngle(dsc + quadrant3Size / 3);
  const house9 = normalizeAngle(dsc + (quadrant3Size * 2) / 3);

  const house11 = normalizeAngle(mc + quadrant4Size / 3);
  const house12 = normalizeAngle(mc + (quadrant4Size * 2) / 3);

  return {
    cusps: [
      asc, // House 1
      house2, // House 2
      house3, // House 3
      ic, // House 4
      house5, // House 5
      house6, // House 6
      dsc, // House 7
      house8, // House 8
      house9, // House 9
      mc, // House 10
      house11, // House 11
      house12, // House 12
    ],
  };
}
