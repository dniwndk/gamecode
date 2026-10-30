// 오파츠 효과를 런·상점·전투가 읽는 보정값으로 모은다(docs/OOPARTS_v1.md 2~5장).
// 효과 문장은 산문이라, 여기서 오파츠 ID별로 수치를 옮겨 적는다. 전설의 ★ 계승은 재료 효과를 그대로 다시 켠다.
// 시너지 단계 효과(연속 타격·조준 등)를 고치는 효과는 그 시너지 효과가 실행될 때(M3) 켜진다. 어느 쪽인지는 OOPART_SUPPORT.

/** 보유 오파츠 전체를 합친 보정값. 0·false가 기본(효과 없음). */
export interface OopartModifiers {
  // ── 정산·경제 ──
  /** 이자 계산 때 보유 골드에 더하는 값(C01) */
  interestGoldBonus: number;
  /** 이자 상한 증감(U12 −3) */
  interestCapDelta: number;
  /** 정산마다 고정 골드(R09) */
  settlementGold: number;
  /** 전투 종료 XP 증감(C04) */
  battleXpBonus: number;
  /** 패배 시 런 체력 피해 감소(C06 2, L04 3). 최소 1 */
  defeatDamageReduction: number;
  /** 전투가 끝날 때마다 런 체력 감소(R08) */
  runHpLossPerBattle: number;
  /** 런 체력이 처음 0이 되면 이 값으로 버틴다(L04, 최종 보스 패배 제외). 0이면 없음 */
  lastStandHp: number;
  /** 합성 완성 골드: 2성, 3성(U14) */
  mergeGold: [number, number];
  // ── 상점 ──
  shopSlots: number | null;
  recommendedChanceBps: number | null;
  rerollCost: number | null;
  /** 레벨업 직후 첫 갱신의 1번 칸을 그 레벨 최고 코스트로(C03) */
  levelUpTopCostSlot: boolean;
  /** 마지막 칸을 "다음 성급까지 남은 복사본이 가장 적은 보유 학생"으로(L01 아로나 추천) */
  aronaSlot: boolean;
  /** 아로나 칸으로 합성이 완성되면 XP(L01) */
  aronaMergeXp: number;
  /** 잠가도 노드 진입 무료 갱신이 빈칸만 채운다(L01 프라나) */
  pranaLock: boolean;
  // ── 편성·대기석 ──
  benchSlotsBonus: number;
  /** 대기석에서 판 2성 이상의 감가 없음(C05) */
  noBenchSellDepreciation: boolean;
  deployLimitBonus: number;
  /** 밀레니엄 학생 장비 칸 +1, 장착 장비 능력치 배율(R03) */
  millenniumEquipSlotBonus: number;
  millenniumEquipStatBps: number;
  // ── 전략·장 시작 ──
  strategyChoices: number | null;
  strategyPicks: number;
  /** 장 시작마다 1성 게헨나 1명 2성 승급, 없으면 골드(R02) */
  pandemonium: boolean;
  // ── 시너지 집계 ──
  /** 트리니티 학생이 출전한 동아리 시너지 +1(R04, L02) */
  trinityClubBonus: number;
  /** 트리니티·아리우스 학생이 두 진영 시너지에 모두 집계(L02) */
  edenFactions: boolean;
  // ── 전투 ──
  atkBps: number;
  critDamageBps: number;
  nonCritDamageBps: number;
  rearCritBps: number;
  /** 기본 공격 에너지 추가 획득(C09 +5) */
  basicEnergyBonus: number;
  /** 팀 SP가 0이 될 때 +2, 전투당 횟수(C07 1, L05 2) */
  spRefillUses: number;
  spMax: number | null;
  /** 아군 필살기가 해소될 때 팀 SP +1, 전역 주기당 1회(L05) */
  spOnUltimate: boolean;
  /** 첫 아군 쓰러짐 때 남은 전방 회복(최대 HP bps, C10·L03) */
  firstFallHealBps: number;
  /** 출전한 3성 1명당 최대 HP bps, 상한(U13·L03) */
  threeStarHpBps: number;
  threeStarHpCapBps: number;
  /** 3성이 처음 쓰러지면 HP 40%로 부활 + ATK +25%, 전투당 최대 인원(L03) */
  mysticRevives: number;
  /** 진영에서 혼자 출전한 학생 ATK·SPD(U15) */
  loneFactionAtkBps: number;
  loneFactionSpd: number;
  /** 200AV마다 포격, 아군 오폭 비율(U09) */
  pmcBarrage: boolean;
  pmcFriendlyFireBps: number;
  /** 아군 전방 SPD, 600AV 탈진(U11, L05는 탈진 없음) */
  frontSpd: number;
  exhaustion: boolean;
  /** 정예·보스에게 주는 피해(R05) */
  eliteBossDamageBps: number;
  /** 아군이 받는 치유·보호막 배율 감소(R08 −50%) */
  healShieldReceivedBps: number;
  /** 전방 필살기 필요 에너지(R10·L05), 전방 전투 스킬 봉인(R10, L05 해제) */
  frontUltEnergy: number | null;
  frontSkillLocked: boolean;
  // ── 진영·역할 특화(전투) ──
  /** 아비도스 학생이 쓰러지면 남은 아비도스 에너지 100, 전투당 횟수(R01 2, L04 3) */
  abydosLastStand: number;
  /** 산해경 필살기 연환(U01) */
  dragonCenser: boolean;
  /** 붉은겨울 서기장·쿠데타(U02) */
  coupOrder: boolean;
  /** 무법자 악명(U06) */
  jailbreak: boolean;
  /** 도발 중 탱커 반사(C12) */
  wolfseggReflectBps: number;
  /** 블래스터 광역 3명 이상 CRIT(C15) */
  discoCritBps: number;
  /** 힐러 2단계 넘친 치유 보호막(C16) */
  goldenFleece: boolean;
  /** 서포터 첫 스킬 쿨다운 −1(C17) */
  atlantisMedal: boolean;
  /** 컨트롤러 기절이 보스에 막히면 지연 15% + 제어 상태(C18) */
  winnipesaukee: boolean;
}

