// 한 삶의 진행 흐름. UI와 headless 테스트가 같은 API를 쓴다.
// 출생 → 유년기 회상 3장면 → 목표 선택 → [연초 계획 → 네 계절 → 연말 결산] 반복 → 엔딩
import { newRun } from './state.js';
import { withRng } from './rng.js';
import { CHILDHOOD, childhoodRoles } from '../data/childhood.js';
import { START_YEAR, START_AGE, JOBS, SEASONS, ITEMS, SHOP, DISTRICTS, ABILITIES } from '../data/world.js';
import { meets, fmt, applyEffects, addStat, gainAttrXp, maxHealth, setJob, changeRel } from './rules.js';
import { seasonTick, yearStartCity, yearEndCity } from './city.js';
import { buildSchedule, queueForSeason, processQueueItem, choose as directorChoose, getChoices, startEvent } from './director.js';
import { availableMains, subOptions, applyPlanStart, seasonEconomy, yearEndActivities, yearEndDebts, computeLifeClass, tryPromotion, publicRankUpdate, annualCost, costBreakdown, totalDebt, promotionStatus, MAIN, estimateIncome } from './economy.js';
import { goalCandidates, setGoal, updateGoals, checkAchievements, buildEnding } from './progress.js';
import { EVENTS } from '../data/events/index.js';
import { shortName } from './util.js';

export { getChoices };

export function createGame(seed, opts) {
  const s = newRun(seed, opts);
  s.phase = 'childhood';
  s.childhoodStep = 0;
  return s;
}

// ───────── 유년기 ─────────
export function childhoodScene(state) {
  const sc = CHILDHOOD[state.childhoodStep];
  if (!sc) return null;
  const roles = childhoodRoles(state);
  return {
    key: sc.key, year: sc.year, age: sc.age, title: sc.title, step: state.childhoodStep,
    text: fmt(state, sc.text(state), roles),
    choices: sc.choices.filter(c => !c.cond || meets(state, c.cond)).map(c => ({ id: c.id, label: fmt(state, c.label, roles) })),
  };
}

export function chooseChildhood(state, choiceId) {
  if (state.phase !== 'childhood') return false;
  const sc = CHILDHOOD[state.childhoodStep];
  const c = sc.choices.find(x => x.id === choiceId);
  if (!c) return false;
  state.yearLog = blankYearLog();
  const roles = childhoodRoles(state);
  const log = applyEffects(state, c.effects, { roles, cause: sc.title });
  state.journal.push({ year: sc.year, age: sc.age, season: 0, kind: 'memory', title: sc.title, text: fmt(state, sc.text(state), roles), choice: c.id === 'next' ? null : fmt(state, c.label, roles), deltas: log });
  if (c.id === 'guardian' || c.id === 'friend' || c.id === 'workbench') state.flags['child_' + c.id] = true;
  state.childhoodStep += 1;
  if (state.childhoodStep >= CHILDHOOD.length) {
    state.phase = 'goal';
    state.goalCandidates = goalCandidates(state);
  }
  return true;
}

export function chooseGoal(state, id) {
  if (state.phase !== 'goal' || !state.goalCandidates.includes(id)) return false;
  setGoal(state, id);
  state.year = START_YEAR;
  state.age = START_AGE;
  startYear(state);
  return true;
}

export function changeGoal(state, id) {
  if (state.phase !== 'plan') return false;
  setGoal(state, id);
  return true;
}

// ───────── 한 해 ─────────
export function blankYearLog() {
  return {
    income: 0, expense: 0, expenseBase: 0, eventIncome: 0, spent: 0, incomeCut: 0, plannedIncome: 0, quarterIncome: 0, quarterExpense: 0,
    relChanges: [], skillUps: [], cityChanges: [], causes: [], events: [], jobChanges: [], loadUsed: 0, startCash: 0, net: 0, warnings: [],
  };
}

