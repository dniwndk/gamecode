# 키보토스 택티컬 프론트라인 — v2.3 개정안 (시너지 개편 · 코스트 밸런스 · 신규 학생 40명 · AL-1S 각성)

> **이 문서는 v2.2 개정안 위에 덮어 쓰는 개정안이다.** 충돌 시 해석 순서는 **v2.3 개정안 → v2.2 개정안 → v2.1 본문 → v2.1 부록** 이다.
> 3장의 유닛 표와 4장의 시너지 표는 v2.1 부록 A·B와 v2.2 5·6장을 **통째로 대체**한다. 5장의 효과는 같은 ID의 v2.1 부록 C 항목을 대체하거나 새로 추가하고, 6장의 효과는 카탈로그에서 뺀다.
> 이 문서는 설계 데이터에서 생성했다. 사람이 고칠 때는 표의 형식(칸 순서, `eff_`·`syn_` 표기)을 지켜야 `scripts/extract-content.mjs`가 읽는다.

## 0. 바뀐 것 한눈에

- **시너지 63종으로 재편.** 학원 진영 12종은 효과를 그대로 두고 구성원만 다시 센다. 역할·장갑·고유·경제(한탕) 시너지는 폐기하고 동아리 26종, 역할군 7종, 고유 11종, 플래티넘 7종을 새로 둔다.
- **흥신소68·C&C는 진영에서 동아리로 옮긴다.** ID(`syn_problem_solver`, `syn_cc`)는 유지하고 효과를 교체한다.
- **학생 100명.** 원작 동아리 구성원 40명을 추가한다(3장, 8장 근거).
- **코스트별 기준선(2장)을 정하고 기존 60명을 맞춘다.** 1코는 단순하게(성장형 예외), 5코는 출전만으로 덱이 강해지는 「존재 효과」를 갖는다.
- **고유 시너지는 추천 11종만 넣는다.** 예비안(하루카·세리나·키리노·유우카·네루)은 이번 팩에 없다.
- **플래티넘 2종(학원 대항전·총력전 만점)은 구성원 명단이 없다.** 집계 범위 `special`: 출전 편성 전체로 판정하며, 구성원 수 기반 도달 가능성 검사에서 빠진다.
- 전략 「철벽의 전선」의 보유 조건 태그를 `syn_tank`로 바꾼다(7장).
- **난이도 상향(v2.3.3, 10장).** 최종 보스 노드를 뺀 14개 노드(일반·정예·1·2장 보스)의 적 능력치 배율(HP·ATK)을 1.5배로 올린다.
- **아리스를 2코로 내리고 「AL-1S」 각성을 넣는다(v2.3.2, 9장).** 고유 시너지 「빠밤! 레벨업」 경험치가 30이고 아리스가 3성이면 이름 없는 신들의 왕녀 「AL-1S」(5코, 상점 없음)로 바뀐다. AL-1S는 효과 6개와 고유 시너지 「이름 없는 신들의 왕녀」를 가진다. 학생 101명, 시너지 64종.

## 1. 판정 원칙

- 유닛 태그 = 진영(1~2) + 동아리(0~1) + 역할군(1) + 고유(0~1) + 플래티넘(0~n).
- 각성 학생(9장)은 원래 학생과 **같은 사람으로 센다.** 둘은 한 편성에 함께 있을 수 없으므로, 구성원 수·F/R/D·최대 합법은 원래 학생 한 명으로 센다. 「아리스」를 요구하는 조건은 AL-1S도 채운다.
- 동아리·역할군·고유·플래티넘의 집계 범위는 별도 표기가 없으면 `deployed_all`(전방+후방 출전). 고유는 주인 구역을 따른다.
- 플래티넘의 "3성" 조건은 단계 수와 별개로 효과 문장의 발동 조건에서 판정한다(구성원이 다 모여도 성급이 모자라면 꺼짐).
- 원작과 같은 이름인 동아리(대책위원회, RABBIT 소대, CCC 등)는 진영과 구성원이 같아 따로 두지 않는다.
- 시너지는 도달한 최고 단계 하나만 등록한다(v2.1 6장). 그래서 상위 단계 본문은 하위 단계에서 이어지는 효과를 **모두 문장으로 다시 적는다**. 「[하위 효과 포함]」 같은 참조 표기는 쓰지 않는다(v2.3.1에서 33개 단계를 이렇게 풀어 씀).

## 2. 코스트별 기준선 (1성 기준)

| 코스트 | ATK | HP (탱커) | 효과 수 | 필살기 단일 / 광역 | 팀 효과 |
|---|---|---|---|---|---|
| 1 | ~105 | ~1,000 (1,450) | 3개 이하 | 240% / 150% | 없음. 광역은 필살기에만, 제어·SP 없음 |
| 2 | 125~150 | ~1,250 (1,750) | 4개 이하 | 270% / 160% | 약한 버프(+15% 이하). 광역과 제어 중 하나 |
| 3 | 155~170 | ~1,400 (1,900) | 5개 이하 | 310% / 190% | 덱의 축 하나를 확실히 |
| 4 | 185~205 | ~1,750 (2,300) | 6개 이하 | 340% / 220% | 핵심 지원 또는 메인 딜러 |
| 5 | ~240 | ~2,050 (2,700) | 6~7개 | 400%+ / 260%+ | 「존재 효과」 필수 |

CRIT_DMG는 전원 0.5. 효과 수는 기본 공격을 빼고 센다.

## 3. 유닛 마스터 v2.3 (101명)

