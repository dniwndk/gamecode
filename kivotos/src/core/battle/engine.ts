// 전투 엔진(GDD v2.1 7~9장, v2.3 13장 격화). 순수·결정적: 같은 입력과 씨앗이면 같은 로그.
// 효과 470개는 effects/ 아래에서 효과 ID별 handler로 등록한다. 이 파일은 시간·자원·피해·상태·반응 규칙만 갖는다.
import { Rng } from '../rng';
import type { BaseStats, ContentPack, EnemyDefinition, UnitDefinition } from '../types/content';
import { escalationDamageBps } from './escalation';
import type { BattleContribution, BattleEvent, BattleInput, BattleOutput, BattleZone, Ref, Side } from './types';

// ── 수치 묶음 ─────────────────────────────────────────────
/** 모든 비율은 bps(1% = 100). spd만 정수 가산 */
export interface ModBag {
  atkPct: number; atkFlat: number; defPct: number; spd: number; crit: number; critDmg: number; hpPct: number;
  /** 가하는 피해 */
  dmgUp: number;
  /** 받는 피해 증가 / 감소 */
  dmgTaken: number; dmgRed: number;
  healDone: number; healRecv: number; shieldGiven: number; shieldRecv: number;
  /** 행동 종류별 가하는 피해 */
  basicDmg: number; skillDmg: number; ultDmg: number; followDmg: number; rearDmg: number;
  aoeDmg: number; singleDmg: number; trueDmg: number;
}
export type ModKey = keyof ModBag;
export type Mods = Partial<ModBag>;

/** 직접 행동(치명 가능·반응을 일으킴)과 파생 타격 */
export type Kind = 'basic' | 'skill' | 'ultimate' | 'rear' | 'followup' | 'reaction' | 'synergy' | 'dot';
export const DIRECT: ReadonlySet<Kind> = new Set(['basic', 'skill', 'ultimate', 'rear']);

export const DEBUFFS = new Set(['st_atk_down', 'st_def_down', 'st_spd_down', 'st_vuln', 'st_burn', 'st_stun', 'st_silence', 'st_healing_received_down', 'st_delayed', 'st_taunted']);
const CONTROL = new Set(['st_stun', 'st_silence', 'st_delayed']);

export interface Status {
  id: string;
  /** 같은 key는 갱신(출처·효과 단위) */
  key: string;
  src: U | null;
  turns: number;
  /** 대상의 지금 차례 도중 붙었다(이번 차례 끝에는 줄지 않음) */
  fresh: boolean;
  params: Mods & { tick?: number; hot?: number; by?: number; stacks?: number; [k: string]: unknown };
  debuff: boolean;
  /** 화면에 보이는 상태 ID(내부 변형 st_taunted → st_taunt) */
  shown: string;
}

interface Shield { amount: number; turns: number; fresh: boolean; src: number }

export interface U {
  uid: number;
  side: Side;
  zone: BattleZone;
  slot: number;
  ref: Ref;
  key: string;
  unit: UnitDefinition | null;
  enemy: EnemyDefinition | null;
  star: 1 | 2 | 3;
  name: string;
  boss: boolean;
  hasHp: boolean;
  tags: Set<string>;
  equip: string[];
  b: BaseStats;
  maxHp: number;
  hp: number;
  shields: Shield[];
  energy: number;
  alive: boolean;
  next: number;
  turn: number;
  cd: number;
  /** 이번 차례에 스킬을 썼다(쿨다운은 다음 차례부터 감소) */
  cdFresh: boolean;
  inTurn: boolean;
  pending: number[];
  delayBudget: number;
  st: Status[];
  mods: { bag: Mods; cond?: () => boolean; id: string }[];
  /** 개인 차례당 한도, 전투당 한도, 반응 쿨다운 */
  lim: Map<string, number>;
  blim: Map<string, number>;
  rcd: Map<string, number>;
  /** 효과별 자유 상태 */
  d: Record<string, any>;
  /** 출전 순서 */
  order: number;
}

export interface Ev {
  type: EvType;
  src?: U;
  tgt?: U;
  amount?: number;
  hp?: number;
  absorbed?: number;
  kind?: Kind;
  direct?: boolean;
  crit?: boolean;
  aoe?: boolean;
  statusId?: string;
  converted?: boolean;
  group?: U[];
  n?: number;
  overheal?: number;
  fx?: string;
}
export type EvType =
  | 'battle_start' | 'turn_start' | 'turn_end' | 'basic_resolved' | 'skill_resolved' | 'ultimate_declared' | 'ultimate_resolved'
  | 'rear_action_resolved' | 'ally_action_resolved' | 'damage_dealt' | 'damage_received' | 'healed' | 'shield_applied'
  | 'unit_defeated' | 'status_applied' | 'action_delayed' | 'followup_resolved' | 'reaction_resolved' | 'pulse' | 'shield_broken';

type Handler = { fn: (e: Ev) => void; owner: U | null; dead: boolean };

export interface HitOpts {
  true?: boolean;
  /** 치명 허용(기본: 직접 행동만) */
  crit?: boolean;
  stat?: 'atk' | 'def' | 'maxHp';
  /** 계수 대신 쓸 원 피해(raw) */
  raw?: number;
  flat?: number;
  aoe?: boolean;
  /** 이 타격에만 더하는 가하는 피해(bps) */
  bonus?: number;
  /** 이 타격에만 곱하는 배율 */
  mul?: number;
  fx?: string;
  forceCrit?: boolean;
  /** 피해 사건을 반응에 알리지 않는다(반사·폭발 연쇄 등) */
  silent?: boolean;
}

export interface HitRes { tgt: U; dmg: number; absorbed: number; crit: boolean; killed: boolean }

export interface HitCtx {
  src: U; tgt: U; kind: Kind; aoe: boolean; trueDmg: boolean;
  /** 더할 가하는 피해·받는 피해(bps), 치명 확률·피해 */
  out: number; inc: number; crit: number; critDmg: number;
  forceCrit: boolean; cancel: boolean; mul: number;
  fx?: string;
}

