'use strict';
// ───────── 데이터: 축복, 증강, 인장, 적, 변형자 ─────────
// 수치는 설계서(game-design.md)의 기본값을 따르고, 없는 값은 프로토타입용 초안이에요.

const ELEM = {
  phys: { name: '물리', col: '#f2f2f2' },
  fire: { name: '화염', col: '#ff8a3d' },
  ice: { name: '냉기', col: '#7fd8ff' },
  light: { name: '번개', col: '#ffe45c' },
  none: { name: '무계열', col: '#b9b4c8' },
};

// 6.4 축복
const BLESSINGS = [
  { id: 'sharp', name: '예리함', desc: '피해 +4%', apply: s => s.dmg += 0.04 },
  { id: 'tough', name: '튼튼함', desc: '최대 체력 +6', apply: s => s.maxHp += 6 },
  { id: 'hands', name: '손놀림', desc: '공격 속도 +3%', apply: s => s.atkSpd += 0.03 },
  { id: 'feet', name: '발놀림', desc: '이동 속도 +3%', apply: s => s.move += 0.03 },
  { id: 'breath', name: '호흡', desc: '대시 쿨다운 -4%', apply: s => s.dashCd *= 0.96 },
  { id: 'ember', name: '잔불', desc: '궁극기 게이지 충전 +5%', apply: s => s.ultGain += 0.05 },
  { id: 'focus', name: '집중', desc: '패링 판정 +0.01초 (최대 +0.05초)', apply: s => s.parryWin = Math.min(s.parryWinBase + 0.05, s.parryWin + 0.01) },
];

