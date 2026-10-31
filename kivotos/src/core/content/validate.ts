// 콘텐츠 팩 정적 검증(GDD v2.1 14.1 + v2.2 10장의 기대값).
// 매 build 전에 scripts/validate-content.ts가 돌리고, 오류가 하나라도 있으면 exit 1.
// 순수 함수: 파일 시스템·DOM을 쓰지 않는다. 브라우저에서도 같은 검사를 돌릴 수 있다.
import {
  DIALOGUE_KEYS,
  type ContentPack,
  type EffectDefinition,
  type EffectExecution,
  type UnitAbilityIds,
} from '../types/content';
import { synergyComposition } from './synergyReach';

export interface Issue {
  code: string;
  path: string;
  message: string;
}

export interface ValidationOptions {
  /** true면 명세만 있고 실행 연산이 없는 효과를 오류로 본다(M3 완료 기준). M0에서는 false. */
  requireImplemented?: boolean;
}

export interface ValidationReport {
  errors: Issue[];
  warnings: Issue[];
  stats: {
    counts: Record<string, number>;
    effectsImplemented: number;
    effectsTotal: number;
    portraitsPresent: number;
  };
}

const ID_PREFIX = {
  units: 'u_',
  synergies: 'syn_',
  effects: 'eff_',
  equipment: 'eq_',
  strategies: 'str_',
  nodes: 'node_',
  statuses: 'st_',
  ooparts: 'oop_',
} as const;

/** 효과 문장에 남아 있으면 안 되는 원안의 가상 연산·미정 표식(14.1) */
const PLACEHOLDER = /\b(?:skill|ult|passive|rear_reg|rear_react|synergy|trigger|enemy)_op\b|\bglobal_modifier\b|\bTODO\b|\bTBD\b/;

/** 유닛 능력 칸 → 허용 구역과 실행 종류 */
const SLOT_RULES: Record<keyof UnitAbilityIds, { zone: 'front' | 'rear'; execution: EffectExecution[] }> = {
  basic: { zone: 'front', execution: ['ability_basic'] },
  skill: { zone: 'front', execution: ['ability_skill'] },
  ultimate: { zone: 'front', execution: ['ability_ultimate'] },
  frontEffects: { zone: 'front', execution: ['passive_container'] },
  rearAction: { zone: 'rear', execution: ['ability_rear'] },
  rearEffects: { zone: 'rear', execution: ['passive_container'] },
};

