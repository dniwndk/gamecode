---
name: webgpu-ui-fx
description: >
  Add a shader effects layer to a DOM game UI with WebGPU and HTML-in-Canvas
  (canvas layoutsubtree, GPUQueue.drawElementImageToTexture), with tiered
  fallback to plain CSS. Use when the user wants "premium", "living", glassy,
  fluid, iridescent, or shader-driven UI, mentions WebGPU, WGSL, HTML-in-Canvas,
  drawElementImage, or references the MatchaChoco010 dashboard style.
---

# WebGPU UI 연출 계층

DOM으로 만든 게임 화면에 셰이더 연출을 덧씌운다. 화면 기능은 언제나 DOM이 맡고, 셰이더는 보기만 바꾼다.
분석 배경은 `kivotos/docs/UI_FX.md`.

## 원칙

1. **등급으로 내려간다**: `html-in-canvas` → `webgpu-overlay` → `css`. 판정은 `kivotos/src/ui/blue/fx/capabilities.ts`의 `chooseFxTier()` 한 곳에서 한다. 기능이 없다고 화면을 막지 않는다.
2. **「연출 줄이기」 설정과 `prefers-reduced-motion`이면 `css`**.
3. **게임 규칙과 무관**: fx 코드는 `src/ui/` 안에만 둔다. 상태는 UiState에서 읽기만 한다(계층 테스트 `tests/unit/architecture.test.ts`).
4. **엔진 없이 WGSL 직접**: 전체 화면 사각형 + 필요한 만큼의 compute 패스. 셰이더 파일은 `*.wgsl`로 두고 `?raw`로 불러온다.

## 절차

1. `chooseFxTier()`로 등급을 정하고, `css`면 아무것도 만들지 않는다.
2. `webgpu-overlay`: DOM 루트 뒤에 `<canvas class="k-fx-bg">`(pointer-events:none)를 깔고 `navigator.gpu.requestAdapter()` → `device` → `context.configure({ format: navigator.gpu.getPreferredCanvasFormat(), alphaMode: 'premultiplied' })`.
   - 장치 손실(`device.lost`)이면 캔버스를 지우고 `css`로 내려간다.
   - 화면 배율(1920×1080 설계 해상도)과 `devicePixelRatio`를 곱하되 렌더 해상도 상한을 둔다(모바일 0.5배부터).
   - 탭이 숨으면(`visibilitychange`) 루프를 멈춘다.
3. `html-in-canvas`(Chrome 155+, 플래그 또는 Origin Trial): `<canvas layoutsubtree>` 안에 DOM 카드를 넣고, `paint` 이벤트에서 `device.queue.drawElementImageToTexture(element, texture)`로 텍스처를 갱신, 위치가 바뀌면 `canvas.updateElementGeometry`로 클릭 영역을 맞춘다. 이 등급은 카드·패널 몇 개에만 쓰고 화면 전체에 쓰지 않는다.
4. 움직임은 스프링(질량·강성·감쇠)으로: 드래그 놓기, 상점 카드 등장, 합성 연출.

## 쓸 만한 기법(레퍼런스에서 확인됨)

- 2D 유체: 속도 이류 → 발산 → 자코비 압력 반복(20회 안팎) → 기울기 빼기. 커서·드래그 속도를 힘으로 넣는다.
- 박막 간섭(thin-film): 시야각에 따라 파장별 위상차로 무지개빛. 헤일로·SSR 카드 테두리에.
- SDF 둥근 상자(`sdRoundBox`)로 카드 그림자·빛 번짐을 해상도와 무관하게.
- 파편 전환: 화면 텍스처를 보로노이 셀로 쪼개 셀마다 시간차로 날린다.

## 검증

- `css` 등급 화면이 연출 추가 전과 같은지 스크린샷 비교.
- 헤드리스 Chromium: `chromium.launch({ args: ['--enable-unsafe-webgpu', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })`. 이 컨테이너의 Chromium 153은 `drawElementImageToTexture`가 없어 3단계는 실기기 Chrome에서만 확인된다고 보고한다.
- 1280×720·390×844에서 프레임 시간 16ms 이내, 콘솔 오류 0.
