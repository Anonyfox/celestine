import type { EphemerisOptions, PlanetPosition } from '../ephemeris/types.js';
import { PALLAS_CHEBYSHEV } from './pallas-data.js';
import { precisePosition } from './position.js';

const position = /* @__PURE__ */ precisePosition(PALLAS_CHEBYSHEV, 'Pallas');

/**
 * Apparent geocentric position of Pallas (mean ecliptic and equinox of date), accurate to about
 * 1″ against JPL Horizons over 1800–2200. Same signature and return type as
 * `getPallasPosition` from `celestine` / `celestine/ephemeris`.
 *
 * @param jd - Julian Date (TT), within {@link PRECISE_RANGE}
 * @param options - Calculation options (`includeSpeed`, `includeNutation`)
 * @returns Pallas's apparent geocentric position
 * @throws RangeError when `jd` is outside {@link PRECISE_RANGE} or not a number
 *
 * @example
 * ```ts
 * import { getPallasPosition } from 'celestine/precise';
 *
 * const pallas = getPallasPosition(2451545.0);
 * console.log(pallas.longitude);
 * ```
 */
export function getPallasPosition(jd: number, options?: EphemerisOptions): PlanetPosition {
  return position(jd, options);
}
