// 영구 상해와 고등급 괴담의 대가.
// 상해는 한 번 생기면 그 생애 동안 사라지지 않는다: 적성·최대 건강·수명 한계가 영구히 깎인다.
import type { Effects } from '../domain/contentTypes';
import type { Apt } from '../domain/types';
import type { BodyPart } from './bodyUse';

export interface InjuryDef {
  id: string;
  name: string;
  /** 화면에 보이는 영구 효과 */
  effect: string;
  apt?: Partial<Record<Apt, number>>;
  /** 최대 건강 감소량 */
  maxHp?: number;
  /** 수명 한계 감소(년) */
  lifespan?: number;
  /** 숙련 손실 */
  mst?: Effects['mst'];
  /** 몸에 남는 상처(사건 실패로 생길 수 있는 것) */
  physical?: boolean;
  /** 이 부위를 쓰는 선택은 불리해진다(성공률 감소, 판정 없는 선택은 몸에 부담) */
  hinders?: BodyPart[];
  /** 이 부위를 쓰는 선택은 아예 고를 수 없다 */
  blocks?: BodyPart[];
}

export const INJURIES: InjuryDef[] = [
  { id: 'INJ_EYE', name: '한쪽 눈 시력 저하', effect: '관찰 -1 · 눈을 쓰는 선택 불리', apt: { OBS: -1 }, physical: true, hinders: ['eye'] },
  { id: 'INJ_HAND', name: '손가락 신경 손상', effect: '실무 -1 · 손을 쓰는 선택 불리', apt: { PRC: -1 }, physical: true, hinders: ['hand'] },
  { id: 'INJ_VOICE', name: '성대 손상', effect: '교섭 -1 · 말하는 선택 불리 · 소리치기 불가', apt: { NEG: -1 }, physical: true, hinders: ['voice'], blocks: ['shout'] },
  { id: 'INJ_EAR', name: '한쪽 귀 청력 상실', effect: '감응 -1 · 귀를 쓰는 선택 불리', apt: { RES: -1 }, physical: true, hinders: ['ear'] },
  { id: 'INJ_LUNG', name: '폐 손상', effect: '최대 건강 -10 · 호흡·달리기 불리 · 숨 참기 불가', maxHp: 10, physical: true, hinders: ['breath', 'run'], blocks: ['hold'] },
  { id: 'INJ_LEG', name: '다리 부상 후유증', effect: '최대 건강 -8 · 오르기 불리 · 달리기 불가', maxHp: 8, physical: true, hinders: ['climb'], blocks: ['run'] },
  { id: 'INJ_SCAR', name: '깊은 흉터', effect: '최대 건강 -6', maxHp: 6, physical: true },
  { id: 'INJ_SPINE', name: '허리 신경 손상', effect: '최대 건강 -6 · 실무 -1 · 오르기 불리 · 부축 불가', maxHp: 6, apt: { PRC: -1 }, physical: true, hinders: ['climb'], blocks: ['carry'] },
  { id: 'INJ_INFECT', name: '균사 흔적', effect: '최대 건강 -10 · 호흡 불리', maxHp: 10, hinders: ['breath'] },
  { id: 'INJ_MEMORY', name: '기억 일부 소실', effect: '규칙·계약 해석 -6 · 기억에 기대는 선택 불리', mst: { MST_RULE: -6 }, hinders: ['recall'] },
  { id: 'INJ_SHADOW', name: '그림자 일부 상실', effect: '수명 한계 -3년 · 그림자를 쓰는 선택 불리', lifespan: 3, hinders: ['shadow'] },
  { id: 'INJ_NAME', name: '이름 일부 잠식', effect: '감응 -1 · 수명 한계 -2년 · 이름을 쓰는 선택 불리', apt: { RES: -1 }, lifespan: 2, hinders: ['name'] },
  { id: 'INJ_TIME', name: '잃어버린 시간', effect: '수명 한계 -4년', lifespan: 4 },
  { id: 'INJ_MIND', name: '악몽과 환청', effect: '감응 -1 · 최대 건강 -4 · 정신 집중 불리', apt: { RES: -1 }, maxHp: 4, hinders: ['focus'] },
];

