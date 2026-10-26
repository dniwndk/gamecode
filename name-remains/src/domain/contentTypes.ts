// 콘텐츠 데이터 팩(src/content/)이 쓰는 형식. 조건은 선언형(Cond)이라 화면에 그대로 "조건: 관찰 4 이상"처럼 풀어 쓸 수 있다.
import type {
  Apt,
  ContractStatus,
  CrisisPriorityType,
  EndpointType,
  FocusType,
  LifeStatus,
  Mst,
  Res,
  RunState,
  SoundCue,
  ThreatTag,
} from './types';

export type Cond =
  | { all: Cond[] }
  | { any: Cond[] }
  | { not: Cond }
  | { apt: Apt; min: number }
  | { mst: Mst; min: number }
  | { res: Res; min?: number; max?: number }
  | { cap: string }
  | { clue: string }
  | { bg: string | string[] }
  | { form: string | string[] }
  | { region: string | string[] }
  | { path: string; tier?: number }
  | { tierMin: number }
  | { noPath: true }
  | { trust: string; min: number }
  | { flag: string }
  | { counter: string; min: number }
  | { age: { min?: number; max?: number } }
  | { incidentDone: string }
  | { contract: string; status?: ContractStatus }
  | { lifeStatus: LifeStatus }
  | { local: string; eq?: boolean | number | string }
  | { variant: string }
  | { focus: FocusType }
  | { crisis: CrisisPriorityType }
  | { fn: (s: RunState) => boolean; label: string };

export interface Effects {
  HP?: number;
  FAT?: number;
  KRW?: number;
  SUP?: number;
  apt?: Partial<Record<Apt, number>>;
  aptChance?: Array<{ apt: Apt; p: number }>;
  mst?: Partial<Record<Mst, number>>;
  caps?: string[];
  loseCaps?: string[];
  clues?: string[];
  trust?: Record<string, number>;
  meet?: string[];
  form?: string;
  region?: string;
  joinPath?: { path: string; tier: number };
  contracts?: Array<{ id: string; status: ContractStatus; deadlineYears?: number }>;
  flags?: Record<string, boolean>;
  local?: Record<string, boolean | number | string>;
  counters?: Record<string, number>;
  bodies?: number;
  witness?: number;
  domain?: number;
  beacons?: number;
  lifespan?: number;
  world?: Partial<{
    red_line_pushed_back: boolean;
    eternal_night_sealed: boolean;
    syndicate_dismantled: boolean;
    rewrote_city_anomaly_laws: boolean;
  }>;
  allyLost?: string;
  scar?: string;
  marks?: string[];
  /** 다음 사건 방어 보너스(확률 판정에 더함) */
  defense?: number;
  /** 영구 상해(content/injuries.ts의 id) */
  injury?: string;
}

export interface Outcome {
  text: string;
  effects?: Effects;
  next?: string;
  end?: string;
  sound?: SoundCue;
  caption?: string;
}

export type CheckType = 'rule' | 'ability' | 'chance';

export interface ChoiceDef {
  id: string;
  tag: string;
  text: string;
  /** 고를 수 있는 조건. 맞지 않으면 회색으로 보이고 이유를 적는다. */
  requires?: Cond;
  /** 보일 조건. 맞지 않으면 아예 숨긴다(출생 전용 길 등). */
  showIf?: Cond;
  check: CheckType;
  chance?: { base: number; apt?: Apt[]; mst?: Mst[] };
  cost?: Effects;
  success: Outcome;
  fail?: Outcome;
  /** 겉보기에는 멀쩡하지만 함정인 선택지. 독소 조항 식별(CAP_04)이나 높은 관찰이 있으면 경고 배지가 붙는다. */
  trap?: boolean;
  stealth?: boolean;
  usesSupplies?: boolean;
  /** 이 선택이 보유 능력 덕분에 열렸음을 표시 */
  capBadge?: string;
  /** 판정과 무관하게 실패 결과로 가는 조건(변형된 함정 등). true면 언제나 실패. */
  failIf?: Cond | true;
}

export type NodeDef =
  | {
      kind: 'auto';
      title?: string;
      text: string;
      caption?: string;
      sound?: SoundCue;
      effects?: Effects;
      next: string;
    }
  | {
      kind: 'decision';
      prompt: string;
      choices: ChoiceDef[];
    }
  | {
      kind: 'end';
      outcome: string;
      text?: string;
      effects?: Effects;
    };

export interface OverrideDef {
  cond: Cond;
  label: string;
  text: string;
  effects?: Effects;
  outcome: string;
}

export type IncidentKind = 'major' | 'call' | 'postmortem' | 'minor';

