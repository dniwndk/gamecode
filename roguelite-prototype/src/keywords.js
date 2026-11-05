'use strict';
// ───────── 행동 키워드 (설계: game-design/action-keywords.md) ─────────
// 키워드를 행동 4개(평타·특수공격·패링·대시)에 붙여요. 같은 키워드도 붙인 행동마다 효과가 달라요.
// 한 행동의 두 칸에 섞이는 두 기본 키워드가 있으면 합성해서 한 칸짜리 합성 키워드가 돼요(물리 현상 기준).
// 적에게 남은 상태끼리도 같은 합성표로 반응해요(물에 젖은 적 + 전기 = 전도).

const ACTS = [
  { k: 'atk', name: '평타', key: '좌클릭 / J' },
  { k: 'spin', name: '특수공격', key: 'Q' },
  { k: 'parry', name: '패링', key: '우클릭 / K' },
  { k: 'dash', name: '대시', key: 'Space' },
];
const ACT = Object.fromEntries(ACTS.map(a => [a.k, a]));
const KW_LV = [0, 1, 1.5, 2];

// 기본 키워드 8종 (4.3 효과표)
const KW_BASE = [
  { id: 'dup', name: '복제', col: '#e3c8ff', phys: '수(개수)', st: null,
    d: { atk: '한 박자 늦게 잔상이 같은 적을 한 번 더 베요 (50%)', spin: '회전베기가 한 바퀴 더 돌아요 (60%)', parry: '패링 뒤 반격이 2번까지 반격으로 쳐져요', dash: '시작 자리에 분신이 1.2초 남아 적의 주의를 끌어요' },
    pair: '같은 행동에 다른 키워드가 있으면 그 효과를 한 번 더 내요' },
  { id: 'fire', name: '화염', col: '#ff8a3d', phys: '열을 더함', st: 'burn',
    d: { atk: '맞은 적이 화상을 입어요', spin: '회전한 자리에 2초 동안 불 고리가 남아요', parry: '성공 순간 공격자 앞에서 작은 폭발이 나요', dash: '지나간 경로에 불길이 1.5초 남아요' } },
  { id: 'cold', name: '냉기', col: '#7fd8ff', phys: '열을 뺌', st: 'chill',
    d: { atk: '냉각이 쌓이고, 3번이면 1초 빙결해요', spin: '회전한 자리에 서리 고리가 남아 둔화시켜요', parry: '성공하면 공격자가 즉시 1초 빙결해요', dash: '경로에 얼음판이 생겨 적이 느려져요' } },
  { id: 'water', name: '물', col: '#4aa8ff', phys: '액체', st: 'wet',
    d: { atk: '맞은 적이 젖어요 (다른 원소 반응 준비, 이동 -10%)', spin: '소용돌이가 주변 적을 안으로 끌어당겨요', parry: '성공 순간 주변 적이 젖고 체력을 조금 회복해요', dash: '대시 거리 +30%, 경로의 적이 젖어요' } },
  { id: 'wind', name: '바람', col: '#a8f0c8', phys: '기체의 흐름', st: null,
    d: { atk: '검풍으로 사거리 +60, 맞은 적을 살짝 밀어요', spin: '회오리가 적을 바깥으로 날려요', parry: '성공 순간 돌풍이 주변 적 투사체를 날려버려요', dash: '경로의 적을 옆으로 밀고, 대시 쿨다운 -20%' } },
  { id: 'earth', name: '대지', col: '#c49a5a', phys: '고체와 질량', st: null,
    d: { atk: '3타가 바닥을 쳐 앞쪽에 충격파를 일으켜요', spin: '회전 중 바위 파편이 사방으로 튀어요', parry: '패링 판정 +2프레임, 받는 피해 -15%', dash: '대시가 끝나는 자리에 착지 충격이 나요' } },
  { id: 'elec', name: '전기', col: '#ffe45c', phys: '전하', st: 'shock',
    d: { atk: '번개가 가까운 적에게 튀어요 (등급마다 1명)', spin: '전기장이 생겨 주변 적이 감전돼요', parry: '성공하면 공격자에게 전류가 역류해 마비돼요', dash: '대시가 빨라지고 경로의 적이 감전돼요' } },
  { id: 'swift', name: '신속', col: '#9ff0ff', phys: '속도와 시간', st: null,
    d: { atk: '평타 속도 +20%', spin: '회전베기 재사용 시간 -40%', parry: '퍼펙트 패링 구간 +1프레임', dash: '대시를 연달아 2번 쓸 수 있어요' } },
];
// 1단계 합성 19종 (4.4 합성표). 행동별 모양: 평타=맞은 적 자리, 특수=내 주변 크게, 패링=공격자 자리 크게, 대시=지나간 경로 위
const KW_COMP = [
  { id: 'fog', name: '안개', a: 'water', b: 'wind', col: '#cfd8e8', phys: '물방울이 공기에 흩어짐', desc: '안개를 남겨요. 안개 속에 있으면 적이 공격을 못 하고, 내가 안개 속이면 적 공격이 절반 빗나가요' },
  { id: 'steam', name: '증기', a: 'water', b: 'fire', col: '#f0f0f0', phys: '기화와 팽창', desc: '증기 폭발로 밀어내고 화상을 입혀요' },
  { id: 'ice', name: '얼음', a: 'water', b: 'cold', col: '#bfefff', phys: '응고', desc: '얼음 가시가 솟아 빙결시켜요' },
  { id: 'conduct', name: '전도', a: 'water', b: 'elec', col: '#7fc8ff', phys: '물이 전류를 옮김', desc: '주변을 적시고, 젖은 적 전부에게 번개가 퍼져요' },
  { id: 'mud', name: '진흙', a: 'water', b: 'earth', col: '#8a6a44', phys: '흙과 물이 섞임', desc: '늪 장판이 생겨 크게 둔화시켜요' },
  { id: 'hotwind', name: '열풍', a: 'fire', b: 'wind', col: '#ffb36b', phys: '산소 공급과 연소 확산', desc: '불길을 퍼뜨리며 밀어내요' },
  { id: 'lava', name: '용암', a: 'fire', b: 'earth', col: '#ff5a2a', phys: '용융', desc: '오래 남는 용암 장판이 생겨요' },
  { id: 'thermal', name: '열충격', a: 'fire', b: 'cold', col: '#ffd0a0', phys: '급격한 온도 차로 깨짐', desc: '화상이나 냉각 중인 적을 크게 깨뜨려요' },
  { id: 'plasma', name: '플라스마', a: 'fire', b: 'elec', col: '#ff9cf0', phys: '이온화된 기체', desc: '적을 꿰뚫는 고열 광선이 나가요' },
  { id: 'sand', name: '모래폭풍', a: 'wind', b: 'earth', col: '#d9b77a', phys: '침식', desc: '움직이는 모래 소용돌이가 계속 깎아요' },
  { id: 'blizzard', name: '눈보라', a: 'wind', b: 'cold', col: '#dff4ff', phys: '찬 공기의 흐름', desc: '넓은 범위가 서서히 얼어붙어요' },
  { id: 'cloud', name: '뇌운', a: 'wind', b: 'elec', col: '#b8a8ff', phys: '공기 마찰과 방전', desc: '구름이 남아 일정 간격으로 낙뢰를 떨어뜨려요' },
  { id: 'magnet', name: '자력', a: 'earth', b: 'elec', col: '#c0c8d8', phys: '자기장', desc: '적을 한곳으로 끌어모으고 적 투사체를 빨아들여요' },
  { id: 'permafrost', name: '동토', a: 'earth', b: 'cold', col: '#a8d8e8', phys: '얼어붙은 땅', desc: '오래 남는 결빙 지대가 생겨요' },
  { id: 'supercond', name: '초전도', a: 'cold', b: 'elec', col: '#9ffcff', phys: '냉각하면 저항이 0', desc: '냉각·빙결·젖은 적 사이로 번개가 끝없이 튀어요 (같은 적은 한 번)' },
  { id: 'sonic', name: '음속', a: 'swift', b: 'wind', col: '#e8fff4', phys: '소리보다 빠름', desc: '충격파(소닉붐)가 터져 크게 밀어내요' },
  { id: 'momentum', name: '운동량', a: 'swift', b: 'earth', col: '#e0b070', phys: '질량 × 속도', desc: '최근 이동한 거리만큼 커지는 충돌 피해' },
  { id: 'friction', name: '마찰열', a: 'swift', b: 'fire', col: '#ff7a50', phys: '빠른 마찰이 열을 냄', desc: '연속 타격이 많을수록 화상이 크게 쌓여요' },
  { id: 'flash', name: '섬광', a: 'swift', b: 'elec', col: '#fff7a0', phys: '빛의 속도', desc: '번개가 내리꽂히고, 대시에 붙이면 대시가 50% 더 빨라요' },
];
const KW = {}; for (const k of KW_BASE) KW[k.id] = { ...k, kind: 'base' }; for (const k of KW_COMP) KW[k.id] = { ...k, kind: 'comp' };
const KW_FUSE = {}; for (const c of KW_COMP) { KW_FUSE[c.a + '+' + c.b] = c.id; KW_FUSE[c.b + '+' + c.a] = c.id; }
function fuseOf(a, b) { return KW_FUSE[a + '+' + b] || null; }
// 적 상태 → 원소 (반응용)
const ST_ELEM = { burn: 'fire', chill: 'cold', wet: 'water', shock: 'elec' };
const ST_NAME = { burn: '화상', chill: '냉각', wet: '젖음', shock: '감전' };

