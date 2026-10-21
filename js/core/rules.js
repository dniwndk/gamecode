// 판정·조건·효과·문장 치환. 사건 데이터는 여기 정의된 효과 목록으로만 상태를 바꾼다.
import { ATTRS, SKILLS, ITEMS, ABILITIES, DISTRICTS, FACTIONS, JOBS } from '../data/world.js';
import { clamp, josa, signed, shortName } from './util.js';
import { resolveNpc } from './state.js';
import { withRng } from './rng.js';
import { adjustStat, xpBonus, adjustRel, adjustRep, checkTraitBonus, tierOf, afterRelChange, gainTrait, loseTrait, hasTrait, bondPerk, traitSum } from './traits.js';

export const SKILL_XP = [0, 3, 8, 15, 24, 36];

// ───────── 문장 치환 ─────────
export function npcFor(state, roles, key) {
  const id = roles?.[key] ?? key;
  return resolveNpc(state, id);
}

export function fmt(state, text, roles = {}) {
  if (!text) return '';
  return String(text).replace(/\{([^}]+)\}/g, (m, body) => {
    const [token, jp] = body.split('|');
    let word;
    if (token === 'me') word = shortName(state.ch.name);
    else if (token === 'fullme') word = state.ch.name;
    else if (token === 'home') word = DISTRICTS[state.ch.home]?.name || '';
    else if (token === 'work') word = DISTRICTS[workDistrict(state)]?.name || '';
    else if (token === 'job') word = state.ch.job ? JOBS[state.ch.job.id].name : '견습생';
    else if (token === 'ability') word = state.ch.ability ? ABILITIES[state.ch.ability.id].name : '공명';
    else if (token === 'year') word = String(state.year);
    else if (token === 'age') word = String(state.age);
    else if (token.startsWith('@@')) { const n = npcFor(state, roles, token.slice(2)); word = n ? n.name : '누군가'; }
    else if (token.startsWith('@')) { const n = npcFor(state, roles, token.slice(1)); word = n ? shortName(n.name) : '누군가'; }
    else return m;
    return jp ? josa(word, jp) : word;
  });
}

export function workDistrict(state) {
  const j = state.ch.job;
  if (j) return j.district || JOBS[j.id].district;
  return state.ch.home;
}

// ───────── 판정 ─────────
// chance = clamp(50 + 5×(attr − diff) + 8×skill + tool + prep + support − penalty, 5, 95)
export function computeChance(state, check, roles = {}, extra = {}) {
  const ch = state.ch;
  const attr = ch.attrs[check.attr] ?? 0;
  const skill = check.skill ? (ch.skills[check.skill] ?? 0) : 0;
  let tool = 0;
  if (check.skill) {
    for (const id of Object.values(ch.equipment)) {
      if (id && ITEMS[id]?.bonus?.[check.skill]) tool += ITEMS[id].bonus[check.skill];
    }
  }
  if (check.device && hasAbilityOrDevice(state, check.device)) tool += 5;
  if (check.tool) tool += check.tool;
  tool = Math.min(10, tool);
  let prep = (check.prep || 0) + (extra.prep || 0);
  if (check.prepFlag && state.flags[check.prepFlag]) prep += check.prepFlagBonus || 5;
  prep = Math.min(10, prep);
  let support = 0;
  if (check.support) {
    const n = npcFor(state, roles, check.support);
    if (n && n.alive) support = n.trust >= 70 ? 10 : n.trust >= 40 ? 5 : 0;
  }
  if (check.support && support < 10 && hasTrait(state, 'pos_solidarity')) support += 5;
  support = Math.min(10, support + (extra.support || 0));
  let penalty = 0;
  const notes = [];
  const tough = hasTrait(state, 'pos_survivor');
  const stressAt = hasTrait(state, 'neg_anxious') ? 60 : 70;
  if (ch.stress >= stressAt && !tough) { penalty += 5; notes.push(stressAt < 70 ? '스트레스(잦은 불안) −5' : '스트레스 −5'); }
  if (ch.health < 40 && !tough) { penalty += 5; notes.push('건강 −5'); }
  if (ch.load >= 50 && (check.attr === 'craft' || check.attr === 'sense' || check.resonance)) { penalty += 10; notes.push('공명부하 −10'); }
  if (check.penalty) penalty += check.penalty;
  const tb = checkTraitBonus(state, check);
  const raw = 50 + 5 * (attr - check.diff) + 8 * skill + tool + prep + support + tb.v - penalty;
  return {
    chance: clamp(raw, 5, 95),
    parts: { attr, diff: check.diff, skill, tool, prep, support, trait: tb.v, traitNotes: tb.notes, penalty, notes },
  };
}

