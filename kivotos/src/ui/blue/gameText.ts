// 화면에 나가는 모든 글자에서 게임 내부 코드(u_aru·en_sukeban_smg·syn_cc·eff_…·`true` 등)를 걷어 낸다(v2.4.9 사용자 요청:
// "플레이어는 오직 게임 내 용어만"). dom.ts가 글자 노드와 title·aria-label을 넣을 때 이 함수를 거친다.
// ID는 앱 시작 때 setGameNames로 받은 이름으로 바꾸고, 이름이 없는 ID(eff_·node_ 등)는 지운다.

let names = new Map<string, string>();

/** 콘텐츠 ID → 화면 이름(학생·시너지·적·오파츠·장비·전략·상태) */
export function setGameNames(map: Map<string, string>): void { names = map; }

const EVENT_WORD: Record<string, string> = {
  damage_received: '피격', damage_dealt: '타격', skill_resolved: '스킬 사용', ultimate_resolved: '필살기 사용', turn_end: '턴 종료',
  turn_start: '턴 시작', status_applied: '상태 부여', healed: '치유받음', unit_defeated: '쓰러짐', rear_action: '정기 지원',
  battle_start: '전투 시작', reaction_resolved: '후방 반응', delay_action: '', pulse: '',
};
/** 백틱으로 감싼 구현 용어 */
const TOKEN_WORD: Record<string, string> = {
  true: '방어 무시', normal: '', front: '전방', rear: '후방', both: '전방·후방', deployed_all: '출전 전체',
  front_only: '전방', rear_only: '후방', dual: '겸용', special: '', ...EVENT_WORD,
};
const ID = /\b(?:u|syn|eff|en|oop|st|eq|strat|node|portrait|bg|cutin)_[a-z0-9_]+\b/g;
const EVENT = new RegExp(`\\b(?:${Object.keys(EVENT_WORD).join('|')})\\b`, 'g');
const QUICK = /`|[a-z]_[a-z0-9]/;

export function gameText(text: string): string {
  if (!QUICK.test(text)) return text;
  let t = text.replace(/`([^`]*)`/g, (_, x: string) => (x in TOKEN_WORD ? TOKEN_WORD[x] : x));
  t = t.replace(ID, (id) => names.get(id) ?? '');
  t = t.replace(EVENT, (ev) => EVENT_WORD[ev] ?? '');
  // 지운 자리에 남은 빈 괄호·쉼표·공백 정리
  return t
    .replace(/\(\s*[,·/]?\s*\)|\[\s*\]|「\s*」/g, '')
    .replace(/\s+([,.)\]])/g, '$1')
    .replace(/([(\[])\s+/g, '$1')
    .replace(/,\s*,/g, ',')
    .replace(/[ \t]{2,}/g, ' ');
}
