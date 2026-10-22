// 서랍 패널: 나·인물·도시·장부·기록·설정, 그리고 타이틀의 기록 보관소.
import { esc, icon, frame, btn, bar, portrait, divider } from '../dom.js';
import * as store from '../store.js';
import { SKILL_XP } from '../../core/rules.js';
import { goalView, ACHIEVEMENTS, ENDINGS } from '../../core/progress.js';
import { totalDebt, promotionStatus, annualCost } from '../../core/game.js';
import { costBreakdown } from '../../core/economy.js';
import { districtStatus } from '../../core/city.js';
import { ATTRS, SKILLS, ABILITIES, ABILITY_STAGES, ITEMS, JOBS, RANKS, DISTRICTS, FACTIONS, LIFE_CLASSES, PUBLIC_RANKS, NPC_ROLES, BACKGROUNDS, APTITUDES, GOALS } from '../../data/world.js';
import { GLOBAL_NAMES, DISTRICT_KEYS } from '../../core/rules.js';
import { traitGroups, bondView } from '../../core/traits.js';
import { traitCard, traitToken, tierBadge, kindCls, TRAITS, TRAIT_KINDS, BOND_TIERS } from '../traits.js';

const TITLES = { me: '나의 기록', traits: '특성', people: '인물', city: '도시', ledger: '장부', codex: '기록 보관소', settings: '환경 설정' };

export function openPanel(ui, name, opts = {}) {
  if (name === 'settings') return openSettings(ui, opts);
  const top = ui.top();
  if (top?.panel === name) { ui.close(top); return; }
  if (top?.kind === 'drawer') ui.close(top, true);
  const s = ui.state;
  const inner = { me: meHtml, traits: traitsHtml, people: peopleHtml, city: cityHtml, ledger: ledgerHtml, codex: codexHtml }[name](ui, s);
  const entry = ui.open(frame(`<div class="body scroll panel-body">${inner}</div>`, { title: TITLES[name], close: true }), {
    kind: 'drawer', title: TITLES[name],
    onAct(act, a) {
      if (act === 'copy-seed') copy(ui, s.seed);
      if (act.startsWith('equip:')) {
        const id = act.slice(6); const it = ITEMS[id];
        if (it && s.ch.items.includes(id)) { s.ch.equipment[it.slot] = id; ui.sfx.play('gear'); entry.box.querySelector('.panel-body').innerHTML = meHtml(ui, s); opts.onChange?.(); }
      }
    },
  });
  entry.panel = name;
  return entry;
}

function copy(ui, text) {
  navigator.clipboard?.writeText(text).then(() => ui.toast('씨앗을 복사했다', { ico: 'copy' }), () => ui.toast(text));
}

