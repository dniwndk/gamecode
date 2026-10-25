// 03절: 5대 생활권, 조직, 인물(역할 호칭), 단서.
import type { ClueDef, NpcDef, RegionDef } from '../domain/contentTypes';
import type { ThreatTag } from '../domain/types';

export const REGIONS: RegionDef[] = [
  {
    id: 'REG_SAFE_ZONE',
    name: '안전 보호구역',
    monthlyCost: 220,
    risk: 0.08,
    riskLabel: '낮음',
    threats: ['TH_RITUAL', 'TH_RULE'],
    description: '특별재난청 본청과 부유층 저택이 모인 중심가. 거리마다 방호 장치가 켜져 있어 야생 괴물은 드물지만, 대리 제물 계약과 서류에 숨은 괴담이 도사린다.',
  },
  {
    id: 'REG_ORDINARY_CITY',
    name: '일반 시가지',
    monthlyCost: 120,
    risk: 0.18,
    riskLabel: '보통',
    threats: ['TH_RULE', 'TH_PREDATOR', 'TH_INFECTION'],
    description: '평범한 직장인과 시민이 사는 아파트 단지와 지하철 노선, 상가 거리. 퇴근길 장례열차, 복도 끝 404호 같은 일상 괴담이 가장 자주 일어난다.',
  },
  {
    id: 'REG_BLOCKADE_ZONE',
    name: '외곽 봉쇄구역',
    monthlyCost: 60,
    risk: 0.42,
    riskLabel: '매우 높음',
    threats: ['TH_DOMAIN', 'TH_PREDATOR', 'TH_INFECTION'],
    description: '대규모 침식 사고 뒤 콘크리트 격리벽과 검문소로 막힌 옛 공단 지대. 이사할 돈이 없는 사람들이 남아 살고, 밤마다 골목 구조가 바뀐다.',
  },
  {
    id: 'REG_FOG_PORT',
    name: '안개 항구',
    monthlyCost: 90,
    risk: 0.3,
    riskLabel: '높음',
    threats: ['TH_BOUNDARY', 'TH_COSMIC', 'TH_RITUAL'],
    description: '일 년 내내 바다 안개가 걷히지 않는 낡은 항만과 폐선박 구역. 실종자가 돌아오는 문턱, 뒷골목 중개인, 바다 너머의 사절이 뒤섞여 있다.',
  },
  {
    id: 'REG_BEYOND_MAP',
    name: '지도 밖의 영역',
    monthlyCost: 0,
    risk: 0.75,
    riskLabel: '극한',
    threats: ['TH_COSMIC', 'TH_DOMAIN', 'TH_RULE'],
    description: '일반 교통수단으로는 갈 수 없고 경계 통로나 원정으로만 들어가는 이계 심부. 마지막 뜰, 종이에 없는 바다, 최후의 기슭이 여기에 있다.',
  },
];

export const regionById = (id: string) => REGIONS.find((r) => r.id === id) ?? REGIONS[1];

export const FACTIONS = [
  { id: 'FAC_AGENCY', name: '특별재난청', text: '초자연 재난과 괴담을 격리·은폐·진압하는 정부 기관. 기동대, 기록국, 봉인 기술 부서로 나뉜다.' },
  { id: 'FAC_MUTUAL_AID', name: '주민 자경단(상호부조회)', text: '국가의 보호가 닿지 않는 동네 주민들이 안부를 확인하고 비상식량과 동네 수칙 전단을 나누는 모임.' },
  { id: 'FAC_FIXERS', name: '뒷골목 해결사들', text: '재난청이 포기한 실종자 수색과 저주받은 물건 회수를 돈 받고 처리하는 비공식 업자들.' },
  { id: 'FAC_DEBT_SYNDICATE', name: '사채 집행 조직', text: '빚진 사람에게 위험 구역 대리 노역을 강요하거나 부유층의 액받이로 넘기는 악성 계약 조직.' },
  { id: 'FAC_ABYSS', name: '심연의 사절단', text: '안개 항구 너머에서 오는 비인간 계약 세력. 선악과 무관하게 계약 문구와 대가만 집행한다.' },
];

export const NPCS: NpcDef[] = [
  { id: 'NPC_NEIGHBOR', label: '옆집 이웃', intro: '복도 건너편에 사는 사람. 사이렌이 울리면 서로의 문을 두 번 두드려 안부를 확인한다.' },
  { id: 'NPC_MENTOR', label: '은퇴한 봉인 스승', intro: '지하실에서 먹물과 말뚝을 다루는 노인. 말수가 적고 손이 빠르다.' },
  { id: 'NPC_SQUAD', label: '현장기동대 반장', intro: '재난청 현장기동대를 이끄는 사람. 보고서보다 사람 수를 먼저 센다.' },
  { id: 'NPC_BROKER', label: '항구 뒷골목 중개인', intro: '안개 항구 포장마차 뒤에서 의뢰와 물건과 소문을 사고파는 사람.' },
];

