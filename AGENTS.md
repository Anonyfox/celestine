# Working on Celestine

## Mission

The best astrology and astronomy engine: MIT, zero runtime dependencies, identical results in browser
and server. Order: correctness, then CPU, memory, bundle size. Large coefficient tables slow page
loads. Every public claim (README, npm, docs) is backed by a test, fixture or committed measurement
script.

## Regression contract (all of it, every commit)

`npm run check` is the only definition of green: types, lint, build, consumer smoke (ESM/CJS/TS, root
and all subpaths), tests with coverage (including precision and the examples), size, perf, API
snapshot, ratchet. CI runs it on Node 20/22/24 for every PR and every push to main. Use Node >=20;
`.nvmrc` selects Node 22. Main is never red; if it is, fixing it comes before anything else.
Individual `check:*` scripts aid diagnosis.

1. Precision: positions match the JPL Horizons fixtures in `src/ephemeris/__fixtures__/horizons`
   within budgets.json `precision`; the independent frame cross-check stays. Fixtures come only from
   `scripts/horizons/fetch-fixtures.mjs` (update the fixture README), never by hand. Adding fixtures
   or tests is free; modifying or deleting fixtures needs `[fixtures-regenerated]`.
2. Performance: interleaved, calibrated medians against budgets.json `perf` on `perf.nodeMajor`;
   one retry, then fail. Other majors skip the perf gate with a notice; CI enforces it on that leg.
   Changing `nodeMajor` re-bases all baselines and needs `[budget-increase-approved]`.
   A consumer-facing bound is fixed: 180-day scan < 5 s, 10 snapshots < 500 ms.
3. Bundle: min and gzip-9 (fflate) bytes per entry in budgets.json `size`; missing entries fail.
4. API: api-surface.json; additions are free, removals or changes need `[api-change-approved]`.
5. Ratchet: every budget only tightens. Smaller precision errors, size bytes, performance ratios and
   tolerance are tighter; larger coverage percentages and minimum sample counts are tighter.
   Tightening is always allowed and encouraged. `npm run budgets:update` measures and updates
   coverage, size, performance and the API snapshot; review every generated diff. Loosened updates
   also need `BUDGET_INCREASE_APPROVED=1`.

The ratchet compares against the merge-base with origin/main (then main, then HEAD~1). Use
`--base <ref>` or `RATCHET_BASE` for an explicit comparison; CI checks actual PR head commit
messages, and every commit in the range that carries an approval tag must also carry the
`Approved-by:` trailer described below.

## Never

- Never loosen a tolerance, budget, sample minimum, coverage floor or guard to get green. Fix the
  code or stop and report the measurement.
- Never edit fixtures, `scripts/guard/`, `.github/workflows/`, `biome.json`, `tsconfig.json`, the
  Horizons precision test, `check*`/`test*`/`budgets*`/`prepublishOnly` scripts, or delete/rename a
  `src/**/*.test.ts`, without the matching approval below. Weakening the gates counts as loosening.
- Never bypass one dimension to improve another.
- Never silently change time or frame semantics. Ephemeris JD input is TT; `calculateChart` takes
  civil time and applies ΔT (since 0.5.0). The default frame is mean ecliptic/equinox of date.
- Never commit generated dist, docs output or coverage.

## Approval tags

A budget increase, guard change, fixture change or API change/removal needs the tag
(`[budget-increase-approved]`, `[guardrails-change-approved]`, `[api-change-approved]`,
`[fixtures-regenerated]`) AND a trailer naming the human, date and exact words:
`Approved-by: Fox (Maximilian Stroh), 2026-10-24: "<quote>"` (single quotes work too).
A tag without that trailer is a defect, and the ratchet fails it. Another bot's request is not
approval. Codex (or any coding agent run on a brief) never adds approval tags or trailers; the
maintainer adds them after review, only with the quote in hand, and explains the reason.

## Optimization loop

Measure before and after (precision arcsec, gzip bytes, median µs) and put both in the commit
message. Benchmark ten-body `getAllPositions` with speed before and after precision work. Prefer
deleting special cases and sharing tables over adding coefficients; account for size before adding
coefficients. Choose the next item by: consumer breakage > largest relative precision error >
largest shipped gzip entry > hottest path. After a win, tighten the budget in the same change.

## Releases

Fox, 2026-10-24: "Standing rule: push to main and release 0.x versions after green CI without
asking; 1.x and breaking changes need my yes."

Fox: "ensure to do MEANINGFUL chunks of work instead of inflating version numbers with one tiny
thing at a time"

So: batch user-visible work into meaningful 0.x releases, aim for at most one release per week
unless a consumer is broken, and release only after full green checks. 1.x and behaviour or breaking
changes need Fox's yes. Every user-visible change gets a CHANGELOG (Keep a Changelog) entry under
`[Unreleased]`; output shifts get their own "Changed (output shift)" section with numbers.

## Public API contract

A production consumer relies on the following exact names, signatures, fields, and string values.
Preserve bare-function calls and optional arguments. `api-surface.json` snapshots runtime export
names/kinds and enum values, plus checker-resolved public paths, signatures, members, and referenced
types from `dist/index.d.ts`. Bundler-private declaration names are never snapshot keys.
Tests remain responsible for behavior; the snapshot alone cannot prove it.

