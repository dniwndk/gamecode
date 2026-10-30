// 화면 연출 등급 판정. 레퍼런스 UI처럼 DOM을 WebGPU 텍스처로 올려 셰이더를 씌우는 길은
// Chrome 실험 기능(HTML-in-Canvas)이 있어야 하므로, 없는 브라우저는 단계적으로 내려간다.
// 등급이 낮아도 화면 기능은 같다(연출만 빠진다). docs/UI_FX.md 참고.

export type FxTier =
  /** DOM 카드를 WebGPU 텍스처로 그려 셰이더(굴절·박막 간섭·파편 전환)를 씌운다 */
  | 'html-in-canvas'
  /** DOM은 그대로 두고 뒤·앞에 WebGPU 캔버스(배경 유체·입자·빛줄기)만 겹친다 */
  | 'webgpu-overlay'
  /** CSS 애니메이션만 쓴다(지금 화면과 같다) */
  | 'css';

export interface FxCapabilities {
  webgpu: boolean;
  /** 2D 캔버스 drawElementImage */
  htmlInCanvas2d: boolean;
  /** GPUQueue.drawElementImageToTexture + updateElementGeometry */
  htmlInCanvasGpu: boolean;
  reducedMotion: boolean;
}

export function detectFx(): FxCapabilities {
  const g = globalThis as unknown as {
    navigator?: { gpu?: unknown };
    GPUQueue?: { prototype: Record<string, unknown> };
    HTMLCanvasElement?: { prototype: Record<string, unknown> };
    CanvasRenderingContext2D?: { prototype: Record<string, unknown> };
    matchMedia?: (q: string) => { matches: boolean };
  };
  const canvas = g.HTMLCanvasElement?.prototype;
  return {
    webgpu: !!g.navigator?.gpu,
    htmlInCanvas2d: typeof g.CanvasRenderingContext2D?.prototype.drawElementImage === 'function',
    htmlInCanvasGpu: typeof g.GPUQueue?.prototype.drawElementImageToTexture === 'function' && typeof canvas?.updateElementGeometry === 'function',
    reducedMotion: !!g.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  };
}

/** 어댑터를 실제로 받아 봐야 WebGPU를 쓸 수 있는지 안다(소프트웨어 렌더러·블록리스트 GPU). */
export async function chooseFxTier(caps: FxCapabilities = detectFx(), wanted: FxTier = 'html-in-canvas'): Promise<FxTier> {
  if (caps.reducedMotion || wanted === 'css' || !caps.webgpu) return 'css';
  const adapter = await (navigator as Navigator & { gpu: GPU }).gpu.requestAdapter().catch(() => null);
  if (!adapter) return 'css';
  return wanted === 'html-in-canvas' && caps.htmlInCanvasGpu ? 'html-in-canvas' : 'webgpu-overlay';
}
