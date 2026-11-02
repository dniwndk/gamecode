// 멀티플레이 방(PvP, 방장 권한형). 방장 기기에서만 돈다: 플레이어마다 런 세션을 하나씩 두고,
// 공용 상점 풀·준비 완료·짝 맞추기·PvP 전투·탈락 순위를 관리한다. 통신은 모른다(host.ts가 잇는다).
//
// 규칙(D-049)
// - 솔로와 같은 25라운드(5장 × 5전투) 경제·보상 흐름. 적 노드 대신 다른 플레이어 편성과 싸운다.
// - 상점은 모든 플레이어가 한 풀을 나눠 쓴다: 다른 사람이 가진 학생과 그들 상점에 떠 있는 칸은 내 상점에 덜 나온다.
// - 살아 있는 모두가 출격 대기하면 라운드를 돌린다. 절반 이상이 대기하면 준비 마감 시계가 돈다.
//   마감이 되면 남은 사람은 지금 편성 그대로(선택 화면은 첫 후보로) 출격한다. 연결이 끊긴 사람은 기다리지 않는다.
// - 짝은 무작위(직전 상대는 가능하면 피함). 홀수면 한 명은 다른 플레이어의 「잔상」과 싸우고, 잔상 주인은 영향이 없다.
// - 패배 피해는 솔로 공식(장 기본 + 남은 상대 전방 수, 정예·보스 라운드 가산). 런 체력 0이면 탈락.
// - 한 명만 남거나 마지막 라운드가 끝나면 순위(남은 체력 순)를 정한다.
import type { ContentCatalog } from '../gameClient';
import { flipBattleOutput, Rng, simulateBattle, type BattleTeamInput, type OwnedCopy } from '../runRules';
import { createRunSession, type ProfileStore, type RunSession } from '../run/session';
import type { MultiPlayerView, MultiView } from '../view';

export const MAX_PLAYERS = 8;
export const MIN_PLAYERS = 2;

export interface RoomClock {
  now(): number;
  /** ms 뒤에 fn. 돌려준 함수로 취소 */
  later(ms: number, fn: () => void): () => void;
}

export interface RoomOptions {
  roomCode: string;
  /** 방 씨앗(플레이어 런 씨앗·짝·전투 씨앗의 바탕) */
  seed: string;
  clock: RoomClock;
  /** 준비 마감(절반 이상 대기 뒤 남은 사람에게 주는 시간, 초). 0이면 마감 없음 */
  prepSeconds?: number;
  /** 자리별 레시피 공개 기록 저장소(방장 자리는 기기 저장소를 넘긴다) */
  profileFor?(seat: number): ProfileStore | undefined;
}

export interface LobbyPlayer { seat: number; name: string; host: boolean; connected: boolean }
export interface LobbyView { roomCode: string; players: LobbyPlayer[]; started: boolean; maxPlayers: number; minPlayers: number }

interface Player {
  /** 접속 순서로 붙는 고정 번호(로비에서 누가 나가도 바뀌지 않는다) */
  id: number;
  seat: number;
  name: string;
  connected: boolean;
  session: RunSession | null;
  place: number | null;
  lastOpponent: number | null;
  lastOpponentName: string | null;
}

export class Room {
  readonly catalog: ContentCatalog;
  readonly opts: RoomOptions;
  private players: Player[] = [];
  private started = false;
  private resolving = false;
  private deadlineAt: number | null = null;
  private cancelDeadline: (() => void) | null = null;
  private lobbyListeners = new Set<(l: LobbyView) => void>();
  private rng: Rng;
  private round = 0;
  private nextId = 0;

  constructor(catalog: ContentCatalog, opts: RoomOptions) {
    this.catalog = catalog;
    this.opts = opts;
    this.rng = Rng.forStream(opts.seed, 'setup');
  }

  // ── 로비 ───────────────────────────────────────────────
  lobby(): LobbyView {
    return {
      roomCode: this.opts.roomCode,
      players: this.players.map((p) => ({ seat: p.seat, name: p.name, host: p.seat === 0, connected: p.connected })),
      started: this.started, maxPlayers: MAX_PLAYERS, minPlayers: MIN_PLAYERS,
    };
  }
  onLobby(fn: (l: LobbyView) => void): () => void { this.lobbyListeners.add(fn); return () => this.lobbyListeners.delete(fn); }
  private lobbyChanged() { const l = this.lobby(); for (const fn of this.lobbyListeners) fn(l); }

