"""Shared adaptive Chebyshev fitting for small bodies (heliocentric J2000 ecliptic xyz).
Training = even rows of the 2-day Horizons grid; held-out = odd rows. Segment lengths are
chosen greedily (doubling + bisection, multiples of `grain` days) so that the max geocentric
error on TRAINING rows stays under `tol` arcsec. Optional Kepler base orbit: residual fit."""
import numpy as np
from numpy.polynomial import chebyshev as C
from load import load
from cheb import geo_err
J0,J1=2378496.5,2524593.5
DIRS={'chiron':'/workspace/chiron-data/vectors-2d','ceres':'/workspace/chiron-data/ast1-2d',
      'pallas':'/workspace/chiron-data/ast2-2d','juno':'/workspace/chiron-data/ast3-2d','vesta':'/workspace/chiron-data/ast4-2d'}
def sph_of(p):
    r=np.linalg.norm(p,axis=1); return np.stack([np.arctan2(p[:,1],p[:,0]),np.arcsin(p[:,2]/r),r],-1)
class Body:
    def __init__(s,name,base=None,sph=False,scale=1.0):
        s.A=load(DIRS[name]); s.base=base; s.sph=sph; s.scale=scale
        if base is None: s.R=s.A[:,1:].copy(); s.B=None
        elif not sph: s.B=base(s.A[:,0]); s.R=s.A[:,1:]-s.B
        else:
            s.B=sph_of(base(s.A[:,0])); t=sph_of(s.A[:,1:])
            dl=(t[:,0]-s.B[:,0]+np.pi)%(2*np.pi)-np.pi
            s.R=np.stack([dl*scale,(t[:,1]-s.B[:,1])*scale,t[:,2]-s.B[:,2]],-1)
    def to_xyz(s,sl,res):
        if s.base is None: return res
        if getattr(s,'F',None) is not None: res=res+s.F[sl]
        if not s.sph: return s.B[sl]+res
        b=s.B[sl]; l=b[:,0]+res[:,0]/s.scale; la=b[:,1]+res[:,1]/s.scale; r=b[:,2]+res[:,2]
        return np.stack([r*np.cos(la)*np.cos(l),r*np.cos(la)*np.sin(l),r*np.sin(la)],-1)
    def seg(s,a,L):
        i0=np.searchsorted(s.A[:,0],a-1e-9); i1=np.searchsorted(s.A[:,0],a+L+1e-9)
        return slice(i0,i1)
    def fit(s,a,L,ns,q):
        sl=s.seg(a,L); jd=s.A[sl,0]; even=(np.arange(sl.start,sl.stop)%2==0); even[0]=even[-1]=True  # endpoints always constrain the fit
        x=2*(jd-a)/L-1
        cs=[np.round(C.chebfit(x[even],s.R[sl][even,k],ns[k])/q) for k in range(3)]
        pr=np.stack([C.chebval(x,cs[k]*q) for k in range(3)],-1)
        e=geo_err(jd,s.A[sl,1:],s.to_xyz(sl,pr)-s.A[sl,1:])
        return cs,e[even].max(),e[~even]
def adaptive(body,ns,tol,q,grain,Lmax=40000):
    a=J0; segs=[]; held=[]
    Lmin=-(-8*(max(ns)+1)//grain)*grain   # >= 2 training rows per coefficient (no overfit)
    while a<J1-1e-6:
        ok=None; L=Lmin
        while True:   # doubling
            r=body.fit(a,L,ns,q)
            if r[1]<=tol: ok=(L,r); 
            else: break
            if a+L>=J1 or L>=Lmax: break
            L*=2
        if ok is None: ok=(Lmin,body.fit(a,Lmin,ns,q))
        elif not (a+ok[0]>=J1 or ok[0]>=Lmax):  # bisect between ok and 2*ok
            lo,hi=ok[0],ok[0]*2
            while hi-lo>grain:
                mid=(lo+hi)//2//grain*grain
                if mid<=lo: break
                r=body.fit(a,mid,ns,q)
                if r[1]<=tol: lo=mid; ok=(mid,r)
                else: hi=mid
        L,(cs,_,eh)=ok; segs.append((L,[[int(v) for v in c] for c in cs])); held.append(eh); a+=L
    return segs,np.concatenate(held)
def pack_ints(segs,grain):
    ints=[];prev=None
    for L,cs in segs:
        ints.append(L//grain)
        for k,c in enumerate(cs):
            if prev is None: ints+=c
            else: ints+=[sum(v*(-1)**j for j,v in enumerate(c))-prev[k]]+c[1:]
        prev=[sum(c) for c in cs]
    return ints
