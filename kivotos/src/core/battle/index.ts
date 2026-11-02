// 전투 한 판을 준비하고 돌린다. 화면·봇·테스트가 모두 이 함수 하나로 전투를 실행한다.
import type { BaseStats, ContentPack } from '../types/content';
import { oopartModifiers } from '../ooparts/modifiers';
import { Battle, type Registry, type Side, type U } from './engine';
import { enemyActives, enemyPassives, enemySlots } from './effects/enemies';
import { equipmentFx, strategyFx } from './effects/items';
import { registerOoparts } from './effects/ooparts';
import { synergyFx } from './effects/synergies';
import { actives, passives, registerBombs } from './effects/units';
import type { BattleAllyInput, BattleInput, BattleOutput } from './types';

export type { BattleInput, BattleOutput, BattleEvent, BattleAllyInput, BattleEnemyInput, BattleCombatant, BattleContribution, BattleTeamInput } from './types';

export const registry: Registry = {
  actives: { ...actives, ...enemyActives },
  passives: { ...passives, ...enemyPassives },
  synergies: synergyFx,
  equipment: equipmentFx,
  strategies: strategyFx,
  ooparts: {},
};

const strip = (id: string) => id.replace(/^eff_/, '');

/**
 * 전투에서 실제로 켜지는 시너지 단계. 이스터에그가 다른 시너지의 단계를 바꾼다.
 * - 티파티 삼두정치: 켜진 진영·동아리 시너지 한 단계 위(이미 최고면 수치 +30% → scale)
 * - 학원 대항전: 출전 학생의 진영 시너지가 모두 최소 단계로
 * - 총력전 만점: 역할군 시너지 2단계(index 1)
 */
export function battleTiers(pack: ContentPack, deployedUnitIds: readonly string[], base: Readonly<Record<string, number>>): { tiers: Record<string, number>; scale: Record<string, number> } {
  const tiers: Record<string, number> = { ...base };
  const scale: Record<string, number> = {};
  const syn = new Map(pack.synergies.map((s) => [s.id, s]));
  const units = new Map(pack.units.map((u) => [u.id, u]));
  if (base.syn_plat_school_battle !== undefined) {
    for (const id of deployedUnitIds) for (const sid of units.get(id)?.synergyIds ?? []) if (syn.get(sid)?.category === 'faction' && tiers[sid] === undefined) tiers[sid] = 0;
  }
  if (base.syn_plat_total_assault !== undefined) {
    for (const s of pack.synergies) if (s.category === 'role') tiers[s.id] = Math.max(tiers[s.id] ?? -1, Math.min(1, s.tiers.length - 1));
  }
  if (base.syn_plat_tea_party !== undefined) {
    for (const [sid, t] of Object.entries(tiers)) {
      const s = syn.get(sid);
      if (!s || (s.category !== 'faction' && s.category !== 'club')) continue;
      if (t + 1 < s.tiers.length) tiers[sid] = t + 1; else scale[sid] = 1.3;
    }
  }
  return { tiers, scale };
}

/** 학생 한 명의 전투 시작 능력치(성급 배율은 HP·ATK에만, 장비 고정치는 배율 밖) */
export function allyBaseStats(pack: ContentPack, unitId: string, star: number, equipment: readonly string[], equipStatBps = 0): { stats: BaseStats; equipAtk: number } {
  const u = pack.units.find((x) => x.id === unitId)!;
  const m = pack.rules.units.starStatMultiplierBps[star - 1] / 10000;
  const s: BaseStats = { hp: Math.floor(u.baseStats.hp * m), atk: Math.floor(u.baseStats.atk * m), def: u.baseStats.def, spd: u.baseStats.spd, critBps: u.baseStats.critBps, critDamageBps: u.baseStats.critDamageBps };
  let equipAtk = 0;
  for (const id of equipment) {
    const e = pack.equipment.find((x) => x.id === id);
    if (!e) continue;
    for (const [k, v] of Object.entries(e.stats)) {
      const add = Math.round((v ?? 0) * (1 + equipStatBps / 10000));
      s[k as keyof BaseStats] += add;
      if (k === 'atk') equipAtk += add;
    }
  }
  return { stats: s, equipAtk };
}

/** 학생 진영 하나(아군 또는 PvP 상대)의 전투 입력 */
interface StudentTeam {
  side: Side;
  units: BattleAllyInput[];
  activeTiers: Record<string, number>;
  ooparts: string[];
  runAtkBpsByUnit?: Record<string, number>;
  fullEnergyUnitIds?: string[];
  serikaWins?: number;
}

