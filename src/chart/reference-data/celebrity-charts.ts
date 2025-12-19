/**
 * Celebrity Chart Reference Data
 *
 * @remarks
 * Reference data sourced from Astrodatabank and Swiss Ephemeris.
 * All data has Rodden Rating AA (accurate birth record) unless noted.
 *
 * SOURCES:
 * - Astrodatabank: https://www.astro.com/astro-databank/
 * - Swiss Ephemeris via pyswisseph 2.10.03
 * - Astro.com chart calculation
 *
 * DO NOT modify these values without re-sourcing from authoritative data.
 */

import type { BirthData } from '../types.js';

/**
 * Reference chart data with expected positions
 */
export interface ReferenceChart {
  /** Human-readable name */
  name: string;

  /** Source of birth data */
  source: string;

  /** Rodden Rating (AA = most accurate) */
  roddenRating: 'AA' | 'A' | 'B' | 'C' | 'DD' | 'X';

  /** Birth data */
  birth: BirthData;

  /** Expected planetary positions */
  expected: {
    sun?: { sign: string; degree: number; tolerance?: number };
    moon?: { sign: string; degree: number; tolerance?: number };
    mercury?: { sign: string; degree: number; tolerance?: number };
    venus?: { sign: string; degree: number; tolerance?: number };
    mars?: { sign: string; degree: number; tolerance?: number };
    jupiter?: { sign: string; degree: number; tolerance?: number };
    saturn?: { sign: string; degree: number; tolerance?: number };
    ascendant?: { sign: string; degree: number; tolerance?: number };
    midheaven?: { sign: string; degree: number; tolerance?: number };
  };
}

/**
 * Albert Einstein
 *
 * Source: Astrodatabank - https://www.astro.com/astro-databank/Einstein,_Albert
 * Rodden Rating: AA (birth certificate)
 * Birth: March 14, 1879, 11:30 AM LMT
 * Location: Ulm, Germany (48°24'N, 10°00'E)
 *
 * VERIFIED via Swiss Ephemeris (pyswisseph 2.10.03) on 2024-12-19:
 * - JD (UT): 2407422.951389
 * - GMST: 334.1841° | LST: 344.1841°
 * - Obliquity: 23.456466°
 *
 * Swiss Ephemeris output for angles (Placidus):
 * - ASC: 101.6464° = 11°38.8' Cancer
 * - MC: 342.8399° = 12°50.4' Pisces
 *
 * LMT offset: 10°E = +40 minutes = +0.667 hours from GMT
 */
export const EINSTEIN: ReferenceChart = {
  name: 'Albert Einstein',
  source: 'Astrodatabank (birth certificate) + Swiss Ephemeris 2.10.03',
  roddenRating: 'AA',
  birth: {
    year: 1879,
    month: 3,
    day: 14,
    hour: 11,
    minute: 30,
    second: 0,
    timezone: 0.667, // LMT for Ulm (10°E longitude = +40 min)
    latitude: 48.4,
    longitude: 10.0,
  },
  expected: {
    // SWISS EPHEMERIS VERIFIED VALUES (pyswisseph 2.10.03)
    // Sun: 353.5077° = 23°30.5' Pisces
    sun: { sign: 'Pisces', degree: 23.5, tolerance: 1 },
    // Moon: 254.5259° = 14°31.6' Sagittarius
    moon: { sign: 'Sagittarius', degree: 14.5, tolerance: 1 },
    // Mercury: 3.1439° = 3°8.6' Aries
    mercury: { sign: 'Aries', degree: 3, tolerance: 1 },
    // Venus: 16.9850° = 16°59.1' Aries
    venus: { sign: 'Aries', degree: 17, tolerance: 1 },
    // Mars: 296.9142° = 26°54.9' Capricorn
    mars: { sign: 'Capricorn', degree: 27, tolerance: 1 },
    // Jupiter: 327.4840° = 27°29.0' Aquarius
    jupiter: { sign: 'Aquarius', degree: 27.5, tolerance: 1 },
    // Saturn: 4.1898° = 4°11.4' Aries
    saturn: { sign: 'Aries', degree: 4, tolerance: 1 },
    // ASC: 101.6464° = 11°38.8' Cancer (Swiss Ephemeris verified)
    ascendant: { sign: 'Cancer', degree: 11.6, tolerance: 2 },
    // MC: 342.8399° = 12°50.4' Pisces (Swiss Ephemeris verified)
    // NOTE: Some web sources incorrectly show ~17° Aries. Swiss Ephemeris
    // definitively confirms MC is 12°50' Pisces (Placidus system).
    midheaven: { sign: 'Pisces', degree: 12.8, tolerance: 2 },
  },
};

/**
 * Queen Elizabeth II
 *
 * Source: Astrodatabank - https://www.astro.com/astro-databank/Elizabeth_II,_Queen_of_England
 * Rodden Rating: AA (Buckingham Palace records)
 * Birth: April 21, 1926, 2:40 AM BST
 * Location: London, UK (51°30'N, 0°10'W)
 */
export const QUEEN_ELIZABETH_II: ReferenceChart = {
  name: 'Queen Elizabeth II',
  source: 'Astrodatabank (Buckingham Palace)',
  roddenRating: 'AA',
  birth: {
    year: 1926,
    month: 4,
    day: 21,
    hour: 2,
    minute: 40,
    second: 0,
    timezone: 1, // BST (British Summer Time)
    latitude: 51.5,
    longitude: -0.167,
  },
  expected: {
    sun: { sign: 'Taurus', degree: 0, tolerance: 1 },
    moon: { sign: 'Leo', degree: 12, tolerance: 2 },
    ascendant: { sign: 'Capricorn', degree: 21, tolerance: 3 },
  },
};

/**
 * J2000.0 Epoch Reference
 *
 * This is the standard astronomical epoch, not a person.
 * Used as a baseline validation point.
 *
 * Source: IAU/USNO definition, Swiss Ephemeris
 */
export const J2000_EPOCH: ReferenceChart = {
  name: 'J2000.0 Epoch',
  source: 'IAU/Swiss Ephemeris',
  roddenRating: 'AA',
  birth: {
    year: 2000,
    month: 1,
    day: 1,
    hour: 12,
    minute: 0,
    second: 0,
    timezone: 0,
    latitude: 0,
    longitude: 0,
  },
  expected: {
    // Swiss Ephemeris: Sun at 280.37° = 10°22' Capricorn
    sun: { sign: 'Capricorn', degree: 10, tolerance: 1 },
    // Swiss Ephemeris: Moon at 223.32° = 13°19' Scorpio
    moon: { sign: 'Scorpio', degree: 13, tolerance: 1 },
    // Mercury at 271.89° = 1°53' Capricorn
    mercury: { sign: 'Capricorn', degree: 2, tolerance: 1 },
  },
};

/**
 * All reference charts for testing
 */
export const CELEBRITY_CHARTS = {
  einstein: EINSTEIN,
  queenElizabethII: QUEEN_ELIZABETH_II,
  j2000: J2000_EPOCH,
};