export const npcLabel = (id: string) => NPCS.find((n) => n.id === id)?.label ?? id;

export const CLUES: ClueDef[] = [
  { id: 'CLU_TRAIN_TICKET', label: '장례열차 회수권 규칙', text: '이름이 불려도 대답하지 않는다. 쓰지 않은 회수권이 표를 대신한다.' },
  { id: 'CLU_404_KNOCK', label: '404호 네 번의 노크 금기', text: '네 번의 노크에는 대답하지 않는다. 실제로 사는 사람의 증언이 가짜 특약을 지운다.' },
  { id: 'CLU_FAKE_SMS', label: '가짜 재난문자 국번 특징', text: '관공서는 네 자리 국번을 쓰지 않는다. 문을 열라는 문자는 전부 가짜다.' },
  { id: 'CLU_BUS_CARD', label: '심야버스 단말기 오류', text: '하차 벨 대신 단말기에 카드를 거꾸로 두 번 대면 처리할 수 없는 승객이 된다.' },
  { id: 'CLU_PAPER_DEFECT', label: '서류형 괴담의 형식 결함', text: '서류로 오는 저주는 서명 필적과 첨부 서류 누락으로 반려할 수 있다.' },
  { id: 'CLU_ELEVATOR_HATCH', label: '없는 층 엘리베이터의 해치', text: '존재하지 않는 층으로 내려갈 때는 문이 열리기 전에 천장 해치로 기계실에 오른다.' },
  { id: 'CLU_LAUNDRY_NORTH', label: '빨래 줄 그림자', text: '안개 미궁에서 나침반은 헛돈다. 옥상 빨래 줄 그림자만 진짜 북쪽을 가리킨다.' },
  { id: 'CLU_PASSWORD', label: '약속 암호', text: '창밖에서 아는 목소리가 부르면 미리 정한 암호를 묻는다. 흉내쟁이는 대답하지 못한다.' },
  { id: 'CLU_RED_MOON', label: '붉은 달의 방송', text: '옥상으로 부르는 방송은 중계기에서 나온다. 아는 사람의 목소리가 최면을 깬다.' },
  { id: 'CLU_MYCELIUM_WIND', label: '잿빛 균사의 바람길', text: '잿빛 포자는 바람을 거슬러 퍼지지 못한다. 바다 쪽에서 부는 길로 걷는다.' },
  { id: 'CLU_REFLECTION', label: '하늘 눈동자의 반사면', text: '하늘의 눈은 거울과 유리와 물웅덩이로만 내려다본다. 비치는 면을 모두 가린다.' },
  { id: 'CLU_FOG_HORN', label: '두 번째 뱃고동', text: '입항 예정이 없는 새벽, 뱃고동이 두 번 울리면 바다를 등지고 앉는다.' },
  { id: 'CLU_OLD_BILL', label: '구형 지폐 손님', text: '새벽 두 시에 구형 지폐를 내는 손님에게 거스름돈을 주지 않는다.' },
  { id: 'CLU_MISSING_FACE', label: '표정이 바뀌는 실종 전단', text: '전단 속 얼굴과 눈을 맞추지 않는다. 같은 얼굴이 폐건물 지하 엘리베이터 앞에서 마지막으로 찍혔다.' },
  { id: 'CLU_ALTAR_BLANK', label: '제단 계약서의 공란', text: '제단 계약은 피지정자 칸이 비면 성립하지 않는다.' },
  { id: 'CLU_DRAIN', label: '검문선 배수로', text: '서치라이트는 남쪽 배수로를 비추지 않는다. 교대 시간은 새벽 4시 10분.' },
  { id: 'CLU_RED_LINE', label: '침식선과 불빛', text: '붉은 침식선은 사람이 사는 불빛 앞에서 느려진다. 불을 끄고 떠나면 빨라진다.' },
  { id: 'CLU_SEA_CHART', label: '젖지 않는 지도', text: '종이에 없는 바다는 물에 젖지 않는 지도를 가진 사람만 건넌다.' },
  { id: 'CLU_AUCTION_LOT', label: '경매 물품 번호 13', text: '항구 지하 경매의 13번 물품은 상자 안에서 먼저 입찰한다.' },
  { id: 'CLU_ARCHIVE_INDEX', label: '총괄 색인 대장', text: '지하 서고의 모든 문서는 총괄 색인 대장의 분류를 따른다.' },
];

export const clueById = (id: string) => CLUES.find((c) => c.id === id);

export const THREAT_LABEL: Record<ThreatTag, string> = {
  TH_RULE: '규칙형 괴담',
  TH_PREDATOR: '포식형 괴물',
  TH_INFECTION: '감염과 변이',
  TH_RITUAL: '의식과 계약',
  TH_DOMAIN: '공간 침식',
  TH_COSMIC: '외우주의 시선',
  TH_BOUNDARY: '경계와 문턱',
};
