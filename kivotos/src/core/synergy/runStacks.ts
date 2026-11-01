// 전투를 넘어 런 동안 쌓이는 시너지 스택(docs/GDD_v2.3_amendment.md 5장 V.170·V.199 「빠밤! 레벨업」·「이름 없는 신들의 왕녀」,
// 보충수업부·디저트부, 고유 「조금만 쉬고 싶어」·「골드 카드」). 전투 정산 때 다음 상태를 계산하는 순수 함수와,
// 시너지 툴팁에 "지금까지 얼마나 쌓였는지"를 보여 줄 표시 줄을 만든다. 전투 안에서만 쌓이고 끝나는 스택(총폭격 누적, 방주 단계 등)은 여기 없다.
import type { ContentPack } from '../types/content';

export const LEVEL_UP_SYN = 'syn_unique_level_up';
export const PRINCESS_SYN = 'syn_unique_nameless_princess';
/** 무장 아리스 고유(v2.4.8). 「이름 없는 신들의 왕녀」와 같이 레벨 10까지 이어 쌓는다 */
export const ARMED_HERO_SYN = 'syn_unique_armed_hero';
export const MAKE_UP_SYN = 'syn_make_up';
export const SWEETS_SYN = 'syn_sweets';
export const HEAD_PREFECT_SYN = 'syn_unique_head_prefect';
export const GOLD_CARD_SYN = 'syn_unique_gold_card';

/** 런에 쌓이는 시너지 스택. 학생 개체가 아니라 런에 붙어서 팔거나 합성해도 남는다. */
export interface RunStacks {
  /** 「빠밤! 레벨업」 경험치(AL-1S 각성 뒤에도 이어서 셈) */
  levelUpExp: number;
  /** 보충수업부 "보충수업" 중첩(0~4) */
  makeUp: number;
  /** 「조금만 쉬고 싶어」 "업무량"(0~5) */
  workload: number;
  /** 대기석에서 한 라운드 쉬어서 다음 출전 전투를 에너지 100으로 시작 */
  rested: boolean;
  /** 디저트부: 승리해서 다음 전투 시작 시 회복 예정 */
  dessertPending: boolean;
  /** 「골드 카드」: 다음 준비 단계 첫 새로고침 무료 */
  goldCardReroll: boolean;
  /** 세리카 「아르바이트 수당」: 세리카가 출전해 이긴 전투 수(ATK +2%씩, 최대 +30%). 예전 저장에는 없다 */
  serikaWins?: number;
}

export const emptyRunStacks = (): RunStacks => ({ levelUpExp: 0, makeUp: 0, workload: 0, rested: false, dessertPending: false, goldCardReroll: false, serikaWins: 0 });

/** AL-1S 각성 필요 경험치(v2.3 9장 표, v2.3.9에서 30 → 15). 툴팁 표시용. 판정은 유닛 awakening.expRequired */
export const AWAKEN_EXP = 15;

export const LEVEL_UP = { expPerLevel: 5, maxLevel: 6, awakenedMaxLevel: 10, atkBpsPerLevel: 500, killExp: 1, eliteBossKillExp: 3, winExp: 1 } as const;
export const MAKE_UP = { max: 4, atkBpsPerStack: 800, goldPerStack: [1, 2] } as const;
export const WORKLOAD = { max: 5, atkBpsPerStack: 600 } as const;

/** awakened: AL-1S(레벨 10까지), 'unlimited': 무장 아리스(v2.4.10, 상한 없음) */
export const levelUpLevel = (exp: number, awakened: boolean | 'unlimited') => {
  const lv = Math.floor(exp / LEVEL_UP.expPerLevel);
  return awakened === 'unlimited' ? lv : Math.min(awakened ? LEVEL_UP.awakenedMaxLevel : LEVEL_UP.maxLevel, lv);
};

/** 한 전투에서 정산에 필요한 사실 */
export interface BattleStackInput {
  outcome: 'win' | 'loss';
  /** 이번 전투에 출전한 학생(전방+후방) */
  deployedUnitIds: readonly string[];
  /** 대기석까지 포함해 보유한 학생 */
  ownedUnitIds: readonly string[];
  /** 전투 시점에 켜져 있던 시너지와 단계 index */
  activeTiers: Readonly<Record<string, number>>;
  /** 아리스·AL-1S·무장 아리스가 처치한 적. eliteOrBoss면 경험치 3 */
  levelUpKills: readonly { eliteOrBoss: boolean }[];
}

