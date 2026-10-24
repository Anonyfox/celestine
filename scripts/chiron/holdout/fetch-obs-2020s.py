# Held-out JPL Horizons apparent positions, 60 uniform-random epochs (TT) 2020-2030 per body.
# Usage: python3 fetch-obs-2020s.py  -> obs60-2020-2030-<body>.json
import json,random,time,urllib.parse,urllib.request
for seed,(t,name) in enumerate([('2060;','chiron'),('1;','ceres'),('2;','pallas'),('3;','juno'),('4;','vesta')]):
    rng=random.Random(20201+seed)
    jds=sorted(round(rng.uniform(2458849.5,2462502.5),4) for _ in range(60)); rows=[]
    for i in range(0,len(jds),30):
        q={'format':'text','COMMAND':f"'{t}'",'EPHEM_TYPE':"'OBSERVER'",'CENTER':"'500@399'",'QUANTITIES':"'31'",'TIME_TYPE':"'TT'",'CSV_FORMAT':"'YES'",'EXTRA_PREC':"'YES'",'TLIST':"'"+" ".join(map(str,jds[i:i+30]))+"'"}
        url='https://ssd.jpl.nasa.gov/api/horizons.api?'+urllib.parse.urlencode(q)
        for attempt in range(5):
            try: txt=urllib.request.urlopen(url,timeout=120).read().decode(); body=txt.split('$$SOE')[1]; break
            except Exception: time.sleep(5*(attempt+1))
        lines=body.split('$$EOE')[0].strip().splitlines()
        assert len(lines)==len(jds[i:i+30])
        for jd,l in zip(jds[i:i+30],lines):
            f2=[x.strip() for x in l.split(',')]; rows.append([jd,float(f2[-3]),float(f2[-2])])
        time.sleep(1.5)
    json.dump({'source':f'JPL Horizons OBSERVER {t} geocentric 500@399, QUANTITIES 31 (ObsEcLon/ObsEcLat, apparent, true ecliptic of date), TT; 60 random epochs 2020-2030 (seed {20201+seed}), fetched 2026-10-24','rows':rows},open(f'obs60-2020-2030-{name}.json','w'),indent=None)
    print(name,len(rows),rows[0])
