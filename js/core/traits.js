// 특성과 인연. 긍정·부정 특성의 수치 효과, 열쇠 특성의 보유 판정, 인연 단계와 단계별 혜택을 한곳에서 계산한다.
// 규칙 코드(rules·economy·game)는 이 모듈의 함수만 부르고, 특성 표를 직접 읽지 않는다.
import { TRAITS, APTITUDE_TRAIT, BIRTH_POSITIVE_EXTRA, BIRTH_NEGATIVE, BACKGROUND_KEYWORD } from '../data/traits.js';
import { BOND_TIERS, BOND_PERKS } from '../data/bonds.js';
import { SKILLS } from '../data/world.js';
import { shortName, signed, josa } from './util.js';

// 낫표로 감싼 이름 뒤에 붙는 조사만 고른다: 「믿는 사이」가 / 「친분」이
export const quoted = (name, p) => `「${name}」${josa(name, p).slice(name.length)}`;

export { TRAITS, BOND_TIERS, BOND_PERKS };

// ───────── 보유 ─────────
// 보유 특성 색인: 특성 목록이 바뀔 때만 다시 만든다. 이 파일의 gainTrait·loseTrait는 목록을 제자리에서 바꾸며 색인을 비우고,
// 밖에서 목록을 통째로 갈아 끼우면 배열이 달라져 다시 만든다
let cache = { list: null, len: -1, ids: null, mods: null };
const invalidate = () => { cache = { list: null, len: -1, ids: null, mods: null }; };
function index(list) {
  if (cache.list === list && cache.len === list.length) return cache;
  const ids = new Set();
  const mods = new Map();
  for (const t of list) {
    ids.add(t.id);
    const m = TRAITS[t.id]?.mods;
    if (m) for (const k in m) { if (m[k] == null) continue; if (!mods.has(k)) mods.set(k, []); mods.get(k).push([m[k], t.id]); }
  }
  cache = { list, len: list.length, ids, mods };
  return cache;
}

export function hasTrait(state, id) {
  const list = state.ch?.traits;
  if (!list || !list.length) return false;
  return index(list).ids.has(id);
}
export const hasAnyTrait = (state, ids) => ids.some(id => hasTrait(state, id));
export const traitName = (id) => TRAITS[id]?.name || id;

// 보유 특성을 분류별로 (UI용)
export function traitGroups(state) {
  const g = { positive: [], negative: [], keyword: [] };
  for (const t of state.ch.traits || []) {
    const d = TRAITS[t.id];
    if (d) g[d.kind].push({ ...t, ...d });
  }
  return g;
}

// 특성을 얻는다. 같은 특성은 한 번만. 기록(연대기·결산)과 변화 문장을 함께 남긴다.
export function gainTrait(state, id, log, cause = '') {
  const d = TRAITS[id];
  if (!d || hasTrait(state, id)) return false;
  const ch = state.ch;
  ch.traits.push({ id, since: state.year, age: state.age, source: cause || '' });
  invalidate();
  ch.lostTraits = (ch.lostTraits || []).filter(x => x.id !== id);
  log?.push(`${d.kind === 'negative' ? '특성 생김' : d.kind === 'keyword' ? '열쇠 획득' : '특성 획득'}: 「${d.name}」`);
  state.yearLog?.traitChanges?.push({ id, gained: true, cause });
  if (state.phase !== 'childhood' && state.phase !== 'birth') {
    state.journal.push({ year: state.year, age: state.age, season: state.season, kind: 'trait', id, gained: true, cause });
  }
  return true;
}

export function loseTrait(state, id, log, cause = '') {
  const ch = state.ch;
  const i = (ch.traits || []).findIndex(t => t.id === id);
  if (i < 0) return false;
  const [t] = ch.traits.splice(i, 1);
  invalidate();
  ch.lostTraits = ch.lostTraits || [];
  ch.lostTraits.push({ id, since: t.since, lost: state.year, age: state.age, cause });
  const d = TRAITS[id];
  log?.push(`${d.kind === 'negative' ? '극복' : '잃음'}: 「${d.name}」`);
  state.yearLog?.traitChanges?.push({ id, gained: false, cause });
  state.journal.push({ year: state.year, age: state.age, season: state.season, kind: 'trait', id, gained: false, cause });
  return true;
}