// 7.2 효과형 증강 + 8장 증강 (등급: silver, gold, prism)
const GRADE = { silver: { name: '실버', col: '#c9d1dc' }, gold: { name: '골드', col: '#f2c14e' }, prism: { name: '프리즘', col: '#e78bff' } };
const AUGMENTS = [
  // 효과형 (최대 3단계)
  { id: 'flame', name: '불길', grade: 'gold', max: 3, tag: '효과', desc: l => `내 공격의 ${[30, 60, 100][l - 1]}%가 화염으로 바뀌고 화상(최대 5중첩)` },
  { id: 'frost', name: '서리', grade: 'gold', max: 3, tag: '효과', desc: l => `내 공격의 ${[30, 60, 100][l - 1]}%가 냉기, 둔화 5중첩이면 빙결 (보스는 피해 +30%)` },
  { id: 'thunder', name: '우레', grade: 'gold', max: 3, tag: '효과', desc: l => `내 공격의 ${[30, 60, 100][l - 1]}%가 번개, 가까운 적 ${l}명에게 튐` },
  { id: 'pierce', name: '꿰뚫기', grade: 'gold', max: 3, tag: '효과', desc: l => `3타·반격이 적을 뚫는 검기를 날림 (위력 ${[50, 80, 110][l - 1]}%)` },
  { id: 'fork', name: '갈래', grade: 'prism', max: 3, tag: '효과', desc: l => `3타·반격이 양옆으로 검기 ${l}갈래씩 더 냄 (위력 40%)` },
  { id: 'echo', name: '메아리', grade: 'prism', max: 3, tag: '효과', desc: l => `모든 타격이 ${[25, 40, 55][l - 1]}% 확률로 0.2초 뒤 한 번 더 (위력 50%)` },
  { id: 'cut', name: '끊어내기', grade: 'prism', max: 3, tag: '효과', desc: l => `체력 ${[15, 20, 25][l - 1]}% 이하 적을 때리면 즉사 (보스는 최대 체력 5%, 3초에 한 번)` },
  { id: 'brand', name: '낙인', grade: 'gold', max: 3, tag: '효과', desc: l => `타격이 낙인을 쌓고 3중첩이면 터짐 (위력 ${[60, 90, 120][l - 1]}%)` },
  { id: 'overcharge', name: '덧충전', grade: 'prism', max: 1, tag: '효과', desc: () => '대시·액티브 2회 충전, 처치 시 1회 충전' },
  // 패링 규칙
  { id: 'catch', name: '칼날 받이', grade: 'silver', max: 1, tag: '패링', desc: () => '패링 판정 +0.06초' },
  { id: 'topple', name: '무너뜨리기', grade: 'silver', max: 1, tag: '패링', desc: () => '체간 피해 +40%' },
  { id: 'chainparry', name: '연속 응수', grade: 'gold', max: 1, tag: '패링', desc: () => '4초 안에 패링을 이어 성공할 때마다 반격 위력 +30% (최대 3중첩)' },
  { id: 'repay', name: '되갚음', grade: 'gold', max: 1, tag: '패링', desc: () => '반격이 튕겨 낸 공격 위력의 150%를 추가 피해로 줌' },
  { id: 'redsteel', name: '붉은 쇠', grade: 'prism', max: 1, tag: '패링', desc: () => '붉은 공격도 패링 가능, 대신 패링 판정 -0.04초' },
  { id: 'groggyhunt', name: '그로기 사냥', grade: 'prism', max: 1, tag: '패링', desc: () => '결정타 피해 2배, 그로기 시간 +1초' },
  // 그 밖의 규칙
  { id: 'thirst', name: '피의 갈증', grade: 'silver', max: 1, tag: '규칙', desc: () => '적을 처치하면 체력 2 회복' },
  { id: 'gale', name: '질풍 발', grade: 'silver', max: 1, tag: '규칙', desc: () => '대시 후 1초 동안 이동 +30%, 대시 찌르기 피해 +50%' },
  { id: 'plate', name: '철갑', grade: 'silver', max: 1, tag: '규칙', desc: () => '받는 피해 -12%' },
  { id: 'regular', name: '단골 손님', grade: 'silver', max: 1, tag: '규칙', desc: () => '상점 가격 -20%, 상점마다 새로고침 무료 1회' },
  { id: 'star', name: '별의 문장', grade: 'silver', max: 1, tag: '규칙', desc: () => '다음 증강 선택 카드 1장이 한 등급 위로 나옴' },
  { id: 'cycle', name: '잿불 순환', grade: 'gold', max: 1, tag: '규칙', desc: () => '궁극기를 쓴 뒤 5초 동안 피해 +30%' },
  { id: 'finisher', name: '마무리 장인', grade: 'gold', max: 1, tag: '규칙', desc: () => '3타 피해 +60%, 3타 포이즈 피해 2배' },
  { id: 'fate', name: '운명 저울', grade: 'gold', max: 1, tag: '규칙', desc: () => '치명 확률 +15%, 치명 피해 +50%' },
  { id: 'moon', name: '달의 예언', grade: 'gold', max: 1, tag: '규칙', desc: () => '다음 증강 선택 카드 3장이 모두 한 등급 위로 나옴' },
  { id: 'saga', name: '불타는 서사', grade: 'prism', max: 1, tag: '규칙', desc: () => '다음 계층보스 프리즘 증강 화면이 4장, 그 전까지 받는 피해 +10%' },
];
const AUG = Object.fromEntries(AUGMENTS.map(a => [a.id, a]));

