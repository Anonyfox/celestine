# Event reference data

Retrieved **2026-10-24**. These are development fixtures, excluded from the published package.
No prior ephemeris/Horizons fixtures were changed. No reference times are library-generated:
library predictions choose the request windows; independent source longitudes determine crossings.

## Reproduction and provenance

Run `node scripts/events/fetch-usno.mjs`, then `npm run build` and
`node scripts/events/fetch-horizons.mjs`. Retrieval is sequential, with 250 ms (USNO)
or 300 ms (Horizons) pauses, curl retries including transient TLS errors, and persisted caches.
USNO resumes completed years; remove the **new events** fixture files to force fresh retrieval.
Horizons caches requests by URL SHA-256 prefix; remove `requests/` to re-fetch them.
`node scripts/events/measure.mjs` prints measured errors without updating limits or references.

- [USNO phases](https://aa.usno.navy.mil/api/moon/phases/year?year=2000):
  `https://aa.usno.navy.mil/api/moon/phases/year?year=YYYY`, every integer year **1900–2100 inclusive**.
  `usno-phases.json` maps year to rows `[jdUT, phaseIndex]`; index 0/1/2/3 means
  new moon/first quarter/full moon/last quarter. UT minute-rounded source times (±30 s).
  All **9,945** events are tested one-to-one; chronological types and counts must match exactly.
- [USNO seasons](https://aa.usno.navy.mil/api/seasons?year=2000):
  `https://aa.usno.navy.mil/api/seasons?year=YYYY`, same 201 years, default timezone 0, no DST.
  `usno-seasons.json` rows `[jdUT, seasonIndex]` retain only Equinox/Solstice entries;
  index 0/1/2/3 means March/June/September/December. UT minute-rounded (±30 s).
  All **804** events are tested one-to-one. Perihelion/aphelion are excluded.
- [JPL Horizons API](https://ssd.jpl.nasa.gov/api/horizons.api): exact parameters and returned
  CSV columns for every request are stored in `requests/*.json`. Parameters are
  `format=json`, `EPHEM_TYPE='OBSERVER'`, `CENTER='500@399'`, `QUANTITIES='31'`,
  `TIME_TYPE='TT'`, `TLIST_TYPE='JD'`, `CSV_FORMAT='YES'`, `REF_SYSTEM='ICRF'`,
  `EXTRA_PREC='YES'`, `APPARENT='AIRLESS'`; `TLIST` contains explicit TT JDs to nine decimals.
  `COMMAND` is Sun=10, Moon=301, Mercury=199, Venus=299, Mars=499, Jupiter=599,
  Saturn=699, Uranus=799, Neptune=899, Pluto=999. Values are single-quoted in requests
  except `format`. Response columns are calendar **TT**, two blank flags,
  apparent ObsEcLon/ObsEcLat in degrees, trailing blank.
- `horizons-events.json`: **64 phases, 44 seasons, 120 distinct sign ingresses (12 per
  classic body), 48 distinct aspects**. Fields: `predicted` (library TT JD used ONLY to
  center the grid), `jd` (independent linearly interpolated Horizons TT JD), `step` (TT days),
  `bracket=[t0,t1,residual0,residual1]` (TT JDs and signed degrees), `angle` (oriented
  degrees), `body`, optional `targetBody` or `fixed` (fixed mean-equinox longitude), and
  event metadata. Seventeen evenly spaced epochs surround each prediction. Tests and `measure.mjs` search ±0.2 day around each reference `jd`. Steps are
  one minute for Sun/Moon, otherwise 3 arcseconds divided by speed, capped at 0.1 day.
  Linear interpolation of the bracketing *source* residuals determines `jd`.
  Phases sample four successive events in 16 years spread across 1900–2100;
  seasons sample four events every 20 years. Ingress samples span the whole interval,
  with two explicitly selected retrograde re-entries per planet. Aspects include Moon–Mars,
  Moon–Jupiter, Sun–Saturn, Mars–Saturn, Jupiter–Saturn Mercury–Saturn, and Mercury to fixed 45°;
  three additional Mercury passes at 45° in April–May 2023 are marked `triplePass`. Three Mercury–Saturn sextiles across the same retrograde
  are marked `triplePassMoving`.
  Both moving-body Horizons longitudes have the same nutation, which cancels;
  fixed mean-equinox comparisons subtract library nutation from Horizons longitude.
- `illumination.json`: 51 uniformly spaced TT epochs over 1900–2100, rows
  `[jdTT, illuminatedFraction]`. Same Horizons parameters except `COMMAND='301'`,
  `QUANTITIES='10'`; response column 3 is illuminated percent, divided by 100.

## Empirical frame check

`frame.json` records three Sun epochs and independent Horizons longitude: TT JD 2415020,
2451545 and 2488070. Mean-equinox residuals were −17.258, +14.087, −3.031 arcseconds;
adding the dominant nutation term reduced these to −0.363, +0.005, −0.314 arcseconds,
the four-term series events used until 0.4 to +0.156, +0.056, +0.232, and the shared
13-term IAU 2000B series (`nutationInLongitude`, within 0.05″ of IAU 2000A for 1800–2200,
used everywhere since 0.5) to +0.084, +0.170, +0.239; the residual is mostly the Sun model.
The four-term series halved season errors (19.5 → 9.3 s) and Sun ingress errors
(35 → 9 s); the IAU 2000B series took them to 7.5 s and 7.1 s. Jupiter and Saturn ingress
maxima rose (266 → 333 s, 586 → 642 s): their worst crossings are near stations, where a
≈0.1″ frame shift moves the time by minutes. Their position errors at the crossing stay
within 0.52″ and 0.73″, inside the planetary model's own error.
Thus ObsEcLon is empirically **true-equinox of date**. Ingress references use
`nutation:true`; season searches always use true-equinox longitude. Default ingress
longitudes remain the library's mean-equinox values. The existing independent
vector/frame cross-check in the ephemeris tests remains unchanged.

## Measured timing errors

Seconds; max is absolute; RMS uses all samples. USNO is compared using `jdUT`;
Horizons uses `jd` on **TT**, never UTC. Limits in tests are rounded upward from these
measurements, not limits borrowed from a different time scale or positional budget.

| Source / event / scale | Samples | Max (s) | RMS (s) |
|---|---:|---:|---:|
| USNO phases UT | 9945 | 59.657 | 21.411 |
| USNO seasons UT | 804 | 42.479 | 18.929 |
| Horizons phase Moon TT | 64 | 14.531 | 5.551 |
| Horizons season Sun TT | 44 | 7.506 | 3.913 |
| Horizons ingress Sun TT | 12 | 7.121 | 4.045 |
| Horizons ingress Moon TT | 12 | 10.925 | 5.881 |
| Horizons ingress Mercury TT | 12 | 6.069 | 3.092 |
| Horizons ingress Venus TT | 12 | 133.884 | 49.254 |
| Horizons ingress Mars TT | 12 | 94.222 | 29.095 |
| Horizons ingress Jupiter TT | 12 | 333.455 | 135.901 |
| Horizons ingress Saturn TT | 12 | 642.367 | 207.322 |
| Horizons ingress Uranus TT | 12 | 1300.786 | 580.075 |
| Horizons ingress Neptune TT | 12 | 2496.650 | 1376.983 |
| Horizons ingress Pluto TT | 12 | 10699.601 | 3842.188 |
| Horizons aspect Moon TT | 14 | 7.982 | 3.735 |
| Horizons aspect Sun TT | 7 | 17.167 | 12.165 |
| Horizons aspect Mars TT | 7 | 65.333 | 31.415 |
| Horizons aspect Jupiter TT | 7 | 369.214 | 157.592 |
| Horizons aspect Mercury TT | 13 | 89.890 | 38.333 |

Illumination fraction max/RMS: **0.000036798 / 0.000017788** (51 epochs; unitless).
This is disk illumination, not a longitude-only approximation.

USNO UT max / RMS / mean by era (seconds; source minute rounding alone is ±30 s, ~17 s RMS):

| Years | ΔT | Phases | Seasons |
|---|---|---:|---:|
| 1900–1949 | observed | 49.2 / 18.9 / +0.8 | 39.6 / 19.2 / +1.8 |
| 1950–2025 | observed | 50.0 / 18.8 / +1.6 | 36.5 / 17.7 / −0.7 |
| 2026–2050 | extrapolated | 55.4 / 24.8 / +17.2 | 46.7 / 20.9 / +10.3 |
| 2051–2075 | extrapolated | 59.7 / 27.4 / +20.6 | 45.7 / 21.3 / +13.9 |
| 2076–2100 | extrapolated | 56.6 / 23.1 / +14.3 | 41.5 / 18.8 / +6.2 |

With observed ΔT every event is within 50 s and unbiased: minute rounding plus the
≤15 s TT error measured against Horizons. After 2026 the bias comes only from ΔT
extrapolation. Averaging (TT − USNO UT) per year implies USNO uses ΔT ≈ 95 s in 2050
and ≈ 115 s in 2100; `toUT` now gives 76.5 s and 109.5 s (Bulletin A slope joined to
the SMH 2016 parabola; previously a Morrison–Stephenson 2004 trend gave 87 s and 200 s). Both are defensible
predictions; Earth rotation beyond a few years is not predictable to a minute.

Planet timing is ill-conditioned near stations: time error is approximately
longitude error divided by instantaneous speed. Limits are per body; notably
Pluto's sampled maximum is about 3 hours (re-entry near a station, 0.0045°/day)
  from a 2.05″ longitude error; every Pluto event's implied longitude error
  (time error × speed) is ≤3.4″, matching Pluto's documented ephemeris accuracy.
Asteroids, Chiron, nodes and Lilith are supported and have invariant tests, but
have **no independent event-time accuracy claim** here. Sampling assumes at most
one relative-motion reversal per step; nearly degenerate pairs of relative stations
closer than a step cannot be guaranteed. Root isolation is tested with two crossings
inside one sampling interval and real retrograde triple passes.

VOC uses these same primitives. An independent ten-minute brute-force scan over
three months verifies the last aspect, partner and angle, with start times within
2 seconds; tests also verify ordering, overlap, empty-partner whole-sign stays,
and ingress endpoints. All 201 USNO years are checked; none are sampled away.

## Bundle size and local timings

Reproduce after build with `node scripts/bench/events-size.mjs` and
`node scripts/bench/events-bench.mjs`. Bundle settings are esbuild, minified neutral
ESM, target ES2022; gzip uses fflate level 9, mtime 0. The size script also asserts
that the three luminary-only exports emit no planet or asteroid modules.

| Subpath export | Minified bytes | Gzip bytes |
|---|---:|---:|
| * | 60189 | 24520 |
| findLunarPhases | 11370 | 5460 |
| getMoonPhase | 11313 | 5044 |
| findSeasons | 9290 | 4470 |
| findSignIngresses | 57793 | 23493 |
| findAspectTimes | 55910 | 22959 |
| findVoidOfCourseMoon | 58972 | 24026 |

Local medians, Node 20.19.2, seven measured runs after warmup (milliseconds;
not portable guarantees):

| Workload | Median ms |
|---|---:|
| lunar phases / year | 9.575 |
| seasons / year | 0.941 |
| Moon ingresses / year | 6.187 |
| ten-body ingresses / year | 40.077 |
| Mars–Saturn aspects / 3 years | 16.091 |
| VOC / month | 11.673 |
| VOC / year | 126.454 |
| getAllPositions with speed / call | 0.084 |

Before the longitude-only lunar optimization, year scans were approximately
22.2 ms (phases), 27.5 ms (Moon ingresses), 62.2 ms (ten-body ingresses), and
358.6 ms (VOC). Lunar-phase bundles fell from 13,819/6,322 min/gzip bytes to the
values above. Existing ephemeris implementation and performance entries are
unchanged; the normalized performance gate passes.
