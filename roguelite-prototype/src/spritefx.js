'use strict';
// ───────── 도트 효과 시트 (pixelfx로 뽑은 스프라이트 시트)를 3D 장면에 띄우기 ─────────
// SHEETS는 빌드 때 fx/*.png + *.json 에서 만들어져요: { id: { src(dataURI), frames:[{x,y,w,h}], W, H, fps, loop, pivot:[px,py] } }
const SpriteFX = {
  tex: {}, mats: {}, live: [], MAX: 80, loader: null,
  // 효과별 기본값: 크기(월드 단위/픽셀), 혼합, 바닥에 눕힐지
  DEF: {
    'hit-spark': { scale: 2.0, add: true },
    'impact-sparks': { scale: 2.6, add: true },
    'parry': { scale: 1.3, add: true },
    'spark-arc': { scale: 1.1, add: true, cut: 12 },
    'electric-sparks': { scale: 1.6, add: true, loop: true },
  },
  init() {
    if (this.loader || typeof SHEETS === 'undefined' || !G3.ready) return;
    this.loader = new THREE.TextureLoader();
    for (const id in SHEETS) {
      const t = this.loader.load(SHEETS[id].src); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace; t.generateMipmaps = false;
      this.tex[id] = t;
      const d = this.DEF[id] || {};
      this.mats[id] = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, blending: d.add ? THREE.AdditiveBlending : THREE.NormalBlending, side: THREE.DoubleSide, toneMapped: false });
    }
  },
  // x,y 게임 좌표, h 높이, opts: { ang(게임 평면 각도), scale, flat(바닥에 눕힘), follow(따라갈 대상), until(살아 있을 조건), tint }
  spawn(id, x, y, h, opts) {
    if (!this.mats[id] || !G3.ready) return null; opts = opts || {};
    if (this.live.length >= this.MAX) this.kill(this.live[0]);
    const sh = SHEETS[id], d = this.DEF[id] || {}; const s = (opts.scale || 1) * (d.scale || 1);
    const geo = new THREE.PlaneGeometry(sh.frames[0].w * s, sh.frames[0].h * s);
    const mesh = new THREE.Mesh(geo, this.mats[id]);
    const [px, py] = sh.pivot; mesh.position.set((sh.frames[0].w / 2 - px) * s, (py - sh.frames[0].h / 2) * s, 0);
    const g = new THREE.Group(); g.add(mesh); G3.scene.add(g);
    const fx = { id, g, mesh, geo, t: 0, x, y, h: h || 0, ang: opts.ang, flat: !!opts.flat, follow: opts.follow, until: opts.until, flip: !!opts.flip, loop: opts.loop != null ? opts.loop : (d.loop || false), cut: opts.cut || d.cut || 0, fps: sh.fps, n: sh.frames.length, frame: -1 };
    this.live.push(fx); this.place(fx); this.setFrame(fx, 0);
    return fx;
  },
  setFrame(fx, i) {
    if (i === fx.frame) return; fx.frame = i;
    const sh = SHEETS[fx.id], f = sh.frames[i]; const u0 = f.x / sh.W, u1 = (f.x + f.w) / sh.W, v0 = 1 - (f.y + f.h) / sh.H, v1 = 1 - f.y / sh.H;
    const uv = fx.geo.attributes.uv; const a = fx.flip ? u1 : u0, b = fx.flip ? u0 : u1;
    uv.setXY(0, a, v1); uv.setXY(1, b, v1); uv.setXY(2, a, v0); uv.setXY(3, b, v0); uv.needsUpdate = true;
  },
  place(fx) {
    if (fx.follow) { fx.x = fx.follow.x; fx.y = fx.follow.y; }
    fx.g.position.set(fx.x, fx.h, fx.y);
    if (fx.flat) { fx.g.rotation.set(-Math.PI / 2, 0, -(fx.ang || 0)); }
    else {
      // 카메라를 바라보는 판. 방향이 있으면 화면상 각도만큼 판을 돌려요.
      fx.g.quaternion.copy(G3.cam.quaternion);
      if (fx.ang != null) { const a = proj(fx.x, fx.y, fx.h), b = proj(fx.x + Math.cos(fx.ang) * 50, fx.y + Math.sin(fx.ang) * 50, fx.h); const sa = Math.atan2(b.y - a.y, b.x - a.x); fx.g.rotateZ(-sa); }
    }
  },
  update(dt) {
    for (const fx of this.live.slice()) {
      fx.t += dt; const total = fx.cut || fx.n; let i = Math.floor(fx.t * fx.fps);
      if (fx.until && !fx.until()) { this.kill(fx); continue; }
      if (i >= total) { if (fx.loop) i = i % total; else { this.kill(fx); continue; } }
      this.setFrame(fx, i); this.place(fx);
    }
  },
  kill(fx) { G3.scene.remove(fx.g); fx.geo.dispose(); const i = this.live.indexOf(fx); if (i >= 0) this.live.splice(i, 1); },
  clear() { for (const fx of this.live.slice()) this.kill(fx); },
  // 전투 이벤트용 묶음
  hit(e, ang, crit, heavy) {
    const s = crit ? 1.35 : heavy ? 1.2 : 1;
    this.spawn('hit-spark', e.x, e.y, e.r * 0.9, { ang, scale: s });
    if (crit || heavy) this.spawn('impact-sparks', e.x, e.y, e.r, { ang, scale: crit ? 1.2 : 0.9 });
  },
  parry(x, y, gold) { this.spawn('parry', x, y, 26, { scale: gold ? 1.6 : 1.1 }); },
  bolt(x, y, h) { this.spawn('spark-arc', x, y, h || 10, { scale: 0.9 }); },
  shock(e) { if (e._shockFx && this.live.includes(e._shockFx)) return; e._shockFx = this.spawn('electric-sparks', e.x, e.y, e.r * 1.1, { follow: e, until: () => !e.dead && e.shocked > 0 }); },
};
window.SpriteFX = SpriteFX;
