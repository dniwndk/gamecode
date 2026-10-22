// 유년기 회상: 바랜 사진첩의 세 장면. 문장이 차례로 떠오르고 선택지가 이어 나온다.
import { esc, sentences, icon } from '../dom.js';
import { stagger, reduced } from '../motion.js';
import { childhoodScene, chooseChildhood } from '../../core/game.js';

const SCENE_ICON = { birth: 'heart', six: 'people', twelve: 'gear' };

export default function childhood(ui, root) {
  const s = ui.state;
  let locked = false;

  const draw = () => {
    const sc = childhoodScene(s);
    if (!sc) { ui.go('goal'); return; }
    locked = false;
    const textHtml = sentences(sc.text);
    const n = (sc.text.match(/[.!?…]/g) || []).length;
    root.innerHTML = `
      <div class="memory-screen">
        <div class="memory-steps" aria-label="회상 ${sc.step + 1} / 3">${[0, 1, 2].map(i => `<span class="${i < sc.step ? 'done' : i === sc.step ? 'on' : ''}"></span>`).join('<i></i>')}</div>
        <article class="memory-card paper paper--edge rise" aria-live="polite">
          <div class="mc-photo" aria-hidden="true">
            <svg class="mc-gear spin-slow"><use href="#gear-big"/></svg>
            <span class="mc-ico">${icon(SCENE_ICON[sc.key] || 'star')}</span>
            <span class="mc-pin l"></span><span class="mc-pin r"></span>
          </div>
          <div class="mc-stamp"><b>${sc.year}</b>년 · ${sc.age}세</div>
          <h2 class="mc-title">${esc(sc.title)}</h2>
          <p class="mc-text">${textHtml}</p>
          <div class="choice-list" style="--base:${n}">
            ${sc.choices.map((c, i) => `<button class="choice choice--paper" data-id="${esc(c.id)}"><span class="key">${i + 1}</span><span class="c-label">${esc(c.label)}</span>${icon('chevron', 'c-arrow')}</button>`).join('')}
          </div>
        </article>
      </div>`;
    const list = root.querySelector('.choice-list');
    list.style.visibility = 'hidden';
    setTimeout(() => { list.style.visibility = ''; stagger(list, '.choice'); list.querySelector('.choice')?.focus({ preventScroll: true }); }, reduced() ? 0 : Math.min(1400, 200 + n * 70));
  };

  const pick = async (id) => {
    if (locked) return;
    locked = true;
    ui.sfx.play('select');
    const card = root.querySelector('.memory-card');
    root.querySelectorAll('.choice').forEach(b => { b.disabled = true; if (b.dataset.id === id) b.classList.add('is-chosen'); });
    chooseChildhood(s, id);
    if (s.phase === 'goal') { setTimeout(() => ui.go('goal'), 350); return; }
    if (!reduced()) await card.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(-40px) rotate(-2deg)' }], { duration: 380, easing: 'cubic-bezier(.55,0,.7,.2)', fill: 'forwards' }).finished;
    ui.sfx.play('page');
    draw();
  };

  root.addEventListener('click', (e) => {
    const c = e.target.closest('.choice');
    if (c && !c.disabled) pick(c.dataset.id);
  });
  draw();
  return {
    particles: 'steam',
    keys(e) {
      const n = Number(e.key);
      if (n >= 1 && n <= 4) {
        const b = root.querySelectorAll('.choice')[n - 1];
        if (b && !b.disabled) { e.preventDefault(); pick(b.dataset.id); }
      }
    },
  };
}
