// 합성 효과음(WebAudio). 소리 파일 없이 발진기·잡음으로 바로 만든다. 나중에 효과음 파일이 생기면
// 같은 이름(play('hit', …))으로 파일 재생기로 바꾸면 되고, 화면 쪽 호출은 그대로 둔다.
// 게임 결과와 무관하다. 볼륨 0이면 오디오 장치를 아예 열지 않는다.

export type SfxName =
  | 'hit' | 'crit' | 'ult' | 'cutin' | 'down' | 'shieldBreak' | 'heal' | 'shield'
  | 'proc' | 'chain' | 'escalation' | 'synergy' | 'victory' | 'defeat';

export interface SfxOpts {
  /** 0~3 세기(가벼움·보통·묵직·폭발) */
  power?: number;
  /** 연쇄 단계. 높을수록 음이 올라간다 */
  step?: number;
}

export interface Sfx {
  play(name: SfxName, o?: SfxOpts): void;
  setVolume(v: number): void;
}

export function createSfx(volume: () => number): Sfx {
  let ac: AudioContext | null = null;
  let master: GainNode | null = null;
  let comp: DynamicsCompressorNode | null = null;
  let noiseBuf: AudioBuffer | null = null;
  const recent = new Map<string, number>();

  function ensure(): AudioContext | null {
    if (volume() <= 0) return null;
    if (!ac) {
      const Ctor = (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
      if (!Ctor) return null;
      try { ac = new Ctor(); } catch { return null; }
      comp = ac.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 6;
      master = ac.createGain();
      master.gain.value = volume() / 100 * 0.7;
      master.connect(comp).connect(ac.destination);
      noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.6, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ac.state === 'suspended') void ac.resume();
    return ac;
  }

  function env(g: GainNode, t: number, peak: number, attack: number, decay: number) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }
  function tone(type: OscillatorType, f0: number, f1: number, t: number, dur: number, peak: number, attack = 0.004) {
    const a = ac!;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    env(g, t, peak, attack, dur);
    o.connect(g).connect(master!);
    o.start(t); o.stop(t + attack + dur + 0.02);
  }
  function noise(t: number, dur: number, peak: number, filter: BiquadFilterType, f0: number, f1 = f0, q = 0.8) {
    const a = ac!;
    const s = a.createBufferSource();
    s.buffer = noiseBuf;
    const bq = a.createBiquadFilter();
    bq.type = filter; bq.Q.value = q;
    bq.frequency.setValueAtTime(f0, t);
    bq.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    const g = a.createGain();
    env(g, t, peak, 0.003, dur);
    s.connect(bq).connect(g).connect(master!);
    s.start(t, Math.random() * 0.2); s.stop(t + dur + 0.05);
  }
  const semis = (n: number) => Math.pow(2, n / 12);
  const jitter = () => 1 + (Math.random() - 0.5) * 0.08;

  function play(name: SfxName, o: SfxOpts = {}) {
    const a = ensure();
    if (!a || !master) return;
    // 한 프레임에 같은 소리가 겹치면 귀가 아프다. 25ms 안의 같은 소리는 하나로 친다(광역기 대비)
    const now = performance.now();
    if (now - (recent.get(name) ?? -1e9) < 25) return;
    recent.set(name, now);
    const t = a.currentTime + 0.005;
    const p = Math.max(0, Math.min(3, o.power ?? 1));
    const step = o.step ?? 0;
    switch (name) {
      case 'hit': {
        const k = jitter();
        noise(t, 0.05 + p * 0.03, 0.35 + p * 0.15, 'bandpass', 2400 * k, 900, 1.2);
        tone('triangle', 190 * k, 70, t, 0.06 + p * 0.05, 0.25 + p * 0.18);
        if (p >= 2) tone('sine', 90, 38, t, 0.18 + p * 0.05, 0.55);
        break;
      }
      case 'crit':
        noise(t, 0.09, 0.6, 'highpass', 3200, 1800, 0.7);
        tone('square', 880 * jitter(), 330, t, 0.08, 0.16);
        tone('sine', 110, 40, t, 0.25, 0.7);
        break;
      case 'cutin':
        noise(t, 0.45, 0.35, 'bandpass', 600, 5200, 0.9);
        tone('sawtooth', 220, 880, t, 0.35, 0.08, 0.02);
        break;
      case 'ult':
        noise(t, 0.5, 0.7, 'lowpass', 2600, 120, 0.6);
        tone('sine', 120, 32, t, 0.6, 0.9);
        tone('triangle', 330, 82, t, 0.3, 0.25);
        break;
      case 'down':
        noise(t, 0.35, 0.5, 'lowpass', 1600, 90, 0.7);
        tone('sine', 150, 36, t, 0.42, 0.7);
        break;
      case 'shieldBreak':
        for (let i = 0; i < 5; i++) tone('triangle', 2400 * semis(i * 3) * jitter(), 1800, t + i * 0.018, 0.12, 0.12);
        noise(t, 0.16, 0.4, 'highpass', 5000, 2500, 0.8);
        break;
      case 'heal':
        tone('sine', 660 * jitter(), 990, t, 0.18, 0.12, 0.02);
        tone('sine', 990, 1320, t + 0.06, 0.18, 0.08, 0.02);
        break;
      case 'shield':
        tone('triangle', 520, 780, t, 0.14, 0.1, 0.01);
        break;
      case 'proc': {
        const f = 784 * semis(Math.min(step, 12));
        tone('triangle', f, f, t, 0.16, 0.22, 0.004);
        tone('sine', f * 2, f * 2, t + 0.04, 0.2, 0.1, 0.004);
        break;
      }
      case 'chain': {
        // 연쇄가 이어질수록 한 음씩 올라간다(도-레-미-솔-라-도 …)
        const scale = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
        const f = 523 * semis(scale[Math.min(step, scale.length - 1)]);
        tone('square', f, f, t, 0.12, 0.14, 0.003);
        tone('triangle', f * 1.5, f * 1.5, t + 0.05, 0.2, 0.14, 0.003);
        if (step >= 4) noise(t, 0.25, 0.25, 'highpass', 4000, 8000, 0.6);
        break;
      }
      case 'escalation':
        for (let i = 0; i < 2; i++) { tone('sawtooth', 440, 440, t + i * 0.22, 0.16, 0.1, 0.01); tone('sawtooth', 330, 330, t + i * 0.22 + 0.11, 0.1, 0.08, 0.01); }
        tone('sine', 70, 40, t, 0.5, 0.5);
        break;
      case 'synergy':
        [0, 4, 7, 12].forEach((s, i) => tone('triangle', 392 * semis(s), 392 * semis(s), t + i * 0.07, 0.35, 0.14, 0.01));
        noise(t, 0.4, 0.2, 'bandpass', 2000, 8000, 0.7);
        break;
      case 'victory':
        [0, 4, 7, 12, 16].forEach((s, i) => tone('square', 523 * semis(s), 523 * semis(s), t + i * 0.09, 0.3, 0.1, 0.01));
        break;
      case 'defeat':
        [0, -3, -7].forEach((s, i) => tone('triangle', 330 * semis(s), 300 * semis(s), t + i * 0.18, 0.4, 0.14, 0.02));
        break;
    }
  }

  return {
    play,
    setVolume(v: number) { if (master && ac) master.gain.setTargetAtTime(v / 100 * 0.7, ac.currentTime, 0.02); },
  };
}

export const NO_SFX: Sfx = { play() {}, setVolume() {} };
