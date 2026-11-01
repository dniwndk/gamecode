// 격화(docs/GDD_v2.3_amendment.md 13장): 시간 제한 대신 1000AV부터 100AV마다 적 피해 +30%, 아군 피해 +15%(v2.4.12)
import { describe, expect, it } from 'vitest';
import { contentPack as pack } from '../../src/content';
import { escalationDamageBps } from '../../src/core/battle/escalation';

describe('격화', () => {
  const battle = pack.rules.battle;

  it('시간 제한 필드가 없고 격화 규칙이 있다', () => {
    expect('maxAv' in battle).toBe(false);
    expect(battle.escalation).toEqual({ startAv: 1000, startAvByChapter: [1000, 1000, 1000, 800, 600], stepAv: 100, allyDamageBpsPerStep: 1500, enemyDamageBpsPerStep: 3000 });
  });

  it('999AV까지는 0, 1000AV부터 100AV마다 적 +30%·아군 +15%씩', () => {
    for (const side of ['ally', 'enemy'] as const) {
      expect(escalationDamageBps(0, battle, side)).toBe(0);
      expect(escalationDamageBps(999, battle, side)).toBe(0);
    }
    expect(escalationDamageBps(1000, battle, 'enemy')).toBe(3000);
    expect(escalationDamageBps(1000, battle, 'ally')).toBe(1500);
    expect(escalationDamageBps(1099, battle, 'enemy')).toBe(3000);
    expect(escalationDamageBps(1100, battle, 'enemy')).toBe(6000);
    expect(escalationDamageBps(1100, battle, 'ally')).toBe(3000);
    expect(escalationDamageBps(1500, battle, 'enemy')).toBe(18000);
    expect(escalationDamageBps(1500, battle, 'ally')).toBe(9000);
  });

  it('4장은 800AV, 5장은 600AV부터 격화(v2.4.13)', () => {
    expect(escalationDamageBps(799, battle, 'enemy', 4)).toBe(0);
    expect(escalationDamageBps(800, battle, 'enemy', 4)).toBe(3000);
    expect(escalationDamageBps(600, battle, 'ally', 5)).toBe(1500);
    expect(escalationDamageBps(900, battle, 'enemy', 3)).toBe(0);
    expect(escalationDamageBps(1000, battle, 'enemy')).toBe(3000);
  });
});
