---
name: webgl-ui-fx
description: >
  Add or tune the WebGL2 shader effects layer over a DOM game UI (fluid sky
  background, holo/thin-film card foil, spring tilt, light bursts, shatter screen
  transitions) with automatic CSS fallback. Use when the user wants premium,
  living, glassy, fluid, iridescent, or shader-driven UI, mentions WebGL, WGSL,
  GLSL, HTML-in-Canvas, or references the MatchaChoco010 dashboard style.
---

# WebGL2 UI 연출 계층

DOM 게임 화면에 셰이더 연출을 덧씌운다. 화면 기능과 글자는 언제나 DOM이 맡고, 셰이더는 보기만 바꾼다.
배경·결정 기록은 `kivotos/docs/UI_FX.md`, 코드는 `kivotos/src/ui/blue/fx/`.

## 원칙

1. **토큰이 필요한 실험 기능(HTML-in-Canvas, WebGPU 전용 기능)은 기본 경로로 쓰지 않는다.** WebGL2만 쓴다.
2. **언제나 CSS로 내려간다**: 설정 「고급 그래픽 효과」 꺼짐, 「애니메이션 줄이기」, WebGL2 없음, 셰이더 실패, 컨텍스트 손실 → 캔버스를 숨기고 `fx-on` 클래스를 뗀다.
3. **화면 코드는 `ctx.fx`만 부른다**(`burst(요소|좌표, {color,size,ms})`, `transition('shatter'|'sweep')`, `theme(장)`). 연출이 꺼져 있으면 아무 일도 하지 않는다.
4. **게임 규칙과 무관**: fx 코드는 `src/ui/` 안에만 둔다(계층 테스트).
5. **광택 캔버스는 `mix-blend-mode: screen`**: 검정 = 변화 없음. 출력은 `vec4(col, 1)`, 블렌딩은 `ONE, ONE`.

## 새 효과 넣는 절차

1. 셰이더는 `fx/shaders.ts`에 GLSL ES 3.00 문자열로. 공통 함수(`hash`, `vnoise`, `fbm`, `film`, `sdRoundBox`)는 `COMMON`.
2. 좌표 약속: CSS 픽셀, 왼쪽 위 원점. 배경은 `uK`(설계 1px당 캔버스 px)로 굵기를 맞춘다.
3. 카드류에 효과를 주려면 `CARD_SEL`에 선택자를 더하고, 비용은 `cost-N` 클래스나 `data-cost`, 색은 `--cc`/`--hue`.
4. 덮개(툴팁·말풍선·토스트)는 `occluders()`에 선택자를 더해 광택이 비치지 않게.
5. 「플래시 끄기」면 섬광 세기를 낮추고(`uFlash`), 파편 대신 빛 쓸기.

## 검증

- `chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })`로 스크린샷. 이 렌더러는 CPU라 프레임 시간이 느리게 나오니 성능 수치로 쓰지 말 것.
- 1920×1080·1280×720·390×844: 콘솔 오류 0, 가로 넘침 0, `reducedMotion: 'reduce'` 컨텍스트에서 `canvas.k-gfx`가 0개.
- 설정에서 끄고 켜기가 되는지, 꺼졌을 때 화면이 이전 CSS 화면과 같은지.
