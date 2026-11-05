'use strict';
// ───────── 3D 쿼터뷰 그레이박스 렌더러 (three.js) ─────────
// 전투 로직은 2D 평면(x, y) 그대로 두고, 그릴 때만 x→x, y→z 로 올려요. 바닥에 붙는 것(예고, 판정, 자국)은
// 아레나 크기의 캔버스에 2D로 그린 뒤 바닥 텍스처로 깔고, 공중 연출(파티클·글자)은 화면으로 투영해 2D 캔버스에 그려요.
const gl = document.getElementById('g');
const G3 = {
  ready: false, arena: null, renderer: null, scene: null, cam: null, world: null, sun: null,
  dyn: null, dynCx: null, dynTex: null, stat: null, statCx: null, statTex: null, decTex: null, decDirty: true, puddleKey: '',
  enemyMeshes: new Map(), projMeshes: new Map(), player: null, sword: null, trail: [], ghost: [],
  pitch: 50 * Math.PI / 180, dist: 1100, fov: 36, DYN: 0.5,
  // 화면에 보이는 바닥 범위 (가로 폭, 카메라 중심에서 위쪽(먼 곳)·아래쪽(가까운 곳) 거리)
  span() { const v = this.fov * Math.PI / 180, hf = Math.atan(Math.tan(v / 2) * W / H); const hgt = this.dist * Math.sin(this.pitch); return { w: 2 * this.dist * Math.tan(hf), far: hgt * (1 / Math.tan(this.pitch - v / 2) - 1 / Math.tan(this.pitch)), near: hgt * (1 / Math.tan(this.pitch) - 1 / Math.tan(this.pitch + v / 2)) }; },
  tmp: new THREE.Vector3(), mats: {}, geos: {},
};
const COLMAP = { white: '#ffffff', gold: '#ffd27a', red: '#ff4a4a' };

