'use strict';
// ───────── 계약과 태그 시너지 (설계: game-design.md 8장, 계약 시트 contract-seed.json) ─────────
// 계약 = 행위 계약(행동 하나에 붙어 그 행동을 강화) + 존재 계약(패시브처럼 전체).
// 시너지는 태그 수(2/3/4)로 켜져요. 같은 계약을 두 행동에 맺어도 태그는 1개로 세요.

const ACTS = [
  { k: 'atk', name: '평타', key: '좌클릭 / J' },
  { k: 'magic', name: '마법', key: 'Q' },
  { k: 'guard', name: '방어', key: '우클릭 / K' },
  { k: 'dash', name: '대시', key: 'Space' },
  { k: 'ult', name: '궁극기', key: 'R' },
];
const ACT = Object.fromEntries(ACTS.map(a => [a.k, a]));
const POW = 30;      // "위력 N%"에 기준이 없는 계약이 쓰는 기준 위력
const ATK_POW = 16;  // "평타 위력" 기준 (1~2타 평균)
const LV3 = [0, 0.3, 0.6, 1];

// 태그 11종 (시트의 tags). t = [2개, 3개, 4개] 효과
const TAGS = [
  { name: '원소', hue: 22, t: ['상태 이상 지속 시간 +30%', '반응: 화상 중 빙결 = 폭발, 화상+감전 = 화상 피해 +50%, 둔화·빙결+감전 = 번개 1명 더', '속성 전환 비율 +20%p, 반응 위력 +50%'] },
  { name: '검기', hue: 205, t: ['검기 크기 +20%', '검기 위력 +30%', '1타·2타도 약한 검기를 날림 (위력 30%)'] },
  { name: '응수', hue: 48, t: ['방어 판정 +0.03초', '반격 위력 +40%', '방어 성공 시 주변 적에게 충격파 (포이즈 피해, 경직)'] },
  { name: '붕괴', hue: 282, t: ['포이즈 피해 +20%', '방어 경직 시간 +30%', '경직된 적에게 피해 +25%'] },
  { name: '처형', hue: 355, t: ['체력 30% 이하 적에게 피해 +15%', '체력 10% 이하 일반 적은 즉사 (끊어내기가 있으면 기준 +5%p)', '처치하면 3초 동안 치명 확률 +10%'] },
  { name: '질풍', hue: 150, t: ['대시 쿨다운 -15%', '대시로 지나간 적에게 피해', '처치하면 대시 즉시 충전'] },
  { name: '철벽', hue: 228, t: ['받는 피해 -6%', '층 시작 시 보호막 15', '층마다 한 번, 체력 30% 아래로 떨어지면 2초 무적과 체력 15 회복'] },
  { name: '천운', hue: 88, t: ['파편 획득 +15%', '계약 화면 무료 리롤 +1', '계약 화면이 25% 확률로 카드 4장'] },
  { name: '권속', hue: 318, t: ['소환물 지속 시간 +30%', '소환물 수 +1', '소환물이 사라질 때 작게 터짐 (위력 30%)'] },
  { name: '대가', hue: 255, t: ['대가 계약의 불이익 -25%', '체력 50% 아래일 때 모든 피해 +20%', '대가 계약 1개마다 모든 피해 +8%'] },
  { name: '의식', hue: 180, t: ['과제 진행 속도 +25%', '과제를 완수하면 파편 +60', '과제 보상이 2장'] },
];
const TAG = Object.fromEntries(TAGS.map(t => [t.name, t]));
const tagCol = n => `hsl(${TAG[n].hue} 80% 68%)`;