// ───────── 런 상태 ─────────
function kwInit() {
  Run.kw = { atk: [null, null], spin: [null, null], parry: [null, null], dash: [null, null] };
  Run.kwSlots = { atk: 1, spin: 1, parry: 1, dash: 1 };
  Run.kwBag = []; Run.kwBagMax = 3; Run.kwSeen = new Set();
}
function kwAll(act) { return Run.kw ? Run.kw[act].filter(Boolean) : []; }
function kwLv(act, id) { let l = 0; for (const k of kwAll(act)) if (k.id === id) l = Math.max(l, k.lv); return l; }
function kwOwned() { const out = []; if (!Run.kw) return out; for (const a of ACTS) Run.kw[a.k].forEach((k, i) => k && out.push({ ...k, act: a.k, i })); for (const k of Run.kwBag) out.push({ ...k, act: 'bag' }); return out; }
// 합성 가능한 행동 목록
function kwFusable(act) { const [x, y] = Run.kw[act]; return x && y && KW[x.id].kind === 'base' && KW[y.id].kind === 'base' ? fuseOf(x.id, y.id) : null; }
function kwFuse(act) {
  const id = kwFusable(act); if (!id) return false;
  const [x, y] = Run.kw[act]; const lv = Math.min(3, Math.ceil((x.lv + y.lv) / 2));
  Run.kw[act] = [{ id, lv }, null]; recalc(); return id;
}
// 상점 분리: 합성 키워드 → 재료 둘 (가방으로)
function kwSplit(act, i) {
  const k = Run.kw[act][i]; if (!k || KW[k.id].kind !== 'comp') return false;
  const c = KW[k.id]; Run.kw[act][i] = { id: c.a, lv: k.lv };
  const other = { id: c.b, lv: k.lv };
  const j = Run.kw[act].findIndex((s, n) => !s && n < Run.kwSlots[act]); if (j >= 0) Run.kw[act][j] = other; else Run.kwBag.push(other);
  recalc(); return true;
}
// 키워드 얻기: 가진 것이면 등급 +1 (최대 3), 아니면 자리에 붙이기
function kwGain(id, act) {
  for (const a of ACTS) for (const k of Run.kw[a.k]) if (k && k.id === id) { k.lv = Math.min(3, k.lv + 1); recalc(); return { up: true, act: a.k }; }
  for (const k of Run.kwBag) if (k.id === id) { k.lv = Math.min(3, k.lv + 1); return { up: true, act: 'bag' }; }
  const inst = { id, lv: 1 };
  if (act && act !== 'bag') {
    const slots = Run.kw[act]; const i = slots.findIndex((s, n) => !s && n < Run.kwSlots[act]);
    if (i >= 0) { slots[i] = inst; recalc(); return { act }; }
  }
  if (Run.kwBag.length < Run.kwBagMax) { Run.kwBag.push(inst); return { act: 'bag' }; }
  return { lost: true };
}

