/**
 * Shared compact Chebyshev ephemeris for small bodies (Chiron, Ceres, Pallas, Juno, Vesta).
 *
 * @module precise/chebyshev
 *
 * @remarks
 * Each body is a mean Kepler orbit (12 parameters, linear secular rates) plus an adaptive
 * piecewise Chebyshev fit of the residual in heliocentric J2000 ecliptic spherical
 * coordinates (Δλ·scale, Δβ·scale, Δr), all fitted to JPL Horizons vectors over
 * 1800–2200. The coefficients are integers (multiples of `quantum`, in AU) packed into a
 * string as zigzag base-32 varints: continuation characters '0'..'O', final characters
 * ']'..'|'. Each segment stores its length (in `grain` days) and, after the first segment,
 * the value at its start relative to the previous segment's end value.
 * The generator is `scripts/chiron/gen-cheb.py`.
 */

const J2000 = 2451545;

/** Packed model for one body, as emitted by `scripts/chiron/gen-cheb.py`. */
export interface ChebyshevModel {
  /** First covered JD (TT). */
  readonly start: number;
  /** Segment length unit in days. */
  readonly grain: number;
  /** Coefficient quantum in AU. */
  readonly quantum: number;
  /** Length scale (AU) applied to the angular residuals. */
  readonly scale: number;
  /** Chebyshev degree for the λ, β and r residuals. */
  readonly degrees: readonly [number, number, number];
  /** Mean orbit: a, e, i, Ω, ω, M0, n (rad/day) and per-century rates of e, i, Ω, ω, a. */
  readonly kepler: readonly number[];
  /** Packed coefficients. */
  readonly data: string;
}

/** Heliocentric J2000 ecliptic longitude/latitude (radians) and distance (AU). */
export interface HeliocentricSpherical {
  lon: number;
  lat: number;
  r: number;
}

/** Mean Kepler orbit, heliocentric J2000 ecliptic spherical coordinates. */
function meanOrbit(p: readonly number[], jd: number): HeliocentricSpherical {
  const t = (jd - J2000) / 36525;
  const e = p[1] + p[7] * t;
  const i = p[2] + p[8] * t;
  const node = p[3] + p[9] * t;
  const w = p[4] + p[10] * t;
  const a = p[0] + p[11] * t;
  const M = p[5] + p[6] * (jd - J2000);
  let E = M;
  for (let k = 0; k < 30; k++) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-14) break;
  }
  const xv = a * (Math.cos(E) - e);
  const yv = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const u = Math.atan2(yv, xv) + w;
  const r = Math.hypot(xv, yv);
  return {
    lon: node + Math.atan2(Math.cos(i) * Math.sin(u), Math.cos(u)),
    lat: Math.asin(Math.sin(i) * Math.sin(u)),
    r,
  };
}

/** Decode the packed string into segments [start, length, ...λ, ...β, ...r coefficients]. */
function decode(m: ChebyshevModel): Float64Array[] {
  const values: number[] = [];
  let z = 0;
  let unit = 1;
  for (let i = 0; i < m.data.length; i++) {
    const c = m.data.charCodeAt(i);
    const final = c >= 93;
    z += (c - (final ? 93 : 48)) * unit;
    unit *= 32;
    if (final) {
      values.push(z % 2 ? -(z + 1) / 2 : z / 2);
      z = 0;
      unit = 1;
    }
  }
  const out: Float64Array[] = [];
  const previousEnd = [0, 0, 0];
  let start = m.start;
  let k = 0;
  while (k < values.length) {
    const length = values[k++] * m.grain;
    const segment = [start, length];
    for (let axis = 0; axis < 3; axis++) {
      const n = m.degrees[axis] + 1;
      const c = values.slice(k, k + n);
      k += n;
      if (out.length) {
        // c[0] holds the start-value delta against the previous segment's end value.
        let alternating = 0;
        for (let j = 1; j < n; j++) alternating += j % 2 ? -c[j] : c[j];
        c[0] = previousEnd[axis] + c[0] - alternating;
      }
      let end = 0;
      for (let j = 0; j < n; j++) {
        end += c[j];
        segment.push(c[j] * m.quantum);
      }
      previousEnd[axis] = end;
    }
    out.push(Float64Array.from(segment));
    start += length;
  }
  return out;
}

/**
 * Build a lazy evaluator for one body. It returns the heliocentric J2000 ecliptic position
 * for `jd` inside the fitted span, or `undefined` outside it (and for NaN).
 */
export function chebyshevBody(
  model: ChebyshevModel,
): (jd: number) => HeliocentricSpherical | undefined {
  let segments: Float64Array[] | undefined;
  return (jd) => {
    segments ??= decode(model);
    for (const segment of segments) {
      if (jd > segment[0] + segment[1]) continue;
      if (!(jd >= segment[0])) return undefined;
      const x = (2 * (jd - segment[0])) / segment[1] - 1;
      const residual = [0, 0, 0];
      let offset = 2;
      for (let axis = 0; axis < 3; axis++) {
        const n = model.degrees[axis] + 1;
        // Clenshaw recurrence
        let b1 = 0;
        let b2 = 0;
        for (let j = n - 1; j > 0; j--) {
          const b0 = 2 * x * b1 - b2 + segment[offset + j];
          b2 = b1;
          b1 = b0;
        }
        residual[axis] = x * b1 - b2 + segment[offset];
        offset += n;
      }
      const base = meanOrbit(model.kepler, jd);
      return {
        lon: base.lon + residual[0] / model.scale,
        lat: base.lat + residual[1] / model.scale,
        r: base.r + residual[2],
      };
    }
    return undefined;
  };
}

/** Spherical to rectangular (heliocentric J2000 ecliptic, AU). */
export function toRectangular(p: HeliocentricSpherical): {
  x: number;
  y: number;
  z: number;
  r: number;
} {
  const c = p.r * Math.cos(p.lat);
  return { x: c * Math.cos(p.lon), y: c * Math.sin(p.lon), z: p.r * Math.sin(p.lat), r: p.r };
}
