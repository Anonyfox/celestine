/**
 * Obliquity of the ecliptic calculations
 *
 * The obliquity of the ecliptic (ε) is the angle between the ecliptic plane
 * (Earth's orbital plane) and the celestial equator (projection of Earth's equator).
 *
 * This angle is approximately 23.4° and changes slowly over time due to
 * gravitational perturbations from the Moon and planets.
 *
 * The obliquity is fundamental for:
 * - Converting between ecliptic and equatorial coordinates
 * - Calculating the Ascendant and Midheaven
 * - Understanding seasonal variations
 *
 * @see "Astronomical Algorithms" by Jean Meeus, Chapter 22
 * @see Laskar, J. (1986), A&A, 157, 59-70
 */

import { OBLIQUITY_COEFFICIENTS } from './constants.js';

/**
 * Calculate the mean obliquity of the ecliptic
 *
 * Uses the Laskar 1986 formula, which is accurate for ±10,000 years around J2000.
 * This is a simplified version of the full IAU formula, sufficient for astrological
 * calculations.
 *
 * Formula: ε₀ = 23.43929111° - 0.013004166°*T - 1.6388889×10⁻⁷°*T² + 5.0361111×10⁻⁷°*T³
 *
 * where T = Julian Centuries from J2000.0 = (JD - 2451545.0) / 36525
 *
 * @param T - Julian Centuries from J2000.0 epoch
 * @returns Mean obliquity of ecliptic in degrees
 *
 * @see "Astronomical Algorithms" by Jean Meeus, Chapter 22, page 147
 *
 * @example
 * Calculate obliquity at J2000.0 epoch (T = 0):
 * ```typescript
 * const obliquity = meanObliquity(0);
 * console.log(obliquity);  // ~23.439° (23°26'21")
 * ```
 *
 * @example
 * Calculate obliquity one century after J2000:
 * ```typescript
 * const obliquity = meanObliquity(1.0);
 * console.log(obliquity);  // ~23.427° (slightly decreased)
 * ```
 *
 * @example
 * With Julian Centuries from time module:
 * ```typescript
 * import { toJulianCenturies } from '../time/julian-centuries.js';
 *
 * const T = toJulianCenturies(2460665.0);  // Some Julian Date
 * const obliquity = meanObliquity(T);
 * ```
 */
export function meanObliquity(T: number): number {
  const { C0, C1, C2, C3 } = OBLIQUITY_COEFFICIENTS;

  // Polynomial formula: C0 + C1*T + C2*T² + C3*T³
  const obliquity = C0 + C1 * T + C2 * T * T + C3 * T * T * T;

  return obliquity;
}

/**
 * Calculate the mean obliquity of the ecliptic from Julian Date
 *
 * Convenience function that converts Julian Date to Julian Centuries
 * and calculates obliquity in one step.
 *
 * @param jd - Julian Date (UT)
 * @returns Mean obliquity of ecliptic in degrees
 *
 * @example
 * Calculate obliquity for J2000.0 epoch:
 * ```typescript
 * import { J2000_EPOCH } from '../time/constants.js';
 *
 * const obliquity = obliquityOfEcliptic(J2000_EPOCH);
 * console.log(obliquity);  // ~23.439° (23°26'21")
 * ```
 *
 * @example
 * Calculate for a specific date:
 * ```typescript
 * import { toJulianDate } from '../time/julian-date.js';
 *
 * const jd = toJulianDate({
 *   year: 2025, month: 12, day: 18,
 *   hour: 12, minute: 0, second: 0
 * });
 * const obliquity = obliquityOfEcliptic(jd);
 * ```
 */
export function obliquityOfEcliptic(jd: number): number {
  // Convert JD to Julian Centuries from J2000.0
  const T = (jd - 2451545.0) / 36525;

  return meanObliquity(T);
}

