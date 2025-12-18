/**
 * Placidus House System
 *
 * Implementation based on Swiss Ephemeris by Dieter Koch and Alois Treindl.
 * This is the most widely used house system in modern Western astrology.
 *
 * The Placidus system divides the diurnal and nocturnal semi-arcs into thirds.
 * It uses an iterative algorithm with "pole height" calculations.
 *
 * **Mathematical Foundation:**
 * - Uses "pole height" (f) to find points where semi-arcs are divided by 1/3 or 2/3
 * - Iteratively refines cusps using spherical trigonometry
 * - Falls back to Porphyry near polar circles (>66° latitude)
 *
 * **Reference:**
 * Swiss Ephemeris swehouse.c (lines 1830-1983)
 * https://github.com/aloistr/swisseph/blob/master/swehouse.c
 *
 * @see `.references/swisseph/swehouse.c` for original C implementation
 */

import { MAX_ITERATIONS } from '../constants.js';
import { normalizeAngle, oppositePoint } from '../house-utils.js';
import { porphyryHouses } from './porphyry.js';
import { asc1, asind, atand, cosd, mcToArmc, sind, tand } from './shared.js';
import type { HouseCusps } from '../types.js';

const VERY_SMALL = 1.0 / 360000.0; // Convergence tolerance

/**
 * Calculate signed angular difference between two angles
 * Used for convergence check
 */
function signedDifference(a: number, b: number): number {
  let diff = a - b;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return diff;
}

/**
 * Calculate Placidus house cusps
 *
 * Uses iterative pole-height method from Swiss Ephemeris.
 * Falls back to Porphyry if latitude is too high (>66°).
 *
 * @param ascendant - Ascendant in degrees (0-360)
 * @param midheaven - Midheaven in degrees (0-360)
 * @param latitude - Geographic latitude in degrees
 * @param obliquity - Obliquity of ecliptic in degrees
 * @returns House cusps (1-12)
 *
 * @throws {Error} If calculation fails (automatically falls back to Porphyry)
 */
export function placidusHouses(
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

  // Check if within polar circle - fall back to Porphyry
  if (Math.abs(fi) >= 90 - ekl) {
    console.warn(
      `Placidus: latitude ${fi.toFixed(1)}° is within polar circle, using Porphyry instead`,
    );
    return porphyryHouses(asc, mc);
  }

  const sine = sind(ekl);
  const cose = cosd(ekl);
  const tane = tand(ekl);
  const tanfi = tand(fi);

  // Calculate preliminary pole heights for semi-arc division
  const a = asind(tanfi * tane);
  const fh1 = atand(sind(a / 3) / tane); // For houses 11 and 3 (1/3 division)
  const fh2 = atand(sind((a * 2) / 3) / tane); // For houses 12 and 2 (2/3 division)

  const cusps: number[] = new Array(12);
  cusps[0] = asc; // House 1
  cusps[9] = mc; // House 10

  // Calculate houses 11, 12, 2, 3 using iterative method
  const housesToCalc = [
    { house: 11, rectasc: 30, fh: fh1, divisor: 3 },
    { house: 12, rectasc: 60, fh: fh2, divisor: 1.5 },
    { house: 2, rectasc: 120, fh: fh2, divisor: 1.5 },
    { house: 3, rectasc: 150, fh: fh1, divisor: 3 },
  ];

  for (const { house, rectasc, fh, divisor } of housesToCalc) {
    const ra = normalizeAngle(rectasc + th);
    const ih = house - 1; // Convert to 0-indexed

    // Get initial tant value
    let tant = tand(asind(sine * sind(asc1(ra, fh, sine, cose))));

    if (Math.abs(tant) < VERY_SMALL) {
      // Degenerate case
      cusps[ih] = ra;
    } else {
      // Iterative refinement using pole height
      let f = atand(sind(asind(tanfi * tant) / divisor) / tant);
      cusps[ih] = asc1(ra, f, sine, cose);

      let cuspsv = 0;
      let converged = false;

      for (let i = 1; i <= MAX_ITERATIONS; i++) {
        tant = tand(asind(sine * sind(cusps[ih])));

        if (Math.abs(tant) < VERY_SMALL) {
          cusps[ih] = ra;
          converged = true;
          break;
        }

        // Recalculate pole height
        f = atand(sind(asind(tanfi * tant) / divisor) / tant);
        cusps[ih] = asc1(ra, f, sine, cose);

        // Check convergence
        if (i > 1 && Math.abs(signedDifference(cusps[ih], cuspsv)) < VERY_SMALL) {
          converged = true;
          break;
        }

        cuspsv = cusps[ih];
      }

      if (!converged) {
        console.warn(
          `Placidus: failed to converge for house ${house} at latitude ${fi.toFixed(1)}°, using Porphyry`,
        );
        return porphyryHouses(asc, mc);
      }
    }
  }

  // Lower hemisphere houses are opposite upper hemisphere
  cusps[3] = oppositePoint(cusps[9]); // House 4 = IC (opposite MC)
  cusps[4] = oppositePoint(cusps[10]); // House 5 (opposite 11)
  cusps[5] = oppositePoint(cusps[11]); // House 6 (opposite 12)
  cusps[6] = oppositePoint(cusps[0]); // House 7 = DSC (opposite ASC)
  cusps[7] = oppositePoint(cusps[1]); // House 8 (opposite 2)
  cusps[8] = oppositePoint(cusps[2]); // House 9 (opposite 3)

  return {
    cusps: cusps as [number, number, number, number, number, number, number, number, number, number, number, number],
  };
}
