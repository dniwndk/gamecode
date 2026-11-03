# 발전 로드맵: 전투 프로토타입 → 하데스식 로그라이크

현재 프로토타입(assets/)에 있는 것: 3타 콤보(선딜/판정/후딜), 대시·무적·대시 캔슬·대시 공격, 입력 버퍼, 에임 보정, 개별 히트스톱, 방향성 셰이크, 넉백(히트스톱 뒤), 히트 플래시, 스파크, 합성 효과음, 추적형 적·허수아비, 토글/슬라이더.

아래는 그다음 단계. 각 단계는 "완료 기준"을 통과해야 다음으로 간다. 🔧 = 도움이 되는 스킬·MCP (references/skills-and-mcp.md).

## 1단계 — 전투 깊이 (1~2주)

| 요소 | 설계 메모 | 🔧 |
| --- | --- | --- |
| 특수 공격·캐스트 | 일반 공격과 다른 리듬: 선딜 길고 범위 넓음. 캐스트는 탄수 제한 + 회수 | `game-feel`, `pixelfx`(projectiles, impacts) |
| 무기 2~3종 | 무기는 AttackData 배열 + 이동 규칙의 묶음(ScriptableObject). 창=긴 사거리 찌르기, 쌍검=빠른 4타, 활=차지 | `unity-scriptableobjects` |
| 적 역할 분화 | 근접 돌진형 / 원거리 / 방패(정면 무효) / 자폭. 모두 "예고 → 공격 → 빈틈" 3박자 | `game-ai`(상태 기계·행동 트리) |
| 경직 저항·슈퍼아머 | 큰 적은 N타 누적 후에만 경직. 히트스톱은 유지하고 넉백만 줄임 | `game-feel` |
| 보스 1종 | 패턴 3개 + 체력 50%에서 페이즈 전환 | `game-ai`, `level-design` |

완료 기준: 무기마다 "같은 적을 다르게 잡는" 플레이가 나온다. 모든 적 공격은 예고를 보고 대시로 피할 수 있다.

## 2단계 — 로그라이크 루프 (2~3주)

| 요소 | 설계 메모 | 🔧 |
| --- | --- | --- |
| 방 단위 진행 | 방 클리어 → 보상 선택 → 다음 방(2~3갈래). 방 템플릿을 손으로 만들고 배치만 절차 생성 | `roguelike`, `procedural-gen`, `level-design`, `unity-tilemap-2d` |
| 축복(빌드) 시스템 | 슬롯(공격/특수/대시/캐스트)에 효과 부여 + 같은 계열 중첩 시 시너지. 데이터: 효과 ID·수치·희귀도 | `systemic-game-design-skill`, `unity-scriptableobjects` |
| 보상 선택 UI | 3택 카드, 희귀도 색 구분, 키보드·패드 포커스 | `game-ui-ux`, `game-ui-design` |
| 웨이브·조우 설계 | 방마다 예산(적 비용 합계)으로 조합 생성, 긴장·휴식 곡선 | `procedural-gen`(가중치 표), `level-design` |
| 런 종료·재시작 | 사망 → 허브 귀환 → 즉시 재출발 (재시작 5초 이내) | `save-systems` |

완료 기준: 한 판 15~20분, 같은 무기라도 축복 조합에 따라 플레이가 확실히 달라진다.

## 3단계 — 메타 진행과 허브 (2주)

| 요소 | 설계 메모 | 🔧 |
| --- | --- | --- |
| 영구 성장 | 런에서 얻은 재화로 소폭 강화. 난이도를 깎되 실력을 대체하지 않게 상한 | `systemic-game-design-skill` |
| 허브 | 상점·무기 선택·NPC 대화. 런마다 대사가 바뀌는 구조가 반복 플레이 동기 | `dialogue-systems`, GDC "Breathing Life into Greek Myth" |
| 난이도 조절 장치 | 런 시작 시 스스로 거는 제약(적 체력↑ 등) → 보상↑ | `roguelike` |
| 저장 | 메타 진행만 저장, 런 중 저장은 방 단위 | `save-systems` |

## 4단계 — 아트·사운드 파이프라인 (병행)

| 요소 | 설계 메모 | 🔧 |
| --- | --- | --- |
| 캐릭터 도트 | 4방향 + 좌우 반전으로 시작. 공격 애니는 선딜/판정/후딜 태그를 Aseprite에 달아 임포터가 이벤트로 변환 | `aseprite-ai-artist`, `aseprite-mcp`, `create-game-assets`, 2D Aseprite Importer |
| 8방향이 필요하면 | 3D → 도트 프리렌더 (하데스도 3D→2D 스프라이트 방식으로 알려짐) | `spritekiln` |
| 이펙트 | 타격·대시·축복별 색 정체성 | `pixelfx` (이 프로젝트의 spark-fx, duel-parry 결과물) |
| 효과음 | 타격음은 히트스톱 시작 프레임과 동기, 피치 랜덤 ±10% | `audio-design`, `sfxmint-mcp`, `elevenlabs-mcp` |
| 음악 | 전투 강도에 따라 레이어 추가(적응형) | `audio-design` |

## 5단계 — 다듬기·검증

| 요소 | 설계 메모 | 🔧 |
| --- | --- | --- |
| 피격 가독성 | 플레이어 피격 시 화면 테두리 빨강, 체력 낮을 때 심장박동 | `game-feel`, `game-accessibility-specialist` |
| 접근성 | 셰이크·플래시 세기 옵션, 자동 조준 옵션, 키 리바인드 | `game-accessibility-specialist`, `input-systems` |
| 성능 | 파티클·스파크 풀링(현재 프로토타입은 Instantiate/Destroy) | `performance-optimization` |
| 플레이테스트 | 손맛 토글 A/B 비교를 테스터에게 시킴 | `prototype-fast`, `self-check` |
| 에디터 자동화 | Claude가 씬 구성·수치 조정·플레이 모드 테스트 | Unity MCP (CoplayDev / IvanMurzak) |
