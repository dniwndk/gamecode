// 자동 진행 엔진. 순수 함수처럼 RunState를 받아 그 자리에서 고치고, 이번에 생긴 기록·업적을 돌려준다.
// 화면 속도(1x~8x)는 advance를 부르는 간격만 바꿀 뿐 결과에는 영향이 없다.
import type { AchievementFact, ChoiceDef, Effects, IncidentDef, NodeDef } from './contentTypes';
import type { Apt, Mst } from './types';
import type {
  CrisisPriorityType,
  DecisionChoiceSnapshot,
  EndpointType,
  FocusType,
  RunState,
  ThreatTag,
  TimelineLog,
} from './types';
import { APT_LABEL, MINUTES_PER_YEAR, MST_LABEL, RES_LABEL, describeCond, evalCond } from './conditions';
import { chance, int, next, pick, weighted } from './rng';
import { STEP_MINUTES } from './runFactory';
import { fill, won } from './text';
import {
  addSnapshotDiff,
  applyEffects,
  checkAutoGrants,
  checkPromotion,
  fact,
  flushActivity,
  log,
  maxHp,
  newCtx,
  setForm,
  takeSnapshot,
  type Ctx,
} from './engineContext';
import { monthlyCost, recordRent, runActivity, summarizeBundle } from './lifePlanner';
import { evaluateAchievements } from './achievementEvaluator';
import { buildEpilogue } from './summary';
import { bgById } from '../content/backgrounds';
import { clueById, regionById } from '../content/world';
import { CALLS, MAJOR_INCIDENTS, POSTMORTEM_SCENES, sceneById } from '../content/incidents';
import { MINOR_EVENTS } from '../content/minorEvents';
import { AMBIENT_NOTICES, FORGED_NOTICES } from '../content/notices';
import { POSTMORTEMS, endpointById } from '../content/progression';
import { CHILD_CHOICES, DAILY_CHOICES, childYearLine } from '../content/lifeChoices';
import { SIDE_ACTIONS, sideById, type SideActionDef } from '../content/sideActions';

const YEAR = MINUTES_PER_YEAR;
/** 생활권 위험도 × 이 값 = 보름마다 주요 사건이 터질 확률 */
const INCIDENT_RATE = 0.03;
const MAJOR_GAP_YEARS = 0.6;
const CALL_RATE = 0.07;
const MINOR_RATE = 0.2;
/** 보름마다 일상 선택 사건이 찾아올 확률(쿨다운이 지난 뒤). 대략 1~2년에 한 번. */
const DAILY_RATE = 0.045;
const DAILY_GAP_YEARS = 0.5;
/** 어린 시절, 한 해에 선택 사건이 찾아올 확률 */
const CHILD_CHOICE_RATE = 0.6;
/** 작은 행동으로 쌓을 수 있는 판정 보정의 상한 */
const SIDE_BONUS_CAP = 0.15;
const NOTICE_RATE = 0.045;
/** 늙지 않는 형태 */
export const AGELESS_FORMS = ['FORM_04_ABYSS_ENVOY', 'FORM_06_SANCTUARY', 'FORM_07_STORY_ECHO', 'FORM_11_CONCEPT'];
const POSTMORTEM_YEARS = 6;

export interface StepResult {
  logs: TimelineLog[];
  achievements: string[];
  facts: AchievementFact[];
}

// ---------------------------------------------------------------- 공용

function setClock(s: RunState, minute: number) {
  s.run.clock.virtual_minute = minute;
  s.run.clock.current_age_years = minute / YEAR;
}

function ctxFor(s: RunState, stream: 'world' | 'action' = 'world'): Ctx {
  const ctx = newCtx(s, stream);
  ctx.summarize = summarizeBundle;
  return ctx;
}

function finish(ctx: Ctx): StepResult {
  const achievements = evaluateAchievements(ctx);
  ctx.s.run.revision += 1;
  return { logs: ctx.newLogs, achievements, facts: ctx.facts };
}

function varsFor(s: RunState): Record<string, string> {
  return { name: s.run.person.name, ally: String(s.run.incident?.local_flags.__ally ?? allyLabel(s)) };
}

const tx = (s: RunState, text: string) => fill(text, varsFor(s));

/** 사건에 함께 휘말리는 사람: 살아 있는 옆집 이웃, 아니면 가장 가까운 인연 */
export function allyLabel(s: RunState): string {
  const rels = s.run.relationships;
  if (rels.NPC_NEIGHBOR?.is_alive) return rels.NPC_NEIGHBOR.label;
  const best = Object.values(rels)
    .filter((r) => r.is_alive && r.met)
    .sort((a, b) => b.trust - a.trust)[0];
  return best?.label ?? '낯선 동행자';
}

function threatsOf(s: RunState): ThreatTag[] {
  const t = s.run.incident?.local_flags.__threats;
  return typeof t === 'string' && t ? (t.split(',') as ThreatTag[]) : [];
}

function publicLocal(local: Record<string, boolean | number | string>) {
  const out: Record<string, boolean | number | string> = {};
  for (const [k, v] of Object.entries(local)) if (!k.startsWith('__')) out[k] = v;
  return out;
}

function lastResultLog(ctx: Ctx): TimelineLog | undefined {
  for (let i = ctx.newLogs.length - 1; i >= 0; i--) {
    const l = ctx.newLogs[i];
    if (l.kind === 'incident_result' || l.kind === 'power_override' || l.kind === 'incident_auto') return l;
  }
  return undefined;
}

// ---------------------------------------------------------------- 공개 동작

const isAdult = (s: RunState) => (s.run.counters.childhood ?? 0) >= 4;

/** 한 해를 진행한다. 해가 바뀌거나 선택이 열리면 멈춘다. 결정 대기나 종료 상태면 아무것도 하지 않는다. */
export function advance(s: RunState): StepResult {
  const ctx = ctxFor(s);
  const r = s.run;
  if (r.run_status !== 'playing' || r.pending_decision) return finish(ctx);
  if (!isAdult(s)) {
    childhoodTick(ctx);
    return finish(ctx);
  }
  const year = Math.floor(r.clock.current_age_years + 1e-9);
  for (let i = 0; i < 40; i++) {
    stepOnce(ctx);
    if (r.run_status !== 'playing') break;
    if (Math.floor(r.clock.current_age_years + 1e-9) > year) {
      closeYear(ctx, year);
      break;
    }
    if (r.pending_decision) break;
  }
  return finish(ctx);
}

/** 한 해의 생활을 연말 정리 한 줄로 남긴다 */
function closeYear(ctx: Ctx, year: number) {
  flushActivity(ctx, { age_years: year, month: 12 });
}

/** 다음 선택(또는 종점)까지 건너뛴다 */
export function skipToDecision(s: RunState, maxBundles = 400): StepResult {
  const all: StepResult = { logs: [], achievements: [], facts: [] };
  for (let i = 0; i < maxBundles; i++) {
    if (s.run.run_status !== 'playing' || s.run.pending_decision) break;
    const res = advance(s);
    all.logs.push(...res.logs);
    all.achievements.push(...res.achievements);
    all.facts.push(...res.facts);
  }
  return all;
}

export function setLifePlan(s: RunState, focus: FocusType, crisis: CrisisPriorityType) {
  s.run.life_plan.focus = focus;
  s.run.life_plan.crisis_priority = crisis;
  s.run.revision += 1;
}

export function abandonRun(s: RunState) {
  if (s.run.run_status !== 'playing') return;
  s.run.run_status = 'abandoned';
  s.run.life_status = 'finalized';
  s.run.pending_decision = null;
  s.run.revision += 1;
}

// ---------------------------------------------------------------- 어린 시절(0세부터 한 해씩)

