# Changelog

All notable changes to this project are documented here, following
[Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/) and
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `searchTransitPasses` and `findTransitPasses` (`celestine/events`) take an optional
  `includeNutation` frame option, like the other event searches. The default stays the
  mean equinox of date and its output is unchanged. In both frames, cusp passes match
  108 JPL Horizons sign ingresses within 3.3″ of implied longitude.
- `searchTransitPasses` accepts `bodyOrbs` in that options argument: an orb per
  transiting body, as one number or per aspect type.
- `findStationPoints` results carry `jdUT`, and `findRetrogradePeriods` /
  `getAllRetrogradePeriods` results carry `stationRetroJDUT` and `stationDirectJDUT`,
  matching `jdUT` on `findStations` events. The fields are optional in the types so
  hand-built objects passed back in stay valid.
- The Map returned by `getAllRetrogradePeriods` (`celestine/transits`) now has a
  `toJSON`, so `JSON.stringify` gives an object keyed by body name instead of `{}`.
  It is still a `Map`.
- `getMoonPhase` (`celestine/events`) also returns `phaseName`, one of eight Moon
  phase names in 45° elongation buckets (`'new-moon'`, `'waxing-crescent'`, …,
  `'waning-crescent'`), and the `MoonPhaseName` type is exported. `phase` is unchanged.
- `findStations` (`celestine/events`) accepts Chiron, using the precise Chiron model
  within 1800–2200. Its 31 stations in 2020–2035 match JPL Horizons (retrieved
  2026-10-24) within 8.0 minutes and 0.38″ of station longitude.

### Changed (output shift)

- Chiron searches in `celestine/events` (ingresses, aspect times, transit passes) now
  use the `celestine/precise` Chiron model between 1800 and 2200, and root Chiron
  outside that range. Root Chiron can be off by degrees; for example it put the
  2026 Taurus ingress on 6 June instead of 19 June. Against JPL Horizons
  (retrieved 2026-10-24) the six Chiron ingresses of 2020–2035 now land within
  3.9 minutes (0.35″ of longitude), and 189 independent Horizons positions from
  1900–2100 agree within 0.60″. `getPosition('Chiron')` itself is unchanged, so
  at an event time it no longer sits exactly on the cusp; use
  `getChironPosition` from `celestine/precise` for matching positions. Other
  bodies' event times are bit-identical.

- `getRetrogradeShadow` (`celestine/transits`) now solves the real crossings instead of
  estimating them from an average daily motion. The pre-shadow starts at the last crossing
  of the station-direct longitude before the station retrograde; the post-shadow ends at the
  first crossing of the station-retrograde longitude after the station direct. Zones that
  contain 0° Aries are handled: `shadowZoneStart` is now always the station-direct longitude
  and `shadowZoneEnd` the station-retrograde longitude (identical to the old min/max for every
  zone that does not wrap). A new optional second argument takes the same frame options as
  `findRetrogradePeriods`; pass the frame the period was computed in.
- Examples (true equinox, UT): Mercury February 2026 moves from 16 Feb 02:34 / 31 Mar 23:47
  to 11 Feb 22:12 / 9 Apr 11:42. Saturn 2025 (zone across 0° Aries) moves from
  1 Feb 1997 / 9 May 2054 to 6 Apr 2025 14:50 / 2 Mar 2026 18:13. Pluto 2026 pre-shadow moves
  from 3 Sep 2024 to 12 Jan 2026 07:41.
- Against JPL Horizons (stations and crossings both taken from Horizons longitudes, 10 periods
  of Mercury through Pluto in 2025–2027, `horizons-shadows.json`): crossing times within
  0.41 min for Mercury through Mars, 0.62 min for Jupiter and Saturn, 2.3 min for Uranus,
  Neptune and Pluto; at most 0.71″ of implied longitude error.

## [0.6.0] - 2026-10-24

### Added