  /** 플레이어 하나를 받는다. 돌려준 번호(id)로 이후를 가리킨다. 가득 찼거나 이미 시작했으면 null */
  join(name: string): number | null {
    if (this.started || this.players.length >= MAX_PLAYERS) return null;
    const seat = this.players.length;
    const taken = new Set(this.players.map((p) => p.name));
    let n = cleanName(name, seat);
    for (let k = 2; taken.has(n); k++) n = `${cleanName(name, seat)} ${k}`;
    const id = this.nextId++;
    this.players.push({ id, seat, name: n, connected: true, session: null, place: null, lastOpponent: null, lastOpponentName: null });
    this.lobbyChanged();
    return id;
  }

  /** 플레이어 번호 → 자리(시작 뒤 세션 번호) */
  seatOf(id: number): number | null { return this.players.find((p) => p.id === id)?.seat ?? null; }

  /** 연결이 끊겼다. 시작 전이면 자리를 비우고, 시작 뒤면 기다리지 않는다(지금 편성으로 계속 싸운다) */
  disconnect(id: number): void {
    const p = this.players.find((x) => x.id === id);
    if (!p) return;
    if (!this.started) {
      this.players = this.players.filter((x) => x !== p);
      this.players.forEach((x, i) => { x.seat = i; });
      this.lobbyChanged();
      return;
    }
    p.connected = false;
    this.lobbyChanged();
    this.changed();
    this.maybeResolve();
  }

  /** 방장이 시작한다 */
  start(): { ok: true } | { ok: false; message: string } {
    if (this.started) return { ok: false, message: '이미 시작했어요' };
    if (this.players.length < MIN_PLAYERS) return { ok: false, message: `${MIN_PLAYERS}명 이상 모여야 시작할 수 있어요` };
    this.started = true;
    for (const p of this.players) {
      p.session = createRunSession(this.catalog, { revision: 0, phase: 'HOME', contentVersion: this.catalog.pack.manifest.contentVersion, rulesVersion: this.catalog.rules.rulesVersion, run: null }, {
        profile: this.opts.profileFor?.(p.seat),
        multi: {
          pool: () => this.poolFor(p.seat),
          onReady: () => { this.changed(); this.maybeResolve(); },
          view: () => this.viewFor(p.seat),
          onLeave: () => this.leave(p.seat),
        },
      });
    }
    // 모두 같은 순서로 새 런을 연다(상점 추첨이 공용 풀을 보므로 자리 순서대로)
    for (const p of this.players) void p.session!.send('NEW_RUN', { seed: `${this.opts.seed}-${p.seat + 1}` });
    this.lobbyChanged();
    this.changed();
    return { ok: true };
  }

  isStarted(): boolean { return this.started; }
  session(seat: number): RunSession | null { return this.players[seat]?.session ?? null; }
  playerCount(): number { return this.players.length; }

  // ── 진행 ───────────────────────────────────────────────
  private alive(): Player[] { return this.players.filter((p) => p.place === null && p.session); }

  /** 공용 풀: 나를 뺀 모두의 보유 학생과 상점 칸 */
  private poolFor(seat: number): { owned: OwnedCopy[]; shown: (string | null)[] } {
    const owned: OwnedCopy[] = [];
    const shown: (string | null)[] = [];
    for (const p of this.players) {
      if (p.seat === seat || !p.session || p.place !== null) continue;
      owned.push(...p.session.ownedCopies());
      shown.push(...p.session.shopShown());
    }
    return { owned, shown };
  }

  private totalRounds(): number { return this.catalog.rules.run.chapters * this.catalog.rules.run.battlesPerChapter; }

