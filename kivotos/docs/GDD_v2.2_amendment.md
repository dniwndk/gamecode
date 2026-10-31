# 키보토스 택티컬 프론트라인 — v2.2 개정안 (경제·원작 설정·한탕 시너지·리플레이·대사)

작성일: 2026-10-29 · 기준 문서: 「정밀 게임 기획·구현 명세 v2.1」 · 규칙 버전: `ktfr-rules-2.2.0` · 콘텐츠 버전: `ba-content-2.2.0`

> **이 문서는 v2.1 위에 덮어 쓰는 개정안이다.** 여기 적힌 항목은 v2.1의 같은 항목을 대체하고, 적히지 않은 항목은 v2.1을 그대로 따른다. 충돌 시 해석 순서는 **v2.2 개정안 → v2.1 본문 → v2.1 부록** 이다.
>
> Claude Code에 넘길 때는 `docs/GDD_v2.1.md`와 이 파일(`docs/GDD_v2.2_amendment.md`)을 함께 두고, CLAUDE.md의 Authority 항목에 "v2.2 amendment overrides v2.1"을 한 줄 추가한다.

## 0. 바뀐 것 한눈에

| 영역 | v2.1 | v2.2 | 이유 |
|---|---|---|---|
| 경제 | 수입 5G 고정, XP 4/8/12/20/28/36/44, 전투 XP 2 | 수입 6/7/8G(장별), 연승·연패 보너스, XP 2/6/10/18/26/34/42, 전투 XP 3 | v2.1 수치로는 추천 빌드(레벨 8·2성)가 사실상 도달 불가 |
| 판매 | 구매가 전액 환급 | 2성 이상은 1G 감가 | 사고팔아도 손해가 없어 "다 사 두기"가 정답이 되던 문제 |
| 런 체력·패배 피해 | 100, 고정 8/10/12 (+정예 4/보스 8) | 80, 장 기본 6/9/12 + 남은 적 전방 1명당 2 (+정예 3/보스 6) | 14전 중 9패해도 살아남아 중간 전투의 긴장이 없던 문제 |
| 원작 설정 | 노조미·히카리 백귀야행 태그 등 | 소속·역할 태그 9건 수정, 이름 1건 수정 | 3장 참고 |
| 시너지 | 40종 | **41종** (`syn_jackpot` 「한탕」 신설) | 골드를 굴려서 크게 터뜨리는 빌드 |
| 전략 | 12종 | **13종** (`str_kaiser_loan` 「카이저 론」 신설) | 빚을 지고 한탕을 노리는 고위험 선택 |
| 리플레이 | 난이도 1개, 기록만 보존 | 위기 등급 0~10, 인연, 업무 일지, 주간 작전, 해금형 선택지 | 한 번 깨면 목표가 사라지던 문제 |
| 대사 | 없음 | 60명 × 7상황 대사, 원작 설정 근거 표 | 팬게임의 맛 |

정식 콘텐츠 범위는 **60유닛 · 41시너지 · 12장비 · 13전략 · 13적 · 15노드**로 바뀐다. 효과 부모 ID는 300개에서 **304개**로 늘어난다(한탕 3단계 + 카이저 론 1개).

## 1. 경제 개정

### 1.1 확정 초기값 (v2.1 4.1에서 바뀐 행만)

| 설정 | v2.1 | v2.2 |
|---|---:|---:|
| 시작 런 체력 | 100 | **80** |
| 기본 수입 | 5G | **1장 6G / 2장 7G / 3장 8G** |
| 승리 수입 | 1G | 1G (변경 없음) |
| 연승·연패 보너스 | 없음 | **2~3연속 +1G, 4~5연속 +2G, 6연속 이상 +3G** |
| 전투 종료 XP | 2 | **3** |
| 이자 | `min(5, floor(battleStartGold/10))` | 변경 없음 (한탕 시너지가 따로 바꾼다) |

- 연속 기록은 승리 연속과 패배 연속을 따로 세고, 한 정산에는 둘 중 현재 이어지는 쪽 하나만 적용한다. 무승부는 없다(v2.1 4.3의 판정 그대로). 연속 기록은 장이 바뀌어도 이어진다.
- 연패 보너스가 있으므로 "일부러 지면서 돈 모으기"가 가능해진다. 런 체력 80과 3장 패배 피해가 그 대가다.

### 1.2 레벨별 XP (v2.1 5.1의 "다음 XP" 열만 교체)

| 레벨 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 다음 XP (v2.1) | 4 | 8 | 12 | 20 | 28 | 36 | 44 | — |
| 다음 XP (v2.2) | **2** | **6** | **10** | **18** | **26** | **34** | **42** | — |

상점 확률표는 바꾸지 않는다. 레벨 8 누적 XP는 72 → 62, 레벨 10은 152 → 138이다.

### 1.3 판매 (v2.1 5.3 교체)

판매가 = `cost×3^(star-1) − (star≥2 ? 1 : 0)`. 1성은 전액 환급, 2성·3성은 1G를 뺀다. 합성 재료로 쓰인 복사본은 판매가 아니므로 감가와 무관하다. 판매 확인창에 감가액을 따로 보여 준다.

### 1.4 승패 피해 (v2.1 4.3의 "일반 피해" 줄 교체)

`패배 피해 = 장 기본(6/9/12) + 2×(전투 종료 시 살아 있는 적 전방 수) + (정예 3 | 보스 6)`

- 예: 2장 일반에서 적 전방 2명이 남으면 9+4 = 13. 1장 보스에서 보스 혼자 남으면 6+2+6 = 14.
- 시간 초과(1000AV) 패배도 같은 식이다. 남은 적이 많을수록 아프므로 "거의 다 이긴 패배"와 "완패"가 구분된다.
- 최종 보스 패배는 v2.1처럼 체력과 무관하게 즉시 런 실패다.
- 현실적인 피해(1장 10, 2장 13, 3장 16)로 세면 최종전 전까지 **6패까지 버티고 7패째에 끝난다.** v2.1은 9패까지 버텼다.

### 1.5 검산 결과

v2.1 14.3의 정식 시뮬레이션을 대신하지 않는다. 경제 수치만 비교하려고 단순한 봇으로 돌린 결과다.

- 봇 규칙: 레벨 계획 3→8(전투 11 전후 도달)을 따르고, 남는 돈은 이자 구간(10~30G)을 지키며 리롤한다. 목표 8명만 산다. 승률은 매 전투 60%로 고정한다. 시드 1,000개.
- 목표 편성: F.01(1~4코스트 8명을 전부 2성)과 F.06B(5코스트 키사키·4코스트 아코는 1성, 나머지 2성).

| 판본 | 편성 | 레벨 8 도달 (평균 전투 번호) | 전투 13 시점 2성 수 | 런 종료까지 목표 달성 수 |
|---|---|---:|---:|---:|
| v2.1 | F.01 아비도스 | 11.8 | 2.6 / 8 | 3.4 / 8 |
| v2.1 | F.06B 산해경 | 11.5 | 2.5 / 8 | 4.3 / 8 |
| **v2.2** | F.01 아비도스 | **11.0** | **6.6 / 8** | **7.2 / 8** |
| **v2.2** | F.06B 산해경 | **11.0** | **5.4 / 8** | **7.5 / 8** |

- 해석: v2.2에서는 잘 운영하면 3장 중반에 "레벨 8, 대부분 2성"이 완성되고, 최종 보스 직전에 목표를 거의 채운다. 그래도 4~5코스트 2성은 여전히 사치다. 의도한 설계다.
- 한계: 봇은 실제 전투 결과를 반영하지 않는다(승률 60% 고정). 추천 슬롯 추첨은 근사했고, 한탕 시너지와 장비 보상은 넣지 않았다. M6 시드 배치 실험에서 다시 확인해야 한다.
- 시뮬레이션 코드는 `scripts/econ-sketch.py`로 저장소에 함께 두고, 정식 headless 시뮬레이터가 생기면 지운다.

### 1.6 추천 빌드 목표의 기준 변경

v2.1 부록 F의 "기본 완성 목표는 2성 중심"을 다음으로 바꾼다. **1~3코스트 2성, 4코스트 1~2성, 5코스트 1성.** 5코스트 3성과 4코스트 3성은 행운 보너스로 보고 밸런스 기준선에 넣지 않는다.

## 2. 원작 설정 검토와 수정

v2.1은 "모든 원작 설정의 고증 검증은 수행하지 않았다"(1.1)고 적었다. 이번에 60명의 소속·동아리·역할을 검색으로 대조했다. 주요 팬 위키(bluearchive.wiki, Fandom)는 자동 접근이 막혀 있어서 검색 엔진 요약과 Moegirl·TV Tropes·Pixiv 백과 등 2차 자료로 확인했다. 아래 "확신도"는 그 한계를 반영한다.

### 2.1 수정한 항목

| 대상 | v2.1 | 문제 | v2.2 수정 | 확신도 |
|---|---|---|---|---|
| `u_nozomi`, `u_hikari` | `syn_hyakkiyako` 포함 | 두 사람은 하이랜더 철도학원 CCC(중앙관제센터) 간부인 쌍둥이다. 백귀야행 소속이 아니다 | `syn_hyakkiyako` 제거. 하이랜더 시너지만 유지 | 높음 |
| `u_kotama` | 이름 "오타마 코타마" | 원작 성은 오토세(音瀬)다. 밀레니엄 베리타스 소속 | 이름을 **오토세 코타마**로 수정 | 높음 |
| `u_kotama` | `syn_commander` | 베리타스의 도청·통신 담당이지 지휘관이 아니다 | `syn_commander` → `syn_electro` | 중간 |
| `u_saki` | `syn_commander` | RABBIT 소대의 지휘관은 미야코(RABBIT1)다. 사키는 대원이다 | `syn_commander` 제거 | 높음 |
| `u_ako` | `syn_medic` | 아코는 선도부 행정관(히나의 보좌관)으로, 치유가가 아니라 지휘·보좌형이다 | `syn_medic` 제거 (`syn_commander`·`syn_tactical_support` 유지) | 중간 |
| `u_hiyori` | `syn_demolition` | 아리우스 스쿼드의 대물 저격수 역할이다 | `syn_demolition` → `syn_sniper` | 중간 |
| `u_aru` | `syn_demolition` | 태그 7개로 과다. 저격(라이플)이 정체성에 더 가깝다 | `syn_demolition` 제거, `syn_jackpot` 추가 | 중간 |
| `u_ayane`, `u_rio` | `syn_aegis` | 한탕 태그를 받으면서 태그가 6~7개로 늘어나 정리 | `syn_aegis` 제거, `syn_jackpot` 추가 | 설계 판단 |
| `syn_outlaw` 표시명 | "무법자" | 구성원 와카모·아키라·아케미는 원작의 「칠수인(七囚人)」, 라부는 헬멧단 두목이다 | ID는 유지하고 표시명을 **「무법자 — 칠수인·헬멧단」**으로, 툴팁에 소속 설명 추가 | 높음 |

### 2.2 확인했지만 그대로 두는 항목

- `u_akemi`(쿠리하마 아케미), `u_akira`(키요스미 아키라), `u_rabu`(코마카제 라부)는 원작에서 **플레이 불가 NPC**다. 아케미는 칠수인 중 한 명인 전 스케반 두목이고, 아키라는 칠수인의 괴도(와일드헌트 예술학원에 "미리아"라는 이름으로 숨어 있다고 알려짐)이며, 라부는 헬멧단 한 무리의 두목이다. 팬게임에서 NPC를 학생 유닛으로 쓰는 것은 문제가 없지만, 설정 정보가 적어 대사 근거가 다른 학생보다 약하다. 도감에 "원작 NPC" 표시를 단다.
- 호시노와 무장 호시노(Armed ver.)는 원작에서도 별개 학생 카드로 존재한다(2025년 1월 추가). v2.1의 "동시 편성 가능" 결정을 유지한다.
- 그 밖의 학교·동아리 배치(아비도스 대책위원회, 흥신소68, 게임개발부, C&C, 베리타스, 세미나, 정의실현부, 구호기사단, 보충수업부, 인법연구부, 축제운영부, 수련부, 매화원, 현룡문, 붉은겨울 사무국·지식해방전선·227호 특별반, 발키리 공안국, SRT RABBIT 소대, 아리우스 스쿼드)는 원작과 맞는다.
- 전방/후방, 장갑 계열, 공격 계열 태그는 v2.1 1.2의 A20 결정대로 "이 팬게임의 전술 분류"다. 원작의 스트라이커/스페셜이나 경장갑/중장갑 분류와 맞추지 않는다.

### 2.3 태그 변경이 만든 연쇄 효과

- `syn_hyakkiyako` 구성원은 7명 → 5명(미치루·츠바키·이즈나·시즈코·와카모). 최고 단계 5는 여전히 합법이다(전방 4 + 후방 시즈코).
- `syn_aegis` 구성원은 6명 → 4명(유우카·호시노·시즈코·키사키). 4단계는 네 명을 모두 써야만 된다.
- `syn_commander` 구성원은 12명 → 10명. F.06A의 커맨더는 4단계 → 2단계로 내려간다(부록 재집계 참고).
- `syn_demolition` 구성원은 7명 → 5명. 4단계는 여전히 합법이다.

## 3. 신규 시너지 「한탕」 `syn_jackpot`

### 3.1 콘셉트

골드를 쥐고 있을수록 강해지고, 모아 둔 돈이 한 번에 터지는 경제 시너지다. 구성원은 원작에서 돈과 얽힌 학생들로 골랐다.

| 구성원 | 코스트·구역 | 원작 근거 (요약) |
|---|---|---|
| 하야세 유우카 | 2 · 전방 | 밀레니엄 세미나의 회계. 영수증과 계산에 엄격하다 |
| 스나오오카미 시로코 | 2 · 전방 | 아비도스 대책위원회. 빚을 갚자며 은행 털이를 진지하게 제안하는 것으로 유명하다 |
| 오쿠소라 아야네 | 2 · 후방 | 대책위원회의 살림과 빚 문제를 챙기는 1학년 |
| 이자요이 노노미 | 3 · 전방 | 부잣집 아가씨. 골드 카드로 모든 것을 해결하려 한다 |
| 리쿠하치마 아루 | 4 · 전방 | 흥신소68 사장. 늘 빈털터리지만 한탕을 꿈꾼다 |
| 츠카츠키 리오 | 5 · 후방 | 밀레니엄 세미나 회장. 비밀 프로젝트에 막대한 예산을 쏟았다 |
| 키요스미 아키라 | 5 · 전방 | 칠수인의 괴도. 예술품과 보물을 훔친다 |

집계: `deployed_all`, 단계 **2 / 4 / 6**, 최대 합법 집계 6(전방 4 + 후방 2). 6단계는 5코스트 리오나 아키라 중 한 명이 꼭 필요하다. 그래서 자연스럽게 3장 빌드가 된다.

### 3.2 단계별 효과

