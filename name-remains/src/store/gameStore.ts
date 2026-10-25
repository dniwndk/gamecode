// 화면 상태와 회차 진행을 묶는 저장소. 회차 상태(RunState)는 엔진이 제자리에서 고치므로 rev 숫자로 다시 그리기를 알린다.
import { create } from 'zustand';
import type { AchievementFact } from '../domain/contentTypes';
import type { CrisisPriorityType, FocusType, LifeRecord, ProfileArchive, RunState, TimelineLog } from '../domain/types';
import { createRun } from '../domain/runFactory';
import { abandonRun, advance, autoChoice, choose as engineChoose, setLifePlan, skipToDecision, type StepResult } from '../domain/engine';
import { emptyProfile } from '../domain/publicSelectors';
import { buildEpitaph } from '../domain/summary';
import { randomSeed } from '../domain/rng';
import { achById } from '../content/achievements';
import { buildExport, clearAll, loadAll, parseImport, saveAll } from './persistence';
import { playCue, setVolume } from '../audio';

export type Screen = 'title' | 'life' | 'ending' | 'codex' | 'archive';
export type Speed = 1 | 2 | 4 | 8;
export const SPEED_MS: Record<Speed, number> = { 1: 1800, 2: 900, 4: 450, 8: 200 };

export interface Settings {
  sound: boolean;
  volume: number;
  reduceMotion: boolean;
  autoDecide: boolean;
  textScale: 1 | 1.1 | 1.2;
  theme: 'dark' | 'light';
}

const SETTINGS_KEY = 'name-remains:settings';

function loadSettings(): Settings {
  const base: Settings = { sound: true, volume: 0.5, reduceMotion: false, autoDecide: false, textScale: 1, theme: 'dark' };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...base, ...(JSON.parse(raw) as Partial<Settings>) };
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) base.reduceMotion = true;
  } catch {
    /* 저장소를 못 쓰는 환경 */
  }
  return base;
}

export interface Toast {
  key: number;
  id: string;
  title: string;
  tier: number;
}

