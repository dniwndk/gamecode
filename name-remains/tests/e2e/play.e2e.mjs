// 실제 브라우저(Chromium)로 빌드 결과를 띄워 데스크톱·모바일에서 한 생애를 진행해 본다.
// 사용법: npm run build && node tests/e2e/play.e2e.mjs [스크린샷 폴더]
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const OUT = process.argv[2] ?? 'test-results/e2e';
mkdirSync(OUT, { recursive: true });
const PORT = 4317;
const URL = `http://127.0.0.1:${PORT}/`;

// npx를 거치면 kill이 손자 프로세스(vite)까지 닿지 않아 CI가 끝나지 않는다. vite를 직접, 별도 프로세스 그룹으로 띄운다.
const VITE = fileURLToPath(new globalThis.URL('../../node_modules/vite/bin/vite.js', import.meta.url));
const server = spawn(process.execPath, [VITE, 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore', detached: true });
const stop = () => {
  try {
    process.kill(-server.pid, 'SIGTERM');
  } catch {
    server.kill('SIGTERM');
  }
};

async function waitServer() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(URL);
      if (r.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('preview server did not start');
}

function check(cond, msg) {
  if (!cond) throw new Error(`검사 실패: ${msg}`);
  console.log(`  ✓ ${msg}`);
}

async function playOnce(browser, name, viewport, isMobile) {
  console.log(`\n[${name}]`);
  const ctx = await browser.newContext({ viewport, isMobile, hasTouch: isMobile, deviceScaleFactor: isMobile ? 2 : 1, locale: 'ko-KR' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(URL);
  await page.getByRole('heading', { name: '이름이 남는 동안' }).waitFor();
  await page.screenshot({ path: `${OUT}/${name}-1-title.png`, fullPage: true });
  check(true, '타이틀 화면');

  await page.getByLabel('이름').fill('한서진');
  await page.getByRole('button', { name: '시드 정하기 (선택)' }).click().catch(() => {});
  await page.locator('summary').click();
  await page.getByPlaceholder('예: 안개-0404').fill('e2e-seed-7');
  await page.getByRole('button', { name: /태어나기/ }).click();
  await page.locator('.tl-item').first().waitFor();
  check(await page.locator('text=출생 ·').count() > 0, '출생 기록이 타임라인에 나타남');

  await page.getByRole('button', { name: 'x8' }).first().click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/${name}-2-life.png` });

  // 다음 선택까지 건너뛰고 선택 카드를 확인한다
  let decided = 0;
  for (let round = 0; round < 40 && decided < 3; round++) {
    const ended = await page.getByRole('button', { name: '결말 보기' }).count();
    if (ended) break;
    const card = page.locator('section.decision');
    if (await card.count()) {
      if (decided === 0) await page.screenshot({ path: `${OUT}/${name}-3-decision.png` });
      const choice = card.locator('button.choice:not([disabled])').first();
      await choice.click();
      decided++;
      await page.waitForTimeout(300);
      continue;
    }
    await page.getByRole('button', { name: /다음 선택까지/ }).first().click();
    await page.waitForTimeout(400);
  }
  check(decided > 0, `선택 카드에서 ${decided}번 선택함`);
  await page.screenshot({ path: `${OUT}/${name}-4-after.png` });

  if (isMobile) {
    await page.getByRole('button', { name: '인물' }).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/${name}-5-sheet.png` });
    await page.getByRole('button', { name: '닫기' }).click();
  }

  // 새로고침해도 이어하기가 된다(자동 저장)
  await page.getByRole('button', { name: /일시정지/ }).first().click().catch(() => {});
  await page.waitForTimeout(1500);
  await page.reload();
  await page.getByRole('heading', { name: '이름이 남는 동안' }).waitFor();
  check(await page.getByRole('button', { name: /이어하기 · 한서진/ }).count() === 1, '새로고침 뒤 이어하기 버튼');
  await page.getByRole('button', { name: /이어하기 · 한서진/ }).click();
  await page.locator('.tl-item').first().waitFor();

  // 끝까지 자동 결정으로 진행해 결말 화면을 본다
  await page.getByRole('button', { name: /자동 결정/ }).first().click();
  for (let i = 0; i < 400; i++) {
    if (await page.getByRole('button', { name: '결말 보기' }).count()) break;
    const card = page.locator('section.decision');
    if (await card.count()) {
      await card.locator('button.choice:not([disabled])').first().click();
    } else {
      await page.getByRole('button', { name: /다음 선택까지/ }).first().click();
    }
    await page.waitForTimeout(120);
  }
  check(await page.getByRole('button', { name: '결말 보기' }).count() === 1, '종점에 도달');
  await page.screenshot({ path: `${OUT}/${name}-6-end-timeline.png` });
  await page.getByRole('button', { name: '결말 보기' }).click();
  await page.getByText('여기 한 사람이 잠들다').waitFor();
  await page.screenshot({ path: `${OUT}/${name}-7-ending.png`, fullPage: true });
  check(true, '결말 화면');
  await page.getByRole('button', { name: /도감/ }).click();
  await page.getByRole('heading', { name: '도감' }).waitFor();
  await page.screenshot({ path: `${OUT}/${name}-8-codex.png` });
  check(true, '도감 화면');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  check(!overflow, '가로 넘침 없음');
  check(errors.length === 0, `콘솔 오류 없음${errors.length ? ': ' + errors.join(' | ') : ''}`);
  await ctx.close();
}

try {
  await waitServer();
  const browser = await chromium.launch();
  await playOnce(browser, 'desktop', { width: 1440, height: 900 }, false);
  await playOnce(browser, 'mobile', { width: 390, height: 844 }, true);
  await browser.close();
  console.log('\n모든 브라우저 검사 통과');
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  stop();
  process.exit(process.exitCode ?? 0);
}
