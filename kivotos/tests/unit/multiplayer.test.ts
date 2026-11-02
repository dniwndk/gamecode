// 멀티플레이 방(app/multi): 방장 1 + 참가자 2가 메모리 연결로 한 판을 끝까지 둔다.
// 공용 상점 풀, 준비 완료 동기화, PvP 결과 뒤집기, 탈락 순위, 준비 마감, 참가자 명령 거르기를 본다.
import { describe, expect, it } from 'vitest';
import type { ContentCatalog } from '../../src/app/gameClient';
import { createGuest, createHost, type Conn, type Guest, type Host } from '../../src/app/multi/net';
import type { RoomClock } from '../../src/app/multi/room';
import type { UiDriver } from '../../src/app/view';
import { contentPack as pack } from '../../src/content';

const catalog = { pack, rules: pack.rules, validation: { errors: [], warnings: [] }, assetUrl: () => null } as unknown as ContentCatalog;

/** 메모리 연결 한 쌍. JSON으로 한 번 바꿔 실제 통신처럼 복사한다 */
function pipe(): [Conn, Conn] {
  const mk = () => ({ msg: new Set<(m: unknown) => void>(), close: new Set<() => void>(), open: true });
  const a = mk(); const b = mk();
  const end = (me: typeof a, other: typeof a): Conn => ({
    send(m) { if (!me.open) throw new Error('closed'); const copy = JSON.parse(JSON.stringify(m)); queueMicrotask(() => { if (other.open) for (const f of other.msg) f(copy); }); },
    onMessage(fn) { me.msg.add(fn); },
    onClose(fn) { me.close.add(fn); },
    close() { if (!me.open) return; me.open = false; other.open = false; queueMicrotask(() => { for (const f of [...me.close, ...other.close]) f(); }); },
  });
  return [end(a, b), end(b, a)];
}

