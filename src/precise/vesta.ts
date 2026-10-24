import type { EphemerisOptions, PlanetPosition } from '../ephemeris/types.js';
import { precisePosition } from './position.js';
import { VESTA_CHEBYSHEV } from './vesta-data.js';

const position = /* @__PURE__ */ precisePosition(VESTA_CHEBYSHEV, 'Vesta');

/**
 * Apparent geocentric position of Vesta (mean ecliptic and equinox of date), accurate to about
 * 1″ against JPL Horizons over 1800–2200. Same signature and return type as
 * `getVestaPosition` from `celestine` / `celestine/ephemeris`.
 *
 * @param jd - Julian Date (TT), within {@link PRECISE_RANGE}
 * @param options - Calculation options (`includeSpeed`, `includeNutation`)
 * @returns Vesta's apparent geocentric position
 * @throws RangeError when `jd` is outside {@link PRECISE_RANGE} or not a number
 *
 * @example
 * ```ts
 * import { getVestaPosition } from 'celestine/precise';
 *
 * const vesta = getVestaPosition(2451545.0);
 * console.log(vesta.longitude);
 * ```
 */
export function getVestaPosition(jd: number, options?: EphemerisOptions): PlanetPosition {
  return position(jd, options);
}
