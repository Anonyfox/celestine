/**
 * Aspect Detection
 *
 * Core functions for detecting aspects between celestial bodies.
 *
 * @module aspects/aspect-detection
 *
 * @remarks
 * This module combines angular separation with orb checking to detect
 * actual aspects between planetary positions.
 *
 * @see IMPL.md Section 4 for algorithm specification
 */

import { angularSeparation, signSeparation } from './angular-separation.js';
import { ASPECT_SIGN_SEPARATIONS } from './constants.js';
import { calculateStrength, findMatchingAspect, getOrb } from './orbs.js';
import type { Aspect, AspectBody, AspectCalculationResult, AspectConfig } from './types.js';
import { AspectType } from './types.js';

/**
 * Check if an aspect is out-of-sign (dissociate).
 *
 * @param lon1 - First body's ecliptic longitude
 * @param lon2 - Second body's ecliptic longitude
 * @param aspectType - The type of aspect
 * @returns True if the aspect is out-of-sign
 *
 * @remarks
 * An out-of-sign aspect occurs when two bodies form an aspect by degree
 * but are NOT in signs that traditionally form that aspect.
 *
 * Example: A trine at 28° Aries to 2° Virgo is out-of-sign because
 * Aries-Virgo don't form a traditional trine relationship (Fire-Earth).
 *
 * @example
 * ```typescript
 * // In-sign trine (Aries to Leo = Fire to Fire)
 * isOutOfSign(15, 135, AspectType.Trine) // false
 *
 * // Out-of-sign trine (Aries to Virgo)
 * isOutOfSign(28, 152, AspectType.Trine) // true
 * ```
 */
export function isOutOfSign(lon1: number, lon2: number, aspectType: AspectType): boolean {
  const signSep = signSeparation(lon1, lon2);
  const expectedSeps = ASPECT_SIGN_SEPARATIONS[aspectType];

  return !expectedSeps.includes(signSep);
}

/**
 * Detect an aspect between two bodies.
 *
 * @param body1 - First celestial body
 * @param body2 - Second celestial body
 * @param config - Configuration for aspect detection
 * @returns Detected aspect or null if no aspect within orb
 *
 * @example
 * ```typescript
 * const sun = { name: 'Sun', longitude: 280.37, longitudeSpeed: 1.02 };
 * const moon = { name: 'Moon', longitude: 223.32, longitudeSpeed: 13.18 };
 *
 * const aspect = detectAspect(sun, moon);
 * // { type: 'sextile', separation: 57.05, deviation: 2.95, ... }
 * ```
 */
export function detectAspect(
  body1: AspectBody,
  body2: AspectBody,
  config?: AspectConfig,
): Aspect | null {
  // Calculate angular separation
  const separation = angularSeparation(body1.longitude, body2.longitude);

  // Find matching aspect
  const match = findMatchingAspect(separation, config);
  if (!match) {
    return null;
  }

  const { aspect: definition, deviation } = match;
  const orb = getOrb(definition.type, config);

  // Calculate strength
  let strength = calculateStrength(deviation, orb);

  // Check out-of-sign
  const outOfSign = isOutOfSign(body1.longitude, body2.longitude, definition.type);

  // Apply out-of-sign penalty if configured
  if (outOfSign && config?.outOfSignPenalty) {
    strength = Math.round(strength * (1 - config.outOfSignPenalty));
  }

  // Check minimum strength filter
  if (config?.minimumStrength && strength < config.minimumStrength) {
    return null;
  }

  // Determine applying/separating if we have speed data
  let isApplying: boolean | null = null;
  if (
    config?.includeApplying !== false &&
    body1.longitudeSpeed !== undefined &&
    body2.longitudeSpeed !== undefined
  ) {
    isApplying = calculateIsApplying(
      body1.longitude,
      body2.longitude,
      body1.longitudeSpeed,
      body2.longitudeSpeed,
      definition.angle,
    );
  }

  // Filter out-of-sign if not wanted
  if (outOfSign && config?.includeOutOfSign === false) {
    return null;
  }

  return {
    body1: body1.name,
    body2: body2.name,
    type: definition.type,
    angle: definition.angle,
    separation,
    deviation,
    orb,
    strength,
    isApplying,
    isOutOfSign: outOfSign,
    symbol: definition.symbol,
  };
}

/**
 * Determine if an aspect is applying or separating.
 *
 * @param lon1 - First body longitude
 * @param lon2 - Second body longitude
 * @param speed1 - First body speed (°/day)
 * @param speed2 - Second body speed (°/day)
 * @param aspectAngle - The exact angle for this aspect type
 * @returns True if applying, false if separating
 *
 * @remarks
 * An aspect is "applying" when the angular distance to exact is decreasing.
 * This is calculated by comparing current deviation to future deviation.
 */
function calculateIsApplying(
  lon1: number,
  lon2: number,
  speed1: number,
  speed2: number,
  aspectAngle: number,
): boolean {
  // Current separation and deviation
  const currentSep = angularSeparation(lon1, lon2);
  const currentDev = Math.abs(currentSep - aspectAngle);

  // Future positions (1 day later)
  const futureLon1 = lon1 + speed1;
  const futureLon2 = lon2 + speed2;

  // Future separation and deviation
  const futureSep = angularSeparation(futureLon1, futureLon2);
  const futureDev = Math.abs(futureSep - aspectAngle);

  // Applying if deviation is decreasing
  return futureDev < currentDev;
}

