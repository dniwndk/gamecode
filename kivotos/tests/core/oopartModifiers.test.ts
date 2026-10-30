// 오파츠 효과 보정값(docs/OOPARTS_v1.md 2~5장)과 상점 연결
import { describe, expect, it } from 'vitest';
import { contentPack as pack } from '../../src/content';
import { oopartModifiers, oopartSupport } from '../../src/core/ooparts/modifiers';
import { Rng } from '../../src/core/rng';
import { aronaPick, remainingCopies, rollShop } from '../../src/core/shop/shop';

describe('오파츠 보정값', () => {
  it('없으면 아무 효과도 없다', () => {
    const m = oopartModifiers([]);
    expect(m.shopSlots).toBeNull();
    expect(m.atkBps).toBe(0);
    expect(m.strategyPicks).toBe(1);
  });

  it('경제 오파츠: 네브라 디스크 +6G, 블랙마켓 카드 새로고침 1G·이자 상한 −3, 게마트리아 정산 +4G', () => {
    expect(oopartModifiers(['oop_nebra_disk']).interestGoldBonus).toBe(6);
    expect(oopartModifiers(['oop_black_market_card'])).toMatchObject({ rerollCost: 1, interestCapDelta: -3 });
    expect(oopartModifiers(['oop_gematria_contract']).settlementGold).toBe(4);
  });

  it('여러 개는 합쳐진다(패배 피해 감소, ATK)', () => {
    const m = oopartModifiers(['oop_okiku_doll', 'oop_afterglow_of_color']);
    expect(m.defeatDamageReduction).toBe(2);
    expect(m.atkBps).toBe(2000);
    expect(m.runHpLossPerBattle).toBe(3);
  });

  it('전설은 재료 효과를 이어받고 대가를 없앤다', () => {
    expect(oopartModifiers(['oop_prototype_infinity'])).toMatchObject({ frontUltEnergy: 70, frontSkillCdBonus: 0, exhaustion: false, frontSpd: 15, spStartBonus: 1, spRefillUses: 2, spMax: 6, spOnUltimate: true });
    expect(oopartModifiers(['oop_shittim_chest'])).toMatchObject({ shopSlots: 6, freeRerollPerPrep: 1, recommendedChanceBps: 8000, strategyChoices: 4, strategyPicks: 2, aronaSlot: true, pranaLock: true });
    expect(oopartModifiers(['oop_yume_notebook'])).toMatchObject({ rerollCost: 1, interestCapDelta: 0, defeatDamageReduction: 5, lastStandHp: 30, abydosLastStand: 3 });
    expect(oopartModifiers(['oop_nameless_relic'])).toMatchObject({ atkBps: 2000, healShieldReceivedBps: 0, runHpLossPerBattle: 0, firstFallHealBps: 1500, mysticRevives: 2 });
    expect(oopartModifiers(['oop_prototype_zero'])).toMatchObject({ frontUltEnergy: 70, frontSkillCdBonus: 1 });
  });

  it('55종 모두 작동 정도가 정해져 있고, 시너지 단계 효과를 기다리는 것은 14종', () => {
    const levels = pack.ooparts.map((o) => oopartSupport(o.id).level);
    expect(levels.filter((l) => l === 'pending')).toHaveLength(14);
    for (const o of pack.ooparts) {
      const s = oopartSupport(o.id);
      if (s.level !== 'active') expect(s.waiting, o.id).toBeTruthy();
    }
  });
});

describe('상점 오파츠', () => {
  it('샬레 별관 열쇠: 상점 6칸', () => {
    expect(rollShop(pack, { level: 5, owned: [], trackedSynergyId: null, slots: 6 }, new Rng(5))).toHaveLength(6);
  });

  it('안티키테라: 1번 칸은 그 레벨 최고 코스트', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const shop = rollShop(pack, { level: 7, owned: [], trackedSynergyId: null, topCostFirstSlot: true }, Rng.forStream(`A${seed}`, 'shop'));
      expect(pack.units.find((u) => u.id === shop[0])!.cost).toBe(5);
    }
  });

  it('아로나 추천: 다음 성급까지 남은 복사본이 가장 적은 보유 학생(동률은 고코스트)', () => {
    const owned = [{ unitId: 'u_serika', star: 1 }, { unitId: 'u_serika', star: 1 }, { unitId: 'u_shiroko', star: 1 }];
    expect(aronaPick(pack, owned, remainingCopies(pack, owned))).toBe('u_serika');
    const tie = [{ unitId: 'u_serika', star: 1 }, { unitId: 'u_hina', star: 1 }];
    expect(aronaPick(pack, tie, remainingCopies(pack, tie))).toBe('u_hina');
    const shop = rollShop(pack, { level: 3, owned, trackedSynergyId: null, slots: 6, aronaLastSlot: true }, new Rng(9));
    expect(shop[5]).toBe('u_serika');
  });
});
