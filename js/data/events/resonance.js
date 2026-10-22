// 공명 사건 (원본 16장 씨앗 13·15·18) + 비발현자 공개 교육 안내

const FIRST_SIGN = {
  heat: '아침에 컵을 쥐었는데 차가 순식간에 식었다. 대신 손바닥이 데일 듯 뜨거웠다.',
  pressure: '잠결에 벽 속 배관이 우는 소리를 들었다. 귀가 아니라 갈비뼈로 들리는 소리였다.',
  echo: '공구 손잡이를 잡는 순간, 낯선 손이 이 공구를 놓치는 장면이 눈앞을 스쳤다.',
  metal: '서랍 속 나사들이 당신 손이 다가가자 한 방향으로 미세하게 기울었다.',
};

export default [
  {
    id: 'evt_first_sign', title: '처음 나타난 공명', category: 'resonance', tags: ['resonance'], base: 30, once: true,
    cond: { ability: true, maxAge: 19 },
    roles: { elian: 'elian', sabine: 'sabine' },
    text: s => (FIRST_SIGN[s.ch.ability?.id] || '') + ' 고유공명의 징후다. 도시 등록부에 신고하면 치료와 면허를 쓸 수 있지만 사용 기록을 남겨야 한다. 신고하지 않는 것도 범죄는 아니다. 다만 위험한 일이나 남에게 영향을 주는 공적 사용에는 제한이 붙는다.',
    choices: [
      { id: 'register', label: '공개 검사를 받고 등록한다', hint: '시정청 평판 · 안정화 치료 접근',
        ok: { text: '흰 종 병원가 검사실에서 판정서를 받았다. "{ability}, 징후 단계." 등록부에 이름이 올랐고, 서랍에는 사용 기록 수첩이 하나 생겼다.', effects: [{ t: 'register' }, { t: 'rep', f: 'office', v: 4 }, { t: 'stat', k: 'stress', v: -2 }, { t: 'skill', k: 'resonance', xp: 2 }], cause: '공명 능력을 등록했다' } },
      { id: 'practice', label: '아무도 모르게 연습한다', cost: { load: 8 }, hint: '단계 상승 · 공명부하',
        ok: { text: '창고 뒤에서 매일 조금씩 연습했다. 한 달 뒤, 원할 때 멈출 수 있게 되었다. 그게 통제의 첫걸음이라는 걸 나중에 알았다.', effects: [{ t: 'abilityStage' }, { t: 'skill', k: 'resonance', xp: 3 }, { t: 'flag', k: 'secretPractice' }, { t: 'count', k: 'abilityUses' }] } },
      { id: 'hold', label: '당분간 쓰지 않는다', hint: '의지 성장',
        ok: { text: '손을 주머니에 넣고 다녔다. 감각은 사라지지 않았지만 조용해졌다.', effects: [{ t: 'attr', k: 'will', xp: 3 }] } },
    ],
  },
  {
    id: 'evt_saved_trace', title: '사고를 막고 남은 흔적', category: 'resonance', tags: ['resonance', 'brass'], base: 9, cooldown: 7,
    cond: { minAge: 16, when: s => !!s.ch.ability || ['heat_pump', 'stethoscope', 'echo_lens', 'align_frame'].some(i => s.ch.items.includes(i)) },
    roles: { witness: 'elian' },
    text: '작업장 압력관이 터지기 직전, 당신의 {ability|이} 먼저 반응했다. 사람들은 무사히 빠져나갔다. 그런데 배관 표면에 공명 잔흔이 선명하게 남았다. 감찰관이 오면 누가 무엇을 했는지 물을 것이다.',
    choices: [
      { id: 'register', label: '사용 기록을 제출하고 공식 증언한다', hint: '시정청 평판 · 기록',
        ok: { text: '사용 기록과 현장 증언이 일치했다. 감찰 보고서에는 "적법한 긴급 사용"이라고 적혔다.', effects: [{ t: 'register' }, { t: 'rep', f: 'office', v: 5 }, { t: 'work' }, { t: 'abilityTask' }], cause: '공명 사용을 공식 기록으로 남겼다' } },
      { id: 'testify', label: '성소 기록관에게 증언만 남긴다', hint: '성소 평판 · 기록관의 신뢰',
        ok: { text: '{@witness|은} 증언을 받아 적고 봉인했다. "필요한 사람이 필요할 때 열 수 있게." 이름은 당신이 동의할 때만 공개된다.', effects: [{ t: 'rep', f: 'sanctum', v: 4 }, { t: 'rel', who: 'witness', trust: 8 }, { t: 'abilityTask' }] } },
      { id: 'private', label: '잔흔을 문지르고 조용히 넘어간다', hint: '검은 리벳 평판 · 숨은 흔적',
        ok: { text: '잔흔은 흐려졌지만 완전히 지워지지는 않았다. 세라의 사람이 다녀간 뒤로, 그 배관은 장부에서 "교체 완료"가 되었다.', effects: [{ t: 'rep', f: 'rivet', v: 4 }, { t: 'flag', k: 'hiddenTrace' }, { t: 'rel', who: 'sera', trust: 4 }, { t: 'stat', k: 'stress', v: 3 }, { t: 'abilityTask' }] } },
    ],
  },
  {
    id: 'evt_neighbor_drain', title: '이웃이 빼앗는 열', category: 'resonance', tags: ['resonance', 'ash', 'brass'], base: 9, cooldown: 6,
    cond: { home: ['ash', 'brass'], seasons: [2, 3] },
    roles: { neighbor: 'p_child' },
    text: '밤마다 방이 이상하게 차가워진다. 알고 보니 옆집 {@neighbor}의 보호자가 열분배 능력으로 자기 집 물을 데우고 있었다. 벽 하나를 사이에 둔 열이 그쪽으로 빠져나간다. 그 집에는 아픈 아이가 있다.',
    choices: [
      { id: 'talk', label: '찾아가 시간을 나누자고 제안한다', check: { attr: 'speech', diff: 6 }, failHint: '실패 시 서로 서먹해진다',
        ok: { text: '아침 한 시간, 저녁 한 시간. 열을 쓰는 시간을 벽에 적어 두었다. 겨울이 끝날 무렵 그 집 아이가 당신에게 그림을 건넸다.', effects: [{ t: 'rel', who: 'neighbor', trust: 6, aff: 8 }, { t: 'attr', k: 'speech', xp: 2 }, { t: 'contrib' }] },
        fail: { text: '"우리 애가 아프다고요." 문이 닫혔다. 방은 계속 추웠다.', effects: [{ t: 'rel', who: 'neighbor', aff: -6 }, { t: 'stat', k: 'health', v: -2 }] } },
      { id: 'report', label: '시정청에 무단 사용을 신고한다', irreversible: true, hint: '시정청 +3 · 이웃 관계 악화',
        ok: { text: '감찰관이 다녀갔다. 다음 날부터 방은 따뜻해졌고, 옆집과는 눈을 마주치지 않게 되었다.', effects: [{ t: 'rep', f: 'office', v: 3 }, { t: 'rel', who: 'neighbor', aff: -15, trust: -8 }] } },
      { id: 'improve', label: '공동 단열과 배관 개선을 제안한다', cost: { cash: 8 }, hint: '구역 열 공급 · 지역 기여',
        ok: { text: '두 집이 돈을 모아 벽에 단열재를 넣고 낡은 분기관을 바꿨다. 이제 그 집은 능력을 쓰지 않아도 물이 데워진다.', effects: [{ t: 'district', d: 'home', k: 'heat', v: 2 }, { t: 'rel', who: 'neighbor', trust: 8, aff: 8 }, { t: 'contrib' }, { t: 'goal', k: 'survey' }, { t: 'count', k: 'heatTasks', if: { abilityOrDevice: ['heat'] } }], cause: '이웃과 단열·배관을 고쳤다' } },
    ],
  },
  {
    id: 'evt_device_intro', title: '공명 공개 교육 안내', category: 'resonance', tags: ['resonance'], base: 14, once: true,
    cond: { ability: false, minAge: 18, maxAge: 26 },
    roles: {},
    text: '야간학교 게시판에 유리 학회의 공개 교육 안내가 붙었다. "능력이 없어도 대응 장치로 같은 일을 할 수 있습니다." 장치는 공공 대여가 되고, 입문 강좌는 무료다. 강의실 맨 뒷줄은 늘 비발현자들로 찬다.',
    choices: [
      { id: 'rent', label: '대여 프로그램으로 장치를 받는다', cost: { cash: 6 }, hint: '직업에 맞는 대응 장치',
        ok: { text: '보증금 6크라운을 내고 장치를 받았다. 손에 익는 데 한 계절이 걸렸다.', effects: [{ t: 'item', id: 'stethoscope', if: { when: s => !s.ch.job || s.ch.job.id === 'plumber' } }, { t: 'item', id: 'echo_lens', if: { job: ['recorder'] } }, { t: 'item', id: 'align_frame', if: { job: ['merchant'] } }, { t: 'skill', k: 'resonance', xp: 2 }] } },
      { id: 'lecture', label: '입문 강좌만 듣는다',
        ok: { text: '공명은 마법이 아니라 매질이라는 것, 비용 없는 능력은 없다는 것. 노트 한 권이 채워졌다.', effects: [{ t: 'skill', k: 'resonance', xp: 2 }, { t: 'attr', k: 'lore', xp: 2 }] } },
      { id: 'skip', label: '지금은 관심 없다',
        ok: { text: '안내문은 다음 주에 다른 공고로 덮였다.', effects: [] } },
    ],
  },
];
