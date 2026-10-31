// 장비 12종·전략 13종(GDD v2.1 10.4 표). 장비 고정 능력치는 준비 단계에서 이미 더했고, 여기서는 효과만 붙인다.
import type { Passive } from '../engine';
import { atkUp, burn, defDown, follow, vuln, type Battle, type U } from './kit';


export const equipmentFx: Record<string, Passive> = {
  eq_watch: (c, u) => c.on('battle_start', () => { c.gainEnergy(u, 15); c.fire('eq_watch'); }, u),
  eq_peroro: (c, u) => c.on('battle_start', () => { c.shield(u, u, u.maxHp * 0.2, 2, 'eq_peroro'); }, u),
  eq_pen: (c, u) => c.on('rear_action_resolved', (e) => {
    if (e.src !== u || u.zone !== 'rear' || !c.battleOnce(u, 'eq_pen')) return;
    c.gainSp(u.side, 1);
    for (const t of c.mates(u)) c.gainEnergy(t, 10);
    c.fire('eq_pen');
  }, u),
  eq_goggles: (c, u) => {
    c.mod(u, { dmgUp: 1200 }, 'eq_goggles');
    c.on('basic_resolved', (e) => { if (e.src === u) { c.gainEnergy(u, 8); c.fire('eq_goggles'); } }, u);
  },
  eq_hotsauce: (c, u) => {
    c.mod(u, { skillDmg: 2000, ultDmg: 2000 }, 'eq_hotsauce');
    c.on('damage_dealt', (e) => { if (e.src === u && e.kind === 'ultimate' && e.tgt?.alive) burn(c, u, e.tgt, 'eq_hotsauce'); }, u);
  },
  eq_rosary: (c, u) => {
    c.mod(u, { healDone: 2500 }, 'eq_rosary');
    c.on('healed', (e) => { if (e.src === u && c.once(u, 'eq_rosary') && c.rng.chance(5000)) c.cleanse(e.tgt, 1); }, u);
  },
  eq_jammer: (c, u) => c.on('rear_action_resolved', (e) => {
    if (e.src !== u || u.zone !== 'rear') return;
    const t = c.pick(u);
    if (!t) return;
    c.delay(t, 0.15, u);
    vuln(c, u, t, 1200, 'eq_jammer');
  }, u),
  eq_plate: (c, u) => {
    c.mod(u, { dmgRed: 1500 }, 'eq_plate');
    c.on('damage_received', (e) => { if (e.tgt === u && c.hpRatio(u) <= 0.5 && c.battleOnce(u, 'eq_plate')) c.heal(u, u, u.maxHp * 0.3, 'eq_plate'); }, u);
  },
  eq_capacitor: (c, u) => {
    if (u.zone !== 'front') return;
    c.on('battle_start', () => { c.gainEnergy(u, 30); c.fire('eq_capacitor'); }, u);
    c.on('ultimate_resolved', (e) => { if (e.src === u && c.battleOnce(u, 'eq_capacitor', 2)) c.gainEnergy(u, 20); }, u);
  },
  eq_mask: (c, u) => c.on('skill_resolved', (e) => {
    if (e.src !== u) return;
    c.advance(u, 0.2);
    atkUp(c, u, u, 1500, 'eq_mask', 1);
  }, u),
  eq_headband: (c, u) => {
    c.mod(u, { followDmg: 3500 }, 'eq_headband');
    c.on('followup_resolved', (e) => { if (e.src === u && u.zone === 'front' && c.once(u, 'eq_headband') && c.rootOnce(`${u.uid}:headband`)) c.heal(u, u, u.maxHp * 0.08, 'eq_headband'); }, u);
  },
  eq_armband: (c, u) => {
    c.hook((h) => { if (h.src === u && c.hasDebuff(h.tgt)) h.out += 1800; });
    c.on('damage_dealt', (e) => { if (e.src === u && e.direct && e.tgt?.alive && e.tgt.zone === 'front') defDown(c, u, e.tgt, 2000, 'eq_armband'); }, u);
  },
};

const allyFront = (c: Battle) => c.units.filter((x) => x.side === 'ally' && x.zone === 'front' && x.hasHp);
const ally = (c: Battle) => c.units.filter((x) => x.side === 'ally');

