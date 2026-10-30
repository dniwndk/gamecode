// 미리보기 세션(지금 빌드에서 실제로 플레이되는 런)에 오파츠 보상·상점 규칙이 연결됐는지 끝까지 눌러 본다.
// 적 배율을 거의 0으로 줄인 팩으로 항상 이기게 해서 정예·보스 보상 경로를 탄다.
import { describe, expect, it } from 'vitest';
import type { ContentCatalog } from '../../src/app/gameClient';
import { contentPack } from '../../src/content';
import { createPreviewSession } from '../../src/ui/blue/preview/session';
import type { UiDriver } from '../../src/ui/blue/model';

function session(easy: boolean): UiDriver {
  const pack = easy ? { ...contentPack, nodes: contentPack.nodes.map((n) => ({ ...n, statScaleBps: 1 })) } : contentPack;
  const catalog = { pack, rules: pack.rules, validation: { errors: [], warnings: [] }, assetUrl: () => null } as unknown as ContentCatalog;
  return createPreviewSession(catalog, { revision: 0, phase: 'HOME', contentVersion: 'test', rulesVersion: pack.rules.rulesVersion, run: null });
}

async function deployAll(d: UiDriver) {
  const run = d.get().run!;
  let f = run.board.front.findIndex((x) => !x);
  for (const inst of run.board.bench) {
    if (!inst || f < 0 || d.get().run!.deployedCount >= d.get().run!.deployLimit) continue;
    if (!inst.placeable.front) continue;
    await d.send('MOVE_UNIT', { instanceId: inst.instanceId, to: { zone: 'front', index: f } });
    f = d.get().run!.board.front.findIndex((x) => !x);
  }
}

describe('미리보기 런: 오파츠 획득', () => {
  it('런 시작(전략 직후) → 정예 승리(장비 뒤) → 1장 보스 승리(희귀). 3번째 일반 전투에서는 주지 않는다', async () => {
    const d = session(true);
    await d.send('NEW_RUN', { seed: 'TEST-OOP' });
    await d.send('CONFIRM_RESULT');
    expect(d.get().phase).toBe('STRATEGY_CHOICE');
    await d.send('CHOOSE_STRATEGY', { strategyId: d.get().run!.offers!.strategies![0] });
    expect(d.get().phase).toBe('OOPART_CHOICE');
    const start = d.get().run!.ooparts.offer!;
    expect(start.source).toBe('run_start');
    expect(start.ids).toHaveLength(3);
    expect(start.ids.every((id) => contentPack.ooparts.find((o) => o.id === id)!.rarity === 'common')).toBe(true);
    expect((await d.send('CHOOSE_OOPART', { oopartId: start.ids[0] })).ok).toBe(true);
    expect(d.get().phase).toBe('PREPARATION');
    expect(d.get().run!.ooparts.owned).toEqual([start.ids[0]]);

    const sources: string[] = [];
    for (let guard = 0; guard < 40 && d.get().run!.chapter === 1; guard++) {
      const ph = d.get().phase;
      if (ph === 'PREPARATION') { await deployAll(d); expect((await d.send('START_BATTLE')).ok).toBe(true); }
      else if (ph === 'BATTLE' || ph === 'NEXT_NODE') await d.send('CONFIRM_RESULT');
      else if (ph === 'EQUIPMENT_CHOICE') await d.send('CHOOSE_EQUIPMENT', {});
      else if (ph === 'OOPART_CHOICE') {
        const offer = d.get().run!.ooparts.offer!;
        sources.push(`${d.get().run!.battle}:${offer.source}`);
        if (offer.source === 'boss') expect(offer.ids.every((id) => contentPack.ooparts.find((o) => o.id === id)!.rarity === 'rare')).toBe(true);
        const gold = d.get().run!.gold;
        await d.send('SKIP_OOPART');
        expect(d.get().run!.gold).toBe(gold + offer.skipGold);
      } else if (ph === 'STRATEGY_CHOICE') break;
      else throw new Error(`예상 밖 단계 ${ph}`);
    }
    expect(d.get().run!.nodeHistory.slice(0, 5)).toEqual(['win', 'win', 'win', 'win', 'win']);
    expect(sources).toEqual(['4:elite', '5:boss']);
  });

  it('고른 오파츠는 다시 제안되지 않는다', async () => {
    const d = session(true);
    await d.send('NEW_RUN', { seed: 'TEST-OOP2' });
    await d.send('CONFIRM_RESULT');
    await d.send('CHOOSE_STRATEGY', { strategyId: d.get().run!.offers!.strategies![0] });
    const first = d.get().run!.ooparts.offer!.ids[1];
    await d.send('CHOOSE_OOPART', { oopartId: first });
    expect((await d.send('CHOOSE_OOPART', { oopartId: first })).ok).toBe(false);
  });
});

describe('미리보기 런: 상점·레벨', () => {
  it('상점은 코어 추첨(상점 대상 학생만)을 쓰고, 레벨 3의 다음 XP는 4', async () => {
    const d = session(true);
    await d.send('NEW_RUN', { seed: 'TEST-SHOP' });
    await d.send('CONFIRM_RESULT');
    await d.send('CHOOSE_STRATEGY', { strategyId: d.get().run!.offers!.strategies![0] });
    await d.send('SKIP_OOPART');
    expect(d.get().run!.xpToNext).toBe(4);
    const shopIds = () => d.get().run!.shop.slots.map((s) => s?.unitId);
    expect(shopIds().every((id) => id && contentPack.units.find((u) => u.id === id)!.shopEligible)).toBe(true);
  });
});
