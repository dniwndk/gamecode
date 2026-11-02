// 멀티플레이 통신 규약. 방장 기기의 방(room.ts)과 참가자 화면을 메시지로 잇는다.
// 통신 수단(WebRTC·같은 기기의 다른 탭 등)은 화면 계층이 Conn 모양으로 넣어 준다.
// 참가자가 보낸 메시지는 믿지 않는다: 명령 종류·좌표를 여기서 거르고, 규칙 판정은 방장 세션이 한다.
import type { CommandResult, ContentCatalog, GameCommandType } from '../gameClient';
import type { RunSession } from '../run/session';
import type { BattleView, UiDriver, UiState } from '../view';
import { Room, type LobbyView, type RoomOptions } from './room';

/** 한 상대와의 연결. 메시지는 JSON으로 바꿀 수 있는 값이다 */
export interface Conn {
  send(msg: unknown): void;
  onMessage(fn: (msg: unknown) => void): void;
  onClose(fn: () => void): void;
  close(): void;
}

export const PROTOCOL = 1;

export type ToHost =
  | { t: 'hello'; protocol: number; name: string; contentVersion: string; rulesVersion: string }
  | { t: 'cmd'; id: number; type: GameCommandType; payload: Record<string, unknown> };

export type ToGuest =
  | { t: 'welcome'; lobby: LobbyView }
  | { t: 'reject'; message: string }
  | { t: 'lobby'; lobby: LobbyView }
  | { t: 'state'; state: UiState; at: number }
  | { t: 'res'; id: number; result: CommandResult }
  | { t: 'closed'; message: string };

/** 참가자가 보낼 수 있는 명령(새 런·저장 불러오기는 방장만) */
const GUEST_COMMANDS = new Set<GameCommandType>([
  'CHOOSE_STRATEGY', 'BUY_UNIT', 'SELL_UNIT', 'MOVE_UNIT', 'SORT_BENCH', 'REROLL_SHOP', 'TOGGLE_SHOP_LOCK', 'BUY_XP',
  'SET_TRACKED_SYNERGY', 'EQUIP_ITEM', 'UNEQUIP_ITEM', 'START_BATTLE', 'CONFIRM_RESULT', 'CHOOSE_EQUIPMENT', 'CHOOSE_OOPART',
  'SKIP_OOPART', 'ABANDON_RUN', 'CANCEL_READY',
]);

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

/** 참가자 명령 모양 검사. 통과하면 세션에 그대로 넘긴다 */
export function checkGuestCommand(m: unknown): { id: number; type: GameCommandType; payload: Record<string, unknown> } | null {
  if (!isObj(m) || m.t !== 'cmd' || typeof m.id !== 'number' || typeof m.type !== 'string') return null;
  if (!GUEST_COMMANDS.has(m.type as GameCommandType)) return null;
  const payload = isObj(m.payload) ? m.payload : {};
  for (const v of Object.values(payload)) if (typeof v === 'string' && v.length > 200) return null;
  return { id: m.id, type: m.type as GameCommandType, payload };
}

// ── 전투 기록 줄이기: 같은 전투를 다시 보내지 않는다 ─────────────
const CACHED = '__cached';
function stripBattle(state: UiState, sent: string | null): { state: UiState; battleId: string | null } {
  const b = state.run?.lastBattle;
  if (!b || !state.run) return { state, battleId: sent };
  if (b.battleId !== sent) return { state, battleId: b.battleId };
  const lastBattle = { battleId: b.battleId, nodeLabel: b.nodeLabel, combatants: [], startSp: b.startSp, events: [], [CACHED]: true } as BattleView;
  return { state: { ...state, run: { ...state.run, lastBattle } }, battleId: sent };
}
function restoreBattle(state: UiState, cache: BattleView | null): { state: UiState; cache: BattleView | null } {
  const b = state.run?.lastBattle as (BattleView & { [CACHED]?: boolean }) | undefined;
  if (!b || !state.run) return { state, cache };
  if (!b[CACHED]) return { state, cache: b };
  if (cache && cache.battleId === b.battleId) return { state: { ...state, run: { ...state.run, lastBattle: cache } }, cache };
  return { state: { ...state, run: { ...state.run, lastBattle: undefined } }, cache };
}