| ID | 이름 | 코스트 | 구역 | HP/ATK/DEF/SPD/CRIT/CRIT_DMG | 태그 | 기본 공격 | 전투 스킬 | 필살기 | 전방 패시브 | 후방 정기 지원 | 후방 반응 지원 | 역할 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `u_airi` | 쿠리무라 아이리 | 1 | rear_only | 820/94/32/104/0.05/0.5 | syn_trinity, syn_sweets, syn_supporter | — | — | — | — | `eff_airi_rear_reg` | — | 약한 아군 방어력 버프 |
| `u_asuna` | 이치노세 아스나 | 1 | front_only | 980/110/40/118/0.2/0.5 | syn_millennium, syn_cc, syn_attacker, syn_plat_codename | `eff_common_basic_atk` | `eff_asuna_skill` | `eff_asuna_ult` | `eff_asuna_passive` | — | — | 고속 치명타 딜러 / 행동 당기기 |
| `u_fubuki` | 네무가키 후부키 | 1 | front_only | 1020/114/45/102/0.18/0.5 | syn_valkyrie, syn_life_safety, syn_sniper | `eff_common_basic_atk` | `eff_fubuki_skill` | `eff_fubuki_ult` | `eff_fubuki_passive` | — | — | 단일 행동 지연 저격 / 자가 치유 평타 |
| `u_hanae` | 아사가오 하나에 | 1 | rear_only | 850/100/35/108/0.05/0.5 | syn_trinity, syn_remedial_knights, syn_healer | — | — | — | — | `eff_hanae_rear_reg` | — | 단일 치유 견습 기사 |
| `u_haruka` | 이구사 하루카 | 1 | front_only | 1450/75/80/92/0.05/0.5 | syn_gehenna, syn_problem_solver, syn_tank | `eff_common_basic_atk` | `eff_haruka_skill` | `eff_haruka_ult` | `eff_haruka_passive` | — | — | 자가 치유·방어 중첩 선봉 탱커 |
| `u_izumi` | 시시도 이즈미 | 1 | front_only | 1000/112/40/110/0.15/0.5 | syn_gehenna, syn_gourmet, syn_attacker | `eff_common_basic_atk` | `eff_izumi_skill` | `eff_izumi_ult` | — | — | — | 처치 시 에너지를 채우는 단일 딜러 |
| `u_junko` | 아카시 준코 | 1 | front_only | 960/118/35/106/0.15/0.5 | syn_gehenna, syn_gourmet, syn_blaster | `eff_common_basic_atk` | `eff_junko_skill` | `eff_junko_ult` | `eff_junko_passive` | — | — | 광역 딜러 / 저체력 폭딜 |
| `u_juri` | 우시마키 쥬리 | 1 | rear_only | 820/95/32/104/0.05/0.5 | syn_gehenna, syn_school_lunch, syn_supporter | — | — | — | — | `eff_juri_rear_reg` | — | 급식 치유·공격력 버프 / 가끔 요리 실패 |
| `u_kaede` | 이사미 카에데 | 1 | front_only | 1050/108/44/104/0.12/0.5 | syn_hyakkiyako, syn_training, syn_blaster | `eff_common_basic_atk` | `eff_kaede_skill` | `eff_kaede_ult` | — | — | — | 씩씩한 꼬마 광역 딜러 |
| `u_kokona` | 스노하라 코코나 | 1 | dual | 1060/102/48/106/0.1/0.5 | syn_shanhaijing, syn_plum_blossom, syn_healer | `eff_common_basic_atk` | `eff_kokona_skill` | `eff_kokona_ult` | — | `eff_kokona_rear_reg` | — | 전후방 겸용 치유 교관 |
| `u_kotama` | 오토세 코타마 | 1 | rear_only | 800/95/30/105/0.1/0.5 | syn_millennium, syn_veritas, syn_supporter | — | — | — | — | `eff_kotama_rear_reg` | — | 아군 전방 전체 공격력 버프 |
| `u_kotori` | 토요미 코토리 | 1 | rear_only | 800/92/30/106/0.05/0.5 | syn_millennium, syn_engineering, syn_supporter | — | — | — | — | `eff_kotori_rear_reg` | — | 최고 공격력 아군 치명 피해 해설 지원 |
| `u_michiru` | 치도리 미치루 | 1 | front_only | 1040/112/45/108/0.16/0.5 | syn_hyakkiyako, syn_ninjutsu, syn_blaster | `eff_common_basic_atk` | `eff_michiru_skill` | `eff_michiru_ult` | `eff_michiru_passive` | — | — | 근접 화상 딜러 / 산탄 인법 공격 |
| `u_nodoka` | 아마미 노도카 | 1 | rear_only | 840/96/32/106/0.12/0.5 | syn_red_winter, syn_class_227, syn_supporter | — | — | — | — | `eff_nodoka_rear_reg` | — | 후방 치명타 관측 지원 |
| `u_rabu` | 코마카제 라부 | 1 | front_only | 1150/112/50/104/0.14/0.5 | syn_outlaw, syn_blaster | `eff_common_basic_atk` | `eff_rabu_skill` | `eff_rabu_ult` | `eff_rabu_passive` | — | — | 광역 유탄 투척 / 선봉 화력 브루저 |
| `u_serika` | 쿠로미 세리카 | 1 | front_only | 950/115/35/112/0.15/0.5 | syn_abydos, syn_attacker, syn_plat_last_line | `eff_common_basic_atk` | `eff_serika_skill` | `eff_serika_ult` | `eff_serika_passive` | — | — | 성장형 단일 딜러 / 「아르바이트 수당」 승리 누적 |
| `u_serina` | 스미 세리나 | 1 | rear_only | 850/100/35/108/0.05/0.5 | syn_trinity, syn_remedial_knights, syn_healer | — | — | — | — | `eff_serina_rear_reg` | `eff_serina_rear_react` | 단일 집중 치유 / 위기 응급 회복 |
| `u_suzumi` | 모리즈키 스즈미 | 1 | dual | 1100/90/55/104/0.1/0.5 | syn_trinity, syn_vigilante, syn_controller | `eff_common_basic_atk` | `eff_suzumi_skill` | `eff_suzumi_ult` | — | `eff_suzumi_rear_reg` | — | 맨 앞 적 기절 / 빠른 적 공격력 약화 |
| `u_yoshimi` | 이바라기 요시미 | 1 | front_only | 1000/110/40/108/0.15/0.5 | syn_trinity, syn_sweets, syn_attacker | `eff_common_basic_atk` | `eff_yoshimi_skill` | `eff_yoshimi_ult` | — | — | — | 단 걸 먹고 버티는 단일 딜러 |
| `u_akari` | 와니부치 아카리 | 2 | front_only | 1200/138/46/104/0.15/0.5 | syn_gehenna, syn_gourmet, syn_blaster | `eff_common_basic_atk` | `eff_akari_skill` | `eff_akari_ult` | — | — | — | 전방 광역 폭파 / 처치 에너지 환급 |
| `u_aris` | 텐도 아리스 | 2 | dual | 1200/138/45/92/0.15/0.5 | syn_millennium, syn_game_dev, syn_blaster, syn_unique_level_up, syn_plat_ending_credits | `eff_common_basic_atk` | `eff_aris_skill` | `eff_aris_ult` | `eff_aris_passive` | `eff_aris_rear_reg` | — | 성장형 광역 레일건 / 3성·경험치 30에 AL-1S로 각성 |
| `u_ayane` | 오쿠소라 아야네 | 2 | rear_only | 980/108/45/104/0.05/0.5 | syn_abydos, syn_healer, syn_plat_last_line | — | — | — | — | `eff_ayane_rear_reg` | `eff_ayane_rear_react` | 3인 치유 + 치유 반응 보호막 |
| `u_chinatsu` | 히노미야 치나츠 | 2 | rear_only | 950/118/42/108/0.05/0.5 | syn_gehenna, syn_prefect, syn_healer | — | — | — | — | `eff_chinatsu_rear_reg` | `eff_chinatsu_rear_react` | 단일 치유 + 디버프 해제 / 기절·침묵 응급 해제 |
| `u_chise` | 와라쿠 치세 | 2 | rear_only | 960/132/40/104/0.12/0.5 | syn_hyakkiyako, syn_yinyang, syn_blaster | — | — | — | — | `eff_chise_rear_reg` | — | 부적 화염 광역 화상 |
| `u_fuuka` | 아이키요 후우카 | 2 | rear_only | 1050/110/50/100/0.05/0.5 | syn_gehenna, syn_school_lunch, syn_healer | — | — | — | — | `eff_fuuka_rear_reg` | `eff_fuuka_rear_react` | 광역 치유 / 방어력 버프 지원 |
| `u_hare` | 오마가리 하레 | 2 | rear_only | 920/115/40/107/0.12/0.5 | syn_millennium, syn_veritas, syn_controller | — | — | — | — | `eff_hare_rear_reg` | `eff_hare_rear_react` | 후방 광역 침묵 제어 / 행동 지연 |
| `u_hasumi` | 하네카와 하스미 | 2 | front_only | 1200/150/50/98/0.22/0.5 | syn_trinity, syn_justice, syn_sniper | `eff_common_basic_atk` | `eff_hasumi_skill` | `eff_hasumi_ult` | `eff_hasumi_passive` | — | — | 단일 죽창 저격 / 처치 시 치명타 폭발 |
| `u_hibiki` | 네코츠카 히비키 | 2 | rear_only | 950/134/40/102/0.12/0.5 | syn_millennium, syn_engineering, syn_blaster | — | — | — | — | `eff_hibiki_rear_reg` | — | 후방까지 닿는 박격포 |
| `u_karin` | 카쿠다테 카린 | 2 | rear_only | 1000/152/45/102/0.22/0.5 | syn_millennium, syn_cc, syn_sniper, syn_plat_codename | — | — | — | — | `eff_karin_rear_reg` | `eff_karin_rear_react` | 후방 대물 저격 딜러 / 고방어 적 추가 타격 |
| `u_kayoko` | 오니카타 카요코 | 2 | dual | 1240/128/58/108/0.16/0.5 | syn_gehenna, syn_problem_solver, syn_controller | `eff_common_basic_atk` | `eff_kayoko_skill` | `eff_kayoko_ult` | — | `eff_kayoko_rear_reg` | — | 전후방 광역 제어 |
| `u_kirino` | 나카츠카사 키리노 | 2 | front_only | 1680/95/82/100/0.1/0.5 | syn_valkyrie, syn_life_safety, syn_controller | `eff_common_basic_atk` | `eff_kirino_skill` | `eff_kirino_ult` | `eff_kirino_passive` | — | — | 전방 교란 브루저 / 적 공격력 약화 |
| `u_maki` | 코누리 마키 | 2 | rear_only | 950/130/40/106/0.12/0.5 | syn_millennium, syn_veritas, syn_blaster | — | — | — | — | `eff_maki_rear_reg` | — | 그래피티 광역 둔화 |
| `u_mashiro` | 시즈야마 마시로 | 2 | rear_only | 980/150/42/102/0.22/0.5 | syn_trinity, syn_justice, syn_sniper | — | — | — | — | `eff_mashiro_rear_reg` | — | 정의의 저격 / 아군을 쓰러뜨린 적 응징 |
| `u_megu` | 시모쿠라 메구 | 2 | front_only | 1220/136/48/106/0.15/0.5 | syn_gehenna, syn_hot_spring, syn_blaster | `eff_common_basic_atk` | `eff_megu_skill` | `eff_megu_ult` | — | — | — | 화염방사 광역 화상 / 화상 연장 |
| `u_meru` | 히메키 메루 | 2 | rear_only | 940/120/40/106/0.1/0.5 | syn_red_winter, syn_knowledge_front, syn_controller | — | — | — | — | `eff_meru_rear_reg` | — | 단일 침묵 제어 |
| `u_midori` | 사이바 미도리 | 2 | front_only | 1200/140/48/112/0.18/0.5 | syn_millennium, syn_game_dev, syn_attacker, syn_plat_ending_credits | `eff_common_basic_atk` | `eff_midori_skill` | `eff_midori_ult` | — | — | — | 쌍둥이 연계 단일 딜러 |
| `u_momiji` | 아키이즈미 모미지 | 2 | front_only | 1180/148/46/96/0.18/0.5 | syn_red_winter, syn_knowledge_front, syn_blaster | `eff_common_basic_atk` | `eff_momiji_skill` | `eff_momiji_ult` | `eff_momiji_passive` | — | — | 광역 대전차 포격 딜러 |
| `u_momoi` | 사이바 모모이 | 2 | dual | 1120/132/42/110/0.16/0.5 | syn_millennium, syn_game_dev, syn_blaster, syn_plat_ending_credits | `eff_common_basic_atk` | `eff_momoi_skill` | `eff_momoi_ult` | — | `eff_momoi_rear_reg` | `eff_momoi_rear_react` | 광역 화상 딜러 / 전후방 겸용 사격 |
| `u_natsu` | 유토리 나츠 | 2 | front_only | 1750/88/90/96/0.05/0.5 | syn_trinity, syn_sweets, syn_tank | `eff_common_basic_atk` | `eff_natsu_skill` | `eff_natsu_ult` | — | — | — | 로맨스 낭만 탱커 / 전방 피해 분산 |
| `u_nozomi` | 타치바나 노조미 | 2 | front_only | 1220/138/48/120/0.2/0.5 | syn_highlander, syn_attacker | `eff_common_basic_atk` | `eff_nozomi_skill` | `eff_nozomi_ult` | `eff_nozomi_passive` | — | — | 초고속 돌격 연타 / 행동 가속 딜러 |
| `u_reisa` | 우자와 레이사 | 2 | front_only | 1180/140/46/114/0.18/0.5 | syn_trinity, syn_vigilante, syn_attacker | `eff_common_basic_atk` | `eff_reisa_skill` | `eff_reisa_ult` | — | — | — | 정의감 넘치는 돌격 딜러 / 기절 대상 추가 피해 |
| `u_shiroko` | 스나오오카미 시로코 | 2 | front_only | 1150/135/45/116/0.18/0.5 | syn_abydos, syn_attacker, syn_unique_bank_robber, syn_plat_last_line | `eff_common_basic_atk` | `eff_shiroko_skill` | `eff_shiroko_ult` | `eff_shiroko_passive` | — | — | 고속 단일 딜러 / 방깎 및 드론 추격 |
| `u_shun` | 스노하라 슌 | 2 | front_only | 1160/146/44/110/0.22/0.5 | syn_shanhaijing, syn_plum_blossom, syn_sniper | `eff_common_basic_atk` | `eff_shun_skill` | `eff_shun_ult` | `eff_shun_passive` | — | — | 개전 에너지 부스트 / 고공격력 적 저격수 |
| `u_tsubaki` | 카스가 츠바키 | 2 | front_only | 1820/70/95/94/0.05/0.5 | syn_hyakkiyako, syn_training, syn_tank | `eff_common_basic_atk` | `eff_tsubaki_skill` | `eff_tsubaki_ult` | `eff_tsubaki_passive` | — | — | 광역 도발 탱커 / 위기 응급 회복 |
| `u_tsukuyo` | 오오노 츠쿠요 | 2 | front_only | 1720/90/86/104/0.05/0.5 | syn_hyakkiyako, syn_ninjutsu, syn_tank | `eff_common_basic_atk` | `eff_tsukuyo_skill` | `eff_tsukuyo_ult` | — | — | — | 큰 키로 시선을 끄는 인법 탱커 / 바꿔치기 회피 |
| `u_yuuka` | 하야세 유우카 | 2 | front_only | 1750/85/90/96/0.08/0.5 | syn_millennium, syn_seminar, syn_tank | `eff_common_basic_atk` | `eff_yuuka_skill` | `eff_yuuka_ult` | `eff_yuuka_passive` | — | — | 자가·광역 보호막 탱커 |
| `u_akane` | 무로카사 아카네 | 3 | front_only | 1350/162/54/108/0.18/0.5 | syn_millennium, syn_cc, syn_blaster, syn_plat_codename | `eff_common_basic_atk` | `eff_akane_skill` | `eff_akane_ult` | — | — | — | 폭탄 설치 후 일괄 기폭 / 광역 딜러 |
| `u_atsuko` | 하카리 아츠코 | 3 | front_only | 1920/110/92/102/0.1/0.5 | syn_arius, syn_tank, syn_plat_vanitas | `eff_common_basic_atk` | `eff_atsuko_skill` | `eff_atsuko_ult` | `eff_atsuko_passive` | — | — | 전방 광역 회피·치유 탱커 |
| `u_azusa` | 시라스 아즈사 | 3 | front_only | 1300/168/50/108/0.22/0.5 | syn_trinity, syn_arius, syn_make_up, syn_sniper, syn_plat_vanitas | `eff_common_basic_atk` | `eff_azusa_skill` | `eff_azusa_ult` | `eff_azusa_passive` | — | — | 방어력 파괴 단일 딜러 / 약점 추가 피해 |
| `u_chihiro` | 카가미 치히로 | 3 | rear_only | 1100/140/50/110/0.1/0.5 | syn_millennium, syn_veritas, syn_supporter | — | — | — | — | `eff_chihiro_rear_reg` | `eff_chihiro_rear_react` | 해킹 버프 해제 + 치명 지원 / 적 필살기 방해 |
| `u_eimi` | 이즈미모토 에이미 | 3 | front_only | 1900/110/92/100/0.05/0.5 | syn_millennium, syn_paranormal, syn_tank | `eff_common_basic_atk` | `eff_eimi_skill` | `eff_eimi_ult` | `eff_eimi_passive` | — | — | 혹한 대응 도발 탱커 / 전방 디버프 면역 |
| `u_hanako` | 우라와 하나코 | 3 | rear_only | 1150/135/52/106/0.08/0.5 | syn_trinity, syn_make_up, syn_healer | — | — | — | — | `eff_hanako_rear_reg` | — | 전방 전체 치유 / 세 번째마다 두 배 |
| `u_hifumi` | 아지타니 히후미 | 3 | rear_only | 1120/140/50/106/0.1/0.5 | syn_trinity, syn_make_up, syn_supporter | — | — | — | — | `eff_hifumi_rear_reg` | — | 페로로 인형 미끼 + 전방 공격력 버프 |
| `u_hiyori` | 츠치나가 히요리 | 3 | rear_only | 1080/148/45/104/0.18/0.5 | syn_arius, syn_sniper, syn_plat_vanitas | — | — | — | — | `eff_hiyori_rear_reg` | `eff_hiyori_rear_react` | 후방 방어력 대폭 파괴 포격수 |
| `u_iori` | 시로미 이오리 | 3 | front_only | 1280/172/55/106/0.24/0.5 | syn_gehenna, syn_prefect, syn_attacker | `eff_common_basic_atk` | `eff_iori_skill` | `eff_iori_ult` | `eff_iori_passive` | — | — | 고화력 단일·연쇄 딜러 / 방어 관통 추격 |
| `u_izuna` | 쿠다 이즈나 | 3 | front_only | 1260/158/46/124/0.22/0.5 | syn_hyakkiyako, syn_ninjutsu, syn_attacker | `eff_common_basic_atk` | `eff_izuna_skill` | `eff_izuna_ult` | `eff_izuna_passive` | — | — | 초고속 연타 닌자 / 수리검 후속 공격 |
| `u_kasumi` | 키누가와 카스미 | 3 | rear_only | 1100/158/44/104/0.18/0.5 | syn_gehenna, syn_hot_spring, syn_blaster | — | — | — | — | `eff_kasumi_rear_reg` | `eff_kasumi_rear_react` | 후방 굴착 폭파 / 처치마다 폭파 강화 |
| `u_kazusa` | 쿄야마 카즈사 | 3 | front_only | 1350/168/52/114/0.22/0.5 | syn_trinity, syn_sweets, syn_attacker, syn_unique_caspalug | `eff_common_basic_atk` | `eff_kazusa_skill` | `eff_kazusa_ult` | — | — | — | 전직 불량배 "캬스파리그" 단일 딜러 |
| `u_koharu` | 시모에 코하루 | 3 | dual | 1420/138/65/102/0.12/0.5 | syn_trinity, syn_make_up, syn_healer | `eff_common_basic_atk` | `eff_koharu_skill` | `eff_koharu_ult` | — | `eff_koharu_rear_reg` | `eff_koharu_rear_react` | 광역 치유 + 광역 타격 하이브리드 메딕 |
| `u_koyuki` | 쿠로사키 코유키 | 3 | dual | 1350/150/56/110/0.15/0.5 | syn_millennium, syn_seminar, syn_controller | `eff_common_basic_atk` | `eff_koyuki_skill` | `eff_koyuki_ult` | — | `eff_koyuki_rear_reg` | — | 동전 던지기 도박 제어 / 후방 지연 |
| `u_marina` | 이케쿠라 마리나 | 3 | front_only | 1880/135/82/106/0.14/0.5 | syn_red_winter, syn_rw_office, syn_tank | `eff_common_basic_atk` | `eff_marina_skill` | `eff_marina_ult` | `eff_marina_passive` | — | — | 불굴의 선봉 브루저 / 광역 진형 돌파 |
| `u_mimori` | 미즈하 미모리 | 3 | rear_only | 1100/138/50/106/0.08/0.5 | syn_hyakkiyako, syn_training, syn_supporter | — | — | — | — | `eff_mimori_rear_reg` | — | 수행으로 다진 디버프 저항 + 에너지 지원 |
| `u_mina` | 코노에 미나 | 3 | front_only | 1340/156/56/114/0.2/0.5 | syn_shanhaijing, syn_genryumon, syn_controller | `eff_common_basic_atk` | `eff_mina_skill` | `eff_mina_ult` | `eff_mina_passive` | — | — | 다중 디버프 연사 딜러 / 적 능력치 대폭 약화 |
| `u_misaki` | 이마시노 미사키 | 3 | rear_only | 1100/158/44/104/0.18/0.5 | syn_arius, syn_blaster, syn_plat_vanitas | — | — | — | — | `eff_misaki_rear_reg` | `eff_misaki_rear_react` | 후방 로켓 광역 / 아군이 쓰러지면 보복 |
| `u_moe` | 카제쿠라 모에 | 3 | rear_only | 1100/160/42/105/0.2/0.5 | syn_srt, syn_blaster | — | — | — | — | `eff_moe_rear_reg` | `eff_moe_rear_react` | 후방 무차별 융단 폭격 |
| `u_mutsuki` | 아사기 무츠키 | 3 | dual | 1220/168/44/109/0.2/0.5 | syn_gehenna, syn_problem_solver, syn_blaster | `eff_common_basic_atk` | `eff_mutsuki_skill` | `eff_mutsuki_ult` | — | `eff_mutsuki_rear_reg` | `eff_mutsuki_rear_react` | 광역 폭발 딜러 / 후방 지뢰 기폭 |
| `u_nonomi` | 이자요이 노노미 | 3 | front_only | 1350/162/52/96/0.18/0.5 | syn_abydos, syn_blaster, syn_unique_gold_card, syn_plat_last_line | `eff_common_basic_atk` | `eff_nonomi_skill` | `eff_nonomi_ult` | `eff_nonomi_passive` | — | — | 광역 소사 딜러 / 중장갑 카운터 |
| `u_saki` | 소라이 사키 | 3 | dual | 1380/152/62/108/0.18/0.5 | syn_srt, syn_supporter | `eff_common_basic_atk` | `eff_saki_skill` | `eff_saki_ult` | — | `eff_saki_rear_reg` | `eff_saki_rear_react` | 전후방 교범 지휘관 / 기절 및 공격력 버프 |
| `u_shigure` | 마요이 시구레 | 3 | front_only | 1350/165/54/112/0.2/0.5 | syn_red_winter, syn_class_227, syn_attacker | `eff_common_basic_atk` | `eff_shigure_skill` | `eff_shigure_ult` | — | — | — | 버틸수록 강해지는 장기전 딜러 |
| `u_shizuko` | 카와와 시즈코 | 3 | rear_only | 1150/125/55/106/0.1/0.5 | syn_hyakkiyako, syn_healer | — | — | — | — | `eff_shizuko_rear_reg` | `eff_shizuko_rear_react` | 후방 전체 보호막 / 치명타 버프 |
| `u_toki` | 아스마 토키 | 3 | front_only | 1460/166/68/106/0.22/0.5 | syn_millennium, syn_cc, syn_blaster, syn_plat_codename | `eff_common_basic_atk` | `eff_toki_skill` | `eff_toki_ult` | `eff_toki_passive` | — | — | 아비 에슈흐 관통 포격 / 방어 무시 딜탱 |
| `u_tomoe` | 사시로 토모에 | 3 | rear_only | 1100/140/50/106/0.1/0.5 | syn_red_winter, syn_rw_office, syn_supporter | — | — | — | — | `eff_tomoe_rear_reg` | `eff_tomoe_rear_react` | 서기장 보좌 에너지 지원 / SP 최대일 때 공격력 버프 |
| `u_utaha` | 시라이시 우타하 | 3 | rear_only | 1150/138/52/104/0.1/0.5 | syn_millennium, syn_engineering, syn_supporter | — | — | — | — | `eff_utaha_rear_reg` | — | 긴급 수리 보호막 / 피해 감소 |
| `u_yuzu` | 하나오카 유즈 | 3 | rear_only | 1050/160/40/100/0.2/0.5 | syn_millennium, syn_game_dev, syn_blaster, syn_plat_ending_credits | — | — | — | — | `eff_yuzu_rear_reg` | `eff_yuzu_rear_react` | 사물함 속 유탄 난사 / 개전 은신 |
| `u_akemi` | 쿠리하마 아케미 | 4 | front_only | 2300/175/98/100/0.2/0.5 | syn_outlaw, syn_tank | `eff_common_basic_atk` | `eff_akemi_skill` | `eff_akemi_ult` | `eff_akemi_passive` | — | — | 초괴력 중화기 딜탱 / 제어 저항 및 광역 분쇄 |
| `u_ako` | 아마우 아코 | 4 | rear_only | 1250/145/55/112/0.15/0.5 | syn_gehenna, syn_prefect, syn_supporter | — | — | — | — | `eff_ako_rear_reg` | `eff_ako_rear_react` | 최고 공격력 아군 치명타 극대화 / 전방 치유 보조 |
| `u_aru` | 리쿠하치마 아루 | 4 | front_only | 1480/198/52/105/0.26/0.5 | syn_gehenna, syn_problem_solver, syn_attacker, syn_unique_outlaw_boss | `eff_common_basic_atk` | `eff_aru_skill` | `eff_aru_ult` | `eff_aru_passive` | — | — | 단일+광역 폭발 메인 캐리 / 처치 에너지 환급 |
| `u_cherino` | 렌카와 체리노 | 4 | front_only | 1500/178/58/112/0.22/0.5 | syn_red_winter, syn_rw_office, syn_supporter, syn_unique_red_mustache | `eff_common_basic_atk` | `eff_cherino_skill` | `eff_cherino_ult` | `eff_cherino_passive` | — | — | 팀 SP·에너지 공급 사령관 / 숙청 표적 집점사 |
| `u_haruna` | 쿠로다테 하루나 | 4 | front_only | 1600/205/60/104/0.3/0.5 | syn_gehenna, syn_gourmet, syn_sniper | `eff_common_basic_atk` | `eff_haruna_skill` | `eff_haruna_ult` | `eff_haruna_passive` | — | — | 고HP 적 처형 저격수 / 처치 시 폭발 연쇄 |
| `u_hoshino` | 타카나시 호시노 | 4 | front_only | 2400/135/115/95/0.12/0.5 | syn_abydos, syn_tank, syn_unique_dawn_horus, syn_plat_last_line | `eff_common_basic_atk` | `eff_hoshino_skill` | `eff_hoshino_ult` | `eff_hoshino_passive` | — | — | 최상위 결전 탱커 / 광역 기절 및 거대 보호막 |
| `u_kanna` | 오가타 칸나 | 4 | front_only | 1680/182/74/114/0.22/0.5 | syn_valkyrie, syn_controller | `eff_common_basic_atk` | `eff_kanna_skill` | `eff_kanna_ult` | `eff_kanna_passive` | — | — | 집중 수사 표적 방깎 / 아군 공격 호응 추격 |
| `u_mine` | 아오모리 미네 | 4 | front_only | 2300/150/105/100/0.08/0.5 | syn_trinity, syn_remedial_knights, syn_tank | `eff_common_basic_atk` | `eff_mine_skill` | `eff_mine_ult` | `eff_mine_passive` | — | — | "구호"를 위해 돌격하는 기사단장 탱커 |
| `u_miyako` | 츠키유키 미야코 | 4 | front_only | 2250/140/108/102/0.14/0.5 | syn_srt, syn_tank | `eff_common_basic_atk` | `eff_miyako_skill` | `eff_miyako_ult` | `eff_miyako_passive` | — | — | 기절 특화 전술 탱커 / 기절 적 피해 증폭 |
| `u_miyu` | 카스미자와 미유 | 4 | dual | 1360/192/48/108/0.28/0.5 | syn_srt, syn_controller, syn_unique_invisible | `eff_common_basic_atk` | `eff_miyu_skill` | `eff_miyu_ult` | `eff_miyu_rear_react` | `eff_miyu_rear_reg` | `eff_miyu_rear_react` | 약점 노출 표적 부여 / 아군 타격 반응 추가타 |
| `u_neru` | 미카모 네루 | 4 | front_only | 1650/188/68/126/0.25/0.5 | syn_millennium, syn_cc, syn_attacker, syn_plat_codename | `eff_common_basic_atk` | `eff_neru_skill` | `eff_neru_ult` | `eff_neru_passive` | — | — | 초고속 단일 폭딜 브루저 / 피격 반격 사격 |
| `u_niya` | 텐지 니야 | 4 | rear_only | 1300/158/55/110/0.12/0.5 | syn_hyakkiyako, syn_yinyang, syn_supporter | — | — | — | — | `eff_niya_rear_reg` | `eff_niya_rear_react` | 무작위 점괘 지원 / 주기적 SP 공급 |
| `u_noa` | 우시오 노아 | 4 | rear_only | 1300/160/55/112/0.12/0.5 | syn_millennium, syn_seminar, syn_supporter | — | — | — | — | `eff_noa_rear_reg` | `eff_noa_rear_react` | 전방 공격력 대폭 버프 / 같은 적 반복 타격 강화 |
| `u_tsurugi` | 켄자키 츠루기 | 4 | front_only | 1650/195/62/112/0.25/0.5 | syn_trinity, syn_justice, syn_attacker | `eff_common_basic_atk` | `eff_tsurugi_skill` | `eff_tsurugi_ult` | `eff_tsurugi_passive` | — | — | 광폭한 산탄 결전 딜러 / 맞을수록 강해짐 |
| `u_akira` | 키요스미 아키라 | 5 | front_only | 2000/232/66/124/0.3/0.5 | syn_outlaw, syn_attacker | `eff_common_basic_atk` | `eff_akira_skill` | `eff_akira_ult` | `eff_akira_passive`, `eff_akira_aura` | — | — | 적 버프 강탈·무력화 / 존재 효과: 개전 버프 강탈 |
| `u_al1s` | AL-1S | 5 | dual | 2050/240/66/104/0.25/0.5 | syn_millennium, syn_game_dev, syn_blaster, syn_unique_nameless_princess, syn_plat_ending_credits | `eff_common_basic_atk` | `eff_al1s_skill` | `eff_al1s_ult` | `eff_al1s_passive`, `eff_al1s_aura` | `eff_al1s_rear_reg` | `eff_al1s_rear_react`, `eff_al1s_aura` | 각성 전용(상점 없음) 광역 방어 무시 캐리 / 존재 효과: 적 전원 받는 피해 증가 |
| `u_hikari` | 타치바나 히카리 | 5 | front_only | 1800/220/72/122/0.26/0.5 | syn_highlander, syn_blaster | `eff_common_basic_atk` | `eff_hikari_skill` | `eff_hikari_ult` | `eff_hikari_passive` | — | — | 전방 버프 증폭기 / 초특급 열차포 광역 타격 |
| `u_himari` | 아케보시 히마리 | 5 | rear_only | 1300/165/60/118/0.15/0.5 | syn_millennium, syn_paranormal, syn_supporter | — | — | — | — | `eff_himari_rear_reg` | `eff_himari_rear_react` | 최고 공격력 아군 초증폭 + 팀 SP·에너지 공급 |
| `u_hina` | 소라사키 히나 | 5 | front_only | 2100/235/78/114/0.28/0.5 | syn_gehenna, syn_prefect, syn_blaster, syn_unique_head_prefect | `eff_common_basic_atk` | `eff_hina_skill` | `eff_hina_ult` | `eff_hina_passive`, `eff_hina_aura` | — | — | 광역 절대 화력 캐리 / 존재 효과: 적 전방 방어력 약화 |
| `u_hoshino_armed` | 타카나시 호시노 (무장) | 5 | front_only | 2700/238/100/110/0.3/0.5 | syn_abydos, syn_tank | `eff_common_basic_atk` | `eff_hoshino_armed_skill` | `eff_hoshino_armed_ult` | `eff_hoshino_armed_passive` | — | — | 공방 일체 결전 황제 / 보호막 관통 폭격 |
| `u_kisaki` | 류우게 키사키 | 5 | dual | 1850/195/80/116/0.2/0.5 | syn_shanhaijing, syn_genryumon, syn_supporter | `eff_common_basic_atk` | `eff_kisaki_skill` | `eff_kisaki_ult` | `eff_kisaki_rear_react` | `eff_kisaki_rear_reg` | `eff_kisaki_rear_react` | 필살기 위력 절대 증폭 / 전후방 겸용 군주 지휘관 |
| `u_mika` | 미소노 미카 | 5 | front_only | 2250/240/85/108/0.45/0.5 | syn_trinity, syn_tea_party, syn_attacker, syn_unique_princess_stars, syn_plat_tea_party | `eff_common_basic_atk` | `eff_mika_skill` | `eff_mika_ult` | `eff_mika_passive`, `eff_mika_aura` | — | — | 확정 치명타 결전 브루저 / 존재 효과: 아군 전방 치명 증가 |
| `u_nagisa` | 키리후지 나기사 | 5 | rear_only | 1450/175/70/118/0.12/0.5 | syn_trinity, syn_tea_party, syn_supporter, syn_plat_tea_party | — | — | — | — | `eff_nagisa_rear_reg` | `eff_nagisa_aura` | 티파티 호스트 / 전방 공격·에너지·방어 총괄 지원 |
| `u_rio` | 츠카츠키 리오 | 5 | rear_only | 1400/170/70/114/0.15/0.5 | syn_millennium, syn_seminar, syn_supporter | — | — | — | — | `eff_rio_rear_reg` | `eff_rio_rear_react` | 후방 전체 보호막·방깎 + 아군 필살기 호응 포격 |
| `u_saori` | 죠마에 사오리 | 5 | front_only | 2000/242/68/118/0.35/0.5 | syn_arius, syn_sniper, syn_plat_vanitas | `eff_common_basic_atk` | `eff_saori_skill` | `eff_saori_ult` | `eff_saori_passive` | — | — | 확정 치명타 관통 사수 / 아리우스 연쇄 협동 공격 |
| `u_seia` | 유리조노 세이아 | 5 | rear_only | 1400/185/65/116/0.15/0.5 | syn_trinity, syn_tea_party, syn_controller, syn_plat_tea_party | — | — | — | — | `eff_seia_rear_reg` | `eff_seia_aura` | 예지 침묵 / 적 필살기 대비 |
| `u_wakamo` | 코사카 와카모 | 5 | front_only | 2000/248/62/115/0.28/0.5 | syn_hyakkiyako, syn_outlaw, syn_attacker, syn_unique_calamity_fox | `eff_common_basic_atk` | `eff_wakamo_skill` | `eff_wakamo_ult` | `eff_wakamo_passive`, `eff_wakamo_aura` | — | — | 단일 결전 폭발 딜러 / 존재 효과: 적 전원 속도 저하 |

