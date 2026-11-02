// 멀티플레이 전용 런 규칙(D-049·D-050). 솔로 규칙(rules.json)은 건드리지 않는다.
import type { ContentPack, NodeDefinition, OopartRarity } from '../../core/types/content';
import { Rng } from '../runRules';

/** 멀티: 패배마다 런 체력 −10(장·정예·보스 상관없이). 오파츠 피해 감소·증가는 그대로 붙는다 */
export const MULTI_DEFEAT_DAMAGE = 10;

/** 크립 라운드 보상. 라운드마다 방이 한 번 정하고 모두 같은 보상(오파츠면 같은 등급)을 받는다 */
export type CreepReward = { kind: 'equipment' } | { kind: 'oopart'; rarity: OopartRarity };

/**
 * 멀티 라운드 칸(D-052). 장마다 1~4번째는 PvP(일반 칸으로 친다: 정예·보스 보정 없음),
 * 5번째는 그 장 정예 칸의 몬스터와 싸우는 크립 라운드. 보스 라운드는 없다.
 */
export function multiNode(pack: ContentPack, chapter: number, battle: number): NodeDefinition {
  if (battle >= pack.rules.run.battlesPerChapter) {
    const elite = pack.nodes.find((n) => n.chapter === chapter && n.type === 'elite');
    if (elite) return { ...elite, battle };
  }
  const n = pack.nodes.find((x) => x.chapter === chapter && x.battle === battle) ?? pack.nodes[0];
  return n.type === 'normal' ? n : { ...n, type: 'normal' };
}

/** 크립 라운드 칸인가(multiNode가 정예로 돌려주는 칸 = 각 장 5번째): 모두가 같은 몬스터와 싸운다 */
export const isCreepNode = (nodeType: string) => nodeType === 'elite';

/**
 * 크립 보상을 방 씨앗과 장 번호로 정한다(같은 방이면 누가 계산해도 같다).
 * 장비 3택1 또는 오파츠 1개를 반반으로, 오파츠 등급은 솔로 정예 보상 확률(rules.ooparts 정예 장별 확률)을 따른다.
 */
export function creepRewardFor(pack: ContentPack, roomSeed: string, chapter: number): CreepReward {
  const rng = Rng.forStream(`${roomSeed}|creep|${chapter}`, 'reward');
  if (rng.nextInt(2) === 0) return { kind: 'equipment' };
  const rules = pack.rules.ooparts;
  const odds = rules.sources.find((s) => s.id === 'elite')?.oddsByChapter[String(chapter)] ?? [0, 100, 0];
  return { kind: 'oopart', rarity: rules.rarityOrder[rng.weightedIndex(odds)] as OopartRarity };
}

/**
 * PvP 밸런스 표(D-051). 시너지가 켜져 있으면(min 인원 이상) 그 편성 전체에 보정을 건다.
 * 시너지 효과는 대개 편성 전체를 바꾸므로 구성원만이 아니라 편성 전원에 건다. 여러 시너지가 걸리면 더한다.
 * 멀티 PvP 전투에만 쓴다(크립 라운드·솔로에는 쓰지 않음). 측정·탐색: scripts/balance/pvp-decks.ts, pvp-tune.ts
 */
