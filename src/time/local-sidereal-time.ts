/**
 * Local Sidereal Time calculations
 *
 * Convert Greenwich Mean Sidereal Time (GMST) to Local Sidereal Time (LST)
 * for a given observer's longitude.
 *
 * LST is needed to calculate the Ascendant and house cusps for a specific location.
 */

import { normalizeAngle } from './time-utils.js';

/**
 * Calculate Local Sidereal Time from GMST and longitude
 *
 * LST is simply GMST adjusted for the observer's longitude.
 * Longitude is positive East, negative West (standard astronomical convention).
 *
 * Formula: LST = GMST + longitude
 *
 * @param gmst - Greenwich Mean Sidereal Time in degrees (0-360)
 * @param longitude - Observer's longitude in degrees (positive East, negative West)
 * @returns Local Sidereal Time in degrees (0-360)
 *
 * @example
 * // Greenwich (longitude = 0)
 * localSiderealTime(280, 0)  // Returns: 280 (LST = GMST)
 *
 * @example
 * // New York (longitude ≈ -74°)
 * localSiderealTime(280, -74)  // Returns: 206
 *
 * @example
 * // Tokyo (longitude ≈ 139.7°)
 * localSiderealTime(280, 139.7)  // Returns: 59.7
 */
export function localSiderealTime(gmst: number, longitude: number): number {
  // Add longitude to GMST
  let lst = gmst + longitude;

  // Normalize to 0-360 degrees
  lst = normalizeAngle(lst);

  return lst;
}