- `findLunarPhases` events carry `moonLongitude` and `sunLongitude` at the exact instant
  (mean equinox of date by default, true equinox with the new `includeNutation` option), for
  matching lunations against natal points. Phase names also accept `'new'`, `'first'`, `'full'`
  and `'last'`, and an unknown name now throws a `RangeError` listing the valid names. Checked
  against JPL Horizons at all 148 phases of 2025–2027 (Moon ≤ 7.46″, Sun ≤ 0.28″).

- `findEclipses` and eclipse types in `celestine/events`: solar and lunar greatest
  eclipses with TT/UT instants, NASA magnitudes, gamma and frame-selectable longitudes.
  NASA Canon 2020–2030 agreement: 50/50 types matched, maximum |Δt| 17.103 s.

- `searchTransitPasses` and `findTransitPasses` from `celestine/events` return one timing
  per orb pass (entry, exact hits, exit). Retrograde hits stay in the same pass only while
  the body never leaves orb. `searchTransits` itself is unchanged.

- `localDayToUT` from `celestine/events`: IANA local calendar day bounds in UT,
  including skipped midnights, DST overlaps and fractional-hour offsets; skipped
  dates throw. It lives in the subpath so the root bundle stays the same size.
  The guide now explains when to use `utToTT` (exact JD) and when `toTT` (legacy
  month-centre ΔT); in 2026 they differ by at most 9.3 ms.

- `celestine/events` day reports: `findAscendantSigns` for geographic ascendant sign intervals
  and `getSignsDuring` for endpoint signs and all ingresses. TT inputs, UT endpoints,
  optional true equinox; ascendant reports reject latitudes at or beyond 66 degrees.

- Runnable examples, executed in `npm run check` by `src/examples.test.ts`: `examples/node-cli.mjs`
  (next station-retrograde per planet, current Moon phase), `examples/browser-natal-chart.html`
  (no build step, ESM from a CDN) and `examples/cloudflare-worker.ts`. The README quickstart is
  typechecked and executed by the same test. No new dependencies; root bundle unchanged.
- `docs/COMPARISON.md` and `scripts/bench/compare.mjs`: measured comparison with astronomy-engine
  2.1.19 and sweph 2.10.3-8 (Moshier mode) against the same JPL Horizons fixtures, plus bundle
  size, license, runtime dependencies and native vs JS. Peers are not dependencies of this package.
- `docs/GUIDE.md` (per-module usage, moved out of the README), CONTRIBUTING.md, SECURITY.md,
  CITATION.cff, issue forms (bug report asks for a reproduction and the expected value with its
  reference source, frame and time scale; feature request), a PR checklist that mirrors the
  regression contract, and weekly grouped Dependabot updates for npm and GitHub Actions.

### Changed

- README, package description and TypeDoc footer state only what tests and measurements show:
  per-body maximum error vs the committed JPL Horizons fixtures (e.g. Sun 0.31″, Mercury 1.12″,
  Neptune 4.64″, Moon 7.58″) next to the limits CI enforces, zero runtime dependencies and gzip
  size per entry. Removed the "byte-for-byte verified" and Swiss Ephemeris/NASA "verified" claims.
  npm keywords trimmed from 97 to 20.
- Contributor rules (AGENTS.md): regression contract, approval rules and release policy written
  down; the ratchet now also fails any commit that carries an approval tag without an
  `Approved-by:` trailer quoting the approving human.

## [0.5.0] - 2026-10-24

### Changed (output shift)

- **`calculateChart` and `calculatePlanets` now apply ΔT by default.** The birth date and time
  are civil time (UT after the timezone), while the ephemerides are TT-based. Body positions
  (planets, Chiron, asteroids, nodes, Lilith) are now computed at TT = UT + `deltaTAt(jd)`,
  as Swiss Ephemeris' `swe_calc_ut` does. Before, the UT date went into the ephemerides
  unchanged, so every body was placed ΔT (about 69 s today) too early. Houses, angles,
  sidereal time and `chart.calculated` are UT and do not change, and neither does
  `chart.options` (no `deltaT` key is added).
