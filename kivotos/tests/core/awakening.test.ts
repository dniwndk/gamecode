// 아리스 → AL-1S 각성(docs/GDD_v2.3_amendment.md 9장)
import { describe, expect, it } from 'vitest';
import { contentPack as pack } from '../../src/content';
import { awakeningProgress, resolveAwakenings, shopAllows, type OwnedUnitRef } from '../../src/core/awakening/awakening';

const aris = (instanceId: string, star: number, deployed: boolean, acquiredOrder: number): OwnedUnitRef => ({ instanceId, unitId: 'u_aris', star, deployed, acquiredOrder });
const unit = (id: string) => pack.units.find((u) => u.id === id)!;

describe('각성 정산', () => {
  it('경험치 19는 그대로, 20이 되면 AL-1S로 바뀌고 성급 +1', () => {
    const owned = [aris('a', 1, true, 0)];
    expect(resolveAwakenings(pack, owned, { u_aris: 19 })).toEqual([]);
    expect(resolveAwakenings(pack, owned, { u_aris: 20 })).toEqual([
      { instanceId: 'a', fromUnitId: 'u_aris', intoUnitId: 'u_al1s', star: 2, gold: 0, autoSellInstanceIds: [] },
    ]);
  });

  it('대상은 성급 → 출전 → 먼저 얻은 순, 나머지 아리스는 자동 판매', () => {
    const owned = [aris('bench1', 1, false, 0), aris('front2', 2, true, 3), aris('bench2', 2, false, 1)];
    const [plan] = resolveAwakenings(pack, owned, { u_aris: 25 });
    expect(plan.instanceId).toBe('front2');
    expect(plan.star).toBe(3);
    expect(plan.autoSellInstanceIds.sort()).toEqual(['bench1', 'bench2']);
    const tie = resolveAwakenings(pack, [aris('late', 2, false, 5), aris('early', 2, false, 2)], { u_aris: 20 });
    expect(tie[0].instanceId).toBe('early');
  });

  it('이미 3성이면 성급 대신 6G', () => {
    const [plan] = resolveAwakenings(pack, [aris('a', 3, true, 0)], { u_aris: 20 });
    expect([plan.star, plan.gold]).toEqual([3, 6]);
  });

  it('아리스가 없거나 이미 AL-1S가 있으면 각성하지 않는다', () => {
    expect(resolveAwakenings(pack, [], { u_aris: 30 })).toEqual([]);
    const owned = [aris('a', 1, false, 0), { instanceId: 'x', unitId: 'u_al1s', star: 2, deployed: true, acquiredOrder: 1 }];
    expect(resolveAwakenings(pack, owned, { u_aris: 30 })).toEqual([]);
  });

  it('상점: AL-1S는 늘 없고, 각성 뒤에는 아리스도 없다', () => {
    expect(shopAllows(unit('u_al1s'), new Set())).toBe(false);
    expect(shopAllows(unit('u_aris'), new Set())).toBe(true);
    expect(shopAllows(unit('u_aris'), new Set(['u_aris']))).toBe(false);
  });

  it('진행 표시: 각성까지 x/20', () => {
    expect(awakeningProgress(unit('u_aris'), 7)).toEqual({ exp: 7, required: 20, ready: false });
    expect(awakeningProgress(unit('u_aris'), 31)).toEqual({ exp: 20, required: 20, ready: true });
    expect(awakeningProgress(unit('u_momoi'), 5)).toBeNull();
  });
});
