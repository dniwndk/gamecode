// 코어 스냅샷 → 화면 모양(model.ts) 어댑터. 계약과 화면을 잇는 곳은 이 파일 하나다(사양서 13장).
//
// M0에서는 GameSnapshot.run이 항상 null이고 모든 명령이 NOT_IMPLEMENTED로 거부된다.
// 그래서 화면 확인용 목 세션(preview/session.ts)을 대신 붙인다. 코어가 run을 내기 시작하면
// toRunView()를 채우고 createDriver()가 자동으로 실제 클라이언트를 쓴다. 그때 preview/ 폴더는 지운다.
import type { GameClient, GameSnapshot } from '../../app/gameClient';
import { uuid } from './dom';
import type { RunView, UiDriver, UiState } from './model';
import { createPreviewSession } from './preview/session';

function toRunView(_snapshot: GameSnapshot): RunView | null {
  // M1 런 reducer가 확정되면 여기서 snapshot.run → RunView로 옮긴다.
  return null;
}

function toUiState(snapshot: GameSnapshot): UiState {
  const run = toRunView(snapshot);
  return {
    revision: snapshot.revision,
    phase: snapshot.phase,
    contentVersion: snapshot.contentVersion,
    rulesVersion: snapshot.rulesVersion,
    run,
    hasSavedRun: run !== null,
    cues: [],
  };
}

function createClientDriver(client: GameClient): UiDriver {
  let state = toUiState(client.getSnapshot());
  const listeners = new Set<(s: UiState) => void>();
  client.subscribe((snapshot) => {
    state = toUiState(snapshot);
    for (const fn of listeners) fn(state);
  });
  return {
    catalog: client.catalog,
    preview: false,
    get: () => state,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    send(type, payload = {}) {
      return client.dispatch({ commandId: uuid(), expectedRevision: state.revision, type, payload });
    },
  };
}

export function createDriver(client: GameClient): UiDriver {
  const snapshot = client.getSnapshot();
  if (snapshot.run === null) return createPreviewSession(client.catalog, snapshot);
  return createClientDriver(client);
}
