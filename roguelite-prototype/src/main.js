'use strict';
// ───────── 메인 루프, 그리기, 화면 표시, 디버그, 자동 플레이 ─────────
let paused = false, god = false;
const Cam = { x: 0, y: 0 };
function updateCam(dt) {
  const A = World.arena; if (!A) return;
  const sp = G3.span(), m = 70;
  const lead = 50; const fa = P.face || 0; let tx = P.x + Math.cos(fa) * lead, ty = P.y + Math.sin(fa) * lead * 0.7;
  const b = World.boss; if (b && !b.dead) { tx = lerp(tx, b.x, 0.3); ty = lerp(ty, b.y, 0.3); } // 보스는 화면에 같이 잡아요
  tx = sp.w >= A.w + m * 2 ? A.w / 2 : clamp(tx, sp.w / 2 - m, A.w - sp.w / 2 + m);
  ty = sp.far + sp.near >= A.h + m * 2 ? A.h / 2 + (sp.far - sp.near) / 2 : clamp(ty, sp.far - m, A.h - sp.near + m);
  Cam.x = lerp(Cam.x, tx, Math.min(1, dt * 7)); Cam.y = lerp(Cam.y, ty, Math.min(1, dt * 7));
}
// 바닥 자국 (처치 흔적, 균열, 그을음)
function stampDecal(p) { if (!World.decal) return; const g = World.decal.getContext('2d'); g.save(); g.globalAlpha = 0.5; g.translate(p.x, p.y); g.rotate(p.rot); g.fillStyle = p.col; g.beginPath(); g.moveTo(-p.size, -p.size * 0.6); g.lineTo(p.size, 0); g.lineTo(-p.size * 0.4, p.size * 0.7); g.closePath(); g.fill(); g.restore(); G3.decDirty = true; }
function splat(x, y, col, r, kind) {
  if (!World.decal) return; const g = World.decal.getContext('2d'); g.save();
  if (kind === 'crack') { g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = 3; for (let i = 0; i < 9; i++) { const a = R() * Math.PI * 2; g.beginPath(); g.moveTo(x, y); let px = x, py = y; for (let j = 0; j < 4; j++) { px += Math.cos(a + (R() - 0.5) * 0.8) * r / 4; py += Math.sin(a + (R() - 0.5) * 0.8) * r / 4; g.lineTo(px, py); } g.stroke(); } }
  else if (kind === 'scorch') { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(0,0,0,0.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
  else { g.globalAlpha = 0.35; g.fillStyle = col; for (let i = 0; i < 7; i++) { const a = R() * Math.PI * 2, d = R() * r; g.beginPath(); g.ellipse(x + Math.cos(a) * d, y + Math.sin(a) * d, r * (0.2 + R() * 0.3), r * (0.12 + R() * 0.2), a, 0, Math.PI * 2); g.fill(); } }
  g.restore(); G3.decDirty = true;
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
  for (const e of World.enemies) {
    if (e.dead) continue; const q = proj(e.x, e.y, 20), sx = q.x, sy = q.y;
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
  if (P.perfect) { cx.textAlign = 'center'; cx.font = '900 22px sans-serif'; cx.fillStyle = '#9ffcff'; cx.fillText(`퍼펙트: 다음 공격 +${Math.round(St.perfectBonus * 100)}%`, W / 2, H - 178); cx.fillStyle = '#9ffcff55'; cx.fillRect(W / 2 - 90, H - 170, 180, 4); cx.fillStyle = '#9ffcff'; cx.fillRect(W / 2 - 90, H - 170, 180 * clamp(P.perfectT / 2, 0, 1), 4); }
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
  let stepped = Scene !== 'fight'; // 히트스톱·일시정지 동안 누른 키는 버리지 않고 다음 틱에 넘겨요
  if (Scene === 'fight' && World.arena) {
    if (!paused) {
      if (Juice.stop > 0) Juice.stop -= rdt;
      else {
        stepped = true;
        const sdt = rdt * Juice.scale() * (window.__speed || 1);
        const steps = Math.ceil((window.__speed || 1));
        for (let i = 0; i < steps; i++) {
          const d = sdt / steps; gameTime += d; Run.time += d;
          if (god) { Run.hp = St.maxHp; }
          updatePlayer(d); updateWorld(d); updateLater(d); FX.update(d); G3.dt = (G3.dt || 0) + d;
          if (Scene !== 'fight') break;
        }
      }
      updateCam(rdt);
    }
    if (World.arena) { drawWorld(); drawHUD(); }
  } else drawIdle();
  if (stepped) Input.endFrame();
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
