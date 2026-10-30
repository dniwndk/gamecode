// 화면 연출 등급 판정. WebGL2 셰이더 연출이 되면 'webgl2', 아니면 지금 화면 그대로인 'css'.
// WebGL2는 주요 브라우저(모바일 포함)의 표준 기능이라 등록·토큰·만료가 없다. docs/UI_FX.md 참고.

export type FxTier = 'webgl2' | 'css';

export function chooseFxTier(opts: { reduceMotion: boolean; fx: boolean }): FxTier {
  if (opts.reduceMotion || !opts.fx) return 'css';
  if (typeof document === 'undefined') return 'css';
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return 'css';
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return 'webgl2';
  } catch {
    return 'css';
  }
}