// ───────── 능력치에 반영되는 키워드 (recalc 마지막에 호출) ─────────
function kwPassive(s) {
  s.dashSp = 950; s.spinCd = 6; s.dashMax = 1;
  if (!Run.kw) return;
  const L = (a, id) => KW_LV[kwLv(a, id)] || 0;
  s.atkSpd += 0.2 * L('atk', 'swift');
  s.spinCd *= 1 - 0.4 * Math.min(1.5, L('spin', 'swift'));
  s.perfectWin += 0.017 * L('parry', 'swift');
  if (kwLv('dash', 'swift')) s.dashMax = 2;
  s.dashCd *= 1 - 0.2 * Math.min(1.5, L('dash', 'wind'));
  if (kwLv('parry', 'earth')) { s.parryWin += 0.033; s.parryWinBase += 0.033; s.dmgTaken *= 1 - 0.15 * Math.min(1.5, L('parry', 'earth')); }
  if (kwLv('dash', 'water')) s.dashSp *= 1.3;
  if (kwLv('dash', 'elec')) s.dashSp *= 1.25;
  if (kwLv('dash', 'flash')) s.dashSp *= 1.5;
}

// ───────── 전투: 상태 이상과 반응 ─────────
function kwDmg(e, base, elem, extra) {
  if (!e || e.dead) return;
  dealDamage(e, Object.assign({ base, gen: 1, elem: elem || 'phys', noStatus: true, kwFx: true, ang: angTo(P, e) }, extra || {}));
}
function hasSt(e, st) {
  if (st === 'burn') return e.burn > 0; if (st === 'chill') return e.chill > 0 || e.frozen > 0;
  if (st === 'wet') return (e.wet || 0) > 0; if (st === 'shock') return e.shocked > 0; return false;
}
function clearSt(e, st) { if (st === 'burn') e.burn = 0; if (st === 'chill') { e.chill = 0; } if (st === 'wet') e.wet = 0; if (st === 'shock') e.shocked = 0; }
function freezeE(e, t) {
  if (e.boss) { e.staggerT = Math.max(e.staggerT || 0, 0.3); return; }
  if (e.freezeImm > 0) return;
  e.frozen = t; e.chill = 0; e.freezeImm = t + 2; FX.text(e.x, e.y - 40, '빙결', '#bfefff'); e.cancelAttack && e.cancelAttack();
}
// 상태 걸기. 다른 원소 상태가 이미 있으면 합성표대로 반응해요(0.5초에 한 번)
function kwStatus(e, st, amt, s, noReact) {
  if (!e || e.dead || !st) return;
  if (!noReact && (e.reactCd || 0) <= gameTime) {
    for (const other of ['burn', 'chill', 'wet', 'shock']) {
      if (other === st || !hasSt(e, other)) continue;
      const cid = fuseOf(ST_ELEM[st], ST_ELEM[other]);
      if (cid) { e.reactCd = gameTime + 0.5; clearSt(e, other); kwReact(cid, e, s || 1, `${ST_NAME[other]} + ${KW[KW_BASE.find(b => b.st === st).id].name}`); return; }
    }
  }
  amt = amt || 1;
  if (st === 'burn') { e.burn = Math.min(5, e.burn + amt); e.burnT = 3; }
  if (st === 'chill') { e.chill = Math.min(5, e.chill + amt); e.chillT = 3; if (e.chill >= 3) freezeE(e, 1); }
  if (st === 'wet') { e.wet = 4; }
  if (st === 'shock') { e.shocked = 3; }
}
function kwReact(cid, e, s, how) {
  const c = KW[cid];
  firstFx(cid, e.x, e.y);
  FX.text(e.x, e.y - e.r - 46, c.name, c.col, true);
  if (how) FX.text(e.x, e.y - e.r - 72, how, '#c9c4d6');
  Juice.hitstop(0.06); Juice.kick(6);
  compFx(cid, e.x, e.y, 0.9 * s, { act: 'react', ang: angTo(P, e), e });
}
// 첫 합성(반응)은 크게 알려요
function firstFx(cid, x, y) {
  if (!Run.kwSeen || Run.kwSeen.has(cid)) return; Run.kwSeen.add(cid);
  const c = KW[cid]; Juice.slowmo(0.35, 0.3); Juice.impactFrame(0.04, c.col);
  World.banner = { t: 1.8, max: 1.8, name: c.name, sub: `${KW[c.a].name} + ${KW[c.b].name} = ${c.name} · ${c.phys}`, col: c.col };
}

// ───────── 장판 ─────────
const FIELD_COL = { fire: '#ff8a3d', frost: '#bfefff', wet: '#4aa8ff', mud: '#8a6a44', lava: '#ff5a2a', sand: '#d9b77a', fog: '#cfd8e8', cloud: '#b8a8ff' };
function addField(type, x, y, r, dur, s, extra) {
  const same = World.fields.filter(f => f.type === type); if (same.length >= 6) World.fields.splice(World.fields.indexOf(same[0]), 1);
  World.fields.push(Object.assign({ type, x, y, r, t: dur, max: dur, s: s || 1, tick: 0, vx: 0, vy: 0 }, extra || {}));
}
function inFog(x, y) { for (const f of World.fields) if (f.type === 'fog' && Math.hypot(x - f.x, y - f.y) < f.r) return true; return false; }
function updateFields(dt) {
  if (World.decoy) { World.decoy.t -= dt; if (World.decoy.t <= 0) World.decoy = null; }
  if (World.banner) { World.banner.t -= dt; if (World.banner.t <= 0) World.banner = null; }
  P.moved = (P.moved || 0) * Math.exp(-dt * 1.5) + Math.hypot(P.vx, P.vy) * dt;
  for (const f of World.fields) {
    f.t -= dt; f.x += f.vx * dt; f.y += f.vy * dt; f.tick -= dt;
    const tick = f.tick <= 0; if (tick) f.tick = f.type === 'cloud' ? 0.6 : 0.5;
    for (const e of World.enemies) {
      if (e.dead || Math.hypot(e.x - f.x, e.y - f.y) > f.r + e.r) continue;
      if (f.type === 'mud') { e.kwSlowT = 0.2; e.kwSlow = 0.45; }
      if (f.type === 'frost') { e.kwSlowT = 0.2; e.kwSlow = 0.7; }
      if (f.type === 'fog') { e.cd = Math.max(e.cd || 0, 0.15); }
      if (!tick) continue;
      if (f.type === 'fire') kwStatus(e, 'burn', 1, f.s, true);
      if (f.type === 'frost') kwStatus(e, 'chill', 1, f.s, true);
      if (f.type === 'wet') kwStatus(e, 'wet', 1, f.s, true);
      if (f.type === 'lava') { kwDmg(e, 4 * f.s, 'fire'); kwStatus(e, 'burn', 1, f.s, true); }
      if (f.type === 'sand') kwDmg(e, 4 * f.s, 'earth');
    }
    if (tick && f.type === 'cloud') {
      const t = World.enemies.filter(e => !e.dead && Math.hypot(e.x - f.x, e.y - f.y) < f.r).sort((a, b) => Math.hypot(a.x - f.x, a.y - f.y) - Math.hypot(b.x - f.x, b.y - f.y))[0];
      if (t) { World.bolts.push({ x1: t.x, y1: t.y - 400, x2: t.x, y2: t.y, life: 0.18 }); SpriteFX.bolt(t.x, t.y, t.r); kwDmg(t, 12 * f.s, 'light'); kwStatus(t, 'shock', 1, f.s, true); Sfx.hit(1.4); }
    }
  }
  World.fields = World.fields.filter(f => f.t > 0);
  for (const e of World.enemies) { e.kwSlowT = (e.kwSlowT || 0) - dt; if ((e.wet || 0) > 0) e.wet -= dt; }
}
function kwSlowMul(e) { return (e.kwSlowT || 0) > 0 ? e.kwSlow : (e.wet || 0) > 0 ? 0.9 : 1; }

