// 삶의 목표: 입장권 모양의 목표 카드 중 하나를 고른다 (참고 4의 장 선택 티켓)
import { esc, icon, btn } from '../dom.js';
import { stagger } from '../motion.js';
import { chooseGoal } from '../../core/game.js';
import { GOALS } from '../../data/world.js';
import { goalTraitList } from '../../core/progress.js';
import { hasTrait } from '../../core/traits.js';
import { traitChip } from '../traits.js';

const KIND = { life: ['생활', 'home'], craft: ['기술', 'wrench'], community: ['공동체', 'people'] };

export default function goal(ui, root, opts = {}) {
  const s = ui.state;
  // 이 목표와 어울리는 특성: 가진 것이 있으면 단계마다 보상이 더 붙는다
  const fitHtml = (id) => {
    const list = goalTraitList(id).filter(t => t.kind !== 'negative');
    const owned = list.filter(t => hasTrait(s, t.id));
    return list.length ? `<span class="tk-fit ${owned.length ? 'has' : ''}"><small>${owned.length ? '내 특성과 어울린다 · 단계마다 +10/20/30C' : '어울리는 특성'}</small><span class="opt-traits">${list.map(t => traitChip(t.id, { cls: hasTrait(s, t.id) ? 'owned' : 'dim' })).join('')}</span></span>` : '';
  };
  let sel = null;
  const ids = s.goalCandidates;
  root.innerHTML = `
    <div class="goal-screen">
      <header class="screen-head rise"><div class="plaque">열세 살의 다짐 · 184년 봄</div><p class="head-sub">견습의 문이 열리는 해. 무엇을 위해 살아 볼지 하나를 고른다. 연초 계획에서 언제든 바꿀 수 있다.</p></header>
      <div class="ticket-row" role="radiogroup" aria-label="삶의 목표">
        ${ids.map((id, i) => {
          const g = GOALS[id]; const [kn, ki] = KIND[g.kind] || ['생활', 'home'];
          return `<button class="ticket" role="radio" aria-checked="false" data-id="${id}">
            <span class="tk-stub"><span class="tk-no">No.${String(i + 1).padStart(2, '0')}</span><span class="tk-kind">${icon(ki)}${esc(kn)}</span><span class="tk-id">${id}</span></span>
            <span class="tk-body paper">
              <span class="tk-title">${esc(g.name)}</span>
              <span class="tk-stages">${g.stages.map((st, j) => `<span><b>${j + 1}</b>${esc(st)}</span>`).join('')}</span>
              <span class="tk-reward">${icon('star')}${esc(g.reward)}</span>
              ${fitHtml(id)}
            </span>
            <span class="tk-seal" aria-hidden="true">${icon('check')}</span>
          </button>`;
        }).join('')}
      </div>
      <div class="goal-actions">${btn('이 목표로 시작한다', 'confirm', { cls: 'btn--brass', gems: 'teal', attrs: 'disabled' })}</div>
    </div>`;
  stagger(root, '.ticket');
  // 라디오 묶음: 화살표로 옮기고, 선택된 표에서 Enter를 누르면 확정한다
  const tickets = [...root.querySelectorAll('.ticket')];
  tickets.forEach((t, i) => { t.tabIndex = i === 0 ? 0 : -1; });
  setTimeout(() => { if (!document.activeElement || document.activeElement === document.body) tickets[0]?.focus({ preventScroll: true }); }, 60);

  const select = (id) => {
    sel = id;
    tickets.forEach(t => { const on = t.dataset.id === id; t.classList.toggle('is-selected', on); t.setAttribute('aria-checked', on); t.tabIndex = on ? 0 : -1; });
    root.querySelector('[data-act="confirm"]').disabled = false;
    ui.sfx.play('stamp');
  };
  const confirm = () => {
    if (!sel) return;
    if (chooseGoal(s, sel)) { ui.autosave(); ui.go('main'); }
  };
  root.addEventListener('click', (e) => {
    const t = e.target.closest('.ticket');
    if (t) { if (e.detail === 0 && sel === t.dataset.id) confirm(); else select(t.dataset.id); return; }
    const a = e.target.closest('[data-act="confirm"]');
    if (a && !a.disabled) confirm();
  });
  return {
    particles: 'embers',
    keys(e) {
      const n = Number(e.key);
      if (n >= 1 && n <= ids.length) { e.preventDefault(); select(ids[n - 1]); tickets[n - 1].focus(); return; }
      const dir = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (dir) {
        e.preventDefault();
        const at = Math.max(0, tickets.indexOf(document.activeElement));
        const next = tickets[(at + dir + tickets.length) % tickets.length];
        select(next.dataset.id); next.focus();
        return;
      }
      if (e.key === 'Enter' && sel && !e.target.closest('.ticket, button')) { e.preventDefault(); confirm(); }
    },
  };
}
