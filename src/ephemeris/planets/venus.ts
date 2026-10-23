// VSOP87D Venus: retain A * 0.201^order >= 20 (1e-8 rad; radius scaled by orbital AU); 1800–2200.
import type { EphemerisOptions, PlanetPosition } from '../types.js';
import { evaluateSeries, geocentricApparent, heliocentricVelocity } from './precision.js';

const L0: readonly (readonly [number, number, number])[] = [
  [317614667, 0, 0],
  [1353968, 5.593133, 10213.285546],
  [89892, 5.3065, 20426.5711],
  [5477, 4.416, 7860.419],
  [3456, 2.7, 11790.629],
  [2372, 2.994, 3930.21],
  [1317, 5.187, 26.298],
  [1664, 4.25, 1577.343],
  [1438, 4.157, 9683.595],
  [1201, 6.154, 30639.857],
  [761, 1.95, 529.69],
  [708, 1.06, 775.52],
  [585, 4, 191.45],
  [769, 0.82, 9437.76],
  [500, 4.12, 15720.84],
  [326, 4.59, 10404.73],
  [430, 3.59, 19367.19],
  [327, 5.68, 5507.55],
  [232, 3.16, 9153.9],
  [180, 4.65, 1109.38],
  [128, 4.23, 20.77],
  [155, 5.57, 19651.05],
  [128, 0.96, 5661.33],
  [106, 1.54, 801.82],
  [86, 0.36, 3154.69],
  [99, 0.83, 213.3],
  [99, 5.39, 13367.97],
  [82, 3.22, 18837.5],
  [88, 3.89, 9999.99],
  [72, 0.11, 11015.11],
  [56, 4.24, 7.11],
  [70, 0.68, 23581.26],
  [51, 0.24, 11322.66],
  [46, 5.32, 18073.71],
  [45, 6.06, 40853.14],
  [43, 5.33, 2352.87],
  [43, 1.8, 7084.9],
  [41, 0.36, 382.9],
  [36, 2.7, 10206.17],
  [34, 2.02, 6283.08],
  [29, 3.59, 22003.92],
  [28, 2.22, 1059.38],
  [30, 4.02, 10239.58],
  [33, 2.1, 27511.47],
  [30, 4.94, 13745.35],
  [29, 3.51, 283.86],
  [24, 2.7, 8624.21],
  [20, 3.79, 14143.5],
  [24, 4.28, 5.52],
  [26, 0.54, 17298.18],
  [20, 0.58, 38.03],
  [24, 4.83, 6872.67],
];

const L1: readonly (readonly [number, number, number])[] = [
  [1.02135294305e12, 0, 0],
  [95708, 2.4642, 10213.2856],
  [14445, 0.5162, 20426.5711],
  [213, 1.79, 30639.86],
  [152, 6.11, 1577.34],
  [174, 2.65, 26.3],
];

const L2: readonly (readonly [number, number, number])[] = [
  [54127, 0, 0],
  [3891, 0.345, 10213.285],
  [1338, 2.02, 20426.571],
];

const L3: readonly (readonly [number, number, number])[] = [];

const L4: readonly (readonly [number, number, number])[] = [];

const L5: readonly (readonly [number, number, number])[] = [];

const B0: readonly (readonly [number, number, number])[] = [
  [5923638, 0.267028, 10213.285546],
  [40108, 1.1474, 20426.5711],
  [32815, 3.1416, 0],
  [1011, 1.089, 30639.857],
  [149, 6.25, 18073.71],
  [138, 0.86, 1577.34],
  [130, 3.67, 9437.76],
  [120, 3.71, 2352.87],
  [108, 4.54, 22003.92],
  [92, 1.54, 9153.9],
  [53, 2.28, 5507.55],
  [46, 0.72, 10239.58],
  [39, 2.93, 10186.99],
  [43, 6.14, 11790.63],
  [42, 5.99, 19896.88],
  [40, 3.87, 8635.94],
  [39, 3.95, 529.69],
  [33, 4.83, 14143.5],
  [24, 2.91, 10988.81],
  [24, 2.01, 13367.97],
  [22, 2.7, 19651.05],
  [21, 0.99, 775.52],
];

const B1: readonly (readonly [number, number, number])[] = [
  [513348, 1.80364, 10213.28555],
  [4380, 3.386, 20426.571],
  [197, 2.53, 30639.86],
  [199, 0, 0],
];

const B2: readonly (readonly [number, number, number])[] = [[22378, 3.3851, 10213.2856]];

