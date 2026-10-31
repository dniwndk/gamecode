# M0 기반 구축 구현 계획

> 작성: writing-plans 스킬 형식. 실행: executing-plans 방식으로 작업마다 검증 명령을 돌리며 진행했다. 체크 표시는 실제로 끝난 작업.

**Goal:** 기획서 v2.1 + v2.2를 코드가 읽을 수 있는 콘텐츠 팩으로 옮기고, 그 팩을 검사하는 검증기와 교체 가능한 화면 구조를 세운다.

**Architecture:** 기획서 표 → 추출기(scripts/extract-content.mjs) → `src/content/*.json` → 순수 TS 검증기(src/core/content). 화면은 GameClient 계약(src/app)만 본다.

**Tech Stack:** TypeScript 5.9 strict, Vite 6, Vitest 5, tsx, Node 22.

**Spec:** docs/GDD_v2.1.md 9.5·12.1·14.1·15장, docs/GDD_v2.2_amendment.md 0·2~6·10·11장

## Global Constraints

- 저장소 하위 폴더 `kivotos/`, 배포 `/gamecode/kivotos/`, `base: './'`.
- 코어는 DOM·외부 패키지·시계·Math.random 금지(12.1).
- 콘텐츠 개수는 팩 매니페스트 기대값이며 엔진 상수가 아니다(14.1).
- 미정 문구를 0이나 no-op으로 바꾸지 않는다(2장 6).
- UI는 다른 작업자가 만든다 → 화면 계층은 교체 가능해야 한다.

## Review Focus

1. 기획서 표의 칸 순서가 바뀌거나 행이 빠지면 → 추출기가 추측하지 않고 멈춰야 한다 (`fail()` 경로, extract.test).
2. 유닛 태그만 고치고 시너지 명단을 안 고치면 → 양방향 TAG_MISMATCH.
3. 후방 칸에 전방 효과를 묶으면(T14) → ZONE_BINDING.
4. 원안 가상 연산이 명세 문장에 남으면 → PLACEHOLDER.
5. 화면 코드가 규칙 함수를 직접 부르면 → architecture.test.

## 작업

- [x] **1. 폴더·도구 설정** — package.json, .nvmrc, tsconfig(전체 + DOM 없는 core), vite/vitest 설정. 검증: `npm run typecheck`.
- [x] **2. 문서 분할** — docs/GDD_v2.1.md, docs/GDD_v2.2_amendment.md, docs/dialogue/ko/*.json, CLAUDE.md(16장 초안 + v2.2·하위 폴더·UI 규칙).
- [x] **3. 콘텐츠 타입(9.5)** — src/core/types/content.ts.
- [x] **4. 추출기** — 부록 A~E, v2.2 1·3·4·5·6장 → JSON 12개. `--check` 모드. 검증: `npm run content:check`, tests/content/extract.test.ts.
- [x] **5. 검증기(14.1)** — 개수·ID·중복·구역 바인딩·실행 종류·태그 양방향·시너지 재집계·도달 가능성·장비/전략/적/노드 편성·미사용 효과·가상 연산·상태 참조·대사 7키·에셋. 테스트를 먼저 쓰고(validator.test 13건: 각 결함을 일부러 넣어 잡히는지) 정식 팩이 통과하는지(pack.test 15건).
- [x] **6. UI 계약** — src/app/gameClient.ts, docs/UI_CONTRACT.md, tests/unit/architecture.test.ts.
- [x] **7. 임시 화면** — src/ui/placeholder: 검증 결과 + 학생 60명 카드(초상화 없으면 이니셜). PC·모바일 뷰포트 확인.
- [x] **8. 초상화** — scripts/convert-portraits.py로 60장 WebP 변환, assets.json.
- [x] **9. 저장소 통합** — CI(pages.yml)에 검사·빌드·/kivotos/ 배포, 루트 서비스 워커 제외 목록.
- [x] **10. 기록** — DECISIONS.md, CHANGES.md(변경표), IMPLEMENTATION_STATUS.md.

## 다음: M1 개요 (별도 계획서로 상세화)

1. RNG: xorshift32, FNV-1a32 스트림 시드, rejection sampling. 골든 테스트(상태 1 → 270369, 67634689, 2647435461).
2. canonical JSON + SHA-256 콘텐츠 hash, SaveEnvelope 형식.
3. 런 상태와 명령 reducer: commandId 멱등, expectedRevision 거부(T44·T45).
4. 상점 추첨(5.2: 5번 칸 추천 모드, 잠금·무료 갱신), 구매 거래 롤백(T34·T35), 합성(T36), 편성 검사(T37·T38), 판매 감가(T63), 레벨/XP(T41·T64).
5. 정산과 SettlementModifier(T42·T43, v2.2 T61·T62·T66·T67), CASH_OUT_VAULT·loans[](T69~T72).
6. GameClient에 준비 단계 명령 연결 → UI_CONTRACT 갱신.
