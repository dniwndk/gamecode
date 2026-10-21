// 최종 검수(self-check): 기존 완료 기준 밖에서 "진짜 끝까지 되나"를 의심하는 headless 감사.
// 무작위 플레이(퍼징)로 교착·예외·상태 오염·문장 오류·도달 불가 콘텐츠·성능을 잡는다.
// 사용법: node tests/audit.mjs [--quick]
import * as G from '../js/core/game.js';
import { playLife } from './play.mjs';
import { ITEMS, SHOP, JOBS, DISTRICTS, FACTIONS, RANKS, ABILITIES, GOALS } from '../js/data/world.js';
import { EVENTS } from '../js/data/events/index.js';
import { ACHIEVEMENTS, ENDINGS } from '../js/core/progress.js';
import { maxHealth } from '../js/core/rules.js';
import { nodeText } from '../js/core/director.js';
import { hasFinal, finalIsRieul, shortName } from '../js/core/util.js';
import { TRAITS } from '../js/core/traits.js';

const QUICK = process.argv.includes('--quick');
const N_FUZZ = QUICK ? 300 : 2000;
const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok: !!ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
}
const t0 = Date.now();

// 결정론적 작은 난수 (게임 난수와 섞이지 않게 따로 둔다)
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const pickR = (r, a) => a[Math.floor(r() * a.length)];

// ───────── 문장 검사 도구 ─────────
// 고유명사 뒤에 붙은 조사가 받침과 맞는지 본다. (예: "배관공로" ✗ → "배관공으로")
const WRONG = {
  final: ['가', '를', '는', '와', '로', '야', '다'],   // 받침 있는 말 뒤에 오면 틀린 꼴
  open: ['이', '을', '은', '과', '으로', '아', '이다'], // 받침 없는 말 뒤에 오면 틀린 꼴
};
const PARTICLE = '(이다|으로|이|가|을|를|은|는|과|와|로|아|야)';
function josaIssues(text, nouns) {
  const out = [];
  for (const n of nouns) {
    if (!n || text.indexOf(n) < 0) continue;
    const re = new RegExp(`(^|[^가-힣])${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}${PARTICLE}(?=[^가-힣]|$|의|도|만|에)`, 'g');
    let m;
    while ((m = re.exec(text))) {
      const p = m[2];
      const fin = hasFinal(n);
      let bad = fin ? WRONG.final.includes(p) : WRONG.open.includes(p);
      if (p === '로' && fin && finalIsRieul(n)) bad = false;     // ㄹ받침 + 로
      if (p === '다' || p === '야' || p === '아') bad = false;      // 문장 어미와 겹쳐 오탐이 많다
      if (fin && p === '이다') bad = false;
      if (bad) out.push(`${n}${p}`);
    }
  }
  return out;
}
const BAD_TOKENS = /undefined|NaN|\[object|null(?![가-힣])|\{(me|fullme|home|work|job|ability|year|age|@)[^}]*\}|Infinity/;
function collectStrings(o, out = [], depth = 0) {
  if (depth > 12 || o == null) return out;
  if (typeof o === 'string') out.push(o);
  else if (Array.isArray(o)) for (const x of o) collectStrings(x, out, depth + 1);
  else if (typeof o === 'object') for (const k in o) { if (k === 'rng') continue; collectStrings(o[k], out, depth + 1); }
  return out;
}
const STATIC_NOUNS = [
  ...Object.values(JOBS).map(j => j.name), ...Object.values(ITEMS).map(i => i.name), ...Object.values(DISTRICTS).map(d => d.name),
  ...Object.values(FACTIONS), ...RANKS, ...Object.values(ABILITIES).map(a => a.name),
];
function nounsOf(s) {
  const npc = Object.values(s.npcs).flatMap(n => [n.name, shortName(n.name)]);
  return [...new Set([...STATIC_NOUNS, s.ch.name, shortName(s.ch.name), ...npc])].sort((a, b) => b.length - a.length);
}

