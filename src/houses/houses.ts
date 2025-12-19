/**
 * High-Level Houses API
 *
 * Main entry point for calculating astrological house cusps.
 * Supports all major house systems with a unified interface.
 *
 * @module houses
 */

import { calculateAngles } from './angles.js';
import { campanusHouses } from './house-systems/campanus.js';
import { equalHouses } from './house-systems/equal.js';
import { kochHouses } from './house-systems/koch.js';
import { placidusHouses } from './house-systems/placidus.js';
import { porphyryHouses } from './house-systems/porphyry.js';
import { regiomontanusHouses } from './house-systems/regiomontanus.js';
import { wholeSignHouses } from './house-systems/whole-sign.js';
import { meanObliquity } from './obliquity.js';
import type { Angles, GeographicLocation, HouseCusps, HouseData, HouseSystem } from './types.js';
import { validateLocation } from './validation.js';

/**
 * Calculate house cusps for a given location, time, and house system
 *
 * This is the main function for calculating astrological houses.
 * It handles all the complexity of different house systems and provides
 * a unified interface.
 *
 * @param location - Geographic coordinates (latitude/longitude)
 * @param lst - Local Sidereal Time in degrees (0-360)
 * @param julianCenturies - Time in Julian centuries from J2000.0 (for obliquity)
 * @param system - House system to use (default: 'placidus')
 * @returns House data including cusps and angles
 *
 * @throws {Error} If location is invalid or calculations fail
 *
 * @example
 * ```typescript
 * import { calculateHouses } from './houses/index.js';
 *
 * const location = { latitude: 51.5074, longitude: -0.1278 }; // London
 * const lst = 180.5; // Local Sidereal Time
 * const T = 0.0; // J2000.0 epoch
 *
 * const houses = calculateHouses(location, lst, T, 'placidus');
 * console.log(houses.angles.ascendant); // Ascendant degree
 * console.log(houses.cusps.cusps[0]);   // House 1 cusp (same as ASC)
 * ```
 */
export function calculateHouses(
  location: GeographicLocation,
  lst: number,
  julianCenturies: number,
  system: HouseSystem = 'placidus',
): HouseData {
  // Validate location
  const validation = validateLocation(location);
  if (!validation.valid) {
    throw new Error(`Invalid location: ${validation.errors.join(', ')}`);
  }

  const { latitude } = location;

  // Calculate obliquity for the given time
  const obliquity = meanObliquity(julianCenturies);

  // Calculate the four angles
  const angles = calculateAngles(lst, obliquity, latitude);

  // Calculate house cusps based on system
  let cusps: HouseCusps;

  switch (system) {
    case 'equal':
      cusps = equalHouses(angles.ascendant);
      break;

    case 'whole-sign':
      cusps = wholeSignHouses(angles.ascendant);
      break;

    case 'porphyry':
      cusps = porphyryHouses(angles.ascendant, angles.midheaven);
      break;

    case 'placidus':
      cusps = placidusHouses(angles.ascendant, angles.midheaven, latitude, obliquity);
      break;

    case 'koch':
      cusps = kochHouses(angles.ascendant, angles.midheaven, latitude, obliquity);
      break;

    case 'regiomontanus':
      cusps = regiomontanusHouses(angles.ascendant, angles.midheaven, latitude, obliquity);
      break;

    case 'campanus':
      cusps = campanusHouses(angles.ascendant, angles.midheaven, latitude, obliquity);
      break;

    default:
      // TypeScript should prevent this, but be defensive
      throw new Error(`Unknown house system: ${system}`);
  }

  return {
    system,
    angles,
    cusps,
    latitude: location.latitude,
    longitude: location.longitude,
    lst,
    obliquity,
  };
}