- Each body moves by its own speed × ΔT. For 2026-10-24 12:00 UT (ΔT 69.2 s): Moon +39.7″,
  Sun +2.9″, Venus −1.8″, Mars +1.5″, Jupiter +0.4″, the others (Mercury, Saturn, Uranus,
  Neptune, Pluto, Chiron, Ceres, Pallas, Juno, Vesta) ≤0.8″; Ascendant, MC and cusps 0.
  Over 1900–2100 (200 random charts; ΔT −3 to 110 s) the largest shifts are Moon 62″,
  Mercury 8.6″, Venus 5.6″, Sun 4.6″, Mars 3.2″ and ≤2.4″ for the rest. Before 1900 ΔT grows (14 s in 1800,
  2 min in 1600, 26 min in 1000, 2.9 h in year 0), and so does the shift (Moon about 1′ in
  1600, 1.6° in year 0). Aspect orbs, exact degrees and, near a boundary, signs, aspects and
  patterns can change accordingly.
- Against `swe_calc_ut` (Swiss Ephemeris 2.10.03, mean equinox, 200 random charts 1900–2100),
  the maximum Moon difference falls from 55″ to 11″ (RMS 33″ → 3.5″), and the Sun from
  3.4″ to 1.2″. Mercury, Venus and Mars fall to about 1.4″. The outer planets are unchanged
  (≤5″, model differences).
- Opt out with `deltaT: 0`: it reproduces the 0.4.0 positions bit for bit, and it is the
  way to pass a date that is already TT. A number (seconds) or a function of the UT Julian Date
  still overrides the model.
- The position getters and event searches are unchanged; they take TT, as before. A chart
  now matches `getPosition(body, toTT(jdUT))` and the event instants exactly, without options.

### Added

- `findStations(body, startJD, endJD, options?)` in `celestine/events` finds retrograde and direct
  stations for Mercury through Pluto. A station is a zero of the apparent geocentric longitude
  rate. It uses the same positions and frame as the other event searches: mean equinox of date
  by default, or the true equinox with `{ includeNutation: true }`. Each result has `type`, `jd` (TT), `jdUT`, `longitude`, `sign` and
  `signName` (`StationEvent`). Maximum error vs JPL Horizons over 1900–2100, in either frame
  against a reference in that frame: under 1 min for Mercury and Venus, 1.8–8.1 min for Mars
  through Neptune, 66 min for Pluto, and ≤3.4″ in longitude for all bodies; see the README.
  It shares one station solver with `findStationPoints` (see Changed).
- The station and retrograde-period helpers in `celestine/transits` (`findStationPoints`,
  `findNextStation`, `findRetrogradePeriods`, `getCurrentRetrogradePeriod`,
  `getAllRetrogradePeriods`) take the same optional frame argument (`EventFrameOptions`,
  `{ includeNutation: true }` for the true equinox; `nutation` is the deprecated alias).
  Omitting it keeps the mean equinox of date.
- `celestine/package.json` is exported, so `require('celestine/package.json').version` (or an
  ESM JSON import) reads the installed version.
- `celestine/precise`, an opt-in subpath with `getChironPosition`, `getCeresPosition`,
  `getPallasPosition`, `getJunoPosition` and `getVestaPosition`. They have the same signatures
  and `PlanetPosition` return type as the `celestine/ephemeris` functions, so switching is a
  one-line import change. Each body is a mean orbit plus a compact piecewise Chebyshev fit to
  JPL Horizons.
- Maximum apparent error vs Horizons on held-out epochs, 1800–2200 (2020–2030), with the
  library's nutation: Chiron 0.74″ (0.36″), Ceres 0.93″ (0.71″), Pallas 0.78″ (0.67″),
  Juno 0.83″ (0.51″), Vesta 0.85″ (0.60″).
- This fixes the present-day Pallas and Chiron regressions vs 0.2.1. In 2020–2030 the root
  Pallas is off by up to 2.9° (0.2.1: 1.25°) and the root Chiron by up to 48′ (0.2.1: 23′).
