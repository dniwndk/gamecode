// 오파츠 보유·보상·조합 규칙(docs/OOPARTS_v1.md 1장). 전투 효과는 효과 엔진(M3)의 몫이고, 여기서는 런 상태만 다룬다.
// 순수 함수: 입력 상태를 고치지 않고 새 상태를 돌려준다. 난수는 호출자가 넘긴 reward 스트림만 쓴다.
import type { ContentPack, OopartDefinition, OopartRarity, OopartSourceId } from '../types/content';
import type { Rng } from '../rng';

/** 런마다 초기화되는 오파츠 상태 */
export interface OopartRunState {
  /** 보유 오파츠 ID, 획득 순서. 조합되면 재료가 빠지고 전설이 뒤에 붙는다. */
  owned: readonly string[];
  /** 구조 요청(연패 보상)을 이 런에서 이미 받았는지 */
  rescueUsed: boolean;
}

/** 런을 넘어 남는 메타 진행(프로필 저장) */
export interface OopartProfile {
  /** 한 번이라도 완성한 전설 ID. 이 전설의 레시피만 공개한다. */
  revealedRecipes: readonly string[];
}

export const emptyOopartRunState = (): OopartRunState => ({ owned: [], rescueUsed: false });
export const emptyOopartProfile = (): OopartProfile => ({ revealedRecipes: [] });

export interface OopartMerge {
  legendaryId: string;
  consumed: string[];
  /** 이번에 처음 완성해 레시피가 공개되었는지 */
  firstReveal: boolean;
}

export type AcquireResult =
  | { ok: true; state: OopartRunState; profile: OopartProfile; merges: OopartMerge[] }
  | { ok: false; reason: 'UNKNOWN' | 'ALREADY_OWNED' | 'LEGENDARY_NOT_OFFERED'; message: string };

const byId = (pack: ContentPack) => new Map(pack.ooparts.map((o) => [o.id, o]));
const legendaries = (pack: ContentPack) => pack.ooparts.filter((o) => o.recipe);

/** 지금 보유 상태에서 "남은 재료" 가중치를 받는 오파츠: 재료를 하나 이상 가진, 아직 완성 안 된 레시피의 나머지 재료 */
export function boostedOoparts(pack: ContentPack, state: OopartRunState): Set<string> {
  const owned = new Set(state.owned);
  const out = new Set<string>();
  for (const leg of legendaries(pack)) {
    if (owned.has(leg.id)) continue;
    const parts = leg.recipe!;
    if (!parts.some((p) => owned.has(p))) continue;
    for (const p of parts) if (!owned.has(p)) out.add(p);
  }
  return out;
}

/**
 * 보상 제안을 뽑는다(1.2절). 칸마다 등급을 먼저 뽑고 그 등급의 미보유·미제안 오파츠 중에서 가중 추첨한다.
 * 그 등급 후보가 없으면 한 단계 아래 등급, 그래도 없으면 위 등급으로 옮긴다. 전설은 절대 나오지 않는다.
 * 그 장에 해당하지 않는 시점이면 빈 배열.
 */
export function rollOopartOffer(pack: ContentPack, state: OopartRunState, sourceId: OopartSourceId, chapter: number, rng: Rng): string[] {
  const rules = pack.rules.ooparts;
  const src = rules.sources.find((s) => s.id === sourceId);
  if (!src) throw new Error(`오파츠 획득 시점 ${sourceId}가 규칙에 없음`);
  const odds = src.oddsByChapter[String(chapter)];
  if (!src.chapters.includes(chapter) || !odds) return [];
  const owned = new Set(state.owned);
  const boosted = boostedOoparts(pack, state);
  const order = rules.rarityOrder;
  const offer: string[] = [];
  for (let k = 0; k < src.choices; k++) {
    const start = order[rng.weightedIndex(odds)];
    const startAt = order.indexOf(start);
    // 내려가는 순서 먼저, 그다음 올라가는 순서
    const tryOrder = [...order.slice(0, startAt + 1).reverse(), ...order.slice(startAt + 1)];
    let picked: string | null = null;
    for (const rarity of tryOrder) {
      const pool = pack.ooparts.filter((o) => o.rarity === rarity && !owned.has(o.id) && !offer.includes(o.id));
      if (pool.length === 0) continue;
      const weights = pool.map((o) => (boosted.has(o.id) ? rules.recipeWeight : 1));
      picked = pool[rng.weightedIndex(weights)].id;
      break;
    }
    if (picked) offer.push(picked);
  }
  return offer;
}

