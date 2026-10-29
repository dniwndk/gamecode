# 변경표 — 원안 v2.0 → v2.1 → v2.2, 그리고 카탈로그 반영 위치

M0 합격 기준의 "변경표"다. 각 변경이 콘텐츠 카탈로그(`src/content/*.json`)에 이미 들어갔는지, 아니면 엔진 규칙이라 해당 단계에서 구현·테스트해야 하는지를 적는다.
"검사" 열은 그 사실을 지키는 자동 검사다.

## v2.0 → v2.1 (GDD v2.1 1.2 결함 표)

| ID | 바뀐 것 | 카탈로그 | 엔진 단계 | 검사 |
|---|---|---|---|---|
| A01 | 능력 본문 실행 → 완료 이벤트 → 반응 순서 | `effects.execution`이 ability_*와 *_container로 갈림 | M2 ActionResolver | 검증기 EFFECT_KIND |
| A02 | 가상 연산 폐기, 9장 연산으로 변환 | 모든 효과 `spec_only`, 본문은 명세로만 | M3 | 검증기 PLACEHOLDER, `--require-implemented` |
| A03 | `eff_aris_passive` 복구, 전방 바인딩 | C.300, 아리스 `frontEffects` | M3 | pack.test T29 |
| A04 | 미유·키사키 공통 반응을 구역마다 한 번 | 두 유닛 `frontEffects`·`rearEffects`에 같은 `*_rear_react`, scope `both` | M3 | 검증기 DOUBLE_BINDING, pack.test T30 |
| A05 | 개인 차례와 100AV 전역 주기 분리 | rules `battle.globalPulseAv: 100` | M2 | (M2 T18) |
| A06 | 후방 반응 8개의 쿨다운 2턴 | 효과 `limits` 문장 | M3 | (M3 T10) |
| A07 | 디버프 감지·에너지 감소·쿨다운 감소 엔진 확장 | — | M2/M3 | (M3) |
| A08·A09 | 동시 성립 불가 빌드를 갈래로 분리 | 추천 빌드는 M0 범위 밖(부록 F·v2.2 7장) | M6 | — |
| A10 | 실제 집계로 활성 단계 교체 | 시너지 `documented` 값을 유닛 데이터로 재집계 | — | 검증기 SYNERGY_COMPOSITION |
| A11 | 아비도스·백귀 최고 단계 5, `_6` ID 보존 | `syn_abydos`·`syn_hyakkiyako` 마지막 단계 threshold 5 | — | pack.test T33 |
| A12 | 첫 예약 당기기와 자기 차례 임시 조정 분리 | — | M2 | (M2 T15·T16) |
| A13 | 도발은 피도발자의 `tauntedBy`로 | 상태 `st_taunt` 규칙 문장 | M2 | (M2 T19·T20) |
| A14 | 후속 공격 관찰 제한 허용 | 장비·전략 효과 문장 | M3 | (M3 T26·T27) |
| A15 | 누락 계수·지속 확정 | 효과 문장 + 10장 | M3 | — |
| A16 | `node_scaled`는 HP/ATK만 배율 | `nodes.statScaleBps` | M2 | pack.test (1-1 = 0.85) |
| A17 | 비나 열선 = 기본 행동 | 적 `effectIds` | M3 | — |
| A18 | 근거 없는 "검증 100%" 주장 제거 | 진행 현황에 실측만 기록 | 전 단계 | IMPLEMENTATION_STATUS |
| A19 | 기능이 다른 대체 추천 제거 | 유닛 `role`만 보존 | — | — |
| A20 | 태그는 팬게임 전술 분류 | — | — | — |

## v2.1 → v2.2 (개정안)

| 영역 | 바뀐 것 | 카탈로그 위치 | 엔진 단계 | 검사 |
|---|---|---|---|---|
| 경제 | 시작 체력 80, 수입 6/7/8G, 연승·연패 보너스, XP 2/6/10/18/26/34/42, 전투 XP 3 | `rules.json` run·income·xp | M1 | pack.test 규칙 수치 |
| 판매 | 2성 이상 1G 감가 | `rules.sell` | M1 | (M1 T63) |
| 패배 피해 | 장 기본 6/9/12 + 남은 적 전방 ×2 + 정예 3/보스 6 | `rules.defeatDamage` | M4 | pack.test, (M4 T65) |
| 설정 | 코타마 이름·태그, 노조미·히카리 백귀 제거, 사키·아코·히요리·아루·아야네·리오 태그 | `units.json` name·synergyIds | — | pack.test "원작 설정 수정" |
| 시너지 | `syn_jackpot` 신설(2/4/6), 41종 재집계 | `synergies.json`, 효과 `eff_syn_jackpot_2/4/6` | M1(정산 수정자)·M3 | pack.test 한탕, 검증기 재집계 |
| 전략 | `str_kaiser_loan` 신설 | `strategies.json`, `eff_str_kaiser_loan` | M1(loans[])·M3 | pack.test 카이저 론 |
| 대사 | 60명 × 7상황 | `dialogue.ko.json` (원본 `docs/dialogue/ko/`) | M5 표시 | 검증기 DIALOGUE_KEY, pack.test T76 |
| 리플레이 | 위기 등급·인연·업무 일지·주간 작전·해금 | M0 카탈로그 밖(개정안 8장) | M5·M6 | — |
| 단계 | M2.5 수직 슬라이스 신설 | — | M2.5 | — |