export function startYear(state) {
  const ch = state.ch;
  state.yearLog = blankYearLog();
  state.yearLog.startCash = ch.cash;
  state.typeUsed = {};
  state.newAchievements = [];
  const notes = [];
  // 18세 독립: 개인 가계 시작, 견습을 수료한 분야로 채용
  if (state.age >= 18 && !ch.independent) {
    ch.independent = true;
    ch.lifeClass = 1;
    notes.push(`열여덟. 이제 ${DISTRICTS[ch.home].name}의 작은 방이 당신 이름으로 계약되었다. 올해부터 생계비를 스스로 낸다.`);
    const done = Object.keys(JOBS).filter(j => state.flags['apprenticeDone_' + j]);
    if (done.length && !ch.job) {
      const best = done.sort((a, b) => ch.skillXp[JOBS[b].skill] - ch.skillXp[JOBS[a].skill])[0];
      setJob(state, best, 0, null);
      notes.push(`견습을 마친 덕분에 ${JOBS[best].name} 자리로 바로 채용되었다.`);
    }
    state.stats.g_housingInfo = (state.stats.g_housingInfo || 0) + 1;
  }
  const plans = yearStartCity(state);
  state.yearLog.expenseBase = annualCost(state);
  const news = state.city.news.filter(n => n.year === state.year).slice(-5);
  const warnings = [];
  if (ch.load >= 75) warnings.push({ level: 'danger', text: `공명부하 ${ch.load}. 강한 사용은 사고로 이어질 수 있다. 휴식이나 안정화 치료가 필요하다.` });
  else if (ch.load >= 50) warnings.push({ level: 'warn', text: `공명부하 ${ch.load}. 정밀한 행동에 불이익이 붙는다.` });
  if (ch.health < 40) warnings.push({ level: 'danger', text: `건강 ${ch.health}. 요양이나 치료를 고려할 때다.` });
  if (ch.stress >= 70) warnings.push({ level: 'warn', text: `스트레스 ${ch.stress}. 판정에 불이익이 붙는다.` });
  for (const d of ch.debts) if (d.overdue) warnings.push({ level: 'danger', text: `대출 연체 ${d.overdue}회 (잔액 ${d.principal}C). 세 번째 연체에는 담보 처분이 시작된다.` });
  const insolvency = ch.independent && ch.cash < 0 ? insolvencyPaths(state) : [];
  state.brief = {
    year: state.year, age: state.age, news, plans: plans.map(p => p.text), notes, warnings, insolvency,
    cost: annualCost(state), breakdown: ch.independent ? costBreakdown(state) : [], price: state.city.global.price,
    nextRange: [Math.round(annualCost(state) * 0.95), Math.round(annualCost(state) * 1.08)],
    promotion: promotionStatus(state),
  };
  for (const n of notes) state.journal.push({ year: state.year, age: state.age, season: 0, kind: 'note', text: n });
  state.plan = null;
  state.phase = 'plan';
}

export function insolvencyPaths(state) {
  return [
    { id: 'mutual_aid', name: '등불 상호회 지원', desc: '상호회가 밀린 생계비 일부(36C)를 메워 준다. 대신 올해 보조 약속은 돌봄에 쓴다.', cost: '보조 약속 = 돌봄 고정' },
    { id: 'shelter', name: '임시 숙소', desc: '재의 골목 임시 숙소로 옮겨 올해 주거비를 12C 줄인다. 스트레스 +5.', cost: '이사 · 스트레스 +5' },
    { id: 'restructure', name: '채무 조정', desc: '세라나 은행과 상환 일정을 다시 짠다. 이율이 낮아지고 연체가 지워진다. 평판에 기록이 남는다.', cost: '평판 기록', cond: s => s.ch.debts.length > 0 },
    { id: 'publicwork', name: '공공근로', desc: '주 활동으로 공공근로(84C 보장)를 고를 수 있다.', cost: '주 활동 선택' },
  ].filter(p => !p.cond || p.cond(state)).map(({ cond, ...p }) => p);
}

