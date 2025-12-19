/**
 * Koch House System (GOH - Birthplace System)
 *
 * Created by Walter Koch in the 1970s. Also known as "Geburtsortshäusersystem" (GOH).
 * Based on the birthplace's local space, using the "true" degree rising at birth.
 *
 * Like Placidus, Koch fails at latitudes above ~66° (near polar circles).
 * Falls back to Porphyry in those cases.
 *
 * **Mathematical Foundation:**
 * Uses spherical trigonometry to calculate cusps based on specific
 * angles measured from the sidereal time, adjusted by a factor `ad3`
 * that depends on the MC and latitude.
 *
 * **Reference:**
 * Swiss Ephemeris swehouse.c (lines 1250-1272)
 * https://github.com/aloistr/swisseph/blob/master/swehouse.c
 *
 * @see `.references/swisseph/swehouse.c` for original C implementation
 */

import { normalizeAngle, oppositePoint } from '../house-utils.js';
import type { HouseCusps } from '../types.js';
import { porphyryHouses } from './porphyry.js';
import { asc1, asind, atand, cosd, mcToArmc, sind, tand } from './shared.js';

/**
 * Calculate Koch house cusps
 *
 * Uses the birthplace method with adjusted angles based on MC and latitude.
 * Falls back to Porphyry if latitude is too high (>66°).
 *
 * @param ascendant - Ascendant in degrees (0-360)
 * @param midheaven - Midheaven in degrees (0-360)
 * @param latitude - Geographic latitude in degrees
 * @param obliquity - Obliquity of ecliptic in degrees
 * @returns House cusps (1-12)
 *
 * @example
 * ```typescript
 * const asc = 15;
 * const mc = 285;
 * const cusps = kochHouses(asc, mc, 51.5, 23.44);
 * console.log(cusps.cusps[0]);  // 15 (House 1 = ASC)
 * ```
 */
export function kochHouses(
  ascendant: number,
  midheaven: number,
  latitude: number,
  obliquity: number,
): HouseCusps {
  const asc = normalizeAngle(ascendant);
  const mc = normalizeAngle(midheaven);
  const fi = latitude;
  const ekl = obliquity;

  // Check if within polar circle - fall back to Porphyry
  if (Math.abs(fi) >= 90 - ekl) {
    console.warn(`Koch: latitude ${fi.toFixed(1)}° is within polar circle, using Porphyry instead`);
    return porphyryHouses(asc, mc);
  }

  // Calculate ARMC (sidereal time) from MC
  const th = mcToArmc(mc, ekl);

  const sine = sind(ekl);
  const cose = cosd(ekl);
  const tanfi = tand(fi);

  // Calculate sina - used to find adjustment factor ad3
  let sina = (sind(mc) * sine) / cosd(fi);

  // Clamp sina to valid range [-1, 1]
  if (sina > 1) sina = 1;
  if (sina < -1) sina = -1;

  // Calculate cosa (always positive)
  const cosa = Math.sqrt(1 - sina * sina);

  // Calculate c and ad3 adjustment
  const c = atand(tanfi / cosa);
  const ad3 = asind(sind(c) * sina) / 3.0;

  const cusps: number[] = new Array(12);

  // Set angles
  cusps[0] = asc; // House 1
  cusps[9] = mc; // House 10

  // Calculate houses 11, 12, 2, 3 using adjusted angles
  cusps[10] = asc1(th + 30 - 2 * ad3, fi, sine, cose); // House 11
  cusps[11] = asc1(th + 60 - ad3, fi, sine, cose); // House 12
  cusps[1] = asc1(th + 120 + ad3, fi, sine, cose); // House 2
  cusps[2] = asc1(th + 150 + 2 * ad3, fi, sine, cose); // House 3

  // Lower hemisphere houses are opposite upper hemisphere
  cusps[3] = oppositePoint(cusps[9]); // House 4 = IC (opposite MC)
  cusps[4] = oppositePoint(cusps[10]); // House 5 (opposite 11)
  cusps[5] = oppositePoint(cusps[11]); // House 6 (opposite 12)
  cusps[6] = oppositePoint(cusps[0]); // House 7 = DSC (opposite ASC)
  cusps[7] = oppositePoint(cusps[1]); // House 8 (opposite 2)
  cusps[8] = oppositePoint(cusps[2]); // House 9 (opposite 3)

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
