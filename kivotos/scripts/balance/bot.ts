// 오파츠 밸런스 측정용 자동 플레이 봇. 미리보기 세션(지금 빌드에서 플레이되는 런)을 명령으로만 조작한다.
import type { ContentCatalog } from '../../src/app/gameClient';
import { contentPack } from '../../src/content';
import { createPreviewSession } from '../../src/ui/blue/preview/session';
import type { UiDriver, UnitInstanceView, RunView } from '../../src/ui/blue/model';

const pack = contentPack;
const unitById = new Map(pack.units.map((u) => [u.id, u]));
const eqById = new Map(pack.equipment.map((e) => [e.id, e]));

export interface RunOutcome {
  wins: number;
  nodes: number;
  complete: boolean;
  chapterReached: number;
  runHp: number;
  owned: string[];
  merges: number;
  level: number;
}

export type OopPolicy = 'skip' | 'first' | 'random';

let focus: string | null = null;
const member = (unitId: string) => !!focus && unitById.get(unitId)!.synergyIds.includes(focus);
const val = (i: UnitInstanceView) => unitById.get(i.unitId)!.cost * 3 ** (i.star - 1) * (member(i.unitId) ? 3 : 1);

function insts(run: RunView) {
  const out: { inst: UnitInstanceView; zone: 'front' | 'rear' | 'bench'; index: number }[] = [];
  for (const zone of ['front', 'rear', 'bench'] as const) run.board[zone].forEach((inst, index) => { if (inst) out.push({ inst, zone, index }); });
  return out;
}

export function makeSession(ooparts: string[]): UiDriver {
  const catalog = { pack, rules: pack.rules, validation: { errors: [], warnings: [] }, assetUrl: () => null } as unknown as ContentCatalog;
  return createPreviewSession(catalog, { revision: 0, phase: 'HOME', contentVersion: 'sim', rulesVersion: pack.rules.rulesVersion, run: null }, { ooparts });
}

async function arrange(d: UiDriver) {
  // 1) 빈 자리 채우기 2) 대기석의 더 센 학생으로 약한 편성 학생 교체
  for (let guard = 0; guard < 30; guard++) {
    const run = d.get().run!;
    const bench = insts(run).filter((x) => x.zone === 'bench').sort((a, b) => val(b.inst) - val(a.inst) || b.inst.stats.hp - a.inst.stats.hp);
    if (!bench.length) return;
    const frontCount = run.board.front.filter(Boolean).length;
    let moved = false;
    if (run.deployedCount < run.deployLimit) {
      const order = frontCount === 0 ? [...bench].sort((x, y) => +y.inst.placeable.front - +x.inst.placeable.front) : bench;
      for (const b of order) {
        const fFree = run.board.front.findIndex((x) => !x);
        const rFree = run.board.rear.findIndex((x) => !x);
        const wantFront = b.inst.placeable.front && fFree >= 0 && (!b.inst.placeable.rear || frontCount < 3 || rFree < 0);
        const to = wantFront ? { zone: 'front', index: fFree } : b.inst.placeable.rear && rFree >= 0 ? { zone: 'rear', index: rFree } : b.inst.placeable.front && fFree >= 0 ? { zone: 'front', index: fFree } : null;
        if (!to) continue;
        if ((await d.send('MOVE_UNIT', { instanceId: b.inst.instanceId, to })).ok) { moved = true; break; }
      }
      if (moved) continue;
    }
    // 교체
    const deployed = insts(run).filter((x) => x.zone !== 'bench').sort((a, b) => val(a.inst) - val(b.inst));
    for (const b of bench) {
      const weak = deployed.find((x) => val(x.inst) < val(b.inst) && (x.zone === 'front' ? b.inst.placeable.front : b.inst.placeable.rear));
      if (!weak) continue;
      if ((await d.send('MOVE_UNIT', { instanceId: b.inst.instanceId, to: { zone: weak.zone, index: weak.index } })).ok) { moved = true; break; }
    }
    if (!moved) return;
  }
}

function levelTarget(run: RunView) {
  const n = (run.chapter - 1) * 5 + run.battle; // 1..15
  return Math.min(10, 3 + Math.floor(n / 2));
}

async function shop(d: UiDriver) {
  for (let guard = 0; guard < 60; guard++) {
    const run = d.get().run!;
    const reserve = run.chapter === 1 ? 10 : run.chapter === 2 ? 20 : 0;
    const owned = new Map<string, number>();
    for (const x of insts(run)) owned.set(x.inst.unitId, (owned.get(x.inst.unitId) ?? 0) + 3 ** (x.inst.star - 1));
    const benchFree = run.board.bench.filter((x) => !x).length;
    const units = insts(run).length;
    // 1) 합성·짝 맞추기
    let idx = run.shop.slots.findIndex((s) => s && run.gold >= s.cost && (s.preview.mergesTo || (owned.has(s.unitId) && benchFree > 0)));
    // 1.5) 집중 시너지 구성원
    if (idx < 0 && focus && benchFree > 0) idx = run.shop.slots.findIndex((s) => s && run.gold >= s.cost && member(s.unitId) && !owned.has(s.unitId));
    // 2) 편성 인원이 모자라면 비싼 학생
    if (idx < 0 && units < run.deployLimit + 1 && benchFree > 0) {
      let best = -1;
      run.shop.slots.forEach((s, i) => { if (s && run.gold >= s.cost && (best < 0 || s.cost > run.shop.slots[best]!.cost)) best = i; });
      idx = best;
    }
    if (idx >= 0) { if ((await d.send('BUY_UNIT', { slotIndex: idx })).ok) continue; }
    // 3) 레벨
    if (run.xpToNext !== null && run.level < levelTarget(run) && run.gold - run.shop.xpCost >= Math.min(reserve, 10)) { if ((await d.send('BUY_XP', { times: 1 })).ok) continue; }
    // 4) 대기석이 꽉 차면 짝 없는 가장 약한 학생 판매
    if (benchFree === 0) {
      const bench = insts(run).filter((x) => x.zone === 'bench' && (owned.get(x.inst.unitId) ?? 0) < 2).sort((a, b) => val(a.inst) - val(b.inst));
      if (bench[0] && (await d.send('SELL_UNIT', { instanceId: bench[0].inst.instanceId })).ok) continue;
    }
    // 5) 새로고침(여유 골드)
    if (run.gold - run.shop.rerollCost >= reserve + 4 && run.chapter >= 2) { if ((await d.send('REROLL_SHOP')).ok) continue; }
    if (run.chapter === 3 && run.gold >= run.shop.rerollCost && (run.battle >= 3)) { if ((await d.send('REROLL_SHOP')).ok) continue; }
    return;
  }
}

