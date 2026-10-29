// UI 계약: 화면(src/ui/*)이 게임과 주고받는 유일한 통로.
// 화면은 이 파일의 타입과 createGameClient()만 import한다. src/core를 직접 부르지 않는다.
// 그래서 화면 계층은 통째로 바꿔 끼울 수 있다(React든 다른 무엇이든). 자세한 규칙은 docs/UI_CONTRACT.md.
//
// 상태: M0 초안. 명령·스냅샷의 세부 필드는 M1(런 reducer)과 M2(전투 로그)에서 확정하며,
// 바꿀 때는 UI_CONTRACT.md의 변경 기록에 남긴다.
import type { ContentPack, RulesConfig } from '../core/types/content';
import { validateContentPack, type ValidationReport } from '../core/content/validate';

export type RunPhase =
  | 'HOME'
  | 'RUN_SETUP'
  | 'STRATEGY_CHOICE'
  | 'PREPARATION'
  | 'BATTLE'
  | 'RESULT'
  | 'EQUIPMENT_CHOICE'
  | 'NEXT_NODE'
  | 'RUN_COMPLETE'
  | 'RUN_FAILED'
  | 'SIMULATION_ERROR';

/** 런 명령 종류(GDD 4.2·5장·12.2, v2.2 3.5). payload는 M1에서 종류별로 확정한다. */
export type GameCommandType =
  | 'NEW_RUN'
  | 'CHOOSE_STRATEGY'
  | 'BUY_UNIT'
  | 'SELL_UNIT'
  | 'MOVE_UNIT'
  | 'REROLL_SHOP'
  | 'TOGGLE_SHOP_LOCK'
  | 'BUY_XP'
  | 'SET_TRACKED_SYNERGY'
  | 'CHOOSE_NODE_CANDIDATE'
  | 'EQUIP_ITEM'
  | 'UNEQUIP_ITEM'
  | 'START_BATTLE'
  | 'CONFIRM_RESULT'
  | 'CHOOSE_EQUIPMENT'
  | 'CASH_OUT_VAULT'
  | 'IMPORT_SAVE'
  | 'ABANDON_RUN';

/** 12.2: 같은 commandId는 한 번만 적용, expectedRevision이 다르면 거부 */
export interface GameCommand {
  commandId: string;
  expectedRevision: number;
  type: GameCommandType;
  payload: Readonly<Record<string, unknown>>;
}

export type CommandRejectReason =
  | 'NOT_IMPLEMENTED'
  | 'WRONG_PHASE'
  | 'STALE_REVISION'
  | 'INVALID_PAYLOAD'
  | 'RULE_VIOLATION';

export type CommandResult =
  | { ok: true; revision: number }
  | { ok: false; reason: CommandRejectReason; message: string };

/** 화면이 그릴 수 있는 읽기 전용 상태. 화면은 이것을 고치지 않고 명령으로만 바꾼다. */
export interface GameSnapshot {
  revision: number;
  phase: RunPhase;
  contentVersion: string;
  rulesVersion: string;
  /** 진행 중인 런. M1 전까지 항상 null. */
  run: null;
}

/** 연출용 이벤트(전투 로그 재생 등). M2에서 전투 이벤트를 채운다. 연출을 기다려야 진행되는 구조는 금지(13.3). */
export type GameEvent = { type: 'SNAPSHOT_REPLACED'; revision: number };

export interface ContentCatalog {
  /** 정의 데이터(유닛·시너지·장비 …). 표시용이며 화면이 바꾸지 않는다. */
  pack: Readonly<ContentPack>;
  rules: Readonly<RulesConfig>;
  validation: ValidationReport;
  /** 초상화 등 에셋의 상대 경로. 없으면 null이고 화면은 이니셜·진영색으로 대체한다(13.4). */
  assetUrl(assetId: string): string | null;
}

export interface GameClient {
  readonly catalog: ContentCatalog;
  getSnapshot(): GameSnapshot;
  subscribe(listener: (snapshot: GameSnapshot, events: readonly GameEvent[]) => void): () => void;
  dispatch(command: GameCommand): Promise<CommandResult>;
}

/** M0 구현: 콘텐츠 카탈로그만 제공한다. 런 명령은 M1에서 연결될 때까지 정직하게 거부한다. */
export function createGameClient(pack: ContentPack, options: { assetBase?: string } = {}): GameClient {
  const assetBase = options.assetBase ?? './';
  const assets = new Map(pack.assets.map((a) => [a.id, a]));
  const snapshot: GameSnapshot = {
    revision: 0,
    phase: 'HOME',
    contentVersion: pack.manifest.contentVersion,
    rulesVersion: pack.manifest.rulesVersion,
    run: null,
  };
  const catalog: ContentCatalog = {
    pack,
    rules: pack.rules,
    validation: validateContentPack(pack),
    assetUrl(assetId) {
      const asset = assets.get(assetId);
      return asset?.present ? `${assetBase}${asset.path}` : null;
    },
  };
  return {
    catalog,
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listener(snapshot, []);
      return () => {};
    },
    async dispatch(command) {
      return { ok: false, reason: 'NOT_IMPLEMENTED', message: `${command.type}: 런 진행은 M1에서 연결된다` };
    },
  };
}