| 단계 | effectId | 정산(런) 효과 | 전투 효과 |
|---|---|---|---|
| 2 「용돈 벌이」 | `eff_syn_jackpot_2` | 이자 상한 5 → **7** | 구성원이 적을 처치할 때마다 **현상금 +1G** (전투당 최대 3G) |
| 4 「복리 금고」 | `eff_syn_jackpot_4` | 이자 계단 10G → **8G**, 상한 **9**. 승리 정산마다 받은 이자와 같은 금액을 **금고에 적립** | 구성원 ATK +1% / 전투 시작 골드 3G (최대 +20%). 현상금 최대 5G |
| 6 「잭팟」 | `eff_syn_jackpot_6` | 이자 계단 **6G**, 상한 **12**. 승리 정산마다 받은 이자 ×1.5(내림)를 금고에 적립 | 구성원 ATK +1% / 전투 시작 골드 2G (최대 +35%). 구성원 필살기 해소 시 **「돈다발 폭격」**: 적 전방 전체에 `시전자 ATK × min(전투 시작 골드, 60) × 1.5%` true 피해 (최대 90%), 개인 차례당 1회. 현상금 최대 8G |

- 최고 단계 하나만 적용한다(v2.1 6장 규칙). 상위 단계의 표에 적힌 수치가 전부다.
- 전투 효과의 "전투 시작 골드"는 `battleInput.startGold`로 고정한다. 전투 중에는 골드가 바뀌지 않으므로 결정적이다.
- 패배 정산에서는 금고에 적립하지 않는다. 이자는 정상 지급한다.

### 3.3 금고 털기

- 금고는 런 상태(`RunState.vault`)에 있는 별도 정수다. 골드가 아니므로 이자 계산과 레벨업에 쓸 수 없다.
- **털기 조건:** 준비 단계에서 「금고 털기」 명령을 장당 1회 쓸 수 있다. 직전 전투의 한탕 단계가 4 이상이어야 한다. 장 보스 정산 때 남아 있는 금고는 단계와 무관하게 자동으로 턴다(최종 보스 정산은 제외: 쓸 곳이 없다).
- **지급액:** `min(100, 금고)`G를 즉시 골드로 받는다. 직전 전투가 6단계였다면 reward RNG로 25% 확률 **「대박」**이 떠서 지급액이 2배가 된다(상한 150G). 털고 나면 금고는 0이다.
- 4단계 미만으로 내려가도 쌓인 금고는 사라지지 않고, 다시 4단계가 되면 털 수 있다.
- 연출: 금고 게이지가 준비 화면 상단 골드 옆에 보인다. 털기를 누르면 결과를 먼저 계산해 저장하고, 그다음 동전 비·금고 문이 열리는 연출을 재생한다(새로고침으로 결과를 바꿀 수 없다).

### 3.4 기대 수치 (가정과 함께)

- 3장에서 6단계를 유지하며 60G를 쥐고 있다면 이자는 10G(일반 5G)다. 승리 3번이면 금고가 약 45G 쌓이고, 털면 45G, 대박이면 90G다. 3장 전체에서 일반 빌드보다 대략 **60~100G**를 더 번다.
- 대가: 전방 4칸 중 3~4칸을 한탕 구성원이 차지하고, 골드를 쥐고 있어야 전투 효과가 커서 레벨업·리롤을 미루게 된다.
- 합격 기준(M6): 한탕 6단계 빌드의 런당 추가 골드가 60~120G 범위를 벗어나거나 클리어율이 다른 빌드 평균보다 10%p 이상 높으면 이자 계단과 금고 적립률부터 조정한다.

### 3.5 엔진 계약 추가

- **정산 수정자:** 런 reducer에 `SettlementModifier {interestStep, interestCap, vaultRateBps, bountyPerKill, bountyCap}`을 추가한다. 전투 시작 스냅샷의 한탕 단계에서 만든다. 전투 엔진이 정산을 직접 바꾸지 않는다.
- **현상금 집계:** 결과 로그의 `unit_defeated` 중 처치자 원출처가 아군 한탕 구성원이고 대상이 적인 것만 센다. 후방 구성원의 처치도 포함한다.
- **금액 기준 추가:** v2.1 9.5의 `amount` 기준에 `battleStartGold`를 추가한다. 한탕 효과에서만 허용하며 다른 효과가 쓰면 콘텐츠 검증 오류다.
- **새 명령:** `CASH_OUT_VAULT {commandId, expectedRevision}`. 상태·RNG·골드를 한 저장 거래로 바꾼다. v2.1 12.2의 commandId 멱등 규칙을 따른다.
- **UI:** 이자 미리보기는 한탕 단계를 반영해 "다음 이자 +7G (한탕 4)"처럼 보여 준다.

## 4. 신규 전략 「카이저 론」 `str_kaiser_loan`

| 항목 | 내용 |
|---|---|
| 이름 | **카이저 론 — 아비도스식 상환 계약** |
| 제안 조건 | 1~2장 시작 (조건 없음). 범용 대안 아님 |
| effect | `eff_str_kaiser_loan` |
| 효과 | 선택 즉시 **+25G**. 이후 정산 5번 동안 매번 **6G 자동 상환**(총 30G). 상환은 그 정산의 수입을 더한 뒤 차감한다 |
| 부족할 때 | 상환할 골드가 모자라면 가진 만큼 내고, 부족분 1G당 런 체력 1을 잃는다 |
| 완납 보상 | 5번 모두 상환하면 「완납 증명서」: 남은 런 동안 이자 상한 +1 |
| 약점 | 초반 이자 구간을 깎아 먹는다. 연패 중에 고르면 체력으로 갚게 된다 |
| 원작 연결 | 아비도스가 카이저 계열에 진 막대한 빚을 갚아 가는 이야기에서 따왔다 |

전략은 장 시작에 하나만 고르므로 v2.1의 "전략 획득 각 장 시작 1회" 규칙은 그대로다. 상환 일정은 `RunState.loans[]`에 남은 횟수·금액으로 저장한다.

## 5. 유닛 마스터 v2.2 (태그만 바뀜)

전투 스탯·코스트·허용 구역·능력 연결은 v2.1 부록 A와 같다. 아래 표는 태그 전체와 v2.1 대비 변경을 함께 보여 준다. 이 표가 v2.1 부록 A의 태그 열을 대체한다.

| ID | 이름 | 코스트 | 허용 구역 | 태그 (v2.2) | v2.1 대비 |
|---|---|---:|---|---|---|
| `u_serika` | 쿠로미 세리카 | 1 | front_only | syn_abydos, syn_light_armor, syn_assault | — |
| `u_suzumi` | 모리즈키 스즈미 | 1 | dual | syn_trinity, syn_light_armor, syn_tactical_support, syn_electro | — |
| `u_haruka` | 이구사 하루카 | 1 | front_only | syn_gehenna, syn_problem_solver, syn_heavy_armor, syn_vanguard, syn_breacher | — |
| `u_kotama` | 오토세 코타마 | 1 | rear_only | syn_millennium, syn_light_armor, syn_tactical_support, syn_electro | 이름 오타마 코타마→오토세 코타마; +syn_electro; −syn_commander |
| `u_serina` | 스미 세리나 | 1 | rear_only | syn_trinity, syn_light_armor, syn_medic | — |
| `u_asuna` | 이치노세 아스나 | 1 | front_only | syn_millennium, syn_cc, syn_special_armor, syn_assault | — |
| `u_junko` | 아카시 준코 | 1 | front_only | syn_gehenna, syn_light_armor, syn_assault | — |
| `u_michiru` | 치도리 미치루 | 1 | front_only | syn_hyakkiyako, syn_light_armor, syn_breacher, syn_demolition | — |
| `u_kokona` | 스노하라 코코나 | 1 | dual | syn_shanhaijing, syn_special_armor, syn_medic, syn_tactical_support | — |
| `u_nodoka` | 아마미 노도카 | 1 | rear_only | syn_red_winter, syn_light_armor, syn_tactical_support, syn_sniper | — |
| `u_fubuki` | 네무가키 후부키 | 1 | front_only | syn_valkyrie, syn_heavy_armor, syn_sniper, syn_electro | — |
| `u_rabu` | 코마카제 라부 | 1 | front_only | syn_outlaw, syn_elastic_armor, syn_demolition, syn_assault | — |
| `u_shiroko` | 스나오오카미 시로코 | 2 | front_only | syn_abydos, syn_light_armor, syn_assault, syn_jackpot | +syn_jackpot |
| `u_yuuka` | 하야세 유우카 | 2 | front_only | syn_millennium, syn_heavy_armor, syn_vanguard, syn_aegis, syn_jackpot | +syn_jackpot |
| `u_tsubaki` | 카스가 츠바키 | 2 | front_only | syn_hyakkiyako, syn_special_armor, syn_vanguard | — |
| `u_momoi` | 사이바 모모이 | 2 | dual | syn_millennium, syn_light_armor, syn_assault | — |
| `u_fuuka` | 아이키요 후우카 | 2 | rear_only | syn_gehenna, syn_heavy_armor, syn_medic | — |
| `u_hare` | 오마가리 하레 | 2 | rear_only | syn_millennium, syn_light_armor, syn_tactical_support, syn_electro | — |
| `u_ayane` | 오쿠소라 아야네 | 2 | rear_only | syn_abydos, syn_light_armor, syn_medic, syn_tactical_support, syn_jackpot | +syn_jackpot; −syn_aegis |
| `u_hasumi` | 하네카와 하스미 | 2 | front_only | syn_trinity, syn_heavy_armor, syn_striker, syn_sniper | — |
| `u_kayoko` | 오니카타 카요코 | 2 | dual | syn_gehenna, syn_problem_solver, syn_heavy_armor, syn_electro, syn_tactical_support | — |
| `u_karin` | 카쿠다테 카린 | 2 | rear_only | syn_millennium, syn_cc, syn_heavy_armor, syn_sniper, syn_striker | — |
| `u_shun` | 스노하라 슌 | 2 | front_only | syn_shanhaijing, syn_light_armor, syn_sniper, syn_commander | — |
| `u_momiji` | 아키이즈미 모미지 | 2 | front_only | syn_red_winter, syn_elastic_armor, syn_demolition, syn_striker | — |
| `u_kirino` | 나카츠카사 키리노 | 2 | front_only | syn_valkyrie, syn_special_armor, syn_vanguard, syn_electro | — |
| `u_nozomi` | 타치바나 노조미 | 2 | front_only | syn_highlander, syn_elastic_armor, syn_assault, syn_breacher | −syn_hyakkiyako |
| `u_nonomi` | 이자요이 노노미 | 3 | front_only | syn_abydos, syn_light_armor, syn_assault, syn_jackpot | +syn_jackpot |
| `u_iori` | 시로미 이오리 | 3 | front_only | syn_gehenna, syn_heavy_armor, syn_striker, syn_sniper | — |
| `u_mutsuki` | 아사기 무츠키 | 3 | dual | syn_gehenna, syn_problem_solver, syn_light_armor, syn_assault, syn_demolition | — |
| `u_azusa` | 시라스 아즈사 | 3 | front_only | syn_trinity, syn_arius, syn_light_armor, syn_striker | — |
| `u_koharu` | 시모에 코하루 | 3 | dual | syn_trinity, syn_heavy_armor, syn_medic | — |
| `u_izuna` | 쿠다 이즈나 | 3 | front_only | syn_hyakkiyako, syn_light_armor, syn_assault, syn_mystic_arts | — |
| `u_shizuko` | 카와와 시즈코 | 3 | rear_only | syn_hyakkiyako, syn_special_armor, syn_tactical_support, syn_aegis | — |
| `u_toki` | 아스마 토키 | 3 | front_only | syn_millennium, syn_cc, syn_elastic_armor, syn_striker, syn_breacher | — |
| `u_mina` | 코노에 미나 | 3 | front_only | syn_shanhaijing, syn_light_armor, syn_electro, syn_assault | — |
| `u_marina` | 이케쿠라 마리나 | 3 | front_only | syn_red_winter, syn_light_armor, syn_vanguard, syn_breacher | — |
| `u_atsuko` | 하카리 아츠코 | 3 | front_only | syn_arius, syn_special_armor, syn_vanguard, syn_medic | — |
| `u_hiyori` | 츠치나가 히요리 | 3 | rear_only | syn_arius, syn_light_armor, syn_tactical_support, syn_sniper | +syn_sniper; −syn_demolition |
| `u_moe` | 카제쿠라 모에 | 3 | rear_only | syn_srt, syn_light_armor, syn_demolition, syn_tactical_support | — |
| `u_saki` | 소라이 사키 | 3 | dual | syn_srt, syn_heavy_armor, syn_assault | −syn_commander |
| `u_hoshino` | 타카나시 호시노 | 4 | front_only | syn_abydos, syn_heavy_armor, syn_vanguard, syn_breacher, syn_aegis, syn_unique_dawn_horus | — |
| `u_aru` | 리쿠하치마 아루 | 4 | front_only | syn_gehenna, syn_problem_solver, syn_light_armor, syn_striker, syn_sniper, syn_unique_outlaw_boss, syn_jackpot | +syn_jackpot; −syn_demolition |
| `u_ako` | 아마우 아코 | 4 | rear_only | syn_gehenna, syn_light_armor, syn_tactical_support, syn_commander | −syn_medic |
| `u_neru` | 미카모 네루 | 4 | front_only | syn_millennium, syn_cc, syn_light_armor, syn_assault, syn_breacher | — |
| `u_aris` | 텐도 아리스 | 4 | dual | syn_millennium, syn_special_armor, syn_striker, syn_mystic_arts | — |
| `u_cherino` | 렌카와 체리노 | 4 | front_only | syn_red_winter, syn_light_armor, syn_commander, syn_assault, syn_unique_red_mustache | — |
| `u_miyu` | 카스미자와 미유 | 4 | dual | syn_srt, syn_light_armor, syn_sniper, syn_striker | — |
| `u_miyako` | 츠키유키 미야코 | 4 | front_only | syn_srt, syn_heavy_armor, syn_vanguard, syn_electro, syn_commander | — |
| `u_kanna` | 오가타 칸나 | 4 | front_only | syn_valkyrie, syn_heavy_armor, syn_commander, syn_assault | — |
| `u_akemi` | 쿠리하마 아케미 | 4 | front_only | syn_outlaw, syn_elastic_armor, syn_vanguard, syn_assault, syn_breacher | — |
| `u_hina` | 소라사키 히나 | 5 | front_only | syn_gehenna, syn_heavy_armor, syn_assault, syn_commander, syn_unique_head_prefect | — |
| `u_mika` | 미소노 미카 | 5 | front_only | syn_trinity, syn_light_armor, syn_striker, syn_vanguard, syn_mystic_arts, syn_unique_princess_stars | — |
| `u_himari` | 아케보시 히마리 | 5 | rear_only | syn_millennium, syn_light_armor, syn_tactical_support, syn_commander, syn_unique_super_genius | — |
| `u_wakamo` | 코사카 와카모 | 5 | front_only | syn_hyakkiyako, syn_outlaw, syn_special_armor, syn_striker, syn_mystic_arts, syn_unique_calamity_fox | — |
| `u_rio` | 츠카츠키 리오 | 5 | rear_only | syn_millennium, syn_heavy_armor, syn_tactical_support, syn_commander, syn_unique_big_sister, syn_jackpot | +syn_jackpot; −syn_aegis |
| `u_kisaki` | 류우게 키사키 | 5 | dual | syn_shanhaijing, syn_elastic_armor, syn_commander, syn_tactical_support, syn_aegis, syn_unique_black_monarch | — |
| `u_saori` | 죠마에 사오리 | 5 | front_only | syn_arius, syn_light_armor, syn_striker, syn_assault, syn_commander, syn_unique_vanitas_leader | — |
| `u_hikari` | 타치바나 히카리 | 5 | front_only | syn_highlander, syn_elastic_armor, syn_mystic_arts, syn_tactical_support, syn_breacher | −syn_hyakkiyako |
| `u_akira` | 키요스미 아키라 | 5 | front_only | syn_outlaw, syn_special_armor, syn_mystic_arts, syn_electro, syn_assault, syn_jackpot | +syn_jackpot |
| `u_hoshino_armed` | 타카나시 호시노 (무장) | 5 | front_only | syn_abydos, syn_special_armor, syn_vanguard, syn_striker, syn_breacher, syn_mystic_arts | — |

