// 타이틀: 책상 위 천체 관측의와 톱니, 오른쪽 세로 메뉴 (참고 4)
import { esc, icon } from '../dom.js';
import { astrolabe, skyline } from '../art.js';
import { stagger } from '../motion.js';
import * as store from '../store.js';
import { openSettings, openArchive } from './panels.js';

export default function title(ui, root) {
  const last = store.latestSlot();
  const slots = store.listSlots();
  const lastInfo = last >= 0 ? slots[last] : null;
  const items = [
    { act: 'continue', label: '이어하기', en: 'CONTINUE', ico: 'play', disabled: !lastInfo, sub: lastInfo ? `${lastInfo.name} · ${lastInfo.age}세 · ${lastInfo.year}년` : '저장된 삶이 없다' },
    { act: 'new', label: '새로운 삶', en: 'NEW LIFE', ico: 'star' },
    { act: 'archive', label: '기록 보관소', en: 'ARCHIVE', ico: 'codex', sub: ui.account.lives ? `지나온 삶 ${ui.account.lives} · 업적 ${ui.account.achievements.length}` : '' },
    { act: 'settings', label: '환경 설정', en: 'SETTINGS', ico: 'settings' },
  ];
  root.innerHTML = `
    <div class="title-screen">
      <div class="title-bg" aria-hidden="true">
        <svg class="tb-gear g1 spin-slow"><use href="#gear-big"/></svg>
        <svg class="tb-gear g2 spin-rev"><use href="#gear-copper"/></svg>
        <svg class="tb-gear g3 spin-slow"><use href="#gear-small"/></svg>
        <div class="tb-astro">${astrolabe()}</div>
        <svg class="tb-thread" viewBox="0 0 200 60"><use href="#thread"/></svg>
        ${skyline('tb-sky')}
        <div class="tb-light"></div>
      </div>
      <header class="title-block rise">
        <div class="eyebrow">증기 도시 일대기 · 1차 빌드</div>
        <h1 class="logo"><span>황동의</span> <span>생애</span></h1>
        <div class="logo-sub">LIFE&nbsp;OF&nbsp;BRASS</div>
        <p class="tagline">열세 살의 봄부터 마지막 겨울까지.<br>한 사람의 선택이 한 골목의 온도를 바꾼다.</p>
      </header>
      <nav class="title-menu" aria-label="주 메뉴">
        ${items.map((it, i) => `
          <button class="menu-item" data-act="${it.act}" ${it.disabled ? 'disabled' : ''} ${i === (lastInfo ? 0 : 1) ? 'autofocus' : ''}>
            <span class="mi-text"><span class="mi-label">${esc(it.label)}</span><span class="mi-en">${it.en}</span>${it.sub ? `<span class="mi-sub">${esc(it.sub)}</span>` : ''}</span>
            <span class="mi-ico">${icon(it.ico)}</span>
          </button>`).join('')}
      </nav>
      <footer class="title-foot">글꼴 리디바탕 · 모든 결과는 출생 씨앗에서 결정된다</footer>
    </div>`;
  stagger(root, '.menu-item');

  root.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]');
    if (!a || a.disabled) return;
    const act = a.dataset.act;
    if (act === 'new') ui.go('birth');
    if (act === 'continue') {
      const st = store.loadSlot(last);
      if (!st) { ui.toast('저장을 읽지 못했다.'); return; }
      resume(ui, st);
    }
    if (act === 'archive') openArchive(ui, { onLoad: (st) => resume(ui, st) });
    if (act === 'settings') openSettings(ui);
  });

  return {
    particles: 'embers',
    keys(e) {
      const list = [...root.querySelectorAll('.menu-item:not(:disabled)')];
      const i = list.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); list[(i + 1) % list.length]?.focus(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); list[(i - 1 + list.length) % list.length]?.focus(); }
    },
  };
}

export function resume(ui, st) {
  ui.state = st;
  const ph = st.phase;
  if (ph === 'childhood') ui.go('childhood');
  else if (ph === 'goal') ui.go('goal');
  else if (ph === 'ended') ui.go('ending');
  else ui.go('main');
}