// ───────── 나 ─────────
function meHtml(ui, s) {
  const ch = s.ch;
  const attr = Object.entries(ATTRS).map(([k, l]) => `<li><span class="a-name">${l}</span><span class="pips">${Array.from({ length: 8 }, (_, i) => `<i class="${i < ch.attrs[k] ? 'on' : ''}"></i>`).join('')}</span><span class="a-val">${ch.attrs[k]}</span></li>`).join('');
  const skills = Object.entries(SKILLS).map(([k, l]) => {
    const lv = ch.skills[k], xp = ch.skillXp[k];
    const lo = SKILL_XP[lv] ?? 0, hi = SKILL_XP[lv + 1];
    const f = hi ? ((xp - lo) / (hi - lo)) * 100 : 100;
    return `<li class="${lv ? '' : 'dim'}"><span class="a-name">${l}</span><span class="sk-lv">${lv}</span>${bar(f, 100, 'bar--brass')}<small>${hi ? `${xp}/${hi}` : '최고'}</small></li>`;
  }).join('');
  const ab = ch.ability ? ABILITIES[ch.ability.id] : null;
  const slots = ['tool', 'guard', 'aux'].map(sl => {
    const id = ch.equipment[sl];
    return `<div class="eq-slot ${id ? 'full' : ''}"><small>${{ tool: '도구', guard: '보호구', aux: '보조 장치' }[sl]}</small>${id ? `<b>${esc(ITEMS[id].name)}</b>` : '<span class="muted">비어 있음</span>'}</div>`;
  }).join('');
  const items = ch.items.filter(id => !Object.values(ch.equipment).includes(id));
  const cons = Object.entries(ch.consumables).filter(([, n]) => n > 0);
  const promo = promotionStatus(s);
  return `
    <div class="me-head paper">
      ${portrait({ portrait: 'person', alive: true }, 64, 'is-me')}
      <div><h3>${esc(ch.name)}</h3><p class="small">${s.age}세 · ${esc(DISTRICTS[ch.home].name)} · ${esc(BACKGROUNDS[ch.background].name)}</p><p class="small">${esc(APTITUDES[ch.aptitude].name)} · ${ch.job ? `${esc(JOBS[ch.job.id].name)} ${RANKS[ch.job.rank]} (재직 ${ch.job.years || 0}년 · 실적 ${ch.works})` : ch.apprentice ? `${esc(JOBS[ch.apprentice].name)} 견습생` : '직업 없음'}</p></div>
    </div>
    ${promo ? `<p class="small muted panel-note">${icon('star')}다음 직급 ${esc(promo.next)}: ${promo.reasons.length ? esc(promo.reasons.join(' · ')) : '조건 충족'}</p>` : ''}
    <h4 class="sec-title">${icon('person')}능력치</h4><ul class="attr-list">${attr}</ul>
    <h4 class="sec-title">${icon('wrench')}숙련</h4><ul class="skill-list">${skills}</ul>
    <h4 class="sec-title">${icon('wave')}고유공명</h4>
    ${ab ? `<div class="ab-card ${ch.ability.registered ? '' : 'unreg'}"><b>${esc(ab.name)}</b><span class="chip chip--teal">${ABILITY_STAGES[ch.ability.stage]}</span>${ch.ability.registered ? '<span class="chip">등록됨</span>' : '<span class="chip chip--bad">미등록</span>'}<p class="small">${esc(ab.use)} · 한계: ${esc(ab.limit)} · 대가: ${esc(ab.cost)}</p><div class="ab-load"><span>공명부하</span>${bar(ch.load, 100, 'bar--rose')}<b>${ch.load}</b></div></div>`
      : `<p class="small muted">비발현. 대응 장치(열이송 펌프·배관 청진계·잔향 렌즈·정밀 정렬틀)로 같은 일을 할 수 있다.</p>`}
    <h4 class="sec-title">${icon('gear')}장비</h4><div class="eq-row">${slots}</div>
    ${items.length || cons.length ? `<div class="inv">${items.map(id => `<div class="inv-item"><span>${esc(ITEMS[id].name)}</span>${['tool', 'guard', 'aux'].includes(ITEMS[id].slot) ? btn('장착', `equip:${id}`, { cls: 'btn--sm' }) : ''}</div>`).join('')}${cons.map(([id, n]) => `<div class="inv-item"><span>${esc(ITEMS[id].name)} ×${n}</span></div>`).join('')}</div>` : ''}`;
}

