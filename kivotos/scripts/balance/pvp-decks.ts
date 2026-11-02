// 대표 시너지 덱끼리 PvP 총당(라운드 로빈) 측정.
//   npx tsx scripts/balance/pvp-decks.ts [판수=20] [성급=2] [덱 이름 필터...]
// 덱은 레벨 8(8명) 같은 조건, 장비·오파츠·전략 없음. 각 쌍은 양쪽 진영을 바꿔 같은 씨앗으로 두 번씩 돈다(진영 치우침 상쇄).
import { contentPack as pack } from '../../src/content';
import { simulateBattle } from '../../src/core/battle';
import { synergyCondition } from '../../src/core/synergy/conditions';
import type { BattleAllyInput, BattleTeamInput } from '../../src/core/battle/types';
import { withPvpBalance, PVP_SYNERGY_BPS } from '../../src/app/run/multiRules';

const N = Number(process.argv[2] ?? 20);
const STAR = Number(process.argv[3] ?? 2) as 1 | 2 | 3;
const FILTER = process.argv.slice(4);

/** 대표 덱: 시너지 핵심 + 보조. 8명, 코스트 합 23~27(5코 2명 이하)로 맞춘다 */
export const DECKS: Record<string, string[]> = {
  게헨나: ['hina', 'aru', 'haruna', 'iori', 'mutsuki', 'kayoko', 'ako', 'chinatsu'],
  밀레니엄: ['neru', 'toki', 'akane', 'yuuka', 'koyuki', 'rio', 'noa', 'karin'],
  트리니티: ['mika', 'tsurugi', 'mine', 'azusa', 'koharu', 'mashiro', 'hifumi', 'hanako'],
  아비도스: ['hoshino', 'shiroko', 'nonomi', 'serika', 'ayane', 'ako', 'noa', 'himari'],
  백귀야행: ['wakamo', 'izuna', 'tsubaki', 'tsukuyo', 'niya', 'mimori', 'shizuko', 'chise'],
  'C&C': ['neru', 'toki', 'akane', 'asuna', 'karin', 'noa', 'rio', 'himari'],
  아리우스: ['saori', 'atsuko', 'azusa', 'koharu', 'hiyori', 'misaki', 'hanako', 'hifumi'],
  게임개발부: ['midori', 'toki', 'yuuka', 'aris', 'momoi', 'key', 'yuzu', 'noa'],
  붉은겨울: ['cherino', 'marina', 'shigure', 'momiji', 'kisaki', 'tomoe', 'meru', 'nodoka'],
  'SRT·발키리': ['miyako', 'kanna', 'kirino', 'fubuki', 'miyu', 'saki', 'moe', 'mashiro'],
  블래스터: ['hina', 'akane', 'nonomi', 'akari', 'mutsuki', 'moe', 'misaki', 'yuzu'],
  '탱커·스나이퍼': ['hoshino', 'tsurugi', 'saori', 'haruna', 'hiyori', 'karin', 'mashiro', 'serina'],
  '힐러·서포터': ['tsurugi', 'mine', 'serina', 'chinatsu', 'hanako', 'shizuko', 'nagisa', 'himari'],
  어태커: ['aru', 'neru', 'izuna', 'kazusa', 'ako', 'noa', 'chinatsu', 'hanako'],
  // 같은 시너지의 다른 구성(한 덱에만 맞춘 조정을 막는다)
  '게헨나B': ['hina', 'iori', 'haruna', 'kasumi', 'juri', 'mutsuki', 'ako', 'fuuka'],
  '트리니티B': ['tsurugi', 'mine', 'kazusa', 'natsu', 'koharu', 'hifumi', 'hanako', 'nagisa'],
  '백귀야행B': ['wakamo', 'izuna', 'tsubaki', 'kaede', 'niya', 'mimori', 'chise', 'shizuko'],
  'SRT B': ['miyako', 'saki', 'moe', 'miyu', 'kirino', 'fubuki', 'kanna', 'kotama'],
  '밀레니엄B': ['neru', 'toki', 'yuuka', 'eimi', 'noa', 'rio', 'utaha', 'hibiki'],
  혼합: ['hoshino', 'iori', 'tsurugi', 'kazusa', 'ako', 'nagisa', 'noa', 'serina'],
};

const unitOf = (id: string) => { const u = pack.units.find((x) => x.id === `u_${id}`); if (!u) throw new Error(`없는 학생 ${id}`); return u; };
const synById = new Map(pack.synergies.map((s) => [s.id, s]));

