'use strict';
// ───────── 기본 도구 ─────────
const W = 1600, H = 900;
const cv = document.getElementById('c');
const cx = cv.getContext('2d');
function fit() {
  const s = Math.min(innerWidth / W, innerHeight / H);
  cv.style.width = (W * s) + 'px'; cv.style.height = (H * s) + 'px';
  cv.width = W; cv.height = H;
  const ui = document.getElementById('ui');
  ui.style.width = W + 'px'; ui.style.height = H + 'px';
  ui.style.transform = `translate(-50%,-50%) scale(${s})`;
}
addEventListener('resize', fit);

// 시드 난수 (자동 테스트 재현용)
let _seed = (Date.now() & 0xffffffff) >>> 0;
function seed(s) { _seed = s >>> 0; }
function R() { _seed |= 0; _seed = _seed + 0x6D2B79F5 | 0; let t = Math.imul(_seed ^ _seed >>> 15, 1 | _seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const angTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
const pick = arr => arr[Math.floor(R() * arr.length)];
const rint = (a, b) => a + Math.floor(R() * (b - a + 1));
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function wpick(pairs) { // [[item, weight], ...]
  let t = 0; for (const p of pairs) t += p[1];
  let r = R() * t; for (const p of pairs) { r -= p[1]; if (r <= 0) return p[0]; }
  return pairs[pairs.length - 1][0];
}
function angDiff(a, b) { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; }

// ───────── 입력 ─────────
const Input = {
  down: new Set(), pressed: new Set(), mx: W / 2, my: H / 2, mouseMoved: 0, bot: null,
  isDown(k) { return this.down.has(k) || (this.bot && this.bot.down.has(k)); },
  hit(k) { return this.pressed.has(k) || (this.bot && this.bot.pressed.has(k)); },
  endFrame() { this.pressed.clear(); if (this.bot) this.bot.pressed.clear(); },
};
addEventListener('keydown', e => {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (!Input.down.has(k)) Input.pressed.add(k);
  Input.down.add(k);
  if ([' ', 'Tab'].includes(e.key)) e.preventDefault();
});
addEventListener('keyup', e => { const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; Input.down.delete(k); });
cv.addEventListener('mousemove', e => {
  const r = cv.getBoundingClientRect();
  Input.mx = (e.clientX - r.left) / r.width * W; Input.my = (e.clientY - r.top) / r.height * H; Input.mouseMoved = performance.now();
});
cv.addEventListener('mousedown', e => { const k = 'mouse' + e.button; Input.down.add(k); Input.pressed.add(k); e.preventDefault(); });
addEventListener('mouseup', e => Input.down.delete('mouse' + e.button));
cv.addEventListener('contextmenu', e => e.preventDefault());

// ───────── 손맛 (히트스톱, 흔들림, 슬로모) ─────────
const Juice = {
  stop: 0, shake: 0, zoom: 0, slow: 0, slowScale: 1, flash: 0, flashCol: '#fff', kx: 0, ky: 0, impact: 0, impactCol: '#fff', chroma: 0,
  kickDir(a, s) { this.kx += Math.cos(a) * s; this.ky += Math.sin(a) * s; this.shake = Math.max(this.shake, s * 0.35); },
  impactFrame(t, col) { this.impact = Math.max(this.impact, t); this.impactCol = col || '#fff'; },
  ab(t) { this.chroma = Math.max(this.chroma, t); },
  hitstop(t) { this.stop = Math.max(this.stop, t); },
  kick(s) { this.shake = Math.min(26, Math.max(this.shake, s)); },
  punch(z) { this.zoom = Math.max(this.zoom, z); },
  slowmo(t, sc) { this.slow = Math.max(this.slow, t); this.slowScale = sc; },
  screen(c, t) { this.flash = t; this.flashCol = c; },
  update(rdt) {
    this.shake = Math.max(0, this.shake - rdt * 60);
    this.zoom = Math.max(0, this.zoom - rdt * 0.6);
    this.flash = Math.max(0, this.flash - rdt);
    const k = Math.exp(-rdt * 22); this.kx *= k; this.ky *= k;
    this.impact = Math.max(0, this.impact - rdt); this.chroma = Math.max(0, this.chroma - rdt);
    if (this.slow > 0) this.slow -= rdt;
  },
  scale() { return this.slow > 0 ? this.slowScale : 1; },
};

// ───────── 파티클과 글자 ─────────
const FX = {
  parts: [], texts: [], rings: [], slashes: [], shards: [],
  slash(x, y, ang, arc, r, col, w, life, follow) { this.slashes.push({ x, y, ang, arc, r, col, w, life, max: life, follow }); },
  shatter(x, y, col, n, spd, size) { for (let i = 0; i < n; i++) { const a = R() * Math.PI * 2, s = spd * (0.4 + R()); this.shards.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, rot: R() * 6, vr: (R() - 0.5) * 30, life: 0.7 + R() * 0.5, max: 1.2, col, size: size * (0.5 + R()) }); } },
  radial(x, y, col, n, r0, len) { for (let i = 0; i < n; i++) { const a = R() * Math.PI * 2, s = 900 + R() * 700; this.parts.push({ x: x + Math.cos(a) * r0, y: y + Math.sin(a) * r0, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.16 + R() * 0.1, max: 0.26, col, size: len, line: true }); } },
  burst(x, y, col, n, spd, life, size) {
    for (let i = 0; i < n; i++) {
      const a = R() * Math.PI * 2, s = spd * (0.3 + R() * 0.9);
      this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: life * (0.6 + R() * 0.6), max: life, col, size: size * (0.6 + R() * 0.8) });
    }
  },
  spark(x, y, ang, col, n, spd) {
    for (let i = 0; i < n; i++) {
      const a = ang + (R() - 0.5) * 1.2, s = spd * (0.5 + R());
      this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.25 + R() * 0.2, max: 0.4, col, size: 3 + R() * 3, line: true });
    }
  },
  ring(x, y, r0, r1, col, life, w) { this.rings.push({ x, y, r0, r1, col, life, max: life, w: w || 4 }); },
  text(x, y, s, col, big) {
    this.texts.push({ x: x + (R() - 0.5) * 20, y, s: String(s), col, life: big ? 1.1 : 0.75, max: big ? 1.1 : 0.75, big: !!big, vy: big ? -50 : -80, vx: (R() - 0.5) * 60, age: 0 });
  },
  update(dt) {
    for (const p of this.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.9; p.vy *= 0.9; p.life -= dt; }
    this.parts = this.parts.filter(p => p.life > 0);
    if (this.parts.length > 900) this.parts.splice(0, this.parts.length - 900);
    for (const t of this.texts) { t.y += t.vy * dt; t.x += (t.vx || 0) * dt; t.vy *= 0.94; t.life -= dt; t.age = (t.age || 0) + dt; }
    for (const s of this.slashes) s.life -= dt; this.slashes = this.slashes.filter(s => s.life > 0);
    for (const p of this.shards) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= Math.exp(-dt * 5); p.vy *= Math.exp(-dt * 5); p.rot += p.vr * dt; p.vr *= 0.95; p.life -= dt; if (p.life <= 0 && window.stampDecal) stampDecal(p); }
    this.shards = this.shards.filter(p => p.life > 0);
    this.texts = this.texts.filter(t => t.life > 0);
    for (const r of this.rings) r.life -= dt;
    this.rings = this.rings.filter(r => r.life > 0);
  },
  draw() {
    for (const s of this.slashes) {
      const k = s.life / s.max, x = s.follow ? s.follow.x : s.x, y = s.follow ? s.follow.y : s.y;
      cx.save(); cx.globalAlpha = Math.min(1, k * 1.6); cx.strokeStyle = s.col; cx.lineCap = 'round'; cx.shadowColor = s.col; cx.shadowBlur = 18;
      const a0 = s.ang - s.arc / 2, a1 = s.ang + s.arc / 2, sweep = (1 - k) * 0.25;
      for (let i = 0; i < 3; i++) { cx.lineWidth = s.w * (1 - i * 0.3) * (0.4 + k * 0.6); cx.beginPath(); cx.arc(x, y, s.r - i * s.w * 0.35, a0 + sweep, a1 + sweep); cx.stroke(); }
      cx.restore();
    }
    for (const p of this.shards) {
      cx.save(); cx.globalAlpha = clamp(p.life / 0.3, 0, 1); cx.translate(p.x, p.y); cx.rotate(p.rot); cx.fillStyle = p.col;
      cx.beginPath(); cx.moveTo(-p.size, -p.size * 0.6); cx.lineTo(p.size, 0); cx.lineTo(-p.size * 0.4, p.size * 0.7); cx.closePath(); cx.fill(); cx.restore();
    }
    for (const r of this.rings) {
      const k = 1 - r.life / r.max;
      cx.globalAlpha = 1 - k; cx.strokeStyle = r.col; cx.lineWidth = r.w * (1 - k) + 1;
      cx.beginPath(); cx.arc(r.x, r.y, lerp(r.r0, r.r1, k), 0, Math.PI * 2); cx.stroke();
    }
    for (const p of this.parts) {
      cx.globalAlpha = clamp(p.life / p.max, 0, 1); cx.fillStyle = p.col; cx.strokeStyle = p.col;
      if (p.line) { cx.lineWidth = p.size * 0.6; cx.beginPath(); cx.moveTo(p.x, p.y); cx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03); cx.stroke(); }
      else cx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    cx.globalAlpha = 1;
    cx.textAlign = 'center';
    for (const t of this.texts) {
      const a = clamp(t.life / t.max * 1.6, 0, 1); cx.globalAlpha = a;
      const pop = 1 + Math.max(0, 0.12 - (t.age || 0)) / 0.12 * (t.big ? 0.9 : 0.6);
      cx.font = `900 ${Math.round((t.big ? 34 : 22) * pop)}px "Pretendard", "Noto Sans KR", sans-serif`;
      cx.lineWidth = 5; cx.strokeStyle = '#0b0b10'; cx.strokeText(t.s, t.x, t.y); cx.fillStyle = t.col; cx.fillText(t.s, t.x, t.y);
    }
    cx.globalAlpha = 1;
  },
  clear() { this.parts = []; this.texts = []; this.rings = []; this.slashes = []; this.shards = []; },
};

