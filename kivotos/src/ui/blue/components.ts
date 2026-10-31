// 공통 컴포넌트: 초상화, 유닛 카드, 별, 시너지 육각 배지, 상단 상태바, 툴팁, 학생 상세, 레벨업 창.
import type { Position } from '../../core/types/content';
import type { Ctx } from './app';
import { cls, h } from './dom';
import { icon } from './icons';
import { fxList } from './summary';
import { openOwnedOoparts } from './screens/ooparts';
import type { RunView, SynergyStateView, UnitInstanceView } from './model';

export const COST_COLOR = ['#9aa5b1', '#3fb37f', '#3b82f6', '#a855f7', '#f5b400'];
const CATEGORY_COLOR: Record<string, string> = { club: '#14a38b', role: '#1f8fff', unique: '#f0a500', easteregg: '#8a9bb4' };
const FACTION_COLOR: Record<string, string> = { syn_abydos: '#3b82f6', syn_gehenna: '#dc2626', syn_millennium: '#0ea5e9', syn_trinity: '#e0a106', syn_hyakkiyako: '#db2777', syn_shanhaijing: '#16a34a', syn_red_winter: '#b91c1c', syn_valkyrie: '#1d4ed8', syn_srt: '#475569', syn_arius: '#7c3aed', syn_problem_solver: '#9f1239', syn_cc: '#1f2937', syn_highlander: '#0f766e', syn_outlaw: '#a16207' };

export const STATUS_LABEL: Record<string, string> = {
  st_atk_down: '공격↓', st_atk_up: '공격↑', st_burn: '화상', st_charge_aris: '충전', st_crit_up: '치명↑', st_damage_reduction: '피해감소',
  st_damage_up: '피해↑', st_def_down: '방어↓', st_def_up: '방어↑', st_delayed: '지연', st_healing_received_down: '치유↓', st_hot: '지속회복',
  st_next_crit: '확정치명', st_rage_neru: '분노', st_silence: '침묵', st_spd_down: '속도↓', st_spd_up: '속도↑', st_stun: '기절', st_taunt: '도발', st_vuln: '취약',
};
export const DEBUFFS = new Set(['st_atk_down', 'st_burn', 'st_def_down', 'st_delayed', 'st_healing_received_down', 'st_silence', 'st_spd_down', 'st_stun', 'st_vuln']);

export const POSITION_LABEL: Record<Position, string> = { front_only: '전방', rear_only: '후방', dual: '겸용' };

export function shortName(name: string): string {
  const variant = name.match(/\(([^)]+)\)$/)?.[1];
  const base = name.replace(/\s*\(.*\)$/, '');
  const parts = base.split(' ');
  const short = parts.length > 1 ? parts.slice(1).join(' ') : base;
  return variant ? `${short}·${variant}` : short;
}

/** 효과 문장의 `u_id`·`st_id` 표기를 사람이 읽는 말로 바꾸고, 엔진 내부 메모(ActionResolver·handler 등)는 뺀다. */
export function readable(ctx: Ctx, text: string): string {
  return text
    .split(/(?<=[.。])\s+/).filter((s) => !/ActionResolver|handler|원안/.test(s)).join(' ')
    .replace(/`(u_[a-z_]+)`/g, (_, id: string) => { try { return shortName(ctx.lookup.unit(id).name); } catch { return id; } })
    .replace(/\(?`st_[a-z_]+`\)?/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\s+/g, ' ').replace(/\(\s*\)/g, '').trim();
}

export function initials(name: string): string {
  return shortName(name).slice(0, 2);
}

export function synergyColor(ctx: Ctx, synId: string): string {
  const s = ctx.lookup.syn(synId);
  if (!s) return '#64748b';
  return FACTION_COLOR[synId] ?? CATEGORY_COLOR[s.category] ?? '#64748b';
}

export function synergyGlyph(ctx: Ctx, synId: string): string {
  const s = ctx.lookup.syn(synId);
  if (!s) return '?';
  const n = s.name.replace(/^고유:\s*/, '').replace(/[「」]/g, '');
  if (/^\d/.test(n)) return n.match(/^\d+/)![0];
  if (/^[A-Za-z]/.test(n)) return n.replace(/[^A-Za-z&]/g, '').slice(0, 3);
  return n.slice(0, 1);
}