## 6. 시너지 41종 구성원·도달 가능성 재집계

태그 변경을 반영해 자동으로 다시 셌다. 최대 합법 집계는 v2.1 6장의 `min(N,10,4+R+D,6+F+D)` 식(뱅가드는 전방만)이다. **41종 모두 최고 단계가 합법**이다. 단계 효과 문장과 effectId는 한탕을 빼면 v2.1 부록 B와 같다.

| 시너지 ID | 요구 단계 | 전방전용/후방전용/겸용 | 최대 합법 집계 | 구성원 |
|---|---|---|---:|---|
| `syn_abydos` | 2/4/5 | 5/1/0 | 5 | serika, shiroko, ayane, nonomi, hoshino, hoshino_armed |
| `syn_gehenna` | 2/4/6 | 5/2/2 | 8 | haruka, junko, fuuka, kayoko, iori, mutsuki, aru, ako, hina |
| `syn_millennium` | 2/4/6 | 4/5/2 | 10 | kotama, asuna, yuuka, momoi, hare, karin, toki, neru, aris, himari, rio |
| `syn_trinity` | 2/4/6 | 3/1/2 | 6 | suzumi, serina, hasumi, azusa, koharu, mika |
| `syn_hyakkiyako` | 2/4/5 | 4/1/0 | 5 | michiru, tsubaki, izuna, shizuko, wakamo |
| `syn_shanhaijing` | 2/4 | 2/0/2 | 4 | kokona, shun, mina, kisaki |
| `syn_red_winter` | 2/4 | 3/1/0 | 4 | nodoka, momiji, marina, cherino |
| `syn_valkyrie` | 2/3 | 3/0/0 | 3 | fubuki, kirino, kanna |
| `syn_srt` | 2/4 | 1/1/2 | 4 | moe, saki, miyu, miyako |
| `syn_arius` | 2/4 | 3/1/0 | 4 | azusa, atsuko, hiyori, saori |
| `syn_problem_solver` | 2/4 | 2/0/2 | 4 | haruka, kayoko, mutsuki, aru |
| `syn_cc` | 2/4 | 3/1/0 | 4 | asuna, karin, toki, neru |
| `syn_highlander` | 1/2 | 2/0/0 | 2 | nozomi, hikari |
| `syn_outlaw` | 2/4 | 4/0/0 | 4 | rabu, akemi, wakamo, akira |
| `syn_vanguard` | 2/4 | 11/0/0 | 4 | haruka, yuuka, tsubaki, kirino, marina, atsuko, hoshino, miyako, akemi, mika, hoshino_armed |
| `syn_striker` | 2/4/6 | 10/1/2 | 7 | hasumi, karin, momiji, iori, azusa, toki, aru, aris, miyu, mika, wakamo, saori, hoshino_armed |
| `syn_assault` | 2/4/6 | 16/0/3 | 7 | serika, asuna, junko, rabu, shiroko, momoi, nozomi, nonomi, mutsuki, izuna, mina, saki, neru, cherino, kanna, akemi, hina, saori, akira |
| `syn_breacher` | 2/4 | 10/0/0 | 4 | haruka, michiru, nozomi, toki, marina, hoshino, neru, akemi, hikari, hoshino_armed |
| `syn_sniper` | 2/4 | 5/3/1 | 8 | nodoka, fubuki, hasumi, karin, shun, iori, hiyori, aru, miyu |
| `syn_demolition` | 2/4 | 3/1/1 | 5 | michiru, rabu, momiji, mutsuki, moe |
| `syn_medic` | 2/4 | 1/3/2 | 6 | serina, kokona, fuuka, ayane, koharu, atsuko |
| `syn_tactical_support` | 2/4/6 | 1/10/4 | 10 | suzumi, kotama, kokona, nodoka, hare, ayane, kayoko, shizuko, hiyori, moe, ako, himari, rio, kisaki, hikari |
| `syn_aegis` | 2/4 | 2/1/1 | 4 | yuuka, shizuko, hoshino, kisaki |
| `syn_electro` | 2/4 | 5/2/2 | 8 | suzumi, kotama, fubuki, hare, kayoko, kirino, mina, miyako, akira |
| `syn_commander` | 2/4 | 6/3/1 | 8 | shun, ako, cherino, miyako, kanna, hina, himari, rio, kisaki, saori |
| `syn_mystic_arts` | 2/4 | 6/0/1 | 5 | izuna, aris, mika, wakamo, hikari, akira, hoshino_armed |
| `syn_light_armor` | 3/5/7 | 15/9/4 | 10 | serika, suzumi, kotama, serina, junko, michiru, nodoka, shiroko, momoi, hare, ayane, shun, nonomi, mutsuki, azusa, izuna, mina, marina, hiyori, moe, aru, ako, neru, cherino, miyu, mika, himari, saori |
| `syn_heavy_armor` | 2/4/6 | 9/3/3 | 10 | haruka, fubuki, yuuka, fuuka, hasumi, kayoko, karin, iori, koharu, saki, hoshino, miyako, kanna, hina, rio |
| `syn_special_armor` | 2/4 | 7/1/2 | 7 | asuna, kokona, tsubaki, kirino, shizuko, atsuko, aris, wakamo, akira, hoshino_armed |
| `syn_elastic_armor` | 2/4 | 6/0/1 | 5 | rabu, momiji, nozomi, toki, akemi, kisaki, hikari |
| `syn_unique_head_prefect` | 1 | 1/0/0 | 1 | hina |
| `syn_unique_princess_stars` | 1 | 1/0/0 | 1 | mika |
| `syn_unique_super_genius` | 1 | 0/1/0 | 1 | himari |
| `syn_unique_calamity_fox` | 1 | 1/0/0 | 1 | wakamo |
| `syn_unique_big_sister` | 1 | 0/1/0 | 1 | rio |
| `syn_unique_black_monarch` | 1 | 0/0/1 | 1 | kisaki |
| `syn_unique_vanitas_leader` | 1 | 1/0/0 | 1 | saori |
| `syn_unique_dawn_horus` | 1 | 1/0/0 | 1 | hoshino |
| `syn_unique_outlaw_boss` | 1 | 1/0/0 | 1 | aru |
| `syn_unique_red_mustache` | 1 | 1/0/0 | 1 | cherino |
| `syn_jackpot` | 2/4/6 | 5/2/0 | 6 | shiroko, yuuka, ayane, nonomi, aru, rio, akira |

## 7. 추천 빌드 재집계 (v2.1 부록 F 대체)

v2.1의 11개 편성을 그대로 두고 활성 시너지를 다시 셌다. 한탕 2개와 하이랜더 1개를 새로 넣었다. 모두 레벨 8 편성이다. 목표 성급은 1.6의 새 기준(1~3코 2성, 4코 1~2성, 5코 1성)을 따른다.

- **F.01 아비도스 연사** — 전방 hoshino, shiroko, nonomi, serika / 후방 ayane, momoi, kotama, fuuka
  - 실제 활성: syn_abydos 5명→5단계; syn_assault 4명→4단계; syn_heavy_armor 2명→2단계; syn_jackpot 3명→2단계; syn_light_armor 6명→5단계; syn_medic 2명→2단계; syn_millennium 2명→2단계; syn_tactical_support 2명→2단계; syn_unique_dawn_horus 1명→1단계
- **F.02 게헨나 폭발** — 전방 haruka, yuuka, iori, aru / 후방 fuuka, mutsuki, ako, serina
  - 실제 활성: syn_gehenna 6명→6단계; syn_heavy_armor 4명→4단계; syn_jackpot 2명→2단계; syn_light_armor 4명→3단계; syn_medic 2명→2단계; syn_problem_solver 3명→2단계; syn_sniper 2명→2단계; syn_striker 2명→2단계; syn_unique_outlaw_boss 1명→1단계; syn_vanguard 2명→2단계
- **F.03 밀레니엄 보호막·레일건** — 전방 yuuka, tsubaki, neru, aris / 후방 kotama, hare, momoi, shizuko
  - 실제 활성: syn_aegis 2명→2단계; syn_assault 2명→2단계; syn_electro 2명→2단계; syn_hyakkiyako 2명→2단계; syn_light_armor 4명→3단계; syn_millennium 6명→6단계; syn_special_armor 3명→2단계; syn_tactical_support 3명→2단계; syn_vanguard 2명→2단계
- **F.04 트리니티 구호·저격** — 전방 hoshino, hasumi, azusa, iori / 후방 serina, koharu, suzumi, ako
  - 실제 활성: syn_gehenna 2명→2단계; syn_heavy_armor 4명→4단계; syn_light_armor 4명→3단계; syn_medic 2명→2단계; syn_sniper 2명→2단계; syn_striker 3명→2단계; syn_tactical_support 2명→2단계; syn_trinity 5명→4단계; syn_unique_dawn_horus 1명→1단계
- **F.05 백귀야행·특수장갑** — 전방 tsubaki, yuuka, izuna, asuna / 후방 shizuko, aris, kotama, hare
  - 실제 활성: syn_aegis 2명→2단계; syn_assault 2명→2단계; syn_electro 2명→2단계; syn_hyakkiyako 3명→2단계; syn_light_armor 3명→3단계; syn_millennium 5명→4단계; syn_mystic_arts 2명→2단계; syn_special_armor 4명→4단계; syn_tactical_support 3명→2단계; syn_vanguard 2명→2단계
- **F.06A 붉은겨울4·산해경2** — 전방 marina, momiji, cherino, shun / 후방 nodoka, kokona, saki, ako
  - 실제 활성: syn_assault 2명→2단계; syn_commander 3명→2단계; syn_light_armor 5명→5단계; syn_red_winter 4명→4단계; syn_shanhaijing 2명→2단계; syn_sniper 2명→2단계; syn_tactical_support 3명→2단계; syn_unique_red_mustache 1명→1단계
- **F.06B 산해경4·붉은겨울2** — 전방 yuuka, shun, mina, cherino / 후방 kokona, kisaki, nodoka, ako
  - 실제 활성: syn_aegis 2명→2단계; syn_assault 2명→2단계; syn_commander 4명→4단계; syn_light_armor 5명→5단계; syn_red_winter 2명→2단계; syn_shanhaijing 4명→4단계; syn_sniper 2명→2단계; syn_tactical_support 4명→4단계; syn_unique_black_monarch 1명→1단계; syn_unique_red_mustache 1명→1단계
- **F.07 SRT·발키리 전자전** — 전방 miyako, kirino, kanna, fubuki / 후방 saki, moe, miyu, hare
  - 실제 활성: syn_assault 2명→2단계; syn_commander 2명→2단계; syn_electro 4명→4단계; syn_heavy_armor 4명→4단계; syn_light_armor 3명→3단계; syn_sniper 2명→2단계; syn_srt 4명→4단계; syn_tactical_support 2명→2단계; syn_valkyrie 3명→3단계; syn_vanguard 2명→2단계
- **F.08A 아리우스 중반 저격** — 전방 atsuko, akemi, azusa, iori / 후방 hiyori, aris, karin, serina
  - 실제 활성: syn_arius 3명→2단계; syn_heavy_armor 2명→2단계; syn_light_armor 3명→3단계; syn_medic 2명→2단계; syn_millennium 2명→2단계; syn_sniper 3명→2단계; syn_special_armor 2명→2단계; syn_striker 4명→4단계; syn_trinity 2명→2단계; syn_vanguard 2명→2단계
- **F.08B 아리우스4 결전** — 전방 atsuko, azusa, saori, iori / 후방 hiyori, aris, ako, serina
  - 실제 활성: syn_arius 4명→4단계; syn_commander 2명→2단계; syn_gehenna 2명→2단계; syn_light_armor 5명→5단계; syn_medic 2명→2단계; syn_sniper 2명→2단계; syn_special_armor 2명→2단계; syn_striker 4명→4단계; syn_tactical_support 2명→2단계; syn_trinity 2명→2단계; syn_unique_vanitas_leader 1명→1단계
- **F.08C 무법자4 독립 결전** — 전방 akemi, rabu, wakamo, akira / 후방 aris, ako, himari, serina
  - 실제 활성: syn_assault 3명→2단계; syn_commander 2명→2단계; syn_elastic_armor 2명→2단계; syn_light_armor 3명→3단계; syn_millennium 2명→2단계; syn_mystic_arts 3명→2단계; syn_outlaw 4명→4단계; syn_special_armor 3명→2단계; syn_striker 2명→2단계; syn_tactical_support 2명→2단계; syn_unique_calamity_fox 1명→1단계; syn_unique_super_genius 1명→1단계
- **F.09A 한탕4 중반 (신규)** — 전방 yuuka, shiroko, nonomi, aru / 후방 ayane, kotama, fuuka, momoi
  - 실제 활성: syn_abydos 3명→2단계; syn_assault 3명→2단계; syn_gehenna 2명→2단계; syn_heavy_armor 2명→2단계; syn_jackpot 5명→4단계; syn_light_armor 6명→5단계; syn_medic 2명→2단계; syn_millennium 3명→2단계; syn_tactical_support 2명→2단계; syn_unique_outlaw_boss 1명→1단계
- **F.09B 한탕6 잭팟 (신규)** — 전방 yuuka, shiroko, nonomi, aru / 후방 ayane, rio, kotama, fuuka
  - 실제 활성: syn_abydos 3명→2단계; syn_assault 2명→2단계; syn_gehenna 2명→2단계; syn_heavy_armor 3명→2단계; syn_jackpot 6명→6단계; syn_light_armor 5명→5단계; syn_medic 2명→2단계; syn_millennium 3명→2단계; syn_tactical_support 3명→2단계; syn_unique_big_sister 1명→1단계; syn_unique_outlaw_boss 1명→1단계
