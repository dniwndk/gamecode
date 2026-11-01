// 시너지 단계 효과 116개(docs/GDD_v2.3_amendment.md 1장, GDD v2.1 10.4). 켜진 단계의 효과 하나만 등록한다.
// 「하위 효과 포함」 단계는 아래 단계의 수치를 대체하고 반응은 이어받는다. scale: 티파티 삼두정치로 최고 단계 수치 +30%.
import type { Battle, Ev, U } from './kit';
import { atkDown, atkUp, buff, burn, critUp, defDown, dmgUp, follow, guard, keyHack, spdDown, stun, taunt, vuln } from './kit';

type SynFx = (c: Battle, k: number) => void;
const ally = (c: Battle) => c.units.filter((x) => x.side === 'ally');
/** 아리스와 각성 형태(v2.4.8 무장 아리스 포함) */
const ARIS_FORMS = new Set(['u_aris', 'u_al1s', 'u_aris_armed']);
const allyFront = (c: Battle) => ally(c).filter((x) => x.zone === 'front' && x.hasHp);
const mem = (c: Battle, syn: string) => ally(c).filter((x) => x.tags.has(syn));
const s = (k: number, x: number) => Math.round(x * k);
const isMem = (u: U | undefined, syn: string) => !!u && u.side === 'ally' && u.tags.has(syn);
const DIRECT = new Set(['basic', 'skill', 'ultimate', 'rear']);
/** 구성원 능력치(비구성원은 others 배율) */
function stats(c: Battle, syn: string, id: string, bag: Record<string, number>, others = 0, k = 1): void {
  for (const u of ally(c)) {
    const f = u.tags.has(syn) ? 1 : others;
    if (!f) continue;
    const b: Record<string, number> = {};
    for (const [key, v] of Object.entries(bag)) b[key] = s(k * f, v);
    c.mod(u, b, id);
  }
}
const startEnergy = (c: Battle, list: () => U[], n: number, syn: string, label: string) =>
  c.on('battle_start', () => { const l = list(); if (!l.length) return; c.proc('synergy', syn, label); for (const u of l) c.gainEnergy(u, n); });

// ── 아비도스 ──
function abydos(tier: 2 | 4 | 6): SynFx {
  return (c, k) => {
    const SYN = 'syn_abydos';
    if (tier === 2) { stats(c, SYN, 'abydos', { atkPct: 1500, defPct: 1500 }, 0, k); startEnergy(c, () => mem(c, SYN).filter((x) => x.zone === 'front'), 20, SYN, '아비도스 · 초기 에너지'); return; }
    const all = tier === 4 ? 2000 : 3000;
    const own = tier === 4 ? 3000 : 5000;
    for (const u of ally(c)) c.mod(u, { atkPct: s(k, u.tags.has(SYN) ? own : all), defPct: s(k, u.tags.has(SYN) ? own : all) }, 'abydos');
    startEnergy(c, () => allyFront(c), tier === 4 ? 35 : 50, SYN, '아비도스 · 초기 에너지');
    c.on('ultimate_resolved', (e) => {
      if (!isMem(e.src, SYN)) return;
      const free = !!e.src!.d.lastStandUlt;
      e.src!.d.lastStandUlt = false;
      if (!c.rootOnce('abydos') || (!free && !c.pulseOnce('abydos', 2))) return;
      const shooters = c.mates(e.src!).filter((x) => x.tags.has(SYN));
      c.proc('synergy', SYN, tier === 4 ? '합동 후속 사격' : '합동 일제 사격', e.src);
      for (const sh of shooters) {
        if (tier === 4) follow(c, sh, c.pick(sh), 0.8, 'syn_abydos_4');
        else { follow(c, sh, c.foes(sh), 1.1, 'syn_abydos_6'); c.gainEnergy(sh, 15); }
      }
    });
  };
}

// ── 게헨나 ──
function gehenna(tier: 2 | 4 | 6 | 8): SynFx {
  return (c, k) => {
    const SYN = 'syn_gehenna';
    const atk = { 2: 1600, 4: 2800, 6: 4500, 8: 6000 }[tier];
    const cd = { 2: 2000, 4: 3500, 6: 5500, 8: 7500 }[tier];
    stats(c, SYN, 'gehenna', { atkPct: atk, critDmg: cd }, tier >= 6 ? 0.5 : 0, k);
    if (tier < 4) return;
    let bombs = 0;
    let totals = 0;
    c.on('damage_dealt', (e) => {
      const u = e.src;
      if (!isMem(u, SYN) || (e.kind !== 'skill' && e.kind !== 'ultimate') || !e.tgt) return;
      if (u!.zone === 'front' && e.tgt.alive && c.once(u!, 'gehenna_blast')) { c.proc('synergy', SYN, '추가 폭발', u); follow(c, u!, e.tgt, 0.7, `syn_gehenna_${tier === 8 ? 'plat' : tier}`); }
      if (tier >= 6 && c.rootOnce('gehenna_bomb') && c.pulseOnce('gehenna_bomb', tier === 8 ? 3 : 2)) {
        bombs++;
        c.proc('synergy', SYN, '광역 폭격', u, bombs);
        follow(c, u!, c.foes(u!), 1.1, `syn_gehenna_${tier === 8 ? 'plat' : 6}`);
        c.gainEnergy(u!, 15);
        if (tier === 8 && bombs % 3 === 0) {
          c.proc('synergy', SYN, '만마전 총폭격!', u, ++totals);
          follow(c, u!, c.foes(u!), 1.8, 'syn_gehenna_plat', { bonus: 2000 * (totals - 1) });
        }
      }
    });
  };
}

// ── 밀레니엄 ──
function millennium(tier: 2 | 4 | 6 | 8): SynFx {
  return (c, k) => {
    const SYN = 'syn_millennium';
    // v2.4.5: 사용자 요청으로 모든 수치 절반
    const t = { 2: { sh: 0.075, atk: 700, dmg: 0, crit: 0, en: 0 }, 4: { sh: 0.11, atk: 1250, dmg: 1000, crit: 0, en: 0 }, 6: { sh: 0.16, atk: 2000, dmg: 1750, crit: 750, en: 10 }, 8: { sh: 0.2, atk: 2750, dmg: 2250, crit: 1000, en: 12 } }[tier];
    stats(c, SYN, 'millennium', { atkPct: t.atk }, 0, k);
    const src = () => mem(c, SYN)[0] ?? allyFront(c)[0];
    const wave = (label: string) => {
      const from = src(); if (!from) return;
      c.proc('synergy', SYN, label);
      for (const u of allyFront(c).filter((x) => x.alive)) { c.shield(from, u, u.maxHp * t.sh * k, 2, `syn_millennium_${tier === 8 ? 'plat' : tier}`); if (t.en) c.gainEnergy(u, t.en); }
    };
    c.on('battle_start', () => wave('보호막 전개'));
    if (tier >= 4) c.on('pulse', (e) => { if (e.n! % 2 === 0) wave('보호막 재전개'); });
    if (t.dmg) for (const u of allyFront(c)) c.mod(u, { dmgUp: s(k, t.dmg), crit: s(k, t.crit) }, 'millennium', () => c.shieldOf(u) > 0);
    if (tier === 8) c.on('shield_broken', (e) => {
      if (!e.tgt || e.tgt.side !== 'ally' || !e.src || e.src.side === 'ally' || !e.src.alive || !c.once(e.tgt, 'millennium_reflect')) return;
      c.proc('synergy', SYN, '프라이스 반격', e.tgt);
      c.rawDamage(e.tgt, e.src, Math.floor(e.amount! * 0.3), { true: true, kind: 'synergy', fx: 'syn_millennium_plat', silent: true });
    });
  };
}

