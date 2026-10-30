# 추가 에셋(gfx)

2026-10-30 사용자가 준 `KTFR_Additional_Assets_102.zip`(v1.0) 중, 지금까지 그림 없이 글자·기본 아이콘으로 표시하던 자리만 채운다.
학생 초상화·키아트·컷인은 건드리지 않았다.

| 폴더 | 수 | 원본 → 여기 | 쓰는 곳 |
|---|---:|---|---|
| synergy | 41 | SVG 그대로 | `synHex` 육각 배지 안 흰 문양 |
| status | 20 | SVG 그대로 | 전투 상태 칩(CSS 마스크로 글자색을 따름) |
| enemies | 13 | PNG 1024/1536 → WebP 512, 보스 768 | `enemyPortrait`, 전투 적 칸 |
| equipment | 12 | PNG 512 → WebP 256(알파 유지) | 장비 칩, 장비 선택 카드 |
| strategies | 13 | PNG 1600×900 → WebP 1200×675 | 전략 선택 카드 위 그림 |
| ui | 1 | `logo.svg` 그대로 | 홈 로고 |
| app | 2 | PNG 그대로 | `index.html` 아이콘 |

- 파일이 없거나 받지 못하면 화면은 예전 글자 배지·기본 아이콘으로 돌아간다(`components.ts` `gfx()`).
- 출처: 적·장비·전략 그림은 OpenAI image_gen, 아이콘·로고 심벌은 원본 SVG 도형. 로고 글자는 Black Han Sans(SIL OFL)를 경로로 바꾼 것. 원본 묶음의 `assets.json`·`prompts.json`·`FONT_LICENSE.txt`는 프로젝트 파일 zip에 있다.
- 에셋 레지스트리(`src/content/assets.json`)는 문서에서 생성되는 파일이라 여기에는 등록하지 않았다. 화면 계층이 ID로 경로를 만든다.
