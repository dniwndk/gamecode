// 05.1~05.2절과 08절: 10대 성장 경로, 11종 존재 형태, 사후 지속 4종, 최종 종점 6종.
import type { EndpointDef, FormDef, PathDef, PostmortemDef } from '../domain/contentTypes';

const clears = (min: number) => ({ counter: 'clears', min });

export const PATHS: PathDef[] = [
  {
    id: 'PATH_01_AUTHORITY',
    apex: '특별재난청 총감',
    form: 'FORM_01_HUMAN',
    summary: '재난청의 계단을 올라 도시 전체의 기동대와 봉쇄선을 지휘한다.',
    apexPower: '도시 전체의 기동대·봉쇄선·비상열차·예산을 총괄한다. 중급 이하 포식·침식 사건은 기동대 사전 배치로 저절로 진압된다.',
    tiers: [
      { name: '일반 시민', position_id: 'POS_CITIZEN', blurb: '아무 직함도 없는 시민.' },
      { name: '외부 협력요원', position_id: 'POS_AGENCY_PARTNER', grants: ['CAP_05_AGENCY_CLEARANCE'], blurb: '재난청과 계약한 외부 인력. 통행증과 고정 급여가 나온다.' },
      { name: '현장지휘관', position_id: 'POS_FIELD_COMMANDER', req: { all: [{ mst: 'MST_FIELD', min: 35 }, clears(3)] }, grants: ['CAP_07_TACTICAL_DISPATCH'], blurb: '현장에서 기동대 한 분대를 움직인다.' },
      { name: '권역책임자', position_id: 'POS_SECTOR_CHIEF', req: { all: [{ mst: 'MST_FIELD', min: 55 }, { mst: 'MST_RULE', min: 30 }, { apt: 'NEG', min: 4 }, clears(5)] }, blurb: '한 권역의 봉쇄선과 대피 계획을 책임진다.' },
      { name: '특별재난청 총감', position_id: 'POS_DIRECTOR_GENERAL', req: { all: [{ mst: 'MST_FIELD', min: 85 }, { mst: 'MST_RULE', min: 50 }, { apt: 'NEG', min: 6 }, clears(10)] }, grants: ['CAP_14_SUPREME_COMMAND'], blurb: '도시의 모든 재난 대응을 지휘하는 자리.' },
    ],
  },
  {
    id: 'PATH_02_SEALING',
    apex: '대봉인사',
    form: 'FORM_01_HUMAN',
    summary: '먹물과 말뚝으로 문턱을 닫는 기술을 끝까지 갈고닦는다.',
    apexPower: '확인된 문턱과 침입 경로를 영구 차단하고, 열리지 않는 밤 같은 대재앙을 혼자 봉인한다.',
    tiers: [
      { name: '생환자', position_id: 'POS_SURVIVOR', blurb: '괴담에서 살아 돌아온 사람.' },
      { name: '봉인 견습', position_id: 'POS_SEAL_APPRENTICE', blurb: '은퇴한 봉인 스승의 지하실을 드나드는 제자.' },
      { name: '정식 봉인사', position_id: 'POS_SEALER', req: { all: [{ mst: 'MST_SEAL', min: 40 }, clears(2)] }, blurb: '재난청 봉인 기술 부서에 이름이 올라간 봉인사.' },
      { name: '수석 봉인사', position_id: 'POS_HEAD_SEALER', req: { all: [{ mst: 'MST_SEAL', min: 60 }, { apt: 'RES', min: 6 }, clears(4)] }, grants: ['CAP_12_RED_LINE_PUSH'], blurb: '권역 단위의 침식선을 밀어내는 술식을 맡는다.' },
      { name: '대봉인사', position_id: 'POS_GRAND_SEALER', req: { all: [{ mst: 'MST_SEAL', min: 80 }, { mst: 'MST_BOUND', min: 40 }, clears(6)] }, grants: ['CAP_15_GRAND_SEAL'], blurb: '도시 전체를 덮는 재앙을 홀로 봉인하는 자리.' },
    ],
  },
  {
    id: 'PATH_03_ABYSS',
    apex: '심연의 섭정',
    form: 'FORM_04_ABYSS_ENVOY',
    summary: '안개 너머 사절들과 계약을 맺고 그 계약의 꼭대기에 선다.',
    apexPower: '의식·계약 계열 괴이와 하위 사절에게 절대 명령권을 가진다. 후원자의 종속 조항을 끊고도 왕좌를 지킬 수 있다.',
    tiers: [
      { name: '계약 표적', position_id: 'POS_CONTRACT_TARGET', blurb: '사절들이 눈여겨보는 사람.' },
      { name: '하급 계약자', position_id: 'POS_MINOR_CONTRACTOR', blurb: '미완의 계약 조항 하나에 서명한 사람.' },
      { name: '심연 대행자', position_id: 'POS_ABYSS_AGENT', req: { all: [{ mst: 'MST_RULE', min: 30 }, { apt: 'NEG', min: 4 }, clears(2)] }, grants: ['CAP_13_TEMP_UNDYING'], effects: { form: 'FORM_04_ABYSS_ENVOY' }, blurb: '사절의 일을 대신 집행하는 몸. 늙지 않지만 계약을 어기면 흩어진다.' },
      { name: '계약 재정관', position_id: 'POS_CONTRACT_ARBITER', req: { all: [{ mst: 'MST_RULE', min: 50 }, { apt: 'NEG', min: 5 }, clears(4)] }, grants: ['CAP_11_ENVOY_COMMAND'], blurb: '계약의 해석과 집행을 판정하는 자리.' },
      { name: '심연의 섭정', position_id: 'POS_ABYSS_REGENT', req: { all: [{ mst: 'MST_RULE', min: 70 }, { apt: 'NEG', min: 6 }, clears(6)] }, blurb: '사절단의 이름으로 도시와 거래하는 섭정.' },
    ],
  },
  {
    id: 'PATH_04_NIGHT',
    apex: '야행군주',
    form: 'FORM_02_NIGHT_HUNTER',
    summary: '괴물의 감각을 삼킨 몸으로 밤의 먹이사슬을 거꾸로 오른다.',
    apexPower: '모든 야생 포식 괴물이 당신의 기척만 느끼고도 달아나거나 엎드린다.',
    tiers: [
      { name: '피식자', position_id: 'POS_PREY', blurb: '밤에 쫓기는 쪽.' },
      { name: '감각 변이자', position_id: 'POS_SENSE_MUTANT', grants: ['CAP_06_NIGHT_SCENT'], blurb: '어둠 속에서 냄새와 소리가 보이는 몸.' },
      { name: '밤의 사냥꾼', position_id: 'POS_NIGHT_HUNTER', req: { all: [{ mst: 'MST_FIELD', min: 35 }, { counter: 'night_hunts', min: 6 }] }, blurb: '골목의 하급 괴물을 사냥해 먹는다.' },
      { name: '우두머리', position_id: 'POS_PACK_LEADER', req: { all: [{ mst: 'MST_FIELD', min: 55 }, { mst: 'MST_BOUND', min: 30 }, clears(4)] }, blurb: '외곽의 포식자들이 당신의 영역을 피해 간다.' },
      { name: '야행군주', position_id: 'POS_NIGHT_LORD', req: { all: [{ mst: 'MST_FIELD', min: 75 }, clears(6)] }, grants: ['CAP_16_APEX_PREDATOR'], blurb: '밤의 거리 전체가 당신의 영지다.' },
    ],
  },
  {
    id: 'PATH_05_BOUNDARY',
    apex: '문턱의 왕',
    form: 'FORM_03_BOUNDARY_WALKER',
    summary: '사라졌다 돌아온 몸으로 세계와 이계 사이의 문을 익힌다.',
    apexPower: '공간 전이·열차·미궁의 모든 출입문을 여닫고 침입을 거부한다. 최후의 기슭에서도 스스로 돌아온다.',
    tiers: [
      { name: '실종자', position_id: 'POS_MISSING', blurb: '한 번 지도 밖으로 미끄러진 사람.' },
      { name: '귀환자', position_id: 'POS_RETURNEE', blurb: '돌아온 사람들의 모임에 이름을 올렸다.' },
      { name: '경계보행자', position_id: 'POS_BOUNDARY_WALKER', req: { all: [{ mst: 'MST_BOUND', min: 40 }, clears(2)] }, grants: ['CAP_21_EMERGENCY_EXIT_CHALK'], effects: { form: 'FORM_03_BOUNDARY_WALKER' }, blurb: '현실과 문턱 사이에 걸친 몸.' },
      { name: '문지기', position_id: 'POS_GATEKEEPER', req: { all: [{ mst: 'MST_BOUND', min: 60 }, clears(4)] }, grants: ['CAP_08_TRAIN_RIGHT'], blurb: '열차와 문의 운행권을 넘겨받은 자.' },
      { name: '문턱의 왕', position_id: 'POS_THRESHOLD_KING', req: { all: [{ mst: 'MST_BOUND', min: 80 }, { apt: 'RES', min: 7 }, clears(6)] }, grants: ['CAP_17_SOVEREIGN_GATE'], blurb: '모든 문턱이 당신의 허락을 기다린다.' },
    ],
  },
  {
    id: 'PATH_06_SANCTUARY',
    apex: '살아있는 성역',
    form: 'FORM_06_SANCTUARY',
    summary: '내 방과 복도와 동네를 괴이가 들어올 수 없는 곳으로 만든다.',
    apexPower: '거점과 거리 전체를 괴이가 침범할 수 없는 보호 구역으로 만들고 수백 명의 피난민을 받아들인다.',
    tiers: [
      { name: '거점 생존자', position_id: 'POS_HOLDOUT', blurb: '자기 방 하나를 지켜 낸 사람.' },
      { name: '장소 공명자', position_id: 'POS_PLACE_RESONANT', blurb: '복도의 기척이 몸으로 느껴지는 사람.' },
      { name: '안전가옥 주인', position_id: 'POS_SAFEHOUSE_OWNER', req: { all: [{ mst: 'MST_SEAL', min: 25 }, { trust: 'NPC_NEIGHBOR', min: 50 }] }, grants: ['CAP_10_SANCTUARY_LAW'], blurb: '동네 사람들이 위험한 밤에 찾아오는 집.' },
      { name: '침식선 수호자', position_id: 'POS_LINE_WARDEN', req: { all: [{ mst: 'MST_SEAL', min: 45 }, { mst: 'MST_BOUND', min: 30 }, clears(4)] }, grants: ['CAP_12_RED_LINE_PUSH'], blurb: '붉은 침식선을 밀어내는 사람.' },
      { name: '살아있는 성역', position_id: 'POS_LIVING_SANCTUARY', req: { all: [{ mst: 'MST_SEAL', min: 65 }, { incidentDone: 'EVT_09_RED_LINE_SURGE' }, { trust: 'NPC_NEIGHBOR', min: 70 }] }, effects: { form: 'FORM_06_SANCTUARY' }, blurb: '당신이 곧 꺼지지 않는 거점이다.' },
    ],
  },
  {
    id: 'PATH_07_RECORD_DIRECTOR',
    apex: '기록말소국장',
    form: 'FORM_08_CENSOR',
    summary: '괴담의 기록 원본을 고쳐 쓰고 지우는 기관의 꼭대기에 선다.',
    apexPower: '문서·소문·방송으로 퍼지는 규칙형 괴담의 원본을 고쳐 괴담의 존재 규칙 자체를 무력화한다.',
    tiers: [
      { name: '민원 서기', position_id: 'POS_CLERK', blurb: '서류 번호로 사건을 짐작하는 사람.' },
      { name: '기록 조사관', position_id: 'POS_RECORD_INVESTIGATOR', blurb: '재난청 기록국의 조사 인력.' },
      { name: '검열 수석', position_id: 'POS_HEAD_CENSOR', req: { all: [{ mst: 'MST_RULE', min: 40 }, clears(2)] }, grants: ['CAP_19_NAME_CONCEAL'], blurb: '무엇을 지울지 결정하는 자리.' },
      { name: '특무 편찬관', position_id: 'POS_SPECIAL_EDITOR', req: { all: [{ mst: 'MST_RULE', min: 60 }, { apt: 'OBS', min: 6 }, clears(4)] }, grants: ['CAP_20_REDACTION_PEN'], blurb: '검은 만년필을 지급받은 편찬관.' },
      { name: '기록말소국장', position_id: 'POS_ARCHIVE_DIRECTOR', req: { flag: 'archive_breach_resolved' }, grants: ['CAP_28_URBAN_RUMOR_WEAVE'], blurb: '지하 서고의 총괄 색인 대장을 쥔 사람.' },
    ],
  },
  {
    id: 'PATH_08_FIXER_SYNDICATE',
    apex: '그림자 조합주',
    form: 'FORM_01_HUMAN',
    summary: '돈과 인맥과 의뢰로 도시의 뒷골목을 손에 넣는다.',
    apexPower: '도시의 모든 비공식 해결사망과 희귀 물자·정보망을 독점한다. 돈과 인맥만으로 고위험 의식과 추적을 즉시 사들여 해결한다.',
    tiers: [
      { name: '심부름꾼', position_id: 'POS_RUNNER', blurb: '상자 안을 묻지 않는 배달꾼.' },
      { name: '뒷골목 해결사', position_id: 'POS_FIXER', blurb: '중개인의 명단에 이름이 오른 해결사.' },
      { name: '중개 거두', position_id: 'POS_BROKER_BOSS', req: { all: [{ apt: 'NEG', min: 4 }, { mst: 'MST_FIELD', min: 35 }, { res: 'KRW', min: 300 }, clears(2)] }, grants: ['CAP_22_BLACK_MARKET_VIP'], blurb: '의뢰가 당신을 거쳐 흐른다.' },
      { name: '암시장 지배자', position_id: 'POS_MARKET_LORD', req: { all: [{ apt: 'NEG', min: 5 }, { res: 'KRW', min: 500 }, clears(4)] }, grants: ['CAP_23_HIRED_ESCORT'], blurb: '항구 지하의 물건 값은 당신이 정한다.' },
      { name: '그림자 조합주', position_id: 'POS_SHADOW_SYNDICATE_HEAD', req: { flag: 'syndicate_war_won' }, blurb: '재난청 공문보다 빠르게 문을 여는 서명.' },
    ],
  },
  {
    id: 'PATH_09_HIVE_SOVEREIGN',
    apex: '만인의 군체주',
    form: 'FORM_05_HIVE_CORE',
    summary: '잿빛 균사의 신경망을 의식 아래 두고 여러 몸으로 산다.',
    apexPower: '최대 일곱 구의 몸을 도시 곳곳에서 동시에 움직이고, 한 구가 부서져도 죽지 않는다.',
    tiers: [
      { name: '감염 생존자', position_id: 'POS_INFECTED', blurb: '포자를 이겨 낸 몸.' },
      { name: '공명 매개자', position_id: 'POS_RESONANCE_MEDIUM', blurb: '균사의 속삭임을 알아듣는다.' },
      { name: '다중 의식체', position_id: 'POS_MULTI_MIND', req: { all: [{ mst: 'MST_BOUND', min: 30 }, clears(2)] }, effects: { bodies: 1 }, blurb: '네 개의 눈으로 동시에 본다.' },
      { name: '군집 지휘자', position_id: 'POS_SWARM_LEADER', req: { all: [{ mst: 'MST_RULE', min: 40 }, { mst: 'MST_BOUND', min: 45 }, clears(4)] }, effects: { bodies: 1 }, blurb: '흩어진 몸들이 하나의 계획으로 움직인다.' },
      { name: '만인의 군체주', position_id: 'POS_HIVE_SOVEREIGN', req: { all: [{ mst: 'MST_BOUND', min: 60 }, clears(6)] }, effects: { bodies: 7 }, blurb: '일곱 곳의 거리에서 동시에 눈을 뜬다.' },
    ],
  },
  {
    id: 'PATH_10_URBAN_MYTH',
    apex: '도시의 아홉 번째 괴담',
    form: 'FORM_11_CONCEPT',
    summary: '살아남은 이야기가 소문이 되고, 소문이 금기가 되어 도시의 법칙이 된다.',
    apexPower: '인간을 넘어 도시 자체가 두려워하고 지켜야 하는 살아있는 최상위 법칙이 된다.',
    tiers: [
      { name: '괴담 목격자', position_id: 'POS_WITNESS', blurb: '이상한 일을 너무 많이 본 사람.' },
      { name: '소문의 주인공', position_id: 'POS_RUMOR_SUBJECT', effects: { witness: 20 }, blurb: '게시판에 당신 이야기가 돈다.' },
      { name: '도시전설 화신', position_id: 'POS_LEGEND_AVATAR', req: { all: [{ apt: 'OBS', min: 6 }, clears(4)] }, effects: { witness: 40 }, blurb: '사람들이 당신을 \'그 사람\'이라고 부른다.' },
      { name: '불멸의 금기', position_id: 'POS_UNDYING_TABOO', req: { all: [{ mst: 'MST_RULE', min: 50 }, clears(6)] }, grants: ['CAP_28_URBAN_RUMOR_WEAVE'], effects: { form: 'FORM_07_STORY_ECHO', witness: 60 }, blurb: '이야기가 몸보다 오래 산다.' },
      { name: '도시의 아홉 번째 괴담', position_id: 'POS_NINTH_LEGEND', req: { all: [{ mst: 'MST_RULE', min: 70 }, clears(8)] }, grants: ['CAP_30_NINTH_RULE_DECREE'], effects: { form: 'FORM_11_CONCEPT', witness: 100 }, blurb: '도시의 여덟 괴담 위에 놓인 마지막 수칙.' },
    ],
  },
];

