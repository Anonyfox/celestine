import json,time,urllib.parse,urllib.request,sys
for t,name in [('2060;','chiron'),('1;','ceres'),('2;','pallas'),('3;','juno'),('4;','vesta')]:
    f=f'random400-{name}.json'
    jds=[r[0] for r in json.load(open(f))['rows']]; rows=[]
    for i in range(0,len(jds),50):
        q={'format':'text','COMMAND':f"'{t}'",'EPHEM_TYPE':"'OBSERVER'",'CENTER':"'500@399'",'QUANTITIES':"'31'",'TIME_TYPE':"'TT'",'CSV_FORMAT':"'YES'",'EXTRA_PREC':"'YES'",'TLIST':"'"+" ".join(map(str,jds[i:i+50]))+"'"}
        url='https://ssd.jpl.nasa.gov/api/horizons.api?'+urllib.parse.urlencode(q)
        for attempt in range(5):
            try: txt=urllib.request.urlopen(url,timeout=120).read().decode(); body=txt.split('$$SOE')[1]; break
            except Exception: time.sleep(5*(attempt+1))
        lines=body.split('$$EOE')[0].strip().splitlines()
        for jd,l in zip(jds[i:i+50],lines):
            f2=[x.strip() for x in l.split(',')]; rows.append([jd,float(f2[-3]),float(f2[-2])])
        time.sleep(1.5)
    json.dump({'source':f'JPL Horizons OBSERVER {t} geocentric 500@399, QUANTITIES 31 (ObsEcLon/ObsEcLat, apparent, true ecliptic of date), TT','rows':rows},open(f'obs400-{name}.json','w'))
    print(name,len(rows),rows[0])
