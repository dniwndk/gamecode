// 활동·생계·부채·계층·승진. 한 해의 주 활동과 보조 약속이 수입과 성장을 만든다.
import { JOBS, ITEMS, DISTRICTS, PROMOTION, RANKS, SUB_COMMITMENTS, SKILLS, ABILITIES } from '../data/world.js';
import { gainSkillXp, gainAttrXp, addStat, changeRel, addRep, setJob, computeChance, rollCheck, hasAbilityOrDevice, workDistrict } from './rules.js';
import { withRng } from './rng.js';
import { clamp, shortName } from './util.js';
import { hasTrait, traitMul, traitFx, traitName, bondPerk, TRAITS } from './traits.js';

export const BASE_COST = { housing: 24, food: 24, heat: 12, commute: 12 }; // 합계 72C

export function annualCost(state) {
  if (!state.ch.independent) return 0;
  const base = livingBase(state);
  return base + livingTraitDelta(state, base) + comfortCost(state);
}

function livingBase(state) {
  const ch = state.ch;
  const price = state.city.global.price / 100;
  const rent = BASE_COST.housing + (DISTRICTS[ch.home]?.rent || 0) - (state.flags.tempShelter === state.year ? 12 : 0) - housingRelief(state);
  return Math.round((rent + BASE_COST.food + BASE_COST.heat + BASE_COST.commute) * price);
}

// 주거비를 줄여 주는 인연과 루트: 보호자와 함께 사는 집, 이웃의 방 알선
function housingRelief(state) {
  let v = 0;
  if (state.flags.guardianHome && state.npcs.p_guardian?.alive) v += 10;
  if (bondPerk(state, 'neighbor_room')) v += 4;
  return v;
}

// 검소한 살림·헤픈 지갑 같은 특성이 생계비에 더하거나 빼는 양
export function livingTraitDelta(state, base) {
  const m = traitMul(state, 'living');
  return m === 1 ? 0 : Math.round(base * (m - 1));
}

// 여유가 생기면 생활 수준도 오른다: 150C를 넘는 현금의 8%를 더 나은 식탁과 선물, 수선에 쓴다
// 검소한 살림은 이 비용을 지우고, 헤픈 지갑은 90C부터 1.5배로 붙인다
export function comfortCost(state) {
  const ch = state.ch;
  if (!ch.independent || state.flags.frugal) return 0;
  let at = 150;
  for (const t of ch.traits || []) { const m = TRAITS[t.id]?.mods; if (m?.comfortAt != null) at = Math.min(at, m.comfortAt); }
  return Math.max(0, Math.floor((ch.cash - at) * 0.08 * traitMul(state, 'comfortMul')));
}

export function costBreakdown(state) {
  const price = state.city.global.price / 100;
  const ch = state.ch;
  const rows = [
    ['주거', Math.round((BASE_COST.housing + (DISTRICTS[ch.home]?.rent || 0)) * price)],
    ['식비', Math.round(BASE_COST.food * price)],
    ['열 공급', Math.round(BASE_COST.heat * price)],
    ['통근·수선', Math.round(BASE_COST.commute * price)],
  ];
  if (state.flags.tempShelter === state.year) rows.push(['임시 숙소', -Math.round(12 * price)]);
  if (state.flags.guardianHome && state.npcs.p_guardian?.alive) rows.push(['보호자와 함께 사는 집', -Math.round(10 * price)]);
  if (bondPerk(state, 'neighbor_room')) rows.push(['이웃의 방 알선', -Math.round(4 * price)]);
  const base = rows.reduce((a, r) => a + r[1], 0);
  const lt = livingTraitDelta(state, base);
  if (lt) {
    const ids = (ch.traits || []).filter(t => TRAITS[t.id]?.mods?.living != null).map(t => t.id);
    rows.push([`특성 ${ids.map(id => `「${traitName(id)}」`).join(' ')}`, lt]);
  }
  if (comfortCost(state)) rows.push(['생활 향상', comfortCost(state)]);
  return rows;
}

function jobIncomeBase(state) {
  const ch = state.ch;
  if (!ch.job) return 0;
  const j = JOBS[ch.job.id];
  let inc = j.income[ch.job.rank];
  const d = state.city.districts[workDistrict(state)];
  if (d.jobs < 35) inc *= 0.85; else if (d.jobs > 75) inc *= 1.05;
  if (state.city.factions.union.striking && workDistrict(state) === 'brass' && !bondPerk(state, 'sabine_strike')) inc *= 0.8;
  return Math.round(inc);
}

