/**
 * Planetary Position Calculation
 *
 * Wrapper around the ephemeris module to calculate all planetary positions
 * for a birth chart.
 *
 * @module chart/planet-positions
 */

import {
  getCeresPosition,
  getJunoPosition,
  getPallasPosition,
  getVestaPosition,
} from '../ephemeris/asteroids/index.js';
import { getChironPosition } from '../ephemeris/chiron.js';
import { getMeanLilith, getTrueLilith } from '../ephemeris/lilith.js';
import { calculatePartOfFortune, calculatePartOfSpirit } from '../ephemeris/lots.js';
import { getMoonPosition } from '../ephemeris/moon.js';
import { getMeanNode, getTrueNode } from '../ephemeris/nodes.js';
import {
  getJupiterPosition,
  getMarsPosition,
  getMercuryPosition,
  getNeptunePosition,
  getPlutoPosition,
  getSaturnPosition,
  getUranusPosition,
  getVenusPosition,
} from '../ephemeris/planets/index.js';
import { CelestialBody } from '../ephemeris/positions.js';
import { getSunPosition } from '../ephemeris/sun.js';
import type { PlanetPosition } from '../ephemeris/types.js';
import { BODY_NAMES, PLANET_ORDER, STATIONARY_THRESHOLD } from './constants.js';
import type { ChartOptions } from './types.js';

/**
 * Result of planetary position calculations.
 */
export interface PlanetPositions {
  /** Main planets (Sun through Pluto) */
  planets: Map<CelestialBody, PlanetPosition>;

  /** Chiron position (if included) */
  chiron?: PlanetPosition;

  /** Asteroid positions (if included) */
  asteroids?: {
    ceres?: PlanetPosition;
    pallas?: PlanetPosition;
    juno?: PlanetPosition;
    vesta?: PlanetPosition;
  };

  /** Lunar nodes */
  nodes?: {
    meanNorth?: { longitude: number };
    trueNorth?: { longitude: number };
    meanSouth?: { longitude: number };
    trueSouth?: { longitude: number };
  };

  /** Lilith positions */
  lilith?: {
    mean?: { longitude: number };
    true?: { longitude: number };
  };

  /** Arabic Parts/Lots (calculated after we have Sun, Moon, ASC) */
  lots?: {
    fortune?: { longitude: number };
    spirit?: { longitude: number };
  };
}

/**
 * Calculate all planetary positions for a given Julian Date.
 *
 * @param jd - Julian Date
 * @param options - Chart options determining which bodies to include
 * @returns All calculated positions
 */
export function calculatePlanetPositions(
  jd: number,
  options: Required<ChartOptions>,
): PlanetPositions {
  const planets = new Map<CelestialBody, PlanetPosition>();

  // Always calculate the main planets
  planets.set(CelestialBody.Sun, getSunPosition(jd));
  planets.set(CelestialBody.Moon, getMoonPosition(jd));
  planets.set(CelestialBody.Mercury, getMercuryPosition(jd));
  planets.set(CelestialBody.Venus, getVenusPosition(jd));
  planets.set(CelestialBody.Mars, getMarsPosition(jd));
  planets.set(CelestialBody.Jupiter, getJupiterPosition(jd));
  planets.set(CelestialBody.Saturn, getSaturnPosition(jd));
  planets.set(CelestialBody.Uranus, getUranusPosition(jd));
  planets.set(CelestialBody.Neptune, getNeptunePosition(jd));
  planets.set(CelestialBody.Pluto, getPlutoPosition(jd));

  const result: PlanetPositions = { planets };

  // Chiron
  if (options.includeChiron) {
    result.chiron = getChironPosition(jd);
  }

  // Asteroids
  if (options.includeAsteroids) {
    result.asteroids = {
      ceres: getCeresPosition(jd),
      pallas: getPallasPosition(jd),
      juno: getJunoPosition(jd),
      vesta: getVestaPosition(jd),
    };
  }

  // Lunar nodes
  if (options.includeNodes) {
    result.nodes = {};

    if (options.includeNodes === 'mean' || options.includeNodes === 'both') {
      const meanN = getMeanNode(jd);
      result.nodes.meanNorth = { longitude: meanN.northNode };
      result.nodes.meanSouth = { longitude: meanN.southNode };
    }

    if (options.includeNodes === 'true' || options.includeNodes === 'both') {
      const trueN = getTrueNode(jd);
      result.nodes.trueNorth = { longitude: trueN.northNode };
      result.nodes.trueSouth = { longitude: trueN.southNode };
    }
  }

  // Lilith
  if (options.includeLilith) {
    result.lilith = {};

    if (options.includeLilith === 'mean' || options.includeLilith === 'both') {
      const meanL = getMeanLilith(jd);
      result.lilith.mean = { longitude: meanL.longitude };
    }

    if (options.includeLilith === 'true' || options.includeLilith === 'both') {
      const trueL = getTrueLilith(jd);
      result.lilith.true = { longitude: trueL.longitude };
    }
  }

  return result;
}

