/**
 * Saturn Position Calculator
 *
 * Calculates the apparent geocentric position of Saturn.
 *
 * @module ephemeris/planets/saturn
 *
 * @remarks
 * Saturn is the second largest planet with an orbital period of ~29.46 years.
 * It spends about 2.5 years in each zodiac sign.
 * Saturn's opposition occurs every ~378 days.
 * Saturn is famous for its ring system, which affects its apparent brightness.
 *
 * Algorithm accuracy: ±1 arcminute for longitude.
 *
 * @see Meeus, "Astronomical Algorithms", 2nd Ed., Chapter 33
 */

import { DAYS_PER_JULIAN_MILLENNIUM, J2000_EPOCH, RAD_TO_DEG } from '../constants.js';
import type { EphemerisOptions, PlanetPosition } from '../types.js';

// =============================================================================
// VSOP87 SERIES FOR SATURN
// =============================================================================

/**
 * VSOP87 series terms for Saturn's heliocentric longitude (L).
 * @source Meeus, "Astronomical Algorithms", Table 33.a (Saturn L0-L5)
 */

// L0 terms
const L0: readonly (readonly [number, number, number])[] = [
  [87401354, 0, 0],
  [11107660, 3.9620509, 213.29909544],
  [1414151, 4.5858152, 7.113547],
  [398379, 0.52112, 206.185548],
  [350769, 3.303299, 426.598191],
  [206816, 0.246584, 103.092774],
  [79271, 3.84007, 220.41264],
  [23990, 4.66977, 110.20632],
  [16574, 0.43719, 419.48464],
  [15820, 0.93809, 632.78374],
  [15054, 2.7167, 639.89729],
  [14907, 5.76903, 316.39187],
  [14610, 1.56519, 3.93215],
  [13160, 4.44891, 14.22709],
  [13005, 5.98119, 11.0457],
  [10725, 3.1294, 202.2534],
  [6126, 1.7633, 277.035],
  [5863, 0.2366, 529.691],
  [5228, 4.2078, 3.1814],
  [5020, 3.1779, 433.7117],
  [4593, 0.6198, 199.072],
  [4006, 2.2448, 63.7359],
  [3874, 3.2228, 138.5175],
  [3269, 0.7749, 949.1756],
  [2954, 0.9828, 95.9792],
  [2461, 2.0316, 735.8765],
  [1758, 3.2658, 522.5774],
  [1640, 5.505, 846.0828],
  [1581, 4.3727, 309.2783],
  [1391, 4.0233, 323.5054],
  [1124, 2.8373, 415.5525],
  [1087, 4.1834, 2.4477],
  [1017, 3.717, 227.5262],
  [957, 0.507, 1265.567],
  [853, 3.421, 175.166],
  [849, 3.191, 209.367],
  [789, 5.007, 0.963],
  [749, 2.144, 853.196],
  [744, 5.253, 224.345],
  [687, 1.747, 1052.268],
  [654, 1.599, 0.048],
  [634, 2.299, 412.371],
  [625, 0.97, 210.118],
  [580, 3.093, 74.782],
  [546, 2.127, 350.332],
  [543, 1.518, 9.561],
  [530, 4.449, 117.32],
  [478, 2.965, 137.033],
  [474, 5.475, 742.99],
  [452, 1.044, 490.334],
  [449, 1.29, 127.472],
  [372, 2.278, 217.231],
  [355, 3.013, 838.969],
  [347, 1.539, 340.771],
  [343, 0.246, 0.521],
  [330, 0.247, 1581.959],
  [322, 0.961, 203.738],
];

