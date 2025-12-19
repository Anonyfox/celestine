/**
 * Progressed Positions Calculations
 *
 * Calculate progressed positions for planets and points.
 *
 * @module progressions/progressed-positions
 *
 * @remarks
 * This module provides functions to calculate progressed positions
 * for all celestial bodies using different progression types.
 *
 * For secondary progressions, all bodies are calculated for the progressed date.
 * For solar arc progressions, all bodies are directed by the solar arc.
 *
 * @see IMPL.md Section 2 for calculation methodology
 */

import { getChironPosition } from '../ephemeris/chiron.js';
import { getMoonPosition } from '../ephemeris/moon.js';
import { getTrueNode } from '../ephemeris/nodes.js';
import { getJupiterPosition } from '../ephemeris/planets/jupiter.js';
import { getMarsPosition } from '../ephemeris/planets/mars.js';
import { getMercuryPosition } from '../ephemeris/planets/mercury.js';
import { getNeptunePosition } from '../ephemeris/planets/neptune.js';
import { getPlutoPosition } from '../ephemeris/planets/pluto.js';
import { getSaturnPosition } from '../ephemeris/planets/saturn.js';
import { getUranusPosition } from '../ephemeris/planets/uranus.js';
import { getVenusPosition } from '../ephemeris/planets/venus.js';
import { CelestialBody } from '../ephemeris/positions.js';
import { getSunPosition } from '../ephemeris/sun.js';
import { DEFAULT_PROGRESSION_BODIES, SIGN_NAMES } from './constants.js';
import { birthToJD, getProgressedJD, targetToJD } from './progression-date.js';
import { applySolarArc, calculateSolarArc } from './solar-arc.js';
import type {
  ProgressedPlanet,
  ProgressionBirthData,
  ProgressionConfig,
  ProgressionTargetDate,
  ProgressionType,
} from './types.js';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Body names supported for progressed positions.
 */
export type ProgressedBodyName =
  | 'Sun'
  | 'Moon'
  | 'Mercury'
  | 'Venus'
  | 'Mars'
  | 'Jupiter'
  | 'Saturn'
  | 'Uranus'
  | 'Neptune'
  | 'Pluto'
  | 'Chiron'
  | 'TrueNode';

/**
 * Internal position result from ephemeris.
 */
interface EphemerisPosition {
  longitude: number;
  latitude?: number;
  distance?: number;
}

/**
 * Function type for getting a celestial position.
 */
type PositionGetter = (jd: number) => EphemerisPosition;

// =============================================================================
// POSITION GETTERS
// =============================================================================

/**
 * Map of body names to their position getter functions.
 */
/**
 * Wrapper for TrueNode to return standard position format.
 */
function getTrueNodePosition(jd: number): EphemerisPosition {
  const node = getTrueNode(jd);
  return { longitude: node.northNode };
}

const POSITION_GETTERS: Record<ProgressedBodyName, PositionGetter> = {
  Sun: getSunPosition,
  Moon: getMoonPosition,
  Mercury: getMercuryPosition,
  Venus: getVenusPosition,
  Mars: getMarsPosition,
  Jupiter: getJupiterPosition,
  Saturn: getSaturnPosition,
  Uranus: getUranusPosition,
  Neptune: getNeptunePosition,
  Pluto: getPlutoPosition,
  Chiron: getChironPosition,
  TrueNode: getTrueNodePosition,
};

/**
 * Map body names to CelestialBody enum.
 */