/**
 * Calculate Arabic Parts/Lots after we have ASC.
 *
 * @param sunLongitude - Sun's ecliptic longitude
 * @param moonLongitude - Moon's ecliptic longitude
 * @param ascendant - Ascendant longitude
 * @param isDaytime - Whether the chart is a daytime chart
 * @param includeLots - Whether to include lots
 * @returns Lots positions
 */
export function calculateLots(
  sunLongitude: number,
  moonLongitude: number,
  ascendant: number,
  isDaytime: boolean,
  includeLots: boolean,
): { fortune?: { longitude: number }; spirit?: { longitude: number } } {
  if (!includeLots) {
    return {};
  }

  return {
    fortune: {
      longitude: calculatePartOfFortune(sunLongitude, moonLongitude, ascendant, isDaytime),
    },
    spirit: { longitude: calculatePartOfSpirit(sunLongitude, moonLongitude, ascendant, isDaytime) },
  };
}

/**
 * Check if a celestial body is retrograde.
 *
 * @param position - Celestial position with speed
 * @returns True if retrograde (negative speed)
 */
export function isRetrograde(position: PlanetPosition): boolean {
  return position.longitudeSpeed < 0;
}

/**
 * Check if a celestial body is stationary.
 *
 * @param position - Celestial position with speed
 * @returns True if nearly stationary
 */
export function isStationary(position: PlanetPosition): boolean {
  return Math.abs(position.longitudeSpeed) < STATIONARY_THRESHOLD;
}

/**
 * Get the display name for a celestial body.
 *
 * @param body - Celestial body
 * @returns Human-readable name
 */
export function getBodyName(body: CelestialBody): string {
  const nameMap: Record<CelestialBody, string> = {
    [CelestialBody.Sun]: BODY_NAMES.sun,
    [CelestialBody.Moon]: BODY_NAMES.moon,
    [CelestialBody.Mercury]: BODY_NAMES.mercury,
    [CelestialBody.Venus]: BODY_NAMES.venus,
    [CelestialBody.Mars]: BODY_NAMES.mars,
    [CelestialBody.Jupiter]: BODY_NAMES.jupiter,
    [CelestialBody.Saturn]: BODY_NAMES.saturn,
    [CelestialBody.Uranus]: BODY_NAMES.uranus,
    [CelestialBody.Neptune]: BODY_NAMES.neptune,
    [CelestialBody.Pluto]: BODY_NAMES.pluto,
    [CelestialBody.Chiron]: BODY_NAMES.chiron,
    [CelestialBody.Ceres]: BODY_NAMES.ceres,
    [CelestialBody.Pallas]: BODY_NAMES.pallas,
    [CelestialBody.Juno]: BODY_NAMES.juno,
    [CelestialBody.Vesta]: BODY_NAMES.vesta,
    [CelestialBody.NorthNode]: BODY_NAMES.northNode,
    [CelestialBody.TrueNorthNode]: BODY_NAMES.northNode,
    [CelestialBody.SouthNode]: BODY_NAMES.southNode,
    [CelestialBody.TrueSouthNode]: BODY_NAMES.southNode,
    [CelestialBody.Lilith]: BODY_NAMES.meanLilith,
    [CelestialBody.TrueLilith]: BODY_NAMES.trueLilith,
  };

  return nameMap[body] ?? String(body);
}

/**
 * Get ordered list of planet names for chart display.
 *
 * @returns Planet names in traditional order
 */
export function getPlanetOrder(): readonly string[] {
  return PLANET_ORDER;
}

/**
 * Convert positions Map to sorted array.
 *
 * @param positions - Map of body to position
 * @returns Sorted array of [body, position] pairs
 */
export function sortedPlanetList(
  positions: Map<CelestialBody, PlanetPosition>,
): Array<[CelestialBody, PlanetPosition]> {
  const bodyOrder: CelestialBody[] = [
    CelestialBody.Sun,
    CelestialBody.Moon,
    CelestialBody.Mercury,
    CelestialBody.Venus,
    CelestialBody.Mars,
    CelestialBody.Jupiter,
    CelestialBody.Saturn,
    CelestialBody.Uranus,
    CelestialBody.Neptune,
    CelestialBody.Pluto,
  ];

  const result: Array<[CelestialBody, PlanetPosition]> = [];

  for (const body of bodyOrder) {
    const pos = positions.get(body);
    if (pos) {
      result.push([body, pos]);
    }
  }

  return result;
}