function fakeClock(): RoomClock & { fire(): void } {
  let t = 0;
  const timers: { at: number; fn: () => void }[] = [];
  return {
    now: () => t,
    later(ms, fn) { const x = { at: t + ms, fn }; timers.push(x); return () => { const i = timers.indexOf(x); if (i >= 0) timers.splice(i, 1); }; },
    fire() { const x = timers.sort((p, q) => p.at - q.at).shift(); if (x) { t = x.at; x.fn(); } },
  };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

/** 단순 봇: 살 수 있으면 사고, 빈 칸에 놓고, 출격 */
async function step(d: UiDriver): Promise<'done' | 'waiting' | 'acted'> {
  const s = d.get();
  const run = s.run;
  if (!run) return 'waiting';
  switch (s.phase) {
    case 'RUN_COMPLETE': case 'RUN_FAILED': return 'done';
    case 'RUN_SETUP': case 'NEXT_NODE': case 'BATTLE': case 'RESULT':
      return (await d.send('CONFIRM_RESULT')).ok ? 'acted' : 'waiting';
    case 'STRATEGY_CHOICE': await d.send('CHOOSE_STRATEGY', { strategyId: run.offers!.strategies![0] }); return 'acted';
    case 'EQUIPMENT_CHOICE': await d.send('CHOOSE_EQUIPMENT', { equipmentId: run.offers!.equipment![0] }); return 'acted';
    case 'OOPART_CHOICE': await d.send(run.ooparts.offer!.grant ? 'CHOOSE_OOPART' : 'CHOOSE_OOPART', { oopartId: run.ooparts.offer!.ids[0] }); return 'acted';
    case 'PREPARATION': {
      if (run.multi?.ready) return 'waiting';
      for (let k = 0; k < run.shop.slots.length; k++) {
        const slot = d.get().run!.shop.slots[k];
        if (slot && slot.cost <= d.get().run!.gold && d.get().run!.board.bench.some((b) => !b)) await d.send('BUY_UNIT', { slotIndex: k });
      }
      for (const inst of d.get().run!.board.bench) {
        const r = d.get().run!;
        if (!inst || r.deployedCount >= r.deployLimit) continue;
        const f = r.board.front.findIndex((x) => !x);
        const re = r.board.rear.findIndex((x) => !x);
        const to = inst.placeable.front && f >= 0 ? { zone: 'front', index: f } : inst.placeable.rear && re >= 0 ? { zone: 'rear', index: re } : null;
        if (to) await d.send('MOVE_UNIT', { instanceId: inst.instanceId, to });
      }
      const res = await d.send('START_BATTLE');
      return res.ok ? 'acted' : 'waiting';
    }
  }
  return 'waiting';
}

function setup(n: number, prepSeconds = 0) {
  const clock = fakeClock();
  const host: Host = createHost(catalog, { roomCode: 'TEST', seed: 'ROOM-SEED', clock, prepSeconds, hostName: '방장' });
  const guests: Guest[] = [];
  for (let i = 1; i < n; i++) {
    const [h, g] = pipe();
    host.accept(h);
    guests.push(createGuest(catalog, g, `참가자${i}`));
  }
  return { clock, host, guests };
}

/** 시작한 방의 모든 상점·보유 학생 장수가 풀 크기를 넘지 않는다 */
function checkPool(host: Host) {
  const used = new Map<string, number>();
  const per = (star: number) => 3 ** (star - 1);
  for (let seat = 0; seat < host.room.playerCount(); seat++) {
    const s = host.room.session(seat)!;
    if (s.info().place !== null) continue;
    for (const o of s.ownedCopies()) used.set(o.unitId, (used.get(o.unitId) ?? 0) + per(o.star));
    for (const id of s.shopShown()) if (id) used.set(id, (used.get(id) ?? 0) + 1);
  }
  for (const [id, n] of used) {
    const u = pack.units.find((x) => x.id === id)!;
    if (u.awakenedFrom) continue;
    expect(n, id).toBeLessThanOrEqual(pack.rules.shop.copiesByCost[u.cost - 1]);
  }
}

describe('멀티플레이 방', () => {
  it('로비: 이름이 같으면 번호를 붙이고, 방장이 시작하면 참가자에게 런 상태가 간다', async () => {
    const { host, guests } = setup(3);
    await flush();
    expect(host.room.lobby().players.map((p) => p.name)).toEqual(['방장', '참가자1', '참가자2']);
    expect(guests[0].lobby()?.players.length).toBe(3);
    let started = 0;
    for (const g of guests) g.onStart(() => { started++; });
    expect(host.start().ok).toBe(true);
    await flush();
    expect(started).toBe(2);
    expect(guests[0].driver.get().phase).toBe('RUN_SETUP');
    expect(guests[0].driver.get().run?.multi?.players.length).toBe(3);
    // 화면 이름에 내부 ID가 섞이지 않는다
    expect(guests[0].driver.get().run!.multi!.players.every((p) => !/^u_|^syn_/.test(p.name))).toBe(true);
  });

  it('참가자는 새 런 같은 방장 명령을 보낼 수 없고, 이상한 좌표는 거절된다', async () => {
    const { host, guests } = setup(2);
    await flush();
    host.start();
    await flush();
    const d = guests[0].driver;
    const nr = await Promise.race([d.send('NEW_RUN', { seed: 'X' }), flush().then(() => 'no-answer')]);
    expect(nr).toBe('no-answer');
    await d.send('CONFIRM_RESULT');
    while (d.get().phase !== 'PREPARATION') { await step(d); await flush(); }
    const inst = d.get().run!.board.bench.find(Boolean)!;
    const bad = await d.send('MOVE_UNIT', { instanceId: inst.instanceId, to: { zone: 'toString', index: 0 } });
    expect(bad.ok).toBe(false);
    const far = await d.send('MOVE_UNIT', { instanceId: inst.instanceId, to: { zone: 'front', index: 99 } });
    expect(far.ok).toBe(false);
  });

  it('세 명이 끝까지 둔다: 모두 준비해야 라운드가 돌고, PvP 결과는 서로 반대이며, 순위가 1~3으로 정해진다', async () => {
    const { host, guests } = setup(3);
    await flush();
    host.start();
    await flush();
    const drivers: UiDriver[] = [host.local()!, ...guests.map((g) => g.driver)];
    const seen = new Map<string, Map<number, 'win' | 'loss'>>();
    let rounds = 0;
    for (let guard = 0; guard < 4000; guard++) {
      let acted = false;
      let done = 0;
      for (const d of drivers) {
        const r = await step(d);
        await flush();
        if (r === 'done') done++;
        if (r === 'acted') acted = true;
        // 라운드는 누군가의 출격으로 한꺼번에 돌므로, 매번 모두의 마지막 전투를 본다
        for (const [i, x] of drivers.entries()) {
          const b = x.get().run?.lastBattle;
          if (!b || x.get().phase !== 'BATTLE' || seen.get(b.battleId)?.has(i)) continue;
          expect(b.events.length).toBeGreaterThan(0);
          expect(b.combatants.some((c) => c.ref.side === 'enemy' && c.unitId)).toBe(true);
          if (!seen.has(b.battleId)) { seen.set(b.battleId, new Map()); rounds++; }
          seen.get(b.battleId)!.set(i, x.get().run!.lastResult!.outcome);
        }
      }
      checkPool(host);
      if (done === drivers.length) break;
      if (!acted) await flush();
    }
    const phases = drivers.map((d) => d.get().phase);
    expect(phases.filter((p) => p === 'RUN_COMPLETE').length).toBe(1);
    expect(phases.filter((p) => p === 'RUN_FAILED').length).toBe(2);
    const places = drivers.map((d) => d.get().run!.multi!.place).sort();
    expect(places).toEqual([1, 2, 3]);
    expect(rounds).toBeGreaterThan(3);
    // 같은 전투를 본 두 사람은(양쪽 전멸이 아니면) 결과가 반대
    let opposite = 0;
    for (const m of seen.values()) if (m.size === 2) { const [x, y] = [...m.values()]; if (x !== y) opposite++; }
    expect(opposite).toBeGreaterThan(0);
  });

  it('준비 마감: 절반 이상이 대기하면 시계가 돌고, 마감되면 남은 사람도 지금 편성으로 출격한다', async () => {
    const { host, guests, clock } = setup(3, 60);
    await flush();
    host.start();
    await flush();
    const drivers: UiDriver[] = [host.local()!, ...guests.map((g) => g.driver)];
    // 앞의 두 사람만 준비 단계까지 가서 출격 대기
    for (const d of drivers.slice(0, 2)) for (let k = 0; k < 30 && !d.get().run?.multi?.ready; k++) { await step(d); await flush(); }
    await flush();
    expect(drivers[0].get().run!.multi!.readyCount).toBe(2);
    expect(drivers[0].get().run!.multi!.deadlineInMs).toBe(60000);
    expect(drivers[2].get().phase).toBe('RUN_SETUP');
    clock.fire();
    await flush(); await flush();
    for (const d of drivers) expect(d.get().phase).toBe('BATTLE');
  });

  it('참가자가 나가면 그 자리는 탈락으로 순위가 정해지고, 둘만 있던 방이면 남은 사람이 우승한다', async () => {
    const { host, guests } = setup(2);
    await flush();
    host.start();
    await flush();
    await guests[0].driver.send('ABANDON_RUN');
    await flush();
    expect(host.local()!.get().run!.multi!.place).toBe(1);
    expect(host.local()!.get().phase).toBe('RUN_COMPLETE');
  });
});
