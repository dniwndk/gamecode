# 화면 연출 계층(UI FX) — 레퍼런스 분석과 WebGL2 구현

2026-10-30 작성. 사용자가 준 레퍼런스(折登 樹 @MatchaChoco010의 X 게시물)와 같은 수준의 화면을 만들려면 무엇이 필요한지 정리한다.
X 본문은 자동으로 읽을 수 없어서(402), 같은 작성자가 같은 시기에 공개한 데모
<https://matchachoco010.github.io/demo-html-in-canvas-bot-dashboard/>(Discord 음성 봇 대시보드)의 배포 번들을 직접 내려받아 분석했다.
게시물이 이 데모가 아니라면 결론 일부가 달라질 수 있다.

## 1. 레퍼런스가 실제로 쓰는 기술

| 항목 | 내용 | 근거(번들에서 확인) |
|---|---|---|
| 뼈대 | React 19.3 + Vite. 화면 전체가 `<canvas id="stage" layoutsubtree>` 하나 | index.html, `e.version="19.3.1"` |
| 핵심 | **HTML-in-Canvas**: 일반 DOM 카드를 캔버스 자식으로 배치하고, `GPUQueue.drawElementImageToTexture`로 WebGPU 텍스처에 그린 뒤 셰이더를 씌운다. `canvas.updateElementGeometry`로 클릭 영역을 맞추고 `requestPaint`/`paint` 이벤트로 다시 그린다 | 기능 감지 코드, `requestPaint` 9곳 |
| 셰이더 | 손으로 쓴 WGSL. compute 14개 + fragment 14개. three.js·PixiJS 같은 엔진은 없다 | `@compute`·`@fragment` 각 14 |
| 연출 기법 | SDF 둥근 상자·토러스 레이마칭으로 만든 3D 메뉴 판, 2D 유체 시뮬레이션(속도장·자코비 압력 풀이, 커서가 유체를 민다), 스프링 물리로 움직이는 카드, 박막 간섭 무지개빛(thin-film), 대리석·종이·인쇄 잉크·복사기 질감·긁힘, 파편(shards) 전환, 렌즈 HUD, 회로 기판 무늬, 부드러운 그림자 | WGSL 함수 이름: `jacobi`, `integrate`, `springs`, `thinFilmB`, `marbleAt`, `paper`, `printInk`, `photocopy`, `scratches`, `shards`, `lensHud`, `pcb`, `shadowAt`, `sdRR`, `sdTorus` 등 |
| 글꼴 | 7종 자체 호스팅: Noto Sans JP Variable, Shippori Mincho(명조), Dela Gothic One(굵은 제목), Anton, Saira Condensed, Inter Tight, JetBrains Mono | CSS `@font-face` |
| 해상도 | 설계 해상도를 정해 두고 화면 크기에 맞춰 배율 계산(`designOf`/`scaleOf`) — 우리 1920×1080 배율 방식과 같다 | JS |
| 폴백 | 기능이 없으면 화면 대신 「이 환경에서는 열 수 없습니다」 안내만 띄운다 | `#unsupported` |
| 실행 조건 | Chrome 155+, WebGPU, `chrome://flags/#canvas-draw-element`. 공개 페이지는 Origin Trial 토큰(HTMLInCanvas, 2027-03 만료)으로 플래그 없이 켠다 | `<meta http-equiv="origin-trial">` |

## 2. 우리 화면과의 차이(큰 것부터)

1. **그림 자산**: 품질 차이의 가장 큰 몫이다. 시너지 41·상태 20·적 13·장비 12·전략 13 아이콘과 배경 3장이 아직 없다(지금은 글자 배지로 대신함). 패키지로 해결되지 않는다. `/mnt/project-files/ui-spec/` 사양서 에셋 목록대로 제작해야 한다.
2. **셰이더 연출 계층**: 레퍼런스의 "살아 있는 재질감"은 전부 WebGPU 셰이더다. 우리 화면은 CSS만 쓴다.
3. **움직임**: 레퍼런스는 스프링 물리(관성·되튐)로 움직이고, 우리는 CSS 전환(정해진 곡선)이다.
4. **글꼴 위계**: 레퍼런스는 제목·본문·숫자·장식에 서로 다른 글꼴을 쓴다. → 메인 경기천년제목, 서브 Noto Sans로 정리(아래 4장).

## 3. 구현: WebGL2로 같은 효과 내기 (토큰·등록·만료 없음)

HTML-in-Canvas는 Chrome 실험 기능이라(플래그 또는 Origin Trial 토큰, 만료 있음) 쓰지 않는다. 대신 모든 주요 브라우저의 표준인 **WebGL2**로 같은 셰이더 기법을 쓴다.
차이는 하나: DOM 자체를 셰이더에 통과시키지 않고, 셰이더가 그릴 재료(카드 위치·비용·별)를 우리가 넘긴다. 글자는 늘 DOM이라 또렷하고 접근성도 그대로다.