export function useInsolvencyPath(state, id) {
  if (state.phase !== 'plan') return false;
  const ch = state.ch;
  const log = [];
  if (state.flags['insolvency_' + id] === state.year) return false;
  state.flags['insolvency_' + id] = state.year;
  if (id === 'mutual_aid') { ch.cash += 36; state.flags.forcedCare = state.year; state.rep.mutual = Math.min(100, state.rep.mutual + 2); log.push('상호회 지원 +36C'); state.history.recoveryUsed = (state.history.recoveryUsed || 0) + 1; }
  if (id === 'shelter') { state.flags.tempShelter = state.year; applyEffects(state, [{ t: 'move', d: 'ash' }, { t: 'stat', k: 'stress', v: 5 }], { cause: '임시 숙소' }); }
  if (id === 'restructure') { applyEffects(state, [{ t: 'debtRelief', rate: 0.06 }], { cause: '채무 조정' }); state.rep.office = Math.max(-100, state.rep.office - 3); }
  state.journal.push({ year: state.year, age: state.age, season: 0, kind: 'note', text: `지급 불능 경로: ${insolvencyPaths(state).find(p => p.id === id)?.name || id}` });
  state.brief.cost = annualCost(state);
  state.yearLog.expenseBase = annualCost(state);
  return true;
}

export function planOptions(state) {
  return { mains: availableMains(state), subs: subOptions(state), forcedSub: state.flags.forcedCare === state.year ? 'care' : null };
}

export function submitPlan(state, main, target, sub) {
  if (state.phase !== 'plan') return false;
  const opts = availableMains(state);
  const m = opts.find(o => o.id === main && (o.target || null) === (target || null));
  if (!m || m.disabled) return false;
  if (state.flags.forcedCare === state.year) sub = 'care';
  if (!subOptions(state).some(s => s.id === sub)) return false;
  state.plan = { main, target: target || null, sub, subUsed: false, label: m.name };
  state.history.mains.push(main === 'm_apprentice' || main === 'jobhunt' || main === 'school' ? `${main}:${target}` : main);
  state.history.subs.push(sub);
  applyPlanStart(state);
  buildSchedule(state);
  state.season = 0;
  state.seasonStarted = false;
  state.queue = [];
  state.phase = 'running';
  state.journal.push({ year: state.year, age: state.age, season: 0, kind: 'plan', text: `올해의 계획: ${m.name} · 보조 약속 ${({ care: '돌봄', study: '공부', rest: '휴식', network: '인맥' })[sub]}` });
  return true;
}

// 계절 하나(또는 남은 큐)를 진행. 사건이 열리면 멈춘다.
export function advance(state) {
  const entries = [];
  if (state.phase !== 'running') return { entries, phase: state.phase };
  if (!state.seasonStarted) {
    state.seasonStarted = true;
    seasonTick(state);
    const econ = seasonEconomy(state);
    queueForSeason(state);
    entries.push({ kind: 'season', season: state.season, text: SEASONS[state.season], deltas: econ });
    state.journal.push({ year: state.year, age: state.age, season: state.season, kind: 'season', text: SEASONS[state.season], deltas: econ.length ? econ : undefined });
    loadChecks(state, entries);
  }
  while (state.queue.length) {
    const item = state.queue.shift();
    if (processQueueItem(state, item, entries)) return { entries, phase: state.phase };
    if (deathCheck(state, entries)) return { entries, phase: state.phase };
  }
  state.seasonStarted = false;
  if (deathCheck(state, entries)) return { entries, phase: state.phase };
  if (state.season >= 3) {
    endYear(state, entries);
    return { entries, phase: state.phase };
  }
  state.season += 1;
  return { entries, phase: state.phase };
}

function warn(state, entries, text) {
  entries.push({ kind: 'warn', text });
  state.journal.push({ year: state.year, age: state.age, season: state.season, kind: 'warn', text });
}

function loadChecks(state, entries) {
  const ch = state.ch;
  const flagKey = (n) => `load${n}_${state.year}`;
  if (ch.load >= 90 && !state.flags[flagKey(90)] && EVENTS.evt_emergency_stabilize) {
    state.flags[flagKey(90)] = true;
    state.queue.unshift({ season: state.season, kind: 'pending', pid: '__load90' });
    state.pending.push({ id: '__load90', ev: 'evt_emergency_stabilize', due: state.year, roles: {}, tries: 0 });
  } else if (ch.load >= 75 && !state.flags[flagKey(75)]) {
    state.flags[flagKey(75)] = true;
    warn(state, entries, `공명부하 ${ch.load}. 손끝의 감각이 엇나가기 시작한다. 강한 사용은 사고를 부를 수 있다.`);
  } else if (ch.load >= 50 && !state.flags[flagKey(50)]) {
    state.flags[flagKey(50)] = true;
    warn(state, entries, `공명부하 ${ch.load}. 정밀한 일을 할 때 손이 무겁다.`);
  }
}