// ── 트리니티 ──
function trinity(tier: 2 | 4 | 6 | 8): SynFx {
  return (c, k) => {
    const SYN = 'syn_trinity';
    const t = { 2: [1500, 1500, 0, 0, 0], 4: [2800, 2800, 3500, 1800, 0], 6: [4500, 4500, 5000, 3200, 2000], 8: [6000, 6000, 6500, 4000, 2500] }[tier];
    stats(c, SYN, 'trinity', { hpPct: t[0], atkPct: t[1], healRecv: t[2] }, 0, k);
    if (tier === 2 || tier === 8) for (const u of allyFront(c)) c.mod(u, { healRecv: s(k, 2000) }, 'trinity_front');
    if (tier === 2) return;
    let bell = 0;
    const fx = `syn_trinity_${tier === 8 ? 'plat' : tier}`;
    c.on('healed', (e) => {
      const u = e.tgt;
      if (!u || u.side !== 'ally' || u.zone !== 'front') return;
      if (tier >= 6) c.cleanse(u, 1);
      dmgUp(c, null, u, { dmgUp: s(k, t[3]) }, fx, 2, 'trinity_heal');
      if (t[4]) critUp(c, null, u, s(k, t[4]), fx);
      if (c.pulseOnce('trinity_sp')) {
        c.proc('synergy', SYN, '첫 치유 · SP +1', u);
        c.gainSp('ally', 1);
        if (tier >= 6) for (const m of allyFront(c).filter((x) => x.alive)) c.gainEnergy(m, 15);
      }
    });
    if (tier === 8) c.overheal.push((_src, tgt, over) => {
      if (tgt.side !== 'ally') return;
      bell += over;
      const cap = ally(c).filter((x) => x.hasHp).reduce((a, x) => a + x.maxHp, 0) * 0.25;
      if (bell >= cap) {
        const amt = bell * 1.5; bell = 0;
        c.proc('synergy', SYN, '종소리!', tgt);
        for (const f of c.front('enemy')) c.rawDamage(tgt, f, amt, { kind: 'synergy', fx: 'syn_trinity_plat', silent: true });
      }
    });
  };
}

// ── 백귀야행 ──
function hyakkiyako(tier: 2 | 4 | 6 | 8): SynFx {
  return (c, k) => {
    const SYN = 'syn_hyakkiyako';
    const t = { 2: { all: 0, spd: 12, atk: 1500, crit: 0, lim: 0 }, 4: { all: 10, spd: 22, atk: 3000, crit: 0, lim: 3 }, 6: { all: 18, spd: 35, atk: 4800, crit: 2000, lim: 3 }, 8: { all: 24, spd: 45, atk: 6000, crit: 2500, lim: 4 } }[tier];
    for (const u of ally(c)) c.mod(u, u.tags.has(SYN) ? { spd: s(k, t.spd), atkPct: s(k, t.atk), crit: s(k, t.crit) } : { spd: s(k, t.all) }, 'hyakkiyako');
    const fx = `syn_hyakkiyako_${tier === 8 ? 'plat' : tier}`;
    // 도깨비불: 기본/스킬 해소 시 대상에게 45% true(유닛당 차례당 1회)
    if (tier === 2 || tier === 8 || tier === 4 || tier === 6) c.on('damage_dealt', (e) => {
      if (!isMem(e.src, SYN) || (e.kind !== 'basic' && e.kind !== 'skill') || !e.tgt?.alive || !c.once(e.src!, 'onibi')) return;
      c.proc('synergy', SYN, '도깨비불', e.src);
      const r = c.hit(e.src!, e.tgt, 0.45, 'synergy', { true: true, fx });
      c.g.onibiMark?.(e.src, r);
    });
    if (!t.lim) return;
    let actions = 0;
    c.on('ally_action_resolved', (e) => {
      if (!isMem(e.src, SYN)) return;
      actions++;
      if (!c.rootOnce('hyakki') || !c.pulseOnce('hyakki', t.lim)) return;
      const u = e.src!;
      const front = c.pick(u);
      c.proc('synergy', SYN, tier >= 6 ? '백야제 만개화' : '여우불 행렬', u);
      const r1 = c.hit(u, front, 0.9, 'synergy', { true: true, fx });
      c.g.onibiMark?.(u, r1);
      vuln(c, u, front, 1500, fx);
      if (tier >= 6) {
        const r2 = c.hit(u, c.foes(u), 1.2, 'synergy', { true: true, fx });
        c.g.onibiMark?.(u, r2);
        for (const m of allyFront(c).filter((x) => x.alive)) c.advance(m, 0.1);
      }
    });
    if (tier === 8) c.on('pulse', () => {
      if (actions >= 3) {
        const u = mem(c, SYN).find((x) => x.alive);
        if (u) { c.proc('synergy', SYN, '백야제 대행렬!', u); c.hit(u, c.foes(u), 2.0, 'synergy', { true: true, fx }); }
      }
      actions = 0;
    });
  };
}

// ── 산해경 ──
function shanhaijing(tier: 2 | 4): SynFx {
  return (c, k) => {
    const SYN = 'syn_shanhaijing';
    if (tier === 2) {
      stats(c, SYN, 'shanhaijing', { atkPct: 1800, ultDmg: 2000 }, 0, k);
      startEnergy(c, () => mem(c, SYN).filter((x) => x.zone === 'front'), 25, SYN, '산해경 · 초기 에너지');
      return;
    }
    for (const u of ally(c)) c.mod(u, { atkPct: s(k, u.tags.has(SYN) ? 3600 : 2400), ultDmg: s(k, 3500) }, 'shanhaijing');
    startEnergy(c, () => allyFront(c), 40, SYN, '산해경 · 초기 에너지');
    c.on('ultimate_resolved', (e) => {
      const u = e.src;
      if (!u || u.side !== 'ally' || !c.rootOnce('shanhai') || !c.pulseOnce('shanhai', 2)) return;
      c.proc('synergy', SYN, '필살기 환급', u);
      c.heal(u, u, u.maxHp * 0.15, 'syn_shanhaijing_4');
      c.gainEnergy(u, 20);
    });
  };
}

// ── 붉은겨울 ──
function redWinter(tier: 2 | 4): SynFx {
  return (c, k) => {
    const SYN = 'syn_red_winter';
    const fx = `syn_red_winter_${tier}`;
    if (tier === 2) stats(c, SYN, 'red_winter', { atkPct: 1600, hpPct: 1600 }, 0, k);
    else for (const u of ally(c)) c.mod(u, { atkPct: s(k, 2500), hpPct: s(k, 2500) }, 'red_winter');
    const purge = (start: boolean) => {
      const src = mem(c, SYN).find((x) => x.alive) ?? allyFront(c)[0];
      const t = c.highestHp(c.front('enemy'));
      if (!src || !t) return;
      c.proc('synergy', SYN, '숙청 표적');
      c.apply(src, t, 'st_vuln', { params: { dmgTaken: s(k, tier === 2 ? 2000 : 3500) }, turns: tier === 2 ? 3 : 2, key: 'purge', fx });
      if (tier === 4) {
        if (!start || true) c.gainSp('ally', 1);
        for (const m of allyFront(c).filter((x) => x.alive)) critUp(c, null, m, s(k, 2000), fx);
      }
    };
    c.on('battle_start', () => purge(true));
    if (tier === 4) c.on('pulse', (e) => { if (e.n! % 2 === 0) purge(false); });
  };
}

// ── 발키리 ──
function valkyrie(tier: 2 | 3): SynFx {
  return (c, k) => {
    const SYN = 'syn_valkyrie';
    const fx = `syn_valkyrie_${tier}`;
    if (tier === 2) stats(c, SYN, 'valkyrie', { defPct: 2500, atkPct: 1800 }, 0, k);
    else for (const u of ally(c)) c.mod(u, { defPct: s(k, 3500), atkPct: s(k, 2800) }, 'valkyrie');
    const wanted = () => {
      const t = c.highestAtk(c.front('enemy'));
      const src = mem(c, SYN).find((x) => x.alive) ?? null;
      if (!t) return;
      c.proc('synergy', SYN, '수배자 지정');
      c.g.wanted = t;
      atkDown(c, src, t, s(k, 2000), fx);
      defDown(c, src, t, s(k, 2000), fx);
    };
    c.on('battle_start', wanted);
    c.on('pulse', (e) => {
      if (e.n! % 2 !== 0) return;
      wanted();
      if (tier === 3 && e.n! <= 10) {
        c.proc('synergy', SYN, '일제 단속');
        for (const t of c.front('enemy')) { buff(c, null, t, 'st_atk_down', { atkPct: -s(k, 2500) }, fx, 2, 'valk_sweep'); buff(c, null, t, 'st_def_down', { defPct: -s(k, 3000) }, fx, 2, 'valk_sweep'); }
      }
    });
    if (tier === 3) c.on('damage_dealt', (e) => {
      if (!e.direct || e.src?.side !== 'ally' || !e.tgt?.alive || !c.hasDebuff(e.tgt)) return;
      if (!c.rootOnce('valk') || !c.pulseOnce('valk', 2)) return;
      c.proc('synergy', SYN, '체포 협조', e.src);
      c.delay(e.tgt, 0.15, e.src);
      for (const m of mem(c, SYN).filter((x) => x.zone === 'front' && x.alive)) c.gainEnergy(m, 15);
    });
  };
}

