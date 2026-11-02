// 보정 없음 / PvP 밸런스 표 적용 덱 평균 승률 비교(마크다운 표).
//   npx tsx scripts/balance/pvp-compare.ts [판수=4]
import { DECKS, duel, teamOf } from './pvp-decks';
const N = Number(process.argv[2] ?? 4);
const names = Object.keys(DECKS);
function avg(star: 1 | 2 | 3, on: boolean): Map<string, number> {
  const T = new Map(names.map((n) => [n, on ? teamOf(DECKS[n], star) : teamOf(DECKS[n], star, {})]));
  const w = new Map(names.map((n) => [n, 0]));
  for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) {
    let a = 0;
    for (let k = 0; k < N; k++) a += duel(T.get(names[i])!, T.get(names[j])!, `C${k}`) + 1 - duel(T.get(names[j])!, T.get(names[i])!, `C${k}`);
    const r = a / (2 * N);
    w.set(names[i], w.get(names[i])! + r); w.set(names[j], w.get(names[j])! + 1 - r);
  }
  return new Map([...w].map(([k, v]) => [k, v / (names.length - 1)]));
}
const cols: [string, Map<string, number>][] = [];
for (const st of [1, 2, 3] as const) { cols.push([`${st}성 전`, avg(st, false)]); cols.push([`${st}성 후`, avg(st, true)]); }
const pct = (v: number) => `${Math.round(v * 100)}%`;
console.log(`| 덱 | ${cols.map(([h]) => h).join(' | ')} |`);
console.log(`|---|${cols.map(() => '---:').join('|')}|`);
for (const n of [...names].sort((a, b) => cols[2][1].get(b)! - cols[2][1].get(a)!)) console.log(`| ${n} | ${cols.map(([, m]) => pct(m.get(n)!)).join(' | ')} |`);
const spread = (m: Map<string, number>) => Math.max(...m.values()) - Math.min(...m.values());
console.log(`| **최고−최저** | ${cols.map(([, m]) => `**${Math.round(spread(m) * 100)}%p**`).join(' | ')} |`);
