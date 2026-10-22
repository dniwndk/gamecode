// 특성·인연 표시 조각: 계기판 토큰, 칩, 카드, 인연 단계 배지. 여러 화면이 같은 모양을 쓴다.
import { esc, icon } from './dom.js';
import { TRAITS, TRAIT_KINDS } from '../data/traits.js';
import { BOND_TIERS } from '../data/bonds.js';

const KIND_CLS = { positive: 'pos', negative: 'neg', keyword: 'key' };
export const kindCls = (kind) => KIND_CLS[kind] || 'key';

// 마우스를 올리면 보이는 설명: 이름 · 갈래 / 묘사 / 효과 / 극복·여는 길
export function traitTip(id) {
  const d = TRAITS[id];
  if (!d) return '';
  const lines = [`${d.name} · ${TRAIT_KINDS[d.kind].name}`, d.desc];
  if (d.effects?.length) lines.push(...d.effects.map(e => `· ${e}`));
  if (d.opens) lines.push(`여는 길: ${d.opens}`);
  if (d.cure) lines.push(`극복: ${d.cure}`);
  return lines.join('\n');
}

// 동그란 황동 토큰 (계기판·결산)
export function traitToken(id, { cls = '', tag = 'span', attrs = '' } = {}) {
  const d = TRAITS[id];
  if (!d) return '';
  return `<${tag} class="tk tk--${kindCls(d.kind)} ${cls}" data-tip="${esc(traitTip(id))}" aria-label="${esc(`${TRAIT_KINDS[d.kind].name} 특성 ${d.name}`)}" ${attrs}>${icon(d.icon || 'star')}</${tag}>`;
}

// 글자 칩: 선택지 보상·조건, 계획 활동, 목표
export function traitChip(id, { prefix = '', cls = '', tip = true } = {}) {
  const d = TRAITS[id];
  if (!d) return '';
  return `<span class="chip chip--trait chip--${kindCls(d.kind)} ${cls}" ${tip ? `data-tip="${esc(traitTip(id))}"` : ''}>${icon(d.icon || 'star')}${prefix ? `<em>${esc(prefix)}</em>` : ''}${esc(d.name)}</span>`;
}

// 패널의 특성 카드
export function traitCard(t, { lost = false, note = '' } = {}) {
  const d = TRAITS[t.id];
  if (!d) return '';
  const k = kindCls(d.kind);
  const foot = lost ? `<small class="tc-foot ok">${icon('check')}${esc(t.cause || '이겨 냈다')}</small>`
    : d.kind === 'keyword' ? (d.opens ? `<small class="tc-foot">${icon('key')}${esc(d.opens)}</small>` : '')
    : d.cure ? `<small class="tc-foot">${icon('chevron')}${esc(d.cure)}</small>` : '';
  return `<li class="tcard tcard--${k} ${lost ? 'lost' : ''}">
    <span class="tk tk--${k} tk--lg">${icon(d.icon || 'star')}</span>
    <div class="tc-body">
      <div class="tc-head"><b>${esc(d.name)}</b>${t.age != null && !lost ? `<small>${t.age}세${t.source ? ` · ${esc(t.source)}` : ''}</small>` : ''}${note}</div>
      <p class="tc-desc">${esc(d.desc)}</p>
      ${d.effects?.length ? `<ul class="tc-fx">${d.effects.map(e => `<li>${esc(e)}</li>`).join('')}</ul>` : ''}
      ${foot}
    </div>
  </li>`;
}

// 인연 단계: 다섯 개의 톱니 눈금 + 이름
export function tierBadge(tier, { small = false } = {}) {
  const t = BOND_TIERS[tier] || BOND_TIERS[2];
  const pips = Array.from({ length: 5 }, (_, i) => `<i class="${i < tier ? 'on' : ''}"></i>`).join('');
  return `<span class="tier tier-${tier} ${small ? 'tier--sm' : ''}" data-tip="${esc(`인연 「${t.name}」 · ${t.desc}`)}"><span class="tier-pips">${pips}</span><b>${esc(t.name)}</b></span>`;
}

// 결산·결과에서 특성 변화의 좋고 나쁨
export function fxGood(what, v) {
  const lowerBetter = ['스트레스', '공명부하', '생계비(C)'].includes(what);
  return lowerBetter ? v < 0 : v > 0;
}

export { TRAITS, TRAIT_KINDS, BOND_TIERS };

// 목표와 어울리는 특성: 가진 것은 밝게, 없는 것은 흐리게
export function goalTraitsHtml(gv) {
  if (!gv?.traits?.length) return '';
  const fit = gv.traits.filter(t => t.kind !== 'negative');
  const shadow = gv.traits.filter(t => t.kind === 'negative');
  const any = fit.some(t => t.owned);
  return `<div class="goal-traits">
    <small>${icon('star')}어울리는 특성 ${any ? '<b class="pos">· 보유, 단계마다 +10/20/30C</b>' : '· 하나라도 가지면 단계마다 +10/20/30C'}</small>
    <div class="opt-traits">${fit.map(t => traitChip(t.id, { cls: t.owned ? 'owned' : 'dim' })).join('')}${shadow.map(t => traitChip(t.id, { cls: t.owned ? 'owned' : 'dim', prefix: '이겨 낼 그림자 · ' })).join('')}</div>
  </div>`;
}
