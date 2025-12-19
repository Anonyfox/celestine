/**
 * Ephemeris Module - Astronomical Constants
 *
 * Fundamental constants for ephemeris calculations with authoritative sources.
 *
 * @module ephemeris/constants
 *
 * @remarks
 * All constants are defined with their primary source cited.
 * Where multiple sources exist, the most authoritative (IAU, IERS) is preferred.
 */

// ============================================================================
// TIME CONSTANTS
// ============================================================================

/**
 * Julian Date of J2000.0 epoch (January 1, 2000, 12:00 TT).
 *
 * @remarks
 * The fundamental reference epoch for modern astronomical calculations.
 * All orbital elements and positions are typically referred to this epoch.
 *
 * @source IAU 1976 System of Astronomical Constants
 * @source Meeus, "Astronomical Algorithms", p. 62
 */
export const J2000_EPOCH = 2451545.0;

/**
 * Number of days in a Julian century.
 *
 * @remarks
 * Julian centuries (T) are the standard time unit for ephemeris polynomials.
 * T = (JD - J2000_EPOCH) / DAYS_PER_JULIAN_CENTURY
 *
 * @source Definition: 100 Julian years × 365.25 days/year
 */
export const DAYS_PER_JULIAN_CENTURY = 36525;

/**
 * Number of days in a Julian millennium (1000 Julian years).
 *
 * @remarks
 * Used in some VSOP87 formulas that use millennia instead of centuries.
 *
 * @source Definition: 1000 Julian years × 365.25 days/year
 */
export const DAYS_PER_JULIAN_MILLENNIUM = 365250;

// ============================================================================
// ANGULAR CONSTANTS
// ============================================================================

/**
 * Degrees in a full circle.
 *
 * @source Euclidean geometry definition
 */
export const DEGREES_PER_CIRCLE = 360;

/**
 * Arcminutes in one degree.
 *
 * @source Definition: 1° = 60'
 */
export const ARCMINUTES_PER_DEGREE = 60;

/**
 * Arcseconds in one degree.
 *
 * @source Definition: 1° = 3600"
 */
export const ARCSECONDS_PER_DEGREE = 3600;

/**
 * Arcseconds in one arcminute.
 *
 * @source Definition: 1' = 60"
 */
export const ARCSECONDS_PER_ARCMINUTE = 60;

/**
 * Conversion factor: degrees to radians.
 *
 * @source Definition: π/180
 */
export const DEG_TO_RAD = Math.PI / 180;

/**
 * Conversion factor: radians to degrees.
 *
 * @source Definition: 180/π
 */
export const RAD_TO_DEG = 180 / Math.PI;

/**
 * Conversion factor: arcseconds to radians.
 *
 * @remarks
 * Useful for small angle calculations where angles are given in arcseconds.
 *
 * @source Definition: π / (180 × 3600)
 */
export const ARCSEC_TO_RAD = Math.PI / (180 * 3600);

// ============================================================================
// DISTANCE CONSTANTS
// ============================================================================

/**
 * Astronomical Unit in kilometers.
 *
 * @remarks
 * The IAU 2012 definition is exact (by definition), not measured.
 *
 * @source IAU 2012 Resolution B2
 * @see https://www.iau.org/static/resolutions/IAU2012_English.pdf
 */
export const AU_IN_KM = 149_597_870.7;

/**
 * Speed of light in km/s.
 *
 * @remarks
 * Exact value by SI definition since 1983.
 *
 * @source SI definition (exact)
 * @source CODATA 2018
 */
export const SPEED_OF_LIGHT_KM_S = 299_792.458;

/**
 * Light-time for 1 AU in days.
 *
 * @remarks
 * Time for light to travel one Astronomical Unit.
 * τ = AU / c = 149,597,870.7 km / (299,792.458 km/s × 86400 s/day)
 *
 * @source Derived from IAU 2012 AU and SI speed of light
 */
export const LIGHT_TIME_PER_AU_DAYS = AU_IN_KM / (SPEED_OF_LIGHT_KM_S * 86400);

// ============================================================================
// EARTH ORBITAL CONSTANTS
// ============================================================================

