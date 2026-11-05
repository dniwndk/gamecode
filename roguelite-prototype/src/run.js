'use strict';
// ───────── 런 진행: 지도, 보상, 상점, 회복, 이벤트, 동작 각인 화면 ─────────
let Scene = 'title';
const UI = document.getElementById('ui');
const h = (tag, cls, html) => { const el = document.createElement(tag); if (cls) el.className = cls; if (html != null) el.innerHTML = html; return el; };
function clearUI() { UI.innerHTML = ''; UI.style.pointerEvents = 'none'; }
function panel() { UI.innerHTML = ''; UI.style.pointerEvents = 'auto'; const p = h('div', 'screen'); UI.appendChild(p); return p; }

const NODE_INFO = {
  fight: { name: '전투', icon: '⚔', col: '#c9c4d6' }, elite: { name: '정예 전투', icon: '☠', col: '#ff8a7a' },
  curse: { name: '저주 전투', icon: '✶', col: '#d27aff' }, shop: { name: '상점', icon: '◈', col: '#ffd86b' },
  rest: { name: '회복', icon: '✚', col: '#7fe0a0' }, event: { name: '이벤트', icon: '?', col: '#9fe8ff' },
  boss: { name: '보스', icon: '♛', col: '#ff5a5a' }, final: { name: '최종 보스', icon: '♛', col: '#ffffff' },
};

// ───────── 4장 계층 지도 ─────────
function genMap() {
  const rows = []; let id = 0;
  const mk = (row, col, type) => ({ id: id++, row, col, type, next: [], mods: [], elite: row >= 6 });
  for (let r = 1; r <= 10; r++) rows[r] = [];
  const seg = (r0) => {
    let starts = shuffle([0, 1, 2, 3, 4, 5, 6]).slice(0, 4).sort((a, b) => a - b);
    const paths = starts.map(c => [c]);
    for (let r = 1; r < 4; r++) {
      for (let i = 0; i < 4; i++) paths[i].push(clamp(paths[i][r - 1] + rint(-1, 1), 0, 6));
      for (let i = 1; i < 4; i++) if (paths[i][r] < paths[i - 1][r]) paths[i][r] = paths[i - 1][r];
    }
    for (let r = 0; r < 4; r++) {
      const cols = [...new Set(paths.map(p => p[r]))];
      for (const c of cols) rows[r0 + r].push(mk(r0 + r, c, 'fight'));
    }
    const find = (r, c) => rows[r].find(n => n.col === c);
    for (const p of paths) for (let r = 0; r < 3; r++) { const a = find(r0 + r, p[r]), b = find(r0 + r + 1, p[r + 1]); if (!a.next.includes(b.id)) a.next.push(b.id); }
  };
  seg(1); seg(6);
  rows[5] = [mk(5, 3, 'boss')]; rows[10] = [mk(10, 3, 'boss')];
  for (const n of rows[4]) n.next.push(rows[5][0].id);
  rows[5][0].next = rows[6].map(n => n.id);
  for (const n of rows[9]) n.next.push(rows[10][0].id);
  const all = rows.flat().filter(Boolean); const byId = Object.fromEntries(all.map(n => [n.id, n]));
  const parents = id => all.filter(n => n.next.includes(id));
  // 칸 종류 (4.2 비율, 4.3 규칙)
  for (let r = 2; r <= 9; r++) {
    if (r === 5 || r === 6) continue;
    const w = r < 5 ? [['fight', 55], ['curse', 8], ['shop', 12], ['rest', 12], ['event', 13]] : [['fight', 50], ['curse', 12], ['shop', 12], ['rest', 12], ['event', 14]];
    for (const n of rows[r]) n.type = wpick(w);
    if ((r === 4 || r === 9) && rows[r].length >= 2) { const s = shuffle(rows[r].slice()); s[0].type = 'shop'; s[1].type = 'rest'; }
  }
  const nonCombat = t => ['shop', 'rest', 'event'].includes(t);
  for (let r = 2; r <= 9; r++) for (const n of rows[r]) if (nonCombat(n.type) && parents(n.id).some(p => nonCombat(p.type)) && !(r === 4 || r === 9)) n.type = 'fight';
  // 변형자
  for (const n of all) {
    if (n.type === 'fight' && R() < (n.elite ? 0.6 : 0.4)) n.mods = [pick(MODIFIERS).id];
    if (n.type === 'curse') n.mods = shuffle(MODIFIERS.map(m => m.id)).slice(0, 2);
  }
  return { rows, byId };
}
function nodeKind(n) { return n.type === 'fight' && n.elite ? 'elite' : n.type; }

