// 기획서(docs/GDD_v2.1.md + docs/GDD_v2.2_amendment.md + docs/GDD_v2.3_amendment.md + docs/OOPARTS_v1.md)의 표를 읽어 src/content/*.json 카탈로그를 만든다.
// 기획서가 바뀌면 다시 돌린다: npm run content:extract
// --check 를 주면 파일을 쓰지 않고, 지금 저장소의 JSON이 기획서와 같은지만 본다(다르면 exit 1).
//
// 원칙
// - 숫자·ID·연결은 표에서 그대로 읽는다. 못 읽으면 추측하지 않고 오류로 멈춘다.
// - 효과 본문(한국어)은 사람이 읽는 명세(spec)로만 보관한다. 실행 연산(handlers)은 M3에서 채운다.
// - 개정안이 앞 판의 같은 항목을 대체한다(해석 순서 v2.3 → v2.2 → v2.1). 유닛·시너지 표는 v2.3이 통째로 대체한다.
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
const v23Text = readFileSync(join(DOCS, 'GDD_v2.3_amendment.md'), 'utf8');
const v23 = v23Text.split('\n');
const oopText = readFileSync(join(DOCS, 'OOPARTS_v1.md'), 'utf8');
const oop = oopText.split('\n');

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
// v2.3 3장 표가 v2.1 부록 A + v2.2 5장을 통째로 대체한다(101명).
const SLOT_COLUMNS = ['basic', 'skill', 'ultimate', 'frontEffects', 'rearAction', 'rearEffects'];
const units = tableRows(section(v23, '## 3. 유닛 마스터 v2.3 (101명)'), '`u_').map((c) => {
  const id = unticked(c[0]);
  const [hp, atk, def, spd, crit, critDmg] = c[4].split('/').map((x) => Number(x.trim()));
  if ([hp, atk, def, spd, crit, critDmg].some((n) => !Number.isFinite(n))) fail(`${id} 스탯을 읽지 못함: ${c[4]}`);
  const abilityIds = {};
  SLOT_COLUMNS.forEach((key, k) => {
    const effs = c[6 + k] === '—' ? [] : ids(c[6 + k], 'eff_');
    if (key === 'frontEffects' || key === 'rearEffects') abilityIds[key] = effs;
    else if (effs.length > 1) fail(`${id} ${key} 칸이 하나가 아님`);
    else abilityIds[key] = effs[0] ?? null;
  });
  return {
    id,
    name: c[1],
    cost: Number(c[2]),
    position: c[3],
    synergyIds: c[5].split(',').map((s) => s.trim()),
    baseStats: { hp, atk, def, spd, critBps: Math.round(crit * 10000), critDamageBps: Math.round(critDmg * 10000) },
    role: c[12],
    abilityIds,
    portraitAssetId: `portrait_${id}`,
    shopEligible: true,
    awakening: null,
    awakenedFrom: null,
  };
});
// v2.3 9장: 각성. 원래 학생에 조건을, 각성 학생에 출처를 적고 각성 학생은 상점에서 뺀다.
for (const c of tableRows(section(v23, '## 9. 각성'), '`u_')) {
  const from = units.find((u) => u.id === unticked(c[0])) ?? fail(`9장 원래 학생 ${c[0]} 없음`);
  const into = units.find((u) => u.id === unticked(c[1])) ?? fail(`9장 각성 학생 ${c[1]} 없음`);
  from.awakening = { intoUnitId: into.id, counterSynergyId: unticked(c[2]), expRequired: Number(c[3]), starRequired: Number(c[4]) };
  into.awakenedFrom = from.id;
  into.shopEligible = false;
}

