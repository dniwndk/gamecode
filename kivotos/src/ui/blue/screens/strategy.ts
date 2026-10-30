// 전략 선택(장마다 1회, 최대 3장). 리롤 없음, 고른 뒤 확인 버튼 한 번.
import type { Ctx, Screen } from '../app';
import { gfx, nodeTrack, readable, topBar } from '../components';
import { cls, h } from '../dom';
import { icon } from '../icons';
import type { UiState } from '../model';

const HUES = ['#1f8fff', '#16b5c9', '#7c5cff', '#f0a500', '#ff6b5a'];

export function mountStrategyChoice(ctx: Ctx, s: UiState): Screen {
  const run = s.run!;
  const offers = run.offers?.strategies ?? [];
  let picked: string | null = null;
  const confirm = h('button', { class: 'k-btn is-primary k-choice-confirm', disabled: true, onclick: async () => { if (picked) { confirm.disabled = true; await ctx.send('CHOOSE_STRATEGY', { strategyId: picked }); } } }, icon('check', 24), '이 전략으로 출발');
  const cards = offers.map((id, i) => {
    const st = ctx.lookup.strategy(id)!;
    const loan = id === 'str_kaiser_loan';
    const card = h('button', {
      class: 'k-choice-card', style: `--hue:${HUES[i % HUES.length]}`, 'aria-pressed': 'false',
      onclick: () => {
        picked = id;
        ctx.fx.burst(card, { color: '#45d3ff', size: 380, ms: 800 });
        cardEls.forEach((c) => { const on = c === card; c.classList.toggle('is-picked', on); c.setAttribute('aria-pressed', on ? 'true' : 'false'); });
        confirm.disabled = false;
      },
    },
    h('div', { class: 'k-choice-art' }, h('div', { class: 'k-choice-halo' }), gfx(ctx, `strategies/${id}.webp`, () => icon(loan ? 'gold' : 'strategy', 72), 'k-choice-img'), h('span', { class: 'k-choice-kind' }, st.generalPurpose ? '범용 전략' : '특화 전략')),
    h('h3', null, st.name),
    h('div', { class: 'k-choice-line is-benefit' }, h('small', null, '이득'), h('p', null, readable(ctx, st.benefit))),
    h('div', { class: 'k-choice-line is-drawback' }, h('small', null, '대가'), h('p', null, readable(ctx, st.drawback))),
    loan ? h('p', { class: 'k-loan' }, icon('records', 16), '상환 일정: 정산 5회 × 6G') : null,
    h('p', { class: 'k-stacking' }, st.stacking),
    h('span', { class: 'k-check' }, icon('check', 26)));
    return card;
  });
  const cardEls = cards;

  const el = h('section', { class: 'k-choice' },
    topBar(ctx, run, { title: '전략 선택' }),
    h('div', { class: 'k-choice-head' },
      nodeTrack(run, true),
      h('h2', null, `${run.chapter}장 작전 전략`),
      h('p', null, offers.length ? '하나를 골라 이번 런 끝까지 가져갑니다. 다시 뽑을 수 없어요.' : '이번 장에는 제안된 전략이 없어요.'),
      run.strategies.length ? h('div', { class: 'k-owned' }, h('small', null, '보유 중'), ...run.strategies.map((sid) => h('span', { class: 'k-strat-chip' }, icon('strategy', 16), ctx.lookup.strategy(sid)?.name ?? sid))) : null),
    h('div', { class: cls('k-choice-row', `n-${offers.length}`) }, ...cards),
    h('footer', { class: 'k-choice-foot' }, confirm));
  return { el };
}
