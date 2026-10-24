import numpy as np
from load import load
def kepler_xyz(p,jd):
    a,e,i,O,w,M0,n,de,di,dO,dw,da=p
    T=(jd-2451545.0)/36525
    e=e+de*T; i=i+di*T; O=O+dO*T; w=w+dw*T; a=a+da*T
    M=M0+n*(jd-2451545.0)
    E=M.copy()
    for _ in range(30): E=E-(E-e*np.sin(E)-M)/(1-e*np.cos(E))
    xv=a*(np.cos(E)-e); yv=a*np.sqrt(1-e*e)*np.sin(E)
    cO,sO,cw,sw,ci,si=np.cos(O),np.sin(O),np.cos(w),np.sin(w),np.cos(i),np.sin(i)
    x=(cO*cw-sO*sw*ci)*xv+(-cO*sw-sO*cw*ci)*yv
    y=(sO*cw+cO*sw*ci)*xv+(-sO*sw+cO*cw*ci)*yv
    z=(sw*si)*xv+(cw*si)*yv
    return np.stack([x,y,z],-1)
def fit_mean(A,step=10,nrate=12):
    S=A[::step]; jd=S[:,0]; Y=S[:,1:].ravel()
    d=np.radians
    p=np.array([13.65,0.3793,d(6.9416),d(209.3967),d(339.142),d(27.9972),d(2.2732e-7*86400),0,0,0,0,0.0])
    for it in range(40):
        f=kepler_xyz(p,jd).ravel(); r=Y-f
        J=np.empty((len(Y),nrate))
        for k in range(nrate):
            h=1e-7*max(1,abs(p[k])); q=p.copy(); q[k]+=h
            J[:,k]=(kepler_xyz(q,jd).ravel()-f)/h
        dp=np.linalg.lstsq(J,r,rcond=None)[0]
        p[:nrate]+=dp
        if np.abs(dp).max()<1e-12: break
    return p, np.sqrt((r**2).mean())
if __name__=='__main__':
    A=load(); m=(A[:,0]>=2378496.5)&(A[:,0]<=2524593.5); A=A[m]
    for nr in [7,11,12]:
        p,rms=fit_mean(A,nrate=nr)
        res=A[:,1:]-kepler_xyz(p,A[:,0])
        print(nr,'rms AU',rms,'max |res| AU',np.linalg.norm(res,axis=1).max())
        print(repr(p))
