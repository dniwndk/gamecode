from sim import run
from run import B1,B5,cfg_v21,cfg_v22,plans
import statistics as S
def v22f():
    c=cfg_v22(); c.update(base=[6,7,8]); return c
keep=[10,10,20,20,30,30,30,30,30,30,20,10,0,0,0]
for name,cf in [('v2.1',cfg_v21),('v2.2',v22f)]:
  for bn,B in [('F.01 아비도스',B1),('F.06B 산해경',B5)]:
    c=cf(); c['keep']=keep
    lv=[];st=[];fin=[];l8=[]
    for sd in range(1000):
        log,rr,cp=run(c,B,sd,plans['steady'])
        lv.append(log[12][1]); st.append(log[12][2]); fin.append(sum(1 for u in B if cp[u]>=3**(B[u][1]-1)))
        l8.append(next((b for b,l,s,g in log if l>=8),99))
    print(f"{name}|{bn}|{S.mean(l8):.1f}|{S.mean(st):.1f}|{S.mean(fin):.1f}")