// ───────── 상태 불변식 ─────────
function invariantIssues(s) {
  const bad = [];
  (function walk(o, path, depth) {
    if (depth > 10 || o == null) return;
    if (typeof o === 'number' && !Number.isFinite(o)) bad.push(`${path}=${o}`);
    else if (typeof o === 'object') for (const k in o) { if (k === 'rng' && depth === 0) continue; walk(o[k], path + '.' + k, depth + 1); }
  })(s, 's', 0);
  const ch = s.ch;
  if (ch.health < 0 || ch.health > Math.max(maxHealth(s), 10)) bad.push(`health ${ch.health}/${maxHealth(s)}`);
  for (const k of ['stress', 'load']) if (ch[k] < 0 || ch[k] > 100) bad.push(`${k} ${ch[k]}`);
  if (!Number.isInteger(ch.cash)) bad.push(`cash ${ch.cash}`);
  for (const n of Object.values(s.npcs)) if (n.trust < 0 || n.trust > 100 || n.affinity < -100 || n.affinity > 100) bad.push(`npc ${n.id} ${n.trust}/${n.affinity}`);
  for (const [f, v] of Object.entries(s.rep)) if (v < -100 || v > 100) bad.push(`rep ${f} ${v}`);
  for (const [k, v] of Object.entries(s.city.global)) if (k !== 'price' && (v < 0 || v > 100)) bad.push(`city ${k} ${v}`);
  for (const [d, o] of Object.entries(s.city.districts)) for (const [k, v] of Object.entries(o)) if (typeof v === 'number' && (v < 0 || v > 100)) bad.push(`district ${d}.${k} ${v}`);
  for (const d of ch.debts) if (!(d.principal > 0)) bad.push(`debt ${d.principal}`);
  for (const t of ch.traits || []) if (!TRAITS[t.id]) bad.push(`trait ${t.id}`);
  return bad;
}

// ───────── 무작위 플레이 (퍼징) ─────────
// 매 장면 고를 수 있는 것 가운데 아무거나 고르고, 계획 단계에선 상점·대출·장비·치료·공방·목표 변경·은퇴를 섞어 누른다.
function fuzzLife(seed, r, sink) {
  const s = G.createGame(seed, r() < 0.3 ? { name: pickR(r, ['한결', '미라', '로반', '은별', '도윤', '하늘 바람']) } : undefined);
  let guard = 0, planCount = 0, eventCount = 0;
  const texts = [];
  while (s.phase !== 'ended' && guard++ < 30000) {
    switch (s.phase) {
      case 'childhood': {
        const sc = G.childhoodScene(s);
        if (!sc || !sc.choices.length) throw new Error('유년기 장면에 선택지가 없다');
        texts.push(sc.text, ...sc.choices.map(c => c.label));
        G.chooseChildhood(s, pickR(r, sc.choices).id);
        break;
      }
      case 'goal': G.chooseGoal(s, pickR(r, s.goalCandidates)); break;
      case 'plan': {
        planCount++;
        const po = G.planOptions(s);
        const ok = po.mains.filter(o => !o.disabled);
        if (!ok.length) throw new Error(`교착: 고를 수 있는 주 활동이 없다 (age ${s.age})`);
        texts.push(...po.mains.flatMap(m => [m.name, m.desc, m.disabled || '']));
        // 부수 행동
        const k = Math.floor(r() * 4);
        for (let i = 0; i < k; i++) {
          const a = Math.floor(r() * 9);
          if (a === 0) G.buy(s, pickR(r, SHOP));
          else if (a === 1 && s.ch.items.length) G.equip(s, pickR(r, s.ch.items));
          else if (a === 2) { const lo = G.loanOffers(s).filter(o => o.ok); if (lo.length && r() < 0.5) G.takeLoan(s, pickR(r, lo).id); }
          else if (a === 3) G.openWorkshop(s);
          else if (a === 4) G.treatment(s);
          else if (a === 5 && r() < 0.15) G.changeGoal(s, pickR(r, Object.keys(GOALS).filter(g => ['G01', 'G03', 'G07', 'G12'].includes(g))));
          else if (a === 6 && s.brief.insolvency?.length) G.useInsolvencyPath(s, pickR(r, s.brief.insolvency).id);
        }
        texts.push(...G.loanOffers(s).flatMap(o => [o.name, o.note, o.reason]), G.workshopOffer(s)?.reason || '');
        if (G.canRetire(s) && r() < 0.06) { G.retire(s); break; }
        const po2 = G.planOptions(s);
        const ok2 = po2.mains.filter(o => !o.disabled);
        const m = pickR(r, ok2);
        const sub = po2.forcedSub || pickR(r, po2.subs).id;
        if (!G.submitPlan(s, m.id, m.target || null, sub)) throw new Error(`계획 거부 ${m.id}:${m.target} ${sub}`);
        break;
      }
      case 'running': G.advance(s); break;
      case 'event': {
        eventCount++;
        const cs = G.getChoices(s);
        const ok = cs.filter(c => !c.disabled);
        if (!ok.length) throw new Error(`교착: 사건 ${s.current.eventId} 노드 ${s.current.node}에 고를 선택지가 없다`);
        texts.push(nodeText(s) || '', ...cs.flatMap(c => [c.label, c.hint, c.failHint, c.disabled || '', ...(c.cost || [])]));
        // 잘못된 입력은 조용히 거절되어야 한다
        const bogus = G.choose(s, '__nope__', s.current.token);
        if (bogus.ok) throw new Error('없는 선택지가 받아들여졌다');
        const locked = cs.find(c => c.disabled);
        if (locked) { const rr = G.choose(s, locked.id, s.current.token); if (rr.ok) throw new Error(`막힌 선택지가 받아들여졌다 ${s.current?.eventId}:${locked.id}`); }
        const pick = pickR(r, ok);
        const res = G.choose(s, pick.id, s.current.token);
        if (!res.ok) throw new Error(`선택 실패 ${s.current?.eventId}:${pick.id} ${res.reason}`);
        break;
      }
      case 'yearEnd': {
        texts.push(...collectStrings(s.settlement));
        const inv = invariantIssues(s);
        if (inv.length) sink.inv.push(`${seed} age ${s.age}: ${inv.slice(0, 3).join(', ')}`);
        sink.maxSave = Math.max(sink.maxSave, JSON.stringify(s).length);
        G.continueYear(s);
        texts.push(...collectStrings(s.brief));
        break;
      }
      default: throw new Error('알 수 없는 단계 ' + s.phase);
    }
  }
  if (guard >= 30000) throw new Error('무한 루프');
  texts.push(...collectStrings(s.ending), ...collectStrings(s.journal), ...collectStrings(s.city.news));
  return { s, texts, planCount, eventCount };
}

