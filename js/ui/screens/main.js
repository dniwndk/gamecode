// 본 게임 화면: 상단 계기판, 연대기, 오른쪽 메뉴, 하단 진행 장치. 연초 계획·사건·연말 결산은 겹창으로 연다.
import { esc, icon, frame, btn, chips, sentences, portrait, gauge, updateGauge, divider } from '../dom.js';
import { stagger, countUp, shake, reduced } from '../motion.js';
import { seasonDial, skyline, eventArt, CAT_ICON } from '../art.js';
import * as G from '../../core/game.js';
import { sceneInfo } from '../../core/director.js';
import { goalView } from '../../core/progress.js';
import { SEASONS, JOBS, RANKS, DISTRICTS, SKILLS, ATTRS, ITEMS, SHOP, GOALS, LIFE_CLASSES, PUBLIC_RANKS, SUB_COMMITMENTS, ABILITIES } from '../../data/world.js';
import { CATEGORY_NAMES } from '../../data/events/index.js';
import { openPanel } from './panels.js';
import { josa } from '../../core/util.js';
import { traitToken, traitChip, tierBadge, fxGood, kindCls, goalTraitsHtml, TRAITS } from '../traits.js';

const SPEEDS = [1, 2, 4, 8];
const YEAR_MS = 20000; // 1× 기준 한 해 20초