function startRun(seedVal) {
  newRun(seedVal);
  Run.map = genMap(); Run.row = 0; Run.node = null; Run.floor = 0;
  showMap();
}
function reachable() {
  if (Run.tier === 3 && Run.row === 10) return ['final'];
  if (!Run.node) return Run.map.rows[1].map(n => n.id);
  return Run.node.next;
}
function enterNode(n) {
  Sfx.init();
  Run.node = n; Run.row = n.row; Run.floor = (Run.tier - 1) * 10 + n.row; Run.floorShards = 0;
  Run.history.push(`${Run.floor}층 ${NODE_INFO[nodeKind(n)].name}`);
  if (['fight', 'curse', 'boss'].includes(n.type)) { clearUI(); Scene = 'fight'; startFight({ ...n, type: n.type === 'curse' ? 'fight' : n.type }); }
  else if (n.type === 'shop') showShop();
  else if (n.type === 'rest') showRest();
  else if (n.type === 'event') showEvent();
}
function enterFinal() {
  Run.node = { type: 'final', row: 11, mods: [] }; Run.floor = 31; Run.row = 11;
  Run.history.push('31층 최종 보스');
  clearUI(); Scene = 'fight'; startFight({ type: 'final', mods: [] });
}

function topBar(p) {
  const bar = h('div', 'topbar');
  const aug = Object.entries(Run.augs).map(([k, l]) => `<span class="chip" style="border-color:${GRADE[AUG[k].grade].col}">${AUG[k].name}${AUG[k].max > 1 ? ' ' + l : ''}</span>`).join('') || '<span class="dim">없음</span>';
  const bl = Object.entries(Run.blessings).map(([k, c]) => `<span class="chip">${BLESSINGS.find(b => b.id === k).name}×${c}</span>`).join('') || '<span class="dim">없음</span>';
  bar.innerHTML = `<div class="stats"><b>${Run.floor ? Run.floor + '층' : '출발'}</b> · ${TIERS[Run.tier - 1].name}
    <span class="hp">체력 ${Math.ceil(Run.hp)}/${St.maxHp}</span><span class="sh">파편 ${Run.shards}</span><span>리롤권 ${Run.rerolls}</span><span>각인석 ${Run.stones}</span></div>
    <div class="row"><span class="lbl">증강</span>${aug}</div><div class="row"><span class="lbl">축복</span>${bl}</div>`;
  p.appendChild(bar);
}

function showMap() {
  Scene = 'map'; const p = panel(); topBar(p);
  const wrap = h('div', 'mapwrap'); p.appendChild(wrap);
  const reach = reachable();
  if (reach[0] === 'final') {
    const b = h('button', 'btn big', '31층 최종 보스에 도전'); b.onclick = enterFinal; wrap.appendChild(h('div', 'center', '')).appendChild(b);
  } else {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('class', 'mapsvg'); svg.setAttribute('viewBox', '0 0 1000 640');
    const pos = n => ({ x: 120 + n.col * 125, y: 600 - (n.row - 1) * 62 });
    const all = Run.map.rows.flat().filter(Boolean);
    for (const n of all) for (const nid of n.next) { const m = Run.map.byId[nid]; const a = pos(n), b = pos(m); const l = document.createElementNS(svg.namespaceURI, 'line'); l.setAttribute('x1', a.x); l.setAttribute('y1', a.y); l.setAttribute('x2', b.x); l.setAttribute('y2', b.y); l.setAttribute('class', 'edge' + (Run.node && Run.node.id === n.id ? ' hot' : '')); svg.appendChild(l); }
    wrap.appendChild(svg);
    for (const n of all) {
      const k = nodeKind(n), info = NODE_INFO[k], ps = pos(n);
      const el = h('button', 'node' + (reach.includes(n.id) ? ' reach' : '') + (Run.node && Run.node.id === n.id ? ' here' : '') + (n.row < Run.row ? ' past' : ''));
      el.style.left = (ps.x / 10) + '%'; el.style.top = (ps.y / 6.4) + '%'; el.style.color = info.col;
      el.innerHTML = `<span>${info.icon}</span>${n.mods.length ? `<i class="mod">${n.mods.map(m => MOD[m].name).join('·')}</i>` : ''}`;
      el.title = `${(Run.tier - 1) * 10 + n.row}층 ${info.name}${n.mods.length ? '\n변형자: ' + n.mods.map(m => `${MOD[m].name}(${MOD[m].desc})`).join(', ') : ''}`;
      if (reach.includes(n.id)) el.onclick = () => enterNode(n);
      wrap.appendChild(el);
    }
  }
  const side = h('div', 'mapside');
  side.innerHTML = `<div class="hint">다음 칸을 고르세요. 상점·회복·이벤트 칸은 그 층 전투 보상을 포기해요.<br>칸 위 글자는 층 변형자예요.</div>`;
  const eb = h('button', 'btn', '동작 각인 보기'); eb.onclick = () => showEngraveOnly(); side.appendChild(eb);
  p.appendChild(side);
}

