/**
 * Zodiac module types
 *
 * Type definitions for zodiac signs, planetary dignities, and related astrological concepts.
 * All types are based on the tropical zodiac system (0° Aries = vernal equinox).
 *
 * @module zodiac/types
 */

/**
 * The twelve zodiac signs
 *
 * Enumerated 0-11 corresponding to 30° segments of the ecliptic,
 * starting from the vernal equinox (0° Aries).
 *
 * @enum {number}
 */
export enum Sign {
  Aries = 0,
  Taurus = 1,
  Gemini = 2,
  Cancer = 3,
  Leo = 4,
  Virgo = 5,
  Libra = 6,
  Scorpio = 7,
  Sagittarius = 8,
  Capricorn = 9,
  Aquarius = 10,
  Pisces = 11,
}

/**
 * The four classical elements
 *
 * Each element is associated with three signs (triplicities).
 *
 * @enum {string}
 */
export enum Element {
  Fire = 'Fire',
  Earth = 'Earth',
  Air = 'Air',
  Water = 'Water',
}

/**
 * The three modalities (qualities)
 *
 * Each modality is associated with four signs (quadruplicities).
 *
 * @enum {string}
 */
export enum Modality {
  Cardinal = 'Cardinal',
  Fixed = 'Fixed',
  Mutable = 'Mutable',
}

/**
 * Polarity (masculine/feminine, yang/yin)
 *
 * Alternates through the zodiac: Aries (Positive), Taurus (Negative), etc.
 *
 * @enum {string}
 */
export enum Polarity {
  Positive = 'Positive', // Yang, Active, Masculine
  Negative = 'Negative', // Yin, Receptive, Feminine
}

/**
 * The ten planets used in Western astrology
 *
 * Includes the traditional seven planets (Sun through Saturn) and
 * the modern outer planets (Uranus, Neptune, Pluto).
 *
 * @enum {string}
 */
export enum Planet {
  Sun = 'Sun',
  Moon = 'Moon',
  Mercury = 'Mercury',
  Venus = 'Venus',
  Mars = 'Mars',
  Jupiter = 'Jupiter',
  Saturn = 'Saturn',
  Uranus = 'Uranus',
  Neptune = 'Neptune',
  Pluto = 'Pluto',
}

/**
 * Essential dignity states
 *
 * Describes a planet's strength or weakness based on the sign it occupies.
 *
 * @enum {string}
 */
export enum DignityState {
  /** Planet rules the sign (+5 points) */
  Domicile = 'Domicile',
  /** Planet is exalted in the sign (+4 points) */
  Exaltation = 'Exaltation',
  /** Planet has no special dignity (0 points) */
  Peregrine = 'Peregrine',
  /** Planet is opposite its domicile (-5 points) */
  Detriment = 'Detriment',
  /** Planet is opposite its exaltation (-4 points) */
  Fall = 'Fall',
}

/**
 * Position in the zodiac
 *
 * Represents a specific point on the ecliptic converted to zodiac notation.
 *
 * @interface
 */
export interface ZodiacPosition {
  /** The zodiac sign (0-11) */
  sign: Sign;
  /** Sign name as string */
  signName: string;
  /** Normalized ecliptic longitude (0-360°) */
  longitude: number;
  /** Degree within the sign (0.0-29.999...) */
  degreeInSign: number;
  /** Integer degree within sign (0-29) */
  degree: number;
  /** Minutes (0-59) */
  minute: number;
  /** Seconds (0-59) */
  second: number;
  /** Formatted string representation */
  formatted: string;
}

/**
 * Complete information about a zodiac sign
 *
 * @interface
 */
export interface SignInfo {
  /** The sign enum value */
  sign: Sign;
  /** Sign name */
  name: string;
  /** Unicode symbol (e.g., ♈ for Aries) */
  symbol: string;
  /** Element (Fire, Earth, Air, Water) */
  element: Element;
  /** Modality (Cardinal, Fixed, Mutable) */
  modality: Modality;
  /** Polarity (Positive/Yang or Negative/Yin) */
  polarity: Polarity;
  /** Primary ruler (modern if applicable, otherwise traditional) */
  ruler: Planet;
  /** Traditional ruler (pre-1781) */
  traditionalRuler: Planet;
  /** Modern ruler (for Aquarius, Pisces, Scorpio only) */
  modernRuler?: Planet;
  /** Starting ecliptic longitude (0, 30, 60, etc.) */
  startDegree: number;
  /** Ending ecliptic longitude (30, 60, 90, etc.) */
  endDegree: number;
}

/**
 * Planetary dignity information
 *
 * Describes a planet's essential dignity in a specific sign.
 *
 * @interface
 */
export interface Dignity {
  /** The planet being evaluated */
  planet: Planet;
  /** The sign the planet is in */
  sign: Sign;
  /** Dignity state */
  state: DignityState;
  /** Numerical strength (+5, +4, 0, -4, -5) */
  strength: number;
  /** Human-readable description */
  description: string;
  /** Exact exaltation degree (if in exaltation state) */
  exaltationDegree?: number;
}

/**
 * Exaltation data for a planet
 *
 * @interface
 */
export interface ExaltationData {
  /** Sign where planet is exalted */
  sign: Sign;
  /** Exact degree of maximum exaltation (0-29) */
  degree: number;
}

/**
 * Options for formatting zodiac positions
 *
 * @interface
 */
export interface FormatOptions {
  /** Include seconds in output (default: true) */
  includeSeconds?: boolean;
  /** Include sign name/symbol in output (default: true) */
  includeSign?: boolean;
  /** Use symbol instead of name (default: false) */
  useSymbol?: boolean;
  /** Use decimal degrees instead of DMS (default: false) */
  decimalDegrees?: boolean;
}