// 특성과 인연이 주 활동 수입에 더하는 몫. [더할 금액, [{ label, d, ids }]]
export function traitIncome(state, main, base) {
  const ch = state.ch;
  let add = 0;
  const why = [];
  const put = (label, d, ids = []) => { if (d) { add += d; why.push({ label, d, ids }); } };
  const mul = (key) => {
    const ids = (ch.traits || []).filter(t => TRAITS[t.id]?.mods?.[key] != null).map(t => t.id);
    if (ids.length) put(ids.map(id => `「${traitName(id)}」`).join(' '), Math.round(base * (traitMul(state, key) - 1)), ids);
  };
  if (['work', 'work_res', 'workshop'].includes(main)) mul('income');
  if (main === 'workshop' || ((main === 'work' || main === 'work_res') && ch.job?.id === 'merchant')) mul('partnerIncome');
  if (main === 'community') {
    if (hasTrait(state, 'pos_lamp_keeper')) put('「등불지기」', 24, ['pos_lamp_keeper']);
    if (bondPerk(state, 'toma_community')) put('토마와의 인연', 12);
  }
  if (main === 'mentor' && bondPerk(state, 'child_heir')) put('제자와의 인연', 12);
  if (main === 'night_market' && state.age >= 18) put(`상업 숙련 ${ch.skills.trade}`, ch.skills.trade * 8);
  return [add, why];
}

// ───────── 주 활동 ─────────
export const MAIN = {
  m_school: { name: '야간학교', minor: true, attr: 'lore', desc: '기초 회로와 장부 읽기를 배운다. 학식과 기록이 자란다.', income: 0 },
  m_apprentice: { name: '견습', minor: true, needsTarget: true, desc: '현장에서 일을 배운다. 해당 숙련과 멘토의 신뢰, 약간의 소지금을 얻는다.', income: 8 },
  m_delivery: { name: '배달 일', minor: true, attr: 'body', desc: '도시를 뛰어다니며 소지금을 번다. 신체와 감각, 운송 숙련이 자란다.', income: 12 },
  m_family: { name: '집안 돌봄', minor: true, attr: 'will', desc: '보호자의 짐을 나눠 진다. 관계가 깊어지고 마음이 가라앉는다.', income: 0 },
  work: { name: '일터 근무', desc: '현재 직업으로 한 해를 보낸다. 수입·숙련·실적이 쌓인다.' },
  work_res: { name: '능력을 활용한 근무', desc: '고유공명이나 대응 장치를 업무에 쓴다. 수입 +10%, 실적이 늘지만 공명부하가 쌓인다.' },
  jobhunt: { name: '구직과 공공근로', needsTarget: true, desc: '공공근로로 생계를 잇고 원하는 직업의 자리를 찾는다. 연 수입 64C.', income: 64 },
  school: { name: '직업 야간교육', needsTarget: true, cost: 12, desc: '12C를 내고 1년 과정을 듣는다. 시간제 일로 48C를 벌고 숙련이 크게 오른다.', income: 48 },
  community: { name: '상호회 일', desc: '등불 상호회의 수리와 배급을 돕는다. 연 72C, 지역 신뢰와 평판.', income: 72 },
  workshop: { name: '공방 운영', desc: '내 공방에서 주문을 받는다. 수요와 숙련에 따라 수입이 달라진다.' },
  recover: { name: '요양', desc: '일을 쉬고 몸을 돌본다. 수입이 없지만 건강·스트레스·공명부하가 크게 회복된다.', income: 0 },
  mentor: { name: '제자 지도', desc: '쌓아 온 기술을 후배에게 넘긴다. 연 60C, 전수의 기록이 남는다.', income: 60 },
  publicwork: { name: '공공근로 (보장)', insolvency: true, desc: '시정청이 보장하는 일자리. 연 84C. 지급 불능 상태에서 생계를 다시 세운다.', income: 84 },
  // 열쇠 특성이 여는 주 활동
  night_market: { name: '야시장 노점', trait: 'kw_market_kid', desc: '시장통에서 자란 감으로 밤마다 노점을 연다. 상업 숙련만큼 벌이가 늘고, 매듭 시장 사람들과 가까워진다.', income: 64, minorIncome: 18 },
  rivet_errand: { name: '검은 리벳 심부름', trait: 'kw_rivet_contact', desc: '세라의 비공식 운송과 수금을 맡는다. 연 104C. 리벳 평판과 세라의 신뢰가 오르지만 시정청의 눈길과 스트레스가 따른다.', income: 104 },
};