// ───────────────────────── 시너지 ─────────────────────────
// v2.3 4장 표: 진영 12 + 동아리 + 역할군 + 고유 + 플래티넘. 구성원은 유닛 태그에서 거꾸로 모은다.
// 단계 설명은 v2.3 5장에 같은 효과가 있으면 그 본문, 없으면(진영) v2.1 부록 B의 단계 문장.
const appendixB = section(v21, '## 부록 B. 40시너지의 단계·효과·최대 합법 편성');
const tierTextV21 = new Map();
for (const l of appendixB) {
  const m = l.match(/^- \*\*\d+명:\*\* `(eff_[a-z0-9_]+)` — (.*)$/);
  if (m) tierTextV21.set(m[1], m[2]);
}
const v23Effects = new Map();
{
  const lines = section(v23, '## 5. 효과 v2.3 (교체·추가)');
  for (let i = 0; i < lines.length; i++) {
    const h = lines[i].match(/^### (V\.\d{3}) `(eff_[a-z0-9_]+)`$/);
    if (h) v23Effects.set(h[2], { catalogNo: h[1], lines: lines.slice(i + 1, i + 6) });
  }
}
const v23Spec = (id) => v23Effects.get(id)?.lines.find((l) => l.startsWith('- 본문: '))?.slice(6);

function parseTierCell(s) {
  return s.split(';').map((part) => {
    const m = part.trim().match(/^(\d+)(\(플래티넘\))?: (eff_[a-z0-9_]+)$/);
    if (!m) fail(`시너지 단계 칸을 읽지 못함: ${part}`);
    return { threshold: Number(m[1]), grade: m[2] ? 'platinum' : 'normal', effectIds: [m[3]] };
  });
}
const synergies = tableRows(section(v23, '## 4. 시너지 v2.3 (64종)'), '`syn_').map((c) => {
  const id = unticked(c[0]);
  const tiers = parseTierCell(c[4]).map((t) => ({
    ...t,
    spec: v23Spec(t.effectIds[0]) ?? tierTextV21.get(t.effectIds[0]) ?? fail(`${id} ${t.effectIds[0]} 설명 없음`),
  }));
  const [f, r, d] = c[5].split('/').map(Number);
  return {
    id,
    name: c[1],
    category: c[2],
    countScope: unticked(c[3]),
    tiers,
    memberIds: units.filter((u) => u.synergyIds.includes(id)).map((u) => u.id),
    documented: { frontOnly: f, rearOnly: r, dual: d, maxLegalCount: Number(c[6]) },
  };
});

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
const kaiserRows = new Map(tableRows(section(v22, '## 4. 신규 전략 「카이저 론」 `str_kaiser_loan`'), '').map((c) => [c[0], unbold(c[1])]));
effects.push({
  id: 'eff_str_kaiser_loan', catalogNo: 'v2.2 4', owner: 'str_kaiser_loan', scope: 'global',
  execution: 'strategy_container', trigger: null,
  spec: `${kaiserRows.get('효과')}. 부족할 때: ${kaiserRows.get('부족할 때')}. 완납: ${kaiserRows.get('완납 보상')}.`,
  limits: '상환 일정은 RunState.loans[]에 남은 횟수·금액으로 저장(개정안 4장).',
  sourceReference: 'GDD v2.2 4장', implementation: 'spec_only', handlers: [],
});

// v2.3 5장: 같은 ID는 교체, 없으면 추가. 6장: 카탈로그에서 뺀다.
for (const [id, { catalogNo, lines }] of v23Effects) {
  const field = (name) => lines.find((l) => l.startsWith(`- ${name}: `))?.slice(name.length + 4) ?? fail(`${id}: "${name}" 줄 없음`);
  const src = field('출처/구역').match(/^(.*) \/ `([a-z_]+)`\. 원안 행: (v2\.3 조정|v2\.3 신규)\.$/) ?? fail(`${id} 출처/구역 형식`);
  const exec = field('실행').match(/^\*\*(.+?)\*\*\.?\s*(.*)$/) ?? fail(`${id} 실행 형식`);
  const def = {
    id,
    catalogNo,
    owner: src[1],
    scope: src[2],
    execution: EXEC[exec[1]] ?? fail(`${id} 실행 종류 모름: ${exec[1]}`),
    trigger: exec[2] && !exec[2].startsWith('ActionResolver') ? exec[2].replace(/\.$/, '') : null,
    spec: field('본문'),
    limits: field('제한'),
    sourceReference: `GDD v2.3 5장 (${src[3] === 'v2.3 조정' ? '교체' : '신규'})`,
    implementation: 'spec_only',
    handlers: [],
  };
  const at = effects.findIndex((e) => e.id === id);
  if (src[3] === 'v2.3 조정') {
    if (at < 0) fail(`${id}: v2.3 조정인데 v2.1에 없음`);
    effects[at] = def;
  } else {
    if (at >= 0) fail(`${id}: v2.3 신규인데 이미 있음`);
    effects.push(def);
  }
}
for (const l of section(v23, '## 6. 삭제된 효과')) {
  const m = l.match(/^- `(eff_[a-z0-9_]+)`$/);
  if (!m) continue;
  const at = effects.findIndex((e) => e.id === m[1]);
  if (at < 0) fail(`삭제할 효과 ${m[1]} 이 없음`);
  effects.splice(at, 1);
}

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
  str_iron_frontline: { positions: ['front_only', 'dual'], anyTagOf: null, minCount: 2 },
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
// v2.3 7장: 보유 조건 태그와 약점 문장 교체
for (const c of tableRows(section(v23, '## 7. 전략 조정'), '`str_')) {
  const st = strategies.find((s) => s.id === unticked(c[0])) ?? fail(`v2.3 7장의 ${c[0]} 전략이 없음`);
  if (c[1] === '보유 조건 태그') {
    if (!st.offer.ownedCondition) fail(`${st.id}: 보유 조건이 없는 전략`);
    st.offer.ownedCondition.anyTagOf = ids(c[2], 'syn_');
  } else if (c[1] === '약점') st.drawback = c[2];
  else if (c[1] === '제안 문장') st.offerText = c[2];
  else fail(`v2.3 7장 항목 모름: ${c[1]}`);
}
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

// v2.3 7.1: 장비 추천 문구 교체
for (const c of tableRows(section(v23, '### 7.1 장비 추천 문구'), '`eq_')) {
  const eq = equipment.find((e) => e.id === unticked(c[0])) ?? fail(`v2.3 7.1의 ${c[0]} 장비가 없음`);
  eq.recommendation = c[1];
}

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
// v2.3 10장: 노드 배율 덮어쓰기(난이도 조정). 원래 배율 칸이 E.2와 맞아야 한다.
for (const c of tableRows(section(v23, '## 10. 난이도 조정'), '`node_')) {
  const node = nodes.find((n) => n.id === unticked(c[0])) ?? fail(`10장의 ${c[0]} 노드가 없음`);
  const bps = (s) => Math.round(Number((s.match(/^×([\d.]+)$/) ?? fail(`10장 ${node.id} 배율 형식: ${s}`))[1]) * 10000);
  if (c[1] !== node.type) fail(`10장 ${node.id} 유형 ${c[1]} ≠ ${node.type}`);
  if (bps(c[2]) !== node.statScaleBps) fail(`10장 ${node.id} 원래 배율 ${c[2]} ≠ E.2 ${node.statScaleBps / 10000}`);
  node.statScaleBps = bps(c[3]);
}
// v2.3 13장: 시간 제한 폐지에 맞춘 재상향. v2.3.3 배율 칸이 10장 결과와 같고, 새 배율 = v2.3.3 × 추가 배율이어야 한다.
for (const c of tableRows(section(v23, '## 13. 시간 제한 폐지와 난이도 재상향'), '`node_')) {
  const node = nodes.find((n) => n.id === unticked(c[0])) ?? fail(`13장의 ${c[0]} 노드가 없음`);
  const bps = (s) => Math.round(Number((s.match(/^×([\d.]+)$/) ?? fail(`13장 ${node.id} 배율 형식: ${s}`))[1]) * 10000);
  if (c[1] !== node.type) fail(`13장 ${node.id} 유형 ${c[1]} ≠ ${node.type}`);
  if (bps(c[2]) !== node.statScaleBps) fail(`13장 ${node.id} v2.3.3 배율 ${c[2]} ≠ 10장 ${node.statScaleBps / 10000}`);
  if (Math.abs(bps(c[2]) * bps(c[3]) / 10000 - bps(c[4])) > 1) fail(`13장 ${node.id} 새 배율 ${c[4]} ≠ ${c[2]} ${c[3]}`);
  node.statScaleBps = bps(c[4]);
}

// ───────────────────────── 오파츠 ─────────────────────────
// docs/OOPARTS_v1.md 2~5장의 표. 표마다 칸 구성이 달라 제목으로 배치를 정한다.
const OOP_TABLES = [
  ['### 2.1 범용 (11)', 'general'],
  ['### 2.2 역할군 특화 (7)', 'targeted'],
  ['### 2.3 동아리 특화 (7)', 'targeted'],
  ['### 3.1 학원 진영 특화 (8)', 'targeted'],
  ['### 3.2 범용 (3)', 'general'],
  ['### 3.3 ⚠ 대가 오파츠 (4)', 'drawback'],
  ['### 4.1 학원 진영 특화 (4)', 'targeted'],
  ['### 4.2 범용 (3)', 'general'],
  ['### 4.3 ⚠ 대가 오파츠 (3)', 'drawback'],
  ['## 5. 전설 오파츠 (5) — 조합 전용', 'legendary'],
];
const OOP_RARITY = { C: 'common', U: 'uncommon', R: 'rare', L: 'legendary' };
const plain = (s) => unbold(s);
// 표시명이 긴 시너지(「무법자 — 칠수인·헬멧단」)는 " — " 앞 이름으로도 찾는다.
const synergyByName = new Map(synergies.flatMap((s) => [[s.name, s.id], [s.name.split(' — ')[0], s.id]]));
const oopRows = [];
for (const [heading, layout] of OOP_TABLES) {
  const rows = section(oop, heading).filter((l) => /^\| [CURL]\d{2} \|/.test(l)).map(cells);
  if (rows.length === 0) fail(`오파츠 표가 비어 있음: ${heading}`);
  for (const c of rows) oopRows.push({ layout, heading, c });
}
const oopByCode = new Map();
const ooparts = oopRows.map(({ layout, heading, c }) => {
  const [code, rawId, rawName] = c;
  const id = unticked(rawId);
  if (!/^oop_[a-z0-9_]+$/.test(id)) fail(`오파츠 ID 형식: ${rawId}`);
  const item = {
    id,
    code,
    name: plain(rawName),
    rarity: OOP_RARITY[code[0]],
    kind: layout === 'drawback' ? 'drawback' : layout === 'targeted' ? 'synergy' : 'general',
    synergyIds: [],
    effectIds: [`eff_${id}`],
    benefit: '',
    drawback: null,
    recipe: null,
    flavor: '',
  };
  if (layout === 'general') [item.benefit, item.flavor] = [plain(c[3]), c[4]];
  if (layout === 'targeted') {
    const synId = synergyByName.get(c[3]) ?? fail(`${id}: 대상 시너지 "${c[3]}"를 찾지 못함`);
    item.synergyIds = [synId];
    [item.benefit, item.flavor] = [plain(c[4]), c[5]];
  }
  if (layout === 'drawback') [item.benefit, item.drawback, item.flavor] = [plain(c[3]), plain(c[4]), c[5]];
  if (layout === 'legendary') {
    item.recipe = [...c[3].matchAll(/\(([CUR]\d{2})\)/g)].map((m) => m[1]);
    if (item.recipe.length < 2) fail(`${id}: 레시피 재료를 읽지 못함: ${c[3]}`);
    item.benefit = plain(c[4]);
  }
  if (oopByCode.has(code)) fail(`오파츠 번호 중복: ${code}`);
  oopByCode.set(code, item);
  item.sourceHeading = heading;
  return item;
});
for (const item of ooparts) {
  if (!item.recipe) continue;
  const parts = item.recipe.map((code) => oopByCode.get(code) ?? fail(`${item.id}: 레시피의 ${code}가 없음`));
  item.recipe = parts.map((p) => p.id);
  item.synergyIds = [...new Set(parts.flatMap((p) => p.synergyIds))];
  if (item.synergyIds.length) item.kind = 'synergy';
}
for (const item of ooparts) {
  const heading = item.sourceHeading;
  delete item.sourceHeading;
  effects.push({
    id: `eff_${item.id}`,
    catalogNo: `O.${item.code}`,
    owner: `오파츠 ${item.id}`,
    scope: 'global',
    execution: 'oopart_container',
    trigger: null,
    spec: item.drawback ? `이득: ${item.benefit} 대가: ${item.drawback}` : item.benefit,
    limits: '보유하는 동안 상시. 전투 handler는 전역 주기(7.1)·root 한도(9.4)를 따른다. 대가는 이득과 같은 handler에서 함께 적용한다.',
    sourceReference: `OOPARTS v1 ${heading.replace(/^#+ /, '')}`,
    implementation: 'spec_only',
    handlers: [],
  });
}

// 1.2절 획득 표 → rules.ooparts
const OOP_SOURCE = [
  [/^런 시작/, 'run_start'],
  [/^정예/, 'elite'],
  [/보스 승리/, 'boss'],
  [/^구조 요청/, 'rescue'],
];
const oopAcqLines = section(oop, '### 1.2 획득 경로');
const oopSources = tableRows(oopAcqLines, '').filter((c) => c.length === 3 && !/^-+$/.test(c[0]) && c[0] !== '시점').map((c) => {
  const id = OOP_SOURCE.find(([re]) => re.test(c[0]))?.[1] ?? fail(`오파츠 획득 시점을 모름: ${c[0]}`);
  const all = [1, 2, 3];
  const chapterMatch = c[0].match(/^(\d)·(\d)장/);
  const chapters = chapterMatch ? [Number(chapterMatch[1]), Number(chapterMatch[2])] : all;
  const perChapter = [...c[2].matchAll(/(\d)장 (\d+)\/(\d+)\/(\d+)/g)];
  const flat = c[2].match(/^(\d+) \/ (\d+) \/ (\d+)$/);
  const oddsByChapter = {};
  for (const ch of chapters) {
    const m = perChapter.find((x) => Number(x[1]) === ch);
    const row = m ? m.slice(2, 5) : flat ? flat.slice(1, 4) : fail(`${id}: ${ch}장 등급 확률을 읽지 못함: ${c[2]}`);
    oddsByChapter[ch] = row.map(Number);
    if (oddsByChapter[ch].reduce((a, b) => a + b, 0) !== 100) fail(`${id}: ${ch}장 확률 합이 100이 아님`);
  }
  const choice = c[1].match(/3택1/) ? 3 : 1;
  return { id, chapters, choices: choice, grant: choice === 1, requiresWin: /승리/.test(c[0]), oddsByChapter };
});
const oopRule = (re, what) => Number((oopText.match(re) ?? fail(`오파츠 규칙 "${what}"를 찾지 못함`))[1]);
const oopartRules = {
  rarityOrder: ['common', 'uncommon', 'rare'],
  sources: oopSources,
  rescueLossStreak: oopRule(/구조 요청\((\d)연패 직후, 런당 1회\)/, '구조 요청 연패 수'),
  skipGold: oopRule(/건너뛰면 (\d+)G/, '건너뛰기 골드'),
  recipeWeight: oopRule(/남은 재료가 보상 추첨 가중치 ×(\d+)를 받는다/, '레시피 가중치'),
};

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
const xpOf = (row) => Object.fromEntries(levelHeader.slice(1).map((lv, k) => [lv, row[k + 1] === '—' ? null : Number(unbold(row[k + 1]))]));
const xpV22 = xpOf(xpRow);

// v2.3 11장: 상점 장수 제한(11.1)과 레벨 XP 교체(11.2). 11.2의 v2.2 줄이 v2.2 개정안과 다르면 멈춘다.
const copiesByCost = tableRows(section(v23, '### 11.1 코스트별 장수'), '').filter((c) => /^\d+$/.test(c[0])).map((c) => Number(c[1]));
if (copiesByCost.length !== 5 || copiesByCost.some((n) => !(n > 0))) fail(`11.1 장수 표를 읽지 못함: ${copiesByCost}`);
const xp11 = section(v23, '### 11.2 레벨별 XP');
const xp11Old = xpOf(tableRows(xp11, '다음 XP (v2.2)')[0] ?? fail('11.2 v2.2 줄 없음'));
if (JSON.stringify(xp11Old) !== JSON.stringify(xpV22)) fail('11.2의 v2.2 XP 줄이 v2.2 개정안 1.2와 다름');
const xpToNext = xpOf(tableRows(xp11, '다음 XP (v2.3.4)')[0] ?? fail('11.2 v2.3.4 줄 없음'));
const excludeMaxStarOwned = /3성을 보유한 학생은 그 3성을 팔기 전까지 상점에 나오지 않는다/.test(section(v23, '### 11.1 코스트별 장수').join('\n'));
if (!excludeMaxStarOwned) fail('11.1 3성 제외 규칙 문장을 찾지 못함');

const rules = {
  rulesVersion: 'ktfr-rules-2.6.0',
  source: 'GDD v2.1 4.1·5장 + v2.2 1장 + v2.3 11장 + OOPARTS v1 1장. 표에서 직접 읽은 값은 shop.levels/shop.copiesByCost/xpToNext/ooparts, 나머지는 해당 절의 확정 초기값.',
  run: {
    chapters: 3, battlesPerChapter: 5,
    startRunHp: 80, startGold: 10, startLevel: 3, startXp: 0, maxLevel: 10,
    startingUnits: { count: 3, cost: 1, minFrontCapable: 2 },
  },
  board: { frontSlots: 4, rearSlots: 6, benchSlots: 9, maxDeployed: 10 },
  shop: { slots: 5, rerollCost: 2, recommendedSlotIndex: 4, recommendedModeChanceBps: 5000, levels: odds, copiesByCost, excludeMaxStarOwned },
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
    // v2.3 13장: 시간 제한(1000AV 패배)을 없애고 격화로 교착만 막는다.
    eventLimit: 20000, globalPulseAv: 100,
    escalation: { startAv: 1000, stepAv: 100, damageBpsPerStep: 2000 },
    teamSp: { start: 3, max: 5 }, energy: { start: 0, max: 100 },
  },
  rng: { algorithm: 'xorshift32', zeroSeedReplacement: 0x6d2b79f5, streams: ['setup', 'shop', 'reward', 'battle', 'initiative'] },
  ooparts: oopartRules,
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
  contentVersion: 'ba-content-2.7.0',
  rulesVersion: rules.rulesVersion,
  expectedCounts: { units: 101, synergies: 64, equipment: 12, strategies: 13, enemies: 13, nodes: 15, effects: 470, dialogueFiles: 101, statuses: 20, ooparts: 55 },
  sources: [
    { path: 'docs/GDD_v2.1.md', sha256: sha256(v21Text) },
    { path: 'docs/GDD_v2.2_amendment.md', sha256: sha256(v22Text) },
    { path: 'docs/GDD_v2.3_amendment.md', sha256: sha256(v23Text) },
    { path: 'docs/OOPARTS_v1.md', sha256: sha256(oopText) },
  ],
  generatedBy: 'scripts/extract-content.mjs',
};

// ───────────────────────── 쓰기 ─────────────────────────
const outputs = {
  'pack.json': pack, 'rules.json': rules, 'units.json': units, 'synergies.json': synergies, 'effects.json': effects,
  'equipment.json': equipment, 'strategies.json': strategies, 'enemies.json': enemies, 'nodes.json': nodes,
  'statuses.json': statuses, 'assets.json': portraits, 'ooparts.json': ooparts,
};
// 대사는 docs/dialogue/ko/<unitId>.json(유닛마다 한 파일)을 한 배열로 묶어 둔다.
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
  console.log(`extract-content: 유닛 ${units.length} · 시너지 ${synergies.length} · 효과 ${effects.length} · 장비 ${equipment.length} · 전략 ${strategies.length} · 적 ${enemies.length} · 노드 ${nodes.length} · 상태 ${statuses.length} · 오파츠 ${ooparts.length} · 대사 ${dialogueFiles.length}`);
}
