import { moonLongitude } from '../ephemeris/moon.js';
import { nutationInLongitude } from '../ephemeris/nutation.js';
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

/** Nutation in longitude (degrees) at a TT Julian Date: the shared IAU 2000B series. */
export function nutation(jd: number): number {
  return nutationInLongitude((jd - 2451545) / 36525);
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
