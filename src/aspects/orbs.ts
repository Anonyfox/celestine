/**
 * Orb Handling and Configuration
 *
 * Functions for managing aspect orbs and calculating aspect strength.
 *
 * @module aspects/orbs
 *
 * @remarks
 * Orbs define the allowable deviation from exact aspect angles.
 * Wider orbs = more aspects detected; tighter orbs = fewer, stronger aspects.
 *
 * @see IMPL.md Section 3 for orb system specification
 */

import { ASPECT_DEFINITIONS, DEFAULT_ORBS } from './constants.js';
import type { AspectConfig, AspectDefinition } from './types.js';
import { AspectType } from './types.js';

/**
 * Get the effective orb for an aspect type, considering configuration.
 *
 * @param aspectType - The type of aspect
 * @param config - Optional configuration with custom orbs
 * @returns Effective orb in degrees
 *
 * @example
 * ```typescript
 * // Default orb
 * getOrb(AspectType.Trine) // 8
 *
 * // Custom orb
 * getOrb(AspectType.Trine, { orbs: { trine: 6 } }) // 6
 * ```
 */
export function getOrb(aspectType: AspectType, config?: AspectConfig): number {
  // Check for custom orb in config
  if (config?.orbs?.[aspectType] !== undefined) {
    return config.orbs[aspectType];
  }

  // Return default orb
  return DEFAULT_ORBS[aspectType];
}

/**
 * Calculate aspect strength based on deviation from exact.
 *
 * @param deviation - Angular deviation from exact aspect in degrees (always positive)
 * @param orb - The orb being used for this aspect
 * @returns Strength as percentage (100 = exact, 0 = at orb edge)
 *
 * @remarks
 * Strength decreases linearly from 100% at exact to 0% at orb boundary.
 * This is a simple linear model; some traditions use other decay curves.
 *
 * Formula: strength = 100 × (1 - deviation/orb)
 *
 * @example
 * ```typescript
 * calculateStrength(0, 8)   // 100 (exact)
 * calculateStrength(4, 8)   // 50  (halfway)
 * calculateStrength(8, 8)   // 0   (at orb edge)
 * calculateStrength(2, 8)   // 75
 * ```
 */
export function calculateStrength(deviation: number, orb: number): number {
  if (orb <= 0) {
    return deviation === 0 ? 100 : 0;
  }

  if (deviation < 0) {
    deviation = Math.abs(deviation);
  }

  if (deviation >= orb) {
    return 0;
  }

  return Math.round(100 * (1 - deviation / orb));
}

/**
 * Check if a separation falls within orb of an aspect angle.
 *
 * @param separation - Angular separation between two bodies (0-180°)
 * @param aspectAngle - The exact angle for the aspect type
 * @param orb - The orb to use
 * @returns True if the separation is within orb of the aspect angle
 *
 * @example
 * ```typescript
 * isWithinOrb(88, 90, 7)   // true (square with 2° deviation)
 * isWithinOrb(85, 90, 3)   // false (5° deviation, only 3° orb)
 * isWithinOrb(120, 120, 8) // true (exact trine)
 * ```
 */
export function isWithinOrb(separation: number, aspectAngle: number, orb: number): boolean {
  const deviation = Math.abs(separation - aspectAngle);
  return deviation <= orb;
}

/**
 * Find which aspect (if any) a separation matches.
 *
 * @param separation - Angular separation between two bodies (0-180°)
 * @param config - Configuration specifying which aspects to check and orbs
 * @returns The matching aspect definition and deviation, or null if no match
 *
 * @remarks
 * When multiple aspects could match (rare with reasonable orbs),
 * returns the one with smallest deviation (closest to exact).
 *
 * @example
 * ```typescript
 * const result = findMatchingAspect(88, { aspectTypes: [AspectType.Square] });
 * // { aspect: { type: 'square', angle: 90, ... }, deviation: 2 }
 * ```
 */
