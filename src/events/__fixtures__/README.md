# Event reference data

Retrieved **2026-10-24**. These are development fixtures, excluded from the published package.
No prior ephemeris/Horizons fixtures were changed. No reference times are library-generated:
library predictions choose the request windows; independent source longitudes determine crossings.

## Reproduction and provenance

Run `node scripts/events/fetch-usno.mjs`, then `npm run build`,
`node scripts/events/fetch-horizons.mjs` and `scripts/events/derive-frames.py` (pyerfa; see
its docstring). Retrieval is sequential, with 250 ms (USNO)
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
  center the grid), `frame`, `jd` (independent linearly interpolated Horizons TT JD in
  Horizons' native frame), `step` (TT days), `bracket=[t0,t1,residual0,residual1]` (TT JDs
  and signed degrees), `angle` (oriented degrees), `body`, optional `targetBody` or `fixed`
  (fixed longitude), and event metadata. Frame-dependent rows (`frame: "true"`: seasons,
  ingresses, fixed-longitude aspects) also carry `jdMean`/`bracketMean`, the same crossing
  in the mean equinox of date (see **Frames**). Seventeen evenly spaced epochs surround each prediction. Tests and `measure.mjs` search ±0.2 day around each reference `jd`. Steps are
  one minute for Sun/Moon, otherwise 3 arcseconds divided by speed, capped at 0.1 day.
  Linear interpolation of the bracketing *source* residuals determines `jd`.
  Phases sample four successive events in 16 years spread across 1900–2100;
  seasons sample four events every 20 years. Ingress samples span the whole interval,
  with two explicitly selected retrograde re-entries per planet. Aspects include Moon–Mars,
  Moon–Jupiter, Sun–Saturn, Mars–Saturn, Jupiter–Saturn Mercury–Saturn, and Mercury to fixed 45°;
  three additional Mercury passes at 45° in April–May 2023 are marked `triplePass`. Three Mercury–Saturn sextiles across the same retrograde
  are marked `triplePassMoving`.
  Phases and moving-body aspects are `frame: "relative"`: both Horizons longitudes carry
  the same nutation, which cancels.
- `illumination.json`: 51 uniformly spaced TT epochs over 1900–2100, rows
  `[jdTT, illuminatedFraction]`. Same Horizons parameters except `COMMAND='301'`,
  `QUANTITIES='10'`; response column 3 is illuminated percent, divided by 100.

`horizons-stations.json` comes from `node scripts/events/fetch-stations.mjs` (after
`npm run build`). For each station it takes 17 Horizons samples (quantity 31: true ecliptic of
date, TT) within ±1 day (Mercury), ±1.5 days (Venus) or ±2 days (other bodies). It then fits a quartic and
records the vertex. The script recentres the window until the vertex lies within a quarter of the
half-width. Short windows keep the monthly lunar reflex in geocentric longitude (≈0.16″ for
Pluto) from biasing slow-planet stations by tens of minutes. `derive-frames.py` then adds
`jdMean`/`longitudeMean`: the same quartic refitted on the same cached window minus ERFA
`nut00a` (up to 2.7 h from `jd`).

`consumer-stations-2026-2027.json`: 17 Mercury–Saturn stations from Cosmolytic Studio's own
Horizons fit (quantity 31, 10-minute UT samples, cubic fit; UT rounded to the minute), kept
verbatim apart from English body names and types. It is independent of our fetch scripts.

## Frames

The library default for positions, charts and events is apparent longitude in the **mean**
equinox of date; `includeNutation: true` (positions and events) gives
the **true** equinox of date. Every reference is compared with the library in its own frame:

| Event | Reference | Library call |
|---|---|---|
| Ingress, true | `jd` | `findSignIngresses(body, a, b, { includeNutation: true })` |
| Ingress, mean | `jdMean` | `findSignIngresses(body, a, b)` |
| Season (true, the USNO/Meeus definition) | `jd` | `findSeasons` |
| Season, mean | `jdMean` | default Sun ingress at 0/90/180/270° |
| Aspect to a fixed longitude, mean | `jdMean` | `findAspectTimes(body, fixed, …)` |
| Aspect to a fixed longitude, true | `jd` | `findAspectTimes(body, fixed, a, b, { includeNutation: true })` |
| Station, true | `jd` (`horizons-stations.json`) | `findStations(body, a, b, { includeNutation: true })`, `findRetrogradePeriods(…, { includeNutation: true })` |
| Station, mean | `jdMean` (`horizons-stations.json`) | `findStations(body, a, b)`, `findRetrogradePeriods(body, a, b)` |
| Phase, aspect between bodies | `jd` (frame cancels) | `findLunarPhases`, `findAspectTimes` |

