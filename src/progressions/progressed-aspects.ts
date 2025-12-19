/**
 * Progressed Aspects Detection
 *
 * Detect aspects between progressed and natal positions.
 *
 * @module progressions/progressed-aspects
 *
 * @remarks
 * Progression aspects come in two primary types:
 * 1. **Progressed-to-Natal**: Progressed planet aspecting natal planet
 * 2. **Progressed-to-Progressed**: Aspect between two progressed bodies
 *
 * Orbs in progressions are typically very tight (0.5-1°) because
 * progressed positions change slowly over time.
 *
 * @see IMPL.md Section 4 for aspect detection methodology
 */

import type { AspectType } from '../aspects/types.js';
import {
  DEFAULT_PROGRESSION_BODIES,
  EXACT_THRESHOLD,
  MAJOR_PROGRESSION_ASPECTS,
  PROGRESSION_ORBS,
} from './constants.js';
import {
  getNatalPosition,
  getProgressedPosition,
  type ProgressedBodyName,
} from './progressed-positions.js';
import { birthToJD, targetToJD } from './progression-date.js';
import type {
  ProgressedAspect,
  ProgressedAspectPhase,
  ProgressedPlanet,
  ProgressionBirthData,
  ProgressionTargetDate,
  ProgressionType,
} from './types.js';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Configuration for aspect detection.
 */
export interface AspectConfig {
  /** Aspect types to detect */
  aspectTypes?: AspectType[];
  /** Orb overrides by aspect type */
  orbs?: Partial<Record<AspectType, number>>;
  /** Include progressed-to-progressed aspects */
  includeProgressedToProgressed?: boolean;
  /** Minimum orb strength to include (0-100) */
  minimumStrength?: number;
  /** Exact aspect threshold */
  exactThreshold?: number;
}

/**
 * Result of aspect detection.
 */