## 4. 시너지 v2.3 (64종)

F/R/D는 구성원 중 전방 전용/후방 전용/겸용 수, 최대 합법은 v2.1 6장 용량 식(전방 4·후방 6·출전 10)으로 센 값이다. 각성 학생 AL-1S는 아리스와 같은 사람이라 따로 세지 않는다(1장). 그래서 구성원 칸에 `al1s`가 있어도 F/R/D는 그대로다.

| ID | 이름 | 분류 | 집계 범위 | 단계 | F/R/D | 최대 합법 | 구성원 |
|---|---|---|---|---|---|---|---|
| `syn_abydos` | 아비도스 | faction | `deployed_all` | 2: eff_syn_abydos_2; 4: eff_syn_abydos_4; 5: eff_syn_abydos_6 | 5/1/0 | 5 | serika, shiroko, ayane, nonomi, hoshino, hoshino_armed |
| `syn_gehenna` | 게헨나 | faction | `deployed_all` | 2: eff_syn_gehenna_2; 4: eff_syn_gehenna_4; 6: eff_syn_gehenna_6 | 9/5/2 | 10 | haruka, junko, fuuka, kayoko, iori, mutsuki, aru, ako, hina, chinatsu, haruna, izumi, akari, juri, kasumi, megu |
| `syn_millennium` | 밀레니엄 | faction | `deployed_all` | 2: eff_syn_millennium_2; 4: eff_syn_millennium_4; 6: eff_syn_millennium_6 | 7/12/3 | 10 | kotama, asuna, yuuka, momoi, hare, karin, toki, neru, aris, al1s, himari, rio, akane, midori, yuzu, chihiro, maki, noa, koyuki, utaha, hibiki, kotori, eimi |
| `syn_trinity` | 트리니티 | faction | `deployed_all` | 2: eff_syn_trinity_2; 4: eff_syn_trinity_4; 6: eff_syn_trinity_6 | 9/8/2 | 10 | suzumi, serina, hasumi, azusa, koharu, mika, hifumi, hanako, nagisa, seia, tsurugi, mashiro, mine, hanae, reisa, kazusa, yoshimi, airi, natsu |
| `syn_hyakkiyako` | 백귀야행 | faction | `deployed_all` | 2: eff_syn_hyakkiyako_2; 4: eff_syn_hyakkiyako_4; 5: eff_syn_hyakkiyako_6 | 6/4/0 | 8 | michiru, tsubaki, izuna, shizuko, wakamo, tsukuyo, mimori, kaede, niya, chise |
| `syn_shanhaijing` | 산해경 | faction | `deployed_all` | 2: eff_syn_shanhaijing_2; 4: eff_syn_shanhaijing_4 | 2/0/2 | 4 | kokona, shun, mina, kisaki |
| `syn_red_winter` | 붉은겨울 | faction | `deployed_all` | 2: eff_syn_red_winter_2; 4: eff_syn_red_winter_4 | 4/3/0 | 7 | nodoka, momiji, marina, cherino, tomoe, meru, shigure |
| `syn_valkyrie` | 발키리 | faction | `deployed_all` | 2: eff_syn_valkyrie_2; 3: eff_syn_valkyrie_3 | 3/0/0 | 3 | fubuki, kirino, kanna |
| `syn_srt` | SRT | faction | `deployed_all` | 2: eff_syn_srt_2; 4: eff_syn_srt_4 | 1/1/2 | 4 | moe, saki, miyu, miyako |
| `syn_arius` | 아리우스 | faction | `deployed_all` | 2: eff_syn_arius_2; 4: eff_syn_arius_4 | 3/2/0 | 5 | azusa, atsuko, hiyori, saori, misaki |
| `syn_highlander` | 하이랜더 | faction | `deployed_all` | 1: eff_syn_highlander_1; 2: eff_syn_highlander_2 | 2/0/0 | 2 | nozomi, hikari |
| `syn_outlaw` | 무법자 — 칠수인·헬멧단 | faction | `deployed_all` | 2: eff_syn_outlaw_2; 4: eff_syn_outlaw_4 | 4/0/0 | 4 | rabu, akemi, wakamo, akira |
| `syn_problem_solver` | 흥신소68 | club | `deployed_all` | 2: eff_syn_ps68_2; 4: eff_syn_ps68_4 | 2/0/2 | 4 | haruka, kayoko, mutsuki, aru |
| `syn_prefect` | 선도부 | club | `deployed_all` | 2: eff_syn_prefect_2; 4: eff_syn_prefect_4 | 2/2/0 | 4 | iori, ako, hina, chinatsu |
| `syn_gourmet` | 미식연구회 | club | `deployed_all` | 2: eff_syn_gourmet_2; 4: eff_syn_gourmet_4 | 4/0/0 | 4 | junko, haruna, izumi, akari |
| `syn_school_lunch` | 급양부 | club | `deployed_all` | 2: eff_syn_school_lunch_2 | 0/2/0 | 2 | fuuka, juri |
| `syn_hot_spring` | 온천개발부 | club | `deployed_all` | 2: eff_syn_hot_spring_2 | 1/1/0 | 2 | kasumi, megu |
| `syn_cc` | C&C | club | `deployed_all` | 2: eff_syn_cc_2; 4: eff_syn_cc_4 | 4/1/0 | 5 | asuna, karin, toki, neru, akane |
| `syn_game_dev` | 게임개발부 | club | `deployed_all` | 2: eff_syn_game_dev_2; 4: eff_syn_game_dev_4 | 1/1/2 | 4 | momoi, aris, al1s, midori, yuzu |
| `syn_veritas` | 베리타스 | club | `deployed_all` | 2: eff_syn_veritas_2; 4: eff_syn_veritas_4 | 0/4/0 | 4 | kotama, hare, chihiro, maki |
| `syn_seminar` | 세미나 | club | `deployed_all` | 2: eff_syn_seminar_2; 4: eff_syn_seminar_4 | 1/2/1 | 4 | yuuka, rio, noa, koyuki |
| `syn_engineering` | 엔지니어부 | club | `deployed_all` | 2: eff_syn_engineering_2; 3: eff_syn_engineering_3 | 0/3/0 | 3 | utaha, hibiki, kotori |
| `syn_paranormal` | 초현상특무부 | club | `deployed_all` | 2: eff_syn_paranormal_2 | 1/1/0 | 2 | himari, eimi |
| `syn_make_up` | 보충수업부 | club | `deployed_all` | 2: eff_syn_make_up_2; 4: eff_syn_make_up_4 | 1/2/1 | 4 | azusa, koharu, hifumi, hanako |
| `syn_tea_party` | 티파티 | club | `deployed_all` | 2: eff_syn_tea_party_2; 3: eff_syn_tea_party_3 | 1/2/0 | 3 | mika, nagisa, seia |
| `syn_justice` | 정의실현위원회 | club | `deployed_all` | 2: eff_syn_justice_2; 3: eff_syn_justice_3 | 2/1/0 | 3 | hasumi, tsurugi, mashiro |
| `syn_vigilante` | 자경단 | club | `deployed_all` | 2: eff_syn_vigilante_2 | 1/0/1 | 2 | suzumi, reisa |
| `syn_remedial_knights` | 구호기사단 | club | `deployed_all` | 2: eff_syn_remedial_knights_2; 3: eff_syn_remedial_knights_3 | 1/2/0 | 3 | serina, mine, hanae |
| `syn_sweets` | 디저트부 | club | `deployed_all` | 2: eff_syn_sweets_2; 4: eff_syn_sweets_4 | 3/1/0 | 4 | kazusa, yoshimi, airi, natsu |
| `syn_ninjutsu` | 인법연구부 | club | `deployed_all` | 2: eff_syn_ninjutsu_2; 3: eff_syn_ninjutsu_3 | 3/0/0 | 3 | michiru, izuna, tsukuyo |
| `syn_training` | 수행부 | club | `deployed_all` | 2: eff_syn_training_2; 3: eff_syn_training_3 | 2/1/0 | 3 | tsubaki, mimori, kaede |
| `syn_yinyang` | 음양부 | club | `deployed_all` | 2: eff_syn_yinyang_2 | 0/2/0 | 2 | niya, chise |
| `syn_plum_blossom` | 매화원 | club | `deployed_all` | 2: eff_syn_plum_blossom_2 | 1/0/1 | 2 | kokona, shun |
| `syn_genryumon` | 현룡문 | club | `deployed_all` | 2: eff_syn_genryumon_2 | 1/0/1 | 2 | mina, kisaki |
| `syn_rw_office` | 붉은겨울 사무국 | club | `deployed_all` | 2: eff_syn_rw_office_2; 3: eff_syn_rw_office_3 | 2/1/0 | 3 | marina, cherino, tomoe |
| `syn_knowledge_front` | 지식해방전선 | club | `deployed_all` | 2: eff_syn_knowledge_front_2 | 1/1/0 | 2 | momiji, meru |
| `syn_class_227` | 227호 특별반 | club | `deployed_all` | 2: eff_syn_class_227_2 | 1/1/0 | 2 | nodoka, shigure |
| `syn_life_safety` | 생활안전국 | club | `deployed_all` | 2: eff_syn_life_safety_2 | 2/0/0 | 2 | fubuki, kirino |
| `syn_tank` | 탱커 | role | `deployed_all` | 2: eff_syn_tank_2; 3: eff_syn_tank_3; 4: eff_syn_tank_4 | 13/0/0 | 4 | haruka, yuuka, tsubaki, marina, atsuko, hoshino, miyako, akemi, hoshino_armed, eimi, mine, natsu, tsukuyo |
| `syn_attacker` | 어태커 | role | `deployed_all` | 2: eff_syn_attacker_2; 3: eff_syn_attacker_3; 4: eff_syn_attacker_4 | 18/0/0 | 4 | serika, asuna, shiroko, nozomi, iori, izuna, aru, neru, mika, wakamo, akira, izumi, midori, tsurugi, reisa, kazusa, yoshimi, shigure |
| `syn_sniper` | 스나이퍼 | role | `deployed_all` | 2: eff_syn_sniper_2; 4: eff_syn_sniper_4 | 6/3/0 | 7 | fubuki, hasumi, karin, shun, azusa, hiyori, saori, haruna, mashiro |
| `syn_blaster` | 블래스터 | role | `deployed_all` | 2: eff_syn_blaster_2; 4: eff_syn_blaster_4; 6: eff_syn_blaster_6 | 12/7/3 | 10 | junko, michiru, rabu, momoi, momiji, nonomi, mutsuki, toki, moe, aris, al1s, hina, hikari, akari, kasumi, megu, akane, yuzu, maki, hibiki, kaede, chise, misaki |
| `syn_healer` | 힐러 | role | `deployed_all` | 2: eff_syn_healer_2; 4: eff_syn_healer_4 | 0/7/2 | 8 | serina, kokona, fuuka, ayane, koharu, shizuko, chinatsu, hanako, hanae |
| `syn_supporter` | 서포터 | role | `deployed_all` | 2: eff_syn_supporter_2; 4: eff_syn_supporter_4 | 1/16/2 | 9 | kotama, nodoka, saki, ako, cherino, himari, rio, kisaki, juri, chihiro, noa, utaha, kotori, hifumi, nagisa, airi, mimori, niya, tomoe |
| `syn_controller` | 컨트롤러 | role | `deployed_all` | 2: eff_syn_controller_2; 4: eff_syn_controller_4 | 3/3/4 | 10 | suzumi, hare, kayoko, kirino, mina, miyu, kanna, koyuki, seia, meru |
| `syn_unique_dawn_horus` | 「으헤~ 아저씨는 좀 쉴래」 | unique | `front_only` | 1: eff_syn_uni_hoshino | 1/0/0 | 1 | hoshino |
| `syn_unique_outlaw_boss` | 「계획대로야!」 | unique | `front_only` | 1: eff_syn_uni_aru | 1/0/0 | 1 | aru |
| `syn_unique_head_prefect` | 「조금만 쉬고 싶어」 | unique | `front_only` | 1: eff_syn_uni_hina | 1/0/0 | 1 | hina |
| `syn_unique_princess_stars` | 「롤케이크」 | unique | `front_only` | 1: eff_syn_uni_mika | 1/0/0 | 1 | mika |
| `syn_unique_calamity_fox` | 「당신만 바라볼게요」 | unique | `front_only` | 1: eff_syn_uni_wakamo | 1/0/0 | 1 | wakamo |
| `syn_unique_red_mustache` | 「수염의 위엄」 | unique | `front_only` | 1: eff_syn_uni_cherino | 1/0/0 | 1 | cherino |
| `syn_unique_level_up` | 「빠밤! 레벨업」 | unique | `deployed_all` | 1: eff_syn_uni_aris | 0/0/1 | 1 | aris |
| `syn_unique_nameless_princess` | 「이름 없는 신들의 왕녀」 | unique | `deployed_all` | 1: eff_syn_uni_al1s | 0/0/1 | 1 | al1s |
| `syn_unique_invisible` | 「저 여기 있어요…」 | unique | `deployed_all` | 1: eff_syn_uni_miyu | 0/0/1 | 1 | miyu |
| `syn_unique_bank_robber` | 「은행 털러 가자」 | unique | `front_only` | 1: eff_syn_uni_shiroko | 1/0/0 | 1 | shiroko |
| `syn_unique_gold_card` | 「골드 카드」 | unique | `front_only` | 1: eff_syn_uni_nonomi | 1/0/0 | 1 | nonomi |
| `syn_unique_caspalug` | 「카스팔루그」 | unique | `front_only` | 1: eff_syn_uni_kazusa | 1/0/0 | 1 | kazusa |
| `syn_plat_vanitas` | 「Vanitas vanitatum」 | platinum | `deployed_all` | 5: eff_syn_plat_vanitas | 3/2/0 | 5 | azusa, atsuko, hiyori, saori, misaki |
| `syn_plat_ending_credits` | 「엔딩 크레딧」 | platinum | `deployed_all` | 4: eff_syn_plat_ending_credits | 1/1/2 | 4 | momoi, aris, al1s, midori, yuzu |
| `syn_plat_codename` | 「코드네임 00~05」 | platinum | `deployed_all` | 5: eff_syn_plat_codename | 4/1/0 | 5 | asuna, karin, toki, neru, akane |
| `syn_plat_tea_party` | 「티파티 삼두정치」 | platinum | `deployed_all` | 3: eff_syn_plat_tea_party | 1/2/0 | 3 | mika, nagisa, seia |
| `syn_plat_last_line` | 「아비도스 최후의 방어선」 | platinum | `deployed_all` | 5: eff_syn_plat_last_line | 4/1/0 | 5 | serika, shiroko, ayane, nonomi, hoshino |
| `syn_plat_school_battle` | 「키보토스 학원 대항전」 | platinum | `special` | 10: eff_syn_plat_school_battle | 0/0/0 | 0 | — |
| `syn_plat_total_assault` | 「총력전 만점」 | platinum | `special` | 10: eff_syn_plat_total_assault | 0/0/0 | 0 | — |

### 4.1 동아리 원작 설정

- **흥신소68** (`syn_problem_solver`): 아웃로를 꿈꾸는 해결사 사무소. 늘 돈이 없고 사무실이 자주 날아간다.
- **선도부** (`syn_prefect`): 게헨나의 치안 담당. 일에 치이는 위원장 히나, 행정관 아코, 의료 담당 치나츠.
- **미식연구회** (`syn_gourmet`): 맛집을 평가하다 마음에 안 들면 가게를 폭파하는 테러 미식가들.
- **급양부** (`syn_school_lunch`): 게헨나 학생 수천 명의 밥을 둘이서 책임지는 급식 담당. 단골 납치 피해자.
- **온천개발부** (`syn_hot_spring`): 온천을 찾겠다며 아무 데나 땅을 파고 폭파하는 동아리.
- **C&C** (`syn_cc`): 메이드 차림의 비밀 요원 부대. 콜사인 00~05로 서로를 부른다.
- **게임개발부** (`syn_game_dev`): 폐부 위기의 게임 개발부. 대표작은 전설의 쿠소게 「테일즈 사가 크로니클」.
- **베리타스** (`syn_veritas`): 밀레니엄의 해커 집단. 코타마는 도청이 취미, 마키는 그래피티.
- **세미나** (`syn_seminar`): 밀레니엄 학생회. 회계 유우카, 서기 노아, 도박 좋아하는 코유키, 자리 비운 회장 리오.
- **엔지니어부** (`syn_engineering`): 뭐든 만들고 뭐든 터뜨리는 발명 동아리.
- **초현상특무부** (`syn_paranormal`): 초현상을 조사하는 부서. 병약한 천재 히마리와 추위를 안 타는 에이미.
- **보충수업부** (`syn_make_up`): 낙제 위기 학생들이 모인 방과후 보충수업부. 시험에 붙어야 해체를 면한다.
- **티파티** (`syn_tea_party`): 트리니티를 이끄는 세 분파의 수장 모임. 차를 마시며 학원을 움직인다.
- **정의실현위원회** (`syn_justice`): 트리니티의 무력 조직. 광폭한 위원장 츠루기, 부위원장 하스미, 저격수 마시로.
- **자경단** (`syn_vigilante`): 정의실현위원회와 따로 움직이는 학생 자경단. 스즈미의 섬광탄과 레이사의 열정.
- **구호기사단** (`syn_remedial_knights`): 트리니티의 의료 조직. 단장 미네는 "구호"를 위해 먼저 돌격한다.
- **디저트부** (`syn_sweets`): 달콤한 것만 찾아다니는 방과후 디저트부. 카즈사는 한때 "캬스파리그"로 불린 불량배.
- **인법연구부** (`syn_ninjutsu`): 닌자 놀이 동아리. 부장 미치루는 SNS에 인법 영상을 올린다.
- **수행부** (`syn_training`): 수행에 힘쓰는 동아리. 하지만 부장 츠바키는 늘 졸고 있다.
- **음양부** (`syn_yinyang`): 점과 부적을 다루는 동아리. 운세를 보고 축제 일정을 정한다.
- **매화원** (`syn_plum_blossom`): 어린 학생들을 돌보는 곳. 꼬마 교관 코코나의 "참 잘했어요" 도장.
- **현룡문** (`syn_genryumon`): 산해경을 다스리는 문주 키사키와 그를 지키는 집행부 미나.
- **붉은겨울 사무국** (`syn_rw_office`): 서기장 체리노, 충성스러운 공안국장 마리나, 실무를 도맡는 토모에.
- **지식해방전선** (`syn_knowledge_front`): 붉은겨울의 도서관을 지키며 "지식의 자유"를 외치는 동아리.
- **227호 특별반** (`syn_class_227`): 혹한의 열차 정류장에서 버티는 문제아 반.
- **생활안전국** (`syn_life_safety`): 근무 중 도넛 먹는 후부키와 정의감만 넘치는 키리노의 순경 콤비.

