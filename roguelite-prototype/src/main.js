'use strict';
// ───────── 메인 루프, 그리기, 화면 표시, 디버그, 자동 플레이 ─────────
let paused = false, god = false;
const Cam = { x: 0, y: 0 };
function screenToWorld(sx, sy) { const z = 1 + Juice.zoom; return { x: (sx - W / 2) / z + Cam.x, y: (sy - H / 2) / z + Cam.y }; }
function updateCam(dt) {
  const A = World.arena; if (!A) return;
  let tx = P.x, ty = P.y;
  if (A.w <= W) tx = A.w / 2; else tx = clamp(tx, W / 2 - 40, A.w - W / 2 + 40);
  if (A.h <= H) ty = A.h / 2; else ty = clamp(ty, H / 2 - 40, A.h - H / 2 + 40);
  const lead = 46; const fa = P.face || 0; tx += Math.cos(fa) * lead; ty += Math.sin(fa) * lead * 0.7;
  if (A.w <= W) tx = A.w / 2; if (A.h <= H) ty = A.h / 2;
  Cam.x = lerp(Cam.x, tx, Math.min(1, dt * 7)); Cam.y = lerp(Cam.y, ty, Math.min(1, dt * 7));
}
const COLMAP = { white: '#ffffff', gold: '#ffd27a', red: '#ff4a4a' };

