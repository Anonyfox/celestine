/**
 * Zodiac Placement for Charts
 *
 * Places celestial bodies in signs and houses, calculates dignities.
 *
 * @module chart/zodiac-placement
 */

import { CelestialBody } from '../ephemeris/positions.js';
import type { PlanetPosition } from '../ephemeris/types.js';
import { getPlanetaryDignity } from '../zodiac/dignities.js';
import { getSignName } from '../zodiac/sign-properties.js';
import { DignityState, Planet, Sign } from '../zodiac/types.js';
import { eclipticToZodiac } from '../zodiac/zodiac.js';
import { getHouseNumber } from './house-calculation.js';
import { getBodyName, isRetrograde } from './planet-positions.js';
import type { ChartHouses, ChartLilith, ChartLot, ChartNode, ChartPlanet } from './types.js';

/**
 * Map CelestialBody to zodiac Planet for dignity lookup.
 */
const BODY_TO_PLANET: Partial<Record<CelestialBody, Planet>> = {
  [CelestialBody.Sun]: Planet.Sun,
  [CelestialBody.Moon]: Planet.Moon,
  [CelestialBody.Mercury]: Planet.Mercury,
  [CelestialBody.Venus]: Planet.Venus,
  [CelestialBody.Mars]: Planet.Mars,
  [CelestialBody.Jupiter]: Planet.Jupiter,
  [CelestialBody.Saturn]: Planet.Saturn,
  [CelestialBody.Uranus]: Planet.Uranus,
  [CelestialBody.Neptune]: Planet.Neptune,
  [CelestialBody.Pluto]: Planet.Pluto,
};

/**
 * Build a ChartPlanet from a celestial position.
 *
 * @param body - Celestial body identifier
 * @param position - Position data from ephemeris
 * @param houses - House cusps for house placement
 * @returns Complete ChartPlanet object
 */
export function buildChartPlanet(
  body: CelestialBody,
  position: PlanetPosition,
  houses: ChartHouses,
): ChartPlanet {
  const zodiacPos = eclipticToZodiac(position.longitude);
  const cusps = houses.cusps.map((c) => c.longitude);
  const house = getHouseNumber(position.longitude, cusps);

  // Get dignity (if this body has dignity mappings)
  const planet = BODY_TO_PLANET[body];
  let dignity: ChartPlanet['dignity'];

  if (planet !== undefined) {
    const dignityResult = getPlanetaryDignity(planet, zodiacPos.sign);
    dignity = {
      state: dignityResult.state,
      strength: dignityResult.strength,
      description: dignityResult.description,
    };
  } else {
    // Bodies without traditional dignities (asteroids, etc.)
    dignity = {
      state: DignityState.Peregrine,
      strength: 0,
      description: 'No traditional dignity',
    };
  }

  return {
    name: getBodyName(body),
    body,
    longitude: position.longitude,
    latitude: position.latitude,
    distance: position.distance,
    longitudeSpeed: position.longitudeSpeed,
    isRetrograde: isRetrograde(position),
    sign: zodiacPos.sign,
    signName: getSignName(zodiacPos.sign),
    degree: zodiacPos.degree,
    minute: zodiacPos.minute,
    second: zodiacPos.second,
    formatted: zodiacPos.formatted,
    house,
    dignity,
  };
}

/**
 * Build a ChartNode from a node position.
 *
 * @param name - "North Node" or "South Node"
 * @param type - "Mean" or "True"
 * @param longitude - Ecliptic longitude
 * @param houses - House cusps for house placement
 * @returns ChartNode object
 */
export function buildChartNode(
  name: string,
  type: 'Mean' | 'True',
  longitude: number,
  houses: ChartHouses,
): ChartNode {
  const zodiacPos = eclipticToZodiac(longitude);
  const cusps = houses.cusps.map((c) => c.longitude);
  const house = getHouseNumber(longitude, cusps);

  return {
    name,
    type,
    longitude,
    sign: zodiacPos.sign,
    signName: getSignName(zodiacPos.sign),
    degree: zodiacPos.degree,
    minute: zodiacPos.minute,
    formatted: zodiacPos.formatted,
    house,
  };
}

/**
 * Build a ChartLilith from a Lilith position.
 *
 * @param type - "Mean" or "True"
 * @param longitude - Ecliptic longitude
 * @param houses - House cusps for house placement
 * @returns ChartLilith object
 */
