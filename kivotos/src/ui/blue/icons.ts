// UI 아이콘(24px 격자, currentColor). 사양서 12.2의 이름을 따른다. 외부 파일 없이 동작한다.
import { svg } from './dom';

const PATHS: Record<string, string> = {
  heart: 'M12 21s-7.5-4.6-9.6-9.3C.9 8.2 3 4.5 6.6 4.5c2.1 0 3.6 1.2 4.4 2.6.8-1.4 2.3-2.6 4.4-2.6 3.6 0 5.7 3.7 4.2 7.2C19.5 16.4 12 21 12 21z',
  gold: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 3.2 1.5 3.3 3.5.4-2.6 2.4.7 3.5L12 14l-3.1 1.8.7-3.5L7 9.9l3.5-.4z',
  vault: 'M4 4h16v14H4zM6 18v2M18 18v2M12 8a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm0-2v2m0 6v2m4-5h-2m-4 0H8',
  xp: 'M12 2 4 13h6l-1 9 9-12h-6z',
  reroll: 'M20 11a8 8 0 0 0-14.3-4.9L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16m0 4v-4h-4',
  lock: 'M6 10h12v10H6zM8.5 10V7a3.5 3.5 0 0 1 7 0v3M12 14v2.5',
  unlock: 'M6 10h12v10H6zM8.5 10V7a3.5 3.5 0 0 1 6.8-1.2M12 14v2.5',
  sell: 'M3 12 12 3h8v8l-9 9zM16 7.5h.01',
  star: 'M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z',
  front: 'M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5zM12 7v9M8.5 11h7',
  rear: 'M12 13a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM8.5 8a5 5 0 0 0 0 7M15.5 8a5 5 0 0 1 0 7M5.6 5a9 9 0 0 0 0 13M18.4 5a9 9 0 0 1 0 13M12 13v8',
  bench: 'M3 10h18M5 10v8M19 10v8M3 14h18M7 6h10v4H7z',
  equipment: 'M14.5 4.5l5 5-9.5 9.5H5v-5zM12.5 6.5l5 5',
  strategy: 'M4 4h16v16H4zM8 9l2 2 4-4M8 15h8',
  pin: 'M9 3h6l-1 6 3 3v2H7v-2l3-3zM12 14v7',
  info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 10.5V16M12 7.5h.01',
  close: 'M6 6l12 12M18 6 6 18',
  play: 'M7 4.5v15l12-7.5z',
  pause: 'M7 5h3.5v14H7zM13.5 5H17v14h-3.5z',
  skip: 'M5 5v14l9-7zM15 5h3v14h-3z',
  settings: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM19.4 13.5l1.6 1.2-2 3.4-1.9-.7a7.6 7.6 0 0 1-2 1.2L14.8 21h-4l-.3-2.4a7.6 7.6 0 0 1-2-1.2l-1.9.7-2-3.4 1.6-1.2a7.4 7.4 0 0 1 0-2.4L4.6 9.9l2-3.4 1.9.7a7.6 7.6 0 0 1 2-1.2L10.8 3h4l.3 2.4a7.6 7.6 0 0 1 2 1.2l1.9-.7 2 3.4-1.6 1.2a7.4 7.4 0 0 1 0 2.4z',
  codex: 'M4 4.5A1.5 1.5 0 0 1 5.5 3H20v16H5.5A1.5 1.5 0 0 0 4 20.5zM4 20.5A1.5 1.5 0 0 0 5.5 22H20M8 7h8M8 11h6',
  records: 'M5 3h14v18H5zM8 8h8M8 12h8M8 16h5',
  import: 'M12 3v12m0 0-4-4m4 4 4-4M4 17v3h16v-3',
  export: 'M12 15V3m0 0L8 7m4-4 4 4M4 17v3h16v-3',
  warning: 'M12 3 2 20h20zM12 9v5M12 17h.01',
  crown: 'M3 7l4.5 4L12 4l4.5 7L21 7l-2 12H5z',
  skull: 'M12 3c-4.4 0-8 3.2-8 7.5 0 2.6 1.3 4.5 3 5.6V19h2.5v-2h1.5v2h2v-2h1.5v2H17v-2.9c1.7-1.1 3-3 3-5.6C20 6.2 16.4 3 12 3zM9 9.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zM15 9.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z',
  diamond: 'M12 2 21 12 12 22 3 12z',
  dot: 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z',
  back: 'M15 5l-7 7 7 7',
  home: 'M3 11 12 3l9 8M5.5 9.5V21h5v-6h3v6h5V9.5',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  speed: 'M4 6v12l7-6zM12 6v12l7-6z',
  sword: 'M14.5 3H21v6.5L9.5 21 3 14.5zM6 15l3 3M4 20l2-2',
  shield: 'M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5z',
  heal: 'M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6z',
  users: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c.6-3.6 3.3-5.5 6.5-5.5s5.9 1.9 6.5 5.5M16 4.3a3.5 3.5 0 0 1 0 6.4M18 14.8c2 .7 3.2 2.4 3.5 5.2',
  flag: 'M5 21V4M5 4h12l-2 4 2 4H5',
  check: 'M4 12.5l5 5L20 6.5',
  map: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14',
};

/** 선이 필요한 아이콘(나머지는 채움) */
const STROKED = new Set(['vault', 'reroll', 'lock', 'unlock', 'front', 'rear', 'bench', 'equipment', 'strategy', 'pin', 'info', 'close', 'codex', 'records', 'import', 'export', 'warning', 'back', 'home', 'plus', 'minus', 'sword', 'users', 'flag', 'check', 'map', 'settings', 'sell']);

export function icon(name: string, size = 24, extraClass = ''): SVGElement {
  const d = PATHS[name] ?? PATHS.dot;
  const stroked = STROKED.has(name);
  const path = svg('path', stroked
    ? { d, fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }
    : { d, fill: 'currentColor' });
  const el = svg('svg', { viewBox: '0 0 24 24', width: size, height: size, 'aria-hidden': 'true', class: `ico ${extraClass}`.trim() }, path);
  return el;
}
