import { useEffect, useState } from 'react';
import { Pause, Play, SkipForward, Bot, LogOut, Flag, Settings as Gear, User, Target, X } from 'lucide-react';
import { SPEED_MS, flushNow, useGame, type Speed } from '../../store/gameStore';
import { monthLabel, yearProgress } from '../../domain/publicSelectors';
import { personView, resourceBars } from '../../domain/publicSelectors';
import { Timeline } from '../components/Timeline';
import { DecisionCard } from '../components/DecisionCard';
import { GoalPanel, PersonPanel } from '../components/Panels';
import { unlockAudio } from '../../audio';

const SPEEDS: Speed[] = [1, 2, 4, 8];

function useTicker() {
  const playing = useGame((s) => s.playing);
  const speed = useGame((s) => s.speed);
  const status = useGame((s) => s.run?.run.run_status);
  useEffect(() => {
    if (!playing || status !== 'playing') return;
    const id = setInterval(() => useGame.getState().tick(), SPEED_MS[speed]);
    return () => clearInterval(id);
  }, [playing, speed, status]);
}

function useShortcuts(onAbandonAsk: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const g = useGame.getState();
      const run = g.run;
      if (!run) return;
      if (e.code === 'Space') {
        e.preventDefault();
        g.togglePlay();
      } else if (e.key === '[' || e.key === ']') {
        const i = SPEEDS.indexOf(g.speed);
        const ni = Math.max(0, Math.min(SPEEDS.length - 1, i + (e.key === ']' ? 1 : -1)));
        g.setSpeed(SPEEDS[ni]);
      } else if (/^[1-9]$/.test(e.key) && run.run.pending_decision) {
        const avail = run.run.pending_decision.choices;
        const c = avail[Number(e.key) - 1];
        if (c?.is_available) g.choose(c.id);
      } else if (e.key === 'n' || e.key === 'N') {
        g.skip();
      } else if (e.key === 'Escape') {
        onAbandonAsk();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onAbandonAsk]);
}

function Controls({ mobile = false }: { mobile?: boolean }) {
  const playing = useGame((s) => s.playing);
  const speed = useGame((s) => s.speed);
  const autoDecide = useGame((s) => s.settings.autoDecide);
  const ended = useGame((s) => s.run?.run.run_status !== 'playing');
  const g = useGame.getState;
  return (
    <div className={`flex items-center gap-2 ${mobile ? '' : 'flex-wrap justify-end'}`}>
      <div className="seg" role="group" aria-label="진행 속도">
        {SPEEDS.map((sp) => (
          <button key={sp} aria-pressed={speed === sp} onClick={() => g().setSpeed(sp)} style={mobile ? { minWidth: 34, padding: '0 6px' } : undefined}>
            x{sp}
          </button>
        ))}
      </div>
      <button className={`btn ${mobile ? '!w-10 !px-0' : ''}`} onClick={() => { unlockAudio(); g().togglePlay(); }} disabled={ended} aria-label={playing ? '일시정지' : '재생'}>
        {playing ? <Pause size={15} /> : <Play size={15} />}
        {!mobile && (playing ? '일시정지' : '재생')}
      </button>
      <button className={`btn ${mobile ? '!w-10 !px-0' : ''}`} onClick={() => g().skip()} disabled={ended} title="다음 선택까지 (N)" aria-label="다음 선택까지">
        <SkipForward size={15} /> {!mobile && '다음 선택까지'}
      </button>
      <button className={`btn ${mobile ? '!w-10 !px-0' : ''}`} aria-pressed={autoDecide} aria-label="자동 결정" title="자동 결정" onClick={() => g().updateSettings({ autoDecide: !autoDecide })} style={autoDecide ? { borderColor: 'var(--gold)', color: 'var(--gold)' } : undefined}>
        <Bot size={15} /> {!mobile && `자동 결정${autoDecide ? ' 켬' : ''}`}
      </button>
    </div>
  );
}