- **F.10 하이랜더 급행열차 (신규)** — 전방 nozomi, hikari, tsubaki, izuna / 후방 shizuko, kokona, ayane, serina
  - 실제 활성: syn_assault 2명→2단계; syn_breacher 2명→2단계; syn_elastic_armor 2명→2단계; syn_highlander 2명→2단계; syn_hyakkiyako 3명→2단계; syn_light_armor 3명→3단계; syn_medic 3명→2단계; syn_mystic_arts 2명→2단계; syn_special_armor 3명→2단계; syn_tactical_support 4명→4단계

변화 요약: F.06A의 커맨더는 사키가 빠져 4단계 → 2단계로 내려간다. F.01·F.02는 한탕 2단계가 덤으로 켜진다. F.10은 노조미·히카리를 백귀야행에서 빼면서 생긴 하이랜더 중심 대안이다.

## 8. 다시 플레이할 동기

v2.1 3.2의 "영구 성장으로 능력치를 올리지 않는다"는 원칙은 그대로 지킨다. 아래 보상은 모두 **도전 과제, 기록, 수집, 선택지의 폭**이다. 런 안의 전투력을 직접 올리지 않는다. 런 밖 저장은 IndexedDB `settings`/`history`에 둔다.

### 8.1 위기 등급 0~10 (난이도 사다리)

등급 N을 클리어하면 N+1이 열린다. 효과는 누적이고, 데이터만 바꾸는 수정자라서 새 콘텐츠가 필요 없다. v2.1 3.2의 "난이도 데이터가 생긴 뒤 노출" 조건은 이 표로 충족한다. 단, 등급 0의 밸런스가 M6에서 합격한 뒤에 공개한다.

| 등급 | 추가 수정자 | 등급 | 추가 수정자 |
|---:|---|---:|---|
| 1 | 적 HP·ATK +5% | 6 | 시작 런 체력 80 → 70 |
| 2 | 시작 골드 10 → 8 | 7 | 상점 5번 칸 추천 확률 50% → 30% |
| 3 | 장비 보상 3택1 → 2택1 | 8 | 적 전방 전원 시작 에너지 +30 |
| 4 | 적 HP·ATK +10% (누적 +15%) | 9 | 패배 피해 +3 |
| 5 | 보스 전투 제한 1000AV → 850AV | 10 | 적 HP·ATK +10% (누적 +25%), 보스 시작 에너지 +50 |

- 보상: 등급별 칭호(예: "위기 등급 5 돌파 선생님")와 학생 카드 테두리 색. 기록 화면에 등급별 최고 기록을 남긴다.
- 런 시작 화면에서 등급을 고르고, 등급은 런 저장과 seed 문자열에 포함한다(재현성).
- v2.1 부록 E의 "A3 기준" 표기는 삭제하고 "위기 등급 0 기준"으로 바꾼다.

### 8.2 학생 인연

- 인연 포인트: 승리한 전투에 편성되어 있었으면 +1, 런을 클리어했을 때 편성되어 있었으면 +3. 같은 학생은 한 전투에서 한 번만 센다.
- 단계와 해금:

| 인연 단계 | 누적 포인트 | 해금 |
|---:|---:|---|
| 1 | 3 | 도감의 설정 메모(소속·동아리·성격 한 줄) |
| 2 | 10 | 인연 대사(10장의 `bond` 줄) |
| 3 | 25 | 카드 테두리 장식, 결과 화면 MVP 연출 변경 |
| 4 | 50 | 모모톡 짧은 장면 1개 (학생당 메시지 4~6개, 이 프로젝트에서 새로 쓴다) |

- 능력치 상승은 없다. 도감에서 "인연 4 학생 수 / 60"이 수집 목표가 된다.

### 8.3 샬레 업무 일지 (업적)

40개를 목표로 하고, 첫 판본에는 아래 12개를 넣는다. 일부 업적은 8.5의 해금과 연결한다.

| ID | 이름 | 조건 |
|---|---|---|
| `ach_first_clear` | 첫 출근 | 처음으로 런을 클리어 |
| `ach_abydos_5` | 대책위원회 총출동 | 아비도스 5단계로 비나 처치 |
| `ach_gehenna_6` | 선도부의 악몽 | 게헨나 6단계로 클리어 |
| `ach_millennium_6` | 세미나 승인 완료 | 밀레니엄 6단계로 클리어 |
| `ach_jackpot_150` | 대박 났다 | 금고 털기 한 번에 150G 수령 |
| `ach_vault_300` | 복리의 마법 | 한 런에서 금고로 총 300G 이상 수령 |
| `ach_loan_clear` | 완납 증명서 | 카이저 론을 체력 손실 없이 완납 |
| `ach_no_loss` | 무결점 작전 | 한 번도 지지 않고 클리어 |
| `ach_low_hp` | 아슬아슬한 퇴근 | 런 체력 10 이하로 클리어 |
| `ach_all_1cost` | 신입생 파워 | 최종 편성 전원이 1~2코스트인 상태로 클리어 |
| `ach_rear_6` | 후방 지원 만세 | 후방 6칸을 모두 채운 상태로 클리어 |
| `ach_crisis_10` | 키보토스의 수호자 | 위기 등급 10 클리어 |

### 8.4 주간 작전

- ISO 주차로 시드를 정한다: `weekly-2026-W44`. 같은 주에는 누구나 같은 시작 학생·상점·보상 RNG를 받는다.
- 시작 전략 1개와 위기 등급을 주간 데이터로 고정한다(정적 JSON, 서버 없음). 데이터가 없으면 기본값(등급 2, 전략 무작위)을 쓴다.
- 기록: 남은 런 체력, 패배 횟수, 총 전투 AV를 기기 안에 저장한다. 결과 카드에 시드 문자열을 찍어 친구와 비교할 수 있게 한다. 온라인 랭킹은 v2.1 범위 제외 원칙대로 만들지 않는다.

### 8.5 해금형 선택지 (수평 해금)

처음에는 시작 전략 13개 중 범용 7개만 제안 풀에 들어간다. 나머지는 업적으로 열린다. 열린 전략은 더 강한 것이 아니라 더 위험하거나 특화된 것이다.

| 전략 | 해금 조건 |
|---|---|
| `str_rear_command_net`, `str_iron_frontline` | `ach_first_clear` |
| `str_mystic_resonance`, `str_overclock_core` | 2장 보스 처치 3회 |
| `str_festival_fireworks` | 후방 반응 지원 누적 200회 |
| `str_kaiser_loan` | 한탕 4단계로 승리 1회 |

### 8.6 런 결과 카드

런이 끝나면 "선생님의 작전 보고서" 카드를 만든다: 최종 편성 초상, 활성 시너지, 위기 등급, seed, MVP 학생과 그 학생의 승리 대사. PNG로 저장할 수 있다(v2.1 12장의 파일 내보내기와 같은 경로). 학생 초상 에셋이 없으면 이니셜 카드로 만든다.

## 9. 캐릭터 대사

### 9.1 원칙과 데이터 계약

- **원작 대사를 옮기지 않았다.** 모든 줄은 이 프로젝트에서 새로 썼다. 원작에서 널리 알려진 말버릇(호시노의 "으헤~", 무츠키의 "쿠후후", 이즈나의 "니닌" 등)과 호칭(아스나·카린의 "주인님", 와카모의 "당신님" 등)만 성격 표현으로 반영했다. 공개 배포 전에 원작사 2차 창작 가이드라인의 대사·말버릇 사용 범위를 한 번 더 확인한다.
- 각 학생 머리의 **근거**는 원작 설정 요약이고, **확신도**는 검색으로 확인한 정도다. NPC 세 명(라부·아케미·아키라)은 원작 정보가 적어 낮음이다. 확신도 중간·낮음 학생은 팬 검수자에게 먼저 보여 준다.
- 상황 7종과 키:

| 키 | 상황 | 표시 규칙 |
|---|---|---|
| `recruit` | 상점에서 처음 영입 | 준비 화면 말풍선 2초. 같은 학생은 런당 1회 |
| `deploy` | 전방·후방 칸에 처음 배치 | 말풍선 1.5초. 런당 1회 |
| `ultimate` | 필살기 사용 (후방 전용은 첫 정기 지원) | 초상 옆 말풍선 1.2초. 학생별 전투당 1회. 4배속·건너뛰기에서는 생략 |
| `victory` | 승리 결과 화면 | MVP(가장 큰 기여) 학생 1명만 |
| `defeated` | 전투불능 | 전투 로그 한 줄 + 작은 말풍선. 2배속 이상에서는 로그만 |
| `star3` | 3성 합성 | 합성 연출과 함께 2.5초 |
| `bond` | 인연 2단계 해금 후 도감·결과 화면 | 도감에서 언제든 다시 보기 |

- 데이터: `src/content/dialogue/ko/<unitId>.json` = `{"unitId": "...", "lines": {"recruit": "...", ...}}`. 콘텐츠 검증기는 60명 × 7키가 모두 있는지, 빈 문자열이 없는지 확인한다.
- 대사는 표현 계층(`src/presentation/`)만 읽는다. 전투 코어·RNG·결과 hash에 영향을 주지 않는다. 대사 문자열은 텍스트로만 렌더링한다(HTML 해석 금지, v2.1 12.3).
- 선생님 호칭은 학생마다 원작을 따르고, UI 공통 문구("선생님, 전투를 시작할까요?")는 중립 호칭 "선생님"을 쓴다.

### 9.2 학생별 대사 (60명)
#### `u_serika` 쿠로미 세리카

근거: 아비도스 대책위원회 1학년. 아르바이트를 여러 개 뛰며 학교 빚을 갚는 데 진심이다. 말이 날카롭고 쉽게 발끈하지만 속은 다정한 츤데레. · 확신도 **높음**

- **영입:** 흥, 영입해 줬다고 고마워할 줄 알았어? …뭐, 일당만큼은 확실히 해 줄게.
- **배치:** 앞줄이지? 알바 끝나고 바로 온 거니까 빨리 끝내자고!
- **필살기:** 빚 갚을 시간도 모자란데, 방해하지 마─!
- **승리:** 이겼어! …딱히 선생님 때문에 열심히 한 건 아니거든?
- **전투불능:** 윽… 오늘 알바, 빠지면 안 되는데….
- **3성:** 3성? 시급이 오른 거나 마찬가지네. 이 정도면 빚도 금방 갚겠어!
- **인연:** 선생님은 왜 맨날 우리 일에 그렇게까지 해 주는 거야? …고, 고맙다고는 했다!

#### `u_suzumi` 모리즈키 스즈미

근거: 트리니티 자경단 소속. 정의감이 강하고 섬광탄으로 상대의 눈을 멀게 해 제압하는 방식을 즐겨 쓴다. · 확신도 **중간**

- **영입:** 트리니티 자경단, 모리즈키 스즈미입니다. 키보토스의 치안, 함께 지켜요.
- **배치:** 제 위치는 여기군요. 수상한 움직임이 보이면 바로 섬광탄을 던질게요.
- **필살기:** 눈 감으세요, 선생님! 섬광탄 갑니다!
- **승리:** 정의는 오늘도 지켜졌습니다. 순찰 일지에 적어 둘게요.
- **전투불능:** 죄송해요… 섬광탄이 하나 남았는데….
- **3성:** 더 많은 사람을 지킬 수 있게 됐어요. 자경단의 이름에 걸맞게요.
- **인연:** 공식 기관이 아니어도 누군가는 지켜야 하니까요. 선생님도 그렇게 생각하시죠?

#### `u_haruka` 이구사 하루카

근거: 게헨나 흥신소68 소속. 극도로 소심하고 사과를 입에 달고 살지만, 아루 사장을 위해서라면 무엇이든 부숴 버린다. · 확신도 **높음**

- **영입:** 저, 저 같은 걸 뽑아 주셔서… 죄, 죄송해요! 아니, 감사합니다…!
- **배치:** 제, 제일 앞이요? 아루 님이 보고 계시니까… 열심히 할게요…!
- **필살기:** 아루 님의 앞길을 막는 건… 전부 치워 버릴게요…!
- **승리:** 이, 이겼어요…? 아루 님께 칭찬받을 수 있을까요…?
- **전투불능:** 죄송해요… 죄송해요… 제가 쓸모없어서….
- **3성:** 3성… 이러면 아루 님 곁에 조금 더 오래 있을 수 있겠죠…?
- **인연:** 선생님은… 저한테도 다정하게 대해 주시네요. 그, 그래도 괜찮은 건가요…?

#### `u_kotama` 오토세 코타마

근거: 밀레니엄 베리타스 소속. 도청과 신호 감청이 특기인 해커. 헤드폰을 끼고 다니며 남의 대화를 엿듣는 데 거리낌이 없다. · 확신도 **높음**

- **영입:** 베리타스의 오토세 코타마예요. …방금 선생님이 혼잣말한 것도 다 들렸어요.
- **배치:** 후방이면 충분해요. 적 통신, 전부 제가 듣고 있을게요.
- **필살기 (첫 정기 지원):** 주파수 잡았어요. 다음 움직임, 미리 알려 드릴게요.
- **승리:** 적 무전에서 비명 소리가 들려요. 이번 녹음은 소장할게요.
- **전투불능:** 잡음이… 너무 심해요….
- **3성:** 감청 범위가 넓어졌어요. 이제 키보토스 반은 들리겠네요.
- **인연:** 선생님 목소리는 녹음해 두면 마음이 편해져요. …농담이에요. 아마도요.

#### `u_serina` 스미 세리나

근거: 트리니티 구호기사단 소속. 부상자가 있으면 어디든 나타나는 상냥한 의료 담당. · 확신도 **높음**

- **영입:** 구호기사단의 스미 세리나예요. 다치신 분이 있으면 언제든 부르세요.
- **배치:** 뒤에서 응급 처치 준비해 둘게요. 무리하지 마세요.
- **필살기 (첫 정기 지원):** 괜찮아요, 금방 나을 거예요. 조금만 참으세요.
- **승리:** 다친 분이 적어서 다행이에요. 그래도 붕대는 갈아 드릴게요.
- **전투불능:** 제가… 쓰러지면 안 되는데… 다들 치료해야….
- **3성:** 이제 더 많은 사람을 한꺼번에 돌볼 수 있어요.
- **인연:** 선생님이 다치시면 제일 먼저 달려갈게요. 어디에 계시든요.

#### `u_asuna` 이치노세 아스나

근거: 밀레니엄 C&C(청소&클리어링) 소속 메이드 요원. 감으로 움직이는 천진난만한 성격이며 선생님을 '주인님'이라 부른다. · 확신도 **높음**

