/**
 * Zodiac module constants
 *
 * Reference data for zodiac signs, planetary rulerships, and essential dignities.
 *
 * **Traditional Sources (Pre-1781):**
 * - Claudius Ptolemy, "Tetrabiblos" (c. 160 CE) - Book I, Chapters 18-20
 *   Original doctrine of domiciles, exaltations, and essential dignities
 * - William Lilly, "Christian Astrology" (1647) - Pages 104-115
 *   Comprehensive dignity tables, English Renaissance standard
 *
 * **Modern Additions (Post-Discovery):**
 * - Uranus (discovered 1781): Co-rules Aquarius with Saturn
 * - Neptune (discovered 1846): Co-rules Pisces with Jupiter
 * - Pluto (discovered 1930): Co-rules Scorpio with Mars
 *
 * **Note on Outer Planet Exaltations:**
 * Uranus, Neptune, and Pluto have no universally agreed exaltations in
 * traditional astrology, so they are correctly set to undefined.
 *
 * @see Ptolemy's Tetrabiblos: https://www.sacred-texts.com/astro/ptb/
 * @see Skyscript (modern compilation): https://www.skyscript.co.uk/dignities.html
 * @module zodiac/constants
 */

import type { ExaltationData, SignInfo } from './types.js';
import { Element, Modality, Planet, Polarity, Sign } from './types.js';

/**
 * Complete data for all twelve zodiac signs
 *
 * Includes element, modality, polarity, and rulers for each sign.
 *
 * @constant
 */
export const SIGN_DATA: Record<Sign, SignInfo> = {
  [Sign.Aries]: {
    sign: Sign.Aries,
    name: 'Aries',
    symbol: '♈',
    element: Element.Fire,
    modality: Modality.Cardinal,
    polarity: Polarity.Positive,
    ruler: Planet.Mars,
    traditionalRuler: Planet.Mars,
    startDegree: 0,
    endDegree: 30,
  },
  [Sign.Taurus]: {
    sign: Sign.Taurus,
    name: 'Taurus',
    symbol: '♉',
    element: Element.Earth,
    modality: Modality.Fixed,
    polarity: Polarity.Negative,
    ruler: Planet.Venus,
    traditionalRuler: Planet.Venus,
    startDegree: 30,
    endDegree: 60,
  },
  [Sign.Gemini]: {
    sign: Sign.Gemini,
    name: 'Gemini',
    symbol: '♊',
    element: Element.Air,
    modality: Modality.Mutable,
    polarity: Polarity.Positive,
    ruler: Planet.Mercury,
    traditionalRuler: Planet.Mercury,
    startDegree: 60,
    endDegree: 90,
  },
  [Sign.Cancer]: {
    sign: Sign.Cancer,
    name: 'Cancer',
    symbol: '♋',
    element: Element.Water,
    modality: Modality.Cardinal,
    polarity: Polarity.Negative,
    ruler: Planet.Moon,
    traditionalRuler: Planet.Moon,
    startDegree: 90,
    endDegree: 120,
  },
  [Sign.Leo]: {
    sign: Sign.Leo,
    name: 'Leo',
    symbol: '♌',
    element: Element.Fire,
    modality: Modality.Fixed,
    polarity: Polarity.Positive,
    ruler: Planet.Sun,
    traditionalRuler: Planet.Sun,
    startDegree: 120,
    endDegree: 150,
  },
  [Sign.Virgo]: {
    sign: Sign.Virgo,
    name: 'Virgo',
    symbol: '♍',
    element: Element.Earth,
    modality: Modality.Mutable,
    polarity: Polarity.Negative,
    ruler: Planet.Mercury,
    traditionalRuler: Planet.Mercury,
    startDegree: 150,
    endDegree: 180,
  },
  [Sign.Libra]: {
    sign: Sign.Libra,
    name: 'Libra',
    symbol: '♎',
    element: Element.Air,
    modality: Modality.Cardinal,
    polarity: Polarity.Positive,
    ruler: Planet.Venus,
    traditionalRuler: Planet.Venus,
    startDegree: 180,
    endDegree: 210,
  },
  [Sign.Scorpio]: {
    sign: Sign.Scorpio,
    name: 'Scorpio',
    symbol: '♏',
    element: Element.Water,
    modality: Modality.Fixed,
    polarity: Polarity.Negative,
    ruler: Planet.Pluto, // Modern ruler
    traditionalRuler: Planet.Mars,
    modernRuler: Planet.Pluto,
    startDegree: 210,
    endDegree: 240,
  },
  [Sign.Sagittarius]: {
    sign: Sign.Sagittarius,
    name: 'Sagittarius',
    symbol: '♐',
    element: Element.Fire,
    modality: Modality.Mutable,
    polarity: Polarity.Positive,
    ruler: Planet.Jupiter,
    traditionalRuler: Planet.Jupiter,
    startDegree: 240,
    endDegree: 270,
  },
  [Sign.Capricorn]: {
    sign: Sign.Capricorn,
    name: 'Capricorn',
    symbol: '♑',
    element: Element.Earth,
    modality: Modality.Cardinal,
    polarity: Polarity.Negative,
    ruler: Planet.Saturn,
    traditionalRuler: Planet.Saturn,
    startDegree: 270,
    endDegree: 300,
  },
  [Sign.Aquarius]: {
    sign: Sign.Aquarius,
    name: 'Aquarius',
    symbol: '♒',
    element: Element.Air,
    modality: Modality.Fixed,
    polarity: Polarity.Positive,
    ruler: Planet.Uranus, // Modern ruler
    traditionalRuler: Planet.Saturn,
    modernRuler: Planet.Uranus,
    startDegree: 300,
    endDegree: 330,
  },
  [Sign.Pisces]: {
    sign: Sign.Pisces,
    name: 'Pisces',
    symbol: '♓',
    element: Element.Water,
    modality: Modality.Mutable,
    polarity: Polarity.Negative,
    ruler: Planet.Neptune, // Modern ruler
    traditionalRuler: Planet.Jupiter,
    modernRuler: Planet.Neptune,
    startDegree: 330,
    endDegree: 360,
  },
};

