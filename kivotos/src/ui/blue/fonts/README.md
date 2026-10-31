# 글꼴

| 파일 | 글꼴 | 쓰는 곳 | 라이선스 |
|---|---|---|---|
| GyeonggiTitle-Medium/Bold.woff2 | 경기천년제목 Medium·Bold | 메인(`--f-kr`, `--f-display`) | 경기도 공공 글꼴. 상업적 이용·임베딩 허용, 글꼴 자체 판매 금지 (http://www.typolab.co.kr/license) |
| NotoSans-Regular/Bold.woff2 | Noto Sans Regular·Bold | 서브: 숫자·영문(`--f-num`), 설명 문단(`--f-sub`) | Apache 2.0 |

사용자가 준 TTF(2026-10-30)를 `pyftsubset`으로 WOFF2로 바꿨다.
경기천년제목은 한글 완성형 11,172자·자모·ASCII·기호만, Noto Sans는 라틴 기본·확장 A 일부·문장부호만 남겼다.
Noto Sans에 없는 한글은 `@fontsource-variable/noto-sans-kr`로 이어진다.

```sh
pyftsubset MainFont.ttf --unicodes="U+0020-007E,U+00A0-00FF,U+2010-2027,U+2030-205E,U+2190-21FF,U+2460-24FF,U+25A0-26FF,U+3000-303F,U+3131-318E,U+3200-32FF,U+AC00-D7A3,U+FF01-FF5E" --flavor=woff2 --layout-features='*' --output-file=GyeonggiTitle-Medium.woff2
```