// ── 방장 ───────────────────────────────────────────────
export interface Host {
  room: Room;
  /** 방장 자신의 런 세션(시작 뒤) */
  local(): RunSession | null;
  /** 새 참가자 연결 */
  accept(conn: Conn): void;
  start(): { ok: true } | { ok: false; message: string };
  close(message?: string): void;
}

export function createHost(catalog: ContentCatalog, opts: RoomOptions & { hostName: string }): Host {
  const room = new Room(catalog, opts);
  const hostId = room.join(opts.hostName)!;
  const guests = new Map<Conn, { id: number; sentBattle: string | null; unsub: (() => void) | null }>();
  const pack = catalog.pack;
  const sendLobby = () => { const lobby = room.lobby(); for (const c of guests.keys()) safeSend(c, { t: 'lobby', lobby }); };
  room.onLobby(sendLobby);

  function attach(conn: Conn) {
    const g = guests.get(conn);
    if (!g || g.unsub) return;
    const seat = room.seatOf(g.id);
    const s = seat === null ? null : room.session(seat);
    if (!s) return;
    const push = (st: UiState) => {
      const x = stripBattle(st, g.sentBattle);
      g.sentBattle = x.battleId;
      safeSend(conn, { t: 'state', state: x.state, at: Date.now() });
    };
    g.unsub = s.subscribe(push);
    push(s.get());
  }

  return {
    room,
    local: () => { const seat = room.seatOf(hostId); return seat === null ? null : room.session(seat); },
    accept(conn) {
      conn.onMessage((m) => {
        if (!isObj(m)) return;
        const g = guests.get(conn);
        if (!g) {
          if (m.t !== 'hello') return;
          if (m.protocol !== PROTOCOL || m.contentVersion !== pack.manifest.contentVersion || m.rulesVersion !== catalog.rules.rulesVersion) {
            safeSend(conn, { t: 'reject', message: '게임 버전이 달라요. 두 기기 모두 새로고침한 뒤 다시 들어와 주세요' });
            return;
          }
          if (room.isStarted()) { safeSend(conn, { t: 'reject', message: '이미 시작한 방이에요' }); return; }
          const id = room.join(typeof m.name === 'string' ? m.name : '');
          if (id === null) { safeSend(conn, { t: 'reject', message: '방이 가득 찼어요' }); return; }
          guests.set(conn, { id, sentBattle: null, unsub: null });
          safeSend(conn, { t: 'welcome', lobby: room.lobby() });
          sendLobby();
          return;
        }
        const cmd = checkGuestCommand(m);
        if (!cmd) return;
        const seat = room.seatOf(g.id);
        const s = seat === null ? null : room.session(seat);
        if (!s) { safeSend(conn, { t: 'res', id: cmd.id, result: { ok: false, reason: 'WRONG_PHASE', message: '아직 시작하지 않았어요' } }); return; }
        void s.send(cmd.type, cmd.payload).then((result) => safeSend(conn, { t: 'res', id: cmd.id, result }));
      });
      conn.onClose(() => {
        const g = guests.get(conn);
        if (!g) return;
        g.unsub?.();
        guests.delete(conn);
        room.disconnect(g.id);
      });
    },
    start() {
      const res = room.start();
      if (res.ok) for (const c of guests.keys()) attach(c);
      return res;
    },
    close(message = '방장이 방을 닫았어요') {
      room.close();
      for (const c of guests.keys()) { safeSend(c, { t: 'closed', message }); c.close(); }
      guests.clear();
    },
  };
}

function safeSend(c: Conn, m: ToGuest) {
  try { c.send(m); } catch { /* 끊긴 연결: onClose가 정리한다 */ }
}