// ───────── 특성 ─────────
function traitsHtml(ui, s) {
  const g = traitGroups(s);
  const lost = (s.ch.lostTraits || []).filter(t => TRAITS[t.id]);
  const sec = (kind, ico, empty) => `
    <h4 class="sec-title tsec tsec--${kindCls(kind)}">${icon(ico)}${TRAIT_KINDS[kind].name} 특성 <small>${esc(TRAIT_KINDS[kind].desc)}</small><b class="tsec-n">${g[kind].length}</b></h4>
    ${g[kind].length ? `<ul class="tcards">${g[kind].map(t => traitCard(t)).join('')}</ul>` : `<p class="small muted panel-note">${empty}</p>`}`;
  return `
    <div class="trait-sum paper">
      <div class="ts-row">${['positive', 'negative', 'keyword'].map(k => `<div class="ts-cell ts-${kindCls(k)}"><span class="tk tk--${kindCls(k)} tk--lg">${icon(k === 'positive' ? 'star' : k === 'negative' ? 'warning' : 'key')}</span><b>${g[k].length}</b><small>${TRAIT_KINDS[k].name}</small></div>`).join('')}</div>
      <p class="small">특성은 판정·수입·생계비·관계 변화에 실제로 붙고, 열쇠는 특정 사건의 선택지와 루트를 연다. 잠긴 선택지에는 필요한 열쇠와 인연이 적혀 있다.</p>
    </div>
    ${sec('positive', 'star', '아직 몸에 밴 장점이 없다. 꾸준한 생활과 인연이 장점을 만든다.')}
    ${sec('negative', 'warning', '지금은 당신을 붙잡는 그림자가 없다.')}
    ${sec('keyword', 'key', '아직 쥔 열쇠가 없다. 유년의 기억, 사건의 선택, 깊어진 인연이 열쇠를 건넨다.')}
    ${lost.length ? `<h4 class="sec-title">${icon('check')}지나온 특성 <small>극복했거나 내려놓은 것</small></h4><ul class="tcards">${lost.map(t => traitCard(t, { lost: true })).join('')}</ul>` : ''}`;
}

// ───────── 인물 ─────────
function peopleHtml(ui, s) {
  const list = Object.values(s.npcs).filter(n => n.met || n.core).sort((a, b) => (b.met - a.met) || (b.alive - a.alive) || (b.trust + b.affinity - a.trust - a.affinity));
  return `<ul class="people-list">${list.map(n => {
    const role = n.role ? NPC_ROLES[n.role]?.label : n.heirOf ? '후임' : '핵심 인물';
    const duties = n.duties.filter(d => !d.waived);
    const status = !n.alive ? '<span class="chip chip--bad">고인</span>' : n.retired ? '<span class="chip">은퇴</span>' : '';
    if (!n.met) return `<li class="person unmet">${portrait(n, 48)}<div class="p-body"><div class="p-head"><b>${esc(n.name)}</b><span class="chip">소문만 들었다</span></div><p class="small">${esc(n.job)}</p></div></li>`;
    return `<li class="person ${n.alive ? '' : 'dead'}">${portrait(n, 48)}
      <div class="p-body">
        <div class="p-head"><b>${esc(n.name)}</b><span class="chip">${esc(role || '')}</span>${status}<small>${n.age}세</small></div>
        <p class="small">${esc(n.job)}${n.faction ? ` · ${esc(FACTIONS[n.faction])}` : ''}</p>
        ${bondHtml(s, n)}
        <div class="rel-bars"><span>신뢰</span>${bar(n.trust, 100)}<b>${n.trust}</b><span>호감</span>${bar(n.affinity + 100, 200, n.affinity < 0 ? 'bar--copper' : 'bar--rose')}<b>${n.affinity}</b></div>
        ${perksHtml(s, n)}
        ${n.desc ? `<p class="small muted">${esc(n.desc)}</p>` : `<p class="small muted">바라는 것: ${esc(n.desire)} · 원칙: ${esc(n.principle)} · 약점: ${esc(n.weakness)}</p>`}
        ${duties.length ? `<ul class="duties">${duties.map(d => `<li class="${d.done ? 'done' : d.failed ? 'failed' : ''}">${icon(d.done ? 'check' : d.failed ? 'close' : 'clock')}<span>${esc(d.text)}</span><small>${d.done ? '완수' : d.failed ? '기한 넘김' : `${d.due}년까지`}</small></li>`).join('')}</ul>` : ''}
      </div></li>`;
  }).join('')}</ul>`;
}