## 5. 효과 v2.3 (교체·추가)

형식은 v2.1 부록 C와 같다. 원안 행이 `v2.3 조정`이면 같은 ID의 v2.1 효과를 대체하고, `v2.3 신규`면 새로 추가한다.

### V.001 `eff_hina_aura`
- 출처/구역: u_hina 전방 패시브 / `front`. 원안 행: v2.3 신규.
- 실행: **패시브/반응 컨테이너**. battle_start.
- 본문: 존재 효과 「선도부장의 위압」: 히나가 출전해 있는 동안 적 전방 전원 DEF -10%
- 제한: 개인 차례당1회, handler/root당 1회; 상시·초기 효과는 해당 시점에만.

### V.002 `eff_mika_aura`
- 출처/구역: u_mika 전방 패시브 / `front`. 원안 행: v2.3 신규.
- 실행: **패시브/반응 컨테이너**. battle_start.
- 본문: 존재 효과 「티파티의 공주」: 미카가 출전해 있는 동안 아군 전방 전원 CRIT +10%
- 제한: 개인 차례당1회, handler/root당 1회; 상시·초기 효과는 해당 시점에만.

### V.003 `eff_wakamo_aura`
- 출처/구역: u_wakamo 전방 패시브 / `front`. 원안 행: v2.3 신규.
- 실행: **패시브/반응 컨테이너**. battle_start.
- 본문: 존재 효과 「재액의 여우」: 와카모가 출전해 있는 동안 적 전원 SPD -10
- 제한: 개인 차례당1회, handler/root당 1회; 상시·초기 효과는 해당 시점에만.

### V.004 `eff_akira_aura`
- 출처/구역: u_akira 전방 패시브 / `front`. 원안 행: v2.3 신규.
- 실행: **패시브/반응 컨테이너**. battle_start.
- 본문: 존재 효과 「괴도의 예고장」: 전투 시작 시(`battle_start`) 적 1명의 버프 1개를 빼앗아 ATK가 가장 높은 아군 1명에게 옮긴다
- 제한: 개인 차례당1회, handler/root당 1회; 상시·초기 효과는 해당 시점에만.

### V.005 `eff_serika_passive`
- 출처/구역: u_serika 전방 패시브 / `front`. 원안 행: v2.3 조정.
- 실행: **패시브/반응 컨테이너**. battle_won.
- 본문: 「아르바이트 수당」: 전투에서 승리할 때마다(`battle_won`) 자신의 ATK +2% 영구 누적(런 종료까지, 최대 +30%)
- 제한: 개인 차례당1회, handler/root당 1회; 상시·초기 효과는 해당 시점에만.

### V.006 `eff_suzumi_ult`
- 출처/구역: u_suzumi 필살기 / `front`. 원안 행: v2.3 조정.
- 실행: **ULTIMATE 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 적 전방 전원에게 ATK 130/150/180% 피해, 적 최전열 1명에게 50/65/85% 확률로 1턴 기절(`st_stun`) 부여
- 제한: CD0; 개인 차례당 1회; ENERGY100 소비.

### V.007 `eff_suzumi_rear_reg`
- 출처/구역: u_suzumi 후방 정기 지원 / `rear`. 원안 행: v2.3 조정.
- 실행: **REAR 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 후방 정기 행동(`rear_action`)마다 적 중 SPD가 가장 높은 1명에게 2턴간 ATK -15/18/22%(`st_atk_down`) 부여
- 제한: 정상 후방 차례당1회; 기본 SP/에너지 소비·지급 없음.

### V.008 `eff_kotama_rear_reg`
- 출처/구역: u_kotama 후방 정기 지원 / `rear`. 원안 행: v2.3 조정.
- 실행: **REAR 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 후방 정기 행동(`rear_action`)마다 2턴간 아군 전방 전원 ATK +10/13/18%(`st_atk_up`) 부여
- 제한: 정상 후방 차례당1회; 기본 SP/에너지 소비·지급 없음.

### V.009 `eff_serina_rear_reg`
- 출처/구역: u_serina 후방 정기 지원 / `rear`. 원안 행: v2.3 조정.
- 실행: **REAR 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 후방 정기 차례: HP 비율이 가장 낮은 생존 전방 아군 1명을 ATK 160/185/220% + 80/140/240 치유한다.
- 제한: 정상 후방 차례당1회; 기본 SP/에너지 소비·지급 없음.

### V.010 `eff_michiru_ult`
- 출처/구역: u_michiru 필살기 / `front`. 원안 행: v2.3 조정.
- 실행: **ULTIMATE 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 적 최전열 2명에게 ATK 185/215/260% 피해
- 제한: CD0; 개인 차례당 1회; ENERGY100 소비.

### V.011 `eff_kokona_skill`
- 출처/구역: u_kokona 전투 스킬 / `front`. 원안 행: v2.3 조정.
- 실행: **SKILL 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 전방 배치 시 최저 HP 아군을 ATK 150/175/210% 치유
- 제한: CD2; 기본 비용/자원은7.4; 자동 사용 조건10.3.

### V.012 `eff_kokona_ult`
- 출처/구역: u_kokona 필살기 / `front`. 원안 행: v2.3 조정.
- 실행: **ULTIMATE 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 전방 배치 시 아군 전방 전원을 ATK 135/160/195% 치유
- 제한: CD0; 개인 차례당 1회; ENERGY100 소비.

### V.013 `eff_nodoka_rear_reg`
- 출처/구역: u_nodoka 후방 정기 지원 / `rear`. 원안 행: v2.3 조정.
- 실행: **REAR 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 후방 정기 행동(`rear_action`)마다 아군 전방 전원에게 2턴간 CRIT +10/13/18%(`st_crit_up`) 부여
- 제한: 정상 후방 차례당1회; 기본 SP/에너지 소비·지급 없음.

### V.014 `eff_fubuki_skill`
- 출처/구역: u_fubuki 전투 스킬 / `front`. 원안 행: v2.3 조정.
- 실행: **SKILL 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 적대 전방 도발 우선 최전방 1명에게 ATK 130% 피해 후 자신에게 2턴간 ATK +20%(`st_atk_up`)
- 제한: CD2; 기본 비용/자원은7.4; 자동 사용 조건10.3.

### V.015 `eff_rabu_skill`
- 출처/구역: u_rabu 전투 스킬 / `front`. 원안 행: v2.3 조정.
- 실행: **SKILL 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 적 최전열 2명에게 ATK 130% 피해
- 제한: CD2; 기본 비용/자원은7.4; 자동 사용 조건10.3.

### V.016 `eff_hare_rear_reg`
- 출처/구역: u_hare 후방 정기 지원 / `rear`. 원안 행: v2.3 조정.
- 실행: **REAR 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 후방 정기 행동(`rear_action`)마다 적 전방 전원에게 ATK 95/115/145% 피해 및 30/45/60% 확률 1턴 침묵(`st_silence`) 부여
- 제한: 정상 후방 차례당1회; 기본 SP/에너지 소비·지급 없음.

### V.017 `eff_shun_passive`
- 출처/구역: u_shun 전방 패시브 / `front`. 원안 행: v2.3 조정.
- 실행: **패시브/반응 컨테이너**. battle_start.
- 본문: 전투 시작 시(`battle_start`) 자신의 초기 에너지 +35
- 제한: 개인 차례당1회, handler/root당 1회; 상시·초기 효과는 해당 시점에만.

### V.018 `eff_momiji_ult`
- 출처/구역: u_momiji 필살기 / `front`. 원안 행: v2.3 조정.
- 실행: **ULTIMATE 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 적 전방 전원에게 ATK 150/175/215% 광역 폭발 피해
- 제한: CD0; 개인 차례당 1회; ENERGY100 소비.

### V.019 `eff_kirino_skill`
- 출처/구역: u_kirino 전투 스킬 / `front`. 원안 행: v2.3 조정.
- 실행: **SKILL 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 적 최전열 2명에게 ATK 115% 피해 및 2턴간 ATK -20%(`st_atk_down`) 부여
- 제한: CD2; 기본 비용/자원은7.4; 자동 사용 조건10.3.

### V.020 `eff_kirino_ult`
- 출처/구역: u_kirino 필살기 / `front`. 원안 행: v2.3 조정.
- 실행: **ULTIMATE 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 적 전방 전원에게 ATK 140/165/200% 피해 및 행동 시간 20% 지연
- 제한: CD0; 개인 차례당 1회; ENERGY100 소비.

### V.021 `eff_mutsuki_ult`
- 출처/구역: u_mutsuki 필살기 / `front`. 원안 행: v2.3 조정.
- 실행: **ULTIMATE 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 전방 배치 시 적 전방 전원에게 ATK 205/240/290% 피해
- 제한: CD0; 개인 차례당 1회; ENERGY100 소비.

### V.022 `eff_shizuko_rear_reg`
- 출처/구역: u_shizuko 후방 정기 지원 / `rear`. 원안 행: v2.3 조정.
- 실행: **REAR 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 후방 정기 행동(`rear_action`)마다 아군 전방 전원에게 2턴간 ATK 110/130/160% 보호막 + CRIT +12% 부여
- 제한: 정상 후방 차례당1회; 기본 SP/에너지 소비·지급 없음.

### V.023 `eff_toki_ult`
- 출처/구역: u_toki 필살기 / `front`. 원안 행: v2.3 조정.
- 실행: **ULTIMATE 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 적 전방 전원에게 ATK 180/210/255% 피해 및 최전열 적에게 ATK 80% 방어 무시(`true`) 추가 피해
- 제한: CD0; 개인 차례당 1회; ENERGY100 소비.

### V.024 `eff_mina_passive`
- 출처/구역: u_mina 전방 패시브 / `front`. 원안 행: v2.3 조정.
- 실행: **패시브/반응 컨테이너**. 자기 디버프 status_applied.
- 본문: 자신이 적에게 디버프를 실제 적용/갱신한 status_applied에서 자기 에너지 +12. 개인 차례당 1회.
- 제한: 개인 차례당1회, handler/root당 1회; 상시·초기 효과는 해당 시점에만.

### V.025 `eff_moe_rear_reg`
- 출처/구역: u_moe 후방 정기 지원 / `rear`. 원안 행: v2.3 조정.
- 실행: **REAR 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 후방 정기 행동(`rear_action`)마다 적 전방 전원에게 ATK 115/135/165% 광역 피해
- 제한: 정상 후방 차례당1회; 기본 SP/에너지 소비·지급 없음.

### V.026 `eff_miyako_ult`
- 출처/구역: u_miyako 필살기 / `front`. 원안 행: v2.3 조정.
- 실행: **ULTIMATE 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 적 최전열 2명에게 ATK 220/255/310% 피해 및 그중 1명에게 1턴 확정 기절, 아군 전방 전원에게 2턴간 최대 HP 20% 보호막 부여
- 제한: CD0; 개인 차례당 1회; ENERGY100 소비.

### V.027 `eff_mika_ult`
- 출처/구역: u_mika 필살기 / `front`. 원안 행: v2.3 조정.
- 실행: **ULTIMATE 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 적 전방 중 현재 HP가 가장 높은 단일 대상에게 ATK 420/490/600% 결전 피해
- 제한: CD0; 개인 차례당 1회; ENERGY100 소비.

### V.028 `eff_wakamo_ult`
- 출처/구역: u_wakamo 필살기 / `front`. 원안 행: v2.3 조정.
- 실행: **ULTIMATE 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 적 최고 현재 HP 1명에게 ATK 320/375/460% `normal` 피해
- 제한: CD0; 개인 차례당 1회; ENERGY100 소비.

### V.029 `eff_rio_rear_react`
- 출처/구역: u_rio 후방 반응 지원 / `rear`. 원안 행: v2.3 조정.
- 실행: **패시브/반응 컨테이너**. ultimate_resolved.
- 본문: 아군 전방이 필살기 해소 시(`ultimate_resolved`) 최전열 적에게 ATK 165/195/245% 후속 포격(쿨다운 1턴)
- 제한: CD1(소유자 정상 차례), 개인 차례당1회, handler/root당 1회.

### V.030 `eff_kisaki_skill`
- 출처/구역: u_kisaki 전투 스킬 / `front`. 원안 행: v2.3 조정.
- 실행: **SKILL 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 전방 배치 시 아군 전방 전원에게 2턴간 필살기 피해량 +35% 부여
- 제한: CD2; 기본 비용/자원은7.4; 자동 사용 조건10.3.

### V.031 `eff_str_overclock`
- 출처/구역: 전략 str_overclock_core / `global`. 원안 행: v2.3 조정.
- 실행: **전략 컨테이너: 상시·반응·카운터·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 아군 전방이 필살기를 해소하면(`ultimate_resolved`) 그 학생의 스킬 남은 재사용 대기 -1(최소 0), 다음 행동 시간 25% 당김. 학생마다 개인 차례당 1회.
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.032 `eff_str_sandstorm`
- 출처/구역: 전략 str_sandstorm_endurance / `global`. 원안 행: v2.3 조정.
- 실행: **전략 컨테이너: 상시·반응·카운터·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: AV 300·600·900마다 적 전방 전원에게 모래폭풍 피해: 일반 적은 대상 최대 HP 8%, 보스는 생존 아군(전방+후방) 평균 ATK 120% 기준 `normal` 피해(치명타 없음). 맞은 적은 2차례 동안 SPD -15.
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.033 `eff_chinatsu_rear_reg`
- 출처/구역: u_chinatsu 후방 정기 지원 / `rear`. 원안 행: v2.3 신규.
- 실행: **REAR 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 후방 정기 행동(`rear_action`)마다 HP 비율이 가장 낮은 아군 1명을 ATK 150/170/205% 치유하고 디버프 1개를 해제
- 제한: 정상 후방 차례당1회; 기본 SP/에너지 소비·지급 없음.

### V.034 `eff_chinatsu_rear_react`
- 출처/구역: u_chinatsu 후방 반응 지원 / `rear`. 원안 행: v2.3 신규.
- 실행: **패시브/반응 컨테이너**. status_applied.
- 본문: 아군이 기절(`st_stun`) 또는 침묵(`st_silence`)에 걸리면(`status_applied`) 즉시 해제(쿨다운 2턴)
- 제한: CD2(소유자 정상 차례), 개인 차례당1회, handler/root당 1회.

### V.035 `eff_haruna_skill`
- 출처/구역: u_haruna 전투 스킬 / `front`. 원안 행: v2.3 신규.
- 실행: **SKILL 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 적 전방 중 현재 HP가 가장 높은 1명에게 ATK 180% 피해. 대상의 HP가 50% 이하이면 피해 +30%
- 제한: CD2; 기본 비용/자원은7.4; 자동 사용 조건10.3.

### V.036 `eff_haruna_ult`
- 출처/구역: u_haruna 필살기 / `front`. 원안 행: v2.3 신규.
- 실행: **ULTIMATE 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 적 전방 중 현재 HP가 가장 높은 1명에게 ATK 340/395/480% 피해. 이 공격으로 처치하면 적 전방 전원에게 ATK 100% "별점 0개" 폭발 피해
- 제한: CD0; 개인 차례당 1회; ENERGY100 소비.

### V.037 `eff_haruna_passive`
- 출처/구역: u_haruna 전방 패시브 / `front`. 원안 행: v2.3 신규.
- 실행: **패시브/반응 컨테이너**. battle_start + unit_defeated.
- 본문: 전투 시작 시(`battle_start`) 적 1명을 "맛집 평가" 대상으로 지정. 그 적이 전투불능이 되면(`unit_defeated`) 자신의 에너지 +40
- 제한: 개인 차례당1회, handler/root당 1회; 상시·초기 효과는 해당 시점에만.

### V.038 `eff_izumi_skill`
- 출처/구역: u_izumi 전투 스킬 / `front`. 원안 행: v2.3 신규.
- 실행: **SKILL 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 적 최전열 1명에게 ATK 140% 피해. 이 공격으로 처치하면 자신의 에너지 +20
- 제한: CD2; 기본 비용/자원은7.4; 자동 사용 조건10.3.

### V.039 `eff_izumi_ult`
- 출처/구역: u_izumi 필살기 / `front`. 원안 행: v2.3 신규.
- 실행: **ULTIMATE 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 적 최전열 1명에게 ATK 240/275/330% 피해
- 제한: CD0; 개인 차례당 1회; ENERGY100 소비.

### V.040 `eff_akari_skill`
- 출처/구역: u_akari 전투 스킬 / `front`. 원안 행: v2.3 신규.
- 실행: **SKILL 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 적 최전열 2명에게 ATK 130% 피해
- 제한: CD2; 기본 비용/자원은7.4; 자동 사용 조건10.3.

### V.041 `eff_akari_ult`
- 출처/구역: u_akari 필살기 / `front`. 원안 행: v2.3 신규.
- 실행: **ULTIMATE 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 적 전방 전원에게 ATK 160/185/225% 피해. 이 공격으로 처치한 적 1명마다 자신의 에너지 +20
- 제한: CD0; 개인 차례당 1회; ENERGY100 소비.

### V.042 `eff_juri_rear_reg`
- 출처/구역: u_juri 후방 정기 지원 / `rear`. 원안 행: v2.3 신규.
- 실행: **REAR 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 후방 정기 행동(`rear_action`)마다 HP 비율이 가장 낮은 아군 1명을 ATK 110/130/155% 치유하고 2턴간 ATK +10%(`st_atk_up`) 부여. 30% 확률로 요리가 실패해 대신 적 최전열 1명에게 ATK 80% 피해
- 제한: 정상 후방 차례당1회; 기본 SP/에너지 소비·지급 없음.

