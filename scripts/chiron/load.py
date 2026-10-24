import json,glob,numpy as np
def load(d='/workspace/chiron-data/vectors-2d'):
    rows=[]
    for f in sorted(glob.glob(d+'/*.json')): rows+=json.load(open(f))['rows']
    a=np.array(rows,float); a=a[np.argsort(a[:,0])]
    _,i=np.unique(a[:,0],return_index=True); return a[i]
if __name__=='__main__':
    a=load(); print(a.shape,a[0,0],a[-1,0],np.unique(np.diff(a[:,0])))
    r=np.linalg.norm(a[:,1:],axis=1); print('r',r.min(),r.max())
