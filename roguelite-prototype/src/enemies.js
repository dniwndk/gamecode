'use strict';
// ───────── 전투 세계: 아레나, 적, 보스, 투사체 ─────────
const World = { arena: null, enemies: [], projs: [], hits: [], bolts: [], marks: [], mods: [], queue: [], waveT: 0, kind: 'fight', over: false, clearT: -1, merchantT: -1, cam: { x: 0, y: 0 }, info: null };

function makeArena(size) {
  const [w, h] = ARENA_SIZE[size];
  const A = { w, h, pillars: [], puddles: [], size };
  const n = size === 's' ? rint(1, 3) : size === 'm' ? rint(2, 4) : rint(3, 6);
  for (let i = 0; i < n * 4 && A.pillars.length < n; i++) {
    const p = { x: rint(180, w - 180), y: rint(160, h - 160), r: rint(28, 46) };
    if (Math.hypot(p.x - w / 2, p.y - h / 2) < 220) continue;
    if (A.pillars.some(q => Math.hypot(q.x - p.x, q.y - p.y) < 200)) continue;
    A.pillars.push(p);
  }
  const pk = TIERS[Run.tier - 1].puddle;
  if (pk) for (let i = 0; i < rint(2, 3); i++) A.puddles.push({ kind: pk, x: rint(200, w - 200), y: rint(200, h - 200), r: rint(70, 110), used: false });
  return A;
}
function scaleFor() { const t = Run.tier - 1; return { hp: 1 + 0.6 * t + 0.03 * Run.row, dmg: 1 + 0.35 * t }; }

function makeEnemy(type, x, y, opts = {}) {
  const def = ENEMIES[type]; const sc = scaleFor();
  const hpMul = sc.hp * (opts.elite ? 1.8 : 1) * (World.mods.includes('horde') ? 0.6 : 1);
  const e = {
    type, def, x, y, vx: 0, vy: 0, r: def.r * (opts.elite ? 1.15 : 1), hp: def.hp * hpMul, maxHp: def.hp * hpMul,
    elite: !!opts.elite, boss: false, face: 0, atk: null, cd: 0.8 + R() * 0.8, flash: 0,
    burn: 0, burnT: 0, burnTick: 0, chill: 0, chillT: 0, frozen: 0, freezeImm: 0, shocked: 0,
    staggerT: 0, poiseDmg: 0, stance: 0, stanceMax: opts.elite ? 120 : 0, stanceIdle: 0, groggy: 0, finished: false,
    shieldUp: !!def.shield, shieldDown: 0, kbT: 0, spdMul: World.mods.includes('haste') ? 1.2 : 1, dmgMul: sc.dmg * (opts.elite ? 1.3 : 1),
    life: 0, dead: false, brand: 0,
  };
  e.cancelAttack = () => { if (e.atk) { World.hits = World.hits.filter(h => h.src !== e || h.keep); e.atk = null; e.cd = 0.9; } };
  return e;
}

