# Celestine

[![npm version](https://img.shields.io/npm/v/celestine.svg?style=flat-square)](https://www.npmjs.com/package/celestine)
[![npm downloads](https://img.shields.io/npm/dm/celestine.svg?style=flat-square)](https://www.npmjs.com/package/celestine)
[![CI](https://img.shields.io/github/actions/workflow/status/Anonyfox/celestine/ci.yml?branch=main&label=CI&style=flat-square)](https://github.com/Anonyfox/celestine/actions/workflows/ci.yml)
[![Documentation](https://img.shields.io/badge/docs-live-brightgreen?style=flat-square)](https://anonyfox.github.io/celestine)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-green?style=flat-square&logo=node.js)](https://nodejs.org/)
[![Live Demo](https://img.shields.io/badge/demo-cosmolytic.com-7c3aed?style=flat-square)](https://cosmolytic.com)

Astrology and astronomy engine in TypeScript for charts, houses, aspects, transits,
stations, progressions, and events. MIT licensed, with zero runtime dependencies
and the same calculation results in browsers and Node.

Used by [Cosmolytic](https://cosmolytic.com).

## Precision

The [accuracy page](https://anonyfox.github.io/celestine/accuracy/) lists residuals against Horizons, the NASA eclipse canon, ERFA and USNO, regenerated on every docs deploy by `npm run bench:accuracy`.

Measured against committed [JPL Horizons fixtures](src/ephemeris/__fixtures__/horizons)
using `node --import tsx scripts/horizons/measure.ts`. Values below are sampled
maximum absolute errors, rounded to milliarcseconds, not guarantees between samples.
Longitude differences wrap at the circle boundary. Coordinates are geocentric,
mean ecliptic/equinox of date; input times are TT.

| Body | Fixture dates (TT) | Samples | Max longitude / latitude error (″) | CI longitude / latitude limit (″) |
|---|---|---:|---:|---:|
| Sun | 1800-01-01 – 2200-01-01 | 123 | 0.305 / 0.148 | 0.4 / 0.2 |
| Moon | 1900-01-01 – 2100-01-01 | 123 | 7.583 / 1.285 | 8 / 1.6 |
| Mercury | 1800-01-01 – 2200-01-01 | 176 | 1.119 / 0.722 | 1.4 / 0.9 |
| Venus | 1800-01-01 – 2200-01-01 | 148 | 0.579 / 0.439 | 0.7 / 0.55 |
| Mars | 1800-01-01 – 2200-01-01 | 148 | 1.173 / 0.682 | 1.4 / 0.85 |
| Jupiter | 1800-01-01 – 2200-01-01 | 123 | 1.357 / 0.636 | 1.7 / 0.8 |
| Saturn | 1800-01-01 – 2200-01-01 | 123 | 1.658 / 1.033 | 2 / 1.3 |
| Uranus | 1800-01-01 – 2200-01-01 | 123 | 3.342 / 0.662 | 4 / 0.8 |
| Neptune | 1800-01-02 – 2199-12-29 | 123 | 4.643 / 0.359 | 5.6 / 0.45 |
| Pluto | 1885-01-01 – 2099-01-01 | 91 | 3.162 / 0.350 | 3.8 / 0.45 |
| Chiron | 1950-01-01 – 2050-01-01 | 123 | 19805.700 / 2201.199 | 24000 / 2700 |

CI enforces the separate bounds in [`budgets.json` → `precision`](budgets.json),
including minimum sample counts equal to those shown here. The
[precision test](src/ephemeris/horizons-fixtures.test.ts) also retains an independent
frame cross-check. These fixtures do not cover every body or feature.

Default Chiron uses a Keplerian model: its measured maximum longitude error is
19805.700″ (about 5.50°) on the dates above. Use
[`celestine/precise`](#precise-small-bodies) for arcsecond work over 1800–2200.
Default asteroids also use Keplerian approximations with degree-level errors;
planetary precision figures do not apply to them. `celestine/events` uses the
shared precise Chiron model within that range (with a 0.001-day speed margin),
falling back to root Chiron outside. On 189 independent Horizons observer samples
in 1900–2100, event Chiron longitude differs by at most 0.60″; root is unchanged.

## Installation

```sh
npm install celestine
```

## Quick start

```ts
import { calculateChart, ephemeris, time, zodiac } from 'celestine';

const birth = {
  year: 2000, month: 1, day: 1, hour: 12, minute: 0, second: 0,
  timezone: 0, latitude: 51.5074, longitude: -0.1278,
};
const jdUT = time.toJulianDate(birth);
const sun = ephemeris.getSunPosition(time.toTT(jdUT));
console.log(jdUT); // 2451545
console.log(zodiac.eclipticToZodiac(sun.longitude).signName); // Capricorn
const chart = calculateChart(birth, { houseSystem: 'placidus' });
console.log(chart.planets.find((planet) => planet.name === 'Sun')?.signName); // Capricorn
```

See the [module guide](docs/GUIDE.md), [comparison](docs/COMPARISON.md), and
[API documentation](https://anonyfox.github.io/celestine).
Runnable integrations: [Node CLI](examples/node-cli.mjs),
[browser natal chart](examples/browser-natal-chart.html), and
[Cloudflare Worker](examples/cloudflare-worker.ts).

## Entry points

ESM and CommonJS exports include TypeScript declarations. Import individual
modules through subpaths for smaller bundles. With esbuild, root namespace member
access can retain the whole module; other bundlers may shake it differently.

| Entry point | Contents | Minified bytes | Gzip bytes |
|---|---|---:|---:|
| `celestine` | Root modules (excludes events and precise) | 173,189 | 59,008 |
| `celestine/ephemeris` | Positions, nodes, Lilith, lots, small bodies | 61,935 | 24,623 |
| `celestine/time` | Julian dates, ΔT, sidereal time | 5,502 | 2,571 |
| `celestine/zodiac` | Signs, dignities, formatting | 5,877 | 2,218 |
| `celestine/aspects` | Aspect detection and patterns | 12,089 | 3,900 |
| `celestine/houses` | House systems and angles | 9,171 | 3,616 |
| `celestine/chart` | Birth charts | 96,130 | 35,946 |
| `celestine/transits` | Transits, ingresses, stations | 78,441 | 30,466 |
| `celestine/progressions` | Progressions and solar arc | 71,088 | 28,993 |
| `celestine/events` | Event searches | 60,136 | 24,546 |
| `celestine/precise` | Opt-in small-body models | 43,517 | 30,715 |

Measured after `npm run build` with esbuild using the neutral-platform, minified
ESM options in [the size guard](scripts/guard/entries.mjs), exporting every symbol
from each listed entry point. Gzip uses fflate at level 9. Actual applications
retain different exports; `node scripts/guard/size.mjs` checks representative
consumer bundles against budgets, rather than these whole-module exports.

## Precise small bodies

`celestine/precise` supplies opt-in Chiron, Ceres, Pallas, Juno, and Vesta getters
with the same signatures and return shapes as their default counterparts. Its
Chebyshev tables are separate from root imports.

The [held-out tests](src/precise/precise.test.ts) check apparent angular error
below 1″ against Horizons at 400 epochs over 1800–2200, with additional sets of
100 epochs over 2000–2050 and 60 over 2020–2030, per body. They also check the
heliocentric model against held-out vectors, speed consistency, segment
continuity, and range errors. These are sampled checks, not a continuous accuracy
guarantee. Inputs outside the supported range throw `RangeError`.

See [precise usage](docs/GUIDE.md#precise-small-bodies).

## Time scales and frames

`time.toJulianDate` returns **UT**. Ephemeris getters and event searches take
**TT**: use `time.toTT(jdUT)` and convert results back with `time.toUT(jdTT)`.
The default position frame is **mean ecliptic/equinox of date**;
`includeNutation: true` selects true equinox of date.

Charts accept civil birth times, apply ΔT to body positions by default, and keep
houses, angles, and sidereal time on UT. The `deltaT` chart option accepts seconds
or a function of UT JD; `deltaT: 0` restores the earlier UT-as-ephemeris-time
behavior. See the [chart time-scale tests](src/chart/delta-t.test.ts).

The built-in ΔT model uses historical observations and extrapolation; future
values carry uncertainty. See the [ΔT reference notes](src/time/__fixtures__/delta-t/README.md).
Match time scale, frame, observer settings, and apparent/geometric conventions
before comparing with another ephemeris.

Swiss Ephemeris, astro.com and almanacs use the true equinox: pass
`includeNutation: true` to match them (Sun ingresses otherwise differ by a few
minutes). `findVoidOfCourseMoon` defaults to the traditional partners Sun through
Saturn; pass `{ bodies: [...] }` with Uranus, Neptune and Pluto for the modern
convention most apps use. More in the [guide's pitfalls](docs/GUIDE.md#pitfalls).

## Contributing and security

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup and regression checks,
[SECURITY.md](SECURITY.md) for private vulnerability reporting, and
[AGENTS.md](AGENTS.md) for the regression contract.

[MIT license](LICENSE) · [Sponsor development](https://github.com/sponsors/Anonyfox)