function drawWorld() {
  const A = World.arena, th = TIERS[Run.tier - 1];
  cx.fillStyle = '#0c0b10'; cx.fillRect(0, 0, W, H);
  cx.save();
  const z = 1 + Juice.zoom, sh = Juice.shake;
  cx.translate(W / 2 + (R() - 0.5) * sh * 0.6 + Juice.kx, H / 2 + (R() - 0.5) * sh * 0.6 + Juice.ky); cx.scale(z, z); cx.translate(-Cam.x, -Cam.y);
  // 바닥
  cx.fillStyle = th.floor; cx.fillRect(0, 0, A.w, A.h);
  cx.strokeStyle = th.line; cx.lineWidth = 1; cx.beginPath();
  for (let x = 0; x <= A.w; x += 80) { cx.moveTo(x, 0); cx.lineTo(x, A.h); }
  for (let y = 0; y <= A.h; y += 80) { cx.moveTo(0, y); cx.lineTo(A.w, y); }
  cx.stroke();
  cx.strokeStyle = th.accent; cx.lineWidth = 6; cx.strokeRect(-3, -3, A.w + 6, A.h + 6);
  for (const pd of A.puddles) {
    cx.fillStyle = pd.kind === 'water' ? 'rgba(70,140,200,0.35)' : pd.used ? 'rgba(20,10,8,0.6)' : 'rgba(60,40,20,0.75)';
    cx.beginPath(); cx.ellipse(pd.x, pd.y, pd.r, pd.r * 0.75, 0, 0, Math.PI * 2); cx.fill();
    if (!pd.used) { cx.strokeStyle = pd.kind === 'water' ? 'rgba(140,200,255,0.4)' : 'rgba(160,110,50,0.5)'; cx.lineWidth = 2; cx.stroke(); }
  }
  if (World.decal) cx.drawImage(World.decal, 0, 0);
  for (const pl of A.pillars) {
    cx.fillStyle = '#3c3946'; cx.beginPath(); cx.arc(pl.x, pl.y, pl.r, 0, Math.PI * 2); cx.fill();
    cx.fillStyle = '#4b4757'; cx.beginPath(); cx.arc(pl.x - 4, pl.y - 6, pl.r * 0.8, 0, Math.PI * 2); cx.fill();
  }
  for (const m of World.marks) { const k = 1 - m.t / m.max; cx.strokeStyle = m.col; cx.globalAlpha = 0.4 + k * 0.6; cx.lineWidth = 3; cx.beginPath(); cx.arc(m.x, m.y, 30 - k * 12, 0, Math.PI * 2); cx.stroke(); }
  cx.globalAlpha = 1;
  // 예고선 (붉은 공격·돌진)
  for (const e of World.enemies) {
    if (e.dead || !e.atk || e.atk.phase !== 'tele') continue;
    const k = e.atk, p = clamp(k.t / k.tele, 0, 1);
    cx.globalAlpha = 0.18 + p * 0.3; cx.fillStyle = COLMAP[k.color] || '#fff'; cx.strokeStyle = COLMAP[k.color] || '#fff'; cx.lineWidth = 2;
    if (k.name === 'slam') { const r = e.boss ? 240 : 150; cx.beginPath(); cx.arc(e.x, e.y, r * p, 0, Math.PI * 2); cx.fill(); cx.beginPath(); cx.arc(e.x, e.y, r, 0, Math.PI * 2); cx.stroke(); }
    if (k.name === 'boom') { cx.beginPath(); cx.arc(e.x, e.y, 115 * p, 0, Math.PI * 2); cx.fill(); cx.beginPath(); cx.arc(e.x, e.y, 115, 0, Math.PI * 2); cx.stroke(); }
    if (k.name === 'sweep') { cx.save(); cx.translate(e.x, e.y); cx.rotate(k.ang); cx.fillRect(0, -50, 800 * p, 100); cx.strokeRect(0, -50, 800, 100); cx.restore(); }
    if (k.name === 'charge' || k.name === 'lunge') { cx.save(); cx.translate(e.x, e.y); cx.rotate(k.ang); cx.fillRect(0, -e.r * 0.6, (k.name === 'charge' ? 440 : 150) * p, e.r * 1.2); cx.restore(); }
    if (k.name === 'swing' || k.name === 'combo') { const rg = e.r + (e.boss ? 120 : 110); cx.beginPath(); cx.moveTo(e.x, e.y); cx.arc(e.x, e.y, rg, k.ang - 1.15, k.ang + 1.15); cx.closePath(); cx.globalAlpha = 0.08 + p * 0.22; cx.fill(); }
    if (k.name === 'poke') { cx.save(); cx.translate(e.x, e.y); cx.rotate(e.face); cx.fillRect(0, -20, 120 * p, 40); cx.restore(); }
  }
  cx.globalAlpha = 1;
  // 판정 순간
  for (const hh of World.hits) {
    const e = hh.src, x = hh.follow ? e.x : hh.x, y = hh.follow ? e.y : hh.y; if (x == null) continue;
    cx.globalAlpha = 0.35; cx.fillStyle = COLMAP[hh.color];
    if (hh.shape === 'circle') { cx.beginPath(); cx.arc(x, y, hh.r, 0, Math.PI * 2); cx.fill(); }
    if (hh.shape === 'arc') { cx.beginPath(); cx.moveTo(x, y); cx.arc(x, y, hh.range, hh.ang - hh.arc / 2, hh.ang + hh.arc / 2); cx.closePath(); cx.fill(); }
    if (hh.shape === 'line') { cx.save(); cx.translate(x, y); cx.rotate(hh.ang); cx.fillRect(0, -hh.w / 2, hh.len, hh.w); cx.restore(); }
  }
  cx.globalAlpha = 1;
  // 적
  for (const e of World.enemies) drawEnemy(e);
  // 투사체
  for (const p of World.projs) {
    cx.fillStyle = p.col; cx.shadowColor = p.col; cx.shadowBlur = 14;
    if (p.wave) { cx.save(); cx.translate(p.x, p.y); cx.rotate(Math.atan2(p.vy, p.vx)); cx.beginPath(); cx.ellipse(0, 0, 10, 26, 0, 0, Math.PI * 2); cx.fill(); cx.restore(); }
    else { cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, Math.PI * 2); cx.fill(); }
    cx.shadowBlur = 0;
  }
  for (const b of World.bolts) {
    cx.strokeStyle = b.col || '#ffe45c'; cx.lineWidth = 3; cx.globalAlpha = clamp(b.life / 0.15, 0, 1); cx.beginPath(); cx.moveTo(b.x1, b.y1);
    const n = 6; for (let i = 1; i < n; i++) cx.lineTo(lerp(b.x1, b.x2, i / n) + (R() - 0.5) * 20, lerp(b.y1, b.y2, i / n) + (R() - 0.5) * 20);
    cx.lineTo(b.x2, b.y2); cx.stroke(); cx.globalAlpha = 1;
  }
  drawPlayer();
  FX.draw();
  cx.restore();
  // 색수차 (큰 타격·패링)
  if (Juice.chroma > 0) { const o = 3 + Juice.chroma * 60; cx.save(); cx.globalCompositeOperation = 'screen'; cx.globalAlpha = 0.35; cx.filter = 'none';
    cx.drawImage(cv, -o, 0); cx.drawImage(cv, o, 0); cx.restore(); }
  // 어둠 변형자
  if (World.mods.includes('dark')) {
    const z2 = 1 + Juice.zoom; const sx = (P.x - Cam.x) * z2 + W / 2, sy = (P.y - Cam.y) * z2 + H / 2;
    const g = cx.createRadialGradient(sx, sy, 160, sx, sy, 380); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.94)');
    cx.fillStyle = g; cx.fillRect(0, 0, W, H);
  }
  // 가장자리 어둡게
  const vg = cx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 0.95); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.5)');
  cx.fillStyle = vg; cx.fillRect(0, 0, W, H);
  if (Juice.flash > 0) { cx.globalAlpha = Juice.flash * 2; cx.fillStyle = Juice.flashCol; cx.fillRect(0, 0, W, H); cx.globalAlpha = 1; }
  // 저체력: 붉은 맥박
  if (Run.hp < St.maxHp * 0.3 && P.alive) { const k = 0.25 + Math.sin(performance.now() / 180) * 0.12; const g = cx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.9); g.addColorStop(0, 'rgba(120,0,0,0)'); g.addColorStop(1, `rgba(170,10,20,${k})`); cx.fillStyle = g; cx.fillRect(0, 0, W, H); }
  // 임팩트 프레임 (한두 프레임 반전)
  if (Juice.impact > 0) { cx.save(); cx.globalCompositeOperation = 'difference'; cx.fillStyle = '#ffffff'; cx.fillRect(0, 0, W, H); cx.globalCompositeOperation = 'source-over'; cx.globalAlpha = 0.35; cx.fillStyle = Juice.impactCol; cx.fillRect(0, 0, W, H); cx.restore(); }
}

