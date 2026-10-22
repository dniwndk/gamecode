// SVG 장식 스프라이트: 황동 코너, 리벳, 톱니, 아이콘. 외부 이미지 없이 직접 그린다.

export function gearPath(cx, cy, rOuter, rInner, teeth, hole = 0) {
  const pts = [];
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const a1 = a + step * 0.12, a2 = a + step * 0.38, a3 = a + step * 0.62, a4 = a + step * 0.88;
    pts.push([cx + rInner * Math.cos(a), cy + rInner * Math.sin(a)]);
    pts.push([cx + rInner * Math.cos(a1), cy + rInner * Math.sin(a1)]);
    pts.push([cx + rOuter * Math.cos(a2), cy + rOuter * Math.sin(a2)]);
    pts.push([cx + rOuter * Math.cos(a3), cy + rOuter * Math.sin(a3)]);
    pts.push([cx + rInner * Math.cos(a4), cy + rInner * Math.sin(a4)]);
  }
  let d = 'M' + pts.map(p => p.map(v => v.toFixed(2)).join(' ')).join('L') + 'Z';
  if (hole) d += `M${cx + hole} ${cy}A${hole} ${hole} 0 1 0 ${cx - hole} ${cy}A${hole} ${hole} 0 1 0 ${cx + hole} ${cy}Z`;
  return d;
}

