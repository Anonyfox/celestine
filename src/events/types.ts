import type { AspectType } from '../aspects/types.js';
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
/** Short phase names accepted by findLunarPhases ('new' = 'new-moon', and so on). @example 'full' */
export type LunarPhaseAlias = 'new' | 'first' | 'full' | 'last';
/** Exact Moon−Sun longitude phase; times are TT/UT JD. @example event.moonLongitude */
export interface LunarPhaseEvent extends EventInstant {
  phase: LunarPhase;
  /**
   * Apparent geocentric ecliptic longitude of the Moon at jd, degrees [0,360): mean equinox of
   * date by default (as getMoonPosition), true equinox with includeNutation.
   */
  moonLongitude: number;
  /** Apparent geocentric ecliptic longitude of the Sun at jd, degrees [0,360), same frame. */
  sunLongitude: number;
}
/** Lunar geometry at a TT JD; angles in degrees, distances used internally in AU. @example info.illumination */
export interface MoonPhaseInfo {
  elongation: number;
  phaseAngle: number;
  illumination: number;
  waxing: boolean;
  /** Nearest principal phase (45-degree bucket boundaries). */
  phase: LunarPhase;
  /**
   * Eight-phase name: 45-degree elongation buckets centred on 0, 45, ... 315 degrees, so
   * 'new-moon' is elongation within 22.5 degrees of 0, 'waxing-crescent' 22.5–67.5, and so on.
   */
  phaseName: MoonPhaseName;
}
/** Eight-phase Moon name, from getMoonPhase(jd).phaseName. @example 'waxing-gibbous' */
export type MoonPhaseName =
  | LunarPhase
  | 'waxing-crescent'
  | 'waxing-gibbous'
  | 'waning-gibbous'
  | 'waning-crescent';
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
   * getPosition and calculateChart. Chiron events use celestine/precise within
   * 1800–2200 with a 0.001-day speed margin; root Chiron outside.
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

/** Eclipse family; inputs and greatest instants use TT. @example 'solar' */
export type EclipseKind = 'solar' | 'lunar';
/** Solar shadow classification. @example 'hybrid' */
export type SolarEclipseType = 'total' | 'annular' | 'hybrid' | 'partial';
/** Lunar shadow classification. @example 'penumbral' */
export type LunarEclipseType = 'total' | 'partial' | 'penumbral';
/** Greatest eclipse geometry, TT/UT JD and apparent geocentric longitudes of date. @example event.gamma */
interface EclipseGeometry extends EventInstant {
  /** Signed axis separation in Earth equatorial radii (NASA north-positive convention). */
  gamma: number;
  /** NASA magnitude; lunar penumbral events use the penumbral magnitude. */
  magnitude: number;
  /** Degrees [0,360), mean equinox of date by default, true with includeNutation. */
  sunLongitude: number;
  /** Same frame and units as sunLongitude. */
  moonLongitude: number;
  sunSign: number;
  sunSignName: string;
  moonSign: number;
  moonSignName: string;
}
/** Greatest solar eclipse; apparent diameter ratio for central eclipses. @example event.central */
export interface SolarEclipseEvent extends EclipseGeometry {
  kind: 'solar';
  type: SolarEclipseType;
  /** Whether the shadow axis intersects Earth's ellipsoid. */
  central: boolean;
}
/** Greatest lunar eclipse; magnitudes are fractions of the Moon diameter immersed. @example event.umbralMagnitude */
export interface LunarEclipseEvent extends EclipseGeometry {
  kind: 'lunar';
  type: LunarEclipseType;
  umbralMagnitude: number;
  penumbralMagnitude: number;
}
/** Discriminated greatest-eclipse union, with TT/UT instants. @example event.kind */
export type EclipseEvent = SolarEclipseEvent | LunarEclipseEvent;

/** Ascendant sign span: TT and UT endpoints, mean equinox unless requested true. @example span.signName */
export interface AscendantSignInterval {
  sign: number;
  signName: string;
  start: number;
  startUT: number;
  end: number;
  endUT: number;
}
/** Day report selection in the event longitude frame. @example { bodies: [CelestialBody.Moon] } */
/**
 * Options for searchTransitPasses: the event frame plus orb overrides per transiting body.
 * @example { includeNutation: true, bodyOrbs: { Mars: 1, Saturn: { conjunction: 1.5 } } }
 */
export interface TransitPassOptions extends EventFrameOptions {
  /**
   * Orb in degrees per transiting body: one number for every aspect, or per aspect type.
   * An override replaces the computed orb for that body (config.orbs and the luminary,
   * angle and outer-planet extensions); aspects without an override keep the computed orb.
   */
  bodyOrbs?: Partial<Record<CelestialBody, number | Partial<Record<AspectType, number>>>>;
}
export interface SignsDuringOptions extends EventFrameOptions {
  bodies?: CelestialBody[];
}
/** Signs and TT/UT ingresses over inclusive TT bounds in the selected frame. @example report.changesSign */
export interface SignsDuring {
  body: CelestialBody;
  startSign: number;
  startSignName: string;
  endSign: number;
  endSignName: string;
  changesSign: boolean;
  ingresses: SignIngress[];
}

/** WGS84 geodetic observer; degrees, east-positive longitude, elevation in metres. @example { latitude: 52.52, longitude: 13.405 } */
export interface EclipseObserver {
  latitude: number;
  longitude: number;
  elevation?: number;
}
/** Contact instant with geometric topocentric centre altitude in degrees. @example contact.jdUT */
export interface EclipseContact extends EventInstant {
  altitude: number;
}
/** Solar contact with geometric Sun centre altitude in degrees. @example contact.sunAltitude */
export interface SolarEclipseContact extends EventInstant {
  sunAltitude: number;
}
/** Local solar circumstances; azimuth north=0, east=90; no refraction or limb profile. @example local.partialBegin */
export interface SolarEclipseLocal {
  kind: 'solar';
  visible: boolean;
  localType: 'none' | 'partial' | 'annular' | 'total';
  maximum: EventInstant & {
    magnitude: number;
    obscuration: number;
    sunAltitude: number;
    sunAzimuth: number;
  };
  partialBegin: SolarEclipseContact | null;
  partialEnd: SolarEclipseContact | null;
  centralBegin: SolarEclipseContact | null;
  centralEnd: SolarEclipseContact | null;
  /** Central phase seconds, or null when there is no central phase. */
  duration: number | null;
}
/** Lunar contacts are global; altitudes are topocentric geometric Moon centre, no refraction. @example local.P1 */
export interface LunarEclipseLocal {
  kind: 'lunar';
  maximum: EventInstant;
  P1: EclipseContact | null;
  U1: EclipseContact | null;
  U2: EclipseContact | null;
  U3: EclipseContact | null;
  U4: EclipseContact | null;
  P4: EclipseContact | null;
  moonAltitude: number;
  visibleAtMaximum: boolean;
  /** False for penumbral eclipses. */
  visibleDuringUmbral: boolean;
  visibleDuringEclipse: boolean;
  /** Full P1..P4, U1..U4 and U2..U3 intervals in minutes; absent phases are zero. */
  durations: { penumbral: number; partial: number; total: number };
}
