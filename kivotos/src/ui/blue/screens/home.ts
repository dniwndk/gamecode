// 홈: 작전 메뉴 + 오른쪽 「작전 브리핑」 태블릿(저장 런 요약·편성·시너지·다음 보스, 부관 한마디).
import type { Ctx, Screen } from '../app';
import { enemyPortrait, nodeTrack, portrait, readable, shortName, stars, synHex } from '../components';
import { cls, h } from '../dom';
import { icon } from '../icons';
import type { RunView, UiState } from '../model';

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
  // 부관(로비 학생): 브리핑 머리에 작게. 누르면 바뀌고 한마디.
  let idx = Math.floor(Math.random() * LOBBY.length);
  const aide = h('button', { class: 'k-aide', 'aria-label': '부관 바꾸기' });
  const drawAide = () => {
    const id = LOBBY[idx % LOBBY.length];
    const line = ctx.lookup.line(id, (['recruit', 'victory', 'bond'] as const)[idx % 3]) ?? '';
    aide.replaceChildren(portrait(ctx, id, 'is-round k-aide-face'),
      h('span', { class: 'k-aide-text' }, h('small', null, '오늘의 부관'), h('b', null, shortName(ctx.lookup.unit(id).name)), h('span', null, line)));
    aide.classList.remove('is-pop');
    void aide.offsetWidth;
    aide.classList.add('is-pop');
  };
  aide.addEventListener('click', () => { idx++; drawAide(); });
  drawAide();

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
    briefing(ctx, s, aide, resume, () => void newGame()),
    h('div', { class: 'k-home-left' },
      logo(ctx),
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

// ── 작전 브리핑 태블릿 ─────────────────────────────────
function bossOf(ctx: Ctx, chapter: number): string | null {
  const nd = ctx.driver.catalog.pack.nodes.find((n) => n.chapter === chapter && n.type === 'boss');
  return nd?.candidates[0]?.front.find((f) => ctx.lookup.enemy(f.enemyId)?.boss)?.enemyId ?? null;
}

/** 타이틀 로고(gfx/ui/logo_title.webp, 사용자 제공 그림의 흰 바탕을 뺀 것). 받지 못하면 글자 로고로 돌아간다 */
function logo(ctx: Ctx): HTMLElement {
  const text = () => [
    h('div', { class: 'k-logo-halo', 'aria-hidden': 'true' }),
    h('span', { class: 'k-logo-kicker' }, 'KIVOTOS'),
    h('h1', null, '키보토스', h('br'), '택티컬 프론트라인'),
    h('p', { class: 'k-logo-sub' }, 'Tactical Frontline · 샬레 작전 단말')];
  const box = h('div', { class: 'k-logo has-art' });
  const img = h('img', { class: 'k-logo-art', src: ctx.art('gfx/ui/logo_title.webp'), alt: '키보토스 택티컬 프론트라인 · KIVOTOS TACTICAL FRONTLINE', draggable: 'false' });
  img.addEventListener('error', () => { box.classList.remove('has-art'); box.replaceChildren(...text()); }, { once: true });
  box.append(h('h1', null, img));
  return box;
}

function briefing(ctx: Ctx, s: UiState, aide: HTMLElement, resume: (() => void) | null, newGame: () => void): HTMLElement {
  const run: RunView | undefined = s.savedRun?.snapshot;
  const head = h('header', { class: 'k-brief-head' },
    h('div', null, h('span', { class: 'k-brief-kicker' }, 'SCHALE · OPERATION BRIEFING'), h('h2', null, run || s.savedRun ? '진행 중인 작전' : '새 작전 대기')),
    run ? h('span', { class: 'k-brief-seed' }, icon('records', 16), run.seed) : null);
  const sec = (title: string, ic: string, ...body: (HTMLElement | null)[]) =>
    h('section', { class: 'k-brief-sec' }, h('h3', null, icon(ic, 18), title), ...body);

  if (!run) {
    // 저장 런이 없거나 요약만 있을 때: 장별 보스 예고 + 시작 버튼
    const bosses = [1, 2, 3].map((ch) => bossOf(ctx, ch));
    return h('aside', { class: 'k-brief' }, head,
      s.savedRun ? sec('현재 위치', 'flag', h('p', { class: 'k-brief-big' }, `${s.savedRun.chapter}장 ${s.savedRun.battle}전투`, h('small', null, ` · 런 체력 ${s.savedRun.runHp}/${s.savedRun.runHpMax}`))) : null,
      sec('장별 보스', 'skull', h('div', { class: 'k-brief-bosses' }, ...bosses.map((id, i) => id ? h('div', { class: 'k-brief-boss-mini' }, enemyPortrait(ctx, id), h('small', null, `${i + 1}장`), h('b', null, ctx.lookup.enemy(id)!.name.replace(/\s*\(.*\)$/, '').split(': ').pop() ?? '')) : null))),
      sec('작전 요령', 'info', h('p', { class: 'k-brief-tip' }, '전방 4칸이 맞고 싸우고, 후방은 HP 없이 정기 지원만 해요. 같은 학생 셋이면 자동 합성!')),
      aide,
      h('button', { class: 'k-brief-cta', onclick: resume ?? newGame }, h('span', null, resume ? '작전 재개' : '새 작전 시작'), icon('back', 22, 'k-flip')));
  }

  const hpPct = Math.round((run.runHp / run.runHpMax) * 100);
  const deployed = [...run.board.front, ...run.board.rear].filter((x): x is NonNullable<typeof x> => !!x);
  const active = run.synergies.filter((x) => x.activeTier !== null).sort((a, b) => b.count - a.count).slice(0, 6);
  const bossId = bossOf(ctx, run.chapter);
  const toBoss = Math.max(0, 5 - run.battle);
  const boss = bossId ? ctx.lookup.enemy(bossId) : undefined;
  const type = run.nodeType === 'boss' ? '보스전' : run.nodeType === 'elite' ? '정예전' : '일반 전투';

  return h('aside', { class: 'k-brief' }, head,
    sec('진행', 'flag',
      h('div', { class: 'k-brief-progress' },
        h('p', { class: 'k-brief-big' }, `${run.chapter}-${run.battle}`, h('small', null, ` 다음 ${type}`)), nodeTrack(run, true))),
    h('div', { class: 'k-brief-stats' },
      h('div', { class: 'k-brief-stat is-hp' }, icon('heart', 22), h('div', null, h('small', null, '런 체력'), h('b', null, `${run.runHp}`, h('em', null, `/${run.runHpMax}`)), h('i', { class: 'k-brief-bar', style: `--p:${hpPct}%` }))),
      h('div', { class: 'k-brief-stat is-gold' }, icon('gold', 22), h('div', null, h('small', null, '골드'), h('b', null, `${run.gold}`))),
      h('div', { class: 'k-brief-stat is-lv' }, icon('xp', 22), h('div', null, h('small', null, '레벨'), h('b', null, `${run.level}`, h('em', null, ` ${run.deployedCount}/${run.deployLimit}명`)))),
      run.streak.kind ? h('div', { class: `k-brief-stat is-${run.streak.kind}` }, icon('flag', 22), h('div', null, h('small', null, run.streak.kind === 'win' ? '연승' : '연패'), h('b', null, `${run.streak.count}`))) : null),
    sec('현재 편성', 'users',
      h('div', { class: 'k-brief-team' }, ...deployed.map((u) => h('div', { class: 'k-brief-mate', title: ctx.lookup.unit(u.unitId).name },
        portrait(ctx, u.unitId, 'is-round'), stars(u.star), h('small', null, shortName(ctx.lookup.unit(u.unitId).name)))))),
    sec('활성 시너지', 'strategy',
      h('div', { class: 'k-brief-syns' }, ...active.map((x) => h('span', { class: 'k-brief-syn' }, synHex(ctx, x.synergyId, { size: 26, tier: x.activeTier }), h('b', null, ctx.lookup.syn(x.synergyId)?.name.split(' — ')[0] ?? x.synergyId), h('em', null, String(x.count)))))),
    boss && bossId ? sec(toBoss ? `${run.chapter}장 보스까지 ${toBoss}전` : '보스전', 'skull',
      h('div', { class: 'k-brief-boss' }, enemyPortrait(ctx, bossId, 'is-lg'),
        h('div', null, h('b', null, boss.name.replace(/\s*\(.*\)$/, '')), h('p', null, readable(ctx, boss.counterplay))))) : null,
    aide,
    resume ? h('button', { class: 'k-brief-cta', onclick: resume }, h('span', null, `${run.chapter}-${run.battle} 작전 재개`), icon('back', 22, 'k-flip')) : null);
}
