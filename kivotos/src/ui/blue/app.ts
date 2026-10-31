// 「블루 아카이브 풍」 화면 계층의 뼈대: 1920×1080 무대 배율, phase 라우팅, 토스트·모달·말풍선·설정.
import type { GameCommandType } from '../../app/gameClient';
import type { DialogueKey, EnemyDefinition, EquipmentDefinition, OopartDefinition, StrategyDefinition, SynergyDefinition, UnitDefinition } from '../../core/types/content';
import { h } from './dom';
import { chooseFxTier } from './fx/capabilities';
import { createFx, NO_FX, type Fx } from './fx/engine';
import { createSfx, type Sfx } from './fx/sfx';
import { bgmFor, createBgm } from './fx/bgm';
import { icon } from './icons';
import type { UiDriver, UiState } from './model';
import { mountBattle } from './screens/battle';
import { mountCodex } from './screens/codex';
import { mountEquipmentChoice } from './screens/equipment';
import { mountOopartChoice, oopartArt, oopartBody } from './screens/ooparts';
import { mountHome } from './screens/home';
import { mountNextNode } from './screens/nextNode';
import { mountPreparation } from './screens/preparation';
import { mountResult } from './screens/result';
import { mountRunEnd } from './screens/runEnd';
import { mountRunSetup } from './screens/runSetup';
import { mountSettings } from './screens/settings';
import { mountStrategyChoice } from './screens/strategy';

export interface Settings {
  reduceMotion: boolean;
  noFlash: boolean;
  noShake: boolean;
  dialogue: boolean;
  defaultSpeed: 1 | 2 | 4;
  /** WebGL2 셰이더 연출(유체 배경·카드 광택·전환 파편) */
  fx: boolean;
  /** 효과음 볼륨 0~100(0이면 오디오 장치를 열지 않는다) */
  sfxVolume: number;
  /** 배경 음악 볼륨 0~100 */
  bgmVolume: number;
}

export interface Screen {
  el: HTMLElement;
  update?(s: UiState): void;
  destroy?(): void;
}

export type LocalRoute = 'codex' | 'settings' | null;

export interface Ctx {
  driver: UiDriver;
  state(): UiState;
  send(type: GameCommandType, payload?: Record<string, unknown>): Promise<boolean>;
  toast(message: string, kind?: 'info' | 'error' | 'gold'): void;
  modal(content: HTMLElement, opts?: { onClose?: () => void; wide?: boolean; label?: string }): () => void;
  confirm(opts: { title: string; body: (string | HTMLElement)[]; confirm: string; danger?: boolean }): Promise<boolean>;
  speak(unitId: string, key: DialogueKey, anchor: Element | null, ms: number): void;
  settings: Settings;
  saveSettings(): void;
  mobile(): boolean;
  scale(): number;
  stage: HTMLElement;
  /** 셰이더 연출. 꺼져 있거나 WebGL2가 없으면 아무 일도 하지 않는다 */
  fx: Fx;
  /** 효과음(합성음). 볼륨 0이면 아무 일도 하지 않는다 */
  sfx: Sfx;
  /** public/ 아래 그림 주소(배포 경로 기준). 예: art('cutins/u_aru.webp') */
  art(path: string): string;
  go(route: LocalRoute): void;
  lookup: {
    unit(id: string): UnitDefinition;
    syn(id: string): SynergyDefinition | undefined;
    enemy(id: string): EnemyDefinition | undefined;
    eq(id: string): EquipmentDefinition | undefined;
    strategy(id: string): StrategyDefinition | undefined;
    oopart(id: string): OopartDefinition | undefined;
    effectSpec(id: string | null): { spec: string; limits: string } | null;
    line(unitId: string, key: DialogueKey): string | null;
  };
  portrait(unitId: string): string | null;
  faction(unit: UnitDefinition): { id: string | null; color: string };
  /** 화면 전환과 무관하게 남는 화면 쪽 상태(선택된 학생 등) */
  ui: { selected: string | null; lastCue: number; playedBattle: string | null };
}

