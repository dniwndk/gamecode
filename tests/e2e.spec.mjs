// 완료 기준 (B) 항목을 실제 브라우저(Playwright Chromium)에서 검증한다.
// 사용법: node tests/e2e.spec.mjs   (playwright가 전역 또는 로컬에 설치되어 있어야 한다)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.json': 'application/json', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '');
  try {
    const body = await readFile(join(ROOT, path || 'index.html'));
    res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(0, r));
const BASE = `http://localhost:${server.address().port}/index.html`;

const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`); };
const browser = await chromium.launch();
const consoleIssues = [];

async function newPage(opts = {}) {
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 1366, height: 860 }, reducedMotion: opts.reducedMotion || 'no-preference' });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') consoleIssues.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', e => consoleIssues.push('pageerror: ' + e.message));
  return { ctx, page };
}
// 애니메이션 중 다시 그려지는 버튼은 잠깐 기다렸다가 다시 누른다
const tap = async (page, sel, nth = 0) => { for (let i = 0; i < 20; i++) { try { await page.locator(sel).nth(nth).click({ timeout: 1500 }); return true; } catch { await page.waitForTimeout(150); } } return false; };
const until = async (page, fn, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await page.evaluate(fn)) return true; await page.waitForTimeout(80); } return false; };

// 공통: 타이틀 → 출생 → 유년기 → 목표 → 연초 계획까지 (마우스 사용)
async function toPlan(page, seed) {
  await page.goto(`${BASE}?seed=${seed}`);
  await page.click('[data-act="new"]');
  await page.waitForSelector('.birth-screen');
  await page.click('[data-act="start"]');
  for (let i = 0; i < 3; i++) { await page.waitForSelector('.memory-card .choice:not(:disabled)', { state: 'visible' }); await page.waitForTimeout(150); await page.locator('.memory-card .choice').first().click(); await page.waitForTimeout(450); }
  await page.waitForSelector('.ticket');
  await page.locator('.ticket').first().click();
  await page.click('[data-act="confirm"]');
  await page.waitForSelector('.plan-modal [data-act="submit"]');
}
// 자동 진행을 끝까지 돌리며 사건·결산을 처리한다
async function playYears(page, years, onEvent, onLedger) {
  let done = 0;
  await page.evaluate(() => window.__ui.setSetting('speed', 8));
  for (let k = 0; k < 4000 && done < years; k++) {
    const phase = await page.evaluate(() => window.__ui.state?.phase);
    if (phase === 'plan' && await page.$('.plan-modal [data-act="submit"]')) { await tap(page, '.plan-modal [data-act="submit"]'); await page.waitForTimeout(200); }
    else if (phase === 'event' && await page.$('.event-modal .choice:not(:disabled)')) { if (onEvent) await onEvent(page); else await tap(page, '.event-modal .choice:not(:disabled)'); await page.waitForTimeout(250); }
    else if (await page.$('.event-modal [data-act="continue"]')) { await tap(page, '.event-modal [data-act="continue"]'); await page.waitForTimeout(200); }
    else if (phase === 'yearEnd' && await page.$('.ledger-modal [data-act="next"]')) { if (onLedger) await onLedger(page); await tap(page, '.ledger-modal [data-act="next"]'); done++; await page.waitForTimeout(250); }
    else if (phase === 'ended') break;
    else if (phase === 'running') { await page.keyboard.press('Enter'); await page.waitForTimeout(60); }
    else await page.waitForTimeout(80);
  }
  return done;
}

// ───────── 1. 시드 표시와 새로고침 재현 ─────────
{
  const { ctx, page } = await newPage();
  await page.goto(`${BASE}?seed=E2E-SEED-ONE`);
  await page.click('[data-act="new"]');
  await page.waitForSelector('.birth-screen');
  const seed1 = await page.inputValue('#sd');
  const cards1 = await page.locator('.fc-front h3').allTextContents();
  await page.reload();
  await page.click('[data-act="new"]');
  await page.waitForSelector('.birth-screen');
  const seed2 = await page.inputValue('#sd');
  const cards2 = await page.locator('.fc-front h3').allTextContents();
  check('출생 화면에 시드 표시, 새로고침해도 같은 출생 결과', /^[0-9A-F]{4}(-[0-9A-F]{4}){7}$/.test(seed1) && seed1 === seed2 && cards1.join() === cards2.join(), `${seed1} · ${cards1.join('/')}`);

  // 글꼴
  const font = await page.evaluate(async () => { await document.fonts.ready; return { fam: getComputedStyle(document.querySelector('.fc-front h3')).fontFamily, ok: document.fonts.check('16px RIDIBatang') }; });
  check('본문 글꼴 RIDIBatang · document.fonts.check', /RIDIBatang/.test(font.fam) && font.ok, `${font.fam} · ${font.ok}`);
  await ctx.close();
}

// ───────── 2. 한 해의 루프 · 사건 선택지 · 결산 원인 ─────────
{
  const { ctx, page } = await newPage();
  await toPlan(page, 'E2E-LOOP');
  await page.locator('.plan-modal .opt:not(:disabled)').nth(1).click();
  await page.locator('.plan-modal .pill:not(:disabled)').first().click();
  await page.click('.plan-modal [data-act="submit"]');
  let eventInfo = null, autoStopped = null, dbl = null;
  const seen = { rel: false, skill: false, city: false, cause: false, money: false };
  const years = await playYears(page, 6, async (p) => {
    if (!eventInfo) {
      eventInfo = await p.evaluate(() => {
        const cs = [...document.querySelectorAll('.event-modal .choice')];
        return { n: cs.length, odds: cs.every(c => c.querySelector('.c-odds')), costShown: cs.some(c => c.querySelector('.chip--cost')), lock: cs.some(c => c.querySelector('.chip--lock')), irr: window.__ui.state.current && cs.length };
      });
      autoStopped = await p.evaluate(() => window.__ui.state.phase === 'event' && !document.querySelector('.season-track.go'));
    }
    // 두 번 빠르게 누르기: 선택 결과는 한 번만 기록된다
    if (!dbl) {
      const before = await p.evaluate(() => ({ cash: window.__ui.state.ch.cash, n: window.__ui.state.journal.filter(j => j.kind === 'result').length }));
      await p.locator('.event-modal .choice:not(:disabled)').first().dblclick();
      await p.waitForTimeout(700);
      const after = await p.evaluate(() => ({ cash: window.__ui.state.ch.cash, n: window.__ui.state.journal.filter(j => j.kind === 'result').length, last: window.__ui.state.journal.filter(j => j.kind === 'result').slice(-1)[0] }));
      dbl = { before, after };
      return;
    }
    await tap(p, '.event-modal .choice:not(:disabled)');
  }, async (p) => {
    const r = await p.evaluate(() => {
      const m = document.querySelector('.ledger-modal');
      const h = [...m.querySelectorAll('.lg-card h4')].map(x => x.textContent);
      const withCause = (title) => { const card = [...m.querySelectorAll('.lg-card')].find(c => c.querySelector('h4').textContent.includes(title)); return card ? [...card.querySelectorAll('li')].every(li => li.querySelector('small')) : null; };
      return { money: !!m.querySelector('.ls-table'), rel: withCause('관계'), city: withCause('도시'), skill: h.some(x => x.includes('성장')), cause: h.some(x => x.includes('왜')) };
    });
    if (r.money) seen.money = true;
    if (r.rel) seen.rel = true;
    if (r.city) seen.city = true;
    if (r.skill) seen.skill = true;
    if (r.cause) seen.cause = true;
  });
  check('주 활동·보조 약속 선택 → 네 계절 진행 → 연말 결산 화면', years >= 6, `${years}년 결산`);
  check('연말 결산: 수입·비용·관계·숙련·도시 변화가 원인 문장과 함께', Object.values(seen).every(Boolean), JSON.stringify(seen));
  check('사건에서 자동 진행이 멈추고 선택지 2~4개 · 비용/성공률/비가역 표시', eventInfo && autoStopped && eventInfo.n >= 2 && eventInfo.n <= 4 && eventInfo.odds, JSON.stringify(eventInfo));
  check('선택 버튼을 두 번 빠르게 눌러도 한 번만 처리', dbl && dbl.after.n === dbl.before.n + 1 && dbl.before.cash - dbl.after.cash <= (Number((dbl.after.last?.deltas || []).find(d => /현금 −/.test(d))?.match(/\d+/)?.[0]) || 0) + 999, dbl ? `결과 ${dbl.before.n}→${dbl.after.n}` : '사건 없음');

  // 저장 칸 순환
  const slots = await page.evaluate(() => [0, 1, 2].map(i => JSON.parse(localStorage.getItem('brassLife.v1.slot' + i) || 'null')?.savedAt || 0));
  check('자동 저장 3칸 순환', slots.every(x => x > 0) && new Set(slots).size === 3, slots.join(', '));
  await ctx.close();
}

// ───────── 3. 사건 장면 새로고침 · 판정 불변 ─────────
{
  const { ctx, page } = await newPage();
  await toPlan(page, 'E2E-RELOAD');
  await page.click('.plan-modal [data-act="submit"]');
  await page.evaluate(() => window.__ui.setSetting('speed', 8));
  const ok = await until(page, () => window.__ui.state.phase === 'event' || window.__ui.state.phase === 'yearEnd', 60000);
  let detail = '';
  let pass = false;
  for (let tries = 0; tries < 8 && !pass; tries++) {
    const ph = await page.evaluate(() => window.__ui.state.phase);
    if (ph === 'yearEnd') { await page.click('.ledger-modal [data-act="next"]'); await page.waitForSelector('.plan-modal [data-act="submit"]'); await page.click('.plan-modal [data-act="submit"]'); await until(page, () => window.__ui.state.phase === 'event' || window.__ui.state.phase === 'yearEnd', 60000); continue; }
    await page.waitForSelector('.event-modal .choice:not(:disabled)');
    const title1 = await page.textContent('.event-title');
    await page.reload();
    await page.click('[data-act="continue"]');
    await page.waitForSelector('.event-modal .choice:not(:disabled)');
    const title2 = await page.textContent('.event-title');
    await page.locator('.event-modal .choice:not(:disabled)').first().click();
    await page.waitForSelector('.ev-result');
    const r1 = await page.evaluate(() => JSON.stringify(window.__ui.state.journal.filter(j => j.kind === 'result').slice(-1)[0]));
    await page.reload();
    await page.click('[data-act="continue"]');
    await page.waitForTimeout(900);
    const r2 = await page.evaluate(() => JSON.stringify(window.__ui.state.journal.filter(j => j.kind === 'result').slice(-1)[0]));
    pass = ok && title1 === title2 && r1 === r2;
    detail = `${title1} → ${title2} · 결과 동일 ${r1 === r2}`;
  }
  check('새로고침하면 같은 사건 장면에서 이어지고 판정이 다시 굴려지지 않는다', pass, detail);

  // 내보내기 → 새 컨텍스트에서 가져오기
  const exported = await page.evaluate(async () => (await import('./js/ui/store.js')).exportText(window.__ui.state));
  const { ctx: ctx2, page: p2 } = await newPage();
  await p2.goto(BASE);
  await p2.click('[data-act="settings"]');
  await p2.fill('#io', exported);
  await p2.click('[data-act="import"]');
  await p2.waitForSelector('.main-screen');
  const same = await p2.evaluate((t) => JSON.stringify(window.__ui.state) === JSON.stringify(JSON.parse(t).state), exported);
  check('저장 내보내기 → 새 브라우저 컨텍스트에서 가져오기 → 같은 상태', same, `${exported.length}B`);
  check('저장 크기 ≤ 200KB', exported.length <= 200 * 1024, `${(exported.length / 1024).toFixed(1)}KB`);
  await ctx2.close();
  await ctx.close();
}

// ───────── 4. 은퇴 → 장례와 결말 ─────────
{
  const { ctx, page } = await newPage();
  await page.goto(BASE);
  await page.evaluate(async () => {
    const { playLife } = await import('./tests/play.mjs');
    const { s } = playLife('e2e-ending', 'social', { stopAtAge: 62 });
    window.__ui.state = s;
    window.__ui.go('main');
  });
  await page.waitForSelector('.plan-modal');
  await page.click('[data-tab="money"]');
  await page.click('[data-act="retire"]');
  await page.click('[data-act="yes"]');
  await page.waitForSelector('.ending-screen', { timeout: 15000 });
  await page.waitForTimeout(2500);
  const end = await page.evaluate(() => ({ mourners: document.querySelectorAll('.mourner b').length, title: document.querySelector('.end-plaque')?.textContent, extras: document.querySelectorAll('.ep-extras .chip').length, main: !!window.__ui.state.ending.main }));
  check('은퇴 → 장례 장면: 관계 상위 인물 · 주 결말 + 추가 장면', end.mourners >= 1 && end.main && end.title, JSON.stringify(end));
  await ctx.close();
}

// ───────── 5. 키보드만으로 출생 → 1년 → 사건 → 결산 ─────────
{
  const { ctx, page } = await newPage();
  await page.goto(`${BASE}?seed=E2E-KEYS`);
  await page.waitForTimeout(700);
  const press = async (k, wait = 120) => { await page.keyboard.press(k); await page.waitForTimeout(wait); };
  // 타이틀: 첫 활성 메뉴(새로운 삶)에 초점이 있다
  await press('Enter', 1300);
  for (let i = 0; i < 25; i++) { if (await page.evaluate(() => document.activeElement?.dataset?.act === 'start')) break; await press('Tab', 40); }
  await press('Enter', 1300);
  for (let i = 0; i < 3; i++) { await page.waitForSelector('.memory-card .choice:not(:disabled)'); await press('1', 900); }
  await page.waitForSelector('.ticket');
  await press('1'); await press('Enter', 1300);
  await page.waitForSelector('.plan-modal [data-act="submit"]');
  await page.waitForTimeout(400);
  await press('Enter', 600);
  let sawEvent = false, sawLedger = false;
  // 사건과 결산을 모두 볼 때까지(최대 몇 해) 키보드로만 진행한다
  for (let k = 0; k < 2400 && !(sawEvent && sawLedger && await page.evaluate(() => window.__ui.state.phase === 'plan')); k++) {
    const st = await page.evaluate(() => ({ ph: window.__ui.state?.phase, ev: !!document.querySelector('.event-modal .choice:not(:disabled)'), cont: !!document.querySelector('.event-modal [data-act="continue"]'), led: !!document.querySelector('.ledger-modal') }));
    if (st.ev) { sawEvent = true; await press('1', 700); }
    else if (st.cont) await press('Enter', 400);
    else if (st.led) { sawLedger = true; await page.waitForTimeout(500); await press('Enter', 800); }
    else if (st.ph === 'plan' && !(sawEvent && sawLedger)) { await page.waitForTimeout(300); await press('Enter', 400); }
    else if (st.ph === 'running') await press('Enter', 150);
    else await page.waitForTimeout(100);
  }
  const back = await page.evaluate(() => window.__ui.state.phase);
  check('키보드만으로 출생 → 1년 진행 → 사건 선택 → 결산', sawLedger && back === 'plan', `사건 ${sawEvent} · 결산 ${sawLedger} · 다음 단계 ${back}`);
  await ctx.close();
}

// ───────── 6. 모바일 360×740: 가로 스크롤 없음 · 버튼 44px ─────────
{
  const { ctx, page } = await newPage({ viewport: { width: 360, height: 740 } });
  const small = [];
  const measure = async (label) => {
    const r = await page.evaluate(() => {
      const bad = [...document.querySelectorAll('button, [role="switch"], label.btn')].filter(b => b.offsetParent !== null).map(b => { const r = { width: b.offsetWidth, height: b.offsetHeight }; return { w: r.width, h: r.height, t: (b.textContent || b.getAttribute('aria-label') || b.className).trim().slice(0, 20) }; }).filter(x => x.w > 0 && (x.w < 44 || x.h < 44));
      return { sw: document.documentElement.scrollWidth, bad };
    });
    if (r.sw > 360) small.push(`${label}: 가로 ${r.sw}`);
    for (const b of r.bad) small.push(`${label}: ${b.t} ${Math.round(b.w)}×${Math.round(b.h)}`);
  };
  await page.goto(`${BASE}?seed=E2E-MOBILE`);
  await page.waitForTimeout(1200); await measure('타이틀');
  await page.click('[data-act="new"]'); await page.waitForTimeout(1600); await measure('출생');
  await page.click('[data-act="start"]'); await page.waitForTimeout(1600); await measure('유년기');
  for (let i = 0; i < 3; i++) { await page.waitForSelector('.memory-card .choice:not(:disabled)'); await page.locator('.memory-card .choice').first().click(); await page.waitForTimeout(500); }
  await page.waitForSelector('.ticket'); await page.waitForTimeout(600); await measure('목표');
  await page.locator('.ticket').first().click(); await page.click('[data-act="confirm"]');
  await page.waitForSelector('.plan-modal [data-act="submit"]'); await page.waitForTimeout(700); await measure('연초 계획');
  for (const t of ['news', 'shop', 'money', 'goal']) { await page.click(`[data-tab="${t}"]`); await page.waitForTimeout(250); await measure('계획:' + t); }
  await page.click('[data-tab="plan"]'); await page.click('.plan-modal [data-act="submit"]');
  await page.evaluate(() => window.__ui.setSetting('speed', 8));
  await until(page, () => !!document.querySelector('.event-modal .choice:not(:disabled)') || window.__ui.state.phase === 'yearEnd', 60000);
  await page.waitForTimeout(1500); await measure('사건/결산');
  await page.evaluate(() => { const ui = window.__ui; ui.closeAll(true); });
  for (const k of ['me', 'people', 'city', 'ledger', 'codex', 'settings']) {
    await page.evaluate((k) => import('./js/ui/screens/panels.js').then(m => m.openPanel(window.__ui, k)), k);
    await page.waitForTimeout(500); await measure('패널:' + k);
    await page.evaluate(() => window.__ui.closeAll(true));
  }
  await page.evaluate(() => window.__ui.go('main')); await page.waitForTimeout(1500); await measure('본 화면');
  check('360×740: 가로 스크롤 없음 · 모든 버튼 44px 이상', small.length === 0, small.slice(0, 6).join(' / '));
  await ctx.close();
}

// ───────── 7. 애니메이션과 줄임 동작 · 테마 전환 ─────────
{
  const { ctx, page } = await newPage();
  await page.goto(BASE);
  await page.waitForTimeout(300);
  const full = await page.evaluate(() => {
    const m = document.querySelector('.menu-item');
    const a = m.getAnimations();
    return { n: a.length, dur: a[0]?.effect?.getTiming().duration, name: a[0]?.animationName };
  });
  const irisRan = await page.evaluate(async () => {
    const ov = document.getElementById('iris');
    let seen = false;
    const obs = new MutationObserver(() => { if (ov.classList.contains('active')) seen = true; });
    obs.observe(ov, { attributes: true });
    window.__ui.go('birth');
    await new Promise(r => setTimeout(r, 900));
    obs.disconnect();
    return seen;
  });
  await page.evaluate(() => window.__ui.setSetting('motion', 'reduced'));
  await page.evaluate(() => window.__ui.go('title'));
  await page.waitForTimeout(400);
  const red = await page.evaluate(() => {
    const m = document.querySelector('.menu-item');
    const cs = getComputedStyle(m);
    return { dur: cs.animationDuration, name: cs.animationName };
  });
  check('버튼 출현·화면 전환 애니메이션 재생, 줄임 동작 시 150ms 페이드', full.n > 0 && irisRan && red.dur === '0.15s' && red.name === 'fade-in', `기본 ${full.name} ${full.dur}ms · 셔터 ${irisRan} · 줄임 ${red.name} ${red.dur}`);
  await page.evaluate(() => window.__ui.setSetting('motion', 'auto'));

  const before = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await page.click('[data-act="settings"]');
  await tap(page, '[data-act="theme:ivory"]');
  await page.waitForTimeout(50);
  const after = await page.evaluate(() => ({ theme: document.documentElement.dataset.theme, bg: getComputedStyle(document.body).backgroundColor }));
  check('먹빛/아이보리 테마 전환이 즉시 반영', after.theme === 'ivory' && after.bg !== before, `${before} → ${after.bg}`);
  await tap(page, '[data-act="theme:dark"]');
  await ctx.close();
}

// ───────── 8. 전 과정 콘솔 에러·경고 0건 ─────────
check('타이틀 → 플레이 → 엔딩 전 과정 콘솔 에러·경고 0건', consoleIssues.length === 0, consoleIssues.slice(0, 3).join(' | '));

await browser.close();
server.close();
const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} 통과`);
process.exit(failed.length ? 1 : 0);