export function choose(state, choiceId, token) {
  const res = directorChoose(state, choiceId, token);
  if (res.ok) deathCheck(state, []);
  return res;
}

function deathCheck(state, entries) {
  if (state.age >= 18 && state.ch.health <= 0 && state.phase !== 'ended') {
    state.ch.alive = false;
    entries.push({ kind: 'death', text: '몸이 더는 버티지 못했다.' });
    buildEnding(state, 'death');
    return true;
  }
  return false;
}

function endYear(state, entries) {
  const ch = state.ch;
  const yl = state.yearLog;
  const hist = state.history;
  const actLog = yearEndActivities(state);
  const debtLog = yearEndDebts(state);
  yearEndCity(state);
  const promo = tryPromotion(state);
  publicRankUpdate(state);
  npcYearTick(state);

  // 장부
  yl.endCash = ch.cash;
  yl.net = ch.cash - yl.startCash;
  if (ch.independent) {
    if (yl.net < 0) { hist.deficitStreak += 1; hist.nonDeficitYears = 0; }
    else { hist.deficitStreak = 0; hist.nonDeficitYears = (hist.nonDeficitYears || 0) + 1; }
  }
  const prevClass = ch.lifeClass;
  ch.lifeClass = computeLifeClass(state);
  if (ch.independent) {
    if (prevClass === 0 && ch.lifeClass >= 1) hist.recoveredL0 = true;
    hist.l1Streak = ch.lifeClass >= 1 ? (hist.l1Streak || 0) + 1 : 0;
    hist.stableHousingYears = ch.lifeClass >= 1 ? hist.stableHousingYears + 1 : 0;
    const arrears = ch.cash < 0 || ch.debts.some(d => d.overdue);
    hist.noArrearsStreak = arrears ? 0 : (hist.noArrearsStreak || 0) + 1;
    if (yl.net < -20 || ch.cash < 0) { hist.lossStreak += 1; } else if (yl.net > 0) hist.lossStreak = Math.max(0, hist.lossStreak - 1);
  }
  if (ch.debts.length) { state.stats.debtEver = 1; state.stats.debtPeak = Math.max(state.stats.debtPeak || 0, totalDebt(state)); }
  hist.cashByYear.push([state.year, ch.cash]);

  const goalNotes = updateGoals(state);
  state.stats.yearsEnded = (state.stats.yearsEnded || 0) + 1;
  const ach = checkAchievements(state);

  // 결산 기록
  state.settlement = {
    year: state.year, age: state.age, plan: state.plan?.label, sub: state.plan?.sub, subUsed: state.plan?.subUsed,
    income: yl.income + yl.eventIncome, workIncome: yl.income, eventIncome: yl.eventIncome, expense: yl.expense + yl.spent, living: yl.expense, spent: yl.spent,
    net: yl.net, cash: ch.cash, debt: totalDebt(state),
    rel: aggregateRel(state, yl.relChanges), skills: [...yl.skillUps], city: yl.cityChanges.slice(-6), causes: [...yl.causes],
    events: yl.events, promotion: promo, goal: goalNotes, achievements: ach, actLog, debtLog,
    lifeClass: ch.lifeClass, publicRank: ch.publicRank,
  };
  state.journal.push({ year: state.year, age: state.age, season: 3, kind: 'yearEnd', text: summaryLine(state), net: yl.net });
  compactJournal(state);

  // 나이를 먹고 다음 해로
  state.year += 1;
  state.age += 1;
  agingEffects(state);
  if (naturalDeath(state)) { entries.push({ kind: 'death', text: '그해 겨울이 끝나기 전, 숨이 조용히 멎었다.' }); buildEnding(state, 'death'); return; }
  state.phase = 'yearEnd';
}

