// 학생 능력(기본·스킬·필살기·후방 정기)과 패시브·후방 반응. docs/GDD_v2.1.md 6장 표와 10.1~10.3의 확정 사양.
// 키는 효과 ID에서 eff_를 뺀 것. 성급별 수치 a/b/c는 c.v(u, [a, b, c]).
import {
  A, anyOf, atkDown, atkUp, buff, burn, critUp, defDown, defUp, dmgUp, follow, guard, hot, isAllyFront, needBuff, needHeal,
  keyHack, needSelfHeal, needShield, react, silence, spdDown, spdUp, stun, taunt, tauntFoe, vuln,
  type Active, type Battle, type Ev, type U,
} from './kit';
import type { Passive } from '../engine';

const S = 'skill' as const;
const X = 'ultimate' as const;
const R = 'rear' as const;

/** 기본 공격: 적대 전방의 도발 우선 최전방 1명에게 ATK 100% */
const basic: Active = A((c, u) => { c.hit(u, c.pick(u), 1, 'basic'); });

export const actives: Record<string, Active> = {
  common_basic_atk: basic,

  // ── 1코 ──
  airi_rear_reg: A((c, u) => { defUp(c, u, c.lowestRatio(c.mates(u))[0], c.v(u, [2000, 2500, 3200]), 'airi_rear_reg'); }),
  asuna_skill: A((c, u) => { c.hit(u, c.pick(u), 1.55, S); c.advance(u, c.v(u, [0.25, 0.3, 0.4])); }),
  asuna_ult: A((c, u) => { c.hit(u, c.pick(u), c.v(u, [2.5, 2.85, 3.4]), X); }),
  fubuki_skill: A((c, u) => { c.hit(u, c.pick(u), 1.3, S); atkUp(c, u, u, 2000, 'fubuki_skill'); }),
  fubuki_ult: A((c, u) => { const t = c.highestSpd(c.foes(u)); c.hit(u, t, c.v(u, [2.35, 2.7, 3.25]), X); if (t) c.delay(t, c.v(u, [0.3, 0.35, 0.45]), u); }),
  hanae_rear_reg: A((c, u) => { c.heal(u, c.lowestRatio(c.mates(u))[0], c.atk(u) * c.v(u, [1.3, 1.5, 1.8])); }),
  haruka_skill: A((c, u) => { c.hit(u, c.pick(u), 1.3, S); defUp(c, u, u, c.v(u, [3000, 3800, 5000]), 'haruka_skill'); }),
  haruka_ult: A((c, u) => { c.heal(u, u, u.maxHp * c.v(u, [0.28, 0.33, 0.4])); }, needSelfHeal(0.7)),
  izumi_skill: A((c, u) => { const r = c.hit(u, c.pick(u), 1.4, S); if (r.some((x) => x.killed)) c.gainEnergy(u, 20); }),
  izumi_ult: A((c, u) => { c.hit(u, c.pick(u), c.v(u, [2.4, 2.75, 3.3]), X); }),
  junko_skill: A((c, u) => { c.hit(u, c.firstN(u, 2), c.v(u, [1.25, 1.45, 1.75]), S); }),
  junko_ult: A((c, u) => { c.hit(u, c.foes(u), c.v(u, [1.45, 1.7, 2.05]), X); }),
  juri_rear_reg: A((c, u) => {
    if (c.rng.chance(3000)) { c.hit(u, c.pick(u), 0.8, R); return; }
    const t = c.lowestRatio(c.mates(u))[0];
    c.heal(u, t, c.atk(u) * c.v(u, [1.1, 1.3, 1.55]));
    atkUp(c, u, t, 1000, 'juri_rear_reg');
  }),
  kaede_skill: A((c, u) => { c.hit(u, c.firstN(u, 2), 1.1, S); }),
  kaede_ult: A((c, u) => { c.hit(u, c.foes(u), c.v(u, [1.5, 1.7, 2.05]), X); }),
  kokona_skill: A((c, u) => { c.heal(u, c.lowestRatio(c.mates(u))[0], c.atk(u) * c.v(u, [1.5, 1.75, 2.1])); }, needHeal(0.85)),
  kokona_ult: A((c, u) => { for (const t of c.mates(u)) c.heal(u, t, c.atk(u) * c.v(u, [1.35, 1.6, 1.95])); }, needHeal(0.7)),
  kokona_rear_reg: A((c, u) => { for (const t of c.lowestRatio(c.mates(u), 2)) { c.heal(u, t, c.atk(u) * c.v(u, [1.2, 1.4, 1.7])); defUp(c, u, t, 1500, 'kokona_rear_reg'); } }),
  kotama_rear_reg: A((c, u) => { for (const t of c.mates(u)) atkUp(c, u, t, c.v(u, [1000, 1300, 1800]), 'kotama_rear_reg'); }),
  kotori_rear_reg: A((c, u) => { critUp(c, u, c.highestAtk(c.mates(u)), 0, 'kotori_rear_reg', 2, c.v(u, [2000, 2500, 3500])); }),
  michiru_skill: A((c, u) => { const t = c.pick(u); c.hit(u, t, 1.45, S); burn(c, u, t, 'michiru_skill'); }),
  michiru_ult: A((c, u) => { c.hit(u, c.firstN(u, 2), c.v(u, [1.85, 2.15, 2.6]), X); }),
  nodoka_rear_reg: A((c, u) => { for (const t of c.mates(u)) critUp(c, u, t, c.v(u, [1000, 1300, 1800]), 'nodoka_rear_reg'); }),
  rabu_skill: A((c, u) => { c.hit(u, c.firstN(u, 2), 1.3, S); }),
  rabu_ult: A((c, u) => { const ts = c.foes(u); c.hit(u, ts, c.v(u, [1.5, 1.75, 2.15]), X); for (const t of ts) burn(c, u, t, 'rabu_ult'); }),
  serika_skill: A((c, u) => { atkUp(c, u, u, c.v(u, [2500, 3000, 4000]), 'serika_skill'); spdUp(c, u, u, 15, 'serika_skill'); }, needBuff('serika_skill', 'self')),
  serika_ult: A((c, u) => { c.hit(u, c.lowestHp(c.foes(u)), c.v(u, [2.4, 2.7, 3.2]), X); }),
  serina_rear_reg: A((c, u) => {
    const t = c.lowestRatio(c.mates(u))[0];
    c.heal(u, t, c.atk(u) * c.v(u, [1.6, 1.85, 2.2]) + c.v(u, [80, 140, 240]));
  }),
  suzumi_skill: A((c, u) => { const t = c.highestAtk(c.foes(u)); c.hit(u, t, 1.4, S); stun(c, u, t, 'suzumi_skill'); }),
  suzumi_ult: A((c, u) => { c.hit(u, c.foes(u), c.v(u, [1.3, 1.5, 1.8]), X); if (c.rng.chance(c.v(u, [5000, 6500, 8500]))) stun(c, u, c.pick(u), 'suzumi_ult'); }),
  suzumi_rear_reg: A((c, u) => { atkDown(c, u, c.highestSpd(c.foes(u)), c.v(u, [1500, 1800, 2200]), 'suzumi_rear_reg'); }),
  yoshimi_skill: A((c, u) => { c.hit(u, c.pick(u), 1.35, S); }),
  yoshimi_ult: A((c, u) => { c.hit(u, c.pick(u), c.v(u, [2.35, 2.7, 3.25]), X); c.heal(u, u, u.maxHp * 0.15); }),

  // ── 2코 ──
  akari_skill: A((c, u) => { c.hit(u, c.firstN(u, 2), 1.3, S); }),
  akari_ult: A((c, u) => { const r = c.hit(u, c.foes(u), c.v(u, [1.6, 1.85, 2.25]), X); c.gainEnergy(u, 20 * r.filter((x) => x.killed).length); }),
  aris_skill: A((c, u) => { c.hit(u, c.pick(u), 1.4, S); c.gainEnergy(u, 20); }),
  aris_ult: A((c, u) => { c.hit(u, c.foes(u), c.v(u, [1.6, 1.85, 2.25]), X); }),
  aris_rear_reg: A((c, u) => { c.hit(u, c.foes(u), 0.8, R); }),
  ayane_rear_reg: A((c, u) => { for (const t of c.lowestRatio(c.mates(u), 3)) c.heal(u, t, c.atk(u) * c.v(u, [1.2, 1.4, 1.75]) + c.v(u, [50, 90, 150])); }),
  chinatsu_rear_reg: A((c, u) => { const t = c.lowestRatio(c.mates(u))[0]; c.heal(u, t, c.atk(u) * c.v(u, [1.5, 1.7, 2.05])); c.cleanse(t, 1); }),
  chise_rear_reg: A((c, u) => { const ts = c.firstN(u, 2); c.hit(u, ts, c.v(u, [0.95, 1.1, 1.35]), R); for (const t of ts) burn(c, u, t, 'chise_rear_reg', 2 + (c.tier('syn_yinyang') !== undefined ? 1 : 0)); }),
  fuuka_rear_reg: A((c, u) => { for (const t of c.mates(u)) { c.heal(u, t, c.atk(u) * c.v(u, [1.15, 1.35, 1.65]) + c.v(u, [60, 100, 170])); defUp(c, u, t, 1500, 'fuuka_rear_reg'); } }),
  hare_rear_reg: A((c, u) => { const ts = c.foes(u); c.hit(u, ts, c.v(u, [0.95, 1.15, 1.45]), R); for (const t of ts) if (c.rng.chance(c.v(u, [3000, 4500, 6000]))) silence(c, u, t, 'hare_rear_reg'); }),
  hasumi_skill: A((c, u) => { c.hit(u, c.lowestHp(c.foes(u)), 1.8, S); }),
  hasumi_ult: A((c, u) => { c.hit(u, c.lowestHp(c.foes(u)), c.v(u, [2.9, 3.35, 4.0]), X); }),
  hibiki_rear_reg: A((c, u) => { for (let i = 0; i < 2; i++) c.hit(u, c.randomOf(c.foes(u)), c.v(u, [1.1, 1.3, 1.6]), R); }),
  karin_rear_reg: A((c, u) => {
    const t = c.highestHp(c.foes(u));
    c.hit(u, t, c.v(u, [1.65, 1.95, 2.4]), R);
    if (t && t.alive && c.def(t) >= 80) c.hit(u, t, 0.6, 'followup', { true: true, fx: 'karin_rear_reg' });
  }),
  kayoko_skill: A((c, u) => { const t = c.highestAtk(c.foes(u)); c.hit(u, t, 1.45, S); stun(c, u, t, 'kayoko_skill'); }),
  kayoko_ult: A((c, u) => { const ts = c.foes(u); c.hit(u, ts, c.v(u, [1.55, 1.8, 2.2]), X); for (const t of ts) if (c.rng.chance(c.v(u, [6000, 7500, 9000]))) silence(c, u, t, 'kayoko_ult'); }),
  kayoko_rear_reg: A((c, u) => { const ts = c.firstN(u, 2); c.hit(u, ts, 0.95, R); for (const t of ts) silence(c, u, t, 'kayoko_rear_reg'); }),
  kirino_skill: A((c, u) => { const ts = c.firstN(u, 2); c.hit(u, ts, 1.15, S); for (const t of ts) atkDown(c, u, t, 2000, 'kirino_skill'); taunt(c, u, 'kirino_skill', 1); defUp(c, u, u, 2000, 'kirino_skill'); }),
  kirino_ult: A((c, u) => { const ts = c.foes(u); c.hit(u, ts, c.v(u, [1.4, 1.65, 2.0]), X); for (const t of ts) c.delay(t, 0.2, u); }),
  maki_rear_reg: A((c, u) => { const ts = c.foes(u); c.hit(u, ts, c.v(u, [0.85, 1.0, 1.25]), R); for (const t of ts) spdDown(c, u, t, 10, 'maki_rear_reg'); }),
  mashiro_rear_reg: A((c, u) => { const t = c.highestAtk(c.foes(u)); c.hit(u, t, c.v(u, [1.65, 1.9, 2.35]), R, { bonus: t?.d.killedAlly ? 5000 : 0 }); }),
  megu_skill: A((c, u) => { const ts = c.firstN(u, 2); c.hit(u, ts, 1.2, S); for (const t of ts) burn(c, u, t, 'megu_skill'); }),
  megu_ult: A((c, u) => {
    const ts = c.foes(u);
    c.hit(u, ts, c.v(u, [1.55, 1.8, 2.2]), X);
    for (const t of ts) for (const s of t.st) if (s.id === 'st_burn') s.turns++;
  }),
  meru_rear_reg: A((c, u) => { const t = c.pick(u); c.hit(u, t, 0.8, R); if (c.rng.chance(c.v(u, [5000, 6500, 8000]))) silence(c, u, t, 'meru_rear_reg'); }),
  midori_skill: A((c, u) => { c.hit(u, c.pick(u), 1.5, S); const m = c.mates(u).find((x) => x.unit?.id === 'u_momoi'); if (m) c.advance(m, 0.15); }),
  midori_ult: A((c, u) => { c.hit(u, c.pick(u), c.v(u, [2.7, 3.1, 3.75]), X); }),
  momiji_skill: A((c, u) => { const ts = c.firstN(u, 2); c.hit(u, ts, 1.4, S); for (const t of ts) defDown(c, u, t, 1500, 'momiji_skill'); }),
  momiji_ult: A((c, u) => { c.hit(u, c.foes(u), c.v(u, [1.5, 1.75, 2.15]), X); }),
  momoi_skill: A((c, u) => { const ts = c.firstN(u, 2); c.hit(u, ts, 1.3, S); for (const t of ts) burn(c, u, t, 'momoi_skill'); }),
  momoi_ult: A((c, u) => { const ts = c.foes(u); c.hit(u, ts, c.v(u, [1.6, 1.85, 2.25]), X); for (const t of ts) burn(c, u, t, 'momoi_ult'); }),
  momoi_rear_reg: A((c, u) => { c.hit(u, c.foes(u), c.v(u, [0.85, 1.0, 1.25]), R); }),
  natsu_skill: A((c, u) => { defUp(c, u, u, 3000, 'natsu_skill'); for (const t of c.mates(u)) guard(c, u, t, 800, 'natsu_skill'); }, needBuff('natsu_skill', 'mates')),
  natsu_ult: A((c, u) => { taunt(c, u, 'natsu_ult', 2); c.heal(u, u, u.maxHp * c.v(u, [0.2, 0.24, 0.3])); }),
  nozomi_skill: A((c, u) => { c.hit(u, c.pick(u), 1.55, S); for (const t of c.mates(u)) c.advance(t, 0.15); }),
  nozomi_ult: A((c, u) => { c.hit(u, c.pick(u), c.v(u, [2.55, 2.95, 3.55]), X); spdUp(c, u, u, 20, 'nozomi_ult'); }),
  reisa_skill: A((c, u) => { c.hit(u, c.pick(u), 1.45, S); spdUp(c, u, u, 10, 'reisa_skill'); }),
  reisa_ult: A((c, u) => { const t = c.pick(u); c.hit(u, t, c.v(u, [2.65, 3.05, 3.7]), X, { bonus: t && c.hasSt(t, 'st_stun') ? 5000 : 0 }); }),
  shiroko_skill: A((c, u) => { const t = c.pick(u); c.hit(u, t, 1.5, S); defDown(c, u, t, 2000, 'shiroko_skill'); }),
  shiroko_ult: A((c, u) => { c.hit(u, c.highestDef(c.foes(u)), c.v(u, [2.6, 3.0, 3.6]), X); }),
  shun_skill: A((c, u) => { c.gainEnergy(u, 25); atkUp(c, u, u, 2500, 'shun_skill'); critUp(c, u, u, 1500, 'shun_skill'); }, anyOf((_c, u) => u.energy <= 75, needBuff('shun_skill', 'self'))),
  shun_ult: A((c, u) => { c.hit(u, c.highestAtk(c.foes(u)), c.v(u, [2.75, 3.2, 3.85]), X); }),
  tsubaki_skill: A((c, u) => { tauntFoe(c, u, c.highestAtk(c.foes(u)), 'tsubaki_skill', 1); defUp(c, u, u, 2500, 'tsubaki_skill'); }, (c, u) => c.foes(u).some((t) => !t.st.some((s) => s.id === 'st_taunted' && s.params.by === u.uid && s.turns >= 1))),
  tsubaki_ult: A((c, u) => { for (const t of c.foes(u)) tauntFoe(c, u, t, 'tsubaki_ult', 2); guard(c, u, u, c.v(u, [2000, 2500, 3200]), 'tsubaki_ult'); }, (c, u) => c.foes(u).some((t) => !t.st.some((s) => s.id === 'st_taunted' && s.params.by === u.uid && s.turns >= 1))),
  tsukuyo_skill: A((c, u) => { taunt(c, u, 'tsukuyo_skill', 2); guard(c, u, u, 2000, 'tsukuyo_skill'); }, needBuff('tsukuyo_skill', 'self')),
  tsukuyo_ult: A((c, u) => { c.shield(u, u, u.maxHp * c.v(u, [0.3, 0.35, 0.42]), 2, 'tsukuyo_ult'); u.d.evade = 1; }),
  yuuka_skill: A((c, u) => { c.shield(u, u, u.maxHp * c.v(u, [0.132, 0.156, 0.192]), 2, 'yuuka_skill'); }, (c, u) => c.shieldOf(u) < u.maxHp * 0.2),
  yuuka_ult: A((c, u) => { for (const t of c.mates(u)) c.shield(u, t, u.maxHp * c.v(u, [0.108, 0.132, 0.168]), 2, 'yuuka_ult'); }, needShield('mates')),

  // ── 3코 ──
  akane_skill: A((c, u) => { const t = c.pick(u); c.hit(u, t, 1.5, S); if (t?.alive) c.apply(u, t, 'st_bomb', { turns: 2, params: { by: u.uid }, key: `${u.uid}:bomb`, fx: 'akane_skill' }); }),
  akane_ult: A((c, u) => {
    for (const t of c.foes(u)) { const b = t.st.find((s) => s.id === 'st_bomb' && s.params.by === u.uid); if (b) { c.removeStatus(t, b); t.d.bombed = true; c.hit(u, t, 1.2, 'followup', { fx: 'akane_skill' }); } }
    const ts = c.foes(u);
    c.hit(u, ts, c.v(u, [1.9, 2.2, 2.65]), X);
    for (const t of ts) if (t.d.bombed) { t.d.bombed = false; c.hit(u, t, 0.6, 'followup', { fx: 'akane_ult' }); }
  }),
  atsuko_skill: A((c, u) => { for (const t of c.mates(u)) { hot(c, u, t, c.atk(u) * 0.6, 'atsuko_skill'); defUp(c, u, t, 2000, 'atsuko_skill'); } }, anyOf(needHeal(0.85), needBuff('atsuko_skill', 'mates'))),
  atsuko_ult: A((c, u) => { for (const t of c.mates(u)) { c.heal(u, t, u.maxHp * c.v(u, [0.22, 0.26, 0.32])); guard(c, u, t, 1800, 'atsuko_ult'); } }, needHeal(0.7)),
  azusa_skill: A((c, u) => { const t = c.pick(u); c.hit(u, t, 1.6, S); defDown(c, u, t, 3000, 'azusa_skill'); }),
  azusa_ult: A((c, u) => { c.hit(u, c.pick(u), c.v(u, [3.1, 3.55, 4.3]), X); }),
  chihiro_rear_reg: A((c, u) => { c.dispel(c.randomOf(c.foes(u)), 1); for (const t of c.mates(u)) critUp(c, u, t, c.v(u, [1200, 1500, 2000]), 'chihiro_rear_reg'); }),
  eimi_skill: A((c, u) => { c.hit(u, c.pick(u), 1.0, S); guard(c, u, u, 2500, 'eimi_skill'); taunt(c, u, 'eimi_skill', 2); }),
  eimi_ult: A((c, u) => { c.shield(u, u, u.maxHp * c.v(u, [0.3, 0.35, 0.45]), 2, 'eimi_ult'); for (const t of c.mates(u)) c.apply(u, t, 'st_immune', { turns: 2, fx: 'eimi_ult', key: `${u.uid}:immune` }); }),
  hanako_rear_reg: A((c, u) => { u.d.hanako = (u.d.hanako ?? 0) + 1; const k = u.d.hanako % 3 === 0 ? 2 : 1; for (const t of c.mates(u)) c.heal(u, t, c.atk(u) * c.v(u, [1.2, 1.4, 1.7]) * k); }),
  hifumi_rear_reg: A((c, u) => { c.g.decoy = { ...(c.g.decoy ?? {}), [u.side]: 1 }; for (const t of c.mates(u)) atkUp(c, u, t, c.v(u, [1500, 2000, 2800]), 'hifumi_rear_reg'); c.fire('hifumi_rear_reg'); }),
  hiyori_rear_reg: A((c, u) => {
    const t = c.pick(u);
    c.hit(u, t, c.v(u, [1.5, 1.75, 2.15]), R);
    const arius = (c.g.ariusCount ?? 0) >= 3 ? 1000 : 0;
    defDown(c, u, t, c.v(u, [3000, 3500, 4500]) + arius, 'hiyori_rear_reg');
  }),
  iori_skill: A((c, u) => { taunt(c, u, 'iori_skill', 1); c.shield(u, u, u.maxHp * 0.2, 2, 'iori_skill'); c.hit(u, c.pick(u), 1.4, S); }),
  iori_ult: A((c, u) => { const t = c.pick(u); const adj = t ? c.adjacent(t) : undefined; c.hit(u, t, c.v(u, [2.7, 3.1, 3.75]), X, { aoe: false }); c.hit(u, adj, c.v(u, [1.35, 1.55, 1.9]), X, { aoe: false }); }),
  izuna_skill: A((c, u) => { c.hit(u, c.pick(u), 1.65, S); critUp(c, u, u, 1500, 'izuna_skill'); }),
  izuna_ult: A((c, u) => { c.hit(u, c.pick(u), c.v(u, [2.45, 2.8, 3.35]), X); spdUp(c, u, u, 20, 'izuna_ult'); c.advance(u, 0.35); }),
  kasumi_rear_reg: A((c, u) => {
    const ts = c.foes(u);
    const st = u.d.kasumi ?? 0; u.d.kasumi = 0;
    c.hit(u, ts, c.v(u, [1.1, 1.3, 1.6]), R, { bonus: st * 2000 });
    for (const t of ts) if (c.rng.chance(3000)) c.delay(t, 0.15, u);
  }),
  kazusa_skill: A((c, u) => { c.hit(u, c.pick(u), 1.65, S); critUp(c, u, u, 1500, 'kazusa_skill'); }),
  kazusa_ult: A((c, u) => { c.hit(u, c.pick(u), c.v(u, [3.1, 3.55, 4.3]), X); }),
  koharu_skill: A((c, u) => { for (const t of c.lowestRatio(c.mates(u), 2)) c.heal(u, t, c.atk(u) * 1.35); c.hit(u, c.pick(u), 1.2, S); }),
  koharu_ult: A((c, u) => { for (const t of c.mates(u)) c.heal(u, t, c.atk(u) * c.v(u, [1.5, 1.75, 2.15])); c.hit(u, c.foes(u), c.v(u, [1.4, 1.65, 2.0]), X); }),
  koharu_rear_reg: A((c, u) => { for (const t of c.mates(u)) c.heal(u, t, c.atk(u) * c.v(u, [1.25, 1.45, 1.8])); c.hit(u, c.pick(u), 0.9, R); }),
  koyuki_skill: A((c, u) => { const t = c.pick(u); c.hit(u, t, 1.4, S); if (c.rng.chance(5000)) stun(c, u, t, 'koyuki_skill'); }),
  koyuki_ult: A((c, u) => {
    c.hit(u, c.foes(u), c.v(u, [1.7, 1.95, 2.35]), X);
    if (c.rng.chance(5000)) for (const t of c.foes(u)) stun(c, u, t, 'koyuki_ult');
    else for (const t of c.mates(u)) c.gainEnergy(t, 30);
  }),
  koyuki_rear_reg: A((c, u) => { c.delay(c.randomOf(c.foes(u))!, c.v(u, [0.3, 0.35, 0.45]), u); }),
  marina_skill: A((c, u) => { const ts = c.firstN(u, 2); c.hit(u, ts, 1.4, S); for (const t of ts) tauntFoe(c, u, t, 'marina_skill', 1); }),
  marina_ult: A((c, u) => { const ts = c.foes(u); c.hit(u, ts, c.v(u, [1.75, 2.05, 2.5]), X); for (const t of ts) buff(c, u, t, 'st_healing_received_down', { healRecv: -4000 }, 'marina_ult'); }),
  mimori_rear_reg: A((c, u) => { for (const t of c.mates(u)) { t.d.resist = 1; c.gainEnergy(t, c.v(u, [10, 12, 15])); } c.fire('mimori_rear_reg'); }),
  mina_skill: A((c, u) => { const ts = c.firstN(u, 2); c.hit(u, ts, 1.2, S); for (const t of ts) { atkDown(c, u, t, 2000, 'mina_skill'); defDown(c, u, t, 2000, 'mina_skill'); } c.shield(u, u, u.maxHp * 0.18, 2, 'mina_skill'); }),
  mina_ult: A((c, u) => { const t = c.pick(u); c.hit(u, t, c.v(u, [2.65, 3.05, 3.7]), X); if (t) c.delay(t, 0.35, u); }),
  misaki_rear_reg: A((c, u) => { const b = u.d.misaki ? 5000 : 0; u.d.misaki = false; c.hit(u, c.foes(u), c.v(u, [1.2, 1.4, 1.7]), R, { bonus: b }); }),
  moe_rear_reg: A((c, u) => { c.hit(u, c.foes(u), c.v(u, [1.15, 1.35, 1.65]), R); }),
  mutsuki_skill: A((c, u) => { c.hit(u, c.firstN(u, 3), 1.4, S); }),
  mutsuki_ult: A((c, u) => { c.hit(u, c.foes(u), c.v(u, [2.05, 2.4, 2.9]), X); }),
  mutsuki_rear_reg: A((c, u) => { c.hit(u, c.firstN(u, 2), 1.1, R); }),
  nonomi_skill: A((c, u) => { c.hit(u, c.foes(u), c.v(u, [1.2, 1.4, 1.7]), S); }),
  nonomi_ult: A((c, u) => { c.hit(u, c.foes(u), c.v(u, [1.95, 2.25, 2.75]), X); }),
  saki_skill: A((c, u) => { for (const t of c.mates(u)) atkUp(c, u, t, 2200, 'saki_skill'); c.hit(u, c.pick(u), 1.45, S); }),
  saki_ult: A((c, u) => { const ts = c.firstN(u, 2); c.hit(u, ts, c.v(u, [2.1, 2.45, 2.95]), X); for (const t of ts) stun(c, u, t, 'saki_ult'); }),
  saki_rear_reg: A((c, u) => { for (const t of c.mates(u)) atkUp(c, u, t, c.v(u, [2000, 2500, 3200]), 'saki_rear_reg'); c.hit(u, c.pick(u), 1.0, R); }),
  shigure_skill: A((c, u) => { c.hit(u, c.pick(u), 1.6, S); c.heal(u, u, u.maxHp * 0.1); }),
  shigure_ult: A((c, u) => { c.hit(u, c.pick(u), c.v(u, [3.0, 3.45, 4.2]), X, { bonus: u.turn >= 5 ? 4000 : 0 }); }),
  shizuko_rear_reg: A((c, u) => { for (const t of c.mates(u)) { c.shield(u, t, c.atk(u) * c.v(u, [1.1, 1.3, 1.6]), 2, 'shizuko_rear_reg'); critUp(c, u, t, 1200, 'shizuko_rear_reg'); } }),
  toki_skill: A((c, u) => { c.shield(u, u, u.maxHp * 0.2, 2, 'toki_skill'); atkUp(c, u, u, 2500, 'toki_skill'); c.hit(u, c.pick(u), 1.5, S); }),
  toki_ult: A((c, u) => { c.hit(u, c.foes(u), c.v(u, [1.8, 2.1, 2.55]), X); c.hit(u, c.pick(u), 0.8, X, { true: true, aoe: false }); }),
  tomoe_rear_reg: A((c, u) => {
    for (const t of c.mates(u)) c.gainEnergy(t, 15);
    atkUp(c, u, c.mates(u).find((x) => x.unit?.id === 'u_cherino'), c.v(u, [2500, 3000, 4000]), 'tomoe_rear_reg');
    c.fire('tomoe_rear_reg');
  }),
  utaha_rear_reg: A((c, u) => { const t = c.lowestRatio(c.mates(u))[0]; c.shield(u, t, c.atk(u) * c.v(u, [1.4, 1.65, 2.0]), 2, 'utaha_rear_reg'); guard(c, u, t, 1000, 'utaha_rear_reg'); }),
  yuzu_rear_reg: A((c, u) => {
    const b = u.d.locker ? 5000 : 0; u.d.locker = false;
    for (let i = 0; i < 3; i++) c.hit(u, c.randomOf(c.foes(u)), c.v(u, [0.7, 0.8, 1.0]), R, { bonus: b });
  }),

  // ── 4코 ──
  akemi_skill: A((c, u) => { c.hit(u, c.firstN(u, 2), 1.6, S); c.cleanse(u, 1); atkUp(c, u, u, 2500, 'akemi_skill'); }),
  akemi_ult: A((c, u) => { c.hit(u, c.foes(u), c.v(u, [2.15, 2.5, 3.05]), X); c.shield(u, u, u.maxHp * 0.25, 2, 'akemi_ult'); }),
  ako_rear_reg: A((c, u) => {
    critUp(c, u, c.highestAtk(c.mates(u)), c.v(u, [2500, 3200, 4200]), 'ako_rear_reg', 2, c.v(u, [4500, 6000, 8500]));
    c.heal(u, c.lowestRatio(c.mates(u))[0], c.atk(u) * c.v(u, [1.2, 1.45, 1.8]));
  }),
  aru_skill: A((c, u) => { critUp(c, u, u, 1500, 'aru_skill', 2, 3000); c.hit(u, c.pick(u), 1.6, S); }),
  aru_ult: A((c, u) => {
    const m = c.g.aruUlt?.(u) ?? 1;
    c.hit(u, c.pick(u), c.v(u, [2.2, 2.55, 3.1]), X, { mul: m, aoe: false });
    c.hit(u, c.foes(u), c.v(u, [1.5, 1.75, 2.15]), X, { mul: m });
  }),
  cherino_skill: A((c, u) => { const t = c.highestHp(c.foes(u)); vuln(c, u, t, 2500, 'cherino_skill'); c.hit(u, t, 1.6, S); }),
  cherino_ult: A((c, u) => { c.hit(u, c.foes(u), c.v(u, [2.1, 2.45, 3.0]), X); }),
  haruna_skill: A((c, u) => { const t = c.highestHp(c.foes(u)); c.hit(u, t, 1.8, S, { bonus: t && c.hpRatio(t) <= 0.5 ? 3000 : 0 }); }),
  haruna_ult: A((c, u) => {
    const r = c.hit(u, c.highestHp(c.foes(u)), c.v(u, [3.4, 3.95, 4.8]), X);
    if (r.some((x) => x.killed)) follow(c, u, c.foes(u), 1.0, 'haruna_ult');
  }),
  hoshino_skill: A((c, u) => { const t = c.pick(u); c.hit(u, t, 1.4, S); tauntFoe(c, u, t, 'hoshino_skill', 1); c.shield(u, u, u.maxHp * 0.2, 2, 'hoshino_skill'); }),
  hoshino_ult: A((c, u) => {
    const ts = c.foes(u);
    c.hit(u, ts, c.v(u, [1.85, 2.15, 2.65]), X);
    for (const t of ts) if (c.rng.chance(6000)) stun(c, u, t, 'hoshino_ult');
    c.shield(u, u, u.maxHp * c.v(u, [0.25, 0.3, 0.38]), 2, 'hoshino_ult');
  }),
  kanna_skill: A((c, u) => { const t = c.pick(u); c.hit(u, t, 1.65, S); defDown(c, u, t, 2500, 'kanna_skill'); vuln(c, u, t, 1500, 'kanna_skill'); }),
  kanna_ult: A((c, u) => { c.hit(u, c.pick(u), c.v(u, [3.1, 3.6, 4.4]), X); for (const t of c.mates(u)) atkUp(c, u, t, 2500, 'kanna_ult'); }),
  mine_skill: A((c, u) => { taunt(c, u, 'mine_skill', 2); c.shield(u, u, u.maxHp * 0.2, 2, 'mine_skill'); }, anyOf(needBuff('mine_skill', 'self'), needShield('self'))),
  mine_ult: A((c, u) => { for (const t of c.mates(u)) c.heal(u, t, t.maxHp * c.v(u, [0.15, 0.18, 0.22])); c.hit(u, c.pick(u), 2.0, X); }),
  miyako_skill: A((c, u) => { const t = c.highestAtk(c.foes(u)); c.hit(u, t, 1.5, S); stun(c, u, t, 'miyako_skill'); guard(c, u, u, 2000, 'miyako_skill'); }),
  miyako_ult: A((c, u) => {
    const ts = c.firstN(u, 2);
    c.hit(u, ts, c.v(u, [2.2, 2.55, 3.1]), X);
    stun(c, u, ts.find((t) => t.alive), 'miyako_ult');
    for (const t of c.mates(u)) c.shield(u, t, t.maxHp * 0.2, 2, 'miyako_ult');
  }),
  miyu_skill: A((c, u) => { const t = c.pick(u); c.hit(u, t, 1.75, S); vuln(c, u, t, 2500, 'miyu_skill'); }),
  miyu_ult: A((c, u) => { c.hit(u, c.highestHp(c.foes(u)), c.v(u, [3.3, 3.85, 4.65]), X); }),
  miyu_rear_reg: A((c, u) => { const t = c.pick(u); c.hit(u, t, 1.4, R); vuln(c, u, t, 2000, 'miyu_rear_reg'); }),
  neru_skill: A((c, u) => { c.hit(u, c.pick(u), 1.7, S); buff(c, u, u, 'st_rage_neru', { atkPct: 3000, dmgRed: 2000 }, 'neru_skill'); }),
  neru_ult: A((c, u) => { c.hit(u, c.pick(u), c.v(u, [3.4, 3.95, 4.8]), X, { bonus: c.hasSt(u, 'st_rage_neru') ? 2000 : 0 }); }),
  niya_rear_reg: A((c, u) => {
    // 음양부: 셋 중 하나를 고른다(가장 쓸모 있는 것: 적이 강하면 흉, 에너지가 모자라면 길, 아니면 대길)
    let pickIdx = c.rng.nextInt(3);
    if (c.tier('syn_yinyang') !== undefined) {
      const avgEnergy = c.mates(u).reduce((a, x) => a + x.energy, 0) / Math.max(1, c.mates(u).length);
      pickIdx = avgEnergy < 50 ? 1 : 0;
      c.proc('synergy', 'syn_yinyang', '점괘 선택');
    }
    if (pickIdx === 0) for (const t of c.mates(u)) atkUp(c, u, t, c.v(u, [3000, 3600, 4500]), 'niya_rear_reg');
    else if (pickIdx === 1) for (const t of c.mates(u)) c.gainEnergy(t, 25);
    else for (const t of c.foes(u)) atkDown(c, u, t, 2000, 'niya_rear_reg');
    c.fire('niya_rear_reg');
  }),
  noa_rear_reg: A((c, u) => { for (const t of c.mates(u)) atkUp(c, u, t, c.v(u, [2000, 2600, 3500]), 'noa_rear_reg'); }),
  tsurugi_skill: A((c, u) => { const t = c.pick(u); c.hit(u, t, 1.0, S); c.hit(u, t?.alive ? t : c.pick(u), 1.0, S); taunt(c, u, 'tsurugi_skill', 1); }),
  tsurugi_ult: A((c, u) => { c.hit(u, c.pick(u), c.v(u, [3.6, 4.15, 5.05]), X, { bonus: c.hpRatio(u) <= 0.5 ? 3000 : 0 }); }),

  // ── 5코 ──
  akira_skill: A((c, u) => { const t = c.highestAtk(c.foes(u)); c.hit(u, t, 1.75, S); atkDown(c, u, t, 2500, 'akira_skill'); atkUp(c, u, u, 2500, 'akira_skill'); }),
  akira_ult: A((c, u) => { const ts = c.foes(u); c.hit(u, ts, c.v(u, [2.45, 2.85, 3.5]), X); for (const t of ts) { silence(c, u, t, 'akira_ult'); defDown(c, u, t, 2500, 'akira_ult'); } }),
  al1s_skill: A((c, u) => { const ts = c.foes(u); c.hit(u, ts, 1.7, S); for (const t of ts) spdDown(c, u, t, 15, 'al1s_skill'); c.gainEnergy(u, 25); }),
  al1s_ult: A((c, u) => { const r = c.hit(u, c.foes(u), c.v(u, [2.0, 2.4, 2.9]), X, { true: true }); c.gainEnergy(u, Math.min(20, 10 * r.filter((x) => x.killed).length)); }),
  al1s_rear_reg: A((c, u) => { c.hit(u, c.foes(u), 1.4, R, { true: true }); const t = c.sortBy(c.mates(u), (x) => x.energy)[0]; if (t) c.gainEnergy(t, 15); }),
  hikari_skill: A((c, u) => { for (const t of c.mates(u)) { dmgUp(c, u, t, { dmgUp: 2800 }, 'hikari_skill'); critUp(c, u, t, 0, 'hikari_skill', 2, 3500); } c.hit(u, c.pick(u), 1.55, S); }),
  hikari_ult: A((c, u) => { c.hit(u, c.foes(u), c.v(u, [2.4, 2.8, 3.45]), X); for (const t of c.mates(u)) c.advance(t, 0.25); }),
  key_rear_reg: A((c, u) => keyHack(c, u, R, 'key_rear_reg')),
  aris_armed_skill: A((c, u) => { const ts = c.foes(u); c.hit(u, ts, 1.6, S); for (const t of ts) defDown(c, u, t, 1500, 'aris_armed_skill'); c.gainEnergy(u, 25); }),
  aris_armed_ult: A((c, u) => {
    const r = c.hit(u, c.foes(u), c.v(u, [2.1, 2.5, 3.0]), X, { true: withKey(c, u) });
    c.gainEnergy(u, Math.min(20, 10 * r.filter((x) => x.killed).length));
  }),
  aris_armed_rear_reg: A((c, u) => { c.hit(u, c.foes(u), 1.5, R); const t = c.sortBy(c.mates(u), (x) => x.energy)[0]; if (t) c.gainEnergy(t, 15); }),
  himari_rear_reg: A((c, u) => {
    const t = c.g.himariTarget?.alive ? c.g.himariTarget : c.highestAtk(c.mates(u));
    atkUp(c, u, t, c.v(u, [4500, 6000, 8500]), 'himari_rear_reg');
    if (t) c.gainEnergy(t, c.v(u, [25, 30, 40]));
    c.gainSp(u.side, 1);
  }),
  hina_skill: A((c, u) => { c.hit(u, c.foes(u), 1.55, S); }),
  hina_ult: A((c, u) => { c.hit(u, c.foes(u), c.v(u, [2.6, 3.05, 3.8]), X); atkUp(c, u, u, 3000, 'hina_ult', 3); }),
  hoshino_armed_skill: A((c, u) => { c.shield(u, u, u.maxHp * 0.25, 2, 'hoshino_armed_skill'); atkUp(c, u, u, 3000, 'hoshino_armed_skill'); c.hit(u, c.firstN(u, 2), 1.75, S); }),
  hoshino_armed_ult: A((c, u) => { c.hit(u, c.foes(u), c.v(u, [2.7, 3.15, 3.9]), X); c.hit(u, c.pick(u), 1.3, X, { true: true, aoe: false }); }),
  kisaki_skill: A((c, u) => { for (const t of c.mates(u)) dmgUp(c, u, t, { ultDmg: 3500 }, 'kisaki_skill'); }, needBuff('kisaki_skill', 'mates')),
  kisaki_ult: A((c, u) => { for (const t of c.mates(u)) c.gainEnergy(t, 30); c.hit(u, c.foes(u), c.v(u, [2.2, 2.6, 3.2]), X); }),
  kisaki_rear_reg: A((c, u) => { for (const t of c.mates(u)) { dmgUp(c, u, t, { skillDmg: c.v(u, [3000, 3800, 5000]), ultDmg: c.v(u, [3000, 3800, 5000]) }, 'kisaki_rear_reg'); c.shield(u, t, c.atk(u) * 1.1, 2, 'kisaki_rear_reg'); } }),
  mika_skill: A((c, u) => { c.hit(u, c.pick(u), 1.9, S); c.shield(u, u, u.maxHp * c.v(u, [0.2, 0.25, 0.32]), 2, 'mika_skill'); }),
  mika_ult: A((c, u) => { c.hit(u, c.highestHp(c.foes(u)), c.v(u, [4.2, 4.9, 6.0]), X); }),
  nagisa_rear_reg: A((c, u) => { for (const t of c.mates(u)) { atkUp(c, u, t, c.v(u, [3000, 3800, 5000]), 'nagisa_rear_reg'); guard(c, u, t, 1000, 'nagisa_rear_reg'); c.gainEnergy(t, 20); } }),
  rio_rear_reg: A((c, u) => {
    for (const t of c.mates(u)) c.shield(u, t, c.atk(u) * c.v(u, [1.35, 1.6, 2.0]), 2, 'rio_rear_reg');
    const ts = c.foes(u);
    c.hit(u, ts, 1.1, R);
    for (const t of ts) defDown(c, u, t, 2500, 'rio_rear_reg');
  }),
  saori_skill: A((c, u) => { c.hit(u, c.pick(u), 1.85, S); c.apply(u, u, 'st_next_crit', { turns: 1, fx: 'saori_skill', key: `${u.uid}:next_crit` }); }),
  saori_ult: A((c, u) => { c.hit(u, c.pick(u), c.v(u, [3.5, 4.1, 5.0]), X, { true: true }); }),
  seia_rear_reg: A((c, u) => {
    const t = c.sortBy(c.foes(u), (x) => x.energy)[0];
    c.hit(u, t, c.v(u, [1.6, 1.9, 2.4]), R);
    silence(c, u, t, 'seia_rear_reg', 2);
    atkDown(c, u, t, c.v(u, [2000, 2500, 3000]), 'seia_rear_reg');
  }),
  wakamo_skill: A((c, u) => { const t = c.pick(u); c.hit(u, t, 1.75, S); vuln(c, u, t, 2000, 'wakamo_skill'); }),
  wakamo_ult: A((c, u) => { const t = c.highestHp(c.foes(u)); u.d.ultTarget = t; c.hit(u, t, c.v(u, [3.2, 3.75, 4.6]), X); }),
};

