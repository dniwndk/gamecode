// 생활 방침(초점)에 따라 14일짜리 활동 하나를 고르고 적용한다. 위급하면 방침보다 생존이 먼저다.
import type { ActivityDef } from './contentTypes';
import type { FocusType, RunState } from './types';
import { evalCond } from './conditions';
import { pick, weighted } from './rng';
import { ACTIVITIES, actById } from '../content/activities';
import { regionById } from '../content/world';
import { pathById } from '../content/progression';
import { applyEffects, fact, type Ctx } from './engineContext';

type Tag = ActivityDef['tags'][number];

const FOCUS_WEIGHTS: Record<FocusType, Partial<Record<Tag, number>>> = {
  FOCUS_LIVELIHOOD: { work: 6, supply: 1, rest: 1.5, train: 1, care: 0.5, investigate: 0.5 },
  FOCUS_STABILITY: { rest: 4, supply: 2, care: 1.5, work: 1.5, train: 0.5 },
  FOCUS_TRAINING: { train: 6, work: 1.5, rest: 1.5, investigate: 1, supply: 0.5 },
  FOCUS_RELATIONSHIP: { care: 5, work: 2, rest: 1.5, train: 1 },
  FOCUS_INVESTIGATION: { investigate: 5, train: 2, work: 1.5, rest: 1 },
};

/** 길마다 주로 기르는 숙련 */
const PATH_MASTERY: Record<string, string[]> = {
  PATH_01_AUTHORITY: ['MST_FIELD', 'MST_RULE'],
  PATH_02_SEALING: ['MST_SEAL', 'MST_BOUND'],
  PATH_03_ABYSS: ['MST_RULE'],
  PATH_04_NIGHT: ['MST_FIELD'],
  PATH_05_BOUNDARY: ['MST_BOUND'],
  PATH_06_SANCTUARY: ['MST_SEAL'],
  PATH_07_RECORD_DIRECTOR: ['MST_RULE'],
  PATH_08_FIXER_SYNDICATE: ['MST_FIELD', 'MST_RULE'],
  PATH_09_HIVE_SOVEREIGN: ['MST_BOUND', 'MST_FIELD'],
  PATH_10_URBAN_MYTH: ['MST_RULE', 'MST_BOUND'],
};

const REGION_WAGE: Record<string, number> = { REG_SAFE_ZONE: 1.7, REG_ORDINARY_CITY: 1, REG_FOG_PORT: 0.95, REG_BLOCKADE_ZONE: 0.9, REG_BEYOND_MAP: 1.2 };

/** 몸을 유지하는 데 생활비가 들지 않는 형태 */
export const NO_UPKEEP_FORMS = ['FORM_06_SANCTUARY', 'FORM_07_STORY_ECHO', 'FORM_11_CONCEPT'];

export function monthlyCost(s: RunState): number {
  if (NO_UPKEEP_FORMS.includes(s.run.person.form_id)) return 0;
  return regionById(s.run.person.region_id).monthlyCost;
}

/** 이만큼 밀리면 깊은 빚이다 */
export const DEEP_ARREARS = 500;

/** 갚지 못하고 밀린 돈. 처음부터 진 빚(배경)은 빼고 센다 */
export function arrears(s: RunState): number {
  const p = s.run.person;
  const base = p.initial_debt > 0 && !p.initial_debt_cleared ? p.initial_debt : 0;
  return Math.max(0, -p.resources.KRW - base);
}