- `PRECISE_RANGE` is JD 2378497–2524594 TT (1800-01-01T12:00 to 2200-01-01T12:00). Outside it,
  and for `NaN`, the functions throw a `RangeError`.
- Each body's data is its own module, so a bundle contains only the bodies it imports. Gzip
  sizes, including the shared pipeline: Chiron 5.5 KB up to Pallas 11.8 KB, all five 30.7 KB.
- TypeDoc now documents `celestine/events`, `celestine/precise` and `celestine/time` next to
  the root. The README has an entry-point table with bundle sizes and a measured accuracy
  table for the precise bodies.
- The root `celestine` export and all other subpaths are unchanged.

### Changed

- Nutation is now one shared, more accurate series: the 13 largest IAU 2000B terms
  (`nutationInLongitude`), within 0.05″ of the full IAU 2000A series for 1800–2200 (0.1″ for
  1000–3000). It replaces the one-term formula behind `includeNutation` (about 2″ off) and the
  four-term series in the event searches (0.35″ off).
- The default frame is unchanged: mean ecliptic and equinox of date, without nutation. The
  new series is verified to leave default positions bit-identical for all 15 bodies (with and
  without speed) and 3,000 charts (with `deltaT: 0`; the chart ΔT default is above).
- With `includeNutation: true`, longitudes shift by up to about 2″. Worst error vs JPL Horizons
  (true equinox of date), before → after: Sun 2.06″ → 0.37″, Mercury 2.33″ → 1.07″,
  Venus 2.15″ → 0.65″, Mars 1.92″ → 1.24″, Jupiter 2.51″ → 1.42″, Saturn 2.68″ → 1.69″,
  Uranus 4.04″ → 3.22″, Neptune 5.74″ → 4.77″, Pluto 4.29″ → 3.29″. The precise bodies
  (1800–2200) improve from 1.98–2.60″ to 0.74–0.93″.
- True-equinox event times (seasons, true-equinox ingresses) move by up to a few seconds
  for the inner bodies. Measured against Horizons, seasons improve from 9.3 s to 7.5 s max and
  Sun ingresses from 9.1 s to 7.1 s. Mean-equinox events (the default) are unchanged.
- Event frames are explicit and tested against the position API: default events use the
  same mean equinox of date as `getPosition` and `calculateChart`, and the events'
  `includeNutation: true` matches the position API's. At every found ingress, aspect, season and void-of-course
  boundary the position API is on target to within 1e-4″. Seasons stay on the true
  equinox (USNO, Meeus); lunar phases and aspects between bodies are frame-free.