const byId = new Map(INJURIES.map((i) => [i.id, i]));
export const injuryById = (id: string) => byId.get(id);
export const PHYSICAL_INJURIES = INJURIES.filter((i) => i.physical).map((i) => i.id);

/** 고등급 괴담에서 살아 돌아온 대가. 상해이거나, 다른 무언가를 내준다. */
export interface TollDef {
  text: string;
  effects: Effects;
}

/**
 * 살아 나와도 대가를 받아 가는 고등급 괴담. 모든 고등급 괴담이 아니라, 무언가를 빼앗아 가는 것이 그 괴담의 본성인 경우만.
 * - 종이에 없는 바다: 시간과 기억을 물처럼 적셔 가져간다
 * - 신이 돌아본 자리: 신의 시선을 받은 몸은 원래대로 돌아오지 않는다
 * - 기록말소국 활자 범람: 문서를 덮은 활자가 사람의 기록도 지운다
 * - 최후의 기슭: 경계 너머까지 갔다 온 값
 * 붉은 침식선 범람, 해결사 총회, 정점의 권능 행사는 위험하지만 '값을 받는' 괴담은 아니라서 대가가 없다.
 */
export const INCIDENT_TOLLS: Record<string, TollDef[]> = {
  EVT_08_UNCHARTED_SEA: [
    { text: '방파제에 닿아 보니 휴대폰 날짜가 넉 달 뒤였습니다. 바다는 젖지 않는 대신 시간을 적셔 갔습니다.', effects: { injury: 'INJ_TIME' } },
    { text: '등대 계단에서 본 낙서가 누구 글씨였는지 끝내 떠오르지 않습니다. 기억 한 칸이 바닷물에 풀렸습니다.', effects: { injury: 'INJ_MEMORY' } },
    { text: '돌아오는 길을 붙잡느라 모든 표식과 물자를 만조에 내주고 왔습니다.', effects: { SUP: -4, beacons: -3, FAT: 15 } },
  ],
  EVT_10_GAZE_OF_DEITY: [
    { text: '그것을 본 왼쪽 눈은 이제 빛의 가장자리만 봅니다.', effects: { injury: 'INJ_EYE' } },
    { text: '밤마다 별이 내 이름을 부르는 꿈을 꿉니다. 잠이 얕아졌습니다.', effects: { injury: 'INJ_MIND' } },
    { text: '돌아와 보니 발밑 그림자가 한 뼘 짧아져 있었습니다. 시선이 그만큼을 쥐고 갔습니다.', effects: { injury: 'INJ_SHADOW' } },
  ],
  EVT_17_CENSORED_ARCHIVE_BREACH: [
    { text: '서고를 빠져나오며 활자 몇 줄이 내 기억 위에 덮였습니다. 어린 시절 살던 동네 이름이 지워졌습니다.', effects: { injury: 'INJ_MEMORY' } },
    { text: '주민등록 기록의 내 이름 한 글자가 검게 칠해져 있었습니다. 사람들이 자꾸 내 이름을 잘못 부릅니다.', effects: { injury: 'INJ_NAME' } },
    { text: '활자를 너무 오래 들여다본 눈에 검은 얼룩이 남았습니다.', effects: { injury: 'INJ_EYE' } },
  ],
  EVT_20_TRANSCENDENT_FINALE: [
    { text: '문턱을 넘어 돌아오면서 그림자 일부를 기슭에 두고 왔습니다.', effects: { injury: 'INJ_SHADOW' } },
    { text: '기슭의 바람이 이름 끝자락을 깎아 갔습니다.', effects: { injury: 'INJ_NAME' } },
    { text: '경계 너머의 소리를 너무 오래 들었습니다. 한쪽 귀가 더는 이쪽 소리를 듣지 않습니다.', effects: { injury: 'INJ_EAR' } },
    { text: '돌아오는 데 쓴 시간만큼 몸이 늙어 있었습니다.', effects: { lifespan: -3, FAT: 20 } },
  ],
};
