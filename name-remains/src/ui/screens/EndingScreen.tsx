import { useState } from 'react';
import { Copy, RotateCcw, ScrollText, BookOpen, Home } from 'lucide-react';
import { useGame } from '../../store/gameStore';
import { buildEpitaph, positionName } from '../../domain/summary';
import { ACHIEVEMENTS, TIER_LABEL } from '../../content/achievements';
import { bgById } from '../../content/backgrounds';
import { endpointById, formById } from '../../content/progression';

export function EndingScreen() {
  const run = useGame((s) => s.lastEnded ?? s.run);
  const go = useGame((s) => s.go);
  const newLife = useGame((s) => s.newLife);
  const [copied, setCopied] = useState(false);
  if (!run) {
    go('title');
    return null;
  }
  const r = run.run;
  const p = r.person;
  const ep = r.endpoint;
  const epName = ep ? endpointById(ep.endpoint_type)?.name ?? ep.endpoint_type : '중도 포기';
  const epitaph = buildEpitaph(run);
  const achs = r.achievements.map((a) => ACHIEVEMENTS.find((x) => x.id === a.achievement_id)!).filter(Boolean);
  const age = Math.floor(r.clock.current_age_years);
  // 공유 문구에는 업적 이름을 넣지 않는다(다른 사람에게 스포일러가 되지 않게)
  const share = `《이름이 남는 동안》\n${p.name} — ${epitaph}\n종점: ${epName} · 업적 ${achs.length}개 · 생환 ${r.counters.clears ?? 0}회`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(share);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="noise-bg scroll-y h-full">
      <main className="mx-auto max-w-[640px] px-4 pb-16 pt-12">
        <div className="card px-6 py-8 text-center" style={{ borderColor: 'var(--line-2)' }}>
          <div className="label tracking-[0.2em]">여기 한 사람이 잠들다</div>
          <h1 className="serif mb-1 mt-3 text-[34px] font-bold">{p.name}</h1>
          <div className="muted text-[14px]">
            {bgById(p.background_id).name} · {age}세
          </div>
          <p className="serif mx-auto mt-5 max-w-[460px] text-[17px] leading-[1.9]">{epitaph}</p>
          <div className="mt-5 inline-flex flex-wrap justify-center gap-1.5">
            <span className="chip chip-gold">{epName}</span>
            <span className="chip">{positionName(run)}</span>
            <span className="chip">{formById(p.form_id).name}</span>
            <span className="chip">생환 {r.counters.clears ?? 0}회</span>
          </div>
        </div>

        {ep && <p className="serif mt-6 text-[16px] leading-[1.9]" style={{ color: 'var(--text-2)' }}>{ep.epilogue_text}</p>}

        <section className="mt-8">
          <h2 className="label mb-2 text-[13px]">이번 생에서 얻은 업적 {achs.length}</h2>
          {achs.length === 0 && <p className="muted text-[14px]">이번 생에는 남긴 업적이 없습니다.</p>}
          <div className="flex flex-col gap-2">
            {achs.map((a) => (
              <div key={a.id} className="card px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="chip">{TIER_LABEL[a.tier]}</span>
                  <b style={{ color: 'var(--gold)' }}>{a.title}</b>
                </div>
                <div className="mt-1 text-[13.5px] leading-[1.6]" style={{ color: 'var(--text-2)' }}>{a.revealed}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="label mb-2 text-[13px]">공유 문구 (업적 이름은 숨겨집니다)</h2>
          <pre className="card m-0 whitespace-pre-wrap p-4 text-[13.5px] leading-[1.7]" style={{ fontFamily: 'var(--sans)' }}>{share}</pre>
          <button className="btn mt-2" onClick={copy}><Copy size={15} /> {copied ? '복사했습니다' : '복사하기'}</button>
        </section>

        <div className="mt-10 grid grid-cols-2 gap-2.5">
          <button className="btn btn-gold col-span-2 !min-h-[48px] !text-[16px]" onClick={() => newLife('')}>
            <RotateCcw size={16} /> 다시 태어나기
          </button>
          <button className="btn !min-h-[44px]" onClick={() => go('archive')}><ScrollText size={15} /> 생애실</button>
          <button className="btn !min-h-[44px]" onClick={() => go('codex')}><BookOpen size={15} /> 도감</button>
          <button className="btn col-span-2 !min-h-[44px]" onClick={() => go('title')}><Home size={15} /> 처음 화면</button>
        </div>
        <p className="label mt-6 text-center">시드 {r.seed}</p>
      </main>
    </div>
  );
}
