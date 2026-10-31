// 저장소의 카탈로그 JSON이 docs/의 기획서에서 다시 뽑은 결과와 같아야 한다(손으로 고친 JSON 금지).
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('scripts/extract-content.mjs --check', () => {
  it('기획서와 카탈로그가 같다', () => {
    const root = fileURLToPath(new URL('../..', import.meta.url));
    const out = execFileSync(process.execPath, ['scripts/extract-content.mjs', '--check'], { cwd: root, encoding: 'utf8' });
    expect(out).toContain('카탈로그가 기획서와 같다');
  });
});
