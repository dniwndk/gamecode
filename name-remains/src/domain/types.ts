// 도메인 상태 스키마. 명세서 12절(src/domain/types.ts)을 따르되, 실제 판정에 필요한 몇 가지 칸을 더했다.
// 동시대 출생자 비교·인생 지도 그리드는 명세에 따라 존재하지 않는다.

export type RunStatus = 'playing' | 'ended' | 'abandoned';
export type LifeStatus = 'active' | 'death_pending' | 'postmortem' | 'finalized';
export type PlaybackState = 'running' | 'paused' | 'awaiting_choice' | 'ended';
export type PauseReason = 'user' | 'journal' | 'settings' | 'hidden' | 'recovery' | 'postmortem_transition';

export type EndpointType =
  | 'death'
  | 'dissolution'
  | 'ascension'
  | 'immortality'
  | 'perpetual_domain'
  | 'eternal_binding';

// 명세 12절의 6종에 생활권 표(03.2)가 쓰는 경계 계열을 더했다.
export type ThreatTag =
  | 'TH_RULE'
  | 'TH_PREDATOR'
  | 'TH_INFECTION'
  | 'TH_RITUAL'
  | 'TH_DOMAIN'
  | 'TH_COSMIC'
  | 'TH_BOUNDARY';

export type FocusType =
  | 'FOCUS_LIVELIHOOD'
  | 'FOCUS_STABILITY'
  | 'FOCUS_TRAINING'
  | 'FOCUS_RELATIONSHIP'
  | 'FOCUS_INVESTIGATION';

export type CrisisPriorityType = 'CRISIS_EGRESS_FIRST' | 'CRISIS_PROTECT_ALLY' | 'CRISIS_PUSH_OBJECTIVE';

export type Apt = 'OBS' | 'NEG' | 'PRC' | 'RES';
export type Res = 'HP' | 'FAT' | 'KRW' | 'SUP';
export type Mst = 'MST_FIELD' | 'MST_SEAL' | 'MST_RULE' | 'MST_BOUND';
export type ContractStatus = 'active' | 'fulfilled' | 'breached' | 'nullified';

export interface RngStreams {
  algorithm_version: 'mulberry32_v1';
  birth_state: number;
  world_state: number;
  action_state: number;
}

export interface DecisionChoiceSnapshot {
  id: string;
  tag: string;
  text: string;
  known_costs_label: string[];
  required_badges: string[];
  warning_badge?: string;
  odds_label?: string;
  is_available: boolean;
  unavailable_reason?: string;
  /** 사건 도중 언제든 끼워 넣는 작은 행동(고른 뒤에도 같은 선택이 이어진다) */
  minor?: boolean;
  /** 이 선택이 건드리는 능력치·자원 이름 */
  effect_hint?: string[];
  /** 영구 상해로 다친 부위를 쓰는 선택일 때의 불리함 */
  injury_note?: string;
}

/** 한 해 동안의 생활 활동 누적(연말에 한 줄로 정리한다) */
export interface YearAccumulator {
  acts: Record<string, number>;
  texts: Record<string, string>;
  sum: Record<string, number>;
}

export interface PendingDecisionSnapshot {
  decision_id: string;
  incident_instance_id: string;
  scene_node_id: string;
  opened_at_minute: number;
  state_revision: number;
  title: string;
  place?: string;
  prompt_text: string;
  relevant_observations: string[];
  choices: DecisionChoiceSnapshot[];
}

export type LogKind =
  | 'birth'
  | 'childhood'
  | 'auto_activity'
  | 'minor_event'
  | 'epistolary_notice'
  | 'incident_auto'
  | 'decision_taken'
  | 'incident_result'
  | 'power_override'
  | 'milestone'
  | 'postmortem'
  | 'endpoint';

export type LogTone = 'plain' | 'quiet' | 'danger' | 'gold' | 'boundary' | 'good';

export interface TimelineLog {
  log_id: string;
  virtual_minute: number;
  age_years: number;
  month: number;
  kind: LogKind;
  title?: string;
  place?: string;
  body: string;
  accessibility_caption?: string;
  badges?: string[];
  deltas?: string[];
  tone?: LogTone;
  notice_from?: string;
  sound?: SoundCue;
}

export type SoundCue = 'silence' | 'knock' | 'bell' | 'glitch' | 'siren' | 'heartbeat' | 'chime' | 'tide';

export interface IncidentHistoryEntry {
  incident_id: string;
  outcome: string;
  minute: number;
  entry_mode: 'involuntary' | 'voluntary';
  survived: boolean;
}

export interface RelationshipState {
  npc_id: string;
  label: string;
  trust: number;
  fear: number;
  met: boolean;
  pre_mutation_bond: boolean;
  mutual_recognition_restored: boolean;
  is_alive: boolean;
}

