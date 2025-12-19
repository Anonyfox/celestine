/**
 * Progression Summary
 *
 * Generate comprehensive summaries of progressed charts.
 *
 * @module progressions/progression-summary
 */

import { DEFAULT_PROGRESSION_CONFIG } from './constants.js';
import { calculateProgressedAngles } from './progressed-angles.js';
import {
  type AspectDetectionResult,
  detectProgressedAspects,
  getStrongestAspect,
} from './progressed-aspects.js';
import { getProgressedMoonReport, type ProgressedMoonReport } from './progressed-moon.js';
import { getAllProgressedPositions, getBodiesWithSignChange } from './progressed-positions.js';
import { birthToJD, calculateAge, getProgressedJD, targetToJD } from './progression-date.js';
import { applySolarArc, calculateSolarArc } from './solar-arc.js';
import type {
  ProgressedAngles,
  ProgressedChart,
  ProgressedChartDates,
  ProgressedDate,
  ProgressedMoonInfo,
  ProgressedPlanet,
  ProgressedRetrogradeChange,
  ProgressedSignChange,
  ProgressionBirthData,
  ProgressionConfig,
  ProgressionSummary,
  ProgressionTargetDate,
  ProgressionType,
} from './types.js';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Convert Julian Date to ProgressedDate.
 */
function jdToProgressedDate(jd: number): ProgressedDate {
  // Julian Date to calendar conversion
  const z = Math.floor(jd + 0.5);
  const f = jd + 0.5 - z;
  let a: number;
  if (z < 2299161) {
    a = z;
  } else {
    const alpha = Math.floor((z - 1867216.25) / 36524.25);
    a = z + 1 + alpha - Math.floor(alpha / 4);
  }
  const b = a + 1524;
  const c = Math.floor((b - 122.1) / 365.25);
  const d = Math.floor(365.25 * c);
  const e = Math.floor((b - d) / 30.6001);

  const day = b - d - Math.floor(30.6001 * e);
  const month = e < 14 ? e - 1 : e - 13;
  const year = month > 2 ? c - 4716 : c - 4715;

  const hourDecimal = f * 24;
  const hour = Math.floor(hourDecimal);
  const minuteDecimal = (hourDecimal - hour) * 60;
  const minute = Math.floor(minuteDecimal);
  const second = Math.round((minuteDecimal - minute) * 60);

  return { year, month, day, hour, minute, second };
}

/**
 * Create ProgressedChartDates from birth and target dates.
 */
function createChartDates(
  birthJD: number,
  targetJD: number,
  progressionType: ProgressionType,
): ProgressedChartDates {
  const progressedJD = getProgressedJD(birthJD, targetJD, progressionType);
  const daysFromBirth = progressedJD - birthJD;
  const ageInYears = calculateAge(birthJD, targetJD);

  return {
    natalJD: birthJD,
    natalDate: jdToProgressedDate(birthJD),
    targetJD,
    targetDate: jdToProgressedDate(targetJD),
    progressedJD,
    progressedDate: jdToProgressedDate(progressedJD),
    daysFromBirth,
    ageInYears,
  };
}

/**
 * Create solar arc directed positions.
 */
function createSolarArcPositions(
  planets: ProgressedPlanet[],
  solarArc: number,
): ProgressedPlanet[] {
  return planets.map((planet) => ({
    ...planet,
    longitude: applySolarArc(planet.natalLongitude, solarArc),
  }));
}

/**
 * Create sign change records from planets.
 */
function createSignChanges(planets: ProgressedPlanet[]): ProgressedSignChange[] {
  const SIGN_NAMES = [
    'Aries',
    'Taurus',
    'Gemini',
    'Cancer',
    'Leo',
    'Virgo',
    'Libra',
    'Scorpio',
    'Sagittarius',
    'Capricorn',
    'Aquarius',
    'Pisces',
  ];

  return planets
    .filter((p) => p.hasChangedSign)
    .map((p) => {
      const natalSignIndex = Math.floor(p.natalLongitude / 30);
      return {
        body: p.name,
        bodyEnum: p.body,
        fromSign: SIGN_NAMES[natalSignIndex],
        toSign: p.signName,
        approximateAge: p.arcFromNatal, // Rough approximation: 1° ≈ 1 year
      };
    });
}

/**
 * Create retrograde change records.
 */