/** 앞줄 4칸: 전방 전용 → 탱커 → 겸용 순, 나머지는 후방 */
export function place(ids: string[], star: 1 | 2 | 3 = STAR): BattleAllyInput[] {
  const us = ids.map(unitOf);
  const frontScore = (u: ReturnType<typeof unitOf>) => (u.position === 'rear_only' ? -1 : (u.position === 'front_only' ? 3 : 0) + (u.synergyIds.includes('syn_tank') ? 2 : 0) + (u.synergyIds.includes('syn_attacker') ? 1 : 0));
  const sorted = [...us].sort((a, b) => frontScore(b) - frontScore(a));
  const front = sorted.filter((u) => u.position !== 'rear_only').slice(0, 4);
  const rear = us.filter((u) => !front.includes(u));
  if (rear.some((u) => u.position === 'front_only')) throw new Error(`앞줄이 넘침: ${ids.join(',')}`);
  return [
    ...front.map((u, slot) => ({ instanceId: `${u.id}-f${slot}`, unitId: u.id, star, zone: 'front' as const, slot, equipment: [] })),
    ...rear.map((u, slot) => ({ instanceId: `${u.id}-r${slot}`, unitId: u.id, star, zone: 'rear' as const, slot, equipment: [] })),
  ];
}

export function tiers(units: BattleAllyInput[]): Record<string, number> {
  const counts = new Map<string, Set<string>>();
  for (const u of units) for (const sid of unitOf(u.unitId.slice(2)).synergyIds) {
    const syn = synById.get(sid);
    if (!syn) continue;
    if (syn.countScope === 'front_only' && u.zone !== 'front') continue;
    if (syn.countScope === 'rear_only' && u.zone !== 'rear') continue;
    if (!counts.has(sid)) counts.set(sid, new Set());
    counts.get(sid)!.add(u.unitId);
  }
  const n = new Map([...counts].map(([k, v]) => [k, v.size]));
  const conds = new Map<string, boolean>();
  for (const syn of pack.synergies) {
    const c = synergyCondition(pack, syn.id, units.map((u) => ({ unitId: u.unitId, star: u.star })));
    if (!c) continue;
    conds.set(syn.id, c.met);
    if (c.count > 0) n.set(syn.id, c.count); else n.delete(syn.id);
  }
  const out: Record<string, number> = {};
  for (const [sid, count] of n) {
    const syn = synById.get(sid)!;
    syn.tiers.forEach((t, i) => { if (count >= t.threshold && conds.get(sid) !== false) out[sid] = i; });
  }
  return out;
}

/** table: PvP 밸런스 표(기본은 지금 적용 중인 표, {}면 보정 없음) */
export const teamOf = (ids: string[], star: 1 | 2 | 3 = STAR, table = PVP_SYNERGY_BPS): BattleTeamInput => {
  const units = place(ids, star);
  const t: BattleTeamInput = { units, activeTiers: tiers(units), strategies: [], ooparts: [] };
  return withPvpBalance(pack, t, table);
};

export function duel(a: BattleTeamInput, b: BattleTeamInput, seed: string): number {
  const out = simulateBattle(pack, { seed, nodeType: 'normal', chapter: 3, statScaleBps: 10000, enemies: [], allies: a.units, activeTiers: a.activeTiers, strategies: a.strategies, ooparts: a.ooparts, statBpsByUnit: a.statBpsByUnit, synergyDmgBps: a.synergyDmgBps, synergyScale: a.synergyScale, opponent: b });
  return out.outcome === 'win' ? 1 : out.outcome === 'loss' ? 0 : 0.5;
}

if (process.argv[1]?.endsWith('pvp-decks.ts')) {
  const names = Object.keys(DECKS).filter((n) => !FILTER.length || FILTER.some((f) => n.includes(f)));
  const teams = new Map(names.map((n) => [n, teamOf(DECKS[n])]));
  const cost = (n: string) => DECKS[n].reduce((a, id) => a + unitOf(id).cost, 0);
  const win = new Map<string, number>(names.map((n) => [n, 0]));
  const games = new Map<string, number>(names.map((n) => [n, 0]));
  const cell = new Map<string, number>();
  for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) {
    const A = teams.get(names[i])!; const B = teams.get(names[j])!;
    let a = 0;
    for (let k = 0; k < N; k++) { a += duel(A, B, `D${k}`); a += 1 - duel(B, A, `D${k}`); }
    const r = a / (2 * N);
    cell.set(`${names[i]}|${names[j]}`, r); cell.set(`${names[j]}|${names[i]}`, 1 - r);
    win.set(names[i], win.get(names[i])! + r); win.set(names[j], win.get(names[j])! + 1 - r);
    games.set(names[i], games.get(names[i])! + 1); games.set(names[j], games.get(names[j])! + 1);
  }
  const order = [...names].sort((x, y) => win.get(y)! / games.get(y)! - win.get(x)! / games.get(x)!);
  console.log(`성급 ${STAR} · 쌍마다 ${2 * N}판`);
  for (const n of order) {
    const act = Object.entries(teams.get(n)!.activeTiers).map(([s, t]) => `${synById.get(s)!.name.replace(/^「|」$/g, '')}${synById.get(s)!.tiers[t].threshold}`).join(' ');
    console.log(`${n.padEnd(8)} 평균 ${(win.get(n)! / games.get(n)!).toFixed(2)}  코스트합 ${cost(n)}  | ${order.filter((m) => m !== n).map((m) => (cell.get(`${n}|${m}`)! * 100).toFixed(0).padStart(3)).join(' ')}  | ${act}`);
  }
}
