import { Check, Circle, Star, Users, FileSignature, Sparkles, Search } from 'lucide-react';
import type { CrisisPriorityType, FocusType, RunState } from '../../domain/types';
import { achievementViews, goalView, personView, resourceBars } from '../../domain/publicSelectors';
import { CRISIS_HINT, CRISIS_LABEL, FOCUS_HINT, FOCUS_LABEL } from '../../content/activities';
import { useGame } from '../../store/gameStore';

const BAR_COLOR = { hp: 'var(--hp)', fat: 'var(--fat)', krw: 'var(--krw)', sup: 'var(--sup)' } as const;

export function ResourceBars({ s }: { s: RunState }) {
  return (
    <div className="flex flex-col gap-2.5">
      {resourceBars(s).map((b) => (
        <div key={b.key}>
          <div className="mb-1 flex justify-between text-[13px]">
            <span>{b.label}</span>
            <span className="tabular-nums" style={{ color: b.key === 'KRW' && s.run.person.resources.KRW < 0 ? 'var(--red)' : undefined }}>{b.text}</span>
          </div>
          <div className="bar">
            <i style={{ width: `${Math.max(0, Math.min(100, (b.value / b.max) * 100))}%`, background: BAR_COLOR[b.tone] }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Stat({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div className="flex items-center gap-2 text-[13px]">
      <span className="w-[86px] shrink-0" style={{ color: 'var(--text-2)' }}>{label}</span>
      <div className="bar flex-1">
        <i style={{ width: `${(value / max) * 100}%`, background: 'var(--muted)' }} />
      </div>
      <span className="w-7 text-right tabular-nums">{value}</span>
    </div>
  );
}

export function PersonPanel({ s }: { s: RunState }) {
  const v = personView(s);
  return (
    <div className="flex flex-col gap-3">
      <div className="card p-4">
        <div className="serif text-[19px] font-bold">{v.name}</div>
        <div className="label">{v.background}</div>
        <p className="m-0 mt-2 text-[13px] leading-[1.6]" style={{ color: 'var(--text-2)' }}>{v.backgroundSummary}</p>
      </div>
      {s.run.run_status === 'playing' && <PlanControls s={s} />}
      <div className="card p-4">
        <div className="flex items-baseline justify-between">
          <span className="serif text-[16px] font-bold">{v.region}</span>
          <span className="label">위험 {v.regionRisk}</span>
        </div>
        <p className="m-0 mt-1.5 text-[13px] leading-[1.6]" style={{ color: 'var(--text-2)' }}>{v.regionText}</p>
        <div className="label mt-1.5">월 생활비 {v.monthlyCost}만원</div>
      </div>
      <div className="card grid grid-cols-2 gap-3 p-4">
        <div>
          <div className="label">직위</div>
          <div className="font-semibold">{v.position}</div>
        </div>
        <div>
          <div className="label">존재 형태</div>
          <div className="font-semibold" style={{ color: v.isHuman ? undefined : 'var(--violet)' }}>{v.form}</div>
        </div>
        {v.lifeStatus === 'postmortem' && <div className="chip chip-teal col-span-2 justify-center">사후 지속 중</div>}
        {(v.bodies > 1 || v.beacons > 0) && (
          <div className="label col-span-2">{v.bodies > 1 ? `몸 ${v.bodies}구 ` : ''}{v.beacons > 0 ? `귀환 표식 ${v.beacons}개` : ''}</div>
        )}
      </div>
      <div className="card p-4">
        <ResourceBars s={s} />
      </div>
      <div className="card flex flex-col gap-2 p-4">
        <div className="label">적성 (0~10)</div>
        {v.aptitudes.map((a) => <Stat key={a.key} label={a.label} value={a.value} max={10} />)}
        <div className="label mt-2">숙련 (0~100)</div>
        {v.masteries.map((m) => <Stat key={m.key} label={m.label} value={m.value} max={100} />)}
      </div>
      <div className="card p-4">
        <div className="label mb-2 flex items-center gap-1.5"><Sparkles size={12} /> 능력 {v.capabilities.length}</div>
        {v.capabilities.length === 0 && <div className="label">아직 없음</div>}
        <div className="flex flex-col gap-2">
          {v.capabilities.map((c) => (
            <details key={c.id} className="text-[13px]">
              <summary className="cursor-pointer" style={{ color: 'var(--gold)' }}>{c.name}</summary>
              <div className="mt-1 leading-[1.6]" style={{ color: 'var(--text-2)' }}>{c.effect}</div>
              <div className="label leading-[1.5]">한계: {c.limit}</div>
            </details>
          ))}
        </div>
      </div>
      {(v.relationships.length > 0 || v.contracts.length > 0) && (
        <div className="card p-4">
          {v.relationships.length > 0 && (
            <>
              <div className="label mb-1.5 flex items-center gap-1.5"><Users size={12} /> 인연</div>
              {v.relationships.map((r) => (
                <div key={r.id} className="flex justify-between text-[13px]" style={{ opacity: r.alive ? 1 : 0.5 }}>
                  <span>{r.label}{r.alive ? '' : ' (실종)'}</span>
                  <span className="tabular-nums muted">신뢰 {r.trust}</span>
                </div>
              ))}
            </>
          )}
          {v.contracts.length > 0 && (
            <>
              <div className="label mb-1.5 mt-3 flex items-center gap-1.5"><FileSignature size={12} /> 계약</div>
              {v.contracts.map((c) => (
                <div key={c.id} className="flex justify-between text-[13px]">
                  <span>{c.label}</span>
                  <span className={c.active ? '' : 'muted'} style={{ color: c.active ? 'var(--gold)' : undefined }}>{c.status}</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}
      {v.injuries.length > 0 && (
        <div className="card p-4" style={{ borderColor: 'color-mix(in srgb, var(--red) 45%, var(--line))' }}>
          <div className="label mb-1.5" style={{ color: 'var(--red)' }}>영구 상해 {v.injuries.length}</div>
          <div className="flex flex-col gap-1">
            {v.injuries.map((j) => (
              <div key={j.id} className="flex justify-between gap-2 text-[13px]">
                <span>{j.name}</span>
                <span className="muted tabular-nums">{j.effect}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {v.marks.length > 0 && (
        <div className="card p-4">
          <div className="label mb-1.5">흔적</div>
          <div className="flex flex-wrap gap-1.5">
            {v.marks.map((m, i) => <span key={i} className="chip">{m}</span>)}
          </div>
        </div>
      )}
    </div>
  );
}

export function PlanControls({ s }: { s: RunState }) {
  const setPlan = useGame((st) => st.setPlan);
  const { focus, crisis_priority } = s.run.life_plan;
  return (
    <div className="card flex flex-col gap-3 p-4">
      <div>
        <label className="label mb-1 block" htmlFor="focus">생활 방침</label>
        <select id="focus" className="select" value={focus} onChange={(e) => setPlan(e.target.value as FocusType, crisis_priority)}>
          {(Object.keys(FOCUS_LABEL) as FocusType[]).map((k) => <option key={k} value={k}>{FOCUS_LABEL[k]}</option>)}
        </select>
        <p className="label m-0 mt-1 leading-[1.5]">{FOCUS_HINT[focus]}</p>
      </div>
      <div>
        <label className="label mb-1 block" htmlFor="crisis">위기 원칙</label>
        <select id="crisis" className="select" value={crisis_priority} onChange={(e) => setPlan(focus, e.target.value as CrisisPriorityType)}>
          {(Object.keys(CRISIS_LABEL) as CrisisPriorityType[]).map((k) => <option key={k} value={k}>{CRISIS_LABEL[k]}</option>)}
        </select>
        <p className="label m-0 mt-1 leading-[1.5]">{CRISIS_HINT[crisis_priority]}</p>
      </div>
    </div>
  );
}

export function GoalPanel({ s }: { s: RunState }) {
  const profile = useGame((st) => st.profile);
  const toggleWatch = useGame((st) => st.toggleWatch);
  const g = goalView(s);
  const views = achievementViews(profile, s);
  const thisRun = views.filter((a) => a.earnedThisRun);
  const watched = views.filter((a) => a.watched && !a.earnedThisRun);
  const v = personView(s);
  return (
    <div className="flex flex-col gap-3">
      <div className="card p-4">
        <div className="label mb-1">목표</div>
        {g.hasPath ? (
          <>
            <div className="serif text-[16px] font-bold">정점 · {g.apex}</div>
            <div className="mt-2 flex flex-col gap-1">
              {g.tiers.map((t) => (
                <div key={t.name} className="flex items-center gap-2 text-[13px]" style={{ color: t.reached ? 'var(--gold)' : 'var(--muted)' }}>
                  {t.reached ? <Check size={13} /> : <Circle size={11} />} {t.name}
                </div>
              ))}
            </div>
            {g.next ? (
              <div className="mt-3 rounded-lg p-3" style={{ background: 'var(--panel-2)' }}>
                <div className="mb-1 text-[13px] font-semibold">다음 단계 · {g.next.name}</div>
                {g.next.lines.map((l) => (
                  <div key={l.text} className="flex items-start gap-1.5 text-[12.5px] leading-[1.6]" style={{ color: l.met ? 'var(--good)' : 'var(--text-2)' }}>
                    {l.met ? <Check size={12} className="mt-1 shrink-0" /> : <Circle size={9} className="mt-1.5 shrink-0" />} {l.text}
                  </div>
                ))}
              </div>
            ) : (
              <p className="m-0 mt-2 text-[12.5px] leading-[1.6]" style={{ color: 'var(--text-2)' }}>{g.apexPower}</p>
            )}
          </>
        ) : (
          <>
            <div className="serif text-[15px] font-bold">{g.title}</div>
            <p className="m-0 mt-1.5 text-[12.5px] leading-[1.6]" style={{ color: 'var(--text-2)' }}>{g.text}</p>
          </>
        )}
        <div className="label mt-3">살아 돌아온 사건 {g.clears}회</div>
      </div>

      {watched.length > 0 && (
        <div className="card p-4">
          <div className="label mb-1.5 flex items-center gap-1.5"><Star size={12} /> 지켜보는 업적</div>
          {watched.map((a) => (
            <div key={a.id} className="mb-2 text-[13px] leading-[1.55]">
              <div className="flex items-center justify-between gap-2">
                <b>{a.title}</b>
                <button className="btn btn-ghost !min-h-6 !px-1" aria-label="지켜보기 해제" onClick={() => toggleWatch(a.id)}><Star size={13} fill="currentColor" style={{ color: 'var(--gold)' }} /></button>
              </div>
              <div className="muted">{a.hint}</div>
            </div>
          ))}
        </div>
      )}

      <div className="card p-4">
        <div className="label mb-1.5">이번 생의 업적 {thisRun.length}</div>
        {thisRun.length === 0 && <div className="label">아직 없음</div>}
        {thisRun.map((a) => (
          <div key={a.id} className="mb-1.5 text-[13px]">
            <span className="chip mr-1.5">{a.tierLabel.split(' ')[0]}</span>
            <b style={{ color: 'var(--gold)' }}>{a.title}</b>
          </div>
        ))}
      </div>

      {v.clues.length > 0 && (
        <div className="card p-4">
          <div className="label mb-1.5 flex items-center gap-1.5"><Search size={12} /> 단서 {v.clues.length}</div>
          {v.clues.map((c) => (
            <details key={c.id} className="text-[13px]">
              <summary className="cursor-pointer">{c.label}</summary>
              <div className="mb-1 leading-[1.6]" style={{ color: 'var(--text-2)' }}>{c.text}</div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
