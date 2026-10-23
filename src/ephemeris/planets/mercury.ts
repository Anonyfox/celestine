// VSOP87D Mercury; retained Meeus terms, audited against the official CDS series.
import type { EphemerisOptions, PlanetPosition } from '../types.js';
import { evaluateSeries, geocentricApparent, heliocentricVelocity } from './precision.js';

const L0: readonly (readonly [number, number, number])[] = [
  [440250710, 0, 0],
  [40989415, 1.4830203, 26087.9031416],
  [5046294, 4.477855, 52175.806283],
  [855347, 1.1652, 78263.70942],
  [165590, 4.11969, 104351.61257],
  [34562, 0.7793, 130439.5157],
  [7583, 3.713, 156527.419],
  [3560, 1.512, 1109.379],
  [1803, 4.103, 5661.332],
  [1726, 0.358, 182615.322],
  [1590, 2.995, 25028.521],
  [1365, 4.599, 27197.282],
  [1017, 0.88, 31749.235],
  [714, 1.54, 24978.53],
  [644, 5.3, 21535.95],
  [451, 6.05, 51116.42],
  [404, 3.28, 208703.23],
  [352, 5.24, 20426.57],
  [345, 2.79, 15874.62],
  [343, 5.76, 955.6],
  [339, 5.86, 25558.21],
  [325, 1.34, 53285.18],
  [273, 2.5, 529.69],
  [264, 3.92, 57837.14],
  [260, 0.99, 4551.95],
  [239, 0.11, 1059.38],
  [235, 0.27, 11322.66],
  [217, 0.66, 13521.75],
  [209, 2.09, 47623.85],
  [183, 2.63, 27043.5],
  [182, 2.43, 25661.31],
  [176, 4.54, 51066.43],
  [173, 2.45, 24498.83],
  [142, 3.36, 37410.57],
  [138, 0.29, 10213.29],
  [125, 3.72, 39609.65],
  [118, 2.78, 77204.33],
  [106, 4.21, 19804.83],
];

const L1: readonly (readonly [number, number, number])[] = [
  [2.60881470622e12, 0, 0],
  [1126008, 6.21704, 26087.903142],
  [303471, 3.05565, 52175.80628],
  [80538, 6.1045, 78263.7094],
  [21245, 2.8353, 104351.6126],
  [5592, 5.827, 130439.516],
  [1472, 2.518, 156527.419],
  [388, 5.48, 182615.32],
  [103, 2.15, 208703.23],
];

const L2: readonly (readonly [number, number, number])[] = [
  [53050, 0, 0],
  [16904, 4.6907, 26087.9031],
  [7397, 1.347, 52175.806],
  [3018, 4.456, 78263.709],
  [1107, 1.262, 104351.613],
  [378, 4.32, 130439.52],
  [123, 1.07, 156527.42],
  [39, 4.08, 182615.32],
];

const L3: readonly (readonly [number, number, number])[] = [
  [188, 0.04, 52175.81],
  [142, 3.12, 26087.9],
  [97, 3, 78263.71],
  [44, 6.02, 104351.61],
  [35, 0, 0],
];

const L4: readonly (readonly [number, number, number])[] = [
  [114, 3.14, 0],
  [3, 2.03, 26087.9],
  [2, 1.42, 78263.71],
  [2, 4.5, 52175.81],
];

const L5: readonly (readonly [number, number, number])[] = [[1, 3.14, 0]];

const B0: readonly (readonly [number, number, number])[] = [
  [11737529, 1.983575, 26087.9031416],
  [2388077, 5.03739, 52175.806283],
  [1222840, 3.141593, 0],
  [543252, 1.79644, 78263.70942],
  [129779, 4.83232, 104351.61257],
  [31867, 1.5809, 130439.5157],
  [7963, 4.61, 156527.419],
  [2014, 1.353, 182615.322],
  [514, 4.38, 208703.23],
  [209, 2.02, 24978.53],
  [208, 4.92, 27197.28],
  [132, 1.12, 234791.13],
];

const B1: readonly (readonly [number, number, number])[] = [
  [429151, 3.5017, 26087.90314],
  [146234, 3.14159, 0],
  [22675, 0.0152, 52175.8063],
  [10895, 0.4854, 78263.7094],
  [6353, 3.429, 104351.613],
  [2496, 0.161, 130439.516],
  [860, 3.19, 156527.42],
  [278, 6.21, 182615.32],
  [86, 2.95, 208703.23],
];

