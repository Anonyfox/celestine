# Ephemeris comparison

Measured on 2026-10-24. The following environment and package metadata are copied from the script output. This is a shared container; no speed comparison was made.

Date: 2026-10-24
Node: v20.19.2
Machine: linux x64 Intel(R) Xeon(R) Processor
Peers: /workspace/celestine-compare

| library | version | license | runtimeDependencies | installedBytes | native |
| --- | --- | --- | --- | --- | --- |
| celestine current | 0.5.0 | MIT | 0 | 1796034 | false |
| astronomy-engine | 2.1.19 | MIT | 0 | 1838627 | false |
| celestine-021 | 0.2.1 | MIT | 0 | 4335795 | false |
| sweph | 2.10.3-8 | (AGPL-3.0-or-later OR LGPL-3.0-or-later) | 2 | 5422486 | true |

Only sweph was measured as the Swiss Ephemeris binding; swisseph was not installed or measured. License strings above are the installed package.json fields verbatim. Runtime dependency counts are direct `dependencies` keys, not transitive counts. Native detection checks for binding.gyp or native addon files.

Exact commands from `/workspace/celestine-060`:

```sh
npm run build
node scripts/bench/compare.mjs > /workspace/celestine-compare/results-2026-10-24.txt
node scripts/bench/compare.mjs --json > /workspace/celestine-compare/results-2026-10-24.json
npx biome check scripts/bench/compare.mjs
```

## Summary

Largest longitude error vs the same JPL Horizons fixtures (arcsec, Sun–Pluto; Moon 1900–2100,
Pluto 1885–2099, others 1800–2200), chart-equivalent browser bundle, and package facts. All values
are copied from the tables below.

| library | worst planet (excl. Moon) | Moon | gzip bundle | license | runtime deps | implementation |
| --- | --- | --- | --- | --- | --- | --- |
| celestine 0.5.0 (this repo) | Neptune 4.643 | 7.583 | 33,005 B (`calculateChart`, root import) | MIT | 0 | pure TypeScript/JS |
| astronomy-engine 2.1.19 | Neptune 19.383 | 3.671 | 22,083 B (positions + sidereal time; no houses/chart) | MIT | 0 | pure JS |
| sweph 2.10.3-8, Moshier mode | Neptune 1.978 | 2.155 | not bundleable for browsers (native addon) | AGPL-3.0-or-later OR LGPL-3.0-or-later | 2 | native C addon |
| celestine 0.2.1 (published baseline) | Mercury 8214.893 | 7.583 | 63,773 B (root import) | MIT | 0 | pure TypeScript/JS |

## Method

Celestine provides astrology charts and astronomical positions. Astronomy Engine provides general astronomical calculations. Swiss Ephemeris provides astronomical and astrological calculations with selectable ephemerides. Swiss Ephemeris with its data files is far more precise than its built-in Moshier mode; only Moshier was measured because data files are not installed. These results do not measure Swiss data-file precision.

The unchanged JPL Horizons fixtures are geocentric body-center vectors corrected for light-time and stellar aberration (LT+S), rotated to the IAU76/80 mean ecliptic and equinox of date. Each numeric epoch is supplied to the libraries as TT; Horizons used the same numeric epoch as TDB. See the [fixture README](../src/ephemeris/__fixtures__/horizons/README.md) for source ephemerides, rounding, the TT/TDB approximation and omitted frame bias.

Astronomy Engine receives `AstroTime.FromTerrestrialTime` with days since its reference epoch. `GeoVector(body, time, true)` returns a J2000 equatorial vector. The script applies the fixture generator's precession and mean-obliquity formulas directly, bypassing the true-of-date nutation in `Ecliptic`. Its independent check compares this result with `Ecliptic` minus the full `e_tilt().dpsi` nutation. This check uses Astronomy Engine's native precession model, which differs slightly from the fixture model.

