// 멀티플레이 화면 쪽 조종: 방 만들기·참가·로비·시작·나가기. 규칙은 app/multi(방장 기기의 방)에 있고,
// 여기서는 통신 수단을 붙이고 화면 드라이버를 솔로 ↔ 멀티로 바꿔 끼운다.
import type { ContentCatalog } from '../../../app/gameClient';
import { createGuest, createHost, type Guest, type Host } from '../../../app/multi/net';
import type { LobbyView } from '../../../app/multi/room';
import type { UiDriver } from '../../../app/view';
import { localProfileStore } from '../preview/session';
import { hostPeer, joinPeer, normalizeCode, randomCode, type HostTransport } from './transport';

export type MultiStatus =
  | { kind: 'idle'; error?: string }
  | { kind: 'connecting'; role: 'host' | 'guest'; code?: string }
  | { kind: 'lobby'; role: 'host' | 'guest'; code: string; lobby: LobbyView }
  | { kind: 'playing'; role: 'host' | 'guest'; code: string };

const NAME_KEY = 'kivotos-mp-name';
/** 준비 마감(초): 절반 이상이 출격 대기하면 남은 사람에게 주는 시간 */
export const PREP_SECONDS = 75;

export interface MultiController {
  status(): MultiStatus;
  subscribe(fn: (s: MultiStatus) => void): () => void;
  savedName(): string;
  create(name: string, local?: boolean): Promise<void>;
  join(name: string, code: string): Promise<void>;
  start(): string | null;
  /** 방에서 나간다(방장이면 방을 닫는다) */
  leave(reason?: string): void;
  isHost(): boolean;
}

/** use(driver): 화면이 볼 드라이버를 바꾼다. null이면 솔로로 돌아간다 */
export function createMultiController(catalog: ContentCatalog, use: (d: UiDriver | null) => void, notify: (msg: string) => void): MultiController {
  let status: MultiStatus = { kind: 'idle' };
  const fns = new Set<(s: MultiStatus) => void>();
  const set = (s: MultiStatus) => { status = s; for (const f of fns) f(s); };
  let host: Host | null = null;
  let transport: HostTransport | null = null;
  let guest: Guest | null = null;
  let guestClose: (() => void) | null = null;
  let unsubHome: (() => void) | null = null;

  const saveName = (n: string) => { try { localStorage.setItem(NAME_KEY, n); } catch { /* 무시 */ } };

  function reset(error?: string) {
    unsubHome?.(); unsubHome = null;
    host?.close(); host = null;
    transport?.close(); transport = null;
    guest?.leave(); guest = null;
    guestClose?.(); guestClose = null;
    use(null);
    set({ kind: 'idle', ...(error ? { error } : {}) });
  }

  /** 멀티 화면이 홈으로 돌아가면(나가기) 방을 정리한다 */
  function watchHome(d: UiDriver) {
    unsubHome?.();
    unsubHome = d.subscribe((s) => { if (s.phase === 'HOME') queueMicrotask(() => reset()); });
  }

  return {
    status: () => status,
    subscribe(fn) { fns.add(fn); return () => fns.delete(fn); },
    savedName() { try { return localStorage.getItem(NAME_KEY) ?? ''; } catch { return ''; } },
    isHost: () => !!host,

    async create(name, local = false) {
      if (status.kind !== 'idle') return;
      saveName(name);
      const code = local ? `LOCAL-${randomCode(4)}` : randomCode(5);
      set({ kind: 'connecting', role: 'host', code });
      try {
        transport = await hostPeer(code);
      } catch (e) {
        set({ kind: 'idle', error: (e as Error).message });
        return;
      }
      host = createHost(catalog, {
        roomCode: code, seed: `MP-${code}-${randomCode(4)}`, hostName: name, prepSeconds: PREP_SECONDS,
        clock: { now: () => Date.now(), later: (ms, fn) => { const t = setTimeout(fn, ms); return () => clearTimeout(t); } },
        profileFor: (seat) => (seat === 0 ? localProfileStore : undefined),
      });
      const h = host;
      transport.onConnection((c) => h.accept(c));
      h.room.onLobby((lobby) => { if (status.kind === 'lobby') set({ ...status, lobby }); });
      set({ kind: 'lobby', role: 'host', code, lobby: h.room.lobby() });
    },

    async join(name, rawCode) {
      if (status.kind !== 'idle') return;
      const code = normalizeCode(rawCode);
      if (!code) { set({ kind: 'idle', error: '방 코드를 입력해 주세요' }); return; }
      saveName(name);
      set({ kind: 'connecting', role: 'guest', code });
      let link: Awaited<ReturnType<typeof joinPeer>>;
      try {
        link = await joinPeer(code);
      } catch (e) {
        set({ kind: 'idle', error: (e as Error).message });
        return;
      }
      guestClose = link.close;
      const g = createGuest(catalog, link.conn, name);
      guest = g;
      g.onLobby((lobby) => { if (status.kind === 'connecting' || status.kind === 'lobby') set({ kind: 'lobby', role: 'guest', code, lobby }); });
      g.onStart(() => {
        set({ kind: 'playing', role: 'guest', code });
        use(g.driver);
        watchHome(g.driver);
      });
      g.onClosed((m) => {
        guest = null;
        if (status.kind === 'playing') notify(m);
        reset(status.kind === 'playing' ? undefined : m);
      });
    },

    start() {
      if (!host || status.kind !== 'lobby') return '방장만 시작할 수 있어요';
      const res = host.start();
      if (!res.ok) return res.message;
      const local = host.local()!;
      set({ kind: 'playing', role: 'host', code: status.code });
      use(local);
      watchHome(local);
      return null;
    },

    leave() { reset(); },
  };
}
