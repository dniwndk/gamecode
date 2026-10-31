// 런 설정: 시드 확인, 장별 보스 예고, 시작 학생 3명 공개.
import type { Ctx, Screen } from '../app';
import { enemyPortrait, readable, unitCard } from '../components';
import { h } from '../dom';
import { icon } from '../icons';
import type { UiState } from '../model';

export function mountRunSetup(ctx: Ctx, s: UiState): Screen {
  const el = h('section', { class: 'k-setup' });
  const draw = (st: UiState) => {
    const run = st.run!;
    const seedInput = h('input', { id: 'k-seed', class: 'k-input', value: run.seed, spellcheck: 'false', autocomplete: 'off', 'aria-label': '시드' });
    const copy = h('button', {
      class: 'k-btn is-ghost is-sm', onclick: async () => {
        try { await navigator.clipboard.writeText(run.seed); ctx.toast('시드를 복사했어요'); } catch { seedInput.select(); ctx.toast('시드를 선택했어요. 복사해 주세요'); }
      },
    }, icon('records', 18), '복사');
    const apply = h('button', { class: 'k-btn is-blue is-sm', onclick: () => void ctx.send('NEW_RUN', { seed: seedInput.value }) }, icon('reroll', 18), '이 시드로');
    const random = h('button', { class: 'k-btn is-ghost is-sm', onclick: () => void ctx.send('NEW_RUN', {}) }, icon('reroll', 18), '무작위');
    const bosses = (run.offers?.bosses ?? []).filter(Boolean);
    el.replaceChildren(
      h('header', { class: 'k-setup-head' },
        h('button', { class: 'k-back', 'aria-label': '홈으로', onclick: () => void ctx.send('ABANDON_RUN') }, icon('back', 28)),
        h('div', null, h('span', { class: 'k-kicker' }, 'OPERATION BRIEFING'), h('h2', null, '작전 브리핑'))),
      h('div', { class: 'k-setup-grid' },
        h('section', { class: 'k-panel k-seed' },
          h('h3', null, icon('map', 22), '시드'),
          h('p', { class: 'k-muted' }, '같은 시드는 같은 상점과 같은 적 후보를 만납니다. 비우고 적용하면 무작위.'),
          h('div', { class: 'k-seed-row' }, seedInput, apply),
          h('div', { class: 'k-seed-row' }, copy, random),
          h('div', { class: 'k-start-vals' },
            h('span', null, icon('heart', 20), h('b', null, String(ctx.driver.catalog.rules.run.startRunHp)), '런 체력'),
            h('span', null, icon('gold', 20), h('b', null, String(ctx.driver.catalog.rules.run.startGold)), '골드'),
            h('span', null, h('i', null, 'Lv'), h('b', null, String(ctx.driver.catalog.rules.run.startLevel)), '레벨'))),
        h('section', { class: 'k-panel k-bosses' },
          h('h3', null, icon('skull', 22), '장별 보스'),
          h('div', { class: 'k-boss-row' }, ...bosses.map((id, i) => {
            const e = ctx.lookup.enemy(id)!;
            return h('article', { class: 'k-boss-card' },
              h('span', { class: 'k-boss-ch' }, `${i + 1}장`),
              enemyPortrait(ctx, id, 'is-lg'),
              h('strong', null, e.name.replace(/\s*\(.*\)$/, '')),
              h('p', null, readable(ctx, e.counterplay)));
          }))),
        h('section', { class: 'k-panel k-starters' },
          h('h3', null, icon('users', 22), '시작 학생'),
          h('p', { class: 'k-muted' }, '1코스트 학생 3명이 대기석에서 기다려요. 그중 2명 이상은 전방에 설 수 있어요.'),
          h('div', { class: 'k-starter-row' }, ...(run.offers?.startingUnits ?? []).map((id) => unitCard(ctx, { unitId: id, size: 'm', showSynergies: true }))))),
      h('footer', { class: 'k-setup-foot' },
        h('button', { class: 'k-start', onclick: () => void ctx.send('CONFIRM_RESULT') }, h('span', { class: 'k-start-ico' }, icon('flag', 34)), h('span', { class: 'k-start-text' }, h('b', null, '작전 개시'), h('small', null, '1장 전략 선택으로')))));
  };
  draw(s);
  return { el, update: draw };
}
