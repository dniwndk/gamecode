// 조건 평가기와 조건 설명문. 같은 조건 데이터로 판정도 하고 화면에 "조건: 관찰 4 이상"도 쓴다.
import type { Cond } from './contentTypes';
import type { Apt, Mst, Res, RunState } from './types';
import { capName } from '../content/capabilities';
import { clueById, npcLabel, regionById } from '../content/world';
import { bgById } from '../content/backgrounds';
import { formById, pathById } from '../content/progression';

export const APT_LABEL: Record<Apt, string> = { OBS: '관찰', NEG: '교섭', PRC: '실무', RES: '감응' };
export const MST_LABEL: Record<Mst, string> = { MST_FIELD: '현장 대응', MST_SEAL: '봉인술', MST_RULE: '규칙·계약 해석', MST_BOUND: '경계 감각' };
export const RES_LABEL: Record<Res, string> = { HP: '건강', FAT: '피로', KRW: '자금', SUP: '물자' };

const YEAR = 525600;

export function evalCond(s: RunState, c: Cond | undefined): boolean {
  if (!c) return true;
  const p = s.run.person;
  if ('all' in c) return c.all.every((x) => evalCond(s, x));
  if ('any' in c) return c.any.some((x) => evalCond(s, x));
  if ('not' in c) return !evalCond(s, c.not);
  if ('apt' in c) return p.aptitudes[c.apt] >= c.min;
  if ('mst' in c) return p.masteries[c.mst] >= c.min;
  if ('res' in c) {
    const v = p.resources[c.res];
    return (c.min === undefined || v >= c.min) && (c.max === undefined || v <= c.max);
  }
  if ('cap' in c) return p.capabilities.includes(c.cap);
  if ('clue' in c) return p.knowledge_observations.includes(c.clue);
  if ('bg' in c) return Array.isArray(c.bg) ? c.bg.includes(p.background_id) : p.background_id === c.bg;
  if ('form' in c) return Array.isArray(c.form) ? c.form.includes(p.form_id) : p.form_id === c.form;
  if ('region' in c) return Array.isArray(c.region) ? c.region.includes(p.region_id) : p.region_id === c.region;
  if ('path' in c) return p.path_id === c.path && p.position_tier >= (c.tier ?? 1);
  if ('tierMin' in c) return p.path_id !== null && p.position_tier >= c.tierMin;
  if ('noPath' in c) return p.path_id === null;
  if ('trust' in c) {
    const r = s.run.relationships[c.trust];
    return !!r && r.is_alive && r.trust >= c.min;
  }
  if ('flag' in c) return !!s.run.milestones[c.flag];
  if ('counter' in c) return (s.run.counters[c.counter] ?? 0) >= c.min;
  if ('age' in c) {
    const a = s.run.clock.current_age_years;
    return (c.age.min === undefined || a >= c.age.min) && (c.age.max === undefined || a <= c.age.max);
  }
  if ('incidentDone' in c) return s.run.incident_history.some((h) => h.incident_id === c.incidentDone && h.survived);
  if ('contract' in c) {
    const k = s.run.contracts.find((x) => x.contract_id === c.contract);
    if (!k) return false;
    return c.status ? k.status === c.status : true;
  }
  if ('lifeStatus' in c) return s.run.life_status === c.lifeStatus;
  if ('local' in c) {
    const v = s.run.incident?.local_flags[c.local];
    return c.eq === undefined ? !!v : v === c.eq;
  }
  if ('variant' in c) return s.run.incident?.variant_id === c.variant;
  if ('focus' in c) return s.run.life_plan.focus === c.focus;
  if ('crisis' in c) return s.run.life_plan.crisis_priority === c.crisis;
  if ('fn' in c) return c.fn(s);
  return false;
}

/** 조건을 사람이 읽는 문장으로 */
export function describeCond(c: Cond | undefined): string {
  if (!c) return '';
  if ('all' in c) return c.all.map(describeCond).filter(Boolean).join(' 그리고 ');
  if ('any' in c) return c.any.map((x) => ('all' in x ? `(${describeCond(x)})` : describeCond(x))).join(' 또는 ');
  if ('not' in c) return `${describeCond(c.not)} 아님`;
  if ('apt' in c) return `${APT_LABEL[c.apt]} ${c.min} 이상`;
  if ('mst' in c) return `${MST_LABEL[c.mst]} ${c.min} 이상`;
  if ('res' in c) {
    const label = RES_LABEL[c.res];
    const unit = c.res === 'KRW' ? '만원' : '';
    if (c.min !== undefined && c.max !== undefined) return `${label} ${c.min}~${c.max}${unit}`;
    if (c.min !== undefined) return `${label} ${c.min.toLocaleString('ko-KR')}${unit} 이상`;
    return c.res === 'KRW' && c.max !== undefined && c.max < 0 ? '빚이 있음' : `${label} ${c.max}${unit} 이하`;
  }
  if ('cap' in c) return `능력 「${capName(c.cap)}」`;
  if ('clue' in c) return `단서 「${clueById(c.clue)?.label ?? c.clue}」`;
  if ('bg' in c) return `출생 「${(Array.isArray(c.bg) ? c.bg : [c.bg]).map((b) => bgById(b).name).join('·')}」`;
  if ('form' in c) return `형태 「${(Array.isArray(c.form) ? c.form : [c.form]).map((f) => formById(f).name).join('·')}」`;
  if ('region' in c) return `${(Array.isArray(c.region) ? c.region : [c.region]).map((r) => regionById(r).name).join('·')}에 거주`;
  if ('path' in c) {
    const p = pathById(c.path);
    const tier = p?.tiers[c.tier ?? 1];
    return `직위 「${tier?.name ?? p?.apex}」 이상`;
  }
  if ('tierMin' in c) return `직위 ${c.tierMin}단계 이상`;
  if ('noPath' in c) return '아직 정한 길이 없음';
  if ('trust' in c) return `${npcLabel(c.trust)} 신뢰 ${c.min} 이상`;
  if ('flag' in c) return '특정 경험';
  if ('counter' in c) return c.counter === 'clears' ? `사건 ${c.min}회 이상 생환` : '경험 누적';
  if ('age' in c) return c.age.min !== undefined ? `${c.age.min}세 이상` : `${c.age.max}세 이하`;
  if ('incidentDone' in c) return '특정 사건 생환';
  if ('contract' in c) return '특정 계약';
  if ('lifeStatus' in c) return c.lifeStatus === 'postmortem' ? '사후 상태' : '';
  if ('local' in c) return '현장 상황';
  if ('variant' in c) return '';
  if ('focus' in c) return '생활 방침';
  if ('crisis' in c) return '위기 원칙';
  if ('fn' in c) return c.label;
  return '';
}

export const yearsToMinutes = (y: number) => Math.round(y * YEAR);
export const MINUTES_PER_YEAR = YEAR;
