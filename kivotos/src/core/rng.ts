// 결정적 난수(GDD v2.1 12.2). xorshift32, 스트림마다 독립 상태.
// 상태는 숫자 하나라 저장 봉투에 그대로 넣고 다시 이어서 뽑을 수 있다.

export type RngStream = 'setup' | 'shop' | 'reward' | 'battle' | 'initiative';

/** 0 시드 대체 상수(12.2). rules.json의 rng.zeroSeedReplacement와 같다. */
export const ZERO_SEED_REPLACEMENT = 0x6d2b79f5;

function utf8(text: string): number[] {
  const out: number[] = [];
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    if (cp < 0x80) out.push(cp);
    else if (cp < 0x800) out.push(0xc0 | (cp >> 6), 0x80 | (cp & 63));
    else if (cp < 0x10000) out.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
    else out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 63), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
  }
  return out;
}

export function fnv1a32(text: string): number {
  let h = 0x811c9dc5;
  for (const b of utf8(text)) {
    h ^= b;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** 사용자 시드와 스트림 이름을 `:`로 이은 문자열의 FNV-1a32(12.2) */
export function streamSeed(seed: string, stream: RngStream): number {
  return fnv1a32(`${seed}:${stream}`);
}

export class Rng {
  private s: number;

  constructor(state: number) {
    const u = state >>> 0;
    this.s = u === 0 ? ZERO_SEED_REPLACEMENT : u;
  }

  static forStream(seed: string, stream: RngStream): Rng {
    return new Rng(streamSeed(seed, stream));
  }

  /** 저장용 현재 상태 */
  get state(): number {
    return this.s;
  }

  /** 1~4294967295 */
  nextU32(): number {
    let x = this.s;
    x ^= x << 13;
    x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5;
    this.s = x >>> 0;
    return this.s;
  }

  /** 0 ≤ r < n 균등 정수. rejection sampling(12.2). */
  nextInt(n: number): number {
    if (!Number.isInteger(n) || n < 1) throw new RangeError(`nextInt: 후보 수 ${n}`);
    const limit = Math.floor(4294967295 / n) * n;
    for (;;) {
      const r = this.nextU32() - 1;
      if (r < limit) return r % n;
    }
  }

  /** 0~9999 균등 정수를 뽑아 roll < chanceBps */
  chance(chanceBps: number): boolean {
    return this.nextInt(10000) < chanceBps;
  }

  /** 정수 가중치 목록에서 하나의 인덱스. 가중치 0은 뽑히지 않는다. */
  weightedIndex(weights: readonly number[]): number {
    const total = weights.reduce((a, b) => a + b, 0);
    if (!(total > 0) || weights.some((w) => !Number.isInteger(w) || w < 0)) throw new RangeError('weightedIndex: 가중치는 0 이상 정수, 합은 양수');
    let r = this.nextInt(total);
    for (let i = 0; i < weights.length; i++) {
      if (r < weights[i]) return i;
      r -= weights[i];
    }
    throw new Error('weightedIndex: 도달 불가');
  }
}