// 인연 단계와 다음 단계까지 남은 것
function bondHtml(s, n) {
  if (!n.alive) return '';
  const v = bondView(s, n);
  return `<div class="bond-row">${tierBadge(v.tier)}${v.next ? `<small class="bond-next">${icon('chevron')}「${esc(BOND_TIERS[v.next.tier].name)}」까지 ${esc(v.next.text)}</small>` : '<small class="bond-next max">더 깊어질 수 없는 사이</small>'}</div>`;
}
// 단계별 혜택: 켜진 것은 밝게, 아직인 것은 흐리게. 열쇠 선물은 토큰으로.
function perksHtml(s, n) {
  const v = bondView(s, n);
  if (!v.perks.length) return '';
  return `<ul class="perks">${v.perks.map(p => `<li class="${p.on ? 'on' : ''} ${p.neg ? 'neg' : ''}"><span class="pk-tier">${esc(BOND_TIERS[p.tier].name)}</span>${p.gift ? traitToken(p.gift, { cls: p.giftOwned ? '' : 'dim' }) : icon(p.neg ? 'warning' : p.on ? 'check' : 'lock')}<span>${esc(p.text)}</span></li>`).join('')}</ul>`;
}

// ───────── 도시 ─────────
function cityHtml(ui, s) {
  const c = s.city;
  const glob = Object.entries(GLOBAL_NAMES).map(([k, l]) => {
    const v = Math.round(c.global[k]); const inv = ['pollution', 'tension', 'residue', 'price'].includes(k);
    return `<li><span class="a-name">${l}</span>${bar(k === 'price' ? v - 60 : v, k === 'price' ? 100 : 100, inv ? 'bar--copper' : '')}<b>${v}</b></li>`;
  }).join('');
  const dists = Object.entries(DISTRICTS).map(([id, d]) => `<div class="dist-card ${s.ch.home === id ? 'home' : ''}"><div class="dc-head"><b>${esc(d.name)}</b>${s.ch.home === id ? '<span class="chip chip--good">거주</span>' : ''}</div><p class="small muted">${esc(d.desc)}</p><ul class="mini-bars">${Object.entries(DISTRICT_KEYS).map(([k, l]) => { const v = Math.round(c.districts[id][k]); return `<li><span>${l}</span>${bar(v, 100, k === 'pollution' ? 'bar--copper' : '')}<b>${v}</b><small>${esc(districtStatus(v, k === 'pollution'))}</small></li>`; }).join('')}</ul></div>`).join('');
  const clock = c.clocks.supplyChain;
  const facts = ['office', 'guild', 'union', 'mutual'].map(f => `<li><b>${esc(FACTIONS[f])}</b><span>자금 ${c.factions[f].funds}</span><span class="${s.rep[f] < 0 ? 'neg' : ''}">평판 ${s.rep[f] > 0 ? '+' : ''}${s.rep[f]}</span>${f === 'union' && c.factions.union.striking ? '<span class="chip chip--bad">파업 중</span>' : ''}</li>`).join('');
  const news = c.news.slice(-6).reverse();
  return `
    <div class="city-phase paper"><b>${esc(c.phaseName || '')}</b><p class="small">${esc(c.phaseDesc || '')}</p>
      <div class="clock" aria-label="공급망 위기 ${clock}/6"><span>공급망 위기</span><span class="clock-pips">${Array.from({ length: 6 }, (_, i) => `<i class="${i < clock ? 'on' : ''} ${i >= 4 ? 'hot' : ''}"></i>`).join('')}</span><b>${clock}/6</b></div>
      <p class="small muted">열 수요 ${Math.round(c.demandNow ?? c.demandBase)} · 공급 ${Math.round(c.supplyNow ?? c.supplyBase)} · 부족률 ${Math.round((c.shortage || 0) * 100)}%</p>
    </div>
    <h4 class="sec-title">${icon('gear')}도시 지표</h4><ul class="attr-list wide">${glob}</ul>
    <h4 class="sec-title">${icon('map')}구역</h4><div class="dist-grid">${dists}</div>
    <h4 class="sec-title">${icon('people')}세력</h4><ul class="faction-list">${facts}</ul>
    <h4 class="sec-title">${icon('bell')}최근 소식</h4><ul class="news-mini">${news.map(n => `<li class="${n.kind}"><small>${n.year}년</small><span>${esc(n.text)}</span></li>`).join('')}</ul>`;
}