export interface AspectDetectionResult {
  /** All detected aspects */
  aspects: ProgressedAspect[];
  /** Exact or near-exact aspects */
  exactAspects: ProgressedAspect[];
  /** Applying aspects (getting closer) */
  applyingAspects: ProgressedAspect[];
  /** Separating aspects (getting further) */
  separatingAspects: ProgressedAspect[];
  /** Summary statistics */
  summary: {
    total: number;
    exact: number;
    applying: number;
    separating: number;
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate angular separation between two longitudes.
 *
 * @param long1 - First longitude
 * @param long2 - Second longitude
 * @returns Separation in degrees (0-180)
 */
function angularSeparation(long1: number, long2: number): number {
  let diff = Math.abs(long1 - long2);
  if (diff > 180) diff = 360 - diff;
  return diff;
}

/**
 * Get the orb for a given aspect.
 *
 * @param aspectType - Type of aspect
 * @param orbs - Optional orb overrides
 * @returns Orb in degrees
 */
function getOrb(aspectType: AspectType, orbs?: Partial<Record<AspectType, number>>): number {
  if (orbs?.[aspectType] !== undefined) {
    return orbs[aspectType]!;
  }
  return PROGRESSION_ORBS[aspectType] ?? 1.0;
}

/**
 * Calculate aspect strength based on orb.
 *
 * @param separation - Angular separation
 * @param exactAngle - Exact aspect angle
 * @param orb - Maximum orb
 * @returns Strength (0-100), 100 = exact
 */
function calculateStrength(separation: number, exactAngle: number, orb: number): number {
  const deviation = Math.abs(separation - exactAngle);
  if (deviation > orb) return 0;
  return Math.round((1 - deviation / orb) * 100);
}

/**
 * Determine aspect phase: applying, exact, or separating.
 *
 * @param progressedLong - Current progressed longitude
 * @param natalLong - Natal longitude
 * @param aspectAngle - Aspect angle
 * @param dailyMotion - Estimated daily motion (positive = direct)
 * @param deviation - Current deviation from exact
 * @param exactThreshold - Threshold for 'exact' classification
 * @returns Phase: 'applying', 'exact', or 'separating'
 */
function determineAspectPhase(
  progressedLong: number,
  natalLong: number,
  aspectAngle: number,
  dailyMotion: number,
  deviation: number,
  exactThreshold: number,
): ProgressedAspectPhase {
  // If within exact threshold, it's exact
  if (deviation <= exactThreshold) {
    return 'exact';
  }

  const currentSep = angularSeparation(progressedLong, natalLong);
  // Simulate small time forward
  const futureLong = progressedLong + dailyMotion * 0.01;
  const futureSep = angularSeparation(futureLong, natalLong);

  const currentDev = Math.abs(currentSep - aspectAngle);
  const futureDev = Math.abs(futureSep - aspectAngle);

  return futureDev < currentDev ? 'applying' : 'separating';
}

// =============================================================================
// ASPECT DETECTION
// =============================================================================

/**
 * Detect aspects between a progressed body and natal positions.
 *
 * @param progressedBody - Progressed body position
 * @param natalPositions - Array of natal positions
 * @param config - Aspect detection configuration
 * @returns Array of detected aspects
 */
export function detectProgressedToNatalAspects(
  progressedBody: ProgressedPlanet,
  natalPositions: Array<{ name: string; longitude: number }>,
  config: AspectConfig = {},
): ProgressedAspect[] {
  const aspects: ProgressedAspect[] = [];
  const aspectTypes = config.aspectTypes ?? [...MAJOR_PROGRESSION_ASPECTS];
  const exactThreshold = config.exactThreshold ?? EXACT_THRESHOLD;
  const minimumStrength = config.minimumStrength ?? 0;

  for (const natal of natalPositions) {
    // Skip self-aspects
    if (natal.name === progressedBody.name) continue;

    const separation = angularSeparation(progressedBody.longitude, natal.longitude);

    for (const aspectType of aspectTypes) {
      const exactAngle = getAspectAngle(aspectType);
      const orb = getOrb(aspectType, config.orbs);
      const deviation = Math.abs(separation - exactAngle);

      if (deviation <= orb) {
        const strength = calculateStrength(separation, exactAngle, orb);

        if (strength >= minimumStrength) {
          // Use longitudeSpeed for motion direction
          const dailyMotion = progressedBody.longitudeSpeed;

          const phase = determineAspectPhase(
            progressedBody.longitude,
            natal.longitude,
            exactAngle,
            dailyMotion,
            deviation,
            exactThreshold,
          );

          aspects.push({
            progressedBody: progressedBody.name,
            progressedLongitude: progressedBody.longitude,
            natalBody: natal.name,
            natalLongitude: natal.longitude,
            aspectType,
            symbol: getAspectSymbol(aspectType),
            exactAngle,
            separation,
            deviation,
            orb,
            strength,
            phase,
            isRetrograde: progressedBody.isRetrograde,
          });
        }
      }
    }
  }

  return aspects;
}

/**
 * Detect aspects between two sets of progressed positions.
 *
 * @param positions - Array of progressed body positions
 * @param config - Aspect detection configuration
 * @returns Array of detected progressed-to-progressed aspects
 */
export function detectProgressedToProgressedAspects(
  positions: ProgressedPlanet[],
  config: AspectConfig = {},
): ProgressedAspect[] {
  const aspects: ProgressedAspect[] = [];
  const aspectTypes = config.aspectTypes ?? [...MAJOR_PROGRESSION_ASPECTS];
  const exactThreshold = config.exactThreshold ?? EXACT_THRESHOLD;
  const minimumStrength = config.minimumStrength ?? 0;

  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const body1 = positions[i];
      const body2 = positions[j];

      const separation = angularSeparation(body1.longitude, body2.longitude);

      for (const aspectType of aspectTypes) {
        const exactAngle = getAspectAngle(aspectType);
        const orb = getOrb(aspectType, config.orbs);
        const deviation = Math.abs(separation - exactAngle);

        if (deviation <= orb) {
          const strength = calculateStrength(separation, exactAngle, orb);

          if (strength >= minimumStrength) {
            // Determine phase based on relative motion
            const phase: ProgressedAspectPhase =
              deviation <= exactThreshold ? 'exact' : 'separating';

            aspects.push({
              progressedBody: body1.name,
              progressedLongitude: body1.longitude,
              natalBody: `P.${body2.name}`, // Mark as progressed
              natalLongitude: body2.longitude,
              aspectType,
              symbol: getAspectSymbol(aspectType),
              exactAngle,
              separation,
              deviation,
              orb,
              strength,
              phase,
              isRetrograde: body1.isRetrograde,
            });
          }
        }
      }
    }
  }

  return aspects;
}

/**
 * Get the exact angle for an aspect type.
 */
function getAspectAngle(aspectType: AspectType): number {
  const angles: Record<AspectType, number> = {
    conjunction: 0,
    opposition: 180,
    trine: 120,
    square: 90,
    sextile: 60,
    quincunx: 150,
    'semi-sextile': 30,
    'semi-square': 45,
    sesquiquadrate: 135,
    quintile: 72,
    biquintile: 144,
    septile: 51.43,
    novile: 40,
    decile: 36,
  };
  return angles[aspectType] ?? 0;
}

/**
 * Get the symbol for an aspect type.
 */
function getAspectSymbol(aspectType: AspectType): string {
  const symbols: Record<AspectType, string> = {
    conjunction: '☌',
    opposition: '☍',
    trine: '△',
    square: '□',
    sextile: '⚹',
    quincunx: '⚻',
    'semi-sextile': '⚺',
    'semi-square': '∠',
    sesquiquadrate: '⚼',
    quintile: 'Q',
    biquintile: 'bQ',
    septile: 'S',
    novile: 'N',
    decile: 'D',
  };
  return symbols[aspectType] ?? '?';
}

// =============================================================================
// HIGH-LEVEL API
// =============================================================================

/**
 * Detect all aspects for a progressed chart.
 *
 * @param birthJD - Julian Date of birth
 * @param targetJD - Julian Date to progress to
 * @param progressionType - Type of progression
 * @param config - Aspect detection configuration
 * @returns Complete aspect detection result
 */
