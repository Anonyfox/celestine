// Least-squares polynomial in x ∈ [-1, 1] (normal equations, Gaussian elimination).
export function fit(xs, ys, degree) {
  const n = degree + 1;
  const m = Array.from({ length: n }, () => new Array(n + 1).fill(0));
  for (let k = 0; k < xs.length; k++)
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) m[i][j] += xs[k] ** (i + j);
      m[i][n] += ys[k] * xs[k] ** i;
    }
  for (let i = 0; i < n; i++) {
    let p = i;
    for (let r = i + 1; r < n; r++) if (Math.abs(m[r][i]) > Math.abs(m[p][i])) p = r;
    [m[i], m[p]] = [m[p], m[i]];
    for (let r = 0; r < n; r++)
      if (r !== i) {
        const f = m[r][i] / m[i][i];
        for (let c = i; c <= n; c++) m[r][c] -= f * m[i][c];
      }
  }
  return m.map((row, i) => row[n] / row[i]);
}
export const evaluate = (c, x) => c.reduceRight((acc, v) => acc * x + v, 0);
export const derive = (c) => c.slice(1).map((v, i) => v * (i + 1));
