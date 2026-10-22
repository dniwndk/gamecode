// 특성 데이터. 긍정·부정 특성은 수치 효과(mods)를 갖고, 키워드 특성은 효과 없이 루트와 선택지를 여는 열쇠다.
// mods 키 (js/core/traits.js가 읽는다)
//   check: { 능력치: %p }        판정 보정            xp: { 숙련: +n }         숙련 경험이 오를 때마다 추가
//   stressGain / stressRelief / healthLoss / loadGain / trustGain / trustLoss / affGain: 배율
//   income: 일·공방 수입 배율    living: 생계비 배율   comfortAt / comfortMul: 생활 향상비 기준·배율
//   coldImmune: 겨울 추위 피해 없음   winterHealth: 겨울마다 건강 변화   debtRate: 대출 이율 가산
//   stressPenaltyAt: 판정 불이익이 붙는 스트레스   support: 인물 지원 판정 가산   ignorePenalty: 스트레스·건강 불이익 무시
//   rep: { 세력: 배율 }            seasonStress / seasonHealth: 계절마다 변화 (조건부는 core에서)

export const TRAIT_KINDS = {
  positive: { name: '긍정', short: '긍정', desc: '실제 수치 효과를 주는 성향' },
  negative: { name: '부정', short: '부정', desc: '삶을 무겁게 하는 성향. 극복할 길이 있는 것도 있다' },
  keyword: { name: '열쇠', short: '열쇠', desc: '수치 효과 없이 특정 루트와 선택지를 여는 기억과 연줄' },
};