/** 능동 능력(기본·스킬·필살기·후방 정기) */
export interface Active {
  /** 사용 조건(10.3). 없으면 공격형으로 보고 적 전방이 있으면 사용 */
  auto?: (c: Battle, u: U) => boolean;
  run: (c: Battle, u: U) => void;
  /** 스킬 쿨다운(기본 2) */
  cd?: number;
}
export type Passive = (c: Battle, u: U) => void;
export interface Registry {
  actives: Record<string, Active>;
  passives: Record<string, Passive>;
  /** 시너지 단계 효과: 아군 진영에 한 번 등록 */
  synergies: Record<string, (c: Battle, scale: number) => void>;
  equipment: Record<string, Passive>;
  strategies: Record<string, (c: Battle) => void>;
  ooparts: Record<string, (c: Battle) => void>;
}

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const SHOWN: Record<string, string> = { st_taunted: 'st_taunt', st_buff: 'st_damage_up' };

export class Battle {
  readonly rng: Rng;
  readonly pack: ContentPack;
  readonly input: BattleInput;
  readonly reg: Registry;
  units: U[] = [];
  av = 0;
  sp: Record<Side, number>;
  spMax: Record<Side, number>;
  events: BattleEvent[] = [];
  pulse = 0;
  root = 0;
  depth = 0;
  ended: BattleOutput['reason'] | null = null;
  /** 효과·시너지가 공유하는 상태 */
  g: Record<string, any> = {};
  tiers: Record<string, number> = {};
  ooparts: Set<string>;
  strategies: Set<string>;
  readonly hitHooks: ((h: HitCtx) => void)[] = [];
  /** 쓰러지기 직전 살리는 효과(true면 살아남음) */
  readonly saves: ((u: U, by: U | null) => boolean)[] = [];
  /** 단일 대상 적대 선택에서 빼는 대상 */
  readonly hidden: ((u: U) => boolean)[] = [];
  /** 상태 부여 거부(면역·저항) */
  readonly blockers: ((tgt: U, id: string, debuff: boolean, src: U | null) => boolean)[] = [];
  /** 넘친 치유 처리 */
  readonly overheal: ((src: U, tgt: U, over: number) => void)[] = [];
  readonly spEmpty: ((side: Side) => void)[] = [];
  readonly extraTurns: ((src: U, tgt: U, id: string, debuff: boolean) => number)[] = [];
  readonly shieldBreakers: ((src: U) => boolean)[] = [];
  readonly noHeal: ((tgt: U) => boolean)[] = [];
  readonly basicEnergy: ((u: U) => number)[] = [];
  readonly expires: ((u: U, s: Status) => void)[] = [];
  readonly ends: ((outcome: 'win' | 'loss') => void)[] = [];
  /** 아군 전방 필살기 필요 에너지(오파츠), 아군 전방 스킬 쿨다운 추가 */
  frontUltEnergy = 100;
  frontSkillCdBonus = 0;
  /** 아군 비치명 타격 피해 증감(암시장 탄약) */
  nonCritBps = 0;
  private handlers = new Map<EvType, Handler[]>();
  private rootLim = new Map<string, number>();
  private pulseLim = new Map<string, number>();
  private seq = 0;
  fired = new Set<string>();
  contrib = new Map<string, BattleContribution>();
  kills: BattleOutput['kills'] = [];
  gold: { label: string; value: number }[] = [];
  aborted = false;
  private known: Set<string>;
  private curAction: Extract<BattleEvent, { t: 'action' }> | null = null;
  private escBps = 0;

  constructor(pack: ContentPack, input: BattleInput, reg: Registry) {
    this.pack = pack;
    this.input = input;
    this.reg = reg;
    this.rng = Rng.forStream(input.seed, 'battle');
    this.ooparts = new Set(input.ooparts);
    this.strategies = new Set(input.strategies);
    this.known = new Set(pack.statuses.map((x) => x.id));
    const b = pack.rules.battle;
    this.sp = { ally: b.teamSp.start, enemy: b.teamSp.start };
    this.spMax = { ally: b.teamSp.max, enemy: b.teamSp.max };
  }

  // ── 조회 ───────────────────────────────────────────────
  foe(side: Side): Side { return side === 'ally' ? 'enemy' : 'ally'; }
  /** 살아 있는 HP 보유 유닛(전방). 후방은 피격·치유 대상이 아니다 */
  front(side: Side): U[] { return this.units.filter((u) => u.side === side && u.zone === 'front' && u.alive && u.hasHp).sort((a, b) => a.slot - b.slot); }
  rear(side: Side): U[] { return this.units.filter((u) => u.side === side && u.zone === 'rear' && u.alive); }
  all(side: Side): U[] { return this.units.filter((u) => u.side === side && u.alive); }
  foes(u: U): U[] { return this.front(this.foe(u.side)); }
  mates(u: U): U[] { return this.front(u.side); }
  byUid(uid: number | undefined): U | undefined { return uid === undefined ? undefined : this.units.find((x) => x.uid === uid); }
  tier(syn: string): number | undefined { return this.tiers[syn]; }
  has(oopId: string): boolean { return this.ooparts.has(oopId); }
  members(syn: string, side: Side = 'ally'): U[] { return this.all(side).filter((u) => u.tags.has(syn)); }
  /** 성급별 수치 a/b/c */
  v<T>(u: U, xs: readonly T[]): T { return xs[Math.min(xs.length, u.star) - 1]; }
  hpRatio(u: U): number { return u.maxHp > 0 ? u.hp / u.maxHp : 0; }
  shieldOf(u: U): number { return u.shields.reduce((a, s) => a + s.amount, 0); }
  hasSt(u: U, id: string): boolean { return u.st.some((s) => s.id === id); }
  stOf(u: U, id: string): Status | undefined { return u.st.find((s) => s.id === id); }
  hasDebuff(u: U): boolean { return u.st.some((s) => s.debuff); }
  isControlled(u: U): boolean { return u.st.some((s) => CONTROL.has(s.id)); }

