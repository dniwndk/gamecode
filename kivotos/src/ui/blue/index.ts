// 「블루 아카이브 풍」 화면 계층 진입점. 게임과는 GameClient(어댑터 경유)로만 이야기한다.
import type { GameClient } from '../../app/gameClient';
import { createDriver } from './adapter';
import { mountBlueUi } from './app';
import './style.css';

export function mountBlueScreens(root: HTMLElement, client: GameClient): void {
  mountBlueUi(root, createDriver(client));
}