// ───────── 효과 도구 ─────────
function burst(x, y, r, dmg, elem, opts) {
  opts = opts || {};
  FX.ring(x, y, 8, r, opts.col || '#fff', 0.3, 6); FX.burst(x, y, opts.col || '#fff', 14, r * 3, 0.4, 5);
  for (const e of World.enemies) {
    if (e.dead || Math.hypot(e.x - x, e.y - y) > r + e.r) continue;
    const a = Math.atan2(e.y - y, e.x - x);
    if (dmg) kwDmg(e, dmg, elem, { ang: a, kb: opts.kb || 0 });
    if (opts.st) kwStatus(e, opts.st, opts.amt || 1, 1, true);
    if (opts.freeze) freezeE(e, opts.freeze);
    if (opts.push && !e.boss && !(e.def.armor && !e.staggerT)) { e.vx += Math.cos(a) * opts.push; e.vy += Math.sin(a) * opts.push; e.kbT = 0.25; }
    if (opts.pull && !e.boss) { e.vx -= Math.cos(a) * opts.pull; e.vy -= Math.sin(a) * opts.pull; e.kbT = 0.3; }
  }
}
function zap(from, t, dmg) { World.bolts.push({ x1: from.x, y1: from.y, x2: t.x, y2: t.y, life: 0.15 }); SpriteFX.bolt(t.x, t.y, t.r); kwDmg(t, dmg, 'light'); }
function nearest(x, y, r, skip) { return World.enemies.filter(e => !e.dead && !(skip && skip.has(e)) && Math.hypot(e.x - x, e.y - y) < r).sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y)); }
function pathPts(c, n) { const out = []; for (let i = 0; i < n; i++) { const k = (i + 0.5) / n; out.push({ x: lerp(c.x0, c.x1, k), y: lerp(c.y0, c.y1, k) }); } return out; }

// ───────── 합성 키워드의 현상 (한 점에서, 크기 s) ─────────
function compFx(id, x, y, s, ctx) {
  const ang = ctx.ang != null ? ctx.ang : P.face;
  const c = KW[id]; const col = c.col;
  switch (id) {
    case 'fog': addField('fog', x, y, 110 * Math.sqrt(s), 3.5, s); FX.burst(x, y, col, 20, 200, 0.6, 9); break;
    case 'steam': burst(x, y, 110 * Math.sqrt(s), 14 * s, 'fire', { col, push: 320, st: 'burn' }); FX.burst(x, y, '#ffffff', 26, 260, 0.8, 10); break;
    case 'ice': burst(x, y, 85 * Math.sqrt(s), 12 * s, 'ice', { col, freeze: 1 }); for (let i = 0; i < 6; i++) FX.spark(x, y, i, '#dff8ff', 6, 300); break;
    case 'conduct': {
      burst(x, y, 100 * Math.sqrt(s), 0, null, { col: '#4aa8ff', st: 'wet' });
      for (const e of World.enemies) if (!e.dead && (e.wet || 0) > 0 && Math.hypot(e.x - x, e.y - y) < 460) { zap({ x, y }, e, 12 * s); kwStatus(e, 'shock', 1, 1, true); }
      Sfx.hit(1.5); break;
    }
    case 'mud': addField('mud', x, y, 100 * Math.sqrt(s), 3.5, s); break;
    case 'hotwind': addField('fire', x, y, 90 * Math.sqrt(s), 2.5, s, { vx: Math.cos(ang) * 90, vy: Math.sin(ang) * 90 }); burst(x, y, 100 * Math.sqrt(s), 6 * s, 'fire', { col, push: 260, st: 'burn', amt: 2 }); break;
    case 'lava': addField('lava', x, y, 75 * Math.sqrt(s), 4, s); FX.burst(x, y, col, 16, 200, 0.5, 7); break;
    case 'thermal': {
      FX.ring(x, y, 8, 110 * Math.sqrt(s), col, 0.35, 8); Sfx.boom();
      for (const e of World.enemies) if (!e.dead && Math.hypot(e.x - x, e.y - y) < 110 * Math.sqrt(s) + e.r) { const hot = e.burn > 0 || e.chill > 0 || e.frozen > 0 || ctx.e === e; kwDmg(e, (10 + (hot ? 26 : 0)) * s, 'fire', { kb: 200 }); if (hot) FX.text(e.x, e.y - 30, '파쇄', col); }
      break;
    }
    case 'plasma': {
      const len = 340, w = 46; FX.slash(x, y, ang, 0.12, len, col, 18, 0.25);
      for (let i = 0; i < 10; i++) FX.spark(x + Math.cos(ang) * len * i / 10, y + Math.sin(ang) * len * i / 10, ang, col, 2, 200);
      for (const e of World.enemies) { if (e.dead) continue; const t = (e.x - x) * Math.cos(ang) + (e.y - y) * Math.sin(ang); const d = Math.abs(-(e.x - x) * Math.sin(ang) + (e.y - y) * Math.cos(ang)); if (t > -e.r && t < len && d < w / 2 + e.r) { kwDmg(e, 18 * s, 'fire'); kwStatus(e, 'burn', 1, 1, true); } }
      break;
    }
    case 'sand': addField('sand', x, y, 85 * Math.sqrt(s), 3, s, { vx: Math.cos(ang) * 80, vy: Math.sin(ang) * 80 }); break;
    case 'blizzard': addField('frost', x, y, 150 * Math.sqrt(s), 3, s); FX.burst(x, y, '#ffffff', 24, 300, 0.7, 4); break;
    case 'cloud': addField('cloud', x, y, 210, 3, s); break;
    case 'magnet': {
      burst(x, y, 280, 0, null, { col, pull: 520 });
      for (const p of World.projs) if (p.owner === 'enemy' && Math.hypot(p.x - x, p.y - y) < 240) { p.life = 0; FX.spark(p.x, p.y, 0, col, 4, 200); }
      break;
    }
    case 'permafrost': addField('frost', x, y, 110 * Math.sqrt(s), 5, s); break;
    case 'supercond': {
      const hit = new Set(); let cur = { x, y }; let first = nearest(x, y, 260)[0];
      if (first) { hit.add(first); zap(cur, first, 14 * s); kwStatus(first, 'chill', 1, 1, true); cur = first; }
      for (let i = 0; i < 8 && first; i++) {
        const nx = World.enemies.filter(e => !e.dead && !hit.has(e) && (e.chill > 0 || e.frozen > 0 || (e.wet || 0) > 0) && dist(e, cur) < 300).sort((a, b) => dist(a, cur) - dist(b, cur))[0];
        if (!nx) break; hit.add(nx); const from = cur; later(0.05 * (i + 1), () => { zap(from, nx, 14 * s); kwStatus(nx, 'chill', 1, 1, true); }); cur = nx;
      }
      break;
    }
    case 'sonic': burst(x, y, 150 * Math.sqrt(s), 10 * s, 'wind', { col, push: 520 }); FX.ring(x, y, 20, 220, '#ffffff', 0.25, 3); Juice.punch(0.03); break;
    case 'momentum': { const m = Math.min(2.5, (P.moved || 0) / 300); burst(x, y, 95, (8 + 14 * m) * s, 'earth', { col, kb: 300 }); FX.text(x, y - 60, `운동량 ×${(1 + m).toFixed(1)}`, col); break; }
    case 'friction': { const n = 1 + Math.min(4, Math.floor((P.hits || 0) / 4)); burst(x, y, 90 * Math.sqrt(s), 5 * s, 'fire', { col, st: 'burn', amt: n }); break; }
    case 'flash': { const t = nearest(x, y, 200)[0]; const tx = t ? t.x : x, ty = t ? t.y : y; World.bolts.push({ x1: tx, y1: ty - 500, x2: tx, y2: ty, life: 0.2 }); SpriteFX.bolt(tx, ty, 30); burst(tx, ty, 70 * Math.sqrt(s), 20 * s, 'light', { col, st: 'shock' }); break; }
  }
}