function startFight(node) {
  const kind = node.type; World.kind = kind;
  World.enemies = []; World.projs = []; World.hits = []; World.bolts = []; World.marks = []; World.queue = []; Later = [];
  World.over = false; World.clearT = -1; World.t = 0; World.boss = null; World.mods = node.mods || []; World.merchantT = -1;
  FX.clear();
  let compo, size;
  if (kind === 'boss' || kind === 'final') {
    size = 'l'; compo = null;
  } else {
    const diff = node.elite ? 'elite' : (Run.row <= 2 ? 'easy' : 'normal');
    compo = pick(COMPOS[diff]); size = compo.size;
  }
  World.arena = makeArena(size);
  World.decal = document.createElement('canvas'); World.decal.width = World.arena.w; World.decal.height = World.arena.h;
  World.info = { compo: compo ? compo.name : null, kind };
  resetPlayer(World.arena.w / 2, World.arena.h * 0.72);
  if (compo) {
    let list = compo.list.slice(); if (World.mods.includes('horde')) list = list.concat(compo.list);
    const method = compo.spawn || (node.elite && R() < 0.3 ? 'ambush' : 'all');
    World.spawnMethod = method;
    if (method === 'wave') {
      const g = Math.ceil(list.length / 2); World.queue = [list.slice(0, g), list.slice(g)]; spawnGroup(World.queue.shift(), node.elite, false);
    } else spawnGroup(list, node.elite, method === 'ambush');
    if (World.mods.includes('chief')) later(1.8, () => { const c = World.enemies.filter(e => !e.dead).sort((a, b) => b.maxHp - a.maxHp)[0]; if (c) { c.chief = true; c.hp *= 1.5; c.maxHp *= 1.5; } });
    if (R() < 0.08) World.merchantT = 5;
  } else {
    const bk = kind === 'final' ? 'final' : (Run.row === 5 ? 'mid' : 'tier');
    later(0.6, () => spawnBoss(bk));
  }
}
function spawnGroup(list, elite, ambush) {
  const A = World.arena;
  list.forEach((type, i) => {
    let x, y;
    if (ambush) { const a = i / list.length * Math.PI * 2; x = clamp(P.x + Math.cos(a) * 260, 60, A.w - 60); y = clamp(P.y + Math.sin(a) * 260, 60, A.h - 60); }
    else { for (let k = 0; k < 20; k++) { x = rint(100, A.w - 100); y = rint(80, A.h * 0.55); if (Math.hypot(x - P.x, y - P.y) > 380) break; } }
    const delay = ambush ? 1.0 : 0.3 + i * 0.12;
    World.marks.push({ x, y, t: delay, max: delay, col: ambush ? '#ff6b6b' : '#b9b4c8' });
    later(delay, () => World.enemies.push(makeEnemy(type, x, y, { elite })));
  });
}