// 출생 때 성향: 긍정 하나(70%는 주 자질과 이어짐), 부정 하나(55%), 배경의 열쇠 하나
export function rollBirthTraits(r, state) {
  const ch = state.ch;
  ch.traits = [];
  ch.lostTraits = [];
  const push = (id) => { if (id && !ch.traits.some(t => t.id === id)) ch.traits.push({ id, since: state.year, age: 0, source: '타고남' }); };
  const aptTrait = APTITUDE_TRAIT[ch.aptitude];
  if (r.pct(70)) push(aptTrait);
  else push(r.pick([...BIRTH_POSITIVE_EXTRA, ...Object.values(APTITUDE_TRAIT).filter(x => x !== aptTrait)]));
  if (r.pct(55)) push(r.weighted(BIRTH_NEGATIVE[ch.background]));
  push(BACKGROUND_KEYWORD[ch.background]);
}

// ───────── 수치 효과 ─────────
const NONE = Object.freeze([]);
function modsOf(state, key) {
  const list = state.ch.traits;
  if (!list || !list.length) return NONE;
  return index(list).mods.get(key) || NONE;
}
// 이 효과 열쇠를 가진 특성들 ([값, id] 목록, 읽기 전용)
export function traitMods(state, key) { return modsOf(state, key); }
export function traitIdsWith(state, key) { return modsOf(state, key).map(([, id]) => id); }

export function traitMul(state, key) {
  let v = 1;
  for (const [x] of modsOf(state, key)) v *= x;
  return v;
}

// 배율과 그 배율을 만든 특성들
const ONE = Object.freeze([1, NONE]);
function mulIds(state, key) {
  const ms = modsOf(state, key);
  if (!ms.length) return ONE;
  let v = 1; const ids = [];
  for (const [x, id] of ms) { v *= x; ids.push(id); }
  return [v, ids];
}

export function traitSum(state, key) {
  let v = 0;
  for (const [x] of modsOf(state, key)) v += x;
  return v;
}

export function traitFlag(state, key) {
  for (const [x, id] of modsOf(state, key)) if (x) return id;
  return null;
}

// 특성이 바꾼 숫자를 그해 장부에 모은다 (결산의 「특성과 인연」 칸)
export function traitFx(state, ids, what, v) {
  const yl = state.yearLog;
  if (!v || !yl || !ids.length) return;
  yl.traitFx = yl.traitFx || {};
  const key = ids.join('+') + '|' + what;
  const e = yl.traitFx[key] || (yl.traitFx[key] = { ids: [...ids], what, v: 0 });
  e.v += v;
}

const STAT_LABEL = { health: '건강', stress: '스트레스', load: '공명부하' };

// 스트레스·건강·공명부하 변화에 특성 배율을 건다
export function adjustStat(state, k, v) {
  if (!v || !state.ch.traits?.length) return v;
  let key = null;
  if (k === 'stress') key = v > 0 ? 'stressGain' : 'stressRelief';
  else if (k === 'health' && v < 0) key = 'healthLoss';
  else if (k === 'load' && v > 0) key = 'loadGain';
  if (!key) return v;
  let [m, ids] = mulIds(state, key);
  if (k === 'health' && v <= -8) {
    const [mi, idi] = mulIds(state, 'injury');
    m *= mi; ids = ids.concat(idi);
    if (bondPerk(state, 'sabine_injury')) { m *= 0.8; ids = ids.concat('bond:sabine'); }
  }
  if (m === 1) return v;
  const nv = Math.round(v * m) || Math.sign(v);
  if (nv !== v) traitFx(state, ids, STAT_LABEL[k], nv - v);
  return nv;
}

export function xpBonus(state, k) {
  let b = 0; const ids = [];
  for (const t of state.ch.traits || []) {
    const x = TRAITS[t.id]?.mods?.xp?.[k];
    if (x) { b += x; ids.push(t.id); }
  }
  if (b) traitFx(state, ids, `${SKILLS[k]} 경험`, b);
  return b;
}

// 관계 변화 배율 (신뢰·호감)
export function adjustRel(state, npc, trust, aff) {
  if (!state.ch.traits?.length) return [trust, aff];
  if (trust > 0) { const [m, ids] = mulIds(state, 'trustGain'); if (m !== 1) { const n = Math.round(trust * m) || 1; traitFx(state, ids, '신뢰', n - trust); trust = n; } }
  else if (trust < 0) { const [m, ids] = mulIds(state, 'trustLoss'); if (m !== 1) { const n = Math.round(trust * m); traitFx(state, ids, '신뢰', n - trust); trust = n; } }
  if (aff > 0) {
    let [m, ids] = mulIds(state, 'affGain');
    if ((npc.faction === 'union' || npc.faction === 'mutual') && hasTrait(state, 'neg_informer')) { m *= 0.5; ids = ids.concat('neg_informer'); }
    if (m !== 1) { const n = Math.max(0, Math.round(aff * m)); traitFx(state, ids, '호감', n - aff); aff = n; }
  }
  return [trust, aff];
}

