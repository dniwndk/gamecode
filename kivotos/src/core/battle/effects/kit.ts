// 효과 handler를 짧게 쓰기 위한 도구. 효과 파일은 이 도구와 Battle의 공개 메서드만 쓴다.
import type { Active, Battle, Ev, HitOpts, Kind, Mods, U } from '../engine';

export type { Active, Battle, Ev, Kind, Mods, U };

export const atkOf = (c: Battle, u: U) => c.atk(u);

/** 버프·디버프 한 줄 */
export function buff(c: Battle, src: U | null, tgt: U | undefined, id: string, params: Mods & Record<string, unknown>, fx: string, turns = 2, key?: string): boolean {
  return c.apply(src, tgt, id, { params, turns, fx, key: key ?? `${src?.uid ?? 'g'}:${fx}:${id}` });
}
export const atkUp = (c: Battle, s: U | null, t: U | undefined, pct: number, fx: string, turns = 2, key?: string) => buff(c, s, t, 'st_atk_up', { atkPct: pct }, fx, turns, key);
export const atkDown = (c: Battle, s: U | null, t: U | undefined, pct: number, fx: string, turns = 2) => buff(c, s, t, 'st_atk_down', { atkPct: -pct }, fx, turns);
export const defUp = (c: Battle, s: U | null, t: U | undefined, pct: number, fx: string, turns = 2, key?: string) => buff(c, s, t, 'st_def_up', { defPct: pct }, fx, turns, key);
export const defDown = (c: Battle, s: U | null, t: U | undefined, pct: number, fx: string, turns = 2) => buff(c, s, t, 'st_def_down', { defPct: -pct }, fx, turns);
export const spdUp = (c: Battle, s: U | null, t: U | undefined, n: number, fx: string, turns = 2) => buff(c, s, t, 'st_spd_up', { spd: n }, fx, turns);
export const spdDown = (c: Battle, s: U | null, t: U | undefined, n: number, fx: string, turns = 2) => buff(c, s, t, 'st_spd_down', { spd: -n }, fx, turns);
export const critUp = (c: Battle, s: U | null, t: U | undefined, crit: number, fx: string, turns = 2, critDmg = 0) => buff(c, s, t, 'st_crit_up', { crit, critDmg }, fx, turns);
export const dmgUp = (c: Battle, s: U | null, t: U | undefined, params: Mods, fx: string, turns = 2, key?: string) => buff(c, s, t, 'st_damage_up', params, fx, turns, key);
export const guard = (c: Battle, s: U | null, t: U | undefined, pct: number, fx: string, turns = 2, key?: string) => buff(c, s, t, 'st_damage_reduction', { dmgRed: pct }, fx, turns, key);
export const vuln = (c: Battle, s: U | null, t: U | undefined, pct: number, fx: string, turns = 2) => buff(c, s, t, 'st_vuln', { dmgTaken: pct }, fx, turns);
export const stun = (c: Battle, s: U | null, t: U | undefined, fx: string, turns = 1) => c.apply(s, t, 'st_stun', { turns, fx });
export const silence = (c: Battle, s: U | null, t: U | undefined, fx: string, turns = 1) => c.apply(s, t, 'st_silence', { turns, fx });
/** 화상: 부여 시점 시전자 ATK × 계수를 틱으로 고정(기본 45%) */
export const burn = (c: Battle, s: U, t: U | undefined, fx: string, turns = 2, coef = 0.45) =>
  c.apply(s, t, 'st_burn', { turns, fx, params: { tick: Math.floor(c.atk(s) * coef) }, key: `${s.uid}:burn` });
export const hot = (c: Battle, s: U, t: U | undefined, amount: number, fx: string, turns = 2) =>
  c.apply(s, t, 'st_hot', { turns, fx, params: { hot: Math.floor(amount) }, key: `${s.uid}:${fx}:hot` });