export const pathById = (id: string | null) => PATHS.find((p) => p.id === id);

export const FORMS: FormDef[] = [
  { id: 'FORM_01_HUMAN', name: '인간', entry: '기본 시작 형태', survival: '건강이 0이 되거나 수명이 다하면 육체가 죽는다.', feature: '모든 일상 직장과 공공기관에 드나들 수 있다. 늙고 병든다.' },
  { id: 'FORM_02_NIGHT_HUNTER', name: '야행 포식자', entry: '포식·감염 사건에서 야수화 변이를 받아들임', survival: '밤과 어둠 속에서 건강이 저절로 회복된다. 건강이 0이면 죽는다.', feature: '어둠 속 기습에 면역이고 포식자를 역추적한다. 낮 직장 근무는 할 수 없다.' },
  { id: 'FORM_03_BOUNDARY_WALKER', name: '경계보행자', entry: '공간 전이 사건에서 반복 생환하고 경계에 적응', survival: '현실과 문턱 사이에 걸친 몸. 낙하·밀실 고립 피해에 면역이다.', feature: '막힌 벽이나 닫힌 개찰구 너머로 짧게 건너간다.' },
  { id: 'FORM_04_ABYSS_ENVOY', name: '심연의 대행체', entry: '심연 사절과 고위 계약 체결', survival: '자연 노화에 면역. 계약을 어기면 그 자리에서 흩어진다.', feature: '하위 계약 괴이와 집행관에게 위압감을 준다.' },
  { id: 'FORM_05_HIVE_CORE', name: '군체의 중심', entry: '잿빛 균사 사건에서 군체화를 선택', survival: '여러 몸(3~7구)을 가진다. 치명상은 여분 몸 하나로 대신하고, 모든 몸을 잃을 때만 죽는다.', feature: '여러 구역의 활동과 수련을 안전하게 동시에 한다.' },
  { id: 'FORM_06_SANCTUARY', name: '살아있는 성역', entry: '거점 수호의 마지막 단계에서 거점과 융합', survival: '움직일 수 없다. 거점의 경계 내구도가 생명력이다.', feature: '성역 안의 모든 주민과 동행자를 괴이로부터 지킨다.' },
  { id: 'FORM_07_STORY_ECHO', name: '자생 괴담', entry: '목격담의 잔향으로 사후 전환 / 괴담 화신의 길', survival: '물리적 타격에 면역. 당신을 기억하는 증인과 소문이 0이 되면 소멸한다.', feature: '소문과 약속과 금기를 타고 어디에든 나타난다.' },
  { id: 'FORM_08_CENSOR', name: '창백한 기록관', entry: '기록말소국 심층 수련 / 활자 침식 적응', survival: '피 대신 검은 먹물이 흐른다. 문서·언어·호명 공격 피해가 크게 줄어든다.', feature: '괴담의 이름이나 계약 문구를 읽기만 해도 약점 조항을 찾아낸다.' },
  { id: 'FORM_09_RELIC_HOST', name: '유물 기생체', entry: '저주받은 유품이나 특급 이물과 신체 융합', survival: '심장 대신 유물이 뛴다. 최대 건강이 늘고 일격사를 해마다 한 번 막는다.', feature: '유물의 허기를 달래느라 물자를 더 쓴다.' },
  { id: 'FORM_10_PAPER_EFFIGY', name: '종이 대역체', entry: '기도원 비술 / 대리 제물 역전 의식 성공', survival: '본체는 은신처에 숨기고 종이 인형 대역이 거리를 다닌다. 대역이 찢겨도 본체는 피로만 입는다.', feature: '은신처가 발각되면 위험하다.' },
  { id: 'FORM_11_CONCEPT', name: '무형의 금기', entry: '도시의 아홉 번째 괴담에 오름', survival: '육체가 사라지고 어기면 안 되는 도시의 법칙이 된다. 물리·감염·포식 위협이 모두 무효다.', feature: '신화·초월 등급의 사건과 최종 결단에만 관여한다.' },
];