// L1 terms
const L1: readonly (readonly [number, number, number])[] = [
  [21354295596, 0, 0],
  [1296855, 1.8282054, 213.2990954],
  [564348, 2.885001, 7.113547],
  [107679, 2.277699, 206.185548],
  [98323, 1.0807, 426.59819],
  [40255, 2.04128, 220.41264],
  [31394, 2.58538, 14.22709],
  [24857, 1.51952, 103.09277],
  [18328, 6.02959, 639.89729],
  [16829, 4.67481, 419.48464],
  [12598, 6.26637, 110.20632],
  [11826, 1.82503, 11.0457],
  [11681, 5.93299, 433.71174],
  [8871, 2.1785, 316.3919],
  [8837, 3.3036, 632.7837],
  [5765, 1.9609, 529.691],
  [5348, 4.4397, 3.9322],
  [5015, 5.4308, 199.072],
  [4552, 5.7559, 3.1814],
  [3784, 3.6657, 227.5262],
  [3415, 6.0535, 202.2534],
  [3228, 5.2396, 95.9792],
  [3039, 2.5929, 323.5054],
  [2917, 6.0681, 522.5774],
  [2765, 0.9804, 735.8765],
  [2759, 0.8249, 309.2783],
  [2610, 2.9258, 846.0828],
  [2474, 3.4564, 949.1756],
  [1883, 0.0649, 138.5175],
  [1838, 2.1895, 1265.5675],
  [1766, 3.4562, 63.7359],
  [1749, 4.7565, 277.035],
  [1508, 5.8041, 1052.2684],
  [1440, 0.7976, 853.1964],
  [1306, 4.1825, 412.3711],
  [1247, 5.4133, 224.3448],
  [1207, 5.0702, 515.4639],
  [1165, 5.2102, 117.3199],
  [1140, 4.5182, 490.3341],
  [1129, 2.3982, 127.4718],
  [1096, 1.0267, 210.1177],
  [1078, 2.3099, 1581.9593],
  [1004, 3.0276, 1155.3612],
  [965, 5.629, 209.367],
  [934, 2.606, 742.99],
  [905, 0.02, 9.561],
  [904, 1.148, 175.166],
  [835, 3.974, 1059.382],
  [763, 4.999, 1045.155],
  [727, 4.068, 1368.66],
  [686, 1.565, 74.782],
  [621, 1.371, 137.033],
  [589, 4.194, 2.448],
  [576, 4.533, 216.48],
  [554, 0.831, 217.231],
  [530, 2.111, 191.208],
];

// L2 terms
const L2: readonly (readonly [number, number, number])[] = [
  [116441, 1.179879, 7.113547],
  [91921, 0.07425, 213.2991],
  [90592, 0, 0],
  [15277, 4.06492, 206.18555],
  [10631, 0.25778, 220.41264],
  [10605, 5.40964, 426.59819],
  [4265, 1.046, 14.2271],
  [1216, 2.9186, 103.0928],
  [1165, 4.6094, 639.8973],
  [1082, 5.6913, 433.7117],
  [1045, 4.0421, 199.072],
  [1020, 0.6337, 3.1814],
  [1017, 4.189, 419.4846],
  [956, 5.243, 227.526],
  [825, 4.033, 110.206],
  [806, 3.312, 316.392],
  [741, 0.765, 632.784],
  [677, 5.728, 529.691],
  [567, 4.665, 11.046],
  [485, 2.469, 949.176],
  [469, 4.71, 522.577],
  [445, 0.403, 323.505],
  [416, 5.368, 728.763],
  [402, 4.605, 309.278],
  [347, 4.681, 846.083],
  [338, 3.168, 95.979],
  [261, 5.343, 735.877],
  [247, 3.923, 942.062],
  [220, 4.842, 1265.567],
  [203, 5.6, 1052.268],
  [200, 4.439, 1045.155],
];

// L3 terms
const L3: readonly (readonly [number, number, number])[] = [
  [16039, 5.73945, 7.11355],
  [4250, 4.5854, 213.2991],
  [1907, 4.7608, 220.4126],
  [1466, 5.9133, 206.1855],
  [1162, 5.6197, 14.2271],
  [1067, 3.6082, 426.5982],
  [239, 3.861, 433.712],
  [237, 5.768, 199.072],
  [166, 5.116, 3.181],
  [151, 2.736, 639.897],
  [131, 4.743, 227.526],
  [63, 0.23, 419.48],
  [62, 4.74, 103.09],
  [40, 5.47, 316.39],
  [40, 5.96, 949.18],
  [39, 5.83, 110.21],
  [28, 3.01, 95.98],
  [25, 0.99, 632.78],
  [22, 2.38, 522.58],
];

