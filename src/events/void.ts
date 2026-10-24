import { CelestialBody } from '../ephemeris/positions.js';
import { toUT } from '../time/delta-t.js';
import { findAspectTimes } from './aspects.js';
import { findSignIngresses } from './ingresses.js';
import { interval } from './search.js';
import type { EventFrameOptions, VoidOfCoursePeriod } from './types.js';

const traditional = [
  CelestialBody.Sun,
  CelestialBody.Mercury,
  CelestialBody.Venus,
  CelestialBody.Mars,
  CelestialBody.Jupiter,
  CelestialBody.Saturn,
];
/**
 * Traditional void-of-course Moon: from its last exact geocentric Ptolemaic longitude
 * aspect (0,60,90,120,180; no orbs) within a sign to Sun/Mercury/Venus/Mars/Jupiter/Saturn,
 * until the next Moon ingress. Pass bodies to use e.g. the modern outer-planet convention.
 * With no aspect, the whole sign stay is void. The Moon itself is ignored in bodies.
 * Uses the position API's mean-equinox longitudes by default; includeNutation uses the true
 * equinox for the Moon's ingresses (the frame cancels in aspects between bodies). TT JD inputs; returns complete periods overlapping
 * the inclusive interval (unclipped), with start/end TT and startUT/endUT via toUT.
 * Searches four days beyond each bound to bracket full sign stays (Moon stays <3 days).
 * @param startJD - Inclusive overlap window start, TT Julian Date.
 * @param endJD - Inclusive overlap window end, TT Julian Date.
 * @param options - Aspect partners (default: the six traditional bodies) and the frame.
 * @returns Ordered, non-overlapping complete void periods and their last exact aspect.
 * @example findVoidOfCourseMoon(2451545, 2451576)
 */
export function findVoidOfCourseMoon(
  startJD: number,
  endJD: number,
  options: EventFrameOptions & { bodies?: CelestialBody[] } = {},
): VoidOfCoursePeriod[] {
  interval(startJD, endJD);
  const ingresses = findSignIngresses(CelestialBody.Moon, startJD - 4, endJD + 4, {
    includeNutation: options.includeNutation,
  });
  const bodies = [...new Set(options.bodies ?? traditional)].filter(
    (b) => b !== CelestialBody.Moon,
  );
  const aspects = bodies
    .flatMap((b) => findAspectTimes(CelestialBody.Moon, b, ingresses[0]!.jd, ingresses.at(-1)!.jd))
    .sort((a, b) => a.jd - b.jd);
  const result: VoidOfCoursePeriod[] = [];
  let cursor = 0;
  for (let i = 1; i < ingresses.length; i++) {
    const previous = ingresses[i - 1]!;
    const next = ingresses[i]!;
    let lastAspect: VoidOfCoursePeriod['lastAspect'] = null;
    while (cursor < aspects.length && aspects[cursor]!.jd < next.jd) {
      const aspect = aspects[cursor++]!;
      if (aspect.jd >= previous.jd)
        lastAspect = {
          body: aspect.target as CelestialBody,
          angle: aspect.angle,
          jd: aspect.jd,
          jdUT: aspect.jdUT,
        };
    }
    const start = lastAspect?.jd ?? previous.jd;
    if (start <= endJD && next.jd >= startJD)
      result.push({
        start,
        startUT: toUT(start),
        end: next.jd,
        endUT: next.jdUT,
        sign: previous.sign,
        signName: previous.signName,
        nextSign: next.sign,
        nextSignName: next.signName,
        lastAspect,
      });
  }
  return result;
}