const base = (): OopartModifiers => ({
  interestGoldBonus: 0, interestCapDelta: 0, settlementGold: 0, battleXpBonus: 0, defeatDamageReduction: 0, runHpLossPerBattle: 0, lastStandHp: 0, mergeGold: [0, 0],
  shopSlots: null, recommendedChanceBps: null, rerollCost: null, levelUpTopCostSlot: false, aronaSlot: false, aronaMergeXp: 0, pranaLock: false,
  benchSlotsBonus: 0, noBenchSellDepreciation: false, deployLimitBonus: 0, millenniumEquipSlotBonus: 0, millenniumEquipStatBps: 0,
  strategyChoices: null, strategyPicks: 1, pandemonium: false, trinityClubBonus: 0, edenFactions: false,
  atkBps: 0, critDamageBps: 0, nonCritDamageBps: 0, rearCritBps: 0, basicEnergyBonus: 0, spRefillUses: 0, spMax: null, spOnUltimate: false,
  firstFallHealBps: 0, threeStarHpBps: 0, threeStarHpCapBps: 0, mysticRevives: 0, loneFactionAtkBps: 0, loneFactionSpd: 0,
  pmcBarrage: false, pmcFriendlyFireBps: 0, frontSpd: 0, exhaustion: false, eliteBossDamageBps: 0, healShieldReceivedBps: 0,
  frontUltEnergy: null, frontSkillLocked: false, abydosLastStand: 0, dragonCenser: false, coupOrder: false, jailbreak: false,
  wolfseggReflectBps: 0, discoCritBps: 0, goldenFleece: false, atlantisMedal: false, winnipesaukee: false,
});

type Apply = (m: OopartModifiers) => void;

