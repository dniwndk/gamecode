// 전투 엔진의 입력·출력(docs/GDD_v2.1.md 7~11장, v2.3 개정). 순수 데이터만 둔다.
// 출력 이벤트는 화면 계약(UI_CONTRACT.md의 BattleEventView)과 같은 모양이라 화면이 그대로 재생한다.

export type Side = 'ally' | 'enemy';
export type BattleZone = 'front' | 'rear';
export interface Ref { side: Side; zone: BattleZone; index: number }

export interface BattleAllyInput {
  instanceId: string;
  unitId: string;
  star: 1 | 2 | 3;
  zone: BattleZone;
  slot: number;
  equipment: string[];
}

export interface BattleEnemyInput {
  enemyId: string;
  zone: BattleZone;
  slot: number;
}

export interface BattleInput {
  /** 전투 RNG 씨앗(런 씨앗 + 노드 + 회차) */
  seed: string;
  nodeType: 'normal' | 'elite' | 'boss';
  /** 장(1~5). 장별 격화 시작 AV에 쓴다(v2.4.13). 없으면 기본 시작 AV */
  chapter?: number;
  /** 노드 배율(HP·ATK에만, A16) */
  statScaleBps: number;
  allies: BattleAllyInput[];
  enemies: BattleEnemyInput[];
  /** 켜진 시너지와 단계 index(편성 집계 결과). 이스터에그의 단계 올림·최소 단계는 엔진이 더한다 */
  activeTiers: Record<string, number>;
  strategies: string[];
  ooparts: string[];
  /** 런 스택(레벨업·보충수업·업무량)의 학생별 ATK bps */
  runAtkBpsByUnit?: Record<string, number>;
  /** 에너지 100으로 시작하는 학생(조금만 쉬고 싶어) */
  fullEnergyUnitIds?: string[];
  /** 디저트 타임 예약(지난 전투 승리) */
  dessert?: boolean;
  /** 디저트 스탬프 카드: 지난 전투 패배 뒤의 절반 디저트 */
  dessertHalf?: boolean;
  /** 게임개발부 4단계에서 준비 단계에 고른 버그 2개(0~2). 없으면 앞의 2개 */
  gameDevBugs?: number[];
  /** 세리카 「아르바이트 수당」 누적 승리 수(런 스택) */
  serikaWins?: number;
}

export type BattleEvent =
  | { t: 'action'; av: number; actor: Ref; kind: 'basic' | 'skill' | 'ultimate' | 'rear'; targets: Ref[] }
  | { t: 'damage'; av: number; source: Ref; origin?: Ref; target: Ref; amount: number; crit: boolean; shieldAbsorbed: number; true?: boolean }
  | { t: 'heal' | 'shield'; av: number; source: Ref; target: Ref; amount: number }
  | { t: 'status'; av: number; target: Ref; statusId: string; op: 'add' | 'remove'; replacedFrom?: string }
  | { t: 'resource'; av: number; side: Side; sp?: number; energy?: { unit: Ref; value: number } }
  | { t: 'timeline'; av: number; upcoming: Ref[] }
  | { t: 'escalation'; av: number; /** 아군 피해 증가 */ damageBps: number; /** 적 피해 증가(v2.4.12) */ enemyDamageBps: number }
  | { t: 'defeated'; av: number; target: Ref; by?: Ref }
  | { t: 'proc'; av: number; cause: { kind: 'synergy' | 'oopart'; id: string }; label: string; unit?: Ref; chain?: number }
  | { t: 'end'; av: number; outcome: 'win' | 'loss'; reason: 'enemy_front_wiped' | 'ally_front_wiped' | 'both_wiped' };

export interface BattleCombatant {
  ref: Ref;
  unitId?: string;
  enemyId?: string;
  name: string;
  star: number;
  maxHp: number;
  hp: number;
  shield: number;
  energy: number;
  boss: boolean;
  hasHp: boolean;
}

export interface BattleContribution { unitId: string; damage: number; healing: number; shield: number; rearSupport: number }

export interface BattleOutput {
  outcome: 'win' | 'loss';
  reason: 'enemy_front_wiped' | 'ally_front_wiped' | 'both_wiped';
  combatants: BattleCombatant[];
  startSp: { ally: number; enemy: number };
  events: BattleEvent[];
  contributions: BattleContribution[];
  /** 아군이 처치한 적(처치자 학생 ID). 레벨업 경험치·의뢰비 정산에 쓴다 */
  kills: { unitId: string; eliteOrBoss: boolean }[];
  /** 전투 효과가 정산에 더하는 골드(흥신소68 의뢰비·빚 상환·전리품) */
  settlementGold: { label: string; value: number }[];
  /** 이벤트 한도를 넘어 시뮬레이션이 중단됐다(체력 차감 없이 다시 시도해야 함) */
  aborted: boolean;
  /** 생존한 적 전방 수(패배 피해 계산) */
  survivingEnemyFront: number;
  /** 처리한 효과 ID(검증·측정용) */
  firedEffects: string[];
}
