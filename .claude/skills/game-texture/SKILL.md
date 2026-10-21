---
name: game-texture
description: 도형뿐인 브라우저 게임 화면에 힉스필드(Higgsfield) MCP로 비주얼을 입히는 스킬. "텍스처 입혀줘 / 땅 질감 / 지형 만들어줘 / 게임 화면 예쁘게 / 표면 재질"처럼 게임 비주얼 요청이 들어오면 발동. 먼저 완성 화면의 레퍼런스 컨셉 이미지를 생성해 그 그림에 맞춰 씬을 정교화하고, 그다음 seamless·top-down·no-shadow 3대 조건으로 타일 텍스처를 생성해 2×2 이음새를 검증한 뒤 Three.js에 반복 적용한다.
---

# 게임 텍스처 스킬 (game-texture)

게임 로직이 다 돌아가면(도형만으로도 플레이 가능), 이제 화면을 입힌다. 이 스킬은 **힉스필드 MCP로 텍스처 이미지를 생성해서 게임의 넓은 표면(땅·바닥·구조물)에 입힌다.** 핵심은 "반복해서 이어 붙여도 경계가 안 보이는" 타일 텍스처를 만드는 것.

## 전제 — 힉스필드 MCP 연결

이 스킬은 힉스필드 MCP로 이미지를 생성한다. 연결이 안 돼 있으면:

> 힉스필드 사이트의 MCP 메뉴에서 서버 주소를 복사 → 클로드(claude.ai 또는 Claude Code) 커넥터/MCP 설정에 그 주소를 추가하면 연결된다.

연결되면 `generate_image` 류 도구가 보인다. 모델은 `gpt_image_2`, 1:1 비율, 1k 해상도, quality high가 기본.

## 0단계 — RTS 레퍼런스 이미지 생성 (컨셉 아트 먼저)

텍스처를 뽑기 전에, **완성된 게임 화면이 어떤 그림이어야 하는지**를 먼저 정한다. 힉스필드로 목표 화면의 컨셉 이미지를 1~2장 생성한다:

```
isometric sci-fi RTS battle scene, dark desert terrain, alien base structures,
cinematic lighting, game concept art — 16:9
```

생성된 이미지를 대화에 첨부하고 이렇게 지시한다:

> "이 이미지를 레퍼런스로 색감·조명·건물 비율·지형 톤을 맞춰서 Three.js 씬을 다듬어줘"

왜 이 순서인가 — 말로만 "화면 예쁘게 해줘"라고 시키면 클로드가 상상으로 만든다. 그림을 주면 색·조명·비율을 그 이미지에 맞춰 훨씬 정교하게 구현한다. 레퍼런스에 맞춰 씬(조명·안개·카메라 톤·건물 스케일)을 먼저 다듬고, **텍스처는 그다음이다.**

## 1단계 — 텍스처 종류 정하기 (게임당 3~5종이면 충분)

모든 걸 텍스처로 덮지 않는다. **넓은 표면 위주로 3~5종**만. 예:
- **지형(땅)** 2~3종 — 모래/바위/어두운 흙 (지형이 단조로우면 이걸로 변화를 준다)
- **구조물 표면** 1종 — 금속 장갑판, 콘크리트 등
- **특수 표면** 1종 — 게임 고유의 것 (예: 스타크래프트의 저그 점막(creep), 용암, 얼음)

목록을 정하고 각각 어디에 쓸지 1줄로 적는다.

## 2단계 ★ 생성 프롬프트 3대 조건 (이 스킬의 핵심)

타일 텍스처가 되려면 영어 프롬프트에 **아래 3개를 반드시** 넣는다. 하나라도 빠지면 이어 붙일 때 경계선·그림자·원근이 티가 난다.

1. **`seamless tileable`** — 반복해서 이어 붙여도 경계가 안 보이게. (가장 중요)
2. **`top-down orthogonal view`** — 정확히 바로 위에서 수직으로 내려다본 평면. 비스듬한 각도면 원근이 생겨 바닥에 못 깐다.
3. **`no shadows, even lighting`** — 그림자 없이 균일 조명. 그림자가 구워지면 타일마다 같은 그림자가 반복돼 격자가 드러난다.

