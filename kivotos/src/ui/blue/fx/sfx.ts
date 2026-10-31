// 효과음. 사용자 제공 효과음 파일(public/audio/sfx, 2026-10-31)을 WebAudio로 재생하고,
// 파일이 아직 안 읽혔거나 없으면 같은 이름의 합성음(발진기·잡음)으로 대신한다.
// 화면 쪽은 옛 이름(play('hit', …))이나 파일 ID(play('UI_CLICK'))로 부른다. 게임 결과와 무관하다.
// 볼륨 0이면 오디오 장치를 아예 열지 않는다.
import { SFX_BANK } from './sfxBank';

/** 화면 연출이 부르는 옛 이름. 파일 ID로 옮겨 재생한다(routeSfx) */
export type SfxLegacy =
  | 'hit' | 'crit' | 'ult' | 'cutin' | 'down' | 'shieldBreak' | 'heal' | 'shield'
  | 'proc' | 'chain' | 'escalation' | 'synergy' | 'victory' | 'defeat';
/** 옛 이름 또는 효과음 묶음의 ID(예: 'UI_CLICK', 'SHOP_BUY') */
export type SfxName = SfxLegacy | (string & {});

export interface SfxOpts {
  /** 0~3 세기(가벼움·보통·묵직·폭발) */
  power?: number;
  /** 연쇄 단계. 높을수록 음이 올라간다 */
  step?: number;
  /** 쏜 쪽이 적이면 true. 적 총성을 쓴다 */
  foe?: boolean;
  /** 보호막이 받은 탄. 몸통 피격음 대신 보호막 「팅」 */
  shielded?: boolean;
  /** down: 누가 쓰러졌나 */
  who?: 'ally' | 'enemy' | 'boss';
  /** synergy: 플래티넘 */
  plat?: boolean;
  /** proc: 희귀·전설 오파츠·플래티넘 */
  rare?: boolean;
  /** cutin: EX 연쇄 두 번째부터 짧은 컷인 */
  short?: boolean;
}

export interface Sfx {
  play(name: SfxName, o?: SfxOpts): void;
  setVolume(v: number): void;
}

/** 재생할 파일 하나: ID, 지연(ms), 볼륨 배율 */
export type SfxShot = [id: string, delayMs: number, gain: number];

const pick = <T>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];

/**
 * 옛 이름 + 옵션 → 재생할 파일 ID 목록. 순수 함수라 테스트로 고정한다.
 * 타격은 「총성 → 35ms 뒤 착탄음」 두 겹. 학생별 무기 데이터가 생기면 GUN_* 선택을 무기 기준으로 바꾼다.
 */
export function routeSfx(name: SfxName, o: SfxOpts = {}): SfxShot[] {
  const p = Math.max(0, Math.min(3, Math.round(o.power ?? 1)));
  switch (name) {
    case 'hit': {
      const gun = o.foe ? 'GUN_FOE' : pick([['GUN_HG', 'GUN_SMG'], ['GUN_AR', 'GUN_SMG'], ['GUN_SG', 'GUN_MG'], ['GUN_SG', 'GUN_RG']][p]);
      const target = o.foe; // 적이 쐈으면 맞은 쪽은 아군 학생
      const impact = o.shielded ? 'HIT_SHIELD' : !target && p <= 1 ? 'HIT_ROBOT' : (['HIT_BODY_L', 'HIT_BODY_M', 'HIT_BODY_H', 'HIT_BODY_H'] as const)[p];
      const out: SfxShot[] = [[gun, 0, p === 0 ? 0.75 : 1], [impact, 35, 1]];
      if (p >= 3) out.push(['EXPL_SMALL', 60, 0.7]);
      return out;
    }
    case 'crit': return [[o.foe ? 'GUN_FOE' : 'GUN_SR', 0, 1], [o.shielded ? 'HIT_SHIELD' : 'HIT_CRIT', 40, 1]];
    case 'ult': return [['ULT_HIT', 0, 1]];
    case 'cutin': return [[o.short ? 'CUTIN_SHORT' : 'CUTIN', 0, 1]];
    case 'down': return [[o.who === 'boss' ? 'KO_BOSS' : o.who === 'ally' ? 'KO_ALLY' : 'KO_ENEMY', 0, 1]];
    case 'shieldBreak': return [['SHIELD_BREAK', 0, 1]];
    case 'heal': return [['HEAL', 0, 0.8]];
    case 'shield': return [['SHIELD_UP', 0, 0.8]];
    case 'proc': return [[o.rare ? 'PROC_RARE' : 'PROC', 0, 1]];
    case 'chain': {
      const n = Math.max(1, Math.min(11, (o.step ?? 0) + 1));
      return n >= 10 ? [[`CHAIN_${String(n).padStart(2, '0')}`, 0, 1], ['CHAIN_MAX', 80, 1]] : [[`CHAIN_${String(n).padStart(2, '0')}`, 0, 1]];
    }
    case 'escalation': return [['ESCALATION', 0, 1]];
    case 'synergy': return [[o.plat ? 'SYNERGY_PLAT' : 'SYNERGY_ON', 0, 1]];
    case 'victory': return [['WIN', 0, 1]];
    case 'defeat': return [['LOSE', 0, 1]];
    // 'SHOP_LOCK:2'처럼 변주 번호를 정할 수 있다(잠금 _1 · 해제 _2, 연승 _1 · 연패 _2)
    default: return SFX_BANK[name.split(':')[0]] ? [[name, 0, 1]] : [];
  }
}

