"""Label every Horizons event reference with its frame and derive mean-equinox references.

Horizons ObsEcLon (quantity 31) is apparent longitude in the TRUE ecliptic and equinox of
date (confirmed in frame.json) and has no mean-of-date option. For a frame-dependent event
(season, sign ingress, aspect to a fixed longitude) this script re-derives the crossing from
the cached Horizons samples twice:
  jd / bracket          Horizons native, true equinox of date;
  jdMean / bracketMean  mean equinox of date: Horizons longitude minus IAU 2000A nutation in
                        longitude (ERFA nut00a), computed independently of the library.
Phases and moving-body aspects are frame-free (both longitudes carry the same nutation).
When a 17-sample grid does not bracket a crossing, the grid is extended with the same step
using the same cached Horizons query as scripts/events/horizons.mjs.

Run after scripts/events/fetch-horizons.mjs:
  python3 -m venv /tmp/erfa-venv && /tmp/erfa-venv/bin/pip install pyerfa
  /tmp/erfa-venv/bin/python scripts/events/derive-frames.py
"""
import glob, hashlib, json, math, os, subprocess, time, urllib.parse
import erfa

DIR = os.path.join(os.path.dirname(__file__), '../../src/events/__fixtures__/')
IDS = {'Sun': '10', 'Moon': '301', 'Mercury': '199', 'Venus': '299', 'Mars': '499',
       'Jupiter': '599', 'Saturn': '699', 'Uranus': '799', 'Neptune': '899', 'Pluto': '999'}
BODY = {v: k for k, v in IDS.items()}
pos = {}
for f in glob.glob(DIR + 'requests/*.json'):
    d = json.load(open(f))
    if d['params']['QUANTITIES'] == '31':
        for jd, row in zip(d['params']['TLIST'].split('\n'), d['rows']):
            pos.setdefault(BODY[d['params']['COMMAND']], {})[jd] = float(row[3])


def query(body, dates):
    """Mirror of horizons.mjs query(): same parameters, URL hash and cache file."""
    params = {'format': 'json', 'COMMAND': IDS[body], 'CENTER': '500@399',
              'EPHEM_TYPE': 'OBSERVER', 'QUANTITIES': '31', 'TIME_TYPE': 'TT',
              'TLIST': '\n'.join(f'{d:.9f}' for d in dates), 'TLIST_TYPE': 'JD',
              'CSV_FORMAT': 'YES', 'REF_SYSTEM': 'ICRF', 'EXTRA_PREC': 'YES',
              'APPARENT': 'AIRLESS'}
    url = 'https://ssd.jpl.nasa.gov/api/horizons.api?' + urllib.parse.urlencode(
        {k: v if k == 'format' else f"'{v}'" for k, v in params.items()})
    file = DIR + 'requests/' + hashlib.sha256(url.encode()).hexdigest()[:20] + '.json'
    if not os.path.exists(file):
        out = subprocess.run(['curl', '-fsS', '--retry-all-errors', '--retry', '4',
                              '--retry-delay', '2', '--max-time', '90', url],
                             check=True, capture_output=True).stdout
        result = json.loads(out)['result']
        rows = [[v.strip() for v in s.split(',')]
                for s in result.split('$$SOE')[1].split('$$EOE')[0].strip().split('\n')]
        open(file, 'w').write(json.dumps({'params': params, 'rows': rows},
                                         separators=(',', ':'), ensure_ascii=False) + '\n')
        time.sleep(0.3)
    d = json.load(open(file))
    for jd, row in zip(d['params']['TLIST'].split('\n'), d['rows']):
        pos.setdefault(body, {})[jd] = float(row[3])


def wrap(x):  # JavaScript remainder semantics, bit-identical to fetch-horizons.mjs
    return math.fmod(math.fmod(x, 360) + 540, 360) - 180


def dpsi(jd):
    return math.degrees(erfa.nut00a(2400000.5, jd - 2400000.5)[0])


def crossing(r, mean):
    for lo in range(0, 64, 8):
        dates = [r['predicted'] + i * r['step'] for i in range(-8 - lo, 9 + lo)]
        missing = {b: [d for d in dates if f'{d:.9f}' not in pos.get(b, {})]
                   for b in [r['body']] + ([r['targetBody']] if 'targetBody' in r else [])}
        for b, m in missing.items():
            for i in range(0, len(m), 48):
                query(b, m[i:i + 48])

        def value(jd):
            k = f'{jd:.9f}'
            q = pos[r['targetBody']][k] if 'targetBody' in r else r.get('fixed', 0)
            c = dpsi(jd) if mean and 'targetBody' not in r else 0
            return wrap(pos[r['body']][k] - q - c - r['angle'])
        v = [value(d) for d in dates]
        hits = [i for i in range(len(v) - 1)
                if v[i] * v[i + 1] <= 0 and abs(v[i]) + abs(v[i + 1]) < 180]
        if hits:
            # Original grid: first bracket (as fetch-horizons.mjs); extended: nearest one.
            i = hits[0] if lo == 0 else min(hits, key=lambda i: abs(dates[i] - r['predicted']))
            t0, t1, v0, v1 = dates[i], dates[i + 1], v[i], v[i + 1]
            return t0 - v0 * (t1 - t0) / (v1 - v0), [t0, t1, v0, v1]
    raise SystemExit(f'No crossing near {r}')


events = json.load(open(DIR + 'horizons-events.json'))
for r in events:
    dependent = r['kind'] in ('season', 'ingress') or 'fixed' in r
    r['frame'] = 'true' if dependent else 'relative'
    r['jd'], r['bracket'] = crossing(r, False)
    if dependent:
        r['jdMean'], r['bracketMean'] = crossing(r, True)
    else:
        r.pop('jdMean', None), r.pop('bracketMean', None)
open(DIR + 'horizons-events.json', 'w').write(json.dumps(events, separators=(',', ':')) + '\n')
# Bound on the derivation: IAU 1980 (Horizons' documented of-date model before pole offsets)
# versus IAU 2000A nutation in longitude over the fixture span.
diff = max(abs(erfa.nut80(2400000.5, j - 2400000.5)[0] - erfa.nut00a(2400000.5, j - 2400000.5)[0])
           for j in range(2415020, 2488435, 5))
print(f'{sum("jdMean" in r for r in events)} mean-frame references; '
      f'max |nut80 - nut00a| dpsi 1900-2100 = {math.degrees(diff) * 3600:.4f} arcsec')
