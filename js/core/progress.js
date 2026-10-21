// 개인 목표·업적·엔딩. 판정은 확정된 상태와 기록만 사용한다.
import { GOALS, JOBS, LIFE_CLASSES, PUBLIC_RANKS, SKILLS, ABILITIES, ABILITY_STAGES, DISTRICTS } from '../data/world.js';
import { withRng } from './rng.js';
import { shortName } from './util.js';
import { totalDebt } from './economy.js';
import { applyEffects, fmt } from './rules.js';

// ───────── 개인 목표 ─────────
export function goalCandidates(state) {
  const ch = state.ch;
  const life = withRng(state, 'birth', r => r.pick(['G01', 'G12']));
  const tie = ch.home === 'ash' || state.npcs.toma.met ? 'G07' : 'G03';
  const rest = ['G01', 'G03', 'G07', 'G12'].filter(g => g !== life && g !== tie);
  const strange = withRng(state, 'birth', r => r.pick(rest));
  return [life, tie, strange];
}

export function setGoal(state, id) {
  if (!GOALS[id]) return;
  state.goalProgress = state.goalProgress || {};
  if (state.goal) state.goal.history.push({ id: state.goal.id, year: state.year });
  state.goal = { id, since: state.year, history: state.goal ? state.goal.history : [] };
  if (state.goalProgress[id] == null) state.goalProgress[id] = 0;
}

const STAGE_CHECKS = {
  G01: [
    s => (s.stats.g_housingInfo || 0) >= 2,
    s => s.ch.independent && s.ch.lifeClass >= 1 && s.ch.cash >= 24,
    s => s.history.stableHousingYears >= 5,
  ],
  G02: [
    s => s.ch.debts.length > 0 || (s.stats.debtEver || 0) > 0,
    s => (s.stats.debtEver || 0) > 0 && totalDebt(s) <= (s.stats.debtPeak || 0) / 2,
    s => (s.stats.debtEver || 0) > 0 && s.ch.debts.length === 0,
  ],
  G03: [
    s => Object.keys(JOBS).some(j => s.flags['apprenticeDone_' + j]) || (s.ch.job && s.ch.job.rank >= 1),
    s => Math.max(s.ch.skills.repair, s.ch.skills.trade, s.ch.skills.record) >= 3,
    s => Math.max(s.ch.skills.repair, s.ch.skills.trade, s.ch.skills.record) >= 4 && (s.stats.signatureWorks || 0) >= 3,
  ],
  G07: [
    s => (s.stats.g_survey || 0) >= 1,
    s => !!s.flags.project_ash_boiler,
    s => s.flags.project_ash_boiler && s.year - s.flags.project_ash_boiler >= 3 && s.city.districts.ash.heat >= 45,
  ],
  G12: [
    s => new Set(s.history.mains).size >= 3,
    s => Object.values(s.npcs).filter(n => n.alive && n.trust >= 40).length >= 3,
    s => s.history.leisureSince != null && s.history.leisureYears - s.history.leisureSince >= 5,
  ],
};

const STAGE_REWARDS = {
  G01: [[{ t: 'note', text: '주거 상담소의 대기 명단에 이름을 올렸다.' }], [{ t: 'stat', k: 'stress', v: -8 }], [{ t: 'flag', k: 'warmWindow' }, { t: 'stat', k: 'stress', v: -10 }]],
  G02: [[{ t: 'note', text: '채무 명세서를 처음부터 끝까지 읽었다.' }], [{ t: 'debtRelief', rate: 0.08 }], [{ t: 'rep', f: 'office', v: 5 }, { t: 'stat', k: 'stress', v: -10 }]],
  G03: [[{ t: 'item', id: 'tool_basic' }], [{ t: 'rel', who: 'p_master', trust: 6, aff: 4 }], [{ t: 'flag', k: 'signatureMark' }, { t: 'rep', f: 'guild', v: 6 }]],
  G07: [[{ t: 'rel', who: 'toma', trust: 5, aff: 3 }], [{ t: 'rep', f: 'mutual', v: 8 }], [{ t: 'flag', k: 'ashOwnership' }, { t: 'district', d: 'ash', k: 'safety', v: 3 }]],
  G12: [[{ t: 'stat', k: 'stress', v: -6 }], [{ t: 'stat', k: 'stress', v: -10 }], [{ t: 'flag', k: 'chosenDay' }, { t: 'stat', k: 'health', v: 5 }]],
};

