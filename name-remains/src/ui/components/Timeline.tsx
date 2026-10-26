import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { MessageSquareText, Clock3, Sparkles } from 'lucide-react';
import type { TimelineLog } from '../../domain/types';

const PAGE = 240;

function Deltas({ items }: { items?: string[] }) {
  if (!items?.length) return null;
  return (
    <div className="tl-deltas">
      {items.map((d, i) => {
        const neg = /\s-/.test(d) || d.includes('실종') || d.includes('상실') || d.startsWith('영구 상해');
        const pos = /\s\+/.test(d) && !d.startsWith('피로');
        const fatigueUp = d.startsWith('피로 +');
        return (
          <span key={i} className={fatigueUp || neg ? 'down' : pos ? 'up' : ''}>
            {d}
          </span>
        );
      })}
    </div>
  );
}

function Caption({ log }: { log: TimelineLog }) {
  if (!log.accessibility_caption) return null;
  return <div className="tl-caption">[청각 자막] {log.accessibility_caption}</div>;
}

function Badges({ items, tone = 'gold' }: { items?: string[]; tone?: 'gold' | 'red' | 'teal' }) {
  if (!items?.length) return null;
  return (
    <>
      {items.map((b) => (
        <span key={b} className={`chip chip-${b.includes('실패') ? 'red' : b.includes('성공') ? 'teal' : tone}`}>
          {b.startsWith('멈춘 시계') ? <Clock3 size={11} /> : null}
          {b}
        </span>
      ))}
    </>
  );
}

function lifeStage(age: number): string {
  if (age <= 2) return '갓난아기';
  if (age <= 6) return '어린 시절';
  if (age <= 12) return '초등학생';
  if (age <= 18) return '청소년기';
  return '사회에 나오기 전';
}