export function availableMains(state) {
  const ch = state.ch;
  const out = [];
  if (state.age < 18) {
    out.push({ id: 'm_school' });
    for (const j of Object.keys(JOBS)) out.push({ id: 'm_apprentice', target: j, label: `${JOBS[j].name} 견습` });
    out.push({ id: 'm_delivery' });
    out.push({ id: 'm_family' });
    if (state.age >= 14 && hasTrait(state, 'kw_market_kid')) out.push({ id: 'night_market' });
    return out.map(o => decorate(state, o));
  }
  if (ch.job) out.push({ id: 'work' });
  if (ch.job && resonanceJobFit(state)) out.push({ id: 'work_res' });
  if (ch.workshop) out.push({ id: 'workshop' });
  for (const j of Object.keys(JOBS)) if (!ch.job || ch.job.id !== j) out.push({ id: 'jobhunt', target: j, label: ch.job ? `${JOBS[j].name}로 전직 준비` : `${JOBS[j].name} 구직` });
  for (const j of Object.keys(JOBS)) out.push({ id: 'school', target: j, label: `${SKILLS[JOBS[j].skill]} 야간교육` });
  out.push({ id: 'community' });
  if (hasTrait(state, 'kw_market_kid')) out.push({ id: 'night_market' });
  if (hasTrait(state, 'kw_rivet_contact') && state.npcs.sera?.alive && !bondPerk(state, 'sera_refuse')) out.push({ id: 'rivet_errand' });
  if (state.age >= 50 && Math.max(...Object.values(ch.skills)) >= 3) out.push({ id: 'mentor' });
  out.push({ id: 'recover' });
  if (ch.independent && (ch.cash < 0 || state.ch.lifeClass === 0)) out.push({ id: 'publicwork' });
  return out.map(o => decorate(state, o));
}

function resonanceJobFit(state) {
  const ch = state.ch;
  return Object.keys(ABILITIES).some(a => hasAbilityOrDevice(state, a));
}

function decorate(state, o) {
  const def = MAIN[o.id];
  const r = { ...o, name: o.label || def.name, desc: def.desc, income: estimateIncome(state, o), cost: def.cost || 0 };
  // 특성·인연이 이 활동에 주는 몫을 보여 준다
  const [, why] = traitIncome(state, o.id, baseIncome(state, o));
  r.traitTags = why.map(w => ({ text: `${w.label} ${w.d > 0 ? '+' : ''}${w.d}C`, good: w.d > 0 }));
  if (def.trait) r.keyTrait = { id: def.trait, name: traitName(def.trait) };
  if (o.id === 'm_apprentice') {
    const mentor = apprenticeMentor(state, o.target);
    r.desc = `${JOBS[o.target].name} 일을 ${shortName(mentor.name)} 밑에서 배운다. ${SKILLS[JOBS[o.target].skill]} 숙련과 신뢰, 소지금 8C.`;
  }
  if (o.id === 'jobhunt') {
    const q = jobQualification(state, o.target);
    r.desc = `공공근로로 64C를 벌며 ${JOBS[o.target].name} 자리를 찾는다. ${q.ok ? '자격 충분: 연말에 채용된다.' : `연말 채용 판정 ${q.chance}% (${q.reason}).`}`;
  }
  if (o.id === 'school') r.desc = `12C를 내고 ${SKILLS[JOBS[o.target].skill]} 과정을 1년 듣는다. 시간제 일 48C, 숙련이 크게 오른다.`;
  if (o.id === 'work' || o.id === 'work_res') {
    const j = JOBS[state.ch.job.id];
    r.desc = `${j.name} ${RANKS[state.ch.job.rank]}으로 일한다. ${o.id === 'work_res' ? '공명/장치를 함께 써서 수입 +10%, 공명부하가 쌓인다.' : `주 업무: ${j.activity}.`}`;
  }
  if (o.id === 'school' && state.ch.cash < 12) { r.disabled = '수업료 12C가 부족하다'; }
  return r;
}

export function apprenticeMentor(state, job) {
  const id = job === 'plumber' ? (state.ch.home === 'ash' ? 'toma' : 'p_senior') : job === 'merchant' ? 'p_master' : 'p_clerk';
  return state.npcs[id];
}

export function jobQualification(state, job) {
  const ch = state.ch;
  const j = JOBS[job];
  const mentor = state.npcs[j.mentor];
  if (state.flags['apprenticeDone_' + job]) return { ok: true, reason: '견습 수료' };
  if (ch.skills[j.skill] >= 1 && ch.attrs[j.attr] >= 4) return { ok: true, reason: '기초 숙련' };
  if (mentor && mentor.trust >= 30) return { ok: true, reason: `${shortName(mentor.name)}의 추천` };
  if (job === 'recorder' && hasTrait(state, 'kw_paper_house')) return { ok: true, reason: '「서류의 집」 출신' };
  if (job === 'plumber' && bondPerk(state, 'senior_ref')) return { ok: true, reason: `${shortName(state.npcs.p_senior.name)}의 추천서` };
  if (job === 'recorder' && bondPerk(state, 'clerk_ref')) return { ok: true, reason: `${shortName(state.npcs.p_clerk.name)}의 추천서` };
  if (state.flags.wardNetwork) return { ok: true, reason: '후원원 동기회의 추천' };
  let { chance } = computeChance(state, { attr: j.attr, diff: 6, skill: j.skill });
  if (bondPerk(state, 'friend_job')) chance = Math.min(95, chance + 10);
  return { ok: false, chance, reason: bondPerk(state, 'friend_job') ? '공개 채용 시험 · 친구의 소개 +10' : '공개 채용 시험' };
}

