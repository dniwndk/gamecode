'use strict';
// ───────── 런 진행: 지도, 보상(축복·계약), 상점, 회복, 이벤트, 계약 창 ─────────
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

function startRun(seedVal, test) {
  newRun(seedVal, test);
  Run.map = genMap(); Run.row = 0; Run.node = null; Run.floor = 0;
  // 첫 계약: 1층부터 빌드의 방향이 생기도록 시작할 때 한 장
  showContracts({ title: '첫 계약', grade: 'gold', cb: showMap });
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

// 태그 진행 칩: 가진 태그와 개수 (2개 이상이면 켜진 것)
function tagChips() {
  const out = TAGS.filter(t => tagN(t.name) > 0).sort((a, b) => tagN(b.name) - tagN(a.name)).map(t => { const n = tagN(t.name); return `<span class="kwtag sm${n >= 2 ? ' lit' : ''}" style="border-color:${tagCol(t.name)};color:${tagCol(t.name)}">${t.name} ${n}</span>`; }).join(' ');
  return out || '<span class="dim">없음</span>';
}
function topBar(p) {
  const bar = h('div', 'topbar');
  const acts = ACTS.map(a => `<span class="chip">${a.name}: ${ctOf(a.k).map(c => CT[c.id].name + (c.lv > 1 ? ' ' + c.lv : '')).join(', ') || '<span class="dim">-</span>'}</span>`).join('');
  const ex = ctOf(null).map(c => CT[c.id].name + (c.lv > 1 ? ' ' + c.lv : '')).join(', ');
  const bl = Object.entries(Run.blessings).map(([k, c]) => `<span class="chip">${BLESSINGS.find(b => b.id === k).name}×${c}</span>`).join('') || '<span class="dim">없음</span>';
  bar.innerHTML = `<div class="stats"><b>${Run.floor ? Run.floor + '층' : '출발'}</b> · ${TIERS[Run.tier - 1].name}
    <span class="hp">체력 ${Math.ceil(Run.hp)}/${St.maxHp}</span><span class="sh">파편 ${Run.shards}</span><span>리롤권 ${Run.rerolls}</span>${Run.test ? '<span class="dim">계약 시험 런</span>' : ''}</div>
    <div class="row"><span class="lbl">행위 계약</span>${acts}</div>
    <div class="row"><span class="lbl">존재 계약</span>${ex ? `<span class="chip">${ex}</span>` : '<span class="dim">없음</span>'} <span class="lbl" style="margin-left:14px">태그</span>${tagChips()}</div>
    <div class="row"><span class="lbl">축복</span>${bl}</div>`;
  const cb = h('button', 'btn small codexbtn', '계약·능력치 (Tab)'); cb.onclick = () => toggleCodex(); bar.appendChild(cb);
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
  side.innerHTML = `<div class="hint">다음 칸을 고르세요. 상점·회복·이벤트 칸은 그 층 전투 보상을 포기해요.<br>일반 층은 축복, 정예 층과 보스는 계약, 저주 전투는 골드 이상 계약을 줘요.${Run.quest && !Run.quest.done ? `<br><b style="color:#7fffe0">과제: ${QUESTS[Run.quest.k].name} (${Math.floor(Run.quest.n)}/${Run.quest.goal})</b>` : ''}</div>`;
  const eb = h('button', 'btn', '계약·태그 보기 (Tab)'); eb.onclick = () => toggleCodex(); side.appendChild(eb);
  p.appendChild(side);
}

// ───────── 전투 클리어 → 보상 ─────────
// 설계서 6.1: 일반·정예·저주 층 = 축복 3택1 / 중간보스(5층) = 계약 3택1 / 계층보스(10층) = 계약 3택1 + 프리즘 계약 3택1
function fightCleared() {
  const n = Run.node; const k = n.type;
  if (k === 'final') { endRun(true); return; }
  P.noHit0 = P.noHit; ctOnFloorClear();
  let base = k === 'boss' ? (n.row === 5 ? 40 : 60) : n.elite ? 25 : 15;
  if (n.type === 'curse') base *= 2;
  const heavy = (n.mods || []).some(m => MOD[m].heavy), light = (n.mods || []).some(m => !MOD[m].heavy);
  if (heavy) base *= 1.5; else if (light) base *= 1.2;
  base = Math.round(base * (1 + St.shardMul));
  Run.shards += base;
  const queue = [];
  if (k === 'boss') {
    queue.push(() => showContracts({ title: n.row === 5 ? '중간보스 보상: 계약' : '계층보스 보상: 계약', cb: next }));
    if (n.row === 10) queue.push(() => showContracts({ prism: true, tier: true, title: '계층보스 보상: 프리즘 계약', cb: next }));
  } else {
    // 정예 층 = 계약, 저주 전투 = 골드 이상 계약 + 축복, 일반 층 = 축복
    if (n.type === 'curse') { queue.push(() => showContracts({ title: '저주 전투 보상: 골드 이상 계약', minGold: true, cb: next })); queue.push(() => showBlessings(4, next)); }
    else if (n.elite) queue.push(() => showContracts({ title: '정예 보상: 계약', cb: next }));
    else { queue.push(() => showBlessings(heavy ? 4 : 3, next)); if (Run.test) queue.push(() => showContracts({ title: '계약 (시험 런: 모든 전투 층)', cb: next })); }
  }
  // 의식 과제를 끝냈으면 프리즘 계약
  while (Run.questPicks > 0) { Run.questPicks--; queue.push(() => showContracts({ prism: true, title: '과제 보상: 프리즘 계약', cb: next })); }
  const flawless = P.noHit0 ? 12 : 0; if (flawless) Run.shards += flawless; // 무피격 보너스
  queue.unshift(() => notice('클리어', `${Run.floor}층 클리어 · 파편 +${base}${Run.floorShards ? ` (처치 파편 +${Run.floorShards})` : ''}${flawless ? ` · <b style="color:#9ffcff">무피격 +${flawless}</b>` : ''}${World.topRank ? ` · 최고 기세 <b style="color:${RANKS[World.topRank].col}">${RANKS[World.topRank].k}</b>` : ''}`, next, true));
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
  setTimeout(() => window.__auto && b.isConnected && b.click(), 20);
}

// 카드 고르기 공통 (카드마다 무료 리롤 1회, 그 뒤 화면 공용 무료 리롤(천운 3개), 그 뒤 리롤권)
function cardPicker({ title, sub, cards, render, reroll, onPick, skipLabel, onSkip, extraFree }) {
  Scene = 'menu'; const p = panel(); topBar(p);
  const c = h('div', 'card-wrap'); c.innerHTML = `<h1>${title}</h1><p class="lead">${sub}</p>`;
  const row = h('div', 'cards'); c.appendChild(row);
  const free = cards.map(() => true); let bonus = extraFree || 0;
  const draw = () => {
    row.innerHTML = '';
    cards.forEach((cd, i) => {
      const box = h('div', 'cardbox');
      const el = h('button', 'card'); el.innerHTML = render(cd); el.onclick = () => onPick(cd); box.appendChild(el);
      const rr = h('button', 'btn small', free[i] ? '무료 리롤' : bonus > 0 ? `무료 리롤 (천운 ${bonus})` : `리롤권 사용 (${Run.rerolls})`);
      rr.disabled = !free[i] && bonus <= 0 && Run.rerolls <= 0;
      rr.onclick = () => { const nc = reroll(cd, cards); if (!nc) { flashMsg('다시 뽑을 카드가 없어요'); return; } if (free[i]) free[i] = false; else if (bonus > 0) bonus--; else Run.rerolls--; cards[i] = nc; draw(); };
      box.appendChild(rr); row.appendChild(box);
    });
  };
  draw();
  if (skipLabel) { const s = h('button', 'btn ghost', skipLabel); s.onclick = onSkip; c.appendChild(s); }
  p.appendChild(c);
  setTimeout(() => { if (!window.__auto) return; const b = row.querySelector('.card'); b && b.isConnected && b.click(); }, 20);
}

function showBlessings(n, cb) {
  // 빛나는 축복: 15% 확률로 3장어치
  const mk = b => ({ b, shiny: R() < 0.15 });
  const pool = cs => shuffle(BLESSINGS.slice()).filter(x => !(cs || []).some(c => c.b === x));
  const cards = pool().slice(0, n).map(mk);
  cardPicker({
    title: '축복', sub: '하나를 고르세요. 같은 축복은 계속 쌓여요. <b style="color:#ffe9b0">빛나는 축복</b>은 3장어치예요.', cards,
    render: c => `${c.shiny ? '<div class="grade" style="color:#ffe9b0">✦ 빛나는 축복 ×3</div>' : ''}<div class="cname"${c.shiny ? ' style="color:#ffe9b0"' : ''}>${c.b.name}</div><div class="cdesc">${c.b.desc}${c.shiny ? ' <b>× 3</b>' : ''}</div><div class="cfoot">보유 ${Run.blessings[c.b.id] || 0}</div>`,
    reroll: (c, cs) => { const x = pool(cs)[0]; return x ? mk(x) : null; },
    onPick: c => { for (let i = 0; i < (c.shiny ? 3 : 1); i++) addBlessing(c.b.id); cb(); },
    skipLabel: '건너뛰기 (파편 +10)', onSkip: () => { Run.shards += 10; cb(); },
  });
}
function addBlessing(id) { Run.blessings[id] = (Run.blessings[id] || 0) + 1; recalc(); if (id === 'tough') Run.hp = Math.min(St.maxHp, Run.hp + 6); }
function flashMsg(t) { const ts = document.querySelectorAll('.toast'); if (ts.length >= 3) ts[0].remove(); const n = Math.min(2, ts.length); const m = h('div', 'toast', t); m.style.top = (12 + n * 6) + '%'; document.body.appendChild(m); setTimeout(() => m.remove(), 2400); }

// ───────── 상점: 축복·회복을 팔고, 계약을 파기해요 (아이템은 방식이 정해지지 않아 없음) ─────────
function showShop() {
  Scene = 'menu';
  const disc = C('regular') ? 0.8 : 1; const price = v => Math.round(v * disc);
  let freeRef = C('regular') ? 1 : 0; let refCost = 20;
  const roll = () => shuffle(BLESSINGS.slice()).slice(0, 3).map(b => ({ kind: 'bless', id: b.id, price: price(40), sold: false })).concat([{ kind: 'heal', price: price(35), sold: false }]);
  let stock = roll();
  // 계약 한 장 판매 (새로고침해도 그대로)
  const CPRICE = { silver: 70, gold: 100, prism: 150 };
  const sale = { c: rollContracts(wpick([['silver', 45], ['gold', 40], ['prism', 15]]), 1, 0)[0], sold: false };
  const p = panel(); const c = h('div', 'wide');
  const draw = () => {
    p.innerHTML = ''; topBar(p); p.appendChild(c); c.innerHTML = '';
    const shopBox = h('div', 'shop'); c.appendChild(shopBox);
    shopBox.innerHTML = `<h2>상점 <span class="dim">— 이 층 전투 보상은 없어요${disc < 1 ? ' · 단골 손님 -20%' : ''}</span></h2>`;
    const row = h('div', 'shoprow');
    for (const st of stock) {
      const b0 = st.kind === 'bless' ? BLESSINGS.find(x => x.id === st.id) : null;
      const b = h('button', 'shopitem' + (st.sold ? ' sold' : ''), `<div class="iname">${b0 ? '축복: ' + b0.name : '회복 물약'}</div><div class="dim">${b0 ? b0.desc : '체력 30% 회복'}</div><div class="price">${st.sold ? '판매됨' : st.price + ' 파편'}</div>`);
      b.disabled = st.sold || Run.shards < st.price || (st.kind === 'heal' && Run.hp >= St.maxHp);
      b.onclick = () => { Run.shards -= st.price; st.sold = true; if (b0) addBlessing(b0.id); else heal(Math.round(St.maxHp * 0.3)); Sfx.pick(); draw(); };
      row.appendChild(b);
    }
    if (sale.c) { const sc = sale.c, pr = price(CPRICE[sc.grade]);
      const b = h('button', 'shopitem wide2' + (sale.sold ? ' sold' : ''), `<div class="iname" style="color:${GRADE[sc.grade].col}">계약: ${sc.name} <small>${GRADE[sc.grade].name}</small></div><div class="dim">${sc.d(Math.min(sc.max, C(sc.id) + 1))}</div><div>${sc.tags.map(t => tagChip(t, true, ' ' + tagN(t))).join(' ')}</div><div class="price">${sale.sold ? '판매됨' : pr + ' 파편'}</div>`);
      b.disabled = sale.sold || Run.shards < pr || !ctAvail(sc);
      b.onclick = () => { Run.shards -= pr; sale.sold = true; Sfx.pick(); if (sc.act === 'pick') ctChooseAct(sc, showShopBack); else takeContract(sc.id, sc.act, showShopBack); };
      row.appendChild(b); }
    shopBox.appendChild(row);
    const row2 = h('div', 'shoprow');
    const rf = h('button', 'btn', freeRef ? '새로고침 (무료)' : `새로고침 (${refCost})`); rf.disabled = !freeRef && Run.shards < refCost;
    rf.onclick = () => { if (freeRef) freeRef--; else { Run.shards -= refCost; refCost += 10; } stock = roll(); draw(); }; row2.appendChild(rf);
    const lv = h('button', 'btn ghost', '상점 나가기'); lv.onclick = () => afterFloor(); row2.appendChild(lv);
    shopBox.appendChild(row2);
    // 계약 파기
    const cost = price(30);
    const box = h('div', 'engrave'); box.appendChild(h('div', 'etitle', `계약 파기 <span class="dim">맺은 계약은 옮길 수 없고, 여기서 파기만 할 수 있어요 (${cost} 파편). 태그 수도 함께 줄어요.</span>`));
    const list = h('div', 'ctgrid');
    if (!Run.cts.length) list.appendChild(h('div', 'dim', '맺은 계약이 없어요.'));
    for (const inst of Run.cts) {
      const item = h('div', 'ctrow'); item.innerHTML = `<div class="ctwhere">${actLabel(inst)}</div>` + ctLine(inst);
      const rb = h('button', 'btn small', `파기 (${cost})`); rb.disabled = Run.shards < cost;
      rb.onclick = () => { Run.shards -= cost; ctRemove(inst); flashMsg(`${CT[inst.id].name} 파기`); draw(); };
      item.appendChild(rb); list.appendChild(item);
    }
    box.appendChild(list); c.appendChild(box);
  };
  const showShopBack = () => { Scene = 'menu'; UI.innerHTML = ''; UI.style.pointerEvents = 'auto'; UI.appendChild(p); draw(); };
  draw();
  if (window.__auto) setTimeout(() => { for (const st of stock) if (!st.sold && Run.shards >= st.price + 20 && (st.kind === 'bless' || Run.hp < St.maxHp * 0.7)) { Run.shards -= st.price; st.sold = true; if (st.kind === 'bless') addBlessing(st.id); else heal(Math.round(St.maxHp * 0.3)); } setTimeout(afterFloor, 20); }, 20);
}

// ───────── 회복 ─────────
function showRest() {
  Scene = 'menu'; const p = panel(); topBar(p); const c = h('div', 'wide'); p.appendChild(c);
  const box = h('div', 'shop'); box.innerHTML = '<h2>회복 <span class="dim">— 둘 중 하나</span></h2>';
  const row = h('div', 'shoprow');
  const amt = Math.round(St.maxHp * 0.4);
  const a = h('button', 'btn big', `체력 ${amt} 회복`); a.onclick = () => { heal(amt); afterFloor(); };
  const owned = Object.keys(Run.blessings);
  const b = h('button', 'btn big', owned.length ? '축복 1개 강화 (한 장 더)' : '축복 1장 받기');
  b.onclick = () => { const id = owned.length ? pick(owned) : pick(BLESSINGS).id; addBlessing(id); flashMsg(`${BLESSINGS.find(x => x.id === id).name} +1`); afterFloor(); };
  row.appendChild(a); row.appendChild(b); box.appendChild(row); c.appendChild(box);
  if (window.__auto) setTimeout(() => (Run.hp < St.maxHp * 0.7 ? a : b).click(), 20);
}

// ───────── 이벤트 (내용 미정 → 임시 7종). 선택지 함수가 true를 돌려주면 그 선택지가 다음 화면을 직접 열어요 ─────────
function showEvent() {
  const lose = k => { Run.hp = Math.max(1, Run.hp - Math.round(St.maxHp * k)); };
  const evs = [
    { t: '부서진 제단', d: '피를 바치면 파편이 흘러나와요.', o: [['체력 15% 잃고 파편 60', () => { lose(0.15); Run.shards += 60; }], ['지나치기', () => 0]] },
    { t: '떠도는 상인', d: '포장된 축복 두 개를 팔고 있어요.', o: [['파편 40 내고 무작위 축복 2장', () => { if (Run.shards >= 40) { Run.shards -= 40; const got = [pick(BLESSINGS), pick(BLESSINGS)]; got.forEach(b => addBlessing(b.id)); flashMsg(got.map(b => b.name).join(', ') + ' 획득'); } else flashMsg('파편이 모자라요'); }], ['지나치기', () => 0]] },
    { t: '고요한 샘', d: '맑은 물이 고여 있어요.', o: [['물을 마시기 (체력 20%)', () => { heal(Math.round(St.maxHp * 0.2)); }], ['동전을 던지기 (리롤권 +1)', () => { Run.rerolls = Math.min(5, Run.rerolls + 1); }]] },
    { t: '속삭이는 계약서', d: '누군가 두고 간 계약서가 피를 원해요.', o: [['체력 20% 잃고 골드 계약 고르기', () => { lose(0.2); showContracts({ title: '속삭이는 계약서', grade: 'gold', cb: afterFloor }); return true; }], ['지나치기', () => 0]] },
    { t: '피의 서약', d: '더 큰 힘에는 되돌릴 수 없는 값이 따라요.', o: [['최대 체력 -12 (영구), 프리즘 계약 고르기', () => { Run.hpMod = (Run.hpMod || 0) - 12; recalc(); showContracts({ prism: true, title: '피의 서약: 프리즘 계약', cb: afterFloor }); return true; }], ['지나치기', () => 0]] },
    { t: '도박꾼 까마귀', d: '까마귀가 반짝이는 것을 걸자고 해요.', o: [['파편 30 걸기 (절반 확률로 90)', () => { if (Run.shards < 30) { flashMsg('파편이 모자라요'); return; } Run.shards -= 30; if (R() < 0.5) { Run.shards += 90; flashMsg('이겼어요! 파편 +90'); } else flashMsg('졌어요…'); }], ['지나치기', () => 0]] },
    { t: '뒤틀린 거울', d: '거울 속의 내가 계약서를 한 장 더 쓰고 있어요.', o: [['맺은 계약 하나를 한 단계 올리기', () => { const up = Run.cts.filter(x => x.lv < CT[x.id].max); if (up.length) { const x = pick(up); x.lv++; recalc(); flashMsg(`${CT[x.id].name} ${x.lv}단계`); } else { Run.rerolls = Math.min(5, Run.rerolls + 2); flashMsg('올릴 계약이 없어 리롤권 +2'); } }], ['무작위 축복 2장', () => { const got = [pick(BLESSINGS), pick(BLESSINGS)]; got.forEach(b => addBlessing(b.id)); flashMsg(got.map(b => b.name).join(', ') + ' 획득'); }]] },
  ];
  const ev = pick(evs); Scene = 'menu'; const p = panel(); topBar(p);
  const c = h('div', 'card-wrap'); c.innerHTML = `<h1>${ev.t}</h1><p class="lead">${ev.d}</p>`;
  for (const [label, fn] of ev.o) { const b = h('button', 'btn big', label); b.onclick = () => { if (!fn()) afterFloor(); }; c.appendChild(b); }
  p.appendChild(c);
  if (window.__auto) setTimeout(() => c.querySelector('.btn').click(), 20);
}

// ───────── 결과 ─────────
function endRun(win) {
  if (Scene === 'result') return;
  Scene = 'result'; const p = panel();
  const c = h('div', 'card-wrap');
  const list = Run.cts.map(x => `${CT[x.id].name}${x.lv > 1 ? ' ' + x.lv : ''}${x.act ? `(${ACT[x.act].name})` : ''}`).join(' · ') || '없음';
  c.innerHTML = `<h1>${win ? '최종 보스 처치' : '쓰러졌어요'}</h1>
    <p class="lead">${Run.floor}층 · ${Math.floor(Run.time / 60)}분 ${Math.floor(Run.time % 60)}초</p>
    <div class="result">
      <div>처치 <b>${Run.kills}</b></div><div>방어 <b>${Run.parries}</b> (퍼펙트 ${Run.perfects || 0}, 금색 ${Run.golds})</div><div>저스트 회피 <b>${Run.justs || 0}</b></div><div>최고 기세 <b>${RANKS[Run.bestRank || 0].k || '-'}</b></div><div>최대 한 방 <b>${Run.maxHit}</b></div>
    </div>
    <p>맺은 계약 ${Run.cts.length}개: ${list}</p>
    <p>태그: ${tagChips()}</p>`;
  const b = h('button', 'btn big', '다시 시작'); b.onclick = () => startRun(null, Run.test); c.appendChild(b);
  const t = h('button', 'btn', '처음 화면'); t.onclick = showTitle; c.appendChild(t);
  p.appendChild(c);
  window.__lastResult = { win, floor: Run.floor, kills: Run.kills, parries: Run.parries, perfects: Run.perfects || 0, time: Run.time, contracts: Run.cts.length };
}

function showTitle() {
  Scene = 'title'; const p = panel(); const c = h('div', 'card-wrap title');
  c.innerHTML = `<h1>마녀 계약 전투 프로토타입</h1>
  <p class="lead">30층 + 31층 최종 보스 · 한 층에 전투 한 번 · 회피(대시)와 방어가 핵심</p>
  <table class="keys">
    <tr><td>이동</td><td>WASD</td></tr><tr><td>평타 (3타 콤보)</td><td>마우스 왼쪽 / J</td></tr>
    <tr><td>방어</td><td>마우스 오른쪽 / K</td></tr><tr><td>대시</td><td>Space / L / Shift</td></tr>
    <tr><td>대시 직후 평타</td><td>대시 공격</td></tr><tr><td>마법 (임시: 회전베기)</td><td>Q / U</td></tr><tr><td>궁극기</td><td>R / I</td></tr>
    <tr><td>계약·능력치 창</td><td>Tab</td></tr><tr><td>일시정지·디버그</td><td>Esc · \` (백틱)</td></tr>
  </table>
  <p class="lead">시작할 때, 정예 층(6~9층), 5층마다 보스에서 <b>계약</b>을 맺어요. <b>행위 계약</b>은 평타·마법·방어·대시·궁극기 중 한 행동을 강화하고, <b>존재 계약</b>은 늘 켜져 있어요.<br>같은 <b>태그</b>의 계약을 2·3·4개 모으면 태그 시너지가 켜져요.</p>
  <p class="dim">섬광 색: <b style="color:#fff">흰색</b> 방어 가능 · <b style="color:#ffd27a">금색</b> 강공격, 방어하면 길게 경직 · <b style="color:#ff5a5a">붉은색</b> 방어 불가, 회피만</p>`;
  const b = h('button', 'btn big', '시작'); b.onclick = () => { Sfx.init(); startRun(); }; c.appendChild(b);
  const t = h('button', 'btn', '계약 시험 런 (모든 전투 층에서 계약)'); t.onclick = () => { Sfx.init(); startRun(null, true); }; c.appendChild(t);
  c.appendChild(h('p', 'dim', '연속 타격으로 <b>기세</b> 등급을 올리면 피해가 늘고, 대시로 공격을 아슬하게 흘리면 <b>저스트 회피</b>(다음 공격 치명)가 떠요.<br>시험 런은 일반 층에서도 계약을 줘서 태그 시너지를 더 빨리 모아 볼 수 있어요.'));
  p.appendChild(c);
}

// ───────── 계약 창 (Tab): 맺은 계약, 태그 시너지, 능력치 ─────────
let codexPrevPause = false;
function toggleCodex() {
  const old = document.getElementById('codex');
  if (old) { old.remove(); if (Scene === 'fight') paused = codexPrevPause; return; }
  if (!Run || Scene === 'title' || Scene === 'result') return;
  if (Scene === 'fight') { codexPrevPause = paused; paused = true; }
  recalc();
  const o = h('div', 'codex'); o.id = 'codex';
  const pc = v => (v >= 0 ? '+' : '') + Math.round(v * 100) + '%';
  // 1) 계약: 행동별 + 존재
  const groups = ACTS.map(a => [a.name + ` <small class="dim">${a.key}</small>`, ctOf(a.k)]).concat([['존재 계약 <small class="dim">늘 켜짐</small>', ctOf(null)]]);
  const ctHtml = groups.map(([name, list]) => `<div class="cgroup"><div class="ghead">${name} <span class="dim">${list.length}</span></div>${list.map(ctLine).join('') || '<div class="dim gempty">없음</div>'}</div>`).join('');
  // 2) 태그 시너지: 가진 태그 먼저, 단계별 켜짐 표시
  const tagHtml = TAGS.slice().sort((a, b) => tagN(b.name) - tagN(a.name)).map(t => {
    const n = tagN(t.name);
    const who = [...new Set(Run.cts.filter(c => CT[c.id].tags.includes(t.name)).map(c => CT[c.id].name))].join(', ');
    return `<div class="csyn2 ${n >= 2 ? 'on' : ''}" style="${n ? `border-left:4px solid ${tagCol(t.name)}` : ''}"><div><b style="color:${tagCol(t.name)}">${t.name}</b> <span class="tcount">${n}개</span> <span class="dim">${who}</span></div>
      ${t.t.map((d, i) => `<div class="tier ${n >= i + 2 ? 'on' : ''}"><span class="tn">${i + 2}</span>${d}</div>`).join('')}</div>`;
  }).join('');
  // 3) 능력치
  const q = Run.quest;
  const stats = [
    ['최대 체력', `${St.maxHp} (현재 ${Math.ceil(Run.hp)})`], ['모든 피해', pc(St.dmg)], ['공격 속도', pc(St.atkSpd - 1)], ['이동 속도', pc(St.move - 1)],
    ['치명 확률', Math.round(St.crit * 100) + '%'], ['치명 피해', '×' + St.critDmg.toFixed(2)],
    ['대시', `${St.dashMax}회 · ${St.dashCd.toFixed(2)}초`], ['마법', `${St.spinMax}회 · ${St.spinCd.toFixed(1)}초`],
    ['방어 판정', St.parryWin.toFixed(2) + '초'], ['퍼펙트 방어', `앞 ${St.perfectWin.toFixed(2)}초, 다음 공격 +${Math.round(St.perfectBonus * 100)}%`], ['포이즈 피해', pc(St.poise)], ['방어 경직', '×' + St.staggerMul.toFixed(2)],
    ['궁극기 충전', C('forsake') ? '쓸 수 없음' : '×' + St.ultGain.toFixed(2)], ['받는 피해', '×' + St.dmgTaken.toFixed(2)], ['파편 획득', pc(St.shardMul)], ['몸집', '×' + St.size.toFixed(2)],
  ];
  if (Run.soul) stats.push(['영혼 병', `마법 피해 +${Run.soul}%`]);
  if (Run.swell) stats.push(['부풀어 오르는 몸', `최대 체력 +${Run.swell}`]);
  if (Run.iouFloors > 0) stats.push(['악마의 차용증', `남은 ${Run.iouFloors}층 받는 피해 증가`]);
  const bl = Object.entries(Run.blessings).map(([id, c]) => { const b = BLESSINGS.find(x => x.id === id); return `<div class="cbl"><b>${b.name} ×${c}</b> <span class="dim">${b.desc} × ${c}</span></div>`; }).join('') || '<p class="dim">고른 축복이 없어요.</p>';
  o.innerHTML = `<div class="codex-in">
    <div class="codex-head"><h2>계약 · 태그 시너지 · 능력치</h2><span class="dim">Tab 또는 Esc로 닫기${Scene === 'fight' ? ' · 여는 동안 전투가 멈춰요' : ''}</span></div>
    <div class="codex-cols">
      <section><h3>맺은 계약 <span class="dim">${Run.cts.length}개</span></h3><div class="clist">${ctHtml}</div></section>
      <section><h3>태그 시너지 <span class="dim">같은 태그 2 · 3 · 4개</span></h3><div class="clist">${tagHtml}</div></section>
      <section><h3>능력치</h3><table class="cstats">${stats.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}</table>
        ${q ? `<h3>의식 과제</h3><div class="cbl"><b>${QUESTS[q.k].name}</b> <span class="dim">${q.done ? '완수' : `${Math.floor(q.n)} / ${q.goal}`}</span></div>` : ''}
        <h3>고른 축복</h3>${bl}</section>
    </div></div>`;
  o.onclick = e => { if (e.target === o) toggleCodex(); };
  UI.appendChild(o); UI.style.pointerEvents = 'auto';
}