function createRetrogradeChanges(planets: ProgressedPlanet[]): ProgressedRetrogradeChange[] {
  return planets
    .filter((p) => p.retrogradeChanged)
    .map((p) => ({
      body: p.name,
      bodyEnum: p.body,
      direction: p.isRetrograde ? 'turned-retrograde' : 'turned-direct',
      approximateAge: p.arcFromNatal,
      longitude: p.longitude,
    }));
}

/**
 * Create progressed Moon info.
 */
function createProgressedMoonInfo(moonReport: ProgressedMoonReport): ProgressedMoonInfo {
  const currentTransit = moonReport.signTransits.find(
    (t) => t.signName === moonReport.current.signName,
  );
  const currentIdx = moonReport.signTransits.findIndex(
    (t) => t.signName === moonReport.current.signName,
  );

  return {
    sign: moonReport.current.signName,
    monthsInSign: currentTransit
      ? (moonReport.phase.phaseAngle / 360) * currentTransit.durationYears * 12
      : 0,
    monthsUntilNextSign: (moonReport.ageAtNextSignChange - moonReport.zodiacCyclesCompleted) * 12,
    lastSignChange:
      currentIdx > 0
        ? {
            fromSign: moonReport.signTransits[currentIdx - 1].signName,
            toSign: moonReport.current.signName,
            age: currentTransit?.entryAge ?? 0,
          }
        : null,
    nextSignChange:
      currentIdx < moonReport.signTransits.length - 1
        ? {
            fromSign: moonReport.current.signName,
            toSign: moonReport.signTransits[currentIdx + 1]?.signName ?? '',
            age: moonReport.ageAtNextSignChange,
          }
        : null,
  };
}

// =============================================================================
// MAIN SUMMARY FUNCTION
// =============================================================================

/**
 * Generate a complete progression result matching ProgressedChart interface.
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
): ProgressedChart {
  const mergedConfig: Required<ProgressionConfig> = {
    type: config?.type ?? DEFAULT_PROGRESSION_CONFIG.type ?? 'secondary',
    angleMethod: config?.angleMethod ?? DEFAULT_PROGRESSION_CONFIG.angleMethod ?? 'solar-arc',
    bodies: config?.bodies ?? DEFAULT_PROGRESSION_CONFIG.bodies ?? [],
    includeProgressedAspects:
      config?.includeProgressedAspects ??
      DEFAULT_PROGRESSION_CONFIG.includeProgressedAspects ??
      false,
    includeNatalAspects:
      config?.includeNatalAspects ?? DEFAULT_PROGRESSION_CONFIG.includeNatalAspects ?? true,
    aspectTypes: config?.aspectTypes ?? DEFAULT_PROGRESSION_CONFIG.aspectTypes ?? [],
    orbs: config?.orbs ?? DEFAULT_PROGRESSION_CONFIG.orbs ?? {},
    includeSolarArc: config?.includeSolarArc ?? DEFAULT_PROGRESSION_CONFIG.includeSolarArc ?? true,
    minimumStrength: config?.minimumStrength ?? DEFAULT_PROGRESSION_CONFIG.minimumStrength ?? 0,
    exactThreshold: config?.exactThreshold ?? DEFAULT_PROGRESSION_CONFIG.exactThreshold ?? 0.1,
  };

  const birthJD = birthToJD(birth);
  const targetJD = targetToJD(target);

  // Calculate dates
  const dates = createChartDates(birthJD, targetJD, mergedConfig.type);

  // Calculate solar arc
  const solarArc = calculateSolarArc(birthJD, targetJD);

  // Calculate progressed positions
  const planets = getAllProgressedPositions(birthJD, targetJD, mergedConfig.type);

  // Calculate solar arc positions
  const solarArcPositions = mergedConfig.includeSolarArc
    ? createSolarArcPositions(planets, solarArc)
    : [];

  // Calculate progressed angles
  const anglesResult = calculateProgressedAngles(
    birth,
    target,
    mergedConfig.angleMethod,
    mergedConfig.type,
  );

  const angles: ProgressedAngles = {
    ascendant: anglesResult.ascendant,
    midheaven: anglesResult.midheaven,
    descendant: anglesResult.descendant,
    imumCoeli: anglesResult.imumCoeli,
  };

  // Detect aspects
  const aspectResult = detectProgressedAspects(birthJD, targetJD, mergedConfig.type, {
    aspectTypes: mergedConfig.aspectTypes,
    orbs: mergedConfig.orbs,
    includeProgressedToProgressed: mergedConfig.includeProgressedAspects,
    minimumStrength: mergedConfig.minimumStrength,
    exactThreshold: mergedConfig.exactThreshold,
  });

  // Get Moon report for summary
  const moonReport = getProgressedMoonReport(birth, target);

  // Build summary
  const summary = generateSummary(planets, aspectResult, solarArc, moonReport);

  return {
    dates,
    planets,
    angles,
    solarArc,
    solarArcPositions,
    aspectsToNatal: aspectResult.aspects.filter((a) => !a.natalBody.startsWith('P.')),
    aspectsProgressed: aspectResult.aspects.filter((a) => a.natalBody.startsWith('P.')),
    summary,
    config: mergedConfig,
  };
}

/**
 * Generate summary matching ProgressionSummary interface.
 */
