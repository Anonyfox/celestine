/**
 * Pluto Position Calculator
 *
 * Calculates the apparent geocentric position of Pluto.
 *
 * @module ephemeris/planets/pluto
 *
 * @remarks
 * Pluto is a dwarf planet (reclassified in 2006) but remains essential in astrology.
 * It has a highly eccentric orbit (e = 0.2488) and high inclination (17.16°).
 * At perihelion, Pluto is closer to the Sun than Neptune!
 * Orbital period is ~248 years; it spends 12-32 years in each zodiac sign (varies due to eccentricity).
 *
 * This uses Meeus's algorithm from Chapter 37, which provides accuracy of ±1 arcminute
 * for the period 1885-2099.
 *
 * @see Meeus, "Astronomical Algorithms", 2nd Ed., Chapter 37
 */

import { DAYS_PER_JULIAN_CENTURY, DEG_TO_RAD, J2000_EPOCH, RAD_TO_DEG } from '../constants.js';
import type { EphemerisOptions, PlanetPosition } from '../types.js';

// =============================================================================
// PLUTO ARGUMENT COEFFICIENTS (Meeus Chapter 37)
// =============================================================================

/**
 * Coefficients for Pluto's heliocentric longitude, latitude, and radius.
 * Each row: [J, S, P, lonSin, lonCos, latSin, latCos, radSin, radCos]
 * @source Meeus, "Astronomical Algorithms", Table 37.a
 */
const PLUTO_ARGS: readonly (readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
])[] = [
  [0, 0, 1, -19799805, 19850055, -5452852, -14974862, 66865439, 68951812],
  [0, 0, 2, 897144, -4954829, 3527812, 1672790, -11827535, -332538],
  [0, 0, 3, 611149, 1211027, -1050748, 327647, 1593179, -1438890],
  [0, 0, 4, -341243, -189585, 178690, -292153, -18444, 483220],
  [0, 0, 5, 129287, -34992, 18650, 100340, -65977, -85431],
  [0, 0, 6, -38164, 30893, -30697, -25823, 31174, -6032],
  [0, 1, -1, 20442, -9987, 4878, 11248, -5794, 22161],
  [0, 1, 0, -4063, -5071, 226, -64, 4601, 4032],
  [0, 1, 1, -6016, -3336, 2030, -836, -1729, 234],
  [0, 1, 2, -3956, 3039, 69, -604, -415, 702],
  [0, 1, 3, -667, 3572, -247, -567, 239, 723],
  [0, 2, -2, 1276, 501, -57, 1, 67, -67],
  [0, 2, -1, 1152, -917, -122, 175, 1034, -451],
  [0, 2, 0, 630, -1277, -49, -164, -129, 504],
  [1, -1, 0, 2571, -459, -197, 199, 480, -231],
  [1, -1, 1, 899, -1449, -25, 217, 2, -441],
  [1, 0, -3, -1016, 1043, 589, -248, -3359, 265],
  [1, 0, -2, -2343, -1012, -269, 711, 7856, -7832],
  [1, 0, -1, 7042, 788, 185, 193, 36, 45763],
  [1, 0, 0, 1199, -338, 315, 807, 8663, 8547],
  [1, 0, 1, 418, -67, -130, -43, -809, -769],
  [1, 0, 2, 120, -274, 5, 3, 263, -144],
  [1, 0, 3, -60, -159, 2, 17, -126, 32],
  [1, 0, 4, -82, -29, 2, 5, -35, -16],
  [1, 1, -3, -36, -29, 2, 3, -19, -4],
  [1, 1, -2, -40, 7, 3, 1, -15, 8],
  [1, 1, -1, -14, 22, 2, -1, -4, 12],
  [1, 1, 0, 4, 13, 1, -1, 5, 6],
  [1, 1, 1, 5, 2, 0, -1, 3, 1],
  [1, 1, 3, -1, 0, 0, 0, 6, -2],
  [2, 0, -6, 2, 0, 0, -2, 2, 2],
  [2, 0, -5, -4, 5, 2, 2, -2, -2],
  [2, 0, -4, 4, -7, -7, 0, 14, 13],
  [2, 0, -3, 14, 24, 10, -8, -63, 13],
  [2, 0, -2, -49, -34, -3, 20, 136, -236],
  [2, 0, -1, 163, -48, 6, 5, 273, 1065],
  [2, 0, 0, 9, -24, 14, 17, 251, 149],
  [2, 0, 1, -4, 1, -2, 0, -25, -9],
  [2, 0, 2, -3, 1, 0, 0, 9, -2],
  [2, 0, 3, 1, 3, 0, 0, -8, 7],
  [3, 0, -2, -3, -1, 0, 1, 2, -10],
  [3, 0, -1, 5, -3, 0, 0, 19, 35],
  [3, 0, 0, 0, 0, 1, 0, 10, 3],
];

/**
 * Calculate heliocentric coordinates of Pluto.
 * @param jd - Julian Date
 * @returns Object with longitude (rad), latitude (rad), and radius (AU)
 */
