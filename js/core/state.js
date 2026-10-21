// 새 삶의 생성. 출생·도시 흐름만 사용하고, 결과는 시작 스냅샷(start)으로 고정한다.
import { createStreams, normalizeSeed, withRng } from './rng.js';
import {
  START_YEAR, START_AGE, BACKGROUNDS, FAMILIES, APTITUDES, ABILITIES, RESONANCE_ROLL, DISTRICTS,
  CITY_PHASES, CORE_NPCS, NPC_ROLES, NAME_POOL, DESIRES, PRINCIPLES, WEAKNESSES, ATTRS, SKILLS, FACTIONS,
} from '../data/world.js';

export const RULES_VERSION = 1;
export const CONTENT_VERSION = 1;
export const GENERATOR_VERSION = 1;

const ATTR_KEYS = Object.keys(ATTRS);

// 여섯 능력치: 총합 24, 각 2~6. 주 자질 능력치는 최소 5로 만들고 다른 능력치에서 옮긴다.
export function rollAttributes(r, mainAttr) {
  const a = Object.fromEntries(ATTR_KEYS.map(k => [k, 4]));
  // 무작위로 점수를 옮겨 개성을 만든다 (총합 유지)
  for (let i = 0; i < 6; i++) {
    const from = r.pick(ATTR_KEYS), to = r.pick(ATTR_KEYS);
    if (from !== to && a[from] > 2 && a[to] < 6) { a[from]--; a[to]++; }
  }
  while (a[mainAttr] < 5) {
    const donors = ATTR_KEYS.filter(k => k !== mainAttr && a[k] > 2);
    const pool = donors.length ? donors : ATTR_KEYS.filter(k => k !== mainAttr);
    const d = r.pick(pool);
    a[d]--; a[mainAttr]++;
  }
  return a;
}

function makeName(r, used) {
  for (let i = 0; i < 50; i++) {
    const n = `${r.pick(NAME_POOL.given)} ${r.pick(NAME_POOL.family)}`;
    if (!used.has(n)) { used.add(n); return n; }
  }
  const n = `${r.pick(NAME_POOL.given)} ${used.size}`;
  used.add(n);
  return n;
}

function makeNpc(id, data) {
  return {
    id, name: data.name, age: data.age, alive: true, retired: false, core: !!data.core, role: data.role || null,
    faction: data.faction || null, district: data.district || null, job: data.job || '', portrait: data.portrait || 'person',
    desire: data.desire || '안전', principle: data.principle || '', weakness: data.weakness || '', desc: data.desc || '',
    affinity: data.affinity ?? 0, trust: data.trust ?? 0, met: data.met ?? false, metYears: [], duties: [], heirOf: data.heirOf || null,
    note: '',
  };
}

