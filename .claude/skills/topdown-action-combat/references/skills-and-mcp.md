# Claude 스킬·MCP 카탈로그 (2026-11-03, 스타는 GitHub 기준)

설치 전 README와 권한 범위를 확인한다. 에디터를 조작하는 MCP는 버전 관리된 프로젝트에서만 쓴다.
MCP 등록: `claude mcp add <이름> -- <실행 명령>` / 플러그인: `claude plugin install <이름>@<마켓>`.

## A. 이 저장소(gamecode)에 이미 있는 스킬 — `.claude/skills/`

| 단계 | 스킬 |
| --- | --- |
| 손맛 | `game-feel`(셰이크·히트스톱·이징·넉백), `pixelfx`(도트 이펙트 244종 + 스프라이트시트 출력), `camera-systems`(데드존·선행·흔들림), `input-systems`(입력 버퍼·리바인드·패드·터치) |
| 로그라이크 시스템 | `roguelike`, `procedural-gen`(시드·던전 생성·드롭 표), `game-ai`(상태 기계·행동 트리·조향·A*), `level-design`(전투 배치·긴장 곡선), `save-systems` |
| 아트·사운드·UI | `create-game-assets`(스타일 문서·스프라이트·타일셋), `audio-design`, `game-ui-ux`, `game-ui-design`, `game-accessibility-specialist` |
| 진행 | `router`(스킬 고르기), `game-blueprint`, `prototype-fast`, `writing-plans`, `executing-plans`, `self-check`, `verification-before-completion`, `performance-optimization` |

다른 프로젝트에서는 [gamedev-skills/awesome-gamedev-agent-skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills) (약 6,600★, 77개)를 설치하면 같은 계열을 받을 수 있다: `claude plugin install unity@awesome-gamedev-agent-skills`. 유니티용 8개: `unity-csharp-scripting`, `unity-input-system`, `unity-physics`, `unity-animation`, `unity-scriptableobjects`, `unity-tilemap-2d`, `unity-navmesh`, `unity-build-pipeline`.

## B. 유니티 에디터 연결 (MCP)

| 프로젝트 | ★ | 특징 |
| --- | --- | --- |
| [CoplayDev/unity-mcp](https://github.com/CoplayDev/unity-mcp) | 15,600 | 에셋·씬·스크립트 관리. 입문 추천 |
| [IvanMurzak/Unity-MCP](https://github.com/IvanMurzak/Unity-MCP) | 4,600 | MCP + 스킬 + CLI, C# 메서드를 한 줄로 도구화, 테스트 루프 |
| [CoderGamester/mcp-unity](https://github.com/CoderGamester/mcp-unity) | 2,000 | IDE 연동 플러그인 |
| [AnkleBreaker-Studio/unity-mcp-server](https://github.com/AnkleBreaker-Studio/unity-mcp-server) | 530 | 도구 268개(애니·물리·빌드·프로파일링) |
| [hatayama/unity-cli-loop](https://github.com/hatayama/unity-cli-loop) | 590 | 플레이 모드까지 AI 구동 |
| [Glade-tool/glade-mcp](https://github.com/Glade-tool/glade-mcp) | 210 | Unity·Godot, GDD 컨텍스트 포함 |
| [Unity AI 공식 MCP](https://unity.com/blog/unity-ai-mcp-how-to-get-started) | – | 공식 오픈 베타 ([문서](https://docs.unity3d.com/Packages/com.unity.ai.assistant@2.6/manual/integration/unity-mcp-landing.html)) |

## C. 도트 아트·애니메이션

| 프로젝트 | ★ | 쓰임 |
| --- | --- | --- |
| [patch-gg/pixelfx](https://github.com/patch-gg/pixelfx) | 3,570 | 코드로 그리는 도트 이펙트 244종 + 스킬 (이 저장소 `pixelfx`) |
| [with-pebbly/aseprite-ai-artist](https://github.com/with-pebbly/aseprite-ai-artist) | 550 | 열린 Aseprite 창에 그리기·애니·내보내기 |
| [diivi/aseprite-mcp](https://github.com/diivi/aseprite-mcp) | 870 | Aseprite API MCP |
| [MalloyTheDev/aseprite-mcp](https://github.com/MalloyTheDev/aseprite-mcp) | 24 | 헤드리스 Aseprite, 도구 156개 |
| [willibrandon/pixel-plugin](https://github.com/willibrandon/pixel-plugin) | 410 | Claude Code 플러그인: 팔레트·디더·엔진 내보내기 |
| [LucasJRamos/spritekiln](https://github.com/LucasJRamos/spritekiln) | 80 | YAML 3D 모델 → **8방향 탑뷰** 도트 스프라이트 (하데스식 프리렌더 방식과 유사) |
| [Gamezxz/pixel-art-studio](https://github.com/Gamezxz/pixel-art-studio) | 100 | 도구 없이 픽셀 단위로 그리는 스킬 |
| [mankidev/codixel](https://github.com/mankidev/codixel) | 84 | 스프라이트·이펙트 제작 요령 스킬 |

## D. 사운드

| 프로젝트 | ★ | 쓰임 |
| --- | --- | --- |
| [elevenlabs/elevenlabs-mcp](https://github.com/elevenlabs/elevenlabs-mcp) | 1,550 | 공식. 효과음·음성 생성 (유료 API) |
| [sfxmint/sfxmint-mcp](https://github.com/sfxmint/sfxmint-mcp) | 6 | CC0 효과음 검색·다운로드 + 스킬 |
| [sandraschi/sfx-mcp](https://github.com/sandraschi/sfx-mcp) | 3 | FreeSound CC0 검색 |
| [HamSanders/soundbox](https://github.com/HamSanders/soundbox) | 130 | 로컬 GPU로 효과음·음악 생성 |

## E. 설계·밸런스·에셋 생성

| 프로젝트 | ★ | 쓰임 |
| --- | --- | --- |
| [pauloperrotta/systemic-game-design-skill](https://github.com/pauloperrotta/systemic-game-design-skill) | 3 | 루프 단위 시스템 설계·밸런스 (축복·빌드 조합 설계에) |
| [QingYu0807/gdd-split](https://github.com/QingYu0807/gdd-split) | 1 | GDD → 엔지니어링·아트 작업 목록 |
| [scenario-labs/skills](https://github.com/scenario-labs/skills) | 1,700 | 이미지·영상·오디오·3D 생성, 캐릭터 일관성 유지 |
| [Ludo-AI/ludo-mcp](https://github.com/Ludo-AI/ludo-mcp) | 7 | 스프라이트·애니·효과음·음악 생성 |
| [Donchitos/Claude-Code-Game-Studios](https://github.com/Donchitos/Claude-Code-Game-Studios) | 33,600 | 에이전트 49개·스킬 72개 스튜디오 구성 (토큰 소모 큼) |

★ 수가 매우 적은 프로젝트는 검증이 덜 된 것이므로 코드를 읽고 쓴다.
