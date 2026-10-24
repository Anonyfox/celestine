import type { EphemerisOptions, PlanetPosition } from '../ephemeris/types.js';
import { CERES_CHEBYSHEV } from './ceres-data.js';
import { precisePosition } from './position.js';

const position = /* @__PURE__ */ precisePosition(CERES_CHEBYSHEV, 'Ceres');

/**
 * Apparent geocentric position of Ceres (mean ecliptic and equinox of date), accurate to about
 * 1″ against JPL Horizons over 1800–2200. Same signature and return type as
 * `getCeresPosition` from `celestine` / `celestine/ephemeris`.
 *
 * @param jd - Julian Date (TT), within {@link PRECISE_RANGE}
 * @param options - Calculation options (`includeSpeed`, `includeNutation`)
 * @returns Ceres's apparent geocentric position
 * @throws RangeError when `jd` is outside {@link PRECISE_RANGE} or not a number
 *
 * @example
 * ```ts
 * import { getCeresPosition } from 'celestine/precise';
 *
 * const ceres = getCeresPosition(2451545.0);
 * console.log(ceres.longitude);
 * ```
 */
export function getCeresPosition(jd: number, options?: EphemerisOptions): PlanetPosition {
  return position(jd, options);
}
