// 화면이 보는 모양(사양서 11.2의 "가정" 타입). 화면 컴포넌트는 이 파일의 타입만 본다.
// 코어의 실제 run이 나오면 adapter.ts의 toRunView() 한 곳만 고친다.
import type { CommandResult, ContentCatalog, GameCommandType, RunPhase } from '../../app/gameClient';
import type { BaseStats, OopartSourceId } from '../../core/types/content';

export type NodeType = 'normal' | 'elite' | 'boss';

export interface UnitInstanceView {
  instanceId: string;
  unitId: string;
  star: 1 | 2 | 3;
  equipment: string[];
  stats: BaseStats;
  placeable: { front: boolean; rear: boolean };
  sellValue: number;
  /** 장비 칸 수(기본 2, 오파츠로 늘 수 있음) */
  equipSlots?: number;
}

export interface SynergyStateView {
  synergyId: string;
  count: number;
  nextThreshold: number | null;
  activeTier: number | null; // tiers 배열의 index
  tracked: boolean;
  /** 런 동안 쌓이는 스택(아리스 경험치·보충수업 등). 없으면 null. 툴팁에 그대로 보여 준다 */
  stacks: { label: string; value: string; progress: { current: number; max: number } | null; note: string | null }[] | null;
}

export interface ShopSlotView {
  unitId: string;
  cost: number;
  recommended: boolean;
  preview: { mergesTo?: 2 | 3; synergyDelta: { synergyId: string; from: number; to: number }[] };
}

export interface NodeCandidateView {
  id: 'A' | 'B';
  label: string;
  front: { enemyId: string; index: number }[];
  rear: { enemyId: string; index: number }[];
  threat: string;
}

export interface ResultView {
  outcome: 'win' | 'loss';
  reason: 'enemy_front_wiped' | 'ally_front_wiped' | 'both_wiped';
  runHp: { before: number; after: number; breakdown: { label: string; value: number }[] };
  income: { label: string; value: number }[];
  xpGained: number;
  contributions: { unitId: string; damage: number; healing: number; shield: number; rearSupport: number }[];
  mvpUnitId: string | null;
}

export type Side = 'ally' | 'enemy';
export interface Ref { side: Side; zone: 'front' | 'rear'; index: number }

export type BattleEventView =
  | { t: 'action'; av: number; actor: Ref; kind: 'basic' | 'skill' | 'ultimate' | 'rear'; targets: Ref[] }
  | { t: 'damage'; av: number; source: Ref; origin?: Ref; target: Ref; amount: number; crit: boolean; shieldAbsorbed: number; true?: boolean }
  | { t: 'heal' | 'shield'; av: number; source: Ref; target: Ref; amount: number }
  | { t: 'status'; av: number; target: Ref; statusId: string; op: 'add' | 'remove'; replacedFrom?: string }
  | { t: 'resource'; av: number; side: Side; sp?: number; energy?: { unit: Ref; value: number } }
  | { t: 'timeline'; av: number; upcoming: Ref[] }
  /** 격화 단계가 바뀐 순간. damageBps는 지금 양쪽 모든 피해에 더해지는 비율(시간 제한 대신, GDD v2.3 13장) */
  | { t: 'escalation'; av: number; damageBps: number }
  | { t: 'defeated'; av: number; target: Ref; by?: Ref }
  | { t: 'end'; av: number; outcome: 'win' | 'loss'; reason: ResultView['reason'] };

