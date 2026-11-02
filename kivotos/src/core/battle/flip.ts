// PvP 전투 결과를 상대 시점으로 뒤집는다. 전투는 한 번만 돌리고(같은 결과), 두 플레이어가 각자 아군 쪽에서 재생한다.
import type { BattleEvent, BattleOutput, Ref, Side } from './types';

const fs = (s: Side): Side => (s === 'ally' ? 'enemy' : 'ally');
const fr = (r: Ref): Ref => ({ ...r, side: fs(r.side) });
const fro = (r: Ref | undefined): Ref | undefined => (r ? fr(r) : undefined);
type Reason = BattleOutput['reason'];
const freason = (x: Reason): Reason => (x === 'enemy_front_wiped' ? 'ally_front_wiped' : x === 'ally_front_wiped' ? 'enemy_front_wiped' : x);
/** 양쪽 전멸(both_wiped)은 양쪽 모두 패배 */
const foutcome = (o: 'win' | 'loss', reason: Reason): 'win' | 'loss' => (reason === 'both_wiped' ? 'loss' : o === 'win' ? 'loss' : 'win');

function flipEvent(e: BattleEvent): BattleEvent {
  switch (e.t) {
    case 'action': return { ...e, actor: fr(e.actor), targets: e.targets.map(fr) };
    case 'damage': return { ...e, source: fr(e.source), target: fr(e.target), ...(e.origin ? { origin: fr(e.origin) } : {}) };
    case 'heal': case 'shield': return { ...e, source: fr(e.source), target: fr(e.target) };
    case 'status': return { ...e, target: fr(e.target) };
    case 'resource': return { ...e, side: fs(e.side), ...(e.energy ? { energy: { ...e.energy, unit: fr(e.energy.unit) } } : {}) };
    case 'timeline': return { ...e, upcoming: e.upcoming.map(fr) };
    case 'escalation': return { ...e, damageBps: e.enemyDamageBps, enemyDamageBps: e.damageBps };
    case 'defeated': return { ...e, target: fr(e.target), ...(e.by ? { by: fr(e.by) } : {}) };
    case 'proc': return { ...e, ...(e.unit ? { unit: fro(e.unit) } : {}) };
    case 'end': return { ...e, outcome: foutcome(e.outcome, e.reason), reason: freason(e.reason) };
  }
}

/** PvP 결과(input.opponent로 돌린 것)를 상대 진영 시점의 결과로 바꾼다 */
export function flipBattleOutput(out: BattleOutput): BattleOutput {
  const opp = out.opponent;
  if (!opp) throw new Error('flipBattleOutput: PvP 결과가 아니다');
  return {
    outcome: foutcome(out.outcome, out.reason),
    reason: freason(out.reason),
    combatants: out.combatants.map((c) => ({ ...c, ref: fr(c.ref) })),
    startSp: { ally: out.startSp.enemy, enemy: out.startSp.ally },
    events: out.events.map(flipEvent),
    contributions: opp.contributions,
    kills: opp.kills,
    settlementGold: opp.settlementGold,
    aborted: out.aborted,
    survivingEnemyFront: opp.survivingFront,
    firedEffects: out.firedEffects,
    opponent: { contributions: out.contributions, kills: out.kills, settlementGold: out.settlementGold, survivingFront: out.survivingEnemyFront },
  };
}
