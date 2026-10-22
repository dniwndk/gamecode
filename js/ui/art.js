// 큰 장식 그림: 천체 관측의(아스트롤라베), 증기 도시 실루엣, 계절 다이얼, 사건 삽화. 모두 SVG로 직접 그린다.
import { gearPath } from './sprite.js';

const ROMAN = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];

export function astrolabe(cls = '') {
  const ticks = [];
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2, long = i % 6 === 0;
    const r1 = long ? 168 : 174, r2 = 182;
    ticks.push(`<line x1="${(200 + r1 * Math.sin(a)).toFixed(1)}" y1="${(200 - r1 * Math.cos(a)).toFixed(1)}" x2="${(200 + r2 * Math.sin(a)).toFixed(1)}" y2="${(200 - r2 * Math.cos(a)).toFixed(1)}" stroke-width="${long ? 2 : 1}"/>`);
  }
  const nums = ROMAN.map((n, i) => {
    const a = (i / 12) * Math.PI * 2;
    return `<text x="${(200 + 150 * Math.sin(a)).toFixed(1)}" y="${(200 - 150 * Math.cos(a) + 5).toFixed(1)}" text-anchor="middle" transform="rotate(${i * 30} ${(200 + 150 * Math.sin(a)).toFixed(1)} ${(200 - 150 * Math.cos(a)).toFixed(1)})">${n}</text>`;
  }).join('');
  const stars = Array.from({ length: 14 }, (_, i) => {
    const a = i * 2.4, r = 40 + (i * 37) % 80;
    return `<circle cx="${(200 + r * Math.cos(a)).toFixed(1)}" cy="${(200 + r * Math.sin(a)).toFixed(1)}" r="${1 + (i % 3) * .6}" fill="#f2d98e" opacity=".7"/>`;
  }).join('');
  return `<svg class="astrolabe ${cls}" viewBox="0 0 400 400" aria-hidden="true">
    <defs><radialGradient id="ast-face" cx=".5" cy=".45" r=".6"><stop offset="0" stop-color="#2a3550"/><stop offset=".7" stop-color="#151b2c"/><stop offset="1" stop-color="#0b0e18"/></radialGradient></defs>
    <circle cx="200" cy="200" r="196" fill="url(#g-brass)" stroke="#2c1d08" stroke-width="2"/>
    <circle cx="200" cy="200" r="186" fill="url(#ast-face)" stroke="#2c1d08" stroke-width="2"/>
    <g class="ast-outer spin-slow" style="transform-origin:200px 200px">
      <g stroke="#d7ac55" opacity=".9">${ticks.join('')}</g>
      <g fill="#e9c979" font-size="15" font-family="RIDIBatang, serif" letter-spacing="1">${nums}</g>
    </g>
    <circle cx="200" cy="200" r="132" fill="none" stroke="url(#g-brass)" stroke-width="3"/>
    <g class="ast-inner spin-rev" style="transform-origin:200px 200px">
      <circle cx="200" cy="200" r="112" fill="none" stroke="#c99a3e" stroke-width="1.2" stroke-dasharray="2 6"/>
      <ellipse cx="200" cy="200" rx="112" ry="46" fill="none" stroke="#c99a3e" stroke-width="1.4" opacity=".75"/>
      <ellipse cx="200" cy="200" rx="46" ry="112" fill="none" stroke="#c99a3e" stroke-width="1.4" opacity=".75"/>
      <path d="M200 88 L208 200 L200 312 L192 200Z" fill="url(#g-brass-v)" opacity=".9"/>
      <circle cx="200" cy="96" r="12" fill="#f2d98e" opacity=".85"/><circle cx="205" cy="92" r="10" fill="#151b2c"/>
    </g>
    ${stars}
    <path d="M200 120 L214 200 L200 280 L186 200Z" fill="url(#g-copper)" stroke="#2c1208"/>
    <path d="M120 200 L200 190 L280 200 L200 210Z" fill="url(#g-brass)" stroke="#2c1d08" opacity=".9"/>
    <circle cx="200" cy="200" r="16" fill="url(#g-rivet)" stroke="#2c1d08" stroke-width="1.5"/>
    <circle cx="200" cy="200" r="5" fill="#2c1d08"/>
  </svg>`;
}

// 증기 도시 실루엣: 굴뚝·돔·시계탑·배관
export function skyline(cls = '') {
  return `<svg class="skyline ${cls}" viewBox="0 0 1600 360" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <defs>
      <linearGradient id="sky-far" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--sky-far, #2a2018)"/><stop offset="1" stop-color="var(--sky-far2, #1a130d)"/></linearGradient>
      <linearGradient id="sky-near" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--sky-near, #120d09)"/><stop offset="1" stop-color="var(--sky-near2, #0b0806)"/></linearGradient>
    </defs>
    <g fill="url(#sky-far)">
      <path d="M0 360V230h60v-40h30v40h50v-70h22v-50h12v50h22v70h40v-30h80v30h30V120l18-30 18 30v100h40v-60h60v60h30v-90h14v-30h8v30h14v90h50v-50h90v50h40V170h24v-40h10v40h24v190z"/>
      <path d="M900 360V210h70v-60h16v-40h6v40h16v60h50v-30h110v30h40v-110l30-40 30 40v110h50v-70h80v70h60v-50h40v50h62v150z"/>
      <circle cx="1210" cy="140" r="22" fill="none" stroke="#3a2c1f" stroke-width="5"/>
    </g>
    <g fill="url(#sky-near)">
      <path d="M0 360V280h120v-30h24v-90h18v90h40v-20h120v20h60v-60h20v-36h10v36h20v60h70v-40h70l10-20 10 20h40v60h80v-90h30v-40l20-26 20 26v40h30v90h60v-30h120v30h40v-120h16v-30h8v30h16v120h70v-50h90v50h60v-80h22v-24h10v24h22v80h80v-40h60v40h70v80z"/>
      <rect x="560" y="236" width="300" height="10"/><rect x="980" y="250" width="240" height="8"/>
      <g fill="#f2c46a" opacity=".55" class="windows">
        <rect x="140" y="300" width="8" height="12"/><rect x="232" y="296" width="8" height="12"/><rect x="360" y="270" width="8" height="12"/><rect x="380" y="300" width="8" height="12"/>
        <rect x="610" y="296" width="8" height="12"/><rect x="700" y="270" width="8" height="12"/><rect x="900" y="300" width="8" height="12"/><rect x="1080" y="290" width="8" height="12"/>
        <rect x="1260" y="300" width="8" height="12"/><rect x="1400" y="308" width="8" height="12"/><rect x="1500" y="300" width="8" height="12"/>
      </g>
    </g>
  </svg>`;
}