- **영입:** 아스나 등장~! 주인님, 오늘은 뭐 하고 놀아요?
- **배치:** 여기 서면 돼요? 왠지 여기가 제일 재밌을 것 같았어요!
- **필살기:** 에헤헤, 감이 왔어요! 지금이에요~!
- **승리:** 이겼다~! 역시 제 감은 틀린 적이 없다니까요, 주인님!
- **전투불능:** 어라라… 이번엔 감이 빗나갔네….
- **3성:** 3성이래요! 주인님, 칭찬해 주세요~!
- **인연:** 주인님 옆에 있으면 왠지 다 잘될 것 같아요. 이것도 감이에요!

#### `u_junko` 아카시 준코

근거: 게헨나 미식연구회 소속. 언제나 배가 고프고, 맛있는 것을 위해서라면 폭주도 마다하지 않는다. · 확신도 **높음**

- **영입:** 미식연구회 아카시 준코! 영입 축하 파티는 고기로 해 줘!
- **배치:** 앞줄? 좋아, 대신 끝나면 밥 사 주는 거다?
- **필살기:** 배고파서 힘이 넘쳐─! 다 날려 버릴 거야!
- **승리:** 이겼으니까 밥! 지금 당장 밥!
- **전투불능:** 배가… 너무 고파서… 힘이….
- **3성:** 3성이면 곱빼기 시켜도 되는 거지? 그렇지?
- **인연:** 선생님이랑 먹는 밥이 제일 맛있어. 이건 진짜 미식가의 평가야.

#### `u_michiru` 치도리 미치루

근거: 백귀야행 인법연구부 부장. 닌자에 대한 동경이 넘치며 닌자 영상을 찍어 올리는 열정파. · 확신도 **높음**

- **영입:** 인법연구부 부장, 치도리 미치루! 닌자의 길에 오신 걸 환영해요, 닌닌!
- **배치:** 이 자리, 닌자답게 그림자 속에서 지켜볼게요!
- **필살기:** 비전 인법─! 이 장면은 꼭 영상으로 남겨야 해!
- **승리:** 임무 완수! 오늘 영상 조회수 대박 나겠다~!
- **전투불능:** 인법이… 아직 수련이 부족했어….
- **3성:** 3성 닌자! 이제 진짜 닌자라고 불러도 되겠죠?
- **인연:** 선생님은 제 닌자 영상 끝까지 봐 주는 유일한 시청자예요. 구독 고마워요!

#### `u_kokona` 스노하라 코코나

근거: 산해경 매화원의 교관. 어린 나이에 아이들을 가르친다. 어린애 취급을 싫어하고 언니 슌처럼 존경받고 싶어 한다. 당근을 싫어한다. · 확신도 **높음**

- **영입:** 매화원 교관 스노하라 코코나예요! 코코나 '선생님'이라고 불러 주세요!
- **배치:** 자, 제 자리는 여기예요. 아이들 앞이라고 생각하고 똑바로 할게요!
- **필살기:** 제대로 보세요, 이게 교관의 실력이에요!
- **승리:** 봤죠? 저도 어엿한 선생님이라고요!
- **전투불능:** 흐윽… 우, 울지 않았어요!
- **3성:** 3성이에요! 이제 아무도 저를 어린애 취급 못 하겠죠?
- **인연:** 선생님, 오늘 급식에 당근 나오면… 몰래 바꿔 주실 수 있어요?

#### `u_nodoka` 아마미 노도카

근거: 붉은겨울 연방학원 227호 특별반 소속. 대형 망원경으로 남을 관찰하는 취미 때문에 정학을 받았고, 학생회장이 반의 존재를 잊어버려 정학이 풀리지 않고 있다. · 확신도 **높음**

- **영입:** 227호 특별반 아마미 노도카예요. 저를 기억해 주는 사람이 있다니, 신기하네요.
- **배치:** 후방이면 시야가 넓어서 좋아요. 망원경 좀 설치할게요.
- **필살기 (첫 정기 지원):** 보여요, 다 보여요… 거기, 약점이 다 보인다고요!
- **승리:** 관찰 기록 완료. 오늘의 승리도 망원경 너머로 잘 봤어요.
- **전투불능:** 렌즈에… 금이 갔어….
- **3성:** 더 멀리까지 보여요. 언젠가 바깥세상도 전부 보고 싶어요.
- **인연:** 선생님은 망원경으로 안 봐도 다 보이는 사람이에요. …칭찬이에요.

#### `u_fubuki` 네무가키 후부키

근거: 발키리 경찰학교 소속. 일하기 싫어하는 게으른 성격으로, 순찰보다 도넛과 낮잠을 좋아한다. · 확신도 **중간**

- **영입:** 네무가키 후부키예요~. 영입은 좋은데, 일은 적당히 할게요~.
- **배치:** 여기 서 있으면 되죠? 졸려도 서 있긴 할게요~.
- **필살기:** 하아… 빨리 끝내고 도넛 먹을래요.
- **승리:** 이겼네요~. 그럼 퇴근해도 되죠? 그렇죠?
- **전투불능:** 아… 이건 산재예요, 산재….
- **3성:** 3성이면 월급 올라요? 안 오르면 의미 없는데~.
- **인연:** 선생님이랑 있으면 땡땡이쳐도 혼나지 않아서 좋아요~. 아, 이건 비밀로 해 주세요.

#### `u_rabu` 코마카제 라부

근거: 헬멧단 한 무리의 두목(원작 NPC). 거친 불량배지만 부하들을 동생처럼 아끼고 지킨다. 가끔은 평범한 여고생처럼 살고 싶어 한다. · 확신도 **낮음**

- **영입:** 헬멧단 두목 코마카제 라부다. 우리 애들 건드리면 각오해.
- **배치:** 앞이냐? 좋아, 뒤에 있는 녀석들은 내가 지킨다.
- **필살기:** 우리 애들한테 손대지 마! 산탄 맛 좀 봐라!
- **승리:** 다들 무사하지? …좋아, 오늘은 내가 한턱낸다.
- **전투불능:** 칫… 얘들아, 먼저 도망쳐….
- **3성:** 두목다운 모습이 됐지? 우리 애들이 자랑스러워하겠네.
- **인연:** 선생은 이상한 어른이야. 우리 같은 불량배한테도 기회를 주잖아.

#### `u_shiroko` 스나오오카미 시로코

근거: 아비도스 대책위원회 2학년. 말수가 적고 담담하다. 운동, 특히 자전거를 좋아하며 빚을 갚자고 은행 털이를 진지하게 제안하곤 한다. · 확신도 **높음**

- **영입:** 응. 시로코. 잘 부탁해, 선생님.
- **배치:** 앞이네. 달리는 건 자신 있어.
- **필살기:** 응. 이걸로 끝내자.
- **승리:** 이겼어. …이 기세로 은행도 털러 갈래?
- **전투불능:** …아직, 더 달릴 수 있는데.
- **3성:** 3성. 다음엔 은행 금고도 열 수 있을 것 같아.
- **인연:** 선생님, 주말에 같이 자전거 타러 가자. 아비도스 사막 끝까지.

#### `u_yuuka` 하야세 유우카

근거: 밀레니엄 세미나의 회계. 계산이 빠르고 예산에 엄격하다. 선생님의 낭비벽을 잔소리하면서도 늘 챙겨 준다. · 확신도 **높음**

- **영입:** 세미나 회계 하야세 유우카예요. 영입 비용, 장부에 정확히 적어 두겠습니다.
- **배치:** 앞줄 배치, 효율적인 판단이에요. 피해는 제가 계산해서 막을게요.
- **필살기:** 계산은 끝났어요. 이 수치라면 버틸 수 있어요!
- **승리:** 승리. 수입과 이자까지 정산 완료예요. …선생님, 또 이상한 데 쓰시면 안 돼요?
- **전투불능:** 계산이… 틀렸을 리가 없는데….
- **3성:** 3성이요? 투자 대비 수익률 최고네요. 이번 결재는 승인해 드릴게요.
- **인연:** 선생님 영수증 정리하는 것도 이제 제 일이 됐네요. …싫다는 건 아니에요.

#### `u_tsubaki` 카스가 츠바키

근거: 백귀야행 수련부 소속. 늘 졸려하고 틈만 나면 잠든다. 방패를 들고 앞에서 버티는 역할. · 확신도 **높음**

- **영입:** 카스가 츠바키… 영입 고마워… 쿨….
- **배치:** 앞에서 버티면 되는 거지…? 서서 자는 건 특기야….
- **필살기:** 음냐… 이쪽으로 와… 내가 다 받아 줄게….
- **승리:** 이겼어…? 그럼 이제 낮잠 시간이네….
- **전투불능:** 드디어… 푹 잘 수 있겠다….
- **3성:** 3성… 수련의 성과일까… 아니면 잘 자서일까….
- **인연:** 선생님 옆은 이상하게 잠이 잘 와… 조금만 기대도 될까…?

#### `u_momoi` 사이바 모모이

근거: 밀레니엄 게임개발부 소속. 쌍둥이 미도리의 언니. 시끄럽고 에너지 넘치며 '명작 게임'을 만들겠다는 꿈이 있다. · 확신도 **높음**

- **영입:** 게임개발부 사이바 모모이 참전! 선생, 이 파티 구성 완전 명작인데?
- **배치:** 이 자리 딱이야! 튜토리얼 끝, 이제 본게임이지!
- **필살기:** 필살 콤보 들어간다─! 프레임 단위로 봐 둬!
- **승리:** 클리어! 이건 게임 대상감이야, 미도리한테도 자랑해야지!
- **전투불능:** 으앗, 게임 오버… 세이브 해 뒀지…?
- **3성:** 3성 달성! 레어 등급 업그레이드 연출 나왔다!
- **인연:** 선생, 우리가 만든 게임 테스트 플레이해 줄 거지? 버그는… 조금밖에 없어!

#### `u_fuuka` 아이키요 후우카

근거: 게헨나 급식부 부장. 수많은 학생의 식사를 책임지느라 늘 지쳐 있고, 미식연구회에 자주 납치당한다. · 확신도 **높음**

- **영입:** 급식부 아이키요 후우카예요. …오늘은 납치 말고 영입이라 다행이네요.
- **배치:** 후방에서 다들 든든하게 챙겨 드릴게요. 배고프면 말씀하세요.
- **필살기 (첫 정기 지원):** 급식 시간이에요! 다들 배불리 먹고 힘내세요!
- **승리:** 다행이에요… 오늘은 무사히 급식 시간 전에 끝났네요.
- **전투불능:** 오늘 배식은… 누가 하죠….
- **3성:** 이제 더 많은 학생 몫까지 챙길 수 있어요. 일은… 더 늘겠지만요.
- **인연:** 선생님은 제 밥을 늘 맛있다고 해 주셔서 힘이 나요. 내일 메뉴도 기대해 주세요.

#### `u_hare` 오마가리 하레

근거: 밀레니엄 베리타스 소속 해커. 차분하고 성실하며 에너지 드링크를 달고 산다. · 확신도 **중간**

- **영입:** 베리타스 오마가리 하레입니다. 에너지 드링크만 넉넉하면 밤샘도 괜찮아요.
- **배치:** 후방 지원 위치 확보. 회선 연결할게요.
- **필살기 (첫 정기 지원):** 시스템 침투 완료. 적 장비, 잠깐 멈춰 둘게요.
- **승리:** 작업 완료. …에너지 드링크 한 캔 더 마셔도 되죠?
- **전투불능:** 배터리가… 아니, 제가 방전이에요….
- **3성:** 처리 속도가 올라갔어요. 이제 더 큰 시스템도 해킹할 수 있겠네요.
- **인연:** 선생님도 밤새우지 마세요. …제가 할 말은 아니지만요.

#### `u_ayane` 오쿠소라 아야네

근거: 아비도스 대책위원회 1학년. 책임감 강하고 예의 바르며, 작전 보조와 위원회 살림, 빚 문제를 꼼꼼히 챙긴다. · 확신도 **높음**

- **영입:** 아비도스 대책위원회 오쿠소라 아야네예요. 작전 보조라면 맡겨 주세요.
- **배치:** 후방에서 전황 정리할게요. 예산 사정도요….
- **필살기 (첫 정기 지원):** 지원 들어갑니다! 다들 조금만 더 버텨 주세요!
- **승리:** 승리예요! 이번 수입은 빚 상환 계획표에 바로 반영할게요.
- **전투불능:** 죄송해요… 장부 정리가 아직 남았는데….
- **3성:** 3성이라니… 이자 계산이 조금은 편해지겠네요.
- **인연:** 선생님이 오신 뒤로 상환 계획표가 처음으로 '가능'이라고 나왔어요. 정말이에요.

#### `u_hasumi` 하네카와 하스미

근거: 트리니티 정의실현부 부부장. 키가 크고 예의 바른 저격수. 단 것을 좋아하지만 체중을 신경 쓴다. · 확신도 **높음**

- **영입:** 정의실현부 하네카와 하스미입니다. 정의를 위해 힘을 보태겠어요.
- **배치:** 제 사선이 확보되는 자리군요. 좋습니다.
- **필살기:** 정의의 이름으로… 저격합니다.
- **승리:** 작전 완료입니다. …축하 디저트는 하나만 먹을게요. 하나만요.
- **전투불능:** 제 조준이… 흐트러지다니….
- **3성:** 3성… 정의실현부 부부장으로서 부끄럽지 않은 실력이 됐네요.
- **인연:** 선생님, 같이 디저트 가게에 가 주실래요? 혼자 가면 너무 많이 먹게 돼서요.

#### `u_kayoko` 오니카타 카요코

근거: 게헨나 흥신소68 소속. 무서운 인상과 달리 차분하고 상식적이며, 폭주하는 사장 아루를 조용히 수습한다. · 확신도 **높음**

- **영입:** 오니카타 카요코. …표정이 무섭다고들 하는데, 신경 쓰지 마.
- **배치:** 여기면 돼. 사장이 또 무리하면 내가 막을게.
- **필살기:** …도망칠 거면 지금이 마지막 기회야.
- **승리:** 끝났어. 사장한테는 '계획대로'였다고 해 둘게.
- **전투불능:** …사장, 미안. 먼저 빠질게.
- **3성:** 3성이라… 흥신소 평판도 조금은 오르려나.
- **인연:** 선생은 사장을 웃게 만들어. 그건 나도 잘 못 하는 일이야.

#### `u_karin` 카쿠다테 카린

근거: 밀레니엄 C&C 소속 저격수 메이드. 진지하고 과묵하며 선생님을 '주인님'이라 부른다. · 확신도 **높음**

- **영입:** C&C 카쿠다테 카린입니다. 주인님, 명령을 내려 주세요.
- **배치:** 후방 저격 위치, 확인했습니다.
- **필살기 (첫 정기 지원):** 표적 고정. 주인님, 한 발이면 충분합니다.
- **승리:** 임무 완료입니다, 주인님. 청소는 깔끔하게 끝냈습니다.
- **전투불능:** 죄송합니다, 주인님… 빗나갔습니다….
- **3성:** 3성… 주인님께 더 확실한 한 발을 바칠 수 있겠군요.
- **인연:** 주인님, 메이드 일은 아직 서툴러요. 그래도… 차는 제가 끓여 드릴게요.

