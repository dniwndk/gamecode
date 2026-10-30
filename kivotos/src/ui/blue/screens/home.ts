// 홈: 로비 학생(누르면 바뀌고 한마디) + 작전 메뉴.
import type { Ctx, Screen } from '../app';
import { portrait, shortName } from '../components';
import { cls, h } from '../dom';
import { icon } from '../icons';
import type { UiState } from '../model';

const LOBBY = ['u_hoshino', 'u_shiroko', 'u_hina', 'u_aru', 'u_yuuka', 'u_mika', 'u_aris', 'u_wakamo', 'u_nonomi', 'u_azusa', 'u_neru', 'u_himari'];

function isoWeek(d: Date): string {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = t.getUTCFullYear();
  const w = Math.ceil(((t.getTime() - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7);
  return `weekly-${y}-W${String(w).padStart(2, '0')}`;
}

export function mountHome(ctx: Ctx, s: UiState): Screen {
  let idx = Math.floor(Math.random() * LOBBY.length);
  const lobby = h('button', { class: 'k-lobby', 'aria-label': '로비 학생 바꾸기' });
  const bubble = h('div', { class: 'k-lobby-bubble', 'aria-live': 'polite' });
  const drawLobby = () => {
    const id = LOBBY[idx % LOBBY.length];
    const u = ctx.lookup.unit(id);
    lobby.replaceChildren(h('div', { class: 'k-lobby-halo' }), portrait(ctx, id, 'k-lobby-art'));
    const line = ctx.lookup.line(id, (['recruit', 'victory', 'bond'] as const)[idx % 3]) ?? '';
    bubble.replaceChildren(h('b', null, shortName(u.name)), h('span', null, line));
    bubble.classList.remove('is-pop');
    void bubble.offsetWidth;
    bubble.classList.add('is-pop');
  };
  lobby.addEventListener('click', () => { idx++; drawLobby(); });
  drawLobby();

  const newGame = async () => {
    if (s.hasSavedRun) {
      const ok = await ctx.confirm({ title: '새 작전', body: ['진행 중인 작전을 포기하고 새로 시작합니다.', '포기한 작전은 되돌릴 수 없어요.'], confirm: '포기하고 새로 시작', danger: true });
      if (!ok) return;
    }
    await ctx.send('NEW_RUN', {});
  };

  const menuBtn = (label: string, sub: string | null, ic: string, onClick: (() => void) | null, opts: { primary?: boolean; hint?: string } = {}) =>
    h('button', { class: cls('k-menu-btn', opts.primary && 'is-primary'), disabled: !onClick, onclick: onClick ?? undefined, title: opts.hint ?? undefined },
      h('span', { class: 'k-menu-ico' }, icon(ic, 30)),
      h('span', { class: 'k-menu-text' }, h('b', null, label), sub ? h('small', null, sub) : null),
      onClick ? icon('back', 22, 'k-flip k-menu-arrow') : h('span', { class: 'k-soon' }, opts.hint ?? '준비 중'));

  const resume = s.hasSavedRun && ctx.driver.resume ? () => ctx.driver.resume!() : null;
  const el = h('section', { class: 'k-home' },
    lobby, bubble,
    h('div', { class: 'k-home-left' },
      h('div', { class: 'k-logo' },
        h('div', { class: 'k-logo-halo', 'aria-hidden': 'true' }),
        h('span', { class: 'k-logo-kicker' }, 'KIVOTOS'),
        h('h1', null, '키보토스', h('br'), '택티컬 프론트라인'),
        h('p', { class: 'k-logo-sub' }, 'Tactical Frontline · 샬레 작전 단말')),
      h('nav', { class: 'k-menu', 'aria-label': '메인 메뉴' },
        menuBtn('이어하기', s.savedRun ? `${s.savedRun.chapter}장 ${s.savedRun.battle}전투 · 런 체력 ${s.savedRun.runHp}/${s.savedRun.runHpMax}` : '진행 중인 작전이 없어요', 'play', resume, { primary: !!resume }),
        menuBtn('새 작전', '시드와 보스를 확인하고 출발', 'flag', () => void newGame(), { primary: !resume }),
        menuBtn('주간 작전', isoWeek(new Date()), 'map', null, { hint: 'M5' }),
        menuBtn('학생 도감', `학생 ${ctx.driver.catalog.pack.units.length}명 · 시너지 ${ctx.driver.catalog.pack.synergies.length}종`, 'codex', () => ctx.go('codex')),
        menuBtn('기록 · 업무 일지', null, 'records', null, { hint: 'M5' }),
        menuBtn('설정', '연출 줄이기 · 대사 · 배속', 'settings', () => ctx.go('settings')))),
    h('footer', { class: 'k-home-foot' },
      h('span', null, `콘텐츠 ${s.contentVersion} · 규칙 ${s.rulesVersion}`),
      h('span', null, '비공식 팬 제작물입니다. 블루 아카이브의 권리는 NEXON Games와 Yostar에 있습니다.')),
  );
  return { el };
}
