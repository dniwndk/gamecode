import { useRef, useState } from 'react';
import { X, Download, Upload, Trash2 } from 'lucide-react';
import { useGame } from '../../store/gameStore';
import { playCue, unlockAudio } from '../../audio';

export function SettingsModal() {
  const settings = useGame((s) => s.settings);
  const update = useGame((s) => s.updateSettings);
  const close = () => useGame.getState().setSettingsOpen(false);
  const exportSave = useGame((s) => s.exportSave);
  const importSave = useGame((s) => s.importSave);
  const wipe = useGame((s) => s.wipe);
  const file = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');
  const [confirmWipe, setConfirmWipe] = useState(false);

  const doExport = () => {
    const blob = new Blob([exportSave()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `name-remains-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    setMsg('저장 파일을 내려받았습니다.');
  };

  const doImport = async (f: File) => {
    try {
      await importSave(await f.text());
      setMsg('기록을 불러왔습니다.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '불러오지 못했습니다.');
    }
  };

  const Row = ({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) => (
    <div className="flex items-center justify-between gap-4 border-b py-3" style={{ borderColor: 'var(--line)' }}>
      <div>
        <div className="text-[14px]">{label}</div>
        {hint && <div className="label">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );

  const Toggle = ({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) => (
    <button className="seg" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}>
      <span className="px-3 py-1.5 text-[13px]" style={on ? { background: 'var(--gold)', color: 'var(--gold-ink)', fontWeight: 700 } : undefined}>{on ? '켬' : '끔'}</span>
    </button>
  );

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="설정" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="card scroll-y p-5">
        <div className="mb-2 flex items-center justify-between">
          <b className="serif text-[19px]">설정</b>
          <button className="btn btn-ghost !min-h-8 !w-8 !p-0" aria-label="닫기" onClick={close}><X size={18} /></button>
        </div>
        <Row label="효과음" hint="모든 소리에는 [청각 자막]이 함께 나옵니다.">
          <Toggle label="효과음" on={settings.sound} onChange={(v) => { unlockAudio(); update({ sound: v }); if (v) playCue('chime'); }} />
        </Row>
        <Row label="음량">
          <input type="range" min={0} max={1} step={0.05} value={settings.volume} aria-label="음량" onChange={(e) => update({ volume: Number(e.target.value) })} onPointerUp={() => settings.sound && playCue('bell')} />
        </Row>
        <Row label="움직임 줄이기" hint="기록이 나타날 때의 움직임을 끕니다.">
          <Toggle label="움직임 줄이기" on={settings.reduceMotion} onChange={(v) => update({ reduceMotion: v })} />
        </Row>
        <Row label="자동 결정" hint="선택이 오면 가장 안전해 보이는 쪽을 대신 고릅니다.">
          <Toggle label="자동 결정" on={settings.autoDecide} onChange={(v) => update({ autoDecide: v })} />
        </Row>
        <Row label="글자 크기">
          <div className="seg">
            {([1, 1.1, 1.2] as const).map((v, i) => (
              <button key={v} aria-pressed={settings.textScale === v} onClick={() => update({ textScale: v })}>{['보통', '크게', '더 크게'][i]}</button>
            ))}
          </div>
        </Row>
        <Row label="화면">
          <div className="seg">
            <button aria-pressed={settings.theme === 'dark'} onClick={() => update({ theme: 'dark' })}>밤</button>
            <button aria-pressed={settings.theme === 'light'} onClick={() => update({ theme: 'light' })}>낮</button>
          </div>
        </Row>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button className="btn" onClick={doExport}><Download size={15} /> 기록 내보내기</button>
          <button className="btn" onClick={() => file.current?.click()}><Upload size={15} /> 기록 불러오기</button>
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && void doImport(e.target.files[0])} />
        </div>
        {!confirmWipe ? (
          <button className="btn mt-2 w-full" style={{ color: 'var(--red)' }} onClick={() => setConfirmWipe(true)}><Trash2 size={15} /> 모든 기록 지우기</button>
        ) : (
          <div className="mt-2 rounded-lg p-3" style={{ background: 'var(--red-bg)' }}>
            <div className="text-[13.5px]">진행 중인 삶, 생애실, 도감이 모두 지워집니다. 되돌릴 수 없습니다.</div>
            <div className="mt-2 flex justify-end gap-2">
              <button className="btn" onClick={() => setConfirmWipe(false)}>취소</button>
              <button className="btn" style={{ borderColor: 'var(--red)', color: 'var(--red)' }} onClick={async () => { await wipe(); setConfirmWipe(false); close(); }}>지우기</button>
            </div>
          </div>
        )}
        {msg && <p className="label mt-3">{msg}</p>}
        <p className="label mt-4 leading-[1.6]">단축키 — Space 일시정지 · [ ] 속도 · 1~9 선택 · N 다음 선택까지 · Esc 포기 확인</p>
      </div>
    </div>
  );
}