  /** 상시 modifier + 상태의 합. ATK 감소는 가장 강한 것 하나, 받는 피해 증가(st_vuln)는 +50% 상한 */
  sum(u: U, k: ModKey): number {
    let t = 0;
    for (const m of u.mods) { const x = m.bag[k]; if (x && (!m.cond || m.cond())) t += x; }
    let worstAtkDown = 0;
    let vuln = 0;
    for (const s of u.st) {
      const x = s.params[k];
      if (!x) continue;
      const n = x * (s.params.stacks ?? 1);
      if (k === 'atkPct' && s.id === 'st_atk_down') worstAtkDown = Math.min(worstAtkDown, n);
      else if (k === 'dmgTaken' && s.id === 'st_vuln') vuln += n;
      else t += n;
    }
    return t + worstAtkDown + Math.min(5000, vuln);
  }
  atk(u: U): number { return Math.max(0, Math.floor(u.b.atk * (1 + this.sum(u, 'atkPct') / 10000)) + this.sum(u, 'atkFlat')); }
  def(u: U): number { return Math.max(0, Math.floor(u.b.def * (1 + this.sum(u, 'defPct') / 10000))); }
  spd(u: U): number { return clamp(u.b.spd + this.sum(u, 'spd'), 40, 200); }
  crit(u: U): number { return clamp(u.b.critBps + this.sum(u, 'crit'), 0, 10000); }
  critDmg(u: U): number { return Math.max(0, u.b.critDamageBps + this.sum(u, 'critDmg')); }
  interval(u: U): number { return Math.ceil(10000 / this.spd(u)); }
  energy(u: U): number { return u.energy; }

  // ── 선택자 ─────────────────────────────────────────────
  /** 적대 단일 직접 행동의 주 대상: 나를 도발한 적 → 상대의 자기 도발 → 최전방 */
  pick(u: U): U | undefined {
    const pool = this.foes(u);
    if (!pool.length) return undefined;
    const by = this.byUid(this.stOf(u, 'st_taunted')?.params.by as number | undefined);
    if (by && by.alive && by.hasHp && by.side !== u.side && by.zone === 'front') return by;
    const tank = pool.filter((x) => x.st.some((s) => s.id === 'st_taunt'));
    if (tank.length) return tank[0];
    const visible = pool.filter((x) => !this.hidden.some((h) => h(x)));
    return (visible.length ? visible : pool)[0];
  }
  /** 최전열부터 n명(대상 지정형 다중 공격은 도발 무시) */
  firstN(u: U, n: number): U[] {
    const p = this.pick(u);
    const pool = this.foes(u);
    if (!p) return [];
    return [p, ...pool.filter((x) => x !== p)].slice(0, n);
  }
  sortBy(list: U[], f: (u: U) => number, desc = true): U[] {
    return [...list].sort((a, b) => (desc ? f(b) - f(a) : f(a) - f(b)) || a.slot - b.slot || a.uid - b.uid);
  }
  lowestHp(list: U[]): U | undefined { return this.sortBy(list, (x) => x.hp, false)[0]; }
  highestHp(list: U[]): U | undefined { return this.sortBy(list, (x) => x.hp)[0]; }
  highestAtk(list: U[]): U | undefined { return this.sortBy(list, (x) => this.atk(x))[0]; }
  highestSpd(list: U[]): U | undefined { return this.sortBy(list, (x) => this.spd(x))[0]; }
  highestDef(list: U[]): U | undefined { return this.sortBy(list, (x) => this.def(x))[0]; }
  /** 치유 대상의 최저 HP는 비율(10.3) */
  lowestRatio(list: U[], n = 1): U[] { return this.sortBy(list, (x) => this.hpRatio(x), false).slice(0, n); }
  randomOf<T>(list: T[]): T | undefined { return list.length ? list[this.rng.nextInt(list.length)] : undefined; }
  /** 슬롯 거리가 가장 가까운 다른 적(이오리 「인접 1명」) */
  adjacent(t: U): U | undefined {
    return this.sortBy(this.front(t.side).filter((x) => x !== t), (x) => Math.abs(x.slot - t.slot) * 10 + x.slot, false)[0];
  }

  // ── 한도 ───────────────────────────────────────────────
  /** 개인 차례당 n회 */
  once(u: U, key: string, n = 1): boolean { const c = u.lim.get(key) ?? 0; if (c >= n) return false; u.lim.set(key, c + 1); return true; }
  battleOnce(u: U | null, key: string, n = 1): boolean {
    const m = u ? u.blim : (this.g.__blim ??= new Map<string, number>()) as Map<string, number>;
    const c = m.get(key) ?? 0; if (c >= n) return false; m.set(key, c + 1); return true;
  }
  rootOnce(key: string, n = 1): boolean { const k = `${this.root}:${key}`; const c = this.rootLim.get(k) ?? 0; if (c >= n) return false; this.rootLim.set(k, c + 1); return true; }
  pulseOnce(key: string, n = 1): boolean { const k = `${this.pulse}:${key}`; const c = this.pulseLim.get(k) ?? 0; if (c >= n) return false; this.pulseLim.set(k, c + 1); return true; }
  /** 반응 쿨다운(소유자 정상 차례 끝마다 감소) */
  ready(u: U, key: string): boolean { return (u.rcd.get(key) ?? 0) <= 0; }
  cool(u: U, key: string, turns: number): void { if (turns > 0) u.rcd.set(key, turns + (u.inTurn ? 1 : 0)); }

  // ── 등록 ───────────────────────────────────────────────
  on(type: EvType, fn: (e: Ev) => void, owner: U | null = null, dead = false): void {
    const list = this.handlers.get(type) ?? [];
    list.push({ fn, owner, dead });
    this.handlers.set(type, list);
  }
  mod(u: U, bag: Mods, id: string, cond?: () => boolean): void { u.mods.push({ bag, cond, id }); }
  hook(fn: (h: HitCtx) => void): void { this.hitHooks.push(fn); }
  emit(e: Ev): void {
    const list = this.handlers.get(e.type);
    if (!list || this.ended) return;
    if (this.depth >= 8) return;
    this.depth++;
    try {
      for (const h of [...list]) {
        if (this.ended) break;
        if (h.owner && !h.owner.alive && !h.dead) continue;
        h.fn(e);
      }
    } finally { this.depth--; }
  }
  fire(id: string): void { this.fired.add(id); }

