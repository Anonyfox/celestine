/**
 * Ephemeris Module - Type Definitions
 *
 * Core types for planetary position calculations.
 *
 * @module ephemeris/types
 *
 * @remarks
 * All angles are in degrees unless otherwise specified.
 * All distances are in Astronomical Units (AU) unless otherwise specified.
 *
 * @see Jean Meeus, "Astronomical Algorithms" (2nd Ed., 1998) for algorithm foundations
 * @see IAU 2012 Resolution B2 for astronomical unit definition (149,597,870.700 km)
 */

/**
 * Celestial bodies supported by the ephemeris.
 *
 * @remarks
 * Priority levels for implementation:
 * - P0: Sun, Moon (foundation)
 * - P1: Classical planets (Mercury-Saturn) + North Node
 * - P2: Modern planets (Uranus-Pluto) + True Node
 * - P3: Minor bodies (Lilith, Chiron)
 */
export enum Planet {
  /** The Sun - center of our solar system */
  Sun = 'Sun',

  /** The Moon - Earth's natural satellite */
  Moon = 'Moon',

  /** Mercury - innermost planet */
  Mercury = 'Mercury',

  /** Venus - second planet from Sun */
  Venus = 'Venus',

  /** Mars - fourth planet, first superior planet */
  Mars = 'Mars',

  /** Jupiter - largest planet */
  Jupiter = 'Jupiter',

  /** Saturn - ringed gas giant */
  Saturn = 'Saturn',

  /** Uranus - first modern planet (discovered 1781) */
  Uranus = 'Uranus',

  /** Neptune - eighth planet (discovered 1846) */
  Neptune = 'Neptune',

  /** Pluto - dwarf planet (discovered 1930) */
  Pluto = 'Pluto',

  /**
   * North Lunar Node (Mean) - ascending node of Moon's orbit
   *
   * @remarks
   * The point where the Moon's orbit crosses the ecliptic going northward.
   * Mean node uses average motion; True node includes oscillations.
   */
  NorthNode = 'NorthNode',

  /**
   * South Lunar Node - descending node of Moon's orbit
   *
   * @remarks
   * Always exactly opposite (180°) from North Node.
   */
  SouthNode = 'SouthNode',

  /**
   * Mean Black Moon Lilith - lunar apogee
   *
   * @remarks
   * The point where the Moon is farthest from Earth in its orbit.
   * Not a physical body, but an orbital point.
   */
  Lilith = 'Lilith',

  /**
   * Chiron - centaur orbiting between Saturn and Uranus
   *
   * @remarks
   * Discovered 1977. Orbital period ~50 years.
   * Highly elliptical orbit makes calculation more complex.
   */
  Chiron = 'Chiron',

  /**
   * Ceres - dwarf planet in the asteroid belt
   *
   * @remarks
   * Largest object in asteroid belt. Orbital period ~4.6 years.
   * Represents nurturing and motherhood in astrology.
   */
  Ceres = 'Ceres',

  /**
   * Pallas - second largest asteroid
   *
   * @remarks
   * Highest inclination (34.8°) of major asteroids.
   * Represents wisdom and creative intelligence.
   */
  Pallas = 'Pallas',

  /**
   * Juno - asteroid representing partnerships
   *
   * @remarks
   * Orbital period ~4.4 years.
   * Represents committed relationships and equality.
   */
  Juno = 'Juno',

  /**
   * Vesta - brightest asteroid
   *
   * @remarks
   * Second largest asteroid. Shortest period ~3.6 years.
   * Represents devotion and sacred service.
   */
  Vesta = 'Vesta',
}

/**
 * Position of a celestial body at a given moment.
 *
 * @remarks
 * All positions are geocentric (as seen from Earth's center)
 * in the tropical zodiac system (ecliptic coordinates).
 *
 * @example
 * ```typescript
 * const sunPosition: PlanetPosition = {
 *   longitude: 280.458,      // ~10° Capricorn
 *   latitude: 0.0001,        // Sun is always near ecliptic
 *   distance: 0.9833,        // ~0.98 AU in January
 *   longitudeSpeed: 1.0194,  // ~1°/day
 *   isRetrograde: false,     // Sun never retrogrades
 * };
 * ```
 */
export interface PlanetPosition {
  /**
   * Ecliptic longitude in degrees (0-360).
   *
   * @remarks
   * This is the primary output - the position along the zodiac.
   * 0° = Vernal Equinox (0° Aries in tropical zodiac)
   * Measured along the ecliptic plane.
   */
  longitude: number;

  /**
   * Ecliptic latitude in degrees (-90 to +90).
   *
   * @remarks
   * Angular distance north (+) or south (-) of the ecliptic plane.
   * For Sun: always ~0° (by definition, Sun defines the ecliptic)
   * For Moon: ranges from -5.3° to +5.3°
   * For planets: typically within ±3° of ecliptic
   */
  latitude: number;

  /**
   * Distance from Earth in Astronomical Units (AU).
   *
   * @remarks
   * 1 AU = 149,597,870.700 km (IAU 2012 definition)
   * Sun distance: ~0.983 AU (perihelion) to ~1.017 AU (aphelion)
   * Moon distance: ~0.0024 AU (~356,500 km) to ~0.0027 AU (~406,700 km)
   */
  distance: number;