const APPLY: Record<string, Apply> = {
  oop_nebra_disk: (m) => { m.interestGoldBonus += 4; },
  oop_roman_dodecahedron: (m) => { m.recommendedChanceBps = Math.max(m.recommendedChanceBps ?? 0, 8000); },
  oop_antikythera: (m) => { m.levelUpTopCostSlot = true; },
  oop_phaistos_disc: (m) => { m.battleXpBonus += 1; },
  oop_haniwa: (m) => { m.benchSlotsBonus += 1; m.noBenchSellDepreciation = true; },
  oop_okiku_doll: (m) => { m.defeatDamageReduction += 2; },
  oop_baghdad_battery: (m) => { m.spRefillUses = Math.max(m.spRefillUses, 1); },
  oop_nimrud_lens: (m) => { m.rearCritBps += 1000; },
  oop_aether_essence: (m) => { m.basicEnergyBonus += 5; },
  oop_mandragora: (m) => { m.firstFallHealBps = Math.max(m.firstFallHealBps, 800); },
  oop_voynich: (m) => { m.strategyChoices = Math.max(m.strategyChoices ?? 0, 4); },
  oop_wolfsegg_steel: (m) => { m.wolfseggReflectBps = 1500; },
  oop_disco_colgante: (m) => { m.discoCritBps = 2000; },
  oop_golden_fleece: (m) => { m.goldenFleece = true; },
  oop_atlantis_medal: (m) => { m.atlantisMedal = true; },
  oop_winnipesaukee_stone: (m) => { m.winnipesaukee = true; },
  oop_dragon_censer: (m) => { m.dragonCenser = true; },
  oop_coup_order: (m) => { m.coupOrder = true; },
  oop_jailbreak_kit: (m) => { m.jailbreak = true; },
  oop_halo_fragment: (m) => { m.threeStarHpBps = 400; m.threeStarHpCapBps = 2000; },
  oop_momofriends_box: (m) => { m.mergeGold = [m.mergeGold[0] + 1, m.mergeGold[1] + 4]; },
  oop_gsc_pass: (m) => { m.loneFactionAtkBps += 2000; m.loneFactionSpd += 8; },
  oop_pmc_contract: (m) => { m.pmcBarrage = true; m.pmcFriendlyFireBps = 4000; },
  oop_black_market_ammo: (m) => { m.critDamageBps += 4000; m.nonCritDamageBps -= 1000; },
  oop_energy_drink: (m) => { m.frontSpd += 15; m.exhaustion = true; },
  oop_black_market_card: (m) => { m.rerollCost = 1; m.interestCapDelta -= 3; },
  oop_foreclosure_photo: (m) => { m.abydosLastStand = Math.max(m.abydosLastStand, 2); },
  oop_pandemonium_summons: (m) => { m.pandemonium = true; },
  oop_millennium_prize: (m) => { m.millenniumEquipSlotBonus = 1; m.millenniumEquipStatBps = 5000; },
  oop_trinity_club_charter: (m) => { m.trinityClubBonus = 1; },
  oop_prophecy_circuit: (m) => { m.eliteBossDamageBps += 2000; },
  oop_schale_annex_key: (m) => { m.shopSlots = Math.max(m.shopSlots ?? 0, 6); },
  oop_empty_chair: (m) => { m.deployLimitBonus += 1; },
  oop_afterglow_of_color: (m) => { m.atkBps += 3500; m.healShieldReceivedBps -= 5000; m.runHpLossPerBattle += 2; },
  oop_gematria_contract: (m) => { m.settlementGold += 4; },
  oop_prototype_zero: (m) => { m.frontUltEnergy = 70; m.frontSkillLocked = true; },
  // ── 전설: ★는 재료 효과를 다시 켜고, 대가는 없앤다(1.3 「정화」) ──
  oop_shittim_chest: (m) => {
    m.shopSlots = 6; m.recommendedChanceBps = 8000; m.strategyChoices = 4; m.strategyPicks = 2;
    m.aronaSlot = true; m.aronaMergeXp = 2; m.pranaLock = true;
  },
  oop_eden_treaty: (m) => { m.trinityClubBonus = 1; m.edenFactions = true; },
  oop_nameless_relic: (m) => {
    m.atkBps += 3500; m.threeStarHpBps = 400; m.threeStarHpCapBps = 2000; m.firstFallHealBps = Math.max(m.firstFallHealBps, 800); m.mysticRevives = 2;
  },
  oop_yume_notebook: (m) => { m.abydosLastStand = 3; m.rerollCost = 1; m.defeatDamageReduction += 3; m.lastStandHp = 20; },
  oop_prototype_infinity: (m) => {
    m.frontUltEnergy = 70; m.frontSkillLocked = false; m.frontSpd += 15; m.spRefillUses = 2; m.spMax = 6; m.spOnUltimate = true;
  },
};

