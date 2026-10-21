// 완료 기준 (H)·(U) 항목을 Node에서 검증한다. 사용법: node tests/sim.test.mjs [--quick]
import * as G from '../js/core/game.js';
import { playLife, POLICIES } from './play.mjs';
import { computeChance, setJob } from '../js/core/rules.js';
import { eventWeight } from '../js/core/director.js';
import { EVENTS } from '../js/data/events/index.js';
import { BACKGROUNDS, APTITUDES, ITEMS } from '../js/data/world.js';
import { deepClone } from '../js/core/util.js';

const QUICK = process.argv.includes('--quick');
const N_LIVES = QUICK ? 1000 : 10000;
const N_BIRTH = QUICK ? 20000 : 100000;
const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
}
const t0 = Date.now();

// ───────── 출생과 재현성 ─────────
{
  const a = playLife('det-seed-A', 'skill', { stopAtAge: 53 }).s;
  const b = playLife('det-seed-A', 'skill', { stopAtAge: 53 }).s;
  check('같은 시드·같은 선택 40년 → 상태 JSON 바이트 동일', JSON.stringify(a) === JSON.stringify(b) && a.age === 53, `age ${a.age}, ${JSON.stringify(a).length}B`);

  // 저장(직렬화) 후 이어 하기가 중단 없이 진행한 결과와 같다: 판정이 다시 굴려지지 않는다
  const full = playLife('det-seed-B', 'social', { stopAtAge: 40 }).s;
  const half = playLife('det-seed-B', 'social', { stopAtAge: 30 }).s;
  const restored = JSON.parse(JSON.stringify(half));
  const cont = continueLife(restored, 'social', 40);
  check('저장 → 불러오기 → 이어 하기 결과가 중단 없는 진행과 동일', JSON.stringify(cont) === JSON.stringify(full));
}

{
  const bgCount = Object.fromEntries(Object.keys(BACKGROUNDS).map(k => [k, 0]));
  let none = 0, attrBad = 0, mainBad = 0;
  for (let i = 0; i < N_BIRTH; i++) {
    const s = G.createGame('birth-' + i);
    bgCount[s.ch.background]++;
    if (!s.ch.ability) none++;
    if (i < 10000) {
      const v = Object.values(s.ch.attrs);
      if (v.reduce((x, y) => x + y, 0) !== 24 || v.some(x => x < 2 || x > 6)) attrBad++;
      if (s.ch.attrs[APTITUDES[s.ch.aptitude].attr] < 5) mainBad++;
    }
  }
  const total = Object.values(BACKGROUNDS).reduce((x, b) => x + b.w, 0);
  const devs = Object.entries(bgCount).map(([k, n]) => [k, Math.abs(n / N_BIRTH * 100 - BACKGROUNDS[k].w / total * 100)]);
  const maxDev = Math.max(...devs.map(d => d[1]));
  check(`${N_BIRTH}회 출생: 기본 배경 비율 ±0.5%p 이내`, maxDev <= 0.5, `최대 편차 ${maxDev.toFixed(3)}%p`);
  const nonePct = none / N_BIRTH * 100;
  check(`${N_BIRTH}회 출생: 비발현 85±0.5%`, Math.abs(nonePct - 85) <= 0.5, `${nonePct.toFixed(2)}%`);
  check('1만 시드: 능력치 합 24 · 각 2~6 · 주 자질 ≥ 5', attrBad === 0 && mainBad === 0, `위반 ${attrBad}/${mainBad}`);
}

// ───────── 한 해의 루프 ─────────
{
  const s = G.createGame('chance-test');
  Object.assign(s.ch.attrs, { craft: 6 });
  s.ch.skills.repair = 2;
  s.ch.items = ['tool_basic']; s.ch.equipment = { tool: 'tool_basic', guard: null, aux: null };
  s.ch.stress = 20; s.ch.health = 80; s.ch.load = 0;
  const { chance, parts } = computeChance(s, { attr: 'craft', diff: 6, skill: 'repair', prep: 5 });
  check('기교 6·난도 6·수리 2·공구 +5·준비 +5 → 76%', chance === 76 && ITEMS.tool_basic.bonus.repair === 5, `${chance}% ${JSON.stringify(parts)}`);
}
{
  // 같은 토큰으로 두 번 선택해도 비용은 한 번만
  let s = null;
  for (let i = 0; i < 300 && !s; i++) {
    const x = G.createGame('dbl-' + i);
    const life = runUntil(x, 'skill', st => st.phase === 'event' && G.getChoices(st).some(c => c.cost.length && !c.disabled && /C$/.test(c.cost[0])));
    if (life) s = life;
  }
  if (!s) check('선택 두 번 눌러도 비용 1회만 차감', false, '비용 있는 선택지를 찾지 못함');
  else {
    const c = G.getChoices(s).find(x => x.cost.length && !x.disabled && /C$/.test(x.cost[0]));
    const token = s.current.token;
    const before = s.ch.cash;
    const r1 = G.choose(s, c.id, token);
    const afterFirst = s.ch.cash;
    const r2 = G.choose(s, c.id, token);
    check('선택 두 번 눌러도 비용 1회만 차감', r1.ok && !r2.ok && s.ch.cash === afterFirst, `${before} → ${afterFirst}, 두 번째 ${r2.reason}`);
  }
}

