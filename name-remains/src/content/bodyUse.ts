// 선택지가 몸의 어느 부위(또는 무엇)를 쓰는가.
// 영구 상해가 그 부위를 다쳤다면 그 선택은 불리해지거나(성공률 감소·몸에 부담) 아예 고를 수 없다.
// 상해 쪽 규칙은 injuries.ts의 hinders/blocks.

export type BodyPart = 'eye' | 'hand' | 'voice' | 'shout' | 'ear' | 'breath' | 'hold' | 'run' | 'climb' | 'carry' | 'recall' | 'name' | 'shadow' | 'focus';

export const PART_LABEL: Record<BodyPart, string> = {
  eye: '눈',
  hand: '손',
  voice: '말',
  shout: '큰 소리',
  ear: '귀',
  breath: '호흡',
  hold: '숨 참기',
  run: '달리기',
  climb: '오르기',
  carry: '부축',
  recall: '기억',
  name: '이름',
  shadow: '그림자',
  focus: '정신 집중',
};

/** 아예 막힐 때 화면에 적는 이유 */
export const BLOCK_REASON: Partial<Record<BodyPart, string>> = {
  shout: '소리를 지를 수 없습니다',
  run: '달릴 수 없습니다',
  carry: '사람을 업거나 부축할 수 없습니다',
  hold: '숨을 오래 참을 수 없습니다',
};