### V.043 `eff_kasumi_rear_reg`
- 출처/구역: u_kasumi 후방 정기 지원 / `rear`. 원안 행: v2.3 신규.
- 실행: **REAR 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 후방 정기 행동(`rear_action`)마다 적 전방 전원에게 ATK 110/130/160% 피해, 대상마다 30% 확률로 다음 행동 시간 15% 지연(`delay_action`)
- 제한: 정상 후방 차례당1회; 기본 SP/에너지 소비·지급 없음.

### V.044 `eff_kasumi_rear_react`
- 출처/구역: u_kasumi 후방 반응 지원 / `rear`. 원안 행: v2.3 신규.
- 실행: **패시브/반응 컨테이너**. unit_defeated.
- 본문: 적이 전투불능이 될 때(`unit_defeated`) 다음 후방 행동 피해 +20%(최대 2중첩, 사용하면 초기화)
- 제한: CD2(소유자 정상 차례), 개인 차례당1회, handler/root당 1회.

### V.045 `eff_megu_skill`
- 출처/구역: u_megu 전투 스킬 / `front`. 원안 행: v2.3 신규.
- 실행: **SKILL 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 적 최전열 2명에게 ATK 120% 피해 및 2턴간 화상(`st_burn`) 부여
- 제한: CD2; 기본 비용/자원은7.4; 자동 사용 조건10.3.

### V.046 `eff_megu_ult`
- 출처/구역: u_megu 필살기 / `front`. 원안 행: v2.3 신규.
- 실행: **ULTIMATE 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 적 전방 전원에게 ATK 155/180/220% 피해. 이미 화상인 적은 화상 지속 +1턴
- 제한: CD0; 개인 차례당 1회; ENERGY100 소비.

### V.047 `eff_akane_skill`
- 출처/구역: u_akane 전투 스킬 / `front`. 원안 행: v2.3 신규.
- 실행: **SKILL 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 적 최전열 1명에게 ATK 150% 피해 및 "폭탄" 설치(2턴 뒤 그 적에게 ATK 120% 폭발)
- 제한: CD2; 기본 비용/자원은7.4; 자동 사용 조건10.3.

### V.048 `eff_akane_ult`
- 출처/구역: u_akane 필살기 / `front`. 원안 행: v2.3 신규.
- 실행: **ULTIMATE 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 설치된 폭탄을 모두 즉시 기폭하고 적 전방 전원에게 ATK 190/220/265% 피해. 폭탄이 있던 적은 ATK 60% 추가 피해
- 제한: CD0; 개인 차례당 1회; ENERGY100 소비.

### V.049 `eff_midori_skill`
- 출처/구역: u_midori 전투 스킬 / `front`. 원안 행: v2.3 신규.
- 실행: **SKILL 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 적 최전열 1명에게 ATK 150% 피해. 아군에 모모이가 있으면 모모이의 다음 행동 시간 15% 당김
- 제한: CD2; 기본 비용/자원은7.4; 자동 사용 조건10.3.

### V.050 `eff_midori_ult`
- 출처/구역: u_midori 필살기 / `front`. 원안 행: v2.3 신규.
- 실행: **ULTIMATE 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 적 최전열 1명에게 ATK 270/310/375% 피해
- 제한: CD0; 개인 차례당 1회; ENERGY100 소비.

### V.051 `eff_yuzu_rear_reg`
- 출처/구역: u_yuzu 후방 정기 지원 / `rear`. 원안 행: v2.3 신규.
- 실행: **REAR 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 후방 정기 행동(`rear_action`)마다 무작위 적에게 3회(중복 가능) ATK 70/80/100% 유탄 피해
- 제한: 정상 후방 차례당1회; 기본 SP/에너지 소비·지급 없음.

### V.052 `eff_yuzu_rear_react`
- 출처/구역: u_yuzu 후방 반응 지원 / `rear`. 원안 행: v2.3 신규.
- 실행: **패시브/반응 컨테이너**. battle_start.
- 본문: "사물함": 전투 시작 후(`battle_start`) 2턴간 적의 표적이 되지 않고, 첫 후방 행동 피해 +50%
- 제한: CD2(소유자 정상 차례), 개인 차례당1회, handler/root당 1회.

### V.053 `eff_chihiro_rear_reg`
- 출처/구역: u_chihiro 후방 정기 지원 / `rear`. 원안 행: v2.3 신규.
- 실행: **REAR 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 후방 정기 행동(`rear_action`)마다 적 1명의 버프 1개를 해제하고 아군 전방 전원에게 2턴간 CRIT +12/15/20%(`st_crit_up`) 부여
- 제한: 정상 후방 차례당1회; 기본 SP/에너지 소비·지급 없음.

### V.054 `eff_chihiro_rear_react`
- 출처/구역: u_chihiro 후방 반응 지원 / `rear`. 원안 행: v2.3 신규.
- 실행: **패시브/반응 컨테이너**. ultimate_resolved.
- 본문: 적이 필살기를 해소하면(`ultimate_resolved`) 그 적의 에너지 -20(쿨다운 2턴)
- 제한: CD2(소유자 정상 차례), 개인 차례당1회, handler/root당 1회.

### V.055 `eff_maki_rear_reg`
- 출처/구역: u_maki 후방 정기 지원 / `rear`. 원안 행: v2.3 신규.
- 실행: **REAR 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 후방 정기 행동(`rear_action`)마다 적 전방 전원에게 ATK 85/100/125% 피해 및 2턴간 SPD -10(`st_spd_down`)
- 제한: 정상 후방 차례당1회; 기본 SP/에너지 소비·지급 없음.

### V.056 `eff_noa_rear_reg`
- 출처/구역: u_noa 후방 정기 지원 / `rear`. 원안 행: v2.3 신규.
- 실행: **REAR 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 후방 정기 행동(`rear_action`)마다 아군 전방 전원에게 2턴간 ATK +20/26/35%(`st_atk_up`) 부여
- 제한: 정상 후방 차례당1회; 기본 SP/에너지 소비·지급 없음.

### V.057 `eff_noa_rear_react`
- 출처/구역: u_noa 후방 반응 지원 / `rear`. 원안 행: v2.3 신규.
- 실행: **패시브/반응 컨테이너**. damage_dealt.
- 본문: "완전 기억": 아군이 한 턴에 같은 적을 두 번째로 타격하면(`damage_dealt`) 그 피해 +20%
- 제한: CD2(소유자 정상 차례), 개인 차례당1회, handler/root당 1회.

### V.058 `eff_koyuki_skill`
- 출처/구역: u_koyuki 전투 스킬 / `front`. 원안 행: v2.3 신규.
- 실행: **SKILL 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 적 최전열 1명에게 ATK 140% 피해, 50% 확률로 1턴 기절(`st_stun`)
- 제한: CD2; 기본 비용/자원은7.4; 자동 사용 조건10.3.

### V.059 `eff_koyuki_ult`
- 출처/구역: u_koyuki 필살기 / `front`. 원안 행: v2.3 신규.
- 실행: **ULTIMATE 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 적 전방 전원에게 ATK 170/195/235% 피해 후 동전 던지기: 앞면이면 적 전방 전원 1턴 기절, 뒷면이면 아군 전방 전원 에너지 +30
- 제한: CD0; 개인 차례당 1회; ENERGY100 소비.

### V.060 `eff_koyuki_rear_reg`
- 출처/구역: u_koyuki 후방 정기 지원 / `rear`. 원안 행: v2.3 신규.
- 실행: **REAR 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 후방 정기 행동(`rear_action`)마다 적 1명의 다음 행동 시간 30/35/45% 지연(`delay_action`)
- 제한: 정상 후방 차례당1회; 기본 SP/에너지 소비·지급 없음.

### V.061 `eff_utaha_rear_reg`
- 출처/구역: u_utaha 후방 정기 지원 / `rear`. 원안 행: v2.3 신규.
- 실행: **REAR 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: "긴급 수리": 후방 정기 행동(`rear_action`)마다 HP 비율이 가장 낮은 아군 1명에게 ATK 140/165/200% 보호막 및 2턴간 받는 피해 -10%(`st_damage_reduction`) 부여
- 제한: 정상 후방 차례당1회; 기본 SP/에너지 소비·지급 없음.

### V.062 `eff_hibiki_rear_reg`
- 출처/구역: u_hibiki 후방 정기 지원 / `rear`. 원안 행: v2.3 신규.
- 실행: **REAR 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: "박격포": 후방 정기 행동(`rear_action`)마다 무작위 적 2명(후방 포함)에게 ATK 110/130/160% 피해
- 제한: 정상 후방 차례당1회; 기본 SP/에너지 소비·지급 없음.

### V.063 `eff_kotori_rear_reg`
- 출처/구역: u_kotori 후방 정기 지원 / `rear`. 원안 행: v2.3 신규.
- 실행: **REAR 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 후방 정기 행동(`rear_action`)마다 ATK가 가장 높은 아군 1명에게 2턴간 치명 피해 +20/25/35%
- 제한: 정상 후방 차례당1회; 기본 SP/에너지 소비·지급 없음.

### V.064 `eff_eimi_skill`
- 출처/구역: u_eimi 전투 스킬 / `front`. 원안 행: v2.3 신규.
- 실행: **SKILL 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 적 최전열 1명에게 ATK 100% 피해 후 자신에게 2턴간 받는 피해 -25%(`st_damage_reduction`) 및 도발(`st_taunt`)
- 제한: CD2; 기본 비용/자원은7.4; 자동 사용 조건10.3.

### V.065 `eff_eimi_ult`
- 출처/구역: u_eimi 필살기 / `front`. 원안 행: v2.3 신규.
- 실행: **ULTIMATE 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 자신에게 최대 HP 30/35/45% 보호막, 아군 전방 전원에게 2턴간 디버프 면역 부여
- 제한: CD0; 개인 차례당 1회; ENERGY100 소비.

### V.066 `eff_eimi_passive`
- 출처/구역: u_eimi 전방 패시브 / `front`. 원안 행: v2.3 신규.
- 실행: **패시브/반응 컨테이너**. 상시.
- 본문: 화상(`st_burn`)에 걸리지 않는다
- 제한: 개인 차례당1회, handler/root당 1회; 상시·초기 효과는 해당 시점에만.

### V.067 `eff_hifumi_rear_reg`
- 출처/구역: u_hifumi 후방 정기 지원 / `rear`. 원안 행: v2.3 신규.
- 실행: **REAR 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 후방 정기 행동(`rear_action`)마다 "페로로 인형"을 세워 아군 전방이 받는 다음 단일 대상 공격 1회를 대신 맞게 하고, 아군 전방 전원에게 2턴간 ATK +15/20/28%(`st_atk_up`) 부여
- 제한: 정상 후방 차례당1회; 기본 SP/에너지 소비·지급 없음.

### V.068 `eff_hanako_rear_reg`
- 출처/구역: u_hanako 후방 정기 지원 / `rear`. 원안 행: v2.3 신규.
- 실행: **REAR 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 후방 정기 행동(`rear_action`)마다 아군 전방 전원을 ATK 120/140/170% 치유. 세 번째 후방 행동마다 치유량 2배
- 제한: 정상 후방 차례당1회; 기본 SP/에너지 소비·지급 없음.

### V.069 `eff_nagisa_rear_reg`
- 출처/구역: u_nagisa 후방 정기 지원 / `rear`. 원안 행: v2.3 신규.
- 실행: **REAR 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 후방 정기 행동(`rear_action`)마다 아군 전방 전원에게 2턴간 ATK +30/38/50%(`st_atk_up`)와 받는 피해 -10%(`st_damage_reduction`)를 부여하고 에너지 +20
- 제한: 정상 후방 차례당1회; 기본 SP/에너지 소비·지급 없음.

### V.070 `eff_nagisa_aura`
- 출처/구역: u_nagisa 후방 반응 지원 / `rear`. 원안 행: v2.3 신규.
- 실행: **패시브/반응 컨테이너**. battle_start.
- 본문: 존재 효과 「티타임」: 전투 시작 시(`battle_start`) 팀 SP +1, 아군 전방 전원 최대 HP +10%
- 제한: 개인 차례당1회, handler/root당 1회; 상시·초기 효과는 해당 시점에만.

### V.071 `eff_seia_rear_reg`
- 출처/구역: u_seia 후방 정기 지원 / `rear`. 원안 행: v2.3 신규.
- 실행: **REAR 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 후방 정기 행동(`rear_action`)마다 필살기 게이지가 가장 높은 적 1명에게 ATK 160/190/240% 피해와 2턴간 침묵(`st_silence`), ATK -20/25/30%(`st_atk_down`) 부여
- 제한: 정상 후방 차례당1회; 기본 SP/에너지 소비·지급 없음.

### V.072 `eff_seia_aura`
- 출처/구역: u_seia 후방 반응 지원 / `rear`. 원안 행: v2.3 신규.
- 실행: **패시브/반응 컨테이너**. enemy ultimate_declared.
- 본문: 존재 효과 「예지」: 적이 필살기를 쓰기 직전 아군 전방 전원에게 그 공격 동안 받는 피해 -25%(전투당 2회)
- 제한: 개인 차례당1회, handler/root당 1회; 상시·초기 효과는 해당 시점에만.

### V.073 `eff_tsurugi_skill`
- 출처/구역: u_tsurugi 전투 스킬 / `front`. 원안 행: v2.3 신규.
- 실행: **SKILL 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 적 최전열 1명에게 ATK 100% 피해 2회
- 제한: CD2; 기본 비용/자원은7.4; 자동 사용 조건10.3.

### V.074 `eff_tsurugi_ult`
- 출처/구역: u_tsurugi 필살기 / `front`. 원안 행: v2.3 신규.
- 실행: **ULTIMATE 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 적 최전열 1명에게 ATK 360/415/505% 피해. 자신의 HP가 50% 이하이면 피해 +30%
- 제한: CD0; 개인 차례당 1회; ENERGY100 소비.

### V.075 `eff_tsurugi_passive`
- 출처/구역: u_tsurugi 전방 패시브 / `front`. 원안 행: v2.3 신규.
- 실행: **패시브/반응 컨테이너**. damage_received.
- 본문: 피격될 때(`damage_received`)마다 자신의 ATK +5%(최대 6중첩, 전투 종료까지)
- 제한: 개인 차례당1회, handler/root당 1회; 상시·초기 효과는 해당 시점에만.

### V.076 `eff_mashiro_rear_reg`
- 출처/구역: u_mashiro 후방 정기 지원 / `rear`. 원안 행: v2.3 신규.
- 실행: **REAR 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 후방 정기 행동(`rear_action`)마다 ATK가 가장 높은 적 1명에게 ATK 165/190/235% 피해. 이번 전투에서 아군을 쓰러뜨린 적이면 피해 +50%
- 제한: 정상 후방 차례당1회; 기본 SP/에너지 소비·지급 없음.

### V.077 `eff_mine_skill`
- 출처/구역: u_mine 전투 스킬 / `front`. 원안 행: v2.3 신규.
- 실행: **SKILL 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: HP 비율이 가장 낮은 아군 앞으로 뛰어들어 2턴간 도발(`st_taunt`)하고 자신에게 최대 HP 20% 보호막
- 제한: CD2; 기본 비용/자원은7.4; 자동 사용 조건10.3.

### V.078 `eff_mine_ult`
- 출처/구역: u_mine 필살기 / `front`. 원안 행: v2.3 신규.
- 실행: **ULTIMATE 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 아군 전방 전원을 최대 HP 15/18/22% 치유한 뒤 적 최전열 1명에게 ATK 200% 피해
- 제한: CD0; 개인 차례당 1회; ENERGY100 소비.

### V.079 `eff_mine_passive`
- 출처/구역: u_mine 전방 패시브 / `front`. 원안 행: v2.3 신규.
- 실행: **패시브/반응 컨테이너**. healed.
- 본문: 아군이 치유받을 때(`healed`) 자신의 DEF +10%(최대 3중첩, 전투 종료까지)
- 제한: 개인 차례당1회, handler/root당 1회; 상시·초기 효과는 해당 시점에만.

### V.080 `eff_hanae_rear_reg`
- 출처/구역: u_hanae 후방 정기 지원 / `rear`. 원안 행: v2.3 신규.
- 실행: **REAR 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 후방 정기 행동(`rear_action`)마다 HP 비율이 가장 낮은 아군 1명을 ATK 130/150/180% 치유
- 제한: 정상 후방 차례당1회; 기본 SP/에너지 소비·지급 없음.

### V.081 `eff_reisa_skill`
- 출처/구역: u_reisa 전투 스킬 / `front`. 원안 행: v2.3 신규.
- 실행: **SKILL 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 적 최전열 1명에게 ATK 145% 피해 후 자신에게 2턴간 SPD +10(`st_spd_up`)
- 제한: CD2; 기본 비용/자원은7.4; 자동 사용 조건10.3.

### V.082 `eff_reisa_ult`
- 출처/구역: u_reisa 필살기 / `front`. 원안 행: v2.3 신규.
- 실행: **ULTIMATE 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 적 최전열 1명에게 ATK 265/305/370% 피해. 대상이 기절(`st_stun`) 상태면 피해 +50%
- 제한: CD0; 개인 차례당 1회; ENERGY100 소비.

### V.083 `eff_kazusa_skill`
- 출처/구역: u_kazusa 전투 스킬 / `front`. 원안 행: v2.3 신규.
- 실행: **SKILL 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 적 최전열 1명에게 ATK 165% 피해 후 자신에게 2턴간 CRIT +15%(`st_crit_up`)
- 제한: CD2; 기본 비용/자원은7.4; 자동 사용 조건10.3.

### V.084 `eff_kazusa_ult`
- 출처/구역: u_kazusa 필살기 / `front`. 원안 행: v2.3 신규.
- 실행: **ULTIMATE 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 적 최전열 1명에게 ATK 310/355/430% 피해
- 제한: CD0; 개인 차례당 1회; ENERGY100 소비.

### V.085 `eff_yoshimi_skill`
- 출처/구역: u_yoshimi 전투 스킬 / `front`. 원안 행: v2.3 신규.
- 실행: **SKILL 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 적 최전열 1명에게 ATK 135% 피해
- 제한: CD2; 기본 비용/자원은7.4; 자동 사용 조건10.3.

### V.086 `eff_yoshimi_ult`
- 출처/구역: u_yoshimi 필살기 / `front`. 원안 행: v2.3 신규.
- 실행: **ULTIMATE 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 적 최전열 1명에게 ATK 235/270/325% 피해 후 자신의 최대 HP 15% 회복
- 제한: CD0; 개인 차례당 1회; ENERGY100 소비.

### V.087 `eff_airi_rear_reg`
- 출처/구역: u_airi 후방 정기 지원 / `rear`. 원안 행: v2.3 신규.
- 실행: **REAR 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 후방 정기 행동(`rear_action`)마다 HP 비율이 가장 낮은 아군 1명에게 2턴간 DEF +20/25/32%(`st_def_up`) 부여
- 제한: 정상 후방 차례당1회; 기본 SP/에너지 소비·지급 없음.

### V.088 `eff_natsu_skill`
- 출처/구역: u_natsu 전투 스킬 / `front`. 원안 행: v2.3 신규.
- 실행: **SKILL 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 자신에게 2턴간 DEF +30%(`st_def_up`), 아군 전방 전원에게 2턴간 받는 피해 -8%(`st_damage_reduction`)
- 제한: CD2; 기본 비용/자원은7.4; 자동 사용 조건10.3.

