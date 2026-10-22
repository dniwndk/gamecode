// 엔딩: 장례식의 촛불, 비문, 조문객의 한마디, 생애 연표, 결산 장부.
import { esc, icon, frame, btn, portrait, sentences, divider } from '../dom.js';
import { stagger, reduced } from '../motion.js';
import { ACHIEVEMENTS } from '../../core/progress.js';
import * as store from '../store.js';
import { traitChip, kindCls } from '../traits.js';

export default function ending(ui, root) {
  const s = ui.state;
  const e = s.ending;
  ui.account = store.recordAccount(s);
  const born = s.year - s.age;
  const sm = e.summary;
  const mainText = e.main ? e.main.text : `${s.ch.name}의 삶은 큰 이름을 남기지 않았다. 그러나 ${sm.home}의 골목에는 그가 지나간 자리마다 작은 온기가 남았다.`;
  const title = e.main ? e.main.name : e.short ? '짧았던 계절' : '평범한 등불';
  const cause = e.type === 'retire' ? '은퇴 후 결산' : s.ch.alive ? '결산' : '영면';
  const ach = s.achievements.map(id => ACHIEVEMENTS.find(a => a.id === id)).filter(Boolean);

  // 이 삶을 만든 특성: 끝까지 지닌 것과 이겨 낸 것
  function traitsHtml() {
    const tr = e.traits || [];
    const over = e.overcome || [];
    if (!tr.length && !over.length) return '';
    const by = (k) => tr.filter(t => t.kind === k);
    return `<section class="end-traits"><h3 class="sec-title">${icon('key')}이 삶을 만든 특성</h3>
      <div class="et-cols">${[['positive', '몸에 밴 장점'], ['negative', '끝까지 함께한 그림자'], ['keyword', '쥐고 있던 열쇠']].map(([k, l]) => by(k).length ? `<div class="et-col et-${kindCls(k)}"><small>${l}</small><div class="opt-traits">${by(k).map(t => traitChip(t.id)).join('')}</div></div>` : '').join('')}
      ${over.length ? `<div class="et-col et-over"><small>이겨 낸 것</small><div class="opt-traits">${over.map(t => traitChip(t.id, { cls: 'shed', prefix: '극복 · ' })).join('')}</div></div>` : ''}</div>
    </section>`;
  }

  root.innerHTML = `
    <div class="ending-screen">
      <div class="end-bg" aria-hidden="true"></div>
      <header class="end-head">
        <div class="candles" aria-hidden="true">${[0, 1, 2].map(i => `<span class="candle c${i}"><i class="flame"></i></span>`).join('')}</div>
        <div class="eyebrow">${esc(cause)} · ${born}년 ~ ${s.year}년 · ${s.age}세</div>
        <h1 class="end-name">${esc(s.ch.name)}</h1>
        <div class="plaque end-plaque">${esc(title)}</div>
        ${e.main ? `<p class="end-scene">${esc(e.main.scene)}</p>` : ''}
      </header>
      <div class="end-grid">
        <article class="epitaph paper paper--edge">
          <p class="ep-text">${sentences(mainText)}</p>
          ${e.extras.length ? `<div class="ep-extras">${e.extras.map(x => `<span class="chip">${icon('star')}${esc(x.name)}</span>`).join('')}</div>` : ''}
          ${e.short ? '<p class="small muted">짧은 삶 · 28세 이전에 목표 없이 끝났다. 엔딩 조건 일부만 평가되었다.</p>' : ''}
        </article>
        ${frame(`
          <ul class="mourners">${e.attendees.length ? e.attendees.map((a, i) => `<li class="mourner" style="--i:${i}">${portrait(a, 54)}<div><b>${esc(a.name)}</b><p>${esc(a.line)}</p></div></li>`).join('') : '<li class="mourner"><p class="muted">조문객 명부는 비어 있었다. 대신 골목의 난로가 오래 켜져 있었다.</p></li>'}</ul>`, { cls: 'mourner-panel frame--dark', title: '조문객' })}
        ${frame(`
          <ul class="kv">
            <li><span>생활 등급</span><b>${esc(sm.lifeClass)}</b></li>
            <li><span>공적 위상</span><b>${esc(sm.publicRank)}</b></li>
            <li><span>마지막 직업</span><b>${esc(sm.job)}</b></li>
            <li><span>가장 깊은 숙련</span><b>${esc(sm.bestSkill)}</b></li>
            <li><span>고유공명</span><b>${esc(sm.ability)}</b></li>
            <li><span>남긴 돈</span><b>${sm.cash}C${sm.debt ? ` · 빚 ${sm.debt}C` : ''}</b></li>
            <li><span>지역 프로젝트</span><b>${sm.projects}</b></li>
            <li><span>지킨 약속</span><b>${sm.duties}</b></li>
            <li><span>목표</span><b>${sm.goal ? `${esc(sm.goal.name)} ${sm.goal.stage}/3` : '없음'}</b></li>
            ${sm.goalsDone.length ? `<li><span>이룬 목표</span><b>${esc(sm.goalsDone.join(', '))}</b></li>` : ''}
          </ul>${divider()}<div class="seed-box"><small>출생 씨앗</small><code>${esc(s.seed)}</code></div>`, { cls: 'end-ledger frame--sm', title: '생애 장부' })}
        <section class="timeline">
          <h3 class="sec-title">${icon('clock')}기억에 남은 순간</h3>
          <ol>${e.moments.map((m, i) => `<li style="--i:${i}"><span class="tl-node"></span><span class="tl-year">${m.year}년 · ${m.age}세</span><span class="tl-title">${esc(m.title)}</span></li>`).join('') || '<li><span class="tl-node"></span><span class="tl-title">조용한 한 해 한 해</span></li>'}</ol>
        </section>
        ${traitsHtml()}
        ${ach.length ? `<section class="end-ach"><h3 class="sec-title">${icon('star')}이 삶의 업적 ${ach.length}</h3><ul class="ach-grid">${ach.map(a => `<li class="ach got" data-tip="${esc(a.desc)}" tabindex="0"><span class="ach-medal grade-${a.grade}"><svg><use href="#gear-small"/></svg><b>${a.grade}</b></span><span class="ach-name">${esc(a.name)}</span></li>`).join('')}</ul></section>` : ''}
      </div>
      <footer class="end-actions">${btn('새로운 삶', 'new', { cls: 'btn--brass', gems: 'red', attrs: 'autofocus' })}${btn('타이틀로', 'title', { cls: 'btn--ghost', ico: 'home' })}</footer>
    </div>`;

  ui.sfx.play('bell');
  stagger(root, '.end-actions .btn');
  if (!reduced()) {
    root.querySelectorAll('.mourner').forEach((m, i) => { m.classList.add('rise'); m.style.animationDelay = `${900 + i * 260}ms`; });
    root.querySelectorAll('.timeline li').forEach((m, i) => { m.classList.add('rise'); m.style.animationDelay = `${600 + i * 120}ms`; });
  }
  root.addEventListener('click', (ev) => {
    const a = ev.target.closest('[data-act]');
    if (!a) return;
    if (a.dataset.act === 'new') { ui.state = null; ui.go('birth'); }
    if (a.dataset.act === 'title') { ui.state = null; ui.go('title'); }
  });
  return { particles: 'embers' };
}
