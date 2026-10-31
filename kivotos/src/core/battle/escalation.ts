// 전투 격화(docs/GDD_v2.3_amendment.md 13장). 시간 제한 대신 오래 끄는 전투를 끝내는 규칙이다.
// 양쪽이 똑같이 받으므로 승패를 정하지 않고, 회복·보호막이 피해를 영원히 따라잡는 교착만 막는다.
import type { RulesConfig } from '../types/content';

/** 행동시점 av에서 모든 피해에 더하는 비율(bps). startAv 전에는 0, 그 뒤 stepAv마다 damageBpsPerStep씩 쌓인다. */
export function escalationDamageBps(av: number, battle: Pick<RulesConfig['battle'], 'escalation'>): number {
  const { startAv, stepAv, damageBpsPerStep } = battle.escalation;
  if (av < startAv) return 0;
  return (Math.floor((av - startAv) / stepAv) + 1) * damageBpsPerStep;
}