// L4 terms
const L4: readonly (readonly [number, number, number])[] = [
  [1662, 3.9983, 7.1135],
  [257, 2.984, 220.413],
  [236, 3.902, 14.227],
  [149, 2.741, 213.299],
  [114, 3.142, 0],
  [110, 1.515, 206.186],
  [68, 1.72, 426.6],
  [40, 2.05, 433.71],
  [38, 1.24, 199.07],
  [31, 3.01, 227.53],
  [15, 0.83, 639.9],
  [9, 3.71, 316.39],
  [6, 2.42, 419.48],
];

// L5 terms
const L5: readonly (readonly [number, number, number])[] = [
  [124, 2.259, 7.114],
  [34, 2.16, 14.23],
  [28, 1.2, 220.41],
  [6, 1.22, 227.53],
  [5, 0.24, 433.71],
  [4, 6.23, 426.6],
  [3, 2.97, 199.07],
];

/**
 * VSOP87 series terms for Saturn's heliocentric latitude (B).
 * @source Meeus, "Astronomical Algorithms", Table 33.b (Saturn B0-B5)
 */

// B0 terms
const B0: readonly (readonly [number, number, number])[] = [
  [4330678, 3.6028443, 213.2990954],
  [240348, 2.852385, 426.598191],
  [84746, 0, 0],
  [34116, 0.57297, 206.18555],
  [30863, 3.48442, 220.41264],
  [14734, 2.11847, 639.89729],
  [9917, 5.79, 419.4846],
  [6994, 4.736, 7.1135],
  [4808, 5.4331, 316.3919],
  [4788, 4.9651, 110.2063],
  [3432, 2.7326, 433.7117],
  [1506, 6.013, 103.0928],
  [1060, 5.631, 529.691],
  [969, 5.204, 632.784],
  [942, 1.396, 853.196],
  [708, 3.803, 323.505],
  [552, 5.131, 202.253],
  [400, 3.359, 227.526],
  [319, 3.626, 209.367],
  [316, 1.997, 647.011],
  [314, 0.465, 217.231],
  [284, 4.886, 224.345],
  [236, 2.139, 11.046],
  [215, 5.95, 846.083],
  [209, 2.12, 415.552],
  [207, 0.73, 199.072],
  [179, 2.954, 63.736],
  [141, 0.644, 490.334],
  [139, 4.595, 14.227],
  [139, 1.998, 735.877],
  [135, 5.245, 742.99],
  [122, 3.115, 522.577],
  [116, 3.109, 216.48],
];

// B1 terms
const B1: readonly (readonly [number, number, number])[] = [
  [397555, 5.3329, 213.299095],
  [49479, 3.14159, 0],
  [18572, 6.09919, 426.59819],
  [14801, 2.30586, 206.18555],
  [9644, 1.6967, 220.4126],
  [3757, 1.2543, 419.4846],
  [2717, 5.9117, 639.8973],
  [1455, 0.8516, 433.7117],
  [1291, 2.9177, 7.1135],
  [853, 0.436, 316.392],
  [298, 0.919, 632.784],
  [292, 5.316, 853.196],
  [284, 1.619, 227.526],
  [275, 3.889, 103.093],
  [172, 0.052, 647.011],
  [166, 2.444, 199.072],
  [158, 5.209, 110.206],
  [128, 1.207, 529.691],
  [110, 2.457, 217.231],
  [82, 2.76, 210.12],
  [81, 2.86, 14.23],
  [69, 1.66, 202.25],
  [65, 1.26, 216.48],
  [61, 1.25, 209.37],
  [59, 1.82, 323.51],
  [46, 0.82, 440.83],
  [36, 1.82, 224.34],
];

// B2 terms
const B2: readonly (readonly [number, number, number])[] = [
  [20630, 0.50482, 213.2991],
  [3720, 3.9983, 206.1855],
  [1627, 6.1819, 220.4126],
  [1346, 0, 0],
  [706, 3.039, 419.485],
  [365, 5.099, 426.598],
  [330, 5.279, 433.712],
  [219, 3.828, 639.897],
  [139, 1.043, 7.114],
  [104, 6.157, 227.526],
  [93, 1.98, 316.39],
  [71, 4.15, 199.07],
  [52, 2.88, 632.78],
  [49, 4.43, 647.01],
  [41, 3.16, 853.2],
  [29, 4.53, 210.12],
  [24, 1.12, 14.23],
];

