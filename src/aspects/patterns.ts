/**
 * Aspect Pattern Detection
 *
 * Detection of complex aspect configurations (T-Square, Grand Trine, etc.)
 *
 * @module aspects/patterns
 *
 * @remarks
 * Aspect patterns are geometric configurations formed by 3+ celestial bodies.
 * Each pattern has specific requirements for the aspects that form it.
 *
 * Pattern definitions (mathematical, verifiable):
 * - **T-Square**: 2 squares (90°) + 1 opposition (180°) forming a T
 * - **Grand Trine**: 3 trines (120°) forming an equilateral triangle
 * - **Grand Cross**: 4 squares (90°) + 2 oppositions (180°) forming a cross
 * - **Yod**: 2 quincunxes (150°) + 1 sextile (60°) forming a Y
 * - **Kite**: Grand Trine + 1 opposition to one vertex
 * - **Mystic Rectangle**: 2 trines + 2 sextiles + 2 oppositions
 * - **Stellium**: 3+ bodies within conjunction orb
 *
 * @see IMPL.md Section 7 for pattern specifications
 */

import type { Aspect, AspectPattern } from './types.js';
import { AspectType, PatternType } from './types.js';

/**
 * Find all aspect patterns in a set of aspects.
 *
 * @param aspects - Array of detected aspects
 * @returns Array of detected patterns, sorted by significance
 *
 * @remarks
 * Patterns are detected in order of rarity/significance:
 * 1. Grand Cross (rarest)
 * 2. Kite
 * 3. Mystic Rectangle
 * 4. Grand Trine
 * 5. T-Square
 * 6. Yod
 * 7. Stellium
 *
 * @example
 * ```typescript
 * const aspects = findAllAspects(bodies);
 * const patterns = findPatterns(aspects);
 *
 * for (const pattern of patterns) {
 *   console.log(`${pattern.type}: ${pattern.bodies.join(', ')}`);
 * }
 * ```
 */
export function findPatterns(aspects: Aspect[]): AspectPattern[] {
  const patterns: AspectPattern[] = [];

  // Detect patterns in order of rarity
  patterns.push(...detectGrandCross(aspects));
  patterns.push(...detectKite(aspects));
  patterns.push(...detectMysticRectangle(aspects));
  patterns.push(...detectGrandTrine(aspects));
  patterns.push(...detectTSquare(aspects));
  patterns.push(...detectYod(aspects));
  patterns.push(...detectStellium(aspects));

  return patterns;
}

/**
 * Detect T-Square patterns.
 *
 * @remarks
 * A T-Square consists of:
 * - 1 opposition (180°)
 * - 2 squares (90°) from each end of the opposition to a common apex
 *
 * Mathematical verification:
 * - Body A at 0°, Body B at 180° (opposition)
 * - Body C at 90° (apex)
 * - A-C = 90° (square), B-C = 90° (square) ✓
 */
export function detectTSquare(aspects: Aspect[]): AspectPattern[] {
  const patterns: AspectPattern[] = [];
  const oppositions = aspects.filter((a) => a.type === AspectType.Opposition);
  const squares = aspects.filter((a) => a.type === AspectType.Square);

  for (const opp of oppositions) {
    // Find squares from body1 of the opposition
    const squaresFromBody1 = squares.filter(
      (sq) => sq.body1 === opp.body1 || sq.body2 === opp.body1,
    );

    // Find squares from body2 of the opposition
    const squaresFromBody2 = squares.filter(
      (sq) => sq.body1 === opp.body2 || sq.body2 === opp.body2,
    );

    // Find common apex
    for (const sq1 of squaresFromBody1) {
      const apex1 = sq1.body1 === opp.body1 ? sq1.body2 : sq1.body1;

      for (const sq2 of squaresFromBody2) {
        const apex2 = sq2.body1 === opp.body2 ? sq2.body2 : sq2.body1;

        if (apex1 === apex2) {
          // Ensure apex is not part of the opposition
          if (apex1 !== opp.body1 && apex1 !== opp.body2) {
            const bodies = [opp.body1, opp.body2, apex1].sort();

            // Avoid duplicates
            const isDuplicate = patterns.some(
              (p) => p.type === PatternType.TSquare && arraysEqual(p.bodies.sort(), bodies),
            );

            if (!isDuplicate) {
              patterns.push({
                type: PatternType.TSquare,
                bodies: [opp.body1, opp.body2, apex1],
                aspects: [opp, sq1, sq2],
                description: `T-Square with ${apex1} as apex, ${opp.body1}-${opp.body2} opposition`,
              });
            }
          }
        }
      }
    }
  }

  return patterns;
}