function initG3() {
  const r = new THREE.WebGLRenderer({ canvas: gl, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  r.setSize(W, H, false); r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap; r.setClearColor(0x0c0b10, 1);
  G3.renderer = r;
  G3.scene = new THREE.Scene(); G3.scene.fog = new THREE.Fog(0x0c0b10, 2200, 3600);
  G3.cam = new THREE.PerspectiveCamera(G3.fov, W / H, 20, 7000);
  G3.scene.add(new THREE.HemisphereLight(0x9a97b4, 0x15131c, 1.1));
  const sun = new THREE.DirectionalLight(0xfff1dc, 1.6); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera; sc.left = -1500; sc.right = 1500; sc.top = 1100; sc.bottom = -1100; sc.near = 10; sc.far = 5000; sun.shadow.bias = -0.0008;
  G3.sun = sun; G3.scene.add(sun); G3.scene.add(sun.target);
  G3.world = new THREE.Group(); G3.scene.add(G3.world);
  // 아레나 밖 바닥 (어둡게)
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(12000, 12000), new THREE.MeshStandardMaterial({ color: 0x07060a, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -40; G3.scene.add(ground); G3.ground = ground;
  G3.ready = true;
}
const mat = (col, opt) => new THREE.MeshStandardMaterial(Object.assign({ color: new THREE.Color(col), roughness: 0.75, metalness: 0.05 }, opt || {}));
function canvasTex(c) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
function disposeGroup(g) { g.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material.map && o.material.map !== G3.decTex) o.material.map.dispose(); if (o.material) o.material.dispose(); }); }

// ── 아레나 그레이박스 만들기 (층 시작마다)
function buildArena() {
  const A = World.arena, th = TIERS[Run.tier - 1];
  if (G3.world) { disposeGroup(G3.world); G3.scene.remove(G3.world); }
  G3.world = new THREE.Group(); G3.scene.add(G3.world);
  G3.enemyMeshes.forEach(m => G3.scene.remove(m)); G3.enemyMeshes.clear();
  G3.projMeshes.forEach(m => G3.scene.remove(m)); G3.projMeshes.clear();
  G3.arena = A; SpriteFX.clear();
  // 바닥 정적 레이어 (바닥색, 격자, 테두리, 웅덩이)
  G3.stat = document.createElement('canvas'); G3.stat.width = A.w; G3.stat.height = A.h; G3.statCx = G3.stat.getContext('2d');
  G3.statTex = canvasTex(G3.stat); G3.puddleKey = ''; paintStatic();
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(A.w, A.h), new THREE.MeshStandardMaterial({ map: G3.statTex, roughness: 0.95 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(A.w / 2, 0, A.h / 2); floor.receiveShadow = true; G3.world.add(floor);
  // 바닥 자국 레이어 (World.decal)
  G3.decTex = canvasTex(World.decal); G3.decDirty = true;
  const dec = new THREE.Mesh(new THREE.PlaneGeometry(A.w, A.h), new THREE.MeshBasicMaterial({ map: G3.decTex, transparent: true, depthWrite: false }));
  dec.rotation.x = -Math.PI / 2; dec.position.set(A.w / 2, 0.6, A.h / 2); G3.world.add(dec);
  // 바닥 동적 레이어 (예고선, 판정, 표식) — 절반 해상도
  G3.dyn = document.createElement('canvas'); G3.dyn.width = Math.round(A.w * G3.DYN); G3.dyn.height = Math.round(A.h * G3.DYN); G3.dynCx = G3.dyn.getContext('2d');
  G3.dynTex = canvasTex(G3.dyn);
  const dyn = new THREE.Mesh(new THREE.PlaneGeometry(A.w, A.h), new THREE.MeshBasicMaterial({ map: G3.dynTex, transparent: true, depthWrite: false }));
  dyn.rotation.x = -Math.PI / 2; dyn.position.set(A.w / 2, 1.2, A.h / 2); G3.world.add(dyn);
  // 벽 (그레이박스)
  const wallM = mat('#2b2834', { roughness: 0.9 }), capM = mat(th.accent, { roughness: 0.6 });
  const wh = 120, wt = 70;
  const walls = [[A.w / 2, -wt / 2, A.w + wt * 2, wt], [A.w / 2, A.h + wt / 2, A.w + wt * 2, wt], [-wt / 2, A.h / 2, wt, A.h], [A.w + wt / 2, A.h / 2, wt, A.h]];
  for (const [x, z, sx, sz] of walls) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, wh, sz), wallM); m.position.set(x, wh / 2, z); m.castShadow = true; m.receiveShadow = true; G3.world.add(m);
    const c = new THREE.Mesh(new THREE.BoxGeometry(sx + 4, 6, sz + 4), capM); c.position.set(x, wh + 3, z); G3.world.add(c);
  }
  // 기둥
  for (const pl of A.pillars) {
    const g = new THREE.Mesh(new THREE.CylinderGeometry(pl.r * 0.9, pl.r, 170, 20), mat('#4b4757')); g.position.set(pl.x, 85, pl.y); g.castShadow = true; g.receiveShadow = true; G3.world.add(g);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(pl.r * 1.05, pl.r * 0.9, 14, 20), mat('#5a566a')); top.position.set(pl.x, 177, pl.y); top.castShadow = true; G3.world.add(top);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(pl.r * 1.2, pl.r * 1.3, 12, 20), mat('#3a3744')); base.position.set(pl.x, 6, pl.y); base.receiveShadow = true; G3.world.add(base);
  }
  // 해 (그림자) 위치
  G3.sun.position.set(A.w / 2 - 700, 1300, A.h / 2 + 500); G3.sun.target.position.set(A.w / 2, 0, A.h / 2); G3.sun.target.updateMatrixWorld();
  G3.ground.position.set(A.w / 2, -40, A.h / 2);
  // 플레이어
  if (!G3.player) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(14, 18, 6, 14), mat('#4fd1c5')); body.position.y = 14 + 9; body.castShadow = true; g.add(body); g.userData.body = body;
    const head = new THREE.Mesh(new THREE.SphereGeometry(8, 12, 10), mat('#e8fffb')); head.position.set(6, 44, 0); g.add(head); g.userData.head = head;
    const sw = new THREE.Group(); const blade = new THREE.Mesh(new THREE.BoxGeometry(44, 3, 7), mat('#e9eef7', { metalness: 0.5, roughness: 0.3 })); blade.position.set(34, 0, 0); blade.castShadow = true; sw.add(blade);
    const guard = new THREE.Mesh(new THREE.BoxGeometry(4, 10, 14), mat('#ffd27a')); guard.position.set(12, 0, 0); sw.add(guard);
    sw.position.set(0, 24, 0); g.add(sw); g.userData.sword = sw;
    const cring = new THREE.Mesh(new THREE.TorusGeometry(26, 2, 6, 32), new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.8 })); cring.rotation.x = -Math.PI / 2; cring.position.y = 2; cring.visible = false; g.add(cring); g.userData.cring = cring;
    G3.player = g; G3.scene.add(g);
    for (let i = 0; i < 8; i++) { const gh = new THREE.Mesh(body.geometry, new THREE.MeshBasicMaterial({ color: 0x7fe0ff, transparent: true, opacity: 0.3, depthWrite: false })); gh.visible = false; G3.scene.add(gh); G3.ghost.push(gh); }
  }
}
function paintStatic() {
  const A = G3.arena, th = TIERS[Run.tier - 1], g = G3.statCx;
  g.fillStyle = th.floor; g.fillRect(0, 0, A.w, A.h);
  g.strokeStyle = th.line; g.lineWidth = 2; g.beginPath();
  for (let x = 0; x <= A.w; x += 80) { g.moveTo(x, 0); g.lineTo(x, A.h); }
  for (let y = 0; y <= A.h; y += 80) { g.moveTo(0, y); g.lineTo(A.w, y); }
  g.stroke();
  // 큰 바닥판 느낌 (그레이박스 타일)
  g.fillStyle = 'rgba(255,255,255,0.025)'; for (let x = 0; x < A.w; x += 160) for (let y = 0; y < A.h; y += 160) if (((x + y) / 160) % 2 === 0) g.fillRect(x, y, 160, 160);
  g.strokeStyle = th.accent; g.lineWidth = 10; g.strokeRect(5, 5, A.w - 10, A.h - 10);
  for (const pd of A.puddles) {
    g.fillStyle = pd.kind === 'water' ? 'rgba(70,140,200,0.45)' : pd.used ? 'rgba(20,10,8,0.7)' : 'rgba(60,40,20,0.85)';
    g.beginPath(); g.ellipse(pd.x, pd.y, pd.r, pd.r * 0.8, 0, 0, Math.PI * 2); g.fill();
    if (!pd.used) { g.strokeStyle = pd.kind === 'water' ? 'rgba(140,200,255,0.5)' : 'rgba(160,110,50,0.6)'; g.lineWidth = 3; g.stroke(); }
  }
  G3.statTex.needsUpdate = true;
}