function plutoHeliocentric(jd: number): { L: number; B: number; R: number } {
  const T = (jd - J2000_EPOCH) / DAYS_PER_JULIAN_CENTURY;

  // Mean longitudes and arguments (degrees)
  const J = 34.35 + 3034.9057 * T; // Jupiter
  const S = 50.08 + 1222.1138 * T; // Saturn
  const P = 238.96 + 144.96 * T; // Pluto

  // Convert to radians
  const Jrad = J * DEG_TO_RAD;
  const Srad = S * DEG_TO_RAD;
  const Prad = P * DEG_TO_RAD;

  // Calculate sums
  let lonSum = 0;
  let latSum = 0;
  let radSum = 0;

  for (const [iJ, iS, iP, lonSin, lonCos, latSin, latCos, radSin, radCos] of PLUTO_ARGS) {
    const arg = iJ * Jrad + iS * Srad + iP * Prad;
    const sinArg = Math.sin(arg);
    const cosArg = Math.cos(arg);

    lonSum += lonSin * sinArg + lonCos * cosArg;
    latSum += latSin * sinArg + latCos * cosArg;
    radSum += radSin * sinArg + radCos * cosArg;
  }

  // Convert from 10^-6 degrees/AU to degrees/AU
  const L = (238.958116 + 144.96 * T + lonSum / 1e6) * DEG_TO_RAD;
  const B = (-3.908239 + latSum / 1e6) * DEG_TO_RAD;
  const R = 40.7241346 + radSum / 1e7;

  return { L, B, R };
}

/**
 * Calculate apparent geocentric position of Pluto.
 *
 * @param jd - Julian Date
 * @param options - Calculation options
 * @returns Pluto's apparent geocentric position
 *
 * @example
 * ```ts
 * import { getPlutoPosition } from 'celestine';
 *
 * const jd = 2451545.0; // J2000.0
 * const pluto = getPlutoPosition(jd);
 * console.log(pluto.longitude); // ~251.5° (Sagittarius)
 * ```
 */
export function getPlutoPosition(jd: number, options: EphemerisOptions = {}): PlanetPosition {
  const { includeSpeed = true } = options;

  // Get Pluto's heliocentric coordinates
  const pluto = plutoHeliocentric(jd);

  // Get Earth's heliocentric coordinates
  const tau = (jd - J2000_EPOCH) / 365250; // Julian millennia
  const earthL = earthHeliocentricLongitude(tau);
  const earthR = earthHeliocentricDistance(tau);

  // Convert to rectangular coordinates
  // Pluto
  const plutoX = pluto.R * Math.cos(pluto.B) * Math.cos(pluto.L);
  const plutoY = pluto.R * Math.cos(pluto.B) * Math.sin(pluto.L);
  const plutoZ = pluto.R * Math.sin(pluto.B);

  // Earth (B ≈ 0)
  const earthX = earthR * Math.cos(earthL);
  const earthY = earthR * Math.sin(earthL);

  // Geocentric coordinates
  const geoX = plutoX - earthX;
  const geoY = plutoY - earthY;
  const geoZ = plutoZ;

  // Convert to geocentric ecliptic
  let geoLon = Math.atan2(geoY, geoX) * RAD_TO_DEG;
  const geoLat = Math.atan2(geoZ, Math.sqrt(geoX * geoX + geoY * geoY)) * RAD_TO_DEG;
  const geoDist = Math.sqrt(geoX * geoX + geoY * geoY + geoZ * geoZ);

  // Normalize longitude to [0, 360)
  while (geoLon < 0) geoLon += 360;
  while (geoLon >= 360) geoLon -= 360;

  // Apply aberration correction
  const aberration = -0.005694;
  geoLon += aberration;

  // Normalize again
  while (geoLon < 0) geoLon += 360;
  while (geoLon >= 360) geoLon -= 360;

  // Calculate speed if requested
  let longitudeSpeed = 0;
  let latitudeSpeed = 0;
  let isRetrograde = false;

  if (includeSpeed) {
    const dt = 0.01;
    const pos1 = getPlutoPosition(jd - dt, { includeSpeed: false });
    const pos2 = getPlutoPosition(jd + dt, { includeSpeed: false });

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

/**
 * Get Pluto's heliocentric longitude in degrees.
 * @param jd - Julian Date
 * @returns Heliocentric longitude in degrees
 */
export function plutoHeliocentricLongitude(jd: number): number {
  const { L } = plutoHeliocentric(jd);
  let lon = L * RAD_TO_DEG;
  while (lon < 0) lon += 360;
  while (lon >= 360) lon -= 360;
  return lon;
}

/**
 * Get Pluto's heliocentric latitude in degrees.
 * @param jd - Julian Date
 * @returns Heliocentric latitude in degrees
 */
export function plutoHeliocentricLatitude(jd: number): number {
  const { B } = plutoHeliocentric(jd);
  return B * RAD_TO_DEG;
}

/**
 * Get Pluto's heliocentric distance in AU.
 * @param jd - Julian Date
 * @returns Heliocentric distance in AU
 */
export function plutoHeliocentricDistance(jd: number): number {
  const { R } = plutoHeliocentric(jd);
  return R;
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
 * Pluto's mean orbital elements (for reference).
 */
export const PLUTO_ORBITAL_ELEMENTS = {
  /** Semi-major axis in AU */
  semiMajorAxis: 39.48,
  /** Orbital eccentricity (highly eccentric!) */
  eccentricity: 0.2488,
  /** Orbital inclination in degrees (highly inclined!) */
  inclination: 17.16,
  /** Orbital period in days */
  orbitalPeriod: 90560,
  /** Orbital period in years */
  orbitalPeriodYears: 248,
  /** Synodic period in days (time between oppositions) */
  synodicPeriod: 366.73,
  /** Perihelion distance in AU (inside Neptune's orbit!) */
  perihelion: 29.66,
  /** Aphelion distance in AU */
  aphelion: 49.31,
} as const;
