// 적·보스 능력(GDD v2.1 11.1~11.2). 「아군」은 언제나 출처와 같은 진영이다.
import type { Passive } from '../engine';
import { A, atkUp, defDown, defUp, guard, silence, spdDown, spdUp, tauntFoe, type Active, type Battle, type U } from './kit';

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

  // ── v2.4 4장 「단절된 네트워크」 ──
  en_cracker_hack: A((c, u) => { const t = c.pick(u); c.hit(u, t, 1.3, 'skill'); if (t?.alive) c.gainEnergy(t, -15); }),
  en_decoy_burst: A((c, u) => { c.hit(u, c.firstN(u, 2), 1.2, 'skill'); }),
  en_amas_lockdown: A((c, u) => {
    for (const t of c.foes(u)) tauntFoe(c, u, t, 'en_amas_lockdown', 1);
    defUp(c, u, u, 3000, 'en_amas_lockdown');
  }),
  en_jammer_rear: A((c, u) => {
    c.hit(u, c.pick(u), 1.2, 'rear');
    // 밀레니엄 시너지가 켜져 있으면 SP 탈취는 2번에 1번(4장 연동)
    u.d.jams = (u.d.jams ?? 0) + 1;
    if (c.tier('syn_millennium') !== undefined && u.d.jams % 2 === 0) return;
    c.gainSp(c.foe(u.side), -1);
  }),
  en_avatar_purge: A((c, u) => {
    const ts = c.foes(u);
    for (const t of ts) c.dispel(t, 1);
    c.hit(u, ts, 0.9, 'skill');
    c.shield(u, u, u.maxHp * 0.15, 2, 'en_avatar_purge');
  }),
  en_avatar_ult: A((c, u) => { c.hit(u, c.pick(u), 2.2, 'ultimate'); }),
  boss_hod_jam: A((c, u) => { const ts = c.firstN(u, 2); c.hit(u, ts, 1.1, 'basic'); for (const t of ts) if (t?.alive) c.gainEnergy(t, -10); }),
  boss_hod_silence: A((c, u) => {
    const ts = c.foes(u);
    const t = ts.length ? ts.reduce((a, b) => (b.energy > a.energy ? b : a)) : undefined;
    c.hit(u, t, 1.6, 'skill');
    if (t?.alive) silence(c, u, t, 'boss_hod_silence', 1);
  }),
  boss_hod_ult: A((c, u) => { c.hit(u, c.foes(u), 1.4, 'ultimate'); const side = c.foe(u.side); c.gainSp(side, -c.sp[side]); }),

  // ── v2.4 5장 「방주의 심장」 ──
  en_nameless_strike: A((c, u) => { c.hit(u, c.pick(u), 1.45, 'skill'); }),
  en_ark_battery_rear: A((c, u) => { c.hit(u, c.pick(u), 1.3, 'rear'); }),
  en_color_smite: A((c, u) => { c.hit(u, c.firstN(u, 2), 1.4, 'skill'); }),
  en_gate_seal: A((c, u) => {
    for (const t of c.foes(u)) tauntFoe(c, u, t, 'en_gate_seal', 1);
    const rear = c.units.filter((x) => x.side !== u.side && x.zone === 'rear' && x.alive);
    const t = c.randomOf(rear);
    if (t) c.delay(t, 1.0, u);
  }),
  en_hiero_rite: A((c, u) => {
    const t = c.lowestRatio(c.mates(u))[0];
    if (t) c.heal(u, t, t.maxHp * 0.25, 'en_hiero_rite');
    for (const f of c.foes(u)) c.apply(u, f, 'st_healing_received_down', { params: { healRecv: -5000 }, turns: 1, fx: 'en_hiero_rite' });
  }),
  en_hiero_ult: A((c, u) => { c.hit(u, c.foes(u), 1.7, 'ultimate'); }),
  boss_keter_gate: A((c, u) => {
    const ts = c.foes(u);
    c.hit(u, ts, 1.2, 'skill');
    const t = c.randomOf(ts.filter((x) => x.alive));
    if (t) c.gainEnergy(t, -100);
  }),
  boss_keter_ult: A((c, u) => { c.hit(u, c.foes(u), 2.2, 'ultimate'); }),
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
  // ── v2.4 4·5장 ──
  en_decoy_mirage: (c, u) => {
    c.hook((h) => {
      if (h.tgt !== u || u.d.mirageUsed || sealed(u) || !['basic', 'skill', 'ultimate', 'rear'].includes(h.kind)) return;
      u.d.mirageUsed = true;
      h.cancel = true;
      c.fire('en_decoy_mirage');
    });
    c.on('unit_defeated', (e) => {
      if (e.tgt !== u || !c.battleOnce(u, 'decoy_shield')) return;
      for (const t of c.mates(u)) if (t !== u && t.alive) c.shield(u, t, t.maxHp * 0.15, 2, 'en_decoy_mirage');
    }, u, true);
  },
  en_amas_aura: (c, u) => {
    for (const t of c.units.filter((x) => x.side === u.side && x.zone === 'front' && x !== u)) {
      c.mod(t, { dmgRed: 1500 }, 'en_amas_aura', () => u.alive && !sealed(u) && !c.units.some((o) => o !== u && o.alive && o.enemy?.id === 'en_amas_guard' && o.uid < u.uid));
    }
  },
  boss_hod_mirror: (c, u) => c.on('damage_received', (e) => {
    if (e.tgt !== u || !u.alive || c.hpRatio(u) > 0.5 || sealed(u) || !c.battleOnce(u, 'hod_mirror')) return;
    bossPattern(c, u);
    c.fire('boss_hod_mirror');
    c.shield(u, u, u.maxHp * 0.15, 3, 'boss_hod_mirror');
    guard(c, u, u, 3000, 'boss_hod_mirror', 3);
    c.g.afterBossPattern?.(u);
  }, u),
  en_nameless_zeal: (c, u) => c.on('turn_end', (e) => {
    if (e.src !== u || sealed(u)) return;
    const n = (u.d.zeal ?? 0) as number;
    if (n >= 5) return;
    u.d.zeal = n + 1;
    atkUp(c, u, u, 800, 'en_nameless_zeal', 99, `${u.uid}:zeal${n}`);
  }, u),
  en_ark_barrage: (c, u) => c.on('pulse', (e) => {
    if (!e.n || e.n % 3 !== 0 || sealed(u)) return;
    c.hit(u, c.foes(u), 0.9, 'synergy', { crit: false, fx: 'en_ark_barrage', aoe: true });
  }, u),
  en_color_revive: (c, u) => {
    c.saves.push((x) => {
      if (x !== u || u.d.revived || sealed(u)) return false;
      u.d.revived = true;
      u.hp = 0;
      c.heal(u, u, u.maxHp * 0.4, 'en_color_revive');
      c.fire('en_color_revive');
      return true;
    });
  },
  boss_keter_phase: (c, u) => {
    c.on('damage_received', (e) => {
      if (e.tgt !== u || !u.alive || sealed(u)) return;
      if (c.hpRatio(u) <= 0.66 && c.battleOnce(u, 'keter_p2')) {
        bossPattern(c, u);
        c.fire('boss_keter_phase');
        const al1s = c.units.some((x) => x.side !== u.side && x.unit?.id === 'u_al1s');
        c.shield(u, u, u.maxHp * (al1s ? 0.075 : 0.15), 3, 'boss_keter_phase');
        guard(c, u, u, 2500, 'boss_keter_phase', 3);
        c.g.afterBossPattern?.(u);
      }
      if (c.hpRatio(u) <= 0.33 && c.battleOnce(u, 'keter_p3')) {
        bossPattern(c, u);
        u.d.keterRage = 0;
        c.g.afterBossPattern?.(u);
      }
    }, u);
    c.on('turn_end', (e) => {
      if (e.src !== u || u.d.keterRage === undefined || sealed(u)) return;
      const n = (u.d.keterRage as number) + 1;
      u.d.keterRage = n;
      atkUp(c, u, u, 1000, 'boss_keter_phase', 99, `${u.uid}:rage${n}`);
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
  const basic = ids.includes('boss_binah_laser') ? 'boss_binah_laser' : ids.includes('boss_hod_jam') ? 'boss_hod_jam' : 'common_basic_atk';
  const ult = ids.find((x) => x.endsWith('_ult'));
  const rear = ids.find((x) => x.includes('rear'));
  const passives = ids.filter((x) => x in enemyPassives);
  const skill = ids.find((x) => x !== basic && x !== ult && x !== rear && x !== 'common_basic_atk' && !passives.includes(x) && x in enemyActives);
  return { basic, skill, ult, rear, passives };
}

export { guard };
