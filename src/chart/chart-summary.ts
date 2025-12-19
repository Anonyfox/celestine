/**
 * Chart Summary Generation
 *
 * Generates statistical summaries and distributions for a chart.
 *
 * @module chart/chart-summary
 */

import type { AspectPattern } from '../aspects/types.js';
import { DignityState } from '../zodiac/types.js';
import type {
  ChartPlanet,
  ChartSummary,
  ElementDistribution,
  HemisphereDistribution,
  ModalityDistribution,
  QuadrantDistribution,
} from './types.js';
import {
  getElement,
  getHemisphere,
  getModality,
  getPolarity,
  getQuadrant,
} from './zodiac-placement.js';

/**
 * Generate a complete chart summary.
 *
 * @param planets - All chart planets
 * @param patterns - Detected aspect patterns
 * @returns Complete chart summary
 */
export function generateChartSummary(
  planets: ChartPlanet[],
  patterns: AspectPattern[],
): ChartSummary {
  return {
    elements: calculateElementDistribution(planets),
    modalities: calculateModalityDistribution(planets),
    hemispheres: calculateHemisphereDistribution(planets),
    quadrants: calculateQuadrantDistribution(planets),
    polarity: calculatePolarityBalance(planets),
    retrograde: getRetrogradePlanets(planets),
    patterns: patterns.map((p) => p.type),
    dignified: categorizeByDignity(planets),
  };
}

/**
 * Calculate element distribution.
 *
 * @param planets - Chart planets
 * @returns Element distribution with planet names
 */
export function calculateElementDistribution(planets: ChartPlanet[]): ElementDistribution {
  const result: ElementDistribution = {
    fire: [],
    earth: [],
    air: [],
    water: [],
  };

  for (const planet of planets) {
    const element = getElement(planet.sign);
    result[element].push(planet.name);
  }

  return result;
}

/**
 * Calculate modality distribution.
 *
 * @param planets - Chart planets
 * @returns Modality distribution with planet names
 */
export function calculateModalityDistribution(planets: ChartPlanet[]): ModalityDistribution {
  const result: ModalityDistribution = {
    cardinal: [],
    fixed: [],
    mutable: [],
  };

  for (const planet of planets) {
    const modality = getModality(planet.sign);
    result[modality].push(planet.name);
  }

  return result;
}

/**
 * Calculate hemisphere distribution.
 *
 * @param planets - Chart planets
 * @returns Hemisphere counts
 */
export function calculateHemisphereDistribution(planets: ChartPlanet[]): HemisphereDistribution {
  const result: HemisphereDistribution = {
    north: 0,
    south: 0,
    east: 0,
    west: 0,
  };

  for (const planet of planets) {
    const hemi = getHemisphere(planet.house);
    result[hemi.vertical]++;
    result[hemi.horizontal]++;
  }

  return result;
}

/**
 * Calculate quadrant distribution.
 *
 * @param planets - Chart planets
 * @returns Quadrant distribution with planet names
 */
export function calculateQuadrantDistribution(planets: ChartPlanet[]): QuadrantDistribution {
  const result: QuadrantDistribution = {
    first: [],
    second: [],
    third: [],
    fourth: [],
  };

  const quadrantNames: Record<1 | 2 | 3 | 4, keyof QuadrantDistribution> = {
    1: 'first',
    2: 'second',
    3: 'third',
    4: 'fourth',
  };

  for (const planet of planets) {
    const quadrant = getQuadrant(planet.house);
    result[quadrantNames[quadrant]].push(planet.name);
  }

  return result;
}

/**
 * Calculate polarity balance.
 *
 * @param planets - Chart planets
 * @returns Positive/negative counts
 */
export function calculatePolarityBalance(planets: ChartPlanet[]): {
  positive: number;
  negative: number;
} {
  let positive = 0;
  let negative = 0;

  for (const planet of planets) {
    const polarity = getPolarity(planet.sign);
    if (polarity === 'positive') {
      positive++;
    } else {
      negative++;
    }
  }

  return { positive, negative };
}

