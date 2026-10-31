import { describe, expect, it } from 'vitest';
import { routeSfx } from '../../src/ui/blue/fx/sfx';
import { SFX_BANK } from '../../src/ui/blue/fx/sfxBank';

const ids = (name: string, o = {}) => routeSfx(name, o).map(([id]) => id.split(':')[0]);

describe('routeSfx: 옛 이름 → 효과음 파일', () => {
  it('모든 경로가 효과음 묶음에 있는 ID만 낸다', () => {
    const names = ['hit', 'crit', 'ult', 'cutin', 'down', 'shieldBreak', 'heal', 'shield', 'proc', 'chain', 'escalation', 'synergy', 'victory', 'defeat'];
    for (const n of names) for (const power of [0, 1, 2, 3]) for (const step of [0, 4, 9, 20]) for (const foe of [false, true]) {
      for (const id of ids(n, { power, step, foe, shielded: power === 1, who: foe ? 'ally' : 'boss', plat: foe, rare: foe, short: foe })) expect(SFX_BANK[id], `${n} → ${id}`).toBeTruthy();
    }
  });
  it('타격은 총성 뒤에 착탄음, 보호막이면 보호막음', () => {
    const [gun, hit] = routeSfx('hit', { power: 1 });
    expect(gun[0]).toMatch(/^GUN_/);
    expect(hit[1]).toBeGreaterThan(0);
    expect(ids('hit', { power: 2, shielded: true })[1]).toBe('HIT_SHIELD');
    expect(ids('hit', { power: 1, foe: true })).toEqual(['GUN_FOE', 'HIT_BODY_M']);
  });
  it('치명타는 저격 + 치명 피격, 연쇄는 단계별 음, 10단부터 피니시', () => {
    expect(ids('crit')).toEqual(['GUN_SR', 'HIT_CRIT']);
    expect(ids('chain', { step: 1 })).toEqual(['CHAIN_02']);
    expect(ids('chain', { step: 9 })).toEqual(['CHAIN_10', 'CHAIN_MAX']);
    expect(ids('chain', { step: 30 })[0]).toBe('CHAIN_11');
  });
  it('파일 ID는 그대로, 모르는 이름은 아무것도', () => {
    expect(ids('UI_CLICK')).toEqual(['UI_CLICK']);
    expect(routeSfx('SHOP_LOCK:2')[0][0]).toBe('SHOP_LOCK:2');
    expect(routeSfx('NOPE')).toEqual([]);
  });
});