const ICONS = {
  people: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.6 2.7-6 6-6s6 2.4 6 6"/><circle cx="17" cy="9" r="2.4"/><path d="M15.5 14.2c3 .2 5.5 2.2 5.5 5.8"/>',
  map: '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>',
  ledger: '<rect x="4" y="3" width="15" height="18" rx="1.5"/><path d="M8 3v18M11 8h5M11 12h5M11 16h3"/>',
  codex: '<path d="M12 6c-2-1.6-5-2-8-1.6V19c3-.4 6 0 8 1.6 2-1.6 5-2 8-1.6V4.4C17 4 14 4.4 12 6z"/><path d="M12 6v14.6"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  play: '<path d="M7 4.5l12 7.5-12 7.5z"/>',
  fast: '<path d="M4 5l8 7-8 7zM12 5l8 7-8 7z"/>',
  save: '<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v6h8V3M8 21v-7h8v7"/>',
  home: '<path d="M3 11l9-7 9 7"/><path d="M6 9.5V20h12V9.5"/><path d="M10 20v-5h4v5"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  wrench: '<path d="M14.5 5.5a4 4 0 0 0-5 5L4 16l4 4 5.5-5.5a4 4 0 0 0 5-5l-2.5 2.5-2.5-.5-.5-2.5z"/>',
  flame: '<path d="M12 21c-4 0-6.5-2.6-6.5-6 0-3.6 3-5.2 3.6-8.6 1.6 1.2 2.4 2.8 2.4 4.4 1-.9 1.6-2.3 1.6-3.8 2.6 1.8 5.4 4.6 5.4 8 0 3.4-2.5 6-6.5 6z"/>',
  key: '<circle cx="8" cy="12" r="4"/><path d="M12 12h9M18 12v3M21 12v2"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/>',
  star: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8L3.5 9.7l5.9-.8z"/>',
  person: '<circle cx="12" cy="8" r="3.6"/><path d="M5 20.5c0-4 3.1-6.8 7-6.8s7 2.8 7 6.8"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3l1.4 2.6 2.9-.6.4 2.9 2.7 1.3-1.2 2.7 1.2 2.7-2.7 1.3-.4 2.9-2.9-.6L12 21l-1.4-2.6-2.9.6-.4-2.9-2.7-1.3 1.2-2.7-1.2-2.7 2.7-1.3.4-2.9 2.9.6z"/>',
  coin: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="5.5"/><path d="M12 8.5v7M10 10.5h4"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.6 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
  steam: '<path d="M6 18c-2 0-3-1.5-3-3s1.4-3 3-3c0-2.5 2-4 4.2-4 1.8 0 3.2 1 3.8 2.4.5-.3 1.1-.4 1.7-.4 2.2 0 3.8 1.7 3.8 3.8S18 18 16 18z"/><path d="M8 21h8"/>',
  wave: '<path d="M2.5 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0"/><path d="M2.5 17c2-3 4-3 6 0s4 3 6 0 4-3 6 0" opacity=".55"/>',
  warning: '<path d="M12 3.5L21.5 20h-19z"/><path d="M12 10v4.5M12 17v.6"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="1.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  check: '<path d="M4.5 12.5l5 5 10-11"/>',
  chevron: '<path d="M9 5l7 7-7 7"/>',
  dice: '<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1" fill="currentColor"/><circle cx="15" cy="15" r="1" fill="currentColor"/><circle cx="15" cy="9" r="1" fill="currentColor"/><circle cx="9" cy="15" r="1" fill="currentColor"/>',
  scroll: '<path d="M6 4h11a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H8"/><path d="M6 4a2 2 0 0 0-2 2v1h4V6a2 2 0 0 0-2-2zM8 20a2 2 0 0 1-2-2v-1h4v1"/><path d="M10 9h6M10 13h6"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  sound: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
  mute: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="1.5"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/>',
  door: '<path d="M5 21V4h10v17M15 6h4v15M11 12.5v.5"/><path d="M3 21h18"/>',
  hand: '<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12M11 11V4a1.5 1.5 0 0 1 3 0v7M14 11V5.5a1.5 1.5 0 0 1 3 0V13"/><path d="M17 10a1.5 1.5 0 0 1 3 0v4.5c0 3.6-2.6 6.5-6.5 6.5h-1C9.6 21 8 19.7 6.6 17.8L4 14.2a1.5 1.5 0 0 1 2.4-1.8L8 14.5"/>',
  feather: '<path d="M20 4c-7 0-12 5-12 12v4"/><path d="M20 4c0 6-3 11-9.5 12.5M14 9.5H9.5M17 7H12"/>',
  shield: '<path d="M12 3l7.5 3v5.5c0 4.6-3.1 8-7.5 9.5-4.4-1.5-7.5-4.9-7.5-9.5V6z"/><path d="M12 7v10M8 11h8"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  ear: '<path d="M7 9a5 5 0 0 1 10 0c0 3-2.5 4-3.2 6.2-.6 1.8-1.4 4.3-3.8 4.3A3 3 0 0 1 7 16.5"/><path d="M10 9.5a2 2 0 0 1 4 0c0 1.4-1.5 1.8-1.5 3"/>',
  lamp: '<path d="M9 3h6M10 3v2h4V3"/><path d="M8 5h8l1.5 10h-11z"/><path d="M12 9v3M7 15h10l-1.5 3h-7zM9 21h6"/>',
  band: '<path d="M4 8.5c5-2 11-2 16 0v7c-5-2-11-2-16 0z"/><path d="M8 7.3v8.2M12 6.6v8.2M16 7.3v8.2" opacity=".6"/>',
  quill: '<path d="M19.5 3.5C12 5 7 10.5 5.5 18.5"/><path d="M19.5 3.5c-.6 5-4 9.5-9.2 11M4 20.5l1.5-2"/><path d="M14 8.5l-4 .5"/>',
  lungs: '<path d="M12 3v8M12 11c-1 1-2 1.5-3 1.5M12 11c1 1 2 1.5 3 1.5"/><path d="M9 7c-3 0-5.5 4-5.5 9 0 2.4 1.4 3.5 3.2 3.5 1.6 0 2.3-1 2.3-3V7zM15 7c3 0 5.5 4 5.5 9 0 2.4-1.4 3.5-3.2 3.5-1.6 0-2.3-1-2.3-3V7z"/>',
  chain: '<rect x="2.5" y="9" width="9" height="6" rx="3"/><rect x="12.5" y="9" width="9" height="6" rx="3"/><path d="M9 12h6"/>',
  scar: '<path d="M5 19L19 5"/><path d="M7 13.5l3.5 3.5M10 10.5l3.5 3.5M13 7.5l3.5 3.5"/>',
  mask: '<path d="M3 8c3-1.5 6-1.5 9 0 3-1.5 6-1.5 9 0 0 6-2.5 9-5 9-2 0-3-1.5-4-3-1 1.5-2 3-4 3-2.5 0-5-3-5-9z"/><path d="M6.5 11h3M14.5 11h3"/>',
  anchor: '<circle cx="12" cy="5" r="2"/><path d="M12 7v14M8 10.5h8"/><path d="M4 13c0 4.4 3.6 8 8 8s8-3.6 8-8M4 13l-1.5 2M20 13l1.5 2"/>',
  pulse: '<path d="M2.5 12h4l2-5 4 10 2.5-7 1.5 2h5"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.2 1.2"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.2-1.2"/>',
};

