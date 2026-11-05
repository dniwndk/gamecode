'use strict';
// ───────── 런 상태와 능력치 계산 ─────────
let Run = null;
function newRun(seedVal) {
  if (seedVal != null) seed(seedVal);
  Run = {
    tier: 1, row: 0, floor: 0, node: null, map: null,
    hp: 100, shards: 0, rerolls: 0,
    blessings: {}, augs: {},
    engr: { a1: null, a2: null, a3: null, dash: null, parry: null, counter: null, core: null },
    open: new Set(['a1', 'parry', 'core']),
    bag: [], bagMax: 2,
    stones: 0,
    kills: 0, parries: 0, golds: 0, groggies: 0, maxHit: 0, time: 0,
    upNext: 0, sagaOn: false, history: [],
  };
  recalc();
  Run.hp = St.maxHp;
}
let St = {}, ActMods = {}, Links = {};

function blankEff() { return { dmg: 0, crit: 0, poise: 0, vs: {}, critCond: [], poiseCond: [], dashCd: 0, guard: 0 }; }
function addEff(t, e, m) {
  if (!e) return;
  if (e.dmg) t.dmg += e.dmg * m;
  if (e.crit) { if (e.critVs) t.critCond.push({ vs: e.critVs, v: e.crit * m }); else t.crit += e.crit * m; }
  if (e.poise) { if (e.poiseVs) t.poiseCond.push({ vs: e.poiseVs, v: e.poise * m }); else t.poise += e.poise * m; }
  if (e.dashCd) t.dashCd += e.dashCd * m;
  if (e.guard) t.guard += e.guard * m;
  if (e.vs) for (const k in e.vs) t.vs[k] = (t.vs[k] || 0) + e.vs[k] * m;
}
function itemLvMul(inst) { return 1 + 0.5 * (inst.lv || 0); }

function recalc() {
  const s = { maxHp: 100, dmg: 0, atkSpd: 1, move: 1, dashCd: 0.55, ultGain: 1, parryWin: 0.26, parryWinBase: 0.26, perfectWin: 0.07, perfectBonus: 0.8, crit: 0.05, critDmg: 1.5,
    firePow: 0, icePow: 0, lightPow: 0, fireDmg: 0, physDmg: 0, poise: 0, stance: 0, shardMul: 0, chillAmp: 0, shockBounce: 0, maxHpMul: 0, dmgTaken: 1 };
  const A = Run.augs;
  if (A.catch) { s.parryWin += 0.06; s.parryWinBase += 0.06; }
  Run.syn = new Set(SYNERGIES.filter(x => x.need.every(n => A[n])).map(x => x.id));
  if (A.redsteel && !Run.syn.has('ironwall')) { s.parryWin -= 0.04; s.parryWinBase -= 0.04; }
  for (const id in Run.blessings) { const b = BLESSINGS.find(x => x.id === id); for (let i = 0; i < Run.blessings[id]; i++) b.apply(s); }
  if (A.topple) s.stance += 0.4;
  if (A.plate) s.dmgTaken *= 0.88;
  if (A.fate) { s.crit += 0.15; s.critDmg += 0.5; }
  if (Run.sagaOn) s.dmgTaken *= 1.1;

  // 이음: 이어진 두 자리에 같은 계열이면 둘 다 +20%
  const E = Run.engr; const link = {};
  for (const sl of SLOTS) link[sl.k] = 1;
  for (const sl of SLOTS) {
    const it = E[sl.k]; if (!it) continue; const el = ITEM[it.id].elem; if (el === 'none') continue;
    for (const o of sl.links) { const jt = E[o]; if (jt && ITEM[jt.id].elem === el) { link[sl.k] = 1.2; } }
  }
  // 심 자리 둘 잇기 (심 쪽도 같이 +20%)
  if (E.core) { const el = ITEM[E.core.id].elem; if (el !== 'none' && SLOTS.some(sl => sl.k !== 'core' && E[sl.k] && ITEM[E[sl.k].id].elem === el)) link.core = 1.2; }
  Links = link;

  ActMods = {};
  for (const sl of SLOTS) ActMods[sl.k] = blankEff();
  for (const sl of SLOTS) {
    const inst = E[sl.k]; if (!inst) continue;
    const it = ITEM[inst.id]; const m = itemLvMul(inst) * link[sl.k];
    for (const k in it.base) s[k] = (s[k] || 0) + it.base[k] * m;
    const at = it.at[sl.k] || it.at.any;
    if (sl.k !== 'core') addEff(ActMods[sl.k], at, m);
  }
  // 사슬 셋 → 끝 동작에 이음 마무리
  Run.chains = [];
  for (const ch of CHAINS) {
    const its = ch.seq.map(k => E[k]);
    if (its.every(Boolean)) {
      const el = ITEM[its[0].id].elem;
      if (el !== 'none' && its.every(i => ITEM[i.id].elem === el)) {
        Run.chains.push({ ...ch, elem: el });
        if (el === 'phys') ActMods[ch.end].poise += 0.6;
        else ActMods[ch.end].vs[{ fire: 'burn', ice: 'chill', light: 'shock' }[el]] = (ActMods[ch.end].vs[{ fire: 'burn', ice: 'chill', light: 'shock' }[el]] || 0) + 0.4;
      }
    }
  }
  s.dashCd = s.dashCd * (1 + (ActMods.dash.dashCd || 0));
  s.maxHp = Math.round(s.maxHp * (1 + s.maxHpMul));
  s.atkSpd = Math.max(0.5, s.atkSpd);
  St = s;
  if (Run.hp > St.maxHp) Run.hp = St.maxHp;
}

