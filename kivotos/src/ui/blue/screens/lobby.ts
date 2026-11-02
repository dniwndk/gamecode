// 멀티플레이 로비: 방 만들기(코드 받기) · 코드로 참가 · 모인 선생님 목록 · 방장 시작.
// 방장 브라우저가 서버 역할을 하므로, 방장이 이 화면(그리고 게임)을 닫으면 방도 닫힌다.
import type { Ctx, Screen } from '../app';
import { cls, h } from '../dom';
import { icon } from '../icons';
import type { MultiStatus } from '../multi/controller';
import { isLocalCode } from '../multi/transport';

export function mountLobby(ctx: Ctx): Screen {
  const el = h('section', { class: 'k-settings k-lobby' });
  const m = ctx.multi;
  // 주소에 ?room=코드 가 있으면 참가 칸에 미리 넣는다
  const fromUrl = new URLSearchParams(location.search).get('room') ?? '';
  let name = m.savedName();
  let code = fromUrl;
  let busy = false;

  const nameInput = () => h('label', { class: 'k-mp-field' },
    h('span', null, '내 이름'),
    h('input', { type: 'text', maxlength: '12', value: name, placeholder: '선생님', autocomplete: 'nickname', oninput: (e: Event) => { name = (e.target as HTMLInputElement).value; } }));

  const shareLink = (c: string) => `${location.origin}${location.pathname}?room=${encodeURIComponent(c)}`;

  async function copy(text: string, label: string) {
    try { await navigator.clipboard.writeText(text); ctx.toast(`${label}를 복사했어요`); } catch { ctx.toast(text); }
  }

  function idleView(s: Extract<MultiStatus, { kind: 'idle' }>): HTMLElement[] {
    const create = h('button', { class: 'k-btn is-primary', disabled: busy, onclick: async () => { busy = true; draw(); await m.create(name.trim()); busy = false; draw(); } }, icon('plus', 22), '방 만들기');
    const local = h('button', { class: 'k-btn is-ghost k-lobby-local', disabled: busy, title: '인터넷 없이 같은 브라우저의 다른 탭끼리 시험해 볼 때', onclick: async () => { busy = true; draw(); await m.create(name.trim(), true); busy = false; draw(); } }, icon('users', 20), '같은 기기 탭으로 시험');
    const codeInput = h('input', { type: 'text', maxlength: '16', value: code, placeholder: '예: K7Q2M', autocapitalize: 'characters', spellcheck: 'false',
      oninput: (e: Event) => { code = (e.target as HTMLInputElement).value; },
      onkeydown: (e: Event) => { if ((e as KeyboardEvent).key === 'Enter') void doJoin(); } });
    const doJoin = async () => { busy = true; draw(); await m.join(name.trim(), code); busy = false; draw(); };
    return [
      s.error ? h('p', { class: 'k-lobby-error', role: 'alert' }, icon('warning', 20), s.error) : h('span'),
      h('div', { class: 'k-panel k-lobby-card' }, h('h3', null, icon('users', 22), '내 정보'), nameInput()),
      h('div', { class: 'k-lobby-cols' },
        h('div', { class: 'k-panel k-lobby-card' },
          h('h3', null, icon('flag', 22), '방 만들기'),
          h('p', { class: 'k-muted' }, '방 코드를 친구에게 알려 주세요. 2~8명이 같은 상점 풀을 나눠 쓰며 서로의 편성과 싸워요.'),
          h('p', { class: 'k-muted' }, '방장 브라우저가 서버 역할을 해요. 방장이 창을 닫으면 방이 끝나요.'),
          create, local),
        h('div', { class: 'k-panel k-lobby-card' },
          h('h3', null, icon('play', 22), '코드로 참가'),
          h('label', { class: 'k-mp-field' }, h('span', null, '방 코드'), codeInput),
          h('button', { class: 'k-btn is-blue', disabled: busy, onclick: () => void doJoin() }, icon('check', 22), '참가'))),
      h('div', { class: 'k-panel k-lobby-card k-lobby-rules' },
        h('h3', null, icon('info', 22), '멀티플레이 규칙'),
        h('ul', null,
          h('li', null, '솔로와 같은 25라운드 경제·보상(정예·보스 라운드는 승패와 관계없이 장비 보상)'),
          h('li', null, '라운드마다 무작위 상대의 편성과 싸워요. 인원이 홀수면 한 명은 다른 선생님의 잔상과 싸워요'),
          h('li', null, '모두 출격 대기하면 전투가 시작돼요. 절반 이상이 대기하면 남은 사람에게 준비 마감 시계가 돌아요'),
          h('li', null, '런 체력이 0이 되면 탈락. 마지막까지 남거나, 25라운드 뒤 체력이 가장 많은 선생님이 우승'))),
    ];
  }

  function lobbyView(s: Extract<MultiStatus, { kind: 'lobby' }>): HTMLElement[] {
    const host = s.role === 'host';
    const enough = s.lobby.players.length >= s.lobby.minPlayers;
    return [
      h('div', { class: 'k-panel k-lobby-card k-lobby-code' },
        h('small', null, '방 코드'),
        h('b', { 'data-room-code': s.code }, s.code),
        host ? h('div', { class: 'k-lobby-share' },
          h('button', { class: 'k-btn is-ghost', onclick: () => void copy(s.code, '방 코드') }, icon('records', 20), '코드 복사'),
          isLocalCode(s.code) ? null : h('button', { class: 'k-btn is-ghost', onclick: () => void copy(shareLink(s.code), '참가 링크') }, icon('export', 20), '참가 링크 복사')) : null,
        isLocalCode(s.code) ? h('p', { class: 'k-muted' }, '같은 브라우저의 다른 탭에서 이 코드로 참가할 수 있어요(시험용).') : null),
      h('div', { class: 'k-panel k-lobby-card' },
        h('h3', null, icon('users', 22), `모인 선생님 ${s.lobby.players.length}/${s.lobby.maxPlayers}`),
        h('ol', { class: 'k-lobby-list' }, ...s.lobby.players.map((p) => h('li', { class: cls(!p.connected && 'is-off') },
          icon(p.host ? 'crown' : 'users', 20), h('b', null, p.name), p.host ? h('small', null, '방장') : null)))),
      h('div', { class: 'k-lobby-actions' },
        h('button', { class: 'k-btn is-ghost', onclick: () => { m.leave(); ctx.go('multi'); } }, icon('close', 22), host ? '방 닫기' : '나가기'),
        host
          ? h('button', { class: 'k-btn is-primary', disabled: !enough, title: enough ? '' : `${s.lobby.minPlayers}명 이상 모여야 시작할 수 있어요`, onclick: () => { const err = m.start(); if (err) ctx.toast(err, 'error'); } }, icon('sword', 22), enough ? '시작' : `${s.lobby.minPlayers}명부터 시작`)
          : h('p', { class: 'k-muted' }, '방장이 시작하기를 기다리는 중…')),
    ];
  }

  function draw() {
    const s = m.status();
    const body = s.kind === 'idle' ? idleView(s)
      : s.kind === 'connecting' ? [h('div', { class: 'k-panel k-lobby-card k-lobby-wait' }, icon('reroll', 28), h('b', null, s.role === 'host' ? '방을 여는 중…' : '방장에게 연결하는 중…'))]
        : s.kind === 'lobby' ? lobbyView(s) : [h('p', null, '게임 진행 중')];
    el.replaceChildren(
      h('header', { class: 'k-codex-top' },
        h('button', { class: 'k-back', 'aria-label': '홈으로', onclick: () => { if (s.kind !== 'idle') m.leave(); ctx.go(null); } }, icon('back', 28)),
        h('h2', null, '멀티플레이'),
        h('span', { class: 'k-muted' }, '친구와 같은 상점 풀로 PvP · 무료 P2P 연결')),
      h('div', { class: 'k-lobby-body' }, ...body));
  }

  const unsub = m.subscribe(() => draw());
  draw();
  return { el, destroy: unsub };
}
