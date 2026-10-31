// 미리보기 세션 — 코어 런(M1)과 전투(M2)가 나오기 전에 화면을 실제로 눌러 볼 수 있게 하는 목(mock).
//
// ⚠ 이 파일의 수치·판정은 진짜 게임 규칙이 아니다(전투·수입 흉내). 단, 상점 추첨과 오파츠 보상·조합은
//   app/runRules.ts로 코어 규칙 함수를 그대로 부른다(v2.3 11장, OOPARTS_v1 1장). 사양서 11.2의 "가정" 모양을 그럴듯하게 채우는
//   흉내일 뿐이며, 화면 컴포넌트는 이 파일을 import하지 않는다(adapter.ts만 쓴다).
//   코어가 GameSnapshot.run을 내기 시작하면 adapter.ts가 자동으로 실제 클라이언트를 쓰고, 이 폴더는 지운다.
import type { CommandResult, ContentCatalog, GameCommandType, GameSnapshot, RunPhase } from '../../../app/gameClient';
import type { BaseStats, EnemyDefinition, NodeDefinition, OopartSourceId, UnitDefinition } from '../../../core/types/content';
import {
  acquireOopart, costOdds, emptyOopartProfile, emptyRunStacks, escalationDamageBps, resolveAwakenings, runStackLines, settleRunStacks, stackBattleBonuses, HEAD_PREFECT_SYN, oopartModifiers, oopartSupport, emptyOopartRunState, markRescueUsed, oopartSkipGold, recipeBadge, rescueDue, Rng, rollOopartOffer,
  rollShopDetailed, synergyCondition, type OopartModifiers, type RunStacks, type OopartProfile, type OopartRunState,
} from '../../../app/runRules';
import type {
  BattleEventView, BattleView, CombatantView, Cue, Ref, ResultView, RunView, ShopSlotView, SynergyStateView, UiDriver, UiState,
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
  /** 독립 RNG 스트림(12.2): 상점, 보상 */
  shopRng: Rng;
  rewardRng: Rng;
}