// ───────── 플레이어 ─────────
const P = {
  x: 0, y: 0, vx: 0, vy: 0, r: 18, face: 0,
  act: null, combo: 0, comboGap: 0, buffer: 0,
  dashT: 0, dashCharges: 1, dashRe: 0, dashAfter: 0, dashDir: 0, iframe: 0, galeT: 0,
  parryT: 0, parryLock: 0, whiffAt: -9, counterT: 0, guardT: 0, chainStacks: 0, chainT: 0,
  spinCharges: 1, spinRe: 0, ult: 0, cycleT: 0, hurtT: 0, alive: true,
  usedFlash: {},
};
function resetPlayer(x, y) {
  Object.assign(P, { x, y, vx: 0, vy: 0, act: null, combo: 0, comboGap: 0, buffer: 0, dashT: 0, dashRe: 0, dashAfter: 0, iframe: 0.6, galeT: 0,
    parryT: 0, parryLock: 0, whiffAt: -9, counterT: 0, guardT: 0, chainStacks: 0, chainT: 0, spinRe: 0, cycleT: 0, hurtT: 0, alive: true, usedFlash: {},
    trail: [], sqK: 0, sqA: 0, hits: 0, hitT: 0, hitPop: 0 });
  P.dashCharges = Run.augs.overcharge ? 2 : 1; P.spinCharges = Run.augs.overcharge ? 2 : 1;
}
const SWINGS = [
  // 하데스식: 짧은 선딜·후딜, 타마다 분명한 전진 스텝, 휘두르는 동안 이동 입력은 무시(스텝이 대신), 대시·패링으로 언제든 취소
  { k: 'a1', wind: 0.05, active: 0.08, rec: 0.11, range: 100, arc: 1.9, dmg: 14, poise: 12, kb: 160, lunge: 230 },
  { k: 'a2', wind: 0.05, active: 0.08, rec: 0.11, range: 100, arc: 1.9, dmg: 16, poise: 14, kb: 180, lunge: 240 },
  { k: 'a3', wind: 0.10, active: 0.10, rec: 0.24, range: 128, arc: 2.8, dmg: 28, poise: 34, kb: 520, lunge: 360 },
];
let gameTime = 0;
function aimAngle() {
  if (Input.bot && Input.bot.aim != null) return Input.bot.aim;
  if (performance.now() - Input.mouseMoved < 4000) { const w = screenToWorld(Input.mx, Input.my); return Math.atan2(w.y - P.y, w.x - P.x); }
  return P.face;
}
function moveInput() {
  let mx = 0, my = 0;
  if (Input.isDown('w') || Input.isDown('ArrowUp')) my -= 1;
  if (Input.isDown('s') || Input.isDown('ArrowDown')) my += 1;
  if (Input.isDown('a') || Input.isDown('ArrowLeft')) mx -= 1;
  if (Input.isDown('d') || Input.isDown('ArrowRight')) mx += 1;
  const l = Math.hypot(mx, my); return l ? { x: mx / l, y: my / l } : { x: 0, y: 0 };
}

