// 오파츠 보상(OOPARTS_v1 1.2): 런 시작·정예·1·2장 보스 승리 3택1, 구조 요청(3연패) 1개 지급.
// 3택1은 건너뛰면 골드. 전설은 보상에 나오지 않고, 재료를 모두 모으면 정산이 자동으로 합친다(완성 연출은 app.ts).
import type { Ctx, Screen } from '../app';
import { attachTip, gfx, readable, topBar } from '../components';
import { cls, h } from '../dom';
import { icon } from '../icons';
import type { UiState } from '../model';

export const OOPART_RARITY: Record<string, [string, string]> = {
  common: ['일반', '#8a9bb3'], uncommon: ['고급', '#3b8fe0'], rare: ['희귀', '#9b5de5'], legendary: ['전설', '#f0b400'],
};
const SOURCE_TITLE: Record<string, [string, string]> = {
  run_start: ['출발 전 오파츠', '작전을 시작하기 전에 오파츠 하나를 챙겨 가요.'],
  elite: ['정예 전리품 · 오파츠', '정예를 쓰러뜨린 자리에서 오파츠를 발견했어요.'],
  boss: ['보스 전리품 · 희귀 오파츠', '보스가 지키던 희귀 오파츠 중 하나를 가져가요.'],
  rescue: ['구조 요청', '연패 끝에 지원 물자가 도착했어요. 오파츠 하나를 받아요.'],
};

/** 오파츠 그림(없으면 번호) */
export function oopartArt(ctx: Ctx, id: string, className = 'k-oop-img'): HTMLElement {
  const def = ctx.lookup.oopart(id);
  return gfx(ctx, `ooparts/${id}.webp`, () => h('span', { class: 'k-oop-code' }, def?.name.slice(0, 1) ?? '?'), className);
}

/** 툴팁·카드 공용 본문 */
export function oopartBody(ctx: Ctx, id: string): HTMLElement[] {
  const o = ctx.lookup.oopart(id);
  if (!o) return [h('p', null, id)];
  const out: HTMLElement[] = [h('p', { class: 'k-oop-benefit' }, readable(ctx, o.benefit))];
  if (o.drawback) out.push(h('p', { class: 'k-oop-drawback' }, `대가 · ${readable(ctx, o.drawback)}`));
  out.push(h('p', { class: 'k-oop-flavor' }, o.flavor));
  const sup = oopartSupportLine(ctx, id);
  if (sup) out.push(sup);
  return out;
}

const SUPPORT_LABEL = { active: '적용 중', partial: '일부 적용', pending: '대기 중' } as const;
/** 지금 빌드에서 작동하는 정도(적용 중 / 일부 적용 / 시너지 효과 대기) */
export function oopartSupportLine(ctx: Ctx, id: string): HTMLElement | null {
  const s = ctx.state().oopartSupport?.[id];
  if (!s) return null;
  return h('p', { class: `k-oop-support is-${s.level}` }, h('b', null, SUPPORT_LABEL[s.level]), s.waiting ? ` ${s.waiting}` : '');
}