function drawEnemy(e) {
  if (e.dead) { if (e.flash > -0.3) { cx.globalAlpha = clamp(0.3 + e.flash, 0, 1) * 0.5; cx.fillStyle = '#fff'; cx.beginPath(); cx.arc(e.x, e.y, e.r * (1.2 - e.flash), 0, Math.PI * 2); cx.fill(); cx.globalAlpha = 1; } return; }
  const t = e.atk && e.atk.phase === 'tele' && !e.atk.noFlash ? e.atk : null;
  // 그림자
  cx.fillStyle = 'rgba(0,0,0,0.35)'; cx.beginPath(); cx.ellipse(e.x, e.y + e.r * 0.8, e.r, e.r * 0.4, 0, 0, Math.PI * 2); cx.fill();
  // 섬광 (공격 0.3초 전)
  if (t) {
    const c = COLMAP[t.color]; const pulse = 0.6 + Math.sin(performance.now() / 40) * 0.4;
    cx.shadowColor = c; cx.shadowBlur = 30; cx.strokeStyle = c; cx.lineWidth = 5 * pulse + 2;
    cx.beginPath(); cx.arc(e.x, e.y, e.r + 8, 0, Math.PI * 2); cx.stroke(); cx.shadowBlur = 0;
    cx.fillStyle = c; cx.font = '900 28px sans-serif'; cx.textAlign = 'center'; cx.fillText('!', e.x, e.y - e.r - 18);
  }
  let col = e.def.col; if (e.flash > 0) col = '#ffffff'; else if (e.frozen > 0) col = '#bfefff';
  const shx = e.shk > 0 ? (R() - 0.5) * 10 * e.shk / 0.15 : 0, shy = e.shk > 0 ? (R() - 0.5) * 10 * e.shk / 0.15 : 0;
  const wind = t ? 1 + 0.14 * clamp(t.t / t.tele, 0, 1) : 1;
  const sq = e.sqK || 0; const sa = e.sqA || 0;
  cx.save(); cx.translate(e.x + shx, e.y + shy); cx.rotate(sa); cx.scale((1 + sq) * wind, (1 - sq * 0.7) * wind); cx.rotate(-sa);
  cx.fillStyle = col; cx.beginPath(); cx.arc(0, 0, e.r, 0, Math.PI * 2); cx.fill();
  if (e.elite || e.boss) { cx.strokeStyle = e.boss ? '#ffffff' : '#ffd27a'; cx.lineWidth = 3; cx.stroke(); }
  cx.restore();
  // 얼굴 방향
  cx.fillStyle = '#16131c'; cx.beginPath(); cx.arc(e.x + Math.cos(e.face) * e.r * 0.5, e.y + Math.sin(e.face) * e.r * 0.5, e.r * 0.22, 0, Math.PI * 2); cx.fill();
  if (e.def.shield && e.shieldUp) { cx.strokeStyle = '#d8e4f4'; cx.lineWidth = 7; cx.beginPath(); cx.arc(e.x, e.y, e.r + 7, e.face - 1.0, e.face + 1.0); cx.stroke(); }
  if (e.type === 'bomber') { cx.fillStyle = '#ff5a2a'; cx.beginPath(); cx.arc(e.x, e.y - e.r * 0.9, 5, 0, Math.PI * 2); cx.fill(); }
  if (e.type === 'merchant') { cx.fillStyle = '#ffffff'; cx.font = '900 18px sans-serif'; cx.fillText('◈', e.x, e.y + 6); }
  if (e.chief) { cx.fillStyle = '#ffd27a'; cx.font = '900 22px sans-serif'; cx.textAlign = 'center'; cx.fillText('♛', e.x, e.y - e.r - 6); }
  if (e.burn > 0 && R() < 0.4) FX.parts.push({ x: e.x + (R() - 0.5) * e.r, y: e.y + (R() - 0.5) * e.r, vx: 0, vy: -60, life: 0.4, max: 0.4, col: '#ff8a3d', size: 4 + e.burn });
  if (e.shocked > 0 && R() < 0.15) World.bolts.push({ x1: e.x - e.r, y1: e.y, x2: e.x + e.r, y2: e.y + (R() - 0.5) * e.r, life: 0.06 });
  if (e.chill > 0) { cx.strokeStyle = '#7fd8ff'; cx.lineWidth = 2; for (let i = 0; i < e.chill; i++) { cx.beginPath(); cx.arc(e.x, e.y, e.r + 3 + i * 3, 0, Math.PI * 2 * 0.2); cx.stroke(); } }
  if (e.brand) { cx.fillStyle = '#ff5bd1'; for (let i = 0; i < e.brand; i++) { cx.beginPath(); cx.arc(e.x - 8 + i * 8, e.y + e.r + 10, 3, 0, Math.PI * 2); cx.fill(); } }
  if (e.groggy > 0) { cx.fillStyle = '#ffd27a'; cx.font = '900 20px sans-serif'; cx.textAlign = 'center'; for (let i = 0; i < 3; i++) { const a = performance.now() / 300 + i * 2.1; cx.fillText('★', e.x + Math.cos(a) * e.r, e.y - e.r - 10 + Math.sin(a) * 6); } }
  // 체력·체간 (보스는 화면 위)
  if (!e.boss && (e.hp < e.maxHp || e.stanceMax)) {
    const w = Math.max(40, e.r * 2.2), x = e.x - w / 2, y = e.y - e.r - 14;
    cx.fillStyle = '#000a'; cx.fillRect(x, y, w, 5); cx.fillStyle = e.elite ? '#ff7a6a' : '#e05555'; cx.fillRect(x, y, w * clamp(e.hp / e.maxHp, 0, 1), 5);
    if (e.stanceMax) { cx.fillStyle = '#000a'; cx.fillRect(x, y + 7, w, 4); cx.fillStyle = e.groggy > 0 ? '#fff' : '#ffd27a'; cx.fillRect(x, y + 7, w * (e.groggy > 0 ? 1 : e.stance / e.stanceMax), 4); }
  }
}