export interface CombatantView {
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

export interface BattleView {
  battleId: string;
  nodeLabel: string;
  combatants: CombatantView[];
  startSp: { ally: number; enemy: number };
  events: BattleEventView[];
}

export interface RunView {
  runId: string;
  seed: string;
  crisisLevel: number;
  chapter: number;
  battle: number;
  nodeId: string;
  nodeType: NodeType;
  runHp: number;
  runHpMax: number;
  gold: number;
  /** capBonus: 세미나 동아리가 올린 이자 상한(0이면 기본) */
  nextInterestPreview: { gold: number; capBonus: number };
  level: number;
  xp: number;
  xpToNext: number | null;
  deployedCount: number;
  deployLimit: number;
  streak: { kind: 'win' | 'loss' | null; count: number };
  strategies: string[];
  loans: { remaining: number; perPayment: number }[];
  board: { front: (UnitInstanceView | null)[]; rear: (UnitInstanceView | null)[]; bench: (UnitInstanceView | null)[] };
  equipmentStash: string[];
  synergies: SynergyStateView[];
  shop: { slots: (ShopSlotView | null)[]; locked: boolean; rerollCost: number; odds: number[]; xpCost: number };
  node: { candidates: NodeCandidateView[]; chosen: 'A' | 'B'; defeatDamagePreview: number; statScaleBps: number };
  nodeHistory: ('win' | 'loss' | null)[];
  offers?: { strategies?: string[]; equipment?: string[]; startingUnits?: string[]; bosses?: string[] };
  /** 보유 오파츠(획득 순)와, OOPART_CHOICE 단계일 때의 제안 */
  ooparts: { owned: string[]; offer: OopartOfferView | null };
  /** 이번 전략 선택에서 더 고를 수 있는 수(기본 1, 싯딤의 상자 2) */
  strategyPicksLeft?: number;
  lastBattle?: BattleView;
  lastResult?: ResultView;
}

export interface OopartOfferView {
  ids: string[];
  source: OopartSourceId;
  /** true면 고르지 않고 받기만 한다(구조 요청). 건너뛸 수 없다. */
  grant: boolean;
  skipGold: number;
  /** ids와 같은 순서. 공개된 레시피의 재료면 "조합 재료 (n/m)" */
  badges: ({ legendaryId: string; owned: number; total: number } | null)[];
}

export interface UiState {
  revision: number;
  phase: RunPhase;
  contentVersion: string;
  rulesVersion: string;
  run: RunView | null;
  /** 진행 중 런이 저장돼 있는지(홈의 이어하기) */
  hasSavedRun: boolean;
  savedRun?: { chapter: number; battle: number; runHp: number; runHpMax: number; /** 홈 브리핑용 저장 런 스냅샷(있으면 편성·시너지·보스를 보여 준다) */ snapshot?: RunView };
  /** 연출 신호(첫 영입·합성·레벨업 등). id가 증가하며 화면은 마지막으로 본 id 이후만 재생한다. */
  cues: Cue[];
  /** 한 번이라도 완성해 레시피가 공개된 전설 오파츠(프로필, 모든 판 공통) */
  oopartRevealed: string[];
  /** 오파츠별 지금 빌드에서 작동하는 정도. 없으면 표시하지 않는다 */
  oopartSupport?: Record<string, { level: 'active' | 'partial' | 'pending'; waiting?: string }>;
}

export interface Cue {
  id: number;
  kind: 'recruit' | 'deploy' | 'merge' | 'levelup' | 'equip_returned' | 'oopart' | 'oopart_merge' | 'awaken';
  unitId?: string;
  /** oopart: 얻은 오파츠, oopart_merge: 완성된 전설 */
  oopartId?: string;
  /** oopart_merge: 사라진 재료, 이번에 처음 완성했는지 */
  consumed?: string[];
  firstReveal?: boolean;
  star?: number;
  amount?: number;
}

/** 화면이 게임과 이야기하는 창구. 실제 GameClient 어댑터와 미리보기 세션이 같은 모양을 낸다. */
export interface UiDriver {
  readonly catalog: ContentCatalog;
  /** true면 코어 런이 아직 없어서(M0) 화면 확인용 목 세션으로 돌고 있다 */
  readonly preview: boolean;
  get(): UiState;
  subscribe(fn: (s: UiState) => void): () => void;
  send(type: GameCommandType, payload?: Record<string, unknown>): Promise<CommandResult>;
  /** 홈의 「이어하기」. 실제 코어에서는 저장된 phase로 바로 열리므로 없어도 된다. */
  resume?(): void;
}

export type Zone = 'front' | 'rear' | 'bench';