## 3단계 — 추가 규격

- **정사각형 1:1** (2의 거듭제곱 크기가 밉맵에 유리 — 1024×1024)
- **한 텍스처에 한 재질만.** 여러 재질을 한 장에 섞으면 타일링이 깨진다. "모래+바위 섞인 땅"이 아니라 "모래" 한 장, "바위" 한 장.
- **`no logos, no watermark, no text`** — 로고·워터마크·글자 금지.
- 색/톤은 게임 스타일에 맞춰 프롬프트에 명시 (예: sun-baked ochre desert stone with charcoal cracks).

### 프롬프트 예시 (사막 지형)
```
seamless tileable desert sand ground texture, top-down orthogonal view,
sun-baked ochre and rust color with fine charcoal cracks, even flat lighting,
no shadows, no logos, no watermark, no text, 1:1 square, high detail PBR base color
```

## 4단계 — 생성 후 이음새 검증 (2×2 타일 테스트)

생성했다고 끝이 아니다. **같은 이미지를 2×2로 이어 붙여 눈으로 확인**한다. 가운데 십자 경계선이 보이거나, 밝기 차이·반복 패턴이 도드라지면 **재생성**한다 (프롬프트의 재질 묘사만 다듬고, 위 3대 조건은 그대로 둔다).

간단한 확인법 — 이미지 편집 도구나 파이썬으로 원본을 2×2로 붙인 미리보기(tiled2x2)를 만들어 Read로 열어본다:
```
# pillow로 2x2 타일 미리보기 만들어 육안 검사
from PIL import Image
im = Image.open("ground_sand.png")
w, h = im.size
tile = Image.new("RGB", (w*2, h*2))
for x in (0, w):
    for y in (0, h):
        tile.paste(im, (x, y))
tile.save("ground_sand_tiled2x2.png")   # ← 이걸 열어 경계선 확인
```
경계가 안 보이면 통과. 원본 레포는 이음새 비율 1.3 이하를 목표로 8종 전부 검증했다.

## 5단계 — 게임에 적용 (Three.js)

텍스처를 로드하고 **반복(repeat)**을 켜서 넓은 바닥에 여러 번 깔리게 한다. 핵심은 `wrapS/wrapT = RepeatWrapping`과 `repeat.set()`. 색상 텍스처(basecolor)만 sRGB로 지정하고, 노멀·러프니스 맵은 선형으로 둔다.

```js
import * as THREE from 'three';

const loader = new THREE.TextureLoader();

function loadTiling(url, repeat, srgb = false) {
  const tex = loader.load(url);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; // 이어 붙이기
  tex.repeat.set(repeat, repeat);               // 몇 번 반복할지
  tex.anisotropy = 8;                            // 비스듬히 봐도 선명
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace; // 색상맵만
  return tex;
}

// 넓은 지형 바닥에 적용
const groundMat = new THREE.MeshStandardMaterial({
  map:          loadTiling('./textures/ground_sand_basecolor.png', 24, true),
  normalMap:    loadTiling('./textures/ground_sand_normal.png',    24),
  roughnessMap: loadTiling('./textures/ground_sand_roughness.png', 24),
  metalness: 0.05,
  roughness: 1.0,
});
```

### ★ repeat 밀도가 화질을 결정한다 (제일 흔한 실패)

"텍스처가 흐릿하다/뭉개진다"의 원인은 십중팔구 해상도가 아니라 **repeat 부족**이다. 반복 횟수가 적으면 한 타일이 수십 유닛 넓이로 늘어나 아무리 고해상도라도 블러가 된다.

- 경험칙: **타일 하나가 월드 8~14유닛**을 덮게 잡는다 → `repeat ≈ 맵크기 / 12`
- 실제 사례: 220유닛 맵에 repeat 1.6(타일당 ~140유닛)을 깔았더니 심하게 흐릿 → repeat 18로 올리자 즉시 선명해졌다. 텍스처 파일은 그대로였다.

### 맵별 독립 UV 변환 (three.js r152+)

