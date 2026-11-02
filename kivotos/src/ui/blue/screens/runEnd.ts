// 런 결과 + 「선생님의 작전 보고서」 카드(PNG 저장).
import type { Ctx, Screen } from '../app';
import { portrait, shortName, synHex } from '../components';
import { cls, h } from '../dom';
import { icon } from '../icons';
import type { UiState } from '../model';

export function mountRunEnd(ctx: Ctx, s: UiState): Screen {
  const run = s.run!;
  const clear = s.phase === 'RUN_COMPLETE';
  const mvp = run.lastResult?.mvpUnitId ?? run.board.front.find(Boolean)?.unitId ?? null;
  const line = mvp ? ctx.lookup.line(mvp, 'victory') : null;
  const active = run.synergies.filter((x) => x.activeTier !== null);
  setTimeout(() => ctx.sfx.play(clear ? 'RUN_CLEAR' : 'RUN_FAIL'), 300);

  const boardRow = (list: typeof run.board.front, n: number, zone: string) => h('div', { class: `k-report-row is-${zone}` },
    ...Array.from({ length: n }, (_, i) => { const x = list[i]; return h('div', { class: 'k-report-slot' }, x ? portrait(ctx, x.unitId) : null, x ? h('span', null, '★'.repeat(x.star)) : null); }));

  const report = h('article', { class: cls('k-report', clear ? 'is-clear' : 'is-fail') },
    h('header', null,
      h('span', { class: 'k-kicker' }, "SENSEI'S OPERATION REPORT"),
      h('h2', null, '선생님의 작전 보고서'),
      h('strong', { class: 'k-report-result' }, clear ? '작전 완수' : '작전 중단')),
    h('div', { class: 'k-report-body' },
      h('div', { class: 'k-report-board' }, h('small', null, '최종 편성'), boardRow(run.board.front, 4, 'front'), boardRow(run.board.rear, 6, 'rear')),
      h('div', { class: 'k-report-side' },
        mvp ? h('div', { class: 'k-report-mvp' }, portrait(ctx, mvp, 'is-round'), h('div', null, h('small', null, 'MVP'), h('b', null, shortName(ctx.lookup.unit(mvp).name)), line ? h('p', null, `“${line}”`) : null)) : null,
        h('div', { class: 'k-report-syns' }, ...active.map((x) => synHex(ctx, x.synergyId, { size: 34, tier: x.activeTier }))),
        h('div', { class: 'k-report-track' }, ...run.nodeHistory.map((r, i) => h('i', { class: cls(r && `is-${r}`, (i % 5 === 4) && 'is-boss') }))),
        h('dl', { class: 'k-report-meta' },
          h('dt', null, '시드'), h('dd', null, run.seed), h('dt', null, '위기 등급'), h('dd', null, String(run.crisisLevel)),
          h('dt', null, '런 체력'), h('dd', null, `${run.runHp}/${run.runHpMax}`), h('dt', null, '버전'), h('dd', null, `${s.contentVersion} · ${s.rulesVersion}`)))));

  const mp = run.multi;
  if (mp) return mountMultiEnd(ctx, s, report);
  const el = h('section', { class: 'k-runend' },
    h('div', { class: 'k-runend-title' }, h('b', null, clear ? 'MISSION COMPLETE' : 'MISSION FAILED'), h('span', null, clear ? '키보토스의 하늘이 다시 맑아졌어요' : '이번 작전은 여기까지예요. 기록은 남아요.')),
    report,
    h('footer', { class: 'k-runend-foot' },
      h('button', { class: 'k-btn is-ghost', onclick: async () => { try { await navigator.clipboard.writeText(run.seed); ctx.toast('시드를 복사했어요'); } catch { ctx.toast(`시드: ${run.seed}`); } } }, icon('records', 22), '시드 복사'),
      h('button', { class: 'k-btn is-blue', onclick: () => void ctx.send('NEW_RUN', { seed: run.seed }) }, icon('reroll', 22), '같은 시드로 다시'),
      h('button', { class: 'k-btn is-primary', onclick: () => void ctx.send('ABANDON_RUN') }, icon('home', 22), '홈으로')));
  return { el };
}

/** 멀티플레이 끝: 내 순위와 점수판. 다른 선생님이 아직 싸우는 중이면 점수판이 계속 바뀐다 */
function mountMultiEnd(ctx: Ctx, s0: UiState, report: HTMLElement): Screen {
  const el = h('section', { class: 'k-runend k-mp-end' });
  const draw = (s: UiState) => {
    const mp = s.run!.multi!;
    const place = mp.place;
    const live = mp.players.some((p) => p.alive && !p.you);
    el.replaceChildren(
      h('div', { class: 'k-runend-title' }, h('b', null, place === 1 ? 'WINNER' : place ? `${place}위` : 'MISSION FAILED'),
        h('span', null, place === 1 ? '마지막까지 남은 선생님이에요!' : live ? '탈락했어요. 남은 선생님들의 결과를 기다리는 중이에요' : '대전이 끝났어요')),
      h('div', { class: 'k-mp-end-body' },
        report,
        h('ol', { class: 'k-panel k-score-list k-mp-standings' }, ...mp.players.map((p) => h('li', { class: cls('k-score-row', p.you && 'is-you', !p.alive && 'is-out') },
          h('span', { class: 'k-score-place' }, p.place ? `${p.place}위` : '진행 중'),
          h('div', { class: 'k-score-main' }, h('div', { class: 'k-score-name' }, p.host ? icon('crown', 16) : null, h('b', null, p.name), p.you ? h('small', null, '나') : null)),
          h('span', { class: 'k-score-num' }, h('b', null, String(p.runHp)), h('small', null, `Lv${p.level}`)))))),
      h('footer', { class: 'k-runend-foot' },
        h('button', { class: 'k-btn is-primary', onclick: async () => {
          if (ctx.multi.isHost() && live && !(await ctx.confirm({ title: '방 닫기', body: ['방장이 나가면 아직 싸우는 선생님들의 게임도 끝나요.', '그래도 나갈까요?'], confirm: '나가기', danger: true }))) return;
          await ctx.send('ABANDON_RUN');
        } }, icon('home', 22), '홈으로')));
  };
  draw(s0);
  return { el, update: (s) => { if (s.run?.multi) draw(s); } };
}