// ───────── 보스 ─────────
function spawnBoss(bk) {
  const def = BOSSES[bk]; const sc = scaleFor();
  const A = World.arena;
  const e = makeEnemy('brute', A.w / 2, A.h * 0.3, {});
  const hp = def.hp * (bk === 'final' ? 1 : sc.hp);
  Object.assign(e, { boss: true, bossKey: bk, bdef: def, r: def.r, hp, maxHp: hp, stanceMax: bk === 'mid' ? 240 : bk === 'tier' ? 320 : 420, dmgMul: sc.dmg, phase: 1, cd: 1.4 });
  e.def = { ...ENEMIES.brute, name: def.name, col: def.col, weak: null, res: null, armor: true, poise: 9999 };
  const tierName = bk === 'final' ? '' : ` ${Run.tier}`;
  e.title = def.name + tierName;
  World.enemies.push(e); World.boss = e;
  FX.text(e.x, e.y - 90, e.title, '#ffffff', true); Juice.kick(14); Sfx.boom();
}
function bossThink(e, dt) {
  const ph2 = e.hp / e.maxHp < 0.5, ph3 = e.bossKey === 'final' && e.hp / e.maxHp < 0.25;
  const newPhase = ph3 ? 3 : ph2 ? 2 : 1;
  if (newPhase > e.phase) { e.phase = newPhase; FX.text(e.x, e.y - 80, '페이즈 ' + newPhase, '#ff9a9a', true); Juice.kick(16); e.cancelAttack(); e.cd = 1.0; }
  const fast = e.phase === 1 ? 1 : e.phase === 2 ? 1.22 : 1.4;
  const tm = 1 / fast;
  if (!e.atk) {
    const d = dist(e, P); const a = angTo(e, P); e.face = a;
    const sp = 120 * fast * chillMul(e);
    if (d > 160) { e.vx = lerp(e.vx, Math.cos(a) * sp, dt * 4); e.vy = lerp(e.vy, Math.sin(a) * sp, dt * 4); } else { e.vx *= 0.9; e.vy *= 0.9; }
    e.cd -= dt;
    if (e.cd <= 0) {
      let pats = e.bdef.patterns.slice();
      if (e.phase === 1 && e.bossKey !== 'final') pats = pats.filter(p => p !== 'sweep');
      if (World.enemies.filter(x => !x.dead && !x.boss).length >= 3) pats = pats.filter(p => p !== 'summon');
      let p = pick(pats); if (d > 420 && R() < 0.6) p = pick(['charge', 'fan']);
      bossAttack(e, p, tm);
    }
  }
}
function bossAttack(e, p, tm) {
  const a = angTo(e, P);
  const D = 14 * e.dmgMul;
  if (p === 'combo') {
    const cols = ['white', 'white', 'gold'];
    e.atk = { name: 'combo', steps: cols.map(c => ({ c })), i: 0, t: 0, phase: 'tele', tele: 0.38 * tm, color: cols[0], ang: a };
  } else if (p === 'charge') e.atk = { name: 'charge', t: 0, phase: 'tele', tele: 0.55 * tm, color: 'white', ang: a };
  else if (p === 'fan') e.atk = { name: 'fan', t: 0, phase: 'tele', tele: 0.45 * tm, color: 'white', ang: a };
  else if (p === 'slam') e.atk = { name: 'slam', t: 0, phase: 'tele', tele: 0.75 * tm, color: 'red', ang: a };
  else if (p === 'sweep') e.atk = { name: 'sweep', t: 0, phase: 'tele', tele: 0.85 * tm, color: 'red', ang: a };
  else if (p === 'summon') e.atk = { name: 'summon', t: 0, phase: 'tele', tele: 0.6 * tm, color: 'white', ang: a, noFlash: true };
  e.atk.D = D; e.atk.tm = tm;
}
function bossAct(e, dt) {
  const k = e.atk; k.t += dt;
  if (k.phase === 'tele') {
    e.vx *= 0.85; e.vy *= 0.85;
    if (k.name !== 'charge' && k.name !== 'sweep') { k.ang = angTo(e, P); e.face = k.ang; }
    if (k.t >= k.tele) { k.phase = 'act'; k.t = 0; bossFire(e, k); }
    return;
  }
  if (k.phase === 'act') {
    if (k.name === 'charge') {
      e.vx = Math.cos(k.ang) * 980; e.vy = Math.sin(k.ang) * 980;
      if (k.t > 0.45) { k.phase = 'rec'; k.t = 0; World.hits = World.hits.filter(h => h.src !== e); }
    } else if (k.name === 'combo') {
      e.vx = Math.cos(k.ang) * 260 * (1 - k.t / 0.15); e.vy = Math.sin(k.ang) * 260 * (1 - k.t / 0.15);
      if (k.t > 0.18) {
        k.i++;
        if (k.i < k.steps.length) { k.phase = 'tele'; k.t = 0; k.color = k.steps[k.i].c; k.tele = (k.color === 'gold' ? 0.5 : 0.3) * k.tm; }
        else { k.phase = 'rec'; k.t = 0; }
      }
    } else { k.phase = 'rec'; k.t = 0; }
    return;
  }
  e.vx *= 0.85; e.vy *= 0.85;
  if (k.t > 0.55 * k.tm) { e.atk = null; e.cd = (e.phase === 1 ? 0.9 : 0.55) + R() * 0.5; }
}
function bossFire(e, k) {
  const D = k.D;
  if (k.name === 'combo') { addHit(e, { shape: 'arc', range: e.r + 120, arc: 2.3, ang: k.ang, t: 0.12, dmg: D * (k.color === 'gold' ? 1.5 : 1), color: k.color }); Sfx.swing(); }
  if (k.name === 'charge') addHit(e, { shape: 'body', r: e.r + 10, t: 0.45, dmg: D * 1.2, color: 'white', follow: true });
  if (k.name === 'fan') { const n = e.phase >= 2 ? 11 : 7; for (let i = 0; i < n; i++) { const a = k.ang + (i - (n - 1) / 2) * 0.16; enemyShot(e, a, 380, D * 0.7, 'white'); } }
  if (k.name === 'slam') { addHit(e, { shape: 'circle', r: 240, t: 0.14, dmg: D * 1.6, color: 'red' }); Juice.kick(18); splat(e.x, e.y, '#000', 200, 'crack'); Sfx.boom(); FX.ring(e.x, e.y, e.r, 240, '#ff5a5a', 0.4, 10); }
  if (k.name === 'sweep') { addHit(e, { shape: 'line', len: 800, w: 100, ang: k.ang, t: 0.16, dmg: D * 1.5, color: 'red' }); Juice.kick(14); Sfx.boom(); }
  if (k.name === 'summon') { for (let i = 0; i < 2; i++) { const x = clamp(e.x + rint(-200, 200), 80, World.arena.w - 80), y = clamp(e.y + rint(-150, 150), 80, World.arena.h - 80); World.marks.push({ x, y, t: 0.7, max: 0.7, col: '#ff6b6b' }); later(0.7, () => World.enemies.push(makeEnemy(pick(['grunt', 'bomber', 'wisp']), x, y))); } }
}

