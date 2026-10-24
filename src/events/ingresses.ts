import type { CelestialBody } from '../ephemeris/positions.js';
import { toUT } from '../time/delta-t.js';
import { getSignName } from '../zodiac/sign-properties.js';
import { bodyStep, position } from './bodies.js';
import { crossings } from './search.js';
import type { SignIngress } from './types.js';

/**
 * Every 30-degree sign crossing, including retrograde re-entries, in inclusive TT JD bounds.
 * Defaults to library apparent longitudes in the mean ecliptic/equinox of date;
 * nutation:true adds longitude nutation for the true equinox (almanac convention).
 * Supports all getPosition bodies, including nodes/Lilith. jd is TT; jdUT is UT via toUT.
 * Sign indices are Aries=0 through Pisces=11; retrograde entries enter the preceding sign.
 * @param body - Any supported celestial body, including nodes and Lilith.
 * @param startJD - Inclusive start, TT Julian Date.
 * @param endJD - Inclusive end, TT Julian Date.
 * @param options - Set nutation to use the true equinox of date.
 * @returns Chronologically ordered crossings with entered and previous sign names.
 * @example findSignIngresses(CelestialBody.Mercury, 2451545, 2451910, { nutation: true })
 */
export function findSignIngresses(
  body: CelestialBody,
  startJD: number,
  endJD: number,
  options: { nutation?: boolean } = {},
): SignIngress[] {
  return crossings(
    (jd) => position(body, jd, options.nutation),
    Array.from({ length: 12 }, (_, i) => i * 30),
    startJD,
    endJD,
    bodyStep(body),
  ).map(({ jd, target, rate }) => {
    const retrograde = rate < 0;
    const sign = (target / 30 + (retrograde ? 11 : 0)) % 12;
    const previousSign = (sign + (retrograde ? 1 : 11)) % 12;
    return {
      body,
      jd,
      jdUT: toUT(jd),
      sign,
      signName: getSignName(sign),
      previousSign,
      previousSignName: getSignName(previousSign),
      retrograde,
    };
  });
}