export type PvpAdjust = {
  /** 그 시너지 효과 세기 배율(능력치 보정 수치와 발동 타격 피해를 함께). 1이면 그대로 */
  power?: number;
  /** 편성 전원 ATK·최대 HP·보호막 부여 bps */
  atk?: number; hp?: number; shield?: number;
  /** 편성 전원 SPD(고정치) */
  spd?: number;
  /** 그 시너지 발동 타격 피해 bps */
  dmg?: number;
  /** 이 인원 이상으로 켜졌을 때만(없으면 첫 단계부터) */
  min?: number;
};
export const PVP_SYNERGY_BPS: Readonly<Record<string, PvpAdjust>> = {
  /** 게헨나 6+ */ syn_gehenna: { power: 0.8, atk: -1000, hp: -1000, min: 6 },
  /** 세미나 4 */ syn_seminar: { power: 1.4, atk: 2000, hp: 2000, min: 4 },
  /** 트리니티 6+ */ syn_trinity: { power: 0.45, atk: -2750, hp: -2750, min: 6 },
  /** 아비도스 */ syn_abydos: { power: 0.8, atk: -1000, hp: -1000 },
  /** 백귀야행 */ syn_hyakkiyako: { power: 0.4, atk: -3000, hp: -3000 },
  /** C&C */ syn_cc: { power: 2, atk: 4000, hp: 4000 },
  /** 아리우스 */ syn_arius: { power: 0.85, atk: -750, hp: -750 },
  /** 게임개발부 */ syn_game_dev: { power: 1.25, atk: 1250, hp: 1250 },
  /** 붉은겨울 */ syn_red_winter: { power: 1.25, atk: 1250, hp: 1250 },
  /** SRT */ syn_srt: { power: 0.3, atk: -4000, hp: -4000 },
  /** 블래스터 6+ */ syn_blaster: { power: 1.1, atk: 500, hp: 500, min: 6 },
  /** 스나이퍼 4+ */ syn_sniper: { power: 1.65, atk: 3250, hp: 3250, min: 4 },
  /** 힐러 4+ */ syn_healer: { power: 1.05, atk: 250, hp: 250, min: 4 },
  /** 어태커 4 */ syn_attacker: { power: 1.7, atk: 3500, hp: 3500, min: 4 },
  /** 밀레니엄 8 */ syn_millennium: { power: 0.6, atk: -2000, hp: -2000, min: 8 },
};

type Team = { units: readonly { unitId: string }[]; activeTiers: Readonly<Record<string, number>> };
type Table = Readonly<Record<string, PvpAdjust>>;

const adjOn = (pack: ContentPack, sid: string, tier: number | undefined, adj: PvpAdjust | undefined): adj is PvpAdjust =>
  !!adj && tier !== undefined && (!adj.min || (pack.synergies.find((x) => x.id === sid)?.tiers[tier]?.threshold ?? 0) >= adj.min);

/** 편성에 걸리는 보정 합계 */
export function pvpAdjustOf(pack: ContentPack, team: Team, table: Table = PVP_SYNERGY_BPS): { atk: number; hp: number; shield: number; spd: number; synergyDmg: Record<string, number>; synergyScale: Record<string, number> } {
  const out = { atk: 0, hp: 0, shield: 0, spd: 0, synergyDmg: {} as Record<string, number>, synergyScale: {} as Record<string, number> };
  for (const [sid, adj] of Object.entries(table)) {
    if (!adjOn(pack, sid, team.activeTiers[sid], adj)) continue;
    out.atk += adj.atk ?? 0; out.hp += adj.hp ?? 0; out.shield += adj.shield ?? 0; out.spd += adj.spd ?? 0;
    const p = adj.power ?? 1;
    if (p !== 1) out.synergyScale[sid] = p;
    const dmg = (adj.dmg ?? 0) + Math.round((p - 1) * 10000);
    if (dmg) out.synergyDmg[sid] = dmg;
  }
  return out;
}

/** 편성(BattleTeamInput 꼴)에 PvP 밸런스 보정을 붙인다 */
export function withPvpBalance<T extends Team>(pack: ContentPack, team: T, table: Table = PVP_SYNERGY_BPS): T & { statBpsByUnit: Record<string, { atk: number; hp: number; spd: number; shield: number }>; synergyDmgBps: Record<string, number>; synergyScale: Record<string, number> } {
  const a = pvpAdjustOf(pack, team, table);
  const any = a.atk || a.hp || a.spd || a.shield;
  const statBpsByUnit = any ? Object.fromEntries(team.units.map((u) => [u.unitId, { atk: a.atk, hp: a.hp, spd: a.spd, shield: a.shield }])) : {};
  return { ...team, statBpsByUnit, synergyDmgBps: a.synergyDmg, synergyScale: a.synergyScale };
}
