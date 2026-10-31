// 계층 규칙: core는 아무것도 모르는 순수 코드, app(UI 계약)은 core만, ui는 app과 content만 쓴다.
// 이 규칙 덕분에 src/ui 를 통째로 바꿔도 게임 규칙은 그대로다(docs/UI_CONTRACT.md).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SRC = fileURLToPath(new URL('../../src', import.meta.url));

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? files(p) : p.endsWith('.ts') ? [p] : [];
  });
}
const layerOf = (file: string) => relative(SRC, file).split(sep)[0];
function importsOf(file: string): string[] {
  const text = readFileSync(file, 'utf8');
  return [...text.matchAll(/^\s*import\s[^'"]*['"]([^'"]+)['"]/gm), ...text.matchAll(/^\s*export\s[^'"]*from\s+['"]([^'"]+)['"]/gm)].map((m) => m[1]);
}
function targetLayer(file: string, spec: string): string {
  if (!spec.startsWith('.')) return `pkg:${spec}`;
  return layerOf(join(file, '..', spec));
}

const ALLOWED: Record<string, string[]> = {
  core: ['core'],
  content: ['core', 'content'],
  app: ['core', 'content', 'app'],
  ui: ['app', 'content', 'ui', 'core-types'],
};

describe('계층 의존 방향', () => {
  for (const file of files(SRC)) {
    const layer = layerOf(file);
    it(`${relative(SRC, file)}`, () => {
      for (const spec of importsOf(file)) {
        const target = targetLayer(file, spec);
        if (target.startsWith('pkg:')) {
          // 코어·계약 계층은 외부 패키지를 쓰지 않는다(브라우저·Worker·Node 어디서나 같은 결과)
          expect(layer === 'ui', `${layer}가 외부 패키지 ${spec}를 import`).toBe(true);
          continue;
        }
        // ui는 core의 타입 파일만 볼 수 있다(규칙 함수 직접 호출 금지)
        const resolved = target === 'core' && layer === 'ui' && spec.includes('/types/') ? 'core-types' : target;
        expect(ALLOWED[layer], `${layer} → ${resolved} (${spec})`).toContain(resolved);
      }
    });
  }

  it('core에는 시계·난수·DOM 접근이 없다(12.1)', () => {
    for (const file of files(join(SRC, 'core'))) {
      const text = readFileSync(file, 'utf8').replace(/\/\/.*$/gm, '');
      expect(text, relative(SRC, file)).not.toMatch(/Math\.random|Date\.now|new Date\(|performance\.now|setTimeout|requestAnimationFrame|\bwindow\.|\bdocument\./);
    }
  });
});
