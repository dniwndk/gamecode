// 결과: 런 체력 변화와 수입 분해(값은 모두 코어가 준다), 학생별 기여, MVP 대사.
import type { Ctx, Screen } from '../app';
import { defeatArt, portrait, shortName } from '../components';
import { cls, h } from '../dom';
import { icon } from '../icons';
import type { RunView, UiState } from '../model';

const REASON: Record<string, string> = {
  enemy_front_wiped: '적 전방 전멸', ally_front_wiped: '아군 전방 전멸', both_wiped: '양쪽 전방 전멸',
};

export function resultPanel(ctx: Ctx, run: RunView, onContinue: () => void): HTMLElement {
  const r = run.lastResult!;
  const win = r.outcome === 'win';
  const income = r.income.reduce((a, b) => a + b.value, 0);
  const hpLoss = r.runHp.before - r.runHp.after;
  const maxContrib = Math.max(1, ...r.contributions.map((c) => c.damage + c.healing + c.shield + c.rearSupport));
  // 승리면 MVP와 victory 대사, 패배면 가장 많이 버틴 학생과 defeated 대사(화면 표현만, 결과 값은 코어가 준다)
  const top = [...r.contributions].sort((a, b) => (b.damage + b.healing + b.shield) - (a.damage + a.healing + a.shield))[0]?.unitId ?? null;
  const mvp = win ? r.mvpUnitId : top;
  const mvpLine = mvp ? ctx.lookup.line(mvp, win ? 'victory' : 'defeated') : null;
  const cont = h('button', { class: 'k-btn is-primary k-continue', autofocus: true, onclick: () => { cont.disabled = true; onContinue(); } }, h('span', null, '계속'), icon('back', 22, 'k-flip'));

  const panel = h('div', { class: cls('k-result', win ? 'is-win' : 'is-loss'), role: 'dialog', 'aria-label': '전투 결과' },
    h('div', { class: 'k-result-hero' },
      mvp ? h('div', { class: 'k-mvp' }, win ? portrait(ctx, mvp, 'k-mvp-art') : defeatArt(ctx, mvp, 'k-mvp-art'), h('span', { class: 'k-mvp-tag' }, icon(win ? 'crown' : 'shield', 18), win ? 'MVP' : '끝까지 버틴 학생'), h('b', null, shortName(ctx.lookup.unit(mvp).name)), mvpLine ? h('p', null, `“${mvpLine}”`) : null)
        : h('div', { class: 'k-mvp is-none' }, icon(win ? 'crown' : 'warning', 64), h('p', null, win ? '모두 잘 싸웠어요' : '다음 노드를 대비해 편성을 다시 살펴봐요'))),
    h('div', { class: 'k-result-body' },
      h('header', { class: 'k-result-head' },
        h('h2', null, win ? '승리' : '패배'),
        h('span', { class: 'k-reason' }, REASON[r.reason] ?? r.reason),
        h('span', { class: 'k-node-code' }, `${run.chapter}-${run.battle}`)),
      h('div', { class: 'k-ledger' },
        h('div', { class: cls('k-ledger-row is-hp', hpLoss > 0 && 'is-neg') },
          h('span', { class: 'k-ledger-ico' }, icon('heart', 26)),
          h('div', null, h('b', null, '런 체력'), h('small', null, hpLoss ? r.runHp.breakdown.map((b) => `${b.label} ${b.value}`).join(' + ') : '피해 없음')),
          h('strong', null, `${r.runHp.before} → ${r.runHp.after}`, hpLoss ? h('em', null, ` −${hpLoss}`) : null)),
        h('div', { class: 'k-ledger-row is-gold' },
          h('span', { class: 'k-ledger-ico' }, icon('gold', 26)),
          h('div', null, h('b', null, '수입'), h('small', null, r.income.map((b) => `${b.label} ${b.value >= 0 ? '+' : ''}${b.value}`).join(' · '))),
          h('strong', null, `+${income}G`)),
        h('div', { class: 'k-ledger-row is-xp' },
          h('span', { class: 'k-ledger-ico' }, icon('xp', 26)),
          h('div', null, h('b', null, '경험치'), h('small', null, '전투 후 기본 지급')),
          h('strong', null, `+${r.xpGained} XP`))),
      h('div', { class: 'k-contrib' },
        h('h3', null, '학생별 기여'),
        h('div', { class: 'k-contrib-legend' }, h('span', { class: 'is-dmg' }, '피해'), h('span', { class: 'is-heal' }, '치유'), h('span', { class: 'is-shield' }, '보호막'), h('span', { class: 'is-rear' }, '후방 기여')),
        h('ol', null, ...[...r.contributions].sort((a, b) => (b.damage + b.healing + b.shield + b.rearSupport) - (a.damage + a.healing + a.shield + a.rearSupport)).map((c) => {
          const total = c.damage + c.healing + c.shield + c.rearSupport;
          const seg = (v: number, k: string) => (v > 0 ? h('i', { class: `is-${k}`, style: `--w:${(v / maxContrib) * 100}%` }) : null);
          return h('li', { class: cls(win && c.unitId === mvp && 'is-mvp') },
            portrait(ctx, c.unitId, 'is-round'),
            h('span', { class: 'k-contrib-name' }, shortName(ctx.lookup.unit(c.unitId).name)),
            h('span', { class: 'k-contrib-bar' }, seg(c.damage, 'dmg'), seg(c.healing, 'heal'), seg(c.shield, 'shield'), seg(c.rearSupport, 'rear')),
            h('b', null, total.toLocaleString()));
        }))),
      h('footer', { class: 'k-result-foot' }, cont)));
  // 승리 MVP 초상화에 빛 폭발(연출 계층이 꺼져 있으면 아무 일 없음)
  setTimeout(() => { if (win && panel.isConnected) ctx.fx.burst(panel.querySelector('.k-mvp-art'), { color: '#ffc93c', size: 420, ms: 1300 }); }, 380);
  return panel;
}

export function mountResult(ctx: Ctx, s: UiState): Screen {
  const el = h('section', { class: 'k-result-screen' }, resultPanel(ctx, s.run!, () => void ctx.send('CONFIRM_RESULT')));
  return { el };
}