export const strategyFx: Record<string, (c: Battle) => void> = {
  str_schale_supply: (c) => c.on('battle_start', () => { c.gainSp('ally', 2); for (const u of allyFront(c)) c.gainEnergy(u, 25); c.fire('str_schale_supply'); }),
  str_aegis_barrier: (c) => {
    for (const u of allyFront(c)) c.mod(u, { defPct: 3000 }, 'str_aegis_barrier', () => c.shieldOf(u) > 0);
    c.on('battle_start', () => { for (const u of allyFront(c)) c.shield(u, u, u.maxHp * 0.25, 3, 'str_aegis_barrier'); });
  },
  str_relief_knights: (c) => {
    for (const u of ally(c)) c.mod(u, { healDone: 3000 }, 'str_relief_knights');
    c.on('turn_start', (e) => { const u = e.src; if (u && u.side === 'ally' && u.zone === 'front' && u.hasHp) c.heal(u, u, u.maxHp * 0.06, 'str_relief_knights'); });
    c.on('healed', (e) => { const t = e.tgt; if (t && t.side === 'ally' && t.zone === 'front' && c.once(t, 'relief_energy')) c.gainEnergy(t, 8); });
  },
  str_rapid_fire: (c) => { for (const u of allyFront(c)) c.mod(u, { spd: 14, basicDmg: 3500, followDmg: 3500 }, 'str_rapid_fire'); c.fire('str_rapid_fire'); },
  str_precision_sniping: (c) => {
    for (const u of ally(c)) c.mod(u, { crit: 1800, critDmg: 3500 }, 'str_precision_sniping');
    c.on('damage_dealt', (e) => {
      const u = e.src;
      if (!u || u.side !== 'ally' || e.kind !== 'ultimate' || !e.tgt?.alive || !c.once(u, 'precision')) return;
      c.hit(u, e.tgt, 0.6, 'synergy', { true: true, fx: 'str_precision_sniping' });
    });
  },
  str_rear_command: (c) => {
    for (const u of ally(c).filter((x) => x.zone === 'rear')) c.mod(u, { spd: 20, atkPct: 2500 }, 'str_rear_command');
    let n = 0;
    c.on('rear_action_resolved', (e) => {
      if (e.src?.side !== 'ally') return;
      if (++n < 3) return;
      n = 0;
      c.gainSp('ally', 1);
      for (const u of allyFront(c).filter((x) => x.alive)) atkUp(c, null, u, 1500, 'str_rear_command');
    });
  },
  str_iron_frontline: (c) => {
    for (const u of allyFront(c)) {
      if (u.slot <= 1) c.mod(u, { hpPct: 3000, dmgRed: 1800 }, 'str_iron_frontline');
      else c.mod(u, { dmgUp: 2800, spd: 10 }, 'str_iron_frontline');
    }
    c.fire('str_iron_frontline');
  },
  str_outlaw_frenzy: (c) => {
    for (const u of allyFront(c)) c.mod(u, { dmgUp: 3500 }, 'str_outlaw_frenzy', () => c.hpRatio(u) <= 0.7);
    c.on('turn_end', (e) => { const u = e.src; if (u && u.side === 'ally' && u.zone === 'front' && u.hasHp && c.hpRatio(u) <= 0.7) c.gainEnergy(u, 15); });
    c.on('damage_received', (e) => {
      const u = e.tgt;
      if (!u || u.side !== 'ally' || !u.alive || c.hpRatio(u) > 0.3 || !c.battleOnce(u, 'frenzy_shield')) return;
      c.shield(u, u, u.maxHp * 0.25, 2, 'str_outlaw_frenzy');
    });
  },
  str_mystic_resonance: (c) => {
    for (const u of ally(c)) c.mod(u, { trueDmg: 4000 }, 'str_mystic_resonance');
    c.on('status_applied', (e) => {
      const u = e.src;
      if (!u || u.side !== 'ally' || !e.tgt || e.tgt.side !== 'enemy' || !c.once(u, 'mystic')) return;
      if (c.rng.chance(5000)) { c.gainEnergy(u, 10); c.fire('str_mystic_resonance'); }
    });
  },
  str_overclock: (c) => c.on('ultimate_resolved', (e) => {
    const u = e.src;
    if (!u || u.side !== 'ally' || u.zone !== 'front' || !c.once(u, 'overclock')) return;
    c.reduceCd(u, 1);
    c.advance(u, 0.25);
    c.fire('str_overclock');
  }),
  str_sandstorm: (c) => c.on('pulse', (e) => {
    if (![3, 6, 9].includes(e.n!)) return;
    const shooters = ally(c).filter((x) => x.alive);
    if (!shooters.length) return;
    const avg = shooters.reduce((a, x) => a + c.atk(x), 0) / shooters.length;
    const src = shooters[0];
    for (const t of c.front('enemy')) {
      c.hit(src, t, 0, 'synergy', { raw: t.boss ? avg * 1.2 : t.maxHp * 0.08, crit: false, fx: 'str_sandstorm', aoe: true });
      if (t.alive) c.apply(src, t, 'st_spd_down', { params: { spd: -15 }, fx: 'str_sandstorm', key: 'sandstorm' });
    }
  }),
  str_fireworks: (c) => {
    let n = 0;
    const count = (e: { fx?: string; src?: U }) => {
      if (e.src?.side !== 'ally' || e.fx === 'str_fireworks') return;
      if (!c.rootOnce(`fireworks:${e.src.uid}`)) return;
      if (++n < 4) return;
      n = 0;
      if (!c.rootOnce('fireworks_fire')) return;
      const top = c.highestAtk(ally(c).filter((x) => x.alive));
      if (!top) return;
      const big = c.atk(top);
      for (const t of c.front('enemy')) c.hit(top, t, 0, 'synergy', { raw: big * 1.4, fx: 'str_fireworks', aoe: true });
      for (const t of allyFront(c).filter((x) => x.alive)) c.heal(top, t, big * 0.8, 'str_fireworks');
    };
    c.on('followup_resolved', count);
    c.on('reaction_resolved', count);
  },
  str_kaiser_loan: (c) => c.fire('str_kaiser_loan'),
};

export { follow };
