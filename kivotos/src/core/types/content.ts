// 콘텐츠 정의 타입(GDD v2.1 9.5 구조 계약 + v2.2 개정).
// 이 파일과 src/core 전체는 브라우저·React·DOM과 무관한 순수 TypeScript다.
// 수치 단위: 확률·배율·치명타는 basis point(1% = 100bps)의 정수로 둔다(8.1 숫자 표현).

export type Position = 'front_only' | 'rear_only' | 'dual';
export type Zone = 'front' | 'rear' | 'bench';
export type Star = 1 | 2 | 3;
export type Cost = 1 | 2 | 3 | 4 | 5;

export interface BaseStats {
  hp: number;
  atk: number;
  def: number;
  spd: number;
  critBps: number;
  critDamageBps: number;
}

export interface UnitAbilityIds {
  basic: string | null;
  skill: string | null;
  ultimate: string | null;
  frontEffects: string[];
  rearAction: string | null;
  rearEffects: string[];
}

export interface UnitDefinition {
  id: string;
  name: string;
  cost: Cost;
  position: Position;
  synergyIds: string[];
  baseStats: BaseStats;
  role: string;
  abilityIds: UnitAbilityIds;
  portraitAssetId: string;
  shopEligible: boolean;
  /** 이 학생이 런 도중 다른 학생으로 바뀌는 조건(v2.3 9장). 없으면 null. */
  awakening: UnitAwakening | null;
  /** 각성 학생이면 원래 학생 ID. 시너지 구성원 수에서는 원래 학생과 같은 사람으로 센다. */
  awakenedFrom: string | null;
}

export interface UnitAwakening {
  intoUnitId: string;
  /** 경험치를 세는 원래 학생의 고유 시너지 */
  counterSynergyId: string;
  expRequired: number;
  /** 이 성급 이상인 개체만 각성한다. 각성 학생은 같은 성급으로 시작한다. */
  starRequired: number;
}

/** easteregg: v2.3.5 전 이름은 platinum. 극악 조건의 원작 재현 시너지(ID는 syn_plat_* 그대로). */
export type SynergyCategory = 'faction' | 'club' | 'role' | 'unique' | 'easteregg';
/**
 * front_only/rear_only: 실제 그 구역에 놓인 구성원만 센다(고유 시너지).
 * special: 구성원 명단 없이 출전 편성 전체로 판정한다(이스터에그 「학원 대항전」·「총력전 만점」).
 */
export type SynergyCountScope = 'deployed_all' | 'front_only' | 'rear_only' | 'special';

/** platinum: 구성원이 많은 시너지의 6명 이상 고등급 단계(v2.3.5). 이스터에그보다는 약하다. */
export type SynergyTierGrade = 'normal' | 'platinum';

export interface SynergyTier {
  threshold: number;
  grade: SynergyTierGrade;
  effectIds: string[];
  /** 사람이 읽는 명세. 런타임에서 해석·실행하지 않는다. */
  spec: string;
}

export interface SynergyDefinition {
  id: string;
  name: string;
  category: SynergyCategory;
  countScope: SynergyCountScope;
  tiers: SynergyTier[];
  memberIds: string[];
  /** 기획서가 적어 둔 집계값. 검증기가 유닛 데이터로 다시 세어 대조한다. */
  documented: { frontOnly: number; rearOnly: number; dual: number; maxLegalCount: number };
}

export type EffectScope = 'front' | 'rear' | 'both' | 'deployed_all' | 'front_only' | 'rear_only' | 'global';
export type EffectExecution =
  | 'ability_basic'
  | 'ability_skill'
  | 'ability_ultimate'
  | 'ability_rear'
  | 'passive_container'
  | 'synergy_container'
  | 'equipment_container'
  | 'strategy_container'
  | 'oopart_container';
/** spec_only: 명세만 있음(M0). implemented: 실행 연산과 테스트가 붙음(M3 이후). */
export type EffectImplementation = 'spec_only' | 'implemented';

