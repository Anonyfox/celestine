/**
 * Arabic Parts / Lots Calculator
 *
 * Calculates the positions of Arabic Parts (also called Lots), which are
 * sensitive points derived from the positions of planets and chart angles.
 *
 * @module ephemeris/lots
 *
 * @remarks
 * Arabic Parts (or Lots) are calculated points in astrology, not physical bodies.
 * The most famous is the **Part of Fortune** (Lot of Fortune), calculated from
 * the Sun, Moon, and Ascendant.
 *
 * The traditional formula varies by day/night:
 * - **Day chart** (Sun above horizon): ASC + Moon - Sun
 * - **Night chart** (Sun below horizon): ASC + Sun - Moon
 *
 * Some modern astrologers use the day formula for all charts.
 */

import { getMoonPosition } from './moon.js';
import { getSunPosition } from './sun.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Part of Fortune calculation options.
 */
export interface PartOfFortuneOptions {
  /** Whether to use the traditional day/night formula distinction. @default true */
  useDayNightFormula?: boolean;
  /** Force day or night formula. Only used if useDayNightFormula is true. */
  isDayChart?: boolean;
}

/**
 * Part of Fortune result.
 */
export interface PartOfFortuneResult {
  /** Longitude in degrees [0, 360) */
  longitude: number;
  /** Whether day formula was used */
  isDayChart: boolean;
  /** Sun longitude used in calculation */
  sunLongitude: number;
  /** Moon longitude used in calculation */
  moonLongitude: number;
  /** Ascendant longitude used in calculation */
  ascendant: number;
}

// =============================================================================
// Part of Fortune
// =============================================================================

/**
 * Calculate the Part of Fortune longitude.
 *
 * @param sunLon - Sun longitude in degrees
 * @param moonLon - Moon longitude in degrees
 * @param ascendant - Ascendant longitude in degrees
 * @param isDayChart - Whether it's a day chart (Sun above horizon)
 * @returns Part of Fortune longitude in degrees [0, 360)
 */
export function calculatePartOfFortune(
  sunLon: number,
  moonLon: number,
  ascendant: number,
  isDayChart: boolean,
): number {
  let pof: number;

  if (isDayChart) {
    pof = ascendant + moonLon - sunLon;
  } else {
    pof = ascendant + sunLon - moonLon;
  }

  pof = pof % 360;
  if (pof < 0) pof += 360;

  return pof;
}

/**
 * Calculate the Part of Fortune from Julian Date and Ascendant.
 *
 * @param jd - Julian Date
 * @param ascendant - Ascendant longitude in degrees
 * @param options - Calculation options
 * @returns Part of Fortune result with all components
 */
export function getPartOfFortune(
  jd: number,
  ascendant: number,
  options: PartOfFortuneOptions = {},
): PartOfFortuneResult {
  const { useDayNightFormula = true, isDayChart: forceDayChart } = options;

  const sun = getSunPosition(jd);
  const moon = getMoonPosition(jd);

  let isDayChart: boolean;

  if (forceDayChart !== undefined) {
    isDayChart = forceDayChart;
  } else if (!useDayNightFormula) {
    isDayChart = true;
  } else {
    const descendant = (ascendant + 180) % 360;

    let sunAboveHorizon: boolean;

    if (ascendant < descendant) {
      sunAboveHorizon = sun.longitude >= descendant || sun.longitude < ascendant;
    } else {
      sunAboveHorizon = sun.longitude >= descendant && sun.longitude < ascendant;
    }

    isDayChart = sunAboveHorizon;
  }

  const longitude = calculatePartOfFortune(sun.longitude, moon.longitude, ascendant, isDayChart);

  return {
    longitude,
    isDayChart,
    sunLongitude: sun.longitude,
    moonLongitude: moon.longitude,
    ascendant,
  };
}

/**
 * Calculate the Part of Fortune using only the day formula.
 *
 * @param sunLon - Sun longitude in degrees
 * @param moonLon - Moon longitude in degrees
 * @param ascendant - Ascendant longitude in degrees
 * @returns Part of Fortune longitude in degrees [0, 360)
 */
export function calculatePartOfFortuneDayFormula(
  sunLon: number,
  moonLon: number,
  ascendant: number,
): number {
  return calculatePartOfFortune(sunLon, moonLon, ascendant, true);
}

// =============================================================================
// Part of Spirit (Lot of Spirit)
// =============================================================================

/**
 * Calculate the Part of Spirit (Lot of Spirit) longitude.
 * The Part of Spirit uses the opposite formula from Part of Fortune.
 *
 * @param sunLon - Sun longitude in degrees
 * @param moonLon - Moon longitude in degrees
 * @param ascendant - Ascendant longitude in degrees
 * @param isDayChart - Whether it's a day chart
 * @returns Part of Spirit longitude in degrees [0, 360)
 */
export function calculatePartOfSpirit(
  sunLon: number,
  moonLon: number,
  ascendant: number,
  isDayChart: boolean,
): number {
  return calculatePartOfFortune(sunLon, moonLon, ascendant, !isDayChart);
}

/**
 * Get the Part of Spirit from Julian Date and Ascendant.
 *
 * @param jd - Julian Date
 * @param ascendant - Ascendant longitude in degrees
 * @param options - Calculation options
 * @returns Part of Spirit result
 */
export function getPartOfSpirit(
  jd: number,
  ascendant: number,
  options: PartOfFortuneOptions = {},
): PartOfFortuneResult {
  const pof = getPartOfFortune(jd, ascendant, options);

  const longitude = calculatePartOfSpirit(
    pof.sunLongitude,
    pof.moonLongitude,
    pof.ascendant,
    pof.isDayChart,
  );

  return {
    ...pof,
    longitude,
  };
}

// =============================================================================
// Reference Information
// =============================================================================

/**
 * Arabic Parts/Lots characteristics (for reference).
 */
export const LOTS_CHARACTERISTICS = {
  /** Part of Fortune moves approximately this many degrees per day (tied to Moon) */
  dailyMotion: 13,
  /** Part of Fortune completes zodiac cycle in approximately this many days */
  period: 27.3,
} as const;
