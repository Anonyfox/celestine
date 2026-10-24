# Changelog

All notable changes to this project are documented here, following
[Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/) and
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