sweph receives TT through `calc`, selects `SEFLG_MOSEPH | SEFLG_NONUT`, and verifies that the returned flags actually select Moshier. To match the fixture's precession convention, it also requests a mean J2000 equatorial Cartesian vector and rotates that vector with the fixture formulas. The independent check retains the native NONUT mean-of-date longitude. Apparent corrections remain enabled, including Swiss's default gravitational deflection, which is absent from the Horizons LT+S vectors. Results therefore retain that physical-correction difference rather than concealing it with fitted offsets.

Current and baseline Celestine use their individual position functions with speed disabled. The published baseline is measured as returned. Source inspection found that its Pluto calculation combines J2000 Pluto coordinates with Earth-of-date coordinates; no external rotation can rigorously repair that mixed vector. Its values below characterize the published output against the target frame, not an independently correct implementation of that frame. No empirical drift or nutation term is subtracted from baseline errors.

Longitude error is the wrapped angular difference; latitude error is the direct difference. Maxima are absolute errors; RMS is the square root of the mean squared errors. Angular error columns are arcseconds, rounded to 0.001 (raw values: `--json`).

## Fixture measurements

| library | body | samples | fromTT | toTT | lonMaxArcsec | lonRmsArcsec | latMaxArcsec | latRmsArcsec |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| celestine current | Sun | 123 | 1800-01-01T12:00:00.000 | 2200-01-01T12:00:00.000 | 0.305 | 0.120 | 0.148 | 0.055 |
| celestine current | Moon | 123 | 1900-01-01T12:00:00.000 | 2100-01-01T12:00:00.000 | 7.583 | 2.734 | 1.285 | 0.429 |
| celestine current | Mercury | 176 | 1800-01-01T12:00:00.000 | 2200-01-01T12:00:00.000 | 1.119 | 0.307 | 0.722 | 0.275 |
| celestine current | Venus | 148 | 1800-01-01T12:00:00.000 | 2200-01-01T12:00:00.000 | 0.579 | 0.176 | 0.439 | 0.137 |
| celestine current | Mars | 148 | 1800-01-01T12:00:00.000 | 2200-01-01T12:00:00.000 | 1.173 | 0.305 | 0.682 | 0.215 |
| celestine current | Jupiter | 123 | 1800-01-01T12:00:00.000 | 2200-01-01T12:00:00.000 | 1.357 | 0.489 | 0.636 | 0.202 |
| celestine current | Saturn | 123 | 1800-01-01T12:00:00.000 | 2200-01-01T12:00:00.000 | 1.658 | 0.616 | 1.033 | 0.353 |
| celestine current | Uranus | 123 | 1800-01-01T12:00:00.000 | 2200-01-01T12:00:00.000 | 3.342 | 0.994 | 0.662 | 0.245 |
| celestine current | Neptune | 123 | 1800-01-02T12:00:00.000 | 2199-12-29T12:00:00.000 | 4.643 | 1.956 | 0.359 | 0.184 |
| celestine current | Pluto | 91 | 1885-01-01T12:00:00.000 | 2099-01-01T12:00:00.000 | 3.162 | 1.164 | 0.350 | 0.177 |
| astronomy-engine | Sun | 123 | 1800-01-01T12:00:00.000 | 2200-01-01T12:00:00.000 | 1.844 | 0.619 | 2.607 | 0.993 |
| astronomy-engine | Moon | 123 | 1900-01-01T12:00:00.000 | 2100-01-01T12:00:00.000 | 3.671 | 1.201 | 1.272 | 0.455 |
| astronomy-engine | Mercury | 176 | 1800-01-01T12:00:00.000 | 2200-01-01T12:00:00.000 | 9.108 | 3.131 | 11.593 | 2.704 |
| astronomy-engine | Venus | 148 | 1800-01-01T12:00:00.000 | 2200-01-01T12:00:00.000 | 9.439 | 2.246 | 9.781 | 2.157 |
| astronomy-engine | Mars | 148 | 1800-01-01T12:00:00.000 | 2200-01-01T12:00:00.000 | 11.141 | 3.089 | 8.738 | 2.470 |
| astronomy-engine | Jupiter | 123 | 1800-01-01T12:00:00.000 | 2200-01-01T12:00:00.000 | 9.742 | 3.716 | 14.487 | 4.663 |
| astronomy-engine | Saturn | 123 | 1800-01-01T12:00:00.000 | 2200-01-01T12:00:00.000 | 12.706 | 4.176 | 21.164 | 9.544 |
| astronomy-engine | Uranus | 123 | 1800-01-01T12:00:00.000 | 2200-01-01T12:00:00.000 | 10.833 | 3.619 | 18.662 | 7.190 |
| astronomy-engine | Neptune | 123 | 1800-01-02T12:00:00.000 | 2199-12-29T12:00:00.000 | 19.383 | 10.665 | 11.075 | 5.233 |
| astronomy-engine | Pluto | 91 | 1885-01-01T12:00:00.000 | 2099-01-01T12:00:00.000 | 7.868 | 3.591 | 1.496 | 0.683 |
| celestine-021 | Sun | 123 | 1800-01-01T12:00:00.000 | 2200-01-01T12:00:00.000 | 29.576 | 13.856 | 1.091 | 0.464 |
| celestine-021 | Moon | 123 | 1900-01-01T12:00:00.000 | 2100-01-01T12:00:00.000 | 7.583 | 2.734 | 3.379 | 0.931 |
| celestine-021 | Mercury | 176 | 1800-01-01T12:00:00.000 | 2200-01-01T12:00:00.000 | 8214.893 | 1784.521 | 341.849 | 78.506 |
| celestine-021 | Venus | 148 | 1800-01-01T12:00:00.000 | 2200-01-01T12:00:00.000 | 37.912 | 17.177 | 3.469 | 1.155 |
| celestine-021 | Mars | 148 | 1800-01-01T12:00:00.000 | 2200-01-01T12:00:00.000 | 29.842 | 14.798 | 2.470 | 0.782 |
| celestine-021 | Jupiter | 123 | 1800-01-01T12:00:00.000 | 2200-01-01T12:00:00.000 | 45.431 | 20.486 | 1.377 | 0.395 |
| celestine-021 | Saturn | 123 | 1800-01-01T12:00:00.000 | 2200-01-01T12:00:00.000 | 53.195 | 23.538 | 1.715 | 0.678 |
| celestine-021 | Uranus | 123 | 1800-01-01T12:00:00.000 | 2200-01-01T12:00:00.000 | 41.638 | 21.132 | 1.213 | 0.370 |
| celestine-021 | Neptune | 123 | 1800-01-02T12:00:00.000 | 2199-12-29T12:00:00.000 | 38.611 | 21.171 | 0.855 | 0.388 |
| celestine-021 | Pluto | 91 | 1885-01-01T12:00:00.000 | 2099-01-01T12:00:00.000 | 5844.952 | 3072.448 | 69.910 | 24.64828878610729 |
| sweph | Sun | 123 | 1800-01-01T12:00:00.000 | 2200-01-01T12:00:00.000 | 0.077 | 0.026 | 0.059 | 0.024 |
| sweph | Moon | 123 | 1900-01-01T12:00:00.000 | 2100-01-01T12:00:00.000 | 2.155 | 0.687 | 1.457 | 0.490 |
| sweph | Mercury | 176 | 1800-01-01T12:00:00.000 | 2200-01-01T12:00:00.000 | 0.133 | 0.046 | 0.175 | 0.041 |
| sweph | Venus | 148 | 1800-01-01T12:00:00.000 | 2200-01-01T12:00:00.000 | 0.442 | 0.128 | 0.335 | 0.059 |
| sweph | Mars | 148 | 1800-01-01T12:00:00.000 | 2200-01-01T12:00:00.000 | 0.497 | 0.122 | 0.290 | 0.055 |
| sweph | Jupiter | 123 | 1800-01-01T12:00:00.000 | 2200-01-01T12:00:00.000 | 0.751 | 0.289 | 0.132 | 0.057 |
| sweph | Saturn | 123 | 1800-01-01T12:00:00.000 | 2200-01-01T12:00:00.000 | 0.550 | 0.186 | 0.550 | 0.076 |
| sweph | Uranus | 123 | 1800-01-01T12:00:00.000 | 2200-01-01T12:00:00.000 | 0.458 | 0.173 | 0.638 | 0.066 |
| sweph | Neptune | 123 | 1800-01-02T12:00:00.000 | 2199-12-29T12:00:00.000 | 1.978 | 1.176 | 0.252 | 0.094 |
| sweph | Pluto | 91 | 1885-01-01T12:00:00.000 | 2099-01-01T12:00:00.000 | 1.446 | 0.512 | 0.593 | 0.279 |

