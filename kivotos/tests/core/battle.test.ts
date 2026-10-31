// 전투 엔진(GDD v2.1 7~11장, v2.4 1장). 규칙 하나마다 작은 전투를 만들어 확인한다.
import { describe, expect, it } from 'vitest';
import { contentPack as pack } from '../../src/content';
import { createBattle, implementedEffectIds, simulateBattle } from '../../src/core/battle';
import type { BattleAllyInput, BattleEnemyInput, BattleInput } from '../../src/core/battle/types';
import type { Battle, U } from '../../src/core/battle/engine';

const ally = (unitId: string, slot = 0, zone: 'front' | 'rear' = 'front', star: 1 | 2 | 3 = 1, equipment: string[] = []): BattleAllyInput =>
  ({ instanceId: `${unitId}-${zone}${slot}`, unitId, star, zone, slot, equipment });
const enemy = (enemyId: string, slot = 0, zone: 'front' | 'rear' = 'front'): BattleEnemyInput => ({ enemyId, zone, slot });
const input = (allies: BattleAllyInput[], enemies: BattleEnemyInput[], extra: Partial<BattleInput> = {}): BattleInput => ({
  seed: 'T', nodeType: 'normal', statScaleBps: 10000, allies, enemies, activeTiers: {}, strategies: [], ooparts: [], ...extra,
});
const started = (i: BattleInput): Battle => { const c = createBattle(pack, i); c.snapshot(); c.emit({ type: 'battle_start' }); return c; };
const find = (c: Battle, key: string): U => c.units.find((u) => u.key === key)!;

describe('효과 handler', () => {
  it('오파츠를 뺀 효과 439개가 모두 엔진에 등록돼 있다', () => {
    const impl = implementedEffectIds();
    const missing = pack.effects.filter((e) => e.execution !== 'oopart_container' && !impl.has(e.id.replace(/^eff_/, '')));
    expect(missing.map((e) => e.id)).toEqual([]);
  });
  it('학생 능력 칸이 가리키는 효과는 능동·패시브 표에서 찾을 수 있다', () => {
    const impl = implementedEffectIds();
    for (const u of pack.units) {
      const ids = [u.abilityIds.basic, u.abilityIds.skill, u.abilityIds.ultimate, u.abilityIds.rearAction, ...u.abilityIds.frontEffects, ...u.abilityIds.rearEffects];
      for (const id of ids) if (id) expect(impl.has(id.replace(/^eff_/, '')), `${u.id} ${id}`).toBe(true);
    }
  });
});

describe('피해 공식(8.2)', () => {
  it('normal은 100/(100+DEF), true는 DEF 무시, 최소 1', () => {
    const c = started(input([ally('u_serika')], [enemy('en_helmet_thug')]));
    const s = find(c, 'u_serika'); const e = find(c, 'en_helmet_thug');
    s.b.critBps = 0;
    const hp0 = e.hp;
    c.hit(s, e, 1, 'basic');
    expect(hp0 - e.hp).toBe(Math.floor(c.atk(s) * (100 / (100 + c.def(e)))));
    const hp1 = e.hp;
    c.hit(s, e, 1, 'followup', { true: true });
    expect(hp1 - e.hp).toBe(c.atk(s));
  });
  it('보호막이 먼저 흡수하고, 총량은 최대 HP를 넘지 않는다', () => {
    const c = started(input([ally('u_yuuka')], [enemy('en_helmet_thug')]));
    const y = find(c, 'u_yuuka'); const e = find(c, 'en_helmet_thug');
    c.shield(y, y, y.maxHp * 5);
    expect(c.shieldOf(y)).toBe(y.maxHp);
    e.b.critBps = 0;
    const hp = y.hp;
    c.hit(e, y, 1, 'basic');
    expect(y.hp).toBe(hp);
    expect(c.shieldOf(y)).toBeLessThan(y.maxHp);
  });
  it('격화: 1000AV부터 100AV마다 피해 +20%', () => {
    const c = started(input([ally('u_serika')], [enemy('en_sukeban_shield')]));
    const s = find(c, 'u_serika'); const e = find(c, 'en_sukeban_shield');
    s.b.critBps = 0;
    const base = c.hit(s, e, 1, 'basic')[0].dmg;
    c.av = 1050;
    const esc = c.hit(s, e, 1, 'basic')[0].dmg;
    expect(esc).toBe(Math.floor(c.atk(s) * (100 / (100 + c.def(e))) * 1.2));
    expect(esc).toBeGreaterThan(base);
  });
});

