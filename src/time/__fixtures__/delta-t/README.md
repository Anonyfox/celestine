# USNO ΔT reference observations

Retrieved 2026-10-24 from the exact URLs:

- https://maia.usno.navy.mil/ser7/deltat.data
- https://maia.usno.navy.mil/ser7/historic_deltat.data

The JSON files record source URL, retrieval date, SHA-256 of the raw downloaded
bytes, and every observation as `[decimalYear, TT-minus-UT1 seconds]`. Historic
decimal years are copied directly; the other columns (uncertainty and LOD) are
not used. Monthly Gregorian dates are converted to JD at midnight, then to
`2000 + (JD - 2451545) / 365.25`, matching `deltaTAt`. No values are rounded in
these reference fixtures. Both series from 1800, including their overlap, are tested.
These files are excluded from the published build.

Regenerate with `node scripts/delta-t/fetch-delta-t.mjs 2026-10-24`
(the optional argument records the retrieval date; otherwise UTC today is used). Network contents may
change; inspect the resulting hashes, dates, rows and measured errors. Format generated
JSON with `npx biome format --write src/time/__fixtures__/delta-t/*.json`.

## Runtime representation

The runtime uses 47 USNO knots quantized to 0.1 seconds, plus the 1800
bridge endpoint, with quarter-year times. An interleaved table stores incremental quarter-years and
incremental tenths of seconds after the initial E–M 1700–1800 polynomial endpoint at 1800
(13.75612436 seconds, rounded to nanoseconds). Only the first increment is
fractional (−26.5612436 tenths), bridging to USNO (1804, 11.1 seconds); values from 1804 onward are unchanged.
The interpolation scan accumulates these increments without parsing strings.

Construction: use the historic series before the first monthly observation,
then the monthly series. Interpolate onto a half-year grid starting at 1657,
through 2026.5, and append 2026.75 with the last observed value (2026-10-01).
Round values to tenths; recursively split each segment at the grid point with
the largest error/tolerance ratio until all ratios are at most one. Tolerances
are 1.4 seconds before 1900, 0.3 before 1955, and 0.08 thereafter. The actual
fixture-row errors below include grid sampling and quantization effects.
Discard knots before 1804 and insert the 1800–1804 bridge described above.
The October endpoint is displaced by less than one day on the decimal-year
axis; its quantized value is 69.2 seconds.
One knot is added by hand at 2026.25 (69.1 s; observed 69.133 s on 2026-04-01) so the
final observed segment carries the current 0.2 s/year rate into the extrapolation
instead of the 0.1/1.75 s/year secant of the automatic split; it lowers 1955–2026 RMS.

Measured against **all rows from 1800** in both fixtures (seconds; RMS is unweighted):

| Era | Rows | Max error | RMS error |
| --- | ---: | ---: | ---: |
| 1800–1899 | 200 | 1.346667 | 0.462101 |
| 1900–1954 | 110 | 0.320000 | 0.103792 |
| 1955–2026 | 705 | 0.103977 | 0.033643 |

These are approximation errors against USNO, not physical uncertainties.
For 1657–1799, the older USNO tabulation (Stephenson & Morrison / McCarthy &
Babcock, 1980s) disagrees with the newer Morrison & Stephenson (2004) values
published by NASA. We follow NASA/M&S (2004) there via the original
[Espenak–Meeus (2006) polynomials](https://eclipse.gsfc.nasa.gov/SEcat5/deltatpoly.html).
For example, USNO gives 21 seconds at 1700, NASA gives 9 ±5 seconds;
at 1800 USNO gives 12.6 seconds, NASA gives 14 ±1 seconds.
Against the 286 USNO rows before 1800, max/RMS differences are
12.681097/6.908682 seconds. These differences exceed the listed 10-second
standard errors (column 3 of historic_deltat.data), so no USNO accuracy claim
or assertion is made for that era. The original NASA test expectations at
1700 and 1800 are retained.

Before 1800, Espenak–Meeus (2006) polynomials are retained. Small tapered
corrections before 1000 and after 1501 match the 500 and 1600 boundaries
(0.08711875 and −0.25111454 seconds at the endpoints). The original
1600–1700 cubic coefficients are unchanged; a correction growing linearly
from zero at 1699 to −0.16212793 seconds at 1700 matches the next
polynomial's 8.83-second intercept. The original 1700–1800 quartic is unchanged.
A regression test asserts that errors at all six ancient NASA reference points
do not increase. All existing NASA reference tolerances pass.
Before −500, a −0.02366094-second offset matches the adjacent polynomial.
All joins match within 1e-7 seconds, avoiding gaps in the TT/UT inverse.

## Extrapolation

The final observed knots are 69.1 s at 2026.25 and 69.2 s at 2026.75 (observed
2026-04-01 69.133 s and 2026-10-01 69.207 s), so the last observed segment slope is
0.2 s/year. From 2026.75 a cubic Hermite bridge matches that value and slope and reaches
the Stephenson, Morrison & Hohenkerk (2016) long-term parabola
`-320 + 32.5*((y-1825)/100)^2` at 2800 (2769.53125 s, 6.3375 s/year), which applies
thereafter. This mirrors Skyfield's `build_delta_t` (last-year slope of the IERS table,
cubic to the SMH 2016 parabola at the century ~800 years later). The expanded cubic
coefficients in `t = (y - 2026.75) / 773.25` are exact: 69.2, 154.65, 2891.221875,
−345.540625. The bridge is monotone and matches both endpoint slopes. Values: 70.8 s
(2033.75), 76.5 s (2050), 109.5 s (2100), 245 s (2200). Previously the bridge used the
last knot secant (0.1/1.75 s/year) and the Morrison & Stephenson (2004) parabola at 2150:
71.2, 86.8, 198.5 and 442 s. This is an extrapolation, not an Earth-rotation forecast:
allow several seconds per decade, growing to tens/hundreds of seconds over centuries.

Comparison (tested with small inline samples, not used as coefficients), retrieved
2026-10-24, errors max/RMS/mean in seconds, new (previous):

- IERS Bulletin A one-year prediction, via https://maia.usno.navy.mil/ser7/finals2000A.data
  (ΔT = 69.184 − (UT1−UTC), to 2027-10): 0.114/0.065/−0.050 (0.191/0.127/−0.119).
- USNO https://maia.usno.navy.mil/ser7/deltat.preds, 2026.75–2033.75 (issued from 2022.5
  data, so already 0.1 s below the October 2026 observation): 0.430/0.210/−0.110
  (0.305/0.192/−0.152).

No IERS or USNO product predicts ΔT beyond 2034. The ≈95 s (2050) and ≈115 s (2100)
implied by USNO's phase and season tables are not a ΔT prediction; they are reported in
`src/events/__fixtures__/README.md`.
