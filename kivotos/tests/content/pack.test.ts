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

describe('정식 콘텐츠 팩 ba-content-2.5.0', () => {
  it('정적 검증 오류 0건', () => {
    const report = validateContentPack(pack);
    expect(report.errors).toEqual([]);
  });

  it('기대 개수: 유닛101·시너지64·장비12·전략13·적13·노드15·효과461·대사101·상태20·오파츠55', () => {
    expect([pack.units, pack.synergies, pack.equipment, pack.strategies, pack.enemies, pack.nodes, pack.effects, pack.dialogue, pack.statuses, pack.ooparts].map((l) => l.length))
      .toEqual([101, 64, 12, 13, 13, 15, 461, 101, 20, 55]);
  });

  it('코스트 분포 19/27/28/14/13, 구역 분포 전방53·후방36·겸용12 (v2.3 3장, 아리스 2코·AL-1S 5코)', () => {
    const byCost = [1, 2, 3, 4, 5].map((c) => pack.units.filter((u) => u.cost === c).length);
    expect(byCost).toEqual([19, 27, 28, 14, 13]);
    const byPos = ['front_only', 'rear_only', 'dual'].map((p) => pack.units.filter((u) => u.position === p).length);
    expect(byPos).toEqual([53, 36, 12]);
  });

  it('효과 출처: 부록 C 그대로 206 + v2.3 교체·추가 199 + 카이저 론 1 + 오파츠 55', () => {
    const prefix = (p: string) => pack.effects.filter((e) => e.catalogNo.startsWith(p)).length;
    expect([prefix('C.'), prefix('V.'), prefix('v2.2'), prefix('O.')]).toEqual([206, 199, 1, 55]);
    expect(byId(pack.effects, 'eff_aris_passive').catalogNo).toBe('C.300');
    expect(pack.effects.map((e) => e.id)).not.toContain('eff_syn_jackpot_2');
  });

  it('M0에서는 모든 효과가 명세만 있고 실행 연산은 없다(한국어 문장을 실행하지 않는다)', () => {
    expect(pack.effects.every((e) => e.implementation === 'spec_only' && e.handlers.length === 0)).toBe(true);
    const strict = validateContentPack(pack, { requireImplemented: true });
    expect(strict.errors.filter((e) => e.code === 'NOT_IMPLEMENTED')).toHaveLength(461);
  });

  it('시너지 분류: 진영12·동아리26·역할군7·고유12·플래티넘7, 흥신소68·C&C는 동아리', () => {
    const byCat = ['faction', 'club', 'role', 'unique', 'platinum'].map((c) => pack.synergies.filter((s) => s.category === c).length);
    expect(byCat).toEqual([12, 26, 7, 12, 7]);
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

  const units = new Map(pack.units.map((u) => [u.id, u]));

  it('플래티넘: 명단형 5종은 구성원 전원이 모여야 하고, 대항전·총력전은 명단 없이 special로 센다', () => {
    for (const s of pack.synergies.filter((x) => x.category === 'platinum')) {
      if (s.countScope === 'special') expect(s.memberIds).toEqual([]);
      // 각성 학생(AL-1S)은 원래 학생과 같은 사람으로 센다
      else expect(s.tiers[0].threshold).toBe(s.memberIds.filter((m) => !units.get(m)!.awakenedFrom).length);
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

  it('아리스 각성: 3성 2코 아리스가 경험치 30에 5코 AL-1S가 되고, AL-1S는 상점에 없다 (v2.3 9장)', () => {
    const aris = byId(pack.units, 'u_aris');
    const al1s = byId(pack.units, 'u_al1s');
    expect([aris.cost, al1s.cost, al1s.position]).toEqual([2, 5, 'dual']);
    expect(aris.awakening).toEqual({ intoUnitId: 'u_al1s', counterSynergyId: 'syn_unique_level_up', expRequired: 30, starRequired: 3 });
    expect([al1s.awakenedFrom, al1s.shopEligible, aris.shopEligible]).toEqual(['u_aris', false, true]);
    expect(pack.units.filter((u) => u.awakening || u.awakenedFrom).map((u) => u.id).sort()).toEqual(['u_al1s', 'u_aris']);
    // 고유는 갈아 끼우고 나머지 태그는 그대로
    expect(al1s.synergyIds).toEqual(['syn_millennium', 'syn_game_dev', 'syn_blaster', 'syn_unique_nameless_princess', 'syn_plat_ending_credits']);
    expect(unitEffectCount(al1s)).toBe(6);
    expect([...al1s.abilityIds.frontEffects, ...al1s.abilityIds.rearEffects]).toContain('eff_al1s_aura');
    expect(byId(pack.effects, 'eff_al1s_aura').spec).toMatch(/^존재 효과 「/);
    expect(byId(pack.synergies, 'syn_unique_nameless_princess').memberIds).toEqual(['u_al1s']);
    expect(byId(pack.effects, 'eff_syn_uni_aris').spec).toContain('경험치 30');
    // 게임개발부·엔딩 크레딧은 AL-1S가 있어도 4명 시너지 그대로
    for (const id of ['syn_game_dev', 'syn_plat_ending_credits']) {
      const s = byId(pack.synergies, id);
      expect(s.memberIds).toContain('u_al1s');
      expect([s.documented.dual, s.documented.maxLegalCount]).toEqual([2, 4]);
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

  it('난이도 v2.3.3: 최종 보스 노드만 E.2 배율 그대로, 나머지 14개는 1.5배 (v2.3 10장)', () => {
    const e2 = [8500, 9500, 10000, 10000, 10000, 11500, 12500, 13500, 10500, 10000, 12000, 13000, 13500, 14000, 10000];
    expect(pack.nodes.map((n) => n.statScaleBps)).toEqual(pack.nodes.map((n, i) => (n.id === 'node_3_5' ? e2[i] : e2[i] * 1.5)));
    expect(pack.nodes.filter((n) => n.type === 'boss').map((n) => n.statScaleBps)).toEqual([15000, 15000, 10000]);
  });

  it('노드: 장마다 일반3·정예1·보스1, 최종전은 비나+골리앗+성가대 (E.2)', () => {
    for (const ch of [1, 2, 3]) {
      expect(pack.nodes.filter((n) => n.chapter === ch).map((n) => n.type)).toEqual(['normal', 'normal', 'normal', 'elite', 'boss']);
    }
    const final = byId(pack.nodes, 'node_3_5').candidates[0];
    expect(final.front.map((s) => s.enemyId)).toEqual(['boss_binah_decagram', 'en_automaton_goliath']);
    expect(final.rear).toEqual([{ enemyId: 'en_justina_choir_rear', index: 0 }]);
    expect(byId(pack.nodes, 'node_1_1').statScaleBps).toBe(12750); // E.2 0.85 × v2.3 10장 1.5
  });

  it('T76: 대사 파일마다 7개 상황 키가 있다', () => {
    for (const d of pack.dialogue) expect(Object.keys(d.lines).sort()).toEqual(['bond', 'defeated', 'deploy', 'recruit', 'star3', 'ultimate', 'victory']);
  });
  it('v2.3.1: 상위 단계 본문이 하위 단계 효과를 다시 적는다(최고 단계 하나만 등록, v2.1 6장)', () => {
    const top = (id: string) => byId(pack.synergies, id).tiers.at(-1)!.spec;
    expect(top('syn_gourmet')).toContain('별점 0개');
    expect(top('syn_problem_solver')).toContain('의뢰비');
    expect(top('syn_attacker')).toContain('연속으로 때리면');
    expect(top('syn_blaster')).toContain('DEF -15%');
    expect(top('syn_supporter')).toContain('지속 +1턴');
    expect(top('syn_controller')).toContain('지속 +1턴');
    expect(top('syn_tank')).toContain('도발');
    expect(top('syn_valkyrie')).toContain('수배자');
    for (const syn of pack.synergies) {
      if (syn.category === 'faction') continue;
      for (const t of syn.tiers) expect(t.spec).not.toContain('[하위 효과 포함]');
    }
  });

  it('폐기된 시너지 이름이 전략·장비 문구에 남지 않는다', () => {
    const gone = /스트라이커|어설트|중장갑|뱅가드|메딕|커맨더|이지스|브리처/;
    for (const st of pack.strategies) expect(`${st.offerText} ${st.benefit} ${st.drawback}`).not.toMatch(gone);
    for (const eq of pack.equipment) expect(`${eq.recommendation} ${eq.description}`).not.toMatch(gone);
  });

  describe('오파츠 (docs/OOPARTS_v1.md)', () => {
    const count = (f: (o: (typeof pack.ooparts)[number]) => boolean) => pack.ooparts.filter(f).length;

    it('등급 25/15/10/5, 대가 7, 시너지 특화 26 + 전설은 재료의 대상을 물려받음', () => {
      expect(['common', 'uncommon', 'rare', 'legendary'].map((r) => count((o) => o.rarity === r))).toEqual([25, 15, 10, 5]);
      expect(count((o) => o.kind === 'drawback')).toBe(7);
      expect(count((o) => o.kind === 'synergy' && o.rarity !== 'legendary')).toBe(26);
      expect(pack.ooparts.filter((o) => o.recipe && o.synergyIds.length).map((o) => o.id)).toEqual(['oop_eden_treaty', 'oop_yume_notebook']);
    });

    it('진영 12곳·역할군 7종 모두 특화 오파츠가 있다', () => {
      for (const syn of pack.synergies.filter((s) => s.category === 'faction' || s.category === 'role')) {
        expect(pack.ooparts.some((o) => o.rarity !== 'legendary' && o.synergyIds.includes(syn.id)), syn.id).toBe(true);
      }
    });

    it('전설 레시피: 재료는 서로 겹치지 않고, 대가 오파츠 4종이 재료로 쓰인다', () => {
      const legends = pack.ooparts.filter((o) => o.recipe);
      const parts = legends.flatMap((l) => l.recipe!);
      expect(new Set(parts).size).toBe(parts.length);
      expect(byId(pack.ooparts, 'oop_shittim_chest').recipe).toEqual(['oop_schale_annex_key', 'oop_roman_dodecahedron', 'oop_voynich']);
      expect(parts.filter((p) => byId(pack.ooparts, p).kind === 'drawback')).toHaveLength(4);
    });

    it('획득 규칙: 3연패 구조 요청, 건너뛰기 2G, 레시피 가중치 ×2, 보스는 1·2장만', () => {
      const r = pack.rules.ooparts;
      expect([r.rescueLossStreak, r.skipGold, r.recipeWeight]).toEqual([3, 2, 2]);
      expect(r.sources.find((s) => s.id === 'boss')!.chapters).toEqual([1, 2]);
      expect(r.sources.find((s) => s.id === 'elite')!.oddsByChapter['3']).toEqual([0, 55, 45]);
    });
  });
});
