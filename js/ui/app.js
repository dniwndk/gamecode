// 화면 관리자: 화면 전환(아이리스), 겹창(서랍·모달), 키보드, 툴팁, 설정 적용, 저장.
import { buildSprite } from './sprite.js';
import { $, el, esc, frame, icon } from './dom.js';
import { iris, stagger, Particles, reduced } from './motion.js';
import { Sfx } from './audio.js';
import * as store from './store.js';
import { ACHIEVEMENTS } from '../core/progress.js';
import title from './screens/title.js';
import birth from './screens/birth.js';
import childhood from './screens/childhood.js';
import goal from './screens/goal.js';
import main from './screens/main.js';
import ending from './screens/ending.js';

const SCREENS = { title, birth, childhood, goal, main, ending };

class UI {
  constructor() {
    this.state = null;
    this.settings = store.loadSettings();
    this.account = store.loadAccount();
    this.sfx = new Sfx();
    this.stack = [];
    this.screen = null;
    this.view = null;
    this.busy = false;
  }

  boot() {
    document.body.insertAdjacentHTML('afterbegin', buildSprite());
    this.applySettings();
    this.particles = new Particles($('#fx'));
    this.bindGlobal();
    const params = new URLSearchParams(location.search);
    if (params.has('seed')) this.pendingSeed = params.get('seed');
    this.go('title', {}, true);
  }

  // ───────── 설정 ─────────
  applySettings() {
    const s = this.settings, root = document.documentElement;
    root.style.setProperty('--fs', `${s.fontSize}px`);
    root.style.setProperty('--lh', String(s.lineHeight));
    root.dataset.theme = s.theme;
    root.dataset.contrast = s.contrast;
    const sysReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    root.dataset.motion = s.motion === 'reduced' || (s.motion === 'auto' && sysReduced) ? 'reduced' : 'full';
    this.sfx.enabled = s.sound;
    this.sfx.setVolume(s.volume);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', s.theme === 'ivory' ? '#e9dcc0' : '#15110d');
  }
  setSetting(k, v) {
    this.settings[k] = v;
    store.saveSettings(this.settings);
    this.applySettings();
  }

  // ───────── 화면 전환 ─────────
  async go(name, opts = {}, instant = false) {
    // 전환 도중(셔터가 열리는 동안) 들어온 요청은 버리지 않고 끝난 뒤 이어서 처리한다
    if (this.busy) { this.queued = [name, opts, instant]; return; }
    this.busy = true;
    const swap = async () => {
      this.closeAll(true);
      this.view?.dispose?.();
      // 화면마다 새 #screen을 만들어 이전 화면이 붙인 이벤트 처리기가 남지 않게 한다
      const prev = $('#screen');
      const root = prev.cloneNode(false);
      prev.replaceWith(root);
      root.className = `screen screen--${name}`;
      this.screen = name;
      this.view = SCREENS[name](this, root, opts) || {};
      this.particles.setMode(this.view.particles || 'embers');
      root.scrollTop = 0;
      const focusTarget = root.querySelector('[autofocus], .btn, .choice');
      focusTarget?.focus({ preventScroll: true });
    };
    try {
      if (instant) await swap();
      else await iris(swap, (n) => this.sfx.play(n));
    } finally { this.busy = false; }
    if (this.queued) { const q = this.queued; this.queued = null; await this.go(...q); }
  }