function aggregateRel(state, changes) {
  const by = {};
  for (const c of changes) {
    by[c.npc] = by[c.npc] || { npc: c.npc, name: state.npcs[c.npc]?.name, trust: 0, aff: 0, causes: [] };
    const m = c.text.match(/신뢰 ([+-]\d+)/); if (m) by[c.npc].trust += +m[1];
    const a = c.text.match(/호감 ([+-]\d+)/); if (a) by[c.npc].aff += +a[1];
    if (c.cause && !by[c.npc].causes.includes(c.cause)) by[c.npc].causes.push(c.cause);
  }
  return Object.values(by).filter(x => x.trust || x.aff);
}

function summaryLine(state) {
  const s = state.settlement;
  return `${state.age}세의 한 해. 수입 ${s.income}C · 지출 ${s.expense}C · 잔액 ${s.cash}C`;
}

function compactJournal(state) {
  const cutoff = state.year - 8;
  state.journal = state.journal.filter(j => j.year >= cutoff || !['daily', 'season', 'plan', 'warn'].includes(j.kind)).map(j => (j.year < cutoff && j.deltas ? { ...j, deltas: undefined } : j));
}

export function continueYear(state) {
  if (state.phase !== 'yearEnd') return false;
  startYear(state);
  return true;
}

function agingEffects(state) {
  const ch = state.ch;
  if (state.age === 60 || state.age === 70) { ch.attrs.body = Math.max(0, ch.attrs.body - 1); state.journal.push({ year: state.year, age: state.age, season: 0, kind: 'note', text: '계단을 오를 때 숨이 한 번 더 찬다. 몸이 예전 같지 않다.' }); }
  if (state.age >= 50) addStat(state, 'health', -(state.age >= 75 ? 3 : state.age >= 65 ? 2 : 1), null);
  if (ch.health > maxHealth(state)) ch.health = maxHealth(state);
}

function naturalDeath(state) {
  const ch = state.ch;
  if (state.age < 66) return false;
  const p = Math.max(0, state.age - 64) * 0.7 + (ch.health < 30 ? 4 : ch.health < 50 ? 1.5 : 0);
  const die = withRng(state, 'event', r => r.pct(Math.min(60, p)));
  if (die || state.age >= 100) { ch.alive = false; return true; }
  return false;
}

function npcYearTick(state) {
  for (const n of Object.values(state.npcs)) {
    if (!n.alive) continue;
    n.age += 1;
    if (n.core && n.age >= 66 && !n.retired) { n.retired = true; state.yearLog.causes.push(`${n.name}이 은퇴했다. 공개 업무는 후임이 잇는다.`); }
    if (n.age >= 60) {
      const p = (n.age - 58) * 0.6;
      if (withRng(state, 'city', r => r.pct(p))) {
        n.alive = false; state.deaths.push({ id: n.id, year: state.year });
        state.yearLog.causes.push(`${n.name}의 장례가 있었다. 함께 일했던 기계의 종이 울렸다.`);
        state.journal.push({ year: state.year, age: state.age, season: 3, kind: 'note', text: `${n.name}의 부고. 기계의 종이 세 번 울렸다.` });
        for (const d of n.duties) if (!d.done && !d.failed) d.waived = true;
        continue;
      }
    }
    // 만나지 못한 해에는 호감이 조금씩 옅어진다 (신뢰는 남는다)
    if (n.met && !n.metYears.includes(state.year) && Math.abs(n.affinity) > 20) n.affinity += n.affinity > 0 ? -1 : 1;
    for (const d of n.duties) {
      if (!d.done && !d.failed && !d.waived && state.year > d.due) {
        d.failed = true; state.stats.dutiesFailed = (state.stats.dutiesFailed || 0) + 1;
        changeRel(state, n, -10, -5, null, '약속을 지키지 못했다');
        state.yearLog.causes.push(`${shortName(n.name)}와의 약속 기한을 넘겼다: ${d.text}`);
      }
    }
  }
}