// ───────── 적 공격 판정 ─────────
function addHit(e, h) { h.src = e; h.done = false; World.hits.push(h); return h; }
function enemyShot(e, a, sp, dmg, color) {
  World.projs.push({ owner: 'enemy', src: e, x: e.x + Math.cos(a) * e.r, y: e.y + Math.sin(a) * e.r, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 9, life: 3, dmg, col: color === 'red' ? '#ff5a5a' : '#cfc6ff', color, gen: 0, hitSet: new Set() });
}
function hitOverlap(h) {
  const e = h.src; const x = h.follow ? e.x : (h.x != null ? h.x : e.x), y = h.follow ? e.y : (h.y != null ? h.y : e.y);
  if (h.x == null && !h.follow) { h.x = x; h.y = y; }
  const d = Math.hypot(P.x - x, P.y - y);
  if (h.shape === 'circle' || h.shape === 'body') return d < (h.r + P.r);
  if (h.shape === 'arc') return d < h.range + P.r && (d < 30 || Math.abs(angDiff(h.ang, Math.atan2(P.y - y, P.x - x))) < h.arc / 2);
  if (h.shape === 'line') {
    const dx = P.x - x, dy = P.y - y; const ax = Math.cos(h.ang), ay = Math.sin(h.ang);
    const along = dx * ax + dy * ay, perp = Math.abs(-dx * ay + dy * ax);
    return along > -20 && along < h.len && perp < h.w / 2 + P.r;
  }
  return false;
}
function updateHits(dt) {
  for (const h of World.hits) {
    h.t -= dt;
    if (h.done || h.src.dead && !h.keep) continue;
    if (hitOverlap(h)) {
      const r = playerHit({ dmg: h.dmg, color: h.color, src: h.src });
      if (r === 'parry' || r === 'hit') h.done = true;
    }
    if (h.hurtsEnemies && !h.enemyDone) {
      h.enemyDone = true;
      for (const t of World.enemies) if (!t.dead && Math.hypot(t.x - h.x, t.y - h.y) < h.r + t.r) dealDamage(t, { base: h.enemyDmg, gen: 1, ang: Math.atan2(t.y - h.y, t.x - h.x), kb: 300, elem: 'fire', noStatus: true });
    }
  }
  World.hits = World.hits.filter(h => h.t > 0);
}

