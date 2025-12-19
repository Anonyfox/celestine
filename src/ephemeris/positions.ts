/**
 * Unified Position Calculator
 *
 * Provides a single entry point for getting any celestial body's position.
 *
 * @module ephemeris/positions
 *
 * @example
 * ```ts
 * import { getPosition, getAllPositions, Planet } from 'celestine';
 *
 * const jd = 2451545.0; // J2000.0
 *
 * // Get single body position
 * const sun = getPosition(Planet.Sun, jd);
 *
 * // Get all positions at once
 * const chart = getAllPositions(jd);
 * console.log(chart.get(Planet.Moon)?.longitude);
 * ```
 */

import { getCeresPosition } from './asteroids/ceres.js';
import { getJunoPosition } from './asteroids/juno.js';
import { getPallasPosition } from './asteroids/pallas.js';
import { getVestaPosition } from './asteroids/vesta.js';
import { getChironPosition } from './chiron.js';
import { getMeanLilith, getTrueLilith } from './lilith.js';
import { getMoonPosition } from './moon.js';
import { getMeanNode, getTrueNode } from './nodes.js';
import { getJupiterPosition } from './planets/jupiter.js';
import { getMarsPosition } from './planets/mars.js';
import { getMercuryPosition } from './planets/mercury.js';
import { getNeptunePosition } from './planets/neptune.js';
import { getPlutoPosition } from './planets/pluto.js';
import { getSaturnPosition } from './planets/saturn.js';
import { getUranusPosition } from './planets/uranus.js';
import { getVenusPosition } from './planets/venus.js';
import { getSunPosition } from './sun.js';
import type { EphemerisOptions, PlanetPosition, PlanetPositions } from './types.js';
import { Planet } from './types.js';

// =============================================================================
// Extended Planet enum for variants
// =============================================================================

/**
 * Extended body identifiers including variants (Mean/True).
 */
export enum CelestialBody {
  Sun = 'Sun',
  Moon = 'Moon',
  Mercury = 'Mercury',
  Venus = 'Venus',
  Mars = 'Mars',
  Jupiter = 'Jupiter',
  Saturn = 'Saturn',
  Uranus = 'Uranus',
  Neptune = 'Neptune',
  Pluto = 'Pluto',
  /** Mean North Node (default) */
  NorthNode = 'NorthNode',
  /** True North Node */
  TrueNorthNode = 'TrueNorthNode',
  /** Mean South Node */
  SouthNode = 'SouthNode',
  /** True South Node */
  TrueSouthNode = 'TrueSouthNode',
  /** Mean Lilith (default) */
  Lilith = 'Lilith',
  /** True Lilith (Osculating) */
  TrueLilith = 'TrueLilith',
  Chiron = 'Chiron',
  /** Ceres - dwarf planet */
  Ceres = 'Ceres',
  /** Pallas - wisdom asteroid */
  Pallas = 'Pallas',
  /** Juno - partnership asteroid */
  Juno = 'Juno',
  /** Vesta - devotion asteroid */
  Vesta = 'Vesta',
}

// =============================================================================
// Single Body Position
// =============================================================================

/**
 * Get the position of any celestial body.
 *
 * @param body - The celestial body (Planet enum or CelestialBody enum)
 * @param jd - Julian Date
 * @param options - Calculation options
 * @returns Position of the body
 * @throws Error if body is not recognized
 *
 * @example
 * ```ts
 * const sun = getPosition(Planet.Sun, 2451545.0);
 * const trueNode = getPosition(CelestialBody.TrueNorthNode, 2451545.0);
 * ```
 */
export function getPosition(
  body: Planet | CelestialBody | string,
  jd: number,
  options: EphemerisOptions = {},
): PlanetPosition {
  switch (body) {
    case Planet.Sun:
    case CelestialBody.Sun:
      return getSunPosition(jd, options);

    case Planet.Moon:
    case CelestialBody.Moon:
      return getMoonPosition(jd, options);

    case Planet.Mercury:
    case CelestialBody.Mercury:
      return getMercuryPosition(jd, options);

    case Planet.Venus:
    case CelestialBody.Venus:
      return getVenusPosition(jd, options);

    case Planet.Mars:
    case CelestialBody.Mars:
      return getMarsPosition(jd, options);

    case Planet.Jupiter:
    case CelestialBody.Jupiter:
      return getJupiterPosition(jd, options);

    case Planet.Saturn:
    case CelestialBody.Saturn:
      return getSaturnPosition(jd, options);

    case Planet.Uranus:
    case CelestialBody.Uranus:
      return getUranusPosition(jd, options);

    case Planet.Neptune:
    case CelestialBody.Neptune:
      return getNeptunePosition(jd, options);

    case Planet.Pluto:
    case CelestialBody.Pluto:
      return getPlutoPosition(jd, options);

    case Planet.NorthNode:
    case CelestialBody.NorthNode: {
      const node = getMeanNode(jd);
      return {
        longitude: node.northNode,
        latitude: 0,
        distance: 0,
        longitudeSpeed: node.speed,
        latitudeSpeed: 0,
        isRetrograde: node.isRetrograde,
      };
    }

    case CelestialBody.TrueNorthNode: {
      const node = getTrueNode(jd);
      return {
        longitude: node.northNode,
        latitude: 0,
        distance: 0,
        longitudeSpeed: node.speed,
        latitudeSpeed: 0,
        isRetrograde: node.isRetrograde,
      };
    }

    case Planet.SouthNode:
    case CelestialBody.SouthNode: {
      const node = getMeanNode(jd);
      return {
        longitude: node.southNode,
        latitude: 0,
        distance: 0,
        longitudeSpeed: node.speed,
        latitudeSpeed: 0,
        isRetrograde: node.isRetrograde,
      };
    }

    case CelestialBody.TrueSouthNode: {
      const node = getTrueNode(jd);
      return {
        longitude: node.southNode,
        latitude: 0,
        distance: 0,
        longitudeSpeed: node.speed,
        latitudeSpeed: 0,
        isRetrograde: node.isRetrograde,
      };
    }

    case Planet.Lilith:
    case CelestialBody.Lilith: {
      const lilith = getMeanLilith(jd);
      return {
        longitude: lilith.longitude,
        latitude: 0,
        distance: 0,
        longitudeSpeed: lilith.speed,
        latitudeSpeed: 0,
        isRetrograde: lilith.isRetrograde,
      };
    }

    case CelestialBody.TrueLilith: {
      const lilith = getTrueLilith(jd);
      return {
        longitude: lilith.longitude,
        latitude: 0,
        distance: 0,
        longitudeSpeed: lilith.speed,
        latitudeSpeed: 0,
        isRetrograde: lilith.isRetrograde,
      };
    }

    case Planet.Chiron:
    case CelestialBody.Chiron:
      return getChironPosition(jd, options);

    case Planet.Ceres:
    case CelestialBody.Ceres:
      return getCeresPosition(jd, options);

    case Planet.Pallas:
    case CelestialBody.Pallas:
      return getPallasPosition(jd, options);

    case Planet.Juno:
    case CelestialBody.Juno:
      return getJunoPosition(jd, options);

    case Planet.Vesta:
    case CelestialBody.Vesta:
      return getVestaPosition(jd, options);

    default:
      throw new Error(`Unknown celestial body: ${body}`);
  }
}

