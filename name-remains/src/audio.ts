// Web Audio로 그때그때 합성하는 효과음. 파일을 받지 않으므로 오프라인에서도 같다.
// 모든 소리에는 화면의 [청각 자막]이 함께 나간다.
import type { SoundCue } from './domain/types';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let volume = 0.5;

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) {
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = volume;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function setVolume(v: number) {
  volume = v;
  if (master) master.gain.value = v;
}

/** 사용자 입력 직후에 한 번 불러 오디오를 깨운다(브라우저 자동재생 정책) */
export function unlockAudio() {
  ac();
}

function tone(c: AudioContext, type: OscillatorType, freq: number, start: number, dur: number, gain: number, endFreq?: number) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, start + dur);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g).connect(master!);
  o.start(start);
  o.stop(start + dur + 0.05);
}

function noise(c: AudioContext, start: number, dur: number, gain: number, freq: number, q = 1) {
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + Math.min(0.03, dur / 3));
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  src.connect(f).connect(g).connect(master!);
  src.start(start);
  src.stop(start + dur + 0.05);
}

export function playCue(cue: SoundCue) {
  const c = ac();
  if (!c || !master) return;
  const t = c.currentTime + 0.02;
  switch (cue) {
    case 'silence':
      tone(c, 'sine', 55, t, 2.2, 0.08);
      break;
    case 'knock':
      for (let i = 0; i < 3; i++) noise(c, t + i * 0.32, 0.09, 0.5, 180, 2);
      break;
    case 'bell':
      tone(c, 'sine', 660, t, 2.4, 0.18);
      tone(c, 'sine', 1320, t, 1.4, 0.06);
      tone(c, 'sine', 1980, t, 0.8, 0.03);
      break;
    case 'glitch':
      for (let i = 0; i < 6; i++) tone(c, 'square', 300 + ((i * 377) % 900), t + i * 0.05, 0.04, 0.05);
      break;
    case 'siren':
      tone(c, 'sine', 520, t, 0.9, 0.08, 820);
      tone(c, 'sine', 820, t + 0.9, 0.9, 0.08, 520);
      break;
    case 'heartbeat':
      for (let i = 0; i < 2; i++) {
        tone(c, 'sine', 62, t + i * 0.8, 0.18, 0.4, 40);
        tone(c, 'sine', 58, t + i * 0.8 + 0.22, 0.16, 0.3, 38);
      }
      break;
    case 'chime':
      tone(c, 'triangle', 988, t, 0.25, 0.1);
      tone(c, 'triangle', 1319, t + 0.14, 0.35, 0.1);
      break;
    case 'tide':
      noise(c, t, 2.6, 0.18, 400, 0.6);
      break;
  }
}

export const CUE_CAPTION: Record<SoundCue, string> = {
  silence: '모든 소리가 사라진다.',
  knock: '문을 두드리는 소리.',
  bell: '맑은 종소리가 길게 울린다.',
  glitch: '전자음이 반 박자씩 어긋난다.',
  siren: '멀리서 사이렌이 오르내린다.',
  heartbeat: '심장 박동이 크게 들린다.',
  chime: '휴대폰 알림음.',
  tide: '파도가 밀려왔다 물러간다.',
};
