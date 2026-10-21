// 유년기 회상 세 장면 (171·177·183년). 출생 배경에 따라 문장이 달라진다.
import { BACKGROUNDS, DISTRICTS, OTHER_DISTRICTS, FAMILIES } from './world.js';

const originName = (id) => DISTRICTS[id]?.name || OTHER_DISTRICTS[id] || '';

const BIRTH_LINES = {
  factory: '압연기 교대 종이 세 번 울린 밤, {origin}의 공장 주택에서 당신이 태어났다. 보호자의 손에는 아직 쇳가루가 묻어 있었다.',
  workshop: '{origin}의 작은 공방, 작업대 아래 바구니가 당신의 첫 침대였다. 줄질 소리가 자장가였다.',
  admin: '{origin}의 서류 냄새 나는 집에서 당신이 태어났다. 출생 신고서는 그날 밤 안에 정확한 글씨로 작성되었다.',
  transport: '{origin}의 기적 소리가 길게 울릴 때 당신이 태어났다. 보호자는 다음 날 새벽 화물선에 올라야 했다.',
  migrant: '{origin}의 공동가구에서 당신이 태어났다. 이웃 세 집이 번갈아 물을 끓였고, 아무도 그 일을 빚이라 부르지 않았다.',
  sponsor: '{origin}의 후원원 기록부에 당신의 이름이 적혔다. 사감은 첫날부터 당신의 울음소리를 구별했다.',
};

const FAMILY_LINES = {
  stable: '보호자 {@guardian|는} 늘 같은 시간에 돌아왔다. 그 규칙이 당신의 첫 안전이었다.',
  busy: '보호자 {@guardian|는} 바빴지만, 식탁 위의 쪽지를 한 번도 거르지 않았다.',
  community: '당신을 키운 것은 한 사람이 아니라 골목 전체였다. {@guardian|는} 그 중심에 있었다.',
  substitute: '첫 보호자와는 오래 함께하지 못했다. 대신 {@guardian|이} 당신의 문을 열어 주었다.',
};

export const CHILDHOOD = [
  {
    key: 'birth', year: 171, age: 0, title: '출생',
    text(state) {
      const bg = state.ch.background;
      return BIRTH_LINES[bg].replace('{origin}', originName(state.ch.origin)) + ' ' + FAMILY_LINES[state.ch.family];
    },
    choices: [{ id: 'next', label: '기억을 넘긴다', effects: [] }],
  },
  {
    key: 'six', year: 177, age: 6, title: '여섯 살의 관계',
    text(state) {
      return state.ch.home === 'ash'
        ? '재의 골목의 겨울은 공동 난로 둘레에서 지나갔다. 수리공 토마 아쉬가 장갑을 벗고 배관을 두드릴 때마다 아이들이 모여들었다. 그해 당신이 가장 오래 곁에 있었던 사람은 누구였나.'
        : '여섯 살의 당신은 골목의 소리를 전부 외우고 있었다. 보호자의 발소리, 친구 {@friend|가} 부르는 휘파람, 이웃 {@neighbor|가} 공구를 내려놓는 소리. 그해 당신이 가장 오래 곁에 있었던 사람은 누구였나.';
    },
    choices: [
      { id: 'guardian', label: '보호자 {@guardian}의 일을 거들었다', effects: [{ t: 'rel', who: 'p_guardian', trust: 12, aff: 15 }, { t: 'attr', k: 'will', xp: 3 }] },
      { id: 'friend', label: '친구 {@friend}와 해가 질 때까지 쏘다녔다', effects: [{ t: 'rel', who: 'p_friend', trust: 15, aff: 20 }, { t: 'attr', k: 'body', xp: 3 }] },
      { id: 'workbench', label: '{@mentor}의 작업대 옆에 쭈그려 앉아 있었다', effects: [{ t: 'rel', who: 'mentor', trust: 15, aff: 12 }, { t: 'skill', k: 'repair', xp: 2 }] },
    ],
  },
  {
    key: 'twelve', year: 183, age: 12, title: '열두 살의 관심사',
    text(state) {
      const res = state.ch.ability ? ' 요즘 들어 이상한 감각이 손끝에 남는다. 아무에게도 말하지 않았다.' : '';
      return '야간학교 칠판에는 회로도와 장부 양식이 번갈아 그려졌다. 시장에서는 흥정 소리가, 공장에서는 증기 소리가 넘어왔다. 열두 살의 당신을 가장 오래 붙잡은 것은 무엇이었나.' + res;
    },
    choices: [
      { id: 'machine', label: '기계가 내는 소리와 진동', effects: [{ t: 'skill', k: 'repair', xp: 3 }, { t: 'attr', k: 'craft', xp: 3 }, { t: 'flag', k: 'interest_machine' }] },
      { id: 'ledger', label: '장부와 글자, 오래된 기록', effects: [{ t: 'skill', k: 'record', xp: 3 }, { t: 'attr', k: 'lore', xp: 3 }, { t: 'flag', k: 'interest_ledger' }] },
      { id: 'market', label: '시장의 흥정과 사람들', effects: [{ t: 'skill', k: 'trade', xp: 3 }, { t: 'attr', k: 'speech', xp: 3 }, { t: 'flag', k: 'interest_market' }] },
      { id: 'resonance', label: '손끝에 남는 이상한 감각', cond: { ability: true }, effects: [{ t: 'skill', k: 'resonance', xp: 3 }, { t: 'attr', k: 'will', xp: 3 }, { t: 'flag', k: 'interest_resonance' }] },
    ],
  },
];

export function childhoodRoles(state) {
  return { guardian: 'p_guardian', friend: 'p_friend', neighbor: 'p_neighbor', mentor: state.ch.home === 'ash' ? 'toma' : 'p_neighbor' };
}

export { BACKGROUNDS, FAMILIES };