/** 추가 에셋(public/gfx/). 파일이 없거나 받지 못하면 fallback으로 기존 글자·기본 아이콘 표시를 되돌린다 */
export function gfx(ctx: Ctx, path: string, fallback: () => Node, className = ''): HTMLElement {
  const img = h('img', { class: cls('k-gfx-img', className), src: ctx.art(`gfx/${path}`), alt: '', decoding: 'async', draggable: 'false' }) as HTMLImageElement;
  img.addEventListener('error', () => img.replaceWith(fallback()), { once: true });
  return img;
}

/**
 * 시너지 배지: 모두 같은 남색 육각 + 굵은 흰 문양. 색으로 종류를 나누지 않고 문양 자체로 알아보게 한다.
 * 흰 바깥 테가 초상화·밝은 패널 어디서나 윤곽을 세우고, 발동 단계만 바깥 테(동·은·금)로 보여 준다. 문양이 없으면 이름 첫 글자.
 */
export function synHex(ctx: Ctx, synId: string, opts: { size?: number; dim?: boolean; tier?: number | null; plat?: boolean } = {}): HTMLElement {
  const el = h('span', { class: cls('k-hex', opts.dim && 'is-dim', opts.plat ? 'tier-plat' : opts.tier !== undefined && opts.tier !== null && `tier-${opts.tier}`), style: `--s:${opts.size ?? 28}px`, title: ctx.lookup.syn(synId)?.name ?? synId },
    h('span', { class: 'k-hex-in' }, gfx(ctx, `synergy/${synId}.svg`, () => { const g = synergyGlyph(ctx, synId); return h('span', { class: cls('k-hex-txt', g.length > 2 && 'is-long') }, g); }, 'k-hex-glyph')));
  return el;
}

/** 상태 아이콘(단색 SVG를 마스크로 써서 글자색을 따른다). 파일이 없으면 빈 칸이고 옆 글자가 그대로 남는다 */
export function statusIcon(ctx: Ctx, statusId: string): HTMLElement {
  return h('i', { class: 'k-st-ico', 'aria-hidden': 'true', style: `--m:url("${ctx.art(`gfx/status/${statusId}.svg`)}")` });
}

export function stars(n: number, max = 3): HTMLElement {
  const el = h('span', { class: 'k-stars', 'aria-label': `${n}성` });
  for (let i = 0; i < max; i++) el.append(icon('star', 18, i < n ? 'on' : 'off'));
  return el;
}

export function portrait(ctx: Ctx, unitId: string, className = ''): HTMLElement {
  const unit = ctx.lookup.unit(unitId);
  const { color } = ctx.faction(unit);
  const box = h('div', { class: `k-portrait ${className}`, style: `--fc:${color}` });
  const fallback = () => box.replaceChildren(h('span', { class: 'k-initials' }, initials(unit.name)));
  const url = ctx.portrait(unitId);
  if (url) {
    const img = h('img', { src: url, alt: '', loading: 'lazy', decoding: 'async', draggable: 'false' });
    img.addEventListener('error', fallback);
    box.append(img);
  } else fallback();
  return box;
}

/** 패배 결과 화면용 삽화(public/defeat). 없으면 기본 초상화로 */
export function defeatArt(ctx: Ctx, unitId: string, className = ''): HTMLElement {
  const box = portrait(ctx, unitId, className);
  const img = h('img', { src: ctx.art(`defeat/${unitId}.webp`), alt: '', decoding: 'async', draggable: 'false' }) as HTMLImageElement;
  img.addEventListener('load', () => { box.replaceChildren(img); box.classList.add('is-defeat-art'); });
  return box;
}

export function enemyPortrait(ctx: Ctx, enemyId: string, className = ''): HTMLElement {
  const e = ctx.lookup.enemy(enemyId);
  const name = e?.name ?? enemyId;
  const label = name.replace(/\s*\(.*\)$/, '').split(/[ :]/).filter(Boolean).pop() ?? name;
  return h('div', { class: cls('k-enemy-face', e?.boss && 'is-boss', className), title: name },
    gfx(ctx, `enemies/${enemyId}.webp`, () => h('span', { class: 'k-enemy-glyph' }, label.slice(0, 2)), 'k-enemy-img'),
    e?.zone === 'rear' ? h('span', { class: 'k-enemy-zone' }, icon('rear', 14)) : null);
}

