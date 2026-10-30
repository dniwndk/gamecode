// 준비 단계 ★ 핵심 화면: 시너지 | 전방·후방 보드 | 적 예고 / 대기석 / 상점.
import type { Ctx, Screen } from '../app';
import {
  COST_COLOR, attachTip, readable, enemyPortrait, hideTip, nodeTrack, openLevelUp, openUnitDetail, portrait, shortName, synHex, synergyRow, topBar, unitCard,
} from '../components';
import { cls, h } from '../dom';
import { icon } from '../icons';
import type { RunView, UiState, UnitInstanceView, Zone } from '../model';

type Loc = { zone: Zone; index: number };

export function mountPreparation(ctx: Ctx, s0: UiState): Screen {
  const el = h('section', { class: 'k-prep' });
  let run: RunView = s0.run!;
  let justDragged = false;
  let drag: { inst: UnitInstanceView; from: Loc; ghost: HTMLElement; startX: number; startY: number; active: boolean; pointerId: number } | null = null;

  function find(instanceId: string): { inst: UnitInstanceView; loc: Loc } | null {
    for (const zone of ['front', 'rear', 'bench'] as const) {
      const idx = run.board[zone].findIndex((i) => i?.instanceId === instanceId);
      if (idx >= 0) return { inst: run.board[zone][idx]!, loc: { zone, index: idx } };
    }
    return null;
  }

  async function moveTo(instanceId: string, to: Loc) {
    ctx.ui.selected = null;
    await ctx.send('MOVE_UNIT', { instanceId, to });
    draw();
  }

  async function sell(inst: UnitInstanceView) {
    const u = ctx.lookup.unit(inst.unitId);
    const ok = await ctx.confirm({
      title: '학생 판매', confirm: `${inst.sellValue}G에 판매`, danger: true,
      body: [`${u.name} ${inst.star}성을 판매합니다.`, inst.star >= 2 ? `판매가 ${inst.sellValue}G (2성 이상 감가 −1G 반영)` : `판매가 ${inst.sellValue}G`],
    });
    if (ok) { ctx.ui.selected = null; await ctx.send('SELL_UNIT', { instanceId: inst.instanceId }); }
  }

  // ── 드래그(포인터 공용: 마우스·터치·펜) ─────────────────────
  function startPointer(e: PointerEvent, inst: UnitInstanceView, from: Loc, card: HTMLElement) {
    if (e.button !== 0) return;
    const ghost = card.cloneNode(true) as HTMLElement;
    ghost.classList.add('k-ghost');
    drag = { inst, from, ghost, startX: e.clientX, startY: e.clientY, active: false, pointerId: e.pointerId };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
    window.addEventListener('pointercancel', cancelDrag, { once: true });
  }
  function onMove(e: PointerEvent) {
    if (!drag || e.pointerId !== drag.pointerId) return;
    if (!drag.active && Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > 8) {
      drag.active = true;
      hideTip();
      document.body.append(drag.ghost);
      drag.ghost.style.setProperty('--gs', String(ctx.scale()));
      el.classList.add('is-dragging');
      markTargets(drag.inst, drag.from);
    }
    if (drag.active) {
      drag.ghost.style.left = `${e.clientX}px`;
      drag.ghost.style.top = `${e.clientY}px`;
      const over = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-drop]');
      el.querySelectorAll('.is-over').forEach((n) => n.classList.remove('is-over'));
      over?.classList.add('is-over');
    }
  }
  function onUp(e: PointerEvent) {
    window.removeEventListener('pointermove', onMove);
    if (!drag) return;
    const d = drag;
    drag = null;
    d.ghost.remove();
    el.classList.remove('is-dragging');
    clearTargets();
    if (!d.active) return; // 클릭은 click 핸들러가 처리
    justDragged = true;
    setTimeout(() => { justDragged = false; }, 0);
    const target = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-drop]');
    if (!target) return;
    const drop = target.dataset.drop!;
    if (drop === 'sell') { void sell(d.inst); return; }
    const [zone, index] = drop.split(':');
    void moveTo(d.inst.instanceId, { zone: zone as Zone, index: Number(index) });
  }
  function cancelDrag() {
    window.removeEventListener('pointermove', onMove);
    drag?.ghost.remove();
    drag = null;
    el.classList.remove('is-dragging');
    clearTargets();
  }
  function markTargets(inst: UnitInstanceView, from: Loc) {
    const full = run.deployedCount >= run.deployLimit && from.zone === 'bench';
    el.querySelectorAll<HTMLElement>('[data-drop]').forEach((n) => {
      const [zone] = (n.dataset.drop ?? '').split(':');
      const occupied = n.classList.contains('is-occupied');
      const ok = zone === 'sell' || zone === 'bench' || (zone === 'front' && inst.placeable.front && (occupied || !full)) || (zone === 'rear' && inst.placeable.rear && (occupied || !full));
      n.classList.add(ok ? 'is-valid' : 'is-invalid');
    });
  }
  function clearTargets() {
    el.querySelectorAll('.is-valid, .is-invalid, .is-over').forEach((n) => n.classList.remove('is-valid', 'is-invalid', 'is-over'));
  }

  // ── 칸 ───────────────────────────────────────────────
  function slot(zone: Zone, index: number, inst: UnitInstanceView | null): HTMLElement {
    const label = `${zone === 'front' ? 'F' : zone === 'rear' ? 'R' : 'B'}${index + 1}`;
    const atLimit = zone !== 'bench' && !inst && run.deployedCount >= run.deployLimit;
    const cell = h('div', {
      class: cls('k-slot', `is-${zone}`, inst && 'is-occupied', atLimit && 'is-capped'),
      'data-drop': `${zone}:${index}`, 'data-slot': label,
    }, h('span', { class: 'k-slot-label' }, label));
    if (zone !== 'bench') cell.append(h('span', { class: 'k-slot-ring', 'aria-hidden': 'true' }));
    if (inst) {
      const selected = ctx.ui.selected === inst.instanceId;
      const card = unitCard(ctx, { unitId: inst.unitId, inst, size: 's', showCost: zone === 'bench', className: cls(selected && 'is-selected') });
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', `${label} ${ctx.lookup.unit(inst.unitId).name} ${inst.star}성${selected ? ', 선택됨. 다시 누르면 상세' : ''}`);
      card.dataset.inst = inst.instanceId;
      card.addEventListener('pointerdown', (e) => startPointer(e, inst, { zone, index }, card));
      const activate = () => {
        if (justDragged) return;
        const sel = ctx.ui.selected;
        if (sel === inst.instanceId) { openUnitDetail(ctx, inst.unitId, inst, zone); return; }
        if (sel && find(sel)) { void moveTo(sel, { zone, index }); return; }
        ctx.ui.selected = inst.instanceId;
        draw();
      };
      card.addEventListener('click', activate);
      card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); } });
      card.addEventListener('contextmenu', (e) => { e.preventDefault(); openUnitDetail(ctx, inst.unitId, inst, zone); });
      cell.append(card);
    } else {
      cell.tabIndex = ctx.ui.selected ? 0 : -1;
      cell.setAttribute('role', 'button');
      cell.setAttribute('aria-label', `${label} 빈 칸`);
      const activate = () => { if (ctx.ui.selected) void moveTo(ctx.ui.selected, { zone, index }); };
      cell.addEventListener('click', activate);
      cell.addEventListener('keydown', (e) => { if (e.key === 'Enter') activate(); });
      if (atLimit) cell.title = `편성 인원이 가득 찼어요 (${run.deployedCount}/${run.deployLimit})`;
    }
    return cell;
  }

  // ── 영역별 그리기 ───────────────────────────────────────
  function synergyPanel(): HTMLElement {
    const list = h('div', { class: 'k-syn-list', role: 'list' });
    const active = run.synergies.filter((x) => x.activeTier !== null || x.count > 0 || x.tracked);
    if (!active.length) list.append(h('p', { class: 'k-empty' }, '학생을 전방·후방에 배치하면 시너지가 여기에 나타나요.'));
    for (const s of active) list.append(synergyRow(ctx, s, run, (id) => void ctx.send('SET_TRACKED_SYNERGY', { synergyId: id })));
    return h('aside', { class: 'k-panel k-syn-panel', 'aria-label': '시너지' },
      h('header', { class: 'k-panel-head' }, h('h2', null, '시너지'), h('small', null, `${run.synergies.filter((x) => x.activeTier !== null).length}개 활성`)),
      list);
  }

  function boardPanel(): HTMLElement {
    const front = h('div', { class: 'k-row is-front' }, ...run.board.front.map((inst, i) => slot('front', i, inst)));
    const rear = h('div', { class: 'k-row is-rear' }, ...run.board.rear.map((inst, i) => slot('rear', i, inst)));
    return h('div', { class: 'k-board' },
      h('div', { class: 'k-board-plane', 'aria-hidden': 'true' }),
      h('div', { class: 'k-board-dir' }, icon('back', 18, 'k-up'), '적 방향'),
      h('div', { class: 'k-row-label is-front' }, icon('front', 22), h('b', null, '전방'), h('small', null, 'F1~F4 · 피격·공격')),
      front,
      h('div', { class: 'k-frontline', 'aria-hidden': 'true' }, h('span', null, 'FRONT LINE')),
      h('div', { class: 'k-row-label is-rear' }, icon('rear', 22), h('b', null, '후방'), h('small', null, 'R1~R6 · HP 없음 · 정기 지원')),
      rear,
      h('div', { class: 'k-deploy-count', title: '편성 인원 / 레벨' }, h('b', null, `${run.deployedCount}`), h('span', null, `/ ${run.deployLimit}`), h('small', null, '편성')));
  }

  function intelPanel(): HTMLElement {
    const cand = run.node.candidates.find((c) => c.id === run.node.chosen) ?? run.node.candidates[0];
    const nodeLabel = run.nodeType === 'boss' ? '보스' : run.nodeType === 'elite' ? '정예' : '일반';
    const tabs = h('div', { class: 'k-cand-tabs', role: 'tablist' }, ...run.node.candidates.map((c) => h('button', {
      class: cls('k-cand', c.id === cand.id && 'on'), role: 'tab', 'aria-selected': c.id === cand.id ? 'true' : 'false',
      onclick: () => void ctx.send('CHOOSE_NODE_CANDIDATE', { candidateId: c.id }),
    }, h('b', null, c.id), h('span', null, c.label))));
    const mini = (zone: 'front' | 'rear', n: number) => h('div', { class: `k-mini-row is-${zone}` }, ...Array.from({ length: n }, (_, i) => {
      const slotE = (zone === 'front' ? cand.front : cand.rear).find((x) => x.index === i);
      return h('div', { class: cls('k-mini-slot', slotE && 'is-filled') }, slotE ? enemyPortrait(ctx, slotE.enemyId) : null);
    }));
    const uniq = [...new Set([...cand.front, ...cand.rear].map((x) => x.enemyId))];
    return h('aside', { class: 'k-panel k-intel', 'aria-label': '적 예고' },
      h('header', { class: 'k-panel-head' }, h('h2', null, '적 예고'), h('span', { class: `k-node-badge is-${run.nodeType}` }, icon(run.nodeType === 'boss' ? 'skull' : run.nodeType === 'elite' ? 'diamond' : 'dot', 16), nodeLabel)),
      run.node.candidates.length > 1 ? tabs : h('p', { class: 'k-cand-single' }, cand.label),
      h('div', { class: 'k-mini-board' }, mini('rear', 6), mini('front', 4)),
      h('div', { class: 'k-enemy-list' }, ...uniq.map((id) => {
        const e = ctx.lookup.enemy(id)!;
        const count = [...cand.front, ...cand.rear].filter((x) => x.enemyId === id).length;
        const row = h('div', { class: cls('k-enemy-row', e.boss && 'is-boss'), tabindex: 0 },
          enemyPortrait(ctx, id),
          h('div', null, h('strong', null, e.name.replace(/\s*\(.*\)$/, ''), count > 1 ? h('em', null, ` ×${count}`) : null), h('small', null, e.role)),
        );
        attachTip(ctx, row, () => h('div', { class: 'k-enemy-tip' },
          h('strong', null, e.name), h('p', null, e.role),
          h('div', { class: 'k-enemy-stats' }, `HP ${Math.round(e.baseStats.hp * run.node.statScaleBps / 10000).toLocaleString()} · ATK ${Math.round(e.baseStats.atk * run.node.statScaleBps / 10000)} · DEF ${e.baseStats.def} · SPD ${e.baseStats.spd}`),
          h('p', { class: 'k-counter' }, icon('info', 16), readable(ctx, e.counterplay))));
        return row;
      })),
      h('p', { class: 'k-threat' }, icon('warning', 18), cand.threat),
      h('div', { class: 'k-defeat' }, h('span', null, '패배하면 런 체력'), h('b', null, `−${run.node.defeatDamagePreview}`), h('small', null, '(남은 적 전방 수에 따라 달라짐)')),
      run.strategies.length ? h('div', { class: 'k-strats' }, h('small', null, '보유 전략'), ...run.strategies.map((id) => {
        const st = ctx.lookup.strategy(id);
        const chip = h('span', { class: 'k-strat-chip', tabindex: 0 }, icon('strategy', 16), st?.name ?? id);
        if (st) attachTip(ctx, chip, () => h('div', { class: 'k-strat-tip' }, h('strong', null, st.name), h('p', { class: 'k-benefit' }, readable(ctx, st.benefit)), h('p', { class: 'k-drawback' }, readable(ctx, st.drawback))));
        return chip;
      })) : null);
  }

  function benchRow(): HTMLElement {
    const sel = ctx.ui.selected ? find(ctx.ui.selected) : null;
    return h('div', { class: 'k-bench' },
      h('div', { class: 'k-bench-label' }, icon('bench', 22), h('b', null, '대기석'), h('small', null, `${run.board.bench.filter(Boolean).length}/9`)),
      h('div', { class: 'k-bench-slots' }, ...run.board.bench.map((inst, i) => slot('bench', i, inst))),
      h('div', { class: cls('k-sell', sel && 'is-armed'), 'data-drop': 'sell', role: 'button', tabindex: sel ? 0 : -1,
        onclick: () => { if (sel) void sell(sel.inst); },
        onkeydown: (e: Event) => { if ((e as KeyboardEvent).key === 'Enter' && sel) void sell(sel.inst); },
      }, icon('sell', 26), h('div', null, h('b', null, sel ? `${sel.inst.sellValue}G에 판매` : '판매'), h('small', null, sel ? '누르면 확인창' : '여기로 끌어 놓기'))));
  }

  function shopBar(): HTMLElement {
    const xpPct = run.xpToNext ? (run.xp / run.xpToNext) * 100 : 100;
    const maxed = run.xpToNext === null;
    const level = h('div', { class: 'k-shop-level' },
      h('button', { class: 'k-lv-big', onclick: () => openLevelUp(ctx), 'aria-label': `레벨 ${run.level}, 레벨업 창 열기` },
        h('small', null, '레벨'), h('span', null, h('i', null, 'Lv.'), h('b', null, String(run.level))),
        h('div', { class: 'k-bar' }, h('i', { style: `--p:${xpPct}%` })), h('small', { class: 'k-lv-xp' }, maxed ? 'MAX' : `${run.xp}/${run.xpToNext} XP`)),
      h('button', { class: 'k-btn is-blue k-xp-btn', disabled: maxed || run.gold < run.shop.xpCost, onclick: () => void ctx.send('BUY_XP', { times: 1 }), title: '단축키 E' },
        icon('xp', 22), h('span', null, 'XP 구매'), h('small', { class: 'k-price' }, icon('gold', 14), String(run.shop.xpCost)), h('kbd', null, 'E')));

    const cards = h('div', { class: 'k-shop-cards', role: 'list', 'aria-label': '상점' }, ...run.shop.slots.map((slotV, i) => {
      if (!slotV) return h('div', { class: 'k-shop-empty', role: 'listitem' }, h('span', null, '영입 완료'));
      const u = ctx.lookup.unit(slotV.unitId);
      const affordable = run.gold >= slotV.cost;
      const badge = slotV.preview.mergesTo ? h('span', { class: 'k-merge-badge' }, icon('star', 16), `구매하면 ${slotV.preview.mergesTo}성`) : null;
      const card = h('button', {
        class: cls('k-shop-card', !affordable && 'is-poor', slotV.recommended && 'is-rec', slotV.preview.mergesTo && 'is-merge'),
        style: `--cc:${COST_COLOR[slotV.cost - 1]}`, role: 'listitem', 'data-cost': String(slotV.cost),
        'aria-label': `${i + 1}번 ${u.name}, ${slotV.cost}골드${affordable ? '' : ', 골드 부족'}${slotV.preview.mergesTo ? `, 구매하면 ${slotV.preview.mergesTo}성 합성` : ''}`,
        onclick: () => void ctx.send('BUY_UNIT', { slotIndex: i }),
      },
      portrait(ctx, u.id, 'k-shop-art'),
      h('div', { class: 'k-shop-fade' }),
      slotV.recommended ? h('span', { class: 'k-rec' }, icon('pin', 14), '추천') : null,
      badge,
      h('div', { class: 'k-shop-traits' }, ...u.synergyIds.slice(0, 3).map((sid) => {
        const delta = slotV.preview.synergyDelta.find((d) => d.synergyId === sid);
        const syn = ctx.lookup.syn(sid)!;
        const hits = delta && syn.tiers.some((t) => delta.from < t.threshold && delta.to >= t.threshold);
        return h('span', { class: cls('k-trait', hits && 'is-hit') }, synHex(ctx, sid, { size: 22 }), h('span', null, syn.name.replace(/^고유:\s*/, '')), hits ? h('em', null, `${delta!.from}→${delta!.to}`) : null);
      })),
      h('div', { class: 'k-shop-foot' },
        h('span', { class: 'k-shop-pos' }, icon(u.position === 'rear_only' ? 'rear' : 'front', 14)),
        h('b', null, shortName(u.name)),
        h('span', { class: 'k-shop-cost' }, icon('gold', 16), String(slotV.cost))),
      h('kbd', { class: 'k-key' }, String(i + 1)));
      attachTip(ctx, card, () => h('div', { class: 'k-shop-tip' },
        h('strong', null, u.name), h('small', null, u.role),
        slotV.preview.mergesTo ? h('p', { class: 'k-tip-merge' }, icon('star', 16), `구매하면 ${slotV.preview.mergesTo}성으로 합성돼요`) : null,
        slotV.preview.synergyDelta.length ? h('ul', { class: 'k-delta' }, ...slotV.preview.synergyDelta.map((d) => h('li', null, synHex(ctx, d.synergyId, { size: 20 }), `${ctx.lookup.syn(d.synergyId)?.name} ${d.from} → ${d.to}`))) : h('p', { class: 'k-muted' }, '이미 편성된 학생이라 시너지 수는 그대로예요'),
        h('small', { class: 'k-muted' }, '편성했을 때 기준')));
      return card;
    }));

    const odds = h('div', { class: 'k-odds', 'aria-label': `레벨 ${run.level} 상점 확률` }, ...run.shop.odds.map((p, i) => h('span', { class: cls(p === 0 && 'is-zero'), style: `--cc:${COST_COLOR[i]}` }, h('i'), `${p}%`)));
    const poorReroll = run.gold < run.shop.rerollCost;
    const side = h('div', { class: 'k-shop-side' },
      odds,
      h('div', { class: 'k-shop-actions' },
        h('button', { class: cls('k-btn is-blue k-reroll', poorReroll && 'is-poor'), disabled: poorReroll, onclick: () => void ctx.send('REROLL_SHOP'), title: '단축키 R' },
          icon('reroll', 24), h('span', null, '새로고침'), h('small', { class: 'k-price' }, icon('gold', 14), poorReroll ? `${run.shop.rerollCost} · 잔액 부족` : String(run.shop.rerollCost)), h('kbd', null, 'R')),
        h('button', { class: cls('k-btn is-lock', run.shop.locked && 'on'), 'aria-pressed': run.shop.locked ? 'true' : 'false', onclick: () => void ctx.send('TOGGLE_SHOP_LOCK'), title: '단축키 L' },
          icon(run.shop.locked ? 'lock' : 'unlock', 24), h('span', null, run.shop.locked ? '잠김' : '잠금'), h('kbd', null, 'L'))));
    const noFront = !run.board.front.some(Boolean);
    const start = h('button', { class: 'k-start', disabled: noFront, title: noFront ? '전방에 최소 1명이 필요해요' : '전투 시작', onclick: () => { ctx.ui.selected = null; void ctx.send('START_BATTLE'); } },
      h('span', { class: 'k-start-ico' }, icon('sword', 34)), h('span', { class: 'k-start-text' }, h('b', null, '출격'), h('small', null, noFront ? '전방에 최소 1명이 필요해요' : `${run.chapter}-${run.battle} 전투 시작`)));
    return h('div', { class: 'k-shop' }, level, cards, side, start);
  }

  function menu() {
    let close: () => void = () => {};
    const panel = h('div', { class: 'k-dialog' },
      h('header', { class: 'k-dialog-head' }, h('h2', null, '작전 메뉴'), h('button', { class: 'k-x', 'aria-label': '닫기', onclick: () => close() }, icon('close', 26))),
      h('div', { class: 'k-dialog-body k-menu-list' },
        h('p', { class: 'k-muted' }, `시드 ${run.seed}`),
        h('button', { class: 'k-btn is-ghost', onclick: () => { close(); openHelp(); } }, icon('info', 22), '조작 안내'),
        h('button', { class: 'k-btn is-danger', onclick: async () => { close(); if (await ctx.confirm({ title: '작전 포기', body: ['이번 작전을 포기하고 홈으로 돌아갑니다.', '포기한 작전은 되돌릴 수 없어요.'], confirm: '포기', danger: true })) await ctx.send('ABANDON_RUN'); } }, icon('flag', 22), '작전 포기')));
    close = ctx.modal(panel, { label: '작전 메뉴' });
  }

  function openHelp() {
    let close: () => void = () => {};
    const rows: [string, string][] = [['학생 누르기 → 칸 누르기', '배치·이동·교체 (끌어 놓기도 돼요)'], ['같은 학생 다시 누르기 / 우클릭', '학생 상세'], ['1 ~ 5', '상점 구매'], ['R', '새로고침'], ['L', '상점 잠금'], ['E', 'XP 구매'], ['Esc', '선택 해제 · 창 닫기']];
    const panel = h('div', { class: 'k-dialog' },
      h('header', { class: 'k-dialog-head' }, h('h2', null, '조작 안내'), h('button', { class: 'k-x', 'aria-label': '닫기', onclick: () => close() }, icon('close', 26))),
      h('div', { class: 'k-dialog-body' }, h('dl', { class: 'k-keys' }, ...rows.flatMap(([k, v]) => [h('dt', null, k), h('dd', null, v)]))));
    close = ctx.modal(panel, { label: '조작 안내' });
  }

  function draw() {
    hideTip();
    const top = topBar(ctx, run, { title: '준비 단계', onBack: menu, extra: [] });
    top.querySelector('.k-top-left')?.after(nodeTrack(run));
    el.replaceChildren(
      top,
      h('div', { class: 'k-prep-main' }, synergyPanel(), boardPanel(), intelPanel()),
      benchRow(),
      shopBar(),
    );
  }

  function playCues(s: UiState) {
    for (const c of s.cues) {
      if (c.id <= ctx.ui.lastCue) continue;
      ctx.ui.lastCue = c.id;
      const cardFor = (unitId?: string) => unitId ? el.querySelector(`.k-slot .k-card[data-unit="${unitId}"]`) : null;
      if (c.kind === 'recruit' && c.unitId) {
        ctx.speak(c.unitId, 'recruit', cardFor(c.unitId), 2000);
        const benched = el.querySelectorAll(`.k-bench .k-card[data-unit="${c.unitId}"]`);
        ctx.fx.burst(benched[benched.length - 1] ?? null, { color: '#45d3ff', ms: 650 });
      }
      if (c.kind === 'deploy' && c.unitId) ctx.speak(c.unitId, 'deploy', cardFor(c.unitId), 1500);
      if (c.kind === 'merge' && c.unitId) {
        const card = el.querySelector(`.k-slot .k-card[data-unit="${c.unitId}"].star-${c.star}`);
        card?.classList.add('is-merged');
        ctx.fx.burst(card, { color: c.star === 3 ? '#ffc93c' : '#7cc8ff', size: c.star === 3 ? 420 : 300, ms: c.star === 3 ? 1300 : 1000 });
        ctx.toast(`${ctx.lookup.unit(c.unitId).name} ${c.star}성 합성!`, 'gold');
        if (c.star === 3) ctx.speak(c.unitId, 'star3', card, 2500);
      }
      if (c.kind === 'levelup') ctx.fx.burst(el.querySelector('.k-lv-big'), { color: '#45d3ff', size: 260 });
      if (c.kind === 'levelup') ctx.toast(`레벨 ${c.amount}! 이제 ${c.amount}명까지 편성할 수 있어요`);
      if (c.kind === 'vault') { coinRain(); ctx.fx.burst({ x: innerWidth / 2, y: innerHeight * 0.4 }, { color: '#ffc93c', size: 520, ms: 1300 }); ctx.toast(`금고를 털었어요 +${c.amount}G`, 'gold'); }
      if (c.kind === 'equip_returned' && c.unitId) ctx.toast(`${ctx.lookup.unit(c.unitId).name}의 맞지 않는 장비가 보관함으로 돌아갔어요`);
    }
  }

  function coinRain() {
    if (ctx.settings.reduceMotion) return;
    const rain = h('div', { class: 'k-coin-rain', 'aria-hidden': 'true' });
    for (let i = 0; i < 26; i++) rain.append(h('i', { style: `--x:${Math.random() * 100}%;--d:${Math.random() * 0.6}s;--r:${Math.random() * 360}deg` }, icon('gold', 34)));
    el.append(rain);
    setTimeout(() => rain.remove(), 1800);
  }

  const onKey = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if (document.querySelector('.k-modal-wrap')) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k >= '1' && k <= '5') void ctx.send('BUY_UNIT', { slotIndex: Number(k) - 1 });
    else if (k === 'r') void ctx.send('REROLL_SHOP');
    else if (k === 'l') void ctx.send('TOGGLE_SHOP_LOCK');
    else if (k === 'e') void ctx.send('BUY_XP', { times: 1 });
    else if (k === 'escape' && ctx.ui.selected) { ctx.ui.selected = null; draw(); }
    else return;
    e.preventDefault();
  };
  document.addEventListener('keydown', onKey);

  draw();
  // 화면 진입 직후 쌓인 연출은 건너뛴다(새로고침 시 같은 말풍선이 반복되지 않게)
  ctx.ui.lastCue = s0.cues.at(-1)?.id ?? ctx.ui.lastCue;

  return {
    el,
    update(s) {
      if (!s.run) return;
      run = s.run;
      if (ctx.ui.selected && !find(ctx.ui.selected)) ctx.ui.selected = null;
      draw();
      requestAnimationFrame(() => playCues(s));
    },
    destroy() {
      document.removeEventListener('keydown', onKey);
      cancelDrag();
      hideTip();
    },
  };
}
