// 미리보기 세션 — 코어 런 reducer(M1)가 나오기 전에 화면을 실제로 눌러 볼 수 있게 하는 목(mock).
//
// 상점 추첨·오파츠 보상·조합·런 스택 정산은 app/runRules.ts로 코어 규칙 함수를 그대로 부르고(v2.3 11장, OOPARTS_v1 1장),
// 전투는 v2.4부터 코어 전투 엔진(core/battle, simulateBattle)이 효과 470개를 실제로 실행한 결과를 재생한다(D-030).
// 런 진행(노드 순서·체력·수입 흐름)만 이 파일의 흉내다. 화면 컴포넌트는 이 파일을 import하지 않는다(adapter.ts만 쓴다).
// 코어가 GameSnapshot.run을 내기 시작하면 adapter.ts가 자동으로 실제 클라이언트를 쓰고, 이 폴더는 지운다.
import type { CommandResult, ContentCatalog, GameCommandType, GameSnapshot, RunPhase } from '../../../app/gameClient';
import type { BaseStats, NodeDefinition, OopartSourceId, UnitDefinition } from '../../../core/types/content';
import {
  acquireOopart, costOdds, emptyOopartProfile, emptyRunStacks, resolveAwakenings, runStackLines, settleRunStacks, stackBattleBonuses, oopartModifiers, oopartSupport, emptyOopartRunState, markRescueUsed, oopartSkipGold, recipeBadge, rescueDue, Rng, rollOopartOffer,
  rollShopDetailed, simulateBattle, synergyCondition, type BattleAllyInput, type OopartModifiers, type RunStacks, type OopartProfile, type OopartRunState,
} from '../../../app/runRules';
import type {
  BattleEventView, BattleView, Cue, ResultView, RunView, ShopSlotView, SynergyStateView, UiDriver, UiState,
  UnitInstanceView, Zone,
} from '../model';

interface Inst { instanceId: string; unitId: string; star: 1 | 2 | 3; equipment: string[] }

interface RunState {
  seed: string;
  chapter: number;
  battle: number;
  runHp: number;
  gold: number;
  level: number;
  xp: number;
  streak: { kind: 'win' | 'loss' | null; count: number };
  strategies: string[];
  front: (Inst | null)[];
  rear: (Inst | null)[];
  bench: (Inst | null)[];
  stash: string[];
  shop: (string | null)[];
  /** 칸마다 추천 모드로 뽑혔는지(「추천」 표시) */
  shopRec: boolean[];
  locked: boolean;
  tracked: string | null;
  chosen: 'A' | 'B';
  history: ('win' | 'loss' | null)[];
  offers: RunView['offers'];
  lastBattle?: BattleView;
  lastResult?: ResultView;
  recruited: Set<string>;
  deployed: Set<string>;
  /** 오파츠 보유 상태와 OOPART_CHOICE 제안. after: 고른 뒤 준비 단계로 갈지, 다음 노드로 넘어갈지 */
  oop: OopartRunState;
  oopOffer: { ids: string[]; source: OopartSourceId; grant: boolean; after: 'prep' | 'advance' } | null;
  oopStartDone: boolean;
  runHpMax: number;
  /** 이번 장 전략 선택에서 더 고를 수 있는 수(L01 4택2) */
  strategyPicksLeft: number;
  /** 레벨업 뒤 아직 상점을 갱신하지 않음(C03) */
  levelUpPending: boolean;
  /** 「후배들을 부탁해」(L04)를 이미 썼는지 */
  lastStandUsed: boolean;
  /** 이번 준비 단계에서 쓴 무료 새로고침(R06·L01) */
  freeRerollsUsed: number;
  /** 런 동안 쌓이는 시너지 스택(코어 runStacks) */
  stacks: RunStacks;
  /** 각성을 마친 원래 학생(상점·판매 규칙) */
  awakenedFrom: Set<string>;
  /** 그 판에 각성한 형태. 각성 뒤로 상점에 나온다(v2.4.11) */
  awakenedInto: Set<string>;
  /** 독립 RNG 스트림(12.2): 상점, 보상 */
  shopRng: Rng;
  rewardRng: Rng;
}

// v2: 전투 엔진 배포(D-030) 때 이전 기록(레시피 공개)을 비웠다. 옛 키는 읽지 않고 지운다.
const PROFILE_KEY = 'kivotos-oopart-profile-v2';
const OLD_PROFILE_KEYS = ['kivotos-oopart-profile'];
function loadProfile(): OopartProfile {
  try {
    for (const k of OLD_PROFILE_KEYS) localStorage.removeItem(k);
    const v = JSON.parse(localStorage.getItem(PROFILE_KEY) ?? 'null') as OopartProfile | null;
    return v && Array.isArray(v.revealedRecipes) ? { revealedRecipes: v.revealedRecipes.filter((x) => typeof x === 'string') } : emptyOopartProfile();
  } catch { return emptyOopartProfile(); }
}
function saveProfile(p: OopartProfile) {
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch { /* 저장 불가 환경: 이번 세션에만 남는다 */ }
}

