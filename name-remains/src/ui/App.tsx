import { useEffect } from 'react';
import { flushNow, useGame } from '../store/gameStore';
import { TitleScreen } from './screens/TitleScreen';
import { LifeScreen } from './screens/LifeScreen';
import { EndingScreen } from './screens/EndingScreen';
import { CodexScreen } from './screens/CodexScreen';
import { ArchiveScreen } from './screens/ArchiveScreen';
import { SettingsModal } from './components/SettingsModal';
import { Toasts } from './components/Toasts';

export function App() {
  const ready = useGame((s) => s.ready);
  const screen = useGame((s) => s.screen);
  const settings = useGame((s) => s.settings);
  const settingsOpen = useGame((s) => s.settingsOpen);

  useEffect(() => {
    void useGame.getState().hydrate();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = settings.theme;
    root.style.setProperty('--text-scale', String(settings.textScale));
    root.classList.toggle('reduce-motion', settings.reduceMotion);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', settings.theme === 'light' ? '#f3efe6' : '#0f1115');
  }, [settings.theme, settings.textScale, settings.reduceMotion]);

  // 탭을 떠나면 멈추고 곧바로 저장한다
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') {
        useGame.getState().pause();
        flushNow();
      }
    };
    const onPageHide = () => flushNow();
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, []);

  if (!ready) {
    return <div className="grid h-full place-items-center muted">기록을 불러오는 중…</div>;
  }

  return (
    <>
      {screen === 'title' && <TitleScreen />}
      {screen === 'life' && <LifeScreen />}
      {screen === 'ending' && <EndingScreen />}
      {screen === 'codex' && <CodexScreen />}
      {screen === 'archive' && <ArchiveScreen />}
      {settingsOpen && <SettingsModal />}
      <Toasts />
    </>
  );
}
