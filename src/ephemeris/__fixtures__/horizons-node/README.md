# Lunar node reference generation

Source: https://ssd.jpl.nasa.gov/api/horizons.api.
Retrieved 2026-10-28. Run
`node scripts/bench/fetch-node-fixture.mjs`, then
`/tmp/erfa-venv/bin/python scripts/bench/derive-angles.py` (install pyerfa first).

The fetcher records exact raw request parameters and parsed osculating elements
in moon-node.json: COMMAND='301', EPHEM_TYPE='ELEMENTS', CENTER='500@399',
REF_PLANE='ECLIPTIC', REF_SYSTEM='ICRF', TIME_TYPE='TDB' (Horizons allows only TDB for osculating elements; TDB−TT stays below 2 ms), TLIST_TYPE='JD',
CSV_FORMAT='YES', OUT_UNITS='AU-D'. The 61 epochs span 1900–2100 with
irregular offsets. Requests contain at most 30 dates, use curl retries and
pause 300 ms between batches. These are geometric instantaneous elements,
not apparent light-time-corrected positions.

For ascending node OM and inclination IN, the orbit normal in fixed J2000
ecliptic coordinates is (sin(IN)sin(OM), −sin(IN)cos(OM), cos(IN)). Rotate it
about x by Horizons' fixed obliquity 84381.448 arcseconds into ICRF equatorial
coordinates, then apply ERFA ecm06 at the TT epoch (IAU 2006 precession,
frame bias and mean obliquity). The node longitude of date is
atan2(normal.x, −normal.y). Rotating the entire normal accounts for changing
inclination and ecliptic pole; adding a longitude precession offset does not.
The derived erfa-node.json records pyerfa version and functions.

The same epochs use ERFA faom03, IERS 2003 mean ascending-node longitude in
the mean equinox of date, without an extra precession correction. Celestine's
getNorthNode is an alias of getTrueNode: a finite perturbation series rather
than the exact instantaneous osculating node. Their residual describes this
model/definition difference as well as approximation error.

Reference: https://github.com/liberfa/pyerfa (ecm06, faom03).
