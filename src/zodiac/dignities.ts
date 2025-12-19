/**
 * Planetary dignities
 *
 * Functions for determining essential dignities (domicile, exaltation,
 * detriment, fall, peregrine) of planets in zodiac signs.
 *
 * **Essential Dignity Hierarchy (checked in order):**
 * 1. Domicile (+5 points) - Planet rules the sign
 * 2. Detriment (-5 points) - Planet in sign opposite its rulership
 * 3. Exaltation (+4 points) - Planet exalted in the sign
 * 4. Fall (-4 points) - Planet in sign opposite its exaltation
 * 5. Peregrine (0 points) - No special dignity (default)
 *
 * **Traditional Sources:**
 * - Ptolemy's "Tetrabiblos" (c. 160 CE), Book I, Chapters 18-20
 *   Original dignity system from Hellenistic astrology
 * - William Lilly's "Christian Astrology" (1647), Pages 104-115
 *   Comprehensive dignity tables with exact exaltation degrees
 *
 * **Important Note:**
 * Domicile takes precedence over exaltation. For example, Mercury in Virgo
 * is in domicile (Mercury rules Virgo), not in exaltation, even though
 * Mercury is also exalted in Virgo. This follows traditional doctrine.
 *
 * @see Ptolemy's Tetrabiblos: https://www.sacred-texts.com/astro/ptb/
 * @see Skyscript: https://www.skyscript.co.uk/dignities.html
 * @module zodiac/dignities
 */

import { DIGNITY_STRENGTH, EXALTATIONS, PLANETARY_RULERSHIPS } from './constants.js';
import type { Dignity } from './types.js';
import { DignityState, type Planet, Sign } from './types.js';

/**
 * Get planetary dignity for a planet in a given sign
 *
 * Determines the essential dignity state of a planet based on the sign
 * it occupies. Checks in order: domicile, detriment, exaltation, fall,
 * then defaults to peregrine.
 *
 * **Dignity hierarchy:**
 * 1. Domicile (+5): Planet rules the sign
 * 2. Detriment (-5): Planet in sign opposite its rulership
 * 3. Exaltation (+4): Planet exalted in the sign
 * 4. Fall (-4): Planet in sign opposite its exaltation
 * 5. Peregrine (0): No special dignity
 *
 * @param planet - The planet to evaluate
 * @param sign - The sign the planet is in
 * @param degree - Optional: degree within sign (0-29) for exact exaltation check
 * @returns Dignity information including state, strength, and description
 *
 * @example
 * ```typescript
 * // Mars in Aries: Domicile
 * const marsAries = getPlanetaryDignity(Planet.Mars, Sign.Aries);
 * // marsAries.state = DignityState.Domicile
 * // marsAries.strength = +5
 * ```
 *
 * @example
 * ```typescript
 * // Mars in Libra: Detriment (opposite Aries)
 * const marsLibra = getPlanetaryDignity(Planet.Mars, Sign.Libra);
 * // marsLibra.state = DignityState.Detriment
 * // marsLibra.strength = -5
 * ```
 *
 * @example
 * ```typescript
 * // Mars in Capricorn at 28°: Exaltation at exact degree
 * const marsCap = getPlanetaryDignity(Planet.Mars, Sign.Capricorn, 28);
 * // marsCap.state = DignityState.Exaltation
 * // marsCap.exaltationDegree = 28
 * ```
 *
 * @example
 * ```typescript
 * // Mars in Taurus: Peregrine (no special dignity)
 * const marsTaurus = getPlanetaryDignity(Planet.Mars, Sign.Taurus);
 * // marsTaurus.state = DignityState.Peregrine
 * // marsTaurus.strength = 0
 * ```
 *
 * @public
 */