// ── SRT ──
function srt(tier: 2 | 4): SynFx {
  return (c, k) => {
    const SYN = 'syn_srt';
    const both = allyFront(c).length > 0 && ally(c).some((x) => x.zone === 'rear');
    if (tier === 2) stats(c, SYN, 'srt', { atkPct: 2000, crit: 1500 }, 0, k);
    else for (const u of ally(c)) c.mod(u, { atkPct: s(k, u.tags.has(SYN) ? 4000 : 2500), crit: s(k, 2200) }, 'srt');
    if (both) {
      stats(c, SYN, 'srt_guard', { dmgRed: 1500 }, 0, k);
      if (tier === 2) startEnergy(c, () => mem(c, SYN).filter((x) => x.zone === 'front'), 20, SYN, 'SRT · 초기 에너지');
    }
    if (tier === 2) return;
    startEnergy(c, () => allyFront(c), 35, SYN, 'SRT · 초기 에너지');
    const cover = (by: U) => {
      const front = mem(c, SYN).filter((x) => x.zone === 'front' && x.alive);
      if (!front.length) return;
      c.proc('synergy', SYN, '전술 엄호', by);
      for (const f of front) c.shield(by, f, f.maxHp * 0.15, 2, 'syn_srt_4');
    };
    c.on('rear_action_resolved', (e) => { if (e.src?.side === 'ally') cover(e.src); });
    c.on('reaction_resolved', (e) => { if (e.src?.side === 'ally') cover(e.src); });
    const strike = (e: Ev) => {
      if (!isMem(e.src, SYN) || e.src!.zone !== 'front' || !c.rootOnce('srt_strike') || !c.pulseOnce('srt_strike', 2)) return;
      const rear = mem(c, SYN).filter((x) => x.zone === 'rear');
      if (!rear.length) return;
      c.proc('synergy', SYN, '전술 지원 폭격', e.src);
      for (const r of rear) follow(c, r, c.front('enemy'), 1.1, 'syn_srt_4');
    };
    c.on('skill_resolved', strike);
    c.on('ultimate_resolved', strike);
  };
}

// ── 아리우스 ──
function arius(tier: 2 | 4): SynFx {
  return (c, k) => {
    const SYN = 'syn_arius';
    if (tier === 2) stats(c, SYN, 'arius', { atkPct: 1800, critDmg: 3000 }, 0, k);
    else stats(c, SYN, 'arius', { atkPct: 3500, crit: 2500, critDmg: 5500 }, 0.5, k);
    c.hook((h) => { if (isMem(h.src, SYN) && c.hasDebuff(h.tgt)) h.out += s(k, 2000); });
    if (tier === 2) return;
    c.on('battle_start', () => {
      c.proc('synergy', SYN, '전방 방어 붕괴');
      const src = mem(c, SYN)[0] ?? null;
      for (const t of c.front('enemy')) c.apply(src, t, 'st_def_down', { params: { defPct: -s(k, 3000) }, turns: 3, key: 'arius_start', fx: 'syn_arius_4' });
    });
    c.on('damage_dealt', (e) => {
      const u = e.src;
      if (!isMem(u, SYN) || !e.tgt || !c.hasDebuff(e.tgt) || !e.hp || !c.once(u!, 'arius_drain')) return;
      if (u!.zone === 'front') c.heal(u!, u, e.hp * 0.2, 'syn_arius_4');
      c.gainEnergy(u!, 12);
    });
  };
}

// ── 흥신소68 ──
function ps68(tier: 2 | 4): SynFx {
  return (c) => {
    const SYN = 'syn_problem_solver';
    let fee = 0;
    c.on('unit_defeated', (e) => {
      if (e.tgt?.side === 'enemy' && isMem(e.src, SYN) && fee < 2) { fee++; c.proc('synergy', SYN, `의뢰비 +1G`, e.src, fee); }
      if (tier === 4 && e.tgt && isMem(e.tgt, SYN) && c.battleOnce(e.tgt, 'ps68_mine')) {
        c.proc('synergy', SYN, '지뢰 폭발!', e.tgt);
        c.hit(e.tgt, c.front('enemy'), 1.2, 'synergy', { fx: 'syn_ps68_4' });
      }
    }, null, true);
    c.ends.push(() => { if (fee) c.gold.push({ label: '흥신소68 · 의뢰비', value: fee }); });
  };
}

// ── C&C ──
function cc(tier: 2 | 4): SynFx {
  return (c) => {
    const SYN = 'syn_cc';
    c.on('unit_defeated', (e) => {
      if (e.tgt?.side === 'enemy' && isMem(e.src, SYN) && e.src!.alive) { c.proc('synergy', SYN, '청소 완료', e.src); c.advance(e.src!, 0.2); }
    });
    if (tier === 4) c.hook((h) => { if (isMem(h.src, SYN) && h.tgt.side === 'enemy' && c.hpRatio(h.tgt) <= 0.3 && DIRECT.has(h.kind)) h.forceCrit = true; });
  };
}

// ── 하이랜더 ──
function highlander(tier: 1 | 2): SynFx {
  return (c, k) => {
    const SYN = 'syn_highlander';
    if (tier === 1) {
      stats(c, SYN, 'highlander', { spd: 15, atkPct: 1800 }, 0, k);
      c.on('battle_start', () => { for (const u of mem(c, SYN)) c.advance(u, 0.2); c.proc('synergy', SYN, '출발 진행!'); });
      return;
    }
    for (const u of allyFront(c)) {
      const star = u.unit?.id === 'u_nozomi' || u.unit?.id === 'u_hikari';
      c.mod(u, { spd: s(k, star ? 36 : 18), atkPct: s(k, star ? 4400 : 2200) }, 'highlander');
    }
    c.on('battle_start', () => { c.proc('synergy', SYN, '전 차량 출발'); for (const u of allyFront(c)) c.advance(u, 0.25); });
    const train = (e: Ev) => {
      const u = e.src;
      if (!u || (u.unit?.id !== 'u_nozomi' && u.unit?.id !== 'u_hikari') || u.side !== 'ally' || !c.once(u, 'express') || !c.rootOnce('express')) return;
      c.proc('synergy', SYN, '대륙횡단 급행열차!', u);
      let r = c.hit(u, c.foes(u), 1.3, 'synergy', { fx: 'syn_highlander_2' });
      c.gainSp('ally', 1);
      // 무정차 운행표: 처치하면 70%로 한 번 더(최대 3연속)
      for (let i = 0; i < 2 && c.has('oop_express_ticket') && r.some((x) => x.killed) && c.foes(u).length; i++) {
        c.proc('oopart', 'oop_express_ticket', '무정차 운행!', u, i + 2);
        r = c.hit(u, c.foes(u), 1.3 * 0.7, 'synergy', { fx: 'syn_highlander_2' });
      }
    };
    c.on('skill_resolved', train);
    c.on('ultimate_resolved', train);
  };
}

// ── 무법자 ──
function outlaw(tier: 2 | 4): SynFx {
  return (c, k) => {
    const SYN = 'syn_outlaw';
    if (tier === 2) stats(c, SYN, 'outlaw', { atkPct: 2200, hpPct: 2000 }, 0, k);
    else stats(c, SYN, 'outlaw', { atkPct: 4500, hpPct: 3500, critDmg: 5000 }, 0.5, k);
    const steal = tier === 2 ? 0.15 : 0.2;
    c.on('damage_dealt', (e) => {
      if (!isMem(e.src, SYN) || !e.direct || e.kind === 'rear' || !e.hp || e.src!.zone !== 'front') return;
      c.heal(e.src!, e.src, e.hp * steal, `syn_outlaw_${tier}`);
    });
    if (tier === 2) return;
    const loot = (u: U | undefined) => {
      if (!u || !isMem(u, SYN) || !u.alive || !c.once(u, 'outlaw_loot', 2) || !c.rootOnce('outlaw_loot')) return;
      c.proc('synergy', SYN, '약탈 폭격', u);
      c.hit(u, c.front('enemy'), 1.35, 'synergy', { true: true, fx: 'syn_outlaw_4' });
      c.gainEnergy(u, 25);
    };
    c.on('ultimate_resolved', (e) => loot(e.src));
    c.on('unit_defeated', (e) => { if (e.tgt?.side === 'enemy') loot(e.src); });
  };
}

