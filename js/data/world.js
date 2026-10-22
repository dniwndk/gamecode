// 세계 고정 데이터. 규칙 코드는 이 값을 읽기만 한다.

export const START_YEAR = 184;
export const START_AGE = 13;
export const SEASONS = ['봄', '여름', '가을', '겨울'];

export const ATTRS = {
  body: '신체', sense: '감각', craft: '기교', lore: '학식', speech: '화술', will: '의지',
};

export const SKILLS = {
  repair: '수리', trade: '상업', record: '기록', resonance: '공명기술', transport: '운송', medicine: '의료',
};

// 1차 빌드 구역 3곳. 나머지는 출신지·소문으로만 쓴다.
export const DISTRICTS = {
  ash: { name: '재의 골목', desc: '재활용과 저가 주거지. 공동 난로가 골목의 겨울을 버틴다.', start: { heat: 45, jobs: 55, pollution: 60, safety: 45 }, rent: -6 },
  brass: { name: '황동 공업대', desc: '대형 공장과 노동자 주택. 일감은 많지만 공기가 무겁다.', start: { heat: 65, jobs: 75, pollution: 70, safety: 55 }, rent: 0 },
  market: { name: '매듭 시장', desc: '소매점과 공방이 엉킨 거리. 엘리안의 출장 기록소가 있다.', start: { heat: 70, jobs: 60, pollution: 40, safety: 60 }, rent: 6 },
};

export const OTHER_DISTRICTS = {
  hill: '관정 언덕', garden: '유리 정원', dock: '안개 부두', bell: '흰 종 병원가',
  sanctum: '시계 성소', rail: '철륜 역세권', base: '잠긴 기초',
};

// 기본 배경 6종 (만분율 가중치). 구역 후보는 [구역, 가중치, 1차 생활 구역]
export const BACKGROUNDS = {
  factory: { name: '공장 노동자 가구', w: 3000, cash: 12, perk: '견습 추천인', household: 1,
    origins: [['brass', 70, 'brass'], ['ash', 30, 'ash']], subSkills: ['repair', 'transport'],
    strength: '기술 인맥과 견습 기회', burden: '공해 노출과 불안정한 고용' },
  workshop: { name: '소규모 공방 가구', w: 2000, cash: 25, perk: '공용 작업 도구', household: 1,
    origins: [['market', 70, 'market'], ['brass', 30, 'brass']], subSkills: ['repair', 'trade'],
    strength: '제작 경험과 단골', burden: '가족 사업의 부채' },
  admin: { name: '행정직 가구', w: 1200, cash: 45, perk: '문서 교육', household: 2,
    origins: [['hill', 60, 'market'], ['sanctum', 40, 'market']], subSkills: ['record', 'trade'],
    strength: '문서 능력과 제도 정보', burden: '높은 기대와 평판 압력' },
  transport: { name: '운송 노동자 가구', w: 1800, cash: 18, perk: '운송조합 인연', household: 1,
    origins: [['dock', 60, 'market'], ['rail', 40, 'brass']], subSkills: ['transport', 'trade'],
    strength: '이동과 외부 소식', burden: '보호자의 장기 부재' },
  migrant: { name: '이주민 공동가구', w: 1200, cash: 10, perk: '공동 돌봄', household: 0,
    origins: [['ash', 60, 'ash'], ['dock', 40, 'ash']], subSkills: ['trade', 'medicine'],
    strength: '강한 상호부조', burden: '시민 서류와 거주 불안' },
  sponsor: { name: '후원기관 양육', w: 800, cash: 8, perk: '기본 숙식과 교육', household: 0,
    origins: [['bell', 60, 'ash'], ['garden', 40, 'market']], subSkills: ['medicine', 'record'],
    strength: '교육 지원과 동료', burden: '후원 계약과 진로 제한' },
};

export const FAMILIES = {
  stable: { name: '안정된 보호', w: 50 },
  busy: { name: '바쁘지만 협력적인 보호', w: 30 },
  community: { name: '공동체 중심 양육', w: 15 },
  substitute: { name: '갈등 뒤 대체 보호', w: 5 },
};

