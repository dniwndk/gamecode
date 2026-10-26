// Mulberry32 시드 난수. 상태가 RunState.rng 안에 있어 저장·복구 후에도 같은 시드·같은 선택은 같은 삶을 만든다.
import type { RngStreams } from './types';

export type StreamName = 'birth' | 'world' | 'action';

/** 문자열 시드를 32비트 정수로 (cyrb53 앞부분) */
export function hashSeed(seed: string, salt: number): number {
  let h1 = 0xdeadbeef ^ salt;
  let h2 = 0x41c6ce57 ^ salt;
  for (let i = 0; i < seed.length; i++) {
    const ch = seed.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  return h1 >>> 0;
}

export function createStreams(seed: string): RngStreams {
  return {
    algorithm_version: 'mulberry32_v1',
    birth_state: hashSeed(seed, 1),
    world_state: hashSeed(seed, 2),
    action_state: hashSeed(seed, 3),
  };
}

function key(stream: StreamName): 'birth_state' | 'world_state' | 'action_state' {
  return stream === 'birth' ? 'birth_state' : stream === 'world' ? 'world_state' : 'action_state';
}

/** [0, 1) 난수 하나를 뽑고 스트림 상태를 앞으로 민다 */
export function next(rng: RngStreams, stream: StreamName): number {
  const k = key(stream);
  let a = (rng[k] + 0x6d2b79f5) >>> 0;
  rng[k] = a;
  let t = a;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function chance(rng: RngStreams, stream: StreamName, p: number): boolean {
  return next(rng, stream) < p;
}

export function int(rng: RngStreams, stream: StreamName, min: number, max: number): number {
  return min + Math.floor(next(rng, stream) * (max - min + 1));
}

export function pick<T>(rng: RngStreams, stream: StreamName, items: readonly T[]): T {
  return items[Math.floor(next(rng, stream) * items.length)];
}

export function weighted<T>(rng: RngStreams, stream: StreamName, items: readonly T[], weightOf: (t: T) => number): T | null {
  let total = 0;
  for (const it of items) total += Math.max(0, weightOf(it));
  if (total <= 0) return null;
  let r = next(rng, stream) * total;
  for (const it of items) {
    r -= Math.max(0, weightOf(it));
    if (r < 0) return it;
  }
  return items[items.length - 1];
}

export function randomSeed(): string {
  const words = ['안개', '등불', '소금', '문턱', '회수권', '붉은실', '뱃고동', '먹물', '방파제', '번호표', '분필', '국화'];
  const w = words[Math.floor(Math.random() * words.length)];
  const n = Math.floor(Math.random() * 9000 + 1000);
  return `${w}-${n}`;
}
