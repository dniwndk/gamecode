# 키보토스 택티컬 프론트라인

블루 아카이브 팬메이드 솔로 웹 오토배틀러. 학생을 영입·합성하고 전방 교전조와 후방 지원조의 시너지를 맞춰 3장 15전투를 돌파한다.

> **지금 상태: 개발 단계 M0(기반) 완료, 아직 플레이할 수 없다.** 콘텐츠 카탈로그와 검증기, 계층 구조만 있다.
> 진행 현황은 [docs/IMPLEMENTATION_STATUS.md](docs/IMPLEMENTATION_STATUS.md).

## 문서

| 문서 | 내용 |
|---|---|
| [docs/GDD_v2.1.md](docs/GDD_v2.1.md) | 정밀 기획서 v2.1 (구현 기준) |
| [docs/GDD_v2.2_amendment.md](docs/GDD_v2.2_amendment.md) | v2.2 개정안 — v2.1 위에 덮어쓴다 |
| [docs/CHANGES.md](docs/CHANGES.md) | 원안 → v2.1 → v2.2 변경표와 카탈로그 반영 위치 |
| [docs/DECISIONS.md](docs/DECISIONS.md) | 기획서에 없던 해석과 결정 |
| [docs/UI_CONTRACT.md](docs/UI_CONTRACT.md) | 화면 계층이 게임과 이야기하는 방법 (UI 교체 규칙) |
| [docs/plans/](docs/plans/) | 단계별 구현 계획 |

## 실행

Node 22(.nvmrc). 이 폴더에서:

```bash
npm ci
npm run dev               # 개발 서버 (지금은 카탈로그 확인 화면)
npm test                  # 단위·콘텐츠 테스트 (vitest)
npm run content:validate  # 콘텐츠 정적 검증 (오류 시 exit 1)
npm run build             # 기획서 대조 → 콘텐츠 검증 → 타입 검사 → dist/
npm run preview           # dist/를 http://localhost:4174 에서
```

| 명령 | 하는 일 |
|---|---|
| `npm run content:extract` | docs/의 기획서 표에서 `src/content/*.json`을 다시 만든다. 기획서를 고친 뒤에 돌린다 |
| `npm run content:check` | 저장소의 JSON이 기획서와 같은지만 본다 |
| `npm run content:validate -- --require-implemented` | 실행 연산이 없는 효과도 오류로 센다(M3 완료 기준) |
| `npm run typecheck` | 전체 타입 검사 + 코어를 DOM 없이 따로 컴파일 |

GDD 15.1의 나머지 명령(`test:e2e`, `simulate`)은 해당 단계(M4, M6)에서 만든다.

## 구조

```
src/core/      순수 규칙 코드 (DOM·외부 패키지·시계·Math.random 금지)
src/content/   콘텐츠 팩 JSON (생성물) + 불러오기
src/app/       GameClient — 화면이 쓰는 유일한 창구
src/ui/        화면. 통째로 교체 가능 (지금은 임시 카탈로그 화면)
scripts/       기획서 추출기, 검증 CLI, 초상화 변환, v2.2 경제 스케치
public/portraits/  학생 초상화 60장 (WebP 512px 폭)
```

배포: 저장소 main에 들어오면 GitHub Pages `/gamecode/kivotos/`에 올라간다.

## 멀티플레이 (PvP, 2~8명)

홈 → 멀티플레이에서 방을 만들면 5자리 방 코드가 나온다. 친구는 같은 화면의 「코드로 참가」에 코드를 넣거나 참가 링크(`?room=코드`)로 들어온다.
모두가 같은 상점 풀을 나눠 쓰고, 라운드마다 무작위 상대의 편성과 싸운다. 규칙은 docs/DECISIONS.md D-049.

- 돈 드는 서버가 없다. 방장 브라우저가 서버 역할을 하고, 연결을 맺을 때만 PeerJS 공용 중개 서버(무료)를 쓴다. 방장이 창을 닫으면 방이 끝난다.
- 일부 회사·학교 망이나 모바일 데이터(대칭 NAT)에서는 WebRTC 직접 연결이 안 될 수 있다. 같은 Wi-Fi나 다른 망으로 다시 시도한다.
- 방장은 결과를 조작할 수 있다. 친구끼리 쓰는 구조다.
- 같은 브라우저 두 탭으로 시험: 로비의 「같은 기기 탭으로 시험」(LOCAL- 코드, 인터넷 불필요).

## 에셋

초상화는 NovelAI Diffusion V5 Full로 생성했다(시드·프롬프트는 프로젝트 공유 폴더 `portraits/manifest.json`). 원본 PNG(장당 1.5MB)는 저장소에 넣지 않고 `python3 scripts/convert-portraits.py <원본 폴더>`로 WebP로 줄여 넣었다. 이미지가 없거나 깨지면 이름 이니셜과 진영색으로 대체한다.

블루 아카이브의 캐릭터·명칭 권리는 원작사에 있다. 공개 배포 전에 원작사의 2차 창작 가이드라인을 직접 확인해야 한다(v2.2 12장).
