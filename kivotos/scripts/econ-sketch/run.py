import sys; sys.path.insert(0,'.')
from sim import run
import statistics as S
# build: unit -> (costIndex0, targetStar)
B1={'hoshino':(3,2),'shiroko':(1,2),'nonomi':(2,2),'serika':(0,2),'ayane':(1,2),'momoi':(1,2),'kotama':(0,2),'fuuka':(1,2)}
B5={'kisaki':(4,1),'yuuka':(1,2),'shun':(1,2),'mina':(2,2),'cherino':(3,2),'kokona':(0,2),'nodoka':(0,2),'ako':(3,1)}
def cfg_v21():
    return dict(start_gold=10,xpneed=[4,8,12,20,28,36,44],base=[5,5,5],icap=5,istep=10,bxp=2,
        streak=lambda a:0, keep=[0]*15, winp=lambda b,s,l:0.6)
def cfg_v22():
    return dict(start_gold=10,xpneed=[2,6,10,18,26,34,42],base=[5,6,7],icap=5,istep=10,bxp=3,
        streak=lambda a:0 if a<2 else (1 if a<4 else (2 if a<6 else 3)), keep=[0]*15, winp=lambda b,s,l:0.6)
plans={'steady':[3,4,4,5,5,6,6,7,7,7,8,8,8,8,8],'fast':[4,5,5,6,6,7,7,8,8,8,8,8,9,9,9]}
for name,cf in [('v2.1',cfg_v21),('v2.2',cfg_v22)]:
  for bname,B in [('F01',B1),('F06B',B5)]:
    for pn,pl in plans.items():
      for keepmode in ['spend','keep30']:
        c=cf()
        if keepmode=='keep30': c['keep']=[10,10,20,20,30,30,30,30,30,30,20,10,0,0,0]
        lv=[];st=[];full=[];lvl_at12=[]
        for sd in range(400):
            log,rr,cp=run(c,B,sd,pl)
            b13=log[12]; lv.append(b13[1]); st.append(b13[2]); lvl_at12.append(log[11][1])
            full.append(sum(1 for u in B if cp[u]>=3**(B[u][1]-1)))
        print(f"{name} {bname} {pn:6} {keepmode:6}  L@b13={S.mean(lv):.1f}  2star@b13={S.mean(st):.1f}/8  targetsDone@end={S.mean(full):.1f}/8")
print('--- tuning')
def mk(**kw):
    c=cfg_v22(); c.update(kw); return c
variants={
 'A base5/6/7 bxp3 xpcurveB':mk(),
 'B base6/7/8':mk(base=[6,7,8]),
 'C base6/7/8 bxp4':mk(base=[6,7,8],bxp=4),
 'D base6/7/8 bxp4 start15':mk(base=[6,7,8],bxp=4,start_gold=15),
 'E base6/7/8 bxp4 icap6':mk(base=[6,7,8],bxp=4,icap=6),
}
for vn,c0 in variants.items():
  for bname,B in [('F01',B1),('F06B',B5)]:
    import copy
    c=dict(c0); c['keep']=[10,10,20,20,30,30,30,30,30,30,20,10,0,0,0]
    lv=[];st=[];fin=[];gold=[]
    for sd in range(400):
        log,rr,cp=run(c,B,sd,plans['steady'])
        lv.append(log[12][1]); st.append(log[12][2]); fin.append(sum(1 for u in B if cp[u]>=3**(B[u][1]-1)))
    print(f"{vn:28} {bname} L@b13={S.mean(lv):.1f} 2star@b13={S.mean(st):.1f}/8 targetsDone@end={S.mean(fin):.1f}/8")