export function hasAbilityOrDevice(state, abilityId) {
  const ch = state.ch;
  if (ch.ability && ch.ability.id === abilityId) return true;
  const dev = ABILITIES[abilityId]?.device;
  return !!dev && ch.items.includes(dev);
}

export function rollCheck(state, chance) {
  return withRng(state, 'check', r => r.int(100) < chance);
}

// ───────── 조건 ─────────
export function meets(state, cond, roles = {}) {
  if (!cond) return true;
  // 조건에 실제로 들어 있는 키만 검사한다 (일상 기록 70줄을 매 계절 거르므로 빨라야 한다)
  for (const key in cond) if (!check1(state, key, cond[key], roles)) return false;
  return true;
}

function check1(state, key, v, roles) {
  const ch = state.ch;
  switch (key) {
    case 'minAge': return v == null || state.age >= v;
    case 'maxAge': return v == null || state.age <= v;
    case 'seasons': return v.includes(state.season);
    case 'home': return v.includes(ch.home);
    case 'area': return v.includes(ch.home) || v.includes(workDistrict(state));
    case 'job': return v === 'any' ? !!ch.job : v === 'none' ? !ch.job : !!(ch.job && v.includes(ch.job.id));
    case 'minRank': return v == null || !!(ch.job && ch.job.rank >= v);
    case 'apprentice': return !v || !!(ch.apprentice && (v === true || v.includes(ch.apprentice)));
    case 'flags': return v.every(f => state.flags[f]);
    case 'anyFlags': return v.some(f => state.flags[f]);
    case 'notFlags': return !v.some(f => state.flags[f]);
    case 'npcAlive': return v.every(id => { const n = state.npcs[id]; return n && n.alive && !n.retired; });
    case 'roleAlive': return v.every(k => { const n = npcFor(state, roles, k); return n && n.alive; });
    case 'ability': return v === true ? !!ch.ability : v === false ? !ch.ability : !!(ch.ability && v.includes(ch.ability.id));
    case 'abilityOrDevice': return v.some(a => hasAbilityOrDevice(state, a));
    case 'minLoad': return v == null || ch.load >= v;
    case 'maxLoad': return v == null || ch.load <= v;
    case 'independent': return v === true ? ch.independent : v === false ? !ch.independent : true;
    case 'minCash': return v == null || ch.cash >= v;
    case 'maxCash': return v == null || ch.cash <= v;
    case 'maxHealth': return v == null || ch.health <= v;
    case 'minStress': return v == null || ch.stress >= v;
    case 'hasDebt': return !v || ch.debts.length > 0;
    case 'noDebt': return !v || ch.debts.length === 0;
    case 'workshop': return v === true ? !!ch.workshop : v === false ? !ch.workshop : true;
    case 'minSkill': for (const k in v) if ((ch.skills[k] || 0) < v[k]) return false; return true;
    case 'minTrust': for (const k in v) { const n = npcFor(state, roles, k); if (!n || n.trust < v[k]) return false; } return true;
    case 'minShortage': return v == null || state.city.shortage >= v;
    case 'clockMin': for (const k in v) if (state.city.clocks[k] < v[k]) return false; return true;
    case 'districtMax': for (const k in v) { const [d, kk] = k.split('.'); const dd = d === 'home' ? ch.home : d; if (!(state.city.districts[dd]?.[kk] <= v[k])) return false; } return true;
    case 'minStat': for (const k in v) if ((state.stats[k] || 0) < v[k]) return false; return true;
    case 'goal': return !!(state.goal && v.includes(state.goal.id));
    case 'strike': return v === true ? state.city.factions.union.striking : true;
    case 'when': return !!v(state, roles);
    case 'trait': return Array.isArray(v) ? v.some(id => hasTrait(state, id)) : hasTrait(state, v);
    case 'allTraits': return v.every(id => hasTrait(state, id));
    case 'noTrait': return Array.isArray(v) ? !v.some(id => hasTrait(state, id)) : !hasTrait(state, v);
    case 'minTier': for (const k in v) { const n = npcFor(state, roles, k); if (!n || !n.alive || !n.met || tierOf(n) < v[k]) return false; } return true;
    case 'minRep': for (const k in v) if ((state.rep[k] || 0) < v[k]) return false; return true;
    default: return true;
  }
}

