// 오파츠의 전투 효과(docs/OOPARTS_v1.md). 수치 보정은 코어 oopartModifiers()를 그대로 읽고,
// 시너지에 붙는 효과는 해당 시너지 단계가 켜져 있을 때만 움직인다. 시너지 단계 안에서 처리하는 것(조준·연속 타격 등)은 synergies.ts.
import { oopartModifiers } from '../../ooparts/modifiers';
import type { Battle, U } from './kit';
import { atkUp, buff, follow, spdDown, stun, vuln } from './kit';

const ally = (c: Battle) => c.units.filter((x) => x.side === 'ally');
const on = (c: Battle, syn: string) => c.tier(syn) !== undefined;

export function registerOoparts(c: Battle): void {
  const om = oopartModifiers([...c.ooparts]);
  const owned = (...ids: string[]) => ids.find((id) => c.has(id)) ?? ids[0];

  // ── 수치 ──
  const factions = c.pack.synergies.filter((s) => s.category === 'faction').map((s) => s.id);
  const factionCount = new Map<string, number>();
  for (const u of ally(c)) for (const f of factions) if (u.tags.has(f)) factionCount.set(f, (factionCount.get(f) ?? 0) + 1);
  const threeStars = ally(c).filter((u) => u.star === 3).length;
  const hpBps = Math.min(om.threeStarHpCapBps, om.threeStarHpBps * threeStars);
  for (const u of ally(c)) {
    const fac = factions.filter((f) => u.tags.has(f));
    const lone = om.loneFactionAtkBps > 0 && fac.length > 0 && fac.every((f) => factionCount.get(f) === 1);
    c.mod(u, {
      atkPct: om.atkBps + (lone ? om.loneFactionAtkBps : 0),
      spd: (lone ? om.loneFactionSpd : 0) + (u.zone === 'front' ? om.frontSpd : 0),
      critDmg: om.critDamageBps,
      hpPct: hpBps,
      healRecv: om.healShieldReceivedBps,
      shieldRecv: om.healShieldReceivedBps,
      ...(u.zone === 'rear' && om.rearSupportBps ? { rearDmg: om.rearSupportBps, healDone: om.rearSupportBps, shieldGiven: om.rearSupportBps } : {}),
    }, 'ooparts');
  }
  c.nonCritBps = om.nonCritDamageBps;
  if (om.frontUltEnergy) c.frontUltEnergy = om.frontUltEnergy;
  c.frontSkillCdBonus = om.frontSkillCdBonus;
  if (om.spMax) c.spMax.ally = om.spMax;
  c.sp.ally = Math.min(c.spMax.ally, c.sp.ally + om.spStartBonus);
  if (om.basicEnergyBonus) c.basicEnergy.push((u) => (u.side === 'ally' ? om.basicEnergyBonus : 0));
  if (om.eliteBossDamageBps) c.hook((h) => { if (h.src.side === 'ally' && (h.tgt.boss || c.input.nodeType === 'elite')) h.out += om.eliteBossDamageBps; });

  // 바그다드 전지(C07)·L05: SP가 0이 되면 +2
  let refills = 0;
  if (om.spRefillUses) c.spEmpty.push((side) => {
    if (side !== 'ally' || refills >= om.spRefillUses) return;
    refills++;
    c.proc('oopart', owned('oop_baghdad_battery', 'oop_prototype_infinity'), 'SP 바닥 · +2 충전');
    c.gainSp('ally', 2);
  });
  // 프로토타입 인피니티(L05): 필살기 해소마다 SP +1(전역 주기당 1회)
  if (om.spOnUltimate) c.on('ultimate_resolved', (e) => {
    if (e.src?.side !== 'ally' || !c.pulseOnce('oop_sp_ult')) return;
    c.proc('oopart', 'oop_prototype_infinity', '필살기 해소 · SP +1', e.src);
    c.gainSp('ally', 1);
  });

  // 쓰러짐: 신비 부활(L03) → 첫 쓰러짐 회복(C10) → 아비도스 최후(R01·L04)
  let revives = 0;
  if (om.mysticRevives) c.saves.push((u) => {
    if (u.side !== 'ally' || u.star !== 3 || !u.hasHp || u.d.revived || revives >= om.mysticRevives) return false;
    revives++; u.d.revived = true;
    u.hp = Math.floor(u.maxHp * 0.4);
    c.mod(u, { atkPct: 2500 }, 'oop_nameless_relic');
    c.proc('oopart', 'oop_nameless_relic', '신비 부활!', u);
    c.log({ t: 'heal', av: c.av, source: u.ref, target: u.ref, amount: u.hp });
    return true;
  });
  let firstFall = false;
  let lastStands = 0;
  c.on('unit_defeated', (e) => {
    const t = e.tgt;
    if (!t || t.side !== 'ally' || !t.hasHp) return;
    if (!firstFall && om.firstFallHealBps) {
      firstFall = true;
      const rest = c.front('ally');
      if (rest.length) { c.proc('oopart', owned('oop_mandragora', 'oop_nameless_relic'), '첫 쓰러짐 · 전방 회복'); for (const f of rest) c.heal(f, f, f.maxHp * om.firstFallHealBps / 10000); }
    }
    firstFall = true;
    if (lastStands < om.abydosLastStand && on(c, 'syn_abydos') && t.tags.has('syn_abydos')) {
      const rest = c.front('ally').filter((x) => x.tags.has('syn_abydos'));
      if (rest.length) {
        lastStands++;
        c.proc('oopart', owned('oop_foreclosure_photo', 'oop_yume_notebook'), '최후의 저항 · 에너지 충전!', t, lastStands);
        for (const u of rest) { u.energy = 100; u.d.lastStandUlt = true; c.energyLog(u); }
      }
    }
  }, null, true);

  // 카이저 PMC 계약서(U09): 200AV마다 아군 최고 ATK 100% 포격, 같은 순간 아군 전방에 그 60% 오폭
  if (om.pmcBarrage) c.on('pulse', (e) => {
    if (e.n! % 2 !== 0) return;
    const shooter = c.highestAtk(ally(c).filter((x) => x.alive));
    const foes = c.front('enemy');
    if (!shooter || !foes.length) return;
    c.proc('oopart', 'oop_pmc_contract', '정기 포격', shooter.hasHp ? shooter : undefined);
    c.hit(shooter, c.randomOf(foes), 1, 'synergy', { fx: 'oop_pmc_contract' });
    const mine = c.front('ally');
    const t = c.randomOf(mine);
    if (t && om.pmcFriendlyFireBps) c.rawDamage(shooter, t, c.atk(shooter) * om.pmcFriendlyFireBps / 10000, { kind: 'synergy', silent: true });
  });
  // 불법 에너지 드링크(U11): 600AV부터 전방 탈진
  if (om.exhaustion) c.on('pulse', (e) => {
    if (e.n !== 6) return;
    for (const u of c.front('ally')) buff(c, null, u, 'st_spd_down', { spd: -30 }, 'oop_energy_drink', 999, 'exhaustion');
  });

  // ── 시너지 오파츠 ──
  // 용의 향로(U01): 같은 전역 주기 안에서 이어진 산해경 필살기 피해 +15%씩, 다음 산해경 에너지 +35
  if (om.dragonCenser && on(c, 'syn_shanhaijing')) {
    let pulse = -1; let chain = 0; const used = new Set<U>();
    c.on('ultimate_declared', (e) => {
      const u = e.src;
      if (!u || u.side !== 'ally' || !u.tags.has('syn_shanhaijing')) return;
      if (c.pulse !== pulse) { pulse = c.pulse; chain = 0; used.clear(); }
      chain++; used.add(u);
      u.d.censer = 1500 * (chain - 1);
      if (chain >= 2) c.proc('oopart', 'oop_dragon_censer', `향로 연쇄 · 피해 +${15 * (chain - 1)}%`, u, chain);
    });
    c.hook((h) => { if (h.kind === 'ultimate' && h.src.d.censer) h.out += h.src.d.censer; });
    c.on('ultimate_resolved', (e) => {
      const u = e.src;
      if (!u || !u.tags.has('syn_shanhaijing') || u.side !== 'ally') return;
      u.d.censer = 0;
      const next = c.sortBy(c.front('ally').filter((x) => x !== u && x.tags.has('syn_shanhaijing') && !used.has(x)), (x) => x.energy)[0];
      if (next) c.gainEnergy(next, 35);
    });
  }
  // 쿠데타 명령서(U02): 서기장 ATK +40%, 받는 피해 -20%, 쓰러지거나 수염이 떨어지면 승계(전투당 3회)
  if (om.coupOrder && on(c, 'syn_red_winter')) {
    let left = 3; let bonus = 0;
    const crown = (u: U, label: string) => {
      c.g.secretary = u;
      c.proc('oopart', 'oop_coup_order', label, u);
      buff(c, null, u, 'st_atk_up', { atkPct: 4000 + bonus }, 'oop_coup_order', 999, 'secretary');
      buff(c, null, u, 'st_damage_reduction', { dmgRed: 2000 }, 'oop_coup_order', 999, 'secretary');
    };
    c.on('battle_start', () => {
      const rw = c.front('ally').filter((x) => x.tags.has('syn_red_winter'));
      const first = rw.find((x) => x.unit?.id === 'u_cherino') ?? c.randomOf(rw);
      if (first) crown(first, '서기장 임명');
    });
    c.g.coup = (old: U) => {
      if (old !== c.g.secretary || left <= 0) return;
      const heir = c.highestAtk(c.front('ally').filter((x) => x !== old && x.tags.has('syn_red_winter')));
      if (!heir) return;
      left--; bonus += 2000;
      for (const s of old.st.filter((x) => x.key === 'secretary')) c.removeStatus(old, s);
      crown(heir, '쿠데타! 새 서기장');
      const t = c.highestHp(c.front('enemy'));
      if (t) c.apply(heir, t, 'st_vuln', { params: { dmgTaken: 2000 }, turns: 3, key: 'purge', fx: 'oop_coup_order' });
    };
    c.on('unit_defeated', (e) => { if (e.tgt && e.tgt === c.g.secretary) c.g.coup(e.tgt); }, null, true);
  }
  // 대탈옥 키트(U06): 무법자 처치마다 악명(무법자 ATK +8%씩, 6에서 전방 일제 사격)
  if (om.jailbreak && on(c, 'syn_outlaw')) {
    let notoriety = 0;
    for (const u of ally(c).filter((x) => x.tags.has('syn_outlaw'))) c.mod(u, { atkPct: 0 }, 'jailbreak');
    c.on('unit_defeated', (e) => {
      const by = e.src;
      if (e.tgt?.side !== 'enemy' || !by || by.side !== 'ally' || !by.tags.has('syn_outlaw') || notoriety >= 6) return;
      notoriety++;
      c.proc('oopart', 'oop_jailbreak_kit', notoriety === 6 ? '대탈옥! 전방 일제 사격' : `악명 ${notoriety}`, by, notoriety);
      for (const u of ally(c).filter((x) => x.tags.has('syn_outlaw'))) buff(c, null, u, 'st_atk_up', { atkPct: 800 * notoriety }, 'oop_jailbreak_kit', 999, 'notoriety');
      if (notoriety === 6) for (const u of c.front('ally').filter((x) => x.tags.has('syn_outlaw'))) c.hit(u, c.front('enemy'), 1.35, 'synergy', { true: true, fx: 'oop_jailbreak_kit' });
    });
  }
  // 볼프세크 철편(C12): 도발 중인 탱커가 받은 피해의 15%를 공격자에게(턴당 3회)
  if (om.wolfseggReflectBps && on(c, 'syn_tank')) c.on('damage_received', (e) => {
    const t = e.tgt;
    if (!t || t.side !== 'ally' || !t.tags.has('syn_tank') || !c.hasSt(t, 'st_taunt') || !e.src || !e.src.alive || !e.src.hasHp || !c.once(t, 'wolfsegg', 3)) return;
    c.proc('oopart', 'oop_wolfsegg_steel', '피해 반사', t);
    c.rawDamage(t, e.src, e.amount! * om.wolfseggReflectBps / 10000, { true: true, kind: 'reaction', silent: true });
  });
  // 디스코 콜간테(C15): 블래스터 광역이 3명 이상이면 CRIT +20%
  if (om.discoCritBps && on(c, 'syn_blaster')) c.hook((h) => {
    if (h.src.side !== 'ally' || !h.src.tags.has('syn_blaster') || !h.aoe || c.front('enemy').length < 3) return;
    h.crit += om.discoCritBps;
    if (c.rootOnce('disco')) c.proc('oopart', 'oop_disco_colgante', '광역 치명 +20%', h.src);
  });
  // 아틀란티스 메달(C17): 서포터의 첫 스킬 쿨다운 -1
  if (om.atlantisMedal && on(c, 'syn_supporter')) c.on('skill_resolved', (e) => {
    const u = e.src;
    if (!u || u.side !== 'ally' || !u.tags.has('syn_supporter') || u.d.atlantis) return;
    u.d.atlantis = true; u.cd = Math.max(0, u.cd - 1);
    c.proc('oopart', 'oop_atlantis_medal', '첫 스킬 쿨다운 −1', u);
  });
  // 위니퍼소키 돌(C18): 컨트롤러 기절이 보스에 막히면 15% 지연 + 1턴 받는 피해 +20%
  if (om.winnipesaukee && on(c, 'syn_controller')) c.on('status_applied', (e) => {
    if (!e.converted || e.statusId !== 'st_stun' || !e.tgt || !e.src?.tags.has('syn_controller')) return;
    c.proc('oopart', 'oop_winnipesaukee_stone', '보스 행동 지연', e.tgt);
    c.delay(e.tgt, 0.15, e.src);
    vuln(c, e.src, e.tgt, 2000, 'oop_winnipesaukee_stone', 1);
  });
  // 발키리 체포 영장(U03): 수배자가 HP 25% 이하면 체포(보스는 1턴 기절, 전투당 1회)
  if (c.has('oop_arrest_warrant') && on(c, 'syn_valkyrie')) c.on('damage_received', (e) => {
    const t = e.tgt;
    if (!t || t !== c.g.wanted || !t.alive || c.hpRatio(t) > 0.25) return;
    if (t.boss) {
      if (!c.battleOnce(null, 'arrest_boss')) return;
      c.proc('oopart', 'oop_arrest_warrant', '체포 시도 · 기절', t);
      stun(c, e.src ?? null, t, 'oop_arrest_warrant');
    } else {
      c.proc('oopart', 'oop_arrest_warrant', '체포!', t);
      c.g.wanted = null;
      t.hp = 0;
      const by = ally(c).find((x) => x.tags.has('syn_valkyrie')) ?? null;
      if (c.down(t, by)) c.emit({ type: 'unit_defeated', src: by ?? undefined, tgt: t, kind: 'synergy', direct: false });
      for (const u of ally(c).filter((x) => x.tags.has('syn_valkyrie'))) atkUp(c, null, u, 2000, 'oop_arrest_warrant', 1);
      c.checkEnd();
    }
  });
  // RABBIT 소대 무전기(U04): 후방 SRT 반응 쿨다운 -1, 전방 SRT가 쓰러지면 후방 SRT 반응 지원 1회
  if (c.has('oop_rabbit_radio') && on(c, 'syn_srt')) {
    c.on('reaction_resolved', (e) => { const u = e.src; if (u?.tags.has('syn_srt') && u.zone === 'rear') for (const [k, v] of u.rcd) u.rcd.set(k, v - 1); });
    c.on('unit_defeated', (e) => {
      if (!e.tgt?.tags.has('syn_srt') || e.tgt.side !== 'ally' || e.tgt.zone !== 'front') return;
      for (const r of ally(c).filter((x) => x.zone === 'rear' && x.tags.has('syn_srt'))) {
        c.proc('oopart', 'oop_rabbit_radio', '긴급 지원', undefined);
        follow(c, r, c.pick(r), 1.1, 'oop_rabbit_radio');
        c.emit({ type: 'reaction_resolved', src: r, fx: 'oop_rabbit_radio' });
      }
    }, null, true);
  }
  // 백귀 도깨비 낙인(U07): 백귀야행 true 피해가 낙인, 3개면 폭발
  if (c.has('oop_onibi_seal') && on(c, 'syn_hyakkiyako')) c.g.onibiMark = (src: U, res: { tgt: U }[]) => {
    for (const r of res) {
      const t = r.tgt;
      if (!t.alive) continue;
      t.d.onibi = (t.d.onibi ?? 0) + 1;
      if (t.d.onibi >= 3) {
        t.d.onibi = 0;
        c.proc('oopart', 'oop_onibi_seal', '낙인 폭발!', t);
        c.hit(src, t, 1.5, 'synergy', { true: true, fx: 'oop_onibi_seal' });
        spdDown(c, src, t, 10, 'oop_onibi_seal', 1);
      }
    }
  };
  // 아리우스 스쿼드 전술 교범(U08): 디버프 적을 처치하면 디버프가 HP 최고 적에게 옮겨 붙고 +1턴(턴당 2회)
  if (c.has('oop_squad_manual') && on(c, 'syn_arius')) c.on('unit_defeated', (e) => {
    const t = e.tgt;
    if (!t || t.side !== 'enemy' || !e.src?.tags.has('syn_arius') || !c.pulseOnce('squad_manual', 2)) return;
    const debuffs = t.st.filter((s) => s.debuff);
    const next = c.highestHp(c.front('enemy'));
    if (!debuffs.length || !next) return;
    c.proc('oopart', 'oop_squad_manual', '디버프 전염', next);
    for (const s of debuffs) c.setStatus(s.src, next, s.id, { turns: s.turns + 1, key: `squad:${s.key}`, debuff: true, params: s.params }, true);
  }, null, true);
  // 밀레니엄 프라이스 트로피(R03): 장비 능력치 +50%(준비 단계), 밀레니엄 보호막 동안 +100%
  if (c.has('oop_millennium_prize') && on(c, 'syn_millennium')) {
    for (const u of ally(c).filter((x) => x.tags.has('syn_millennium') && x.hasHp)) {
      const eqAtk = u.d.equipAtk ?? 0;
      if (eqAtk) c.mod(u, { atkFlat: Math.floor(eqAtk * 0.5) }, 'oop_millennium_prize', () => c.shieldOf(u) > 0);
    }
  }
  // 데카그라마톤 예언 회로(R05): 보스 임계 패턴이 처음 발동할 때 아군이 받는 피해 -50%
  if (c.has('oop_prophecy_circuit')) {
    c.g.bossPattern = () => {
      if (!c.battleOnce(null, 'prophecy')) return;
      c.proc('oopart', 'oop_prophecy_circuit', '예언 · 피해 -50%');
      for (const u of c.front('ally')) buff(c, null, u, 'st_damage_reduction', { dmgRed: 5000 }, 'oop_prophecy_circuit', 1, 'prophecy');
      c.g.afterBossPattern = () => { for (const u of c.units) for (const s of u.st.filter((x) => x.key === 'prophecy')) c.removeStatus(u, s); };
    };
  }
}