function generateSummary(
  planets: ProgressedPlanet[],
  aspectResult: AspectDetectionResult,
  solarArc: number,
  moonReport: ProgressedMoonReport,
): ProgressionSummary {
  const signChanges = createSignChanges(planets);
  const retrogradeChanges = createRetrogradeChanges(planets);
  const approachingAspects = aspectResult.applyingAspects.filter((a) => a.deviation <= 1.0);
  const mostSignificant = getStrongestAspect(aspectResult.aspects);

  return {
    signChanges,
    retrogradeChanges,
    exactAspects: aspectResult.exactAspects,
    approachingAspects,
    progressedMoon: createProgressedMoonInfo(moonReport),
    mostSignificantAspect: mostSignificant ?? null,
    solarArc,
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
  const result = detectProgressedAspects(birthJD, targetJD, progressionType);
  return result.exactAspects;
}

/**
 * Get bodies that have changed sign.
 */
export function getSignChanges(
  birth: ProgressionBirthData,
  target: ProgressionTargetDate,
  progressionType: ProgressionType = 'secondary',
): ProgressedPlanet[] {
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
export function formatProgressedChart(result: ProgressedChart): string {
  const lines: string[] = [
    '════════════════════════════════════════════════════════════════',
    `  PROGRESSED CHART (${result.config.type.toUpperCase()})`,
    '════════════════════════════════════════════════════════════════',
    '',
    `Age at Target: ${result.dates.ageInYears.toFixed(2)} years`,
    `Solar Arc: ${result.solarArc.toFixed(2)}°`,
    '',
    '── PROGRESSED POSITIONS ──────────────────────────────────────────',
  ];

  for (const body of result.planets) {
    const signChange = body.hasChangedSign ? ' ★' : '';
    const retro = body.isRetrograde ? ' (R)' : '';
    lines.push(
      `  ${body.name.padEnd(10)} ${body.formatted.padEnd(20)} ` +
        `Arc: ${body.arcFromNatal.toFixed(1)}°${signChange}${retro}`,
    );
  }

  lines.push('');
  lines.push('── PROGRESSED ANGLES ───────────────────────────────────────────');
  lines.push(`  ASC: ${result.angles.ascendant.formatted}`);
  lines.push(`  MC:  ${result.angles.midheaven.formatted}`);

  if (result.angles.ascendant.hasChangedSign) {
    lines.push('  ⚠ ASC has changed sign since birth');
  }
  if (result.angles.midheaven.hasChangedSign) {
    lines.push('  ⚠ MC has changed sign since birth');
  }

  lines.push('');
  lines.push('── ASPECTS SUMMARY ─────────────────────────────────────────────');
  lines.push(`  To Natal: ${result.aspectsToNatal.length}`);
  lines.push(`  Exact: ${result.summary.exactAspects.length}`);
  lines.push(`  Approaching: ${result.summary.approachingAspects.length}`);

  if (result.summary.signChanges.length > 0) {
    lines.push('');
    lines.push(
      `  Bodies changed sign: ${result.summary.signChanges.map((s) => s.body).join(', ')}`,
    );
  }

  if (result.summary.retrogradeChanges.length > 0) {
    lines.push(
      `  Retrograde changes: ${result.summary.retrogradeChanges.map((r) => r.body).join(', ')}`,
    );
  }

  if (result.summary.mostSignificantAspect) {
    const aspect = result.summary.mostSignificantAspect;
    lines.push('');
    lines.push(
      `  Most Significant: ${aspect.progressedBody} ${aspect.symbol} ${aspect.natalBody} (${aspect.strength}%)`,
    );
  }

  lines.push('');
  lines.push('════════════════════════════════════════════════════════════════');

  return lines.join('\n');
}
