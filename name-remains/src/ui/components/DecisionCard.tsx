import { AlertTriangle, Clock3, Lock, Search } from 'lucide-react';
import type { PendingDecisionSnapshot } from '../../domain/types';

export function DecisionCard({ pd, onChoose, compact = false }: { pd: PendingDecisionSnapshot; onChoose: (id: string) => void; compact?: boolean }) {
  return (
    <section className="decision" aria-label="선택" role="group">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <span className="chip chip-gold">
          <Clock3 size={11} /> 시간이 멈췄습니다
        </span>
        <b className="text-[14px]">{pd.title}</b>
        {pd.place && !compact && <span className="label">{pd.place}</span>}
      </div>
      <p className="serif m-0 mb-3 text-[16px] leading-[1.75]">{pd.prompt_text}</p>
      {pd.relevant_observations.length > 0 && (
        <div className="mb-3 rounded-lg px-3 py-2 text-[13px] leading-[1.6]" style={{ background: 'var(--teal-bg)', color: 'var(--text-2)' }}>
          <div className="mb-0.5 flex items-center gap-1.5 font-semibold" style={{ color: 'var(--teal)' }}>
            <Search size={13} /> 알고 있는 것
          </div>
          {pd.relevant_observations.map((o) => (
            <div key={o}>· {o}</div>
          ))}
        </div>
      )}
      <div className={`flex flex-col gap-2 ${compact ? 'scroll-y max-h-[46vh] pr-1' : ''}`}>
        {pd.choices.map((c, i) => (
          <button key={c.id} className="choice" disabled={!c.is_available} onClick={() => onChoose(c.id)} aria-keyshortcuts={String(i + 1)}>
            <span className="num">{c.is_available ? i + 1 : <Lock size={11} />}</span>
            <span>
              <span className="mb-1 flex flex-wrap items-center gap-1.5">
                <span className="chip">{c.tag}</span>
                {c.required_badges.map((b) => (
                  <span key={b} className="chip chip-gold">{b}</span>
                ))}
                {c.warning_badge && (
                  <span className="chip chip-red">
                    <AlertTriangle size={11} /> {c.warning_badge}
                  </span>
                )}
                {c.odds_label && c.odds_label !== '판정 없음' && <span className="chip chip-teal">{c.odds_label}</span>}
                {c.known_costs_label.map((k) => (
                  <span key={k} className="chip">{k}</span>
                ))}
              </span>
              <span className="txt block">{c.text}</span>
              {!c.is_available && c.unavailable_reason && <span className="label mt-1 block">{c.unavailable_reason}</span>}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