// 계약 목록. n = 시트 번호(ct-0NN). act: 붙는 행동 / 'pick' = 맺을 때 고름 / 없으면 존재 계약.
// d(l) = 단계 l의 설명. lines = 행동을 고르는 계약의 행동별 효과 줄.
const pct = (arr, l) => arr[l - 1];
const CONTRACTS = [
  { n: 1, id: 'flame', name: '불길', act: 'pick', on: ['atk', 'magic', 'guard', 'dash', 'ult'], grade: 'gold', tags: ['원소'], max: 3, d: l => `붙인 행동 공격의 ${pct([30, 60, 100], l)}%가 화염으로 바뀌고 화상 (최대 5중첩)`,
    lines: { atk: '맞힌 적이 화상을 입어요', magic: '마법을 쓴 자리에 2초 동안 불 고리가 남아요', guard: '방어에 성공하면 공격자 앞에서 불이 터져요', dash: '지나간 길에 불길이 1.5초 남아요', ult: '궁극기에 맞은 적이 화상 3중첩' } },
  { n: 2, id: 'frost', name: '서리', act: 'pick', on: ['atk', 'magic', 'guard', 'dash', 'ult'], grade: 'gold', tags: ['원소', '철벽'], max: 3, d: l => `붙인 행동 공격의 ${pct([30, 60, 100], l)}%가 냉기, 둔화 5중첩이면 빙결 (빙결 후 2초 면역, 보스는 피해 +30%)`,
    lines: { atk: '맞힌 적에게 둔화가 쌓여요', magic: '마법을 쓴 자리에 서리 고리가 남아 느려지게 해요', guard: '방어에 성공하면 공격자에게 둔화 3중첩', dash: '지나간 길에 얼음판이 2초 남아요', ult: '궁극기에 맞은 적에게 둔화 3중첩' } },
  { n: 3, id: 'thunder', name: '우레', act: 'pick', on: ['atk', 'magic', 'guard', 'dash', 'ult'], grade: 'gold', tags: ['원소', '질풍'], max: 3, d: l => `붙인 행동 공격의 ${pct([30, 60, 100], l)}%가 번개, 가까운 적 ${l}명에게 튐 (같은 적에게 다시 안 튐)`,
    lines: { atk: '맞힌 적에게서 번개가 튀어요', magic: '마법을 쓰면 주변 적이 감전돼요', guard: '방어에 성공하면 공격자에게 전류가 흘러 짧게 경직', dash: '지나간 길의 적이 감전돼요', ult: '궁극기에 맞은 적이 감전되고 번개가 튀어요' } },
  { n: 4, id: 'pierce', name: '꿰뚫기', act: 'atk', grade: 'gold', tags: ['검기', '질풍'], max: 3, d: l => `3타·반격이 적을 뚫는 검기를 날림 (위력 ${pct([50, 80, 110], l)}%). 내 투사체가 적을 뚫고 지나감` },
  { n: 5, id: 'fork', name: '갈래', act: 'atk', grade: 'prism', tags: ['검기'], max: 3, d: l => `3타·반격이 양옆으로 검기 ${l}갈래씩 더 냄 (위력 40%, 갈라진 것은 다시 안 갈라짐)` },
  { n: 6, id: 'finisher', name: '마무리 장인', act: 'atk', grade: 'gold', tags: ['검기', '붕괴'], d: () => '3타 피해 +60%, 3타 포이즈 피해 2배' },
  { n: 7, id: 'echo', name: '메아리', grade: 'prism', tags: ['검기', '천운'], max: 3, d: l => `모든 타격이 ${pct([25, 40, 55], l)}% 확률로 0.2초 뒤 한 번 더 (위력 50%, 메아리는 다시 메아리 안 됨)` },
  { n: 8, id: 'cut', name: '끊어내기', grade: 'prism', tags: ['처형'], max: 3, d: l => `체력 ${pct([15, 20, 25], l)}% 이하 적을 때리면 즉사 (보스는 최대 체력 5%, 3초에 한 번)` },
  { n: 9, id: 'brand', name: '낙인', grade: 'gold', tags: ['처형', '원소'], max: 3, d: l => `타격이 낙인을 쌓고 3중첩이면 터짐 (위력 ${pct([60, 90, 120], l)}%, 터진 낙인은 낙인을 안 쌓음)` },
  { n: 10, id: 'overcharge', name: '덧충전', act: 'pick', on: ['dash', 'magic'], grade: 'prism', tags: ['질풍'], d: () => '붙인 행동이 2회 충전, 적을 처치하면 1회 충전',
    lines: { dash: '대시를 2번까지 모아 써요', magic: '마법을 2번까지 모아 써요' } },
  { n: 11, id: 'cycle', name: '잿불 순환', act: 'ult', grade: 'gold', tags: ['원소'], d: () => '궁극기를 쓴 뒤 5초 동안 피해 +30%' },
  { n: 12, id: 'catch', name: '칼날 받이', act: 'guard', grade: 'silver', tags: ['응수', '철벽'], d: () => '방어 판정 +0.06초' },
  { n: 13, id: 'topple', name: '흔들기', act: 'guard', grade: 'silver', tags: ['붕괴'], d: () => '방어 경직 시간 +50%, 포이즈 피해 +30%' },
  { n: 14, id: 'chainparry', name: '연속 응수', act: 'guard', grade: 'gold', tags: ['응수'], d: () => '4초 안에 방어를 이어 성공할 때마다 반격 위력 +30% (최대 3중첩)' },
  { n: 15, id: 'repay', name: '되갚음', act: 'guard', grade: 'gold', tags: ['응수', '붕괴'], d: () => '반격이 튕겨 낸 공격 위력의 150%를 추가 피해로 줌' },
  { n: 16, id: 'redsteel', name: '붉은 쇠', act: 'guard', grade: 'prism', tags: ['응수', '철벽'], d: () => '붉은 공격도 방어 가능, 대신 방어 판정 -0.04초' },
  { n: 17, id: 'gale', name: '질풍 발', act: 'dash', grade: 'silver', tags: ['질풍'], d: () => '대시 후 1초 동안 이동 +30%, 대시 공격 피해 +50%' },
  { n: 18, id: 'groggyhunt', name: '빈틈 사냥', grade: 'prism', tags: ['붕괴', '처형'], d: () => '경직·빙결된 적에게 피해 +40%' },
  { n: 19, id: 'fate', name: '운명 저울', grade: 'gold', tags: ['천운', '처형'], d: () => '치명 확률 +15%, 치명 피해 +50%' },
  { n: 20, id: 'thirst', name: '피의 갈증', grade: 'silver', tags: ['철벽', '질풍'], d: () => '적을 처치하면 체력 2 회복' },
  { n: 21, id: 'plate', name: '철갑', grade: 'silver', tags: ['철벽'], d: () => '받는 피해 -12%' },
  { n: 22, id: 'regular', name: '단골 손님', grade: 'silver', tags: ['천운'], d: () => '상점 가격 -20%, 상점마다 새로고침 무료 1회' },
  { n: 23, id: 'star', name: '별의 문장', grade: 'silver', tags: ['천운'], d: () => '다음 계약 선택 카드 1장이 한 등급 위로 나옴' },
  { n: 24, id: 'moon', name: '달의 예언', grade: 'gold', tags: ['천운'], d: () => '다음 계약 선택 카드 3장이 모두 한 등급 위로 나옴' },
  { n: 25, id: 'saga', name: '불타는 서사', grade: 'prism', tags: ['천운'], d: () => '다음 계층보스 프리즘 계약 화면이 4장, 그 전까지 받는 피해 +10%' },
  // 26 수집가, 27 확장 가방: 아이템·각인 방식이 정해지지 않아 프로토타입에서는 뺐어요.
  { n: 28, id: 'fourth', name: '넷째 박자', act: 'atk', grade: 'silver', tags: ['검기'], d: () => '평타가 4번째로 맞을 때마다 추가 피해 60%, 적 경직 0.3초' },
  { n: 29, id: 'shadowhand', name: '그림자 손', act: 'atk', grade: 'gold', tags: ['검기', '권속'], d: () => '평타를 휘두를 때마다 그림자 손이 같은 방향을 한 번 더 할퀴어요 (위력 40%)' },
  { n: 30, id: 'thirdcurse', name: '세 번째 저주', act: 'atk', grade: 'silver', tags: ['처형'], d: () => '3타에 맞은 적에게 저주 표식. 표식 있는 적이 다음에 받는 공격 +50%' },
  { n: 31, id: 'spellnail', name: '주문 깃든 손톱', act: 'atk', grade: 'gold', tags: ['원소'], d: () => '3타가 마법의 효과를 30% 크기로 맞은 자리에 한 번 더 남겨요' },
  { n: 32, id: 'sparkjump', name: '튀는 불씨', act: 'atk', grade: 'silver', tags: ['원소'], d: () => '평타 적중 시 20% 확률로 가까운 적 2명에게 번개가 튀어요' },
  { n: 33, id: 'heatup', name: '달아오름', act: 'atk', grade: 'silver', tags: ['질풍'], d: () => '평타를 이어 칠수록 공격 속도 최대 +30%. 대시·방어로 끊어도 유지, 2초 동안 안 치면 사라져요' },
  { n: 34, id: 'seal', name: '마법 봉인', act: 'atk', grade: 'prism', tags: ['검기', '대가'], d: () => '마법 재사용 시간 2배. 대신 평타 피해 +40%, 평타 속도 +15%, 3타 범위 +30%' },
  { n: 35, id: 'reecho', name: '되울림 주문', act: 'magic', grade: 'prism', tags: ['원소'], d: () => '마법이 0.4초 뒤 같은 자리에서 위력 60%로 한 번 더 나가요 (되울림은 다시 되울리지 않음)' },
  { n: 36, id: 'homing', name: '추적 부적', act: 'magic', grade: 'gold', tags: ['원소', '권속'], d: () => '마법이 적을 맞히면 유도 부적 3발이 날아가요 (각 35%)' },
  { n: 37, id: 'frog', name: '개구리 저주', act: 'magic', grade: 'prism', tags: ['붕괴'], d: () => '마법에 맞은 일반·정예 적이 1.5초 개구리로 변해요 (공격 못 함, 받는 피해 +20%). 보스는 0.3초 경직' },
  { n: 38, id: 'bees', name: '벌 떼 부르기', act: 'magic', grade: 'gold', tags: ['권속'], d: () => '마법을 쓰면 벌 3마리가 4초 동안 가까운 적을 쏘아요 (1초마다 평타 위력 25%)' },
  { n: 39, id: 'burnmana', name: '타오르는 마력', act: 'magic', grade: 'gold', tags: ['원소'], d: () => '화상 피해를 줄 때마다 마법 재사용 시간 -0.2초' },
  { n: 40, id: 'jewel', name: '보석 지팡이', act: 'magic', grade: 'gold', tags: ['천운'], d: () => '마법도 치명타가 나고, 마법 치명 피해 +30%' },
  { n: 41, id: 'quickspell', name: '속주문', act: 'magic', grade: 'silver', tags: ['질풍'], d: () => '마법 재사용 시간 -25%' },
  { n: 42, id: 'soulbottle', name: '영혼 병', act: 'magic', grade: 'gold', tags: ['처형'], d: () => '마법으로 적을 처치할 때마다 이번 런 동안 마법 피해 +1%. 상한 없음' },
  { n: 43, id: 'barrier', name: '단단한 결계', act: 'guard', grade: 'silver', tags: ['철벽'], d: () => '방어에 성공하면 보호막 8 (3초)' },
  { n: 44, id: 'bloodmirror', name: '피 거울', act: 'guard', grade: 'gold', tags: ['철벽', '응수'], d: () => '방어에 성공하면 튕긴 공격 위력의 30%만큼 체력 회복' },
  { n: 45, id: 'mirror', name: '거울 결계', act: 'guard', grade: 'gold', tags: ['응수'], d: () => '방어로 튕긴 투사체가 2갈래로 갈라지고, 근접 공격을 막으면 공격자에게 칼바람이 날아가요 (위력 50%)' },
  { n: 46, id: 'shadowhide', name: '그림자 숨기', act: 'guard', grade: 'gold', tags: ['응수', '질풍'], d: () => '퍼펙트 방어에 성공하면 1초 무적, 이동 속도 +30%' },
  { n: 47, id: 'danger', name: '위험한 결계', act: 'guard', grade: 'prism', tags: ['응수', '대가'], d: () => '방어 판정이 4프레임 줄어요. 대신 방어 뒤 반격 위력 +150%' },
  { n: 48, id: 'revenge', name: '되갚는 저주', act: 'guard', grade: 'silver', tags: ['응수'], d: () => '방어에 실패해 맞으면 2초 동안 다음 공격 +60%' },
  { n: 49, id: 'goldcatch', name: '금빛 낚아채기', act: 'guard', grade: 'gold', tags: ['응수', '붕괴'], d: () => '금색(강공격)을 막으면 적 경직 +0.6초, 경직 동안 그 적에게 주는 피해 +30%' },
  { n: 50, id: 'emberstep', name: '불씨 발자국', act: 'dash', grade: 'gold', tags: ['원소'], d: () => '대시로 지나간 길에 룬이 남아 1초 뒤 터져요 (위력 50%)' },
  { n: 51, id: 'broomdance', name: '칼춤 빗자루', act: 'dash', grade: 'prism', tags: ['질풍', '검기'], d: () => '대시가 가까운 적 3명 사이를 차례로 순간이동하며 베요 (무적 유지, 각 60%)' },
  { n: 52, id: 'lightflight', name: '가벼운 비행', act: 'dash', grade: 'gold', tags: ['질풍'], d: () => '대시 충전 +1' },
  { n: 53, id: 'speedcurse', name: '속도의 저주', act: 'dash', grade: 'silver', tags: ['질풍'], d: () => '대시 뒤 1초 동안 이동 +30%, 그동안 첫 공격 +40%' },
  { n: 54, id: 'illusion', name: '허상', act: 'dash', grade: 'gold', tags: ['권속'], d: () => '대시를 시작한 자리에 환영이 남아 1.5초 동안 적을 끌고, 사라질 때 터져요 (위력 40%)' },
  { n: 55, id: 'escape', name: '빗자루 도주', act: 'dash', grade: 'silver', tags: ['철벽'], d: () => '체력이 30% 아래로 떨어지면 대시가 바로 충전되고 보호막 15. 층마다 한 번' },
  { n: 56, id: 'doublecast', name: '두 번 외는 주문', act: 'ult', grade: 'prism', tags: ['천운'], d: () => '궁극기를 쓴 뒤 5초 안에 한 번 더 쓸 수 있어요 (두 번째는 위력 50%)' },
  { n: 57, id: 'unbroken', name: '꺾이지 않는 의식', act: 'ult', grade: 'silver', tags: ['철벽'], d: () => '궁극기를 쓰는 동안 어떤 공격에도 끊기지 않고 (붉은색 포함) 받는 피해 -30%' },
  { n: 58, id: 'fullmoon', name: '만월', act: 'ult', grade: 'gold', tags: ['처형'], d: () => '궁극기 효과 중 적을 처치하면 효과 시간 +1초 (최대 +5초)' },
  { n: 59, id: 'frozenspell', name: '얼어붙은 주문', act: 'ult', grade: 'gold', tags: ['원소'], d: () => '궁극기에 맞은 적이 1.5초 빙결 (보스는 0.5초 경직)' },
  { n: 60, id: 'overflow', name: '넘치는 마력', act: 'ult', grade: 'gold', tags: ['질풍'], d: () => '궁극기를 쓰면 마법과 대시가 바로 충전돼요' },
  { n: 61, id: 'forsake', name: '의식 포기', act: 'ult', grade: 'prism', tags: ['대가'], d: () => '궁극기를 쓸 수 없어요. 대신 모든 피해 +25%, 마법 재사용 -30%' },
  { n: 62, id: 'giant', name: '거인화', grade: 'prism', tags: ['철벽'], d: () => '몸집 +30%, 최대 체력 +35%, 피해 +15%. 대신 대시 거리 -15%' },
  { n: 63, id: 'small', name: '작은 마녀', grade: 'gold', tags: ['처형'], d: () => '몸이 작아지고 이동 +10%. 정예·보스에게 주는 피해 +20%' },
  { n: 64, id: 'potion', name: '불안정한 약', grade: 'gold', tags: ['천운'], d: () => '층을 시작할 때마다 무작위로 거대 (체력 +30%) 또는 소형 (이동·공격 속도 +15%)' },
  { n: 65, id: 'glasssoul', name: '유리 영혼', grade: 'prism', tags: ['대가'], d: () => '최대 체력이 60%로 줄고, 모든 피해 +40%' },
  { n: 66, id: 'secondwind', name: '두 번째 숨', grade: 'prism', tags: ['철벽'], d: () => '런에서 한 번, 죽으면 체력 40%로 일어나요. 쓰면 이 계약은 사라져요' },
  { n: 67, id: 'iou', name: '악마의 차용증', grade: 'gold', tags: ['대가'], d: () => '맺는 즉시 계약 1장을 더 골라요. 대신 다음 3층 동안 받는 피해 +25%' },
  { n: 68, id: 'pandora', name: '판도라의 솥', grade: 'prism', tags: ['천운'], d: () => '맺는 순간 무작위 계약 3개를 얻어요 (같은 등급, 고를 수 없음)' },
  { n: 69, id: 'transmute', name: '변성', grade: 'gold', tags: ['천운'], d: () => '맺으면 사라지고, 한 등급 위 무작위 계약 2개로 바뀌어요' },
  { n: 70, id: 'bloodring', name: '피의 고리', grade: 'gold', tags: ['철벽'], d: () => '체력을 회복할 때마다 회복량만큼 가까운 적에게 피해' },
  { n: 71, id: 'bomb', name: '봉인된 폭탄', grade: 'silver', tags: ['붕괴'], d: () => '층 시작 3초 뒤 내 주변에 큰 폭발 (위력 200%, 적 경직)' },
  { n: 72, id: 'quest', name: '의식 과제', grade: 'gold', tags: ['의식'], d: () => '맺을 때 과제 하나가 정해져요 (방어 30번 / 무피격으로 층 3번 / 대시 공격으로 20명 처치). 완수하면 프리즘 계약 1장' },
  { n: 73, id: 'crescendo', name: '고조', grade: 'gold', tags: ['처형'], d: () => '전투가 시작되고 15초 뒤부터 모든 피해 +40%' },
  { n: 74, id: 'calm', name: '고요한 결계', grade: 'silver', tags: ['철벽'], d: () => '4초 동안 안 맞으면 최대 체력 10%짜리 보호막' },
  { n: 75, id: 'interest', name: '마녀의 이자', grade: 'silver', tags: ['천운'], d: () => '층을 시작할 때마다 가진 파편의 10%를 더 받아요 (한 번에 최대 20)' },
  { n: 76, id: 'swell', name: '부풀어 오르는 몸', grade: 'gold', tags: ['철벽'], d: () => '층을 깰 때마다 최대 체력 +3, 상한 없음' },
  { n: 77, id: 'crow', name: '사역마 까마귀', grade: 'gold', tags: ['권속'], d: () => '까마귀가 따라다니며 내가 마지막으로 때린 적을 1초마다 쪼아요 (평타 위력 40%)' },
];
for (const c of CONTRACTS) { c.max = c.max || 1; c.kind = c.act ? 'act' : 'exist'; }
const CT = Object.fromEntries(CONTRACTS.map(c => [c.id, c]));
const QUESTS = { guard: { name: '방어 30번 성공', goal: 30 }, nohit: { name: '무피격으로 층 3번 클리어', goal: 3 }, dashkill: { name: '대시 공격으로 20명 처치', goal: 20 } };