function MobileStrip() {
  const run = useGame((s) => s.run)!;
  useGame((s) => s.rev);
  const v = personView(run);
  const bars = resourceBars(run);
  const color = { hp: 'var(--hp)', fat: 'var(--fat)', krw: 'var(--krw)', sup: 'var(--sup)' } as const;
  return (
    <div className="border-b px-4 pb-2.5 pt-2" style={{ borderColor: 'var(--line)' }}>
      <div className="flex items-baseline justify-between gap-2">
        <b className="serif text-[16px]">{v.name}</b>
        <span className="truncate text-[13px] muted">{v.position} · {v.form}</span>
      </div>
      <div className="mt-1.5 grid grid-cols-4 gap-2.5">
        {bars.map((b) => (
          <div key={b.key}>
            <div className="flex justify-between text-[11.5px]">
              <span className="muted">{b.label}</span>
              <span className="tabular-nums" style={{ color: b.key === 'KRW' && run.run.person.resources.KRW < 0 ? 'var(--red)' : undefined }}>{b.key === 'HP' ? Math.max(0, run.run.person.resources.HP) : b.text}</span>
            </div>
            <div className="bar mt-0.5">
              <i style={{ width: `${Math.max(0, Math.min(100, (b.value / b.max) * 100))}%`, background: color[b.tone] }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LifeScreen() {
  const run = useGame((s) => s.run);
  const rev = useGame((s) => s.rev);
  const go = useGame((s) => s.go);
  const choose = useGame((s) => s.choose);
  const setSettingsOpen = useGame((s) => s.setSettingsOpen);
  const abandon = useGame((s) => s.abandon);
  const [sheet, setSheet] = useState<null | 'person' | 'goal'>(null);
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  useTicker();
  useShortcuts(() => setConfirmAbandon((v) => !v));

  if (!run) {
    return (
      <div className="grid h-full place-items-center">
        <button className="btn" onClick={() => go('title')}>처음 화면으로</button>
      </div>
    );
  }
  const pd = run.run.pending_decision;
  const ended = run.run.run_status !== 'playing';
  const age = Math.floor(run.run.clock.current_age_years);

  const footer = pd ? (
    <div className="mt-2">
      <DecisionCard pd={pd} onChoose={(id) => { unlockAudio(); choose(id); }} />
    </div>
  ) : ended ? (
    <div className="mt-6 flex flex-col items-center gap-3">
      <button className="btn btn-gold !min-h-[46px] !px-6" onClick={() => go('ending')}>
        결말 보기
      </button>
    </div>
  ) : null;

  const saveAndExit = () => {
    flushNow();
    go('title');
  };

  return (
    <div className="flex h-full flex-col">
      {/* 상단 막대 */}
      <header className="border-b" style={{ borderColor: 'var(--line)', background: 'var(--bg-2)' }}>
        <div className="flex items-center gap-3 px-4 py-2.5 lg:px-5">
          <div className="flex items-baseline gap-1.5">
            <span className="serif text-[30px] font-bold leading-none tabular-nums">{age}</span>
            <span className="muted text-[13px]">세</span>
            <span className="ml-1.5 text-[13px]" style={{ color: 'var(--gold)' }}>{monthLabel(run)}</span>
          </div>
          <div className="bar min-w-[60px] flex-1 lg:max-w-[340px]" aria-label="올해 진행">
            <i style={{ width: `${yearProgress(run) * 100}%`, background: 'var(--gold)' }} />
          </div>
          <div className="hidden flex-1 lg:block">
            <Controls />
          </div>
          <div className="hidden items-center gap-2 lg:flex">
            <button className="btn" onClick={saveAndExit}><LogOut size={15} /> 저장 후 나가기</button>
            {!ended && <button className="btn" onClick={() => setConfirmAbandon(true)}><Flag size={15} /> 포기하기</button>}
          </div>
          <button className="btn btn-ghost !min-h-9 !w-9 !p-0" aria-label="설정" onClick={() => setSettingsOpen(true)}><Gear size={17} /></button>
        </div>
        <div className="flex items-center gap-2 px-4 pb-2.5 lg:hidden">
          <Controls mobile />
        </div>
      </header>
      <div className="lg:hidden">
        <MobileStrip />
        <div className="grid grid-cols-4 gap-1.5 border-b px-4 py-1.5" style={{ borderColor: 'var(--line)' }}>
          <button className="btn btn-ghost !min-h-8 !px-1 !text-[12.5px]" onClick={() => setSheet('person')}><User size={14} /> 인물</button>
          <button className="btn btn-ghost !min-h-8 !px-1 !text-[12.5px]" onClick={() => setSheet('goal')}><Target size={14} /> 목표</button>
          <button className="btn btn-ghost !min-h-8 !px-1 !text-[12.5px]" onClick={saveAndExit}><LogOut size={14} /> 저장</button>
          <button className="btn btn-ghost !min-h-8 !px-1 !text-[12.5px]" onClick={() => setConfirmAbandon(true)} disabled={ended}><Flag size={14} /> 포기</button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <aside className="scroll-y hidden w-[300px] shrink-0 border-r p-4 lg:block" style={{ borderColor: 'var(--line)' }}>
          <PersonPanel s={run} />
          <div className="mt-3 xl:hidden">
            <GoalPanel s={run} />
          </div>
        </aside>
        <main className="min-w-0 flex-1">
          <Timeline logs={run.run.timeline_logs} rev={rev} footer={footer} />
        </main>
        <aside className="scroll-y hidden w-[310px] shrink-0 border-l p-4 xl:block" style={{ borderColor: 'var(--line)' }}>
          <GoalPanel s={run} />
        </aside>
      </div>

      {sheet && (
        <>
          <div className="sheet-backdrop" onClick={() => setSheet(null)} />
          <div className="sheet scroll-y" role="dialog" aria-label={sheet === 'person' ? '인물' : '목표'}>
            <div className="grab" />
            <div className="mb-2 flex items-center justify-between">
              <b>{sheet === 'person' ? '인물' : '목표 · 방침'}</b>
              <button className="btn btn-ghost !min-h-8 !w-8 !p-0" aria-label="닫기" onClick={() => setSheet(null)}><X size={17} /></button>
            </div>
            {sheet === 'person' ? <PersonPanel s={run} /> : <GoalPanel s={run} />}
          </div>
        </>
      )}

      {confirmAbandon && !ended && (
        <div className="modal" role="dialog" aria-modal="true">
          <div className="card p-5">
            <b className="serif text-[18px]">이 삶을 여기서 덮을까요?</b>
            <p className="mt-2 text-[14px] leading-[1.7]" style={{ color: 'var(--text-2)' }}>
              포기한 삶도 생애실에 남지만, 종점에 닿지 않았으므로 「마지막 줄」 같은 업적은 얻지 못합니다. 되돌릴 수 없습니다.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button className="btn" onClick={() => setConfirmAbandon(false)}>계속 살기</button>
              <button className="btn" style={{ borderColor: 'var(--red)', color: 'var(--red)' }} onClick={() => { setConfirmAbandon(false); abandon(); }}>포기하기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