// ───────── 전투 클리어 → 보상 ─────────
function fightCleared() {
  const n = Run.node; const k = n.type;
  if (k === 'final') { endRun(true); return; }
  let base = k === 'boss' ? (n.row === 5 ? 40 : 60) : n.elite ? 25 : 15;
  if (n.type === 'curse') base *= 2;
  const heavy = (n.mods || []).some(m => MOD[m].heavy), light = (n.mods || []).some(m => !MOD[m].heavy);
  if (heavy) base *= 1.5; else if (light) base *= 1.2;
  base = Math.round(base * (1 + St.shardMul));
  Run.shards += base;
  const queue = [];
  if (Run.pendingDrops && Run.pendingDrops.length) { for (const id of Run.pendingDrops) queue.push(() => giveItem(id, next)); Run.pendingDrops = []; }
  if (k === 'boss') {
    const lock = SLOT_UNLOCK_ORDER.find(s => !Run.open.has(s));
    if (lock) { Run.open.add(lock); queue.unshift(() => notice(`각인 자리 열림: ${SLOT[lock].name}`, `보스를 쓰러뜨려 <b>${SLOT[lock].name}</b> 자리가 열렸어요.`, next)); }
    queue.unshift(() => showAugments(false, next));
    if (n.row === 10) queue.splice(1, 0, () => showAugments(true, next));
  } else {
    queue.unshift(() => showBlessings(heavy ? 4 : 3, next));
  }
  queue.unshift(() => notice('클리어', `${Run.floor}층 클리어 · 파편 +${base}${Run.floorShards ? ` (처치 파편 +${Run.floorShards})` : ''}`, next, true));
  function next() { const f = queue.shift(); if (f) f(); else afterFloor(); }
  next();
}
function afterFloor() {
  recalc();
  if (Run.row === 10 && Run.tier < 3) { Run.tier++; Run.row = 0; Run.node = null; Run.map = genMap(); notice(`${TIERS[Run.tier - 1].name} 진입`, '새 계층 지도가 펼쳐졌어요.', showMap); return; }
  showMap();
}
function notice(title, body, cb, quick) {
  Scene = 'menu'; const p = panel(); topBar(p);
  const c = h('div', 'card-wrap'); c.innerHTML = `<h1>${title}</h1><p class="lead">${body}</p>`;
  const b = h('button', 'btn big', '계속'); b.onclick = cb; c.appendChild(b); p.appendChild(c);
  if (window.__auto) setTimeout(() => b.isConnected && b.click(), 20);
}

// 카드 고르기 공통 (무료 리롤 1회씩, 이후 리롤권)
function cardPicker({ title, sub, cards, render, reroll, onPick, skipLabel, onSkip }) {
  Scene = 'menu'; const p = panel(); topBar(p);
  const c = h('div', 'card-wrap'); c.innerHTML = `<h1>${title}</h1><p class="lead">${sub}</p>`;
  const row = h('div', 'cards'); c.appendChild(row);
  const free = cards.map(() => true);
  const draw = () => {
    row.innerHTML = '';
    cards.forEach((cd, i) => {
      const box = h('div', 'cardbox');
      const el = h('button', 'card'); el.innerHTML = render(cd); el.onclick = () => onPick(cd); box.appendChild(el);
      const rr = h('button', 'btn small', free[i] ? '무료 리롤' : `리롤권 사용 (${Run.rerolls})`);
      rr.disabled = !free[i] && Run.rerolls <= 0;
      rr.onclick = () => { const nc = reroll(cd, cards); if (!nc) return; if (free[i]) free[i] = false; else Run.rerolls--; cards[i] = nc; draw(); };
      box.appendChild(rr); row.appendChild(box);
    });
  };
  draw();
  if (skipLabel) { const s = h('button', 'btn ghost', skipLabel); s.onclick = onSkip; c.appendChild(s); }
  p.appendChild(c);
  if (window.__auto) setTimeout(() => { const b = row.querySelector('.card'); b && b.click(); }, 20);
}

