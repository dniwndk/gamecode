// 06.2절: 16종 자동 생활 활동(14일 단위). 생활 방침이 이 중 하나를 고르고, 결과는 타임라인에 한 줄로 남는다.
import type { ActivityDef } from '../domain/contentTypes';


export const ACTIVITIES: ActivityDef[] = [
  {
    id: 'ACT_01_OFFICE_WORK',
    name: '일반 직장·사무 근무',
    eligible: { all: [{ form: ['FORM_01_HUMAN', 'FORM_08_CENSOR', 'FORM_09_RELIC_HOST', 'FORM_04_ABYSS_ENVOY'] }, { region: ['REG_ORDINARY_CITY', 'REG_SAFE_ZONE', 'REG_FOG_PORT'] }] },
    cost: { FAT: 12 },
    reward: { KRW: 110, aptChance: [{ apt: 'PRC', p: 0.15 }] },
    tags: ['work'],
    texts: [
      '사무실과 창고를 오가며 보름 동안 성실히 일했습니다. 퇴근길 지하철 창문에 비친 얼굴은 피곤해 보이지만 이번 달 월세는 무사히 냈습니다.',
      '밀린 견적서와 납품 서류를 정리했습니다. 점심시간마다 사무실 창문 블라인드를 반쯤 내리는 것이 이 회사의 오래된 습관입니다.',
      '야근 없이 정시에 퇴근한 날이 사흘이나 됐습니다. 이 도시에서 그건 꽤 운이 좋은 보름입니다.',
    ],
  },
  {
    id: 'ACT_02_NIGHT_SHIFT',
    name: '심야 교대·야간 경비 알바',
    eligible: { form: ['FORM_01_HUMAN', 'FORM_02_NIGHT_HUNTER', 'FORM_09_RELIC_HOST', 'FORM_08_CENSOR'] },
    cost: { FAT: 16 },
    reward: { KRW: 145, aptChance: [{ apt: 'OBS', p: 0.2 }] },
    tags: ['work'],
    texts: [
      '모두가 잠든 새벽 시간에 편의점과 건물 경비실을 지켰습니다. 이상한 손님과 눈을 마주치지 않는 요령이 점점 늘어납니다.',
      '새벽 세 시, 경비실 모니터 속 복도에 아무도 없는데 센서등이 차례로 켜졌습니다. 일지에는 \'이상 없음\'이라고 적었습니다.',
      '야간 수당이 붙은 통장을 확인하고 첫차를 탔습니다. 해가 뜨는 쪽으로 앉는 자리를 골랐습니다.',
    ],
  },
  {
    id: 'ACT_03_BLOCKADE_SCAVENGE',
    name: '봉쇄구역 고물 수거·배급 노동',
    eligible: { region: 'REG_BLOCKADE_ZONE' },
    cost: { FAT: 18, HP: -4 },
    reward: { KRW: 45, SUP: 1, aptChance: [{ apt: 'OBS', p: 0.2 }] },
    tags: ['work', 'supply'],
    texts: [
      '격리벽 안쪽의 빈 공장을 뒤져 쓸 만한 부품과 비상식량을 건졌습니다. 서치라이트가 비추기 전에 숙소로 돌아왔습니다.',
      '배급 트럭 줄에 네 시간을 섰습니다. 앞사람이 받은 통조림에는 유통기한 대신 숫자 하나가 찍혀 있었습니다.',
      '구리선을 감아 팔 수 있는 만큼 모았습니다. 공장 2층 계단은 어제보다 한 칸 많았습니다.',
    ],
  },
  {
    id: 'ACT_04_AGENCY_DUTY',
    name: '특별재난청 실무·순찰 근무',
    eligible: { path: 'PATH_01_AUTHORITY', tier: 1 },
    cost: { FAT: 15 },
    reward: { mst: { MST_FIELD: 4 }, SUP: 1 },
    wage: (s) => 150 + (s.run.person.position_tier - 1) * 80,
    tags: ['work', 'train'],
    trains: 'MST_FIELD',
    texts: [
      '재난청 상황실의 특수 민원 분류와 외곽 통제선 점검을 수행했습니다. \'단순 가스 누출\'로 포장된 보고서마다 붉은 도장이 찍혀 있습니다.',
      '기동대와 함께 외곽 검문소를 돌았습니다. 반장은 출발할 때와 돌아올 때 인원수를 두 번씩 셉니다.',
      '실종 신고 서류를 지도 위에 핀으로 꽂았습니다. 핀들이 그리는 선이 이번 달 순찰 경로가 됩니다.',
    ],
  },
  {
    id: 'ACT_05_FIXER_ERRAND',
    name: '뒷골목 해결사 위험 외주',
    eligible: { any: [{ trust: 'NPC_BROKER', min: 10 }, { res: 'KRW', max: -1 }, { path: 'PATH_08_FIXER_SYNDICATE' }] },
    cost: { FAT: 22, HP: -8 },
    reward: { KRW: 260, mst: { MST_FIELD: 3, MST_RULE: 2 }, trust: { NPC_BROKER: 3 }, counters: { fixer_errands: 1 } },
    wage: (s) => (s.run.person.path_id === 'PATH_08_FIXER_SYNDICATE' ? 260 + s.run.person.position_tier * 90 : 260),
    tags: ['work'],
    texts: [
      '중개인이 넘긴 익명 의뢰를 받아 자정이 넘은 빈 상가에서 유품을 회수해 나왔습니다. 위험한 만큼 두둑한 현금 봉투를 받았습니다.',
      '실종자 가족이 맡긴 휴대폰을 폐역 사물함에서 찾아 왔습니다. 사물함 번호는 열네 개였는데 열쇠는 열다섯 개였습니다.',
      '항구 창고에서 상자 하나를 다른 창고로 옮겼습니다. 상자는 옮기는 동안 점점 가벼워졌습니다.',
    ],
  },
  {
    id: 'ACT_06_REST_HOME',
    name: '집에서 휴식 및 일상 정비',
    eligible: { form: ['FORM_01_HUMAN', 'FORM_02_NIGHT_HUNTER', 'FORM_03_BOUNDARY_WALKER', 'FORM_04_ABYSS_ENVOY', 'FORM_05_HIVE_CORE', 'FORM_07_STORY_ECHO', 'FORM_08_CENSOR', 'FORM_09_RELIC_HOST', 'FORM_10_PAPER_EFFIGY', 'FORM_06_SANCTUARY', 'FORM_11_CONCEPT'] },
    cost: { KRW: -40 },
    reward: { FAT: -35, HP: 12 },
    tags: ['rest'],
    texts: [
      '암막 커튼을 치고 며칠 동안 밀린 잠을 푹 잤습니다. 따뜻한 물로 씻고 끓여 먹은 집밥 냄새가 방 안의 한기를 밀어냅니다.',
      '휴대폰을 끄고 이불 빨래를 했습니다. 베란다에 널어 둔 이불이 해 질 무렵까지 아무 일 없이 말랐습니다.',
      '동네 목욕탕에 다녀오고 라면을 끓여 먹었습니다. 오랜만에 아무 꿈도 꾸지 않았습니다.',
    ],
  },
  {
    id: 'ACT_07_CLINIC_CARE',
    name: '동네 야간 의원 치료',
    eligible: { all: [{ res: 'KRW', min: 100 }, { res: 'HP', max: 79 }] },
    cost: { KRW: -100 },
    reward: { HP: 30, FAT: -20 },
    tags: ['rest'],
    texts: [
      '질문을 많이 하지 않는 골목 의원에서 수액과 진통제를 맞았습니다. 의사는 붕대를 감아주며 밤길에 뒤돌아보지 말라고 조언했습니다.',
      '야간 의원 대기실에는 다들 한쪽 팔이나 한쪽 눈을 가리고 앉아 있었습니다. 진료비는 현금만 받았습니다.',
      '상처를 꿰매고 나오는데 간호사가 소금 한 봉지를 쥐여 주었습니다. 처방전에는 적히지 않는 약이라고 했습니다.',
    ],
  },
  {
    id: 'ACT_08_BUY_SUPPLIES',
    name: '생존 도구·비상 물자 구입',
    eligible: { all: [{ res: 'KRW', min: 70 }, { res: 'SUP', max: 14 }] },
    cost: { KRW: -70 },
    reward: { SUP: 3 },
    tags: ['supply'],
    texts: [
      '철물점과 약국을 돌며 손전등 건전지, 굵은소금, 붉은 실, 구급약을 사서 비상 배낭에 든든하게 채워 넣었습니다.',
      '다이소 계산대 직원이 소금과 양초와 분필을 한꺼번에 사는 손님은 오늘 당신이 일곱 번째라고 했습니다.',
      '중고 장터에서 방수 손전등과 호루라기를 샀습니다. 판매자는 물건을 건네며 \'이거 진짜 쓸 일 없길\'이라고 덧붙였습니다.',
    ],
  },
  {
    id: 'ACT_09_TRAIN_SEAL',
    name: '방호 선 긋기(봉인술) 수련',
    eligible: { any: [{ mst: 'MST_SEAL', min: 1 }, { apt: 'RES', min: 4 }] },
    cost: { FAT: 16, SUP: -1 },
    reward: { mst: { MST_SEAL: 6 }, aptChance: [{ apt: 'RES', p: 0.15 }], meet: ['NPC_MENTOR'], trust: { NPC_MENTOR: 2 } },
    tags: ['train'],
    trains: 'MST_SEAL',
    texts: [
      '은퇴한 봉인 스승의 지하실에서 먹물과 말뚝으로 문턱의 틈새를 닫는 연습을 반복했습니다. 선을 따라 공기가 멈추는 감각이 잡힙니다.',
      '붉은 실로 매듭 서른 개를 묶었습니다. 스승은 그중 세 개만 남기고 전부 잘라 냈습니다.',
      '창틀에 소금 선을 긋고 밤새 지켜보았습니다. 새벽녘 선 바깥쪽 유리에 손자국 하나가 찍혀 있었습니다.',
    ],
  },
  {
    id: 'ACT_10_TRAIN_FIELD',
    name: '현장 대응 및 탈출 훈련',
    eligible: { not: { form: ['FORM_06_SANCTUARY', 'FORM_11_CONCEPT'] } },
    cost: { FAT: 18 },
    reward: { mst: { MST_FIELD: 6 }, aptChance: [{ apt: 'PRC', p: 0.15 }] },
    tags: ['train'],
    trains: 'MST_FIELD',
    texts: [
      '비상계단과 옥상 난간을 오르내리며 어둠 속에서 소리 없이 움직이고 가장 빠른 탈출로를 찾는 감각을 몸에 익혔습니다.',
      '눈을 가린 채 집 안 모든 문까지의 걸음 수를 외웠습니다. 정전이 오면 이 숫자가 길이 됩니다.',
      '지하철역마다 비상구 위치를 세어 수첩에 적었습니다. 3번 출구가 없는 역이 생각보다 많았습니다.',
    ],
  },
  {
    id: 'ACT_11_STUDY_RULES',
    name: '괴담 수칙 대조 및 문서 연구',
    eligible: { any: [{ mst: 'MST_RULE', min: 1 }, { path: 'PATH_07_RECORD_DIRECTOR' }, { bg: ['BG_10_OCCULT_CLUB', 'BG_05_CIVIL_JUNIOR', 'BG_14_OUTSIDE_READER'] }, { apt: 'OBS', min: 4 }] },
    cost: { FAT: 14, KRW: -30 },
    reward: { mst: { MST_RULE: 6 }, aptChance: [{ apt: 'OBS', p: 0.2 }] },
    tags: ['train', 'investigate'],
    trains: 'MST_RULE',
    texts: [
      '오래된 신문 기사와 대피 안내문, 계약서 사본들을 나란히 펼쳐놓고 괴이들이 절대 어기지 못하는 규칙의 빈틈을 찾아냈습니다.',
      '도서관 지역 자료실에서 30년 치 \'생활 안전 수칙\' 전단을 복사했습니다. 해마다 한 줄씩 수칙이 늘어 있었습니다.',
      '임대차 계약서 표준 양식의 특약란을 하나하나 읽었습니다. 빈칸이 많은 계약서일수록 위험하다는 것을 알았습니다.',
    ],
  },
  {
    id: 'ACT_12_WALK_BOUNDARY',
    name: '안개 항구 문턱 답사·표식 각인',
    eligible: { any: [{ apt: 'RES', min: 4 }, { mst: 'MST_BOUND', min: 10 }, { flag: 'domain_survivor' }] },
    cost: { FAT: 20, SUP: -1 },
    reward: { mst: { MST_BOUND: 6 }, beacons: 1 },
    tags: ['train', 'investigate'],
    trains: 'MST_BOUND',
    texts: [
      '안개가 짙은 새벽 부두와 끊어진 육교 주변을 돌며, 공간이 얇아지는 지점마다 위기 때 돌아올 귀환 표식을 새겨 두었습니다.',
      '항구 끝 컨테이너 사이를 걸었습니다. 같은 번호의 컨테이너를 세 번 지난 뒤에 발을 멈추고 분필로 표시를 남겼습니다.',
      '방파제 계단을 내려가 물에 닿지 않는 마지막 칸에 앉아 있었습니다. 그 칸에서만 바닷소리가 거꾸로 들렸습니다.',
    ],
  },
  {
    id: 'ACT_13_CARE_NEIGHBORS',
    name: '이웃 안부 확인 및 복도 점검',
    eligible: { not: { form: 'FORM_11_CONCEPT' } },
    cost: { FAT: 8, KRW: -20 },
    reward: { trust: { NPC_NEIGHBOR: 8 }, domain: 3, counters: { care: 1 } },
    tags: ['care'],
    texts: [
      '옆집 이웃과 비상식량을 나누고 복도 창문의 잠금장치를 함께 고쳤습니다. 위험한 밤이 오면 서로 문을 열어주기로 약속했습니다.',
      '복도 센서등 전구를 갈고, 계단참에 붙은 낯선 전단을 떼어 냈습니다. 이웃이 귤 한 봉지를 문고리에 걸어 두었습니다.',
      '경로당 어르신들과 동네 대피 수칙 전단을 접었습니다. 수칙 일곱 번째 줄은 어르신들이 손으로 직접 써넣었습니다.',
    ],
  },
  {
    id: 'ACT_14_NIGHT_HUNT',
    name: '밤거리 영역 순찰 및 사냥',
    eligible: { form: 'FORM_02_NIGHT_HUNTER' },
    cost: { FAT: 10 },
    reward: { HP: 15, mst: { MST_FIELD: 5, MST_BOUND: 3 }, counters: { night_hunts: 1 } },
    tags: ['train', 'work'],
    trains: 'MST_FIELD',
    texts: [
      '어둠이 내린 지붕 위를 달리며 골목에 스며든 하급 괴물들을 사냥했습니다. 밤의 공기가 당신의 호흡에 맞춰 고요해집니다.',
      '가로등이 꺼진 시장 골목에서 그림자 하나를 끝까지 쫓았습니다. 새벽이 오기 전에 골목은 다시 조용해졌습니다.',
      '배수로 아래 둥지를 하나 정리했습니다. 비린 피 냄새가 이제 불쾌하지 않다는 사실이 조금 무섭습니다.',
    ],
  },
  {
    id: 'ACT_15_HIVE_SYNC',
    name: '다중 신체 분산 작업',
    eligible: { form: 'FORM_05_HIVE_CORE' },
    cost: { FAT: 15 },
    reward: { KRW: 180, mst: { MST_RULE: 4, MST_BOUND: 4 } },
    tags: ['work', 'train'],
    texts: [
      '서로 다른 구역에 흩어진 신체들이 동시에 정보를 모으고 일상을 수행했습니다. 저녁이 되자 여러 갈래의 기억이 하나로 합쳐집니다.',
      '한 몸은 사무실에서, 한 몸은 항구에서, 한 몸은 침대에서 보름을 보냈습니다. 세 개의 피로가 한 번에 몰려옵니다.',
      '여러 개의 눈으로 같은 노을을 보았습니다. 각도마다 하늘의 색이 조금씩 달랐습니다.',
    ],
  },
  {
    id: 'ACT_16_RUMOR_ARCHIVE',
    name: '도시 소문 수집 및 위조문서 색출',
    eligible: { any: [{ path: 'PATH_07_RECORD_DIRECTOR' }, { path: 'PATH_10_URBAN_MYTH' }, { apt: 'OBS', min: 5 }] },
    cost: { FAT: 12 },
    reward: { mst: { MST_RULE: 5 }, KRW: 90, counters: { rumors: 1 } },
    tags: ['investigate', 'work'],
    trains: 'MST_RULE',
    texts: [
      '인터넷 게시판과 동네 전단지를 샅샅이 뒤져, 단순한 장난 글 속에 숨어 있는 진짜 괴담의 전조와 위조된 안내문을 골라냈습니다.',
      '지역 맘카페의 \'이상한 일 있었던 분\' 글타래를 정리해 지도로 만들었습니다. 점들이 한 아파트 단지를 둘러싸고 있었습니다.',
      '버스 정류장마다 붙은 공지문의 글꼴을 비교했습니다. 하나만 받침 위치가 미묘하게 어긋나 있었습니다.',
    ],
  },
];