// 증강 시너지: 두 증강을 함께 가지면 켜져요 (8장)
const SYNERGIES = [
  { id: 'thermal', name: '열충격', need: ['flame', 'frost'], desc: '화상 중인 적이 빙결되면 터져 주변에 화염 피해 (화상 중첩 × 12)' },
  { id: 'overheat', name: '과열 회로', need: ['flame', 'thunder'], desc: '감전된 적이 받는 화상 피해 +50%' },
  { id: 'supercond', name: '초전도', need: ['frost', 'thunder'], desc: '둔화된 적에게서 번개가 1명 더 튐' },
  { id: 'bladestorm', name: '검기 폭풍', need: ['pierce', 'fork'], desc: '검기 위력 +30%, 검기가 더 커짐' },
  { id: 'finisherwave', name: '마무리 검기', need: ['finisher', 'pierce'], desc: '3타 검기 위력 +50%' },
  { id: 'doublebrand', name: '겹낙인', need: ['echo', 'brand'], desc: '메아리 타격도 낙인을 쌓음' },
  { id: 'executioner', name: '처형인', need: ['cut', 'groggyhunt'], desc: '그로기 중인 적은 끊어내기 기준 +10%' },
  { id: 'master', name: '응수의 달인', need: ['chainparry', 'repay'], desc: '연속 응수 2중첩 이상이면 되갚음 150% → 250%' },
  { id: 'ironwall', name: '철벽', need: ['catch', 'redsteel'], desc: '붉은 쇠의 패링 판정 감소(-0.04초)가 사라짐' },
  { id: 'galecharge', name: '질풍 충전', need: ['overcharge', 'gale'], desc: '대시 찌르기로 적을 처치하면 회전베기 1회 충전' },
];
const SYN = Object.fromEntries(SYNERGIES.map(s => [s.id, s]));
function synOf(augId) { return SYNERGIES.filter(s => s.need.includes(augId)); }

// 9.2 동작 각인: 자리 7개
const SLOTS = [
  { k: 'dash', name: '대시', kind: 'body', links: ['a1'], x: 0, y: 0 },
  { k: 'a1', name: '1타', kind: 'blade', links: ['dash', 'a2'], x: 1, y: 0 },
  { k: 'a2', name: '2타', kind: 'blade', links: ['a1', 'a3'], x: 2, y: 0 },
  { k: 'a3', name: '3타', kind: 'blade', links: ['a2', 'counter'], x: 3, y: 0 },
  { k: 'counter', name: '반격', kind: 'riposte', links: ['parry', 'a3'], x: 3, y: 1 },
  { k: 'parry', name: '패링', kind: 'riposte', links: ['counter'], x: 2, y: 1 },
  { k: 'core', name: '심', kind: 'core', links: ['dash', 'a1', 'a2', 'a3', 'counter', 'parry'], x: 0, y: 1 },
];
const SLOT = Object.fromEntries(SLOTS.map(s => [s.k, s]));
const CHAINS = [ // 이어진 셋 → 끝 동작
  { seq: ['dash', 'a1', 'a2'], end: 'a2' },
  { seq: ['a1', 'a2', 'a3'], end: 'a3' },
  { seq: ['parry', 'counter', 'a3'], end: 'a3' },
];
const KIND = { blade: '칼 인장', body: '몸 인장', riposte: '응수 인장', core: '심 인장', wander: '떠돌이 인장' };
const KIND_SLOTS = { blade: ['a1', 'a2', 'a3'], body: ['dash'], riposte: ['parry', 'counter'], core: ['core'], wander: ['a1', 'a2', 'a3', 'dash', 'parry', 'counter', 'core'] };
const SLOT_UNLOCK_ORDER = ['a2', 'dash', 'a3', 'counter'];

