# Chiron options measured on 2026-10-24

No budgets, API snapshots, guards, existing data fixtures, scripts in package.json, or version were changed. No commit or release.

## Decision

B implemented using the existing shared precise model. A rejected: improves every window's maximum and RMS, but worsens 2,026 of 18,260 dense held-out epochs (822 in 1950–2000 and 1,204 in 2000–2050). This fails the strict pointwise “nowhere worse” requirement. C rejected: root full exceeds 58,990 gzip bytes.

A fits nine constants (a, e, i, node, perihelion, mean anomaly, mean motion, node rate, perihelion rate), preserving the existing algorithm. Training uses alternate rows of the independent 2-day Horizons vectors, with one year of endpoint padding (1900–2101). Longitude residuals are geocentric, with latitude weighted 0.1 to regularize the solution. numpy Gauss–Newton with line search; no scipy or runtime dependency. Candidate measured in the source temporarily, then removed. Rounded candidate constants:

`[13.6566, 0.380527, 7.039947, 210.04856, 338.581754, 27.698721, 0.01953127397, -3.727894, 4.290147]`

## Dense longitude comparison (arcseconds, max / RMS)

Every row has 4,565 held-out epochs. All models use the same apparent pipeline. Horizons vectors are interpolated over 2 days for light time; this is not an independent validation of the shared apparent pipeline. The separate OBSERVER comparison below addresses that limitation. No finite sampling proves absence of regressions between samples.

| Window | Current root | A refit | B / C shared precise |
|---|---:|---:|---:|
| 1900–1950 | 19862.611 / 9119.957 | 3260.482 / 982.463 | 0.655 / 0.258 |
| 1950–2000 | 12254.319 / 4038.894 | 1444.840 / 1097.380 | 0.566 / 0.150 |
| 2000–2050 | 20830.677 / 7410.081 | 1159.394 / 455.655 | 0.683 / 0.203 |
| 2050–2100 | 39456.608 / 15227.369 | 782.360 / 544.399 | 0.756 / 0.193 |

## Independent apparent OBSERVER holdout (arcseconds, max / RMS)

Separately fetched random epochs, not fitting inputs; true equinox, TT. The new 189-row fixture preserves these reference values, and tests the selected events path within 0.60″.

| Window | Samples | Current root | A refit | B / C shared precise |
|---|---:|---:|---:|---:|
| 1900–1950 | 43 | 18739.200 / 10448.541 | 3093.270 / 945.254 | 0.392 / 0.227 |
| 1950–2000 | 49 | 10780.044 / 3573.503 | 1423.934 / 1055.483 | 0.593 / 0.181 |
| 2000–2050 | 51 | 19578.279 / 5851.183 | 1058.774 / 416.745 | 0.514 / 0.189 |
| 2050–2100 | 46 | 36967.406 / 13461.236 | 752.552 / 565.018 | 0.440 / 0.201 |

## Bundle measurements (min / gzip-9 bytes)

Every entry affected by any experiment is shown. C used the shared precise getter in root, with Keplerian fallback; no copied model data. A and C were measured independently before B, each against the original baseline. B is the final tree. All unlisted entries are bit-identical in measured size.

| Entry | Before | A | C | Final B | Budget |
|---|---:|---:|---:|---:|---:|
| full | 172645 / 58990 | 172603 / 58961 | 176448 / 61718 | 172645 / 58990 | 173248 / 59008 |
| getMercuryPosition | 62241 / 24869 | 62199 / 24833 | 66036 / 27522 | 62241 / 24869 | 62272 / 24896 |
| calculateChart | 86766 / 33005 | 86724 / 32975 | 90564 / 35665 | 86766 / 33005 | 86784 / 33024 |
| getAllPositions | 62235 / 24870 | 62193 / 24835 | 66030 / 27521 | 62235 / 24870 | 62272 / 24896 |
| realistic | 132279 / 48356 | 132237 / 48322 | 136077 / 51056 | 132279 / 48356 | 132864 / 48448 |
| subpath.realistic | 100901 / 38417 | 100859 / 38388 | 104699 / 41160 | 100901 / 38417 | 100928 / 38464 |
| events.full | 73542 / 30029 | 73500 / 30001 | 77339 / 32852 | 77394 / 32641 | 73600 / 30080 |
| events.findStations | 56130 / 22813 | 56088 / 22786 | 59927 / 25621 | 59981 / 25482 | 56192 / 22848 |

Gzip deltas:

| Entry | A | B | C |
|---|---:|---:|---:|
| full | -29 | +0 | +2728 |
| getMercuryPosition | -36 | +0 | +2653 |
| calculateChart | -30 | +0 | +2660 |
| getAllPositions | -35 | +0 | +2651 |
| realistic | -34 | +0 | +2700 |
| subpath.realistic | -29 | +0 | +2743 |
| events.full | -28 | +2612 | +2823 |
| events.findStations | -27 | +2669 | +2808 |

## Reproduction and remaining reference retrieval

- `npm run build`
- `node scripts/chiron/measure-chiron.mjs && python3 scripts/chiron/refit.py` (local vector files required)
- `node scripts/chiron/validate.mjs` (local vectors and observer holdout required)
- `node scripts/chiron/benchmark.mjs` (ten classical bodies with speed)
- `node scripts/events/fetch-chiron-events.mjs` (network required)

Horizons observer retrieval succeeded on the box on 2026-10-24 (`horizons-chiron-events.json`: 6 ingresses, 31 stations, 3 longitudes). Event ingresses match Horizons within 3.9 minutes (max implied 0.35″); the test bound is 0.36″.

All classic-body ingress result objects over 2000–2030 with includeNutation:true compare byte-for-byte equal in serialized before/after runs. Root bundles remain unchanged. The root Horizons Chiron fixture remains 19,805.700″ maximum longitude / 2,201.199″ maximum latitude; no tighter root precision budget is proposed.

## Final checks (Node 20.19.2)

| Check | Result |
|---|---|
| `npm run check:types` | pass |
| `npm run check:lint` | pass |
| `npm run build` | pass |
| `npm test` | pass; including the Horizons Chiron ingress fixture |
| `npm run check:coverage` | pass: lines 90.787887%, branches 92.249047%, functions 97.631579% |
| `npm run check:perf` | pass: ten-body getAllPositions 193.361 µs; normalized 2382.5184 ≤ 2791.1 |
| `npm run check:precision` | pass; default root code and its fixtures unchanged |
| `npm run check:consumer` | pass: ESM/CJS/TS and subpaths |
| `node scripts/guard/size.mjs` | fail: events.full 77394/32641 > 73600/30080; events.findStations 59981/25482 > 56192/22848 (min/gzip bytes). All other entries pass. |

The exploratory ten-body benchmark measured 185.632 µs on the final build. No
before/after CPU improvement is claimed: production root position code is unchanged;
initial exploratory timing accidentally included the default eleven bodies and is
not a valid ten-body baseline. The normalized gate above is the meaningful result.
The complete `npm run check` is not green because of events size. No guard was
weakened to change that result.

Extra `npm run check:api` fails with the exact existing difference
`public.transits.getRetrogradeShadow: changed`. Neither that function nor the
protected API snapshot was edited in this task. Its prior-item signature update
is already present in HEAD; this task leaves it for maintainer review.