// ───────── 비용 ─────────
// 연간 생계비를 내고 남는 돈을 쓸 수 있는 돈으로 본다.
export function spendable(state) {
  const ch = state.ch;
  if (!ch.independent || !state.plan) return ch.cash;
  const remainingSeasons = 4 - state.season - (state.seasonStarted ? 1 : 0);
  const quarter = state.yearLog?.quarterExpense || 0;
  return ch.cash - Math.max(0, remainingSeasons) * quarter;
}

export function effectiveCost(state, cost) {
  if (!cost) return {};
  const c = { ...cost };
  if (c.sub && state.plan?.subUsed) { delete c.sub; c.incomeCut = (c.incomeCut || 0) + 4; }
  return c;
}

export function costProblem(state, cost) {
  if (!cost) return null;
  const c = effectiveCost(state, cost);
  const ch = state.ch;
  if (c.cash && spendable(state) < c.cash) return `쓸 수 있는 돈이 부족하다 (필요 ${c.cash}C)`;
  if (c.item && !(ch.consumables[c.item] > 0 || ch.items.includes(c.item))) return `${ITEMS[c.item].name}이 필요하다`;
  if (c.requireItem && !ch.items.includes(c.requireItem)) return `${ITEMS[c.requireItem].name}이 필요하다`;
  if (c.requireAny && !c.requireAny.some(i => ch.items.includes(i))) return `${c.requireAny.map(i => ITEMS[i].name).join(' 또는 ')} 필요`;
  return null;
}

export function describeCost(state, cost) {
  const c = effectiveCost(state, cost);
  const out = [];
  if (c.cash) out.push(`${c.cash}C`);
  if (c.sub) out.push('이번 해 보조 약속 사용');
  if (c.incomeCut) out.push(`수입 −${c.incomeCut}C`);
  if (c.load) out.push(`공명부하 +${c.load}`);
  if (c.stress) out.push(`스트레스 +${c.stress}`);
  if (c.health) out.push(`건강 −${c.health}`);
  if (c.item) out.push(`${ITEMS[c.item].name} 소모`);
  if (c.time) out.push(c.time);
  return out;
}

export function payCost(state, cost, log) {
  const c = effectiveCost(state, cost);
  const ch = state.ch;
  if (c.cash) { ch.cash -= c.cash; log.push(`현금 −${c.cash}C`); state.yearLog.spent += c.cash; }
  if (c.sub) { state.plan.subUsed = true; log.push('보조 약속을 이 일에 썼다'); }
  if (c.incomeCut) { state.yearLog.incomeCut += c.incomeCut; ch.cash -= c.incomeCut; log.push(`수입 −${c.incomeCut}C`); }
  if (c.load) addStat(state, 'load', c.load, log);
  if (c.stress) addStat(state, 'stress', c.stress, log);
  if (c.health) addStat(state, 'health', -c.health, log);
  if (c.item) {
    if (ch.consumables[c.item] > 0) ch.consumables[c.item]--;
    else ch.items = ch.items.filter(i => i !== c.item);
    log.push(`${ITEMS[c.item].name} 사용`);
  }
}

// ───────── 효과 ─────────
const STAT_NAMES = { health: '건강', stress: '스트레스', load: '공명부하' };

export function maxHealth(state) {
  return Math.round(100 - Math.max(0, state.age - 50) * 1.1);
}

// raw = true면 특성 배율을 건너뛴다 (치료처럼 정해진 양)
export function addStat(state, k, v, log, raw = false) {
  const ch = state.ch;
  if (!raw) v = adjustStat(state, k, v);
  const before = ch[k];
  const hi = k === 'health' ? maxHealth(state) : 100;
  let lo = 0;
  if (k === 'health' && state.age < 18) lo = 10; // 유년기에는 무작위 즉사를 넣지 않는다
  ch[k] = clamp(before + v, lo, Math.max(lo, hi));
  const d = ch[k] - before;
  if (d && log) log.push(`${STAT_NAMES[k]} ${signed(d)}`);
  if (k === 'load' && d > 0) state.yearLog.loadUsed += d;
  return d;
}

export function gainSkillXp(state, k, xp, log) {
  const ch = state.ch;
  if (!xp) return;
  if (xp > 0) xp += xpBonus(state, k);
  ch.skillXp[k] = (ch.skillXp[k] || 0) + xp;
  const before = ch.skills[k];
  let lvl = 0;
  for (let i = 0; i < SKILL_XP.length; i++) if (ch.skillXp[k] >= SKILL_XP[i]) lvl = i;
  ch.skills[k] = Math.max(before, lvl);
  if (ch.skills[k] > before) {
    log?.push(`${SKILLS[k]} 숙련 ${before}→${ch.skills[k]}`);
    state.yearLog.skillUps.push(`${SKILLS[k]} ${before}→${ch.skills[k]}`);
  }
}

