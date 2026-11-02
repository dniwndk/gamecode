// PvP 시점 대칭 점검: 오파츠·전략 하나를 한쪽에만 줬을 때, 그 쪽이 아군일 때와 적일 때 승률이 비슷해야 한다.
//   npx tsx scripts/balance/pvp-symmetry.ts [battles]
import { contentPack as pack } from '../../src/content';
import { simulateBattle } from '../../src/core/battle';
import type { BattleAllyInput, BattleInput, BattleTeamInput } from '../../src/core/battle/types';

const N = Number(process.argv[2] ?? 40);
const unit = (unitId: string, slot: number, zone: 'front' | 'rear', star: 1 | 2 | 3 = 2): BattleAllyInput => ({ instanceId: `${unitId}-${zone}${slot}`, unitId, star, zone, slot, equipment: [] });
function tiers(units: BattleAllyInput[]): Record<string, number> {
  const count = new Map<string, Set<string>>();
  for (const u of units) for (const sid of pack.units.find((x) => x.id === u.unitId)!.synergyIds) { if (!count.has(sid)) count.set(sid, new Set()); count.get(sid)!.add(u.unitId); }
  const out: Record<string, number> = {};
  for (const [sid, ids] of count) { const syn = pack.synergies.find((s) => s.id === sid)!; syn.tiers.forEach((t, i) => { if (ids.size >= t.threshold) out[sid] = i; }); }
  return out;
}
const comps: BattleAllyInput[][] = [
  [unit('u_iori', 0, 'front'), unit('u_haruna', 1, 'front'), unit('u_hina', 2, 'front'), unit('u_ako', 0, 'rear'), unit('u_chinatsu', 1, 'rear')],
  [unit('u_neru', 0, 'front'), unit('u_yuuka', 1, 'front'), unit('u_toki', 2, 'front'), unit('u_noa', 0, 'rear'), unit('u_hare', 1, 'rear')],
];
const team = (units: BattleAllyInput[], x: Partial<BattleTeamInput> = {}): BattleTeamInput => ({ units, activeTiers: tiers(units), strategies: [], ooparts: [], ...x });
const pvp = (a: BattleTeamInput, b: BattleTeamInput, seed: string): BattleInput => ({ seed, nodeType: 'normal', chapter: 2, statScaleBps: 10000, enemies: [], allies: a.units, activeTiers: a.activeTiers, strategies: a.strategies, ooparts: a.ooparts, opponent: b });
function rate(x: Partial<BattleTeamInput>): { asAlly: number; asEnemy: number } {
  let asAlly = 0; let asEnemy = 0;
  for (let k = 0; k < N; k++) for (const [i, j] of [[0, 0], [1, 1]]) {
    if (simulateBattle(pack, pvp(team(comps[i], x), team(comps[j]), `S${k}`)).outcome === 'win') asAlly++;
    if (simulateBattle(pack, pvp(team(comps[j]), team(comps[i], x), `S${k}`)).outcome === 'loss') asEnemy++;
  }
  return { asAlly: asAlly / (2 * N), asEnemy: asEnemy / (2 * N) };
}
const base = rate({});
console.log(`기준 ${base.asAlly.toFixed(2)} / ${base.asEnemy.toFixed(2)}`);
const rows: [string, number, number][] = [];
for (const o of pack.ooparts) { const r = rate({ ooparts: [o.id] }); rows.push([o.id, r.asAlly, r.asEnemy]); }
for (const s of pack.strategies) { const r = rate({ strategies: [s.id] }); rows.push([s.id, r.asAlly, r.asEnemy]); }
rows.sort((a, b) => Math.abs(b[1] - b[2]) - Math.abs(a[1] - a[2]));
for (const [id, a, e] of rows.slice(0, 15)) console.log(id.padEnd(32), a.toFixed(2), e.toFixed(2), (a - e).toFixed(2));
