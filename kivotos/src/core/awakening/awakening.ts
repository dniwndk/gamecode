// 각성 규칙(docs/GDD_v2.3_amendment.md 9장). 경험치를 쌓는 일은 고유 시너지 효과(M3)의 몫이고,
// 여기서는 전투 정산 때 "누가 무엇으로 바뀌는지"만 정한다. 입력을 고치지 않고 결과를 돌려주는 순수 함수다.
import type { ContentPack, UnitDefinition } from '../types/content';

/** 정산 시점에 보유(출전·대기)한 학생 한 명 */
export interface OwnedUnitRef {
  instanceId: string;
  unitId: string;
  star: number;
  deployed: boolean;
  /** 얻은 순서. 작을수록 먼저 얻음 */
  acquiredOrder: number;
}

export interface AwakeningPlan {
  /** 각성하는 개체. 자리와 장비는 그대로 두고 unitId만 바뀐다. */
  instanceId: string;
  fromUnitId: string;
  intoUnitId: string;
  star: number;
  /** 이미 최대 성급이라 성급 대신 받는 골드 */
  gold: number;
  /** 각성하지 않은 같은 학생. 판매 규칙대로 자동 판매한다. */
  autoSellInstanceIds: string[];
}

/**
 * 이번 정산에서 일어날 각성. 학생마다 런 경험치(expByUnitId, 원래 학생 ID 기준)를 보고 정한다.
 * 이미 각성한 학생(각성 학생을 보유)이나 원래 학생이 없으면 건너뛴다.
 */
export function resolveAwakenings(pack: ContentPack, owned: readonly OwnedUnitRef[], expByUnitId: Readonly<Record<string, number>>): AwakeningPlan[] {
  const maxStar = pack.rules.units.maxStar;
  const plans: AwakeningPlan[] = [];
  for (const def of pack.units) {
    const a = def.awakening;
    if (!a || (expByUnitId[def.id] ?? 0) < a.expRequired) continue;
    if (owned.some((o) => o.unitId === a.intoUnitId)) continue;
    const copies = owned.filter((o) => o.unitId === def.id);
    if (copies.length === 0) continue;
    // 성급 높은 쪽 → 출전 중인 쪽 → 먼저 얻은 쪽
    const target = [...copies].sort((x, y) => y.star - x.star || Number(y.deployed) - Number(x.deployed) || x.acquiredOrder - y.acquiredOrder)[0];
    const raised = target.star + a.starBonus;
    plans.push({
      instanceId: target.instanceId,
      fromUnitId: def.id,
      intoUnitId: a.intoUnitId,
      star: Math.min(raised, maxStar),
      gold: target.star >= maxStar ? a.maxStarGold : 0,
      autoSellInstanceIds: copies.filter((c) => c !== target).map((c) => c.instanceId),
    });
  }
  return plans;
}

/** 상점에 나올 수 있는 학생인가. 각성 학생은 늘 빠지고, 각성을 마친 원래 학생도 빠진다. */
export function shopAllows(unit: Pick<UnitDefinition, 'id' | 'shopEligible'>, awakenedFromIds: ReadonlySet<string>): boolean {
  return unit.shopEligible && !awakenedFromIds.has(unit.id);
}

/** 학생 카드의 "각성까지 x/n" 표시. 각성 조건이 없으면 null. */
export function awakeningProgress(unit: Pick<UnitDefinition, 'awakening'>, exp: number): { exp: number; required: number; ready: boolean } | null {
  if (!unit.awakening) return null;
  const required = unit.awakening.expRequired;
  return { exp: Math.min(exp, required), required, ready: exp >= required };
}