  // ── 기록 ───────────────────────────────────────────────
  log(e: BattleEvent): void {
    this.events.push(e);
    if (this.events.length > this.pack.rules.battle.eventLimit) { this.aborted = true; this.ended = 'both_wiped'; }
  }
  proc(kind: 'synergy' | 'oopart', id: string, label: string, unit?: U, chain?: number): void {
    this.fire(id);
    this.log({ t: 'proc', av: this.av, cause: { kind, id }, label, unit: unit?.ref, ...(chain ? { chain } : {}) });
  }
  private c(u: U): BattleContribution | null {
    if (u.side !== 'ally' || !u.unit) return null;
    let x = this.contrib.get(u.unit.id);
    if (!x) { x = { unitId: u.unit.id, damage: 0, healing: 0, shield: 0, rearSupport: 0 }; this.contrib.set(u.unit.id, x); }
    return x;
  }
  private target(r: Ref): void {
    const a = this.curAction;
    if (a && !a.targets.some((t) => t.side === r.side && t.zone === r.zone && t.index === r.index)) a.targets.push(r);
  }
  energyLog(u: U): void { if (u.hasHp) this.log({ t: 'resource', av: this.av, side: u.side, energy: { unit: u.ref, value: u.energy } }); }

  // ── 자원 ───────────────────────────────────────────────
  gainEnergy(u: U, n: number): void {
    if (!u.alive || !u.hasHp || n === 0) return;
    const before = u.energy;
    u.energy = clamp(u.energy + n, 0, 100);
    if (u.energy !== before) this.energyLog(u);
  }
  gainSp(side: Side, n: number): void {
    const before = this.sp[side];
    this.sp[side] = clamp(this.sp[side] + n, 0, this.spMax[side]);
    if (this.sp[side] !== before) this.log({ t: 'resource', av: this.av, side, sp: this.sp[side] });
    if (n < 0 && this.sp[side] === 0) for (const f of this.spEmpty) f(side);
  }
  reduceCd(u: U, n: number): void { u.cd = Math.max(0, u.cd - n); }

  // ── 시간 ───────────────────────────────────────────────
  advance(u: U, r: number): void {
    if (!u.alive || r <= 0) return;
    if (u.inTurn) { u.pending.push(-Math.min(0.8, r)); return; }
    const rem = u.next - this.av;
    u.next = this.av + Math.max(1, Math.ceil(rem * (1 - Math.min(0.8, r))));
  }
  delay(u: U, r: number, src: U | null = null): boolean {
    if (!u.alive || r <= 0) return false;
    if (u.inTurn) { u.pending.push(r); return true; }
    const rem = u.next - this.av;
    const add = Math.min(u.delayBudget, Math.max(1, Math.ceil(rem * (1 + r))) - rem);
    if (add <= 0) return false;
    u.delayBudget -= add;
    u.next += add;
    this.setStatus(src, u, 'st_delayed', { turns: 1, key: 'delayed', debuff: true, params: {} }, true);
    this.emit({ type: 'action_delayed', src: src ?? undefined, tgt: u });
    return true;
  }

