# 계약 시트

계약(행위·존재)을 시트로 편집하고 내보내는 브라우저 도구.

- `contract-sheet.html`: 단독 실행 파일. 브라우저로 열면 바로 쓸 수 있고, 처음 열 때 계약 77개·태그 11개가 들어 있어요. 편집 내용은 그 브라우저(localStorage)에 저장돼요.
- `contract-sheet.artifact.html`: claude.ai 아티팩트 원본(공유 db 저장, 시드 없음).
- `contract-seed.json`: 처음 데이터. `build_seed.py`가 game-design/contract-candidates.md와 설계서 7·8장에서 만듦.

기능: 셀 바로 편집, 태그 여러 개 고르기(없는 태그는 바로 만들기), 계약·태그 추가와 삭제(되돌리기), 선택 삭제, 필터(종류·행동·등급·상태·태그·검색), 정렬, 태그별 계약 수, CSV·JSON·마크다운 내보내기, JSON·CSV 가져오기(합치기/전부 바꾸기).

JSON 형식: `{format: "contract-sheet", version: 1, contracts: [{id, name, kind: act|exist, action, grade: silver|gold|prism, tags: [이름], effect, limit, status, source, note, order}], tags: [{id, name, status, t2, t3, t4, order, hue}]}`