/** 학생 진영의 유닛을 놓는다(능력치·태그). 효과 등록은 registerTeam에서 */
function addStudents(c: Battle, team: StudentTeam): void {
  const om = oopartModifiers(team.ooparts);
  for (const a of [...team.units].sort((x, y) => (x.zone === y.zone ? x.slot - y.slot : x.zone === 'front' ? -1 : 1))) {
    const def = c.pack.units.find((u) => u.id === a.unitId);
    if (!def) continue;
    const millennium = def.synergyIds.includes('syn_millennium') ? om.millenniumEquipStatBps : 0;
    const { stats, equipAtk } = allyBaseStats(c.pack, a.unitId, a.star, a.equipment, millennium);
    const tags = new Set(def.synergyIds);
    // 에덴 조약(L02): 트리니티·아리우스 학생은 두 진영에 모두 속한다
    if (om.edenFactions && (tags.has('syn_trinity') || tags.has('syn_arius'))) { tags.add('syn_trinity'); tags.add('syn_arius'); }
    const u = c.addUnit({
      side: team.side, zone: a.zone, slot: a.slot, key: a.unitId, unit: def, enemy: null, star: a.star, name: def.name,
      boss: false, hasHp: a.zone === 'front', tags, equip: a.equipment, b: stats, maxHp: stats.hp, hp: stats.hp,
    });
    u.d.equipAtk = equipAtk;
    u.d.instanceId = a.instanceId;
  }
}

/** 학생 진영의 패시브·장비·런 스택·시너지·전략·오파츠를 그 진영 시점(c = view)으로 등록한다 */
function registerTeam(c: Battle, team: StudentTeam, strategies: readonly string[], scale: Record<string, number>): void {
  const side = team.side;
  c.on('battle_start', () => { c.g.himariTarget = c.highestAtk(c.front(side)); });
  c.g.ariusCount = c.units.filter((u) => u.side === side && u.tags.has('syn_arius')).length;
  c.g.serikaWins = team.serikaWins ?? 0;

  // ── 학생 패시브·후방 반응 ──
  for (const u of c.units.filter((x) => x.side === side)) {
    const ids = u.zone === 'front' ? u.unit!.abilityIds.frontEffects : u.unit!.abilityIds.rearEffects;
    for (const id of new Set(ids.map(strip))) {
      const p = registry.passives[id];
      if (p) p(c, u);
    }
    // 장비
    for (const eqId of u.equip) {
      const eq = c.pack.equipment.find((x) => x.id === eqId);
      for (const fx of eq?.effectIds ?? []) equipmentFx[strip(fx)]?.(c, u);
    }
  }
  // 런 스택(레벨업·보충수업·업무량)과 에너지 100 시작
  for (const u of c.units.filter((x) => x.side === side)) {
    const bps = team.runAtkBpsByUnit?.[u.key];
    if (bps) c.mod(u, { atkPct: bps }, 'run_stacks');
  }
  if (team.fullEnergyUnitIds?.length) c.on('battle_start', () => {
    for (const u of c.front(side).filter((x) => team.fullEnergyUnitIds!.includes(x.key))) {
      c.proc('synergy', 'syn_unique_head_prefect', '푹 쉬었다 · 에너지 100', u);
      c.gainEnergy(u, 100);
    }
  });

  // ── 시너지 ──
  for (const [sid, t] of Object.entries(c.tiers).sort(([a], [b]) => a.localeCompare(b))) {
    const s = c.pack.synergies.find((x) => x.id === sid);
    const tier = s?.tiers[t];
    if (!tier) continue;
    for (const fx of tier.effectIds) {
      const f = synergyFx[strip(fx)];
      if (f) { f(c, scale[sid] ?? 1); c.fire(strip(fx)); }
    }
  }
  // ── 전략 ──
  for (const sid of strategies) {
    const s = c.pack.strategies.find((x) => x.id === sid);
    for (const fx of s?.effectIds ?? []) strategyFx[strip(fx)]?.(c);
  }
  // ── 오파츠 ──
  registerOoparts(c);
}

