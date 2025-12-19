/**
 * Progression Summary
 *
 * Generate comprehensive summaries of progressed charts.
 *
 * @module progressions/progression-summary
 */

import { birthToJD, targetToJD, calculateAge } from './progression-date.js';
import { calculateSolarArc } from './solar-arc.js';
import { getAllProgressedPositions, getBodiesWithSignChange } from './progressed-positions.js';
import { calculateProgressedAngles } from './progressed-angles.js';
import { getProgressedMoonReport, type ProgressedMoonReport } from './progressed-moon.js';
import { detectProgressionAspects, type AspectDetectionResult } from './progressed-aspects.js';
import type {
  ProgressedAngle,
  ProgressedBody,
  ProgressionBirthData,
  ProgressionConfig,
  ProgressionResult,
  ProgressionSummary,
  ProgressionTargetDate,
  ProgressionType,
} from './types.js';
import { DEFAULT_PROGRESSION_CONFIG } from './constants.js';
import type { ProgressedAngles } from './progressed-angles.js';

// =============================================================================
// MAIN SUMMARY FUNCTION
// =============================================================================

/**
 * Generate a complete progression result.
 *
 * @param birth - Birth data
 * @param target - Target date
 * @param config - Optional configuration
 * @returns Complete progression result
 */
export function calculateProgression(
  birth: ProgressionBirthData,
  target: ProgressionTargetDate,
  config?: Partial<ProgressionConfig>,
): ProgressionResult {
  const mergedConfig = { ...DEFAULT_PROGRESSION_CONFIG, ...config };
  const birthJD = birthToJD(birth);
  const targetJD = targetToJD(target);

  // Calculate solar arc
  const solarArc = calculateSolarArc(birthJD, targetJD);

  // Calculate progressed positions
  const bodies = getAllProgressedPositions(birthJD, targetJD, mergedConfig.type);

  // Calculate progressed angles
  const angles = calculateProgressedAngles(
    birth,
    target,
    mergedConfig.angleMethod ?? 'solar-arc',
    mergedConfig.type,
  );

  // Detect aspects
  const aspectResult = detectProgressionAspects(birthJD, targetJD, mergedConfig.type, {
    aspectTypes: mergedConfig.aspectTypes,
    orbs: mergedConfig.orbs,
    includeProgressedToProgressed: mergedConfig.includeProgressedAspects,
    minimumStrength: mergedConfig.minimumStrength,
    exactThreshold: mergedConfig.exactThreshold,
  });

  // Build summary
  const summary = generateSummary(birthJD, targetJD, bodies, angles, aspectResult);

  return {
    type: mergedConfig.type,
    birthJD,
    targetJD,
    ageAtTarget: calculateAge(birthJD, targetJD),
    solarArc,
    bodies,
    angles: {
      ascendant: angles.ascendant,
      midheaven: angles.midheaven,
      descendant: angles.descendant,
      imumCoeli: angles.imumCoeli,
    },
    aspects: aspectResult.aspects,
    summary,
  };
}

/**
 * Generate summary statistics.
 */
function generateSummary(
  birthJD: number,
  targetJD: number,
  bodies: ProgressedBody[],
  angles: ProgressedAngles,
  aspectResult: AspectDetectionResult,
): ProgressionSummary {
  const signChanges = getBodiesWithSignChange(bodies);
  const retrogradeBodies = bodies.filter((b) => b.isRetrograde);

  return {
    totalAspects: aspectResult.summary.total,
    exactAspects: aspectResult.summary.exact,
    applyingAspects: aspectResult.summary.applying,
    separatingAspects: aspectResult.summary.separating,
    bodiesChangedSign: signChanges.map((b) => b.name),
    retrogradeBodies: retrogradeBodies.map((b) => b.name),
    ascChangedSign: angles.ascendant.hasChangedSign,
    mcChangedSign: angles.midheaven.hasChangedSign,
  };
}

// =============================================================================
// SPECIALIZED REPORTS
// =============================================================================

/**
 * Get a Moon-focused progression report.
 */
export function getMoonProgressionReport(
  birth: ProgressionBirthData,
  target: ProgressionTargetDate,
): ProgressedMoonReport {
  return getProgressedMoonReport(birth, target);
}

/**
 * Get exact aspects only.
 */
export function getExactAspects(
  birth: ProgressionBirthData,
  target: ProgressionTargetDate,
  progressionType: ProgressionType = 'secondary',
): AspectDetectionResult['exactAspects'] {
  const birthJD = birthToJD(birth);
  const targetJD = targetToJD(target);
  const result = detectProgressionAspects(birthJD, targetJD, progressionType);
  return result.exactAspects;
}

/**
 * Get bodies that have changed sign.
 */
export function getSignChanges(
  birth: ProgressionBirthData,
  target: ProgressionTargetDate,
  progressionType: ProgressionType = 'secondary',
): ProgressedBody[] {
  const birthJD = birthToJD(birth);
  const targetJD = targetToJD(target);
  const bodies = getAllProgressedPositions(birthJD, targetJD, progressionType);
  return getBodiesWithSignChange(bodies);
}

// =============================================================================
// FORMATTING
// =============================================================================

/**
 * Format a complete progression result.
 */
export function formatProgressionResult(result: ProgressionResult): string {
  const lines: string[] = [
    '════════════════════════════════════════════════════════════════',
    `  PROGRESSED CHART (${result.type.toUpperCase()})`,
    '════════════════════════════════════════════════════════════════',
    '',
    `Age at Target: ${result.ageAtTarget.toFixed(2)} years`,
    `Solar Arc: ${result.solarArc.toFixed(2)}°`,
    '',
    '── PROGRESSED POSITIONS ──────────────────────────────────────────',
  ];

  for (const body of result.bodies) {
    const signChange = body.hasChangedSign ? ' ★' : '';
    const retro = body.isRetrograde ? ' (R)' : '';
    lines.push(
      `  ${body.name.padEnd(10)} ${body.progressedFormatted.padEnd(20)} ` +
        `Arc: ${body.arcFromNatal.toFixed(1)}°${signChange}${retro}`,
    );
  }

  lines.push('');
  lines.push('── PROGRESSED ANGLES ───────────────────────────────────────────');
  lines.push(`  ASC: ${result.angles.ascendant.progressedFormatted}`);
  lines.push(`  MC:  ${result.angles.midheaven.progressedFormatted}`);

  if (result.summary.ascChangedSign) {
    lines.push('  ⚠ ASC has changed sign since birth');
  }
  if (result.summary.mcChangedSign) {
    lines.push('  ⚠ MC has changed sign since birth');
  }

  lines.push('');
  lines.push('── ASPECTS SUMMARY ─────────────────────────────────────────────');
  lines.push(`  Total: ${result.summary.totalAspects}`);
  lines.push(`  Exact: ${result.summary.exactAspects}`);
  lines.push(`  Applying: ${result.summary.applyingAspects}`);
  lines.push(`  Separating: ${result.summary.separatingAspects}`);

  if (result.summary.bodiesChangedSign.length > 0) {
    lines.push('');
    lines.push(`  Bodies changed sign: ${result.summary.bodiesChangedSign.join(', ')}`);
  }

  if (result.summary.retrogradeBodies.length > 0) {
    lines.push(`  Retrograde bodies: ${result.summary.retrogradeBodies.join(', ')}`);
  }

  lines.push('');
  lines.push('════════════════════════════════════════════════════════════════');

  return lines.join('\n');
}