// ── 투영: 게임 좌표(x, y, 높이 h) → 화면 좌표
function proj(x, y, h) {
  const d = G3.cam.position.distanceTo(G3.tmp.set(x, h || 0, y));
  const v = G3.tmp.project(G3.cam);
  return { x: (v.x + 1) / 2 * W, y: (1 - v.y) / 2 * H, s: G3.dist / Math.max(1, d), behind: v.z > 1 };
}
function screenToWorld(sx, sy) {
  if (!G3.ready) return { x: Cam.x, y: Cam.y };
  const nd = new THREE.Vector3(sx / W * 2 - 1, -(sy / H * 2 - 1), 0.5).unproject(G3.cam);
  const o = G3.cam.position, d = nd.sub(o).normalize(); const t = -o.y / d.y;
  return { x: o.x + d.x * t, y: o.z + d.z * t };
}
function placeCam() {
  const z = 1 + Juice.zoom * 1.6, sh = Juice.shake;
  const dist = G3.dist / z;
  const ox = (R() - 0.5) * sh * 0.8 + Juice.kx, oz = ((R() - 0.5) * sh * 0.8 + Juice.ky) * 1.3;
  const cxw = Cam.x + ox, czw = Cam.y + oz;
  G3.cam.position.set(cxw, dist * Math.sin(G3.pitch), czw + dist * Math.cos(G3.pitch));
  G3.cam.lookAt(cxw, 0, czw);
  G3.cam.updateMatrixWorld(); G3.cam.updateProjectionMatrix();
}