// ───────── 보유 계약 조회 ─────────
function C(id) { let l = 0; for (const c of Run.cts) if (c.id === id) l = Math.max(l, c.lv); return l; }            // 가진 단계 (어느 행동이든)
function CA(id, act) { for (const c of Run.cts) if (c.id === id && c.act === act) return c.lv; return 0; }            // 그 행동에 붙인 단계
function tagN(t) { return (Run.tagN && Run.tagN[t]) || 0; }
function countTags() { const n = {}; const seen = new Set(); for (const c of Run.cts) { if (seen.has(c.id)) continue; seen.add(c.id); for (const t of CT[c.id].tags) n[t] = (n[t] || 0) + 1; } return n; }
function debtK() { return tagN('대가') >= 2 ? 0.75 : 1; }            // 대가 2개: 불이익 -25%
function sumN(base) { return base + (tagN('권속') >= 3 ? 1 : 0); }   // 권속 3개: 소환물 수 +1
function sumDur(t) { return t * (tagN('권속') >= 2 ? 1.3 : 1); }     // 권속 2개: 지속 +30%
function ctOf(act) { return Run.cts.filter(c => (c.act || null) === act); }
function actLabel(c) { return c.act ? ACT[c.act].name : '존재'; }

// 능력치에 반영 (recalc에서 호출)
function ctPassive(s) {
  const dk = debtK();
  if (C('catch')) { s.parryWin += 0.06; s.parryWinBase += 0.06; }
  if (C('redsteel')) { s.parryWin -= 0.04; s.parryWinBase -= 0.04; }
  if (C('danger')) { s.parryWin -= 0.067 * dk; s.parryWinBase -= 0.067 * dk; }
  if (tagN('응수') >= 2) { s.parryWin += 0.03; s.parryWinBase += 0.03; }
  if (C('topple')) { s.staggerMul += 0.5; s.poise += 0.3; }
  if (tagN('붕괴') >= 2) s.poise += 0.2;
  if (tagN('붕괴') >= 3) s.staggerMul += 0.3;
  if (C('plate')) s.dmgTaken *= 0.88;
  if (tagN('철벽') >= 2) s.dmgTaken *= 0.94;
  if (Run.sagaOn) s.dmgTaken *= 1.1;
  if (Run.iouFloors > 0) s.dmgTaken *= 1 + 0.25 * dk;
  if (C('fate')) { s.crit += 0.15; s.critDmg += 0.5; }
  if (tagN('천운') >= 2) s.shardMul += 0.15;
  if (tagN('질풍') >= 2) s.dashCd *= 0.85;
  s.dashMax = 1 + (CA('overcharge', 'dash') ? 1 : 0) + (C('lightflight') ? 1 : 0);
  s.spinMax = 1 + (CA('overcharge', 'magic') ? 1 : 0);
  if (C('quickspell')) s.spinCd *= 0.75;
  if (C('seal')) { s.spinCd *= 1 + 1 * dk; s.atkSpd += 0.15; }
  if (C('forsake')) { s.dmg += 0.25; s.spinCd *= 0.7; }
  if (C('giant')) { s.size *= 1.3; s.maxHpMul += 0.35; s.dmg += 0.15; s.dashSp *= 0.85; }
  if (C('small')) { s.size *= 0.75; s.move += 0.1; }
  if (C('potion') && Run.potion === 'big') { s.size *= 1.2; s.maxHpMul += 0.3; }
  if (C('potion') && Run.potion === 'small') { s.size *= 0.85; s.move += 0.15; s.atkSpd += 0.15; }
  if (C('glasssoul')) { s.maxHpMul -= 0.4 * dk; s.dmg += 0.4; }
  if (tagN('대가') >= 4) s.dmg += 0.08 * Run.cts.filter(c => CT[c.id].tags.includes('대가')).length;
  s.maxHp += Run.swell || 0;
}