// ───────── 적 행동 ─────────
function chillMul(e) { return e.frozen > 0 ? 0 : 1 - Math.min(0.4, e.chill * 0.08); }
function startAtk(e, name, color, tele) { e.atk = { name, color, t: 0, phase: 'tele', tele: tele / e.spdMul, ang: angTo(e, P) }; }
function updateEnemy(e, dt) {
  e.life += dt; e.flash -= dt; e.shk = (e.shk || 0) - dt; e.sqK = (e.sqK || 0) * Math.exp(-dt * 12);
  if (e.burn > 0) { e.burnT -= dt; e.burnTick -= dt; if (e.burnTick <= 0) { e.burnTick = 0.5; dealDamage(e, { base: e.burn * (2 + St.firePow * 0.08), gen: 1, elem: 'fire', noStatus: true, burnTick: true }); } if (e.burnT <= 0) e.burn = 0; }
  if (e.chillT > 0) { e.chillT -= dt; if (e.chillT <= 0) e.chill = 0; }
  e.frozen -= dt; e.freezeImm -= dt; e.shocked -= dt; e.kbT -= dt;
  if (e.shieldDown > 0) { e.shieldDown -= dt; if (e.shieldDown <= 0 && e.def.shield) e.shieldUp = true; }
  if (e.stanceMax && e.groggy <= 0) { e.stanceIdle += dt; if (e.stanceIdle > 3) e.stance = Math.max(0, e.stance - e.stanceMax * 0.1 * dt); }
  if (e.dead) return;
  const fric = e.kbT > 0 ? 3.2 : 8;
  if (e.groggy > 0) { e.groggy -= dt; e.vx *= 0.85; e.vy *= 0.85; moveEnemy(e, dt); return; }
  if (e.frozen > 0 || e.staggerT > 0) { e.staggerT -= dt; e.vx *= Math.exp(-fric * dt); e.vy *= Math.exp(-fric * dt); moveEnemy(e, dt); return; }
  if (e.kbT > 0) { e.vx *= Math.exp(-fric * dt); e.vy *= Math.exp(-fric * dt); moveEnemy(e, dt); return; }
  if (e.boss) { if (e.atk) bossAct(e, dt); else bossThink(e, dt); moveEnemy(e, dt); return; }
  const sp = e.def.spd * e.spdMul * chillMul(e);
  const d = dist(e, P), a = angTo(e, P);
  if (e.atk) { enemyAct(e, dt); moveEnemy(e, dt); return; }
  e.cd -= dt;
  const want = (tx, ty, s) => { e.vx = lerp(e.vx, tx * s, Math.min(1, dt * 6)); e.vy = lerp(e.vy, ty * s, Math.min(1, dt * 6)); };
  // 서로 겹치지 않게
  let sx = 0, sy = 0; for (const o of World.enemies) { if (o === e || o.dead) continue; const dd = dist(o, e); if (dd < e.r + o.r + 10 && dd > 0) { sx += (e.x - o.x) / dd; sy += (e.y - o.y) / dd; } }
  const T = e.type;
  if (T === 'merchant') { want(-Math.cos(a) + sx * 0.5, -Math.sin(a) + sy * 0.5, sp); e.face = a + Math.PI; if (e.life > 12) { e.dead = true; FX.text(e.x, e.y - 30, '도망쳤다', '#ffd86b'); } moveEnemy(e, dt); return; }
  if (T === 'wisp' || T === 'healer') {
    const ideal = T === 'wisp' ? 360 : 420;
    const dir = d > ideal + 60 ? 1 : d < ideal - 60 ? -1 : 0;
    const sideA = a + Math.PI / 2;
    want(Math.cos(a) * dir + Math.cos(sideA) * 0.4 + sx, Math.sin(a) * dir + Math.sin(sideA) * 0.4 + sy, sp);
    e.face = a;
    if (e.cd <= 0) {
      if (T === 'healer') {
        const hurt = World.enemies.filter(o => !o.dead && o !== e && o.hp < o.maxHp * 0.9 && dist(o, e) < 600).sort((p, q) => p.hp / p.maxHp - q.hp / q.maxHp)[0];
        if (hurt) { e.atk = { name: 'heal', color: null, t: 0, phase: 'tele', tele: 0.6, target: hurt, noFlash: true }; }
        else startAtk(e, 'shot', 'white', 0.35);
      } else startAtk(e, 'shot', 'white', 0.3);
    }
  } else if (T === 'bomber') {
    want(Math.cos(a) + sx * 0.3, Math.sin(a) + sy * 0.3, sp); e.face = a;
    if (d < 80) startAtk(e, 'boom', 'red', 0.55);
  } else {
    const reach = T === 'brute' ? 140 : T === 'shield' ? 110 : 170;
    if (d > reach) want(Math.cos(a) + sx, Math.sin(a) + sy, sp); else want(sx, sy, sp * 0.5);
    const turn = T === 'shield' ? 2.5 : 10; e.face += clamp(angDiff(e.face, a), -turn * dt, turn * dt);
    if (e.cd <= 0 && d < reach + 20) {
      if (T === 'grunt') startAtk(e, 'lunge', 'white', 0.3);
      else if (T === 'shield') startAtk(e, 'poke', 'white', 0.32);
      else if (T === 'brute') { if (R() < 0.55) startAtk(e, 'swing', 'gold', 0.45); else startAtk(e, 'slam', 'red', 0.6); }
    }
  }
  moveEnemy(e, dt);
}
function enemyAct(e, dt) {
  const k = e.atk; k.t += dt; const D = e.def.dmg * e.dmgMul * (World.mods.includes('chief') && World.enemies.some(c => c.chief && !c.dead && c !== e) ? 1.3 : 1);
  if (k.phase === 'tele') {
    e.vx *= 0.8; e.vy *= 0.8;
    if (e.type !== 'grunt' || k.t < k.tele * 0.6) { k.ang = angTo(e, P); if (e.type !== 'shield') e.face = k.ang; }
    if (k.t >= k.tele) {
      k.phase = 'act'; k.t = 0;
      if (k.name === 'lunge') addHit(e, { shape: 'body', r: e.r + 8, t: 0.25, dmg: D, color: 'white', follow: true });
      if (k.name === 'poke') addHit(e, { shape: 'line', len: 120, w: 40, ang: e.face, t: 0.12, dmg: D, color: 'white' });
      if (k.name === 'swing') { addHit(e, { shape: 'arc', range: e.r + 110, arc: 2.2, ang: k.ang, t: 0.12, dmg: D * 1.2, color: 'gold' }); Sfx.swing(); }
      if (k.name === 'slam') { addHit(e, { shape: 'circle', r: 150, t: 0.12, dmg: D * 1.3, color: 'red' }); Juice.kick(9); splat(e.x, e.y, '#000', 120, 'crack'); FX.ring(e.x, e.y, e.r, 150, '#ff5a5a', 0.35, 8); Sfx.boom(); }
      if (k.name === 'shot') { if (e.elite) { for (let i = -1; i <= 1; i++) enemyShot(e, k.ang + i * 0.22, 330, D, 'white'); } else enemyShot(e, k.ang, 330, D, 'white'); }
      if (k.name === 'heal') { const t = k.target; if (t && !t.dead) { t.hp = Math.min(t.maxHp, t.hp + t.maxHp * 0.25); World.bolts.push({ x1: e.x, y1: e.y, x2: t.x, y2: t.y, life: 0.3, col: '#5fc98a' }); FX.text(t.x, t.y - 30, '+회복', '#5fc98a'); } }
      if (k.name === 'boom') {
        const h = addHit(e, { shape: 'circle', r: 115, t: 0.12, dmg: D, color: 'red', x: e.x, y: e.y, keep: true });
        h.hurtsEnemies = true; h.enemyDmg = 30;
        FX.ring(e.x, e.y, 10, 115, '#ffb030', 0.35, 10); FX.burst(e.x, e.y, '#ffb030', 30, 400, 0.5, 6); Sfx.boom(); Juice.kick(10); splat(e.x, e.y, '#000', 110, 'scorch');
        e.dead = true; e.hp = 0; World.enemies.forEach(() => 0);
      }
    }
    return;
  }
  if (k.phase === 'act') {
    if (k.name === 'lunge') { e.vx = Math.cos(k.ang) * 620 * e.spdMul; e.vy = Math.sin(k.ang) * 620 * e.spdMul; if (k.t > 0.25) { k.phase = 'rec'; k.t = 0; } }
    else { k.phase = 'rec'; k.t = 0; }
    return;
  }
  e.vx *= 0.8; e.vy *= 0.8;
  const rec = e.type === 'brute' ? 0.7 : e.type === 'grunt' ? 0.55 : 0.45;
  if (k.t >= rec / e.spdMul) { e.atk = null; e.cd = (e.type === 'wisp' ? 1.8 : e.type === 'healer' ? 3.2 : 1.1) * (0.8 + R() * 0.5) / e.spdMul; }
}
function moveEnemy(e, dt) {
  const spd = Math.hypot(e.vx, e.vy);
  const wall = moveBody(e, dt);
  // 벽꿍
  if (wall && e.kbT > 0 && spd > 380 && !e.wallHit) {
    e.wallHit = true; later(0.3, () => e.wallHit = false);
    FX.text(e.x, e.y - 40, '벽꿍', '#ffd27a'); Juice.kick(8); FX.burst(e.x, e.y, '#d8c8a8', 12, 200, 0.4, 5);
    e.vx *= -0.3; e.vy *= -0.3; e.staggerT = Math.max(e.staggerT, 0.5);
    dealDamage(e, { base: 10 + spd * 0.02, gen: 1, elem: 'phys', noStatus: true });
  }
  // 적끼리 볼링
  if (e.kbT > 0 && spd > 380) {
    for (const o of World.enemies) {
      if (o === e || o.dead || o.bowled) continue;
      if (dist(o, e) < o.r + e.r) {
        o.bowled = true; later(0.4, () => o.bowled = false);
        o.vx += e.vx * 0.8; o.vy += e.vy * 0.8; o.kbT = 0.25; e.vx *= 0.4; e.vy *= 0.4;
        FX.text(o.x, o.y - 40, '충돌', '#ffd27a');
        dealDamage(o, { base: 8 + spd * 0.015, gen: 1, elem: 'phys', noStatus: true }); dealDamage(e, { base: 6, gen: 1, elem: 'phys', noStatus: true });
      }
    }
  }
}