// 인장 (아이템). 숫자와 이미 있는 상태에만 반응해요. 상태는 증강이 만들어요.
// base: 늘 걸리는 능력치. at[자리]: 그 자리에 새겼을 때 그 동작에 붙는 효과.
// 동작 효과 필드: dmg(피해 +비율), crit(치명 +), poise(포이즈·체간 +비율), vs:{burn,chill,shock,elite,groggy}(그 상태의 적에게 피해 +)
const ITEMS = [
  { id: 'emberawl', name: '불씨 송곳', kind: 'blade', elem: 'fire', form: '지속', price: 100, base: { firePow: 8 },
    at: { a1: { vs: { burn: 0.25 } }, a2: { dmg: 0.15 }, a3: { vs: { burn: 0.4 } } } },
  { id: 'frostawl', name: '서리 송곳', kind: 'blade', elem: 'ice', form: '지속', price: 100, base: { icePow: 8, maxHp: 10 },
    at: { a1: { crit: 0.2, critVs: 'chill' }, a2: { dmg: 0.15 }, a3: { vs: { chill: 0.4 } } } },
  { id: 'boltnail', name: '벼락 못', kind: 'blade', elem: 'light', form: '지속', price: 100, base: { lightPow: 8 },
    at: { a1: { vs: { shock: 0.25 } }, a2: { dmg: 0.15 }, a3: { vs: { shock: 0.4 } } } },
  { id: 'wristband', name: '연타의 손목띠', kind: 'blade', elem: 'phys', form: '지속', price: 100, base: { atkSpd: 0.1, physDmg: 0.05 },
    at: { a1: { dmg: 0.2 }, a2: { dmg: 0.25 }, a3: { poise: 0.5 } } },
  { id: 'weight', name: '무거운 추', kind: 'blade', elem: 'phys', form: '대형', price: 150, base: { physDmg: 0.3, atkSpd: -0.1 },
    at: { a1: { poise: 0.5 }, a2: { poise: 0.5 }, a3: { poise: 1.0 } } },
  { id: 'hunter', name: '사냥꾼의 표식', kind: 'wander', elem: 'phys', form: '지속', price: 100, base: { crit: 0.1, physDmg: 0.05 },
    at: { any: { vs: { elite: 0.15 } } } },
  { id: 'coin', name: '행운 동전', kind: 'wander', elem: 'none', form: '지속', price: 80, base: { crit: 0.05, shardMul: 0.1 },
    at: { any: { crit: 0.05 } } },
  { id: 'rodcloak', name: '피뢰침 망토', kind: 'body', elem: 'light', form: '지속', price: 100, base: { lightPow: 10, move: 0.05 },
    at: { dash: { vs: { shock: 0.8 } } } },
  { id: 'sprint', name: '질주 신발', kind: 'body', elem: 'phys', form: '지속', price: 100, base: { move: 0.1 },
    at: { dash: { dmg: 0.6, dashCd: -0.15 } } },
  { id: 'frostprint', name: '서리 발자국', kind: 'body', elem: 'ice', form: '지속', price: 100, base: { icePow: 8 },
    at: { dash: { vs: { chill: 0.8 } } } },
  { id: 'gauntlet', name: '맞받이 장갑', kind: 'riposte', elem: 'phys', form: '지속', price: 100, base: { maxHp: 10, atkSpd: 0.05 },
    at: { parry: { guard: 0.3 }, counter: { dmg: 0.4 } } },
  { id: 'crackham', name: '균열 망치', kind: 'riposte', elem: 'phys', form: '대형', price: 150, base: { poise: 0.5 },
    at: { parry: { poise: 0.5 }, counter: { vs: { groggy: 0.2 } } } },
  { id: 'embermirror', name: '잿불 거울', kind: 'riposte', elem: 'fire', form: '지속', price: 100, base: { firePow: 8 },
    at: { parry: { poise: 0.5, poiseVs: 'burn' }, counter: { vs: { burn: 0.6 } } } },
  { id: 'crown', name: '잿불 왕관', kind: 'core', elem: 'fire', form: '대형', price: 150, base: { firePow: 40, fireDmg: 0.3 }, at: { core: {} } },
  { id: 'glass', name: '유리 심장', kind: 'core', elem: 'none', form: '대형', price: 150, base: { dmg: 0.25, maxHpMul: -0.3 }, at: { core: {} } },
  { id: 'steelcore', name: '강철 심', kind: 'core', elem: 'phys', form: '대형', price: 150, base: { physDmg: 0.25, poise: 0.3 }, at: { core: {} } },
  { id: 'icecore', name: '얼음 심장', kind: 'core', elem: 'ice', form: '대형', price: 150, base: { icePow: 40, chillAmp: 0.15 }, at: { core: {} } },
  { id: 'stormcore', name: '뇌정 심장', kind: 'core', elem: 'light', form: '대형', price: 150, base: { lightPow: 40, shockBounce: 1 }, at: { core: {} } },
];
const ITEM = Object.fromEntries(ITEMS.map(i => [i.id, i]));
const STAT_NAMES = { firePow: '화염 위력', icePow: '냉기 위력', lightPow: '번개 위력', maxHp: '최대 체력', atkSpd: '공격 속도', physDmg: '물리 피해', crit: '치명', shardMul: '파편 획득', move: '이동 속도', poise: '포이즈·체간 피해', fireDmg: '화염 피해', dmg: '모든 피해', maxHpMul: '최대 체력', chillAmp: '둔화된 적 피해', shockBounce: '번개 튐 횟수' };
const PCT_STATS = new Set(['atkSpd', 'physDmg', 'crit', 'shardMul', 'move', 'poise', 'fireDmg', 'dmg', 'maxHpMul', 'chillAmp']);

