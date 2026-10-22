// 앱 아이콘 생성: 황동 톱니 + 리디바탕 「황」. SVG를 Chromium으로 찍어 PNG로 남긴다.
// 사용법: node tools/icons.mjs   (playwright 필요, 결과는 icons/에 커밋)
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { gearPath } from '../js/ui/sprite.js';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT = join(ROOT, 'icons');

// scale: 톱니가 차지하는 비율 (maskable은 안전 영역 80% 안에 들어가야 한다), bg: 바탕을 끝까지 채울지
function svg({ scale = 1, bg = true }) {
  const c = 256, r = 236 * scale;
  const rivets = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2 + Math.PI / 12;
    const rr = r * 0.735;
    return `<circle cx="${(c + rr * Math.cos(a)).toFixed(1)}" cy="${(c + rr * Math.sin(a)).toFixed(1)}" r="${(r * 0.032).toFixed(1)}" fill="url(#rivet)" stroke="#2c1d08" stroke-width="1.2"/>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <radialGradient id="bg" cx="50%" cy="42%" r="70%"><stop offset="0" stop-color="#3a2a18"/><stop offset=".6" stop-color="#1c140c"/><stop offset="1" stop-color="#0b0805"/></radialGradient>
    <linearGradient id="brass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbe6a6"/><stop offset=".35" stop-color="#d9b25a"/><stop offset=".7" stop-color="#9c6f27"/><stop offset="1" stop-color="#5a3c12"/></linearGradient>
    <linearGradient id="brassV" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff0c4"/><stop offset=".5" stop-color="#e2bb63"/><stop offset="1" stop-color="#8a5f1f"/></linearGradient>
    <radialGradient id="dial" cx="50%" cy="38%" r="65%"><stop offset="0" stop-color="#2b2016"/><stop offset="1" stop-color="#0f0b07"/></radialGradient>
    <radialGradient id="rivet" cx="35%" cy="30%" r="70%"><stop offset="0" stop-color="#fff1c2"/><stop offset=".5" stop-color="#c99a45"/><stop offset="1" stop-color="#5e3f12"/></radialGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffb35a" stop-opacity=".22"/><stop offset="1" stop-color="#ffb35a" stop-opacity="0"/></radialGradient>
    <filter id="drop" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="${6 * scale}" stdDeviation="${8 * scale}" flood-color="#000" flood-opacity=".6"/></filter>
    <filter id="inset"><feOffset dy="3"/><feGaussianBlur stdDeviation="4" result="o"/><feComposite in="SourceGraphic" in2="o" operator="over"/></filter>
  </defs>
  ${bg ? `<rect width="512" height="512" fill="url(#bg)"/><circle cx="${c}" cy="${c}" r="250" fill="url(#glow)"/>` : ''}
  <g filter="url(#drop)">
    <path d="${gearPath(c, c, r, r * 0.86, 18)}" fill="url(#brass)" stroke="#2c1d08" stroke-width="${3 * scale}" stroke-linejoin="round"/>
    <circle cx="${c}" cy="${c}" r="${r * 0.8}" fill="none" stroke="#fbe6a6" stroke-opacity=".35" stroke-width="${2 * scale}"/>
    ${rivets}
    <circle cx="${c}" cy="${c}" r="${r * 0.66}" fill="url(#dial)" stroke="#2c1d08" stroke-width="${4 * scale}"/>
    <circle cx="${c}" cy="${c}" r="${r * 0.6}" fill="none" stroke="url(#brassV)" stroke-width="${3 * scale}" stroke-opacity=".8"/>
    <text x="${c}" y="${c}" text-anchor="middle" dominant-baseline="central" font-family="RIDIBatang" font-size="${r * 0.78}" fill="url(#brassV)" stroke="#2c1d08" stroke-width="${2 * scale}" paint-order="stroke" dy="${r * 0.02}">황</text>
  </g>
</svg>`;
}

const TARGETS = [
  { file: 'icon-512.png', size: 512, scale: 1, bg: false },
  { file: 'icon-192.png', size: 192, scale: 1, bg: false },
  { file: 'maskable-512.png', size: 512, scale: 0.74, bg: true },
  { file: 'maskable-192.png', size: 192, scale: 0.74, bg: true },
  { file: 'apple-touch-icon.png', size: 180, scale: 0.86, bg: true },
  { file: 'favicon-32.png', size: 32, scale: 1, bg: false },
];

await mkdir(OUT, { recursive: true });
const font = (await readFile(join(ROOT, 'fonts/RIDIBatang.woff2'))).toString('base64');
const browser = await chromium.launch();
const page = await browser.newPage();
for (const t of TARGETS) {
  const markup = svg(t);
  await page.setViewportSize({ width: t.size, height: t.size });
  await page.setContent(`<style>@font-face{font-family:RIDIBatang;src:url(data:font/woff2;base64,${font}) format('woff2')}html,body{margin:0;background:transparent}svg{display:block;width:${t.size}px;height:${t.size}px}</style>${markup}`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(OUT, t.file), omitBackground: !t.bg });
  console.log('icons/' + t.file);
}
await browser.close();