/** 미리보기 전용 시드 난수(mulberry32) */
function rng(seed: number) {
  let a = seed >>> 0 || 0x9e3779b9;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** opts.ooparts: 새 런을 이 오파츠를 가진 채로 시작(테스트·확인용) */
export function createPreviewSession(catalog: ContentCatalog, base: GameSnapshot, opts: { ooparts?: string[] } = {}): UiDriver {
  const { pack, rules } = catalog;
  const unitById = new Map(pack.units.map((u) => [u.id, u]));
  const enemyById = new Map(pack.enemies.map((e) => [e.id, e]));
  const eqById = new Map(pack.equipment.map((e) => [e.id, e]));
  const synById = new Map(pack.synergies.map((s) => [s.id, s]));
  let rand = rng(20261030);
  let nextId = 1;
  const newInst = (unitId: string, star: 1 | 2 | 3 = 1, equipment: string[] = []): Inst => ({ instanceId: `i${nextId++}`, unitId, star, equipment });

  let phase: RunPhase = 'HOME';
  let revision = base.revision;
  // 배포본은 진행 기록 없이 시작한다(2026-10-31 사용자 지시: 견본 진행 「이어하기」 제거)
  let run: RunState | null = null;
  let cueId = 0;
  let cues: Cue[] = [];
  let profile = loadProfile();
  const supportMap = Object.fromEntries(pack.ooparts.map((o) => [o.id, oopartSupport(o.id)]));
  const listeners = new Set<(s: UiState) => void>();

  // ── 파생 값 ─────────────────────────────────────────────
  const node = (r: RunState): NodeDefinition => pack.nodes.find((n) => n.chapter === r.chapter && n.battle === r.battle) ?? pack.nodes[0];
  const xpToNext = (lv: number) => rules.xp.xpToNext[String(lv)] ?? null;
  const all = (r: RunState) => [...r.front, ...r.rear, ...r.bench].filter((x): x is Inst => !!x);
  const deployedInsts = (r: RunState) => [...r.front, ...r.rear].filter((x): x is Inst => !!x);
  /** 보유 오파츠 보정(코어 oopartModifiers) */
  const mods = (r: RunState): OopartModifiers => oopartModifiers(r.oop.owned);
  const isMillennium = (unitId: string) => unitById.get(unitId)!.synergyIds.includes('syn_millennium');
  const sellValue = (i: Inst, r?: RunState) => {
    const fromBench = !!r && r.bench.includes(i) && mods(r).noBenchSellDepreciation;
    return unitById.get(i.unitId)!.cost * 3 ** (i.star - 1) - (i.star >= rules.sell.depreciationFromStar && !fromBench ? rules.sell.depreciationGold : 0);
  };
  const benchSize = (r: RunState) => rules.board.benchSlots + mods(r).benchSlotsBonus;
  const deployLimit = (r: RunState) => Math.min(rules.run.maxLevel, r.level + mods(r).deployLimitBonus);
  const equipSlots = (r: RunState, unitId: string) => rules.units.equipmentSlots + (isMillennium(unitId) ? mods(r).millenniumEquipSlotBonus : 0);
  // 샬레 별관 열쇠(R06·L01): 준비 단계마다 첫 새로고침 무료
  // 「골드 카드」(노노미): 출전한 전투 다음 준비 단계 첫 새로고침 무료
  const rerollCost = (r: RunState) => (r.stacks.goldCardReroll || r.freeRerollsUsed < mods(r).freeRerollPerPrep ? 0 : mods(r).rerollCost ?? rules.shop.rerollCost);
  const strategyChoices = (r: RunState) => mods(r).strategyChoices ?? 3;
  /** 대기석 칸 수를 오파츠에 맞춘다(C05: 9 → 10). 줄어드는 일은 없다. */
  function fitBench(r: RunState) { while (r.bench.length < benchSize(r)) r.bench.push(null); }
  const placeable = (u: UnitDefinition) => ({ front: u.position !== 'rear_only', rear: u.position !== 'front_only' });

  function stats(i: Inst, r: RunState | null = run): BaseStats {
    const u = unitById.get(i.unitId)!;
    const eqMul = 1 + (r && isMillennium(i.unitId) ? mods(r).millenniumEquipStatBps : 0) / 10000;
    const m = rules.units.starStatMultiplierBps[i.star - 1] / 10000;
    const s: BaseStats = { hp: Math.round(u.baseStats.hp * m), atk: Math.round(u.baseStats.atk * m), def: u.baseStats.def, spd: u.baseStats.spd, critBps: u.baseStats.critBps, critDamageBps: u.baseStats.critDamageBps };
    for (const id of i.equipment) {
      const e = eqById.get(id);
      if (!e) continue;
      for (const [k, v] of Object.entries(e.stats)) s[k as keyof BaseStats] += Math.round((v ?? 0) * eqMul);
    }
    return s;
  }

  function synergyCounts(r: RunState, extra?: string): Map<string, number> {
    const counts = new Map<string, Set<string>>();
    const add = (unitId: string, zone: 'front' | 'rear') => {
      for (const sid of unitById.get(unitId)!.synergyIds) {
        const syn = synById.get(sid);
        if (!syn) continue;
        if (syn.countScope === 'front_only' && zone !== 'front') continue;
        if (syn.countScope === 'rear_only' && zone !== 'rear') continue;
        if (!counts.has(sid)) counts.set(sid, new Set());
        counts.get(sid)!.add(unitId);
      }
    };
    r.front.forEach((i) => i && add(i.unitId, 'front'));
    r.rear.forEach((i) => i && add(i.unitId, 'rear'));
    if (extra) add(extra, placeable(unitById.get(extra)!).front ? 'front' : 'rear');
    const om = mods(r);
    // 에덴 조약(L02): 트리니티·아리우스 학생은 두 진영 시너지에 모두 집계
    if (om.edenFactions) {
      const both = new Set([...(counts.get('syn_trinity') ?? []), ...(counts.get('syn_arius') ?? [])]);
      if (both.size) { counts.set('syn_trinity', new Set(both)); counts.set('syn_arius', new Set(both)); }
    }
    const out = new Map([...counts].map(([k, v]) => [k, v.size]));
    // 트리니티 동아리 연합 인가증(R04): 트리니티 학생이 있는 동아리 시너지는 +1(이스터에그 제외)
    if (om.trinityClubBonus) {
      for (const [sid, ids] of counts) {
        if (synById.get(sid)?.category !== 'club') continue;
        if ([...ids].some((id) => unitById.get(id)!.synergyIds.includes('syn_trinity'))) out.set(sid, ids.size + om.trinityClubBonus);
      }
    }
    return out;
  }

  /** 지금 켜진 시너지와 단계 index */
  const activeTierMap = (r: RunState): Record<string, number> => Object.fromEntries(synergyStates(r).filter((x) => x.activeTier !== null).map((x) => [x.synergyId, x.activeTier!]));

  function synergyStates(r: RunState): SynergyStateView[] {
    const counts = synergyCounts(r);
    // 이스터에그: 3성 조건(v2.3 1장)과 명단 없는 특수 집계(학원 대항전·총력전 만점)는 코어 synergyCondition이 판정한다
    const deployedUnits = deployedInsts(r).map((i) => ({ unitId: i.unitId, star: i.star }));
    const conditions = new Map<string, { count: number; met: boolean }>();
    for (const syn of pack.synergies) {
      const c = synergyCondition(pack, syn.id, deployedUnits);
      if (!c) continue;
      conditions.set(syn.id, c);
      if (c.count > 0) counts.set(syn.id, c.count);
      else counts.delete(syn.id);
    }
    const out: SynergyStateView[] = [];
    for (const [sid, count] of counts) {
      const syn = synById.get(sid)!;
      const cond = conditions.get(sid);
      let activeTier: number | null = null;
      syn.tiers.forEach((t, idx) => { if (count >= t.threshold && (!cond || cond.met)) activeTier = idx; });
      const next = cond && !cond.met && count >= syn.tiers[0].threshold ? syn.tiers[0].threshold : syn.tiers.find((t) => t.threshold > count)?.threshold ?? null;
      out.push({ synergyId: sid, count, nextThreshold: next, activeTier, tracked: r.tracked === sid, stacks: runStackLines(r.stacks, sid, r.awakenedFrom.size > 0) });
    }
    if (r.tracked && !counts.has(r.tracked)) out.push({ synergyId: r.tracked, count: 0, nextThreshold: synById.get(r.tracked)!.tiers[0].threshold, activeTier: null, tracked: true, stacks: runStackLines(r.stacks, r.tracked, r.awakenedFrom.size > 0) });
    const rank = (s: SynergyStateView) => (s.activeTier !== null ? 0 : s.nextThreshold !== null && s.nextThreshold - s.count === 1 ? 1 : 2);
    return out.sort((a, b) => rank(a) - rank(b) || (b.activeTier ?? -1) - (a.activeTier ?? -1) || b.count - a.count);
  }

  function shopPreview(r: RunState, unitId: string): ShopSlotView['preview'] {
    const copies = all(r).filter((i) => i.unitId === unitId && i.star === 1).length;
    const star2 = all(r).filter((i) => i.unitId === unitId && i.star === 2).length;
    const mergesTo = copies === 2 ? (star2 === 2 ? 3 : 2) : undefined;
    const synergyDelta: ShopSlotView['preview']['synergyDelta'] = [];
    if (!deployedInsts(r).some((i) => i.unitId === unitId)) {
      const before = synergyCounts(r);
      const after = synergyCounts(r, unitId);
      for (const [sid, to] of after) {
        const from = before.get(sid) ?? 0;
        if (to !== from) synergyDelta.push({ synergyId: sid, from, to });
      }
    }
    return { mergesTo, synergyDelta };
  }

  const odds = (level: number): number[] => costOdds(pack, level);

  /** 코어 상점 추첨(v2.3 11장): 코스트별 장수 제한, 3성 보유 학생 제외. 남은 장수는 소유 학생에서 매번 계산한다. */
  function rollShop(r: RunState, keepOffered = false) {
    const m = mods(r);
    const fresh = rollShopDetailed(pack, {
      level: r.level, owned: all(r).map((i) => ({ unitId: i.unitId, star: i.star })), trackedSynergyId: r.tracked, awakenedFromIds: r.awakenedFrom, awakenedIntoIds: r.awakenedInto,
      slots: m.shopSlots ?? undefined, recommendedChanceBps: m.recommendedChanceBps ?? undefined,
      topCostFirstSlot: m.levelUpTopCostSlot && r.levelUpPending,
    }, r.shopRng);
    // 프라나 보조(L01): 잠근 상점은 남은 칸을 두고 빈칸만 새로 채운다
    r.shopRec = keepOffered ? fresh.recommended.map((rec, k) => (r.shop[k] ? !!r.shopRec[k] : rec)) : fresh.recommended;
    r.shop = keepOffered ? fresh.slots.map((id, k) => r.shop[k] ?? id) : fresh.slots;
    r.levelUpPending = false;
  }

  /** 만마전 비상 소집령(R02): 장 시작마다 1성 게헨나 중 최고 코스트(동률은 먼저 얻은 순) 1명을 2성으로, 없으면 4G */
  function pandemonium(r: RunState) {
    if (!mods(r).pandemonium) return;
    const pick = all(r).filter((i) => i.star === 1 && unitById.get(i.unitId)!.synergyIds.includes('syn_gehenna'))
      .sort((a, b) => unitById.get(b.unitId)!.cost - unitById.get(a.unitId)!.cost || Number(a.instanceId.slice(1)) - Number(b.instanceId.slice(1)))[0];
    if (!pick) { r.gold += 4; return; }
    pick.star = 2;
    cue({ kind: 'merge', unitId: pick.unitId, star: 2 });
    merge(r);
  }

  // ── 오파츠(OOPARTS_v1 1장) ───────────────────────────────
  /** 제안을 뽑아 OOPART_CHOICE로 간다. 후보가 없으면 false(그냥 다음 단계로). */
  function offerOoparts(r: RunState, source: OopartSourceId, after: 'prep' | 'advance'): boolean {
    const ids = rollOopartOffer(pack, r.oop, source, r.chapter, r.rewardRng);
    if (!ids.length) return false;
    const grant = rules.ooparts.sources.find((s) => s.id === source)!.grant;
    r.oopOffer = { ids, source, grant, after };
    phase = 'OOPART_CHOICE';
    return true;
  }

  function finishOoparts(r: RunState) {
    const after = r.oopOffer?.after ?? 'advance';
    r.oopOffer = null;
    if (after === 'prep') { if (!r.shop.length) rollShop(r); phase = 'PREPARATION'; }
    else { advanceNode(r); phase = 'NEXT_NODE'; }
  }

  /** 정예·1·2장 보스 승리 뒤 오파츠, 없으면 다음 노드로 */
  function afterRewards(r: RunState) {
    const n = node(r);
    const source: OopartSourceId | null = n.type === 'elite' ? 'elite' : n.type === 'boss' ? 'boss' : null;
    if (source && offerOoparts(r, source, 'advance')) return;
    advanceNode(r);
    phase = 'NEXT_NODE';
  }

  function levelUp(r: RunState) {
    let need = xpToNext(r.level);
    while (need !== null && r.xp >= need) {
      r.xp -= need;
      r.level++;
      r.levelUpPending = true;
      cue({ kind: 'levelup', amount: r.level });
      need = xpToNext(r.level);
    }
    if (need === null) r.xp = 0;
  }

  /** 세미나 동아리 2·4단계: 정산 이자 상한 +1/+4 (v2.4.10, 원안 +2/+4) */
  const capBonus = (r: RunState) => {
    const c = synergyCounts(r).get('syn_seminar') ?? 0;
    return c >= 4 ? 4 : c >= 2 ? 1 : 0;
  };
  function interest(r: RunState) {
    const m = mods(r);
    const cap = Math.max(0, rules.income.interest.cap + capBonus(r) + m.interestCapDelta);
    return Math.min(cap, Math.floor((r.gold + m.interestGoldBonus) / rules.income.interest.stepGold));
  }

  function defeatDamage(r: RunState, survivingFront: number): { total: number; parts: { label: string; value: number }[] } {
    const n = node(r);
    const parts = [{ label: '패배', value: rules.defeatDamage.chapterBase[r.chapter - 1] }];
    if (survivingFront && rules.defeatDamage.perSurvivingEnemyFront) parts.push({ label: `남은 적 전방 ${survivingFront}명 × ${rules.defeatDamage.perSurvivingEnemyFront}`, value: survivingFront * rules.defeatDamage.perSurvivingEnemyFront });
    if (n.type === 'elite' && rules.defeatDamage.eliteBonus) parts.push({ label: '정예', value: rules.defeatDamage.eliteBonus });
    if (n.type === 'boss' && rules.defeatDamage.bossBonus) parts.push({ label: '보스', value: rules.defeatDamage.bossBonus });
    return { total: parts.reduce((a, p) => a + p.value, 0), parts };
  }

  function view(r: RunState): RunView {
    const n = node(r);
    const inst = (i: Inst | null): UnitInstanceView | null => i && ({
      instanceId: i.instanceId, unitId: i.unitId, star: i.star, equipment: [...i.equipment], stats: stats(i),
      placeable: placeable(unitById.get(i.unitId)!), sellValue: sellValue(i, r), equipSlots: equipSlots(r, i.unitId),
    });
    const cand = n.candidates.find((c) => c.id === r.chosen) ?? n.candidates[0];
    return {
      runId: 'preview', seed: r.seed, crisisLevel: 0, chapter: r.chapter, battle: r.battle, nodeId: n.id, nodeType: n.type,
      runHp: r.runHp, runHpMax: r.runHpMax, gold: r.gold,
      nextInterestPreview: { gold: interest(r), capBonus: capBonus(r) },
      level: r.level, xp: r.xp, xpToNext: xpToNext(r.level), deployedCount: deployedInsts(r).length, deployLimit: deployLimit(r),
      streak: { ...r.streak }, strategies: [...r.strategies],
      loans: r.strategies.includes('str_kaiser_loan') ? [{ remaining: 5, perPayment: 6 }] : [],
      board: { front: r.front.map(inst), rear: r.rear.map(inst), bench: r.bench.map(inst) },
      equipmentStash: [...r.stash],
      synergies: synergyStates(r),
      shop: {
        slots: r.shop.map((id, idx) => id ? { unitId: id, cost: unitById.get(id)!.cost, recommended: !!r.shopRec[idx], preview: shopPreview(r, id) } : null),
        locked: r.locked, rerollCost: rerollCost(r), odds: odds(r.level), xpCost: rules.xp.buyCostGold,
      },
      node: {
        candidates: n.candidates.map((c) => ({ ...c, front: [...c.front], rear: [...c.rear] })),
        chosen: cand.id, defeatDamagePreview: Math.max(1, defeatDamage(r, cand.front.length).total - mods(r).defeatDamageReduction) + mods(r).runHpLossPerBattle, statScaleBps: n.statScaleBps,
      },
      nodeHistory: [...r.history],
      offers: r.offers,
      strategyPicksLeft: r.strategyPicksLeft,
      ooparts: {
        owned: [...r.oop.owned],
        offer: r.oopOffer && {
          ids: [...r.oopOffer.ids], source: r.oopOffer.source, grant: r.oopOffer.grant, skipGold: oopartSkipGold(pack),
          badges: r.oopOffer.ids.map((id) => recipeBadge(pack, r.oop, profile, id)),
        },
      },
      lastBattle: r.lastBattle, lastResult: r.lastResult,
    };
  }

  function state(): UiState {
    return {
      revision, phase, contentVersion: base.contentVersion, rulesVersion: base.rulesVersion,
      run: run && phase !== 'HOME' ? view(run) : null, hasSavedRun: !!run, cues, oopartRevealed: [...profile.revealedRecipes], oopartSupport: supportMap,
      savedRun: run ? { chapter: run.chapter, battle: run.battle, runHp: run.runHp, runHpMax: run.runHpMax, snapshot: view(run) } : undefined,
    };
  }

  function cue(c: Omit<Cue, 'id'>) {
    cues = [...cues.slice(-12), { ...c, id: ++cueId }];
  }

  function emit() {
    revision++;
    const s = state();
    for (const fn of listeners) fn(s);
  }

  const ok = (): CommandResult => { emit(); return { ok: true, revision }; };
  const no = (message: string, reason: 'RULE_VIOLATION' | 'WRONG_PHASE' | 'INVALID_PAYLOAD' = 'RULE_VIOLATION'): CommandResult => ({ ok: false, reason, message });

  function locate(r: RunState, instanceId: string): { zone: Zone; index: number } | null {
    for (const zone of ['front', 'rear', 'bench'] as const) {
      const idx = r[zone].findIndex((i) => i?.instanceId === instanceId);
      if (idx >= 0) return { zone, index: idx };
    }
    return null;
  }

  /** 합성을 끝까지 진행하고, 성급이 오른 횟수를 돌려준다(1성→2성→3성 연쇄는 2회) */
  function merge(r: RunState): number {
    let count = 0;
    for (let changed = true; changed;) {
      changed = false;
      for (const star of [1, 2] as const) {
        const groups = new Map<string, Inst[]>();
        for (const zone of ['front', 'rear', 'bench'] as const) for (const i of r[zone]) if (i && i.star === star) groups.set(i.unitId, [...(groups.get(i.unitId) ?? []), i]);
        for (const [unitId, list] of groups) {
          if (list.length < rules.units.mergeCount) continue;
          const [keep, ...rest] = list.slice(0, rules.units.mergeCount);
          for (const x of rest) {
            const at = locate(r, x.instanceId)!;
            r[at.zone][at.index] = null;
            keep.equipment = [...keep.equipment, ...x.equipment];
          }
          keep.star = (star + 1) as 2 | 3;
          keep.equipment = keep.equipment.slice(0, equipSlots(r, unitId));
          r.gold += mods(r).mergeGold[keep.star - 2];
          cue({ kind: 'merge', unitId, star: keep.star });
          changed = true;
          count++;
        }
      }
    }
    awaken(r);
    return count;
  }

  /** 각성 경험치는 「빠밤! 레벨업」 런 스택 하나로 센다(각성 표의 원래 학생 모두에게) */
  const awakeningExp = (r: RunState) => Object.fromEntries(pack.units.filter((u) => u.awakening).map((u) => [u.id, r.stacks.levelUpExp]));

  /** 각성(코어 resolveAwakenings, 9장): 경험치 + 3성 아리스 → 그 자리에서 2성 AL-1S(또는 무장 아리스, v2.4.11), 남은 아리스는 자동 판매 */
  function awaken(r: RunState) {
    const deployedIds = new Set(deployedInsts(r).map((i) => i.instanceId));
    const owned = all(r).map((i) => ({ instanceId: i.instanceId, unitId: i.unitId, star: i.star, deployed: deployedIds.has(i.instanceId), acquiredOrder: Number(i.instanceId.slice(1)) }));
    for (const plan of resolveAwakenings(pack, owned, awakeningExp(r))) {
      const at = locate(r, plan.instanceId)!;
      const inst = r[at.zone][at.index]!;
      inst.unitId = plan.intoUnitId;
      inst.star = plan.star as 1 | 2 | 3;
      for (const id of plan.autoSellInstanceIds) {
        const s = locate(r, id);
        if (!s) continue;
        const inst = r[s.zone][s.index]!;
        r.gold += sellValue(inst, r);
        r.stash.push(...inst.equipment);
        r[s.zone][s.index] = null;
      }
      r.awakenedFrom.add(plan.fromUnitId);
      r.awakenedInto.add(plan.intoUnitId);
      r.recruited.add(plan.intoUnitId);
      cue({ kind: 'awaken', unitId: plan.intoUnitId, star: plan.star });
    }
  }

  // ── 전투: 코어 전투 엔진(GDD v2.1 7~11장, 효과 470개) ────────
  function simulate(r: RunState): { battle: BattleView; result: ResultView; stacks: RunStacks } {
    const n = node(r);
    const cand = n.candidates.find((c) => c.id === r.chosen) ?? n.candidates[0];
    const om = mods(r);
    const activeTiers = activeTierMap(r);
    const stackBonus = stackBattleBonuses(pack, r.stacks, activeTiers);
    const allies: BattleAllyInput[] = [];
    r.front.forEach((i, slot) => { if (i) allies.push({ instanceId: i.instanceId, unitId: i.unitId, star: i.star, zone: 'front', slot, equipment: [...i.equipment] }); });
    r.rear.forEach((i, slot) => { if (i) allies.push({ instanceId: i.instanceId, unitId: i.unitId, star: i.star, zone: 'rear', slot, equipment: [...i.equipment] }); });
    const played = r.history.filter((x) => x !== null);
    const out = simulateBattle(pack, {
      seed: `${r.seed}|battle|${r.chapter}-${r.battle}`,
      nodeType: n.type,
      statScaleBps: n.statScaleBps,
      allies,
      enemies: [
        ...cand.front.map((s) => ({ enemyId: s.enemyId, zone: 'front' as const, slot: s.index })),
        ...cand.rear.map((s) => ({ enemyId: s.enemyId, zone: 'rear' as const, slot: s.index })),
      ],
      activeTiers,
      strategies: [...r.strategies],
      ooparts: [...r.oop.owned],
      runAtkBpsByUnit: stackBonus.atkBpsByUnit,
      fullEnergyUnitIds: stackBonus.fullEnergy,
      dessert: r.stacks.dessertPending,
      dessertHalf: played[played.length - 1] === 'loss',
      serikaWins: r.stacks.serikaWins ?? 0,
    });
    const outcome = out.outcome;
    const reason = out.reason;

    // 정산
    const before = r.runHp;
    const dmg = outcome === 'loss' && !out.aborted ? defeatDamage(r, out.survivingEnemyFront) : { total: 0, parts: [] as { label: string; value: number }[] };
    // 오파츠: 패배 피해 감소(최소 1), 전투마다 런 체력 감소(R08)
    if (outcome === 'loss' && om.defeatDamageReduction > 0) {
      const cut = Math.min(om.defeatDamageReduction, dmg.total - 1);
      if (cut > 0) { dmg.parts.push({ label: '오파츠 · 패배 피해 감소', value: -cut }); dmg.total -= cut; }
    }
    if (om.runHpLossPerBattle) { dmg.parts.push({ label: '오파츠 · 색채의 잔광', value: om.runHpLossPerBattle }); dmg.total += om.runHpLossPerBattle; }
    const income: { label: string; value: number }[] = [{ label: `${r.chapter}장 기본 수입`, value: rules.income.baseByChapter[r.chapter - 1] }];
    const streakNext = r.streak.kind === outcome ? r.streak.count + 1 : 1;
    if (outcome === 'win') income.push({ label: '승리', value: rules.income.winBonus });
    const sb = [...rules.income.streakBonus].reverse().find((b) => streakNext >= b.minStreak);
    if (sb) income.push({ label: `${streakNext}${outcome === 'win' ? '연승' : '연패'}`, value: sb.gold });
    income.push({ label: capBonus(r) ? `이자 (세미나 상한 +${capBonus(r)})` : '이자', value: interest(r) });
    if (om.settlementGold) income.push({ label: '오파츠 · 게마트리아의 계약', value: om.settlementGold });
    income.push(...out.settlementGold);
    // 빠밤! 레벨업·이름 없는 신들의 왕녀: 아리스·AL-1S의 처치 경험치(정예·보스 3)
    const levelUpKills = out.kills.filter((k) => k.unitId === 'u_aris' || k.unitId === 'u_al1s' || k.unitId === 'u_aris_armed').map((k) => ({ eliteOrBoss: k.eliteOrBoss }));
    const stackSettle = settleRunStacks(pack, r.stacks, {
      outcome, deployedUnitIds: deployedInsts(r).map((i) => i.unitId), ownedUnitIds: all(r).map((i) => i.unitId), activeTiers, levelUpKills,
    });
    income.push(...stackSettle.income);
    // 보충수업 오답노트(C22): 「합격」 골드와 같은 양의 XP
    const passXp = r.oop.owned.includes('oop_wrong_answer_note') ? stackSettle.income.filter((x) => x.label.startsWith('보충수업부 · 합격')).reduce((a, x) => a + x.value, 0) : 0;
    const contributions = out.contributions;
    const score = (x: typeof contributions[number]) => x.damage + x.healing * 1.2 + x.shield + x.rearSupport * 0.5;
    const mvp = outcome === 'win' ? [...contributions].sort((a2, b2) => score(b2) - score(a2))[0]?.unitId ?? null : null;
    const result: ResultView = {
      outcome, reason,
      runHp: { before, after: Math.max(0, before - dmg.total), breakdown: dmg.parts },
      income, xpGained: rules.xp.perBattle + om.battleXpBonus + passXp, contributions, mvpUnitId: mvp,
    };
    const battle: BattleView = {
      battleId: `${n.id}-${revision}`, nodeLabel: `${r.chapter}-${r.battle} ${cand.label}`,
      combatants: out.combatants, startSp: out.startSp, events: out.events as BattleEventView[],
    };
    return { stacks: stackSettle.next, battle, result };
  }

  function advanceNode(r: RunState) {
    if (r.battle >= rules.run.battlesPerChapter) {
      r.chapter++;
      r.battle = 1;
      const pool = pack.strategies.filter((s) => s.offer.chapters.includes(r.chapter) && !r.strategies.includes(s.id));
      r.offers = { strategies: shuffle(pool).slice(0, strategyChoices(r)).map((s) => s.id) };
      r.strategyPicksLeft = mods(r).strategyPicks;
      pandemonium(r);
    } else {
      r.battle++;
      r.offers = {};
    }
    r.chosen = 'A';
    r.freeRerollsUsed = 0;
    if (!r.locked) rollShop(r);
    else if (mods(r).pranaLock) rollShop(r, true);
  }

  function shuffle<T>(xs: T[]): T[] {
    const a = [...xs];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  function freshRun(seed: string): RunState {
    rand = rng([...seed].reduce((h, ch) => Math.imul(h ^ ch.charCodeAt(0), 16777619), 2166136261));
    const starters = shuffle(pack.units.filter((u) => u.cost === rules.run.startingUnits.cost && u.shopEligible));
    const frontCapable = starters.filter((u) => u.position !== 'rear_only').slice(0, rules.run.startingUnits.minFrontCapable);
    const rest = starters.filter((u) => !frontCapable.includes(u)).slice(0, rules.run.startingUnits.count - frontCapable.length);
    const chosen = [...frontCapable, ...rest];
    const bench: (Inst | null)[] = Array(rules.board.benchSlots).fill(null);
    chosen.forEach((u, i) => { bench[i] = newInst(u.id); });
    const r: RunState = {
      seed, chapter: 1, battle: 1, runHp: rules.run.startRunHp, gold: rules.run.startGold, level: rules.run.startLevel, xp: rules.run.startXp,
      streak: { kind: null, count: 0 }, strategies: [], front: Array(rules.board.frontSlots).fill(null), rear: Array(rules.board.rearSlots).fill(null),
      bench, stash: [], shop: [], shopRec: [], locked: false, tracked: null, chosen: 'A',
      history: Array(rules.run.chapters * rules.run.battlesPerChapter).fill(null),
      offers: {
        startingUnits: chosen.map((u) => u.id),
        bosses: pack.nodes.filter((nd) => nd.type === 'boss').map((nd) => nd.candidates[0].front.find((f) => enemyById.get(f.enemyId)?.boss)?.enemyId ?? ''),
        strategies: shuffle(pack.strategies.filter((s) => s.offer.chapters.includes(1))).slice(0, 3).map((s) => s.id),
      },
      recruited: new Set(chosen.map((u) => u.id)), deployed: new Set(),
      oop: { ...emptyOopartRunState(), owned: [...(opts.ooparts ?? [])] }, oopOffer: null, oopStartDone: false,
      runHpMax: rules.run.startRunHp, strategyPicksLeft: 1, levelUpPending: false, lastStandUsed: false, freeRerollsUsed: 0,
      stacks: emptyRunStacks(), awakenedFrom: new Set(), awakenedInto: new Set(),
      shopRng: Rng.forStream(seed, 'shop'), rewardRng: Rng.forStream(seed, 'reward'),
    };
    // 처음부터 가진 오파츠도 획득 즉시 효과를 받는다(게마트리아의 계약 −25)
    if (r.oop.owned.includes('oop_gematria_contract')) { r.runHpMax -= 25; r.runHp -= 25; }
    fitBench(r);
    if (r.oop.owned.length) {
      r.offers!.strategies = shuffle(pack.strategies.filter((s) => s.offer.chapters.includes(1))).slice(0, strategyChoices(r)).map((s) => s.id);
      r.strategyPicksLeft = mods(r).strategyPicks;
    }
    rollShop(r);
    return r;
  }

  function randomSeed() {
    const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const part = () => Array.from({ length: 4 }, () => abc[Math.floor(Math.random() * abc.length)]).join('');
    return `KIVO-${part()}-${part()}`;
  }

  // ── 명령 처리 ────────────────────────────────────────────
  async function send(type: GameCommandType, payload: Record<string, unknown> = {}): Promise<CommandResult> {
    const r = run;
    switch (type) {
      case 'NEW_RUN': {
        const seed = typeof payload.seed === 'string' && payload.seed.trim() ? payload.seed.trim().toUpperCase() : randomSeed();
        run = freshRun(seed);
        phase = 'RUN_SETUP';
        return ok();
      }
      case 'ABANDON_RUN':
        run = null; phase = 'HOME';
        return ok();
    }
    if (!r) return no('진행 중인 작전이 없어요', 'WRONG_PHASE');

    if (type === 'CONFIRM_RESULT') {
      if (phase === 'RUN_SETUP') { phase = 'STRATEGY_CHOICE'; return ok(); }
      if (phase === 'BATTLE' || phase === 'RESULT') {
        const res = r.lastResult;
        const n = node(r);
        if (!res) return no('정산할 전투가 없어요', 'WRONG_PHASE');
        if (r.runHp <= 0 || (res.outcome === 'loss' && n.type === 'boss' && r.chapter === rules.run.chapters)) { phase = 'RUN_FAILED'; return ok(); }
        if (res.outcome === 'win' && n.type === 'boss' && r.chapter === rules.run.chapters) { phase = 'RUN_COMPLETE'; return ok(); }
        if (res.outcome === 'win' && (n.type === 'elite' || n.type === 'boss')) {
          r.offers = { equipment: shuffle(pack.equipment.filter((e) => e.chapters.includes(r.chapter))).slice(0, 3).map((e) => e.id) };
          phase = 'EQUIPMENT_CHOICE';
          return ok();
        }
        // 구조 요청: 이번 패배로 연패가 기준에 닿았고 이 런에서 아직 안 받았을 때(1.2)
        if (res.outcome === 'loss' && r.streak.kind === 'loss' && rescueDue(pack, r.oop, r.streak.count)) {
          r.oop = markRescueUsed(r.oop);
          if (offerOoparts(r, 'rescue', 'advance')) return ok();
        }
        advanceNode(r);
        phase = 'NEXT_NODE';
        return ok();
      }
      if (phase === 'NEXT_NODE') {
        phase = r.battle === 1 && r.offers?.strategies?.length ? 'STRATEGY_CHOICE' : 'PREPARATION';
        return ok();
      }
      return no('지금은 넘길 수 없어요', 'WRONG_PHASE');
    }

    if (phase === 'STRATEGY_CHOICE' && type === 'CHOOSE_STRATEGY') {
      const id = String(payload.strategyId ?? '');
      if (!r.offers?.strategies?.includes(id)) return no('제안된 전략이 아니에요', 'INVALID_PAYLOAD');
      r.strategies.push(id);
      // 선생님의 권한(L01): 장마다 2개를 고른다
      r.strategyPicksLeft--;
      const rest = (r.offers?.strategies ?? []).filter((x) => x !== id);
      if (r.strategyPicksLeft > 0 && rest.length) { r.offers = { strategies: rest }; return ok(); }
      r.offers = {};
      // 런 시작 오파츠 3택1(전략 선택 직후)
      if (!r.oopStartDone) { r.oopStartDone = true; if (offerOoparts(r, 'run_start', 'prep')) return ok(); }
      if (!r.shop.length) rollShop(r);
      phase = 'PREPARATION';
      return ok();
    }
    if (phase === 'EQUIPMENT_CHOICE' && type === 'CHOOSE_EQUIPMENT') {
      const id = payload.equipmentId ? String(payload.equipmentId) : null;
      if (id) { if (!r.offers?.equipment?.includes(id)) return no('제안된 장비가 아니에요', 'INVALID_PAYLOAD'); r.stash.push(id); }
      else r.gold += 3;
      afterRewards(r);
      return ok();
    }
    if (phase === 'OOPART_CHOICE' && r.oopOffer && (type === 'CHOOSE_OOPART' || type === 'SKIP_OOPART')) {
      if (type === 'SKIP_OOPART') {
        if (r.oopOffer.grant) return no('구조 요청 오파츠는 건너뛸 수 없어요');
        r.gold += oopartSkipGold(pack);
        finishOoparts(r);
        return ok();
      }
      const id = String(payload.oopartId ?? '');
      if (!r.oopOffer.ids.includes(id)) return no('제안된 오파츠가 아니에요', 'INVALID_PAYLOAD');
      const got = acquireOopart(pack, r.oop, profile, id);
      if (!got.ok) return no(got.message);
      r.oop = got.state;
      // 게마트리아의 계약(R09): 획득 즉시 런 체력 최대치·현재치 −25(최소 1)
      if (id === 'oop_gematria_contract') { r.runHpMax = Math.max(1, r.runHpMax - 25); r.runHp = Math.max(1, Math.min(r.runHpMax, r.runHp - 25)); }
      fitBench(r);
      if (got.profile.revealedRecipes.length !== profile.revealedRecipes.length) { profile = got.profile; saveProfile(profile); }
      cue({ kind: 'oopart', oopartId: id });
      for (const m of got.merges) cue({ kind: 'oopart_merge', oopartId: m.legendaryId, consumed: m.consumed, firstReveal: m.firstReveal });
      finishOoparts(r);
      return ok();
    }
    if (phase !== 'PREPARATION') return no('준비 단계에서만 할 수 있어요', 'WRONG_PHASE');

    switch (type) {
      case 'BUY_UNIT': {
        const idx = Number(payload.slotIndex);
        const unitId = r.shop[idx];
        if (!unitId) return no('이미 영입한 칸이에요', 'INVALID_PAYLOAD');
        const cost = unitById.get(unitId)!.cost;
        if (r.gold < cost) return no(`골드가 부족해요 (${cost}G 필요, 보유 ${r.gold}G)`);
        const benchIdx = r.bench.findIndex((b) => !b);
        const merging = shopPreview(r, unitId).mergesTo;
        if (benchIdx < 0 && !merging) return no('대기석이 가득 찼어요. 학생을 판매하거나 배치해 주세요');
        r.gold -= cost;
        r.shop[idx] = null;
        const inst = newInst(unitId);
        let merges = 0;
        if (benchIdx >= 0) r.bench[benchIdx] = inst;
        else { r.bench.push(inst); merges += merge(r); r.bench = r.bench.slice(0, benchSize(r)); }
        if (!r.recruited.has(unitId)) { r.recruited.add(unitId); cue({ kind: 'recruit', unitId }); }
        merges += merge(r);
        // 아로나 추천(L01): 합성(성급 상승)이 완성될 때마다 XP. 1성→2성→3성 연쇄는 두 번
        if (merges && mods(r).aronaMergeXp) { r.xp += mods(r).aronaMergeXp * merges; levelUp(r); }
        return ok();
      }
      case 'SELL_UNIT': {
        const at = locate(r, String(payload.instanceId));
        if (!at) return no('학생을 찾을 수 없어요', 'INVALID_PAYLOAD');
        const inst = r[at.zone][at.index]!;
        r.gold += sellValue(inst, r);
        r.stash.push(...inst.equipment);
        r[at.zone][at.index] = null;
        return ok();
      }
      case 'MOVE_UNIT': {
        const from = locate(r, String(payload.instanceId));
        const to = payload.to as { zone: Zone; index: number } | undefined;
        if (!from || !to || !(to.zone in { front: 1, rear: 1, bench: 1 })) return no('옮길 위치가 올바르지 않아요', 'INVALID_PAYLOAD');
        if (from.zone === to.zone && from.index === to.index) return ok();
        const inst = r[from.zone][from.index]!;
        const occupant = r[to.zone][to.index];
        const u = unitById.get(inst.unitId)!;
        if (to.zone === 'front' && !placeable(u).front) return no(`${u.name}은(는) 후방 전용이에요. 후방 칸(R1~R6)에 배치해 주세요`);
        if (to.zone === 'rear' && !placeable(u).rear) return no(`${u.name}은(는) 전방 전용이에요. 전방 칸(F1~F4)에 배치해 주세요`);
        if (occupant && from.zone !== 'bench') {
          const ou = unitById.get(occupant.unitId)!;
          if (from.zone === 'front' && !placeable(ou).front) return no(`${ou.name}은(는) 전방에 둘 수 없어서 자리를 바꿀 수 없어요`);
          if (from.zone === 'rear' && !placeable(ou).rear) return no(`${ou.name}은(는) 후방에 둘 수 없어서 자리를 바꿀 수 없어요`);
        }
        const deploying = from.zone === 'bench' && to.zone !== 'bench' && !occupant;
        const n = deployedInsts(r).length;
        if (deploying && n >= deployLimit(r)) return no(`편성 인원이 가득 찼어요(${n}/${deployLimit(r)}). 레벨을 올리거나 다른 학생을 빼 주세요`);
        r[to.zone][to.index] = inst;
        r[from.zone][from.index] = occupant;
        if (to.zone !== 'bench') {
          const eqZone = to.zone;
          const kept = inst.equipment.filter((id) => { const z = eqById.get(id)?.zone; return z === 'both' || z === eqZone; });
          if (kept.length !== inst.equipment.length) {
            r.stash.push(...inst.equipment.filter((id) => !kept.includes(id)));
            inst.equipment = kept;
            cue({ kind: 'equip_returned', unitId: inst.unitId });
          }
          if (!r.deployed.has(inst.unitId)) { r.deployed.add(inst.unitId); cue({ kind: 'deploy', unitId: inst.unitId }); }
        }
        return ok();
      }
      case 'REROLL_SHOP':
        if (r.gold < rerollCost(r)) return no(`새로고침에 ${rerollCost(r)}G가 필요해요 (보유 ${r.gold}G)`);
        if (r.stacks.goldCardReroll) r.stacks.goldCardReroll = false;
        else if (rerollCost(r) === 0 && r.freeRerollsUsed < mods(r).freeRerollPerPrep) r.freeRerollsUsed++;
        else r.gold -= rerollCost(r);
        rollShop(r);
        return ok();
      case 'TOGGLE_SHOP_LOCK':
        r.locked = !r.locked;
        return ok();
      case 'BUY_XP': {
        const times = Math.max(1, Math.min(10, Number(payload.times ?? 1)));
        if (xpToNext(r.level) === null) return no('이미 최고 레벨이에요');
        if (r.gold < rules.xp.buyCostGold * times) return no(`골드가 부족해요 (${rules.xp.buyCostGold * times}G 필요)`);
        for (let i = 0; i < times && xpToNext(r.level) !== null; i++) {
          r.gold -= rules.xp.buyCostGold;
          r.xp += rules.xp.buyAmount;
          levelUp(r);
        }
        return ok();
      }
      case 'SET_TRACKED_SYNERGY':
        r.tracked = payload.synergyId ? String(payload.synergyId) : null;
        return ok();
      case 'CHOOSE_NODE_CANDIDATE':
        if (!node(r).candidates.some((c) => c.id === payload.candidateId)) return no('이 노드에는 그 후보가 없어요', 'INVALID_PAYLOAD');
        r.chosen = payload.candidateId as 'A' | 'B';
        return ok();
      case 'EQUIP_ITEM': {
        const at = locate(r, String(payload.instanceId));
        const eqId = String(payload.equipmentId);
        const stashIdx = r.stash.indexOf(eqId);
        if (!at || stashIdx < 0) return no('장비 또는 학생을 찾을 수 없어요', 'INVALID_PAYLOAD');
        const inst = r[at.zone][at.index]!;
        const eq = eqById.get(eqId)!;
        const u = unitById.get(inst.unitId)!;
        if (eq.zone === 'front' && !placeable(u).front) return no(`${eq.name}은(는) 전방 학생 전용이에요`);
        if (eq.zone === 'rear' && !placeable(u).rear) return no(`${eq.name}은(는) 후방 학생 전용이에요`);
        if (eq.uniquePerUnit && inst.equipment.includes(eqId)) return no('같은 장비는 한 학생에게 하나만 장착할 수 있어요');
        const replace = payload.replaceIndex === undefined ? -1 : Number(payload.replaceIndex);
        if (inst.equipment.length >= equipSlots(r, inst.unitId) && replace < 0) return no('장비 칸이 가득 찼어요. 교체할 칸을 골라 주세요');
        r.stash.splice(stashIdx, 1);
        if (replace >= 0 && inst.equipment[replace]) { r.stash.push(inst.equipment[replace]); inst.equipment[replace] = eqId; }
        else inst.equipment.push(eqId);
        return ok();
      }
      case 'UNEQUIP_ITEM': {
        const at = locate(r, String(payload.instanceId));
        if (!at) return no('학생을 찾을 수 없어요', 'INVALID_PAYLOAD');
        const inst = r[at.zone][at.index]!;
        const idx = inst.equipment.indexOf(String(payload.equipmentId));
        if (idx < 0) return no('장착한 장비가 아니에요', 'INVALID_PAYLOAD');
        r.stash.push(...inst.equipment.splice(idx, 1));
        return ok();
      }
      case 'START_BATTLE': {
        if (!r.front.some(Boolean)) return no('전방에 최소 1명이 필요해요');
        const { battle, result, stacks } = simulate(r);
        r.lastBattle = battle;
        r.lastResult = result;
        r.stacks = stacks;
        // 결과는 재생 전에 먼저 확정된다(13.3)
        r.runHp = result.runHp.after;
        // 후배들을 부탁해(L04): 런 체력이 처음 0이 되면 버틴다(최종 보스 패배 제외)
        const finalBoss = node(r).type === 'boss' && r.chapter === rules.run.chapters;
        if (r.runHp <= 0 && mods(r).lastStandHp > 0 && !r.lastStandUsed && !finalBoss) { r.runHp = mods(r).lastStandHp; r.lastStandUsed = true; result.runHp.after = r.runHp; result.runHp.breakdown.push({ label: '후배들을 부탁해 (유메의 수첩)', value: 0 }); }
        r.gold += result.income.reduce((a, b) => a + b.value, 0);
        r.xp += result.xpGained;
        levelUp(r);
        awaken(r);
        r.streak = r.streak.kind === result.outcome ? { kind: result.outcome, count: r.streak.count + 1 } : { kind: result.outcome, count: 1 };
        r.history[(r.chapter - 1) * rules.run.battlesPerChapter + r.battle - 1] = result.outcome;
        phase = 'BATTLE';
        return ok();
      }
    }
    return no(`${type}: 미리보기에서는 아직 지원하지 않아요`, 'INVALID_PAYLOAD');
  }

  return {
    catalog,
    preview: true,
    get: state,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    send,
    resume() {
      if (!run) return;
      phase = run.lastResult && run.history.every((x) => x !== null) ? 'RUN_COMPLETE' : run.oopOffer ? 'OOPART_CHOICE' : 'PREPARATION';
      emit();
    },
  };
}