function baseIncome(state, o) {
  const def = MAIN[o.id];
  if (o.id === 'work') return jobIncomeBase(state);
  if (o.id === 'work_res') return Math.round(jobIncomeBase(state) * 1.1);
  if (o.id === 'workshop') return workshopIncome(state, true);
  if (def.minorIncome != null && state.age < 18) return def.minorIncome;
  return def.income || 0;
}

export function estimateIncome(state, o) {
  const b = baseIncome(state, o);
  return b + traitIncome(state, o.id, b)[0];
}

function workshopIncome(state, estimate) {
  const ch = state.ch;
  if (!ch.workshop) return 0;
  const sk = Math.max(ch.skills.repair, ch.skills.trade);
  let inc = 100 + sk * 18 + ch.workshop.quality * 10 - 24;
  if (!estimate) inc = Math.round(inc * withRng(state, 'city', r => 0.8 + r.float() * 0.4));
  return Math.round(inc);
}

export function subOptions(state) {
  return Object.entries(SUB_COMMITMENTS).map(([id, v]) => ({ id, name: v.name, desc: v.desc }));
}

// 계획 확정 시 1회 처리 (선불 비용)
export function applyPlanStart(state) {
  const p = state.plan;
  if (p.main === 'school') { state.ch.cash -= 12; state.yearLog.spent += 12; state.stats.nightSchool = (state.stats.nightSchool || 0) + 1; }
  const yearIncome = computeYearIncome(state);
  if (state.ch.independent) {
    const ids = (state.ch.traits || []).filter(t => TRAITS[t.id]?.mods?.living != null).map(t => t.id);
    const d = livingTraitDelta(state, livingBase(state));
    if (ids.length && d) traitFx(state, ids, '생계비(C)', d);
  }
  state.yearLog.plannedIncome = yearIncome;
  state.yearLog.quarterIncome = Math.round(yearIncome / 4);
  state.yearLog.quarterExpense = Math.round(annualCost(state) / 4);
}

function computeYearIncome(state) {
  const p = state.plan;
  let base;
  switch (p.main) {
    case 'work': base = jobIncomeBase(state); break;
    case 'work_res': base = Math.round(jobIncomeBase(state) * 1.1); break;
    case 'workshop': base = workshopIncome(state, false); break;
    case 'm_delivery': base = 12; break;
    case 'm_apprentice': base = 8; break;
    default: base = baseIncome(state, { id: p.main });
  }
  const [add, why] = traitIncome(state, p.main, base);
  for (const w of why) {
    state.yearLog.causes.push(`${w.label} ${w.d > 0 ? '덕분에' : '때문에'} 올해 수입 ${w.d > 0 ? '+' : ''}${w.d}C`);
    if (w.ids.length) traitFx(state, w.ids, '수입(C)', w.d);
  }
  return base + add;
}

