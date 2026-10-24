import { getSunPosition } from '../ephemeris/sun.js';
import { toUT } from '../time/delta-t.js';
import { track } from './luminaries.js';
import { crossings } from './search.js';
import type { SeasonEvent } from './types.js';

const seasons: readonly SeasonEvent['type'][] = [
  'march-equinox',
  'june-solstice',
  'september-equinox',
  'december-solstice',
];
/**
 * Seasons at apparent geocentric solar longitude 0/90/180/270 degrees from the TRUE
 * equinox of date (USNO/IAU convention, nutation included). Unlike default Sun ingresses,
 * these use the true equinox. Inclusive TT JD inputs; jd is TT and jdUT is UT via toUT.
 * Five-day sampling is safe for the always-direct Sun.
 * @param startJD - Inclusive start, TT Julian Date.
 * @param endJD - Inclusive end, TT Julian Date.
 * @returns Ordered equinoxes and solstices with TT jd and UT jdUT.
 * @example findSeasons(2451545, 2451910)
 */
export function findSeasons(startJD: number, endJD: number): SeasonEvent[] {
  return crossings(
    (jd) => track(getSunPosition(jd), jd, true),
    [0, 90, 180, 270],
    startJD,
    endJD,
    5,
  ).map(({ jd, target }) => ({ jd, jdUT: toUT(jd), type: seasons[target / 90]! }));
}
