# 게임 개발 스킬 모음 — 설명과 사용법

기획서를 첨부해 게임을 빌드할 때 쓰는 Claude Code 스킬 모음. 기존 스킬 3개(`game-blueprint`, `self-check`, `redesign`)에
공개 저장소 9곳에서 고른 스킬 52개를 더했다. 모두 `.claude/skills/<이름>/SKILL.md`에 있어 이 저장소에서 Claude Code를 열면 바로 쓰인다.

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
| `webgpu-ui-fx` | DOM 화면 위 WebGPU·HTML-in-Canvas 셰이더 연출(등급별 폴백, 유체·박막·파편 전환) | 이 저장소(키보토스) |
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

### 게임 UI/UX 디자인 전문
| 스킬 | 하는 일 | 출처 |
|---|---|---|
| `game-ui-design` | 게임 UI 전문가. HUD·체력바·미니맵·조준점·데미지 숫자·쿨다운·원형 메뉴·화면 속 UI·컨트롤러/터치. 참고 문서 3개: 만드는 법(`patterns`), 흔한 실패(`sharp_edges`), 검증 규칙(`validations`) | skills-for-antigravity |
| `game-ux-designer` | 온보딩(플레이어 유형별), 화면별 UI 명세 양식, 사용성 테스트, 색약 모드. 서브에이전트(fork)로 돈다 | AlterLab GameForge |
| `game-accessibility-specialist` | 게임 접근성 감사: 운동·시각·청각·인지 각 25점, 보정 옵션 표, EAA·CVAA 대응 | AlterLab GameForge |
| `ux-designer` | 일반 UX 지침 + 참고 문서 30개(모바일 UX, WCAG 2.2, 문구, 온보딩, 다국어, 알림 등). 검토·제작·조언 세 모드 | szilu/ux-designer-skill |
| `ui-ux-pro-max` | 스타일 79종·팔레트 192개·글꼴 조합 74개·UX 지침 119개를 검색하는 로컬 데이터. 웹 게임의 메뉴·소개 페이지 디자인 시스템 뽑기용 (Python 3 필요, 외부 패키지 없음) | ui-ux-pro-max-skill |

| `impeccable` | 디자인 감독 스킬. 제품 정보 인터뷰(PRODUCT.md) → 무작위 방향 배정(concept-seed)으로 뻔한 디자인 회피 → 제작 → 자동 검사기(AI 티 나는 패턴 27종) → 마감 검토 에이전트 → DESIGN.md 기록. 명령 23개(`critique`, `audit`, `polish`, `typeset`, `layout`, `bolder`, `quieter` 등) | pbakaus/impeccable |

`impeccable` 쓰는 법
- `/impeccable` — 상황에 맞는 명령 메뉴. 새 화면은 그냥 "메인 화면 디자인해 줘"라고 하면 인터뷰부터 시작한다.
- `/impeccable critique <파일>`, `/impeccable audit <파일>`, `/impeccable polish <파일>` — 기존 화면 검토·감사·마감.
- 자동 검사기만 돌리기: `.claude/skills/impeccable/scripts/impeccable detect <파일 또는 폴더>`
- 처음 실행할 때 보조 실행 파일을 공식 GitHub 릴리스에서 받는다(sha256 검증). Node 불필요.
- 파일을 고칠 때마다 검사기가 자동으로 도는 훅은 **꺼 둔 상태**다. 켜려면 `/impeccable hooks on`.
- 보조 에이전트 4개(`impeccable-finish-reviewer` 등)는 `.claude/agents/`에 있다. 설치 후 새로 연 세션부터 잡힌다.

`ui-ux-pro-max` 직접 검색 예: `python3 .claude/skills/ui-ux-pro-max/scripts/search.py "dark gothic game menu" --design-system -p "게임 이름"`

**요청 예시**
- "메인 화면 HUD 구성 잡아 줘" → `game-ui-design`, `game-ui-ux`
- "전투 화면 UI 명세서 써 줘", "튜토리얼 흐름 설계해 줘" → `game-ux-designer`
- "접근성 감사해 줘", "색약 모드 넣자" → `game-accessibility-specialist`
- "이 메뉴 화면 스크린숏 리뷰해 줘" → `ux-designer`, `game-ui-design`
- "타이틀 화면 색·글꼴 조합 추천" → `ui-ux-pro-max`, `frontend-design`

### 한국어 문장 다듬기 (AI 문체 제거)
| 스킬 | 하는 일 | 출처 |
|---|---|---|
| `humanize-korean` (= `/humanize`) | AI가 쓴 한국어의 티(번역투, 피동 남용, 접속사 남발, 기계적 나열, 쉼표 과다, 균일한 리듬 등 10개 분류 85종)를 찾아 내용은 그대로 두고 문체만 고친다. 글 상태에 따라 가벼움·표준·정밀 경로를 고르고, 의미 보존과 변경 비율을 스크립트로 검사한다 | im-not-ai |
| `humanize-scan` | 고치기 전에 AI 티가 얼마나 있는지만 재고 몇 문장을 시범으로 고쳐 보여 준다. 파일을 만들지 않는다 | im-not-ai |
| `humanize-redo` | 직전 윤문을 특정 분류만, 또는 강도를 바꿔 다시 돌린다 | im-not-ai |

