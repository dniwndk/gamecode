// 전투 한 판을 준비하고 돌린다. 화면·봇·테스트가 모두 이 함수 하나로 전투를 실행한다.
import type { BaseStats, ContentPack } from '../types/content';
import { oopartModifiers } from '../ooparts/modifiers';
import { Battle, type Registry, type U } from './engine';
import { enemyActives, enemyPassives, enemySlots } from './effects/enemies';
import { equipmentFx, strategyFx } from './effects/items';
import { registerOoparts } from './effects/ooparts';
import { synergyFx } from './effects/synergies';
import { actives, passives, registerBombs } from './effects/units';
import type { BattleInput, BattleOutput } from './types';

export type { BattleInput, BattleOutput, BattleEvent, BattleAllyInput, BattleEnemyInput, BattleCombatant, BattleContribution } from './types';

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

export function createBattle(pack: ContentPack, input: BattleInput): Battle {
  const c = new Battle(pack, input, registry);
  const om = oopartModifiers(input.ooparts);
  const deployed = input.allies.map((a) => a.unitId);
  const { tiers, scale } = battleTiers(pack, deployed, input.activeTiers);
  c.tiers = tiers;
  const synCat = new Map(pack.synergies.map((s) => [s.id, s.category]));

  // ── 아군 ──
  for (const a of [...input.allies].sort((x, y) => (x.zone === y.zone ? x.slot - y.slot : x.zone === 'front' ? -1 : 1))) {
    const def = pack.units.find((u) => u.id === a.unitId);
    if (!def) continue;
    const millennium = def.synergyIds.includes('syn_millennium') ? om.millenniumEquipStatBps : 0;
    const { stats, equipAtk } = allyBaseStats(pack, a.unitId, a.star, a.equipment, millennium);
    const tags = new Set(def.synergyIds);
    // 에덴 조약(L02): 트리니티·아리우스 학생은 두 진영에 모두 속한다
    if (om.edenFactions && (tags.has('syn_trinity') || tags.has('syn_arius'))) { tags.add('syn_trinity'); tags.add('syn_arius'); }
    const u = c.addUnit({
      side: 'ally', zone: a.zone, slot: a.slot, key: a.unitId, unit: def, enemy: null, star: a.star, name: def.name,
      boss: false, hasHp: a.zone === 'front', tags, equip: a.equipment, b: stats, maxHp: stats.hp, hp: stats.hp,
    });
    u.d.equipAtk = equipAtk;
    u.d.instanceId = a.instanceId;
  }
  // ── 적 ──
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

  // ── 공통 장치(학생 효과가 쓰는 엔진 밖 규칙) ──
  registerBombs(c);
  // 페로로 인형(히후미): 다음 단일 대상 공격 1회를 대신 맞는다
  c.hook((h) => {
    const decoy = c.g.decoy?.[h.tgt.side];
    if (!decoy || h.aoe || h.src.side === h.tgt.side || !['basic', 'skill', 'ultimate', 'rear'].includes(h.kind)) return;
    c.g.decoy[h.tgt.side] = 0;
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
  // 고유 히마리: 초기 능력치 계산 뒤 최고 ATK 전방 1명을 고정
  c.on('battle_start', () => { c.g.himariTarget = c.highestAtk(c.front('ally')); });
  c.g.ariusCount = c.units.filter((u) => u.side === 'ally' && u.tags.has('syn_arius')).length;
  c.g.serikaWins = input.serikaWins ?? 0;

  // ── 학생 패시브·후방 반응 ──
  for (const u of c.units.filter((x) => x.side === 'ally')) {
    const ids = u.zone === 'front' ? u.unit!.abilityIds.frontEffects : u.unit!.abilityIds.rearEffects;
    for (const id of new Set(ids.map(strip))) {
      const p = registry.passives[id];
      if (p) p(c, u);
    }
    // 장비
    for (const eqId of u.equip) {
      const eq = pack.equipment.find((x) => x.id === eqId);
      for (const fx of eq?.effectIds ?? []) equipmentFx[strip(fx)]?.(c, u);
    }
  }
  // 런 스택(레벨업·보충수업·업무량)과 에너지 100 시작
  for (const u of c.units.filter((x) => x.side === 'ally')) {
    const bps = input.runAtkBpsByUnit?.[u.key];
    if (bps) c.mod(u, { atkPct: bps }, 'run_stacks');
  }
  if (input.fullEnergyUnitIds?.length) c.on('battle_start', () => {
    for (const u of c.front('ally').filter((x) => input.fullEnergyUnitIds!.includes(x.key))) {
      c.proc('synergy', 'syn_unique_head_prefect', '푹 쉬었다 · 에너지 100', u);
      c.gainEnergy(u, 100);
    }
  });

  // ── 시너지 ──
  for (const [sid, t] of Object.entries(tiers).sort(([a], [b]) => a.localeCompare(b))) {
    const s = pack.synergies.find((x) => x.id === sid);
    const tier = s?.tiers[t];
    if (!tier) continue;
    for (const fx of tier.effectIds) {
      const f = synergyFx[strip(fx)];
      if (f) { f(c, scale[sid] ?? 1); c.fire(strip(fx)); }
    }
  }
  void synCat;
  // ── 전략 ──
  for (const sid of input.strategies) {
    const s = pack.strategies.find((x) => x.id === sid);
    for (const fx of s?.effectIds ?? []) strategyFx[strip(fx)]?.(c);
  }
  // ── 오파츠 ──
  registerOoparts(c);

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