// 지형 반응: 기름 + 화염 = 폭발, 물 + 번개 = 전도
function envReact(e, elem, dmg, gen) {
  if (gen > 1 || !World.arena) return;
  for (const pd of World.arena.puddles) {
    if (pd.used) continue;
    if (Math.hypot(e.x - pd.x, e.y - pd.y) > pd.r) continue;
    if (pd.kind === 'oil' && elem === 'fire') {
      pd.used = true; splat(pd.x, pd.y, '#000', pd.r + 50, 'scorch'); FX.ring(pd.x, pd.y, 10, pd.r + 60, '#ff7a2a', 0.5, 12); FX.burst(pd.x, pd.y, '#ff9a3d', 40, 450, 0.6, 7); Sfx.boom(); Juice.kick(14);
      FX.text(pd.x, pd.y - 20, '기름 폭발', '#ff9a3d', true);
      for (const t of World.enemies) if (!t.dead && Math.hypot(t.x - pd.x, t.y - pd.y) < pd.r + 60) later(0.03, () => dealDamage(t, { base: 45, gen: 2, elem: 'fire', ang: Math.atan2(t.y - pd.y, t.x - pd.x), kb: 400 }));
    }
    if (pd.kind === 'water' && elem === 'light') {
      FX.ring(pd.x, pd.y, 10, pd.r, '#ffe45c', 0.3, 6);
      for (const t of World.enemies) if (!t.dead && t !== e && Math.hypot(t.x - pd.x, t.y - pd.y) < pd.r + t.r) { World.bolts.push({ x1: e.x, y1: e.y, x2: t.x, y2: t.y, life: 0.15 }); later(0.04, () => dealDamage(t, { base: dmg * 0.5, gen: 2, elem: 'light', noStatus: true })); }
    }
  }
}