/**
 * Find all aspects between a set of bodies.
 *
 * @param bodies - Array of celestial bodies with positions
 * @param config - Configuration for aspect detection
 * @returns All detected aspects
 *
 * @remarks
 * Checks all unique pairs of bodies. Does not check self-aspects.
 * Results are sorted by strength (strongest first).
 *
 * @example
 * ```typescript
 * const bodies = [
 *   { name: 'Sun', longitude: 280.37 },
 *   { name: 'Moon', longitude: 223.32 },
 *   { name: 'Mercury', longitude: 271.89 },
 * ];
 *
 * const aspects = findAllAspects(bodies);
 * ```
 */
export function findAllAspects(bodies: AspectBody[], config?: AspectConfig): Aspect[] {
  const aspects: Aspect[] = [];

  // Check all unique pairs
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const aspect = detectAspect(bodies[i], bodies[j], config);
      if (aspect) {
        aspects.push(aspect);
      }
    }
  }

  // Sort by strength (strongest first)
  return aspects.sort((a, b) => b.strength - a.strength);
}

/**
 * Calculate aspects with full result metadata.
 *
 * @param bodies - Array of celestial bodies with positions
 * @param config - Configuration for aspect detection
 * @returns Complete calculation result with metadata
 */
export function calculateAspects(
  bodies: AspectBody[],
  config?: AspectConfig,
): AspectCalculationResult {
  const effectiveConfig: AspectConfig = {
    aspectTypes: config?.aspectTypes ?? [
      AspectType.Conjunction,
      AspectType.Sextile,
      AspectType.Square,
      AspectType.Trine,
      AspectType.Opposition,
    ],
    orbs: config?.orbs ?? {},
    includeOutOfSign: config?.includeOutOfSign ?? true,
    outOfSignPenalty: config?.outOfSignPenalty ?? 0,
    minimumStrength: config?.minimumStrength ?? 0,
    includeApplying: config?.includeApplying ?? true,
  };

  const aspects = findAllAspects(bodies, effectiveConfig);
  const bodyNames = bodies.map((b) => b.name);

  // Calculate pairs checked
  const n = bodies.length;
  const pairsChecked = (n * (n - 1)) / 2;

  return {
    aspects,
    config: effectiveConfig,
    bodies: bodyNames,
    pairsChecked,
  };
}

/**
 * Get a summary of aspects by type.
 *
 * @param aspects - Array of detected aspects
 * @returns Count of each aspect type
 */
export function getAspectSummary(aspects: Aspect[]): Record<AspectType, number> {
  const summary: Partial<Record<AspectType, number>> = {};

  for (const aspect of aspects) {
    summary[aspect.type] = (summary[aspect.type] ?? 0) + 1;
  }

  // Fill in zeros for missing types
  for (const type of Object.values(AspectType)) {
    if (!(type in summary)) {
      summary[type] = 0;
    }
  }

  return summary as Record<AspectType, number>;
}

/**
 * Filter aspects by type(s).
 *
 * @param aspects - Array of aspects to filter
 * @param types - Aspect type(s) to include
 * @returns Filtered aspects
 */
export function filterAspectsByType(aspects: Aspect[], types: AspectType | AspectType[]): Aspect[] {
  const typeArray = Array.isArray(types) ? types : [types];
  return aspects.filter((a) => typeArray.includes(a.type));
}

/**
 * Filter aspects by body.
 *
 * @param aspects - Array of aspects to filter
 * @param bodyName - Name of body to filter for
 * @returns Aspects involving the specified body
 */
export function filterAspectsByBody(aspects: Aspect[], bodyName: string): Aspect[] {
  return aspects.filter((a) => a.body1 === bodyName || a.body2 === bodyName);
}

/**
 * Get the strongest aspect for a body.
 *
 * @param aspects - Array of aspects
 * @param bodyName - Name of body
 * @returns Strongest aspect involving the body, or null
 */
export function getStrongestAspect(aspects: Aspect[], bodyName: string): Aspect | null {
  const bodyAspects = filterAspectsByBody(aspects, bodyName);
  return bodyAspects.length > 0 ? bodyAspects[0] : null; // Already sorted by strength
}

/**
 * Format an aspect for display.
 *
 * @param aspect - The aspect to format
 * @returns Human-readable string
 *
 * @example
 * ```typescript
 * formatAspect(aspect)
 * // "Sun △ Saturn (0°05', 99%, applying)"
 * ```
 */
export function formatAspect(aspect: Aspect): string {
  const deg = Math.floor(aspect.deviation);
  const min = Math.round((aspect.deviation - deg) * 60);
  const orbStr = `${deg}°${min.toString().padStart(2, '0')}'`;

  const applyingStr =
    aspect.isApplying === null ? '' : aspect.isApplying ? ', applying' : ', separating';

  const oosStr = aspect.isOutOfSign ? ', out-of-sign' : '';

  return `${aspect.body1} ${aspect.symbol} ${aspect.body2} (${orbStr}, ${aspect.strength}%${applyingStr}${oosStr})`;
}
