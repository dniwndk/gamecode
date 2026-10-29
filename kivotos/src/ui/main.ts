// 화면 진입점. 화면 계층을 바꿀 때는 이 파일과 src/ui/* 만 바꾼다.
import { contentPack } from '../content';
import { createGameClient } from '../app/gameClient';
import { mountCatalogScreen } from './placeholder/catalogScreen';
import './placeholder/placeholder.css';

const client = createGameClient(contentPack, { assetBase: import.meta.env.BASE_URL });
mountCatalogScreen(document.getElementById('app')!, client);