// ───────── 계약 맺기 ─────────
// 맺을 수 있는 계약인지 (등급·단계·한 번뿐인 계약)
function ctAvail(c) {
  if (Run.spent.has(c.id)) return false;
  if (c.act === 'pick') return c.on.some(a => CA(c.id, a) < c.max);
  return C(c.id) < c.max;
}
function ctPool(grade, skip) { return CONTRACTS.filter(c => c.grade === grade && ctAvail(c) && !(skip || []).includes(c)); }
function upGrade(g) { return g === 'silver' ? 'gold' : 'prism'; }
function rollContracts(grade, n, upCount) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const g = i < upCount ? upGrade(grade) : grade;
    let pool = ctPool(g, out);
    if (!pool.length) pool = CONTRACTS.filter(c => ctAvail(c) && !out.includes(c));
    if (pool.length) out.push(pick(pool));
  }
  return shuffle(out);
}
function ctAdd(id, act) {
  const c = CT[id]; act = c.kind === 'act' ? act || c.act : null;
  const own = Run.cts.find(x => x.id === id && x.act === act);
  if (own) own.lv = Math.min(c.max, own.lv + 1); else Run.cts.push({ id, act, lv: 1 });
}
// 무작위로 얻는 계약(판도라·변성): 행동을 고르는 계약은 가능한 행동 중 무작위
function ctRandom(grade, n, skipIds) {
  const got = [];
  for (let i = 0; i < n; i++) {
    const pool = ctPool(grade).filter(c => !skipIds.includes(c.id) && !got.includes(c) && !['pandora', 'transmute', 'iou'].includes(c.id));
    if (!pool.length) break; const c = pick(pool); got.push(c);
    ctAdd(c.id, c.act === 'pick' ? pick(c.on.filter(a => CA(c.id, a) < c.max)) : c.act); ctOnTake(c.id);
  }
  return got;
}
// 맺는 순간 한 번 일어나는 일
function ctOnTake(id) {
  if (id === 'star') Run.upNext = Math.max(Run.upNext, 1);
  if (id === 'moon') Run.upNext = 3;
  if (id === 'saga') Run.sagaOn = true;
  if (id === 'iou') Run.iouFloors = 3;
  if (id === 'quest' && !Run.quest) { const k = pick(Object.keys(QUESTS)); Run.quest = { k, n: 0, goal: QUESTS[k].goal, done: false }; }
}
function takeContract(id, act, cb) {
  const before = Object.assign({}, Run.tagN); const hpBefore = St.maxHp;
  const c = CT[id]; let msg = null, extra = false;
  if (id === 'transmute') {
    const got = ctRandom(upGrade(c.grade), 2, []);
    msg = ['변성', got.length ? `${got.map(x => `<b>${x.name}</b>`).join(', ')}(으)로 바뀌었어요.` : '바뀔 계약이 없어요.'];
  } else {
    ctAdd(id, act); ctOnTake(id);
    if (id === 'pandora') { const got = ctRandom(c.grade, 3, ['pandora']); msg = ['판도라의 솥', got.length ? `${got.map(x => `<b>${x.name}</b>`).join(', ')}을(를) 얻었어요.` : '나올 계약이 없어요.']; }
    if (id === 'quest' && Run.quest && !Run.quest.done) msg = ['의식 과제', `과제: <b>${QUESTS[Run.quest.k].name}</b>. 완수하면 프리즘 계약을 골라요.`];
    if (id === 'iou') extra = true;
  }
  recalc();
  if (St.maxHp > hpBefore) Run.hp = Math.min(St.maxHp, Run.hp + (St.maxHp - hpBefore));
  for (const t of TAGS) { const a = before[t.name] || 0, b = tagN(t.name); for (const th of [2, 3, 4]) if (a < th && b >= th) setTimeout(() => flashMsg(`태그 시너지: ${t.name} ${th}개 · ${t.t[th - 2]}`), 60 + th * 30); }
  if (!cb) return;
  const go = () => extra ? showContracts({ title: '악마의 차용증: 계약 한 장 더', cb }) : cb();
  if (msg) notice(msg[0], msg[1], go); else go();
}
// 파기 (상점). 맺는 순간 끝난 효과는 되돌리지 않아요.
function ctRemove(inst) { const i = Run.cts.indexOf(inst); if (i >= 0) Run.cts.splice(i, 1); if (inst.id === 'quest' && Run.quest && !Run.quest.done) Run.quest = null; if (inst.id === 'saga') Run.sagaOn = false; recalc(); }

// ───────── 과제 (의식 과제) ─────────
function questAdd(k, v) {
  const q = Run.quest; if (!q || q.done || q.k !== k) return;
  q.n += (v || 1) * (tagN('의식') >= 2 ? 1.25 : 1);
  if (q.n >= q.goal) {
    q.done = true; Run.questPicks = (Run.questPicks || 0) + (tagN('의식') >= 4 ? 2 : 1);
    if (tagN('의식') >= 3) Run.shards += 60;
    if (Scene === 'fight') FX.text(P.x, P.y - 70, '과제 완수', '#7fffe0', true); Sfx.gold();
  }
}

// ───────── 보호막·회복 ─────────
function shieldTotal() { let v = 0; for (const s of P.shields || []) v += s.v; return v; }
function addShield(v, t, key) {
  P.shields = P.shields || [];
  if (key) { const s = P.shields.find(x => x.key === key); if (s) { s.v = Math.max(s.v, v); return; } }
  P.shields.push({ v, t: t || 1e9, key }); FX.text(P.x, P.y - 54, `보호막 +${Math.round(v)}`, '#9fd0ff'); FX.ring(P.x, P.y, P.r + 4, P.r + 30, '#9fd0ff', 0.25, 4);
}
function heal(v) {
  v = Math.min(v, St.maxHp - Run.hp); if (v <= 0) return 0;
  Run.hp += v;
  if (Scene === 'fight' && World.arena) {
    FX.text(P.x, P.y - 50, '+' + Math.round(v), '#7fe0a0');
    if (C('bloodring')) { const t = nearest(P.x, P.y, 420)[0]; if (t) { World.bolts.push({ x1: P.x, y1: P.y, x2: t.x, y2: t.y, life: 0.2, col: '#ff5a7a' }); ctDmg(t, v, 'phys', { raw: true }); } }
  }
  return v;
}

