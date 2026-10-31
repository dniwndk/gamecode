// 런 동안 쌓이는 시너지 스택(GDD v2.3 V.170·V.199, 보충수업부·디저트부·「조금만 쉬고 싶어」·「골드 카드」)
import { describe, expect, it } from 'vitest';
import { contentPack as pack } from '../../src/content';
import { emptyRunStacks, runStackLines, settleRunStacks, stackBattleBonuses, type BattleStackInput } from '../../src/core/synergy/runStacks';

const battle = (over: Partial<BattleStackInput>): BattleStackInput => ({ outcome: 'win', deployedUnitIds: [], ownedUnitIds: [], activeTiers: {}, levelUpKills: [], ...over });

describe('런 스택', () => {
  it('빠밤! 레벨업: 처치 1, 정예·보스 3, 출전 승리 1. 시너지가 꺼져 있으면 쌓이지 않는다', () => {
    const on = { syn_unique_level_up: 0 };
    const a = settleRunStacks(pack, emptyRunStacks(), battle({ activeTiers: on, levelUpKills: [{ eliteOrBoss: false }, { eliteOrBoss: true }] })).next;
    expect(a.levelUpExp).toBe(5);
    expect(settleRunStacks(pack, a, battle({ outcome: 'loss', activeTiers: on })).next.levelUpExp).toBe(5);
    expect(settleRunStacks(pack, a, battle({ levelUpKills: [{ eliteOrBoss: false }] })).next.levelUpExp).toBe(5);
  });

  it('레벨 5경험치마다, 아리스는 6까지·AL-1S는 10까지 ATK +5%', () => {
    const s = { ...emptyRunStacks(), levelUpExp: 42 };
    expect(stackBattleBonuses(pack, s, { syn_unique_level_up: 0 }).atkBpsByUnit.u_aris).toBe(3000);
    expect(stackBattleBonuses(pack, s, { syn_unique_nameless_princess: 0 }).atkBpsByUnit.u_al1s).toBe(4000);
    expect(runStackLines(s, 'syn_unique_level_up', false)![0].value).toBe('Lv.6 / 6 · ATK +30%');
    expect(runStackLines({ ...s, levelUpExp: 12 }, 'syn_unique_level_up', false)![1].note).toBe('다음 레벨까지 3');
  });

  it('보충수업부: 패배마다 1중첩(최대 4), 승리하면 중첩 수(4단계 2배) 골드 후 초기화', () => {
    let s = emptyRunStacks();
    for (let k = 0; k < 5; k++) s = settleRunStacks(pack, s, battle({ outcome: 'loss', activeTiers: { syn_make_up: 0 } })).next;
    expect(s.makeUp).toBe(4);
    expect(stackBattleBonuses(pack, s, { syn_make_up: 0 }).atkBpsByUnit.u_azusa).toBe(3200);
    const won = settleRunStacks(pack, s, battle({ activeTiers: { syn_make_up: 1 } }));
    expect(won.income).toEqual([{ label: '보충수업부 · 합격 (4중첩)', value: 8 }]);
    expect(won.next.makeUp).toBe(0);
  });

  it('조금만 쉬고 싶어: 연속 출전마다 업무량 +1(최대 5), 대기석에서 쉬면 초기화하고 다음 출전은 에너지 100', () => {
    let s = emptyRunStacks();
    for (let k = 0; k < 6; k++) s = settleRunStacks(pack, s, battle({ deployedUnitIds: ['u_hina'], ownedUnitIds: ['u_hina'] })).next;
    expect(s.workload).toBe(5);
    s = settleRunStacks(pack, s, battle({ ownedUnitIds: ['u_hina'] })).next;
    expect(s).toMatchObject({ workload: 0, rested: true });
    expect(stackBattleBonuses(pack, s, { syn_unique_head_prefect: 0 }).fullEnergy).toEqual(['u_hina']);
    expect(settleRunStacks(pack, s, battle({ deployedUnitIds: ['u_hina'], ownedUnitIds: ['u_hina'] })).next).toMatchObject({ workload: 1, rested: false });
  });

  it('디저트부·골드 카드는 다음 전투·상점 예약으로 보인다', () => {
    const s = settleRunStacks(pack, emptyRunStacks(), battle({ activeTiers: { syn_sweets: 0, syn_unique_gold_card: 0 } })).next;
    expect(s).toMatchObject({ dessertPending: true, goldCardReroll: true });
    expect(runStackLines(s, 'syn_sweets', false)![0].value).toBe('준비됨');
    expect(runStackLines(s, 'syn_gehenna', false)).toBeNull();
  });
});

describe('각성 표시값', () => {
  it('툴팁의 각성 경험치는 유닛 데이터의 필요 경험치와 같다', async () => {
    const { AWAKEN_EXP } = await import('../../src/core/synergy/runStacks');
    expect(AWAKEN_EXP).toBe(pack.units.find((u) => u.id === 'u_aris')!.awakening!.expRequired);
  });
});
