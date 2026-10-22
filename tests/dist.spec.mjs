// 배포 빌드(dist/)를 실제 브라우저로 검사한다: 설치형 웹앱(매니페스트·아이콘), 서비스 워커, 오프라인 플레이,
// 새 판본 알림, 홈 화면 설치 안내(iOS 사파리·크롬 계열), 휴대폰 화면에서 끝까지 한 해 넘기기.
// 사용법: npm run build && node tests/dist.spec.mjs   (playwright 필요)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIST = join(ROOT, 'dist');
const require = createRequire(import.meta.url);
let chromium, devices;
try { ({ chromium, devices } = require('playwright')); } catch { ({ chromium, devices } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
// swPatch: 서비스 워커 내용을 바꿔 "새 판본이 올라왔다"를 흉내 낸다
let swPatch = null;
const server = createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '').replace(/^game\/?/, '') || 'index.html';
  try {
    let body = await readFile(join(DIST, path));
    if (path === 'sw.js' && swPatch) body = Buffer.from(swPatch(body.toString()));
    res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'application/octet-stream', 'cache-control': 'no-cache' });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(0, r));
// GitHub Pages처럼 하위 경로(/game/)에서 연다: 경로가 모두 상대 경로여야 통과한다
const BASE = `http://localhost:${server.address().port}/game/`;

const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`); };
const browser = await chromium.launch();
const issues = [];
let offline = false; // 일부러 끊은 동안의 실패한 요청은 셈하지 않는다
const watch = (page) => {
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') issues.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', e => issues.push('pageerror: ' + e.message));
  page.on('requestfailed', r => { if (!offline) issues.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`); });
};
const until = async (page, fn, ms = 15000, arg) => { const t = Date.now(); while (Date.now() - t < ms) { if (await page.evaluate(fn, arg).catch(() => false)) return true; await page.waitForTimeout(100); } return false; };
const ready = (page) => page.waitForSelector('.title-menu .menu-item', { state: 'visible' });

// ───────── 1. 매니페스트와 아이콘 ─────────
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage(); watch(page);
  await page.goto(BASE); await ready(page);
  const href = await page.getAttribute('link[rel="manifest"]', 'href');
  const man = await page.evaluate(async (h) => (await fetch(h)).json(), href);
  const sizes = await page.evaluate(async (icons) => Promise.all(icons.map(async (i) => {
    const img = new Image(); img.src = i.src; await img.decode(); return `${img.naturalWidth}x${img.naturalHeight}` === i.sizes;
  })), man.icons);
  check('매니페스트: 이름·시작 주소·standalone·아이콘(일반·maskable 192/512)',
    man.name === '황동의 생애' && man.start_url === './' && man.display === 'standalone' && man.icons.length === 4 && man.icons.some(i => i.purpose === 'maskable' && i.sizes === '512x512') && sizes.every(Boolean),
    `${man.icons.length}개 · 실제 크기 일치 ${sizes.filter(Boolean).length}/${sizes.length}`);
  const apple = await page.evaluate(async () => { const h = document.querySelector('link[rel="apple-touch-icon"]').href; const img = new Image(); img.src = h; await img.decode(); return img.naturalWidth; });
  check('iOS 홈 화면 아이콘 180px · 앱 이름 메타', apple === 180 && await page.getAttribute('meta[name="apple-mobile-web-app-title"]', 'content') === '황동의 생애');
  const bundle = await page.evaluate(() => [...document.querySelectorAll('script[src], link[rel="stylesheet"]')].map(n => n.getAttribute('src') || n.getAttribute('href')));
  check('묶음 빌드: 스크립트 1개 · 스타일 1장(지문 붙은 이름)', bundle.length === 2 && bundle.every(s => /assets\/(app|style)-[0-9a-f]{10}\.(js|css)$/.test(s)), bundle.join(', '));
  await ctx.close();
}

