// 인연 단계와 단계별 혜택. 인물 패널·사건 선택지·경제 규칙이 같은 표를 읽는다.
// 단계는 신뢰와 호감으로 정해진다: 적대 / 냉담 / 안면 / 친분 / 믿는 사이 / 평생의 인연

export const BOND_TIERS = [
  { id: 'hostile', name: '적대', desc: '이름을 들으면 표정이 굳는다. 도움을 청할 수 없다.' },
  { id: 'cold', name: '냉담', desc: '인사는 받지만 그 이상은 없다.' },
  { id: 'acquaint', name: '안면', desc: '얼굴과 이름을 아는 사이.' },
  { id: 'friendly', name: '친분', desc: '부탁 하나쯤은 들어주는 사이. (신뢰 20 또는 호감 20)' },
  { id: 'trusted', name: '믿는 사이', desc: '등을 맡기는 사이. 결정적인 순간에 길을 열어 준다. (신뢰 50 · 호감 20)' },
  { id: 'lifelong', name: '평생의 인연', desc: '서로의 장례식에서 말할 사람. (신뢰 75 · 호감 50)' },
];
export const TIER = { hostile: 0, cold: 1, acquaint: 2, friendly: 3, trusted: 4, lifelong: 5 };

// key: 규칙 코드가 bondPerk(state, key)로 묻는 혜택. gift: 처음 그 단계에 닿을 때 받는 열쇠 특성.
// neg: 그 단계 이하일 때 적용되는 불이익.
export const BOND_PERKS = {
  toma: [
    { tier: 3, key: 'toma_community', text: '상호회 일 수입 +12C' },
    { tier: 4, key: 'toma_winter', text: '재의 골목에 살면 겨울 추위 피해·난방비가 없다 (토마가 먼저 난로를 돌본다)' },
    { tier: 4, gift: 'kw_alley_keys', text: '골목 보일러실 열쇠꾸러미를 맡긴다' },
    { tier: 5, key: 'toma_repair', text: '수리 판정 +5%p (토마의 오래된 요령)' },
  ],
  sera: [
    { tier: 0, neg: true, key: 'sera_refuse', text: '적대: 긴급 자금을 빌려주지 않는다' },
    { tier: 3, key: 'sera_rate1', text: '긴급 자금 이율 15% → 12%' },
    { tier: 4, key: 'sera_rate2', text: '긴급 자금 60C · 이율 9%' },
    { tier: 4, gift: 'kw_rivet_contact', text: '검은 리벳의 연줄이 열린다' },
  ],
  sabine: [
    { tier: 3, key: 'sabine_strike', text: '파업 중에도 공업대 일 수입이 깎이지 않는다' },
    { tier: 4, gift: 'kw_red_band', text: '노동연맹 행렬의 붉은 완장을 건넨다' },
    { tier: 5, key: 'sabine_injury', text: '부상 피해 −20% (사빈이 가르친 몸 쓰는 법)' },
  ],
  elian: [
    { tier: 3, key: 'elian_record', text: '기록 숙련이 걸린 판정 +5%p' },
    { tier: 4, key: 'elian_duty', text: '새로 맺는 약속의 기한 +1년' },
    { tier: 5, gift: 'kw_sealed_testimony', text: '맨 아래 서랍에 당신 칸을 하나 내준다' },
  ],
  p_guardian: [
    { tier: 4, key: 'guardian_care', text: '돌봄 보조 약속의 스트레스 회복 두 배' },
    { tier: 5, key: 'guardian_gift', text: '독립하는 해에 30C를 보태 준다' },
  ],
  p_friend: [
    { tier: 3, key: 'friend_stress', text: '계절마다 스트레스 −1' },
    { tier: 4, key: 'friend_job', text: '구직 채용 판정 +10%p (친구의 소개)' },
  ],
  p_master: [{ tier: 4, key: 'master_workshop', text: '공방 개업 비용 −20C (장인이 쓰던 설비)' }],
  p_senior: [{ tier: 4, key: 'senior_ref', text: '배관공 구직 때 선배의 추천서로 자격 충족' }],
  p_clerk: [{ tier: 4, key: 'clerk_ref', text: '기록사 구직 때 사무원의 추천서로 자격 충족' }],
  p_neighbor: [{ tier: 4, key: 'neighbor_room', text: '이웃이 방을 알선해 주거비 −4C' }],
  p_rival: [{ tier: 4, key: 'rival_spur', text: '승진에 필요한 실적 −1 (경쟁심)' }],
  p_child: [{ tier: 4, key: 'child_heir', text: '제자 지도 수입 +12C' }],
};
