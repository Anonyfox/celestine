import type { CelestialBody } from '../ephemeris/positions.js';
import { getPosition } from '../ephemeris/positions.js';
import { getSunPosition } from '../ephemeris/sun.js';
import { moon, track } from './luminaries.js';

// Conservative fractions of synodic/station times: Moon 0.5 d (~7 degrees),
// Mercury 1 d versus weeks between stations, other planets 2 d versus months.
// True node/Lilith have short periodic reversals: use 0.5 d. Relative searches
// take the smaller body's step. Assumption: consecutive relative stations must
// be more than one step apart; arbitrarily near degenerate stationary pairs
// cannot be guaranteed by any fixed sampling strategy.
export function bodyStep(body: CelestialBody): number {
  return body === 'Moon' || body.includes('True') ? 0.5 : body === 'Mercury' ? 1 : 2;
}
/** The frame an event search uses: includeNutation, else its deprecated alias nutation. */
export const trueEquinox = (options: { includeNutation?: boolean; nutation?: boolean }) =>
  options.includeNutation ?? options.nutation ?? false;
export function position(body: CelestialBody, jd: number, trueEquinox = false) {
  const p =
    body === 'Moon' ? moon(jd) : body === 'Sun' ? getSunPosition(jd) : getPosition(body, jd);
  return track(p, jd, trueEquinox);
}