// ───────── 2. 서비스 워커 · 오프라인 플레이 ─────────
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 820 } });
  const page = await ctx.newPage(); watch(page);
  await page.goto(BASE); await ready(page);
  const controlled = await until(page, async () => { const r = await navigator.serviceWorker.getRegistration(); return !!r?.active; }, 15000);
  const cached = await page.evaluate(async () => { const keys = await caches.keys(); const c = await caches.open(keys.find(k => k.startsWith('brass-life-'))); return (await c.keys()).length; });
  check('서비스 워커 활성 · 사전 캐시 채움', controlled && cached >= 10, `캐시 ${cached}개`);

  await ctx.setOffline(true); offline = true;
  await page.reload(); await ready(page);
  const font = await page.evaluate(async () => { await document.fonts.ready; return document.fonts.check('16px RIDIBatang'); });
  await page.click('[data-act="new"]');
  await page.waitForSelector('.birth-screen', { timeout: 10000 });
  check('인터넷을 끊고 새로고침해도 타이틀·리디바탕·출생 화면이 열린다', font && await page.isVisible('.birth-screen'));
  await page.goto(`${BASE}?seed=OFFLINE-SEED`); await ready(page);
  check('오프라인에서 ?seed= 주소로 열어도 같은 판본으로 열린다', await page.isVisible('.title-menu'));
  await ctx.setOffline(false); offline = false;

  // 새 판본: 서비스 워커 내용이 바뀌면 알림 → 「적용」 → 다시 열리고 새 캐시로 바뀐다
  const before = await page.evaluate(async () => (await caches.keys()).find(k => k.startsWith('brass-life-')));
  swPatch = (s) => s.replace(/brass-life-([0-9a-f]+)'/, "brass-life-$1x'");
  await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
  const toast = await page.waitForSelector('.toast--act .t-act', { timeout: 15000 }).catch(() => null);
  check('새 판본이 올라오면 「적용」 버튼이 달린 알림이 뜨고 사라지지 않는다', !!toast && (await page.waitForTimeout(4500), await page.isVisible('.toast--act')));
  const nav = page.waitForNavigation({ timeout: 15000 }).catch(() => null);
  await toast?.click();
  await nav; await ready(page);
  const after = await until(page, async (b) => { const k = await caches.keys(); return k.some(x => x.startsWith('brass-life-') && x !== b) && !k.includes(b); }, 15000, before);
  check('「적용」을 누르면 다시 열리고 옛 캐시는 지워진다', after);
  swPatch = null;
  await ctx.close();
}

// ───────── 3. iPhone 사파리: 설치 안내 ─────────
{
  const ctx = await browser.newContext({ ...devices['iPhone 13'], defaultBrowserType: undefined });
  const page = await ctx.newPage(); watch(page);
  await page.goto(BASE); await ready(page);
  const item = await page.$('.menu-item--install');
  check('iPhone: 타이틀 메뉴 끝에 「기기에 설치」가 보인다', !!item && await item.isVisible());
  await page.tap('.menu-item--install');
  await page.waitForSelector('.install-guide', { state: 'visible' });
  const steps = await page.locator('.ig-steps li').allTextContents();
  check('iPhone: 공유 → 홈 화면에 추가 → 추가 3단계 안내', steps.length === 3 && steps[0].includes('공유') && steps[1].includes('홈 화면에 추가'), steps.map(s => s.trim().slice(0, 14)).join(' / '));
  const wide = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
  const small = await page.evaluate(() => [...document.querySelectorAll('.install-guide button, .menu-item')].filter(b => b.offsetParent && (b.offsetHeight < 44)).length);
  check('iPhone: 가로 넘침 없음 · 누르는 곳 44px 이상', wide && small === 0);
  await page.screenshot({ path: join(ROOT, 'tests/out/dist-iphone-install.png') });
  await ctx.close();
}