// ───────── 기본 키워드의 행동별 효과 ─────────
// ctx: { act, e(맞은 적), a(동작), x0,y0,x1,y1(대시 경로), h(패링한 공격), s }
function baseFx(id, act, ctx, s) {
  const e = ctx.e;
  if (act === 'atk' || act === 'dash-hit' || act === 'spin-hit') {
    if (!e || e.dead) return;
    if (id === 'fire') kwStatus(e, 'burn', 1, s);
    if (id === 'cold') kwStatus(e, 'chill', 1, s);
    if (id === 'water') kwStatus(e, 'wet', 1, s);
    if (id === 'elec') {
      kwStatus(e, 'shock', 1, s);
      if (act === 'atk') { const n = kwLv('atk', 'elec'); for (const t of nearest(e.x, e.y, 230, new Set([e])).slice(0, n)) { zap(e, t, 7 * s); kwStatus(t, 'shock', 1, s, true); } }
    }
    if (act === 'atk' && id === 'wind' && !e.boss && !(e.def.armor && !e.staggerT)) { const a = angTo(P, e); e.vx += Math.cos(a) * 140; e.vy += Math.sin(a) * 140; e.kbT = 0.2; }
    if (act === 'atk' && id === 'dup' && !ctx.echo) {
      const base = (ctx.a && ctx.a.sw ? ctx.a.sw.dmg : 14) * 0.5 * s;
      later(0.12, () => { if (e.dead) return; FX.slash(e.x - Math.cos(ctx.a.ang) * 40, e.y - Math.sin(ctx.a.ang) * 40, ctx.a.ang + Math.PI / 2, 1.2, 60, '#e3c8ff', 9, 0.16); kwDmg(e, base, 'phys'); Sfx.hit(1.2); });
    }
    return;
  }
  if (act === 'atk-start') { // 3타 시작
    if (id === 'earth' && ctx.a.act === 'a3') { const x = P.x + Math.cos(ctx.a.ang) * 90, y = P.y + Math.sin(ctx.a.ang) * 90; later(0.06, () => { burst(x, y, 110, 14 * s, 'earth', { col: '#c49a5a', kb: 260 }); splat(x, y, '#000', 90, 'crack'); Juice.kick(8); }); }
    return;
  }
  if (act === 'spin') {
    if (id === 'fire') addField('fire', P.x, P.y, 150, 2, s);
    if (id === 'cold') addField('frost', P.x, P.y, 150, 2.5, s);
    if (id === 'water') { burst(P.x, P.y, 240, 0, null, { col: '#4aa8ff', pull: 380, st: 'wet' }); }
    if (id === 'wind') burst(P.x, P.y, 210, 0, null, { col: '#a8f0c8', push: 480 });
    if (id === 'earth') for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; World.projs.push({ owner: 'player', x: P.x + Math.cos(a) * 30, y: P.y + Math.sin(a) * 30, vx: Math.cos(a) * 620, vy: Math.sin(a) * 620, r: 12, life: 0.45, dmg: 8 * s, col: '#c49a5a', pierce: false, hitSet: new Set(), gen: 1, act: 'spin' }); }
    if (id === 'elec') { FX.ring(P.x, P.y, 20, 170, '#ffe45c', 0.25, 4); for (const t of nearest(P.x, P.y, 170)) { zap(P, t, 6 * s); kwStatus(t, 'shock', 1, s, true); } }
    if (id === 'dup') later(0.18, () => { if (!P.alive) return; spinHit(0.6); FX.ring(P.x, P.y, 30, 150, '#e3c8ff', 0.3, 6); Sfx.swing(); });
    return;
  }
  if (act === 'parry') {
    const src = ctx.h && ctx.h.src && !ctx.h.src.dead ? ctx.h.src : null;
    const px = src ? src.x : P.x + Math.cos(P.face) * 60, py = src ? src.y : P.y + Math.sin(P.face) * 60;
    if (id === 'fire') burst(lerp(P.x, px, 0.6), lerp(P.y, py, 0.6), 100, 16 * s, 'fire', { col: '#ff8a3d', st: 'burn', amt: 2 });
    if (id === 'cold' && src) freezeE(src, 1);
    if (id === 'water') { burst(P.x, P.y, 200, 0, null, { col: '#4aa8ff', st: 'wet' }); Run.hp = Math.min(St.maxHp, Run.hp + 3 * s); FX.text(P.x, P.y - 50, '+' + Math.round(3 * s), '#7fe0a0'); }
    if (id === 'wind') { for (const p of World.projs) if (p.owner === 'enemy' && Math.hypot(p.x - P.x, p.y - P.y) < 320) { p.life = 0; FX.spark(p.x, p.y, 0, '#a8f0c8', 4, 200); } burst(P.x, P.y, 180, 0, null, { col: '#a8f0c8', push: 420 }); }
    if (id === 'elec' && src) { zap(P, src, 12 * s); kwStatus(src, 'shock', 1, s, true); src.staggerT = Math.max(src.staggerT || 0, src.boss ? 0.2 : 0.4 + 0.2 * s); FX.text(src.x, src.y - 50, '마비', '#ffe45c'); }
    if (id === 'dup') P.counterExtra = 1;
    return;
  }
  if (act === 'dash-start') {
    if (id === 'dup') { World.decoy = { x: P.x, y: P.y, t: 1.2 * s, max: 1.2 * s }; FX.ring(P.x, P.y, 10, 50, '#e3c8ff', 0.3, 4); }
    return;
  }
  if (act === 'dash-end') {
    const pts = pathPts(ctx, 3);
    if (id === 'fire') for (const p of pts) addField('fire', p.x, p.y, 55, 1.5, s);
    if (id === 'cold') for (const p of pts) addField('frost', p.x, p.y, 60, 2, s);
    if (id === 'water') for (const p of pts) addField('wet', p.x, p.y, 60, 2.5, s);
    const segHit = (r, fn) => { for (const e of World.enemies) if (!e.dead && segDist(e.x, e.y, ctx.x0, ctx.y0, ctx.x1, ctx.y1) < r + e.r) fn(e); };
    if (id === 'wind') { const side = Math.atan2(ctx.y1 - ctx.y0, ctx.x1 - ctx.x0) + Math.PI / 2; segHit(90, e => { if (e.boss) return; const sgn = Math.sign((e.x - ctx.x0) * Math.cos(side) + (e.y - ctx.y0) * Math.sin(side)) || 1; e.vx += Math.cos(side) * 380 * sgn; e.vy += Math.sin(side) * 380 * sgn; e.kbT = 0.25; }); }
    if (id === 'earth') { burst(ctx.x1, ctx.y1, 100, 12 * s, 'earth', { col: '#c49a5a', kb: 250 }); splat(ctx.x1, ctx.y1, '#000', 80, 'crack'); Juice.kick(6); }
    if (id === 'elec') { segHit(60, e => { zap({ x: ctx.x0, y: ctx.y0 }, e, 8 * s); kwStatus(e, 'shock', 1, s); }); }
    return;
  }
}