  // ── 피해 ───────────────────────────────────────────────
  hit(src: U, targets: U | (U | undefined)[] | undefined, coef: number, kind: Kind, o: HitOpts = {}): HitRes[] {
    const list = (Array.isArray(targets) ? targets : [targets]).filter((t): t is U => !!t && t.alive && t.hasHp);
    if (!list.length || this.ended) return [];
    const direct = DIRECT.has(kind);
    const aoe = o.aoe ?? list.length > 1;
    const canCrit = o.crit ?? direct;
    const esc = escalationDamageBps(this.av, this.pack.rules.battle, src.side);
    const res: HitRes[] = [];
    // 묶음: 피해를 먼저 모두 확정한다(7.6)
    const nextCrit = canCrit && this.stOf(src, 'st_next_crit');
    for (const t0 of list) {
      const h: HitCtx = { src, tgt: t0, kind, aoe, trueDmg: !!o.true, out: 0, inc: 0, crit: 0, critDmg: 0, forceCrit: !!o.forceCrit || !!nextCrit, cancel: false, mul: o.mul ?? 1, fx: o.fx };
      for (const f of this.hitHooks) f(h);
      if (h.cancel || !h.tgt.alive) continue;
      const tgt = h.tgt;
      const stat = o.stat === 'def' ? this.def(src) : o.stat === 'maxHp' ? src.maxHp : this.atk(src);
      const raw = (o.raw ?? stat * coef) + (o.flat ?? 0);
      const kindBonus =
        (kind === 'basic' ? this.sum(src, 'basicDmg') : 0) + (kind === 'skill' ? this.sum(src, 'skillDmg') : 0) +
        (kind === 'ultimate' ? this.sum(src, 'ultDmg') : 0) + (kind === 'followup' || kind === 'reaction' ? this.sum(src, 'followDmg') : 0) +
        (kind === 'rear' ? this.sum(src, 'rearDmg') : 0) + (direct ? (aoe ? this.sum(src, 'aoeDmg') : this.sum(src, 'singleDmg')) : 0) +
        (o.true ? this.sum(src, 'trueDmg') : 0);
      const out = Math.max(0, 1 + (this.sum(src, 'dmgUp') + kindBonus + h.out + (o.bonus ?? 0)) / 10000);
      const inc = Math.max(0.1, 1 + (this.sum(tgt, 'dmgTaken') + h.inc - this.sum(tgt, 'dmgRed')) / 10000);
      const defMul = o.true ? 1 : 100 / (100 + this.def(tgt));
      let crit = false;
      if (canCrit) crit = h.forceCrit || this.rng.chance(clamp(this.crit(src) + h.crit, 0, 10000));
      const critMul = crit ? 1 + (this.critDmg(src) + h.critDmg) / 10000 : 1 + (src.side === 'ally' ? this.nonCritBps : 0) / 10000;
      let dmg = raw > 0 ? Math.max(1, Math.floor(raw * out * inc * defMul * critMul * h.mul * (1 + esc / 10000))) : 0;
      // 보호막 먼저(먼저 만료할 것 → 먼저 생긴 것)
      let absorbed = 0;
      tgt.shields.sort((a, b) => a.turns - b.turns);
      const breakAll = this.shieldBreakers.some((f) => f(src));
      for (const s of tgt.shields) {
        if (breakAll) { absorbed += s.amount; s.amount = 0; continue; }
        if (dmg <= 0) break;
        const take = Math.min(s.amount, dmg);
        s.amount -= take; dmg -= take; absorbed += take;
      }
      const hadShield = tgt.shields.length > 0;
      tgt.shields = tgt.shields.filter((s) => s.amount > 0);
      tgt.hp = Math.max(0, tgt.hp - dmg);
      res.push({ tgt, dmg, absorbed, crit, killed: false });
      if (hadShield && absorbed > 0 && !tgt.shields.length) this.g.brokenShields = [...(this.g.brokenShields ?? []), { tgt, src, absorbed }];
    }
    if (nextCrit && res.length) this.removeStatus(src, nextCrit);
    // 기록
    const origin = src.zone === 'rear' ? src.ref : undefined;
    for (const r of res) {
      this.log({ t: 'damage', av: this.av, source: src.ref, origin, target: r.tgt.ref, amount: r.dmg, crit: r.crit, shieldAbsorbed: r.absorbed, ...(o.true ? { true: true } : {}) });
      this.target(r.tgt.ref);
      const cb = this.c(src);
      if (cb) { cb.damage += r.dmg + r.absorbed; if (src.zone === 'rear') cb.rearSupport += r.dmg + r.absorbed; }
    }
    if (o.fx) this.fire(o.fx);
    // 쓰러짐 확정
    for (const r of res) if (r.tgt.hp <= 0) r.killed = this.down(r.tgt, src);
    // 반응
    const broken: { tgt: U; src: U; absorbed: number }[] = this.g.brokenShields ?? [];
    this.g.brokenShields = [];
    if (!o.silent) {
      for (const r of res) {
        if (r.dmg + r.absorbed <= 0) continue;
        const base = { src, tgt: r.tgt, amount: r.dmg + r.absorbed, hp: r.dmg, absorbed: r.absorbed, kind, direct, crit: r.crit, aoe, group: res.map((x) => x.tgt), fx: o.fx };
        this.emit({ type: 'damage_dealt', ...base });
        if (r.tgt.alive) this.emit({ type: 'damage_received', ...base });
      }
      for (const b of broken) this.emit({ type: 'shield_broken', src: b.src, tgt: b.tgt, amount: b.absorbed });
    }
    for (const r of res) if (r.killed) this.emit({ type: 'unit_defeated', src, tgt: r.tgt, kind, direct, aoe });
    this.checkEnd();
    return res;
  }

  /** HP가 0이 된 유닛을 정리. 살리는 효과가 있으면 false */
  down(u: U, by: U | null): boolean {
    if (!u.alive || u.hp > 0) return false;
    for (const s of this.saves) if (s(u, by)) { if (u.hp <= 0) u.hp = 1; return false; }
    u.alive = false;
    u.shields = [];
    this.log({ t: 'defeated', av: this.av, target: u.ref, by: by?.ref });
    if (u.side === 'enemy' && by && by.side === 'ally' && by.unit) this.kills.push({ unitId: by.unit.id, eliteOrBoss: u.boss || this.input.nodeType !== 'normal' });
    return true;
  }
  /** 반사·지속 피해처럼 묶음 밖에서 HP를 깎는다 */
  rawDamage(src: U | null, tgt: U, amount: number, opts: { true?: boolean; kind?: Kind; fx?: string; silent?: boolean } = {}): number {
    if (!tgt.alive || !tgt.hasHp || amount <= 0) return 0;
    let dmg = Math.floor(amount);
    let absorbed = 0;
    for (const s of tgt.shields) { const take = Math.min(s.amount, dmg); s.amount -= take; dmg -= take; absorbed += take; }
    tgt.shields = tgt.shields.filter((s) => s.amount > 0);
    tgt.hp = Math.max(0, tgt.hp - dmg);
    const ref = src?.ref ?? tgt.ref;
    this.log({ t: 'damage', av: this.av, source: ref, target: tgt.ref, amount: dmg, crit: false, shieldAbsorbed: absorbed, ...(opts.true ? { true: true } : {}) });
    if (src) { const cb = this.c(src); if (cb) cb.damage += dmg + absorbed; }
    if (opts.fx) this.fire(opts.fx);
    let killed = false;
    if (tgt.hp <= 0) killed = this.down(tgt, src);
    if (!opts.silent && src && dmg + absorbed > 0 && tgt.alive) this.emit({ type: 'damage_received', src, tgt, amount: dmg + absorbed, hp: dmg, absorbed, kind: opts.kind ?? 'dot', direct: false });
    if (killed) this.emit({ type: 'unit_defeated', src: src ?? undefined, tgt, kind: opts.kind ?? 'dot', direct: false });
    this.checkEnd();
    return dmg + absorbed;
  }

