/**
 * Calculate the four angles: Ascendant, Midheaven, Descendant, and Imum Coeli
 *
 * The angles are the four cardinal points of the astrological chart, marking
 * the intersections of the ecliptic with the horizon (ASC/DSC) and meridian (MC/IC).
 *
 * These calculations use spherical trigonometry to convert between coordinate systems.
 *
 * @see "Astronomical Algorithms" by Jean Meeus, Chapter 13
 */

import { normalizeAngle, oppositePoint } from './house-utils.js';
import type { Angles } from './types.js';

/**
 * Convert degrees to radians
 *
 * @param degrees - Angle in degrees
 * @returns Angle in radians
 */
function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Convert radians to degrees
 *
 * @param radians - Angle in radians
 * @returns Angle in degrees
 */
function radiansToDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * Calculate the Midheaven (MC)
 *
 * The Midheaven is the ecliptic degree that is culminating (crossing the meridian)
 * at the given moment. It's the cusp of the 10th house.
 *
 * Formula from Meeus: tan(MC) = tan(LST) / cos(ε)
 *
 * @param lst - Local Sidereal Time in degrees (0-360)
 * @param obliquity - Obliquity of the ecliptic in degrees (~23.4°)
 * @returns Midheaven position in ecliptic longitude (0-360°)
 *
 * @see "Astronomical Algorithms" by Jean Meeus, Chapter 13
 *
 * @example
 * ```typescript
 * // LST = 180° (sidereal noon), obliquity = 23.44°
 * const mc = calculateMidheaven(180, 23.44);
 * console.log(mc);  // ~180° (0° Libra)
 * ```
 */
export function calculateMidheaven(lst: number, obliquity: number): number {
  const lstRad = degreesToRadians(lst);
  const oblRad = degreesToRadians(obliquity);

  // tan(MC) = tan(LST) / cos(ε)
  // Using atan2 to preserve quadrant information
  const numerator = Math.sin(lstRad);
  const denominator = Math.cos(lstRad) * Math.cos(oblRad);

  const mcRad = Math.atan2(numerator, denominator);
  const mc = radiansToDegrees(mcRad);

  return normalizeAngle(mc);
}

/**
 * Calculate the Ascendant (ASC)
 *
 * The Ascendant is the ecliptic degree rising on the eastern horizon at the
 * given moment and location. It's the cusp of the 1st house in most house systems.
 *
 * Formula from Meeus:
 * tan(ASC) = cos(LST) / -(sin(ε) * tan(φ) + cos(ε) * sin(LST))
 *
 * where:
 * - LST = Local Sidereal Time
 * - ε = obliquity of the ecliptic
 * - φ = geographic latitude
 *
 * @param lst - Local Sidereal Time in degrees (0-360)
 * @param obliquity - Obliquity of the ecliptic in degrees (~23.4°)
 * @param latitude - Geographic latitude in degrees (-90 to +90)
 * @returns Ascendant position in ecliptic longitude (0-360°)
 *
 * @throws {Error} If latitude is at exact poles (±90°) where ASC is undefined
 *
 * @see "Astronomical Algorithms" by Jean Meeus, Chapter 13
 *
 * @example
 * ```typescript
 * // London: lat = 51.5°, LST = 180°, obliquity = 23.44°
 * const asc = calculateAscendant(180, 23.44, 51.5);
 * console.log(asc);  // Ecliptic degree rising at this moment
 * ```
 */
export function calculateAscendant(lst: number, obliquity: number, latitude: number): number {
  // Check for poles where Ascendant is undefined
  if (Math.abs(latitude) >= 90) {
    throw new Error(
      'Ascendant is undefined at the exact poles (latitude = ±90°). All ecliptic degrees rise and set simultaneously.',
    );
  }

  const lstRad = degreesToRadians(lst);
  const oblRad = degreesToRadians(obliquity);
  const latRad = degreesToRadians(latitude);

  // tan(ASC) = cos(LST) / -(sin(ε) * tan(φ) + cos(ε) * sin(LST))
  // Using atan2 to preserve quadrant information
  const numerator = Math.cos(lstRad);
  const denominator = -(Math.sin(oblRad) * Math.tan(latRad) + Math.cos(oblRad) * Math.sin(lstRad));

  const ascRad = Math.atan2(numerator, denominator);
  const asc = radiansToDegrees(ascRad);

  return normalizeAngle(asc);
}

/**
 * Calculate all four angles at once
 *
 * Computes ASC, MC, DSC (opposite ASC), and IC (opposite MC) in one call.
 * This is a convenience function that combines the individual calculations.
 *
 * @param lst - Local Sidereal Time in degrees (0-360)
 * @param obliquity - Obliquity of the ecliptic in degrees (~23.4°)
 * @param latitude - Geographic latitude in degrees (-90 to +90)
 * @returns All four angles
 *
 * @throws {Error} If latitude is at exact poles (±90°)
 *
 * @example
 * ```typescript
 * const angles = calculateAngles(180, 23.44, 51.5);
 * console.log(angles);
 * // {
 * //   ascendant: ...,
 * //   midheaven: ...,
 * //   descendant: ...,
 * //   imumCoeli: ...
 * // }
 * ```
 */
export function calculateAngles(lst: number, obliquity: number, latitude: number): Angles {
  const ascendant = calculateAscendant(lst, obliquity, latitude);
  const midheaven = calculateMidheaven(lst, obliquity);
  const descendant = oppositePoint(ascendant);
  const imumCoeli = oppositePoint(midheaven);

  return {
    ascendant,
    midheaven,
    descendant,
    imumCoeli,
  };
}