// B3 terms
const B3: readonly (readonly [number, number, number])[] = [
  [666, 1.99, 213.299],
  [632, 5.698, 206.186],
  [398, 0, 0],
  [188, 4.338, 220.413],
  [92, 4.84, 419.48],
  [52, 3.42, 433.71],
  [42, 2.38, 426.6],
  [26, 4.4, 227.53],
  [21, 5.85, 639.9],
  [18, 1.99, 7.11],
  [11, 5.37, 199.07],
  [10, 2.55, 647.01],
];

// B4 terms
const B4: readonly (readonly [number, number, number])[] = [
  [80, 1.12, 206.19],
  [32, 3.12, 213.3],
  [17, 2.48, 220.41],
  [12, 3.14, 0],
  [9, 0.38, 419.48],
  [6, 1.56, 433.71],
  [5, 2.63, 227.53],
];

// B5 terms
const B5: readonly (readonly [number, number, number])[] = [
  [8, 2.82, 206.19],
  [1, 0.51, 220.41],
];

/**
 * VSOP87 series terms for Saturn's heliocentric radius (R).
 * @source Meeus, "Astronomical Algorithms", Table 33.c (Saturn R0-R5)
 */

// R0 terms
const R0: readonly (readonly [number, number, number])[] = [
  [955758136, 0, 0],
  [52921382, 2.3922622, 213.29909544],
  [1873680, 5.2354961, 206.1855484],
  [1464664, 1.6476305, 426.5981909],
  [821891, 5.9352, 316.39187],
  [547507, 5.015326, 103.092774],
  [371684, 2.271148, 220.412642],
  [361778, 3.139043, 7.113547],
  [140618, 5.704067, 632.783739],
  [108975, 3.293136, 110.206321],
  [69007, 5.941, 419.48464],
  [61053, 0.94038, 639.89729],
  [48913, 1.55733, 202.2534],
  [34144, 0.19519, 277.03499],
  [32402, 5.47085, 949.17561],
  [20937, 0.46349, 735.87651],
  [20839, 1.52103, 433.71174],
  [20747, 5.33256, 199.072],
  [15298, 3.05944, 529.69097],
  [14296, 2.60434, 323.50542],
  [12884, 1.64892, 138.5175],
  [11993, 5.98051, 846.08283],
  [11380, 1.73106, 522.57742],
  [9796, 5.2048, 1265.5675],
  [7753, 5.8519, 95.9792],
  [6771, 3.0043, 14.2271],
  [6466, 0.1773, 1052.2684],
  [5850, 1.4552, 415.5525],
  [5307, 0.5974, 63.7359],
  [4696, 2.1492, 227.5262],
  [4044, 1.6401, 209.3669],
  [3688, 0.7802, 412.3711],
  [3461, 1.8509, 175.1661],
  [3420, 4.9455, 1581.9593],
  [3401, 0.5539, 350.3321],
  [3376, 3.6953, 224.3448],
  [2976, 5.6847, 210.1177],
  [2885, 1.3876, 838.9693],
  [2881, 0.1796, 853.1964],
  [2508, 3.5385, 742.9901],
  [2448, 6.1841, 1368.6603],
  [2406, 2.9656, 117.3199],
  [2174, 0.0151, 340.7709],
  [2024, 5.0541, 11.0457],
];