describe('상태·제어', () => {
  it('보스 기절은 25% 지연과 ATK -15%로 바뀐다(8.5)', () => {
    const c = started(input([ally('u_suzumi')], [enemy('boss_kaiten_fx_mk0')], { nodeType: 'boss' }));
    const s = find(c, 'u_suzumi'); const b = find(c, 'boss_kaiten_fx_mk0');
    const next = b.next;
    expect(c.apply(s, b, 'st_stun', { turns: 1 })).toBe(true);
    expect(c.hasSt(b, 'st_stun')).toBe(false);
    expect(b.next).toBeGreaterThan(next);
    expect(c.sum(b, 'atkPct')).toBe(-1500);
    expect(c.events.some((e) => e.t === 'status' && e.replacedFrom === 'st_stun')).toBe(true);
  });
  it('보스 지연은 한 예약에 기본 간격 50%까지만 쌓인다', () => {
    const c = started(input([ally('u_koyuki')], [enemy('boss_binah_decagram')], { nodeType: 'boss' }));
    const b = find(c, 'boss_binah_decagram');
    const base = c.interval(b);
    const next = b.next;
    for (let i = 0; i < 10; i++) c.delay(b, 0.5);
    expect(b.next - next).toBeLessThanOrEqual(Math.floor(base * 0.5));
  });
  it('ATK 감소는 가장 강한 하나만, DEF 감소는 출처별로 합산', () => {
    const c = started(input([ally('u_suzumi'), ally('u_kirino', 1)], [enemy('en_helmet_thug')]));
    const a = find(c, 'u_suzumi'); const k = find(c, 'u_kirino'); const e = find(c, 'en_helmet_thug');
    c.apply(a, e, 'st_atk_down', { params: { atkPct: -1500 }, key: 'a' });
    c.apply(k, e, 'st_atk_down', { params: { atkPct: -2000 }, key: 'b' });
    expect(c.sum(e, 'atkPct')).toBe(-2000);
    c.apply(a, e, 'st_def_down', { params: { defPct: -1500 }, key: 'c' });
    c.apply(k, e, 'st_def_down', { params: { defPct: -2000 }, key: 'd' });
    expect(c.sum(e, 'defPct')).toBe(-3500);
  });
  it('도발: 나를 도발한 적이 있으면 그 적, 아니면 자기 도발한 탱커를 친다', () => {
    const c = started(input([ally('u_serika', 0), ally('u_tsukuyo', 2)], [enemy('en_helmet_thug')]));
    const e = find(c, 'en_helmet_thug'); const t = find(c, 'u_tsukuyo'); const s = find(c, 'u_serika');
    expect(c.pick(e)).toBe(s);
    c.apply(t, t, 'st_taunt', { turns: 2 });
    expect(c.pick(e)).toBe(t);
  });
});

describe('차례·자원(7.3~7.5)', () => {
  it('스킬 CD2: 1번째 차례에 쓰면 4번째 차례에 다시 쓴다', () => {
    const out = simulateBattle(pack, input([ally('u_shiroko', 0, 'front', 3)], [enemy('en_sukeban_shield'), enemy('en_sukeban_shield', 1)], { seed: 'CD' }));
    const me = out.events.filter((e) => e.t === 'action' && e.actor.side === 'ally' && e.actor.zone === 'front');
    const kinds = me.filter((e) => e.t === 'action' && e.kind !== 'ultimate').map((e) => (e.t === 'action' ? e.kind : ''));
    const first = kinds.indexOf('skill');
    expect(first).toBeGreaterThanOrEqual(0);
    expect(kinds.slice(first + 1, first + 3)).toEqual(['basic', 'basic']);
  });
  it('같은 입력·씨앗이면 로그가 똑같다(결정적)', () => {
    const i = input([ally('u_hoshino'), ally('u_shiroko', 1), ally('u_ayane', 0, 'rear')], [enemy('en_helmet_thug'), enemy('en_helmet_grenadier', 1)], { activeTiers: { syn_abydos: 0 } });
    expect(JSON.stringify(simulateBattle(pack, i))).toBe(JSON.stringify(simulateBattle(pack, i)));
  });
  it('적 전방이 모두 쓰러지면 승리, 아리스가 처치하면 처치 기록에 남는다', () => {
    const out = simulateBattle(pack, input([ally('u_aris', 0, 'front', 3)], [enemy('en_helmet_thug')]));
    expect(out.outcome).toBe('win');
    expect(out.reason).toBe('enemy_front_wiped');
    expect(out.kills).toEqual([{ unitId: 'u_aris', eliteOrBoss: false }]);
    expect(out.events.at(-1)!.t).toBe('end');
  });
});