export interface CardOpts {
  unitId: string;
  star?: number;
  size: 's' | 'm' | 'l';
  inst?: UnitInstanceView;
  showCost?: boolean;
  showSynergies?: boolean;
  badge?: HTMLElement | null;
  className?: string;
}

export function unitCard(ctx: Ctx, o: CardOpts): HTMLElement {
  const u = ctx.lookup.unit(o.unitId);
  const star = o.star ?? o.inst?.star ?? 1;
  const card = h('div', {
    class: cls('k-card', `is-${o.size}`, `cost-${u.cost}`, `star-${star}`, o.className),
    style: `--cc:${COST_COLOR[u.cost - 1]}`,
    'data-unit': u.id,
  });
  card.append(portrait(ctx, u.id, 'k-card-art'));
  card.append(h('div', { class: 'k-card-shade' }));
  const top = h('div', { class: 'k-card-top' }, stars(star));
  if (o.showCost !== false) top.append(h('span', { class: 'k-cost' }, icon('gold', 14), String(u.cost)));
  card.append(top);
  const pos = u.position;
  const zone = h('span', { class: `k-zone-tag is-${pos}`, title: POSITION_LABEL[pos] }, icon(pos === 'rear_only' ? 'rear' : 'front', 14), pos === 'dual' ? icon('rear', 14) : null);
  const bottom = h('div', { class: 'k-card-bottom' });
  if (o.showSynergies) {
    bottom.append(h('div', { class: 'k-card-syns' }, ...u.synergyIds.slice(0, 4).map((s) => synHex(ctx, s, { size: o.size === 'm' ? 28 : 24 }))));
  }
  bottom.append(h('div', { class: 'k-card-name' }, zone, h('span', { class: 'k-name-text' }, shortName(u.name))));
  card.append(bottom);
  if (o.inst?.equipment.length) {
    card.append(h('div', { class: 'k-card-eq' }, ...o.inst.equipment.map((id) => eqChip(ctx, id, true))));
  }
  if (o.badge) card.append(o.badge);
  return card;
}

export function eqChip(ctx: Ctx, id: string, mini = false): HTMLElement {
  const eq = ctx.lookup.eq(id);
  const zoneColor = eq?.zone === 'front' ? '#ff8a3d' : eq?.zone === 'rear' ? '#7c5cff' : '#1f8fff';
  return h('span', { class: cls('k-eq', mini && 'is-mini'), style: `--z:${zoneColor}`, title: eq?.name ?? id },
    gfx(ctx, `equipment/${id}.webp`, () => icon('equipment', mini ? 12 : 18), 'k-eq-img'), mini ? null : h('span', null, eq?.name ?? id));
}

// ── 툴팁 ───────────────────────────────────────────────
let tipEl: HTMLElement | null = null;
let tipTimer = 0;
export function attachTip(ctx: Ctx, target: HTMLElement, build: () => HTMLElement): void {
  const show = () => {
    hideTip();
    if (!target.isConnected) return;
    tipEl = h('div', { class: 'k-tip', role: 'tooltip' }, build());
    ctx.stage.append(tipEl);
    const s = ctx.scale();
    const sr = ctx.stage.getBoundingClientRect();
    const r = target.getBoundingClientRect();
    if (ctx.mobile()) { tipEl.classList.add('is-sheet'); return; }
    const x = (r.right - sr.left) / s + 12;
    const y = (r.top - sr.top) / s;
    const w = tipEl.offsetWidth;
    const left = x + w > 1900 ? (r.left - sr.left) / s - w - 12 : x;
    tipEl.style.left = `${Math.max(8, left)}px`;
    tipEl.style.top = `${Math.min(1080 - tipEl.offsetHeight - 8, Math.max(8, y))}px`;
  };
  target.addEventListener('pointerenter', (e) => {
    if ((e as PointerEvent).pointerType === 'touch') return;
    clearTimeout(tipTimer);
    tipTimer = window.setTimeout(show, 250);
  });
  target.addEventListener('pointerleave', () => { clearTimeout(tipTimer); hideTip(); });
  target.addEventListener('pointerdown', () => { clearTimeout(tipTimer); hideTip(); });
  target.addEventListener('focus', () => { tipTimer = window.setTimeout(show, 250); });
  target.addEventListener('blur', () => { clearTimeout(tipTimer); hideTip(); });
}
export function hideTip(): void {
  tipEl?.remove();
  tipEl = null;
}