export const TRAITS = {
  // ───────── 긍정 ─────────
  pos_dexterous: { kind: 'positive', name: '섬세한 손끝', icon: 'hand', desc: '나사 하나의 헐거움을 손끝으로 먼저 안다.',
    effects: ['기교 판정 +6%p', '수리 숙련 경험 +1'], mods: { check: { craft: 6 }, xp: { repair: 1 } } },
  pos_silver_tongue: { kind: 'positive', name: '말이 통하는 사람', icon: 'feather', desc: '처음 보는 사람도 당신 앞에서는 말을 아끼지 않는다.',
    effects: ['화술 판정 +6%p', '호감 상승 ×1.25'], mods: { check: { speech: 6 }, affGain: 1.25 } },
  pos_iron_body: { kind: 'positive', name: '무쇠 같은 몸', icon: 'shield', desc: '공업대의 매연도 첫 겨울의 한파도 잘 버틴다.',
    effects: ['건강 손실 −25%', '겨울 추위 피해 없음'], mods: { healthLoss: 0.75, coldImmune: true } },
  pos_ledger_eye: { kind: 'positive', name: '장부 읽는 눈', icon: 'eye', desc: '숫자의 줄이 어긋나면 눈이 먼저 걸린다.',
    effects: ['학식 판정 +6%p', '기록 숙련 경험 +1'], mods: { check: { lore: 6 }, xp: { record: 1 } } },
  pos_keen_ear: { kind: 'positive', name: '소리를 듣는 귀', icon: 'ear', desc: '골목의 소음 속에서도 필요한 소리만 건져 낸다.',
    effects: ['감각 판정 +6%p', '운송 숙련 경험 +1'], mods: { check: { sense: 6 }, xp: { transport: 1 } } },
  pos_calm: { kind: 'positive', name: '고요한 호흡', icon: 'wave', desc: '숨을 세 번 고르면 대부분의 일은 기다려 준다.',
    effects: ['스트레스 증가 −25%', '공명부하 증가 −20%'], mods: { stressGain: 0.75, loadGain: 0.8 } },
  pos_thrifty: { kind: 'positive', name: '검소한 살림', icon: 'coin', desc: '헌 외투를 세 번 기워 입는 것이 부끄럽지 않다.',
    effects: ['생계비 −8%', '생활 향상비 없음'], mods: { living: 0.92, comfortMul: 0 },
    how: '「헤픈 지갑」을 고쳐 잡으면 이 특성으로 바뀐다.' },
  pos_diligent: { kind: 'positive', name: '부지런한 손', icon: 'clock', desc: '교대 종보다 먼저 일어나 공구를 닦는다.',
    effects: ['일·공방 수입 +8%'], mods: { income: 1.08 },
    how: '일하는 해를 스트레스 50 아래로 8년 연속 보내면 생긴다.' },
  pos_lamp_keeper: { kind: 'positive', name: '등불지기', icon: 'lamp', desc: '골목의 난로 장부가 당신 서명으로 닫힌다.', route: 'toma',
    effects: ['상호회 일 수입 +24C', '상호회 평판 상승 ×1.5', '재의 골목 겨울 추위 피해 없음'], mods: { rep: { mutual: 1.5 } },
    how: '토마와 친분 이상에서 「토마의 숨긴 적자」를 함께 짊어지면 얻는다.' },
  pos_solidarity: { kind: 'positive', name: '연대의 기억', icon: 'band', desc: '누군가 대신 견디던 밤을 기억한다. 이번엔 당신이 교대한다.', route: 'sabine',
    effects: ['인물 지원 판정 +5%p', '노동연맹 평판 상승 ×1.5', '부상 피해 −20%'], mods: { support: 5, rep: { union: 1.5 }, injury: 0.8 },
    how: '「사빈의 체온」에서 사빈 대신 견디면 얻는다.' },
  pos_archivist: { kind: 'positive', name: '기록소의 열쇠', icon: 'quill', desc: '맨 아래 서랍의 열쇠가 당신 목에 걸려 있다.', route: 'elian',
    effects: ['기록 숙련이 걸린 판정 +8%p', '기록 숙련 경험 +1', '공개한 기록이 엔딩에서 두 배로 무겁다'], mods: { skillCheck: { record: 8 }, xp: { record: 1 } },
    how: '「엘리안의 맨 아래 서랍」에서 열쇠를 넘겨받으면 얻는다.' },
  pos_partner: { kind: 'positive', name: '믿을 만한 동업자', icon: 'people', desc: '장부 한쪽을 맡겨도 잠이 오는 사람이 있다.', route: 'friend',
    effects: ['공방·상인 수입 +12%', '상업 숙련 경험 +1'], mods: { partnerIncome: 1.12, xp: { trade: 1 } },
    how: '「돌아온 골목 끝의 친구」와 약속대로 공방을 열면 얻는다.' },
  pos_survivor: { kind: 'positive', name: '다시 일어선 사람', icon: 'heart', desc: '바닥까지 내려가 본 사람은 계단의 개수를 안다.',
    effects: ['스트레스·건강 판정 불이익 무시', '계절마다 건강 +1'], mods: { ignorePenalty: true, seasonHealth: 1 },
    how: '생활 수준 바닥에서 두 해 이상 버티고 다시 올라서면 생긴다.' },
  pos_steady_hand: { kind: 'positive', name: '단련된 공명', icon: 'wave', desc: '공명이 손을 끌고 가지 않는다. 손이 공명을 끈다.',
    effects: ['공명부하 증가 −30%', '공명 선택지 판정 +5%p'], mods: { loadGain: 0.7, resonanceCheck: 5 },
    how: '공명기술 숙련 3에 이르면 생긴다.' },

  // ───────── 부정 ─────────
  neg_anxious: { kind: 'negative', name: '잦은 불안', icon: 'pulse', desc: '아직 오지 않은 겨울을 미리 걱정한다.',
    effects: ['스트레스 증가 +35%', '스트레스 60부터 판정 −5%p'], mods: { stressGain: 1.35, stressPenaltyAt: 60 },
    cure: '휴식이나 돌봄으로 3년 연속 스트레스 40 아래를 지키면 가라앉는다.' },
  neg_frail: { kind: 'negative', name: '약한 폐', icon: 'lungs', desc: '매연이 짙은 날이면 기침이 먼저 계절을 알린다.',
    effects: ['건강 손실 +25%', '공해가 짙은 구역에 살면 겨울마다 건강 −2'], mods: { healthLoss: 1.25 },
    cure: '요양을 두 해 이상 하면 숨이 트인다.' },
  neg_spendthrift: { kind: 'negative', name: '헤픈 지갑', icon: 'coin', desc: '반짝이는 놋쇠 장식 앞에서 걸음이 멈춘다.',
    effects: ['생계비 +6%', '생활 향상비가 90C부터, 1.5배로 붙는다'], mods: { living: 1.06, comfortAt: 90, comfortMul: 1.5 },
    cure: '5년 연속 연체 없이 장부를 지키면 「검소한 살림」으로 바뀐다.' },
  neg_temper: { kind: 'negative', name: '급한 성미', icon: 'flame', desc: '말이 생각보다 반 박자 빠르다.',
    effects: ['화술 판정 −6%p', '신뢰 하락 ×1.5'], mods: { check: { speech: -6 }, trustLoss: 1.5 },
    cure: '오래전 일을 사과하고 경계를 말로 정리하는 경험이 성미를 누그러뜨린다.' },
  neg_distrust: { kind: 'negative', name: '의심 많은 눈', icon: 'eye', desc: '선물을 받으면 먼저 영수증을 찾는다.',
    effects: ['신뢰 상승 ×0.7'], mods: { trustGain: 0.7 },
    cure: '누군가와 「평생의 인연」이 되면 사라진다.' },
  neg_debt_shadow: { kind: 'negative', name: '빚의 그림자', icon: 'chain', desc: '가족 장부의 붉은 줄이 당신 이름까지 이어져 있다.',
    effects: ['대출 이율 +3%p', '빚이 있는 동안 계절마다 스트레스 +1'], mods: { debtRate: 0.03 },
    cure: '빚 없이 2년을 지내면 걷힌다.' },
  neg_scarred: { kind: 'negative', name: '증기 화상 흉터', icon: 'scar', desc: '팔뚝의 흉터는 비 오는 날마다 당긴다.',
    effects: ['신체 판정 −5%p', '기교 판정 −3%p', '겨울마다 건강 −1'], mods: { check: { body: -5, craft: -3 }, winterHealth: -1 } },
  neg_overwork: { kind: 'negative', name: '일 중독', icon: 'gear', desc: '쉬는 날에도 손이 공구함을 찾는다.',
    effects: ['스트레스 회복 −40%', '스트레스 50 이상이면 계절마다 건강 −1'], mods: { stressRelief: 0.6 },
    cure: '한 해를 통째로 요양하면 풀린다.' },
  neg_resonance_scar: { kind: 'negative', name: '공명 잔흔', icon: 'wave', desc: '한계를 넘은 밤의 떨림이 손에 남았다.',
    effects: ['공명부하 증가 +30%'], mods: { loadGain: 1.3 },
    cure: '공명이 정립 단계에 이르면 잔흔이 가라앉는다.' },
  neg_informer: { kind: 'negative', name: '밀고자의 낙인', icon: 'mask', desc: '골목은 누가 이름을 불렀는지 오래 기억한다.',
    effects: ['노동연맹·상호회 사람들의 호감 상승 ×0.5', '노동연맹·상호회 평판 상승 ×0.5'], mods: { informer: true, rep: { union: 0.5, mutual: 0.5 } },
    cure: '노동연맹이나 상호회 평판을 30까지 회복하면 낙인이 옅어진다.' },

  // ───────── 열쇠 (키워드) ─────────
  kw_siren: { kind: 'keyword', name: '공장 사이렌 아래', icon: 'bell', desc: '교대 사이렌의 길이만 듣고도 공장 사정을 안다.',
    opens: '노동연맹·공장 사건에서 현장 사람들을 움직이는 선택지, 사빈의 체온 루트' },
  kw_shop_heir: { kind: 'keyword', name: '공방집 아이', icon: 'wrench', desc: '작업대 아래에서 자란 사람은 공구 이름보다 손잡이 감촉을 먼저 안다.',
    opens: '물려받은 공구로 공방을 60C·숙련 1에 연다, 축제 인형과 공방 인수 사건의 선택지' },
  kw_paper_house: { kind: 'keyword', name: '서류의 집', icon: 'scroll', desc: '시정청 서식의 빈칸이 어디 숨어 있는지 안다.',
    opens: '감사·거주 서류 사건의 절차 선택지, 기록사 채용 자격' },
  kw_far_letters: { kind: 'keyword', name: '먼 항구의 편지', icon: 'anchor', desc: '보호자의 편지에는 늘 다른 항구의 소인이 찍혀 있었다.',
    opens: '항구 연락망 선택지, 「먼 항구의 화물」 루트' },
  kw_two_tongues: { kind: 'keyword', name: '두 개의 말', icon: 'feather', desc: '집에서 쓰는 말과 서류의 말을 둘 다 한다.',
    opens: '이주민 증언을 두 언어로 받는 선택지, 이웃의 열 사건 대화' },
  kw_ward: { kind: 'keyword', name: '후원원 동기', icon: 'people', desc: '같은 기숙사 침대에서 자란 이들이 도시 곳곳에 흩어져 있다.',
    opens: '장학 추천, 회복 사건의 동기회 선택지, 「후원원 동기회」 사건' },
  kw_guardian_back: { kind: 'keyword', name: '보호자의 등', icon: 'home', desc: '여섯 살에 보호자의 일을 거들던 손이 기억난다.',
    opens: '보호자 사건의 특별 선택지, 「보호자의 겨울」 루트' },
  kw_old_promise: { kind: 'keyword', name: '골목 끝의 약속', icon: 'star', desc: '해가 질 때까지 쏘다니던 친구와 손가락을 걸었다.',
    opens: '「돌아온 골목 끝의 친구」 루트, 축제의 밤 선택지' },
  kw_workbench: { kind: 'keyword', name: '작업대 아래의 기억', icon: 'wrench', desc: '수리공의 작업대 옆에 쭈그려 앉아 보낸 겨울이 있다.',
    opens: '난로·도면 사건의 특별 선택지, 배관 견습의 빠른 신뢰' },
  kw_machine_ear: { kind: 'keyword', name: '기계의 소리', icon: 'ear', desc: '배관이 우는 소리로 어디가 아픈지 짐작한다.',
    opens: '공명 없이 귀로 결함을 찾는 선택지 (열 기록·밸브·싼 방)' },
  kw_old_ledgers: { kind: 'keyword', name: '오래된 장부 냄새', icon: 'ledger', desc: '곰팡내 나는 장부를 펼치면 마음이 놓인다.',
    opens: '장부를 대조하는 선택지, 「토마의 숨긴 적자」와 「엘리안의 서랍」의 증명' },
  kw_market_kid: { kind: 'keyword', name: '시장통 아이', icon: 'coin', desc: '매듭 시장의 흥정 소리를 자장가로 들었다.',
    opens: '주 활동 「야시장 노점」, 흥정 선택지' },
  kw_hidden_resonance: { kind: 'keyword', name: '숨긴 감각', icon: 'wave', desc: '열두 살부터 아무에게도 말하지 않은 감각이 있다.',
    opens: '첫 공명 사건의 숙련 선택지, 검은 리벳의 비공개 의뢰' },
  kw_rivet_contact: { kind: 'keyword', name: '검은 리벳의 연줄', icon: 'key', desc: '세라 바인의 사람들이 당신 이름을 안다.',
    opens: '주 활동 「검은 리벳 심부름」, 「비공개 경매」와 「리벳의 이중 장부」 루트' },
  kw_red_band: { kind: 'keyword', name: '붉은 완장', icon: 'band', desc: '노동연맹 행렬에서 완장을 받은 적이 있다.',
    opens: '「사빈의 체온」 루트, 파업 사건의 현장 선택지' },
  kw_sealed_testimony: { kind: 'keyword', name: '봉인된 증언', icon: 'quill', desc: '기록소 서랍에 당신이 봉인한 증언이 있다.',
    opens: '「엘리안의 맨 아래 서랍」 루트' },
  kw_alley_keys: { kind: 'keyword', name: '골목의 열쇠꾸러미', icon: 'key', desc: '토마가 골목 보일러실 열쇠를 통째로 맡겼다.',
    opens: '「토마의 숨긴 적자」 루트, 지역 보일러 협동 운영의 지원' },
  kw_registered: { kind: 'keyword', name: '등록된 공명자', icon: 'scroll', desc: '시민 등록부에 공명 능력자로 이름이 올라 있다.',
    opens: '「시정청 공명 감독관」 제의' },
  kw_fire_hand: { kind: 'keyword', name: '첫불의 손', icon: 'flame', desc: '첫불 축제에서 골목에 열을 나눈 손이다.',
    opens: '첫불 축제의 점화 의식 선택지' },
  kw_rivet_partner: { kind: 'keyword', name: '리벳의 동업자', icon: 'key', desc: '세라의 이중 장부 한쪽에 당신 서명이 있다.',
    opens: '세라의 6% 동업 자금, 엔딩 「그림자 장부」' },
};

