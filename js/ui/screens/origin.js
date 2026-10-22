// 출발 기록: 본 게임 직전에 한 번, 추첨으로 정해진 출생 배경과 그 배경이 삶에 남기는 것을 짚어 준다.
// 시민 등록 증서(양피지)에 배경이 적히고 「배정 확정」 봉인이 찍힌다. 고칠 수 없고, 읽고 시작할 뿐이다.
import { esc, icon, frame, btn, portrait } from '../dom.js';
import { stagger, countUp, reduced } from '../motion.js';
import { traitCard } from '../traits.js';
import { BACKGROUNDS, FAMILIES, APTITUDES, ABILITIES, DISTRICTS, OTHER_DISTRICTS, LIFE_CLASSES, SKILLS, ITEMS } from '../../data/world.js';
import { BACKGROUND_KEYWORD, BIRTH_NEGATIVE } from '../../data/traits.js';

const placeName = (id) => DISTRICTS[id]?.name || OTHER_DISTRICTS[id] || id;
const won = (v) => `${v > 0 ? '+' : v < 0 ? '−' : '±'}${Math.abs(v)}C`;

// 본 게임으로 넘어가기 전 한 번 보여 줄 차례인지 (목표를 고르면 켜지고, 시작하면 꺼진다)
export const needsOrigin = (s) => !!s?.flags?.originBrief;