// 계절 다이얼 (참고 2): 팔각 황동판 위의 네 계절 메달과 회전하는 지침
export function seasonDial(season = 0, running = false) {
  const names = ['봄', '여름', '가을', '겨울'];
  const oct = Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2 + Math.PI / 8; return `${(60 + 56 * Math.cos(a)).toFixed(1)},${(60 + 56 * Math.sin(a)).toFixed(1)}`; }).join(' ');
  const meds = names.map((n, i) => {
    const a = (i / 4) * Math.PI * 2 - Math.PI / 2;
    const x = 60 + 38 * Math.cos(a), y = 60 + 38 * Math.sin(a);
    return `<g class="dial-med ${i === season ? 'on' : ''}"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="12" /><text x="${x.toFixed(1)}" y="${(y + 4.5).toFixed(1)}" text-anchor="middle">${n}</text></g>`;
  }).join('');
  return `<svg class="season-dial ${running ? 'is-running' : ''}" viewBox="0 0 120 120" role="img" aria-label="${names[season]}">
    <polygon points="${oct}" fill="#1b2236" stroke="url(#g-brass)" stroke-width="3"/>
    <g class="dial-ring"><path d="${gearPath(60, 60, 30, 26, 24)}" fill="none" stroke="#c99a3e" stroke-width="1" opacity=".7"/></g>
    <circle cx="60" cy="60" r="22" fill="none" stroke="#c99a3e" stroke-width=".8" stroke-dasharray="1 3"/>
    ${meds}
    <g class="dial-hand" style="transform:rotate(${season * 90}deg)"><path d="M60 60 L57 44 L60 30 L63 44Z" fill="url(#g-brass)" stroke="#2c1d08" stroke-width=".6"/></g>
    <circle cx="60" cy="60" r="5" fill="url(#g-rivet)"/>
  </svg>`;
}

const CAT_ICON = { life: 'home', work: 'wrench', relation: 'people', city: 'map', resonance: 'wave', chain: 'flame', danger: 'warning', recovery: 'heart', route: 'key' };
const CAT_TONE = { life: '#d9b46a', work: '#d7ac55', relation: '#e0a08a', city: '#9fb6c9', resonance: '#7cc4bb', chain: '#e08a5c', danger: '#e06a4a', recovery: '#a6c98a', route: '#e6c27a' };

// 사건 카드 삽화: 필름 틀 안의 판화풍 장면 (참고 4)
export function eventArt(category = 'life') {
  const ic = CAT_ICON[category] || 'scroll';
  const tone = CAT_TONE[category] || '#d7ac55';
  const holes = Array.from({ length: 11 }, (_, i) => `<rect x="${14 + i * 28}" y="6" width="12" height="9" rx="2"/><rect x="${14 + i * 28}" y="205" width="12" height="9" rx="2"/>`).join('');
  return `<svg class="event-art" viewBox="0 0 320 220" aria-hidden="true">
    <defs>
      <radialGradient id="ea-bg" cx=".5" cy=".45" r=".7"><stop offset="0" stop-color="${tone}" stop-opacity=".45"/><stop offset=".6" stop-color="#2a2018"/><stop offset="1" stop-color="#0f0b08"/></radialGradient>
      <pattern id="ea-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="6" stroke="#000" stroke-opacity=".35" stroke-width="1.2"/></pattern>
    </defs>
    <rect x="0" y="0" width="320" height="220" rx="6" fill="#0d0a08"/>
    <g fill="#2a2420">${holes}</g>
    <rect x="12" y="22" width="296" height="176" fill="url(#ea-bg)"/>
    <rect x="12" y="22" width="296" height="176" fill="url(#ea-hatch)"/>
    <g opacity=".55"><use href="#gear-big" x="190" y="70" width="150" height="150" class="ea-gear"/><use href="#gear-small" x="-10" y="120" width="100" height="100" class="ea-gear2"/></g>
    <path d="M12 168 Q 90 140 160 160 T 308 150 V198 H12Z" fill="#0d0a08" opacity=".75"/>
    <g transform="translate(118 58)" color="${tone}"><circle cx="42" cy="42" r="46" fill="#120d09" stroke="url(#g-brass)" stroke-width="3"/><svg x="14" y="14" width="56" height="56" viewBox="0 0 24 24"><use href="#i-${ic}"/></svg></g>
    <rect x="12" y="22" width="296" height="176" fill="none" stroke="#000" stroke-width="2"/>
  </svg>`;
}

export { CAT_ICON };
