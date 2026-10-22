// 디자인 검토용 화면 순회: 주요 화면을 데스크톱·모바일로 찍어 tests/out/shots/ 에 남긴다. 판정은 하지 않는다.
// 사용법: node tests/shots.mjs [desk|m]   (인자 없으면 둘 다)
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
// GAME_ROOT=dist 로 배포 빌드를 같은 기준으로 검사한다 (기본은 저장소 루트의 원본)
const SITE = process.env.GAME_ROOT ? join(ROOT, process.env.GAME_ROOT) : ROOT;
const OUT = join(ROOT, 'tests/out/shots');
await mkdir(OUT, { recursive: true });
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const server = createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '');
  try { const body = await readFile(join(SITE, path || 'index.html')); res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'application/octet-stream' }); res.end(body); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(0, r));
const BASE = `http://localhost:${server.address().port}/index.html`;
const browser = await chromium.launch();
const errors = [];

const VIEWS = { desk: { viewport: { width: 1366, height: 860 }, dpr: 1, touch: false }, m: { viewport: { width: 390, height: 844 }, dpr: 2, touch: true } };
const only = process.argv[2];

for (const [tag, v] of Object.entries(VIEWS)) {
  if (only && only !== tag) continue;
  const ctx = await browser.newContext({ viewport: v.viewport, deviceScaleFactor: v.dpr, hasTouch: v.touch, isMobile: v.touch });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(`${tag} ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`${tag} ${m.text()}`); });
  const shot = (name) => page.screenshot({ path: join(OUT, `${tag}-${name}.png`) });
  const click = (sel) => page.locator(sel).first().click();

  await page.goto(`${BASE}?seed=SHOTS-1`);
  await page.waitForSelector('[data-act="new"]');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(2600);
  await shot('01-title');
  await click('[data-act="new"]');
  await page.waitForSelector('.birth-screen');
  await page.waitForTimeout(2200);
  await shot('02-birth');
  await click('[data-act="start"]');
  await page.waitForSelector('.memory-card .choice:not(:disabled)', { state: 'visible' });
  await page.waitForTimeout(1200);
  await shot('03-childhood');
  for (let i = 0; i < 3; i++) { await page.waitForSelector('.memory-card .choice:not(:disabled)', { state: 'visible' }); await page.waitForTimeout(400); await click('.memory-card .choice:not(:disabled)'); await page.waitForTimeout(500); }
  await page.waitForSelector('.ticket');
  await page.waitForTimeout(900);
  await click('.ticket');
  await page.waitForTimeout(500);
  await shot('04-goal');
  await click('[data-act="confirm"]');
  await page.waitForSelector('.origin-screen');
  await page.waitForTimeout(2200);
  await shot('04b-origin');
  await click('.origin-screen [data-act="start"]');

  // 40대의 삶을 만들어 본 화면을 본다
  await page.waitForSelector('.plan-modal');
  await page.evaluate(async () => {
    const { playLife } = await import('./tests/play.mjs');
    const { s } = playLife('shots-life', 'social', { stopAtAge: 44 });
    window.__ui.state = s;
    await window.__ui.go('main');
  });
  await page.waitForSelector('.plan-modal', { timeout: 15000 });
  await page.waitForTimeout(1100);
  await shot('05-plan');
  await page.keyboard.press('t');
  await page.waitForSelector('.drawer');
  await page.waitForTimeout(900);
  await shot('06-traits');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  await page.keyboard.press('p');
  await page.waitForSelector('.drawer');
  await page.waitForTimeout(900);
  await shot('07-people');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  await click('.plan-modal [data-act="submit"]');
  await page.waitForTimeout(700);
  await page.evaluate(() => window.__ui.setSetting('speed', 4));
  let sawEvent = false, sawResult = false, sawLedger = false, sawChron = false;
  for (let k = 0; k < 900 && !(sawEvent && sawResult && sawLedger && sawChron); k++) {
    const phase = await page.evaluate(() => window.__ui.state?.phase);
    if (phase === 'event' && await page.$('.event-modal .choice:not(:disabled)')) {
      if (!sawEvent) { await page.waitForTimeout(1500); await shot('08-event'); sawEvent = true; }
      await click('.event-modal .choice:not(:disabled)').catch(() => {});
      if (!sawResult) { await page.waitForTimeout(1600); await shot('09-event-result'); sawResult = true; }
      await page.waitForTimeout(200);
    } else if (await page.$('.event-modal [data-act="continue"]')) { await click('.event-modal [data-act="continue"]').catch(() => {}); await page.waitForTimeout(250); }
    else if (phase === 'yearEnd' && await page.$('.ledger-modal [data-act="next"]')) {
      if (!sawLedger) { await page.waitForTimeout(1400); await shot('10-ledger'); sawLedger = true; }
      await click('.ledger-modal [data-act="next"]').catch(() => {}); await page.waitForTimeout(300);
    } else if (phase === 'plan' && await page.$('.plan-modal [data-act="submit"]')) { await click('.plan-modal [data-act="submit"]').catch(() => {}); await page.waitForTimeout(300); }
    else if (phase === 'running' && sawEvent && !sawChron && !(await page.$('.layer'))) {
      await page.evaluate(() => window.__ui.setSetting('speed', 1));
      await page.keyboard.press('Space');
      await page.waitForTimeout(700);
      await shot('11-chronicle'); sawChron = true;
      await page.keyboard.press('Space');
      await page.evaluate(() => window.__ui.setSetting('speed', 4));
    } else await page.waitForTimeout(120);
  }
  // 엔딩
  await page.evaluate(async () => {
    window.__ui.closeAll(true);
    const { playLife } = await import('./tests/play.mjs');
    const { s } = playLife('audit-ending-2', 'social', { stopAtAge: 63 });
    window.__ui.state = s;
    await window.__ui.go('main');
  });
  await page.waitForSelector('.plan-modal', { timeout: 15000 });
  await page.waitForTimeout(600);
  await click('[data-tab="money"]');
  await click('[data-act="retire"]');
  await click('[data-act="yes"]');
  await page.waitForSelector('.ending-screen', { timeout: 15000 });
  await page.waitForTimeout(3800);
  await shot('12-ending');
  await page.screenshot({ path: join(OUT, `${tag}-12b-ending-full.png`), fullPage: true });
  await ctx.close();
}
await browser.close();
server.close();
console.log(errors.length ? `오류 ${errors.length}건\n${errors.slice(0, 6).join('\n')}` : '오류 0건');
console.log(`스크린숏: ${OUT}`);