// ── 바닥 동적 레이어: 예고선, 판정, 표식, 플레이어 공격 범위
function paintDynamic() {
  const A = G3.arena, g = G3.dynCx; g.setTransform(G3.DYN, 0, 0, G3.DYN, 0, 0); g.clearRect(0, 0, A.w, A.h);
  for (const m of World.marks) { const k = 1 - m.t / m.max; g.strokeStyle = m.col; g.globalAlpha = 0.4 + k * 0.6; g.lineWidth = 4; g.beginPath(); g.arc(m.x, m.y, 34 - k * 14, 0, Math.PI * 2); g.stroke(); }
  g.globalAlpha = 1;
  for (const e of World.enemies) {
    if (e.dead) continue;
    const t = e.atk && e.atk.phase === 'tele' && !e.atk.noFlash ? e.atk : null;
    if (t) { const c = COLMAP[t.color]; const pulse = 0.6 + Math.sin(performance.now() / 40) * 0.4; g.strokeStyle = c; g.globalAlpha = 0.8; g.lineWidth = 6 * pulse + 2; g.beginPath(); g.arc(e.x, e.y, e.r + 12, 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1; }
    if (e.chill > 0) { g.strokeStyle = '#7fd8ff'; g.lineWidth = 3; for (let i = 0; i < e.chill; i++) { g.beginPath(); g.arc(e.x, e.y, e.r + 6 + i * 4, 0, Math.PI * 2 * 0.2); g.stroke(); } }
    if (!e.atk || e.atk.phase !== 'tele') continue;
    const k = e.atk, p = clamp(k.t / k.tele, 0, 1);
    g.globalAlpha = 0.18 + p * 0.3; g.fillStyle = COLMAP[k.color] || '#fff'; g.strokeStyle = COLMAP[k.color] || '#fff'; g.lineWidth = 3;
    if (k.name === 'slam') { const r = e.boss ? 240 : 150; g.beginPath(); g.arc(e.x, e.y, r * p, 0, Math.PI * 2); g.fill(); g.beginPath(); g.arc(e.x, e.y, r, 0, Math.PI * 2); g.stroke(); }
    if (k.name === 'boom') { g.beginPath(); g.arc(e.x, e.y, 115 * p, 0, Math.PI * 2); g.fill(); g.beginPath(); g.arc(e.x, e.y, 115, 0, Math.PI * 2); g.stroke(); }
    if (k.name === 'sweep') { g.save(); g.translate(e.x, e.y); g.rotate(k.ang); g.fillRect(0, -50, 800 * p, 100); g.strokeRect(0, -50, 800, 100); g.restore(); }
    if (k.name === 'charge' || k.name === 'lunge') { g.save(); g.translate(e.x, e.y); g.rotate(k.ang); g.fillRect(0, -e.r * 0.6, (k.name === 'charge' ? 440 : 150) * p, e.r * 1.2); g.restore(); }
    if (k.name === 'swing' || k.name === 'combo') { const rg = e.r + (e.boss ? 120 : 110); g.beginPath(); g.moveTo(e.x, e.y); g.arc(e.x, e.y, rg, k.ang - 1.15, k.ang + 1.15); g.closePath(); g.globalAlpha = 0.08 + p * 0.22; g.fill(); }
    if (k.name === 'poke') { g.save(); g.translate(e.x, e.y); g.rotate(e.face); g.fillRect(0, -20, 120 * p, 40); g.restore(); }
    g.globalAlpha = 1;
  }
  for (const hh of World.hits) {
    const e = hh.src, x = hh.follow ? e.x : hh.x, y = hh.follow ? e.y : hh.y; if (x == null) continue;
    g.globalAlpha = 0.35; g.fillStyle = COLMAP[hh.color];
    if (hh.shape === 'circle' || hh.shape === 'body') { g.beginPath(); g.arc(x, y, hh.r, 0, Math.PI * 2); g.fill(); }
    if (hh.shape === 'arc') { g.beginPath(); g.moveTo(x, y); g.arc(x, y, hh.range, hh.ang - hh.arc / 2, hh.ang + hh.arc / 2); g.closePath(); g.fill(); }
    if (hh.shape === 'line') { g.save(); g.translate(x, y); g.rotate(hh.ang); g.fillRect(0, -hh.w / 2, hh.len, hh.w); g.restore(); }
  }
  g.globalAlpha = 1;
  // 플레이어
  const a = P.act;
  if (P.counterT > 0) { g.strokeStyle = '#ffd27a'; g.lineWidth = 4; g.globalAlpha = 0.5 + P.counterT; g.beginPath(); g.arc(P.x, P.y, P.r + 14, 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1; }
  if (a && a.type === 'swing' && a.phase === 'active') { const sw = a.sw; g.fillStyle = a.counter ? 'rgba(255,210,122,0.5)' : 'rgba(230,245,255,0.4)'; g.beginPath(); g.moveTo(P.x, P.y); g.arc(P.x, P.y, sw.range + P.r, a.ang - sw.arc / 2, a.ang + sw.arc / 2); g.closePath(); g.fill(); }
  if (a && a.type === 'thrust' && a.t <= 0.24) { // 대시 공격 판정: 지나온 경로 띠
    const tx = P.x + Math.cos(a.ang) * a.reach, ty = P.y + Math.sin(a.ang) * a.reach;
    g.strokeStyle = a.counter ? 'rgba(255,210,122,0.45)' : 'rgba(200,240,255,0.42)'; g.lineWidth = a.halfW * 2; g.lineCap = 'butt';
    g.beginPath(); g.moveTo(a.x0, a.y0); g.lineTo(tx, ty); g.stroke(); g.lineCap = 'butt'; }
  if (a && a.type === 'spin') { g.strokeStyle = 'rgba(220,240,255,0.7)'; g.lineWidth = 12; g.beginPath(); g.arc(P.x, P.y, 140, a.t * 30, a.t * 30 + 4.5); g.stroke(); }
  if (a && a.type === 'parry') { g.strokeStyle = '#ffffff'; g.lineWidth = 8; g.beginPath(); g.arc(P.x, P.y, P.r + 18, P.face - 1.3, P.face + 1.3); g.stroke(); }
  if (a && a.type === 'parryWhiff') { g.strokeStyle = 'rgba(255,120,120,0.6)'; g.lineWidth = 4; g.beginPath(); g.arc(P.x, P.y, P.r + 16, 0, Math.PI * 2); g.stroke(); }
  G3.dynTex.needsUpdate = true;
}

// ── 적 도형 (종류별 그레이박스)
function makeEnemyMesh(e) {
  const g = new THREE.Group(); const r = e.r; const m = mat(e.def.col); g.userData.mat = m; g.userData.baseCol = new THREE.Color(e.def.col);
  let body;
  if (e.boss) { body = new THREE.Mesh(new THREE.CapsuleGeometry(r * 0.85, r * 1.5, 6, 18), m); body.position.y = r * 0.85 + r * 0.75;
    const crown = new THREE.Mesh(new THREE.TorusGeometry(r * 0.6, r * 0.1, 8, 20), mat('#ffffff', { emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.4 })); crown.rotation.x = Math.PI / 2; crown.position.y = r * 3.15; g.add(crown); }
  else if (e.type === 'wisp') { body = new THREE.Mesh(new THREE.OctahedronGeometry(r, 0), mat(e.def.col, { emissive: new THREE.Color(e.def.col), emissiveIntensity: 0.6 })); g.userData.mat = body.material; body.position.y = r + 18; g.userData.float = true; }
  else if (e.type === 'brute') { body = new THREE.Mesh(new THREE.BoxGeometry(r * 1.7, r * 2.3, r * 1.7), m); body.position.y = r * 1.15; }
  else if (e.type === 'bomber') { body = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), m); body.position.y = r;
    const fuse = new THREE.Mesh(new THREE.ConeGeometry(4, 12, 8), mat('#ff5a2a', { emissive: new THREE.Color('#ff5a2a'), emissiveIntensity: 0.8 })); fuse.position.y = r * 2 + 6; g.add(fuse); }
  else if (e.type === 'healer') { body = new THREE.Mesh(new THREE.ConeGeometry(r, r * 2.6, 14), m); body.position.y = r * 1.3; }
  else if (e.type === 'merchant') { body = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), mat(e.def.col, { metalness: 0.6, roughness: 0.3 })); g.userData.mat = body.material; body.position.y = r + 6; g.userData.float = true; }
  else { body = new THREE.Mesh(new THREE.CapsuleGeometry(r * 0.8, r * 1.2, 5, 14), m); body.position.y = r * 0.8 + r * 0.6; }
  body.castShadow = true; g.add(body); g.userData.body = body;
  // 얼굴 (눈)
  const eye = new THREE.Mesh(new THREE.SphereGeometry(r * 0.22, 8, 6), mat('#16131c')); eye.position.set(r * 0.75, body.position.y + r * 0.3, 0); g.add(eye);
  if (e.def.shield) { const sh = new THREE.Mesh(new THREE.BoxGeometry(5, r * 1.8, r * 2.2), mat('#d8e4f4', { metalness: 0.4, roughness: 0.4 })); sh.position.set(r + 6, body.position.y, 0); sh.castShadow = true; g.add(sh); g.userData.shield = sh; }
  if (e.elite || e.boss) { const ring = new THREE.Mesh(new THREE.TorusGeometry(r + 10, 3, 6, 36), new THREE.MeshBasicMaterial({ color: e.boss ? 0xffffff : 0xffd27a })); ring.rotation.x = -Math.PI / 2; ring.position.y = 2; g.add(ring); }
  if (e.chief) { const c = new THREE.Mesh(new THREE.ConeGeometry(r * 0.4, r * 0.6, 4), mat('#ffd27a', { emissive: new THREE.Color('#ffd27a'), emissiveIntensity: 0.5 })); c.position.y = body.position.y + r * 1.5; g.add(c); }
  g.userData.h = body.position.y * 2;
  return g;
}
function syncEnemies() {
  const seen = new Set();
  for (const e of World.enemies) {
    if (e.dead) continue; seen.add(e);
    let g = G3.enemyMeshes.get(e); if (!g) { g = makeEnemyMesh(e); G3.scene.add(g); G3.enemyMeshes.set(e, g); }
    const t = e.atk && e.atk.phase === 'tele' && !e.atk.noFlash ? e.atk : null;
    const shx = e.shk > 0 ? (R() - 0.5) * 10 * e.shk / 0.15 : 0, shz = e.shk > 0 ? (R() - 0.5) * 10 * e.shk / 0.15 : 0;
    const wind = t ? 1 + 0.14 * clamp(t.t / t.tele, 0, 1) : 1; const sq = e.sqK || 0;
    g.position.set(e.x + shx, g.userData.float ? Math.sin(performance.now() / 300 + e.x) * 6 : 0, e.y + shz);
    g.scale.set((1 + sq) * wind, (1 - sq * 0.7) * wind, (1 + sq) * wind);
    g.rotation.y = -e.face;
    const m = g.userData.mat;
    if (e.flash > 0) { m.emissive.set(0xffffff); m.emissiveIntensity = 1; m.color.set(0xffffff); }
    else if (e.frozen > 0) { m.color.set(0xbfefff); m.emissive.set(0x7fd8ff); m.emissiveIntensity = 0.3; }
    else if (e.groggy > 0) { m.color.copy(g.userData.baseCol); m.emissive.set(0xffd27a); m.emissiveIntensity = 0.5 + Math.sin(performance.now() / 90) * 0.3; }
    else if (t) { m.color.copy(g.userData.baseCol); m.emissive.set(COLMAP[t.color]); m.emissiveIntensity = 0.25 + Math.sin(performance.now() / 40) * 0.2; }
    else { m.color.copy(g.userData.baseCol); if (g.userData.float) { m.emissive.copy(g.userData.baseCol); m.emissiveIntensity = 0.6; } else { m.emissive.set(0x000000); m.emissiveIntensity = 0; } }
    if (g.userData.shield) g.userData.shield.visible = !!e.shieldUp;
    if (e.groggy > 0) g.rotation.z = 0.35 * Math.sin(performance.now() / 200); else g.rotation.z = 0;
    if (e.burn > 0 && R() < 0.4) FX.parts.push({ x: e.x + (R() - 0.5) * e.r, y: e.y + (R() - 0.5) * e.r, h: e.r, vx: 0, vy: 0, vh: 90, life: 0.4, max: 0.4, col: '#ff8a3d', size: 4 + e.burn });
    if (e.shocked > 0) SpriteFX.shock(e);
    if (e.shocked > 0 && R() < 0.15) World.bolts.push({ x1: e.x - e.r, y1: e.y, x2: e.x + e.r, y2: e.y + (R() - 0.5) * e.r, h: e.r, life: 0.06 });
  }
  for (const [e, g] of G3.enemyMeshes) if (!seen.has(e)) { G3.scene.remove(g); disposeGroup(g); G3.enemyMeshes.delete(e); }
}
function syncProjs() {
  const seen = new Set();
  for (const p of World.projs) {
    seen.add(p); let m = G3.projMeshes.get(p);
    if (!m) {
      m = new THREE.Mesh(p.wave ? new THREE.SphereGeometry(1, 12, 8) : new THREE.SphereGeometry(p.r, 12, 10), new THREE.MeshStandardMaterial({ color: new THREE.Color(p.col), emissive: new THREE.Color(p.col), emissiveIntensity: 0.9, roughness: 0.4 }));
      if (p.wave) m.scale.set(28, 8, 14); m.castShadow = !p.wave; G3.scene.add(m); G3.projMeshes.set(p, m);
    }
    m.position.set(p.x, p.wave ? 22 : 26, p.y); m.rotation.y = -Math.atan2(p.vy, p.vx);
  }
  for (const [p, m] of G3.projMeshes) if (!seen.has(p)) { G3.scene.remove(m); m.geometry.dispose(); m.material.dispose(); G3.projMeshes.delete(p); }
}
function syncPlayer() {
  const g = G3.player, a = P.act;
  g.visible = P.alive || World.clearT >= 0;
  g.position.set(P.x, 0, P.y);
  const sq = P.sqK || 0; g.scale.set(1 + sq, 1 - sq * 0.6, 1 + sq);
  g.rotation.y = -(P.face || 0);
  const fa = a && a.ang != null ? a.ang : P.face; g.userData.sword.rotation.y = -(fa - P.face);
  g.userData.sword.position.x = 0;
  if (a && a.type === 'swing') { const k = a.phase === 'wind' ? -0.9 : a.phase === 'active' ? 0.5 : 0.2; g.userData.sword.rotation.z = a.act === 'a3' ? -0.6 + k * 0.4 : 0; g.userData.sword.rotation.y += a.phase === 'wind' ? 1.1 : a.phase === 'active' ? -0.9 : -0.3; if (a.drag > 0) { g.userData.sword.rotation.y += 0.35 + (Math.random() - 0.5) * 0.12; g.userData.sword.rotation.x = (Math.random() - 0.5) * 0.1; } else g.userData.sword.rotation.x = 0; }
  else if (a && a.type === 'thrust') { g.userData.sword.rotation.y = 0; g.userData.sword.rotation.z = 0; g.userData.sword.position.x = a.t < 0.12 ? 14 : 0; }
  else if (a && a.type === 'spin') { g.userData.sword.rotation.y = -a.t * 30; }
  else if (a && a.type === 'parry') { g.userData.sword.rotation.z = 1.1; g.userData.sword.rotation.y = 0.5; }
  else { g.userData.sword.rotation.z = 0; }
  const bm = g.userData.body.material; bm.color.set(P.hurtT > 0 ? '#ff8a8a' : P.counterT > 0 ? '#ffe2a0' : '#4fd1c5');
  bm.emissive.set(P.perfect ? '#9ffcff' : P.counterT > 0 ? '#ffd27a' : P.iframe > 0 ? '#7fe0ff' : '#000000'); bm.emissiveIntensity = P.perfect ? 0.45 + Math.sin(performance.now() / 70) * 0.2 : P.counterT > 0 ? 0.5 : P.iframe > 0 ? 0.35 : 0;
  g.userData.cring.visible = P.counterT > 0; g.userData.cring.scale.setScalar(1 + (1 - clamp(P.counterT / 0.6, 0, 1)) * 0.4);
  const tr = P.trail || [];
  for (let i = 0; i < G3.ghost.length; i++) { const gh = G3.ghost[i], t = tr[tr.length - 1 - i]; if (!t) { gh.visible = false; continue; } gh.visible = true; gh.position.set(t.x, 23, t.y); gh.material.opacity = t.life / t.max * 0.35; gh.scale.setScalar(0.8 + 0.2 * t.life / t.max); }
}

