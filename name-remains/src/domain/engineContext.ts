// 엔진 공용 작업대: 로그 쓰기, 효과 적용, 능력 부여, 경로 입문·승급. 판정 사실(facts)은 모아 두었다가 업적 판정기가 한 번에 본다.
import type { AchievementFact, Effects } from './contentTypes';
import type { LogKind, RunState, TimelineLog, YearAccumulator } from './types';
import { APT_LABEL, MINUTES_PER_YEAR, MST_LABEL, evalCond } from './conditions';
import { chance, type StreamName } from './rng';
import { CAPABILITIES, capName } from '../content/capabilities';
import { clueById, npcLabel, regionById } from '../content/world';
import { formById, pathById } from '../content/progression';
import { won } from './text';
import { injuryById } from '../content/injuries';

interface Snapshot {
  res: Record<string, number>;
  apt: Record<string, number>;
  mst: Record<string, number>;
}

/** 한 해의 생활을 한 줄로 묶기 위한 누적기. 결정 때문에 해가 끊겨도 이어지도록 상태에 둔다. */
export type BundleAcc = YearAccumulator;

export interface Ctx {
  s: RunState;
  facts: AchievementFact[];
  newLogs: TimelineLog[];
  notable: boolean;
  stream: StreamName;
  bundle: BundleAcc;
  /** 한 해 요약 문장 작성기(lifePlanner가 채운다) */
  summarize?: (ctx: Ctx) => { title: string; body: string } | null;
}

export function newCtx(s: RunState, stream: StreamName = 'world'): Ctx {
  s.run.year_acc ??= { acts: {}, texts: {}, sum: {} };
  return { s, facts: [], newLogs: [], notable: false, stream, bundle: s.run.year_acc };
}

export function takeSnapshot(s: RunState): Snapshot {
  const p = s.run.person;
  return { res: { ...p.resources }, apt: { ...p.aptitudes }, mst: { ...p.masteries } };
}

const SUM_ORDER: Array<[string, string]> = [
  ['res.HP', '건강'],
  ['res.FAT', '피로'],
  ['res.KRW', '자금'],
  ['res.SUP', '물자'],
  ...(Object.entries(APT_LABEL).map(([k, v]) => [`apt.${k}`, v]) as Array<[string, string]>),
  ...(Object.entries(MST_LABEL).map(([k, v]) => [`mst.${k}`, v]) as Array<[string, string]>),
];

/** 스냅숏 이후 생활로 바뀐 만큼을 한 해 누적치에 더한다 */
export function addSnapshotDiff(ctx: Ctx, snap: Snapshot) {
  const p = ctx.s.run.person;
  const sum = ctx.bundle.sum;
  const add = (k: string, v: number) => {
    if (v) sum[k] = (sum[k] ?? 0) + v;
  };
  for (const k of Object.keys(p.resources) as Array<keyof typeof p.resources>) add(`res.${k}`, p.resources[k] - snap.res[k]);
  for (const k of Object.keys(p.aptitudes) as Array<keyof typeof p.aptitudes>) add(`apt.${k}`, p.aptitudes[k] - snap.apt[k]);
  for (const k of Object.keys(p.masteries) as Array<keyof typeof p.masteries>) add(`mst.${k}`, p.masteries[k] - snap.mst[k]);
}

function sumDeltas(sum: Record<string, number>): string[] {
  const out: string[] = [];
  for (const [k, label] of SUM_ORDER) {
    const v = sum[k];
    if (!v) continue;
    out.push(`${label} ${v > 0 ? '+' : ''}${k === 'res.KRW' ? won(v) : v}`);
  }
  return out;
}

/** 쌓인 한 해의 생활을 요약 한 줄로 내보낸다 */
export function flushActivity(ctx: Ctx, extra: Partial<TimelineLog> = {}) {
  const b = ctx.bundle;
  if (!Object.keys(b.acts).length) return;
  const sum = ctx.summarize?.(ctx);
  const deltas = sumDeltas(b.sum);
  b.acts = {};
  b.texts = {};
  b.sum = {};
  if (sum) log(ctx, 'auto_activity', sum.body, { title: sum.title, deltas, tone: 'plain', ...extra });
}