function showBlessings(n, cb) {
  const pool = () => shuffle(BLESSINGS.slice());
  const cards = pool().slice(0, n);
  cardPicker({
    title: '축복', sub: '하나를 고르세요. 같은 축복은 계속 쌓여요.', cards,
    render: b => `<div class="cname">${b.name}</div><div class="cdesc">${b.desc}</div><div class="cfoot">보유 ${Run.blessings[b.id] || 0}</div>`,
    reroll: (b, cs) => pool().find(x => !cs.includes(x)),
    onPick: b => { Run.blessings[b.id] = (Run.blessings[b.id] || 0) + 1; recalc(); if (b.id === 'tough') Run.hp += 6; cb(); },
    skipLabel: '건너뛰기 (파편 +10)', onSkip: () => { Run.shards += 10; cb(); },
  });
}

function augPool(grade) { return AUGMENTS.filter(a => a.grade === grade && (Run.augs[a.id] || 0) < a.max); }
function upGrade(g) { return g === 'silver' ? 'gold' : 'prism'; }
function rollAugs(grade, n, upCount, needEffect) {
  const out = [];
  for (let i = 0; i < n; i++) {
    let g = i < upCount ? upGrade(grade) : grade;
    let pool = augPool(g).filter(a => !out.includes(a));
    if (needEffect && i === 0) { const ef = pool.filter(a => a.tag === '효과'); if (ef.length) pool = ef; }
    if (!pool.length) pool = AUGMENTS.filter(a => (Run.augs[a.id] || 0) < a.max && !out.includes(a));
    if (pool.length) out.push(pick(pool));
  }
  return shuffle(out);
}
function showAugments(prism, cb) {
  let grade, n = 3;
  if (prism) { grade = 'prism'; if (Run.sagaOn) { n = 4; Run.sagaOn = false; } }
  else { const t = Run.tier; grade = wpick(t === 1 ? [['silver', 60], ['gold', 30], ['prism', 10]] : t === 2 ? [['silver', 40], ['gold', 40], ['prism', 20]] : [['silver', 25], ['gold', 45], ['prism', 30]]); }
  const up = Run.upNext || 0; Run.upNext = 0;
  const cards = rollAugs(grade, n, up, prism);
  cardPicker({
    title: prism ? '계층보스 보상: 프리즘 증강' : '증강', sub: prism ? '예전 키워드 자리예요. 가장 강한 증강 중 하나를 고르세요.' : `${GRADE[grade].name} 등급 증강 중 하나를 고르세요.`, cards,
    render: a => { const l = (Run.augs[a.id] || 0) + 1; return `<div class="grade" style="color:${GRADE[a.grade].col}">${GRADE[a.grade].name} · ${a.tag}</div><div class="cname">${a.name}${a.max > 1 ? ` <small>${l}단계</small>` : ''}</div><div class="cdesc">${a.desc(l)}</div>`; },
    reroll: (a, cs) => { const pool = augPool(a.grade).filter(x => !cs.includes(x)); return pool.length ? pick(pool) : null; },
    onPick: a => { takeAug(a.id); cb(); },
    skipLabel: `건너뛰기 (리롤권 +${prism ? 2 : 1})`, onSkip: () => { Run.rerolls = Math.min(5, Run.rerolls + (prism ? 2 : 1)); cb(); },
  });
}
function takeAug(id) {
  Run.augs[id] = (Run.augs[id] || 0) + 1;
  if (id === 'star') Run.upNext = Math.max(Run.upNext, 1);
  if (id === 'moon') Run.upNext = 3;
  if (id === 'saga') Run.sagaOn = true;
  recalc();
}

// ───────── 인장 얻기 ─────────
function giveItem(id, cb) {
  if (Run.bag.length < Run.bagMax) { Run.bag.push({ id, lv: 0 }); notice('인장 획득', `<b>${ITEM[id].name}</b>을(를) 보조 가방에 넣었어요. 상점·회복 칸에서 각인할 수 있어요.`, cb); }
  else { Run.shards += Math.round(ITEM[id].price * 0.6); notice('가방이 가득 참', `<b>${ITEM[id].name}</b>을(를) 파편 ${Math.round(ITEM[id].price * 0.6)}로 바꿨어요.`, cb); }
}