// ── 공중 연출: 파티클·글자·궤적을 화면에 투영해서 2D 캔버스에 그리기
function drawFX3() {
  const h0 = 6;
  for (const s of FX.slashes) {
    const k = s.life / s.max, x = s.follow ? s.follow.x : s.x, y = s.follow ? s.follow.y : s.y;
    const a0 = s.ang - s.arc / 2, a1 = s.ang + s.arc / 2, sweep = (1 - k) * 0.25;
    cx.save(); cx.globalAlpha = Math.min(1, k * 1.6); cx.strokeStyle = s.col; cx.lineCap = 'round'; cx.shadowColor = s.col; cx.shadowBlur = 16;
    for (let i = 0; i < 3; i++) {
      const rr = s.r - i * s.w * 0.35; cx.beginPath();
      for (let j = 0; j <= 14; j++) { const an = lerp(a0 + sweep, a1 + sweep, j / 14); const q = proj(x + Math.cos(an) * rr, y + Math.sin(an) * rr, 30 + i * 3); if (j === 0) { cx.moveTo(q.x, q.y); cx.lineWidth = s.w * (1 - i * 0.3) * (0.4 + k * 0.6) * q.s; } else cx.lineTo(q.x, q.y); }
      cx.stroke();
    }
    cx.restore();
  }
  for (const p of FX.shards) {
    const q = proj(p.x, p.y, p.h || 4); cx.save(); cx.globalAlpha = clamp(p.life / 0.3, 0, 1); cx.translate(q.x, q.y); cx.scale(q.s, q.s * 0.7); cx.rotate(p.rot); cx.fillStyle = p.col;
    cx.beginPath(); cx.moveTo(-p.size, -p.size * 0.6); cx.lineTo(p.size, 0); cx.lineTo(-p.size * 0.4, p.size * 0.7); cx.closePath(); cx.fill(); cx.restore();
  }
  for (const r of FX.rings) {
    const k = 1 - r.life / r.max, rr = lerp(r.r0, r.r1, k);
    cx.globalAlpha = 1 - k; cx.strokeStyle = r.col; cx.beginPath();
    for (let j = 0; j <= 40; j++) { const an = j / 40 * Math.PI * 2; const q = proj(r.x + Math.cos(an) * rr, r.y + Math.sin(an) * rr, 3); if (j === 0) { cx.moveTo(q.x, q.y); cx.lineWidth = (r.w * (1 - k) + 1) * q.s; } else cx.lineTo(q.x, q.y); }
    cx.stroke();
  }
  for (const p of FX.parts) {
    const q = proj(p.x, p.y, p.h != null ? p.h : h0); cx.globalAlpha = clamp(p.life / p.max, 0, 1); cx.fillStyle = p.col; cx.strokeStyle = p.col;
    if (p.line) { const q2 = proj(p.x - p.vx * 0.03, p.y - p.vy * 0.03, p.h != null ? p.h : h0); cx.lineWidth = p.size * 0.6 * q.s; cx.beginPath(); cx.moveTo(q.x, q.y); cx.lineTo(q2.x, q2.y); cx.stroke(); }
    else { const sz = p.size * q.s; cx.fillRect(q.x - sz / 2, q.y - sz / 2, sz, sz); }
  }
  for (const b of World.bolts) {
    const q1 = proj(b.x1, b.y1, b.h || 24), q2 = proj(b.x2, b.y2, b.h || 24);
    cx.strokeStyle = b.col || '#ffe45c'; cx.lineWidth = 3; cx.globalAlpha = clamp(b.life / 0.15, 0, 1); cx.beginPath(); cx.moveTo(q1.x, q1.y);
    const n = 6; for (let i = 1; i < n; i++) cx.lineTo(lerp(q1.x, q2.x, i / n) + (R() - 0.5) * 20, lerp(q1.y, q2.y, i / n) + (R() - 0.5) * 20);
    cx.lineTo(q2.x, q2.y); cx.stroke();
  }
  cx.globalAlpha = 1; cx.textAlign = 'center';
  for (const t of FX.texts) {
    const q = proj(t.x, t.y, 70 + (t.y0 == null ? 0 : 0)); const a = clamp(t.life / t.max * 1.6, 0, 1); cx.globalAlpha = a;
    const pop = 1 + Math.max(0, 0.12 - (t.age || 0)) / 0.12 * (t.big ? 0.9 : 0.6);
    cx.font = `900 ${Math.round((t.big ? 34 : 22) * pop * q.s)}px "Pretendard", "Noto Sans KR", sans-serif`;
    cx.lineWidth = 5; cx.strokeStyle = '#0b0b10'; cx.strokeText(t.s, q.x, q.y); cx.fillStyle = t.col; cx.fillText(t.s, q.x, q.y);
  }
  cx.globalAlpha = 1;
}
// 적 머리 위 표시 (체력·체간·그로기·낙인·섬광 느낌표)
function drawEnemyTags() {
  for (const e of World.enemies) {
    if (e.dead) continue; const g = G3.enemyMeshes.get(e); const top = g ? g.userData.h + 8 : e.r * 2;
    const t = e.atk && e.atk.phase === 'tele' && !e.atk.noFlash ? e.atk : null;
    if (t) { const q = proj(e.x, e.y, top + 26); cx.fillStyle = COLMAP[t.color]; cx.font = `900 ${Math.round(30 * q.s)}px sans-serif`; cx.textAlign = 'center'; cx.shadowColor = COLMAP[t.color]; cx.shadowBlur = 16; cx.fillText('!', q.x, q.y); cx.shadowBlur = 0; }
    if (e.brand) { const q = proj(e.x, e.y, 2); cx.fillStyle = '#ff5bd1'; for (let i = 0; i < e.brand; i++) { cx.beginPath(); cx.arc(q.x - 8 + i * 8, q.y + e.r * 0.5 * q.s, 3, 0, Math.PI * 2); cx.fill(); } }
    if (e.groggy > 0) { const q = proj(e.x, e.y, top + 16); cx.fillStyle = '#ffd27a'; cx.font = '900 20px sans-serif'; cx.textAlign = 'center'; for (let i = 0; i < 3; i++) { const a = performance.now() / 300 + i * 2.1; cx.fillText('★', q.x + Math.cos(a) * e.r * q.s, q.y + Math.sin(a) * 6); } }
    if (e.type === 'merchant') { const q = proj(e.x, e.y, top + 14); cx.fillStyle = '#ffffff'; cx.font = '900 18px sans-serif'; cx.textAlign = 'center'; cx.fillText('◈', q.x, q.y); }
    if (!e.boss && (e.hp < e.maxHp || e.stanceMax)) {
      const q = proj(e.x, e.y, top + 10); const w = Math.max(44, e.r * 2.4) * q.s, x = q.x - w / 2, y = q.y;
      cx.fillStyle = '#000a'; cx.fillRect(x, y, w, 5); cx.fillStyle = e.elite ? '#ff7a6a' : '#e05555'; cx.fillRect(x, y, w * clamp(e.hp / e.maxHp, 0, 1), 5);
      if (e.stanceMax) { cx.fillStyle = '#000a'; cx.fillRect(x, y + 7, w, 4); cx.fillStyle = e.groggy > 0 ? '#fff' : '#ffd27a'; cx.fillRect(x, y + 7, w * (e.groggy > 0 ? 1 : e.stance / e.stanceMax), 4); }
    }
  }
}