const B3: readonly (readonly [number, number, number])[] = [];

const B4: readonly (readonly [number, number, number])[] = [];

const R0: readonly (readonly [number, number, number])[] = [
  [72334821, 0, 0],
  [489824, 4.02152, 10213.28555],
  [1658, 4.902, 20426.571],
  [1632, 2.845, 7860.419],
  [1378, 1.129, 11790.629],
  [498, 2.59, 9683.59],
  [374, 1.42, 3930.21],
  [264, 5.53, 9437.76],
  [237, 2.55, 15720.84],
  [222, 2.01, 19367.19],
  [119, 3.02, 10404.73],
  [126, 2.73, 1577.34],
  [76, 1.6, 9153.9],
  [85, 3.99, 19651.05],
  [74, 4.12, 5507.55],
  [42, 1.64, 18837.5],
  [42, 3.82, 13367.97],
  [39, 5.39, 23581.26],
  [29, 5.68, 5661.33],
  [28, 5.72, 775.52],
  [27, 4.82, 11015.11],
  [31, 2.32, 9999.99],
  [20, 4.96, 11322.66],
  [20, 0.53, 27511.47],
  [16, 0.56, 529.69],
];

const R1: readonly (readonly [number, number, number])[] = [
  [34551, 0.892, 10213.2856],
  [234, 1.77, 20426.57],
  [234, 3.14, 0],
];

const R2: readonly (readonly [number, number, number])[] = [[1407, 5.064, 10213.285]];

const R3: readonly (readonly [number, number, number])[] = [];

export function venusHeliocentricLongitude(tau: number): number {
  return (
    (evaluateSeries(L0, tau) +
      evaluateSeries(L1, tau) * tau ** 1 +
      evaluateSeries(L2, tau) * tau ** 2 +
      evaluateSeries(L3, tau) * tau ** 3 +
      evaluateSeries(L4, tau) * tau ** 4 +
      evaluateSeries(L5, tau) * tau ** 5) /
    1e8
  );
}

export function venusHeliocentricLatitude(tau: number): number {
  return (
    (evaluateSeries(B0, tau) +
      evaluateSeries(B1, tau) * tau ** 1 +
      evaluateSeries(B2, tau) * tau ** 2 +
      evaluateSeries(B3, tau) * tau ** 3 +
      evaluateSeries(B4, tau) * tau ** 4 +
      evaluateSeries(B5, tau) * tau ** 5) /
    1e8
  );
}

export function venusHeliocentricDistance(tau: number): number {
  return (
    (evaluateSeries(R0, tau) +
      evaluateSeries(R1, tau) * tau ** 1 +
      evaluateSeries(R2, tau) * tau ** 2 +
      evaluateSeries(R3, tau) * tau ** 3 +
      evaluateSeries(R4, tau) * tau ** 4 +
      evaluateSeries(R5, tau) * tau ** 5) /
    1e8
  );
}

export function getVenusPosition(jd: number, options: EphemerisOptions = {}): PlanetPosition {
  return geocentricApparent(venusHeliocentric, jd, options, 1);
}

function venusHeliocentric(jd: number) {
  const tau = (jd - 2451545) / 365250;
  return {
    longitude: venusHeliocentricLongitude(tau),
    latitude: venusHeliocentricLatitude(tau),
    distance: venusHeliocentricDistance(tau),
    velocity: heliocentricVelocity(L0, B0, R0, L1[0][0], tau),
  };
}

export const VENUS_ORBITAL_ELEMENTS = {
  /** Semi-major axis in AU */
  semiMajorAxis: 0.72333566,
  /** Orbital eccentricity (lowest of all planets) */
  eccentricity: 0.00677672,
  /** Orbital inclination in degrees */
  inclination: 3.39467605,
  /** Longitude of ascending node in degrees */
  ascendingNode: 76.67984255,
  /** Longitude of perihelion in degrees */
  perihelion: 131.60246718,
  /** Mean longitude at J2000.0 in degrees */
  meanLongitude: 181.9790995,
  /** Orbital period in days */
  orbitalPeriod: 224.701,
  /** Synodic period in days (Venus-Earth) */
  synodicPeriod: 583.92,
  /** Maximum elongation from Sun in degrees */
  maxElongation: 47.8,
} as const;

const B5: readonly (readonly [number, number, number])[] = [];

const R4: readonly (readonly [number, number, number])[] = [];

const R5: readonly (readonly [number, number, number])[] = [];
