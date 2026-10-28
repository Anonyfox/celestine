"""Generate independent ERFA references after fetching moon-node.json.

python3 -m venv /tmp/erfa-venv
/tmp/erfa-venv/bin/pip install pyerfa
/tmp/erfa-venv/bin/python scripts/bench/derive-angles.py
No Celestine calculations are imported. Existing fixtures are never overwritten.
"""
import datetime
import json
import math
import pathlib

import erfa
import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[2]

def write(relative, value):
    path = ROOT / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('x') as output:
        json.dump(value, output, indent=2)
        output.write('\n')

node_path = ROOT / 'src/ephemeris/__fixtures__/horizons-node/moon-node.json'
node_rows = json.loads(node_path.read_text())['rows']

rows = []
start = datetime.datetime(1900, 1, 1, tzinfo=datetime.timezone.utc)
end = datetime.datetime(2100, 1, 1, tzinfo=datetime.timezone.utc)
for i in range(208):
    date = start + (end - start) * (i / 207)
    if 0 < i < 207:
        date += datetime.timedelta(hours=13 * math.sin(i * 2.399963))
    jd = date.timestamp() / 86400 + 2440587.5
    latitude = -65 + 130 * ((i * 73) % 208) / 207
    longitude = -180 + 360 * ((i * 97) % 208) / 207
    lst = erfa.gmst82(2400000.5, jd - 2400000.5) + math.radians(longitude)
    eps = erfa.obl80(2400000.5, jd - 2400000.5)
    # Independent vector geometry: eastern intersection of ecliptic and horizon.
    zenith = np.array([math.cos(math.radians(latitude)) * math.cos(lst),
                       math.cos(math.radians(latitude)) * math.sin(lst),
                       math.sin(math.radians(latitude))])
    pole = np.array([0, -math.sin(eps), math.cos(eps)])
    rising = np.cross(pole, zenith)
    asc = math.degrees(math.atan2(rising[1] * math.cos(eps) + rising[2] * math.sin(eps), rising[0])) % 360
    mc = math.degrees(math.atan2(math.sin(lst), math.cos(lst) * math.cos(eps))) % 360
    rows.append(dict(jd=jd, date=date.isoformat(), latitude=latitude, longitude=longitude, ascendant=asc, midheaven=mc))
write('src/houses/__fixtures__/erfa-angles.json', dict(generated='2026-10-28', pyerfa=erfa.__version__, functions=['gmst82', 'obl80'], rows=rows))

references = []
# Horizons ECLIPTIC/ICRF uses the fixed 84381.448 arcsecond obliquity.
eps0 = math.radians(84381.448 / 3600)
rx = np.array([[1, 0, 0], [0, math.cos(eps0), -math.sin(eps0)], [0, math.sin(eps0), math.cos(eps0)]])
for row in node_rows:
    jd = row['jd']
    om, inc = map(math.radians, [row['ascendingNode'], row['inclination']])
    normal = np.array([math.sin(inc) * math.sin(om), -math.sin(inc) * math.cos(om), math.cos(inc)])
    # ecm06 includes IAU 2006 frame bias, precession and obliquity.
    normal_date = erfa.ecm06(2400000.5, jd - 2400000.5) @ rx @ normal
    true_reference = math.degrees(math.atan2(normal_date[0], -normal_date[1])) % 360
    mean_reference = math.degrees(erfa.faom03((jd - 2451545) / 36525)) % 360
    references.append(dict(jd=jd, osculatingNode=true_reference, meanNode=mean_reference))
write('src/ephemeris/__fixtures__/horizons-node/erfa-node.json', dict(generated='2026-10-28', pyerfa=erfa.__version__, functions=['ecm06', 'faom03'], rows=references))