export function buildChartLilith(
  type: 'Mean' | 'True',
  longitude: number,
  houses: ChartHouses,
): ChartLilith {
  const zodiacPos = eclipticToZodiac(longitude);
  const cusps = houses.cusps.map((c) => c.longitude);
  const house = getHouseNumber(longitude, cusps);

  return {
    name: type === 'Mean' ? 'Mean Lilith' : 'True Lilith',
    type,
    longitude,
    sign: zodiacPos.sign,
    signName: getSignName(zodiacPos.sign),
    degree: zodiacPos.degree,
    minute: zodiacPos.minute,
    formatted: zodiacPos.formatted,
    house,
  };
}

/**
 * Build a ChartLot from an Arabic Part position.
 *
 * @param name - Lot name (e.g., "Part of Fortune")
 * @param formula - Formula used (e.g., "ASC + Moon - Sun")
 * @param longitude - Ecliptic longitude
 * @param houses - House cusps for house placement
 * @returns ChartLot object
 */
export function buildChartLot(
  name: string,
  formula: string,
  longitude: number,
  houses: ChartHouses,
): ChartLot {
  const zodiacPos = eclipticToZodiac(longitude);
  const cusps = houses.cusps.map((c) => c.longitude);
  const house = getHouseNumber(longitude, cusps);

  return {
    name,
    formula,
    longitude,
    sign: zodiacPos.sign,
    signName: getSignName(zodiacPos.sign),
    degree: zodiacPos.degree,
    minute: zodiacPos.minute,
    formatted: zodiacPos.formatted,
    house,
  };
}

/**
 * Get the zodiac sign for a longitude.
 *
 * @param longitude - Ecliptic longitude
 * @returns Sign enum value
 */
export function getSignForLongitude(longitude: number): Sign {
  const zodiacPos = eclipticToZodiac(longitude);
  return zodiacPos.sign;
}

/**
 * Get element for a sign.
 */
export function getElement(sign: Sign): 'fire' | 'earth' | 'air' | 'water' {
  const fireSign = [Sign.Aries, Sign.Leo, Sign.Sagittarius];
  const earthSigns = [Sign.Taurus, Sign.Virgo, Sign.Capricorn];
  const airSigns = [Sign.Gemini, Sign.Libra, Sign.Aquarius];

  if (fireSign.includes(sign)) return 'fire';
  if (earthSigns.includes(sign)) return 'earth';
  if (airSigns.includes(sign)) return 'air';
  return 'water';
}

/**
 * Get modality for a sign.
 */
export function getModality(sign: Sign): 'cardinal' | 'fixed' | 'mutable' {
  const cardinal = [Sign.Aries, Sign.Cancer, Sign.Libra, Sign.Capricorn];
  const fixed = [Sign.Taurus, Sign.Leo, Sign.Scorpio, Sign.Aquarius];

  if (cardinal.includes(sign)) return 'cardinal';
  if (fixed.includes(sign)) return 'fixed';
  return 'mutable';
}

/**
 * Get polarity for a sign.
 */
export function getPolarity(sign: Sign): 'positive' | 'negative' {
  const positive = [Sign.Aries, Sign.Gemini, Sign.Leo, Sign.Libra, Sign.Sagittarius, Sign.Aquarius];
  return positive.includes(sign) ? 'positive' : 'negative';
}

/**
 * Get quadrant for a house number.
 *
 * @param house - House number (1-12)
 * @returns Quadrant number (1-4)
 */
export function getQuadrant(house: number): 1 | 2 | 3 | 4 {
  if (house >= 1 && house <= 3) return 1;
  if (house >= 4 && house <= 6) return 2;
  if (house >= 7 && house <= 9) return 3;
  return 4;
}

/**
 * Get hemisphere for a house number.
 *
 * @param house - House number (1-12)
 * @returns Object with north/south and east/west
 */
export function getHemisphere(house: number): {
  vertical: 'north' | 'south';
  horizontal: 'east' | 'west';
} {
  // North = houses 1-6 (below horizon)
  // South = houses 7-12 (above horizon)
  const vertical = house >= 1 && house <= 6 ? 'north' : 'south';

  // East = houses 10, 11, 12, 1, 2, 3 (rising side)
  // West = houses 4, 5, 6, 7, 8, 9 (setting side)
  const eastern = [10, 11, 12, 1, 2, 3];
  const horizontal = eastern.includes(house) ? 'east' : 'west';

  return { vertical, horizontal };
}