// =============================================================================
// All Positions
// =============================================================================

/**
 * Default bodies to include in getAllPositions().
 * Includes the 10 traditional astrological bodies + Chiron.
 */
export const DEFAULT_BODIES: readonly Planet[] = [
  Planet.Sun,
  Planet.Moon,
  Planet.Mercury,
  Planet.Venus,
  Planet.Mars,
  Planet.Jupiter,
  Planet.Saturn,
  Planet.Uranus,
  Planet.Neptune,
  Planet.Pluto,
  Planet.NorthNode,
  Planet.SouthNode,
  Planet.Lilith,
  Planet.Chiron,
  Planet.Ceres,
  Planet.Pallas,
  Planet.Juno,
  Planet.Vesta,
] as const;

/**
 * Get positions of all celestial bodies at once.
 *
 * @param jd - Julian Date
 * @param bodies - Bodies to include (defaults to all standard bodies)
 * @param options - Calculation options
 * @returns Map of body to position
 *
 * @example
 * ```ts
 * const positions = getAllPositions(2451545.0);
 *
 * // Iterate all positions
 * for (const [body, pos] of positions) {
 *   console.log(`${body}: ${pos.longitude.toFixed(2)}°`);
 * }
 *
 * // Get specific body
 * const moon = positions.get(Planet.Moon);
 * ```
 */
export function getAllPositions(
  jd: number,
  bodies: readonly (Planet | CelestialBody)[] = DEFAULT_BODIES,
  options: EphemerisOptions = {},
): PlanetPositions {
  const positions: PlanetPositions = new Map();

  for (const body of bodies) {
    const position = getPosition(body, jd, options);
    positions.set(body as Planet, position);
  }

  return positions;
}

/**
 * Get positions of all bodies as a plain object.
 * Useful for JSON serialization.
 *
 * @param jd - Julian Date
 * @param bodies - Bodies to include
 * @param options - Calculation options
 * @returns Object mapping body name to position
 */
export function getAllPositionsObject(
  jd: number,
  bodies: readonly (Planet | CelestialBody)[] = DEFAULT_BODIES,
  options: EphemerisOptions = {},
): Record<string, PlanetPosition> {
  const result: Record<string, PlanetPosition> = {};

  for (const body of bodies) {
    result[body] = getPosition(body, jd, options);
  }

  return result;
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Check if a body is currently retrograde.
 *
 * @param body - The celestial body
 * @param jd - Julian Date
 * @returns True if retrograde
 *
 * @example
 * ```ts
 * if (isRetrograde(Planet.Mercury, jd)) {
 *   console.log('Mercury is retrograde!');
 * }
 * ```
 */
export function isRetrograde(body: Planet | CelestialBody, jd: number): boolean {
  // Sun and Moon never retrograde
  if (body === Planet.Sun || body === Planet.Moon) {
    return false;
  }

  const position = getPosition(body, jd);
  return position.isRetrograde;
}

/**
 * Get the zodiac sign (0-11) for a body.
 *
 * @param body - The celestial body
 * @param jd - Julian Date
 * @returns Sign index (0=Aries, 1=Taurus, ..., 11=Pisces)
 */
export function getSign(body: Planet | CelestialBody, jd: number): number {
  const position = getPosition(body, jd);
  return Math.floor(position.longitude / 30);
}

/**
 * Get the degree within sign (0-30) for a body.
 *
 * @param body - The celestial body
 * @param jd - Julian Date
 * @returns Degree within sign (0.0 to 29.999...)
 */
export function getDegreeInSign(body: Planet | CelestialBody, jd: number): number {
  const position = getPosition(body, jd);
  return position.longitude % 30;
}
