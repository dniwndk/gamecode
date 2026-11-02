// 멀티플레이 채팅 창. 방에 있는 동안(로비·게임 중) 화면 왼쪽 아래에 떠 있고, 접으면 버튼과 안 읽은 수만 보인다.
// 접혀 있을 때 남의 새 메시지는 잠깐 말풍선으로 보여 준다. 메시지 규칙(길이·도배)은 app/multi/chat.ts.
import type { ChatMessage } from '../../../app/multi/chat';
import { CHAT_MAX_LENGTH } from '../../../app/multi/chat';
import { cls, h } from '../dom';
import { icon } from '../icons';
import type { MultiController } from './controller';

export interface ChatDock { el: HTMLElement; destroy(): void }

export function mountChatDock(m: MultiController, toast: (msg: string) => void): ChatDock {
  let open = false;
  let unread = 0;
  let peekTimer: ReturnType<typeof setTimeout> | null = null;
  let draft = '';

  const el = h('aside', { class: 'k-chat', 'aria-label': '채팅' });
  const log = h('ol', { class: 'k-chat-log', 'aria-live': 'polite' });
  const input = h('input', {
    type: 'text', maxlength: String(CHAT_MAX_LENGTH), placeholder: '메시지 (Enter로 보내기)', autocomplete: 'off', 'aria-label': '채팅 메시지',
    oninput: (e: Event) => { draft = (e.target as HTMLInputElement).value; },
    onkeydown: (e: Event) => {
      const k = e as KeyboardEvent;
      // 준비·전투 화면 단축키(숫자·R·스페이스 등)로 새지 않게
      k.stopPropagation();
      if (k.key === 'Enter' && !k.isComposing) { k.preventDefault(); send(); }
      else if (k.key === 'Escape') { setOpen(false); }
    },
  }) as HTMLInputElement;
  const badge = h('span', { class: 'k-chat-badge' });
  const peek = h('div', { class: 'k-chat-peek', 'aria-hidden': 'true' });
  const toggle = h('button', { class: 'k-chat-toggle', 'aria-label': '채팅 열기', onclick: () => setOpen(!open) }, icon('chat', 26), badge);
  const panel = h('div', { class: 'k-chat-panel', role: 'dialog', 'aria-label': '채팅' },
    h('header', null, icon('chat', 20), h('b', null, '채팅'), h('button', { class: 'k-chat-close', 'aria-label': '채팅 접기', onclick: () => setOpen(false) }, icon('close', 18))),
    log,
    h('form', { class: 'k-chat-form', onsubmit: (e: Event) => { e.preventDefault(); send(); } },
      input,
      h('button', { type: 'submit', class: 'k-chat-send', 'aria-label': '보내기' }, icon('send', 20))));
  el.append(panel, peek, toggle);

  function line(msg: ChatMessage): HTMLElement {
    const me = msg.from !== null && msg.from === m.you();
    // 플레이어가 친 글은 게임 문장이 아니라서 그대로 보여 준다(gameText 치환을 거치지 않음)
    const text = document.createElement('span');
    text.className = 'k-chat-text';
    text.textContent = msg.text;
    if (msg.system) return h('li', { class: 'k-chat-line is-system' }, text);
    const name = document.createElement('b');
    name.textContent = msg.name;
    return h('li', { class: cls('k-chat-line', me && 'is-me') }, name, text);
  }

  function drawLog() {
    const atBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 40;
    log.replaceChildren(...m.chat().map(line));
    if (!log.children.length) log.append(h('li', { class: 'k-chat-line is-system' }, '아직 메시지가 없어요. 인사를 건네 보세요'));
    if (atBottom || open) log.scrollTop = log.scrollHeight;
  }

  function drawBadge() {
    badge.textContent = unread > 99 ? '99+' : unread ? String(unread) : '';
    badge.hidden = !unread;
    toggle.setAttribute('aria-label', unread ? `채팅 열기 (안 읽은 메시지 ${unread}개)` : '채팅 열기');
  }

  function setOpen(v: boolean) {
    open = v;
    el.classList.toggle('is-open', open);
    if (open) {
      unread = 0;
      peek.classList.remove('is-on');
      drawLog();
      requestAnimationFrame(() => { log.scrollTop = log.scrollHeight; input.focus(); });
    }
    drawBadge();
  }

  function send() {
    const t = draft.trim();
    if (!t) return;
    const err = m.say(t);
    if (err) { toast(err); return; }
    draft = '';
    input.value = '';
  }

  function visible() {
    const k = m.status().kind;
    el.hidden = !(k === 'lobby' || k === 'playing');
    if (el.hidden) { open = false; unread = 0; el.classList.remove('is-open'); input.value = ''; draft = ''; }
  }

  const offChat = m.onChat((msg) => {
    drawLog();
    if (!msg || open || msg.from === m.you()) { drawBadge(); return; }
    unread++;
    drawBadge();
    // 접혀 있으면 새 메시지를 잠깐 보여 준다
    peek.textContent = msg.system ? msg.text : `${msg.name}: ${msg.text}`;
    peek.classList.add('is-on');
    if (peekTimer) clearTimeout(peekTimer);
    peekTimer = setTimeout(() => peek.classList.remove('is-on'), 4000);
  });
  const offStatus = m.subscribe(() => { visible(); drawLog(); });
  visible();
  drawLog();
  drawBadge();

  return {
    el,
    destroy() { offChat(); offStatus(); if (peekTimer) clearTimeout(peekTimer); },
  };
}
