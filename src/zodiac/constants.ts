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
// Sign symbols are consecutive Unicode code points; elements, modalities and
// polarities repeat every four, three and two signs respectively. A fourth row
// value supplies the traditional ruler when the primary ruler is modern.
export const SIGN_DATA: Record<Sign, SignInfo> = /* @__PURE__ */ Object.fromEntries(
  [
    ['Aries', Planet.Mars],
    ['Taurus', Planet.Venus],
    ['Gemini', Planet.Mercury],
    ['Cancer', Planet.Moon],
    ['Leo', Planet.Sun],
    ['Virgo', Planet.Mercury],
    ['Libra', Planet.Venus],
    ['Scorpio', Planet.Pluto, Planet.Mars],
    ['Sagittarius', Planet.Jupiter],
    ['Capricorn', Planet.Saturn],
    ['Aquarius', Planet.Uranus, Planet.Saturn],
    ['Pisces', Planet.Neptune, Planet.Jupiter],
  ].map(([name, ruler, traditionalRuler], sign) => [
    sign,
    {
      sign,
      name,
      symbol: String.fromCharCode(0x2648 + sign),
      element: [Element.Fire, Element.Earth, Element.Air, Element.Water][sign % 4],
      modality: [Modality.Cardinal, Modality.Fixed, Modality.Mutable][sign % 3],
      polarity: sign % 2 === 0 ? Polarity.Positive : Polarity.Negative,
      ruler,
      traditionalRuler: traditionalRuler ?? ruler,
      ...(traditionalRuler === undefined ? {} : { modernRuler: ruler }),
      startDegree: sign * 30,
      endDegree: (sign + 1) * 30,
    },
  ]),
) as Record<Sign, SignInfo>;

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