- Event searches take `includeNutation`, the position API's name, as their frame option:
  `findSignIngresses`, `findStations`, and new on `findAspectTimes` (it changes results only
  for a fixed target longitude, read in the chosen frame; between bodies the frame cancels)
  and `findVoidOfCourseMoon` (the Moon's ingresses). The shared type is `EventFrameOptions`.
  `nutation`, the 0.4.0 name on `findSignIngresses`, keeps working as a deprecated alias on
  all of them; `includeNutation` wins when both are given. Fixed-longitude aspects measured against
  Horizons: 28.8 s max (mean) and 28.2 s (true).
- Horizons event references are labelled by frame, and each test compares like with like.
  The station references gain `jdMean`/`longitudeMean`, derived the same way (up to 2.7 h from
  the true-equinox instant), so stations are tested in both frames.
  Mean-equinox references (`jdMean`) are derived from the same Horizons samples with IAU
  2000A nutation (ERFA), independent of the library. Ingress tests now bound the implied
  longitude error per body, in both frames (for example Jupiter 1.35″ and Saturn 0.8″,
  inside their position budgets), instead of a time that is unbounded near a station; the
  Mercury aspect time limit tightens from 100 s to 60 s.
- One station solver for the library. `findStations` (events), `findStationPoints` (transits)
  and the rate-reversal split inside every event search share it: the longitude rate is
  sampled at about a fifth of each body's shortest gap between stations, and every sign change
  is solved to 1e-7 day by regula falsi alternating with bisection. For Mercury through Pluto,
  `findStationPoints` now returns exactly the default-frame `findStations` instants. Its
  public API, `StationPoint` shape and Chiron support are unchanged, and empty or invalid
  ranges still return `[]`.
- `findStationPoints` is more accurate, so its instants change. Before, it bisected with a
  0.001°/day speed threshold and stopped early, leaving up to 1.0–3.6″/day of residual rate.
  Over 1900–2100 that put instants up to 18 min (Mercury), 37 min (Venus), 1.9 h (Mars) and
  0.3–2.8 days (Jupiter 0.3, Saturn 0.6, Pluto 2.8; Chiron 1.1) from its own speed's zero.
  Now the residual rate is below 1e-4″/day for every body.
  Against mean-equinox Horizons references (`jdMean`; searching ±200 days around each of the
  160 stations, since the old result depended on the search window), the maximum error falls
  from 2.3 to 0.8 min (Mercury), 23 to 0.4 min (Venus), 1.9 h to 1.9 min (Mars), 1.7 h to
  4.8 min (Jupiter), 12.6 h to 4.6 min (Saturn), 13.4 h to 1.8 min (Uranus), 13.4 h to
  4.3 min (Neptune) and 13.8 h to 63 min (Pluto). It also no longer misses a station in the
  last partial step of the range: one Uranus station on 2100-12-26 was missing in 1900–2100.
  The perf-gated 180-day Mercury search costs about the same as before.
- `findRetrogradePeriods`, `findNextStation`, `getCurrentRetrogradePeriod` and
  `getAllRetrogradePeriods` use these stations, so they return the `findStations` instants in
  either frame. `getCurrentRetrogradePeriod` decides "retrograde now" from the same stations
  (the latest one before `jd` is a station retrograde) instead of a separate speed sign, so it
  agrees with `findRetrogradePeriods` right up to the station instants. On Cosmolytic Studio's 17 Horizons stations for 2026–2027 (true equinox, UT to
  the minute), `findRetrogradePeriods` was off by up to 18 min (Mercury), 33 min (Venus),
  93 min (Mars), 4.3 h (Jupiter) and 6.5 h (Saturn) in 0.4.0. With `{ includeNutation: true }`
  it is now within 0.7, 0.9, 0.4, 2.5 and 4.3 min. That beats symmetric differences of
  mean-equinox longitudes (12 and 33 min for Jupiter and Saturn), because the frame dominates
  for slow planets. The default mean frame gives the same 12 and 33 min, which is correct for
  that frame. These references are now a test fixture.
- Planet, Sun and precise-body positions are about 8–22% faster: the apparent-place pipeline no
  longer builds intermediate objects by spreading them. Output is bit-identical.

### Fixed

- `getMoonPosition` now honours `includeNutation`. Before, it silently returned the
  mean-equinox longitude.
- `getPosition` now honours `includeNutation` for the lunar nodes and Lilith (mean and true).
  Before, they stayed mean-equinox, so a true-equinox node or Lilith ingress was up to
  about 18″ off the cusp in the position API. Default output is unchanged.
- `calculateChart` now computes the aspect types requested in `options.aspectTypes`, including
  minor and Kepler aspects. Before, it detected only the major aspects and then filtered them, so
  a requested quincunx (and any pattern that needs one, such as a Yod) never appeared.
- Minor aspects use the existing `DEFAULT_ORBS` (2°, quincunx 3°, Kepler aspects 1°) unless
  `aspectOrbs` overrides them.
- When `aspectTypes` is omitted or an empty array, the output is unchanged (major aspects only).
  This is verified to be bit-identical over 2,500 seeded charts.

## [0.4.0] - 2026-10-24

### Added