export function updateGoals(state) {
  if (!state.goal) return [];
  const out = [];
  state.goalProgress = state.goalProgress || {};
  const id = state.goal.id;
  // 활성 목표만 단계 보상을 준다. 이미 했던 행동은 새 목표에도 실적으로 인정된다.
  let st = state.goalProgress[id] || 0;
  while (st < 3 && STAGE_CHECKS[id][st](state)) {
    if (id === 'G12' && st === 1) state.history.leisureSince = state.history.leisureYears;
    const key = `goalReward:${id}:${st}`;
    if (!state.uniq[key]) {
      state.uniq[key] = true;
      applyEffects(state, STAGE_REWARDS[id][st], { cause: GOALS[id].name });
    }
    out.push(`목표 「${GOALS[id].name}」 ${st + 1}단계 완료: ${GOALS[id].stages[st]}`);
    st++;
  }
  state.goalProgress[id] = st;
  if (st === 3 && !state.flags['goalDone_' + id]) { state.flags['goalDone_' + id] = state.year; out.push(`목표 「${GOALS[id].name}」 완성. ${GOALS[id].reward}`); }
  for (const o of out) state.yearLog.causes.push(o);
  return out;
}

export function goalView(state) {
  if (!state.goal) return null;
  const id = state.goal.id;
  const st = state.goalProgress?.[id] || 0;
  return { id, name: GOALS[id].name, stage: st, stages: GOALS[id].stages, reward: GOALS[id].reward, done: st >= 3 };
}

