/**
 * Precise Chiron, Ceres, Pallas, Juno and Vesta (opt-in subpath `celestine/precise`): drop-in
 * replacements for the `celestine/ephemeris` functions, about 1″ vs JPL Horizons over 1800–2200.
 * Each body's data is its own module, so importing one function bundles only that body.
 *
 * @module precise
 */
export type { EphemerisOptions, PlanetPosition } from '../ephemeris/types.js';
export { getCeresPosition } from './ceres.js';
export { getChironPosition } from './chiron.js';
export { getJunoPosition } from './juno.js';
export { getPallasPosition } from './pallas.js';
export { PRECISE_RANGE } from './position.js';
export { getVestaPosition } from './vesta.js';
