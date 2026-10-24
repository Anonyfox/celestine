"""ERFA references: run after build; pip install pyerfa. No Celestine angles used.
IAU 1982 GMST, IAU 1980 mean obliquity (same cubic as Celestine).
UT1 approximates UT. Request records the model Delta T at each endpoint;
linear interpolation reproduces its smooth daily variation without using its astronomy.
"""
import json
import math
import pathlib
import subprocess
import erfa

root = pathlib.Path(__file__).resolve().parents[2]
request = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', '''
import {toTT,deltaTAt} from './dist/time/index.js';
const cases = [['Berlin spring','2026-03-29',52.52,13.405],
 ['Berlin summer','2026-06-21',52.52,13.405],['Quito','2026-03-29',-0.18,-78.47],
 ['Sydney','2026-06-21',-33.87,151.21],['Reykjavik','2026-06-21',64.15,-21.94]];
console.log(JSON.stringify(cases.map(([name,date,latitude,longitude])=>{
const ut=Date.parse(date+'T00:00:00Z')/86400000+2440587.5;
return {name,date,latitude,longitude,start:toTT(ut),end:toTT(ut+1),ut,
 deltaT:[deltaTAt(ut),deltaTAt(ut+1)]};})))
'''], cwd=root))

for case in request:
    def geometry(tt):
        fraction = (tt-case['start'])/(case['end']-case['start'])
        dt = case['deltaT'][0] + fraction*(case['deltaT'][1]-case['deltaT'][0])
        ut = tt-dt/86400
        return erfa.gmst82(2400000.5,ut-2400000.5)+math.radians(case['longitude']), erfa.obl80(2400000.5,ut-2400000.5)
    def residual(tt, sign):
        lst,eps=geometry(tt)
        lam=math.radians(sign*30)
        alpha=math.atan2(math.sin(lam)*math.cos(eps),math.cos(lam))
        delta=math.asin(math.sin(lam)*math.sin(eps))
        rising=alpha-math.acos(-math.tan(math.radians(case['latitude']))*math.tan(delta))
        return (lst-rising+math.pi)%(2*math.pi)-math.pi
    boundaries=[]
    for sign in range(12):
        for i in range(8):
            lo=case['start']+(case['end']-case['start'])*i/8
            hi=case['start']+(case['end']-case['start'])*(i+1)/8
            if residual(lo,sign)<=0<=residual(hi,sign):
                for _ in range(40):
                    mid=(lo+hi)/2
                    if residual(mid,sign)<0: lo=mid
                    else: hi=mid
                boundaries.append({'jd':(lo+hi)/2,'sign':sign})
    case['boundaries']=sorted(boundaries,key=lambda b:b['jd'])
(root/'src/events/__fixtures__/ascendant-signs.json').write_text(json.dumps({'source':'ERFA gmst82/obl80','cases':request},indent=2)+'\n')

subprocess.run(['npx', 'biome', 'format', '--write', 'src/events/__fixtures__/ascendant-signs.json'], cwd=root, check=True)