// ───────── 행동별 훅 (combat.js에서 불러요) ─────────
function kwRun(act, phase, ctx) {
  if (!Run.kw) return;
  const list = kwAll(act); if (!list.length) return;
  const dup = list.find(k => k.id === 'dup'); const others = list.filter(k => k.id !== 'dup');
  const fire = (k, mul, c) => {
    const s = KW_LV[k.lv] * (mul || 1);
    if (KW[k.id].kind === 'base') baseFx(k.id, phase, c || ctx, s);
    else compPhase(k.id, act, phase, c || ctx, s);
  };
  for (const k of others) fire(k, 1);
  if (dup) {
    if (others.length) { // 복제: 짝 키워드 효과를 한 번 더 (60%)
      if (ctx.echo || phase === 'dash-start') return;
      later(0.12, () => { const c2 = Object.assign({}, ctx, { echo: true }); for (const k of others) fire(k, 0.6, c2); });
    } else fire(dup, 1);
  }
}
// 합성 키워드: 행동마다 현상이 나는 자리와 크기만 달라요
function compPhase(id, act, phase, ctx, s) {
  if (phase === 'atk') { // 한 번 휘두를 때 첫 적중에서 한 번
    if (!ctx.a || (ctx.a.kwDone && !ctx.echo)) return; ctx.a.kwDone = true;
    const e = ctx.e; compFx(id, e.x, e.y, s * (ctx.a.act === 'a3' ? 1.2 : 0.75), { act, ang: ctx.a.ang, e }); return;
  }
  if (phase === 'spin') { compFx(id, P.x, P.y, s * 1.3, { act, ang: P.face }); return; }
  if (phase === 'parry') {
    const src = ctx.h && ctx.h.src && !ctx.h.src.dead ? ctx.h.src : null;
    compFx(id, src ? src.x : P.x, src ? src.y : P.y, s * 1.3, { act, ang: src ? angTo(P, src) : P.face, e: src }); return;
  }
  if (phase === 'dash-end') {
    const ang = Math.atan2(ctx.y1 - ctx.y0, ctx.x1 - ctx.x0);
    const fieldLike = ['fog', 'mud', 'lava', 'permafrost', 'blizzard', 'hotwind', 'sand'].includes(id);
    const pts = fieldLike ? pathPts(ctx, 2) : [{ x: ctx.x1, y: ctx.y1 }];
    for (const p of pts) compFx(id, p.x, p.y, s * (fieldLike ? 0.7 : 1.1), { act, ang }); return;
  }
  if (phase === 'dash-hit' || phase === 'spin-hit') { // 합성 키워드도 맞은 적에게 재료 상태를 남겨요
    const c = KW[id]; const e = ctx.e; if (!e || e.dead) return;
    for (const m of [c.a, c.b]) { const st = KW[m].st; if (st) kwStatus(e, st, 1, s, true); }
  }
}
function kwOnHit(e, a) {
  if (!Run.kw || !e) return;
  const act = a.type === 'thrust' ? 'dash' : a.type === 'spin' ? 'spin' : 'atk';
  const phase = act === 'dash' ? 'dash-hit' : act === 'spin' ? 'spin-hit' : 'atk';
  kwRun(act, phase, { e, a });
}
function kwOnSwingStart(a) { kwRun('atk', 'atk-start', { a }); }
function kwOnSpin() { kwRun('spin', 'spin', {}); }
function kwOnParry(h) { kwRun('parry', 'parry', { h }); }
function kwOnDashStart() { P.kwDash = { x0: P.x, y0: P.y }; kwRun('dash', 'dash-start', {}); }
function kwOnDashEnd() { if (!P.kwDash) return; const c = { x0: P.kwDash.x0, y0: P.kwDash.y0, x1: P.x, y1: P.y }; P.kwDash = null; kwRun('dash', 'dash-end', c); }
function kwCounterUsed() { if (P.counterExtra > 0) { P.counterExtra--; P.counterT = 0.6; FX.text(P.x, P.y - 40, '반격 한 번 더', '#e3c8ff'); } else P.counterT = 0; }