// R1 terms
const R1: readonly (readonly [number, number, number])[] = [
  [6182981, 0.2584352, 213.2990954],
  [506578, 0.711147, 206.185548],
  [341394, 5.796358, 426.598191],
  [188491, 0.472157, 220.412642],
  [186262, 3.141593, 0],
  [143891, 1.407449, 7.113547],
  [49621, 6.01744, 103.09277],
  [38717, 1.66041, 639.89729],
  [35324, 1.77031, 419.48464],
  [31992, 1.11926, 110.20632],
  [29994, 0.04163, 199.072],
  [23871, 4.75474, 316.39187],
  [17756, 0.96688, 632.78374],
  [14564, 1.03497, 949.17561],
  [13699, 3.67685, 433.71174],
  [12945, 5.1232, 529.69097],
  [11183, 2.47615, 14.22709],
  [9661, 3.8194, 323.5054],
  [9352, 5.6165, 202.2534],
  [8410, 4.4683, 522.5774],
  [7550, 1.0201, 735.8765],
  [6241, 2.1327, 412.3711],
  [6137, 5.0064, 846.0828],
  [5764, 1.0397, 1265.5675],
  [4848, 0.2673, 95.9792],
  [4559, 4.1723, 1052.2684],
  [4505, 5.8092, 227.5262],
  [4261, 5.0461, 515.4639],
  [4057, 2.4831, 63.7359],
  [3784, 3.7086, 1066.4955],
  [3717, 5.0806, 1581.9593],
  [3605, 2.8266, 210.1177],
  [3550, 3.6285, 209.3669],
  [3468, 5.6755, 309.2783],
];

// R2 terms
const R2: readonly (readonly [number, number, number])[] = [
  [436902, 4.786717, 213.299095],
  [71923, 2.5007, 206.18555],
  [49767, 4.97168, 220.41264],
  [43221, 3.8694, 426.59819],
  [29646, 5.9631, 7.11355],
  [4721, 2.4753, 199.072],
  [4142, 4.1067, 433.7117],
  [3789, 3.0977, 639.8973],
  [2964, 1.3721, 103.0928],
  [2556, 2.8507, 419.4846],
  [2327, 0, 0],
  [2208, 6.2759, 110.2063],
  [2188, 5.8555, 14.2271],
  [1957, 4.9245, 227.5262],
  [924, 5.464, 323.505],
  [706, 2.971, 95.979],
  [546, 4.129, 412.371],
  [431, 5.178, 522.577],
  [405, 4.173, 209.367],
  [391, 4.481, 316.392],
  [374, 5.834, 117.32],
  [361, 3.277, 647.011],
  [356, 3.192, 210.118],
  [326, 2.269, 853.196],
  [207, 4.022, 735.877],
  [204, 0.088, 202.253],
  [180, 3.597, 632.784],
];

// R3 terms
const R3: readonly (readonly [number, number, number])[] = [
  [20315, 3.02187, 213.2991],
  [8924, 3.1914, 220.4126],
  [6909, 4.3517, 206.1855],
  [4087, 4.2241, 7.1135],
  [3879, 2.0106, 426.5982],
  [1071, 4.2036, 199.072],
  [907, 2.283, 433.712],
  [606, 3.175, 227.526],
  [597, 4.135, 14.227],
  [483, 1.173, 639.897],
  [393, 0, 0],
  [229, 4.698, 419.485],
  [188, 4.59, 110.206],
  [150, 3.202, 103.093],
  [121, 3.768, 323.505],
  [102, 4.71, 95.979],
  [101, 5.819, 412.371],
];

// R4 terms
const R4: readonly (readonly [number, number, number])[] = [
  [1202, 1.415, 220.4126],
  [708, 1.162, 213.299],
  [516, 6.24, 206.186],
  [427, 2.469, 7.114],
  [268, 0.187, 426.598],
  [170, 5.959, 199.072],
  [150, 0.48, 433.712],
  [145, 1.442, 227.526],
  [121, 2.405, 14.227],
  [47, 5.57, 639.9],
  [19, 5.86, 647.01],
  [17, 0.53, 440.83],
  [16, 2.9, 110.21],
  [15, 0.3, 419.48],
  [14, 1.3, 412.37],
  [13, 2.09, 323.51],
  [11, 0.22, 95.98],
  [11, 2.46, 117.32],
];

// R5 terms
const R5: readonly (readonly [number, number, number])[] = [
  [129, 5.913, 220.413],
  [32, 0.69, 7.11],
  [27, 5.91, 227.53],
  [20, 4.95, 433.71],
  [20, 0.67, 14.23],
  [14, 2.67, 206.19],
  [14, 1.46, 199.07],
  [13, 4.59, 426.6],
  [7, 4.63, 213.3],
  [5, 3.61, 639.9],
];

/**
 * Calculate heliocentric longitude of Saturn (L) in radians.
 * @param tau - Julian millennia from J2000.0
 * @returns Heliocentric longitude in radians
 */
