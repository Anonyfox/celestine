/** USNO observed knots: interleaved quarter-year and 0.1-second increments.
 * The initial knot is E–M(1800); the first increment bridges to USNO(1804).
 * Only that increment is fractional; subsequent knots use integer tenths.
 * Reference fixtures are not shipped.
 * Linear interpolation avoids overshoot; see __fixtures__/delta-t/README.md.
 */
const knots = [
  16, -26.5612436, 66, 1, 66, -50, 100, 12, 72, -128, 60, -10, 20, 37, 44, 143, 10, 38, 22, 55, 18,
  24, 14, 11, 18, -5, 30, 1, 42, 50, 22, 21, 4, 2, 6, 6, 10, 13, 14, 15, 6, 10, 16, 35, 12, 30, 6,
  18, 18, 45, 2, 6, 8, 19, 14, 28, 8, 11, 12, 14, 6, 9, 6, 11, 18, 37, 8, 13, 8, 7, 12, 6, 10, 2,
  14, 12, 6, 3, 8, 6, 8, 7, 6, 8, 6, 6, 6, 4, 8, 0, 14, -3, 5, 0, 2, 1,
];

function model(y: number): number {
  // Stephenson, Morrison & Hohenkerk (2016) long-term parabola.
  if (y >= 2800) return polynomial((y - 1825) / 100, [-320, 0, 32.5]);
  const u = (y - 1820) / 100;
  // Morrison & Stephenson (2004) parabola, offset to meet E–M at −500.
  if (y < -500) return -20 + 32 * u * u - 0.02366094;
  if (y < 500)
    return polynomial(
      y / 100,
      [10583.6, -1014.41, 33.78311, -5.952053, -0.1798452, 0.022174192, 0.0090316521],
    );
  if (y < 1600)
    return (
      polynomial(
        (y - 1000) / 100,
        [1574.2, -556.01, 71.23472, 0.319781, -0.8503463, -0.005050998, 0.0083572073],
      ) +
      0.08711875 * Math.max(0, (1000 - y) / 500) -
      0.25111454 * Math.max(0, (y - 1501) / 99)
    );
  if (y < 1700) {
    // Original E–M cubic; taper its 0.162128 s mismatch over the final year.
    return (
      polynomial(y - 1600, [120, -0.9808, -0.01532, 1 / 7129]) - 0.16212793 * Math.max(0, y - 1699)
    );
  }
  if (y < 1800) return polynomial(y - 1700, [8.83, 0.1603, -0.0059285, 0.00013336, -1 / 1174000]);
  // E–M(1800), rounded to nanoseconds, then USNO increments.
  let x = 1800;
  let a = 13.75612436;
  for (let i = 0; i < knots.length; i += 2) {
    const z = x + knots[i] / 4;
    const b = a + knots[i + 1] / 10;
    if (y <= z) return a + ((b - a) * (y - x)) / (z - x);
    x = z;
    a = b;
  }
  // Hermite bridge from the final knot (value and observed slope 0.1/0.5 s/yr)
  // to the SMH (2016) parabola at 2800, matching value and slope (Skyfield-style).
  // Exact expanded coefficients; t is in units of 773.25 years.
  return polynomial((y - 2026.75) / 773.25, [69.2, 154.65, 2891.221875, -345.540625]);
}
function polynomial(x: number, coefficients: number[]): number {
  return coefficients.reduceRight((sum, coefficient) => sum * x + coefficient, 0);
}

