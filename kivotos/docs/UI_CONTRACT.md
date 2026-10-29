# UI 계약 — 화면을 바꿔 끼우는 규칙

화면은 따로 설계·제작 중이고, 언제든 통째로 교체할 수 있어야 한다. 그래서 게임은 세 층으로 나뉜다.

```
src/core/     규칙 (순수 TS, DOM·패키지·시계·Math.random 금지)
   ↑
src/app/      GameClient — 화면이 게임과 이야기하는 유일한 창구
   ↑
src/ui/       화면 (지금은 src/ui/placeholder/ 임시 카탈로그 화면)
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

## 변경 기록

- 2026-10-29 M0 초안.
