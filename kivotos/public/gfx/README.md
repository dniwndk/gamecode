# 추가 에셋(gfx)

2026-10-30 사용자가 준 `KTFR_Additional_Assets_102.zip`(v1.0) 중, 지금까지 그림 없이 글자·기본 아이콘으로 표시하던 자리만 채운다.
학생 초상화·키아트·컷인은 건드리지 않았다.

| 폴더 | 수 | 원본 → 여기 | 쓰는 곳 |
|---|---:|---|---|
| synergy | 66 | SVG. 2026-11-01 사용자 제공 `kivotos_synergy_icons_66_hq_framed.zip`으로 66종 다시 교체(흰 단색, 48×48 viewBox) | `synHex` 시너지 배지 안 흰 문양 |
| synergy-frames | 5 | WebP 320px(원본 512px PNG). 같은 묶음의 등급 테두리: inactive·bronze·silver·gold·prismatic | `synHex` 배경. 미발동 inactive, 발동 단계 1·2·3 = 동·은·금, 플래티넘 단계·이스터에그 = prismatic, 고유 = gold. 단계를 모를 때(도감·카드)는 그 시너지의 최고 단계 테두리 |
| ooparts | 55 | PNG 1024(알파) → WebP 256, 품질 85 | 도감 「오파츠」 탭. 등급 바탕·테두리는 CSS가 칠하고, 전설은 공개 전 실루엣 |
| status | 20 | SVG 그대로 | 전투 상태 칩(CSS 마스크로 글자색을 따름) |
| enemies | 13 | PNG 1024/1536 → WebP 512, 보스 768 | `enemyPortrait`, 전투 적 칸 |
| equipment | 12 | PNG 512 → WebP 256(알파 유지) | 장비 칩, 장비 선택 카드 |
| strategies | 13 | PNG 1600×900 → WebP 1200×675 | 전략 선택 카드 위 그림 |
| ui | 2 | `logo.svg` 그대로(지금은 쓰지 않음), `logo_title.webp` | 홈 타이틀 로고. `logo_title`은 2026-10-30 사용자가 따로 준 로고 PNG에서 흰 바탕을 빼고 1600px로 줄인 것 |
| app | 2 | PNG 그대로 | `index.html` 아이콘 |

- v2.3 시너지 개편(2026-10-30): 역할군 아이콘은 옛 역할 문양을 이어 쓴다(뱅가드→탱커, 어설트→어태커, 데몰리션→블래스터, 메딕→힐러, 택티컬 서포트→서포터, 일렉트로→컨트롤러). 폐기한 장갑·한탕·옛 역할·옛 고유 문양은 지웠다. 동아리·새 고유·플래티넘 37종은 같은 날 두 번째 묶음으로 채워 64종 모두 그림이 있다.
- 파일이 없거나 받지 못하면 화면은 예전 글자 배지·기본 아이콘으로 돌아간다(`components.ts` `gfx()`).
- 시너지 배지(2026-10-30 사용자 지시 "색 구분 말고 가시성"): 모두 같은 남색 육각 + 흰 바깥 테 + 굵은 흰 문양(86%). 발동 단계만 바깥 테 색(동·은·금), 미발동은 회청색 바탕. 빈 에셋 요청서(시너지 37·컷인 41·오파츠 55, 지금은 모두 채움)는 프로젝트 파일 `asset-request/빈_에셋_이미지_생성_명세.md`.
- 출처: 적·장비·전략·오파츠 그림은 OpenAI image_gen(모델 ID·시드 기록 없음, NovelAI 아님), 두 번째 묶음 시너지 SVG는 Codex가 직접 작성한 도형, 아이콘·로고 심벌은 원본 SVG 도형. 로고 글자는 Black Han Sans(SIL OFL)를 경로로 바꾼 것. 원본 묶음의 `assets.json`·`prompts.json`·`FONT_LICENSE.txt`는 프로젝트 파일 zip에 있다. 두 번째 묶음(`KTFR_Synergy37_Ooparts55.zip`)의 `assets.json`·`prompts.json`·`QA.json`도 프로젝트 파일에 있다.
- 필살기 컷인(`public/cutins/`, 101장)은 여기가 아니라 NovelAI V5로 만든 것이다. v2.3 신규 41명은 2026-10-30 `keyart/generate_cutins.py`로 생성(시드는 `keyart/manifest_cutins.json`).
- 에셋 레지스트리(`src/content/assets.json`)는 문서에서 생성되는 파일이라 여기에는 등록하지 않았다. 화면 계층이 ID로 경로를 만든다.