`map`·`normalMap`·`alphaMap`은 각각 **독립적인 repeat**를 가질 수 있다. 넓게 퍼지는 오버레이(예: 저그 점막)는 알파 마스크(`alphaMap`)는 repeat 1로 전체를 덮고, 색/노멀 맵만 촘촘히 반복시키면 "선명한 재질 + 자유로운 모양"이 동시에 된다.

`repeat` 값은 표면 크기에 맞춰 조절한다. 힉스필드는 보통 색상(basecolor) 이미지를 주므로, 노멀/러프니스 맵이 필요하면 그 basecolor에서 파생해 만들거나 basecolor만으로 시작해도 된다. 파생은 Moisan FFT 주기 분해(경계 불연속 제거 → 진짜 seamless) 후 휘도 기반으로 normal/roughness를 뽑는 파이프라인 스크립트 하나면 되고, 붙여본 경계 대비를 수치화한 **seam ratio**로 통과 여부를 정한다.

## 6단계 — 어디에 텍스처를 쓰고, 어디엔 안 쓰는가

- **텍스처 효과가 가장 큰 곳 = 넓은 표면** (지형·바닥·큰 벽). 여기에 집중.
- **유닛·건물 같은 작은 모델엔 텍스처보다 색+형태(실루엣)가 우선.** 작게 보이는 유닛에 정교한 텍스처를 발라봐야 화면에선 안 보이고, draw call만 늘어 성능만 깎는다. 유닛은 명확한 색 대비와 알아보기 쉬운 실루엣으로 구분되게 한다.
- **작은 유닛에 텍스처를 쓸 땐 저주파로.** 고주파(촘촘한 repeat) 재질을 1~2유닛짜리 몸에 얹으면 노이즈가 형태를 잡아먹어 "뭘 만든 건지" 안 보인다. 유닛용 재질은 repeat 1 수준 + `normalScale` 절반으로 낮춘 클론을 따로 만든다.
- **어두운 텍스처에 밝은 부위(뼈·발톱 등)를 만들 땐 HDR 틴트.** `material.color`는 곱셈이라 어두운 맵에 파스텔 틴트를 곱해도 티가 안 난다 — `new THREE.Color(2.6, 2.3, 1.85)`처럼 1.0을 넘겨야 실제로 밝아진다.
- 특수 표면(점막·용암 등)은 넓게 깔리는 것만 텍스처, 나머진 발광(emissive) 색으로.

## 7단계 — 실전 함정 체크리스트

1. **지형 색은 양 진영 대표색과 대비**시켜라. 골드 진영 + 주황 사막처럼 지형이 유닛과 같은 계열이면 위장복이 된다. 두 진영 색(예: 골드/보라) 모두와 떨어진 어두운 한랭 계열(현무암 회색)이 안전하다.
2. **지형 팔레트를 바꾸면 같이 바꿔야 하는 코드**가 있다: 미니맵 베이스 색, 반구광(hemisphere)의 지면 바운스 색, 안개/하늘 톤. 텍스처만 갈면 미니맵이 옛날 색으로 남는다.
3. **물리 재질(clearcoat/sheen)은 저사양 방어선과 함께.** 소프트웨어 GL(GPU 없는 환경·CI)에서는 추가 BRDF 로브가 프레임을 반토막 낸다. `WEBGL_debug_renderer_info`로 SwiftShader/llvmpipe를 감지해 Standard 재질로 강등하는 lowSpec 경로를 처음부터 넣어라.
4. **텍스처 교체는 파일 덮어쓰기만으로 끝나지 않는다** — 색 틴트(`material.color`)가 옛 텍스처에 맞춰 튜닝돼 있으면 새 텍스처와 곱해져 엉뚱한 색이 된다. 교체 후 틴트를 다시 확인하라.
5. **콘솔 에러 0건 + draw call 예산 재확인**은 텍스처 작업 후에도 반복한다 (`self-check` 스킬).

---

**완성:** 여기까지 하면 `game-blueprint`(기획) → `self-check`(검수) → `game-texture`(텍스처) 3단계로 브라우저 게임 한 편이 완성된다. 텍스처를 입힌 뒤에도 `self-check`의 콘솔 에러 0건과 draw call 예산을 다시 한 번 확인한다 (텍스처 로드 실패·과다 반복이 없는지).