describe('시너지·오파츠', () => {
  it('아비도스 6단계: 아비도스 필살기 뒤 합동 일제 사격이 발동한다', () => {
    const team = ['u_hoshino', 'u_shiroko', 'u_serika', 'u_nonomi'].map((id, i) => ally(id, i, 'front', 2));
    const out = simulateBattle(pack, input([...team, ally('u_ayane', 0, 'rear', 2)], [enemy('en_pmc_heavy'), enemy('en_pmc_heavy', 1)], { activeTiers: { syn_abydos: 2 } }));
    expect(out.firedEffects).toContain('syn_abydos_6');
    expect(out.events.some((e) => e.t === 'proc' && e.cause.id === 'syn_abydos')).toBe(true);
  });
  it('최후의 방어선: 쓰러질 피해를 받아도 HP 1로 한 번 버틴다', () => {
    const c = started(input([ally('u_serika')], [enemy('en_helmet_thug')], { activeTiers: { syn_plat_last_line: 0 } }));
    const h = find(c, 'u_serika'); const e = find(c, 'en_helmet_thug');
    c.hit(e, h, 0, 'basic', { raw: 999999, true: true });
    expect(h.alive).toBe(true);
    expect(h.hp).toBe(1);
    c.hit(e, h, 0, 'basic', { raw: 999999, true: true });
    expect(h.alive).toBe(false);
  });
  it('흥신소68: 구성원이 처치하면 의뢰비(전투당 최대 2G)', () => {
    const out = simulateBattle(pack, input([ally('u_aru', 0, 'front', 3), ally('u_mutsuki', 1, 'front', 3)], [enemy('en_helmet_thug'), enemy('en_helmet_thug', 1), enemy('en_helmet_thug', 2)], { activeTiers: { syn_problem_solver: 0 } }));
    expect(out.outcome).toBe('win');
    expect(out.settlementGold).toEqual([{ label: '흥신소68 · 의뢰비', value: 2 }]);
  });
  it('바그다드 전지: 팀 SP가 0이 되면 +2(전투당 1회)', () => {
    const c = started(input([ally('u_serika')], [enemy('en_helmet_thug')], { ooparts: ['oop_baghdad_battery'] }));
    expect(c.sp.ally).toBe(4);
    c.gainSp('ally', -4);
    expect(c.sp.ally).toBe(2);
    c.gainSp('ally', -2);
    expect(c.sp.ally).toBe(0);
  });
});

describe('4·5장 적(v2.4.2)', () => {
  const team = [ally('u_hoshino', 0, 'front', 3), ally('u_shiroko', 1, 'front', 3), ally('u_serika', 2, 'front', 3), ally('u_aris', 0, 'rear', 3), ally('u_ayane', 1, 'rear', 3), ally('u_nonomi', 2, 'rear', 3)];
  const nodes = pack.nodes.filter((n) => /^node_[45]_/.test(n.id));
  it('4·5장 노드 10개 · 후보 편성마다 예외 없이 끝나고 결정적', () => {
    expect(nodes).toHaveLength(10);
    for (const node of nodes) for (const cand of node.candidates) {
      const i = input(team, [...cand.front.map((f) => enemy(f.enemyId, f.index)), ...cand.rear.map((f) => enemy(f.enemyId, f.index, 'rear'))], { seed: node.id, nodeType: node.type, statScaleBps: node.statScaleBps });
      const out = simulateBattle(pack, i);
      expect(out.aborted, node.id).toBe(false);
      expect(out.events.at(-1)!.t).toBe('end');
      expect(JSON.stringify(simulateBattle(pack, i))).toBe(JSON.stringify(out));
    }
  });
  it('호드·케테르 보스는 체력이 줄면 단계 패턴을 쓴다', () => {
    for (const boss of ['boss_hod', 'boss_keter']) {
      const out = simulateBattle(pack, input(team, [enemy(boss)], { seed: boss, nodeType: 'boss', statScaleBps: 10000 }));
      expect(out.aborted).toBe(false);
      expect(out.firedEffects.some((id) => id.startsWith(boss)), boss).toBe(true);
    }
  });
});

describe('무작위 편성 퍼즈', () => {
  it('300판: 예외 없이 끝나고 마지막 이벤트는 end, 이벤트 한도 안', () => {
    let seed = 7;
    const rnd = (n: number) => { seed = (seed * 48271) % 2147483647; return seed % n; };
    const fronts = pack.units.filter((u) => u.position !== 'rear_only');
    const rears = pack.units.filter((u) => u.position !== 'front_only');
    for (let i = 0; i < 300; i++) {
      const used = new Set<string>();
      const take = (pool: typeof fronts) => { for (;;) { const u = pool[rnd(pool.length)]; if (!used.has(u.id)) { used.add(u.id); return u.id; } } };
      const allies = [
        ...Array.from({ length: 1 + rnd(4) }, (_, s) => ally(take(fronts), s, 'front', (1 + rnd(3)) as 1 | 2 | 3, rnd(2) ? [pack.equipment[rnd(12)].id] : [])),
        ...Array.from({ length: rnd(7) }, (_, s) => ally(take(rears), s, 'rear', (1 + rnd(3)) as 1 | 2 | 3)),
      ];
      const node = pack.nodes[rnd(pack.nodes.length)];
      const cand = node.candidates[rnd(node.candidates.length)];
      const tiers: Record<string, number> = {};
      for (const s of pack.synergies) if (rnd(6) === 0) tiers[s.id] = rnd(s.tiers.length);
      const out = simulateBattle(pack, input(allies, [...cand.front.map((f) => enemy(f.enemyId, f.index)), ...cand.rear.map((f) => enemy(f.enemyId, f.index, 'rear'))], {
        seed: `F${i}`, nodeType: node.type, statScaleBps: node.statScaleBps, activeTiers: tiers,
        strategies: rnd(2) ? [pack.strategies[rnd(13)].id] : [], ooparts: pack.ooparts.filter(() => rnd(8) === 0).map((o) => o.id),
      }));
      expect(out.events.at(-1)!.t).toBe('end');
      expect(out.aborted).toBe(false);
    }
  });
});