/**
 * ΔT = TT−UT in seconds, from a UT Julian Date.
 * Decimal year is 2000 + (jd−2451545)/365.25; no calendar conversion.
 * TT input is also usable in the observed era (effect on ΔT below 0.001 s).
 * USNO observed knots (1804–2026), bridged from 1800; earlier
 * Espenak–Meeus (2006) polynomials following NASA/M&S (2004)
 * https://eclipse.gsfc.nasa.gov/SEcat5/deltatpoly.html (uncertainty hundreds of
 * seconds in antiquity). After October 2026 a cubic Hermite (observed value and
 * 0.2 s/yr slope, near IERS Bulletin A's predicted rate) joins the Stephenson,
 * Morrison & Hohenkerk (2016) parabola at 2800 (~76 s in 2050, ~110 s in 2100); allow several seconds per decade of
 * uncertainty, growing to tens/hundreds of seconds over centuries.
 * Measured USNO max/RMS errors (seconds): 1800–1899: 1.346667/0.462101;
 * 1900–1954: 0.320000/0.103792; 1955–2026: 0.103977/0.033643.
 * Source: https://maia.usno.navy.mil/ser7/deltat.data and historic_deltat.data.
 * @param jd - UT Julian Date
 * @returns TT minus UT, seconds
 * @example deltaTAt(2451545) // approximately 63.8 seconds
 */
export function deltaTAt(jd: number): number {
  return model(2000 + (jd - 2451545) / 365.25);
}

/**
 * Convert a UT Julian Date to a TT Julian Date using {@link deltaTAt}.
 * Accuracy and sources: USNO observed data (1800–2026), Espenak–Meeus
 * ancient estimates, and uncertain future extrapolation; see deltaTAt.
 * USNO max/RMS seconds: 1800–1899 1.347/.462; 1900–1954 .320/.104;
 * 1955–2026 .104/.034. Ancient uncertainty reaches hundreds of seconds;
 * future uncertainty is several seconds/decade, growing over centuries.
 * @see https://maia.usno.navy.mil/ser7/deltat.data
 * @param jdUT - Julian Date on UT
 * @returns Julian Date on TT
 * @example getSunPosition(toTT(jdUT)) // default mean ecliptic/equinox of date
 */
export function toTT(jdUT: number): number {
  return jdUT + deltaTAt(jdUT) / 86400;
}

/**
 * Convert a TT Julian Date to a UT Julian Date by three fixed-point iterations.
 * The inverse closes within 1e-9 day over −2000…3000 CE; physical accuracy
 * is that of deltaTAt: USNO max/RMS seconds 1800–1899 1.347/.462,
 * 1900–1954 .320/.104, 1955–2026 .104/.034. Ancient uncertainty reaches
 * hundreds of seconds; future uncertainty is several seconds/decade,
 * growing over centuries.
 * @see https://maia.usno.navy.mil/ser7/deltat.data
 * @param jdTT - Julian Date on TT
 * @returns Julian Date on UT
 * @example toUT(toTT(2451545)) // 2451545
 */
export function toUT(jdTT: number): number {
  let ut = jdTT;
  for (let i = 0; i < 3; i++) ut = jdTT - deltaTAt(ut) / 86400;
  return ut;
}

/**
 * ΔT (TT−UT), seconds, for the middle of a calendar month.
 * Uses the same model, accuracy and sources as deltaTAt.
 * @param year - Astronomical year (including zero)
 * @param month - Month, 1–12
 * @returns TT minus UT, seconds
 * @example deltaT(2026, 1) // approximately 69.1
 */
export function deltaT(year: number, month: number): number {
  return model(year + (month - 0.5) / 12);
}

/**
 * Convert a TT JD to UT using ΔT at the supplied year/month (legacy convention).
 * Accuracy and sources are those of deltaTAt; use toUT for a JD-based inverse.
 * @param ttJD - TT Julian Date
 * @param year - Astronomical year for the correction
 * @param month - Month for the correction
 * @returns UT Julian Date
 * @example ttToUT(2451545, 2000, 1)
 */
export function ttToUT(ttJD: number, year: number, month: number): number {
  return ttJD - deltaT(year, month) / 86400;
}

/**
 * Convert a UT JD to TT using ΔT at the supplied year/month (legacy convention).
 * Accuracy and sources are those of deltaTAt; use toTT for a JD-based conversion.
 * @param utJD - UT Julian Date
 * @param year - Astronomical year for the correction
 * @param month - Month for the correction
 * @returns TT Julian Date
 * @example utToTT(2451545, 2000, 1)
 */
export function utToTT(utJD: number, year: number, month: number): number {
  return utJD + deltaT(year, month) / 86400;
}