// ───────── 동작 각인 화면 ─────────
let Sel = null; // {from:'bag'|'slot', i|k}
function itemTip(inst, slotK) {
  const it = ITEM[inst.id]; const lv = inst.lv || 0;
  const base = Object.entries(it.base).map(([k, v]) => fmtStat(k, v * (1 + 0.5 * lv))).join(', ');
  const slots = KIND_SLOTS[it.kind].filter(k => k !== 'core' || it.kind === 'core');
  let at = '';
  if (it.kind === 'core') at = '<div>심: 기본 효과만, 같은 계열 인장과 둘씩 이어짐</div>';
  else if (it.at.any) at = `<div>어느 자리든: ${fmtAt(it.at.any)}</div>`;
  else at = slots.map(k => `<div class="${k === slotK ? 'on' : ''}">${SLOT[k].name}: ${fmtAt(it.at[k])}</div>`).join('');
  return `<div class="tipname" style="color:${ELEM[it.elem].col}">${it.name}${lv ? ' +' + lv : ''}</div><div class="dim">${KIND[it.kind]} · ${ELEM[it.elem].name} · ${it.form}</div><div>${base}</div><div class="tipat">${at}</div>`;
}
function engravePanel(container, editable, extra) {
  const box = h('div', 'engrave');
  const draw = () => {
    recalc(); box.innerHTML = '';
    box.appendChild(h('div', 'etitle', `동작 각인 ${editable ? '' : '<span class="dim">(상점·회복 칸에서만 바꿀 수 있어요)</span>'}`));
    const grid = h('div', 'egrid');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('class', 'elinks'); svg.setAttribute('viewBox', '0 0 800 300');
    const pos = s => ({ x: 100 + s.x * 200, y: 75 + s.y * 150 });
    const drawn = new Set();
    for (const s of SLOTS) for (const o of s.links) {
      if (s.k === 'core' || o === 'core') continue;
      const key = [s.k, o].sort().join(); if (drawn.has(key)) continue; drawn.add(key);
      const a = pos(s), b = pos(SLOT[o]); const E = Run.engr;
      const same = E[s.k] && E[o] && ITEM[E[s.k].id].elem === ITEM[E[o].id].elem && ITEM[E[o].id].elem !== 'none';
      const l = document.createElementNS(svg.namespaceURI, 'line'); l.setAttribute('x1', a.x); l.setAttribute('y1', a.y); l.setAttribute('x2', b.x); l.setAttribute('y2', b.y);
      l.setAttribute('class', 'elink' + (same ? ' lit' : '')); if (same) l.style.stroke = ELEM[ITEM[E[o].id].elem].col; svg.appendChild(l);
    }
    grid.appendChild(svg);
    for (const s of SLOTS) {
      const ps = pos(s); const inst = Run.engr[s.k]; const open = Run.open.has(s.k);
      const el = h('button', 'slot' + (open ? '' : ' locked') + (Sel && Sel.from === 'slot' && Sel.k === s.k ? ' sel' : ''));
      el.style.left = (ps.x / 8) + '%'; el.style.top = (ps.y / 3) + '%';
      const kindName = { blade: '칼', body: '몸', riposte: '응수', core: '핵심' }[s.kind];
      if (inst) { const it = ITEM[inst.id]; el.style.borderColor = ELEM[it.elem].col; el.innerHTML = `<div class="sname">${s.name}</div><div class="iname" style="color:${ELEM[it.elem].col}">${it.name}${inst.lv ? ' +' + inst.lv : ''}</div>${Links[s.k] > 1 ? '<div class="linkb">이음 +20%</div>' : ''}`; }
      else el.innerHTML = `<div class="sname">${s.name}</div><div class="dim">${open ? kindName + ' 자리' : '잠김'}</div>`;
      el.onmouseenter = () => { tip.innerHTML = inst ? itemTip(inst, s.k) : `<b>${s.name}</b> (${kindName})<br><span class="dim">이어진 자리: ${s.k === 'core' ? '모든 자리 (둘씩)' : s.links.filter(x => x !== 'core').map(x => SLOT[x].name).join(', ')}</span>`; };
      el.onclick = () => {
        if (!editable || !open) return;
        if (Sel && Sel.from === 'bag') {
          const it = Run.bag[Sel.i]; if (!KIND_SLOTS[ITEM[it.id].kind].includes(s.k)) { flashMsg('이 인장은 그 자리에 못 들어가요'); return; }
          Run.bag.splice(Sel.i, 1); if (inst) Run.bag.push(inst); Run.engr[s.k] = it; Sel = null; Sfx.pick(); draw(); return;
        }
        if (Sel && Sel.from === 'slot') {
          if (Sel.k === s.k) { Sel = null; draw(); return; }
          const a = Run.engr[Sel.k];
          if (a && !KIND_SLOTS[ITEM[a.id].kind].includes(s.k)) { flashMsg('그 자리 종류와 맞지 않아요'); return; }
          if (inst && !KIND_SLOTS[ITEM[inst.id].kind].includes(Sel.k)) { flashMsg('바꿀 인장이 원래 자리와 맞지 않아요'); return; }
          Run.engr[s.k] = a; Run.engr[Sel.k] = inst; Sel = null; Sfx.pick(); draw(); return;
        }
        if (inst) { Sel = { from: 'slot', k: s.k }; draw(); }
      };
      grid.appendChild(el);
    }
    box.appendChild(grid);
    const chains = (Run.chains || []).map(c => `<span class="chip" style="border-color:${ELEM[c.elem].col}">사슬 ${c.seq.map(k => SLOT[k].name).join('→')} : ${SLOT[c.end].name}에 이음 마무리</span>`).join('');
    box.appendChild(h('div', 'chains', chains || '<span class="dim">이어진 세 자리를 같은 계열로 채우면 사슬 끝 동작에 이음 마무리 보너스가 붙어요.</span>'));
    const bag = h('div', 'bag'); bag.appendChild(h('span', 'lbl', `보조 가방 ${Run.bag.length}/${Run.bagMax}`));
    Run.bag.forEach((inst, i) => {
      const it = ITEM[inst.id]; const b = h('button', 'bagitem' + (Sel && Sel.from === 'bag' && Sel.i === i ? ' sel' : ''), `${it.name}${inst.lv ? ' +' + inst.lv : ''}<small>${KIND[it.kind]}</small>`);
      b.style.borderColor = ELEM[it.elem].col; b.onmouseenter = () => { tip.innerHTML = itemTip(inst); };
      b.onclick = () => { if (!editable) return; Sel = Sel && Sel.from === 'bag' && Sel.i === i ? null : { from: 'bag', i }; draw(); };
      bag.appendChild(b);
    });
    if (editable && Sel && Sel.from === 'slot' && Run.bag.length < Run.bagMax) { const ub = h('button', 'btn small', '가방으로 빼기'); ub.onclick = () => { Run.bag.push(Run.engr[Sel.k]); Run.engr[Sel.k] = null; Sel = null; draw(); }; bag.appendChild(ub); }
    if (editable && Sel && Run.stones > 0 && Sel.from === 'slot') { const sb = h('button', 'btn small', `각인석 사용 (${Run.stones})`); sb.onclick = () => useStone(Sel.k, draw); bag.appendChild(sb); }
    if (extra) extra(bag, draw);
    box.appendChild(bag);
    const tip = h('div', 'tip', '<span class="dim">인장이나 자리에 마우스를 올리면 설명이 나와요. 가방 인장을 누른 뒤 자리를 누르면 각인돼요.</span>'); box.appendChild(tip);
  };
  draw(); container.appendChild(box); return draw;
}
function useStone(k, draw) {
  const ks = [k, ...SLOT[k].links.filter(x => x !== 'core' || k === 'core')].slice(0, k === 'core' ? 1 : 9);
  let any = false;
  for (const x of ks) { const inst = Run.engr[x]; if (inst && (inst.lv || 0) < 2) { inst.lv = (inst.lv || 0) + 1; any = true; } }
  if (!any) { flashMsg('올릴 수 있는 인장이 없어요 (최대 +2)'); return; }
  Run.stones--; Sel = null; Sfx.gold(); draw();
}
function flashMsg(t) { const m = h('div', 'toast', t); document.body.appendChild(m); setTimeout(() => m.remove(), 1400); }
function showEngraveOnly() {
  Scene = 'menu'; const p = panel(); topBar(p); const c = h('div', 'wide');
  engravePanel(c, false); const b = h('button', 'btn', '지도로'); b.onclick = showMap; c.appendChild(b); p.appendChild(c);
}