// ───────── 상태 이상 ─────────
function stDur() { return 3 * (tagN('원소') >= 2 ? 1.3 : 1); }
function reactK() { return tagN('원소') >= 4 ? 1.5 : 1; }
function applySt(e, st, amt) {
  if (!e || e.dead) return; amt = amt || 1;
  if (st === 'burn') { e.burn = Math.min(5, e.burn + amt); e.burnT = stDur(); }
  if (st === 'chill') { e.chillT = stDur(); e.chill = Math.min(5, e.chill + amt); if (e.chill >= 5) freezeE(e, 1.5); }
  if (st === 'shock') e.shocked = stDur();
}
function freezeE(e, t) {
  if (e.boss) { e.staggerT = Math.max(e.staggerT || 0, 0.5); e.cancelAttack && e.cancelAttack(); return false; }
  if (e.freezeImm > 0) return false;
  e.frozen = t; e.chill = 0; e.freezeImm = t + 2; FX.text(e.x, e.y - 40, '빙결', '#bfefff'); e.cancelAttack && e.cancelAttack();
  // 원소 3개 반응: 화상 중인 적이 빙결되면 터져요
  if (tagN('원소') >= 3 && e.burn > 0) {
    const pw = e.burn * 12 * reactK(); FX.text(e.x, e.y - 64, '열충격', '#ffb36b', true); FX.ring(e.x, e.y, 10, 130, '#ffb36b', 0.35, 8); Sfx.boom();
    for (const t2 of World.enemies) if (!t2.dead && dist(t2, e) < 130 + t2.r) later(0.03, () => dealDamage(t2, { base: pw, gen: 2, elem: 'fire', noStatus: true, ang: angTo(e, t2), kb: 260 }));
  }
  return true;
}
// 계약 효과가 주는 피해 (타격 연출 없음, 메아리·낙인 대상 아님)
function ctDmg(e, base, elem, extra) {
  if (!e || e.dead) return;
  dealDamage(e, Object.assign({ base, gen: 1, elem: elem || 'phys', noStatus: true, noBrand: true, noEcho: true, ang: angTo(P, e) }, extra || {}));
}

// ───────── 장판 (불길·서리) ─────────
const FIELD_COL = { fire: '#ff8a3d', frost: '#bfefff' };
function addField(type, x, y, r, dur, s) {
  const same = World.fields.filter(f => f.type === type); if (same.length >= 8) World.fields.splice(World.fields.indexOf(same[0]), 1);
  World.fields.push({ type, x, y, r, t: dur, max: dur, s: s || 1, tick: 0 });
}
function updateFields(dt) {
  for (const f of World.fields) {
    f.t -= dt; f.tick -= dt; const tick = f.tick <= 0; if (tick) f.tick = 0.5;
    for (const e of World.enemies) {
      if (e.dead || Math.hypot(e.x - f.x, e.y - f.y) > f.r + e.r) continue;
      if (f.type === 'frost') { e.slowT = 0.2; e.slowK = 0.7; }
      if (!tick) continue;
      if (f.type === 'fire') { ctDmg(e, 3 * f.s, 'fire'); applySt(e, 'burn', 1); }
      if (f.type === 'frost') applySt(e, 'chill', 1);
    }
  }
  World.fields = World.fields.filter(f => f.t > 0);
  for (const e of World.enemies) e.slowT = (e.slowT || 0) - dt;
}
function slowMul(e) { return (e.slowT || 0) > 0 ? e.slowK : 1; }

// ───────── 효과 도구 ─────────
function burst(x, y, r, dmg, elem, opts) {
  opts = opts || {};
  FX.ring(x, y, 8, r, opts.col || '#fff', 0.3, 6); FX.burst(x, y, opts.col || '#fff', 14, r * 3, 0.4, 5);
  for (const e of World.enemies) {
    if (e.dead || Math.hypot(e.x - x, e.y - y) > r + e.r) continue;
    const a = Math.atan2(e.y - y, e.x - x);
    if (dmg) ctDmg(e, dmg, elem, { ang: a, kb: opts.kb || 0, act: opts.act, poise: opts.poise });
    if (opts.st) applySt(e, opts.st, opts.amt || 1);
    if (opts.stagger) { e.staggerT = Math.max(e.staggerT || 0, e.boss ? opts.stagger * 0.5 : opts.stagger); e.cancelAttack && e.cancelAttack(); }
  }
}
function zap(from, t, dmg, extra) { World.bolts.push({ x1: from.x, y1: from.y, x2: t.x, y2: t.y, life: 0.15 }); SpriteFX.bolt(t.x, t.y, t.r); ctDmg(t, dmg, 'light', Object.assign({ noLightChain: true }, extra || {})); applySt(t, 'shock'); }
function nearest(x, y, r, skip) { return World.enemies.filter(e => !e.dead && e.type !== 'merchant' && !(skip && skip.has(e)) && Math.hypot(e.x - x, e.y - y) < r + e.r).sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y)); }
function pathPts(c, n) { const out = []; for (let i = 0; i < n; i++) { const k = (i + 0.5) / n; out.push({ x: lerp(c.x0, c.x1, k), y: lerp(c.y0, c.y1, k) }); } return out; }
const LS = [0, 1, 1.5, 2]; // 단계별 부가 효과 크기

// ───────── 어느 행동의 공격인가 ─────────
function actGroup(o) {
  if (o.grp) return o.grp;
  const a = o.act; if (!a) return null;
  if (a === 'a1' || a === 'a2' || a === 'a3') return 'atk';
  if (a === 'spin') return 'magic'; if (a === 'dash') return 'dash'; if (a === 'ult') return 'ult'; if (a === 'guard') return 'guard';
  return null;
}
// 속성 전환: 그 행동에 붙인 불길·서리·우레의 비율대로 (반격은 방어에 붙인 것도)
function pickElem(o) {
  if (o.elem) return o.elem;
  const g = actGroup(o); if (!g) return 'phys';
  const add = tagN('원소') >= 4 ? 0.2 : 0; const opts = [];
  for (const [id, el] of [['flame', 'fire'], ['frost', 'ice'], ['thunder', 'light']]) {
    const lv = Math.max(CA(id, g), o.counter ? CA(id, 'guard') : 0);
    if (lv) opts.push([el, g === 'ult' ? 1 : LV3[lv] + add, lv]);
  }
  shuffle(opts);
  for (const [el, p, lv] of opts) if (R() < p) { o.elemLv = lv; return el; }
  return 'phys';
}