const B2: readonly (readonly [number, number, number])[] = [
  [11831, 4.7907, 26087.9031],
  [1914, 0, 0],
  [1045, 1.212, 52175.806],
  [266, 4.43, 78263.71],
  [170, 1.62, 104351.61],
  [96, 4.8, 130439.52],
  [45, 1.61, 156527.42],
  [18, 4.67, 182615.32],
];

const B3: readonly (readonly [number, number, number])[] = [
  [235, 0.35, 26087.9],
  [161, 0, 0],
  [19, 4.36, 52175.81],
  [6, 2.51, 78263.71],
];

const B4: readonly (readonly [number, number, number])[] = [
  [4, 1.75, 26087.9],
  [1, 3.14, 0],
];

const R0: readonly (readonly [number, number, number])[] = [
  [39528272, 0, 0],
  [7834132, 6.192337, 26087.903142],
  [795526, 2.9599, 52175.80628],
  [121282, 6.01064, 78263.70942],
  [21922, 2.7782, 104351.6126],
  [4354, 5.829, 130439.516],
  [918, 2.6, 156527.42],
  [290, 1.42, 25028.52],
  [260, 3.03, 27197.28],
  [202, 5.65, 182615.32],
  [202, 5.59, 31749.24],
  [142, 6.25, 24978.53],
  [100, 3.73, 21535.95],
];

const R1: readonly (readonly [number, number, number])[] = [
  [217348, 4.65617, 26087.90314],
  [44142, 1.4239, 52175.8063],
  [10094, 4.4747, 78263.7094],
  [1624, 0, 0],
  [2433, 1.242, 104351.613],
  [604, 4.29, 130439.52],
  [153, 1.06, 156527.42],
  [39, 4.11, 182615.32],
];

const R2: readonly (readonly [number, number, number])[] = [
  [3118, 3.082, 26087.903],
  [1245, 6.152, 52175.806],
  [425, 2.93, 78263.71],
  [136, 5.98, 104351.61],
  [42, 2.75, 130439.52],
  [22, 3.14, 0],
];

const R3: readonly (readonly [number, number, number])[] = [
  [33, 1.68, 26087.9],
  [24, 4.63, 52175.81],
  [12, 1.39, 78263.71],
];

export function mercuryHeliocentricLongitude(tau: number): number {
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

export function mercuryHeliocentricLatitude(tau: number): number {
  return (
    (evaluateSeries(B0, tau) +
      evaluateSeries(B1, tau) * tau ** 1 +
      evaluateSeries(B2, tau) * tau ** 2 +
      evaluateSeries(B3, tau) * tau ** 3 +
      evaluateSeries(B4, tau) * tau ** 4) /
    1e8
  );
}

export function mercuryHeliocentricDistance(tau: number): number {
  return (
    (evaluateSeries(R0, tau) +
      evaluateSeries(R1, tau) * tau ** 1 +
      evaluateSeries(R2, tau) * tau ** 2 +
      evaluateSeries(R3, tau) * tau ** 3) /
    1e8
  );
}

export function getMercuryPosition(jd: number, options: EphemerisOptions = {}): PlanetPosition {
  return geocentricApparent(mercuryHeliocentric, jd, options, 1);
}

function mercuryHeliocentric(jd: number) {
  const tau = (jd - 2451545) / 365250;
  return {
    longitude: mercuryHeliocentricLongitude(tau),
    latitude: mercuryHeliocentricLatitude(tau),
    distance: mercuryHeliocentricDistance(tau),
    velocity: heliocentricVelocity(L0, B0, R0, L1[0][0], tau),
  };
}

export const MERCURY_ORBITAL_ELEMENTS = {
  /** Semi-major axis in AU */
  semiMajorAxis: 0.38709927,
  /** Orbital eccentricity */
  eccentricity: 0.20563593,
  /** Orbital inclination in degrees */
  inclination: 7.00497902,
  /** Longitude of ascending node in degrees */
  ascendingNode: 48.33076593,
  /** Longitude of perihelion in degrees */
  perihelion: 77.45779628,
  /** Mean longitude at J2000.0 in degrees */
  meanLongitude: 252.2503235,
  /** Orbital period in days */
  orbitalPeriod: 87.9691,
  /** Synodic period in days (Mercury-Earth) */
  synodicPeriod: 115.88,
} as const;
