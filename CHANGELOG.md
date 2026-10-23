# Changelog

All notable changes to this project are documented here, following
[Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/) and
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- Mercury longitude: repaired corrupted VSOP87 L1/R1/L2/L4 terms and the Earth L2 constant;
  applied light-time and direction-dependent aberration. Now ≤ ~5″ against JPL Horizons
  over 1800–2200 (previously up to ~2–3°).
- Pluto: corrected mixing of J2000 and Earth-of-date frames with precession, light-time,
  and aberration. Now ≤ ~3″ against Horizons over 1885–2099 (previously up to ~1.6°).

### Changed

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
