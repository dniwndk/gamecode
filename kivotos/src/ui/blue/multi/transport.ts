// 멀티플레이 통신 수단. 방장 브라우저가 서버 역할을 하므로 돈 드는 서버가 없다.
// - WebRTC(PeerJS): 연결을 맺을 때만 PeerJS 공용 중개 서버(무료)를 쓰고, 게임 메시지는 브라우저끼리 직접 주고받는다.
// - 같은 기기 탭(BroadcastChannel): 방 코드가 LOCAL-로 시작하면 인터넷 없이 같은 브라우저의 다른 탭끼리 붙는다(시험용).
import type { DataConnection, Peer as PeerType } from 'peerjs';
import type { Conn } from '../../../app/multi/net';

/** PeerJS 공용 서버에서 다른 서비스와 겹치지 않게 붙이는 접두어 */
const ID_PREFIX = 'kivotos-tf-v1-';
const CODE_ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function randomCode(len = 5): string {
  const a = new Uint32Array(len);
  crypto.getRandomValues(a);
  return [...a].map((x) => CODE_ABC[x % CODE_ABC.length]).join('');
}

export const isLocalCode = (code: string) => code.startsWith('LOCAL-');
export const normalizeCode = (code: string) => code.trim().toUpperCase().replace(/\s+/g, '');

export interface HostTransport {
  code: string;
  onConnection(fn: (c: Conn) => void): void;
  close(): void;
}

// ── WebRTC(PeerJS) ─────────────────────────────────────
async function loadPeer(): Promise<typeof PeerType> {
  const mod = await import('peerjs');
  return mod.Peer;
}

function wrapData(dc: DataConnection): Conn {
  const msg = new Set<(m: unknown) => void>();
  const close = new Set<() => void>();
  let closed = false;
  const fireClose = () => { if (closed) return; closed = true; for (const f of close) f(); };
  dc.on('data', (d) => { for (const f of msg) f(d); });
  dc.on('close', fireClose);
  dc.on('error', fireClose);
  // ICE 연결이 끊기면(창 닫힘·네트워크 끊김) close가 늦게 오기도 해서 직접 본다
  dc.peerConnection?.addEventListener?.('iceconnectionstatechange', () => {
    const st = dc.peerConnection?.iceConnectionState;
    if (st === 'failed' || st === 'closed') fireClose();
  });
  return {
    send(m) { dc.send(m); },
    onMessage(fn) { msg.add(fn); },
    onClose(fn) { close.add(fn); },
    close() { try { dc.close(); } catch { /* 이미 닫힘 */ } fireClose(); },
  };
}

const peerError = (e: unknown): string => {
  const type = (e as { type?: string })?.type ?? '';
  if (type === 'unavailable-id') return '같은 방 코드가 이미 쓰이고 있어요. 다시 만들어 주세요';
  if (type === 'peer-unavailable') return '그 코드의 방을 찾지 못했어요. 코드를 확인해 주세요';
  if (type === 'network' || type === 'server-error' || type === 'socket-error' || type === 'socket-closed') return '연결 중개 서버에 닿지 못했어요. 인터넷 연결을 확인해 주세요';
  if (type === 'browser-incompatible') return '이 브라우저는 P2P 연결(WebRTC)을 지원하지 않아요';
  return '연결하지 못했어요. 잠시 뒤 다시 시도해 주세요';
};

export async function hostPeer(code: string): Promise<HostTransport> {
  if (isLocalCode(code)) return hostLocal(code);
  const Peer = await loadPeer();
  return new Promise((resolve, reject) => {
    const peer = new Peer(ID_PREFIX + code, { debug: 0 });
    const fns = new Set<(c: Conn) => void>();
    let opened = false;
    peer.on('open', () => {
      opened = true;
      resolve({ code, onConnection: (fn) => { fns.add(fn); }, close: () => peer.destroy() });
    });
    peer.on('connection', (dc) => {
      dc.on('open', () => { const c = wrapData(dc); for (const f of fns) f(c); });
    });
    peer.on('error', (e) => { if (!opened) { peer.destroy(); reject(new Error(peerError(e))); } });
    // 중개 서버와 끊겨도 이미 맺은 연결은 살아 있다. 새 참가자를 받으려면 다시 붙는다
    peer.on('disconnected', () => { if (!peer.destroyed) try { peer.reconnect(); } catch { /* 무시 */ } });
  });
}

