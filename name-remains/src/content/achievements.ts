// 09절: 6등급 66종 업적. 해금 전에는 등급·제목·암시만 화면에 나간다(publicSelectors). check는 내부 판정이다.
import type { AchievementDef, AchievementFact } from '../domain/contentTypes';
import type { RunState } from '../domain/types';
import { HARDEST_BACKGROUNDS } from './backgrounds';

type F = AchievementFact;
const inc = (f: F, id: string) => f.type === 'incident_completed' && f.incident_id === id;
const survived = (f: F) => f.data?.survived === true;
const L = (f: F, k: string) => f.local?.[k];
const bg = (s: RunState, id: string) => s.run.person.background_id === id;
const pos = (s: RunState) => s.run.person.position_id;
const endpoint = (f: F, ...types: string[]) => f.type === 'endpoint_committed' && types.includes(f.endpoint_type as string);

export const ACHIEVEMENTS: AchievementDef[] = [
  // Ⅰ 흔적
  { id: 'A01', tier: 1, title: '돌아온 이름', hint: '그곳이 당신을 불렀다. 돌아온 뒤에도 그 이름에 대답할 수 있다면.', revealed: '이번 생애의 첫 비자발적 위협 사건에서 살아 돌아왔다.', check: (_s, f) => f.type === 'incident_completed' && f.data?.kind === 'major' && f.entry_mode === 'involuntary' && survived(f) },
  { id: 'A02', tier: 1, title: '종이 한 장의 자리', hint: '누군가 당신의 이름 옆에 맡길 일을 적었다.', revealed: '정식 고용·협력 계약 등으로 실제 담당 역할을 처음 얻었다.', check: (s, f) => f.type === 'position_granted' && s.run.person.position_tier >= 1 },
  { id: 'A03', tier: 1, title: '누군가의 문', hint: '밖은 아직 위험하다. 그래도 당신에게 열리는 문이 하나 있다.', revealed: '이번 생애에서 맺은 관계를 통해 위기 속에서 타인의 안전한 거처에 받아들여졌다.', check: (s, f) => f.type === 'incident_completed' && L(f, 'safe_house_accepted') === true && (s.run.relationships.NPC_NEIGHBOR?.trust ?? 0) >= 25 },
  { id: 'A04', tier: 1, title: '마지막 줄', hint: '빈 종이로 끝나는 삶은 없다. 끝까지 적힌 줄을 남겨라.', revealed: '중도 포기 없이 사망·소멸·특수 완결 등 정식 종점에 도달했다.', check: (_s, f) => f.type === 'endpoint_committed' && !!f.endpoint_type },
  { id: 'A25', tier: 1, title: '첫 번째 월급날', hint: '세상이 무너져도 집주인은 날짜를 잊지 않는다.', revealed: '이번 생애에서 첫 급여나 외주 보수를 받아 한 달 생활비를 무사히 지불했다.', check: (_s, f) => f.type === 'activity_completed' && f.data?.earned === true && f.data?.rentPaid === true },
  { id: 'A26', tier: 1, title: '커튼 뒤의 숨소리', hint: '보이지 않는다고 없는 것은 아니지만, 안 보이면 지나가기도 한다.', revealed: '괴담 조우에서 싸우지 않고 은폐·침묵 선택만으로 상처 없이 위기를 넘겼다.', check: (_s, f) => f.type === 'incident_completed' && L(f, 'used_stealth') === true && (f.damage ?? 0) === 0 && survived(f) },
  { id: 'A27', tier: 1, title: '가짜 번호는 받지 않는다', hint: '국번이 네 자리인 관공서는 이 도시에 없다.', revealed: '위조된 재난안전문자나 가짜 안내문을 속지 않고 식별해 차단했다.', check: (_s, f) => f.type === 'minor_event_resolved' && L(f, 'detected_forged_notice') === true },
  { id: 'A28', tier: 1, title: '비어 있는 방의 열쇠', hint: '열리지 않던 문이 이제는 당신의 창고가 된다.', revealed: '404호 사건에서 쫓겨나지 않고 역으로 그 빈 공간의 사용권을 손에 넣었다.', check: (_s, f) => inc(f, 'EVT_02_ROOM_404') && f.outcome === 'lease_taken_over' },
  { id: 'A29', tier: 1, title: '배낭 속의 소금 한 줌', hint: '거창한 주문보다 철물점 영수증이 목숨을 구할 때가 있다.', revealed: '준비해 둔 생존 물자를 제때 써서 치명적 피해를 막아 냈다.', check: (_s, f) => f.type === 'action_resolved' && f.data?.suppliesSpent === true && f.data?.success === true },
  { id: 'A30', tier: 1, title: '귀를 스친 경보', hint: '남들보다 반 박자 먼저 고개를 숙였다.', revealed: '위험 감지 이명이나 높은 관찰력으로 사건 진입 즉시 첫 단서를 포착했다.', check: (_s, f) => f.type === 'action_resolved' && f.data?.autoDetected === true },
  { id: 'A31', tier: 1, title: '스승의 첫 매듭', hint: '서툰 선이라도 먹물이 마르기 전에는 힘이 있다.', revealed: '첫 번째 전문 수련 단계를 마쳤다(숙련 하나가 25 이상).', check: (s) => Object.values(s.run.person.masteries).some((v) => v >= 25) },
  { id: 'A32', tier: 1, title: '너무 일찍 닫힌 책', hint: '첫 장을 넘기기도 전에 바람이 불어 촛불이 꺼졌다.', revealed: '본격적인 삶을 시작한 지 2년 안에 갑작스러운 재난으로 짧은 생을 마감했다.', check: (s, f) => endpoint(f, 'death') && (s.run.clock.virtual_minute - s.run.clock.adult_start_minute) / 525600 <= 2 },

  // Ⅱ 이변
  { id: 'A05', tier: 2, title: '문은 닫혔다', hint: '바람이 멎은 것은 우연이 아니다. 네가 그은 선이 남아 있다.', revealed: '자신이 구축한 국소 봉인이 그 사건의 위협이 끝날 때까지 무너지지 않았다.', check: (_s, f) => f.type === 'incident_completed' && L(f, 'local_seal_maintained') === true && survived(f) },
  { id: 'A06', tier: 2, title: '두 사람의 귀가', hint: '돌아가는 길에 네 발소리만 들려서는 안 된다.', revealed: '구조 대상인 동행자와 함께 사건 밖의 귀환 지점에 살아 도달했다.', check: (_s, f) => f.type === 'incident_completed' && L(f, 'escaped_with_ally') === true && L(f, 'ally_survived') === true && survived(f) },
  { id: 'A07', tier: 2, title: '이자 없는 새벽', hint: '처음부터 당신을 따라다니던 숫자가, 오늘은 더 이상 당신을 깨우지 않는다.', revealed: '채무 상속자로 태어나 그 초기 부채를 실제로 모두 갚았다.', check: (s) => bg(s, 'BG_04_DEBTOR') && s.run.person.initial_debt_cleared && s.run.person.resources.KRW >= 0 },
  { id: 'A08', tier: 2, title: '손바닥의 이정표', hint: '어제는 길을 물었다. 오늘은 누군가가 네 손을 바라본다.', revealed: '새 통로를 찾아내고 그 길로 다른 사람을 목적지까지 무사히 데려갔다.', check: (_s, f) => f.type === 'incident_completed' && L(f, 'guided_other_via_discovered_route') === true },
  { id: 'A33', tier: 2, title: '내리지 않은 정류장', hint: '벨을 누른 자는 남았고, 표를 거꾸로 낸 자만 보도블록을 밟았다.', revealed: '종점 없는 77번 심야버스에서 하차 벨 함정을 피하고 무사히 탈출했다.', check: (_s, f) => inc(f, 'EVT_11_NIGHT_BUS_77') && L(f, 'bell_pressed') !== true && survived(f) && f.outcome === 'escaped' },
  { id: 'A34', tier: 2, title: '반려된 장례식', hint: '서류에 도장이 찍히지 않았으니, 당신은 오늘 죽을 수 없다.', revealed: '야간 민원실의 0번 번호표에서 자신의 사망신고서를 행정 절차로 반려시켰다.', check: (_s, f) => inc(f, 'EVT_12_MIDNIGHT_CIVIL_DESK') && f.outcome === 'rejected_by_rule' },
  { id: 'A35', tier: 2, title: '존재하지 않는 층', hint: '지하 13층의 문이 열리기 전에 기계실 천장을 밟아라.', revealed: '지하 13층으로 내려가는 엘리베이터에서 추락하거나 삼켜지지 않고 탈출했다.', check: (_s, f) => inc(f, 'EVT_13_REVERSE_ELEVATOR') && survived(f) },
  { id: 'A36', tier: 2, title: '사라진 단지의 귀환자들', hint: '놀이터만 맴돌던 스무 명의 발자국이 마침내 큰길로 이어졌다.', revealed: '7단지 아파트 미궁에서 고립된 주민 열 명 이상을 이끌고 함께 빠져나왔다.', check: (_s, f) => inc(f, 'EVT_14_LOST_APT_COMPLEX') && Number(L(f, 'residents_rescued') ?? 0) >= 10 },
  { id: 'A37', tier: 2, title: '경매장의 새 주인', hint: '망치를 들고 있던 자들이 도망친 자리에 당신이 남았다.', revealed: '항구 지하 경매장 습격 사태를 수습하고 특급 유물이나 경매장 주도권을 확보했다.', check: (_s, f) => inc(f, 'EVT_15_BLACK_AUCTION') && (f.outcome === 'relic_claimed' || f.outcome === 'auction_controlled') },
  { id: 'A38', tier: 2, title: '옥상 문 앞에서 멈춘 발걸음', hint: '붉은 달을 보던 이들이 네가 틀어준 녹음기 소리에 고개를 돌렸다.', revealed: '옥상 정원의 붉은 달 집단 최면에서 사람들을 깨워 추락을 막았다.', check: (_s, f) => inc(f, 'EVT_16_ROOFTOP_RED_MOON') && L(f, 'hypnosis_broken') === true },
  { id: 'A39', tier: 2, title: '검은 줄로 지운 문장', hint: '불리한 약속이라도 잉크가 마르기 전에 그어버리면 그만이다.', revealed: '검열관의 만년필이나 계약 해석으로 치명적인 계약 독소 조항을 지웠다.', check: (_s, f) => f.type === 'incident_completed' && L(f, 'redacted_fatal_clause') === true },
  { id: 'A40', tier: 2, title: '손대지 않고 닫힌 통로', hint: '예전에는 숨을 죽이며 기어 나왔던 길을, 오늘은 걸음을 멈추지도 않고 닫았다.', revealed: '성장한 능력으로 같은 계열의 괴담 침입을 선택 없이 자동으로 제압했다.', check: (_s, f) => f.type === 'power_override_triggered' },

  // Ⅲ 위업
  { id: 'A09', tier: 3, title: '남겨진 구역', hint: '출구 없는 곳에서 태어났다. 마지막 검문선은 당신의 출생지를 믿지 않는다.', revealed: '외곽 봉쇄구역에서 태어나 살아 있는 채로 공식 검문선을 통과해 시가지에 닿았다.', check: (s, f) => inc(f, 'EVT_03_BLOCKADE_BREAK') && bg(s, 'BG_03_BLOCKADE') && survived(f) && L(f, 'passed_official_checkpoint') === true },
  { id: 'A10', tier: 3, title: '짧은 심지', hint: '촛불은 처음부터 짧았다. 그래도 배움을 기다리는 마지막 뜰까지 걸어라.', revealed: '선천적 단명 체질로 태어나 생존 기한 안에 마지막 뜰에 도달해 첫 수련 자격을 얻었다.', check: (s, f) => inc(f, 'EVT_06_LAST_COURTYARD') && bg(s, 'BG_08_SHORT_LIFE') && f.outcome === 'courtyard_qualified' && survived(f) },
  { id: 'A11', tier: 3, title: '짐승의 목소리', hint: '낯선 목소리가 되어도, 한 사람은 네 이름에 대답한다.', revealed: '비인간 변이 이후 이전부터 관계가 있던 인물과 서로를 알아보고 소통을 회복했다.', check: (s, f) => f.type === 'incident_completed' && s.run.person.form_id !== 'FORM_01_HUMAN' && L(f, 'mutual_recognition_restored') === true },
  { id: 'A12', tier: 3, title: '사라지지 않은 약속', hint: '약속한 사람의 심장은 멎었다. 약속받은 사람의 문은 아직 닫혀 있다.', revealed: '사후 지속으로 이어진 같은 인물이 생전의 귀환 약속을 실제로 완수했다.', check: (s, f) => inc(f, 'PM_PROMISE') && f.outcome === 'promise_fulfilled' && s.run.life_status === 'postmortem' },
  { id: 'A41', tier: 3, title: '찢어진 종이 인형', hint: '비명은 인형이 질렀고, 당신은 침대 위에서 눈을 떴다.', revealed: '종이 인형 대역술로 즉사급 피해를 대신 넘기고 살아 돌아왔다.', check: (_s, f) => (f.type === 'action_resolved' && f.data?.effigy === true) || (f.type === 'incident_completed' && L(f, 'effigy_prevented_death') === true) },
  { id: 'A42', tier: 3, title: '선배들의 마지막 기록장', hint: '동아리방 열쇠를 넘겨받던 날의 질문에 마침내 답을 적었다.', revealed: '괴담 동아리 부원으로 시작해 실종된 선배들의 흔적을 찾고 그 괴담을 파훼했다.', check: (s, f) => bg(s, 'BG_10_OCCULT_CLUB') && f.type === 'incident_completed' && L(f, 'seniors_trace_resolved') === true },
  { id: 'A43', tier: 3, title: '되찾은 방파제의 기억', hint: '안개 속에 두고 왔던 3년 치의 이름이 파도 소리와 함께 돌아왔다.', revealed: '기억상실자로 시작해 안개 너머에서 잃어버린 3년의 진실을 되찾았다.', check: (s, f) => bg(s, 'BG_15_LOST_MEMORY') && f.type === 'incident_completed' && L(f, 'lost_memory_recovered') === true && survived(f) },
  { id: 'A44', tier: 3, title: '원작에는 없던 각주', hint: '당신이 읽었던 소설의 마지막 줄 옆에, 당신이 직접 살아낸 새 문장이 추가되었다.', revealed: '이야기 밖의 독자로 시작해 원작 지식과 다른 변형 함정을 간파하고 살아 돌아왔다.', check: (s, f) => bg(s, 'BG_14_OUTSIDE_READER') && f.type === 'incident_completed' && L(f, 'avoided_reader_trap') === true && survived(f) },
  { id: 'A45', tier: 3, title: '정화된 잿빛 숨결', hint: '병동에서 따라나온 포자가 더 이상 당신의 폐를 갉아먹지 못한다.', revealed: '격리 병동 퇴원자로 시작해 체내 오염을 소각·통제하는 데 성공했다.', check: (s, f) => f.type === 'capability_granted' && f.capability_id === 'CAP_24_SPORE_PURGE' && bg(s, 'BG_12_TAINTED_CLINIC') },
  { id: 'A46', tier: 3, title: '백 년 만의 평온한 은퇴', hint: '수많은 밤을 건너온 끝에, 괴물의 이빨이 아니라 늙은 시간의 품에서 눈을 감았다.', revealed: '중위 이상의 직위나 숙련을 이룬 뒤, 괴담에 죽지 않고 일흔 넘어 평온하게 생을 마쳤다.', check: (s, f) => endpoint(f, 'death') && f.data?.natural === true && s.run.clock.current_age_years >= 70 && (s.run.person.position_tier >= 2 || Object.values(s.run.person.masteries).some((v) => v >= 50)) },
  { id: 'A47', tier: 3, title: '끝나지 않는 제단의 시계', hint: '죽음은 거절당했고, 자유 또한 허락되지 않았다.', revealed: '비극적인 비사망 종점인 영원한 구속에 도달했다.', check: (_s, f) => endpoint(f, 'eternal_binding') },
  { id: 'A48', tier: 3, title: '멈추지 않는 태엽', hint: '심장이 멎은 자리에서 시계태엽이 대신 돌아가며 원수의 이름을 가리켰다.', revealed: '태엽 심장의 복수귀로 일어나 자신을 죽음으로 몰아넣은 대상을 토벌했다.', check: (s, f) => inc(f, 'PM_REVENGE') && s.run.person.postmortem_type === 'POST_04_RELIC_REVENANT' && L(f, 'avenged_killer') === true },

  // Ⅳ 전설
  { id: 'A13', tier: 4, title: '차장의 목례', hint: '표를 검사하던 자가 네 지시를 기다린다. 마지막 동행자가 내릴 때까지.', revealed: '장례열차의 운행·퇴로 통제권을 확보하고 구조 대상 동행자 전원을 내리게 했다.', check: (_s, f) => inc(f, 'EVT_01_FUNERAL_TRAIN') && L(f, 'train_control_seized') === true && L(f, 'all_designated_allies_disembarked') === true },
  { id: 'A14', tier: 4, title: '관 없는 귀환', hint: '제단의 빈자리는 네 몫이었다. 의식이 끝난 뒤에도 비어 있어야 한다.', revealed: '이미 제물로 지목된 상태에서 의식의 대상 지정을 무효화하고, 의식이 끝난 뒤 살아 돌아왔다.', check: (_s, f) => inc(f, 'EVT_05_OFFERING_ALTAR') && L(f, 'offering_designation_nullified') === true && L(f, 'ritual_concluded') === true && survived(f) },
  { id: 'A15', tier: 4, title: '종이에 없는 바다', hint: '지도의 끝은 물에 젖지 않는다. 그 바다에서 돌아온 옷자락만 젖는다.', revealed: '종이에 없는 바다의 실제 해안에 닿아 현장 증거를 확보하고 살아 돌아왔다.', check: (_s, f) => inc(f, 'EVT_08_UNCHARTED_SEA') && L(f, 'shore_evidence_secured') === true && L(f, 'returned_to_haven') === true && survived(f) },
  { id: 'A16', tier: 4, title: '지워진 붉은 선', hint: '지도 위의 붉은 선이 집들을 삼켰다. 살아 있는 집들이 다시 선을 지우게 하라.', revealed: '권역 재난에서 주민의 거주 기반을 지키면서 붉은 침식선을 실제로 후퇴시켰다.', check: (_s, f) => inc(f, 'EVT_09_RED_LINE_SURGE') && L(f, 'residential_base_protected') === true && L(f, 'red_line_pushed_back') === true },
  { id: 'A49', tier: 4, title: '밤의 주인', hint: '가로등이 꺼진 골목에서 그림자들이 먼저 길을 비킨다.', revealed: '야행군주의 자리에 올라 모든 포식 괴물에게 복종과 불가침을 강제했다.', check: (s, f) => f.type === 'position_granted' && pos(s) === 'POS_NIGHT_LORD' },
  { id: 'A50', tier: 4, title: '적히지 않은 역사', hint: '서고에서 지워진 괴담은 내일 아침 거리에 나타날 수 없다.', revealed: '기록말소국장에 올라 폭주하는 지하 서고의 1급 금서들을 일괄 말소·통제했다.', check: (s, f) => inc(f, 'EVT_17_CENSORED_ARCHIVE_BREACH') && pos(s) === 'POS_ARCHIVE_DIRECTOR' },
  { id: 'A51', tier: 4, title: '뒷골목의 정상', hint: '재난청의 공문보다 당신의 서명 한 줄이 더 빠르게 문을 연다.', revealed: '그림자 조합주에 올라 사채 카르텔을 숙청하고 비공식 해결사망을 장악했다.', check: (s, f) => inc(f, 'EVT_18_SYNDICATE_WAR') && pos(s) === 'POS_SHADOW_SYNDICATE_HEAD' },
  { id: 'A52', tier: 4, title: '하나의 이름, 일곱 개의 그림자', hint: '일곱 곳의 거리에서 동시에 눈을 뜨고, 하나의 목소리로 대답한다.', revealed: '만인의 군체주에 올라 일곱 구의 몸을 동시에 유지하며 도시 감각망을 완성했다.', check: (s) => pos(s) === 'POS_HIVE_SOVEREIGN' && s.run.person.bodies_count >= 7 },
  { id: 'A53', tier: 4, title: '당신이 곧 수칙이다', hint: '사람들은 이제 다른 괴담을 피하기 위해 당신의 금기를 먼저 외운다.', revealed: '도시의 아홉 번째 괴담에 도달해 다른 괴이들에게 당신의 수칙을 강제했다.', check: (s, f) => f.type === 'position_granted' && pos(s) === 'POS_NINTH_LEGEND' },
  { id: 'A54', tier: 4, title: '거울 없는 방의 승리자', hint: '모든 유리가 깨진 자리에서, 눈동자는 끝내 당신을 찾지 못했다.', revealed: '반사면 단절로 외우주적 관측 사건에서 체력 피해 하나 없이 살아 돌아왔다.', check: (_s, f) => f.type === 'incident_completed' && (f.threats ?? []).includes('TH_COSMIC') && (f.damage ?? 0) === 0 && survived(f) && L(f, 'used_mirror_shatter') === true },
  { id: 'A55', tier: 4, title: '아무도 버리지 않은 방어선', hint: '보고서의 \'예상 희생자 수\' 칸에 처음으로 숫자 0이 적혔다.', revealed: '대규모 권역 재난에서 동행자나 주민을 한 명도 잃지 않고 방어에 성공했다.', check: (_s, f) => inc(f, 'EVT_09_RED_LINE_SURGE') && Number(L(f, 'casualties') ?? 1) === 0 && L(f, 'red_line_pushed_back') === true },
  { id: 'A56', tier: 4, title: '피 한 방울 묻지 않은 생환', hint: '가장 깊은 어둠을 지나왔으나, 외투 자락에는 먼지조차 앉지 않았다.', revealed: '비자발적 위협 사건을 다섯 번 넘게 겪으면서 건강이 한 번도 50 아래로 내려가지 않았다.', check: (s, f) => f.type === 'incident_completed' && survived(f) && s.run.person.involuntary_survivals_count >= 5 && s.run.person.min_hp_in_run >= 50 },

  // Ⅴ 신화
  { id: 'A17', tier: 5, title: '당신의 명령으로', hint: '도시들의 목소리가 하나의 명령을 기다린다. 빈 의자에 앉는 것만으로는 부족하다.', revealed: '특별재난청 총감의 지휘권으로 여러 구역 동시 대응 작전을 완수했다.', check: (s, f) => inc(f, 'EVT_19_MYTHIC_CLIMAX_OPS') && pos(s) === 'POS_DIRECTOR_GENERAL' && L(f, 'multi_sector_command_completed') === true },
  { id: 'A18', tier: 5, title: '열리지 않는 밤', hint: '이번에는 문이 아니라 밤 자체를 닫아야 한다.', revealed: '대봉인사의 핵심 술식으로 도시 전체를 위협하는 밤의 현상을 봉인했다.', check: (s, f) => inc(f, 'EVT_19_MYTHIC_CLIMAX_OPS') && pos(s) === 'POS_GRAND_SEALER' && s.run.world.eternal_night_sealed },
  { id: 'A19', tier: 5, title: '신이 돌아본 자리', hint: '그것이 당신을 보았다. 시선이 지나간 자리에서, 당신의 이야기가 끊기지 않아야 한다.', revealed: '신적 존재의 주시에 직접 표적이 된 뒤, 죽거나 사후 전환하지 않고 주시의 연결을 끊었다.', check: (_s, f) => inc(f, 'EVT_10_GAZE_OF_DEITY') && L(f, 'direct_target') === true && L(f, 'gaze_severed') === true && survived(f) && f.data?.died === false && f.data?.postmortem === false },
  { id: 'A20', tier: 5, title: '뿌리 없는 왕좌', hint: '왕관을 건넨 손이 거두어져도, 왕좌가 당신을 버리지 않는다.', revealed: '외부 후원자에게서 받은 권능의 종속 조건을 없애고도 독립적인 통치와 핵심 권능을 유지했다.', check: (_s, f) => f.type === 'incident_completed' && L(f, 'patron_dependency_severed') === true && L(f, 'sovereign_power_retained') === true },
  { id: 'A57', tier: 5, title: '네 번의 달이 바뀔 동안', hint: '인간의 몸으로 태어나, 네 종류의 재앙을 모두 맨손과 기술로 잠재웠다.', revealed: '인간 형태를 끝까지 지킨 채 규칙·포식·감염·공간 침식 네 계열의 상급 사건을 모두 넘겼다.', check: (s) => s.run.person.form_id === 'FORM_01_HUMAN' && s.run.person.cleared_high_threats_count >= 4 },
  { id: 'A58', tier: 5, title: '빚진 자 없는 도시', hint: '금고 안의 모든 연대보증서가 한줌의 재가 되어 새벽바람에 날아갔다.', revealed: '채무자로 태어나 자신의 빚을 넘어 사채 집행 조직 자체를 해체했다.', check: (s) => bg(s, 'BG_04_DEBTOR') && s.run.world.syndicate_dismantled },
  { id: 'A59', tier: 5, title: '문지기들의 서약', hint: '열차의 차장도, 항구의 사절도, 등지기도 모두 당신의 통행증을 인정한다.', revealed: '한 생애 안에 장례열차, 종이에 없는 바다, 마지막 뜰 세 곳의 출입 권한을 모두 얻었다.', check: (s) => s.run.person.capabilities.includes('CAP_08_TRAIN_RIGHT') && !!s.run.milestones.has_sea_chart && !!s.run.milestones.has_courtyard_mark },
  { id: 'A60', tier: 5, title: '두 번 산 사람의 증언', hint: '죽음이 끝이 아니었음을 증명하고, 산 자들의 세계에 마지막 선물을 남겼다.', revealed: '사후 지속 상태에서 생전의 동행자를 구하고 권역 재난까지 막아 낸 뒤 완결에 도달했다.', check: (s, f) => f.type === 'endpoint_committed' && s.run.person.postmortem_count === 1 && !!s.run.milestones.pm_saved_ally && !!s.run.milestones.pm_saved_sector },
  { id: 'A61', tier: 5, title: '백지 위의 통치자', hint: '계약서의 모든 줄을 지웠음에도, 심연의 사절들이 여전히 무릎을 꿇는다.', revealed: '기록 말소 능력과 심연 계약 해석을 결합해 대가 없는 일방적 주권 계약을 성립시켰다.', check: (s) => !!s.run.milestones.zero_cost_sovereign_contract },
  { id: 'A62', tier: 5, title: '만렙 공무원의 정시 퇴근', hint: '하늘이 갈라지고 바다가 넘쳐도, 오후 여섯 시 정각에 결재판을 덮고 집으로 걸어 나왔다.', revealed: '말단 민원실 공무원으로 시작해 총감에 오르고, 모든 재난을 진압한 뒤 무사히 임기를 마쳤다.', check: (s, f) => f.type === 'endpoint_committed' && bg(s, 'BG_05_CIVIL_JUNIOR') && pos(s) === 'POS_DIRECTOR_GENERAL' && !!s.run.milestones.multi_sector_command_completed },

  // Ⅵ 초월
  { id: 'A21', tier: 6, title: '죽음의 문밖', hint: '마지막 문을 넘은 뒤, 죽음은 더 이상 당신을 부를 이름을 찾지 못한다.', revealed: '승천 경로의 마지막 과업과 결단을 완수해 승천 종점을 확정했다.', check: (_s, f) => endpoint(f, 'ascension') },
  { id: 'A22', tier: 6, title: '영원히 켜진 등', hint: '마지막 등지기가 자리를 비워도, 그곳에 머무는 이들의 밤은 밝아야 한다.', revealed: '외부 유지자 없이 보호 규칙이 지속되는 성역을 완성하고 성역 종점을 확정했다.', check: (s, f) => endpoint(f, 'perpetual_domain') && (L(f, 'self_sustaining_sanctuary') === true || !!s.run.milestones.self_sustaining_sanctuary) },
  { id: 'A23', tier: 6, title: '왕을 기다리는 세월', hint: '새 왕을 기다리는 동안 달력이 먼저 낡는다. 왕좌의 주인은 끝내 바뀌지 않는다.', revealed: '일시적인 불사를 넘어 자기 유지 조건과 마지막 과업을 완성하고 불멸 종점을 확정했다.', check: (_s, f) => endpoint(f, 'immortality') && L(f, 'true_self_maintenance_completed') === true },
  { id: 'A24', tier: 6, title: '그곳에서 돌아온 자', hint: '최후의 기슭에는 귀환선이 없다. 남의 손을 빌리지 않고 돌아온 흔적을 남겨라.', revealed: '최후의 기슭 심부에 닿고, 외부 구조 없이 자신의 귀환 수단으로 죽지 않고 돌아왔다.', check: (_s, f) => inc(f, 'EVT_20_TRANSCENDENT_FINALE') && L(f, 'reached_final_shore_depth') === true && L(f, 'self_return_method') === true && f.data?.died === false && f.data?.postmortem === false },
  { id: 'A63', tier: 6, title: '맨손으로 건넌 심연', hint: '철책 안에서 빈손으로 태어난 아이가, 마침내 죽음조차 닿지 못하는 문밖에 섰다.', revealed: '가장 불리한 출생 세 가지 중 하나로 시작해 승천 종점에 도달했다.', check: (s, f) => endpoint(f, 'ascension') && HARDEST_BACKGROUNDS.includes(s.run.person.background_id) },
  { id: 'A64', tier: 6, title: '이름이 남는 동안', hint: '모든 기록이 지워진 자리에서도, 단 한 사람이 당신의 이름을 기억해 세계를 다시 열었다.', revealed: '존재 소멸 위기에서 동행자와의 깊은 유대를 닻으로 삼아 소멸을 뒤집고 영속·초월 종점에 도달했다.', check: (s, f) => endpoint(f, 'ascension', 'perpetual_domain', 'immortality') && L(f, 'reversed_existence_erasure') === true && Object.values(s.run.relationships).some((r) => r.trust >= 100) },
  { id: 'A65', tier: 6, title: '열 번째 법칙의 제정자', hint: '도시의 모든 괴담이 당신의 허락 없이는 단 한 줄의 수칙도 바꿀 수 없다.', revealed: '도시 전체의 괴담 발생 법칙을 영구히 고쳐 쓰고 초월 완결에 도달했다.', check: (s, f) => endpoint(f, 'perpetual_domain', 'ascension') && s.run.world.rewrote_city_anomaly_laws },
  { id: 'A66', tier: 6, title: '운명을 닫고 걸어 나온 독자', hint: '정해진 비극의 마지막 페이지를 찢어버리고, 누구도 읽은 적 없는 해피엔딩을 완성했다.', revealed: '이야기 밖의 독자로 시작해 동행자 전원 생존, 무사망으로 최후의 기슭을 주파하고 비사망 초월 종점에 도달했다.', check: (s, f) => endpoint(f, 'ascension', 'immortality', 'perpetual_domain') && bg(s, 'BG_14_OUTSIDE_READER') && Object.values(s.run.relationships).every((r) => !r.met || r.is_alive) && s.run.person.body_death_history.length === 0 && L(f, 'reached_final_shore_depth') === true },
];

export const achById = (id: string) => ACHIEVEMENTS.find((a) => a.id === id);

export const TIER_LABEL: Record<number, string> = { 1: 'Ⅰ 흔적', 2: 'Ⅱ 이변', 3: 'Ⅲ 위업', 4: 'Ⅳ 전설', 5: 'Ⅴ 신화', 6: 'Ⅵ 초월' };
