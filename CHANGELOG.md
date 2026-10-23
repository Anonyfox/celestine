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
- `longitudeSpeed`/`isRetrograde` for all bodies except the Moon use a centered derivative;
  some bodies previously used a one-day forward difference, which shifted stations by about
  half a day.

### Changed

- Packaging: the ESM build preserves the module graph (per-module `.d.ts`), the package is marked
  `sideEffects: false`, and sourcemaps are no longer shipped (they pointed at unshipped sources).
  Single imports are now cheap, e.g. `import { toJulianDate } from 'celestine'` bundles to
  ~0.4 KB gzipped instead of the whole library; `celestine/ephemeris` `getMercuryPosition` ~4.2 KB.
  With esbuild, namespace access through the root (`ephemeris.getMercuryPosition`) still pulls the
  whole ephemeris module (~25 KB gz); use the subpath or rollup/Vite for minimal bundles.
  Packed npm size 793 kB → 366 kB. CommonJS `require('celestine')` is unchanged.
- Snapshot public API paths and resolved types independently of declaration bundler names.

- Output shift notice (default options): Mercury longitudes change by up to ~3° for
  1800-era dates and by up to tens of arcminutes in the 20th/21st century; Pluto by up to
  ~1.6°; Sun, Venus–Neptune by up to 30″–53″; Moon latitude by up to 3.1″. Chiron shifts by
  up to 0.77° (frame correction); its Keplerian model still has degree-scale errors away from
  J2000. Sign/house placements and retrograde flags near boundaries and stations may change.
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