function fmtStat(k, v) { return `${STAT_NAMES[k] || k} ${v >= 0 ? '+' : ''}${PCT_STATS.has(k) ? Math.round(v * 100) + '%' : Math.round(v * 10) / 10}`; }
const VS_NAME = { burn: '화상 중인 적', chill: '둔화된 적', shock: '감전된 적', elite: '정예·보스', groggy: '그로기 중인 적' };
function fmtAt(e) {
  if (!e) return '';
  const out = [];
  if (e.dmg) out.push(`피해 +${Math.round(e.dmg * 100)}%`);
  if (e.crit) out.push(`${e.critVs ? VS_NAME[e.critVs] + '에게 ' : ''}치명 +${Math.round(e.crit * 100)}%`);
  if (e.poise) out.push(`${e.poiseVs ? VS_NAME[e.poiseVs] + '에게 ' : ''}체간 +${Math.round(e.poise * 100)}%`);
  if (e.dashCd) out.push(`대시 쿨다운 ${Math.round(e.dashCd * 100)}%`);
  if (e.guard) out.push(`패링 뒤 2초 받는 피해 -${Math.round(e.guard * 100)}%`);
  if (e.vs) for (const k in e.vs) out.push(`${VS_NAME[k]}에게 피해 +${Math.round(e.vs[k] * 100)}%`);
  return out.join(', ') || '효과 없음';
}

// 5.4 적
// 섬광: white=패링 가능, gold=패링하면 바로 그로기(정예·보스), red=패링 불가
const ENEMIES = {
  grunt: { name: '돌격병', hp: 40, spd: 150, r: 18, dmg: 10, col: '#d65a5a', weak: 'fire', res: null, poise: 20 },
  wisp: { name: '원혼불', hp: 28, spd: 90, r: 15, dmg: 9, col: '#8f7bff', weak: 'phys', res: 'ice', poise: 10 },
  brute: { name: '강타수', hp: 140, spd: 80, r: 30, dmg: 20, col: '#b8743a', weak: 'ice', res: 'phys', poise: 70, armor: true },
  shield: { name: '방패병', hp: 80, spd: 95, r: 22, dmg: 12, col: '#7a8aa0', weak: 'light', res: 'phys', poise: 40, shield: true },
  bomber: { name: '자폭병', hp: 24, spd: 210, r: 16, dmg: 26, col: '#e0b030', weak: 'ice', res: 'fire', poise: 10 },
  healer: { name: '치유사', hp: 50, spd: 85, r: 17, dmg: 6, col: '#5fc98a', weak: 'light', res: null, poise: 15 },
  merchant: { name: '보물 상인', hp: 60, spd: 230, r: 16, dmg: 0, col: '#ffd86b', weak: null, res: null, poise: 99 },
};

