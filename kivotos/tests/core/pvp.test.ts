// PvP 전투(학생 대 학생, input.opponent). 상대 진영의 시너지·오파츠·전략도 같은 효과 코드가 반대 시점으로 실행한다.
import { describe, expect, it } from 'vitest';
import { contentPack as pack } from '../../src/content';
import { createBattle, simulateBattle } from '../../src/core/battle';
import type { BattleAllyInput, BattleInput, BattleTeamInput } from '../../src/core/battle/types';
import { Rng } from '../../src/core/rng';

const unit = (unitId: string, slot: number, zone: 'front' | 'rear', star: 1 | 2 | 3 = 2, equipment: string[] = []): BattleAllyInput =>
  ({ instanceId: `${unitId}-${zone}${slot}`, unitId, star, zone, slot, equipment });

/** 테스트용 시너지 단계: 학생 종류 수로 센다(전방·후방 한정 집계는 무시) */
function tiers(units: BattleAllyInput[]): Record<string, number> {
  const count = new Map<string, Set<string>>();
  for (const u of units) for (const sid of pack.units.find((x) => x.id === u.unitId)!.synergyIds) {
    if (!count.has(sid)) count.set(sid, new Set());
    count.get(sid)!.add(u.unitId);
  }
  const out: Record<string, number> = {};
  for (const [sid, ids] of count) {
    const syn = pack.synergies.find((s) => s.id === sid);
    if (!syn || syn.category === 'easteregg' || syn.category === 'unique') continue;
    syn.tiers.forEach((t, i) => { if (ids.size >= t.threshold) out[sid] = i; });
  }
  return out;
}

const team = (units: BattleAllyInput[], extra: Partial<BattleTeamInput> = {}): BattleTeamInput =>
  ({ units, activeTiers: tiers(units), strategies: [], ooparts: [], ...extra });

function pvp(a: BattleTeamInput, b: BattleTeamInput, seed: string): BattleInput {
  return {
    seed, nodeType: 'normal', chapter: 2, statScaleBps: 10000, enemies: [],
    allies: a.units, activeTiers: a.activeTiers, strategies: a.strategies, ooparts: a.ooparts, opponent: b,
  };
}

const GEHENNA = [unit('u_iori', 0, 'front'), unit('u_haruna', 1, 'front'), unit('u_hina', 2, 'front'), unit('u_ako', 0, 'rear'), unit('u_chinatsu', 1, 'rear')];
const MILLENNIUM = [unit('u_neru', 0, 'front'), unit('u_yuuka', 1, 'front'), unit('u_toki', 2, 'front'), unit('u_noa', 0, 'rear'), unit('u_hare', 1, 'rear')];

describe('PvP 전투', () => {
  it('상대 진영은 학생으로 놓이고 결과가 결정적이다', () => {
    const i = pvp(team(GEHENNA), team(MILLENNIUM), 'PVP-1');
    const c = createBattle(pack, i);
    expect(c.units.filter((u) => u.side === 'enemy').map((u) => u.unit?.id)).toEqual(MILLENNIUM.map((u) => u.unitId));
    const x = simulateBattle(pack, i);
    const y = simulateBattle(pack, i);
    expect(JSON.stringify(x)).toBe(JSON.stringify(y));
    expect(x.opponent).toBeDefined();
    expect(x.combatants.filter((u) => u.ref.side === 'enemy').every((u) => !!u.unitId)).toBe(true);
  });

  it('상대 진영 시너지 효과는 상대 학생에게 붙는다(아군에게 새지 않음)', () => {
    const c = createBattle(pack, pvp(team(MILLENNIUM.map((u) => ({ ...u }))), team(GEHENNA), 'PVP-2'));
    const mine = c.units.filter((u) => u.side === 'ally');
    const theirs = c.units.filter((u) => u.side === 'enemy');
    // 게헨나 시너지 modifier는 상대(게헨나) 쪽에만 있다
    const gehennaMods = (us: typeof mine) => us.flatMap((u) => u.mods.map((m) => m.id)).filter((id) => id.includes('gehenna'));
    expect(gehennaMods(theirs).length).toBeGreaterThan(0);
    expect(gehennaMods(mine)).toEqual([]);
    expect(c.view('enemy').me).toBe('enemy');
    expect(c.view('enemy').tier('syn_gehenna')).toBeDefined();
    expect(c.tier('syn_gehenna')).toBeUndefined();
  });

  it('같은 편성끼리의 거울전은 씨앗에 따라 양쪽이 비슷하게 이긴다', () => {
    let wins = 0;
    const N = 120;
    for (let k = 0; k < N; k++) if (simulateBattle(pack, pvp(team(GEHENNA), team(GEHENNA), `MIRROR-${k}`)).outcome === 'win') wins++;
    expect(wins / N).toBeGreaterThan(0.3);
    expect(wins / N).toBeLessThan(0.7);
  });

  it('진영을 바꿔도 승률이 크게 뒤집히지 않는다(시점 편향 없음)', () => {
    let ab = 0;
    let ba = 0;
    const N = 80;
    for (let k = 0; k < N; k++) {
      if (simulateBattle(pack, pvp(team(GEHENNA), team(MILLENNIUM), `SWAP-${k}`)).outcome === 'win') ab++;
      if (simulateBattle(pack, pvp(team(MILLENNIUM), team(GEHENNA), `SWAP-${k}`)).outcome === 'loss') ba++;
    }
    expect(Math.abs(ab - ba) / N).toBeLessThan(0.2);
  });

  it('무작위 편성·오파츠·전략 300판이 오류 없이 끝난다', () => {
    const rng = new Rng(20261102);
    const shop = pack.units.filter((u) => u.shopEligible);
    const pick = <T,>(xs: T[]) => xs[rng.nextInt(xs.length)];
    const randomTeam = (): BattleTeamInput => {
      const ids = new Set<string>();
      while (ids.size < 7) ids.add(pick(shop).id);
      const units: BattleAllyInput[] = [];
      let f = 0; let r = 0;
      for (const id of ids) {
        const u = pack.units.find((x) => x.id === id)!;
        const front = u.position !== 'rear_only' && (f < 4 && (u.position === 'front_only' || r >= 3 || rng.nextInt(2) === 0));
        if (front && f < 4) units.push(unit(id, f++, 'front', (1 + rng.nextInt(3)) as 1 | 2 | 3, [pick(pack.equipment).id]));
        else if (u.position !== 'front_only' && r < 6) units.push(unit(id, r++, 'rear', (1 + rng.nextInt(3)) as 1 | 2 | 3));
      }
      if (!units.some((u) => u.zone === 'front')) units.push(unit('u_iori', 3, 'front'));
      return team(units, {
        ooparts: [pick(pack.ooparts).id, pick(pack.ooparts).id, pick(pack.ooparts).id],
        strategies: [pick(pack.strategies).id],
        serikaWins: rng.nextInt(10), dessert: rng.nextInt(2) === 0,
      });
    };
    const outcomes = { win: 0, loss: 0 };
    for (let k = 0; k < 300; k++) {
      const out = simulateBattle(pack, pvp(randomTeam(), randomTeam(), `RND-${k}`));
      outcomes[out.outcome]++;
      expect(out.events.at(-1)?.t).toBe('end');
    }
    expect(outcomes.win).toBeGreaterThan(60);
    expect(outcomes.loss).toBeGreaterThan(60);
  });
});