/** 오파츠 하나를 얻는다. 레시피가 완성되면 그 자리에서 재료를 지우고 전설로 바꾼다(1.3절). */
export function acquireOopart(pack: ContentPack, state: OopartRunState, profile: OopartProfile, id: string): AcquireResult {
  const defs = byId(pack);
  const def = defs.get(id);
  if (!def) return { ok: false, reason: 'UNKNOWN', message: `없는 오파츠 ${id}` };
  if (def.rarity === 'legendary') return { ok: false, reason: 'LEGENDARY_NOT_OFFERED', message: `${id}는 조합으로만 얻는다` };
  if (state.owned.includes(id)) return { ok: false, reason: 'ALREADY_OWNED', message: `${id}를 이미 보유` };
  let owned = [...state.owned, id];
  let revealed = [...profile.revealedRecipes];
  const merges: OopartMerge[] = [];
  for (const leg of legendaries(pack)) {
    if (owned.includes(leg.id) || !leg.recipe!.every((p) => owned.includes(p))) continue;
    owned = [...owned.filter((o) => !leg.recipe!.includes(o)), leg.id];
    const firstReveal = !revealed.includes(leg.id);
    if (firstReveal) revealed = [...revealed, leg.id];
    merges.push({ legendaryId: leg.id, consumed: [...leg.recipe!], firstReveal });
  }
  return { ok: true, state: { ...state, owned }, profile: { revealedRecipes: revealed }, merges };
}

export interface RecipeBadge {
  legendaryId: string;
  /** 이 오파츠를 고르기 전에 이미 가진 재료 수 */
  owned: number;
  total: number;
}

/** 보상 카드의 "조합 재료 (n/m)" 배지. 레시피가 공개되지 않았으면 null(1.3절 레시피 공개). */
export function recipeBadge(pack: ContentPack, state: OopartRunState, profile: OopartProfile, id: string): RecipeBadge | null {
  const leg = legendaries(pack).find((l) => l.recipe!.includes(id));
  if (!leg || !profile.revealedRecipes.includes(leg.id)) return null;
  const owned = leg.recipe!.filter((p) => state.owned.includes(p)).length;
  return { legendaryId: leg.id, owned, total: leg.recipe!.length };
}

/** 도감 표시: 공개 전 전설은 이름·효과·레시피를 숨긴다. */
export interface OopartCodexEntry {
  id: string;
  rarity: OopartRarity;
  hidden: boolean;
  /** 공개된 경우에만 */
  definition: OopartDefinition | null;
}

export function oopartCodex(pack: ContentPack, profile: OopartProfile): OopartCodexEntry[] {
  return pack.ooparts.map((o) => {
    const hidden = o.rarity === 'legendary' && !profile.revealedRecipes.includes(o.id);
    return { id: o.id, rarity: o.rarity, hidden, definition: hidden ? null : o };
  });
}

/** 구조 요청(연패 보상): 이번 패배로 연패가 기준에 닿았고 이 런에서 아직 안 받았을 때 */
export function rescueDue(pack: ContentPack, state: OopartRunState, lossStreak: number): boolean {
  return !state.rescueUsed && lossStreak >= pack.rules.ooparts.rescueLossStreak;
}

export const markRescueUsed = (state: OopartRunState): OopartRunState => ({ ...state, rescueUsed: true });

/** 보상 제안을 건너뛸 때 받는 골드 */
export const oopartSkipGold = (pack: ContentPack): number => pack.rules.ooparts.skipGold;