// ───────── 경제와 생존 ─────────
{
  const s = playLife('econ-24', 'safe', { stopAtAge: 18 }).s;
  s.ch.home = 'brass'; s.ch.cash = 50; s.ch.debts = []; s.ch.workshop = null;
  setJob(s, 'plumber', 0, null);
  s.city.global.price = 100; s.city.districts.brass.jobs = 60; s.city.factions.union.striking = false;
  s.city.supplyBase = 130; s.city.clocks.supplyChain = 0; s.city.blackout = null; s.flags.tempShelter = null;
  G.startYear(s);
  s.city.global.price = 100;
  const start = s.ch.cash;
  G.submitPlan(s, 'work', null, 'rest');
  s.schedule = []; // 평온한 해: 사건과 일상 기록이 없다
  let guard = 0;
  while (s.phase === 'running' && guard++ < 50) { s.city.global.price = 100; G.advance(s); }
  const net = s.ch.cash - start;
  check('18세 독립 · 평온한 해 · 비숙련 배관공 → 연말 현금 정확히 +24C', s.phase === 'yearEnd' && net === 24, `순변화 ${net}C (수입 ${s.settlement.income} · 생계비 ${s.settlement.living})`);
}
{
  const s = playLife('insolvent', 'safe', { stopAtAge: 20 }).s;
  s.ch.cash = 0;
  s.ch.debts = [{ id: 'dx', lender: 'bank', principal: 100, original: 100, rate: 0.08, overdue: 0, since: s.year }];
  const mains = G.planOptions(s).mains.filter(m => !m.disabled);
  const paths = G.insolvencyPaths(s);
  check('현금 0 · 부채 100C 주입: 선택 가능한 기본 행동 ≥1, 지급 불능 경로 ≥2', mains.length >= 1 && paths.length >= 2, `행동 ${mains.length} · 경로 ${paths.map(p => p.id).join(',')}`);
}

// ───────── 대량 시뮬레이션: 완주·사망률·사건 반복·연속 사건·엔딩 ─────────
const lifeStats = { errors: [], early: 0, repeats: 0, chainSeen: 0, chainBad: [], nonAbilityEndings: new Set(), maxEndingsOneLife: 0, eventIds: new Set(), deltaViolations: 0 };
function scanLife(s) {
  const ev = s.journal.filter(j => j.kind === 'event');
  const last = {};
  for (const e of ev) {
    if (last[e.eventId] != null && e.year - last[e.eventId] < 5 && !EVENTS[e.eventId]?.chainOnly) lifeStats.repeats++;
    last[e.eventId] = e.year;
    lifeStats.eventIds.add(e.eventId);
  }
  const yr = (id) => ev.find(e => e.eventId === id)?.year;
  const a1 = yr('evt_heater_last_pressure'), a2 = yr('evt_heat_bypass'), a4 = yr('evt_boiler_decision');
  if (a2 != null) {
    if (a1 == null || a2 <= a1) lifeStats.chainBad.push(`②가 ① 없이: ${s.seed}`);
    const witness = s.journal.some(j => j.kind === 'result' && j.eventId === 'evt_heat_bypass' && j.node === 'witness');
    if (a4 != null) {
      lifeStats.chainSeen++;
      if (a4 - a2 < 2 || a4 - a2 > 4) lifeStats.chainBad.push(`④-② = ${a4 - a2}년: ${s.seed}`);
      if (!witness) lifeStats.chainBad.push(`③ 없이 ④: ${s.seed}`);
    }
  }
}