export interface StackSettlement {
  next: RunStacks;
  income: { label: string; value: number }[];
}

const owner = (pack: ContentPack, synergyId: string) => pack.synergies.find((s) => s.id === synergyId)?.memberIds[0] ?? null;

export function settleRunStacks(pack: ContentPack, prev: RunStacks, b: BattleStackInput): StackSettlement {
  const next = { ...prev };
  const income: { label: string; value: number }[] = [];
  const on = (id: string) => b.activeTiers[id] !== undefined;

  // 빠밤! 레벨업 / 이름 없는 신들의 왕녀: 처치 1(정예·보스 3) + 출전 전투 승리 1
  if (on(LEVEL_UP_SYN) || on(PRINCESS_SYN) || on(ARMED_HERO_SYN)) {
    next.levelUpExp += b.levelUpKills.reduce((a, k) => a + (k.eliteOrBoss ? LEVEL_UP.eliteBossKillExp : LEVEL_UP.killExp), 0);
    if (b.outcome === 'win') next.levelUpExp += LEVEL_UP.winExp;
  }

  // 보충수업부: 패배마다 1중첩(최대 4), 승리하면 중첩 수(4단계는 2배)만큼 골드 받고 초기화
  if (on(MAKE_UP_SYN)) {
    if (b.outcome === 'loss') next.makeUp = Math.min(MAKE_UP.max, prev.makeUp + 1);
    else if (prev.makeUp > 0) {
      income.push({ label: `보충수업부 · 합격 (${prev.makeUp}중첩)`, value: prev.makeUp * MAKE_UP.goldPerStack[Math.min(1, b.activeTiers[MAKE_UP_SYN])] });
      next.makeUp = 0;
    }
  }

  // 디저트부: 이번 전투에서 이기면 다음 전투 시작 시 회복(이번 예약은 이번 전투 시작에 썼다)
  next.dessertPending = on(SWEETS_SYN) && b.outcome === 'win';

  // 조금만 쉬고 싶어: 연속 출전마다 업무량 +1, 보유하고 출전하지 않으면 업무량이 사라지고 다음 출전은 에너지 100
  const hina = owner(pack, HEAD_PREFECT_SYN);
  if (hina && b.deployedUnitIds.includes(hina)) { next.workload = Math.min(WORKLOAD.max, prev.workload + 1); next.rested = false; }
  else if (hina && b.ownedUnitIds.includes(hina)) { next.workload = 0; next.rested = true; }

  // 세리카 「아르바이트 수당」: 출전해서 이긴 전투마다 +1(15번에서 +30%로 멈춤)
  if (b.outcome === 'win' && b.deployedUnitIds.includes('u_serika')) next.serikaWins = Math.min(15, (prev.serikaWins ?? 0) + 1);

  // 골드 카드: 노노미가 출전한 전투가 끝나면 다음 준비 단계 첫 새로고침 무료
  if (on(GOLD_CARD_SYN)) next.goldCardReroll = true;

  return { next, income };
}

/** 전투 시작 시 스택이 주는 보정: 학생별 ATK 증가(bps)와 에너지 100으로 시작하는 학생 */
export function stackBattleBonuses(pack: ContentPack, s: RunStacks, activeTiers: Readonly<Record<string, number>>): { atkBpsByUnit: Record<string, number>; fullEnergy: string[] } {
  const atk: Record<string, number> = {};
  const add = (id: string | null, bps: number) => { if (id && bps) atk[id] = (atk[id] ?? 0) + bps; };
  const on = (id: string) => activeTiers[id] !== undefined;
  if (on(LEVEL_UP_SYN)) add(owner(pack, LEVEL_UP_SYN), levelUpLevel(s.levelUpExp, false) * LEVEL_UP.atkBpsPerLevel);
  if (on(PRINCESS_SYN)) add(owner(pack, PRINCESS_SYN), levelUpLevel(s.levelUpExp, true) * LEVEL_UP.atkBpsPerLevel);
  if (on(ARMED_HERO_SYN)) add(owner(pack, ARMED_HERO_SYN), levelUpLevel(s.levelUpExp, 'unlimited') * LEVEL_UP.atkBpsPerLevel);
  if (on(MAKE_UP_SYN)) for (const id of pack.synergies.find((x) => x.id === MAKE_UP_SYN)!.memberIds) add(id, s.makeUp * MAKE_UP.atkBpsPerStack);
  const hina = owner(pack, HEAD_PREFECT_SYN);
  if (on(HEAD_PREFECT_SYN)) add(hina, s.workload * WORKLOAD.atkBpsPerStack);
  return { atkBpsByUnit: atk, fullEnergy: on(HEAD_PREFECT_SYN) && s.rested && hina ? [hina] : [] };
}