function killEnemy(e, finisher) {
  if (e.dead) return; e.dead = true;
  if (e.type === 'merchant') {
    const s = 30; Run.shards += s; FX.text(e.x, e.y - 30, `파편 +${s}`, '#ffd86b', true);
    if (R() < 0.25) { Run.rerolls = Math.min(5, Run.rerolls + 1); FX.text(e.x, e.y - 60, '리롤권 +1', '#9fe8ff'); }
    return;
  }
  Run.kills++;
  FX.burst(e.x, e.y, e.def.col, 16, 380, 0.5, 6); FX.ring(e.x, e.y, e.r, e.r + 50, '#ffffff', 0.25, 5);
  FX.shatter(e.x, e.y, e.def.col, 8 + Math.round(e.r / 4), 420, e.r * 0.35); splat(e.x, e.y, e.def.col, e.r * 1.4); Sfx.crunch();
  World.killLog = (World.killLog || []).filter(t => World.t - t < 0.4); World.killLog.push(World.t);
  if (World.killLog.length >= 3) { const n = World.killLog.length; FX.text(e.x, e.y - 70, `${n}연속 처치`, n >= 5 ? '#ff9a3d' : '#ffd27a', true); Juice.slowmo(0.25, 0.4); Juice.ab(0.08); }
  const sh = Math.round((e.boss ? 0 : e.elite ? 4 : 1 + (R() < 0.4 ? 1 : 0)) * (1 + St.shardMul));
  if (sh) { Run.shards += sh; Run.floorShards = (Run.floorShards || 0) + sh; }
  if (Run.augs.thirst) Run.hp = Math.min(St.maxHp, Run.hp + 2);
  if (Run.augs.overcharge) { if (P.dashCharges < 2) P.dashCharges++; }
  if (e.elite && !e.boss && R() < 0.15) { const it = pick(ITEMS); Run.pendingDrops = (Run.pendingDrops || []).concat(it.id); FX.text(e.x, e.y - 50, `인장: ${it.name}`, '#9fe8ff', true); }
  if (World.mods.includes('chainboom') && !e.boss) {
    const h = addHit(e, { shape: 'circle', r: 75, t: 0.1, dmg: 8 * scaleFor().dmg, color: 'red', x: e.x, y: e.y, keep: true });
    h.hurtsEnemies = true; h.enemyDmg = 14; FX.ring(e.x, e.y, 5, 75, '#ffb030', 0.3, 6);
  }
  if (e.boss) { Juice.slowmo(1.4, 0.2); Juice.kick(24); Juice.screen('#ffffff', 0.2); Juice.impactFrame(0.08, '#ffffff'); Juice.ab(0.3); Juice.punch(0.1); FX.radial(e.x, e.y, '#ffffff', 40, e.r, 12); FX.shatter(e.x, e.y, e.def.col, 30, 700, 14); splat(e.x, e.y, '#000', 220, 'scorch'); Sfx.boom(); FX.text(e.x, e.y - 100, '처치', '#ffffff', true); World.enemies.forEach(o => { if (!o.boss && !o.dead) { o.hp = 0; killEnemy(o); } }); }
}
function enemiesLeft() { return World.enemies.filter(e => !e.dead && e.type !== 'merchant').length; }