export function validateContentPack(pack: ContentPack, options: ValidationOptions = {}): ValidationReport {
  const errors: Issue[] = [];
  const warnings: Issue[] = [];
  const err = (code: string, path: string, message: string) => errors.push({ code, path, message });
  const warn = (code: string, path: string, message: string) => warnings.push({ code, path, message });

  // ── 개수·ID 형식·중복
  const collections = {
    units: pack.units,
    synergies: pack.synergies,
    effects: pack.effects,
    equipment: pack.equipment,
    strategies: pack.strategies,
    ooparts: pack.ooparts,
    enemies: pack.enemies,
    nodes: pack.nodes,
    statuses: pack.statuses,
  };
  const counts: Record<string, number> = { dialogueFiles: pack.dialogue.length };
  for (const [name, list] of Object.entries(collections)) counts[name] = list.length;
  for (const [name, expected] of Object.entries(pack.manifest.expectedCounts)) {
    if (counts[name] !== expected) err('COUNT', name, `${name} ${counts[name]}개 — 팩 매니페스트 기대값 ${expected}개와 다름`);
  }
  const allIds = new Map<string, string>();
  for (const [name, list] of Object.entries(collections)) {
    for (const item of list) {
      const prefix = name === 'enemies' ? (item.id.startsWith('boss_') ? 'boss_' : 'en_') : ID_PREFIX[name as keyof typeof ID_PREFIX];
      if (!item.id.startsWith(prefix) || !/^[a-z][a-z0-9_]*$/.test(item.id)) err('ID_FORMAT', `${name}.${item.id}`, `ID 형식이 ${prefix}… 소문자_숫자가 아님`);
      const seen = allIds.get(item.id);
      if (seen) err('DUPLICATE_ID', `${name}.${item.id}`, `${seen}에도 같은 ID가 있음`);
      else allIds.set(item.id, name);
    }
  }

  const unitsById = new Map(pack.units.map((u) => [u.id, u]));
  const synergiesById = new Map(pack.synergies.map((s) => [s.id, s]));
  const effectsById = new Map(pack.effects.map((e) => [e.id, e]));
  const statusIds = new Set(pack.statuses.map((s) => s.id));
  const enemiesById = new Map(pack.enemies.map((e) => [e.id, e]));
  /** 효과 ID → 그 효과를 거는 주인들 */
  const owners = new Map<string, string[]>();
  const bind = (effectId: string, owner: string, path: string, allowed: EffectExecution[]): EffectDefinition | undefined => {
    const effect = effectsById.get(effectId);
    if (!effect) {
      err('MISSING_EFFECT', path, `없는 효과 ${effectId}를 참조`);
      return undefined;
    }
    owners.set(effectId, [...(owners.get(effectId) ?? []), owner]);
    if (!allowed.includes(effect.execution)) err('EFFECT_KIND', path, `${effectId}는 ${effect.execution}인데 이 자리에는 ${allowed.join('/')}만 올 수 있음`);
    return effect;
  };

  // ── 규칙 수치
  const { rules } = pack;
  for (const row of rules.shop.levels) {
    const sum = row.costOddsPct.reduce((a, b) => a + b, 0);
    if (row.costOddsPct.length !== 5 || sum !== 100) err('SHOP_ODDS', `rules.shop.levels.${row.level}`, `코스트 확률 합 ${sum}% (5칸·100%여야 함)`);
    if (row.costOddsPct.some((p) => p < 0)) err('SHOP_ODDS', `rules.shop.levels.${row.level}`, '음수 확률');
  }
  for (let lv = rules.run.startLevel; lv <= rules.run.maxLevel; lv++) {
    if (!rules.shop.levels.some((r) => r.level === lv)) err('SHOP_ODDS', `rules.shop.levels.${lv}`, '레벨 확률표 누락');
    const need = rules.xp.xpToNext[String(lv)];
    if (lv < rules.run.maxLevel ? !(Number.isInteger(need) && (need as number) > 0) : need !== null) err('XP_TABLE', `rules.xp.xpToNext.${lv}`, `다음 XP ${need}`);
  }
  if (rules.income.baseByChapter.length !== rules.run.chapters) err('RULES', 'rules.income.baseByChapter', '장 수와 길이가 다름');
  if (rules.defeatDamage.chapterBase.length !== rules.run.chapters) err('RULES', 'rules.defeatDamage.chapterBase', '장 수와 길이가 다름');
  if (rules.units.starStatMultiplierBps.length !== rules.units.maxStar) err('RULES', 'rules.units.starStatMultiplierBps', '성급 수와 길이가 다름');
  const board = rules.board;
  if (board.frontSlots + board.rearSlots < board.maxDeployed) err('RULES', 'rules.board', '전방+후방 칸이 최대 편성보다 적음');

  // ── 유닛
  for (const u of pack.units) {
    const path = `units.${u.id}`;
    if (![1, 2, 3, 4, 5].includes(u.cost)) err('RANGE', path, `코스트 ${u.cost}`);
    if (!['front_only', 'rear_only', 'dual'].includes(u.position)) err('RANGE', path, `허용 구역 ${u.position}`);
    const s = u.baseStats;
    for (const [k, v] of Object.entries(s)) if (!Number.isInteger(v) || v < 0) err('RANGE', `${path}.baseStats.${k}`, `정수 0 이상이어야 함: ${v}`);
    if (s.hp <= 0) err('RANGE', `${path}.baseStats.hp`, 'HP는 0보다 커야 함');
    if (s.critBps > 10000) err('RANGE', `${path}.baseStats.critBps`, '치명타 확률 100% 초과');
    if (new Set(u.synergyIds).size !== u.synergyIds.length) err('DUPLICATE_TAG', path, '같은 시너지 태그가 두 번');
    for (const syn of u.synergyIds) {
      if (!synergiesById.has(syn)) err('MISSING_SYNERGY', path, `없는 시너지 ${syn}`);
      else if (!synergiesById.get(syn)!.memberIds.includes(u.id)) err('TAG_MISMATCH', path, `${syn} 태그가 있는데 시너지 구성원 명단에 없음`);
    }
    const frontCapable = u.position !== 'rear_only';
    const rearCapable = u.position !== 'front_only';
    const slots = Object.entries(u.abilityIds) as [keyof UnitAbilityIds, string | string[] | null][];
    const perZone: Record<'front' | 'rear', string[]> = { front: [], rear: [] };
    for (const [slot, value] of slots) {
      const list = value === null ? [] : Array.isArray(value) ? value : [value];
      const rule = SLOT_RULES[slot];
      if (list.length && (rule.zone === 'front' ? !frontCapable : !rearCapable)) {
        err('ZONE_BINDING', `${path}.abilityIds.${slot}`, `${u.position} 유닛에 ${rule.zone} 능력이 묶여 있음`);
      }
      for (const effectId of list) {
        const effect = bind(effectId, u.id, `${path}.abilityIds.${slot}`, rule.execution);
        if (!effect) continue;
        if (effect.scope !== rule.zone && effect.scope !== 'both') {
          err('ZONE_BINDING', `${path}.abilityIds.${slot}`, `${effectId}의 구역은 ${effect.scope}인데 ${rule.zone} 칸에 묶임`);
        }
        perZone[rule.zone].push(effectId);
      }
    }
    for (const zone of ['front', 'rear'] as const) {
      const dup = perZone[zone].filter((id, i) => perZone[zone].indexOf(id) !== i);
      if (dup.length) err('DOUBLE_BINDING', path, `${zone} 구역에 같은 효과가 두 번 묶임: ${dup.join(', ')}`);
    }
    if (frontCapable && (!u.abilityIds.basic || !u.abilityIds.skill || !u.abilityIds.ultimate)) err('MISSING_ABILITY', path, '전방 가능 유닛인데 기본/스킬/필살기 중 빈 칸이 있음');
    if (rearCapable && !u.abilityIds.rearAction) err('MISSING_ABILITY', path, '후방 가능 유닛인데 후방 정기 지원이 없음');
  }

  // ── 각성(v2.3 9장): 원래 학생 ↔ 각성 학생이 서로를 가리키고, 각성 학생은 상점에 없으며 같은 구역·같은 시너지 자리를 이어받는다.
  for (const u of pack.units) {
    const path = `units.${u.id}.awakening`;
    const a = u.awakening;
    if (a) {
      const into = unitsById.get(a.intoUnitId);
      if (!into) err('AWAKENING', path, `없는 각성 학생 ${a.intoUnitId}`);
      else {
        if (into.awakenedFrom !== u.id) err('AWAKENING', path, `${into.id}의 awakenedFrom이 ${u.id}가 아님`);
        if (into.shopEligible) err('AWAKENING', path, `각성 학생 ${into.id}가 상점에 나옴`);
        if (into.awakening) err('AWAKENING', path, `각성 학생 ${into.id}가 다시 각성함(연쇄 각성 없음)`);
        if (into.cost <= u.cost) err('AWAKENING', path, `각성 학생 코스트 ${into.cost}가 원래 ${u.cost}보다 높지 않음`);
        if (into.position !== u.position) err('AWAKENING', path, `구역이 다름 ${u.position} → ${into.position}`);
        const lost = u.synergyIds.filter((s) => synergiesById.get(s)?.category !== 'unique' && !into.synergyIds.includes(s));
        if (lost.length) err('AWAKENING', path, `각성하면 시너지 자리를 잃음: ${lost.join(', ')}`);
      }
      const counter = synergiesById.get(a.counterSynergyId);
      if (!counter || counter.category !== 'unique' || !u.synergyIds.includes(a.counterSynergyId)) err('AWAKENING', path, `경험치 시너지 ${a.counterSynergyId}는 원래 학생의 고유 시너지여야 함`);
      if (!Number.isInteger(a.expRequired) || a.expRequired < 1) err('AWAKENING', path, `필요 경험치 ${a.expRequired}`);
      if (!Number.isInteger(a.starRequired) || a.starRequired < 1 || a.starRequired > rules.units.maxStar) err('AWAKENING', path, `필요 성급 ${a.starRequired}`);
    }
    if (u.awakenedFrom) {
      const from = unitsById.get(u.awakenedFrom);
      if (!from || from.awakening?.intoUnitId !== u.id) err('AWAKENING', `units.${u.id}.awakenedFrom`, `${u.awakenedFrom}의 각성 대상이 ${u.id}가 아님`);
    }
  }

  // ── 시너지
  for (const syn of pack.synergies) {
    const path = `synergies.${syn.id}`;
    if (!['deployed_all', 'front_only', 'rear_only', 'special'].includes(syn.countScope)) err('RANGE', path, `집계 범위 ${syn.countScope}`);
    if (syn.tiers.length === 0) err('SYNERGY_TIERS', path, '단계가 없음');
    syn.tiers.forEach((t, i) => {
      if (!Number.isInteger(t.threshold) || t.threshold < 1) err('SYNERGY_TIERS', `${path}.tiers.${i}`, `요구 수 ${t.threshold}`);
      if (i > 0 && t.threshold <= syn.tiers[i - 1].threshold) err('SYNERGY_TIERS', `${path}.tiers.${i}`, '요구 수가 오름차순이 아님');
      if (t.effectIds.length === 0) err('SYNERGY_TIERS', `${path}.tiers.${i}`, '단계 효과 ID가 없음');
      for (const id of t.effectIds) bind(id, syn.id, `${path}.tiers.${i}`, ['synergy_container']);
      // 플래티넘 단계(v2.3.5): 진영·역할군의 마지막 단계, 6명 이상
      if (t.grade === 'platinum') {
        if (!['faction', 'role'].includes(syn.category)) err('SYNERGY_TIERS', `${path}.tiers.${i}`, `플래티넘 단계는 진영·역할군에만 둔다(${syn.category})`);
        if (i !== syn.tiers.length - 1) err('SYNERGY_TIERS', `${path}.tiers.${i}`, '플래티넘 단계는 마지막 단계여야 함');
        if (t.threshold < 6) err('SYNERGY_TIERS', `${path}.tiers.${i}`, `플래티넘 단계 요구 수 ${t.threshold} < 6`);
      } else if (t.grade !== 'normal') err('RANGE', `${path}.tiers.${i}`, `단계 등급 ${t.grade}`);
    });
    for (const m of syn.memberIds) {
      const unit = unitsById.get(m);
      if (!unit) err('MISSING_UNIT', path, `없는 유닛 ${m}`);
      else if (!unit.synergyIds.includes(syn.id)) err('TAG_MISMATCH', path, `${m}이 구성원인데 유닛 태그에 ${syn.id}가 없음`);
    }
    const comp = synergyComposition(syn, unitsById, board);
    const doc = syn.documented;
    if (comp.frontOnly !== doc.frontOnly || comp.rearOnly !== doc.rearOnly || comp.dual !== doc.dual) {
      err('SYNERGY_COMPOSITION', path, `전방/후방/겸용 ${comp.frontOnly}/${comp.rearOnly}/${comp.dual} — 기획서 표 ${doc.frontOnly}/${doc.rearOnly}/${doc.dual}`);
    }
    if (comp.maxLegalCount !== doc.maxLegalCount) err('SYNERGY_COMPOSITION', path, `최대 합법 집계 ${comp.maxLegalCount} — 기획서 표 ${doc.maxLegalCount}`);
    const top = syn.tiers.at(-1)?.threshold ?? 0;
    if (syn.countScope === 'special') {
      if (syn.memberIds.length) err('SYNERGY_COMPOSITION', path, 'special 집계 시너지는 구성원 명단을 두지 않음');
    } else if (comp.maxLegalCount < top) err('SYNERGY_UNREACHABLE', path, `최고 단계 ${top}명인데 합법 편성으로 최대 ${comp.maxLegalCount}명`);
  }

  // ── 장비
  for (const eq of pack.equipment) {
    const path = `equipment.${eq.id}`;
    if (!['front', 'rear', 'both'].includes(eq.zone)) err('RANGE', path, `장착 구역 ${eq.zone}`);
    if (Object.keys(eq.stats).length === 0) err('RANGE', path, '고정 능력치가 없음');
    for (const [k, v] of Object.entries(eq.stats)) if (!Number.isInteger(v) || (v as number) <= 0) err('RANGE', `${path}.stats.${k}`, `양의 정수여야 함: ${v}`);
    if (!eq.chapters.length || eq.chapters.some((c) => c < 1 || c > rules.run.chapters)) err('RANGE', path, `등장 장 ${eq.chapters}`);
    for (const id of eq.effectIds) bind(id, eq.id, path, ['equipment_container']);
  }

  // ── 전략
  for (const st of pack.strategies) {
    const path = `strategies.${st.id}`;
    const chapters = [...st.offer.chapters, ...(st.offer.ownedCondition?.chapters ?? [])];
    if (!chapters.length || chapters.some((c) => c < 1 || c > rules.run.chapters)) err('RANGE', path, `제안 장 ${chapters}`);
    for (const tag of st.offer.ownedCondition?.anyTagOf ?? []) if (!synergiesById.has(tag)) err('MISSING_SYNERGY', path, `제안 조건의 없는 태그 ${tag}`);
    for (const id of st.effectIds) bind(id, st.id, path, ['strategy_container']);
  }
  const unconditionalFirst = pack.strategies.filter((s) => s.offer.chapters.includes(1)).length;
  if (unconditionalFirst < 3) err('STRATEGY_POOL', 'strategies', `1장에 조건 없이 나오는 전략 ${unconditionalFirst}개 — 3택1 후보가 모자람(5.4)`);

  // ── 오파츠(docs/OOPARTS_v1.md)
  const oopById = new Map(pack.ooparts.map((o) => [o.id, o]));
  const recipeOf = new Map<string, string>();
  for (const o of pack.ooparts) {
    const path = `ooparts.${o.id}`;
    if (!['common', 'uncommon', 'rare', 'legendary'].includes(o.rarity)) err('RANGE', path, `등급 ${o.rarity}`);
    if (o.code[0] !== { common: 'C', uncommon: 'U', rare: 'R', legendary: 'L' }[o.rarity]) err('OOPART_CODE', path, `번호 ${o.code}가 등급 ${o.rarity}와 맞지 않음`);
    if (!o.benefit.trim()) err('RANGE', path, '효과 문장이 없음');
    if ((o.kind === 'drawback') !== (o.drawback !== null)) err('OOPART_KIND', path, '대가 오파츠 표시와 대가 문장이 맞지 않음');
    if ((o.kind === 'synergy') !== (o.synergyIds.length > 0)) err('OOPART_KIND', path, '시너지 특화 표시와 대상 시너지가 맞지 않음');
    for (const syn of o.synergyIds) if (!synergiesById.has(syn)) err('MISSING_SYNERGY', path, `없는 시너지 ${syn}`);
    for (const id of o.effectIds) bind(id, o.id, path, ['oopart_container']);
    if ((o.rarity === 'legendary') !== (o.recipe !== null)) err('OOPART_RECIPE', path, '전설만 레시피를 가진다');
    if (!o.recipe) continue;
    if (o.recipe.length < 2) err('OOPART_RECIPE', path, '재료가 2개 미만');
    for (const part of o.recipe) {
      const item = oopById.get(part);
      if (!item) err('OOPART_RECIPE', path, `없는 재료 ${part}`);
      else if (item.rarity === 'legendary') err('OOPART_RECIPE', path, `전설 ${part}를 재료로 씀`);
      const other = recipeOf.get(part);
      if (other) err('OOPART_RECIPE', path, `${part}가 ${other}의 재료이기도 함(재료는 레시피 하나에만)`);
      recipeOf.set(part, o.id);
    }
    const rares = o.recipe.filter((p) => oopById.get(p)?.rarity === 'rare').length;
    if (rares !== 1) err('OOPART_RECIPE', path, `희귀 재료 ${rares}개(레시피마다 정확히 1개)`);
  }
  const oopRules = rules.ooparts;
  for (const src of oopRules.sources) {
    const path = `rules.ooparts.${src.id}`;
    for (const ch of src.chapters) {
      const odds = src.oddsByChapter[String(ch)];
      if (!odds || odds.length !== oopRules.rarityOrder.length || odds.reduce((a, b) => a + b, 0) !== 100) err('OOPART_ODDS', path, `${ch}장 등급 확률이 ${oopRules.rarityOrder.length}칸·100%가 아님`);
      const pool = oopRules.rarityOrder.filter((_, i) => (odds?.[i] ?? 0) > 0);
      const available = pool.flatMap((r) => pack.ooparts.filter((o) => o.rarity === r)).length;
      if (available < src.choices) err('OOPART_ODDS', path, `${ch}장 후보 ${available}개로 ${src.choices}택을 채우지 못함`);
    }
    if (src.choices < 1 || (src.grant && src.choices !== 1)) err('OOPART_ODDS', path, `제안 칸 ${src.choices}`);
  }
  if (!(oopRules.recipeWeight >= 1)) err('OOPART_ODDS', 'rules.ooparts.recipeWeight', `가중치 ${oopRules.recipeWeight}`);

  // ── 적
  for (const en of pack.enemies) {
    const path = `enemies.${en.id}`;
    for (const [k, v] of Object.entries(en.baseStats)) if (!Number.isInteger(v) || v < 0) err('RANGE', `${path}.baseStats.${k}`, `정수 0 이상이어야 함: ${v}`);
    if (en.baseStats.hp <= 0) err('RANGE', `${path}.baseStats.hp`, 'HP는 0보다 커야 함');
    if (en.effectIds.length === 0) err('MISSING_ABILITY', path, '능력이 없음');
    for (const id of en.effectIds) {
      const effect = bind(id, en.id, path, ['ability_basic', 'ability_skill', 'ability_ultimate', 'ability_rear', 'passive_container']);
      if (effect && en.zone === 'rear' && effect.scope === 'front') err('ZONE_BINDING', path, `후방 적에 전방 효과 ${id}`);
    }
  }

  // ── 노드
  const order = new Set<string>();
  for (const node of pack.nodes) {
    const path = `nodes.${node.id}`;
    const key = `${node.chapter}-${node.battle}`;
    if (order.has(key)) err('NODE_ORDER', path, `${key} 노드가 둘`);
    order.add(key);
    if (node.chapter < 1 || node.chapter > rules.run.chapters || node.battle < 1 || node.battle > rules.run.battlesPerChapter) err('NODE_ORDER', path, `장/전투 ${key}`);
    const expectedType = node.battle === rules.run.battlesPerChapter ? 'boss' : node.battle === rules.run.battlesPerChapter - 1 ? 'elite' : 'normal';
    if (node.type !== expectedType) err('NODE_TYPE', path, `${key}는 ${expectedType}여야 하는데 ${node.type}`);
    const expectCandidates = node.type === 'normal' ? 2 : 1;
    if (node.candidates.length !== expectCandidates) err('NODE_CANDIDATES', path, `후보 ${node.candidates.length}개 (기대 ${expectCandidates})`);
    if (!(node.statScaleBps > 0)) err('RANGE', path, `능력치 배율 ${node.statScaleBps}`);
    for (const cand of node.candidates) {
      const cpath = `${path}.${cand.id}`;
      if (cand.front.length < 1 || cand.front.length > board.frontSlots) err('FORMATION', cpath, `적 전방 ${cand.front.length}명 (1~${board.frontSlots})`);
      if (cand.rear.length > board.rearSlots) err('FORMATION', cpath, `적 후방 ${cand.rear.length}명 (0~${board.rearSlots})`);
      for (const [zone, list, size] of [['front', cand.front, board.frontSlots], ['rear', cand.rear, board.rearSlots]] as const) {
        const seen = new Set<number>();
        for (const slot of list) {
          if (slot.index < 0 || slot.index >= size || seen.has(slot.index)) err('FORMATION', cpath, `${zone} 칸 ${slot.index} 중복 또는 범위 밖`);
          seen.add(slot.index);
          const enemy = enemiesById.get(slot.enemyId);
          if (!enemy) err('MISSING_ENEMY', cpath, `없는 적 ${slot.enemyId}`);
          else if (enemy.zone !== zone) err('FORMATION', cpath, `${slot.enemyId}(${enemy.zone})가 ${zone} 칸에 있음`);
        }
      }
      const bosses = cand.front.filter((s) => enemiesById.get(s.enemyId)?.boss).length;
      if (node.type === 'boss' ? bosses !== 1 : bosses !== 0) err('FORMATION', cpath, `보스 ${bosses}기`);
    }
  }

  // ── 효과: 전부 누군가에게 묶여 있고, 문장에 가상 연산이 없고, 참조한 상태가 있다
  let effectsImplemented = 0;
  for (const effect of pack.effects) {
    const path = `effects.${effect.id}`;
    if (!owners.has(effect.id)) err('UNUSED_EFFECT', path, '어떤 유닛·시너지·장비·전략·오파츠·적에도 묶이지 않음');
    if (PLACEHOLDER.test(effect.spec) || PLACEHOLDER.test(effect.limits)) err('PLACEHOLDER', path, '명세에 가상 연산(*_op)이나 미정 표식이 남아 있음');
    for (const st of effect.spec.match(/\bst_[a-z_]+/g) ?? []) if (!statusIds.has(st)) err('MISSING_STATUS', path, `없는 상태 ${st}`);
    // v2.1 6장: 시너지는 최고 단계 하나만 등록한다. v2.3 이후 본문은 하위 단계 효과를 참조 표기 없이 모두 적어야 한다.
    if (/^V\./.test(effect.catalogNo) && effect.spec.includes('[하위 효과 포함]')) err('TIER_REFERENCE', path, '「[하위 효과 포함]」 참조만으로는 하위 단계 효과가 등록되지 않음 — 본문에 풀어 적어야 함');
    if (effect.implementation === 'implemented') {
      if (effect.handlers.length === 0) err('IMPLEMENTATION', path, 'implemented인데 handler가 없음');
      else effectsImplemented++;
    } else if (options.requireImplemented) {
      err('NOT_IMPLEMENTED', path, '실행 연산이 아직 없음');
    }
  }

  // ── 대사
  const dialogueUnits = new Set<string>();
  for (const d of pack.dialogue) {
    const path = `dialogue.${d.unitId}`;
    if (!unitsById.has(d.unitId)) err('MISSING_UNIT', path, '없는 유닛의 대사 파일');
    if (dialogueUnits.has(d.unitId)) err('DUPLICATE_ID', path, '대사 파일이 둘');
    dialogueUnits.add(d.unitId);
    if (unitsById.get(d.unitId) && unitsById.get(d.unitId)!.name !== d.name) warn('DIALOGUE_NAME', path, `대사 파일 이름 "${d.name}" ≠ 유닛 이름 "${unitsById.get(d.unitId)!.name}"`);
    for (const key of DIALOGUE_KEYS) {
      const line = d.lines?.[key];
      if (typeof line !== 'string' || line.trim() === '') err('DIALOGUE_KEY', path, `${key} 대사가 없음`);
    }
    const extra = Object.keys(d.lines ?? {}).filter((k) => !(DIALOGUE_KEYS as readonly string[]).includes(k));
    if (extra.length) err('DIALOGUE_KEY', path, `모르는 상황 키 ${extra.join(', ')}`);
  }
  for (const u of pack.units) if (!dialogueUnits.has(u.id)) err('DIALOGUE_MISSING', `dialogue.${u.id}`, '대사 파일 없음');

  // ── 에셋: 없으면 대체 표시로 진행하므로 경고만
  const assetsById = new Map(pack.assets.map((a) => [a.id, a]));
  let portraitsPresent = 0;
  for (const u of pack.units) {
    const asset = assetsById.get(u.portraitAssetId);
    if (!asset) err('MISSING_ASSET_ENTRY', `units.${u.id}`, `에셋 목록에 ${u.portraitAssetId} 없음`);
    else if (!asset.present) warn('ASSET_ABSENT', `assets.${asset.id}`, '파일이 없어 대체 표시로 나감');
    else portraitsPresent++;
  }

  return { errors, warnings, stats: { counts, effectsImplemented, effectsTotal: pack.effects.length, portraitsPresent } };
}