## Browser and installed sizes

The bundle entry uses the repository guard's shared esbuild options: bundled, minified ESM, neutral platform, tree shaking. Gzip uses fflate with the same compression and timestamp settings as the guard. Root and subpath chart exports retain `calculateChart`. Astronomy Engine retains the measured body-position adapter and sidereal time; it does not implement astrology houses or a complete chart. These are related browser workloads, not identical feature sets. The baseline chart entry resolves its available root API. The native Swiss binding cannot be bundled for browsers.

| library | entry | minBytes | gzipBytes |
| --- | --- | --- | --- |
| celestine current | root chart | 86766 | 33005 |
| celestine current | subpath chart | 86766 | 33556 |
| astronomy-engine | positions + sidereal time | 48597 | 22083 |
| celestine-021 | root chart | 196888 | 63773 |
| sweph | not bundleable for browsers (native addon) | unavailable | unavailable |

Installed bytes in the metadata table sum regular package files, excluding dependency directories and symlinks. Current Celestine counts dist, package.json, README and LICENSE to approximate the package files rather than the checkout. This is a file-byte sum, not allocated disk usage or a tarball measurement. Package layouts and included documentation differ.

## Frame diagnostics

The following checks compare independent coordinate paths, not additional Horizons observations. Small differences reflect different precession conventions. They do not show an unremoved nutation-scale offset or a missing annual precession term. No diagnostic residual was subtracted from a measurement.

