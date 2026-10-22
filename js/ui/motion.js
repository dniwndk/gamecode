// 연출: 아이리스 셔터 전환, 버튼 순차 등장, 숫자 카운트, 증기·불티 파티클(최대 40개).
import { $, $$ } from './dom.js';

export const reduced = () => document.documentElement.dataset.motion === 'reduced';
const wait = (ms) => new Promise(r => setTimeout(r, ms));

// 황동 셔터가 닫혔다 열리며 화면을 바꾼다 (총 700ms)
export async function iris(swap, sfx) {
  const ov = $('#iris');
  if (!ov || reduced()) {
    $('#screen').animate([{ opacity: 1 }, { opacity: 0 }], { duration: 75, fill: 'forwards' });
    await wait(75);
    await swap();
    $('#screen').animate([{ opacity: 0 }, { opacity: 1 }], { duration: 75 });
    return;
  }
  const big = `${Math.ceil(Math.hypot(innerWidth, innerHeight) / 2) + 40}px`;
  ov.classList.add('active');
  sfx?.('shutter');
  const close = ov.animate([{ '--iris': big }, { '--iris': '0px' }], { duration: 330, easing: 'cubic-bezier(.55,0,.7,.2)', fill: 'forwards' });
  await close.finished.catch(() => {});
  ov.classList.add('closed');
  await swap();
  await wait(40);
  ov.classList.remove('closed');
  const open = ov.animate([{ '--iris': '0px' }, { '--iris': big }], { duration: 330, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' });
  await open.finished.catch(() => {});
  ov.classList.remove('active');
}

// 버튼과 카드에 순차 등장 + 반짝임
export function stagger(root, sel = '.btn, .choice, .ticket, .menu-item') {
  $$(sel, root).forEach((b, i) => {
    b.style.setProperty('--i', i);
    b.classList.add('btn-in');
    if (!reduced() && b.classList.contains('btn')) setTimeout(() => b.classList.add('glint'), 60 * i + 200);
  });
}

export function countUp(node, from, to, ms = 600, fmtFn = (v) => String(v)) {
  if (!node) return;
  if (reduced() || from === to) { node.textContent = fmtFn(to); return; }
  const t0 = performance.now();
  const step = (t) => {
    const k = Math.min(1, (t - t0) / ms);
    const e = 1 - Math.pow(1 - k, 3);
    node.textContent = fmtFn(Math.round(from + (to - from) * e));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export function shake(node) {
  if (!node) return;
  node.classList.remove('is-shake'); void node.offsetWidth; node.classList.add('is-shake');
}

// 하나의 캔버스에 불티와 증기를 그린다. 탭이 숨겨지면 멈춘다.
export class Particles {
  constructor(canvas) {
    this.c = canvas; this.ctx = canvas.getContext('2d'); this.ps = []; this.mode = 'embers'; this.on = true; this.max = 40;
    this.resize = this.resize.bind(this); this.tick = this.tick.bind(this);
    addEventListener('resize', this.resize); this.resize();
    document.addEventListener('visibilitychange', () => { if (!document.hidden) this.kick(); });
    this.last = performance.now(); this.kick();
  }
  resize() {
    const dpr = Math.min(2, devicePixelRatio || 1);
    this.w = innerWidth; this.h = innerHeight;
    this.c.width = this.w * dpr; this.c.height = this.h * dpr;
    this.c.style.width = this.w + 'px'; this.c.style.height = this.h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  setMode(m) { this.mode = m; }
  kick() { if (!this.raf) this.raf = requestAnimationFrame(this.tick); }
  spawn() {
    const steam = this.mode === 'steam';
    const ivory = document.documentElement.dataset.theme === 'ivory';
    return steam
      ? { x: Math.random() * this.w, y: this.h + 40, vx: (Math.random() - .5) * 8, vy: -(10 + Math.random() * 16), r: 30 + Math.random() * 60, life: 0, max: 9 + Math.random() * 6, kind: 's', ivory }
      : { x: Math.random() * this.w, y: this.h + 10, vx: (Math.random() - .5) * 14, vy: -(14 + Math.random() * 30), r: .8 + Math.random() * 1.8, life: 0, max: 7 + Math.random() * 7, kind: 'e', ivory, ph: Math.random() * 6 };
  }
  tick(t) {
    this.raf = null;
    if (document.hidden) return;
    const dt = Math.min(.05, (t - this.last) / 1000); this.last = t;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);
    const active = this.on && !reduced() && this.mode !== 'off';
    if (active && this.ps.length < this.max && Math.random() < .25) this.ps.push(this.spawn());
    for (const p of this.ps) {
      p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt;
      const k = p.life / p.max; const a = Math.sin(Math.PI * Math.min(1, k));
      if (p.kind === 'e') {
        p.x += Math.sin(p.life * 2 + p.ph) * .3;
        ctx.fillStyle = p.ivory ? `rgba(160,110,40,${.35 * a})` : `rgba(255,${170 + Math.round(60 * a)},90,${.75 * a})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
      } else {
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        const col = p.ivory ? '255,255,255' : '220,205,180';
        g.addColorStop(0, `rgba(${col},${.07 * a})`); g.addColorStop(1, `rgba(${col},0)`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
        p.r += dt * 6;
      }
    }
    this.ps = this.ps.filter(p => p.life < p.max && p.y > -120);
    if (this.ps.length || active) this.raf = requestAnimationFrame(this.tick);
  }
}
