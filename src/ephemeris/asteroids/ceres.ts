/**
 * Ceres Position Calculator
 *
 * @module ephemeris/asteroids/ceres
 * @description
 * Calculates geocentric position of Ceres (dwarf planet, largest object in asteroid belt).
 *
 * Uses JPL Horizons orbital elements at J2000.0 epoch for optimal accuracy
 * across the date range commonly used in astrology.
 *
 * @remarks
 * Ceres was the first asteroid discovered (1801) and is now classified as a dwarf planet.
 * In astrology, Ceres represents nurturing, motherhood, and harvest.
 *
 * Orbital characteristics:
 * - Semi-major axis: 2.77 AU
 * - Orbital period: 4.60 years
 * - Eccentricity: 0.078 (nearly circular)
 * - Inclination: 10.6°
 */

import { getSunPosition } from '../sun.js';

// =============================================================================
// Constants
// =============================================================================

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const AU_IN_KM = 149597870.7;

/**
 * JPL Horizons orbital elements for Ceres at J2000.0 epoch
 * Source: JPL Horizons EPHEM_TYPE='ELEMENTS' at 2000-01-01 12:00 TT
 * Retrieved: 2025-Dec-19
 * These are AUTHORITATIVE values - do not modify without verification!
 */
export const CERES_ORBITAL_ELEMENTS = {
  /** Reference epoch (Julian Date TDB) - J2000.0 */
  epoch: 2451545.0,

  /** Semi-major axis in AU */
  semiMajorAxis: 4.138619138911831e8 / AU_IN_KM, // ~2.766 AU

  /** Eccentricity (dimensionless) */
  eccentricity: 0.07837562647163041,

  /** Inclination in degrees */
  inclination: 10.58336045805628,

  /** Longitude of ascending node in degrees */
  longitudeOfAscendingNode: 80.49435747295276,

  /** Argument of perihelion in degrees */
  argumentOfPerihelion: 73.92286274285223,

  /** Mean anomaly at epoch in degrees */
  meanAnomalyAtEpoch: 6.176654513180486,

  /** Mean daily motion in degrees/day */
  meanDailyMotion: 2.479106915273858e-6 * 86400, // Convert from deg/s to deg/day

  /** Orbital period in days */
  orbitalPeriod: 360 / (2.479106915273858e-6 * 86400),

  /** Orbital period in years */
  orbitalPeriodYears: 4.6,
} as const;

// =============================================================================
// Kepler's Equation Solver
// =============================================================================

/**
 * Solves Kepler's equation: M = E - e*sin(E)
 * Uses Newton-Raphson iteration.
 */
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

/**
 * Calculates true anomaly from eccentric anomaly
 */
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

/**
 * Calculates Ceres heliocentric position using orbital elements
 */
function getHeliocentricPosition(jd: number): { x: number; y: number; z: number; r: number } {
  const elem = CERES_ORBITAL_ELEMENTS;

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

/**
 * Gets Ceres heliocentric ecliptic longitude
 */
export function ceresHeliocentricLongitude(jd: number): number {
  const pos = getHeliocentricPosition(jd);
  let lon = Math.atan2(pos.y, pos.x) * RAD_TO_DEG;
  if (lon < 0) lon += 360;
  return lon;
}

/**
 * Gets Ceres heliocentric ecliptic latitude
 */
export function ceresHeliocentricLatitude(jd: number): number {
  const pos = getHeliocentricPosition(jd);
  const r = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
  return Math.asin(pos.z / r) * RAD_TO_DEG;
}

/**
 * Gets Ceres heliocentric distance
 */
export function ceresHeliocentricDistance(jd: number): number {
  return getHeliocentricPosition(jd).r;
}

/**
 * Calculates the complete geocentric position of Ceres
 */
export function getCeresPosition(
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

  const ceresHelio = getHeliocentricPosition(jd);

  const sun = getSunPosition(jd);
  const sunLonRad = sun.longitude * DEG_TO_RAD;
  const sunLatRad = sun.latitude * DEG_TO_RAD;
  const earthX = -sun.distance * Math.cos(sunLatRad) * Math.cos(sunLonRad);
  const earthY = -sun.distance * Math.cos(sunLatRad) * Math.sin(sunLonRad);
  const earthZ = -sun.distance * Math.sin(sunLatRad);

  const geoX = ceresHelio.x - earthX;
  const geoY = ceresHelio.y - earthY;
  const geoZ = ceresHelio.z - earthZ;

  const distance = Math.sqrt(geoX * geoX + geoY * geoY + geoZ * geoZ);
  let longitude = Math.atan2(geoY, geoX) * RAD_TO_DEG;
  if (longitude < 0) longitude += 360;
  const latitude = Math.asin(geoZ / distance) * RAD_TO_DEG;

  let longitudeSpeed = 0;
  if (includeSpeed) {
    const dt = 1;
    const pos2 = getCeresPosition(jd + dt, { includeSpeed: false });
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