// ───────── 4. 크롬 계열: 설치 요청이 늦게 와도 메뉴에 떠오르고, 설정 「기기」 칸에서 설치 ─────────
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 820 } });
  const page = await ctx.newPage(); watch(page);
  await page.goto(BASE); await ready(page);
  const none = !(await page.$('.menu-item--install'));
  await page.evaluate(() => {
    const e = new Event('beforeinstallprompt', { cancelable: true });
    e.prompt = () => { window.__prompted = true; };
    e.userChoice = Promise.resolve({ outcome: 'accepted' });
    dispatchEvent(e);
  });
  const shown = await page.waitForSelector('.menu-item--install', { state: 'visible', timeout: 3000 }).catch(() => null);
  check('데스크톱 크롬: 설치 요청 전엔 숨김, 요청이 오면 메뉴 끝에 떠오른다', none && !!shown);
  await page.click('[data-act="settings"]');
  await page.waitForSelector('.drawer [data-act="install"]', { state: 'visible' });
  const ver = await page.textContent('.set-ver');
  await page.click('.drawer [data-act="install"]');
  check('설정 「기기」 칸: 판본 표시 · 「설치」가 브라우저 설치 창을 부른다', /판본 \d{4}\.\d{2}\.\d{2}·[0-9a-f]{6}/.test(ver) && await page.evaluate(() => window.__prompted === true), ver.trim());
  await page.evaluate(() => dispatchEvent(new Event('appinstalled')));
  const gone = await until(page, () => !document.querySelector('.menu-item--install'), 3000);
  check('설치를 마치면 「기기에 설치」 항목이 걷힌다', gone);
  await ctx.close();
}

// ───────── 5. 휴대폰(안드로이드 크기·터치)에서 출생부터 첫 결산까지 ─────────
{
  const ctx = await browser.newContext({ ...devices['Pixel 7'] });
  const page = await ctx.newPage(); watch(page);
  await page.goto(`${BASE}?seed=DIST-MOBILE`); await ready(page);
  await page.tap('[data-act="new"]');
  await page.waitForSelector('.birth-screen');
  await page.tap('[data-act="start"]');
  for (let i = 0; i < 3; i++) { await page.waitForSelector('.memory-card .choice:not(:disabled)', { state: 'visible' }); await page.waitForTimeout(200); await page.locator('.memory-card .choice').first().tap(); await page.waitForTimeout(500); }
  await page.waitForSelector('.ticket'); await page.locator('.ticket').first().tap();
  await page.tap('[data-act="confirm"]');
  await page.waitForSelector('.plan-modal [data-act="submit"]');
  await page.evaluate(() => window.__ui.setSetting('speed', 8));
  let ledger = false;
  for (let k = 0; k < 600 && !ledger; k++) {
    const phase = await page.evaluate(() => window.__ui.state?.phase);
    const tapIf = async (sel) => { const n = await page.$(sel); if (n && await n.isVisible()) { await n.tap().catch(() => {}); await page.waitForTimeout(250); return true; } return false; };
    if (phase === 'plan') await tapIf('.plan-modal [data-act="submit"]');
    else if (phase === 'event') { if (!await tapIf('.event-modal .choice:not(:disabled)')) await tapIf('.event-modal [data-act="continue"]'); }
    else if (phase === 'yearEnd') ledger = !!await page.$('.ledger-modal [data-act="next"]');
    else await page.waitForTimeout(100);
  }
  const wide = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
  check('휴대폰 터치만으로 출생 → 계획 → 사건 → 연말 결산까지, 가로 넘침 없음', ledger && wide);
  await page.screenshot({ path: join(ROOT, 'tests/out/dist-pixel-ledger.png') });
  await ctx.close();
}

check('배포 빌드 검사 전 과정 콘솔 에러·경고·실패한 요청 0건', issues.length === 0, issues.slice(0, 4).join(' | '));
await browser.close();
server.close();
const failed = results.filter(r => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} 통과`);
process.exit(failed ? 1 : 0);
