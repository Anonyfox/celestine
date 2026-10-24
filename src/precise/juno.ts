import type { EphemerisOptions, PlanetPosition } from '../ephemeris/types.js';
import { JUNO_CHEBYSHEV } from './juno-data.js';
import { precisePosition } from './position.js';

const position = /* @__PURE__ */ precisePosition(JUNO_CHEBYSHEV, 'Juno');

/**
 * Apparent geocentric position of Juno (mean ecliptic and equinox of date), accurate to about
 * 1″ against JPL Horizons over 1800–2200. Same signature and return type as
 * `getJunoPosition` from `celestine` / `celestine/ephemeris`.
 *
 * @param jd - Julian Date (TT), within {@link PRECISE_RANGE}
 * @param options - Calculation options (`includeSpeed`, `includeNutation`)
 * @returns Juno's apparent geocentric position
 * @throws RangeError when `jd` is outside {@link PRECISE_RANGE} or not a number
 *
 * @example
 * ```ts
 * import { getJunoPosition } from 'celestine/precise';
 *
 * const juno = getJunoPosition(2451545.0);
 * console.log(juno.longitude);
 * ```
 */
export function getJunoPosition(jd: number, options?: EphemerisOptions): PlanetPosition {
  return position(jd, options);
}
