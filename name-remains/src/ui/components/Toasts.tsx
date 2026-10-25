import { useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { useGame } from '../../store/gameStore';
import { TIER_LABEL } from '../../content/achievements';

export function Toasts() {
  const toasts = useGame((s) => s.toasts);
  const dismiss = useGame((s) => s.dismissToast);
  useEffect(() => {
    if (!toasts.length) return;
    const t = setTimeout(() => dismiss(toasts[0].key), 4200);
    return () => clearTimeout(t);
  }, [toasts, dismiss]);
  if (!toasts.length) return null;
  // 한꺼번에 여럿 풀려도 화면을 가리지 않도록 최근 두 개만 띄운다(전부 타임라인에 남는다)
  const shown = toasts.slice(-2);
  const more = toasts.length - shown.length;
  return (
    <div className="pointer-events-none fixed bottom-[calc(12px+env(safe-area-inset-bottom))] left-1/2 z-[60] flex w-[min(92vw,380px)] -translate-x-1/2 flex-col gap-2 lg:bottom-5 lg:left-auto lg:right-5 lg:translate-x-0" role="status">
      {more > 0 && <div className="label self-end">업적 {more}개 더 · 기록에 남았습니다</div>}
      {shown.map((t) => (
        <div key={t.key} className="toast card flex items-center gap-3 px-4 py-2.5 text-left" style={{ borderColor: 'var(--gold)', boxShadow: 'var(--shadow)' }}>
          <Sparkles size={18} style={{ color: 'var(--gold)', flex: 'none' }} />
          <span>
            <span className="label block">업적 해금 · {TIER_LABEL[t.tier]}</span>
            <b>{t.title}</b>
          </span>
        </div>
      ))}
    </div>
  );
}