// ───────── 화면: 키워드 카드, 행동 자리 ─────────
function kwTag(k, small) {
  const d = KW[k.id];
  return `<span class="kwtag${small ? ' sm' : ''}" style="border-color:${d.col};color:${d.col}">${d.name}${k.lv > 1 ? ' ' + '★'.repeat(k.lv - 1) : ''}</span>`;
}
function kwDescFor(id, act) {
  const d = KW[id];
  if (d.kind === 'comp') {
    const where = { atk: '맞힌 적 자리에서 (휘두를 때 한 번)', spin: '내 주변에서 크게', parry: '패링한 적 자리에서 크게', dash: '지나간 경로 위에서' }[act] || '';
    return `${d.desc}<br><span class="dim">${act ? ACT[act].name + ': ' + where : '행동마다 나는 자리가 달라요'}</span>`;
  }
  return act ? d.d[act] : ACTS.map(a => `<b>${a.name}</b> ${d.d[a.k]}`).join('<br>');
}
// 보상: 키워드 카드 3장 → 고르면 붙일 행동을 골라요
function kwPool() {
  const owned = new Set(kwOwned().map(k => k.id));
  return KW_BASE.filter(k => !owned.has(k.id) || kwOwned().some(o => o.id === k.id && o.lv < 3));
}
function showKeywordReward(n, cb, title) {
  const cards = shuffle(kwPool()).slice(0, n);
  cardPicker({
    title: title || '키워드', sub: '하나를 고르세요. 이미 가진 키워드면 등급이 올라요(최대 ★★).', cards,
    render: k => { const own = kwOwned().find(o => o.id === k.id); return `<div class="grade" style="color:${k.col}">기본 키워드 · ${k.phys}</div><div class="cname" style="color:${k.col}">${k.name}${own ? ` <small>등급 올리기 → ${own.lv + 1}</small>` : ''}</div><div class="cdesc kwd">${kwDescFor(k.id)}</div>`; },
    reroll: (k, cs) => shuffle(kwPool()).find(x => !cs.includes(x)),
    onPick: k => { const own = kwOwned().find(o => o.id === k.id); if (own) { kwGain(k.id); flashMsg(`${k.name} 등급 ${own.lv + 1}`); cb(); } else kwPlace(k.id, cb); },
    skipLabel: '건너뛰기 (파편 +15)', onSkip: () => { Run.shards += 15; cb(); },
  });
}
// 새 키워드를 어느 행동에 붙일지
function kwPlace(id, cb) {
  Scene = 'menu'; const p = panel(); topBar(p);
  const c = h('div', 'card-wrap'); const d = KW[id];
  c.innerHTML = `<h1 style="color:${d.col}">${d.name}</h1><p class="lead">어느 행동에 붙일까요? 같은 키워드도 행동마다 효과가 달라요.</p>`;
  const row = h('div', 'kwplace');
  for (const a of ACTS) {
    const free = Run.kw[a.k].findIndex((s, i) => !s && i < Run.kwSlots[a.k]) >= 0;
    const cur = kwAll(a.k);
    const other = cur.find(k => KW[k.id].kind === 'base' && fuseOf(k.id, id));
    const b = h('button', 'card kwact' + (free ? '' : ' full'));
    b.innerHTML = `<div class="cname">${a.name}</div><div class="cdesc kwd">${d.kind === 'comp' ? kwDescFor(id, a.k) : d.d[a.k]}</div>
      <div class="cfoot">${cur.map(k => kwTag(k, true)).join(' ') || '<span class="dim">비어 있음</span>'} ${free ? '' : '<br><span class="dim">칸이 가득 참</span>'}</div>
      ${other && free ? `<div class="synhint"><div class="on">✦ ${KW[other.id].name} + ${d.name} → 합성하면 <b>${KW[fuseOf(other.id, id)].name}</b></div></div>` : ''}`;
    b.disabled = !free; b.onclick = () => { kwGain(id, a.k); Sfx.pick(); cb(); };
    row.appendChild(b);
  }
  c.appendChild(row);
  const g = h('button', 'btn ghost', `가방에 넣기 (${Run.kwBag.length}/${Run.kwBagMax})`); g.disabled = Run.kwBag.length >= Run.kwBagMax; g.onclick = () => { kwGain(id, 'bag'); cb(); }; c.appendChild(g);
  const x = h('button', 'btn ghost', '버리고 파편 +15'); x.onclick = () => { Run.shards += 15; cb(); }; c.appendChild(x);
  p.appendChild(c);
  if (window.__auto) setTimeout(() => { const b = row.querySelector('.card:not([disabled])') || (g.disabled ? x : g); b.click(); }, 20);
}
// 둘째 칸 열기 (중간보스)
function kwOpenSlot(cb, title) {
  const cand = ACTS.filter(a => Run.kwSlots[a.k] < 2);
  if (!cand.length) { Run.shards += 40; notice('칸이 모두 열려 있어요', '대신 파편 40을 받았어요.', cb); return; }
  Scene = 'menu'; const p = panel(); topBar(p);
  const c = h('div', 'card-wrap'); c.innerHTML = `<h1>${title || '행동 칸 열기'}</h1><p class="lead">한 행동의 둘째 칸을 열어요. 두 칸에 섞이는 키워드가 들어가면 합성할 수 있어요.</p>`;
  const row = h('div', 'kwplace');
  for (const a of cand) { const b = h('button', 'card kwact'); b.innerHTML = `<div class="cname">${a.name}</div><div class="cfoot">${kwAll(a.k).map(k => kwTag(k, true)).join(' ') || '<span class="dim">비어 있음</span>'}</div>`; b.onclick = () => { Run.kwSlots[a.k] = 2; Sfx.pick(); cb(); }; row.appendChild(b); }
  c.appendChild(row); p.appendChild(c);
  if (window.__auto) setTimeout(() => row.querySelector('.card').click(), 20);
}
// 계층보스: 합성 키워드 바로 얻기
function showCompReward(cb) {
  const owned = new Set(kwOwned().map(k => k.id));
  const pool = () => shuffle(KW_COMP.filter(k => !owned.has(k.id)));
  const cards = pool().slice(0, 3);
  cardPicker({
    title: '계층보스 보상: 합성 키워드', sub: '재료 없이 합성 키워드를 바로 얻어요. 한 칸만 차지해요.', cards,
    render: k => `<div class="grade" style="color:${k.col}">합성 · ${KW[k.a].name} + ${KW[k.b].name}</div><div class="cname" style="color:${k.col}">${k.name}</div><div class="cdesc kwd">${k.desc}<br><span class="dim">${k.phys}</span></div>`,
    reroll: (k, cs) => pool().find(x => !cs.includes(x)),
    onPick: k => kwPlace(k.id, cb),
    skipLabel: '건너뛰기 (리롤권 +2)', onSkip: () => { Run.rerolls = Math.min(5, Run.rerolls + 2); cb(); },
  });
}
// 행동 키워드 판: 옮기기·합성 (편집은 전투 밖에서만)
let KwSel = null;
function kwPanel(container, editable, extra) {
  const box = h('div', 'engrave kwpanel');
  const draw = () => {
    recalc(); box.innerHTML = '';
    box.appendChild(h('div', 'etitle', `행동 키워드 ${editable ? '<span class="dim">키워드를 누른 뒤 다른 칸을 누르면 옮겨요</span>' : '<span class="dim">(지도·상점·회복 칸에서 바꿀 수 있어요)</span>'}`));
    const grid = h('div', 'kwgrid');
    for (const a of ACTS) {
      const col = h('div', 'kwcol'); col.appendChild(h('div', 'kwhead', `${a.name} <span class="dim">${a.key}</span>`));
      for (let i = 0; i < 2; i++) {
        const k = Run.kw[a.k][i]; const open = i < Run.kwSlots[a.k];
        const sel = KwSel && KwSel.act === a.k && KwSel.i === i;
        const el = h('button', 'kwslot' + (open ? '' : ' locked') + (sel ? ' sel' : ''));
        if (k) { const d = KW[k.id]; el.style.borderColor = d.col; el.innerHTML = `${kwTag(k)}<div class="kwd">${kwDescFor(k.id, a.k)}</div>`; }
        else el.innerHTML = `<div class="dim">${open ? '빈 칸' : '잠김 (중간보스·상점에서 열기)'}</div>`;
        el.onclick = () => { if (!editable || !open) return; kwClick(a.k, i); draw(); };
        col.appendChild(el);
      }
      const fu = kwFusable(a.k);
      if (fu) { const fb = h('button', 'btn small fuse', `합성 → ${KW[fu].name}`); fb.style.borderColor = KW[fu].col; fb.title = KW[fu].desc; fb.disabled = !editable; fb.onclick = () => { const id = kwFuse(a.k); if (id) { flashMsg(`${KW[KW[id].a].name} + ${KW[KW[id].b].name} = ${KW[id].name}`); Sfx.gold(); } KwSel = null; draw(); }; col.appendChild(fb); }
      grid.appendChild(col);
    }
    box.appendChild(grid);
    const bag = h('div', 'bag'); bag.appendChild(h('span', 'lbl', `가방 ${Run.kwBag.length}/${Run.kwBagMax}`));
    Run.kwBag.forEach((k, i) => { const b = h('button', 'bagitem' + (KwSel && KwSel.act === 'bag' && KwSel.i === i ? ' sel' : ''), kwTag(k)); b.onclick = () => { if (!editable) return; kwClick('bag', i); draw(); }; bag.appendChild(b); });
    if (editable && KwSel && KwSel.act !== 'bag' && Run.kwBag.length < Run.kwBagMax) { const ub = h('button', 'btn small', '가방으로 빼기'); ub.onclick = () => { Run.kwBag.push(Run.kw[KwSel.act][KwSel.i]); Run.kw[KwSel.act][KwSel.i] = null; KwSel = null; draw(); }; bag.appendChild(ub); }
    if (extra) extra(bag, draw);
    box.appendChild(bag);
  };
  draw(); container.appendChild(box); return draw;
}
function kwGet(act, i) { return act === 'bag' ? Run.kwBag[i] : Run.kw[act][i]; }
function kwSet(act, i, v) { if (act === 'bag') { if (v) Run.kwBag[i] = v; else Run.kwBag.splice(i, 1); } else Run.kw[act][i] = v || null; }
function kwClick(act, i) {
  if (!KwSel) { if (kwGet(act, i)) KwSel = { act, i }; return; }
  if (KwSel.act === act && KwSel.i === i) { KwSel = null; return; }
  const a = kwGet(KwSel.act, KwSel.i), b = kwGet(act, i);
  if (KwSel.act === 'bag' && act === 'bag') { KwSel = null; return; }
  if (act === 'bag') { Run.kwBag[i] = a; kwSet(KwSel.act, KwSel.i, b); }
  else if (KwSel.act === 'bag') { Run.kw[act][i] = a; if (b) Run.kwBag[KwSel.i] = b; else Run.kwBag.splice(KwSel.i, 1); }
  else { Run.kw[act][i] = a; Run.kw[KwSel.act][KwSel.i] = b || null; }
  KwSel = null; Sfx.pick(); recalc();
}
function showKwOnly() {
  Scene = 'menu'; const p = panel(); topBar(p); const c = h('div', 'wide');
  kwPanel(c, true); const b = h('button', 'btn', '지도로'); b.onclick = () => { KwSel = null; showMap(); }; c.appendChild(b); p.appendChild(c);
}
// 자동 진행(봇): 합성 가능한 건 합성
function autoKw() { for (const a of ACTS) if (kwFusable(a.k)) kwFuse(a.k); for (let i = Run.kwBag.length - 1; i >= 0; i--) { for (const a of ACTS) { const j = Run.kw[a.k].findIndex((s, n) => !s && n < Run.kwSlots[a.k]); if (j >= 0) { Run.kw[a.k][j] = Run.kwBag.splice(i, 1)[0]; break; } } } recalc(); }