export function monthOf(minute: number): number {
  return Math.floor(((minute % MINUTES_PER_YEAR) / MINUTES_PER_YEAR) * 12) + 1;
}

export function log(ctx: Ctx, kind: LogKind, body: string, extra: Partial<TimelineLog> = {}): TimelineLog {
  const r = ctx.s.run;
  r.auto_sequence += 1;
  const entry: TimelineLog = {
    log_id: `L${r.auto_sequence}`,
    virtual_minute: r.clock.virtual_minute,
    age_years: Math.floor(r.clock.current_age_years),
    month: monthOf(r.clock.virtual_minute),
    kind,
    body,
    ...extra,
  };
  r.timeline_logs.push(entry);
  ctx.newLogs.push(entry);
  if (kind !== 'auto_activity' && kind !== 'decision_taken') ctx.notable = true;
  return entry;
}

export function fact(ctx: Ctx, f: AchievementFact) {
  ctx.facts.push(f);
}

const AGELESS = ['FORM_04_ABYSS_ENVOY', 'FORM_06_SANCTUARY', 'FORM_07_STORY_ECHO', 'FORM_11_CONCEPT'];

/** 건강 상한. 늙는 몸은 쉰 살부터 조금씩 줄어든다. */
export function maxHp(s: RunState): number {
  const base = s.run.person.form_id === 'FORM_09_RELIC_HOST' ? 130 : 100;
  if (AGELESS.includes(s.run.person.form_id)) return base;
  const age = s.run.clock.current_age_years;
  const penalty = s.run.person.max_hp_penalty ?? 0;
  return Math.max(30, Math.max(50, Math.round(base - Math.max(0, age - 50) * 1.2)) - penalty);
}

