// 전투 회귀 지문: 고정 씨앗 봇 런의 모든 전투 결과를 해시한다. 엔진 리팩터링 전후 값이 같아야 한다.
//   npx tsx scripts/balance/regress.ts [runs]
import { createHash } from 'node:crypto';
import { contentPack as pack } from '../../src/content';
import { playRun } from './bot';

let s = 12345;
const rand = () => { s = (Math.imul(s, 1103515245) + 12345) >>> 0; return s / 4294967296; };
const runs = Number(process.argv[2] ?? 40);
const h = createHash('sha256');
let battles = 0;
for (let i = 0; i < runs; i++) {
  const oops = i % 2 ? [pack.ooparts[(i * 7) % pack.ooparts.length].id, pack.ooparts[(i * 13 + 5) % pack.ooparts.length].id] : [];
  await playRun(`REG-${i}`, oops, i % 3 === 0 ? 'random' : 'first', rand, null, (run) => {
    battles++;
    h.update(JSON.stringify(run.lastBattle?.events ?? []));
    h.update(JSON.stringify(run.lastResult ?? null));
  });
}
console.log(`battles=${battles} hash=${h.digest('hex').slice(0, 16)}`);