/**
 * Detect Grand Trine patterns.
 *
 * @remarks
 * A Grand Trine consists of:
 * - 3 trines (120°) connecting 3 bodies in an equilateral triangle
 *
 * Mathematical verification:
 * - Body A at 0°, Body B at 120°, Body C at 240°
 * - A-B = 120°, B-C = 120°, A-C = 120° ✓
 */
export function detectGrandTrine(aspects: Aspect[]): AspectPattern[] {
  const patterns: AspectPattern[] = [];
  const trines = aspects.filter((a) => a.type === AspectType.Trine);

  // Need at least 3 trines
  if (trines.length < 3) return patterns;

  // Get all unique bodies involved in trines
  const bodies = new Set<string>();
  for (const t of trines) {
    bodies.add(t.body1);
    bodies.add(t.body2);
  }

  // Check all combinations of 3 bodies
  const bodyArray = Array.from(bodies);
  for (let i = 0; i < bodyArray.length - 2; i++) {
    for (let j = i + 1; j < bodyArray.length - 1; j++) {
      for (let k = j + 1; k < bodyArray.length; k++) {
        const a = bodyArray[i];
        const b = bodyArray[j];
        const c = bodyArray[k];

        // Check if all three pairs form trines
        const ab = findAspectBetween(trines, a, b);
        const bc = findAspectBetween(trines, b, c);
        const ac = findAspectBetween(trines, a, c);

        if (ab && bc && ac) {
          patterns.push({
            type: PatternType.GrandTrine,
            bodies: [a, b, c],
            aspects: [ab, bc, ac],
            description: `Grand Trine: ${a}, ${b}, ${c}`,
          });
        }
      }
    }
  }

  return patterns;
}

/**
 * Detect Grand Cross patterns.
 *
 * @remarks
 * A Grand Cross consists of:
 * - 4 squares (90°) forming a square
 * - 2 oppositions (180°) as diagonals
 *
 * Mathematical verification:
 * - Bodies at 0°, 90°, 180°, 270°
 * - 4 squares + 2 oppositions ✓
 */
export function detectGrandCross(aspects: Aspect[]): AspectPattern[] {
  const patterns: AspectPattern[] = [];
  const squares = aspects.filter((a) => a.type === AspectType.Square);
  const oppositions = aspects.filter((a) => a.type === AspectType.Opposition);

  // Need at least 4 squares and 2 oppositions
  if (squares.length < 4 || oppositions.length < 2) return patterns;

  // Find two oppositions that share no bodies
  for (let i = 0; i < oppositions.length; i++) {
    for (let j = i + 1; j < oppositions.length; j++) {
      const opp1 = oppositions[i];
      const opp2 = oppositions[j];

      // Check that they share no bodies
      const bodies1 = new Set([opp1.body1, opp1.body2]);
      const bodies2 = new Set([opp2.body1, opp2.body2]);

      const shared = [...bodies1].filter((b) => bodies2.has(b));
      if (shared.length > 0) continue;

      // All 4 bodies
      const allBodies = [opp1.body1, opp1.body2, opp2.body1, opp2.body2];

      // Check for 4 squares connecting adjacent bodies
      // Adjacent pairs: (opp1.body1, opp2.body1), (opp2.body1, opp1.body2),
      //                 (opp1.body2, opp2.body2), (opp2.body2, opp1.body1)
      const sq1 = findAspectBetween(squares, opp1.body1, opp2.body1);
      const sq2 = findAspectBetween(squares, opp1.body1, opp2.body2);
      const sq3 = findAspectBetween(squares, opp1.body2, opp2.body1);
      const sq4 = findAspectBetween(squares, opp1.body2, opp2.body2);

      // We need exactly 4 squares connecting the bodies
      const foundSquares = [sq1, sq2, sq3, sq4].filter(Boolean) as Aspect[];
      if (foundSquares.length === 4) {
        patterns.push({
          type: PatternType.GrandCross,
          bodies: allBodies,
          aspects: [opp1, opp2, ...foundSquares],
          description: `Grand Cross: ${allBodies.join(', ')}`,
        });
      }
    }
  }

  return patterns;
}

