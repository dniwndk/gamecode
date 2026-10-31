import random, statistics, sys
ODDS={3:[70,25,5,0,0],4:[55,30,15,0,0],5:[40,35,20,5,0],6:[25,35,30,10,0],7:[18,27,35,18,2],8:[12,20,35,27,6],9:[8,15,27,35,15],10:[5,10,20,40,25]}
NC=[12,14,14,10,10]
def run(cfg, build, seed, levelplan, treasury=0):
    R=random.Random(seed)
    gold=cfg['start_gold']; lvl=3; xp=0; copies={u:0 for u in build}
    xpneed=cfg['xpneed']; streak=0; log=[]
    rerolls=0
    for b in range(15):
        ch=b//5
        # node free shop
        def shop():
            out=[]
            for i in range(5):
                c=R.choices(range(5),ODDS[lvl])[0]
                cand=[u for u,(cc,k) in build.items() if cc==c]
                if i==4 and R.random()<0.5:
                    K=len(cand) if cand else 0
                    if K: out.append(R.choice(cand)); continue
                # each target unit chosen with prob 1/N
                if cand and R.random()< len(cand)/NC[c]: out.append(R.choice(cand))
            return out
        def buy(offers):
            nonlocal gold
            for u in offers:
                c=build[u][0]+1
                if copies[u]<3**(build[u][1]-1) and gold>=c: copies[u]+=1; gold-=c
        # level up to plan
        target=levelplan[b]
        while lvl<target and lvl<10 and gold>=4:
            gold-=4; xp+=4
            while lvl<10 and xp>=xpneed[lvl-3]: xp-=xpneed[lvl-3]; lvl+=1
        buy(shop())
        keep = cfg['keep'][b]
        while gold-2>=keep and any(copies[u]<3**(build[u][1]-1) for u in build):
            gold-=2; rerolls+=1; buy(shop())
        # battle: win prob rises with progress (proxy)
        st2=sum(1 for u in build if copies[u]>=3)
        win = R.random() < cfg['winp'](b, st2, lvl)
        start=gold
        interest=min(cfg['icap'], start//cfg['istep'])
        inc=cfg['base'][ch]+(1 if win else 0)+interest
        streak = (streak+1 if streak>=0 else 1) if win else (streak-1 if streak<=0 else -1)
        a=abs(streak); inc+= cfg['streak'](a)
        gold+=inc; xp+=cfg['bxp']
        while lvl<10 and xp>=xpneed[lvl-3]: xp-=xpneed[lvl-3]; lvl+=1
        log.append((b+1,lvl,st2,gold))
    return log, rerolls, copies
