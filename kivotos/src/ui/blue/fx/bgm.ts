// 배경 음악. 화면 단계마다 곡 하나를 정하고(bgmFor), 바뀌면 짧게 겹쳐 넘긴다(크로스페이드).
// 게임 결과와 무관한 표현 계층이다. 브라우저 자동 재생 제한 때문에 첫 클릭·키 입력 뒤에 소리가 난다.

export type BgmTrack = 'lobby' | 'prep';

/** 곡 파일(public/ 기준). 사용자 제공 2026-10-31 */
export const BGM_FILES: Record<BgmTrack, string> = {
  lobby: 'audio/bgm/lobby.mp3',
  prep: 'audio/bgm/prep.mp3',
};

/**
 * 화면 단계 → 곡. 메인 로비(홈·도감·설정·런 설정)는 lobby, 출격 대기(전략·준비·보상·다음 전투 안내)는 prep.
 * 전투·런 종료는 아직 곡이 없어 조용히 둔다(null).
 */
export function bgmFor(phase: string, route: string | null): BgmTrack | null {
  if (phase === 'HOME' || route === 'codex' || route === 'settings' || phase === 'RUN_SETUP') return 'lobby';
  if (phase === 'BATTLE' || phase === 'RUN_COMPLETE' || phase === 'RUN_FAILED') return null;
  return 'prep';
}

export interface Bgm {
  play(track: BgmTrack | null): void;
  setVolume(v: number): void;
}

export function createBgm(url: (path: string) => string, volume: () => number): Bgm {
  const FADE_MS = 900;
  const els = new Map<BgmTrack, HTMLAudioElement>();
  let want: BgmTrack | null = null;
  let unlocked = false;
  const target = () => Math.max(0, Math.min(1, volume() / 100)) * 0.8;

  function el(t: BgmTrack): HTMLAudioElement {
    let a = els.get(t);
    if (!a) {
      a = new Audio(url(BGM_FILES[t]));
      a.loop = true;
      a.preload = 'auto';
      a.volume = 0;
      els.set(t, a);
    }
    return a;
  }
  // 볼륨을 FADE_MS 동안 목표값으로. 0에 닿으면 멈춘다
  const fades = new Map<HTMLAudioElement, number>();
  function fade(a: HTMLAudioElement, to: number) {
    cancelAnimationFrame(fades.get(a) ?? 0);
    const from = a.volume;
    const t0 = performance.now();
    const step = () => {
      const k = Math.min(1, (performance.now() - t0) / FADE_MS);
      a.volume = Math.max(0, Math.min(1, from + (to - from) * k));
      if (k < 1) fades.set(a, requestAnimationFrame(step));
      else if (to === 0) a.pause();
    };
    fades.set(a, requestAnimationFrame(step));
  }
  function apply() {
    if (!unlocked) return;
    const v = target();
    for (const [t, a] of els) if (t !== want) fade(a, 0);
    if (!want || v <= 0) { if (want && v <= 0) els.get(want)?.pause(); return; }
    const a = el(want);
    if (a.paused) void a.play().catch(() => { /* 자동 재생 거부: 다음 입력 때 다시 */ unlocked = false; arm(); });
    fade(a, v);
  }
  function arm() {
    const go = () => { unlocked = true; window.removeEventListener('pointerdown', go, true); window.removeEventListener('keydown', go, true); apply(); };
    window.addEventListener('pointerdown', go, true);
    window.addEventListener('keydown', go, true);
  }
  arm();

  return {
    play(track) { if (track === want) return; want = track; apply(); },
    setVolume() { apply(); },
  };
}