// ── 패시브·후방 반응 ─────────────────────────────────────
/** 아군 전방 한 명이 피격됐는가(후방 반응 공통 조건) */
const allyFrontHit = (u: U, e: Ev) => !!e.tgt && e.tgt.side === u.side && e.tgt.zone === 'front' && e.tgt.alive;
/** 케이가 같은 편으로 출전해 있는가(무장 아리스 V.221·V.226) */
export const withKey = (c: Battle, u: U) => c.units.some((x) => x.side === u.side && x.unit?.id === 'u_key');
const allyFrontAct = (u: U, e: Ev) => !!e.src && e.src.side === u.side && e.src.zone === 'front' && e.src.hasHp;

export const passives: Record<string, Passive> = {
  asuna_passive: (c, u) => c.mod(u, { crit: 1500 }, 'asuna_passive'),
  fubuki_passive: (c, u) => c.on('damage_dealt', (e) => {
    if (e.src === u && e.kind === 'basic' && e.tgt?.alive && c.once(u, 'fubuki_passive')) defDown(c, u, e.tgt, 1500, 'fubuki_passive');
  }, u),
  haruka_passive: (c, u) => c.on('damage_received', (e) => {
    if (e.tgt !== u || !c.once(u, 'haruka_passive')) return;
    u.d.harukaStacks = Math.min(3, (u.d.harukaStacks ?? 0) + 1);
    buff(c, u, u, 'st_def_up', { defPct: 800, stacks: u.d.harukaStacks }, 'haruka_passive');
  }, u),
  junko_passive: (c, u) => c.on('turn_start', (e) => { if (e.src === u && c.hpRatio(u) <= 0.6) atkUp(c, u, u, 2500, 'junko_passive', 1); }, u),
  michiru_passive: (c, u) => {
    const gain = () => { if (c.once(u, 'michiru_passive')) { c.gainEnergy(u, 8); c.fire('michiru_passive'); } };
    c.on('status_applied', (e) => { if (e.src === u && e.statusId === 'st_burn') gain(); }, u);
    c.on('damage_dealt', (e) => { if (e.src === u && e.direct && e.tgt && c.hasSt(e.tgt, 'st_burn')) gain(); }, u);
  },
  rabu_passive: (c, u) => c.on('damage_received', (e) => {
    if (u.zone === 'front' && allyFrontHit(u, e) && c.once(u, 'rabu_passive', 2)) { c.gainEnergy(u, 6); c.fire('rabu_passive'); }
  }, u),
  serika_passive: (c, u) => { c.mod(u, { atkPct: Math.min(3000, 200 * (c.g.serikaWins ?? 0)) }, 'serika_passive'); },
  serina_rear_react: (c, u) => c.on('damage_received', (e) => {
    if (!allyFrontHit(u, e) || c.hpRatio(e.tgt!) > 0.4) return;
    react(c, u, 'serina_rear_react', 2, 1, () => { c.heal(u, e.tgt, c.atk(u) * c.v(u, [1.4, 1.6, 1.9]) + c.v(u, [60, 100, 180])); });
  }, u),

  aris_passive: (c, u) => c.on('turn_start', (e) => {
    if (e.src !== u || u.zone !== 'front') return;
    u.d.charge = Math.min(3, (u.d.charge ?? 0) + 1);
    buff(c, u, u, 'st_charge_aris', { dmgUp: 1200, stacks: u.d.charge }, 'aris_passive', 999, `${u.uid}:charge`);
  }, u),
  ayane_rear_react: (c, u) => c.on('healed', (e) => {
    if (!allyFrontHit(u, e)) return;
    react(c, u, 'ayane_rear_react', 0, 2, () => { c.shield(u, e.tgt, c.atk(u) * c.v(u, [0.55, 0.65, 0.85]), 2, 'ayane_rear_react'); });
  }, u),
  chinatsu_rear_react: (c, u) => c.on('status_applied', (e) => {
    if (!e.tgt || e.tgt.side !== u.side || e.converted || (e.statusId !== 'st_stun' && e.statusId !== 'st_silence')) return;
    react(c, u, 'chinatsu_rear_react', 2, 1, () => c.cleanse(e.tgt, 1, ['st_stun', 'st_silence']) > 0);
  }, u),
  fuuka_rear_react: (c, u) => c.on('damage_received', (e) => {
    if (!allyFrontHit(u, e)) return;
    react(c, u, 'fuuka_rear_react', 2, 1, () => { for (const t of c.lowestRatio(c.mates(u), 2)) c.heal(u, t, c.atk(u) * c.v(u, [1.0, 1.2, 1.5])); });
  }, u),
  hare_rear_react: (c, u) => c.on('damage_received', (e) => {
    if (!allyFrontHit(u, e) || !e.src || e.src.side === u.side) return;
    react(c, u, 'hare_rear_react', 2, 1, () => c.delay(e.src!, c.v(u, [0.2, 0.25, 0.35]), u));
  }, u),
  hasumi_passive: (c, u) => c.on('unit_defeated', (e) => {
    if (e.tgt?.side === u.side || !c.once(u, 'hasumi_passive')) return;
    c.gainEnergy(u, 25);
    critUp(c, u, u, 0, 'hasumi_passive', 2, c.v(u, [3500, 4500, 6000]));
  }, u),
  karin_rear_react: (c, u) => c.on('ultimate_resolved', (e) => {
    if (!allyFrontAct(u, e)) return;
    react(c, u, 'karin_rear_react', 1, 1, () => follow(c, u, c.pick(u), c.v(u, [1.15, 1.35, 1.65]), 'karin_rear_react', { crit: false }) > 0);
  }, u),
  kirino_passive: (c, u) => c.on('damage_received', (e) => {
    if (e.tgt !== u || !c.once(u, 'kirino_passive')) return;
    if (!c.rng.chance(5000)) return;
    if (e.src && e.src.hasHp && e.src.zone === 'front') c.gainEnergy(e.src, -10);
    c.gainEnergy(u, 10);
    c.fire('kirino_passive');
  }, u),
  momiji_passive: (c, u) => c.on('turn_start', (e) => { if (e.src === u) dmgUp(c, u, u, { skillDmg: 1800, ultDmg: 1800 }, 'momiji_passive', 1); }, u),
  momoi_rear_react: (c, u) => c.on('skill_resolved', (e) => {
    if (u.zone !== 'rear' || !allyFrontAct(u, e)) return;
    react(c, u, 'momoi_rear_react', 0, 1, () => follow(c, u, c.pick(u), 0.95, 'momoi_rear_react') > 0);
  }, u),
  nozomi_passive: (c, u) => c.on('basic_resolved', (e) => {
    if (e.src !== u || !c.once(u, 'nozomi_passive')) return;
    if (c.rng.chance(5000)) follow(c, u, c.pick(u), 0.8, 'nozomi_passive');
  }, u),
  shiroko_passive: (c, u) => c.on('ultimate_resolved', (e) => {
    if (!e.src || e.src === u || !allyFrontAct(u, e) || !c.once(u, 'shiroko_passive')) return;
    follow(c, u, c.lowestHp(c.foes(u)), c.v(u, [1.1, 1.3, 1.6]), 'shiroko_passive');
  }, u),
  shun_passive: (c, u) => c.on('battle_start', () => { c.gainEnergy(u, 35); c.fire('shun_passive'); }, u),
  tsubaki_passive: (c, u) => c.on('damage_received', (e) => {
    if (e.tgt !== u || c.hpRatio(u) > 0.35 || !c.battleOnce(u, 'tsubaki_passive')) return;
    c.heal(u, u, u.maxHp * c.v(u, [0.35, 0.42, 0.52]), 'tsubaki_passive');
  }, u),
  yuuka_passive: (c, u) => c.on('shield_applied', (e) => {
    if (e.tgt === u && c.once(u, 'yuuka_passive', 2)) defUp(c, u, u, 1500, 'yuuka_passive');
  }, u),

  atsuko_passive: (c, u) => c.on('damage_received', (e) => {
    if (e.tgt === u && c.once(u, 'atsuko_passive', 2)) c.heal(u, c.lowestRatio(c.mates(u))[0], u.maxHp * 0.08, 'atsuko_passive');
  }, u),
  azusa_passive: (c, u) => c.on('damage_dealt', (e) => {
    if (e.src !== u || !e.direct || !e.tgt?.alive || !c.hasDebuff(e.tgt) || !c.once(u, 'azusa_passive')) return;
    follow(c, u, e.tgt, c.v(u, [0.85, 1.05, 1.35]), 'azusa_passive');
  }, u),
  chihiro_rear_react: (c, u) => c.on('ultimate_resolved', (e) => {
    if (!e.src || e.src.side === u.side) return;
    react(c, u, 'chihiro_rear_react', 2, 1, () => { c.gainEnergy(e.src!, -20); });
  }, u),
  eimi_passive: (c, u) => { c.blockers.push((t, id) => t === u && id === 'st_burn'); },
  hiyori_rear_react: (c, u) => c.on('damage_dealt', (e) => {
    if (!e.direct || !allyFrontAct(u, e) || !e.tgt?.alive || !c.hasSt(e.tgt, 'st_def_down')) return;
    react(c, u, 'hiyori_rear_react', 0, 1, () => follow(c, u, e.tgt, 0.95, 'hiyori_rear_react') > 0);
  }, u),
  iori_passive: (c, u) => {
    const f = (e: Ev) => { if (e.src === u && c.once(u, 'iori_passive')) follow(c, u, c.pick(u), c.v(u, [0.9, 1.1, 1.35]), 'iori_passive', { true: true }); };
    c.on('skill_resolved', f, u); c.on('ultimate_resolved', f, u);
  },
  izuna_passive: (c, u) => {
    const f = (e: Ev) => { if (e.src === u && c.once(u, 'izuna_passive')) follow(c, u, c.pick(u), c.v(u, [0.95, 1.15, 1.4]), 'izuna_passive'); };
    c.on('basic_resolved', f, u); c.on('skill_resolved', f, u);
  },
  kasumi_rear_react: (c, u) => c.on('unit_defeated', (e) => {
    if (e.tgt?.side === u.side) return;
    react(c, u, 'kasumi_rear_react', 2, 1, () => { u.d.kasumi = Math.min(2, (u.d.kasumi ?? 0) + 1); });
  }, u),
  koharu_rear_react: (c, u) => c.on('damage_received', (e) => {
    if (u.zone !== 'rear' || !allyFrontHit(u, e) || c.hpRatio(e.tgt!) > 0.5) return;
    react(c, u, 'koharu_rear_react', 2, 1, () => { c.heal(u, e.tgt, c.atk(u) * c.v(u, [1.5, 1.75, 2.1])); });
  }, u),
  marina_passive: (c, u) => c.on('damage_received', (e) => {
    if (e.tgt !== u || c.hpRatio(u) > 0.3 || !c.battleOnce(u, 'marina_passive')) return;
    guard(c, u, u, 5000, 'marina_passive');
    c.heal(u, u, u.maxHp * c.v(u, [0.35, 0.42, 0.5]), 'marina_passive');
  }, u),
  mina_passive: (c, u) => c.on('status_applied', (e) => {
    if (e.src !== u || !e.tgt || e.tgt.side === u.side || !c.once(u, 'mina_passive')) return;
    c.gainEnergy(u, 12);
    spdUp(c, u, u, 12, 'mina_passive', 1);
  }, u),
  misaki_rear_react: (c, u) => c.on('unit_defeated', (e) => {
    if (e.tgt?.side !== u.side) return;
    react(c, u, 'misaki_rear_react', 2, 1, () => { u.d.misaki = true; });
  }, u),
  moe_rear_react: (c, u) => c.on('ultimate_resolved', (e) => {
    if (!allyFrontAct(u, e)) return;
    react(c, u, 'moe_rear_react', 2, 1, () => follow(c, u, c.foes(u), c.v(u, [1.05, 1.25, 1.55]), 'moe_rear_react') > 0);
  }, u),
  mutsuki_rear_react: (c, u) => c.on('damage_dealt', (e) => {
    if (u.zone !== 'rear' || !e.direct || !allyFrontAct(u, e)) return;
    react(c, u, 'mutsuki_rear_react', 0, 1, () => follow(c, u, c.pick(u), c.v(u, [1.15, 1.35, 1.7]), 'mutsuki_rear_react') > 0);
  }, u),
  nonomi_passive: (c, u) => c.on('turn_start', (e) => { if (e.src === u) { critUp(c, u, u, 1000, 'nonomi_passive', 1); dmgUp(c, u, u, { dmgUp: 1500 }, 'nonomi_passive', 1); } }, u),
  saki_rear_react: (c, u) => c.on('skill_resolved', (e) => {
    if (u.zone !== 'rear' || !allyFrontAct(u, e)) return;
    react(c, u, 'saki_rear_react', 0, 1, () => { c.gainEnergy(e.src!, 12); });
  }, u),
  shizuko_rear_react: (c, u) => c.on('damage_received', (e) => {
    if (!allyFrontHit(u, e)) return;
    react(c, u, 'shizuko_rear_react', 2, 1, () => c.shield(u, e.tgt, c.atk(u) * c.v(u, [1.3, 1.55, 1.9]), 2, 'shizuko_rear_react') > 0);
  }, u),
  toki_passive: (c, u) => {
    c.mod(u, { dmgUp: 2000 }, 'toki_passive', () => c.shieldOf(u) > 0);
    c.on('turn_end', (e) => { if (e.src === u && c.shieldOf(u) > 0) c.gainEnergy(u, 10); }, u);
  },
  tomoe_rear_react: (c, u) => { for (const t of c.units.filter((x) => x.side === u.side && x.zone === 'front')) c.mod(t, { atkPct: 1000 }, 'tomoe_rear_react', () => u.alive && c.sp[u.side] >= c.spMax[u.side]); },
  yuzu_rear_react: (c, u) => c.on('battle_start', () => { u.d.locker = true; c.fire('yuzu_rear_react'); }, u),

  akemi_passive: (c, u) => {
    c.mod(u, { dmgUp: 2000 }, 'akemi_passive', () => c.hpRatio(u) >= 0.5);
    c.mod(u, { dmgRed: 2500 }, 'akemi_passive', () => c.hpRatio(u) < 0.5);
    c.on('turn_start', (e) => { if (e.src === u && c.hpRatio(u) < 0.5) c.gainEnergy(u, 15); }, u);
  },
  ako_rear_react: (c, u) => c.on('ultimate_resolved', (e) => {
    if (!allyFrontAct(u, e)) return;
    react(c, u, 'ako_rear_react', 1, 1, () => { c.gainEnergy(e.src!, 15); c.advance(e.src!, 0.25); });
  }, u),
  aru_passive: (c, u) => c.on('unit_defeated', (e) => {
    if (e.tgt?.side !== u.side && c.once(u, 'aru_passive')) { c.gainEnergy(u, 30); c.fire('aru_passive'); }
  }, u),
  cherino_passive: (c, u) => c.on('turn_start', (e) => {
    if (e.src !== u || u.turn % 2 !== 0) return;
    c.gainSp(u.side, 1);
    for (const t of c.mates(u)) c.gainEnergy(t, 10);
    c.fire('cherino_passive');
  }, u),
  haruna_passive: (c, u) => {
    c.on('battle_start', () => { u.d.gourmetTarget = c.highestHp(c.foes(u)); }, u);
    c.on('unit_defeated', (e) => { if (e.tgt && e.tgt === u.d.gourmetTarget) { c.gainEnergy(u, 40); c.fire('haruna_passive'); } }, u);
  },
  hoshino_passive: (c, u) => c.on('damage_received', (e) => {
    if (e.tgt !== u || c.hpRatio(u) > 0.4 || !c.battleOnce(u, 'hoshino_passive')) return;
    c.heal(u, u, u.maxHp * c.v(u, [0.4, 0.48, 0.6]), 'hoshino_passive');
    defUp(c, u, u, 3000, 'hoshino_passive');
  }, u),
  kanna_passive: (c, u) => c.on('damage_dealt', (e) => {
    if (e.kind !== 'skill' || !e.src || e.src === u || !allyFrontAct(u, e) || !e.tgt?.alive || !c.once(u, 'kanna_passive')) return;
    follow(c, u, e.tgt, c.v(u, [1.15, 1.35, 1.65]), 'kanna_passive');
  }, u),
  mine_passive: (c, u) => c.on('healed', (e) => {
    if (e.tgt?.side !== u.side || !c.once(u, 'mine_passive')) return;
    u.d.mine = Math.min(3, (u.d.mine ?? 0) + 1);
    buff(c, u, u, 'st_def_up', { defPct: 1000, stacks: u.d.mine }, 'mine_passive', 999, `${u.uid}:mine`);
  }, u),
  miyako_passive: (c, u) => c.on('damage_dealt', (e) => {
    if (!e.direct || !e.src || e.src.side !== u.side || !e.tgt?.alive) return;
    if (!c.hasSt(e.tgt, 'st_stun') && !c.hasSt(e.tgt, 'st_delayed')) return;
    if (!c.once(u, 'miyako_passive')) return;
    c.gainEnergy(u, 10);
    defDown(c, u, e.tgt, 2000, 'miyako_passive');
  }, u),
  miyu_rear_react: (c, u) => c.on('damage_dealt', (e) => {
    if (!e.direct || !e.src || e.src.side !== u.side || !e.tgt?.alive || !c.hasSt(e.tgt, 'st_vuln')) return;
    react(c, u, 'miyu_rear_react', 0, 1, () => follow(c, u, e.tgt, c.v(u, [0.95, 1.15, 1.45]), 'miyu_rear_react', { true: true }) > 0);
  }, u),
  neru_passive: (c, u) => c.on('damage_received', (e) => {
    if (e.tgt !== u || !c.once(u, 'neru_passive')) return;
    follow(c, u, c.pick(u), c.v(u, [1.2, 1.45, 1.8]), 'neru_passive');
    c.gainEnergy(u, 10);
  }, u),
  niya_rear_react: (c, u) => c.on('turn_start', (e) => {
    if (e.src !== u || u.turn % 3 !== 0) return;
    react(c, u, 'niya_rear_react', 0, 1, () => { c.gainSp(u.side, 1); });
  }, u),
  noa_rear_react: (c, u) => {
    c.hook((h) => {
      if (h.src.side !== u.side || !DIRECTK.has(h.kind) || !u.alive) return;
      const key = `noa:${h.src.uid}:${h.tgt.uid}`;
      const n = (h.src.lim.get(key) ?? 0) + 1;
      h.src.lim.set(key, n);
      if (n === 2 && c.ready(u, 'noa_rear_react')) { h.out += 2000; c.cool(u, 'noa_rear_react', 2); c.fire('noa_rear_react'); }
    });
  },
  tsurugi_passive: (c, u) => c.on('damage_received', (e) => {
    if (e.tgt !== u) return;
    u.d.tsurugi = Math.min(6, (u.d.tsurugi ?? 0) + 1);
    buff(c, u, u, 'st_atk_up', { atkPct: 500, stacks: u.d.tsurugi }, 'tsurugi_passive', 999, `${u.uid}:tsurugi`);
  }, u),

  akira_passive: (c, u) => {
    const f = (e: Ev) => { if (e.src === u && c.once(u, 'akira_passive')) follow(c, u, c.lowestHp(c.foes(u)), c.v(u, [1.1, 1.3, 1.6]), 'akira_passive', { true: true }); };
    c.on('basic_resolved', f, u); c.on('skill_resolved', f, u);
  },
  akira_aura: (c, u) => c.on('battle_start', () => {
    const t = c.foes(u).find((x) => x.st.some((s) => !s.debuff));
    const stolen = c.dispel(t, 1)[0];
    const to = c.highestAtk(c.mates(u));
    if (stolen && to) { c.setStatus(u, to, stolen.id, { turns: stolen.turns, key: `${u.uid}:akira_aura`, debuff: false, params: stolen.params }, true); c.fire('akira_aura'); }
    else if (to) { atkUp(c, u, to, 1500, 'akira_aura'); }
  }, u),
  al1s_passive: (c, u) => c.on('turn_start', (e) => {
    if (e.src !== u || u.zone !== 'front') return;
    u.d.charge = Math.min(3, (u.d.charge ?? 0) + 1);
    buff(c, u, u, 'st_charge_aris', { dmgUp: 1200, stacks: u.d.charge }, 'al1s_passive', 999, `${u.uid}:charge`);
    if (u.d.charge === 3 && c.battleOnce(u, 'al1s_charge')) c.gainEnergy(u, 30);
  }, u),
  al1s_aura: (c, u) => {
    if (c.g.al1sAura) return;
    c.g.al1sAura = true;
    for (const t of c.units.filter((x) => x.side !== u.side)) c.mod(t, { dmgTaken: 800 }, 'al1s_aura');
    for (const t of c.units.filter((x) => x.side === u.side && x.tags.has('syn_game_dev'))) c.mod(t, { spd: 10 }, 'al1s_aura');
    c.fire('al1s_aura');
  },
  key_aura: (c, u) => {
    if (!c.g.keyAura) {
      c.g.keyAura = true;
      for (const t of c.units.filter((x) => x.side !== u.side)) c.mod(t, { spd: -10 }, 'key_aura');
      c.fire('key_aura');
    }
    c.on('battle_start', () => {
      for (const t of c.units.filter((x) => x.side === u.side && x !== u && x.hasHp && x.tags.has('syn_millennium'))) c.gainEnergy(t, 15);
    }, u);
  },
  key_rear_react: (c, u) => c.on('ultimate_resolved', (e) => {
    if (!e.src || e.src.side === u.side || !e.src.alive || !c.battleOnce(u, 'key_rear_react', 2)) return;
    c.gainEnergy(e.src, -30);
    c.delay(e.src, 0.3, u);
    c.fire('key_rear_react');
  }, u),
  aris_armed_passive: (c, u) => c.on('turn_start', (e) => {
    if (e.src !== u || u.zone !== 'front') return;
    u.d.charge = Math.min(3, (u.d.charge ?? 0) + 1);
    buff(c, u, u, 'st_charge_aris', { dmgUp: 1000, stacks: u.d.charge }, 'aris_armed_passive', 999, `${u.uid}:charge`);
    if (u.d.charge === 3 && c.battleOnce(u, 'aris_armed_charge')) c.gainEnergy(u, 30);
  }, u),
  aris_armed_aura: (c, u) => {
    if (c.g.arisArmedAura) return;
    c.g.arisArmedAura = true;
    for (const t of c.units.filter((x) => x.side === u.side && x.tags.has('syn_game_dev'))) c.mod(t, { atkPct: 1500 }, 'aris_armed_aura');
    c.mod(u, { dmgRed: 1000 }, 'aris_armed_aura');
    c.fire('aris_armed_aura');
  },
  aris_armed_rear_react: (c, u) => c.on('ultimate_resolved', (e) => {
    if (!allyFrontAct(u, e) || e.src === u || !c.battleOnce(u, 'aris_armed_rear_react', 3)) return;
    c.hit(u, c.lowestHp(c.foes(u)), 1.5, 'reaction', { fx: 'aris_armed_rear_react' });
    if (u.zone === 'rear') c.emit({ type: 'reaction_resolved', src: u, fx: 'aris_armed_rear_react' });
  }, u),
  al1s_rear_react: (c, u) => c.on('unit_defeated', (e) => {
    if (e.tgt?.side !== u.side || e.tgt.zone !== 'front' || !c.battleOnce(u, 'al1s_rear_react', 2)) return;
    c.hit(u, c.foes(u), 1.8, 'reaction', { fx: 'al1s_rear_react' });
    if (u.zone === 'rear') c.emit({ type: 'reaction_resolved', src: u, fx: 'al1s_rear_react' });
  }, u),
  hikari_passive: (c, u) => {
    c.on('battle_start', () => { c.gainSp(u.side, 1); c.fire('hikari_passive'); }, u);
    c.on('turn_end', (e) => {
      if (e.src !== u) return;
      const t = c.sortBy(c.mates(u).filter((x) => x.energy < 100), (x) => x.energy)[0];
      if (t) c.gainEnergy(t, 15);
    }, u);
  },
  himari_rear_react: (c, u) => c.on('skill_resolved', (e) => {
    if (!allyFrontAct(u, e)) return;
    react(c, u, 'himari_rear_react', 1, 1, () => { dmgUp(c, u, e.src!, { dmgUp: c.v(u, [2000, 2800, 4000]) }, 'himari_rear_react'); });
  }, u),
  hina_passive: (c, u) => {
    c.on('battle_start', () => { c.gainEnergy(u, 30); c.fire('hina_passive'); }, u);
    c.on('ultimate_resolved', (e) => { if (e.src === u) follow(c, u, c.pick(u), c.v(u, [1.5, 1.8, 2.3]), 'hina_passive', { true: true }); }, u);
  },
  hina_aura: (c, u) => { for (const t of c.units.filter((x) => x.side !== u.side && x.zone === 'front')) c.mod(t, { defPct: -1000 }, 'hina_aura', () => u.alive); },
  hoshino_armed_passive: (c, u) => {
    for (const t of c.units.filter((x) => isAllyFront(x) && x.side === u.side)) c.mod(t, { dmgRed: 1500 }, 'hoshino_armed_passive', () => u.alive);
    const f = () => { if (c.once(u, 'hoshino_armed_passive')) c.gainEnergy(u, 15); };
    c.on('damage_received', (e) => { if (e.tgt === u) f(); }, u);
    c.on('skill_resolved', (e) => { if (e.src === u) f(); }, u);
  },
  kisaki_rear_react: (c, u) => c.on('ultimate_resolved', (e) => {
    if (!allyFrontAct(u, e)) return;
    react(c, u, 'kisaki_rear_react', 0, 1, () => { c.heal(u, e.src, c.atk(u) * 1.3); c.gainEnergy(e.src!, 15); });
  }, u),
  mika_passive: (c, u) => { c.mod(u, { crit: 3500, dmgRed: 1500 }, 'mika_passive'); },
  mika_aura: (c, u) => { for (const t of c.units.filter((x) => x.side === u.side && x.zone === 'front')) c.mod(t, { crit: 1000 }, 'mika_aura', () => u.alive); },
  nagisa_aura: (c, u) => {
    for (const t of c.units.filter((x) => x.side === u.side && x.zone === 'front')) c.mod(t, { hpPct: 1000 }, 'nagisa_aura');
    c.on('battle_start', () => { c.gainSp(u.side, 1); c.fire('nagisa_aura'); }, u);
  },
  rio_rear_react: (c, u) => c.on('ultimate_resolved', (e) => {
    if (!allyFrontAct(u, e)) return;
    react(c, u, 'rio_rear_react', 1, 1, () => follow(c, u, c.pick(u), c.v(u, [1.65, 1.95, 2.45]), 'rio_rear_react') > 0);
  }, u),
  saori_passive: (c, u) => {
    const f = (e: Ev) => {
      if (e.src !== u || !c.once(u, 'saori_passive')) return;
      for (const t of c.foes(u)) vuln(c, u, t, 1500, 'saori_passive');
      c.gainEnergy(u, 15);
    };
    c.on('skill_resolved', f, u); c.on('ultimate_resolved', f, u);
  },
  seia_aura: (c, u) => c.on('ultimate_declared', (e) => {
    if (!e.src || e.src.side === u.side || !c.battleOnce(u, 'seia_aura', 2)) return;
    for (const t of c.mates(u)) guard(c, u, t, 2500, 'seia_aura', 1, `${u.uid}:seia_aura`);
  }, u),
  wakamo_passive: (c, u) => c.on('ultimate_resolved', (e) => {
    if (e.src !== u) return;
    const t: U | undefined = u.d.ultTarget?.alive ? u.d.ultTarget : c.pick(u);
    follow(c, u, t, c.v(u, [1.8, 2.15, 2.7]), 'wakamo_passive', { true: true });
  }, u),
  wakamo_aura: (c, u) => { for (const t of c.units.filter((x) => x.side !== u.side)) c.mod(t, { spd: -10 }, 'wakamo_aura', () => u.alive); },
};

const DIRECTK = new Set(['basic', 'skill', 'ultimate', 'rear']);

/** 후방 정기 지원 피해를 키우는 오파츠·시너지가 쓰는 표식 */
export const rearHealers = new Set(Object.keys(actives).filter((k) => k.endsWith('_rear_reg')));

// 화상 연쇄용 폭탄 만료(아카네 스킬): 2턴 뒤 폭발
export function registerBombs(c: Battle): void {
  c.expires.push((t, s) => {
    if (s.id !== 'st_bomb') return;
    const by = c.byUid(s.params.by as number);
    if (by && by.alive && t.alive) c.hit(by, t, 1.2, 'followup', { fx: 'akane_skill' });
  });
}

export { hot, taunt };
