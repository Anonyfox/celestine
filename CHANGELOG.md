# Changelog

All notable changes to this project are documented here, following
[Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/) and
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

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
- Default output is unchanged. It is mean ecliptic and equinox of date and does not use
  nutation; this is verified bit-identical for all 15 bodies (with and without speed) and
  3,000 charts.
- With `includeNutation: true`, longitudes shift by up to about 2″. Worst error vs JPL Horizons
  (true equinox of date), before → after: Sun 2.06″ → 0.37″, Mercury 2.33″ → 1.07″,
  Venus 2.15″ → 0.65″, Mars 1.92″ → 1.24″, Jupiter 2.51″ → 1.42″, Saturn 2.68″ → 1.69″,
  Uranus 4.04″ → 3.22″, Neptune 5.74″ → 4.77″, Pluto 4.29″ → 3.29″. The precise bodies
  (1800–2200) improve from 1.98–2.60″ to 0.74–0.93″.
- True-equinox event times (seasons, `nutation: true` ingresses) move by up to a few seconds
  for the inner bodies. Measured against Horizons, seasons improve from 9.3 s to 7.5 s max and
  Sun ingresses from 9.1 s to 7.1 s. Mean-equinox events (the default) are unchanged.
- Event frames are explicit and tested against the position API: default events use the
  same mean equinox of date as `getPosition` and `calculateChart`, and `nutation: true`
  matches `includeNutation: true`. At every found ingress, aspect, season and void-of-course
  boundary the position API is on target to within 1e-4″. Seasons stay on the true
  equinox (USNO, Meeus); lunar phases and aspects between bodies are frame-free.
- Horizons event references are labelled by frame, and each test compares like with like.
  Mean-equinox references (`jdMean`) are derived from the same Horizons samples with IAU
  2000A nutation (ERFA), independent of the library. Ingress tests now bound the implied
  longitude error per body, in both frames (for example Jupiter 1.35″ and Saturn 0.8″,
  inside their position budgets), instead of a time that is unbounded near a station; the
  Mercury aspect time limit tightens from 100 s to 60 s.
- Planet, Sun and precise-body positions are about 8–22% faster: the apparent-place pipeline no
  longer builds intermediate objects by spreading them. Output is bit-identical.

### Fixed

- `getMoonPosition` now honours `includeNutation`. Before, it silently returned the
  mean-equinox longitude.
- `getPosition` now honours `includeNutation` for the lunar nodes and Lilith (mean and true).
  Before, they stayed mean-equinox, so a `nutation: true` node or Lilith ingress was up to
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