export function adjustRep(state, f, v) {
  if (v <= 0 || !state.ch.traits?.length) return v;
  let m = 1; const ids = [];
  for (const [r, id] of modsOf(state, 'rep')) { const x = r[f]; if (x != null) { m *= x; ids.push(id); } }
  if (m === 1) return v;
  const n = Math.round(v * m);
  traitFx(state, ids, '평판', n - v);
  return n;
}

// 판정 보정: 특성의 능력치·숙련·공명 보정, 사건이 지정한 열쇠 보정, 인연 혜택. 합계 ±15 상한.
const NO_BONUS = Object.freeze({ v: 0, notes: NONE });
export function checkTraitBonus(state, check) {
  let v = 0;
  let notes = null;
  const add = (b, label) => { v += b; (notes ||= []).push(`${label} ${signed(b)}`); };
  for (const [m, id] of modsOf(state, 'check')) { const b = m[check.attr]; if (b) add(b, TRAITS[id].name); }
  if (check.skill) for (const [m, id] of modsOf(state, 'skillCheck')) { const b = m[check.skill]; if (b) add(b, TRAITS[id].name); }
  if (check.resonance || check.skill === 'resonance') for (const [b, id] of modsOf(state, 'resonanceCheck')) if (b) add(b, TRAITS[id].name);
  if (check.traits) {
    for (const id in check.traits) if (check.traits[id] && hasTrait(state, id)) add(check.traits[id], `「${traitName(id)}」`);
  }
  if (check.skill === 'repair' && bondPerk(state, 'toma_repair')) add(5, '토마의 요령');
  if (check.skill === 'record' && bondPerk(state, 'elian_record')) add(5, '엘리안의 조언');
  if (!notes) return NO_BONUS;
  return { v: Math.max(-15, Math.min(15, v)), notes };
}

// ───────── 인연 ─────────
export function tierOf(n) {
  if (!n) return 2;
  if (n.affinity <= -40) return 0;
  if (n.affinity <= -15) return 1;
  if (n.trust >= 75 && n.affinity >= 50) return 5;
  if (n.trust >= 50 && n.affinity >= 20) return 4;
  if (n.trust >= 20 || n.affinity >= 20) return 3;
  return 2;
}
export const tierName = (i) => BOND_TIERS[i]?.name || '';

const PERK_INDEX = {};
for (const [npc, list] of Object.entries(BOND_PERKS)) for (const p of list) if (p.key) PERK_INDEX[p.key] = { npc, ...p };

export function bondPerk(state, key) {
  const p = PERK_INDEX[key];
  if (!p) return false;
  const n = state.npcs[p.npc];
  if (!n || !n.alive || !n.met) return false;
  const t = tierOf(n);
  return p.neg ? t <= p.tier : t >= p.tier;
}

// 다음 단계까지 남은 조건 (인물 패널)
export function nextTierNeed(n) {
  const t = tierOf(n);
  if (t >= 5) return null;
  if (t <= 1) return { tier: t + 1, text: `호감 ${t === 0 ? -39 : -14} 이상` };
  if (t === 2) return { tier: 3, text: '신뢰 20 또는 호감 20' };
  if (t === 3) return { tier: 4, text: `신뢰 ${Math.max(0, 50 - n.trust)} · 호감 ${Math.max(0, 20 - n.affinity)} 더` };
  return { tier: 5, text: `신뢰 ${Math.max(0, 75 - n.trust)} · 호감 ${Math.max(0, 50 - n.affinity)} 더` };
}

export function bondView(state, n) {
  const t = tierOf(n);
  const perks = (BOND_PERKS[n.id] || []).map(p => ({ ...p, on: n.alive && (p.neg ? t <= p.tier : t >= p.tier), giftOwned: p.gift ? hasTrait(state, p.gift) : false }));
  return { tier: t, name: tierName(t), next: nextTierNeed(n), perks };
}

// 관계 변화 뒤 단계가 바뀌었는지 본다: 바뀌면 기록하고, 처음 닿은 단계의 열쇠를 건넨다
export function afterRelChange(state, npc, before, log, cause) {
  const after = tierOf(npc);
  if (after === before || !npc.met) return;
  const up = after > before;
  const text = `${josa(shortName(npc.name), '와')} ${quoted(tierName(after), up ? '이' : '으로')} ${up ? '되었다' : '멀어졌다'}`;
  log?.push(text);
  state.yearLog?.bondChanges?.push({ npc: npc.id, from: before, to: after, cause: cause || '' });
  if (state.phase !== 'childhood' && state.phase !== 'birth' && (after >= 3 || before >= 3 || after <= 1)) {
    state.journal.push({ year: state.year, age: state.age, season: state.season, kind: 'bond', npc: npc.id, from: before, to: after, cause: cause || '' });
  }
  if (up) {
    for (const p of BOND_PERKS[npc.id] || []) if (p.gift && after >= p.tier && before < p.tier) gainTrait(state, p.gift, log, `${josa(shortName(npc.name), '와')} 「${tierName(p.tier)}」`);
    if (after === 5) loseTrait(state, 'neg_distrust', log, `${josa(shortName(npc.name), '와')} 평생의 인연이 되었다`);
  }
}