/**
 * Detect Yod (Finger of God) patterns.
 *
 * @remarks
 * A Yod consists of:
 * - 2 quincunxes (150°) from two planets to a common apex
 * - 1 sextile (60°) between the base planets
 *
 * Mathematical verification:
 * - Body A at 0°, Body B at 60° (sextile base)
 * - Body C at 150° (apex)
 * - A-C = 150° (quincunx), B-C = 150° (quincunx) ✓
 */
export function detectYod(aspects: Aspect[]): AspectPattern[] {
  const patterns: AspectPattern[] = [];
  const sextiles = aspects.filter((a) => a.type === AspectType.Sextile);
  const quincunxes = aspects.filter((a) => a.type === AspectType.Quincunx);

  // Need at least 1 sextile and 2 quincunxes
  if (sextiles.length < 1 || quincunxes.length < 2) return patterns;

  for (const sextile of sextiles) {
    // Find quincunxes from body1 of the sextile
    const quincunxesFromBody1 = quincunxes.filter(
      (q) => q.body1 === sextile.body1 || q.body2 === sextile.body1,
    );

    // Find quincunxes from body2 of the sextile
    const quincunxesFromBody2 = quincunxes.filter(
      (q) => q.body1 === sextile.body2 || q.body2 === sextile.body2,
    );

    // Find common apex
    for (const q1 of quincunxesFromBody1) {
      const apex1 = q1.body1 === sextile.body1 ? q1.body2 : q1.body1;

      for (const q2 of quincunxesFromBody2) {
        const apex2 = q2.body1 === sextile.body2 ? q2.body2 : q2.body1;

        if (apex1 === apex2 && apex1 !== sextile.body1 && apex1 !== sextile.body2) {
          const bodies = [sextile.body1, sextile.body2, apex1].sort();

          const isDuplicate = patterns.some(
            (p) => p.type === PatternType.Yod && arraysEqual(p.bodies.sort(), bodies),
          );

          if (!isDuplicate) {
            patterns.push({
              type: PatternType.Yod,
              bodies: [sextile.body1, sextile.body2, apex1],
              aspects: [sextile, q1, q2],
              description: `Yod with ${apex1} as apex (Finger of God)`,
            });
          }
        }
      }
    }
  }

  return patterns;
}

/**
 * Detect Kite patterns.
 *
 * @remarks
 * A Kite consists of:
 * - Grand Trine (3 trines)
 * - 1 opposition from one vertex to a 4th planet
 * - 2 sextiles from the 4th planet to the other two vertices
 *
 * Mathematical verification:
 * - Bodies at 0°, 120°, 240° (Grand Trine)
 * - Body at 180° (opposite to 0°)
 * - Forms sextiles to 120° and 240° ✓
 */