export function gainAttrXp(state, k, xp, log) {
  const ch = state.ch;
  ch.attrXp[k] = (ch.attrXp[k] || 0) + xp;
  while (ch.attrXp[k] >= 6 && ch.attrs[k] < 10) {
    ch.attrXp[k] -= 6; ch.attrs[k]++;
    log?.push(`${ATTRS[k]} ${ch.attrs[k] - 1}→${ch.attrs[k]}`);
    state.yearLog.skillUps.push(`${ATTRS[k]} ${ch.attrs[k] - 1}→${ch.attrs[k]}`);
  }
}

export function changeRel(state, npc, trust = 0, aff = 0, log, cause) {
  if (!npc || !npc.alive) return;
  [trust, aff] = adjustRel(state, npc, trust, aff);
  const bt = npc.trust, ba = npc.affinity;
  const tier0 = npc.met ? tierOf(npc) : 2;
  npc.trust = clamp(npc.trust + trust, 0, 100);
  npc.affinity = clamp(npc.affinity + aff, -100, 100);
  if (!npc.met) npc.met = true;
  if (!npc.metYears.includes(state.year)) npc.metYears.push(state.year);
  const parts = [];
  if (npc.trust !== bt) parts.push(`신뢰 ${signed(npc.trust - bt)}`);
  if (npc.affinity !== ba) parts.push(`호감 ${signed(npc.affinity - ba)}`);
  if (parts.length) {
    const line = `${shortName(npc.name)} ${parts.join(' · ')}`;
    log?.push(line);
    state.yearLog.relChanges.push({ npc: npc.id, text: line, cause: cause || '' });
    afterRelChange(state, npc, tier0, log, cause);
  }
}

export function addRep(state, f, v, log) {
  v = adjustRep(state, f, v);
  const before = state.rep[f];
  state.rep[f] = clamp(before + v, -100, 100);
  if (state.rep[f] !== before) log?.push(`${FACTIONS[f]} 평판 ${signed(state.rep[f] - before)}`);
}

// 도시 지표 변경: 계절당 변동 상한 ±6을 지킨다.
export function cityDelta(state, scope, key, v, log, cause) {
  const city = state.city;
  const accKey = `${scope}.${key}`;
  const used = city.changeAcc[accKey] || 0;
  const allowed = v > 0 ? Math.min(v, 6 - used) : Math.max(v, -6 - used);
  if (allowed === 0) return 0;
  let target, label;
  if (scope === 'global') { target = city.global; label = GLOBAL_NAMES[key]; }
  else { target = city.districts[scope]; label = `${DISTRICTS[scope].name} ${DISTRICT_KEYS[key]}`; }
  const before = target[key];
  const lo = key === 'price' ? 70 : 0, hi = key === 'price' ? 160 : 100;
  target[key] = clamp(before + allowed, lo, hi);
  const d = target[key] - before;
  city.changeAcc[accKey] = used + d;
  if (d) {
    log?.push(`${label} ${signed(d)}`);
    if (cause) state.yearLog.cityChanges.push({ text: `${label} ${signed(d)}`, cause });
  }
  return d;
}

export const GLOBAL_NAMES = { supply: '공급 안정', price: '물가', employment: '고용', pollution: '공해', trust: '시민 신뢰', tension: '세력 긴장', residue: '잔흔 축적' };
export const DISTRICT_KEYS = { heat: '열 공급', jobs: '일자리', pollution: '공해', safety: '치안' };