function updatePlayer(dt) {
  if (!P.alive) return;
  const mv = moveInput();
  P.iframe -= dt; P.parryT -= dt; P.parryLock -= dt; P.counterT -= dt; P.guardT -= dt; P.chainT -= dt; P.galeT -= dt; P.cycleT -= dt; P.hurtT -= dt; P.dashAfter -= dt; P.buffer -= dt;
  if (P.chainT <= 0) P.chainStacks = 0;
  P.comboGap += dt;
  P.perfectT = (P.perfectT || 0) - dt; if (P.perfectT <= 0) P.perfect = false;
  P.sqK *= Math.exp(-dt * 14); P.hitPop = Math.max(0, P.hitPop - dt); P.hitT -= dt; if (P.hitT <= 0) P.hits = 0;
  for (const t of P.trail) t.life -= dt; P.trail = P.trail.filter(t => t.life > 0);
  const maxDash = Run.augs.overcharge ? 2 : 1, maxSpin = Run.augs.overcharge ? 2 : 1;
  if (P.dashCharges < maxDash) { P.dashRe += dt; if (P.dashRe >= St.dashCd) { P.dashCharges++; P.dashRe = 0; } }
  if (P.spinCharges < maxSpin) { P.spinRe += dt; if (P.spinRe >= 6) { P.spinCharges++; P.spinRe = 0; } }

  const atkPress = Input.hit('mouse0') || Input.hit('j');
  const parryPress = Input.hit('mouse2') || Input.hit('k');
  const dashPress = Input.hit(' ') || Input.hit('l') || Input.hit('Shift');
  const spinPress = Input.hit('q') || Input.hit('u');
  const ultPress = Input.hit('r') || Input.hit('i');
  if (atkPress) P.buffer = 0.25;
  P.parryBuf = (P.parryBuf || 0) - dt; if (parryPress) P.parryBuf = P.parryLock > 0 ? 0 : 0.2; // 대시·휘두름 중에 눌러도 0.2초 안에 발동

  // 대시
  const cancelable = !P.act || ['swing', 'thrust', 'parryWhiff'].includes(P.act.type) || P.act.phase === 'rec'; // 대시·패링은 평타 어느 단계에서든 취소
  if (dashPress && P.dashCharges > 0 && P.dashT <= 0 && cancelable) {
    P.dashCharges--; P.dashRe = 0;
    P.dashDir = (mv.x || mv.y) ? Math.atan2(mv.y, mv.x) : aimAngle();
    P.dashT = 0.16; P.iframe = Math.max(P.iframe, 0.2); P.act = null; P.dashAfter = 0.32;
    if (Run.augs.gale) P.galeT = 1.16;
    Sfx.dash(); FX.burst(P.x, P.y, '#9fe8ff', 8, 120, 0.3, 5); FX.burst(P.x, P.y + 12, '#8a8296', 10, 160, 0.35, 6);
    P.sqK = 0.45; P.sqA = P.dashDir; FX.ring(P.x, P.y, 6, 40, '#9fe8ff', 0.2, 3);
  }
  if (P.dashT > 0) {
    P.dashT -= dt; const sp = 950;
    P.vx = Math.cos(P.dashDir) * sp; P.vy = Math.sin(P.dashDir) * sp;
    P.trail.push({ x: P.x, y: P.y, life: 0.22, max: 0.22, col: '#7fe0ff' });
    moveBody(P, dt);
    return;
  }

  // 패링 (공격 후딜 중에도 끊을 수 있음, 궁극기 중 불가)
  if (P.parryBuf > 0 && P.parryLock <= 0 && cancelable && !(P.act && P.act.type === 'parry')) {
    P.parryBuf = 0;
    const halved = gameTime - P.whiffAt < 0.5;
    P.parryT = St.parryWin * (halved ? 0.5 : 1);
    P.act = { type: 'parry', t: 0, dur: P.parryT };
    P.face = aimAngle(); P.vx *= 0.3; P.vy *= 0.3;
    // 누르는 순간 바로 보이고 들리게
    Sfx.raise(); FX.ring(P.x, P.y, P.r + 6, P.r + 30, '#ffffff', 0.12, 5); P.sqK = -0.18; P.sqA = P.face;
  }

  if (P.act) {
    const a = P.act; a.t += dt;
    if (a.type === 'swing') {
      const sw = a.sw, sp = St.atkSpd;
      const tw = sw.wind / sp, ta = sw.active / sp, tr = sw.rec / sp;
      const sa = a.stepAng != null ? a.stepAng : a.ang;
      if (a.phase === 'wind') { const sv = sw.lunge * 0.5; P.vx = Math.cos(sa) * sv; P.vy = Math.sin(sa) * sv; }
      if (a.phase === 'wind' && a.t >= tw) {
        a.phase = 'active'; a.t = 0; const i3 = sw.k === 'a3';
        Sfx.swing(i3 ? 0.7 : sw.k === 'a2' ? 1.15 : 1); fireWaves(a);
        FX.slash(P.x, P.y, a.ang, sw.arc * 1.05, sw.range + P.r - 6, a.counter ? '#ffd27a' : i3 ? '#dff6ff' : '#eef6ff', a.counter ? 16 : i3 ? 14 : 9, i3 ? 0.24 : 0.16, P);
        P.sqK = i3 ? 0.32 : 0.2; P.sqA = a.ang; Juice.kickDir(a.ang, i3 ? 4 : 2);
        if (i3) FX.burst(P.x + Math.cos(a.ang) * 30, P.y + Math.sin(a.ang) * 30 + 10, '#8a8296', 8, 180, 0.3, 5);
      }
      else if (a.phase === 'active') {
        const k = clamp(a.t / ta, 0, 1); const sv = sw.lunge * (1 - k) * 2.4;
        P.vx = Math.cos(sa) * sv; P.vy = Math.sin(sa) * sv;
        swingHits(a);
        if (a.t >= ta) { a.phase = 'rec'; a.t = 0; }
      } else if (a.phase === 'rec') {
        P.vx *= 0.75; P.vy *= 0.75;
        if (a.t >= tr) { P.act = null; P.comboGap = 0; }
      }
    } else if (a.type === 'thrust') {
      const k = a.t / 0.18; P.vx = Math.cos(a.ang) * 820 * (1 - k); P.vy = Math.sin(a.ang) * 820 * (1 - k);
      swingHits(a);
      if (a.t >= 0.26) { P.act = null; P.comboGap = 0.3; }
    } else if (a.type === 'parry') {
      P.vx *= 0.6; P.vy *= 0.6;
      if (P.parryT <= 0) { // 헛패링
        P.act = { type: 'parryWhiff', t: 0, phase: 'rec' }; P.parryLock = 0.35; P.whiffAt = gameTime;
      }
    } else if (a.type === 'parryWhiff') {
      P.vx *= 0.6; P.vy *= 0.6; if (a.t >= 0.35) P.act = null;
    } else if (a.type === 'spin') {
      P.vx *= 0.85; P.vy *= 0.85;
      if (a.t >= 0.05 && !a.h1) { a.h1 = true; spinHit(); }
      if (a.t >= 0.22 && !a.h2) { a.h2 = true; spinHit(); }
      if (a.t >= 0.4) P.act = null;
    } else if (a.type === 'ult') {
      P.vx = 0; P.vy = 0;
      if (a.t >= 0.25 && !a.done) { a.done = true; ultBurst(); }
      if (a.t >= 0.55) P.act = null;
    }
  }

  // 공격 시작
  const free = !P.act || (P.act.type === 'swing' && P.act.phase === 'rec' && P.act.t > 0.02);
  if (P.buffer > 0 && free && P.parryLock <= 0) {
    P.buffer = 0; const ang = aimAngle(); P.face = ang;
    const isCounter = P.counterT > 0;
    if (P.dashAfter > 0 && !isCounter) {
      P.act = { type: 'thrust', t: 0, ang, hitSet: new Set(), act: 'dash', counter: false, dmg: 22, poise: 20, kb: 300, range: 70 };
      usePerfect(P.act);
      P.dashAfter = 0; Sfx.swing();
    } else {
      if (P.comboGap > 0.5 || !(P.act && P.act.type === 'swing')) { if (P.comboGap > 0.5) P.combo = 0; }
      const sw = SWINGS[P.combo % 3];
      // 전진 스텝 방향: 조준 70% + 이동 입력 30% (이동하던 쪽으로 밀고 들어가는 느낌)
      let stepAng = ang; if (mv.x || mv.y) { const sx = Math.cos(ang) * 0.7 + mv.x * 0.3, sy = Math.sin(ang) * 0.7 + mv.y * 0.3; stepAng = Math.atan2(sy, sx); }
      P.act = { type: 'swing', sw, phase: 'wind', t: 0, ang, stepAng, hitSet: new Set(), act: sw.k, counter: isCounter };
      usePerfect(P.act);
      if (isCounter) { P.counterT = 0; FX.ring(P.x, P.y, 20, 70, '#ffd27a', 0.25, 4); }
      P.combo = (P.combo + 1) % 3;
    }
  }
  if (spinPress && P.spinCharges > 0 && (!P.act || P.act.phase === 'rec')) {
    P.spinCharges--; P.spinRe = 0; P.act = { type: 'spin', t: 0, hitSet: new Set() }; usePerfect(P.act);
    Sfx.swing(); FX.ring(P.x, P.y, 30, 150, '#cfe8ff', 0.3, 6);
  }
  if (ultPress && P.ult >= 1 && (!P.act || P.act.phase === 'rec')) {
    P.ult = 0; P.act = { type: 'ult', t: 0 }; P.iframe = 0.7;
    Juice.slowmo(0.25, 0.3); FX.ring(P.x, P.y, 10, 80, '#ff9a3d', 0.25, 8);
  }

  // 이동
  if (!P.act || P.act.type === 'parryWhiff' || P.act.type === 'parry') {
    let sp = 300 * St.move * (P.galeT > 0 ? 1.3 : 1); if (P.act) sp *= 0.35;
    P.vx = lerp(P.vx, mv.x * sp, Math.min(1, dt * 18)); P.vy = lerp(P.vy, mv.y * sp, Math.min(1, dt * 18));
    if (mv.x || mv.y) { if (performance.now() - Input.mouseMoved > 4000 && !(Input.bot && Input.bot.aim != null)) P.face = Math.atan2(mv.y, mv.x); }
  }
  if (!P.act && performance.now() - Input.mouseMoved < 4000) P.face = aimAngle();
  if (Input.bot && Input.bot.aim != null && !P.act) P.face = Input.bot.aim;
  moveBody(P, dt);
}