const KOR_UNITS: Record<string, number> = { 한: 1, 두: 2, 세: 3, 네: 4, 다섯: 5, 여섯: 6, 일곱: 7, 여덟: 8, 아홉: 9 };

/** '열두 살,'처럼 나이로 시작하는 출생 배경 문장에서 나이를 읽는다 */
export function leadingAge(text: string): number | null {
  const m = /^(열|스물|스무|서른)?\s?(한|두|세|네|다섯|여섯|일곱|여덟|아홉)?\s?살/.exec(text);
  if (!m || (!m[1] && !m[2])) return null;
  const tens = m[1] === '열' ? 10 : m[1] === '스물' || m[1] === '스무' ? 20 : m[1] === '서른' ? 30 : 0;
  return tens + (m[2] ? KOR_UNITS[m[2]] : 0);
}

/** 출생 배경의 어린 시절 세 장면이 놓이는 나이 */
export function childhoodSceneAges(bgLines: string[], startAge: number): number[] {
  const fallback = [0.27, 0.55, 0.8];
  const ages: number[] = [];
  bgLines.forEach((line, i) => {
    let a = leadingAge(line) ?? Math.round(startAge * fallback[i]);
    a = Math.max(1, Math.min(startAge - 1, a));
    while (ages.includes(a) && a < startAge - 1) a += 1;
    ages.push(a);
  });
  return ages;
}

function childhoodTick(ctx: Ctx) {
  const s = ctx.s;
  const r = s.run;
  const bg = bgById(r.person.background_id);
  const startAge = Math.round(r.clock.adult_start_minute / YEAR);
  const y = r.counters.child_year ?? Math.ceil(r.clock.current_age_years);
  if (y >= startAge) {
    setClock(s, r.clock.adult_start_minute);
    r.counters.childhood = 4;
    log(ctx, 'milestone', bg.startLog, { title: '이야기의 시작', tone: 'boundary', sound: 'silence', place: regionById(r.person.region_id).name });
    return;
  }
  setClock(s, y * YEAR);
  r.counters.child_year = y + 1;
  const sceneIdx = childhoodSceneAges(bg.childhood, startAge).indexOf(y);
  if (sceneIdx >= 0) {
    log(ctx, 'childhood', bg.childhood[sceneIdx], { tone: 'quiet', title: '기억에 남은 해' });
  } else {
    const line = childYearLine(s, y, startAge);
    const e = log(ctx, 'childhood', line.text, { tone: 'quiet' });
    const d = applyEffects(ctx, line.effects);
    if (d.length) e.deltas = d;
  }
  // 네 살부터는 한 해에 한 번쯤 작은 갈림길이 찾아온다
  if (y >= 4 && chance(s.rng, 'world', CHILD_CHOICE_RATE)) {
    const done = new Set(r.incident_history.map((h) => h.incident_id));
    const pool = CHILD_CHOICES.filter((d) => !done.has(d.id) && evalCond(s, d.eligible));
    const def = weighted(s.rng, 'world', pool, (d) => (typeof d.weight === 'function' ? d.weight(s) : d.weight));
    if (def) startIncident(ctx, def, 'voluntary', 'A');
  }
}

// ---------------------------------------------------------------- 14일 한 칸

function stepOnce(ctx: Ctx) {
  const s = ctx.s;
  const r = s.run;
  const p = r.person;
  const res = p.resources;
  setClock(s, r.clock.virtual_minute + STEP_MINUTES);
  r.counters.steps = (r.counters.steps ?? 0) + 1;
  fact(ctx, { type: 'step' });

  // 1) 생활 활동과 생활비
  const snap = takeSnapshot(s);
  const { earned } = runActivity(ctx);
  const cost = Math.round((monthlyCost(s) * 14) / 30);
  res.KRW -= cost;
  recordRent(ctx, earned);
  if (r.counters.steps % 6 === 0 && res.KRW < 0) res.KRW += Math.round(res.KRW * 0.012);

  // 2) 자연 회복
  res.FAT = Math.max(0, res.FAT - 4);
  if (res.FAT < 60) res.HP = Math.min(maxHp(s), res.HP + 2);
  if (p.form_id === 'FORM_02_NIGHT_HUNTER') res.HP = Math.min(maxHp(s), res.HP + 6);
  addSnapshotDiff(ctx, snap);
  rechargeGuards(s);

  // 3) 탈진
  if (res.FAT >= 100) {
    const e = log(ctx, 'minor_event', '몸이 더는 버티지 못했습니다. 출근길 계단에서 주저앉아 한참을 일어나지 못했고, 며칠을 꼬박 앓았습니다.', { title: '탈진', tone: 'quiet', sound: 'heartbeat', accessibility_caption: '심장 소리가 귓가에서 크게 울린다.' });
    e.deltas = applyEffects(ctx, { HP: -15 });
    res.FAT = 60;
    if (res.HP <= 0 && resolveDeath(ctx, '과로로 쓰러진 뒤', null) !== 'survived') return;
  }

  // 4) 노화
  const age = r.clock.current_age_years;
  const aging = !AGELESS_FORMS.includes(p.form_id) && r.life_status === 'active';
  if (aging && age >= 62 && chance(s.rng, 'world', 0.012 * ((age - 58) / 4))) {
    const e = log(ctx, 'minor_event', pick(s.rng, 'world', OLD_AGE_TEXTS), { title: '나이 든 몸', tone: 'quiet' });
    e.deltas = applyEffects(ctx, { HP: -int(s.rng, 'world', 6, 14), FAT: 6 });
    if (res.HP <= 0 && resolveDeath(ctx, '오래 앓던 병으로', null) !== 'survived') return;
  }
  if (aging && age >= r.clock.max_lifespan_years) {
    commitEndpoint(ctx, 'death', '노환', true);
    return;
  }
  if (!aging && r.life_status === 'active' && age >= r.clock.max_lifespan_years + 40) {
    commitEndpoint(ctx, p.form_id === 'FORM_06_SANCTUARY' ? 'perpetual_domain' : 'dissolution', '시간', true);
    return;
  }

  // 5) 사후 지속 유지력
  if (r.life_status === 'postmortem') {
    if (p.form_id === 'FORM_07_STORY_ECHO' && r.counters.steps % 6 === 0) p.witness_count = Math.max(0, p.witness_count - 2);
    const years = (r.clock.virtual_minute - (p.postmortem_started_minute ?? r.clock.virtual_minute)) / YEAR;
    if (years >= POSTMORTEM_YEARS || (p.form_id === 'FORM_07_STORY_ECHO' && p.witness_count <= 0)) {
      commitEndpoint(ctx, 'dissolution', '사후의 시간이 다하여', false);
      return;
    }
  }

  // 6) 계약 기한
  for (const c of r.contracts) {
    if (c.status !== 'active' || c.deadline_minute === null || c.deadline_minute > r.clock.virtual_minute) continue;
    if (c.contract_id === 'CTR_TEMP_UNDYING') {
      c.status = 'fulfilled';
      p.capabilities = p.capabilities.filter((x) => x !== 'CAP_13_TEMP_UNDYING');
      const e = log(ctx, 'milestone', '시한부 불사 계약의 기한이 끝났습니다. 심장이 다시 제 박자로 뛰기 시작했고, 그동안 미뤄 둔 피로가 한꺼번에 몰려왔습니다.', { title: '계약 만료', tone: 'boundary' });
      if (!p.capabilities.includes('CAP_18_SELF_ETERNITY')) e.deltas = applyEffects(ctx, { HP: -30, FAT: 20 });
      if (res.HP <= 0 && resolveDeath(ctx, '계약이 끝난 몸이 버티지 못해', null) !== 'survived') return;
    }
  }

  // 7) 세계 연출(예정 사건 → 주요 사건 → 소사건 → 호출 → 안내문)
  direct(ctx);
  if (r.run_status !== 'playing' || r.pending_decision) return;

  // 8) 능력 각성·승급
  checkAutoGrants(ctx);
  checkPromotion(ctx);
}

