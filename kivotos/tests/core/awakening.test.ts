// 아리스 → AL-1S 각성(docs/GDD_v2.3_amendment.md 9장): 경험치 15 + 3성 아리스(v2.3.9)
import { describe, expect, it } from 'vitest';
import { contentPack as pack } from '../../src/content';
import { awakeningProgress, resolveAwakenings, shopAllows, type OwnedUnitRef } from '../../src/core/awakening/awakening';

const aris = (instanceId: string, star: number, deployed: boolean, acquiredOrder: number): OwnedUnitRef => ({ instanceId, unitId: 'u_aris', star, deployed, acquiredOrder });
const unit = (id: string) => pack.units.find((u) => u.id === id)!;

describe('각성 판정', () => {
  it('3성이어도 경험치 14는 그대로, 15가 되면 3성 AL-1S', () => {
    const owned = [aris('a', 3, true, 0)];
    expect(resolveAwakenings(pack, owned, { u_aris: 14 })).toEqual([]);
    expect(resolveAwakenings(pack, owned, { u_aris: 15 })).toEqual([
      { instanceId: 'a', fromUnitId: 'u_aris', intoUnitId: 'u_al1s', star: 3, autoSellInstanceIds: [] },
    ]);
  });

  it('경험치가 넘쳐도 3성이 없으면 기다린다', () => {
    expect(resolveAwakenings(pack, [aris('a', 2, true, 0), aris('b', 1, false, 1)], { u_aris: 80 })).toEqual([]);
  });

  it('3성 중 출전 → 먼저 얻은 순, 나머지 아리스는 자동 판매', () => {
    const owned = [aris('bench1', 1, false, 0), aris('front3', 3, true, 3), aris('bench3', 3, false, 1)];
    const [plan] = resolveAwakenings(pack, owned, { u_aris: 15 });
    expect(plan.instanceId).toBe('front3');
    expect(plan.autoSellInstanceIds.sort()).toEqual(['bench1', 'bench3']);
    const tie = resolveAwakenings(pack, [aris('late', 3, false, 5), aris('early', 3, false, 2)], { u_aris: 15 });
    expect(tie[0].instanceId).toBe('early');
  });

  it('아리스가 없거나 이미 AL-1S가 있으면 각성하지 않는다', () => {
    expect(resolveAwakenings(pack, [], { u_aris: 15 })).toEqual([]);
    const owned = [aris('a', 3, false, 0), { instanceId: 'x', unitId: 'u_al1s', star: 3, deployed: true, acquiredOrder: 1 }];
    expect(resolveAwakenings(pack, owned, { u_aris: 15 })).toEqual([]);
  });

  it('케이를 보유(출전·대기)하면 AL-1S 대신 무장 아리스(v2.4.8), 이미 무장 아리스가 있으면 각성 없음', () => {
    const key = (deployed: boolean): OwnedUnitRef => ({ instanceId: 'k', unitId: 'u_key', star: 1, deployed, acquiredOrder: 9 });
    for (const d of [true, false]) expect(resolveAwakenings(pack, [aris('a', 3, true, 0), key(d)], { u_aris: 15 })[0].intoUnitId).toBe('u_aris_armed');
    const owned = [aris('a', 3, false, 0), { instanceId: 'x', unitId: 'u_aris_armed', star: 3, deployed: true, acquiredOrder: 1 }];
    expect(resolveAwakenings(pack, owned, { u_aris: 15 })).toEqual([]);
  });

  it('상점: AL-1S는 늘 없고, 각성 뒤에는 아리스도 없다', () => {
    expect(shopAllows(unit('u_al1s'), new Set())).toBe(false);
    expect(shopAllows(unit('u_aris_armed'), new Set())).toBe(false);
    expect(shopAllows(unit('u_aris'), new Set())).toBe(true);
    expect(shopAllows(unit('u_aris'), new Set(['u_aris']))).toBe(false);
  });

  it('진행 표시: 각성까지 x/15 · ★3 필요', () => {
    expect(awakeningProgress(unit('u_aris'), 7, 2)).toEqual({ exp: 7, required: 15, starRequired: 3, starMet: false, ready: false });
    expect(awakeningProgress(unit('u_aris'), 45, 2)!.ready).toBe(false);
    expect(awakeningProgress(unit('u_aris'), 45, 3)).toEqual({ exp: 15, required: 15, starRequired: 3, starMet: true, ready: true });
    expect(awakeningProgress(unit('u_momoi'), 5, 3)).toBeNull();
  });
});