export function saturnHeliocentricLongitude(tau: number): number {
  const tau2 = tau * tau;
  const tau3 = tau2 * tau;
  const tau4 = tau3 * tau;
  const tau5 = tau4 * tau;

  let L0sum = 0;
  for (const [A, B, C] of L0) {
    L0sum += A * Math.cos(B + C * tau);
  }

  let L1sum = 0;
  for (const [A, B, C] of L1) {
    L1sum += A * Math.cos(B + C * tau);
  }

  let L2sum = 0;
  for (const [A, B, C] of L2) {
    L2sum += A * Math.cos(B + C * tau);
  }

  let L3sum = 0;
  for (const [A, B, C] of L3) {
    L3sum += A * Math.cos(B + C * tau);
  }

  let L4sum = 0;
  for (const [A, B, C] of L4) {
    L4sum += A * Math.cos(B + C * tau);
  }

  let L5sum = 0;
  for (const [A, B, C] of L5) {
    L5sum += A * Math.cos(B + C * tau);
  }

  const L = (L0sum + L1sum * tau + L2sum * tau2 + L3sum * tau3 + L4sum * tau4 + L5sum * tau5) / 1e8;

  return L;
}

/**
 * Calculate heliocentric latitude of Saturn (B) in radians.
 * @param tau - Julian millennia from J2000.0
 * @returns Heliocentric latitude in radians
 */
export function saturnHeliocentricLatitude(tau: number): number {
  const tau2 = tau * tau;
  const tau3 = tau2 * tau;
  const tau4 = tau3 * tau;
  const tau5 = tau4 * tau;

  let B0sum = 0;
  for (const [A, B, C] of B0) {
    B0sum += A * Math.cos(B + C * tau);
  }

  let B1sum = 0;
  for (const [A, B, C] of B1) {
    B1sum += A * Math.cos(B + C * tau);
  }

  let B2sum = 0;
  for (const [A, B, C] of B2) {
    B2sum += A * Math.cos(B + C * tau);
  }

  let B3sum = 0;
  for (const [A, B, C] of B3) {
    B3sum += A * Math.cos(B + C * tau);
  }

  let B4sum = 0;
  for (const [A, B, C] of B4) {
    B4sum += A * Math.cos(B + C * tau);
  }

  let B5sum = 0;
  for (const [A, B, C] of B5) {
    B5sum += A * Math.cos(B + C * tau);
  }

  const B_rad =
    (B0sum + B1sum * tau + B2sum * tau2 + B3sum * tau3 + B4sum * tau4 + B5sum * tau5) / 1e8;

  return B_rad;
}

/**
 * Calculate heliocentric distance of Saturn (R) in AU.
 * @param tau - Julian millennia from J2000.0
 * @returns Heliocentric distance in AU
 */
export function saturnHeliocentricDistance(tau: number): number {
  const tau2 = tau * tau;
  const tau3 = tau2 * tau;
  const tau4 = tau3 * tau;
  const tau5 = tau4 * tau;

  let R0sum = 0;
  for (const [A, B, C] of R0) {
    R0sum += A * Math.cos(B + C * tau);
  }

  let R1sum = 0;
  for (const [A, B, C] of R1) {
    R1sum += A * Math.cos(B + C * tau);
  }

  let R2sum = 0;
  for (const [A, B, C] of R2) {
    R2sum += A * Math.cos(B + C * tau);
  }

  let R3sum = 0;
  for (const [A, B, C] of R3) {
    R3sum += A * Math.cos(B + C * tau);
  }

  let R4sum = 0;
  for (const [A, B, C] of R4) {
    R4sum += A * Math.cos(B + C * tau);
  }

  let R5sum = 0;
  for (const [A, B, C] of R5) {
    R5sum += A * Math.cos(B + C * tau);
  }

  const R = (R0sum + R1sum * tau + R2sum * tau2 + R3sum * tau3 + R4sum * tau4 + R5sum * tau5) / 1e8;

  return R;
}

/**
 * Calculate apparent geocentric position of Saturn.
 *
 * @param jd - Julian Date
 * @param options - Calculation options
 * @returns Saturn's apparent geocentric position
 *
 * @example
 * ```ts
 * import { getSaturnPosition } from 'celestine';
 *
 * const jd = 2451545.0; // J2000.0
 * const saturn = getSaturnPosition(jd);
 * console.log(saturn.longitude); // ~40.4° (Taurus)
 * ```
 */