// ───────── 투사체 ─────────
function updateProjs(dt) {
  const A = World.arena;
  for (const p of World.projs) {
    p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
    if (p.x < 0 || p.y < 0 || p.x > A.w || p.y > A.h) p.life = 0;
    for (const pl of A.pillars) if (Math.hypot(p.x - pl.x, p.y - pl.y) < pl.r + p.r) { p.life = 0; FX.burst(p.x, p.y, p.col, 5, 120, 0.2, 3); }
    if (p.life <= 0) continue;
    if (p.owner === 'enemy') {
      if (Math.hypot(p.x - P.x, p.y - P.y) < p.r + P.r) {
        const r = playerHit({ dmg: p.dmg, color: p.color, src: p.src && !p.src.dead ? p.src : null, proj: p });
        if (r === 'hit') p.life = 0;
      }
    } else {
      for (const e of World.enemies) {
        if (e.dead || p.hitSet.has(e)) continue;
        if (Math.hypot(p.x - e.x, p.y - e.y) < p.r + e.r) {
          p.hitSet.add(e);
          dealDamage(e, { base: p.dmg, gen: p.gen, act: p.wave ? null : null, ang: Math.atan2(p.vy, p.vx), kb: 180, poise: p.wave ? 10 : 25 });
          if (!p.pierce) { p.life = 0; break; }
        }
      }
    }
  }
  World.projs = World.projs.filter(p => p.life > 0);
  if (World.projs.filter(p => p.owner === 'player').length > 80) { let n = 0; World.projs = World.projs.filter(p => p.owner !== 'player' || (++n > World.projs.filter(q => q.owner === 'player').length - 80)); }
}

function updateWorld(dt) {
  World.t = (World.t || 0) + dt;
  for (const m of World.marks) m.t -= dt; World.marks = World.marks.filter(m => m.t > 0);
  for (const e of World.enemies) updateEnemy(e, dt);
  updateHits(dt); updateProjs(dt);
  for (const b of World.bolts) b.life -= dt; World.bolts = World.bolts.filter(b => b.life > 0);
  // 파상 등장
  if (World.queue.length) { World.waveT += dt; if (enemiesLeft() <= 2 || World.waveT > 8) { World.waveT = 0; spawnGroup(World.queue.shift(), World.kind === 'fight' && Run.node && Run.node.elite, false); } }
  // 보물 상인
  if (World.merchantT > 0) { World.merchantT -= dt; if (World.merchantT <= 0) { const A = World.arena; const x = rint(150, A.w - 150), y = rint(150, A.h - 150); World.enemies.push(makeEnemy('merchant', x, y)); FX.text(x, y - 40, '보물 상인!', '#ffd86b', true); } }
  World.enemies = World.enemies.filter(e => !e.dead || e.flash > -0.3);
  // 클리어
  if (!World.over && World.clearT < 0 && enemiesLeft() === 0 && !World.queue.length && Later.length === 0 && World.marks.length === 0 && P.alive && World.t > 1.0) {
    World.clearT = 1.1; Juice.slowmo(0.7, 0.3);
  }
  if (World.clearT > 0) { World.clearT -= dt / Juice.scale(); if (World.clearT <= 0) { World.over = true; fightCleared(); } }
}
