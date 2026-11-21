// v0.10 추가분 확인: 첫 계약, 기세, 저스트 회피, 새 적, 보스 새 패턴, 상점 계약, 이벤트, 빛나는 축복
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message + (e.stack || '').split('\n').slice(0, 3).join(' | '))); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await pg.goto('file://' + require('path').resolve(__dirname, '..', 'index.html')); await pg.waitForTimeout(300);
  const r = await pg.evaluate(async () => {
    const out = {}; const wait = ms => new Promise(r => setTimeout(r, ms));
    window.__norender = true; window.__speed = 4; __proto.start(5);
    out.first = document.querySelector('.card-wrap h1').textContent + ' / ' + [...document.querySelectorAll('.card .grade')].map(x => x.textContent.slice(0, 2)).join(',');
    document.querySelector('.card').click(); await wait(60); if (Scene === 'menu') { const c = document.querySelector('.card:not([disabled])'); c && c.click(); await wait(60); }
    out.afterFirst = Scene + ' cts ' + Run.cts.length;
    __proto.god(true); __proto.enter(__proto.reach()[0]); await wait(400);
    // 기세
    P.hits = 0; addMomentum(20); out.rank = RANKS[rankIdx()].k + ' top ' + World.topRank; P.iframe = 0; playerHit({ dmg: 1, color: 'white' }); out.rankAfterHit = P.hits;
    // 저스트 회피
    P.iframe = 0.2; P.dashAt = gameTime; P.dashCharges = 0; const res = playerHit({ dmg: 5, color: 'red' }); out.just = `${res} justT ${P.justT.toFixed(1)} dash ${P.dashCharges} justs ${Run.justs}`;
    // 새 적
    World.enemies.push(makeEnemy('sniper', 300, 200), makeEnemy('splitter', P.x + 60, P.y), makeEnemy('splitter', P.x - 60, P.y));
    __proto.auto(true); await wait(5000);
    out.afterFight = `scene ${Scene} kills ${Run.kills}`;
    __proto.auto(false);
    // 분열
    if (Scene !== 'fight') { showMap(); __proto.enter(__proto.reach()[0]); await wait(300); }
    const sp = makeEnemy('splitter', 400, 300); World.enemies.push(sp); dealDamage(sp, { base: 9999, gen: 0, act: 'a1' }); out.split = World.enemies.filter(e => e.type === 'mite' && !e.dead).length;
    // 보스 패턴
    Run.tier = 3; startFight({ type: 'boss', mods: [], row: 10 }); Run.row = 10; await wait(1200);
    const bs = World.boss; bs.atk = null; bossAttack(bs, 'rain', 1); await wait(1500); out.rain = `marks/hits seen, atk ${bs.atk ? bs.atk.name : 'done'}`;
    bs.atk = null; bossAttack(bs, 'ring', 1); await wait(700); out.ring = World.projs.filter(p => p.owner === 'enemy').length;
    __proto.clear(); await wait(100); Run.tier = 1;
    // 상점 계약
    __proto.auto(false); Run.shards = 500; const n0 = Run.cts.length; showShop(); const it = document.querySelector('.shopitem.wide2'); out.shopItem = it ? it.querySelector('.iname').textContent : 'none'; if (it) { it.click(); await wait(50); const c = document.querySelector('.card.kwact:not([disabled])'); if (c) { c.click(); await wait(50); } const nb = [...document.querySelectorAll('.btn.big')].find(x => x.textContent === '계속'); if (nb) { nb.click(); await wait(50); } }
    out.shopAfter = `cts ${n0}->${Run.cts.length} shards ${Run.shards} back ${!!document.querySelector('.shop')}`;
    // 이벤트 전부
    const seen = new Set(); Run.node = Run.map.rows[2][0]; Run.row = 2;
    for (let i = 0; i < 60; i++) { showEvent(); const t = document.querySelector('.card-wrap h1').textContent; seen.add(t); document.querySelector('.card-wrap .btn').click(); await wait(10); for (let k = 0; k < 4 && Scene === 'menu'; k++) { const c = document.querySelector('.card:not([disabled])') || [...document.querySelectorAll('.btn.big')].find(x => x.textContent === '계속'); if (!c) break; c.click(); await wait(10); } }
    out.events = [...seen].join(', ') + ' / scene ' + Scene + ' hpMod ' + Run.hpMod;
    // 빛나는 축복
    let shiny = 0; for (let i = 0; i < 30; i++) { showBlessings(3, () => 0); shiny += document.querySelectorAll('.card .grade').length; } out.shiny = shiny + '/90';
    const b0 = JSON.stringify(Run.blessings); const sc = [...document.querySelectorAll('.card')].find(c => c.querySelector('.grade')); if (sc) { sc.click(); out.shinyPick = b0 + ' -> ' + JSON.stringify(Run.blessings); }
    return out;
  });
  console.log(r, 'errors', errs.length, [...new Set(errs)].slice(0, 8));
  await b.close();
})();
