"""Nine-constant Kepler fit; numpy only. Run measure-chiron.mjs first.
Even 2-day Horizons rows train; odd rows validate. Longitude residuals are
geocentric J2000 using the library Earth vector; latitude weakly regularizes.
Fit span: 1900–2101 (one year of endpoint padding); validation: 1900–2100.
No fitted constants are installed automatically.
"""
import json
import numpy as np
from pathlib import Path

rows = []
for f in sorted(Path('/workspace/chiron-data/vectors-2d').glob('*.json')):
    rows.extend(json.loads(f.read_text())['rows'])
a = np.unique(np.array(rows), axis=0)
a = a[(a[:, 0] >= 2415020.5) & (a[:, 0] < 2488434.5)]
earth = np.array(json.loads(Path('/tmp/chiron-earth.json').read_text()))
jd = a[:, 0]
t = (jd - 2451545) / 36525
radians = np.pi / 180
initial = np.array([13.607, .3793438805668402, 6.941566489467262,
    209.39667025637,339.1420138434362,27.99722096634838,
    2.273207179302781e-7*86400,.15,.25])

def xyz(p):
    aa,e,i,node,peri,m,n,nr,pr=p
    E = (m+n*(jd-2451545))*radians
    M = E.copy()
    for _ in range(20):
        E -= (E-e*np.sin(E)-M)/(1-e*np.cos(E))
    x=aa*(np.cos(E)-e); y=aa*np.sqrt(1-e*e)*np.sin(E)
    O=(node+nr*t)*radians; w=(peri+pr*t)*radians; i*=radians
    return np.stack([(np.cos(O)*np.cos(w)-np.sin(O)*np.sin(w)*np.cos(i))*x+(-np.cos(O)*np.sin(w)-np.sin(O)*np.cos(w)*np.cos(i))*y,
        (np.sin(O)*np.cos(w)+np.cos(O)*np.sin(w)*np.cos(i))*x+(-np.sin(O)*np.sin(w)+np.cos(O)*np.cos(w)*np.cos(i))*y,
        np.sin(w)*np.sin(i)*x+np.cos(w)*np.sin(i)*y],axis=1)

def angles(v):
    v=v-earth
    return np.stack([np.arctan2(v[:,1],v[:,0]),np.arctan2(v[:,2],np.hypot(v[:,0],v[:,1]))],axis=1)
reference=angles(a[:,1:])
def residual(p):
    d=(angles(xyz(p))-reference+np.pi)%(2*np.pi)-np.pi
    d[:,1]*=.1
    return d
train=np.arange(len(a))%2==0
p=initial.copy()
for iteration in range(50):
    f=residual(p)[train].ravel()
    J=[]
    for k in range(9):
        h=1e-6*max(abs(p[k]),.001)
        q=p.copy(); q[k]+=h
        J.append((residual(q)[train].ravel()-f)/h)
    dp=np.linalg.lstsq(np.array(J).T,-f,rcond=None)[0]
    scale=1
    while scale>1e-6 and np.linalg.norm(residual(p+scale*dp)[train])>=np.linalg.norm(f):
        scale/=2
    p+=scale*dp
    if np.max(abs(scale*dp))<1e-10: break
output={'constants':p.tolist(),'metric':'held-out geocentric J2000 longitude arcseconds, 4-day spacing','windows':[]}
for lo,hi in [(1900,1950),(1950,2000),(2000,2050),(2050,2100)]:
    from datetime import datetime,timezone
    def date(y): return datetime(y,1,1,tzinfo=timezone.utc).timestamp()/86400+2440587.5
    mask=(jd>=date(lo))&(jd<date(hi))&~train
    row={'window':f'{lo}–{hi}','samples':int(sum(mask))}
    for name,q in [('current',initial),('refit',p)]:
        e=residual(q)[mask,0]/radians*3600
        row[name]={'max':float(np.max(abs(e))),'rms':float(np.sqrt(np.mean(e*e)))}
    output['windows'].append(row)
Path('/tmp/chiron-refit.json').write_text(json.dumps(output,indent=2)+'\n')
print(json.dumps(output,indent=2))
