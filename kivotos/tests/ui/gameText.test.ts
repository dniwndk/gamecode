// v2.4.9: 화면 글자에 내부 코드(en_sukeban_smg·u_aru·`true` 등)가 남지 않는다
import { describe, expect, it } from 'vitest';
import { contentPack as pack } from '../../src/content';
import { gameText, setGameNames } from '../../src/ui/blue/gameText';
import { STATUS_LABEL, shortName } from '../../src/ui/blue/components';

setGameNames(new Map<string, string>([
  ...pack.units.map((u) => [u.id, shortName(u.name)] as [string, string]),
  ...[...pack.synergies, ...pack.enemies, ...pack.equipment, ...pack.strategies, ...pack.ooparts].map((x) => [x.id, x.name] as [string, string]),
  ...Object.entries(STATUS_LABEL),
]));

const CODE = /`|\b(?:u|syn|eff|en|oop|st|eq|strat|node)_[a-z0-9_]+\b|\b(?:ultimate_resolved|unit_defeated|damage_received|battle_start|turn_start)\b/;

function strings(x: unknown, out: string[] = []): string[] {
  if (typeof x === 'string') out.push(x);
  else if (Array.isArray(x)) for (const v of x) strings(v, out);
  else if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) if (!/id$|Id$|Ids$|assetId|catalogNo|source|path|sha256/i.test(k)) strings(v, out);
  return out;
}

describe('gameText', () => {
  it('ID는 게임 이름으로, 이름 없는 ID와 구현 용어는 지운다', () => {
    expect(gameText('`en_sukeban_smg`·`en_helmet_thug`에게 피해 +50%')).toBe('스케반 기관단총수·헬멧단 불량배에게 피해 +50%'.replace('스케반 기관단총수', pack.enemies.find((e) => e.id === 'en_sukeban_smg')!.name).replace('헬멧단 불량배', pack.enemies.find((e) => e.id === 'en_helmet_thug')!.name));
    expect(gameText('ATK 160% 방어 무시(`true`) 피해')).toBe('ATK 160% 방어 무시(방어 무시) 피해');
    expect(gameText('효과 eff_aru_skill 참조')).toBe('효과 참조');
  });
  it('콘텐츠 팩의 모든 문장을 거치면 내부 코드가 남지 않는다', () => {
    const left = strings(pack).map(gameText).filter((s) => CODE.test(s));
    expect(left.slice(0, 5)).toEqual([]);
  });
});