// ───────── 행동별 훅 (combat.js에서 불러요) ─────────
// 평타: 휘두르기 시작
function ctOnSwingStart(a) {
  if (C('heatup')) { P.heat = Math.min(6, (P.heat || 0) + 1); P.heatT = 2; }
  if (C('shadowhand')) {
    const n = sumN(1);
    for (let i = 0; i < n; i++) later(0.12 + i * 0.09, () => {
      if (!P.alive) return; const sw = a.sw;
      FX.slash(P.x, P.y, a.ang, sw.arc * 0.9, sw.range + P.r + 14, '#b58cff', 10, 0.18);
      for (const e of World.enemies) { if (e.dead) continue; const d = dist(P, e) - e.r; if (d > sw.range + 14 || (Math.abs(angDiff(a.ang, angTo(P, e))) > sw.arc / 2 && d > 20)) continue; ctDmg(e, sw.dmg * 0.4, null, { grp: 'atk', elem: null, noStatus: false, ang: a.ang }); }
    });
  }
}
// 평타가 적에게 맞음 (dmg = 방금 준 피해)
function ctOnAtkHit(e, a, base) {
  if (C('fourth')) { P.beat = (P.beat || 0) + 1; if (P.beat >= 4) { P.beat = 0; FX.text(e.x, e.y - e.r - 34, '넷째 박자', '#cfe8ff'); ctDmg(e, base * 0.6, 'phys', { ang: a.ang }); if (!e.dead) { e.staggerT = Math.max(e.staggerT || 0, e.boss ? 0.15 : 0.3); e.cancelAttack && e.cancelAttack(); } } }
  if (C('sparkjump') && R() < 0.2) for (const t of nearest(e.x, e.y, 260, new Set([e])).slice(0, 2)) zap(e, t, base * 0.4);
  if (a.act === 'a3') {
    if (C('thirdcurse') && !e.dead) { e.curse = true; }
    if (C('spellnail') && !a.nailDone) { a.nailDone = true; magicFx(e.x, e.y, 0.3, true); }
  }
}
// 마법: 한 번 터질 때 (x, y 중심, s = 크기·위력 비율). mini = 주문 깃든 손톱이 남긴 작은 것
function magicFx(x, y, s, mini) {
  const r = 145 * (mini ? 0.7 : 1); let any = false;
  for (const e of World.enemies) {
    if (e.dead || Math.hypot(e.x - x, e.y - y) - e.r > r) continue; any = true;
    const o = { base: 26 * s, act: 'spin', gen: mini || s < 1 ? 1 : 0, ang: Math.atan2(e.y - y, e.x - x), kb: mini ? 0 : 360, poise: 26 * s };
    dealDamage(e, o);
    if (C('frog') && !e.dead) { if (e.boss) { e.staggerT = Math.max(e.staggerT || 0, 0.3); e.cancelAttack && e.cancelAttack(); } else if (!(e.frog > 0)) { e.frog = 1.5; e.cancelAttack && e.cancelAttack(); FX.text(e.x, e.y - e.r - 30, '개굴', '#8fe07a'); FX.burst(e.x, e.y, '#8fe07a', 10, 200, 0.4, 5); } }
  }
  if (mini) { FX.ring(x, y, 10, r, '#d7b8ff', 0.25, 5); }
  // 붙인 원소 줄
  const fl = CA('flame', 'magic'), fr = CA('frost', 'magic'), th = CA('thunder', 'magic');
  if (fl) addField('fire', x, y, r * 0.95, 2 * (mini ? 0.6 : 1), LS[fl] * s);
  if (fr) addField('frost', x, y, r * 0.95, 2.5 * (mini ? 0.6 : 1), LS[fr] * s);
  if (th) { FX.ring(x, y, 20, r + 30, '#ffe45c', 0.25, 4); for (const t of nearest(x, y, r + 30)) zap({ x, y }, t, 6 * LS[th] * s); }
  return any;
}
// 마법 시전 (Q). 첫 타가 나갈 때 한 번
function ctOnMagicCast() {
  const x = P.x, y = P.y;
  if (C('reecho')) later(0.4, () => { if (!P.alive) return; FX.ring(x, y, 30, 150, '#d7b8ff', 0.3, 6); FX.text(x, y - 60, '되울림', '#d7b8ff'); Sfx.swing(); magicFx(x, y, 0.6); });
  if (C('bees')) { const n = sumN(3); for (let i = 0; i < n; i++) World.summons.push({ type: 'bee', t: sumDur(4), tick: 1 + i * 0.15, ph: i / n * Math.PI * 2 }); FX.text(P.x, P.y - 60, '벌 떼', '#ffe45c'); }
}
// 마법이 적을 맞힘 (시전당 한 번)
function ctOnMagicHit() {
  if (C('homing')) { const n = sumN(3); for (let i = 0; i < n; i++) { const a = P.face + (i - (n - 1) / 2) * 0.7; World.projs.push({ owner: 'player', x: P.x, y: P.y, vx: Math.cos(a) * 520, vy: Math.sin(a) * 520, r: 9, life: 2.2, dmg: 26 * 0.35, col: '#ffb3f0', pierce: false, hitSet: new Set(), gen: 1, homing: true, grp: 'magic' }); } }
}
// 방어 성공
function ctOnGuard(h, perfect) {
  const src = h.src && !h.src.dead ? h.src : null;
  questAdd('guard');
  if (C('barrier')) addShield(8, 3);
  if (C('bloodmirror')) heal(h.dmg * 0.3);
  if (perfect && C('shadowhide')) { P.iframe = Math.max(P.iframe, 1); P.hideT = 1; FX.text(P.x, P.y - 64, '그림자 숨기', '#b58cff'); }
  if (h.color === 'gold' && C('goldcatch') && src) { src.staggerT += 0.6; src.goldT = src.staggerT; FX.text(src.x, src.y - src.r - 50, '낚아챔', '#ffd27a'); }
  if (C('mirror')) {
    if (h.proj) { const p = h.proj; const a = Math.atan2(p.vy, p.vx); const sp = Math.hypot(p.vx, p.vy); p.vx = Math.cos(a - 0.2) * sp; p.vy = Math.sin(a - 0.2) * sp; World.projs.push(Object.assign({}, p, { vx: Math.cos(a + 0.2) * sp, vy: Math.sin(a + 0.2) * sp, hitSet: new Set() })); }
    else if (src) { const a = angTo(P, src); World.projs.push({ owner: 'player', x: P.x + Math.cos(a) * 30, y: P.y + Math.sin(a) * 30, vx: Math.cos(a) * 900, vy: Math.sin(a) * 900, r: 16, life: 0.6, dmg: POW * 0.5, col: '#ffe9b0', pierce: true, hitSet: new Set(), gen: 1, wave: true, grp: 'guard' }); }
  }
  if (tagN('응수') >= 4) { burst(P.x, P.y, 190, 6, 'phys', { col: '#ffd27a', poise: 40, stagger: 0.35 }); }
  // 붙인 원소 줄
  const px = src ? lerp(P.x, src.x, 0.6) : P.x + Math.cos(P.face) * 60, py = src ? lerp(P.y, src.y, 0.6) : P.y + Math.sin(P.face) * 60;
  const fl = CA('flame', 'guard'), fr = CA('frost', 'guard'), th = CA('thunder', 'guard');
  if (fl) burst(px, py, 100, POW * 0.5 * LS[fl], 'fire', { col: '#ff8a3d', st: 'burn', amt: 2 });
  if (fr && src) { applySt(src, 'chill', 3); FX.ring(src.x, src.y, 10, 60, '#7fd8ff', 0.25, 4); }
  if (th && src) { zap(P, src, POW * 0.4 * LS[th]); if (!src.dead) { src.staggerT = Math.max(src.staggerT || 0, src.boss ? 0.2 : 0.4); FX.text(src.x, src.y - 50, '마비', '#ffe45c'); } }
}
// 대시 시작. true를 돌려주면 보통 대시 대신 다른 동작(칼춤 빗자루)이 나가요
function ctOnDashStart() {
  P.dashPath = { x0: P.x, y0: P.y };
  if (C('illusion')) { const t = sumDur(1.5); World.decoy = { x: P.x, y: P.y, t, max: t }; FX.ring(P.x, P.y, 10, 50, '#e3c8ff', 0.3, 4); }
  if (C('gale') || C('speedcurse')) P.galeT = 1.16;
  if (C('speedcurse')) P.speedT = 1.16;
  if (C('broomdance')) {
    const ts = nearest(P.x, P.y, 460).slice(0, 3);
    if (ts.length) { P.act = { type: 'blink', t: 0.09, i: 0, targets: ts, x0: P.x, y0: P.y }; P.iframe = Math.max(P.iframe, 0.12 * ts.length + 0.3); return true; }
  }
  return false;
}
function ctOnDashEnd() {
  const c0 = P.dashPath; if (!c0) return; P.dashPath = null;
  const c = { x0: c0.x0, y0: c0.y0, x1: P.x, y1: P.y };
  const segHit = (r, fn) => { for (const e of World.enemies) if (!e.dead && segDist(e.x, e.y, c.x0, c.y0, c.x1, c.y1) < r + e.r) fn(e); };
  if (tagN('질풍') >= 3) segHit(34, e => ctDmg(e, POW * 0.5, null, { grp: 'dash', elem: null, noStatus: false, ang: Math.atan2(c.y1 - c.y0, c.x1 - c.x0) }));
  if (C('emberstep')) for (const p of pathPts(c, 3)) { World.marks.push({ x: p.x, y: p.y, t: 1, max: 1, col: '#ff8a3d' }); later(1, () => { burst(p.x, p.y, 80, POW * 0.5, 'fire', { col: '#ff8a3d' }); Sfx.boom(); }); }
  const fl = CA('flame', 'dash'), fr = CA('frost', 'dash'), th = CA('thunder', 'dash');
  if (fl) for (const p of pathPts(c, 3)) addField('fire', p.x, p.y, 55, 1.5, LS[fl]);
  if (fr) for (const p of pathPts(c, 3)) addField('frost', p.x, p.y, 60, 2, LS[fr]);
  if (th) segHit(60, e => zap({ x: c.x0, y: c.y0 }, e, POW * 0.25 * LS[th]));
}
// 궁극기
function ctOnUlt(power) {
  if (C('cycle')) P.cycleT = 5;
  if (C('overflow')) { P.dashCharges = St.dashMax; P.dashRe = 0; P.spinCharges = St.spinMax; P.spinRe = 0; FX.text(P.x, P.y - 70, '넘치는 마력', '#9fe8ff'); }
  if (C('doublecast') && power >= 1) P.ult2T = 5;
}
function ctOnUltHit(e) {
  if (e.dead) return;
  if (C('frozenspell')) { if (e.boss) { e.staggerT = Math.max(e.staggerT || 0, 0.5); e.cancelAttack && e.cancelAttack(); } else { e.freezeImm = 0; freezeE(e, 1.5); } }
  if (CA('flame', 'ult')) applySt(e, 'burn', 2);
  if (CA('frost', 'ult')) applySt(e, 'chill', 2);
}
// 적 처치 (o = 죽인 공격)
function ctOnKill(e, o) {
  o = o || {}; const g = actGroup(o);
  if (C('thirst')) heal(2);
  if (CA('overcharge', 'dash') && P.dashCharges < St.dashMax) P.dashCharges++;
  if (CA('overcharge', 'magic') && P.spinCharges < St.spinMax) P.spinCharges++;
  if (tagN('질풍') >= 4 && P.dashCharges < St.dashMax) { P.dashCharges = St.dashMax; P.dashRe = 0; }
  if (tagN('처형') >= 4) P.execT = 3;
  if (C('fullmoon') && P.ultT > 0 && (P.ultExt || 0) < 5) { P.ultT += 1; P.ultExt = (P.ultExt || 0) + 1; FX.text(P.x, P.y - 70, '만월 +1초', '#ffe9b0'); }
  if (C('soulbottle') && g === 'magic') { Run.soul = (Run.soul || 0) + 1; FX.text(e.x, e.y - 50, `영혼 ${Run.soul}`, '#b58cff'); }
  if (g === 'dash' && o.gen === 0) questAdd('dashkill');
}
// 층 시작 (플레이어를 놓은 뒤)
function ctOnFloorStart() {
  World.summons = []; P.shields = []; P.escapeUsed = false; P.wallUsed = false; P.calmT = 0; P.noHit = true; P.heat = 0; P.beat = 0; P.ultT = 0; P.ult2T = 0; P.execT = 0; P.speedT = 0; P.revengeT = 0; P.hideT = 0; P.justT = 0;
  if (C('potion')) { const hp0 = St.maxHp; Run.potion = R() < 0.5 ? 'big' : 'small'; recalc(); if (St.maxHp > hp0) Run.hp += St.maxHp - hp0; P.r = 18 * St.size; later(0.4, () => FX.text(P.x, P.y - 60, Run.potion === 'big' ? '불안정한 약: 거대' : '불안정한 약: 소형', '#c8ff9a', true)); }
  if (tagN('철벽') >= 3) addShield(15);
  if (C('interest')) { const v = Math.min(20, Math.floor(Run.shards * 0.1)); if (v > 0) { Run.shards += v; later(0.5, () => FX.text(P.x, P.y - 40, `이자 +${v}`, '#ffd86b')); } }
  if (C('bomb')) later(3, () => { if (!P.alive) return; FX.text(P.x, P.y - 70, '봉인된 폭탄', '#ff9a3d', true); Sfx.boom(); Juice.kick(16); splat(P.x, P.y, '#000', 180, 'scorch'); burst(P.x, P.y, 280, POW * 2, 'fire', { col: '#ff9a3d', kb: 420, stagger: 0.8 }); });
  if (C('crow')) for (let i = 0; i < sumN(1); i++) World.summons.push({ type: 'crow', t: 1e9, tick: 1 + i * 0.5, x: P.x, y: P.y, ph: i * 2 });
}
// 층 클리어
function ctOnFloorClear() {
  if (C('swell')) { Run.swell = (Run.swell || 0) + 3; Run.hp += 3; }
  if (Run.iouFloors > 0) Run.iouFloors--;
  if (P.noHit) questAdd('nohit');
  if (C('potion')) { Run.potion = null; }
  recalc();
}
// 플레이어가 피해를 받은 뒤
function ctOnHurt() {
  P.noHit = false; P.calmT = 0;
  if (C('revenge')) { P.revengeT = 2; FX.text(P.x, P.y - 56, '되갚는 저주', '#ff9a9a'); }
  if (Run.hp > 0 && Run.hp < St.maxHp * 0.3) {
    if (C('escape') && !P.escapeUsed) { P.escapeUsed = true; P.dashCharges = St.dashMax; P.dashRe = 0; addShield(15); FX.text(P.x, P.y - 78, '빗자루 도주', '#9fe8ff', true); }
    if (tagN('철벽') >= 4 && !P.wallUsed) { P.wallUsed = true; P.iframe = Math.max(P.iframe, 2); heal(15); FX.text(P.x, P.y - 92, '철벽', '#9fd0ff', true); FX.ring(P.x, P.y, 20, 120, '#9fd0ff', 0.4, 8); }
  }
}
// 죽을 때: 두 번째 숨. true면 살아나요
function ctOnDeath() {
  const inst = Run.cts.find(c => c.id === 'secondwind'); if (!inst) return false;
  Run.cts.splice(Run.cts.indexOf(inst), 1); Run.spent.add('secondwind'); recalc();
  Run.hp = Math.round(St.maxHp * 0.4); P.iframe = 2; Juice.slowmo(0.8, 0.3); Juice.screen('#ffffff', 0.25); Sfx.gold();
  FX.text(P.x, P.y - 70, '두 번째 숨', '#ffffff', true); FX.ring(P.x, P.y, 20, 260, '#ffffff', 0.5, 10); burst(P.x, P.y, 220, 0, null, { col: '#ffffff', stagger: 0.8 });
  return true;
}
// 매 틱: 소환물, 궁극기 효과, 보호막, 타이머
function updateContracts(dt) {
  if (World.decoy) { World.decoy.t -= dt; if (World.decoy.t <= 0) { const d = World.decoy; World.decoy = null; burst(d.x, d.y, 110, POW * 0.4, 'phys', { col: '#e3c8ff' }); if (tagN('권속') >= 4) burst(d.x, d.y, 80, POW * 0.3, 'phys', { col: '#ff9ae0' }); } }
  for (const k of ['heatT', 'execT', 'speedT', 'revengeT', 'hideT', 'ult2T', 'justT']) P[k] = (P[k] || 0) - dt;
  if (P.heatT <= 0) P.heat = 0;
  for (const s of P.shields || []) s.t -= dt; P.shields = (P.shields || []).filter(s => s.t > 0 && s.v > 0);
  if (C('calm') && P.alive) { P.calmT = (P.calmT || 0) + dt; if (P.calmT >= 4) { P.calmT = 0; const v = Math.round(St.maxHp * 0.1); const s = P.shields.find(x => x.key === 'calm'); if (!s || s.v < v) addShield(v, 1e9, 'calm'); } }
  // 궁극기 효과 (임시): 쓴 뒤 4초 동안 1초마다 주변에 의식의 파동
  if (P.ultT > 0) {
    P.ultT -= dt; P.ultTick = (P.ultTick || 0) - dt;
    if (P.ultTick <= 0) { P.ultTick = 1; FX.ring(P.x, P.y, 20, 220, '#ff9a3d', 0.35, 6); for (const e of World.enemies) if (!e.dead && dist(P, e) - e.r < 220) { dealDamage(e, { base: POW * 0.4 * (P.ultPow || 1), act: 'ult', gen: 1, ang: angTo(P, e), noEcho: true }); ctOnUltHit(e); } }
    if (P.ultT <= 0) { P.ultExt = 0; }
  }
  // 소환물
  for (const s of World.summons) {
    s.t -= dt; s.tick -= dt; s.ph += dt * 3;
    if (s.type === 'bee') {
      s.x = P.x + Math.cos(s.ph) * 46; s.y = P.y + Math.sin(s.ph) * 46;
      if (s.tick <= 0) { s.tick = 1; const t = nearest(P.x, P.y, 380)[0]; if (t) { World.bolts.push({ x1: s.x, y1: s.y, x2: t.x, y2: t.y, life: 0.12, col: '#ffe45c' }); ctDmg(t, ATK_POW * 0.25, 'phys', { grp: 'magic' }); } }
      if (s.t <= 0 && tagN('권속') >= 4) burst(s.x, s.y, 70, POW * 0.3, 'phys', { col: '#ff9ae0' });
    }
    if (s.type === 'crow') {
      const t = P.lastHit && !P.lastHit.dead ? P.lastHit : null;
      const tx = t ? t.x + Math.cos(s.ph) * (t.r + 14) : P.x + Math.cos(s.ph) * 60, ty = t ? t.y + Math.sin(s.ph) * (t.r + 14) : P.y + Math.sin(s.ph) * 60;
      s.x = lerp(s.x, tx, Math.min(1, dt * 6)); s.y = lerp(s.y, ty, Math.min(1, dt * 6));
      if (s.tick <= 0) { s.tick = 1; if (t && Math.hypot(s.x - t.x, s.y - t.y) < t.r + 60) { FX.spark(t.x, t.y, s.ph, '#b9a8ff', 4, 200); ctDmg(t, ATK_POW * 0.4, 'phys'); } }
    }
  }
  World.summons = World.summons.filter(s => s.t > 0);
}
// 소환물·보호막 그리기 (2D 겹침 레이어)
function drawSummons() {
  for (const s of World.summons || []) {
    if (s.x == null) continue; const q = proj(s.x, s.y, s.type === 'crow' ? 70 : 40 + Math.sin(s.ph * 3) * 8);
    if (s.type === 'bee') { cx.fillStyle = '#ffe45c'; cx.beginPath(); cx.arc(q.x, q.y, 5 * q.s, 0, Math.PI * 2); cx.fill(); cx.fillStyle = '#2b2410'; cx.fillRect(q.x - 1.5 * q.s, q.y - 4 * q.s, 3 * q.s, 8 * q.s); }
    if (s.type === 'crow') { cx.fillStyle = '#3a2d5c'; cx.strokeStyle = '#b9a8ff'; cx.lineWidth = 2; const w = (10 + Math.sin(s.ph * 4) * 6) * q.s; cx.beginPath(); cx.moveTo(q.x - 14 * q.s, q.y - w); cx.lineTo(q.x, q.y); cx.lineTo(q.x + 14 * q.s, q.y - w); cx.lineTo(q.x, q.y + 6 * q.s); cx.closePath(); cx.fill(); cx.stroke(); }
  }
  for (const e of World.enemies) {
    if (e.dead) continue;
    if (e.curse) { const q = proj(e.x, e.y, e.r * 2 + 30); cx.fillStyle = '#c77dff'; cx.font = `900 ${Math.round(20 * q.s)}px sans-serif`; cx.textAlign = 'center'; cx.fillText('✶', q.x, q.y); }
    if (e.frog > 0) { const q = proj(e.x, e.y, e.r * 2 + 30); cx.fillStyle = '#8fe07a'; cx.font = `900 ${Math.round(18 * q.s)}px sans-serif`; cx.textAlign = 'center'; cx.fillText('개굴', q.x, q.y); }
  }
  if (shieldTotal() > 0) { const q = proj(P.x, P.y, 26); cx.strokeStyle = '#9fd0ff'; cx.globalAlpha = 0.7; cx.lineWidth = 3; cx.beginPath(); cx.ellipse(q.x, q.y, (P.r + 16) * q.s, (P.r + 22) * q.s, 0, 0, Math.PI * 2); cx.stroke(); cx.globalAlpha = 1; }
  if (P.ultT > 0) { const q = proj(P.x, P.y, 2); cx.strokeStyle = '#ff9a3d'; cx.globalAlpha = 0.5; cx.lineWidth = 3; cx.beginPath(); cx.ellipse(q.x, q.y, 220 * q.s, 220 * q.s * 0.62, 0, 0, Math.PI * 2); cx.stroke(); cx.globalAlpha = 1; }
}

