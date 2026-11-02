// PvP 밸런스 표 자동 탐색: 덱마다 대표 시너지 하나를 손잡이로 두고, 총당 평균 승률이 0.5에 가까워지게 ATK·HP bps를 함께 움직인다.
//   npx tsx scripts/balance/pvp-tune.ts [반복=12] [판수=4]
// 결과 표를 src/app/run/multiRules.ts PVP_SYNERGY_BPS에 옮겨 적고 pvp-decks.ts로 다시 잰다.
import { DECKS, duel, teamOf } from './pvp-decks';
import type { PvpAdjust } from '../../src/app/run/multiRules';

const ITER = Number(process.argv[2] ?? 12);
const N = Number(process.argv[3] ?? 4);
export const KNOB: Record<string, [string, number?]> = {
  게헨나: ['syn_gehenna', 6], 밀레니엄: ['syn_seminar', 4], 트리니티: ['syn_trinity', 6], 아비도스: ['syn_abydos'],
  백귀야행: ['syn_hyakkiyako'], 'C&C': ['syn_cc'], 아리우스: ['syn_arius'], 게임개발부: ['syn_game_dev'],
  붉은겨울: ['syn_red_winter'], 'SRT·발키리': ['syn_srt'], 블래스터: ['syn_blaster', 6], '탱커·스나이퍼': ['syn_sniper', 4],
  '힐러·서포터': ['syn_healer', 4], 어태커: ['syn_attacker', 4],
  게헨나B: ['syn_gehenna', 6], 트리니티B: ['syn_trinity', 6], 백귀야행B: ['syn_hyakkiyako'], 'SRT B': ['syn_srt'], 밀레니엄B: ['syn_millennium', 8],
};
const names = Object.keys(DECKS);
const table: Record<string, PvpAdjust> = {};
const knob = new Map<string, number>();
function measure(): Map<string, number> {
  const teams = new Map(names.map((n) => [n, teamOf(DECKS[n], 2, table)]));
  const w = new Map(names.map((n) => [n, 0]));
  for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) {
    let a = 0;
    for (let k = 0; k < N; k++) { a += duel(teams.get(names[i])!, teams.get(names[j])!, `T${k}`); a += 1 - duel(teams.get(names[j])!, teams.get(names[i])!, `T${k}`); }
    const r = a / (2 * N);
    w.set(names[i], w.get(names[i])! + r); w.set(names[j], w.get(names[j])! + 1 - r);
  }
  return new Map([...w].map(([k, v]) => [k, v / (names.length - 1)]));
}
let best: { spread: number; table: string; line: string } | null = null;
for (let it = 0; it < ITER; it++) {
  const m = measure();
  const spread = Math.max(...m.values()) - Math.min(...m.values());
  const line = [...m].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v.toFixed(2)}`).join(' · ');
  if (!best || spread < best.spread) best = { spread, table: JSON.stringify(table), line };
  console.log(`#${it} 폭 ${spread.toFixed(2)} ` + [...m].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v.toFixed(2)}`).join(' · '));
  // 손잡이(시너지)마다 그 시너지를 쓰는 덱들의 평균으로 움직인다
  const dev = new Map<string, number[]>();
  for (const [deck, v] of m) { const k = KNOB[deck]; if (k) { if (!dev.has(k[0])) dev.set(k[0], []); dev.get(k[0])!.push(v); } }
  for (const [sid, vs] of dev) {
    const v = vs.reduce((a, b) => a + b, 0) / vs.length;
    const min = Object.values(KNOB).find((k) => k[0] === sid)?.[1];
    const cur = knob.get(sid) ?? 0;
    const step = (0.5 - v) * 0.6 * Math.max(0.25, 1 - it / ITER);
    // 손잡이 x 하나: 시너지 세기 배율 1+x(0.3~2.0)와 편성 전원 ATK·HP x/2(±40%)를 함께 움직인다
    const x = Math.max(-1, Math.min(1.5, cur + step));
    knob.set(sid, x);
    const power = Math.max(0.3, Math.min(2, Math.round((1 + x) * 20) / 20));
    const st = Math.max(-4000, Math.min(4000, Math.round((x * 5000) / 250) * 250));
    table[sid] = { power, ...(st ? { atk: st, hp: st } : {}), ...(min ? { min } : {}) };
  }
}
console.log(`가장 고른 표: 폭 ${best!.spread.toFixed(2)} · ${best!.line}`);
console.log(best!.table);