export function findMatchingAspect(
  separation: number,
  config?: AspectConfig,
): { aspect: AspectDefinition; deviation: number } | null {
  // Determine which aspects to check
  const aspectTypes = config?.aspectTypes ?? [
    AspectType.Conjunction,
    AspectType.Sextile,
    AspectType.Square,
    AspectType.Trine,
    AspectType.Opposition,
  ];

  let bestMatch: { aspect: AspectDefinition; deviation: number } | null = null;

  for (const type of aspectTypes) {
    const definition = ASPECT_DEFINITIONS[type];
    const orb = getOrb(type, config);
    const deviation = Math.abs(separation - definition.angle);

    if (deviation <= orb) {
      // Found a match - check if it's better than previous
      if (bestMatch === null || deviation < bestMatch.deviation) {
        bestMatch = { aspect: definition, deviation };
      }
    }
  }

  return bestMatch;
}

/**
 * Get all aspects that a separation could match (for debugging/analysis).
 *
 * @param separation - Angular separation between two bodies (0-180°)
 * @param config - Configuration specifying which aspects to check and orbs
 * @returns Array of matching aspects with deviations, sorted by deviation
 *
 * @remarks
 * Normally you'd use findMatchingAspect which returns only the best match.
 * This function is useful for understanding edge cases where multiple
 * aspects are within orb.
 */
export function findAllMatchingAspects(
  separation: number,
  config?: AspectConfig,
): Array<{ aspect: AspectDefinition; deviation: number }> {
  const aspectTypes = config?.aspectTypes ?? [
    AspectType.Conjunction,
    AspectType.Sextile,
    AspectType.Square,
    AspectType.Trine,
    AspectType.Opposition,
  ];

  const matches: Array<{ aspect: AspectDefinition; deviation: number }> = [];

  for (const type of aspectTypes) {
    const definition = ASPECT_DEFINITIONS[type];
    const orb = getOrb(type, config);
    const deviation = Math.abs(separation - definition.angle);

    if (deviation <= orb) {
      matches.push({ aspect: definition, deviation });
    }
  }

  // Sort by deviation (closest first)
  return matches.sort((a, b) => a.deviation - b.deviation);
}

/**
 * Apply out-of-sign penalty to strength.
 *
 * @param strength - Original strength (0-100)
 * @param isOutOfSign - Whether the aspect is out-of-sign
 * @param penalty - Penalty factor (0-1), e.g., 0.2 = 20% reduction
 * @returns Adjusted strength
 *
 * @remarks
 * Out-of-sign aspects are traditionally considered weaker.
 * This function applies a configurable penalty.
 *
 * Formula: adjustedStrength = strength × (1 - penalty) if out-of-sign
 *
 * @example
 * ```typescript
 * applyOutOfSignPenalty(80, false, 0.2) // 80 (no penalty)
 * applyOutOfSignPenalty(80, true, 0.2)  // 64 (20% reduction)
 * applyOutOfSignPenalty(80, true, 0)    // 80 (no penalty configured)
 * ```
 */
export function applyOutOfSignPenalty(
  strength: number,
  isOutOfSign: boolean,
  penalty: number,
): number {
  if (!isOutOfSign || penalty <= 0) {
    return strength;
  }

  // Clamp penalty to 0-1
  const clampedPenalty = Math.min(1, Math.max(0, penalty));
  return Math.round(strength * (1 - clampedPenalty));
}

/**
 * Create an aspect configuration with defaults filled in.
 *
 * @param partial - Partial configuration to merge with defaults
 * @returns Complete configuration with all values defined
 */
export function createAspectConfig(partial?: Partial<AspectConfig>): Required<AspectConfig> {
  return {
    aspectTypes: partial?.aspectTypes ?? [
      AspectType.Conjunction,
      AspectType.Sextile,
      AspectType.Square,
      AspectType.Trine,
      AspectType.Opposition,
    ],
    orbs: partial?.orbs ?? {},
    includeOutOfSign: partial?.includeOutOfSign ?? true,
    outOfSignPenalty: partial?.outOfSignPenalty ?? 0,
    minimumStrength: partial?.minimumStrength ?? 0,
    includeApplying: partial?.includeApplying ?? true,
  };
}