function swingHits(a) {
  const isThrust = a.type === 'thrust';
  const sw = a.sw || { range: a.range, arc: 1.2, dmg: a.dmg, poise: a.poise, kb: a.kb };
  for (const e of World.enemies) {
    if (e.dead || a.hitSet.has(e)) continue;
    const d = dist(P, e) - e.r;
    if (d > sw.range) continue;
    if (!isThrust && Math.abs(angDiff(a.ang, angTo(P, e))) > sw.arc / 2 && d > 20) continue;
    if (isThrust && Math.abs(angDiff(a.ang, angTo(P, e))) > 1.0 && d > 15) continue;
    a.hitSet.add(e);
    // 방패병: 정면 방어. 3타, 대시 찌르기, 반격은 방패를 깸
    if (e.def.shield && e.shieldUp && Math.abs(angDiff(e.face, angTo(e, P))) < 1.2) {
      if (a.act === 'a3' || isThrust || a.counter) { e.shieldUp = false; e.shieldDown = 3; FX.text(e.x, e.y - 30, '방패 깨짐', '#cfe0ff'); Sfx.crit(); }
      else { FX.spark(e.x, e.y, angTo(e, P), '#b8c8e0', 6, 300); Sfx.parry(); Juice.hitstop(0.03); SpriteFX.spawn('hit-spark', e.x, e.y, e.r, { ang: angTo(e, P), scale: 0.8 }); continue; }
    }
    dealDamage(e, { base: sw.dmg, act: a.act, gen: 0, ang: a.ang, kb: sw.kb, poise: sw.poise, counter: a.counter, parried: P.lastParriedPow || 0 });
  }
}
function spinHit() {
  for (const e of World.enemies) {
    if (e.dead) continue;
    if (dist(P, e) - e.r < 145) dealDamage(e, { base: 18, act: 'spin', gen: 0, ang: angTo(P, e), kb: 360, poise: 26 });
  }
  Juice.kick(6);
}
function ultBurst() {
  Sfx.boom(); Juice.kick(22); Juice.hitstop(0.12); Juice.punch(0.06); Juice.screen('#ff9a3d', 0.15);
  FX.ring(P.x, P.y, 20, 360, '#ff9a3d', 0.5, 14); FX.burst(P.x, P.y, '#ffb36b', 60, 600, 0.7, 7);
  for (const e of World.enemies) {
    if (e.dead) continue;
    if (dist(P, e) - e.r < 340) dealDamage(e, { base: 90, act: 'ult', gen: 0, ang: angTo(P, e), kb: 700, poise: 90 });
  }
  if (Run.augs.cycle) P.cycleT = 5;
}
// 꿰뚫기·갈래: 3타와 반격이 검기를 날림
function fireWaves(a) {
  if (!(a.act === 'a3' || a.counter)) return;
  const pl = Run.augs.pierce || 0, fl = Run.augs.fork || 0;
  if (!pl && !fl) return;
  const storm = Run.syn.has('bladestorm');
  const mk = (ang, pow, pierce) => World.projs.push({ owner: 'player', x: P.x + Math.cos(ang) * 30, y: P.y + Math.sin(ang) * 30, vx: Math.cos(ang) * 900, vy: Math.sin(ang) * 900,
    r: storm ? 24 : 16, life: 0.55, dmg: (a.sw ? a.sw.dmg : 20) * pow * (storm ? 1.3 : 1), col: '#dff6ff', pierce, hitSet: new Set(), gen: 1, wave: true, act: a.act });
  if (pl) mk(a.ang, [0.5, 0.8, 1.1][pl - 1] * (a.act === 'a3' && Run.syn.has('finisherwave') ? 1.5 : 1), true);
  else if (fl) mk(a.ang, 0.4, false);
  for (let i = 1; i <= fl; i++) { mk(a.ang + 0.35 * i, 0.4, !!pl); mk(a.ang - 0.35 * i, 0.4, !!pl); }
}