const LogItem = memo(function LogItem({ log }: { log: TimelineLog }) {
  switch (log.kind) {
    case 'birth':
      return (
        <div className="tl-item tl-accent">
          <div className="tl-title" style={{ color: 'var(--gold)' }}>출생 · {log.title}</div>
          <p className="tl-body m-0">{log.body}</p>
        </div>
      );
    case 'childhood':
      return (
        <div className="tl-item tl-quiet">
          <div className="tl-title">
            {lifeStage(log.age_years)}
            {log.title ? ` · ${log.title}` : ''}
          </div>
          <p className="tl-body m-0">{log.body}</p>
          <Deltas items={log.deltas} />
        </div>
      );
    case 'auto_activity':
      return (
        <div className="tl-item tl-quiet">
          <div className="tl-title">{log.title?.startsWith('한 해') ? log.title : `${log.month}월 · ${log.title}`}</div>
          <p className="tl-body m-0">{log.body}</p>
          <Deltas items={log.deltas} />
        </div>
      );
    case 'epistolary_notice':
      return (
        <div className="tl-item">
          <div className="sms" style={log.tone === 'danger' ? { borderColor: 'var(--red)' } : undefined}>
            <div className="from">
              <MessageSquareText size={13} /> {log.notice_from ?? '알림'}
              {log.title ? <span>· {log.title}</span> : null}
              <Badges items={log.badges} tone="teal" />
            </div>
            <p className="tl-body m-0">{log.body}</p>
            <Deltas items={log.deltas} />
          </div>
          <Caption log={log} />
        </div>
      );
    case 'minor_event':
      return (
        <div className="tl-item">
          <div className="tl-title">
            {log.month}월 · {log.title}
            <Badges items={log.badges} tone="teal" />
          </div>
          <p className="tl-body m-0">{log.body}</p>
          <Deltas items={log.deltas} />
          <Caption log={log} />
        </div>
      );
    case 'incident_auto':
    case 'postmortem':
      if (log.place || (log.title && log.badges?.length)) {
        const cls = log.kind === 'postmortem' || log.tone === 'boundary' ? 'pm' : log.tone === 'danger' ? '' : 'call';
        return (
          <div className={`tl-item incident ${cls}`}>
            <div className="head">
              <h3>{log.title}</h3>
              {log.place && <span className="label">{log.place}</span>}
            </div>
            {log.badges?.length ? (
              <div className="mb-2 flex flex-wrap gap-1.5">
                <Badges items={log.badges} tone={log.tone === 'danger' ? 'red' : 'teal'} />
              </div>
            ) : null}
            {log.body && <p className="tl-body m-0">{log.body}</p>}
            <Deltas items={log.deltas} />
            <Caption log={log} />
          </div>
        );
      }
      return (
        <div className={`tl-item ${log.kind === 'postmortem' || log.tone === 'boundary' ? 'violet' : log.tone === 'danger' ? 'result-bad' : 'tl-accent'}`}>
          {log.title && <div className="tl-title">{log.title}</div>}
          <p className="tl-body m-0">{log.body}</p>
          <Deltas items={log.deltas} />
          <Caption log={log} />
        </div>
      );
    case 'decision_taken':
      return (
        <div className="tl-item choice-taken">
          <span>▸ {log.title}</span>
          <span className="muted text-[13px]" style={{ fontFamily: 'var(--serif)' }}>{log.body}</span>
        </div>
      );
    case 'incident_result':
      return (
        <div className={`tl-item ${log.tone === 'danger' ? 'result-bad' : 'result-good'}`}>
          {log.badges?.length ? (
            <div className="tl-title">
              <Badges items={log.badges} />
            </div>
          ) : null}
          <p className="tl-body m-0">{log.body}</p>
          <Deltas items={log.deltas} />
          <Caption log={log} />
        </div>
      );
    case 'power_override':
      return (
        <div className="tl-item override">
          <div className="tl-title" style={{ color: 'var(--gold)' }}>
            <Sparkles size={13} /> {log.title}
          </div>
          <p className="tl-body m-0">{log.body}</p>
          <Deltas items={log.deltas} />
        </div>
      );
    case 'milestone':
      if (log.title?.startsWith('업적')) {
        return (
          <div className="tl-item ach-line">
            <Sparkles size={15} style={{ color: 'var(--gold)', flex: 'none' }} />
            <div>
              <b style={{ color: 'var(--gold)' }}>{log.title}</b>
              <span className="chip ml-2">{log.badges?.[0]}</span>
              <div className="muted text-[13px]">{log.body}</div>
            </div>
          </div>
        );
      }
      return (
        <div className={`tl-item ${log.tone === 'boundary' ? 'boundary' : log.tone === 'quiet' ? 'tl-quiet' : 'tl-accent'}`}>
          <div className="tl-title" style={{ color: log.tone === 'gold' ? 'var(--gold)' : log.tone === 'boundary' ? 'var(--teal)' : undefined }}>
            {log.title}
            {log.place ? <span className="muted">· {log.place}</span> : null}
          </div>
          <p className="tl-body m-0">{log.body}</p>
          <Deltas items={log.deltas} />
          <Caption log={log} />
        </div>
      );
    case 'endpoint':
      return (
        <div className="tl-item endpoint">
          <div className="label mb-1">종점</div>
          <h3 className="serif m-0 mb-3 text-[24px]" style={{ color: log.tone === 'gold' ? 'var(--gold)' : 'var(--text)' }}>{log.title}</h3>
          <p className="tl-body m-0">{log.body}</p>
        </div>
      );
  }
});

/** 나이가 바뀌는 자리에 구분선을 넣는다 */
function withDividers(logs: TimelineLog[]) {
  const out: Array<{ key: string; age?: number; log?: TimelineLog }> = [];
  let lastAge = -1;
  for (const l of logs) {
    if (l.kind !== 'birth' && l.age_years !== lastAge) out.push({ key: `age-${l.log_id}`, age: l.age_years });
    lastAge = l.age_years;
    out.push({ key: l.log_id, log: l });
  }
  return out;
}

export function Timeline({ logs, rev, footer }: { logs: TimelineLog[]; rev: number; footer?: React.ReactNode }) {
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const [limit, setLimit] = useState(PAGE);
  const shown = logs.length > limit ? logs.slice(logs.length - limit) : logs;

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const onScroll = () => {
      stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 140;
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [rev, logs.length, footer]);

  return (
    <div ref={scroller} className="scroll-y h-full" aria-live="polite" aria-relevant="additions">
      <div className="tl">
        {logs.length > limit && (
          <div className="mb-6 text-center">
            <button className="btn" onClick={() => setLimit((l) => l + PAGE)}>
              이전 기록 더 보기 ({logs.length - limit})
            </button>
          </div>
        )}
        {withDividers(shown).map((x) =>
          x.log ? <LogItem key={x.key} log={x.log} /> : <div key={x.key} className="age-divider">{x.age}세</div>,
        )}
        {footer}
      </div>
    </div>
  );
}
