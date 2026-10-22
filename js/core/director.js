// 사건 디렉터: 후보 자격 검사 → 가중치 → 선택. 도시 상태를 몰래 덮어쓰지 않고 결과를 서사로 보여준다.
import { EVENTS, EVENT_LIST, DAILY } from '../data/events/index.js';
import { withRng } from './rng.js';
import { meets, meetsCompiled, compileCond, fmt, computeChance, costProblem, describeCost, payCost, applyEffects, rollCheck, npcFor } from './rules.js';
import { resolveNpc } from './state.js';
import { JOBS } from '../data/world.js';
import { hasTrait, traitName, tierOf, tierName, TRAITS, quoted } from './traits.js';
import { shortName, josa } from './util.js';

const MAJOR_COUNT = [[0, 15], [1, 55], [2, 30]];

export function buildSchedule(state) {
  const sched = [];
  const n = withRng(state, 'event', r => r.weighted(MAJOR_COUNT));
  // 만기가 된 예약 사건이 먼저 자리를 차지한다
  const due = state.pending.filter(p => p.due <= state.year);
  for (const p of due) {
    const def = EVENTS[p.ev];
    const seasons = p.season != null ? [p.season] : def?.cond?.seasons || [0, 1, 2, 3];
    const season = withRng(state, 'event', r => r.pick(seasons));
    sched.push({ season, kind: 'pending', pid: p.id });
  }
  const used = new Set(sched.map(s => s.season));
  const free = [0, 1, 2, 3].filter(s => !used.has(s));
  const majors = Math.max(0, Math.min(n, 3 - due.length));
  const seasons = withRng(state, 'event', r => r.shuffle(free.length ? free : [0, 1, 2, 3])).slice(0, majors);
  for (const s of seasons) sched.push({ season: s, kind: 'major' });
  const dailies = withRng(state, 'event', r => r.range(2, 4));
  for (let i = 0; i < dailies; i++) sched.push({ season: withRng(state, 'event', r => r.int(4)), kind: 'daily' });
  const order = { pending: 0, major: 1, daily: 2 };
  sched.sort((a, b) => a.season - b.season || order[a.kind] - order[b.kind]);
  state.schedule = sched;
}

export function queueForSeason(state) {
  state.queue = state.schedule.filter(s => s.season === state.season);
}

function resolveRoles(state, def, given = {}) {
  const roles = { ...given };
  for (const [k, spec] of Object.entries(def.roles || {})) {
    if (roles[k]) continue;
    if (typeof spec === 'string') roles[k] = spec;
    else if (spec.pick) {
      const alive = spec.pick.filter(id => state.npcs[id]?.alive);
      roles[k] = alive.length ? withRng(state, 'event', r => r.pick(alive)) : spec.pick[0];
    } else if (spec.best) {
      const list = spec.best.map(id => state.npcs[id]).filter(n => n && n.alive && n.met).sort((a, b) => b.trust + b.affinity - a.trust - a.affinity);
      roles[k] = list[0]?.id || spec.best[0];
    }
  }
  // 은퇴·사망한 핵심 인물은 후임으로 바꾼다
  for (const k of Object.keys(roles)) {
    const n = resolveNpc(state, roles[k]);
    if (n) roles[k] = n.id;
  }
  return roles;
}

function eligible(state, def, opts = {}, conds = null) {
  if (!def || def.chainOnly && !opts.pending) return false;
  if (!opts.pending) {
    const cd = Math.max(5, def.cooldown ?? 5); // 같은 사건은 최소 5년 뒤에 다시 나온다
    const last = state.cooldowns[def.id];
    if (last != null && state.year - last < cd) return false;
    if (def.once && last != null) return false;
    if (state.typeUsed[def.category] === state.year) return false;
  }
  return conds ? meetsCompiled(state, conds, {}) : meets(state, def.cond, {});
}

