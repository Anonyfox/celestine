/**
 * Houses module type definitions
 *
 * Core types for astrological house calculations, including geographic locations,
 * house cusps, angles, and house systems.
 */

/**
 * Geographic location for house calculations
 *
 * Specifies the observer's position on Earth. Latitude and longitude are required;
 * elevation is optional and rarely significant for astrological calculations
 * (affects horizon parallax, which is negligible for house cusps).
 *
 * @property latitude - Degrees north (positive) or south (negative) of equator.
 *   Valid range: -90 to +90. Latitude 0 = equator, +90 = North Pole, -90 = South Pole.
 *
 * @property longitude - Degrees east (positive) or west (negative) of prime meridian.
 *   Can be expressed as -180 to +180 or 0 to 360 (both are supported and normalized internally).
 *   Longitude 0 = Greenwich, +180 or -180 = International Date Line.
 *
 * @property elevation - Optional elevation in meters above sea level.
 *   Only affects parallax corrections (not implemented in basic house calculations).
 *   Default: 0 (sea level).
 *
 * @example
 * London, UK:
 * ```typescript
 * { latitude: 51.5074, longitude: -0.1278 }
 * ```
 *
 * @example
 * New York, USA:
 * ```typescript
 * { latitude: 40.7128, longitude: -74.0060 }
 * ```
 *
 * @example
 * Sydney, Australia (Southern hemisphere, Eastern longitude):
 * ```typescript
 * { latitude: -33.8688, longitude: 151.2093 }
 * ```
 */
export interface GeographicLocation {
  latitude: number;
  longitude: number;
  elevation?: number;
}

/**
 * The four angles of the chart
 *
 * The angles are the four cardinal points of the chart, marking the intersections
 * of the ecliptic with the horizon (ASC/DSC) and meridian (MC/IC).
 *
 * @property ascendant - Ascendant (ASC): ecliptic degree rising on eastern horizon.
 *   This is the cusp of the 1st house in most house systems.
 *
 * @property midheaven - Midheaven (MC, Medium Coeli): ecliptic degree culminating
 *   (crossing the meridian) at the highest point. This is the cusp of the 10th house.
 *
 * @property descendant - Descendant (DSC): ecliptic degree setting on western horizon.
 *   Always exactly opposite the Ascendant (ASC + 180°). Cusp of the 7th house.
 *
 * @property imumCoeli - Imum Coeli (IC): lowest point, opposite the Midheaven (MC + 180°).
 *   Cusp of the 4th house.
 *
 * @remarks
 * All values are ecliptic longitudes in degrees (0-360):
 * - 0° = 0° Aries
 * - 90° = 0° Cancer
 * - 180° = 0° Libra
 * - 270° = 0° Capricorn
 */
export interface Angles {
  ascendant: number;
  midheaven: number;
  descendant: number;
  imumCoeli: number;
}

/**
 * House cusps for all twelve houses
 *
 * The cusps are the starting degrees of each house on the ecliptic.
 * Represented as a fixed-length tuple of 12 numbers (houses 1-12).
 *
 * @remarks
 * House relationships:
 * - House 1 cusp = Ascendant
 * - House 4 cusp = Imum Coeli (in most systems)
 * - House 7 cusp = Descendant
 * - House 10 cusp = Midheaven
 *
 * The intermediate houses (2, 3, 5, 6, 8, 9, 11, 12) are calculated
 * differently depending on the house system used.
 *
 * All values are ecliptic longitudes in degrees (0-360).
 *
 * @example
 * ```typescript
 * const cusps: HouseCusps = {
 *   cusps: [
 *     0,    // House 1 (ASC)
 *     30,   // House 2
 *     60,   // House 3
 *     90,   // House 4 (IC)
 *     120,  // House 5
 *     150,  // House 6
 *     180,  // House 7 (DSC)
 *     210,  // House 8
 *     240,  // House 9
 *     270,  // House 10 (MC)
 *     300,  // House 11
 *     330   // House 12
 *   ]
 * };
 * ```
 */
export interface HouseCusps {
  cusps: [
    number, // House 1 (= Ascendant)
    number, // House 2
    number, // House 3
    number, // House 4 (= IC in most systems)
    number, // House 5
    number, // House 6
    number, // House 7 (= Descendant)
    number, // House 8
    number, // House 9
    number, // House 10 (= MC)
    number, // House 11
    number, // House 12
  ];
}

/**
 * Available house systems
 *
 * Different methods for dividing the celestial sphere into twelve houses.
 * Each system has different geometric rationale and works best in different contexts.
 *
 * @remarks
 * System characteristics:
 *
 * - **placidus**: Most popular in modern Western astrology. Divides diurnal/nocturnal
 *   arcs into thirds. Fails at latitudes above ~66° (Arctic/Antarctic circles).
 *
 * - **koch**: Similar to Placidus but uses the Ascendant's pole. Popular in Europe.
 *   Also fails at extreme latitudes.
 *
 * - **equal**: Simplest system. Each house is exactly 30° from the previous, starting
 *   from the Ascendant. MC floats independently. Works at all latitudes.
 *
 * - **whole-sign**: Ancient system from Hellenistic astrology. Each house corresponds
 *   to one zodiac sign. House 1 starts at 0° of the sign containing the Ascendant.
 *   Works everywhere.
 *
 * - **porphyry**: Simple trisection of quadrants between angles. Works at all latitudes.
 *
 * - **regiomontanus**: Divides the celestial equator into 30° segments, then projects
 *   onto the ecliptic. Works at most latitudes.
 *
 * - **campanus**: Divides the prime vertical into 30° arcs. Complex spherical geometry.
 *   Works at most latitudes.
 */
export type HouseSystem =
  | 'placidus'
  | 'koch'
  | 'equal'
  | 'whole-sign'
  | 'porphyry'
  | 'regiomontanus'
  | 'campanus';

/**
 * Complete house calculation result
 *
 * Contains all computed house data: angles, cusps, and the input parameters
 * used for the calculation.
 *
 * @property system - The house system used for calculation
 * @property angles - The four angles (ASC, MC, DSC, IC)
 * @property cusps - All twelve house cusps
 * @property latitude - Geographic latitude used (degrees)
 * @property longitude - Geographic longitude used (degrees)
 * @property lst - Local Sidereal Time used (degrees, 0-360)
 * @property obliquity - Obliquity of the ecliptic at calculation time (degrees)
 *
 * @example
 * ```typescript
 * const houseData: HouseData = {
 *   system: 'placidus',
 *   angles: {
 *     ascendant: 15.3,
 *     midheaven: 285.7,
 *     descendant: 195.3,
 *     imumCoeli: 105.7
 *   },
 *   cusps: {
 *     cusps: [15.3, 42.1, 68.9, 105.7, 142.5, 169.3, 195.3, 222.1, 248.9, 285.7, 322.5, 349.3]
 *   },
 *   latitude: 51.5074,
 *   longitude: -0.1278,
 *   lst: 180.5,
 *   obliquity: 23.4368
 * };
 * ```
 */
export interface HouseData {
  system: HouseSystem;
  angles: Angles;
  cusps: HouseCusps;
  latitude: number;
  longitude: number;
  lst: number;
  obliquity: number;
}

/**
 * Validation result for location validation
 *
 * @property valid - Whether the input is valid
 * @property errors - Array of error messages if invalid
 */
export interface LocationValidationResult {
  valid: boolean;
  errors: string[];
}