export function detectKite(aspects: Aspect[]): AspectPattern[] {
  const patterns: AspectPattern[] = [];
  const grandTrines = detectGrandTrine(aspects);
  const oppositions = aspects.filter((a) => a.type === AspectType.Opposition);
  const sextiles = aspects.filter((a) => a.type === AspectType.Sextile);

  for (const gt of grandTrines) {
    // For each vertex of the Grand Trine, look for an opposition
    for (const vertex of gt.bodies) {
      const opp = oppositions.find(
        (o) =>
          (o.body1 === vertex || o.body2 === vertex) &&
          !gt.bodies.includes(o.body1 === vertex ? o.body2 : o.body1),
      );

      if (!opp) continue;

      const fourthBody = opp.body1 === vertex ? opp.body2 : opp.body1;
      const otherVertices = gt.bodies.filter((b) => b !== vertex);

      // Check for sextiles from fourth body to other two vertices
      const sextile1 = findAspectBetween(sextiles, fourthBody, otherVertices[0]);
      const sextile2 = findAspectBetween(sextiles, fourthBody, otherVertices[1]);

      if (sextile1 && sextile2) {
        patterns.push({
          type: PatternType.Kite,
          bodies: [...gt.bodies, fourthBody],
          aspects: [...gt.aspects, opp, sextile1, sextile2],
          description: `Kite with ${fourthBody} as tail, ${vertex} opposite`,
        });
      }
    }
  }

  return patterns;
}

/**
 * Detect Mystic Rectangle patterns.
 *
 * @remarks
 * A Mystic Rectangle consists of:
 * - 2 oppositions (180°)
 * - 2 trines (120°)
 * - 2 sextiles (60°)
 *
 * Mathematical verification:
 * - Bodies at 0°, 60°, 180°, 240°
 * - Oppositions: 0°-180°, 60°-240° ✓
 * - Trines: 0°-240°, 60°-180° ✓
 * - Sextiles: 0°-60°, 180°-240° ✓
 */
export function detectMysticRectangle(aspects: Aspect[]): AspectPattern[] {
  const patterns: AspectPattern[] = [];
  const oppositions = aspects.filter((a) => a.type === AspectType.Opposition);
  const trines = aspects.filter((a) => a.type === AspectType.Trine);
  const sextiles = aspects.filter((a) => a.type === AspectType.Sextile);

  // Need at least 2 oppositions, 2 trines, 2 sextiles
  if (oppositions.length < 2 || trines.length < 2 || sextiles.length < 2) {
    return patterns;
  }

  // Find two oppositions that share no bodies
  for (let i = 0; i < oppositions.length; i++) {
    for (let j = i + 1; j < oppositions.length; j++) {
      const opp1 = oppositions[i];
      const opp2 = oppositions[j];

      const bodies1 = new Set([opp1.body1, opp1.body2]);
      const bodies2 = new Set([opp2.body1, opp2.body2]);

      const shared = [...bodies1].filter((b) => bodies2.has(b));
      if (shared.length > 0) continue;

      const allBodies = [opp1.body1, opp1.body2, opp2.body1, opp2.body2];

      // Check for trines and sextiles forming the rectangle
      // Trines connect non-opposite bodies diagonally
      // Sextiles connect adjacent bodies (those NOT in opposition with each other)

      // Possible trine pairs:
      const trine1a = findAspectBetween(trines, opp1.body1, opp2.body1);
      const trine1b = findAspectBetween(trines, opp1.body2, opp2.body2);
      const trine2a = findAspectBetween(trines, opp1.body1, opp2.body2);
      const trine2b = findAspectBetween(trines, opp1.body2, opp2.body1);

      // Two valid configurations
      if (trine1a && trine1b) {
        // Check sextiles
        const sex1 = findAspectBetween(sextiles, opp1.body1, opp2.body2);
        const sex2 = findAspectBetween(sextiles, opp1.body2, opp2.body1);

        if (sex1 && sex2) {
          patterns.push({
            type: PatternType.MysticRectangle,
            bodies: allBodies,
            aspects: [opp1, opp2, trine1a, trine1b, sex1, sex2],
            description: `Mystic Rectangle: ${allBodies.join(', ')}`,
          });
        }
      }

      if (trine2a && trine2b) {
        const sex1 = findAspectBetween(sextiles, opp1.body1, opp2.body1);
        const sex2 = findAspectBetween(sextiles, opp1.body2, opp2.body2);

        if (sex1 && sex2) {
          // Check for duplicate
          const isDuplicate = patterns.some(
            (p) =>
              p.type === PatternType.MysticRectangle &&
              arraysEqual(p.bodies.sort(), allBodies.sort()),
          );

          if (!isDuplicate) {
            patterns.push({
              type: PatternType.MysticRectangle,
              bodies: allBodies,
              aspects: [opp1, opp2, trine2a, trine2b, sex1, sex2],
              description: `Mystic Rectangle: ${allBodies.join(', ')}`,
            });
          }
        }
      }
    }
  }

  return patterns;
}