function relevance(state, def) {
  let rel = 1;
  const ch = state.ch;
  const tags = def.tags || [];
  if (ch.job && tags.includes(ch.job.id)) rel *= 1.6;
  if (ch.apprentice && tags.includes(ch.apprentice)) rel *= 1.4;
  if (tags.includes(ch.home)) rel *= 1.3;
  if (state.goal && tags.includes(state.goal.id)) rel *= 1.5;
  if (ch.ability && tags.includes('resonance')) rel *= 1.4;
  if (tags.includes('recovery') && state.history.lossStreak >= 2) rel *= 4;
  // 가진 열쇠·특성과 이어진 사건은 더 자주 찾아온다
  if (def.keys && def.keys.some(id => hasTrait(state, id))) rel *= 1.7;
  return Math.min(2.5, Math.max(0.5, rel));
}

function cityFactor(state, def) {
  const tags = def.tags || [];
  let f = 1;
  if (tags.includes('shortage')) f *= 1 + state.city.shortage * 10 + state.city.clocks.supplyChain * 0.15;
  if (tags.includes('strike') && state.city.factions.union.strikePrep > 0) f *= 1.6;
  if (tags.includes('price') && state.city.global.price > 108) f *= 1.5;
  return Math.min(2, Math.max(0.5, f));
}

function recentCategories(state) {
  const set = new Set();
  for (const id in state.cooldowns) if (state.year - state.cooldowns[id] <= 2 && EVENTS[id]) set.add(EVENTS[id].category);
  return set;
}

function novelty(state, def, recent = recentCategories(state)) {
  return recent.has(def.category) ? 0.25 : 1;
}

export function eventWeight(state, def, recent) {
  return (def.base ?? 10) * relevance(state, def) * cityFactor(state, def) * novelty(state, def, recent);
}

const EVENT_CONDS = EVENT_LIST.map(d => compileCond(d.cond));

export function pickMajor(state) {
  const cands = EVENT_LIST.filter((d, i) => eligible(state, d, {}, EVENT_CONDS[i]));
  if (!cands.length) return null;
  const recent = recentCategories(state);
  const pairs = cands.map(d => [d, Math.max(1, Math.round(eventWeight(state, d, recent) * 100))]);
  return withRng(state, 'event', r => r.weighted(pairs));
}

// 일상 기록 후보: 특성이 비치는 줄은 그 특성을 가졌을 때만 살핀다
const DAILY_INDEX = new Map(DAILY.map((d, i) => [d.id, i]));
const DAILY_PLAIN = DAILY.map((d, i) => [d, i, compileCond(d.cond)]).filter(([d]) => !d.cond.trait);
const DAILY_TRAIT = DAILY.map((d, i) => [d, i, compileCond(d.cond), [].concat(d.cond.trait || [])]).filter(([d]) => d.cond.trait);

// 마지막으로 쓴 해를 줄 번호로 찾는 사본. 저장되는 원본은 state.dailyUsed이고, 원본이 바뀌면 다시 만든다.
const DAILY_LAST = new WeakMap();
function dailyLast(state) {
  let c = DAILY_LAST.get(state);
  if (!c || c.src !== state.dailyUsed) {
    const last = new Array(DAILY.length).fill(-Infinity);
    for (const id in state.dailyUsed) { const i = DAILY_INDEX.get(id); if (i != null) last[i] = state.dailyUsed[id]; }
    c = { src: state.dailyUsed, last };
    DAILY_LAST.set(state, c);
  }
  return c.last;
}

export function pickDaily(state) {
  const last = dailyLast(state);
  const cutoff = state.year - 3;
  const cands = [];
  for (const [d, i, conds] of DAILY_PLAIN) if (last[i] <= cutoff && meetsCompiled(state, conds)) cands.push(d);
  for (const [d, i, conds, ids] of DAILY_TRAIT) if (last[i] <= cutoff && ids.some(id => hasTrait(state, id)) && meetsCompiled(state, conds)) cands.push(d);
  if (!cands.length) return null;
  // 특성이 비치는 일상은 더 자주 떠오른다: 가진 특성이 하루하루에서 보이게
  const d = withRng(state, 'event', r => r.weighted(cands.map(c => [c, c.cond.trait ? 4 : 1])));
  state.dailyUsed[d.id] = state.year;
  last[DAILY_INDEX.get(d.id)] = state.year;
  const roles = resolveRoles(state, d);
  if (d.effects) applyEffects(state, d.effects, { roles, eventId: d.id, cause: '일상' });
  return fmt(state, d.text, roles);
}