export const APTITUDES = {
  body: { name: '튼튼한 손', attr: 'body', open: '장비 없이 가벼운 구조 보조', limit: '큰 구조 작업은 훈련 필요' },
  sense: { name: '예민한 귀', attr: 'sense', open: '배관 이상 징후 포착', limit: '소음 환경에서 휴식 필요' },
  craft: { name: '정밀한 손끝', attr: 'craft', open: '소형 수리 접근', limit: '중장비 작업에는 면허 필요' },
  lore: { name: '장부 읽는 눈', attr: 'lore', open: '계약 오류 발견', limit: '모든 거짓말을 알아내지는 못함' },
  speech: { name: '낯선 이의 친구', attr: 'speech', open: '처음 만난 인물의 소개 경로', limit: '신뢰 자체를 즉시 얻지는 못함' },
  will: { name: '꾸준한 호흡', attr: 'will', open: '압박 속 집중 훈련', limit: '공명부하를 없애지는 못함' },
};

// 공명. 1차 빌드는 4계열. 원본 가중치(12·12·10·10)를 재정규화해 쓴다.
export const ABILITIES = {
  heat: { name: '열분배', w: 12, use: '화상 예방, 난방, 열기관 수리', limit: '접촉한 두 대상 사이 이동', cost: '체온 변화와 부하', device: 'heat_pump', stat: 'heatTasks' },
  pressure: { name: '압력 청감', w: 12, use: '배관 이상과 진동 탐지', limit: '연결된 고체와 배관', cost: '청각 피로와 소음 민감', device: 'stethoscope', stat: 'pressureFinds' },
  echo: { name: '잔향 독해', w: 10, use: '사물의 최근 사용 흔적 조사', limit: '짧고 불완전한 감각 조각', cost: '두통과 잘못된 해석 위험', device: 'echo_lens', stat: 'echoReads' },
  metal: { name: '금속 친화', w: 10, use: '작은 금속 부품 정렬', limit: '합금과 질량에 제한', cost: '손 떨림과 자성 잔흔', device: 'align_frame', stat: 'metalCrafts' },
};
export const ABILITY_STAGES = ['징후', '통제', '응용', '정립'];
// 출생 공명 상태 (만분율): 비발현 8500, 일반 발현 1500. 1차 빌드는 희귀 응용·운 전용을 쓰지 않는다.
export const RESONANCE_ROLL = [['none', 8500], ['manifest', 1500]];

export const ITEMS = {
  tool_basic: { name: '기본 공구', price: 18, slot: 'tool', bonus: { repair: 5 }, desc: '수리 판정 +5%p. 초반 1년 안팎의 저축으로 마련한다.' },
  gauge_glove: { name: '압력계 장갑', price: 24, slot: 'guard', bonus: { repair: 5 }, desc: '수리 판정 +5%p. 배관 사고의 부상을 줄인다.' },
  heat_coat: { name: '열축전 외투', price: 20, slot: 'guard', desc: '겨울 추위로 인한 건강 손실을 막는다. 재충전에 해마다 2C.' },
  ledger_box: { name: '자동 장부함', price: 30, slot: 'aux', bonus: { trade: 5, record: 5 }, desc: '장부 손실 원인을 표시한다. 상업·기록 판정 +5%p.' },
  phase_pin: { name: '위상 차단핀', price: 8, slot: 'consumable', desc: '폭주 진행을 한 단계 늦춘다. 일회용.' },
  heat_pump: { name: '열이송 펌프', price: 18, slot: 'aux', device: 'heat', desc: '열분배의 대응 장치. 난방·구조 과제에 참여할 수 있다.' },
  stethoscope: { name: '배관 청진계', price: 12, slot: 'aux', device: 'pressure', desc: '압력 청감의 대응 장치. 배관 결함을 듣는다.' },
  echo_lens: { name: '잔향 렌즈', price: 24, slot: 'aux', device: 'echo', desc: '잔향 독해의 대응 장치. 필터가 닳는다.' },
  align_frame: { name: '정밀 정렬틀', price: 14, slot: 'aux', device: 'metal', desc: '금속 친화의 대응 장치. 부품 재사용 제작에 쓴다.' },
};
export const SHOP = ['tool_basic', 'gauge_glove', 'heat_coat', 'ledger_box', 'phase_pin', 'heat_pump', 'stethoscope', 'echo_lens', 'align_frame'];

