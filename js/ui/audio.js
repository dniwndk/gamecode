// WebAudio 합성 효과음. 외부 음원 없이 톱니·종·증기·도장 소리를 만든다. 첫 입력 이후에만 켜진다.
export class Sfx {
  constructor() { this.ctx = null; this.vol = 0.5; this.enabled = true; this.noiseBuf = null; }
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.vol;
    this.master.connect(this.ctx.destination);
    const len = this.ctx.sampleRate;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  setVolume(v) { this.vol = v; if (this.master) this.master.gain.value = v; }
  ok() { return this.enabled && this.ctx && this.ctx.state === 'running' && this.vol > 0; }

  tone(freq, dur, { type = 'sine', gain = .2, at = 0, attack = .004, slide = 0 } = {}) {
    const c = this.ctx, t = c.currentTime + at;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + dur + .05);
  }
  noise(dur, { freq = 1200, q = 1, gain = .15, at = 0, type = 'bandpass', attack = .005 } = {}) {
    const c = this.ctx, t = c.currentTime + at;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(f).connect(g).connect(this.master); s.start(t, Math.random() * .5); s.stop(t + dur + .05);
  }

  play(name) {
    if (!this.ok()) return;
    try {
      switch (name) {
        case 'click': this.tone(1800, .05, { type: 'triangle', gain: .08 }); this.noise(.04, { freq: 3500, q: 3, gain: .08 }); break;
        case 'hover': this.tone(2400, .03, { type: 'sine', gain: .025 }); break;
        case 'select': this.tone(660, .12, { type: 'triangle', gain: .1 }); this.tone(990, .16, { type: 'sine', gain: .06, at: .05 }); break;
        case 'gear': for (let i = 0; i < 4; i++) this.noise(.03, { freq: 2600 - i * 200, q: 6, gain: .09, at: i * .045 }); break;
        case 'shutter': this.noise(.32, { freq: 700, q: .8, gain: .12, attack: .03 }); this.tone(120, .3, { type: 'sawtooth', gain: .03, slide: .6 }); break;
        case 'bell': [523, 1046, 1568].forEach((f, i) => this.tone(f, 1.6 - i * .4, { gain: .12 / (i + 1), attack: .002 })); break;
        case 'event': this.tone(196, 1.2, { type: 'sine', gain: .14 }); this.tone(294, 1.1, { type: 'sine', gain: .08, at: .08 }); this.noise(.8, { freq: 400, q: .6, gain: .05, attack: .2 }); break;
        case 'stamp': this.noise(.12, { freq: 220, q: .7, gain: .3, type: 'lowpass' }); this.tone(90, .15, { gain: .2, slide: .5 }); break;
        case 'fail': this.tone(220, .35, { type: 'sawtooth', gain: .05, slide: .7 }); this.noise(.2, { freq: 300, q: .7, gain: .12, type: 'lowpass' }); break;
        case 'coin': this.tone(1320, .08, { type: 'square', gain: .04 }); this.tone(1760, .2, { type: 'triangle', gain: .06, at: .06 }); break;
        case 'page': this.noise(.22, { freq: 2400, q: .5, gain: .07, attack: .05 }); break;
        case 'steam': this.noise(.9, { freq: 5000, q: .4, gain: .06, attack: .1, type: 'highpass' }); break;
        case 'season': this.tone(392, .5, { type: 'sine', gain: .06 }); this.noise(.06, { freq: 3000, q: 4, gain: .05 }); break;
        case 'achieve': [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, .5, { type: 'triangle', gain: .07, at: i * .08 })); break;
        case 'ledger': this.noise(.05, { freq: 1800, q: 2, gain: .06 }); this.tone(880, .08, { type: 'triangle', gain: .05, at: .03 }); break;
      }
    } catch { /* 오디오 장치 오류는 무시한다 */ }
  }
}
