# ERFA chart-angle reference generation

Generator: `scripts/bench/derive-angles.py`. Generated 2026-10-28. The generated JSON records the actual installed pyerfa version.

The 208 deterministic cases span UT 1900-01-01 to 2100-01-01, geographic
latitudes −65 through +65 degrees and east-positive longitudes −180 through
+180 degrees, with irregular sub-day offsets. UT is treated as UT1; no DUT1
correction is applied. ERFA `gmst82` supplies IAU 1982 mean sidereal time;
`obl80` supplies IAU 1980 mean obliquity, evaluated at UT to mirror
`chart.calculateTimeData`, including its choice of time argument. Chart planets
use TT after ΔT conversion, but chart angles use UT for both ingredients.
There is no nutation or GAST. ASC uses the eastern intersection of the ecliptic
and horizon planes; MC uses the upper meridian intersection. Comparing public
`calculateAngles` with Celestine GMST and obliquity exercises both ingredients
and angle geometry. This does not test ΔT or physical Earth-rotation accuracy.

Reference: https://github.com/liberfa/pyerfa and https://github.com/liberfa/erfa.
Installation and reproduction commands are in the generator docstring.
