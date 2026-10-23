# Reproducible NASA/JPL Horizons reference positions

Retrieved **2026-10-23**. All rows are geocentric target **body centers**, including
Pluto **999**, rather than planetary-system barycenters. No runtime dependencies.

Run from the repository root:

```sh
node scripts/horizons/fetch-fixtures.mjs
npx biome format --write src/ephemeris/__fixtures__/horizons/*.json
node --import tsx scripts/horizons/measure.ts
node scripts/horizons/audit-coefficients.mjs
```

The fetcher uses curl, sequential batches of at most 50 epochs, retries and a
250 ms pause between requests. Mercury spans 1800–2200 with additional two-day
sampling around six inferior conjunctions/transits and daily perihelion samples;
Pluto spans its documented 1885–2099 range; Sun spans 1800–2200. The seven other
bodies have 20 epochs each over 1900–2100. Six historical test epochs are also
included for Mercury and Pluto. Columns are named in each JSON header; angles
are degrees, distance is AU. ISO strings label TT, without implying UTC.

## Exact requests and coordinate transformation

Endpoint: https://ssd.jpl.nasa.gov/api/horizons.api

Common parameters: `format=json`, `COMMAND=<target ID>`, `CENTER='500@399'`,
`TLIST=<newline-separated JD list>`, `TLIST_TYPE='JD'`, `CSV_FORMAT='YES'`,
`REF_SYSTEM='ICRF'`. Target IDs: Sun 10, Moon 301, Mercury 199, Venus 299,
Mars 499, Jupiter 599, Saturn 699, Uranus 799, Neptune 899, Pluto 999.

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
quantity 31; all bodies are below 0.40″. This includes the approximation's own
error and the small deflection/frame effects; it is not a full nutation model.
Latitude uses the mean ecliptic plane in both tables. The largest latitude
cross-check difference is 0.685″ for Uranus on 2037-07-11, only about 0.29°
from the Sun, where gravitational deflection is appreciable.

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

The intended default is geocentric apparent longitude/latitude referred to the
**mean ecliptic and equinox of date**, without nutation. `getPosition` dispatches
without converting the input JD; series use it directly as dynamical time.
Before this fix, Mercury used VSOP87D of date but had corrupted L1/R1 terms;
Pluto's Meeus Ch.37 heliocentric series is J2000 and was combined with Earth of
date. Both omitted light-time and used a constant −20.49552″ longitude shift
(Pluto rounded to −0.005694°). Such a constant is appropriate only as an
approximation for the Sun, not a general annual-aberration correction.

The Sun remains its existing low-order geometric longitude plus constant
aberration, with a single-term nutation approximation when requested.
Mercury and Pluto continue to omit nutation even when `includeNutation` is true;
this existing option inconsistency is outside this pass. Chart callers currently
pass UT rather than TT, also unchanged. There is no ΔT conversion here.

Mercury now uses repaired VSOP87D coefficients, a shared Earth series with the
correct L2 constant, first-order retarded coordinates and direction-dependent
annual aberration in longitude and latitude. Only nine Earth L0 terms were added;
no Mercury terms were added. Mercury's light-time velocity uses six dominant
harmonics in each of L0/B0/R0 plus the secular L1 term. Pluto's series supplies
analytic derivatives for retarded coordinates, then Meeus Ch.21 precession puts
Pluto into Earth's mean frame before subtraction. This avoids a second full
series evaluation. No empirical offsets or fitted corrections are used.

The coefficient audit downloads the original
[IMCCE VSOP87D Mercury file](https://ftp.imcce.fr/pub/ephem/planets/vsop87/VSOP87D.mer)
and checks every retained L0–L5, B0–B4 and R0–R3 term, allowing rounded
coefficients. `coefficient-audit.txt` records conservative rounding bounds
(radius bounds expressed with the same angular scale, for comparison).

`baseline-before.txt` was first captured before runtime edits; after adding the
six old test epochs and perihelion samples, it was regenerated using the original
HEAD versions of Mercury and Pluto on exactly the final fixtures. `accuracy-after.txt`
uses the corrected source. Unchanged bodies have identical before/after results.
The regression tests allow 7″/1.5″ longitude/latitude for Mercury and 5″/0.6″ for
Pluto; control limits are explicitly labeled pre-shared-pipeline.

Fixtures are test-only. Package `files` contains only `dist`, `README.md` and
`LICENSE`; the tsup runtime entry does not import tests or JSON fixtures.
