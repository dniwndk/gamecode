// 영구 상해와 고등급 괴담의 대가.
// 상해는 한 번 생기면 그 생애 동안 사라지지 않는다: 적성·최대 건강·수명 한계가 영구히 깎인다.
import type { Effects } from '../domain/contentTypes';
import type { Apt, ThreatTag } from '../domain/types';

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
}

export const INJURIES: InjuryDef[] = [
  { id: 'INJ_EYE', name: '한쪽 눈 시력 저하', effect: '관찰 -1', apt: { OBS: -1 }, physical: true },
  { id: 'INJ_HAND', name: '손가락 신경 손상', effect: '실무 -1', apt: { PRC: -1 }, physical: true },
  { id: 'INJ_VOICE', name: '성대 손상', effect: '교섭 -1', apt: { NEG: -1 }, physical: true },
  { id: 'INJ_EAR', name: '한쪽 귀 청력 상실', effect: '감응 -1', apt: { RES: -1 }, physical: true },
  { id: 'INJ_LUNG', name: '폐 손상', effect: '최대 건강 -10', maxHp: 10, physical: true },
  { id: 'INJ_LEG', name: '다리 부상 후유증', effect: '최대 건강 -8', maxHp: 8, physical: true },
  { id: 'INJ_SCAR', name: '깊은 흉터', effect: '최대 건강 -6', maxHp: 6, physical: true },
  { id: 'INJ_SPINE', name: '허리 신경 손상', effect: '최대 건강 -6 · 실무 -1', maxHp: 6, apt: { PRC: -1 }, physical: true },
  { id: 'INJ_INFECT', name: '균사 흔적', effect: '최대 건강 -10', maxHp: 10 },
  { id: 'INJ_MEMORY', name: '기억 일부 소실', effect: '규칙·계약 해석 -6', mst: { MST_RULE: -6 } },
  { id: 'INJ_SHADOW', name: '그림자 일부 상실', effect: '수명 한계 -3년', lifespan: 3 },
  { id: 'INJ_NAME', name: '이름 일부 잠식', effect: '감응 -1 · 수명 한계 -2년', apt: { RES: -1 }, lifespan: 2 },
  { id: 'INJ_TIME', name: '잃어버린 시간', effect: '수명 한계 -4년', lifespan: 4 },
  { id: 'INJ_MIND', name: '악몽과 환청', effect: '감응 -1 · 최대 건강 -4', apt: { RES: -1 }, maxHp: 4 },
];

const byId = new Map(INJURIES.map((i) => [i.id, i]));
export const injuryById = (id: string) => byId.get(id);
export const PHYSICAL_INJURIES = INJURIES.filter((i) => i.physical).map((i) => i.id);

/** 고등급 괴담에서 살아 돌아온 대가. 상해이거나, 다른 무언가를 내준다. */
export interface TollDef {
  text: string;
  effects: Effects;
}

export const TOLLS: Record<ThreatTag, TollDef[]> = {
  TH_RULE: [
    { text: '규칙을 이긴 값으로 기억 한 조각을 내주었습니다. 어린 시절 살던 동네 이름이 더는 떠오르지 않습니다.', effects: { injury: 'INJ_MEMORY' } },
    { text: '계약의 잔여 조항이 끝내 따라붙었습니다. 다음 달 통장에서 이름 모를 수수료가 빠져나갔습니다.', effects: { KRW: -80 } },
    { text: '그곳의 높임말이 입에 붙어 떨어지지 않습니다. 사람들과 말을 섞을 때마다 목이 잠깁니다.', effects: { injury: 'INJ_VOICE' } },
  ],
  TH_PREDATOR: [
    { text: '살아 나왔지만 등에 남은 발톱 자국은 끝내 아물지 않았습니다.', effects: { injury: 'INJ_SCAR' } },
    { text: '그것을 떼어 내느라 손가락 두 개의 감각을 잃었습니다.', effects: { injury: 'INJ_HAND' } },
    { text: '도망치다 접질린 다리는 비 오는 날마다 먼저 아픕니다.', effects: { injury: 'INJ_LEG' } },
  ],
  TH_INFECTION: [
    { text: '격리 해제 판정은 받았지만, 폐 깊은 곳에 잿빛 실이 남았습니다.', effects: { injury: 'INJ_INFECT' } },
    { text: '소독과 격리에 모아 둔 물자를 모두 썼고, 일주일을 앓았습니다.', effects: { SUP: -4, HP: -12, FAT: 20 } },
    { text: '숨을 쉴 때마다 가슴 안쪽이 서걱거립니다. 의사는 원래대로 돌아오지 않는다고 했습니다.', effects: { injury: 'INJ_LUNG' } },
  ],
  TH_RITUAL: [
    { text: '제단은 빈자리를 그냥 두지 않았습니다. 남은 수명 몇 해가 대신 올라갔습니다.', effects: { lifespan: -3 } },
    { text: '의식이 끝난 뒤에도 사람들이 내 이름을 자꾸 잘못 부릅니다. 이름이 조금 깎여 나갔습니다.', effects: { injury: 'INJ_NAME' } },
    { text: '제물 대신 바칠 것을 사느라 모아 둔 돈을 털었습니다.', effects: { KRW: -100, SUP: -2 } },
  ],
  TH_DOMAIN: [
    { text: '그 안에서는 사흘이었는데, 밖에서는 몇 해가 지나 있었습니다.', effects: { injury: 'INJ_TIME' } },
    { text: '무너지는 공간에서 빠져나오다 허리를 크게 다쳤습니다.', effects: { injury: 'INJ_SPINE' } },
    { text: '돌아오는 길을 붙잡느라 모든 표식과 물자를 그곳에 두고 왔습니다.', effects: { SUP: -4, beacons: -3, FAT: 15 } },
  ],
  TH_COSMIC: [
    { text: '그것을 본 왼쪽 눈은 이제 빛의 가장자리만 봅니다.', effects: { injury: 'INJ_EYE' } },
    { text: '밤마다 별이 내 이름을 부르는 꿈을 꿉니다. 잠이 얕아졌습니다.', effects: { injury: 'INJ_MIND' } },
    { text: '돌아와 보니 발밑 그림자가 한 뼘 짧아져 있었습니다.', effects: { injury: 'INJ_SHADOW' } },
  ],
  TH_BOUNDARY: [
    { text: '문턱을 넘어 돌아오면서 그림자 일부를 저쪽에 두고 왔습니다.', effects: { injury: 'INJ_SHADOW' } },
    { text: '경계 너머의 소리를 너무 오래 들었습니다. 한쪽 귀가 더는 이쪽 소리를 듣지 않습니다.', effects: { injury: 'INJ_EAR' } },
    { text: '돌아오는 데 쓴 시간만큼 몸이 늙어 있었습니다.', effects: { lifespan: -2, FAT: 20 } },
  ],
};
