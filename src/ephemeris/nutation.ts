import { DEG_TO_RAD } from './constants.js';

// IAU 2000B luni-solar nutation in longitude (McCarthy & Luzum 2003), its 13 largest terms.
// Pairs: the multipliers of l, l′, F, D, Ω as base-5 digits (multiplier + 2), then Δψ in mas.
const TERMS = [
  1563, -17206, 1604, -1317, 1614, -228, 1564, 207, 1687, 148, 2187, 71, 1729, -52, 1613, -39, 2239,
  -30, 1479, 22, 947, 16, 1603, 13, 989, 12,
];

// Delaunay arguments l, l′, F, D, Ω (Simon et al. 1994, linear part): degrees, degrees per century,
// each rounded as far as the 1000–3000 error budget allows (scripts/nutation/accuracy study).
const ARGS = [135, 477199, 358, 35999, 93.3, 483202.02, 297.9, 445267.1, 125.045, -1934.136];

/**
 * Nutation in longitude Δψ (degrees): the shift from the mean to the true equinox of date.
 *
 * @param T - Julian centuries (TT) from J2000.0
 * @returns Δψ in degrees
 *
 * @remarks
 * The 13 largest IAU 2000B luni-solar terms, with the secular rate (−17.5 mas/century) of the 18.6-year term.
 * Max error vs the full IAU 2000A series (ERFA `nut00a`): 0.048″ for 1800–2200 (RMS 0.013″),
 * about 0.1″ for 1000–3000. Shared by `includeNutation`, the precise bodies and the
 * true-equinox event searches. Against the Δψ implied by the Horizons fixtures (quantity 31
 * minus the mean-frame longitude) it agrees to 0.09″ RMS, versus 0.15″ for the four-term
 * approximation. Accuracy study: `scripts/nutation/`.
 *
 * @source McCarthy & Luzum, Cel. Mech. Dyn. Astron. 85, 37–49 (2003); Simon et al. (1994) arguments
 */
export function nutationInLongitude(T: number): number {
  let sum = 0;
  for (let i = 0; i < TERMS.length; i += 2) {
    let arg = 0;
    for (let j = 8, code = TERMS[i]; j >= 0; j -= 2, code = (code / 5) | 0)
      arg += ((code % 5) - 2) * (ARGS[j] + ARGS[j + 1] * T);
    sum += (i ? TERMS[i + 1] : -17206 - 17.5 * T) * Math.sin(arg * DEG_TO_RAD);
  }
  return sum / 3.6e6;
}