  private viewFor(seat: number): MultiView {
    const alive = this.alive();
    const players: MultiPlayerView[] = this.players.map((p) => {
      const i = p.session?.info();
      const team = p.session?.team();
      return {
        seat: p.seat, name: p.name, you: p.seat === seat, host: p.seat === 0, connected: p.connected,
        runHp: Math.max(0, i?.runHp ?? 0), runHpMax: i?.runHpMax ?? 0, level: i?.level ?? 1, alive: p.place === null,
        ready: !!i?.ready, place: p.place, streak: i?.streak ?? { kind: null, count: 0 },
        board: (team?.units ?? []).map((u) => ({ unitId: u.unitId, star: u.star })),
      };
    });
    players.sort((a, b) => (a.place ?? 0) - (b.place ?? 0) || b.runHp - a.runHp || a.seat - b.seat);
    const me = this.players[seat];
    return {
      roomCode: this.opts.roomCode,
      round: Math.min(this.totalRounds(), this.round + 1),
      totalRounds: this.totalRounds(),
      players,
      ready: !!me?.session?.info().ready,
      readyCount: alive.filter((p) => p.session!.info().ready).length,
      aliveCount: alive.length,
      deadlineInMs: this.deadlineAt === null ? null : Math.max(0, this.deadlineAt - this.opts.clock.now()),
      lastOpponent: me?.lastOpponentName ?? null,
      place: me?.place ?? null,
    };
  }

  /** 모든 세션 화면을 다시 그리게 한다(점수판) */
  private changed(): void {
    if (this.resolving) return;
    for (const p of this.players) p.session?.refresh();
  }

  private leave(seat: number): void {
    const p = this.players[seat];
    if (!p || p.place !== null) return;
    p.connected = false;
    // 스스로 나가면 지금 남은 사람 중 꼴찌로 탈락
    p.place = this.alive().length;
    this.afterPlaces();
    this.changed();
    this.maybeResolve();
  }

  private maybeResolve(): void {
    if (!this.started || this.resolving) return;
    const alive = this.alive();
    if (alive.length <= 1) return;
    const waitingOn = alive.filter((p) => p.connected && !p.session!.info().ready);
    if (waitingOn.length === 0) { void this.resolveRound(); return; }
    const secs = this.opts.prepSeconds ?? 0;
    const readyShare = (alive.length - waitingOn.length) / alive.length;
    if (secs > 0 && readyShare >= 0.5 && this.deadlineAt === null) {
      this.deadlineAt = this.opts.clock.now() + secs * 1000;
      this.cancelDeadline = this.opts.clock.later(secs * 1000, () => { void this.forceRound(); });
      this.changed();
    } else if (readyShare < 0.5 && this.deadlineAt !== null) {
      this.clearDeadline();
      this.changed();
    }
  }

  private clearDeadline(): void {
    this.cancelDeadline?.();
    this.cancelDeadline = null;
    this.deadlineAt = null;
  }

  /** 준비 마감: 남은 사람을 지금 편성으로 출격시킨다 */
  async forceRound(): Promise<void> {
    this.clearDeadline();
    if (!this.started || this.resolving) return;
    for (const p of this.alive()) if (!p.session!.info().ready) await p.session!.autoAdvance();
    if (this.alive().every((p) => p.session!.info().ready)) await this.resolveRound();
    else this.changed();
  }

  /** 짝을 짓는다. 직전 상대는 가능하면 피한다. 홀수면 마지막 한 명은 잔상(null) */
  private pair(alive: Player[]): [Player, Player | null][] {
    let best: [Player, Player | null][] = [];
    let bestRepeats = Infinity;
    for (let attempt = 0; attempt < 12; attempt++) {
      const order = [...alive];
      for (let i = order.length - 1; i > 0; i--) { const j = this.rng.nextInt(i + 1); [order[i], order[j]] = [order[j], order[i]]; }
      const pairs: [Player, Player | null][] = [];
      for (let i = 0; i < order.length; i += 2) pairs.push([order[i], order[i + 1] ?? null]);
      const repeats = pairs.filter(([a, b]) => b && a.lastOpponent === b.seat).length;
      if (repeats < bestRepeats) { best = pairs; bestRepeats = repeats; }
      if (repeats === 0) break;
    }
    return best;
  }