const LEGACY = new Set<string>(['hit', 'crit', 'ult', 'cutin', 'down', 'shieldBreak', 'heal', 'shield', 'proc', 'chain', 'escalation', 'synergy', 'victory', 'defeat']);

export function createSfx(volume: () => number, url: (path: string) => string = (x) => x): Sfx {
  let ac: AudioContext | null = null;
  let master: GainNode | null = null;
  let comp: DynamicsCompressorNode | null = null;
  let noiseBuf: AudioBuffer | null = null;
  const recent = new Map<string, number>();
  const buffers = new Map<string, AudioBuffer[]>();
  let loading = false;
  let active = 0;
  const MAX_ACTIVE = 12;

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
      noiseBuf = ac.createBuffer(1, ac.sampleRate * 1.2, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ac.state === 'suspended') void ac.resume();
    if (!loading) { loading = true; void loadAll(ac); }
    return ac;
  }

  // 파일 읽기: 브라우저가 Ogg Vorbis를 풀 수 있으면 ogg, 아니면 m4a(AAC). 미리보기 묶음은 window.__KIVO_SFX(data URI)를 먼저 본다
  async function loadAll(a: AudioContext) {
    const probe = typeof Audio !== 'undefined' ? new Audio() : null;
    const ext = probe && probe.canPlayType('audio/ogg; codecs="vorbis"') ? 'ogg' : 'm4a';
    const atlas = (window as unknown as { __KIVO_SFX?: Record<string, string> }).__KIVO_SFX;
    // 자주 나는 소리(UI·타격·발동)부터 읽는다
    const first = /^(UI_|GUN_(HG|SMG|AR|SG|MG|SR|FOE)|HIT_|PROC|CHAIN_0|SHOP_|UNIT_)/;
    const ids = Object.keys(SFX_BANK).sort((x, y) => Number(!first.test(x)) - Number(!first.test(y)));
    let next = 0;
    const worker = async () => {
      while (next < ids.length) {
        const id = ids[next++];
        const [n] = SFX_BANK[id];
        const list: AudioBuffer[] = [];
        for (let i = 1; i <= n; i++) {
          const file = `${id}_${i}`;
          try {
            const inline = atlas?.[`${file}.${ext}`];
            let data: ArrayBuffer;
            if (inline) {
              const bin = atob(inline.slice(inline.indexOf(',') + 1));
              const u8 = new Uint8Array(bin.length);
              for (let k = 0; k < bin.length; k++) u8[k] = bin.charCodeAt(k);
              data = u8.buffer;
            } else {
              const res = await fetch(url(`audio/sfx/${file}.${ext}`));
              if (!res.ok) continue;
              data = await res.arrayBuffer();
            }
            list.push(await a.decodeAudioData(data));
          } catch { /* 이 변주는 건너뛴다 */ }
        }
        if (list.length) buffers.set(id, list);
      }
    };
    await Promise.all(Array.from({ length: 6 }, worker));
  }

  function playFile(key: string, when: number, gain: number): boolean {
    const [id, nth] = key.split(':');
    const list = buffers.get(id);
    if (!list) return false;
    if (active >= MAX_ACTIVE) return true;
    const a = ac!;
    const src = a.createBufferSource();
    src.buffer = nth ? list[Math.min(list.length, Number(nth)) - 1] : pick(list);
    const g = a.createGain();
    g.gain.value = (SFX_BANK[id]?.[1] ?? 0.85) * gain;
    src.connect(g).connect(master!);
    active++;
    src.onended = () => { active--; };
    src.start(when);
    return true;
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
  function noise(t: number, dur: number, peak: number, filter: BiquadFilterType, f0: number, f1 = f0, q = 0.8, attack = 0.003) {
    const a = ac!;
    const s = a.createBufferSource();
    s.buffer = noiseBuf;
    const bq = a.createBiquadFilter();
    bq.type = filter; bq.Q.value = q;
    bq.frequency.setValueAtTime(f0, t);
    bq.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    const g = a.createGain();
    env(g, t, peak, attack, dur);
    s.connect(bq).connect(g).connect(master!);
    s.start(t, Math.random() * 0.2); s.stop(t + dur + 0.05);
  }
  const semis = (n: number) => Math.pow(2, n / 12);
  const jitter = () => 1 + (Math.random() - 0.5) * 0.08;

  /**
   * 총성 한 발. 세 겹으로 만든다: 총구의 날카로운 「탁」(고역 잡음, 1ms 공격) + 화약의 몸통(저역 잡음·저음 쿵)
   * + 공간 울림(중역 잡음 꼬리, 한 번 더 메아리). size 0(권총)~3(저격)이 셀수록 몸통·꼬리가 굵고 길다.
   */
  function shot(t: number, size: number, foe: boolean, gain = 1) {
    const k = jitter() * (foe ? 0.82 : 1);
    const g = gain * (0.75 + size * 0.12);
    noise(t, 0.025 + size * 0.012, 0.9 * g, 'highpass', 3800 * k, 2200 * k, 0.7, 0.001);
    noise(t, 0.07 + size * 0.05, 0.75 * g, 'lowpass', (1700 - size * 250) * k, 260, 0.9, 0.001);
    tone('sine', (150 - size * 18) * k, 42, t, 0.07 + size * 0.06, (0.45 + size * 0.15) * g, 0.001);
    noise(t + 0.012, 0.16 + size * 0.14, 0.18 * g, 'bandpass', 900 * k, 380, 0.8, 0.01);
    if (size >= 2) noise(t + 0.09 + size * 0.02, 0.22 + size * 0.1, 0.08 * g, 'bandpass', 700 * k, 300, 0.8, 0.02);
  }
  /** 탄이 맞는 소리. 몸에는 둔탁한 「퍽」, 보호막에는 금속성 「팅」 */
  function impact(t: number, power: number, shielded: boolean) {
    const k = jitter();
    if (shielded) {
      tone('triangle', 2300 * k, 2100 * k, t, 0.09, 0.12, 0.001);
      tone('sine', 3500 * k, 3300 * k, t, 0.06, 0.06, 0.001);
      noise(t, 0.03, 0.25, 'highpass', 5000, 3000, 0.7, 0.001);
      return;
    }
    noise(t, 0.05 + power * 0.02, 0.35 + power * 0.12, 'bandpass', 420 * k, 160, 1.1, 0.002);
    tone('sine', 110 * k, 50, t, 0.06 + power * 0.03, 0.25 + power * 0.1, 0.002);
  }

  function play(name: SfxName, o: SfxOpts = {}) {
    const a = ensure();
    if (!a || !master) return;
    // 한 프레임에 같은 소리가 겹치면 귀가 아프다. 25ms 안의 같은 소리는 하나로 친다(광역기 대비)
    const now = performance.now();
    if (now - (recent.get(name) ?? -1e9) < 25) return;
    recent.set(name, now);
    const t = a.currentTime + 0.005;
    const shots = routeSfx(name, o);
    if (shots.length && shots.every(([id]) => buffers.has(id.split(':')[0]))) {
      for (const [id, d, gn] of shots) playFile(id, t + d / 1000, gn);
      return;
    }
    if (!LEGACY.has(name)) return;
    synth(name as SfxLegacy, o, t);
  }

  function synth(name: SfxLegacy, o: SfxOpts, t: number) {
    const p = Math.max(0, Math.min(3, o.power ?? 1));
    const step = o.step ?? 0;
    switch (name) {
      case 'hit': {
        // 가벼움: 권총 한 발 · 보통: 소총 점사 두 발 · 묵직: 큰 소총 한 발 · 폭발: 산탄/대구경 한 발
        const foe = !!o.foe;
        if (p <= 0) shot(t, 0, foe, 0.7);
        else if (p === 1) { shot(t, 1, foe, 0.8); shot(t + 0.06, 1, foe, 0.6); }
        else shot(t, p, foe);
        impact(t + 0.035 + p * 0.01, p, !!o.shielded);
        break;
      }
      case 'crit': {
        // 치명: 저격총. 큰 총성 + 탄이 스치는 「피융」 + 묵직한 착탄
        const foe = !!o.foe;
        shot(t, 3, foe, 1.05);
        tone('sine', 2900 * jitter(), 1500, t + 0.02, 0.14, 0.07, 0.002);
        impact(t + 0.05, 3, !!o.shielded);
        break;
      }
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
