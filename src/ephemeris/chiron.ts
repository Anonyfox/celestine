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
 * corrections for reasonable accuracy.
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
function earthHeliocentricLongitude(tau: number): number {
  const tau2 = tau * tau;

  const earthL0: readonly (readonly [number, number, number])[] = [
    [175347046, 0, 0],
    [3341656, 4.6692568, 6283.07585],
    [34894, 4.6261, 12566.1517],
    [3497, 2.7441, 5753.3849],
    [3418, 2.8289, 3.5231],
    [3136, 3.6277, 77713.7715],
    [2676, 4.4181, 7860.4194],
    [2343, 6.1352, 3930.2097],
    [1324, 0.7425, 11506.7698],
    [1273, 2.0371, 529.691],
    [1199, 1.1096, 1577.3435],
  ];

  const earthL1: readonly (readonly [number, number, number])[] = [
    [628331966747, 0, 0],
    [206059, 2.678235, 6283.07585],
    [4303, 2.6351, 12566.1517],
  ];

  const earthL2: readonly (readonly [number, number, number])[] = [
    [8722, 1.0725, 6283.0758],
    [991, 3.1416, 0],
  ];

  let L0sum = 0;
  for (const [A, B, C] of earthL0) {
    L0sum += A * Math.cos(B + C * tau);
  }

  let L1sum = 0;
  for (const [A, B, C] of earthL1) {
    L1sum += A * Math.cos(B + C * tau);
  }

  let L2sum = 0;
  for (const [A, B, C] of earthL2) {
    L2sum += A * Math.cos(B + C * tau);
  }

  return (L0sum + L1sum * tau + L2sum * tau2) / 1e8;
}

/**
 * Simplified Earth heliocentric distance for geocentric conversion.
 * @param tau - Julian millennia from J2000.0
 * @returns Earth's heliocentric distance in AU
 */
function earthHeliocentricDistance(tau: number): number {
  const earthR0: readonly (readonly [number, number, number])[] = [
    [100013989, 0, 0],
    [1670700, 3.0984635, 6283.07585],
    [13956, 3.05525, 12566.1517],
    [3084, 5.1985, 77713.7715],
    [1628, 1.1739, 5753.3849],
    [1576, 2.8469, 7860.4194],
    [925, 5.453, 11506.77],
    [542, 4.564, 3930.21],
  ];

  const earthR1: readonly (readonly [number, number, number])[] = [
    [103019, 1.10749, 6283.07585],
    [1721, 1.0644, 12566.1517],
  ];

  let R0sum = 0;
  for (const [A, B, C] of earthR0) {
    R0sum += A * Math.cos(B + C * tau);
  }

  let R1sum = 0;
  for (const [A, B, C] of earthR1) {
    R1sum += A * Math.cos(B + C * tau);
  }

  return (R0sum + R1sum * tau) / 1e8;
}

/**
 * Calculate apparent geocentric position of Chiron.
 *
 * @param jd - Julian Date
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
  const { includeSpeed = true } = options;

  // Get Chiron's heliocentric coordinates
  const chiron = chironHeliocentric(jd);

  // Get Earth's heliocentric coordinates
  const tau = (jd - J2000_EPOCH) / 365250;
  const earthL = earthHeliocentricLongitude(tau);
  const earthR = earthHeliocentricDistance(tau);

  // Convert to rectangular coordinates
  const chironLonRad = chiron.lon * DEG_TO_RAD;
  const chironLatRad = chiron.lat * DEG_TO_RAD;

  const chironX = chiron.r * Math.cos(chironLatRad) * Math.cos(chironLonRad);
  const chironY = chiron.r * Math.cos(chironLatRad) * Math.sin(chironLonRad);
  const chironZ = chiron.r * Math.sin(chironLatRad);

  const earthX = earthR * Math.cos(earthL);
  const earthY = earthR * Math.sin(earthL);

  // Geocentric coordinates
  const geoX = chironX - earthX;
  const geoY = chironY - earthY;
  const geoZ = chironZ;

  // Convert to geocentric ecliptic
  let geoLon = Math.atan2(geoY, geoX) * RAD_TO_DEG;
  const geoLat = Math.atan2(geoZ, Math.sqrt(geoX * geoX + geoY * geoY)) * RAD_TO_DEG;
  const geoDist = Math.sqrt(geoX * geoX + geoY * geoY + geoZ * geoZ);

  // Normalize longitude
  while (geoLon < 0) geoLon += 360;
  while (geoLon >= 360) geoLon -= 360;

  // Apply aberration correction
  const aberration = -0.005694;
  geoLon += aberration;

  while (geoLon < 0) geoLon += 360;
  while (geoLon >= 360) geoLon -= 360;

  // Calculate speed if requested
  let longitudeSpeed = 0;
  let latitudeSpeed = 0;
  let isRetrograde = false;

  if (includeSpeed) {
    const dt = 0.01;
    const pos1 = getChironPosition(jd - dt, { includeSpeed: false });
    const pos2 = getChironPosition(jd + dt, { includeSpeed: false });

    let lonDiff = pos2.longitude - pos1.longitude;
    if (lonDiff > 180) lonDiff -= 360;
    if (lonDiff < -180) lonDiff += 360;

    longitudeSpeed = lonDiff / (2 * dt);
    latitudeSpeed = (pos2.latitude - pos1.latitude) / (2 * dt);
    isRetrograde = longitudeSpeed < 0;
  }

  return {
    longitude: geoLon,
    latitude: geoLat,
    distance: geoDist,
    longitudeSpeed,
    latitudeSpeed,
    isRetrograde,
  };
}