// 출생 성향: 주 자질에 이어지는 긍정 특성, 배경별 부정 특성 가중치, 배경 열쇠
export const APTITUDE_TRAIT = { craft: 'pos_dexterous', speech: 'pos_silver_tongue', body: 'pos_iron_body', lore: 'pos_ledger_eye', sense: 'pos_keen_ear', will: 'pos_calm' };
export const BIRTH_POSITIVE_EXTRA = ['pos_thrifty', 'pos_diligent'];
export const BIRTH_NEGATIVE = {
  factory: [['neg_frail', 40], ['neg_overwork', 20], ['neg_temper', 25], ['neg_anxious', 15]],
  workshop: [['neg_debt_shadow', 45], ['neg_spendthrift', 25], ['neg_temper', 15], ['neg_anxious', 15]],
  admin: [['neg_anxious', 45], ['neg_distrust', 25], ['neg_spendthrift', 30]],
  transport: [['neg_distrust', 35], ['neg_anxious', 25], ['neg_spendthrift', 25], ['neg_temper', 15]],
  migrant: [['neg_anxious', 35], ['neg_debt_shadow', 25], ['neg_frail', 25], ['neg_distrust', 15]],
  sponsor: [['neg_distrust', 45], ['neg_anxious', 35], ['neg_temper', 20]],
};
export const BACKGROUND_KEYWORD = { factory: 'kw_siren', workshop: 'kw_shop_heir', admin: 'kw_paper_house', transport: 'kw_far_letters', migrant: 'kw_two_tongues', sponsor: 'kw_ward' };

// 목표와 어울리는 특성: 단계를 넘길 때 추가 보상이 붙는다
export const GOAL_TRAITS = {
  G01: ['pos_thrifty', 'pos_diligent', 'kw_guardian_back'],
  G02: ['pos_thrifty', 'pos_ledger_eye', 'neg_debt_shadow'],
  G03: ['pos_dexterous', 'kw_workbench', 'kw_shop_heir', 'kw_machine_ear'],
  G07: ['kw_alley_keys', 'pos_lamp_keeper', 'kw_workbench', 'kw_siren'],
  G12: ['pos_calm', 'kw_old_promise', 'kw_guardian_back', 'pos_silver_tongue'],
};
