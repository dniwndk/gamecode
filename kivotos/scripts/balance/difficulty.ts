// 난이도 측정(지금 빌드의 미리보기 런). 오파츠 없이 봇이 끝까지 플레이하고 노드별 승률·전투 길이·종료 사유를 센다.
//   npx tsx scripts/balance/difficulty.ts [판 수=400]
// 결과 JSON은 표준 출력. 결과 해석은 docs/GDD_v2.3_amendment.md 13장.
import { playRun, type RunOutcome } from './bot';

const n = Number(process.argv[2] ?? 400);
type NodeStat = { battles: number; wins: number; avSum: number; avMax: number; reasons: Record<string, number> };
const byNode: Record<string, NodeStat> = {};
const runs: RunOutcome[] = [];
for (let i = 0; i < n; i++) {
  runs.push(await playRun(`DIFF-${i}`, [], 'skip', Math.random, null, (run) => {
    const b = run.lastBattle, r = run.lastResult;
    if (!b || !r) return;
    const s = (byNode[run.nodeId] ??= { battles: 0, wins: 0, avSum: 0, avMax: 0, reasons: {} });
    const end = b.events[b.events.length - 1];
    s.battles++; s.wins += +(r.outcome === 'win'); s.avSum += end.av; s.avMax = Math.max(s.avMax, end.av);
    s.reasons[r.reason] = (s.reasons[r.reason] ?? 0) + 1;
  }));
}
const mean = (xs: number[]) => Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 100) / 100;
const nodes = Object.fromEntries(Object.entries(byNode).sort().map(([id, s]) => [id, { battles: s.battles, winRate: Math.round((s.wins / s.battles) * 1000) / 10, avgAv: Math.round(s.avSum / s.battles), maxAv: s.avMax, reasons: s.reasons }]));
process.stdout.write(JSON.stringify({ runs: n, wins: mean(runs.map((r) => r.wins)), complete: mean(runs.map((r) => +r.complete)) * 100, nodesPlayed: mean(runs.map((r) => r.nodes)), nodes }, null, 1));
