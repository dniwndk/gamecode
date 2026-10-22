// 설치형 웹앱: 서비스 워커 등록(배포 빌드에서만), 홈 화면 설치 안내, 새 판본 적용.
// 개발 서버(저장소 루트)에는 sw.js가 없으므로 빌드가 index.html에 심는 <meta name="brass-build">가 있을 때만 켠다.

const build = document.querySelector('meta[name="brass-build"]')?.content || '';
let deferred = null;     // 안드로이드·데스크톱 크롬의 설치 요청
let waiting = null;      // 내려받아 대기 중인 새 서비스 워커
const listeners = new Set();
const emit = () => listeners.forEach(fn => fn());

export const version = build;
export const standalone = () => matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || navigator.standalone === true;
// iPhone·iPad 사파리는 설치 요청 이벤트가 없어 공유 메뉴로 안내한다 (iPadOS는 맥으로 자칭하므로 터치로 가린다)
export const ios = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const canPrompt = () => !!deferred;
// 설치 항목을 보여 줄지: 이미 설치되어 열렸으면 숨기고, 크롬 계열은 요청이 왔을 때, iOS는 늘
export const installable = () => !standalone() && (canPrompt() || (build && ios()));
export const updateReady = () => !!waiting;
export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

export async function promptInstall() {
  if (!deferred) return 'unavailable';
  const ev = deferred;
  deferred = null;
  ev.prompt();
  const { outcome } = await ev.userChoice.catch(() => ({ outcome: 'dismissed' }));
  emit();
  return outcome;
}

export function applyUpdate() {
  if (!waiting) { location.reload(); return; }
  waiting.postMessage({ type: 'skip-waiting' });
}

export function initPwa({ onUpdate, onInstalled } = {}) {
  addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; emit(); });
  addEventListener('appinstalled', () => { deferred = null; emit(); onInstalled?.(); });
  if (!build || !('serviceWorker' in navigator) || !isSecureContext) return;

  const found = (sw) => { waiting = sw; emit(); onUpdate?.(); };
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // 새 판본을 고른 경우에만 다시 연다. 첫 설치 때의 controllerchange는 무시한다.
    if (!waiting || reloading) return;
    reloading = true;
    location.reload();
  });
  addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('sw.js', { scope: './' });
      if (reg.waiting && navigator.serviceWorker.controller) found(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const sw = reg.installing;
        sw?.addEventListener('statechange', () => {
          if (sw.state === 'installed' && navigator.serviceWorker.controller) found(sw);
        });
      });
      // 오래 켜 둔 탭도 새 판본을 알아차리게 한 시간마다, 그리고 다시 돌아올 때 확인한다
      setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
      document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
    } catch { /* 서비스 워커가 막혀도 게임은 온라인으로 그대로 돈다 */ }
  });
}
