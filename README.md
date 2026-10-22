# 황동의 생애

마법공학 도시 에르덴(공력 184년)에서 한 시민의 열세 살부터 마지막 날까지를 사는 텍스트 생애 시뮬레이션. 설계는 [design/plan.md](design/plan.md).

## 실행

빌드 도구가 없는 정적 웹 게임이다. 저장소 루트에서 정적 서버를 띄우고 브라우저로 연다.

```bash
python3 -m http.server 8000
# http://localhost:8000/index.html
# 특정 시드로 시작: http://localhost:8000/index.html?seed=MY-SEED
```

## 조작

| 키 | 동작 |
|---|---|
| Space | 자동 진행 멈춤/재개 |
| Enter | 한 계절 넘기기 · 기본 버튼 |
| F | 진행 속도 1·2·4·8배 |
| 1–4 | 선택지 고르기 |
| C / P / M / L / K / O | 나 · 인물 · 도시 · 기록 · 도감 · 설정 |
| Esc | 창 닫기 · 일시 정지 |

## 검증

```bash
node tests/sim.test.mjs --quick   # headless 22개 기준 (1천 생애, 약 15초)
node tests/sim.test.mjs           # 전체 (1만 생애 · 10만 출생, 약 2분)
node tests/e2e.spec.mjs           # 브라우저 16개 기준 (Playwright Chromium 필요)
```

## 구조

- `js/core/` 규칙·시뮬레이션. DOM을 쓰지 않아 Node에서 그대로 돈다. 난수 상태는 저장 데이터 안에 있어 같은 시드와 같은 선택은 같은 삶을 만든다.
- `js/data/` 세계·인물·사건·문장 데이터.
- `js/ui/` 스팀펑크 UI. 화면(`screens/`), SVG 스프라이트, 합성 효과음, 입자, 저장소.
- `css/` 토큰 · 틀과 부품 · 화면 배치 · 모션(동작 줄이기 대응).
- `fonts/RIDIBatang.woff2` 본문 글꼴 리디바탕.
