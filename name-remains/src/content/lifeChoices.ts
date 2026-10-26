// 0세부터 한 해씩 흘러가는 삶을 채우는 장면들.
// - CHILD_YEARS: 어린 시절 매년 한 줄(나이대별)
// - CHILD_CHOICES: 어린 시절의 작은 갈림길. 고르는 대로 적성이 기운다.
// - DAILY_CHOICES: 어른의 일상 속 작은 갈림길. 고르는 대로 능력치·자원·인연이 조금씩 바뀐다.
import type { ChoiceDef, Cond, Effects, IncidentDef } from '../domain/contentTypes';
import type { RunState } from '../domain/types';
import { pick } from '../domain/rng';

// ---------------------------------------------------------------- 만드는 도구

interface Opt {
  tag: string;
  text: string;
  /** 고른 뒤의 결과 문장 */
  result: string;
  effects?: Effects;
  requires?: Cond;
  cost?: Effects;
  /** 확률 판정. 실패하면 fail 문장과 효과 */
  chance?: ChoiceDef['chance'];
  fail?: { text: string; effects?: Effects };
  trap?: boolean;
}

interface SceneSpec {
  id: string;
  title: string;
  place: string;
  eligible?: Cond;
  weight?: number;
  /** 위협 등급. 1은 일상, 2 이상은 몸을 노리는 직접적인 위협 */
  tier?: number;
  intro: string;
  prompt: string;
  opts: Opt[];
}

function scene(spec: SceneSpec): IncidentDef {
  const choices: ChoiceDef[] = spec.opts.map((o, i) => ({
    id: `${spec.id}_c${i + 1}`,
    tag: o.tag,
    text: o.text,
    requires: o.requires,
    cost: o.cost,
    trap: o.trap,
    check: o.chance ? 'chance' : 'rule',
    chance: o.chance,
    success: { text: o.result, effects: o.effects, end: 'done' },
    fail: o.fail ? { text: o.fail.text, effects: o.fail.effects, end: 'done' } : undefined,
  }));
  return {
    id: spec.id,
    kind: 'minor',
    title: spec.title,
    threats: [],
    entry: 'voluntary',
    tier: spec.tier ?? 1,
    place: spec.place,
    eligible: spec.eligible ?? { all: [] },
    weight: spec.weight ?? 10,
    nodes: {
      entry: { kind: 'auto', text: spec.intro, next: 'd1' },
      d1: { kind: 'decision', prompt: spec.prompt, choices },
    },
  };
}

const ages = (min: number, max: number): Cond => ({ age: { min, max } });

// ---------------------------------------------------------------- 어린 시절 매년 한 줄

interface YearLine {
  text: string;
  effects?: Effects;
}

const BANDS: Array<{ id: string; from: number; to: number; lines: YearLine[] }> = [
  {
    id: 'infant',
    from: 0,
    to: 2,
    lines: [
      { text: '태어난 해 겨울, 집 안의 모든 거울에 수건이 덮여 있었습니다. 아기가 거울을 보면 안 된다는 것이 할머니의 고집이었습니다.' },
      { text: '밤마다 아무도 없는 천장을 보고 방긋 웃었다고 합니다. 어머니는 그 이야기를 할 때마다 웃지 않았습니다.', effects: { aptChance: [{ apt: 'RES', p: 0.2 }] } },
      { text: '처음 한 말은 "엄마"가 아니라 "문"이었습니다. 현관 쪽을 가리키며 몇 번이고 말했다고 합니다.', effects: { aptChance: [{ apt: 'OBS', p: 0.2 }] } },
      { text: '돌잔치 날, 돌잡이 상 위에 올려 두지 않은 녹슨 열쇠가 하나 있었습니다. 그것을 쥐고 놓지 않았다고 합니다.' },
      { text: '열이 사흘 동안 내리지 않았습니다. 응급실 대기 번호가 4번에서 줄곧 넘어가지 않았다고 아버지는 기억합니다.' },
      { text: '사이렌이 울리면 울음을 그치는 아이였습니다. 동네 사람들은 그걸 신통하다고도, 불길하다고도 했습니다.', effects: { aptChance: [{ apt: 'RES', p: 0.15 }] } },
      { text: '걸음마를 떼자마자 베란다 쪽으로만 걸어갔습니다. 부모님은 베란다 문에 자물쇠를 하나 더 달았습니다.' },
    ],
  },
  {
    id: 'early',
    from: 3,
    to: 6,
    lines: [
      { text: '유치원 낮잠 시간, 모두 잠든 교실에서 혼자 눈을 뜨고 있었습니다. 선생님 그림자가 선생님보다 늦게 움직였습니다.', effects: { aptChance: [{ apt: 'OBS', p: 0.2 }] } },
      { text: '놀이터 미끄럼틀 밑에 사는 친구 이야기를 했다가 어른들에게 크게 혼났습니다. 그 친구는 그 뒤로 놀러 오지 않았습니다.' },
      { text: '그림일기에 우리 가족을 그렸는데, 사람이 한 명 더 그려져 있었습니다. 누구냐고 물어도 대답하지 못했습니다.', effects: { aptChance: [{ apt: 'RES', p: 0.15 }] } },
      { text: '시장에서 엄마 손을 놓쳤습니다. 낯선 아주머니가 "이름을 말하면 데려다줄게" 했지만 입을 꾹 다물었습니다.', effects: { aptChance: [{ apt: 'NEG', p: 0.15 }] } },
      { text: '처음으로 혼자 신발 끈을 묶었습니다. 왼발 끈이 자꾸 오른쪽으로 풀려 있었습니다.' },
      { text: '"모르는 번호는 받지 마." 처음 외운 생활 수칙이었습니다. 이유는 아무도 설명해 주지 않았습니다.', effects: { aptChance: [{ apt: 'PRC', p: 0.15 }] } },
      { text: '동네 문방구 할아버지가 사탕을 하나 더 쥐여 주며, 해 지기 전에는 꼭 집에 들어가라고 했습니다.' },
      { text: '장마철 내내 창밖을 보며 지냈습니다. 빗물이 유리창에 글자를 쓰다 마는 것 같았습니다.', effects: { aptChance: [{ apt: 'OBS', p: 0.15 }] } },
    ],
  },
  {
    id: 'school',
    from: 7,
    to: 12,
    lines: [
      { text: '초등학교에 들어갔습니다. 첫날 받은 안내문의 맨 아래 줄은 "4교시 이후 3층 화장실 사용 금지"였습니다.', effects: { aptChance: [{ apt: 'PRC', p: 0.15 }] } },
      { text: '받아쓰기에서 백 점을 받았습니다. 시험지 뒷면에 누가 빨간 펜으로 "잘했어"라고 써 두었는데, 선생님 글씨가 아니었습니다.' },
      { text: '학교 앞 문구점에서 파는 "귀신 퇴치 카드"를 모았습니다. 반 아이들 사이에서는 그게 진짜로 통한다는 소문이 돌았습니다.', effects: { aptChance: [{ apt: 'NEG', p: 0.12 }] } },
      { text: '운동회 날 계주에서 넘어졌습니다. 일으켜 준 손이 누구 것이었는지 끝내 찾지 못했습니다.' },
      { text: '방학 숙제로 동네 지도를 그렸습니다. 다 그리고 보니 우리 골목에 집이 한 채 더 있었습니다.', effects: { aptChance: [{ apt: 'OBS', p: 0.15 }] } },
      { text: '처음으로 친구 집에서 자고 왔습니다. 그 집은 밤 열 시가 되자 가족 모두가 현관을 향해 절을 했습니다.' },
      { text: '학교 도서관 구석에서 대출 카드가 백 년 치 찍힌 책을 찾았습니다. 마지막 대출자의 이름이 내 이름이었습니다.', effects: { aptChance: [{ apt: 'RES', p: 0.12 }] } },
      { text: '반장 선거에 나갔다가 한 표 차로 떨어졌습니다. 개표함에서 아무도 쓰지 않은 이름이 적힌 표가 한 장 나왔습니다.' },
      { text: '주말마다 아버지와 동네 목욕탕에 갔습니다. 4번 사물함은 늘 잠겨 있었고, 아무도 열쇠를 받지 않았습니다.' },
      { text: '구구단을 다 외웠습니다. 9단을 외울 때마다 교실 시계가 1분씩 늦게 갔습니다.', effects: { aptChance: [{ apt: 'PRC', p: 0.12 }] } },
      { text: '키가 반에서 세 번째로 컸습니다. 신체검사 날, 줄자에 손자국이 하나 남아 있었습니다.' },
    ],
  },
  {
    id: 'teen',
    from: 13,
    to: 18,
    lines: [
      { text: '중학교 교복을 처음 입었습니다. 명찰을 다는 순간, 아주 잠깐 이름이 거꾸로 읽혔습니다.' },
      { text: '시험 기간마다 독서실에서 밤을 새웠습니다. 새벽 세 시의 독서실에는 늘 한 자리가 더 차 있었습니다.', effects: { aptChance: [{ apt: 'PRC', p: 0.15 }] } },
      { text: '친구들과 노래방에서 목이 쉬도록 노래했습니다. 예약 목록에 아무도 넣지 않은 곡이 하나 끼어 있었습니다.', effects: { aptChance: [{ apt: 'NEG', p: 0.12 }] } },
      { text: '체육 시간에 철봉에서 떨어져 팔을 다쳤습니다. 깁스에 반 아이들이 이름을 적었는데, 하나가 한자였습니다.' },
      { text: '처음으로 휴대폰이 생겼습니다. 저장하지 않은 번호로 매일 밤 11시 11분에 빈 문자가 왔습니다.', effects: { aptChance: [{ apt: 'OBS', p: 0.15 }] } },
      { text: '방학 동안 편의점 앞 파라솔 아래에서 친구와 컵라면을 먹으며 시간을 보냈습니다. 그 여름은 이상할 만큼 조용했습니다.' },
      { text: '수련회 마지막 밤, 담력 훈련에서 혼자 길을 잃었습니다. 다음 날 아침 숙소 침대에서 눈을 떴습니다.', effects: { aptChance: [{ apt: 'RES', p: 0.15 }] } },
      { text: '진로 상담에서 "괴이 대응 관련 학과"라는 말을 처음 들었습니다. 선생님은 말을 하고 나서 주위를 한 번 둘러보았습니다.' },
      { text: '학교 축제에서 연극을 했습니다. 객석 맨 뒷줄에 아무도 앉지 않은 의자가 박수 소리를 냈습니다.', effects: { aptChance: [{ apt: 'NEG', p: 0.12 }] } },
      { text: '야간 자율학습이 끝나고 버스를 기다렸습니다. 막차 다음에 오는 버스는 타지 않는 것이 학교의 불문율이었습니다.', effects: { aptChance: [{ apt: 'PRC', p: 0.12 }] } },
      { text: '수능 시험장 가는 길, 지하철 안내 방송이 내 수험 번호를 불렀습니다. 못 들은 척했습니다.' },
    ],
  },
  {
    id: 'young',
    from: 19,
    to: 40,
    lines: [
      { text: '처음으로 혼자 사는 방을 구했습니다. 계약서 특약란에 "북쪽 벽에 못을 박지 말 것"이라고 적혀 있었습니다.', effects: { aptChance: [{ apt: 'PRC', p: 0.12 }] } },
      { text: '아르바이트를 세 개나 했습니다. 손님이 없는 시간에는 계산대 밑에서 낡은 생활 안전 수칙집을 읽었습니다.', effects: { KRW: 20 } },
      { text: '친구들과 첫 여행을 떠났습니다. 숙소 방 번호가 체크인 때와 체크아웃 때 달랐습니다.' },
      { text: '군 복무 대신 민방위 괴이 대응 보조원으로 일 년을 보냈습니다. 매일 밤 순찰 일지를 적었습니다.', effects: { aptChance: [{ apt: 'OBS', p: 0.12 }] } },
      { text: '학원 강사 일을 잠깐 했습니다. 출석부에 매주 한 명씩 이름이 늘었는데, 교실 의자 수는 그대로였습니다.' },
      { text: '자격증 시험을 준비하며 한 해를 보냈습니다. 합격자 명단에 같은 이름이 두 번 올라 있었습니다.', effects: { aptChance: [{ apt: 'PRC', p: 0.15 }] } },
      { text: '오래 만난 사람과 헤어졌습니다. 마지막 통화의 녹음 파일이 이따금 혼자 재생됩니다.', effects: { aptChance: [{ apt: 'RES', p: 0.12 }] } },
      { text: '이사를 두 번 했습니다. 두 번 다 이삿짐 상자가 하나씩 더 왔습니다.' },
    ],
  },
];

/** 어린 시절 한 해의 기록 한 줄. 같은 나이대에서는 겹치지 않게 고른다. */
export function childYearLine(s: RunState, age: number, startAge: number): YearLine {
  const band = BANDS.find((b) => age >= b.from && age <= b.to) ?? BANDS[BANDS.length - 1];
  const used = s.run.milestones;
  const fresh = band.lines.map((l, i) => ({ l, i })).filter(({ i }) => !used[`cy_${band.id}_${i}`]);
  const from = fresh.length ? fresh : band.lines.map((l, i) => ({ l, i }));
  const got = pick(s.rng, 'world', from);
  used[`cy_${band.id}_${got.i}`] = true;
  // 사회에 나오기 직전 해에는 마음의 준비를 시킨다
  if (age === startAge - 1 && band.id !== 'infant') return { text: `${got.l.text} 그리고 해가 바뀌면 이 도시에서 혼자 살아가야 한다는 것을 알고 있었습니다.`, effects: got.l.effects };
  return got.l;
}

// ---------------------------------------------------------------- 어린 시절의 갈림길