export const FACTION_COLOR: Record<string, string> = {
  syn_abydos: '#3b82f6', syn_gehenna: '#dc2626', syn_millennium: '#0ea5e9', syn_trinity: '#eab308',
  syn_hyakkiyako: '#db2777', syn_shanhaijing: '#16a34a', syn_red_winter: '#b91c1c', syn_valkyrie: '#1d4ed8',
  syn_srt: '#475569', syn_arius: '#7c3aed', syn_problem_solver: '#9f1239', syn_cc: '#111827',
  syn_highlander: '#0f766e', syn_outlaw: '#a16207',
};

const SETTINGS_KEY = 'kivotos-ui-settings';
/** 명령이 성공했을 때 낼 효과음(효과음 묶음 ID). 실패는 오류 알림음 */
const SEND_SFX: Partial<Record<GameCommandType, string>> = {
  BUY_UNIT: 'SHOP_BUY', SELL_UNIT: 'SHOP_SELL', REROLL_SHOP: 'SHOP_REROLL', BUY_XP: 'XP_BUY', MOVE_UNIT: 'UNIT_PLACE',
  EQUIP_ITEM: 'EQUIP_ON', UNEQUIP_ITEM: 'EQUIP_OFF', START_BATTLE: 'SORTIE', CHOOSE_STRATEGY: 'STRATEGY_PICK',
  SKIP_OOPART: 'OOP_SKIP', CHOOSE_EQUIPMENT: 'EQUIP_GET', CHOOSE_NODE_CANDIDATE: 'NODE_MOVE', CONFIRM_RESULT: 'UI_CONFIRM', NEW_RUN: 'UI_CONFIRM',
};

const DEFAULT_SETTINGS: Settings = { reduceMotion: false, noFlash: false, noShake: false, dialogue: true, defaultSpeed: 1, fx: true, sfxVolume: 60, bgmVolume: 50 };

function loadSettings(): Settings {
  const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, reduceMotion: reduce, ...JSON.parse(raw) };
  } catch { /* 저장소를 못 쓰면 기본값 */ }
  return { ...DEFAULT_SETTINGS, reduceMotion: reduce };
}