// ───────── 소리 (코드로 만든 효과음) ─────────
const Sfx = {
  ac: null, on: true,
  init() { if (!this.ac) try { this.ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.on = false; } },
  tone(f0, f1, dur, type, vol) {
    if (!this.on || !this.ac) return;
    const a = this.ac, o = a.createOscillator(), g = a.createGain(), t = a.currentTime;
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur);
  },
  noise(dur, vol, hp) {
    if (!this.on || !this.ac) return;
    const a = this.ac, n = a.sampleRate * dur, b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = a.createBufferSource(), g = a.createGain(), f = a.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = hp || 800; s.buffer = b; g.gain.value = vol;
    s.connect(f).connect(g).connect(a.destination); s.start();
  },
  hit(p) { p = p || 1; this.noise(0.08, 0.25, 1200 * p); this.tone(180 * p, 60, 0.08, 'square', 0.12); this.tone(90 * p, 40, 0.12, 'sine', 0.18); },
  thud() { this.tone(120, 35, 0.25, 'sine', 0.4); this.noise(0.15, 0.3, 300); },
  crunch() { this.noise(0.18, 0.28, 500); this.tone(260, 50, 0.15, 'triangle', 0.15); },
  crit() { this.noise(0.12, 0.3, 600); this.tone(300, 80, 0.12, 'sawtooth', 0.12); },
  parry() { this.tone(1400, 900, 0.18, 'triangle', 0.25); this.tone(2100, 1600, 0.12, 'sine', 0.15); },
  gold() { this.tone(900, 1800, 0.3, 'triangle', 0.25); this.tone(600, 1200, 0.35, 'sine', 0.2); },
  dash() { this.noise(0.12, 0.12, 2500); },
  swing(p) { this.noise(0.07, 0.09, 2600 * (p || 1)); },
  hurt() { this.tone(220, 70, 0.2, 'sawtooth', 0.2); },
  boom() { this.noise(0.35, 0.35, 120); this.tone(90, 30, 0.35, 'sine', 0.3); },
  groggy() { this.tone(500, 120, 0.5, 'square', 0.15); },
  pick() { this.tone(700, 1100, 0.08, 'sine', 0.12); },
};