// ── 스나이퍼 ──
function sniper(tier: 2 | 4 | 6): SynFx {
  return (c, k) => {
    const SYN = 'syn_sniper';
    stats(c, SYN, 'sniper', { crit: { 2: 1500, 4: 3000, 6: 4500 }[tier] }, 0, k);
    const quimbaya = c.has('oop_quimbaya_plane');
    if (tier === 2 && !quimbaya) return;
    const bonus = tier === 2 ? 2500 : tier === 4 ? 5000 : 8000;
    const aim = (label: string) => {
      const t = c.highestHp(c.front('enemy'));
      c.g.aim = t; c.g.aimFresh = true;
      if (t) c.proc(tier === 2 ? 'oopart' : 'synergy', tier === 2 ? 'oop_quimbaya_plane' : SYN, label);
    };
    c.on('battle_start', () => aim('조준'));
    c.hook((h) => {
      if (!isMem(h.src, SYN) || h.tgt !== c.g.aim) return;
      h.critDmg += s(k, bonus);
      if (quimbaya && c.g.aimFresh && tier >= 4) { h.forceCrit = true; c.g.aimFresh = false; }
    });
    if (tier === 2) return;
    c.on('unit_defeated', (e) => {
      if (e.tgt !== c.g.aim) return;
      if (tier === 6 || quimbaya) {
        aim('연속 조준');
        if (tier === 6) for (const m of mem(c, SYN)) c.gainEnergy(m, 30);
      }
    });
  };
}

// ── 선도부 ──
function prefect(tier: 2 | 4): SynFx {
  return (c) => {
    const SYN = 'syn_prefect';
    c.on('battle_start', () => {
      const t = c.front('enemy').concat(c.rear('enemy')).find((x) => x.st.some((st) => !st.debuff));
      if (t && c.dispel(t, 1).length) c.proc('synergy', SYN, '단속!');
    });
    if (tier === 2) return;
    const hina = () => ally(c).find((x) => x.unit?.id === 'u_hina');
    for (const u of mem(c, SYN).filter((x) => x.unit?.id !== 'u_hina')) {
      c.mod(u, { dmgRed: 1500 }, 'prefect', () => !!hina()?.alive);
      c.mod(u, { atkPct: 4000 }, 'prefect', () => !!hina() && !hina()!.alive);
    }
  };
}

// ── 미식연구회·급양부 ──
function gourmet(tier: 2 | 4): SynFx {
  return (c) => {
    const SYN = 'syn_gourmet';
    c.on('unit_defeated', (e) => {
      const u = e.src;
      if (e.tgt?.side !== 'enemy' || !isMem(u, SYN) || !c.once(u!, 'zero_star')) return;
      const near = c.front('enemy').filter((x) => Math.abs(x.slot - e.tgt!.slot) <= 1);
      if (!near.length) return;
      c.proc('synergy', SYN, '별점 0개!', u);
      c.hit(u!, near, 0.7, 'synergy', { fx: `syn_gourmet_${tier}` });
      if (c.has('oop_zero_star_review')) { c.proc('oopart', 'oop_zero_star_review', '가게가 탄다'); for (const t of near) burn(c, u!, t, 'oop_zero_star_review', 1); }
    });
    if (tier === 2) return;
    const lunch = mem(c, 'syn_school_lunch');
    if (!lunch.length) return;
    c.g.kidnapped = true;
    c.on('battle_start', () => c.proc('synergy', SYN, '급양부 납치!'));
    c.on('damage_dealt', (e) => {
      const u = e.src;
      if (!isMem(u, SYN) || !e.direct || u!.zone !== 'front' || !c.pulseOnce(`kidnap:${u!.uid}`, 2)) return;
      c.heal(lunch[0], u, c.atk(lunch[0]) * 0.4, 'syn_gourmet_4');
    });
  };
}

// ── 공통 처리가 필요 없는 단순 시너지들 ──
const SIMPLE: Record<string, SynFx> = {
  syn_school_lunch_2: (c) => {
    for (const u of ally(c)) c.mod(u, { hpPct: 1000 }, 'school_lunch', () => !c.g.kidnapped);
    for (const u of ally(c)) c.mod(u, { hpPct: 2000 }, 'school_lunch', () => !!c.g.kidnapped);
    c.on('battle_start', () => c.proc('synergy', 'syn_school_lunch', '든든한 급식'));
  },
  syn_hot_spring_2: (c) => c.on('battle_start', () => {
    const src = mem(c, 'syn_hot_spring')[0];
    if (!src) return;
    c.proc('synergy', 'syn_hot_spring', '온천 폭파!');
    for (const t of c.front('enemy')) { c.delay(t, 0.15, src); burn(c, src, t, 'syn_hot_spring_2'); }
    if (c.has('oop_hot_spring_map')) { c.proc('oopart', 'oop_hot_spring_map', '온천수 분출'); const t = c.lowestRatio(allyFront(c))[0]; c.heal(src, t, (t?.maxHp ?? 0) * 0.1); }
  }),
  syn_game_dev_2: (c) => gameDev(c, 1),
  syn_game_dev_4: (c) => gameDev(c, 2),
  syn_veritas_2: (c) => veritas(c, false),
  syn_veritas_4: (c) => veritas(c, true),
  syn_seminar_2: (c) => c.fire('syn_seminar_2'),
  syn_seminar_4: (c) => c.fire('syn_seminar_4'),
  syn_engineering_2: (c) => engineering(c, 1),
  syn_engineering_3: (c) => engineering(c, 2),
  syn_paranormal_2: (c) => c.on('battle_start', () => {
    const t = c.highestAtk(c.front('enemy'));
    if (!t) return;
    t.d.sealedUntil = t.turn + 2;
    c.proc('synergy', 'syn_paranormal', '패시브 봉인');
  }),
  syn_make_up_2: (c) => c.fire('syn_make_up_2'),
  syn_make_up_4: (c, k) => { stats(c, 'syn_make_up', 'make_up', { hpPct: 1500 }, 0, k); c.fire('syn_make_up_4'); },
  syn_tea_party_2: (c) => startEnergy(c, () => allyFront(c), 20, 'syn_tea_party', '티타임'),
  syn_tea_party_3: (c, k) => {
    startEnergy(c, () => allyFront(c), 20, 'syn_tea_party', '티타임');
    if (mem(c, 'syn_tea_party').length >= 3) for (const u of ally(c)) c.mod(u, { atkPct: s(k, 1500) }, 'tea_party');
  },
  syn_justice_2: (c, k) => justice(c, k, false),
  syn_justice_3: (c, k) => justice(c, k, true),
  syn_vigilante_2: (c) => {
    const SYN = 'syn_vigilante';
    c.on('status_applied', (e) => { if (e.statusId === 'st_stun' && isMem(e.src, SYN) && e.tgt) e.tgt.d.vigilanteBy = e.src!.uid; });
    c.hook((h) => {
      if (!isMem(h.src, SYN) || h.tgt.d.vigilanteBy === undefined || h.tgt.d.vigilanteBy === h.src.uid || !DIRECT.has(h.kind)) return;
      h.out += 4000; h.tgt.d.vigilanteBy = undefined; c.proc('synergy', SYN, '자경단 연계', h.src);
    });
  },
  syn_remedial_knights_2: (c, k) => stats(c, 'syn_remedial_knights', 'remedial', { healDone: 3000 }, 0, k),
  syn_remedial_knights_3: (c, k) => {
    stats(c, 'syn_remedial_knights', 'remedial', { healDone: 3000 }, 0, k);
    c.on('damage_received', (e) => {
      if (e.tgt?.side !== 'ally' || !e.tgt.alive || c.hpRatio(e.tgt) > 0.2 || !c.battleOnce(null, 'remedial_save')) return;
      const healer = mem(c, 'syn_remedial_knights').find((x) => x.alive);
      if (!healer) return;
      c.proc('synergy', 'syn_remedial_knights', '긴급 구호', e.tgt);
      c.heal(healer, e.tgt, e.tgt.maxHp * 0.2, 'syn_remedial_knights_3');
    });
  },
  syn_sweets_2: (c) => dessert(c, false),
  syn_sweets_4: (c) => dessert(c, true),
  syn_ninjutsu_2: (c) => ninjutsu(c, false),
  syn_ninjutsu_3: (c) => ninjutsu(c, true),
  syn_training_2: (c) => training(c, false),
  syn_training_3: (c) => training(c, true),
  syn_yinyang_2: (c) => c.fire('syn_yinyang_2'),
  syn_plum_blossom_2: (c) => {
    let stamps = 0;
    c.on('ultimate_resolved', (e) => {
      if (e.src?.side !== 'ally') return;
      stamps++;
      if (stamps >= 3) { stamps = 0; c.proc('synergy', 'syn_plum_blossom', '도장 3개 · SP +1', e.src); c.gainSp('ally', 1); }
    });
  },
  syn_genryumon_2: (c) => {
    const kisaki = ally(c).find((x) => x.unit?.id === 'u_kisaki');
    const mina = ally(c).find((x) => x.unit?.id === 'u_mina');
    if (kisaki) c.mod(kisaki, { ultDmg: 2000 }, 'genryumon');
    if (!kisaki || !mina) return;
    c.hook((h) => {
      if (h.tgt !== kisaki || !mina.alive || mina.zone !== 'front' || h.src.side === 'ally' || !c.once(mina, 'genryumon')) return;
      c.proc('synergy', 'syn_genryumon', '미나가 대신 맞는다', mina);
      h.tgt = mina;
    });
  },
  syn_rw_office_2: (c) => rwOffice(c, 3, 0),
  syn_rw_office_3: (c) => rwOffice(c, 2, 2000),
  syn_knowledge_front_2: (c) => c.on('status_applied', (e) => {
    if (!e.tgt || e.tgt.side !== 'enemy' || !e.statusId || e.converted) return;
    const st = e.tgt.st.find((x) => x.id === e.statusId && !x.debuff);
    const to = c.highestAtk(allyFront(c));
    if (!st || !to || !c.pulseOnce('knowledge')) return;
    c.proc('synergy', 'syn_knowledge_front', '버프 복사', to);
    c.setStatus(null, to, st.id, { turns: st.turns, key: 'knowledge', debuff: false, params: st.params }, true);
  }),
  syn_class_227_2: (c) => {
    for (const u of mem(c, 'syn_class_227')) c.mod(u, { atkPct: 1000 }, 'class_227', () => c.pulse >= 5);
    c.on('pulse', (e) => {
      if (e.n! < 5 || e.n! > 9) return;
      for (const u of mem(c, 'syn_class_227')) buff(c, null, u, 'st_atk_up', { atkPct: 1000, stacks: Math.min(5, e.n! - 4) - 1 }, 'syn_class_227_2', 999, 'class227');
      c.proc('synergy', 'syn_class_227', `버티기 ${Math.min(5, e.n! - 4)}`);
    });
  },
  syn_life_safety_2: (c) => {
    const pen = c.has('oop_half_donut') ? 15 : 30;
    for (const u of mem(c, 'syn_life_safety')) {
      c.mod(u, { spd: -pen }, 'life_safety', () => u.turn === 0);
      c.mod(u, { atkPct: 3000 }, 'life_safety', () => u.turn >= 2);
    }
    if (c.has('oop_half_donut')) c.fire('oop_half_donut');
  },
};

