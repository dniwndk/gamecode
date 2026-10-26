import { useState } from 'react';
import { BookOpen, Settings as Gear, ScrollText, Play } from 'lucide-react';
import { useGame } from '../../store/gameStore';
import { unlockAudio } from '../../audio';
import { bgById } from '../../content/backgrounds';

const RULES: Array<[string, string]> = [
  ['보름이 한 칸입니다.', ' 삶은 14일 단위로 저절로 흘러갑니다. 속도는 1배부터 8배까지 바꿀 수 있습니다.'],
  ['괴담 앞에서는 시간이 멈춥니다.', ' 큰 선택이 오면 진행이 멈추고 당신의 결정을 기다립니다. 자잘한 일은 기다려 주지 않습니다.'],
  ['어디서, 누구로 태어날지는 고를 수 없습니다.', ' 열여섯 가지 출생 중 하나가 무작위로 정해집니다. 빚, 저주, 낙인도 함께 태어납니다.'],
  ['조용한 나날은 한 줄의 일상으로 지나갑니다.', ' 생활 방침만 정해 두면 일하고, 쉬고, 수련하는 일은 알아서 굴러갑니다.'],
  ['괴담이 출근길에 섞여 있는 도시.', ' 누군가는 재난청 명함을 받고, 누군가는 심연과 계약하며, 아주 드물게 도시의 법칙이 됩니다.'],
];

export function TitleScreen() {
  const run = useGame((s) => s.run);
  const profile = useGame((s) => s.profile);
  const newLife = useGame((s) => s.newLife);
  const resume = useGame((s) => s.resume);
  const go = useGame((s) => s.go);
  const setSettingsOpen = useGame((s) => s.setSettingsOpen);
  const [name, setName] = useState('');
  const [seed, setSeed] = useState('');
  const active = run && run.run.run_status === 'playing' ? run : null;
  const earned = Object.keys(profile.achievements).length;

  const start = () => {
    unlockAudio();
    newLife(name.slice(0, 12), seed.slice(0, 40));
  };

  return (
    <div className="noise-bg min-h-full">
      <button className="btn btn-ghost fixed right-3 top-3 z-10 !min-h-10 !w-10 !rounded-full !p-0" aria-label="설정" onClick={() => setSettingsOpen(true)}>
        <Gear size={18} />
      </button>
      <main className="mx-auto max-w-[640px] px-4 pb-16 pt-14 sm:pt-20">
        <p className="mb-3 text-[13px] tracking-[0.08em]" style={{ color: 'var(--gold)' }}>
          괴담 생존 텍스트 인생 시뮬레이션
        </p>
        <h1 className="serif m-0 text-[40px] font-bold leading-[1.2] sm:text-[52px]">
          이름이 남는 동안
        </h1>
        <p className="serif mt-1 text-[17px]" style={{ color: 'var(--text-2)' }}>
          우리가 살아남는 동안
        </p>
        <p className="serif mt-6 text-[16.5px] leading-[1.85]" style={{ color: 'var(--text-2)' }}>
          재난안전문자가 하루에도 몇 번씩 울리고, 퇴근길 지하철이 가끔 존재하지 않는 역에 멈추는 도시. 이 도시에서는 지금도 누군가 태어납니다. 그 사람 하나가 되어, 끝까지 살아 보십시오.
        </p>

        {active && (
          <button className="card mt-7 flex w-full items-center gap-3 p-4 text-left" style={{ borderColor: 'var(--gold)' }} onClick={() => { unlockAudio(); resume(); }}>
            <Play size={18} style={{ color: 'var(--gold)' }} />
            <span className="flex-1">
              <span className="block font-semibold">이어하기 · {active.run.person.name}</span>
              <span className="label">{bgById(active.run.person.background_id).name} · {Math.floor(active.run.clock.current_age_years)}세</span>
            </span>
          </button>
        )}

        <div className="mt-7 flex flex-col gap-2.5">
          {RULES.map(([b, t]) => (
            <div key={b} className="card px-4 py-3 text-[14.5px] leading-[1.65]">
              <b style={{ color: 'var(--gold)' }}>{b}</b>
              <span style={{ color: 'var(--text-2)' }}>{t}</span>
            </div>
          ))}
        </div>

        <form
          className="mt-8"
          onSubmit={(e) => {
            e.preventDefault();
            start();
          }}
        >
          <label className="label mb-1.5 block" htmlFor="name">이름</label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input id="name" className="input sm:flex-1" placeholder="비워 두면 무작위" maxLength={12} value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
            <button type="submit" className="btn btn-gold !min-h-[46px] !px-6 !text-[16px]">
              {active ? '새로 태어나기' : '태어나기'}
            </button>
          </div>
          {active && <p className="label mt-2">새로 태어나면 진행 중인 삶은 생애실에 기록되지 않고 덮어씌워집니다.</p>}
          <details className="mt-4">
            <summary className="cursor-pointer text-[14px]" style={{ color: 'var(--muted)' }}>시드 정하기 (선택)</summary>
            <div className="mt-2">
              <input className="input !min-h-[40px] !text-[14px]" placeholder="예: 안개-0404" maxLength={40} value={seed} onChange={(e) => setSeed(e.target.value)} autoComplete="off" />
              <p className="label mt-1.5">같은 시드와 같은 선택은 언제나 같은 삶을 만듭니다.</p>
            </div>
          </details>
        </form>

        <div className="mt-8 grid grid-cols-2 gap-2.5">
          <button className="btn !min-h-[44px]" onClick={() => go('codex')}>
            <BookOpen size={16} /> 도감 <span className="muted">{earned}/66</span>
          </button>
          <button className="btn !min-h-[44px]" onClick={() => go('archive')}>
            <ScrollText size={16} /> 생애실 <span className="muted">{profile.lives.length}</span>
          </button>
        </div>

        <p className="mt-8 text-[13.5px] leading-[1.7]" style={{ color: 'var(--red)' }}>
          죽음, 실종, 신체 변이, 채무, 집단 재난 같은 무거운 소재를 다룹니다. 15세 이상에게 권합니다.
        </p>
        <p className="label mt-6">단축키 — Space 일시정지 · [ ] 속도 · 1~9 선택 · N 다음 선택까지</p>
        <p className="label mt-3 leading-[1.7]">
          이 게임의 인물, 단체, 지명, 사건은 모두 창작입니다. 진행 기록은 이 기기의 브라우저에만 저장됩니다.
        </p>
      </main>
    </div>
  );
}
