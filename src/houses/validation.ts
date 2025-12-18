/**
 * Validation functions for geographic locations and house system compatibility
 *
 * Validates location coordinates and determines which house systems can be used
 * at a given latitude.
 */

import {
  MAX_ABSOLUTE_LATITUDE,
  MAX_LATITUDE_PLACIDUS,
} from './constants.js';
import type { GeographicLocation, HouseSystem, LocationValidationResult } from './types.js';

/**
 * Normalize latitude to valid range (-90 to +90)
 *
 * Latitudes beyond ±90 are folded back into the valid range with appropriate
 * hemisphere flipping.
 *
 * @param lat - Input latitude in degrees
 * @returns Normalized latitude in range [-90, +90]
 *
 * @example
 * ```typescript
 * normalizeLatitude(45.5)     // 45.5 (already valid)
 * normalizeLatitude(95)       // 85 (folded back)
 * normalizeLatitude(-95)      // -85 (folded back)
 * normalizeLatitude(180)      // 0 (complete fold)
 * ```
 */
export function normalizeLatitude(lat: number): number {
  // Fold latitude into -180 to +180 range first
  let normalized = ((lat % 360) + 360) % 360;

  // Now fold into -90 to +90
  if (normalized > 180) {
    normalized = normalized - 360;
  }

  if (normalized > 90) {
    normalized = 180 - normalized;
  } else if (normalized < -90) {
    normalized = -180 - normalized;
  }

  return normalized;
}

/**
 * Normalize longitude to valid range (-180 to +180)
 *
 * Accepts both -180/+180 and 0/360 formats and normalizes to -180/+180.
 *
 * @param lon - Input longitude in degrees
 * @returns Normalized longitude in range (-180, +180]
 *
 * @example
 * ```typescript
 * normalizeLongitude(45.5)      // 45.5 (already valid)
 * normalizeLongitude(185)       // -175 (wrapped)
 * normalizeLongitude(-185)      // 175 (wrapped)
 * normalizeLongitude(360)       // 0 (wrapped)
 * normalizeLongitude(720)       // 0 (multiple wraps)
 * ```
 */
export function normalizeLongitude(lon: number): number {
  // Reduce to -180 to +180 range
  let normalized = ((lon % 360) + 360) % 360;

  // Convert 180-360 to negative range
  // Special case: keep 180 as 180 (not -180)
  if (normalized > 180) {
    normalized = normalized - 360;
  }

  return normalized;
}

/**
 * Validate a geographic location
 *
 * Checks if latitude and longitude are within valid ranges and returns
 * detailed error messages if invalid.
 *
 * Note: This does NOT normalize the values - it checks them as-is.
 * Use `normalizeLatitude`/`normalizeLongitude` first if needed.
 *
 * @param location - Geographic location to validate
 * @returns Validation result with error messages
 *
 * @example
 * ```typescript
 * validateLocation({ latitude: 51.5, longitude: -0.1 })
 * // { valid: true, errors: [] }
 *
 * validateLocation({ latitude: 95, longitude: -0.1 })
 * // { valid: false, errors: ['Latitude must be between -90 and +90, got 95'] }
 * ```
 */
