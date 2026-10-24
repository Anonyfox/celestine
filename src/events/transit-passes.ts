import { ASPECT_DEFINITIONS } from '../aspects/constants.js';
import type { CelestialBody } from '../ephemeris/positions.js';
import {
  AVERAGE_DAILY_MOTION,
  BODY_NAMES,
  DEFAULT_TRANSIT_CONFIG,
  DEFAULT_TRANSITING_BODIES,
} from '../transits/constants.js';
import {
  angularSeparation,
  getEffectiveOrb,
  jdToTransitDate,
} from '../transits/transit-detection.js';
import { generateSearchSummary, groupTransitsByMonth } from '../transits/transit-search.js';
import type { TransitSearchParams, TransitSearchResult, TransitTiming } from '../transits/types.js';
import { findAspectTimes } from './aspects.js';
import { eventPosition, trueEquinox } from './bodies.js';
import { nutation } from './luminaries.js';
import type { EventFrameOptions, TransitPassOptions } from './types.js';

/** Event longitude of body at jd: mean equinox of date, or true with includeNutation. */
const longitudeAt = (body: CelestialBody, jd: number, frame: boolean) =>
  eventPosition(body, jd).longitude + (frame ? nutation(jd) : 0);

/**
 * Split exact aspects into contiguous orb passes, in the mean equinox of date by default or
 * the true equinox with includeNutation (natalLongitude is read in the same frame).
 * Inputs and timing JDs are TT; calendar fields retain the transit module's TT convention.
 * @param body - Transiting body.
 * @param natalLongitude - Fixed longitude in degrees, in the frame chosen by options.
 * @param aspectAngle - Unsigned aspect angle, 0–180 degrees.
 * @param orb - Nonnegative orb in degrees.
 * @param startJD - Inclusive start, TT Julian Date.
 * @param endJD - Inclusive end, TT Julian Date.
 * @param options - includeNutation for the true equinox of date (`nutation`: deprecated alias).
 * @returns Ordered passes containing exact hits, with boundaries clipped to the window.
 * @example findTransitPasses(CelestialBody.Jupiter, 60, 90, 3, 2460310, 2461040)
 */
export function findTransitPasses(
  body: CelestialBody,
  natalLongitude: number,
  aspectAngle: number,
  orb: number,
  startJD: number,
  endJD: number,
  options: EventFrameOptions = {},
): Omit<TransitTiming, 'transit'>[] {
  if (!Number.isFinite(orb) || orb < 0) throw new RangeError('Invalid orb');
  const frame = trueEquinox(options);
  const hits = findAspectTimes(body, natalLongitude, startJD, endJD, {
    angles: [aspectAngle],
    includeNutation: frame,
  }).map(({ jd }) => jd);
  const deviation = (jd: number) =>
    Math.abs(angularSeparation(longitudeAt(body, jd, frame), natalLongitude) - aspectAngle);
  // Bracketed maximisation: consecutive exact hits bound one deviation maximum.
  const peaks = hits.slice(1).map((jd, i) => {
    let lo = hits[i];
    let hi = jd;
    while (hi - lo > 1e-7) {
      const a = lo + (hi - lo) / 3;
      const b = hi - (hi - lo) / 3;
      if (deviation(a) < deviation(b)) lo = a;
      else hi = b;
    }
    return (lo + hi) / 2;
  });
  const boundary = (hit: number, limit: number): number => {
    const direction = Math.sign(limit - hit);
    const step = Math.max(0.05, 0.25 / Math.abs(AVERAGE_DAILY_MOTION[body] ?? 0.1));
    let inside = hit;
    while (inside !== limit) {
      const next = inside + direction * Math.min(step, Math.abs(limit - inside));
      if (deviation(next) > orb) {
        let lo = Math.min(inside, next);
        let hi = Math.max(inside, next);
        for (let i = 0; i < 50 && hi - lo > 1e-8; i++) {
          const mid = (lo + hi) / 2;
          if (deviation(mid) <= orb === direction < 0) hi = mid;
          else lo = mid;
        }
        return (lo + hi) / 2;
      }
      inside = next;
    }
    return limit;
  };
  const passes: Omit<TransitTiming, 'transit'>[] = [];
  for (let first = 0; first < hits.length; ) {
    let last = first;
    while (last < peaks.length && deviation(peaks[last]) <= orb) last++;
    const exactJDs = hits.slice(first, last + 1);
    const enterOrbJD = boundary(hits[first], first ? peaks[first - 1] : startJD);
    const leaveOrbJD = boundary(hits[last], last < peaks.length ? peaks[last] : endJD);
    passes.push({
      enterOrbJD,
      enterOrbDate: jdToTransitDate(enterOrbJD),
      exactJDs,
      exactDates: exactJDs.map(jdToTransitDate),
      leaveOrbJD,
      leaveOrbDate: jdToTransitDate(leaveOrbJD),
      durationDays: leaveOrbJD - enterOrbJD,
      exactPasses: exactJDs.length,
      hasRetrogradePass: exactJDs.some((jd) => eventPosition(body, jd).isRetrograde),
    });
    first = last + 1;
  }
  return passes;
}

