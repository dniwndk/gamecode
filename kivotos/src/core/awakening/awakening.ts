// 각성 규칙(docs/GDD_v2.3_amendment.md 9장). 경험치를 쌓는 일은 고유 시너지 효과(M3)의 몫이고,
// 여기서는 전투 정산 때나 준비 단계 합성 직후 "누가 무엇으로 바뀌는지"만 정한다. 입력을 고치지 않고 결과를 돌려주는 순수 함수다.
import type { ContentPack, UnitDefinition } from '../types/content';

/** 판정 시점에 보유(출전·대기)한 학생 한 명 */
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
  /** 각성하지 않은 같은 학생. 판매 규칙대로 자동 판매한다. */
  autoSellInstanceIds: string[];
}

/**
 * 지금 일어날 각성. 런 경험치(expByUnitId, 원래 학생 ID 기준)가 차고 필요 성급의 개체가 있을 때만.
 * 정산 때와 준비 단계 합성 직후에 부른다. 이미 각성 학생을 보유했으면 건너뛴다.
 */
export function resolveAwakenings(pack: ContentPack, owned: readonly OwnedUnitRef[], expByUnitId: Readonly<Record<string, number>>): AwakeningPlan[] {
  const plans: AwakeningPlan[] = [];
  for (const def of pack.units) {
    const a = def.awakening;
    if (!a || (expByUnitId[def.id] ?? 0) < a.expRequired) continue;
    if (owned.some((o) => o.unitId === a.intoUnitId)) continue;
    const copies = owned.filter((o) => o.unitId === def.id);
    // 필요 성급 이상 중 출전 중인 쪽 → 먼저 얻은 쪽
    const target = copies
      .filter((o) => o.star >= a.starRequired)
      .sort((x, y) => Number(y.deployed) - Number(x.deployed) || x.acquiredOrder - y.acquiredOrder)[0];
    if (!target) continue;
    plans.push({
      instanceId: target.instanceId,
      fromUnitId: def.id,
      intoUnitId: a.intoUnitId,
      star: target.star,
      autoSellInstanceIds: copies.filter((c) => c !== target).map((c) => c.instanceId),
    });
  }
  return plans;
}

/** 상점에 나올 수 있는 학생인가. 각성 학생은 늘 빠지고, 각성을 마친 원래 학생도 빠진다. */
export function shopAllows(unit: Pick<UnitDefinition, 'id' | 'shopEligible'>, awakenedFromIds: ReadonlySet<string>): boolean {
  return unit.shopEligible && !awakenedFromIds.has(unit.id);
}

/** 학생 카드의 "각성까지 x/n · ★n 필요" 표시. bestStar는 보유한 그 학생의 최고 성급. 각성 조건이 없으면 null. */
export function awakeningProgress(
  unit: Pick<UnitDefinition, 'awakening'>,
  exp: number,
  bestStar: number,
): { exp: number; required: number; starRequired: number; starMet: boolean; ready: boolean } | null {
  if (!unit.awakening) return null;
  const { expRequired: required, starRequired } = unit.awakening;
  const starMet = bestStar >= starRequired;
  return { exp: Math.min(exp, required), required, starRequired, starMet, ready: starMet && exp >= required };
}