#### `u_shun` 스노하라 슌

근거: 산해경 매화원의 교관. 코코나의 언니. 아이들을 상냥하게 돌보는 어머니 같은 성격이지만 나이 이야기에 예민하고 어깨 결림을 자주 호소한다. · 확신도 **높음**

- **영입:** 매화원 교관 스노하라 슌이에요. 선생님, 잘 부탁드려요.
- **배치:** 앞줄이군요. 아이들을 지키는 마음으로 설게요.
- **필살기:** 말 안 듣는 아이에게는… 조금 따끔한 교육이 필요하죠.
- **승리:** 모두 잘했어요. 오늘은 간식 시간을 조금 늘려 줄게요.
- **전투불능:** 아이고, 어깨가…. 나이 탓은 아니에요, 절대로.
- **3성:** 3성이라니, 아직 젊다는 증거겠죠? 그렇죠?
- **인연:** 선생님도 어깨 뭉치셨죠? 이따가 제가 주물러 드릴게요. 아이들한테는 비밀이에요.

#### `u_momiji` 아키이즈미 모미지

근거: 붉은겨울 지식해방전선 소속. 평소엔 조용하고 수줍지만 책 이야기만 나오면 대담하고 사나워진다. 곰 인형 탄두를 쓰는 로켓을 든다. · 확신도 **중간**

- **영입:** 아키이즈미 모미지예요. …책 읽던 중이었는데, 괜찮아요. 갈게요.
- **배치:** 여기요? 책은 가방에 넣어 둘게요.
- **필살기:** 도서관 규칙 위반이에요! 조용히… 날아가 주세요!
- **승리:** 끝났네요. 그럼 남은 장 마저 읽어도 돼요?
- **전투불능:** 아… 책갈피가… 어디 갔지….
- **3성:** 3성이면… 희귀본 구입 신청, 이번엔 통과될까요?
- **인연:** 선생님이 빌려 간 책, 반납 기한 지났어요. …다 읽으셨으면 감상 들려주세요.

#### `u_kirino` 나카츠카사 키리노

근거: 발키리 경찰학교 생활안전국 소속. 정의감 넘치는 성실한 경찰이 되고 싶어 하지만 사격 실력이 처참하다. · 확신도 **중간**

- **영입:** 발키리 경찰학교 나카츠카사 키리노! 본관, 시민의 안전을 위해 출동합니다!
- **배치:** 앞에서 시민을 지키겠습니다! 사격은… 최대한 맞혀 보겠습니다!
- **필살기:** 본관의 정의의 탄환을 받아라─! 이번엔 맞아라!
- **승리:** 범인 검거 완료! 오늘은 한 발도 안 빗나갔… 아마도요!
- **전투불능:** 본관… 순직하는 건가요….
- **3성:** 3성! 이제 사격 훈련 점수도 오를까요?
- **인연:** 선생님은 제가 빗맞혀도 웃지 않으셨어요. 그래서 더 잘하고 싶어요.

#### `u_nozomi` 타치바나 노조미

근거: 하이랜더 철도학원 CCC(중앙관제센터) 간부. 쌍둥이 히카리의 짝. 장난기 많고 '파햐햐' 하고 웃는다. · 확신도 **높음**

- **영입:** 파햐햐! 하이랜더의 노조미 등장! 선생, 이 열차에 탑승한 거 후회 없지?
- **배치:** 선로 위면 어디든 내 무대야! 출발 진행!
- **필살기:** 급행열차 통과합니다─! 비키지 않으면 치고 간다, 파햐햐!
- **승리:** 정시 도착! 승객 여러분, 하이랜더를 이용해 주셔서 감사합니다~!
- **전투불능:** 운행… 중지라니… 이건 사고야….
- **3성:** 3성! 이제 특급열차 등급이라고!
- **인연:** 선생, 다음에 히카리랑 셋이서 종착역까지 가 보자. 표는 내가 끊어 줄게!

#### `u_nonomi` 이자요이 노노미

근거: 아비도스 대책위원회 2학년. 부유한 집안의 아가씨로 느긋하고 상냥하다. 골드 카드로 뭐든 해결하려 하고, 말끝에 별(☆)이 붙는 듯한 밝은 말투. · 확신도 **높음**

- **영입:** 이자요이 노노미예요~☆ 영입 비용은 제 카드로 긁어 드릴까요?
- **배치:** 여기 서면 되나요? 미니건 준비 완료예요~☆
- **필살기:** 자, 다 같이 쏴 버려요~☆ 탄약값은 걱정 마세요!
- **승리:** 이겼어요~☆ 축하 파티 비용은 제가 낼게요!
- **전투불능:** 어머… 카드 한도가 아니라 제가 초과됐네요….
- **3성:** 3성이에요~☆ 이번엔 골드 카드 말고 실력으로 산 거예요!
- **인연:** 선생님, 돈으로 안 되는 게 있다는 걸 대책위원회에서 배웠어요. 그래서 여기가 좋아요☆

#### `u_iori` 시로미 이오리

근거: 게헨나 선도부 소속 저격수. 자존심이 세고 직설적이며 실력에 자부심이 크다. 위원장 히나를 깊이 존경한다. · 확신도 **높음**

- **영입:** 선도부 시로미 이오리다. 흥, 날 뽑은 안목은 인정해 주지.
- **배치:** 이 자리면 사선이 다 보이네. 하나도 안 놓쳐.
- **필살기:** 선도부를 얕보지 마! 머리를 날려 주지!
- **승리:** 당연한 결과야. …뭐, 선생이 지휘를 잘한 것도 조금은 있고.
- **전투불능:** 칫… 히나 위원장한테는 비밀로 해 줘….
- **3성:** 3성? 원래 이 정도 실력이었거든. 이제야 수치가 따라온 거지.
- **인연:** 선생은… 내가 자랑해도 끝까지 들어 주니까. 그건 고맙게 생각해.

#### `u_mutsuki` 아사기 무츠키

근거: 게헨나 흥신소68 과장. 장난과 폭발물을 좋아하는 소악마 같은 성격으로 '쿠후후' 하고 웃는다. 사장 아루를 놀리는 게 낙이다. · 확신도 **높음**

- **영입:** 쿠후후~ 무츠키 왔어♪ 선생님, 재밌는 일 시켜 줄 거지?
- **배치:** 여기? 좋아~ 폭탄 놓기 딱 좋은 자리네♪
- **필살기:** 펑! 쿠후후, 다 날아가 버려라~♪
- **승리:** 이겼다~♪ 아루쨩한테 자랑하면 또 얼굴 빨개지겠지?
- **전투불능:** 에이~ 무츠키가 지다니, 재미없어….
- **3성:** 3성이래♪ 폭탄도 3배로 준비해야겠다, 쿠후후.
- **인연:** 선생님은 무츠키 장난에 끝까지 어울려 주잖아? 그러니까… 특별히 좋아해 줄게♪

#### `u_azusa` 시라스 아즈사

근거: 트리니티 보충수업부 소속. 아리우스 출신으로 전투 기술이 뛰어나다. '모든 것은 허무하다(Vanitas vanitatum)'를 알면서도 그래도 포기하지 않는 성격. 귀여운 것을 좋아한다. · 확신도 **높음**

- **영입:** 시라스 아즈사. 보충수업부 소속이야. 작전이라면 맡겨 줘.
- **배치:** 앞줄 확인. 함정은 이미 깔아 뒀어.
- **필살기:** 모든 것은 허무해. 그래도… 지금 이 순간은 포기하지 않아.
- **승리:** 작전 성공. …선생님, 귀여운 인형 가게 들러도 돼?
- **전투불능:** 아직… 끝이 아니야. 그래도….
- **3성:** 3성. 지켜야 할 것을 더 많이 지킬 수 있게 됐어.
- **인연:** 선생님 덕분에 알게 됐어. 허무해도 의미 있는 날은 있다는 거.

#### `u_koharu` 시모에 코하루

근거: 트리니티 보충수업부 소속. 정의실현부 엘리트를 꿈꾸지만 성적 때문에 보충수업부에 있다. 야한 것에 과민 반응해 '사형!'을 외친다. · 확신도 **높음**

- **영입:** 시모에 코하루예요! 원래는 정의실현부 엘리트가 될 몸이라고요!
- **배치:** 제 자리는 여기죠? 엘리트답게 확실히 지원할게요!
- **필살기:** 엘리트의 실력을 보여 주겠어요! 수류탄 갑니다!
- **승리:** 이겼어요! 이 정도면 정의실현부에서도 스카우트하러 오겠죠?
- **전투불능:** 으앙… 시험도 전투도 왜 다 이래….
- **3성:** 3성! 봤죠? 저 엘리트 맞다니까요!
- **인연:** 선생님, 공부 좀 가르쳐 주세요… 아, 이상한 공부 말고요! 그런 건 사형이에요!

#### `u_izuna` 쿠다 이즈나

근거: 백귀야행 인법연구부 소속 닌자. 밝고 충성스러우며 선생님을 '주군'으로 모신다. 말끝에 '니닌'을 붙인다. · 확신도 **높음**

- **영입:** 쿠다 이즈나, 주군께 충성을 맹세합니다! 니닌!
- **배치:** 이즈나는 어디든 갑니다! 이 자리도 완벽하게 지킬게요, 니닌!
- **필살기:** 인법, 질풍참! 주군, 지켜봐 주세요!
- **승리:** 임무 완수! 주군, 쓰다듬어 주세요, 니닌~!
- **전투불능:** 주군… 이즈나는 아직… 수련이….
- **3성:** 3성 닌자 이즈나! 이제 주군의 최강 그림자예요!
- **인연:** 주군 곁에 있는 게 이즈나의 닌도예요. 어디든 따라갈게요, 니닌!

#### `u_shizuko` 카와와 시즈코

근거: 백귀야행 축제운영부 소속. 손님 앞에서는 상냥한 간판 아가씨지만 뒤에서는 장사 셈이 빠르고 말투가 확 바뀌는 두 얼굴의 소유자. · 확신도 **높음**

- **영입:** 축제운영부 카와와 시즈코랍니다♪ 어서 오세요, 선생님!
- **배치:** 후방이네요♪ 축제 운영처럼 깔끔하게 지원해 드릴게요.
- **필살기 (첫 정기 지원):** 자, 축제 개막이에요♪ …방해꾼은 퇴장시켜야겠죠?
- **승리:** 대성황이에요♪ 이번 매출은… 흠흠, 아니에요, 승리 축하해요!
- **전투불능:** 칫… 아, 아니에요♪ 잠깐 휴업할게요….
- **3성:** 3성이에요♪ 이 정도면 축제 간판으로 손색없죠?
- **인연:** 선생님 앞에서는 연기 안 해도 돼서 편해요. …이건 다른 사람한테 말하면 안 돼요?

#### `u_toki` 아스마 토키

근거: 밀레니엄 세미나 소속 비밀 요원으로 C&C와 함께 활동한다. 무표정하고 담담한 말투지만 의외로 장난기가 있다. · 확신도 **높음**

- **영입:** 아스마 토키입니다. 영입을 확인했습니다. 피스.
- **배치:** 배치 완료. 이 위치에서 임무를 수행합니다.
- **필살기:** 출력 최대. …놀라셨나요. 저는 놀라지 않았습니다.
- **승리:** 승리를 확인했습니다. 지금 기쁜 표정을 짓고 있습니다. 보이시나요.
- **전투불능:** 기능… 정지….
- **3성:** 3성. 성능 향상을 확인했습니다. 칭찬은 언제든 받습니다.
- **인연:** 선생님과 있으면 표정 연습이 잘됩니다. 방금 웃었습니다. 정말입니다.

#### `u_mina` 코노에 미나

근거: 산해경 현룡문 집행부 간부이자 키사키의 경호원. 고전 누아르 영화 마니아로 멋있게 굴려 하지만 성격이 급하고, 영화 대사를 엉뚱하게 인용한다. · 확신도 **높음**

- **영입:** 현룡문 코노에 미나. …이 거리는 원래 비정한 법이지. 영화에서 그랬어.
- **배치:** 앞이군. 키사키 님의 등은 내가 지킨다.
- **필살기:** '이게 마지막 장면이다'… 아니, 대사가 이게 맞나? 아무튼 간다!
- **승리:** 끝났다. 블랙커피나 한 잔 해야겠군. 누아르 같잖아.
- **전투불능:** 크윽… 멋있게 쓰러지는 장면은… 이게 아닌데….
- **3성:** 3성. 주인공 등급이 된 기분이야. 엔딩 크레딧은 아직 멀었지만.
- **인연:** 선생은 내 영화 이야기를 끝까지 들어 주더군. …다음엔 같이 보러 가자.

#### `u_marina` 이케쿠라 마리나

근거: 붉은겨울 사무국 소속. 학생회장 체리노에게 충성하는 열혈 경비 담당. · 확신도 **중간**

- **영입:** 붉은겨울 사무국 이케쿠라 마리나! 체리노 회장님의 명으로 합류한다!
- **배치:** 앞은 내가 맡는다! 회장님의 혁명을 위해!
- **필살기:** 혁명의 이름으로─ 돌격!
- **승리:** 승리다! 이 소식을 즉시 회장님께 보고하겠다!
- **전투불능:** 회장님… 면목이… 없습니다….
- **3성:** 3성! 회장님께 받을 훈장이 하나 늘었다!
- **인연:** 선생, 회장님 다음으로는 너를 믿어 주지. 이건 대단한 영광이다!

#### `u_atsuko` 하카리 아츠코

근거: 아리우스 스쿼드 소속. 동료들에게 '공주'라 불리며, 말 대신 수화로 의사를 전한다. 사오리가 목숨을 걸고 지켜 온 소녀. · 확신도 **중간**

- **영입:** (수화) 하카리 아츠코. 반가워요, 선생님.
- **배치:** (수화) 여기서 모두를 지킬게요. 이번엔 제가 지킬 차례예요.
- **필살기:** (수화) 다치지 마세요. 제가 막을게요.
- **승리:** (수화) 다 같이 살아 있어요. 그게 제일 기뻐요.
- **전투불능:** (수화) 사오리… 미안해요….
- **3성:** (수화) 조금 더 강해졌어요. 이제 모두에게 기대기만 하지 않아요.
- **인연:** (수화) 선생님은 제 손을 끝까지 봐 주세요. 그래서 말하는 게 무섭지 않아요.

#### `u_hiyori` 츠치나가 히요리

근거: 아리우스 스쿼드 소속 대물 저격수. 비관적이고 자기 비하가 심하지만 잡지(패션·생활지)를 좋아하는 소박한 소녀. · 확신도 **중간**