export function applyEffects(state, effects, ctx = {}) {
  const log = [];
  const ch = state.ch;
  const roles = ctx.roles || {};
  const cause = ctx.cause || '';
  for (const e of effects || []) {
    if (e.if && !meets(state, e.if, roles)) continue;
    switch (e.t) {
      case 'cash': ch.cash += e.v; if (e.v > 0) state.yearLog.eventIncome += e.v; else state.yearLog.spent += -e.v; log.push(`현금 ${signed(e.v)}C`); break;
      case 'stat': addStat(state, e.k, e.v, log); break;
      case 'skill': gainSkillXp(state, e.k === 'job' ? (ch.job ? JOBS[ch.job.id].skill : 'repair') : e.k, e.xp, log); break;
      case 'attr': gainAttrXp(state, e.k, e.xp ?? 6, log); break;
      case 'rel': changeRel(state, npcFor(state, roles, e.who), e.trust || 0, e.aff || 0, log, cause); break;
      case 'rep': addRep(state, e.f, e.v, log); break;
      case 'flag': state.flags[e.k] = e.v ?? true; break;
      case 'unflag': delete state.flags[e.k]; break;
      case 'count': {
        if (e.uniq) { const key = `${e.k}:${e.uniq}`; if (state.uniq[key]) break; state.uniq[key] = true; }
        state.stats[e.k] = (state.stats[e.k] || 0) + (e.v ?? 1);
        break;
      }
      case 'district': cityDelta(state, e.d === 'home' ? ch.home : e.d === 'work' ? workDistrict(state) : e.d, e.k, e.v, log, cause); break;
      case 'global': cityDelta(state, 'global', e.k, e.v, log, cause); break;
      case 'districtBonus': {
        const c = state.city; c.districtBonus = c.districtBonus || {};
        c.districtBonus[e.d] = clamp((c.districtBonus[e.d] || 0) + e.v, -20, 25);
        log.push(`${DISTRICTS[e.d].name} 열 공급 기반 ${signed(e.v)}`);
        state.yearLog.cityChanges.push({ text: `${DISTRICTS[e.d].name} 열 공급 기반 ${signed(e.v)}`, cause });
        break;
      }
      case 'supply': state.city.supplyBase = clamp(state.city.supplyBase + e.v, 80, 130); log.push(`도시 열 공급 용량 ${signed(e.v)}`); break;
      case 'clock': state.city.clocks[e.k] = clamp(state.city.clocks[e.k] + e.v, 0, 6); log.push(`공급망 위기 시계 ${signed(e.v)}`); break;
      case 'item': if (ITEMS[e.id].slot === 'consumable') ch.consumables[e.id] = (ch.consumables[e.id] || 0) + 1; else if (!ch.items.includes(e.id)) { ch.items.push(e.id); autoEquip(state, e.id); } log.push(`${ITEMS[e.id].name} 획득`); break;
      case 'loseItem': ch.items = ch.items.filter(i => i !== e.id); for (const s in ch.equipment) if (ch.equipment[s] === e.id) ch.equipment[s] = null; log.push(`${ITEMS[e.id].name} 잃음`); break;
      case 'schedule': schedule(state, e, ctx); break;
      case 'duty': {
        const n = npcFor(state, roles, e.who);
        if (!n) break;
        const id = e.id || `${ctx.eventId || 'duty'}_${state.year}`;
        if (n.duties.some(d => d.id === id)) break;
        const extra = bondPerk(state, 'elian_duty') ? 1 : 0;
        n.duties.push({ id, text: fmt(state, e.text, roles), due: state.year + (e.years ?? 3) + extra, done: false, failed: false, since: state.year, manual: !!e.manual });
        log.push(`약속: ${fmt(state, e.text, roles)}`);
        break;
      }
      case 'dutyDone': {
        for (const n of Object.values(state.npcs)) for (const d of n.duties) {
          if (d.id === e.id && !d.done && !d.failed) { d.done = true; state.stats.dutiesDone = (state.stats.dutiesDone || 0) + 1; log.push(`약속을 지켰다: ${d.text}`); }
        }
        break;
      }
      case 'project': {
        if (state.uniq['project:' + e.id]) break;
        state.uniq['project:' + e.id] = true;
        state.stats.localProjects = (state.stats.localProjects || 0) + 1;
        state.flags['project_' + e.id] = state.year;
        log.push(`지역 프로젝트 완료: ${e.name}`);
        state.yearLog.cityChanges.push({ text: `지역 프로젝트 「${e.name}」`, cause });
        break;
      }
      case 'contrib': state.stats.localContrib = (state.stats.localContrib || 0) + 1; break;
      case 'work': {
        const key = `work:${ctx.eventId}:${state.year}`;
        if (state.uniq[key]) break;
        state.uniq[key] = true; ch.works += 1; state.stats.verifiedJobs = (state.stats.verifiedJobs || 0) + 1; log.push('검증된 실적 +1'); break;
      }
      case 'signature': if (!state.uniq['sig:' + ctx.eventId + state.year]) { state.uniq['sig:' + ctx.eventId + state.year] = true; state.stats.signatureWorks = (state.stats.signatureWorks || 0) + 1; log.push('대표 제작 +1'); } break;
      case 'record': state.stats.recordsPublished = (state.stats.recordsPublished || 0) + 1; log.push('검증된 기록 공개 +1'); break;
      case 'job': setJob(state, e.id, e.rank || 0, log); break;
      case 'debt': {
        const rate = Math.round((e.rate + traitSum(state, 'debtRate')) * 100) / 100;
        ch.debts.push({ id: `d${state.year}_${ch.debts.length}`, lender: e.lender, principal: e.v, original: e.v, rate, overdue: 0, since: state.year }); ch.cash += e.v;
        log.push(`${e.lender === 'sera' ? '비공식' : '합법'} 대출 ${e.v}C (연 ${Math.round(rate * 100)}%${rate > e.rate ? ' · 빚의 그림자' : ''})`);
        break;
      }
      case 'debtRelief': for (const d of ch.debts) { d.rate = Math.min(d.rate, e.rate ?? d.rate); d.overdue = 0; if (e.cut) d.principal = Math.max(0, d.principal - e.cut); } log.push('채무 조건이 조정되었다'); break;
      case 'ability': if (!ch.ability) { ch.ability = { id: e.id, stage: 0, registered: false, practice: 0 }; log.push(`고유공명 발현: ${ABILITIES[e.id].name}`); } break;
      case 'abilityStage': if (ch.ability && ch.ability.stage < 3) { ch.ability.stage += 1; log.push(`공명 단계 상승`); } break;
      case 'register': if (ch.ability) { ch.ability.registered = true; log.push('공명 능력을 시민 등록부에 신고했다'); gainTrait(state, 'kw_registered', log, cause || '공명 등록'); } break;
      case 'trait': gainTrait(state, e.id, log, cause); break;
      case 'loseTrait': loseTrait(state, e.id, log, cause); break;
      case 'goal': state.stats['g_' + e.k] = (state.stats['g_' + e.k] || 0) + (e.v ?? 1); break;
      case 'move': if (ch.home !== e.d) { ch.home = e.d; log.push(`${DISTRICTS[e.d].name}으로 이사했다`); state.history.moved = state.year; } break;
      case 'workshop': if (!ch.workshop) { ch.workshop = { since: state.year, value: e.value || 80, quality: 1, coop: !!e.coop }; log.push(e.coop ? '협동 공방을 열었다' : '작은 공방을 열었다'); } break;
      case 'workshopValue': if (ch.workshop) { ch.workshop.value += e.v; ch.workshop.quality += 1; log.push(`공방 설비 가치 +${e.v}C`); } break;
      case 'abilityTask': {
        const aId = ch.ability ? ch.ability.id : Object.keys(ABILITIES).find(a => hasAbilityOrDevice(state, a));
        if (aId) state.stats[ABILITIES[aId].stat] = (state.stats[ABILITIES[aId].stat] || 0) + 1;
        break;
      }
      case 'loss': state.history.lossStreak += 1; state.history.lastLoss = state.year; break;
      case 'note': log.push(fmt(state, e.text, roles)); break;
      case 'npcState': { const n = npcFor(state, roles, e.who); if (n) { if (e.alive === false) { n.alive = false; state.deaths.push({ id: n.id, year: state.year }); } if (e.retired) n.retired = true; } break; }
      default: break;
    }
  }
  return log;
}

export function autoEquip(state, id) {
  const slot = ITEMS[id].slot;
  if (!['tool', 'guard', 'aux'].includes(slot)) return;
  if (!state.ch.equipment[slot]) state.ch.equipment[slot] = id;
}

export function setJob(state, id, rank, log) {
  const ch = state.ch;
  const prev = ch.job;
  ch.job = { id, rank: rank || 0, years: 0, since: state.year, district: JOBS[id].district, history: prev ? [...(prev.history || []), prev.id] : [] };
  log?.push(`${JOBS[id].name} ${['견습', '숙련', '책임자', '독립 전문가'][ch.job.rank]}이 되었다`);
  state.yearLog.jobChanges.push(`${JOBS[id].name} 시작`);
}

export function schedule(state, e, ctx) {
  const [lo, hi] = e.after || [1, 1];
  const n = withRng(state, 'event', r => r.range(lo, hi));
  state.pending.push({
    id: `p${state.year}_${state.pending.length}_${e.ev}`, ev: e.ev, due: state.year + n, cause: ctx.eventId || '',
    roles: ctx.roles || {}, invalid: e.invalid || null, tries: 0, season: e.season ?? null,
  });
}