export default function origin(ui, root) {
  const s = ui.state;
  const ch = s.ch;
  const bg = BACKGROUNDS[ch.background];
  const home = DISTRICTS[ch.home];
  const guardian = s.npcs.p_guardian;
  const linked = bg.subSkills.map(k => SKILLS[k]).join(' · ');
  const subFromBg = bg.subSkills.includes(ch.subSkill);

  // 배경이 남긴 성향: 배경의 열쇠 + 배경에서 흔한 약점 중 타고난 것
  const negPool = new Set((BIRTH_NEGATIVE[ch.background] || []).map(([id]) => id));
  const bgTraits = (ch.traits || []).filter(t => t.id === BACKGROUND_KEYWORD[ch.background] || (t.source === '타고남' && negPool.has(t.id)));

  const facts = [
    { ico: 'map', k: '출생지', v: placeName(ch.origin) },
    { ico: 'home', k: '생활 구역', v: home?.name || placeName(ch.home), sub: home ? `${home.desc}${home.rent ? ` 독립하면 집세 ${won(home.rent)}/년.` : ''}` : '' },
    { ico: 'person', k: '보호자', v: `${guardian.name}`, sub: `${guardian.job} · ${FAMILIES[ch.family].name}` },
    { ico: 'ledger', k: '생활 계층', v: LIFE_CLASSES[ch.lifeClass] },
    { ico: 'coin', k: '시작 소지금', v: `${ch.cash}C`, cash: true },
  ];

  const effects = [
    { cls: 'pos', ico: 'star', k: '강점', v: bg.strength, sub: `배경의 혜택 · ${bg.perk}` },
    { cls: 'neg', ico: 'warning', k: '부담', v: bg.burden, sub: '이 배경에서 자주 겪는 어려움' },
    { cls: '', ico: 'wrench', k: '이어진 숙련', v: linked, sub: subFromBg ? `부 자질 「${SKILLS[ch.subSkill]}」 숙련 1에서 시작한다` : `부 자질은 배경 밖의 「${SKILLS[ch.subSkill]}」 숙련 1에서 시작한다` },
  ];
  if (ch.items.includes('tool_basic') && ch.background === 'workshop') effects.push({ cls: 'pos', ico: 'wrench', k: '물려받은 물건', v: ITEMS.tool_basic.name, sub: ITEMS.tool_basic.desc });

  const fate = [
    ['heart', '가정', FAMILIES[ch.family].name],
    ['star', '자질', APTITUDES[ch.aptitude].name],
    ch.ability ? ['wave', '공명', ABILITIES[ch.ability.id].name] : ['gear', '공명', '비발현'],
  ];

  root.innerHTML = `
    <div class="origin-screen">
      <div class="origin-bg" aria-hidden="true">
        <svg class="ob-gear g1 spin-slow"><use href="#gear-big"/></svg>
        <svg class="ob-gear g2 spin-rev"><use href="#gear-copper"/></svg>
      </div>
      <header class="screen-head rise"><div class="plaque">출발 기록 · 184년 봄</div><p class="head-sub">추첨기가 정해 둔 출발선이다. 바꿀 수는 없지만, 알고 시작할 수는 있다.</p></header>
      ${frame(`
        <div class="origin-grid">
          <article class="origin-dossier paper paper--edge" aria-label="출생 배경 ${esc(bg.name)}">
            <div class="od-top"><span>에르덴 시민 등록</span><span class="mono">No.${esc(s.seed.slice(0, 9))}</span></div>
            <div class="od-hero">
              ${portrait({ portrait: bg.icon || 'home', alive: true }, 84, 'is-me od-medal')}
              <div class="od-title"><small>출생 배경</small><h2 class="od-name">${esc(bg.name)}</h2><span class="od-who">${esc(ch.name)} · 13세</span></div>
            </div>
            <p class="od-intro">${esc(bg.intro || '')}</p>
            <ul class="od-facts">
              ${facts.map((f, i) => `<li style="--i:${i}">${icon(f.ico)}<span class="of-k">${esc(f.k)}</span><b class="of-v ${f.cash ? 'od-cash' : ''}">${esc(f.v)}</b>${f.sub ? `<small class="of-sub">${esc(f.sub)}</small>` : ''}</li>`).join('')}
            </ul>
            <div class="od-fate">${fate.map(([ic, k, v]) => `<span class="chip">${icon(ic)}<em>${esc(k)}</em>${esc(v)}</span>`).join('')}</div>
            <div class="od-seal" role="img" aria-label="배정 확정 · 바꿀 수 없음"><svg class="od-seal-ring" aria-hidden="true"><use href="#gear-small"/></svg><span>${icon('lock')}<b>배정</b><b>확정</b></span></div>
          </article>
          <div class="origin-effects">
            <h3 class="sec-title">${icon('gear')}이 배경이 삶에 남기는 것</h3>
            <ul class="ofx-list">
              ${effects.map((e, i) => `<li class="ofx ${e.cls ? `ofx--${e.cls}` : ''}" style="--i:${i}"><span class="ofx-ico">${icon(e.ico)}</span><div><small>${esc(e.k)}</small><b>${esc(e.v)}</b>${e.sub ? `<span>${esc(e.sub)}</span>` : ''}</div></li>`).join('')}
            </ul>
            ${bgTraits.length ? `<h3 class="sec-title">${icon('key')}배경이 남긴 성향<small>열쇠는 사건의 길을 열고, 약점은 이겨 낼 수 있다</small></h3>
            <ul class="tcards origin-traits">${bgTraits.map(t => traitCard(t)).join('')}</ul>` : ''}
          </div>
        </div>
      `, { cls: 'origin-frame', title: '배정된 출생 배경' })}
      <div class="origin-actions">
        <p class="muted small">${icon('lock')}이 기록은 다시 고칠 수 없다. 여기서부터는 당신의 선택이다.</p>
        ${btn('에르덴에서의 삶을 시작한다', 'start', { cls: 'btn--brass', gems: 'red' })}
      </div>
    </div>`;

  stagger(root, '.origin-actions .btn');
  const cashEl = root.querySelector('.od-cash');
  if (cashEl && !reduced()) { cashEl.textContent = '0C'; setTimeout(() => countUp(cashEl, 0, ch.cash, 700, v => `${v}C`), 700); }
  // 증서가 자리를 잡으면 봉인이 찍힌다
  const seal = root.querySelector('.od-seal');
  setTimeout(() => { seal.classList.add('is-on'); ui.sfx.play('stamp'); }, reduced() ? 0 : 1050);

  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    delete s.flags.originBrief;
    ui.autosave();
    ui.go('main');
  };
  root.addEventListener('click', (e) => {
    if (e.target.closest('[data-act="start"]')) start();
  });
  return {
    particles: 'embers',
    keys(e) {
      if (e.key === 'Enter' && !e.target.closest('button')) { e.preventDefault(); start(); }
    },
  };
}