/** 자기 도발(적의 단일 공격을 끈다) */
export const taunt = (c: Battle, s: U, fx: string, turns = 1) => c.apply(s, s, 'st_taunt', { turns, fx, key: `${s.uid}:taunt` });
/** 적에게 「나를 공격하라」 도발(tauntedBy) */
export const tauntFoe = (c: Battle, s: U, t: U | undefined, fx: string, turns = 1) =>
  c.apply(s, t, 'st_taunted', { turns, fx, params: { by: s.uid }, key: 'taunted' });

/** 별도 root의 후속 공격 묶음(기본 자원 없음, 치명 불가) */
export function follow(c: Battle, u: U, targets: U | (U | undefined)[] | undefined, coef: number, fx: string, o: HitOpts = {}): number {
  const r = c.hit(u, targets, coef, 'followup', { fx, ...o });
  if (r.length) c.emit({ type: 'followup_resolved', src: u, fx });
  return r.reduce((a, x) => a + x.dmg + x.absorbed, 0);
}

/**
 * 후방 반응(10.2): 쿨다운·개인 차례 한도·root당 1회를 지키고, 실제 연산이 있으면 reaction_resolved.
 * body가 false를 돌려주면 대상이 없어 한도를 쓰지 않은 것으로 본다.
 */
export function react(c: Battle, u: U, fx: string, cd: number, perTurn: number, body: () => boolean | void): void {
  if (!u.alive || !c.ready(u, fx)) return;
  if ((u.lim.get(`r:${fx}`) ?? 0) >= perTurn) return;
  if (!c.rootOnce(`${u.uid}:${fx}`)) return;
  const did = body();
  if (did === false) return;
  c.once(u, `r:${fx}`, perTurn);
  c.cool(u, fx, cd);
  c.fire(fx);
  if (u.zone === 'rear') c.emit({ type: 'reaction_resolved', src: u, fx });
}

/** 케이 「신명 문자 해킹」(V.216). 후방 정기 지원과 고유 「왕녀의 열쇠」(V.219)의 추가 발동이 같이 쓴다 */
export function keyHack(c: Battle, u: U, kind: 'rear' | 'reaction', fx: string): void {
  const t = c.highestAtk(c.foes(u));
  if (t) { c.hit(u, t, c.v(u, [1.6, 1.9, 2.4]), kind, { true: true, fx }); if (t.alive) silence(c, u, t, fx); }
  const e = c.sortBy(c.mates(u).filter((x) => x.alive && x.energy < 100), (x) => x.energy)[0];
  if (e) c.gainEnergy(e, 20);
}

/** 10.3 자동 사용 조건 */
export const needHeal = (ratio: number) => (c: Battle, u: U) => c.mates(u).some((x) => c.hpRatio(x) <= ratio);
export const needSelfHeal = (ratio: number) => (c: Battle, u: U) => c.hpRatio(u) <= ratio;
/** 같은 출처 버프가 없거나 남은 기간 < 2인 대상이 있으면 */
export const needBuff = (fx: string, who: 'self' | 'mates') => (c: Battle, u: U) =>
  (who === 'self' ? [u] : c.mates(u)).some((x) => !x.st.some((s) => s.key.startsWith(`${u.uid}:${fx}`) && s.turns >= 2));
export const needShield = (who: 'self' | 'mates') => (c: Battle, u: U) =>
  (who === 'self' ? [u] : c.mates(u)).some((x) => c.shieldOf(x) < x.maxHp * 0.2);
export const anyOf = (...fs: ((c: Battle, u: U) => boolean)[]) => (c: Battle, u: U) => fs.some((f) => f(c, u));

export const A = (run: (c: Battle, u: U) => void, auto?: (c: Battle, u: U) => boolean): Active => ({ run, auto });

/** 이 유닛 자신의 사건인가 */
export const mine = (u: U) => (e: Ev) => e.src === u;
/** 살아 있는 전방(HP 보유) 학생. 진영은 부르는 쪽이 u.side로 거른다(PvP에서는 양쪽 모두 학생) */
export const isAllyFront = (u: U) => u.zone === 'front' && u.hasHp && !!u.unit;
