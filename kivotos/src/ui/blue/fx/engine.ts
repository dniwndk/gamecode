// WebGL2 연출 계층. 캔버스 세 장:
//  ① 배경(DOM 뒤): 유체로 흐르는 하늘·헤일로·육각 격자·빛 입자
//  ② 광택(DOM 위, 'screen' 겹치기): 카드 박막 무지개빛·유리 광택·테두리 빛, 빛 폭발
//  ③ 장막(맨 위): 화면 전환 파편·빛 쓸기
// 화면 기능은 언제나 DOM이 맡고, 여기서는 보기만 바꾼다. 실패하면 조용히 CSS 화면으로 남는다.
import { createFluid, type Fluid } from './fluid';
import { fullscreen, hexToRgb, program, type Prog } from './gl';
import { BG_FS, BURST_FS, BURST_VS, CARD_FS, CARD_VS, FULL_VS, VEIL_FS } from './shaders';

export interface BurstOpts {
  color?: string;
  /** 반지름(CSS px) */
  size?: number;
  ms?: number;
}

export interface Fx {
  readonly on: boolean;
  burst(at: Element | { x: number; y: number } | null, o?: BurstOpts): void;
  transition(kind: 'shatter' | 'sweep'): void;
  theme(chapter: number): void;
  setEnabled(on: boolean): void;
  /** 배경 장면 일러스트. mix=그림 비율, wash=흰 막(글자 가독성), washLeft=왼쪽만 밝게 */
  scene(url: string | null, o?: { mix?: number; wash?: number; washLeft?: boolean }): void;
}

export const NO_FX: Fx = { on: false, burst() {}, transition() {}, theme() {}, setEnabled() {}, scene() {} };

interface Env {
  root: HTMLElement;
  stage: HTMLElement;
  scale(): number;
  mobile(): boolean;
  noFlash(): boolean;
}

const SKY: Record<number, [string, string]> = { 1: ['#c3e6ff', '#128cff'], 2: ['#b2ecf2', '#0ea5b7'], 3: ['#d4d7ff', '#5b6cff'] };
const MAX_CARDS = 64;
const MAX_BURSTS = 12;
/** 광택·기울기를 받는 카드들 */
const CARD_SEL = '.k-card, .k-shop-card, .k-choice-card';

interface Spring { rx: number; ry: number; lift: number; vx: number; vy: number; vl: number; tx: number; ty: number; tl: number; hov: number; hovT: number }
interface CardInfo { cls: string; cost: number; star: number; color: [number, number, number]; radius: number; clip: Element | null }

export function createFx(env: Env): Fx {
  try {
    return build(env);
  } catch (err) {
    console.warn('[fx] WebGL2 연출을 끕니다:', err);
    env.root.querySelectorAll('.k-gfx').forEach((c) => c.remove());
    return NO_FX;
  }
}