/** 장면 id → 선택지 id → 쓰는 부위 */
const SCENE_USES: Record<string, Record<string, BodyPart[]>> = {
  EVT_01_FUNERAL_TRAIN: {
    choice_silent_ticket: ['hand'],
    choice_seal_door: ['hand'],
    choice_conceal_name: ['name'],
    choice_reader_memory: ['recall', 'focus'],
    choice_reader_variant: ['recall', 'eye'],
    choice_escape_with_neighbor: ['carry', 'run'],
    choice_escape_alone: ['run'],
  },
  EVT_02_ROOM_404: {
    choice_witness_correction: ['hand'],
    choice_takeover_404: ['name'],
    choice_neighbor_shelter: ['voice'],
    choice_reader_404: ['recall'],
    choice_reader_404_variant: ['recall', 'eye'],
    choice_answer_knock: ['voice'],
    choice_endure_dawn: ['focus'],
  },
  EVT_03_BLOCKADE_BREAK: {
    choice_negotiate_pass: ['voice'],
    choice_drain: ['climb'],
    choice_lure_monster: ['run'],
  },
  EVT_04_WINDOW_IMITATOR: {
    choice_password: ['voice'],
    choice_seal_window: ['hand'],
    choice_hide_silent: ['hold'],
    choice_promise_code: ['voice'],
  },
  EVT_05_OFFERING_ALTAR: {
    choice_blank_name: ['run', 'hand'],
    choice_call_envoy: ['voice'],
    choice_break_seal: ['run'],
    choice_effigy_swap: ['hand', 'name'],
    choice_last_struggle: ['hand'],
  },
  EVT_06_LAST_COURTYARD: {
    choice_breath: ['breath'],
    choice_back_to_sea: ['ear'],
    choice_walk_through: ['breath'],
    choice_tell_today: ['voice', 'recall'],
    choice_show_seal: ['hand'],
    choice_endure_test: ['focus'],
  },
  EVT_07_GRAY_MYCELIUM: {
    choice_purge_breath: ['breath'],
    choice_hold_breath: ['hold', 'run'],
    choice_guide_wind: ['carry'],
    choice_become_hive: ['focus'],
    choice_leave_worker: ['run'],
  },
  EVT_08_UNCHARTED_SEA: {
    choice_dry_chart: ['hand'],
    choice_beacon_walk: ['hand'],
    choice_lost_memory: ['eye', 'recall'],
    choice_secure_evidence: ['climb'],
    choice_beacon_return: ['eye'],
  },
  EVT_09_RED_LINE_SURGE: {
    choice_keep_lights: ['voice', 'run'],
    choice_dispatch_squad: ['voice'],
    choice_evacuate: ['shout'],
    choice_push_line: ['hand'],
    choice_stake_hold: ['hand'],
  },
  EVT_10_GAZE_OF_DEITY: {
    choice_run: ['run'],
    choice_throw_alias: ['name'],
    choice_voice_anchor: ['ear'],
    choice_endure_gaze: ['focus', 'name'],
  },
  EVT_11_NIGHT_BUS_77: {
    choice_bus_card_reverse_tag: ['hand'],
    choice_chalk_door_on_bus: ['hand'],
    choice_reader_bus: ['recall'],
    choice_reader_bus_variant: ['recall', 'eye'],
    choice_press_stop_bell: ['shout'],
    choice_sit_still: ['eye', 'focus'],
    choice_chase_alley: ['run'],
  },
  EVT_12_MIDNIGHT_CIVIL_DESK: {
    choice_reject_stamp_defect: ['eye', 'hand'],
    choice_redaction_pen_erase: ['hand'],
    choice_stall: ['voice'],
  },
  EVT_13_REVERSE_ELEVATOR: {
    choice_hatch: ['climb'],
    choice_stake_brake: ['hand'],
    choice_chalk_exit: ['hand'],
    choice_seniors_trace: ['eye', 'recall'],
    choice_rescue_worker: ['carry', 'climb'],
    choice_climb_alone: ['climb'],
  },
  EVT_14_LOST_APT_COMPLEX: {
    choice_guide_residents_via_laundry: ['eye', 'shout'],
    choice_beacon_lead: ['shout'],
    choice_search_one_by_one: ['climb'],
  },
  EVT_15_BLACK_AUCTION: {
    choice_take_control: ['shout'],
    choice_accept_bid: ['voice'],
    choice_flee_auction: ['run'],
  },
  EVT_16_ROOFTOP_RED_MOON: {
    choice_cut_relay: ['climb', 'hand'],
    choice_drag_neighbor: ['carry'],
    choice_look_moon: ['eye'],
  },
  EVT_17_CENSORED_ARCHIVE_BREACH: {
    choice_rewrite_master_index: ['eye', 'hand'],
    choice_absorb_ink: ['eye'],
    choice_seal_and_flee: ['run'],
  },
  EVT_18_SYNDICATE_WAR: {
    choice_burn_own_debt: ['eye'],
  },
  EVT_19_MYTHIC_CLIMAX_OPS: {
    op_director: ['shout'],
    op_grand_sealer: ['hand'],
    op_ninth_legend: ['shout'],
    op_hold_line: ['run', 'carry'],
  },
  EVT_20_TRANSCENDENT_FINALE: {
    choice_called_by_ally: ['ear'],
    choice_hold_name: ['name', 'recall'],
    choice_endure_erasure: ['focus'],
    choice_return_home: ['eye'],
  },
  CALL_DEBT_COLLECTOR: { go_labor: ['carry'], negotiate: ['voice'], clause: ['eye'] },
  CALL_RELIC_HUNGER: { feed_self: ['hand'] },
  CALL_PROMISE: { promise: ['voice'] },
  PM_PROMISE: { knock_three: ['hand'] },
  PM_REVENGE: { hunt: ['run'] },
  DY_01_LATE_TAXI: { DY_01_LATE_TAXI_c1: ['voice'] },
  DY_03_OVERTIME: { DY_03_OVERTIME_c2: ['voice'] },
  DY_04_STREET_STALL: { DY_04_STREET_STALL_c2: ['ear'] },
  DY_05_GYM: { DY_05_GYM_c1: ['run'], DY_05_GYM_c2: ['run', 'hand'] },
  DY_06_ROOMMATE_RULE: { DY_06_ROOMMATE_RULE_c3: ['voice'] },
  DY_07_LOST_CHILD: { DY_07_LOST_CHILD_c2: ['hand'], DY_07_LOST_CHILD_c3: ['voice'] },
  DY_09_RAIN_UMBRELLA: { DY_09_RAIN_UMBRELLA_c2: ['run'], DY_09_RAIN_UMBRELLA_c3: ['eye'] },
  DY_10_FRIEND_DEBT: { DY_10_FRIEND_DEBT_c2: ['voice'] },
  DY_11_BLACKOUT: { DY_11_BLACKOUT_c2: ['ear'] },
  DY_12_SECOND_HAND: { DY_12_SECOND_HAND_c2: ['voice'] },
  DY_14_STUDY_GROUP: { DY_14_STUDY_GROUP_c2: ['eye'], DY_14_STUDY_GROUP_c3: ['eye'] },
  DY_17_PROMOTION_OFFER: { DY_17_PROMOTION_OFFER_c2: ['voice'] },
  DY_18_CAT: { DY_18_CAT_c2: ['eye'] },
  DY_19_DONATION: { DY_19_DONATION_c2: ['voice'] },
  DY_21_ELEVATOR_STRANGER: { DY_21_ELEVATOR_STRANGER_c2: ['voice'], DY_21_ELEVATOR_STRANGER_c3: ['eye'] },
  DY_22_PORT_FISH: { DY_22_PORT_FISH_c3: ['eye'] },
  DY_23_CHECKPOINT: { DY_23_CHECKPOINT_c1: ['voice'], DY_23_CHECKPOINT_c3: ['voice'] },
  DY_24_MENTOR_TEA: { DY_24_MENTOR_TEA_c1: ['hand'] },
  DY_25_BROKER_RUMOR: { DY_25_BROKER_RUMOR_c2: ['voice'] },
  DY_26_SQUAD_DRILL: { DY_26_SQUAD_DRILL_c1: ['run'], DY_26_SQUAD_DRILL_c2: ['hand'] },
  DY_27_INSOMNIA: { DY_27_INSOMNIA_c1: ['eye'], DY_27_INSOMNIA_c2: ['eye'] },
  DY_28_OLD_FRIEND: { DY_28_OLD_FRIEND_c2: ['voice', 'recall'] },
  DY_29_FORGOTTEN_NAME: { DY_29_FORGOTTEN_NAME_c1: ['eye', 'hand'], DY_29_FORGOTTEN_NAME_c2: ['recall'] },
  DY_30_VOLUNTEER: { DY_30_VOLUNTEER_c1: ['carry'] },
  TH_01_STAIRWELL_HAND: { TH_01_STAIRWELL_HAND_c1: ['run'], TH_01_STAIRWELL_HAND_c2: ['hand', 'shout'], TH_01_STAIRWELL_HAND_c3: ['hand'] },
  TH_02_MARKET_KNIFE: { TH_02_MARKET_KNIFE_c1: ['run'], TH_02_MARKET_KNIFE_c2: ['voice', 'eye'], TH_02_MARKET_KNIFE_c3: ['hand'] },
  TH_03_SUBWAY_PLATFORM: { TH_03_SUBWAY_PLATFORM_c1: ['run'], TH_03_SUBWAY_PLATFORM_c2: ['hand'], TH_03_SUBWAY_PLATFORM_c3: ['hand'] },
  TH_04_DOG_PACK: { TH_04_DOG_PACK_c1: ['eye', 'focus'], TH_04_DOG_PACK_c2: ['hand'], TH_04_DOG_PACK_c3: ['climb'] },
  TH_05_GAS_LEAK: { TH_05_GAS_LEAK_c1: ['hand', 'breath'], TH_05_GAS_LEAK_c2: ['hold'], TH_05_GAS_LEAK_c3: ['voice', 'focus'] },
  TH_06_COLLECTOR_ALLEY: { TH_06_COLLECTOR_ALLEY_c2: ['voice'], TH_06_COLLECTOR_ALLEY_c3: ['run'] },
  TH_07_FALLING_SIGN: { TH_07_FALLING_SIGN_c1: ['run'], TH_07_FALLING_SIGN_c2: ['carry', 'run'], TH_07_FALLING_SIGN_c3: ['eye', 'focus'] },
  TH_08_FLOOD_UNDERPASS: { TH_08_FLOOD_UNDERPASS_c1: ['hand', 'hold'], TH_08_FLOOD_UNDERPASS_c2: ['climb'], TH_08_FLOOD_UNDERPASS_c3: ['hand'] },
  TH_09_HOME_INTRUDER: { TH_09_HOME_INTRUDER_c1: ['voice', 'name', 'recall'], TH_09_HOME_INTRUDER_c2: ['run'], TH_09_HOME_INTRUDER_c3: ['eye', 'hand'] },
  TH_10_HOSPITAL_NIGHT: { TH_10_HOSPITAL_NIGHT_c1: ['breath', 'focus'], TH_10_HOSPITAL_NIGHT_c2: ['hand'], TH_10_HOSPITAL_NIGHT_c3: ['run'] },
};

/** 작은 행동이 쓰는 부위 */
const SIDE_USES: Record<string, BodyPart[]> = {
  side_look: ['eye'],
  side_aid: ['hand'],
  side_breath: ['breath'],
  side_ally: ['voice'],
  side_name: ['name', 'recall'],
  side_rule: ['eye', 'recall'],
  side_mark: ['hand'],
  side_charm: ['hand'],
  side_hide: ['hold'],
  side_listen: ['ear'],
  side_light: ['eye', 'shadow'],
};

export const usesOf = (sceneId: string, choiceId: string): BodyPart[] => SCENE_USES[sceneId]?.[choiceId] ?? [];
export const sideUsesOf = (sideId: string): BodyPart[] => SIDE_USES[sideId] ?? [];
/** 내용 검사용 */
export const ALL_SCENE_USES = SCENE_USES;