export default function main(ui, root) {
  const s = ui.state;
  let timer = null;
  let paused = !ui.settings.autoplay;
  let speed = SPEEDS.includes(ui.settings.speed) ? ui.settings.speed : 1;
  let lastRef = null;
  let alive = true;
  let stepping = false;

  root.innerHTML = `
    <div class="main-screen">
      <div class="main-bg" aria-hidden="true">${skyline('main-sky')}<svg class="mb-gear spin-slow"><use href="#gear-big"/></svg></div>
      <header class="hud frame frame--metal" aria-label="상태"></header>
      <main class="desk">
        ${frame(`<div class="chron scroll" id="chron" tabindex="0" aria-label="연대기" aria-live="polite"></div>`, { cls: 'chron-frame', title: '연대기' })}
      </main>
      <nav class="side-menu" aria-label="기록 메뉴">
        ${[['me', '나', 'person', 'C'], ['traits', '특성', 'key', 'T'], ['people', '인물', 'people', 'P'], ['city', '도시', 'map', 'M'], ['ledger', '장부', 'ledger', 'L'], ['codex', '기록', 'codex', 'K'], ['settings', '설정', 'settings', 'O']]
          .map(([k, l, ic, key]) => `<button class="menu-item side" data-panel="${k}" aria-label="${l} (${key})"><span class="mi-ico">${icon(ic)}</span><span class="mi-label">${l}</span></button>`).join('')}
      </nav>
      <footer class="controls frame frame--metal">
        <div class="ctl-buttons">
          <button class="btn btn--icon" data-act="toggle" aria-label="자동 진행 (Space)"></button>
          <button class="btn btn--sm" data-act="speed" aria-label="속도 (F)"></button>
          <button class="btn btn--sm" data-act="step">${icon('chevron')}<span>다음 계절</span></button>
        </div>
        <div class="ctl-progress"><div class="season-track"><i></i></div><div class="ctl-status"></div></div>
        <div class="ctl-goal"></div>
      </footer>
    </div>`;

  const hudEl = root.querySelector('.hud');
  const chron = root.querySelector('#chron');
  let prev = { cash: s.ch.cash, traits: null };

  // ───────── 계기판 ─────────
  function drawHud(first = false) {
    const ch = s.ch;
    const job = ch.job ? `${JOBS[ch.job.id].name} ${RANKS[ch.job.rank]}` : ch.apprentice ? `${JOBS[ch.apprentice]?.name || ''} 견습생` : s.age < 18 ? '학생' : '무직';
    const debt = G.totalDebt(s);
    if (first || !hudEl.firstChild) {
      hudEl.innerHTML = `
        <div class="hud-who">${portrait({ portrait: 'person', alive: true }, 52, 'is-me')}<div class="hud-id"><div class="hud-name"></div><div class="hud-sub"></div><button class="hud-traits" data-panel="traits" aria-label="보유 특성 보기 (T)"></button></div></div>
        <div class="hud-time"><div class="dial-holder"></div><div class="hud-year"><b class="yr"></b><span class="ssn"></span></div></div>
        <div class="hud-gauges">${gauge('health', '건강', ch.health, 100, 'var(--teal)')}${gauge('stress', '스트레스', ch.stress, 100, 'var(--copper)')}${gauge('load', '공명부하', ch.load, 100, 'var(--rose)')}</div>
        <div class="hud-purse" data-tip=""><span class="coin">${icon('coin')}</span><span class="cash-wrap"><b class="cash">${ch.cash}</b><small>C</small></span><span class="debt"></span></div>`;
    }
    hudEl.querySelector('.hud-name').textContent = ch.name;
    hudEl.querySelector('.hud-sub').textContent = `${s.age}세 · ${DISTRICTS[ch.home].name} · ${job}`;
    hudEl.querySelector('.dial-holder').innerHTML = seasonDial(s.season, s.phase === 'running' && !paused);
    hudEl.querySelector('.yr').textContent = `${s.year}년`;
    hudEl.querySelector('.ssn').textContent = s.phase === 'plan' ? '연초' : s.phase === 'yearEnd' ? '연말' : SEASONS[s.season];
    updateGauge(hudEl, 'health', ch.health);
    updateGauge(hudEl, 'stress', ch.stress);
    updateGauge(hudEl, 'load', ch.load);
    hudEl.querySelector('[data-gauge="health"]').classList.toggle('pulse', ch.health < 35);
    hudEl.querySelector('[data-gauge="load"]').classList.toggle('pulse', ch.load >= 75);
    const cashEl = hudEl.querySelector('.cash');
    if (prev.cash !== ch.cash) {
      countUp(cashEl, prev.cash, ch.cash, 600);
      const purse = hudEl.querySelector('.hud-purse');
      purse.classList.remove('up', 'down'); void purse.offsetWidth; purse.classList.add(ch.cash > prev.cash ? 'up' : 'down');
      if (ch.cash > prev.cash) ui.sfx.play('coin');
      prev.cash = ch.cash;
    } else cashEl.textContent = ch.cash;
    cashEl.classList.toggle('neg', ch.cash < 0);
    hudEl.querySelector('.debt').textContent = debt ? `부채 ${debt}C` : '';
    drawTraits();
    hudEl.querySelector('.hud-purse').dataset.tip = `소지금 ${ch.cash}C${debt ? ` · 부채 ${debt}C` : ''}\n생활 등급 ${LIFE_CLASSES[ch.lifeClass]}\n공적 위상 ${PUBLIC_RANKS[ch.publicRank]}`;
    drawControls();
  }

  // 보유 특성 리본: 긍정·부정은 토큰으로, 열쇠는 열쇠고리 하나에 묶는다. 새로 생긴 토큰은 반짝이며 들어온다.
  function drawTraits() {
    const box = hudEl.querySelector('.hud-traits');
    const ids = s.ch.traits.map(t => t.id);
    const sig = ids.join(',');
    if (box.dataset.sig === sig) return;
    const before = prev.traits;
    const fresh = before ? ids.filter(id => !before.includes(id)) : [];
    const gone = before ? before.filter(id => !ids.includes(id)) : [];
    prev.traits = ids;
    box.dataset.sig = sig;
    const eff = ids.filter(id => TRAITS[id]?.kind !== 'keyword');
    const keys = ids.filter(id => TRAITS[id]?.kind === 'keyword');
    const order = [...eff.filter(id => TRAITS[id].kind === 'positive'), ...eff.filter(id => TRAITS[id].kind === 'negative')];
    const MAX = 6;
    const shown = order.slice(0, MAX);
    const keyFresh = keys.some(id => fresh.includes(id));
    box.innerHTML = `${shown.map(id => traitToken(id, { cls: fresh.includes(id) ? 'tk-new' : '' })).join('')}`
      + (order.length > MAX ? `<span class="tk tk--more" data-tip="${esc(order.slice(MAX).map(id => TRAITS[id].name).join(', '))}">+${order.length - MAX}</span>` : '')
      + (keys.length ? `<span class="tk tk--ring ${keyFresh ? 'tk-new' : ''}" data-tip="${esc(`열쇠 특성 ${keys.length}개\n${keys.map(id => `· ${TRAITS[id].name}`).join('\n')}`)}">${icon('key')}<b>${keys.length}</b></span>` : '')
      + (!ids.length ? '<span class="tk-empty">특성 없음</span>' : '');
    // 진행 중에 생긴 변화는 토스트로도 알린다 (사건·결산 창이 열려 있으면 그 창이 보여 준다)
    if (!ui.stack.length) {
      for (const id of fresh) { const d = TRAITS[id]; ui.toast(`${d.kind === 'keyword' ? '열쇠 획득' : d.kind === 'negative' ? '특성 생김' : '특성 획득'} · 「${d.name}」`, { ico: d.icon, sub: d.effects?.[0] || d.opens || d.desc }); }
      for (const id of gone) { const d = TRAITS[id]; if (d) ui.toast(`${d.kind === 'negative' ? '극복' : '잃음'} · 「${d.name}」`, { ico: d.kind === 'negative' ? 'check' : d.icon }); }
    }
    if (fresh.length) ui.sfx.play('stamp');
  }

  function drawControls() {
    const t = root.querySelector('[data-act="toggle"]');
    const running = s.phase === 'running';
    t.innerHTML = paused ? icon('play') : icon('pause');
    t.setAttribute('aria-pressed', String(!paused));
    t.disabled = !running;
    root.querySelector('[data-act="speed"]').innerHTML = `${icon('fast')}<span>${speed}×</span>`;
    root.querySelector('[data-act="step"]').disabled = !running || stepping;
    const st = root.querySelector('.ctl-status');
    st.textContent = running ? (paused ? '멈춤 · Space로 재개' : `${SEASONS[s.season]} 진행 중`) : s.phase === 'plan' ? '연초 계획을 세우는 중' : s.phase === 'event' ? '사건 진행 중' : s.phase === 'yearEnd' ? '연말 결산' : '';
    const gv = goalView(s);
    root.querySelector('.ctl-goal').innerHTML = gv ? `<span class="cg-label">${icon('star')}${esc(gv.name)}</span><span class="cg-pips">${[0, 1, 2].map(i => `<i class="${i < gv.stage ? 'on' : ''}" data-tip="${esc(gv.stages[i])}"></i>`).join('')}</span>` : '';
    root.querySelector('.dial-holder svg')?.classList.toggle('is-running', running && !paused);
  }

  // ───────── 연대기 ─────────
  function yearSection(year, age) {
    let sec = chron.querySelector(`section[data-year="${year}"]`);
    if (!sec) {
      sec = document.createElement('section');
      sec.className = 'yr';
      sec.dataset.year = year;
      sec.innerHTML = `<h3 class="yr-head"><span class="yr-tab">${year}년</span><span class="yr-age">${age}세</span><span class="yr-line"></span></h3>`;
      chron.appendChild(sec);
      // 최근 3년만 남긴다 (DOM 경량화)
      for (const old of chron.querySelectorAll('section.yr')) if (Number(old.dataset.year) < s.year - 2) old.remove();
    }
    return sec;
  }

  function entryHtml(j) {
    const sea = SEASONS[j.season] || '';
    switch (j.kind) {
      case 'season': return `<div class="ce ce-season"><span class="ce-sea">${icon('clock')}${esc(j.text)}</span>${j.deltas ? `<span class="ce-chips">${chips(j.deltas)}</span>` : ''}</div>`;
      case 'daily': return `<p class="ce ce-daily">${sentences(j.text)}</p>`;
      case 'event': return `<div class="ce ce-event"><div class="ce-etitle">${icon(CAT_ICON[j.category] || 'scroll')}<span>${esc(j.title)}</span><small>${esc(CATEGORY_NAMES[j.category] || '')} · ${sea}</small></div><p>${sentences(j.text)}</p></div>`;
      case 'result': return `<div class="ce ce-result ${j.success === true ? 'ok' : j.success === false ? 'fail' : ''}">${j.choice ? `<div class="ce-choice">${icon('chevron')}<span>${esc(j.choice)}</span>${j.chance != null ? `<em>${j.success ? '성공' : '실패'} · ${j.chance}%</em>` : ''}</div>` : ''}${j.text ? `<p>${sentences(j.text)}</p>` : ''}${j.deltas?.length ? `<div class="ce-chips">${chips(j.deltas)}</div>` : ''}</div>`;
      case 'letter': return `<div class="ce ce-letter">${icon('scroll')}<p>${sentences(j.text)}</p></div>`;
      case 'warn': return `<div class="ce ce-warn">${icon('warning')}<p>${esc(j.text)}</p></div>`;
      case 'note': return `<p class="ce ce-note">${esc(j.text)}</p>`;
      case 'plan': return `<div class="ce ce-plan">${icon('scroll')}<span>${esc(j.text)}</span></div>`;
      case 'memory': return `<div class="ce ce-memory"><div class="ce-etitle">${icon('heart')}<span>${esc(j.title)}</span><small>${j.age}세의 기억</small></div><p>${esc(j.text)}</p>${j.choice ? `<div class="ce-choice">${icon('chevron')}<span>${esc(j.choice)}</span></div>` : ''}${j.traits?.length ? `<div class="ce-chips">${j.traits.map(id => traitChip(id, { prefix: '남은 열쇠 · ' })).join('')}</div>` : ''}</div>`;
      case 'trait': {
        const d = TRAITS[j.id];
        if (!d) return '';
        const verb = j.gained ? (d.kind === 'keyword' ? '열쇠를 얻었다' : d.kind === 'negative' ? '특성이 생겼다' : '특성을 얻었다') : (d.kind === 'negative' ? '이겨 냈다' : '잃었다');
        return `<div class="ce ce-trait ce-trait--${kindCls(d.kind)} ${j.gained ? 'gained' : 'lost'}">${traitToken(j.id)}<div><span class="ct-main">「${esc(d.name)}」 ${verb}</span>${j.cause ? `<small>${esc(j.cause)}</small>` : ''}</div></div>`;
      }
      case 'bond': {
        const n = s.npcs[j.npc];
        if (!n) return '';
        const up = j.to > j.from;
        return `<div class="ce ce-bond ${up ? 'up' : 'down'}">${portrait(n, 30)}<div><span class="ct-main">${esc(n.name)}</span>${tierBadge(j.to, { small: true })}${j.cause ? `<small>${esc(j.cause)}</small>` : ''}</div></div>`;
      }
      case 'yearEnd': return `<div class="ce ce-yearend">${icon('ledger')}<span>${esc(j.text)}</span><b class="${j.net < 0 ? 'neg' : 'pos'}">${j.net >= 0 ? '+' : ''}${j.net}C</b></div>`;
      default: return '';
    }
  }

  function drawChronicle() {
    chron.innerHTML = '';
    const from = s.year - 2;
    for (const j of s.journal) {
      if (j.year < from) continue;
      yearSection(j.year, j.age).insertAdjacentHTML('beforeend', entryHtml(j));
    }
    chron.querySelectorAll('.sent').forEach(x => x.style.animation = 'none');
    lastRef = s.journal[s.journal.length - 1] || null;
    chron.scrollTop = chron.scrollHeight;
  }

  function appendNew() {
    const idx = lastRef ? s.journal.lastIndexOf(lastRef) : -1;
    if (lastRef && idx < 0) { drawChronicle(); return; }
    const fresh = s.journal.slice(idx + 1);
    fresh.forEach((j, i) => {
      const sec = yearSection(j.year, j.age);
      sec.insertAdjacentHTML('beforeend', entryHtml(j));
      const node = sec.lastElementChild;
      if (node) { node.classList.add('rise'); node.style.animationDelay = `${i * 90}ms`; }
    });
    if (fresh.length) lastRef = s.journal[s.journal.length - 1];
    const nearBottom = chron.scrollHeight - chron.scrollTop - chron.clientHeight < 240;
    if (nearBottom || fresh.length) chron.scrollTo({ top: chron.scrollHeight, behavior: reduced() ? 'auto' : 'smooth' });
  }

  // ───────── 진행 ─────────
  function seasonMs() { return Math.round(YEAR_MS / 4 / speed); }
  function clearTimer() { if (timer) clearTimeout(timer); timer = null; root.querySelector('.season-track')?.classList.remove('go'); }
  function schedule() {
    clearTimer();
    if (!alive || paused || s.phase !== 'running') return;
    const ms = seasonMs();
    const track = root.querySelector('.season-track');
    track.style.setProperty('--dur', `${ms}ms`);
    track.classList.remove('go'); void track.offsetWidth; track.classList.add('go');
    timer = setTimeout(() => {
      if (ui.stack.length) { schedule(); return; } // 서랍이 열려 있으면 기다린다
      step();
    }, ms);
  }

  function step() {
    if (!alive || s.phase !== 'running' || stepping) return;
    stepping = true;
    clearTimer();
    const before = s.season;
    const res = G.advance(s);
    if (res.entries.some(e => e.kind === 'season')) ui.sfx.play('season');
    if (res.entries.some(e => e.kind === 'warn')) ui.sfx.play('fail');
    appendNew();
    drawHud();
    stepping = false;
    if (before !== s.season && s.phase === 'running') ui.sfx.play('gear');
    route();
  }

  function route() {
    if (!alive) return;
    drawHud();
    if (s.phase === 'plan') { clearTimer(); openPlan(); }
    else if (s.phase === 'event') { clearTimer(); openEvent(); }
    else if (s.phase === 'yearEnd') { clearTimer(); openLedger(); }
    else if (s.phase === 'ended') { clearTimer(); ui.autosave(); setTimeout(() => { if (alive) ui.go('ending'); }, 900); }
    else if (s.phase === 'running') schedule();
  }

  // ───────── 연초 계획 ─────────
  function openPlan() {
    if (ui.top()?.box.classList.contains('plan-modal')) return;
    let tab = 'plan';
    const opts = G.planOptions(s);
    let main = null, target = null, sub = opts.forcedSub || s.history.subs[s.history.subs.length - 1] || 'rest';
    const last = s.history.mains[s.history.mains.length - 1];
    if (last) { const [m, t] = last.split(':'); const o = opts.mains.find(x => x.id === m && (x.target || null) === (t || null) && !x.disabled); if (o) { main = o.id; target = o.target || null; } }
    if (!main) { const o = opts.mains.find(x => !x.disabled); main = o.id; target = o.target || null; }

    const body = () => {
      const b = s.brief;
      const tabs = [['plan', '계획', 'scroll'], ['news', '소식', 'bell', b.news.length + b.plans.length], ['shop', '상점', 'wrench'], ['money', '금융·치료', 'coin'], ['goal', '목표', 'star']];
      return `
        <div class="plan-tabs" role="tablist">${tabs.map(([k, l, ic, n]) => `<button class="ptab ${tab === k ? 'on' : ''}" role="tab" aria-selected="${tab === k}" data-act="tab" data-tab="${k}">${icon(ic)}<span>${l}</span>${n ? `<b>${n}</b>` : ''}</button>`).join('')}</div>
        <div class="body scroll plan-body">${tab === 'plan' ? planTab() : tab === 'news' ? newsTab() : tab === 'shop' ? shopTab() : tab === 'money' ? moneyTab() : goalTab()}</div>
        <div class="plan-foot">${planSummary()}${btn('한 해를 시작한다', 'submit', { cls: 'btn--brass', gems: 'red', attrs: 'data-silent="1" autofocus' })}</div>`;
    };
    const planSummary = () => {
      const m = G.planOptions(s).mains.find(x => x.id === main && (x.target || null) === target);
      const cost = s.ch.independent ? s.brief.cost : 0;
      return `<div class="ps-sum"><span>예상 수입 <b>${m ? m.income : 0}C</b></span><span>생계비 <b>${cost}C</b></span>${m?.cost ? `<span>수업료 <b>${m.cost}C</b></span>` : ''}<span>소지금 <b class="${s.ch.cash < 0 ? 'neg' : ''}">${s.ch.cash}C</b></span></div>`;
    };
    const planTab = () => {
      const b = s.brief;
      const o = G.planOptions(s);
      const warn = b.warnings.map(w => `<div class="alert ${w.level}">${icon('warning')}<span>${esc(w.text)}</span></div>`).join('');
      const notes = b.notes.map(n => `<div class="alert note">${icon('bell')}<span>${esc(n)}</span></div>`).join('');
      const ins = b.insolvency.length ? `<div class="alert danger">${icon('warning')}<span>소지금이 바닥났다. 금융·치료 탭의 지급 불능 경로나 공공근로로 생계를 다시 세울 수 있다.</span></div>` : '';
      const promo = b.promotion ? `<p class="small muted">${icon('star')} 다음 직급 ${esc(b.promotion.next)}: ${b.promotion.reasons.length ? esc(b.promotion.reasons.join(' · ')) : '조건 충족, 자리를 기다린다'}</p>` : '';
      return `
        <div class="plan-grid">
          <section class="paper plan-state">
            <h4>${s.year}년 · ${s.age}세의 형편</h4>
            ${ins}${warn}${notes}
            ${s.ch.independent ? `<div class="cost-box"><div class="cb-head"><span>올해 생계비</span><b>${b.cost}C</b><small>물가 ${b.price}</small></div><ul>${b.breakdown.map(x => `<li><span>${esc(x.label || x[0])}</span><b>${esc(x.v ?? x[1])}C</b></li>`).join('')}</ul><small class="muted">다음 해 예상 ${b.nextRange[0]}~${b.nextRange[1]}C</small></div>` : `<p class="small">아직 보호자의 집에서 산다. 생계비는 들지 않는다. 18세에 독립한다.</p>`}
            ${promo}
          </section>
          <section class="plan-choose">
            <h4 class="sec-title">${icon('wrench')}주 활동 <small>한 해의 대부분을 쓴다</small></h4>
            <div class="main-list" role="radiogroup" aria-label="주 활동">
              ${o.mains.map(m => {
                const on = m.id === main && (m.target || null) === target;
                return `<button class="opt ${on ? 'on' : ''}" role="radio" aria-checked="${on}" data-act="main" data-id="${m.id}" data-target="${m.target || ''}" ${m.disabled ? `disabled data-tip="${esc(m.disabled)}"` : ''}>
                  <span class="opt-head"><span class="opt-name">${esc(m.name)}</span><span class="chip chip--good">${m.income ? `+${m.income}C` : '수입 없음'}</span>${m.cost ? `<span class="chip chip--cost">−${m.cost}C</span>` : ''}</span>
                  <span class="opt-desc">${esc(m.desc)}</span>${m.keyTrait || m.traitTags?.length ? `<span class="opt-traits">${m.keyTrait ? traitChip(m.keyTrait.id, { prefix: '열쇠로 열림 · ' }) : ''}${(m.traitTags || []).map(t => `<span class="chip ${t.good ? 'chip--good' : 'chip--bad'}">${icon('star')}${esc(t.text)}</span>`).join('')}</span>` : ''}${m.disabled ? `<span class="opt-warn">${esc(m.disabled)}</span>` : ''}
                </button>`;
              }).join('')}
            </div>
            <h4 class="sec-title">${icon('heart')}보조 약속 <small>사건에서 한 번 꺼내 쓸 수 있다</small></h4>
            <div class="sub-list" role="radiogroup" aria-label="보조 약속">
              ${o.subs.map(x => `<button class="pill ${x.id === sub ? 'on' : ''}" role="radio" aria-checked="${x.id === sub}" data-act="sub" data-id="${x.id}" ${o.forcedSub && o.forcedSub !== x.id ? 'disabled' : ''} data-tip="${esc(x.desc)}">${esc(x.name)}</button>`).join('')}
            </div>
            ${o.forcedSub ? '<p class="small muted">상호회 지원을 받아 올해 보조 약속은 돌봄으로 고정되었다.</p>' : ''}
          </section>
        </div>`;
    };
    const newsTab = () => {
      const b = s.brief;
      return `<div class="news-sheet paper">
        <div class="ns-mast"><span>황동 일보</span><small>${s.year}년 신년호 · ${esc(s.city.phaseName || '')}</small></div>
        ${b.news.length ? b.news.map(n => `<article class="ns-item ${n.kind}"><p>${esc(n.text)}</p>${n.editor ? `<p class="ns-editor">${icon('scroll')}<span>${esc(n.editor)}</span></p>` : ''}</article>`).join('') : '<p class="muted">조용한 새해다. 큰 기사는 없다.</p>'}
        ${b.plans.length ? `<h5>세력들의 올해 계획</h5><ul class="ns-plans">${b.plans.map(p => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}
      </div>`;
    };
    const shopTab = () => `<div class="shop-grid">${SHOP.map(id => {
      const it = ITEMS[id]; const owned = it.slot !== 'consumable' && s.ch.items.includes(id); const cnt = s.ch.consumables[id] || 0;
      const ab = it.device ? Object.entries(ABILITIES).find(([, a]) => a.device === id)?.[1] : null;
      return `<div class="slot-card ${owned ? 'owned' : ''}">
        <div class="sc-ico">${icon(it.slot === 'tool' ? 'wrench' : it.slot === 'guard' ? 'heart' : it.slot === 'consumable' ? 'key' : 'gear')}</div>
        <div class="sc-body"><b>${esc(it.name)}</b><small>${esc(it.desc)}</small>${ab ? `<span class="chip chip--teal">${esc(ab.name)} 대응 장치</span>` : ''}</div>
        <div class="sc-act">${owned ? `<span class="chip chip--good">${s.ch.equipment[it.slot] === id ? '장착 중' : '보유'}</span>${s.ch.equipment[it.slot] !== id && ['tool', 'guard', 'aux'].includes(it.slot) ? btn('장착', `equip:${id}`, { cls: 'btn--sm' }) : ''}` : `${btn(`${it.price}C`, `buy:${id}`, { cls: 'btn--sm', attrs: s.ch.cash < it.price ? 'disabled' : '' })}${cnt ? `<small>보유 ${cnt}</small>` : ''}`}</div>
      </div>`;
    }).join('')}</div><p class="small muted">장비는 연초에만 살 수 있다. 판정 보너스는 도구·준비·지원 각각 최대 +10%p.</p>`;
    const moneyTab = () => {
      const loans = G.loanOffers(s);
      const ws = G.workshopOffer(s);
      const ins = s.brief.insolvency;
      return `<div class="money-grid">
        <section class="paper mg-card"><h4>${icon('coin')}대출</h4>${loans.length ? loans.map(o => `<div class="mg-row"><div><b>${esc(o.name)}</b><small>${o.amount}C · 연 ${Math.round((o.shown ?? o.rate) * 100)}%${o.note ? esc(o.note) : ''}${o.reason ? ` · ${esc(o.reason)}` : ''}</small></div>${btn('빌린다', `loan:${o.id}`, { cls: 'btn--sm', attrs: o.ok ? '' : 'disabled' })}</div>`).join('') : '<p class="small muted">독립한 뒤에 대출을 받을 수 있다.</p>'}
          ${s.ch.debts.length ? `<div class="mg-debts">${s.ch.debts.map(d => `<div class="small">${d.lender === 'sera' ? '세라 바인' : '시민 은행'} 잔액 ${d.principal}C · 연 ${Math.round(d.rate * 100)}%${d.overdue ? ` · <b class="neg">연체 ${d.overdue}회</b>` : ''}</div>`).join('')}</div>` : ''}</section>
        <section class="paper mg-card"><h4>${icon('home')}공방</h4>${s.ch.workshop ? `<p class="small">공방 운영 중 · 설비 가치 ${s.ch.workshop.value}C · 품질 ${s.ch.workshop.quality}</p>` : ws ? `<p class="small">${ws.price}C로 작은 공방을 연다. 주 활동으로 공방 운영을 고를 수 있게 된다.</p>${ws.perks?.length ? `<div class="opt-traits">${ws.perks.map(p => `<span class="chip chip--good">${icon('star')}${esc(p)}</span>`).join('')}</div>` : ''}${ws.reason ? `<p class="small neg">${esc(ws.reason)}</p>` : ''}${btn('공방을 연다', 'workshop', { cls: 'btn--sm', attrs: ws.ok ? '' : 'disabled' })}` : '<p class="small muted">독립한 뒤에 공방을 열 수 있다.</p>'}</section>
        <section class="paper mg-card"><h4>${icon('heart')}흰 종 병원가</h4><p class="small">공명 안정화 치료 15C · 공명부하 −20 · 건강 +6</p>${btn('치료받는다', 'treat', { cls: 'btn--sm', attrs: s.ch.cash < 15 ? 'disabled' : '' })}</section>
        ${ins.length ? `<section class="paper mg-card danger"><h4>${icon('warning')}지급 불능 경로</h4>${ins.map(p => `<div class="mg-row"><div><b>${esc(p.name)}</b><small>${esc(p.desc)}</small></div>${p.id === 'publicwork' ? '<span class="chip">주 활동에서 선택</span>' : btn('택한다', `ins:${p.id}`, { cls: 'btn--sm', attrs: s.flags['insolvency_' + p.id] === s.year ? 'disabled' : '' })}</div>`).join('')}</section>` : ''}
        ${G.canRetire(s) ? `<section class="paper mg-card"><h4>${icon('door')}은퇴</h4><p class="small">일을 내려놓고 삶을 결산한다. 되돌릴 수 없다.</p>${btn('은퇴하고 결산한다', 'retire', { cls: 'btn--sm btn--copper' })}</section>` : ''}
      </div>`;
    };
    const goalTab = () => {
      const gv = goalView(s);
      return `<div class="goal-now paper">
        <h4>${icon('star')}지금의 목표 · ${esc(gv?.name || '없음')}</h4>
        ${gv ? `<ol class="stage-list">${gv.stages.map((st, i) => `<li class="${i < gv.stage ? 'done' : i === gv.stage ? 'now' : ''}"><b>${i + 1}</b><span>${esc(st)}</span>${i < gv.stage ? icon('check') : ''}</li>`).join('')}</ol><p class="small">보상: ${esc(gv.reward)}</p>${goalTraitsHtml(gv)}` : ''}
      </div>
      <h4 class="sec-title">${icon('scroll')}목표 바꾸기 <small>이미 한 일은 새 목표에도 인정된다</small></h4>
      <div class="goal-alt">${Object.entries(GOALS).map(([id, g]) => `<button class="opt ${s.goal?.id === id ? 'on' : ''}" data-act="goal:${id}" ${s.goal?.id === id ? 'disabled' : ''}><span class="opt-head"><span class="opt-name">${esc(g.name)}</span><span class="chip">${s.goalProgress?.[id] || 0}/3</span></span><span class="opt-desc">${esc(g.stages.join(' → '))}</span></button>`).join('')}</div>`;
    };

    const entry = ui.open(frame(`<div class="plan-wrap">${body()}</div>`, { title: `${s.year}년 연초 계획` }), {
      dismiss: false, cls: 'plan-modal', title: '연초 계획',
      onAct(act, a, e, en) {
        const [k, arg] = act.split(':');
        let redraw = true;
        if (k === 'tab') { tab = a.dataset.tab; ui.sfx.play('page'); }
        else if (k === 'main') { main = a.dataset.id; target = a.dataset.target || null; ui.sfx.play('select'); }
        else if (k === 'sub') { sub = a.dataset.id; ui.sfx.play('select'); }
        else if (k === 'buy') { const r = G.buy(s, arg); if (!r.ok) ui.toast(r.reason); else ui.sfx.play('coin'); }
        else if (k === 'equip') G.equip(s, arg);
        else if (k === 'loan') { if (G.takeLoan(s, arg)) ui.sfx.play('coin'); }
        else if (k === 'workshop') { if (G.openWorkshop(s)) ui.toast('공방을 열었다', { ico: 'home' }); }
        else if (k === 'treat') G.treatment(s);
        else if (k === 'ins') G.useInsolvencyPath(s, arg);
        else if (k === 'goal') { G.changeGoal(s, arg); ui.sfx.play('stamp'); }
        else if (k === 'retire') { confirmRetire(); redraw = false; }
        else if (k === 'submit') { submit(en); redraw = false; }
        if (redraw) refresh(en);
      },
      keys(e, en) {
        if (e.key === 'Enter' && !e.target.closest('button')) { e.preventDefault(); submit(en); }
      },
    });
    const refresh = (en) => {
      const wrap = en.box.querySelector('.plan-wrap');
      const sc = wrap.querySelector('.plan-body')?.scrollTop || 0;
      const focusKey = document.activeElement?.dataset?.act + '|' + (document.activeElement?.dataset?.id || '') + '|' + (document.activeElement?.dataset?.tab || '');
      wrap.innerHTML = body();
      wrap.querySelector('.plan-body').scrollTop = sc;
      const again = [...wrap.querySelectorAll('[data-act]')].find(x => `${x.dataset.act}|${x.dataset.id || ''}|${x.dataset.tab || ''}` === focusKey);
      (again || wrap.querySelector('[data-act="submit"]'))?.focus({ preventScroll: true });
      drawHud();
      appendNew();
    };
    const submit = (en) => {
      if (!G.submitPlan(s, main, target, sub)) { ui.toast('이 계획은 지금 고를 수 없다'); shake(en.box); ui.sfx.play('fail'); return; }
      ui.sfx.play('steam');
      ui.close(en);
      appendNew();
      if (paused && ui.settings.autoplay) paused = false;
      route();
    };
    const confirmRetire = () => {
      ui.open(frame(`<div class="confirm"><h3>은퇴하고 삶을 결산할까?</h3><p>이 선택은 되돌릴 수 없다. 지금까지의 기록으로 엔딩이 정해진다.</p><div class="row">${btn('아직은', 'close', { cls: 'btn--ghost' })}${btn('은퇴한다', 'yes', { cls: 'btn--copper' })}</div></div>`, { cls: 'frame--sm' }), {
        onAct(act) { if (act === 'yes') { G.retire(s); ui.closeAll(); route(); } },
      });
    };
    ui.autosave();
  }

  // ───────── 사건 ─────────
  function openEvent() {
    if (ui.top()?.box.classList.contains('event-modal')) return;
    const cur = s.current;
    if (!cur) return;
    const j = [...s.journal].reverse().find(x => x.kind === 'event' && x.eventId === cur.eventId);
    const cat = j?.category || 'life';
    const people = Object.values(cur.roles || {}).map(id => s.npcs[id]).filter((n, i, a) => n && a.indexOf(n) === i).slice(0, 3);
    let token = cur.token;
    let locked = false;

    const choicesHtml = () => G.getChoices(s).map((c, i) => {
      const tb = c.parts?.trait || 0;
      const odds = c.chance != null ? `<span class="c-odds ${tb > 0 ? 'boosted' : tb < 0 ? 'hindered' : ''}" data-tip="${esc(oddsTip(c))}"><b>${c.chance}%</b><small>${esc(ATTRS[c.check.attr] || '')} 판정</small>${tb ? `<i class="c-odds-tr">특성 ${tb > 0 ? '+' : ''}${tb}</i>` : ''}</span>` : `<span class="c-odds sure"><b>확정</b></span>`;
      // 열쇠·인연으로 열린 선택지는 띠를 두르고, 잠긴 선택지는 무엇이 필요한지 보여 준다
      const kind = c.locked ? 'locked' : c.key ? 'key' : c.bond ? 'bond' : '';
      const ribbon = c.locked === 'key' ? `<span class="c-ribbon lock">${icon('lock')}${esc(c.key.names.map(n => `「${n}」`).join(' 또는 '))} 필요</span>`
        : c.locked === 'bond' ? `<span class="c-ribbon lock">${icon('lock')}${esc(c.bond.name)} · ${esc(c.bond.tierName)} 필요 <em>지금 ${esc(c.bond.now)}</em></span>`
        : c.key ? `<span class="c-ribbon key">${icon('key')}${esc(c.key.names.map(n => `「${n}」`).join(' '))}${c.key.kind === 'keyword' ? ' · 열쇠가 연 길' : ' · 특성이 연 길'}</span>`
        : c.bond ? `<span class="c-ribbon bond">${icon('link')}인연이 연 길 · ${esc(josa(c.bond.name, '과'))} 「${esc(c.bond.now)}」</span>` : '';
      const tr = [...(c.rewards || []).map(t => traitChip(t.id, { prefix: t.kind === 'negative' ? '생김 · ' : '얻음 · ' })),
        ...(c.failTraits || []).map(t => traitChip(t.id, { prefix: '실패 시 · ', cls: 'risk' })),
        ...(c.sheds || []).map(t => traitChip(t.id, { prefix: t.kind === 'negative' ? '벗어남 · ' : '잃음 · ', cls: t.kind === 'negative' ? 'shed' : 'risk' }))].join('');
      return `<button class="choice ${kind ? `choice--${kind}` : ''}" data-id="${esc(c.id)}" ${c.disabled ? 'disabled' : ''}>
        <span class="key">${c.locked ? icon('lock') : i + 1}</span>
        <span class="c-main">${ribbon}<span class="c-label">${esc(c.label)}</span>${c.hint ? `<span class="c-hint">${esc(c.hint)}</span>` : ''}
          ${tr ? `<span class="c-meta c-traits">${tr}</span>` : ''}
          <span class="c-meta">${c.cost.map(x => `<span class="chip chip--cost">${esc(x)}</span>`).join('')}${c.irreversible ? `<span class="chip chip--lock">${icon('lock')}되돌릴 수 없음</span>` : ''}${c.risk ? `<span class="chip chip--bad">${esc(c.risk)}</span>` : ''}${c.tag === 'resonance' ? `<span class="chip chip--teal">${icon('wave')}공명</span>` : ''}${c.failHint && c.chance != null ? `<span class="chip">${esc(c.failHint)}</span>` : ''}${c.disabled && !c.locked ? `<span class="chip chip--bad">${esc(c.disabled)}</span>` : ''}</span></span>
        ${odds}
      </button>`;
    }).join('');

    const sceneHtml = () => {
      const si = sceneInfo(s);
      if (!si) return '';
      const pips = (n, max, cls) => Array.from({ length: max }, (_, i) => `<i class="${i < n ? 'on' : ''} ${cls}"></i>`).join('');
      return `<div class="scene-meter"><span>진행 ${pips(si.progress, si.goal, 'p')}</span><span>위험 ${pips(si.risk, si.riskMax, 'r')}</span><span class="small muted">${Math.min(si.turn + 1, si.maxTurns)} / ${si.maxTurns}턴</span></div>`;
    };

    const html = frame(`
      <div class="ev-head">
        <div class="ev-film">${eventArt(cat)}
          <svg class="ev-thread" viewBox="0 0 320 120" preserveAspectRatio="none" aria-hidden="true"><path d="M-10 30 C 60 80, 120 0, 180 50 S 300 90, 330 20" pathLength="400"/><circle cx="58" cy="57" r="4"/><circle cx="262" cy="64" r="4"/></svg>
        </div>
        <div class="ev-card">
          <div class="ev-cat">${icon(CAT_ICON[cat] || 'scroll')}${esc(CATEGORY_NAMES[cat] || '사건')} · ${s.year}년 ${SEASONS[s.season]}</div>
          <h2 class="event-title">${esc(j?.title || '')}</h2>
          ${people.length ? `<div class="ev-people">${people.map(n => `<span class="evp">${portrait(n, 34)}<span>${esc(n.name)}</span></span>`).join('')}</div>` : ''}
        </div>
      </div>
      <div class="ev-body paper scroll body">
        <div class="ev-log"><p class="ev-text">${sentences(j?.text || '')}</p></div>
        <div class="ev-scene">${sceneHtml()}</div>
        <div class="choice-list">${choicesHtml()}</div>
      </div>`, { cls: 'frame--dark' });

    const entry = ui.open(html, {
      dismiss: false, cls: 'event-modal', title: j?.title || '사건',
      onAct(act, a, e, en) { if (act === 'continue') finish(en); },
      keys(e, en) {
        const n = Number(e.key);
        if (n >= 1 && n <= 9) {
          const b = en.box.querySelectorAll('.choice')[n - 1];
          if (b && !b.disabled) { e.preventDefault(); pick(b.dataset.id, en); }
        }
        if ((e.key === 'Enter' || e.key === ' ') && en.box.querySelector('[data-act="continue"]') && !e.target.closest('.choice')) { e.preventDefault(); finish(en); }
      },
    });
    ui.sfx.play('event');
    ui.quicksave(); // 사건이 열린 장면에서 새로고침해도 같은 장면으로 돌아온다
    const box = entry.box;
    const list = box.querySelector('.choice-list');
    list.style.visibility = 'hidden';
    const sentCount = (j?.text.match(/[.!?…]/g) || []).length;
    setTimeout(() => { list.style.visibility = ''; stagger(list, '.choice'); list.querySelector('.choice:not(:disabled)')?.focus({ preventScroll: true }); }, reduced() ? 0 : Math.min(1500, 700 + sentCount * 70));
    box.addEventListener('click', (e) => {
      const c = e.target.closest('.choice');
      if (c && !c.disabled) pick(c.dataset.id, entry);
    });

    function pick(id, en) {
      if (locked) return;
      locked = true;
      en.box.querySelectorAll('.choice').forEach(b => { b.disabled = true; if (b.dataset.id === id) b.classList.add('is-chosen'); else b.classList.add('is-dim'); });
      const res = G.choose(s, id, token);
      if (!res.ok) { locked = false; ui.toast('지금은 고를 수 없다'); en.box.querySelectorAll('.choice').forEach(b => { b.disabled = false; b.classList.remove('is-chosen', 'is-dim'); }); return; }
      token = s.current?.token ?? null;
      ui.quicksave(); // 선택마다 저장: 판정은 다시 굴려지지 않는다
      const r = res.result;
      const log = en.box.querySelector('.ev-log');
      const stampTxt = r.success === true ? '성공' : r.success === false ? '실패' : '';
      const block = document.createElement('div');
      block.className = `ev-result ${r.success === false ? 'fail' : r.success ? 'ok' : ''}`;
      block.innerHTML = `
        <div class="er-choice">${icon('chevron')}<span>${esc(r.choice)}</span>${stampTxt ? `<span class="stamp ${r.success ? 'ok' : 'fail'}">${stampTxt}<small>${r.chance}%</small></span>` : ''}</div>
        ${r.text ? `<p>${sentences(r.text)}</p>` : ''}
        ${r.deltas.length ? `<div class="ce-chips">${chips(r.deltas)}</div>` : ''}
        ${res.followup ? `<div class="er-follow"><p>${sentences(res.followup.text)}</p>${res.followup.deltas?.length ? `<div class="ce-chips">${chips(res.followup.deltas)}</div>` : ''}</div>` : ''}
        ${res.nextText ? `<div class="er-next"><p>${sentences(res.nextText)}</p></div>` : ''}
        ${changesHtml(res)}`;
      log.appendChild(block);
      block.classList.add('rise');
      if (res.traits?.length || res.bonds?.some(b => b.to > b.from)) setTimeout(() => ui.sfx.play('bell'), 420);
      if (r.success === true) ui.sfx.play('stamp'); else if (r.success === false) { ui.sfx.play('fail'); shake(en.box.querySelector('.ev-body')); } else ui.sfx.play('page');
      drawHud();
      const listEl = en.box.querySelector('.choice-list');
      const bodyEl = en.box.querySelector('.ev-body');
      setTimeout(() => {
        if (res.done) {
          listEl.innerHTML = `<div class="ev-continue">${btn('계속', 'continue', { cls: 'btn--brass', gems: 'teal' })}</div>`;
        } else {
          en.box.querySelector('.ev-scene').innerHTML = sceneHtml();
          listEl.innerHTML = choicesHtml();
        }
        stagger(listEl);
        listEl.querySelector('button:not(:disabled)')?.focus({ preventScroll: true });
        bodyEl.scrollTo({ top: bodyEl.scrollHeight, behavior: reduced() ? 'auto' : 'smooth' });
        locked = false;
      }, reduced() ? 50 : 650);
      bodyEl.scrollTo({ top: bodyEl.scrollHeight, behavior: reduced() ? 'auto' : 'smooth' });
    }
    function finish(en) {
      ui.close(en);
      appendNew();
      drawHud();
      route();
    }
  }

  // 선택 결과로 생긴 특성·인연 변화: 도장처럼 찍히는 카드
  function changesHtml(res) {
    const tr = (res.traits || []).filter(t => TRAITS[t.id]);
    const bd = res.bonds || [];
    if (!tr.length && !bd.length) return '';
    return `<div class="er-changes">
      ${tr.map((t, i) => { const d = TRAITS[t.id]; const k = kindCls(d.kind); return `<div class="er-trait er-trait--${k} ${t.gained ? 'gained' : 'lost'}" style="animation-delay:${300 + i * 140}ms">${traitToken(t.id, { cls: 'tk--lg' })}<div><small>${t.gained ? (d.kind === 'keyword' ? '열쇠 획득' : d.kind === 'negative' ? '특성 생김' : '특성 획득') : (d.kind === 'negative' ? '극복' : '잃음')}</small><b>${esc(d.name)}</b><span>${esc(t.gained ? (d.effects?.join(' · ') || d.opens || d.desc) : (d.kind === 'negative' ? '더는 당신을 붙잡지 않는다' : '이 열쇠로 열리던 길이 닫혔다'))}</span></div></div>`; }).join('')}
      ${bd.map((b, i) => { const n = s.npcs[b.npc]; return `<div class="er-bond ${b.to > b.from ? 'up' : 'down'}" style="animation-delay:${300 + (tr.length + i) * 140}ms">${n ? portrait(n, 36) : ''}<div><small>인연 ${b.to > b.from ? '깊어짐' : '멀어짐'}</small><b>${esc(b.name || '')}</b><span class="er-tiers">${tierBadge(b.from, { small: true })}${icon('chevron')}${tierBadge(b.to, { small: true })}</span></div></div>`; }).join('')}
    </div>`;
  }

  function groupCity(list) {
    const m = new Map();
    for (const c of list) { const k = c.cause || ''; if (!m.has(k)) m.set(k, []); m.get(k).push(c.text || String(c)); }
    return [...m.entries()];
  }

  function oddsTip(c) {
    const p = c.parts;
    if (!p) return '';
    const lines = [
      `기본 50`,
      `${ATTRS[c.check.attr]} ${p.attr} − 난이도 ${p.diff} → ${p.attr - p.diff >= 0 ? '+' : ''}${5 * (p.attr - p.diff)}`,
      p.skill ? `숙련 ${p.skill} × 8 → +${8 * p.skill}` : null,
      p.tool ? `도구·장치 +${p.tool}` : null,
      p.prep ? `준비 +${p.prep}` : null,
      p.support ? `지원 +${p.support}` : null,
      p.trait ? `특성 ${p.trait > 0 ? '+' : ''}${p.trait}${p.traitNotes?.length ? ` (${p.traitNotes.join(', ')})` : ''}` : null,
      p.penalty ? `불이익 −${p.penalty}${p.notes.length ? ` (${p.notes.join(', ')})` : ''}` : null,
      `= ${c.chance}% (5~95% 범위)`,
    ];
    return lines.filter(Boolean).join('\n');
  }

  // 결산의 「특성과 인연」: 올해 얻고 잃은 특성, 바뀐 인연, 특성이 실제로 움직인 숫자
  function ledgerTraitCard(st) {
    const tr = (st.traits || []).filter(t => TRAITS[t.id]);
    const bd = st.bonds || [];
    const fx = (st.traitFx || []).filter(f => f.v);
    if (!tr.length && !bd.length && !fx.length) return '';
    return `<section class="lg-card wide lg-traits"><h4>${icon('key')}특성과 인연</h4>
      ${tr.length ? `<div class="lt-row">${tr.map(t => traitChip(t.id, { prefix: t.gained ? (TRAITS[t.id].kind === 'negative' ? '생김 · ' : '얻음 · ') : (TRAITS[t.id].kind === 'negative' ? '극복 · ' : '잃음 · '), cls: t.gained ? '' : 'shed' })).join('')}</div>` : ''}
      ${bd.length ? `<ul class="lt-bonds">${bd.map(b => { const n = s.npcs[b.npc]; return n ? `<li>${portrait(n, 26)}<b>${esc(n.name)}</b><span class="er-tiers">${tierBadge(b.from, { small: true })}${icon('chevron')}${tierBadge(b.to, { small: true })}</span>${b.cause ? `<small>${esc(b.cause)}</small>` : ''}</li>` : ''; }).join('')}</ul>` : ''}
      ${fx.length ? `<ul class="lt-fx">${fx.map(f => `<li class="${fxGood(f.what, f.v) ? 'good' : 'bad'}"><span class="lt-who">${f.ids.map(id => traitToken(id)).join('')}<span>${esc(f.ids.map(id => `「${TRAITS[id]?.name || id}」`).join(' '))}</span></span><b>${esc(f.what.replace('(C)', ''))} ${f.v > 0 ? '+' : ''}${f.v}${f.what.endsWith('(C)') ? 'C' : ''}</b></li>`).join('')}</ul>` : ''}
    </section>`;
  }

  // ───────── 연말 결산 ─────────
  function openLedger() {
    if (ui.top()?.box.classList.contains('ledger-modal')) return;
    const st = s.settlement;
    const rows = [
      ['일 수입', st.workIncome, 'pos'], ['사건 수입', st.eventIncome, 'pos'], ['생계비', -st.living, 'neg'], ['사건 지출', -st.spent, 'neg'],
    ].filter(r => r[1]);
    const html = frame(`
      <div class="body scroll ledger-body">
        <div class="ledger-sheet paper">
          <div class="ls-head"><span>${st.year}년 장부</span><small>${st.age}세 · ${esc(st.plan || '')} · 보조 약속 ${esc(SUB_COMMITMENTS[st.sub]?.name || '')}${st.subUsed ? ' (사용)' : ''}</small></div>
          <table class="ls-table"><tbody>
            ${rows.map(r => `<tr><th>${r[0]}</th><td class="${r[1] < 0 ? 'neg' : 'pos'}">${r[1] > 0 ? '+' : ''}${r[1]}C</td></tr>`).join('')}
            <tr class="sum"><th>순변화</th><td class="${st.net < 0 ? 'neg' : 'pos'}"><b data-count="${st.net}">0</b>C</td></tr>
            <tr><th>연말 잔액</th><td><b data-count="${st.cash}">0</b>C${st.debt ? ` <small>부채 ${st.debt}C</small>` : ''}</td></tr>
          </tbody></table>
          <div class="ls-class"><span class="chip">${esc(LIFE_CLASSES[st.lifeClass])}</span><span class="chip">${esc(PUBLIC_RANKS[st.publicRank])}</span></div>
        </div>
        <div class="ledger-cols">
          ${st.events.length ? `<section class="lg-card"><h4>${icon('scroll')}올해의 사건</h4><ul>${st.events.map(e => `<li><b>${esc(e.title)}</b><span>${esc(e.choice)}${e.success === true ? ' · 성공' : e.success === false ? ' · 실패' : ''}</span></li>`).join('')}</ul></section>` : ''}
          ${st.rel.length ? `<section class="lg-card"><h4>${icon('people')}관계의 변화</h4><ul>${st.rel.map(r => `<li><b>${esc(r.name)}</b><span>${r.trust ? `신뢰 ${r.trust > 0 ? '+' : ''}${r.trust}` : ''}${r.trust && r.aff ? ' · ' : ''}${r.aff ? `호감 ${r.aff > 0 ? '+' : ''}${r.aff}` : ''}</span>${r.causes.length ? `<small>${esc(r.causes.slice(0, 2).join(', '))}</small>` : ''}</li>`).join('')}</ul></section>` : ''}
          ${st.skills.length || st.actLog?.length ? `<section class="lg-card"><h4>${icon('wrench')}성장</h4><div class="ce-chips">${chips([...new Set([...(st.actLog || []), ...st.skills])])}</div></section>` : ''}
          ${ledgerTraitCard(st)}
          ${st.city.length ? `<section class="lg-card"><h4>${icon('map')}도시의 변화</h4><ul>${groupCity(st.city).map(([cause, list]) => `<li><span>${esc(list.join(' · '))}</span>${cause ? `<small>${esc(cause)}</small>` : ''}</li>`).join('')}</ul></section>` : ''}
          ${st.causes.length || st.debtLog?.length ? `<section class="lg-card wide"><h4>${icon('bell')}왜 이렇게 되었나</h4><ul class="causes">${[...st.causes, ...(st.debtLog || [])].map(c => `<li>${esc(c)}</li>`).join('')}</ul></section>` : ''}
          ${st.goal?.length ? `<section class="lg-card wide goal-hit"><h4>${icon('star')}목표</h4><ul>${st.goal.map(g => `<li>${esc(g)}</li>`).join('')}</ul></section>` : ''}
        </div>
      </div>
      <div class="ledger-foot">${btn(`${st.year + 1}년으로`, 'next', { cls: 'btn--brass', gems: 'red' })}</div>`, { title: `${st.year}년 연말 결산` });
    const entry = ui.open(html, {
      dismiss: false, cls: 'ledger-modal', title: '연말 결산',
      onAct(act, a, e, en) { if (act === 'next') next(en); },
      keys(e, en) { if ((e.key === 'Enter' || e.key === ' ') && !e.target.closest('button:not([data-act="next"])')) { e.preventDefault(); next(en); } },
    });
    ui.sfx.play('ledger');
    entry.box.querySelectorAll('[data-count]').forEach((n, i) => setTimeout(() => countUp(n, 0, Number(n.dataset.count), 600, v => (n.closest('.sum') && v > 0 ? '+' : '') + v), 300 + i * 150));
    ui.announceAchievements(st.achievements);
    let done = false;
    function next(en) {
      if (done) return;
      done = true;
      G.continueYear(s);
      ui.close(en);
      appendNew();
      setTimeout(route, 260);
    }
  }

  // ───────── 입력 ─────────
  root.addEventListener('click', (e) => {
    const p = e.target.closest('[data-panel]');
    if (p) { openPanel(ui, p.dataset.panel, { onChange: () => drawHud() }); return; }
    const a = e.target.closest('[data-act]');
    if (!a || a.disabled) return;
    if (a.dataset.act === 'toggle') togglePause();
    if (a.dataset.act === 'speed') cycleSpeed();
    if (a.dataset.act === 'step') step();
  });
  function togglePause() {
    if (s.phase !== 'running') return;
    paused = !paused;
    ui.sfx.play(paused ? 'click' : 'gear');
    drawControls();
    if (paused) clearTimer(); else schedule();
  }
  function cycleSpeed() {
    speed = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
    ui.setSetting('speed', speed);
    drawControls();
    if (!paused && s.phase === 'running') schedule();
  }

  drawHud(true);
  drawChronicle();
  stagger(root, '.side-menu .menu-item');
  setTimeout(route, reduced() ? 0 : 450);

  const keyPanels = { c: 'me', t: 'traits', p: 'people', m: 'city', l: 'ledger', k: 'codex', o: 'settings' };
  return {
    particles: 'steam',
    keys(e) {
      if (e.key === ' ') { e.preventDefault(); togglePause(); }
      else if (e.key === 'Enter' && !e.target.closest('button')) { e.preventDefault(); if (s.phase === 'running') step(); }
      else if (e.key === 'f' || e.key === 'F') { e.preventDefault(); cycleSpeed(); }
      else if (keyPanels[e.key.toLowerCase()] && !e.ctrlKey && !e.metaKey) { e.preventDefault(); openPanel(ui, keyPanels[e.key.toLowerCase()], { onChange: () => drawHud() }); }
      else if (e.key === 'Escape') { if (s.phase === 'running' && !paused) togglePause(); }
    },
    dispose() { alive = false; clearTimer(); },
    redraw() { drawHud(); },
  };
}