/**
 * Calculate just the angles (ASC, MC, DSC, IC) without house cusps
 *
 * Useful when you only need the four angles and not the full house division.
 *
 * @param location - Geographic coordinates
 * @param lst - Local Sidereal Time in degrees
 * @param julianCenturies - Time in Julian centuries from J2000.0
 * @returns The four angles
 *
 * @throws {Error} If location is invalid
 *
 * @example
 * ```typescript
 * const angles = calculateAnglesOnly(
 *   { latitude: 51.5074, longitude: -0.1278 },
 *   180.5,
 *   0.0
 * );
 * console.log(angles.ascendant);  // ASC
 * console.log(angles.midheaven);  // MC
 * ```
 */
export function calculateAnglesOnly(
  location: GeographicLocation,
  lst: number,
  julianCenturies: number,
): Angles {
  // Validate location
  const validation = validateLocation(location);
  if (!validation.valid) {
    throw new Error(`Invalid location: ${validation.errors.join(', ')}`);
  }

  const obliquity = meanObliquity(julianCenturies);
  return calculateAngles(lst, obliquity, location.latitude);
}

/**
 * Calculate house cusps for multiple systems at once
 *
 * Efficient when you need to compare different house systems.
 * Calculates angles once and reuses them for all systems.
 *
 * @param location - Geographic coordinates
 * @param lst - Local Sidereal Time in degrees
 * @param julianCenturies - Time in Julian centuries from J2000.0
 * @param systems - Array of house systems to calculate (default: all)
 * @returns Map of system name to house data
 *
 * @example
 * ```typescript
 * const comparison = calculateMultipleSystems(
 *   { latitude: 51.5074, longitude: -0.1278 },
 *   180.5,
 *   0.0,
 *   ['placidus', 'koch', 'equal']
 * );
 *
 * console.log(comparison.placidus.cusps.cusps[1]); // House 2 in Placidus
 * console.log(comparison.koch.cusps.cusps[1]);     // House 2 in Koch
 * ```
 */
export function calculateMultipleSystems(
  location: GeographicLocation,
  lst: number,
  julianCenturies: number,
  systems: HouseSystem[] = [
    'equal',
    'whole-sign',
    'porphyry',
    'placidus',
    'koch',
    'regiomontanus',
    'campanus',
  ],
): Record<HouseSystem, HouseData> {
  const results: Partial<Record<HouseSystem, HouseData>> = {};

  for (const system of systems) {
    results[system] = calculateHouses(location, lst, julianCenturies, system);
  }

  return results as Record<HouseSystem, HouseData>;
}

/**
 * Get a list of all supported house systems
 *
 * @returns Array of house system identifiers
 */
export function getSupportedHouseSystems(): HouseSystem[] {
  return ['equal', 'whole-sign', 'porphyry', 'placidus', 'koch', 'regiomontanus', 'campanus'];
}

/**
 * Get a human-readable name for a house system
 *
 * @param system - House system identifier
 * @returns Display name
 *
 * @example
 * ```typescript
 * getHouseSystemName('placidus');     // "Placidus"
 * getHouseSystemName('whole-sign');   // "Whole Sign"
 * ```
 */
export function getHouseSystemName(system: HouseSystem): string {
  const names: Record<HouseSystem, string> = {
    equal: 'Equal',
    'whole-sign': 'Whole Sign',
    porphyry: 'Porphyry',
    placidus: 'Placidus',
    koch: 'Koch',
    regiomontanus: 'Regiomontanus',
    campanus: 'Campanus',
  };

  return names[system];
}

/**
 * Check if a house system requires latitude
 *
 * Simple systems like Equal and Whole Sign don't use latitude.
 * Complex systems like Placidus and Koch require it.
 *
 * @param system - House system identifier
 * @returns True if latitude is required for calculations
 */
export function systemRequiresLatitude(system: HouseSystem): boolean {
  return system !== 'equal' && system !== 'whole-sign';
}

/**
 * Check if a house system works at extreme latitudes (>66°)
 *
 * Placidus and Koch fail near polar circles and fall back to Porphyry.
 * Other systems work at all latitudes.
 *
 * @param system - House system identifier
 * @returns True if system works at extreme latitudes
 */
export function systemWorksAtPolarCircle(system: HouseSystem): boolean {
  return system !== 'placidus' && system !== 'koch';
}
