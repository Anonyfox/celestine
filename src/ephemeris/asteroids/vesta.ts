/**
 * Vesta Position Calculator
 *
 * @module ephemeris/asteroids/vesta
 * @description
 * Calculates geocentric position of Vesta (brightest asteroid).
 *
 * Uses JPL Horizons orbital elements at J2000.0 epoch for optimal accuracy.
 *
 * @remarks
 * Vesta is the second-largest asteroid and the brightest as seen from Earth.
 * It has the shortest orbital period of the major asteroids (~3.6 years).
 * In astrology, Vesta represents devotion, dedication, and sacred service.
 *
 * Orbital characteristics:
 * - Semi-major axis: 2.36 AU (innermost major asteroid)
 * - Orbital period: 3.63 years (shortest of major asteroids)
 * - Eccentricity: 0.090 (nearly circular)
 * - Inclination: 7.1°
 */

import { getSunPosition } from '../sun.js';

// =============================================================================
// Constants
// =============================================================================

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const AU_IN_KM = 149597870.7;

/**
 * JPL Horizons orbital elements for Vesta at J2000.0 epoch
 * Source: JPL Horizons EPHEM_TYPE='ELEMENTS' at 2000-01-01 12:00 TT
 * Retrieved: 2025-Dec-19
 * These are AUTHORITATIVE values - do not modify without verification!
 */
export const VESTA_ORBITAL_ELEMENTS = {
  /** Reference epoch (Julian Date TDB) - J2000.0 */
  epoch: 2451545.0,

  /** Semi-major axis in AU */
  semiMajorAxis: 3.532805978206285e8 / AU_IN_KM, // ~2.362 AU

  /** Eccentricity (dimensionless) */
  eccentricity: 0.09002244561937413,

  /** Inclination in degrees */
  inclination: 7.133935828421654,

  /** Longitude of ascending node in degrees */
  longitudeOfAscendingNode: 103.9514370845001,

  /** Argument of perihelion in degrees */
  argumentOfPerihelion: 149.5866679599199,

  /** Mean anomaly at epoch in degrees */
  meanAnomalyAtEpoch: 341.0238343838706,

  /** Mean daily motion in degrees/day */
  meanDailyMotion: 3.143393635793232e-6 * 86400, // Convert from deg/s to deg/day

  /** Orbital period in days */
  orbitalPeriod: 360 / (3.143393635793232e-6 * 86400),

  /** Orbital period in years */
  orbitalPeriodYears: 3.63,
} as const;

// =============================================================================
// Kepler's Equation Solver
// =============================================================================

function solveKepler(M: number, e: number): number {
  M = M % (2 * Math.PI);
  if (M < 0) M += 2 * Math.PI;

  let E = M + e * Math.sin(M);

  for (let i = 0; i < 30; i++) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-12) break;
  }

  return E;
}

function trueAnomalyFromEccentric(E: number, e: number): number {
  const cosE = Math.cos(E);
  const sinE = Math.sin(E);
  const cosNu = (cosE - e) / (1 - e * cosE);
  const sinNu = (Math.sqrt(1 - e * e) * sinE) / (1 - e * cosE);
  return Math.atan2(sinNu, cosNu);
}

// =============================================================================
// Position Calculations
// =============================================================================

function getHeliocentricPosition(jd: number): { x: number; y: number; z: number; r: number } {
  const elem = VESTA_ORBITAL_ELEMENTS;

  const dt = jd - elem.epoch;
  const M = (elem.meanAnomalyAtEpoch + elem.meanDailyMotion * dt) * DEG_TO_RAD;
  const E = solveKepler(M, elem.eccentricity);
  const nu = trueAnomalyFromEccentric(E, elem.eccentricity);

  const r =
    (elem.semiMajorAxis * (1 - elem.eccentricity * elem.eccentricity)) /
    (1 + elem.eccentricity * Math.cos(nu));

  const xOrbital = r * Math.cos(nu);
  const yOrbital = r * Math.sin(nu);

  const omega = elem.argumentOfPerihelion * DEG_TO_RAD;
  const Omega = elem.longitudeOfAscendingNode * DEG_TO_RAD;
  const i = elem.inclination * DEG_TO_RAD;

  const cosOmega = Math.cos(Omega);
  const sinOmega = Math.sin(Omega);
  const cosomega = Math.cos(omega);
  const sinomega = Math.sin(omega);
  const cosi = Math.cos(i);
  const sini = Math.sin(i);

  const Px = cosomega * cosOmega - sinomega * cosi * sinOmega;
  const Py = cosomega * sinOmega + sinomega * cosi * cosOmega;
  const Pz = sinomega * sini;

  const Qx = -sinomega * cosOmega - cosomega * cosi * sinOmega;
  const Qy = -sinomega * sinOmega + cosomega * cosi * cosOmega;
  const Qz = cosomega * sini;

  const x = Px * xOrbital + Qx * yOrbital;
  const y = Py * xOrbital + Qy * yOrbital;
  const z = Pz * xOrbital + Qz * yOrbital;

  return { x, y, z, r };
}

export function vestaHeliocentricLongitude(jd: number): number {
  const pos = getHeliocentricPosition(jd);
  let lon = Math.atan2(pos.y, pos.x) * RAD_TO_DEG;
  if (lon < 0) lon += 360;
  return lon;
}

export function vestaHeliocentricLatitude(jd: number): number {
  const pos = getHeliocentricPosition(jd);
  const r = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
  return Math.asin(pos.z / r) * RAD_TO_DEG;
}

export function vestaHeliocentricDistance(jd: number): number {
  return getHeliocentricPosition(jd).r;
}

export function getVestaPosition(
  jd: number,
  options: { includeSpeed?: boolean } = {},
): {
  longitude: number;
  latitude: number;
  distance: number;
  longitudeSpeed: number;
  isRetrograde: boolean;
} {
  const { includeSpeed = true } = options;

  const vestaHelio = getHeliocentricPosition(jd);

  const sun = getSunPosition(jd);
  const sunLonRad = sun.longitude * DEG_TO_RAD;
  const sunLatRad = sun.latitude * DEG_TO_RAD;
  const earthX = -sun.distance * Math.cos(sunLatRad) * Math.cos(sunLonRad);
  const earthY = -sun.distance * Math.cos(sunLatRad) * Math.sin(sunLonRad);
  const earthZ = -sun.distance * Math.sin(sunLatRad);

  const geoX = vestaHelio.x - earthX;
  const geoY = vestaHelio.y - earthY;
  const geoZ = vestaHelio.z - earthZ;

  const distance = Math.sqrt(geoX * geoX + geoY * geoY + geoZ * geoZ);
  let longitude = Math.atan2(geoY, geoX) * RAD_TO_DEG;
  if (longitude < 0) longitude += 360;
  const latitude = Math.asin(geoZ / distance) * RAD_TO_DEG;

  let longitudeSpeed = 0;
  if (includeSpeed) {
    const dt = 1;
    const pos2 = getVestaPosition(jd + dt, { includeSpeed: false });
    let dLon = pos2.longitude - longitude;
    if (dLon > 180) dLon -= 360;
    if (dLon < -180) dLon += 360;
    longitudeSpeed = dLon / dt;
  }

  return {
    longitude,
    latitude,
    distance,
    longitudeSpeed,
    isRetrograde: longitudeSpeed < 0,
  };
}
