// 06.3절: 자잘한 일상·소규모 괴담 20종. 게임을 멈추지 않는 자동 장면으로, 인물의 능력에 따라 피해 없이 넘어가거나 작은 보상을 얻는다.
import type { MinorEventDef } from '../domain/contentTypes';
import { PATHS } from './progression';

export const MINOR_EVENTS: MinorEventDef[] = [
  {
    id: 'MIN_01_EMERGENCY_SMS',
    title: '심야 재난안전문자 수신',
    category: '일상/복선',
    weight: 10,
    run: () => ({
      noticeFrom: '시청 안전안내',
      text: '[시청 안전안내] 금일 23:00~04:00 안개 주의 및 창문 개방 자제 바랍니다. 문자를 확인하고 베란다 문을 한 번 더 잠갔습니다.',
      effects: { FAT: -3, defense: 0.05 },
      badges: ['다음 사건 방어 +5%'],
      sound: 'chime',
      caption: '휴대폰 진동이 두 번 짧게 울린다.',
    }),
  },
  {
    id: 'MIN_02_FAKE_SMS_DETECT',
    title: '발신 번호가 이상한 재난문자',
    category: '소규모 괴담',
    weight: 7,
    eligible: { age: { min: 23 } },
    run: (_s, ctx) => {
      const caught = ctx.has({ any: [{ apt: 'OBS', min: 4 }, { cap: 'CAP_04_CLAUSE_AUDIT' }, { clue: 'CLU_FAKE_SMS' }] });
      return caught
        ? {
            noticeFrom: '044-404-0000',
            text: '[044-404-0000] 지금 즉시 현관문을 열어 인원 점검에 협조하십시오. 국번이 네 자리인 관공서는 없습니다. 가짜 문자임을 알아채고 번호를 차단했습니다.',
            effects: { mst: { MST_RULE: 2 }, clues: ['CLU_FAKE_SMS'] },
            badges: ['발신 번호 위조 의심'],
            sound: 'glitch',
            caption: '문자 알림음이 반 박자 늦게, 조금 낮은 음으로 울린다.',
            facts: { detected_forged_notice: true },
          }
        : {
            noticeFrom: '044-404-0000',
            text: '[044-404-0000] 지금 즉시 현관문을 열어 인원 점검에 협조하십시오. 현관까지 나갔다가 문 너머의 숨소리를 듣고 멈췄습니다. 그날 밤 한숨도 자지 못했습니다.',
            effects: { FAT: 8 },
            sound: 'glitch',
            caption: '문자 알림음이 반 박자 늦게, 조금 낮은 음으로 울린다.',
          };
    },
  },
  {
    id: 'MIN_03_ELEVATOR_4F',
    title: '멈칫거리는 엘리베이터',
    category: '소규모 괴담',
    weight: 7,
    eligible: { region: ['REG_ORDINARY_CITY', 'REG_SAFE_ZONE'] },
    run: () => ({
      text: '퇴근길 엘리베이터가 아무도 누르지 않은 지하층 버튼을 스스로 켰습니다. 문이 열리기 전에 한 층 일찍 내려 계단으로 올라갔습니다.',
      effects: { FAT: 4, aptChance: [{ apt: 'OBS', p: 0.1 }] },
    }),
  },
  {
    id: 'MIN_04_CONVENIENCE_NOTE',
    title: '편의점 야간 근무 수칙 메모',
    category: '일상/괴담',
    weight: 6,
    run: () => ({
      text: '동네 편의점 계산대 옆에 \'새벽 2시에 구형 지폐를 내는 손님에게는 거스름돈을 주지 말 것\'이라는 알바생의 메모가 붙어 있는 것을 눈여겨보았습니다.',
      effects: { clues: ['CLU_OLD_BILL'] },
      badges: ['단서 조각 +1'],
    }),
  },
  {
    id: 'MIN_05_STRAY_CAT_WARNING',
    title: '골목길 길고양이의 경계',
    category: '일상/감응',
    weight: 7,
    run: () => ({
      text: '평소 먹이를 주던 길고양이가 특정 가로등 아래를 향해 털을 곤두세우며 하악질을 합니다. 그 가로등 그림자를 피해 반대편 길로 돌아갔습니다.',
      badges: ['피해 회피'],
      effects: { aptChance: [{ apt: 'RES', p: 0.08 }] },
    }),
  },
  {
    id: 'MIN_06_NEIGHBOR_SOUP',
    title: '옆집 이웃이 건넨 따뜻한 국',
    category: '일상/관계',
    weight: 8,
    eligible: { not: { form: ['FORM_11_CONCEPT', 'FORM_06_SANCTUARY'] } },
    run: () => ({
      text: '옆집 이웃이 냄비에 따뜻한 국을 담아 문고리에 걸어 두었습니다. 오랜만에 사람 사는 온기를 느끼며 기운을 차렸습니다.',
      effects: { HP: 8, FAT: -10, trust: { NPC_NEIGHBOR: 5 }, meet: ['NPC_NEIGHBOR'] },
    }),
  },
  {
    id: 'MIN_07_WRONG_PARCEL',
    title: '주소가 지워진 택배 상자',
    category: '소규모 괴담',
    weight: 6,
    run: () => ({
      text: '현관 앞에 수취인 이름 없이 안쪽에서 무언가 긁는 소리가 나는 상자가 놓여 있습니다. 열지 않고 곧장 경비실 반송함에 넣었습니다.',
      effects: { mst: { MST_RULE: 2 } },
      sound: 'knock',
      caption: '상자 안쪽에서 손톱으로 골판지를 긁는 소리.',
    }),
  },
  {
    id: 'MIN_08_RADIO_STATIC',
    title: '라디오 주파수 너머의 숫자 방송',
    category: '소규모 괴담',
    weight: 6,
    run: () => ({
      text: '심야 버스 라디오에서 지지직거리는 잡음과 함께 낯선 숫자 낭독이 흘러나왔습니다. 이어폰을 꽂고 귀를 막아 정신적 피로를 덜었습니다.',
      effects: { aptChance: [{ apt: 'RES', p: 0.1 }] },
      sound: 'glitch',
      caption: '잡음 사이로 여자 목소리가 숫자를 하나씩 읽는다. 7, 7, 0, 4.',
    }),
  },
  {
    id: 'MIN_09_AGENCY_BONUS',
    title: '특별재난청 위험수당 입금',
    category: '기관 일상',
    weight: 8,
    eligible: { path: 'PATH_01_AUTHORITY', tier: 1 },
    run: () => ({
      noticeFrom: '입출금 알림',
      text: '지난달 현장 협조에 대한 위험수당과 기밀유지 수당이 통장에 입금되었습니다. 명세서 항목은 \'방역 자문료\'로 적혀 있습니다.',
      effects: { KRW: 120 },
    }),
  },
  {
    id: 'MIN_10_SUBWAY_LOST_ITEM',
    title: '유실물 보관함의 낡은 우산',
    category: '일상/물자',
    weight: 6,
    eligible: { res: 'KRW', min: 20 },
    run: () => ({
      text: '지하철 유실물 처분 매대에서 손잡이에 방호 문양이 새겨진 튼튼한 우산과 구급함을 싼값에 구했습니다.',
      effects: { SUP: 2, KRW: -20 },
    }),
  },
  {
    id: 'MIN_11_UPSTAIRS_MARBLE',
    title: '새벽 3시의 구슬 굴러가는 소리',
    category: '소규모 괴담',
    weight: 7,
    run: () => ({
      text: '위층은 분명 빈집인데 천장에서 구슬 굴러가는 소리가 들립니다. 천장을 올려다보지 않고 스탠드 불을 켜둔 채 밤을 넘겼습니다.',
      effects: { FAT: 6, aptChance: [{ apt: 'OBS', p: 0.1 }] },
      sound: 'knock',
      caption: '천장 위에서 작고 단단한 것이 왼쪽에서 오른쪽으로 굴러간다.',
    }),
  },
  {
    id: 'MIN_12_STREET_POSTER',
    title: '전봇대에 붙은 이상한 실종 전단',
    category: '소규모 괴담',
    weight: 6,
    run: () => ({
      text: '전단지 사진 속 인물이 볼 때마다 조금씩 표정을 바꾸고 있습니다. 눈을 마주치지 않고 재빨리 걸음을 옮겼습니다.',
      effects: { clues: ['CLU_MISSING_FACE'] },
      badges: ['단서 조각 +1'],
    }),
  },
  {
    id: 'MIN_13_OLD_BOOKSHOP_FIND',
    title: '헌책방 구석의 수기 노트',
    category: '일상/학습',
    weight: 5,
    run: () => ({
      text: '골목 헌책방에서 누군가 여백에 빽빽하게 적어 둔 \'건물 탈출 및 문턱 봉인 요령\' 수첩을 발견해 읽었습니다.',
      effects: { mst: { MST_SEAL: 3, MST_BOUND: 3 } },
    }),
  },
  {
    id: 'MIN_14_RAINY_BOOT_STEPS',
    title: '내 발소리 뒤에 붙은 물소리',
    category: '소규모 괴담',
    weight: 6,
    run: () => ({
      text: '비 오는 밤골목에서 내 걸음보다 반 박자 늦게 철퍽거리는 발소리가 따라왔습니다. 교차로 방호등 아래로 뛰어들자 소리가 멎었습니다.',
      effects: { aptChance: [{ apt: 'PRC', p: 0.15 }], FAT: 3 },
      sound: 'heartbeat',
      caption: '내 발소리 뒤로 젖은 운동화 소리가 반 박자 늦게 따라온다.',
    }),
  },
  {
    id: 'MIN_15_BLACKOUT_CANDLE',
    title: '단전 안내와 양초 한 자루',
    category: '일상/대비',
    weight: 6,
    run: (s) => ({
      noticeFrom: '관리사무소 안내방송',
      text: s.run.person.resources.SUP > 0
        ? '아파트 단지에 30분간 예고 없는 정전이 났습니다. 미리 챙겨 둔 손전등과 양초를 켜고 차분하게 문단속을 마쳤습니다.'
        : '아파트 단지에 30분간 예고 없는 정전이 났습니다. 손전등이 없어 휴대폰 불빛 하나로 30분을 버텼습니다.',
      effects: s.run.person.resources.SUP > 0 ? { FAT: -5 } : { FAT: 5 },
      caption: '냉장고 소리가 멎고, 복도 끝에서 누군가 계단을 하나씩 오른다.',
    }),
  },
  {
    id: 'MIN_16_PAYDAY_DEBT_DEDUCT',
    title: '월급날의 채무 일부 상환',
    category: '경제/생활',
    weight: 9,
    eligible: { res: 'KRW', max: -1 },
    run: () => ({
      text: '아끼고 모은 돈으로 원금 일부를 갚았습니다. 독촉 문자의 빈도가 눈에 띄게 줄어듭니다.',
      effects: { KRW: 60, counters: { debt_relief: 1 } },
      badges: ['부채 상환 진행'],
    }),
  },
  {
    id: 'MIN_17_APEX_SHADOW_SIGHT',
    title: '멀리서 목격한 강자의 권능',
    category: '야망/전조',
    weight: 5,
    eligible: { not: { tierMin: 3 } },
    run: (s, ctx) => {
      const path = PATHS.find((p) => p.id === s.run.person.path_id) ?? PATHS[Math.floor(ctx.roll() * PATHS.length)];
      const scenes: Record<string, string> = {
        PATH_01_AUTHORITY: '정장 차림의 재난청 총감이 무전기 하나로 세 구역의 봉쇄선을 동시에 올리는 장면',
        PATH_02_SEALING: '흰 장갑을 낀 대봉인사가 손짓 한 번으로 골목을 덮은 검은 안개를 접어 넣는 장면',
        PATH_03_ABYSS: '안개 속 사절들이 한 사람 앞에서 일제히 고개를 숙이는 장면',
        PATH_04_NIGHT: '지붕 위의 그림자 하나가 나타나자 골목의 괴물들이 일제히 달아나는 장면',
        PATH_05_BOUNDARY: '누군가 닫힌 셔터를 문처럼 열고 들어가 사람 셋을 데리고 나오는 장면',
        PATH_06_SANCTUARY: '침식선이 한 낡은 아파트 동 앞에서 더는 나아가지 못하고 멈추는 장면',
        PATH_07_RECORD_DIRECTOR: '검은 만년필을 든 사람이 벽보 한 줄을 긋자 벽보 속 괴담이 지워지는 장면',
        PATH_08_FIXER_SYNDICATE: '검은 차에서 내린 사람이 서명 한 장으로 검문소 차단봉을 올리는 장면',
        PATH_09_HIVE_SOVEREIGN: '서로 다른 일곱 사람이 같은 순간 같은 방향으로 고개를 돌리는 장면',
        PATH_10_URBAN_MYTH: '괴이가 한 사람의 이름이 적힌 전단을 보고 물러서는 장면',
      };
      return {
        text: `건너편 블록에서 검은 안개가 치솟았습니다. 그리고 ${scenes[path.id]}을 보았습니다. 언젠가 저 자리에 오를 수 있을까 생각하며 오래 서 있었습니다.`,
        effects: { mst: { MST_FIELD: 2, MST_SEAL: 2, MST_RULE: 2, MST_BOUND: 2 } },
        badges: [`야망: ${path.apex}`],
        sound: 'bell',
      };
    },
  },
  {
    id: 'MIN_18_PUBLIC_PHONE_RING',
    title: '철거 직전 공중전화의 벨소리',
    category: '소규모 괴담',
    weight: 6,
    run: () => ({
      text: '코드가 뽑혀 있는 길가의 낡은 공중전화가 요란하게 울립니다. 수화기를 들지 않고 그대로 지나쳐 화를 면했습니다.',
      effects: { mst: { MST_RULE: 2 } },
      sound: 'siren',
      caption: '전원이 없는 공중전화에서 구식 벨이 일곱 번 울린다.',
    }),
  },
  {
    id: 'MIN_19_PORT_FOG_HORN',
    title: '안개 항구의 두 번째 뱃고동',
    category: '지역/경계',
    weight: 9,
    eligible: { region: 'REG_FOG_PORT' },
    run: () => ({
      text: '입항 예정이 없는 새벽에 두 번 울리는 뱃고동 소리를 듣고, 부두 노동자들의 관습대로 바다를 등지고 앉아 안개가 걷히기를 기다렸습니다.',
      effects: { mst: { MST_BOUND: 3 }, clues: ['CLU_FOG_HORN'] },
      sound: 'tide',
      caption: '안개 너머에서 낮은 뱃고동이 두 번. 두 번째는 너무 가깝다.',
    }),
  },
  {
    id: 'MIN_20_SAFE_MORNING_COFFEE',
    title: '아무 일도 일어나지 않은 평온한 아침',
    category: '일상/회복',
    weight: 8,
    run: () => ({
      text: '밤새 아무런 사이렌도, 노크 소리도 없었습니다. 창문을 열어 맑은 아침 햇살을 쬐며 따뜻한 커피 한 잔을 마셨습니다.',
      effects: { HP: 10, FAT: -15 },
    }),
  },
];

export const minorById = (id: string) => MINOR_EVENTS.find((m) => m.id === id);
