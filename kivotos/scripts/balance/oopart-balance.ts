// 오파츠 밸런스 측정(지금 빌드의 미리보기 런). 같은 시드로 오파츠 없음 / 하나만 가짐을 짝지어 비교한다.
//   npx tsx scripts/balance/oopart-balance.ts single [판 수=400] [첫 조건-끝 조건]   오파츠 55종 각각(처음부터 보유)
//   npx tsx scripts/balance/oopart-balance.ts focus  [판 수=400]                      조건부 오파츠: 그 시너지에 집중하는 봇
//   npx tsx scripts/balance/oopart-balance.ts flow   [판 수=1000]                     실제 획득 흐름: 건너뛰기·첫 번째·무작위
// 결과 JSON은 표준 출력. 판당 약 0.05초(단일 프로세스). 결과 해석은 docs/OOPARTS_BALANCE_v1.md.
import { contentPack } from '../../src/content';
import { playRun, type OopPolicy, type RunOutcome } from './bot';

/** 효과가 특정 시너지 학생에게만 걸리는 오파츠 → 봇이 집중할 시너지 */
export const FOCUS: [string, string][] = [
  ['oop_disco_colgante', 'syn_blaster'], ['oop_atlantis_medal', 'syn_supporter'], ['oop_winnipesaukee_stone', 'syn_controller'],
  ['oop_dragon_censer', 'syn_shanhaijing'], ['oop_jailbreak_kit', 'syn_outlaw'], ['oop_foreclosure_photo', 'syn_abydos'], ['oop_yume_notebook', 'syn_abydos'],
  ['oop_millennium_prize', 'syn_millennium'], ['oop_coup_order', 'syn_red_winter'], ['oop_pandemonium_summons', 'syn_gehenna'],
  ['oop_wolfsegg_steel', 'syn_tank'], ['oop_golden_fleece', 'syn_healer'], ['oop_gsc_pass', 'syn_abydos'],
];

const [mode = 'single', nArg, range] = process.argv.slice(2);
const n = Number(nArg ?? (mode === 'flow' ? 1000 : 400));
const pick = (r: RunOutcome[]) => ({ wins: r.map((x) => x.wins), complete: r.map((x) => +x.complete), hp: r.map((x) => x.runHp), owned: r.map((x) => x.owned) });
const runMany = async (prefix: string, ids: string[], policy: OopPolicy = 'skip', focus: string | null = null, rand: () => number = Math.random) => {
  const out: RunOutcome[] = [];
  for (let i = 0; i < n; i++) out.push(await playRun(`${prefix}-${i}`, ids, policy, rand, focus));
  return out;
};

const result: Record<string, ReturnType<typeof pick>> = {};
if (mode === 'single') {
  const conds = [{ id: 'baseline', ids: [] as string[] }, ...contentPack.ooparts.map((o) => ({ id: o.id, ids: [o.id] }))];
  const [lo, hi] = (range ?? `0-${conds.length - 1}`).split('-').map(Number);
  for (const c of conds.slice(lo, hi + 1)) { result[c.id] = pick(await runMany('BAL', c.ids)); process.stderr.write(`${c.id}\n`); }
} else if (mode === 'focus') {
  for (const syn of new Set(FOCUS.map((f) => f[1]))) result[`base:${syn}`] = pick(await runMany('BAL', [], 'skip', syn));
  for (const [id, syn] of FOCUS) { result[`${id}:${syn}`] = pick(await runMany('BAL', [id], 'skip', syn)); process.stderr.write(`${id}\n`); }
} else if (mode === 'flow') {
  for (const policy of ['skip', 'first', 'random'] as const) {
    let s = 12345;
    const rand = () => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 2 ** 32);
    result[policy] = pick(await runMany('FLOW', [], policy, null, rand));
  }
} else throw new Error(`모드: single | focus | flow (받은 값 ${mode})`);
process.stdout.write(JSON.stringify(result));
