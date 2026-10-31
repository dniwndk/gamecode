// 설정: 연출 줄이기·플래시·흔들림·대사·기본 배속. 화면 쪽 기본 설정이라 게임 결과와 무관하다.
import type { Ctx, Screen } from '../app';
import { cls, h } from '../dom';
import { icon } from '../icons';

export function mountSettings(ctx: Ctx): Screen {
  const el = h('section', { class: 'k-settings' });
  const st = ctx.settings;
  const draw = () => {
    const toggle = (id: string, label: string, desc: string, key: 'reduceMotion' | 'noFlash' | 'noShake' | 'dialogue' | 'fx') =>
      h('label', { class: 'k-toggle', for: id },
        h('div', null, h('b', null, label), h('small', null, desc)),
        h('input', { id, type: 'checkbox', role: 'switch', checked: st[key], onchange: (e: Event) => { st[key] = (e.target as HTMLInputElement).checked; ctx.saveSettings(); draw(); } }),
        h('span', { class: 'k-switch', 'aria-hidden': 'true' }));
    el.replaceChildren(
      h('header', { class: 'k-codex-top' },
        h('button', { class: 'k-back', 'aria-label': '홈으로', onclick: () => ctx.go(null) }, icon('back', 28)),
        h('h2', null, '설정')),
      h('div', { class: 'k-panel k-settings-body' },
        h('h3', null, '연출'),
        toggle('k-set-fx', '고급 그래픽 효과', '흐르는 하늘 배경·카드 광택·전환 파편(WebGL2). 느리면 끄세요', 'fx'),
        toggle('k-set-motion', '애니메이션 줄이기', '전환·컷인·동전 비 연출을 생략합니다', 'reduceMotion'),
        toggle('k-set-flash', '플래시 끄기', '피격 시 하얗게 번쩍이는 효과를 끕니다', 'noFlash'),
        toggle('k-set-shake', '화면 흔들림 끄기', '치명타·필살기·큰 피해 흔들림(최대 8px)을 끕니다', 'noShake'),
        toggle('k-set-dialogue', '대사 표시', '영입·배치·필살기·승리 말풍선', 'dialogue'),
        h('h3', null, '전투'),
        h('div', { class: 'k-toggle' }, h('div', null, h('b', null, '기본 배속'), h('small', null, '전투가 시작할 때의 재생 속도')),
          h('div', { class: 'k-seg', role: 'group', 'aria-label': '기본 배속' }, ...([1, 2, 4] as const).map((v) => h('button', {
            class: cls(st.defaultSpeed === v && 'on'), 'aria-pressed': st.defaultSpeed === v ? 'true' : 'false',
            onclick: () => { st.defaultSpeed = v; ctx.saveSettings(); draw(); },
          }, `${v}x`)))),
        h('h3', null, '소리'),
        h('label', { class: 'k-toggle', for: 'k-set-sfx' },
          h('div', null, h('b', null, `효과음 ${st.sfxVolume}%`), h('small', null, '타격·필살기·발동·연쇄 합성음. 0이면 꺼집니다(음악은 아직 없어요)')),
          h('input', { id: 'k-set-sfx', class: 'k-range', type: 'range', min: '0', max: '100', step: '5', value: String(st.sfxVolume),
            oninput: (e: Event) => { st.sfxVolume = Number((e.target as HTMLInputElement).value); ctx.saveSettings(); (e.target as HTMLElement).previousElementSibling!.querySelector('b')!.textContent = `효과음 ${st.sfxVolume}%`; },
            onchange: () => ctx.sfx.play('hit', { power: 2 }) })),
        h('h3', null, '단축키'),
        h('dl', { class: 'k-keys' },
          ...[['1~5', '상점 구매'], ['R', '새로고침'], ['L', '상점 잠금'], ['E', 'XP 구매'], ['Space', '전투 재생/일시정지'], ['Esc', '창 닫기 · 선택 해제']].flatMap(([k, v]) => [h('dt', null, h('kbd', null, k)), h('dd', null, v)]))));
  };
  draw();
  return { el };
}
