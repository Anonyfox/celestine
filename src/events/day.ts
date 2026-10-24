import { CelestialBody } from '../ephemeris/positions.js';
import { calculateAscendant } from '../houses/angles.js';
import { obliquityOfEcliptic } from '../houses/obliquity.js';
import { toUT } from '../time/delta-t.js';
import { greenwichMeanSiderealTime } from '../time/sidereal-time.js';
import { getSignName } from '../zodiac/sign-properties.js';
import { position, trueEquinox } from './bodies.js';
import { findSignIngresses } from './ingresses.js';
import { nutation } from './luminaries.js';
import { interval, normalize, roots, wrap } from './search.js';
import type {
  AscendantSignInterval,
  EventFrameOptions,
  SignsDuring,
  SignsDuringOptions,
} from './types.js';

/**
 * Ascendant sign intervals in mean ecliptic/equinox of date, using the chart's UT
 * mean sidereal time and UT mean obliquity. True equinox adds longitude nutation.
 * Polar circles (|latitude| >= 66 degrees) are rejected to exclude jumps, including
 * their secular motion. Shared boundaries belong to the following interval.
 * @param startJD - Inclusive TT Julian Date start.
 * @param endJD - Inclusive TT Julian Date end.
 * @param latitude - Geographic degrees north, strictly between -66 and 66.
 * @param longitude - Geographic degrees EAST positive, from -180 through 180.
 * @param options - includeNutation selects true equinox of date.
 * @returns Ordered covering intervals, with TT and model-derived UT endpoints.
 * @example findAscendantSigns(2461128.5, 2461129.5, 52.52, 13.405)
 */
export function findAscendantSigns(
  startJD: number,
  endJD: number,
  latitude: number,
  longitude: number,
  options: EventFrameOptions = {},
): AscendantSignInterval[] {
  interval(startJD, endJD);
  if (
    !Number.isFinite(latitude) ||
    Math.abs(latitude) >= 66 ||
    !Number.isFinite(longitude) ||
    Math.abs(longitude) > 180
  )
    throw new RangeError('Expected |latitude| < 66 and |longitude| <= 180');
  const frame = trueEquinox(options);
  const geometry = (jd: number) => {
    const ut = toUT(jd);
    const epsilon = obliquityOfEcliptic(ut);
    if (!(Math.abs(latitude) + Math.abs(epsilon) < 90))
      throw new RangeError('Polar ascendant unsupported');
    return {
      epsilon,
      lst: greenwichMeanSiderealTime(ut) + longitude,
      shift: frame ? nutation(jd) : 0,
    };
  };
  const asc = (jd: number) => {
    const g = geometry(jd);
    return normalize(calculateAscendant(g.lst, g.epsilon, latitude) + g.shift);
  };
  const radians = Math.PI / 180;
  // For each ecliptic cusp the eastern horizon has LST = alpha - acos(-tan(phi)tan(delta)).
  // LST rotates <73 degrees per 0.2 d: no wrap or cusp can be skipped, even
  // when adjacent signs rise only seconds apart near the polar circle.
  const boundaries = Array.from({ length: 12 }, (_, sign) =>
    roots(
      (jd) => {
        const g = geometry(jd);
        const lambda = (sign * 30 - g.shift) * radians;
        const epsilon = g.epsilon * radians;
        const alpha = Math.atan2(Math.sin(lambda) * Math.cos(epsilon), Math.cos(lambda));
        const delta = Math.asin(Math.sin(lambda) * Math.sin(epsilon));
        const rising =
          (alpha - Math.acos(-Math.tan(latitude * radians) * Math.tan(delta))) / radians;
        return { value: wrap(g.lst - rising), rate: 360.985647 };
      },
      startJD,
      endJD,
      0.2,
    ).map((jd) => {
      // Refine the analytic bracket using exactly the library's ascendant function.
      const lo = Math.max(startJD, jd - 1 / 86400);
      const hi = Math.min(endJD, jd + 1 / 86400);
      const refined = roots(
        (t) => ({ value: wrap(asc(t) - sign * 30), rate: 361 }),
        lo,
        hi,
        1 / 86400,
      );
      const time = refined[0] ?? jd;
      // Snap sub-millisecond root roundoff to an inclusive endpoint.
      return {
        jd:
          Math.abs(time - startJD) < 1e-8 ? startJD : Math.abs(time - endJD) < 1e-8 ? endJD : time,
        sign,
      };
    }),
  )
    .flat()
    .sort((a, b) => a.jd - b.jd);
  let start = startJD;
  let sign = Math.floor(asc(startJD) / 30);
  const result: AscendantSignInterval[] = [];
  const add = (end: number) =>
    result.push({
      sign,
      signName: getSignName(sign),
      start,
      startUT: toUT(start),
      end,
      endUT: toUT(end),
    });
  for (const boundary of boundaries) {
    if (boundary.jd > start) add(boundary.jd);
    start = boundary.jd;
    sign = boundary.sign;
  }
  add(endJD);
  return result;
}

/**
 * Sign certainty over inclusive TT bounds, in mean ecliptic/equinox of date by
 * default; includeNutation selects true equinox. Ingresses also carry UT via toUT.
 * @param startJD - Inclusive TT Julian Date start.
 * @param endJD - Inclusive TT Julian Date end.
 * @param options - Frame and bodies; defaults to Sun through Pluto in enum order.
 * @returns Endpoint signs and every ingress, including retrograde re-entries.
 * @example getSignsDuring(2461128.5, 2461129.5)
 */
export function getSignsDuring(
  startJD: number,
  endJD: number,
  options: SignsDuringOptions = {},
): SignsDuring[] {
  interval(startJD, endJD);
  return (options.bodies ?? Object.values(CelestialBody).slice(0, 10)).map((body) => {
    if (!Object.values(CelestialBody).includes(body)) throw new RangeError('Unknown body');
    const signAt = (jd: number) =>
      Math.floor(normalize(position(body, jd, trueEquinox(options)).value) / 30);
    const startSign = signAt(startJD);
    const endSign = signAt(endJD);
    const ingresses = findSignIngresses(body, startJD, endJD, options);
    return {
      body,
      startSign,
      startSignName: getSignName(startSign),
      endSign,
      endSignName: getSignName(endSign),
      changesSign: ingresses.length > 0,
      ingresses,
    };
  });
}
