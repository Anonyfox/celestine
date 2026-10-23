// VSOP87D Neptune: retain A * 0.201^order >= 60 (1e-8 rad; radius scaled by orbital AU); 1800–2200.
import type { EphemerisOptions, PlanetPosition } from '../types.js';
import { evaluateSeries, geocentricApparent, heliocentricVelocity } from './precision.js';

const L0: readonly (readonly [number, number, number])[] = [
  [531188633, 0, 0],
  [1798476, 2.901013, 38.133036],
  [1019728, 0.485809, 1.484473],
  [124532, 4.83008, 36.64856],
  [42064, 5.4105, 2.9689],
  [37715, 6.0922, 35.1641],
  [33785, 1.2449, 76.2661],
  [16483, 0.0001, 491.5579],
  [9199, 4.938, 39.617],
  [8994, 0.275, 175.166],
  [4216, 1.987, 73.297],
  [3365, 1.036, 33.68],
  [2285, 4.206, 4.453],
  [1434, 2.783, 74.782],
  [900, 2.08, 109.95],
  [745, 3.19, 71.81],
  [506, 5.75, 114.4],
  [400, 0.35, 1021.25],
  [345, 3.46, 41.1],
  [306, 0.5, 0.52],
  [287, 4.5, 0.05],
  [323, 2.25, 32.2],
  [340, 3.3, 77.75],
  [267, 4.89, 0.96],
  [227, 1.8, 453.43],
  [245, 1.25, 9.56],
  [233, 2.5, 137.03],
  [282, 2.25, 146.59],
  [252, 5.78, 388.46],
  [150, 3, 5.94],
  [170, 3.32, 108.46],
  [151, 2.19, 33.94],
  [148, 0.86, 111.43],
  [119, 3.68, 2.45],
  [102, 5.71, 0.11],
  [98, 2.81, 8.08],
  [103, 4.4, 70.33],
  [103, 0.04, 0.26],
  [109, 2.42, 183.24],
  [74, 1.33, 529.69],
  [78, 4.16, 4.19],
  [86, 4.23, 490.07],
  [82, 5.2, 493.04],
  [72, 5.29, 350.33],
  [64, 3.54, 168.05],
  [63, 0.15, 182.28],
];

const L1: readonly (readonly [number, number, number])[] = [
  [3837687717, 0, 0],
  [16604, 4.8632, 1.4845],
  [15807, 2.2792, 38.133],
  [3335, 3.682, 76.266],
  [1306, 3.673, 2.969],
  [605, 1.5, 35.16],
];

const L2: readonly (readonly [number, number, number])[] = [[53893, 0, 0]];

const L3: readonly (readonly [number, number, number])[] = [];

const L4: readonly (readonly [number, number, number])[] = [];

const B0: readonly (readonly [number, number, number])[] = [
  [3088623, 1.441044, 38.133036],
  [27780, 5.9127, 76.2661],
  [27624, 0, 0],
  [15355, 2.5212, 36.6486],
  [15448, 3.5088, 39.6175],
  [2000, 1.51, 74.782],
  [1968, 4.378, 1.484],
  [1015, 3.216, 35.164],
  [606, 2.8, 73.3],
  [595, 2.13, 41.1],
  [589, 3.19, 2.97],
  [402, 4.17, 114.4],
  [254, 3.27, 453.43],
  [262, 3.77, 213.3],
  [280, 1.68, 77.75],
  [206, 4.26, 529.69],
  [140, 3.53, 137.03],
  [99, 4.17, 33.68],
  [68, 4.67, 71.81],
];

const B1: readonly (readonly [number, number, number])[] = [
  [227279, 3.80793, 38.13304],
  [1803, 1.976, 76.266],
  [1386, 4.826, 36.649],
  [1433, 3.142, 0],
  [1073, 6.08, 39.617],
];

const B2: readonly (readonly [number, number, number])[] = [[9691, 5.571, 38.133]];

const B3: readonly (readonly [number, number, number])[] = [];

const B4: readonly (readonly [number, number, number])[] = [];

const R0: readonly (readonly [number, number, number])[] = [
  [3007013206, 0, 0],
  [27062259, 1.3299946, 38.1330356],
  [1691764, 3.251861, 36.648563],
  [807831, 5.18593, 1.48447],
  [537761, 4.52114, 35.16409],
  [495726, 1.57106, 491.55793],
  [274572, 1.84552, 175.16606],
  [135134, 3.37221, 39.61751],
  [121802, 5.79754, 76.26607],
  [100895, 0.37703, 73.29713],
  [69792, 3.7962, 2.9689],
  [46688, 5.7494, 33.6796],
  [24594, 0.508, 109.9457],
  [16939, 1.5942, 71.8127],
  [14230, 1.0779, 74.7816],
  [12012, 1.9206, 1021.2489],
  [8395, 0.678, 146.594],
  [7572, 1.071, 388.465],
  [5721, 2.591, 4.453],
  [4840, 1.907, 41.102],
  [4483, 2.906, 529.691],
  [4270, 3.413, 453.425],
  [4354, 0.68, 32.195],
  [4421, 1.75, 108.461],
  [2881, 1.986, 137.033],
  [2636, 3.098, 213.299],
  [3381, 0.848, 183.243],
  [2879, 3.674, 350.332],
  [2306, 2.81, 70.328],
  [2530, 5.798, 490.074],
  [2523, 0.486, 493.042],
  [2087, 0.619, 33.94],
  [1977, 5.117, 168.053],
  [1905, 1.722, 182.28],
];

const R1: readonly (readonly [number, number, number])[] = [
  [236338, 0.70498, 38.13304],
  [13220, 3.3201, 1.4845],
];

const R2: readonly (readonly [number, number, number])[] = [];

const R3: readonly (readonly [number, number, number])[] = [];

export function neptuneHeliocentricLongitude(tau: number): number {
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

export function neptuneHeliocentricLatitude(tau: number): number {
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

export function neptuneHeliocentricDistance(tau: number): number {
  return (
    (evaluateSeries(R0, tau) +
      evaluateSeries(R1, tau) * tau ** 1 +
      evaluateSeries(R2, tau) * tau ** 2 +
      evaluateSeries(R3, tau) * tau ** 3 +
      evaluateSeries(R4, tau) * tau ** 4) /
    1e8
  );
}

export function getNeptunePosition(jd: number, options: EphemerisOptions = {}): PlanetPosition {
  return geocentricApparent(neptuneHeliocentric, jd, options, 0.01);
}

function neptuneHeliocentric(jd: number) {
  const tau = (jd - 2451545) / 365250;
  return {
    longitude: neptuneHeliocentricLongitude(tau),
    latitude: neptuneHeliocentricLatitude(tau),
    distance: neptuneHeliocentricDistance(tau),
    velocity: heliocentricVelocity(L0, B0, R0, L1[0][0], tau),
  };
}

export const NEPTUNE_ORBITAL_ELEMENTS = {
  /** Semi-major axis in AU */
  semiMajorAxis: 30.07,
  /** Orbital eccentricity (nearly circular - lowest of all planets!) */
  eccentricity: 0.0086,
  /** Orbital inclination in degrees */
  inclination: 1.77,
  /** Orbital period in days */
  orbitalPeriod: 60190,
  /** Orbital period in years */
  orbitalPeriodYears: 164.8,
  /** Synodic period in days (time between oppositions) */
  synodicPeriod: 367.49,
} as const;

const L5: readonly (readonly [number, number, number])[] = [];

const B5: readonly (readonly [number, number, number])[] = [];

const R4: readonly (readonly [number, number, number])[] = [];
