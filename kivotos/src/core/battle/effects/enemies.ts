// 적·보스 능력(GDD v2.1 11.1~11.2). 「아군」은 언제나 출처와 같은 진영이다.
import type { Passive } from '../engine';
import { A, atkUp, defDown, defUp, guard, spdDown, spdUp, tauntFoe, type Active, type Battle, type U } from './kit';

/** 초현상특무부가 봉인한 적의 패시브는 2차례 동안 쉰다 */
const sealed = (u: U) => (u.d.sealedUntil ?? -1) >= u.turn;

export const enemyActives: Record<string, Active> = {
  en_helmet_skill: A((c, u) => { c.hit(u, c.pick(u), 1.4, 'skill'); }),
  en_grenade_skill: A((c, u) => { c.hit(u, c.firstN(u, 2), 1.15, 'skill'); }),
  en_sukeban_skill: A((c, u) => { spdUp(c, u, u, 15, 'en_sukeban_skill'); c.hit(u, c.pick(u), 1.35, 'skill'); }),
  en_shield_up: A((c, u) => {
    u.d.shieldUp = true;
    defUp(c, u, u, 4000, 'en_shield_up');
    for (const t of c.foes(u)) tauntFoe(c, u, t, 'en_shield_up', 1);
  }, (_c, u) => !u.d.shieldUp),
  en_pmc_shield: A((c, u) => { c.shield(u, u, u.maxHp * 0.2, 2, 'en_pmc_shield'); c.hit(u, c.pick(u), 1.5, 'skill'); }, (c, u) => c.hpRatio(u) <= 0.7),
  en_pmc_rear_snipe: A((c, u) => {
    const foes = c.foes(u);
    const taunting = foes.some((t) => c.hasSt(t, 'st_taunt'));
    c.hit(u, taunting ? c.pick(u) : c.lowestHp(foes), 1.35, 'rear');
  }),
  en_sweeper_shock: A((c, u) => { c.hit(u, c.foes(u), 1.1, 'skill'); }),
  en_goliath_laser: { run: (c, u) => { c.hit(u, c.foes(u), 1.45, 'skill'); }, auto: (_c, u) => u.turn % 2 === 0, cd: 0 },
  en_goliath_ult: A((c, u) => { c.hit(u, c.pick(u), 2.6, 'ultimate'); }),
  en_justina_smite: A((c, u) => {
    const ts = c.firstN(u, 2);
    c.hit(u, ts, 1.55, 'skill');
    for (const t of ts) c.apply(u, t, 'st_healing_received_down', { params: { healRecv: -2000 }, fx: 'en_justina_smite' });
  }),
  en_choir_rear_buff: A((c, u) => { for (const t of c.mates(u)) { atkUp(c, u, t, 2000, 'en_choir_rear_buff'); c.heal(u, t, t.maxHp * 0.1); } }),
  boss_kaiten_ult: A((c, u) => { c.hit(u, c.foes(u), 1.8, 'ultimate'); }),
  boss_chesed_wave: A((c, u) => { c.hit(u, c.firstN(u, 2), 1.5, 'skill'); }),
  boss_chesed_ult: A((c, u) => { c.hit(u, c.foes(u), 2.0, 'ultimate'); }),
  boss_binah_laser: A((c, u) => { const t = c.pick(u); c.hit(u, t, 1.9, 'basic'); defDown(c, u, t, 2000, 'boss_binah_laser'); }),
  boss_binah_ult: A((c, u) => { c.hit(u, c.foes(u), 2.35, 'ultimate'); }),
};

/** 보스 임계 패턴이 처음 발동하는 순간(예언 회로가 듣는다) */
export function bossPattern(c: Battle, u: U): void { c.g.bossPattern?.(u); }

export const enemyPassives: Record<string, Passive> = {
  boss_kaiten_aura: (c, u) => c.on('turn_start', (e) => {
    if (e.src !== u || sealed(u)) return;
    for (const s of u.st.filter((x) => x.key.startsWith(`${u.uid}:kaiten`))) c.removeStatus(u, s);
    if (u.turn % 2 === 1) atkUp(c, u, u, 2500, 'boss_kaiten_aura', 1, `${u.uid}:kaiten_atk`);
    else { defUp(c, u, u, 4000, 'boss_kaiten_aura', 1, `${u.uid}:kaiten_def`); c.shield(u, u, u.maxHp * 0.12, 2, 'boss_kaiten_aura'); }
  }, u),
  boss_chesed_exposed: (c, u) => {
    const expose = () => {
      c.apply(u, u, 'st_def_down', { params: { defPct: -6000 }, turns: 1, key: `${u.uid}:exposed_def`, fx: 'boss_chesed_exposed' });
      c.apply(u, u, 'st_vuln', { params: { dmgTaken: 3500 }, turns: 1, key: `${u.uid}:exposed_vuln`, fx: 'boss_chesed_exposed' });
      bossPattern(c, u);
    };
    c.on('turn_start', (e) => { if (e.src === u && u.turn % 3 === 0 && !sealed(u)) expose(); }, u);
    c.on('unit_defeated', (e) => {
      const escorts = c.units.filter((x) => x.side === u.side && x.enemy?.id === 'en_sweeper_drone');
      if (e.tgt && escorts.includes(e.tgt) && escorts.every((x) => !x.alive) && c.battleOnce(u, 'chesed_escort')) expose();
    }, u);
  },
  boss_binah_sandstorm: (c, u) => c.on('damage_received', (e) => {
    if (e.tgt !== u || c.hpRatio(u) > 0.6 || sealed(u) || !c.battleOnce(u, 'binah_sandstorm')) return;
    bossPattern(c, u);
    const ts = c.foes(u);
    c.hit(u, ts, 1.6, 'synergy', { crit: false, fx: 'boss_binah_sandstorm' });
    for (const t of ts) spdDown(c, u, t, 15, 'boss_binah_sandstorm');
    c.g.afterBossPattern?.(u);
  }, u),
};

/** 적 정의의 효과 ID를 능력 칸으로 나눈다 */
export function enemySlots(effectIds: string[]): { basic: string; skill?: string; ult?: string; rear?: string; passives: string[] } {
  const ids = effectIds.map((x) => x.replace(/^eff_/, ''));
  const basic = ids.includes('boss_binah_laser') ? 'boss_binah_laser' : 'common_basic_atk';
  const ult = ids.find((x) => x.endsWith('_ult'));
  const rear = ids.find((x) => x.includes('rear'));
  const passives = ids.filter((x) => x in enemyPassives);
  const skill = ids.find((x) => x !== basic && x !== ult && x !== rear && x !== 'common_basic_atk' && !passives.includes(x) && x in enemyActives);
  return { basic, skill, ult, rear, passives };
}

export { guard };