  private async resolveRound(): Promise<void> {
    if (this.resolving) return;
    this.resolving = true;
    this.clearDeadline();
    try {
      // 연결이 끊긴 사람은 지금 편성으로 출격
      for (const p of this.alive()) if (!p.session!.info().ready) await p.session!.autoAdvance();
      const alive = this.alive().filter((p) => p.session!.info().ready);
      if (alive.length < 2) return;
      const pack = this.catalog.pack;
      const info = alive[0].session!.info();
      const node = pack.nodes.find((n) => n.chapter === info.chapter && n.battle === info.battle) ?? pack.nodes[0];
      const teams = new Map(alive.map((p) => [p.seat, p.session!.team()!]));
      const hpBefore = new Map(alive.map((p) => [p.seat, p.session!.info().runHp]));
      const roundNo = this.round + 1;
      for (const [a, b] of this.pair(alive)) {
        // 홀수: 다른 플레이어 하나의 잔상과 싸운다(잔상 주인은 영향 없음)
        const ghost = b ?? alive.filter((x) => x !== a)[this.rng.nextInt(alive.length - 1)];
        const ta = teams.get(a.seat)!;
        const tb = teams.get(ghost.seat)!;
        const out = simulateBattle(pack, {
          seed: `${this.opts.seed}|r${roundNo}|${a.seat}-${ghost.seat}`,
          nodeType: node.type, chapter: info.chapter, statScaleBps: 10000,
          ...allySide(ta), enemies: [], opponent: tb,
        });
        const battleId = `pvp-${roundNo}-${a.seat}-${ghost.seat}`;
        const bName = b ? b.name : `${ghost.name}의 잔상`;
        a.session!.applyBattle(out, { opponentName: bName, battleId });
        a.lastOpponent = b ? b.seat : null; a.lastOpponentName = bName;
        if (b) {
          b.session!.applyBattle(flipBattleOutput(out), { opponentName: a.name, battleId });
          b.lastOpponent = a.seat; b.lastOpponentName = a.name;
        }
      }
      this.round++;
      // 탈락: 이번 라운드에 체력이 0이 된 사람. 더 많이 깎인(남은 체력이 낮은) 사람이 뒤 순위
      const down = alive.filter((p) => p.session!.info().runHp <= 0)
        .sort((x, y) => x.session!.info().runHp - y.session!.info().runHp || hpBefore.get(x.seat)! - hpBefore.get(y.seat)! || y.seat - x.seat);
      let place = this.alive().length;
      for (const p of down) p.place = place--;
      this.afterPlaces();
    } finally {
      this.resolving = false;
    }
    this.changed();
  }

  /** 순위가 바뀐 뒤: 한 명 남거나 마지막 라운드면 나머지 순위를 정하고, 세션에 알린다 */
  private afterPlaces(): void {
    const alive = this.alive();
    if (alive.length <= 1 || this.round >= this.totalRounds()) {
      const rest = alive.sort((a, b) => b.session!.info().runHp - a.session!.info().runHp || a.seat - b.seat);
      rest.forEach((p, i) => { p.place = i + 1; });
      this.clearDeadline();
    }
    for (const p of this.players) if (p.place !== null && p.session && p.session.info().place === null) p.session.finish(p.place);
  }

  /** 방장이 방을 닫을 때 */
  close(): void { this.clearDeadline(); }
}

function allySide(t: BattleTeamInput) {
  return {
    allies: t.units, activeTiers: t.activeTiers, strategies: t.strategies, ooparts: t.ooparts,
    runAtkBpsByUnit: t.runAtkBpsByUnit, fullEnergyUnitIds: t.fullEnergyUnitIds, dessert: t.dessert, dessertHalf: t.dessertHalf,
    gameDevBugs: t.gameDevBugs, serikaWins: t.serikaWins,
  };
}

/** 화면에 보일 이름: 앞뒤 공백 제거, 12자, 비면 「선생님 N」 */
export function cleanName(name: string, seat: number): string {
  const n = [...String(name ?? '').replace(/[\u0000-\u001f<>]/g, '').trim()].slice(0, 12).join('');
  return n || `선생님 ${seat + 1}`;
}
