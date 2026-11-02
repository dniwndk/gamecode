// 멀티플레이 전용 런 규칙(D-049·D-050). 솔로 규칙(rules.json)은 건드리지 않는다.
import type { ContentPack, OopartRarity } from '../../core/types/content';
import { Rng } from '../runRules';

/** 멀티: 패배마다 런 체력 −10(장·정예·보스 상관없이). 오파츠 피해 감소·증가는 그대로 붙는다 */
export const MULTI_DEFEAT_DAMAGE = 10;

/** 크립 라운드 보상. 라운드마다 방이 한 번 정하고 모두 같은 보상(오파츠면 같은 등급)을 받는다 */
export type CreepReward = { kind: 'equipment' } | { kind: 'oopart'; rarity: OopartRarity };

/** 각 장의 정예 칸(4번째 전투)이 크립 라운드: 모두가 같은 몬스터와 싸운다 */
export const isCreepNode = (nodeType: string) => nodeType === 'elite';

/**
 * 크립 보상을 방 씨앗과 장 번호로 정한다(같은 방이면 누가 계산해도 같다).
 * 장비 3택1 또는 오파츠 1개를 반반으로, 오파츠 등급은 솔로 정예 보상 확률(rules.ooparts 정예 장별 확률)을 따른다.
 */
export function creepRewardFor(pack: ContentPack, roomSeed: string, chapter: number): CreepReward {
  const rng = Rng.forStream(`${roomSeed}|creep|${chapter}`, 'reward');
  if (rng.nextInt(2) === 0) return { kind: 'equipment' };
  const rules = pack.rules.ooparts;
  const odds = rules.sources.find((s) => s.id === 'elite')?.oddsByChapter[String(chapter)] ?? [0, 100, 0];
  return { kind: 'oopart', rarity: rules.rarityOrder[rng.weightedIndex(odds)] as OopartRarity };
}