const OLD_AGE_TEXTS = [
  '무릎이 비 오는 날을 먼저 압니다. 병원 대기실에서 번호표를 들고 한참을 기다렸습니다.',
  '밤새 기침이 멎지 않았습니다. 창밖의 안개가 방 안까지 들어온 것 같았습니다.',
  '계단을 오르다 난간을 붙잡았습니다. 예전에는 두 칸씩 뛰어오르던 계단이었습니다.',
  '안경을 쓴 채로 안경을 찾았습니다. 웃어넘겼지만, 거울 속 얼굴이 낯설었습니다.',
];

function rechargeGuards(s: RunState) {
  const p = s.run.person;
  const now = s.run.clock.virtual_minute;
  const cd = s.run.cooldowns;
  if (!p.effigy_ready && (p.capabilities.includes('CAP_25_EFFIGY_SUBSTITUTE') || p.form_id === 'FORM_10_PAPER_EFFIGY') && (cd.effigy ?? 0) <= now) p.effigy_ready = true;
  if (!p.relic_guard_ready && p.form_id === 'FORM_09_RELIC_HOST' && (cd.relic ?? 0) <= now) p.relic_guard_ready = true;
}

// ---------------------------------------------------------------- 세계 연출

function direct(ctx: Ctx) {
  const s = ctx.s;
  const r = s.run;
  const now = r.clock.virtual_minute;

  // 예정된 사건(확정 의식, 예고된 사건)
  const due = r.scheduled_events
    .filter((e) => e.due_minute <= now)
    .sort((a, b) => a.priority - b.priority || a.sequence_order - b.sequence_order);
  if (due.length) {
    const e = due[0];
    r.scheduled_events = r.scheduled_events.filter((x) => x !== e);
    const def = sceneById(e.event_id);
    if (def) {
      startIncident(ctx, def, e.entry_mode, e.variant_id ?? pickVariant(s, def));
      return;
    }
  }

  // 사후 지속 장면
  if (r.life_status === 'postmortem') {
    const done = new Set(r.incident_history.map((h) => h.incident_id));
    const scene = POSTMORTEM_SCENES.find((d) => !done.has(d.id) && evalCond(s, d.eligible));
    if (scene) {
      startIncident(ctx, scene, 'voluntary', 'A');
      return;
    }
  }

  if (rollMajor(ctx)) return;
  if (r.life_status === 'active' && rollDaily(ctx)) return;
  if (rollMinor(ctx)) return;
  if (r.life_status === 'active' && rollCall(ctx)) return;
  rollNotice(ctx);
}

function pickVariant(s: RunState, def: IncidentDef): string {
  return def.variants?.length ? pick(s.rng, 'world', def.variants) : 'A';
}

function isScheduled(s: RunState, id: string) {
  return s.run.scheduled_events.some((e) => e.event_id === id);
}

export function eligibleMajors(s: RunState): IncidentDef[] {
  const r = s.run;
  const now = r.clock.virtual_minute;
  const done = new Set(r.incident_history.map((h) => h.incident_id));
  return MAJOR_INCIDENTS.filter(
    (d) =>
      !d.forced &&
      (d.repeatable || !done.has(d.id)) &&
      (r.cooldowns[d.id] ?? 0) <= now &&
      !isScheduled(s, d.id) &&
      (!d.regions || d.regions.includes(r.person.region_id)) &&
      evalCond(s, d.eligible),
  );
}

function rollMajor(ctx: Ctx): boolean {
  const s = ctx.s;
  const r = s.run;
  const now = r.clock.virtual_minute;
  if ((r.cooldowns.__major ?? 0) > now) return false;
  if (r.scheduled_events.some((e) => e.event_kind === 'major_incident')) return false;
  let p = regionById(r.person.region_id).risk * INCIDENT_RATE;
  if (r.life_plan.focus === 'FOCUS_INVESTIGATION') p *= 1.4;
  // 직위가 오를수록 불려 나가는 현장이 늘어난다
  p *= 1 + 0.25 * r.person.position_tier;
  // 시작 직후 첫 반년은 숨 고를 틈을 준다
  if (now - r.clock.adult_start_minute < YEAR * 0.5) p *= 0.4;
  if (!chance(s.rng, 'world', p)) return false;

  const pool = eligibleMajors(s);
  if (!pool.length) return false;
  const voluntaryShare = r.life_plan.focus === 'FOCUS_INVESTIGATION' ? 0.45 : 0.25;
  const wantVoluntary = chance(s.rng, 'world', voluntaryShare);
  const subset = pool.filter((d) => (d.entry === 'voluntary') === wantVoluntary);
  const from = subset.length ? subset : pool;
  const def = weighted(s.rng, 'world', from, (d) => (typeof d.weight === 'function' ? d.weight(s) : d.weight));
  if (!def) return false;
  r.cooldowns.__major = now + Math.round(YEAR * MAJOR_GAP_YEARS);
  const variant = pickVariant(s, def);

  if (def.notice) {
    // 며칠~몇 주 앞서 안내문이 먼저 도착한다(10.1)
    r.scheduled_events.push({
      schedule_id: `S${r.auto_sequence + 1}`,
      due_minute: now + int(s.rng, 'world', 1, 2) * STEP_MINUTES,
      priority: def.entry === 'involuntary' ? 30 : 35,
      sequence_order: r.auto_sequence,
      event_kind: 'major_incident',
      event_id: def.id,
      entry_mode: def.entry,
      variant_id: variant,
    });
    const e = log(ctx, 'epistolary_notice', def.notice.text, { notice_from: def.notice.from, tone: 'quiet', sound: 'chime', accessibility_caption: '휴대폰이 짧게 진동한다.' });
    e.deltas = applyEffects(ctx, { clues: def.notice.clue ? [def.notice.clue] : undefined, flags: { [`notice_${def.id}`]: true } });
    return true;
  }
  startIncident(ctx, def, def.entry, variant);
  return true;
}

/** 일상 속 작은 갈림길: 고르는 대로 능력치와 자원이 조금씩 바뀐다 */
function rollDaily(ctx: Ctx): boolean {
  const s = ctx.s;
  const r = s.run;
  const now = r.clock.virtual_minute;
  if ((r.cooldowns.__daily ?? 0) > now) return false;
  if (!chance(s.rng, 'world', DAILY_RATE)) return false;
  const pool = DAILY_CHOICES.filter((d) => (r.cooldowns[d.id] ?? 0) <= now && evalCond(s, d.eligible));
  const def = weighted(s.rng, 'world', pool, (d) => (typeof d.weight === 'function' ? d.weight(s) : d.weight));
  if (!def) return false;
  r.cooldowns.__daily = now + Math.round(YEAR * DAILY_GAP_YEARS);
  r.cooldowns[def.id] = now + Math.round(YEAR * 15);
  startIncident(ctx, def, 'voluntary', 'A');
  return true;
}

