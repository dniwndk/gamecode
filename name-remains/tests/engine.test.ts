import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { createRun } from '../src/domain/runFactory';
import { advance, autoChoice, choose, skipToDecision } from '../src/domain/engine';
import { achievementViews, emptyProfile } from '../src/domain/publicSelectors';
import { BACKGROUNDS } from '../src/content/backgrounds';
import { loadAll, parseImport, buildExport, saveAll } from '../src/store/persistence';
import { josa, fill, won } from '../src/domain/text';
import type { RunState } from '../src/domain/types';
import { playOut } from './sim.test';

const clone = (s: RunState): RunState => JSON.parse(JSON.stringify(s));

describe('결정성', () => {
  it('같은 시드와 같은 선택은 같은 삶을 만든다', () => {
    const a = createRun({ seed: 'det-1', name: '가' });
    const b = createRun({ seed: 'det-1', name: '가' });
    playOut(a);
    playOut(b);
    expect(a.run.timeline_logs.map((l) => l.body)).toEqual(b.run.timeline_logs.map((l) => l.body));
    expect(a.rng).toEqual(b.rng);
    expect(a.run.endpoint).toEqual(b.run.endpoint);
  });

  it('저장했다 불러와도(JSON 왕복) 이어지는 결과가 같다', () => {
    const a = createRun({ seed: 'det-2', name: '나' });
    for (let i = 0; i < 40 && a.run.run_status === 'playing'; i++) {
      if (a.run.pending_decision) choose(a, autoChoice(a)!);
      else advance(a);
    }
    const b = clone(a);
    playOut(a);
    playOut(b);
    expect(b.run.timeline_logs.length).toBe(a.run.timeline_logs.length);
    expect(b.run.endpoint).toEqual(a.run.endpoint);
  });

  it('출생은 시드로만 정해지고 16종이 모두 나온다', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 3000; i++) seen.add(createRun({ seed: `bg-${i}`, name: '' }).run.person.background_id);
    expect(seen.size).toBe(BACKGROUNDS.length);
  });
});

describe('일시정지와 속도', () => {
  it('선택을 기다리는 동안에는 시간이 흐르지 않는다', () => {
    const s = createRun({ seed: 'pause-1', name: '' });
    skipToDecision(s);
    expect(s.run.pending_decision).not.toBeNull();
    const before = JSON.stringify(s.run.clock) + s.run.timeline_logs.length;
    for (let i = 0; i < 20; i++) advance(s);
    expect(JSON.stringify(s.run.clock) + s.run.timeline_logs.length).toBe(before);
  });

  it('건너뛰기(다음 선택까지)와 한 묶음씩 진행은 같은 결과를 낸다', () => {
    const a = createRun({ seed: 'speed-1', name: '' });
    const b = createRun({ seed: 'speed-1', name: '' });
    skipToDecision(a);
    while (!b.run.pending_decision && b.run.run_status === 'playing') advance(b);
    expect(a.run.clock).toEqual(b.run.clock);
    expect(a.run.timeline_logs.length).toBe(b.run.timeline_logs.length);
    expect(a.rng).toEqual(b.rng);
  });

  it('잘못된 선택 id나 고를 수 없는 선택은 무시된다', () => {
    const s = createRun({ seed: 'pause-2', name: '' });
    skipToDecision(s);
    const before = s.run.timeline_logs.length;
    choose(s, 'no-such-choice');
    const locked = s.run.pending_decision!.choices.find((c) => !c.is_available);
    if (locked) choose(s, locked.id);
    expect(s.run.timeline_logs.length).toBe(before);
    expect(s.run.pending_decision).not.toBeNull();
  });
});

describe('업적 공개 규칙', () => {
  it('얻지 못한 업적은 해금 설명(revealed)을 내보내지 않는다', () => {
    const views = achievementViews(emptyProfile(), null);
    expect(views).toHaveLength(66);
    expect(views.every((v) => v.revealed === undefined && v.title && v.hint)).toBe(true);
  });

  it('업적 판정은 이번 회차 사실만 본다: 새 회차는 업적 0개로 시작', () => {
    const s = createRun({ seed: 'ach-1', name: '' });
    expect(s.run.achievements).toHaveLength(0);
  });
});

describe('저장소', () => {
  it('IndexedDB에 회차와 계정 기록을 함께 쓰고 다시 읽는다', async () => {
    const s = createRun({ seed: 'idb-1', name: '다' });
    advance(s);
    const profile = { ...emptyProfile(), watched: ['A21'] };
    await saveAll(s, profile, [{ type: 'incident_completed', incident_id: 'EVT_01_FUNERAL_TRAIN' }]);
    const loaded = await loadAll();
    expect(loaded.profile.watched).toEqual(['A21']);
    expect(loaded.active?.run.id).toBe(s.run.id);
    expect(loaded.active?.run.timeline_logs.length).toBe(s.run.timeline_logs.length);
  });

  it('내보내기 파일을 다시 가져올 수 있고 엉뚱한 파일은 거절한다', () => {
    const s = createRun({ seed: 'exp-1', name: '' });
    const text = JSON.stringify(buildExport(emptyProfile(), s));
    expect(parseImport(text).active?.run.seed).toBe('exp-1');
    expect(() => parseImport('{"hello":1}')).toThrow();
  });
});

describe('한국어 표기', () => {
  it('받침에 맞는 조사와 금액 표기', () => {
    expect(josa('김도윤', '이/가')).toBe('김도윤이');
    expect(josa('하나', '이/가')).toBe('하나가');
    expect(josa('서울', '으로/로')).toBe('서울로');
    expect(josa('집', '으로/로')).toBe('집으로');
    expect(fill('{ally|와} 함께', { ally: '옆집 이웃' })).toBe('옆집 이웃과 함께');
    expect(won(12000)).toBe('1억 2,000만원');
    expect(won(-3200)).toBe('-3,200만원');
  });
});