- **영입:** 츠치나가 히요리예요… 저 같은 걸 뽑아도 괜찮으신 건가요…?
- **배치:** 뒤에서 쏘면 되는 거죠…? 어차피 저는 뒤가 어울려요….
- **필살기 (첫 정기 지원):** 맞아 주세요… 제발… 이번 한 번만이라도…!
- **승리:** 이, 이겼어요…? 이번 달 잡지 살 수 있겠다….
- **전투불능:** 역시… 이렇게 될 줄 알았어요….
- **3성:** 3성이요…? 저한테 이런 좋은 일이… 나중에 벌 받는 거 아닐까요…?
- **인연:** 선생님이 사 주신 잡지, 아직 아껴서 읽고 있어요. 다 읽으면… 아까우니까요.

#### `u_moe` 카제쿠라 모에

근거: SRT 특수학원 RABBIT 소대 소속. 폭발과 화력을 사랑하는 활발한 성격으로 더 큰 폭발을 원한다. · 확신도 **중간**

- **영입:** RABBIT3 카제쿠라 모에! 폭파할 거 있으면 다 불러 줘~!
- **배치:** 후방 포격 위치 좋아! 여기서 다 날려 줄게!
- **필살기 (첫 정기 지원):** 꺄하하! 화력 최대! 전부 불꽃놀이다~!
- **승리:** 이겼다! 근데 폭발이 좀 작았어. 다음엔 더 크게 가자!
- **전투불능:** 에이… 폭발은 내가 일으켜야 하는 건데….
- **3성:** 3성이면 탄약 지급량도 늘려 주는 거지? 그렇지?
- **인연:** 선생, 언젠가 진짜 큰 폭발 같이 보자. …물론 안전하게!

#### `u_saki` 소라이 사키

근거: SRT 특수학원 RABBIT 소대 소속. 규율과 군기를 중시하는 원칙주의자로 군인 같은 말투를 쓴다. SRT 폐교 후에도 SRT의 자부심을 지키려 한다. · 확신도 **중간**

- **영입:** RABBIT2 소라이 사키, 합류합니다! SRT의 규율대로 움직이겠습니다!
- **배치:** 배치 확인! 명령 없이는 한 발짝도 물러서지 않습니다!
- **필살기:** 전원 돌격! SRT의 이름을 걸고!
- **승리:** 작전 종료! 전원 무사, 보고 끝!
- **전투불능:** 큭… 아직 철수 명령은 없었는데….
- **3성:** 3성! SRT 정예라면 이 정도는 당연합니다!
- **인연:** 선생님 지휘 아래라면 SRT가 없어도 우리는 RABBIT 소대입니다. 그건 변하지 않습니다.

#### `u_hoshino` 타카나시 호시노

근거: 아비도스 대책위원회 위원장, 3학년. 늘 졸려하고 느긋하게 '으헤~' 하며 스스로를 '아저씨'라 부르지만, 후배들을 지키는 일에는 누구보다 진지하다. · 확신도 **높음**

- **영입:** 으헤~ 아저씨를 뽑았어? 선생님도 참 물건 볼 줄 아네~.
- **배치:** 제일 앞이구나~. 괜찮아, 방패 드는 건 아저씨 일이니까.
- **필살기:** 후배들한테는… 손가락 하나 못 대게 할 거야.
- **승리:** 끝났다~. 그럼 아저씨는 이제 낮잠 좀 잘게. 으헤~.
- **전투불능:** 으헤… 아저씨도 나이를 먹었나 봐….
- **3성:** 3성이래~. 아저씨가 이렇게 열심히 하면 후배들이 놀랄 텐데.
- **인연:** 선생님, 가끔은 아저씨 대신 후배들을 지켜 줘. …그럼 아저씨도 조금은 쉴 수 있으니까.

#### `u_aru` 리쿠하치마 아루

근거: 게헨나 흥신소68 사장. 하드보일드한 아웃로를 동경하며 폼을 잡지만 늘 계획이 꼬여 당황한다. 회사는 늘 돈이 없다. · 확신도 **높음**

- **영입:** 흥신소68 사장 리쿠하치마 아루. 의뢰라면 받아 주지… 보수는 넉넉하게 부탁해.
- **배치:** 후훗, 이 자리야말로 하드보일드한 사장에게 어울리는 무대야.
- **필살기:** 이게 바로… 아웃로의 방식이다!
- **승리:** 후훗, 완벽한 의뢰 처리였어. 이걸로 이번 달 월세는… 된 거지? 그렇지?
- **전투불능:** 에, 에에엣?! 이건 계획에 없었는데─!
- **3성:** 3성… 후훗, 드디어 진정한 거물이 된 거야! 사원들, 박수!
- **인연:** 선생, 언젠가 흥신소68을 키보토스 제일의 회사로 만들 거야. 그때 첫 번째 고객이 되어 줘.

#### `u_ako` 아마우 아코

근거: 게헨나 선도부 행정관으로 위원장 히나의 보좌를 맡는다. 유능하고 깐깐하며 히나를 열렬히 받든다. · 확신도 **높음**

- **영입:** 선도부 행정관 아마우 아코입니다. 업무 효율, 제가 끌어올려 드리죠.
- **배치:** 후방 지휘 위치 확인. 히나 위원장님이었다면 여기에 두셨을 거예요.
- **필살기 (첫 정기 지원):** 지원 개시. 전원, 제 지시대로 움직이세요!
- **승리:** 작전 완료. 보고서는 히나 위원장님께 먼저 올리겠습니다.
- **전투불능:** 이런… 위원장님께 뭐라고 보고하면….
- **3성:** 3성. 행정관으로서 당연한 성과입니다. …칭찬은 위원장님께 해 주세요.
- **인연:** 선생님이 위원장님의 짐을 덜어 주셔서… 그 점은, 고맙게 생각하고 있어요.

#### `u_neru` 미카모 네루

근거: 밀레니엄 C&C 리더, 콜사인 00. 작은 체구와 달리 거칠고 호전적이며 어린애 취급을 몹시 싫어한다. · 확신도 **높음**

- **영입:** C&C 리더 미카모 네루다. 날 데려갔으면 제대로 써먹어, 선생.
- **배치:** 앞줄? 당연하지. 난 뒤에서 구경하는 체질이 아니야.
- **필살기:** 덤벼! 전부 한꺼번에 상대해 주지!
- **승리:** 시시하군. 다음엔 좀 더 센 놈 불러.
- **전투불능:** 칫… 이걸로 끝난 줄 알지 마….
- **3성:** 3성? 원래 내가 최강이었거든. 이제 숫자가 증명할 뿐이야.
- **인연:** 선생, 날 꼬맹이 취급 안 하는 건 너랑 C&C 녀석들뿐이야. …그러니까 계속 그래라.

#### `u_aris` 텐도 아리스

근거: 밀레니엄 게임개발부 소속. 출신이 수수께끼인 소녀로, 게임으로 세상을 배워 스스로를 '아리스'라는 삼인칭으로 부르며 RPG식 말투를 쓴다. 거대한 레일건을 든다. · 확신도 **높음**

- **영입:** 빠밤빰~♪ 용사 아리스가 파티에 합류했습니다!
- **배치:** 아리스, 이 칸에 장착 완료! 전투 준비 끝입니다!
- **필살기:** 빛이여─! 아리스의 레일건이 적을 섬멸합니다!
- **승리:** 퀘스트 클리어! 경험치를 획득했습니다, 빠밤빰~♪
- **전투불능:** 아리스는… HP가 0이 되었습니다… 부활 아이템이 필요합니다….
- **3성:** 레벨 업! 아리스는 3성 용사로 전직했습니다!
- **인연:** 선생님은 아리스의 파티원입니다. 엔딩까지 같이 가 주세요. 약속입니다!

#### `u_cherino` 렌카와 체리노

근거: 붉은겨울 연방학원 학생회장. 작은 체구의 독재자로 가짜 콧수염을 붙이고 혁명과 '숙청'을 외치지만, 미워할 수 없는 허당이다. · 확신도 **높음**

- **영입:** 붉은겨울 학생회장 렌카와 체리노다! 동지, 혁명에 합류한 것을 환영한다!
- **배치:** 회장이 앞장서는 것은 당연한 일! 콧수염 각도 확인!
- **필살기:** 반동분자들은 전부 숙청이다─!
- **승리:** 혁명은 승리했다! 동지들에게 따뜻한 수프를 배급하라!
- **전투불능:** 이, 이것은 일시적인 후퇴다! 혁명은 끝나지 않았다!
- **3성:** 3성이다! 이제 붉은겨울 역사서에 내 이름을 크게 새겨라!
- **인연:** 선생 동지… 회장도 가끔은 누가 머리를 쓰다듬어 줬으면 할 때가 있다. 지, 지금은 아니다!

#### `u_miyu` 카스미자와 미유

근거: SRT 특수학원 RABBIT 소대의 저격수. 존재감이 옅어 자주 잊히는 것을 서러워하는 소심한 성격이지만 저격 실력은 확실하다. · 확신도 **중간**

- **영입:** 카, 카스미자와 미유예요… 저를 찾아 주셨다니… 처음이에요….
- **배치:** 여기서… 조용히 쏘면 되는 거죠…? 아무도 모르게요….
- **필살기:** 저도… 여기 있어요…! 맞아라…!
- **승리:** 이겼어요… 다들 저도 있었다는 거, 기억해 주실까요…?
- **전투불능:** 역시… 아무도 눈치 못 챘나 봐요….
- **3성:** 3성… 이제 조금은 눈에 띌 수 있을까요…?
- **인연:** 선생님은 항상 저를 먼저 찾아 주세요. 그게… 제일 기뻐요.

#### `u_miyako` 츠키유키 미야코

근거: SRT 특수학원 RABBIT 소대장(RABBIT1). 표정 변화가 적고 진지하지만 대원들을 아끼는 책임감 강한 지휘관. · 확신도 **중간**

- **영입:** RABBIT 소대장 츠키유키 미야코입니다. 선생님의 지휘를 받겠습니다.
- **배치:** 배치 완료. 소대원들의 위치도 확인했습니다.
- **필살기:** RABBIT 소대, 작전 개시. 목표를 제압합니다.
- **승리:** 작전 성공입니다. …표정에 안 드러나도, 기뻐하고 있습니다.
- **전투불능:** 소대원들은… 무사한가요….
- **3성:** 3성. 소대장으로서 더 무거운 책임을 질 수 있게 됐습니다.
- **인연:** 선생님, SRT가 없어져도 저희가 RABBIT 소대일 수 있는 건 선생님 덕분입니다.

#### `u_kanna` 오가타 칸나

근거: 발키리 경찰학교 공안국장. 험상궂은 인상과 집요한 수사로 두려움을 사지만, 경찰로서의 이상을 끝까지 놓지 않는 냉철한 현실주의자. · 확신도 **높음**

- **영입:** 발키리 공안국장 오가타 칸나다. 샬레의 협조 요청, 받아들이지.
- **배치:** 전방을 맡는다. 범인이 도망칠 틈은 주지 않아.
- **필살기:** 공안국의 이름으로 체포한다. 저항은 무의미하다.
- **승리:** 사건 종결. 서류는 내가 처리하지. 선생은 쉬어도 된다.
- **전투불능:** …아직이다. 수사는… 끝나지 않았어….
- **3성:** 3성인가. 공안국장의 책임에 걸맞은 힘이군.
- **인연:** 선생, 나 같은 경찰도 아직 이상을 믿어도 될까. …대답은 천천히 해도 된다.

#### `u_akemi` 쿠리하마 아케미

근거: 칠수인 중 한 명인 전 스케반 두목(원작 NPC). 거구에 거친 외모지만 몸가짐은 우아하다. 중기관총을 '엘리자베스'라 부르고 하늘다람쥐 '샤를'을 키운다. · 확신도 **낮음**

- **영입:** 쿠리하마 아케미라고 해요. 거친 일이라면, 우아하게 처리해 드리지요.
- **배치:** 앞줄이라니 영광이에요. 엘리자베스도 신이 났답니다.
- **필살기:** 엘리자베스, 노래할 시간이에요!
- **승리:** 깔끔하게 끝났네요. 샤를, 오늘 저녁은 호두로 하자꾸나.
- **전투불능:** 어머… 이렇게 품위 없게 쓰러지다니….
- **3성:** 3성이군요. 스케반 시절보다 훨씬 우아해졌다고 생각하지 않으세요?
- **인연:** 선생님은 제 과거를 묻지 않으시네요. 그 배려, 기억해 둘게요.

#### `u_hina` 소라사키 히나

근거: 게헨나 선도부 위원장. 키보토스 최강급 실력자로 냉정하고 책임감이 강하지만, 쌓이는 업무에 늘 지쳐 있다. 선생님 앞에서는 조금 마음을 놓는다. · 확신도 **높음**

- **영입:** 게헨나 선도부 위원장 소라사키 히나. …선생님 일이라면, 시간을 내지.
- **배치:** 앞은 내가 맡을게. 선도부 일보다는 이게 편해.
- **필살기:** …끝내자. 오래 걸리는 건 싫어.
- **승리:** 정리 끝. 선생님… 잠깐만, 여기서 쉬어도 될까.
- **전투불능:** …조금, 지쳤을 뿐이야.
- **3성:** 3성. 이 정도면 업무도 조금은 빨리 끝나려나.
- **인연:** 선생님 앞에서는 위원장이 아니어도 돼서 좋아. …아무한테도 말하지 마.

#### `u_mika` 미소노 미카

근거: 트리니티 티파티의 일원. 밝고 천진한 말투(☆) 뒤에 엄청난 힘을 숨긴 공주 같은 소녀. 과거의 잘못을 마음에 품고 있다. · 확신도 **높음**

- **영입:** 미소노 미카야☆ 선생님이 불러 주다니, 기쁘다~!
- **배치:** 앞줄이지? 맡겨 줘☆ 힘이라면 자신 있으니까!
- **필살기:** 에잇☆ 조금만 세게 갈게!
- **승리:** 이겼다~☆ 선생님, 칭찬해 줘! 많이!
- **전투불능:** 아하하… 역시 나 같은 건… 아, 아니야, 괜찮아….
- **3성:** 3성이야☆ 이제 진짜 공주님 같아 보여?
- **인연:** 선생님은 내가 잘못했던 것까지 다 알면서도 곁에 있어 주잖아. …고마워, 진심이야.

#### `u_himari` 아케보시 히마리

근거: 밀레니엄 베리타스 부장. 스스로를 '초천재 청초 병약 미소녀 해커'라 칭하는 자신만만한 천재. 휠체어를 타고 후방에서 정보전을 지휘한다. · 확신도 **높음**

- **영입:** 초천재 청초 병약 미소녀 해커, 아케보시 히마리가 합류해 드렸습니다.
- **배치:** 후방이야말로 천재의 자리지요. 키보드만 있으면 충분해요.
- **필살기 (첫 정기 지원):** 적 시스템 장악 완료. 역시 저는 천재군요.
- **승리:** 예상대로의 결과예요. 천재의 계산에 틀림이란 없으니까요.
- **전투불능:** 이런… 천재에게도 휴식은 필요한 법이죠….
- **3성:** 3성이라니, 천재의 가치를 이제야 숫자가 따라잡았네요.
- **인연:** 선생님, 천재도 가끔은 누군가에게 기대고 싶답니다. …방금 건 기록하지 마세요.

