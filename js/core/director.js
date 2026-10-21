// 사건 디렉터: 후보 자격 검사 → 가중치 → 선택. 도시 상태를 몰래 덮어쓰지 않고 결과를 서사로 보여준다.
import { EVENTS, DAILY } from '../data/events/index.js';
import { withRng } from './rng.js';
import { meets, fmt, computeChance, costProblem, describeCost, payCost, applyEffects, rollCheck, npcFor } from './rules.js';
import { resolveNpc } from './state.js';
import { JOBS } from '../data/world.js';

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

function eligible(state, def, opts = {}) {
  if (!def || def.chainOnly && !opts.pending) return false;
  if (!opts.pending) {
    const cd = def.cooldown ?? 5;
    const last = state.cooldowns[def.id];
    if (last != null && state.year - last < cd) return false;
    if (def.once && last != null) return false;
    if (state.typeUsed[def.category] === state.year) return false;
  }
  return meets(state, def.cond, {});
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
  return Math.min(2, Math.max(0.5, rel));
}

function cityFactor(state, def) {
  const tags = def.tags || [];
  let f = 1;
  if (tags.includes('shortage')) f *= 1 + state.city.shortage * 10 + state.city.clocks.supplyChain * 0.15;
  if (tags.includes('strike') && state.city.factions.union.strikePrep > 0) f *= 1.6;
  if (tags.includes('price') && state.city.global.price > 108) f *= 1.5;
  return Math.min(2, Math.max(0.5, f));
}

function novelty(state, def) {
  const recent = Object.entries(state.cooldowns).some(([id, y]) => state.year - y <= 2 && EVENTS[id]?.category === def.category);
  return recent ? 0.25 : 1;
}

export function eventWeight(state, def) {
  return (def.base ?? 10) * relevance(state, def) * cityFactor(state, def) * novelty(state, def);
}

export function pickMajor(state) {
  const cands = Object.values(EVENTS).filter(d => eligible(state, d));
  if (!cands.length) return null;
  const pairs = cands.map(d => [d, Math.max(1, Math.round(eventWeight(state, d) * 100))]);
  return withRng(state, 'event', r => r.weighted(pairs));
}

export function pickDaily(state) {
  const cands = DAILY.filter(d => {
    const last = state.dailyUsed[d.id];
    if (last != null && state.year - last < 3) return false;
    return meets(state, d.cond, {});
  });
  if (!cands.length) return null;
  const d = withRng(state, 'event', r => r.pick(cands));
  state.dailyUsed[d.id] = state.year;
  const roles = resolveRoles(state, d);
  if (d.effects) applyEffects(state, d.effects, { roles, eventId: d.id, cause: '일상' });
  return fmt(state, d.text, roles);
}

// 계절 큐에서 다음 항목을 처리한다. 사건이 시작되면 true를 반환해 진행을 멈춘다.
export function processQueueItem(state, item, entries) {
  if (item.kind === 'daily') {
    const t = pickDaily(state);
    if (t) entries.push({ kind: 'daily', text: t });
    return false;
  }
  if (item.kind === 'pending') {
    const p = state.pending.find(x => x.id === item.pid);
    if (!p) return false;
    const def = EVENTS[p.ev];
    const roles = def ? resolveRoles(state, def, p.roles) : {};
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
      const t = pickDaily(state);
      if (t) entries.push({ kind: 'daily', text: t });
      return false;
    }
    startEvent(state, def, resolveRoles(state, def), entries);
    return true;
  }
  return false;
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

export function getChoices(state) {
  const cn = currentNode(state);
  if (!cn) return [];
  const { def, node } = cn;
  const roles = state.current.roles;
  return (node.choices || []).filter(c => !c.cond || meets(state, c.cond, roles)).filter(c => !(c.once && state.current.used.includes(c.id))).map(c => {
    const problem = costProblem(state, c.cost) || (c.req && !meets(state, c.req, roles) ? fmt(state, c.reqText || '조건이 부족하다', roles) : null);
    let chance = null, parts = null;
    if (c.check) ({ chance, parts } = computeChance(state, c.check, roles));
    return {
      id: c.id, label: fmt(state, c.label, roles), hint: fmt(state, c.hint || '', roles), cost: describeCost(state, c.cost),
      chance, parts, check: c.check || null, failHint: fmt(state, c.failHint || '', roles), irreversible: !!c.irreversible,
      disabled: problem, risk: c.risk || null, tag: c.tag || null,
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
  const problem = costProblem(state, c.cost) || (c.req && !meets(state, c.req, cur.roles) ? 'req' : null);
  if (problem) return { ok: false, reason: problem };

  state.nonce += 1;
  cur.token = state.nonce;
  const log = [];
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
  const result = { kind: 'result', text, choice: fmt(state, c.label, cur.roles), success: c.check ? success : null, chance, deltas: [...log, ...effLog] };
  state.journal.push({ year: state.year, age: state.age, season: state.season, ...result, eventId: def.id });
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
      return { ok: true, result, followup: endEntry, done: true };
    }
    const same = next === cur.node;
    cur.node = next;
    const nodeText = !same && nn.text ? fmt(state, nn.text, cur.roles) : '';
    const sceneText = scene ? sceneStatus(cur, scene) : '';
    return { ok: true, result, nextText: nodeText, sceneText, done: false };
  }
  finish(state);
  return { ok: true, result, done: true };
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
