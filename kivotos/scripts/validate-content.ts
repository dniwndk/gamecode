// npm run content:validate — 콘텐츠 팩 정적 검증. 오류가 있으면 exit 1.
// --require-implemented: 실행 연산이 없는 효과도 오류로 본다(M3 완료 기준).
import { contentPack } from '../src/content';
import { validateContentPack } from '../src/core/content/validate';

const requireImplemented = process.argv.includes('--require-implemented');
const report = validateContentPack(contentPack, { requireImplemented });
const { counts, effectsImplemented, effectsTotal, portraitsPresent } = report.stats;

console.log(`콘텐츠 팩 ${contentPack.manifest.contentVersion} / 규칙 ${contentPack.manifest.rulesVersion}`);
console.log(Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(' · '));
console.log(`효과 실행 연산 ${effectsImplemented}/${effectsTotal} · 초상화 ${portraitsPresent}/${counts.units}`);
for (const w of report.warnings) console.warn(`경고 [${w.code}] ${w.path}: ${w.message}`);
for (const e of report.errors) console.error(`오류 [${e.code}] ${e.path}: ${e.message}`);
if (report.errors.length) {
  console.error(`검증 실패: 오류 ${report.errors.length}건`);
  process.exit(1);
}
console.log(`검증 통과 (경고 ${report.warnings.length}건)`);