export interface EffectDefinition {
  id: string;
  catalogNo: string;
  owner: string;
  scope: EffectScope;
  execution: EffectExecution;
  trigger: string | null;
  spec: string;
  limits: string;
  sourceReference: string;
  implementation: EffectImplementation;
  /** 9.2 연산 목록으로 만든 실행 handler. M3에서 채운다. */
  handlers: unknown[];
}

export type StatModifiers = Partial<BaseStats>;

export interface EquipmentDefinition {
  id: string;
  name: string;
  zone: 'front' | 'rear' | 'both';
  stats: StatModifiers;
  effectIds: string[];
  uniquePerUnit: boolean;
  chapters: number[];
  recommendation: string;
  description: string;
}

export interface OwnedCondition {
  positions: Position[];
  anyTagOf: string[] | null;
  minCount: number;
  /** 보유 조건을 만족하면 이 장들에서도 제안된다. */
  chapters: number[];
}

export interface StrategyDefinition {
  id: string;
  name: string;
  offer: { chapters: number[]; ownedCondition: OwnedCondition | null };
  offerText: string;
  effectIds: string[];
  benefit: string;
  drawback: string;
  stacking: string;
  generalPurpose: boolean;
}

export type OopartRarity = 'common' | 'uncommon' | 'rare' | 'legendary';
/** general: 범용, synergy: 시너지 특화, drawback: 이득과 대가를 함께 가짐(⚠). */
export type OopartKind = 'general' | 'synergy' | 'drawback';

/** 오파츠(보유형 유물, docs/OOPARTS_v1.md). 장착하지 않고 보유만으로 켜진다. */
export interface OopartDefinition {
  id: string;
  /** 기획서 번호(C01·U09·R04·L01 …) */
  code: string;
  name: string;
  rarity: OopartRarity;
  kind: OopartKind;
  /** 특화 대상 시너지. 전설은 재료의 대상을 합친다. */
  synergyIds: string[];
  effectIds: string[];
  benefit: string;
  drawback: string | null;
  /** 전설만: 재료 오파츠 ID. 모두 보유하면 자동으로 합쳐진다. */
  recipe: string[] | null;
  flavor: string;
}

export type OopartSourceId = 'run_start' | 'elite' | 'boss' | 'rescue';

export interface OopartSourceRule {
  id: OopartSourceId;
  chapters: number[];
  /** 제안 칸 수. 1이면 고르지 않고 바로 지급(grant). */
  choices: number;
  grant: boolean;
  requiresWin: boolean;
  /** 장 번호 → [일반, 고급, 희귀] 확률(%) */
  oddsByChapter: Record<string, number[]>;
}

export interface OopartRules {
  /** oddsByChapter 배열의 순서이자, 후보가 바닥났을 때 내려가는 순서의 역순 */
  rarityOrder: Exclude<OopartRarity, 'legendary'>[];
  sources: OopartSourceRule[];
  rescueLossStreak: number;
  skipGold: number;
  /** 레시피 재료를 하나라도 가졌을 때 남은 재료의 추첨 가중치 */
  recipeWeight: number;
}

export interface EnemyDefinition {
  id: string;
  name: string;
  zone: 'front' | 'rear';
  boss: boolean;
  baseStats: BaseStats;
  effectIds: string[];
  ai: string;
  role: string;
  counterplay: string;
}

export interface FormationSlot {
  enemyId: string;
  /** 0부터. 전방 F1~F4 = 0~3, 후방 R1~R6 = 0~5 */
  index: number;
}

export interface NodeCandidate {
  id: 'A' | 'B';
  label: string;
  front: FormationSlot[];
  rear: FormationSlot[];
  threat: string;
}

