// 검증기가 실제로 잘못된 데이터를 잡는지, 정식 팩을 하나씩 망가뜨려 본다.
import { describe, expect, it } from 'vitest';
import { contentPack } from '../../src/content';
import type { ContentPack } from '../../src/core/types/content';
import { validateContentPack } from '../../src/core/content/validate';

const clone = (): ContentPack => structuredClone(contentPack);
const codes = (pack: ContentPack) => validateContentPack(pack).errors.map((e) => e.code);

describe('validateContentPack가 잡아야 하는 결함', () => {
  it('효과 하나가 빠지면 개수 불일치와 미정의 참조', () => {
    const pack = clone();
    pack.effects = pack.effects.filter((e) => e.id !== 'eff_serika_skill');
    expect(codes(pack)).toEqual(expect.arrayContaining(['COUNT', 'MISSING_EFFECT']));
  });

  it('T14: 후방 칸이 공통 기본 공격(전방 효과)을 참조하면 실패', () => {
    const pack = clone();
    pack.units.find((u) => u.id === 'u_serina')!.abilityIds.rearAction = 'eff_common_basic_atk';
    expect(codes(pack)).toEqual(expect.arrayContaining(['ZONE_BINDING', 'EFFECT_KIND']));
  });

  it('후방 전용 유닛에 전방 능력이 묶이면 실패', () => {
    const pack = clone();
    pack.units.find((u) => u.id === 'u_serina')!.abilityIds.skill = 'eff_serika_skill';
    expect(codes(pack)).toContain('ZONE_BINDING');
  });

  it('같은 구역에 같은 효과를 두 번 묶으면 실패(A04)', () => {
    const pack = clone();
    const miyu = pack.units.find((u) => u.id === 'u_miyu')!;
    miyu.abilityIds.rearEffects.push('eff_miyu_rear_react');
    expect(codes(pack)).toContain('DOUBLE_BINDING');
  });

  it('유닛 태그와 시너지 구성원이 어긋나면 양쪽에서 실패', () => {
    const pack = clone();
    pack.units.find((u) => u.id === 'u_serika')!.synergyIds.push('syn_gehenna');
    pack.synergies.find((s) => s.id === 'syn_abydos')!.memberIds.push('u_hina');
    const c = codes(pack);
    expect(c.filter((x) => x === 'TAG_MISMATCH').length).toBeGreaterThanOrEqual(2);
  });

  it('최고 단계를 합법 편성으로 채울 수 없으면 실패', () => {
    const pack = clone();
    const valkyrie = pack.synergies.find((s) => s.id === 'syn_valkyrie')!;
    valkyrie.tiers.push({ threshold: 4, grade: 'normal', effectIds: ['eff_syn_valkyrie_3'], spec: '' });
    expect(codes(pack)).toContain('SYNERGY_UNREACHABLE');
  });

  it('플래티넘 단계는 진영·역할군의 마지막 단계이고 6명 이상', () => {
    const pack = clone();
    const club = pack.synergies.find((s) => s.id === 'syn_gourmet')!;
    club.tiers.at(-1)!.grade = 'platinum';
    const healer = pack.synergies.find((s) => s.id === 'syn_healer')!;
    healer.tiers[0].grade = 'platinum';
    const msgs = validateContentPack(pack).errors.filter((e) => e.code === 'SYNERGY_TIERS').map((e) => e.message);
    expect(msgs.some((m) => m.includes('진영·역할군에만'))).toBe(true);
    expect(msgs.some((m) => m.includes('마지막 단계'))).toBe(true);
    expect(msgs.some((m) => m.includes('< 6'))).toBe(true);
  });

  it('ID 중복과 형식 오류', () => {
    const pack = clone();
    pack.equipment[1].id = pack.equipment[0].id;
    pack.strategies[0].id = 'Str-Bad';
    expect(codes(pack)).toEqual(expect.arrayContaining(['DUPLICATE_ID', 'ID_FORMAT']));
  });

  it('상점 확률 행의 합이 100%가 아니면 실패', () => {
    const pack = clone();
    pack.rules.shop.levels[0].costOddsPct = [70, 25, 4, 0, 0];
    expect(codes(pack)).toContain('SHOP_ODDS');
  });

  it('적 편성: 후방 적을 전방 칸에 두거나 전방 5명이면 실패', () => {
    const pack = clone();
    const cand = pack.nodes[0].candidates[0];
    cand.front.push({ enemyId: 'en_pmc_sniper', index: 2 });
    pack.nodes[1].candidates[0].front = [0, 1, 2, 3, 4].map((i) => ({ enemyId: 'en_helmet_thug', index: i }));
    expect(codes(pack)).toContain('FORMATION');
    expect(validateContentPack(pack).errors.some((e) => e.message.includes('적 전방 5명'))).toBe(true);
  });

  it('어디에도 묶이지 않은 효과는 실패(사용하지 않는 전투 능력 0)', () => {
    const pack = clone();
    pack.effects.push({ ...pack.effects[0], id: 'eff_orphan' });
    pack.manifest.expectedCounts.effects += 1;
    expect(codes(pack)).toContain('UNUSED_EFFECT');
  });

  it('명세에 원안의 가상 연산 이름이 남아 있으면 실패', () => {
    const pack = clone();
    pack.effects[1].spec = 'skill_op(target=enemy)';
    expect(codes(pack)).toContain('PLACEHOLDER');
  });

  it('T76: 대사 파일에 bond 키가 없으면 실패', () => {
    const pack = clone();
    delete (pack.dialogue[0].lines as Partial<Record<string, string>>).bond;
    expect(codes(pack)).toContain('DIALOGUE_KEY');
  });

  it('초상화가 없으면 오류가 아니라 경고(대체 표시로 진행)', () => {
    const pack = clone();
    pack.assets[0].present = false;
    const report = validateContentPack(pack);
    expect(report.errors).toEqual([]);
    expect(report.warnings.map((w) => w.code)).toEqual(['ASSET_ABSENT']);
  });
});
