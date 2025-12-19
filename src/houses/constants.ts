/**
 * Houses module constants
 *
 * Constants for house calculations including house system names,
 * latitude thresholds, and calculation tolerances.
 */

/**
 * Maximum latitude for Placidus and Koch house systems
 *
 * Above this latitude (approximately the Arctic/Antarctic circles),
 * Placidus and Koch calculations fail because the mathematical solution
 * doesn't exist (some degrees never rise or set during certain times of year).
 *
 * Systems like Equal and Whole Sign work at all latitudes.
 *
 * @constant
 */
export const MAX_LATITUDE_PLACIDUS = 66.5;

/**
 * Maximum absolute latitude for house calculations
 *
 * At the exact poles (±90°), the Ascendant becomes undefined because
 * all ecliptic degrees rise and set simultaneously. This is a hard limit
 * for most house systems.
 *
 * @constant
 */
export const MAX_ABSOLUTE_LATITUDE = 90.0;

/**
 * Maximum absolute longitude
 *
 * Longitude can be expressed as -180 to +180 or 0 to 360.
 * We normalize to -180 to +180 internally.
 *
 * @constant
 */
export const MAX_ABSOLUTE_LONGITUDE = 180.0;

/**
 * Epsilon for floating-point comparisons
 *
 * Used to check if values are "close enough" to zero or other targets
 * to avoid division-by-zero and other numerical instability issues.
 *
 * @constant
 */
export const EPSILON = 1e-10;

/**
 * Maximum iterations for iterative house calculations
 *
 * Placidus and other complex systems use iteration to find house cusps.
 * This prevents infinite loops if convergence fails (rare but possible).
 *
 * @constant
 */
export const MAX_ITERATIONS = 50;

/**
 * Convergence tolerance for iterative calculations
 *
 * When the change between iterations is less than this value (in degrees),
 * we consider the iteration converged.
 *
 * 0.0001° = 0.36 arcseconds (well below astrological precision requirements)
 *
 * @constant
 */
export const CONVERGENCE_TOLERANCE = 0.0001;

/**
 * Names of all supported house systems
 *
 * Used for validation and display purposes.
 *
 * @constant
 */
export const HOUSE_SYSTEM_NAMES: Record<string, string> = {
  placidus: 'Placidus',
  koch: 'Koch',
  equal: 'Equal',
  'whole-sign': 'Whole Sign',
  porphyry: 'Porphyry',
  regiomontanus: 'Regiomontanus',
  campanus: 'Campanus',
};

/**
 * Obliquity of ecliptic constants (Laskar 1986 formula)
 *
 * These constants are used to calculate the obliquity of the ecliptic
 * (the angle between the ecliptic and celestial equator) as a function of time.
 *
 * Formula: ε₀ = C0 + C1*T + C2*T² + C3*T³
 * where T = Julian Centuries from J2000.0
 *
 * Reference: Laskar, J. (1986), "Secular terms of classical planetary theories
 * using the results of general theory", Astronomy and Astrophysics, 157, 59–70.
 *
 * Also documented in Meeus, "Astronomical Algorithms", Chapter 22
 *
 * @constant
 */
export const OBLIQUITY_COEFFICIENTS = {
  // Constant term in degrees
  C0: 23.43929111,
  // Linear term in degrees per century
  C1: -0.013004166,
  // Quadratic term in degrees per century²
  C2: -1.6388889e-7,
  // Cubic term in degrees per century³
  C3: 5.0361111e-7,
};
