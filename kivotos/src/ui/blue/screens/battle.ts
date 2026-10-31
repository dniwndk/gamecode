// 전투: 이미 계산된 이벤트 로그를 재생만 한다(13.3). 배속·일시정지·건너뛰기는 결과를 바꾸지 않는다.
import type { Ctx, Screen } from '../app';
import { DEBUFFS, STATUS_LABEL, enemyPortrait, portrait, shortName, stars, statusIcon, synHex } from '../components';
import { cls, fill, h, svg } from '../dom';
import { ChainCounter, ExChain, cutinMs, escalationHeat, floatSize, hitstopMs, impactOf, isWounded, rankActiveSynergies, shakePx, type Impact, type StopKind } from '../fx/battleFx';
import { icon } from '../icons';
import type { BattleEventView, CombatantView, ProcCause, Ref, UiState } from '../model';
import { oopartArt, openOwnedOoparts } from './ooparts';
import { resultPanel } from './result';

const key = (r: Ref) => `${r.side}-${r.zone}-${r.index}`;
const nameOf = (c: CombatantView) => (c.unitId ? shortName(c.name) : c.name.replace(/\s*\(.*\)$/, '').replace(/^(카이저|카타카타|데카그라마톤의|유스티나)\s+/, ''));

interface Live {
  view: CombatantView;
  el: HTMLElement;
  hpBar: HTMLElement;
  /** 깎인 체력의 잔상(하얗게 남았다가 천천히 줄어든다) */
  hpGhost: HTMLElement;
  ghostP: number;
  shieldBar: HTMLElement;
  hpText: HTMLElement;
  energyBar: HTMLElement | null;
  statusBox: HTMLElement;
  hp: number;
  shield: number;
  energy: number;
  statuses: string[];
  down: boolean;
  /** 체력 절반 아래에서 부상 삽화(public/injured)로 바뀐 상태 */
  wounded: boolean;
  art: HTMLElement;
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
    const hpGhost = h('i', { class: 'k-hp-ghost' });
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
        h('div', { class: 'k-hp' }, hpGhost, hpBar, shieldBar, hpText),
        h('div', { class: 'k-en' }, energyBar!)) : h('div', { class: 'k-cb-support' }, icon('rear', 14), '지원'));
    return { view: c, el, art, wounded: false, hpBar, hpGhost, ghostP: 100, shieldBar, hpText, energyBar, statusBox, hp: c.hp, shield: c.shield, energy: c.energy, statuses: [], down: false };
  }

  for (const c of battle.combatants) live.set(key(c.ref), combatantEl(c));
  // 부상 삽화(체력 절반 아래). 미리 받아 두고, 받은 학생만 바꾼다(없으면 초상화 그대로)
  const injuredOk = new Set<string>();
  const injuredUrl = (id: string) => ctx.art(`injured/${id}.webp`);
  for (const c of battle.combatants) {
    if (!c.unitId || !c.hasHp || c.ref.side !== 'ally') continue;
    const id = c.unitId;
    const img = new Image();
    img.onload = () => injuredOk.add(id);
    img.src = injuredUrl(id);
  }
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
  const escStartAv = ctx.driver.catalog.rules.battle.escalation.startAv;
  let escBps = 0;
  const avBox = h('div', { class: 'k-av', title: '시간 제한 없음 · 오래 끌면 양쪽 피해가 함께 커지는 격화' }, h('div', { class: 'k-av-bar' }, avFill), avText);
  const spBox = h('div', { class: 'k-sp', 'aria-label': '팀 SP' });
  const logList = h('ol', { class: 'k-log-list' });
  const beams = svg('svg', { class: 'k-beams', viewBox: '0 0 1920 1080', preserveAspectRatio: 'none' }) as SVGSVGElement;
  const fx = h('div', { class: 'k-fx' });
  const cutin = h('div', { class: 'k-cutin', 'aria-hidden': 'true' });
  // 뽕맛 연출 층: 발동 배너(왼쪽), 연쇄 카운터(오른쪽), 격화 열기(가장자리), 전투 시작 시너지 선언
  const procFeed = h('div', { class: 'k-proc-feed', 'aria-live': 'polite' });
  const chainBox = h('div', { class: 'k-chain', 'aria-hidden': 'true' });
  const heat = h('div', { class: 'k-heat', 'aria-hidden': 'true' });
  const field = h('div', { class: 'k-field' },
    heat,
    h('div', { class: 'k-field-plane', 'aria-hidden': 'true' }),
    row('enemy', 'rear', 6), row('enemy', 'front', 4),
    h('div', { class: 'k-vs', 'aria-hidden': 'true' }, h('span', null, 'ENGAGE')),
    row('ally', 'front', 4), row('ally', 'rear', 6),
    beams, fx, procFeed, chainBox);

  const speedBtns = ([1, 2, 4] as const).map((v) => h('button', { class: cls('k-speed', v === speed && 'on'), 'aria-pressed': v === speed ? 'true' : 'false', onclick: () => setSpeed(v) }, `${v}x`));
  const pauseBtn = h('button', { class: 'k-ctrl', 'aria-label': '일시정지', onclick: () => togglePause() }, icon('pause', 24));
  const skipBtn = h('button', { class: 'k-ctrl is-skip', onclick: () => skip() }, icon('skip', 22), '건너뛰기');
  const logBox = h('details', { class: 'k-log', open: !ctx.mobile() }, h('summary', null, icon('records', 18), '전투 로그'), logList);
  const el = h('section', { class: 'k-battle' },
    h('header', { class: 'k-battle-top' },
      h('div', { class: 'k-battle-title' }, h('span', { class: `k-node-badge is-${run.nodeType}` }, icon(run.nodeType === 'boss' ? 'skull' : run.nodeType === 'elite' ? 'diamond' : 'sword', 16), run.nodeType === 'boss' ? '보스' : run.nodeType === 'elite' ? '정예' : '전투'), h('strong', null, battle.nodeLabel)),
      avBox,
      h('div', { class: 'k-battle-ctrls' }, h('button', { class: 'k-ctrl is-oop', title: '보유 오파츠와 효과 보기', onclick: () => openOwnedOoparts(ctx, run.ooparts.owned) }, icon('diamond', 20), `오파츠 ${run.ooparts.owned.length}`), h('div', { class: 'k-speeds', role: 'group', 'aria-label': '배속' }, ...speedBtns), pauseBtn, skipBtn)),
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
  function setWounded(l: Live, on: boolean) {
    const id = l.view.unitId;
    if (!id || l.wounded === on || (on && !injuredOk.has(id))) return;
    const img = l.art.querySelector('img');
    if (!img) return;
    l.wounded = on;
    img.src = on ? injuredUrl(id) : ctx.portrait(id) ?? img.src;
    l.el.classList.toggle('is-wounded', on);
    if (on && !skipping) {
      pulse(l, 'is-wound-in');
      if (!l.down) { float(l, '부상', 'wound', { dy: -60 }); ctx.sfx.play('WOUNDED'); }
    }
  }
  function paint(l: Live) {
    if (!l.view.hasHp) return;
    const max = l.view.maxHp;
    setWounded(l, isWounded(l.hp, max));
    const pct = (l.hp / max) * 100;
    l.hpBar.style.setProperty('--p', `${pct}%`);
    // 잔상: 줄어들 때는 잠깐 남았다가 따라오고, 치유로 늘 때는 바로 맞춘다
    if (pct >= l.ghostP || skipping) { l.hpGhost.style.transition = 'none'; l.hpGhost.style.setProperty('--p', `${pct}%`); void l.hpGhost.offsetWidth; l.hpGhost.style.transition = ''; }
    else l.hpGhost.style.setProperty('--p', `${pct}%`);
    l.ghostP = pct;
    // 보호막: 수치는 적지 않고, 남은 체력의 오른쪽 끝에서 보호막만큼 반투명하게 덮는다(체력보다 크면 체력 전체)
    const sh = Math.min(Math.max(0, l.shield), l.hp);
    l.shieldBar.style.setProperty('--l', `${((l.hp - sh) / max) * 100}%`);
    l.shieldBar.style.setProperty('--p', `${(sh / max) * 100}%`);
    l.hpText.textContent = Math.ceil(l.hp).toLocaleString();
    if (l.energyBar) { l.energyBar.style.setProperty('--p', `${l.energy}%`); l.energyBar.parentElement!.classList.toggle('is-full', l.energy >= 100); }
    fill(l.statusBox, ...l.statuses.slice(0, 4).map((sid) => h('span', { class: cls('k-st', DEBUFFS.has(sid) ? 'is-debuff' : 'is-buff', (sid === 'st_stun' || sid === 'st_silence') && 'is-big'), title: STATUS_LABEL[sid] ?? sid }, statusIcon(ctx, sid), STATUS_LABEL[sid] ?? sid)),
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
  function float(l: Live, text: string, kind: string, o: { size?: number; impact?: Impact; dy?: number } = {}) {
    if (skipping) return;
    const p = centerOf(l);
    const size = o.size && !ctx.mobile() ? `font-size:${o.size}px;` : '';
    const imp = o.impact ?? 1;
    const n = h('span', { class: cls(`k-float is-${kind}`, imp >= 2 && 'is-big', imp === 0 && 'is-faint'), style: `${size}left:${p.x + (Math.random() * 40 - 20)}px;top:${p.y - 20 + (o.dy ?? 0)}px` }, text);
    fx.append(n);
    setTimeout(() => n.remove(), imp >= 2 ? 1300 : 1100);
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
  /** 방향성 흔들림: 맞은 쪽으로 밀렸다가 감쇠한다. from이 없으면(필살기 발동 등) 위아래로 */
  function jolt(px: number, from?: Live | null, to?: Live | null) {
    if (skipping || px <= 0 || ctx.settings.noShake || ctx.settings.reduceMotion) return;
    let dx = 0;
    let dy = 1;
    if (from && to) {
      const a = centerOf(from);
      const b = centerOf(to);
      const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      dx = (b.x - a.x) / len; dy = (b.y - a.y) / len;
    }
    field.style.setProperty('--jx', `${(dx * px).toFixed(1)}px`);
    field.style.setProperty('--jy', `${(dy * px).toFixed(1)}px`);
    field.classList.remove('is-jolt');
    void field.offsetWidth;
    field.classList.add('is-jolt');
  }
  /** 히트스톱: 전장의 모든 움직임을 잠깐 얼린다(배속으로 줄어든다) */
  async function hitstop(kind: StopKind, imp: Impact = 0) {
    const ms = hitstopMs(imp, kind);
    if (skipping || ms <= 0) return;
    field.classList.add('is-stop');
    await wait(ms);
    field.classList.remove('is-stop');
  }
  function shards(l: Live, color: string) {
    if (skipping || ctx.settings.reduceMotion) return;
    const p = centerOf(l);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + Math.random() * 0.5;
      const d = 50 + Math.random() * 50;
      const n = h('i', { class: 'k-shard', style: `left:${p.x}px;top:${p.y}px;--tx:${Math.cos(a) * d}px;--ty:${Math.sin(a) * d}px;--r:${Math.random() * 360}deg;background:${color}` });
      fx.append(n);
      setTimeout(() => n.remove(), 650);
    }
  }
  function hitReact(t: Live, imp: Impact) {
    t.el.classList.remove('is-hit', 'is-hit-2', 'is-hit-3');
    void t.el.offsetWidth;
    t.el.classList.add('is-hit');
    if (imp >= 2) t.el.classList.add(imp === 3 ? 'is-hit-3' : 'is-hit-2');
  }

  // ── 뽕맛: 발동 배너·연쇄 카운터·EX 연쇄·격화 ─────────────
  const chain = new ChainCounter();
  const exChain = new ExChain();
  let chainTimer = 0;
  /** 발동 등급: 일반은 작게, 금·플래티넘·전설만 크게(상위 등급의 뽕이 묻히지 않게) */
  function procGrade(c: ProcCause): 'normal' | 'gold' | 'plat' | 'legend' {
    if (c.kind === 'oopart') {
      const r = ctx.lookup.oopart(c.id)?.rarity;
      return r === 'legendary' ? 'legend' : r === 'rare' ? 'gold' : 'normal';
    }
    const st = run.synergies.find((x) => x.synergyId === c.id);
    const syn = ctx.lookup.syn(c.id);
    if (!st || st.activeTier === null || !syn) return 'normal';
    if (syn.tiers[st.activeTier]?.grade === 'platinum') return 'plat';
    return st.activeTier === syn.tiers.length - 1 ? 'gold' : 'normal';
  }
  function showChain(n: number) {
    if (skipping) return;
    chainBox.className = cls('k-chain', 'is-on', n >= 5 ? 'is-plat' : n >= 3 && 'is-gold');
    chainBox.style.setProperty('--n', String(Math.min(n, 8)));
    chainBox.replaceChildren(h('small', null, 'CHAIN'), h('b', null, `×${n}`));
    void chainBox.offsetWidth;
    chainBox.classList.add('is-pop');
    clearTimeout(chainTimer);
    chainTimer = window.setTimeout(() => chainBox.classList.remove('is-on', 'is-pop'), 1500 / speed + 400);
  }
  function procBanner(e: Extract<BattleEventView, { t: 'proc' }>, grade: string) {
    if (skipping) return;
    const name = e.cause.kind === 'oopart' ? ctx.lookup.oopart(e.cause.id)?.name ?? e.cause.id : ctx.lookup.syn(e.cause.id)?.name ?? e.cause.id;
    const st = e.cause.kind === 'synergy' ? run.synergies.find((x) => x.synergyId === e.cause.id) : undefined;
    const art = e.cause.kind === 'oopart'
      ? h('span', { class: 'k-proc-oop' }, oopartArt(ctx, e.cause.id))
      : synHex(ctx, e.cause.id, { size: 44, tier: st?.activeTier ?? null, plat: grade === 'plat' });
    const who = e.unit ? live.get(key(e.unit)) : undefined;
    const b = h('div', { class: cls('k-proc', `is-${grade}`, e.unit?.side === 'enemy' && 'is-enemy') }, art,
      h('div', null, h('small', null, who ? `${name} · ${nameOf(who.view)}` : name), h('b', null, e.label)));
    procFeed.prepend(b);
    while (procFeed.children.length > 4) procFeed.lastElementChild?.remove();
    setTimeout(() => { b.classList.add('is-out'); setTimeout(() => b.remove(), 260); }, (grade === 'normal' ? 1500 : 2200) / speed);
    if (who) {
      pulse(who, 'is-proc');
      const p = centerOf(who);
      const pop = h('span', { class: cls('k-proc-pop', `is-${grade}`), style: `left:${p.x}px;top:${p.y - 70}px` },
        e.cause.kind === 'oopart' ? oopartArt(ctx, e.cause.id) : synHex(ctx, e.cause.id, { size: 40, tier: st?.activeTier ?? null, plat: grade === 'plat' }));
      fx.append(pop);
      setTimeout(() => pop.remove(), 900);
    }
  }
  function exChainBadge(n: number) {
    if (skipping) return;
    const b = h('div', { class: 'k-exchain', style: `--n:${Math.min(n, 6)}` }, h('small', null, 'EX CHAIN'), h('b', null, `×${n}`));
    el.append(b);
    setTimeout(() => b.remove(), 1400 / speed + 300);
  }
  /** 전투 시작: 켜진 시너지 중 가장 높은 것을 주인공으로 「SYNERGY ONLINE」 */
  async function synergyOnline() {
    if (skipping || ctx.settings.reduceMotion) return false;
    const ranked = rankActiveSynergies(run.synergies, (id, tier) => {
      const syn = ctx.lookup.syn(id);
      return syn ? { grade: syn.tiers[tier]?.grade ?? 'normal', tierCount: syn.tiers.length } : null;
    });
    if (!ranked.length) return false;
    const top = ranked[0];
    const syn = ctx.lookup.syn(top.synergyId)!;
    const plat = syn.tiers[top.activeTier!]?.grade === 'platinum';
    const banner = h('div', { class: cls('k-syn-online', plat && 'is-plat') },
      h('div', { class: 'k-syn-online-band' }),
      synHex(ctx, top.synergyId, { size: 132, tier: top.activeTier, plat }),
      h('div', { class: 'k-syn-online-text' },
        h('small', null, plat ? 'PLATINUM SYNERGY' : 'SYNERGY ONLINE'),
        h('b', null, syn.tiers.length > 1 ? `${syn.name} ${syn.tiers[top.activeTier!]?.threshold ?? top.count}` : syn.name),
        h('div', { class: 'k-syn-online-rest' }, ...ranked.slice(1, 7).map((x) => synHex(ctx, x.synergyId, { size: 44, tier: x.activeTier })))));
    el.append(banner);
    ctx.sfx.play('synergy', { plat });
    await wait(plat ? 1500 : 1150);
    banner.classList.add('is-out');
    setTimeout(() => banner.remove(), 300);
    return true;
  }
  function escalate(bps: number) {
    field.style.setProperty('--heat', String(escalationHeat(bps)));
    field.classList.toggle('is-heated', bps > 0);
    if (skipping || bps <= 0) return;
    const b = h('div', { class: 'k-esc-banner' }, h('small', null, 'ESCALATION'), h('b', null, `격화 · 모든 피해 +${bps / 100}%`));
    el.append(b);
    setTimeout(() => b.remove(), 1600);
    ctx.sfx.play('escalation');
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
  async function cutIn(l: Live, ex: number) {
    if (skipping || speed === 4 || ctx.settings.reduceMotion || !l.view.unitId) return;
    const ms = cutinMs(ex);
    cutin.style.setProperty('--cut-ms', `${ms}ms`);
    ctx.sfx.play('cutin', { short: ex >= 2 });
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
    field.classList.add('is-mono');
    await wait(ms);
    cutin.classList.remove('is-on');
    field.classList.remove('is-mono');
  }
  /** 필살기 직후 첫 타격은 한 단계 세게 + 가장 긴 히트스톱(컷인 대비) */
  let boostNext = false;

  // ── 이벤트 적용 ───────────────────────────────────────
  async function apply(e: BattleEventView) {
    // 시간 제한은 없다. 막대는 격화가 시작되는 AV까지 차오르고, 그 뒤로는 격화 수치를 함께 보여 준다.
    avFill.style.setProperty('--p', `${Math.min(100, (e.av / escStartAv) * 100)}%`);
    avText.textContent = escBps ? `AV ${e.av} · 격화 +${escBps / 100}%` : `AV ${e.av}`;
    switch (e.t) {
      case 'timeline': paintTimeline(e.upcoming); break;
      case 'action': {
        const a = live.get(key(e.actor));
        if (!a) break;
        chain.onAction();
        const ex = exChain.onAction(e.actor.side, e.kind);
        pulse(a, e.kind === 'rear' ? 'is-support-pulse' : 'is-acting');
        const verb = { basic: '기본 공격', skill: '전투 스킬', ultimate: '필살기', rear: '정기 지원' }[e.kind];
        log(`${nameOf(a.view)} · ${verb}`, e.kind === 'ultimate' ? 'is-ult' : a.view.ref.side === 'enemy' ? 'is-enemy' : '');
        if (e.kind === 'ultimate') {
          if (ex >= 2) { exChainBadge(ex); ctx.sfx.play('chain', { step: ex - 1 }); }
          await cutIn(a, ex);
          if (!skipping) { ctx.fx.burst(a.el, { color: a.view.ref.side === 'enemy' ? '#ff6b5a' : '#ffc93c', size: 380, ms: 900 }); ctx.sfx.play('ult'); }
          jolt(shakePx(3));
          boostNext = true;
          await wait(ex >= 2 ? 220 : 350);
        }
        else await wait(e.kind === 'skill' ? 260 : e.kind === 'rear' ? 200 : 180);
        break;
      }
      case 'damage': {
        const t = live.get(key(e.target));
        const src = live.get(key(e.source));
        if (!t) break;
        const hpBefore = t.hp;
        const shieldBefore = t.shield;
        t.shield -= e.shieldAbsorbed;
        t.hp = Math.max(0, t.hp - e.amount);
        const boosted = boostNext;
        boostNext = false;
        const info = { amount: e.amount + e.shieldAbsorbed, maxHp: t.view.maxHp, crit: e.crit, boosted };
        const imp = impactOf(info);
        if (e.origin && src) beam(src, t, 'support');
        hitReact(t, imp);
        if (!ctx.settings.noFlash) pulse(t, 'is-flash');
        if (e.shieldAbsorbed) float(t, `−${e.shieldAbsorbed}`, 'shield');
        if (shieldBefore > 0 && t.shield <= 0) {
          float(t, 'BREAK', 'break', { dy: -40 });
          shards(t, '#bfe4ff');
          if (!skipping) ctx.sfx.play('shieldBreak');
        }
        if (e.amount) float(t, `${e.amount.toLocaleString()}${e.crit ? '!' : ''}`, e.true ? 'true' : e.crit ? 'crit' : 'dmg', { size: floatSize(info), impact: imp });
        // 오버킬: 남은 체력보다 훨씬 큰 한 방
        if (hpBefore > 0 && t.hp <= 0 && e.amount >= hpBefore * 1.5 && e.amount - hpBefore >= t.view.maxHp * 0.2) { float(t, `OVERKILL +${Math.round(e.amount - hpBefore).toLocaleString()}`, 'overkill', { dy: 46, impact: 2 }); if (!skipping) ctx.sfx.play('OVERKILL'); }
        if (!skipping) ctx.sfx.play(e.crit ? 'crit' : 'hit', { power: imp, foe: src?.view.ref.side === 'enemy', shielded: e.shieldAbsorbed > 0 && !e.amount });
        if (imp >= 2) jolt(shakePx(imp), src, t);
        if (e.crit && !skipping && speed < 4) ctx.fx.burst(t.el, { color: '#ff8a5a', size: imp >= 3 ? 240 : 170, ms: 550 });
        paint(t);
        await wait(70);
        if (imp >= 2) await hitstop(boosted ? 'cutinFollow' : 'hit', imp);
        break;
      }
      case 'heal': case 'shield': {
        const t = live.get(key(e.target));
        const src = live.get(key(e.source));
        if (!t) break;
        if (e.t === 'heal') { t.hp = Math.min(t.view.maxHp, t.hp + e.amount); float(t, `+${e.amount}`, 'heal'); }
        else { t.shield += e.amount; float(t, `보호막 +${e.amount}`, 'shield'); }
        if (!skipping && e.amount > 0) ctx.sfx.play(e.t);
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
        if (!skipping) { ctx.fx.burst(t.el, { color: t.view.ref.side === 'enemy' ? '#a78bfa' : '#7cc8ff', size: t.view.boss ? 420 : 200, ms: t.view.boss ? 1000 : 700 }); ctx.sfx.play('down', { who: t.view.boss ? 'boss' : t.view.ref.side === 'enemy' ? 'enemy' : 'ally' }); }
        log(`${nameOf(t.view)} 전투불능`, 'is-down');
        if (t.view.unitId && speed === 1 && !skipping) {
          const line = ctx.lookup.line(t.view.unitId, 'defeated');
          if (line) ctx.speak(t.view.unitId, 'defeated', t.el, 1100);
        }
        await wait(160);
        // 승패를 가르는 마지막 처치·보스 처치는 길게 멈춘다
        const frontLeft = [...live.values()].some((x) => x.view.hasHp && !x.down && x.view.ref.side === t.view.ref.side && x.view.ref.zone === 'front');
        if (!frontLeft && t.view.ref.zone === 'front') await hitstop('lastKill');
        else if (t.view.boss) await hitstop('bossDown');
        else await hitstop('down', 1);
        break;
      }
      case 'proc': {
        const n = chain.onProc(e.chain);
        const grade = procGrade(e.cause);
        procBanner(e, grade);
        if (n >= 2) { showChain(n); if (!skipping) ctx.sfx.play('chain', { step: n - 1 }); }
        else if (!skipping) ctx.sfx.play('proc', { step: grade === 'normal' ? 0 : 4, rare: grade !== 'normal' });
        log(`  ✦ ${e.cause.kind === 'oopart' ? ctx.lookup.oopart(e.cause.id)?.name ?? e.cause.id : ctx.lookup.syn(e.cause.id)?.name ?? e.cause.id} · ${e.label}`, 'is-proc');
        await wait(grade === 'legend' || grade === 'plat' ? 420 : grade === 'gold' ? 300 : 200);
        break;
      }
      case 'escalation':
        escBps = e.damageBps;
        avBox.classList.toggle('is-hot', escBps > 0);
        avText.textContent = `AV ${e.av} · 격화 +${escBps / 100}%`;
        escalate(escBps);
        break;
      case 'end':
        break;
    }
  }

  async function play() {
    if (run.nodeType === 'boss') ctx.sfx.play('BOSS_ALERT');
    else if (run.nodeType === 'elite') ctx.sfx.play('ELITE_ALERT');
    ctx.sfx.play('BTL_START');
    await new Promise((r) => setTimeout(r, ctx.settings.reduceMotion ? 0 : 350));
    if (await synergyOnline()) await wait(150);
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
    field.classList.remove('is-stop', 'is-mono');
    if (!skipping) ctx.sfx.play(result.outcome === 'win' ? 'victory' : 'defeat');
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