function drawPlayer() {
  if (!P.alive && World.clearT < 0) { cx.globalAlpha = 0.5; }
  const a = P.act;
  cx.fillStyle = 'rgba(0,0,0,0.35)'; cx.beginPath(); cx.ellipse(P.x, P.y + 14, 18, 7, 0, 0, Math.PI * 2); cx.fill();
  if (P.counterT > 0) { cx.strokeStyle = '#ffd27a'; cx.lineWidth = 3; cx.globalAlpha = 0.5 + P.counterT; cx.beginPath(); cx.arc(P.x, P.y, P.r + 10, 0, Math.PI * 2); cx.stroke(); cx.globalAlpha = 1; }
  if (P.iframe > 0 && P.dashT <= 0 && Math.floor(performance.now() / 60) % 2) cx.globalAlpha = 0.5;
  for (const t of P.trail || []) { cx.globalAlpha = t.life / t.max * 0.45; cx.fillStyle = t.col; cx.beginPath(); cx.arc(t.x, t.y, P.r * (0.8 + 0.2 * t.life / t.max), 0, Math.PI * 2); cx.fill(); }
  if (P.iframe > 0 && P.dashT <= 0 && Math.floor(performance.now() / 60) % 2) cx.globalAlpha = 0.5; else cx.globalAlpha = 1;
  cx.save(); cx.translate(P.x, P.y); cx.rotate(P.sqA || 0); cx.scale(1 + (P.sqK || 0), 1 - (P.sqK || 0) * 0.6); cx.rotate(-(P.sqA || 0));
  cx.fillStyle = P.hurtT > 0 ? '#ff8a8a' : P.counterT > 0 ? '#ffe2a0' : '#4fd1c5'; cx.beginPath(); cx.arc(0, 0, P.r, 0, Math.PI * 2); cx.fill();
  cx.strokeStyle = '#e8fffb'; cx.lineWidth = 3; cx.stroke(); cx.restore();
  cx.globalAlpha = 1;
  // 칼
  const fa = a && a.ang != null ? a.ang : P.face;
  cx.strokeStyle = '#e9eef7'; cx.lineWidth = 4; cx.beginPath(); cx.moveTo(P.x + Math.cos(fa) * 12, P.y + Math.sin(fa) * 12); cx.lineTo(P.x + Math.cos(fa) * 40, P.y + Math.sin(fa) * 40); cx.stroke();
  if (a && a.type === 'swing' && a.phase === 'active') {
    const sw = a.sw; cx.fillStyle = a.counter ? 'rgba(255,210,122,0.55)' : 'rgba(230,245,255,0.45)';
    cx.beginPath(); cx.moveTo(P.x, P.y); cx.arc(P.x, P.y, sw.range + P.r, a.ang - sw.arc / 2, a.ang + sw.arc / 2); cx.closePath(); cx.fill();
  }
  if (a && a.type === 'thrust') { cx.fillStyle = 'rgba(200,240,255,0.5)'; cx.save(); cx.translate(P.x, P.y); cx.rotate(a.ang); cx.fillRect(0, -14, 90, 28); cx.restore(); }
  if (a && a.type === 'spin') { cx.strokeStyle = 'rgba(220,240,255,0.7)'; cx.lineWidth = 10; cx.beginPath(); cx.arc(P.x, P.y, 140, a.t * 30, a.t * 30 + 4.5); cx.stroke(); }
  if (a && a.type === 'parry') {
    cx.strokeStyle = '#ffffff'; cx.lineWidth = 6; cx.shadowColor = '#fff'; cx.shadowBlur = 20;
    cx.beginPath(); cx.arc(P.x, P.y, P.r + 14, P.face - 1.3, P.face + 1.3); cx.stroke(); cx.shadowBlur = 0;
  }
  if (a && a.type === 'parryWhiff') { cx.strokeStyle = 'rgba(255,120,120,0.6)'; cx.lineWidth = 3; cx.beginPath(); cx.arc(P.x, P.y, P.r + 12, 0, Math.PI * 2); cx.stroke(); }
}

