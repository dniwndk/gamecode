// 오파츠 보상·조합·레시피 공개(docs/OOPARTS_v1.md 1장)
import { describe, expect, it } from 'vitest';
import { contentPack as pack } from '../../src/content';
import { Rng } from '../../src/core/rng';
import {
  acquireOopart,
  boostedOoparts,
  emptyOopartProfile,
  emptyOopartRunState,
  markRescueUsed,
  oopartCodex,
  recipeBadge,
  rescueDue,
  rollOopartOffer,
  type OopartRunState,
} from '../../src/core/ooparts/ooparts';

const rarityOf = (id: string) => pack.ooparts.find((o) => o.id === id)!.rarity;
const state = (...owned: string[]): OopartRunState => ({ owned, rescueUsed: false });

function acquireAll(ids: string[]) {
  let s = emptyOopartRunState();
  let p = emptyOopartProfile();
  const merges = [];
  for (const id of ids) {
    const r = acquireOopart(pack, s, p, id);
    if (!r.ok) throw new Error(r.message);
    s = r.state;
    p = r.profile;
    merges.push(...r.merges);
  }
  return { s, p, merges };
}

describe('보상 제안', () => {
  it('3택1: 서로 다르고, 미보유이며, 전설은 없다', () => {
    const owned = state('oop_nebra_disk', 'oop_haniwa');
    for (let seed = 1; seed <= 300; seed++) {
      for (const [src, ch] of [['run_start', 1], ['elite', 2], ['elite', 3], ['boss', 1]] as const) {
        const offer = rollOopartOffer(pack, owned, src, ch, new Rng(seed));
        expect(offer).toHaveLength(3);
        expect(new Set(offer).size).toBe(3);
        expect(offer.some((id) => owned.owned.includes(id))).toBe(false);
        expect(offer.some((id) => rarityOf(id) === 'legendary')).toBe(false);
      }
    }
  });

  it('등급 확률: 런 시작은 일반만, 보스는 희귀만, 1장 정예에는 일반이 없다', () => {
    for (let seed = 1; seed <= 200; seed++) {
      expect(rollOopartOffer(pack, state(), 'run_start', 1, new Rng(seed)).every((id) => rarityOf(id) === 'common')).toBe(true);
      expect(rollOopartOffer(pack, state(), 'boss', 2, new Rng(seed)).every((id) => rarityOf(id) === 'rare')).toBe(true);
      expect(rollOopartOffer(pack, state(), 'elite', 1, new Rng(seed)).some((id) => rarityOf(id) === 'common')).toBe(false);
    }
  });

  it('5장(최종) 보스는 오파츠를 주지 않는다(1~4장만, v2.4.2)', () => {
    expect(rollOopartOffer(pack, state(), 'boss', 5, new Rng(7))).toEqual([]);
    expect(rollOopartOffer(pack, state(), 'boss', 4, new Rng(7))).toHaveLength(3);
  });

  it('희귀가 바닥나면 아래 등급으로 내려간다', () => {
    const allRare = pack.ooparts.filter((o) => o.rarity === 'rare').map((o) => o.id);
    const offer = rollOopartOffer(pack, state(...allRare), 'boss', 1, new Rng(5));
    expect(offer).toHaveLength(3);
    expect(offer.every((id) => rarityOf(id) === 'uncommon')).toBe(true);
  });

  it('구조 요청은 1개를 바로 준다', () => {
    const offer = rollOopartOffer(pack, state(), 'rescue', 2, new Rng(3));
    expect(offer).toHaveLength(1);
    expect(rarityOf(offer[0])).toBe('common');
  });

  it('같은 시드·상태면 같은 제안(재현성)', () => {
    const a = rollOopartOffer(pack, state('oop_voynich'), 'elite', 3, new Rng(2024));
    const b = rollOopartOffer(pack, state('oop_voynich'), 'elite', 3, new Rng(2024));
    expect(a).toEqual(b);
  });

  it('레시피 재료를 하나 가지면 남은 재료가 더 자주 나온다(가중치 ×2)', () => {
    const boosted = boostedOoparts(pack, state('oop_schale_annex_key'));
    expect([...boosted].sort()).toEqual(['oop_roman_dodecahedron', 'oop_voynich']);
    const count = (s: OopartRunState) => {
      let n = 0;
      for (let seed = 1; seed <= 6000; seed++) if (rollOopartOffer(pack, s, 'run_start', 1, new Rng(seed)).includes('oop_voynich')) n++;
      return n;
    };
    const base = count(state('oop_okiku_doll'));
    const withPart = count(state('oop_schale_annex_key'));
    expect(withPart / base).toBeGreaterThan(1.6);
    expect(withPart / base).toBeLessThan(2.3);
  });
});

