/**
 * Shared spherical trigonometry utilities for house calculations
 *
 * These functions are used across multiple house systems.
 * Implementation based on Swiss Ephemeris.
 *
 * @see `.references/swisseph/swehouse.c` lines 2058-2128
 */

import { normalizeAngle } from '../house-utils.js';

const VERY_SMALL = 1.0 / 360000.0;
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

/**
 * Degree-based trigonometric functions
 */
export function sind(deg: number): number {
  return Math.sin(deg * DEG2RAD);
}

export function cosd(deg: number): number {
  return Math.cos(deg * DEG2RAD);
}

export function tand(deg: number): number {
  return Math.tan(deg * DEG2RAD);
}

export function asind(x: number): number {
  return Math.asin(x) * RAD2DEG;
}

export function atand(x: number): number {
  return Math.atan(x) * RAD2DEG;
}

/**
 * Asc2 - Core calculation for ecliptic crossings
 *
 * Calculates the crossing point of the ecliptic with a great circle.
 * Uses spherical trigonometry formula.
 *
 * @param x - Intersection point on equator (0-90 degrees)
 * @param f - Pole height (latitude, -90 to +90)
 * @param sine - sin(obliquity)
 * @param cose - cos(obliquity)
 * @returns Ecliptic longitude
 */
export function asc2(x: number, f: number, sine: number, cose: number): number {
  // From spherical trigonometry: cot c sin a = cot C sin B + cos a cos B
  // where B = ecliptic obliquity, a = x, C = 90 + f
  // cot(90 + f) = -tan(f)
  let ass = -tand(f) * sine + cose * cosd(x);

  if (Math.abs(ass) < VERY_SMALL) {
    ass = 0;
  }

  let sinx = sind(x);
  if (Math.abs(sinx) < VERY_SMALL) {
    sinx = 0;
  }

  if (sinx === 0) {
    ass = ass < 0 ? -VERY_SMALL : VERY_SMALL;
  } else if (ass === 0) {
    ass = sinx < 0 ? -90 : 90;
  } else {
    // tan c = sin x / ass
    ass = atand(sinx / ass);
  }

  if (ass < 0) {
    ass += 180;
  }

  return ass;
}

/**
 * Asc1 - Calculate ecliptic crossing for any quadrant
 *
 * Handles all four quadrants by calling asc2 with appropriate transformations.
 * This is the core function used by many house systems.
 *
 * @param x1 - Right ascension in degrees (0-360)
 * @param f - Pole height (latitude)
 * @param sine - sin(obliquity)
 * @param cose - cos(obliquity)
 * @returns Ecliptic longitude
 */
export function asc1(x1: number, f: number, sine: number, cose: number): number {
  const x = normalizeAngle(x1);
  const quadrant = Math.floor(x / 90) + 1; // 1..4

  // Handle poles
  if (Math.abs(90 - f) < VERY_SMALL) {
    return 180; // Near north pole
  }
  if (Math.abs(90 + f) < VERY_SMALL) {
    return 0; // Near south pole
  }

  let ass: number;

  if (quadrant === 1) {
    ass = asc2(x, f, sine, cose);
  } else if (quadrant === 2) {
    ass = 180 - asc2(180 - x, -f, sine, cose);
  } else if (quadrant === 3) {
    ass = 180 + asc2(x - 180, -f, sine, cose);
  } else {
    // quadrant 4
    ass = 360 - asc2(360 - x, f, sine, cose);
  }

  ass = normalizeAngle(ass);

  // Clean up rounding errors at cardinal points
  if (Math.abs(ass - 90) < VERY_SMALL) ass = 90;
  if (Math.abs(ass - 180) < VERY_SMALL) ass = 180;
  if (Math.abs(ass - 270) < VERY_SMALL) ass = 270;
  if (Math.abs(ass - 360) < VERY_SMALL) ass = 0;

  return ass;
}

/**
 * Calculate ARMC (Right Ascension of Midheaven) from MC and obliquity
 *
 * This is the inverse of the MC calculation.
 *
 * @param mc - Midheaven in degrees
 * @param obliquity - Obliquity of ecliptic
 * @returns ARMC (sidereal time at meridian) in degrees
 */
export function mcToArmc(mc: number, obliquity: number): number {
  const mcNorm = normalizeAngle(mc);
  const VERY_SMALL = 1.0 / 360000.0;

  let armc: number;

  if (Math.abs(mcNorm - 90) <= VERY_SMALL) {
    armc = 90;
  } else if (Math.abs(mcNorm - 270) <= VERY_SMALL) {
    armc = 270;
  } else {
    const mcRad = mcNorm * DEG2RAD;
    const epsRad = obliquity * DEG2RAD;
    const tanMC = Math.tan(mcRad);
    armc = Math.atan(tanMC * Math.cos(epsRad)) * RAD2DEG;

    // Adjust quadrant based on MC
    if (mcNorm > 90 && mcNorm <= 270) {
      armc = normalizeAngle(armc + 180);
    }
  }

  return normalizeAngle(armc);
}