// ───────── 상점 ─────────
function showShop() {
  Scene = 'menu'; Sel = null;
  const disc = Run.augs.regular ? 0.8 : 1; let freeRef = Run.augs.regular ? 1 : 0; let refCost = 20;
  let stock = shuffle(ITEMS.slice()).slice(0, 4).map(it => ({ it, sold: false }));
  const p = panel(); topBar(p); const c = h('div', 'wide'); p.appendChild(c);
  const shopBox = h('div', 'shop'); c.appendChild(shopBox);
  let redrawE;
  const draw = () => {
    shopBox.innerHTML = '<h2>상점 <span class="dim">— 이 층 전투 보상은 없어요</span></h2>';
    const row = h('div', 'shoprow');
    for (const s of stock) {
      const price = Math.round(s.it.price * disc);
      const b = h('button', 'shopitem' + (s.sold ? ' sold' : ''), `<div class="iname" style="color:${ELEM[s.it.elem].col}">${s.it.name}</div><div class="dim">${KIND[s.it.kind]} · ${s.it.form}</div><div class="price">${s.sold ? '판매됨' : price + ' 파편'}</div>`);
      b.disabled = s.sold || Run.shards < price || Run.bag.length >= Run.bagMax;
      b.onmouseenter = () => { const t = c.querySelector('.tip'); if (t) t.innerHTML = itemTip({ id: s.it.id, lv: 0 }); };
      b.onclick = () => { Run.shards -= price; s.sold = true; Run.bag.push({ id: s.it.id, lv: 0 }); Sfx.pick(); draw(); redrawE(); };
      row.appendChild(b);
    }
    shopBox.appendChild(row);
    const row2 = h('div', 'shoprow');
    const st = h('button', 'btn', `각인석 사기 (${Math.round(60 * disc)})`); st.disabled = Run.shards < Math.round(60 * disc);
    st.onclick = () => { Run.shards -= Math.round(60 * disc); Run.stones++; draw(); redrawE(); }; row2.appendChild(st);
    const lock = SLOTS.find(s => !Run.open.has(s.k));
    if (lock) { const ob = h('button', 'btn', `각인 자리 열기: ${SLOT[SLOT_UNLOCK_ORDER.find(s => !Run.open.has(s))].name} (100)`); ob.disabled = Run.shards < 100; ob.onclick = () => { Run.shards -= 100; Run.open.add(SLOT_UNLOCK_ORDER.find(s => !Run.open.has(s))); draw(); redrawE(); }; row2.appendChild(ob); }
    const rf = h('button', 'btn', freeRef ? '새로고침 (무료)' : `새로고침 (${refCost})`); rf.disabled = !freeRef && Run.shards < refCost;
    rf.onclick = () => { if (freeRef) freeRef--; else { Run.shards -= refCost; refCost += 10; } stock = shuffle(ITEMS.slice()).slice(0, 4).map(it => ({ it, sold: false })); draw(); }; row2.appendChild(rf);
    const lv = h('button', 'btn ghost', '상점 나가기'); lv.onclick = () => { Sel = null; afterFloor(); }; row2.appendChild(lv);
    shopBox.appendChild(row2);
    p.querySelector('.topbar') && p.querySelector('.topbar').remove(); topBar(p); p.insertBefore(p.lastChild, p.firstChild);
  };
  redrawE = engravePanel(c, true, (bag, re) => {
    if (Sel && Sel.from === 'bag') { const inst = Run.bag[Sel.i]; const sv = Math.round(ITEM[inst.id].price * 0.6); const sb = h('button', 'btn small', `팔기 (+${sv})`); sb.onclick = () => { Run.bag.splice(Sel.i, 1); Run.shards += sv; Sel = null; re(); draw(); }; bag.appendChild(sb); }
  });
  draw();
  if (window.__auto) setTimeout(() => autoShop(stock, draw, redrawE), 20);
}