- `celestine/events` subpath (subpath-only; not re-exported from the root, so root bundles are
  unchanged): `findSignIngresses`, `findLunarPhases`, `getMoonPhase`, `findSeasons`,
  `findAspectTimes` and `findVoidOfCourseMoon` — sign ingresses, principal lunar
  phases, lunar illumination, true-equinox seasons, exact aspects and traditional
  void-of-course Moon periods. Inputs are TT Julian Dates (convert with `toTT`). Single imports
  tree-shake (esbuild, gzip: `findSeasons` ~4.5 KB, `findLunarPhases` ~5.5 KB); CommonJS
  `require('celestine/events')` is supported. Shared station-aware angular search, TT/UT outputs,
  independent USNO/Horizons reference fixtures and reproducible benchmarks.
  True-equinox searches use a four-term nutation series; TT error vs Horizons is
  ≤14.6 s for phases, seasons and Sun/Moon ingresses, and ≤50 s vs USNO UT wherever ΔT is observed.
- `time.deltaTAt`, `toTT` and `toUT` (also root named exports; ΔT = TT − UT seconds for a UT
  Julian Date). JD-based UT/TT conversion includes an iterative inverse. Ephemeris and event
  inputs are TT: use `getSunPosition(toTT(toJulianDate(...)))`.
- Opt-in chart and `calculatePlanets` `deltaT` correction (seconds or a function
  of UT JD), with houses and angles remaining on UT. Defaults are unchanged.

### Changed