// 직업 3종. 연 수입은 견습·숙련·책임자·독립 전문가.
export const JOBS = {
  plumber: { name: '배관공', attr: 'craft', skill: 'repair', district: 'brass', income: [96, 144, 180, 216],
    activity: '열 손실 발견, 주민 설비 복구', burden: '사고와 과로', hazard: 2, mentor: 'toma' },
  merchant: { name: '상인', attr: 'speech', skill: 'trade', district: 'market', income: [96, 144, 180, 216], variance: 0.3,
    activity: '물류와 가격 협상', burden: '재고 손실과 신용', hazard: 0, mentor: 'sera' },
  recorder: { name: '기록사', attr: 'lore', skill: 'record', district: 'market', income: [96, 132, 168, 200],
    activity: '시민 증명과 기록 복원', burden: '비밀 보호와 검열', hazard: 0, mentor: 'elian' },
};
export const RANKS = ['견습', '숙련', '책임자', '독립 전문가'];
// 승진 조건: [숙련, 실적, 재직 연수, 멘토 신뢰]
export const PROMOTION = [null, { skill: 2, works: 3, years: 2, trust: 0 }, { skill: 3, works: 6, years: 4, trust: 30 }, { skill: 4, works: 10, years: 7, trust: 50 }];

export const FACTIONS = {
  office: '시정청', guild: '황동 동업회', union: '적동 노동연맹', mutual: '등불 상호회', sanctum: '시계 성소', rivet: '검은 리벳',
};

export const CITY_PHASES = [
  ['calm', 40, '평온', '도시는 오랜만에 숨을 고르고 있다.'],
  ['boom', 20, '산업 호황', '공장마다 야간 교대가 늘었다. 일감도 매연도 많다.'],
  ['shortage', 15, '공급 불안', '배관 압력이 고르지 않다. 겨울을 걱정하는 목소리가 크다.'],
  ['reform', 15, '제도 개혁', '삼원 의회가 열 공급권 조례를 다시 읽고 있다.'],
  ['research', 10, '연구 열풍', '유리 학회의 새 회로 소식이 신문 1면을 덮었다.'],
];

// 핵심 인물 4명 (184년 기준 나이)
export const CORE_NPCS = {
  toma: { name: '토마 아쉬', age: 46, faction: 'mutual', district: 'ash', job: '등불 상호회 수리공', portrait: 'wrench',
    desc: '여러 집의 보일러를 함께 관리하는 비능력자 수리공. 공동체를 믿지만 외부 자본을 지나치게 거부한다.', desire: '돌봄' },
  sabine: { name: '사빈 케르', age: 34, faction: 'union', district: 'brass', job: '적동 노동연맹 조직가', portrait: 'flame',
    desc: '배관공 출신 조직가. 열분배 능력자지만 과용하면 체온이 떨어진다. 남 대신 견디는 습관이 있다.', desire: '안전' },
  sera: { name: '세라 바인', age: 36, faction: 'rivet', district: 'market', job: '검은 리벳 중개인', portrait: 'key',
    desc: '법적 신용을 잃은 사람들에게 자금과 부품을 대는 중개인. 두 번째 기회에 높은 값을 붙인다.', desire: '자유' },
  elian: { name: '엘리안 모스', age: 57, faction: 'sanctum', district: 'market', job: '시계 성소 기록관', portrait: 'clock',
    desc: '약속을 정확히 기억하는 사람. 매듭 시장 출장 기록소에서 이주민의 출생 기록을 지킨다.', desire: '인정' },
};

