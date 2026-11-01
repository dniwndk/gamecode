// 전투 격화(docs/GDD_v2.3_amendment.md 13장). 시간 제한 대신 오래 끄는 전투를 끝내는 규칙이다.
// 회복·보호막이 피해를 영원히 따라잡는 교착을 막는다. v2.4.12부터 적이 더 빨리 세진다(오래 끌면 불리).
import type { RulesConfig } from '../types/content';

/**
 * 행동시점 av에서 공격하는 쪽(side)의 모든 피해에 더하는 비율(bps). startAv 전에는 0, 그 뒤 stepAv마다 쌓인다.
 * v2.4.12: 적은 단계마다 enemyDamageBpsPerStep(+30%), 아군은 allyDamageBpsPerStep(+15%).
 */
export function escalationDamageBps(av: number, battle: Pick<RulesConfig['battle'], 'escalation'>, side: 'ally' | 'enemy', chapter?: number): number {
  const { stepAv, allyDamageBpsPerStep, enemyDamageBpsPerStep } = battle.escalation;
  const startAv = escalationStartAv(battle, chapter);
  if (av < startAv) return 0;
  return (Math.floor((av - startAv) / stepAv) + 1) * (side === 'enemy' ? enemyDamageBpsPerStep : allyDamageBpsPerStep);
}

/** 격화가 시작하는 AV. v2.4.13: 장마다 다를 수 있다(4장 800, 5장 600). */
export function escalationStartAv(battle: Pick<RulesConfig['battle'], 'escalation'>, chapter?: number): number {
  const by = battle.escalation.startAvByChapter;
  return (chapter && by?.[chapter - 1]) || battle.escalation.startAv;
}
