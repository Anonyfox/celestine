import numpy as np, zlib, sys
from numpy.polynomial import chebyshev as C
from load import load
A=load()
J0,J1=2378496.5,2524593.5  # 1800-01-01 .. 2200-01-01
def earth(jd):
    d=jd-2451545.0; L=np.radians(100.46646+0.98564736*d); g=np.radians(357.529+0.98560028*d)
    L=L+np.radians(1.915*np.sin(g)); r=1.00014-0.01671*np.cos(g)
    return np.stack([r*np.cos(L),r*np.sin(L),0*L],-1)
def geo_err(jd,p,dp):
    g=p-earth(jd); dist=np.linalg.norm(g,axis=-1,keepdims=True); u=g/dist
    perp=dp-(dp*u).sum(-1,keepdims=True)*u
    return np.linalg.norm(perp,axis=-1)/dist[:,0]*206264.806
def fit(L,n,q=None,train_step=2):
    nseg=int(np.ceil((J1-J0)/L)); coefs=[]; errs=[]
    for s in range(nseg):
        a,b=J0+s*L,J0+(s+1)*L
        m=(A[:,0]>=a-1e-9)&(A[:,0]<=b+1e-9); seg=A[m]
        tr=seg[::train_step]; te=seg[1::2] if train_step==2 else seg
        x=lambda jd:2*(jd-a)/L-1
        cs=[C.chebfit(x(tr[:,0]),tr[:,k],n) for k in (1,2,3)]
        if q: cs=[np.round(c/q)*q for c in cs]
        coefs.append(cs)
        pred=np.stack([C.chebval(x(te[:,0]),c) for c in cs],-1)
        errs.append(geo_err(te[:,0],te[:,1:],pred-te[:,1:]))
    e=np.concatenate(errs); return nseg,np.array(coefs),e
def encode_bytes(coefs,q):
    ints=np.round(coefs/q).astype(np.int64).ravel()
    out=bytearray()
    for v in ints:
        z=(v<<1)^(v>>63)
        while True:
            b=z&0x3f; z>>=6
            if z: out.append(0x40+b)   # 6-bit groups, continuation
            else: out.append(0x23+b if b<0x3f-0x23+0x23 else b); break
    return out
if __name__=='__main__':
    for L in [500,1000,2000,3000,4000,6000,8000]:
        for n in [6,8,10,12,14,16,20]:
            ns,cf,e=fit(L,n)
            nc=cf.size
            if e.max()>50: continue
            print(f"L={L:5d} n={n:2d} segs={ns:3d} coefs={nc:5d} max={e.max():8.3f}\" rms={np.sqrt((e**2).mean()):7.3f}\"")