// 바닥 자국 (처치 흔적, 균열, 그을음)
function stampDecal(p) { if (!World.decal) return; const g = World.decal.getContext('2d'); g.save(); g.globalAlpha = 0.5; g.translate(p.x, p.y); g.rotate(p.rot); g.fillStyle = p.col; g.beginPath(); g.moveTo(-p.size, -p.size * 0.6); g.lineTo(p.size, 0); g.lineTo(-p.size * 0.4, p.size * 0.7); g.closePath(); g.fill(); g.restore(); }
function splat(x, y, col, r, kind) {
  if (!World.decal) return; const g = World.decal.getContext('2d'); g.save();
  if (kind === 'crack') { g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = 3; for (let i = 0; i < 9; i++) { const a = R() * Math.PI * 2; g.beginPath(); g.moveTo(x, y); let px = x, py = y; for (let j = 0; j < 4; j++) { px += Math.cos(a + (R() - 0.5) * 0.8) * r / 4; py += Math.sin(a + (R() - 0.5) * 0.8) * r / 4; g.lineTo(px, py); } g.stroke(); } }
  else if (kind === 'scorch') { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(0,0,0,0.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
  else { g.globalAlpha = 0.35; g.fillStyle = col; for (let i = 0; i < 7; i++) { const a = R() * Math.PI * 2, d = R() * r; g.beginPath(); g.ellipse(x + Math.cos(a) * d, y + Math.sin(a) * d, r * (0.2 + R() * 0.3), r * (0.12 + R() * 0.2), a, 0, Math.PI * 2); g.fill(); } }
  g.restore();
}
window.stampDecal = stampDecal;

// ───────── 화면 표시 (HUD) ─────────
function bar(x, y, w, hgt, k, col, bg) { cx.fillStyle = bg || '#0008'; cx.fillRect(x, y, w, hgt); cx.fillStyle = col; cx.fillRect(x, y, w * clamp(k, 0, 1), hgt); }
function drawHUD() {
  cx.textAlign = 'left'; cx.font = '700 18px sans-serif';
  // 체력·궁극기
  bar(30, 28, 340, 18, Run.hp / St.maxHp, '#e05555'); cx.fillStyle = '#fff'; cx.fillText(`${Math.ceil(Run.hp)} / ${St.maxHp}`, 38, 44);
  bar(30, 52, 340, 10, P.ult, P.ult >= 1 ? '#ffb36b' : '#a86a3a');
  const md = Run.augs.overcharge ? 2 : 1;
  for (let i = 0; i < md; i++) { cx.fillStyle = i < P.dashCharges ? '#9fe8ff' : '#33404a'; cx.fillRect(30 + i * 26, 70, 20, 8); }
  cx.fillStyle = '#ccc'; cx.font = '600 14px sans-serif'; cx.fillText('대시', 30 + md * 26 + 4, 79);
  const ms = Run.augs.overcharge ? 2 : 1;
  for (let i = 0; i < ms; i++) { cx.fillStyle = i < P.spinCharges ? '#cfe8ff' : '#33404a'; cx.fillRect(150 + i * 26, 70, 20, 8); }
  cx.fillText('회전베기 (Q)', 150 + ms * 26 + 4, 79);
  if (P.ult >= 1) { cx.fillStyle = '#ffb36b'; cx.font = '800 16px sans-serif'; cx.fillText('궁극기 준비 (R)', 30, 102); }
  // 화면 밖 적 표시
  const z = 1 + Juice.zoom;
  for (const e of World.enemies) {
    if (e.dead) continue; const sx = (e.x - Cam.x) * z + W / 2, sy = (e.y - Cam.y) * z + H / 2;
    if (sx > 0 && sx < W && sy > 0 && sy < H) continue;
    const a = Math.atan2(sy - H / 2, sx - W / 2); const ex = clamp(sx, 24, W - 24), ey = clamp(sy, 120, H - 90);
    cx.save(); cx.translate(ex, ey); cx.rotate(a); cx.fillStyle = e.boss ? '#ff5a5a' : e.atk && e.atk.phase === 'tele' ? COLMAP[e.atk.color] || '#fff' : '#d0c8e0';
    cx.beginPath(); cx.moveTo(12, 0); cx.lineTo(-8, -9); cx.lineTo(-8, 9); cx.closePath(); cx.fill(); cx.restore();
  }
  // 층 정보
  cx.textAlign = 'right'; cx.font = '800 22px sans-serif'; cx.fillStyle = '#fff';
  const kindName = World.kind === 'final' ? '최종 보스' : World.kind === 'boss' ? '보스' : (Run.node && Run.node.type === 'curse' ? '저주 전투' : Run.node && Run.node.elite ? '정예 전투' : '전투');
  cx.fillText(`${Run.floor}층 · ${kindName}`, W - 30, 42);
  cx.font = '600 16px sans-serif'; cx.fillStyle = '#ffd86b'; cx.fillText(`파편 ${Run.shards}`, W - 30, 66);
  if (World.mods.length) { cx.fillStyle = '#d27aff'; cx.fillText('변형자: ' + World.mods.map(m => MOD[m].name).join(', '), W - 30, 88); }
  if (World.info && World.info.compo) { cx.fillStyle = '#9a96a8'; cx.fillText(World.info.compo, W - 30, 108); }
  // 타격 수
  if (P.hits >= 3) { const k = clamp(P.hitT / 1.6, 0, 1); const pop = 1 + Math.max(0, (P.hitPop || 0)) * 0.6; cx.save(); cx.translate(W - 60, 190); cx.scale(pop, pop); cx.textAlign = 'right'; cx.globalAlpha = 0.4 + k * 0.6;
    cx.font = '900 46px sans-serif'; cx.fillStyle = P.hits >= 30 ? '#ff9a3d' : P.hits >= 15 ? '#ffd27a' : '#ffffff'; cx.fillText(P.hits, 0, 0); cx.font = '800 16px sans-serif'; cx.fillStyle = '#c9c4d6'; cx.fillText('연속 타격', 0, 22);
    cx.fillStyle = '#ffffff33'; cx.fillRect(-110, 30, 110, 4); cx.fillStyle = '#ffd27a'; cx.fillRect(-110 * k, 30, 110 * k, 4); cx.restore(); }
  // 반격 창
  if (P.counterT > 0) { cx.textAlign = 'center'; cx.font = '900 26px sans-serif'; cx.fillStyle = '#ffd27a'; cx.fillText('반격!', W / 2, H - 150); }
  if (P.chainStacks > 0 && Run.augs.chainparry) { cx.textAlign = 'center'; cx.font = '700 16px sans-serif'; cx.fillStyle = '#ffd27a'; cx.fillText(`연속 응수 ${P.chainStacks}`, W / 2, H - 125); }
  // 동작 각인 줄
  const keys = ['dash', 'a1', 'a2', 'a3', 'parry', 'counter', 'core'];
  const curAct = P.act ? (P.act.type === 'swing' ? (P.act.counter ? 'counter' : P.act.act) : P.act.type === 'thrust' ? 'dash' : P.act.type === 'parry' ? 'parry' : null) : (P.dashT > 0 ? 'dash' : null);
  keys.forEach((k, i) => {
    const x = W / 2 - 3.5 * 120 + i * 120, y = H - 64; const inst = Run.engr[k]; const open = Run.open.has(k);
    cx.fillStyle = curAct === k || (P.act && P.act.counter && k === P.act.act) ? '#2b3a48' : '#14121add'; cx.fillRect(x, y, 112, 46);
    cx.strokeStyle = inst ? ELEM[ITEM[inst.id].elem].col : open ? '#444' : '#222'; cx.lineWidth = Links[k] > 1 ? 3 : 1.5; cx.strokeRect(x, y, 112, 46);
    cx.textAlign = 'center'; cx.font = '700 13px sans-serif'; cx.fillStyle = '#aaa'; cx.fillText(SLOT[k].name, x + 56, y + 17);
    cx.font = '700 13px sans-serif'; cx.fillStyle = inst ? ELEM[ITEM[inst.id].elem].col : '#555'; cx.fillText(inst ? ITEM[inst.id].name : open ? '비어 있음' : '잠김', x + 56, y + 36);
  });
  // 보스 바
  const b = World.boss;
  if (b && !b.dead) {
    const w = 760, x = W / 2 - w / 2, y = 34;
    cx.textAlign = 'center'; cx.font = '800 20px sans-serif'; cx.fillStyle = '#fff'; cx.fillText(b.title + (b.phase > 1 ? ` · 페이즈 ${b.phase}` : ''), W / 2, y - 6);
    bar(x, y, w, 16, b.hp / b.maxHp, '#d04848'); bar(x, y + 20, w, 8, b.groggy > 0 ? 1 : b.stance / b.stanceMax, b.groggy > 0 ? '#ffffff' : '#ffd27a');
  }
  if (god) { cx.textAlign = 'left'; cx.fillStyle = '#7fe0a0'; cx.font = '700 14px sans-serif'; cx.fillText('무적', 300, 79); }
  // 보유 증강 (항상 표시)
  { let x = 30, y = 118; cx.textAlign = 'left'; cx.font = '700 13px sans-serif';
    const ids = Object.keys(Run.augs);
    cx.fillStyle = '#9a96a8'; cx.fillText(ids.length ? '증강 (Tab: 자세히)' : '증강 없음 (Tab: 능력치)', x, y); y += 8;
    for (const id of ids) {
      const a = AUG[id], l = Run.augs[id]; const lit = synOf(id).some(s => Run.syn.has(s.id));
      const label = (lit ? '✦ ' : '') + a.name + (a.max > 1 ? ' ' + l : ''); const w = cx.measureText(label).width + 16;
      if (x + w > 400) { x = 30; y += 26; }
      cx.fillStyle = '#14121add'; cx.fillRect(x, y, w, 22); cx.strokeStyle = GRADE[a.grade].col; cx.lineWidth = 1.5; cx.strokeRect(x, y, w, 22);
      cx.fillStyle = lit ? '#ffd27a' : '#e6e3ee'; cx.fillText(label, x + 8, y + 16); x += w + 6;
    }
    if (Run.syn && Run.syn.size) { y += 40; cx.fillStyle = '#ffd27a'; cx.fillText('시너지: ' + [...Run.syn].map(s => SYN[s].name).join(', '), 30, y); }
  }
  if (paused) { cx.fillStyle = '#000a'; cx.fillRect(0, 0, W, H); cx.textAlign = 'center'; cx.fillStyle = '#fff'; cx.font = '900 48px sans-serif'; cx.fillText('일시정지', W / 2, H / 2); cx.font = '600 18px sans-serif'; cx.fillText('Esc로 계속', W / 2, H / 2 + 40); }
}

// ───────── 디버그 패널 (` 키) ─────────
function toggleDebug() {
  let d = document.getElementById('dbg'); if (d) { d.remove(); return; }
  d = h('div', 'dbg'); d.id = 'dbg';
  const btn = (t, f) => { const b = h('button', 'btn small', t); b.onclick = () => { f(); }; d.appendChild(b); };
  btn('무적 켜기/끄기', () => { god = !god; });
  btn('이 층 즉시 클리어', () => { if (Scene === 'fight') { World.queue = []; World.enemies.forEach(e => { if (!e.dead) { e.hp = 0; killEnemy(e); } }); } });
  btn('파편 +500', () => { Run.shards += 500; });
  btn('무작위 증강', () => { const a = pick(AUGMENTS.filter(x => (Run.augs[x.id] || 0) < x.max)); if (a) { takeAug(a.id); flashMsg(a.name); } });
  btn('무작위 인장 (가방)', () => { if (Run.bag.length < Run.bagMax) { Run.bag.push({ id: pick(ITEMS).id, lv: 0 }); flashMsg('가방에 넣음'); } });
  btn('모든 각인 자리 열기', () => { SLOTS.forEach(s => Run.open.add(s.k)); recalc(); });
  btn('체력 가득', () => { Run.hp = St.maxHp; });
  btn('궁극기 가득', () => { P.ult = 1; });
  btn('닫기', () => d.remove());
  document.body.appendChild(d);
}
addEventListener('keydown', e => {
  if (e.key === '`') toggleDebug();
  if (e.key === 'Tab') { e.preventDefault(); toggleCodex(); if (Scene === 'fight' && !document.getElementById('codex')) UI.style.pointerEvents = 'none'; return; }
  if (e.key === 'Escape' && document.getElementById('codex')) { toggleCodex(); if (Scene === 'fight') UI.style.pointerEvents = 'none'; return; }
  if (e.key === 'Escape' && Scene === 'fight') paused = !paused;
});

// ───────── 자동 플레이 (검증용) ─────────
function makeBot() {
  const bot = { down: new Set(), pressed: new Set(), aim: null, lastParry: -9, think() {
    this.down.clear(); this.aim = null;
    if (Scene !== 'fight' || !P.alive) return;
    const foes = World.enemies.filter(e => !e.dead);
    if (!foes.length) return;
    let tgt = foes.sort((a, b) => dist(a, P) - dist(b, P))[0];
    const d = dist(tgt, P); this.aim = angTo(P, tgt);
    // 위협 판단
    let threat = null;
    for (const e of foes) {
      if (e.atk && e.atk.phase === 'tele' && !e.atk.noFlash) {
        const left = e.atk.tele - e.atk.t; const ed = dist(e, P);
        const reach = e.boss ? (e.atk.name === 'slam' ? 260 : e.atk.name === 'sweep' ? 820 : e.atk.name === 'charge' ? 700 : e.atk.name === 'fan' ? 0 : 200) : e.atk.name === 'shot' ? 0 : e.atk.name === 'slam' ? 170 : e.atk.name === 'boom' ? 140 : e.atk.name === 'lunge' ? 220 : 160;
        const lungeLike = e.atk.name === 'lunge' || e.atk.name === 'charge';
        if (ed < reach && left < (e.atk.color === 'red' ? 0.2 : 0.09) && !(lungeLike && ed > 110)) threat = { e, left };
      }
      if (e.atk && e.atk.phase === 'act' && (e.atk.name === 'lunge' || e.atk.name === 'charge') && dist(e, P) < 75 + e.r) threat = { e, left: 0 };
    }
    for (const p of World.projs) if (p.owner === 'enemy' && Math.hypot(p.x - P.x, p.y - P.y) < 70) threat = { proj: p, left: 0, color: p.color };
    if (threat && gameTime - this.lastParry > 0.25) {
      const col = threat.proj ? threat.color : threat.e.atk.color;
      if (col === 'red' && !Run.augs.redsteel) { this.pressed.add(' '); const away = angTo(threat.e || P, P) + (R() - 0.5); this.down.add(Math.cos(away) > 0 ? 'd' : 'a'); this.down.add(Math.sin(away) > 0 ? 's' : 'w'); }
      else { this.pressed.add('k'); if (threat.e) this.aim = angTo(P, threat.e); }
      this.lastParry = gameTime; return;
    }
    if (P.ult >= 1 && foes.filter(e => dist(e, P) < 300).length >= 3) this.pressed.add('r');
    if (P.spinCharges > 0 && foes.filter(e => dist(e, P) < 150).length >= 3) this.pressed.add('q');
    const want = tgt.boss ? 130 : 80;
    if (d > want + tgt.r) { const a = this.aim; if (Math.cos(a) > 0.38) this.down.add('d'); if (Math.cos(a) < -0.38) this.down.add('a'); if (Math.sin(a) > 0.38) this.down.add('s'); if (Math.sin(a) < -0.38) this.down.add('w'); }
    else if (!P.act || P.act.phase === 'rec') this.pressed.add('j');
  } };
  return bot;
}
function autoEngrave() {
  for (let i = Run.bag.length - 1; i >= 0; i--) {
    const it = ITEM[Run.bag[i].id];
    const slot = KIND_SLOTS[it.kind].find(k => Run.open.has(k) && !Run.engr[k]);
    if (slot) { Run.engr[slot] = Run.bag.splice(i, 1)[0]; }
  }
  recalc();
}
function autoShop(stock, draw, redraw) {
  for (const s of stock) { const price = Math.round(s.it.price * (Run.augs.regular ? 0.8 : 1)); if (!s.sold && Run.shards >= price + 20 && Run.bag.length < Run.bagMax) { Run.shards -= price; s.sold = true; Run.bag.push({ id: s.it.id, lv: 0 }); autoEngrave(); } }
  const lock = SLOT_UNLOCK_ORDER.find(s => !Run.open.has(s)); if (lock && Run.shards >= 100) { Run.shards -= 100; Run.open.add(lock); autoEngrave(); }
  if (Run.shards >= 60 && Run.engr.a1) { Run.shards -= 60; Run.stones++; useStone('a1', () => 0); }
  setTimeout(() => { Sel = null; afterFloor(); }, 20);
}

// ───────── 루프 ─────────
let last = performance.now();
function frame(now) {
  const rdt = Math.min(0.033, (now - last) / 1000); last = now;
  Juice.update(rdt);
  if (Input.bot) Input.bot.think();
  if (Scene === 'fight' && World.arena) {
    if (!paused) {
      if (Juice.stop > 0) Juice.stop -= rdt;
      else {
        const sdt = rdt * Juice.scale() * (window.__speed || 1);
        const steps = Math.ceil((window.__speed || 1));
        for (let i = 0; i < steps; i++) {
          const d = sdt / steps; gameTime += d; Run.time += d;
          if (god) { Run.hp = St.maxHp; }
          updatePlayer(d); updateWorld(d); updateLater(d); FX.update(d);
          if (Scene !== 'fight') break;
        }
      }
      updateCam(rdt);
    }
    if (World.arena) { drawWorld(); drawHUD(); }
  } else {
    cx.fillStyle = '#0c0b10'; cx.fillRect(0, 0, W, H);
  }
  Input.endFrame();
  requestAnimationFrame(frame);
}

window.__proto = {
  get run() { return Run; }, get world() { return World; }, get player() { return P; }, get scene() { return Scene; },
  start(s) { startRun(s); }, god(v) { god = v; }, auto(on) { Input.bot = on ? makeBot() : null; window.__auto = !!on; },
  clear() { World.queue = []; World.enemies.forEach(e => { if (!e.dead) { e.hp = 0; killEnemy(e); } }); },
  enter(id) { const n = Run.map.byId[id]; if (n) enterNode(n); }, reach() { return reachable(); },
  aug(id) { takeAug(id); }, item(id, slot) { Run.open.add(slot); Run.engr[slot] = { id, lv: 0 }; recalc(); },
};
fit(); showTitle(); requestAnimationFrame(frame);
