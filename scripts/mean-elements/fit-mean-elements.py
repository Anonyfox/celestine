"""Least-squares mean Keplerian elements for Ceres, Pallas, Juno, Vesta (and a trial for Chiron).

Not shipped (scripts/ is outside package.json "files"). Requires Python 3 + numpy.

1. Fetches JPL Horizons VECTORS (heliocentric 500@10, ecliptic J2000, ICRF, TDB, AU, no
   corrections) on a 10-day grid 1800-01-01..2200-01-01, sequentially (one request per century,
   1.5 s pause), cached in ./.cache/.
2. Fits the 7 constants used by the asteroid modules (a, e, i, node, peri, M0, n; J2000 ecliptic,
   epoch J2000.0 TDB, no secular rates) to the vectors by Gauss-Newton least squares on x, y, z.
3. Rounds each constant to the fewest significant digits that keep the fit's geocentric error
   (max and RMS, crude circular Earth) within 0.1 arcmin of the unrounded fit, and prints them.

Usage: python3 scripts/mean-elements/fit-mean-elements.py [ceres pallas juno vesta chiron]
"""
import json, os, sys, time, urllib.parse, urllib.request
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, '.cache')
BODIES = {'ceres': ('1;', [2.766, 0.0784, 10.583, 80.494, 73.923, 6.177]),
          'pallas': ('2;', [2.772, 0.2310, 34.846, 173.17, 310.22, 352.98]),
          'juno': ('3;', [2.668, 0.2582, 12.971, 170.11, 247.89, 269.83]),
          'vesta': ('4;', [2.362, 0.0890, 7.134, 103.95, 150.75, 343.12]),
          'chiron': ('2060;', [13.65, 0.3793, 6.9416, 209.3967, 339.142, 27.9972])}
J2000 = 2451545.0

def fetch(name):
    os.makedirs(CACHE, exist_ok=True)
    rows = []
    for y in (1800, 1900, 2000, 2100):
        f = os.path.join(CACHE, f'{name}-{y}.json')
        if not os.path.exists(f):
            q = {'format': 'text', 'COMMAND': f"'{BODIES[name][0]}'", 'EPHEM_TYPE': "'VECTORS'",
                 'CENTER': "'500@10'", 'REF_PLANE': "'ECLIPTIC'", 'REF_SYSTEM': "'ICRF'",
                 'VEC_TABLE': "'1'", 'VEC_CORR': "'NONE'", 'CSV_FORMAT': "'YES'",
                 'OUT_UNITS': "'AU-D'", 'START_TIME': f"'{y}-01-01'",
                 'STOP_TIME': f"'{y + 100}-01-01'", 'STEP_SIZE': "'10 d'"}
            url = 'https://ssd.jpl.nasa.gov/api/horizons.api?' + urllib.parse.urlencode(q)
            for attempt in range(5):
                try:
                    txt = urllib.request.urlopen(url, timeout=120).read().decode()
                    body = txt.split('$$SOE')[1].split('$$EOE')[0]
                    break
                except Exception:
                    if attempt == 4: raise
                    time.sleep(5 * (attempt + 1))
            r = []
            for line in body.strip().splitlines():
                c = [v.strip() for v in line.split(',')]
                r.append([float(c[0]), float(c[2]), float(c[3]), float(c[4])])
            json.dump({'url': url, 'rows': r}, open(f, 'w'))
            time.sleep(1.5)
        rows += json.load(open(f))['rows']
    a = np.array(rows); a = a[np.argsort(a[:, 0])]
    return a[np.unique(a[:, 0], return_index=True)[1]]

def position(p, jd):
    """Same model as src/ephemeris/asteroids/*.ts (degrees, deg/day, epoch J2000)."""
    a, e, i, node, peri, M0, n = p
    d = np.radians
    M = d(M0 + n * (jd - J2000))
    E = M + e * np.sin(M)
    for _ in range(30): E = E - (E - e * np.sin(E) - M) / (1 - e * np.cos(E))
    xv = a * (np.cos(E) - e); yv = a * np.sqrt(1 - e * e) * np.sin(E)
    cO, sO, cw, sw, ci, si = np.cos(d(node)), np.sin(d(node)), np.cos(d(peri)), np.sin(d(peri)), np.cos(d(i)), np.sin(d(i))
    return np.stack([(cw * cO - sw * ci * sO) * xv + (-sw * cO - cw * ci * sO) * yv,
                     (cw * sO + sw * ci * cO) * xv + (-sw * sO + cw * ci * cO) * yv,
                     (sw * si) * xv + (cw * si) * yv], -1)

def geo_arcmin(jd, truth, model):
    el = np.radians(100.46 + 0.9856474 * (jd - J2000))
    v = truth - np.stack([np.cos(el), np.sin(el), 0 * el], -1)
    dist = np.linalg.norm(v, axis=1); dv = model - truth
    along = (dv * v).sum(1) / dist
    perp = np.sqrt(np.maximum(0, (dv ** 2).sum(1) - along ** 2))
    return perp / dist * 206264.806 / 60

def fit(name, A):
    a, e, i, node, peri, M0 = BODIES[name][1]
    p = np.array([a, e, i, node, peri, M0, np.degrees(0.01720209895 / a ** 1.5)])
    jd = A[:, 0]; Y = A[:, 1:].ravel()
    for _ in range(80):
        f = position(p, jd).ravel(); J = np.empty((len(Y), 7))
        for k in range(7):
            h = 1e-8 * max(1, abs(p[k])); q = p.copy(); q[k] += h
            J[:, k] = (position(q, jd).ravel() - f) / h
        dp = np.linalg.lstsq(J, Y - f, rcond=None)[0]; p += dp
        if np.abs(dp).max() < 1e-13: break
    return p

def stats(p, A):
    err = geo_arcmin(A[:, 0], A[:, 1:], position(p, A[:, 0]))
    m = (A[:, 0] >= 2451544.5) & (A[:, 0] <= 2469807.5)
    return [err.max(), np.sqrt((err ** 2).mean()), err[m].max(), np.sqrt((err[m] ** 2).mean())]

for name in sys.argv[1:] or ['ceres', 'pallas', 'juno', 'vesta']:
    A = fetch(name)
    A = A[(A[:, 0] >= 2378496.5) & (A[:, 0] <= 2524593.5)]
    p = fit(name, A); ref = stats(p, A)
    out = p.copy()
    for k in range(7):
        for digits in range(4, 18):
            q = out.copy(); q[k] = float(f'{p[k]:.{digits}g}')
            if all(s <= r + 0.1 for s, r in zip(stats(q, A), ref)): out = q; break
    print(name, "1800-2200 max/RMS %.1f'/%.1f'  2000-2050 %.1f'/%.1f'" % tuple(stats(out, A)))
    keys = ['semiMajorAxis', 'eccentricity', 'inclination', 'longitudeOfAscendingNode',
            'argumentOfPerihelion', 'meanAnomalyAtEpoch', 'meanDailyMotion']
    print(json.dumps(dict(zip(keys, [float(v) for v in out]))))
