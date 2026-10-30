// 도감(런 밖): 학생 목록(구역·코스트·시너지 필터), 시너지 목록, 오파츠 목록.
import type { Ctx, Screen } from '../app';
import { attachTip, gfx, hideTip, openUnitDetail, readable, synHex, synergyTip, unitCard } from '../components';
import { cls, fill, h } from '../dom';
import { icon } from '../icons';

type Tab = 'units' | 'synergies' | 'ooparts';
const RARITY_LABEL: Record<string, string> = { common: '일반', uncommon: '고급', rare: '희귀', legendary: '전설' };
const CAT_LABEL: Record<string, string> = { faction: '학원', club: '동아리', role: '역할군', unique: '고유', platinum: '플래티넘' };

export function mountCodex(ctx: Ctx): Screen {
  const { pack } = ctx.driver.catalog;
  let tab: Tab = 'units';
  let pos: 'all' | 'front_only' | 'rear_only' | 'dual' = 'all';
  let cost = 0;
  let syn = '';
  let sortDesc = true;
  const el = h('section', { class: 'k-codex' });

  const draw = () => {
    hideTip();
    const units = pack.units
      .filter((u) => (pos === 'all' || u.position === pos) && (!cost || u.cost === cost) && (!syn || u.synergyIds.includes(syn)))
      .sort((a, b) => (sortDesc ? b.cost - a.cost : a.cost - b.cost) || a.name.localeCompare(b.name, 'ko'));
    const select = h('select', { id: 'k-codex-syn', class: 'k-select', 'aria-label': '시너지로 거르기', onchange: (e: Event) => { syn = (e.target as HTMLSelectElement).value; draw(); } },
      h('option', { value: '' }, '모든 시너지'),
      ...pack.synergies.map((s) => h('option', { value: s.id, selected: s.id === syn }, s.name)));
    const seg = <T extends string | number>(items: [T, string][], cur: T, set: (v: T) => void, label: string) =>
      h('div', { class: 'k-seg', role: 'group', 'aria-label': label }, ...items.map(([v, t]) => h('button', { class: cls(v === cur && 'on'), 'aria-pressed': v === cur ? 'true' : 'false', onclick: () => { set(v); draw(); } }, t)));

    // 전설은 레시피가 공개되기 전까지 실루엣과 「???」만(OOPARTS_v1 1.3). 공개 목록은 프로필에서 온다.
    const revealed = new Set(ctx.state().oopartRevealed ?? []);
    const oopName = (id: string) => pack.ooparts.find((x) => x.id === id)?.name ?? id;
    const oopBody = () => h('div', { class: 'k-codex-syns' }, ...['common', 'uncommon', 'rare', 'legendary'].map((r) => h('section', null,
      h('h3', null, `${RARITY_LABEL[r]} ${pack.ooparts.filter((o) => o.rarity === r).length}`),
      h('div', { class: 'k-codex-oop-grid' }, ...pack.ooparts.filter((o) => o.rarity === r).map((o) => {
        const hidden = r === 'legendary' && !revealed.has(o.id);
        return h('article', { class: cls('k-codex-oop', `is-${r}`, hidden && 'is-hidden', o.kind === 'drawback' && 'is-drawback') },
          h('div', { class: 'k-oop-art' }, gfx(ctx, `ooparts/${o.id}.webp`, () => h('span', { class: 'k-oop-code' }, o.code), 'k-oop-img')),
          h('div', { class: 'k-oop-text' },
            h('div', { class: 'k-oop-head' }, h('b', null, hidden ? '???' : o.name), h('small', null, `${o.code} · ${RARITY_LABEL[r]}`)),
            hidden ? h('p', { class: 'k-muted' }, '특정 오파츠를 모으면 합쳐져 나타나요. 한 번 완성하면 조합법이 공개돼요.') : h('p', null, readable(ctx, o.benefit)),
            !hidden && o.recipe ? h('p', { class: 'k-oop-recipe-line' }, `조합 · ${o.recipe.map(oopName).join(' + ')}`) : null,
            !hidden && o.drawback ? h('p', { class: 'k-oop-drawback' }, `대가 · ${readable(ctx, o.drawback)}`) : null,
            !hidden ? h('p', { class: 'k-oop-flavor' }, o.flavor) : null));
      })))));

    const body = tab === 'ooparts' ? oopBody() : tab === 'units'
      ? h('div', { class: 'k-codex-grid' }, ...units.map((u) => {
        const card = unitCard(ctx, { unitId: u.id, size: 'm', showSynergies: true });
        const b = h('button', { class: 'k-codex-item', 'aria-label': `${u.name} 상세`, onclick: () => openUnitDetail(ctx, u.id) }, card);
        return b;
      }), units.length ? null : h('p', { class: 'k-empty' }, '조건에 맞는 학생이 없어요. 필터를 하나 풀어 보세요.'))
      : h('div', { class: 'k-codex-syns' }, ...['faction', 'club', 'role', 'unique', 'platinum'].map((cat) => h('section', null,
        h('h3', null, CAT_LABEL[cat]),
        h('div', { class: 'k-codex-syn-grid' }, ...pack.synergies.filter((s) => s.category === cat).map((s) => {
          const item = h('button', { class: 'k-codex-syn', onclick: () => { syn = s.id; tab = 'units'; draw(); } },
            synHex(ctx, s.id, { size: 40 }),
            h('div', null, h('b', null, s.name.replace(/^고유:\s*/, '')), h('small', null, `${s.tiers.map((t) => t.threshold).join(' / ')} · ${s.memberIds.length}명`)));
          attachTip(ctx, item, () => synergyTip(ctx, { synergyId: s.id, count: 0, nextThreshold: s.tiers[0].threshold, activeTier: null, tracked: false }, null));
          return item;
        })))));

    fill(el,
      h('header', { class: 'k-codex-top' },
        h('button', { class: 'k-back', 'aria-label': '홈으로', onclick: () => ctx.go(null) }, icon('back', 28)),
        h('h2', null, '학생 도감'),
        h('div', { class: 'k-tabs' },
          h('button', { class: cls(tab === 'units' && 'on'), onclick: () => { tab = 'units'; draw(); } }, icon('users', 20), `학생 ${pack.units.length}`),
          h('button', { class: cls(tab === 'synergies' && 'on'), onclick: () => { tab = 'synergies'; draw(); } }, icon('codex', 20), `시너지 ${pack.synergies.length}`),
          h('button', { class: cls(tab === 'ooparts' && 'on'), onclick: () => { tab = 'ooparts'; draw(); } }, icon('vault', 20), `오파츠 ${pack.ooparts.length}`)),
        h('button', { class: 'k-home-btn', 'aria-label': '홈', onclick: () => ctx.go(null) }, icon('home', 26))),
      tab === 'units' ? h('div', { class: 'k-panel k-codex-bar' },
        h('div', { class: 'k-codex-title' }, icon('users', 22), h('b', null, '학생 리스트'), h('small', null, `${units.length}명`)),
        seg<typeof pos>([['all', '전체'], ['front_only', '전방'], ['rear_only', '후방'], ['dual', '겸용']], pos, (v) => (pos = v), '구역'),
        seg<number>([[0, '전 코스트'], [1, '1'], [2, '2'], [3, '3'], [4, '4'], [5, '5']], cost, (v) => (cost = v), '코스트'),
        select,
        h('button', { class: 'k-sort', onclick: () => { sortDesc = !sortDesc; draw(); } }, icon('speed', 18, sortDesc ? 'k-rot-down' : 'k-rot-up'), sortDesc ? '높은 코스트 순' : '낮은 코스트 순')) : null,
      h('div', { class: 'k-panel k-codex-body' }, body));
  };
  draw();
  return { el, destroy: hideTip };
}
