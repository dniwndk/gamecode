// 멀티플레이 채팅. 방장 기기의 방이 기록을 들고, 참가자 메시지는 방장이 걸러 모두에게 다시 보낸다.
// 통신·화면은 모른다(net.ts가 잇고, 화면은 ui/blue/multi/chat.ts).

/** 채팅 한 줄. system이면 입장·퇴장·탈락 같은 방 알림 */
export interface ChatMessage {
  /** 방 안에서 늘어나는 번호 */
  id: number;
  /** 보낸 플레이어 번호(net의 플레이어 id). 방 알림은 null */
  from: number | null;
  name: string;
  text: string;
  /** 방장 시계 ms */
  at: number;
  system?: boolean;
}

/** 한 줄 최대 글자 수 */
export const CHAT_MAX_LENGTH = 120;
/** 기록에 남기는 줄 수(새로 들어온 사람도 이만큼 본다) */
export const CHAT_HISTORY = 60;
/** 도배 막기: 이 시간(ms) 안에 CHAT_BURST줄까지 */
export const CHAT_WINDOW_MS = 5000;
export const CHAT_BURST = 5;

/** 보낼 수 있는 문장으로 다듬는다: 제어 문자·줄바꿈 제거, 공백 정리, 길이 제한. 비면 null */
export function cleanChat(text: unknown): string | null {
  if (typeof text !== 'string') return null;
  const t = text.replace(/[\u0000-\u001f\u007f​-‏‪-‮⁦-⁩]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!t) return null;
  return [...t].slice(0, CHAT_MAX_LENGTH).join('');
}

export class ChatLog {
  private lines: ChatMessage[] = [];
  private nextId = 1;
  private sent = new Map<number, number[]>();
  private fns = new Set<(m: ChatMessage) => void>();

  constructor(private now: () => number) {}

  history(): ChatMessage[] { return [...this.lines]; }
  onMessage(fn: (m: ChatMessage) => void): () => void { this.fns.add(fn); return () => this.fns.delete(fn); }

  /** 플레이어 메시지. 빈 문장·도배면 거절 이유를 돌려준다 */
  say(from: number, name: string, text: unknown): { ok: true; message: ChatMessage } | { ok: false; message: string } {
    const t = cleanChat(text);
    if (!t) return { ok: false, message: '보낼 내용이 없어요' };
    const now = this.now();
    const recent = (this.sent.get(from) ?? []).filter((x) => now - x < CHAT_WINDOW_MS);
    if (recent.length >= CHAT_BURST) return { ok: false, message: '조금 천천히 보내 주세요' };
    recent.push(now);
    this.sent.set(from, recent);
    return { ok: true, message: this.push({ from, name, text: t, at: now }) };
  }

  /** 방 알림(입장·퇴장·탈락) */
  system(text: string): ChatMessage { return this.push({ from: null, name: '', text, at: this.now(), system: true }); }

  private push(m: Omit<ChatMessage, 'id'>): ChatMessage {
    const msg: ChatMessage = { id: this.nextId++, ...m };
    this.lines.push(msg);
    if (this.lines.length > CHAT_HISTORY) this.lines.splice(0, this.lines.length - CHAT_HISTORY);
    for (const fn of this.fns) fn(msg);
    return msg;
  }
}

/** 참가자가 받은 메시지 모양 검사(방장이 보낸 것이지만 연결 너머라 한 번 더 본다) */
export function isChatMessage(x: unknown): x is ChatMessage {
  if (typeof x !== 'object' || x === null) return false;
  const m = x as Record<string, unknown>;
  return typeof m.id === 'number' && (m.from === null || typeof m.from === 'number') && typeof m.name === 'string' && typeof m.text === 'string' && typeof m.at === 'number';
}
