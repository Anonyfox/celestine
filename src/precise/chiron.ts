import type { EphemerisOptions, PlanetPosition } from '../ephemeris/types.js';
import { CHIRON_CHEBYSHEV } from './chiron-data.js';
import { precisePosition } from './position.js';

const position = /* @__PURE__ */ precisePosition(CHIRON_CHEBYSHEV, 'Chiron');

/**
 * Apparent geocentric position of Chiron (mean ecliptic and equinox of date), accurate to about
 * 1″ against JPL Horizons over 1800–2200. Same signature and return type as
 * `getChironPosition` from `celestine` / `celestine/ephemeris`.
 *
 * @param jd - Julian Date (TT), within {@link PRECISE_RANGE}
 * @param options - Calculation options (`includeSpeed`, `includeNutation`)
 * @returns Chiron's apparent geocentric position
 * @throws RangeError when `jd` is outside {@link PRECISE_RANGE} or not a number
 *
 * @example
 * ```ts
 * import { getChironPosition } from 'celestine/precise';
 *
 * const chiron = getChironPosition(2451545.0);
 * console.log(chiron.longitude);
 * ```
 */
export function getChironPosition(jd: number, options?: EphemerisOptions): PlanetPosition {
  return position(jd, options);
}
