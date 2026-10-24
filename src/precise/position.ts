/**
 * Apparent geocentric positions from the compact Chebyshev models.
 *
 * @module precise/position
 */
import { geocentricApparent, precessEcliptic } from '../ephemeris/planets/precision.js';
import type { EphemerisOptions, PlanetPosition } from '../ephemeris/types.js';
import { type ChebyshevModel, chebyshevBody } from './chebyshev.js';

/**
 * Julian Date (TT) range accepted by every `celestine/precise` position function:
 * 1800-01-01T12:00 TT to 2200-01-01T12:00 TT, inclusive.
 *
 * @remarks
 * The fitted models cover 1800-01-01T00:00 TT to at least 2200-03-05 TT; the half-day margin
 * at the start leaves room for light-time and speed evaluation. Outside this range the
 * functions throw a `RangeError`; they never fall back silently to the Keplerian model.
 */
export const PRECISE_RANGE: { readonly startJD: number; readonly endJD: number } = {
  startJD: 2378497,
  endJD: 2524594,
};

/** Build an apparent-position function for one body, mirroring the root API shape. */
export function precisePosition(
  model: ChebyshevModel,
  name: string,
): (jd: number, options?: EphemerisOptions) => PlanetPosition {
  const heliocentric = chebyshevBody(model);
  return (jd, options = {}) => {
    if (!(jd >= PRECISE_RANGE.startJD && jd <= PRECISE_RANGE.endJD))
      throw new RangeError(
        `celestine/precise: ${name} is only available for JD 2378497–2524594 TT (1800–2200); got ${jd}. Use celestine/ephemeris for dates outside this range.`,
      );
    return geocentricApparent(
      (time, observationJD) => {
        // In range by construction: the margin covers light time and the speed step.
        const p = heliocentric(time) as { lon: number; lat: number; r: number };
        const [longitude, latitude] = precessEcliptic(
          p.lon,
          p.lat,
          (observationJD - 2451545) / 36525,
        );
        return { longitude, latitude, distance: p.r };
      },
      jd,
      options,
    );
  };
}