/** 영구 상해를 남긴다. 이미 같은 상해가 있거나 개념체라면 아무 일도 없다. */
export function grantInjury(ctx: Ctx, id: string, out: string[]): boolean {
  const s = ctx.s;
  const p = s.run.person;
  const def = injuryById(id);
  if (!def || p.form_id === 'FORM_11_CONCEPT') return false;
  p.injuries ??= [];
  if (p.injuries.includes(id)) return false;
  p.injuries.push(id);
  out.push(`영구 상해: ${def.name}`);
  for (const [k, v] of Object.entries(def.apt ?? {}) as Array<[keyof typeof APT_LABEL, number]>) {
    const before = p.aptitudes[k];
    p.aptitudes[k] = clamp(before + v, 0, 10);
    if (p.aptitudes[k] !== before) out.push(`${APT_LABEL[k]} ${p.aptitudes[k] - before}`);
  }
  if (def.maxHp) {
    p.max_hp_penalty = (p.max_hp_penalty ?? 0) + def.maxHp;
    out.push(`최대 건강 -${def.maxHp}`);
    p.resources.HP = Math.min(p.resources.HP, maxHp(s));
  }
  if (def.lifespan) {
    s.run.clock.max_lifespan_years -= def.lifespan;
    out.push(`수명 한계 -${def.lifespan}년`);
  }
  for (const [k, v] of Object.entries(def.mst ?? {}) as Array<[keyof typeof MST_LABEL, number]>) {
    const before = p.masteries[k];
    p.masteries[k] = clamp(before + v, 0, 100);
    if (p.masteries[k] !== before) out.push(`${MST_LABEL[k]} ${p.masteries[k] - before}`);
  }
  fact(ctx, { type: 'action_resolved', data: { injury: id } });
  return true;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** 숙련이 높을수록 같은 수련의 효과가 급격히 줄어든다(소수점은 확률로 반올림) */
export function masteryGain(s: RunState, stream: StreamName, current: number, base: number, scale = 1): number {
  if (base <= 0) return base;
  const g = base * scale * Math.max(0.01, (1 - current / 100) ** 2);
  const whole = Math.floor(g);
  return whole + (chance(s.rng, stream, g - whole) ? 1 : 0);
}

export interface ApplyOpts {
  /** 일상 수련: 사건 보상보다 훨씬 천천히 오른다 */
  diminish?: boolean;
  /** 확률 판정 실패 시 위기 원칙에 따른 피해 배율 */
  damageScale?: number;
}

/** 효과를 적용하고 화면에 보일 증감 문구를 돌려준다 */
export function applyEffects(ctx: Ctx, eff: Effects | undefined, opts: ApplyOpts = {}): string[] {
  if (!eff) return [];
  const s = ctx.s;
  const p = s.run.person;
  const r = p.resources;
  const out: string[] = [];

  if (eff.HP) {
    let d = eff.HP;
    if (d < 0 && opts.damageScale) d = Math.round(d * opts.damageScale);
    if (d < 0 && p.form_id === 'FORM_11_CONCEPT') d = 0;
    if (d < 0 && p.form_id === 'FORM_08_CENSOR' && s.run.incident) {
      const threats = incidentThreats(s);
      if (threats.includes('TH_RULE')) d = Math.round(d * 0.3);
    }
    const before = r.HP;
    r.HP = Math.min(maxHp(s), r.HP + d);
    const real = r.HP - before;
    if (real !== 0) out.push(`건강 ${real > 0 ? '+' : ''}${real}`);
    if (real < 0 && s.run.incident) s.run.incident.damage_taken_in_incident += -real;
    p.min_hp_in_run = Math.min(p.min_hp_in_run, Math.max(0, r.HP));
  }
  if (eff.FAT) {
    const before = r.FAT;
    r.FAT = clamp(r.FAT + eff.FAT, 0, 100);
    const real = r.FAT - before;
    if (real !== 0) out.push(`피로 ${real > 0 ? '+' : ''}${real}`);
  }
  if (eff.KRW) {
    r.KRW += eff.KRW;
    out.push(`자금 ${eff.KRW > 0 ? '+' : ''}${won(eff.KRW)}`);
    checkDebt(ctx);
  }
  if (eff.SUP) {
    const before = r.SUP;
    r.SUP = clamp(r.SUP + eff.SUP, 0, 25);
    const real = r.SUP - before;
    if (real !== 0) out.push(`물자 ${real > 0 ? '+' : ''}${real}`);
    if (real < 0 && s.run.incident) s.run.incident.supplies_spent += -real;
  }
  if (eff.apt) {
    for (const [k, v] of Object.entries(eff.apt) as Array<[keyof typeof APT_LABEL, number]>) {
      const before = p.aptitudes[k];
      p.aptitudes[k] = clamp(before + v, 0, 10);
      if (p.aptitudes[k] !== before) out.push(`${APT_LABEL[k]} ${v > 0 ? '+' : ''}${p.aptitudes[k] - before}`);
    }
  }
  if (eff.aptChance) {
    for (const a of eff.aptChance) {
      // 적성은 높을수록 오르기 어렵다(7을 넘기면 거의 오르지 않는다)
      const room = (10 - p.aptitudes[a.apt]) / 10;
      // 일상 활동은 보름마다 쌓이므로 사건·선택보다 훨씬 느리게 반영한다
      const pace = opts.diminish ? 0.25 : 1;
      if (p.aptitudes[a.apt] >= 10) continue;
      if (opts.diminish) {
        if (chance(s.rng, ctx.stream, a.p * pace * room ** 2)) {
          p.aptitudes[a.apt] += 1;
          out.push(`${APT_LABEL[a.apt]} +1`);
        }
        continue;
      }
      // 선택의 결과는 운에 맡기지 않고 경험으로 쌓는다: 경험이 다 차면 적성이 1 오른다
      const xp = (p.apt_xp ??= {});
      const gain = Math.max(0.01, a.p * room ** 2);
      const total = (xp[a.apt] ?? 0) + gain;
      if (total >= 1) {
        p.aptitudes[a.apt] += 1;
        xp[a.apt] = Math.round((total - 1) * 1000) / 1000;
        out.push(`${APT_LABEL[a.apt]} +1`);
      } else {
        xp[a.apt] = Math.round(total * 1000) / 1000;
        out.push(`${APT_LABEL[a.apt]} 경험 +${Math.max(1, Math.round(gain * 100))}%`);
      }
    }
  }
  if (eff.mst) {
    for (const [k, v] of Object.entries(eff.mst) as Array<[keyof typeof MST_LABEL, number]>) {
      const before = p.masteries[k];
      if (v > 0 && !opts.diminish) {
        // 선택의 결과는 운에 맡기지 않는다: 1에 못 미치는 몫은 경험으로 남겨 다음에 더한다
        const xp = (p.mst_xp ??= {});
        const inc = v * Math.max(0.01, (1 - before / 100) ** 2);
        const g = inc + (xp[k] ?? 0);
        const whole = Math.floor(g);
        xp[k] = Math.round((g - whole) * 1000) / 1000;
        p.masteries[k] = clamp(before + whole, 0, 100);
        const real = p.masteries[k] - before;
        out.push(real > 0 ? `${MST_LABEL[k]} +${real}` : `${MST_LABEL[k]} 경험 +${Math.max(1, Math.round(inc * 100))}%`);
        continue;
      }
      const gain = masteryGain(s, ctx.stream, before, v, opts.diminish ? 0.12 : 1);
      p.masteries[k] = clamp(before + gain, 0, 100);
      const real = p.masteries[k] - before;
      if (real !== 0) out.push(`${MST_LABEL[k]} ${real > 0 ? '+' : ''}${real}`);
    }
    fact(ctx, { type: 'mastery_increased' });
  }
  if (eff.clues) {
    for (const c of eff.clues) {
      if (!p.knowledge_observations.includes(c)) {
        p.knowledge_observations.push(c);
        out.push(`단서: ${clueById(c)?.label ?? c}`);
      }
    }
  }
  if (eff.meet) {
    for (const id of eff.meet) {
      const rel = s.run.relationships[id];
      if (rel && !rel.met && rel.is_alive) {
        rel.met = true;
        out.push(`새 인연: ${rel.label}`);
      }
    }
  }
  if (eff.trust) {
    for (const [id, v] of Object.entries(eff.trust)) {
      const rel = s.run.relationships[id];
      if (!rel || !rel.is_alive) continue;
      rel.met = true;
      const before = rel.trust;
      rel.trust = clamp(rel.trust + v, -100, 100);
      if (rel.trust !== before) out.push(`${rel.label} 신뢰 ${v > 0 ? '+' : ''}${rel.trust - before}`);
    }
  }
  if (eff.allyLost) {
    const rel = s.run.relationships[eff.allyLost];
    if (rel && rel.is_alive) {
      rel.is_alive = false;
      out.push(`${rel.label} 실종`);
    }
  }
  if (eff.form && eff.form !== p.form_id) setForm(ctx, eff.form, out);
  if (eff.bodies) {
    p.bodies_count = clamp(p.bodies_count + eff.bodies, 1, 7);
    out.push(`몸 ${p.bodies_count}구`);
  }
  if (eff.witness) {
    p.witness_count = clamp(p.witness_count + eff.witness, 0, 100);
  }
  if (eff.domain) p.domain_integrity = clamp(p.domain_integrity + eff.domain, 0, 100);
  if (eff.beacons) {
    // 표식은 오래된 것부터 지워져 다섯 개까지만 유지된다
    const next = clamp(p.beacons + eff.beacons, 0, 5);
    if (next !== p.beacons) out.push(`귀환 표식 ${next}개`);
    p.beacons = next;
  }
  if (eff.injury) grantInjury(ctx, eff.injury, out);
  if (eff.lifespan) {
    s.run.clock.max_lifespan_years += eff.lifespan;
    out.push(`수명 한계 ${eff.lifespan > 0 ? '+' : ''}${eff.lifespan}년`);
  }
  if (eff.region && eff.region !== p.region_id) {
    p.region_id = eff.region;
    out.push(`거주지: ${regionById(eff.region).name}`);
    fact(ctx, { type: 'region_changed' });
  }
  if (eff.contracts) {
    for (const c of eff.contracts) {
      const existing = s.run.contracts.find((k) => k.contract_id === c.id);
      const deadline = c.deadlineYears ? s.run.clock.virtual_minute + Math.round(c.deadlineYears * MINUTES_PER_YEAR) : null;
      if (existing) {
        if (existing.status !== c.status) {
          existing.status = c.status;
          fact(ctx, { type: 'contract_resolved', data: { contract_id: c.id, resolution: c.status } });
        }
      } else s.run.contracts.push({ contract_id: c.id, status: c.status, deadline_minute: deadline });
      out.push(CONTRACT_LABEL[c.id] ? `계약: ${CONTRACT_LABEL[c.id]} (${CONTRACT_STATUS[c.status]})` : '');
    }
  }
  if (eff.flags) Object.assign(s.run.milestones, eff.flags);
  if (eff.local && s.run.incident) Object.assign(s.run.incident.local_flags, eff.local);
  if (eff.counters) for (const [k, v] of Object.entries(eff.counters)) s.run.counters[k] = (s.run.counters[k] ?? 0) + v;
  if (eff.world) Object.assign(s.run.world, eff.world);
  if (eff.scar) p.scars_and_marks.push(eff.scar);
  if (eff.marks) p.scars_and_marks.push(...eff.marks);
  if (eff.defense) s.run.world.defense_bonus = clamp(s.run.world.defense_bonus + eff.defense, -0.2, 0.2);
  if (eff.caps) for (const c of eff.caps) if (grantCap(ctx, c, true)) out.push(`능력: ${capName(c)}`);
  if (eff.loseCaps) {
    for (const c of eff.loseCaps) {
      const i = p.capabilities.indexOf(c);
      if (i >= 0) {
        p.capabilities.splice(i, 1);
        out.push(`능력 상실: ${capName(c)}`);
      }
    }
  }
  if (eff.joinPath) joinPath(ctx, eff.joinPath.path, eff.joinPath.tier);
  return out.filter(Boolean);
}

export const CONTRACT_LABEL: Record<string, string> = {
  CTR_RETURN_PROMISE: '두 사람의 귀가 약속',
  CTR_UNFINISHED_ARBITER: '미완의 사후 조항',
  CTR_OFFERING: '대리 제물 지정',
  CTR_TEMP_UNDYING: '시한부 불사',
};
export const CONTRACT_STATUS: Record<string, string> = { active: '유효', fulfilled: '이행', breached: '위반', nullified: '무효' };

function incidentThreats(s: RunState): string[] {
  // 지연 import를 피하려고 사건 위협 태그는 incident local에 넣어 둔다
  return (s.run.incident?.local_flags.__threats as string | undefined)?.split(',') ?? [];
}

function checkDebt(ctx: Ctx) {
  const p = ctx.s.run.person;
  if (p.initial_debt > 0 && !p.initial_debt_cleared && p.resources.KRW >= 0) {
    p.initial_debt_cleared = true;
    log(ctx, 'milestone', '처음부터 따라다니던 빚 문서의 숫자가 0이 되었습니다. 오늘 새벽은 독촉 문자 없이 밝았습니다.', { title: '부채 청산', tone: 'gold' });
    fact(ctx, { type: 'debt_cleared' });
  }
}

export function setForm(ctx: Ctx, form: string, out?: string[]) {
  const s = ctx.s;
  const p = s.run.person;
  if (p.form_id === 'FORM_01_HUMAN' && form !== 'FORM_01_HUMAN') {
    for (const rel of Object.values(s.run.relationships)) if (rel.trust >= 20) rel.pre_mutation_bond = true;
  }
  p.form_id = form;
  if (form === 'FORM_05_HIVE_CORE') p.bodies_count = Math.max(p.bodies_count, 1);
  if (form === 'FORM_09_RELIC_HOST') p.relic_guard_ready = true;
  if (form === 'FORM_10_PAPER_EFFIGY') p.effigy_ready = true;
  if (form === 'FORM_07_STORY_ECHO') p.witness_count = Math.max(p.witness_count, 20);
  out?.push(`형태: ${formById(form).name}`);
  log(ctx, 'milestone', `몸이 바뀌었습니다. 이제 당신은 「${formById(form).name}」입니다. ${formById(form).survival}`, { title: '존재 형태 변화', tone: 'boundary' });
}

export function grantCap(ctx: Ctx, id: string, quiet = false): boolean {
  const p = ctx.s.run.person;
  if (p.capabilities.includes(id)) return false;
  p.capabilities.push(id);
  if (id === 'CAP_25_EFFIGY_SUBSTITUTE') p.effigy_ready = true;
  if (id === 'CAP_13_TEMP_UNDYING') {
    const old = ctx.s.run.contracts.find((c) => c.contract_id === 'CTR_TEMP_UNDYING');
    const deadline = ctx.s.run.clock.virtual_minute + MINUTES_PER_YEAR;
    if (old) {
      old.status = 'active';
      old.deadline_minute = deadline;
    } else ctx.s.run.contracts.push({ contract_id: 'CTR_TEMP_UNDYING', status: 'active', deadline_minute: deadline });
  }
  const def = CAPABILITIES.find((c) => c.id === id);
  if (!quiet || def) log(ctx, 'milestone', def ? `${def.effect}` : id, { title: `능력 획득 · ${capName(id)}`, tone: 'gold', sound: 'bell' });
  fact(ctx, { type: 'capability_granted', capability_id: id });
  return true;
}

export function joinPath(ctx: Ctx, pathId: string, tier: number) {
  const s = ctx.s;
  const p = s.run.person;
  const path = pathById(pathId);
  if (!path) return;
  if (p.path_id === pathId && p.position_tier >= tier) return;
  const switching = p.path_id !== null && p.path_id !== pathId;
  p.path_id = pathId;
  p.position_tier = tier;
  const t = path.tiers[tier];
  p.position_id = t.position_id;
  log(ctx, 'milestone', `${switching ? '걸어온 길을 바꾸었습니다. ' : ''}${t.blurb} 이 길의 끝에는 「${path.apex}」의 자리가 있습니다.`, { title: `길에 들어섬 · ${t.name}`, tone: 'gold', sound: 'bell' });
  for (const c of t.grants ?? []) grantCap(ctx, c);
  if (t.effects) applyEffects(ctx, t.effects);
  fact(ctx, { type: 'position_granted', data: { position_id: t.position_id } });
}

/** 다음 단계 조건을 넘었으면 한 단계 승급 */
export function checkPromotion(ctx: Ctx): boolean {
  const p = ctx.s.run.person;
  if (!p.path_id || p.position_tier >= 4) return false;
  const path = pathById(p.path_id)!;
  const nextTier = path.tiers[p.position_tier + 1];
  if (!nextTier.req || !evalCond(ctx.s, nextTier.req)) return false;
  p.position_tier += 1;
  p.position_id = nextTier.position_id;
  log(ctx, 'milestone', nextTier.blurb, { title: `승급 · ${nextTier.name}`, tone: 'gold', sound: 'bell' });
  for (const c of nextTier.grants ?? []) grantCap(ctx, c);
  if (nextTier.effects) applyEffects(ctx, nextTier.effects);
  fact(ctx, { type: 'position_granted', data: { position_id: nextTier.position_id } });
  return true;
}

/** 숙련·적성·인연 기준을 넘으면 저절로 깨치는 능력 */
export function checkAutoGrants(ctx: Ctx) {
  const s = ctx.s;
  for (const c of CAPABILITIES) {
    if (c.autoGrant && !s.run.person.capabilities.includes(c.id) && evalCond(s, c.autoGrant)) grantCap(ctx, c.id);
  }
  const anchor = Object.values(s.run.relationships).some((r) => r.is_alive && r.trust >= 50);
  const has = s.run.person.capabilities.includes('CAP_27_VOICE_ANCHOR');
  if (anchor && !has) {
    grantCap(ctx, 'CAP_27_VOICE_ANCHOR');
    s.run.milestones.has_recorder = true;
  } else if (has && !Object.values(s.run.relationships).some((r) => r.is_alive && r.trust >= 25)) {
    s.run.person.capabilities = s.run.person.capabilities.filter((c) => c !== 'CAP_27_VOICE_ANCHOR');
    log(ctx, 'milestone', '휴대폰 속 녹음 파일을 틀어도 더는 마음이 붙잡히지 않습니다. 그 목소리와의 사이가 멀어졌습니다.', { title: '능력 상실 · 일상의 목소리 닻', tone: 'quiet' });
  }
}

export { npcLabel };
