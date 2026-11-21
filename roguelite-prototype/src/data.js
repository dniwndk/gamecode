'use strict';
// ───────── 데이터: 축복, 등급, 적, 변형자 (계약·태그는 contracts.js) ─────────
// 수치는 설계서(game-design.md)의 기본값을 따르고, 없는 값은 프로토타입용 초안이에요.

const ELEM = {
  phys: { name: '물리', col: '#f2f2f2' },
  fire: { name: '화염', col: '#ff8a3d' },
  ice: { name: '냉기', col: '#7fd8ff' },
  light: { name: '번개', col: '#ffe45c' },
  water: { name: '물', col: '#4aa8ff' },
  earth: { name: '대지', col: '#c49a5a' },
  wind: { name: '바람', col: '#a8f0c8' },
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
  { id: 'focus', name: '집중', desc: '방어 판정 +0.01초 (최대 +0.05초)', apply: s => s.parryWin = Math.min(s.parryWinBase + 0.05, s.parryWin + 0.01) },
];

const GRADE = { silver: { name: '실버', col: '#c9d1dc' }, gold: { name: '골드', col: '#f2c14e' }, prism: { name: '프리즘', col: '#e78bff' } };

// 5.4 적
// 섬광: white=방어 가능, gold=강공격(방어하면 긴 경직), red=방어 불가
const ENEMIES = {
  grunt: { name: '돌격병', hp: 40, spd: 150, r: 18, dmg: 10, col: '#d65a5a', weak: 'fire', res: null, poise: 20 },
  wisp: { name: '원혼불', hp: 28, spd: 90, r: 15, dmg: 9, col: '#8f7bff', weak: 'phys', res: 'ice', poise: 10 },
  brute: { name: '강타수', hp: 140, spd: 80, r: 30, dmg: 20, col: '#b8743a', weak: 'ice', res: 'phys', poise: 70, armor: true },
  shield: { name: '방패병', hp: 80, spd: 95, r: 22, dmg: 12, col: '#7a8aa0', weak: 'light', res: 'phys', poise: 40, shield: true },
  bomber: { name: '자폭병', hp: 24, spd: 210, r: 16, dmg: 26, col: '#e0b030', weak: 'ice', res: 'fire', poise: 10 },
  healer: { name: '치유사', hp: 50, spd: 85, r: 17, dmg: 6, col: '#5fc98a', weak: 'light', res: null, poise: 15 },
  sniper: { name: '저격수', hp: 34, spd: 100, r: 15, dmg: 13, col: '#e06fa8', weak: 'phys', res: 'light', poise: 12 },
  splitter: { name: '분열체', hp: 64, spd: 115, r: 25, dmg: 10, col: '#6fc7b0', weak: 'fire', res: null, poise: 30 },
  mite: { name: '분열 조각', hp: 14, spd: 215, r: 12, dmg: 6, col: '#9fe0cf', weak: 'fire', res: null, poise: 6 },
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
    { name: '저격 진지', list: ['sniper', 'sniper', 'shield', 'grunt', 'grunt'], size: 'm' },
    { name: '분열 무리', list: ['splitter', 'splitter', 'grunt', 'grunt'], size: 'm' },
    { name: '엄호 사격', list: ['sniper', 'splitter', 'wisp', 'grunt', 'grunt'], size: 'm' },
  ],
  elite: [
    { name: '버티는 진영', list: ['brute', 'shield', 'shield', 'wisp'], size: 'l' },
    { name: '이중 강타', list: ['brute', 'brute', 'healer'], size: 'm' },
    { name: '매복', list: ['grunt', 'grunt', 'grunt', 'grunt', 'bomber', 'bomber'], size: 'm', spawn: 'ambush' },
    { name: '탄막', list: ['wisp', 'wisp', 'wisp', 'wisp', 'shield'], size: 'l' },
    { name: '혼성 부대', list: ['brute', 'shield', 'healer', 'grunt', 'grunt', 'wisp'], size: 'l', spawn: 'wave' },
    { name: '자폭 돌격', list: ['bomber', 'bomber', 'bomber', 'bomber', 'brute'], size: 'm' },
    { name: '십자 포화', list: ['sniper', 'sniper', 'sniper', 'brute', 'wisp'], size: 'l' },
    { name: '끝없는 분열', list: ['splitter', 'splitter', 'splitter', 'healer'], size: 'm' },
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
  mid: { name: '중간보스', hp: 1100, r: 44, col: '#c05050', patterns: ['combo', 'charge', 'fan', 'slam', 'rain', 'ring'] },
  tier: { name: '계층보스', hp: 1900, r: 52, col: '#9a4fd0', patterns: ['combo', 'charge', 'fan', 'slam', 'sweep', 'summon', 'rain', 'ring'] },
  final: { name: '최종 보스', hp: 4200, r: 58, col: '#e0e0f0', patterns: ['combo', 'charge', 'fan', 'slam', 'sweep', 'summon', 'rain', 'ring'] },
};
