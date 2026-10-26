// 괴담 사건 도중 결정을 미루고 끼워 넣는 작은 행동. 결정 자리마다 세 가지가 열리고, 하나씩 한 번만 쓸 수 있다.
// 고른 뒤에도 같은 결정이 계속되며, 성공하면 이번 사건의 판정에 작은 보정이 쌓인다.
import type { Cond, Effects } from '../domain/contentTypes';
import type { Apt, ThreatTag } from '../domain/types';

export interface SideActionDef {
  id: string;
  tag: string;
  text: string;
  /** 이 위협이 섞인 사건에서만 열린다(없으면 어디서나) */
  threats?: ThreatTag[];
  requires?: Cond;
  cost?: Effects;
  chance?: { base: number; apt?: Apt[] };
  success: { text: string; effects?: Effects; bonus?: number; clue?: boolean; allyTrust?: number; stealth?: boolean };
  fail?: { text: string; effects?: Effects };
  weight: number;
}

export const SIDE_ACTIONS: SideActionDef[] = [
  {
    id: 'side_look',
    tag: '살피기',
    text: '움직이기 전에 벽의 얼룩과 바닥의 자국, 소리가 나는 방향부터 하나하나 살핀다.',
    chance: { base: 0.6, apt: ['OBS'] },
    success: { text: '처음에는 보이지 않던 것이 눈에 들어왔습니다. 이곳이 무엇을 싫어하는지 조금 알 것 같습니다.', effects: { FAT: 2 }, clue: true, bonus: 0.04 },
    fail: { text: '너무 오래 한곳을 들여다보았습니다. 시야 끝에서 무언가가 같이 고개를 기울였습니다.', effects: { FAT: 4, HP: -3 } },
    weight: 0,
  },
  {
    id: 'side_aid',
    tag: '응급처치',
    text: '구급 파우치를 열어 피가 나는 곳부터 압박 붕대로 감는다.',
    requires: { res: 'SUP', min: 1 },
    cost: { SUP: -1 },
    success: { text: '손이 떨렸지만 붕대는 단단히 감겼습니다. 숨이 조금 편해졌습니다.', effects: { HP: 12 } },
    weight: 5,
  },
  {
    id: 'side_breath',
    tag: '숨 고르기',
    text: '벽에 등을 붙이고 넷을 세며 들이쉬고, 넷을 세며 내쉰다.',
    chance: { base: 0.7, apt: ['RES'] },
    success: { text: '심장이 제 박자를 되찾았습니다. 손끝의 떨림이 멎었습니다.', effects: { FAT: -8 }, bonus: 0.02 },
    fail: { text: '숨을 고르는 사이 발소리가 한 칸 가까워졌습니다. 급히 자리를 옮기다 어깨를 부딪쳤습니다.', effects: { FAT: -3, HP: -4 } },
    weight: 5,
  },
  {
    id: 'side_ally',
    tag: '말 걸기',
    text: '{ally}의 어깨를 붙잡고, 지금 눈앞에 있는 것이 무엇인지 낮은 목소리로 짚어 준다.',
    success: { text: '{ally}의 눈동자가 다시 초점을 찾았습니다. 둘 다 아직 여기 있습니다.', effects: { FAT: 1, aptChance: [{ apt: 'NEG', p: 0.06 }] }, allyTrust: 3, bonus: 0.02 },
    weight: 4,
  },
  {
    id: 'side_ration',
    tag: '비상식량',
    text: '주머니 속 초코바와 물 한 모금으로 허기를 달랜다.',
    requires: { res: 'SUP', min: 1 },
    cost: { SUP: -1 },
    success: { text: '단맛이 혀에 닿자 머리가 맑아졌습니다. 다리에 힘이 돌아옵니다.', effects: { FAT: -12 } },
    weight: 3,
  },
  {
    id: 'side_name',
    tag: '이름 되뇌기',
    text: '눈을 감고 내 이름과 생년월일, 집 주소를 속으로 세 번 되뇐다.',
    success: { text: '이름이 입안에서 또렷하게 굴렀습니다. 아직 나는 나입니다.', effects: { FAT: 2, aptChance: [{ apt: 'RES', p: 0.08 }] }, bonus: 0.03 },
    weight: 4,
  },
  {
    id: 'side_rule',
    tag: '수칙 복기',
    text: '안내문에 적힌 문장을 한 글자씩 다시 읽으며, 빠진 쉼표와 이상한 높임말을 찾는다.',
    threats: ['TH_RULE', 'TH_RITUAL'],
    success: { text: '세 번째 줄의 조사가 바뀌어 있었습니다. 이 규칙은 누군가 덧쓴 것입니다.', effects: { FAT: 2, mst: { MST_RULE: 1 } }, bonus: 0.04 },
    weight: 5,
  },
  {
    id: 'side_mark',
    tag: '표식 남기기',
    text: '모퉁이마다 분필로 화살표와 날짜를 적어 돌아갈 길을 새긴다.',
    threats: ['TH_DOMAIN', 'TH_BOUNDARY'],
    success: { text: '화살표는 지워지지 않았습니다. 적어도 왔던 길은 이 공간도 무르지 못합니다.', effects: { FAT: 3, mst: { MST_BOUND: 1 } }, bonus: 0.04 },
    weight: 5,
  },
  {
    id: 'side_charm',
    tag: '부적 붙이기',
    text: '품속의 부적 한 장을 꺼내 문틀에 붙이고 끝을 침으로 눌러 고정한다.',
    threats: ['TH_PREDATOR', 'TH_INFECTION', 'TH_RITUAL'],
    requires: { res: 'SUP', min: 1 },
    cost: { SUP: -1 },
    success: { text: '부적 끝이 바르르 떨다가 멎었습니다. 문 너머의 기척이 한 걸음 물러났습니다.', effects: { mst: { MST_SEAL: 1 } }, bonus: 0.06 },
    weight: 5,
  },
  {
    id: 'side_hide',
    tag: '숨죽이기',
    text: '몸을 최대한 낮추고, 휴대폰 화면을 가슴에 묻은 채 기척을 죽인다.',
    threats: ['TH_PREDATOR', 'TH_DOMAIN'],
    chance: { base: 0.6, apt: ['OBS'] },
    success: { text: '그것은 바로 옆을 지나갔습니다. 냄새도, 숨소리도 들키지 않았습니다.', effects: { FAT: 3 }, bonus: 0.05, stealth: true },
    fail: { text: '무릎 아래에서 비닐봉지가 바스락거렸습니다. 그것이 고개를 돌렸습니다.', effects: { HP: -6, FAT: 4 } },
    weight: 5,
  },
  {
    id: 'side_listen',
    tag: '소리 가려듣기',
    text: '한쪽 귀를 막고, 들리는 소리 가운데 사람의 것이 아닌 소리만 가려 듣는다.',
    threats: ['TH_COSMIC', 'TH_INFECTION', 'TH_BOUNDARY'],
    chance: { base: 0.5, apt: ['RES'] },
    success: { text: '낮게 웅웅거리는 소리 하나가 박자를 틀렸습니다. 저쪽이 출구가 아닙니다.', effects: { FAT: 2, mst: { MST_BOUND: 1 } }, bonus: 0.05 },
    fail: { text: '너무 깊이 들었습니다. 그 소리가 이제 귓속에서 들립니다.', effects: { HP: -5, FAT: 5 } },
    weight: 4,
  },
  {
    id: 'side_offer',
    tag: '동전 바치기',
    text: '지갑에서 500원짜리 동전 하나를 꺼내 바닥에 내려놓고 고개를 숙인다.',
    threats: ['TH_RITUAL', 'TH_RULE'],
    requires: { res: 'KRW', min: 5 },
    cost: { KRW: -5 },
    success: { text: '동전이 소리 없이 사라졌습니다. 값을 치른 손님에게는 조금 더 너그러운 곳인 모양입니다.', effects: { aptChance: [{ apt: 'NEG', p: 0.06 }] }, bonus: 0.04 },
    weight: 3,
  },
  {
    id: 'side_light',
    tag: '불빛 확인',
    text: '휴대폰 손전등을 켜서 바닥에 비치는 내 그림자의 개수부터 센다.',
    threats: ['TH_COSMIC', 'TH_DOMAIN', 'TH_PREDATOR'],
    chance: { base: 0.55, apt: ['OBS', 'RES'] },
    success: { text: '그림자는 하나였습니다. 적어도 지금 이 자리에는 나 혼자입니다.', effects: { FAT: 1, aptChance: [{ apt: 'OBS', p: 0.06 }] }, bonus: 0.04 },
    fail: { text: '그림자가 하나 더 있었습니다. 불을 끄는 손이 늦었습니다.', effects: { HP: -4, FAT: 6 } },
    weight: 4,
  },
  {
    id: 'side_salt',
    tag: '소금 뿌리기',
    text: '편의점에서 산 맛소금 봉지를 뜯어 발밑에 둥글게 선을 긋는다.',
    threats: ['TH_INFECTION', 'TH_PREDATOR', 'TH_RITUAL'],
    requires: { res: 'SUP', min: 1 },
    cost: { SUP: -1 },
    chance: { base: 0.6, apt: ['PRC'] },
    success: { text: '선 바깥에서 무언가가 발을 멈췄습니다. 소금 알갱이가 검게 변해 갑니다.', effects: { mst: { MST_SEAL: 1 } }, bonus: 0.05 },
    fail: { text: '손이 떨려 선이 끊겼습니다. 끊긴 자리로 차가운 것이 스며들었습니다.', effects: { HP: -5 } },
    weight: 3,
  },
];

const byId = new Map(SIDE_ACTIONS.map((a) => [a.id, a]));
export const sideById = (id: string) => byId.get(id);
