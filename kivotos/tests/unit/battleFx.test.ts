import { describe, expect, it } from 'vitest';
import { ChainCounter, ExChain, cutinMs, escalationHeat, floatSize, hitstopMs, impactOf, rankActiveSynergies, shakePx } from '../../src/ui/blue/fx/battleFx';

describe('전투 연출 강약 예산', () => {
  it('작은 피해는 가볍고, 큰 피해·치명·필살기 직후는 한 단계씩 무겁다', () => {
    expect(impactOf({ amount: 10, maxHp: 1000, crit: false })).toBe(0);
    expect(impactOf({ amount: 60, maxHp: 1000, crit: false })).toBe(1);
    expect(impactOf({ amount: 200, maxHp: 1000, crit: false })).toBe(2);
    expect(impactOf({ amount: 400, maxHp: 1000, crit: false })).toBe(3);
    expect(impactOf({ amount: 60, maxHp: 1000, crit: true })).toBe(2);
    expect(impactOf({ amount: 60, maxHp: 1000, crit: true, boosted: true })).toBe(3);
    expect(impactOf({ amount: 400, maxHp: 1000, crit: true, boosted: true })).toBe(3);
  });

  it('숫자 크기는 피해 비율에 따라 22~66px', () => {
    expect(floatSize({ amount: 0, maxHp: 1000, crit: false })).toBe(22);
    expect(floatSize({ amount: 400, maxHp: 1000, crit: false })).toBe(62);
    expect(floatSize({ amount: 5000, maxHp: 1000, crit: true })).toBe(66);
    expect(floatSize({ amount: 50, maxHp: 1000, crit: false })).toBeLessThan(floatSize({ amount: 200, maxHp: 1000, crit: false }));
  });

  it('가벼운 타격은 멈추지 않고, 마지막 처치가 가장 길게 멈춘다', () => {
    expect(hitstopMs(0)).toBe(0);
    expect(hitstopMs(1)).toBe(0);
    expect(hitstopMs(2)).toBeGreaterThan(0);
    expect(hitstopMs(3, 'cutinFollow')).toBeGreaterThanOrEqual(hitstopMs(3));
    expect(hitstopMs(0, 'lastKill')).toBeGreaterThan(hitstopMs(3, 'bossDown'));
    expect(shakePx(3)).toBeLessThanOrEqual(8);
    expect(shakePx(1)).toBe(0);
  });

  it('연쇄 카운터는 행동마다 새로 세고, 코어가 준 chain을 우선한다', () => {
    const c = new ChainCounter();
    expect(c.onProc()).toBe(1);
    expect(c.onProc()).toBe(2);
    c.onAction();
    expect(c.onProc(4)).toBe(4);
    expect(c.onProc()).toBe(5);
  });

  it('EX 연쇄: 같은 편 필살기가 행동 2번 안에 이어지면 쌓이고, 컷인은 짧아진다', () => {
    const x = new ExChain();
    expect(x.onAction('ally', 'ultimate')).toBe(1);
    expect(x.onAction('enemy', 'basic')).toBe(0);
    expect(x.onAction('ally', 'ultimate')).toBe(2);
    x.onAction('ally', 'basic'); x.onAction('ally', 'basic'); x.onAction('ally', 'basic');
    expect(x.onAction('ally', 'ultimate')).toBe(1);
    expect(cutinMs(1)).toBe(1200);
    expect(cutinMs(2)).toBeLessThan(1200);
    expect(cutinMs(9)).toBe(520);
  });

  it('격화 열기는 0~1', () => {
    expect(escalationHeat(0)).toBe(0);
    expect(escalationHeat(4000)).toBeCloseTo(0.4);
    expect(escalationHeat(50000)).toBe(1);
  });

  it('시너지 선언은 플래티넘 → 최고 단계 → 높은 단계 순', () => {
    const info = (id: string) => ({ a: { grade: 'normal', tierCount: 3 }, b: { grade: 'normal', tierCount: 2 }, p: { grade: 'platinum', tierCount: 4 } } as Record<string, { grade: string; tierCount: number }>)[id];
    const ranked = rankActiveSynergies([
      { synergyId: 'a', activeTier: 1, count: 4 },
      { synergyId: 'b', activeTier: 1, count: 2 },
      { synergyId: 'x', activeTier: null, count: 1 },
      { synergyId: 'p', activeTier: 3, count: 8 },
    ], (id, tier) => (id === 'p' && tier === 3 ? info('p') : id === 'p' ? { grade: 'normal', tierCount: 4 } : info(id)));
    expect(ranked.map((s) => s.synergyId)).toEqual(['p', 'b', 'a']);
  });
});
