// 콘텐츠 팩 무결성 검사: 수량(명세 02절), 노드 연결, 선택지 판정 형식. 시험과 개발 서버 시작 때 함께 돈다.
import { ACHIEVEMENTS } from './achievements';
import { ACTIVITIES } from './activities';
import { BACKGROUNDS } from './backgrounds';
import { CAPABILITIES } from './capabilities';
import { ALL_SCENES, MAJOR_INCIDENTS } from './incidents';
import { MINOR_EVENTS } from './minorEvents';
import { ALL_SCENE_USES } from './bodyUse';
import { INCIDENT_TOLLS, injuryById } from './injuries';
import { ENDPOINTS, FORMS, PATHS, POSTMORTEMS } from './progression';

/** showIf가 서로 반대인 짝(X / not X)이 있으면 둘 중 하나는 늘 보인다 */
function isComplement(c: { showIf?: unknown }, all: Array<{ showIf?: unknown; requires?: unknown; cost?: unknown }>): boolean {
  return all.some((o) => !o.requires && !o.cost && JSON.stringify(o.showIf) === JSON.stringify({ not: c.showIf }));
}

export function validateContent(): string[] {
  const errors: string[] = [];
  const expect = (name: string, n: number, want: number) => {
    if (n !== want) errors.push(`${name}: ${n}개 (기대 ${want})`);
  };
  expect('출생 배경', BACKGROUNDS.length, 16);
  expect('성장 경로', PATHS.length, 10);
  expect('존재 형태', FORMS.length, 11);
  expect('능력', CAPABILITIES.length, 30);
  expect('생활 활동', ACTIVITIES.length, 16);
  expect('주요 사건', MAJOR_INCIDENTS.length, 20);
  expect('소사건', MINOR_EVENTS.length, 20);
  expect('사후 지속', POSTMORTEMS.length, 4);
  expect('종점', ENDPOINTS.length, 6);
  expect('업적', ACHIEVEMENTS.length, 66);
  const w = BACKGROUNDS.reduce((a, b) => a + b.weight, 0);
  if (w !== 1000) errors.push(`출생 가중치 합 ${w} (기대 1000)`);

  const ids = new Set<string>();
  for (const a of ACHIEVEMENTS) {
    if (ids.has(a.id)) errors.push(`업적 id 중복 ${a.id}`);
    ids.add(a.id);
  }

  for (const d of ALL_SCENES) {
    const start = d.start ?? 'entry';
    if (!d.nodes[start]) errors.push(`${d.id}: 시작 노드 ${start} 없음`);
    for (const [nid, n] of Object.entries(d.nodes)) {
      if (n.kind === 'auto' && !d.nodes[n.next]) errors.push(`${d.id}.${nid}: next ${n.next} 없음`);
      if (n.kind !== 'decision') continue;
      if (!n.choices.length) errors.push(`${d.id}.${nid}: 선택지 없음`);
      if (!n.choices.some((c) => !c.requires && !c.cost && (!c.showIf || n.choices.some((o) => o !== c && !o.requires && !o.cost && !o.showIf) || isComplement(c, n.choices)))) errors.push(`${d.id}.${nid}: 언제나 고를 수 있는 선택지가 없음`);
      for (const c of n.choices) {
        if (c.check === 'chance' && !c.fail) errors.push(`${d.id}.${nid}.${c.id}: 확률 판정인데 실패 결과 없음`);
        if (c.failIf && !c.fail) errors.push(`${d.id}.${nid}.${c.id}: failIf인데 실패 결과 없음`);
        for (const o of [c.success, c.fail]) {
          if (!o) continue;
          if (o.next && !d.nodes[o.next]) errors.push(`${d.id}.${nid}.${c.id}: next ${o.next} 없음`);
          if (!o.next && !o.end) errors.push(`${d.id}.${nid}.${c.id}: 결과가 다음 노드도 결말도 없음`);
        }
      }
    }
  }
  // 다친 부위 표와 대가 표가 실제 장면·선택지·상해를 가리키는지
  for (const [sid, map] of Object.entries(ALL_SCENE_USES)) {
    const def = ALL_SCENES.find((d) => d.id === sid);
    if (!def) {
      errors.push(`부위 표: 없는 장면 ${sid}`);
      continue;
    }
    const ids = new Set(Object.values(def.nodes).flatMap((n) => (n.kind === 'decision' ? n.choices.map((c) => c.id) : [])));
    for (const cid of Object.keys(map)) if (!ids.has(cid)) errors.push(`부위 표: ${sid}에 없는 선택지 ${cid}`);
  }
  for (const [sid, tolls] of Object.entries(INCIDENT_TOLLS)) {
    if (!MAJOR_INCIDENTS.some((d) => d.id === sid)) errors.push(`대가 표: 없는 주요 사건 ${sid}`);
    for (const t of tolls) if (t.effects.injury && !injuryById(t.effects.injury)) errors.push(`대가 표: 없는 상해 ${t.effects.injury}`);
  }
  return errors;
}
