/**
 * Differential test: the optimised pattern detectors must return exactly what the
 * original scans returned (same patterns, order, fields, aspect references and
 * body order, including the in-place sorting done by the duplicate checks).
 *
 * The original implementation (celestine main 377e8f6, src/aspects/patterns.ts) is frozen
 * below, test-only. Inputs are generated deterministically from a seeded PRNG: real charts
 * from `calculateChart` plus synthetic aspect lists with dense geometry, duplicate pairs,
 * reversed orientations and self-aspects.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { addExtraBodies, buildAspectBodies } from '../chart/aspect-calculation.js';
import { calculateChart } from '../chart/chart.js';
import { DEFAULT_OPTIONS } from '../chart/constants.js';
import type { Chart, ChartAspects, ChartOptions } from '../chart/types.js';
import { calculateAspects, filterAspectsByBody, filterAspectsByType } from './aspect-detection.js';
import {
  detectGrandCross,
  detectGrandTrine,
  detectKite,
  detectMysticRectangle,
  detectStellium,
  detectTSquare,
  detectYod,
  findPatterns,
} from './patterns.js';
import type { Aspect, AspectPattern } from './types.js';
import { AspectType, PatternType } from './types.js';

// ---- Frozen original implementation (do not edit) ----

function oldFindPatterns(aspects: Aspect[]): AspectPattern[] {
  const patterns: AspectPattern[] = [];

  // Detect patterns in order of rarity
  patterns.push(...oldDetectGrandCross(aspects));
  patterns.push(...oldDetectKite(aspects));
  patterns.push(...oldDetectMysticRectangle(aspects));
  patterns.push(...oldDetectGrandTrine(aspects));
  patterns.push(...oldDetectTSquare(aspects));
  patterns.push(...oldDetectYod(aspects));
  patterns.push(...oldDetectStellium(aspects));

  return patterns;
}

function oldDetectTSquare(aspects: Aspect[]): AspectPattern[] {
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
              (p) => p.type === PatternType.TSquare && oldArraysEqual(p.bodies.sort(), bodies),
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

function oldDetectGrandTrine(aspects: Aspect[]): AspectPattern[] {
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
        const ab = oldFindAspectBetween(trines, a, b);
        const bc = oldFindAspectBetween(trines, b, c);
        const ac = oldFindAspectBetween(trines, a, c);

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

function oldDetectGrandCross(aspects: Aspect[]): AspectPattern[] {
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
      const sq1 = oldFindAspectBetween(squares, opp1.body1, opp2.body1);
      const sq2 = oldFindAspectBetween(squares, opp1.body1, opp2.body2);
      const sq3 = oldFindAspectBetween(squares, opp1.body2, opp2.body1);
      const sq4 = oldFindAspectBetween(squares, opp1.body2, opp2.body2);

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

function oldDetectYod(aspects: Aspect[]): AspectPattern[] {
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
            (p) => p.type === PatternType.Yod && oldArraysEqual(p.bodies.sort(), bodies),
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

function oldDetectKite(aspects: Aspect[]): AspectPattern[] {
  const patterns: AspectPattern[] = [];
  const grandTrines = oldDetectGrandTrine(aspects);
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
      const sextile1 = oldFindAspectBetween(sextiles, fourthBody, otherVertices[0]);
      const sextile2 = oldFindAspectBetween(sextiles, fourthBody, otherVertices[1]);

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

function oldDetectMysticRectangle(aspects: Aspect[]): AspectPattern[] {
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
      const trine1a = oldFindAspectBetween(trines, opp1.body1, opp2.body1);
      const trine1b = oldFindAspectBetween(trines, opp1.body2, opp2.body2);
      const trine2a = oldFindAspectBetween(trines, opp1.body1, opp2.body2);
      const trine2b = oldFindAspectBetween(trines, opp1.body2, opp2.body1);

      // Two valid configurations
      if (trine1a && trine1b) {
        // Check sextiles
        const sex1 = oldFindAspectBetween(sextiles, opp1.body1, opp2.body2);
        const sex2 = oldFindAspectBetween(sextiles, opp1.body2, opp2.body1);

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
        const sex1 = oldFindAspectBetween(sextiles, opp1.body1, opp2.body1);
        const sex2 = oldFindAspectBetween(sextiles, opp1.body2, opp2.body2);

        if (sex1 && sex2) {
          // Check for duplicate
          const isDuplicate = patterns.some(
            (p) =>
              p.type === PatternType.MysticRectangle &&
              oldArraysEqual(p.bodies.sort(), allBodies.sort()),
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

function oldDetectStellium(aspects: Aspect[]): AspectPattern[] {
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

function oldFindAspectBetween(aspects: Aspect[], body1: string, body2: string): Aspect | undefined {
  return aspects.find(
    (a) => (a.body1 === body1 && a.body2 === body2) || (a.body1 === body2 && a.body2 === body1),
  );
}

function oldArraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((val, idx) => val === sortedB[idx]);
}

/**
 * Frozen calculateChartAspects from celestine 0.3.0 (5659336), test-only: major aspects were
 * always detected and `aspectTypes` only filtered them afterwards.
 */