- ΔT now interpolates USNO observations from 1800 through October 2026,
  retaining the original pre-1800 NASA/Espenak–Meeus polynomials with a minimal
  continuity taper. After October 2026 a cubic continues the last observed value and
  slope (0.2 s/yr; IERS Bulletin A predicts ~0.18 s/yr) to the Stephenson–Morrison–Hohenkerk
  (2016) parabola at 2800 (Skyfield's approach): ~76.5 s in 2050 and ~110 s in 2100.
  Within 0.12 s of IERS Bulletin A (to 2027-10) and 0.43 s of USNO `deltat.preds`
  (to 2033.75); event UT vs USNO tables stays ≤60 s through 2100.
  Max/RMS errors against USNO rows (seconds): 1800–1899: 1.347/0.462;
  1900–1954: 0.320/0.104; 1955–2026: 0.104/0.034. Before 1800, the older
  USNO authority disagrees with NASA/Morrison & Stephenson (2004); we follow NASA.

## [0.3.0] - 2026-10-24

### Fixed

- Planet positions: the Sun, Mercury–Neptune, Pluto, Chiron and the asteroids now share one
  apparent-place pipeline (one audited VSOP87D Earth series, light-time, direction-dependent
  annual aberration, precession where needed). Corrupted VSOP87 coefficients were repaired
  (Mercury L1/R1/L2/L4, Mars B2/R0/L2/R1, Saturn L1, Jupiter L4, and the Earth L2 constant
  every planet previously used), and Pluto no longer mixes J2000 with equinox-of-date
  coordinates. Maximum longitude error against JPL Horizons, 1800–2200 (Pluto 1885–2099):
  Sun 0.31″, Mercury 1.12″, Venus 0.58″, Mars 1.18″, Jupiter 1.36″, Saturn 1.66″,
  Uranus 3.35″, Neptune 4.65″, Pluto 3.17″ (previously 26″–53″, Mercury ~2°, Pluto ~1.6°).
- Moon latitude: added ELP2000-82 harmonics; maximum error 3.4″ → 1.3″. Longitude unchanged.
- Asteroids: Ceres, Pallas, Juno and Vesta use least-squares mean elements (fit to JPL Horizons
  heliocentric ecliptic-J2000 vectors, 1800–2200) instead of osculating J2000 elements. Apparent
  position error vs JPL Horizons on held-out epochs, max/RMS in arcminutes, 0.2.1 → 0.3.0:
  2000–2050: Ceres 99/32 → 41/14, Pallas 220/86 → 175/41, Juno 458/115 → 102/22,
  Vesta 57/17 → 39/9; 1800–2200: Ceres 683/206 → 80/25, Pallas 1527/410 → 267/64,
  Juno 2716/500 → 156/40, Vesta 148/42 → 57/15. Remaining error is mostly Jupiter perturbations.
- `longitudeSpeed`/`isRetrograde` for all bodies except the Moon use a centered derivative;
  some bodies previously used a one-day forward difference, which shifted stations by about
  half a day.

### Changed

- `findPatterns` (and so `calculateChart`) is about 4× faster: Grand Trines are found once
  and reused for Kites, and the triangle search skips body pairs without a trine
  (findPatterns 138 → 34 µs, calculateChart 357 → 251 µs on 400 varied charts). Output is
  unchanged, including pattern order and fields; a seeded differential test compares every
  detector with the previous implementation on 2,500 charts and 3,000 synthetic aspect lists.
- Packaging: the ESM build preserves the module graph (per-module `.d.ts`), the package is marked
  `sideEffects: false`, and sourcemaps are no longer shipped (they pointed at unshipped sources).
  Single imports are now cheap, e.g. `import { toJulianDate } from 'celestine'` bundles to
  ~0.4 KB gzipped instead of the whole library; `celestine/ephemeris` `getMercuryPosition` ~4.2 KB.
  With esbuild, namespace access through the root (`ephemeris.getMercuryPosition`) still pulls the
  whole ephemeris module (~25 KB gz); use the subpath or rollup/Vite for minimal bundles.
  Packed npm size 793 kB → 366 kB. CommonJS `require('celestine')` is unchanged.
- Snapshot public API paths and resolved types independently of declaration bundler names.
- Output shift notice (default options, measured against 0.2.1 over 1800–2100): Mercury
  longitudes change by up to 3.25° for 1800-era dates (2020s: median 5′, max 27′); Pluto by up
  to 2.85° (2020s: ~21–26′); Sun, Venus–Neptune by under 1′; Moon latitude by up to 3.1″.
  Chiron and the asteroids now use the correct of-date frame. Chiron shifts by up to 3.07°;
  its Keplerian model still has degree-scale errors away from its epoch and for present-day
  dates is *less* accurate than in 0.2.1 (e.g. 9′ → 32′ in 2026 vs JPL Horizons), because the old
  frame bug happened to cancel part of the Keplerian drift. Ceres, Pallas, Juno and Vesta now use
  mean elements fitted to Horizons over 1800–2200 instead of osculating J2000 elements (the
  exported `*_ORBITAL_ELEMENTS` values change accordingly) and shift by up to 11° (Ceres),
  41° (Pallas), 48° (Juno) and 2.1° (Vesta) over 1800–2100 (2020s: 62′, 264′, 247′, 27′).
  Ceres, Juno and Vesta are more accurate than in 0.2.1 in every tested window (2020–2030 RMS vs
  Horizons: Ceres 31′ → 12′, Juno 80′ → 14′, Vesta 26′ → 15′); Pallas is better over 2000–2050
  and 1800–2200 (see Fixed) but worse for 2020–2030 (RMS 36′ → 70′, max 75′ → 175′).
  Station times may move by 12–42 h; sign/house placements and retrograde
  flags near boundaries and stations may change.
- `includeNutation: true` is now honored by every body except the Moon (unchanged); the default
  (mean equinox of date, no nutation) is unchanged.
- Node >=20 required; CI tests Node 20, 22 and 24.

### Added

- Typed ESM/CommonJS subpath exports for ephemeris, time, zodiac, aspects, transits, chart,
  houses, and progressions; consumer packaging and bundle-size checks.
- Horizons fixture regression suite (1800–2200; 1,424 epochs incl. Chiron) and guardrail gates
  via `npm run check`.
- Visible regression budgets in `budgets.json`, public API snapshot, and agent contract in
  `AGENTS.md`.

## [0.2.1] - 2026-01-01

### Changed

- Updated package description, README, and documentation links to highlight the live demo.

## [0.2.0] - 2025-12-19

### Added

- Expanded astrology calculations and public APIs, including progressions, transit searches,
  chart analysis, and aspect patterns.

### Fixed

- Progressions type interfaces.