export const CHILD_CHOICES: IncidentDef[] = [
  scene({
    id: 'CH_01_FLOOR4_TOILET',
    title: '3층 화장실',
    place: '초등학교 3층 복도',
    eligible: ages(7, 12),
    intro: '4교시가 끝나자 친구가 3층 화장실 맨 끝 칸을 열어 보자고 졸랐습니다.',
    prompt: '친구가 팔을 잡아끕니다.',
    opts: [
      { tag: '같이 간다', text: '친구 손을 잡고 맨 끝 칸 앞까지 간다.', result: '문 안쪽에서 휴지 걸이가 혼자 돌아갔습니다. 둘 다 비명을 지르며 달아났지만, 그날부터 그 친구와는 둘도 없는 사이가 되었습니다.', effects: { aptChance: [{ apt: 'RES', p: 0.5 }], HP: -2 } },
      { tag: '선생님께 알린다', text: '규칙은 규칙이라며 담임 선생님께 가서 말한다.', result: '선생님은 칭찬 스티커를 주고는 화장실 문에 자물쇠를 하나 더 채웠습니다. 친구는 한동안 말을 걸지 않았습니다.', effects: { aptChance: [{ apt: 'PRC', p: 0.5 }] } },
      { tag: '문 앞에서 듣기', text: '들어가지 않고 문에 귀를 대 본다.', result: '물 내려가는 소리 사이로 누가 숫자를 세고 있었습니다. 마흔넷에서 멈췄습니다. 그 숫자를 오래 기억했습니다.', effects: { aptChance: [{ apt: 'OBS', p: 0.5 }] } },
      { tag: '말린다', text: '친구에게 오늘은 하지 말자고, 대신 매점에 가자고 꼬드긴다.', result: '친구는 투덜대다가 떡꼬치 하나에 넘어갔습니다. 말로 사람 마음을 돌리는 법을 처음 배웠습니다.', effects: { aptChance: [{ apt: 'NEG', p: 0.5 }], KRW: -1 } },
    ],
  }),
  scene({
    id: 'CH_02_STRANGER_CANDY',
    title: '사탕 주는 아저씨',
    place: '아파트 놀이터',
    eligible: ages(4, 8),
    intro: '놀이터 벤치에 앉은 아저씨가 손바닥에 빨간 사탕을 올려 내밀었습니다. 얼굴이 잘 기억나지 않는 사람이었습니다.',
    prompt: '아저씨가 웃으며 이름을 묻습니다.',
    opts: [
      { tag: '이름을 말한다', text: '해맑게 이름을 말하고 사탕을 받는다.', result: '사탕은 아무 맛도 나지 않았습니다. 그날 밤 누군가 창밖에서 내 이름을 세 번 불렀고, 엄마가 커튼을 쳤습니다.', effects: { HP: -3, aptChance: [{ apt: 'RES', p: 0.4 }] }, trap: true },
      { tag: '도망친다', text: '대답하지 않고 곧장 집으로 뛰어간다.', result: '숨이 턱까지 찼지만 뒤는 돌아보지 않았습니다. 엄마는 잘했다고 꼭 안아 주었습니다.', effects: { aptChance: [{ apt: 'PRC', p: 0.4 }] } },
      { tag: '가짜 이름', text: '옆 반 친구 이름을 대고 사탕을 받는다.', result: '아저씨는 그 이름을 몇 번 되뇌더니 고개를 갸웃거리며 사라졌습니다. 거짓말이 사람을 지킬 때도 있다는 걸 알았습니다.', effects: { aptChance: [{ apt: 'NEG', p: 0.5 }] } },
      { tag: '빤히 본다', text: '사탕 대신 아저씨 발밑의 그림자를 빤히 본다.', result: '그림자는 벤치 쪽이 아니라 반대로 누워 있었습니다. 아저씨는 사탕을 거두고 일어났습니다.', effects: { aptChance: [{ apt: 'OBS', p: 0.5 }] } },
    ],
  }),
  scene({
    id: 'CH_03_GRANDMA_CHARM',
    title: '할머니의 부적',
    place: '시골 할머니 댁',
    eligible: ages(5, 11),
    intro: '명절에 내려간 시골집에서 할머니가 노란 종이를 접어 주머니에 넣어 주셨습니다. 절대 버리지 말라고 했습니다.',
    prompt: '서울로 돌아가는 차 안, 주머니 속 종이가 바스락거립니다.',
    opts: [
      { tag: '소중히 간직', text: '필통 안쪽에 넣어 매일 가지고 다닌다.', result: '이상하게도 그 해에는 한 번도 아프지 않았습니다. 종이 귀퉁이만 조금씩 검게 탔습니다.', effects: { SUP: 1, mst: { MST_SEAL: 2 } } },
      { tag: '펼쳐 본다', text: '몰래 펼쳐서 무슨 글자가 적혔는지 들여다본다.', result: '알아볼 수 없는 붉은 글씨 사이에 내 생일이 적혀 있었습니다. 접힌 자국을 따라 다시 접는 법을 외웠습니다.', effects: { mst: { MST_RULE: 2 }, aptChance: [{ apt: 'OBS', p: 0.3 }] } },
      { tag: '친구에게 준다', text: '무서운 꿈을 꾼다는 짝꿍에게 건넨다.', result: '짝꿍은 그 뒤로 악몽을 꾸지 않았다며 고마워했습니다. 할머니는 그 이야기를 듣고 한참 말이 없었습니다.', effects: { aptChance: [{ apt: 'NEG', p: 0.4 }, { apt: 'RES', p: 0.2 }] } },
    ],
  }),
  scene({
    id: 'CH_04_NIGHT_KNOCK',
    title: '두 번 두드리는 소리',
    place: '집 현관',
    eligible: ages(6, 13),
    intro: '부모님이 늦게 오는 밤이었습니다. 현관문을 누군가 두 번 두드렸습니다. 우리 집 약속은 세 번이었습니다.',
    prompt: '문 너머에서 엄마 목소리가 "문 열어"라고 합니다.',
    opts: [
      { tag: '열지 않는다', text: '약속대로 세 번이 아니면 열지 않는다. 이불을 뒤집어쓴다.', result: '한참 뒤 진짜 엄마가 세 번 두드리고 들어왔습니다. 엄마는 "누구랑 통화했니?"라고 물었습니다.', effects: { aptChance: [{ apt: 'PRC', p: 0.5 }], clues: ['CLU_PASSWORD'] } },
      { tag: '되묻는다', text: '"우리 집 강아지 이름이 뭐야?" 하고 문 너머에 묻는다.', result: '문 너머가 조용해졌습니다. 그러다 아주 낮은 목소리로 강아지 이름을 정확히 말했습니다. 그날 밤은 한숨도 자지 못했습니다.', effects: { aptChance: [{ apt: 'NEG', p: 0.4 }], FAT: 5 } },
      { tag: '렌즈로 본다', text: '의자를 끌고 가서 문 렌즈로 밖을 내다본다.', chance: { base: 0.55, apt: ['OBS'] }, result: '복도에는 아무도 없었습니다. 그런데 렌즈 바로 앞에 무언가가 눈을 대고 있는 것처럼 캄캄했습니다. 조용히 내려왔습니다.', effects: { aptChance: [{ apt: 'OBS', p: 0.5 }] }, fail: { text: '렌즈 너머의 눈과 눈이 마주쳤습니다. 의자에서 떨어져 이마에 혹이 났습니다.', effects: { HP: -5, aptChance: [{ apt: 'RES', p: 0.3 }] } } },
    ],
  }),
  scene({
    id: 'CH_05_CLASS_PET',
    title: '교실 거북이',
    place: '초등학교 교실',
    eligible: ages(7, 12),
    intro: '교실에서 키우는 거북이 당번이 되었습니다. 그런데 어항 속 거북이가 두 마리로 늘어 있었습니다.',
    prompt: '아무도 모르는 것 같습니다.',
    opts: [
      { tag: '돌본다', text: '두 마리 모두에게 똑같이 먹이를 준다.', result: '방학이 끝나자 한 마리는 사라지고, 남은 거북이 등딱지에 고맙다는 듯 하얀 무늬가 생겼습니다.', effects: { aptChance: [{ apt: 'RES', p: 0.4 }], mst: { MST_FIELD: 1 } } },
      { tag: '관찰 일기', text: '두 마리를 매일 비교하며 관찰 일기를 쓴다.', result: '새로 온 거북이는 눈을 깜박이지 않았습니다. 일기장에 적은 그 문장으로 과학 상을 받았습니다.', effects: { aptChance: [{ apt: 'OBS', p: 0.5 }] } },
      { tag: '선생님께', text: '거북이가 늘었다고 선생님께 말씀드린다.', result: '선생님은 어항을 보더니 아무 말 없이 한 마리를 들고 나가셨습니다. 그 뒤 학교에 새 수칙이 하나 생겼습니다.', effects: { aptChance: [{ apt: 'PRC', p: 0.4 }], mst: { MST_RULE: 1 } } },
    ],
  }),
  scene({
    id: 'CH_06_BULLY',
    title: '괴롭힘',
    place: '학교 뒤뜰',
    eligible: ages(9, 15),
    intro: '덩치 큰 아이들이 전학 온 아이를 뒤뜰로 끌고 갔습니다. 전학생은 이상하게 겁먹은 얼굴이 아니었습니다.',
    prompt: '지나가던 길에 그 광경을 봤습니다.',
    opts: [
      { tag: '끼어든다', text: '가방을 내던지고 사이로 끼어든다.', chance: { base: 0.5, apt: ['RES', 'PRC'] }, result: '한 대 맞았지만 버텼습니다. 아이들은 투덜대며 흩어졌고, 전학생은 처음으로 웃었습니다.', effects: { HP: -4, aptChance: [{ apt: 'RES', p: 0.5 }], mst: { MST_FIELD: 2 } }, fail: { text: '셋을 상대로는 무리였습니다. 코피를 쏟았지만 전학생은 그날 이후 늘 내 옆에 앉았습니다.', effects: { HP: -10, aptChance: [{ apt: 'RES', p: 0.4 }] } } },
      { tag: '어른을 부른다', text: '교무실로 뛰어가 선생님을 모셔 온다.', result: '선생님이 왔을 때 덩치들은 이미 바닥에 주저앉아 울고 있었습니다. 전학생은 손을 털며 "고마워"라고만 했습니다.', effects: { aptChance: [{ apt: 'PRC', p: 0.4 }, { apt: 'OBS', p: 0.2 }] } },
      { tag: '말로 푼다', text: '덩치 대장에게 가서 농담을 던지며 분위기를 돌린다.', chance: { base: 0.5, apt: ['NEG'] }, result: '웃음이 터지자 다들 머쓱해졌습니다. 말 한마디로 판을 바꾸는 법을 알았습니다.', effects: { aptChance: [{ apt: 'NEG', p: 0.6 }] }, fail: { text: '농담은 통하지 않았고 같이 엎어졌습니다. 그래도 전학생 옆에 서 있었다는 건 남았습니다.', effects: { HP: -6, aptChance: [{ apt: 'NEG', p: 0.3 }] } } },
      { tag: '지나친다', text: '못 본 척 지나간다.', result: '다음 날 덩치 셋이 모두 결석했습니다. 전학생은 내 쪽을 한 번 쳐다보고는 고개를 돌렸습니다.', effects: { FAT: 3, aptChance: [{ apt: 'OBS', p: 0.2 }] } },
    ],
  }),
  scene({
    id: 'CH_07_HIDE_SEEK',
    title: '숨바꼭질',
    place: '재개발 예정 골목',
    eligible: ages(5, 10),
    intro: '동네 아이들과 숨바꼭질을 했습니다. 술래가 "다 숨었니?" 하고 물었는데, 대답한 목소리가 하나 더 많았습니다.',
    prompt: '빈집 장독대 뒤에 숨어 있습니다.',
    opts: [
      { tag: '끝까지 숨는다', text: '숨소리도 내지 않고 끝까지 버틴다.', result: '해가 지도록 아무도 찾으러 오지 않았습니다. 집에 오니 다른 아이들은 한 명이 없어졌다며 울고 있었는데, 그게 나였다고 합니다.', effects: { aptChance: [{ apt: 'OBS', p: 0.3 }, { apt: 'RES', p: 0.3 }], FAT: 4 } },
      { tag: '먼저 나간다', text: '숨바꼭질을 그만하자고 소리치며 나간다.', result: '모두가 투덜대며 나왔습니다. 머릿수를 세 보니 딱 맞았습니다. 처음부터 맞았던 걸까요.', effects: { aptChance: [{ apt: 'PRC', p: 0.4 }, { apt: 'NEG', p: 0.2 }] } },
      { tag: '술래를 살핀다', text: '틈새로 술래가 누구를 찾는지 몰래 지켜본다.', result: '술래는 담벼락 그림자 쪽만 계속 보고 있었습니다. 그 그림자에는 아무도 숨어 있지 않았습니다.', effects: { aptChance: [{ apt: 'OBS', p: 0.5 }], mst: { MST_BOUND: 1 } } },
    ],
  }),
  scene({
    id: 'CH_08_ALLOWANCE',
    title: '용돈의 쓰임',
    place: '동네 문구점',
    eligible: ages(8, 14),
    intro: '설날 세뱃돈을 처음으로 내 마음대로 쓸 수 있게 되었습니다.',
    prompt: '두툼한 봉투가 손에 들려 있습니다.',
    opts: [
      { tag: '저금한다', text: '은행에 가서 내 이름으로 통장을 만든다.', result: '창구 직원이 도장을 찍어 주며 "꼭 오래 쓰세요"라고 했습니다. 이상하게 그 말이 오래 남았습니다.', effects: { KRW: 30, aptChance: [{ apt: 'PRC', p: 0.3 }] } },
      { tag: '책을 산다', text: '서점에 가서 도시 괴담 백과를 산다.', result: '밤새 읽었습니다. 절반은 거짓말 같았고, 나머지 절반은 우리 동네 이야기였습니다.', effects: { mst: { MST_RULE: 2 }, aptChance: [{ apt: 'OBS', p: 0.3 }] } },
      { tag: '친구들에게 쏜다', text: '친구들에게 떡볶이를 크게 한턱 낸다.', result: '그날 이후 반에서 내 말이라면 다들 귀를 기울였습니다.', effects: { aptChance: [{ apt: 'NEG', p: 0.5 }], KRW: -5 } },
      { tag: '손전등을 산다', text: '문구점에서 제일 밝은 손전등과 건전지를 산다.', result: '정전된 밤마다 그 손전등이 집을 지켰습니다. 물건을 미리 챙겨 두는 버릇이 생겼습니다.', effects: { SUP: 2, aptChance: [{ apt: 'PRC', p: 0.3 }] } },
    ],
  }),
  scene({
    id: 'CH_09_RADIO_STATION',
    title: '없는 주파수',
    place: '아버지의 낡은 라디오',
    eligible: ages(10, 16),
    intro: '아버지의 낡은 라디오 다이얼을 돌리다, 지도에 없는 방송국의 일기 예보를 들었습니다. "내일 오후 네 시, 시내에 짙은 안개."',
    prompt: '내일은 친구들과 시내에 가기로 한 날입니다.',
    opts: [
      { tag: '약속을 미룬다', text: '친구들에게 핑계를 대고 집에 있는다.', result: '다음 날 오후 네 시, 시내 한복판이 안개에 덮였다는 뉴스가 나왔습니다. 친구들은 늦게나마 무사히 돌아왔습니다.', effects: { aptChance: [{ apt: 'RES', p: 0.4 }], mst: { MST_BOUND: 1 } } },
      { tag: '친구들에게 알린다', text: '방송 이야기를 하며 친구들도 말린다.', chance: { base: 0.45, apt: ['NEG'] }, result: '반신반의하던 친구들이 결국 따라 주었습니다. 다음 날 뉴스를 보고 다들 말이 없었습니다.', effects: { aptChance: [{ apt: 'NEG', p: 0.5 }] }, fail: { text: '아무도 믿지 않았습니다. 그날 밤 친구 한 명이 안개 속에서 세 시간 늦게 돌아왔고, 무엇을 봤는지 말하지 않았습니다.', effects: { FAT: 5, aptChance: [{ apt: 'RES', p: 0.3 }] } } },
      { tag: '주파수를 적는다', text: '주파수를 공책에 적고 매일 밤 같은 시간에 다시 맞춘다.', result: '방송은 다시 나오지 않았지만, 다이얼 사이의 잡음에도 무늬가 있다는 걸 알게 되었습니다.', effects: { aptChance: [{ apt: 'OBS', p: 0.4 }], mst: { MST_RULE: 1 } } },
    ],
  }),
  scene({
    id: 'CH_10_CLUB',
    title: '동아리 고르기',
    place: '중학교 동아리 박람회',
    eligible: ages(13, 16),
    intro: '중학교 동아리 박람회 날입니다. 강당 구석의 오컬트 연구부 책상에는 아무도 앉아 있지 않은데 지원서만 쌓여 있었습니다.',
    prompt: '지원서 한 장을 내야 합니다.',
    opts: [
      { tag: '운동부', text: '태권도부에 들어가 몸을 단련한다.', result: '매일 저녁 땀을 쏟았습니다. 넘어져도 바로 일어나는 법을 배웠습니다.', effects: { HP: 5, mst: { MST_FIELD: 3 }, aptChance: [{ apt: 'RES', p: 0.2 }] } },
      { tag: '방송부', text: '방송부에 들어가 마이크를 잡는다.', result: '점심 방송을 맡았습니다. 목소리 하나로 강당을 조용히 만드는 법을 알았습니다.', effects: { aptChance: [{ apt: 'NEG', p: 0.5 }] } },
      { tag: '오컬트 연구부', text: '빈 책상에 지원서를 내려놓는다.', result: '다음 날 사물함에 부원 명부가 들어 있었습니다. 선배들의 이름은 모두 연필로 지워져 있었습니다.', effects: { mst: { MST_RULE: 2, MST_SEAL: 1 }, aptChance: [{ apt: 'RES', p: 0.3 }] } },
      { tag: '과학부', text: '과학부에 들어가 실험 일지를 쓴다.', result: '실험은 절반이 실패였지만, 실패한 이유를 끝까지 적는 습관이 남았습니다.', effects: { aptChance: [{ apt: 'PRC', p: 0.4 }, { apt: 'OBS', p: 0.3 }] } },
    ],
  }),
  scene({
    id: 'CH_11_SCHOOL_TRIP',
    title: '수학여행 숙소',
    place: '수학여행 숙소 304호',
    eligible: ages(12, 18),
    intro: '수학여행 숙소의 304호는 문에 붉은 테이프가 붙어 있었습니다. 밤이 되자 친구들이 그 방에서 베개 싸움을 하자고 했습니다.',
    prompt: '친구들이 눈치를 봅니다.',
    opts: [
      { tag: '앞장선다', text: '테이프를 떼고 먼저 문을 연다.', chance: { base: 0.5, apt: ['RES'] }, result: '방 안은 평범했습니다. 다만 다음 날 단체 사진에 우리 반 학생이 한 명 더 찍혀 있었습니다.', effects: { aptChance: [{ apt: 'RES', p: 0.4 }], mst: { MST_FIELD: 1 } }, fail: { text: '문을 연 순간 방 안의 공기가 얼음처럼 차가웠습니다. 사흘 동안 열이 났습니다.', effects: { HP: -8, aptChance: [{ apt: 'RES', p: 0.3 }] } } },
      { tag: '규칙을 지킨다', text: '테이프가 붙은 방에는 들어가지 않는 것이 규칙이라며 말린다.', result: '분위기를 깬다며 핀잔을 들었지만, 그날 밤 304호에서는 아무도 없는데 베개 터지는 소리가 났습니다.', effects: { aptChance: [{ apt: 'PRC', p: 0.4 }], mst: { MST_RULE: 1 } } },
      { tag: '선생님 방으로', text: '몰래 선생님 방에 가서 304호에 대해 묻는다.', result: '선생님은 한숨을 쉬더니 "올해도 그 방이냐"라고만 하고 문 앞에 소금을 뿌리러 나갔습니다.', effects: { aptChance: [{ apt: 'NEG', p: 0.3 }, { apt: 'OBS', p: 0.3 }] } },
    ],
  }),
  scene({
    id: 'CH_12_PART_TIME',
    title: '첫 아르바이트',
    place: '동네 PC방',
    eligible: ages(16, 21),
    intro: '처음으로 아르바이트를 구했습니다. 사장님은 첫날 "새벽 3시 33분에 켜지는 13번 자리는 손대지 마라"라고 했습니다.',
    prompt: '새벽 3시 33분, 13번 자리 모니터가 켜졌습니다.',
    opts: [
      { tag: '수칙대로', text: '사장님 말대로 못 본 척 계산대에 앉아 있는다.', result: '모니터는 4시 정각에 꺼졌습니다. 그 달 월급봉투에 만 원이 더 들어 있었습니다.', effects: { KRW: 15, mst: { MST_RULE: 2 } } },
      { tag: '전원을 끈다', text: '13번 자리 전원 코드를 뽑는다.', chance: { base: 0.5, apt: ['PRC'] }, result: '화면이 꺼지자 가게 안 공기가 한결 가벼워졌습니다. 다음 날 사장님은 아무것도 묻지 않았습니다.', effects: { mst: { MST_FIELD: 2 }, aptChance: [{ apt: 'PRC', p: 0.3 }] }, fail: { text: '코드를 뽑았는데도 화면은 켜져 있었습니다. 화면 속 채팅창에 내 이름이 적히기 시작했습니다. 그만두었습니다.', effects: { FAT: 8, KRW: -5, aptChance: [{ apt: 'RES', p: 0.3 }] } } },
      { tag: '화면을 본다', text: '가까이 가서 무엇이 떠 있는지 슬쩍 본다.', result: '오래된 게임의 로그인 화면이었습니다. 아이디 칸에 "돌아가고싶어"라고 적혀 있었습니다. 그 문장을 오래 잊지 못했습니다.', effects: { aptChance: [{ apt: 'OBS', p: 0.4 }, { apt: 'RES', p: 0.2 }], FAT: 3 } },
    ],
  }),
  scene({
    id: 'CH_13_FAMILY_MOVE',
    title: '이사 가는 날',
    place: '이삿짐 트럭 앞',
    eligible: ages(6, 15),
    intro: '이사를 가게 되었습니다. 짐을 다 뺀 빈집에서, 벽지 뒤로 누가 손톱으로 긁는 소리가 났습니다.',
    prompt: '부모님은 트럭에서 기다리고 있습니다.',
    opts: [
      { tag: '인사를 한다', text: '빈방에 대고 "그동안 고마웠어" 하고 인사한다.', result: '긁는 소리가 멎었습니다. 새집에 도착하니 가방 안에 처음 보는 유리구슬 하나가 들어 있었습니다.', effects: { aptChance: [{ apt: 'RES', p: 0.4 }], SUP: 1 } },
      { tag: '벽지를 뜯는다', text: '벽지 귀퉁이를 살짝 뜯어 본다.', result: '벽지 뒤에는 연필로 적은 키 눈금이 있었습니다. 맨 위 눈금은 천장에 닿아 있었습니다.', effects: { aptChance: [{ apt: 'OBS', p: 0.5 }], FAT: 3 } },
      { tag: '서둘러 나간다', text: '돌아보지 않고 트럭으로 뛰어간다.', result: '트럭이 출발하고 나서야 숨을 쉬었습니다. 무엇이든 끝날 때는 뒤를 보지 않는 버릇이 생겼습니다.', effects: { aptChance: [{ apt: 'PRC', p: 0.4 }], mst: { MST_BOUND: 1 } } },
    ],
  }),
  scene({
    id: 'CH_14_SICK_FRIEND',
    title: '병문안',
    place: '시립병원 소아 병동',
    eligible: ages(8, 16),
    intro: '단짝이 오래 입원했습니다. 병실 창가에는 매일 누가 두고 가는지 모를 하얀 국화 한 송이가 놓여 있었습니다.',
    prompt: '오늘도 병문안을 왔습니다.',
    opts: [
      { tag: '곁을 지킨다', text: '방과 후마다 와서 숙제를 같이 한다.', result: '친구는 겨울이 끝날 무렵 퇴원했습니다. "네가 매일 와서 그게 못 들어왔어"라고 했습니다.', effects: { aptChance: [{ apt: 'NEG', p: 0.4 }, { apt: 'RES', p: 0.3 }], FAT: 4 } },
      { tag: '국화를 치운다', text: '국화를 쓰레기통에 버리고 해바라기를 꽂는다.', result: '다음 날 국화는 다시 놓여 있었고, 해바라기는 시들어 있었습니다. 그래도 매일 바꿔 꽂았습니다. 이레째 되는 날 국화가 더는 오지 않았습니다.', effects: { mst: { MST_SEAL: 2 }, aptChance: [{ apt: 'PRC', p: 0.3 }] } },
      { tag: '누가 두는지 본다', text: '복도 끝 의자에 앉아 국화를 두고 가는 사람을 기다린다.', chance: { base: 0.5, apt: ['OBS'] }, result: '자정 무렵 휠체어 하나가 혼자 굴러와 국화를 내려놓고 갔습니다. 바퀴 자국이 벽을 타고 올라갔습니다.', effects: { aptChance: [{ apt: 'OBS', p: 0.5 }], mst: { MST_FIELD: 1 } }, fail: { text: '깜박 잠이 들었습니다. 눈을 뜨니 무릎 위에 국화가 놓여 있었습니다.', effects: { HP: -4, aptChance: [{ apt: 'RES', p: 0.3 }] } } },
    ],
  }),
  scene({
    id: 'CH_15_EXAM',
    title: '시험 전날 밤',
    place: '독서실',
    eligible: ages(14, 19),
    intro: '중요한 시험 전날입니다. 독서실 칸막이 너머에서 누가 "답 알려 줄까?" 하고 속삭였습니다.',
    prompt: '시계는 새벽 두 시를 가리킵니다.',
    opts: [
      { tag: '거절하고 공부', text: '대답하지 않고 끝까지 내 힘으로 정리한다.', result: '밤을 꼬박 새웠습니다. 성적은 중간이었지만, 끝까지 버티는 법을 알았습니다.', effects: { FAT: 6, aptChance: [{ apt: 'PRC', p: 0.5 }] } },
      { tag: '답을 듣는다', text: '"응" 하고 칸막이 쪽으로 귀를 댄다.', result: '들려준 답은 모두 맞았습니다. 그 대신 그해 겨울 내내 이름을 불러도 대답이 반 박자씩 늦었습니다.', effects: { KRW: 10, HP: -6, aptChance: [{ apt: 'RES', p: 0.3 }] }, trap: true },
      { tag: '집에 간다', text: '짐을 싸서 집으로 돌아가 푹 잔다.', result: '푹 잔 덕에 머리가 맑았습니다. 시험은 생각보다 잘 봤습니다.', effects: { HP: 4, aptChance: [{ apt: 'OBS', p: 0.2 }] } },
      { tag: '되묻기', text: '"그 대신 뭘 원하는데?" 하고 조건부터 묻는다.', result: '속삭임이 웃었습니다. "똑똑하네." 그러고는 다시는 말을 걸지 않았습니다.', effects: { mst: { MST_RULE: 2 }, aptChance: [{ apt: 'NEG', p: 0.3 }] } },
    ],
  }),
  scene({
    id: 'CH_16_STRAY_DOG',
    title: '떠돌이 개',
    place: '하굣길 굴다리',
    eligible: ages(6, 14),
    intro: '하굣길 굴다리 밑에서 다리를 저는 누런 개를 만났습니다. 개는 굴다리 안쪽을 보며 낮게 으르렁거렸습니다.',
    prompt: '개가 내 쪽을 돌아봅니다.',
    opts: [
      { tag: '데려간다', text: '조심스럽게 안아서 집으로 데려간다.', result: '부모님은 한숨을 쉬었지만 개를 내쫓지 않았습니다. 그 개는 밤마다 현관을 지켰습니다.', effects: { aptChance: [{ apt: 'RES', p: 0.3 }, { apt: 'NEG', p: 0.2 }], defense: 0.03 } },
      { tag: '돌아간다', text: '개가 노려보는 굴다리를 피해 먼 길로 돌아간다.', result: '삼십 분을 더 걸었습니다. 다음 날 굴다리는 출입 통제 테이프로 막혀 있었습니다.', effects: { aptChance: [{ apt: 'OBS', p: 0.4 }], FAT: 3 } },
      { tag: '먹이를 준다', text: '가방 속 빵을 나눠 주고 다리를 살펴 준다.', result: '개는 빵을 먹고 굴다리 반대편으로 사라졌습니다. 그 뒤로 굴다리를 지날 때마다 멀리서 짖는 소리가 길을 알려 주었습니다.', effects: { aptChance: [{ apt: 'PRC', p: 0.3 }], mst: { MST_BOUND: 1 } } },
    ],
  }),
  scene({
    id: 'CH_17_MIRROR_GAME',
    title: '거울 놀이',
    place: '친구 집 욕실',
    eligible: ages(10, 16),
    intro: '친구가 인터넷에서 봤다며 자정에 촛불을 켜고 거울을 보며 이름을 세 번 부르는 놀이를 하자고 했습니다.',
    prompt: '시계가 11시 58분을 가리킵니다.',
    opts: [
      { tag: '한다', text: '촛불을 들고 거울 앞에 선다.', chance: { base: 0.45, apt: ['RES'] }, result: '세 번째 이름을 부르기 전에 촛불이 꺼졌습니다. 거울 속 내가 먼저 입을 다물었습니다. 그날 이후 거울을 오래 보지 않게 되었습니다.', effects: { aptChance: [{ apt: 'RES', p: 0.5 }], mst: { MST_BOUND: 1 } }, fail: { text: '세 번을 다 불렀습니다. 거울 속 내가 한 박자 늦게 웃었습니다. 한 달 동안 악몽을 꿨습니다.', effects: { HP: -6, FAT: 6, aptChance: [{ apt: 'RES', p: 0.3 }] } } },
      { tag: '거울을 가린다', text: '수건으로 거울을 덮고, 대신 무서운 이야기나 하자고 한다.', result: '밤새 무서운 이야기를 주고받았습니다. 말솜씨가 제일 좋다는 소리를 들었습니다.', effects: { aptChance: [{ apt: 'NEG', p: 0.4 }], clues: ['CLU_REFLECTION'] } },
      { tag: '규칙을 바꾼다', text: '이름 대신 아무 의미 없는 말을 세 번 부르자고 우긴다.', result: '아무 일도 일어나지 않았습니다. 규칙의 빈틈을 비집는 쪽이 이긴다는 걸 처음 알았습니다.', effects: { mst: { MST_RULE: 2 }, aptChance: [{ apt: 'PRC', p: 0.2 }] } },
    ],
  }),
  scene({
    id: 'CH_18_FATHER_JOB',
    title: '아버지의 야근',
    place: '집 거실',
    eligible: ages(9, 17),
    intro: '아버지가 야근에서 돌아와 작업복을 세탁기에 넣었습니다. 주머니에서 젖은 회수권 한 장이 떨어졌습니다.',
    prompt: '회수권에는 오늘 날짜와 "귀환"이라는 도장이 찍혀 있습니다.',
    opts: [
      { tag: '물어본다', text: '아버지께 이게 뭐냐고 직접 여쭤본다.', result: '아버지는 한참 웃더니, 그 표를 잃어버리면 집에 못 올 뻔했다고 농담처럼 말했습니다. 그리고 표 쓰는 법을 알려 주었습니다.', effects: { clues: ['CLU_TRAIN_TICKET'], aptChance: [{ apt: 'NEG', p: 0.2 }] } },
      { tag: '몰래 보관', text: '말없이 내 서랍에 넣어 둔다.', result: '아버지는 다음 날 온 집을 뒤지다 포기했습니다. 그 표는 오래도록 서랍 속에서 마르지 않았습니다.', effects: { SUP: 1, aptChance: [{ apt: 'OBS', p: 0.3 }] } },
      { tag: '돌려드린다', text: '조용히 말려서 아버지 지갑에 넣어 둔다.', result: '다음 날 아침 아버지가 지갑을 열어 보고 내 머리를 오래 쓰다듬었습니다.', effects: { aptChance: [{ apt: 'PRC', p: 0.3 }, { apt: 'RES', p: 0.2 }] } },
    ],
  }),
  scene({
    id: 'CH_19_CAREER',
    title: '진로',
    place: '고등학교 진로 상담실',
    eligible: ages(16, 20),
    intro: '진로 상담 시간입니다. 선생님 책상 위에 재난청 현장직, 대학 진학, 바로 취업이라는 세 장의 안내지가 놓여 있었습니다.',
    prompt: '선생님이 무엇을 하고 싶은지 묻습니다.',
    opts: [
      { tag: '현장 쪽', text: '재난청 현장 실습 과정에 지원하겠다고 한다.', result: '실습 첫날 방독면을 쓰고 계단을 백 번 오르내렸습니다. 다리가 후들거렸지만 버텼습니다.', effects: { mst: { MST_FIELD: 4 }, HP: 3 } },
      { tag: '공부', text: '민속학과에 가서 옛 기록을 공부하겠다고 한다.', result: '도서관에서 사는 날이 늘었습니다. 오래된 문서에는 지금 도시의 수칙과 똑같은 문장이 적혀 있었습니다.', effects: { mst: { MST_RULE: 3, MST_SEAL: 1 } } },
      { tag: '바로 취업', text: '빨리 돈을 벌어 독립하겠다고 한다.', result: '졸업 전부터 일을 시작했습니다. 통장에 돈이 쌓이는 속도만큼 세상 물정을 배웠습니다.', effects: { KRW: 60, aptChance: [{ apt: 'PRC', p: 0.4 }] } },
      { tag: '모르겠다', text: '아직 모르겠다고 솔직하게 말한다.', result: '선생님은 그게 제일 정직한 대답이라며, 대신 이 도시에서 오래 살아남는 법이 적힌 얇은 책을 빌려주었습니다.', effects: { aptChance: [{ apt: 'OBS', p: 0.3 }, { apt: 'RES', p: 0.3 }] } },
    ],
  }),
  scene({
    id: 'CH_20_FIRST_LOVE',
    title: '첫사랑',
    place: '학교 옥상 계단',
    eligible: ages(14, 19),
    intro: '좋아하는 사람이 생겼습니다. 그런데 그 아이는 매일 옥상 계단에서 아무도 없는 쪽을 향해 말을 걸고 있었습니다.',
    prompt: '오늘도 그 아이가 옥상 계단에 앉아 있습니다.',
    opts: [
      { tag: '옆에 앉는다', text: '아무것도 묻지 않고 옆에 가만히 앉는다.', result: '그 아이가 처음으로 내 쪽을 보며 웃었습니다. "너도 들리는구나." 그 겨울 내내 둘이서 계단에 앉아 있었습니다.', effects: { aptChance: [{ apt: 'RES', p: 0.4 }, { apt: 'NEG', p: 0.3 }] } },
      { tag: '고백한다', text: '용기를 내서 좋아한다고 말한다.', chance: { base: 0.5, apt: ['NEG'] }, result: '그 아이는 얼굴이 빨개져서 "나도"라고 했습니다. 계단 위의 누군가도 박수를 치는 것 같았습니다.', effects: { HP: 4, aptChance: [{ apt: 'NEG', p: 0.5 }] }, fail: { text: '그 아이는 미안하다고 했습니다. 그날 밤 누군가 창문을 두 번 두드리며 위로해 주었습니다.', effects: { FAT: 6, aptChance: [{ apt: 'RES', p: 0.3 }] } } },
      { tag: '누구랑 말하는지', text: '그 아이가 말을 거는 쪽을 몰래 살핀다.', result: '계단 난간에 오래된 졸업 앨범 사진 한 장이 끼워져 있었습니다. 그 아이와 똑같이 생긴 학생이었습니다.', effects: { aptChance: [{ apt: 'OBS', p: 0.5 }], clues: ['CLU_MISSING_FACE'] } },
    ],
  }),
  scene({
    id: 'CH_21_SIREN_DRILL',
    title: '대피 훈련',
    place: '중학교 운동장',
    eligible: ages(12, 18),
    intro: '대피 훈련 사이렌이 울렸습니다. 그런데 이번 사이렌은 훈련 일정표에 없던 것이었고, 방송은 "운동장으로"가 아니라 "옥상으로"라고 했습니다.',
    prompt: '아이들이 우왕좌왕합니다.',
    opts: [
      { tag: '수칙대로', text: '외운 수칙대로 운동장으로 나가 반 아이들을 줄 세운다.', result: '선생님들이 뒤늦게 달려와 옥상 문을 잠갔습니다. 반 아이들이 처음으로 나를 "반장"이라고 불렀습니다.', effects: { mst: { MST_RULE: 2 }, aptChance: [{ apt: 'PRC', p: 0.3 }, { apt: 'NEG', p: 0.2 }] } },
      { tag: '방송실로', text: '방송실로 달려가 마이크를 끈다.', chance: { base: 0.45, apt: ['PRC', 'RES'] }, result: '방송실에는 아무도 없었는데 마이크가 켜져 있었습니다. 전원을 내리자 사이렌이 멎었습니다.', effects: { mst: { MST_FIELD: 3 }, aptChance: [{ apt: 'RES', p: 0.3 }] }, fail: { text: '방송실 문이 안에서 잠겨 있었습니다. 문을 두드리는 사이 손등이 차갑게 젖었습니다.', effects: { HP: -6, mst: { MST_FIELD: 1 } } } },
      { tag: '숨는다', text: '교실 사물함 뒤에 웅크려 사이렌이 끝나길 기다린다.', result: '사이렌은 십 분 뒤 멎었습니다. 복도로 나가 보니 옥상으로 올라간 아이는 다행히 아무도 없었습니다.', effects: { FAT: 3, aptChance: [{ apt: 'OBS', p: 0.3 }] } },
    ],
  }),
  scene({
    id: 'CH_22_GAME_CENTER',
    title: '오락실의 기록',
    place: '골목 오락실',
    eligible: ages(9, 15),
    intro: '골목 오락실 낡은 기계의 최고 기록 1위 이름이 매일 바뀌었습니다. 오늘은 내 이름이었습니다. 나는 그 기계를 해 본 적이 없습니다.',
    prompt: '기계 화면이 "계속하시겠습니까?"라고 묻습니다.',
    opts: [
      { tag: '동전을 넣는다', text: '동전을 넣고 플레이한다.', chance: { base: 0.5, apt: ['PRC'] }, result: '손이 저절로 움직였습니다. 최고 기록을 넘기자 화면에 "고마워, 이제 쉴게"라는 글자가 떴고, 기계가 꺼졌습니다.', effects: { KRW: -1, aptChance: [{ apt: 'PRC', p: 0.4 }], mst: { MST_FIELD: 1 } }, fail: { text: '게임 오버가 뜨자 기계 속 캐릭터가 화면 밖을 보며 손을 흔들었습니다. 그날 밤 꿈속에서 계속 그 게임을 했습니다.', effects: { KRW: -1, FAT: 6 } } },
      { tag: '주인에게 묻는다', text: '오락실 주인 할아버지께 기록에 대해 묻는다.', result: '할아버지는 그 기계가 20년 전 사고 뒤로 꺼지지 않는다고 했습니다. 그리고 내 이름이 뜬 날은 일찍 들어가라고 했습니다.', effects: { aptChance: [{ apt: 'NEG', p: 0.3 }], mst: { MST_RULE: 1 } } },
      { tag: '전원을 뺀다', text: '아무도 안 볼 때 기계 뒤 전원 플러그를 뽑는다.', result: '플러그를 뽑아도 화면은 3초 더 켜져 있다가 꺼졌습니다. 다음 날 기계는 고물상에 실려 갔습니다.', effects: { aptChance: [{ apt: 'OBS', p: 0.3 }, { apt: 'PRC', p: 0.2 }] } },
    ],
  }),
];