// ── 시너지 ─────────────────────────────────────────────
export function synergyTip(ctx: Ctx, s: SynergyStateView, run?: RunView | null): HTMLElement {
  const syn = ctx.lookup.syn(s.synergyId)!;
  const owned = new Set<string>();
  const deployed = new Set<string>();
  if (run) {
    for (const i of [...run.board.front, ...run.board.rear]) if (i) { deployed.add(i.unitId); owned.add(i.unitId); }
    for (const i of run.board.bench) if (i) owned.add(i.unitId);
  }
  const scope = syn.countScope === 'front_only' ? '전방에 놓인 구성원만 셉니다' : syn.countScope === 'rear_only' ? '후방에 놓인 구성원만 셉니다' : '편성된 구성원(전방+후방)을 셉니다';
  return h('div', { class: 'k-syn-tip' },
    h('header', null, synHex(ctx, syn.id, { size: 34 }), h('div', null, h('strong', null, syn.name), h('small', null, scope))),
    // 런 동안 쌓인 스택(값은 게임 쪽이 준다)
    s.stacks?.length ? h('div', { class: 'k-stack-box' }, h('span', { class: 'k-stack-title' }, '지금까지 쌓인 스택'), ...s.stacks.map((l) => h('div', { class: 'k-stack-line' },
      h('div', { class: 'k-stack-head' }, h('b', null, l.label), h('strong', null, l.value)),
      l.progress ? h('div', { class: 'k-stack-bar' }, h('i', { style: `--p:${Math.min(100, (l.progress.current / Math.max(1, l.progress.max)) * 100)}%` })) : null,
      l.note ? h('small', null, l.note) : null))) : null,
    h('ol', { class: 'k-tier-list' }, ...syn.tiers.map((t, idx) => h('li', { class: cls(s.activeTier === idx && 'is-active', s.activeTier !== null && idx < s.activeTier && 'is-passed', t.grade === 'platinum' && 'is-plat') },
      h('b', null, String(t.threshold)), t.grade === 'platinum' ? platTier(ctx, t.spec) : fxList(ctx, t.spec)))),
    h('div', { class: 'k-tip-members' }, ...syn.memberIds.map((id) => {
      const u = ctx.lookup.unit(id);
      return h('span', { class: cls('k-mini-member', deployed.has(id) ? 'is-deployed' : owned.has(id) ? 'is-owned' : null), title: u.name },
        portrait(ctx, id, 'is-round'), h('i', null, String(u.cost)));
    })));
}

/** 플래티넘 단계 본문은 「이름」으로 시작한다. 이름은 표식에 붙이고 나머지만 효과 목록으로 */
function platTier(ctx: Ctx, spec: string): HTMLElement {
  const m = spec.match(/^플래티넘 「(.+?)」\.\s*/);
  return h('div', null, h('span', { class: 'k-plat-tag' }, m ? `플래티넘 · ${m[1]}` : '플래티넘'), fxList(ctx, m ? spec.slice(m[0].length) : spec));
}

export function synergyRow(ctx: Ctx, s: SynergyStateView, run: RunView | null, onPin?: (id: string | null) => void): HTMLElement {
  const syn = ctx.lookup.syn(s.synergyId)!;
  const oneShort = s.activeTier === null && s.nextThreshold !== null && s.nextThreshold - s.count === 1;
  const state = s.activeTier !== null ? 'is-active' : oneShort ? 'is-near' : 'is-off';
  const platOn = s.activeTier !== null && syn.tiers[s.activeTier]?.grade === 'platinum';
  const row = h('div', { class: cls('k-syn', state, s.tracked && 'is-tracked', platOn && 'is-plat'), tabindex: 0, role: 'listitem' },
    synHex(ctx, s.synergyId, { size: 46, dim: s.activeTier === null, tier: s.activeTier, plat: platOn }),
    h('div', { class: 'k-syn-body' },
      h('div', { class: 'k-syn-name' }, h('span', null, syn.name.replace(/^고유:\s*/, '')), platOn ? h('span', { class: 'k-plat-tag' }, '플래티넘') : null),
      h('div', { class: 'k-syn-steps' },
        h('b', { class: 'k-syn-count' }, String(s.count)),
        ...syn.tiers.map((t, idx) => h('span', { class: cls('k-step', s.activeTier !== null && idx <= s.activeTier && 'on', s.activeTier === idx && 'cur', t.grade === 'platinum' && 'is-plat'), title: t.grade === 'platinum' ? `${t.threshold}명 플래티넘 단계` : undefined }, String(t.threshold))))),
  );
  if (onPin) {
    row.append(h('button', {
      class: cls('k-pin', s.tracked && 'on'), 'aria-pressed': s.tracked ? 'true' : 'false',
      'aria-label': s.tracked ? `${syn.name} 추적 해제` : `${syn.name} 추적 (상점 5번 칸 추천에 반영)`,
      onclick: (e: Event) => { e.stopPropagation(); onPin(s.tracked ? null : s.synergyId); },
    }, icon('pin', 18)));
  }
  attachTip(ctx, row, () => synergyTip(ctx, s, run));
  return row;
}