function oldChartAspects(chart: Chart): ChartAspects {
  const options = chart.options;
  const bodies = addExtraBodies(buildAspectBodies(chart.planets), chart.nodes, chart.lilith);
  const result = calculateAspects(bodies, {
    orbs: options.aspectOrbs,
    minimumStrength: options.minimumAspectStrength,
  });
  let aspects = result.aspects;
  if (options.aspectTypes && options.aspectTypes.length > 0) {
    aspects = filterAspectsByType(aspects, options.aspectTypes);
  }
  const byBody: Record<string, Aspect[]> = {};
  for (const body of bodies) {
    const bodyAspects = filterAspectsByBody(aspects, body.name);
    if (bodyAspects.length > 0) {
      byBody[body.name] = bodyAspects;
    }
  }
  const byType: Record<AspectType, Aspect[]> = {} as Record<AspectType, Aspect[]>;
  for (const aspect of aspects) {
    if (!byType[aspect.type]) {
      byType[aspect.type] = [];
    }
    byType[aspect.type].push(aspect);
  }
  const majorTypes = ['conjunction', 'sextile', 'square', 'trine', 'opposition'];
  const summary = {
    conjunctions: byType.conjunction?.length ?? 0,
    sextiles: byType.sextile?.length ?? 0,
    squares: byType.square?.length ?? 0,
    trines: byType.trine?.length ?? 0,
    oppositions: byType.opposition?.length ?? 0,
    minor: 0,
  };
  for (const [type, list] of Object.entries(byType)) {
    if (!majorTypes.includes(type)) {
      summary.minor += list.length;
    }
  }
  return { all: aspects, byBody, byType, count: aspects.length, summary };
}

// ---- Harness ----

function prng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Everything observable about a pattern list; aspects by reference (index into input). */
function observe(patterns: AspectPattern[], aspects: Aspect[]) {
  return patterns.map((p) => ({
    keys: Object.keys(p),
    type: p.type,
    bodies: [...p.bodies],
    aspects: p.aspects.map((a) => aspects.indexOf(a)),
    description: p.description,
  }));
}

const DETECTORS: [string, (a: Aspect[]) => AspectPattern[], (a: Aspect[]) => AspectPattern[]][] = [
  ['findPatterns', findPatterns, oldFindPatterns],
  ['detectGrandCross', detectGrandCross, oldDetectGrandCross],
  ['detectKite', detectKite, oldDetectKite],
  ['detectMysticRectangle', detectMysticRectangle, oldDetectMysticRectangle],
  ['detectGrandTrine', detectGrandTrine, oldDetectGrandTrine],
  ['detectTSquare', detectTSquare, oldDetectTSquare],
  ['detectYod', detectYod, oldDetectYod],
  ['detectStellium', detectStellium, oldDetectStellium],
];

function compare(aspects: Aspect[], label: string, seen: Map<string, number>): void {
  const before = JSON.stringify(aspects);
  for (const [name, now, then] of DETECTORS) {
    const actual = observe(now(aspects), aspects);
    assert.deepEqual(actual, observe(then(aspects), aspects), `${name} differs for ${label}`);
    if (name === 'findPatterns')
      for (const p of actual) seen.set(p.type, (seen.get(p.type) ?? 0) + 1);
  }
  assert.equal(JSON.stringify(aspects), before, `aspects mutated for ${label}`);
}

const PATTERN_ASPECTS = [
  AspectType.Conjunction,
  AspectType.Sextile,
  AspectType.Square,
  AspectType.Trine,
  AspectType.Opposition,
  AspectType.Quincunx,
];