#### `u_wakamo` 코사카 와카모

근거: 칠수인 중 하나인 '재액의 여우'. 파괴를 즐기는 위험인물이지만 선생님에게만은 맹목적으로 헌신하며 '당신님'이라 부른다. · 확신도 **높음**

- **영입:** 어머, 당신님께서 저를 부르셨나요? 코사카 와카모, 기꺼이 따르겠어요.
- **배치:** 당신님 곁이라면 어디든 좋아요. 후후후….
- **필살기:** 당신님의 앞을 막는 것은… 전부 재가 되어 주세요.
- **승리:** 깨끗해졌네요. 당신님, 칭찬은… 귓속말로 해 주시겠어요?
- **전투불능:** 당신님… 이 와카모를… 잊지 마세요….
- **3성:** 3성… 당신님을 위해 더 아름답게 불태울 수 있겠어요.
- **인연:** 당신님 외에는 아무것도 필요 없어요. 정말로요. 후후, 무서우신가요?

#### `u_rio` 츠카츠키 리오

근거: 밀레니엄 세미나 회장. 감정보다 합리를 앞세우는 냉철한 천재로, 키보토스를 지키기 위해 비밀 프로젝트에 막대한 예산과 자원을 쏟았다. · 확신도 **높음**

- **영입:** 세미나 회장 츠카츠키 리오. 합리적인 선택이었어, 선생님.
- **배치:** 후방 배치. 전체 국면을 계산하기에 최적의 위치야.
- **필살기 (첫 정기 지원):** 변수 제거. 이 전투의 승률은 이제 확정됐어.
- **승리:** 예측 범위 안의 결과야. …그래도, 잘했다고 말해 두지.
- **전투불능:** 계산에… 없던 변수가….
- **3성:** 3성. 투입 자원 대비 효율이 기대치를 넘었어.
- **인연:** 선생님은 내 계산으로 설명이 안 되는 사람이야. …그게 싫지는 않아.

#### `u_kisaki` 류우게 키사키

근거: 산해경 현룡문 문주(학생회장). 고풍스럽고 위엄 있는 말투를 쓰며 큰 그림을 보는 전략가. 동료들을 아끼는 실용주의자. · 확신도 **중간**

- **영입:** 현룡문 문주 류우게 키사키라 하오. 선생과 손을 잡는 것도 나쁘지 않겠지.
- **배치:** 이 몸이 설 자리로는 나쁘지 않군.
- **필살기:** 현룡의 위엄 앞에 고개를 숙이시오.
- **승리:** 대세는 정해졌소. 이 판의 승자는 우리요.
- **전투불능:** 흠… 이 몸도 아직 갈 길이 멀군….
- **3성:** 3성이라… 현룡문 문주에 걸맞은 격이 되었구려.
- **인연:** 선생, 산해경의 아이들을 부탁하오. 이 몸이 직접 부탁하는 일은 드문 법이오.

#### `u_saori` 죠마에 사오리

근거: 아리우스 스쿼드 리더. 엄격하고 무뚝뚝하며 '모든 것은 허무하다'는 가르침 속에서 자랐지만, 동료들, 특히 아츠코를 지키는 것을 최우선으로 한다. · 확신도 **높음**

- **영입:** 죠마에 사오리. 아리우스 스쿼드 리더다. 쓸모 있게 써라, 선생.
- **배치:** 앞은 내가 선다. 뒤에 있는 녀석들에게는 손대게 두지 않아.
- **필살기:** 허무하든 말든… 지금은 쏜다.
- **승리:** 임무 완료. 전원 생존 확인. …그거면 됐어.
- **전투불능:** 아츠코… 다들… 도망쳐….
- **3성:** 3성. 지킬 수 있는 게 늘었다는 뜻이겠지.
- **인연:** 선생, 아르바이트라는 건 아직도 어렵다. …그래도 평범하게 사는 것도 나쁘지 않더군.

#### `u_hikari` 타치바나 히카리

근거: 하이랜더 철도학원 CCC 간부. 노조미의 쌍둥이. 말끝을 길게 늘이며 어린아이처럼 군다. · 확신도 **높음**

- **영입:** 히카리예요~ 하이랜더에서 왔어요~ 선생님, 잘 부탁해요~.
- **배치:** 여기가 제 승강장이에요~? 출발 준비 완료~.
- **필살기:** 급행열차가 지나갑니다~ 비켜 주세요~.
- **승리:** 종착역 도착이에요~. 노조미한테 자랑해야지~.
- **전투불능:** 탈선… 했어요~….
- **3성:** 3성이래요~. 이제 특급 히카리호예요~.
- **인연:** 선생님~ 다음에 노조미랑 셋이서 기차 여행 가요~. 도시락도 챙길게요~.

#### `u_akira` 키요스미 아키라

근거: 칠수인 중 한 명인 괴도(원작 NPC). 예술품과 보물을 가치를 모르는 자에게서 훔치고 예고장을 남긴다. 선생님에게 강하게 집착한다. · 확신도 **낮음**

- **영입:** 예고장대로 찾아왔답니다. 괴도 키요스미 아키라, 오늘은 선생님의 마음을 훔치러 왔어요.
- **배치:** 무대는 여기군요. 막이 오르면, 모든 시선은 저에게.
- **필살기:** 예고한 대로─ 가장 귀한 것을 가져가겠어요!
- **승리:** 훔칠 것은 다 훔쳤네요. 다음 예고장은… 선생님 앞으로 보낼게요.
- **전투불능:** 이런… 괴도가 붙잡히다니, 각본에 없던 결말이에요….
- **3성:** 3성이라니, 이보다 빛나는 보물이 또 있을까요?
- **인연:** 선생님은 제가 훔치지 못한 유일한 보물이에요. 그래서 더 탐나는 거고요.

#### `u_hoshino_armed` 타카나시 호시노 (무장)

근거: 무장한 타카나시 호시노(원작 Armed ver.). 평소의 느긋함을 벗고 산탄총과 방패를 든 전투 태세의 모습. 공격·방어 모드를 전환한다. · 확신도 **중간**

- **영입:** …이번엔 진심이야. 장비 다 챙겨 왔어, 선생님.
- **배치:** 앞은 내가 맡을게. 오늘은 낮잠 없어.
- **필살기:** 후배들한테 다가오지 마. 경고는 한 번뿐이야.
- **승리:** 끝났어. …이제 평소처럼 으헤~ 해도 되겠지?
- **전투불능:** 아직… 지켜야 할 게 남았는데….
- **3성:** 3성. 이 힘이면 다시는 아무것도 잃지 않을 거야.
- **인연:** 선생님, 내가 이렇게 무장하는 날이 적었으면 좋겠어. 그게 평화라는 뜻이니까.

## 10. 추가 테스트 (v2.1 14.2에 이어서)

| 테스트ID | 입력/상황 | 기대결과 |
|---|---|---|
| T61 | 1장 일반 승리, 3연승, 전투 시작 골드 27 | 기본 6 + 승리 1 + 이자 2 + 연승 1 = 10G |
| T62 | 4연패 후 정산 | 연패 보너스 +2G. 승리 1G 없음 |
| T63 | 2성 1코스트 판매 | 3 − 1 = 2G |
| T64 | 레벨 3에서 XP 2 획득 | 레벨 4. 초과분 0 |
| T65 | 2장 일반 패배, 적 전방 2명 생존 | 런 체력 −13 |
| T66 | 한탕 4단계, 전투 시작 골드 56, 승리 | 이자 min(9, floor(56/8)) = 7. 금고 +7 |
| T67 | 한탕 6단계, 같은 조건으로 패배 | 이자 min(12, floor(56/6)) = 9. 금고 적립 없음 |
| T68 | 한탕 6단계, 전투 시작 골드 80, 구성원 ATK 200의 필살기 | 돈다발 폭격 계수 min(80,60)×1.5% = 90% → 적 전방마다 true 180 기준 피해 |
| T69 | 금고 120, 6단계, 대박 발동 | 지급 min(100,120)=100 → ×2 = 200 → 상한 150G 지급, 금고 0 |
| T70 | 금고 털기 직후 새로고침 | 같은 결과. 대박 재추첨 없음 |
| T71 | 같은 장에서 금고 털기 두 번 | 두 번째 명령 거부 |
| T72 | 카이저 론 상환 중 골드 2, 상환액 6 | 골드 0, 런 체력 −4, 남은 상환 횟수 1 감소 |
| T73 | `battleStartGold` 금액 기준을 한탕 외 효과가 사용 | 콘텐츠 검증 실패 |
| T74 | 위기 등급 5, 보스 전투 | 시간 제한 850AV. seed 문자열에 등급 포함 |
| T75 | 인연 포인트: 승리한 전투에 편성 | +1. 대기석 학생은 0 |
| T76 | 대사 파일에서 `bond` 키 누락 | 콘텐츠 검증 실패 |
| T77 | 4배속 재생 | 필살기 대사 생략. 결과 hash는 1배속과 동일 |

정적 검증(v2.1 14.1)의 기대값도 바꾼다: 유닛 60 · 시너지 41 · 장비 12 · 전략 13 · 적 13 · 노드 15 · 부모 효과 304 · 대사 파일 60(각 7키).

## 11. 구현 단계 조정 (v2.1 15장에 추가)

| 단계 | 추가 작업 |
|---|---|
| M1 | 경제 v2.2 수치, 판매 감가, 연승·연패, 정산 수정자 구조, `CASH_OUT_VAULT` 명령, `loans[]` |
| M2.5 (신설) | 유닛 12~15명·시너지 6~8개(한탕 포함)로 1장 수직 슬라이스. 직접 5판 이상 해 보고 재미·속도·경제를 판정한 뒤 M3 진행 |
| M3 | 한탕 3단계·카이저 론 효과 구현, T61~T73 |
| M5 | 대사 표시 계층, 인연·업무 일지·결과 카드 UI |
| M6 | 위기 등급(등급 0 밸런스 합격 후 공개), 주간 작전, 한탕 빌드 골드 기여 측정(3.4의 합격 기준) |

## 12. 출처와 검증 경계

- 원작 설정 확인은 검색 엔진 요약과 다음 2차 자료로 했다. bluearchive.wiki는 자동 접근을 거부(HTTP 403)했고 bluearchive.fandom.com 본문은 열리지 않아(HTTP 402) 직접 읽지 못했다. 공식 게임 내 프로필과 대조한 것은 아니다.
  - 하이랜더 쌍둥이(노조미·히카리)의 소속과 말투: [Moegirl 橘希望](https://zh.moegirl.org.cn/en/%E6%A9%98%E5%B8%8C%E6%9C%9B), [Moegirl 橘光](https://zh.moegirl.org.cn/de/%E6%A9%98%E5%85%89), [굿스마일 넨도로이드 소식](https://aeo.washinmura.jp/ai/goodsmile-info/en/news/2026-05-22-hikari-and-nozomi-from-blue-archives-hig?lang=en)
  - 오토세 코타마(베리타스): [Weiss Schwarz 카드 목록](https://animealley.ca/products/otose-kotama-bav-w112-te12-td-blue-archive), [베리타스 굿즈 목록](https://jumpichiban.com/en-jp/products/blue-archive-chibigurumi-veritas-complete-set-of-4)
  - 칠수인(와카모·아키라·아케미)과 아키라·아케미 설정: [Moegirl 七囚人](https://zh.moegirl.org.cn/en/%E4%B8%83%E5%9B%9A%E4%BA%BA), [Fandom Kiyosumi Akira](https://bluearchive.fandom.com/wiki/Kiyosumi_Akira), [Fandom Kurihama Akemi](https://bluearchive.fandom.com/wiki/Kurihama_Akemi), [Villains Wiki Akemi Kurihama](https://villains.fandom.com/wiki/Akemi_Kurihama)
  - 코마카제 라부(헬멧단): [Fandom Komakaze Rabu](https://bluearchive.fandom.com/wiki/Komakaze_Rabu)
  - 무장 호시노: [Fandom Takanashi Hoshino (Armed ver.)](https://bluearchive.fandom.com/wiki/Takanashi_Hoshino_(Armed_ver.))
  - 산해경(슌·코코나·키사키·미나): [TV Tropes 산해경](https://tvtropes.org/pmwiki/pmwiki.php/Characters/BlueArchiveShanhaijingSeniorSecondarySchool), [Pixiv 백과 近衛ミナ](https://dic.pixiv.net/en/a/Konoe+Mina), [Moegirl 龍華妃咲](https://mzh.moegirl.org.cn/en/%E9%BE%99%E5%8D%8E%E5%A6%83%E5%92%B2)
  - 붉은겨울(체리노·마리나·노도카·모미지): [BreezeWiki Nodoka Amami](https://breezewiki.discard.no/hero/wiki/Nodoka_Amami), [Pocket Gamer 마리나 업데이트](https://www.pocketgamer.com/blue-archive/marina-update), [Fandom 지식해방전선](https://bluearchive.fandom.com/wiki/Knowledge_Liberation_Front), [Anibase Akiizumi Momiji](https://anibase.net/en/character/l9o0o/Akiizumi-Momiji)
  - 발키리(칸나 등): [Moegirl 尾刃神奈](https://zh.moegirl.org.cn/en/%E5%B0%BE%E5%88%83%E7%A5%9E%E5%A5%88), [TV Tropes 발키리 경찰학교](https://tvtropes.org/pmwiki/pmwiki.php/Characters/BlueArchiveValkyriePoliceAcademy)
  - 아비도스 대책위원회와 빚 배경: [TV Tropes 아비도스](https://tvtropes.org/pmwiki/pmwiki.php/Characters/BlueArchiveAbydosHighSchool), [Wikipedia Blue Archive](https://en.wikipedia.org/wiki/Blue_Archive)
- 검색 결과에 팬 제작 AI 캐릭터 페이지(shapes.inc 등)가 많이 섞여 있었다. 이런 페이지에만 나오는 설정(예: 미유가 쓰레기통에 숨는다)은 대사에 쓰지 않았다.
- 위 목록에 없는 학생의 설정은 널리 알려진 원작 설정을 바탕으로 썼고, 이번 세션에서 학생별로 따로 검색해 확인하지는 않았다. 각 학생 머리의 확신도가 그 차이를 표시한다.
- 2차 창작 가이드라인: 이번 검색에서 원작사의 공식 팬 창작 가이드라인 원문을 찾지 못했다. 공개 배포 전에 공식 사이트에서 직접 확인해야 한다.
- 경제 검산은 1.5의 단순 봇 결과다. 정식 밸런스 판정은 v2.1 14.3의 시뮬레이션과 플레이테스트로 한다.
