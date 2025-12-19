/**
 * Asteroids Module
 *
 * Position calculations for the four major asteroids:
 * - Ceres (dwarf planet)
 * - Pallas
 * - Juno
 * - Vesta
 *
 * @module ephemeris/asteroids
 */

export {
  CERES_ORBITAL_ELEMENTS,
  ceresHeliocentricDistance,
  ceresHeliocentricLatitude,
  ceresHeliocentricLongitude,
  getCeresPosition,
} from './ceres.js';

export {
  getJunoPosition,
  JUNO_ORBITAL_ELEMENTS,
  junoHeliocentricDistance,
  junoHeliocentricLatitude,
  junoHeliocentricLongitude,
} from './juno.js';

export {
  getPallasPosition,
  PALLAS_ORBITAL_ELEMENTS,
  pallasHeliocentricDistance,
  pallasHeliocentricLatitude,
  pallasHeliocentricLongitude,
} from './pallas.js';

export {
  getVestaPosition,
  VESTA_ORBITAL_ELEMENTS,
  vestaHeliocentricDistance,
  vestaHeliocentricLatitude,
  vestaHeliocentricLongitude,
} from './vesta.js';
