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
}

export type SynergyCategory = 'faction' | 'role' | 'armor' | 'unique' | 'economy';
/** front_only/rear_only: 실제 그 구역에 놓인 구성원만 센다(6장 뱅가드, 고유 시너지). */
export type SynergyCountScope = 'deployed_all' | 'front_only' | 'rear_only';

export interface SynergyTier {
  threshold: number;
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
  | 'strategy_container';
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
  shop: { slots: number; rerollCost: number; recommendedSlotIndex: number; recommendedModeChanceBps: number; levels: ShopLevelOdds[] };
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
  battle: { maxAv: number; eventLimit: number; globalPulseAv: number; teamSp: { start: number; max: number }; energy: { start: number; max: number } };
  rng: { algorithm: string; zeroSeedReplacement: number; streams: string[] };
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
  expectedCounts: Record<'units' | 'synergies' | 'equipment' | 'strategies' | 'enemies' | 'nodes' | 'effects' | 'dialogueFiles' | 'statuses', number>;
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
  enemies: EnemyDefinition[];
  nodes: NodeDefinition[];
  statuses: StatusDefinition[];
  assets: AssetEntry[];
  dialogue: DialogueFile[];
}