export function getSaturnPosition(jd: number, options: EphemerisOptions = {}): PlanetPosition {
  const { includeSpeed = true } = options;

  const tau = (jd - J2000_EPOCH) / DAYS_PER_JULIAN_MILLENNIUM;

  // Heliocentric coordinates of Saturn
  const saturnL = saturnHeliocentricLongitude(tau);
  const saturnB = saturnHeliocentricLatitude(tau);
  const saturnR = saturnHeliocentricDistance(tau);

  // We need Earth's heliocentric coordinates to convert to geocentric
  // Using simplified VSOP87 for Earth
  const earthL = earthHeliocentricLongitude(tau);
  const earthR = earthHeliocentricDistance(tau);

  // Convert heliocentric to geocentric
  // Saturn's rectangular heliocentric coordinates
  const saturnX = saturnR * Math.cos(saturnB) * Math.cos(saturnL);
  const saturnY = saturnR * Math.cos(saturnB) * Math.sin(saturnL);
  const saturnZ = saturnR * Math.sin(saturnB);

  // Earth's rectangular heliocentric coordinates (B ≈ 0)
  const earthX = earthR * Math.cos(earthL);
  const earthY = earthR * Math.sin(earthL);

  // Geocentric rectangular coordinates
  const geoX = saturnX - earthX;
  const geoY = saturnY - earthY;
  const geoZ = saturnZ;

  // Convert to geocentric ecliptic coordinates
  let geoLon = Math.atan2(geoY, geoX) * RAD_TO_DEG;
  const geoLat = Math.atan2(geoZ, Math.sqrt(geoX * geoX + geoY * geoY)) * RAD_TO_DEG;
  const geoDist = Math.sqrt(geoX * geoX + geoY * geoY + geoZ * geoZ);

  // Normalize longitude to [0, 360)
  while (geoLon < 0) geoLon += 360;
  while (geoLon >= 360) geoLon -= 360;

  // Apply aberration correction (approximate)
  // Aberration constant: 20.4955" = 0.005694°
  const aberration = -0.005694;
  geoLon += aberration;

  // Normalize again
  while (geoLon < 0) geoLon += 360;
  while (geoLon >= 360) geoLon -= 360;

  // Calculate speed if requested
  let longitudeSpeed = 0;
  let isRetrograde = false;

  if (includeSpeed) {
    const dt = 0.01; // 0.01 day step for numerical derivative
    const pos1 = getSaturnPosition(jd - dt, { includeSpeed: false });
    const pos2 = getSaturnPosition(jd + dt, { includeSpeed: false });

    // Handle wraparound at 0/360°
    let lonDiff = pos2.longitude - pos1.longitude;
    if (lonDiff > 180) lonDiff -= 360;
    if (lonDiff < -180) lonDiff += 360;

    longitudeSpeed = lonDiff / (2 * dt);
    isRetrograde = longitudeSpeed < 0;
  }

  return {
    longitude: geoLon,
    latitude: geoLat,
    distance: geoDist,
    longitudeSpeed,
    isRetrograde,
  };
}

/**
 * Simplified Earth heliocentric longitude for geocentric conversion.
 * @param tau - Julian millennia from J2000.0
 * @returns Earth's heliocentric longitude in radians
 */
function earthHeliocentricLongitude(tau: number): number {
  const tau2 = tau * tau;

  // Simplified VSOP87 for Earth's longitude
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
 * Saturn's mean orbital elements (for reference).
 */
export const SATURN_ORBITAL_ELEMENTS = {
  /** Semi-major axis in AU */
  semiMajorAxis: 9.537,
  /** Orbital eccentricity */
  eccentricity: 0.0539,
  /** Orbital inclination in degrees */
  inclination: 2.49,
  /** Orbital period in days */
  orbitalPeriod: 10759,
  /** Orbital period in years */
  orbitalPeriodYears: 29.46,
  /** Synodic period in days (time between oppositions) */
  synodicPeriod: 378.09,
} as const;
