# Changelog

All notable changes to this project are documented here, following
[Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/) and
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- Shared Earth-of-date ephemeris for the Sun, planets, Chiron, and asteroids;
  repaired VSOP87D coefficients and applied light-time and directional annual
  aberration consistently. On expanded Horizons samples, maximum longitude errors
  are Sun 0.31″, Mercury 1.12″, Venus 0.58″, Mars 1.18″, Jupiter 1.36″,
  Saturn 1.66″, Uranus 3.35″, Neptune 4.65″, and Pluto 3.17″.
- Moon latitude: added published ELP2000-82 harmonics to the existing Meeus table,
  reducing expanded-sample maximum error from 3.38″ to 1.29″.

- Mercury longitude: repaired corrupted VSOP87 L1/R1/L2/L4 terms and the Earth L2 constant;
  applied light-time and direction-dependent aberration. Now ≤ ~5″ against JPL Horizons
  over 1800–2200 (previously up to ~2–3°).
- Pluto: corrected mixing of J2000 and Earth-of-date frames with precession, light-time,
  and aberration. Now ≤ ~3″ against Horizons over 1885–2099 (previously up to ~1.6°).

### Changed

- Stage A output shifts on the expanded fixtures (maximum longitude): Sun 30″,
  Mercury 3″, Venus 38″, Mars 31″, Jupiter 46″, Saturn 53″, Uranus 42″,
  Neptune 38″, Pluto 0.11″; Moon latitude shifts by up to 3.1″, longitude unchanged.
  Chiron shifts by up to 0.77° after J2000-to-date frame correction; its retained
  Keplerian approximation still has degree-scale errors over 1950–2050.
  Asteroids also gain precession, shared Earth, light-time, and aberration.
- The shared pipeline now honors opt-in `includeNutation` using the existing
  approximation; defaults remain mean equinox of date. Moon options are unchanged.

- Output shift notice: Mercury longitudes change by up to ~3° for 1800-era dates and by
  sub-arcminute amounts to tens of arcminutes in the 20th/21st century. Pluto changes by
  up to ~1.6°. Sign and house placements near boundaries may change.
- Node >=20 required; CI tests Node 20, 22, and 24.

### Added

- Horizons fixture regression suite and guardrail gates via `npm run check`.
- Visible regression budgets in `budgets.json`, public API snapshot, and agent contract in `AGENTS.md`.

## [0.2.1] - 2026-01-01

### Changed

- Updated package description, README, and documentation links to highlight the live demo.

## [0.2.0] - 2025-12-19

### Added

- Expanded astrology calculations and public APIs, including progressions, transit searches,
  chart analysis, and aspect patterns.

### Fixed

- Progressions type interfaces.
