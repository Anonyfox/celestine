import type { CelestialBody } from '../ephemeris/positions.js';
import type { EventFrameOptions } from '../events/types.js';
import { toUT } from '../time/delta-t.js';
import {
  canRetrograde,
  findRetrogradePeriods,
  getCurrentRetrogradePeriod,
  getRetrogradeShadow,
} from '../transits/retrograde-transits.js';
import type { RetrogradePeriod } from '../transits/types.js';
import type { RetrogradeProgress } from './types.js';

/**
 * Progress through a retrograde cycle. All input/output JDs are TT except explicit UT fields.
 * Selects the current period, then one containing jd in its shadow, then the next period.
 * The body search is bounded to 200 days back and 1000 days ahead; returns null if absent
 * (including Sun/Moon). Options select the frame exactly as in getRetrogradeShadow.
 * A supplied period uses the default mean frame and must have increasing station times.
 *
 * Percent is elapsed station-to-station time, clamped to [0, 100], not longitude distance.
 * Both stations belong to retrograde; shadow endpoints belong to pre/post-shadow.
 * Outside those inclusive bounds the phase is outside. Midpoint is the TT time midpoint;
 * its UT companion is converted with toUT, rather than averaging UT station dates.
 * The UT companion is present only when both supplied station UT fields are present.
 */
export function getRetrogradeProgress(
  body: CelestialBody,
  jd: number,
  options?: EventFrameOptions,
): RetrogradeProgress | null;
export function getRetrogradeProgress(period: RetrogradePeriod, jd: number): RetrogradeProgress;
export function getRetrogradeProgress(
  bodyOrPeriod: CelestialBody | RetrogradePeriod,
  jd: number,
  options?: EventFrameOptions,
): RetrogradeProgress | null {
  if (!Number.isFinite(jd)) throw new RangeError('jd must be finite');
  let selected: RetrogradePeriod;
  if (typeof bodyOrPeriod === 'object') {
    selected = bodyOrPeriod;
  } else {
    if (!canRetrograde(bodyOrPeriod)) return null;
    const current = getCurrentRetrogradePeriod(bodyOrPeriod, jd, options);
    const candidates = current
      ? [current]
      : findRetrogradePeriods(bodyOrPeriod, jd - 200, jd + 1000, options);
    const containing = candidates.find((candidate) => {
      const shadow = getRetrogradeShadow(candidate, options);
      return jd >= shadow.preShadowStartJD && jd <= shadow.postShadowEndJD;
    });
    const next = containing ?? candidates.find((candidate) => candidate.stationRetroJD >= jd);
    if (!next) return null;
    selected = next;
  }
  const { stationRetroJD: start, stationDirectJD: end } = selected;
  if (!(Number.isFinite(start) && Number.isFinite(end) && end > start))
    throw new RangeError('Period stations must be finite and increasing');
  const shadow = getRetrogradeShadow(selected, options);
  const midpointJD = (start + end) / 2;
  const hasUT = selected.stationRetroJDUT !== undefined && selected.stationDirectJDUT !== undefined;
  return {
    period: selected,
    shadow,
    midpointJD,
    ...(hasUT ? { midpointJDUT: toUT(midpointJD) } : {}),
    percentDone: Math.max(0, Math.min(100, ((jd - start) / (end - start)) * 100)),
    phase:
      jd < shadow.preShadowStartJD || jd > shadow.postShadowEndJD
        ? 'outside'
        : jd < start
          ? 'pre-shadow'
          : jd <= end
            ? 'retrograde'
            : 'post-shadow',
  };
}