// ── 한 프레임 그리기
function drawWorld() {
  if (!G3.ready) initG3();
  if (G3.arena !== World.arena) buildArena();
  const key = World.arena.puddles.map(p => p.used ? 1 : 0).join(''); if (key !== G3.puddleKey) { G3.puddleKey = key; paintStatic(); }
  if (G3.decDirty) { G3.decTex.needsUpdate = true; G3.decDirty = false; }
  placeCam(); paintDynamic(); syncEnemies(); syncProjs(); syncPlayer(); SpriteFX.init(); SpriteFX.update(G3.dt || 0); G3.dt = 0;
  G3.renderer.render(G3.scene, G3.cam);
  // 위에 겹치는 2D 레이어
  cx.clearRect(0, 0, W, H);
  drawEnemyTags(); drawFX3();
  if (Juice.chroma > 0) { const o = 3 + Juice.chroma * 60; cx.save(); cx.globalCompositeOperation = 'screen'; cx.globalAlpha = 0.35; cx.drawImage(gl, -o, 0); cx.drawImage(gl, o, 0); cx.restore(); }
  if (World.mods.includes('dark')) {
    const q = proj(P.x, P.y, 20); const g = cx.createRadialGradient(q.x, q.y, 200 * q.s, q.x, q.y, 470 * q.s); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.9)');
    cx.fillStyle = g; cx.fillRect(0, 0, W, H);
  }
  const vg = cx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 0.95); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.5)');
  cx.fillStyle = vg; cx.fillRect(0, 0, W, H);
  if (Juice.flash > 0) { cx.globalAlpha = Juice.flash * 2; cx.fillStyle = Juice.flashCol; cx.fillRect(0, 0, W, H); cx.globalAlpha = 1; }
  if (Run.hp < St.maxHp * 0.3 && P.alive) { const k = 0.25 + Math.sin(performance.now() / 180) * 0.12; const g = cx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.9); g.addColorStop(0, 'rgba(120,0,0,0)'); g.addColorStop(1, `rgba(170,10,20,${k})`); cx.fillStyle = g; cx.fillRect(0, 0, W, H); }
  if (Juice.impact > 0) { cx.save(); cx.globalCompositeOperation = 'source-over'; cx.drawImage(gl, 0, 0); cx.globalCompositeOperation = 'difference'; cx.fillStyle = '#ffffff'; cx.fillRect(0, 0, W, H); cx.globalCompositeOperation = 'source-over'; cx.globalAlpha = 0.35; cx.fillStyle = Juice.impactCol; cx.fillRect(0, 0, W, H); cx.restore(); }
}
function drawIdle() { if (G3.ready) G3.renderer.clear(); cx.fillStyle = '#0c0b10'; cx.fillRect(0, 0, W, H); }
