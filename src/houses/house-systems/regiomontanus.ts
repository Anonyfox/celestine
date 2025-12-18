/**
 * Regiomontanus House System
 *
 * One of the oldest house systems, created by Johannes Müller von Königsberg
 * (Regiomontanus) in the 15th century. Based on dividing the celestial equator
 * into 12 equal parts and projecting these divisions onto the ecliptic.
 *
 * Uses the equator as the reference circle and divides it into 30° segments.
 * Great circles through these points and the celestial poles intersect the
 * ecliptic to form house cusps.
 *
 * Works at all latitudes, including near the poles.
 *
 * **Reference:**
 * Swiss Ephemeris swehouse.c (lines 1381-1409)
 * https://github.com/aloistr/swisseph/blob/master/swehouse.c
 *
 * @see `.references/swisseph/swehouse.c` for original C implementation
 */

import { normalizeAngle, oppositePoint } from '../house-utils.js';
import { asc1, atand, cosd, mcToArmc, sind, tand } from './shared.js';
import type { HouseCusps } from '../types.js';

/**
 * Calculate Regiomontanus house cusps
 *
 * Divides the celestial equator into 30° segments and projects onto ecliptic.
 * Uses varying pole heights (fh1, fh2) based on latitude.
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
 * const cusps = regiomontanusHouses(asc, mc, 51.5, 23.44);
 * console.log(cusps.cusps[0]);  // 15 (House 1 = ASC)
 * ```
 */
export function regiomontanusHouses(
  ascendant: number,
  midheaven: number,
  latitude: number,
  obliquity: number,
): HouseCusps {
  const asc = normalizeAngle(ascendant);
  const mc = normalizeAngle(midheaven);
  const fi = latitude;
  const ekl = obliquity;

  // Calculate ARMC (sidereal time) from MC
  const th = mcToArmc(mc, ekl);

  const sine = sind(ekl);
  const cose = cosd(ekl);
  const tanfi = tand(fi);

  // Calculate pole heights for different house divisions
  // fh1 is for houses 11 and 3 (30° divisions)
  // fh2 is for houses 12 and 2 (60° divisions)
  const fh1 = atand(tanfi * 0.5);
  const fh2 = atand(tanfi * cosd(30));

  const cusps: number[] = new Array(12);

  // Set angles
  cusps[0] = asc; // House 1
  cusps[9] = mc; // House 10

  // Calculate houses using Asc1 with specific pole heights
  cusps[10] = asc1(30 + th, fh1, sine, cose); // House 11
  cusps[11] = asc1(60 + th, fh2, sine, cose); // House 12
  cusps[1] = asc1(120 + th, fh2, sine, cose); // House 2
  cusps[2] = asc1(150 + th, fh1, sine, cose); // House 3

  // Lower hemisphere houses are opposite upper hemisphere
  cusps[3] = oppositePoint(cusps[9]); // House 4 = IC (opposite MC)
  cusps[4] = oppositePoint(cusps[10]); // House 5 (opposite 11)
  cusps[5] = oppositePoint(cusps[11]); // House 6 (opposite 12)
  cusps[6] = oppositePoint(cusps[0]); // House 7 = DSC (opposite ASC)
  cusps[7] = oppositePoint(cusps[1]); // House 8 (opposite 2)
  cusps[8] = oppositePoint(cusps[2]); // House 9 (opposite 3)

  return { cusps: cusps as [number, number, number, number, number, number, number, number, number, number, number, number] };
}