export interface NodeDefinition {
  id: string;
  chapter: number;
  battle: number;
  type: 'normal' | 'elite' | 'boss';
  /** node_scaled: HP/ATK에만 곱한다(A16). */
  statScaleBps: number;
  candidates: NodeCandidate[];
}

export interface StatusDefinition {
  id: string;
  rule: string | null;
}

export interface ShopLevelOdds {
  level: number;
  /** 1~5코스트 확률(%) */
  costOddsPct: number[];
}

export interface RulesConfig {
  rulesVersion: string;
  source: string;
  run: {
    chapters: number;
    battlesPerChapter: number;
    startRunHp: number;
    startGold: number;
    startLevel: number;
    startXp: number;
    maxLevel: number;
    startingUnits: { count: number; cost: number; minFrontCapable: number };
  };
  board: { frontSlots: number; rearSlots: number; benchSlots: number; maxDeployed: number };
  shop: {
    slots: number; rerollCost: number; recommendedSlotIndex: number; recommendedModeChanceBps: number; levels: ShopLevelOdds[];
    /** 코스트 1~5 학생 1명당 장수(v2.3 11.1). 남은 장수 = 장수 − 소유(1성 환산) − 지금 상점 칸 */
    copiesByCost: number[];
    /** 최고 성급을 보유한 학생은 팔기 전까지 상점에 나오지 않는다(v2.3 11.1) */
    excludeMaxStarOwned: boolean;
  };
  xp: { buyCostGold: number; buyAmount: number; perBattle: number; xpToNext: Record<string, number | null> };
  income: {
    baseByChapter: number[];
    winBonus: number;
    streakBonus: { minStreak: number; gold: number }[];
    interest: { stepGold: number; cap: number };
  };
  sell: { formula: string; depreciationFromStar: number; depreciationGold: number };
  defeatDamage: { chapterBase: number[]; perSurvivingEnemyFront: number; eliteBonus: number; bossBonus: number; finalBossLossEndsRun: boolean };
  units: { maxStar: number; mergeCount: number; starStatMultiplierBps: number[]; equipmentSlots: number };
  battle: {
    eventLimit: number;
    globalPulseAv: number;
    /** 시간 제한 없음(v2.3.6). 오래 끄는 전투는 양쪽 피해가 함께 커진다(13장). */
    escalation: { startAv: number; stepAv: number; damageBpsPerStep: number };
    teamSp: { start: number; max: number };
    energy: { start: number; max: number };
  };
  rng: { algorithm: string; zeroSeedReplacement: number; streams: string[] };
  ooparts: OopartRules;
}

export const DIALOGUE_KEYS = ['recruit', 'deploy', 'ultimate', 'victory', 'defeated', 'star3', 'bond'] as const;
export type DialogueKey = (typeof DIALOGUE_KEYS)[number];

export interface DialogueFile {
  unitId: string;
  name: string;
  basis: string;
  confidence: string;
  lines: Record<DialogueKey, string>;
}

export interface AssetEntry {
  id: string;
  unitId: string;
  kind: 'portrait';
  path: string;
  present: boolean;
  fallback: string;
  origin: string;
}

export interface PackManifest {
  packId: string;
  contentVersion: string;
  rulesVersion: string;
  expectedCounts: Record<'units' | 'synergies' | 'equipment' | 'strategies' | 'enemies' | 'nodes' | 'effects' | 'dialogueFiles' | 'statuses' | 'ooparts', number>;
  sources: { path: string; sha256: string }[];
  generatedBy: string;
}

export interface ContentPack {
  manifest: PackManifest;
  rules: RulesConfig;
  units: UnitDefinition[];
  synergies: SynergyDefinition[];
  effects: EffectDefinition[];
  equipment: EquipmentDefinition[];
  strategies: StrategyDefinition[];
  ooparts: OopartDefinition[];
  enemies: EnemyDefinition[];
  nodes: NodeDefinition[];
  statuses: StatusDefinition[];
  assets: AssetEntry[];
  dialogue: DialogueFile[];
}