function rollMinor(ctx: Ctx): boolean {
  const s = ctx.s;
  const r = s.run;
  const now = r.clock.virtual_minute;
  if (!chance(s.rng, 'world', MINOR_RATE)) return false;
  const pool = MINOR_EVENTS.filter((m) => (r.cooldowns[m.id] ?? 0) <= now && evalCond(s, m.eligible));
  const ev = weighted(s.rng, 'world', pool, (m) => m.weight);
  if (!ev) return false;
  const seen = (r.counters[`seen_${ev.id}`] ?? 0) + 1;
  r.counters[`seen_${ev.id}`] = seen;
  // 같은 일이 반복될수록 뜸해진다
  r.cooldowns[ev.id] = now + Math.round(YEAR * 2.5 * seen);
  const result = ev.run(s, { roll: () => next(s.rng, 'world'), has: (c) => evalCond(s, c) });
  const e = log(ctx, result.noticeFrom ? 'epistolary_notice' : 'minor_event', tx(s, result.text), {
    title: ev.title,
    badges: result.badges,
    sound: result.sound,
    accessibility_caption: result.caption,
    notice_from: result.noticeFrom,
    tone: result.badges?.length ? 'good' : 'plain',
  });
  e.deltas = applyEffects(ctx, result.effects);
  fact(ctx, { type: 'minor_event_resolved', local: result.facts ?? {}, data: { id: ev.id } });
  if (s.run.person.resources.HP <= 0) resolveDeath(ctx, `${ev.title} 끝에`, null);
  return true;
}

function rollCall(ctx: Ctx): boolean {
  const s = ctx.s;
  const r = s.run;
  const now = r.clock.virtual_minute;
  if ((r.cooldowns.__call ?? 0) > now) return false;
  if (!chance(s.rng, 'world', CALL_RATE)) return false;
  const pool = CALLS.filter((c) => (r.cooldowns[c.id] ?? 0) <= now && evalCond(s, c.eligible));
  const def = weighted(s.rng, 'world', pool, (d) => (typeof d.weight === 'function' ? d.weight(s) : d.weight));
  if (!def) return false;
  r.cooldowns[def.id] = now + Math.round(YEAR * 2.5);
  r.cooldowns.__call = now + YEAR;
  startIncident(ctx, def, 'voluntary', 'A');
  return true;
}

function rollNotice(ctx: Ctx) {
  const s = ctx.s;
  const r = s.run;
  if (!chance(s.rng, 'world', NOTICE_RATE)) return;
  const p = r.person;
  if (r.clock.current_age_years >= 25 && chance(s.rng, 'world', 0.2)) {
    const n = pick(s.rng, 'world', FORGED_NOTICES);
    const caught = p.aptitudes.OBS >= 5 || p.capabilities.includes('CAP_04_CLAUSE_AUDIT') || p.knowledge_observations.includes('CLU_FAKE_SMS');
    if (caught) {
      const e = log(ctx, 'epistolary_notice', `${n.text} 발신 번호를 다시 보았습니다. 이 도시의 관공서는 저런 번호를 쓰지 않습니다. 문자를 지우고 번호를 차단했습니다.`, { notice_from: n.from, badges: ['발신 번호 위조 의심'], tone: 'good', sound: 'glitch', accessibility_caption: '알림음이 반 박자 늦게 울린다.' });
      e.deltas = applyEffects(ctx, { clues: ['CLU_FAKE_SMS'] });
      fact(ctx, { type: 'minor_event_resolved', local: { detected_forged_notice: true } });
    } else {
      const e = log(ctx, 'epistolary_notice', `${n.text} 문자대로 따르려다 마지막 순간 손을 멈췄습니다. 그날 밤 문 너머에서 누군가 오래 기다리다 돌아갔습니다.`, { notice_from: n.from, tone: 'danger', sound: 'glitch', accessibility_caption: '알림음이 반 박자 늦게 울린다.' });
      e.deltas = applyEffects(ctx, { FAT: 5, defense: -0.05 });
    }
    return;
  }
  const n = pick(s.rng, 'world', AMBIENT_NOTICES);
  log(ctx, 'epistolary_notice', n.text, { notice_from: n.from, tone: 'quiet', sound: 'chime' });
}

// ---------------------------------------------------------------- 사건 진행

export function startIncident(ctx: Ctx, def: IncidentDef, entry: 'involuntary' | 'voluntary', variant: string) {
  const s = ctx.s;
  const r = s.run;
  const p = r.person;
  const ally = allyLabel(s);
  if (r.relationships.NPC_NEIGHBOR?.is_alive && !r.relationships.NPC_NEIGHBOR.met && def.kind === 'major') r.relationships.NPC_NEIGHBOR.met = true;
  r.incident = {
    instance_id: `I${r.auto_sequence + 1}`,
    incident_id: def.id,
    variant_id: variant,
    entry_mode: entry,
    current_node_id: def.start ?? 'entry',
    local_flags: { __threats: def.threats.join(','), __ally: ally },
    damage_taken_in_incident: 0,
    died_during_this_incident: false,
    postmortem_during_this_incident: false,
    supplies_spent: 0,
  };

  const first = def.nodes[r.incident.current_node_id];
  const badges: string[] = [];
  if (def.kind === 'major') badges.push(entry === 'involuntary' ? '비자발적 진입' : '자발적 진입');
  if (def.clock) badges.push(`멈춘 시계 ${def.clock}`);
  const headerKind = def.kind === 'postmortem' ? 'postmortem' : def.kind === 'minor' ? (isAdult(s) ? 'minor_event' : 'childhood') : 'incident_auto';
  const header = log(ctx, headerKind, first?.kind === 'auto' ? tx(s, first.text) : '', {
    title: def.title,
    place: def.place,
    badges,
    sound: first?.kind === 'auto' ? first.sound : undefined,
    accessibility_caption: first?.kind === 'auto' ? first.caption : undefined,
    tone: def.kind === 'major' ? 'danger' : def.kind === 'postmortem' ? 'boundary' : 'plain',
  });
  if (first?.kind === 'auto') {
    const d = applyEffects(ctx, first.effects);
    if (d.length) header.deltas = d;
    r.incident.current_node_id = first.next;
  }

  // 위험 감지 이명: 비자발적 사건에 휘말리는 순간 첫 단서를 낚아챈다
  if (def.kind === 'major' && entry === 'involuntary' && (p.capabilities.includes('CAP_01_DANGER_TINNITUS') || p.aptitudes.OBS >= 7)) {
    const clue = def.relevantClues?.find((c) => !p.knowledge_observations.includes(c));
    if (clue) {
      p.knowledge_observations.push(clue);
      header.badges = [...(header.badges ?? []), `위험 감지 · ${clueById(clue)?.label ?? clue}`];
      fact(ctx, { type: 'action_resolved', data: { autoDetected: true } });
    }
  }

  // 비자발적으로 끌려 들어가는 순간의 기습. 위험을 먼저 알아챘다면 절반만 다친다.
  if (def.kind === 'major' && entry === 'involuntary' && def.tier >= 2) {
    const warned = (header.badges ?? []).some((b) => b.startsWith('위험 감지')) || !!r.milestones[`notice_${def.id}`];
    let hit = int(s.rng, 'world', 5, 11) * def.tier;
    if (warned) hit = Math.round(hit / 2);
    const d = applyEffects(ctx, { HP: -hit, FAT: 4 * def.tier });
    header.deltas = [...(header.deltas ?? []), ...d];
  }

  // 권능 자동 해결
  if (def.kind === 'major') {
    const ov = def.overrides?.find((o) => evalCond(s, o.cond));
    if (ov) {
      const e = log(ctx, 'power_override', tx(s, ov.text), { title: `권능 발동 · ${ov.label}`, tone: 'gold', sound: 'bell', badges: ['보유 능력 작동'] });
      e.deltas = applyEffects(ctx, ov.effects);
      fact(ctx, { type: 'power_override_triggered', incident_id: def.id });
      completeIncident(ctx, ov.outcome);
      return;
    }
  }
  if (p.resources.HP <= 0 && resolveDeath(ctx, `${def.title}에서`, def) !== 'survived') return;
  runNodes(ctx);
}