// ── 상단 상태바 ─────────────────────────────────────────
export function topBar(ctx: Ctx, run: RunView, opts: { title: string; onBack?: () => void; extra?: HTMLElement[] } ): HTMLElement {
  const xpPct = run.xpToNext ? Math.min(100, (run.xp / run.xpToNext) * 100) : 100;
  const hpPct = (run.runHp / run.runHpMax) * 100;
  const bar = h('header', { class: 'k-top' },
    h('div', { class: 'k-top-left' },
      opts.onBack ? h('button', { class: 'k-back', 'aria-label': '메뉴', onclick: opts.onBack }, icon('back', 28)) : null,
      h('div', { class: 'k-top-title' }, h('strong', null, opts.title), h('span', { class: 'k-node-code' }, `${run.chapter}-${run.battle}`))),
    h('div', { class: 'k-res' },
      h('div', { class: cls('k-pill is-hp', hpPct < 35 && 'is-low'), title: '런 체력' }, icon('heart', 26), h('b', null, String(run.runHp)), h('small', null, `/${run.runHpMax}`),
        h('i', { class: 'k-pill-meter', style: `--p:${hpPct}%` })),
      h('div', { class: 'k-pill is-gold', title: `골드 · 다음 이자 +${run.nextInterestPreview.gold}G` }, icon('gold', 26), h('b', null, String(run.gold)),
        h('small', { class: 'k-interest' }, `+${run.nextInterestPreview.gold}${run.nextInterestPreview.capBonus ? ` · 상한 +${run.nextInterestPreview.capBonus}` : ''}`)),
      h('div', { class: 'k-pill is-level', title: `레벨 ${run.level} · 편성 가능 인원 ${run.deployLimit}` },
        h('span', { class: 'k-lv' }, h('small', null, 'Lv'), h('b', null, String(run.level))),
        h('span', { class: 'k-xp' }, h('i', { style: `--p:${xpPct}%` }), h('small', null, run.xpToNext ? `${run.xp}/${run.xpToNext}` : 'MAX'))),
      h('div', { class: cls('k-pill is-team', run.deployedCount > run.deployLimit && 'is-over'), title: '편성 인원' }, icon('users', 24), h('b', null, `${run.deployedCount}/${run.deployLimit}`)),
      run.streak.count >= 2 ? h('div', { class: cls('k-pill is-streak', run.streak.kind === 'loss' && 'is-loss') }, icon('flag', 22), h('b', null, `${run.streak.count}${run.streak.kind === 'win' ? '연승' : '연패'}`)) : null,
      h('button', { class: 'k-pill is-oop', title: '보유 오파츠와 효과 보기', 'aria-label': `보유 오파츠 ${run.ooparts.owned.length}개 보기`, onclick: () => openOwnedOoparts(ctx, run.ooparts.owned) },
        icon('diamond', 24), h('small', null, '오파츠'), h('b', null, String(run.ooparts.owned.length))),
      ...(opts.extra ?? [])),
  );
  return bar;
}