// ───────── 회복 ─────────
function showRest() {
  Scene = 'menu'; Sel = null; const p = panel(); topBar(p); const c = h('div', 'wide'); p.appendChild(c);
  const box = h('div', 'shop'); box.innerHTML = '<h2>회복 <span class="dim">— 둘 중 하나</span></h2>';
  const row = h('div', 'shoprow');
  const heal = Math.round(St.maxHp * 0.4);
  const a = h('button', 'btn big', `체력 ${heal} 회복`); a.onclick = () => { Run.hp = Math.min(St.maxHp, Run.hp + heal); Sel = null; afterFloor(); };
  const owned = Object.keys(Run.blessings);
  const b = h('button', 'btn big', owned.length ? '축복 1개 강화 (한 장 더)' : '축복 1장 받기');
  b.onclick = () => { const id = owned.length ? pick(owned) : pick(BLESSINGS).id; Run.blessings[id] = (Run.blessings[id] || 0) + 1; recalc(); flashMsg(`${BLESSINGS.find(x => x.id === id).name} +1`); Sel = null; afterFloor(); };
  row.appendChild(a); row.appendChild(b); box.appendChild(row); c.appendChild(box);
  engravePanel(c, true);
  if (window.__auto) setTimeout(() => { autoEngrave(); (Run.hp < St.maxHp * 0.7 ? a : b).click(); }, 20);
}

