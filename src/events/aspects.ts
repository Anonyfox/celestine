import type { CelestialBody } from '../ephemeris/positions.js';
import { toUT } from '../time/delta-t.js';
import { bodyStep, position } from './bodies.js';
import { crossings, normalize } from './search.js';
import type { AspectTimeEvent, EventFrameOptions } from './types.js';

/**
 * Exact apparent geocentric longitude aspects in inclusive TT JD bounds, in the position
 * API's default frame (mean equinox of date); includeNutation uses the true equinox, as
 * getPosition with includeNutation. Between two bodies the frame cancels (identical
 * results); a fixed target longitude is read in the chosen frame, so a natal position from
 * calculateChart is a default (mean-equinox) longitude.
 * Default angles are 0,60,90,120,180 degrees; both orientations are searched. Relative
 * stations are split to recover retrograde multiple passes. jd is TT; jdUT is UT via toUT.
 * increasing describes unsigned separation [0,180], false at the 0/180 cusps; together
 * with the requested angle it distinguishes approach from departure on either branch.
 * Identical bodies have no isolated events. Angles must be finite and in [0,180].
 * @param body - Body whose longitude is compared to target.
 * @param target - Moving body or fixed mean-equinox ecliptic longitude in degrees.
 * @param startJD - Inclusive start, TT Julian Date.
 * @param endJD - Inclusive end, TT Julian Date.
 * @param options - Unsigned aspect angles (each 0–180 degrees) and the frame.
 * @returns Ordered isolated exact aspects with TT jd and UT jdUT.
 * @example findAspectTimes(CelestialBody.Mars, CelestialBody.Saturn, 2451545, 2452640)
 */
export function findAspectTimes(
  body: CelestialBody,
  target: CelestialBody | number,
  startJD: number,
  endJD: number,
  options: EventFrameOptions & { angles?: number[] } = {},
): AspectTimeEvent[] {
  const angles = [...new Set(options.angles ?? [0, 60, 90, 120, 180])];
  if (
    angles.some((a) => !Number.isFinite(a) || a < 0 || a > 180) ||
    (typeof target === 'number' && !Number.isFinite(target))
  )
    throw new RangeError('Expected finite target and angles in [0,180]');
  const targets = angles.flatMap((a) => (a > 0 && a < 180 ? [a, 360 - a] : [a]));
  return crossings(
    (jd) => {
      const p = position(body, jd, options.includeNutation);
      const q =
        typeof target === 'number'
          ? { value: normalize(target), rate: 0 }
          : position(target, jd, options.includeNutation);
      return { value: p.value - q.value, rate: p.rate - q.rate };
    },
    targets,
    startJD,
    endJD,
    Math.min(bodyStep(body), typeof target === 'number' ? Infinity : bodyStep(target)),
  ).map(({ jd, target: branch, rate }) => ({
    jd,
    jdUT: toUT(jd),
    body,
    target,
    angle: Math.min(branch, 360 - branch),
    increasing: branch > 0 && branch < 180 ? rate > 0 : branch > 180 ? rate < 0 : false,
  }));
}
