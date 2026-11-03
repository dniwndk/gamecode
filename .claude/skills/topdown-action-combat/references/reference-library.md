# 레퍼런스 라이브러리 (2026-11-03 수집)

하데스식 탑뷰 액션을 만들 때 볼 자료. 하데스는 **설계 참고용**이며 이름·캐릭터·아트·음악은 가져오지 않는다.

## 1. 손맛(게임 필) 기본기 — 가장 먼저 볼 것

| 자료 | 무엇을 배우나 |
| --- | --- |
| [The Art of Screenshake – Jan Willem Nijman (Vlambeer)](https://www.youtube.com/watch?v=AJdEqssNZ-U) | 평범한 슈터에 히트스톱·넉백·셰이크·사운드를 하나씩 더하는 시연. 토글 비교 방식의 원조 |
| [Juice it or lose it (GDC Europe)](https://www.youtube.com/watch?v=Fy0aCDmgnxg) | 피드백을 층층이 쌓아 손맛을 만드는 과정 |
| [Vlambeer 액션 게임 조언 (Game Developer)](https://gamedeveloper.com/design/vlambeer-co-founder-shares-advice-on-building-better-action-games) | 위 강연의 텍스트 요약 |
| [사쿠라이 마사히로의 게임 만들기 (YouTube)](https://www.youtube.com/@sora_sakurai_en) | 히트스톱, 선딜/후딜, 입력 선행 등 액션 기본기를 짧은 영상으로 |
| [Kenney: 인디 개발자 필수 영상](https://kenney.nl/learn/must-see-videos-for-indie-developers) | 위 강연들을 포함한 큐레이션 |

## 2. 하데스·Supergiant

| 자료 | 내용 |
| --- | --- |
| [Breathing Life into Greek Myth (GDC 2021)](https://gdcvault.com/play/1026975/Breathing-Life-into-Greek-Myth) | 반복 플레이에 맞춘 동적 내러티브 |
| [Fireside Chat with Amir Rao (GDC)](https://gdcvault.com/play/1027189/LIVE-Fireside-Chat-Amir-Rao) | 스튜디오 개발 철학, 얼리 액세스 운영 |
| [Greg Kasavin 개발 회고 (Game Developer)](https://gamedeveloper.com/design/watch-greg-kasavin-discuss-the-development-of-supergiant-games-i-hades-i-) | 개발 과정 |
| [얼리 액세스가 하데스를 만든 방식 (PC Gamer)](https://www.pcgamer.com/a-journey-through-early-access-helped-make-hades-a-masterpiece) | 피드백으로 무기·보상을 다듬은 과정 |
| [Supergiant 인터뷰 (Inven Global)](https://labs.invenglobal.com/articles/14783/supergiant-games-how-indie-developers-made-goty-hades) | 소규모 팀 운영 |

참고: 하데스 전투 수치(프레임)는 공개된 적이 없다. 이 키트의 수치는 업계 통상값에서 출발한 것이다.

## 3. 픽셀 탑뷰 액션 사례

| 게임 | 볼 점 | 자료 |
| --- | --- | --- |
| Enter the Gungeon (유니티) | 도지롤 무적, 탄막 가독성, 무기별 반동 | [Q&A (Game Developer)](https://www.gamedeveloper.com/design/q-a-the-guns-and-dungeons-of-i-enter-the-gungeon-i-), [도지롤 위키](https://enterthegungeon.wiki.gg/wiki/Dodge_Roll_(Move)) |
| Hyper Light Drifter | 연속 대시, 적은 프레임의 강한 임팩트, 공정한 난이도 | [GDC 2017](https://www.gdcvault.com/play/1024062), [난이도와 공정성](https://gamedeveloper.com/design/how-i-hyper-light-drifter-i-balances-difficulty-with-fairness), [사운드 GDC](https://gdcvault.com/play/1023778/The-Sound-of-Hyper-Light) |
| Moonlighter (유니티) | 무기별 콤보, 탑뷰 던전 루프 | 플레이 분석 권장 |
| Children of Morta | 캐릭터별 전투 리듬, 픽셀 이펙트 밀도 | 플레이 분석 권장 |

## 4. 유니티 도구

| 도구 | 용도 |
| --- | --- |
| 2D Pixel Perfect (URP) | 픽셀 스냅 카메라 |
| Cinemachine Impulse | 방향성 화면 흔들림 |
| Input System | 입력 버퍼, 패드 |
| 2D Aseprite Importer | .aseprite 직접 임포트, 태그 → 클립 |
| [Feel (MoreMountains)](https://80.lv/articles/feel-make-your-unity-projects-juicier) | 히트스톱·셰이크·플래시를 피드백 시퀀스로 (유료) |
| [Super Game Feel Effects](https://assetstore.unity.com/packages/tools/particles-effects/super-game-feel-effects-screenshake-kickback-hitstop-88790) | 가벼운 대안 |
| [유니티 타격감 입문 (uhiyama-lab)](https://uhiyama-lab.com/en/notes/unity/unity-game-feel-hit-feedback/) | 히트스톱·플래시·셰이크 코드 튜토리얼 |

전체 정리 문서(Claude Doc): https://claude.ai/artifact/KuTtqqHdhSErEv1atp5tGH