  // ───────── 겹창 ─────────
  // kind: 'modal' | 'drawer'. dismiss=false면 Esc·바깥 클릭으로 닫히지 않는다.
  open(html, { kind = 'modal', dismiss = true, onAct = null, keys = null, cls = '', onClose = null, title = '' } = {}) {
    const layer = el(`<div class="layer" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="scrim"></div><div class="${kind === 'drawer' ? '' : 'modal-wrap'}"></div></div>`);
    const holder = layer.lastElementChild;
    const box = el(html);
    box.classList.add(kind === 'drawer' ? 'drawer' : 'modal');
    if (cls) box.classList.add(...cls.split(' '));
    if (kind === 'drawer') { layer.removeChild(holder); layer.appendChild(box); } else holder.appendChild(box);
    document.body.appendChild(layer);
    const entry = { layer, box, kind, dismiss, keys, onClose, prevFocus: document.activeElement };
    this.stack.push(entry);
    box.animate(kind === 'drawer'
      ? [{ transform: 'translateX(calc(100% + 24px))' }, { transform: 'none' }]
      : [{ opacity: 0, transform: 'translateY(16px) scale(.96)' }, { opacity: 1, transform: 'none' }],
      { duration: reduced() ? 150 : 340, easing: 'cubic-bezier(.2,.8,.2,1)' });
    layer.firstElementChild.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220 });
    if (dismiss) layer.firstElementChild.addEventListener('click', () => this.close(entry));
    box.addEventListener('click', (e) => {
      const a = e.target.closest('[data-act]');
      if (!a || a.disabled) return;
      if (a.dataset.act === 'close') { this.sfx.play('click'); this.close(entry); return; }
      onAct?.(a.dataset.act, a, e, entry);
    });
    stagger(box);
    this.sfx.play(kind === 'drawer' ? 'page' : 'select');
    setTimeout(() => (box.querySelector('[autofocus]') || box.querySelector('button:not(:disabled), input, [tabindex="0"]'))?.focus({ preventScroll: true }), 30);
    return entry;
  }
  async close(entry = this.stack[this.stack.length - 1], instant = false) {
    if (!entry) return;
    this.stack = this.stack.filter(x => x !== entry);
    entry.onClose?.();
    if (!instant) {
      const a = entry.box.animate(entry.kind === 'drawer'
        ? [{ transform: 'none' }, { transform: 'translateX(calc(100% + 24px))' }]
        : [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(10px) scale(.97)' }],
        { duration: reduced() ? 120 : 240, easing: 'cubic-bezier(.55,0,.7,.2)', fill: 'forwards' });
      entry.layer.firstElementChild.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 240, fill: 'forwards' });
      await a.finished.catch(() => {});
    }
    entry.layer.remove();
    if (entry.prevFocus && document.contains(entry.prevFocus)) entry.prevFocus.focus({ preventScroll: true });
  }
  closeAll(instant) { [...this.stack].reverse().forEach(e => this.close(e, instant)); }
  top() { return this.stack[this.stack.length - 1]; }

  // ───────── 알림 ─────────
  toast(text, { ico = 'bell', sub = '', medal = false } = {}) {
    let zone = $('.toast-zone');
    if (!zone) { zone = el('<div class="toast-zone" aria-live="polite"></div>'); document.body.appendChild(zone); }
    const t = el(frame(`${medal ? `<svg class="medal" aria-hidden="true"><use href="#gear-small"/></svg>` : icon(ico)}<div><div class="t-main">${esc(text)}</div>${sub ? `<div class="t-sub">${esc(sub)}</div>` : ''}</div>`, { cls: 'toast frame--sm frame--dark', tag: 'div' }));
    zone.appendChild(t);
    t.animate([{ opacity: 0, transform: 'translateY(-18px) scale(.95)' }, { opacity: 1, transform: 'none' }], { duration: 360, easing: 'cubic-bezier(.34,1.56,.64,1)' });
    setTimeout(() => { t.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(-8px)' }], { duration: 300, fill: 'forwards' }).finished.then(() => t.remove()); }, 3600);
  }
  announceAchievements(ids) {
    for (const id of ids || []) {
      const a = ACHIEVEMENTS.find(x => x.id === id);
      if (!a) continue;
      this.sfx.play('achieve');
      this.toast(`업적 달성 · ${a.name}`, { sub: `${a.grade}등급 · ${a.desc}`, medal: true });
    }
  }

  // ───────── 저장 ─────────
  autosave() {
    if (!this.state) return;
    const slot = store.autosave(this.state);
    this.account = store.recordAccount(this.state);
    return slot;
  }
  quicksave() { if (this.state && this.state.phase !== 'ended') store.quicksave(this.state); }

  // ───────── 전역 입력 ─────────
  bindGlobal() {
    const unlock = () => this.sfx.unlock();
    addEventListener('pointerdown', unlock, { capture: true });
    addEventListener('keydown', unlock, { capture: true });
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.quicksave(); });
    addEventListener('pagehide', () => this.quicksave());

    addEventListener('keydown', (e) => {
      if (e.isComposing) return;
      const inField = e.target.matches?.('input, textarea, select');
      const top = this.top();
      if (e.key === 'Escape') {
        if (top && top.dismiss) { e.preventDefault(); this.sfx.play('click'); this.close(top); return; }
      }
      if (inField) return;
      if (top) {
        top.keys?.(e, top);
        // 계획·사건·결산 창 위에서도 특성·인물 같은 서랍은 단축키로 바로 열 수 있다
        if (!e.defaultPrevented && top.kind !== 'drawer') this.view?.panelKeys?.(e);
        this.trapFocus(e, top.box);
        return;
      }
      this.view?.keys?.(e);
    });

    // 누름 피드백 (120ms)
    addEventListener('pointerdown', (e) => {
      const b = e.target.closest('.btn, .choice, .menu-item, .ticket');
      if (b && !b.disabled) { b.classList.add('is-pressed'); setTimeout(() => b.classList.remove('is-pressed'), 140); }
    });
    addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (b && !b.disabled && !b.dataset.silent) this.sfx.play('click');
    });

    // 툴팁
    const tip = el('<div class="tip" role="tooltip"></div>');
    document.body.appendChild(tip);
    const show = (t) => {
      const text = t.dataset.tip;
      if (!text) return;
      tip.innerHTML = esc(text).replace(/\n/g, '<br>');
      const r = t.getBoundingClientRect();
      tip.classList.add('show');
      const tw = tip.offsetWidth, th = tip.offsetHeight;
      let x = Math.min(innerWidth - tw - 8, Math.max(8, r.left + r.width / 2 - tw / 2));
      let y = r.top - th - 8; if (y < 8) y = r.bottom + 8;
      tip.style.left = x + 'px'; tip.style.top = y + 'px';
    };
    const hide = () => tip.classList.remove('show');
    document.addEventListener('pointerover', (e) => { const t = e.target.closest('[data-tip]'); if (t) show(t); else hide(); });
    document.addEventListener('focusin', (e) => { const t = e.target.closest('[data-tip]'); if (t) show(t); else hide(); });
    document.addEventListener('scroll', hide, true);
  }
  trapFocus(e, box) {
    if (e.key !== 'Tab') return;
    const f = [...box.querySelectorAll('button:not(:disabled), input, select, textarea, [tabindex="0"]')].filter(x => x.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (!box.contains(document.activeElement)) { e.preventDefault(); first.focus(); return; }
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
}

export const ui = new UI();
window.__ui = ui; // 브라우저 테스트용 진입점
ui.boot();