/**
 * Mean obliquity of the ecliptic at J2000.0 (degrees).
 *
 * @remarks
 * The angle between the equator and the ecliptic.
 * This is the mean value; true obliquity includes nutation.
 *
 * Value: 23°26'21.448" = 23.4392911°
 *
 * @source IAU 1976 System of Astronomical Constants
 * @source Lieske et al. (1977), Astronomy & Astrophysics 58, 1
 * @source Meeus, "Astronomical Algorithms", p. 147
 */
export const OBLIQUITY_J2000_DEG = 23.439291111;

/**
 * Coefficients for mean obliquity polynomial (degrees).
 *
 * @remarks
 * ε = ε₀ + ε₁·T + ε₂·T² + ε₃·T³
 * where T is Julian centuries from J2000.0
 *
 * More precise than just using the constant J2000 value.
 *
 * @source IAU 1976 / Lieske et al. (1977)
 * @source Meeus, "Astronomical Algorithms", Eq. 22.2, p. 147
 */
export const OBLIQUITY_COEFFICIENTS = {
  /** Constant term: 23°26'21.448" in degrees */
  c0: 23.439291111,
  /** Linear term: -46.8150"/century in degrees/century */
  c1: -46.815 / 3600,
  /** Quadratic term: -0.00059"/century² in degrees/century² */
  c2: -0.00059 / 3600,
  /** Cubic term: +0.001813"/century³ in degrees/century³ */
  c3: 0.001813 / 3600,
};

// ============================================================================
// SUN CALCULATION CONSTANTS
// ============================================================================

/**
 * Coefficients for the Sun's geometric mean longitude (L₀).
 *
 * @remarks
 * L₀ = c0 + c1·T + c2·T²
 * where T is Julian centuries from J2000.0
 *
 * The geometric mean longitude is the Sun's position if Earth's
 * orbit were circular and there were no perturbations.
 *
 * @source Meeus, "Astronomical Algorithms", Table 25.a, p. 163
 */
export const SUN_MEAN_LONGITUDE = {
  /** Constant term in degrees */
  c0: 280.46646,
  /** Linear term in degrees/century */
  c1: 36000.76983,
  /** Quadratic term in degrees/century² */
  c2: 0.0003032,
};

/**
 * Coefficients for the Sun's mean anomaly (M).
 *
 * @remarks
 * M = c0 + c1·T + c2·T²
 * where T is Julian centuries from J2000.0
 *
 * The mean anomaly is the angular distance from perihelion
 * if the body moved uniformly.
 *
 * @source Meeus, "Astronomical Algorithms", Table 25.a, p. 163
 */
export const SUN_MEAN_ANOMALY = {
  /** Constant term in degrees */
  c0: 357.52911,
  /** Linear term in degrees/century */
  c1: 35999.05029,
  /** Quadratic term in degrees/century² */
  c2: -0.0001537,
};

/**
 * Coefficients for Earth's orbital eccentricity (e).
 *
 * @remarks
 * e = c0 + c1·T + c2·T²
 * where T is Julian centuries from J2000.0
 *
 * @source Meeus, "Astronomical Algorithms", Eq. 25.4, p. 163
 */
export const EARTH_ECCENTRICITY = {
  /** Constant term (dimensionless) */
  c0: 0.016708634,
  /** Linear term per century */
  c1: -0.000042037,
  /** Quadratic term per century² */
  c2: -0.0000001267,
};

/**
 * Coefficients for the equation of center for the Sun.
 *
 * @remarks
 * The equation of center converts mean anomaly to true anomaly.
 * C = c1·sin(M) + c2·sin(2M) + c3·sin(3M)
 *
 * These are base values; c1 has a time-dependent correction.
 *
 * @source Meeus, "Astronomical Algorithms", Eq. 25.4, p. 164
 */
export const SUN_EQUATION_OF_CENTER = {
  /** Coefficient for sin(M) - base value */
  c1_base: 1.914602,
  /** Time correction for sin(M) coefficient per century */
  c1_t: -0.004817,
  /** Time² correction for sin(M) coefficient */
  c1_t2: -0.000014,
  /** Coefficient for sin(2M) - base value */
  c2_base: 0.019993,
  /** Time correction for sin(2M) */
  c2_t: -0.000101,
  /** Coefficient for sin(3M) */
  c3: 0.000289,
};

