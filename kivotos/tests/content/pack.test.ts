// 정식 팩이 기획서의 숫자와 결정을 그대로 담았는지 본다(GDD v2.1 14.1, v2.2 10장 기대값).
import { describe, expect, it } from 'vitest';
import { contentPack as pack } from '../../src/content';
import { validateContentPack } from '../../src/core/content/validate';

const byId = <T extends { id: string }>(list: T[], id: string) => {
  const found = list.find((x) => x.id === id);
  if (!found) throw new Error(`${id} 없음`);
  return found;
};

describe('정식 콘텐츠 팩 ba-content-2.2.0', () => {
  it('정적 검증 오류 0건', () => {
    const report = validateContentPack(pack);
    expect(report.errors).toEqual([]);
  });

  it('v2.2 기대 개수: 유닛60·시너지41·장비12·전략13·적13·노드15·효과304·대사60·상태20', () => {
    expect([pack.units, pack.synergies, pack.equipment, pack.strategies, pack.enemies, pack.nodes, pack.effects, pack.dialogue, pack.statuses].map((l) => l.length))
      .toEqual([60, 41, 12, 13, 13, 15, 304, 60, 20]);
  });

  it('코스트 분포 12/14/14/10/10, 구역 분포 전방37·후방13·겸용10 (1.1 감사표)', () => {
    const byCost = [1, 2, 3, 4, 5].map((c) => pack.units.filter((u) => u.cost === c).length);
    expect(byCost).toEqual([12, 14, 14, 10, 10]);
    const byPos = ['front_only', 'rear_only', 'dual'].map((p) => pack.units.filter((u) => u.position === p).length);
    expect(byPos).toEqual([37, 13, 10]);
  });

  it('효과 부모 ID = 원안 299 + 아리스 복구 1 + v2.2 신규 4 (A03, v2.2 0장)', () => {
    const fromAppendixC = pack.effects.filter((e) => e.catalogNo.startsWith('C.'));
    expect(fromAppendixC).toHaveLength(300);
    expect(byId(pack.effects, 'eff_aris_passive').catalogNo).toBe('C.300');
    expect(pack.effects.filter((e) => e.catalogNo.startsWith('v2.2')).map((e) => e.id).sort())
      .toEqual(['eff_str_kaiser_loan', 'eff_syn_jackpot_2', 'eff_syn_jackpot_4', 'eff_syn_jackpot_6']);
  });

  it('M0에서는 모든 효과가 명세만 있고 실행 연산은 없다(한국어 문장을 실행하지 않는다)', () => {
    expect(pack.effects.every((e) => e.implementation === 'spec_only' && e.handlers.length === 0)).toBe(true);
    const strict = validateContentPack(pack, { requireImplemented: true });
    expect(strict.errors.filter((e) => e.code === 'NOT_IMPLEMENTED')).toHaveLength(304);
  });

  it('T33: 아비도스·백귀야행 최고 단계는 5명이며 연결 ID는 _6을 유지한다(A11)', () => {
    for (const id of ['syn_abydos', 'syn_hyakkiyako']) {
      const top = byId(pack.synergies, id).tiers.at(-1)!;
      expect(top.threshold).toBe(5);
      expect(top.effectIds[0]).toMatch(/_6$/);
    }
  });

  it('뱅가드는 전방만 센다(6장). 여러 명이 걸린 시너지 중 구역 한정 집계는 뱅가드뿐', () => {
    expect(byId(pack.synergies, 'syn_vanguard').countScope).toBe('front_only');
    const zoned = pack.synergies.filter((s) => s.countScope !== 'deployed_all' && s.category !== 'unique');
    expect(zoned.map((s) => s.id)).toEqual(['syn_vanguard']);
  });

  it('T38: 호시노와 무장 호시노는 서로 다른 unitId', () => {
    expect(byId(pack.units, 'u_hoshino').id).not.toBe(byId(pack.units, 'u_hoshino_armed').id);
  });

  it('T29/T30: 아리스는 전방 충전 패시브와 후방 포격을, 미유·키사키는 같은 반응을 구역마다 한 번씩 묶는다(A03·A04)', () => {
    const aris = byId(pack.units, 'u_aris').abilityIds;
    expect(aris.frontEffects).toEqual(['eff_aris_passive']);
    expect(aris.rearAction).toBe('eff_aris_rear_reg');
    for (const id of ['u_miyu', 'u_kisaki']) {
      const a = byId(pack.units, id).abilityIds;
      const react = `eff_${id.slice(2)}_rear_react`;
      expect(a.frontEffects).toEqual([react]);
      expect(a.rearEffects).toEqual([react]);
      expect(byId(pack.effects, react).scope).toBe('both');
    }
  });

  it('v2.2 2장 원작 설정 수정이 반영됐다', () => {
    expect(byId(pack.units, 'u_kotama').name).toBe('오토세 코타마');
    expect(byId(pack.units, 'u_kotama').synergyIds).toContain('syn_electro');
    expect(byId(pack.units, 'u_kotama').synergyIds).not.toContain('syn_commander');
    for (const id of ['u_nozomi', 'u_hikari']) expect(byId(pack.units, id).synergyIds).not.toContain('syn_hyakkiyako');
    expect(byId(pack.units, 'u_saki').synergyIds).not.toContain('syn_commander');
    expect(byId(pack.units, 'u_ako').synergyIds).not.toContain('syn_medic');
    expect(byId(pack.units, 'u_hiyori').synergyIds).toContain('syn_sniper');
    expect(byId(pack.synergies, 'syn_outlaw').name).toBe('무법자 — 칠수인·헬멧단');
  });

  it('한탕: 구성원 7명, 단계 2/4/6, 최대 합법 집계 6 (v2.2 3장)', () => {
    const jackpot = byId(pack.synergies, 'syn_jackpot');
    expect(jackpot.memberIds.sort()).toEqual(['u_akira', 'u_aru', 'u_ayane', 'u_nonomi', 'u_rio', 'u_shiroko', 'u_yuuka']);
    expect(jackpot.tiers.map((t) => t.threshold)).toEqual([2, 4, 6]);
    expect(jackpot.documented.maxLegalCount).toBe(6);
  });

  it('카이저 론: 1~2장 시작에 조건 없이 제안 (v2.2 4장)', () => {
    expect(byId(pack.strategies, 'str_kaiser_loan').offer).toEqual({ chapters: [1, 2], ownedCondition: null });
  });

  it('규칙 수치: v2.2 경제 개정값', () => {
    const r = pack.rules;
    expect(r.run.startRunHp).toBe(80);
    expect(r.income.baseByChapter).toEqual([6, 7, 8]);
    expect(r.xp.perBattle).toBe(3);
    expect(Object.values(r.xp.xpToNext)).toEqual([2, 6, 10, 18, 26, 34, 42, null]);
    expect(r.defeatDamage).toMatchObject({ chapterBase: [6, 9, 12], perSurvivingEnemyFront: 2, eliteBonus: 3, bossBonus: 6 });
    expect(r.shop.levels.find((l) => l.level === 8)!.costOddsPct).toEqual([12, 20, 35, 27, 6]);
  });

  it('노드: 장마다 일반3·정예1·보스1, 최종전은 비나+골리앗+성가대 (E.2)', () => {
    for (const ch of [1, 2, 3]) {
      expect(pack.nodes.filter((n) => n.chapter === ch).map((n) => n.type)).toEqual(['normal', 'normal', 'normal', 'elite', 'boss']);
    }
    const final = byId(pack.nodes, 'node_3_5').candidates[0];
    expect(final.front.map((s) => s.enemyId)).toEqual(['boss_binah_decagram', 'en_automaton_goliath']);
    expect(final.rear).toEqual([{ enemyId: 'en_justina_choir_rear', index: 0 }]);
    expect(byId(pack.nodes, 'node_1_1').statScaleBps).toBe(8500);
  });

  it('T76: 대사 파일마다 7개 상황 키가 있다', () => {
    for (const d of pack.dialogue) expect(Object.keys(d.lines).sort()).toEqual(['bond', 'defeated', 'deploy', 'recruit', 'star3', 'ultimate', 'victory']);
  });
});
