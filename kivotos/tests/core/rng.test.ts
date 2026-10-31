// GDD v2.1 12.2 RNG 골든 테스트
import { describe, expect, it } from 'vitest';
import { Rng, ZERO_SEED_REPLACEMENT, fnv1a32, streamSeed } from '../../src/core/rng';

describe('xorshift32 (12.2)', () => {
  it('상태 1에서 연속 출력 270369, 67634689, 2647435461', () => {
    const r = new Rng(1);
    expect([r.nextU32(), r.nextU32(), r.nextU32()]).toEqual([270369, 67634689, 2647435461]);
  });

  it('0 시드는 대체 상수로 바꾼다', () => {
    expect(new Rng(0).state).toBe(ZERO_SEED_REPLACEMENT);
  });

  it('FNV-1a32: 빈 문자열·"a"·한글', () => {
    expect(fnv1a32('')).toBe(0x811c9dc5);
    expect(fnv1a32('a')).toBe(0xe40c292c);
    expect(fnv1a32('키')).toBe(fnv1a32('\u{d0a4}'));
    expect(streamSeed('seed', 'reward')).toBe(fnv1a32('seed:reward'));
    expect(streamSeed('seed', 'reward')).not.toBe(streamSeed('seed', 'shop'));
  });

  it('nextInt는 범위 안, 같은 상태면 같은 결과', () => {
    const a = new Rng(12345);
    const b = new Rng(12345);
    for (let i = 0; i < 1000; i++) {
      const x = a.nextInt(7);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(7);
      expect(b.nextInt(7)).toBe(x);
    }
    expect(() => a.nextInt(0)).toThrow();
  });

  it('weightedIndex는 가중치 0을 뽑지 않고, 비율을 따른다', () => {
    const r = new Rng(99);
    const hits = [0, 0, 0];
    for (let i = 0; i < 30000; i++) hits[r.weightedIndex([1, 0, 2])]++;
    expect(hits[1]).toBe(0);
    expect(hits[2] / hits[0]).toBeGreaterThan(1.8);
    expect(hits[2] / hits[0]).toBeLessThan(2.2);
  });
});