function runNodes(ctx: Ctx) {
  const s = ctx.s;
  const r = s.run;
  for (let guard = 0; guard < 30 && r.incident && r.run_status === 'playing'; guard++) {
    const inc = r.incident;
    const def = sceneById(inc.incident_id)!;
    const node: NodeDef | undefined = def.nodes[inc.current_node_id];
    if (!node) {
      completeIncident(ctx, 'unresolved');
      return;
    }
    if (node.kind === 'auto') {
      const e = log(ctx, def.kind === 'postmortem' ? 'postmortem' : def.kind === 'minor' ? 'incident_result' : 'incident_auto', tx(s, node.text), { title: node.title, sound: node.sound, accessibility_caption: node.caption, tone: def.kind === 'major' ? 'danger' : 'plain' });
      e.deltas = applyEffects(ctx, node.effects);
      inc.current_node_id = node.next;
      if (s.run.person.resources.HP <= 0 && resolveDeath(ctx, `${def.title}에서`, def) !== 'survived') return;
      continue;
    }
    if (node.kind === 'decision') {
      openDecision(ctx, def, inc.current_node_id, node);
      return;
    }
    if (node.text) {
      const e = log(ctx, 'incident_result', tx(s, node.text), { tone: 'plain' });
      e.deltas = applyEffects(ctx, node.effects);
    } else if (node.effects) {
      const l = lastResultLog(ctx);
      const d = applyEffects(ctx, node.effects);
      if (l) l.deltas = [...(l.deltas ?? []), ...d];
    }
    completeIncident(ctx, node.outcome);
    return;
  }
}

/** 확률 판정 성공률(명세 07.4의 P 공식) */
export function successChance(s: RunState, def: IncidentDef, c: ChoiceDef): number {
  const p = s.run.person;
  const ch = c.chance ?? { base: 0.5 };
  const apts = ch.apt ?? [];
  const msts = ch.mst ?? [];
  const aAvg = apts.length ? apts.reduce((a, k) => a + p.aptitudes[k], 0) / apts.length : 4;
  const mAvg = msts.length ? msts.reduce((a, k) => a + p.masteries[k], 0) / msts.length : 20;
  const prep = s.run.world.defense_bonus + (p.resources.SUP >= 3 ? 0.05 : 0);
  const crisis = s.run.life_plan.crisis_priority;
  const allyHere = !!s.run.incident?.local_flags.ally_present;
  let ally = crisis === 'CRISIS_PROTECT_ALLY' && allyHere ? 0.05 : 0;
  if (p.capabilities.includes('CAP_23_HIRED_ESCORT') && def.kind === 'major') ally += 0.2;
  const push = crisis === 'CRISIS_PUSH_OBJECTIVE' ? 0.05 : 0;
  // 적성·숙련은 괴담 등급이 요구하는 수준에 대한 상대값으로 본다
  const tier = Math.max(1, def.tier);
  const aRel = aAvg - (3 + tier);
  const mRel = mAvg - 15 * tier;
  const threat = 0.02 * (tier - 1);
  const fatigue = p.resources.FAT >= 80 ? 0.15 : 0;
  // 사건 도중 작은 행동으로 쌓은 보정
  const side = Math.min(SIDE_BONUS_CAP, Number(s.run.incident?.local_flags.__bonus ?? 0));
  const P = ch.base + 0.04 * aRel + 0.004 * mRel + prep + ally + push + side - threat - fatigue;
  return Math.max(0.05, Math.min(0.95, P));
}

export function oddsLabel(pv: number): string {
  return pv >= 0.65 ? '성공 가능성 높음' : pv >= 0.4 ? '성공 가능성 보통' : '성공 가능성 낮음';
}

function costLabels(cost: Effects | undefined): string[] {
  if (!cost) return [];
  const out: string[] = [];
  if (cost.SUP) out.push(`물자 ${cost.SUP}`);
  if (cost.KRW) out.push(`자금 ${won(cost.KRW)}`);
  if (cost.HP) out.push(`건강 ${cost.HP}`);
  if (cost.FAT) out.push(`피로 +${cost.FAT}`);
  return out;
}

function affordable(s: RunState, cost: Effects | undefined): boolean {
  if (!cost) return true;
  const r = s.run.person.resources;
  if (cost.SUP && r.SUP + cost.SUP < 0) return false;
  if (cost.KRW && cost.KRW < 0 && r.KRW + cost.KRW < 0) return false;
  return true;
}

/** 선택이 건드리는 능력치·자원의 이름 */
function effectLabels(list: Array<Effects | undefined>): string[] {
  const out = new Set<string>();
  for (const e of list) {
    if (!e) continue;
    (['HP', 'FAT', 'KRW', 'SUP'] as const).forEach((k) => e[k] && out.add(RES_LABEL[k]));
    for (const k of Object.keys(e.apt ?? {}) as Apt[]) out.add(APT_LABEL[k]);
    for (const a of e.aptChance ?? []) out.add(APT_LABEL[a.apt]);
    for (const k of Object.keys(e.mst ?? {}) as Mst[]) out.add(MST_LABEL[k]);
    if (e.trust || e.meet || e.allyLost) out.add('인연');
    if (e.clues) out.add('단서');
    if (e.caps) out.add('능력');
    if (e.contracts) out.add('계약');
    if (e.joinPath) out.add('성장 경로');
    if (e.region) out.add('사는 곳');
    if (e.form) out.add('존재 형태');
    if (e.defense) out.add('다음 사건 방어');
    if (e.beacons) out.add('귀환 표식');
  }
  return [...out];
}

/** 괴담 사건 속 선택은 결과와 별개로 경험을 남긴다: 판정에 쓰인 숙련이 오르고 긴장으로 조금 지친다 */
function experienceOf(def: IncidentDef, c: ChoiceDef, ok: boolean): Effects | undefined {
  if (def.kind !== 'major' && def.kind !== 'postmortem') return undefined;
  const msts: Mst[] = c.chance?.mst?.length ? c.chance.mst : [c.check === 'rule' ? 'MST_RULE' : 'MST_FIELD'];
  const apts: Apt[] = c.chance?.apt ?? [];
  return {
    mst: Object.fromEntries(msts.map((m) => [m, ok ? 2 : 1])) as Partial<Record<Mst, number>>,
    aptChance: apts.map((a) => ({ apt: a, p: 0.04 })),
    FAT: 2,
  };
}

function snapshotChoice(s: RunState, def: IncidentDef, c: ChoiceDef): DecisionChoiceSnapshot {
  const p = s.run.person;
  const reqOk = evalCond(s, c.requires);
  const costOk = affordable(s, c.cost);
  const badges: string[] = [];
  if (c.requires && reqOk) {
    if (c.capBadge) badges.push(`보유 능력 작동 · ${c.capBadge}`);
    else if (c.check === 'ability') badges.push('보유 능력 작동');
    else if (c.check === 'rule') badges.push('규칙 파훼 확정');
    else badges.push('조건 충족');
  } else if (c.capBadge && reqOk) badges.push(`보유 능력 작동 · ${c.capBadge}`);
  const spotted = c.trap && (p.capabilities.includes('CAP_04_CLAUSE_AUDIT') || p.aptitudes.OBS >= 6);
  return {
    id: c.id,
    tag: c.tag,
    text: tx(s, c.text),
    known_costs_label: costLabels(c.cost),
    required_badges: badges,
    warning_badge: spotted ? '함정 의심' : undefined,
    odds_label: c.check === 'chance' ? oddsLabel(successChance(s, def, c)) : '판정 없음',
    is_available: reqOk && costOk,
    unavailable_reason: !reqOk ? `조건: ${describeCond(c.requires)}` : !costOk ? '물자나 자금이 모자랍니다' : undefined,
    effect_hint: effectLabels([c.cost, c.success.effects, c.fail?.effects, experienceOf(def, c, true)]),
  };
}

