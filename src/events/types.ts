import type { CelestialBody } from '../ephemeris/positions.js';

/** TT event instant and its model-derived UT equivalent. @example event.jdUT */
export interface EventInstant {
  /** TT Julian Date. */
  jd: number;
  /** UT Julian Date, computed using time.toUT. */
  jdUT: number;
}
/** Sign crossing; indices run Aries=0 through Pisces=11. Times are TT/UT JD. @example ingress.signName */
export interface SignIngress extends EventInstant {
  body: CelestialBody;
  sign: number;
  signName: string;
  previousSign: number;
  previousSignName: string;
  retrograde: boolean;
}
/** Principal geocentric longitude phase. TT inputs, TT/UT event outputs. @example 'full-moon' */
export type LunarPhase = 'new-moon' | 'first-quarter' | 'full-moon' | 'last-quarter';
/** Exact Moon−Sun longitude phase; times are TT/UT JD. @example event.phase */
export interface LunarPhaseEvent extends EventInstant {
  phase: LunarPhase;
}
/** Lunar geometry at a TT JD; angles in degrees, distances used internally in AU. @example info.illumination */
export interface MoonPhaseInfo {
  elongation: number;
  phaseAngle: number;
  illumination: number;
  waxing: boolean;
  /** Nearest principal phase (45-degree bucket boundaries). */
  phase: LunarPhase;
}
/** True-equinox solar season; TT inputs, TT/UT event outputs. @example event.type */
export interface SeasonEvent extends EventInstant {
  type: 'march-equinox' | 'june-solstice' | 'september-equinox' | 'december-solstice';
}
/**
 * Frame option shared by the event searches, with the position API's name and meaning.
 * @example { includeNutation: true }
 */
export interface EventFrameOptions {
  /**
   * Use apparent longitudes referred to the TRUE equinox of date, as
   * getPosition(body, jd, { includeNutation: true }). Default: mean equinox of date, as
   * getPosition and calculateChart.
   */
  includeNutation?: boolean;
  /** @deprecated Since 0.5.0: use includeNutation (same meaning; includeNutation wins). */
  nutation?: boolean;
}
/** Exact unsigned longitude separation, with TT/UT JD. @example event.increasing */
export interface AspectTimeEvent extends EventInstant {
  body: CelestialBody;
  target: CelestialBody | number;
  angle: number;
  /** Whether unsigned separation in [0,180] is increasing; false at 0/180 cusps. */
  increasing: boolean;
}
/** Void interval, potentially extending outside requested TT bounds; UT equivalents supplied. @example period.lastAspect?.jd */
export interface VoidOfCoursePeriod {
  start: number;
  startUT: number;
  end: number;
  endUT: number;
  sign: number;
  signName: string;
  nextSign: number;
  nextSignName: string;
  lastAspect: ({ body: CelestialBody; angle: number } & EventInstant) | null;
}
/** Station: apparent longitude rate crosses zero; type is the motion that follows. TT/UT JD. @example station.type */
export interface StationEvent extends EventInstant {
  body: CelestialBody;
  type: 'retrograde' | 'direct';
  /** Apparent geocentric ecliptic longitude at the station, degrees [0,360). */
  longitude: number;
  /** Sign index Aries=0 through Pisces=11. */
  sign: number;
  signName: string;
}