export interface IncidentDef {
  id: string;
  kind: IncidentKind;
  title: string;
  threats: ThreatTag[];
  entry: 'involuntary' | 'voluntary';
  /** 1(일상 괴담)~5(신화) */
  tier: number;
  place: string;
  /** 진입 시 시각 표기(멈춘 시계) */
  clock?: string;
  eligible: Cond;
  weight: number | ((s: RunState) => number);
  regions?: string[];
  repeatable?: boolean;
  variants?: string[];
  relevantClues?: string[];
  overrides?: OverrideDef[];
  nodes: Record<string, NodeDef>;
  /** 출생 배경 등으로 정해진 기한에 강제로 오는 사건 */
  forced?: boolean;
  /** 사건 며칠 전 타임라인에 끼어드는 안내문(10.1). 단서를 하나 남긴다. */
  notice?: { from: string; text: string; clue?: string };
  /** 진입 후 처음 보여 줄 노드 */
  start?: string;
  /** 사건이 이 결과로 끝나면 덧붙는 효과 */
  outcomeEffects?: Record<string, Effects | ((s: RunState) => Effects)>;
  /** 사건이 이 결과로 끝나면 확정되는 종점 */
  outcomeEndpoints?: Record<string, EndpointType>;
}

export interface BackgroundDef {
  id: string;
  name: string;
  weight: number;
  region: string;
  startAge: number;
  apt: Record<Apt, number>;
  res: Record<Res, number>;
  mst?: Partial<Record<Mst, number>>;
  caps?: string[];
  clues?: string[];
  trust?: Record<string, number>;
  summary: string;
  birthCard: string;
  startLog: string;
  childhood: [string, string, string];
  hardship?: 'favored' | 'normal' | 'hard' | 'extreme';
  lifespan?: [number, number];
  scars?: string[];
}

export interface RegionDef {
  id: string;
  name: string;
  monthlyCost: number;
  risk: number;
  riskLabel: string;
  threats: ThreatTag[];
  description: string;
}

export interface PathTier {
  name: string;
  position_id: string;
  req?: Cond;
  grants?: string[];
  effects?: Effects;
  blurb: string;
}

export interface PathDef {
  id: string;
  apex: string;
  form: string;
  summary: string;
  apexPower: string;
  tiers: [PathTier, PathTier, PathTier, PathTier, PathTier];
}

export interface FormDef {
  id: string;
  name: string;
  entry: string;
  survival: string;
  feature: string;
}

export interface CapabilityDef {
  id: string;
  name: string;
  source: string;
  effect: string;
  limit: string;
  /** 숙련·적성 조건을 넘으면 저절로 깨치는 능력 */
  autoGrant?: Cond;
}

export interface ActivityDef {
  id: string;
  name: string;
  eligible: Cond;
  cost: Effects;
  reward: Effects;
  /** 활동 보수(자금 +)가 직위별로 달라지는 경우 */
  wage?: (s: RunState) => number;
  texts: string[];
  tags: Array<'work' | 'rest' | 'train' | 'care' | 'investigate' | 'supply'>;
  trains?: Mst;
}

export interface MinorEventDef {
  id: string;
  title: string;
  category: string;
  eligible?: Cond;
  weight: number;
  run: (s: RunState, ctx: MinorCtx) => MinorResult;
}

export interface MinorResult {
  text: string;
  effects?: Effects;
  badges?: string[];
  sound?: SoundCue;
  caption?: string;
  noticeFrom?: string;
  facts?: Record<string, boolean | number | string>;
}

export interface MinorCtx {
  roll: () => number;
  has: (c: Cond) => boolean;
}

export interface PostmortemDef {
  id: string;
  name: string;
  form: string;
  condition: string;
  after: string;
}

export interface EndpointDef {
  id: EndpointType;
  name: string;
  description: string;
}

export interface AchievementFact {
  type:
    | 'incident_completed'
    | 'position_granted'
    | 'capability_granted'
    | 'endpoint_committed'
    | 'step'
    | 'minor_event_resolved'
    | 'power_override_triggered'
    | 'action_resolved'
    | 'region_changed'
    | 'relationship_restored'
    | 'contract_resolved'
    | 'debt_cleared'
    | 'activity_completed'
    | 'mastery_increased'
    | 'shelter_granted';
  incident_id?: string;
  outcome?: string;
  entry_mode?: 'involuntary' | 'voluntary';
  threats?: ThreatTag[];
  local?: Record<string, boolean | number | string>;
  damage?: number;
  capability_id?: string;
  endpoint_type?: EndpointType;
  data?: Record<string, unknown>;
}

export interface AchievementDef {
  id: string;
  tier: 1 | 2 | 3 | 4 | 5 | 6;
  title: string;
  hint: string;
  revealed: string;
  check: (s: RunState, f: AchievementFact) => boolean;
}

export interface ClueDef {
  id: string;
  label: string;
  text: string;
}

export interface NpcDef {
  id: string;
  label: string;
  intro: string;
}