/** 15칸 노드 진행 줄(장마다 일반3·정예1·보스1) */
export function nodeTrack(run: RunView, compact = false): HTMLElement {
  const el = h('div', { class: cls('k-track', compact && 'is-compact'), 'aria-label': `${run.chapter}장 ${run.battle}전투` });
  for (let c = 1; c <= 3; c++) {
    const ch = h('div', { class: cls('k-track-ch', c === run.chapter && 'is-cur') }, h('span', { class: 'k-track-label' }, `${c}장`));
    for (let b = 1; b <= 5; b++) {
      const idx = (c - 1) * 5 + b - 1;
      const res = run.nodeHistory[idx];
      const type = b === 5 ? 'boss' : b === 4 ? 'elite' : 'normal';
      const cur = c === run.chapter && b === run.battle;
      ch.append(h('span', { class: cls('k-node', `is-${type}`, res && `is-${res}`, cur && 'is-cur'), title: `${c}-${b}` },
        icon(type === 'boss' ? 'skull' : type === 'elite' ? 'diamond' : 'dot', type === 'normal' ? 12 : 16)));
    }
    el.append(ch);
  }
  return el;
}

// ── 학생 상세 ──────────────────────────────────────────
export function openUnitDetail(ctx: Ctx, unitId: string, inst?: UnitInstanceView, zone?: 'front' | 'rear' | 'bench'): void {
  const u = ctx.lookup.unit(unitId);
  const star = inst?.star ?? 1;
  const mult = ctx.driver.catalog.rules.units.starStatMultiplierBps[star - 1] / 10000;
  const st = inst?.stats ?? { ...u.baseStats, hp: Math.round(u.baseStats.hp * mult), atk: Math.round(u.baseStats.atk * mult) };
  const { color } = ctx.faction(u);
  const activeSide: 'front' | 'rear' = zone === 'rear' ? 'rear' : zone === 'front' ? 'front' : u.position === 'rear_only' ? 'rear' : 'front';
  const run = ctx.state().run;
  let close: () => void = () => {};

  const skill = (label: string, iconName: string, effId: string | null, sub?: string) => {
    const e = ctx.lookup.effectSpec(effId);
    if (!e) return null;
    return h('div', { class: 'k-skill' },
      h('span', { class: 'k-skill-ico' }, icon(iconName, 26)),
      h('div', null, h('div', { class: 'k-skill-head' }, h('strong', null, label), sub ? h('small', null, sub) : null), fxList(ctx, e.spec, { atk: st.atk, hp: st.hp, star }, e.limits)));
  };
  const frontBlock = h('section', { class: cls('k-skillset', activeSide === 'front' ? 'is-on' : 'is-off') },
    h('h3', null, icon('front', 20), '전방에 있을 때'),
    u.position === 'rear_only' ? h('p', { class: 'k-muted' }, '후방 전용 학생이라 전방에 설 수 없어요.') : null,
    skill('기본 공격', 'sword', u.abilityIds.basic),
    skill('전투 스킬', 'xp', u.abilityIds.skill, 'SP 1'),
    skill('필살기', 'star', u.abilityIds.ultimate, '에너지 100'),
    ...u.abilityIds.frontEffects.map((id) => skill('패시브', 'shield', id)));
  const rearBlock = h('section', { class: cls('k-skillset', activeSide === 'rear' ? 'is-on' : 'is-off') },
    h('h3', null, icon('rear', 20), '후방에 있을 때'),
    u.position === 'front_only' ? h('p', { class: 'k-muted' }, '전방 전용 학생이라 후방 지원이 없어요. 후방 학생은 HP가 없고 정기 지원과 반응으로만 싸웁니다.') : null,
    skill('정기 지원', 'rear', u.abilityIds.rearAction),
    ...u.abilityIds.rearEffects.map((id) => skill('반응', 'xp', id)));

  const eqSlots = h('div', { class: 'k-eq-slots' });
  if (inst) {
    for (let i = 0; i < (inst.equipSlots ?? 2); i++) {
      const id = inst.equipment[i];
      eqSlots.append(id
        ? h('button', { class: 'k-eq-slot is-filled', title: '눌러서 해제', onclick: async () => { if (await ctx.send('UNEQUIP_ITEM', { instanceId: inst.instanceId, equipmentId: id })) { close(); } } }, eqChip(ctx, id), h('small', null, '해제'))
        : h('div', { class: 'k-eq-slot' }, icon('plus', 20), h('small', null, '빈 칸')));
    }
    const stash = run?.equipmentStash ?? [];
    if (stash.length) {
      eqSlots.append(h('div', { class: 'k-stash' }, h('small', null, '보관함 — 눌러서 장착'), ...stash.map((id, idx) => h('button', {
        class: 'k-stash-item', title: ctx.lookup.eq(id)?.description ?? '',
        onclick: async () => {
          const full = inst.equipment.length >= (inst.equipSlots ?? 2);
          if (await ctx.send('EQUIP_ITEM', { instanceId: inst.instanceId, equipmentId: id, ...(full ? { replaceIndex: 0 } : {}) })) {
            if (full) ctx.toast(`${ctx.lookup.eq(inst.equipment[0])?.name}은(는) 보관함으로 돌아갔어요`);
            close();
          }
          void idx;
        },
      }, eqChip(ctx, id)))));
    }
  }

  const statCell = (label: string, value: string | number, ic: string) => h('div', { class: 'k-stat' }, icon(ic, 20), h('span', null, label), h('b', null, String(value)));
  const dlg = ctx.lookup.line(unitId, 'recruit');
  const panel = h('div', { class: 'k-detail', style: `--fc:${color}` },
    h('div', { class: 'k-detail-art' },
      portrait(ctx, unitId, 'k-detail-portrait'),
      h('div', { class: 'k-detail-halo' }),
      h('div', { class: 'k-nameplate' },
        h('div', { class: 'k-nameplate-tags' }, h('span', { class: `k-pos is-${u.position}` }, POSITION_LABEL[u.position]), ...u.synergyIds.filter((s) => ctx.lookup.syn(s)?.category === 'faction').map((s) => h('span', { class: 'k-faction' }, ctx.lookup.syn(s)!.name))),
        h('h2', null, u.name),
        h('div', { class: 'k-nameplate-row' }, stars(star), h('span', { class: 'k-cost-lg', style: `--cc:${COST_COLOR[u.cost - 1]}` }, icon('gold', 18), `${u.cost} 코스트`)),
        ['u_rabu', 'u_akemi', 'u_akira'].includes(u.id) ? h('span', { class: 'k-npc' }, '원작 NPC') : null),
      dlg ? h('p', { class: 'k-detail-line' }, `“${dlg}”`) : null),
    h('div', { class: 'k-detail-info' },
      h('header', { class: 'k-detail-head' },
        h('div', { class: 'k-tabs-static' }, h('span', { class: 'on' }, '기본 정보')),
        h('button', { class: 'k-x', 'aria-label': '닫기', onclick: () => close() }, icon('close', 28))),
      h('div', { class: 'k-detail-scroll' },
        h('div', { class: 'k-role' }, h('small', null, '역할'), h('p', null, u.role)),
        h('div', { class: 'k-stats' },
          statCell('체력', st.hp.toLocaleString(), 'heart'), statCell('공격력', st.atk, 'sword'), statCell('방어력', st.def, 'shield'),
          statCell('속도', st.spd, 'speed'), statCell('치명', `${st.critBps / 100}%`, 'star'), statCell('치명 피해', `${st.critDamageBps / 100}%`, 'xp')),
        h('div', { class: 'k-detail-syns' }, ...u.synergyIds.map((s) => h('span', { class: 'k-syn-chip' }, synHex(ctx, s, { size: 26 }), ctx.lookup.syn(s)?.name.replace(/^고유:\s*/, '') ?? s))),
        h('p', { class: 'k-eff-note' }, icon('info', 16), `굵은 숫자는 ${star}성 공격력 ${st.atk}·최대 체력 ${st.hp.toLocaleString()} 기준 예상치예요(적 방어·치명타 반영 전).`),
        activeSide === 'front' ? [frontBlock, rearBlock] : [rearBlock, frontBlock],
        inst ? h('section', { class: 'k-eq-section' }, h('h3', null, icon('equipment', 20), '장비'), eqSlots) : null),
      inst ? h('footer', { class: 'k-detail-foot' },
        h('button', {
          class: 'k-btn is-ghost',
          onclick: async () => {
            const ok = inst.star < 3 || await ctx.confirm({
              title: '학생 판매', confirm: `${inst.sellValue}G에 판매`, danger: true,
              body: [`${u.name} ${star}성을 판매합니다.`, star >= 2 ? `판매가 ${inst.sellValue}G (2성 이상 감가 −1G 반영)` : `판매가 ${inst.sellValue}G`, inst.equipment.length ? '장착한 장비는 보관함으로 돌아가요.' : ''].filter(Boolean),
            });
            if (ok && await ctx.send('SELL_UNIT', { instanceId: inst.instanceId })) close();
          },
        }, icon('sell', 22), `판매 ${inst.sellValue}G`),
        h('button', { class: 'k-btn is-primary', onclick: () => close() }, icon('check', 22), '확인')) : null));
  close = ctx.modal(panel, { wide: true, label: `${u.name} 상세` });
}