export interface AchievementReceipt {
  run_id: string;
  achievement_id: string;
  achievement_version: number;
  tier_at_award: 1 | 2 | 3 | 4 | 5 | 6;
  earned_at_minute: number;
  state_revision: number;
  evidence_fact_ids: string[];
}

export interface PersonState {
  name: string;
  background_id: string;
  region_id: string;
  form_id: string;
  position_id: string;
  position_tier: number;
  path_id: string | null;
  bodies_count: number;
  domain_integrity: number;
  witness_count: number;
  effigy_ready: boolean;
  relic_guard_ready: boolean;
  beacons: number;
  aptitudes: Record<Apt, number>;
  resources: Record<Res, number>;
  masteries: Record<Mst, number>;
  capabilities: string[];
  knowledge_observations: string[];
  scars_and_marks: string[];
  /** 영구 상해 id 목록(content/injuries.ts) */
  injuries?: string[];
  /** 영구 상해로 깎인 최대 건강 */
  max_hp_penalty?: number;
  initial_debt: number;
  initial_debt_cleared: boolean;
  min_hp_in_run: number;
  involuntary_survivals_count: number;
  cleared_high_threats_count: number;
  cleared_threat_tags: ThreatTag[];
  body_death_history: Array<{
    occurred_at_minute: number;
    incident_id: string | null;
    cause: string;
    transitioned_to_postmortem: string | null;
  }>;
  postmortem_count: number;
  postmortem_type: string | null;
  postmortem_started_minute: number | null;
}

export interface IncidentState {
  instance_id: string;
  incident_id: string;
  variant_id: string;
  entry_mode: 'involuntary' | 'voluntary';
  current_node_id: string;
  local_flags: Record<string, boolean | number | string>;
  damage_taken_in_incident: number;
  died_during_this_incident: boolean;
  postmortem_during_this_incident: boolean;
  supplies_spent: number;
}

export interface WorldState {
  active_sector_threats: Record<string, number>;
  red_line_pushed_back: boolean;
  eternal_night_sealed: boolean;
  syndicate_dismantled: boolean;
  rewrote_city_anomaly_laws: boolean;
  defense_bonus: number;
}

export interface RunState {
  schema_version: 1;
  content_version: '3.0.0';
  ruleset_id: string;
  is_verification_fixture?: boolean;
  run: {
    id: string;
    seed: string;
    revision: number;
    auto_sequence: number;
    run_status: RunStatus;
    life_status: LifeStatus;
    started_at_iso: string;
    clock: {
      virtual_minute: number;
      birth_age_years: number;
      current_age_years: number;
      max_lifespan_years: number;
      adult_start_minute: number;
    };
    life_plan: {
      focus: FocusType;
      crisis_priority: CrisisPriorityType;
    };
    year_acc?: YearAccumulator;
    current_activity: {
      activity_id: string;
      started_at_minute: number;
      total_duration_minutes: number;
      elapsed_minutes: number;
      applied_cost_ratio: number;
    } | null;
    scheduled_events: Array<{
      schedule_id: string;
      due_minute: number;
      priority: number;
      sequence_order: number;
      event_kind: 'major_incident' | 'minor_event' | 'call';
      event_id: string;
      entry_mode: 'involuntary' | 'voluntary';
      variant_id?: string;
    }>;
    pending_decision: PendingDecisionSnapshot | null;
    person: PersonState;
    world: WorldState;
    incident: IncidentState | null;
    relationships: Record<string, RelationshipState>;
    contracts: Array<{
      contract_id: string;
      status: ContractStatus;
      deadline_minute: number | null;
    }>;
    milestones: Record<string, boolean>;
    counters: Record<string, number>;
    cooldowns: Record<string, number>;
    incident_history: IncidentHistoryEntry[];
    achievements: AchievementReceipt[];
    endpoint: {
      endpoint_type: EndpointType;
      committed_at_minute: number;
      epilogue_text: string;
      cause: string;
    } | null;
    timeline_logs: TimelineLog[];
  };
  rng: RngStreams;
}

// ---------- 회차 밖(계정) 기록 ----------

export interface LifeRecord {
  run_id: string;
  seed: string;
  name: string;
  background_id: string;
  birth_year_age: number;
  start_age: number;
  end_age: number;
  endpoint_type: EndpointType | 'abandoned';
  cause: string;
  position_id: string;
  form_id: string;
  achievement_ids: string[];
  epitaph: string;
  ended_at_iso: string;
}

export interface ProfileArchive {
  id: 'profile';
  achievements: Record<string, { first_run_id: string; earned_at_iso: string; person_name: string }>;
  lives: LifeRecord[];
  watched: string[];
  /** 한 번이라도 겪어 본 사건(도감 공개용) */
  seen_incidents?: string[];
}