{
  const sink = { inv: [], maxSave: 0 };
  const errors = [], josaBad = new Map(), tokenBad = new Map();
  const endingsSeen = new Set(), achSeen = new Set(), eventsSeen = new Set(), goalsDone = new Set();
  const ends = { retire: 0, death: 0, other: 0 };
  let ages = 0, maxAge = 0, minAge = 999, plans = 0;
  const tf = Date.now();
  for (let i = 0; i < N_FUZZ; i++) {
    const seed = 'fuzz-' + i;
    const r = mulberry(i * 7919 + 13);
    try {
      const { s, texts, planCount } = fuzzLife(seed, r, sink);
      plans += planCount;
      ages += s.age; maxAge = Math.max(maxAge, s.age); minAge = Math.min(minAge, s.age);
      ends[s.ending?.type in ends ? s.ending.type : 'other']++;
      if (s.ending?.main) endingsSeen.add(s.ending.main.id);
      for (const x of s.ending?.extras || []) endingsSeen.add(x.id);
      for (const a of s.achievements) achSeen.add(a);
      for (const k of Object.keys(s.flags)) if (k.startsWith('goalDone_')) goalsDone.add(k.slice(9));
      for (const j of s.journal) if (j.kind === 'event' && j.eventId) eventsSeen.add(j.eventId);
      for (const k of Object.keys(s.uniq || {})) if (EVENTS[k.split(':')[0]]) eventsSeen.add(k.split(':')[0]);
      const nouns = nounsOf(s);
      for (const t of texts) {
        if (!t || typeof t !== 'string') continue;
        if (BAD_TOKENS.test(t)) { const m = t.match(BAD_TOKENS)[0]; if (!tokenBad.has(m)) tokenBad.set(m, t.slice(0, 90)); }
        for (const b of josaIssues(t, nouns)) if (!josaBad.has(b)) josaBad.set(b, t.slice(0, 90));
      }
    } catch (e) { errors.push(`${seed}: ${e.message}`); }
  }
  const secs = (Date.now() - tf) / 1000;
  check(`무작위 플레이 ${N_FUZZ}회: 예외·교착·무한 루프 0건`, errors.length === 0, errors.slice(0, 3).join(' | ') || `${secs.toFixed(1)}초 · 평균 수명 ${(ages / N_FUZZ).toFixed(1)}세 (${minAge}~${maxAge}) · 은퇴 ${ends.retire} · 사망 ${ends.death}`);
  check('무작위 플레이: 상태 불변식 (NaN·범위·정수 현금·빚 잔액) 위반 0건', sink.inv.length === 0, sink.inv.slice(0, 3).join(' | '));
  check('무작위 플레이: 화면 문장에 undefined·NaN·풀리지 않은 {토큰} 0건', tokenBad.size === 0, [...tokenBad].slice(0, 3).map(([k, v]) => `${k} ← "${v}"`).join(' | '));
  check('무작위 플레이: 고유명사 뒤 조사(이/가·을/를·은/는·과/와·으로/로) 오류 0건', josaBad.size === 0, [...josaBad].slice(0, 60).map(([k, v]) => `${k} ← "${v}"`).join(' | '));
  check('무작위 플레이: 저장 크기 최대 ≤ 200KB', sink.maxSave <= 200 * 1024, `${(sink.maxSave / 1024).toFixed(1)}KB`);
  const perYear = secs * 1000 / Math.max(1, plans);
  check('1년 처리 ≤ 5ms (무작위 플레이 평균)', perYear <= 5, `${perYear.toFixed(2)}ms/년`);

  // 도달 가능성: 만들어 둔 콘텐츠가 실제로 열리는가 (함정 B의 텍스트 게임판: 조건이 성립하지 않아 영영 닿지 않는 끝)
  const extra = new Set([...endingsSeen]);
  const ach2 = new Set(achSeen), goals2 = new Set(goalsDone);
  for (const pol of ['safe', 'skill', 'social', 'risky']) for (let i = 0; i < (QUICK ? 120 : 400); i++) {
    const { s } = playLife(`reach-${pol}-${i}`, pol, { retireAt: 60 + (i % 10) });
    if (s.ending?.main) extra.add(s.ending.main.id);
    for (const x of s.ending?.extras || []) extra.add(x.id);
    for (const a of s.achievements) ach2.add(a);
    for (const k of Object.keys(s.flags)) if (k.startsWith('goalDone_')) goals2.add(k.slice(9));
  }
  const missEnd = Object.keys(ENDINGS).filter(k => !extra.has(k));
  const missAch = ACHIEVEMENTS.filter(a => !ach2.has(a.id)).map(a => `${a.id} ${a.name}`);
  const missGoal = ['G01', 'G03', 'G07', 'G12'].filter(g => !goals2.has(g));
  check(`엔딩 ${Object.keys(ENDINGS).length}종이 모두 실제 플레이에서 나온다`, missEnd.length === 0, missEnd.join(', ') || [...extra].join(', '));
  check(`업적 ${ACHIEVEMENTS.length}개가 모두 실제 플레이에서 달성된다`, missAch.length === 0, missAch.join(', ') || `${ach2.size}/${ACHIEVEMENTS.length}`);
  check('목표 후보 4종(G01·G03·G07·G12)이 모두 완성될 수 있다', missGoal.length === 0, missGoal.join(', ') || [...goals2].join(', '));
}

// 같은 시드라도 이름만 바꾸면 다른 인물·출생 결과는 그대로다 (이름 입력이 난수를 흔들지 않는다)
{
  const a = G.createGame('name-seed'), b = G.createGame('name-seed', { name: '은별' });
  const strip = s => JSON.stringify({ ...s.ch, name: 0 }) + JSON.stringify(Object.values(s.npcs).map(n => n.name));
  check('이름만 바꿔도 출생 결과·인물 이름은 같다', strip(a) === strip(b) && b.ch.name === '은별');
}

const pass = results.filter(r => r.ok).length;
console.log(`\n${pass}/${results.length} 통과 · ${((Date.now() - t0) / 1000).toFixed(1)}초`);
process.exit(pass === results.length ? 0 : 1);
