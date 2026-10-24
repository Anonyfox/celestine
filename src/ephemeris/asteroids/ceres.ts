/**
 * Ceres Position Calculator
 *
 * @module ephemeris/asteroids/ceres
 * @description
 * Calculates geocentric position of Ceres (dwarf planet, largest object in asteroid belt).
 *
 * Uses mean orbital elements fitted to JPL Horizons over 1800–2200.
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

import { geocentricApparent, precessEcliptic } from '../planets/precision.js';

// =============================================================================
// Constants
// =============================================================================

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

/**
 * Mean orbital elements for Ceres: J2000 ecliptic and equinox, epoch J2000.0 (TDB).
 * Least-squares fit to JPL Horizons heliocentric ecliptic-J2000 vectors, 10-day grid,
 * 1800–2200 (scripts/mean-elements/fit-mean-elements.py, 2026-10-24); rounded to the precision
 * that keeps the fit within 0.1′. These are not osculating elements: the J2000 osculating set
 * (used until 0.3.0) is exact near 2000 but drifts by degrees within a century, while these
 * minimize the error over the whole span.
 */
export const CERES_ORBITAL_ELEMENTS = {
  /** Reference epoch (Julian Date TDB) - J2000.0 */
  epoch: 2451545.0,

  /** Semi-major axis in AU */
  semiMajorAxis: 2.767,

  /** Eccentricity (dimensionless) */
  eccentricity: 0.07779,

  /** Inclination in degrees */
  inclination: 10.59,

  /** Longitude of ascending node in degrees */
  longitudeOfAscendingNode: 80.56,

  /** Argument of perihelion in degrees */
  argumentOfPerihelion: 72.5187,

  /** Mean anomaly at epoch in degrees */
  meanAnomalyAtEpoch: 7.666,

  /** Mean daily motion in degrees/day */
  meanDailyMotion: 0.21408628,

  /** Orbital period in days */
  orbitalPeriod: 360 / 0.21408628,

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
  return geocentricApparent(
    (time, observationJD) => {
      const p = getHeliocentricPosition(time);
      const [longitude, latitude] = precessEcliptic(
        Math.atan2(p.y, p.x),
        Math.asin(p.z / p.r),
        (observationJD - 2451545) / 36525,
      );
      return { longitude, latitude, distance: p.r };
    },
    jd,
    options,
  );
}