// ───────── 피해 계산 ─────────
const FLAME = [0, 0.3, 0.6, 1], CUT = [0, 0.15, 0.2, 0.25], ECHO = [0, 0.25, 0.4, 0.55], BRAND = [0, 0.6, 0.9, 1.2];
function pickElem(o) {
  if (o.elem) return o.elem;
  const A = Run.augs; const opts = [];
  if (A.flame) opts.push(['fire', FLAME[A.flame]]);
  if (A.frost) opts.push(['ice', FLAME[A.frost]]);
  if (A.thunder) opts.push(['light', FLAME[A.thunder]]);
  shuffle(opts);
  for (const [el, p] of opts) if (R() < p) return el;
  return 'phys';
}
function hasVs(e, k) {
  if (k === 'burn') return e.burn > 0;
  if (k === 'chill') return e.chill > 0 || e.frozen > 0;
  if (k === 'shock') return e.shocked > 0;
  if (k === 'elite') return e.elite || e.boss;
  if (k === 'groggy') return e.groggy > 0;
  return false;
}
function dealDamage(e, o) {
  if (e.dead) return 0;
  const A = Run.augs; const gen = o.gen || 0;
  const elem = pickElem(o);
  const mods = blankEff();
  if (o.act && ActMods[o.act]) addEff(mods, ActMods[o.act], 1);
  if (o.counter) addEff(mods, ActMods.counter, 1);
  let mult = 1 + St.dmg + mods.dmg;
  if (elem === 'phys') mult += St.physDmg;
  if (elem === 'fire') mult += St.fireDmg;
  for (const k in mods.vs) if (hasVs(e, k)) mult += mods.vs[k];
  if (hasVs(e, 'chill')) mult += St.chillAmp;
  if (P.cycleT > 0) mult += 0.3;
  if (A.finisher && o.act === 'a3') mult += 0.6;
  if (A.gale && o.act === 'dash') mult += 0.5;
  if (o.counter) { mult *= 2; if (A.chainparry) mult *= 1 + 0.3 * P.chainStacks; }
  const perfectHit = gen === 0 && P.act && P.act.perfect && !o.echo; if (perfectHit) mult *= 1 + St.perfectBonus;
  if (e.groggy > 0) mult *= 1.5;
  if (e.def.weak === elem) mult *= 1.25; else if (e.def.res === elem) mult *= 0.75;
  if (A.frost && elem === 'ice' && e.boss && e.chill >= 4) mult *= 1.3;
  if (World.mods.includes('chief') && e.chief) mult *= 0.8;
  let dmg = o.base * mult;
  if (o.counter && A.repay && o.parried) dmg += o.parried * (Run.syn.has('master') && P.chainStacks >= 2 ? 2.5 : 1.5);
  if (o.burnTick && e.shocked > 0 && Run.syn.has('overheat')) dmg *= 1.5;
  let crit = St.crit + mods.crit; for (const c of mods.critCond) if (hasVs(e, c.vs)) crit += c.v;
  const isCrit = o.counter || o.forceCrit || (gen === 0 && R() < crit);
  if (isCrit) dmg *= St.critDmg;
  // 결정타 (그로기 중 첫 타격)
  let finisher = false;
  if (e.groggy > 0 && !e.finished && gen === 0) {
    e.finished = true; finisher = true;
    dmg += e.maxHp * (e.boss ? 0.04 : 0.08) * (A.groggyhunt ? 2 : 1);
    Juice.hitstop(0.18); Juice.kick(16); Juice.punch(0.07); Sfx.gold(); Sfx.thud(); Juice.slowmo(0.4, 0.3); Juice.impactFrame(0.06, '#ffd27a'); Juice.ab(0.2);
    FX.radial(e.x, e.y, '#ffd27a', 24, e.r, 9); FX.ring(e.x, e.y, e.r, e.r + 140, '#ffd27a', 0.45, 10); splat(e.x, e.y, '#000', e.r + 40, 'crack');
    FX.text(e.x, e.y - 60, '결정타', '#ffd27a', true);
  }
  // 끊어내기
  if (A.cut && gen <= 1) {
    const th = CUT[A.cut] + (Run.syn.has('executioner') && e.groggy > 0 ? 0.1 : 0);
    if (!e.boss && (e.hp - dmg) / e.maxHp <= th && e.hp > 0) { dmg = e.hp; FX.text(e.x, e.y - 50, '끊어내기', '#ff6b6b'); }
    else if (e.boss && e.hp / e.maxHp <= th && gameTime - (e.cutAt || -9) > 3) { e.cutAt = gameTime; dmg += e.maxHp * 0.05; FX.text(e.x, e.y - 50, '끊어내기', '#ff6b6b'); }
  }
  dmg = Math.max(1, Math.round(dmg));
  e.hp -= dmg; e.flash = 0.1;
  Run.maxHit = Math.max(Run.maxHit, dmg);
  const col = isCrit ? '#fff1a8' : ELEM[elem].col;
  FX.text(e.x, e.y - e.r - 10, dmg + (isCrit ? '!' : ''), col, isCrit && dmg > 60);
  if (gen === 0) {
    const heavy = o.act === 'a3' || o.act === 'spin' || o.act === 'ult' || o.counter;
    Juice.hitstop(o.counter ? 0.11 : isCrit ? 0.08 : heavy ? 0.065 : o.act === 'a2' ? 0.05 : 0.04);
    const ka = o.ang != null ? o.ang : angTo(P, e); Juice.kickDir(ka, o.counter ? 14 : isCrit ? 9 : heavy ? 7 : 4);
    SpriteFX.hit(e, ka, isCrit || o.counter, heavy);
    e.shk = 0.15; e.sqK = heavy ? 0.4 : 0.28; e.sqA = ka;
    P.hits++; P.hitT = 1.6; P.hitPop = 0.12;
    if (perfectHit && !P.act.perfectShown) { P.act.perfectShown = true; FX.text(e.x, e.y - 60, `퍼펙트 +${Math.round(St.perfectBonus * 100)}%`, '#9ffcff', true); FX.radial(e.x, e.y, '#9ffcff', 16, e.r, 8); FX.ring(e.x, e.y, e.r, e.r + 90, '#9ffcff', 0.3, 6); Juice.hitstop(0.13); Juice.impactFrame(0.04, '#9ffcff'); Sfx.gold(); }
    if (o.counter) { Sfx.thud(); Juice.impactFrame(0.04, '#ffd27a'); Juice.ab(0.12); Juice.punch(0.05); FX.radial(e.x, e.y, '#ffd27a', 14, e.r, 7); FX.slash(e.x, e.y, ka + Math.PI / 2, 0.9, e.r + 26, '#ffd27a', 12, 0.2); }
    else if (isCrit) { Sfx.crit(); FX.radial(e.x, e.y, '#fff1a8', 8, e.r, 5); if (dmg > 60) Juice.ab(0.06); }
    else Sfx.hit(o.act === 'a3' ? 0.75 : o.act === 'a2' ? 1.15 : 1);
    FX.burst(e.x, e.y, e.def.col, heavy ? 10 : 5, heavy ? 360 : 240, 0.35, 4);
    FX.spark(e.x, e.y, o.ang || 0, col, isCrit ? 10 : 6, 420);
    P.ult = Math.min(1, P.ult + dmg * 0.0009 * St.ultGain);
  }
  // 넉백
  if (o.kb && !(e.def.armor && !e.groggy && !e.staggerT) && !e.boss) {
    const a = o.ang != null ? o.ang : angTo(P, e); const k = o.kb * (e.elite ? 0.6 : 1);
    e.vx += Math.cos(a) * k; e.vy += Math.sin(a) * k; e.kbT = 0.25;
  }
  // 포이즈·체간
  let poise = (o.poise || dmg * 0.3) * (1 + St.poise + mods.poise);
  for (const c of mods.poiseCond) if (hasVs(e, c.vs)) poise *= 1 + c.v;
  if (e.stanceMax) {
    let add = poise * 0.55 * (1 + St.stance) * (elem === 'phys' ? 1.3 : 1);
    if (gen > 0) add *= 0.4;
    addStance(e, add);
  } else if (gen === 0 || o.poise) {
    e.poiseDmg += poise;
    if (e.poiseDmg >= e.def.poise) { e.poiseDmg = 0; e.staggerT = 0.45; e.cancelAttack && e.cancelAttack(); }
  }
  // 상태 이상 (증강이 만든 속성일 때만)
  if (elem === 'fire' && !o.noStatus) { e.burn = Math.min(5, e.burn + 1); e.burnT = 3; }
  if (elem === 'ice' && !o.noStatus) {
    e.chillT = 3; e.chill = Math.min(5, e.chill + 1);
    if (e.chill >= 5 && !e.boss && e.freezeImm <= 0) { e.frozen = 1.5; e.chill = 0; e.freezeImm = 3.5; FX.text(e.x, e.y - 40, '빙결', '#bfefff'); e.cancelAttack && e.cancelAttack();
      if (Run.syn.has('thermal') && e.burn > 0) { const pw = e.burn * 12; FX.text(e.x, e.y - 64, '열충격', '#ffb36b', true); FX.ring(e.x, e.y, 10, 130, '#ffb36b', 0.35, 8); Sfx.boom(); for (const t of World.enemies) if (!t.dead && dist(t, e) < 130 + t.r) later(0.03, () => dealDamage(t, { base: pw, gen: 2, elem: 'fire', noStatus: true, ang: angTo(e, t), kb: 260 })); } }
  }
  if (elem === 'light' && !o.noStatus) {
    e.shocked = 3;
    if (gen <= 1 && !o.noLightChain) {
      const n = (A.thunder || 0) + Math.round(St.shockBounce) + (Run.syn.has('supercond') && (e.chill > 0 || e.frozen > 0) ? 1 : 0);
      const near = World.enemies.filter(x => !x.dead && x !== e && dist(x, e) < 240).sort((p, q) => dist(p, e) - dist(q, e)).slice(0, n);
      for (const t of near) {
        World.bolts.push({ x1: e.x, y1: e.y, x2: t.x, y2: t.y, life: 0.15 }); SpriteFX.bolt(t.x, t.y, t.r);
        const base = dmg * 0.4 * (1 + St.lightPow / 100);
        later(0.05, () => dealDamage(t, { base, gen: gen + 1, elem: 'light', ang: angTo(e, t), noStatus: false, noLightChain: true }));
      }
    }
  }
  envReact(e, elem, dmg, gen);
  // 낙인
  if (A.brand && (gen === 0 || (o.echo && Run.syn.has('doublebrand'))) && !o.noBrand) {
    e.brand = (e.brand || 0) + 1;
    if (e.brand >= 3) {
      e.brand = 0; const pw = BRAND[A.brand];
      FX.ring(e.x, e.y, 10, 100, '#ff5bd1', 0.3, 6); Sfx.boom();
      for (const t of World.enemies) if (!t.dead && dist(t, e) < 100 + t.r) later(0.02, () => dealDamage(t, { base: o.base * pw, gen: 1, ang: angTo(e, t), noBrand: true }));
    }
  }
  // 메아리
  if (A.echo && gen <= 1 && !o.echo && R() < ECHO[A.echo]) {
    later(0.2, () => { if (!e.dead) { FX.text(e.x, e.y - 70, '메아리', '#e78bff'); dealDamage(e, { ...o, base: o.base * 0.5, gen: gen + 1, echo: true, counter: false, forceCrit: false, kb: 0 }); } });
  }
  if (e.hp <= 0) { if (o.act === 'dash' && Run.syn.has('galecharge') && P.spinCharges < 2) { P.spinCharges++; FX.text(P.x, P.y - 50, '질풍 충전', '#9fe8ff'); } killEnemy(e, finisher); }
  return dmg;
}
function addStance(e, v) {
  if (e.groggy > 0) return;
  e.stance += v; e.stanceIdle = 0;
  if (e.stance >= e.stanceMax) {
    e.stance = 0; e.groggy = (e.boss ? 2 : 3) + (Run.augs.groggyhunt ? 1 : 0); e.finished = false;
    if (e.boss) e.stanceMax *= 1.2;
    e.cancelAttack && e.cancelAttack();
    Run.groggies++; Sfx.groggy(); Juice.kick(10); FX.text(e.x, e.y - e.r - 30, '그로기', '#ffd27a', true);
    FX.ring(e.x, e.y, e.r, e.r + 80, '#ffd27a', 0.4, 6);
  }
}

