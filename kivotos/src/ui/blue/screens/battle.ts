// 전투: 이미 계산된 이벤트 로그를 재생만 한다(13.3). 배속·일시정지·건너뛰기는 결과를 바꾸지 않는다.
import type { Ctx, Screen } from '../app';
import { DEBUFFS, STATUS_LABEL, enemyPortrait, portrait, shortName, stars } from '../components';
import { cls, fill, h, svg } from '../dom';
import { icon } from '../icons';
import type { BattleEventView, CombatantView, Ref, UiState } from '../model';
import { resultPanel } from './result';

const key = (r: Ref) => `${r.side}-${r.zone}-${r.index}`;
const nameOf = (c: CombatantView) => (c.unitId ? shortName(c.name) : c.name.replace(/\s*\(.*\)$/, '').replace(/^(카이저|카타카타|데카그라마톤의|유스티나)\s+/, ''));

interface Live {
  view: CombatantView;
  el: HTMLElement;
  hpBar: HTMLElement;
  shieldBar: HTMLElement;
  hpText: HTMLElement;
  energyBar: HTMLElement | null;
  statusBox: HTMLElement;
  hp: number;
  shield: number;
  energy: number;
  statuses: string[];
  down: boolean;
}

export function mountBattle(ctx: Ctx, s: UiState): Screen {
  const run = s.run!;
  const battle = run.lastBattle!;
  const result = run.lastResult!;
  let speed: 1 | 2 | 4 = ctx.settings.defaultSpeed;
  let paused = false;
  let skipping = false;
  let finished = false;
  let destroyed = false;
  const sp = { ally: battle.startSp.ally, enemy: battle.startSp.enemy };
  const live = new Map<string, Live>();

  // ── 전장 구성 ──────────────────────────────────────────
  function combatantEl(c: CombatantView): Live {
    const isEnemy = c.ref.side === 'enemy';
    const art = c.unitId ? portrait(ctx, c.unitId, 'k-cb-art') : enemyPortrait(ctx, c.enemyId!, 'k-cb-art');
    const hpBar = h('i', { class: 'k-hp-fill' });
    const shieldBar = h('i', { class: 'k-shield-fill' });
    const hpText = h('small', { class: 'k-hp-text' });
    const energyBar = c.hasHp ? h('i', { class: 'k-en-fill' }) : null;
    const statusBox = h('div', { class: 'k-cb-status' });
    const el = h('div', { class: cls('k-cb', `is-${c.ref.side}`, `is-${c.ref.zone}`, c.boss && 'is-boss', !c.hasHp && 'is-support', c.unitId && `star-${c.star}`), 'data-ref': key(c.ref) },
      h('div', { class: 'k-cb-frame' }, art, h('div', { class: 'k-cb-shade' }),
        c.unitId ? stars(c.star) : null,
        statusBox),
      h('div', { class: 'k-cb-name' }, isEnemy ? (c.boss ? icon('skull', 16) : null) : null, h('span', null, nameOf(c))),
      c.hasHp ? h('div', { class: 'k-cb-bars' },
        h('div', { class: 'k-hp' }, hpBar, shieldBar, hpText),
        h('div', { class: 'k-en' }, energyBar!)) : h('div', { class: 'k-cb-support' }, icon('rear', 14), '지원'));
    return { view: c, el, hpBar, shieldBar, hpText, energyBar, statusBox, hp: c.hp, shield: c.shield, energy: c.energy, statuses: [], down: false };
  }

  for (const c of battle.combatants) live.set(key(c.ref), combatantEl(c));
  // 필살기 컷인 그림을 미리 받아 둔다(컷인은 1.2초라 그때 받으면 늦다)
  const cutinOk = new Set<string>();
  for (const c of battle.combatants) {
    if (!c.unitId || c.ref.side !== 'ally') continue;
    const id = c.unitId;
    const img = new Image();
    img.onload = () => cutinOk.add(id);
    img.src = ctx.art(`cutins/${id}.webp`);
  }
  const row = (side: 'ally' | 'enemy', zone: 'front' | 'rear', n: number) => h('div', { class: `k-bf-row is-${side} is-${zone}` },
    ...Array.from({ length: n }, (_, i) => live.get(`${side}-${zone}-${i}`)?.el ?? h('div', { class: 'k-cb-empty' })));

  const timeline = h('div', { class: 'k-timeline', 'aria-label': '행동 순서' });
  const avFill = h('i');
  const avText = h('small', null, 'AV 0');
  const spBox = h('div', { class: 'k-sp', 'aria-label': '팀 SP' });
  const logList = h('ol', { class: 'k-log-list' });
  const beams = svg('svg', { class: 'k-beams', viewBox: '0 0 1920 1080', preserveAspectRatio: 'none' }) as SVGSVGElement;
  const fx = h('div', { class: 'k-fx' });
  const cutin = h('div', { class: 'k-cutin', 'aria-hidden': 'true' });
  const field = h('div', { class: 'k-field' },
    h('div', { class: 'k-field-plane', 'aria-hidden': 'true' }),
    row('enemy', 'rear', 6), row('enemy', 'front', 4),
    h('div', { class: 'k-vs', 'aria-hidden': 'true' }, h('span', null, 'ENGAGE')),
    row('ally', 'front', 4), row('ally', 'rear', 6),
    beams, fx);

  const speedBtns = ([1, 2, 4] as const).map((v) => h('button', { class: cls('k-speed', v === speed && 'on'), 'aria-pressed': v === speed ? 'true' : 'false', onclick: () => setSpeed(v) }, `${v}x`));
  const pauseBtn = h('button', { class: 'k-ctrl', 'aria-label': '일시정지', onclick: () => togglePause() }, icon('pause', 24));
  const skipBtn = h('button', { class: 'k-ctrl is-skip', onclick: () => skip() }, icon('skip', 22), '건너뛰기');
  const logBox = h('details', { class: 'k-log', open: !ctx.mobile() }, h('summary', null, icon('records', 18), '전투 로그'), logList);
  const el = h('section', { class: 'k-battle' },
    h('header', { class: 'k-battle-top' },
      h('div', { class: 'k-battle-title' }, h('span', { class: `k-node-badge is-${run.nodeType}` }, icon(run.nodeType === 'boss' ? 'skull' : run.nodeType === 'elite' ? 'diamond' : 'sword', 16), run.nodeType === 'boss' ? '보스' : run.nodeType === 'elite' ? '정예' : '전투'), h('strong', null, battle.nodeLabel)),
      h('div', { class: 'k-av' }, h('div', { class: 'k-av-bar' }, avFill), avText),
      h('div', { class: 'k-battle-ctrls' }, h('div', { class: 'k-speeds', role: 'group', 'aria-label': '배속' }, ...speedBtns), pauseBtn, skipBtn)),
    timeline,
    field,
    h('footer', { class: 'k-battle-foot' }, h('div', { class: 'k-sp-wrap' }, h('small', null, '팀 SP'), spBox), logBox),
    cutin);

  function setSpeed(v: 1 | 2 | 4) {
    speed = v;
    speedBtns.forEach((b, i) => { const on = [1, 2, 4][i] === v; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
  }
  function togglePause() {
    paused = !paused;
    pauseBtn.replaceChildren(icon(paused ? 'play' : 'pause', 24));
    pauseBtn.setAttribute('aria-label', paused ? '재생' : '일시정지');
    el.classList.toggle('is-paused', paused);
  }

  // ── 표시 갱신 ──────────────────────────────────────────
  function paint(l: Live) {
    if (!l.view.hasHp) return;
    const max = l.view.maxHp;
    l.hpBar.style.setProperty('--p', `${(l.hp / max) * 100}%`);
    l.shieldBar.style.setProperty('--p', `${Math.min(100, (l.shield / max) * 100)}%`);
    l.hpText.textContent = `${Math.ceil(l.hp).toLocaleString()}${l.shield > 0 ? ` +${Math.round(l.shield)}` : ''}`;
    if (l.energyBar) { l.energyBar.style.setProperty('--p', `${l.energy}%`); l.energyBar.parentElement!.classList.toggle('is-full', l.energy >= 100); }
    fill(l.statusBox, ...l.statuses.slice(0, 4).map((sid) => h('span', { class: cls('k-st', DEBUFFS.has(sid) ? 'is-debuff' : 'is-buff', (sid === 'st_stun' || sid === 'st_silence') && 'is-big') }, STATUS_LABEL[sid] ?? sid)),
      l.statuses.length > 4 ? h('span', { class: 'k-st is-more' }, `+${l.statuses.length - 4}`) : null);
  }
  function paintSp() {
    spBox.replaceChildren(...Array.from({ length: 5 }, (_, i) => h('i', { class: cls(i < sp.ally && 'on') }, icon('diamond', 22))));
  }
  function paintTimeline(refs: Ref[]) {
    fill(timeline, h('span', { class: 'k-tl-label' }, '다음 행동'), ...refs.slice(0, 8).map((r) => {
      const l = live.get(key(r));
      if (!l) return null;
      return h('span', { class: cls('k-tl', `is-${r.side}`) }, l.view.unitId ? portrait(ctx, l.view.unitId, 'is-round') : enemyPortrait(ctx, l.view.enemyId!, 'is-round'));
    }));
  }
  function log(text: string, kind = '') {
    logList.prepend(h('li', { class: kind }, text));
    while (logList.children.length > 40) logList.lastElementChild?.remove();
  }

  for (const l of live.values()) paint(l);
  paintSp();

  // ── 연출 도우미 ──────────────────────────────────────
  const stageRect = () => ({ sr: ctx.stage.getBoundingClientRect(), s: ctx.scale() });
  function centerOf(l: Live): { x: number; y: number } {
    const { sr, s } = stageRect();
    const r = l.el.querySelector('.k-cb-frame')!.getBoundingClientRect();
    if (ctx.mobile()) {
      const fr = field.getBoundingClientRect();
      return { x: r.left - fr.left + r.width / 2, y: r.top - fr.top + r.height / 2 };
    }
    const fr = field.getBoundingClientRect();
    void sr;
    return { x: (r.left - fr.left) / s + r.width / s / 2, y: (r.top - fr.top) / s + r.height / s / 2 };
  }
  function float(l: Live, text: string, kind: string) {
    if (skipping) return;
    const p = centerOf(l);
    const n = h('span', { class: `k-float is-${kind}`, style: `left:${p.x + (Math.random() * 40 - 20)}px;top:${p.y - 20}px` }, text);
    fx.append(n);
    setTimeout(() => n.remove(), 1100);
  }
  function beam(from: Live, to: Live, kind: string) {
    if (skipping) return;
    const a = centerOf(from);
    const b = centerOf(to);
    const { s } = stageRect();
    const fr = field.getBoundingClientRect();
    beams.setAttribute('viewBox', ctx.mobile() ? `0 0 ${fr.width} ${fr.height}` : `0 0 ${fr.width / s} ${fr.height / s}`);
    const line = svg('path', { d: `M${a.x} ${a.y} Q ${(a.x + b.x) / 2} ${Math.min(a.y, b.y) - 80} ${b.x} ${b.y}`, class: `k-beam is-${kind}` });
    beams.append(line);
    setTimeout(() => line.remove(), 900);
  }
  function pulse(l: Live, cls2: string) {
    l.el.classList.remove(cls2);
    void l.el.offsetWidth;
    l.el.classList.add(cls2);
  }
  function shake(strong: boolean) {
    if (skipping || ctx.settings.noShake || ctx.settings.reduceMotion) return;
    field.classList.remove('is-shake', 'is-shake-strong');
    void field.offsetWidth;
    field.classList.add(strong ? 'is-shake-strong' : 'is-shake');
  }
  async function wait(ms: number) {
    if (skipping) return;
    let left = ms / speed;
    while (left > 0 && !skipping && !destroyed) {
      const step = Math.min(left, 40);
      await new Promise((r) => setTimeout(r, step));
      if (!paused) left -= step;
    }
  }
  async function cutIn(l: Live) {
    if (skipping || speed === 4 || ctx.settings.reduceMotion || !l.view.unitId) return;
    const line = ctx.settings.dialogue ? ctx.lookup.line(l.view.unitId, 'ultimate') : null;
    const wide = cutinOk.has(l.view.unitId);
    cutin.classList.toggle('is-wide', wide);
    cutin.replaceChildren(
      h('div', { class: 'k-cutin-band' }),
      wide
        ? h('div', { class: 'k-cutin-wide' }, h('img', { src: ctx.art(`cutins/${l.view.unitId}.webp`), alt: '', draggable: 'false' }))
        : h('div', { class: 'k-cutin-art' }, portrait(ctx, l.view.unitId)),
      h('div', { class: 'k-cutin-text' }, h('small', null, 'EX SKILL'), h('b', null, nameOf(l.view)), line ? h('p', null, line) : null));
    cutin.classList.remove('is-on');
    void cutin.offsetWidth;
    cutin.classList.add('is-on');
    await wait(1200);
    cutin.classList.remove('is-on');
  }

  // ── 이벤트 적용 ───────────────────────────────────────
  async function apply(e: BattleEventView) {
    avFill.style.setProperty('--p', `${Math.min(100, (e.av / 1000) * 100)}%`);
    avText.textContent = `AV ${e.av}`;
    switch (e.t) {
      case 'timeline': paintTimeline(e.upcoming); break;
      case 'action': {
        const a = live.get(key(e.actor));
        if (!a) break;
        pulse(a, e.kind === 'rear' ? 'is-support-pulse' : 'is-acting');
        const verb = { basic: '기본 공격', skill: '전투 스킬', ultimate: '필살기', rear: '정기 지원' }[e.kind];
        log(`${nameOf(a.view)} · ${verb}`, e.kind === 'ultimate' ? 'is-ult' : a.view.ref.side === 'enemy' ? 'is-enemy' : '');
        if (e.kind === 'ultimate') {
          await cutIn(a);
          if (!skipping) ctx.fx.burst(a.el, { color: a.view.ref.side === 'enemy' ? '#ff6b5a' : '#ffc93c', size: 380, ms: 900 });
          shake(true);
          await wait(350);
        }
        else await wait(e.kind === 'skill' ? 260 : e.kind === 'rear' ? 200 : 180);
        break;
      }
      case 'damage': {
        const t = live.get(key(e.target));
        const src = live.get(key(e.source));
        if (!t) break;
        t.shield -= e.shieldAbsorbed;
        t.hp = Math.max(0, t.hp - e.amount);
        if (e.origin && src) beam(src, t, 'support');
        pulse(t, 'is-hit');
        if (!ctx.settings.noFlash) pulse(t, 'is-flash');
        if (e.shieldAbsorbed) float(t, `−${e.shieldAbsorbed}`, 'shield');
        if (e.amount) float(t, `${e.amount.toLocaleString()}${e.crit ? '!' : ''}`, e.true ? 'true' : e.crit ? 'crit' : 'dmg');
        if (e.crit) { shake(false); if (!skipping && speed < 4) ctx.fx.burst(t.el, { color: '#ff8a5a', size: 170, ms: 550 }); }
        paint(t);
        await wait(70);
        break;
      }
      case 'heal': case 'shield': {
        const t = live.get(key(e.target));
        const src = live.get(key(e.source));
        if (!t) break;
        if (e.t === 'heal') { t.hp = Math.min(t.view.maxHp, t.hp + e.amount); float(t, `+${e.amount}`, 'heal'); }
        else { t.shield += e.amount; float(t, `보호막 +${e.amount}`, 'shield'); }
        if (src && src.view.ref.zone === 'rear' && src.view.ref.side === 'ally') beam(src, t, e.t);
        if (src && src !== t && src.view.ref.zone === 'rear') log(`  ↳ ${nameOf(src.view)} → ${nameOf(t.view)} ${e.t === 'heal' ? '치유' : '보호막'} ${e.amount}`, 'is-support');
        paint(t);
        await wait(60);
        break;
      }
      case 'status': {
        const t = live.get(key(e.target));
        if (!t) break;
        if (e.op === 'add') {
          if (!t.statuses.includes(e.statusId)) t.statuses.push(e.statusId);
          if (e.replacedFrom) {
            float(t, `${STATUS_LABEL[e.replacedFrom] ?? e.replacedFrom} → ${STATUS_LABEL[e.statusId] ?? e.statusId}`, 'swap');
            log(`  ↳ ${nameOf(t.view)}: ${STATUS_LABEL[e.replacedFrom]} 대신 ${STATUS_LABEL[e.statusId]} (제어 치환)`, 'is-swap');
          } else if (e.statusId === 'st_stun' || e.statusId === 'st_silence') float(t, STATUS_LABEL[e.statusId], 'cc');
        } else t.statuses = t.statuses.filter((x) => x !== e.statusId);
        paint(t);
        break;
      }
      case 'resource': {
        if (e.sp !== undefined) { sp[e.side] = e.sp; if (e.side === 'ally') paintSp(); }
        if (e.energy) { const l = live.get(key(e.energy.unit)); if (l) { l.energy = e.energy.value; paint(l); } }
        break;
      }
      case 'defeated': {
        const t = live.get(key(e.target));
        if (!t) break;
        t.down = true;
        t.el.classList.add('is-down');
        if (!skipping) ctx.fx.burst(t.el, { color: t.view.ref.side === 'enemy' ? '#a78bfa' : '#7cc8ff', size: 200, ms: 700 });
        log(`${nameOf(t.view)} 전투불능`, 'is-down');
        if (t.view.unitId && speed === 1 && !skipping) {
          const line = ctx.lookup.line(t.view.unitId, 'defeated');
          if (line) ctx.speak(t.view.unitId, 'defeated', t.el, 1100);
        }
        await wait(160);
        break;
      }
      case 'end':
        break;
    }
  }

  async function play() {
    await new Promise((r) => setTimeout(r, ctx.settings.reduceMotion ? 0 : 500));
    for (const e of battle.events) {
      if (destroyed) return;
      await apply(e);
    }
    finish();
  }

  function skip() {
    if (finished) return;
    skipping = true;
    if (paused) togglePause();
  }

  function finish() {
    if (finished || destroyed) return;
    finished = true;
    for (const l of live.values()) paint(l);
    ctx.ui.playedBattle = battle.battleId;
    skipBtn.disabled = true;
    const banner = h('div', { class: cls('k-end-banner', `is-${result.outcome}`) }, h('b', null, result.outcome === 'win' ? 'VICTORY' : 'DEFEAT'), h('span', null, result.outcome === 'win' ? '작전 성공' : '작전 실패'));
    el.append(banner);
    setTimeout(() => {
      if (destroyed) return;
      banner.classList.add('is-done');
      el.append(resultPanel(ctx, run, () => void ctx.send('CONFIRM_RESULT')));
    }, skipping || ctx.settings.reduceMotion ? 200 : 1300);
  }

  const onKey = (e: KeyboardEvent) => {
    if (document.querySelector('.k-modal-wrap')) return;
    if (e.key === ' ' && !finished) { e.preventDefault(); togglePause(); }
  };
  document.addEventListener('keydown', onKey);

  if (ctx.ui.playedBattle === battle.battleId) { skipping = true; }
  void play();

  return {
    el,
    destroy() { destroyed = true; document.removeEventListener('keydown', onKey); },
  };
}