/**
 * Constant of aberration in arcseconds.
 *
 * @remarks
 * The maximum aberration due to Earth's orbital motion.
 * Apparent shift in position due to finite speed of light
 * combined with observer's motion.
 *
 * @source IAU 1976 System of Astronomical Constants
 * @source Meeus, "Astronomical Algorithms", p. 167
 */
export const ABERRATION_CONSTANT_ARCSEC = 20.49552;

// ============================================================================
// NUTATION CONSTANTS
// ============================================================================

/**
 * Fundamental arguments for nutation (mean elongation of Moon).
 *
 * @remarks
 * D = c0 + c1·T + c2·T² + c3·T³ + c4·T⁴
 * Mean angular distance of Moon from Sun
 *
 * @source Meeus, "Astronomical Algorithms", Table 22.a, p. 144
 */
export const NUTATION_D = {
  c0: 297.85036,
  c1: 445267.11148,
  c2: -0.0019142,
  c3: 1 / 189474,
};

/**
 * Fundamental arguments for nutation (mean anomaly of Sun).
 *
 * @remarks
 * M = c0 + c1·T + c2·T² + c3·T³
 *
 * @source Meeus, "Astronomical Algorithms", Table 22.a, p. 144
 */
export const NUTATION_M = {
  c0: 357.52772,
  c1: 35999.05034,
  c2: -0.0001603,
  c3: -1 / 300000,
};

/**
 * Fundamental arguments for nutation (mean anomaly of Moon).
 *
 * @remarks
 * M' = c0 + c1·T + c2·T² + c3·T³
 *
 * @source Meeus, "Astronomical Algorithms", Table 22.a, p. 144
 */
export const NUTATION_M_PRIME = {
  c0: 134.96298,
  c1: 477198.867398,
  c2: 0.0086972,
  c3: 1 / 56250,
};

/**
 * Fundamental arguments for nutation (Moon's argument of latitude).
 *
 * @remarks
 * F = c0 + c1·T + c2·T² + c3·T³
 *
 * @source Meeus, "Astronomical Algorithms", Table 22.a, p. 144
 */
export const NUTATION_F = {
  c0: 93.27191,
  c1: 483202.017538,
  c2: -0.0036825,
  c3: 1 / 327270,
};

/**
 * Fundamental arguments for nutation (longitude of Moon's ascending node).
 *
 * @remarks
 * Ω = c0 + c1·T + c2·T² + c3·T³
 *
 * @source Meeus, "Astronomical Algorithms", Table 22.a, p. 144
 */
export const NUTATION_OMEGA = {
  c0: 125.04452,
  c1: -1934.136261,
  c2: 0.0020708,
  c3: 1 / 450000,
};

// ============================================================================
// PRECISION & ITERATION CONSTANTS
// ============================================================================

/**
 * Convergence tolerance for iterative calculations (degrees).
 *
 * @remarks
 * Used in Kepler equation solver and similar iterative methods.
 * 1e-10 degrees ≈ 0.00036 arcseconds - far beyond needed precision.
 */
export const CONVERGENCE_TOLERANCE = 1e-10;

/**
 * Maximum iterations for iterative solvers.
 *
 * @remarks
 * Prevents infinite loops in case of non-convergence.
 * Kepler equation typically converges in 3-5 iterations.
 */
export const MAX_ITERATIONS = 50;

// ============================================================================
// VALIDATION CONSTANTS
// ============================================================================

/**
 * Minimum valid Julian Date for this implementation.
 *
 * @remarks
 * Meeus simplified formulas are reliable from ~1800 CE.
 * JD 2378497 ≈ January 1, 1800
 */
export const MIN_JULIAN_DATE = 2378497;

/**
 * Maximum valid Julian Date for this implementation.
 *
 * @remarks
 * Meeus simplified formulas are reliable to ~2200 CE.
 * JD 2524594 ≈ January 1, 2200
 */
export const MAX_JULIAN_DATE = 2524594;
