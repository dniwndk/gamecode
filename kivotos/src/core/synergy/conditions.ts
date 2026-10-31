// 이스터에그 시너지의 발동 조건(docs/GDD_v2.3_amendment.md 1장·12.2). 구성원 수만 세는 보통 시너지와 달리
// 성급(3성)이나 편성 전체를 봐야 하는 것만 여기서 판정한다. 효과 실행은 M3의 몫이고, 여기서는 "켜졌는가"만 정한다.
// 순수 함수: 입력을 고치지 않는다.
import type { ContentPack } from '../types/content';

/** 출전 중인 학생 한 명(전방·후방) */
export interface DeployedUnit {
  unitId: string;
  star: number;
}

export interface SynergyConditionResult {
  /** 진행도로 보여 줄 수(구성원 수, 진영 수 등) */
  count: number;
  /** 발동 조건을 모두 채웠는가 */
  met: boolean;
}

const ALL_THREE_STAR = new Set(['syn_plat_vanitas', 'syn_plat_ending_credits', 'syn_plat_tea_party', 'syn_plat_last_line']);
const CODENAME = 'syn_plat_codename';
const CODENAME_THREE_STAR = ['u_neru', 'u_toki'];
export const SCHOOL_BATTLE = 'syn_plat_school_battle';
export const TOTAL_ASSAULT = 'syn_plat_total_assault';

/** 조건 판정이 필요한 시너지인가 */
export const hasSynergyCondition = (synergyId: string) =>
  ALL_THREE_STAR.has(synergyId) || synergyId === CODENAME || synergyId === SCHOOL_BATTLE || synergyId === TOTAL_ASSAULT;

/**
 * 조건이 있는 시너지의 진행도와 발동 여부. 조건이 없는 시너지는 null(구성원 수로 판정).
 * 각성 학생(AL-1S)은 원래 학생 자리로 센다(구성원 명단에 둘 다 있다).
 */
export function synergyCondition(pack: ContentPack, synergyId: string, deployed: readonly DeployedUnit[]): SynergyConditionResult | null {
  if (!hasSynergyCondition(synergyId)) return null;
  const syn = pack.synergies.find((s) => s.id === synergyId);
  if (!syn) return null;
  const threshold = syn.tiers[0]?.threshold ?? Infinity;
  const unitById = new Map(pack.units.map((u) => [u.id, u]));

  if (synergyId === SCHOOL_BATTLE) {
    const count = maxFactionMatching(pack, deployed);
    return { count, met: count >= threshold };
  }
  if (synergyId === TOTAL_ASSAULT) {
    const roleIds = pack.synergies.filter((s) => s.category === 'role').map((s) => s.id);
    const roles = new Set(deployed.flatMap((d) => unitById.get(d.unitId)?.synergyIds.filter((s) => roleIds.includes(s)) ?? []));
    const threeStars = deployed.filter((d) => d.star >= pack.rules.units.maxStar).length;
    return { count: threeStars, met: deployed.length >= threshold && threeStars === deployed.length && roleIds.every((r) => roles.has(r)) };
  }

  // 구성원 기반: 같은 학생은 한 번, 각성 학생은 원래 학생과 한 사람
  const best = new Map<string, number>();
  for (const d of deployed) {
    if (!syn.memberIds.includes(d.unitId)) continue;
    const key = unitById.get(d.unitId)?.awakenedFrom ?? d.unitId;
    best.set(key, Math.max(best.get(key) ?? 0, d.star));
  }
  const count = best.size;
  const maxStar = pack.rules.units.maxStar;
  const starOk = synergyId === CODENAME
    ? CODENAME_THREE_STAR.every((id) => (best.get(id) ?? 0) >= maxStar)
    : [...best.values()].every((s) => s >= maxStar);
  return { count, met: count >= threshold && starOk };
}

/** 출전 학생을 서로 다른 진영에 1명씩 짝지을 때 최대 짝 수(학원 대항전). 학생은 진영 1~2개라 증강 경로로 충분하다. */
function maxFactionMatching(pack: ContentPack, deployed: readonly DeployedUnit[]): number {
  const factionIds = new Set(pack.synergies.filter((s) => s.category === 'faction').map((s) => s.id));
  const unitById = new Map(pack.units.map((u) => [u.id, u]));
  const options = deployed.map((d) => (unitById.get(d.unitId)?.synergyIds ?? []).filter((s) => factionIds.has(s)));
  const owner = new Map<string, number>();
  const tryAssign = (i: number, seen: Set<string>): boolean => {
    for (const f of options[i]) {
      if (seen.has(f)) continue;
      seen.add(f);
      const cur = owner.get(f);
      if (cur === undefined || tryAssign(cur, seen)) { owner.set(f, i); return true; }
    }
    return false;
  };
  let matched = 0;
  for (let i = 0; i < options.length; i++) if (tryAssign(i, new Set())) matched++;
  return matched;
}
