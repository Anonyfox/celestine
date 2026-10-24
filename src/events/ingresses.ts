import type { CelestialBody } from '../ephemeris/positions.js';
import { toUT } from '../time/delta-t.js';
import { getSignName } from '../zodiac/sign-properties.js';
import { bodyStep, position, trueEquinox } from './bodies.js';
import { crossings } from './search.js';
import type { EventFrameOptions, SignIngress } from './types.js';

/**
 * Every 30-degree sign crossing, including retrograde re-entries, in inclusive TT JD bounds.
 * Same frame as the position API: by default apparent longitude in the mean equinox of
 * date (as getPosition and calculateChart); includeNutation:true is the true equinox, as
 * getPosition(body, jd, { includeNutation: true }). At every returned jd the position API
 * with matching options is on the cusp to within 1e-4 arcsecond. Chiron uses
 * `celestine/precise` within 1800–2200 (0.001-day margin), and root outside.
 * Supports all getPosition bodies, including nodes/Lilith. jd is TT; jdUT is UT via toUT.
 * Sign indices are Aries=0 through Pisces=11; retrograde entries enter the preceding sign.
 * @param body - Any supported celestial body, including nodes and Lilith.
 * @param startJD - Inclusive start, TT Julian Date.
 * @param endJD - Inclusive end, TT Julian Date.
 * @param options - includeNutation for the true equinox of date. `nutation` is its
 *   deprecated alias (0.4.0 name), still honoured when includeNutation is absent.
 * @returns Chronologically ordered crossings with entered and previous sign names.
 * @example findSignIngresses(CelestialBody.Mercury, 2451545, 2451910, { includeNutation: true })
 */
export function findSignIngresses(
  body: CelestialBody,
  startJD: number,
  endJD: number,
  options: EventFrameOptions = {},
): SignIngress[] {
  const frame = trueEquinox(options);
  return crossings(
    (jd) => position(body, jd, frame),
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