### V.089 `eff_natsu_ult`
- 출처/구역: u_natsu 필살기 / `front`. 원안 행: v2.3 신규.
- 실행: **ULTIMATE 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 자신에게 2턴간 도발(`st_taunt`)을 걸어 적 전방 전원의 공격을 끌고, 자신의 최대 HP 20/24/30% 회복
- 제한: CD0; 개인 차례당 1회; ENERGY100 소비.

### V.090 `eff_tsukuyo_skill`
- 출처/구역: u_tsukuyo 전투 스킬 / `front`. 원안 행: v2.3 신규.
- 실행: **SKILL 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 자신에게 2턴간 도발(`st_taunt`)과 받는 피해 -20%(`st_damage_reduction`) 부여
- 제한: CD2; 기본 비용/자원은7.4; 자동 사용 조건10.3.

### V.091 `eff_tsukuyo_ult`
- 출처/구역: u_tsukuyo 필살기 / `front`. 원안 행: v2.3 신규.
- 실행: **ULTIMATE 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 자신에게 최대 HP 30/35/42% 보호막과 다음 피격 1회 회피("바꿔치기 술") 부여
- 제한: CD0; 개인 차례당 1회; ENERGY100 소비.

### V.092 `eff_mimori_rear_reg`
- 출처/구역: u_mimori 후방 정기 지원 / `rear`. 원안 행: v2.3 신규.
- 실행: **REAR 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 후방 정기 행동(`rear_action`)마다 아군 전방 전원에게 디버프 저항 1회(다음 디버프 1개 무효)와 에너지 +10/12/15 부여
- 제한: 정상 후방 차례당1회; 기본 SP/에너지 소비·지급 없음.

### V.093 `eff_kaede_skill`
- 출처/구역: u_kaede 전투 스킬 / `front`. 원안 행: v2.3 신규.
- 실행: **SKILL 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 적 최전열 2명에게 ATK 110% 피해
- 제한: CD2; 기본 비용/자원은7.4; 자동 사용 조건10.3.

### V.094 `eff_kaede_ult`
- 출처/구역: u_kaede 필살기 / `front`. 원안 행: v2.3 신규.
- 실행: **ULTIMATE 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 적 전방 전원에게 ATK 150/170/205% 피해
- 제한: CD0; 개인 차례당 1회; ENERGY100 소비.

### V.095 `eff_niya_rear_reg`
- 출처/구역: u_niya 후방 정기 지원 / `rear`. 원안 행: v2.3 신규.
- 실행: **REAR 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 후방 정기 행동(`rear_action`)마다 점괘 1개를 무작위로 적용: 대길(아군 전방 전원 2턴간 ATK +30/36/45%) / 길(아군 전방 전원 에너지 +25) / 흉(적 전방 전원 2턴간 ATK -20%(`st_atk_down`))
- 제한: 정상 후방 차례당1회; 기본 SP/에너지 소비·지급 없음.

### V.096 `eff_niya_rear_react`
- 출처/구역: u_niya 후방 반응 지원 / `rear`. 원안 행: v2.3 신규.
- 실행: **패시브/반응 컨테이너**. turn_start.
- 본문: 자신의 턴 시작 시(`turn_start`) 세 번째 차례마다 팀 SP +1
- 제한: CD2(소유자 정상 차례), 개인 차례당1회, handler/root당 1회.

### V.097 `eff_chise_rear_reg`
- 출처/구역: u_chise 후방 정기 지원 / `rear`. 원안 행: v2.3 신규.
- 실행: **REAR 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 후방 정기 행동(`rear_action`)마다 적 최전열 2명에게 ATK 95/110/135% 피해 및 2턴간 화상(`st_burn`) 부여
- 제한: 정상 후방 차례당1회; 기본 SP/에너지 소비·지급 없음.

### V.098 `eff_tomoe_rear_reg`
- 출처/구역: u_tomoe 후방 정기 지원 / `rear`. 원안 행: v2.3 신규.
- 실행: **REAR 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 후방 정기 행동(`rear_action`)마다 아군 전방 전원 에너지 +15. 체리노가 있으면 체리노에게 2턴간 ATK +25/30/40%(`st_atk_up`)
- 제한: 정상 후방 차례당1회; 기본 SP/에너지 소비·지급 없음.

### V.099 `eff_tomoe_rear_react`
- 출처/구역: u_tomoe 후방 반응 지원 / `rear`. 원안 행: v2.3 신규.
- 실행: **패시브/반응 컨테이너**. 상시.
- 본문: 팀 SP가 최대(5)인 동안 아군 전방 전원 ATK +10%
- 제한: CD2(소유자 정상 차례), 개인 차례당1회, handler/root당 1회.

### V.100 `eff_meru_rear_reg`
- 출처/구역: u_meru 후방 정기 지원 / `rear`. 원안 행: v2.3 신규.
- 실행: **REAR 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 후방 정기 행동(`rear_action`)마다 적 1명에게 ATK 80% 피해, 50/65/80% 확률로 1턴 침묵(`st_silence`)
- 제한: 정상 후방 차례당1회; 기본 SP/에너지 소비·지급 없음.

### V.101 `eff_shigure_skill`
- 출처/구역: u_shigure 전투 스킬 / `front`. 원안 행: v2.3 신규.
- 실행: **SKILL 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 적 최전열 1명에게 ATK 160% 피해 후 자신의 최대 HP 10% 회복
- 제한: CD2; 기본 비용/자원은7.4; 자동 사용 조건10.3.

### V.102 `eff_shigure_ult`
- 출처/구역: u_shigure 필살기 / `front`. 원안 행: v2.3 신규.
- 실행: **ULTIMATE 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 적 최전열 1명에게 ATK 300/345/420% 피해. 5턴째부터는 피해 +40%
- 제한: CD0; 개인 차례당 1회; ENERGY100 소비.

### V.103 `eff_misaki_rear_reg`
- 출처/구역: u_misaki 후방 정기 지원 / `rear`. 원안 행: v2.3 신규.
- 실행: **REAR 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 후방 정기 행동(`rear_action`)마다 적 전방 전원에게 ATK 120/140/170% 피해
- 제한: 정상 후방 차례당1회; 기본 SP/에너지 소비·지급 없음.

### V.104 `eff_misaki_rear_react`
- 출처/구역: u_misaki 후방 반응 지원 / `rear`. 원안 행: v2.3 신규.
- 실행: **패시브/반응 컨테이너**. unit_defeated.
- 본문: 아군이 쓰러지면(`unit_defeated`) 다음 후방 행동 피해 +50%
- 제한: CD2(소유자 정상 차례), 개인 차례당1회, handler/root당 1회.

### V.105 `eff_syn_ps68_2`
- 출처/구역: 시너지 syn_problem_solver (1단계) / `deployed_all`. 원안 행: v2.3 조정.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 구성원이 적을 처치하면 정산 때 의뢰비 +1G(전투당 최대 2G)
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.106 `eff_syn_ps68_4`
- 출처/구역: 시너지 syn_problem_solver (2단계) / `deployed_all`. 원안 행: v2.3 조정.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 구성원이 적을 처치하면 정산 때 의뢰비 +1G(전투당 최대 2G). 구성원이 쓰러지면 그 자리가 폭발해 적 전방 전원에게 ATK 120% 피해(무츠키의 지뢰, 구성원당 1회)
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.107 `eff_syn_prefect_2`
- 출처/구역: 시너지 syn_prefect (1단계) / `deployed_all`. 원안 행: v2.3 신규.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 전투 시작 시 적이 가진 가장 강한 버프 1개를 해제(단속)
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.108 `eff_syn_prefect_4`
- 출처/구역: 시너지 syn_prefect (2단계) / `deployed_all`. 원안 행: v2.3 신규.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 전투 시작 시 적이 가진 가장 강한 버프 1개를 해제(단속). 히나가 살아 있는 동안 다른 선도부원의 받는 피해 -15%. 히나가 쓰러지면 남은 선도부원 ATK +40%(전투 종료까지)
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.109 `eff_syn_gourmet_2`
- 출처/구역: 시너지 syn_gourmet (1단계) / `deployed_all`. 원안 행: v2.3 신규.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 구성원이 적을 처치하면 "별점 0개" 폭발: 처치한 적 주변 적에게 ATK 70% 피해(구성원당 턴당 1회)
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.110 `eff_syn_gourmet_4`
- 출처/구역: 시너지 syn_gourmet (2단계) / `deployed_all`. 원안 행: v2.3 신규.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 구성원이 적을 처치하면 "별점 0개" 폭발: 처치한 적 주변 적에게 ATK 70% 피해(구성원당 턴당 1회). 아군에 급양부원이 있으면 전투 시작 시 "납치"한다. 미식연구회원이 공격할 때마다 납치된 급양부원이 그 학생을 ATK 40% 치유(턴당 2회)
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.111 `eff_syn_school_lunch_2`
- 출처/구역: 시너지 syn_school_lunch (1단계) / `deployed_all`. 원안 행: v2.3 신규.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 전투 시작 시 아군 전원 최대 HP +10%(든든한 급식). 미식연구회 4단계에 "납치"되면 +20%
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.112 `eff_syn_hot_spring_2`
- 출처/구역: 시너지 syn_hot_spring (1단계) / `deployed_all`. 원안 행: v2.3 신규.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 전투 시작 시 땅을 폭파: 적 전방 전원 다음 행동 시간 15% 지연 및 2턴간 화상(`st_burn`)
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.113 `eff_syn_cc_2`
- 출처/구역: 시너지 syn_cc (1단계) / `deployed_all`. 원안 행: v2.3 조정.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 적을 처치한 C&C 요원은 다음 행동 시간 20% 당김(청소 완료)
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.114 `eff_syn_cc_4`
- 출처/구역: 시너지 syn_cc (2단계) / `deployed_all`. 원안 행: v2.3 조정.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 적을 처치한 C&C 요원은 다음 행동 시간 20% 당김(청소 완료). HP 30% 이하인 적은 "청소 대상". C&C 요원이 청소 대상을 공격하면 반드시 치명타
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.115 `eff_syn_game_dev_2`
- 출처/구역: 시너지 syn_game_dev (1단계) / `deployed_all`. 원안 행: v2.3 신규.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 전투 시작 시 무작위 "버그" 1개: 아군 전원 ATK +30% / 적 전원 SPD -20 / 아군 전방 전원 에너지 +40
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.116 `eff_syn_game_dev_4`
- 출처/구역: 시너지 syn_game_dev (2단계) / `deployed_all`. 원안 행: v2.3 신규.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 전투 시작 시 "버그" 3개(아군 전원 ATK +30% / 적 전원 SPD -20 / 아군 전방 전원 에너지 +40) 중 2개를 적용(유즈의 디버깅). 준비 단계에서 고른 2개를 쓰고, 고르지 않았으면 앞의 2개
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.117 `eff_syn_veritas_2`
- 출처/구역: 시너지 syn_veritas (1단계) / `deployed_all`. 원안 행: v2.3 신규.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 적의 첫 필살기 직전에 그 적의 행동을 50% 지연시키고, 적 필살기 예정 시점을 화면에 표시
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.118 `eff_syn_veritas_4`
- 출처/구역: 시너지 syn_veritas (2단계) / `deployed_all`. 원안 행: v2.3 신규.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 적의 첫 필살기 직전에 그 적의 행동을 50% 지연시키고, 적 필살기 예정 시점을 화면에 표시. 전투 시작 시 적 버프 1개를 해킹해 아군 1명에게 옮긴다
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.119 `eff_syn_seminar_2`
- 출처/구역: 시너지 syn_seminar (1단계) / `deployed_all`. 원안 행: v2.3 신규.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 정산 이자 상한 +2
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.120 `eff_syn_seminar_4`
- 출처/구역: 시너지 syn_seminar (2단계) / `deployed_all`. 원안 행: v2.3 신규.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 정산 이자 상한 +4(2단계의 +2를 대체). 코유키가 있으면 정산 이자가 50% 확률로 2배, 50% 확률로 0
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.121 `eff_syn_engineering_2`
- 출처/구역: 시너지 syn_engineering (1단계) / `deployed_all`. 원안 행: v2.3 신규.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 전투 시작 시 포탑 1기 설치(구성원 평균 ATK 50%로 매 턴 적 최전열 1명 사격)
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.122 `eff_syn_engineering_3`
- 출처/구역: 시너지 syn_engineering (2단계) / `deployed_all`. 원안 행: v2.3 신규.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 전투 시작 시 포탑 2기 설치(각각 구성원 평균 ATK 50%로 매 턴 적 최전열 1명 사격). 포탑이 부서지면 폭발해 주변 적에게 ATK 100% 피해
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.123 `eff_syn_paranormal_2`
- 출처/구역: 시너지 syn_paranormal (1단계) / `deployed_all`. 원안 행: v2.3 신규.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 전투 시작 시 ATK가 가장 높은 적 1명의 패시브를 2턴간 봉인
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.124 `eff_syn_make_up_2`
- 출처/구역: 시너지 syn_make_up (1단계) / `deployed_all`. 원안 행: v2.3 신규.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 패배할 때마다 "보충수업" 1중첩(구성원 ATK +8%, 최대 4). 승리하면 "합격"으로 중첩 수만큼 골드를 받고 초기화
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.125 `eff_syn_make_up_4`
- 출처/구역: 시너지 syn_make_up (2단계) / `deployed_all`. 원안 행: v2.3 신규.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 패배할 때마다 "보충수업" 1중첩(구성원 ATK +8%, 최대 4). 승리하면 "합격"으로 중첩 수의 2배만큼 골드를 받고 초기화. 구성원 최대 HP +15%
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.126 `eff_syn_tea_party_2`
- 출처/구역: 시너지 syn_tea_party (1단계) / `deployed_all`. 원안 행: v2.3 신규.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 전투 시작 시 아군 전원 에너지 +20(티타임)
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.127 `eff_syn_tea_party_3`
- 출처/구역: 시너지 syn_tea_party (2단계) / `deployed_all`. 원안 행: v2.3 신규.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 전투 시작 시 아군 전원 에너지 +20(티타임). 3명 모두 출전하면 아군 전원 ATK +15%
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.128 `eff_syn_justice_2`
- 출처/구역: 시너지 syn_justice (1단계) / `deployed_all`. 원안 행: v2.3 신규.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: HP 50% 이하인 적에게 주는 피해 +25%(정의 집행)
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.129 `eff_syn_justice_3`
- 출처/구역: 시너지 syn_justice (2단계) / `deployed_all`. 원안 행: v2.3 신규.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: HP 50% 이하인 적에게 주는 피해 +25%(정의 집행). 구성원이 적을 처치하면 다른 구성원 에너지 +15
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.130 `eff_syn_vigilante_2`
- 출처/구역: 시너지 syn_vigilante (1단계) / `deployed_all`. 원안 행: v2.3 신규.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 구성원이 기절시킨 적에게 다른 구성원의 다음 공격 피해 +40%
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.131 `eff_syn_remedial_knights_2`
- 출처/구역: 시너지 syn_remedial_knights (1단계) / `deployed_all`. 원안 행: v2.3 신규.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 구성원의 치유량 +30%
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.132 `eff_syn_remedial_knights_3`
- 출처/구역: 시너지 syn_remedial_knights (2단계) / `deployed_all`. 원안 행: v2.3 신규.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 구성원의 치유량 +30%. 아군 HP가 20% 이하로 떨어지면 구성원이 즉시 그 아군을 최대 HP 20% 치유(전투당 1회)
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.133 `eff_syn_sweets_2`
- 출처/구역: 시너지 syn_sweets (1단계) / `deployed_all`. 원안 행: v2.3 신규.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 승리하면 다음 전투 시작 시 아군 전원 최대 HP 10% 회복(디저트 타임)
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.134 `eff_syn_sweets_4`
- 출처/구역: 시너지 syn_sweets (2단계) / `deployed_all`. 원안 행: v2.3 신규.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 승리하면 다음 전투 시작 시 아군 전원 최대 HP 10% 회복(디저트 타임). 구성원 4명이 모두 살아 있으면 매 턴 아군 전원 최대 HP 3% 회복
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.135 `eff_syn_ninjutsu_2`
- 출처/구역: 시너지 syn_ninjutsu (1단계) / `deployed_all`. 원안 행: v2.3 신규.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 구성원마다 전투당 첫 피격 1회를 "분신술"로 회피
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.136 `eff_syn_ninjutsu_3`
- 출처/구역: 시너지 syn_ninjutsu (2단계) / `deployed_all`. 원안 행: v2.3 신규.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 구성원마다 전투당 첫 피격 1회를 "분신술"로 회피하고, 분신술을 쓸 때마다 공격자에게 ATK 60% 반격
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.137 `eff_syn_training_2`
- 출처/구역: 시너지 syn_training (1단계) / `deployed_all`. 원안 행: v2.3 신규.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 구성원의 받는 피해가 매 턴 -3%씩 누적(최대 -15%)
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.138 `eff_syn_training_3`
- 출처/구역: 시너지 syn_training (2단계) / `deployed_all`. 원안 행: v2.3 신규.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 구성원의 받는 피해가 매 턴 -3%씩 누적(최대 -15%). 최대치에 이르면 "득도": 다음 피격 1회 무효
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.139 `eff_syn_yinyang_2`
- 출처/구역: 시너지 syn_yinyang (1단계) / `deployed_all`. 원안 행: v2.3 신규.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 니야의 점괘가 나오면 결과 3개 중 하나를 골라 적용하고, 치세가 건 화상(`st_burn`) 지속 +1턴
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.140 `eff_syn_plum_blossom_2`
- 출처/구역: 시너지 syn_plum_blossom (1단계) / `deployed_all`. 원안 행: v2.3 신규.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 아군이 필살기를 쓸 때마다 도장 1개. 3개가 모이면 팀 SP +1
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.141 `eff_syn_genryumon_2`
- 출처/구역: 시너지 syn_genryumon (1단계) / `deployed_all`. 원안 행: v2.3 신규.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 키사키가 공격받으면 미나가 대신 맞는다(턴당 1회). 키사키의 필살기 피해 +20%
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.142 `eff_syn_rw_office_2`
- 출처/구역: 시너지 syn_rw_office (1단계) / `deployed_all`. 원안 행: v2.3 신규.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 3턴마다 적 1명을 "숙청 대상"으로 지정. 숙청 대상을 처치하면 팀 SP +1
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.143 `eff_syn_rw_office_3`
- 출처/구역: 시너지 syn_rw_office (2단계) / `deployed_all`. 원안 행: v2.3 신규.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 2턴마다 적 1명을 "숙청 대상"으로 지정. 숙청 대상의 받는 피해 +20%. 숙청 대상을 처치하면 팀 SP +1
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.144 `eff_syn_knowledge_front_2`
- 출처/구역: 시너지 syn_knowledge_front (1단계) / `deployed_all`. 원안 행: v2.3 신규.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 적이 버프를 받으면 같은 버프를 아군 1명에게 복사(턴당 1회)
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.145 `eff_syn_class_227_2`
- 출처/구역: 시너지 syn_class_227 (1단계) / `deployed_all`. 원안 행: v2.3 신규.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 5턴째부터 매 턴 구성원 ATK +10%(최대 +50%, 버티기)
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.146 `eff_syn_life_safety_2`
- 출처/구역: 시너지 syn_life_safety (1단계) / `deployed_all`. 원안 행: v2.3 신규.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 첫 턴에는 둘 다 SPD -30(농땡이). 2턴부터 구성원 ATK +30%
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.147 `eff_syn_tank_2`
- 출처/구역: 시너지 syn_tank (1단계) / `deployed_all`. 원안 행: v2.3 신규.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 탱커 구성원의 받는 피해 -10%
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.148 `eff_syn_tank_3`
- 출처/구역: 시너지 syn_tank (2단계) / `deployed_all`. 원안 행: v2.3 신규.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 탱커 구성원의 받는 피해 -20%. 전투 시작 시 가장 앞의 탱커가 2턴간 도발(`st_taunt`)
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.149 `eff_syn_tank_4`
- 출처/구역: 시너지 syn_tank (3단계) / `deployed_all`. 원안 행: v2.3 신규.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 탱커 구성원의 받는 피해 -30%. 전투 시작 시 가장 앞의 탱커가 2턴간 도발(`st_taunt`). 탱커 구성원의 HP가 처음 50% 아래로 내려가면 최대 HP 25% 보호막
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.150 `eff_syn_attacker_2`
- 출처/구역: 시너지 syn_attacker (1단계) / `deployed_all`. 원안 행: v2.3 신규.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 어태커 구성원의 단일 대상 공격 피해 +15%
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.151 `eff_syn_attacker_3`
- 출처/구역: 시너지 syn_attacker (2단계) / `deployed_all`. 원안 행: v2.3 신규.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 어태커 구성원의 단일 대상 공격 피해 +30%. 같은 적을 연속으로 때리면 회당 +5%(최대 5)
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.152 `eff_syn_attacker_4`
- 출처/구역: 시너지 syn_attacker (3단계) / `deployed_all`. 원안 행: v2.3 신규.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 어태커 구성원의 단일 대상 공격 피해 +50%. 같은 적을 연속으로 때리면 회당 +5%(최대 5). 적을 처치하면 즉시 한 번 더 행동(턴당 1회)
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.153 `eff_syn_sniper_2`
- 출처/구역: 시너지 syn_sniper (1단계) / `deployed_all`. 원안 행: v2.3 조정.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 스나이퍼 구성원 CRIT +15%
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.154 `eff_syn_sniper_4`
- 출처/구역: 시너지 syn_sniper (2단계) / `deployed_all`. 원안 행: v2.3 조정.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 스나이퍼 구성원 CRIT +30%. 전투 시작 시 HP가 가장 높은 적을 조준하고, 스나이퍼 구성원이 그 적에게 주는 치명 피해 +50%
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.155 `eff_syn_blaster_2`
- 출처/구역: 시너지 syn_blaster (1단계) / `deployed_all`. 원안 행: v2.3 신규.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 블래스터 구성원의 광역 공격 피해 +15%
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.156 `eff_syn_blaster_4`
- 출처/구역: 시너지 syn_blaster (2단계) / `deployed_all`. 원안 행: v2.3 신규.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 블래스터 구성원의 광역 공격 피해 +30%. 3명 이상 맞히면 대상들에게 2턴간 DEF -15%(`st_def_down`)
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.157 `eff_syn_blaster_6`
- 출처/구역: 시너지 syn_blaster (3단계) / `deployed_all`. 원안 행: v2.3 신규.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 블래스터 구성원의 광역 공격 피해 +45%. 3명 이상 맞히면 대상들에게 2턴간 DEF -15%(`st_def_down`)를 걸고 팀 SP +1(SP는 턴당 1회)
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.158 `eff_syn_healer_2`
- 출처/구역: 시너지 syn_healer (1단계) / `deployed_all`. 원안 행: v2.3 신규.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 힐러 구성원의 치유량 +20%
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.159 `eff_syn_healer_4`
- 출처/구역: 시너지 syn_healer (2단계) / `deployed_all`. 원안 행: v2.3 신규.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 힐러 구성원의 치유량 +40%. 최대 HP를 넘친 치유량은 2턴짜리 보호막으로 바뀜
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.160 `eff_syn_supporter_2`
- 출처/구역: 시너지 syn_supporter (1단계) / `deployed_all`. 원안 행: v2.3 신규.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 서포터 구성원이 건 버프 지속 +1턴
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.161 `eff_syn_supporter_4`
- 출처/구역: 시너지 syn_supporter (2단계) / `deployed_all`. 원안 행: v2.3 신규.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 서포터 구성원이 건 버프 지속 +1턴. 전투 시작 시 팀 SP +1. 서포터가 버프를 걸면 대상 에너지 +10
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.162 `eff_syn_controller_2`
- 출처/구역: 시너지 syn_controller (1단계) / `deployed_all`. 원안 행: v2.3 신규.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 컨트롤러 구성원이 건 기절·침묵·지연 지속 +1턴(보스 제외)
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.163 `eff_syn_controller_4`
- 출처/구역: 시너지 syn_controller (2단계) / `deployed_all`. 원안 행: v2.3 신규.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 컨트롤러 구성원이 건 기절·침묵·지연 지속 +1턴(보스 제외). 제어 상태인 적이 받는 피해 +20%. 제어가 풀린 적의 다음 행동 10% 지연
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.164 `eff_syn_uni_hoshino`
- 출처/구역: 시너지 syn_unique_dawn_horus (1단계) / `front_only`. 원안 행: v2.3 조정.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 첫 2턴은 자신의 SPD -50%(낮잠). 아군이 처음 쓰러지는 순간 깨어나 "진심 모드": 도발(`st_taunt`) + 받는 피해 -40%(전투 종료까지)
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.165 `eff_syn_uni_aru`
- 출처/구역: 시너지 syn_unique_outlaw_boss (1단계) / `front_only`. 원안 행: v2.3 조정.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 필살기마다 50% "대성공"(피해 2배, 흥신소68 구성원 2턴간 ATK +20%) 또는 50% "대실패"(피해 절반, 다음 필살기는 대성공 확정)
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.166 `eff_syn_uni_hina`
- 출처/구역: 시너지 syn_unique_head_prefect (1단계) / `front_only`. 원안 행: v2.3 조정.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 연속 출전 1전마다 "업무량" +1(ATK +6%, 최대 5). 한 라운드 대기석에서 쉬면 업무량이 사라지는 대신 다음 전투를 에너지 100으로 시작
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.167 `eff_syn_uni_mika`
- 출처/구역: 시너지 syn_unique_princess_stars (1단계) / `front_only`. 원안 행: v2.3 조정.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 미카의 공격은 보호막을 먼저 통째로 부순다. 적을 처치하면 롤케이크를 먹고 최대 HP 15% 회복
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.168 `eff_syn_uni_wakamo`
- 출처/구역: 시너지 syn_unique_calamity_fox (1단계) / `front_only`. 원안 행: v2.3 조정.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 전투 시작 시 아군 중 코스트가 가장 높은 학생을 "그분"으로 지정. 그분을 때린 적을 끝까지 쫓으며 그 적에게 주는 피해 +50%
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.169 `eff_syn_uni_cherino`
- 출처/구역: 시너지 syn_unique_red_mustache (1단계) / `front_only`. 원안 행: v2.3 조정.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 체리노가 3번 맞으면 수염이 떨어져 1턴간 행동 불가(창피). 그 순간 마리나가 격노해 ATK +40%(전투 종료까지)
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.170 `eff_syn_uni_aris`
- 출처/구역: 시너지 syn_unique_level_up (1단계) / `deployed_all`. 원안 행: v2.3 신규.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 아리스가 적을 처치할 때마다 경험치 1(정예·보스는 3), 아리스가 출전한 전투에서 이기면 경험치 1. 경험치 5마다 레벨업해 런이 끝날 때까지 아리스 ATK +5% 영구 누적(레벨 6까지, +30%). 경험치는 아리스 개체가 아니라 런에 쌓여 팔거나 합성해도 남는다. 경험치 30(레벨 6)이 되고 3성 아리스를 보유하면 이름 없는 신들의 왕녀 「AL-1S」로 각성한다(9장)
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.171 `eff_syn_uni_miyu`
- 출처/구역: 시너지 syn_unique_invisible (1단계) / `deployed_all`. 원안 행: v2.3 신규.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 다른 아군이 살아 있으면 미유는 적의 단일 대상 공격 표적이 되지 않는다. 혼자 남으면 "발견"되어 ATK +50%
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.172 `eff_syn_uni_shiroko`
- 출처/구역: 시너지 syn_unique_bank_robber (1단계) / `front_only`. 원안 행: v2.3 신규.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 시로코가 출전한 전투에서 이기면 정산 때 30% 확률로 "전리품" +2G. 지면 없음
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.173 `eff_syn_uni_nonomi`
- 출처/구역: 시너지 syn_unique_gold_card (1단계) / `front_only`. 원안 행: v2.3 신규.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 노노미가 출전한 전투가 끝나면 다음 라운드 상점의 첫 새로고침이 무료
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.174 `eff_syn_uni_kazusa`
- 출처/구역: 시너지 syn_unique_caspalug (1단계) / `front_only`. 원안 행: v2.3 신규.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 카즈사가 스케반(불량배)·헬멧단 소속 적(`en_sukeban_smg`, `en_sukeban_shield`, `en_helmet_thug`, `en_helmet_grenadier`)에게 주는 피해 +50%
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.175 `eff_syn_plat_vanitas`
- 출처/구역: 시너지 syn_plat_vanitas (1단계) / `deployed_all`. 원안 행: v2.3 신규.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 발동 조건: 아리우스 스쿼드 5명(사오리·아츠코·히요리·미사키·아즈사)을 모두 3성으로 동시 출전. 효과: 아군이 쓰러질 때마다 남은 스쿼드원 ATK +25%, 에너지 +50. 사오리가 살아 있는 동안 적은 회복과 버프를 받지 못한다
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.176 `eff_syn_plat_ending_credits`
- 출처/구역: 시너지 syn_plat_ending_credits (1단계) / `deployed_all`. 원안 행: v2.3 신규.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 발동 조건: 게임개발부 4명(모모이·미도리·유즈·아리스, 아리스 자리는 AL-1S도 인정)을 모두 3성으로 동시 출전. 효과: 아리스(또는 AL-1S)의 "빛이여!" 레일건이 2턴마다 자동 발사(적 전원에게 ATK 400% 피해). 전멸 직전 1회 "컨티뉴": 아군 전원 HP 30%로 부활
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.177 `eff_syn_plat_codename`
- 출처/구역: 시너지 syn_plat_codename (1단계) / `deployed_all`. 원안 행: v2.3 신규.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 발동 조건: C&C 5명(네루·아스나·카린·아카네·토키) 동시 출전 + 네루·토키 3성. 효과: 전투 시작 직후 C&C 전원이 즉시 1회 행동. 적을 처치할 때마다 C&C 전원 다음 행동 시간 15% 당김
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.178 `eff_syn_plat_tea_party`
- 출처/구역: 시너지 syn_plat_tea_party (1단계) / `deployed_all`. 원안 행: v2.3 신규.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 발동 조건: 미카·나기사·세이아를 모두 3성으로 동시 출전. 효과: 켜진 진영·동아리 시너지가 모두 한 단계 위로 올라간다(이미 최고 단계면 그 효과 수치 +30%)
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.179 `eff_syn_plat_last_line`
- 출처/구역: 시너지 syn_plat_last_line (1단계) / `deployed_all`. 원안 행: v2.3 신규.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 발동 조건: 대책위원회 5명(호시노·시로코·세리카·노노미·아야네)을 모두 3성으로 동시 출전. 무장 호시노는 세지 않음. 효과: 아군 전원이 각자 1번씩 HP 1로 버틴다. 승리 정산마다 +5G(빚 상환)
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.180 `eff_syn_plat_school_battle`
- 출처/구역: 시너지 syn_plat_school_battle (1단계) / `special`. 원안 행: v2.3 신규.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 발동 조건: 서로 다른 진영 10곳의 학생을 1명씩, 10명 출전(레벨 10 필요). 구성원 명단 없이 출전 편성으로 판정. 효과: 출전한 학생들의 진영 시너지가 모두 최소 단계로 켜진다
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.181 `eff_syn_plat_total_assault`
- 출처/구역: 시너지 syn_plat_total_assault (1단계) / `special`. 원안 행: v2.3 신규.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 발동 조건: 출전 10명 모두 3성 + 7개 역할군이 1명 이상씩. 구성원 명단 없이 출전 편성으로 판정. 효과: 모든 역할군 시너지의 2단계 효과가 함께 켜지고 아군 전원 ATK +30%
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