// ───────── 장부 ─────────
function ledgerHtml(ui, s) {
  const ch = s.ch;
  const hist = s.history.cashByYear.slice(-30);
  let spark = '';
  if (hist.length >= 2) {
    const vals = hist.map(h => h[1]); const lo = Math.min(0, ...vals), hi = Math.max(10, ...vals);
    const W = 300, H = 70;
    const pts = hist.map((h, i) => `${(i / (hist.length - 1) * W).toFixed(1)},${(H - (h[1] - lo) / (hi - lo) * H).toFixed(1)}`).join(' ');
    const zero = (H - (0 - lo) / (hi - lo) * H).toFixed(1);
    spark = `<svg class="spark" viewBox="0 0 ${W} ${H + 4}" preserveAspectRatio="none" role="img" aria-label="연말 잔액 추이"><line x1="0" x2="${W}" y1="${zero}" y2="${zero}" class="zero"/><polyline points="${pts}"/></svg><div class="spark-lab"><small>${hist[0][0]}년</small><small>${hist[hist.length - 1][0]}년</small></div>`;
  }
  const bd = ch.independent ? costBreakdown(s) : [];
  return `
    <div class="ledger-top paper">
      <div><small>소지금</small><b class="${ch.cash < 0 ? 'neg' : ''}">${ch.cash}C</b></div>
      <div><small>부채</small><b>${totalDebt(s)}C</b></div>
      <div><small>올해 생계비</small><b>${annualCost(s)}C</b></div>
    </div>
    <div class="ls-class"><span class="chip">${esc(LIFE_CLASSES[ch.lifeClass])}</span><span class="chip">${esc(PUBLIC_RANKS[ch.publicRank])}</span>${ch.workshop ? `<span class="chip chip--good">공방 가치 ${ch.workshop.value}C</span>` : ''}</div>
    ${spark ? `<h4 class="sec-title">${icon('coin')}연말 잔액</h4>${spark}` : ''}
    ${bd.length ? `<h4 class="sec-title">${icon('home')}생계비 내역</h4><ul class="kv">${bd.map(([k, v]) => `<li><span>${esc(k)}</span><b>${v}C</b></li>`).join('')}</ul>` : ''}
    ${ch.debts.length ? `<h4 class="sec-title">${icon('scroll')}대출</h4><ul class="kv">${ch.debts.map(d => `<li><span>${d.lender === 'sera' ? '세라 바인' : '시민 은행'} · 연 ${Math.round(d.rate * 100)}%</span><b>${d.principal}C${d.overdue ? ` <em class="neg">연체 ${d.overdue}</em>` : ''}</b></li>`).join('')}</ul>` : ''}
    <h4 class="sec-title">${icon('star')}삶의 기록</h4>
    <ul class="kv">
      <li><span>검증된 실적</span><b>${ch.works}</b></li>
      <li><span>지킨 약속</span><b>${s.stats.dutiesDone || 0}</b></li>
      <li><span>지역 프로젝트</span><b>${s.stats.localProjects || 0}</b></li>
      <li><span>대표 제작</span><b>${s.stats.signatureWorks || 0}</b></li>
      <li><span>공개한 기록</span><b>${s.stats.recordsPublished || 0}</b></li>
    </ul>
    ${divider()}
    <div class="seed-box"><small>출생 씨앗</small><code>${esc(s.seed)}</code>${btn('복사', 'copy-seed', { cls: 'btn--sm', ico: 'copy' })}</div>`;
}