export async function joinPeer(code: string): Promise<{ conn: Conn; close(): void }> {
  if (isLocalCode(code)) return joinLocal(code);
  const Peer = await loadPeer();
  return new Promise((resolve, reject) => {
    const peer = new Peer({ debug: 0 });
    let done = false;
    const fail = (m: string) => { if (done) return; done = true; peer.destroy(); reject(new Error(m)); };
    const timer = setTimeout(() => fail('방장에게 연결하지 못했어요. 코드가 맞는지, 방장 화면이 열려 있는지 확인해 주세요'), 20000);
    peer.on('error', (e) => { clearTimeout(timer); fail(peerError(e)); });
    peer.on('open', () => {
      const dc = peer.connect(ID_PREFIX + code, { reliable: true });
      dc.on('open', () => {
        clearTimeout(timer);
        if (done) return;
        done = true;
        const conn = wrapData(dc);
        conn.onClose(() => peer.destroy());
        resolve({ conn, close: () => { conn.close(); peer.destroy(); } });
      });
    });
  });
}

// ── 같은 기기 탭(BroadcastChannel) ─────────────────────
type LocalMsg = { kind: 'knock'; from: string } | { kind: 'accept'; to: string } | { kind: 'data'; from: string; to: string; data: unknown } | { kind: 'bye'; from: string; to: string };

function hostLocal(code: string): HostTransport {
  const bc = new BroadcastChannel(`kivotos-mp-${code}`);
  const fns = new Set<(c: Conn) => void>();
  const peers = new Map<string, { msg: Set<(m: unknown) => void>; close: Set<() => void> }>();
  bc.onmessage = (e: MessageEvent<LocalMsg>) => {
    const m = e.data;
    if (m.kind === 'knock' && !peers.has(m.from)) {
      const p = { msg: new Set<(x: unknown) => void>(), close: new Set<() => void>() };
      peers.set(m.from, p);
      const id = m.from;
      const conn: Conn = {
        send(data) { bc.postMessage({ kind: 'data', from: 'host', to: id, data } satisfies LocalMsg); },
        onMessage(fn) { p.msg.add(fn); },
        onClose(fn) { p.close.add(fn); },
        close() { bc.postMessage({ kind: 'bye', from: 'host', to: id } satisfies LocalMsg); peers.delete(id); for (const f of p.close) f(); },
      };
      bc.postMessage({ kind: 'accept', to: id } satisfies LocalMsg);
      for (const f of fns) f(conn);
    } else if (m.kind === 'data' && m.to === 'host') {
      for (const f of peers.get(m.from)?.msg ?? []) f(m.data);
    } else if (m.kind === 'bye' && m.to === 'host') {
      const p = peers.get(m.from);
      peers.delete(m.from);
      for (const f of p?.close ?? []) f();
    }
  };
  return { code, onConnection: (fn) => { fns.add(fn); }, close: () => { for (const id of peers.keys()) bc.postMessage({ kind: 'bye', from: 'host', to: id } satisfies LocalMsg); bc.close(); } };
}

function joinLocal(code: string): Promise<{ conn: Conn; close(): void }> {
  const bc = new BroadcastChannel(`kivotos-mp-${code}`);
  const me = randomCode(8);
  const msg = new Set<(m: unknown) => void>();
  const close = new Set<() => void>();
  let closed = false;
  const end = () => { if (closed) return; closed = true; for (const f of close) f(); bc.close(); };
  const conn: Conn = {
    send(data) { if (!closed) bc.postMessage({ kind: 'data', from: me, to: 'host', data } satisfies LocalMsg); },
    onMessage(fn) { msg.add(fn); },
    onClose(fn) { close.add(fn); },
    close() { if (!closed) bc.postMessage({ kind: 'bye', from: me, to: 'host' } satisfies LocalMsg); end(); },
  };
  window.addEventListener('pagehide', () => conn.close());
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { bc.close(); reject(new Error('같은 기기에서 그 방을 찾지 못했어요')); }, 4000);
    bc.onmessage = (e: MessageEvent<LocalMsg>) => {
      const m = e.data;
      if (m.kind === 'accept' && m.to === me) { clearTimeout(timer); resolve({ conn, close: () => conn.close() }); }
      else if (m.kind === 'data' && m.to === me) for (const f of msg) f(m.data);
      else if (m.kind === 'bye' && m.to === me) end();
    };
    bc.postMessage({ kind: 'knock', from: me } satisfies LocalMsg);
  });
}