function gameDev(c: Battle, n: 1 | 2): void {
  const SYN = 'syn_game_dev';
  const names = ['버그: 아군 ATK +30%', '버그: 적 SPD -20', '버그: 전방 에너지 +40'];
  let picks: number[];
  if (n === 1) {
    picks = [c.rng.nextInt(3)];
    if (c.has('oop_tsc_first_edition') && picks[0] !== 0) { picks = [Math.max(picks[0], c.rng.nextInt(3)) === 2 ? 2 : 0]; c.fire('oop_tsc_first_edition'); }
  } else {
    const chosen = (c.input.gameDevBugs ?? [0, 1]).filter((x) => x >= 0 && x < 3).slice(0, 2);
    picks = chosen.length === 2 ? chosen : [0, 1];
  }
  const third = n === 2 && c.has('oop_tsc_first_edition') ? [0, 1, 2].find((x) => !picks.includes(x)) : undefined;
  const apply = (i: number, f: number) => {
    if (i === 0) for (const u of ally(c)) c.mod(u, { atkPct: Math.round(3000 * f) }, 'game_dev');
    if (i === 1) for (const u of c.units.filter((x) => x.side === 'enemy')) c.mod(u, { spd: -Math.round(20 * f) }, 'game_dev');
  };
  for (const i of picks) apply(i, 1);
  if (third !== undefined) apply(third, 0.5);
  c.on('battle_start', () => {
    for (const i of picks) {
      c.proc('synergy', SYN, names[i]);
      if (i === 2) for (const u of allyFront(c)) c.gainEnergy(u, 40);
    }
    if (third !== undefined) { c.proc('oopart', 'oop_tsc_first_edition', `${names[third]} (절반)`); if (third === 2) for (const u of allyFront(c)) c.gainEnergy(u, 20); }
  });
}

function veritas(c: Battle, hack: boolean): void {
  const SYN = 'syn_veritas';
  c.on('turn_end', (e) => {
    const u = e.src;
    if (!u || u.side !== 'enemy' || u.energy < 100 || u.d.veritas || !c.activeOf(u.d.ult)) return;
    u.d.veritas = true;
    c.proc('synergy', SYN, '필살기 예고 · 지연');
    c.delay(u, 0.5, null);
  });
  if (hack) c.on('battle_start', () => {
    const t = c.front('enemy').find((x) => x.st.some((s) => !s.debuff));
    const st = c.dispel(t, 1)[0];
    const to = c.highestAtk(allyFront(c));
    if (st && to) { c.proc('synergy', SYN, '버프 해킹', to); c.setStatus(null, to, st.id, { turns: st.turns, key: 'veritas', debuff: false, params: st.params }, true); }
  });
}

function engineering(c: Battle, turrets: number): void {
  const SYN = 'syn_engineering';
  const members = () => mem(c, SYN);
  c.on('battle_start', () => c.proc('synergy', SYN, turrets === 1 ? '포탑 설치' : '포탑 2기 설치'));
  c.on('pulse', () => {
    const ms = members();
    const src = ms.find((x) => x.alive) ?? ms[0];
    if (!src) return;
    const avg = ms.reduce((a, x) => a + c.atk(x), 0) / ms.length;
    for (let i = 0; i < turrets; i++) c.hit(src, c.pick(src), 0, 'synergy', { raw: avg * 0.5, fx: `syn_engineering_${turrets === 1 ? 2 : 3}` });
  });
}

function justice(c: Battle, k: number, team: boolean): void {
  const SYN = 'syn_justice';
  c.hook((h) => { if (isMem(h.src, SYN) && h.tgt.side === 'enemy' && c.hpRatio(h.tgt) <= 0.5) h.out += s(k, 2500); });
  c.on('unit_defeated', (e) => {
    const u = e.src;
    if (e.tgt?.side !== 'enemy' || !isMem(u, SYN)) return;
    if (team) { c.proc('synergy', SYN, '정의 집행', u); for (const m of mem(c, SYN).filter((x) => x !== u)) c.gainEnergy(m, 15); }
    if (c.has('oop_tsurugi_novel') && u!.alive && c.once(u!, 'tsurugi_novel')) { c.proc('oopart', 'oop_tsurugi_novel', '폭주!', u); c.advance(u!, 0.15); }
  });
}

function dessert(c: Battle, team: boolean): void {
  const SYN = 'syn_sweets';
  c.on('battle_start', () => {
    const half = c.input.dessertHalf && c.has('oop_dessert_stamp');
    if (!c.input.dessert && !half) return;
    const src = mem(c, SYN)[0];
    if (!src) return;
    c.proc(half && !c.input.dessert ? 'oopart' : 'synergy', half && !c.input.dessert ? 'oop_dessert_stamp' : SYN, '디저트 타임');
    for (const u of allyFront(c)) c.shield(src, u, u.maxHp * (c.input.dessert ? 0.1 : 0.05), 2, 'syn_sweets_2');
  });
  if (team) c.on('pulse', () => {
    const ms = mem(c, SYN);
    if (ms.length < 4 || ms.some((x) => !x.alive)) return;
    for (const u of allyFront(c).filter((x) => x.alive)) c.heal(ms[0], u, u.maxHp * 0.03, 'syn_sweets_4');
  });
}

function ninjutsu(c: Battle, counter: boolean): void {
  const SYN = 'syn_ninjutsu';
  c.hook((h) => {
    if (!isMem(h.tgt, SYN) || h.src.side === 'ally' || h.tgt.zone !== 'front' || !c.battleOnce(h.tgt, 'ninjutsu')) return;
    h.cancel = true;
    c.proc('synergy', SYN, '분신술!', h.tgt);
    if (counter && h.src.alive && h.src.hasHp && h.src.zone === 'front') c.g.counters = [...(c.g.counters ?? []), [h.tgt, h.src]];
  });
  if (counter) c.on('ally_action_resolved', () => flushCounters(c));
  if (counter) c.on('turn_end', () => flushCounters(c));
}
function flushCounters(c: Battle): void {
  const list: [U, U][] = c.g.counters ?? [];
  c.g.counters = [];
  for (const [me, foe] of list) if (me.alive && foe.alive) c.hit(me, foe, 0.6, 'synergy', { fx: 'syn_ninjutsu_3' });
}

