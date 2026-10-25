// 05.3절: 30종 핵심 능력. autoGrant가 있는 능력은 숙련·적성이 기준을 넘는 순간 저절로 깨친다.
import type { CapabilityDef } from '../domain/contentTypes';

export const CAPABILITIES: CapabilityDef[] = [
  { id: 'CAP_01_DANGER_TINNITUS', name: '위험 감지 이명', source: '과거 생환자 출생 / 관찰 5 이상', effect: '비자발적 사건에 들어서는 즉시 첫 핵심 단서 하나를 자동으로 잡는다.', limit: '물리적 피해를 대신 막아주지는 않는다.', autoGrant: { apt: 'OBS', min: 5 } },
  { id: 'CAP_02_LOCAL_SEAL', name: '문턱 방호 선 긋기', source: '봉인술 25 이상', effect: '문·창문·개찰구 같은 출입구 하나를 봉인해 하급 괴담과 포식자의 침입을 막는다.', limit: '확인되지 않은 여러 통로나 공간 전체의 전이는 막지 못한다.', autoGrant: { mst: 'MST_SEAL', min: 25 } },
  { id: 'CAP_03_RETURN_BEACON', name: '두 지점 귀환 표식', source: '경계 감각 25 이상', effect: '미리 표식을 남겨 둔 안전 거점으로 자신과 동행자 한 명을 확정 탈출시킨다.', limit: '표식을 새기지 않은 완전 미지의 구역에서는 바로 쓰지 못한다.', autoGrant: { mst: 'MST_BOUND', min: 25 } },
  { id: 'CAP_04_CLAUSE_AUDIT', name: '독소 조항 식별', source: '규칙·계약 해석 25 이상', effect: '계약서·안내방송·공문서의 함정 선택지와 위조 재난문자에 [함정/위조 감지] 배지가 붙는다.', limit: '말없이 덮치는 야생 포식 괴물에게는 쓸모가 없다.', autoGrant: { mst: 'MST_RULE', min: 25 } },
  { id: 'CAP_05_AGENCY_CLEARANCE', name: '재난청 보안 통행증', source: '재난청 외부 협력요원', effect: '공식 격리 검문소를 통과하고 재난청 기초 기록을 열람하며 고정 급여를 받는다.', limit: '기동대 호출이나 작전 지휘권은 없다.' },
  { id: 'CAP_06_NIGHT_SCENT', name: '어둠 속 감각 동조', source: '야행 포식자 형태 / 감각 변이자', effect: '야간·정전·안개 속 행동 불리함이 사라지고 숨어 있는 포식자를 역추적한다.', limit: '밝은 방호 조명 아래에서는 피로가 더 쌓인다.' },
  { id: 'CAP_07_TACTICAL_DISPATCH', name: '현장 기동대 호출', source: '재난청 현장지휘관', effect: '사건 중 기동대 한 분대를 불러 중급 포식 괴물 제압과 시민 대피를 자동으로 성공시킨다.', limit: '통신이 끊긴 지도 밖 이계에서는 부를 수 없다.' },
  { id: 'CAP_08_TRAIN_RIGHT', name: '열차 운행 통제권', source: '장례열차 기관실 장악 / 문지기', effect: '장례열차 계열 사건이 다시 오면 선택 없이 원하는 역에 세우고 전원을 내리게 한다.', limit: '열차·지하철 밖의 괴담에는 듣지 않는다.' },
  { id: 'CAP_09_HIVE_SWAP', name: '분산 신체 교대', source: '군체의 중심 형태', effect: '치명상을 입으면 여분 신체 하나를 소모하고 육체 사망 없이 그대로 이어 간다.', limit: '여분 신체가 하나뿐이면 죽는다.' },
  { id: 'CAP_10_SANCTUARY_LAW', name: '안전가옥 불침 규칙', source: '안전가옥 주인', effect: '거점 안에서 일어나는 야간 습격과 오염을 무효로 하고 동행자를 지킨다.', limit: '거점 밖 원정에서는 효과가 절반이다.' },
  { id: 'CAP_11_ENVOY_COMMAND', name: '하위 사절 명령권', source: '계약 재정관', effect: '하위 의식 집행관과 빚 추심 괴이를 한 마디로 물러나게 한다.', limit: '상위 존재나 자연 재난에는 통하지 않는다.' },
  { id: 'CAP_12_RED_LINE_PUSH', name: '침식선 후퇴 술식', source: '침식선 수호자 / 수석 봉인사', effect: '골목과 단지를 삼키는 붉은 침식선을 밖으로 밀어내 거주 구역을 되찾는다.', limit: '물자 5개 이상과 큰 피로가 든다.' },
  { id: 'CAP_13_TEMP_UNDYING', name: '시한부 불사 계약', source: '심연 대행자', effect: '계약 기간 1년 동안 육체 피해로 죽지 않는다. 이것만으로 불멸에 이르지는 않는다.', limit: '기한 안에 자기 유지 법칙을 완성하지 못하면 반동으로 죽는다.' },
  { id: 'CAP_14_SUPREME_COMMAND', name: '총감의 비상대권', source: '특별재난청 총감', effect: '전 구역의 기동대·봉쇄선·수송망을 총동원해 여러 구역의 재난을 동시에 끝낸다.', limit: '개인의 노화는 막지 못한다.' },
  { id: 'CAP_15_GRAND_SEAL', name: '대봉인사의 극의', source: '대봉인사', effect: '도시 전체를 덮는 \'열리지 않는 밤\' 등급의 재앙을 영구 봉인한다.', limit: '사전 매개체와 진식 준비가 필요하다.' },
  { id: 'CAP_16_APEX_PREDATOR', name: '군주의 영지 지배', source: '야행군주', effect: '모든 포식 괴물이 당신을 피해 달아나고 밤의 거리를 완전히 장악한다.', limit: '공식 행정 기관 안의 일에는 제약이 있다.' },
  { id: 'CAP_17_SOVEREIGN_GATE', name: '문턱의 주권', source: '문턱의 왕', effect: '세계와 이계 사이의 모든 문턱을 여닫고, 최후의 기슭 심부에서도 스스로 돌아온다.', limit: '새겨 둔 경계 축을 따라서만 작동한다.' },
  { id: 'CAP_18_SELF_ETERNITY', name: '무결한 자기 유지', source: '정점 작전의 최종 과업', effect: '외부 후원자나 타인의 희생 없이 영원히 존재를 유지하는 최종 권능.', limit: '마지막 과업과 바로 이어져 있다.' },
  { id: 'CAP_19_NAME_CONCEAL', name: '차명 호적과 그림자 명패', source: '규칙·계약 해석 35 이상 / 검열 수석', effect: '진짜 이름을 불러 저주하거나 추적하는 호명형 괴담을 무효로 한다.', limit: '이름을 부르지 않고 덮치는 괴물에게는 쓸모없다.', autoGrant: { mst: 'MST_RULE', min: 35 } },
  { id: 'CAP_20_REDACTION_PEN', name: '검열관의 검은 만년필', source: '특무 편찬관', effect: '괴담의 규칙 문서나 불리한 계약서에서 치명적 금기 조항 한 줄을 검은 줄로 그어 실제로 지운다.', limit: '문서나 언어 규칙이 아닌 순수 자연·포식 재난에는 듣지 않는다.' },
  { id: 'CAP_21_EMERGENCY_EXIT_CHALK', name: '비상구 분필', source: '경계보행자', effect: '막다른 방이나 엘리베이터 벽에 분필로 문을 그려 건물 바깥 골목으로 나간다(물자 1개).', limit: '지도 밖 심부에서는 시가지로 바로 이어지지 않는다.' },
  { id: 'CAP_22_BLACK_MARKET_VIP', name: '암시장 특급 조달망', source: '중개 거두', effect: '물자가 바닥났을 때 현장에서 돈(100만원)으로 봉인 도구와 해독제를 바로 구한다.', limit: '돈이 없거나 거래인이 없는 이계에서는 쓰지 못한다.' },
  { id: 'CAP_23_HIRED_ESCORT', name: '해결사 호위대 고용', source: '암시장 지배자', effect: '고위험 사건에 해결사 둘을 대동해 추격·교전 판정이 크게 오른다.', limit: '외우주의 시선 앞에서는 호위대가 먼저 달아날 수 있다.' },
  { id: 'CAP_24_SPORE_PURGE', name: '체내 오염 소각 호흡', source: '격리 병동 퇴원자의 각성 / 봉인술 40 이상', effect: '감염·포자·기생물에 노출되면 약간의 피로만 입고 저절로 정화한다.', limit: '이미 끝난 형태 변이를 인간으로 되돌리지는 못한다.', autoGrant: { mst: 'MST_SEAL', min: 40 } },
  { id: 'CAP_25_EFFIGY_SUBSTITUTE', name: '종이 인형 대역술', source: '기도원 전승 / 종이 대역체', effect: '즉사급 피해를 입는 순간 준비해 둔 종이 인형(물자 2개)이 대신 찢긴다.', limit: '한 번 쓰면 다시 접어 둘 때까지 연속으로 쓰지 못한다.' },
  { id: 'CAP_26_RELIC_OVERDRIVE', name: '저주 유물 해방', source: '저주받은 유품 / 유물 기생체', effect: '위기에서 유물의 봉인을 잠시 풀어 중급 괴이를 분쇄하거나 시간을 3분 되감는다.', limit: '쓸 때마다 크게 지치고 유물의 침식이 깊어진다.' },
  { id: 'CAP_27_VOICE_ANCHOR', name: '일상의 목소리 닻', source: '동행자 신뢰 50 이상', effect: '환각·최면 사건에서 녹음해 둔 이웃이나 동행자의 목소리로 곧장 제정신을 차린다.', limit: '그 사람과의 관계가 깨지면 힘을 잃는다.' },
  { id: 'CAP_28_URBAN_RUMOR_WEAVE', name: '소문 유포와 금기 조작', source: '기록말소국장 / 불멸의 금기', effect: '도시에 소문을 역으로 퍼뜨려 특정 괴이가 당신의 구역에 들어오지 못하게 새 금기를 씌운다.', limit: '소문이 퍼지는 데 14일이 걸린다.' },
  { id: 'CAP_29_MIRROR_SHATTER', name: '반사면 단절', source: '경계 감각 55 이상 / 관찰 7 이상', effect: '거울·유리창·수면·렌즈를 통해 들어오거나 내려다보는 존재의 관측 경로를 끊는다.', limit: '눈앞으로 걸어 들어오는 실체형 괴물에게는 듣지 않는다.', autoGrant: { any: [{ mst: 'MST_BOUND', min: 55 }, { apt: 'OBS', min: 7 }] } },
  { id: 'CAP_30_NINTH_RULE_DECREE', name: '아홉 번째 수칙 선포', source: '도시의 아홉 번째 괴담', effect: '당신이 곧 도시의 최상위 괴담 법칙이 되어, 마주친 괴이에게 즉결 수칙을 강제한다.', limit: '인간 사회의 평범한 신분으로는 더 이상 돌아갈 수 없다.' },
];

export const capById = (id: string) => CAPABILITIES.find((c) => c.id === id);
export const capName = (id: string) => capById(id)?.name ?? id;