// 적 조합 (5.4 예시를 바탕으로)
const COMPOS = {
  easy: [
    { name: '돌격 떼', list: ['grunt', 'grunt', 'grunt', 'grunt', 'grunt'], size: 's' },
    { name: '불씨 행렬', list: ['grunt', 'grunt', 'wisp', 'wisp'], size: 's' },
    { name: '경계 초소', list: ['grunt', 'grunt', 'grunt', 'wisp'], size: 's' },
    { name: '자폭 시험', list: ['bomber', 'grunt', 'grunt', 'grunt'], size: 's' },
  ],
  normal: [
    { name: '방패벽', list: ['shield', 'shield', 'wisp', 'wisp'], size: 'm' },
    { name: '자폭 행렬', list: ['bomber', 'bomber', 'bomber', 'grunt', 'grunt'], size: 'm' },
    { name: '결투', list: ['brute', 'wisp', 'wisp'], size: 'm' },
    { name: '치유 진영', list: ['healer', 'shield', 'grunt', 'grunt', 'wisp'], size: 'm' },
    { name: '포위', list: ['grunt', 'grunt', 'grunt', 'wisp', 'wisp', 'bomber'], size: 'm', spawn: 'wave' },
    { name: '무거운 선봉', list: ['brute', 'grunt', 'grunt', 'grunt'], size: 'm' },
  ],
  elite: [
    { name: '버티는 진영', list: ['brute', 'shield', 'shield', 'wisp'], size: 'l' },
    { name: '이중 강타', list: ['brute', 'brute', 'healer'], size: 'm' },
    { name: '매복', list: ['grunt', 'grunt', 'grunt', 'grunt', 'bomber', 'bomber'], size: 'm', spawn: 'ambush' },
    { name: '탄막', list: ['wisp', 'wisp', 'wisp', 'wisp', 'shield'], size: 'l' },
    { name: '혼성 부대', list: ['brute', 'shield', 'healer', 'grunt', 'grunt', 'wisp'], size: 'l', spawn: 'wave' },
    { name: '자폭 돌격', list: ['bomber', 'bomber', 'bomber', 'bomber', 'brute'], size: 'm' },
  ],
};
const ARENA_SIZE = { s: [1500, 840], m: [1900, 1150], l: [2300, 1400] };

// 5.5 층 변형자
const MODIFIERS = [
  { id: 'horde', name: '무리', heavy: false, desc: '적 수 ×2, 적 체력 ×0.6' },
  { id: 'haste', name: '가속', heavy: false, desc: '적 이동·공격 속도 +20%' },
  { id: 'chainboom', name: '연쇄 폭발', heavy: false, desc: '적이 죽을 때 작은 폭발 (적에게도 피해)' },
  { id: 'dark', name: '어둠', heavy: true, desc: '플레이어 주변만 보임' },
  { id: 'chief', name: '우두머리', heavy: true, desc: '강한 적 하나가 살아 있는 동안 다른 적 피해 +30%' },
];
const MOD = Object.fromEntries(MODIFIERS.map(m => [m.id, m]));

// 3.3 계층 테마 (프로토타입용 임시)
const TIERS = [
  { name: '1계층', floor: '#23222b', line: '#2f2d3a', accent: '#c9a36b', puddle: null },
  { name: '2계층', floor: '#1b2530', line: '#243445', accent: '#6fb7d9', puddle: 'water' },
  { name: '3계층', floor: '#2a1e1a', line: '#3a2a22', accent: '#e07a3c', puddle: 'oil' },
];

// 보스 (설정은 기획자가 나중에 제공 → 지금은 임시 이름·공통 패턴)
const BOSSES = {
  mid: { name: '중간보스', hp: 1100, r: 44, col: '#c05050', patterns: ['combo', 'charge', 'fan', 'slam'] },
  tier: { name: '계층보스', hp: 1900, r: 52, col: '#9a4fd0', patterns: ['combo', 'charge', 'fan', 'slam', 'sweep', 'summon'] },
  final: { name: '최종 보스', hp: 4200, r: 58, col: '#e0e0f0', patterns: ['combo', 'charge', 'fan', 'slam', 'sweep', 'summon'] },
};
