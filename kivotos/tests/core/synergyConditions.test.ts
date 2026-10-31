// 이스터에그 발동 조건(docs/GDD_v2.3_amendment.md 1장 "3성 조건은 효과 문장의 발동 조건에서 판정", 12.2)
import { describe, expect, it } from 'vitest';
import { contentPack as pack } from '../../src/content';
import { synergyCondition } from '../../src/core/synergy/conditions';

const members = (id: string) => pack.synergies.find((s) => s.id === id)!.memberIds;
const deploy = (ids: string[], star = 1) => ids.map((unitId) => ({ unitId, star }));

describe('이스터에그 3성 조건', () => {
  it('아리우스 스쿼드 5명이 모여도 3성이 아니면 꺼지고, 모두 3성이면 켜진다', () => {
    const squad = members('syn_plat_vanitas');
    expect(synergyCondition(pack, 'syn_plat_vanitas', deploy(squad, 2))).toEqual({ count: 5, met: false });
    expect(synergyCondition(pack, 'syn_plat_vanitas', deploy(squad, 3))).toEqual({ count: 5, met: true });
    const one2 = deploy(squad, 3); one2[0].star = 2;
    expect(synergyCondition(pack, 'syn_plat_vanitas', one2)!.met).toBe(false);
  });

  it('엔딩 크레딧: 아리스 자리는 AL-1S도 인정하고, 한 사람으로 센다', () => {
    const team = ['u_momoi', 'u_midori', 'u_yuzu'];
    expect(synergyCondition(pack, 'syn_plat_ending_credits', deploy([...team, 'u_al1s'], 3))).toEqual({ count: 4, met: true });
    expect(synergyCondition(pack, 'syn_plat_ending_credits', deploy([...team, 'u_aris'], 3))).toEqual({ count: 4, met: true });
    expect(synergyCondition(pack, 'syn_plat_ending_credits', deploy([...team, 'u_aris'], 2))!.met).toBe(false);
  });

  it('코드네임: 5명 출전 + 네루·토키만 3성이면 된다', () => {
    const cc = members('syn_plat_codename');
    const d = deploy(cc, 1).map((x) => (x.unitId === 'u_neru' || x.unitId === 'u_toki' ? { ...x, star: 3 } : x));
    expect(synergyCondition(pack, 'syn_plat_codename', d)).toEqual({ count: 5, met: true });
    expect(synergyCondition(pack, 'syn_plat_codename', deploy(cc, 2))!.met).toBe(false);
  });

  it('조건 없는 보통 시너지는 null', () => {
    expect(synergyCondition(pack, 'syn_game_dev', deploy(['u_momoi']))).toBeNull();
  });
});

describe('명단 없는 이스터에그(special)', () => {
  const factions = pack.synergies.filter((s) => s.category === 'faction');
  // 진영마다 그 진영 학생 한 명(다른 진영 학생과 겹치지 않게)
  const onePerFaction = (): string[] => {
    const used = new Set<string>();
    const out: string[] = [];
    for (const f of factions) {
      const id = f.memberIds.find((m) => !used.has(m) && pack.units.find((u) => u.id === m)!.shopEligible);
      if (id) { used.add(id); out.push(id); }
    }
    return out;
  };

  it('학원 대항전: 서로 다른 진영 10곳에서 1명씩 10명이면 켜지고, 같은 진영 둘은 한 곳으로 센다', () => {
    const ten = onePerFaction().slice(0, 10);
    expect(ten).toHaveLength(10);
    expect(synergyCondition(pack, 'syn_plat_school_battle', deploy(ten))).toEqual({ count: 10, met: true });
    const gehenna = members('syn_gehenna').slice(0, 2);
    const r = synergyCondition(pack, 'syn_plat_school_battle', deploy([...ten.slice(0, 8), ...gehenna]))!;
    expect(r.met).toBe(false);
    expect(r.count).toBeLessThan(10);
  });

  it('총력전 만점: 10명 모두 3성 + 역할군 7개', () => {
    const roles = pack.synergies.filter((s) => s.category === 'role');
    const picks: string[] = [];
    for (const r of roles) picks.push(r.memberIds.find((m) => !picks.includes(m))!);
    for (const u of pack.units) if (picks.length < 10 && !picks.includes(u.id) && u.shopEligible) picks.push(u.id);
    expect(synergyCondition(pack, 'syn_plat_total_assault', deploy(picks, 3))).toEqual({ count: 10, met: true });
    expect(synergyCondition(pack, 'syn_plat_total_assault', deploy(picks, 2))!.met).toBe(false);
    const noHealer = picks.filter((id) => !pack.units.find((u) => u.id === id)!.synergyIds.includes('syn_healer'));
    expect(synergyCondition(pack, 'syn_plat_total_assault', deploy(noHealer, 3))!.met).toBe(false);
  });
});