{
  const t = Date.now();
  for (let i = 0; i < N_LIVES; i++) {
    const seed = 'life-' + i;
    try {
      const { s } = playLife(seed, 'safe');
      if (s.phase !== 'ended') throw new Error('끝나지 않음');
      const deathAge = s.ending.type === 'death' ? s.age : null;
      if (deathAge != null && deathAge < 23) lifeStats.early++;
      scanLife(s);
      if (!s.ch.ability && s.ending.main) lifeStats.nonAbilityEndings.add(s.ending.main.id);
      if (!s.ch.ability) for (const x of s.ending.extras) lifeStats.nonAbilityEndings.add(x.id);
      if (!s.ch.ability) lifeStats.maxEndingsOneLife = Math.max(lifeStats.maxEndingsOneLife, (s.ending.main ? 1 : 0) + s.ending.extras.length);
    } catch (e) { lifeStats.errors.push(`${seed}: ${e.message}`); }
  }
  const secs = (Date.now() - t) / 1000;
  check(`${N_LIVES} 시드 안전 정책: 13세 → 결산 전부 완주`, lifeStats.errors.length === 0, `오류 ${lifeStats.errors.length}${lifeStats.errors[0] ? ' · ' + lifeStats.errors[0] : ''} · ${secs.toFixed(1)}초`);
  check(`${N_LIVES} 시드 안전 정책: 성인 시작 후 5년 내 사망률 < 1%`, lifeStats.early / N_LIVES < 0.01, `${lifeStats.early}명 (${(lifeStats.early / N_LIVES * 100).toFixed(2)}%)`);
  check(`${N_LIVES} 시드 전체 생애 headless ≤ 120초 (1만 기준)`, secs * (10000 / N_LIVES) <= 120, `${(secs * 10000 / N_LIVES).toFixed(1)}초 환산`);
}
{
  // 다른 정책들도 완주하는지 (위험 추구 포함)
  const errs = [];
  const per = QUICK ? 150 : 1000;
  for (const pol of ['skill', 'social', 'risky']) {
    for (let i = 0; i < per; i++) {
      try { const { s } = playLife(`${pol}-${i}`, pol); scanLife(s); if (!s.ch.ability && s.ending.main) lifeStats.nonAbilityEndings.add(s.ending.main.id); } catch (e) { errs.push(`${pol}-${i}: ${e.message}`); }
    }
  }
  check(`다른 정책 3종 × ${per} 시드 완주`, errs.length === 0, errs[0] || '');
}
check('같은 사건 ID가 5년 안에 다시 나온 경우 0건', lifeStats.repeats === 0, `${lifeStats.repeats}건`);
check('연속 사건 A: ①→②→③→④, ④는 ② 뒤 2~4년', lifeStats.chainSeen > 0 && lifeStats.chainBad.length === 0, `완결 ${lifeStats.chainSeen}회${lifeStats.chainBad.length ? ' · ' + lifeStats.chainBad.slice(0, 3).join(' / ') : ''}`);
check('비발현 비전투 정책으로 엔딩 3종 이상 도달', lifeStats.nonAbilityEndings.size >= 3, `${[...lifeStats.nonAbilityEndings].join(', ')} · 한 삶 최대 ${lifeStats.maxEndingsOneLife}개`);
check('사건 34종이 모두 한 번 이상 등장', lifeStats.eventIds.size >= Object.keys(EVENTS).length, `${lifeStats.eventIds.size}/${Object.keys(EVENTS).length}`);

// ───────── 사건과 결과: 주입 시험 ─────────
{
  // 예약 사건의 담당 인물이 죽으면 편지·유품으로 마무리
  const s = playLife('pending-death', 'safe', { stopAtAge: 25 }).s;
  s.npcs.p_friend.alive = false;
  s.pending.push({ id: 'ptest', ev: 'evt_guarantee_result', due: s.year, cause: 'test', roles: { friend: 'p_friend' }, invalid: '보증 정리 통지가 왔다.', tries: 0, season: 0 });
  const opts = G.planOptions(s); const m = opts.mains.find(x => !x.disabled);
  G.submitPlan(s, m.id, m.target || null, 'rest');
  let started = false, guard = 0;
  while (s.phase !== 'yearEnd' && s.phase !== 'ended' && guard++ < 200) {
    if (s.phase === 'event') { if (s.current.eventId === 'evt_guarantee_result') started = true; const c = G.getChoices(s).find(x => !x.disabled); G.choose(s, c.id, s.current.token); }
    else G.advance(s);
  }
  const letter = s.journal.find(j => j.kind === 'letter' && j.eventId === 'evt_guarantee_result');
  check('예약 사건의 담당 인물이 죽으면 편지·유품으로 기록', !started && !!letter && !s.pending.some(p => p.id === 'ptest'), letter ? letter.text.slice(0, 40) + '…' : '편지 없음');
}
{
  const base = playLife('load-test', 'safe', { stopAtAge: 22 }).s;
  const m = G.planOptions(base).mains.find(x => !x.disabled);
  G.submitPlan(base, m.id, m.target || null, 'network');
  const tryLoad = (v) => { const s = deepClone(base); s.ch.load = v; s.schedule = []; s.queue = []; const r = G.advance(s); return { s, r }; };
  const l50 = tryLoad(52), l75 = tryLoad(77), l90 = tryLoad(92);
  const w50 = l50.r.entries.some(e => e.kind === 'warn' && /정밀/.test(e.text));
  const w75 = l75.r.entries.some(e => e.kind === 'warn' && /사고/.test(e.text));
  const e90 = l90.s.phase === 'event' && l90.s.current.eventId === 'evt_emergency_stabilize';
  check('공명부하 50·75·90 → 경고 · 사고 위험 · 비상 안정화 사건', w50 && w75 && e90, `${w50}/${w75}/${e90}`);
}