export function mountOopartChoice(ctx: Ctx, s: UiState): Screen {
  const run = s.run!;
  const offer = run.ooparts.offer;
  const ids = offer?.ids ?? [];
  const grant = !!offer?.grant;
  let picked: string | null = grant ? ids[0] ?? null : null;
  const [title, lead] = SOURCE_TITLE[offer?.source ?? 'run_start'];
  const confirm = h('button', {
    class: 'k-btn is-primary k-choice-confirm', disabled: !picked,
    onclick: async () => { if (!picked) return; confirm.disabled = true; skip.disabled = true; await ctx.send('CHOOSE_OOPART', { oopartId: picked }); },
  }, icon('check', 24), grant ? '받기' : '이 오파츠 가져가기');
  const skip = h('button', {
    class: 'k-btn k-oop-skip', hidden: grant,
    onclick: async () => { confirm.disabled = true; skip.disabled = true; await ctx.send('SKIP_OOPART'); },
  }, icon('gold', 22), `건너뛰고 ${offer?.skipGold ?? 2}G 받기`);

  const cards = ids.map((id, i) => {
    const o = ctx.lookup.oopart(id)!;
    const [label, color] = OOPART_RARITY[o.rarity];
    const badge = offer?.badges[i];
    const card = h('button', {
      class: cls('k-choice-card is-oop', o.kind === 'drawback' && 'is-drawback', grant && 'is-picked'), style: `--hue:${color}`, 'aria-pressed': grant ? 'true' : 'false',
      onclick: () => {
        if (grant) return;
        picked = id;
        ctx.fx.burst(card, { color, size: 380, ms: 800 });
        cards.forEach((c) => { const on = c === card; c.classList.toggle('is-picked', on); c.setAttribute('aria-pressed', on ? 'true' : 'false'); });
        confirm.disabled = false;
      },
    },
    h('div', { class: 'k-choice-art k-oop-choice-art' }, h('div', { class: 'k-choice-halo' }), oopartArt(ctx, id, 'k-choice-eq'),
      h('span', { class: 'k-choice-kind' }, label),
      badge ? h('span', { class: 'k-oop-recipe' }, `조합 재료 (${badge.owned}/${badge.total})`) : null),
    h('h3', null, o.name),
    h('div', { class: 'k-oop-card-text' }, ...oopartBody(ctx, id)),
    h('span', { class: 'k-check' }, icon('check', 26)));
    return card;
  });

  const owned = run.ooparts.owned;
  const el = h('section', { class: 'k-choice' },
    topBar(ctx, run, { title: '오파츠' }),
    h('div', { class: 'k-choice-head' },
      h('h2', null, title),
      h('p', null, ids.length ? lead : '이번에는 남은 오파츠가 없어요.'),
      owned.length ? h('div', { class: 'k-owned k-oop-owned' }, h('small', null, `보유 ${owned.length}`), ...owned.map((oid) => oopartChip(ctx, oid))) : null),
    h('div', { class: cls('k-choice-row', `n-${ids.length}`) }, ...cards),
    h('footer', { class: 'k-choice-foot k-oop-foot' }, skip, confirm));
  return { el };
}

/** 보유 오파츠 작은 칩(그림 + 툴팁). 준비 화면·보상 화면 공용 */
export function oopartChip(ctx: Ctx, id: string): HTMLElement {
  const o = ctx.lookup.oopart(id);
  const color = OOPART_RARITY[o?.rarity ?? 'common'][1];
  const chip = h('span', { class: cls('k-oop-chip', o?.kind === 'drawback' && 'is-drawback'), style: `--rc:${color}`, tabindex: 0, 'aria-label': o?.name ?? id }, oopartArt(ctx, id, 'k-oop-chip-img'));
  attachTip(ctx, chip, () => h('div', { class: 'k-oop-tip' },
    h('div', { class: 'k-oop-tip-head' }, h('strong', null, o?.name ?? id), h('small', null, o ? OOPART_RARITY[o.rarity][0] : '')),
    ...oopartBody(ctx, id)));
  return chip;
}

/** 보유 오파츠 전체 목록(상단 바 「오파츠」 버튼). 그림·이름·등급·효과·대가·적용 상태를 한 번에 본다 */
export function openOwnedOoparts(ctx: Ctx, ids: readonly string[]): void {
  let close: () => void = () => {};
  const order = { legendary: 0, rare: 1, uncommon: 2, common: 3 } as Record<string, number>;
  const sorted = [...ids].sort((a, b) => (order[ctx.lookup.oopart(a)?.rarity ?? 'common'] ?? 9) - (order[ctx.lookup.oopart(b)?.rarity ?? 'common'] ?? 9));
  const rows = sorted.map((id) => {
    const o = ctx.lookup.oopart(id);
    const [label, color] = OOPART_RARITY[o?.rarity ?? 'common'];
    return h('article', { class: cls('k-oop-row', o?.kind === 'drawback' && 'is-drawback'), style: `--rc:${color}` },
      h('div', { class: 'k-oop-row-art' }, oopartArt(ctx, id, 'k-oop-row-img')),
      h('div', { class: 'k-oop-row-body' },
        h('div', { class: 'k-oop-row-head' }, h('strong', null, o?.name ?? id), h('small', null, o ? label : '')),
        ...oopartBody(ctx, id)));
  });
  const panel = h('div', { class: 'k-dialog k-oop-list' },
    h('header', { class: 'k-dialog-head' }, h('h2', null, `보유 오파츠 ${ids.length}`), h('button', { class: 'k-x', 'aria-label': '닫기', onclick: () => close() }, icon('close', 26))),
    ids.length ? h('div', { class: 'k-oop-rows' }, ...rows) : h('p', { class: 'k-muted k-oop-empty' }, '아직 가진 오파츠가 없어요. 런 시작·정예·보스 승리 때 얻을 수 있어요.'));
  close = ctx.modal(panel, { wide: true, label: '보유 오파츠' });
}