v2.3.1 문구 정리(2026-10-30): 아래 V.182~V.189는 v2.1 부록 C의 같은 ID를 띄어쓰기·문장만 고쳐 대체한다. 수치·조건은 그대로다. 예외로 `eff_syn_valkyrie_3`은 2단계 "수배자" 지정을 3단계에도 명시적으로 남긴다(v2.1 6장 "최고 단계 하나만 등록" 규칙 때문에 3단계에서 수배자가 사라지던 문제).

### V.182 `eff_saori_skill`
- 출처/구역: u_saori 전투 스킬 / `front`. 원안 행: v2.3 조정.
- 실행: **SKILL 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 적대 전방의 도발 우선 최전방 1명에게 ATK 185% `normal` 피해. 그 뒤 자신에게 `st_next_crit` 1회 충전: 다음 직접 타격 묶음의 치명타를 확정하고 소비한다. 쓰지 않으면 다음 자기 차례 종료까지 유지
- 제한: CD2; 기본 비용/자원은7.4; 자동 사용 조건10.3.

### V.183 `eff_syn_valkyrie_3`
- 출처/구역: 시너지 syn_valkyrie (3단계) / `deployed_all`. 원안 행: v2.3 조정.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 아군 전원 DEF +35%, ATK +28%. 2단계의 "수배자" 지정을 그대로 유지한다: 전투 시작 및 매 2턴마다 적 최고 ATK 1명을 수배자로 지정해 2턴간 ATK -20%(`st_atk_down`), DEF -20%(`st_def_down`). AV 200/400/600/800/1000에 적 전방 전체에 2차례 동안 ATK -25%, DEF -30%. 아군의 직접 타격이 디버프가 있는 적에게 명중하면 그 대상의 행동을 15% 지연(1회)하고, 살아 있는 발키리 전방 학생 각각 에너지 +15(팀 전역 주기당 2회, root당 1회)
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.184 `eff_eq_goggles`
- 출처/구역: 장비 eq_abydos_goggles / `front`. 원안 행: v2.3 조정.
- 실행: **장비 컨테이너: 고정 스탯 1회 + 고유 handler**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 소유자가 가하는 피해 +12%(상시). 소유자의 `basic_resolved`마다 에너지 +8. 피해 증가는 공격마다 누적하지 않는다
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.185 `eff_eq_headband`
- 출처/구역: 장비 eq_cc_maid_headband / `front`. 원안 행: v2.3 조정.
- 실행: **장비 컨테이너: 고정 스탯 1회 + 고유 handler**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 소유자의 후속(FOLLOWUP) 타격 피해 +35%(상시). 소유자가 양의 피해를 준 `followup_resolved`에서 자기 최대 HP 8% 치유(장비 인스턴스별 개인 차례당 1회, root당 1회). 후속 그룹의 여러 대상은 한 번으로 센다
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.186 `eff_eq_armband`
- 출처/구역: 장비 eq_prefect_armband / `both`. 원안 행: v2.3 조정.
- 실행: **장비 컨테이너: 고정 스탯 1회 + 고유 handler**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 디버프가 있는 적에게 주는 피해 +18%. 소유자가 직접 타격한 뒤 살아 있는 적 전방 대상에게 2차례 동안 DEF -20%. 감소율은 원래 DEF 기준 가산이며, 현재 DEF에 반복 복리로 깎지 않는다
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

### V.187 `eff_en_choir_rear_buff`
- 출처/구역: 적/보스 en_justina_choir_rear / `rear`. 원안 행: v2.3 조정.
- 실행: **REAR 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 후방 정기 차례: 자기 진영의 살아 있는 전방 전체에 2차례 동안 ATK +20%, 각자 최대 HP 10% 치유
- 제한: 정상 후방 차례당1회; 기본 SP/에너지 소비·지급 없음.

### V.188 `eff_boss_kaiten_aura`
- 출처/구역: 적/보스 boss_kaiten_fx_mk0 / `front`. 원안 행: v2.3 조정.
- 실행: **패시브/반응 컨테이너**. turn_start.
- 본문: 자기 차례 시작에 이전 태세를 지운다. 홀수 차례에는 ATK +25%, 짝수 차례에는 DEF +40%와 최대 HP 12% 보호막. 능력치 태세는 다음 자기 차례 시작까지, 보호막은 2차례 유지. 패시브로 처리하므로 기본 자원 지급 없음
- 제한: 개인 차례당1회, handler/root당 1회; 상시·초기 효과는 해당 시점에만.

### V.189 `eff_boss_binah_sandstorm`
- 출처/구역: 적/보스 boss_binah_decagram / `front`. 원안 행: v2.3 조정.
- 실행: **패시브/반응 컨테이너**. damage_received.
- 본문: 비나가 살아 있는 채로 HP 60% 이하에 처음 도달하면 상대 전방 전체에 ATK 160% `normal` 피해(치명 불가)와 2차례 SPD -15. 전투당 1회. 한 번의 타격으로 0 HP가 되면 발동하지 않는다
- 제한: 전투당 1회; handler/root당 1회; 생존 조건 필수.

v2.3.2 아리스 각성(2026-10-30): 아래 V.190~V.199는 아리스를 2코 기준선(2장)에 맞춰 내리고(조정 3개, 전방 충전 패시브 `eff_aris_passive`는 그대로), 각성 학생 AL-1S의 효과 6개와 고유 시너지 효과를 새로 둔다. 각성 규칙은 9장.

### V.190 `eff_aris_skill`
- 출처/구역: u_aris 전투 스킬 / `front`. 원안 행: v2.3 조정.
- 실행: **SKILL 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 전방 배치 시 적 최전열 1명에게 ATK 140% 피해 및 자신의 에너지 +20 추가 회복
- 제한: CD2; 기본 비용/자원은7.4; 자동 사용 조건10.3.

### V.191 `eff_aris_ult`
- 출처/구역: u_aris 필살기 / `front`. 원안 행: v2.3 조정.
- 실행: **ULTIMATE 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 「빛이여!」 전방 배치 시 적 전방 전원에게 ATK 160/185/225% 광역 레일건 피해
- 제한: CD0; 개인 차례당 1회; ENERGY100 소비.

### V.192 `eff_aris_rear_reg`
- 출처/구역: u_aris 후방 정기 지원 / `rear`. 원안 행: v2.3 조정.
- 실행: **REAR 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 후방 자신의 정기 차례에 적 전방 전체에 ATK 80% normal 피해. 전방 충전은 eff_aris_passive로 분리한다.
- 제한: 정상 후방 차례당1회; 기본 SP/에너지 소비·지급 없음.

### V.193 `eff_al1s_skill`
- 출처/구역: u_al1s 전투 스킬 / `front`. 원안 행: v2.3 신규.
- 실행: **SKILL 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 「신명 문자 해독」 적 전방 전원에게 ATK 170% 피해, 맞은 적 2턴간 SPD -15. 자신의 에너지 +25
- 제한: CD2; 기본 비용/자원은7.4; 자동 사용 조건10.3.

### V.194 `eff_al1s_ult`
- 출처/구역: u_al1s 필살기 / `front`. 원안 행: v2.3 신규.
- 실행: **ULTIMATE 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 「빛이여, 이름 없는 신들의 이름으로」 적 전원에게 ATK 300/360/440% 방어 무시(`true`) 피해. 이 공격으로 처치한 적 1명마다 자신의 에너지 +15(최대 +45)
- 제한: CD0; 개인 차례당 1회; ENERGY100 소비.

