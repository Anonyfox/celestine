import numpy as np
from fitlib import Body, J0, J1
from kep import kepler_xyz
INIT={'ceres':[2.766,0.0784,10.583,80.494,73.923,6.177],'pallas':[2.772,0.2310,34.846,173.17,310.22,352.98],
      'juno':[2.668,0.2582,12.971,170.11,247.89,269.83],'chiron':[13.65,0.3793,6.9416,209.3967,339.142,27.9972],'vesta':[2.362,0.0890,7.134,103.95,150.75,343.12]}
_cache={}
def base_params(name):
    if name in _cache: return _cache[name]
    b0=Body(name); A=b0.A[(b0.A[:,0]>=J0)&(b0.A[:,0]<=J1)]
    d=np.radians; a,e,i,O,w,M=INIT[name]
    p=np.array([a,e,d(i),d(O),d(w),d(M),0.01720209895/a**1.5,0,0,0,0,0.])
    S=A[::10]; jd=S[:,0]; Y=S[:,1:].ravel()
    for nr in (7,12):
        for it in range(40):
            f=kepler_xyz(p,jd).ravel(); r=Y-f; J=np.empty((len(Y),nr))
            for k in range(nr):
                h=1e-8*max(1,abs(p[k])); q=p.copy(); q[k]+=h; J[:,k]=(kepler_xyz(q,jd).ravel()-f)/h
            dp=np.linalg.lstsq(J,r,rcond=None)[0]; p[:nr]+=dp
            if np.abs(dp).max()<1e-13: break
    _cache[name]=p; return p
