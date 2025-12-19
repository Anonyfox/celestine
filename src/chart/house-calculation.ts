/**
 * House Calculation for Charts
 *
 * Wrapper around the houses module for chart calculation.
 *
 * @module chart/house-calculation
 */

import { calculateHouses as calculateHousesCore } from '../houses/houses.js';
import type { GeographicLocation, HouseData, HouseSystem } from '../houses/types.js';
import { getSignName } from '../zodiac/sign-properties.js';
import { eclipticToZodiac } from '../zodiac/zodiac.js';
import {
  FALLBACK_HOUSE_SYSTEM,
  HOUSE_SYSTEM_NAMES,
  LATITUDE_SENSITIVE_SYSTEMS,
  MAX_LATITUDE_ANY,
  MAX_LATITUDE_PLACIDUS,
  POLAR_FALLBACK_HOUSE_SYSTEM,
} from './constants.js';
import type { ChartAngle, ChartAngles, ChartHouseCusp, ChartHouses } from './types.js';
import { CalculationError } from './types.js';

/**
 * Result of house calculation.
 */
export interface HouseCalculationResult {
  /** The house system actually used (may differ from requested) */
  system: HouseSystem;

  /** Human-readable system name */
  systemName: string;

  /** All four angles */
  angles: ChartAngles;

  /** All 12 house cusps */
  houses: ChartHouses;

  /** Warnings (e.g., if system was changed due to latitude) */
  warnings: string[];
}

/**
 * Calculate house cusps and angles for a chart.
 *
 * @param location - Geographic coordinates
 * @param lst - Local Sidereal Time in degrees
 * @param T - Julian Centuries from J2000.0
 * @param requestedSystem - Desired house system
 * @returns House calculation result with angles and cusps
 *
 * @throws {CalculationError} If house calculation fails
 */