보조 에이전트 4개(`humanize-monolith`·`humanize-diagnostician`·`humanize-finalizer`·`korean-ai-tell-taxonomist`)는 `.claude/agents/`에 있다. 작업 기록은 실행한 폴더의 `_workspace/`에 쌓인다.

**게임 대사·지문에 쓸 때 (중요)**

이 스킬은 에세이·칼럼·리포트용이라 소설·게임 장르 규칙이 없다. 그대로 돌리면 의도한 구어체나 문학적 문장까지 '고칠 것'으로 볼 수 있다. 다음 조건을 붙여 부른다.
- 지문(서술)만 대상으로 한다. 대사는 따옴표 안을 한 글자도 바꾸지 않게 한다.
- 보수적으로, 문학적 문체·비유·의도된 문장 끊김은 유지하라고 명시한다.
- 바뀐 결과는 원문과 나란히 비교하고, 대사가 바뀌었으면 되돌린다.

요청 예시
- "이 사건 지문 AI 티 있나 봐줘" → `humanize-scan`
- "/humanize 가볍게. 지문만 윤문하고 대사(따옴표 안)는 한 글자도 바꾸지 마. 문학적 문체는 유지." → `humanize-korean`
- "방금 결과에서 번역투 분류만 다시" → `humanize-redo`

이 운용 방식은 한국어 소설 도구 [novel_worker](https://github.com/ilhae-ai/novel_worker)의 `/novel-humanize`가 im-not-ai를 쓰는 방식을 따랐다. 대사의 캐릭터별 말투를 맞춰 주는 스킬은 아직 없다.

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
| [omer-metin/skills-for-antigravity](https://github.com/omer-metin/skills-for-antigravity) | e8dcf4e | Apache-2.0 (`_licenses/`) | game-ui-design |
| [AlterLab-IEU/AlterLab_GameForge](https://github.com/AlterLab-IEU/AlterLab_GameForge) | 5f5148d | MIT (`_licenses/`) | game-ux-designer, game-accessibility-specialist |
| [szilu/ux-designer-skill](https://github.com/szilu/ux-designer-skill) | c869d32 | MIT (`_licenses/`) | ux-designer |
| [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | 623a9a9 | MIT (`_licenses/`) | ui-ux-pro-max |
| [epoko77-ai/im-not-ai](https://github.com/epoko77-ai/im-not-ai) | b37e020 | MIT (`_licenses/`) | humanize-korean, humanize, humanize-scan, humanize-redo + `.claude/agents/` 4개 (공식 `install.sh --copy`로 설치) |
| [pbakaus/impeccable](https://github.com/pbakaus/impeccable) | 8644175 | Apache-2.0 (`_licenses/`) | impeccable + `.claude/agents/impeccable-*` 4개 |

수정한 곳: `router/SKILL.md` 맨 위에 "이 저장소에서는 스킬이 `.claude/skills/<이름>/`에 평평하게 설치돼 있다"는 안내를 덧붙였다. 또 다음을 고쳤다.
- `game-ux-designer`·`game-accessibility-specialist`: 원본 저장소의 `docs/` 문서(게임 디자인 이론 등)를 각 스킬의 `references/`에 함께 넣고 경로를 바꿨다.
- `ui-ux-pro-max`: 플러그인용 경로(`${CLAUDE_PLUGIN_ROOT}/...`)를 이 저장소 경로(`.claude/skills/ui-ux-pro-max/scripts/search.py`)로 바꾸고, 개발용 `scripts/tests/`는 뺐다.

나머지는 원본 그대로다.

## 넣지 않은 것과 더 받는 법

- **Godot·Unity·Unreal·Roblox 등 다른 엔진 스킬**: 기획서가 그 엔진이면 `npx skills add gamedev-skills/awesome-gamedev-agent-skills`로 전체 74개를 받는다.
- **Phaser 공식 스킬 28종** (`phaserjs/phaser`의 `skills/`): Phaser를 깊게 쓸 때 추가. 여기선 `phaser-core`·`phaser-arcade-physics`와 겹쳐 뺐다.
- **[Claude-Code-Game-Studios](https://github.com/Donchitos/Claude-Code-Game-Studios)**, **[gstack-game](https://github.com/fagemx/gstack-game)**: 스튜디오형 통합 체계라 스킬이 자체 스크립트·훅·문서 폴더에 묶여 있어, 일부만 떼어 오면 동작하지 않는다. 쓰려면 각 저장소의 설치 안내대로 통째로 설치한다.
- **Anthropic의 docx·pdf 스킬**: 재배포가 허용되지 않는 라이선스라 넣지 않았다. claude.ai·Claude Code에 기본 제공되는 문서 스킬로 .docx·.pdf 기획서를 읽을 수 있다.
