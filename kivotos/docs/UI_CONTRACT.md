# UI 계약 — 화면을 바꿔 끼우는 규칙

화면은 따로 설계·제작 중이고, 언제든 통째로 교체할 수 있어야 한다. 그래서 게임은 세 층으로 나뉜다.

```
src/core/     규칙 (순수 TS, DOM·패키지·시계·Math.random 금지)
   ↑
src/app/      GameClient — 화면이 게임과 이야기하는 유일한 창구
   ↑
src/ui/       화면 (지금은 src/ui/blue/ 「샬레 작전 단말」 화면)
```

## 화면이 할 수 있는 것

- `import { createGameClient } from '../app/gameClient'`와 `import { contentPack } from '../content'`로 클라이언트를 만든다(예: src/ui/main.ts).
- `client.catalog`: 유닛·시너지·장비·전략·적·노드·대사 정의와 검증 결과. 표시용이며 고치지 않는다. 초상화 주소는 `catalog.assetUrl(unit.portraitAssetId)`이고 `null`이면 이니셜·진영색으로 대체한다.
- `client.getSnapshot()` / `client.subscribe(listener)`: 현재 상태(`revision`, `phase`, 런 상태)와 연출용 이벤트.
- `client.dispatch(command)`: 모든 상태 변경은 명령으로만. `{ commandId, expectedRevision, type, payload }`. 결과는 `{ ok: true, revision }` 또는 거부 사유.
- 타입이 필요하면 `src/core/types/*`의 타입만 import한다.

## 화면이 하면 안 되는 것

- `src/core`의 함수를 직접 부르거나 규칙을 다시 계산하기(골드·확률·피해·시너지 단계 등). 필요한 값은 GameClient가 스냅샷에 넣어 준다. 모자라면 계약을 넓힌다.
- 애니메이션이 끝나기를 기다려야 게임이 진행되는 구조(13.3). 결과는 먼저 계산되어 있고, 화면은 이벤트 로그를 재생만 한다.
- 화면 쪽 난수로 게임 결과를 바꾸기. 연출용 난수는 써도 된다.

이 규칙은 `tests/unit/architecture.test.ts`(import 방향)와 `tsconfig.core.json`(core·app을 DOM 없이 컴파일)이 검사한다.

## 화면 교체 절차

1. 새 화면을 `src/ui/<이름>/`에 둔다. React 등을 쓰면 package.json에 추가한다.
2. `src/ui/main.ts`에서 새 화면을 mount한다. `index.html`의 `#app`이 뿌리다.
3. `src/ui/placeholder/`를 지운다.
4. `npm test && npm run build`.

## 현재 판(M0 초안)과 앞으로

| 항목 | M0 | 확정 시점 |
|---|---|---|
| `catalog` | 완성 (팩 ba-content-2.2.0) | — |
| `GameSnapshot.run` | 항상 `null` | M1 런 reducer |
| `GameCommandType` | 이름 목록만. 모든 명령이 `NOT_IMPLEMENTED`로 거부 | M1(준비 단계 명령), M4(런 흐름) |
| `GameEvent` | 자리만 | M2 전투 로그 |

## 지금 붙은 화면: src/ui/blue/

- 프레임워크 없이 TypeScript + DOM. 1920×1080 무대를 그리고 창 크기에 맞춰 배율만 바꾼다(1280×720 하한, 2560·4K 확대). 세로·좁은 화면(폭 768 미만 또는 세로가 더 긴 창)은 모바일 세로 배치.
- 화면 컴포넌트는 `src/ui/blue/model.ts`의 가정 타입(UI 사양서 11.2)만 본다. 코어 스냅샷과 잇는 곳은 `src/ui/blue/adapter.ts` 한 파일이다.
- **M0 동안은 미리보기 세션**(`src/ui/blue/preview/session.ts`)이 붙는다. `snapshot.run`이 `null`이면 어댑터가 자동으로 이 목 세션을 쓰고, 화면 아래 가운데에 「미리보기 데이터」 표시가 뜬다. 상점 추첨·합성·전투 수치는 화면 확인용 흉내이며 게임 규칙이 아니다. 코어가 `run`을 내면 어댑터의 `toRunView()`를 채우고 `preview/` 폴더를 지운다.

### 화면이 코어에 요청하는 계약 확장(사양서 11.3)

| 필요한 것 | 지금 화면이 하는 일 | 바라는 계약 |
|---|---|---|
| 단계 전환 명령 | RUN_SETUP→전략 선택, NEXT_NODE→준비를 `CONFIRM_RESULT`로 보냄 | 전용 명령(예: `ADVANCE`) 또는 phase 자동 전환 |
| 이어하기 | 미리보기 세션의 `resume()` | 저장된 phase로 바로 열린 스냅샷 + 홈 요약(`savedRun`) |
| 판매가 | `UnitInstanceView.sellValue`(목 값) | 인스턴스별 판매가·감가액 |
| 상점 구매 예고 | `shop.slots[i].preview`(합성 n성, 시너지 from→to) | 같은 모양을 코어가 계산 |
| 레벨업 미리보기 | 카탈로그 `rules.xp.xpToNext`로 「구매 후 Lv」 표시 | 구매 횟수별 결과 레벨·XP |
| 연출 신호 | `UiState.cues`(첫 영입·첫 배치·합성·레벨업·금고·장비 반환) | `GameEvent`로 같은 신호 |
| 전투 재생 | `run.lastBattle`(전투원 초기값 + 이벤트 로그, 사양서 11.2 모양) | M2 전투 이벤트 |
| 노드 진행 기록 | `run.nodeHistory`(15칸 승/패) | 런 상태에 포함 |
| 패배 피해 미리보기 | `run.node.defeatDamagePreview` | 후보별 예상 피해 |

## 변경 기록

- 2026-10-29 M0 초안.
- 2026-10-30 임시 카탈로그 화면을 `src/ui/blue/`로 교체, 계약 확장 요청 목록 추가.
