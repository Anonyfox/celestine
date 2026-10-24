import { moonLongitude } from '../ephemeris/moon.js';
import { normalize, wrap } from './search.js';

/** Centered derivative, unlike the public Moon's one-day forward speed. */
export function moon(jd: number) {
  const t = (jd - 2451545) / 36525;
  return {
    longitude: normalize(moonLongitude(t)),
    longitudeSpeed:
      wrap(moonLongitude(t + 0.001 / 36525) - moonLongitude(t - 0.001 / 36525)) / 0.002,
  };
}

/**
 * Nutation in longitude (degrees), Meeus eq. 22 four-term series (~0.5″ vs IAU 1980).
 * The ephemeris keeps its one-term value for size; event timing needs the extra terms
 * (1.32″ in Sun longitude is ~30 s of season time).
 */
export function nutation(jd: number): number {
  const t = (jd - 2451545) / 36525;
  const r = Math.PI / 180;
  const o = (125.04452 - 1934.136261 * t) * r;
  return (
    (-17.2 * Math.sin(o) -
      1.32 * Math.sin((560.933 + 72001.5396 * t) * r) -
      0.23 * Math.sin((436.633 + 962535.7626 * t) * r) +
      0.21 * Math.sin(2 * o)) /
    3600
  );
}

/** Longitude/rate in search form, optionally referred to the true equinox of date. */
export function track(
  p: { longitude: number; longitudeSpeed: number },
  jd: number,
  trueEquinox = false,
) {
  return trueEquinox
    ? {
        value: p.longitude + nutation(jd),
        rate: p.longitudeSpeed + (nutation(jd + 0.001) - nutation(jd - 0.001)) / 0.002,
      }
    : { value: p.longitude, rate: p.longitudeSpeed };
}