// ---------------------------------------------------------------- 어른의 일상 갈림길

export const DAILY_CHOICES: IncidentDef[] = [
  scene({
    id: 'DY_01_LATE_TAXI',
    title: '새벽 택시',
    place: '대로변 택시 승강장',
    intro: '야근을 마치고 택시를 잡았습니다. 미터기가 꺼진 채 문이 먼저 열렸고, 기사는 행선지를 묻지 않았습니다.',
    prompt: '뒷좌석 문이 열린 채 기다립니다.',
    opts: [
      { tag: '탄다', text: '피곤하니 그냥 탄다. 행선지는 내가 말한다.', chance: { base: 0.5, apt: ['NEG'] }, result: '기사는 백미러로 나를 한참 보더니 정확히 집 앞에 내려 주었습니다. 요금은 받지 않았습니다.', effects: { FAT: -6, aptChance: [{ apt: 'NEG', p: 0.15 }] }, fail: { text: '택시는 한 시간 동안 같은 고가도로를 돌았습니다. 겨우 문을 열고 뛰어내렸습니다.', effects: { FAT: 10, HP: -5 } } },
      { tag: '보낸다', text: '"다음 차 탈게요" 하고 문을 닫는다.', result: '다음 택시는 미터기가 켜져 있었습니다. 요금이 조금 더 나왔지만 무사히 들어갔습니다.', effects: { KRW: -3, mst: { MST_RULE: 1 } } },
      { tag: '걸어간다', text: '택시를 보내고 한 시간을 걸어서 간다.', result: '다리가 퉁퉁 부었지만 밤공기를 마시며 걷는 동안 머리가 맑아졌습니다.', effects: { FAT: 8, HP: 2, mst: { MST_FIELD: 1 } } },
    ],
  }),
  scene({
    id: 'DY_02_NEIGHBOR_PARCEL',
    title: '잘못 온 택배',
    place: '복도',
    intro: '현관 앞에 옆집으로 가야 할 택배가 놓여 있었습니다. 상자가 미세하게 따뜻했고, 안에서 째깍거리는 소리가 났습니다.',
    prompt: '송장에는 옆집 호수가 적혀 있습니다.',
    opts: [
      { tag: '전해 준다', text: '옆집 문을 두드려 직접 전해 준다.', result: '옆집 이웃은 상자를 받자마자 표정이 굳더니 고맙다며 귤 한 봉지를 내밀었습니다.', effects: { trust: { NPC_NEIGHBOR: 4 }, SUP: 1, FAT: 2 } },
      { tag: '경비실에', text: '경비실에 맡기고 관리소에 알린다.', result: '경비 아저씨는 상자를 보더니 장갑을 끼고 받았습니다. 절차대로 처리하는 게 마음이 편했습니다.', effects: { mst: { MST_RULE: 1 }, FAT: 2 } },
      { tag: '열어 본다', text: '송장이 잘못됐을 수도 있으니 살짝 열어 본다.', chance: { base: 0.45, apt: ['OBS'] }, result: '안에는 낡은 회중시계가 들어 있었습니다. 시계는 내가 상자를 열자 거꾸로 돌기 시작했다가, 닫자 멈췄습니다. 조용히 다시 테이프를 붙였습니다.', effects: { aptChance: [{ apt: 'OBS', p: 0.15 }], mst: { MST_FIELD: 1 } }, fail: { text: '상자를 여는 순간 째깍 소리가 내 손목으로 옮겨 왔습니다. 일주일 동안 맥박이 시계 소리처럼 들렸습니다.', effects: { HP: -6, FAT: 6 } } },
    ],
  }),
  scene({
    id: 'DY_03_OVERTIME',
    title: '갑작스러운 야근',
    place: '사무실',
    intro: '퇴근 십 분 전, 상사가 내일 아침까지 끝내야 할 서류 더미를 책상에 올려놓았습니다.',
    prompt: '창밖으로 해가 지고 있습니다. 이 건물은 밤 열 시 이후 엘리베이터가 4층에 서지 않습니다.',
    opts: [
      { tag: '남아서 한다', text: '야근 수당을 받고 끝까지 남아서 처리한다.', result: '서류를 모두 끝냈습니다. 계단으로 내려오는 동안 4층 비상구 표시등이 한 번도 깜박이지 않았습니다.', effects: { KRW: 25, FAT: 10, aptChance: [{ apt: 'PRC', p: 0.12 }] } },
      { tag: '거절한다', text: '오늘은 안 된다고 정중하지만 분명하게 말한다.', chance: { base: 0.5, apt: ['NEG'] }, result: '상사는 잠시 노려보더니 서류를 다른 사람에게 넘겼습니다. 다음 날 아무 일도 없었습니다.', effects: { FAT: -3, aptChance: [{ apt: 'NEG', p: 0.15 }] }, fail: { text: '상사는 웃으며 서류를 그대로 두고 갔습니다. 결국 새벽까지 남았고, 한동안 눈치를 봐야 했습니다.', effects: { FAT: 12, KRW: 10 } } },
      { tag: '집에 가져간다', text: '서류를 싸 들고 집에 가서 처리한다.', result: '집 식탁에서 새벽까지 일했습니다. 회사보다 조용했지만, 서류 한 장의 서명란이 밤새 저절로 채워져 있었습니다.', effects: { FAT: 8, KRW: 15, mst: { MST_RULE: 1 } } },
    ],
  }),
  scene({
    id: 'DY_04_STREET_STALL',
    title: '노점 할머니',
    place: '지하철역 출구',
    intro: '지하철역 출구에서 할머니 한 분이 손뜨개 장갑을 팔고 있었습니다. 장갑마다 손바닥에 작은 글자가 수놓여 있었습니다.',
    prompt: '할머니가 "하나 가져가, 올겨울 손 시릴 거야"라고 합니다.',
    opts: [
      { tag: '산다', text: '값을 넉넉히 치르고 한 켤레 산다.', result: '장갑 손바닥에는 "놓지 마"라고 수놓여 있었습니다. 그 겨울, 장갑을 낀 손은 무엇을 잡아도 미끄러지지 않았습니다.', effects: { KRW: -3, SUP: 1, defense: 0.03 } },
      { tag: '말동무', text: '장갑 대신 할머니 옆에 앉아 한참 이야기를 듣는다.', result: '할머니는 이 역이 생기기 전 이 자리에 있던 우물 이야기를 해 주었습니다. 우물은 아직 어딘가에 있다고 했습니다.', effects: { aptChance: [{ apt: 'NEG', p: 0.12 }], clues: ['CLU_DRAIN'], FAT: 2 } },
      { tag: '지나간다', text: '바빠서 고개만 숙이고 지나간다.', result: '등 뒤에서 할머니가 "조심해 가" 하고 말했습니다. 그날따라 그 말이 오래 귀에 남았습니다.', effects: { FAT: -2 } },
    ],
  }),
  scene({
    id: 'DY_05_GYM',
    title: '건강 검진 결과',
    place: '동네 의원',
    intro: '건강 검진 결과가 나왔습니다. 의사는 체력이 많이 떨어졌다며, 무엇이든 꾸준히 하라고 했습니다.',
    prompt: '의원 게시판에 운동 강좌 전단이 붙어 있습니다.',
    opts: [
      { tag: '헬스장 등록', text: '집 앞 헬스장에 석 달 치를 등록한다.', result: '첫 주는 온몸이 쑤셨지만, 석 달 뒤 계단을 두 칸씩 오를 수 있게 되었습니다.', effects: { KRW: -15, HP: 8, mst: { MST_FIELD: 2 } } },
      { tag: '호신술', text: '구민회관의 호신술 강좌에 들어간다.', result: '강사는 첫 시간에 "도망치는 것도 기술"이라고 했습니다. 빠져나가는 법을 몸이 기억하게 되었습니다.', effects: { KRW: -8, mst: { MST_FIELD: 3 }, FAT: 4 } },
      { tag: '산책', text: '돈 들이지 않고 매일 저녁 동네를 걷는다.', result: '매일 같은 길을 걷다 보니 골목의 작은 변화가 눈에 들어오기 시작했습니다.', effects: { HP: 4, aptChance: [{ apt: 'OBS', p: 0.12 }] } },
      { tag: '미룬다', text: '다음 달부터 하자고 미룬다.', result: '다음 달은 오지 않았습니다. 대신 잠은 푹 잤습니다.', effects: { FAT: -6, HP: -2 } },
    ],
  }),
  scene({
    id: 'DY_06_ROOMMATE_RULE',
    title: '집주인의 쪽지',
    place: '현관문',
    intro: '현관문에 집주인의 쪽지가 붙어 있었습니다. "이번 주 금요일 밤에는 욕조에 물을 받아 두지 마세요."',
    prompt: '금요일 밤입니다. 오늘은 유난히 피곤해서 반신욕이 하고 싶습니다.',
    opts: [
      { tag: '지킨다', text: '쪽지대로 샤워만 하고 일찍 잔다.', result: '자정 무렵 욕실에서 물 떨어지는 소리가 났지만, 욕조는 바짝 말라 있었습니다.', effects: { mst: { MST_RULE: 2 }, FAT: -3 } },
      { tag: '받는다', text: '괜찮겠지 싶어 욕조에 물을 받는다.', chance: { base: 0.35, apt: ['RES'] }, result: '따뜻한 물에 몸을 담그니 피로가 녹았습니다. 물 위로 내 얼굴 말고 다른 얼굴이 비친 것은 아마 착각이었을 겁니다.', effects: { FAT: -12 }, fail: { text: '물속에서 누가 발목을 잡았습니다. 허겁지겁 뛰쳐나와 미끄러졌습니다.', effects: { HP: -8, FAT: 6, aptChance: [{ apt: 'RES', p: 0.12 }] } }, trap: true },
      { tag: '집주인에게', text: '집주인에게 전화해서 이유를 묻는다.', chance: { base: 0.5, apt: ['NEG'] }, result: '집주인은 머뭇거리다 예전 세입자 이야기를 해 주었습니다. 그리고 이번 달 관리비를 깎아 주었습니다.', effects: { KRW: 5, aptChance: [{ apt: 'NEG', p: 0.12 }], mst: { MST_RULE: 1 } }, fail: { text: '집주인은 "그냥 하지 마세요"라고만 하고 끊었습니다. 왠지 더 무서워졌습니다.', effects: { FAT: 4 } } },
    ],
  }),
  scene({
    id: 'DY_07_LOST_CHILD',
    title: '길 잃은 아이',
    place: '대형 마트',
    intro: '마트에서 엄마를 찾는다며 우는 아이를 만났습니다. 아이는 이름을 물어도 대답하지 않고, 내 손만 꼭 잡으려 했습니다.',
    prompt: '아이의 손이 이상할 만큼 차갑습니다.',
    opts: [
      { tag: '안내 데스크로', text: '손은 잡지 않고 앞장서서 안내 데스크까지 데려간다.', result: '방송을 하자 아이 엄마가 달려왔습니다. 아이는 엄마 품에서 나를 돌아보며 혀를 쏙 내밀었습니다.', effects: { mst: { MST_RULE: 1 }, aptChance: [{ apt: 'PRC', p: 0.1 }] } },
      { tag: '손을 잡는다', text: '아이 손을 잡고 같이 엄마를 찾아 나선다.', chance: { base: 0.5, apt: ['RES'] }, result: '한참을 헤맨 끝에 엄마를 찾았습니다. 아이 손의 온기가 조금씩 돌아오는 것이 느껴졌습니다.', effects: { aptChance: [{ apt: 'RES', p: 0.15 }], FAT: 4 }, fail: { text: '아이 손을 잡고 걷다 보니 마트 진열대가 끝없이 이어졌습니다. 손을 놓자 아이는 사라지고 출구가 보였습니다.', effects: { FAT: 10, HP: -4, mst: { MST_BOUND: 1 } } } },
      { tag: '물어본다', text: '쪼그려 앉아 엄마 옷 색깔과 마지막으로 본 곳을 차근차근 묻는다.', result: '아이는 울음을 그치고 "빨간 옷, 냉동 코너"라고 했습니다. 정확히 그곳에 엄마가 있었습니다.', effects: { aptChance: [{ apt: 'NEG', p: 0.15 }, { apt: 'OBS', p: 0.08 }] } },
    ],
  }),
  scene({
    id: 'DY_08_SIDE_JOB',
    title: '수상한 부업',
    place: '휴대폰 문자',
    intro: '"일당 50만원. 밤 11시부터 새벽 4시까지 빈 건물 지키기. 절대 4층에 올라가지 않으면 됩니다." 모르는 번호로 문자가 왔습니다.',
    prompt: '통장 잔고가 떠오릅니다.',
    opts: [
      { tag: '한다', text: '하룻밤만이라며 연락한다.', chance: { base: 0.5, apt: ['PRC', 'RES'] }, result: '새벽 내내 4층에서 누가 걷는 소리가 났지만 올라가지 않았습니다. 아침에 봉투를 받았습니다.', effects: { KRW: 50, FAT: 14, mst: { MST_RULE: 1 } }, fail: { text: '새벽 세 시, 4층에서 내 이름을 부르는 목소리가 들렸고 발이 저절로 계단을 올랐습니다. 정신을 차려 보니 1층 바닥이었습니다. 돈은 받았지만 몸이 성치 않습니다.', effects: { KRW: 50, HP: -12, FAT: 16 } } },
      { tag: '거절', text: '답장하지 않고 번호를 차단한다.', result: '그 주 뉴스에 빈 건물 경비원 실종 기사가 짧게 실렸습니다.', effects: { mst: { MST_RULE: 1 }, aptChance: [{ apt: 'OBS', p: 0.08 }] } },
      { tag: '신고', text: '재난청 민원 창구에 문자를 그대로 신고한다.', result: '며칠 뒤 감사 문자가 왔습니다. 신고 포상금이 소소하게 들어왔습니다.', effects: { KRW: 8, mst: { MST_RULE: 1 }, clues: ['CLU_FAKE_SMS'] } },
    ],
  }),
  scene({
    id: 'DY_09_RAIN_UMBRELLA',
    title: '빗속의 우산',
    place: '버스 정류장',
    intro: '갑자기 비가 쏟아졌습니다. 정류장 벤치에 주인 없는 검은 우산이 하나 기대어 있었습니다.',
    prompt: '집까지는 뛰어서 십 분입니다.',
    opts: [
      { tag: '쓴다', text: '잠깐만 빌리자며 우산을 쓰고 간다.', result: '우산 안쪽에서 빗소리 대신 누가 흥얼거리는 소리가 들렸습니다. 집 앞에서 우산을 접자 소리가 멎었고, 우산은 다음 날 사라져 있었습니다.', effects: { FAT: -2, aptChance: [{ apt: 'RES', p: 0.1 }] } },
      { tag: '뛴다', text: '우산은 두고 비를 맞으며 뛰어간다.', result: '흠뻑 젖었습니다. 감기 기운이 돌았지만 마음은 편했습니다.', effects: { HP: -3, FAT: 3, mst: { MST_FIELD: 1 } } },
      { tag: '기다린다', text: '비가 그칠 때까지 정류장에서 기다리며 우산을 지켜본다.', result: '한 시간 뒤 젖은 정장 차림의 남자가 와서 우산을 들고 고개를 숙이더니, 빗속으로 사라졌습니다. 발자국이 남지 않았습니다.', effects: { FAT: 4, aptChance: [{ apt: 'OBS', p: 0.12 }] } },
    ],
  }),
  scene({
    id: 'DY_10_FRIEND_DEBT',
    title: '친구의 부탁',
    place: '단골 국밥집',
    intro: '오랜 친구가 국밥을 사 주며 어렵게 말을 꺼냈습니다. 급히 돈이 필요하다고 합니다. 친구의 눈 밑이 검게 꺼져 있었습니다.',
    prompt: '친구가 숟가락을 내려놓고 기다립니다.',
    opts: [
      { tag: '빌려준다', text: '사정을 묻지 않고 빌려준다.', result: '친구는 몇 번이고 고맙다고 했습니다. 돈은 오래 돌아오지 않았지만, 친구는 그 뒤로 위험한 일이 있을 때마다 먼저 전화를 걸어 주었습니다.', effects: { KRW: -40, aptChance: [{ apt: 'NEG', p: 0.15 }], defense: 0.04 } },
      { tag: '사정을 듣는다', text: '먼저 무슨 일인지 차근차근 묻는다.', chance: { base: 0.5, apt: ['NEG', 'OBS'] }, result: '친구는 이상한 계약서에 서명했다고 털어놓았습니다. 함께 조항을 읽어 빠져나갈 구멍을 찾았습니다.', effects: { mst: { MST_RULE: 3 }, FAT: 5 }, fail: { text: '친구는 말을 돌리다 자리를 떴습니다. 계산서만 내 앞에 남았습니다.', effects: { KRW: -2, FAT: 3 } } },
      { tag: '거절', text: '나도 형편이 어렵다고 솔직하게 말한다.', result: '친구는 이해한다며 웃었지만, 그 뒤로 연락이 뜸해졌습니다.', effects: { FAT: 2, aptChance: [{ apt: 'PRC', p: 0.08 }] } },
    ],
  }),
  scene({
    id: 'DY_11_BLACKOUT',
    title: '정전',
    place: '집',
    intro: '단지 전체가 정전되었습니다. 어둠 속에서 냉장고가 꺼진 뒤에도 무언가 계속 웅웅거렸습니다.',
    prompt: '휴대폰 배터리가 12% 남았습니다.',
    opts: [
      { tag: '양초를 켠다', text: '서랍에서 양초를 꺼내 켜고 거실에 앉아 기다린다.', result: '촛불 아래에서 웅웅거림이 잦아들었습니다. 전기는 새벽에 들어왔습니다.', effects: { SUP: -1, FAT: -4, mst: { MST_SEAL: 1 } }, requires: { res: 'SUP', min: 1 } },
      { tag: '소리를 찾는다', text: '휴대폰 불빛에 의지해 웅웅거리는 소리를 따라간다.', chance: { base: 0.5, apt: ['OBS', 'RES'] }, result: '소리는 다용도실 세탁기 안에서 났습니다. 문을 열자 젖은 빨래 한 벌이 혼자 돌고 있었습니다. 문을 닫고 테이프를 붙였습니다.', effects: { mst: { MST_FIELD: 2 }, aptChance: [{ apt: 'OBS', p: 0.1 }] }, fail: { text: '배터리가 꺼졌습니다. 어둠 속에서 벽을 더듬다 무언가 축축한 것을 만졌습니다.', effects: { HP: -5, FAT: 6 } } },
      { tag: '이웃을 찾는다', text: '복도로 나가 옆집 문을 두 번 두드린다.', result: '옆집 이웃이 손전등을 들고 나왔습니다. 둘이 복도에 앉아 전기가 올 때까지 이야기를 나눴습니다.', effects: { trust: { NPC_NEIGHBOR: 5 }, FAT: -2 } },
      { tag: '잔다', text: '이불을 머리끝까지 덮고 잔다.', result: '꿈속에서도 웅웅거림이 들렸지만, 아침이 오자 모두 잊었습니다.', effects: { FAT: -6, HP: -1 } },
    ],
  }),
  scene({
    id: 'DY_12_SECOND_HAND',
    title: '중고 거래',
    place: '중고 거래 앱',
    intro: '중고 거래 앱에 시세의 십분의 일 가격으로 거의 새 냉장고가 올라왔습니다. 판매자 설명: "밤에 소리가 나서 팝니다."',
    prompt: '판매자가 지금 바로 오면 공짜로 주겠다고 합니다.',
    opts: [
      { tag: '산다', text: '싸니까 바로 가서 받아 온다.', chance: { base: 0.45, apt: ['PRC'] }, result: '냉장고는 밤마다 문 안쪽에서 두드리는 소리를 냈지만, 소금 한 접시를 넣어 두자 조용해졌습니다. 전기료가 오히려 줄었습니다.', effects: { KRW: 10, mst: { MST_SEAL: 1 } }, fail: { text: '사흘째 되는 밤, 냉장고 문이 저절로 열려 있었고 안의 음식이 모두 얼음처럼 굳어 있었습니다. 폐기 비용만 들었습니다.', effects: { KRW: -10, FAT: 6 } } },
      { tag: '판매자를 캔다', text: '판매자에게 소리에 대해 꼬치꼬치 묻는다.', result: '판매자는 결국 냉장고를 산 뒤로 집에 사람이 하나 더 산다고 털어놓았습니다. 재난청 상담 번호를 알려 주었습니다.', effects: { aptChance: [{ apt: 'NEG', p: 0.1 }, { apt: 'OBS', p: 0.08 }], mst: { MST_RULE: 1 } } },
      { tag: '넘긴다', text: '세상에 공짜는 없다며 창을 닫는다.', result: '며칠 뒤 그 글은 지워져 있었습니다.', effects: { mst: { MST_RULE: 1 } } },
    ],
  }),
  scene({
    id: 'DY_13_HOSPITAL_VISIT',
    title: '아픈 몸',
    place: '집',
    intro: '아침에 일어나니 온몸이 무겁고 열이 났습니다. 오늘은 중요한 일이 잡혀 있는 날입니다.',
    prompt: '체온계가 38.4도를 가리킵니다.',
    opts: [
      { tag: '병원에 간다', text: '일을 미루고 병원에 가서 링거를 맞는다.', result: '하루를 통째로 쉬었습니다. 몸은 가벼워졌지만 일은 쌓였습니다.', effects: { KRW: -6, HP: 10, FAT: -10 } },
      { tag: '참고 출근', text: '해열제를 먹고 출근한다.', result: '어떻게든 하루를 버텼습니다. 퇴근길 지하철에서 졸다가 종점까지 갔습니다.', effects: { KRW: 8, HP: -6, FAT: 10 } },
      { tag: '민간요법', text: '할머니가 알려 준 대로 생강차를 끓이고 이마에 부적 종이를 얹고 잔다.', result: '꿈속에서 누군가 이마의 종이를 떼려다 손을 데었습니다. 아침에 열이 내려 있었습니다.', effects: { HP: 5, FAT: -4, mst: { MST_SEAL: 1 } } },
    ],
  }),
  scene({
    id: 'DY_14_STUDY_GROUP',
    title: '스터디 모임',
    place: '동네 카페',
    intro: '동네 카페에 "도시 괴이 생활 수칙 스터디원 모집" 전단이 붙어 있었습니다. 모임은 매주 목요일 밤입니다.',
    prompt: '전단 아래 연락처가 몇 장 뜯겨 나갔습니다.',
    opts: [
      { tag: '참여한다', text: '연락처를 뜯어 가서 참여한다.', result: '모임 사람들은 저마다 살아남은 이야기를 하나씩 가지고 있었습니다. 수첩이 금세 빼곡해졌습니다.', effects: { mst: { MST_RULE: 3 }, FAT: 4, aptChance: [{ apt: 'NEG', p: 0.08 }] } },
      { tag: '혼자 공부', text: '모임 대신 도서관에서 혼자 자료를 찾는다.', result: '혼자 읽는 것은 느렸지만, 누가 덧쓴 문장인지 가려내는 눈이 생겼습니다.', effects: { mst: { MST_RULE: 2 }, aptChance: [{ apt: 'OBS', p: 0.1 }] } },
      { tag: '전단을 살핀다', text: '전단의 인쇄 상태와 날짜를 먼저 살핀다.', result: '전단은 7년 전 날짜였는데 잉크가 마르지 않았습니다. 연락처를 뜯지 않았습니다.', effects: { aptChance: [{ apt: 'OBS', p: 0.12 }], clues: ['CLU_PAPER_DEFECT'] } },
    ],
  }),
  scene({
    id: 'DY_15_PARENTS_CALL',
    title: '부모님의 전화',
    place: '휴대폰',
    eligible: { age: { max: 60 } },
    intro: '오랜만에 고향 집에서 전화가 왔습니다. 수화기 너머 목소리가 반가워하면서도, 어딘가 다급했습니다.',
    prompt: '"이번 주말에 한번 내려올 수 있니?"',
    opts: [
      { tag: '내려간다', text: '주말 일정을 비우고 고향에 내려간다.', result: '부모님은 별일 아니라며 웃었지만, 집 대문에 새로 붙인 부적이 세 장이었습니다. 나도 한 장을 받아 왔습니다.', effects: { KRW: -8, FAT: -6, SUP: 1, aptChance: [{ apt: 'RES', p: 0.08 }] } },
      { tag: '용돈을 보낸다', text: '바빠서 못 간다며 대신 용돈을 넉넉히 보낸다.', result: '부모님은 고맙다고 했습니다. 통화를 끊고 나서야 다급했던 목소리의 이유를 묻지 않았다는 게 떠올랐습니다.', effects: { KRW: -15, FAT: -2 } },
      { tag: '자세히 묻는다', text: '무슨 일이 있는지 하나하나 묻는다.', chance: { base: 0.5, apt: ['NEG'] }, result: '마을 우물이 다시 차올랐다는 이야기였습니다. 조심해야 할 날짜들을 받아 적었습니다.', effects: { mst: { MST_RULE: 1, MST_BOUND: 1 }, aptChance: [{ apt: 'NEG', p: 0.08 }] }, fail: { text: '부모님은 "아니다, 됐다"라며 전화를 끊었습니다. 그 주 내내 마음이 쓰였습니다.', effects: { FAT: 6 } } },
    ],
  }),
  scene({
    id: 'DY_16_SUBWAY_SEAT',
    title: '빈자리',
    place: '출근길 지하철',
    intro: '꽉 찬 출근길 지하철에 빈자리가 딱 하나 있었습니다. 아무도 앉지 않았습니다. 자리 위에 젖은 손자국이 있습니다.',
    prompt: '다리가 몹시 아픕니다.',
    opts: [
      { tag: '앉는다', text: '닦고 앉는다. 피곤한 건 피곤한 거다.', chance: { base: 0.4, apt: ['RES'] }, result: '앉자마자 잠이 쏟아졌지만 제 역에서 정확히 눈이 떠졌습니다. 개운했습니다.', effects: { FAT: -8 }, fail: { text: '눈을 떠 보니 처음 보는 역이었습니다. 역 이름 표지판이 비어 있었습니다. 반대편 열차를 타고 한 시간을 돌아왔습니다.', effects: { FAT: 8, KRW: -2, mst: { MST_BOUND: 1 } } }, trap: true },
      { tag: '서서 간다', text: '다른 사람들처럼 서서 간다.', result: '다리는 아팠지만 무사히 출근했습니다. 남들이 피하는 것은 이유가 있습니다.', effects: { FAT: 3, mst: { MST_RULE: 1 } } },
      { tag: '노인에게 양보', text: '앞에 선 할아버지에게 그 자리를 가리킨다.', result: '할아버지는 자리를 보더니 고개를 저으며 "젊은이, 저건 사람 앉으라고 비운 자리가 아니야"라고 웃었습니다.', effects: { aptChance: [{ apt: 'NEG', p: 0.08 }, { apt: 'OBS', p: 0.08 }] } },
    ],
  }),
  scene({
    id: 'DY_17_PROMOTION_OFFER',
    title: '승진 제안',
    place: '회사 회의실',
    eligible: { age: { min: 26, max: 58 } },
    intro: '팀장이 조용히 불러 승진을 제안했습니다. 대신 매달 한 번, 지하 2층 기록 보관실의 야간 점검을 맡아야 한다고 합니다.',
    prompt: '팀장이 펜을 내밉니다.',
    opts: [
      { tag: '수락', text: '조건을 받아들이고 서명한다.', result: '월급이 올랐습니다. 지하 2층 점검은 생각보다 조용했지만, 점검표의 서명이 매달 하나씩 늘었습니다.', effects: { KRW: 30, FAT: 6, mst: { MST_FIELD: 2 } } },
      { tag: '조건 협상', text: '점검을 2인 1조로 바꾸는 조건이면 하겠다고 한다.', chance: { base: 0.5, apt: ['NEG'] }, result: '팀장은 잠시 생각하더니 받아들였습니다. 동료와 함께 내려가는 지하는 덜 무서웠습니다.', effects: { KRW: 20, aptChance: [{ apt: 'NEG', p: 0.12 }] }, fail: { text: '팀장은 그럼 없던 일로 하자며 펜을 거뒀습니다.', effects: { FAT: 3 } } },
      { tag: '거절', text: '지금 자리에 만족한다며 거절한다.', result: '승진은 다른 사람에게 돌아갔습니다. 석 달 뒤 그 사람은 휴직계를 냈습니다.', effects: { FAT: -2, mst: { MST_RULE: 1 } } },
    ],
  }),
  scene({
    id: 'DY_18_CAT',
    title: '창밖의 고양이',
    place: '원룸 창가',
    intro: '밤마다 창밖 실외기 위에 검은 고양이가 와서 앉아 있었습니다. 고양이는 늘 방 안이 아니라 내 등 뒤를 보고 있었습니다.',
    prompt: '오늘도 고양이가 왔습니다.',
    opts: [
      { tag: '밥을 준다', text: '참치캔을 따서 창밖에 놓아 준다.', result: '고양이는 밥을 먹고 나서 한참 내 등 뒤를 향해 하악질을 했습니다. 그날 밤은 깊이 잤습니다.', effects: { KRW: -1, FAT: -5, defense: 0.03 } },
      { tag: '돌아본다', text: '고양이가 보는 방향으로 천천히 돌아본다.', chance: { base: 0.5, apt: ['RES'] }, result: '아무것도 없었습니다. 다만 옷장 문이 손가락 한 마디만큼 열려 있었습니다. 닫고 테이프를 붙였습니다.', effects: { aptChance: [{ apt: 'OBS', p: 0.12 }], mst: { MST_FIELD: 1 } }, fail: { text: '돌아보는 순간 방 안의 불이 꺼졌습니다. 다시 켜졌을 때 고양이는 사라지고 없었습니다. 몇 주 동안 잠을 설쳤습니다.', effects: { FAT: 10, HP: -3 } } },
      { tag: '커튼을 친다', text: '커튼을 치고 신경 쓰지 않는다.', result: '고양이는 더 오지 않았습니다. 대신 커튼 너머로 무언가 창을 긁는 소리가 이따금 났습니다.', effects: { FAT: 2 } },
    ],
  }),
  scene({
    id: 'DY_19_DONATION',
    title: '거리 모금',
    place: '광장',
    intro: '광장에서 "실종자 가족 모임" 모금함을 든 사람들이 전단을 나눠 주고 있었습니다. 전단 속 얼굴들이 보는 각도에 따라 표정이 바뀌었습니다.',
    prompt: '한 사람이 전단을 내밉니다.',
    opts: [
      { tag: '기부한다', text: '모금함에 지폐를 넣고 전단을 받는다.', result: '모금하던 사람이 고개를 깊이 숙였습니다. 전단 속 한 얼굴이 아주 잠깐 웃었습니다.', effects: { KRW: -5, aptChance: [{ apt: 'RES', p: 0.1 }], clues: ['CLU_MISSING_FACE'] } },
      { tag: '이야기를 듣는다', text: '실종 당시 이야기를 자세히 묻는다.', result: '모두 같은 날, 같은 노선의 심야 버스를 탔다고 했습니다. 그 노선 번호를 기억해 두었습니다.', effects: { clues: ['CLU_BUS_CARD'], FAT: 3, aptChance: [{ apt: 'NEG', p: 0.08 }] } },
      { tag: '지나간다', text: '전단을 받지 않고 지나간다.', result: '등 뒤로 전단 넘기는 소리가 따라왔습니다. 오래 신경이 쓰였습니다.', effects: { FAT: 3 } },
    ],
  }),
  scene({
    id: 'DY_20_SUPPLY_SALE',
    title: '방재용품 할인',
    place: '동네 철물점',
    intro: '철물점에 "방재용품 창고 정리" 현수막이 걸렸습니다. 손전등, 구급 파우치, 분필, 소금 포대가 반값입니다.',
    prompt: '사장님이 "요즘 같은 때엔 쟁여 둬야 해"라며 웃습니다.',
    opts: [
      { tag: '잔뜩 산다', text: '이번 기회에 넉넉히 사 둔다.', cost: { KRW: -20 }, result: '집 현관 수납장이 꽉 찼습니다. 든든했습니다.', effects: { SUP: 3 } },
      { tag: '조금만', text: '꼭 필요한 구급 파우치 하나만 산다.', cost: { KRW: -6 }, result: '가방 앞주머니에 구급 파우치를 넣었습니다.', effects: { SUP: 1 } },
      { tag: '사장님과 수다', text: '물건 대신 요즘 무엇이 잘 팔리는지 묻는다.', result: '사장님은 요즘 분필이 동난다고 했습니다. 다들 어딘가에 표식을 남기고 있다는 뜻이었습니다.', effects: { aptChance: [{ apt: 'NEG', p: 0.08 }], mst: { MST_BOUND: 1 } } },
    ],
  }),
  scene({
    id: 'DY_21_ELEVATOR_STRANGER',
    title: '엘리베이터의 낯선 이',
    place: '아파트 엘리베이터',
    eligible: { region: ['REG_ORDINARY_CITY', 'REG_SAFE_ZONE', 'REG_BLOCKADE_ZONE'] },
    intro: '밤늦게 엘리베이터에 탔는데, 먼저 탄 사람이 층 버튼을 누르지 않고 내 쪽만 보고 있었습니다.',
    prompt: '문이 닫히려 합니다.',
    opts: [
      { tag: '내린다', text: '"아, 깜박했다" 하며 자연스럽게 내린다.', result: '계단으로 올라갔습니다. 엘리베이터는 그대로 지하로 내려갔습니다.', effects: { FAT: 4, mst: { MST_RULE: 1 } } },
      { tag: '인사한다', text: '"몇 층 가세요?" 하고 웃으며 묻는다.', chance: { base: 0.45, apt: ['NEG'] }, result: '그 사람은 잠시 멈칫하더니 "당신이 가는 층이요"라고 했습니다. 내 층 바로 아래 버튼을 눌러 주자 그곳에서 조용히 내렸습니다.', effects: { aptChance: [{ apt: 'NEG', p: 0.12 }], mst: { MST_FIELD: 1 } }, fail: { text: '그 사람은 대답 대신 입꼬리만 올렸습니다. 문이 열릴 때까지 숨을 참았습니다.', effects: { FAT: 8, HP: -3 } } },
      { tag: '거울을 본다', text: '엘리베이터 거울에 그 사람이 비치는지 확인한다.', result: '거울에는 나 혼자였습니다. 다음 층에서 바로 내렸습니다.', effects: { aptChance: [{ apt: 'OBS', p: 0.12 }], clues: ['CLU_ELEVATOR_HATCH'] } },
    ],
  }),
  scene({
    id: 'DY_22_PORT_FISH',
    title: '새벽 어시장',
    place: '안개 항구 어시장',
    eligible: { region: ['REG_FOG_PORT', 'REG_BEYOND_MAP'] },
    intro: '새벽 어시장 경매에서 비늘이 거꾸로 난 물고기가 헐값에 나왔습니다. 상인들은 아무도 손을 들지 않았습니다.',
    prompt: '경매사가 내 쪽을 봅니다.',
    opts: [
      { tag: '낙찰받는다', text: '손을 들어 낙찰받는다.', chance: { base: 0.45, apt: ['RES'] }, result: '물고기를 바다에 돌려보내자 그날 아침 안개가 유난히 빨리 걷혔습니다. 어부들이 나를 보고 고개를 끄덕였습니다.', effects: { KRW: -3, mst: { MST_BOUND: 2 }, trust: { NPC_BROKER: 3 } }, fail: { text: '물고기는 집에 가져오자 밤새 욕실에서 사람 목소리로 울었습니다. 다음 날 바다에 버리러 가야 했습니다.', effects: { KRW: -3, FAT: 10 } } },
      { tag: '상인에게 묻는다', text: '옆 상인에게 왜 아무도 안 사는지 묻는다.', result: '"저건 바다가 다시 달라는 놈이야." 상인은 그렇게 말하고 담배를 물었습니다.', effects: { aptChance: [{ apt: 'NEG', p: 0.08 }], clues: ['CLU_FOG_HORN'] } },
      { tag: '지켜본다', text: '경매가 끝날 때까지 물고기가 어떻게 되는지 지켜본다.', result: '아무도 사지 않은 물고기는 경매가 끝나자 상자째 사라져 있었습니다.', effects: { aptChance: [{ apt: 'OBS', p: 0.12 }], FAT: 3 } },
    ],
  }),
  scene({
    id: 'DY_23_CHECKPOINT',
    title: '검문소 줄',
    place: '봉쇄 구역 검문소',
    eligible: { region: ['REG_BLOCKADE_ZONE'] },
    intro: '검문소 줄이 유난히 길었습니다. 앞사람의 신분증 사진이 본인과 조금씩 달라 보였습니다.',
    prompt: '앞사람이 초조하게 뒤를 돌아봅니다.',
    opts: [
      { tag: '알린다', text: '검문 요원에게 조용히 이상한 점을 알린다.', result: '요원은 고개를 끄덕이더니 앞사람을 다른 줄로 데려갔습니다. 그날 오후 표창 문자가 왔습니다.', effects: { trust: { NPC_SQUAD: 4 }, mst: { MST_FIELD: 1 } } },
      { tag: '모른 척', text: '내 일이 아니라며 모른 척한다.', result: '앞사람은 무사히 통과했습니다. 그 사람의 그림자는 검문소를 통과하지 못하고 줄 끝에 남아 있었습니다.', effects: { FAT: 3, aptChance: [{ apt: 'OBS', p: 0.08 }] } },
      { tag: '말을 건다', text: '앞사람에게 "괜찮으세요?" 하고 말을 건다.', chance: { base: 0.5, apt: ['NEG'] }, result: '그 사람은 울음을 터뜨리며 가족을 찾으러 가는 길이라고 했습니다. 다른 통로를 알려 주었습니다.', effects: { aptChance: [{ apt: 'NEG', p: 0.12 }], clues: ['CLU_DRAIN'] }, fail: { text: '그 사람은 나를 노려보더니 줄을 이탈해 사라졌습니다. 그 자리에 젖은 신분증이 떨어져 있었습니다.', effects: { FAT: 5 } } },
    ],
  }),
  scene({
    id: 'DY_24_MENTOR_TEA',
    title: '스승의 찻잔',
    place: '지하 작업실',
    eligible: { trust: 'NPC_MENTOR', min: 10 },
    intro: '은퇴한 봉인 스승이 차를 내주었습니다. 찻잔이 셋이었습니다. 방에는 우리 둘뿐입니다.',
    prompt: '스승이 말없이 세 번째 잔을 가리킵니다.',
    opts: [
      { tag: '차를 따른다', text: '세 번째 잔에도 정성껏 차를 따른다.', result: '스승은 처음으로 웃었습니다. "손님 대접을 할 줄 아는구나." 그날 새 매듭 법을 배웠습니다.', effects: { trust: { NPC_MENTOR: 4 }, mst: { MST_SEAL: 3 } } },
      { tag: '묻는다', text: '세 번째 잔은 누구 몫이냐고 여쭌다.', result: '"먼저 간 제자 몫이다." 스승은 오래된 이야기를 하나 들려주었습니다.', effects: { trust: { NPC_MENTOR: 2 }, mst: { MST_RULE: 2 } } },
      { tag: '잔을 치운다', text: '빈 잔은 불길하다며 치운다.', result: '스승의 눈썹이 꿈틀했습니다. 그날 수업은 짧게 끝났습니다.', effects: { trust: { NPC_MENTOR: -3 }, FAT: -3 } },
    ],
  }),
  scene({
    id: 'DY_25_BROKER_RUMOR',
    title: '중개인의 소문',
    place: '항구 포장마차',
    eligible: { trust: 'NPC_BROKER', min: 5 },
    intro: '중개인이 오뎅 국물을 건네며 다음 주 경매에 "진짜 물건"이 나온다고 귀띔했습니다. 소문값을 원하는 눈치입니다.',
    prompt: '중개인이 손가락 셋을 펴 보입니다.',
    opts: [
      { tag: '값을 치른다', text: '소문값을 치르고 자세히 듣는다.', cost: { KRW: -15 }, result: '물건의 번호와, 그 번호를 부르면 안 되는 이유까지 들었습니다.', effects: { clues: ['CLU_AUCTION_LOT'], trust: { NPC_BROKER: 4 } } },
      { tag: '흥정', text: '반값에 흥정한다.', chance: { base: 0.5, apt: ['NEG'] }, result: '중개인은 혀를 차더니 반만 알려 주었습니다. 반이면 충분했습니다.', effects: { KRW: -7, clues: ['CLU_AUCTION_LOT'], aptChance: [{ apt: 'NEG', p: 0.12 }] }, fail: { text: '중개인은 웃으며 국물만 더 따라 주었습니다. 소문은 듣지 못했습니다.', effects: { trust: { NPC_BROKER: -2 } } } },
      { tag: '사양', text: '오뎅값만 내고 일어난다.', result: '중개인은 어깨를 으쓱했습니다. 장사는 장사입니다.', effects: { KRW: -1, FAT: -2 } },
    ],
  }),
  scene({
    id: 'DY_26_SQUAD_DRILL',
    title: '합동 훈련',
    place: '재난청 훈련장',
    eligible: { any: [{ trust: 'NPC_SQUAD', min: 5 }, { path: 'PATH_01_AUTHORITY' }] },
    intro: '현장기동대 반장이 주말 합동 훈련에 나오라고 연락했습니다. 이번 훈련 주제는 "규칙형 공간에서의 퇴로 확보"입니다.',
    prompt: '주말입니다.',
    opts: [
      { tag: '참가한다', text: '훈련장에 나가 끝까지 따라간다.', result: '온몸에 진흙을 묻히고 돌아왔습니다. 반장이 어깨를 툭 쳤습니다.', effects: { FAT: 12, mst: { MST_FIELD: 4 }, trust: { NPC_SQUAD: 3 } } },
      { tag: '교관을 돕는다', text: '실습생들의 퇴로 표시를 도우며 교관 일을 거든다.', result: '남을 가르치다 보니 내가 무엇을 모르는지 알게 되었습니다.', effects: { FAT: 8, mst: { MST_BOUND: 2, MST_RULE: 1 }, aptChance: [{ apt: 'NEG', p: 0.08 }] } },
      { tag: '쉰다', text: '이번 주는 쉬겠다고 정중히 말한다.', result: '반장은 "다음엔 꼭"이라며 이해해 주었습니다. 푹 쉬었습니다.', effects: { FAT: -10, trust: { NPC_SQUAD: -1 } } },
    ],
  }),
  scene({
    id: 'DY_27_INSOMNIA',
    title: '잠 못 드는 밤',
    place: '침대 위',
    intro: '며칠째 잠이 오지 않습니다. 눈을 감으면 천장 모서리에서 누가 내려다보는 것 같습니다.',
    prompt: '시계는 새벽 세 시입니다.',
    opts: [
      { tag: '불을 켠다', text: '불을 켜고 책을 읽으며 아침을 기다린다.', result: '책을 다 읽고 나니 해가 떴습니다. 피곤했지만 머릿속에 남은 문장들이 있었습니다.', effects: { FAT: 8, mst: { MST_RULE: 1 }, aptChance: [{ apt: 'OBS', p: 0.06 }] } },
      { tag: '모서리를 본다', text: '눈을 뜨고 천장 모서리를 똑바로 바라본다.', chance: { base: 0.45, apt: ['RES'] }, result: '한참을 마주 보자 모서리의 어둠이 먼저 물러났습니다. 그 뒤로 깊이 잤습니다.', effects: { FAT: -10, aptChance: [{ apt: 'RES', p: 0.15 }] }, fail: { text: '어둠이 한 뼘 내려왔습니다. 이불을 뒤집어쓰고 아침까지 떨었습니다.', effects: { FAT: 10, HP: -4 } } },
      { tag: '상담을 받는다', text: '다음 날 재난청 심리 상담 창구에 예약한다.', result: '상담사는 이 도시에서 잠 못 드는 건 자연스러운 반응이라며 몇 가지 방법을 알려 주었습니다.', effects: { KRW: -4, FAT: -6, HP: 2 } },
    ],
  }),
  scene({
    id: 'DY_28_OLD_FRIEND',
    title: '동창회',
    place: '동네 호프집',
    eligible: { age: { min: 24, max: 70 } },
    intro: '오랜만에 동창회에 나갔습니다. 모두 반가워했지만, 졸업 앨범에 없는 친구 한 명이 가장 친한 척을 했습니다.',
    prompt: '그 친구가 2차를 가자며 팔짱을 낍니다.',
    opts: [
      { tag: '따라간다', text: '분위기를 깨기 싫어 따라간다.', chance: { base: 0.4, apt: ['NEG', 'RES'] }, result: '2차는 평범한 노래방이었습니다. 그 친구는 노래 한 곡을 부르고 고맙다며 사라졌습니다. 다들 그 친구를 기억하지 못했습니다.', effects: { KRW: -4, aptChance: [{ apt: 'RES', p: 0.12 }] }, fail: { text: '골목을 몇 번 돌자 처음 보는 거리였습니다. 팔을 뿌리치고 반대로 뛰어 겨우 큰길로 나왔습니다.', effects: { FAT: 10, HP: -5, mst: { MST_BOUND: 1 } } }, trap: true },
      { tag: '이름을 묻는다', text: '웃으며 "근데 너 몇 반이었지?" 하고 묻는다.', result: '그 친구는 대답하지 못하고 웃기만 하다가 화장실에 간다며 나가서 돌아오지 않았습니다.', effects: { aptChance: [{ apt: 'OBS', p: 0.12 }], mst: { MST_RULE: 1 } } },
      { tag: '일찍 간다', text: '내일 출근이라며 먼저 일어난다.', result: '택시 안에서 단체 대화방을 보니 참석자 사진에 그 친구만 흐릿하게 찍혀 있었습니다.', effects: { FAT: -3, KRW: -2 } },
    ],
  }),
  scene({
    id: 'DY_29_FORGOTTEN_NAME',
    title: '이름을 잊은 날',
    place: '은행 창구',
    eligible: { age: { min: 30 } },
    intro: '은행 창구에서 서류에 이름을 적으려는데, 순간 내 이름이 떠오르지 않았습니다. 창구 직원이 기다립니다.',
    prompt: '펜 끝이 떨립니다.',
    opts: [
      { tag: '신분증을 본다', text: '침착하게 신분증을 꺼내 보고 적는다.', result: '신분증 속 이름을 보는 순간 모든 것이 돌아왔습니다. 그날부터 지갑에 이름을 적은 쪽지를 하나 더 넣고 다닙니다.', effects: { mst: { MST_RULE: 1 }, FAT: 2 } },
      { tag: '되뇐다', text: '눈을 감고 어린 시절 나를 부르던 목소리를 떠올린다.', chance: { base: 0.5, apt: ['RES'] }, result: '엄마 목소리가 내 이름을 불렀습니다. 펜이 저절로 움직였습니다.', effects: { aptChance: [{ apt: 'RES', p: 0.2 }] }, fail: { text: '목소리가 떠오르지 않았습니다. 창구 직원이 신분증을 보여 달라고 했고, 집에 와서 한참을 울었습니다.', effects: { FAT: 8, HP: -2 } } },
      { tag: '나중에', text: '서류를 들고 일어나 다음에 오겠다고 한다.', result: '집에 와서 이름을 백 번 적었습니다. 손이 기억할 때까지.', effects: { FAT: 5, aptChance: [{ apt: 'PRC', p: 0.08 }] } },
    ],
  }),
  scene({
    id: 'DY_30_VOLUNTEER',
    title: '봉사 활동',
    place: '구민회관',
    intro: '구민회관에서 괴이 피해 가구를 돕는 자원봉사자를 모집합니다. 주말마다 무너진 집을 정리하고 도시락을 나르는 일입니다.',
    prompt: '신청서 마감이 오늘입니다.',
    opts: [
      { tag: '신청한다', text: '한 달 동안 주말마다 봉사한다.', result: '고맙다는 말을 셀 수 없이 들었습니다. 무너진 집에서 건진 사진들을 주인에게 돌려줄 때마다 마음이 단단해졌습니다.', effects: { FAT: 10, aptChance: [{ apt: 'NEG', p: 0.1 }, { apt: 'RES', p: 0.08 }], mst: { MST_FIELD: 2 } } },
      { tag: '물품 기부', text: '대신 집에 있는 방재용품을 기부한다.', requires: { res: 'SUP', min: 1 }, result: '담당자가 꼭 필요하던 물건이라며 고마워했습니다.', effects: { SUP: -1, aptChance: [{ apt: 'NEG', p: 0.08 }], defense: 0.03 } },
      { tag: '다음 기회에', text: '이번에는 넘긴다.', result: '마감 공고가 내려갔습니다. 주말 내내 집에서 쉬었습니다.', effects: { FAT: -5 } },
    ],
  }),
];

