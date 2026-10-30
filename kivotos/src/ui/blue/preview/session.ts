// 미리보기 세션 — 코어 런(M1)과 전투(M2)가 나오기 전에 화면을 실제로 눌러 볼 수 있게 하는 목(mock).
//
// ⚠ 이 파일의 수치·판정은 진짜 게임 규칙이 아니다. 사양서 11.2의 "가정" 모양을 그럴듯하게 채우는
//   흉내일 뿐이며, 화면 컴포넌트는 이 파일을 import하지 않는다(adapter.ts만 쓴다).
//   코어가 GameSnapshot.run을 내기 시작하면 adapter.ts가 자동으로 실제 클라이언트를 쓰고, 이 폴더는 지운다.
import type { CommandResult, ContentCatalog, GameCommandType, GameSnapshot, RunPhase } from '../../../app/gameClient';
import type { BaseStats, EnemyDefinition, NodeDefinition, UnitDefinition } from '../../../core/types/content';
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
  locked: boolean;
  tracked: string | null;
  chosen: 'A' | 'B';
  vault: { amount: number; usedChapter: number };
  history: ('win' | 'loss' | null)[];
  offers: RunView['offers'];
  lastBattle?: BattleView;
  lastResult?: ResultView;
  recruited: Set<string>;
  deployed: Set<string>;
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

