// 31층 완주 검증: node full.cjs <seed> <test 0|1> <god 0|1>
const { chromium } = require('playwright');
(async () => {
  const [seed, test, god] = [Number(process.argv[2] || 1), process.argv[3] !== '0', process.argv[4] !== '0'];
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n'))); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await pg.goto('file://' + require('path').resolve(__dirname, '..', 'index.html') + '');
  await pg.waitForTimeout(300);
  await pg.evaluate(([seed, test, god]) => { window.__speed = 8; window.__norender = true; window.__lastResult = null; test ? __proto.start2(seed) : __proto.start(seed); __proto.god(god); __proto.auto(true); }, [seed, test, god]);
  const t0 = Date.now(); let last = '', stuck = 0;
  while (Date.now() - t0 < 540000) {
    const s = await pg.evaluate(() => {
      if (window.__lastResult) return { done: window.__lastResult };
      if (__proto.scene === 'map') { const r = __proto.reach(); if (r[0] === 'final') { document.querySelector('.btn.big').click(); } else { const ns = r.map(id => __proto.run.map.byId[id]); const f = ns.find(n => ['fight', 'curse', 'boss'].includes(n.type)) || ns[0]; __proto.enter(window.__mix && Math.random() < 0.3 ? r[0] : f.id); } }
      return { k: __proto.scene + ':' + __proto.run.floor + ':' + Math.floor(__proto.run.time), floor: __proto.run.floor };
    });
    if (s.done) { const info = await pg.evaluate(() => ({ cts: __proto.run.cts.map(c => c.id + (c.act ? '@' + c.act : '') + (c.lv > 1 ? c.lv : '')).join(' '), tags: JSON.stringify(__proto.run.tagN), hp: __proto.st.maxHp, bless: JSON.stringify(__proto.run.blessings), quest: JSON.stringify(__proto.run.quest) })); console.log('RESULT', JSON.stringify(s.done), '\n', info.cts, '\n', info.tags, info.hp, info.bless, info.quest); break; }
    if (s.k === last) { if (++stuck > 60) { console.log('STUCK at', s.k, await pg.evaluate(() => document.getElementById('ui').innerText.slice(0, 300))); break; } } else stuck = 0; last = s.k;
    if (errs.length > 5) break;
    await pg.waitForTimeout(250);
  }
  console.log('seed', seed, 'real sec', Math.round((Date.now() - t0) / 1000), 'errors', errs.length, [...new Set(errs)].slice(0, 6).join('\n'));
  await b.close();
})();