// ───────── 상점·대출·장비 (계획 단계에서만) ─────────
export function buy(state, id) {
  if (state.phase !== 'plan') return { ok: false, reason: '연초 계획 중에만 살 수 있다' };
  const it = ITEMS[id];
  if (!it || !SHOP.includes(id)) return { ok: false, reason: '없는 물건' };
  if (it.slot !== 'consumable' && state.ch.items.includes(id)) return { ok: false, reason: '이미 가지고 있다' };
  if (state.ch.cash < it.price) return { ok: false, reason: '돈이 부족하다' };
  state.ch.cash -= it.price;
  state.yearLog.startCash -= it.price;
  applyEffects(state, [{ t: 'item', id }], { cause: '구입' });
  state.journal.push({ year: state.year, age: state.age, season: 0, kind: 'note', text: `${it.name}을 ${it.price}C에 샀다.` });
  return { ok: true };
}

export function equip(state, id) {
  const it = ITEMS[id];
  if (!it || !state.ch.items.includes(id) || !['tool', 'guard', 'aux'].includes(it.slot)) return false;
  state.ch.equipment[it.slot] = id;
  return true;
}

export function loanOffers(state) {
  const ch = state.ch;
  if (!ch.independent) return [];
  const offers = [];
  const bankOk = ch.lifeClass >= 1 && !ch.debts.some(d => d.overdue) && totalDebt(state) < 120;
  offers.push({ id: 'bank', name: '시민 은행 대출', amount: 60, rate: 0.08, ok: bankOk, reason: bankOk ? '' : '자립 시민(L1) 이상, 연체 없음, 잔액 120C 미만일 때' });
  offers.push({ id: 'sera', name: '세라 바인의 긴급 자금', amount: 40, rate: 0.15, ok: totalDebt(state) < 200, reason: totalDebt(state) < 200 ? '' : '이미 빚이 너무 많다' });
  return offers;
}

export function takeLoan(state, id) {
  if (state.phase !== 'plan') return false;
  const o = loanOffers(state).find(x => x.id === id);
  if (!o || !o.ok) return false;
  applyEffects(state, [{ t: 'debt', lender: id === 'sera' ? 'sera' : 'bank', v: o.amount, rate: o.rate }], { cause: '대출' });
  state.yearLog.startCash += o.amount;
  if (id === 'sera') changeRel(state, state.npcs.sera, 2, 0, null, '돈을 빌렸다');
  state.journal.push({ year: state.year, age: state.age, season: 0, kind: 'note', text: `${o.name} ${o.amount}C를 빌렸다 (연 ${Math.round(o.rate * 100)}%).` });
  return true;
}

export function workshopOffer(state) {
  const ch = state.ch;
  if (!ch.independent || ch.workshop) return null;
  const skill = Math.max(ch.skills.repair, ch.skills.trade);
  return { price: 80, ok: ch.cash >= 80 && skill >= 2, reason: skill < 2 ? '수리 또는 상업 숙련 2가 필요하다' : ch.cash < 80 ? '시작 자금 80C가 필요하다 (저축, 대출, 동업)' : '' };
}

export function openWorkshop(state) {
  const o = workshopOffer(state);
  if (state.phase !== 'plan' || !o || !o.ok) return false;
  state.ch.cash -= 80;
  state.yearLog.startCash -= 80;
  applyEffects(state, [{ t: 'workshop', value: 80 }], { cause: '공방 개업' });
  state.journal.push({ year: state.year, age: state.age, season: 0, kind: 'note', text: '80C를 들여 작은 공방을 열었다. 간판에는 아직 페인트 냄새가 남아 있다.' });
  return true;
}

export function treatment(state) {
  if (state.phase !== 'plan') return false;
  const ch = state.ch;
  if (ch.cash < 15) return false;
  ch.cash -= 15; state.yearLog.startCash -= 15;
  addStat(state, 'load', -20, null); addStat(state, 'health', 6, null);
  state.journal.push({ year: state.year, age: state.age, season: 0, kind: 'note', text: '흰 종 병원가에서 공명 안정화 치료를 받았다 (15C). 공명부하 −20.' });
  return true;
}

export function canRetire(state) { return state.phase === 'plan' && state.age >= 55; }

export function retire(state) {
  if (!canRetire(state)) return false;
  buildEnding(state, 'retire');
  return true;
}

export { MAIN, estimateIncome, annualCost, totalDebt, promotionStatus };
