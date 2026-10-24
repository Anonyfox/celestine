import { geocentricApparent, precessEcliptic } from './planets/precision.js';
/**
 * Chiron Position Calculator
 *
 * Calculates the apparent geocentric position of Chiron.
 *
 * @module ephemeris/chiron
 *
 * @remarks
 * Chiron (2060 Chiron) is a centaur - a minor planet with an unstable orbit
 * between Saturn and Uranus. Discovered in 1977 by Charles Kowal, it has
 * become important in modern astrology as the "Wounded Healer."
 *
 * Orbital characteristics:
 * - Semi-major axis: 13.65 AU
 * - Eccentricity: 0.379 (highly eccentric)
 * - Orbital period: ~50.4 years
 * - Perihelion: 8.46 AU (inside Saturn's orbit)
 * - Aphelion: 18.83 AU (near Uranus' orbit)
 * - Inclination: 6.93°
 *
 * This implementation uses Keplerian orbital elements with perturbation
 * corrections. The 1950–2050 Horizons fixtures characterize its limitations:
 * this osculating approximation can drift by degrees and is not an arcsecond theory.
 * Its J2000 element frame is precessed to the mean ecliptic/equinox of date.
 *
 * @see JPL Small-Body Database for orbital elements
 */

import { DAYS_PER_JULIAN_CENTURY, DEG_TO_RAD, J2000_EPOCH, RAD_TO_DEG } from './constants.js';
import type { EphemerisOptions, PlanetPosition } from './types.js';

// =============================================================================
// CHIRON ORBITAL ELEMENTS (JPL Small-Body Database, Epoch J2000.0)
// =============================================================================

/**
 * Chiron's orbital elements at J2000.0 epoch.
 * Source: JPL Horizons EPHEM_TYPE='ELEMENTS' at 2000-01-01 12:00 TT
 * Retrieved: 2025-Dec-19
 * These are AUTHORITATIVE values - do not modify without verification!
 */
export const CHIRON_ORBITAL_ELEMENTS = {
  /** Semi-major axis in AU (from A = 2.035289944812818E+09 km / 149597870.7) */
  semiMajorAxis: 13.607,
  /** Orbital eccentricity */
  eccentricity: 0.3793438805668402,
  /** Orbital inclination in degrees */
  inclination: 6.941566489467262,
  /** Longitude of ascending node at J2000.0 (degrees) */
  longitudeOfAscendingNode: 209.39667025637,
  /** Argument of perihelion at J2000.0 (degrees) */
  argumentOfPerihelion: 339.1420138434362,
  /** Mean anomaly at J2000.0 (degrees) */
  meanAnomalyAtEpoch: 27.99722096634838,
  /** Mean daily motion (degrees/day) - from N = 2.273207179302781E-07 deg/s */
  meanDailyMotion: 2.273207179302781e-7 * 86400, // ~0.01964 deg/day
  /** Orbital period in days */
  orbitalPeriod: 18400,
  /** Orbital period in years */
  orbitalPeriodYears: 50.4,
  /** Synodic period in days */
  synodicPeriod: 377,
  /** Perihelion distance in AU */
  perihelion: 8.44,
  /** Aphelion distance in AU */
  aphelion: 18.77,
} as const;

// Rates of change per century (approximate)
const NODE_RATE = 0.15; // degrees per century
const PERI_RATE = 0.25; // degrees per century

/**
 * Solve Kepler's equation iteratively.
 * @param M - Mean anomaly in radians
 * @param e - Eccentricity
 * @returns Eccentric anomaly in radians
 */
function solveKepler(M: number, e: number): number {
  let E = M;
  for (let i = 0; i < 20; i++) {
    const dE = (M + e * Math.sin(E) - E) / (1 - e * Math.cos(E));
    E += dE;
    if (Math.abs(dE) < 1e-12) break;
  }
  return E;
}

/**
 * Calculate true anomaly from eccentric anomaly.
 * @param E - Eccentric anomaly in radians
 * @param e - Eccentricity
 * @returns True anomaly in radians
 */
function trueAnomaly(E: number, e: number): number {
  return 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
}

/**
 * Calculate Chiron's heliocentric position.
 * @param jd - Julian Date
 * @returns Heliocentric coordinates
 */
