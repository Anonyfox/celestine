# Reproducible NASA/JPL Horizons reference positions

Retrieved **2026-10-24**. All rows are geocentric target **body centers**, including
Pluto **999**, rather than planetary-system barycenters. No runtime dependencies.

Run from the repository root:

```sh
node scripts/horizons/fetch-fixtures.mjs
npx biome format --write src/ephemeris/__fixtures__/horizons/*.json
node --import tsx scripts/horizons/measure.ts
node scripts/horizons/audit-coefficients.mjs
```

The fetcher uses curl, sequential batches of at most 50 epochs, retries and a
250 ms pause between requests. Optional `HORIZONS_BODIES=Venus,Mars` restricts
regeneration to those bodies. Dates use deterministic irregular offsets, avoiding
sampling at exact orbital periods. Ranges and counts:

| Body | TT range | Samples |
| --- | --- | ---: |
| Mercury | 1800-01-01–2200-01-01 | 176 |
| Sun, Jupiter, Saturn, Uranus | 1800-01-01–2200-01-01 | 123 each |
| Venus, Mars | 1800-01-01–2200-01-01 | 148 each |
| Neptune | 1800-01-02–2199-12-29 | 123 |
| Moon | 1900-01-01–2100-01-01 | 123 |
| Pluto | 1885-01-01–2099-01-01 | 91 |
| Chiron | 1950-01-01–2050-01-01 | 123 |

All endpoints are at 12:00 TT. Neptune's range stays inside Horizons' body-center
coverage, 1800-01-02 through 2199-12-30. Inner-planet samples include near-Sun
and station neighborhoods; Mercury also has daily perihelion samples. Moon's
existing Meeus/ELP approximation is tested over the conservative 1900–2100
interval, rather than extending its precision claim to four centuries. Chiron's
range characterizes the existing Keplerian approximation around its J2000 epoch;
it does not establish high precision (errors reach degrees; see Stage A notes).
Columns are named in each JSON header; angles are degrees, distance is AU.
ISO strings label TT, without implying UTC.

## Exact requests and coordinate transformation

Endpoint: https://ssd.jpl.nasa.gov/api/horizons.api

Common parameters: `format=json`, `COMMAND=<target ID>`, `CENTER='500@399'`,
`TLIST=<newline-separated JD list>`, `TLIST_TYPE='JD'`, `CSV_FORMAT='YES'`,
`REF_SYSTEM='ICRF'`. Target IDs: Sun 10, Moon 301, Mercury 199, Venus 299,
Mars 499, Jupiter 599, Saturn 699, Uranus 799, Neptune 899, Pluto 999.
Chiron uses numbered small-body command `2060;`, with the same geocentric center.
The requested `DES=2060;` produced “No matches found” from Horizons; `2060;`
unambiguously selects 2060 Chiron's body center.

Vector parameters: `EPHEM_TYPE='VECTORS'`, `TIME_TYPE='TDB'`,
`REF_PLANE='FRAME'`, `VEC_CORR='LT+S'`, `OUT_UNITS='AU-D'`, `VEC_TABLE='1'`.
These are equatorial ICRF vectors including down-leg light-time and relativistic
stellar aberration. Horizons vectors do **not** accept TT; we supply the same
numeric JD in TDB. TT−TDB is less than 2 ms, negligible for these tolerances.
The original numeric epoch is stored as `jd_tt` for direct library input.

`meanEcliptic` in the fetcher rotates ICRF equatorial vectors through the Lieske
IAU 1976 J2000-to-date precession angles ζ, θ, z, then rotates by the IAU 1980
mean obliquity of date (84381.448 − 46.815 T − 0.00059 T² + 0.001813 T³ arcsec).
It converts the result to spherical longitude, latitude and Euclidean distance.
ICRF/FK5 frame bias (~0.02″) is neglected. Stored mean angles are rounded to
0.000001° (0.0036″), distance to 0.0000001 AU.

Independent observer parameters: `EPHEM_TYPE='OBSERVER'`, `TIME_TYPE='TT'`,
`QUANTITIES='31'`, `EXTRA_PREC='YES'`, `APPARENT='AIRLESS'`.
Quantity 31 is apparent ecliptic longitude/latitude in the IAU76/80 ecliptic of
date: the plane is the mean ecliptic, while the longitude origin includes
nutation. It also includes gravitational deflection, absent from LT+S vectors.
The fetcher adds the standard four-term approximation for nutation in longitude
(−17.20 sin Ω − 1.32 sin 2Lsun − 0.23 sin 2Lmoon + 0.21 sin 2Ω arcsec).
`crosscheck_max_arcsec` records the maximum wrapped longitude discrepancy against
quantity 31; all bodies are below 0.5″. This includes the approximation's own
error and the small deflection/frame effects; it is not a full nutation model.
Latitude uses the mean ecliptic plane in both tables. The cross-check is
independent of the runtime ephemeris and remains mandatory for every file.

Primary documentation:
[Horizons manual](https://ssd.jpl.nasa.gov/horizons/manual.html), especially
reference frames and observer quantity 31;
[API parameters](https://ssd-api.jpl.nasa.gov/doc/horizons.html).

## Source versions from response headers

- Mercury, Venus, Sun, Moon: DE441.
- Pluto: plu060_merged and DE441.
- Mars: mar099 and DE441.
- Jupiter: jup365_merged and DE441.
- Saturn: sat441l and DE441.
- Uranus: ura184_merged and DE441.
- Neptune: nep098_merged.

These are also preserved in each fixture's `sources` field.

## Library quantity and corrections

Default positions are geocentric apparent longitude/latitude in the **mean
ecliptic and equinox of date**, without nutation. Input JD is TT. Chart callers
currently pass UT, a separate unchanged issue; no ΔT conversion is made here.

Sun, Mercury–Neptune, Pluto, Chiron, and asteroids now use the shared Earth and
apparent-coordinate pipeline. It applies light-time and direction-dependent
annual aberration. J2000 theories (Pluto and Keplerian minor bodies) are precessed
before combining them with VSOP87D Earth-of-date coordinates. The existing
single-term `nutationInLongitude` helper is used when the shared path receives
`includeNutation: true`. The Moon retains its existing option behavior.

See [Stage A notes](../../../../scripts/horizons/stage-a-notes.md) for coefficient
selection, repaired corruptions, performance choices, Moon latitude additions,
and the substantial limits of Chiron's unmodified orbital theory. The audit
checks every retained Earth and Mercury–Neptune term against the official
[CDS VSOP87D series](https://cdsarc.cds.unistra.fr/ftp/VI/81/).

`accuracy-before.txt` is the initial baseline; `accuracy-before-expanded.txt`
uses HEAD's original source on the expanded fixtures; `accuracy-after.txt` uses
the final source on the same expanded dates (all in `scripts/horizons/`).
Precision budgets only tighten. Moon longitude retains its existing 8″ ceiling;
new Chiron limits record the measured approximation's errors rather than an
arcsecond accuracy claim.

Fixtures are test-only. Package `files` remains `dist`, `README.md`, and `LICENSE`;
the runtime entry imports neither tests nor JSON fixtures.
