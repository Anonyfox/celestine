/**
 * Campanus House System
 *
 * Created by Giovanni Campano (Campanus) in the 13th century. One of the oldest
 * house systems still in use. Divides the prime vertical (great circle through
 * east and west points) into 30° segments.
 *
 * Great circles through these division points and the celestial poles intersect
 * the ecliptic to form house cusps.
 *
 * Works at all latitudes, though interpretation becomes unusual near the poles.
 *
 * **Mathematical Foundation:**
 * - Divides the prime vertical into 12 equal parts (30° each)
 * - Pole heights calculated from latitude and prime vertical divisions
 * - Projects onto ecliptic using spherical trigonometry
 *
 * **Reference:**
 * Swiss Ephemeris swehouse.c (lines 1028-1082)
 * https://github.com/aloistr/swisseph/blob/master/swehouse.c
 *
 * @see `.references/swisseph/swehouse.c` for original C implementation
 */

import { normalizeAngle, oppositePoint } from '../house-utils.js';
import type { HouseCusps } from '../types.js';
import { asc1, asind, atand, cosd, mcToArmc, sind } from './shared.js';

/**
 * Calculate Campanus house cusps
 *
 * Uses prime vertical divisions with varying pole heights and equatorial positions.
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
 * const cusps = campanusHouses(asc, mc, 51.5, 23.44);
 * console.log(cusps.cusps[0]);  // 15 (House 1 = ASC)
 * ```
 */
export function campanusHouses(
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

  // Calculate pole heights for prime vertical divisions
  // fh1: for 30° on prime vertical (houses 11 and 3)
  // sin(fh1) = sin(fi) * sin(30°) = sin(fi) / 2
  const fh1 = asind(sind(fi) / 2);

  // fh2: for 60° on prime vertical (houses 12 and 2)
  // sin(fh2) = sin(fi) * sin(60°) = sin(fi) * √3/2
  const fh2 = asind((Math.sqrt(3.0) / 2) * sind(fi));

  // Calculate equatorial positions (xh1, xh2)
  const cosfi = cosd(fi);
  let xh1: number;
  let xh2: number;

  if (Math.abs(cosfi) === 0) {
    // At the poles (±90° latitude)
    if (fi > 0) {
      xh1 = xh2 = 90;
    } else {
      xh1 = xh2 = 270;
    }
  } else {
    // tan(xh1) = tan(60°) / cos(fi) = √3 / cos(fi)
    xh1 = atand(Math.sqrt(3.0) / cosfi);

    // tan(xh2) = tan(30°) / cos(fi) = (1/√3) / cos(fi)
    xh2 = atand(1 / Math.sqrt(3.0) / cosfi);
  }

  const cusps: number[] = new Array(12);

  // Set angles
  cusps[0] = asc; // House 1
  cusps[9] = mc; // House 10

  // Calculate houses using Asc1
  // Note: th + 90 is the RA of the Ascendant point
  cusps[10] = asc1(th + 90 - xh1, fh1, sine, cose); // House 11
  cusps[11] = asc1(th + 90 - xh2, fh2, sine, cose); // House 12
  cusps[1] = asc1(th + 90 + xh2, fh2, sine, cose); // House 2
  cusps[2] = asc1(th + 90 + xh1, fh1, sine, cose); // House 3

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