export function buildSprite() {
  const icons = Object.entries(ICONS).map(([k, v]) =>
    `<symbol id="i-${k}" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${v}</g></symbol>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
  <defs>
    <linearGradient id="g-brass" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f6dc8f"/><stop offset=".28" stop-color="#c99a3e"/><stop offset=".55" stop-color="#8a5e1f"/><stop offset=".78" stop-color="#d7ac55"/><stop offset="1" stop-color="#6b4614"/>
    </linearGradient>
    <linearGradient id="g-brass-v" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f3d382"/><stop offset=".45" stop-color="#b8862f"/><stop offset="1" stop-color="#5e3d10"/>
    </linearGradient>
    <linearGradient id="g-copper" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#e79a6a"/><stop offset=".5" stop-color="#9c4a26"/><stop offset="1" stop-color="#5a2410"/>
    </linearGradient>
    <radialGradient id="g-rivet" cx=".35" cy=".3" r=".75">
      <stop offset="0" stop-color="#fff1c2"/><stop offset=".35" stop-color="#cf9f48"/><stop offset="1" stop-color="#3d2808"/>
    </radialGradient>
    <radialGradient id="g-gem-red" cx=".35" cy=".3" r=".8">
      <stop offset="0" stop-color="#ffc2a6"/><stop offset=".4" stop-color="#c7361b"/><stop offset="1" stop-color="#3b0a04"/>
    </radialGradient>
    <radialGradient id="g-gem-teal" cx=".35" cy=".3" r=".8">
      <stop offset="0" stop-color="#d8fff8"/><stop offset=".45" stop-color="#3fae9f"/><stop offset="1" stop-color="#0b3530"/>
    </radialGradient>
    <radialGradient id="g-gem-amber" cx=".35" cy=".3" r=".8">
      <stop offset="0" stop-color="#fff6d2"/><stop offset=".4" stop-color="#f0a530"/><stop offset="1" stop-color="#5a2e04"/>
    </radialGradient>
    <radialGradient id="g-halo">
      <stop offset="0" stop-color="#ffd27a" stop-opacity=".75"/><stop offset=".45" stop-color="#f0a530" stop-opacity=".22"/><stop offset="1" stop-color="#f0a530" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="g-glass" cx=".5" cy=".4" r=".7">
      <stop offset="0" stop-color="#f3e9d0"/><stop offset=".8" stop-color="#d9c79f"/><stop offset="1" stop-color="#a8915f"/>
    </radialGradient>
    <filter id="f-ink" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="3"/>
      <feDisplacementMap in="SourceGraphic" scale="1.6"/>
    </filter>
  </defs>
  <symbol id="corner" viewBox="0 0 72 72">
    <path d="M3 70V14Q3 3 14 3h56v7H16q-6 0-6 6v54z" fill="url(#g-brass)" stroke="#2c1d08" stroke-width="1.1"/>
    <path d="M10 40c12 0 17-9 13-16-3-5-10-4-10 1 0 3.5 4.5 4 5 1" fill="none" stroke="url(#g-brass-v)" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M40 10c0 12-9 17-16 13-5-3-4-10 1-10 3.5 0 4 4.5 1 5" fill="none" stroke="url(#g-brass-v)" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M10 52c5-2 7-5 7-9M52 10c-2 5-5 7-9 7" fill="none" stroke="#7a531a" stroke-width="1.4" stroke-linecap="round"/>
    <circle cx="16" cy="16" r="5" fill="url(#g-rivet)" stroke="#2a1b06" stroke-width=".9"/>
    <circle cx="16" cy="16" r="1.6" fill="#3a2709" opacity=".55"/>
    <path d="M58 3l5 5 5-5M3 58l5 5-5 5" fill="#c99a3e" stroke="#2c1d08" stroke-width=".8"/>
  </symbol>
  <!-- 겹창 옆면 장식 (참고 1): 덩굴 받침 두 개 사이에 빛나는 호박 보석, 바깥으로 뻗은 촉 -->
  <symbol id="finial" viewBox="0 0 44 150">
    <path d="M36 16v118" stroke="#2c1d08" stroke-width="7" stroke-linecap="round"/>
    <path d="M36 16v118" stroke="url(#g-brass-v)" stroke-width="4.4" stroke-linecap="round"/>
    <path d="M36 22C20 28 15 44 24 57c4 6-1 10-6 6" fill="none" stroke="#2c1d08" stroke-width="4.6" stroke-linecap="round"/>
    <path d="M36 22C20 28 15 44 24 57c4 6-1 10-6 6" fill="none" stroke="url(#g-brass)" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M36 128C20 122 15 106 24 93c4-6-1-10-6-6" fill="none" stroke="#2c1d08" stroke-width="4.6" stroke-linecap="round"/>
    <path d="M36 128C20 122 15 106 24 93c4-6-1-10-6-6" fill="none" stroke="url(#g-brass)" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M2 75l11-6.5v13z" fill="url(#g-brass)" stroke="#2c1d08" stroke-width="1"/>
    <circle class="f-halo" cx="22" cy="75" r="21" fill="url(#g-halo)"/>
    <circle cx="22" cy="75" r="11.5" fill="url(#g-brass)" stroke="#2c1d08" stroke-width="1.2"/>
    <circle cx="22" cy="75" r="7.4" fill="url(#g-gem-amber)" stroke="#3d2006" stroke-width=".8"/>
    <circle cx="19.6" cy="72.2" r="2.1" fill="#fff" opacity=".7"/>
    <circle cx="36" cy="16" r="3.6" fill="url(#g-rivet)" stroke="#2a1b06" stroke-width=".8"/>
    <circle cx="36" cy="134" r="3.6" fill="url(#g-rivet)" stroke="#2a1b06" stroke-width=".8"/>
  </symbol>
  <symbol id="rivet" viewBox="0 0 12 12"><circle cx="6" cy="6" r="4.6" fill="url(#g-rivet)" stroke="#24170a" stroke-width=".8"/><circle cx="4.6" cy="4.4" r="1.2" fill="#fff6d8" opacity=".7"/></symbol>
  <symbol id="gem-red" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8.6" fill="url(#g-brass)" stroke="#2c1d08"/><circle cx="10" cy="10" r="5.6" fill="url(#g-gem-red)"/><circle cx="8" cy="7.6" r="1.6" fill="#fff" opacity=".55"/></symbol>
  <symbol id="gem-teal" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8.6" fill="url(#g-brass)" stroke="#2c1d08"/><circle cx="10" cy="10" r="5.6" fill="url(#g-gem-teal)"/><circle cx="8" cy="7.6" r="1.6" fill="#fff" opacity=".55"/></symbol>
  <symbol id="gear-big" viewBox="0 0 100 100"><path d="${gearPath(50, 50, 48, 40, 18, 14)}" fill="url(#g-brass)" fill-rule="evenodd" stroke="#2c1d08" stroke-width="1"/><circle cx="50" cy="50" r="30" fill="none" stroke="#6b4614" stroke-width="2"/><path d="M50 22v56M22 50h56M30 30l40 40M70 30L30 70" stroke="#6b4614" stroke-width="3" opacity=".55"/></symbol>
  <symbol id="gear-small" viewBox="0 0 100 100"><path d="${gearPath(50, 50, 48, 38, 12, 12)}" fill="url(#g-brass)" fill-rule="evenodd" stroke="#2c1d08" stroke-width="1.2"/></symbol>
  <symbol id="gear-copper" viewBox="0 0 100 100"><path d="${gearPath(50, 50, 48, 39, 14, 16)}" fill="url(#g-copper)" fill-rule="evenodd" stroke="#2c1208" stroke-width="1.2"/></symbol>
  <symbol id="plaque-end" viewBox="0 0 24 40"><path d="M24 2H12Q2 2 2 20t10 18h12z" fill="url(#g-brass-v)" stroke="#2c1d08"/><circle cx="12" cy="20" r="4" fill="url(#g-rivet)"/></symbol>
  <symbol id="divider" viewBox="0 0 400 20"><path d="M0 10h170M230 10h170" stroke="#b58a3a" stroke-width="1.5"/><path d="M40 13h130M230 13h130" stroke="#5e3f12" stroke-width=".8"/><path d="M178 10l10-7 12 7-12 7z" fill="url(#g-brass)" stroke="#2c1d08" stroke-width=".8"/><circle cx="200" cy="10" r="3" fill="url(#g-rivet)"/><circle cx="174" cy="10" r="2" fill="#c99a3e"/><circle cx="226" cy="10" r="2" fill="#c99a3e"/></symbol>
  <symbol id="thread" viewBox="0 0 200 60"><path d="M0 40C40 10 80 55 120 25S180 5 200 20" fill="none" stroke="#9e1f16" stroke-width="2"/></symbol>
  ${icons}
</svg>`;
}

export function icon(name, cls = '') {
  return `<svg class="ico ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
}