function training(c: Battle, enlighten: boolean): void {
  const SYN = 'syn_training';
  for (const u of mem(c, SYN)) {
    c.mod(u, { dmgRed: 0 }, 'training');
    c.on('turn_start', (e) => {
      if (e.src !== u) return;
      u.d.training = Math.min(5, (u.d.training ?? 0) + 1);
      buff(c, u, u, 'st_damage_reduction', { dmgRed: 300, stacks: u.d.training }, 'syn_training_2', 999, `${u.uid}:training`);
      if (enlighten && u.d.training === 5 && !u.d.enlightened) { u.d.enlightened = true; u.d.nullify = 1; c.proc('synergy', SYN, '득도!', u); }
    }, u);
  }
  if (enlighten) c.hook((h) => { if (isMem(h.tgt, SYN) && h.tgt.d.nullify && h.src.side === 'enemy') { h.tgt.d.nullify = 0; h.cancel = true; c.fire('syn_training_3'); } });
}

function rwOffice(c: Battle, every: number, vulnBps: number): void {
  const SYN = 'syn_rw_office';
  c.on('pulse', (e) => {
    if (e.n! % every !== 0) return;
    const t = c.highestHp(c.front('enemy'));
    if (!t) return;
    c.g.rwTarget = t;
    c.proc('synergy', SYN, '숙청 대상 지정');
    if (vulnBps) c.apply(null, t, 'st_vuln', { params: { dmgTaken: vulnBps }, turns: every, key: 'rw_office', fx: `syn_rw_office_${vulnBps ? 3 : 2}` });
  });
  c.on('unit_defeated', (e) => { if (e.tgt && e.tgt === c.g.rwTarget) { c.g.rwTarget = null; c.proc('synergy', SYN, '숙청 완료 · SP +1'); c.gainSp('ally', 1); } });
}

// ── 역할군 ──
function tank(tier: 2 | 3 | 4): SynFx {
  return (c, k) => {
    const SYN = 'syn_tank';
    stats(c, SYN, 'tank', { dmgRed: { 2: 1000, 3: 2000, 4: 3000 }[tier] }, 0, k);
    if (tier >= 3) c.on('battle_start', () => {
      const t = mem(c, SYN).filter((x) => x.zone === 'front').sort((a, b) => a.slot - b.slot)[0];
      if (t) { c.proc('synergy', SYN, '도발 개시', t); taunt(c, t, `syn_tank_${tier}`, 2); }
    });
    if (tier === 4) c.on('damage_received', (e) => {
      const u = e.tgt;
      if (!isMem(u, SYN) || !u!.alive || c.hpRatio(u!) >= 0.5 || !c.battleOnce(u!, 'tank_shield')) return;
      c.proc('synergy', SYN, '최후의 방벽', u);
      c.shield(u!, u, u!.maxHp * 0.25 * k, 2, 'syn_tank_4');
    });
  };
}

function attacker(tier: 2 | 3 | 4): SynFx {
  return (c, k) => {
    const SYN = 'syn_attacker';
    stats(c, SYN, 'attacker', { singleDmg: { 2: 1500, 3: 3000, 4: 5000 }[tier] }, 0, k);
    if (tier === 2) return;
    const max = c.has('oop_istanbul_rocket') ? 7 : 5;
    c.hook((h) => {
      if (!isMem(h.src, SYN) || !DIRECT.has(h.kind) || h.aoe) return;
      const u = h.src;
      if (u.d.lastTgt === h.tgt.uid || (c.has('oop_istanbul_rocket') && u.d.chainKeep)) u.d.combo = Math.min(max, (u.d.combo ?? 0) + 1);
      else u.d.combo = 0;
      u.d.chainKeep = false;
      u.d.lastTgt = h.tgt.uid;
      h.out += 500 * u.d.combo;
      if (u.d.combo >= 2) c.fire('syn_attacker_3');
    });
    c.on('unit_defeated', (e) => {
      const u = e.src;
      if (e.tgt?.side !== 'enemy' || !isMem(u, SYN)) return;
      if (c.has('oop_istanbul_rocket')) { u!.d.chainKeep = true; c.fire('oop_istanbul_rocket'); }
      if (tier === 4 && u!.alive && u!.zone === 'front' && c.once(u!, 'attacker_extra')) {
        c.proc('synergy', SYN, '추가 행동!', u);
        c.newRoot();
        c.hit(u!, c.pick(u!), 1, 'basic', { fx: 'syn_attacker_4' });
      }
    });
  };
}

function blaster(tier: 2 | 4 | 6 | 8): SynFx {
  return (c, k) => {
    const SYN = 'syn_blaster';
    stats(c, SYN, 'blaster', { aoeDmg: { 2: 1500, 4: 3000, 6: 4500, 8: 6500 }[tier] }, 0, k);
    if (tier === 2) return;
    const fx = `syn_blaster_${tier === 8 ? 'plat' : tier}`;
    c.on('damage_dealt', (e) => {
      if (!isMem(e.src, SYN) || !e.aoe || !e.direct || (e.group?.length ?? 0) < 3 || !c.rootOnce('blaster_def')) return;
      c.proc('synergy', SYN, '광역 방어 붕괴', e.src);
      for (const t of e.group!.filter((x) => x.alive)) defDown(c, e.src!, t, tier === 8 ? 2500 : 1500, fx);
      if (tier >= 6 && c.pulseOnce('blaster_sp')) c.gainSp('ally', 1);
    });
    if (tier === 8) c.on('unit_defeated', (e) => {
      if (!isMem(e.src, SYN) || !e.aoe || e.tgt?.side !== 'enemy' || (e.src!.d.chainDepth ?? 0) >= 4) return;
      e.src!.d.chainDepth = (e.src!.d.chainDepth ?? 0) + 1;
      c.proc('synergy', SYN, '연쇄 폭발!', e.src, e.src!.d.chainDepth);
      c.hit(e.src!, c.front('enemy'), 0.6, 'synergy', { aoe: true, fx });
      e.src!.d.chainDepth--;
    });
  };
}

function healer(tier: 2 | 4 | 6): SynFx {
  return (c, k) => {
    const SYN = 'syn_healer';
    stats(c, SYN, 'healer', { healDone: { 2: 2000, 4: 4000, 6: 6000 }[tier] }, 0, k);
    const fleece = c.has('oop_golden_fleece');
    if (tier >= 4 || fleece) c.overheal.push((src, tgt, over) => {
      if (!isMem(src, SYN) || tgt.side !== 'ally') return;
      const rate = tier >= 4 ? (fleece ? 1.5 : 1) : 0.25;
      if (fleece) c.proc('oopart', 'oop_golden_fleece', '넘친 치유 → 보호막', tgt);
      c.shield(src, tgt, over * rate, tier >= 4 ? 2 : 1, `syn_healer_${tier === 6 ? 'plat' : 4}`);
    });
    if (tier !== 6) return;
    c.on('healed', (e) => {
      if (!isMem(e.src, SYN) || e.fx === 'syn_healer_plat' || !e.tgt) return;
      const other = c.lowestRatio(allyFront(c).filter((x) => x.alive && x !== e.tgt))[0];
      if (other) c.heal(e.src!, other, e.amount! * 0.5, 'syn_healer_plat');
      e.tgt.d.blessing = Math.min(5, (e.tgt.d.blessing ?? 0) + 1);
      buff(c, e.src!, e.tgt, 'st_damage_up', { dmgUp: 400, stacks: e.tgt.d.blessing }, 'syn_healer_plat', 999, `blessing`);
    });
  };
}

function supporter(tier: 2 | 4 | 6): SynFx {
  return (c) => {
    const SYN = 'syn_supporter';
    const extra = tier === 6 ? 2 : 1;
    c.extraTurns.push((src, tgt, id, debuff) => (isMem(src, SYN) && !debuff && tgt.side === 'ally' && id !== 'st_taunt' ? extra : 0));
    if (tier === 2) return;
    c.on('battle_start', () => { c.proc('synergy', SYN, `서포터 · SP +${tier === 6 ? 2 : 1}`); c.gainSp('ally', tier === 6 ? 2 : 1); });
    c.on('status_applied', (e) => {
      if (!isMem(e.src, SYN) || !e.tgt || e.tgt.side !== 'ally' || e.tgt.zone !== 'front') return;
      const st = e.tgt.st.find((x) => x.id === e.statusId && x.src === e.src && !x.debuff);
      if (!st) return;
      if (c.once(e.tgt, `support_energy:${e.src!.uid}`)) c.gainEnergy(e.tgt, tier === 6 ? 15 : 10);
      if (tier === 6) {
        const n = new Set(e.tgt.st.filter((x) => !x.debuff && x.src && isMem(x.src, SYN)).map((x) => x.key)).size;
        if (n >= 3 && !e.tgt.d.supportUlt && c.battleOnce(e.tgt, 'support_ult', 2)) { e.tgt.d.supportUlt = true; c.proc('synergy', SYN, '총지원 · 다음 필살기 +60%', e.tgt); }
      }
    });
    if (tier === 6) c.hook((h) => { if (h.kind === 'ultimate' && h.src.d.supportUlt) h.out += 6000; });
    if (tier === 6) c.on('ultimate_resolved', (e) => { if (e.src) e.src.d.supportUlt = false; });
  };
}