// ───────── 계절 처리 ─────────
export function seasonEconomy(state) {
  const ch = state.ch;
  const p = state.plan;
  const yl = state.yearLog;
  const log = [];
  const inc = state.season === 3 ? yl.plannedIncome - yl.quarterIncome * 3 : yl.quarterIncome;
  if (inc) { ch.cash += inc; yl.income += inc; }
  if (ch.independent) {
    const exp = state.season === 3 ? annualCost(state) - yl.quarterExpense * 3 : yl.quarterExpense;
    ch.cash -= exp; yl.expense += exp;
  }
  // 겨울 추위: 열 공급이 낮은 구역에서 외투 없이 지내면 건강이 깎이고 난방비가 든다
  if (state.season === 3 && state.city.districts[ch.home].heat < 40) {
    const shelter = ch.home === 'ash' && (bondPerk(state, 'toma_winter') ? '토마가 먼저 골목 난로를 돌봤다' : hasTrait(state, 'pos_lamp_keeper') ? '「등불지기」의 난로 장부가 겨울을 지켰다' : null);
    if (shelter) { log.push(shelter); yl.causes.push(`${shelter}. 추위 피해가 없었다`); }
    else if (hasTrait(state, 'pos_iron_body')) { log.push('「무쇠 같은 몸」이 한파를 버텼다'); traitFx(state, ['pos_iron_body'], '건강', 3); }
    else if (ch.items.includes('heat_coat')) { ch.cash -= 2; yl.expense += 2; log.push('열축전 외투 재충전 2C'); }
    else { addStat(state, 'health', -3, log); if (ch.independent) { ch.cash -= 2; yl.expense += 2; } yl.causes.push('난방이 약한 겨울을 외투 없이 보냈다'); }
  }
  // 몸에 새겨진 특성: 겨울의 흉터와 매연, 다시 일어선 사람의 회복력
  if (state.season === 3) {
    if (hasTrait(state, 'neg_scarred')) { addStat(state, 'health', -1, null, true); traitFx(state, ['neg_scarred'], '건강', -1); }
    if (hasTrait(state, 'neg_frail') && state.city.districts[ch.home].pollution >= 60) { addStat(state, 'health', -2, log, true); traitFx(state, ['neg_frail'], '건강', -2); }
  }
  if (hasTrait(state, 'pos_survivor')) { const d = addStat(state, 'health', 1, null, true); if (d) traitFx(state, ['pos_survivor'], '건강', d); }
  if (hasTrait(state, 'neg_debt_shadow') && ch.debts.length) { addStat(state, 'stress', 1, null, true); traitFx(state, ['neg_debt_shadow'], '스트레스', 1); }
  if (hasTrait(state, 'neg_overwork') && ch.stress >= 50) { addStat(state, 'health', -1, null, true); traitFx(state, ['neg_overwork'], '건강', -1); }
  if (bondPerk(state, 'friend_stress')) addStat(state, 'stress', -1, null, true);
  // 스트레스 흐름
  const workStress = p.main === 'work' || p.main === 'work_res' ? (ch.job?.id === 'plumber' ? 3 : 2) : p.main === 'jobhunt' || p.main === 'publicwork' ? 3 : p.main === 'recover' ? -4 : 1;
  addStat(state, 'stress', workStress - 1, null);
  if (ch.stress >= 80) addStat(state, 'health', -2, log);
  // 공명부하: 능력 활용 근무와 자연 회복
  if (p.main === 'work_res') {
    if (ch.ability) addStat(state, 'load', 6, null);
    else { ch.cash -= 1; yl.expense += 1; }
  }
  if (p.main === 'recover') { addStat(state, 'health', 3, null); addStat(state, 'load', -4, null); }
  addStat(state, 'load', -2, null);
  // 휴식 보조 약속은 계절마다 회복
  if (p.sub === 'rest' && !p.subUsed) {
    const s = addStat(state, 'stress', -4, null); state.stats.restStress = (state.stats.restStress || 0) - s;
    addStat(state, 'load', -10, null); addStat(state, 'health', 1, null);
  }
  // 젊을 때는 스트레스가 낮으면 몸이 조금씩 회복된다
  if (ch.stress < 50 && state.age < 55) addStat(state, 'health', 1, null);
  return log;
}