export function calculateChartHouses(
  location: GeographicLocation,
  lst: number,
  T: number,
  requestedSystem: HouseSystem,
): HouseCalculationResult {
  const warnings: string[] = [];

  // Determine the actual system to use based on latitude
  let system = requestedSystem;
  const absLatitude = Math.abs(location.latitude);

  if (LATITUDE_SENSITIVE_SYSTEMS.includes(requestedSystem)) {
    if (absLatitude > MAX_LATITUDE_PLACIDUS) {
      warnings.push(
        `${requestedSystem} house system does not work at latitude ${location.latitude}°. ` +
          `Using ${FALLBACK_HOUSE_SYSTEM} instead.`,
      );
      system = FALLBACK_HOUSE_SYSTEM;
    }
  }

  if (absLatitude > MAX_LATITUDE_ANY) {
    warnings.push(
      `Latitude ${location.latitude}° is extremely close to pole. ` +
        `Using ${POLAR_FALLBACK_HOUSE_SYSTEM} house system.`,
    );
    system = POLAR_FALLBACK_HOUSE_SYSTEM;
  }

  // Calculate houses using the core module
  let houseData: HouseData;
  try {
    houseData = calculateHousesCore(location, lst, T, system);
  } catch (error) {
    // If calculation fails, try fallback
    if (system !== FALLBACK_HOUSE_SYSTEM) {
      warnings.push(`${system} house calculation failed. Using ${FALLBACK_HOUSE_SYSTEM} instead.`);
      system = FALLBACK_HOUSE_SYSTEM;
      houseData = calculateHousesCore(location, lst, T, system);
    } else {
      throw new CalculationError(
        `House calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'house-calculation',
        { location, lst, T, system },
      );
    }
  }

  // Build angles
  const angles = buildChartAngles(houseData);

  // Build house cusps
  const houses = buildChartHouses(houseData, system);

  return {
    system,
    systemName: HOUSE_SYSTEM_NAMES[system],
    angles,
    houses,
    warnings,
  };
}

/**
 * Build ChartAngles from house data.
 */
function buildChartAngles(houseData: HouseData): ChartAngles {
  return {
    ascendant: buildAngle('Ascendant', 'ASC', houseData.angles.ascendant),
    midheaven: buildAngle('Midheaven', 'MC', houseData.angles.midheaven),
    descendant: buildAngle('Descendant', 'DSC', houseData.angles.descendant),
    imumCoeli: buildAngle('Imum Coeli', 'IC', houseData.angles.imumCoeli),
  };
}

/**
 * Build a single ChartAngle.
 */
function buildAngle(
  name: 'Ascendant' | 'Midheaven' | 'Descendant' | 'Imum Coeli',
  abbrev: 'ASC' | 'MC' | 'DSC' | 'IC',
  longitude: number,
): ChartAngle {
  const zodiacPos = eclipticToZodiac(longitude);

  return {
    name,
    abbrev,
    longitude,
    sign: zodiacPos.sign,
    signName: getSignName(zodiacPos.sign),
    degree: zodiacPos.degree,
    minute: zodiacPos.minute,
    second: zodiacPos.second,
    formatted: zodiacPos.formatted,
  };
}

/**
 * Build ChartHouses from house data.
 */
function buildChartHouses(houseData: HouseData, system: HouseSystem): ChartHouses {
  const cusps: ChartHouseCusp[] = [];

  for (let i = 0; i < 12; i++) {
    const longitude = houseData.cusps.cusps[i];
    const nextLongitude = houseData.cusps.cusps[(i + 1) % 12];

    // Calculate house size
    let size = nextLongitude - longitude;
    if (size < 0) {
      size += 360;
    }

    const zodiacPos = eclipticToZodiac(longitude);

    cusps.push({
      house: i + 1,
      longitude,
      sign: zodiacPos.sign,
      signName: getSignName(zodiacPos.sign),
      degree: zodiacPos.degree,
      minute: zodiacPos.minute,
      formatted: zodiacPos.formatted,
      size,
    });
  }

  return {
    system,
    systemName: HOUSE_SYSTEM_NAMES[system],
    cusps,
  };
}

/**
 * Determine which house a longitude falls in.
 *
 * @param longitude - Ecliptic longitude (0-360)
 * @param cusps - Array of 12 house cusp longitudes
 * @returns House number (1-12)
 */
export function getHouseNumber(longitude: number, cusps: number[]): number {
  // Normalize longitude
  let lon = longitude % 360;
  if (lon < 0) {
    lon += 360;
  }

  for (let i = 0; i < 12; i++) {
    const cusp = cusps[i];
    const nextCusp = cusps[(i + 1) % 12];

    if (isInHouse(lon, cusp, nextCusp)) {
      return i + 1;
    }
  }

  // Should never reach here, but default to house 1
  return 1;
}

/**
 * Check if a longitude is within a house.
 */
function isInHouse(longitude: number, cusp: number, nextCusp: number): boolean {
  // Handle wraparound at 360°/0°
  if (nextCusp > cusp) {
    // Normal case: next cusp is ahead
    return longitude >= cusp && longitude < nextCusp;
  }
  // Wraparound case: house crosses 0°
  return longitude >= cusp || longitude < nextCusp;
}

/**
 * Get the cusps as a simple array of longitudes.
 */
export function getCuspLongitudes(houses: ChartHouses): number[] {
  return houses.cusps.map((c) => c.longitude);
}

/**
 * Check if a planet is on an angle (within orb).
 *
 * @param longitude - Planet longitude
 * @param angles - Chart angles
 * @param orb - Orb in degrees (default: 3°)
 * @returns The angle name if on an angle, null otherwise
 */
export function getAngleConjunction(
  longitude: number,
  angles: ChartAngles,
  orb = 3,
): 'ASC' | 'MC' | 'DSC' | 'IC' | null {
  const checkAngle = (angleLon: number, name: 'ASC' | 'MC' | 'DSC' | 'IC') => {
    let diff = Math.abs(longitude - angleLon);
    if (diff > 180) {
      diff = 360 - diff;
    }
    return diff <= orb ? name : null;
  };

  return (
    checkAngle(angles.ascendant.longitude, 'ASC') ??
    checkAngle(angles.midheaven.longitude, 'MC') ??
    checkAngle(angles.descendant.longitude, 'DSC') ??
    checkAngle(angles.imumCoeli.longitude, 'IC')
  );
}