// ───────── 업적 (1차 빌드에서 실제로 달성 가능한 24개) ─────────
export const ACHIEVEMENTS = [
  { id: 'A001', name: '첫 번째 연말', grade: 'D', desc: '첫 연말 결산을 저장한다.', test: s => s.stats.yearsEnded >= 1 },
  { id: 'A002', name: '내가 고른 길', grade: 'D', desc: '주 활동을 직접 선택하고 그해 결과를 받는다.', test: s => s.history.mains.length >= 1 && s.stats.yearsEnded >= 1 },
  { id: 'A003', name: '방과 식탁', grade: 'C', desc: '18세 이후 자신의 수입과 합법 지원으로 기본 생계비 1년분을 충당한다.', test: s => s.ch.independent && s.yearLog.income >= s.yearLog.expenseBase && s.yearLog.expenseBase > 0 },
  { id: 'A004', name: '작은 비상금', grade: 'C', desc: '미납 필수비 없이 현금 24C를 확보한다.', test: s => s.ch.cash >= 24 && !s.ch.debts.some(d => d.overdue) },
  { id: 'A005', name: '밤에도 배우는 사람', grade: 'C', desc: '야간교육 한 과정을 1년 수료한다.', test: s => (s.stats.nightSchool || 0) >= 1 || (s.stats.schoolYears || 0) >= 1 },
  { id: 'A006', name: '쉬는 법을 배우다', grade: 'C', desc: '휴식 활동으로 스트레스를 합계 20 이상 낮춘다.', test: s => (s.stats.restStress || 0) >= 20 },
  { id: 'A007', name: '다시 만난 이름', grade: 'D', desc: '같은 인물과 서로 다른 해에 두 번 만나 관계 기록을 남긴다.', test: s => Object.values(s.npcs).some(n => n.id !== 'p_guardian' && n.metYears.length >= 2) },
  { id: 'A008', name: '약속의 날짜', grade: 'C', desc: '기한이 있는 약속 하나를 만기 전에 완수한다.', test: s => (s.stats.dutiesDone || 0) >= 1 },
  { id: 'A009', name: '스무 살의 장부', grade: 'C', desc: '20세 이후 독립 가계의 비적자 연말을 한 번 맞는다.', test: s => s.age >= 20 && s.ch.independent && s.yearLog.net >= 0 },
  { id: 'A010', name: '다시 걷는 사람', grade: 'B', desc: 'L0에서 L1로 회복하고 2년 연속 유지한다.', test: s => s.history.recoveredL0 && s.history.l1Streak >= 2 },
  { id: 'A025', name: '내 손으로 번 겨울', grade: 'C', desc: '18세 이후 근로·사업 수입만으로 연간 기본비 72C 이상을 충당한다.', test: s => s.age >= 18 && s.yearLog.income >= 72 && ['work', 'work_res', 'workshop'].includes(s.plan?.main) },
  { id: 'A026', name: '밀리지 않는 장부', grade: 'C', desc: '필수비와 계약 납부를 3년 연속 연체하지 않는다.', test: s => s.history.noArrearsStreak >= 3 },
  { id: 'A027', name: '한 해의 여유', grade: 'B', desc: '미납금 없이 예비 현금 72C를 확보한다.', test: s => s.ch.cash >= 72 && !s.ch.debts.some(d => d.overdue) },
  { id: 'A028', name: '마지막 이자', grade: 'B', desc: '원금 40C 이상인 대출의 원금과 이자를 모두 상환한다.', test: s => (s.stats.bigLoanRepaid || 0) >= 1 },
  { id: 'A037', name: '믿을 만한 얼굴', grade: 'C', desc: '인물 한 명의 신뢰를 40 이상으로 높인다.', test: s => Object.values(s.npcs).some(n => n.id !== 'p_guardian' && n.trust >= 40) },
  { id: 'A043', name: '다섯 번의 이행', grade: 'B', desc: '서로 다른 기한 약속 5건을 완수한다.', test: s => (s.stats.dutiesDone || 0) >= 5 },
  { id: 'A049', name: '믿을 만한 일손', grade: 'C', desc: '공적 위상 R1에 도달한다.', test: s => s.ch.publicRank >= 1 },
  { id: 'A050', name: '지역의 전문가', grade: 'B', desc: '공적 위상 R2에 도달한다.', test: s => s.ch.publicRank >= 2 },
  { id: 'A061', name: '나누어 쓰는 열', grade: 'C', desc: '열분배 또는 대응 장치로 난방·구조 과제 3건을 완료한다.', test: s => (s.stats.heatTasks || 0) >= 3 },
  { id: 'A062', name: '배관이 하는 말', grade: 'B', desc: '압력 청감 또는 계측 장치로 실제 결함 3건을 찾는다.', test: s => (s.stats.pressureFinds || 0) >= 3 },
  { id: 'A068', name: '다시 맞물린 금속', grade: 'C', desc: '금속 친화 또는 정렬 공구로 부품 재사용 제작 3건을 완료한다.', test: s => (s.stats.metalCrafts || 0) >= 3 },
  { id: 'A073', name: '다시 쥔 공구', grade: 'D', desc: '사용 가능한 상태로 기본 공구 하나를 수리한다.', test: s => !!s.flags.toolRepaired },
  { id: 'A091', name: '첫불의 이웃', grade: 'C', desc: '첫불 축제에서 자원 또는 실무로 공동 과제 하나에 기여한다.', test: s => !!s.flags.festivalContrib },
  { id: 'A133', name: '한 사람의 끝맺음', grade: 'C', desc: '완주 기준을 만족한 삶을 처음으로 결산한다.', test: s => !!s.ending && (s.age >= 28 || Object.keys(s.flags).some(k => k.startsWith('goalDone_'))) },
];
export const GRADE_SCORE = { D: 5, C: 10, B: 20, A: 35, S: 60, SS: 100 };

export function checkAchievements(state) {
  const got = [];
  for (const a of ACHIEVEMENTS) {
    if (state.achievements.includes(a.id)) continue;
    let ok = false;
    try { ok = !!a.test(state); } catch { ok = false; }
    if (ok) { state.achievements.push(a.id); got.push(a.id); }
  }
  state.newAchievements.push(...got);
  return got;
}

