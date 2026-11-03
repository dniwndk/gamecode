---
name: topdown-action-combat
description: 하데스식 탑뷰(쿼터뷰) 도트 액션·로그라이크의 전투 손맛(히트스톱, 화면 흔들림, 넉백, 대시 캔슬, 입력 버퍼, 콤보 프레임)을 설계·구현·튜닝할 때 사용. 유니티 프로토타입 코드, 브라우저 테스트판, 수치표, 레퍼런스, 발전 로드맵, 단계별 추천 스킬·MCP가 들어 있다.
---

# 탑뷰 액션 전투 키트

하데스 같은 탑뷰 액션의 **전투 손맛**을 빠르게 세우고, 로그라이크로 키워 가기 위한 키트.
하데스는 설계 참고용이다. 이름·캐릭터·아트·음악·고유 시스템 명칭은 쓰지 않고 자체 세계관으로 만든다.

## 들어 있는 것

| 경로 | 내용 |
| --- | --- |
| `assets/unity/*.cs` | 유니티 프로토타입 10개 파일 (Unity 6 / 2022.3, 새·구 Input 모두, 내장·URP 파이프라인 모두, 패키지 의존성 없음) |
| `assets/web/combat-feel-lab.html` | 같은 로직의 브라우저판 (캔버스 320×180, 유니티 없이 테스트) |
| `references/feel-numbers.md` | 프레임 수치표와 구현 원칙 6개 |
| `references/reference-library.md` | GDC·인터뷰·픽셀 탑뷰 사례·유니티 도구 링크 |
| `references/skills-and-mcp.md` | 이 저장소 스킬 + 외부 스킬·MCP 카탈로그 (유니티 MCP, Aseprite, 사운드, 설계) |
| `references/roadmap.md` | 전투 → 로그라이크 루프 → 메타 진행 → 아트·사운드 → 다듬기, 단계별 완료 기준과 추천 스킬 |

## 사용 순서

1. **손맛부터 확인**: `assets/web/combat-feel-lab.html`을 브라우저로 열거나, 유니티에서 `assets/unity/*.cs`를 `Assets/CombatPrototype/Scripts/`에 넣고 빈 씬의 빈 GameObject에 `CombatBootstrap`을 붙여 Play.
   숫자 키 1~9로 히트스톱·셰이크·넉백·플래시·입력 버퍼·대시 캔슬·에임 보정·스파크·사운드를 하나씩 끄며 비교, T 슬로모션, R 리셋.
2. **수치 튜닝**: 플레이 중 `CombatTuning` 인스펙터(웹판은 슬라이더). 기준값은 `references/feel-numbers.md`.
3. **확장**: `references/roadmap.md`의 다음 단계를 고르고, 그 표의 🔧 스킬을 함께 읽는다.
4. **에셋 연결**: 도트 이펙트는 `pixelfx` 스킬, 캐릭터 도트는 Aseprite MCP, 효과음은 `audio-design` + 사운드 MCP.

## 지켜야 할 손맛 원칙 (프로토타입에 구현됨)

1. 히트스톱은 `Time.timeScale`을 건드리지 않고 공격자·피격자만 멈춘다. 멈춘 동안에도 입력은 버퍼에 쌓인다.
2. 넉백은 히트스톱이 끝난 뒤 적용한다.
3. 피격자는 히트스톱 동안 1px 진동, 흰색 실루엣 플래시는 히트스톱 + 3프레임.
4. 공격은 선딜/판정/후딜 프레임 데이터. 다음 타와 대시 캔슬은 후딜(대시는 선딜도)에서만, 판정 프레임은 지킨다.
5. 입력 버퍼 0.15초. 끄면 정확한 프레임 입력이 필요해 콤보가 끊기는 걸 비교할 수 있다.
6. 화면 흔들림은 픽셀 단위, 첫 프레임은 타격 방향으로 밀고 이후 교차·k² 감쇠. 카메라는 16 PPU 그리드에 스냅.
7. 적 공격은 예고 → 공격 → 빈틈 3박자. 플레이어가 대시 무적으로 피할 수 있어야 한다.

## 코드 구조 (유니티)

- `CombatBootstrap` 카메라(320×180 ortho)·아레나·플레이어·적을 코드로 생성. URP 2D에서 라이트가 없으면 Global Light 2D 추가.
- `CombatTuning` 모든 수치·토글. `AttackData`(startup/active/recovery/damage/range/arc/knockback/hitstop/shake/lunge/heavy).
- `Combatant` 논리 좌표, 개별 프리즈, 지연 넉백, 플래시, 아레나 클램프, y 정렬. `PreTick`(멈춰도 실행: 입력) / `Tick`(멈추면 정지).
- `PlayerController` Free/Attack/Dash 상태 기계, `Consume()`로 버퍼 입력 소비, 에임 보정.
- `Enemy` Chase → Windup(깜빡임) → Lunge → Recover, 피격 시 Stagger, 허수아비 모드.
- `Feel` 타격 이벤트 한곳 처리(히트스톱·플래시·넉백·셰이크·스파크·사운드), 카메라, 토글 키, HUD.
- `PixelArt`·`SfxGen`·`FxBits` 코드로 만든 임시 도트·효과음·파티클 (실제 에셋으로 교체할 자리).

다음 개선 후보: 파티클 풀링, Aseprite 태그 → 선딜/판정/후딜 자동 매핑, AttackData를 ScriptableObject로 분리, 무기 교체.

## 원본 위치

- GitHub: `dniwndk/gamecode` 저장소 `.claude/skills/topdown-action-combat/` (브랜치 `claude/project-thread-onvk1j`)
- 브라우저판: https://claude.ai/artifact/TVV9rTQN52Kv1xJ2wunk72
- 레퍼런스 문서: https://claude.ai/artifact/KuTtqqHdhSErEv1atp5tGH