// ───────── 이벤트 (내용 미정 → 임시 3종) ─────────
function showEvent() {
  const evs = [
    { t: '부서진 제단', d: '피를 바치면 파편이 흘러나와요.', o: [['체력 15% 잃고 파편 60', () => { Run.hp = Math.max(1, Run.hp - St.maxHp * 0.15); Run.shards += 60; }], ['지나치기', () => 0]] },
    { t: '떠도는 상인', d: '포장된 인장 하나를 팔고 있어요.', o: [['파편 40 내고 무작위 인장', () => { if (Run.shards >= 40) { Run.shards -= 40; Run.pendingEvent = pick(ITEMS).id; } }], ['지나치기', () => 0]] },
    { t: '낡은 각인석', d: '바닥에 각인석이 박혀 있어요.', o: [['각인석 1개 줍기', () => { Run.stones++; }], ['그 자리에서 쉬기 (체력 20%)', () => { Run.hp = Math.min(St.maxHp, Run.hp + St.maxHp * 0.2); }]] },
  ];
  const ev = pick(evs); Scene = 'menu'; const p = panel(); topBar(p);
  const c = h('div', 'card-wrap'); c.innerHTML = `<h1>${ev.t}</h1><p class="lead">${ev.d}</p>`;
  for (const [label, fn] of ev.o) { const b = h('button', 'btn big', label); b.onclick = () => { fn(); if (Run.pendingEvent) { const id = Run.pendingEvent; Run.pendingEvent = null; giveItem(id, afterFloor); } else afterFloor(); }; c.appendChild(b); }
  p.appendChild(c);
  if (window.__auto) setTimeout(() => c.querySelector('.btn').click(), 20);
}

// ───────── 결과 ─────────
function endRun(win) {
  if (Scene === 'result') return;
  Scene = 'result'; const p = panel();
  const c = h('div', 'card-wrap');
  const eng = SLOTS.filter(s => Run.engr[s.k]).map(s => `${s.name}: ${ITEM[Run.engr[s.k].id].name}`).join(' · ') || '없음';
  c.innerHTML = `<h1>${win ? '최종 보스 처치' : '쓰러졌어요'}</h1>
    <p class="lead">${Run.floor}층 · ${Math.floor(Run.time / 60)}분 ${Math.floor(Run.time % 60)}초</p>
    <div class="result">
      <div>처치 <b>${Run.kills}</b></div><div>패링 <b>${Run.parries}</b> (금색 ${Run.golds})</div><div>그로기 <b>${Run.groggies}</b></div><div>최대 한 방 <b>${Run.maxHit}</b></div>
    </div>
    <p>증강: ${Object.entries(Run.augs).map(([k, l]) => AUG[k].name + (AUG[k].max > 1 ? l : '')).join(', ') || '없음'}</p>
    <p>각인: ${eng}</p>`;
  const b = h('button', 'btn big', '다시 시작'); b.onclick = () => startRun(); c.appendChild(b);
  p.appendChild(c);
  window.__lastResult = { win, floor: Run.floor, kills: Run.kills, parries: Run.parries, time: Run.time };
}

function showTitle() {
  Scene = 'title'; const p = panel(); const c = h('div', 'card-wrap title');
  c.innerHTML = `<h1>전투 빌드 프로토타입</h1>
  <p class="lead">30층 + 31층 최종 보스 · 한 층에 전투 한 번 · 회피와 패링이 핵심</p>
  <table class="keys">
    <tr><td>이동</td><td>WASD</td></tr><tr><td>공격 (3타 콤보)</td><td>마우스 왼쪽 / J</td></tr>
    <tr><td>패링</td><td>마우스 오른쪽 / K</td></tr><tr><td>대시</td><td>Space / L / Shift</td></tr>
    <tr><td>대시 직후 공격</td><td>대시 찌르기</td></tr><tr><td>회전베기 (액티브)</td><td>Q / U</td></tr><tr><td>궁극기</td><td>R / I</td></tr>
    <tr><td>일시정지·디버그</td><td>Esc · \` (백틱)</td></tr>
  </table>
  <p class="dim">섬광 색: <b style="color:#fff">흰색</b> 패링 가능 · <b style="color:#ffd27a">금색</b> 패링하면 바로 그로기 · <b style="color:#ff5a5a">붉은색</b> 패링 불가, 회피만</p>`;
  const b = h('button', 'btn big', '시작'); b.onclick = () => { Sfx.init(); startRun(); }; c.appendChild(b); p.appendChild(c);
}