// ───────── 엔딩 ─────────
export const ENDINGS = {
  local_lamp: { name: '지역의 등불', scene: '새 난로 앞에 남은 감사 기록', test: s => (s.stats.localProjects || 0) >= 2,
    text: s => `골목 사람들은 겨울마다 {home}의 난로 앞에 모였다. 난로 옆 나무판에는 감사 기록이 빼곡했고, 그 맨 위에 {fullme}의 이름이 있었다. 함께 세운 일은 ${s.stats.localProjects}건. 누구도 그것을 혼자의 공로라 부르지 않았지만, 시작한 사람이 누구였는지는 모두 알았다.` },
  city_witness: { name: '도시의 증언자', scene: '신문과 기록소에 다른 목소리가 남음', test: s => (s.stats.recordsPublished || 0) >= 2 && !s.flags.witnessExposed,
    text: () => '{fullme}의 서명이 들어간 기록은 매듭 시장 출장 기록소의 맨 아래 서랍에 보관되었다. 그 기록 덕분에 몇 사람은 이름을 되찾았고, 몇 사람은 이름을 숨긴 채 안전하게 살았다. 신문은 그 차이를 구분해 적었다.' },
  named_artisan: { name: '이름 있는 장인', scene: '제자가 도구의 서명을 이어받음', test: s => Math.max(s.ch.skills.repair, s.ch.skills.trade, s.ch.skills.record) >= 4 && (s.stats.signatureWorks || 0) >= 3,
    text: s => `{fullme}의 작업에는 작은 서명이 남았다. 대표 제작 ${s.stats.signatureWorks}건, 어느 것도 화려하지 않았지만 오래 버텼다. 마지막 해에 제자는 그 서명 옆에 자기 이름을 처음 새겼다.` },
  price_of_trade: { name: '거래의 대가', scene: '넘긴 사업과 남은 계약의 평가', test: s => (s.ch.workshop && s.ch.lifeClass >= 2) || (s.ch.job?.id === 'merchant' && s.ch.job.rank >= 2 && s.ch.cash >= 150 && totalDebt(s) < s.ch.cash),
    text: () => '{fullme}의 장부는 끝까지 맞아떨어졌다. 넘겨준 사업에는 단골과 계약서가 함께 갔고, 남은 계약들은 공정했는지 아닌지로 하나씩 평가받았다. 돈은 목적이 아니라 문을 여는 열쇠였다고, 그 장부가 말하고 있었다.' },
  kept_promise: { name: '끝내 지킨 약속', scene: '기록에 없던 작은 약속의 결실', test: s => (s.stats.dutiesDone || 0) >= 3 && !(s.stats.dutiesFailed > 0),
    text: s => `{fullme}는 ${s.stats.dutiesDone}개의 약속을 날짜 안에 지켰다. 그중 어떤 것은 기록에 남지 않았다. 장례식 날, 기록에 없던 약속을 기억하는 사람이 한 명 더 찾아왔다.` },
  warm_window: { name: '따뜻한 창문', scene: '겨울 저녁 식탁에 모인 사람들', test: s => (s.ch.lifeClass >= 1 || !s.ch.independent) && Object.values(s.npcs).filter(n => n.alive && n.trust >= 40).length >= 3,
    text: () => '마지막 겨울에도 {fullme}의 창문에는 불이 켜져 있었다. 식탁에는 의자가 모자랐고, 사람들은 서서 수프를 먹었다. 대단한 일을 하지 않아도 사람이 모이는 집이 있다는 것을, 그 골목은 알고 있었다.' },
};
const ENDING_ORDER = ['local_lamp', 'city_witness', 'named_artisan', 'price_of_trade', 'kept_promise', 'warm_window'];

// 여러 조건을 달성하면 가장 두드러진 결말을 주 결말로, 나머지는 추가 장면으로 보여준다
const ENDING_SCORE = {
  local_lamp: s => (s.stats.localProjects || 0) * 30,
  city_witness: s => (s.stats.recordsPublished || 0) * 18,
  named_artisan: s => (Math.max(s.ch.skills.repair, s.ch.skills.trade, s.ch.skills.record) - 3) * 18 + (s.stats.signatureWorks || 0) * 4,
  price_of_trade: s => s.ch.lifeClass * 14 + (s.ch.workshop ? 16 : 0),
  kept_promise: s => (s.stats.dutiesDone || 0) * 9,
  warm_window: s => Object.values(s.npcs).filter(n => n.alive && n.trust >= 40).length * 16,
};

export function evaluateEndings(state) {
  const met = ENDING_ORDER.filter(id => { try { return ENDINGS[id].test(state); } catch { return false; } });
  return met.map(id => [id, ENDING_SCORE[id](state)]).sort((a, b) => b[1] - a[1]).map(x => x[0]);
}

