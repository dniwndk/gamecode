const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + require('path').resolve(__dirname, '..', 'index.html') + ''); await pg.waitForTimeout(300);
  const r = await pg.evaluate(async () => {
    const out = {}; const wait = ms => new Promise(r => setTimeout(r, ms));
    window.__norender = true; __proto.start(21);
    takeContract('transmute', null, () => 0); out.transmute = Run.cts.map(c => CT[c.id].grade + ':' + c.id).join(',');
    Run.cts = []; takeContract('pandora', null, () => 0); out.pandora = Run.cts.map(c => CT[c.id].grade + ':' + c.id).join(',');
    Run.cts = []; recalc(); takeContract('iou', null, showMap); await wait(50); out.iou = document.querySelector('.card-wrap h1').textContent + ' / floors ' + Run.iouFloors + ' taken x' + St.dmgTaken.toFixed(2);
    showMap(); Run.cts = []; Run.iouFloors = 0; for (const id of ['glasssoul', 'danger', 'seal', 'forsake']) takeContract(id, CT[id].act);
    out.debt = JSON.stringify(Run.tagN) + ` hp ${St.maxHp} parry ${St.parryWin.toFixed(3)} spinCd ${St.spinCd.toFixed(2)} dmg ${St.dmg.toFixed(2)}`;
    Run.cts = []; recalc(); takeContract('quest'); Run.quest.k = 'guard'; Run.quest.n = 29; questAdd('guard'); out.quest = JSON.stringify(Run.quest) + ' picks ' + Run.questPicks;
    takeContract('secondwind'); takeContract('barrier', 'guard'); takeContract('calm');
    __proto.enter(__proto.reach()[0]); await wait(1500);
    addShield(8, 3); const hp0 = Run.hp; playerHit({ dmg: 5, color: 'white' }); out.shield = `hp ${hp0}->${Run.hp} shield ${shieldTotal()}`;
    P.iframe = 0; Run.hp = 1; playerHit({ dmg: 50, color: 'white' }); out.secondwind = `alive ${P.alive} hp ${Run.hp} owned ${C('secondwind')} spent ${Run.spent.has('secondwind')}`;
    P.iframe = 0; P.shields = []; Run.hp = 1; playerHit({ dmg: 50, color: 'white' }); out.death = `alive ${P.alive}`;
    return out;
  });
  console.log(r, errs);
  await b.close();
})();