// ---------------------------------------------------------------- 작은 행동

/** 사건 도중 결정을 미루고 끼워 넣는 작은 행동이 열리는 사건 */
const hasSideActions = (def: IncidentDef) => def.kind === 'major' || def.kind === 'postmortem';

function sideChance(s: RunState, def: IncidentDef, sa: SideActionDef): number {
  const p = s.run.person;
  const apts = sa.chance?.apt ?? [];
  const aAvg = apts.length ? apts.reduce((a, k) => a + p.aptitudes[k], 0) / apts.length : 4;
  const P = (sa.chance?.base ?? 1) + 0.05 * (aAvg - 4) - 0.03 * Math.max(0, def.tier - 1) - (p.resources.FAT >= 80 ? 0.1 : 0);
  return Math.max(0.1, Math.min(0.95, P));
}

/** 이 결정 자리에서 쓸 수 있는 작은 행동 세 가지(한 번 정하면 그 자리에서는 바뀌지 않는다) */
function sideActionsFor(ctx: Ctx, def: IncidentDef, nodeId: string): SideActionDef[] {
  const s = ctx.s;
  const local = s.run.incident!.local_flags;
  const key = `__sides_${nodeId}`;
  if (typeof local[key] !== 'string') {
    const threats = def.threats;
    const fits = SIDE_ACTIONS.filter((a) => a.id !== 'side_look' && (!a.threats || a.threats.some((t) => threats.includes(t))));
    const chosen = ['side_look'];
    for (let i = 0; i < 2; i++) {
      const pick1 = weighted(s.rng, ctx.stream, fits.filter((a) => !chosen.includes(a.id)), (a) => a.weight * (a.threats ? 1.5 : 1));
      if (pick1) chosen.push(pick1.id);
    }
    local[key] = chosen.join(',');
  }
  return String(local[key])
    .split(',')
    .filter((id) => !local[`__used_${nodeId}_${id}`])
    .map((id) => sideById(id)!)
    .filter(Boolean);
}

function snapshotSide(s: RunState, def: IncidentDef, sa: SideActionDef): DecisionChoiceSnapshot {
  const reqOk = evalCond(s, sa.requires);
  const costOk = affordable(s, sa.cost);
  const hint = effectLabels([sa.cost, sa.success.effects, sa.fail?.effects]);
  if (sa.success.bonus) hint.push('이번 사건 판정');
  if (sa.success.clue) hint.push('단서');
  if (sa.success.allyTrust) hint.push('인연');
  return {
    id: `side:${sa.id}`,
    tag: sa.tag,
    text: tx(s, sa.text),
    known_costs_label: costLabels(sa.cost),
    required_badges: [],
    odds_label: sa.chance ? oddsLabel(sideChance(s, def, sa)) : '판정 없음',
    is_available: reqOk && costOk,
    unavailable_reason: !reqOk ? `조건: ${describeCond(sa.requires)}` : !costOk ? '물자나 자금이 모자랍니다' : undefined,
    minor: true,
    effect_hint: [...new Set(hint)],
  };
}

/** 지금 사건에 함께 휘말린 사람의 id */
function allyId(s: RunState): string | null {
  const rels = s.run.relationships;
  if (rels.NPC_NEIGHBOR?.is_alive) return 'NPC_NEIGHBOR';
  const best = Object.entries(rels)
    .filter(([, r]) => r.is_alive && r.met)
    .sort((a, b) => b[1].trust - a[1].trust)[0];
  return best?.[0] ?? null;
}

function runSideAction(ctx: Ctx, def: IncidentDef, nodeId: string, node: Extract<NodeDef, { kind: 'decision' }>, sa: SideActionDef) {
  const s = ctx.s;
  const r = s.run;
  const inc = r.incident!;
  const p = r.person;
  log(ctx, 'decision_taken', tx(s, sa.text), { title: `작은 행동 · ${sa.tag}`, tone: 'plain' });
  const deltas = applyEffects(ctx, sa.cost);
  const ok = sa.chance ? next(s.rng, 'action') < sideChance(s, def, sa) : true;
  const out = ok ? sa.success : sa.fail ?? sa.success;
  const e = log(ctx, 'incident_result', tx(s, out.text), { tone: ok ? 'good' : 'danger', badges: sa.chance ? [ok ? '판정 성공' : '판정 실패'] : undefined });
  deltas.push(...applyEffects(ctx, out.effects));
  if (ok) {
    const sb = sa.success;
    if (sb.bonus) {
      const before = Number(inc.local_flags.__bonus ?? 0);
      const after = Math.min(SIDE_BONUS_CAP, before + sb.bonus);
      inc.local_flags.__bonus = Math.round(after * 100) / 100;
      if (after > before) deltas.push(`이번 사건 판정 +${Math.round((after - before) * 100)}%`);
    }
    if (sb.clue) {
      const clue = def.relevantClues?.find((c) => !p.knowledge_observations.includes(c));
      deltas.push(...applyEffects(ctx, clue ? { clues: [clue] } : { mst: { MST_FIELD: 1 } }));
    }
    if (sb.allyTrust) {
      const id = allyId(s);
      if (id) deltas.push(...applyEffects(ctx, { trust: { [id]: sb.allyTrust } }));
    }
    if (sb.stealth) inc.local_flags.used_stealth = true;
  }
  e.deltas = deltas;
  inc.local_flags[`__used_${nodeId}_${sa.id}`] = true;
  if (p.resources.HP <= 0 && resolveDeath(ctx, `${def.title}에서`, def) !== 'survived') return;
  if (r.incident && r.run_status === 'playing') openDecision(ctx, def, nodeId, node);
}

function openDecision(ctx: Ctx, def: IncidentDef, nodeId: string, node: Extract<NodeDef, { kind: 'decision' }>) {
  const s = ctx.s;
  const r = s.run;
  const p = r.person;
  const choices = node.choices.filter((c) => evalCond(s, c.showIf)).map((c) => snapshotChoice(s, def, c));
  if (hasSideActions(def)) choices.push(...sideActionsFor(ctx, def, nodeId).map((sa) => snapshotSide(s, def, sa)));
  const obs = (def.relevantClues ?? []).filter((c) => p.knowledge_observations.includes(c)).map((c) => clueById(c)?.text ?? c);
  if (r.milestones[`notice_${def.id}`] && def.notice) obs.push(`미리 받은 안내: ${def.notice.text}`);
  r.pending_decision = {
    decision_id: `D${r.auto_sequence + 1}`,
    incident_instance_id: r.incident!.instance_id,
    scene_node_id: nodeId,
    opened_at_minute: r.clock.virtual_minute,
    state_revision: r.revision,
    title: def.title,
    place: def.place,
    prompt_text: tx(s, node.prompt),
    relevant_observations: obs,
    choices,
  };
  ctx.notable = true;
}

