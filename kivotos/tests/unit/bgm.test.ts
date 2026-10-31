import { describe, expect, it } from 'vitest';
import { bgmFor } from '../../src/ui/blue/fx/bgm';

describe('bgmFor', () => {
  it('메인 로비 곡: 홈·도감·설정·런 설정', () => {
    expect(bgmFor('HOME', null)).toBe('lobby');
    expect(bgmFor('HOME', 'codex')).toBe('lobby');
    expect(bgmFor('RUN_SETUP', null)).toBe('lobby');
  });
  it('출격 대기 곡: 런 안의 전투 밖 화면', () => {
    for (const p of ['STRATEGY_CHOICE', 'PREPARATION', 'RESULT', 'EQUIPMENT_CHOICE', 'OOPART_CHOICE', 'NEXT_NODE']) expect(bgmFor(p, null)).toBe('prep');
  });
  it('전투·런 종료는 곡 없음', () => {
    for (const p of ['BATTLE', 'RUN_COMPLETE', 'RUN_FAILED']) expect(bgmFor(p, null)).toBeNull();
  });
});
