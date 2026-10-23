# Working on Celestine

## Mission

Build the best astrology and astronomy engine in the world. Keep MIT licensing, zero runtime
dependencies, and isomorphic browser and server execution with identical results. Prioritize
correctness, then CPU, memory, and bundle/file size. Large coefficient tables slow page loads.

## Verify before every commit

```sh
npm run check
```

This is the one required command: types, lint, build, full tests with coverage (including precision),
size, performance, API stability, and ratchet checks. Use Node >=20; `.nvmrc` selects Node 22.
Do not bypass a failed dimension to improve another. Individual `check:*` scripts aid diagnosis.

## Precision and budgets

Verify positions against JPL Horizons fixtures in `src/ephemeris/__fixtures__/horizons`.
Preserve the independent frame cross-check. Regenerate only with
`scripts/horizons/fetch-fixtures.mjs`, update the fixture README, and include
`[fixtures-regenerated]` in the commit message. NEVER hand-edit fixtures or loosen limits to make
checks pass. Precision limits only ratchet down; minimum sample counts only ratchet up.

`budgets.json` is the single source of truth. Smaller precision errors, size bytes, performance
ratios, and performance tolerance are tighter. Larger coverage percentages and minimum sample
counts are tighter. Missing entries count as regressions. Size budgets cover minified and gzip-9
bytes; performance uses median interleaved calibration ratios, with one retry before failure.
Run `npm run budgets:update` to measure and update coverage, size, performance, and the API snapshot.
Tightening is always allowed. Loosening requires explicit human sign-off,
`BUDGET_INCREASE_APPROVED=1` for updates, and `[budget-increase-approved]` in the commit message,
stating the reason and the human who approved. Review all generated diffs.

The ratchet compares against the merge-base with origin/main (then main, then HEAD~1).
Use `--base <ref>` or `RATCHET_BASE` for an explicit comparison; CI checks actual PR head commit
messages. API removals or changes require `[api-change-approved]`; pure additions do not.

## Design and time scales

Prefer semantic compression over patches: delete special cases, share helpers instead of duplicating
tables, and account for size before adding coefficients. Measure CPU and size before and after
relevant work. Ephemeris JD input is TT; chart currently passes UT, a known gap. Document that the
default coordinate frame is mean ecliptic/equinox of date. Do not silently change time or frame semantics.

## Public API contract

A production consumer relies on the following exact names, signatures, fields, and string values.
Preserve bare-function calls and optional arguments. `api-surface.json` snapshots runtime export
names/kinds and enum values, plus normalized declarations and output types from `dist/index.d.ts`.
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

## Commit hygiene

Use small commits. Add a Keep a Changelog entry for user-visible changes. Put before/after size
and performance numbers in commit messages for relevant work. Never commit generated dist or
coverage. Include approval tags only with actual authorization and explain the reason.

## Repo map

- `src/`: time, zodiac, ephemeris, houses, aspects, chart, transits, progressions; colocated tests.
- `scripts/guard/`: coverage, size, performance, API snapshot, ratchet gates and comparison tests.
- `scripts/horizons/`: fixture fetching, coefficient audits, precision measurements.
- `scripts/bench/`: exploratory performance and size measurements.