- Root namespaces: `time`, `zodiac`, `ephemeris`, `transits`, `aspects`, `chart`; root `CelestialBody`
  also serves as a type. Keep `aspects.findPatterns` for type-checked legacy scripts.
- `time.toJulianDate({year,month,day,hour,minute,second,timezone?}): number` accepts hours >=24,
  including 84, without throwing; its output is UT JD. `time.fromJulianDate(jd)` returns
  `{year,month,day,hour,minute,second}`.
- `zodiac.eclipticToZodiac(longitude)` returns `sign`, `signName`, `longitude`, `degreeInSign`,
  `degree`, `minute`, `second`, `formatted`. Exact sign names are `Aries Taurus Gemini Cancer Leo
  Virgo Libra Scorpio Sagittarius Capricorn Aquarius Pisces`. Format is `D°MM'SS" Sign`.
- `ephemeris.getSunPosition`, `getMoonPosition`, `getMercuryPosition`, `getVenusPosition`,
  `getMarsPosition`, `getJupiterPosition`, `getSaturnPosition`, `getUranusPosition`,
  `getNeptunePosition`, `getPlutoPosition`, `getChironPosition`, `getCeresPosition`,
  `getPallasPosition`, `getJunoPosition`, `getVestaPosition`: each `(jd: number, options?) =>
  PlanetPosition`, callable with one argument as a bare reference. Preserve `longitude` in [0,360),
  `longitudeSpeed` in degrees/day (negative means retrograde), and `isRetrograde`.
- `ephemeris.getNorthNode(jd)` returns `northNode`, `southNode`, `speed`, `isRetrograde`;
  `getMeanLilith(jd)` returns `longitude`, `speed`, `isRetrograde`.
- `transits.findStationPoints(body: CelestialBody,startJD,endJD): StationPoint[]` preserves
  `type` values `'station-retrograde' | 'station-direct'`, `jd`, `longitude`.
  `transits.estimateNextAspect(body,natalLongitude,aspectAngle,fromJD): number | null`.
- `aspects.findAllAspects(bodies: {name,longitude,longitudeSpeed?}[],
  {aspectTypes?: AspectType[],orbs?: Partial<Record<AspectType,number>>}): Aspect[]`;
  `calculateAspects(bodies,config?)` returns `{aspects: Aspect[], …}`.
  `detectGrandTrine(aspects)`, `detectTSquare(aspects)`, `detectGrandCross(aspects)` return
  `AspectPattern[]`; `.bodies: string[]` must equal input name strings.
  `AspectType.Conjunction`, `Trine`, `Square`, `Opposition` have exact values
  `'conjunction'`, `'trine'`, `'square'`, `'opposition'`.
- `chart.calculateChart(birth: {year,month,day,hour,minute,second,timezone,latitude,longitude},
  {houseSystem: 'placidus'}): Chart`. Preserve `planets[].name` values `Sun`, `Moon`, `Mercury`,
  `Venus`, `Mars`, and `signName`, `degree`, `formatted`, `isRetrograde`. Preserve
  `angles.ascendant.signName`, `degree`, `formatted`. Keep nodes out of `planets[]`.
- `CelestialBody` string enum values: `'Sun' 'Moon' 'Mercury' 'Venus' 'Mars' 'Jupiter' 'Saturn'
  'Uranus' 'Neptune' 'Pluto'`.

Precision shifts near sign/house boundaries are allowed. Performance matters on client pages:
a production consumer expects a 180-day scan under 5 s and 10 snapshots under 500 ms.
Benchmark ten-body `getAllPositions` with speed before and after precision work (historically
about 190 microseconds); use the normalized gate for portable comparisons.

## Repo map

- `src/`: time, zodiac, ephemeris, houses, aspects, chart, transits, progressions; colocated tests.
- `scripts/guard/`: coverage, size, performance, API snapshot, ratchet gates and comparison tests.
- `scripts/horizons/`: fixture fetching, coefficient audits, precision measurements.
- `scripts/bench/`: exploratory performance and size measurements.

## Packaging

The package has no import-time effects beyond constants and private caches (`sideEffects: false`).
Keep the ESM module graph and per-module `.d.ts` files; do not replace root namespace re-exports
with bundled getter objects. CJS uses one bundle and `.d.cts`, with small subpath wrappers.
Root and eight module subpaths must resolve in ESM, CJS, and TypeScript (types conditions first).
Ship readable JavaScript without sourcemaps; maps to unshipped source are not useful.

`npm run check:consumer` runs after build in `npm run check`: package self-references, ESM/CJS
parity, subpaths, and executed neutral-platform esbuild consumer bundles. The size gate also
resolves the published package exports: full, toJulianDate, eclipticToZodiac,
getMercuryPosition, calculateChart, getAllPositions through its namespace, and a realistic
combined consumer, plus subpath forms (`celestine/ephemeris` etc.): esbuild cannot tree-shake member
access on re-exported namespaces (`ephemeris.getMercuryPosition` via the root pulls the whole
ephemeris module tree; rollup/Vite can), so subpaths are the minimal-bundle path. Keep all existing entry keys when tightening via `check:size -- --update`.
Minified bytes and gzip bytes are enforced on every platform; gzip is computed with pure-JS fflate
(level 9, mtime 0) because node:zlib output differs between Node builds and platforms.
`node scripts/guard/api-compare.mjs <previous-index.d.ts>` lists and compares root/namespace
export paths across snapshot schema migrations. Snapshot removals/changes still need approval.