// 절차 생성 인물의 배역 8개
export const NPC_ROLES = {
  guardian: { label: '보호자', ageRange: [34, 48] },
  friend: { label: '친구', ageRange: [13, 14] },
  rival: { label: '경쟁자', ageRange: [13, 15] },
  neighbor: { label: '이웃', ageRange: [50, 64] },
  senior: { label: '선배', ageRange: [24, 30] },
  master: { label: '공방 장인', ageRange: [55, 66] },
  clerk: { label: '사무원', ageRange: [26, 36] },
  child: { label: '골목 아이', ageRange: [7, 9] },
};

export const NAME_POOL = {
  given: ['이세트', '로반', '미라', '케일', '하넬', '도린', '유스', '페넬', '아리스', '코르벤', '실라', '노아르', '테사', '브람', '에이나', '루크', '오델', '사리', '벤', '마일라', '케스', '닐', '로웬', '이다', '할렌', '페이', '조릭', '아멜', '티로', '네사', '카렌', '우리엘', '파벨', '리나', '헤스', '모라'],
  family: ['그레이', '로츠', '할버', '멘', '스톨', '베크', '쿠퍼', '레인', '파일', '오스', '드래그', '켈', '하운', '피츠', '로스', '바르', '니엘', '토른', '웰', '마크'],
};

export const DESIRES = ['승진', '안전', '가족 돌봄', '자유', '인정'];
export const PRINCIPLES = ['빌린 것은 반드시 갚는다', '동료를 팔지 않는다', '서류가 사람을 지킨다', '먼저 먹이고 나중에 따진다', '위험은 숫자로 말한다', '거리의 소문은 반만 믿는다'];
export const WEAKNESSES = ['자존심', '도박 빚', '과로', '의심', '조급함', '옛 상처'];

// 개인 목표 (1차 빌드 5종)
export const GOALS = {
  G01: { name: '내 창문의 불빛', kind: 'life', stages: ['주거 정보 2건 모으기', '안정 주거와 예비비 24C', '주거 5년 유지'], reward: '주거 개선, 따뜻한 창문 장면' },
  G02: { name: '빚 없이 걷기', kind: 'life', stages: ['채무 명세 확인', '원금 절반 상환', '원금·이자 0'], reward: '신용 복구와 계약 선택권' },
  G03: { name: '내 이름의 공구', kind: 'craft', stages: ['견습 수료', '숙련 3', '숙련 4와 대표 제작 3건'], reward: '개인 제작 서명과 제자 의뢰' },
  G07: { name: '우리 동네의 겨울', kind: 'community', stages: ['주민 요구 조사', '지역 난방 프로젝트', '3년 정상 운영'], reward: '주민 운영권과 지역의 등불' },
  G12: { name: '내가 고른 하루', kind: 'life', stages: ['활동 세 분야 체험', '관계 3명의 신뢰 40', '관계를 지키며 5년간 여가 확보'], reward: '생활 기록과 비경쟁적 만족 엔딩' },
};

export const LIFE_CLASSES = ['L0 보호와 지원 필요', 'L1 자립 시민', 'L2 안정된 가계', 'L3 생산 기반 보유', 'L4 자본과 사업망 보유'];
export const PUBLIC_RANKS = ['R0 새로운 시민', 'R1 믿을 만한 일손', 'R2 지역의 전문가', 'R3 지역 대표', 'R4 도시 공헌자', 'R5 제도 설계자'];

// 보조 약속
export const SUB_COMMITMENTS = {
  care: { name: '돌봄', desc: '가족과 이웃을 챙긴다. 관계와 마음이 단단해진다.' },
  study: { name: '공부', desc: '밤마다 책과 도면을 편다. 숙련이 조금 오른다.' },
  rest: { name: '휴식', desc: '아무것도 하지 않는 시간. 스트레스와 공명부하가 내려간다.' },
  network: { name: '인맥', desc: '사람을 만나고 소식을 듣는다. 신뢰와 평판, 정보를 얻는다.' },
};