function build(env: Env): Fx {
  const { root, stage } = env;
  const mk = (cls: string) => { const c = document.createElement('canvas'); c.className = `k-gfx ${cls}`; c.setAttribute('aria-hidden', 'true'); return c; };
  const bgC = mk('k-gfx-bg');
  const foilC = mk('k-gfx-foil');
  const veilC = mk('k-gfx-veil');
  const attrs: WebGLContextAttributes = { antialias: false, depth: false, stencil: false, powerPreference: 'high-performance' };
  const bg = bgC.getContext('webgl2', { ...attrs, alpha: false });
  const foil = foilC.getContext('webgl2', { ...attrs, alpha: true, premultipliedAlpha: true });
  const veil = veilC.getContext('webgl2', { ...attrs, alpha: true, premultipliedAlpha: true });
  if (!bg || !foil || !veil) throw new Error('WebGL2 없음');
  (root.querySelector('.k-backdrop') ?? root).append(bgC);
  root.append(foilC, veilC);

  // ── 프로그램 ───────────────────────────────────────
  const bgTri = fullscreen(bg);
  const bgProg = program(bg, FULL_VS, BG_FS);
  const veilTri = fullscreen(veil);
  const veilProg = program(veil, FULL_VS, VEIL_FS);
  const cardProg = program(foil, CARD_VS, CARD_FS);
  const burstProg = program(foil, BURST_VS, BURST_FS);

  const mobile0 = env.mobile();
  const fluid: Fluid | null = createFluid(bg, bgTri, mobile0 ? 64 : 128, mobile0 ? 256 : 512, window.innerWidth / Math.max(1, window.innerHeight));
  const blank = bg.createTexture()!;
  bg.bindTexture(bg.TEXTURE_2D, blank);
  bg.texImage2D(bg.TEXTURE_2D, 0, bg.RGBA, 1, 1, 0, bg.RGBA, bg.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));

  // 장면 일러스트 텍스처(주소별 캐시, 바뀌면 0.7초 교차 전환)
  type SceneTex = { tex: WebGLTexture; aspect: number };
  const sceneCache = new Map<string, Promise<SceneTex | null>>();
  const scn = { cur: null as SceneTex | null, prev: null as SceneTex | null, fade: 1, mix: 0, wantMix: 0, wash: 0, wantWash: 0, left: 0, url: '' };
  function loadScene(url: string): Promise<SceneTex | null> {
    let p = sceneCache.get(url);
    if (!p) {
      p = new Promise((resolve) => {
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => {
          const gl = bg!;
          const tex = gl.createTexture()!;
          gl.bindTexture(gl.TEXTURE_2D, tex);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          resolve({ tex, aspect: img.naturalWidth / Math.max(1, img.naturalHeight) });
        };
        img.onerror = () => resolve(null);
        img.src = url;
      });
      sceneCache.set(url, p);
    }
    return p;
  }

  // 인스턴스 사각형(카드·폭발)
  const quad = (stride: number, attrs: number[]) => {
    const vao = foil.createVertexArray()!;
    foil.bindVertexArray(vao);
    const qb = foil.createBuffer();
    foil.bindBuffer(foil.ARRAY_BUFFER, qb);
    foil.bufferData(foil.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), foil.STATIC_DRAW);
    foil.enableVertexAttribArray(0);
    foil.vertexAttribPointer(0, 2, foil.FLOAT, false, 0, 0);
    const ib = foil.createBuffer()!;
    foil.bindBuffer(foil.ARRAY_BUFFER, ib);
    let off = 0;
    attrs.forEach((n, i) => {
      foil.enableVertexAttribArray(i + 1);
      foil.vertexAttribPointer(i + 1, n, foil.FLOAT, false, stride * 4, off * 4);
      foil.vertexAttribDivisor(i + 1, 1);
      off += n;
    });
    foil.bindVertexArray(null);
    return { vao, ib };
  };
  const cardQ = quad(16, [4, 4, 4, 4]);
  const burstQ = quad(8, [4, 4]);
  const cardData = new Float32Array(MAX_CARDS * 16);
  const burstData = new Float32Array(MAX_BURSTS * 8);

  // ── 상태 ───────────────────────────────────────────
  let enabled = true;
  let raf = 0;
  let time = 0;
  let last = performance.now();
  let energy = 0;
  let quality = mobile0 ? 0.5 : 0.62;
  let slowFrames = 0;
  let firstFrame = true;
  const sky = { top: hexToRgb(SKY[1][0]), accent: hexToRgb(SKY[1][1]), wantTop: hexToRgb(SKY[1][0]), wantAccent: hexToRgb(SKY[1][1]) };
  const mid = hexToRgb('#e3f3ff');
  const low = hexToRgb('#f7fbff');
  const mouse = { x: -1e4, y: -1e4, px: -1e4, py: -1e4, down: false, moved: false };
  const bursts: { x: number; y: number; r: number; t0: number; ms: number; color: [number, number, number]; seed: number }[] = [];
  let veilState: { kind: 'shatter' | 'sweep'; t0: number; ms: number; seed: number } | null = null;
  let nextAmbient = 0.6;
  const springs = new Map<HTMLElement, Spring>();
  const infos = new WeakMap<HTMLElement, CardInfo>();
  let hovered: HTMLElement | null = null;

  // ── 크기 ───────────────────────────────────────────
  let W = 0;
  let H = 0;
  let dpr = 1;
  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const set = (c: HTMLCanvasElement, s: number) => { c.width = Math.max(1, Math.round(W * s)); c.height = Math.max(1, Math.round(H * s)); };
    set(bgC, dpr * quality);
    set(foilC, Math.min(dpr, 1.5));
    set(veilC, dpr * 0.6);
  }
  resize();
  window.addEventListener('resize', resize);

  // ── 입력: 커서가 유체를 밀고, 카드는 스프링으로 기운다 ──
  const onMove = (e: PointerEvent) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.moved = true;
    const card = (e.target as Element | null)?.closest?.(CARD_SEL) as HTMLElement | null;
    setHover(card && !card.classList.contains('k-ghost') && root.contains(card) ? card : null);
    if (hovered) {
      const r = hovered.getBoundingClientRect();
      const s = spring(hovered);
      s.ty = ((e.clientX - r.left) / r.width - 0.5) * 16;
      s.tx = -((e.clientY - r.top) / r.height - 0.5) * 12;
    }
  };
  const onDown = (e: PointerEvent) => { mouse.down = true; mouse.x = e.clientX; mouse.y = e.clientY; mouse.px = e.clientX; mouse.py = e.clientY; };
  const onUp = () => { mouse.down = false; };
  const onLeave = () => setHover(null);
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerdown', onDown, { passive: true });
  window.addEventListener('pointerup', onUp, { passive: true });
  document.addEventListener('pointerleave', onLeave);

  function spring(el: HTMLElement): Spring {
    let s = springs.get(el);
    if (!s) { s = { rx: 0, ry: 0, lift: 0, vx: 0, vy: 0, vl: 0, tx: 0, ty: 0, tl: 0, hov: 0, hovT: 0 }; springs.set(el, s); }
    return s;
  }
  function setHover(card: HTMLElement | null) {
    if (card === hovered) return;
    if (hovered) { const s = spring(hovered); s.tx = 0; s.ty = 0; s.tl = 0; s.hovT = 0; }
    hovered = card;
    if (card) { const s = spring(card); s.tl = -4; s.hovT = 1; }
  }
  function stepSprings(dt: number) {
    const k = 210;
    const c = 17;
    for (const [el, s] of springs) {
      if (!el.isConnected) { springs.delete(el); continue; }
      s.vx += (k * (s.tx - s.rx) - c * s.vx) * dt; s.rx += s.vx * dt;
      s.vy += (k * (s.ty - s.ry) - c * s.vy) * dt; s.ry += s.vy * dt;
      s.vl += (k * (s.tl - s.lift) - c * s.vl) * dt; s.lift += s.vl * dt;
      s.hov += (s.hovT - s.hov) * Math.min(1, dt * 10);
      el.style.setProperty('--rx', `${s.rx.toFixed(2)}deg`);
      el.style.setProperty('--ry', `${s.ry.toFixed(2)}deg`);
      el.style.setProperty('--lift', `${s.lift.toFixed(2)}px`);
      const rest = Math.abs(s.rx) + Math.abs(s.ry) + Math.abs(s.lift) + Math.abs(s.vx) + Math.abs(s.vy) + Math.abs(s.vl) + s.hov;
      if (s.hovT === 0 && rest < 0.02) { el.style.removeProperty('--rx'); el.style.removeProperty('--ry'); el.style.removeProperty('--lift'); springs.delete(el); }
    }
  }

  // ── 카드 수집 ─────────────────────────────────────
  function info(el: HTMLElement): CardInfo {
    const prev = infos.get(el);
    if (prev && prev.cls === el.className) return prev;
    const cost = Number(/cost-(\d)/.exec(el.className)?.[1] ?? el.dataset.cost ?? (el.classList.contains('k-choice-card') ? 4 : 1));
    const star = Number(/star-(\d)/.exec(el.className)?.[1] ?? 1);
    const cs = getComputedStyle(el);
    const color = hexToRgb(el.style.getPropertyValue('--cc') || el.style.getPropertyValue('--hue') || cs.getPropertyValue('--cc') || '#128cff');
    let clip: Element | null = null;
    for (let p = el.parentElement; p && p !== root && p !== stage; p = p.parentElement) {
      const ps = getComputedStyle(p);
      if (ps.overflowX !== 'visible' || ps.overflowY !== 'visible') { clip = p; break; }
    }
    const ci: CardInfo = { cls: el.className, cost, star, color, radius: parseFloat(cs.borderTopLeftRadius) || 10, clip };
    infos.set(el, ci);
    return ci;
  }
  function collectCards(): number {
    const wraps = root.querySelectorAll('.k-modal-wrap:not(.is-out)');
    const modal = wraps.length ? wraps[wraps.length - 1].querySelector('.k-modal') : null;
    const list = modal ? modal.querySelectorAll<HTMLElement>(CARD_SEL) : stage.querySelectorAll<HTMLElement>(CARD_SEL.split(', ').map((s) => `.k-screen:not(.is-leaving) ${s}`).join(', '));
    let n = 0;
    for (const el of list) {
      if (n >= MAX_CARDS) break;
      const r = el.getBoundingClientRect();
      if (r.width < 24 || r.bottom < 0 || r.top > H || r.right < 0 || r.left > W) continue;
      const ci = info(el);
      let cx0 = 0, cy0 = 0, cx1 = W, cy1 = H;
      if (ci.clip) { const c = ci.clip.getBoundingClientRect(); cx0 = Math.max(0, c.left); cy0 = Math.max(0, c.top); cx1 = Math.min(W, c.right); cy1 = Math.min(H, c.bottom); }
      if (cx1 <= cx0 || cy1 <= cy0) continue;
      const k = r.width / Math.max(1, el.offsetWidth);
      const s = springs.get(el);
      const o = n * 16;
      cardData.set([r.left, r.top, r.width, r.height, ci.cost, ci.star, s?.hov ?? 0, ci.radius * k, cx0, cy0, cx1, cy1, ...ci.color, modal ? 1 : 0], o);
      n++;
    }
    return n;
  }
  function occluders(): number[] {
    const out: number[] = [];
    for (const el of root.querySelectorAll('.k-tip, .k-bubble, .k-cutin.is-on, .k-toast')) {
      if (out.length >= 16) break;
      const r = el.getBoundingClientRect();
      if (r.width > 0) out.push(r.left, r.top, r.right, r.bottom);
    }
    return out;
  }

  // ── 그리기 ─────────────────────────────────────────
  function haloPx(): [number, number, number] {
    const s = dpr * quality;
    if (env.mobile()) return [W * 0.92 * s, H * 0.07 * s, Math.min(W, H) * 0.78 * s];
    const r = stage.getBoundingClientRect();
    const sc = env.scale();
    return [(r.left + 1630 * sc) * s, (r.top + 170 * sc) * s, 550 * sc * s];
  }

  function drawBg() {
    const gl = bg!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, bgC.width, bgC.height);
    gl.disable(gl.BLEND);
    gl.useProgram(bgProg.p);
    gl.bindVertexArray(bgTri);
    const u = bgProg.u;
    const k = (env.mobile() ? 0.62 : env.scale()) * dpr * quality;
    gl.uniform2f(u.uRes, bgC.width, bgC.height);
    gl.uniform1f(u.uTime, time);
    gl.uniform1f(u.uEnergy, energy);
    gl.uniform1f(u.uK, k);
    gl.uniform1f(u.uFluid, fluid ? 1 : 0);
    gl.uniform3f(u.uTop, ...sky.top);
    gl.uniform3f(u.uMid, ...mid);
    gl.uniform3f(u.uLow, ...low);
    gl.uniform3f(u.uAccent, ...sky.accent);
    gl.uniform3f(u.uHalo, ...haloPx());
    gl.uniform2f(u.uMouse, mouse.x * dpr * quality, mouse.y * dpr * quality);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, fluid ? fluid.dye.read.tex : blank);
    gl.uniform1i(u.uDye, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, fluid ? fluid.vel.read.tex : blank);
    gl.uniform1i(u.uVel, 1);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, scn.cur?.tex ?? blank);
    gl.uniform1i(u.uScene, 2);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, (scn.prev ?? scn.cur)?.tex ?? blank);
    gl.uniform1i(u.uScenePrev, 3);
    gl.uniform1f(u.uSceneA, scn.cur?.aspect ?? 1);
    gl.uniform1f(u.uPrevA, (scn.prev ?? scn.cur)?.aspect ?? 1);
    gl.uniform1f(u.uSceneFade, scn.prev ? scn.fade : 1);
    gl.uniform1f(u.uSceneMix, scn.cur ? scn.mix : 0);
    gl.uniform1f(u.uWash, scn.wash);
    gl.uniform1f(u.uWashLeft, scn.left);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function useInst(pr: Prog) {
    const gl = foil!;
    gl.useProgram(pr.p);
    gl.uniform2f(pr.u.uView, W, H);
  }
  function drawFoil(now: number) {
    const gl = foil!;
    gl.viewport(0, 0, foilC.width, foilC.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    const n = collectCards();
    if (n) {
      useInst(cardProg);
      gl.uniform2f(cardProg.u.uMouse, mouse.x, mouse.y);
      gl.uniform1f(cardProg.u.uTime, time);
      const occ = occluders();
      const occN = occ.length / 4;
      if (occN) gl.uniform4fv(cardProg.u.uOcc, new Float32Array([...occ, ...new Array(16 - occ.length).fill(0)]));
      gl.uniform1i(cardProg.u.uOccN, occN);
      gl.bindVertexArray(cardQ.vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, cardQ.ib);
      gl.bufferData(gl.ARRAY_BUFFER, cardData.subarray(0, n * 16), gl.DYNAMIC_DRAW);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, n);
    }
    for (let i = bursts.length - 1; i >= 0; i--) if (now - bursts[i].t0 > bursts[i].ms) bursts.splice(i, 1);
    if (bursts.length) {
      bursts.forEach((b, i) => burstData.set([b.x, b.y, b.r, (now - b.t0) / b.ms, ...b.color, b.seed], i * 8));
      useInst(burstProg);
      gl.uniform1f(burstProg.u.uFlash, env.noFlash() ? 0.15 : 1);
      gl.bindVertexArray(burstQ.vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, burstQ.ib);
      gl.bufferData(gl.ARRAY_BUFFER, burstData.subarray(0, bursts.length * 8), gl.DYNAMIC_DRAW);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, bursts.length);
    }
  }

  function drawVeil(now: number) {
    const gl = veil!;
    if (!veilState) return;
    const t = (now - veilState.t0) / veilState.ms;
    gl.viewport(0, 0, veilC.width, veilC.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (t >= 1) { veilState = null; veilC.classList.remove('is-on'); return; }
    gl.useProgram(veilProg.p);
    gl.bindVertexArray(veilTri);
    const u = veilProg.u;
    gl.uniform2f(u.uRes, veilC.width, veilC.height);
    gl.uniform1f(u.uT, t);
    gl.uniform1f(u.uK, (env.mobile() ? 0.62 : env.scale()) * dpr * 0.6);
    gl.uniform1f(u.uSeed, veilState.seed);
    gl.uniform1i(u.uMode, veilState.kind === 'sweep' ? 1 : 0);
    gl.uniform3f(u.uA, ...hexToRgb('#0a5fd0'));
    gl.uniform3f(u.uB, ...hexToRgb('#3cc8ff'));
    gl.uniform3f(u.uAccent, ...sky.accent);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function feedFluid(dt: number) {
    if (!fluid) return;
    if (mouse.moved && mouse.px > -1e3) {
      const dx = mouse.x - mouse.px;
      const dy = mouse.y - mouse.py;
      const m = Math.hypot(dx, dy);
      if (m > 0.5) {
        const f = mouse.down ? 9 : 4.5;
        const dye = Math.min(1, m / 60) * (mouse.down ? 0.16 : 0.07);
        fluid.splat(mouse.x / W, mouse.y / H, dx * f, dy * f, [dye * 0.85, dye * 0.95, dye], mouse.down ? 0.0016 : 0.001);
      }
    }
    mouse.px = mouse.x;
    mouse.py = mouse.y;
    mouse.moved = false;
    nextAmbient -= dt;
    if (nextAmbient <= 0) {
      nextAmbient = 1.4 + Math.random() * 1.8;
      const a = Math.random() * Math.PI * 2;
      const x = 0.1 + Math.random() * 0.8;
      fluid.splat(x, 0.1 + Math.random() * 0.35, Math.cos(a) * 140, Math.sin(a) * 60, [0.05, 0.06, 0.07], 0.004);
    }
    fluid.step(dt);
  }

  function frame(now: number) {
    raf = 0;
    if (!enabled) return;
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    time += dt;
    energy *= Math.exp(-dt * 2.2);
    for (let i = 0; i < 3; i++) {
      sky.top[i] += (sky.wantTop[i] - sky.top[i]) * Math.min(1, dt * 2);
      sky.accent[i] += (sky.wantAccent[i] - sky.accent[i]) * Math.min(1, dt * 2);
    }
    scn.fade = Math.min(1, scn.fade + dt / 0.7);
    scn.mix += (scn.wantMix - scn.mix) * Math.min(1, dt * 3);
    scn.wash += (scn.wantWash - scn.wash) * Math.min(1, dt * 3);
    const t0 = performance.now();
    stepSprings(dt);
    feedFluid(dt);
    drawBg();
    drawFoil(now);
    drawVeil(now);
    if (firstFrame) { firstFrame = false; root.classList.add('fx-on'); }
    // 프레임이 계속 무거우면 배경 해상도를 낮춘다(배경은 부드러워서 티가 덜 난다)
    const cost = performance.now() - t0;
    slowFrames = dt > 0.024 || cost > 12 ? slowFrames + 1 : Math.max(0, slowFrames - 1);
    if (slowFrames > 45 && quality > 0.3) { quality = Math.max(0.3, quality - 0.12); slowFrames = 0; resize(); }
    schedule();
  }
  function schedule() { if (enabled && !raf && !document.hidden) raf = requestAnimationFrame(frame); }
  document.addEventListener('visibilitychange', () => { last = performance.now(); schedule(); });

  const lost = (e: Event) => {
    e.preventDefault();
    console.warn('[fx] WebGL 컨텍스트를 잃어 CSS 화면으로 돌아갑니다');
    api.setEnabled(false);
    disabledForGood = true;
  };
  let disabledForGood = false;
  [bgC, foilC, veilC].forEach((c) => c.addEventListener('webglcontextlost', lost));

  const api: Fx = {
    get on() { return enabled; },
    burst(at, o = {}) {
      if (!enabled || !at) return;
      let x: number;
      let y: number;
      let size = o.size ?? 0;
      if (at instanceof Element) {
        const r = at.getBoundingClientRect();
        if (!r.width) return;
        x = r.left + r.width / 2; y = r.top + r.height / 2;
        size ||= Math.max(r.width, r.height) * 1.4;
      } else { x = at.x; y = at.y; }
      size ||= 220;
      if (bursts.length >= MAX_BURSTS) bursts.shift();
      bursts.push({ x, y, r: size, t0: performance.now(), ms: o.ms ?? 900, color: hexToRgb(o.color ?? '#45d3ff'), seed: Math.random() * 10 });
      energy = Math.min(1.5, energy + 0.6);
      if (fluid) {
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + Math.random();
          fluid.splat(x / W, y / H, Math.cos(a) * 420, Math.sin(a) * 420, [0.12, 0.14, 0.16], 0.0025);
        }
      }
      schedule();
    },
    transition(kind) {
      if (!enabled) return;
      if (kind === 'shatter' && env.noFlash()) kind = 'sweep';
      veilState = { kind, t0: performance.now(), ms: kind === 'shatter' ? 1050 : 620, seed: Math.random() * 50 };
      veilC.classList.add('is-on');
      energy = Math.min(1.5, energy + 0.4);
      schedule();
    },
    theme(chapter) {
      const [top, accent] = SKY[chapter] ?? SKY[1];
      sky.wantTop = hexToRgb(top);
      sky.wantAccent = hexToRgb(accent);
    },
    scene(url, o = {}) {
      scn.wantWash = o.wash ?? 0.3;
      scn.left = o.washLeft ? 1 : 0;
      if (!url) { scn.wantMix = 0; return; }
      scn.wantMix = o.mix ?? 1;
      if (url === scn.url) return;
      scn.url = url;
      void loadScene(url).then((t) => {
        if (!t || scn.url !== url) return;
        scn.prev = scn.cur;
        scn.cur = t;
        scn.fade = scn.prev ? 0 : 1;
        if (!scn.prev) scn.mix = 0;
        schedule();
      });
    },
    setEnabled(on) {
      if (disabledForGood) on = false;
      if (on === enabled) return;
      enabled = on;
      root.classList.toggle('fx-on', on && !firstFrame);
      [bgC, foilC, veilC].forEach((c) => { c.hidden = !on; });
      if (!on) {
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        for (const el of springs.keys()) { el.style.removeProperty('--rx'); el.style.removeProperty('--ry'); el.style.removeProperty('--lift'); }
        springs.clear();
        veilState = null;
        veilC.classList.remove('is-on');
      } else {
        last = performance.now();
        firstFrame = true;
        schedule();
      }
    },
  };
  schedule();
  return api;
}
