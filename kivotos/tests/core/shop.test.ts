// 상점 장수 제한·3성 제외(docs/GDD_v2.3_amendment.md 11장)
import { describe, expect, it } from 'vitest';
import { contentPack as pack } from '../../src/content';
import { Rng } from '../../src/core/rng';
import { costOdds, heldCopies, remainingCopies, rollShop, shopExcluded } from '../../src/core/shop/shop';

const unit = (id: string) => pack.units.find((u) => u.id === id)!;

describe('남은 장수', () => {
  it('학생 1명당 장수는 코스트를 따르고, 소유는 1성 환산(1·3·9장)으로 뺀다', () => {
    expect(unit('u_serika').cost).toBe(1);
    const left = remainingCopies(pack, [{ unitId: 'u_serika', star: 2 }, { unitId: 'u_serika', star: 1 }]);
    expect(left.get('u_serika')).toBe(30 - 4);
    expect(heldCopies(pack, [{ unitId: 'u_hina', star: 3 }]).get('u_hina')).toBe(9);
  });

  it('지금 상점에 나온 칸도 빠지고, 상점 대상이 아닌 학생은 목록에 없다', () => {
    const five = pack.units.find((u) => u.cost === 5 && u.shopEligible)!;
    expect(remainingCopies(pack, [], [five.id, five.id]).get(five.id)).toBe(9 - 2);
    expect(remainingCopies(pack, []).has('u_al1s')).toBe(false);
  });

  it('3성을 보유하면 팔기 전까지 0장, 2성이면 그대로 남는다', () => {
    expect(shopExcluded(pack, [{ unitId: 'u_serika', star: 3 }]).has('u_serika')).toBe(true);
    expect(remainingCopies(pack, [{ unitId: 'u_serika', star: 3 }]).get('u_serika')).toBe(0);
    expect(remainingCopies(pack, [{ unitId: 'u_serika', star: 2 }]).get('u_serika')).toBe(27);
    // 판 뒤(소유 목록에서 빠짐)에는 30장으로 돌아온다
    expect(remainingCopies(pack, []).get('u_serika')).toBe(30);
  });

  it('각성을 마친 원래 학생도 빠진다', () => {
    expect(remainingCopies(pack, [], [], new Set(['u_aris'])).get('u_aris')).toBe(0);
  });
});

describe('상점 추첨', () => {
  it('3성 학생은 몇 번을 갱신해도 나오지 않는다(추천 칸 포함)', () => {
    const owned = [{ unitId: 'u_serika', star: 3 }];
    const syn = pack.synergies.find((s) => s.memberIds.includes('u_serika'))!;
    for (let seed = 1; seed <= 400; seed++) {
      expect(rollShop(pack, { level: 3, owned, trackedSynergyId: syn.id }, new Rng(seed))).not.toContain('u_serika');
    }
  });

  it('남은 장수가 바닥난 코스트는 다른 코스트로 재분배한다', () => {
    // 레벨 3은 1·2·3코만 나온다. 1코 전원을 30장씩 가지면 1코 칸이 없다.
    const owned = pack.units.filter((u) => u.cost === 1 && u.shopEligible).flatMap((u) => [{ unitId: u.id, star: 3 }, ...Array(21).fill({ unitId: u.id, star: 1 })]);
    for (let seed = 1; seed <= 100; seed++) {
      const shop = rollShop(pack, { level: 3, owned, trackedSynergyId: null }, new Rng(seed));
      expect(shop.every((id) => id && unit(id).cost >= 2)).toBe(true);
    }
  });

  it('한 상점 안에서 같은 학생이 남은 장수보다 많이 나오지 않는다', () => {
    const five = pack.units.filter((u) => u.cost === 5 && u.shopEligible).map((u) => u.id);
    // 5코 하나만 1장 남기고 나머지는 모두 3성 → 레벨 10에서 그 학생은 상점에 최대 1칸
    const [keep, ...rest] = five;
    const owned = [...rest.map((id) => ({ unitId: id, star: 3 })), ...Array(8).fill({ unitId: keep, star: 1 })];
    for (let seed = 1; seed <= 300; seed++) {
      const shop = rollShop(pack, { level: 10, owned, trackedSynergyId: null }, new Rng(seed));
      expect(shop.filter((id) => id === keep).length).toBeLessThanOrEqual(1);
      expect(shop.some((id) => id && rest.includes(id))).toBe(false);
    }
  });

  it('코스트 비율은 확률표를 따르고, 같은 코스트 안에서는 덜 가진 학생이 더 자주 나온다', () => {
    const odds = costOdds(pack, 8);
    const counts = [0, 0, 0, 0, 0];
    const target = pack.units.filter((u) => u.cost === 4 && u.shopEligible).map((u) => u.id).sort();
    const [held, fresh] = target;
    const owned = Array(3).fill({ unitId: held, star: 2 }); // 9장 보유 → 1장 남음
    let heldSeen = 0, freshSeen = 0;
    const N = 4000;
    for (let seed = 1; seed <= N; seed++) {
      // 5번 칸은 추천 모드(소유 학생 우대)라 1~4번 칸만 센다
      for (const id of rollShop(pack, { level: 8, owned, trackedSynergyId: null }, Rng.forStream(`T-${seed}`, 'shop')).slice(0, 4)) {
        if (!id) continue;
        counts[unit(id).cost - 1]++;
        if (id === held) heldSeen++;
        if (id === fresh) freshSeen++;
      }
    }
    const total = counts.reduce((a, b) => a + b, 0);
    counts.forEach((c, i) => expect(Math.abs((c / total) * 100 - odds[i])).toBeLessThan(2));
    expect(heldSeen * 5).toBeLessThan(freshSeen);
  });

  it('5번 칸 추천 모드는 소유 학생도 남은 장수가 있을 때만 고른다', () => {
    const four = pack.units.filter((u) => u.cost === 4 && u.shopEligible).map((u) => u.id).sort()[0];
    const owned = [{ unitId: four, star: 3 }];
    for (let seed = 1; seed <= 300; seed++) expect(rollShop(pack, { level: 9, owned, trackedSynergyId: null }, Rng.forStream(`R-${seed}`, 'shop'))[4]).not.toBe(four);
  });

  it('같은 시드·상태면 같은 상점(재현성)', () => {
    const input = { level: 6, owned: [{ unitId: 'u_shiroko', star: 1 }], trackedSynergyId: 'syn_abydos' };
    expect(rollShop(pack, input, new Rng(77))).toEqual(rollShop(pack, input, new Rng(77)));
  });
});