// 계절 큐에서 다음 항목을 처리한다. 사건이 시작되면 true를 반환해 진행을 멈춘다.
export function processQueueItem(state, item, entries) {
  if (item.kind === 'daily') {
    pushDaily(state, entries);
    return false;
  }
  if (item.kind === 'pending') {
    const p = state.pending.find(x => x.id === item.pid);
    if (!p) return false;
    const def = EVENTS[p.ev];
    const roles = def ? resolveRoles(state, def, p.roles) : {};
    // 담당 인물이 세상을 떠났고 이어받을 후임도 없으면, 사건 대신 편지와 유품으로 마무리한다
    const lost = def && Object.keys(def.roles || {}).map(k => state.npcs[roles[k]]).find(n => n && !n.alive);
    if (lost) {
      state.pending = state.pending.filter(x => x !== p);
      const rest = p.invalid ? fmt(state, p.invalid, roles) : '유품 상자에서 당신 앞으로 남긴 쪽지가 나왔다. 하려던 일은 그렇게 끝을 맺었다.';
      const text = `${lost.name}의 부고가 먼저 닿았다. ${rest}`;
      entries.push({ kind: 'letter', text });
      state.journal.push({ year: state.year, age: state.age, season: state.season, kind: 'letter', text, eventId: p.ev, lost: lost.id });
      return false;
    }
    if (def && meets(state, def.cond, roles)) {
      state.pending = state.pending.filter(x => x !== p);
      startEvent(state, def, roles, entries, p);
      return true;
    }
    // 아직 조건이 맞지 않으면 한 해 미루고, 두 번 미뤄도 안 되면 대체 마무리
    p.tries += 1;
    if (p.tries >= 3 || !def) {
      state.pending = state.pending.filter(x => x !== p);
      const text = p.invalid ? fmt(state, p.invalid, roles) : '오래전 예정되었던 일이 흐지부지 끝났다. 소식은 편지 한 장으로 왔다.';
      entries.push({ kind: 'letter', text });
      state.journal.push({ year: state.year, age: state.age, season: state.season, kind: 'letter', text });
    } else {
      p.due = state.year + 1;
    }
    return false;
  }
  if (item.kind === 'major') {
    const def = pickMajor(state);
    if (!def) {
      pushDaily(state, entries);
      return false;
    }
    startEvent(state, def, resolveRoles(state, def), entries);
    return true;
  }
  return false;
}

function pushDaily(state, entries) {
  const t = pickDaily(state);
  if (!t) return;
  entries.push({ kind: 'daily', text: t });
  state.journal.push({ year: state.year, age: state.age, season: state.season, kind: 'daily', text: t });
}

export function startEvent(state, def, roles, entries, pending) {
  state.nonce += 1;
  state.current = { eventId: def.id, node: 'start', roles, vars: { ...(def.vars || {}) }, turns: 0, used: [], token: state.nonce, cause: pending?.cause || null };
  state.cooldowns[def.id] = state.year;
  if (!pending) state.typeUsed[def.category] = state.year;
  state.phase = 'event';
  const text = fmt(state, typeof def.text === 'function' ? def.text(state) : def.text, roles);
  const entry = { kind: 'event', title: def.title, text, eventId: def.id, category: def.category };
  entries.push(entry);
  state.journal.push({ year: state.year, age: state.age, season: state.season, ...entry });
  for (const k of Object.values(roles)) { const n = state.npcs[k]; if (n && n.alive && !n.metYears.includes(state.year)) { n.metYears.push(state.year); n.met = true; } }
}