// ───────── 연말 처리 ─────────
export function yearEndActivities(state) {
  const ch = state.ch;
  const p = state.plan;
  const log = [];
  const hist = state.history;
  const prevSame = hist.mains.slice(-3).filter(m => m === p.main).length;
  const dim = prevSame >= 3 ? 0.5 : 1; // 같은 안전 행동을 반복하면 경험 효율이 준다
  const xp = (n) => Math.max(1, Math.floor(n * dim));

  switch (p.main) {
    case 'm_school': gainSkillXp(state, 'record', xp(2), log); gainAttrXp(state, 'lore', 3, log); gainAttrXp(state, 'speech', 1, log); state.stats.schoolYears = (state.stats.schoolYears || 0) + 1; break;
    case 'm_apprentice': {
      const j = JOBS[p.target];
      gainSkillXp(state, j.skill, xp(3), log); gainAttrXp(state, j.attr, 3, log);
      ch.apprentice = p.target;
      state.stats['appr_' + p.target] = (state.stats['appr_' + p.target] || 0) + 1;
      const bench = p.target === 'plumber' && hasTrait(state, 'kw_workbench');
      changeRel(state, apprenticeMentor(state, p.target), bench ? 8 : 4, bench ? 5 : 3, log, bench ? `${j.name} 견습 · 「작업대 아래의 기억」` : `${j.name} 견습`);
      if (state.stats['appr_' + p.target] >= 2 && !state.flags['apprenticeDone_' + p.target]) { state.flags['apprenticeDone_' + p.target] = true; log.push(`${j.name} 견습 수료`); state.yearLog.causes.push(`${j.name} 견습을 2년 채워 수료했다`); }
      break;
    }
    case 'm_delivery': gainSkillXp(state, 'transport', xp(2), log); gainAttrXp(state, 'body', 2, log); gainAttrXp(state, 'sense', 2, log); changeRel(state, state.npcs.p_friend, 2, 3, log, '함께 배달을 뛰었다'); break;
    case 'm_family': gainAttrXp(state, 'will', 2, log); changeRel(state, state.npcs.p_guardian, 4, 6, log, '집안일을 나눠 졌다'); addStat(state, 'stress', -8, log); break;
    case 'work': case 'work_res': {
      const j = JOBS[ch.job.id];
      gainSkillXp(state, j.skill, xp(2), log); gainAttrXp(state, j.attr, 2, log);
      ch.works += 1; ch.job.years += 1; state.stats.workYears = (state.stats.workYears || 0) + 1;
      state.stats['years_' + ch.job.id] = (state.stats['years_' + ch.job.id] || 0) + 1;
      const mentor = state.npcs[j.mentor];
      if (mentor && mentor.alive) changeRel(state, mentor, 2, 1, log, `같은 일을 하는 동료로 지냈다`);
      if (j.hazard && !ch.equipment.guard) addStat(state, 'health', -j.hazard, log);
      if (p.main === 'work_res') {
        const aId = ch.ability ? ch.ability.id : Object.keys(ABILITIES).find(a => hasAbilityOrDevice(state, a));
        if (aId) { state.stats[ABILITIES[aId].stat] = (state.stats[ABILITIES[aId].stat] || 0) + 1; }
        gainSkillXp(state, 'resonance', 1, log);
        if (ch.ability) ch.ability.practice += 1;
        ch.works += 1;
      }
      break;
    }
    case 'jobhunt': {
      const q = jobQualification(state, p.target);
      let hired = q.ok;
      if (!hired) hired = rollCheck(state, q.chance);
      if (hired) { setJob(state, p.target, 0, log); state.yearLog.causes.push(`${JOBS[p.target].name} 자리에 채용되었다 (${q.ok ? q.reason : '공개 채용 합격'})`); }
      else { log.push('올해는 자리를 얻지 못했다'); state.yearLog.causes.push(`${JOBS[p.target].name} 공개 채용에서 떨어졌다. 야간교육이나 추천이 길을 넓힌다.`); gainSkillXp(state, JOBS[p.target].skill, 1, log); }
      break;
    }
    case 'school': gainSkillXp(state, JOBS[p.target].skill, xp(5), log); gainAttrXp(state, 'lore', 2, log); state.flags['school_' + p.target] = true; break;
    case 'community': addRep(state, 'mutual', 5, log); changeRel(state, state.npcs.toma, 3, 3, log, '상호회 일을 함께 했다'); state.stats.localContrib = (state.stats.localContrib || 0) + 1; gainSkillXp(state, 'repair', 1, log); state.stats.communityYears = (state.stats.communityYears || 0) + 1; break;
    case 'workshop': {
      gainSkillXp(state, ch.skills.repair >= ch.skills.trade ? 'repair' : 'trade', xp(2), log);
      ch.workshop.value += 10;
      if (Math.max(ch.skills.repair, ch.skills.trade) >= 3 && (state.year - ch.workshop.since) % 2 === 1) { state.stats.signatureWorks = (state.stats.signatureWorks || 0) + 1; log.push('공방에서 대표 제작품이 나왔다'); }
      state.stats.workshopYears = (state.stats.workshopYears || 0) + 1;
      break;
    }
    case 'recover': addStat(state, 'stress', -6, log); state.stats.recoverYears = (state.stats.recoverYears || 0) + 1; break;
    case 'mentor': state.stats.mentorYears = (state.stats.mentorYears || 0) + 1; changeRel(state, state.npcs.p_child, 6, 5, log, '제자로 가르쳤다'); break;
    case 'publicwork': state.stats.publicworkYears = (state.stats.publicworkYears || 0) + 1; break;
    case 'night_market':
      gainSkillXp(state, 'trade', xp(3), log); gainAttrXp(state, 'speech', 2, log);
      changeRel(state, state.npcs.p_master, 2, 3, log, '야시장에서 자주 마주쳤다');
      addRep(state, 'guild', 1, log);
      state.stats.nightMarketYears = (state.stats.nightMarketYears || 0) + 1;
      break;
    case 'rivet_errand': {
      gainSkillXp(state, 'transport', xp(2), log); gainSkillXp(state, 'trade', 1, log);
      addRep(state, 'rivet', 4, log); addRep(state, 'office', -2, log);
      changeRel(state, state.npcs.sera, 3, 2, log, '검은 리벳 심부름을 맡았다');
      addStat(state, 'stress', 5, log);
      // 다섯 해에 한 번꼴로 단속에 걸린다
      if (rollCheck(state, 20)) { ch.cash -= 20; state.yearLog.spent += 20; addRep(state, 'office', -4, log); log.push('단속에 걸려 벌금 −20C'); state.yearLog.causes.push('검은 리벳 심부름 중 시정청 단속에 걸려 벌금을 냈다'); }
      state.stats.rivetYears = (state.stats.rivetYears || 0) + 1;
      break;
    }
  }
  // 시정청 공명 감독관: 해마다 수당과 등록 공명자의 평판
  if (state.flags.inspector && state.age < 66) {
    ch.cash += 18; state.yearLog.eventIncome += 18; addRep(state, 'office', 1, log); log.push('공명 감독관 수당 +18C');
  }

  // 보조 약속
  if (!p.subUsed) {
    switch (p.sub) {
      case 'care': {
        const target = state.npcs.p_guardian.alive && state.age < 40 ? state.npcs.p_guardian : bestNpc(state, ['p_guardian']);
        if (target) changeRel(state, target, 3, 5, log, '곁을 지켰다');
        addStat(state, 'stress', bondPerk(state, 'guardian_care') ? -10 : -5, log); state.stats.careYears = (state.stats.careYears || 0) + 1; break;
      }
      case 'study': gainSkillXp(state, ch.job ? JOBS[ch.job.id].skill : (ch.apprentice ? JOBS[ch.apprentice].skill : 'record'), 2, log); gainAttrXp(state, 'lore', 1, log); break;
      case 'rest': state.stats.restYears = (state.stats.restYears || 0) + 1; break;
      case 'network': {
        const list = Object.values(state.npcs).filter(n => n.alive && n.met && n.id !== 'p_guardian').sort((a, b) => (b.trust + b.affinity) - (a.trust + a.affinity)).slice(0, 2);
        for (const n of list) changeRel(state, n, 3, 3, log, '자주 얼굴을 비췄다');
        if (state.age >= 16) state.stats.g_housingInfo = (state.stats.g_housingInfo || 0) + 1;
        const homeFaction = ch.home === 'ash' ? 'mutual' : ch.home === 'brass' ? 'union' : 'sanctum';
        addRep(state, homeFaction, 3, log);
        state.stats.networkYears = (state.stats.networkYears || 0) + 1;
        break;
      }
    }
  }
  if (['rest', 'care', 'network'].includes(p.sub) && !p.subUsed) hist.leisureYears += 1;
  // 돌봄·인맥에 쓴 시간으로 가장 급한 약속 하나를 지킨다
  if (['care', 'network'].includes(p.sub) && !p.subUsed) {
    const open = [];
    for (const n of Object.values(state.npcs)) if (n.alive) for (const d of n.duties) if (!d.done && !d.failed && !d.waived && d.manual !== true) open.push([n, d]);
    open.sort((a, b) => a[1].due - b[1].due);
    if (open.length) {
      const [n, d] = open[0];
      d.done = true; state.stats.dutiesDone = (state.stats.dutiesDone || 0) + 1;
      changeRel(state, n, 6, 4, log, '약속을 지켰다');
      log.push(`약속을 지켰다: ${d.text}`);
      state.yearLog.causes.push(`${shortName(n.name)}와의 약속을 지켰다: ${d.text}`);
    }
  }
  return log;
}