async function equip(d: UiDriver) {
  for (let guard = 0; guard < 20; guard++) {
    const run = d.get().run!;
    if (!run.equipmentStash.length) return;
    const deployed = insts(run).filter((x) => x.zone !== 'bench').sort((a, b) => val(b.inst) - val(a.inst));
    let done = false;
    for (const eqId of run.equipmentStash) {
      const eq = eqById.get(eqId)!;
      const t = deployed.find((x) => x.inst.equipment.length < (x.inst.equipSlots ?? 2) && (eq.zone === 'both' || eq.zone === x.zone) && !(eq.uniquePerUnit && x.inst.equipment.includes(eqId)));
      if (t && (await d.send('EQUIP_ITEM', { instanceId: t.inst.instanceId, equipmentId: eqId })).ok) { done = true; break; }
    }
    if (!done) return;
  }
}

async function ensureFront(d: UiDriver) {
  for (let guard = 0; guard < 5 && !d.get().run!.board.front.some(Boolean); guard++) {
    const run = d.get().run!;
    const c = insts(run).find((x) => x.zone !== 'front' && x.inst.placeable.front);
    if (c && c.zone === 'bench' && run.deployedCount >= run.deployLimit) {
      const out = insts(run).find((x) => x.zone === 'rear');
      const free = run.board.bench.findIndex((x) => !x);
      if (out && free >= 0) { await d.send('MOVE_UNIT', { instanceId: out.inst.instanceId, to: { zone: 'bench', index: free } }); continue; }
    }
    if (c) { await d.send('MOVE_UNIT', { instanceId: c.inst.instanceId, to: { zone: 'front', index: 0 } }); continue; }
    const i = run.shop.slots.findIndex((s) => s && run.gold >= s.cost && unitById.get(s.unitId)!.position !== 'rear_only');
    if (i >= 0) { await d.send('BUY_UNIT', { slotIndex: i }); continue; }
    const sell = insts(run).find((x) => x.zone === 'bench');
    if (sell) await d.send('SELL_UNIT', { instanceId: sell.inst.instanceId }); else return;
  }
}

export async function playRun(seed: string, ooparts: string[], policy: OopPolicy = 'skip', rand: () => number = Math.random, focusSyn: string | null = null): Promise<RunOutcome> {
  focus = focusSyn;
  const d = makeSession(ooparts);
  await d.send('NEW_RUN', { seed });
  await d.send('CONFIRM_RESULT');
  let merges = 0;
  for (let guard = 0; guard < 400; guard++) {
    const s = d.get();
    const run = s.run!;
    switch (s.phase) {
      case 'STRATEGY_CHOICE': await d.send('CHOOSE_STRATEGY', { strategyId: run.offers!.strategies![0] }); break;
      case 'OOPART_CHOICE': {
        const o = run.ooparts.offer!;
        if (o.grant || policy !== 'skip') {
          const id = policy === 'random' ? o.ids[Math.floor(rand() * o.ids.length)] : o.ids[0];
          const before = run.ooparts.owned.length;
          await d.send('CHOOSE_OOPART', { oopartId: id });
          if (d.get().run!.ooparts.owned.length <= before) merges++;
        } else await d.send('SKIP_OOPART');
        break;
      }
      case 'EQUIPMENT_CHOICE': await d.send('CHOOSE_EQUIPMENT', { equipmentId: run.offers!.equipment![0] }); break;
      case 'PREPARATION': {
        await shop(d); await arrange(d); await shop(d); await arrange(d); await equip(d);
        await ensureFront(d);
        const r = await d.send('START_BATTLE');
        if (!r.ok) throw new Error(`${seed} START_BATTLE: ${r.ok === false ? (r as { message?: string }).message : ''}`);
        break;
      }
      case 'BATTLE': case 'RESULT': case 'NEXT_NODE': await d.send('CONFIRM_RESULT'); break;
      case 'RUN_COMPLETE': case 'RUN_FAILED': {
        const h = run.nodeHistory;
        return { wins: h.filter((x) => x === 'win').length, nodes: h.filter(Boolean).length, complete: s.phase === 'RUN_COMPLETE', chapterReached: run.chapter, runHp: Math.max(0, run.runHp), owned: run.ooparts.owned, merges, level: run.level };
      }
      default: throw new Error(`예상 밖 단계 ${s.phase}`);
    }
  }
  throw new Error(`${seed}: 끝나지 않음`);
}