describe('조합과 레시피 공개', () => {
  it('재료를 모두 모으면 재료가 사라지고 전설이 된다', () => {
    const { s, merges } = acquireAll(['oop_nebra_disk', 'oop_schale_annex_key', 'oop_roman_dodecahedron', 'oop_voynich']);
    expect(s.owned).toEqual(['oop_nebra_disk', 'oop_shittim_chest']);
    expect(merges).toEqual([{ legendaryId: 'oop_shittim_chest', consumed: ['oop_schale_annex_key', 'oop_roman_dodecahedron', 'oop_voynich'], firstReveal: true }]);
  });

  it('재료 일부만으로는 조합되지 않는다', () => {
    const { s, merges } = acquireAll(['oop_schale_annex_key', 'oop_roman_dodecahedron']);
    expect(s.owned).toEqual(['oop_schale_annex_key', 'oop_roman_dodecahedron']);
    expect(merges).toEqual([]);
  });

  it('레시피는 처음 완성할 때 공개되고, 두 번째 완성은 공개 이벤트가 아니다', () => {
    const first = acquireAll(['oop_trinity_club_charter', 'oop_squad_manual']);
    expect(first.p.revealedRecipes).toEqual(['oop_eden_treaty']);
    let s = emptyOopartRunState();
    let p = first.p;
    for (const id of ['oop_squad_manual', 'oop_trinity_club_charter']) {
      const r = acquireOopart(pack, s, p, id);
      if (!r.ok) throw new Error(r.message);
      s = r.state;
      p = r.profile;
      if (id === 'oop_trinity_club_charter') expect(r.merges[0].firstReveal).toBe(false);
    }
    expect(p.revealedRecipes).toEqual(['oop_eden_treaty']);
  });

  it('공개 전에는 재료 배지가 없고, 공개 후에는 (보유/전체)를 보여 준다', () => {
    const s = state('oop_foreclosure_photo');
    expect(recipeBadge(pack, s, emptyOopartProfile(), 'oop_okiku_doll')).toBeNull();
    expect(recipeBadge(pack, s, { revealedRecipes: ['oop_yume_notebook'] }, 'oop_okiku_doll')).toEqual({ legendaryId: 'oop_yume_notebook', owned: 1, total: 3 });
    expect(recipeBadge(pack, s, { revealedRecipes: ['oop_yume_notebook'] }, 'oop_nebra_disk')).toBeNull();
  });

  it('도감: 공개 전 전설은 정의를 숨긴다', () => {
    const codex = oopartCodex(pack, { revealedRecipes: ['oop_nameless_relic'] });
    const hidden = codex.filter((c) => c.hidden).map((c) => c.id).sort();
    expect(hidden).toEqual(['oop_eden_treaty', 'oop_prototype_infinity', 'oop_shittim_chest', 'oop_yume_notebook']);
    expect(codex.find((c) => c.id === 'oop_eden_treaty')!.definition).toBeNull();
    expect(codex.find((c) => c.id === 'oop_nameless_relic')!.definition?.recipe).toHaveLength(3);
  });

  it('거부: 중복 보유, 전설 직접 획득, 없는 ID. 입력 상태는 바뀌지 않는다', () => {
    const s = state('oop_haniwa');
    const p = emptyOopartProfile();
    expect(acquireOopart(pack, s, p, 'oop_haniwa')).toMatchObject({ ok: false, reason: 'ALREADY_OWNED' });
    expect(acquireOopart(pack, s, p, 'oop_shittim_chest')).toMatchObject({ ok: false, reason: 'LEGENDARY_NOT_OFFERED' });
    expect(acquireOopart(pack, s, p, 'oop_nope')).toMatchObject({ ok: false, reason: 'UNKNOWN' });
    acquireOopart(pack, s, p, 'oop_nebra_disk');
    expect(s.owned).toEqual(['oop_haniwa']);
  });

  it('구조 요청은 3연패에서 런당 한 번', () => {
    const s = emptyOopartRunState();
    expect(rescueDue(pack, s, 2)).toBe(false);
    expect(rescueDue(pack, s, 3)).toBe(true);
    expect(rescueDue(pack, markRescueUsed(s), 5)).toBe(false);
  });
});
