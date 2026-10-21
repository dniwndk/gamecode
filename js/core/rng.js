// 결정론적 난수. 시드 하나에서 흐름(출생·도시·사건·판정·행운)을 분리해 서로 소비량에 영향을 주지 않게 한다.
// 연출 코드는 이 모듈을 쓰지 않는다.

export const STREAMS = ['birth', 'city', 'event', 'check', 'fortune'];

function cyrb128(str) {
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
  for (let i = 0; i < str.length; i++) {
    const k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4; h2 ^= h1; h3 ^= h1; h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

// sfc32: 상태 4개의 32비트 정수. 저장/복원이 쉽다.
function sfc32Next(s) {
  let [a, b, c, d] = s;
  a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
  let t = (a + b) | 0;
  a = b ^ (b >>> 9);
  b = (c + (c << 3)) | 0;
  c = (c << 21) | (c >>> 11);
  d = (d + 1) | 0;
  t = (t + d) | 0;
  c = (c + t) | 0;
  s[0] = a >>> 0; s[1] = b >>> 0; s[2] = c >>> 0; s[3] = d >>> 0;
  return t >>> 0;
}

export class Rng {
  constructor(state) { this.s = state.slice(); }
  u32() { return sfc32Next(this.s); }
  float() { return this.u32() / 4294967296; }
  // 0..n-1 균등 정수, 거부 표본으로 편향 제거
  int(n) {
    if (n <= 0) return 0;
    const limit = 4294967296 - (4294967296 % n);
    let x;
    do { x = this.u32(); } while (x >= limit);
    return x % n;
  }
  range(lo, hi) { return lo + this.int(hi - lo + 1); }
  // 백분율(0~100, 소수 허용) 성공 여부. 정수 만분율로 판정한다.
  pct(p) { return this.int(10000) < Math.round(p * 100); }
  pick(arr) { return arr[this.int(arr.length)]; }
  // [[값, 정수 가중치], ...] 정수 가중 추첨
  weighted(pairs) {
    let total = 0;
    for (const [, w] of pairs) total += w;
    if (total <= 0) return pairs.length ? pairs[0][0] : undefined;
    let r = this.int(total);
    for (const [v, w] of pairs) { if (r < w) return v; r -= w; }
    return pairs[pairs.length - 1][0];
  }
  shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = this.int(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  dump() { return this.s.slice(); }
}

const HEX = '0123456789ABCDEF';

// 128비트 시드를 사람이 복사하기 쉬운 문자열로: XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX
export function formatSeed(words) {
  let hex = '';
  for (const w of words) hex += (w >>> 0).toString(16).toUpperCase().padStart(8, '0');
  return hex.match(/.{4}/g).join('-');
}

export function normalizeSeed(str) {
  const clean = String(str || '').toUpperCase().replace(/[^0-9A-F]/g, '');
  if (clean.length === 32) return clean.match(/.{4}/g).join('-');
  // 임의 문자열 시드도 허용: 해시해서 128비트로
  return formatSeed(cyrb128('seed:' + String(str)));
}

// 시드 문자열이 없을 때 새로 만든다. 연출용이 아니라 새 삶 생성 시 한 번만 호출.
export function freshSeed(entropy) {
  const src = entropy ?? `${Date.now()}:${Math.random()}:${Math.random()}`;
  return formatSeed(cyrb128('fresh:' + src));
}

export function createStreams(seed) {
  const norm = normalizeSeed(seed);
  const out = {};
  for (const name of STREAMS) {
    const st = cyrb128(norm + '/' + name);
    if (st.every(v => v === 0)) st[0] = 1;
    const r = new Rng(st);
    for (let i = 0; i < 12; i++) r.u32(); // 워밍업
    out[name] = r.dump();
  }
  return out;
}

// 상태 객체 안의 흐름 상태로 Rng를 열고, 사용 후 다시 저장한다.
export function withRng(state, name, fn) {
  const r = new Rng(state.rng[name]);
  const res = fn(r);
  state.rng[name] = r.dump();
  return res;
}