/** 플레이어(또는 자동 결정)가 선택지 하나를 고른다 */
export function choose(s: RunState, choiceId: string): StepResult {
  const ctx = ctxFor(s, 'action');
  const r = s.run;
  const pd = r.pending_decision;
  const inc = r.incident;
  if (!pd || !inc || r.run_status !== 'playing') return finish(ctx);
  const snap = pd.choices.find((c) => c.id === choiceId);
  if (!snap || !snap.is_available) return finish(ctx);
  const def = sceneById(inc.incident_id)!;
  const node = def.nodes[pd.scene_node_id];
  if (node?.kind !== 'decision') return finish(ctx);
  if (snap.minor) {
    const sa = sideById(choiceId.slice('side:'.length));
    if (!sa) return finish(ctx);
    r.pending_decision = null;
    runSideAction(ctx, def, pd.scene_node_id, node, sa);
    return finish(ctx);
  }
  const c = node.choices.find((x) => x.id === choiceId)!;
  r.pending_decision = null;

  log(ctx, 'decision_taken', snap.text, { title: c.tag, badges: snap.required_badges.length ? snap.required_badges : undefined, tone: 'plain' });
  const pv = c.check === 'chance' ? successChance(s, def, c) : 1;
  if (c.cost) applyEffects(ctx, c.cost);

  let ok: boolean;
  if (c.failIf === true || (c.failIf && evalCond(s, c.failIf))) ok = false;
  else if (c.check === 'chance') ok = next(s.rng, 'action') < pv;
  else ok = true;
  const out = ok ? c.success : c.fail ?? c.success;
  const crisis = r.life_plan.crisis_priority;
  // 상위 등급 괴담일수록 같은 실패도 더 깊게 벤다
  const tierScale = def.kind === 'major' ? 1 + 0.5 * Math.max(0, def.tier - 1) : 1;
  const scale = ok ? undefined : tierScale * (crisis === 'CRISIS_EGRESS_FIRST' ? 0.75 : crisis === 'CRISIS_PUSH_OBJECTIVE' ? 1.2 : 1);
  const resultBadges = c.check === 'chance' ? [ok ? '판정 성공' : '판정 실패'] : undefined;
  const e = log(ctx, 'incident_result', tx(s, out.text), { tone: ok ? 'good' : 'danger', sound: out.sound, accessibility_caption: out.caption, badges: resultBadges });
  e.deltas = applyEffects(ctx, out.effects, { damageScale: scale });
  const xp = experienceOf(def, c, ok);
  if (xp) e.deltas.push(...applyEffects(ctx, xp));
  if (ok && c.stealth && r.incident) r.incident.local_flags.used_stealth = true;
  if (c.usesSupplies) fact(ctx, { type: 'action_resolved', incident_id: def.id, data: { suppliesSpent: true, success: ok } });

  if (s.run.person.resources.HP <= 0 && resolveDeath(ctx, `${def.title}에서`, def) !== 'survived') return finish(ctx);
  if (r.incident && r.run_status === 'playing') {
    if (out.next) {
      r.incident.current_node_id = out.next;
      runNodes(ctx);
    } else completeIncident(ctx, out.end ?? 'done');
  }
  if (r.run_status === 'playing' && !r.pending_decision) {
    checkAutoGrants(ctx);
    checkPromotion(ctx);
  }
  return finish(ctx);
}

function completeIncident(ctx: Ctx, outcome: string) {
  const s = ctx.s;
  const r = s.run;
  const p = r.person;
  const inc = r.incident;
  if (!inc) return;
  const def = sceneById(inc.incident_id)!;
  const oe = def.outcomeEffects?.[outcome];
  if (oe) {
    const eff = typeof oe === 'function' ? oe(s) : oe;
    const d = applyEffects(ctx, eff);
    const l = lastResultLog(ctx);
    if (l && d.length) l.deltas = [...(l.deltas ?? []), ...d];
  }
  const died = inc.died_during_this_incident;
  const pm = inc.postmortem_during_this_incident;
  const survived = !died && r.run_status === 'playing';
  const now = r.clock.virtual_minute;

  if (def.kind === 'major' && survived) {
    r.counters.clears = (r.counters.clears ?? 0) + 1;
    if (inc.entry_mode === 'involuntary') p.involuntary_survivals_count += 1;
    if (def.tier >= 3) {
      for (const t of def.threats) {
        if (['TH_RULE', 'TH_PREDATOR', 'TH_INFECTION', 'TH_DOMAIN'].includes(t) && !p.cleared_threat_tags.includes(t)) p.cleared_threat_tags.push(t);
      }
      p.cleared_high_threats_count = p.cleared_threat_tags.length;
    }
    if (def.threats.includes('TH_DOMAIN') || def.threats.includes('TH_BOUNDARY')) r.milestones.domain_survivor = true;
  }
  r.incident_history.push({ incident_id: def.id, outcome, minute: now, entry_mode: inc.entry_mode, survived });
  if (def.kind === 'major' && def.repeatable) r.cooldowns[def.id] = now + Math.round(YEAR * 3);
  const local = publicLocal(inc.local_flags);
  fact(ctx, {
    type: 'incident_completed',
    incident_id: def.id,
    outcome,
    entry_mode: inc.entry_mode,
    threats: def.threats,
    local,
    damage: inc.damage_taken_in_incident,
    data: { survived, kind: def.kind, died, postmortem: pm },
  });
  if (r.life_status === 'postmortem' && survived) {
    if (local.escaped_with_ally || local.ally_survived || outcome === 'promise_fulfilled') r.milestones.pm_saved_ally = true;
    if ((def.kind === 'major' && def.tier >= 3) || local.guided_other_via_discovered_route) r.milestones.pm_saved_sector = true;
  }
  if (def.kind === 'major') r.world.defense_bonus = Math.min(0, r.world.defense_bonus);
  r.incident = null;
  r.pending_decision = null;
  r.current_activity = null;
  const ep = def.outcomeEndpoints?.[outcome];
  if (ep && r.run_status === 'playing') commitEndpoint(ctx, ep, def.title, false, local);
}

// ---------------------------------------------------------------- 죽음과 종점

type DeathResult = 'survived' | 'postmortem' | 'ended';

function saved(ctx: Ctx, hp: number, title: string, text: string, extra?: Effects): DeathResult {
  const s = ctx.s;
  s.run.person.resources.HP = hp;
  const e = log(ctx, 'milestone', text, { title, tone: 'boundary', sound: 'heartbeat', accessibility_caption: '멎었던 심장이 다시 한 번 뛴다.' });
  if (extra) e.deltas = applyEffects(ctx, extra);
  return 'survived';
}