// 지연 실행 (메아리, 연쇄 번개 등)
let Later = [];
function later(t, fn) { Later.push({ t, fn }); }
function updateLater(dt) { const run = []; Later = Later.filter(l => { l.t -= dt; if (l.t <= 0) { run.push(l.fn); return false; } return true; }); run.forEach(f => f()); }

// ───────── 플레이어가 맞을 때 ─────────
// hit: {dmg, color: 'white'|'gold'|'red', src: 적, proj: 투사체}
function playerHit(h) {
  if (!P.alive) return 'none';
  const parryable = h.color !== 'red' || Run.augs.redsteel;
  if (P.parryT > 0 && parryable) { parrySuccess(h); return 'parry'; }
  if (P.iframe > 0) return 'dodge';
  let dmg = h.dmg * St.dmgTaken;
  if (P.guardT > 0) dmg *= 1 - Math.min(0.6, ActMods.parry.guard);
  dmg = Math.max(1, Math.round(dmg));
  Run.hp -= dmg; P.iframe = 0.5; P.hurtT = 0.2;
  Sfx.hurt(); Juice.kick(12); Juice.ab(0.12); P.sqK = -0.3; P.hits = 0; Juice.hitstop(0.06); Juice.screen('#ff3b3b', 0.12);
  FX.text(P.x, P.y - 30, '-' + dmg, '#ff6b6b'); FX.burst(P.x, P.y, '#ff5a5a', 14, 260, 0.4, 5);
  const a = h.src ? angTo(h.src, P) : (h.proj ? Math.atan2(h.proj.vy, h.proj.vx) : 0);
  P.vx += Math.cos(a) * 320; P.vy += Math.sin(a) * 320;
  if (P.act && P.act.type !== 'ult') P.act = null;
  if (Run.hp <= 0) { Run.hp = 0; P.alive = false; Juice.slowmo(1.2, 0.25); later(1.0, () => endRun(false)); }
  return 'hit';
}
function usePerfect(act) { if (P.perfect) { act.perfect = true; P.perfect = false; P.perfectT = 0; FX.slash(P.x, P.y, act.ang != null ? act.ang : P.face, 2.4, 90, '#9ffcff', 14, 0.22, P); } }
function parrySuccess(h) {
  const elapsed = P.act && P.act.type === 'parry' ? P.act.dur - P.parryT : 9;
  const perfect = elapsed <= St.perfectWin;
  P.parryT = 0; P.act = null; P.counterT = 0.6; P.iframe = Math.max(P.iframe, 0.2);
  P.lastParriedPow = h.dmg; Run.parries++;
  if (ActMods.parry.guard) P.guardT = 2;
  if (P.chainT > 0) P.chainStacks = Math.min(3, P.chainStacks + 1); P.chainT = 4;
  P.ult = Math.min(1, P.ult + 0.08 * St.ultGain);
  const sx = h.src ? lerp(P.x, h.src.x, 0.4) : P.x, sy = h.src ? lerp(P.y, h.src.y, 0.4) : P.y;
  Juice.hitstop(h.color === 'gold' ? 0.2 : 0.1); Juice.punch(h.color === 'gold' ? 0.06 : 0.035); Juice.kick(8); Juice.ab(h.color === 'gold' ? 0.18 : 0.09);
  if (h.color === 'gold') Juice.impactFrame(0.05, '#ffd27a');
  FX.radial(lerp(P.x, h.src ? h.src.x : P.x, 0.4), lerp(P.y, h.src ? h.src.y : P.y, 0.4), h.color === 'gold' ? '#ffd27a' : '#ffffff', h.color === 'gold' ? 22 : 12, 10, 6);
  P.sqK = -0.25; P.sqA = P.face;
  FX.spark(sx, sy, R() * 6, '#fff6c9', 18, 520); FX.ring(sx, sy, 8, 70, h.color === 'gold' ? '#ffd27a' : '#ffffff', 0.25, 5);
  h.color === 'gold' ? Sfx.gold() : Sfx.parry();
  SpriteFX.parry(lerp(P.x, h.src ? h.src.x : P.x, 0.4), lerp(P.y, h.src ? h.src.y : P.y, 0.4), h.color === 'gold');
  if (perfect) {
    P.perfect = true; P.perfectT = 2.0; Run.perfects = (Run.perfects || 0) + 1;
    FX.text(P.x, P.y - 40, h.color === 'gold' ? '퍼펙트 금색 패링' : '퍼펙트 패링', '#9ffcff', true);
    Juice.hitstop(h.color === 'gold' ? 0.26 : 0.16); Juice.slowmo(0.3, 0.35); Juice.impactFrame(0.05, '#9ffcff'); Juice.ab(0.2);
    FX.ring(sx, sy, 10, 120, '#9ffcff', 0.35, 7); FX.radial(sx, sy, '#9ffcff', 20, 12, 7); SpriteFX.parry(sx, sy, true); Sfx.gold(); Sfx.raise();
  } else FX.text(P.x, P.y - 40, h.color === 'gold' ? '금색 패링' : '패링', h.color === 'gold' ? '#ffd27a' : '#ffffff', h.color === 'gold');
  const e = h.src;
  if (h.proj) { // 반사
    const pr = h.proj; const a = e && !e.dead ? angTo(P, e) : Math.atan2(-pr.vy, -pr.vx);
    pr.owner = 'player'; pr.vx = Math.cos(a) * 820; pr.vy = Math.sin(a) * 820; pr.life = 1.2; pr.gen = 1; pr.hitSet = new Set(); pr.dmg = pr.dmg * 2.2; pr.col = '#ffffff'; pr.act = 'parry';
  }
  if (e && !e.dead) {
    const pm = 1 + ActMods.parry.poise + St.poise;
    let pc = 1; for (const c of ActMods.parry.poiseCond) if (hasVs(e, c.vs)) pc += c.v;
    if (e.stanceMax) {
      if (h.color === 'gold') addStance(e, e.stanceMax * 2);
      else addStance(e, e.stanceMax * (e.boss ? 0.15 : 0.25) * pm * pc * (1 + St.stance));
    } else if (!h.proj) {
      e.staggerT = h.color === 'gold' ? 1.2 : 0.6; e.poiseDmg = 0;
      e.vx += Math.cos(angTo(P, e)) * 260; e.vy += Math.sin(angTo(P, e)) * 260;
    }
    e.cancelAttack && e.cancelAttack();
  }
  if (h.color === 'gold') Run.golds++;
}

function moveBody(b, dt) {
  b.x += b.vx * dt; b.y += b.vy * dt;
  const A = World.arena; const r = b.r;
  let wall = false;
  if (b.x < r) { b.x = r; wall = true; } if (b.x > A.w - r) { b.x = A.w - r; wall = true; }
  if (b.y < r) { b.y = r; wall = true; } if (b.y > A.h - r) { b.y = A.h - r; wall = true; }
  for (const pl of A.pillars) {
    const d = Math.hypot(b.x - pl.x, b.y - pl.y), m = pl.r + r;
    if (d < m && d > 0) { b.x = pl.x + (b.x - pl.x) / d * m; b.y = pl.y + (b.y - pl.y) / d * m; wall = true; }
  }
  return wall;
}