export function funeralAttendees(state) {
  const list = Object.values(state.npcs).filter(n => n.alive && n.met && (n.trust + Math.max(0, n.affinity)) >= 30)
    .sort((a, b) => (b.trust + b.affinity) - (a.trust + a.affinity)).slice(0, 5);
  return list.map(n => ({ id: n.id, name: n.name, portrait: n.portrait, line: funeralLine(state, n) }));
}

function funeralLine(state, n) {
  const me = shortName(state.ch.name);
  const done = n.duties.filter(d => d.done).length;
  if (n.id === 'toma' || n.heirOf === 'toma') return state.flags.project_ash_boiler ? `"난로 점검표 맨 위 칸은 아직도 ${me}의 이름이야."` : `"${me}는 배관을 두드리는 소리만 듣고도 어디가 아픈지 알았지."`;
  if (n.id === 'sabine' || n.heirOf === 'sabine') return `"${me}는 누가 대신 견디는 걸 그냥 두지 않았어요."`;
  if (n.id === 'sera' || n.heirOf === 'sera') return state.stats.bigLoanRepaid ? `"끝까지 갚은 사람은 드물어. 그래서 기억해."` : `"계약서는 깔끔했지. 그 사람다웠어."`;
  if (n.id === 'elian' || n.heirOf === 'elian') return `"약속 장부에 ${me}의 이름은 ${done ? '지킨 쪽에' : '깨끗하게'} 남아 있습니다."`;
  if (n.role === 'friend') return `"같이 배달하던 길, 아직도 그 순서대로 걸어."`;
  if (n.role === 'guardian') return `"처음 걸음마를 뗀 날을 기억한다. 마지막 걸음도 잘 걸었구나."`;
  if (n.role === 'rival') return `"이기고 싶었던 사람이 있어서 여기까지 왔어."`;
  if (n.role === 'child') return `"가르쳐 준 대로 하고 있어요. 서명도요."`;
  return done ? `"약속을 지켜 준 사람이었어요."` : `"그 골목에서 ${me}를 모르는 사람은 없었어요."`;
}

export function buildEnding(state, type) {
  const met = evaluateEndings(state);
  const short = state.age < 28 && !Object.keys(state.flags).some(k => k.startsWith('goalDone_'));
  const mainId = met[0] || null;
  const ch = state.ch;
  const key = state.journal.filter(j => j.kind === 'event').slice(-60);
  const pickKey = [];
  const step = Math.max(1, Math.floor(key.length / 8));
  for (let i = 0; i < key.length; i += step) pickKey.push({ year: key[i].year, age: key[i].age, title: key[i].title });
  state.ending = {
    type, year: state.year, age: state.age, short,
    main: mainId ? { id: mainId, name: ENDINGS[mainId].name, scene: ENDINGS[mainId].scene, text: fmt(state, ENDINGS[mainId].text(state)) } : null,
    extras: met.slice(1).map(id => ({ id, name: ENDINGS[id].name, scene: ENDINGS[id].scene })),
    attendees: funeralAttendees(state),
    summary: {
      lifeClass: LIFE_CLASSES[ch.lifeClass], publicRank: PUBLIC_RANKS[ch.publicRank], job: ch.job ? `${JOBS[ch.job.id].name}` : '무직',
      bestSkill: Object.entries(ch.skills).sort((a, b) => b[1] - a[1])[0].map((v, i) => i === 0 ? SKILLS[v] : v).join(' '),
      cash: ch.cash, debt: totalDebt(state), projects: state.stats.localProjects || 0, duties: state.stats.dutiesDone || 0,
      ability: ch.ability ? `${ABILITIES[ch.ability.id].name} (${ABILITY_STAGES[ch.ability.stage]})` : '비발현', home: DISTRICTS[ch.home].name,
      goal: state.goal ? { name: GOALS[state.goal.id].name, stage: state.goalProgress[state.goal.id] || 0 } : null,
      goalsDone: Object.keys(state.flags).filter(k => k.startsWith('goalDone_')).map(k => GOALS[k.slice(9)].name),
    },
    moments: pickKey.slice(0, 8),
  };
  state.phase = 'ended';
  checkAchievements(state);
  return state.ending;
}