// ───────── 기록 보관소 (목표·업적·엔딩) ─────────
function codexHtml(ui, s) {
  const gv = s ? goalView(s) : null;
  const acc = ui.account;
  const got = new Set([...(acc.achievements || []), ...(s?.achievements || [])]);
  const seen = new Set([...(acc.traits || []), ...(s ? [...s.ch.traits, ...(s.ch.lostTraits || [])].map(t => t.id) : [])]);
  return `
    ${gv ? `<div class="goal-now paper"><h4>${icon('star')}${esc(gv.name)}</h4><ol class="stage-list">${gv.stages.map((st, i) => `<li class="${i < gv.stage ? 'done' : i === gv.stage ? 'now' : ''}"><b>${i + 1}</b><span>${esc(st)}</span>${i < gv.stage ? icon('check') : ''}</li>`).join('')}</ol><p class="small">보상: ${esc(gv.reward)}</p></div>` : ''}
    <h4 class="sec-title">${icon('star')}업적 <small>${[...got].filter(id => ACHIEVEMENTS.some(a => a.id === id)).length} / ${ACHIEVEMENTS.length}</small></h4>
    <ul class="ach-grid">${ACHIEVEMENTS.map(a => `<li class="ach ${got.has(a.id) ? 'got' : ''}" tabindex="0" data-tip="${esc(a.desc)}"><span class="ach-medal grade-${a.grade}"><svg><use href="#gear-small"/></svg><b>${a.grade}</b></span><span class="ach-name">${esc(a.name)}</span></li>`).join('')}</ul>
    <h4 class="sec-title">${icon('key')}특성 도감 <small>${seen.size} / ${Object.keys(TRAITS).length}</small></h4>
    ${['positive', 'negative', 'keyword'].map(k => `<div class="codex-traits"><small>${TRAIT_KINDS[k].name}</small><div class="ct-grid">${Object.entries(TRAITS).filter(([, d]) => d.kind === k).map(([id, d]) => seen.has(id) ? traitToken(id, { attrs: 'tabindex="0"' }) : `<span class="tk tk--unknown" tabindex="0" data-tip="${esc(d.how ? `아직 가져 본 적 없는 특성\n얻는 법: ${d.how}` : '아직 가져 본 적 없는 특성')}">?</span>`).join('')}</div></div>`).join('')}
    <h4 class="sec-title">${icon('scroll')}만난 결말 <small>${acc.endings.length} / ${Object.keys(ENDINGS).length}</small></h4>
    <ul class="endings-list">${Object.entries(ENDINGS).map(([id, e]) => `<li class="${acc.endings.includes(id) ? 'got' : ''}"><b>${acc.endings.includes(id) ? esc(e.name) : '봉인된 결말'}</b><small>${acc.endings.includes(id) ? esc(e.scene) : '아직 이 결말에 닿은 삶이 없다'}</small></li>`).join('')}</ul>`;
}

