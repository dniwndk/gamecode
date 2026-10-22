// 브라우저 저장: 자동 저장 3칸 순환, 설정, 계정 단위 업적·엔딩 수집. 접근이 막혀도 게임은 계속된다.
import { migrateState } from '../core/state.js';
const KEY = 'brassLife.v1';
const SLOTS = 3;

function read(k, fallback) {
  try { const v = localStorage.getItem(`${KEY}.${k}`); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function write(k, v) {
  try { localStorage.setItem(`${KEY}.${k}`, JSON.stringify(v)); return true; } catch { return false; }
}

export const DEFAULT_SETTINGS = {
  fontSize: 17, lineHeight: 1.75, theme: 'dark', contrast: 'normal', motion: 'auto', sound: true, volume: 0.5, speed: 1, autoplay: true,
};

export function loadSettings() { return { ...DEFAULT_SETTINGS, ...read('settings', {}) }; }
export function saveSettings(s) { write('settings', s); }

export function envelope(state) {
  return {
    format: 'brass-life-save', v: 1, savedAt: Date.now(), seed: state.seed, name: state.ch?.name, year: state.year, age: state.age, phase: state.phase,
    state,
  };
}

// 자동 저장: 다음 칸으로 돌려 쓴다
export function autosave(state) {
  const meta = read('meta', { next: 0 });
  const slot = meta.next % SLOTS;
  const ok = write(`slot${slot}`, envelope(state));
  if (ok) write('meta', { next: (slot + 1) % SLOTS, last: slot });
  return ok ? slot : -1;
}

// 탭을 떠날 때: 가장 최근 칸을 덮어쓴다 (순환하지 않음)
export function quicksave(state) {
  const meta = read('meta', { next: 0 });
  const slot = meta.last ?? 0;
  const ok = write(`slot${slot}`, envelope(state));
  if (ok && meta.last == null) write('meta', { next: (slot + 1) % SLOTS, last: slot });
  return ok;
}

export function listSlots() {
  const out = [];
  for (let i = 0; i < SLOTS; i++) {
    const e = read(`slot${i}`, null);
    out.push(e ? { slot: i, savedAt: e.savedAt, name: e.name, year: e.year, age: e.age, phase: e.phase, seed: e.seed } : { slot: i, empty: true });
  }
  return out;
}

export function loadSlot(i) {
  const e = read(`slot${i}`, null);
  return validate(e) ? migrateState(e.state) : null;
}

export function latestSlot() {
  const s = listSlots().filter(x => !x.empty && x.phase !== 'ended').sort((a, b) => b.savedAt - a.savedAt)[0];
  return s ? s.slot : -1;
}

export function clearSlots() { for (let i = 0; i < SLOTS; i++) try { localStorage.removeItem(`${KEY}.slot${i}`); } catch { /* 무시 */ } }

export function validate(e) {
  return !!(e && e.format === 'brass-life-save' && e.state && e.state.ch && e.state.rng && e.state.seed && typeof e.state.year === 'number');
}

export function exportText(state) { return JSON.stringify(envelope(state)); }
export function importText(text) {
  let e;
  try { e = JSON.parse(text); } catch { return { ok: false, reason: '저장 문자열을 읽을 수 없다.' }; }
  if (!validate(e)) return { ok: false, reason: '황동의 생애 저장 형식이 아니다.' };
  return { ok: true, state: migrateState(e.state) };
}

// 계정: 여러 삶에 걸친 업적·엔딩·삶의 수
export function loadAccount() { return { achievements: [], endings: [], lives: 0, traits: [], ...read('account', {}) }; }
export function recordAccount(state) {
  const acc = loadAccount();
  for (const a of state.achievements || []) if (!acc.achievements.includes(a)) acc.achievements.push(a);
  // 특성 도감: 한 번이라도 가져 본 특성 (극복해 잃은 것도 포함)
  for (const t of [...(state.ch?.traits || []), ...(state.ch?.lostTraits || [])]) if (!acc.traits.includes(t.id)) acc.traits.push(t.id);
  if (state.ending && state.runId !== acc.lastRun) {
    acc.lives += 1; acc.lastRun = state.runId;
    if (state.ending.main && !acc.endings.includes(state.ending.main.id)) acc.endings.push(state.ending.main.id);
    for (const x of state.ending.extras || []) if (!acc.endings.includes(x.id)) acc.endings.push(x.id);
  }
  write('account', acc);
  return acc;
}