export function chooseActivity(s: RunState): ActivityDef {
  const p = s.run.person;
  const r = p.resources;
  const pool = ACTIVITIES.filter((a) => evalCond(s, a.eligible));
  const has = (id: string) => pool.find((a) => a.id === id);

  // 위급 상황
  if (r.HP < 45) return has('ACT_07_CLINIC_CARE') ?? has('ACT_06_REST_HOME') ?? pool[0];
  // 깊은 빚에 쫓기면 쉬는 것도 사치다. 쓰러지기 직전까지 일하러 나간다.
  const hounded = arrears(s) >= DEEP_ARREARS;
  if (r.FAT >= (hounded ? 95 : 75)) return has('ACT_06_REST_HOME') ?? pool[0];
  if (r.SUP < 1 && r.KRW >= 150 && has('ACT_08_BUY_SUPPLIES')) return has('ACT_08_BUY_SUPPLIES')!;

  const fw = FOCUS_WEIGHTS[s.run.life_plan.focus];
  const cost = monthlyCost(s);
  const broke = r.KRW < cost;
  const pathMst = p.path_id ? PATH_MASTERY[p.path_id] ?? [] : [];
  const weight = (a: ActivityDef) => {
    let w = Math.max(...a.tags.map((t) => fw[t] ?? 0.3));
    if (a.tags.includes('work') && broke) w *= r.KRW < 0 ? 10 : 4;
    if (r.KRW < 0 && !a.tags.includes('work')) w *= 0.4;
    if (a.tags.includes('rest') && r.FAT < 25 && r.HP >= 85) w *= 0.2;
    if (a.tags.includes('rest') && hounded) w *= 0.2;
    if (a.id === 'ACT_07_CLINIC_CARE' && r.HP >= 70) w *= 0.3;
    if (a.id === 'ACT_08_BUY_SUPPLIES' && r.SUP >= 6) w *= 0.2;
    if (a.trains && pathMst.includes(a.trains)) w *= 1.6;
    if (a.trains && p.masteries[a.trains] >= 95) w *= 0.3;
    if (a.id === 'ACT_04_AGENCY_DUTY') w *= 3;
    if (a.id === 'ACT_14_NIGHT_HUNT') w *= 3;
    if (a.id === 'ACT_15_HIVE_SYNC') w *= 3;
    if (a.id === 'ACT_05_FIXER_ERRAND') w *= p.path_id === 'PATH_08_FIXER_SYNDICATE' || r.KRW < 0 ? 2 : 0.5;
    if (a.id === 'ACT_03_BLOCKADE_SCAVENGE') w *= 2;
    return w;
  };
  return weighted(s.rng, 'world', pool, weight) ?? pool[0] ?? actById('ACT_06_REST_HOME')!;
}

/** 활동 하나를 14일 동안 수행한다. 기록은 묶음 요약으로 모인다. */
export function runActivity(ctx: Ctx) {
  const s = ctx.s;
  const a = chooseActivity(s);
  const b = ctx.bundle;
  b.acts[a.id] = (b.acts[a.id] ?? 0) + 1;
  b.texts[a.id] = pick(s.rng, 'world', a.texts);

  applyEffects(ctx, a.cost);
  const reward = { ...a.reward };
  let earned = (reward.KRW ?? 0) > 0;
  if (a.wage) {
    reward.KRW = a.wage(s);
    earned = true;
  }
  // 비싼 동네일수록 보수도 높다
  if (reward.KRW && reward.KRW > 0 && a.tags.includes('work')) reward.KRW = Math.round(reward.KRW * (REGION_WAGE[s.run.person.region_id] ?? 1));
  applyEffects(ctx, reward, { diminish: true });
  if (a.id === 'ACT_06_REST_HOME' && s.run.person.form_id === 'FORM_02_NIGHT_HUNTER') applyEffects(ctx, { HP: 6 });
  s.run.current_activity = {
    activity_id: a.id,
    started_at_minute: s.run.clock.virtual_minute,
    total_duration_minutes: 20160,
    elapsed_minutes: 20160,
    applied_cost_ratio: 1,
  };
  return { activity: a, earned };
}

export function recordRent(ctx: Ctx, earned: boolean) {
  const s = ctx.s;
  if (!earned) return;
  fact(ctx, { type: 'activity_completed', data: { earned: true, rentPaid: s.run.person.resources.KRW >= 0 } });
}

/** 한 해의 활동들을 한 단락으로 */
export function summarizeBundle(ctx: Ctx): { title: string; body: string } | null {
  const b = ctx.bundle;
  const ids = Object.keys(b.acts);
  if (!ids.length) return null;
  ids.sort((x, y) => b.acts[y] - b.acts[x]);
  const main = actById(ids[0])!;
  const others = ids.slice(1, 4).map((id) => `${actById(id)!.name} ${b.acts[id] * 2}주`);
  const body = b.texts[ids[0]] + (others.length ? ` 그 밖에 ${others.join(', ')}를 보냈습니다.` : '');
  return { title: `한 해 · ${main.name} ${b.acts[ids[0]] * 2}주`, body };
}

export function pathMasteries(pathId: string | null): string[] {
  if (!pathId || !pathById(pathId)) return [];
  return PATH_MASTERY[pathId] ?? [];
}