export function currentNode(state) {
  const cur = state.current;
  if (!cur) return null;
  const def = EVENTS[cur.eventId];
  if (cur.node === 'start') return { def, node: def };
  return { def, node: def.nodes[cur.node] };
}

// 열쇠 특성 조건: trait는 하나라도 있으면, 없으면 무엇이 필요한지 알려 준다
const keyIds = (c) => choiceTraits(c).keys;
function keyMet(state, c) { const ids = keyIds(c); return !ids || ids.some(id => hasTrait(state, id)); }
function bondMet(state, c, roles) {
  if (!c.bond) return true;
  const n = npcFor(state, roles, c.bond.who);
  return !!(n && n.alive && n.met && tierOf(n) >= c.bond.tier);
}
function lockText(state, c, roles) {
  if (!keyMet(state, c)) return `${keyIds(c).map(id => `「${traitName(id)}」`).join(' 또는 ')} 필요`;
  if (!bondMet(state, c, roles)) { const n = npcFor(state, roles, c.bond.who); return `${josa(n ? shortName(n.name) : '그 사람', '와')} ${quoted(tierName(c.bond.tier), '이')} 되어야 한다`; }
  return null;
}

const NONE = Object.freeze([]);
const traitInfo = (ids) => ids.length ? ids.map(id => ({ id, name: traitName(id), kind: TRAITS[id]?.kind, icon: TRAITS[id]?.icon })) : NONE;

// 선택지에 적힌 특성 변화는 데이터에 고정돼 있으니 한 번만 모아 둔다
const CHOICE_TRAITS = new WeakMap();
function choiceTraits(c) {
  let v = CHOICE_TRAITS.get(c);
  if (!v) {
    const ids = (o, t) => [...new Set((o?.effects || []).filter(e => e.t === t).map(e => e.id))];
    v = {
      keys: c.trait ? [].concat(c.trait) : null,
      rewards: ids(c.ok, 'trait'), fails: ids(c.fail, 'trait'), sheds: ids(c.ok, 'loseTrait'), boosts: c.check?.traits ? Object.keys(c.check.traits) : [],
    };
    CHOICE_TRAITS.set(c, v);
  }
  return v;
}

