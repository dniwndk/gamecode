// 기획서(docs/GDD_v2.1.md + docs/GDD_v2.2_amendment.md)의 표를 읽어 src/content/*.json 카탈로그를 만든다.
// 기획서가 바뀌면 다시 돌린다: npm run content:extract
// --check 를 주면 파일을 쓰지 않고, 지금 저장소의 JSON이 기획서와 같은지만 본다(다르면 exit 1).
//
// 원칙
// - 숫자·ID·연결은 표에서 그대로 읽는다. 못 읽으면 추측하지 않고 오류로 멈춘다.
// - 효과 본문(한국어)은 사람이 읽는 명세(spec)로만 보관한다. 실행 연산(handlers)은 M3에서 채운다.
// - v2.2 개정안이 v2.1의 같은 항목을 대체한다(개정안 머리말의 해석 순서).
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DOCS = join(ROOT, 'docs');
const OUT = join(ROOT, 'src/content');
const CHECK = process.argv.includes('--check');

const v21Text = readFileSync(join(DOCS, 'GDD_v2.1.md'), 'utf8');
const v22Text = readFileSync(join(DOCS, 'GDD_v2.2_amendment.md'), 'utf8');
const v21 = v21Text.split('\n');
const v22 = v22Text.split('\n');

function fail(msg) {
  console.error(`extract-content: ${msg}`);
  process.exit(1);
}
const sha256 = (s) => createHash('sha256').update(s).digest('hex');
const cells = (line) => line.split('|').slice(1, -1).map((c) => c.trim());
const unticked = (s) => s.replace(/`/g, '').trim();
const unbold = (s) => s.replace(/\*\*/g, '').trim();
const ids = (s, prefix) => [...s.matchAll(new RegExp(`\\b${prefix}[a-z0-9_]+`, 'g'))].map((m) => m[0]);

/** 제목 줄(정확히 일치)부터 다음 같은 수준 이상의 제목 전까지의 줄 */
function section(lines, heading) {
  const start = lines.findIndex((l) => l.trim() === heading);
  if (start < 0) fail(`제목을 찾지 못함: ${heading}`);
  const level = heading.match(/^#+/)[0].length;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    const m = lines[i].match(/^(#+) /);
    if (m && m[1].length <= level) { end = i; break; }
  }
  return lines.slice(start + 1, end);
}
const tableRows = (lines, firstCellPrefix) => lines.filter((l) => l.startsWith(`| ${firstCellPrefix}`)).map(cells);

// ───────────────────────── 유닛 ─────────────────────────
const SLOT = {
  '전방 기본 공격': 'basic',
  '전방 전투 스킬': 'skill',
  '전방 필살기': 'ultimate',
  '전방 패시브': 'frontEffects',
  '후방 정기 지원': 'rearAction',
  '후방 반응 지원': 'rearEffects',
};
const appendixA = section(v21, '## 부록 A. 60유닛 마스터와 능력 연결');
const v22UnitRows = new Map(tableRows(section(v22, '## 5. 유닛 마스터 v2.2 (태그만 바뀜)'), '`u_').map((c) => [unticked(c[0]), c]));

const units = tableRows(appendixA, '`u_').map((c) => {
  const id = unticked(c[0]);
  const [hp, atk, def, spd, crit, critDmg] = c[4].split('/').map((x) => Number(x.trim()));
  if ([hp, atk, def, spd, crit, critDmg].some((n) => !Number.isFinite(n))) fail(`${id} 스탯을 읽지 못함: ${c[4]}`);
  const v22Row = v22UnitRows.get(id);
  if (!v22Row) fail(`v2.2 유닛 표에 ${id} 없음`);
  if (Number(v22Row[2]) !== Number(c[2]) || v22Row[3] !== c[3]) fail(`${id}: v2.2 표의 코스트/구역이 v2.1과 다름`);

  const detail = section(appendixA, `### A.${id} — ${c[1]}`);
  const role = (detail.find((l) => l.startsWith('역할: ')) ?? '').replace(/^역할: /, '').replace(/ 원안 상세 시작 행: .*$/, '').replace(/\.$/, '');
  const abilityIds = { basic: null, skill: null, ultimate: null, frontEffects: [], rearAction: null, rearEffects: [] };
  for (const row of detail.filter((l) => l.startsWith('| ')).map(cells)) {
    const key = SLOT[row[0]];
    if (!key) continue;
    const effs = ids(row[1], 'eff_');
    if (effs.length === 0) fail(`${id} ${row[0]} 칸에 효과 ID 없음`);
    if (Array.isArray(abilityIds[key])) abilityIds[key].push(...effs);
    else if (effs.length !== 1 || abilityIds[key] !== null) fail(`${id} ${row[0]} 칸이 하나가 아님`);
    else abilityIds[key] = effs[0];
  }
  return {
    id,
    name: v22Row[1],
    cost: Number(c[2]),
    position: c[3],
    synergyIds: v22Row[4].split(',').map((s) => s.trim()),
    baseStats: { hp, atk, def, spd, critBps: Math.round(crit * 10000), critDamageBps: Math.round(critDmg * 10000) },
    role,
    abilityIds,
    portraitAssetId: `portrait_${id}`,
    shopEligible: true,
  };
});

// ───────────────────────── 시너지 ─────────────────────────
// 표시명: 기획서 본문이 부르는 이름(무법자 구성원, 뱅가드 피격 시 …)을 따른다. 고유 시너지는 주인 이름을 붙인다.
const SYNERGY_NAME = {
  syn_abydos: '아비도스', syn_gehenna: '게헨나', syn_millennium: '밀레니엄', syn_trinity: '트리니티',
  syn_hyakkiyako: '백귀야행', syn_shanhaijing: '산해경', syn_red_winter: '붉은겨울', syn_valkyrie: '발키리',
  syn_srt: 'SRT', syn_arius: '아리우스', syn_problem_solver: '흥신소68', syn_cc: 'C&C', syn_highlander: '하이랜더',
  syn_outlaw: '무법자 — 칠수인·헬멧단', syn_vanguard: '뱅가드', syn_striker: '스트라이커', syn_assault: '어설트',
  syn_breacher: '브리처', syn_sniper: '스나이퍼', syn_demolition: '데몰리션', syn_medic: '메딕',
  syn_tactical_support: '택티컬 서포트', syn_aegis: '이지스', syn_electro: '일렉트로', syn_commander: '커맨더',
  syn_mystic_arts: '미스틱 아츠', syn_light_armor: '경장갑', syn_heavy_armor: '중장갑', syn_special_armor: '특수장갑',
  syn_elastic_armor: '탄력장갑', syn_jackpot: '한탕',
};
// 커맨더가 세는 "14개 진영 카테고리"(10.4)
const FACTIONS = new Set(['syn_abydos', 'syn_gehenna', 'syn_millennium', 'syn_trinity', 'syn_hyakkiyako', 'syn_shanhaijing',
  'syn_red_winter', 'syn_valkyrie', 'syn_srt', 'syn_arius', 'syn_problem_solver', 'syn_cc', 'syn_highlander', 'syn_outlaw']);
const ARMOR = new Set(['syn_light_armor', 'syn_heavy_armor', 'syn_special_armor', 'syn_elastic_armor']);
const category = (id) => (FACTIONS.has(id) ? 'faction' : ARMOR.has(id) ? 'armor' : id.startsWith('syn_unique_') ? 'unique'
  : id === 'syn_jackpot' ? 'economy' : 'role');

const appendixB = section(v21, '## 부록 B. 40시너지의 단계·효과·최대 합법 편성');
const v22SynRows = new Map(tableRows(section(v22, '## 6. 시너지 41종 구성원·도달 가능성 재집계'), '`syn_').map((c) => [unticked(c[0]), c]));
const unitByShort = new Map(units.map((u) => [u.id.replace(/^u_/, ''), u]));

function parseTierCell(s) {
  return s.split(';').map((part) => {
    const m = part.trim().match(/^(\d+): (eff_[a-z0-9_]+)$/);
    if (!m) fail(`시너지 단계 칸을 읽지 못함: ${part}`);
    return { threshold: Number(m[1]), effectIds: [m[2]] };
  });
}
function synergyFromV22(id, row, tiers, tierText, scope) {
  const members = row[4].split(',').map((s) => {
    const u = unitByShort.get(s.trim());
    if (!u) fail(`${id} 구성원 ${s} 를 유닛에서 찾지 못함`);
    return u.id;
  });
  const [f, r, d] = row[2].split('/').map(Number);
  if (row[1] !== tiers.map((t) => t.threshold).join('/')) fail(`${id}: v2.2 단계 ${row[1]} ≠ 효과 단계`);
  const uniqueOwner = id.startsWith('syn_unique_') ? units.find((u) => u.id === members[0]) : null;
  return {
    id,
    name: uniqueOwner ? `고유: ${uniqueOwner.name}` : SYNERGY_NAME[id] ?? fail(`${id} 표시명 없음`),
    category: category(id),
    countScope: scope,
    tiers: tiers.map((t, i) => ({ ...t, spec: tierText[i] })),
    memberIds: members,
    documented: { frontOnly: f, rearOnly: r, dual: d, maxLegalCount: Number(row[3]) },
  };
}

const synergies = tableRows(appendixB, '`syn_').map((c) => {
  const id = unticked(c[0]);
  const tiers = parseTierCell(c[4]);
  if (c[1] !== tiers.map((t) => t.threshold).join('/')) fail(`${id}: 요구 단계 ${c[1]} ≠ 효과 단계`);
  const detail = section(appendixB, `### B.${id}`);
  const scope = (detail.find((l) => l.startsWith('집계 범위: ')) ?? '').match(/`([a-z_]+)`/)?.[1] ?? fail(`${id} 집계 범위 없음`);
  const tierText = tiers.map((t) => {
    const line = detail.find((l) => l.includes(`\`${t.effectIds[0]}\``));
    return line ? line.replace(/^- \*\*\d+명:\*\* `eff_[a-z0-9_]+` — /, '') : fail(`${id} ${t.effectIds[0]} 설명 없음`);
  });
  const row = v22SynRows.get(id) ?? fail(`v2.2 시너지 표에 ${id} 없음`);
  return synergyFromV22(id, row, tiers, tierText, scope);
});

// v2.2 신규: 한탕 (개정안 3장)
{
  const rows = tableRows(section(v22, '### 3.2 단계별 효과'), '');
  const jackpotRows = rows.filter((c) => /^\d/.test(c[0]));
  const tiers = jackpotRows.map((c) => ({ threshold: Number(c[0].match(/^\d+/)[0]), effectIds: [unticked(c[1])] }));
  const tierText = jackpotRows.map((c) => `${c[0]} — 정산: ${unbold(c[2])} / 전투: ${unbold(c[3])}`);
  synergies.push(synergyFromV22('syn_jackpot', v22SynRows.get('syn_jackpot'), tiers, tierText, 'deployed_all'));
}
if (synergies.length !== v22SynRows.size) fail(`시너지 수 ${synergies.length} ≠ v2.2 표 ${v22SynRows.size}`);

// ───────────────────────── 효과 ─────────────────────────
const EXEC = {
  'BASIC 본문 직접 실행': 'ability_basic',
  'SKILL 본문 직접 실행': 'ability_skill',
  'ULTIMATE 본문 직접 실행': 'ability_ultimate',
  'REAR 본문 직접 실행': 'ability_rear',
  '패시브/반응 컨테이너': 'passive_container',
  '시너지 컨테이너: 상시·초기·반응·주기 handler 분리': 'synergy_container',
  '장비 컨테이너: 고정 스탯 1회 + 고유 handler': 'equipment_container',
  '전략 컨테이너: 상시·반응·카운터·주기 handler 분리': 'strategy_container',
};
const appendixC = section(v21, '## 부록 C. 정식 효과 300개 실행 명세 카탈로그');
const effects = [];
for (let i = 0; i < appendixC.length; i++) {
  const h = appendixC[i].match(/^### C\.(\d{3}) `(eff_[a-z0-9_]+)`$/);
  if (!h) continue;
  const field = (name) => {
    for (let j = i + 1; j < appendixC.length && !appendixC[j].startsWith('### '); j++) {
      if (appendixC[j].startsWith(`- ${name}: `)) return appendixC[j].slice(name.length + 4);
    }
    return fail(`${h[2]}: "${name}" 줄 없음`);
  };
  const src = field('출처/구역').match(/^(.*) \/ `([a-z_]+)`\. 원안 행: (.*)\.$/) ?? fail(`${h[2]} 출처/구역 형식`);
  const exec = field('실행').match(/^\*\*(.+?)\*\*\.?\s*(.*)$/) ?? fail(`${h[2]} 실행 형식`);
  effects.push({
    id: h[2],
    catalogNo: `C.${h[1]}`,
    owner: src[1],
    scope: src[2],
    execution: EXEC[exec[1]] ?? fail(`${h[2]} 실행 종류 모름: ${exec[1]}`),
    trigger: exec[2] && !exec[2].startsWith('ActionResolver') ? exec[2].replace(/\.$/, '') : null,
    spec: field('본문'),
    limits: field('제한'),
    sourceReference: src[3] === 'v2.1 신규 복구' ? 'GDD v2.1 1.2 A03 (복구)' : `원안 v2.0 행 ${src[3]}`,
    implementation: 'spec_only',
    handlers: [],
  });
}
// v2.2 신규 효과 4개
for (const s of synergies.find((x) => x.id === 'syn_jackpot').tiers) {
  effects.push({
    id: s.effectIds[0], catalogNo: 'v2.2 3.2', owner: `syn_jackpot ${s.threshold}단계`, scope: 'deployed_all',
    execution: 'synergy_container', trigger: null, spec: s.spec,
    limits: '정산 효과는 SettlementModifier로만 반영(개정안 3.5). 전투 효과의 전투 시작 골드는 battleInput.startGold.',
    sourceReference: 'GDD v2.2 3장', implementation: 'spec_only', handlers: [],
  });
}
const kaiserRows = new Map(tableRows(section(v22, '## 4. 신규 전략 「카이저 론」 `str_kaiser_loan`'), '').map((c) => [c[0], unbold(c[1])]));
effects.push({
  id: 'eff_str_kaiser_loan', catalogNo: 'v2.2 4', owner: 'str_kaiser_loan', scope: 'global',
  execution: 'strategy_container', trigger: null,
  spec: `${kaiserRows.get('효과')}. 부족할 때: ${kaiserRows.get('부족할 때')}. 완납: ${kaiserRows.get('완납 보상')}.`,
  limits: '상환 일정은 RunState.loans[]에 남은 횟수·금액으로 저장(개정안 4장).',
  sourceReference: 'GDD v2.2 4장', implementation: 'spec_only', handlers: [],
});

// ───────────────────────── 장비 ─────────────────────────
const STAT_KEY = { HP: 'hp', ATK: 'atk', DEF: 'def', SPD: 'spd', CRIT: 'critBps', CRIT_DMG: 'critDamageBps' };
function parseStats(s) {
  const out = {};
  for (const part of s.split(',')) {
    const m = part.trim().match(/^(CRIT_DMG|CRIT|HP|ATK|DEF|SPD) \+([\d.]+)$/);
    if (!m) fail(`장비 고정 능력치를 읽지 못함: ${part}`);
    const key = STAT_KEY[m[1]];
    out[key] = key.endsWith('Bps') ? Math.round(Number(m[2]) * 10000) : Number(m[2]);
  }
  return out;
}
function chapters(s) {
  const m = s.match(/(\d)~(\d)장/) ?? s.match(/(\d)장/);
  if (!m) fail(`장 범위를 읽지 못함: ${s}`);
  const [a, b] = [Number(m[1]), Number(m[2] ?? m[1])];
  return Array.from({ length: b - a + 1 }, (_, k) => a + k);
}
const equipment = tableRows(section(v21, '### D.1 장비 목록 (총 12종)'), '`eq_').map((c) => ({
  id: unticked(c[0]),
  name: unbold(c[1]),
  zone: unticked(c[2]),
  stats: parseStats(c[3]),
  effectIds: ids(c[4], 'eff_'),
  uniquePerUnit: unticked(c[5]) === 'true',
  chapters: chapters(c[6]),
  recommendation: c[7],
  description: c[8],
}));

// ───────────────────────── 전략 ─────────────────────────
// 보유 조건이 붙은 두 전략은 문장을 구조화한다(DECISIONS.md D-006).
const OWNED_CONDITION = {
  str_rear_command_net: { positions: ['rear_only', 'dual'], anyTagOf: null, minCount: 2 },
  str_iron_frontline: { positions: ['front_only', 'dual'], anyTagOf: ['syn_vanguard', 'syn_heavy_armor'], minCount: 2 },
};
function strategyOffer(id, cond) {
  if (/^1~3장 시작 시 조건 없이/.test(cond)) return { chapters: [1, 2, 3], ownedCondition: null };
  if (/^2~3장 시작 시 등장$/.test(cond)) return { chapters: [2, 3], ownedCondition: null };
  if (OWNED_CONDITION[id]) return { chapters: [2, 3], ownedCondition: { ...OWNED_CONDITION[id], chapters: [1, 2, 3] } };
  if (/^1~2장 시작/.test(cond)) return { chapters: [1, 2], ownedCondition: null };
  return fail(`${id} 제안 조건을 읽지 못함: ${cond}`);
}
const strategies = tableRows(section(v21, '### D.2 전역 전략 목록 (총 12종)'), '`str_').map((c) => ({
  id: unticked(c[0]),
  name: unbold(c[1]),
  offer: strategyOffer(unticked(c[0]), c[2]),
  offerText: c[2],
  effectIds: ids(c[3], 'eff_'),
  benefit: c[4],
  drawback: c[5],
  stacking: c[6],
  generalPurpose: c[7].startsWith('예'),
}));
strategies.push({
  id: 'str_kaiser_loan',
  name: kaiserRows.get('이름'),
  offer: strategyOffer('str_kaiser_loan', kaiserRows.get('제안 조건')),
  offerText: kaiserRows.get('제안 조건'),
  effectIds: ['eff_str_kaiser_loan'],
  benefit: kaiserRows.get('효과'),
  drawback: kaiserRows.get('약점'),
  stacking: '중복 획득 불가',
  generalPurpose: false,
});

// ───────────────────────── 적 ─────────────────────────
const enemies = tableRows(section(v21, '### E.1 적 및 보스 마스터 정의 (총 13종: 일반·정예 10종 + 보스 3종)'), '`').map((c) => {
  const id = unticked(c[0]);
  const m = c[3].match(/^HP (\d+) \/ ATK (\d+) \/ DEF (\d+) \/ SPD (\d+)$/) ?? fail(`${id} 스탯 형식: ${c[3]}`);
  return {
    id,
    name: unbold(c[1]),
    zone: unticked(c[2]),
    boss: id.startsWith('boss_'),
    // 적 치명타는 표에 없다. 0%/+50%로 둔다(DECISIONS.md D-005).
    baseStats: { hp: +m[1], atk: +m[2], def: +m[3], spd: +m[4], critBps: 0, critDamageBps: 5000 },
    effectIds: ids(c[4], 'eff_'),
    ai: c[5],
    role: c[6],
    counterplay: c[7],
  };
});

// ───────────────────────── 노드 ─────────────────────────
const NODE_TYPE = { 일반: 'normal', 정예: 'elite', 보스: 'boss' };
function parseFormation(text, nodeId) {
  const [frontPart, rearPart = ''] = text.split(/\s*\/\s*후방:\s*/);
  const parse = (part) => {
    const slots = [];
    const re = /\b((?:en|boss)_[a-z0-9_]+)(?:\s*×\s*(\d+)\s*\((?:슬롯\s*)?([\d,\s]+)\)|\((\d+)\))/g;
    for (const m of part.matchAll(re)) {
      const list = m[4] ? [Number(m[4])] : m[3].split(',').map((x) => Number(x.trim()));
      if (m[2] && Number(m[2]) !== list.length) fail(`${nodeId}: ${m[1]} × ${m[2]}인데 슬롯 ${list.length}개`);
      for (const slot of list) slots.push({ enemyId: m[1], slot });
    }
    return slots;
  };
  const front = parse(frontPart).map((s) => ({ enemyId: s.enemyId, index: s.slot - 1 }));
  const rear = parse(rearPart).map((s) => ({ enemyId: s.enemyId, index: s.slot - 5 }));
  if (front.length === 0) fail(`${nodeId}: 전방 편성을 읽지 못함: ${text}`);
  return { front, rear };
}
const nodes = tableRows(section(v21, '### E.2 15개 진행 노드(1장 1전투 ~ 3장 5전투) 전체 정의'), '`node_').map((c) => {
  const id = unticked(c[0]);
  const [, chapter, battle] = id.match(/^node_(\d)_(\d)$/) ?? fail(`노드 ID 형식: ${id}`);
  const candidates = [];
  for (const part of c[3].split('<br>')) {
    const m = part.match(/^\*\*([AB]):\*\*\s*(.*)$/) ?? fail(`${id} 후보 형식: ${part}`);
    if (/^\(.*고정.*\)$/.test(m[2].trim())) continue; // 정예/보스의 B칸 = "고정 편성" 안내문
    const label = m[2].match(/^([AB]안\(([^)]*)\)|[^:]+):/);
    const body = m[2].slice(m[2].indexOf(':') + 1).trim();
    candidates.push({ id: m[1], label: label?.[2] ?? label?.[1]?.trim() ?? m[1], ...parseFormation(body, id) });
  }
  const scale = c[4].match(/×\s*([\d.]+)/) ?? fail(`${id} 배율 형식: ${c[4]}`);
  const threats = Object.fromEntries(c[5].split(/\s*\/\s*(?=[AB]안:)/).map((t) => {
    const m = t.match(/^([AB])안:\s*(.*)$/);
    return m ? [m[1], m[2]] : ['A', t];
  }));
  return {
    id,
    chapter: Number(chapter),
    battle: Number(battle),
    type: NODE_TYPE[unticked(unbold(c[2]))] ?? fail(`${id} 유형: ${c[2]}`),
    statScaleBps: Math.round(Number(scale[1]) * 10000),
    candidates: candidates.map((k) => ({ ...k, threat: threats[k.id] ?? threats.A })),
  };
});

// ───────────────────────── 상태 ─────────────────────────
const statusIds = [...new Set([...v21Text.matchAll(/\bst_[a-z_]+/g)].map((m) => m[0]))].sort();
const statusRules = new Map(tableRows(section(v21, '### 8.4 상태 규칙'), '`st_').map((c) => [unticked(c[0]), c[1]]));
const statuses = statusIds.map((id) => ({ id, rule: statusRules.get(id) ?? null }));

// ───────────────────────── 규칙 수치 ─────────────────────────
const odds = tableRows(section(v21, '### 5.1 레벨별 확률과 XP'), '').filter((c) => /^\d+$/.test(c[0])).map((c) => ({
  level: Number(c[0]),
  costOddsPct: c.slice(2, 7).map(Number),
}));
const xpRow = tableRows(section(v22, '### 1.2 레벨별 XP (v2.1 5.1의 "다음 XP" 열만 교체)'), '다음 XP (v2.2)')[0] ?? fail('v2.2 XP 줄 없음');
const levelHeader = tableRows(section(v22, '### 1.2 레벨별 XP (v2.1 5.1의 "다음 XP" 열만 교체)'), '레벨')[0];
const xpToNext = Object.fromEntries(levelHeader.slice(1).map((lv, k) => [lv, xpRow[k + 1] === '—' ? null : Number(unbold(xpRow[k + 1]))]));

const rules = {
  rulesVersion: 'ktfr-rules-2.2.0',
  source: 'GDD v2.1 4.1·5장 + v2.2 1장. 표에서 직접 읽은 값은 shop.levels/xpToNext, 나머지는 해당 절의 확정 초기값.',
  run: {
    chapters: 3, battlesPerChapter: 5,
    startRunHp: 80, startGold: 10, startLevel: 3, startXp: 0, maxLevel: 10,
    startingUnits: { count: 3, cost: 1, minFrontCapable: 2 },
  },
  board: { frontSlots: 4, rearSlots: 6, benchSlots: 9, maxDeployed: 10 },
  shop: { slots: 5, rerollCost: 2, recommendedSlotIndex: 4, recommendedModeChanceBps: 5000, levels: odds },
  xp: { buyCostGold: 4, buyAmount: 4, perBattle: 3, xpToNext },
  income: {
    baseByChapter: [6, 7, 8], winBonus: 1,
    streakBonus: [{ minStreak: 2, gold: 1 }, { minStreak: 4, gold: 2 }, { minStreak: 6, gold: 3 }],
    interest: { stepGold: 10, cap: 5 },
  },
  sell: { formula: 'cost*3^(star-1) - (star>=2 ? 1 : 0)', depreciationFromStar: 2, depreciationGold: 1 },
  defeatDamage: { chapterBase: [6, 9, 12], perSurvivingEnemyFront: 2, eliteBonus: 3, bossBonus: 6, finalBossLossEndsRun: true },
  units: { maxStar: 3, mergeCount: 3, starStatMultiplierBps: [10000, 18000, 32000], equipmentSlots: 2 },
  battle: {
    maxAv: 1000, eventLimit: 10000, globalPulseAv: 100,
    teamSp: { start: 3, max: 5 }, energy: { start: 0, max: 100 },
  },
  rng: { algorithm: 'xorshift32', zeroSeedReplacement: 0x6d2b79f5, streams: ['setup', 'shop', 'reward', 'battle', 'initiative'] },
};

// ───────────────────────── 대사·초상화 ─────────────────────────
const dialogueSrc = join(DOCS, 'dialogue/ko');
const dialogueFiles = existsSync(dialogueSrc) ? readdirSync(dialogueSrc).filter((f) => f.endsWith('.json')).sort() : [];
if (dialogueFiles.length === 0) fail('docs/dialogue/ko/*.json 이 없음');

const portraitDir = join(ROOT, 'public/portraits');
const portraits = units.map((u) => ({
  id: u.portraitAssetId,
  unitId: u.id,
  kind: 'portrait',
  path: `portraits/${u.id}.webp`,
  present: existsSync(join(portraitDir, `${u.id}.webp`)),
  fallback: 'initials_faction_color',
  origin: 'NovelAI Diffusion V5 Full 생성본(프로젝트 portraits/manifest.json의 시드·프롬프트), 512px 폭 WebP로 변환',
}));

// ───────────────────────── 팩 매니페스트 ─────────────────────────
const pack = {
  packId: 'ba-kivotos',
  contentVersion: 'ba-content-2.2.0',
  rulesVersion: rules.rulesVersion,
  expectedCounts: { units: 60, synergies: 41, equipment: 12, strategies: 13, enemies: 13, nodes: 15, effects: 304, dialogueFiles: 60, statuses: 20 },
  sources: [
    { path: 'docs/GDD_v2.1.md', sha256: sha256(v21Text) },
    { path: 'docs/GDD_v2.2_amendment.md', sha256: sha256(v22Text) },
  ],
  generatedBy: 'scripts/extract-content.mjs',
};

// ───────────────────────── 쓰기 ─────────────────────────
const outputs = {
  'pack.json': pack, 'rules.json': rules, 'units.json': units, 'synergies.json': synergies, 'effects.json': effects,
  'equipment.json': equipment, 'strategies.json': strategies, 'enemies.json': enemies, 'nodes.json': nodes,
  'statuses.json': statuses, 'assets.json': portraits,
};
// 대사는 docs/dialogue/ko/<unitId>.json(개정안의 원본 60개 파일)을 한 배열로 묶어 둔다.
outputs['dialogue.ko.json'] = dialogueFiles.map((f) => JSON.parse(readFileSync(join(dialogueSrc, f), 'utf8')));
const stale = [];
mkdirSync(OUT, { recursive: true });
for (const [name, data] of Object.entries(outputs)) {
  const text = `${JSON.stringify(data, null, 2)}\n`;
  const path = join(OUT, name);
  if (CHECK) { if (!existsSync(path) || readFileSync(path, 'utf8') !== text) stale.push(name); }
  else writeFileSync(path, text);
}
if (CHECK) {
  if (stale.length) fail(`기획서와 다른 카탈로그 파일: ${stale.join(', ')} — npm run content:extract 로 다시 만든다`);
  console.log('extract-content --check: 카탈로그가 기획서와 같다');
} else {
  console.log(`extract-content: 유닛 ${units.length} · 시너지 ${synergies.length} · 효과 ${effects.length} · 장비 ${equipment.length} · 전략 ${strategies.length} · 적 ${enemies.length} · 노드 ${nodes.length} · 상태 ${statuses.length} · 대사 ${dialogueFiles.length}`);
}