| library | body | comparison | maxArcsec | rmsArcsec |
| --- | --- | --- | --- | --- |
| astronomy-engine | Sun | IAU76/80 vs Ecliptic minus full dpsi | 0.623 | 0.350 |
| astronomy-engine | Moon | IAU76/80 vs Ecliptic minus full dpsi | 0.306 | 0.175 |
| astronomy-engine | Mercury | IAU76/80 vs Ecliptic minus full dpsi | 0.623 | 0.291 |
| astronomy-engine | Venus | IAU76/80 vs Ecliptic minus full dpsi | 0.623 | 0.319 |
| astronomy-engine | Mars | IAU76/80 vs Ecliptic minus full dpsi | 0.622 | 0.319 |
| astronomy-engine | Jupiter | IAU76/80 vs Ecliptic minus full dpsi | 0.623 | 0.350 |
| astronomy-engine | Saturn | IAU76/80 vs Ecliptic minus full dpsi | 0.623 | 0.350 |
| astronomy-engine | Uranus | IAU76/80 vs Ecliptic minus full dpsi | 0.623 | 0.350 |
| astronomy-engine | Neptune | IAU76/80 vs Ecliptic minus full dpsi | 0.623 | 0.350 |
| astronomy-engine | Pluto | IAU76/80 vs Ecliptic minus full dpsi | 0.343 | 0.181 |
| sweph | Sun | native mean date vs J2000 rotated IAU76/80 | 0.624 | 0.349 |
| sweph | Moon | native mean date vs J2000 rotated IAU76/80 | 0.306 | 0.175 |
| sweph | Mercury | native mean date vs J2000 rotated IAU76/80 | 0.624 | 0.291 |
| sweph | Venus | native mean date vs J2000 rotated IAU76/80 | 0.624 | 0.319 |
| sweph | Mars | native mean date vs J2000 rotated IAU76/80 | 0.622 | 0.319 |
| sweph | Jupiter | native mean date vs J2000 rotated IAU76/80 | 0.624 | 0.350 |
| sweph | Saturn | native mean date vs J2000 rotated IAU76/80 | 0.623 | 0.350 |
| sweph | Uranus | native mean date vs J2000 rotated IAU76/80 | 0.624 | 0.350 |
| sweph | Neptune | native mean date vs J2000 rotated IAU76/80 | 0.623 | 0.350 |
| sweph | Pluto | native mean date vs J2000 rotated IAU76/80 | 0.343 | 0.181 |