export function getChoices(state) {
  const cn = currentNode(state);
  if (!cn) return [];
  const { def, node } = cn;
  const roles = state.current.roles;
  const base = (node.choices || []).filter(c => !c.cond || meets(state, c.cond, roles)).filter(c => !(c.once && state.current.used.includes(c.id)));
  // 열쇠·인연이 맞지 않는 선택지는 숨기되, 자리가 남으면 잠긴 채로 하나씩 보여 준다 (인연 먼저, 열쇠는 하나까지)
  let list = [];
  const lockedBond = [], lockedKey = [];
  for (const c of base) {
    if (!keyMet(state, c)) lockedKey.push(c);
    else if (!bondMet(state, c, roles)) lockedBond.push(c);
    else list.push(c);
  }
  const teasers = [...lockedBond, ...lockedKey.slice(0, 1)];
  // 한 장면의 선택지는 최대 4개: 넘치면 지금 고를 수 없는 것부터 빼고, 그래도 넘치면 마지막(후퇴) 선택지를 남긴다
  if (list.length > 4) {
    const blocked = list.filter(c => costProblem(state, c.cost) || (c.req && !meets(state, c.req, roles)));
    for (const b of blocked) if (list.length > 4) list = list.filter(c => c !== b);
    if (list.length > 4) {
      // 열쇠·인연으로 열린 선택지는 끝까지 남긴다
      const special = list.filter(c => c.trait || c.bond);
      const plain = list.filter(c => !c.trait && !c.bond);
      list = [...special, ...plain.slice(0, Math.max(0, 3 - special.length)), plain[plain.length - 1]].filter(Boolean).slice(0, 4);
      list = base.filter(c => list.includes(c));
    }
  }
  for (const t of teasers) if (list.length < 4) list = [...list, t];
  list = base.filter(c => list.includes(c));
  return list.map(c => {
    const locked = lockText(state, c, roles);
    const problem = locked || costProblem(state, c.cost) || (c.req && !meets(state, c.req, roles) ? fmt(state, c.reqText || '조건이 부족하다', roles) : null);
    let chance = null, parts = null;
    if (c.check) ({ chance, parts } = computeChance(state, c.check, roles));
    const ids = keyIds(c);
    const owned = ids ? ids.filter(id => hasTrait(state, id)) : NONE;
    const bn = c.bond ? npcFor(state, roles, c.bond.who) : null;
    // 결과에 들어 있는 특성 변화: 성공하면 얻는 것, 실패하면 얻는 것, 이 선택으로 벗는 것
    const st = choiceTraits(c);
    const pick = (list, want) => list.length ? traitInfo(list.filter(id => hasTrait(state, id) === want)) : NONE;
    return {
      id: c.id, label: fmt(state, c.label, roles), hint: fmt(state, c.hint || '', roles), cost: describeCost(state, c.cost),
      chance, parts, check: c.check || null, failHint: fmt(state, c.failHint || '', roles), irreversible: !!c.irreversible,
      disabled: problem, risk: c.risk || null, tag: c.tag || null,
      locked: locked ? (ids && !owned.length ? 'key' : 'bond') : null,
      key: ids ? { ids, owned, names: (owned.length ? owned : ids).map(traitName), kind: TRAITS[(owned[0] || ids[0])]?.kind } : null,
      bond: c.bond && bn ? { npc: bn.id, name: bn.name, tier: c.bond.tier, tierName: tierName(c.bond.tier), now: tierName(tierOf(bn)) } : null,
      rewards: pick(st.rewards, false),
      failTraits: pick(st.fails, false),
      sheds: pick(st.sheds, true),
      boosts: st.boosts.length ? st.boosts.filter(id => hasTrait(state, id)).map(traitName) : NONE,
    };
  });
}