export function createBattle(pack: ContentPack, input: BattleInput): Battle {
  const c = new Battle(pack, input, registry);
  const opp = input.opponent;
  const ally: StudentTeam = {
    side: 'ally', units: input.allies, activeTiers: input.activeTiers, ooparts: input.ooparts,
    runAtkBpsByUnit: input.runAtkBpsByUnit, fullEnergyUnitIds: input.fullEnergyUnitIds, serikaWins: input.serikaWins,
  };
  const { tiers, scale } = battleTiers(pack, input.allies.map((a) => a.unitId), input.activeTiers);
  c.tiers = tiers;

  // ── 아군 ──
  addStudents(c, ally);
  // ── 적 ──
  let foe: { team: StudentTeam; scale: Record<string, number>; strategies: string[] } | null = null;
  if (opp) {
    // PvP: 상대도 학생 진영. 상대 시점 상태를 따로 두고, 그 진영 효과는 view('enemy')로 등록한다
    const ft = battleTiers(pack, opp.units.map((a) => a.unitId), opp.activeTiers);
    c.foeState = {
      g: {}, tiers: ft.tiers, ooparts: new Set(opp.ooparts), strategies: new Set(opp.strategies),
      frontUltEnergy: 100, frontSkillCdBonus: 0, nonCritBps: 0, gold: [],
      input: {
        ...input, allies: opp.units, enemies: [], activeTiers: opp.activeTiers, strategies: opp.strategies, ooparts: opp.ooparts,
        runAtkBpsByUnit: opp.runAtkBpsByUnit, fullEnergyUnitIds: opp.fullEnergyUnitIds, dessert: opp.dessert, dessertHalf: opp.dessertHalf,
        gameDevBugs: opp.gameDevBugs, serikaWins: opp.serikaWins, opponent: undefined,
      },
    };
    foe = {
      team: { side: 'enemy', units: opp.units, activeTiers: opp.activeTiers, ooparts: opp.ooparts, runAtkBpsByUnit: opp.runAtkBpsByUnit, fullEnergyUnitIds: opp.fullEnergyUnitIds, serikaWins: opp.serikaWins },
      scale: ft.scale, strategies: opp.strategies,
    };
    addStudents(c, foe.team);
  } else {
    const scaleBps = input.statScaleBps;
    const extra = pack.rules.battle.enemyStatBps ?? { hp: 10000, atk: 10000, def: 10000 };
    for (const e of [...input.enemies].sort((x, y) => (x.zone === y.zone ? x.slot - y.slot : x.zone === 'front' ? -1 : 1))) {
      const def = pack.enemies.find((x) => x.id === e.enemyId);
      if (!def) continue;
      const b = def.baseStats;
      const stats: BaseStats = {
        hp: Math.floor(b.hp * scaleBps / 10000 * extra.hp / 10000), atk: Math.floor(b.atk * scaleBps / 10000 * extra.atk / 10000), def: Math.floor(b.def * extra.def / 10000),
        spd: b.spd, critBps: b.critBps || 500, critDamageBps: b.critDamageBps,
      };
      const u = c.addUnit({
        side: 'enemy', zone: e.zone, slot: e.slot, key: def.id, unit: null, enemy: def, star: 1, name: def.name,
        boss: def.boss, hasHp: e.zone === 'front', tags: new Set(), equip: [], b: stats, maxHp: stats.hp, hp: stats.hp,
      });
      const slots = enemySlots(def.effectIds);
      u.d.basic = slots.basic; u.d.skill = slots.skill; u.d.ult = slots.ult; u.d.rear = slots.rear;
      for (const p of slots.passives) { enemyPassives[p](c, u); c.fire(p); }
    }
  }

  // ── 공통 장치(학생 효과가 쓰는 엔진 밖 규칙) ──
  registerBombs(c);
  // 페로로 인형(히후미): 다음 단일 대상 공격 1회를 대신 맞는다
  c.hook((h) => {
    const g = c.view(h.tgt.side).g;
    const decoy = g.decoy?.[h.tgt.side];
    if (!decoy || h.aoe || h.src.side === h.tgt.side || !['basic', 'skill', 'ultimate', 'rear'].includes(h.kind)) return;
    g.decoy[h.tgt.side] = 0;
    h.cancel = true;
    c.fire('hifumi_rear_reg');
  });
  // 바꿔치기 술(츠쿠요): 다음 피격 1회 회피
  c.hook((h) => { if (h.tgt.d.evade && h.src.side !== h.tgt.side) { h.tgt.d.evade = 0; h.cancel = true; c.fire('tsukuyo_ult'); } });
  // 디버프 저항(미모리)·디버프 면역(에이미 필살기)
  c.blockers.push((t, _id, debuff) => {
    if (!debuff) return false;
    if (c.hasSt(t, 'st_immune')) return true;
    if (t.d.resist) { t.d.resist = 0; c.fire('mimori_rear_reg'); return true; }
    return false;
  });

  registerTeam(c, ally, input.strategies, scale);
  if (foe) registerTeam(c.view('enemy'), foe.team, foe.strategies, foe.scale);

  c.finalizeHp();
  c.schedule();
  return c;
}

/** 전투 한 판: 준비 → battle_start → 끝날 때까지 */
export function simulateBattle(pack: ContentPack, input: BattleInput): BattleOutput {
  const c = createBattle(pack, input);
  c.snapshot();
  c.emit({ type: 'battle_start' });
  c.checkEnd();
  return c.run();
}

/** 효과 ID 중 엔진에 handler가 있는 것(검증용) */
export function implementedEffectIds(): Set<string> {
  return new Set([
    ...Object.keys(actives), ...Object.keys(passives), ...Object.keys(enemyActives), ...Object.keys(enemyPassives),
    ...Object.keys(synergyFx), ...Object.keys(equipmentFx), ...Object.keys(strategyFx),
  ]);
}

export type { U };
