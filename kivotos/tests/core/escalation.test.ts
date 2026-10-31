// 격화(docs/GDD_v2.3_amendment.md 13장): 시간 제한 대신 1000AV부터 100AV마다 양쪽 피해 +20%
import { describe, expect, it } from 'vitest';
import { contentPack as pack } from '../../src/content';
import { escalationDamageBps } from '../../src/core/battle/escalation';

describe('격화', () => {
  const battle = pack.rules.battle;

  it('시간 제한 필드가 없고 격화 규칙이 있다', () => {
    expect('maxAv' in battle).toBe(false);
    expect(battle.escalation).toEqual({ startAv: 1000, stepAv: 100, damageBpsPerStep: 2000 });
  });

  it('999AV까지는 0, 1000AV에 +20%, 100AV마다 +20%씩', () => {
    expect(escalationDamageBps(0, battle)).toBe(0);
    expect(escalationDamageBps(999, battle)).toBe(0);
    expect(escalationDamageBps(1000, battle)).toBe(2000);
    expect(escalationDamageBps(1099, battle)).toBe(2000);
    expect(escalationDamageBps(1100, battle)).toBe(4000);
    expect(escalationDamageBps(1500, battle)).toBe(12000);
  });
});