  /**
   * Rate of change of longitude in degrees per day.
   *
   * @remarks
   * Positive = direct motion (normal, eastward through zodiac)
   * Negative = retrograde motion (apparent backward motion)
   * Zero = stationary (at station point)
   *
   * Typical values:
   * - Sun: ~0.95° to ~1.02°/day (varies with Earth's orbital speed)
   * - Moon: ~11.5° to ~14.5°/day
   * - Mercury: -1.4° to +2.2°/day
   * - Mars: -0.4° to +0.8°/day
   * - Jupiter: -0.13° to +0.23°/day
   */
  longitudeSpeed: number;

  /**
   * True if the body is in apparent retrograde motion.
   *
   * @remarks
   * Convenience flag: equivalent to `longitudeSpeed < 0`
   *
   * Sun and Moon never retrograde.
   * Mercury retrogrades ~3 times per year for ~3 weeks each.
   * Outer planets retrograde once per year for several months.
   */
  isRetrograde: boolean;
}

/**
 * Options for ephemeris calculations.
 *
 * @remarks
 * Default options provide arcminute-level accuracy sufficient for astrology.
 * Enable additional corrections for higher precision requirements.
 */
export interface EphemerisOptions {
  /**
   * Calculate and include daily motion (speed).
   *
   * @default true
   *
   * @remarks
   * When true, calculates position for JD and JD+1 to determine speed.
   * Disable for slight performance improvement when speed not needed.
   */
  includeSpeed?: boolean;

  /**
   * Apply nutation correction to longitude.
   *
   * @default false
   *
   * @remarks
   * Nutation is a small periodic oscillation in Earth's axis (~±17").
   * For arcminute precision: not needed (error < 0.3')
   * For arcsecond precision: required
   *
   * @see Meeus Ch. 22 for nutation calculation
   */
  includeNutation?: boolean;

  /**
   * Apply aberration correction.
   *
   * @default false (except Sun where it's always applied)
   *
   * @remarks
   * Aberration is the apparent shift due to Earth's orbital velocity
   * combined with the finite speed of light. Effect up to ~20".
   *
   * For Sun: always included as it's significant (~20")
   * For planets: optional, typically < 1"
   */
  includeAberration?: boolean;

  /**
   * Apply light-time correction.
   *
   * @default false
   *
   * @remarks
   * We see planets where they were, not where they are, due to
   * the time light takes to travel from planet to Earth.
   *
   * For inner planets: effect < 1"
   * For outer planets: can be several arcseconds
   */
  includeLightTime?: boolean;
}

/**
 * Result of calculating positions for multiple bodies.
 *
 * @example
 * ```typescript
 * const positions = getAllPositions(julianDate);
 * const sun = positions.get(Planet.Sun);
 * const moon = positions.get(Planet.Moon);
 * ```
 */
export type PlanetPositions = Map<Planet, PlanetPosition>;

/**
 * Rectangular (Cartesian) coordinates in 3D space.
 *
 * @remarks
 * Used internally for coordinate transformations.
 * Heliocentric: X-Y plane = ecliptic, X-axis = vernal equinox
 * Geocentric: Same orientation, but centered on Earth
 *
 * @internal
 */
export interface RectangularCoordinates {
  /** X coordinate in AU (toward vernal equinox) */
  x: number;

  /** Y coordinate in AU (90° ahead in ecliptic) */
  y: number;

  /** Z coordinate in AU (toward north ecliptic pole) */
  z: number;
}

/**
 * Spherical coordinates (longitude, latitude, distance).
 *
 * @remarks
 * Used internally before final conversion to PlanetPosition.
 *
 * @internal
 */
export interface SphericalCoordinates {
  /** Longitude in degrees (0-360) */
  longitude: number;

  /** Latitude in degrees (-90 to +90) */
  latitude: number;

  /** Distance in AU */
  distance: number;
}

/**
 * Orbital elements for a celestial body.
 *
 * @remarks
 * Six elements fully describe an orbit. Used for planet position calculations.
 * Elements are typically given as polynomials in Julian centuries (T).
 *
 * @see Meeus Ch. 31 for orbital element definitions
 * @see Meeus Table 31.a for planetary orbital elements
 *
 * @internal
 */
export interface OrbitalElements {
  /**
   * Mean longitude at epoch (L₀) in degrees.
   *
   * @remarks
   * The mean position of the body if it moved uniformly.
   */
  meanLongitude: number;

  /**
   * Semi-major axis (a) in AU.
   *
   * @remarks
   * Half the longest diameter of the elliptical orbit.
   * For simplified calculations, often treated as constant.
   */
  semiMajorAxis: number;

  /**
   * Eccentricity (e) - dimensionless.
   *
   * @remarks
   * Shape of the orbit: 0 = circle, 0-1 = ellipse
   * Earth: ~0.0167, Mercury: ~0.2056, Pluto: ~0.2488
   */
  eccentricity: number;

  /**
   * Inclination (i) in degrees.
   *
   * @remarks
   * Tilt of orbital plane relative to the ecliptic.
   * For major planets: typically < 3° (except Pluto ~17°)
   */
  inclination: number;

  /**
   * Longitude of ascending node (Ω) in degrees.
   *
   * @remarks
   * Where the orbit crosses the ecliptic going northward.
   */
  longitudeOfAscendingNode: number;

  /**
   * Longitude of perihelion (ω̃) in degrees.
   *
   * @remarks
   * Direction from Sun to the closest point in orbit.
   * ω̃ = Ω + ω (where ω is argument of perihelion)
   */
  longitudeOfPerihelion: number;
}

/**
 * Validation result for ephemeris input parameters.
 *
 * @internal
 */
export interface EphemerisValidationResult {
  /** Whether the input is valid */
  valid: boolean;

  /** Error message if invalid */
  error?: string;

  /** Warning messages for edge cases */
  warnings?: string[];
}