export function mountBlueUi(root: HTMLElement, driver: UiDriver): void {
  const { pack } = driver.catalog;
  const units = new Map(pack.units.map((u) => [u.id, u]));
  const syns = new Map(pack.synergies.map((s) => [s.id, s]));
  const enemies = new Map(pack.enemies.map((e) => [e.id, e]));
  const eqs = new Map(pack.equipment.map((e) => [e.id, e]));
  const strats = new Map(pack.strategies.map((s) => [s.id, s]));
  const oops = new Map(pack.ooparts.map((o) => [o.id, o]));
  const effects = new Map(pack.effects.map((e) => [e.id, e]));
  const lines = new Map(pack.dialogue.map((d) => [d.unitId, d]));
  const portraitIds = new Map(pack.units.map((u) => [u.id, u.portraitAssetId]));

  root.replaceChildren();
  root.className = 'k-root';
  const scene = h('div', { class: 'k-scene' });
  const backdrop = h('div', { class: 'k-backdrop', 'aria-hidden': 'true' }, h('div', { class: 'k-sky' }), scene, h('div', { class: 'k-halo-bg' }), h('div', { class: 'k-grid-bg' }));
  const art = (path: string) => `${import.meta.env.BASE_URL}${path}`;
  const stage = h('div', { class: 'k-stage' });
  // 공통 UI음: 보상 카드는 올려놓기·고르기, 나머지 버튼은 클릭. 명령 결과음은 ctx.send가 따로 낸다
  let hoverCard: Element | null = null;
  stage.addEventListener('click', (e) => {
    const t = e.target as Element;
    if (t.closest('.k-choice-card')) sfx.play('CHOICE_PICK');
    else if (t.closest('button, [role=tab], summary')) sfx.play('UI_CLICK');
  }, true);
  stage.addEventListener('pointerover', (e) => {
    const card = (e.target as Element).closest('.k-choice-card');
    if (card && card !== hoverCard) sfx.play('CHOICE_HOVER');
    hoverCard = card;
  });
  const toasts = h('div', { class: 'k-toasts', role: 'status', 'aria-live': 'polite' });
  const layer = h('div', { class: 'k-layer' });
  stage.append(layer, toasts);
  root.append(backdrop, stage);
  if (driver.preview) {
    root.append(h('div', { class: 'k-preview-flag', title: '코어 규칙(M1·M2)이 연결되기 전이라 상점·전투 수치는 화면 확인용 목 데이터입니다' }, icon('info', 16), '미리보기 데이터'));
  }

  let scale = 1;
  let mobile = false;
  function fit() {
    const w = window.innerWidth;
    const hgt = window.innerHeight;
    mobile = w < 768 || w / hgt < 1.05;
    root.classList.toggle('is-mobile', mobile);
    if (mobile) {
      scale = 1;
      root.classList.remove('is-compact');
      stage.style.transform = '';
      root.style.removeProperty('--k-scale');
    } else {
      scale = Math.min(w / 1920, hgt / 1080);
      root.classList.toggle('is-compact', scale < 0.8);
      stage.style.transform = `translate(-50%, -50%) scale(${scale})`;
      root.style.setProperty('--k-scale', String(scale));
    }
  }
  window.addEventListener('resize', fit);
  fit();

  const settings = loadSettings();
  const applySettings = () => {
    root.classList.toggle('reduce-motion', settings.reduceMotion);
    root.classList.toggle('no-flash', settings.noFlash);
    root.classList.toggle('no-shake', settings.noShake);
  };
  applySettings();
  const rawSfx = createSfx(() => settings.sfxVolume, art);
  // 전투 중에는 기본 총격음만 낸다(사용자 지시 2026-10-31). 착탄·필살기·발동·연쇄·버튼음 등은 전투 화면에서 모두 끈다
  const sfx: Sfx = {
    play(name, o) {
      if (driver.get().phase === 'BATTLE') {
        if (name !== 'hit' && name !== 'crit') return;
        o = { ...o, gunOnly: true };
      }
      rawSfx.play(name, o);
    },
    setVolume: (v) => rawSfx.setVolume(v),
  };
  const bgm = createBgm(art, () => settings.bgmVolume);

  // 셰이더 연출: 설정·연출 줄이기·WebGL2 지원에 따라 켜고 끈다. 화면 코드는 ctx.fx만 부른다.
  let fx: Fx = NO_FX;
  const syncFx = () => {
    const want = chooseFxTier(settings) === 'webgl2';
    if (want && fx === NO_FX) fx = createFx({ root, stage, scale: () => scale, mobile: () => mobile, noFlash: () => settings.noFlash });
    else fx.setEnabled(want);
  };
  syncFx();
  const fxProxy: Fx = {
    get on() { return fx.on; },
    burst: (at, o) => fx.burst(at, o),
    transition: (k) => { sfx.play(k === 'shatter' ? 'SCENE_SHATTER' : 'SCENE_SWEEP'); fx.transition(k); },
    theme: (c) => fx.theme(c),
    setEnabled: (on) => fx.setEnabled(on),
    scene: (url, o) => fx.scene(url, o),
  };

  let route: LocalRoute = null;
  let current: Screen | null = null;
  let currentKey = '';

  const ctx: Ctx = {
    driver,
    state: () => driver.get(),
    async send(type, payload) {
      const res = await driver.send(type, payload);
      if (res.ok) {
        const snd = SEND_SFX[type];
        if (type === 'TOGGLE_SHOP_LOCK') sfx.play(driver.get().run?.shop.locked ? 'SHOP_LOCK:1' : 'SHOP_LOCK:2');
        else if (snd) sfx.play(snd);
      }
      if (!res.ok) {
        ctx.toast(res.reason === 'STALE_REVISION' ? '다른 탭에서 진행되었습니다. 최신 저장을 불러옵니다' : res.message, 'error');
        return false;
      }
      return true;
    },
    toast(message, kind = 'info') {
      sfx.play(kind === 'error' ? 'UI_ERROR' : 'UI_TOAST');
      const t = h('div', { class: `k-toast is-${kind}` }, icon(kind === 'error' ? 'warning' : kind === 'gold' ? 'gold' : 'info', 22), h('span', null, message));
      toasts.append(t);
      while (toasts.children.length > 3) toasts.firstElementChild?.remove();
      setTimeout(() => { t.classList.add('is-out'); setTimeout(() => t.remove(), 300); }, 3000);
    },
    modal(content, opts = {}) {
      const prevFocus = document.activeElement as HTMLElement | null;
      const wrap = h('div', { class: 'k-modal-wrap', role: 'dialog', 'aria-modal': 'true', 'aria-label': opts.label ?? '대화상자' });
      const scrim = h('div', { class: 'k-scrim' });
      const box = h('div', { class: `k-modal ${opts.wide ? 'is-wide' : ''}` }, content);
      wrap.append(scrim, box);
      layer.append(wrap);
      sfx.play('UI_OPEN');
      const close = () => {
        wrap.classList.add('is-out');
        sfx.play('UI_CLOSE');
        document.removeEventListener('keydown', onKey, true);
        setTimeout(() => wrap.remove(), 180);
        opts.onClose?.();
        prevFocus?.focus?.();
      };
      const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
      document.addEventListener('keydown', onKey, true);
      scrim.addEventListener('click', close);
      requestAnimationFrame(() => (box.querySelector<HTMLElement>('[autofocus], button, [tabindex]')?.focus()));
      return close;
    },
    confirm({ title, body, confirm, danger }) {
      return new Promise((resolve) => {
        let answered = false;
        const done = (v: boolean) => { if (!answered) { answered = true; resolve(v); close(); } };
        const panel = h('div', { class: 'k-dialog' },
          h('header', { class: 'k-dialog-head' }, h('h2', null, title), h('button', { class: 'k-x', 'aria-label': '닫기', onclick: () => done(false) }, icon('close', 26))),
          h('div', { class: 'k-dialog-body' }, ...body.map((b) => (typeof b === 'string' ? h('p', null, b) : b))),
          h('footer', { class: 'k-dialog-foot' },
            h('button', { class: 'k-btn is-ghost', onclick: () => done(false) }, icon('close', 22), '취소'),
            h('button', { class: `k-btn ${danger ? 'is-danger' : 'is-primary'}`, autofocus: true, onclick: () => done(true) }, icon('check', 22), confirm)));
        const close = ctx.modal(panel, { onClose: () => { if (!answered) { answered = true; resolve(false); } }, label: title });
      });
    },
    speak(unitId, key, anchor, ms) {
      if (!settings.dialogue) return;
      const text = ctx.lookup.line(unitId, key);
      if (!text) return;
      const bubble = h('div', { class: 'k-bubble', role: 'note' }, h('b', null, units.get(unitId)?.name.split(' ').pop() ?? ''), h('span', null, text));
      layer.append(bubble);
      sfx.play('DIALOGUE_POP');
      const sr = stage.getBoundingClientRect();
      const s = ctx.scale();
      if (anchor && !mobile) {
        const r = anchor.getBoundingClientRect();
        const x = (r.left + r.width / 2 - sr.left) / s;
        const y = (r.top - sr.top) / s;
        bubble.style.left = `${Math.max(180, Math.min(1740, x))}px`;
        bubble.style.top = `${Math.max(120, y)}px`;
      } else bubble.classList.add('is-floating');
      setTimeout(() => { bubble.classList.add('is-out'); setTimeout(() => bubble.remove(), 250); }, ms);
    },
    settings,
    saveSettings() {
      applySettings();
      syncFx();
      sfx.setVolume(settings.sfxVolume);
      bgm.setVolume(settings.bgmVolume);
      try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* 무시 */ }
    },
    mobile: () => mobile,
    scale: () => scale,
    stage,
    fx: fxProxy,
    sfx,
    art,
    go(r) { route = r; render(driver.get()); },
    lookup: {
      unit: (id) => units.get(id)!,
      syn: (id) => syns.get(id),
      enemy: (id) => enemies.get(id),
      eq: (id) => eqs.get(id),
      strategy: (id) => strats.get(id),
      oopart: (id) => oops.get(id),
      effectSpec: (id) => { const e = id ? effects.get(id) : undefined; return e ? { spec: e.spec, limits: e.limits } : null; },
      line: (unitId, key) => lines.get(unitId)?.lines[key] ?? null,
    },
    portrait(unitId) {
      const id = portraitIds.get(unitId);
      return id ? driver.catalog.assetUrl(id) : null;
    },
    faction(unit) {
      const id = unit.synergyIds.find((s) => s in FACTION_COLOR) ?? null;
      return { id, color: id ? FACTION_COLOR[id] : '#64748b' };
    },
    ui: { selected: null, lastCue: driver.get().cues.at(-1)?.id ?? 0, playedBattle: null },
  };

  function screenFor(s: UiState): [string, () => Screen] {
    if (s.phase === 'HOME' || !s.run) {
      if (route === 'codex') return ['codex', () => mountCodex(ctx)];
      if (route === 'settings') return ['settings', () => mountSettings(ctx)];
      return ['home', () => mountHome(ctx, s)];
    }
    switch (s.phase) {
      case 'RUN_SETUP': return ['setup', () => mountRunSetup(ctx, s)];
      case 'STRATEGY_CHOICE': return ['strategy', () => mountStrategyChoice(ctx, s)];
      case 'PREPARATION': return ['prep', () => mountPreparation(ctx, s)];
      case 'BATTLE': return [`battle-${s.run.lastBattle?.battleId}`, () => mountBattle(ctx, s)];
      case 'RESULT': return ['result', () => mountResult(ctx, s)];
      case 'EQUIPMENT_CHOICE': return ['equipment', () => mountEquipmentChoice(ctx, s)];
      case 'OOPART_CHOICE': return [`oopart-${s.run.ooparts.offer?.source}-${s.run.nodeId}`, () => mountOopartChoice(ctx, s)];
      case 'NEXT_NODE': return [`next-${s.run.nodeId}`, () => mountNextNode(ctx, s)];
      case 'RUN_COMPLETE':
      case 'RUN_FAILED': return ['end', () => mountRunEnd(ctx, s)];
      default: return ['home', () => mountHome(ctx, s)];
    }
  }

  // 런 시작·출격·런 종료처럼 큰 장면 전환만 파편으로 부수고, 나머지는 가벼운 빛 쓸기
  function bigMove(from: string, to: string): boolean {
    if (to === 'codex' || to === 'settings' || from === 'codex' || from === 'settings') return false;
    return to === 'setup' || to === 'end' || to.startsWith('battle-') || (from === 'home' && to !== 'home');
  }

  // 화면별 배경 일러스트: 메인은 도시 전경, 런 중에는 장 배경, 결말은 컷신. 흰 막(wash)으로 글자 가독성을 지킨다.
  function applyScene(s: UiState, key: string) {
    const ch = s.run?.chapter ?? 1;
    let o: { img: string; mix: number; wash: number; left?: boolean };
    if (key === 'home' || key === 'codex' || key === 'settings') o = { img: 'bg_home', mix: 1, wash: key === 'home' ? 0.82 : 0.6, left: key === 'home' };
    else if (key === 'setup') o = { img: 'cut_sortie', mix: 1, wash: 0.5 };
    else if (key === 'end') o = { img: s.phase === 'RUN_COMPLETE' ? 'cut_clear' : 'cut_defeat', mix: 1, wash: 0.42 };
    else if (key === 'prep') o = { img: `bg_ch${ch}`, mix: 0.9, wash: 0.5 };
    else o = { img: `bg_ch${ch}`, mix: 1, wash: 0.36 };
    const url = art(`keyart/${o.img}.webp`);
    fx.scene(url, { mix: o.mix, wash: o.wash, washLeft: o.left });
    scene.style.backgroundImage = `url("${url}")`;
    scene.style.setProperty('--wash', String(o.wash));
    scene.classList.toggle('is-left', !!o.left);
  }

  function render(s: UiState) {
    const [key, make] = screenFor(s);
    applyScene(s, key);
    root.dataset.chapter = String(s.run?.chapter ?? 1);
    root.dataset.phase = s.phase;
    bgm.play(bgmFor(s.phase, s.phase === 'HOME' ? route : null));
    fx.theme(s.run?.chapter ?? 1);
    if (key === currentKey && current?.update) {
      current.update(s);
      return;
    }
    current?.destroy?.();
    const prev = current;
    if (prev) fx.transition(bigMove(currentKey, key) ? 'shatter' : 'sweep');
    current = make();
    currentKey = key;
    current.el.classList.add('k-screen');
    stage.insertBefore(current.el, layer);
    if (prev) {
      prev.el.classList.add('is-leaving');
      setTimeout(() => prev.el.remove(), settings.reduceMotion ? 0 : 260);
    }
    if (mobile) window.scrollTo(0, 0);
  }

  // 전설 오파츠 완성은 어느 화면으로 넘어가든 한 번 크게 보여 준다(OOPARTS_v1 1.3)
  let lastMergeCue = driver.get().cues.at(-1)?.id ?? 0;
  function celebrateMerges(s: UiState) {
    for (const c of s.cues) {
      if (c.id <= lastMergeCue) continue;
      lastMergeCue = c.id;
      // 진행 알림음: 합성·레벨업·각성·오파츠 획득
      if (c.kind === 'merge') sfx.play((c.star ?? 2) >= 3 ? 'MERGE_3' : 'MERGE_2');
      else if (c.kind === 'levelup') sfx.play('LEVEL_UP');
      else if (c.kind === 'awaken') sfx.play('AWAKEN');
      else if (c.kind === 'oopart' && c.oopartId) sfx.play(({ common: 'OOP_COMMON', uncommon: 'OOP_UNCOMMON', rare: 'OOP_RARE', legendary: 'OOP_LEGEND' } as Record<string, string>)[oops.get(c.oopartId)?.rarity ?? 'common'] ?? 'OOP_COMMON');
      else if (c.kind === 'oopart_merge') sfx.play('OOP_LEGEND');
      if (c.kind !== 'oopart_merge' || !c.oopartId) continue;
      const leg = oops.get(c.oopartId);
      const parts = (c.consumed ?? []).map((id) => oops.get(id)?.name ?? id);
      const box = h('div', { class: 'k-oop-merge' },
        h('div', { class: 'k-oop-merge-art' }, oopartArt(ctx, c.oopartId, 'k-oop-merge-img')),
        h('small', null, '전설 오파츠 완성'),
        h('h2', null, leg?.name ?? c.oopartId),
        h('p', { class: 'k-oop-merge-parts' }, `${parts.join(' + ')} → 하나로 합쳐졌어요`),
        ...oopartBody(ctx, c.oopartId),
        c.firstReveal ? h('p', { class: 'k-oop-merge-reveal' }, icon('codex', 18), '처음 완성했어요. 이 조합법이 도감에 공개돼요.') : null,
        h('button', { class: 'k-btn is-primary', onclick: () => close() }, icon('check', 22), '확인'));
      const close = ctx.modal(box, { label: '전설 오파츠 완성' });
      ctx.fx.burst(box, { color: '#ffcf3a', size: 520, ms: 1400 });
    }
  }

  driver.subscribe((s) => {
    if (s.phase !== 'HOME') route = null;
    render(s);
    celebrateMerges(s);
  });
  render(driver.get());
}
