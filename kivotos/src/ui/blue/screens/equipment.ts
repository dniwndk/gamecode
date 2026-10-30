// 장비 선택(정예·보스 승리 시 3택1). 후보가 없으면 장비 대신 3G.
import type { Ctx, Screen } from '../app';
import { readable, topBar } from '../components';
import { cls, h } from '../dom';
import { icon } from '../icons';
import type { UiState } from '../model';

const ZONE: Record<string, [string, string]> = { front: ['전방 전용', '#ff8a3d'], rear: ['후방 전용', '#7c5cff'], both: ['공용', '#1f8fff'] };
const STAT_LABEL: Record<string, string> = { hp: '체력', atk: '공격력', def: '방어력', spd: '속도', critBps: '치명', critDamageBps: '치명 피해' };

export function mountEquipmentChoice(ctx: Ctx, s: UiState): Screen {
  const run = s.run!;
  const offers = run.offers?.equipment ?? [];
  let picked: string | null = null;
  const confirm = h('button', { class: 'k-btn is-primary k-choice-confirm', disabled: offers.length > 0, onclick: async () => { confirm.disabled = true; await ctx.send('CHOOSE_EQUIPMENT', picked ? { equipmentId: picked } : {}); } },
    icon('check', 24), offers.length ? '보관함에 넣기' : '3G 받기');
  const cards: HTMLElement[] = offers.map((id) => {
    const eq = ctx.lookup.eq(id)!;
    const [zoneLabel, color] = ZONE[eq.zone];
    const card = h('button', {
      class: 'k-choice-card is-eq', style: `--hue:${color}`, 'aria-pressed': 'false',
      onclick: () => { picked = id; ctx.fx.burst(card, { color: '#45d3ff', size: 380, ms: 800 }); cards.forEach((c) => { c.classList.toggle('is-picked', c === card); c.setAttribute('aria-pressed', c === card ? 'true' : 'false'); }); confirm.disabled = false; },
    },
    h('div', { class: 'k-choice-art' }, h('div', { class: 'k-choice-halo' }), icon('equipment', 72), h('span', { class: 'k-choice-kind' }, zoneLabel)),
    h('h3', null, eq.name),
    h('ul', { class: 'k-eq-stats' }, ...Object.entries(eq.stats).map(([k, v]) => h('li', null, h('span', null, STAT_LABEL[k] ?? k), h('b', null, `+${k.endsWith('Bps') ? `${(v ?? 0) / 100}%` : v}`)))),
    h('p', { class: 'k-eq-desc' }, readable(ctx, eq.description)),
    h('p', { class: 'k-stacking' }, readable(ctx, eq.recommendation)),
    h('span', { class: 'k-check' }, icon('check', 26)));
    return card;
  });
  const el = h('section', { class: 'k-choice' },
    topBar(ctx, run, { title: '장비 보상' }),
    h('div', { class: 'k-choice-head' }, h('h2', null, '전리품을 하나 고르세요'), h('p', null, offers.length ? '고른 장비는 보관함으로 들어가고, 준비 단계의 학생 상세에서 장착합니다.' : '이번에는 장비 후보가 없어 3G를 받습니다.')),
    h('div', { class: cls('k-choice-row', `n-${offers.length}`) }, ...cards),
    h('footer', { class: 'k-choice-foot' }, confirm));
  return { el };
}