// ---------------------------------------------------------------- 몸을 노리는 직접적인 위협
// 어른이 된 뒤 일상 사이로 끼어드는 짧은 위협. 어느 길을 골라도 무언가를 잃거나 다칠 수 있다.

const adult = ages(18, 200);

export const THREAT_CHOICES: IncidentDef[] = [
  scene({
    id: 'TH_01_STAIRWELL_HAND',
    title: '계단참의 손',
    place: '아파트 비상계단',
    tier: 2,
    eligible: adult,
    intro: '엘리베이터 점검 날, 비상계단을 오르다 7층 계단참에서 발목을 붙잡혔습니다. 난간 사이로 회색 손이 뻗어 나와 있었습니다.',
    prompt: '손아귀가 점점 조여 옵니다.',
    opts: [
      { tag: '걷어찬다', text: '다른 발로 손목을 힘껏 걷어찬다.', chance: { base: 0.55, apt: ['RES'] }, result: '뼈 부러지는 소리가 나고 손이 떨어져 나갔습니다. 발목에는 시퍼런 손자국이 남았습니다.', effects: { HP: -4, FAT: 6, aptChance: [{ apt: 'RES', p: 0.12 }] }, fail: { text: '발이 미끄러졌습니다. 손은 나를 계단 아래로 끌어내렸고, 몇 층을 구른 뒤에야 멈췄습니다.', effects: { HP: -22, FAT: 12 } } },
      { tag: '난간을 잡는다', text: '난간을 붙들고 버티며 소리쳐 사람을 부른다.', chance: { base: 0.5, apt: ['NEG'] }, result: '위층 사람이 문을 열자 손이 스르르 풀렸습니다. 손바닥이 난간에 쓸려 벗겨졌습니다.', effects: { HP: -6, trust: { NPC_NEIGHBOR: 3 } }, fail: { text: '아무도 나오지 않았습니다. 손을 놓친 순간 몸이 난간 사이로 반쯤 빨려 들어갔다가 튕겨 나왔습니다.', effects: { HP: -18, FAT: 10 } } },
      { tag: '신발을 버린다', text: '신발 끈을 풀어 신발째 내주고 빠져나온다.', result: '손은 신발을 쥔 채 난간 아래로 사라졌습니다. 맨발로 계단을 내려오다 유리 조각을 밟았습니다.', effects: { HP: -8, KRW: -6, mst: { MST_RULE: 1 } } },
    ],
  }),
  scene({
    id: 'TH_02_MARKET_KNIFE',
    title: '시장의 칼잡이',
    place: '새벽 수산시장',
    tier: 2,
    eligible: adult,
    intro: '새벽 시장 골목에서 앞치마를 두른 사람이 길을 막았습니다. 얼굴이 없었고, 손에는 생선 칼이 들려 있었습니다. "손님, 어디를 손질해 드릴까요."',
    prompt: '칼끝이 내 쪽으로 기웁니다.',
    opts: [
      { tag: '달아난다', text: '등을 돌려 사람 많은 큰길로 뛴다.', chance: { base: 0.5, apt: ['PRC'] }, result: '큰길에 닿자 발소리가 끊겼습니다. 숨이 턱까지 찼습니다.', effects: { FAT: 12, aptChance: [{ apt: 'PRC', p: 0.12 }] }, fail: { text: '골목이 끝나지 않았습니다. 등 뒤에서 칼이 옷과 살을 함께 갈랐습니다.', effects: { HP: -24, FAT: 12 } } },
      { tag: '주문한다', text: '"생선 한 마리요" 하고 지갑을 연다.', chance: { base: 0.55, apt: ['OBS'] }, result: '칼잡이는 고개를 끄덕이더니 좌판의 생선을 손질해 내밀었습니다. 값은 터무니없이 비쌌습니다.', effects: { KRW: -30, mst: { MST_RULE: 2 } }, fail: { text: '"손님이 고르신 건 그게 아닌데요." 칼이 손등을 스쳤습니다.', effects: { HP: -14, KRW: -15 } } },
      { tag: '맞선다', text: '좌판의 갈고리를 집어 들고 맞선다.', chance: { base: 0.4, apt: ['RES'] }, result: '갈고리가 앞치마를 꿰자 그것은 물웅덩이로 무너졌습니다. 팔에 깊은 상처가 남았습니다.', effects: { HP: -10, mst: { MST_FIELD: 3 }, aptChance: [{ apt: 'RES', p: 0.15 }] }, fail: { text: '갈고리가 허공을 갈랐습니다. 칼은 정확히 손질하듯 내 몸을 지나갔습니다.', effects: { HP: -30, FAT: 10 } } },
    ],
  }),
  scene({
    id: 'TH_03_SUBWAY_PLATFORM',
    title: '등을 미는 손',
    place: '지하철 승강장',
    tier: 2,
    eligible: adult,
    intro: '막차를 기다리는데 스크린도어가 고장 난 칸 앞이었습니다. 열차가 들어오는 소리와 함께 누군가 등을 두 손으로 밀었습니다.',
    prompt: '몸이 선로 쪽으로 기웁니다.',
    opts: [
      { tag: '주저앉는다', text: '무릎을 꺾어 바닥에 주저앉는다.', chance: { base: 0.55, apt: ['PRC'] }, result: '무릎이 깨졌지만 몸은 승강장 위에 남았습니다. 돌아보니 아무도 없었습니다.', effects: { HP: -6, FAT: 4 }, fail: { text: '주저앉는 몸이 그대로 선로 쪽으로 미끄러졌습니다. 겨우 가장자리를 붙잡았지만 열차가 어깨를 스쳤습니다.', effects: { HP: -28, FAT: 10 } } },
      { tag: '뒤로 잡는다', text: '팔을 뒤로 뻗어 미는 손목을 붙잡는다.', chance: { base: 0.45, apt: ['RES'] }, result: '차가운 손목을 잡아 비틀자 그것은 비명을 지르며 흩어졌습니다.', effects: { HP: -4, mst: { MST_FIELD: 2 } }, fail: { text: '손목은 연기처럼 빠져나갔고 나는 균형을 잃었습니다. 선로 자갈에 떨어졌다가 역무원에게 끌려 올라왔습니다.', effects: { HP: -24, FAT: 14 } } },
      { tag: '비상벨', text: '기둥의 비상벨을 친다.', result: '경보와 함께 열차가 급정거했습니다. 미는 힘은 사라졌지만 기둥에 머리를 박았습니다. 역에서 운행 방해로 경위서를 쓰게 했습니다.', effects: { HP: -8, KRW: -10, FAT: 6 } },
    ],
  }),
  scene({
    id: 'TH_04_DOG_PACK',
    title: '목줄 없는 개들',
    place: '재개발 구역 공터',
    tier: 2,
    eligible: adult,
    intro: '지름길로 공터를 가로지르는데 철거된 집터마다 개들이 고개를 들었습니다. 눈이 사람처럼 생긴 개들이었습니다.',
    prompt: '개들이 원을 좁혀 옵니다.',
    opts: [
      { tag: '천천히 물러난다', text: '눈을 피하지 않고 한 걸음씩 물러난다.', chance: { base: 0.5, apt: ['NEG'] }, result: '우두머리가 먼저 고개를 돌렸습니다. 공터를 벗어날 때까지 등이 젖었습니다.', effects: { FAT: 8, aptChance: [{ apt: 'NEG', p: 0.12 }] }, fail: { text: '한 마리가 다리를 물자 나머지가 한꺼번에 덤볐습니다.', effects: { HP: -26, FAT: 10 } } },
      { tag: '먹이를 던진다', text: '가방 속 도시락을 멀리 던진다.', requires: { res: 'SUP', min: 1 }, result: '개들이 도시락으로 몰려갔습니다. 마지막 한 마리가 지나가며 종아리를 물고 갔습니다.', effects: { SUP: -1, HP: -6 } },
      { tag: '담을 넘는다', text: '무너진 담장 위로 기어오른다.', chance: { base: 0.45, apt: ['PRC'] }, result: '담장 위에서 개들이 짖다가 흩어지는 걸 보았습니다. 철근에 손바닥이 찢어졌습니다.', effects: { HP: -6, FAT: 10, aptChance: [{ apt: 'PRC', p: 0.1 }] }, fail: { text: '담장이 무너지며 개들 한가운데로 떨어졌습니다.', effects: { HP: -30, FAT: 12 } } },
    ],
  }),
  scene({
    id: 'TH_05_GAS_LEAK',
    title: '숨 쉬는 가스',
    place: '반지하 집',
    tier: 2,
    eligible: adult,
    intro: '자다가 깼습니다. 방 안에 단내가 가득했고, 가스레인지 밸브가 저절로 돌아가 있었습니다. 냄새가 말을 걸었습니다. "조금만 더 자."',
    prompt: '머리가 무겁게 가라앉습니다.',
    opts: [
      { tag: '창문을 깬다', text: '의자로 창문을 깨고 밖으로 나간다.', chance: { base: 0.55, apt: ['RES'] }, result: '유리 조각에 팔이 긁혔지만 바깥 공기가 폐를 찢고 들어왔습니다. 창문 값은 내가 물었습니다.', effects: { HP: -8, KRW: -25 }, fail: { text: '의자를 드는 순간 무릎이 꺾였습니다. 깨어난 곳은 병원이었습니다.', effects: { HP: -26, FAT: 20, KRW: -40 } } },
      { tag: '밸브를 잠근다', text: '숨을 참고 부엌까지 기어가 밸브를 잠근다.', chance: { base: 0.5, apt: ['RES'] }, result: '밸브가 잠기자 냄새가 투덜거리며 흩어졌습니다. 며칠 동안 두통이 가시지 않았습니다.', effects: { HP: -10, FAT: 8, mst: { MST_RULE: 1 } }, fail: { text: '부엌은 기어도 기어도 멀어졌습니다. 이웃이 문을 부수고 들어왔을 때 나는 바닥에 엎드려 있었습니다.', effects: { HP: -28, FAT: 16 } } },
      { tag: '대답한다', text: '"싫어. 일어날 거야." 소리 내어 거절한다.', chance: { base: 0.4, apt: ['RES'] }, result: '냄새가 잠깐 망설이더니 환풍구로 빠져나갔습니다. 목이 쉬어 있었습니다.', effects: { HP: -4, aptChance: [{ apt: 'RES', p: 0.15 }] }, fail: { text: '대답하는 사이 숨을 크게 들이켰습니다. 그 뒤로 기억이 없습니다.', effects: { HP: -30, FAT: 18 } } },
    ],
  }),
  scene({
    id: 'TH_06_COLLECTOR_ALLEY',
    title: '골목의 수금원',
    place: '귀갓길 골목',
    tier: 2,
    eligible: adult,
    weight: 8,
    intro: '골목 끝에 검은 양복 두 사람이 서 있었습니다. "이 동네 통행세 걷습니다. 사람이든 아니든."',
    prompt: '한 사람이 손을 내밉니다.',
    opts: [
      { tag: '낸다', text: '지갑에 있는 돈을 다 낸다.', result: '그들은 돈을 세어 보더니 길을 비켜 주었습니다. 다음 달에도 오겠다고 했습니다.', effects: { KRW: -45, FAT: 4 } },
      { tag: '흥정한다', text: '가진 게 이것뿐이라며 절반만 내민다.', chance: { base: 0.5, apt: ['NEG'] }, result: '한 사람이 웃더니 반만 받아 갔습니다.', effects: { KRW: -20, aptChance: [{ apt: 'NEG', p: 0.15 }] }, fail: { text: '"우리가 거지로 보여?" 주먹이 먼저 왔고 지갑은 그다음에 털렸습니다.', effects: { HP: -20, KRW: -45 } } },
      { tag: '뚫고 간다', text: '어깨로 밀치고 지나간다.', chance: { base: 0.35, apt: ['RES'] }, result: '두 사람은 비틀거리며 물러났습니다. 등 뒤로 욕설이 한참 따라왔습니다.', effects: { HP: -6, mst: { MST_FIELD: 2 } }, fail: { text: '골목에 쓰러진 채 한참을 맞았습니다. 그들은 지갑과 신발까지 가져갔습니다.', effects: { HP: -32, KRW: -50, FAT: 10 } } },
    ],
  }),
  scene({
    id: 'TH_07_FALLING_SIGN',
    title: '떨어지는 간판',
    place: '번화가',
    tier: 2,
    eligible: adult,
    intro: '바람 한 점 없는 낮이었는데 머리 위에서 쇠 비틀리는 소리가 났습니다. 올려다보니 간판이 웃는 얼굴을 하고 있었습니다.',
    prompt: '간판의 나사가 하나씩 풀려 떨어집니다.',
    opts: [
      { tag: '옆 가게로', text: '가까운 가게 안으로 뛰어든다.', chance: { base: 0.55, apt: ['PRC'] }, result: '등 뒤에서 간판이 박살 났습니다. 파편이 종아리에 박혔습니다.', effects: { HP: -6, FAT: 6 }, fail: { text: '문턱에 걸려 넘어진 순간 간판 모서리가 등을 내리찍었습니다.', effects: { HP: -30, FAT: 10 } } },
      { tag: '사람을 끈다', text: '아래를 지나던 아이를 끌어안고 구른다.', chance: { base: 0.45, apt: ['PRC', 'RES'] }, result: '아이는 무사했습니다. 내 팔은 한동안 들리지 않았습니다. 아이 엄마가 몇 번이고 고개를 숙였습니다.', effects: { HP: -12, trust: { NPC_NEIGHBOR: 4 }, aptChance: [{ apt: 'RES', p: 0.1 }] }, fail: { text: '아이는 밀어냈지만 나는 피하지 못했습니다.', effects: { HP: -34, FAT: 12 } } },
      { tag: '노려본다', text: '간판의 얼굴을 똑바로 노려본다.', chance: { base: 0.4, apt: ['RES'] }, result: '간판이 겸연쩍게 웃음을 거두고 제자리에 걸렸습니다. 다리가 풀려 한참 주저앉아 있었습니다.', effects: { FAT: 12, aptChance: [{ apt: 'RES', p: 0.12 }] }, fail: { text: '간판은 더 크게 웃으며 떨어졌습니다.', effects: { HP: -30, FAT: 8 } } },
    ],
  }),
  scene({
    id: 'TH_08_FLOOD_UNDERPASS',
    title: '차오르는 지하차도',
    place: '지하차도',
    tier: 3,
    eligible: ages(20, 200),
    weight: 6,
    intro: '폭우가 쏟아지던 퇴근길, 버스가 지하차도에 갇혔습니다. 물은 빗물이 아니었습니다. 따뜻했고, 손가락처럼 창문을 더듬었습니다.',
    prompt: '물이 무릎까지 차올랐습니다.',
    opts: [
      { tag: '창문으로', text: '비상 망치로 창을 깨고 헤엄쳐 나간다.', chance: { base: 0.45, apt: ['RES', 'PRC'] }, result: '출구 쪽 계단에 닿았을 때 손톱이 몇 개 빠져 있었습니다. 뒤를 돌아보지 않았습니다.', effects: { HP: -12, FAT: 16 }, fail: { text: '물속의 손가락들이 발목을 감았습니다. 끌려가다 버스 바퀴에 걸려 겨우 멈췄습니다.', effects: { HP: -36, FAT: 18 } } },
      { tag: '지붕 위로', text: '사람들과 버스 지붕에 올라 구조를 기다린다.', chance: { base: 0.5, apt: ['RES'] }, result: '새벽에 구조대가 왔습니다. 밤새 지붕 아래에서 무언가 긁는 소리를 들었습니다.', effects: { FAT: 20, HP: -6, trust: { NPC_NEIGHBOR: 2 } }, fail: { text: '물이 지붕까지 올라왔습니다. 옆 사람의 손을 놓쳤고, 나도 한 번 가라앉았다 떠올랐습니다.', effects: { HP: -30, FAT: 20 } } },
      { tag: '부적을 띄운다', text: '품속의 부적을 물 위에 띄운다.', requires: { res: 'SUP', min: 2 }, chance: { base: 0.6 }, result: '물이 부적을 피해 갈라졌습니다. 그 틈으로 사람들을 데리고 걸어 나왔습니다.', effects: { SUP: -2, mst: { MST_RULE: 2 } }, fail: { text: '부적이 녹아 물에 섞였습니다. 물은 더 따뜻해졌습니다.', effects: { SUP: -2, HP: -28, FAT: 14 } } },
    ],
  }),
  scene({
    id: 'TH_09_HOME_INTRUDER',
    title: '집 안의 낯선 사람',
    place: '내 방',
    tier: 3,
    eligible: ages(20, 200),
    weight: 6,
    intro: '퇴근해 불을 켜니 식탁에 내가 앉아 있었습니다. 내 옷을 입고, 내 밥을 먹으며. "늦었네. 이제 네 자리는 없어."',
    prompt: '그것이 수저를 내려놓고 일어섭니다.',
    opts: [
      { tag: '이름을 댄다', text: '내 이름과 생일, 어머니 이름을 또박또박 말한다.', chance: { base: 0.5, apt: ['RES'] }, result: '그것의 얼굴이 조금씩 흐려지더니 의자째 사라졌습니다. 식탁 위 밥은 차갑게 식어 있었습니다.', effects: { FAT: 10, aptChance: [{ apt: 'RES', p: 0.12 }], mst: { MST_RULE: 1 } }, fail: { text: '그것이 나보다 먼저, 더 정확하게 대답했습니다. 내 목을 조르는 손은 내 손과 똑같았습니다.', effects: { HP: -30, FAT: 14 } } },
      { tag: '도망친다', text: '현관문을 박차고 나가 경비실로 달린다.', chance: { base: 0.5, apt: ['PRC'] }, result: '경비원과 돌아왔을 때 집은 비어 있었습니다. 일주일을 여관에서 잤습니다.', effects: { KRW: -35, FAT: 10 }, fail: { text: '현관문 손잡이가 돌아가지 않았습니다. 등 뒤에서 내 목소리가 웃었습니다.', effects: { HP: -28, FAT: 12 } } },
      { tag: '거울을 든다', text: '현관 거울을 떼어 그것에게 비춘다.', chance: { base: 0.45, apt: ['OBS'] }, result: '거울 속에는 아무것도 비치지 않았습니다. 그것은 비명을 지르며 거울 속으로 빨려 들어갔고, 거울은 금이 갔습니다.', effects: { HP: -6, mst: { MST_FIELD: 2 }, aptChance: [{ apt: 'OBS', p: 0.12 }] }, fail: { text: '거울 속의 그것이 손을 뻗어 내 손목을 잡았습니다. 거울이 깨지며 손을 길게 그었습니다.', effects: { HP: -26, FAT: 10 } } },
    ],
  }),
  scene({
    id: 'TH_10_HOSPITAL_NIGHT',
    title: '병동의 야간 회진',
    place: '종합병원 입원실',
    tier: 3,
    eligible: ages(25, 200),
    weight: 5,
    intro: '검사차 하룻밤 입원했습니다. 새벽 세 시, 커튼 너머로 바퀴 소리가 멈췄습니다. "회진입니다. 수술 준비할게요." 오늘 수술 예정은 없었습니다.',
    prompt: '커튼이 천천히 젖혀집니다.',
    opts: [
      { tag: '자는 척', text: '눈을 감고 숨을 고르게 쉰다.', chance: { base: 0.5, apt: ['RES'] }, result: '차가운 손이 이마를 짚고 지나갔습니다. "이 환자는 아니네." 바퀴 소리가 멀어졌습니다.', effects: { FAT: 14 }, fail: { text: '"깨어 있네요." 팔에 바늘이 꽂혔습니다. 아침에 깨어났을 때 옆구리에 낯선 봉합 자국이 있었습니다.', effects: { HP: -32, FAT: 16 } } },
      { tag: '호출 버튼', text: '간호사 호출 버튼을 누르고 버틴다.', chance: { base: 0.45, apt: ['NEG'] }, result: '진짜 간호사가 뛰어오자 그것은 침대 밑으로 사라졌습니다. 다음 날 바로 퇴원했습니다.', effects: { KRW: -20, FAT: 8 }, fail: { text: '호출 버튼에서 같은 목소리가 대답했습니다. "네, 지금 갑니다."', effects: { HP: -28, FAT: 14 } } },
      { tag: '창밖으로', text: '링거를 뽑고 비상구로 빠져나간다.', chance: { base: 0.45, apt: ['PRC'] }, result: '맨발로 병원을 빠져나왔습니다. 팔에서 피가 흘렀고, 병원비 독촉장이 뒤따라왔습니다.', effects: { HP: -8, KRW: -40, FAT: 10 }, fail: { text: '비상구 계단이 수술실로 이어져 있었습니다.', effects: { HP: -34, FAT: 18 } } },
    ],
  }),
];
