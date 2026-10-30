// 정식 팩이 기획서의 숫자와 결정을 그대로 담았는지 본다(GDD v2.1 14.1, v2.2 10장, v2.3 개정안 기대값).
import { describe, expect, it } from 'vitest';
import { contentPack as pack } from '../../src/content';
import { validateContentPack } from '../../src/core/content/validate';

const byId = <T extends { id: string }>(list: T[], id: string) => {
  const found = list.find((x) => x.id === id);
  if (!found) throw new Error(`${id} 없음`);
  return found;
};

const unitEffectCount = (u: (typeof pack.units)[number]) => {
  const { basic: _basic, ...rest } = u.abilityIds;
  return new Set(Object.values(rest).flatMap((v) => (v === null ? [] : Array.isArray(v) ? v : [v]))).size;
};

describe('정식 콘텐츠 팩 ba-content-2.3.0', () => {
  it('정적 검증 오류 0건', () => {
    const report = validateContentPack(pack);
    expect(report.errors).toEqual([]);
  });

  it('v2.3 기대 개수: 유닛100·시너지63·장비12·전략13·적13·노드15·효과399·대사100·상태20', () => {
    expect([pack.units, pack.synergies, pack.equipment, pack.strategies, pack.enemies, pack.nodes, pack.effects, pack.dialogue, pack.statuses].map((l) => l.length))
      .toEqual([100, 63, 12, 13, 13, 15, 399, 100, 20]);
  });

  it('코스트 분포 19/26/28/15/12, 구역 분포 전방53·후방36·겸용11 (v2.3 3장)', () => {
    const byCost = [1, 2, 3, 4, 5].map((c) => pack.units.filter((u) => u.cost === c).length);
    expect(byCost).toEqual([19, 26, 28, 15, 12]);
    const byPos = ['front_only', 'rear_only', 'dual'].map((p) => pack.units.filter((u) => u.position === p).length);
    expect(byPos).toEqual([53, 36, 11]);
  });

  it('효과 출처: 부록 C 그대로 219 + v2.3 교체·추가 179 + 카이저 론 1', () => {
    const prefix = (p: string) => pack.effects.filter((e) => e.catalogNo.startsWith(p)).length;
    expect([prefix('C.'), prefix('V.'), prefix('v2.2')]).toEqual([219, 179, 1]);
    expect(byId(pack.effects, 'eff_aris_passive').catalogNo).toBe('C.300');
    expect(pack.effects.map((e) => e.id)).not.toContain('eff_syn_jackpot_2');
  });

  it('M0에서는 모든 효과가 명세만 있고 실행 연산은 없다(한국어 문장을 실행하지 않는다)', () => {
    expect(pack.effects.every((e) => e.implementation === 'spec_only' && e.handlers.length === 0)).toBe(true);
    const strict = validateContentPack(pack, { requireImplemented: true });
    expect(strict.errors.filter((e) => e.code === 'NOT_IMPLEMENTED')).toHaveLength(399);
  });

  it('시너지 분류: 진영12·동아리26·역할군7·고유11·플래티넘7, 흥신소68·C&C는 동아리', () => {
    const byCat = ['faction', 'club', 'role', 'unique', 'platinum'].map((c) => pack.synergies.filter((s) => s.category === c).length);
    expect(byCat).toEqual([12, 26, 7, 11, 7]);
    expect(byId(pack.synergies, 'syn_problem_solver').category).toBe('club');
    expect(byId(pack.synergies, 'syn_cc').category).toBe('club');
    for (const gone of ['syn_vanguard', 'syn_jackpot', 'syn_heavy_armor', 'syn_commander', 'syn_unique_big_sister']) {
      expect(pack.synergies.some((s) => s.id === gone)).toBe(false);
    }
  });

  it('T33: 아비도스·백귀야행 최고 단계는 5명이며 연결 ID는 _6을 유지한다(A11)', () => {
    for (const id of ['syn_abydos', 'syn_hyakkiyako']) {
      const top = byId(pack.synergies, id).tiers.at(-1)!;
      expect(top.threshold).toBe(5);
      expect(top.effectIds[0]).toMatch(/_6$/);
    }
  });

  it('학생마다 진영 1~2·역할군 정확히 1·동아리 0~1', () => {
    const cat = new Map(pack.synergies.map((s) => [s.id, s.category]));
    for (const u of pack.units) {
      const count = (c: string) => u.synergyIds.filter((s) => cat.get(s) === c).length;
      expect([count('faction') >= 1 && count('faction') <= 2, count('role'), count('club') <= 1], u.id).toEqual([true, 1, true]);
    }
  });

  it('플래티넘: 명단형 5종은 구성원 전원이 모여야 하고, 대항전·총력전은 명단 없이 special로 센다', () => {
    for (const s of pack.synergies.filter((x) => x.category === 'platinum')) {
      if (s.countScope === 'special') expect(s.memberIds).toEqual([]);
      else expect(s.tiers[0].threshold).toBe(s.memberIds.length);
    }
    expect(byId(pack.synergies, 'syn_plat_last_line').memberIds).not.toContain('u_hoshino_armed');
  });

  it('코스트 기준선: 효과 수(기본 공격 제외) 1코≤3, 2코≤4, 3코≤5, 4코≤6, 5코≤7', () => {
    const limit = [0, 3, 4, 5, 6, 7];
    for (const u of pack.units) expect(unitEffectCount(u), u.id).toBeLessThanOrEqual(limit[u.cost]);
  });

  it('5코 존재 효과: 히나·미카·와카모·아키라·나기사·세이아', () => {
    for (const id of ['u_hina', 'u_mika', 'u_wakamo', 'u_akira', 'u_nagisa', 'u_seia']) {
      const a = byId(pack.units, id).abilityIds;
      const aura = `eff_${id.slice(2)}_aura`;
      expect([...a.frontEffects, ...a.rearEffects]).toContain(aura);
      expect(byId(pack.effects, aura).spec).toMatch(/^존재 효과 「/);
    }
  });

  it('T38: 호시노와 무장 호시노는 서로 다른 unitId', () => {
    expect(byId(pack.units, 'u_hoshino').id).not.toBe(byId(pack.units, 'u_hoshino_armed').id);
  });

  it('T29/T30: 아리스는 전방 충전 패시브와 후방 포격만, 미유·키사키는 같은 반응을 구역마다 한 번씩 묶는다(A03·A04)', () => {
    const aris = byId(pack.units, 'u_aris').abilityIds;
    expect(aris.frontEffects).toEqual(['eff_aris_passive']);
    expect(aris.rearAction).toBe('eff_aris_rear_reg');
    expect(aris.rearEffects).toEqual([]);
    for (const id of ['u_miyu', 'u_kisaki']) {
      const a = byId(pack.units, id).abilityIds;
      const react = `eff_${id.slice(2)}_rear_react`;
      expect(a.frontEffects).toEqual([react]);
      expect(a.rearEffects).toEqual([react]);
      expect(byId(pack.effects, react).scope).toBe('both');
    }
  });

  it('원작 설정: 코타마 이름, 카즈사 고유 「카스팔루그」, 무법자 표시명', () => {
    expect(byId(pack.units, 'u_kotama').name).toBe('오토세 코타마');
    expect(byId(pack.units, 'u_kotama').synergyIds).toEqual(['syn_millennium', 'syn_veritas', 'syn_supporter']);
    expect(byId(pack.units, 'u_kazusa').synergyIds).toContain('syn_unique_caspalug');
    expect(byId(pack.synergies, 'syn_unique_caspalug').name).toBe('「카스팔루그」');
    expect(byId(pack.synergies, 'syn_outlaw').name).toBe('무법자 — 칠수인·헬멧단');
  });

  it('철벽의 전선: 보유 조건 태그는 탱커 (v2.3 7장)', () => {
    expect(byId(pack.strategies, 'str_iron_frontline').offer.ownedCondition?.anyTagOf).toEqual(['syn_tank']);
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
