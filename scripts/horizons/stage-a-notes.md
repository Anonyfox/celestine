# Stage A measurement notes

Input epochs are TT; default outputs use mean ecliptic/equinox of date, with
light-time and annual aberration, without nutation. Chart's UT input gap remains.
Measurements were made with Node 20.19.2, the budget's recorded Node major.

## Selection and audit

Every retained Mercury–Neptune and Earth coefficient is checked against CDS
VI/81 VSOP87D originals by `node scripts/horizons/audit-coefficients.mjs`.
Downloads go to the system temporary directory. The audit rejects duplicate
terms and excessive rounding error; `coefficient-audit.txt` records every table,
including empty higher orders. Amplitudes use Meeus units (1e-8 rad/AU).

Selections use A × 0.201^order, covering 1800–2200. Earth cutoff is 10;
Venus 20, Mars 25, Jupiter 60, Saturn 80, Uranus 80, Neptune 60.
Radius cutoffs are multiplied by 0.7, 1, 5, 9, 19, 30 respectively, reflecting
the approximate angular effect of radial error at the body's orbital radius.
Mercury retains the existing Meeus subset, with coefficients re-audited and
rounding corrected; its retention policy is not a uniform amplitude cutoff.
The Earth selection covers L0–L5/B0–B4/R0–R4; discarded orders are empty.

Exploratory measurements on the original fixtures:

| Selection | Sun max longitude | Full min/gzip bytes |
| --- | ---: | ---: |
| Baseline | 25.998″ | 197636 / 62482 |
| Earth cutoff 2, planet cutoffs 10–20, fine coefficient rounding | 0.158″ | 222858 / 77653 (over budget) |
| Weighted planet cutoffs above, compact coefficient rounding | 0.173″ | 178203 / 58434 |
| Earth cutoff 10, shared velocities and Earth reuse | 0.299″ | see final gate output |

The smaller Earth selection is below 0.5″ against full official series sums at
±0.2 millennia and J2000; the expanded Sun fixtures measure its actual error.
The selected final planet cutoffs were then validated on the expanded fixtures.
No fitting to Horizons or astronomy-engine coefficients is used.

Corruptions found in the previous tables include Mars B2 phases (4.1416 vs π,
3.559 vs 5.55871276021), swapped Mars R0 phases at 3340.595/3340.630,
multiple Mars L2/R1 rows with mismatched amplitudes/phases, Saturn L1 rows with
amplitudes/phases belonging to other frequencies, and Jupiter L4's mistyped
7.16 frequency (official 7.1135470008). The previous duplicated Earth L2
constant was also wrong. Replacing the affected selections from official data
removes these mismatches rather than patching their effects downstream.

## Shared calculation

VSOP87D coordinates are already of date. Six dominant L0/B0/R0 harmonics plus
L1's secular motion supply the inexpensive first-order retarded displacement.
Keplerian callbacks use one additional evaluation at the initial light time.
Pluto retains its inexpensive orbital-radius light-time estimate and J2000
precession. For centered 0.01-day speed differences, the Earth vector is
linearly advanced from one evaluation using its dominant velocities. Forward
one-day speeds use a separately evaluated Earth. A bounded 12-entry cache
shares Earth results between bodies and speed dates without unbounded growth.
Speed conventions remain forward one day or centered ±0.01 day, as before.

The shared path honors `includeNutation` with the existing single-term solar
helper. Default mean results are unchanged by this option handling. The Moon
continues its existing option behavior. Asteroids retain their speed-only
public options. Legacy low-order `sunTrueLongitude`, `sunApparentLongitude`,
and `sunDistance` helpers retain their documented approximations; the main
`getSunPosition` uses the common Earth vector and apparent pipeline.

## Lunar and Chiron limits

The Moon's original 60-term Meeus table misses main-problem latitude harmonics
large enough to exceed the unchanged 2″ latitude budget with expanded coverage.
34 additional ELP2000-82 main-problem terms with amplitude ≥0.1″ were taken from
CDS VI/79/ELP2, converted from arcseconds to integer microdegrees, and added to
the existing table. No lunar theory rewrite or longitude change was made.
Integer microdegree rounding contributes ≤0.0018″ per added term. The original
8″ longitude budget is retained: the expanded sample reaches 7.583″, leaving
less headroom than requested, and increasing that existing limit is forbidden.

Chiron's existing J2000 Keplerian elements and approximate secular rates are
preserved. A 1950–2050 sample (roughly one orbit on either side of the epoch)
characterizes the approximation rather than claiming validity to arcseconds.
Precession, light-time, shared Earth and aberration cannot correct its missing
perturbations: residual longitude errors reach ~5.5°. The new budget records
this limitation with 20% headroom. A high-precision Chiron theory is outside
Stage A's instruction to preserve its theory. No public elements were fitted.

`accuracy-before.txt` records the initial measurement on the original fixtures.
`accuracy-before-expanded.txt` reruns HEAD's original source from a temporary
archive against exactly the final expanded fixtures, including Chiron.
`accuracy-after.txt` records the final source on those same fixtures. This
separates algorithm improvements from the increased date coverage.

## Final verification

`npm run check` passes types, lint, build, all tests/coverage, size, performance,
and the unchanged API snapshot (3476 entries). Its only failure is the ratchet's
expected `Requires [fixtures-regenerated]`; no commit was made. Coverage is
90.50% lines, 89.91% branches, 96.84% functions, with all budgets unchanged.
Standalone size, performance, and API commands were also run successfully.

Full bundle minified/gzip-9: **197636/62482 → 176650/57787 bytes**.
All other size entries also pass. Runtime-source diff: **2068 insertions,
4552 deletions**, or **2484 net lines removed**. The tracked overall diff
(including regenerated fixtures and existing documentation) is 4334 insertions,
5452 deletions in 33 files; new artifacts/tests are additional untracked files
until the reviewer stages them.

| Benchmark | Before ns/op | After ns/op | After normalized ratio | Gate |
| --- | ---: | ---: | ---: | --- |
| calculateChart | 700086 | 486158 | 13343.83 | pass |
| ten-body getAllPositions with speed | 222535 | 89196 | 2400.64 | pass |
| Mercury | 15354 | 11543 | 318.38 | pass |
| Pluto | 8727 | 9574 | 272.25 | pass |
| Moon | 6439 | 7307 | 210.02 | pass |
| 180-day station scan | 1436348 | 1196272 | 33206.08 | pass |

Absolute timings vary with host load; normalized gates all passed on Node 20.
No size, performance, coverage, API, or existing precision limit was loosened.
The new Chiron entry explicitly records its coarse theory's error envelope.