// ── 참가자 ─────────────────────────────────────────────
export interface Guest {
  /** 화면 드라이버. 시작 전에는 HOME 상태 */
  driver: UiDriver;
  lobby(): LobbyView | null;
  onLobby(fn: (l: LobbyView) => void): () => void;
  /** 방이 시작돼 첫 런 상태가 왔다 */
  onStart(fn: () => void): () => void;
  /** 거절·방 닫힘·연결 끊김(이유 문장) */
  onClosed(fn: (message: string) => void): () => void;
  leave(): void;
}

export function createGuest(catalog: ContentCatalog, conn: Conn, name: string): Guest {
  const pack = catalog.pack;
  let state: UiState = { revision: 0, phase: 'HOME', contentVersion: pack.manifest.contentVersion, rulesVersion: catalog.rules.rulesVersion, run: null, hasSavedRun: false, cues: [], oopartRevealed: [] };
  let lobby: LobbyView | null = null;
  let started = false;
  let closed = false;
  let cache: BattleView | null = null;
  let nextCmd = 1;
  const pending = new Map<number, (r: CommandResult) => void>();
  const stateFns = new Set<(s: UiState) => void>();
  const lobbyFns = new Set<(l: LobbyView) => void>();
  const startFns = new Set<() => void>();
  const closeFns = new Set<(m: string) => void>();
  const end = (message: string) => {
    if (closed) return;
    closed = true;
    for (const r of pending.values()) r({ ok: false, reason: 'WRONG_PHASE', message });
    pending.clear();
    for (const fn of closeFns) fn(message);
  };

  conn.onMessage((raw) => {
    if (!isObj(raw)) return;
    const m = raw as ToGuest;
    switch (m.t) {
      case 'welcome': case 'lobby': lobby = m.lobby; for (const fn of lobbyFns) fn(m.lobby); break;
      case 'reject': end(m.message); conn.close(); break;
      case 'closed': end(m.message); break;
      case 'res': pending.get(m.id)?.(m.result); pending.delete(m.id); break;
      case 'state': {
        const x = restoreBattle(m.state, cache);
        cache = x.cache;
        state = x.state;
        // 준비 마감은 받은 순간 기준 남은 시간이라, 이 기기 시계로 다시 잰다
        if (state.run?.multi?.deadlineInMs != null) deadlineAt = Date.now() + state.run.multi.deadlineInMs;
        else deadlineAt = null;
        if (!started) { started = true; for (const fn of startFns) fn(); }
        for (const fn of stateFns) fn(state);
        break;
      }
    }
  });
  conn.onClose(() => end('방장과 연결이 끊겼어요'));
  conn.send({ t: 'hello', protocol: PROTOCOL, name, contentVersion: pack.manifest.contentVersion, rulesVersion: catalog.rules.rulesVersion } satisfies ToHost);
  let deadlineAt: number | null = null;

  const driver: UiDriver = {
    catalog,
    preview: false,
    get: () => (deadlineAt !== null && state.run?.multi ? { ...state, run: { ...state.run, multi: { ...state.run.multi, deadlineInMs: Math.max(0, deadlineAt - Date.now()) } } } : state),
    subscribe(fn) { stateFns.add(fn); return () => stateFns.delete(fn); },
    send(type, payload = {}) {
      if (closed) return Promise.resolve({ ok: false, reason: 'WRONG_PHASE', message: '방과 연결이 끊겼어요' } as CommandResult);
      const id = nextCmd++;
      return new Promise<CommandResult>((resolve) => {
        pending.set(id, resolve);
        try { conn.send({ t: 'cmd', id, type, payload } satisfies ToHost); } catch { pending.delete(id); resolve({ ok: false, reason: 'WRONG_PHASE', message: '방과 연결이 끊겼어요' }); }
      });
    },
  };

  return {
    driver,
    lobby: () => lobby,
    onLobby(fn) { lobbyFns.add(fn); return () => lobbyFns.delete(fn); },
    onStart(fn) { startFns.add(fn); return () => startFns.delete(fn); },
    onClosed(fn) { closeFns.add(fn); return () => closeFns.delete(fn); },
    leave() { closed = true; conn.close(); },
  };
}
