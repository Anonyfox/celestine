import { getMoonPosition } from '../ephemeris/moon.js';
import { getSunPosition } from '../ephemeris/sun.js';
import { toUT } from '../time/delta-t.js';
import { trueEquinox } from './bodies.js';
import { moon, nutation } from './luminaries.js';
import { crossings, normalize } from './search.js';
import type {
  EventFrameOptions,
  LunarPhase,
  LunarPhaseAlias,
  LunarPhaseEvent,
  MoonPhaseInfo,
} from './types.js';

const phases: readonly LunarPhase[] = ['new-moon', 'first-quarter', 'full-moon', 'last-quarter'];
const aliases: readonly LunarPhaseAlias[] = ['new', 'first', 'full', 'last'];
/**
 * Find principal apparent geocentric Moon−Sun longitude phases in an inclusive TT JD interval.
 * The phase instants do not depend on the frame (nutation cancels in the difference); jd is
 * TT, jdUT uses time.toUT. One-day sampling is well below half a lunation; neither luminary
 * reverses geocentric motion.
 *
 * Each event also carries the apparent geocentric ecliptic longitudes of the Moon and the Sun
 * at that instant, in the same frame as the position API: mean equinox of date by default (as
 * getMoonPosition, getSunPosition and calculateChart), true equinox of date with
 * includeNutation. Use them to match lunations against natal points.
 * @param startJD - Inclusive start, TT Julian Date.
 * @param endJD - Inclusive end, TT Julian Date.
 * @param options - Optional principal phases to include (duplicates are ignored; the short
 *   names 'new', 'first', 'full', 'last' are accepted too) and the longitude frame.
 * @returns Ordered exact phases with TT jd, UT jdUT and both longitudes in degrees [0,360).
 * @throws RangeError listing the valid names for an unknown phase.
 * @example findLunarPhases(2451545, 2451910, { phases: ['full'] })[0].moonLongitude
 */
export function findLunarPhases(
  startJD: number,
  endJD: number,
  options: EventFrameOptions & { phases?: (LunarPhase | LunarPhaseAlias)[] } = {},
): LunarPhaseEvent[] {
  const frame = trueEquinox(options);
  const targets = [
    ...new Set(
      (options.phases ?? phases).map((phase) => {
        const index = Math.max(
          phases.indexOf(phase as LunarPhase),
          aliases.indexOf(phase as LunarPhaseAlias),
        );
        if (index < 0)
          throw new RangeError(
            `Unknown lunar phase ${JSON.stringify(phase)}; use ${[...phases, ...aliases].join(', ')}`,
          );
        return index * 90;
      }),
    ),
  ];
  return crossings(
    (jd) => {
      const m = moon(jd);
      const s = getSunPosition(jd);
      return { value: m.longitude - s.longitude, rate: m.longitudeSpeed - s.longitudeSpeed };
    },
    targets,
    startJD,
    endJD,
    1,
  ).map(({ jd, target }) => {
    const shift = frame ? nutation(jd) : 0;
    return {
      jd,
      jdUT: toUT(jd),
      phase: phases[target / 90]!,
      moonLongitude: normalize(moon(jd).longitude + shift),
      sunLongitude: normalize(getSunPosition(jd, { includeSpeed: false }).longitude + shift),
    };
  });
}
/**
 * Lunar geometry at a TT Julian Date. Elongation is apparent longitude Moon−Sun [0,360).
 * Phase angle is Sun–Moon–Earth [0,180], using latitude and both geocentric AU distances;
 * illumination is (1+cos(phaseAngle))/2. Waxing means elongation <180 degrees.
 * phase is the nearest principal longitude phase, with boundaries at 45,135,225,315 degrees.
 * @param jd - TT Julian Date (not UT).
 * @returns Elongation, geometric phase angle, illuminated fraction and phase bucket.
 * @example getMoonPhase(2451545).illumination
 */
export function getMoonPhase(jd: number): MoonPhaseInfo {
  if (!Number.isFinite(jd)) throw new RangeError('Expected finite TT Julian Date');
  const m = getMoonPosition(jd, { includeSpeed: false });
  const s = getSunPosition(jd, { includeSpeed: false });
  const elongation = normalize(m.longitude - s.longitude);
  const rad = Math.PI / 180;
  const cosPsi = Math.max(
    -1,
    Math.min(
      1,
      Math.sin(m.latitude * rad) * Math.sin(s.latitude * rad) +
        Math.cos(m.latitude * rad) * Math.cos(s.latitude * rad) * Math.cos(elongation * rad),
    ),
  );
  const phaseAngle =
    Math.atan2(
      s.distance * Math.sqrt(Math.max(0, 1 - cosPsi * cosPsi)),
      m.distance - s.distance * cosPsi,
    ) / rad;
  return {
    elongation,
    phaseAngle,
    illumination: (1 + Math.cos(phaseAngle * rad)) / 2,
    waxing: elongation < 180,
    phase: phases[Math.floor((elongation + 45) / 90) % 4]!,
  };
}
