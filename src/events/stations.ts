import type { CelestialBody } from '../ephemeris/positions.js';
import { toUT } from '../time/delta-t.js';
import { getSignName } from '../zodiac/sign-properties.js';
import { position } from './bodies.js';
import { normalize, roots } from './search.js';
import type { StationEvent } from './types.js';

// Shortest time between stations: Mercury ~3 weeks, Venus/Mars ~6 weeks, outer bodies ~4 months.
const steps: Partial<Record<string, number>> = {
  Mercury: 1,
  Venus: 2,
  Mars: 2,
  Jupiter: 5,
  Saturn: 5,
  Uranus: 5,
  Neptune: 5,
  Pluto: 5,
};
// Half-width (days) of the centered difference of the longitude rate; only guides Newton.
const H = 0.01;

/**
 * Retrograde and direct stations: zeros of apparent geocentric longitude rate, found
 * with the shared root finder in inclusive TT JD bounds. Defaults to library longitudes
 * (mean ecliptic/equinox of date); nutation:true uses the true equinox (almanac convention).
 * Supports Mercury through Pluto. jd is TT; jdUT is UT via toUT.
 * Stations are ill-conditioned in time: longitude changes by well under 1″ in the hours
 * around one, so small positional errors move the instant noticeably (see README).
 * @param body - Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune or Pluto.
 * @param startJD - Inclusive start, TT Julian Date.
 * @param endJD - Inclusive end, TT Julian Date.
 * @param options - Set nutation to use the true equinox of date.
 * @returns Chronological stations with type, longitude and sign at the station.
 * @example findStations(CelestialBody.Mercury, 2461041.5, 2461406.5)
 */
export function findStations(
  body: CelestialBody,
  startJD: number,
  endJD: number,
  options: { nutation?: boolean } = {},
): StationEvent[] {
  const step = steps[body];
  if (!step) throw new RangeError(`Stations are supported for Mercury through Pluto, not ${body}`);
  const rate = (jd: number) => position(body, jd, options.nutation).rate;
  return roots(
    (jd) => ({ value: rate(jd), rate: (rate(jd + H) - rate(jd - H)) / (2 * H) }),
    startJD,
    endJD,
    step,
  ).map((jd) => {
    const longitude = normalize(position(body, jd, options.nutation).value);
    const sign = Math.floor(longitude / 30) % 12;
    return {
      body,
      jd,
      jdUT: toUT(jd),
      // Motion after the station: retrograde if the rate falls through zero.
      type: rate(jd + H) < rate(jd - H) ? 'retrograde' : 'direct',
      longitude,
      sign,
      signName: getSignName(sign),
    };
  });
}