export const formById = (id: string) => FORMS.find((f) => f.id === id) ?? FORMS[0];

export const POSTMORTEMS: PostmortemDef[] = [
  { id: 'POST_01_CONTRACT', name: '미완의 계약 집행자', form: 'FORM_04_ABYSS_ENVOY', condition: '사후 조항 계약을 지닌 채 계약을 다 이행하지 못하고 육체가 죽음', after: '사후 집행체로 일어나 남은 계약 의무를 완수한다.' },
  { id: 'POST_02_BOUNDARY', name: '경계의 망자', form: 'FORM_03_BOUNDARY_WALKER', condition: '경계 감각 40 이상, 귀환 표식 둘 이상을 새긴 채 공간 전이·경계 사건에서 죽음', after: '문턱에 정박한 망자로서 다른 조난자의 귀환을 인도한다.' },
  { id: 'POST_03_TESTIMONY', name: '목격담의 잔향', form: 'FORM_07_STORY_ECHO', condition: '귀환 약속과 녹음된 목소리를 지닌 채 괴담 사건에서 죽음', after: '약속했던 이웃에게 돌아가 문을 두드리고 약속을 완수한다.' },
  { id: 'POST_04_RELIC_REVENANT', name: '태엽 심장의 복수귀', form: 'FORM_09_RELIC_HOST', condition: '저주받은 유품이나 유물 기생체 상태에서 억울한 습격으로 죽음', after: '멈춘 심장 대신 회중시계가 거꾸로 돌며 일어나, 자신을 죽인 것을 쫓는다.' },
];

export const ENDPOINTS: EndpointDef[] = [
  { id: 'death', name: '최종 사망', description: '사후 전환 없이 육체가 죽었거나, 늙어 평온하게 여생을 마쳤다.' },
  { id: 'dissolution', name: '최종 소멸', description: '사후 상태나 군체, 잔향이 유지력을 모두 잃고 흩어졌다.' },
  { id: 'ascension', name: '승천', description: '마지막 문턱을 넘어 죽음이 부를 수 없는 존재가 되었다.' },
  { id: 'immortality', name: '불멸의 완성', description: '타인의 희생 없이 스스로 영원히 유지되는 왕좌를 세웠다.' },
  { id: 'perpetual_domain', name: '영속 성역·법칙', description: '꺼지지 않는 성역이나 도시의 영구 보호 규칙으로 남았다.' },
  { id: 'eternal_binding', name: '영원한 구속', description: '죽지는 않았으나 제단이나 계약의 사슬에 영원히 묶였다.' },
];

export const endpointById = (id: string) => ENDPOINTS.find((e) => e.id === id);
