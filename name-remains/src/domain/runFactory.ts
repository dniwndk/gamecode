// 회차 생성기. 출생 배경은 시드의 birth 스트림으로만 정해진다. 계정 기록(ProfileArchive)은 절대 참조하지 않는다.
import type { RelationshipState, RunState } from './types';
import { createStreams, hashSeed, int, next, weighted } from './rng';
import { BACKGROUNDS } from '../content/backgrounds';
import { NPCS } from '../content/world';
import { MINUTES_PER_YEAR } from './conditions';

export const STEP_MINUTES = 14 * 24 * 60;
export const RULESET_ID = 'name-remains-rules-3.0.0';

export interface CreateRunOptions {
  seed: string;
  name: string;
  /** 시험용: 출생 배경 고정 */
  forceBackground?: string;
  nowIso?: string;
}

const SURNAMES = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황'];
const GIVEN = ['도윤', '서연', '하준', '지우', '은호', '수아', '민재', '하린', '시우', '예린', '우진', '채원', '건우', '다온', '유나', '태오', '서진', '나은'];

export function randomName(seed: string): string {
  const h = hashSeed(seed, 77);
  return SURNAMES[h % SURNAMES.length] + GIVEN[(h >>> 8) % GIVEN.length];
}

export function createRun(opts: CreateRunOptions): RunState {
  const rng = createStreams(opts.seed);
  const bg = opts.forceBackground
    ? BACKGROUNDS.find((b) => b.id === opts.forceBackground) ?? BACKGROUNDS[0]
    : weighted(rng, 'birth', BACKGROUNDS, (b) => b.weight)!;
  // 같은 시드에서 배경 고정 여부와 무관하게 이후 난수가 어긋나지 않도록 한 번은 꼭 뽑는다
  if (opts.forceBackground) next(rng, 'birth');

  const [lmin, lmax] = bg.lifespan ?? [68, 92];
  const lifespan = int(rng, 'birth', lmin, lmax) + next(rng, 'birth');

  const relationships: Record<string, RelationshipState> = {};
  for (const n of NPCS) {
    const t = bg.trust?.[n.id] ?? 0;
    relationships[n.id] = {
      npc_id: n.id,
      label: n.label,
      trust: t,
      fear: 0,
      met: t > 0,
      pre_mutation_bond: false,
      mutual_recognition_restored: false,
      is_alive: true,
    };
  }

  const startMinute = Math.round(bg.startAge * MINUTES_PER_YEAR);
  const name = opts.name.trim() || randomName(opts.seed);
  const runId = `run-${hashSeed(`${opts.seed}|${name}|${opts.nowIso ?? ''}`, 9).toString(36)}`;

  const state: RunState = {
    schema_version: 1,
    content_version: '3.0.0',
    ruleset_id: RULESET_ID,
    run: {
      id: runId,
      seed: opts.seed,
      revision: 0,
      auto_sequence: 0,
      run_status: 'playing',
      life_status: 'active',
      started_at_iso: opts.nowIso ?? new Date(0).toISOString(),
      clock: {
        virtual_minute: 0,
        birth_age_years: 0,
        current_age_years: 0,
        max_lifespan_years: Math.round(lifespan * 10) / 10,
        adult_start_minute: startMinute,
      },
      life_plan: {
        focus: bg.res.KRW < 0 ? 'FOCUS_LIVELIHOOD' : 'FOCUS_TRAINING',
        crisis_priority: 'CRISIS_EGRESS_FIRST',
      },
      current_activity: null,
      scheduled_events: [],
      pending_decision: null,
      person: {
        name,
        background_id: bg.id,
        region_id: bg.region,
        form_id: 'FORM_01_HUMAN',
        position_id: 'POS_CITIZEN',
        position_tier: 0,
        path_id: null,
        bodies_count: 1,
        domain_integrity: 100,
        witness_count: 0,
        effigy_ready: (bg.caps ?? []).includes('CAP_25_EFFIGY_SUBSTITUTE'),
        relic_guard_ready: false,
        beacons: 0,
        aptitudes: { ...bg.apt },
        resources: { ...bg.res },
        masteries: { MST_FIELD: 0, MST_SEAL: 0, MST_RULE: 0, MST_BOUND: 0, ...bg.mst },
        capabilities: [...(bg.caps ?? [])],
        knowledge_observations: [...(bg.clues ?? [])],
        scars_and_marks: [...(bg.scars ?? [])],
        initial_debt: bg.res.KRW < 0 ? -bg.res.KRW : 0,
        initial_debt_cleared: false,
        min_hp_in_run: bg.res.HP,
        involuntary_survivals_count: 0,
        cleared_high_threats_count: 0,
        cleared_threat_tags: [],
        body_death_history: [],
        postmortem_count: 0,
        postmortem_type: null,
        postmortem_started_minute: null,
      },
      world: {
        active_sector_threats: {},
        red_line_pushed_back: false,
        eternal_night_sealed: false,
        syndicate_dismantled: false,
        rewrote_city_anomaly_laws: false,
        defense_bonus: 0,
      },
      incident: null,
      relationships,
      contracts: [],
      milestones: {},
      counters: { steps: 0, clears: 0, childhood: 0 },
      cooldowns: {},
      incident_history: [],
      achievements: [],
      endpoint: null,
      timeline_logs: [
        {
          log_id: 'L0',
          virtual_minute: 0,
          age_years: 0,
          month: 1,
          kind: 'birth',
          title: bg.name,
          body: bg.birthCard,
          tone: 'plain',
        },
      ],
    },
    rng,
  };

  // 대리 제물: 반년 안에 강제 의식(EVT_05)이 확정 도래한다
  if (bg.id === 'BG_13_DESIGNATED_OFFERING') {
    const due = startMinute + Math.round((0.25 + next(rng, 'birth') * 0.2) * MINUTES_PER_YEAR);
    state.run.contracts.push({ contract_id: 'CTR_OFFERING', status: 'active', deadline_minute: due });
    state.run.scheduled_events.push({ schedule_id: 'S-offering', due_minute: due, priority: 20, sequence_order: 0, event_kind: 'major_incident', event_id: 'EVT_05_OFFERING_ALTAR', entry_mode: 'involuntary' });
  }
  return state;
}