function controller(tier: 2 | 4 | 6): SynFx {
  return (c, k) => {
    const SYN = 'syn_controller';
    c.extraTurns.push((src, tgt, id) => (isMem(src, SYN) && !tgt.boss && (id === 'st_stun' || id === 'st_silence' || id === 'st_delayed') ? 1 : 0));
    if (tier === 2) return;
    const fx = `syn_controller_${tier === 6 ? 'plat' : 4}`;
    c.hook((h) => { if (h.src.side === 'ally' && h.tgt.side === 'enemy' && c.isControlled(h.tgt)) { h.inc += s(k, tier === 6 ? 3500 : 2000); c.fire(fx); } });
    c.expires.push((u, st) => {
      if (u.side !== 'enemy' || !['st_stun', 'st_silence'].includes(st.id) || c.isControlled(u)) return;
      c.delay(u, tier === 6 ? 0.2 : 0.1, null);
    });
    if (tier === 6) c.on('unit_defeated', (e) => {
      const t = e.tgt;
      if (!t || t.side !== 'enemy') return;
      const ctl = t.st.filter((x) => x.id === 'st_stun' || x.id === 'st_silence');
      if (!ctl.length) return;
      const next = c.sortBy(c.front('enemy'), (x) => Math.abs(x.slot - t.slot), false)[0];
      if (!next) return;
      c.proc('synergy', SYN, '제압 전파', next);
      for (const st of ctl) {
        if (next.boss) c.apply(st.src, next, st.id, { turns: 1, fx });
        else c.setStatus(st.src, next, st.id, { turns: st.turns, key: st.key, debuff: true, params: st.params }, true);
      }
    }, null, true);
  };
}

// ── 고유 ──
const UNIQUE: Record<string, SynFx> = {
  syn_uni_hoshino: (c) => {
    const u = ally(c).find((x) => x.unit?.id === 'u_hoshino' && x.zone === 'front');
    if (!u) return;
    c.mod(u, { spd: -Math.floor(u.b.spd / 2) }, 'uni_hoshino', () => u.turn < 2 && !u.d.serious);
    c.on('unit_defeated', (e) => {
      if (e.tgt?.side !== 'ally' || e.tgt === u || u.d.serious || !u.alive) return;
      u.d.serious = true;
      c.proc('synergy', 'syn_unique_dawn_horus', '진심 모드!', u);
      taunt(c, u, 'syn_uni_hoshino', 999);
      guard(c, u, u, 4000, 'syn_uni_hoshino', 999);
      if (c.g.abydosRally) c.g.abydosRally(u);
    });
  },
  syn_uni_aru: (c) => {
    c.g.aruUlt = (u: U) => {
      if (u.unit?.id !== 'u_aru') return 1;
      const ok = u.d.sure || c.rng.chance(5000);
      u.d.sure = !ok;
      if (ok) {
        c.proc('synergy', 'syn_unique_outlaw_boss', '대성공!', u);
        for (const m of mem(c, 'syn_problem_solver')) atkUp(c, u, m, 2000, 'syn_uni_aru');
        return 2;
      }
      c.proc('synergy', 'syn_unique_outlaw_boss', '대실패…', u);
      return 0.5;
    };
  },
  syn_uni_hina: (c) => c.fire('syn_uni_hina'),
  syn_uni_mika: (c) => {
    const isMika = (u: U) => u.unit?.id === 'u_mika';
    c.shieldBreakers.push((src) => isMika(src));
    c.on('unit_defeated', (e) => {
      if (!e.src || !isMika(e.src) || e.tgt?.side !== 'enemy' || !e.src.alive) return;
      c.proc('synergy', 'syn_unique_princess_stars', '롤케이크!', e.src);
      c.heal(e.src, e.src, e.src.maxHp * 0.15, 'syn_uni_mika');
    });
  },
  syn_uni_wakamo: (c) => {
    const w = ally(c).find((x) => x.unit?.id === 'u_wakamo');
    if (!w) return;
    const him = c.sortBy(allyFront(c).filter((x) => x !== w), (x) => (x.unit?.cost ?? 0) * 10 + x.star)[0];
    if (!him) return;
    c.on('battle_start', () => c.proc('synergy', 'syn_unique_calamity_fox', `「그분」 지정`, him));
    c.on('damage_received', (e) => { if (e.tgt === him && e.src?.side === 'enemy') e.src.d.wakamoMark = true; });
    c.hook((h) => { if (h.src === w && h.tgt.d.wakamoMark) h.out += 5000; });
  },
  syn_uni_cherino: (c) => {
    const ch = ally(c).find((x) => x.unit?.id === 'u_cherino' && x.zone === 'front');
    if (!ch) return;
    c.on('damage_received', (e) => {
      if (e.tgt !== ch || ch.d.beardFell) return;
      ch.d.hits = (ch.d.hits ?? 0) + 1;
      if (ch.d.hits < 3) return;
      ch.d.beardFell = true;
      c.proc('synergy', 'syn_unique_red_mustache', '수염이 떨어졌다!', ch);
      c.setStatus(null, ch, 'st_stun', { turns: 1, key: 'beard', debuff: true, params: {} }, true);
      const marina = ally(c).find((x) => x.unit?.id === 'u_marina' && x.alive);
      if (marina) { c.mod(marina, { atkPct: 4000 }, 'uni_cherino'); c.proc('synergy', 'syn_unique_red_mustache', '마리나 격노!', marina); }
      c.g.coup?.(ch, true);
    });
  },
  syn_uni_aris: (c) => c.fire('syn_uni_aris'),
  syn_uni_al1s: (c) => {
    const a = ally(c).find((x) => x.unit?.id === 'u_al1s');
    if (!a) return;
    c.on('ultimate_resolved', (e) => {
      if (e.src !== a) return;
      a.d.ark = Math.min(3, (a.d.ark ?? 0) + 1);
      c.proc('synergy', 'syn_unique_nameless_princess', `방주 기동 ${a.d.ark}단계`, a, a.d.ark);
      if (a.d.ark === 3 && c.battleOnce(a, 'ark')) {
        c.proc('synergy', 'syn_unique_nameless_princess', '아트라하시스 주포 발사!', a);
        c.hit(a, c.front('enemy'), 3.5, 'synergy', { true: true, fx: 'syn_uni_al1s' });
        for (const u of allyFront(c).filter((x) => x.alive)) c.gainEnergy(u, 20);
      }
    });
    if (mem(c, 'syn_game_dev').some((x) => x !== a)) c.saves.push((u) => {
      if (u !== a || !c.battleOnce(a, 'hero_party')) return false;
      a.hp = Math.floor(a.maxHp * 0.3);
      c.mod(a, { atkPct: 1500 }, 'uni_al1s');
      c.proc('synergy', 'syn_unique_nameless_princess', '용사의 동료 · 다시 일어선다', a);
      c.log({ t: 'heal', av: c.av, source: a.ref, target: a.ref, amount: a.hp });
      return true;
    });
  },
  // v2.4.8 V.219 「왕녀의 열쇠」: 아리스(어느 형태든)가 함께 출전해 있을 때만
  syn_uni_key: (c) => {
    const k = ally(c).find((x) => x.unit?.id === 'u_key');
    const a = ally(c).find((x) => ARIS_FORMS.has(x.unit?.id ?? ''));
    if (!k || !a) return;
    c.mod(a, { atkPct: 2000, spd: 10 }, 'uni_key');
    c.on('battle_start', () => { c.gainEnergy(a, 40); c.proc('synergy', 'syn_unique_key', '왕녀의 열쇠 · 접속', a); });
    c.on('ultimate_resolved', (e) => {
      if (e.src !== a || !k.alive || !c.battleOnce(k, 'uni_key_echo', 2)) return;
      c.proc('synergy', 'syn_unique_key', 'Key · 해킹 추가 실행', k);
      keyHack(c, k, 'reaction', 'syn_uni_key');
    });
  },
  // v2.4.8 V.226 「용사 아리스, 풀 장비로 출격!」: 레벨은 runStacks, 여기서는 오버차지와 케이 동반 부활
  syn_uni_aris_armed: (c) => {
    const a = ally(c).find((x) => x.unit?.id === 'u_aris_armed');
    if (!a) return;
    const key = () => ally(c).some((x) => x.unit?.id === 'u_key');
    c.on('ultimate_resolved', (e) => {
      if (e.src !== a) return;
      a.d.overcharge = Math.min(2, (a.d.overcharge ?? 0) + 1);
      c.proc('synergy', 'syn_unique_armed_hero', `빛의 검 오버차지 ${a.d.overcharge}단계`, a, a.d.overcharge);
      if (a.d.overcharge === 2 && c.battleOnce(a, 'overcharge')) {
        c.proc('synergy', 'syn_unique_armed_hero', '빛이여!! 오버차지 해방!', a);
        c.hit(a, c.front('enemy'), 3.0, 'synergy', { true: key(), fx: 'syn_uni_aris_armed' });
        c.gainEnergy(a, 50);
      }
    });
    if (key()) c.saves.push((u) => {
      if (u !== a || !c.battleOnce(a, 'key_guard')) return false;
      a.hp = Math.floor(a.maxHp * 0.3);
      c.proc('synergy', 'syn_unique_armed_hero', '열쇠의 가호 · 다시 일어선다', a);
      c.log({ t: 'heal', av: c.av, source: a.ref, target: a.ref, amount: a.hp });
      return true;
    });
  },
  syn_uni_miyu: (c) => {
    const m = ally(c).find((x) => x.unit?.id === 'u_miyu');
    if (!m) return;
    c.hidden.push((u) => u === m && c.front('ally').some((x) => x !== m));
    c.mod(m, { atkPct: 5000 }, 'uni_miyu', () => c.front('ally').every((x) => x === m));
  },
  syn_uni_shiroko: (c) => c.ends.push((o) => { if (o === 'win' && c.rng.chance(3000)) { c.gold.push({ label: '은행 털이 · 전리품', value: 2 }); c.fire('syn_uni_shiroko'); } }),
  syn_uni_nonomi: (c) => c.fire('syn_uni_nonomi'),
  syn_uni_kazusa: (c) => {
    const foes = new Set(['en_sukeban_smg', 'en_sukeban_shield', 'en_helmet_thug', 'en_helmet_grenadier']);
    c.hook((h) => { if (h.src.unit?.id === 'u_kazusa' && h.tgt.enemy && foes.has(h.tgt.enemy.id)) { h.out += 5000; c.fire('syn_uni_kazusa'); } });
  },
};

