# 게임 개발 스킬 모음 — 설명과 사용법

기획서를 첨부해 게임을 빌드할 때 쓰는 Claude Code 스킬 모음. 기존 스킬 3개(`game-blueprint`, `self-check`, `redesign`)에
공개 저장소 3곳에서 고른 스킬 42개를 더했다. 모두 `.claude/skills/<이름>/SKILL.md`에 있어 이 저장소에서 Claude Code를 열면 바로 쓰인다.

## 쓰는 법

- **자동**: 요청에 맞는 스킬을 Claude가 설명(`description`)을 보고 골라 읽는다. "타워 디펜스 만들어줘"라고만 해도 `tower-defense`가 걸린다.
- **직접 호출**: `/스킬이름`으로 부른다. 예: `/router`, `/game-blueprint`, `/self-check`.
- **기획서 첨부**: 기획서 파일(.md·.docx·.pdf 등)을 저장소에 넣거나 대화에 첨부하고 아래 「추천 흐름」의 첫 문장처럼 요청한다.

## 추천 흐름: 기획서 → 게임

| 순서 | 할 일 | 스킬 | 요청 예시 |
|---|---|---|---|
| 1 | 기획서 읽고 모호점 정리 | `brainstorming` | "첨부한 기획서 끝까지 읽고 모호한 점을 질문해 줘" |
| 2 | 엔진·장르·작업 판별 | `router` | "/router 이 기획서로 만들려면 어떤 스킬이 필요해?" |
| 3 | 설계 1장 + 완료 기준 | `game-blueprint` | "기획서를 game-blueprint 형식 설계서로 정리해 줘" |
| 4 | 구현 계획 쪼개기 | `writing-plans` | "설계서대로 구현 계획을 작업 단위로 써 줘" |
| 5 | 1시간짜리 시제품 | `prototype-fast` | "핵심 루프만 회색 상자로 먼저 돌려 보자" |
| 6 | 계획대로 구현 | `executing-plans` / `subagent-driven-development` + 장르·엔진 스킬 | "계획 1~5번 작업 진행해 줘" |
| 7 | 손맛·화면·소리 | `game-feel`, `game-ui-ux`, `audio-design`, `create-game-assets` | "타격감 올리고 HUD를 휴대폰에서도 맞게" |
| 8 | 검수·버그 | `self-check`, `webapp-testing`, `systematic-debugging` | "완료 기준 전부 테스트하고 통과할 때까지 고쳐 줘" |
| 9 | 완료 선언 전 증거 | `verification-before-completion` | (자동 — 테스트 출력 없이 "됐다"고 말하지 않게 함) |
| 10 | 배포 | `itch-publish` (또는 이 저장소의 GitHub Pages) | "itch.io에 HTML5 빌드로 올려 줘" |

## 스킬 목록

### 기획·진행 관리
| 스킬 | 하는 일 | 출처 |
|---|---|---|
| `game-blueprint` | 코드 전에 기획서 1장(유닛·자원·AI·조작·화면·완료 기준·성능 상한) 확정, 승인 후 코딩 | 기존 |
| `brainstorming` | 만들기 전에 질문으로 요구를 다듬고 설계 문서로 확정 (`docs/superpowers/specs/`) | superpowers |
| `writing-plans` | 설계를 2~5분 단위 작업과 검증 명령이 붙은 구현 계획으로 (`docs/superpowers/plans/`) | superpowers |
| `executing-plans` | 계획을 작업별로 직접 실행·검증하며 진행 | superpowers |
| `subagent-driven-development` | 작업마다 서브에이전트에 구현시키고 리뷰 단계를 거침 (큰 기획서용) | superpowers |
| `prototype-fast` | 한 시간 안에 "재밌나?"를 확인하는 회색 상자 시제품, 유지/폐기 기준 | awesome-gamedev |
| `game-jam` | 마감이 정해진 빌드: 시간표, 범위 자르기, 제출 | awesome-gamedev |

### 엔진 판별·웹 엔진
| 스킬 | 하는 일 | 출처 |
|---|---|---|
| `router` | 프로젝트와 요청을 보고 엔진·분야·장르 스킬을 최소한으로 골라 줌. **어떤 스킬을 쓸지 모를 때 여기서 시작** | awesome-gamedev |
| `phaser-core` | Phaser 4 게임 설정, 씬 수명주기, 에셋 로더, 카메라 | awesome-gamedev |
| `phaser-arcade-physics` | Phaser 아케이드 물리: 속도·중력·충돌·겹침 | awesome-gamedev |
| `pixijs-rendering` | PixiJS v8 렌더 계층: Application, Assets, Container/Sprite, ticker | awesome-gamedev |
| `threejs-scene-setup` | three.js 씬·카메라·렌더러·루프·리사이즈 | awesome-gamedev |
| `threejs-gltf-loading` | glTF/GLB 모델과 애니메이션 불러오기 | awesome-gamedev |
| `threejs-materials-lighting` | PBR 재질, 조명, 그림자, 환경맵 | awesome-gamedev |

### 장르 플레이북 (기획서 장르에 맞는 것 하나)
`platformer` 플랫포머 · `roguelike` 로그라이크 · `rpg` RPG · `fps-shooter` FPS · `tower-defense` 타워 디펜스 ·
`card-game` 카드·덱빌딩 · `visual-novel` 비주얼 노벨·텍스트 분기 · `survival-crafting` 생존·제작 · `puzzle` 퍼즐(매치3·소코반) — 모두 awesome-gamedev.
각 스킬은 그 장르의 핵심 루프, 필수 시스템, 흔한 실수를 담고 있다.