  // ── 치유·보호막 ────────────────────────────────────────
  heal(src: U, tgt: U | undefined, raw: number, fx?: string): number {
    if (!tgt || !tgt.alive || !tgt.hasHp || raw <= 0 || this.ended) return 0;
    if (this.noHeal.some((f) => f(tgt))) return 0;
    const amt = Math.floor(raw * Math.max(0, 1 + this.sum(src, 'healDone') / 10000) * Math.max(0, 1 + this.sum(tgt, 'healRecv') / 10000));
    const real = Math.min(tgt.maxHp - tgt.hp, amt);
    const over = amt - real;
    if (real > 0) {
      tgt.hp += real;
      this.log({ t: 'heal', av: this.av, source: src.ref, target: tgt.ref, amount: real });
      this.target(tgt.ref);
      const cb = this.c(src);
      if (cb) { cb.healing += real; if (src.zone === 'rear') cb.rearSupport += real; }
    }
    if (fx) this.fire(fx);
    if (over > 0) for (const f of this.overheal) f(src, tgt, over);
    if (real > 0) this.emit({ type: 'healed', src, tgt, amount: real, overheal: over, fx });
    return real;
  }
  shield(src: U, tgt: U | undefined, raw: number, turns = 2, fx?: string): number {
    if (!tgt || !tgt.alive || !tgt.hasHp || raw <= 0 || this.ended) return 0;
    if (this.noHeal.some((f) => f(tgt))) return 0;
    const amt = Math.floor(raw * Math.max(0, 1 + this.sum(src, 'shieldGiven') / 10000) * Math.max(0, 1 + this.sum(tgt, 'shieldRecv') / 10000));
    const room = Math.max(0, tgt.maxHp - this.shieldOf(tgt));
    const real = Math.min(room, amt);
    if (fx) this.fire(fx);
    if (real <= 0) return 0;
    tgt.shields.push({ amount: real, turns, fresh: tgt.inTurn, src: src.uid });
    this.log({ t: 'shield', av: this.av, source: src.ref, target: tgt.ref, amount: real });
    this.target(tgt.ref);
    const cb = this.c(src);
    if (cb) { cb.shield += real; if (src.zone === 'rear') cb.rearSupport += real; }
    this.emit({ type: 'shield_applied', src, tgt, amount: real, fx });
    return real;
  }

  // ── 상태 ───────────────────────────────────────────────
  /**
   * 상태 부여. 같은 key는 갱신한다. 보스 기절·침묵은 지연으로 바뀐다(8.5).
   * 반환: 실제로 적용·갱신됐는가
   */
  apply(src: U | null, tgt: U | undefined, id: string, o: { turns?: number; params?: Status['params']; key?: string; fx?: string } = {}): boolean {
    if (!tgt || !tgt.alive || this.ended) return false;
    const debuff = DEBUFFS.has(id);
    let turns = o.turns ?? 2;
    if (src && src.side === 'ally') for (const f of this.extraTurns) turns += f(src, tgt, id, debuff);
    if (this.blockers.some((b) => b(tgt, id, debuff, src))) return false;
    if (tgt.boss && (id === 'st_stun' || id === 'st_silence')) {
      // 보스 제어 치환: 기절 → 25% 지연 + ATK -15%(1차례), 침묵 → 20% 지연
      const delayed = this.delay(tgt, id === 'st_stun' ? 0.25 : 0.2, src);
      if (id === 'st_stun') this.setStatus(src, tgt, 'st_atk_down', { turns: 1, key: `boss_stun`, debuff: true, params: { atkPct: -1500 } }, false);
      this.log({ t: 'status', av: this.av, target: tgt.ref, statusId: 'st_delayed', op: 'add', replacedFrom: id });
      if (o.fx) this.fire(o.fx);
      this.emit({ type: 'status_applied', src: src ?? undefined, tgt, statusId: id, converted: true });
      return delayed || id === 'st_stun';
    }
    const ok = this.setStatus(src, tgt, id, { turns, key: o.key ?? `${src?.uid ?? 'g'}:${o.fx ?? id}`, debuff, params: o.params ?? {} }, true);
    if (o.fx) this.fire(o.fx);
    if (ok) this.emit({ type: 'status_applied', src: src ?? undefined, tgt, statusId: id });
    return ok;
  }
  /** 사건 없이 상태를 넣거나 갱신 */
  setStatus(src: U | null, tgt: U, id: string, s: { turns: number; key: string; debuff: boolean; params: Status['params'] }, show: boolean): boolean {
    const old = tgt.st.find((x) => x.id === id && x.key === s.key);
    if (old) {
      const changed = old.turns < s.turns || JSON.stringify(old.params) !== JSON.stringify(s.params);
      old.turns = Math.max(old.turns, s.turns); old.params = s.params; old.src = src; old.fresh = tgt.inTurn;
      return changed;
    }
    // 화상: 서로 다른 출처 최대 2개(약한 것 교체)
    if (id === 'st_burn') {
      const burns = tgt.st.filter((x) => x.id === 'st_burn');
      if (burns.length >= 2) {
        const weak = burns.sort((a, b) => (a.params.tick ?? 0) - (b.params.tick ?? 0))[0];
        if ((weak.params.tick ?? 0) >= (s.params.tick ?? 0)) return false;
        this.removeStatus(tgt, weak);
      }
    }
    tgt.st.push({ id, key: s.key, src, turns: s.turns, fresh: tgt.inTurn, params: s.params, debuff: s.debuff, shown: SHOWN[id] ?? id });
    if (show && this.known.has(SHOWN[id] ?? id)) { this.log({ t: 'status', av: this.av, target: tgt.ref, statusId: SHOWN[id] ?? id, op: 'add' }); this.target(tgt.ref); }
    return true;
  }
  removeStatus(u: U, s: Status): void {
    const i = u.st.indexOf(s);
    if (i < 0) return;
    u.st.splice(i, 1);
    if (this.known.has(s.shown) && !u.st.some((x) => x.shown === s.shown)) this.log({ t: 'status', av: this.av, target: u.ref, statusId: s.shown, op: 'remove' });
  }
  /** 디버프 해제(기절 → 침묵 → 도발 → 치유 감소 → 나머지 오래된 순) */
  cleanse(u: U | undefined, n = 1, only?: string[]): number {
    if (!u) return 0;
    const order = ['st_stun', 'st_silence', 'st_taunted', 'st_healing_received_down'];
    let removed = 0;
    for (let i = 0; i < n; i++) {
      const pool = u.st.filter((s) => s.debuff && (!only || only.includes(s.id)));
      if (!pool.length) break;
      pool.sort((a, b) => (order.indexOf(a.id) + 1 || 99) - (order.indexOf(b.id) + 1 || 99));
      this.removeStatus(u, pool[0]);
      removed++;
    }
    return removed;
  }
  /** 버프 제거(가장 강한 것: 남은 기간이 긴 것) */
  dispel(u: U | undefined, n = 1): Status[] {
    if (!u) return [];
    const out: Status[] = [];
    for (let i = 0; i < n; i++) {
      const pool = u.st.filter((s) => !s.debuff && s.turns < 900 && s.id !== 'st_charge_aris');
      if (!pool.length) break;
      const s = pool.sort((a, b) => b.turns - a.turns)[0];
      this.removeStatus(u, s);
      out.push(s);
    }
    return out;
  }