Horizons quantity 31 (ObsEcLon) is the true ecliptic and equinox of date and has no
mean-of-date setting. `frame.json` confirms this empirically: three Sun epochs (TT JD
2415020, 2451545, 2488070) have mean-equinox residuals −17.258, +14.087, −3.031″, and
+0.084, +0.170, +0.239″ after adding the library's nutation (`nutationInLongitude`, 13
IAU 2000B terms, within 0.05″ of IAU 2000A for 1800–2200); the rest is the Sun model.
`derive-frames.py` therefore derives `jdMean` from the same cached Horizons samples
minus IAU 2000A nutation in longitude (ERFA `nut00a`, independent of the library), then
re-brackets and interpolates exactly like `jd`. Horizons' own of-date model (IAU 1980
with pole offsets) and IAU 2000A differ by at most 0.018″ in Δψ over 1900–2100 (computed
by the script), negligible against every limit. One Pluto retrograde re-entry needed a
wider grid in the mean frame (cached request added). Until 0.4 the fixed-longitude
aspect references subtracted the library's own (then 4-term) nutation, which was not
independent; they now use `jdMean` and dropped from 89.9 s to 28.8 s max error.

Ingress tests bound the implied longitude error |Δt|·|speed| per body (arcseconds), not
the time: time error is position error divided by speed and is unbounded near a station.
The 0.4.0 time limits for Jupiter/Saturn (300/620 s) passed only through partial
cancellation between the old 4-term nutation's ≈0.35″ error and the planet models: the
unchanged mean-frame output measured like for like gives 320/631 s. The position bounds
(Jupiter 1.35″, Saturn 0.8″, all inside the bodies' position budgets) hold in both frames.
`frames.test.ts` checks that at every found ingress, aspect, season and void-of-course
boundary the position API with matching options is on target to within 1e-4″.

## Measured timing errors

Seconds; max is absolute; RMS uses all samples. USNO is compared using `jdUT`;
Horizons uses `jd` on **TT**, never UTC. Limits in tests are rounded upward from these
measurements, not limits borrowed from a different time scale or positional budget.

| Source / event / frame / scale | Samples | Max (s) | RMS (s) | Max implied (″) |
|---|---:|---:|---:|---:|
| USNO phases UT | 9945 | 59.657 | 21.411 | |
| USNO seasons UT | 804 | 42.479 | 18.929 | |
| Horizons phase Moon TT | 64 | 14.531 | 5.551 | |
| Horizons season Sun true TT | 44 | 7.506 | 3.913 | |
| Horizons season Sun mean TT | 44 | 7.724 | 3.854 | |
| Horizons ingress Sun true TT | 12 | 7.121 | 4.045 | 0.290 |
| Horizons ingress Sun mean TT | 12 | 6.805 | 4.015 | 0.277 |
| Horizons ingress Moon true TT | 12 | 10.925 | 5.881 | 6.770 |
| Horizons ingress Moon mean TT | 12 | 10.945 | 5.890 | 6.782 |
| Horizons ingress Mercury true TT | 12 | 6.069 | 3.092 | 0.347 |
| Horizons ingress Mercury mean TT | 12 | 6.018 | 3.172 | 0.363 |
| Horizons ingress Venus true TT | 12 | 133.884 | 49.254 | 0.486 |
| Horizons ingress Venus mean TT | 12 | 138.926 | 50.793 | 0.495 |
| Horizons ingress Mars true TT | 12 | 94.222 | 29.095 | 1.256 |
| Horizons ingress Mars mean TT | 12 | 93.328 | 29.005 | 1.245 |
| Horizons ingress Jupiter true TT | 12 | 333.455 | 135.901 | 1.275 |
| Horizons ingress Jupiter mean TT | 12 | 319.651 | 133.034 | 1.263 |
| Horizons ingress Saturn true TT | 12 | 642.367 | 207.322 | 0.728 |
| Horizons ingress Saturn mean TT | 12 | 630.625 | 205.334 | 0.714 |
| Horizons ingress Uranus true TT | 12 | 1300.786 | 580.075 | 2.178 |
| Horizons ingress Uranus mean TT | 12 | 1293.956 | 577.405 | 2.141 |
| Horizons ingress Neptune true TT | 12 | 2496.650 | 1376.983 | 2.663 |
| Horizons ingress Neptune mean TT | 12 | 2496.507 | 1372.985 | 2.659 |
| Horizons ingress Pluto true TT | 12 | 10699.601 | 3842.188 | 3.229 |
| Horizons ingress Pluto mean TT | 12 | 11707.795 | 4077.408 | 3.223 |
| Horizons aspect Moon TT | 14 | 7.982 | 3.735 | |
| Horizons aspect Sun TT | 7 | 17.167 | 12.165 | |
| Horizons aspect Mars TT | 7 | 65.333 | 31.415 | |
| Horizons aspect Jupiter TT | 7 | 369.214 | 157.592 | |
| Horizons aspect Mercury mean fixed TT | 10 | 28.776 | 11.740 | |
| Horizons aspect Mercury true fixed TT | 10 | 28.191 | 11.477 | |
| Horizons aspect Mercury TT | 3 | 54.144 | 36.187 | |

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

## Lunar phase longitudes

`horizons-phase-longitudes.json`: rows `[jd, phase, moon, sun]` for all **148** principal phases
of 2025–2027. `jd` is the library's TT phase instant (it only chooses the request times);
`moon` and `sun` are Horizons apparent ObsEcLon (quantity 31, true ecliptic and equinox of date)
of the Moon (301) and Sun (10) at that TT instant, same request parameters as above. Produced by
`npm run build && node scripts/events/fetch-phase-longitudes.mjs` (retrieved 2026-10-24).
Measured maxima: Moon 7.46″, Sun 0.28″.

## NASA eclipses and Horizons longitudes

`nasa-eclipses.json` contains every solar and lunar eclipse from 2019-07-01 through
2031-06-30 (56 events), with the NASA calendar date, greatest-eclipse TD clock,
TT JD (TD = TT), ΔT seconds, raw type, normalized type, gamma and magnitudes.
Century counts are parsed from the complete catalog rows (2001–2100): solar
77 partial, 72 annular, 68 total, 7 hybrid; lunar 86 penumbral, 57 partial, 85 total.

Retrieved 2026-10-24 from:
- https://eclipse.gsfc.nasa.gov/SEcat5/SE2001-2100.html
- https://eclipse.gsfc.nasa.gov/LEcat5/LE2001-2100.html

Regenerate with `node scripts/events/fetch-nasa-eclipses.mjs`. Optional first and
second arguments are local solar and lunar catalog paths, respectively. The script
strips HTML, parses catalog rows and converts the TD calendar directly to TT JD
without applying ΔT. No library-generated reference values are used.

`horizons-eclipses.json` records Sun/Moon apparent geocentric ecliptic longitude
at those exact NASA TT epochs, true equinox of date (quantity 31). The same script
uses `scripts/events/horizons.mjs` and its cached raw requests, retrieved 2026-10-24
from https://ssd.jpl.nasa.gov/api/horizons.api. The longitude tests compare at these
reference epochs, separately from greatest-eclipse timing errors.

After building, `node scripts/events/measure-eclipses.mjs` measures agreement for
2020-01-01 through 2031-01-01 TT: 50/50 kinds and types, maximum timing error
17.102905 s, mean 5.879146 s, maximum gamma error 0.000422721 Earth equatorial
radii, solar magnitude error 0.000532581, lunar umbral magnitude error 0.000701454,
and lunar penumbral magnitude error 0.000699891. Maximum UT difference from NASA
TD−ΔT is 20.739256 s (different ΔT models). The test ceilings round these errors
up. The full-century test checks all seven type counts.

At the 56 NASA epochs, maximum apparent longitude errors against Horizons are
0.261796 arcsec (Sun) and 9.906056 arcsec (Moon). The Moon maximum occurs at
2021-12-04 07:34:38 TT (JD 2459552.8157175924). That is above the 8 arcsec
Moon budget, which is the maximum over the precision sample set, so the eclipse
test bounds the Moon at 10 arcsec. The position API and its outputs are unchanged.

## Transit passes

Run `node --import tsx scripts/events/fetch-transit-passes.mjs` to reproduce
`horizons-transit-passes.json` (retrieved 2026-10-24). Predictions select TT
epochs at orb entry, exact hits and orb exit for the first three passes per case.
Reference longitudes come from Horizons quantity 31 through the cached, sequential
requests described above. The test subtracts nutation in longitude to compare in
the mean ecliptic/equinox of date and enforces each body's longitude precision
budget. These are longitude residuals at predicted times, not independent event times.

| Body | Samples | Maximum residual (arcseconds) |
|---|---:|---:|
| Moon | 9 | 2.7687 |
| Mars | 6 | 0.2000 |
| Jupiter | 3 | 0.2878 |
| Saturn | 9 | 0.2340 |

The default `searchTransits` compatibility snapshot remains in
`src/transits/__fixtures__/default-search.json`; its regression test runs against
the unchanged transit search.