export function createPreviewSession(catalog: ContentCatalog, base: GameSnapshot): UiDriver {
  const { pack, rules } = catalog;
  const unitById = new Map(pack.units.map((u) => [u.id, u]));
  const enemyById = new Map(pack.enemies.map((e) => [e.id, e]));
  const eqById = new Map(pack.equipment.map((e) => [e.id, e]));
  const synById = new Map(pack.synergies.map((s) => [s.id, s]));
  let rand = rng(20261030);
  const pick = <T,>(xs: T[]): T => xs[Math.floor(rand() * xs.length)];
  let nextId = 1;
  const newInst = (unitId: string, star: 1 | 2 | 3 = 1, equipment: string[] = []): Inst => ({ instanceId: `i${nextId++}`, unitId, star, equipment });

  let phase: RunPhase = 'HOME';
  let revision = base.revision;
  let run: RunState | null = demoRun();
  let cueId = 0;
  let cues: Cue[] = [];
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
      shop: ['u_serika', 'u_aru', 'u_iori', 'u_mutsuki', 'u_akira'], locked: false, tracked: 'syn_jackpot', chosen: 'A',
      vault: { amount: 45, usedChapter: 0 },
      history: ['win', 'win', 'loss', 'win', 'win', 'win', 'win', null, null, null, null, null, null, null, null],
      offers: {}, recruited: new Set(), deployed: new Set(),
    };
    for (const i of [...r.front, ...r.rear, ...r.bench]) if (i) { r.recruited.add(i.unitId); r.deployed.add(i.unitId); }
    return r;
  }

  // ── 파생 값 ─────────────────────────────────────────────
  const node = (r: RunState): NodeDefinition => pack.nodes.find((n) => n.chapter === r.chapter && n.battle === r.battle) ?? pack.nodes[0];
  const xpToNext = (lv: number) => rules.xp.xpToNext[String(lv)] ?? null;
  const all = (r: RunState) => [...r.front, ...r.rear, ...r.bench].filter((x): x is Inst => !!x);
  const deployedInsts = (r: RunState) => [...r.front, ...r.rear].filter((x): x is Inst => !!x);
  const sellValue = (i: Inst) => unitById.get(i.unitId)!.cost * 3 ** (i.star - 1) - (i.star >= rules.sell.depreciationFromStar ? rules.sell.depreciationGold : 0);
  const placeable = (u: UnitDefinition) => ({ front: u.position !== 'rear_only', rear: u.position !== 'front_only' });

  function stats(i: Inst): BaseStats {
    const u = unitById.get(i.unitId)!;
    const m = rules.units.starStatMultiplierBps[i.star - 1] / 10000;
    const s: BaseStats = { hp: Math.round(u.baseStats.hp * m), atk: Math.round(u.baseStats.atk * m), def: u.baseStats.def, spd: u.baseStats.spd, critBps: u.baseStats.critBps, critDamageBps: u.baseStats.critDamageBps };
    for (const id of i.equipment) {
      const e = eqById.get(id);
      if (!e) continue;
      for (const [k, v] of Object.entries(e.stats)) s[k as keyof BaseStats] += v ?? 0;
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
    return new Map([...counts].map(([k, v]) => [k, v.size]));
  }

  function synergyStates(r: RunState): SynergyStateView[] {
    const counts = synergyCounts(r);
    const out: SynergyStateView[] = [];
    for (const [sid, count] of counts) {
      const syn = synById.get(sid)!;
      let activeTier: number | null = null;
      syn.tiers.forEach((t, idx) => { if (count >= t.threshold) activeTier = idx; });
      const next = syn.tiers.find((t) => t.threshold > count)?.threshold ?? null;
      out.push({ synergyId: sid, count, nextThreshold: next, activeTier, tracked: r.tracked === sid });
    }
    if (r.tracked && !counts.has(r.tracked)) out.push({ synergyId: r.tracked, count: 0, nextThreshold: synById.get(r.tracked)!.tiers[0].threshold, activeTier: null, tracked: true });
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

  function odds(level: number): number[] {
    return rules.shop.levels.find((l) => l.level === level)?.costOddsPct ?? [100, 0, 0, 0, 0];
  }

  function rollShop(r: RunState) {
    const o = odds(r.level);
    const eligible = pack.units.filter((u) => u.shopEligible);
    r.shop = Array.from({ length: rules.shop.slots }, (_, idx) => {
      if (idx === rules.shop.recommendedSlotIndex && r.tracked) {
        const members = synById.get(r.tracked)!.memberIds.filter((id) => unitById.get(id)?.shopEligible && o[unitById.get(id)!.cost - 1] > 0);
        if (members.length) return pick(members);
      }
      let x = rand() * 100;
      let cost = 1;
      for (let c = 0; c < 5; c++) { if (x < o[c]) { cost = c + 1; break; } x -= o[c]; }
      const pool = eligible.filter((u) => u.cost === cost);
      return pick(pool.length ? pool : eligible).id;
    });
  }

  function levelUp(r: RunState) {
    let need = xpToNext(r.level);
    while (need !== null && r.xp >= need) {
      r.xp -= need;
      r.level++;
      cue({ kind: 'levelup', amount: r.level });
      need = xpToNext(r.level);
    }
    if (need === null) r.xp = 0;
  }

  function interest(gold: number) { return Math.min(rules.income.interest.cap, Math.floor(gold / rules.income.interest.stepGold)); }
  const jackpotTier = (r: RunState) => {
    const c = synergyCounts(r).get('syn_jackpot') ?? 0;
    return [6, 4, 2].find((t) => c >= t) ?? 0;
  };

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
      placeable: placeable(unitById.get(i.unitId)!), sellValue: sellValue(i),
    });
    const cand = n.candidates.find((c) => c.id === r.chosen) ?? n.candidates[0];
    const jt = jackpotTier(r);
    return {
      runId: 'preview', seed: r.seed, crisisLevel: 0, chapter: r.chapter, battle: r.battle, nodeId: n.id, nodeType: n.type,
      runHp: r.runHp, runHpMax: rules.run.startRunHp, gold: r.gold,
      nextInterestPreview: { gold: interest(r.gold) + (jt >= 4 ? 2 : jt >= 2 ? 1 : 0), jackpotTier: jt },
      vault: jt >= 2 || r.vault.amount > 0 ? {
        amount: r.vault.amount,
        canCashOut: r.vault.usedChapter !== r.chapter && r.vault.amount > 0,
        reasonIfNot: r.vault.usedChapter === r.chapter ? '이번 장에서 이미 금고를 털었어요' : r.vault.amount === 0 ? '금고가 비어 있어요' : undefined,
      } : null,
      level: r.level, xp: r.xp, xpToNext: xpToNext(r.level), deployedCount: deployedInsts(r).length, deployLimit: r.level,
      streak: { ...r.streak }, strategies: [...r.strategies],
      loans: r.strategies.includes('str_kaiser_loan') ? [{ remaining: 5, perPayment: 6 }] : [],
      board: { front: r.front.map(inst), rear: r.rear.map(inst), bench: r.bench.map(inst) },
      equipmentStash: [...r.stash],
      synergies: synergyStates(r),
      shop: {
        slots: r.shop.map((id, idx) => id ? { unitId: id, cost: unitById.get(id)!.cost, recommended: idx === rules.shop.recommendedSlotIndex && !!r.tracked, preview: shopPreview(r, id) } : null),
        locked: r.locked, rerollCost: rules.shop.rerollCost, odds: odds(r.level), xpCost: rules.xp.buyCostGold,
      },
      node: {
        candidates: n.candidates.map((c) => ({ ...c, front: [...c.front], rear: [...c.rear] })),
        chosen: cand.id, defeatDamagePreview: defeatDamage(r, cand.front.length).total, statScaleBps: n.statScaleBps,
      },
      nodeHistory: [...r.history],
      offers: r.offers,
      lastBattle: r.lastBattle, lastResult: r.lastResult,
    };
  }

  function state(): UiState {
    return {
      revision, phase, contentVersion: base.contentVersion, rulesVersion: base.rulesVersion,
      run: run && phase !== 'HOME' ? view(run) : null, hasSavedRun: !!run, cues,
      savedRun: run ? { chapter: run.chapter, battle: run.battle, runHp: run.runHp, runHpMax: rules.run.startRunHp, snapshot: view(run) } : undefined,
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

  function merge(r: RunState) {
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
            keep.equipment = [...keep.equipment, ...x.equipment].slice(0, 2);
          }
          keep.star = (star + 1) as 2 | 3;
          cue({ kind: 'merge', unitId, star: keep.star });
          changed = true;
        }
      }
    }
  }

  // ── 전투 흉내 ────────────────────────────────────────────
  function simulate(r: RunState): { battle: BattleView; result: ResultView } {
    const n = node(r);
    const cand = n.candidates.find((c) => c.id === r.chosen) ?? n.candidates[0];
    const scale = n.statScaleBps / 10000;
    type Live = CombatantView & { atk: number; def: number; spd: number; crit: number; critDmg: number; next: number; cd: number; role: string; stunned: boolean; taunt: boolean; delayed: boolean };
    const live: Live[] = [];
    const mk = (ref: Ref, name: string, s: BaseStats, extra: Partial<Live>): Live => ({
      ref, name, star: 1, maxHp: s.hp, hp: s.hp, shield: 0, energy: 0, boss: false, hasHp: true,
      atk: s.atk, def: s.def, spd: s.spd, crit: s.critBps, critDmg: s.critDamageBps, next: 10000 / s.spd, cd: 0, role: '', stunned: false, taunt: false, delayed: false, ...extra,
    });
    r.front.forEach((i, index) => { if (i) { const u = unitById.get(i.unitId)!; live.push(mk({ side: 'ally', zone: 'front', index }, u.name, stats(i), { unitId: u.id, star: i.star, role: u.role })); } });
    r.rear.forEach((i, index) => { if (i) { const u = unitById.get(i.unitId)!; live.push(mk({ side: 'ally', zone: 'rear', index }, u.name, stats(i), { unitId: u.id, star: i.star, role: u.role, hasHp: false, next: 100 + index * 15 })); } });
    const addEnemy = (slot: { enemyId: string; index: number }, zone: 'front' | 'rear') => {
      const e = enemyById.get(slot.enemyId) as EnemyDefinition;
      const s = { ...e.baseStats, hp: Math.round(e.baseStats.hp * scale * 0.5), atk: Math.round(e.baseStats.atk * scale * 0.7), def: Math.round(e.baseStats.def * 0.5) };
      live.push(mk({ side: 'enemy', zone, index: slot.index }, e.name, s, { enemyId: e.id, boss: e.boss, role: e.role }));
    };
    cand.front.forEach((s) => addEnemy(s, 'front'));
    cand.rear.forEach((s) => addEnemy(s, 'rear'));
    const snapshot: CombatantView[] = live.map((l) => ({ ref: l.ref, unitId: l.unitId, enemyId: l.enemyId, name: l.name, star: l.star, maxHp: l.maxHp, hp: l.hp, shield: 0, energy: 0, boss: l.boss, hasHp: l.hasHp }));

    const events: BattleEventView[] = [];
    const sp = { ally: rules.battle.teamSp.start, enemy: rules.battle.teamSp.start };
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

    function hit(av: number, src: Live, tgt: Live, mult: number, origin?: Ref) {
      const isCrit = rand() * 10000 < src.crit;
      let amount = Math.max(1, Math.round(src.atk * mult * (100 / (100 + tgt.def)) * (0.92 + rand() * 0.16) * (isCrit ? 1 + src.critDmg / 10000 : 1)));
      const absorbed = Math.min(tgt.shield, amount);
      tgt.shield -= absorbed;
      amount -= absorbed;
      tgt.hp = Math.max(0, tgt.hp - amount);
      events.push({ t: 'damage', av, source: src.ref, origin, target: tgt.ref, amount, crit: isCrit, shieldAbsorbed: absorbed });
      if (src.unitId) { c(src).damage += amount + absorbed; if (origin) c(src).rearSupport += amount; }
      tgt.energy = Math.min(100, tgt.energy + 8);
      if (tgt.hp <= 0) events.push({ t: 'defeated', av, target: tgt.ref, by: src.ref });
    }

    let av = 0;
    let outcome: 'win' | 'loss' = 'loss';
    let reason: ResultView['reason'] = 'timeout';
    for (let guard = 0; guard < 400; guard++) {
      if (!alive('enemy', 'front').length) { outcome = 'win'; reason = 'enemy_front_wiped'; break; }
      if (!alive('ally', 'front').length) { outcome = 'loss'; reason = 'ally_front_wiped'; break; }
      const actors = live.filter((l) => (l.hasHp ? l.hp > 0 : alive('ally', 'front').length > 0));
      actors.sort((a, b) => a.next - b.next);
      const a = actors[0];
      av = Math.round(a.next);
      if (av > rules.battle.maxAv) { av = rules.battle.maxAv; break; }
      a.next += 10000 / a.spd;
      events.push({ t: 'timeline', av, upcoming: actors.slice(1, 9).map((x) => x.ref) });
      if (a.stunned || a.delayed) {
        const sid = a.stunned ? 'st_stun' : 'st_delayed';
        a.stunned = false; a.delayed = false;
        events.push({ t: 'status', av, target: a.ref, statusId: sid, op: 'remove' });
        continue;
      }
      const side = a.ref.side;
      const enemySide = foe(side);
      if (!a.hasHp) {
        // 후방 정기 지원
        a.next = av + 160;
        const front = alive('ally', 'front');
        events.push({ t: 'action', av, actor: a.ref, kind: 'rear', targets: front.map((f) => f.ref) });
        if (/치유|힐|회복/.test(a.role)) {
          const t = lowest('ally');
          if (t) { const amt = Math.min(t.maxHp - t.hp, Math.round(a.atk * 2.2)); t.hp += amt; events.push({ t: 'heal', av, source: a.ref, target: t.ref, amount: amt }); c(a).healing += amt; c(a).rearSupport += amt; }
        } else if (/보호막|방어/.test(a.role)) {
          for (const t of front) { const amt = Math.round(a.atk * 1.4); t.shield += amt; events.push({ t: 'shield', av, source: a.ref, target: t.ref, amount: amt }); c(a).shield += amt; c(a).rearSupport += amt; }
        } else if (/버프|지휘|관측|증폭/.test(a.role)) {
          for (const t of front) { events.push({ t: 'status', av, target: t.ref, statusId: 'st_atk_up', op: 'add' }); t.atk = Math.round(t.atk * 1.08); }
          c(a).rearSupport += 120;
        } else {
          const t = frontTarget(enemySide);
          if (t) hit(av, a, t, 1.1, a.ref);
        }
        continue;
      }
      const target = frontTarget(enemySide);
      if (!target) continue;
      if (a.energy >= 100) {
        a.energy = 0;
        events.push({ t: 'action', av, actor: a.ref, kind: 'ultimate', targets: [target.ref] });
        events.push({ t: 'resource', av, side, energy: { unit: a.ref, value: 0 } });
        const aoe = /광역|폭발|포격/.test(a.role);
        if (aoe) for (const t of alive(enemySide, 'front')) hit(av, a, t, 1.5);
        else hit(av, a, lowest(enemySide) ?? target, 2.6);
      } else if (sp[side] >= 1 && a.cd <= 0) {
        sp[side]--;
        a.cd = 2;
        events.push({ t: 'action', av, actor: a.ref, kind: 'skill', targets: [target.ref] });
        events.push({ t: 'resource', av, side, sp: sp[side] });
        if (/탱커|방어|도발|방패/.test(a.role)) {
          const amt = Math.round(a.maxHp * 0.18);
          a.shield += amt; a.taunt = true;
          events.push({ t: 'shield', av, source: a.ref, target: a.ref, amount: amt });
          events.push({ t: 'status', av, target: a.ref, statusId: 'st_taunt', op: 'add' });
          if (a.unitId) c(a).shield += amt;
        } else if (/제어|기절|CC|교란/.test(a.role) || rand() < 0.22) {
          hit(av, a, target, 1.3);
          if (target.hp > 0) {
            if (target.boss) { target.delayed = true; events.push({ t: 'status', av, target: target.ref, statusId: 'st_delayed', op: 'add', replacedFrom: 'st_stun' }); }
            else { target.stunned = true; events.push({ t: 'status', av, target: target.ref, statusId: 'st_stun', op: 'add' }); }
          }
        } else hit(av, a, target, 1.6);
        a.energy = Math.min(100, a.energy + 30);
      } else {
        a.cd--;
        events.push({ t: 'action', av, actor: a.ref, kind: 'basic', targets: [target.ref] });
        hit(av, a, target, 1);
        sp[side] = Math.min(rules.battle.teamSp.max, sp[side] + 1);
        a.energy = Math.min(100, a.energy + 25);
        events.push({ t: 'resource', av, side, sp: sp[side] });
      }
      events.push({ t: 'resource', av, side, energy: { unit: a.ref, value: a.energy } });
    }
    events.push({ t: 'end', av, outcome, reason });

    // 정산(흉내)
    const before = r.runHp;
    const survivors = alive('enemy', 'front').length;
    const dmg = outcome === 'loss' ? defeatDamage(r, survivors) : { total: 0, parts: [] };
    const income: { label: string; value: number }[] = [{ label: `${r.chapter}장 기본 수입`, value: rules.income.baseByChapter[r.chapter - 1] }];
    const streakNext = r.streak.kind === outcome ? r.streak.count + 1 : 1;
    if (outcome === 'win') income.push({ label: '승리', value: rules.income.winBonus });
    const sb = [...rules.income.streakBonus].reverse().find((b) => streakNext >= b.minStreak);
    if (sb) income.push({ label: `${streakNext}${outcome === 'win' ? '연승' : '연패'}`, value: sb.gold });
    income.push({ label: '이자', value: interest(r.gold) });
    const jt = jackpotTier(r);
    if (jt) income.push({ label: `한탕 ${jt} 추가 이자`, value: jt >= 4 ? 2 : 1 });
    const contributions = [...contrib].map(([unitId, v]) => ({ unitId, ...v }));
    const score = (x: typeof contributions[number]) => x.damage + x.healing * 1.2 + x.shield + x.rearSupport * 0.5;
    const mvp = outcome === 'win' ? [...contributions].sort((a2, b2) => score(b2) - score(a2))[0]?.unitId ?? null : null;
    const result: ResultView = {
      outcome, reason,
      runHp: { before, after: Math.max(0, before - dmg.total), breakdown: dmg.parts },
      income, xpGained: rules.xp.perBattle, contributions, mvpUnitId: mvp,
    };
    return { battle: { battleId: `${n.id}-${revision}`, nodeLabel: `${r.chapter}-${r.battle} ${cand.label}`, combatants: snapshot, startSp: { ally: rules.battle.teamSp.start, enemy: rules.battle.teamSp.start }, events }, result };
  }

  function advanceNode(r: RunState) {
    if (r.battle >= rules.run.battlesPerChapter) {
      r.chapter++;
      r.battle = 1;
      const pool = pack.strategies.filter((s) => s.offer.chapters.includes(r.chapter) && !r.strategies.includes(s.id));
      r.offers = { strategies: shuffle(pool).slice(0, 3).map((s) => s.id) };
    } else {
      r.battle++;
      r.offers = {};
    }
    r.chosen = 'A';
    if (!r.locked) rollShop(r);
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
      bench, stash: [], shop: [], locked: false, tracked: null, chosen: 'A', vault: { amount: 0, usedChapter: 0 },
      history: Array(rules.run.chapters * rules.run.battlesPerChapter).fill(null),
      offers: {
        startingUnits: chosen.map((u) => u.id),
        bosses: pack.nodes.filter((nd) => nd.type === 'boss').map((nd) => nd.candidates[0].front.find((f) => enemyById.get(f.enemyId)?.boss)?.enemyId ?? ''),
        strategies: shuffle(pack.strategies.filter((s) => s.offer.chapters.includes(1))).slice(0, 3).map((s) => s.id),
      },
      recruited: new Set(chosen.map((u) => u.id)), deployed: new Set(),
    };
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
      r.offers = {};
      if (!r.shop.length) rollShop(r);
      phase = 'PREPARATION';
      return ok();
    }
    if (phase === 'EQUIPMENT_CHOICE' && type === 'CHOOSE_EQUIPMENT') {
      const id = payload.equipmentId ? String(payload.equipmentId) : null;
      if (id) { if (!r.offers?.equipment?.includes(id)) return no('제안된 장비가 아니에요', 'INVALID_PAYLOAD'); r.stash.push(id); }
      else r.gold += 3;
      advanceNode(r);
      phase = 'NEXT_NODE';
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
        if (benchIdx >= 0) r.bench[benchIdx] = inst;
        else { r.bench.push(inst); merge(r); r.bench = r.bench.slice(0, rules.board.benchSlots); }
        if (!r.recruited.has(unitId)) { r.recruited.add(unitId); cue({ kind: 'recruit', unitId }); }
        merge(r);
        return ok();
      }
      case 'SELL_UNIT': {
        const at = locate(r, String(payload.instanceId));
        if (!at) return no('학생을 찾을 수 없어요', 'INVALID_PAYLOAD');
        const inst = r[at.zone][at.index]!;
        r.gold += sellValue(inst);
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
        if (deploying && n >= r.level) return no(`편성 인원이 가득 찼어요(${n}/${r.level}). 레벨을 올리거나 다른 학생을 빼 주세요`);
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
        if (r.gold < rules.shop.rerollCost) return no(`새로고침에 ${rules.shop.rerollCost}G가 필요해요 (보유 ${r.gold}G)`);
        r.gold -= rules.shop.rerollCost;
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
        if (inst.equipment.length >= rules.units.equipmentSlots && replace < 0) return no('장비 칸이 가득 찼어요. 교체할 칸을 골라 주세요');
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
      case 'CASH_OUT_VAULT': {
        if (r.vault.usedChapter === r.chapter) return no('이번 장에서 이미 금고를 털었어요');
        if (r.vault.amount <= 0) return no('금고가 비어 있어요');
        const amount = r.vault.amount;
        r.gold += amount;
        r.vault = { amount: 0, usedChapter: r.chapter };
        cue({ kind: 'vault', amount });
        return ok();
      }
      case 'START_BATTLE': {
        if (!r.front.some(Boolean)) return no('전방에 최소 1명이 필요해요');
        const { battle, result } = simulate(r);
        r.lastBattle = battle;
        r.lastResult = result;
        // 결과는 재생 전에 먼저 확정된다(13.3)
        r.runHp = result.runHp.after;
        r.gold += result.income.reduce((a, b) => a + b.value, 0);
        if (jackpotTier(r)) r.vault.amount += 6;
        r.xp += result.xpGained;
        levelUp(r);
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
      phase = run.lastResult && run.history.every((x) => x !== null) ? 'RUN_COMPLETE' : 'PREPARATION';
      emit();
    },
  };
}