### V.195 `eff_al1s_passive`
- 출처/구역: u_al1s 전방 패시브 / `front`. 원안 행: v2.3 신규.
- 실행: **패시브/반응 컨테이너**. 자기 turn_start.
- 본문: 전방 자기 turn_start마다 st_charge_aris 1중첩, 최대 3. 중첩당 가하는 피해 +12%, 전투 종료까지. 3중첩이 된 차례에 자신의 에너지 +30(전투당 1회)
- 제한: 개인 차례당1회, handler/root당 1회; 상시·초기 효과는 해당 시점에만.

### V.196 `eff_al1s_aura`
- 출처/구역: u_al1s 전방 패시브·후방 반응 지원 / `both`. 원안 행: v2.3 신규.
- 실행: **패시브/반응 컨테이너**. battle_start.
- 본문: 존재 효과 「무명의 왕녀」: AL-1S가 출전해 있는 동안(전방·후방 모두) 적 전원이 받는 피해 +8%, 아군 게임개발부 구성원 SPD +10
- 제한: 개인 차례당1회, handler/root당 1회; 상시·초기 효과는 해당 시점에만.

### V.197 `eff_al1s_rear_reg`
- 출처/구역: u_al1s 후방 정기 지원 / `rear`. 원안 행: v2.3 신규.
- 실행: **REAR 본문 직접 실행**. ActionResolver에서 본문 실행. 완료 후 대응 resolved 이벤트를 1회 발행.
- 본문: 후방 자신의 정기 차례에 적 전방 전체에 ATK 140% 방어 무시(`true`) 피해. 그 뒤 아군 전방 중 에너지가 가장 높은 1명에게 에너지 +15
- 제한: 정상 후방 차례당1회; 기본 SP/에너지 소비·지급 없음.

### V.198 `eff_al1s_rear_react`
- 출처/구역: u_al1s 후방 반응 지원 / `rear`. 원안 행: v2.3 신규.
- 실행: **패시브/반응 컨테이너**. unit_defeated.
- 본문: 「Key의 개입」 아군 전방이 전투불능이 될 때(`unit_defeated`) 적 전원에게 ATK 180% 피해(전투당 2회)
- 제한: 전투당 2회; 개인 차례당1회, handler/root당 1회.

### V.199 `eff_syn_uni_al1s`
- 출처/구역: 시너지 syn_unique_nameless_princess (1단계) / `deployed_all`. 원안 행: v2.3 신규.
- 실행: **시너지 컨테이너: 상시·초기·반응·주기 handler 분리**. 아래 각 문장의 실제 조건별로 분리; 팀 주기는 7.1, 카운터·예외는 10.4 적용.
- 본문: 「빠밤! 레벨업」의 경험치와 레벨을 그대로 이어받아 계속 쌓는다: 적 처치 경험치 1(정예·보스는 3), 출전한 전투에서 이기면 1, 경험치 5마다 레벨업해 런이 끝날 때까지 AL-1S ATK +5% 영구 누적(레벨 10까지, +50%). 「아트라하시스의 방주」: AL-1S가 필살기를 쓸 때마다 방주 기동 1단계(전투 종료까지, 최대 3). 3단계가 된 즉시 방주 주포가 적 전원에게 ATK 600% 방어 무시(`true`) 피해를 주고 아군 전원 에너지 +40(전투당 1회). 「용사의 동료」: 게임개발부 구성원이 1명 이상 함께 출전해 있으면, AL-1S가 처음 전투불능이 될 때 HP 50%로 다시 일어나고 전투 종료까지 ATK +30%(전투당 1회)
- 제한: 상시 modifier는 횟수 제한 없음. 반응의 명시 상한 우선; 미지정은10.4 기본값. 각 handler/root당 1회.

## 6. 삭제된 효과

폐기한 역할·장갑·고유 시너지의 단계 효과와, 밸런스 조정으로 학생에게서 뗀 효과 43개다. 카탈로그에서 뺀다. v2.2 3장의 한탕(`syn_jackpot`)과 그 효과 3개는 이 판부터 읽지 않는다.

- `eff_aris_rear_react`
- `eff_kayoko_rear_react`
- `eff_kotama_rear_react`
- `eff_nodoka_rear_react`
- `eff_syn_aegis_2`
- `eff_syn_aegis_4`
- `eff_syn_assault_2`
- `eff_syn_assault_4`
- `eff_syn_assault_6`
- `eff_syn_breacher_2`
- `eff_syn_breacher_4`
- `eff_syn_cmd_2`
- `eff_syn_cmd_4`
- `eff_syn_demo_2`
- `eff_syn_demo_4`
- `eff_syn_elastic_2`
- `eff_syn_elastic_4`
- `eff_syn_electro_2`
- `eff_syn_electro_4`
- `eff_syn_heavy_2`
- `eff_syn_heavy_4`
- `eff_syn_heavy_6`
- `eff_syn_light_3`
- `eff_syn_light_5`
- `eff_syn_light_7`
- `eff_syn_medic_2`
- `eff_syn_medic_4`
- `eff_syn_mystic_2`
- `eff_syn_mystic_4`
- `eff_syn_special_2`
- `eff_syn_special_4`
- `eff_syn_striker_2`
- `eff_syn_striker_4`
- `eff_syn_striker_6`
- `eff_syn_tac_2`
- `eff_syn_tac_4`
- `eff_syn_tac_6`
- `eff_syn_uni_himari`
- `eff_syn_uni_kisaki`
- `eff_syn_uni_rio`
- `eff_syn_uni_saori`
- `eff_syn_vanguard_2`
- `eff_syn_vanguard_4`

## 7. 전략 조정

| 전략 | 항목 | v2.3 |
|---|---|---|
| `str_iron_frontline` | 보유 조건 태그 | `syn_tank` |
| `str_mystic_resonance` | 약점 | `true` 피해를 가진 유닛(`u_iori`, `u_wakamo`)이나 시너지(`syn_hyakkiyako`)가 없으면 효율이 낮음. |
| `str_rapid_fire_drill` | 약점 | 단발 필살기 위주의 느린 어태커에게는 효율이 낮음. |
| `str_iron_frontline` | 제안 문장 | 전방 탱커(`syn_tank`) 유닛 2명 이상 보유 시 또는 2~3장 시작 시 등장 |
| `str_overclock_core` | 약점 | 스킬 사용 빈도가 급증하므로 팀 SP 공급 수단(`u_himari`, `u_nagisa`, `syn_supporter`, 평타 요원)이 뒷받침되어야 함. |

### 7.1 장비 추천 문구

v2.3에서 폐기된 시너지 이름(스트라이커·어설트)이 남아 있던 추천 문구를 역할군 이름으로 바꾼다.

| 장비 | v2.3 추천 |
|---|---|
| `eq_tactical_watch` | 추천: 어태커 전방 딜러(`u_iori`, `u_aru`, `u_mika`, `u_wakamo`) / 비추천: 순수 탱커 |
| `eq_abydos_goggles` | 추천: 기본 공격·연사 중심 어태커(`u_shiroko`, `u_serika`, `u_izuna`, `u_neru`) |

## 8. 신규 학생 원작 근거

| ID | 이름 | 학원 · 동아리 | 원작 설정 → 능력 |
|---|---|---|---|
| `u_chinatsu` | 히노미야 치나츠 | 게헨나 · 선도부 | 선도부의 의료 담당 → 단일 치유와 기절·침묵 응급 해제 |
| `u_haruna` | 쿠로다테 하루나 | 게헨나 · 미식연구회 | 미식연구회 회장, 마음에 안 드는 가게를 폭파하는 저격수 → 고HP 적 저격, 처치 시 "별점 0개" 폭발 |
| `u_izumi` | 시시도 이즈미 | 게헨나 · 미식연구회 | 늘 배고픈 미식연구회원 → 처치하면 에너지를 "먹는" 단순 딜러 |
| `u_akari` | 와니부치 아카리 | 게헨나 · 미식연구회 | 대식가 미식연구회원, 폭파 담당 → 전방 광역 폭파 |
| `u_juri` | 우시마키 쥬리 | 게헨나 · 급양부 | 요리에 열심이지만 결과물이 위험한 급양부원 → 치유·버프, 가끔 요리 실패 |
| `u_kasumi` | 키누가와 카스미 | 게헨나 · 온천개발부 | 온천을 찾아 아무 데나 폭파하는 온천개발부장 → 후방 굴착 폭파, 행동 지연 |
| `u_megu` | 시모쿠라 메구 | 게헨나 · 온천개발부 | 화염방사기를 든 온천개발부원 → 화상 부여·연장 |
| `u_akane` | 무로카사 아카네 | 밀레니엄 · C&C | 폭탄을 다루는 C&C 요원 콜사인 03 → 폭탄 설치 후 일괄 기폭 |
| `u_midori` | 사이바 미도리 | 밀레니엄 · 게임개발부 | 모모이의 쌍둥이, 게임개발부 일러스트 담당 → 모모이 연계 단일 딜러 |
| `u_yuzu` | 하나오카 유즈 | 밀레니엄 · 게임개발부 | 사물함에 숨어 사는 게임개발부장, 유탄 발사기 → 개전 은신, 무작위 유탄 |
| `u_chihiro` | 카가미 치히로 | 밀레니엄 · 베리타스 | 베리타스 부장 해커 → 적 버프 해제, 적 필살기 방해 |
| `u_maki` | 코누리 마키 | 밀레니엄 · 베리타스 | 그래피티 아티스트 베리타스 부원 → 광역 둔화(페인트) |
| `u_noa` | 우시오 노아 | 밀레니엄 · 세미나 | 세미나 서기, 완전 기억 능력자 → 전방 공격력 버프, 같은 적 반복 타격 강화 |
| `u_koyuki` | 쿠로사키 코유키 | 밀레니엄 · 세미나 | 도박을 좋아하는 세미나 회계 보조 → 동전 던지기 필살기 |
| `u_utaha` | 시라이시 우타하 | 밀레니엄 · 엔지니어부 | 엔지니어부장, 발명품 수리 → 긴급 수리 보호막 |
| `u_hibiki` | 네코츠카 히비키 | 밀레니엄 · 엔지니어부 | 엔지니어부 박격포 담당 → 후방까지 닿는 포격 |
| `u_kotori` | 토요미 코토리 | 밀레니엄 · 엔지니어부 | 해설 좋아하는 엔지니어부원 → 최고 공격력 아군 치명 피해 해설 지원 |
| `u_eimi` | 이즈미모토 에이미 | 밀레니엄 · 초현상특무부 | 추위를 안 타는 초현상특무부원 → 화상 면역 도발 탱커 |
| `u_hifumi` | 아지타니 히후미 | 트리니티 · 방과후 보충수업부 | 페로로 덕후 보충수업부장 → 페로로 인형 미끼 |
| `u_hanako` | 우라와 하나코 | 트리니티 · 방과후 보충수업부 | 수석이지만 일부러 낙제한 보충수업부원 → 세 번째마다 두 배 치유 |
| `u_nagisa` | 키리후지 나기사 | 트리니티 · 티파티 | 티파티 호스트 → 전방 총괄 버프, 존재 효과 「티타임」 |
| `u_seia` | 유리조노 세이아 | 트리니티 · 티파티 | 예지몽을 꾸는 티파티 → 적 필살기 대비 침묵, 존재 효과 「예지」 |
| `u_tsurugi` | 켄자키 츠루기 | 트리니티 · 정의실현위원회 | 광폭한 정의실현위원장, 산탄총 쌍수 → 맞을수록 강해지는 결전 딜러 |
| `u_mashiro` | 시즈야마 마시로 | 트리니티 · 정의실현위원회 | 정의를 외치는 정의실현위원회 저격수 → 아군을 쓰러뜨린 적 응징 |
| `u_mine` | 아오모리 미네 | 트리니티 · 구호기사단 | "구호"를 위해 먼저 돌격하는 구호기사단장 → 약한 아군 앞으로 뛰어드는 탱커 |
| `u_hanae` | 아사가오 하나에 | 트리니티 · 구호기사단 | 구호기사단 견습 → 단일 치유 |
| `u_reisa` | 우자와 레이사 | 트리니티 · 자경단 | 정의감 넘치는 자경단원 → 기절 대상 추가 피해(스즈미 섬광탄 콤비) |
| `u_kazusa` | 쿄야마 카즈사 | 트리니티 · 방과후 디저트부 | 디저트부원, 전직 불량배 "캬스파리그" → 단일 딜러 + 고유 「카스팔루그」 |
| `u_yoshimi` | 이바라기 요시미 | 트리니티 · 방과후 디저트부 | 단 것을 사랑하는 디저트부원 → 필살기 후 회복 |
| `u_airi` | 쿠리무라 아이리 | 트리니티 · 방과후 디저트부 | 자신감 없지만 다정한 디저트부원 → 약한 아군 방어 버프 |
| `u_natsu` | 유토리 나츠 | 트리니티 · 방과후 디저트부 | "로망"을 외치는 디저트부원 → 전방 피해 분산 탱커 |
| `u_tsukuyo` | 오오노 츠쿠요 | 백귀야행 · 인법연구부 | 키가 커서 숨지 못하는 인법연구부원 → 도발 탱커, 바꿔치기 회피 |
| `u_mimori` | 미즈하 미모리 | 백귀야행 · 수행부 | 수행부원, 정숙한 대화 수행 → 디버프 저항 지원 |
| `u_kaede` | 이사미 카에데 | 백귀야행 · 수행부 | 꼬마 수행부원 → 단순 광역 딜러 |
| `u_niya` | 텐지 니야 | 백귀야행 · 음양부 | 음양부장 점술가 → 무작위 점괘, 주기적 SP |
| `u_chise` | 와라쿠 치세 | 백귀야행 · 음양부 | 시를 읊는 음양부원, 부적 화염 → 광역 화상 |
| `u_tomoe` | 사시로 토모에 | 붉은겨울 · 붉은겨울 사무국 | 붉은겨울 사무국 실무 담당 → 에너지 지원, 체리노 강화 |
| `u_meru` | 히메키 메루 | 붉은겨울 · 지식해방전선 | 지식해방전선 부원 → 단일 침묵 |
| `u_shigure` | 마요이 시구레 | 붉은겨울 · 227호 특별반 | 혹한 정류장에서 버티는 227호 특별반 → 장기전 딜러 |
| `u_misaki` | 이마시노 미사키 | 아리우스 · 아리우스 스쿼드 | 아리우스 스쿼드 로켓 사수 → 후방 광역, 아군이 쓰러지면 보복 |
| `u_al1s` | AL-1S | 밀레니엄 · 게임개발부 | 아리스의 본래 정체, "이름 없는 신들의 왕녀" AL-1S → 각성 전용 5코, 「아트라하시스의 방주」 |

## 9. 각성

일정 조건을 채운 학생이 런 도중 다른 학생으로 바뀐다. 표는 `scripts/extract-content.mjs`가 읽어 유닛의 `awakening`(원래 학생)·`awakenedFrom`(각성 학생)에 넣는다. 각성 학생은 상점에 나오지 않는다.

| 원래 학생 | 각성 학생 | 경험치를 세는 고유 시너지 | 필요 경험치 | 필요 성급 |
|---|---|---|---|---|
| `u_aris` | `u_al1s` | `syn_unique_level_up` | 30 | 3 |

- **경험치.** 「빠밤! 레벨업」(V.170)이 런 단위로 센다. 처치 1(정예·보스 3), 출전한 전투 승리 1. 아리스를 팔거나 합성해도 남고, 다시 사면 이어진다. 출전하지 않은 전투에서는 쌓이지 않는다.
- **조건.** 경험치 30 이상, 그리고 3성 아리스를 보유(출전·대기). 둘 중 하나만 채우면 기다린다. 경험치가 먼저 차면 아리스를 3성으로 합성하는 순간을, 3성이 먼저면 경험치를 기다린다.
- **시점.** 두 조건이 함께 채워진 때: 전투 정산 때, 또는 준비 단계에서 합성으로 3성이 된 즉시. 전투 도중에는 바뀌지 않는다. 이긴 전투든 진 전투든 같다.
- **대상.** 3성 아리스 1명(여럿이면 출전 중인 쪽, 그다음 먼저 얻은 쪽). 그 자리와 장비를 그대로 두고 3성 AL-1S가 된다.
- **나머지 아리스.** 각성하지 않은 아리스는 판매 규칙대로 자동 판매한다. 각성 뒤에는 상점에 아리스가 나오지 않는다.
- **AL-1S.** 팔 수 없고 합성 대상도 아니다(같은 학생이 둘이 될 수 없음). 경험치와 레벨은 「이름 없는 신들의 왕녀」(V.199)가 이어받아 레벨 10(+50%)까지 계속 오른다. 「엔딩 크레딧」 등 아리스를 요구하는 조건은 AL-1S도 채운다.
- **표시.** 아리스 카드에 "Lv.n · 각성까지 x/30 · ★3 필요"을 보여 주고, 각성할 때 전용 연출(이름 없는 신들의 왕녀)을 띄운다.
- **기대 시점.** 아리스를 전방 딜러로 꾸준히 쓰면 전투당 경험치 2~4 → 2장 중반~후반에 경험치가 찬다. 2코 3성(9장)도 그 무렵 맞추는 것이 목표다. 후방에만 두거나 3성을 못 맞추면 3장, 또는 끝내 각성하지 못한다.

## 10. 난이도 조정

v2.3.3(2026-10-30 사용자 요청): 최종 보스를 뺀 일반·정예 노드와 1·2장 보스 노드를 지금보다 1.5배 어렵게 한다. v2.1 E.2의 노드 배율(`statScaleBps`, 적 HP·ATK에만 곱함, A16)을 ×1.5 한 값으로 대체한다. DEF·SPD는 배율을 받지 않는 기존 규칙 그대로다. 최종 보스 노드(`node_3_5`)만 호위 적까지 배율 ×1을 유지한다(배율이 노드 단위라 보스와 호위를 따로 올릴 수 없음). `scripts/extract-content.mjs`가 이 표로 E.2 배율을 덮어쓰며, "원래 배율" 칸이 E.2와 다르면 멈춘다.

| 노드 | 유형 | 원래 배율 (E.2) | 새 배율 |
|---|---|---|---|
| `node_1_1` | normal | ×0.85 | ×1.275 |
| `node_1_2` | normal | ×0.95 | ×1.425 |
| `node_1_3` | normal | ×1 | ×1.5 |
| `node_1_4` | elite | ×1 | ×1.5 |
| `node_1_5` | boss | ×1 | ×1.5 |
| `node_2_1` | normal | ×1.15 | ×1.725 |
| `node_2_2` | normal | ×1.25 | ×1.875 |
| `node_2_3` | normal | ×1.35 | ×2.025 |
| `node_2_4` | elite | ×1.05 | ×1.575 |
| `node_2_5` | boss | ×1 | ×1.5 |
| `node_3_1` | normal | ×1.2 | ×1.8 |
| `node_3_2` | normal | ×1.3 | ×1.95 |
| `node_3_3` | normal | ×1.35 | ×2.025 |
| `node_3_4` | elite | ×1.4 | ×2.1 |
| `node_3_5` | boss | ×1 | ×1 |

- 체감: HP와 ATK가 함께 1.5배라, 같은 편성으로 적을 쓰러뜨리는 시간과 받는 피해가 모두 1.5배가 된다.
- 적 1명당 패배 피해·보상·노드 구성은 바꾸지 않는다. 밸런스 확인은 M6 시드 배치 시뮬레이션에서 한다.
