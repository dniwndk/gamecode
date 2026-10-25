import { ArrowLeft } from 'lucide-react';
import { useGame } from '../../store/gameStore';
import { bgById } from '../../content/backgrounds';
import { endpointById } from '../../content/progression';

export function ArchiveScreen() {
  const profile = useGame((s) => s.profile);
  const go = useGame((s) => s.go);
  return (
    <div className="noise-bg scroll-y h-full">
      <main className="mx-auto max-w-[680px] px-4 pb-16 pt-6">
        <button className="btn btn-ghost !px-1" onClick={() => go('title')}><ArrowLeft size={16} /> 돌아가기</button>
        <h1 className="serif mb-1 mt-3 text-[28px] font-bold">생애실</h1>
        <p className="muted m-0 text-[14px]">이 도시에서 살다 간 {profile.lives.length}명의 기록</p>
        {profile.lives.length === 0 && <p className="serif mt-10 text-center muted">아직 아무도 이곳에 이름을 남기지 않았습니다.</p>}
        <div className="mt-5 flex flex-col gap-2.5">
          {profile.lives.map((l) => (
            <article key={l.run_id} className="card p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <b className="serif text-[17px]">{l.name}</b>
                <span className="label">{new Date(l.ended_at_iso).toLocaleDateString('ko-KR')}</span>
              </div>
              <p className="serif m-0 mt-1.5 text-[14.5px] leading-[1.75]" style={{ color: 'var(--text-2)' }}>{l.epitaph}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className={`chip ${l.endpoint_type === 'abandoned' ? '' : 'chip-gold'}`}>{l.endpoint_type === 'abandoned' ? '중도 포기' : endpointById(l.endpoint_type)?.name}</span>
                <span className="chip">{bgById(l.background_id).name}</span>
                <span className="chip">{l.end_age}세</span>
                <span className="chip">업적 {l.achievement_ids.length}</span>
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