| 레퍼런스 기법 | 우리 구현 | 파일 |
|---|---|---|
| 2D 유체(이류·자코비 압력) | 안정 유체 + 와도 보강. 커서·드래그가 하늘을 밀고, 빛 폭발이 유체를 사방으로 튕긴다. 유체 속도로 배경을 굴절 | `fx/fluid.ts`, `BG_FS` |
| 박막 간섭 무지개빛 | 헤일로 고리, 카드 광택, 폭발 고리, 파편 가장자리 | `film()` |
| SDF 둥근 상자 | 카드 테두리 빛·바깥 번짐을 해상도와 무관하게 | `CARD_FS` |
| 스프링 물리 | 카드(학생·상점·선택지)가 커서를 따라 기울고 떠오른다 | `engine.ts` `stepSprings` |
| 파편 전환 | 파란 장막이 사선으로 덮었다가 보로노이 파편으로 부서진다(런 시작·출격·런 종료). 그 밖의 전환은 빛 쓸기 | `VEIL_FS` |
| 렌즈·HUD 장식 | 회전하는 헤일로(눈금·점선 고리), 육각 격자 물결, 떠오르는 빛 입자 | `BG_FS` |
| (추가) 빛 폭발 | 영입·합성(3성은 금빛)·레벨업·금고·필살기·치명타·전투불능·MVP | `BURST_FS` |

캔버스 세 장: 배경(DOM 뒤), 광택(DOM 위, `mix-blend-mode: screen`이라 어둡게 만들지 않음), 장막(맨 위, 전환 때만). 화면 코드는 `ctx.fx.burst()`·`ctx.fx.transition()`만 부른다.

### 켜고 끄기·폴백

- 설정 「고급 그래픽 효과」(기본 켜짐), 「애니메이션 줄이기」나 OS의 동작 줄이기면 꺼진다 → 지금까지의 CSS 화면 그대로.
- WebGL2가 없거나, 셰이더 컴파일 실패, 컨텍스트 손실이면 조용히 CSS 화면으로 돌아간다.
- 부동소수 렌더 대상이 없는 기기는 유체만 빼고 나머지를 그린다.
- 프레임이 계속 무거우면 배경 해상도를 자동으로 낮춘다(0.62 → 최저 0.3배). 탭이 숨으면 멈춘다.
- 「플래시 끄기」면 폭발 중심 섬광을 줄이고 파편 전환 대신 빛 쓸기를 쓴다.

### 배경 일러스트·컷신(NAI)

- `public/keyart/`: 메인 배경 `bg_home`, 장 배경 `bg_ch1~3`, 컷신 `cut_sortie`(런 설정)·`cut_victory`(장 클리어)·`cut_defeat`(런 실패)·`cut_clear`(런 클리어). 1920×1088 WebP.
- `public/cutins/<unitId>.webp`: 학생별 필살기 컷인 1536×640. 전투 시작 때 아군 것만 미리 받고, 없으면 초상화 컷인으로 대신한다.
- 셰이더가 켜지면 배경 캔버스가 이 그림을 텍스처로 받아 유체로 굴절시키고 커서 시차를 준다(`fx.scene()`). 꺼지면 `.k-scene` CSS 배경으로 같은 그림을 깐다. 화면마다 흰 막(wash) 세기를 달리해 글자 가독성을 지킨다(`app.ts` `applyScene`).
- 원본 PNG·생성 스크립트·시드는 프로젝트 파일 `keyart/`(`generate_keyart.py`, `generate_cutins.py`, `manifest*.json`).

## 4. 설치한 것

| 무엇 | 왜 |
|---|---|
| `src/ui/blue/fonts/` 경기천년제목 Medium·Bold(WOFF2) | 메인 글꼴(`--f-kr`·`--f-display`). 사용자 지정(2026-10-30) |
| `src/ui/blue/fonts/` Noto Sans Regular·Bold(WOFF2) | 서브 글꼴: 숫자·영문(`--f-num`), 설명 문단·보조 캡션(`--f-sub`) |
| `@fontsource-variable/noto-sans-kr` 5.3.1 | 서브 글꼴의 한글 부분(Noto Sans에는 한글이 없다) |
| `.claude/skills/webgl-ui-fx/` | 이 계층을 고칠 때 따를 절차 |

엔진(three.js·PixiJS)·React·애니메이션 라이브러리는 넣지 않았다. 레퍼런스도 엔진 없이 셰이더를 직접 쓰고, 우리 효과는 전체 화면 삼각형과 인스턴스 사각형이면 충분하다. 연출 계층 전체가 번들에 약 31KB(gzip 약 13KB)를 더한다.

## 5. 검증

- 이 컨테이너의 헤드리스 Chromium은 소프트웨어 렌더러(SwiftShader)라 프레임 시간이 100ms 안팎으로 나온다. 실제 GPU 수치가 아니다. 실기기 확인이 필요하다.

```js
chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
```

- 확인한 것: 1920×1080·1280×720·390×844에서 콘솔 오류 0, 모바일 가로 넘침 없음, 동작 줄이기면 캔버스를 만들지 않음, 설정 토글로 끄고 켜기.

## 6. 남은 것

- 아이콘·배경 그림 자산(품질 차이의 가장 큰 몫, 패키지로 해결 불가).
- 전투 화면의 학생 칸(카드가 아닌 전투 칸)에도 광택을 줄지 결정.