export function getPlanetaryDignity(planet: Planet, sign: Sign, degree?: number): Dignity {
  // Check 1: Domicile (planet rules the sign)
  const rulerships = PLANETARY_RULERSHIPS[planet];
  if (rulerships.includes(sign)) {
    return {
      planet,
      sign,
      state: DignityState.Domicile,
      strength: DIGNITY_STRENGTH.DOMICILE,
      description: `${planet} rules ${Sign[sign]}`,
    };
  }

  // Check 2: Detriment (planet in sign opposite its rulership)
  // For planets that rule two signs, either opposite counts as detriment
  for (const ruledSign of rulerships) {
    const oppositeSign = (ruledSign + 6) % 12;
    if (sign === oppositeSign) {
      return {
        planet,
        sign,
        state: DignityState.Detriment,
        strength: DIGNITY_STRENGTH.DETRIMENT,
        description: `${planet} in detriment (opposite ${Sign[ruledSign]})`,
      };
    }
  }

  // Check 3: Exaltation
  const exaltation = EXALTATIONS[planet];
  if (exaltation && exaltation.sign === sign) {
    const result: Dignity = {
      planet,
      sign,
      state: DignityState.Exaltation,
      strength: DIGNITY_STRENGTH.EXALTATION,
      description: `${planet} exalted in ${Sign[sign]}`,
      exaltationDegree: exaltation.degree,
    };

    // If degree provided, note if it's at exact exaltation degree
    if (degree !== undefined) {
      const degreeInt = Math.floor(degree);
      if (degreeInt === exaltation.degree) {
        result.description = `${planet} exalted in ${Sign[sign]} at exact degree (${exaltation.degree}°)`;
      }
    }

    return result;
  }

  // Check 4: Fall (planet in sign opposite its exaltation)
  if (exaltation) {
    const oppositeFallSign = (exaltation.sign + 6) % 12;
    if (sign === oppositeFallSign) {
      return {
        planet,
        sign,
        state: DignityState.Fall,
        strength: DIGNITY_STRENGTH.FALL,
        description: `${planet} in fall (opposite ${Sign[exaltation.sign]})`,
      };
    }
  }

  // Default: Peregrine (no special dignity)
  return {
    planet,
    sign,
    state: DignityState.Peregrine,
    strength: DIGNITY_STRENGTH.PEREGRINE,
    description: `${planet} peregrine in ${Sign[sign]}`,
  };
}

/**
 * Check if a planet rules a given sign
 *
 * @param planet - The planet
 * @param sign - The sign
 * @returns True if planet rules the sign
 *
 * @example
 * ```typescript
 * isRuler(Planet.Mars, Sign.Aries);      // true
 * isRuler(Planet.Pluto, Sign.Scorpio);   // true (modern)
 * isRuler(Planet.Mars, Sign.Scorpio);    // true (traditional)
 * isRuler(Planet.Mars, Sign.Taurus);     // false
 * ```
 *
 * @public
 */
export function isRuler(planet: Planet, sign: Sign): boolean {
  return PLANETARY_RULERSHIPS[planet].includes(sign);
}

/**
 * Check if a planet is exalted in a given sign
 *
 * @param planet - The planet
 * @param sign - The sign
 * @returns True if planet is exalted in the sign
 *
 * @example
 * ```typescript
 * isExalted(Planet.Sun, Sign.Aries);       // true
 * isExalted(Planet.Mars, Sign.Capricorn);  // true
 * isExalted(Planet.Uranus, Sign.Scorpio);  // false (no exaltation)
 * ```
 *
 * @public
 */
export function isExalted(planet: Planet, sign: Sign): boolean {
  const exaltation = EXALTATIONS[planet];
  return exaltation !== undefined && exaltation.sign === sign;
}

/**
 * Check if a planet is in detriment in a given sign
 *
 * @param planet - The planet
 * @param sign - The sign
 * @returns True if planet is in detriment
 *
 * @example
 * ```typescript
 * isDetriment(Planet.Mars, Sign.Libra);     // true (opposite Aries)
 * isDetriment(Planet.Sun, Sign.Aquarius);   // true (opposite Leo)
 * ```
 *
 * @public
 */
export function isDetriment(planet: Planet, sign: Sign): boolean {
  const rulerships = PLANETARY_RULERSHIPS[planet];
  for (const ruledSign of rulerships) {
    const oppositeSign = (ruledSign + 6) % 12;
    if (sign === oppositeSign) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a planet is in fall in a given sign
 *
 * @param planet - The planet
 * @param sign - The sign
 * @returns True if planet is in fall
 *
 * @example
 * ```typescript
 * isFall(Planet.Sun, Sign.Libra);      // true (opposite Aries exaltation)
 * isFall(Planet.Mars, Sign.Cancer);    // true (opposite Capricorn exaltation)
 * ```
 *
 * @public
 */
export function isFall(planet: Planet, sign: Sign): boolean {
  const exaltation = EXALTATIONS[planet];
  if (!exaltation) {
    return false;
  }
  const oppositeFallSign = (exaltation.sign + 6) % 12;
  return sign === oppositeFallSign;
}