  // ── 능동 능력 ──────────────────────────────────────────
  activeOf(id: string | null | undefined): Active | null { return id ? this.reg.actives[id.replace(/^eff_/, '')] ?? null : null; }
  /** 행동 기록을 열고 root를 새로 잡는다 */
  beginAction(u: U, kind: 'basic' | 'skill' | 'ultimate' | 'rear'): void {
    this.root++;
    const a: Extract<BattleEvent, { t: 'action' }> = { t: 'action', av: this.av, actor: u.ref, kind, targets: [] };
    this.log(a);
    this.curAction = a;
  }
  endAction(): void { this.curAction = null; }
  /** 반응용 새 root(반응 안의 반응을 구분) */
  newRoot(): void { this.root++; }

  checkEnd(): void {
    if (this.ended) return;
    const e = this.front('enemy').length;
    const a = this.front('ally').length;
    if (!e && !a) this.ended = 'both_wiped';
    else if (!e) this.ended = 'enemy_front_wiped';
    else if (!a) this.ended = 'ally_front_wiped';
  }

  // ── 차례 ───────────────────────────────────────────────
  private startTurn(u: U): void {
    u.turn++;
    u.lim.clear();
    u.inTurn = true;
    u.pending = [];
    // 지속 피해·회복(대상 차례 시작에 틱)
    for (const s of [...u.st]) {
      if (!u.alive) break;
      if (s.id === 'st_burn' && s.params.tick) this.rawDamage(s.src, u, Math.floor(s.params.tick * (100 / (100 + this.def(u))) * Math.max(0.1, 1 + (this.sum(u, 'dmgTaken') - this.sum(u, 'dmgRed')) / 10000) * (1 + escalationDamageBps(this.av, this.pack.rules.battle, s.src?.side ?? this.foe(u.side)) / 10000)), { kind: 'dot' });
      if (s.id === 'st_hot' && s.params.hot && s.src) this.heal(s.src, u, s.params.hot);
    }
    if (u.alive) this.emit({ type: 'turn_start', src: u, tgt: u });
  }
  private endTurn(u: U): void {
    if (u.alive) this.emit({ type: 'turn_end', src: u, tgt: u });
    for (const s of [...u.st]) {
      if (s.fresh) { s.fresh = false; continue; }
      s.turns--;
      if (s.turns <= 0) { this.removeStatus(u, s); for (const f of this.expires) f(u, s); }
    }
    for (const s of u.shields) { if (s.fresh) { s.fresh = false; continue; } s.turns--; }
    u.shields = u.shields.filter((s) => s.turns > 0 && s.amount > 0);
    if (u.cdFresh) u.cdFresh = false; else u.cd = Math.max(0, u.cd - 1);
    for (const [k, v] of u.rcd) u.rcd.set(k, v - 1);
    u.inTurn = false;
    // 다음 정상 차례 예약(이번 차례 도중 당기기·밀기는 새 간격에 차례대로)
    let gap = this.interval(u);
    const base = gap;
    for (const r of u.pending) gap = Math.max(1, Math.ceil(gap * (1 + r)));
    u.pending = [];
    u.next = this.av + Math.min(gap, base * (u.boss ? 1.5 : 2));
    u.delayBudget = Math.floor(base * (u.boss ? 0.5 : 1));
  }

  private ultNeed(u: U): number { return u.side === 'ally' && u.zone === 'front' ? this.frontUltEnergy : 100; }

  private frontTurn(u: U): void {
    this.startTurn(u);
    if (!u.alive || this.ended) { u.inTurn = false; return; }
    const stunned = this.hasSt(u, 'st_stun');
    if (!stunned) {
      const silenced = this.hasSt(u, 'st_silence');
      const ab = u.unit ? u.unit.abilityIds : null;
      const ultId = ab ? ab.ultimate : u.d.ult;
      const ult = this.activeOf(ultId);
      if (ult && !silenced && u.energy >= this.ultNeed(u) && (!ult.auto || ult.auto(this, u)) && this.foes(u).length) {
        u.energy -= this.ultNeed(u);
        this.energyLog(u);
        this.emit({ type: 'ultimate_declared', src: u });
        this.beginAction(u, 'ultimate');
        ult.run(this, u);
        this.fire(ultId!.replace(/^eff_/, ''));
        this.endAction();
        if (u.alive) this.emit({ type: 'ultimate_resolved', src: u, kind: 'ultimate' });
      }
      if (!this.ended && u.alive) {
        const skillId = ab ? ab.skill : u.d.skill;
        const skill = this.activeOf(skillId);
        const skillOk = !!skill && !silenced && this.sp[u.side] >= 1 && u.cd <= 0 && (skill.auto ? skill.auto(this, u) : this.foes(u).length > 0);
        if (skillOk) {
          this.gainSp(u.side, -1);
          u.cd = Math.max(0, (skill!.cd ?? 2) + (u.side === 'ally' ? this.frontSkillCdBonus : 0) - (u.d.cdCut ?? 0));
          u.d.cdCut = 0;
          u.cdFresh = true;
          this.beginAction(u, 'skill');
          skill!.run(this, u);
          this.fire(skillId!.replace(/^eff_/, ''));
          this.endAction();
          if (u.alive) {
            this.gainEnergy(u, 30);
            this.emit({ type: 'skill_resolved', src: u, kind: 'skill' });
            this.emit({ type: 'ally_action_resolved', src: u, kind: 'skill' });
          }
        } else {
          const basicId = ab ? ab.basic : u.d.basic ?? 'eff_common_basic_atk';
          const basic = this.activeOf(basicId) ?? this.activeOf('eff_common_basic_atk')!;
          this.beginAction(u, 'basic');
          basic.run(this, u);
          this.fire((basicId ?? 'common_basic_atk').replace(/^eff_/, ''));
          this.endAction();
          if (u.alive) {
            this.gainSp(u.side, 1);
            this.gainEnergy(u, 20 + this.basicEnergy.reduce((a, f) => a + f(u), 0));
            this.emit({ type: 'basic_resolved', src: u, kind: 'basic' });
            this.emit({ type: 'ally_action_resolved', src: u, kind: 'basic' });
          }
        }
      }
    }
    this.endTurn(u);
  }

