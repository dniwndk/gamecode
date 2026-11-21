// 계약을 하나씩(그리고 전부) 맺고 봇으로 싸워 오류가 없는지 확인
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await pg.goto('file://' + require('path').resolve(__dirname, '..', 'index.html') + '');
  await pg.waitForTimeout(500);
  const ids = await pg.evaluate(() => __proto.contracts.map(c => ({ id: c.id, act: c.act, on: c.on })));
  console.log('contracts', ids.length);
  const groups = [];
  for (const c of ids) groups.push([c]);
  groups.push(ids); // 전부
  let gi = 0;
  for (const g of groups) {
    gi++;
    await pg.evaluate(() => { window.__speed = 4; window.__norender = true; __proto.start(7); __proto.god(true); __proto.auto(true); __proto.enter(__proto.reach()[0]); });
    await pg.waitForTimeout(150);
    await pg.evaluate(g => { for (const c of g) { if (c.act === 'pick') for (const a of c.on) __proto.ct(c.id, a); else __proto.ct(c.id, c.act); } __proto.player.ult = 1; }, g);
    const n0 = errs.length;
    await pg.waitForTimeout(g.length > 1 ? 12000 : 2500);
    const st = await pg.evaluate(() => ({ t: __proto.run.time, scene: __proto.scene, cts: __proto.run.cts.length, kills: __proto.run.kills, hp: __proto.run.hp }));
    if (errs.length > n0) console.log('ERR in', g.map(c => c.id).join(',').slice(0, 60), errs.slice(n0, n0 + 3));
    if (g.length > 1 || gi % 15 === 0) console.log('all:', JSON.stringify(st));
    await pg.evaluate(() => { __proto.auto(false); document.querySelectorAll('.toast').forEach(t => t.remove()); });
  }
  console.log('errors total', errs.length, [...new Set(errs)].slice(0, 10));
  await b.close();
})();
