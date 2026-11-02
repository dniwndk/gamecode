// 다음 노드: 장 진행 지도 전환(1초 남짓, 누르면 바로 넘어감).
import type { Ctx, Screen } from '../app';
import { nodeTrack } from '../components';
import { h } from '../dom';
import { icon } from '../icons';
import type { UiState } from '../model';

const CHAPTER_NAME = ['', '아비도스 사막 시가지', '밀레니엄 폐허', '성소의 하늘', '단절된 네트워크', '방주의 심장'];

export function mountNextNode(ctx: Ctx, s: UiState): Screen {
  const run = s.run!;
  const newChapter = run.battle === 1;
  let done = false;
  const go = () => { if (!done) { done = true; void ctx.send('CONFIRM_RESULT'); } };
  const type = run.nodeType === 'boss' ? '보스전' : run.nodeType === 'elite' ? '정예전' : '일반 전투';
  const el = h('section', { class: 'k-next', role: 'button', tabindex: 0, 'aria-label': '다음으로', onclick: go, onkeydown: (e: Event) => { if ((e as KeyboardEvent).key === 'Enter') go(); } },
    // 장을 넘겼다면(보스 격파) 승리 컷신을 먼저 보여 준다
    newChapter && run.chapter > 1 ? h('div', { class: 'k-next-art' }, h('img', { src: ctx.art('keyart/cut_victory.webp'), alt: '' }), h('b', null, `CHAPTER ${run.chapter - 1} CLEAR`)) : null,
    h('div', { class: 'k-next-card' },
      h('span', { class: 'k-next-kicker' }, newChapter ? `CHAPTER ${run.chapter}` : 'NEXT OPERATION'),
      h('h2', null, run.multi ? `라운드 ${run.multi.round} · ${run.nodeType === 'normal' ? 'PvP' : 'PvP · 장비 보상'}` : newChapter ? `${run.chapter}장 · ${CHAPTER_NAME[run.chapter] ?? ''}` : `${run.chapter}-${run.battle} ${type}`),
      nodeTrack(run),
      h('p', null, icon('heart', 20), `런 체력 ${run.runHp}/${run.runHpMax}`, h('span', null, ' · '), icon('gold', 20), `${run.gold}G`),
      h('small', null, '눌러서 계속')));
  const timer = window.setTimeout(go, ctx.settings.reduceMotion ? 900 : newChapter && run.chapter > 1 ? 3200 : 1700);
  return { el, destroy: () => clearTimeout(timer) };
}