/**
 * Get list of retrograde planets.
 *
 * @param planets - Chart planets
 * @returns Names of retrograde planets
 */
export function getRetrogradePlanets(planets: ChartPlanet[]): string[] {
  return planets.filter((p) => p.isRetrograde).map((p) => p.name);
}

/**
 * Categorize planets by dignity state.
 *
 * @param planets - Chart planets
 * @returns Categorized planet names
 */
export function categorizeByDignity(planets: ChartPlanet[]): {
  domicile: string[];
  exalted: string[];
  detriment: string[];
  fall: string[];
  peregrine: string[];
} {
  const result = {
    domicile: [] as string[],
    exalted: [] as string[],
    detriment: [] as string[],
    fall: [] as string[],
    peregrine: [] as string[],
  };

  for (const planet of planets) {
    switch (planet.dignity.state) {
      case DignityState.Domicile:
        result.domicile.push(planet.name);
        break;
      case DignityState.Exaltation:
        result.exalted.push(planet.name);
        break;
      case DignityState.Detriment:
        result.detriment.push(planet.name);
        break;
      case DignityState.Fall:
        result.fall.push(planet.name);
        break;
      default:
        result.peregrine.push(planet.name);
    }
  }

  return result;
}

/**
 * Get the dominant element in the chart.
 *
 * @param elements - Element distribution
 * @returns The most common element
 */
export function getDominantElement(
  elements: ElementDistribution,
): 'fire' | 'earth' | 'air' | 'water' {
  const counts = {
    fire: elements.fire.length,
    earth: elements.earth.length,
    air: elements.air.length,
    water: elements.water.length,
  };

  let dominant: 'fire' | 'earth' | 'air' | 'water' = 'fire';
  let maxCount = 0;

  for (const [element, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      dominant = element as 'fire' | 'earth' | 'air' | 'water';
    }
  }

  return dominant;
}

/**
 * Get the dominant modality in the chart.
 *
 * @param modalities - Modality distribution
 * @returns The most common modality
 */
export function getDominantModality(
  modalities: ModalityDistribution,
): 'cardinal' | 'fixed' | 'mutable' {
  const counts = {
    cardinal: modalities.cardinal.length,
    fixed: modalities.fixed.length,
    mutable: modalities.mutable.length,
  };

  let dominant: 'cardinal' | 'fixed' | 'mutable' = 'cardinal';
  let maxCount = 0;

  for (const [modality, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      dominant = modality as 'cardinal' | 'fixed' | 'mutable';
    }
  }

  return dominant;
}

/**
 * Check if the chart has a specific emphasis.
 *
 * @param summary - Chart summary
 * @returns Description of chart emphasis
 */
export function getChartEmphasis(summary: ChartSummary): string[] {
  const emphasis: string[] = [];

  // Element emphasis (if one element has 4+ planets)
  for (const [element, planets] of Object.entries(summary.elements)) {
    if (planets.length >= 4) {
      emphasis.push(`Strong ${element} emphasis`);
    }
  }

  // Modality emphasis
  for (const [modality, planets] of Object.entries(summary.modalities)) {
    if (planets.length >= 4) {
      emphasis.push(`Strong ${modality} emphasis`);
    }
  }

  // Hemisphere emphasis
  const { north, south, east, west } = summary.hemispheres;

  if (north >= 7) emphasis.push('Northern hemisphere emphasis');
  if (south >= 7) emphasis.push('Southern hemisphere emphasis');
  if (east >= 7) emphasis.push('Eastern hemisphere emphasis');
  if (west >= 7) emphasis.push('Western hemisphere emphasis');

  // Pattern emphasis
  if (summary.patterns.length > 0) {
    emphasis.push(`Contains ${summary.patterns.length} aspect pattern(s)`);
  }

  // Retrograde emphasis
  if (summary.retrograde.length >= 3) {
    emphasis.push(`${summary.retrograde.length} planets retrograde`);
  }

  return emphasis;
}