const PROFILE_KEY = 'kivotos-oopart-profile';
function loadProfile(): OopartProfile {
  try {
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
  let run: RunState | null = demoRun();
  let cueId = 0;
  let cues: Cue[] = [];
  let profile = loadProfile();
  const supportMap = Object.fromEntries(pack.ooparts.map((o) => [o.id, oopartSupport(o.id)]));
  const listeners = new Set<(s: UiState) => void>();

  // ── 데모 런: 사양서 11.2 권장 목 상태(2장 3전투, 골드 34, 레벨 6, 한탕 4, 금고 45G, 합성 예고 1칸, 적 후보 A/B)
  function demoRun(): RunState {
    const bench: (Inst | null)[] = Array(9).fill(null);
    bench[0] = newInst('u_serika');
    bench[1] = newInst('u_serika');
    bench[2] = newInst('u_kotama');
    bench[3] = newInst('u_haruka');
    const r: RunState = {
      seed: 'KIVO-7Q2M-SCHALE', chapter: 2, battle: 3, runHp: 62, gold: 34, level: 6, xp: 12,
      streak: { kind: 'win', count: 3 }, strategies: ['str_schale_supply', 'str_sandstorm_endurance'],
      front: [newInst('u_hoshino', 1, ['eq_heavy_ballistic_plate']), newInst('u_shiroko', 2, ['eq_abydos_goggles']), newInst('u_yuuka', 2), newInst('u_nonomi')],
      rear: [null, newInst('u_ayane'), null, newInst('u_serina'), null, null],
      bench, stash: ['eq_tactical_watch', 'eq_trinity_rosary'],
      shop: ['u_serika', 'u_aru', 'u_iori', 'u_mutsuki', 'u_akira'], shopRec: [false, false, false, false, true], locked: false, tracked: 'syn_seminar', chosen: 'A',
      history: ['win', 'win', 'loss', 'win', 'win', 'win', 'win', null, null, null, null, null, null, null, null],
      offers: {}, recruited: new Set(), deployed: new Set(),
      oop: { owned: ['oop_nebra_disk', 'oop_voynich', 'oop_nimrud_lens'], rescueUsed: false }, oopOffer: null, oopStartDone: true,
      runHpMax: rules.run.startRunHp, strategyPicksLeft: 1, levelUpPending: false, lastStandUsed: false, freeRerollsUsed: 0,
      stacks: emptyRunStacks(), awakenedFrom: new Set(),
      shopRng: Rng.forStream('KIVO-7Q2M-SCHALE', 'shop'), rewardRng: Rng.forStream('KIVO-7Q2M-SCHALE', 'reward'),
    };
    for (const i of [...r.front, ...r.rear, ...r.bench]) if (i) { r.recruited.add(i.unitId); r.deployed.add(i.unitId); }
    return r;
  }

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
      level: r.level, owned: all(r).map((i) => ({ unitId: i.unitId, star: i.star })), trackedSynergyId: r.tracked, awakenedFromIds: r.awakenedFrom,
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

  /** 세미나 동아리 2·4단계: 정산 이자 상한 +2/+4 (v2.3 4장) */
  const capBonus = (r: RunState) => {
    const c = synergyCounts(r).get('syn_seminar') ?? 0;
    return c >= 4 ? 4 : c >= 2 ? 2 : 0;
  };
  function interest(r: RunState) {
    const m = mods(r);
    const cap = Math.max(0, rules.income.interest.cap + capBonus(r) + m.interestCapDelta);
    return Math.min(cap, Math.floor((r.gold + m.interestGoldBonus) / rules.income.interest.stepGold));
  }

  function defeatDamage(r: RunState, survivingFront: number): { total: number; parts: { label: string; value: number }[] } {
    const n = node(r);
    const parts = [{ label: `${r.chapter}장 기본`, value: rules.defeatDamage.chapterBase[r.chapter - 1] }];
    if (survivingFront) parts.push({ label: `남은 적 전방 ${survivingFront}명 × ${rules.defeatDamage.perSurvivingEnemyFront}`, value: survivingFront * rules.defeatDamage.perSurvivingEnemyFront });
    if (n.type === 'elite') parts.push({ label: '정예', value: rules.defeatDamage.eliteBonus });
    if (n.type === 'boss') parts.push({ label: '보스', value: rules.defeatDamage.bossBonus });
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

  /** 각성(코어 resolveAwakenings, 9장): 경험치 15 + 3성 아리스 → 그 자리에서 3성 AL-1S, 남은 아리스는 자동 판매 */
  function awaken(r: RunState) {
    const deployedIds = new Set(deployedInsts(r).map((i) => i.instanceId));
    const owned = all(r).map((i) => ({ instanceId: i.instanceId, unitId: i.unitId, star: i.star, deployed: deployedIds.has(i.instanceId), acquiredOrder: Number(i.instanceId.slice(1)) }));
    for (const plan of resolveAwakenings(pack, owned, awakeningExp(r))) {
      const at = locate(r, plan.instanceId)!;
      r[at.zone][at.index]!.unitId = plan.intoUnitId;
      for (const id of plan.autoSellInstanceIds) {
        const s = locate(r, id);
        if (!s) continue;
        const inst = r[s.zone][s.index]!;
        r.gold += sellValue(inst, r);
        r.stash.push(...inst.equipment);
        r[s.zone][s.index] = null;
      }
      r.awakenedFrom.add(plan.fromUnitId);
      r.recruited.add(plan.intoUnitId);
      cue({ kind: 'awaken', unitId: plan.intoUnitId, star: plan.star });
    }
  }

  // ── 전투 흉내 ────────────────────────────────────────────
  function simulate(r: RunState): { battle: BattleView; result: ResultView; stacks: RunStacks } {
    const n = node(r);
    const cand = n.candidates.find((c) => c.id === r.chosen) ?? n.candidates[0];
    const scale = n.statScaleBps / 10000;
    // 오파츠 보정(코어 oopartModifiers). 전투 흉내 안에서 같은 순간에 끼워 넣는다.
    const om = mods(r);
    type Live = CombatantView & {
      atk: number; def: number; spd: number; crit: number; critDmg: number; next: number; cd: number; role: string; stunned: boolean; taunt: boolean; delayed: boolean;
      syn: string[]; dmgTakenBps: number; controlled: boolean; skillUsed: boolean; secretary: boolean; revived: boolean; reflects: number;
    };
    const live: Live[] = [];
    const mk = (ref: Ref, name: string, s: BaseStats, extra: Partial<Live>): Live => ({
      ref, name, star: 1, maxHp: s.hp, hp: s.hp, shield: 0, energy: 0, boss: false, hasHp: true,
      atk: s.atk, def: s.def, spd: s.spd, crit: s.critBps, critDmg: s.critDamageBps, next: 10000 / s.spd, cd: 0, role: '', stunned: false, taunt: false, delayed: false,
      syn: [], dmgTakenBps: 0, controlled: false, skillUsed: false, secretary: false, revived: false, reflects: 0, ...extra,
    });
    // 출전 학생 능력치 + 오파츠(ATK·3성 HP·진영 단독·후방 CRIT·전방 SPD·치명 피해)
    const factionsOf = (unitId: string) => unitById.get(unitId)!.synergyIds.filter((s) => synById.get(s)?.category === 'faction');
    const factionCount = new Map<string, number>();
    for (const id of new Set(deployedInsts(r).map((i) => i.unitId))) for (const f of factionsOf(id)) factionCount.set(f, (factionCount.get(f) ?? 0) + 1);
    // 런 스택(레벨업·보충수업·업무량)의 ATK 보정과 에너지 100 시작
    const activeTiers = activeTierMap(r);
    const stackBonus = stackBattleBonuses(pack, r.stacks, activeTiers);
    const levelUpKills: { eliteOrBoss: boolean }[] = [];
    const hpBps = Math.min(om.threeStarHpCapBps, om.threeStarHpBps * deployedInsts(r).filter((i) => i.star === 3).length);
    const allyStats = (i: Inst, zone: 'front' | 'rear'): BaseStats => {
      const s = stats(i, r);
      const fac = factionsOf(i.unitId);
      const lone = om.loneFactionAtkBps > 0 && fac.length > 0 && fac.every((f) => factionCount.get(f) === 1);
      s.atk = Math.round(s.atk * (1 + (om.atkBps + (lone ? om.loneFactionAtkBps : 0) + (stackBonus.atkBpsByUnit[i.unitId] ?? 0)) / 10000));
      if (lone) s.spd += om.loneFactionSpd;
      if (zone === 'front') s.spd += om.frontSpd;
      s.critDamageBps += om.critDamageBps;
      s.hp = Math.round(s.hp * (1 + hpBps / 10000));
      return s;
    };
    r.front.forEach((i, index) => { if (i) { const u = unitById.get(i.unitId)!; live.push(mk({ side: 'ally', zone: 'front', index }, u.name, allyStats(i, 'front'), { unitId: u.id, star: i.star, role: u.role, syn: u.synergyIds })); } });
    r.rear.forEach((i, index) => { if (i) { const u = unitById.get(i.unitId)!; live.push(mk({ side: 'ally', zone: 'rear', index }, u.name, allyStats(i, 'rear'), { unitId: u.id, star: i.star, role: u.role, syn: u.synergyIds, hasHp: false, next: 100 + index * 15 })); } });
    const addEnemy = (slot: { enemyId: string; index: number }, zone: 'front' | 'rear') => {
      const e = enemyById.get(slot.enemyId) as EnemyDefinition;
      const s = { ...e.baseStats, hp: Math.round(e.baseStats.hp * scale * 0.5), atk: Math.round(e.baseStats.atk * scale * 0.7), def: Math.round(e.baseStats.def * 0.5) };
      live.push(mk({ side: 'enemy', zone, index: slot.index }, e.name, s, { enemyId: e.id, boss: e.boss, role: e.role }));
    };
    cand.front.forEach((s) => addEnemy(s, 'front'));
    for (const l of live) if (l.unitId && stackBonus.fullEnergy.includes(l.unitId)) l.energy = 100;
    const fullEnergyAtStart = live.filter((l) => l.unitId && stackBonus.fullEnergy.includes(l.unitId));
    cand.rear.forEach((s) => addEnemy(s, 'rear'));

    const events: BattleEventView[] = [];
    // 연출용 발동 표시(결과·난수와 무관). 같은 보정을 주는 오파츠가 여럿이면 보유한 쪽 이름으로 보인다.
    const ownedOop = new Set(r.oop.owned);
    const oopOf = (...ids: string[]) => ids.find((id) => ownedOop.has(id)) ?? ids[0];
    const proc = (av: number, kind: 'synergy' | 'oopart', id: string, label: string, unit?: Live, chain?: number) => {
      events.push({ t: 'proc', av, cause: { kind, id }, label, unit: unit?.ref, ...(chain ? { chain } : {}) });
    };
    // 쿠데타 명령서(U02): 전투 시작 서기장(체리노 우선, 없으면 무작위 전방 붉은겨울)
    let coupLeft = 3;
    let coupBonus = 0;
    const makeSecretary = (l: Live, av: number) => {
      proc(av, 'oopart', 'oop_coup_order', av === 0 ? '서기장 임명' : '쿠데타! 새 서기장', l);
      l.secretary = true; l.atk = Math.round(l.atk * (1.4 + coupBonus)); l.dmgTakenBps = -2000;
      events.push({ t: 'status', av, target: l.ref, statusId: 'st_atk_up', op: 'add' }, { t: 'status', av, target: l.ref, statusId: 'st_damage_reduction', op: 'add' });
    };
    if (om.coupOrder) {
      const rw = live.filter((l) => l.ref.side === 'ally' && l.hasHp && l.syn.includes('syn_red_winter'));
      const pickRw = rw.find((l) => l.unitId === 'u_cherino') ?? rw[Math.floor(rand() * rw.length)];
      if (pickRw) makeSecretary(pickRw, 0);
    }
    const snapshot: CombatantView[] = live.map((l) => ({ ref: l.ref, unitId: l.unitId, enemyId: l.enemyId, name: l.name, star: l.star, maxHp: l.maxHp, hp: l.hp, shield: 0, energy: 0, boss: l.boss, hasHp: l.hasHp }));
    for (const l of fullEnergyAtStart) {
      proc(0, 'synergy', HEAD_PREFECT_SYN, '푹 쉬었다 · 에너지 100', l);
      events.push({ t: 'resource', av: 0, side: 'ally', energy: { unit: l.ref, value: 100 } });
    }

    const spMax = { ally: om.spMax ?? rules.battle.teamSp.max, enemy: rules.battle.teamSp.max };
    // 고대 전지(C07)·L05: 전투 시작 팀 SP +1
    const sp = { ally: Math.min(spMax.ally, rules.battle.teamSp.start + om.spStartBonus), enemy: rules.battle.teamSp.start };
    const contrib = new Map<string, { damage: number; healing: number; shield: number; rearSupport: number }>();
    const c = (l: Live) => { const k = l.unitId!; if (!contrib.has(k)) contrib.set(k, { damage: 0, healing: 0, shield: 0, rearSupport: 0 }); return contrib.get(k)!; };
    const alive = (side: 'ally' | 'enemy', zone?: 'front' | 'rear') => live.filter((l) => l.ref.side === side && l.hasHp && l.hp > 0 && (!zone || l.ref.zone === zone));
    const foe = (s: 'ally' | 'enemy') => (s === 'ally' ? 'enemy' : 'ally');
    const frontTarget = (side: 'ally' | 'enemy') => {
      const pool = alive(side, 'front');
      const t = pool.filter((l) => l.taunt);
      return (t.length ? t : pool).sort((a, b) => a.ref.index - b.ref.index)[0];
    };
    const lowest = (side: 'ally' | 'enemy') => alive(side, 'front').sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    /** 아군이 받는 치유·보호막 배율(R08 −50%) */
    const healMul = Math.max(0, 1 + om.healShieldReceivedBps / 10000);
    const healerTier2 = (synergyCounts(r).get('syn_healer') ?? 0) >= (synById.get('syn_healer')?.tiers[0]?.threshold ?? 2);

    // 행동 분류(흉내). 학생은 역할군 시너지로 먼저 나누고 역할 문구는 보조로만 본다. 문구만 보면 "방어력 파괴"·"방어 무시"
    // 딜러(히나·아즈사·AL-1S)가 도발 탱커로, "방어력 대폭 파괴 포격수"(히요리)가 보호막 지원가로 잘못 분류됐다. 적은 문구로 나눈다.
    const isRole = (l: Live, role: string) => l.syn.includes(`syn_${role}`);
    const frontSkillKind = (l: Live): 'guard' | 'control' | 'hit' => {
      if (!l.unitId) return /탱커|방어|도발|방패/.test(l.role) ? 'guard' : /제어|기절|CC|교란/.test(l.role) ? 'control' : 'hit';
      if (isRole(l, 'tank')) return 'guard';
      if (isRole(l, 'controller') || (isRole(l, 'supporter') && /기절|제어/.test(l.role))) return 'control';
      return 'hit';
    };
    const rearKind = (l: Live): 'heal' | 'shield' | 'buff' | 'attack' => {
      const heals = /치유|힐|회복/.test(l.role);
      const shields = /보호막/.test(l.role);
      if (isRole(l, 'healer')) return shields && !heals ? 'shield' : 'heal';
      if (isRole(l, 'supporter')) return heals ? 'heal' : shields ? 'shield' : 'buff';
      return 'attack';
    };

    let spRefills = 0;
    let firstFall = false;
    let revives = 0;
    let abydosUses = 0;
    let notoriety = 0;

    function heal(av: number, src: Live, t: Live, raw: number) {
      const amt = Math.min(t.maxHp - t.hp, Math.round(raw * healMul));
      t.hp += amt;
      events.push({ t: 'heal', av, source: src.ref, target: t.ref, amount: amt });
      if (src.unitId) c(src).healing += amt;
      return Math.round(raw * healMul) - amt;
    }

    /** 쓰러짐 처리: 부활(L03) → 첫 쓰러짐 회복(C10) → 아비도스 최후(R01·L04) → 쿠데타(U02) / 적이면 악명(U06) */
    function onFall(av: number, tgt: Live, by: Live | null) {
      if (tgt.ref.side === 'ally') {
        if (revives < om.mysticRevives && tgt.star === 3 && !tgt.revived) {
          proc(av, 'oopart', 'oop_nameless_relic', '신비 부활!', tgt);
          revives++; tgt.revived = true; tgt.hp = Math.round(tgt.maxHp * 0.4); tgt.atk = Math.round(tgt.atk * 1.25);
          events.push({ t: 'heal', av, source: tgt.ref, target: tgt.ref, amount: tgt.hp }, { t: 'status', av, target: tgt.ref, statusId: 'st_atk_up', op: 'add' });
          return;
        }
        events.push({ t: 'defeated', av, target: tgt.ref, by: by?.ref });
        if (!firstFall) {
          firstFall = true;
          if (om.firstFallHealBps && alive('ally', 'front').length) {
            proc(av, 'oopart', oopOf('oop_mandragora', 'oop_nameless_relic'), '첫 쓰러짐 · 전방 회복');
            for (const f of alive('ally', 'front')) heal(av, tgt, f, f.maxHp * om.firstFallHealBps / 10000);
          }
        }
        if (abydosUses < om.abydosLastStand && tgt.syn.includes('syn_abydos')) {
          const rest = alive('ally', 'front').filter((l) => l.syn.includes('syn_abydos'));
          if (rest.length) { abydosUses++; proc(av, 'oopart', oopOf('oop_foreclosure_photo', 'oop_yume_notebook'), '최후의 저항 · 에너지 충전!', tgt, abydosUses); for (const l of rest) { l.energy = 100; events.push({ t: 'resource', av, side: 'ally', energy: { unit: l.ref, value: 100 } }); } }
        }
        if (om.coupOrder && tgt.secretary && coupLeft > 0) {
          const heir = alive('ally', 'front').filter((l) => l.syn.includes('syn_red_winter')).sort((a, b) => b.atk - a.atk)[0];
          if (heir) { coupLeft--; coupBonus += 0.2; makeSecretary(heir, av); }
        }
      } else {
        events.push({ t: 'defeated', av, target: tgt.ref, by: by?.ref });
        // 빠밤! 레벨업·이름 없는 신들의 왕녀: 아리스·AL-1S의 처치 경험치(정예·보스 3)
        if (by?.unitId === 'u_aris' || by?.unitId === 'u_al1s') levelUpKills.push({ eliteOrBoss: tgt.boss || n.type === 'elite' });
        if (by && by.ref.side === 'ally' && om.jailbreak && by.syn.includes('syn_outlaw') && notoriety < 6) {
          notoriety++;
          proc(av, 'oopart', 'oop_jailbreak_kit', notoriety === 6 ? '대탈옥! 전방 일제 사격' : `악명 ${notoriety}`, by, notoriety);
          for (const l of live) if (l.ref.side === 'ally' && l.syn.includes('syn_outlaw')) l.atk = Math.round(l.atk * (1 + 0.08 * notoriety) / (1 + 0.08 * (notoriety - 1)));
          if (notoriety === 6) for (const t of alive('enemy', 'front')) hit(av, by, t, 1.35, undefined, { trueDmg: true });
        }
      }
    }

    function hit(av: number, src: Live, tgt: Live, mult: number, origin?: Ref, opt: { critBonus?: number; trueDmg?: boolean } = {}) {
      if (tgt.hp <= 0) return;
      const isCrit = rand() * 10000 < src.crit + (opt.critBonus ?? 0);
      let m = mult;
      if (src.ref.side === 'ally') {
        if (!isCrit && om.nonCritDamageBps) m *= 1 + om.nonCritDamageBps / 10000;
        if (om.eliteBossDamageBps && (tgt.boss || n.type === 'elite')) m *= 1 + om.eliteBossDamageBps / 10000;
      }
      m *= 1 + (tgt.dmgTakenBps + (tgt.controlled ? 2000 : 0)) / 10000;
      // 격화(13장): 시간 제한 대신 1000AV부터 양쪽 피해가 함께 커진다
      m *= 1 + escalationDamageBps(av, rules.battle) / 10000;
      const defMul = opt.trueDmg ? 1 : 100 / (100 + tgt.def);
      let amount = Math.max(1, Math.round(src.atk * m * defMul * (0.92 + rand() * 0.16) * (isCrit ? 1 + src.critDmg / 10000 : 1)));
      const absorbed = Math.min(tgt.shield, amount);
      tgt.shield -= absorbed;
      amount -= absorbed;
      tgt.hp = Math.max(0, tgt.hp - amount);
      events.push({ t: 'damage', av, source: src.ref, origin, target: tgt.ref, amount, crit: isCrit, shieldAbsorbed: absorbed, true: opt.trueDmg });
      if (src.unitId) { c(src).damage += amount + absorbed; if (origin) c(src).rearSupport += amount; }
      tgt.energy = Math.min(100, tgt.energy + 8);
      // 볼프세크 철편(C12): 도발 중인 아군이 받은 피해의 15%를 공격자에게(턴당 3회)
      if (om.wolfseggReflectBps && tgt.ref.side === 'ally' && tgt.taunt && tgt.reflects < 3 && src.hasHp && src.hp > 0) {
        tgt.reflects++;
        proc(av, 'oopart', 'oop_wolfsegg_steel', '피해 반사', tgt);
        const back = Math.round((amount + absorbed) * om.wolfseggReflectBps / 10000);
        if (back > 0) {
          src.hp = Math.max(0, src.hp - back);
          events.push({ t: 'damage', av, source: tgt.ref, target: src.ref, amount: back, crit: false, shieldAbsorbed: 0, true: true });
          if (tgt.unitId) c(tgt).damage += back;
          if (src.hp <= 0) onFall(av, src, tgt);
        }
      }
      if (tgt.hp <= 0) onFall(av, tgt, src);
    }

    /** 카이저 PMC 계약서(U09): 200AV마다 적 전방 1명에게 아군 최고 ATK 150%, 같은 순간 아군 전방 1명에게 그 40% */
    function pmc(av: number) {
      const shooter = live.filter((l) => l.ref.side === 'ally' && (l.hasHp ? l.hp > 0 : true)).sort((a, b) => b.atk - a.atk)[0];
      const foes = alive('enemy', 'front');
      if (!shooter || !foes.length) return;
      proc(av, 'oopart', 'oop_pmc_contract', '정기 포격', shooter.hasHp ? shooter : undefined);
      hit(av, shooter, foes[Math.floor(rand() * foes.length)], 1, shooter.hasHp ? undefined : shooter.ref);
      const mine = alive('ally', 'front');
      if (!mine.length || !om.pmcFriendlyFireBps) return;
      const t = mine[Math.floor(rand() * mine.length)];
      let amount = Math.round(shooter.atk * om.pmcFriendlyFireBps / 10000);
      const absorbed = Math.min(t.shield, amount);
      t.shield -= absorbed; amount -= absorbed; t.hp = Math.max(0, t.hp - amount);
      events.push({ t: 'damage', av, source: shooter.ref, target: t.ref, amount, crit: false, shieldAbsorbed: absorbed });
      if (t.hp <= 0) onFall(av, t, null);
    }

    let av = 0;
    let outcome: 'win' | 'loss' = 'loss';
    let reason: ResultView['reason'] = 'both_wiped';
    let nextPmc = 200;
    let escBps = 0;
    let exhausted = false;
    let spUltPulse = -1;
    let censerPulse = -1;
    let censerChain = 0;
    const censerUsed = new Set<Live>();
    // 시간 제한 없음(13장). 격화로 반드시 끝나지만, 흉내 엔진의 안전장치로 행동 수 상한을 둔다(넘으면 패배 처리).
    for (let guard = 0; guard < 4000; guard++) {
      if (!alive('enemy', 'front').length) { outcome = 'win'; reason = 'enemy_front_wiped'; break; }
      if (!alive('ally', 'front').length) { outcome = 'loss'; reason = 'ally_front_wiped'; break; }
      const actors = live.filter((l) => (l.hasHp ? l.hp > 0 : alive('ally', 'front').length > 0));
      actors.sort((a, b) => a.next - b.next);
      const a = actors[0];
      av = Math.round(a.next);
      while (om.pmcBarrage && nextPmc <= av && alive('enemy', 'front').length) { pmc(nextPmc); nextPmc += 200; }
      if (!alive('enemy', 'front').length || !alive('ally', 'front').length) continue;
      const esc = escalationDamageBps(av, rules.battle);
      if (esc !== escBps) { escBps = esc; events.push({ t: 'escalation', av, damageBps: esc }); }
      // 엔지니어부 불법 에너지 드링크(U11): 600AV부터 전방 탈진
      if (om.exhaustion && !exhausted && av >= 600) {
        exhausted = true;
        for (const l of alive('ally', 'front')) { l.spd = Math.max(10, l.spd - 30); events.push({ t: 'status', av, target: l.ref, statusId: 'st_spd_down', op: 'add' }); }
      }
      a.next += 10000 / a.spd;
      a.reflects = 0;
      events.push({ t: 'timeline', av, upcoming: actors.slice(1, 9).map((x) => x.ref) });
      if (a.stunned || a.delayed) {
        const sid = a.stunned ? 'st_stun' : 'st_delayed';
        a.stunned = false; a.delayed = false;
        events.push({ t: 'status', av, target: a.ref, statusId: sid, op: 'remove' });
        continue;
      }
      a.controlled = false;
      const side = a.ref.side;
      const enemySide = foe(side);
      if (!a.hasHp) {
        // 후방 정기 지원(님루드 렌즈 C08: 아군 후방 지원량 +10%)
        a.next = av + 160;
        const rs = side === 'ally' ? 1 + om.rearSupportBps / 10000 : 1;
        const front = alive('ally', 'front');
        events.push({ t: 'action', av, actor: a.ref, kind: 'rear', targets: front.map((f) => f.ref) });
        const rk = rearKind(a);
        if (rk === 'heal') {
          const t = lowest('ally');
          if (t) {
            const before = t.hp;
            const over = heal(av, a, t, a.atk * 2.2 * rs);
            c(a).rearSupport += t.hp - before;
            // 황금 양모(C16): 힐러 2단계가 켜져 있으면 넘친 치유의 25%를 보호막으로
            if (om.goldenFleece && healerTier2 && over > 0) { proc(av, 'oopart', 'oop_golden_fleece', '넘친 치유 → 보호막', t); const sh = Math.round(over * 0.25); t.shield += sh; events.push({ t: 'shield', av, source: a.ref, target: t.ref, amount: sh }); c(a).shield += sh; }
          }
        } else if (rk === 'shield') {
          for (const t of front) { const amt = Math.round(a.atk * 1.4 * rs * healMul); t.shield += amt; events.push({ t: 'shield', av, source: a.ref, target: t.ref, amount: amt }); c(a).shield += amt; c(a).rearSupport += amt; }
        } else if (rk === 'buff') {
          for (const t of front) { events.push({ t: 'status', av, target: t.ref, statusId: 'st_atk_up', op: 'add' }); t.atk = Math.round(t.atk * (1 + 0.08 * rs)); }
          c(a).rearSupport += 120;
        } else {
          const t = frontTarget(enemySide);
          if (t) hit(av, a, t, 1.1 * rs, a.ref);
        }
        continue;
      }
      const target = frontTarget(enemySide);
      if (!target) continue;
      const allyFront = side === 'ally' && a.ref.zone === 'front';
      const ultNeed = allyFront && om.frontUltEnergy ? om.frontUltEnergy : 100;
      if (a.energy >= ultNeed) {
        a.energy = 0;
        events.push({ t: 'action', av, actor: a.ref, kind: 'ultimate', targets: [target.ref] });
        events.push({ t: 'resource', av, side, energy: { unit: a.ref, value: 0 } });
        const pulse = Math.floor(av / rules.battle.globalPulseAv);
        let mult = 1;
        // 용의 향로(U01): 같은 전역 주기 안에서 이어진 산해경 필살기
        if (side === 'ally' && om.dragonCenser && a.syn.includes('syn_shanhaijing')) {
          if (pulse !== censerPulse) { censerPulse = pulse; censerChain = 0; censerUsed.clear(); }
          censerChain++; censerUsed.add(a);
          if (censerChain >= 2) proc(av, 'oopart', 'oop_dragon_censer', `향로 연쇄 · 피해 +${15 * (censerChain - 1)}%`, a, censerChain);
          mult = 1 + 0.15 * (censerChain - 1);
        }
        const aoe = /광역|폭발|포격/.test(a.role);
        if (aoe) {
          const ts = alive(enemySide, 'front');
          // 디스코 콜간테(C15): 블래스터 광역이 3명 이상을 맞히면 CRIT +20%
          const critBonus = side === 'ally' && om.discoCritBps && a.syn.includes('syn_blaster') && ts.length >= 3 ? om.discoCritBps : 0;
          if (critBonus) proc(av, 'oopart', 'oop_disco_colgante', '광역 치명 +20%', a);
          for (const t of ts) hit(av, a, t, 1.5 * mult, undefined, { critBonus });
        } else hit(av, a, lowest(enemySide) ?? target, 2.6 * mult);
        if (side === 'ally' && om.dragonCenser && a.syn.includes('syn_shanhaijing')) {
          const next = alive('ally', 'front').filter((l) => l !== a && l.syn.includes('syn_shanhaijing') && !censerUsed.has(l)).sort((x, y) => y.energy - x.energy)[0];
          if (next) { next.energy = Math.min(100, next.energy + 35); events.push({ t: 'resource', av, side, energy: { unit: next.ref, value: next.energy } }); }
        }
        // 프로토타입 인피니티(L05): 필살기가 해소되면 팀 SP +1(전역 주기당 1회)
        if (side === 'ally' && om.spOnUltimate && pulse !== spUltPulse) { spUltPulse = pulse; proc(av, 'oopart', 'oop_prototype_infinity', '필살기 해소 · SP +1', a); sp.ally = Math.min(spMax.ally, sp.ally + 1); events.push({ t: 'resource', av, side, sp: sp.ally }); }
      } else if (sp[side] >= 1 && a.cd <= 0) {
        sp[side]--;
        // 아틀란티스 메달(C17): 서포터의 첫 스킬은 쿨다운 −1
        a.cd = (side === 'ally' && om.atlantisMedal && a.syn.includes('syn_supporter') && !a.skillUsed ? 1 : 2) + (allyFront ? om.frontSkillCdBonus : 0);
        if (side === 'ally' && om.atlantisMedal && a.syn.includes('syn_supporter') && !a.skillUsed) proc(av, 'oopart', 'oop_atlantis_medal', '첫 스킬 쿨다운 −1', a);
        // 금지 시제품 No.0(R10): 전방 전투 스킬 쿨다운 +1턴
        a.skillUsed = true;
        // 바그다드 전지(C07)·L05: 팀 SP가 0이 되면 +2
        if (side === 'ally' && sp.ally === 0 && spRefills < om.spRefillUses) { spRefills++; proc(av, 'oopart', oopOf('oop_baghdad_battery', 'oop_prototype_infinity'), 'SP 바닥 · +2 충전', a); sp.ally = Math.min(spMax.ally, 2); }
        events.push({ t: 'action', av, actor: a.ref, kind: 'skill', targets: [target.ref] });
        events.push({ t: 'resource', av, side, sp: sp[side] });
        const fk = frontSkillKind(a);
        if (fk === 'guard') {
          const amt = Math.round(a.maxHp * 0.18 * (side === 'ally' ? healMul : 1));
          a.shield += amt; a.taunt = true;
          events.push({ t: 'shield', av, source: a.ref, target: a.ref, amount: amt });
          events.push({ t: 'status', av, target: a.ref, statusId: 'st_taunt', op: 'add' });
          if (a.unitId) c(a).shield += amt;
        } else if (fk === 'control' || rand() < 0.22) {
          hit(av, a, target, 1.3);
          if (target.hp > 0) {
            if (target.boss) {
              target.delayed = true;
              events.push({ t: 'status', av, target: target.ref, statusId: 'st_delayed', op: 'add', replacedFrom: 'st_stun' });
              // 위니퍼소키 돌(C18): 컨트롤러의 기절이 보스에 막히면 행동 15% 지연 + 1턴 받는 피해 +20%
              if (side === 'ally' && om.winnipesaukee && a.syn.includes('syn_controller')) {
                proc(av, 'oopart', 'oop_winnipesaukee_stone', '보스 행동 지연', target);
                target.next += 0.15 * (10000 / target.spd); target.controlled = true;
                events.push({ t: 'status', av, target: target.ref, statusId: 'st_vuln', op: 'add' });
              }
            } else { target.stunned = true; events.push({ t: 'status', av, target: target.ref, statusId: 'st_stun', op: 'add' }); }
          }
        } else hit(av, a, target, 1.6);
        a.energy = Math.min(100, a.energy + 30);
      } else {
        a.cd--;
        events.push({ t: 'action', av, actor: a.ref, kind: 'basic', targets: [target.ref] });
        hit(av, a, target, 1);
        sp[side] = Math.min(spMax[side], sp[side] + 1);
        a.energy = Math.min(100, a.energy + 25 + (side === 'ally' ? om.basicEnergyBonus : 0));
        events.push({ t: 'resource', av, side, sp: sp[side] });
      }
      events.push({ t: 'resource', av, side, energy: { unit: a.ref, value: a.energy } });
    }
    events.push({ t: 'end', av, outcome, reason });

    // 정산(흉내)
    const before = r.runHp;
    const survivors = alive('enemy', 'front').length;
    const dmg = outcome === 'loss' ? defeatDamage(r, survivors) : { total: 0, parts: [] as { label: string; value: number }[] };

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
    // 런 스택 정산(코어 settleRunStacks): 보충수업 합격 골드 등
    const stackSettle = settleRunStacks(pack, r.stacks, {
      outcome, deployedUnitIds: deployedInsts(r).map((i) => i.unitId), ownedUnitIds: all(r).map((i) => i.unitId), activeTiers, levelUpKills,
    });
    income.push(...stackSettle.income);
    const contributions = [...contrib].map(([unitId, v]) => ({ unitId, ...v }));
    const score = (x: typeof contributions[number]) => x.damage + x.healing * 1.2 + x.shield + x.rearSupport * 0.5;
    const mvp = outcome === 'win' ? [...contributions].sort((a2, b2) => score(b2) - score(a2))[0]?.unitId ?? null : null;
    const result: ResultView = {
      outcome, reason,
      runHp: { before, after: Math.max(0, before - dmg.total), breakdown: dmg.parts },
      income, xpGained: rules.xp.perBattle + om.battleXpBonus, contributions, mvpUnitId: mvp,
    };
    return { stacks: stackSettle.next, battle: { battleId: `${n.id}-${revision}`, nodeLabel: `${r.chapter}-${r.battle} ${cand.label}`, combatants: snapshot, startSp: { ally: Math.min(om.spMax ?? rules.battle.teamSp.max, rules.battle.teamSp.start + om.spStartBonus), enemy: rules.battle.teamSp.start }, events }, result };
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
      stacks: emptyRunStacks(), awakenedFrom: new Set(),
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
        if (unitById.get(inst.unitId)!.awakenedFrom) return no(`${unitById.get(inst.unitId)!.name}은(는) 팔 수 없어요`);
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
