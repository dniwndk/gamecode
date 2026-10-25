// 화면이 읽는 값은 모두 여기서 나간다. 아직 얻지 못한 업적의 해금 조건 원문, 숨은 판정 수치는 내보내지 않는다.
import type { Cond } from './contentTypes';
import type { ProfileArchive, RunState } from './types';
import { APT_LABEL, MST_LABEL, describeCond, evalCond } from './conditions';
import { maxHp } from './engineContext';
import { monthlyCost } from './lifePlanner';
import { ageNow, positionName } from './summary';
import { won } from './text';
import { ACHIEVEMENTS, TIER_LABEL } from '../content/achievements';
import { bgById } from '../content/backgrounds';
import { capById } from '../content/capabilities';
import { FOCUS_LABEL, CRISIS_LABEL } from '../content/activities';
import { clueById, regionById } from '../content/world';
import { formById, pathById } from '../content/progression';
import { CONTRACT_LABEL, CONTRACT_STATUS } from './engineContext';

export interface Bar {
  key: string;
  label: string;
  value: number;
  max: number;
  text: string;
  tone: 'hp' | 'fat' | 'krw' | 'sup';
}

export function resourceBars(s: RunState): Bar[] {
  const r = s.run.person.resources;
  const mh = maxHp(s);
  return [
    { key: 'HP', label: '건강', value: Math.max(0, r.HP), max: mh, text: `${Math.max(0, r.HP)}/${mh}`, tone: 'hp' },
    { key: 'FAT', label: '피로', value: r.FAT, max: 100, text: `${r.FAT}`, tone: 'fat' },
    { key: 'KRW', label: '자금', value: Math.max(0, Math.min(r.KRW, 3000)), max: 3000, text: won(r.KRW), tone: 'krw' },
    { key: 'SUP', label: '물자', value: r.SUP, max: 25, text: `${r.SUP}`, tone: 'sup' },
  ];
}

export function personView(s: RunState) {
  const p = s.run.person;
  const bg = bgById(p.background_id);
  const region = regionById(p.region_id);
  const path = p.path_id ? pathById(p.path_id) : null;
  return {
    name: p.name,
    age: ageNow(s),
    background: bg.name,
    backgroundSummary: bg.summary,
    region: region.name,
    regionText: region.description,
    regionRisk: region.riskLabel,
    monthlyCost: monthlyCost(s),
    form: formById(p.form_id).name,
    formText: formById(p.form_id).survival,
    isHuman: p.form_id === 'FORM_01_HUMAN',
    position: positionName(s),
    pathApex: path?.apex ?? null,
    lifeStatus: s.run.life_status,
    bodies: p.bodies_count,
    beacons: p.beacons,
    aptitudes: (Object.keys(APT_LABEL) as Array<keyof typeof APT_LABEL>).map((k) => ({ key: k, label: APT_LABEL[k], value: p.aptitudes[k] })),
    masteries: (Object.keys(MST_LABEL) as Array<keyof typeof MST_LABEL>).map((k) => ({ key: k, label: MST_LABEL[k], value: p.masteries[k] })),
    capabilities: p.capabilities.map((id) => {
      const c = capById(id);
      return { id, name: c?.name ?? id, effect: c?.effect ?? '', limit: c?.limit ?? '' };
    }),
    clues: p.knowledge_observations.map((id) => ({ id, label: clueById(id)?.label ?? id, text: clueById(id)?.text ?? '' })),
    relationships: Object.values(s.run.relationships)
      .filter((r) => r.met)
      .map((r) => ({ id: r.npc_id, label: r.label, trust: r.trust, alive: r.is_alive })),
    contracts: s.run.contracts.map((c) => ({ id: c.contract_id, label: CONTRACT_LABEL[c.contract_id] ?? c.contract_id, status: CONTRACT_STATUS[c.status] ?? c.status, active: c.status === 'active' })),
    marks: p.scars_and_marks,
    focus: FOCUS_LABEL[s.run.life_plan.focus],
    crisis: CRISIS_LABEL[s.run.life_plan.crisis_priority],
  };
}

/** 조건을 한 줄씩 풀고 충족 여부를 붙인다 */
export function conditionLines(s: RunState, c: Cond | undefined): Array<{ text: string; met: boolean }> {
  if (!c) return [];
  const parts = 'all' in c ? c.all : [c];
  return parts.map((x) => ({ text: describeCond(x), met: evalCond(s, x) })).filter((x) => x.text);
}

export function goalView(s: RunState) {
  const p = s.run.person;
  if (!p.path_id) {
    return {
      hasPath: false as const,
      title: '아직 정한 길이 없습니다',
      text: '괴담에서 살아 돌아오고 숙련을 쌓으면, 어느 날 누군가 당신에게 명함을 내밉니다. 제안을 받아들이면 그 길의 계단이 열립니다.',
      clears: s.run.counters.clears ?? 0,
    };
  }
  const path = pathById(p.path_id)!;
  const nextTier = p.position_tier < 4 ? path.tiers[p.position_tier + 1] : null;
  return {
    hasPath: true as const,
    apex: path.apex,
    apexPower: path.apexPower,
    tier: p.position_tier,
    tiers: path.tiers.slice(1).map((t, i) => ({ name: t.name, reached: p.position_tier >= i + 1 })),
    next: nextTier ? { name: nextTier.name, lines: conditionLines(s, nextTier.req) } : null,
    clears: s.run.counters.clears ?? 0,
  };
}

export interface AchievementView {
  id: string;
  tier: number;
  tierLabel: string;
  title: string;
  hint: string;
  /** 얻은 적이 있을 때만 채워진다 */
  revealed?: string;
  earnedThisRun: boolean;
  earnedEver: boolean;
  watched: boolean;
}

export function achievementViews(profile: ProfileArchive, s: RunState | null): AchievementView[] {
  const thisRun = new Set(s?.run.achievements.map((a) => a.achievement_id) ?? []);
  return ACHIEVEMENTS.map((a) => {
    const ever = !!profile.achievements[a.id] || thisRun.has(a.id);
    return {
      id: a.id,
      tier: a.tier,
      tierLabel: TIER_LABEL[a.tier],
      title: a.title,
      hint: a.hint,
      revealed: ever ? a.revealed : undefined,
      earnedThisRun: thisRun.has(a.id),
      earnedEver: ever,
      watched: profile.watched.includes(a.id),
    };
  });
}

export function emptyProfile(): ProfileArchive {
  return { id: 'profile', achievements: {}, lives: [], watched: [] };
}

export function monthLabel(s: RunState): string {
  const minute = s.run.clock.virtual_minute;
  const frac = (minute % 525600) / 525600;
  return `${Math.floor(frac * 12) + 1}월`;
}

export function yearProgress(s: RunState): number {
  return (s.run.clock.virtual_minute % 525600) / 525600;
}