// ── 이스터에그 ──
const EASTER: Record<string, SynFx> = {
  syn_plat_vanitas: (c) => {
    const squad = () => mem(c, 'syn_plat_vanitas').filter((x) => x.alive);
    c.on('unit_defeated', (e) => {
      if (e.tgt?.side !== 'ally') return;
      c.proc('synergy', 'syn_plat_vanitas', 'Vanitas vanitatum');
      for (const u of squad()) { c.mod(u, { atkPct: 2500 }, 'vanitas'); c.gainEnergy(u, 50); }
    }, null, true);
    const saori = () => ally(c).find((x) => x.unit?.id === 'u_saori' && x.alive);
    c.noHeal.push((t) => t.side === 'enemy' && !!saori());
    c.blockers.push((t, _id, debuff) => t.side === 'enemy' && !debuff && !!saori());
  },
  syn_plat_ending_credits: (c) => {
    const railgun = () => ally(c).find((x) => ARIS_FORMS.has(x.unit?.id ?? '') && x.alive);
    c.on('pulse', (e) => {
      const a = railgun();
      if (e.n! % 2 !== 0 || !a) return;
      c.proc('synergy', 'syn_plat_ending_credits', '빛이여! (자동 발사)', a.hasHp ? a : undefined);
      c.hit(a, c.front('enemy'), 4.0, 'synergy', { fx: 'syn_plat_ending_credits' });
    });
    c.saves.push((u) => {
      if (u.side !== 'ally' || c.front('ally').some((x) => x !== u && x.hp > 0) || !c.battleOnce(null, 'continue')) return false;
      c.proc('synergy', 'syn_plat_ending_credits', '컨티뉴?');
      for (const x of c.units.filter((y) => y.side === 'ally' && y.zone === 'front' && y.hasHp)) {
        x.alive = true; x.hp = Math.max(1, Math.floor(x.maxHp * 0.3));
        c.log({ t: 'heal', av: c.av, source: x.ref, target: x.ref, amount: x.hp });
      }
      return true;
    });
  },
  syn_plat_codename: (c) => {
    const team = () => mem(c, 'syn_cc').filter((x) => x.alive);
    c.on('battle_start', () => {
      c.proc('synergy', 'syn_plat_codename', '코드네임 00~05, 작전 개시');
      for (const u of team()) { c.newRoot(); if (u.zone === 'front') c.hit(u, c.pick(u), 1, 'basic', { fx: 'syn_plat_codename' }); else c.hit(u, c.pick(u), 1, 'rear', { fx: 'syn_plat_codename' }); }
    });
    c.on('unit_defeated', (e) => { if (e.tgt?.side === 'enemy') for (const u of team()) c.advance(u, 0.15); });
  },
  syn_plat_tea_party: (c) => c.fire('syn_plat_tea_party'),
  syn_plat_last_line: (c) => {
    c.saves.push((u) => {
      if (u.side !== 'ally' || !u.hasHp || !c.battleOnce(u, 'last_line')) return false;
      u.hp = 1;
      c.proc('synergy', 'syn_plat_last_line', '최후의 방어선 · HP 1로 버틴다', u);
      return true;
    });
    c.ends.push((o) => { if (o === 'win') c.gold.push({ label: '최후의 방어선 · 빚 상환', value: 5 }); });
  },
  syn_plat_school_battle: (c) => c.fire('syn_plat_school_battle'),
  syn_plat_total_assault: (c) => { for (const u of ally(c)) c.mod(u, { atkPct: 3000 }, 'total_assault'); c.on('battle_start', () => c.proc('synergy', 'syn_plat_total_assault', '총력전 만점')); },
};

export const synergyFx: Record<string, SynFx> = {
  syn_abydos_2: abydos(2), syn_abydos_4: abydos(4), syn_abydos_6: abydos(6),
  syn_gehenna_2: gehenna(2), syn_gehenna_4: gehenna(4), syn_gehenna_6: gehenna(6), syn_gehenna_plat: gehenna(8),
  syn_millennium_2: millennium(2), syn_millennium_4: millennium(4), syn_millennium_6: millennium(6), syn_millennium_plat: millennium(8),
  syn_trinity_2: trinity(2), syn_trinity_4: trinity(4), syn_trinity_6: trinity(6), syn_trinity_plat: trinity(8),
  syn_hyakkiyako_2: hyakkiyako(2), syn_hyakkiyako_4: hyakkiyako(4), syn_hyakkiyako_6: hyakkiyako(6), syn_hyakkiyako_plat: hyakkiyako(8),
  syn_shanhaijing_2: shanhaijing(2), syn_shanhaijing_4: shanhaijing(4),
  syn_red_winter_2: redWinter(2), syn_red_winter_4: redWinter(4),
  syn_valkyrie_2: valkyrie(2), syn_valkyrie_3: valkyrie(3),
  syn_srt_2: srt(2), syn_srt_4: srt(4),
  syn_arius_2: arius(2), syn_arius_4: arius(4),
  syn_ps68_2: ps68(2), syn_ps68_4: ps68(4),
  syn_cc_2: cc(2), syn_cc_4: cc(4),
  syn_highlander_1: highlander(1), syn_highlander_2: highlander(2),
  syn_outlaw_2: outlaw(2), syn_outlaw_4: outlaw(4),
  syn_sniper_2: sniper(2), syn_sniper_4: sniper(4), syn_sniper_plat: sniper(6),
  syn_prefect_2: prefect(2), syn_prefect_4: prefect(4),
  syn_gourmet_2: gourmet(2), syn_gourmet_4: gourmet(4),
  syn_tank_2: tank(2), syn_tank_3: tank(3), syn_tank_4: tank(4),
  syn_attacker_2: attacker(2), syn_attacker_3: attacker(3), syn_attacker_4: attacker(4),
  syn_blaster_2: blaster(2), syn_blaster_4: blaster(4), syn_blaster_6: blaster(6), syn_blaster_plat: blaster(8),
  syn_healer_2: healer(2), syn_healer_4: healer(4), syn_healer_plat: healer(6),
  syn_supporter_2: supporter(2), syn_supporter_4: supporter(4), syn_supporter_plat: supporter(6),
  syn_controller_2: controller(2), syn_controller_4: controller(4), syn_controller_plat: controller(6),
  ...SIMPLE, ...UNIQUE, ...EASTER,
};

export { stun, spdDown, atkUp };
