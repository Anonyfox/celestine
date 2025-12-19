/**
 * Aspect Calculation for Charts
 *
 * Wrapper around the aspects module for chart calculation.
 *
 * @module chart/aspect-calculation
 */

import {
  calculateAspects as calculateAspectsCore,
  filterAspectsByBody,
  filterAspectsByType,
} from '../aspects/aspect-detection.js';
import { findPatterns } from '../aspects/patterns.js';
import type { Aspect, AspectBody, AspectPattern, AspectType } from '../aspects/types.js';
import type { ChartAspects, ChartLilith, ChartNode, ChartOptions, ChartPlanet } from './types.js';

/**
 * Build aspect bodies from chart planets.
 *
 * @param planets - Chart planets
 * @returns Array of AspectBody objects for aspect calculation
 */
export function buildAspectBodies(planets: ChartPlanet[]): AspectBody[] {
  return planets.map((planet) => ({
    name: planet.name,
    longitude: planet.longitude,
    longitudeSpeed: planet.longitudeSpeed,
  }));
}

/**
 * Add additional bodies (nodes, Lilith) to aspect calculation.
 *
 * @param bodies - Existing aspect bodies
 * @param nodes - Lunar nodes
 * @param lilith - Lilith positions
 * @returns Extended array including nodes and Lilith
 */
export function addExtraBodies(
  bodies: AspectBody[],
  nodes?: ChartNode[],
  lilith?: ChartLilith[],
): AspectBody[] {
  const result = [...bodies];

  // Add nodes (use True Node by default if available)
  if (nodes) {
    for (const node of nodes) {
      // Only include North Node (South is always opposite)
      if (node.name.includes('North')) {
        result.push({
          name: `${node.type} ${node.name}`,
          longitude: node.longitude,
          longitudeSpeed: 0, // Nodes move slowly, simplified
        });
      }
    }
  }

  // Add Lilith
  if (lilith) {
    for (const l of lilith) {
      result.push({
        name: l.name,
        longitude: l.longitude,
        longitudeSpeed: 0, // Simplified
      });
    }
  }

  return result;
}

/**
 * Calculate all aspects for a chart.
 *
 * @param planets - Chart planets
 * @param options - Chart options with aspect configuration
 * @param nodes - Optional lunar nodes
 * @param lilith - Optional Lilith positions
 * @returns Complete aspect data for the chart
 */
export function calculateChartAspects(
  planets: ChartPlanet[],
  options: Required<ChartOptions>,
  nodes?: ChartNode[],
  lilith?: ChartLilith[],
): ChartAspects {
  // Build aspect bodies
  let bodies = buildAspectBodies(planets);

  // Optionally add nodes and Lilith
  bodies = addExtraBodies(bodies, nodes, lilith);

  // Calculate aspects
  const result = calculateAspectsCore(bodies, {
    orbs: options.aspectOrbs,
    minimumStrength: options.minimumAspectStrength,
  });

  // Filter by requested aspect types if specified
  let aspects = result.aspects;
  if (options.aspectTypes && options.aspectTypes.length > 0) {
    aspects = filterAspectsByType(aspects, options.aspectTypes);
  }

  // Build aspects by body
  const byBody: Record<string, Aspect[]> = {};
  for (const body of bodies) {
    const bodyAspects = filterAspectsByBody(aspects, body.name);
    if (bodyAspects.length > 0) {
      byBody[body.name] = bodyAspects;
    }
  }

  // Build aspects by type
  const byType: Record<AspectType, Aspect[]> = {} as Record<AspectType, Aspect[]>;
  for (const aspect of aspects) {
    if (!byType[aspect.type]) {
      byType[aspect.type] = [];
    }
    byType[aspect.type].push(aspect);
  }

  // Count aspects by category
  const majorTypes = ['conjunction', 'sextile', 'square', 'trine', 'opposition'];
  const summary = {
    conjunctions: byType.conjunction?.length ?? 0,
    sextiles: byType.sextile?.length ?? 0,
    squares: byType.square?.length ?? 0,
    trines: byType.trine?.length ?? 0,
    oppositions: byType.opposition?.length ?? 0,
    minor: 0,
  };

  // Count minor aspects
  for (const [type, list] of Object.entries(byType)) {
    if (!majorTypes.includes(type)) {
      summary.minor += list.length;
    }
  }

  return {
    all: aspects,
    byBody,
    byType,
    count: aspects.length,
    summary,
  };
}

/**
 * Detect aspect patterns in the chart.
 *
 * @param aspects - All calculated aspects
 * @returns Detected patterns
 */
export function detectChartPatterns(aspects: Aspect[]): AspectPattern[] {
  return findPatterns(aspects);
}

/**
 * Get aspects for a specific planet.
 *
 * @param chartAspects - Chart aspects data
 * @param planetName - Name of the planet
 * @returns Aspects involving this planet
 */
export function getAspectsForPlanet(chartAspects: ChartAspects, planetName: string): Aspect[] {
  return chartAspects.byBody[planetName] ?? [];
}

/**
 * Get the strongest aspect in the chart.
 *
 * @param chartAspects - Chart aspects data
 * @returns The aspect with highest strength, or null if none
 */
export function getStrongestAspect(chartAspects: ChartAspects): Aspect | null {
  if (chartAspects.all.length === 0) {
    return null;
  }

  return chartAspects.all.reduce((strongest, current) =>
    current.strength > strongest.strength ? current : strongest,
  );
}

/**
 * Get applying aspects (still forming).
 *
 * @param chartAspects - Chart aspects data
 * @returns Aspects that are applying
 */
export function getApplyingAspects(chartAspects: ChartAspects): Aspect[] {
  return chartAspects.all.filter((a) => a.isApplying === true);
}

/**
 * Get separating aspects (moving apart).
 *
 * @param chartAspects - Chart aspects data
 * @returns Aspects that are separating
 */
export function getSeparatingAspects(chartAspects: ChartAspects): Aspect[] {
  return chartAspects.all.filter((a) => a.isApplying === false);
}

/**
 * Check if two bodies are in aspect.
 *
 * @param chartAspects - Chart aspects data
 * @param body1 - First body name
 * @param body2 - Second body name
 * @returns The aspect between them, or null if none
 */
export function getAspectBetween(
  chartAspects: ChartAspects,
  body1: string,
  body2: string,
): Aspect | null {
  return (
    chartAspects.all.find(
      (a) => (a.body1 === body1 && a.body2 === body2) || (a.body1 === body2 && a.body2 === body1),
    ) ?? null
  );
}