function chironHeliocentric(jd: number): { lon: number; lat: number; r: number } {
  const T = (jd - J2000_EPOCH) / DAYS_PER_JULIAN_CENTURY;

  // Orbital elements with secular variations
  const e = CHIRON_ORBITAL_ELEMENTS.eccentricity;
  const a = CHIRON_ORBITAL_ELEMENTS.semiMajorAxis;
  const i = CHIRON_ORBITAL_ELEMENTS.inclination * DEG_TO_RAD;
  const Omega = (CHIRON_ORBITAL_ELEMENTS.longitudeOfAscendingNode + NODE_RATE * T) * DEG_TO_RAD;
  const omega = (CHIRON_ORBITAL_ELEMENTS.argumentOfPerihelion + PERI_RATE * T) * DEG_TO_RAD;

  // Mean anomaly
  const daysSinceEpoch = jd - J2000_EPOCH;
  const M =
    (CHIRON_ORBITAL_ELEMENTS.meanAnomalyAtEpoch +
      CHIRON_ORBITAL_ELEMENTS.meanDailyMotion * daysSinceEpoch) *
    DEG_TO_RAD;

  // Eccentric anomaly
  const E = solveKepler(M, e);

  // True anomaly
  const nu = trueAnomaly(E, e);

  // Heliocentric distance
  const r = a * (1 - e * Math.cos(E));

  // Argument of latitude
  const u = omega + nu;

  // Heliocentric longitude and latitude
  const lon = Math.atan2(Math.cos(i) * Math.sin(u), Math.cos(u)) + Omega;

  const lat = Math.asin(Math.sin(i) * Math.sin(u));

  return {
    lon: (((lon * RAD_TO_DEG) % 360) + 360) % 360,
    lat: lat * RAD_TO_DEG,
    r,
  };
}

/**
 * Get Chiron's heliocentric longitude in degrees.
 * @param jd - Julian Date
 * @returns Heliocentric longitude in degrees
 */
export function chironHeliocentricLongitude(jd: number): number {
  return chironHeliocentric(jd).lon;
}

/**
 * Get Chiron's heliocentric latitude in degrees.
 * @param jd - Julian Date
 * @returns Heliocentric latitude in degrees
 */
export function chironHeliocentricLatitude(jd: number): number {
  return chironHeliocentric(jd).lat;
}

/**
 * Get Chiron's heliocentric distance in AU.
 * @param jd - Julian Date
 * @returns Heliocentric distance in AU
 */
export function chironHeliocentricDistance(jd: number): number {
  return chironHeliocentric(jd).r;
}

/**
 * Simplified Earth heliocentric longitude for geocentric conversion.
 * @param tau - Julian millennia from J2000.0
 * @returns Earth's heliocentric longitude in radians
 */

/**
 * Simplified Earth heliocentric distance for geocentric conversion.
 * @param tau - Julian millennia from J2000.0
 * @returns Earth's heliocentric distance in AU
 */

/**
 * Calculate apparent geocentric position of Chiron.
 *
 * @remarks
 * The default Keplerian model has degree-level error: maximum longitude error
 * 19,805.700″ (5.50°) on the 123 Horizons samples spanning 1950–2050.
 * Use `celestine/precise` for approximately arcsecond accuracy over 1800–2200.
 * `celestine/events` uses that shared precise Chiron model inside its supported
 * range (with a 0.001-day speed margin), and the root model outside.
 *
 * @param jd - Julian Date (TT)
 * @param options - Calculation options
 * @returns Chiron's apparent geocentric position
 *
 * @example
 * ```ts
 * import { getChironPosition } from 'celestine';
 *
 * const jd = 2451545.0; // J2000.0
 * const chiron = getChironPosition(jd);
 * console.log(chiron.longitude); // Position in degrees
 * ```
 */
export function getChironPosition(jd: number, options: EphemerisOptions = {}): PlanetPosition {
  return geocentricApparent(
    (time, observationJD) => {
      const p = chironHeliocentric(time);
      const [longitude, latitude] = precessEcliptic(
        p.lon * DEG_TO_RAD,
        p.lat * DEG_TO_RAD,
        (observationJD - J2000_EPOCH) / DAYS_PER_JULIAN_CENTURY,
      );
      return { longitude, latitude, distance: p.r };
    },
    jd,
    options,
  );
}