### 시스템 설계 (엔진 무관)
| 스킬 | 하는 일 |
|---|---|
| `game-ai` | 상태 기계, 행동 트리, 조향, A* 길찾기 |
| `procedural-gen` | 시드 고정 난수, 노이즈 지형, 던전 생성, 가중치 드롭 표 |
| `level-design` | 화이트박스→플레이 가능, 긴장·휴식 곡선, 핵심 경로, 전투 배치 |
| `dialogue-systems` | 분기 대화 그래프, 조건·변수, Ink/Yarn 또는 자체 데이터 실행기 |
| `save-systems` | 저장 대상 선정, 슬롯, 안전한 쓰기, 스키마 버전·이전 판 변환, 자동 저장 |
| `input-systems` | 행동 매핑, 키 재설정, 키보드·게임패드·터치, 입력 버퍼 |
| `camera-systems` | 2D 추적(데드존·선행), 3D 궤도·1인칭, 흔들림 연결 |
| `physics-tuning` | 고정 타임스텝, 보간, 터널링 방지, 떨림 잡기 |

이상 모두 awesome-gamedev.

### 손맛·화면·아트·소리
| 스킬 | 하는 일 | 출처 |
|---|---|---|
| `game-feel` | 화면 흔들림, 히트스톱, 이징, 찌그러짐, 넉백 — "타격감" | awesome-gamedev |
| `game-ui-ux` | HUD·메뉴, 해상도·비율·안전 영역, 포커스 이동, 이벤트 기반 HUD 갱신 | awesome-gamedev |
| `audio-design` | 버스·믹서, 더킹, 적응형 음악, 효과음 변주 | awesome-gamedev |
| `create-game-assets` | 아트 디렉션·스타일 문서, 스프라이트·타일셋·아이콘 제작과 검증 | awesome-gamedev |
| `frontend-design` | 템플릿처럼 보이지 않는 UI 미감·타이포그래피 | Anthropic 공식 |
| `algorithmic-art` | p5.js 시드 기반 생성 아트 (배경·타이틀·절차적 그림) | Anthropic 공식 |
| `redesign` | 랜딩 페이지(게임 소개 페이지) 고급화 | 기존 |

### 품질·검수·배포
| 스킬 | 하는 일 | 출처 |
|---|---|---|
| `self-check` | 완료 기준을 테스트로 바꿔 실제 실행, progress.txt 기록, 전부 통과까지 수정 | 기존 |
| `webapp-testing` | Playwright로 로컬 웹 게임 열기·클릭·스크린숏·콘솔 로그 (`scripts/with_server.py`) | Anthropic 공식 |
| `test-driven-development` | 실패하는 테스트 먼저 → 구현 → 정리 | superpowers |
| `systematic-debugging` | 추측 수정 금지, 근본 원인 추적 4단계 | superpowers |
| `verification-before-completion` | 검증 명령 출력 없이 "완료"라고 말하지 않음 | superpowers |
| `performance-optimization` | 측정 먼저, 프레임 예산, 그리기 호출·풀링·GC | awesome-gamedev |
| `itch-publish` | itch.io 페이지와 butler 업로드 | awesome-gamedev |

## 출처와 라이선스

| 출처 | 커밋 | 라이선스 | 가져온 스킬 |
|---|---|---|---|
| [gamedev-skills/awesome-gamedev-agent-skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills) | 38a4c25 | Apache-2.0 (`_licenses/`) | router + 31개 |
| [obra/superpowers](https://github.com/obra/superpowers) | 2ce8aa1 | MIT (`_licenses/`) | 7개 |
| [anthropics/skills](https://github.com/anthropics/skills) | dbd4588 | Apache-2.0 (각 폴더 LICENSE.txt) | 3개 |

수정한 곳: `router/SKILL.md` 맨 위에 "이 저장소에서는 스킬이 `.claude/skills/<이름>/`에 평평하게 설치돼 있다"는 안내를 덧붙였다. 나머지는 원본 그대로다.

## 넣지 않은 것과 더 받는 법

- **Godot·Unity·Unreal·Roblox 등 다른 엔진 스킬**: 기획서가 그 엔진이면 `npx skills add gamedev-skills/awesome-gamedev-agent-skills`로 전체 74개를 받는다.
- **Phaser 공식 스킬 28종** (`phaserjs/phaser`의 `skills/`): Phaser를 깊게 쓸 때 추가. 여기선 `phaser-core`·`phaser-arcade-physics`와 겹쳐 뺐다.
- **[Claude-Code-Game-Studios](https://github.com/Donchitos/Claude-Code-Game-Studios)**, **[gstack-game](https://github.com/fagemx/gstack-game)**: 스튜디오형 통합 체계라 스킬이 자체 스크립트·훅·문서 폴더에 묶여 있어, 일부만 떼어 오면 동작하지 않는다. 쓰려면 각 저장소의 설치 안내대로 통째로 설치한다.
- **Anthropic의 docx·pdf 스킬**: 재배포가 허용되지 않는 라이선스라 넣지 않았다. claude.ai·Claude Code에 기본 제공되는 문서 스킬로 .docx·.pdf 기획서를 읽을 수 있다.
