// 출생 기록: 운명 카드 네 장이 차례로 뒤집힌다. 이름과 씨앗을 정하고 삶을 시작한다.
import { esc, icon, frame, btn, divider } from '../dom.js';
import { stagger, reduced } from '../motion.js';
import { createGame } from '../../core/game.js';
import { freshSeed, normalizeSeed } from '../../core/rng.js';
import { BACKGROUNDS, FAMILIES, APTITUDES, ABILITIES, DISTRICTS, OTHER_DISTRICTS, ATTRS, SKILLS } from '../../data/world.js';

const placeName = (id) => DISTRICTS[id]?.name || OTHER_DISTRICTS[id] || id;

export default function birth(ui, root) {
  let seed = ui.pendingSeed ? normalizeSeed(ui.pendingSeed) : freshSeed();
  ui.pendingSeed = null;
  let name = '';
  let s = createGame(seed);

  const cards = (st) => {
    const ch = st.ch;
    const bg = BACKGROUNDS[ch.background], fam = FAMILIES[ch.family], apt = APTITUDES[ch.aptitude];
    const ab = ch.ability ? ABILITIES[ch.ability.id] : null;
    return [
      { k: '배경', ico: 'home', title: bg.name, lines: [`출생지 ${placeName(ch.origin)} · 생활 구역 ${placeName(ch.home)}`, `강점: ${bg.strength}`, `부담: ${bg.burden}`], foot: `시작 소지금 ${ch.cash}C` },
      { k: '가정', ico: 'heart', title: fam.name, lines: [familyLine(ch.family)], foot: `보호 관계 ${st.npcs.p_guardian.name}` },
      { k: '자질', ico: 'star', title: apt.name, lines: [`열리는 길: ${apt.open}`, `한계: ${apt.limit}`], foot: `부 자질 ${SKILLS[ch.subSkill]}` },
      ab
        ? { k: '공명', ico: 'wave', title: ab.name, rare: true, lines: [`쓰임: ${ab.use}`, `대가: ${ab.cost}`], foot: '시민 열에 하나 반, 발현' }
        : { k: '공명', ico: 'gear', title: '비발현', lines: ['시민 대부분처럼 공명 없이 태어났다.', '대응 장치와 숙련으로 같은 일을 배울 수 있다.'], foot: '장치와 손으로 사는 삶' },
    ];
  };

  const attrsHtml = (st) => Object.entries(ATTRS).map(([k, label]) => {
    const v = st.ch.attrs[k];
    return `<li><span class="a-name">${esc(label)}</span><span class="pips" aria-label="${esc(label)} ${v}">${Array.from({ length: 6 }, (_, i) => `<i class="${i < v ? 'on' : ''}"></i>`).join('')}</span><span class="a-val">${v}</span></li>`;
  }).join('');

  const draw = (animate = true) => {
    const cs = cards(s);
    root.innerHTML = `
      <div class="birth-screen">
        <header class="screen-head rise"><div class="plaque">출생 기록 · 171년</div><p class="head-sub">도시는 당신이 태어난 자리부터 정해 두었다. 나머지는 당신이 고른다.</p></header>
        <div class="fate-row">
          ${cs.map((c, i) => `
            <article class="flip-card ${c.rare ? 'is-rare' : ''}" style="--i:${i}" aria-label="${esc(c.k)}: ${esc(c.title)}">
              <div class="fc-inner">
                <div class="fc-back" aria-hidden="true"><svg class="fc-gear"><use href="#gear-big"/></svg><span>${esc(c.k)}</span></div>
                <div class="fc-front paper paper--edge ticket-face">
                  <div class="tf-head">${icon(c.ico)}<span>${esc(c.k)}</span></div>
                  <h3>${esc(c.title)}</h3>
                  <ul>${c.lines.map(l => `<li>${esc(l)}</li>`).join('')}</ul>
                  <div class="tf-foot">${esc(c.foot)}</div>
                </div>
              </div>
            </article>`).join('')}
        </div>
        <div class="birth-lower">
          ${frame(`<ul class="attr-list">${attrsHtml(s)}</ul><p class="muted small">능력치 합계 24 · 주 자질 ${esc(APTITUDES[s.ch.aptitude].name)}</p>`, { cls: 'attr-panel frame--sm', title: '타고난 능력' })}
          ${frame(`
            <div class="field"><label for="nm">이름</label><input id="nm" class="input" maxlength="16" placeholder="${esc(s.ch.name)}" value="${esc(name)}" autocomplete="off"></div>
            <div class="field"><label for="sd">출생 씨앗</label><div class="seed-row"><input id="sd" class="input mono" value="${esc(seed)}" spellcheck="false" autocomplete="off"><button class="btn btn--sm btn--icon" data-act="apply-seed" aria-label="씨앗 적용" data-tip="입력한 씨앗으로 다시 태어난다">${icon('check')}</button></div></div>
            <p class="muted small">같은 씨앗과 같은 선택은 언제나 같은 삶을 만든다.</p>
            ${divider()}
            <div class="birth-actions">${btn('다른 운명', 'reroll', { ico: 'dice', cls: 'btn--ghost' })}${btn('이 삶을 시작한다', 'start', { cls: 'btn--brass', gems: 'red' })}</div>
          `, { cls: 'name-panel frame--sm', title: '서명' })}
        </div>
        <button class="btn btn--ghost btn--sm back-btn" data-act="back">${icon('chevron')}<span>타이틀</span></button>
      </div>`;
    const flips = [...root.querySelectorAll('.flip-card')];
    if (animate && !reduced()) {
      flips.forEach((f, i) => setTimeout(() => { f.classList.add('is-flipped'); ui.sfx.play(f.classList.contains('is-rare') ? 'bell' : 'page'); }, 420 + i * 300));
    } else flips.forEach(f => f.classList.add('is-flipped'));
    stagger(root, '.birth-actions .btn');
  };
  draw();

  const rebuild = () => { s = createGame(seed, { name: name || undefined }); };
  root.addEventListener('input', (e) => {
    if (e.target.id === 'nm') { name = e.target.value.trim().slice(0, 16); rebuild(); }
  });
  root.addEventListener('keydown', (e) => {
    if (e.target.id === 'sd' && e.key === 'Enter') { e.preventDefault(); applySeed(); }
  });
  const applySeed = () => {
    const v = root.querySelector('#sd').value.trim();
    if (!v) return;
    seed = normalizeSeed(v); rebuild(); draw();
  };
  root.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]');
    if (!a) return;
    const act = a.dataset.act;
    if (act === 'reroll') { seed = freshSeed(); rebuild(); draw(); ui.sfx.play('gear'); }
    if (act === 'apply-seed') applySeed();
    if (act === 'start') { ui.state = s; ui.go('childhood'); }
    if (act === 'back') ui.go('title');
  });
  return { particles: 'embers' };
}

function familyLine(f) {
  return {
    stable: '보호자는 늘 같은 시간에 돌아왔다. 규칙이 첫 안전이었다.',
    busy: '보호자는 바빴지만 식탁 위 쪽지를 거르지 않았다.',
    community: '한 사람이 아니라 골목 전체가 당신을 키웠다.',
    substitute: '첫 보호자와는 오래 함께하지 못했다. 다른 손이 문을 열어 주었다.',
  }[f];
}