function syntheticAspects(rand: () => number): Aspect[] {
  const pool = 3 + Math.floor(rand() * 10);
  const count = Math.floor(rand() * pool * pool * 1.5);
  const aspects: Aspect[] = [];
  for (let i = 0; i < count; i++) {
    const a = Math.floor(rand() * pool);
    const b = rand() < 0.03 ? a : Math.floor(rand() * pool);
    // Bias towards the geometric aspect types so every pattern occurs often.
    const type =
      rand() < 0.9
        ? PATTERN_ASPECTS[Math.floor(rand() * PATTERN_ASPECTS.length)]
        : AspectType.SemiSquare;
    aspects.push({
      body1: `B${a}`,
      body2: `B${b}`,
      type,
      angle: 0,
      separation: 0,
      deviation: rand(),
      orb: 8,
      strength: Math.round(rand() * 100),
      isApplying: rand() < 0.5,
      isOutOfSign: false,
    } as Aspect);
  }
  return aspects;
}

describe('pattern detection (differential vs original implementation)', () => {
  it('matches on 2,500 seeded random charts', () => {
    const rand = prng(20261024);
    const seen = new Map<string, number>();
    let quincunxes = 0;
    for (let i = 0; i < 2500; i++) {
      const wide = rand() < 0.5;
      const options: ChartOptions = {
        includeAsteroids: rand() < 0.4,
        includeLilith: rand() < 0.3 ? 'both' : 'mean',
        includeNodes: rand() < 0.3 ? 'both' : 'true',
        includeLots: rand() < 0.3,
        aspectTypes: PATTERN_ASPECTS,
        ...(wide && {
          aspectOrbs: {
            [AspectType.Conjunction]: 12,
            [AspectType.Sextile]: 8,
            [AspectType.Square]: 10,
            [AspectType.Trine]: 10,
            [AspectType.Opposition]: 12,
            [AspectType.Quincunx]: 5,
          },
        }),
      };
      const birth = {
        year: 1800 + Math.floor(rand() * 300),
        month: 1 + Math.floor(rand() * 12),
        day: 1 + Math.floor(rand() * 28),
        hour: Math.floor(rand() * 24),
        minute: Math.floor(rand() * 60),
        timezone: Math.round(rand() * 24 - 12),
        latitude: rand() * 130 - 65,
        longitude: rand() * 360 - 180,
      };
      const chart = calculateChart(birth, options);
      const aspects = chart.aspects.all;
      for (const aspect of aspects)
        assert.ok(PATTERN_ASPECTS.includes(aspect.type), `chart ${i}: unrequested ${aspect.type}`);
      quincunxes += chart.aspects.byType[AspectType.Quincunx]?.length ?? 0;
      assert.deepEqual(
        observe(chart.patterns, aspects),
        observe(oldFindPatterns(aspects), aspects),
        `calculateChart patterns differ for chart ${i}`,
      );
      compare(aspects, `chart ${i}`, seen);

      // Default path (no aspectTypes): aspects, patterns and the whole chart must be exactly
      // what 0.3.0 returned, i.e. major aspects only, same objects in the same order.
      const { aspectTypes: _, ...defaults } = options;
      const plain = calculateChart(birth, defaults);
      assert.equal(plain.options.aspectTypes, DEFAULT_OPTIONS.aspectTypes);
      const expected = oldChartAspects(plain);
      assert.equal(
        JSON.stringify(plain.aspects),
        JSON.stringify(expected),
        `default aspects differ for chart ${i}`,
      );
      assert.equal(
        JSON.stringify(plain.patterns),
        JSON.stringify(oldFindPatterns(expected.all)),
        `default patterns differ for chart ${i}`,
      );
      // Everything except aspects and patterns is independent of aspectTypes.
      const strip = (c: Chart) =>
        JSON.stringify({ ...c, options: 0, aspects: 0, patterns: 0, summary: 0 });
      assert.equal(strip(plain), strip(chart), `chart ${i} positions differ`);
    }
    // Requested quincunxes are now detected, so Yods occur in real charts too.
    assert.ok(quincunxes > 1000, `only ${quincunxes} quincunxes in chart corpus`);
    for (const type of Object.values(PatternType))
      assert.ok((seen.get(type) ?? 0) > 100, `too few ${type} in chart corpus (${seen.get(type)})`);
  });

  it('matches on 3,000 seeded synthetic aspect lists (duplicates, self-aspects)', () => {
    const rand = prng(377);
    const seen = new Map<string, number>();
    for (let i = 0; i < 3000; i++) compare(syntheticAspects(rand), `synthetic ${i}`, seen);
    for (const type of Object.values(PatternType))
      assert.ok((seen.get(type) ?? 0) > 50, `too few ${type} in synthetic corpus`);
  });

  it('matches on empty and degenerate input', () => {
    const seen = new Map<string, number>();
    compare([], 'empty', seen);
    const rand = prng(1);
    const one = syntheticAspects(rand).slice(0, 1);
    compare(one, 'single', seen);
  });
});