/**
 * Planetary rulerships (domiciles)
 *
 * Each planet rules one or two signs. Traditional rulerships include Mars
 * ruling both Aries and Scorpio. Modern rulerships assign outer planets
 * to Scorpio (Pluto), Aquarius (Uranus), and Pisces (Neptune).
 *
 * @constant
 * @see Ptolemy's Tetrabiblos, Book I, Chapter 18
 */
export const PLANETARY_RULERSHIPS: Record<Planet, Sign[]> = {
  [Planet.Sun]: [Sign.Leo],
  [Planet.Moon]: [Sign.Cancer],
  [Planet.Mercury]: [Sign.Gemini, Sign.Virgo],
  [Planet.Venus]: [Sign.Taurus, Sign.Libra],
  [Planet.Mars]: [Sign.Aries, Sign.Scorpio], // Traditional
  [Planet.Jupiter]: [Sign.Sagittarius, Sign.Pisces], // Traditional
  [Planet.Saturn]: [Sign.Capricorn, Sign.Aquarius], // Traditional
  [Planet.Uranus]: [Sign.Aquarius], // Modern (discovered 1781)
  [Planet.Neptune]: [Sign.Pisces], // Modern (discovered 1846)
  [Planet.Pluto]: [Sign.Scorpio], // Modern (discovered 1930)
};

/**
 * Planetary exaltations
 *
 * Each of the seven traditional planets has a sign and specific degree
 * where it is considered "exalted" or honored.
 *
 * **Exact Degrees (from traditional sources):**
 * - Sun in Aries at 19°
 * - Moon in Taurus at 3°
 * - Mercury in Virgo at 15° (but Mercury also RULES Virgo, so Domicile takes precedence)
 * - Venus in Pisces at 27°
 * - Mars in Capricorn at 28°
 * - Jupiter in Cancer at 15°
 * - Saturn in Libra at 21°
 *
 * These degrees are from William Lilly's "Christian Astrology" (1647) and
 * represent the traditional teaching. Modern practice often treats the entire
 * sign as the exaltation zone rather than emphasizing the exact degree.
 *
 * **Modern Planets:**
 * Uranus, Neptune, and Pluto have no universally agreed exaltations in
 * traditional astrology. Various modern sources propose different exaltations,
 * but there is no consensus, so they are correctly set to undefined.
 *
 * @constant
 * @see Ptolemy's Tetrabiblos, Book I, Chapter 19
 * @see William Lilly's Christian Astrology (1647), p. 104-115
 */
export const EXALTATIONS: Record<Planet, ExaltationData | undefined> = {
  [Planet.Sun]: { sign: Sign.Aries, degree: 19 },
  [Planet.Moon]: { sign: Sign.Taurus, degree: 3 },
  [Planet.Mercury]: { sign: Sign.Virgo, degree: 15 },
  [Planet.Venus]: { sign: Sign.Pisces, degree: 27 },
  [Planet.Mars]: { sign: Sign.Capricorn, degree: 28 },
  [Planet.Jupiter]: { sign: Sign.Cancer, degree: 15 },
  [Planet.Saturn]: { sign: Sign.Libra, degree: 21 },
  // Outer planets have no traditional exaltations
  [Planet.Uranus]: undefined,
  [Planet.Neptune]: undefined,
  [Planet.Pluto]: undefined,
};

/**
 * Planet symbols (Unicode)
 *
 * Standard astronomical/astrological symbols for the ten planets.
 *
 * @constant
 */
export const PLANET_SYMBOLS: Record<Planet, string> = {
  [Planet.Sun]: '☉',
  [Planet.Moon]: '☽',
  [Planet.Mercury]: '☿',
  [Planet.Venus]: '♀',
  [Planet.Mars]: '♂',
  [Planet.Jupiter]: '♃',
  [Planet.Saturn]: '♄',
  [Planet.Uranus]: '♅',
  [Planet.Neptune]: '♆',
  [Planet.Pluto]: '♇',
};

/**
 * Dignity strength values
 *
 * Traditional point system for essential dignities.
 *
 * @constant
 */
export const DIGNITY_STRENGTH = {
  DOMICILE: 5,
  EXALTATION: 4,
  PEREGRINE: 0,
  DETRIMENT: -5,
  FALL: -4,
} as const;