/** 보유 오파츠(획득 순)의 보정값을 합친다. 전설은 재료를 지우고 들어오므로 겹쳐 세지 않는다. */
export function oopartModifiers(owned: readonly string[]): OopartModifiers {
  const m = base();
  for (const id of [...owned].sort()) APPLY[id]?.(m);
  // L05가 있으면 탈진 없음, 스킬 봉인 해제(재료 R10·U11의 대가 제거)
  if (owned.includes('oop_prototype_infinity')) { m.exhaustion = false; m.frontSkillLocked = false; }
  return m;
}

export type OopartSupportLevel = 'active' | 'partial' | 'pending';
export interface OopartSupport {
  level: OopartSupportLevel;
  /** partial·pending일 때 아직 작동하지 않는 부분 */
  waiting?: string;
}

const WAIT = '시너지 단계 효과가 전투에 들어오면(M3) 작동';
/** 지금 빌드에서 어디까지 작동하는지. 목록에 없는 오파츠는 전부 작동(active). */
const SUPPORT: Record<string, OopartSupport> = {
  oop_wolfsegg_steel: { level: 'partial', waiting: `탱커 3단계 시작 도발과의 연결은 ${WAIT}` },
  oop_istanbul_rocket: { level: 'pending', waiting: `어태커 3단계 "연속 타격" ${WAIT}` },
  oop_quimbaya_plane: { level: 'pending', waiting: `스나이퍼 "조준" ${WAIT}` },
  oop_golden_fleece: { level: 'partial', waiting: `힐러 4단계 전환량 +50%는 ${WAIT}` },
  oop_zero_star_review: { level: 'pending', waiting: `미식연구회 "별점 0개" ${WAIT}` },
  oop_tsc_first_edition: { level: 'pending', waiting: `게임개발부 "버그" ${WAIT}` },
  oop_half_donut: { level: 'pending', waiting: `생활안전국 "농땡이" ${WAIT}` },
  oop_wrong_answer_note: { level: 'pending', waiting: `보충수업부 "합격" ${WAIT}` },
  oop_dessert_stamp: { level: 'pending', waiting: `디저트부 "디저트 타임" ${WAIT}` },
  oop_hot_spring_map: { level: 'pending', waiting: `온천개발부 폭파 ${WAIT}` },
  oop_tsurugi_novel: { level: 'pending', waiting: `정의실현위원회 "정의 집행" ${WAIT}` },
  oop_coup_order: { level: 'partial', waiting: `체리노 수염 쿠데타·"숙청 표적"은 ${WAIT}` },
  oop_arrest_warrant: { level: 'pending', waiting: `발키리 "수배자" ${WAIT}` },
  oop_rabbit_radio: { level: 'pending', waiting: `SRT 반응 지원 ${WAIT}` },
  oop_express_ticket: { level: 'pending', waiting: `하이랜더 "급행열차 충격파" ${WAIT}` },
  oop_onibi_seal: { level: 'pending', waiting: `백귀야행 true 피해 ${WAIT}` },
  oop_squad_manual: { level: 'pending', waiting: `아리우스 디버프 ${WAIT}` },
  oop_foreclosure_photo: { level: 'partial', waiting: `아비도스 "합동 사격" 한도 무시는 ${WAIT}` },
  oop_millennium_prize: { level: 'partial', waiting: `밀레니엄 시너지 보호막 중 +100%는 ${WAIT}` },
  oop_prophecy_circuit: { level: 'partial', waiting: '보스 HP 임계 패턴 피해 감소는 보스 패턴이 전투에 들어오면(M2) 작동' },
  oop_empty_chair: { level: 'partial', waiting: `플래티넘 「학원 대항전」 조건은 ${WAIT}` },
  oop_eden_treaty: { level: 'partial', waiting: `디버프 전염은 ${WAIT}` },
  oop_yume_notebook: { level: 'partial', waiting: `아비도스 "합동 사격"과의 연결은 ${WAIT}` },
};

export function oopartSupport(id: string): OopartSupport {
  return SUPPORT[id] ?? { level: 'active' };
}
