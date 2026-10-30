# 화면 연출 계층(UI FX) — 레퍼런스 분석과 설치 내역

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
4. **글꼴 위계**: 레퍼런스는 제목·본문·숫자·장식에 서로 다른 글꼴을 쓴다. → 이번에 보강(아래 3장).

## 3. 이번에 저장소에 설치한 것

| 무엇 | 왜 |
|---|---|
| `@fontsource-variable/noto-sans-kr` 5.3.1 | 본문 글꼴을 Google Fonts 링크 대신 자체 호스팅. 가변 굵기 100–900, 오프라인·PWA에서도 같은 모양, 외부 요청 없음. 필요한 글자 조각만 받는다 |
| `@fontsource/barlow-condensed` 5.3.0 (600·700·800, 기울임 포함) | 숫자·영문 장식 글꼴 자체 호스팅 |
| `@fontsource/black-han-sans` 5.3.0 | 한글 굵은 제목용(레퍼런스의 Dela Gothic One 역할). CSS 토큰 `--f-display`로 쓸 수 있다 |
| `@webgpu/types` 0.1.74 (개발용) | WebGPU·WGSL 코드를 TypeScript로 타입 검사(`tsconfig.json`의 `types`) |
| `src/ui/blue/fx/capabilities.ts` | 연출 등급 판정: `html-in-canvas` → `webgpu-overlay` → `css`. 기능이 없거나 「연출 줄이기」면 지금 화면 그대로 |
| `.claude/skills/webgpu-ui-fx/` | 이 계층을 만들 때 Claude가 따를 절차(감지·폴백·성능 예산·검증 방법) |

WGSL 셰이더는 Vite 기본 기능(`import src from './sky.wgsl?raw'`)으로 불러오면 되므로 별도 플러그인을 넣지 않았다.

### 일부러 넣지 않은 것

- **three.js / PixiJS**: 레퍼런스도 엔진 없이 WebGPU를 직접 쓴다. 우리가 만들 효과(배경 유체, 카드 굴절, 전환)는 전체 화면 사각형 몇 장이면 충분해서 엔진 무게(수백 KB)가 이득보다 크다.
- **React**: 레퍼런스 품질은 React가 아니라 셰이더에서 나온다. 화면 계층을 바꾸지 않는다.
- **애니메이션 라이브러리(GSAP·Motion)**: 스프링은 수십 줄 함수로 충분하다.

## 4. 단계별 적용 계획

| 단계 | 등급 | 내용 | 대상 브라우저 |
|---|---|---|---|
| 1 | `webgpu-overlay` | DOM 뒤에 WebGPU 캔버스 한 장: 하늘색 유체 배경(커서·드래그에 반응), 헤일로 빛 번짐, 전투 컷인 빛줄기 | WebGPU가 있는 브라우저(데스크톱 Chrome·Edge·Safari 26, 안드로이드 Chrome) |
| 2 | `webgpu-overlay` | 스프링 물리로 카드 드래그·상점 등장 | 전부(JS만) |
| 3 | `html-in-canvas` | 유닛 카드·시너지 패널을 텍스처로 올려 유리 굴절·박막 무지개빛, 화면 전환을 파편 효과로 | Chrome 155+ (플래그 또는 Origin Trial) |

기능이 없을 때 레퍼런스처럼 화면을 막지 않는다. 우리 게임은 누구나 해야 하므로 언제나 `css` 등급으로 내려간다.

## 5. 사용자가 해야 하는 일(3단계를 공개 페이지에서 켜려면)

- Chrome Origin Trials에서 **HTMLInCanvas** 시험에 `https://dniwndk.github.io` 출처로 등록하고 받은 토큰을 알려 주면 `index.html`에 넣는다. 토큰이 없으면 플래그를 켠 본인 브라우저에서만 3단계가 보인다.

## 6. 검증 방법

- 이 컨테이너의 헤드리스 Chromium(153)은 WebGPU(소프트웨어 렌더러)와 2D `drawElementImage`는 되지만 `drawElementImageToTexture`가 없어 3단계는 검증할 수 없다. 1·2단계는 아래 옵션으로 스크린샷 검증한다.

```js
chromium.launch({ args: ['--enable-unsafe-webgpu', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
```

- 매 단계 `css` 등급 화면이 지금과 똑같은지(스크린샷 비교), 1280×720·390×844에서 프레임 예산(16ms) 안인지 확인한다.