// ───────── 도시 ─────────
{
  const s = G.createGame('rest-only');
  const startCity = JSON.stringify(s.city.global);
  let guard = 0, prev = null, viol = 0, worst = 0;
  const snap = () => ({ ...s.city.global, ...Object.fromEntries(Object.entries(s.city.districts).flatMap(([d, v]) => Object.entries(v).map(([k, x]) => [d + '.' + k, x]))) });
  while (s.phase !== 'ended' && s.age < 34 && guard++ < 5000) {
    if (s.phase === 'childhood') G.chooseChildhood(s, G.childhoodScene(s).choices[0].id);
    else if (s.phase === 'goal') G.chooseGoal(s, s.goalCandidates[0]);
    else if (s.phase === 'plan') {
      const ms = G.planOptions(s).mains;
      const m = ms.find(x => x.id === 'recover') || ms.find(x => x.id === 'm_family');
      G.submitPlan(s, m.id, null, 'rest');
    } else if (s.phase === 'running') {
      if (!s.seasonStarted) { const now = snap(); if (prev) for (const k in now) { const d = Math.abs(now[k] - prev[k]); worst = Math.max(worst, d); if (d > 6) viol++; } prev = now; }
      G.advance(s);
    } else if (s.phase === 'event') { const c = G.getChoices(s).find(x => !x.disabled && !x.irreversible) || G.getChoices(s).find(x => !x.disabled); G.choose(s, c.id, s.current.token); }
    else if (s.phase === 'yearEnd') G.continueYear(s);
  }
  const years = new Set(s.city.news.map(n => n.year));
  const changed = JSON.stringify(s.city.global) !== startCity;
  check('휴식만 20년: 도시 지표와 세력 계획이 변하고 신문에 보도', changed && years.size >= 20 && s.age >= 33, `보도된 해 ${years.size} · 지표 변화 ${changed}`);
  check('어떤 지표도 한 계절에 ±6을 넘게 변하지 않는다', viol === 0, `위반 ${viol} · 최대 ${worst}`);
}
{
  const s = playLife('blackout-w', 'safe', { stopAtAge: 25 }).s;
  const def = EVENTS.evt_blackout_priority;
  s.city.clocks.supplyChain = 1;
  s.city.shortage = 0.02; const w1 = eventWeight(s, def);
  s.city.shortage = 0.06; const w2 = eventWeight(s, def);
  check('공급 부족률 0.05 초과 → 정전 사건 가중치 상승', w2 > w1, `${w1.toFixed(1)} → ${w2.toFixed(1)}`);
}

const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} 통과 · ${((Date.now() - t0) / 1000).toFixed(1)}초`);
process.exit(failed.length ? 1 : 0);

// ───────── 도우미 ─────────
function continueLife(s, pol, stopAge) {
  const P = POLICIES[pol];
  let guard = 0;
  while (s.phase !== 'ended' && guard++ < 20000) {
    if (s.phase === 'plan' && s.age >= stopAge) break;
    stepWith(s, P);
  }
  return s;
}
function runUntil(s, pol, pred, maxSteps = 5000) {
  const P = POLICIES[pol];
  for (let i = 0; i < maxSteps && s.phase !== 'ended'; i++) {
    if (pred(s)) return s;
    stepWith(s, P);
  }
  return null;
}
function stepWith(s, P) {
  switch (s.phase) {
    case 'childhood': G.chooseChildhood(s, P.childhood(G.childhoodScene(s))); break;
    case 'goal': G.chooseGoal(s, P.goal(s.goalCandidates)); break;
    case 'plan': {
      if (s.brief.insolvency?.length && s.ch.cash < 0 && !s.flags['insolvency_mutual_aid']) G.useInsolvencyPath(s, 'mutual_aid');
      const po = G.planOptions(s);
      let [m, sub] = P.plan(s, po);
      if (!m || m.disabled) m = po.mains.find(o => !o.disabled);
      if (po.forcedSub) sub = po.forcedSub;
      G.submitPlan(s, m.id, m.target || null, sub);
      break;
    }
    case 'running': G.advance(s); break;
    case 'event': { const cs = G.getChoices(s); const c = P.choose(s, cs) || cs[0]; const pick = c.disabled ? cs.find(x => !x.disabled) : c; G.choose(s, pick.id, s.current.token); break; }
    case 'yearEnd': G.continueYear(s); break;
  }
}