const BODY_NAME_TO_ENUM: Record<ProgressedBodyName, CelestialBody> = {
  Sun: CelestialBody.Sun,
  Moon: CelestialBody.Moon,
  Mercury: CelestialBody.Mercury,
  Venus: CelestialBody.Venus,
  Mars: CelestialBody.Mars,
  Jupiter: CelestialBody.Jupiter,
  Saturn: CelestialBody.Saturn,
  Uranus: CelestialBody.Uranus,
  Neptune: CelestialBody.Neptune,
  Pluto: CelestialBody.Pluto,
  Chiron: CelestialBody.Chiron,
  TrueNode: CelestialBody.TrueNorthNode,
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Normalize longitude to 0-360 range.
 */
function normalizeLongitude(longitude: number): number {
  let result = longitude % 360;
  if (result < 0) result += 360;
  return result;
}

/**
 * Convert longitude to zodiac details.
 */
function longitudeToZodiac(longitude: number): {
  signIndex: number;
  signName: string;
  degree: number;
  minute: number;
  second: number;
  formatted: string;
} {
  const normalized = normalizeLongitude(longitude);
  const signIndex = Math.floor(normalized / 30);
  const positionInSign = normalized - signIndex * 30;
  const degree = Math.floor(positionInSign);
  const minuteDecimal = (positionInSign - degree) * 60;
  const minute = Math.floor(minuteDecimal);
  const second = Math.round((minuteDecimal - minute) * 60);

  const signName = SIGN_NAMES[signIndex];
  const formatted = `${degree}°${minute.toString().padStart(2, '0')}' ${signName}`;

  return { signIndex, signName, degree, minute, second, formatted };
}

/**
 * Determine if a planet is retrograde based on position change.
 *
 * @param currentJD - Current Julian Date
 * @param getPosition - Position getter function
 * @returns True if retrograde
 */
function isRetrograde(currentJD: number, getPosition: PositionGetter): boolean {
  const pos1 = getPosition(currentJD - 0.5);
  const pos2 = getPosition(currentJD + 0.5);

  let diff = pos2.longitude - pos1.longitude;
  // Handle wraparound
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;

  return diff < 0;
}

// =============================================================================
// CORE POSITION CALCULATIONS
// =============================================================================

/**
 * Get the natal position of a body.
 *
 * @param bodyName - Name of the celestial body
 * @param birthJD - Julian Date of birth
 * @returns Natal position
 */
export function getNatalPosition(bodyName: ProgressedBodyName, birthJD: number): EphemerisPosition {
  const getPosition = POSITION_GETTERS[bodyName];
  if (!getPosition) {
    throw new Error(`Unknown body: ${bodyName}`);
  }
  return getPosition(birthJD);
}

/**
 * Calculate longitudinal speed (degrees/day) for a body at a given JD.
 */
function calculateLongitudeSpeed(jd: number, getPosition: PositionGetter): number {
  const pos1 = getPosition(jd - 0.5);
  const pos2 = getPosition(jd + 0.5);
  let diff = pos2.longitude - pos1.longitude;
  // Handle wraparound
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return diff;
}

/**
 * Get progressed position for a single body using secondary progression.
 *
 * @param bodyName - Name of the celestial body
 * @param birthJD - Julian Date of birth
 * @param targetJD - Julian Date to progress to
 * @param progressionType - Type of progression (default: secondary)
 * @returns Progressed position information matching ProgressedPlanet interface
 */
export function getProgressedPosition(
  bodyName: ProgressedBodyName,
  birthJD: number,
  targetJD: number,
  progressionType: ProgressionType = 'secondary',
): ProgressedPlanet {
  const getPosition = POSITION_GETTERS[bodyName];
  if (!getPosition) {
    throw new Error(`Unknown body: ${bodyName}`);
  }

  // Get natal position and retrograde status
  const natal = getPosition(birthJD);
  const natalRetrograde = isRetrograde(birthJD, getPosition);
  const natalZodiac = longitudeToZodiac(natal.longitude);

  let progressedLong: number;
  let progressedRetrograde: boolean;
  let progressedSpeed: number;
  let progressedJD: number;

  if (progressionType === 'solar-arc') {
    // Solar arc: all bodies directed by the Sun's progressed motion
    const solarArc = calculateSolarArc(birthJD, targetJD);
    progressedLong = applySolarArc(natal.longitude, solarArc);
    // Solar arc bodies can't be "retrograde" (they move uniformly)
    progressedRetrograde = false;
    progressedSpeed = 0; // No independent motion
    progressedJD = birthJD; // Reference is natal chart
  } else {
    // Secondary/Minor/Tertiary: calculate position for progressed date
    progressedJD = getProgressedJD(birthJD, targetJD, progressionType);
    const progressed = getPosition(progressedJD);
    progressedLong = progressed.longitude;
    progressedRetrograde = isRetrograde(progressedJD, getPosition);
    progressedSpeed = calculateLongitudeSpeed(progressedJD, getPosition);
  }

  const progressedZodiac = longitudeToZodiac(progressedLong);

  // Calculate arc from natal (normalized to -180 to 180)
  let arcFromNatal = progressedLong - natal.longitude;
  while (arcFromNatal > 180) arcFromNatal -= 360;
  while (arcFromNatal < -180) arcFromNatal += 360;

  return {
    // ProgressedPosition fields
    longitude: progressedLong,
    natalLongitude: natal.longitude,
    arcFromNatal: Math.abs(arcFromNatal),
    signIndex: progressedZodiac.signIndex,
    signName: progressedZodiac.signName,
    degree: progressedZodiac.degree,
    minute: progressedZodiac.minute,
    second: progressedZodiac.second,
    formatted: progressedZodiac.formatted,
    hasChangedSign: progressedZodiac.signIndex !== natalZodiac.signIndex,

    // ProgressedPlanet-specific fields
    name: bodyName,
    body: BODY_NAME_TO_ENUM[bodyName],
    isRetrograde: progressedRetrograde,
    longitudeSpeed: progressedSpeed,
    retrogradeChanged: progressedRetrograde !== natalRetrograde,
    wasRetrograde: natalRetrograde,
  };
}

/**
 * Get progressed positions for multiple bodies.
 *
 * @param bodies - Array of body names to calculate
 * @param birthJD - Julian Date of birth
 * @param targetJD - Julian Date to progress to
 * @param progressionType - Type of progression
 * @returns Array of progressed body positions
 */
export function getProgressedPositions(
  bodies: ProgressedBodyName[],
  birthJD: number,
  targetJD: number,
  progressionType: ProgressionType = 'secondary',
): ProgressedPlanet[] {
  return bodies.map((body) => getProgressedPosition(body, birthJD, targetJD, progressionType));
}

/**
 * Get progressed positions for all default bodies.
 *
 * @param birthJD - Julian Date of birth
 * @param targetJD - Julian Date to progress to
 * @param progressionType - Type of progression
 * @returns Array of progressed body positions
 */
export function getAllProgressedPositions(
  birthJD: number,
  targetJD: number,
  progressionType: ProgressionType = 'secondary',
): ProgressedPlanet[] {
  return getProgressedPositions(
    DEFAULT_PROGRESSION_BODIES as ProgressedBodyName[],
    birthJD,
    targetJD,
    progressionType,
  );
}

// =============================================================================
// HIGH-LEVEL API
// =============================================================================

/**
 * Calculate progressed positions from birth data and target date.
 *
 * @param birth - Birth data
 * @param target - Target date
 * @param config - Optional configuration
 * @returns Array of progressed body positions
 */
export function calculateProgressedPositions(
  birth: ProgressionBirthData,
  target: ProgressionTargetDate,
  config?: Partial<ProgressionConfig>,
): ProgressedPlanet[] {
  const birthJD = birthToJD(birth);
  const targetJD = targetToJD(target);
  const progressionType = config?.type ?? 'secondary';
  const bodies =
    (config?.bodies as ProgressedBodyName[]) ??
    (DEFAULT_PROGRESSION_BODIES as ProgressedBodyName[]);

  return getProgressedPositions(bodies, birthJD, targetJD, progressionType);
}

/**
 * Get a specific progressed body position from birth data and target date.
 *
 * @param bodyName - Name of body to calculate
 * @param birth - Birth data
 * @param target - Target date
 * @param progressionType - Type of progression
 * @returns Progressed body position
 */
export function getProgressedBodyFromDates(
  bodyName: ProgressedBodyName,
  birth: ProgressionBirthData,
  target: ProgressionTargetDate,
  progressionType: ProgressionType = 'secondary',
): ProgressedPlanet {
  const birthJD = birthToJD(birth);
  const targetJD = targetToJD(target);
  return getProgressedPosition(bodyName, birthJD, targetJD, progressionType);
}

// =============================================================================
// SPECIALIZED QUERIES
// =============================================================================

/**
 * Get bodies that have changed sign since birth.
 *
 * @param positions - Array of progressed positions
 * @returns Array of bodies that changed sign
 */
export function getBodiesWithSignChange(positions: ProgressedPlanet[]): ProgressedPlanet[] {
  return positions.filter((p) => p.hasChangedSign);
}

/**
 * Get bodies currently retrograde (in secondary progressions).
 *
 * @param positions - Array of progressed positions
 * @returns Array of retrograde bodies
 */
export function getRetrogradeBodies(positions: ProgressedPlanet[]): ProgressedPlanet[] {
  return positions.filter((p) => p.isRetrograde);
}

/**
 * Find the body with the largest arc from natal.
 *
 * @param positions - Array of progressed positions
 * @returns Body with largest arc, or undefined if empty
 */
export function getBodyWithLargestArc(positions: ProgressedPlanet[]): ProgressedPlanet | undefined {
  if (positions.length === 0) return undefined;
  return positions.reduce((max, current) =>
    current.arcFromNatal > max.arcFromNatal ? current : max,
  );
}

/**
 * Get positions sorted by progressed longitude.
 *
 * @param positions - Array of progressed positions
 * @returns Sorted array
 */
export function sortByLongitude(positions: ProgressedPlanet[]): ProgressedPlanet[] {
  return [...positions].sort((a, b) => a.longitude - b.longitude);
}

/**
 * Get positions grouped by sign.
 *
 * @param positions - Array of progressed positions
 * @returns Map of sign name to bodies in that sign
 */
export function groupBySign(positions: ProgressedPlanet[]): Map<string, ProgressedPlanet[]> {
  const result = new Map<string, ProgressedPlanet[]>();

  for (const pos of positions) {
    const sign = pos.signName;
    if (!result.has(sign)) {
      result.set(sign, []);
    }
    result.get(sign)!.push(pos);
  }

  return result;
}