function bestNpc(state, exclude = []) {
  return Object.values(state.npcs).filter(n => n.alive && n.met && !exclude.includes(n.id)).sort((a, b) => (b.affinity) - (a.affinity))[0];
}

// 부채: 이자 → 상환 → 연체 단계 (독촉 → 조정 → 담보 처분)
export function yearEndDebts(state) {
  const ch = state.ch;
  const log = [];
  for (const d of ch.debts) {
    const interest = Math.ceil(d.principal * d.rate);
    const minPay = interest + Math.ceil(d.principal * 0.2);
    if (ch.cash >= minPay) {
      ch.cash -= minPay; d.principal -= (minPay - interest); d.overdue = 0;
      state.stats.interestPaid = (state.stats.interestPaid || 0) + interest;
      state.yearLog.expense += minPay;
      log.push(`대출 상환 ${minPay}C (이자 ${interest}C)`);
    } else {
      d.principal += interest; d.overdue += 1;
      state.yearLog.causes.push(`${d.lender === 'sera' ? '세라의' : '은행'} 대출 상환이 밀렸다 (연체 ${d.overdue}회)`);
      if (d.overdue === 1) addStat(state, 'stress', 5, log);
      if (d.overdue >= 3) {
        const sell = ch.items.find(i => !['tool_basic'].includes(i) && ITEMS[i].slot !== 'consumable');
        if (sell) { ch.items = ch.items.filter(i => i !== sell); for (const s in ch.equipment) if (ch.equipment[s] === sell) ch.equipment[s] = null; d.principal = Math.max(0, d.principal - Math.round(ITEMS[sell].price * 0.6)); log.push(`담보로 ${ITEMS[sell].name}을 넘겼다`); state.yearLog.causes.push(`연체가 길어져 ${ITEMS[sell].name}을 담보로 처분했다. 기본 공구와 숙식은 남았다.`); }
        d.overdue = 1;
      }
    }
    if (d.principal <= 0 && !d.paidOff) { d.paidOff = true; if (d.original >= 40) state.stats.bigLoanRepaid = (state.stats.bigLoanRepaid || 0) + 1; log.push('대출을 모두 갚았다'); state.yearLog.causes.push('대출의 원금과 이자를 모두 갚았다'); }
  }
  ch.debts = ch.debts.filter(d => d.principal > 0);
  return log;
}

