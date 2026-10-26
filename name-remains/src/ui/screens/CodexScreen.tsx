import { useMemo, useState } from 'react';
import { ArrowLeft, Star, Lock } from 'lucide-react';
import { useGame } from '../../store/gameStore';
import { achievementViews } from '../../domain/publicSelectors';
import { TIER_LABEL } from '../../content/achievements';
import { BACKGROUNDS } from '../../content/backgrounds';
import { ENDPOINTS, PATHS } from '../../content/progression';
import { MAJOR_INCIDENTS } from '../../content/incidents';

type Tab = 'ach' | 'birth' | 'path' | 'end';

export function CodexScreen() {
  const profile = useGame((s) => s.profile);
  const run = useGame((s) => s.run);
  const go = useGame((s) => s.go);
  const toggleWatch = useGame((s) => s.toggleWatch);
  const [tab, setTab] = useState<Tab>('ach');
  const views = useMemo(() => achievementViews(profile, run), [profile, run]);
  const earned = views.filter((v) => v.earnedEver).length;
  const bornSet = new Set(profile.lives.map((l) => l.background_id));
  if (run) bornSet.add(run.run.person.background_id);
  const endSet = new Set(profile.lives.map((l) => l.endpoint_type));

  return (
    <div className="noise-bg scroll-y h-full">
      <main className="mx-auto max-w-[760px] px-4 pb-16 pt-6">
        <button className="btn btn-ghost !px-1" onClick={() => go('title')}><ArrowLeft size={16} /> 돌아가기</button>
        <h1 className="serif mb-1 mt-3 text-[28px] font-bold">도감</h1>
        <p className="muted m-0 text-[14px]">얻은 업적 {earned}/66 · 지나온 삶 {profile.lives.length}</p>
        <div className="seg mt-4 flex w-full" role="tablist">
          {([['ach', '업적'], ['birth', '출생'], ['path', '길과 정점'], ['end', '종점']] as Array<[Tab, string]>).map(([k, l]) => (
            <button key={k} className="flex-1" role="tab" aria-pressed={tab === k} aria-selected={tab === k} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>

        {tab === 'ach' && (
          <div className="mt-5">
            <p className="label mb-3 leading-[1.6]">아직 얻지 못한 업적은 이름과 암시만 보입니다. ☆를 누르면 인생 화면 오른쪽에서 지켜볼 수 있습니다(최대 6개).</p>
            {[1, 2, 3, 4, 5, 6].map((tier) => (
              <section key={tier} className="mb-6">
                <h2 className="mb-2 text-[14px] font-semibold" style={{ color: 'var(--gold)' }}>
                  {TIER_LABEL[tier]} <span className="muted font-normal">{views.filter((v) => v.tier === tier && v.earnedEver).length}/{views.filter((v) => v.tier === tier).length}</span>
                </h2>
                <div className="grid gap-2 sm:grid-cols-2">
                  {views.filter((v) => v.tier === tier).map((v) => (
                    <div key={v.id} className="card p-3.5" style={{ opacity: v.earnedEver ? 1 : 0.85, borderColor: v.earnedEver ? 'color-mix(in srgb, var(--gold) 45%, var(--line))' : undefined }}>
                      <div className="flex items-start justify-between gap-2">
                        <b className="text-[14.5px]" style={{ color: v.earnedEver ? 'var(--gold)' : 'var(--text)' }}>
                          {!v.earnedEver && <Lock size={12} className="mr-1 inline align-[-1px] opacity-60" />}
                          {v.title}
                        </b>
                        {!v.earnedEver && (
                          <button className="btn btn-ghost !min-h-6 !px-1" aria-label={v.watched ? '지켜보기 해제' : '지켜보기'} aria-pressed={v.watched} onClick={() => toggleWatch(v.id)}>
                            <Star size={14} fill={v.watched ? 'currentColor' : 'none'} style={{ color: v.watched ? 'var(--gold)' : 'var(--muted)' }} />
                          </button>
                        )}
                      </div>
                      <div className="serif mt-1 text-[13.5px] leading-[1.65]" style={{ color: 'var(--text-2)' }}>{v.hint}</div>
                      {v.revealed && <div className="mt-1.5 text-[12.5px] leading-[1.55] muted">{v.revealed}</div>}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {tab === 'birth' && (
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {BACKGROUNDS.map((b) => {
              const seen = bornSet.has(b.id);
              return (
                <div key={b.id} className="card p-3.5" style={{ opacity: seen ? 1 : 0.6 }}>
                  <div className="flex items-center justify-between">
                    <b>{seen ? b.name : '아직 태어나 보지 못한 삶'}</b>
                    <span className="label">출현 {(b.weight / 10).toFixed(1)}%</span>
                  </div>
                  <div className="mt-1 text-[13px] leading-[1.6]" style={{ color: 'var(--text-2)' }}>{seen ? b.summary : '이 출생으로 한 번 태어나면 기록됩니다.'}</div>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'path' && (
          <div className="mt-5 flex flex-col gap-2">
            {PATHS.map((p) => (
              <div key={p.id} className="card p-3.5">
                <div className="flex flex-wrap items-baseline gap-2">
                  <b className="serif text-[16px]" style={{ color: 'var(--gold)' }}>{p.apex}</b>
                  <span className="label">{p.tiers.slice(1).map((t) => t.name).join(' → ')}</span>
                </div>
                <div className="mt-1 text-[13.5px] leading-[1.6]" style={{ color: 'var(--text-2)' }}>{p.summary}</div>
              </div>
            ))}
            <h2 className="mb-1 mt-5 text-[14px] font-semibold" style={{ color: 'var(--gold)' }}>괴담 기록</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {MAJOR_INCIDENTS.map((d) => {
                const met = (profile.seen_incidents ?? []).includes(d.id) || !!run?.run.incident_history.some((h) => h.incident_id === d.id);
                return (
                  <div key={d.id} className="card px-3.5 py-2.5 text-[13.5px]">
                    <span className="chip mr-2">{['', '일상', '도시', '권역', '전설', '신화'][d.tier] ?? ''}</span>
                    {met ? d.title : <span className="muted">{d.place}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'end' && (
          <div className="mt-5 flex flex-col gap-2">
            {ENDPOINTS.map((e) => (
              <div key={e.id} className="card p-3.5" style={{ opacity: endSet.has(e.id) ? 1 : 0.7 }}>
                <b style={{ color: endSet.has(e.id) ? 'var(--gold)' : undefined }}>{e.name}</b>
                <div className="mt-1 text-[13.5px] leading-[1.6]" style={{ color: 'var(--text-2)' }}>{e.description}</div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