export function detectProgressedAspects(
  birthJD: number,
  targetJD: number,
  progressionType: ProgressionType = 'secondary',
  config: AspectConfig = {},
): AspectDetectionResult {
  const bodies = DEFAULT_PROGRESSION_BODIES as unknown as ProgressedBodyName[];

  // Get natal positions
  const natalPositions = bodies.map((name) => ({
    name,
    longitude: getNatalPosition(name, birthJD).longitude,
  }));

  // Get progressed positions
  const progressedPositions = bodies.map((name) =>
    getProgressedPosition(name, birthJD, targetJD, progressionType),
  );

  // Detect progressed-to-natal aspects
  const pToNAspects: ProgressedAspect[] = [];
  for (const progressed of progressedPositions) {
    const aspectsForBody = detectProgressedToNatalAspects(progressed, natalPositions, config);
    pToNAspects.push(...aspectsForBody);
  }

  // Optionally detect progressed-to-progressed aspects
  let pToPAspects: ProgressedAspect[] = [];
  if (config.includeProgressedToProgressed) {
    pToPAspects = detectProgressedToProgressedAspects(progressedPositions, config);
  }

  const allAspects = [...pToNAspects, ...pToPAspects];

  // Categorize aspects
  const exactAspects = allAspects.filter((a) => a.phase === 'exact');
  const applyingAspects = allAspects.filter((a) => a.phase === 'applying');
  const separatingAspects = allAspects.filter((a) => a.phase === 'separating');

  return {
    aspects: allAspects,
    exactAspects,
    applyingAspects,
    separatingAspects,
    summary: {
      total: allAspects.length,
      exact: exactAspects.length,
      applying: applyingAspects.length,
      separating: separatingAspects.length,
    },
  };
}

/**
 * Detect aspects from birth data and target date.
 */
export function calculateProgressedAspects(
  birth: ProgressionBirthData,
  target: ProgressionTargetDate,
  progressionType: ProgressionType = 'secondary',
  config: AspectConfig = {},
): AspectDetectionResult {
  const birthJD = birthToJD(birth);
  const targetJD = targetToJD(target);
  return detectProgressedAspects(birthJD, targetJD, progressionType, config);
}

// =============================================================================
// SPECIALIZED QUERIES
// =============================================================================

/**
 * Find all aspects to a specific natal body.
 *
 * @param aspects - Array of aspects
 * @param bodyName - Name of natal body to filter for
 * @returns Aspects involving that natal body
 */
export function getAspectsToNatalBody(
  aspects: ProgressedAspect[],
  bodyName: string,
): ProgressedAspect[] {
  return aspects.filter((a) => a.natalBody === bodyName);
}

/**
 * Find all aspects from a specific progressed body.
 *
 * @param aspects - Array of aspects
 * @param bodyName - Name of progressed body to filter for
 * @returns Aspects from that progressed body
 */
export function getAspectsFromProgressedBody(
  aspects: ProgressedAspect[],
  bodyName: string,
): ProgressedAspect[] {
  return aspects.filter((a) => a.progressedBody === bodyName);
}

/**
 * Get the strongest aspect.
 */
export function getStrongestAspect(aspects: ProgressedAspect[]): ProgressedAspect | undefined {
  if (aspects.length === 0) return undefined;
  return aspects.reduce((max, current) => (current.strength > max.strength ? current : max));
}

/**
 * Get aspects by type.
 */
export function getAspectsByType(
  aspects: ProgressedAspect[],
  aspectType: AspectType,
): ProgressedAspect[] {
  return aspects.filter((a) => a.aspectType === aspectType);
}

/**
 * Sort aspects by strength (strongest first).
 */
export function sortByStrength(aspects: ProgressedAspect[]): ProgressedAspect[] {
  return [...aspects].sort((a, b) => b.strength - a.strength);
}

// =============================================================================
// FORMATTING
// =============================================================================

/**
 * Format aspect for display.
 */
export function formatAspect(aspect: ProgressedAspect): string {
  const exactMarker = aspect.phase === 'exact' ? '★' : '';
  return (
    `${aspect.progressedBody} ${aspect.symbol} ${aspect.natalBody} ` +
    `(${aspect.deviation.toFixed(2)}° orb, ${aspect.strength}% strength, ${aspect.phase})${exactMarker}`
  );
}

/**
 * Format all aspects for display.
 */
export function formatAspects(result: AspectDetectionResult): string {
  const lines: string[] = [
    '=== Progression Aspects ===',
    '',
    `Total: ${result.summary.total} aspects`,
    `Exact: ${result.summary.exact}`,
    `Applying: ${result.summary.applying}`,
    `Separating: ${result.summary.separating}`,
    '',
  ];

  if (result.exactAspects.length > 0) {
    lines.push('Exact/Near-Exact Aspects:');
    for (const aspect of result.exactAspects) {
      lines.push(`  ${formatAspect(aspect)}`);
    }
    lines.push('');
  }

  if (result.aspects.length > 0) {
    lines.push('All Aspects (by strength):');
    const sorted = sortByStrength(result.aspects);
    for (const aspect of sorted.slice(0, 20)) {
      lines.push(`  ${formatAspect(aspect)}`);
    }
  }

  return lines.join('\n');
}