export function totalDebt(state) { return state.ch.debts.reduce((a, d) => a + d.principal, 0); }

// 생활계층 L0~L4 (보유 현금만으로 판단하지 않는다)
export function computeLifeClass(state) {
  const ch = state.ch;
  if (!ch.independent) return ch.lifeClass;
  const h = state.history;
  const debt = totalDebt(state);
  if (ch.cash < 0 || state.flags.tempShelter === state.year) return 0;
  let L = 1;
  if (ch.cash - debt >= 72 && h.deficitStreak === 0 && h.nonDeficitYears >= 2) L = 2;
  const productive = (ch.workshop ? ch.workshop.value : 0) + ch.items.reduce((a, i) => a + (ITEMS[i]?.price || 0), 0) - debt;
  if (L === 2 && productive >= 200 && (state.yearLog.income + state.yearLog.eventIncome) >= 144) L = 3;
  return L;
}

// 승진: 숙련 + 실적 + 재직 + 신뢰 + 자리
export function promotionStatus(state) {
  const ch = state.ch;
  if (!ch.job || ch.job.rank >= 3) return null;
  const next = PROMOTION[ch.job.rank + 1];
  const j = JOBS[ch.job.id];
  const mentor = state.npcs[j.mentor];
  const reasons = [];
  if (ch.skills[j.skill] < next.skill) reasons.push(`${SKILLS[j.skill]} 숙련 ${ch.skills[j.skill]}/${next.skill}`);
  const works = next.works - (bondPerk(state, 'rival_spur') ? 1 : 0);
  if (ch.works < works) reasons.push(`실적 ${ch.works}/${works}`);
  if (ch.job.years < next.years) reasons.push(`재직 ${ch.job.years}/${next.years}년`);
  const trustOk = next.trust === 0 || (mentor && mentor.trust >= next.trust) || Object.values(state.rep).some(v => v >= 20);
  if (!trustOk) reasons.push(`${mentor ? shortName(mentor.name) : '멘토'}의 신뢰 ${mentor ? mentor.trust : 0}/${next.trust} 또는 세력 평판 20`);
  return { next: RANKS[ch.job.rank + 1], reasons };
}

export function tryPromotion(state) {
  const st = promotionStatus(state);
  if (!st || st.reasons.length) return st;
  const ch = state.ch;
  // 책임자부터는 자리가 비어야 한다
  if (ch.job.rank + 1 >= 2) {
    const jobs = state.city.districts[workDistrict(state)].jobs;
    const open = withRng(state, 'city', r => r.pct(clamp(40 + jobs / 2, 30, 90)));
    if (!open) { st.reasons.push(`자리가 비지 않았다 (${DISTRICTS[workDistrict(state)].name} 일자리 ${jobs})`); return st; }
  }
  ch.job.rank += 1;
  state.yearLog.causes.push(`${JOBS[ch.job.id].name} ${RANKS[ch.job.rank]}으로 승진했다`);
  state.yearLog.jobChanges.push(`${RANKS[ch.job.rank]} 승진`);
  return { promoted: RANKS[ch.job.rank], reasons: [] };
}

export function publicRankUpdate(state) {
  const ch = state.ch;
  let r = ch.publicRank;
  if (r === 0 && ch.works >= 3) r = 1;
  if (r === 1 && Math.max(...Object.values(ch.skills)) >= 3 && (state.stats.localContrib || 0) >= 3) r = 2;
  if (r !== ch.publicRank) { ch.publicRank = r; state.yearLog.causes.push(`공적 위상이 올랐다: ${['R0 새로운 시민', 'R1 믿을 만한 일손', 'R2 지역의 전문가'][r]}`); }
}
