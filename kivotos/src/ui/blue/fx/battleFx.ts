// 전투 연출의 「강약 예산」. 이벤트 하나가 화면에서 얼마나 세게 보일지(숫자 크기·멈춤·흔들림)를 정하는 순수 함수 모음.
// DOM이 없어 단위 테스트로 고정한다. 결과·난수와 무관하고, 전투 화면(screens/battle.ts)만 쓴다.
//
// 원칙: 일반 타격 < 치명 < 필살기·처치 < 연쇄·플래티넘. 전부 세면 아무것도 세지 않으므로 작은 피해는 일부러 작고 흐리게.

/** 0 가벼움 · 1 보통 · 2 묵직 · 3 폭발 */
export type Impact = 0 | 1 | 2 | 3;

export interface HitInfo {
  /** 체력에 들어간 피해 + 보호막이 막은 피해 */
  amount: number;
  maxHp: number;
  crit: boolean;
  /** 필살기 직후 첫 타격처럼 한 단계 올려 보여 줄 때 */
  boosted?: boolean;
}

/** 최대 체력 대비 피해 비율로 세기를 정한다. 치명·강조는 한 단계 위. */
export function impactOf(h: HitInfo): Impact {
  const ratio = h.maxHp > 0 ? h.amount / h.maxHp : 0;
  let lv = ratio >= 0.35 ? 3 : ratio >= 0.15 ? 2 : ratio >= 0.05 ? 1 : 0;
  if (h.crit) lv += 1;
  if (h.boosted) lv += 1;
  return Math.min(3, lv) as Impact;
}

/** 피해 숫자 글자 크기(px, 1920 무대 기준). 22px(긁힘) ~ 66px(한 방) */
export function floatSize(h: HitInfo): number {
  const ratio = h.maxHp > 0 ? h.amount / h.maxHp : 0;
  const base = 22 + 40 * Math.sqrt(Math.min(1, ratio / 0.4));
  return Math.round(Math.min(66, base * (h.crit ? 1.15 : 1)));
}

export type StopKind = 'hit' | 'down' | 'bossDown' | 'cutinFollow' | 'lastKill';

/** 히트스톱(화면 정지) 길이. 1배속 기준이고 배속으로 나눠 쓴다. 가벼운 타격은 멈추지 않는다. */
export function hitstopMs(impact: Impact, kind: StopKind = 'hit'): number {
  const byImpact = [0, 0, 55, 100][impact];
  switch (kind) {
    case 'hit': return byImpact;
    case 'down': return Math.max(byImpact, 80);
    case 'bossDown': return 220;
    case 'cutinFollow': return Math.max(byImpact, 140);
    case 'lastKill': return 260;
  }
}

/** 방향성 흔들림 진폭(px). 설정 문구의 상한(8px)을 넘지 않는다 */
export function shakePx(impact: Impact): number {
  return [0, 0, 4, 8][impact];
}

/**
 * 한 행동 안에서 이어진 발동 수. 코어가 chain을 주면 그 값을, 아니면 직접 센다.
 * 행동(action)이 바뀌면 0으로 돌아간다.
 */
export class ChainCounter {
  private n = 0;
  onAction(): void { this.n = 0; }
  onProc(chain?: number): number {
    this.n = chain && chain > this.n ? chain : this.n + 1;
    return this.n;
  }
  get value(): number { return this.n; }
}

/**
 * 필살기 연속 판정. 같은 편의 필살기가 사이에 다른 행동 2번 이하로 이어지면 EX 연쇄로 센다.
 * 두 번째부터는 컷인을 짧게 하고 「EX CHAIN ×N」을 쌓는다.
 */
export class ExChain {
  private actionNo = 0;
  private last: { side: string; no: number; n: number } | null = null;
  onAction(side: string, kind: string): number {
    this.actionNo++;
    if (kind !== 'ultimate') return 0;
    const n = this.last && this.last.side === side && this.actionNo - this.last.no <= 3 ? this.last.n + 1 : 1;
    this.last = { side, no: this.actionNo, n };
    return n;
  }
}

/** 컷인 길이(ms). EX 연쇄 두 번째부터 점점 짧게 — 느려지지 않고 빨라지는 느낌 */
export function cutinMs(exChain: number): number {
  if (exChain <= 1) return 1200;
  return Math.max(520, 1200 - 260 * (exChain - 1));
}

/** 격화 열기(0~1). 화면 가장자리 붉은 맥동의 세기 */
export function escalationHeat(damageBps: number): number {
  return Math.max(0, Math.min(1, damageBps / 10000));
}

export interface SynergyLike { synergyId: string; activeTier: number | null; count: number }
export interface SynergyTierInfo { grade: 'normal' | 'platinum' | string; tierCount: number }

/**
 * 전투 시작 선언에 띄울 시너지: 켜진 것만, 플래티넘 → 최고 단계 도달 → 높은 단계 → 인원 순.
 * 첫 번째가 주인공이고, 나머지는 옆에 작은 아이콘으로 선다.
 */
export function rankActiveSynergies<T extends SynergyLike>(list: readonly T[], info: (id: string, tier: number) => SynergyTierInfo | null): T[] {
  const score = (s: T) => {
    const i = info(s.synergyId, s.activeTier!);
    if (!i) return -1;
    const plat = i.grade === 'platinum' ? 1000 : 0;
    // 단계가 하나뿐인 고유 시너지는 「최고 단계」 가산을 받지 않는다(여러 단계를 끝까지 올린 쪽이 주인공)
    const maxed = i.tierCount >= 2 && s.activeTier === i.tierCount - 1 ? 100 : 0;
    return plat + maxed + s.activeTier! * 10 + s.count;
  };
  return list.filter((s) => s.activeTier !== null).sort((a, b) => score(b) - score(a));
}