// ───────── 화면: 계약 카드 ─────────
function tagChip(name, small, extra) { return `<span class="kwtag${small ? ' sm' : ''}" style="border-color:${tagCol(name)};color:${tagCol(name)}">${name}${extra || ''}</span>`; }
function gradeHead(c, act) { return `<div class="grade" style="color:${GRADE[c.grade].col}">${GRADE[c.grade].name} · ${c.kind === 'act' ? '행위 계약 · ' + (act ? ACT[act].name : c.act === 'pick' ? '행동 선택' : ACT[c.act].name) : '존재 계약'}</div>`; }
// 태그 미리 보기: "원소 2→3" + 새로 켜지는 단계
function tagPreview(c) {
  const owned = C(c.id) > 0;
  return '<div class="synhint">' + c.tags.map(t => {
    const a = tagN(t), b = owned ? a : a + 1; const th = [2, 3, 4].find(x => a < x && b >= x);
    const next = [2, 3, 4].find(x => x > b);
    return `<div class="${th ? 'on' : ''}">${tagChip(t, true)} ${owned ? `${a}개 (이미 셈)` : `${a} → ${b}`}${th ? ` · <b>${th}개 효과 켜짐</b>: ${TAG[t].t[th - 2]}` : next ? ` <span class="dim">· ${next}개: ${TAG[t].t[next - 2]}</span>` : ''}</div>`;
  }).join('') + '</div>';
}
function ctCardHtml(c) {
  const lvNow = c.act === 'pick' ? Math.max(0, ...c.on.map(a => CA(c.id, a))) : C(c.id);
  const l = c.act === 'pick' ? 1 : Math.min(c.max, lvNow + 1);
  return `${gradeHead(c)}<div class="cname">${c.name}${c.max > 1 && c.act !== 'pick' ? ` <small>${l}단계</small>` : ''}${lvNow && c.act === 'pick' ? ' <small>보유</small>' : ''}</div><div class="cdesc">${c.d(l)}</div>${tagPreview(c)}`;
}
// 계약 고르기 화면. opt: { prism, title, cb, grade }
function showContracts(opt) {
  opt = opt || {}; const cb = opt.cb;
  let grade, n = 3;
  if (opt.prism) { grade = 'prism'; if (opt.tier && Run.sagaOn) { n = 4; Run.sagaOn = false; recalc(); } }
  else { const t = Run.tier; grade = opt.grade || wpick(t === 1 ? [['silver', 60], ['gold', 30], ['prism', 10]] : t === 2 ? [['silver', 40], ['gold', 40], ['prism', 20]] : [['silver', 25], ['gold', 45], ['prism', 30]]); }
  if (n === 3 && tagN('천운') >= 4 && R() < 0.25) n = 4;
  const up = opt.prism ? 0 : (Run.upNext || 0); if (!opt.prism) Run.upNext = 0;
  const cards = rollContracts(grade, n, up);
  if (opt.minGold) for (let i = 0; i < cards.length; i++) if (cards[i].grade === 'silver') { const pool = ctPool('gold', cards); if (pool.length) cards[i] = pick(pool); }
  if (!cards.length) { Run.rerolls = Math.min(5, Run.rerolls + 1); notice('맺을 계약이 없어요', '대신 리롤권 1개를 받았어요.', cb); return; }
  const skipN = opt.prism ? 2 : 1;
  cardPicker({
    title: opt.title || (opt.prism ? '프리즘 계약' : '계약'), sub: opt.prism ? '가장 강한 계약이에요. 하나를 고르세요.' : `${GRADE[grade].name} 등급 계약 중 하나를 고르세요. 카드 아래에 태그가 몇 개째가 되는지 보여요.`, cards,
    extraFree: tagN('천운') >= 3 ? 1 : 0,
    render: ctCardHtml,
    reroll: (c, cs) => { const pool = ctPool(c.grade, cs); return pool.length ? pick(pool) : null; },
    onPick: c => { if (c.act === 'pick') ctChooseAct(c, cb); else takeContract(c.id, c.act, cb); },
    skipLabel: `취소 (리롤권 +${skipN})`, onSkip: () => { Run.rerolls = Math.min(5, Run.rerolls + skipN); cb(); },
  });
}
// 행동을 고르는 계약: 어느 행동에 맺을지
function ctChooseAct(c, cb) {
  Scene = 'menu'; const p = panel(); topBar(p);
  const w = h('div', 'card-wrap'); w.innerHTML = `<h1 style="color:${GRADE[c.grade].col}">${c.name}</h1><p class="lead">어느 행동에 맺을까요? 맺은 뒤에는 옮길 수 없어요. 같은 행동에 다시 맺으면 단계가 올라요.</p>`;
  const row = h('div', 'kwplace');
  for (const a of c.on) {
    const lv = CA(c.id, a); const full = lv >= c.max;
    const b = h('button', 'card kwact' + (full ? ' full' : ''));
    b.innerHTML = `<div class="cname">${ACT[a].name}${lv ? ` <small>${full ? '최대' : lv + 1 + '단계로'}</small>` : ''}</div><div class="cdesc kwd">${c.lines[a]}<br><span class="dim">${c.d(Math.min(c.max, lv + 1))}</span></div>
      <div class="cfoot">${ctOf(a).map(x => `<span class="chip">${CT[x.id].name}${x.lv > 1 ? ' ' + x.lv : ''}</span>`).join('') || '<span class="dim">이 행동에 맺은 계약 없음</span>'}</div>`;
    b.disabled = full; b.onclick = () => { Sfx.pick(); takeContract(c.id, a, cb); };
    row.appendChild(b);
  }
  w.appendChild(row); p.appendChild(w);
  setTimeout(() => { if (!window.__auto) return; const b = row.querySelector('.card:not([disabled])'); b && b.isConnected && b.click(); }, 20);
}
// 계약 한 줄 (계약 창·상점)
function ctLine(inst) {
  const c = CT[inst.id];
  return `<div class="caug" style="border-color:${GRADE[c.grade].col}"><div class="cname2">${c.name}${c.max > 1 ? ` <small>${inst.lv}단계</small>` : ''} <span class="tagrow">${c.tags.map(t => tagChip(t, true)).join(' ')}</span></div>
    <div class="cdesc2">${c.d(inst.lv)}${c.lines && inst.act ? `<br><span class="dim">${ACT[inst.act].name}: ${c.lines[inst.act]}</span>` : ''}</div></div>`;
}