## Anchor dates

These dates are not fixture epochs, so there is no Horizons truth value here. All libraries receive the same TT epoch derived from UT using Astronomy Engine's Delta-T model. Both the absolute longitude and the signed wrapped difference from Astronomy Engine are in arcminutes; absolute longitude is measured from the mean equinox of date. Baseline Pluto retains the mixed-frame limitation described above. Dates lacking a requested time use midnight UT.

| body | ut | jdTT | library | deltaTSeconds | longitudeArcmin | minusAstronomyEngineArcmin |
| --- | --- | --- | --- | --- | --- | --- |
| Pluto | 2026-08-05T00:00:00Z | 2461257.5008728653 | celestine current | 75.416 | 18244.798 | 0.032 |
| Pluto | 2026-08-05T00:00:00Z | 2461257.5008728653 | astronomy-engine | 75.416 | 18244.766 | 0 |
| Pluto | 2026-08-05T00:00:00Z | 2461257.5008728653 | celestine-021 | 75.416 | 18221.231 | -23.535 |
| Pluto | 2026-08-05T00:00:00Z | 2461257.5008728653 | sweph | 75.416 | 18244.784 | 0.017 |
| Pluto | 1955-07-23T00:00:00Z | 2435311.5003616926 | celestine current | 31.250 | 8734.839 | -0.011 |
| Pluto | 1955-07-23T00:00:00Z | 2435311.5003616926 | astronomy-engine | 31.250 | 8734.850 | 0 |
| Pluto | 1955-07-23T00:00:00Z | 2435311.5003616926 | celestine-021 | 31.250 | 8771.205 | 36.355 |
| Pluto | 1955-07-23T00:00:00Z | 2435311.5003616926 | sweph | 31.250 | 8734.834 | -0.016 |
| Pluto | 1947-01-13T03:00:00Z | 2432198.6253217207 | celestine current | 27.797 | 7958.928 | -0.012 |
| Pluto | 1947-01-13T03:00:00Z | 2432198.6253217207 | astronomy-engine | 27.797 | 7958.940 | 0 |
| Pluto | 1947-01-13T03:00:00Z | 2432198.6253217207 | celestine-021 | 27.797 | 8003.880 | 44.940 |
| Pluto | 1947-01-13T03:00:00Z | 2432198.6253217207 | sweph | 27.797 | 7958.927 | -0.012 |
| Mercury | 1969-02-04T03:00:00Z | 2440256.625454439 | celestine current | 39.264 | 18171.329 | -0.007 |
| Mercury | 1969-02-04T03:00:00Z | 2440256.625454439 | astronomy-engine | 39.264 | 18171.336 | 0 |
| Mercury | 1969-02-04T03:00:00Z | 2440256.625454439 | celestine-021 | 39.264 | 18191.900 | 20.564 |
| Mercury | 1969-02-04T03:00:00Z | 2440256.625454439 | sweph | 39.264 | 18171.322 | -0.014 |

## Limitations

The sample counts and exact TT endpoints are in the fixture table. The samples do not establish worst-case error between epochs or outside their ranges. Moon and Pluto cover different intervals from the other bodies. Chiron is excluded. Numerical discrepancies can include theory truncation, frame conventions, aberration implementations and the differing gravitational-deflection treatment. Astronomy Engine's `GeoVector` special-cases the Moon as `GeoMoon`, so its lunar result is its provided geometric model rather than a separately backdated aberrated vector.

The published baseline's frame defect prevents a fully normalized comparison for Pluto; reporting its returned values makes that limitation explicit. No peer is inferred to support features it was not asked to compute. No speed ranking, data-file Swiss accuracy claim, license compatibility advice or between-sample precision claim follows from these measurements. The focused Mercury/Pluto report is saved separately as `/workspace/celestine-compare/issue1.txt`.
