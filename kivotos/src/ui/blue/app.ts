// 「블루 아카이브 풍」 화면 계층의 뼈대: 1920×1080 무대 배율, phase 라우팅, 토스트·모달·말풍선·설정.
import type { GameCommandType } from '../../app/gameClient';
import type { DialogueKey, EnemyDefinition, EquipmentDefinition, StrategyDefinition, SynergyDefinition, UnitDefinition } from '../../core/types/content';
import { h } from './dom';
import { icon } from './icons';
import type { UiDriver, UiState } from './model';
import { mountBattle } from './screens/battle';
import { mountCodex } from './screens/codex';
import { mountEquipmentChoice } from './screens/equipment';
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
  go(route: LocalRoute): void;
  lookup: {
    unit(id: string): UnitDefinition;
    syn(id: string): SynergyDefinition | undefined;
    enemy(id: string): EnemyDefinition | undefined;
    eq(id: string): EquipmentDefinition | undefined;
    strategy(id: string): StrategyDefinition | undefined;
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
const DEFAULT_SETTINGS: Settings = { reduceMotion: false, noFlash: false, noShake: false, dialogue: true, defaultSpeed: 1 };

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
  const effects = new Map(pack.effects.map((e) => [e.id, e]));
  const lines = new Map(pack.dialogue.map((d) => [d.unitId, d]));
  const portraitIds = new Map(pack.units.map((u) => [u.id, u.portraitAssetId]));

  root.replaceChildren();
  root.className = 'k-root';
  const backdrop = h('div', { class: 'k-backdrop', 'aria-hidden': 'true' }, h('div', { class: 'k-sky' }), h('div', { class: 'k-halo-bg' }), h('div', { class: 'k-grid-bg' }));
  const stage = h('div', { class: 'k-stage' });
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

  let route: LocalRoute = null;
  let current: Screen | null = null;
  let currentKey = '';

  const ctx: Ctx = {
    driver,
    state: () => driver.get(),
    async send(type, payload) {
      const res = await driver.send(type, payload);
      if (!res.ok) {
        ctx.toast(res.reason === 'STALE_REVISION' ? '다른 탭에서 진행되었습니다. 최신 저장을 불러옵니다' : res.message, 'error');
        return false;
      }
      return true;
    },
    toast(message, kind = 'info') {
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
      const close = () => {
        wrap.classList.add('is-out');
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
      try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* 무시 */ }
    },
    mobile: () => mobile,
    scale: () => scale,
    stage,
    go(r) { route = r; render(driver.get()); },
    lookup: {
      unit: (id) => units.get(id)!,
      syn: (id) => syns.get(id),
      enemy: (id) => enemies.get(id),
      eq: (id) => eqs.get(id),
      strategy: (id) => strats.get(id),
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
      case 'NEXT_NODE': return [`next-${s.run.nodeId}`, () => mountNextNode(ctx, s)];
      case 'RUN_COMPLETE':
      case 'RUN_FAILED': return ['end', () => mountRunEnd(ctx, s)];
      default: return ['home', () => mountHome(ctx, s)];
    }
  }

  function render(s: UiState) {
    const [key, make] = screenFor(s);
    root.dataset.chapter = String(s.run?.chapter ?? 1);
    root.dataset.phase = s.phase;
    if (key === currentKey && current?.update) {
      current.update(s);
      return;
    }
    current?.destroy?.();
    const prev = current;
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

  driver.subscribe((s) => {
    if (s.phase !== 'HOME') route = null;
    render(s);
  });
  render(driver.get());
}
