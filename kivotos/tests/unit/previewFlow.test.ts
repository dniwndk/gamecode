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

describe('미리보기 런: 오파츠 효과', () => {
  function withOoparts(ids: string[]) {
    const pack = { ...contentPack, nodes: contentPack.nodes.map((n) => ({ ...n, statScaleBps: 1 })) };
    const catalog = { pack, rules: pack.rules, validation: { errors: [], warnings: [] }, assetUrl: () => null } as unknown as ContentCatalog;
    return createPreviewSession(catalog, { revision: 0, phase: 'HOME', contentVersion: 'test', rulesVersion: pack.rules.rulesVersion, run: null }, { ooparts: ids });
  }
  async function start(d: UiDriver) {
    await d.send('NEW_RUN', { seed: 'TEST-FX' });
    await d.send('CONFIRM_RESULT');
    while (d.get().phase === 'STRATEGY_CHOICE') await d.send('CHOOSE_STRATEGY', { strategyId: d.get().run!.offers!.strategies![0] });
    if (d.get().phase === 'OOPART_CHOICE') await d.send('SKIP_OOPART');
  }

  it('런·상점 효과가 화면 값에 반영된다', async () => {
    const d = withOoparts(['oop_haniwa', 'oop_black_market_card', 'oop_empty_chair', 'oop_schale_annex_key']);
    await start(d);
    const run = d.get().run!;
    expect(run.board.bench).toHaveLength(10);
    expect(run.deployLimit).toBe(run.level + 1);
    expect(run.shop.slots).toHaveLength(5);
    // 샬레 별관 열쇠: 준비 단계마다 새로고침 4회 무료, 그다음은 블랙마켓 카드 1G
    const gold = run.gold;
    for (let k = 0; k < 4; k++) { expect(d.get().run!.shop.rerollCost).toBe(0); await d.send('REROLL_SHOP'); }
    expect(d.get().run!.gold).toBe(gold);
    expect(d.get().run!.shop.rerollCost).toBe(1);
  });

  it('싯딤의 상자: 전략 4개 중 2개', async () => {
    const d = withOoparts(['oop_shittim_chest']);
    await d.send('NEW_RUN', { seed: 'TEST-FX' });
    await d.send('CONFIRM_RESULT');
    expect(d.get().run!.offers!.strategies).toHaveLength(4);
    await d.send('CHOOSE_STRATEGY', { strategyId: d.get().run!.offers!.strategies![0] });
    expect(d.get().phase).toBe('STRATEGY_CHOICE');
    expect(d.get().run!.offers!.strategies).toHaveLength(3);
    await d.send('CHOOSE_STRATEGY', { strategyId: d.get().run!.offers!.strategies![0] });
    expect(d.get().run!.strategies).toHaveLength(2);
    // v2.3.8: 상점은 언제나 5칸(아로나 추천 6번째 칸 없음)
    if (d.get().phase === 'OOPART_CHOICE') await d.send('SKIP_OOPART');
    expect(d.get().run!.shop.slots).toHaveLength(5);
  });

  it('게마트리아의 계약: 정산 +4G가 수입 내역에 들어간다', async () => {
    const d = withOoparts(['oop_gematria_contract', 'oop_phaistos_disc']);
    await start(d);
    await deployAll(d);
    await d.send('START_BATTLE');
    const res = d.get().run!.lastResult!;
    expect(res.income.some((x) => x.value === 4 && x.label.includes('게마트리아'))).toBe(true);
    expect(res.xpGained).toBe(contentPack.rules.xp.perBattle + 1);
  });

  it('색채의 잔광: 이겨도 전투마다 런 체력 −3', async () => {
    const d = withOoparts(['oop_afterglow_of_color']);
    await start(d);
    await deployAll(d);
    const hp = d.get().run!.runHp;
    await d.send('START_BATTLE');
    expect(d.get().run!.lastResult!.outcome).toBe('win');
    expect(d.get().run!.runHp).toBe(hp - 3);
  });

  it('발동 표시(proc) 이벤트: 원인 ID가 실제 오파츠·시너지이고, 카이저 PMC는 정기 포격마다 알린다', async () => {
    // 전투가 200AV를 넘겨야 포격이 나오므로 적 배율은 원래대로 둔다
    const catalog = { pack: contentPack, rules: contentPack.rules, validation: { errors: [], warnings: [] }, assetUrl: () => null } as unknown as ContentCatalog;
    const d = createPreviewSession(catalog, { revision: 0, phase: 'HOME', contentVersion: 'test', rulesVersion: contentPack.rules.rulesVersion, run: null }, { ooparts: ['oop_pmc_contract'] });
    await start(d);
    await deployAll(d);
    await d.send('START_BATTLE');
    const ev = d.get().run!.lastBattle!.events;
    expect(ev.at(-1)!.av).toBeGreaterThan(200);
    const procs = ev.filter((e) => e.t === 'proc');
    expect(procs.length).toBeGreaterThan(0);
    for (const p of procs) {
      if (p.t !== 'proc') continue;
      const known = p.cause.kind === 'oopart' ? contentPack.ooparts.some((o) => o.id === p.cause.id) : contentPack.synergies.some((x) => x.id === p.cause.id);
      expect(known, p.cause.id).toBe(true);
      expect(p.label.length).toBeGreaterThan(0);
    }
    expect(procs.some((p) => p.t === 'proc' && p.cause.id === 'oop_pmc_contract')).toBe(true);
  });

  it('오파츠 55종 하나씩 가진 채로 1장을 끝까지 진행해도 전투·정산이 깨지지 않는다', async () => {
    for (const o of contentPack.ooparts) {
      const d = withOoparts([o.id]);
      await start(d);
      for (let guard = 0; guard < 40 && d.get().run!.chapter === 1; guard++) {
        const ph = d.get().phase;
        if (ph === 'PREPARATION') { await deployAll(d); expect((await d.send('START_BATTLE')).ok, o.id).toBe(true); }
        else if (ph === 'BATTLE' || ph === 'NEXT_NODE') await d.send('CONFIRM_RESULT');
        else if (ph === 'EQUIPMENT_CHOICE') await d.send('CHOOSE_EQUIPMENT', {});
        else if (ph === 'OOPART_CHOICE') await d.send('SKIP_OOPART');
        else break;
      }
      expect(d.get().run!.chapter, o.id).toBe(2);
      const ev = d.get().run!.lastBattle!.events;
      expect(ev.at(-1)!.t, o.id).toBe('end');
    }
  });
});
