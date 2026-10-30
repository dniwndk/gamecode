// 「블루 아카이브 풍」 화면 계층 진입점. 게임과는 GameClient(어댑터 경유)로만 이야기한다.
import type { GameClient } from '../../app/gameClient';
import { createDriver } from './adapter';
import { mountBlueUi } from './app';
// 글꼴은 저장소에 자체 호스팅한다(오프라인·PWA에서도 같은 모양, 외부 요청 없음). 메인 경기천년제목, 서브 Noto Sans
import '@fontsource-variable/noto-sans-kr';
import './fonts/fonts.css';
import './style.css';

export function mountBlueScreens(root: HTMLElement, client: GameClient): void {
  mountBlueUi(root, createDriver(client));
}