interface GameState {
  ready: boolean;
  screen: Screen;
  run: RunState | null;
  rev: number;
  playing: boolean;
  speed: Speed;
  settings: Settings;
  profile: ProfileArchive;
  toasts: Toast[];
  settingsOpen: boolean;
  lastEnded: RunState | null;
  hydrate: () => Promise<void>;
  newLife: (name: string, seed?: string) => void;
  resume: () => void;
  tick: () => void;
  choose: (choiceId: string) => void;
  skip: () => void;
  togglePlay: () => void;
  pause: () => void;
  setSpeed: (s: Speed) => void;
  setPlan: (focus: FocusType, crisis: CrisisPriorityType) => void;
  abandon: () => void;
  go: (s: Screen) => void;
  toggleWatch: (achId: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  setSettingsOpen: (open: boolean) => void;
  dismissToast: (key: number) => void;
  exportSave: () => string;
  importSave: (text: string) => Promise<void>;
  wipe: () => Promise<void>;
}

let toastKey = 0;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pendingFacts: AchievementFact[] = [];

export const useGame = create<GameState>((set, get) => {
  const persist = (immediate = false) => {
    const flush = () => {
      saveTimer = null;
      const { run, profile } = get();
      const facts = pendingFacts;
      pendingFacts = [];
      void saveAll(run, profile, facts).catch(() => undefined);
    };
    if (immediate) {
      if (saveTimer) clearTimeout(saveTimer);
      flush();
    } else if (!saveTimer) saveTimer = setTimeout(flush, 1200);
  };

  /** 엔진 결과를 화면 상태로 옮긴다: 소리, 업적 알림, 종점 처리 */
  const absorb = (res: StepResult) => {
    const { settings, run } = get();
    pendingFacts.push(...res.facts);
    if (settings.sound) {
      const cue = [...res.logs].reverse().find((l: TimelineLog) => l.sound)?.sound;
      if (cue) playCue(cue);
    }
    const toasts = res.achievements.map((id) => ({ key: ++toastKey, id, title: achById(id)?.title ?? id, tier: achById(id)?.tier ?? 1 }));
    set((st) => ({ rev: st.rev + 1, toasts: [...st.toasts, ...toasts].slice(-4) }));
    if (run && run.run.run_status !== 'playing') finalize(run);
    else persist(!!run?.run.pending_decision);
  };

  const finalize = (run: RunState) => {
    const { profile } = get();
    const now = new Date().toISOString();
    const achievements = { ...profile.achievements };
    for (const a of run.run.achievements) {
      if (!achievements[a.achievement_id]) achievements[a.achievement_id] = { first_run_id: run.run.id, earned_at_iso: now, person_name: run.run.person.name };
    }
    const p = run.run.person;
    const record: LifeRecord = {
      run_id: run.run.id,
      seed: run.run.seed,
      name: p.name,
      background_id: p.background_id,
      birth_year_age: 0,
      start_age: Math.round(run.run.clock.adult_start_minute / 525600),
      end_age: Math.floor(run.run.clock.current_age_years),
      endpoint_type: run.run.endpoint?.endpoint_type ?? 'abandoned',
      cause: run.run.endpoint?.cause ?? '중도 포기',
      position_id: p.position_id,
      form_id: p.form_id,
      achievement_ids: run.run.achievements.map((a) => a.achievement_id),
      epitaph: buildEpitaph(run),
      ended_at_iso: now,
    };
    const lives = [record, ...profile.lives.filter((l) => l.run_id !== record.run_id)].slice(0, 200);
    const seen = new Set([...(profile.seen_incidents ?? []), ...run.run.incident_history.map((h) => h.incident_id)]);
    set({ profile: { ...profile, achievements, lives, seen_incidents: [...seen] }, playing: false, lastEnded: run });
    persist(true);
  };

  return {
    ready: false,
    screen: 'title',
    run: null,
    rev: 0,
    playing: false,
    speed: 1,
    settings: loadSettings(),
    profile: emptyProfile(),
    toasts: [],
    settingsOpen: false,
    lastEnded: null,

    hydrate: async () => {
      const { profile, active } = await loadAll();
      set({ profile, run: active, ready: true });
      setVolume(get().settings.volume);
    },

    newLife: (name, seed) => {
      const run = createRun({ seed: seed?.trim() || randomSeed(), name, nowIso: new Date().toISOString() });
      pendingFacts = [];
      set({ run, screen: 'life', playing: true, rev: get().rev + 1, toasts: [] });
      persist(true);
    },

    resume: () => {
      if (get().run) set({ screen: 'life', playing: !get().run!.run.pending_decision });
    },

    tick: () => {
      const { run, settings } = get();
      if (!run || run.run.run_status !== 'playing') return;
      if (run.run.pending_decision) {
        if (settings.autoDecide) {
          const id = autoChoice(run);
          if (id) absorb(engineChoose(run, id));
        }
        return;
      }
      absorb(advance(run));
    },

    choose: (choiceId) => {
      const { run } = get();
      if (!run?.run.pending_decision) return;
      absorb(engineChoose(run, choiceId));
    },

    skip: () => {
      const { run } = get();
      if (!run || run.run.run_status !== 'playing' || run.run.pending_decision) return;
      const res = skipToDecision(run);
      // 건너뛴 구간의 소리는 마지막 것 하나만
      absorb(res);
      set({ playing: true });
    },

    togglePlay: () => set((st) => ({ playing: !st.playing })),
    pause: () => set({ playing: false }),
    setSpeed: (speed) => set({ speed }),

    setPlan: (focus, crisis) => {
      const { run } = get();
      if (!run) return;
      setLifePlan(run, focus, crisis);
      set((st) => ({ rev: st.rev + 1 }));
      persist();
    },

    abandon: () => {
      const { run } = get();
      if (!run || run.run.run_status !== 'playing') return;
      abandonRun(run);
      set((st) => ({ rev: st.rev + 1 }));
      finalize(run);
      set({ screen: 'ending' });
    },

    go: (screen) => set({ screen, playing: screen === 'life' ? get().playing : false }),

    toggleWatch: (achId) => {
      const { profile } = get();
      const watched = profile.watched.includes(achId) ? profile.watched.filter((x) => x !== achId) : [...profile.watched, achId].slice(-6);
      set({ profile: { ...profile, watched } });
      persist();
    },

    updateSettings: (patch) => {
      const settings = { ...get().settings, ...patch };
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      } catch {
        /* 무시 */
      }
      if (patch.volume !== undefined) setVolume(patch.volume);
      set({ settings });
    },

    setSettingsOpen: (open) => set({ settingsOpen: open }),
    dismissToast: (key) => set((st) => ({ toasts: st.toasts.filter((t) => t.key !== key) })),

    exportSave: () => {
      const { profile, run } = get();
      return JSON.stringify(buildExport(profile, run && run.run.run_status === 'playing' ? run : null));
    },

    importSave: async (text) => {
      const data = parseImport(text);
      set({ profile: data.profile, run: data.active, screen: 'title', playing: false, rev: get().rev + 1 });
      await saveAll(data.active, data.profile);
    },

    wipe: async () => {
      await clearAll();
      set({ profile: emptyProfile(), run: null, screen: 'title', playing: false, lastEnded: null, rev: get().rev + 1 });
    },
  };
});

export function flushNow() {
  const { run, profile } = useGame.getState();
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = null;
  const facts = pendingFacts;
  pendingFacts = [];
  void saveAll(run, profile, facts).catch(() => undefined);
}