  private rearTurn(u: U): void {
    this.startTurn(u);
    if (!this.ended && u.alive && !this.hasSt(u, 'st_stun')) {
      const id = u.unit ? u.unit.abilityIds.rearAction : u.d.rear;
      const act = this.activeOf(id);
      if (act) {
        this.beginAction(u, 'rear');
        act.run(this, u);
        this.fire(id!.replace(/^eff_/, ''));
        this.endAction();
        this.emit({ type: 'rear_action_resolved', src: u, kind: 'rear' });
        this.emit({ type: 'ally_action_resolved', src: u, kind: 'rear' });
      }
    }
    this.endTurn(u);
  }

  // ── 실행 ───────────────────────────────────────────────
  private start: { sp: Record<Side, number>; units: BattleOutput['combatants'] } | null = null;
  /** 전투 시작 사건 전의 모습(화면은 여기서부터 로그를 재생한다) */
  snapshot(): void {
    this.start = {
      sp: { ally: this.sp.ally, enemy: this.sp.enemy },
      units: this.units.map((u) => ({
        ref: u.ref, unitId: u.unit?.id, enemyId: u.enemy?.id, name: u.name, star: u.star, maxHp: u.maxHp, hp: u.hp,
        shield: this.shieldOf(u), energy: u.energy, boss: u.boss, hasHp: u.hasHp,
      })),
    };
  }
  run(): BattleOutput {
    if (!this.start) this.snapshot();
    const startSp = this.start!.sp;
    const snapshot = this.start!.units;
    const pulseAv = this.pack.rules.battle.globalPulseAv;
    let nextPulse = pulseAv;
    // 진영 우선권(initiative 스트림)
    const firstSide: Side = Rng.forStream(this.input.seed, 'initiative').nextInt(2) === 0 ? 'ally' : 'enemy';
    const rank = (u: U) => (u.zone === 'front' ? u.slot + 1 : u.slot + 5);
    for (let guard = 0; guard < 100000 && !this.ended; guard++) {
      const actors = this.units.filter((u) => u.alive && (u.hasHp || this.front(u.side).length > 0));
      if (!actors.length) break;
      actors.sort((a, b) => a.next - b.next || rank(a) - rank(b) || (a.side === b.side ? 0 : a.side === firstSide ? -1 : 1) || a.uid - b.uid);
      const a = actors[0];
      if (nextPulse <= a.next) {
        this.av = nextPulse;
        this.pulse = Math.round(nextPulse / pulseAv);
        this.tickEscalation();
        this.root++;
        this.emit({ type: 'pulse', n: this.pulse });
        nextPulse += pulseAv;
        this.checkEnd();
        continue;
      }
      this.av = a.next;
      this.tickEscalation();
      this.log({ t: 'timeline', av: this.av, upcoming: actors.slice(1, 9).map((x) => x.ref) });
      if (a.zone === 'front' && a.hasHp) this.frontTurn(a); else this.rearTurn(a);
      this.checkEnd();
    }
    if (!this.ended) this.ended = 'both_wiped';
    const outcome = this.ended === 'enemy_front_wiped' ? 'win' : 'loss';
    for (const f of this.ends) f(outcome);
    this.log({ t: 'end', av: this.av, outcome, reason: this.ended });
    return {
      outcome, reason: this.ended, combatants: snapshot, startSp, events: this.events,
      contributions: [...this.contrib.values()], kills: this.kills, settlementGold: this.gold, aborted: this.aborted,
      survivingEnemyFront: this.front('enemy').length, firedEffects: [...this.fired].sort(),
    };
  }

  private tickEscalation(): void {
    const e = escalationDamageBps(this.av, this.pack.rules.battle, 'ally');
    if (e !== this.escBps) { this.escBps = e; this.log({ t: 'escalation', av: this.av, damageBps: e, enemyDamageBps: escalationDamageBps(this.av, this.pack.rules.battle, 'enemy') }); }
  }

  // ── 준비 ───────────────────────────────────────────────
  addUnit(x: Omit<U, 'uid' | 'ref' | 'shields' | 'energy' | 'alive' | 'next' | 'turn' | 'cd' | 'cdFresh' | 'inTurn' | 'pending' | 'delayBudget' | 'st' | 'mods' | 'lim' | 'blim' | 'rcd' | 'd' | 'order'>): U {
    const u: U = {
      ...x, uid: this.seq++, ref: { side: x.side, zone: x.zone, index: x.slot }, shields: [], energy: 0, alive: true, next: 0, turn: 0, cd: 0, cdFresh: false,
      inTurn: false, pending: [], delayBudget: 0, st: [], mods: [], lim: new Map(), blim: new Map(), rcd: new Map(), d: {}, order: this.units.length,
    };
    this.units.push(u);
    return u;
  }
  /** 초기 예약(전투 시작 사건 전에 모든 행동자를 예약, 7.2) */
  schedule(): void {
    for (const u of this.units) {
      u.next = this.interval(u);
      u.delayBudget = Math.floor(u.next * (u.boss ? 0.5 : 1));
    }
  }
  /** 최대 HP를 전투 시작 보정으로 확정하고 가득 채운다(8.3) */
  finalizeHp(): void {
    for (const u of this.units) {
      u.maxHp = Math.max(1, Math.floor(u.b.hp * (1 + this.sum(u, 'hpPct') / 10000)));
      u.hp = u.maxHp;
    }
  }
}

export type { BattleEvent, Ref, Side, BattleZone };
