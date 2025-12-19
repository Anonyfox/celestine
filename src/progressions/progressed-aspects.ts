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
  PROGRESSION_ORBS,
  MAJOR_PROGRESSION_ASPECTS,
  DEFAULT_PROGRESSION_BODIES,
  EXACT_THRESHOLD,
} from './constants.js';
import { birthToJD, targetToJD } from './progression-date.js';
import {
  getProgressedPosition,
  getNatalPosition,
  type ProgressedBodyName,
} from './progressed-positions.js';
import type {
  ProgressedBody,
  ProgressionAspect,
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
  aspects: ProgressionAspect[];
  /** Exact or near-exact aspects */
  exactAspects: ProgressionAspect[];
  /** Applying aspects (getting closer) */
  applyingAspects: ProgressionAspect[];
  /** Separating aspects (getting further) */
  separatingAspects: ProgressionAspect[];
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
function getOrb(
  aspectType: AspectType,
  orbs?: Partial<Record<AspectType, number>>,
): number {
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
function calculateStrength(
  separation: number,
  exactAngle: number,
  orb: number,
): number {
  const deviation = Math.abs(separation - exactAngle);
  if (deviation > orb) return 0;
  return Math.round((1 - deviation / orb) * 100);
}

/**
 * Determine if aspect is applying or separating.
 *
 * @param progressedLong - Current progressed longitude
 * @param natalLong - Natal longitude
 * @param aspectAngle - Aspect angle
 * @param dailyMotion - Estimated daily motion (positive = direct)
 * @returns 'applying' or 'separating'
 */
function determineAspectPhase(
  progressedLong: number,
  natalLong: number,
  aspectAngle: number,
  dailyMotion: number,
): 'applying' | 'separating' {
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
  progressedBody: ProgressedBody,
  natalPositions: Array<{ name: string; longitude: number }>,
  config: AspectConfig = {},
): ProgressionAspect[] {
  const aspects: ProgressionAspect[] = [];
  const aspectTypes = config.aspectTypes ?? [...MAJOR_PROGRESSION_ASPECTS];
  const exactThreshold = config.exactThreshold ?? EXACT_THRESHOLD;
  const minimumStrength = config.minimumStrength ?? 0;

  for (const natal of natalPositions) {
    // Skip self-aspects
    if (natal.name === progressedBody.name) continue;

    const separation = angularSeparation(
      progressedBody.progressedLongitude,
      natal.longitude,
    );

    for (const aspectType of aspectTypes) {
      const exactAngle = getAspectAngle(aspectType);
      const orb = getOrb(aspectType, config.orbs);
      const deviation = Math.abs(separation - exactAngle);

      if (deviation <= orb) {
        const strength = calculateStrength(separation, exactAngle, orb);

        if (strength >= minimumStrength) {
          // Estimate daily motion based on arc (rough approximation)
          const dailyMotion = progressedBody.arcDirection === 'direct' ? 1 : -1;

          const phase = determineAspectPhase(
            progressedBody.progressedLongitude,
            natal.longitude,
            exactAngle,
            dailyMotion,
          );

          aspects.push({
            progressedBody: progressedBody.name,
            natalBody: natal.name,
            aspectType,
            exactAngle,
            actualAngle: separation,
            orb: deviation,
            isExact: deviation <= exactThreshold,
            isApplying: phase === 'applying',
            strength,
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
  positions: ProgressedBody[],
  config: AspectConfig = {},
): ProgressionAspect[] {
  const aspects: ProgressionAspect[] = [];
  const aspectTypes = config.aspectTypes ?? [...MAJOR_PROGRESSION_ASPECTS];
  const exactThreshold = config.exactThreshold ?? EXACT_THRESHOLD;
  const minimumStrength = config.minimumStrength ?? 0;

  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const body1 = positions[i];
      const body2 = positions[j];

      const separation = angularSeparation(
        body1.progressedLongitude,
        body2.progressedLongitude,
      );

      for (const aspectType of aspectTypes) {
        const exactAngle = getAspectAngle(aspectType);
        const orb = getOrb(aspectType, config.orbs);
        const deviation = Math.abs(separation - exactAngle);

        if (deviation <= orb) {
          const strength = calculateStrength(separation, exactAngle, orb);

          if (strength >= minimumStrength) {
            aspects.push({
              progressedBody: body1.name,
              natalBody: `P.${body2.name}`, // Mark as progressed
              aspectType,
              exactAngle,
              actualAngle: separation,
              orb: deviation,
              isExact: deviation <= exactThreshold,
              isApplying: false, // Hard to determine for P-P aspects
              strength,
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
    semisextile: 30,
    semisquare: 45,
    sesquiquadrate: 135,
    quintile: 72,
    biquintile: 144,
  };
  return angles[aspectType] ?? 0;
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
export function detectProgressionAspects(
  birthJD: number,
  targetJD: number,
  progressionType: ProgressionType = 'secondary',
  config: AspectConfig = {},
): AspectDetectionResult {
  const bodies = (DEFAULT_PROGRESSION_BODIES as unknown as ProgressedBodyName[]);

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
  const pToNAspects: ProgressionAspect[] = [];
  for (const progressed of progressedPositions) {
    const aspectsForBody = detectProgressedToNatalAspects(progressed, natalPositions, config);
    pToNAspects.push(...aspectsForBody);
  }

  // Optionally detect progressed-to-progressed aspects
  let pToPAspects: ProgressionAspect[] = [];
  if (config.includeProgressedToProgressed) {
    pToPAspects = detectProgressedToProgressedAspects(progressedPositions, config);
  }

  const allAspects = [...pToNAspects, ...pToPAspects];

  // Categorize aspects
  const exactAspects = allAspects.filter((a) => a.isExact);
  const applyingAspects = allAspects.filter((a) => a.isApplying);
  const separatingAspects = allAspects.filter((a) => !a.isApplying);

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
export function calculateProgressionAspects(
  birth: ProgressionBirthData,
  target: ProgressionTargetDate,
  progressionType: ProgressionType = 'secondary',
  config: AspectConfig = {},
): AspectDetectionResult {
  const birthJD = birthToJD(birth);
  const targetJD = targetToJD(target);
  return detectProgressionAspects(birthJD, targetJD, progressionType, config);
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
  aspects: ProgressionAspect[],
  bodyName: string,
): ProgressionAspect[] {
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
  aspects: ProgressionAspect[],
  bodyName: string,
): ProgressionAspect[] {
  return aspects.filter((a) => a.progressedBody === bodyName);
}

/**
 * Get the strongest aspect.
 */
export function getStrongestAspect(aspects: ProgressionAspect[]): ProgressionAspect | undefined {
  if (aspects.length === 0) return undefined;
  return aspects.reduce((max, current) =>
    current.strength > max.strength ? current : max,
  );
}

/**
 * Get aspects by type.
 */
export function getAspectsByType(
  aspects: ProgressionAspect[],
  aspectType: AspectType,
): ProgressionAspect[] {
  return aspects.filter((a) => a.aspectType === aspectType);
}

/**
 * Sort aspects by strength (strongest first).
 */
export function sortByStrength(aspects: ProgressionAspect[]): ProgressionAspect[] {
  return [...aspects].sort((a, b) => b.strength - a.strength);
}

// =============================================================================
// FORMATTING
// =============================================================================

/**
 * Format aspect for display.
 */
export function formatAspect(aspect: ProgressionAspect): string {
  const exactMarker = aspect.isExact ? '★' : '';
  const phase = aspect.isApplying ? 'applying' : 'separating';
  return `${aspect.progressedBody} ${aspect.aspectType} ${aspect.natalBody} ` +
    `(${aspect.orb.toFixed(2)}° orb, ${aspect.strength}% strength, ${phase})${exactMarker}`;
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