export function validateLocation(location: GeographicLocation): LocationValidationResult {
  const errors: string[] = [];

  // Validate latitude
  if (typeof location.latitude !== 'number' || !Number.isFinite(location.latitude)) {
    errors.push('Latitude must be a finite number');
  } else if (
    location.latitude < -MAX_ABSOLUTE_LATITUDE ||
    location.latitude > MAX_ABSOLUTE_LATITUDE
  ) {
    errors.push(
      `Latitude must be between -${MAX_ABSOLUTE_LATITUDE} and +${MAX_ABSOLUTE_LATITUDE}, got ${location.latitude}`,
    );
  }

  // Validate longitude
  if (typeof location.longitude !== 'number' || !Number.isFinite(location.longitude)) {
    errors.push('Longitude must be a finite number');
  } else if (
    location.longitude < -360 ||
    location.longitude > 360
  ) {
    // Allow both -180/+180 and 0/360 formats, but nothing beyond that
    errors.push(
      `Longitude must be between -360 and +360, got ${location.longitude}`,
    );
  }

  // Validate elevation if present
  if (location.elevation !== undefined) {
    if (typeof location.elevation !== 'number' || !Number.isFinite(location.elevation)) {
      errors.push('Elevation must be a finite number');
    } else if (location.elevation < -500 || location.elevation > 10000) {
      // Reasonable range: Dead Sea (-430m) to Mount Everest (8849m) with buffer
      errors.push(
        `Elevation ${location.elevation}m is outside reasonable range (-500 to 10000 meters)`,
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if a house system is available at a given latitude
 *
 * Some house systems (Placidus, Koch) fail at extreme latitudes
 * (above ~66°, the Arctic/Antarctic circles) where some ecliptic degrees
 * never rise or set during certain times of year.
 *
 * @param system - House system to check
 * @param latitude - Geographic latitude in degrees
 * @returns true if the system can be used at this latitude
 *
 * @example
 * ```typescript
 * isHouseSystemAvailable('placidus', 51.5)   // true (London)
 * isHouseSystemAvailable('placidus', 70)     // false (Arctic)
 * isHouseSystemAvailable('equal', 70)        // true (works everywhere)
 * isHouseSystemAvailable('placidus', 90)     // false (North Pole)
 * ```
 */
export function isHouseSystemAvailable(system: HouseSystem, latitude: number): boolean {
  const absLatitude = Math.abs(latitude);

  switch (system) {
    case 'placidus':
    case 'koch':
      // These systems fail above ~66° latitude (Arctic/Antarctic circles)
      return absLatitude < MAX_LATITUDE_PLACIDUS;

    case 'equal':
    case 'whole-sign':
      // These systems work at all latitudes except exact poles
      return absLatitude < MAX_ABSOLUTE_LATITUDE;

    case 'porphyry':
    case 'regiomontanus':
    case 'campanus':
      // These systems work at most latitudes but may have issues near poles
      // Using a more conservative limit than Placidus
      return absLatitude < MAX_ABSOLUTE_LATITUDE;

    default:
      // Unknown system - assume it works
      return true;
  }
}

/**
 * Get list of available house systems for a given latitude
 *
 * Returns all house systems that can be calculated at the specified latitude.
 *
 * @param latitude - Geographic latitude in degrees
 * @returns Array of available house systems
 *
 * @example
 * ```typescript
 * getAvailableHouseSystems(51.5)   // All systems (London)
 * getAvailableHouseSystems(70)     // ['equal', 'whole-sign', 'porphyry', ...]
 * getAvailableHouseSystems(90)     // ['equal', 'whole-sign'] (North Pole)
 * ```
 */
export function getAvailableHouseSystems(latitude: number): HouseSystem[] {
  const systems: HouseSystem[] = [
    'placidus',
    'koch',
    'equal',
    'whole-sign',
    'porphyry',
    'regiomontanus',
    'campanus',
  ];

  return systems.filter((system) => isHouseSystemAvailable(system, latitude));
}

/**
 * Get a fallback house system for extreme latitudes
 *
 * When Placidus or other systems fail at high latitudes, this suggests
 * an appropriate alternative system that works everywhere.
 *
 * @param preferredSystem - The originally requested system
 * @param latitude - Geographic latitude in degrees
 * @returns Original system if available, otherwise a suitable fallback
 *
 * @example
 * ```typescript
 * getFallbackHouseSystem('placidus', 51.5)   // 'placidus' (works here)
 * getFallbackHouseSystem('placidus', 70)     // 'porphyry' (fallback)
 * getFallbackHouseSystem('equal', 70)        // 'equal' (works here)
 * ```
 */
export function getFallbackHouseSystem(
  preferredSystem: HouseSystem,
  latitude: number,
): HouseSystem {
  // If the preferred system works, use it
  if (isHouseSystemAvailable(preferredSystem, latitude)) {
    return preferredSystem;
  }

  // Otherwise, suggest fallbacks in order of preference:
  // 1. Porphyry (simple quadrant system)
  // 2. Equal (works everywhere except poles)
  // 3. Whole Sign (works everywhere except poles)

  const fallbackOrder: HouseSystem[] = ['porphyry', 'equal', 'whole-sign'];

  for (const fallback of fallbackOrder) {
    if (isHouseSystemAvailable(fallback, latitude)) {
      return fallback;
    }
  }

  // If we get here, we're at the exact poles - return equal houses
  return 'equal';
}

