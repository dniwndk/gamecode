"""시너지 중심 조합에 탱커가 자연스럽게 들어가는지 센다(GDD v2.3 13.4).

학원·동아리 시너지 38개마다 그 시너지를 최고 단계까지 모은 뒤, 켜지는 시너지 단계가 가장 많이 늘어나는 학생을 하나씩 더해 8명 조합을 만든다
(탱커를 일부러 고르지 않는다). 조합에 탱커가 있으면 T.
사용: python3 scripts/balance/comp-tanks.py
"""
import json,os
D=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','..','src','content')+os.sep
U={u['id']:u for u in json.load(open(D+'units.json')) if u['shopEligible']}
S={s['id']:s for s in json.load(open(D+'synergies.json'))}
def run(tankset=None, extra_tank_tier1=False, verbose=False, size=8):
    tank=set(S['syn_tank']['memberIds']) if tankset is None else tankset
    syn_of={u:[s for s in U[u]['synergyIds'] if s in S and S[s]['category']!='easteregg'] for u in U}
    if tankset is not None:
        for u in U:
            syn_of[u]=[s for s in syn_of[u] if s not in('syn_tank','syn_attacker','syn_sniper','syn_blaster','syn_controller','syn_supporter','syn_healer')]+[r for r in [role_of[u]]]
    thr={s:[t['threshold'] for t in S[s]['tiers']] for s in S}
    if extra_tank_tier1: thr['syn_tank']=[1]+thr['syn_tank']
    def score(comp,core):
        cnt={}
        for u in comp:
            for s in syn_of[u]: cnt[s]=cnt.get(s,0)+1
        sc=0
        for s,c in cnt.items():
            t=sum(1 for x in thr[s] if c>=x)
            w=3 if s==core else (0.5 if S[s]['category']=='unique' else 1)
            sc+=t*w
        return sc
    def fits(comp,u):
        front=sum(1 for x in comp if U[x]['position']=='front_only'); rear=sum(1 for x in comp if U[x]['position']=='rear_only')
        p=U[u]['position']; both=len(comp)-front-rear
        if p=='front_only': front+=1
        elif p=='rear_only': rear+=1
        else: both+=1
        return front<=4 and rear<=6 and front+rear+both<=10 and (front+min(both,max(0,4-front)))>=0 and front + both >= 0 and (front<=4 and (both - max(0,6-rear)) <= max(0,4-front))
    res=[]
    cores=[s for s in S if S[s]['category'] in('faction','club')]
    for core in cores:
        comp=[]
        mem=sorted([u for u in S[core]['memberIds'] if u in U], key=lambda u:-U[u]['cost'])
        top=max([x for x in thr[core] if x<=min(len(mem),size)] or [0])
        for u in mem:
            if len([x for x in comp if core in syn_of[x]])>=top: break
            if fits(comp,u) and not (u=='u_hoshino_armed' and 'u_hoshino' in comp) and not (u=='u_hoshino' and 'u_hoshino_armed' in comp): comp.append(u)
        while len(comp)<size:
            cands=[u for u in U if u not in comp and fits(comp,u) and not (u=='u_hoshino_armed' and 'u_hoshino' in comp) and not (u=='u_hoshino' and 'u_hoshino_armed' in comp)]
            if not cands: break
            base=score(comp,core)
            gains={u:score(comp+[u],core)-base for u in cands}
            if max(gains.values())>0 or len(comp)==size-1:
                best=max(cands,key=lambda u:(gains[u], U[u]['cost']))
                comp.append(best); continue
            bp=None;bg=-1
            for i,a in enumerate(cands):
                for b in cands[i+1:]:
                    if not fits(comp+[a],b): continue
                    g=score(comp+[a,b],core)-base
                    k=(g,U[a]['cost']+U[b]['cost'])
                    if bp is None or k>bg: bp=(a,b);bg=k
            comp.extend(bp)
        has=any(u in tank for u in comp)
        res.append((core,has,comp))
    n=sum(h for _,h,_ in res)
    if verbose:
        for core,h,comp in res: print(('T ' if h else '- ')+S[core]['name'][:10].ljust(12), ', '.join(U[u]['name'].split()[-1] for u in comp))
    return n,len(res),res
role_of={}
if __name__=='__main__':
    n,t,_=run(verbose=True)
    tank=set(S['syn_tank']['memberIds'])
    cores=[s for s in S.values() if s['category'] in('faction','club')]
    print(f'탱커가 들어간 조합 {n}/{t}, 구성원에 탱커가 있는 시너지 {sum(1 for s in cores if tank & set(s["memberIds"]))}/{len(cores)}')