export function newRun(seedInput, opts = {}) {
  const seed = normalizeSeed(seedInput);
  const state = {
    version: RULES_VERSION, contentVersion: CONTENT_VERSION, generatorVersion: GENERATOR_VERSION,
    runId: seed + ':' + (opts.runNonce || 0),
    seed, rng: createStreams(seed),
    year: START_YEAR - 13, age: 0, season: 0, phase: 'birth', childhoodStep: 0,
    ch: null, npcs: {}, city: null, rep: Object.fromEntries(Object.keys(FACTIONS).map(k => [k, 0])),
    plan: null, schedule: [], queue: [], seasonStarted: false,
    pending: [], cooldowns: {}, typeUsed: {}, dailyUsed: {}, current: null,
    journal: [], yearLog: null, settlement: null, brief: null,
    stats: {}, uniq: {}, flags: {}, goal: null, goalCandidates: [],
    achievements: [], newAchievements: [], ending: null, nonce: 0, deaths: [],
    history: { mains: [], subs: [], cashByYear: [], deficitStreak: 0, stableHousingYears: 0, lossStreak: 0, recoveryOffered: 0, leisureYears: 0 },
  };

  // 출생 흐름
  withRng(state, 'birth', r => {
    const bgId = r.weighted(Object.entries(BACKGROUNDS).map(([k, v]) => [k, v.w]));
    const bg = BACKGROUNDS[bgId];
    const origin = r.weighted(bg.origins.map(o => [o, o[1]]));
    const familyId = r.weighted(Object.entries(FAMILIES).map(([k, v]) => [k, v.w]));
    const aptId = r.pick(Object.keys(APTITUDES));
    const attrs = rollAttributes(r, APTITUDES[aptId].attr);
    // 부 자질: 배경과 연결된 두 분야 + 다른 분야 하나 중 하나
    const others = Object.keys(SKILLS).filter(k => !bg.subSkills.includes(k));
    const subCandidates = [...bg.subSkills, r.pick(others)];
    const subSkill = r.pick(subCandidates);
    const resonance = r.weighted(RESONANCE_ROLL);
    let ability = null;
    if (resonance === 'manifest') ability = r.weighted(Object.entries(ABILITIES).map(([k, v]) => [k, v.w]));
    const skills = Object.fromEntries(Object.keys(SKILLS).map(k => [k, 0]));
    const skillXp = Object.fromEntries(Object.keys(SKILLS).map(k => [k, 0]));
    skills[subSkill] = 1; skillXp[subSkill] = 3;

    const used = new Set(Object.values(CORE_NPCS).map(n => n.name));
    const playerName = (opts.name && String(opts.name).trim()) || makeName(r, used);
    used.add(playerName);

    state.ch = {
      name: playerName.slice(0, 16), pronoun: opts.pronoun || '', background: bgId, origin: origin[0], home: origin[2], family: familyId,
      aptitude: aptId, subSkill, attrs, attrXp: Object.fromEntries(ATTR_KEYS.map(k => [k, 0])), skills, skillXp,
      health: 80, stress: 20, load: 0, cash: bg.cash, debts: [], independent: false,
      job: null, apprentice: null, works: 0, workshop: null,
      equipment: { tool: null, guard: null, aux: null }, items: [], consumables: {},
      ability: ability ? { id: ability, stage: 0, registered: false, practice: 0 } : null,
      interest: null, lifeClass: bg.household, publicRank: 0, alive: true,
    };
    if (bgId === 'workshop') state.ch.items.push('tool_basic'), (state.ch.equipment.tool = 'tool_basic');

    state.start = {
      generator_version: GENERATOR_VERSION, seed, base_background_id: bgId, origin_district: origin[0], district_id: origin[2],
      family_state: familyId, aptitudes: { main: aptId, sub: subSkill }, attrs: { ...attrs },
      ability_state: ability ? 'manifest' : 'none', ability_family_id: ability, rare_modifier_id: null, rare_background_id: null,
    };

    // 핵심 인물 (나이는 184년 기준으로 저장한다)
    for (const [id, d] of Object.entries(CORE_NPCS)) {
      state.npcs[id] = makeNpc(id, { ...d, core: true });
    }
    // 절차 생성 접점 인물 8명
    for (const [role, def] of Object.entries(NPC_ROLES)) {
      const id = 'p_' + role;
      const [lo, hi] = def.ageRange;
      const age = r.range(lo, hi);
      state.npcs[id] = makeNpc(id, {
        name: makeName(r, used), age,
        role, district: state.ch.home, job: roleJob(role, bgId), desire: r.pick(DESIRES), principle: r.pick(PRINCIPLES), weakness: r.pick(WEAKNESSES),
        portrait: role === 'guardian' ? 'home' : role === 'friend' ? 'star' : role === 'rival' ? 'gear' : 'person',
      });
    }
    // 보호자는 처음부터 가깝다. 가족 관계에 따라 시작값이 다르다.
    const g = state.npcs.p_guardian;
    g.met = true;
    g.affinity = { stable: 55, busy: 40, community: 35, substitute: 20 }[familyId];
    g.trust = { stable: 50, busy: 40, community: 35, substitute: 25 }[familyId];
    state.npcs.p_friend.met = true; state.npcs.p_friend.affinity = 20; state.npcs.p_friend.trust = 10;
    state.npcs.p_neighbor.met = true; state.npcs.p_neighbor.affinity = 10; state.npcs.p_neighbor.trust = 10;
    if (state.ch.home === 'ash') { state.npcs.toma.met = true; state.npcs.toma.affinity = 15; state.npcs.toma.trust = 10; }
  });

  // 도시 흐름
  withRng(state, 'city', r => {
    const phase = r.weighted(CITY_PHASES.map(p => [p, p[1]]));
    const districts = {};
    for (const [k, d] of Object.entries(DISTRICTS)) districts[k] = { ...d.start };
    const global = { supply: 60, price: 100, employment: 60, pollution: 55, trust: 50, tension: 35, residue: 30 };
    let supplyBase = 110;
    if (phase[0] === 'boom') { global.employment += 8; global.pollution += 5; districts.brass.jobs += 5; }
    if (phase[0] === 'shortage') { supplyBase = 103; global.supply -= 8; global.price += 4; }
    if (phase[0] === 'reform') { global.trust += 5; global.tension += 5; }
    if (phase[0] === 'research') { global.residue += 5; districts.market.jobs += 3; }
    state.city = {
      phase: phase[0], phaseName: phase[2], phaseDesc: phase[3], global, districts, supplyBase, demandBase: 100,
      supplyNow: supplyBase, demandNow: 100, shortage: 0, maxShortageYear: 0, accidentsRecent: [],
      factions: {
        office: { funds: 60, plan: null }, guild: { funds: 70, plan: null }, union: { funds: 40, plan: null, strikePrep: 0, striking: false }, mutual: { funds: 30, plan: null },
      },
      clocks: { supplyChain: phase[0] === 'shortage' ? 2 : 1 }, news: [], changeAcc: {}, outcomesSeen: 0,
    };
  });

  state.goalCandidates = [];
  return state;
}

function roleJob(role, bg) {
  return {
    guardian: { factory: '공장 압연공', workshop: '공방 주인', admin: '시정청 서기', transport: '화물 기관사', migrant: '부두 짐꾼', sponsor: '후원원 사감' }[bg],
    friend: '야간학교 학생', rival: '견습 지원생', neighbor: '은퇴한 보일러공', senior: '공장 배관 반장', master: '매듭 시장 공방 장인', clerk: '출장 기록소 사무원', child: '골목 아이',
  }[role] || '';
}

// 역할 이름 → 실제 인물. 사라진 핵심 인물은 같은 세력의 후임으로 대체한다.
export function resolveNpc(state, id) {
  let n = state.npcs[id];
  if (!n) return null;
  if (n.alive && !n.retired) return n;
  if (!n.core) return n.alive ? n : null;
  const heirId = 'heir_' + id;
  if (!state.npcs[heirId]) {
    const used = new Set(Object.values(state.npcs).map(x => x.name));
    const name = withRng(state, 'event', r => makeName(r, used));
    state.npcs[heirId] = makeNpc(heirId, {
      name, age: 30 + (state.year % 7), faction: n.faction, district: n.district, job: n.job.replace(/(수리공|조직가|중개인|기록관)$/, '$1 후임'),
      portrait: n.portrait, heirOf: id, desc: `${n.name}의 일을 이어받은 사람. 개인적인 친밀함은 물려받지 않았다.`, core: false, met: false,
    });
  }
  return state.npcs[heirId];
}