/**
 * Search for one timing per contiguous orb pass containing an exact aspect.
 * Inputs and timing JDs are TT; calendar fields follow the transit module's TT convention.
 * Longitudes use the mean ecliptic/equinox of date by default, as calculateChart; pass
 * { includeNutation: true } when natal points are true-equinox longitudes (Swiss Ephemeris
 * convention). Boundaries clip to the search window.
 * Retrograde exact hits share a timing only while continuously within orb.
 * The existing searchTransits function is unchanged. stepDays is accepted for compatibility;
 * pass isolation uses the event search's adaptive sampling.
 * @param params - Transit search parameters with TT bounds and fixed natal points.
 * @param options - Frame (includeNutation) and per-body orb overrides (bodyOrbs).
 * @returns Pass timings ordered by first exact hit, grouped by month with matching summary counts.
 * @example
 * ```ts
 * import { searchTransitPasses } from 'celestine/events';
 * const result = searchTransitPasses({
 *   startJD: 2460310.5, endJD: 2461041.5,
 *   natalPoints: [{ name: 'Sun', longitude: 345, type: 'luminary' }],
 * });
 * ```
 */
export function searchTransitPasses(
  params: TransitSearchParams,
  options: TransitPassOptions = {},
): TransitSearchResult {
  const { startJD, endJD, natalPoints, config } = params;
  const frame = trueEquinox(options);
  const fullConfig = { ...DEFAULT_TRANSIT_CONFIG, ...config };
  const transits: TransitTiming[] = [];
  for (const body of fullConfig.transitingBodies ?? DEFAULT_TRANSITING_BODIES) {
    for (const point of natalPoints) {
      for (const aspectType of fullConfig.aspectTypes) {
        const aspectAngle = ASPECT_DEFINITIONS[aspectType].angle;
        const override = options.bodyOrbs?.[body];
        const orb =
          (typeof override === 'number' ? override : override?.[aspectType]) ??
          getEffectiveOrb(aspectType, point, body, config);
        for (const pass of findTransitPasses(
          body,
          point.longitude,
          aspectAngle,
          orb,
          startJD,
          endJD,
          options,
        )) {
          const exactJD = pass.exactJDs[0];
          const separation = angularSeparation(longitudeAt(body, exactJD, frame), point.longitude);
          transits.push({
            ...pass,
            transit: {
              transitingBody: BODY_NAMES[body],
              transitingBodyEnum: body,
              natalPoint: point.name,
              aspectType,
              symbol: ASPECT_DEFINITIONS[aspectType].symbol,
              aspectAngle,
              separation,
              deviation: Math.abs(separation - aspectAngle),
              orb,
              phase: 'exact',
              strength: 100,
              isRetrograde: eventPosition(body, exactJD).isRetrograde,
              isOutOfSign: false,
              exactJD,
              exactDate: jdToTransitDate(exactJD),
            },
          });
        }
      }
    }
  }
  transits.sort((a, b) => a.exactJDs[0] - b.exactJDs[0]);
  return {
    params,
    transits,
    byMonth: groupTransitsByMonth(transits),
    summary: generateSearchSummary(transits, startJD, endJD),
  };
}