// ── 레벨업 창(경험치 구매) ───────────────────────────────
export function openLevelUp(ctx: Ctx): void {
  const run0 = ctx.state().run;
  if (!run0) return;
  let times = 1;
  let close: () => void = () => {};
  const body = h('div', { class: 'k-lv-body' });
  const draw = () => {
    const run = ctx.state().run!;
    const cost = run.shop.xpCost * times;
    let lv = run.level;
    // 구매 후 레벨 미리보기: 카탈로그 규칙값(xpToNext)만 읽는다. 코어가 미리보기 값을 주면 그것으로 바꾼다(계약 요청 목록).
    const xpRules = ctx.driver.catalog.rules.xp;
    let xp = run.xp + xpRules.buyAmount * times;
    let need = run.xpToNext;
    while (need !== null && xp >= need) { xp -= need; lv++; need = xpRules.xpToNext[String(lv)] ?? null; }
    const max = run.xpToNext === null;
    body.replaceChildren(
      h('div', { class: 'k-lv-badges' },
        h('div', { class: 'k-lv-badge' }, h('small', null, '현재'), h('b', null, `Lv.${run.level}`)),
        icon('back', 26, 'k-flip'),
        h('div', { class: cls('k-lv-badge is-next', lv > run.level && 'is-up') }, h('small', null, '구매 후'), h('b', null, `Lv.${lv}`))),
      h('div', { class: 'k-lv-meter' },
        h('div', { class: 'k-lv-meter-head' }, h('span', null, `Lv.${lv}`), h('span', null, need ? `${xp}/${need}` : 'MAX')),
        h('div', { class: 'k-bar' }, h('i', { style: `--p:${need ? (xp / need) * 100 : 100}%` }))),
      h('div', { class: 'k-stepper' },
        h('span', null, '구매 횟수'),
        h('button', { class: 'k-round', 'aria-label': '줄이기', disabled: times <= 1, onclick: () => { times = Math.max(1, times - 1); draw(); } }, icon('minus', 22)),
        h('b', { 'aria-live': 'polite' }, String(times)),
        h('button', { class: 'k-round', 'aria-label': '늘리기', disabled: times >= 10, onclick: () => { times = Math.min(10, times + 1); draw(); } }, icon('plus', 22))),
      h('p', { class: cls('k-lv-cost', cost > run.gold && 'is-short') }, icon('gold', 22), `${cost}G`, h('small', null, ` / 보유 ${run.gold}G · 1회 ${run.shop.xpCost}G = XP ${xpRules.buyAmount}`)),
      h('p', { class: 'k-muted' }, `레벨 = 편성 가능 인원. Lv.${lv}이면 ${lv}명까지 배치할 수 있어요.`),
    );
    confirmBtn.disabled = max || cost > run.gold;
  };
  const confirmBtn = h('button', { class: 'k-btn is-primary', onclick: async () => { if (await ctx.send('BUY_XP', { times })) close(); } }, icon('check', 22), '확인');
  const panel = h('div', { class: 'k-dialog k-levelup' },
    h('header', { class: 'k-dialog-head' }, h('h2', null, '레벨업'), h('button', { class: 'k-x', 'aria-label': '닫기', onclick: () => close() }, icon('close', 26))),
    body,
    h('footer', { class: 'k-dialog-foot' }, h('button', { class: 'k-btn is-ghost', onclick: () => close() }, icon('close', 22), '취소'), confirmBtn));
  draw();
  close = ctx.modal(panel, { label: '레벨업' });
}

/** 전략이 가진 효과만 보여 준다(이득·대가 문장 대신 효과 본문 요약) */
export function strategyEffects(ctx: Ctx, effectIds: string[]): HTMLElement {
  return h('div', { class: 'k-strat-effects' }, ...effectIds.map((id) => {
    const e = ctx.lookup.effectSpec(id);
    return e ? fxList(ctx, e.spec) : null;
  }));
}