// ───────── 설정 ─────────
export function openSettings(ui) {
  const top = ui.top();
  if (top?.panel === 'settings') { ui.close(top); return; }
  if (top?.kind === 'drawer') ui.close(top, true);
  const st = ui.settings;
  const tog = (k, on, label, desc) => `<div class="set-row"><div><b>${label}</b>${desc ? `<small>${desc}</small>` : ''}</div><button class="toggle" role="switch" aria-checked="${on}" aria-label="${label}" data-act="tog:${k}"></button></div>`;
  const html = () => `
    <section class="set-group"><h4 class="sec-title">${icon('scroll')}읽기</h4>
      <div class="set-row col"><label for="fs"><b>글자 크기</b> <span class="out">${st.fontSize}px</span></label><input id="fs" class="slider" type="range" min="14" max="24" step="1" value="${st.fontSize}" data-set="fontSize"></div>
      <div class="set-row col"><label for="lh"><b>줄 간격</b> <span class="out">${st.lineHeight}</span></label><input id="lh" class="slider" type="range" min="1.4" max="2.2" step="0.05" value="${st.lineHeight}" data-set="lineHeight"></div>
      <div class="set-row"><div><b>테마</b><small>황동 야간 / 상아 주간</small></div><div class="seg">${btn('야간', 'theme:dark', { cls: `btn--sm ${st.theme === 'dark' ? 'btn--brass' : ''}` })}${btn('주간', 'theme:ivory', { cls: `btn--sm ${st.theme === 'ivory' ? 'btn--brass' : ''}` })}</div></div>
      ${tog('contrast', st.contrast === 'high', '고대비', '장식보다 글자를 또렷하게')}
    </section>
    <section class="set-group"><h4 class="sec-title">${icon('gear')}연출과 소리</h4>
      <div class="set-row"><div><b>동작 줄이기</b><small>자동은 시스템 설정을 따른다</small></div><div class="seg">${['auto', 'full', 'reduced'].map(m => btn({ auto: '자동', full: '전체', reduced: '줄임' }[m], `motion:${m}`, { cls: `btn--sm ${st.motion === m ? 'btn--brass' : ''}` })).join('')}</div></div>
      ${tog('sound', st.sound, '효과음', '합성 톱니·종소리')}
      <div class="set-row col"><label for="vol"><b>음량</b> <span class="out">${Math.round(st.volume * 100)}</span></label><input id="vol" class="slider" type="range" min="0" max="1" step="0.05" value="${st.volume}" data-set="volume"></div>
      ${tog('autoplay', st.autoplay, '자동 진행', '계절이 스스로 흐른다. Space로 멈춤')}
    </section>
    <section class="set-group"><h4 class="sec-title">${icon('save')}저장</h4>
      ${ui.state && ui.state.phase !== 'ended' ? `<div class="set-row"><div><b>지금 저장</b><small>자동 저장은 매년 연초, 세 칸을 돌려 쓴다</small></div>${btn('저장', 'save', { cls: 'btn--sm', ico: 'save' })}</div>` : ''}
      ${slotList(ui)}
      <div class="set-row col"><b>내보내기 · 가져오기</b><textarea id="io" class="input io" rows="3" placeholder="저장 문자열을 붙여 넣거나, 내보내기를 누른다"></textarea>
        <div class="row">${ui.state ? btn('내보내기', 'export', { cls: 'btn--sm', ico: 'copy' }) : ''}${ui.state ? btn('파일로', 'download', { cls: 'btn--sm', ico: 'save' }) : ''}${btn('가져오기', 'import', { cls: 'btn--sm', ico: 'door' })}<label class="btn btn--sm file-btn">${icon('scroll')}<span>파일 열기</span><input type="file" accept=".json,application/json" hidden data-file="1"></label></div></div>
    </section>
    ${ui.screen !== 'title' ? `<div class="set-foot">${btn('타이틀로 돌아가기', 'title', { cls: 'btn--ghost', ico: 'home' })}</div>` : ''}`;
  const entry = ui.open(frame(`<div class="body scroll panel-body settings">${html()}</div>`, { title: '환경 설정', close: true }), {
    kind: 'drawer', title: '환경 설정',
    onAct(act) {
      const [k, v] = act.split(':');
      if (k === 'tog') {
        if (v === 'contrast') ui.setSetting('contrast', st.contrast === 'high' ? 'normal' : 'high');
        else ui.setSetting(v, !st[v]);
        if (v === 'autoplay') ui.toast(st.autoplay ? '자동 진행을 켰다' : '자동 진행을 껐다. Enter로 한 계절씩 넘긴다');
      }
      if (k === 'theme') ui.setSetting('theme', v);
      if (k === 'motion') ui.setSetting('motion', v);
      if (k === 'save') { const sl = ui.autosave(); ui.toast(sl >= 0 ? `${sl + 1}번 칸에 저장했다` : '저장하지 못했다', { ico: 'save' }); }
      if (k === 'load') { const stt = store.loadSlot(Number(v)); if (stt) { ui.state = stt; import('./title.js').then(m => m.resume(ui, stt)); } }
      if (k === 'export') { const t = store.exportText(ui.state); body().querySelector('#io').value = t; navigator.clipboard?.writeText(t).then(() => ui.toast('저장 문자열을 복사했다', { ico: 'copy' }), () => {}); }
      if (k === 'download') download(ui);
      if (k === 'import') doImport(body().querySelector('#io').value);
      if (k === 'title') { ui.quicksave(); ui.go('title'); return; }
      if (['tog', 'theme', 'motion', 'save'].includes(k)) redraw();
    },
  });
  entry.panel = 'settings';
  const body = () => entry.box.querySelector('.panel-body');
  const redraw = () => { const sc = body().scrollTop; body().innerHTML = html(); body().scrollTop = sc; };
  entry.box.addEventListener('input', (e) => {
    const k = e.target.dataset.set;
    if (!k) return;
    const v = Number(e.target.value);
    ui.setSetting(k, v);
    const out = e.target.closest('.set-row').querySelector('.out');
    if (out) out.textContent = k === 'fontSize' ? `${v}px` : k === 'volume' ? Math.round(v * 100) : v;
  });
  entry.box.addEventListener('change', (e) => {
    if (e.target.dataset.set === 'volume') ui.sfx.play('bell');
    if (e.target.dataset.file) {
      const f = e.target.files?.[0];
      if (!f) return;
      f.text().then(doImport);
    }
  });
  function doImport(text) {
    const r = store.importText(String(text || '').trim());
    if (!r.ok) { ui.toast(r.reason, { ico: 'warning' }); ui.sfx.play('fail'); return; }
    ui.toast(`${r.state.ch.name}의 삶을 불러왔다`, { ico: 'door' });
    import('./title.js').then(m => m.resume(ui, r.state));
  }
  return entry;
}