export const actById = (id: string) => ACTIVITIES.find((a) => a.id === id);

export const FOCUS_LABEL = {
  FOCUS_LIVELIHOOD: '생계 유지',
  FOCUS_STABILITY: '회복·안정',
  FOCUS_TRAINING: '전문 수련',
  FOCUS_RELATIONSHIP: '이웃·거점 돌봄',
  FOCUS_INVESTIGATION: '단서 조사·원정',
} as const;

export const FOCUS_HINT = {
  FOCUS_LIVELIHOOD: '일해서 돈을 모은다. 빚과 월세에 강하다.',
  FOCUS_STABILITY: '쉬고 치료하고 물자를 채운다. 오래 버틴다.',
  FOCUS_TRAINING: '봉인술·현장 대응·규칙 해석·경계 감각을 기른다.',
  FOCUS_RELATIONSHIP: '이웃과 거점을 돌본다. 위기에 열리는 문이 늘어난다.',
  FOCUS_INVESTIGATION: '단서를 모으고 스스로 괴담을 찾아간다. 자발적 사건이 늘어난다.',
} as const;

export const CRISIS_LABEL = {
  CRISIS_EGRESS_FIRST: '퇴로 우선',
  CRISIS_PROTECT_ALLY: '동행자 보호 우선',
  CRISIS_PUSH_OBJECTIVE: '임무·단서 확보 우선',
} as const;

export const CRISIS_HINT = {
  CRISIS_EGRESS_FIRST: '판정이 어긋나도 피해가 줄어든다. 대신 얻는 것이 적다.',
  CRISIS_PROTECT_ALLY: '동행자와 함께일 때 판정이 오른다. 자동 결정은 사람을 먼저 구한다.',
  CRISIS_PUSH_OBJECTIVE: '판정이 조금 오르지만 실패하면 더 다친다.',
} as const;