/**
 * Detect Stellium patterns.
 *
 * @remarks
 * A Stellium consists of:
 * - 3 or more planets in conjunction (all within orb of each other)
 *
 * Different traditions define stellium as:
 * - Modern: 3+ planets within ~10° span
 * - Traditional: 3+ planets in same sign
 *
 * This implementation uses the conjunction aspect approach.
 */
export function detectStellium(aspects: Aspect[]): AspectPattern[] {
  const patterns: AspectPattern[] = [];
  const conjunctions = aspects.filter((a) => a.type === AspectType.Conjunction);

  if (conjunctions.length < 2) return patterns;

  // Build a graph of connected conjunctions
  const graph = new Map<string, Set<string>>();

  for (const conj of conjunctions) {
    if (!graph.has(conj.body1)) graph.set(conj.body1, new Set());
    if (!graph.has(conj.body2)) graph.set(conj.body2, new Set());
    graph.get(conj.body1)!.add(conj.body2);
    graph.get(conj.body2)!.add(conj.body1);
  }

  // Find connected components (groups of bodies all conjunct)
  const visited = new Set<string>();
  const components: string[][] = [];

  for (const body of graph.keys()) {
    if (visited.has(body)) continue;

    const component: string[] = [];
    const queue = [body];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;

      visited.add(current);
      component.push(current);

      const neighbors = graph.get(current) || new Set();
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          queue.push(neighbor);
        }
      }
    }

    if (component.length >= 3) {
      components.push(component);
    }
  }

  // Convert components to patterns
  for (const component of components) {
    const relevantAspects = conjunctions.filter(
      (c) => component.includes(c.body1) && component.includes(c.body2),
    );

    patterns.push({
      type: PatternType.Stellium,
      bodies: component,
      aspects: relevantAspects,
      description: `Stellium: ${component.length} planets conjunct (${component.join(', ')})`,
    });
  }

  return patterns;
}

/**
 * Find a specific aspect between two bodies.
 */
function findAspectBetween(aspects: Aspect[], body1: string, body2: string): Aspect | undefined {
  return aspects.find(
    (a) => (a.body1 === body1 && a.body2 === body2) || (a.body1 === body2 && a.body2 === body1),
  );
}

/**
 * Check if two arrays have the same elements.
 */
function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((val, idx) => val === sortedB[idx]);
}

/**
 * Get a summary of detected patterns by type.
 */
export function getPatternSummary(patterns: AspectPattern[]): Record<PatternType, number> {
  const summary: Partial<Record<PatternType, number>> = {};

  for (const pattern of patterns) {
    summary[pattern.type] = (summary[pattern.type] ?? 0) + 1;
  }

  // Fill in zeros
  for (const type of Object.values(PatternType)) {
    if (!(type in summary)) {
      summary[type] = 0;
    }
  }

  return summary as Record<PatternType, number>;
}

/**
 * Format a pattern for display.
 */
export function formatPattern(pattern: AspectPattern): string {
  return `${pattern.type}: ${pattern.bodies.join(' - ')}`;
}
