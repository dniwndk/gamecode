// 상점 추첨(GDD v2.1 5.1·5.2 + v2.3 11장). 학생마다 코스트별 장수가 있고, 남은 장수는 저장하지 않고
// 소유 학생(1성 환산)과 지금 상점 칸에서 매번 계산한다. 판매·갱신은 자동으로 장을 돌려준다.
// 순수 함수: 입력을 고치지 않는다. 난수는 호출자가 넘긴 shop 스트림만 쓴다.
import type { ContentPack, UnitDefinition } from '../types/content';
import type { Rng } from '../rng';
import { shopAllows } from '../awakening/awakening';

/** 대기석·편성에 있는 학생 한 명 */
export interface OwnedCopy {
  unitId: string;
  star: number;
}

/** 성급의 1성 환산 장수(1성 1, 2성 3, 3성 9) */
export const copiesOfStar = (pack: ContentPack, star: number): number => pack.rules.units.mergeCount ** (star - 1);

/** 학생 ID → 소유한 1성 환산 장수 */
export function heldCopies(pack: ContentPack, owned: readonly OwnedCopy[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const o of owned) out.set(o.unitId, (out.get(o.unitId) ?? 0) + copiesOfStar(pack, o.star));
  return out;
}

/** 상점에 나오지 않는 학생: 최고 성급을 보유한 학생(팔기 전까지), 각성 학생, 각성을 마친 원래 학생 */
export function shopExcluded(pack: ContentPack, owned: readonly OwnedCopy[], awakenedFromIds: ReadonlySet<string> = new Set()): Set<string> {
  const out = new Set<string>();
  if (pack.rules.shop.excludeMaxStarOwned) for (const o of owned) if (o.star >= pack.rules.units.maxStar) out.add(o.unitId);
  for (const u of pack.units) if (!shopAllows(u, awakenedFromIds)) out.add(u.id);
  return out;
}

/** 학생 1명당 장수 */
export const copiesFor = (pack: ContentPack, unit: Pick<UnitDefinition, 'cost'>): number => pack.rules.shop.copiesByCost[unit.cost - 1] ?? 0;

/**
 * 상점 대상 학생마다 남은 장수. shown은 지금 상점에 나와 있는 칸(잠근 상점이나 같은 상점의 앞 칸).
 * 제외된 학생은 0으로 둔다.
 */
export function remainingCopies(
  pack: ContentPack,
  owned: readonly OwnedCopy[],
  shown: readonly (string | null)[] = [],
  awakenedFromIds: ReadonlySet<string> = new Set(),
): Map<string, number> {
  const held = heldCopies(pack, owned);
  const excluded = shopExcluded(pack, owned, awakenedFromIds);
  const out = new Map<string, number>();
  for (const u of pack.units) {
    if (!u.shopEligible) continue;
    const left = excluded.has(u.id) ? 0 : copiesFor(pack, u) - (held.get(u.id) ?? 0) - shown.filter((s) => s === u.id).length;
    out.set(u.id, Math.max(0, left));
  }
  return out;
}

export interface ShopRollInput {
  level: number;
  owned: readonly OwnedCopy[];
  /** 추적 중인 시너지(5번 칸 추천 모드) */
  trackedSynergyId: string | null;
  awakenedFromIds?: ReadonlySet<string>;
  /** 오파츠 보정(OOPARTS_v1): 칸 수, 추천 모드 확률, 1번 칸 최고 코스트(C03) */
  slots?: number;
  recommendedChanceBps?: number;
  topCostFirstSlot?: boolean;
}

/** 레벨의 코스트 확률(%) */
export function costOdds(pack: ContentPack, level: number): number[] {
  const levels = pack.rules.shop.levels;
  return (levels.find((l) => l.level === level) ?? (level < levels[0].level ? levels[0] : levels[levels.length - 1])).costOddsPct;
}

/**
 * 상점 한 번을 새로 뽑는다(갱신·노드 진입). 칸마다 코스트를 뽑고, 그 코스트에서 남은 장수 비례로 학생을 뽑는다.
 * 남은 장수가 0인 코스트는 확률을 비례 재분배하고, 모두 0이면 빈칸(null).
 */
export function rollShop(pack: ContentPack, input: ShopRollInput, rng: Rng): (string | null)[] {
  return rollShopDetailed(pack, input, rng).slots;
}

export interface ShopRoll {
  slots: (string | null)[];
  /** 칸마다 추천 모드가 실제로 추천 집합에서 뽑았는지(화면의 「추천」 표시). 일반 모드로 뽑힌 5번 칸은 false */
  recommended: boolean[];
}

/** rollShop과 같은 추첨(같은 난수 소비)에 칸별 추천 여부를 더해 돌려준다. */
export function rollShopDetailed(pack: ContentPack, input: ShopRollInput, rng: Rng): ShopRoll {
  const { recommendedSlotIndex } = pack.rules.shop;
  const slots = input.slots ?? pack.rules.shop.slots;
  const recommendedModeChanceBps = input.recommendedChanceBps ?? pack.rules.shop.recommendedModeChanceBps;
  const remaining = remainingCopies(pack, input.owned, [], input.awakenedFromIds);
  const odds = costOdds(pack, input.level);
  // 등급별 후보는 ID순(5.2)
  const byCost = [1, 2, 3, 4, 5].map((c) => pack.units.filter((u) => u.cost === c && remaining.has(u.id)).map((u) => u.id).sort());
  // 추천 집합은 갱신 시작 시 스냅샷(5.2): 소유 ID ∪ 추적 시너지 구성원
  const tracked = input.trackedSynergyId ? pack.synergies.find((s) => s.id === input.trackedSynergyId) : undefined;
  const recommended = new Set([...input.owned.map((o) => o.unitId), ...(tracked?.memberIds ?? [])]);

  const out: (string | null)[] = [];
  const rec: boolean[] = [];
  for (let slot = 0; slot < slots; slot++) {
    rec.push(false);
    const tierLeft = byCost.map((ids) => ids.reduce((a, id) => a + remaining.get(id)!, 0));
    const weights = odds.map((p, c) => (tierLeft[c] > 0 ? p : 0));
    if (!weights.some((w) => w > 0)) { out.push(null); continue; }
    // C03: 1번 칸은 그 레벨에서 나올 수 있는(확률 > 0, 남은 장수 > 0) 최고 코스트
    const cost = slot === 0 && input.topCostFirstSlot ? weights.reduce((hi, w, c) => (w > 0 ? c : hi), 0) : rng.weightedIndex(weights);
    let pool = byCost[cost];
    if (slot === recommendedSlotIndex && rng.chance(recommendedModeChanceBps)) {
      const recPool = pool.filter((id) => recommended.has(id) && remaining.get(id)! > 0);
      if (recPool.length) { pool = recPool; rec[slot] = true; }
    }
    const id = pool[rng.weightedIndex(pool.map((x) => remaining.get(x)!))];
    remaining.set(id, remaining.get(id)! - 1);
    out.push(id);
  }
  return { slots: out, recommended: rec };
}