// ───────── 한 해의 변화: 습관이 특성이 되고, 극복한 특성은 사라진다 ─────────
export function traitYearTick(state) {
  const ch = state.ch;
  const h = state.history;
  const p = state.plan || {};
  const tp = h.traitProg = h.traitProg || {};
  const log = [];
  const restful = p.main === 'recover' || (['rest', 'care'].includes(p.sub) && !p.subUsed);

  // 잦은 불안: 쉬는 해를 보내며 3년 연속 스트레스 40 아래
  if (hasTrait(state, 'neg_anxious')) {
    tp.calm = restful && ch.stress < 40 ? (tp.calm || 0) + 1 : 0;
    if (tp.calm >= 3) loseTrait(state, 'neg_anxious', log, '쉬는 법을 몸에 익혔다');
  }
  // 약한 폐: 요양 2년
  if (hasTrait(state, 'neg_frail') && p.main === 'recover') {
    tp.frail = (tp.frail || 0) + 1;
    if (tp.frail >= 2) loseTrait(state, 'neg_frail', log, '요양으로 숨이 트였다');
  }
  // 헤픈 지갑 → 검소한 살림: 5년 연속 연체 없음
  if (hasTrait(state, 'neg_spendthrift') && ch.independent && (h.noArrearsStreak || 0) >= 5) {
    loseTrait(state, 'neg_spendthrift', log, '다섯 해 동안 장부를 지켰다');
    gainTrait(state, 'pos_thrifty', log, '헤픈 지갑을 고쳐 잡았다');
  }
  // 빚의 그림자: 독립 후 빚 없이 2년
  if (hasTrait(state, 'neg_debt_shadow') && ch.independent) {
    tp.debtFree = ch.debts.length === 0 ? (tp.debtFree || 0) + 1 : 0;
    if (tp.debtFree >= 2) loseTrait(state, 'neg_debt_shadow', log, '빚 없이 두 해를 보냈다');
  }
  // 일 중독: 일하는 해에 스트레스 70 이상이 2년 → 생김, 요양 한 해 → 풀림
  const working = ['work', 'work_res', 'workshop'].includes(p.main);
  if (!hasTrait(state, 'neg_overwork')) {
    tp.overwork = working && ch.stress >= 70 ? (tp.overwork || 0) + 1 : 0;
    if (tp.overwork >= 2) gainTrait(state, 'neg_overwork', log, '쉬지 않고 두 해를 일했다');
  } else if (p.main === 'recover') loseTrait(state, 'neg_overwork', log, '한 해를 통째로 쉬었다');
  // 공명 잔흔: 정립 단계 또는 3년 연속 연말 공명부하 10 이하
  if (hasTrait(state, 'neg_resonance_scar')) {
    tp.lowLoad = ch.load <= 10 ? (tp.lowLoad || 0) + 1 : 0;
    if ((ch.ability && ch.ability.stage >= 3) || tp.lowLoad >= 3) loseTrait(state, 'neg_resonance_scar', log, '떨림이 가라앉았다');
  }
  // 밀고자의 낙인: 노동연맹·상호회 평판 30
  if (hasTrait(state, 'neg_informer') && (state.rep.union >= 30 || state.rep.mutual >= 30)) loseTrait(state, 'neg_informer', log, '골목이 다시 이름을 불러 주었다');

  // 긍정 특성은 쌓인 삶에서 생긴다
  // 부지런한 손: 일하는 해를 스트레스 50 아래로 8년 연속 (무리하지 않고 꾸준히)
  tp.steady = working && ch.stress < 50 ? (tp.steady || 0) + 1 : 0;
  if (tp.steady >= 8) gainTrait(state, 'pos_diligent', log, '여덟 해를 무리 없이 꾸준히 일했다');
  if ((ch.skills.resonance || 0) >= 3 && !hasTrait(state, 'neg_resonance_scar')) gainTrait(state, 'pos_steady_hand', log, '공명기술 숙련 3');
  if (h.recoveredL0 && (h.l1Streak || 0) >= 2) gainTrait(state, 'pos_survivor', log, '바닥에서 다시 일어섰다');
  return log;
}