// 선택 처리: 최신 상태로 조건·비용 검증 → 비용 1회 차감 → 판정 → 효과 → 기록. 토큰으로 중복 처리를 막는다.
export function choose(state, choiceId, token) {
  const cur = state.current;
  if (state.phase !== 'event' || !cur) return { ok: false, reason: 'no-event' };
  if (token != null && token !== cur.token) return { ok: false, reason: 'stale' };
  const { def, node } = currentNode(state);
  const c = (node.choices || []).find(x => x.id === choiceId);
  if (!c) return { ok: false, reason: 'no-choice' };
  if (c.cond && !meets(state, c.cond, cur.roles)) return { ok: false, reason: 'cond' };
  if (!keyMet(state, c) || !bondMet(state, c, cur.roles)) return { ok: false, reason: 'locked' };
  const problem = costProblem(state, c.cost) || (c.req && !meets(state, c.req, cur.roles) ? 'req' : null);
  if (problem) return { ok: false, reason: problem };

  state.nonce += 1;
  cur.token = state.nonce;
  const log = [];
  const tc0 = state.yearLog.traitChanges.length, bc0 = state.yearLog.bondChanges.length;
  payCost(state, c.cost, log);
  let success = true, chance = null;
  if (c.check) {
    chance = computeChance(state, c.check, cur.roles).chance;
    success = rollCheck(state, chance);
  }
  const outcome = success ? c.ok : (c.fail || c.ok);
  const ctx = { roles: cur.roles, eventId: def.id, cause: def.title };
  const effLog = applyEffects(state, outcome?.effects || [], ctx);
  if (c.once) cur.used.push(c.id);
  // 장면형 사건 변수
  for (const e of outcome?.effects || []) if (e.t === 'var') cur.vars[e.k] = (cur.vars[e.k] || 0) + e.v;
  const text = fmt(state, outcome?.text || '', cur.roles);
  const result = { kind: 'result', text, choice: fmt(state, c.label, cur.roles), success: c.check ? success : null, chance, deltas: [...log, ...effLog], key: keyIds(c) ? keyIds(c).find(id => hasTrait(state, id)) || null : null, bond: c.bond ? c.bond.who && npcFor(state, cur.roles, c.bond.who)?.id : null };
  state.journal.push({ year: state.year, age: state.age, season: state.season, ...result, eventId: def.id, node: cur.node, choiceId: c.id });
  state.yearLog.events.push({ title: def.title, choice: result.choice, success: result.success, deltas: result.deltas });
  if (outcome?.cause) state.yearLog.causes.push(fmt(state, outcome.cause, cur.roles));

  // 다음 장면 결정
  let next = outcome?.next || null;
  const scene = def.scene && (cur.node === 'start' || node.inScene) ? def.scene : null;
  if (!next && scene && !outcome?.end) {
    cur.turns += 1;
    if ((cur.vars.progress || 0) >= scene.goal) next = scene.win;
    else if ((cur.vars.risk || 0) >= scene.riskMax) next = scene.lose;
    else if (cur.turns >= scene.maxTurns) next = scene.timeout;
    else next = cur.node; // 같은 장면에서 다시 선택
  }
  if (next && def.nodes?.[next]) {
    const nn = def.nodes[next];
    if (nn.end) {
      const endLog = applyEffects(state, nn.effects || [], ctx);
      const endText = fmt(state, nn.text, cur.roles);
      const endEntry = { kind: 'result', text: endText, deltas: endLog, sceneEnd: true };
      state.journal.push({ year: state.year, age: state.age, season: state.season, ...endEntry, eventId: def.id });
      if (nn.cause) state.yearLog.causes.push(fmt(state, nn.cause, cur.roles));
      finish(state);
      return { ok: true, result, followup: endEntry, done: true, ...changesSince(state, tc0, bc0) };
    }
    const same = next === cur.node;
    cur.node = next;
    const nodeText = !same && nn.text ? fmt(state, nn.text, cur.roles) : '';
    const sceneText = scene ? sceneStatus(cur, scene) : '';
    return { ok: true, result, nextText: nodeText, sceneText, done: false, ...changesSince(state, tc0, bc0) };
  }
  finish(state);
  return { ok: true, result, done: true, ...changesSince(state, tc0, bc0) };
}

// 이번 선택으로 생긴 특성·인연 변화 (결과 화면의 도장과 알림)
function changesSince(state, tc0, bc0) {
  return {
    traits: state.yearLog.traitChanges.slice(tc0),
    bonds: state.yearLog.bondChanges.slice(bc0).map(b => ({ ...b, name: state.npcs[b.npc]?.name, fromName: tierName(b.from), toName: tierName(b.to) })),
  };
}

function sceneStatus(cur, scene) {
  return `진행도 ${cur.vars.progress || 0}/${scene.goal} · 위험도 ${cur.vars.risk || 0}/${scene.riskMax}`;
}

export function sceneInfo(state) {
  const cur = state.current;
  if (!cur) return null;
  const def = EVENTS[cur.eventId];
  if (!def.scene) return null;
  const node = cur.node === 'start' ? def : def.nodes[cur.node];
  if (cur.node !== 'start' && !node.inScene) return null;
  return { progress: cur.vars.progress || 0, goal: def.scene.goal, risk: cur.vars.risk || 0, riskMax: def.scene.riskMax, turn: cur.turns, maxTurns: def.scene.maxTurns };
}

export function nodeText(state) {
  const cn = currentNode(state);
  if (!cn) return '';
  const t = cn.node.text;
  return fmt(state, typeof t === 'function' ? t(state) : t, state.current.roles);
}

function finish(state) {
  state.current = null;
  state.phase = 'running';
}

export function eventRoles(state) {
  const cur = state.current;
  if (!cur) return [];
  return Object.values(cur.roles).map(id => state.npcs[id]).filter(Boolean);
}

export { JOBS };
