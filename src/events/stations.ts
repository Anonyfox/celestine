import type { CelestialBody } from '../ephemeris/positions.js';
import { toUT } from '../time/delta-t.js';
import { getSignName } from '../zodiac/sign-properties.js';
import { position, trueEquinox } from './bodies.js';
import { interval, normalize, stationStep, stations } from './search.js';
import type { EventFrameOptions, StationEvent } from './types.js';

const SUPPORTED = [
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
  'Pluto',
  'Chiron',
];

/**
 * Retrograde and direct stations: zeros of apparent geocentric longitude rate in inclusive
 * TT JD bounds, from the one station solver shared with transits' findStationPoints.
 * Defaults to library longitudes (mean ecliptic/equinox of date); includeNutation uses the
 * true equinox (almanac convention). Supports Mercury through Pluto and Chiron (Chiron from
 * celestine/precise within 1800–2200, root Chiron outside). jd is TT; jdUT via toUT.
 * Stations are ill-conditioned in time: longitude changes by well under 1″ in the hours
 * around one, so small positional errors move the instant noticeably (see README).
 * @param body - Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto or Chiron.
 * @param startJD - Inclusive start, TT Julian Date.
 * @param endJD - Inclusive end, TT Julian Date.
 * @param options - includeNutation for the true equinox of date (`nutation`: deprecated alias).
 * @returns Chronological stations with type, longitude and sign at the station.
 * @example findStations(CelestialBody.Mercury, 2461041.5, 2461406.5)
 */
export function findStations(
  body: CelestialBody,
  startJD: number,
  endJD: number,
  options: EventFrameOptions = {},
): StationEvent[] {
  if (!SUPPORTED.includes(body))
    throw new RangeError(`No stations for ${body}: use Mercury–Pluto or Chiron`);
  interval(startJD, endJD);
  const frame = trueEquinox(options);
  return stations((jd) => position(body, jd, frame), startJD, endJD, stationStep(body)).map(
    ({ jd, sample, retrograde }) => {
      const longitude = normalize(sample.value);
      const sign = Math.floor(longitude / 30) % 12;
      return {
        body,
        jd,
        jdUT: toUT(jd),
        type: retrograde ? 'retrograde' : 'direct',
        longitude,
        sign,
        signName: getSignName(sign),
      };
    },
  );
}
