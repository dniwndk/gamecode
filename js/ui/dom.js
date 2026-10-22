// 작은 DOM 도우미. 화면은 문자열 템플릿으로 그리고, 동적 문자열은 모두 esc()를 거친다.
import { icon } from './sprite.js';

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ESC[c]);

export function el(htmlText) {
  const t = document.createElement('template');
  t.innerHTML = htmlText.trim();
  return t.content.firstElementChild;
}

export function corners() {
  return ['tl', 'tr', 'bl', 'br'].map(c => `<svg class="corner ${c}" aria-hidden="true"><use href="#corner"/></svg>`).join('');
}

// 가죽 패널 + 황동 모서리 + 상단 명판
export function frame(inner, { cls = '', title = '', close = false, tag = 'section', attrs = '' } = {}) {
  return `<${tag} class="frame ${cls}" ${attrs}>${corners()}${title ? `<div class="plaque plaque--tab">${esc(title)}</div>` : ''}${close ? `<button class="close-x" data-act="close" aria-label="닫기">${icon('close')}</button>` : ''}${inner}</${tag}>`;
}

export function divider() {
  return `<svg class="divider" viewBox="0 0 400 20" preserveAspectRatio="none" aria-hidden="true"><use href="#divider"/></svg>`;
}

export function gem(color = 'red', side = 'l') {
  return `<svg class="gem ${side}" aria-hidden="true"><use href="#gem-${color}"/></svg>`;
}

export function btn(label, act, { cls = '', ico = '', attrs = '', gems = '' } = {}) {
  const g = gems ? gem(gems, 'l') + gem(gems, 'r') : '';
  return `<button class="btn ${gems ? 'btn--gem' : ''} ${cls}" data-act="${act}" ${attrs}>${g}${ico ? icon(ico) : ''}<span>${esc(label)}</span></button>`;
}

// 문장 단위로 쪼개 순서대로 떠오르게 한다
export function sentences(text, start = 0) {
  const parts = String(text || '').match(/[^.!?。…]+[.!?。…]+["'」』)]*\s*|[^.!?。…]+$/g) || [text];
  return parts.map((p, i) => `<span class="sent" style="--i:${i + start}">${esc(p)}</span>`).join('');
}

export function chips(list, cls = '') {
  return (list || []).map(t => `<span class="chip ${cls || deltaClass(t)}">${esc(t)}</span>`).join('');
}

// 변화 문장의 부호로 색을 고른다: 스트레스·부하 증가는 나쁨
export function deltaClass(t) {
  const s = String(t);
  if (/(스트레스|공명부하) \+/.test(s)) return 'chip--bad';
  if (/(스트레스|공명부하) -/.test(s)) return 'chip--good';
  if (/−|잃음|연체|-\d|실패|못했/.test(s)) return 'chip--bad';
  if (/\+|획득|완료|지켰다|상승|승진|→/.test(s)) return 'chip--good';
  if (/공명|발현/.test(s)) return 'chip--teal';
  return '';
}

export function portrait(n, size = 56, extra = '') {
  const ic = n?.portrait || 'person';
  const dead = n && !n.alive ? ' is-dead' : '';
  return `<span class="medallion${dead} ${extra}" style="--s:${size}px" aria-hidden="true"><svg class="m-ring"><use href="#gear-small"/></svg><span class="m-face">${icon(ic)}</span></span>`;
}

export function bar(v, max = 100, cls = '') {
  const f = Math.max(0, Math.min(100, (v / max) * 100));
  return `<span class="bar ${cls}" style="--fill:${f.toFixed(1)}" role="presentation"><i></i></span>`;
}

// 원형 계기 (참고 3). 270° 호에 값을 표시하고 바늘이 따라간다.
export function gauge(key, label, v, max = 100, color = 'var(--teal)') {
  const r = 22, C = 2 * Math.PI * r, arc = C * 0.75;
  const f = Math.max(0, Math.min(1, v / max));
  return `<div class="gauge-wrap" data-gauge="${key}">
    <div class="gauge" role="meter" aria-label="${esc(label)}" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${v}">
      <svg viewBox="0 0 58 58" aria-hidden="true">
        <circle class="face" cx="29" cy="29" r="26"/>
        <circle class="track" cx="29" cy="29" r="${r}" stroke-dasharray="${arc} ${C}" transform="rotate(135 29 29)"/>
        <circle class="arc" cx="29" cy="29" r="${r}" stroke="${color}" stroke-dasharray="${arc} ${C}" stroke-dashoffset="${(arc * (1 - f)).toFixed(2)}" style="transform:rotate(135deg)"/>
        <g class="needle" style="transform:rotate(${(-135 + 270 * f).toFixed(1)}deg)"><path d="M29 29L29 10" stroke="#3a2709" stroke-width="2" stroke-linecap="round"/><circle cx="29" cy="29" r="3.2" fill="url(#g-rivet)"/></g>
        <circle class="rim" cx="29" cy="29" r="27"/>
      </svg>
      <span class="val">${v}</span>
    </div>
    <div class="gauge-label">${esc(label)}</div>
  </div>`;
}

export function updateGauge(root, key, v, max = 100) {
  const w = root.querySelector(`[data-gauge="${key}"]`);
  if (!w) return;
  const r = 22, C = 2 * Math.PI * r, arc = C * 0.75;
  const f = Math.max(0, Math.min(1, v / max));
  w.querySelector('.arc').setAttribute('stroke-dashoffset', (arc * (1 - f)).toFixed(2));
  w.querySelector('.needle').style.transform = `rotate(${(-135 + 270 * f).toFixed(1)}deg)`;
  const val = w.querySelector('.val');
  if (val.textContent !== String(v)) { val.textContent = v; w.querySelector('.gauge').setAttribute('aria-valuenow', v); w.classList.remove('bump'); void w.offsetWidth; w.classList.add('bump'); }
}

export { icon };