/** 시너지 툴팁의 "지금 쌓인 스택" 줄. 런 스택이 없는 시너지는 null */
export interface StackLine { label: string; value: string; progress: { current: number; max: number } | null; note: string | null }

export function runStackLines(s: RunStacks, synergyId: string, awakened: boolean): StackLine[] | null {
  switch (synergyId) {
    case LEVEL_UP_SYN:
    case PRINCESS_SYN:
    case ARMED_HERO_SYN: {
      const princess = synergyId !== LEVEL_UP_SYN || awakened;
      const unlimited = synergyId === ARMED_HERO_SYN;
      const max = unlimited ? Infinity : princess ? LEVEL_UP.awakenedMaxLevel : LEVEL_UP.maxLevel;
      const lv = levelUpLevel(s.levelUpExp, unlimited ? 'unlimited' : princess);
      const toNext = lv >= max ? null : (lv + 1) * LEVEL_UP.expPerLevel - s.levelUpExp;
      const lines: StackLine[] = [
        unlimited
          ? { label: '레벨', value: `Lv.${lv} (상한 없음) · ATK +${(lv * LEVEL_UP.atkBpsPerLevel) / 100}%`, progress: null, note: null }
          : { label: '레벨', value: `Lv.${lv} / ${max} · ATK +${(lv * LEVEL_UP.atkBpsPerLevel) / 100}%`, progress: { current: lv, max }, note: null },
        { label: '경험치', value: String(s.levelUpExp), progress: null, note: toNext === null ? '최고 레벨' : `다음 레벨까지 ${toNext}` },
      ];
      if (!princess) lines.push({ label: '각성', value: `${Math.min(s.levelUpExp, AWAKEN_EXP)} / ${AWAKEN_EXP}`, progress: { current: Math.min(s.levelUpExp, AWAKEN_EXP), max: AWAKEN_EXP }, note: `경험치 ${AWAKEN_EXP} + 3성 아리스면 AL-1S (그 전에 케이를 보유하면 무장 아리스)` });
      return lines;
    }
    case MAKE_UP_SYN:
      return [{ label: '보충수업', value: `${s.makeUp} / ${MAKE_UP.max}중첩 · ATK +${(s.makeUp * MAKE_UP.atkBpsPerStack) / 100}%`, progress: { current: s.makeUp, max: MAKE_UP.max }, note: s.makeUp ? `다음 승리 때 합격 골드 ${s.makeUp}G (4단계 ${s.makeUp * 2}G)` : '패배할 때마다 1중첩' }];
    case HEAD_PREFECT_SYN:
      return [{ label: '업무량', value: `${s.workload} / ${WORKLOAD.max} · ATK +${(s.workload * WORKLOAD.atkBpsPerStack) / 100}%`, progress: { current: s.workload, max: WORKLOAD.max }, note: s.rested ? '푹 쉬었어요: 다음 출전은 에너지 100으로 시작' : '대기석에서 한 라운드 쉬면 초기화 + 에너지 100' }];
    case SWEETS_SYN:
      return [{ label: '디저트 타임', value: s.dessertPending ? '준비됨' : '대기', progress: null, note: s.dessertPending ? '다음 전투 시작 시 아군 전원 최대 HP 10% 회복' : '승리하면 다음 전투에 준비돼요' }];
    case GOLD_CARD_SYN:
      return [{ label: '골드 카드', value: s.goldCardReroll ? '무료 새로고침 1회' : '없음', progress: null, note: '노노미가 출전한 전투가 끝나면 다음 상점 첫 새로고침 무료' }];
    default:
      return null;
  }
}
