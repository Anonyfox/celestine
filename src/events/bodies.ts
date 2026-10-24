import type { CelestialBody } from '../ephemeris/positions.js';
import { getPosition } from '../ephemeris/positions.js';
import { getSunPosition } from '../ephemeris/sun.js';
import { getChironPosition } from '../precise/chiron.js';
import { PRECISE_RANGE } from '../precise/position.js';
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
/** Chiron uses the shared precise model with a speed-step margin; other bodies retain root outputs. */
export function eventPosition(body: CelestialBody, jd: number) {
  return body === 'Chiron' &&
    jd >= PRECISE_RANGE.startJD + 0.001 &&
    jd <= PRECISE_RANGE.endJD - 0.001
    ? getChironPosition(jd)
    : getPosition(body, jd);
}
export function position(body: CelestialBody, jd: number, trueEquinox = false) {
  const p =
    body === 'Moon' ? moon(jd) : body === 'Sun' ? getSunPosition(jd) : eventPosition(body, jd);
  return track(p, jd, trueEquinox);
}