export function resolveDeath(ctx: Ctx, cause: string, def: IncidentDef | null): DeathResult {
  const s = ctx.s;
  const r = s.run;
  const p = r.person;
  const now = r.clock.virtual_minute;
  const inIncident = !!r.incident;

  // 죽음을 한 번 물리는 장치들
  if (r.contracts.some((c) => c.contract_id === 'CTR_TEMP_UNDYING' && c.status === 'active'))
    return saved(ctx, 1, '죽음 거절', '심장이 멎었지만 계약서의 잉크가 먼저 번졌습니다. 시한부 불사 계약이 이번 죽음을 거절했습니다.');
  if (p.form_id === 'FORM_05_HIVE_CORE' && p.bodies_count > 1) {
    p.bodies_count -= 1;
    return saved(ctx, 50, '분산 신체 교대', `몸 하나가 무너졌습니다. 다른 거리에서 자고 있던 몸이 눈을 떴습니다. 남은 몸은 ${p.bodies_count}구입니다.`);
  }
  if (p.form_id === 'FORM_10_PAPER_EFFIGY' && p.effigy_ready) {
    p.effigy_ready = false;
    r.cooldowns.effigy = now + YEAR;
    fact(ctx, { type: 'action_resolved', data: { effigy: true } });
    return saved(ctx, 60, '종이 몸', '찢어진 것은 종이였습니다. 새 종이를 접어 몸을 다시 세우는 데 밤새 걸렸습니다.', { FAT: 25 });
  }
  if (p.capabilities.includes('CAP_25_EFFIGY_SUBSTITUTE') && p.effigy_ready && p.resources.SUP >= 2) {
    p.effigy_ready = false;
    r.cooldowns.effigy = now + YEAR;
    fact(ctx, { type: 'action_resolved', data: { effigy: true } });
    return saved(ctx, 25, '종이 인형 대역', '품속의 종이 인형이 대신 비명을 질렀습니다. 침대 위에서 눈을 떴을 때, 인형은 반으로 찢어져 있었습니다.', { SUP: -2 });
  }
  if (p.form_id === 'FORM_09_RELIC_HOST' && p.relic_guard_ready) {
    p.relic_guard_ready = false;
    r.cooldowns.relic = now + YEAR;
    return saved(ctx, 1, '태엽의 보호', '회중시계가 3분을 되감았습니다. 죽음이 오기 3분 전의 몸으로, 당신은 다시 서 있습니다.');
  }

  p.resources.HP = 0;
  p.body_death_history.push({ occurred_at_minute: now, incident_id: r.incident?.incident_id ?? null, cause, transitioned_to_postmortem: null });
  if (r.incident) r.incident.died_during_this_incident = true;

  if (r.life_status === 'postmortem' || p.postmortem_count > 0) {
    if (inIncident) completeIncident(ctx, '__died');
    commitEndpoint(ctx, 'dissolution', cause, false);
    return 'ended';
  }

  const threats = def?.threats ?? threatsOf(s);
  const active = (id: string) => r.contracts.some((c) => c.contract_id === id && c.status === 'active');
  // 조건을 갖춰도 대부분의 죽음은 최종이다(사후 지속은 드문 예외)
  const rare = (p0: number) => chance(s.rng, 'world', p0);
  let pmId: string | null = null;
  if (active('CTR_UNFINISHED_ARBITER') && rare(0.15)) pmId = 'POST_01_CONTRACT';
  else if (inIncident && p.masteries.MST_BOUND >= 40 && p.beacons >= 2 && (threats.includes('TH_DOMAIN') || threats.includes('TH_BOUNDARY')) && rare(0.12)) pmId = 'POST_02_BOUNDARY';
  else if (inIncident && active('CTR_RETURN_PROMISE') && (r.milestones.has_recorder || p.capabilities.includes('CAP_27_VOICE_ANCHOR')) && rare(0.02)) pmId = 'POST_03_TESTIMONY';
  else if (inIncident && (p.background_id === 'BG_16_CURSED_HEIRLOOM' || p.form_id === 'FORM_09_RELIC_HOST') && rare(0.08)) pmId = 'POST_04_RELIC_REVENANT';

  if (pmId) {
    const pmDef = POSTMORTEMS.find((x) => x.id === pmId)!;
    r.life_status = 'postmortem';
    p.postmortem_count = 1;
    p.postmortem_type = pmId;
    p.postmortem_started_minute = now;
    p.body_death_history[p.body_death_history.length - 1].transitioned_to_postmortem = pmId;
    if (r.incident) r.incident.postmortem_during_this_incident = true;
    log(ctx, 'postmortem', `${cause} 심장이 멎었습니다. 그러나 이야기는 거기서 끝나지 않았습니다. ${pmDef.after}`, { title: `사후 지속 · ${pmDef.name}`, tone: 'boundary', sound: 'silence', accessibility_caption: '모든 소리가 사라졌다가, 아주 멀리서 무언가 다시 시작된다.' });
    setForm(ctx, pmDef.form);
    p.resources.HP = 60;
    p.resources.FAT = 20;
    if (pmId === 'POST_02_BOUNDARY') r.milestones.pm_boundary = true;
    if (pmId === 'POST_04_RELIC_REVENANT') r.milestones.pm_revenant = true;
    if (inIncident) completeIncident(ctx, '__postmortem');
    return 'postmortem';
  }

  if (inIncident) completeIncident(ctx, '__died');
  commitEndpoint(ctx, 'death', cause, false);
  return 'ended';
}

export function commitEndpoint(ctx: Ctx, type: EndpointType, cause: string, natural: boolean, local?: Record<string, boolean | number | string>) {
  const s = ctx.s;
  const r = s.run;
  if (r.run_status !== 'playing') return;
  const text = buildEpilogue(s, type, cause, natural);
  r.run_status = 'ended';
  r.life_status = 'finalized';
  r.pending_decision = null;
  r.incident = null;
  r.endpoint = { endpoint_type: type, committed_at_minute: r.clock.virtual_minute, epilogue_text: text, cause };
  flushActivity(ctx);
  log(ctx, 'endpoint', text, { title: endpointById(type)?.name ?? type, tone: type === 'death' || type === 'dissolution' ? 'quiet' : 'gold', sound: type === 'death' ? 'silence' : 'bell' });
  fact(ctx, { type: 'endpoint_committed', endpoint_type: type, local: local ?? {}, data: { natural } });
}

// ---------------------------------------------------------------- 자동 결정

/** 설정의 '자동 결정'이 켜졌을 때 고르는 선택지 */
export function autoChoice(s: RunState): string | null {
  const pd = s.run.pending_decision;
  const inc = s.run.incident;
  if (!pd || !inc) return null;
  const def = sceneById(inc.incident_id)!;
  const node = def.nodes[pd.scene_node_id];
  if (node?.kind !== 'decision') return null;
  const avail = pd.choices.filter((c) => c.is_available && !c.minor);
  if (!avail.length) return null;
  // 인물·조직의 제안은 받아들이는 쪽(첫 선택지)이 기본
  if (def.kind === 'call') return avail[0].id;
  // 일상·어린 시절의 갈림길은 그때그때 마음 가는 대로
  if (def.kind === 'minor') {
    const safe = avail.filter((c) => !c.warning_badge);
    return pick(s.rng, 'action', safe.length ? safe : avail).id;
  }
  // 크게 다친 채라면 먼저 응급처치부터
  const aid = pd.choices.find((c) => c.id === 'side:side_aid' && c.is_available);
  if (aid && s.run.person.resources.HP < 40) return aid.id;
  const defOf = (id: string) => node.choices.find((c) => c.id === id)!;
  const crisis = s.run.life_plan.crisis_priority;
  // 1) 조건을 갖춘 확정 선택(능력·규칙 파훼). 함정 의심은 피한다.
  const sure = avail.filter((c) => {
    const d = defOf(c.id);
    return !!d.requires && d.check !== 'chance' && !c.warning_badge && !d.failIf;
  });
  if (sure.length) return sure[0].id;
  // 2) 성공률이 가장 높은 확률 판정
  const chances = avail
    .filter((c) => defOf(c.id).check === 'chance')
    .map((c) => ({ c, p: successChance(s, def, defOf(c.id)) }))
    .sort((a, b) => b.p - a.p);
  // 3) 조건 없는 확정 선택: 위기 원칙에 맞는 쪽
  const plain = avail.filter((c) => defOf(c.id).check !== 'chance' && !c.warning_badge && !defOf(c.id).failIf);
  const prefer = (c: DecisionChoiceSnapshot) => {
    const t = c.tag + c.text;
    if (crisis === 'CRISIS_PROTECT_ALLY') return /구조|동행|함께|부축|보호|약속/.test(t) ? 2 : 0;
    if (crisis === 'CRISIS_EGRESS_FIRST') return /탈출|퇴각|후퇴|도주|빠져|돌아|거절|피한/.test(t) ? 2 : 0;
    return /장악|확보|조사|추격|임무|수락/.test(t) ? 2 : 0;
  };
  if (plain.length && (!chances.length || chances[0].p < 0.55)) {
    plain.sort((a, b) => prefer(b) - prefer(a));
    return plain[0].id;
  }
  if (chances.length) return chances[0].c.id;
  return avail[0].id;
}
