import { AlertTriangle, Clock3, Hand, Lock, Search } from 'lucide-react';
import type { DecisionChoiceSnapshot, PendingDecisionSnapshot } from '../../domain/types';

function Hint({ items }: { items?: string[] }) {
  if (!items?.length) return null;
  return <span className="hint mt-1 block">영향 · {items.join(' · ')}</span>;
}

function ChoiceButton({ c, n, onChoose }: { c: DecisionChoiceSnapshot; n: number; onChoose: (id: string) => void }) {
  return (
    <button className={`choice ${c.minor ? 'choice-minor' : ''}`} disabled={!c.is_available} onClick={() => onChoose(c.id)} aria-keyshortcuts={String(n)}>
      <span className="num">{c.is_available ? n : <Lock size={11} />}</span>
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
        <Hint items={c.effect_hint} />
        {c.injury_note && <span className="hint hint-hurt mt-1 block">{c.injury_note}</span>}
        {!c.is_available && c.unavailable_reason && <span className="label mt-1 block">{c.unavailable_reason}</span>}
      </span>
    </button>
  );
}

export function DecisionCard({ pd, onChoose, compact = false }: { pd: PendingDecisionSnapshot; onChoose: (id: string) => void; compact?: boolean }) {
  // 번호(단축키)는 화면에 보이는 순서 그대로: 본 선택지 다음에 작은 행동
  const numbered = pd.choices.map((c, i) => ({ c, n: i + 1 }));
  const main = numbered.filter((x) => !x.c.minor);
  const minor = numbered.filter((x) => x.c.minor);
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
        {main.map(({ c, n }) => (
          <ChoiceButton key={c.id} c={c} n={n} onChoose={onChoose} />
        ))}
        {minor.length > 0 && (
          <>
            <div className="label mt-2 flex items-center gap-1.5">
              <Hand size={12} /> 작은 행동 · 하고 나서도 이 선택은 그대로 남습니다
            </div>
            {minor.map(({ c, n }) => (
              <ChoiceButton key={c.id} c={c} n={n} onChoose={onChoose} />
            ))}
          </>
        )}
      </div>
    </section>
  );
}