function slotList(ui) {
  const slots = store.listSlots();
  return `<ul class="slot-list">${slots.map(sl => sl.empty
    ? `<li class="empty"><span class="sl-no">${sl.slot + 1}</span><span class="muted">빈 칸</span></li>`
    : `<li><span class="sl-no">${sl.slot + 1}</span><span class="sl-info"><b>${esc(sl.name)}</b><small>${sl.age}세 · ${sl.year}년 · ${new Date(sl.savedAt).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}${sl.phase === 'ended' ? ' · 결산됨' : ''}</small></span>${sl.phase === 'ended' ? '' : btn('불러오기', `load:${sl.slot}`, { cls: 'btn--sm' })}</li>`).join('')}</ul>`;
}

function download(ui) {
  const blob = new Blob([store.exportText(ui.state)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `brass-life-${ui.state.ch.name}-${ui.state.year}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// 타이틀의 기록 보관소: 업적·결말과 저장 칸
export function openArchive(ui, { onLoad } = {}) {
  const top = ui.top();
  if (top?.kind === 'drawer') ui.close(top, true);
  const entry = ui.open(frame(`<div class="body scroll panel-body">
      <h4 class="sec-title">${icon('save')}저장된 삶</h4>${slotList(ui)}
      <p class="small muted">지나온 삶 ${ui.account.lives}</p>
      ${codexHtml(ui, null)}</div>`, { title: '기록 보관소', close: true }), {
    kind: 'drawer', title: '기록 보관소',
    onAct(act) {
      const [k, v] = act.split(':');
      if (k === 'load') { const st = store.loadSlot(Number(v)); if (st) onLoad?.(st); }
    },
  });
  entry.panel = 'archive';
}
