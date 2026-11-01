// 작은 DOM 도우미. 문자열은 언제나 textContent로만 넣는다(innerHTML 금지, 사양서 2장 4).
// 글자와 title·aria-label은 gameText를 거쳐 내부 코드가 화면에 나가지 않게 한다(v2.4.9).
import { gameText } from './gameText';
type Child = Node | string | number | null | undefined | false;
type Attrs = Record<string, string | number | boolean | null | undefined | EventListener>;

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs?: Attrs | null, ...children: (Child | Child[])[]): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (attrs) setAttrs(node, attrs);
  append(node, children);
  return node;
}

export function setAttrs(node: Element, attrs: Attrs): void {
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'class') {
      node.setAttribute('class', String(value));
    } else if (key === 'style' && node instanceof HTMLElement) {
      node.style.cssText = String(value);
    } else if (value === true) {
      node.setAttribute(key, '');
    } else if (key === 'title' || key === 'aria-label' || key === 'placeholder' || key === 'alt') {
      node.setAttribute(key, gameText(String(value)));
    } else {
      node.setAttribute(key, String(value));
    }
  }
}

export function append(node: Node, children: (Child | Child[])[]): void {
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    node.appendChild(typeof child === 'object' ? child : document.createTextNode(typeof child === 'string' ? gameText(child) : String(child)));
  }
}

const SVG_NS = 'http://www.w3.org/2000/svg';
export function svg(tag: string, attrs: Record<string, string | number>, ...children: SVGElement[]): SVGElement {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  for (const c of children) node.appendChild(c);
  return node;
}

export function cls(...names: (string | false | null | undefined)[]): string {
  return names.filter(Boolean).join(' ');
}

/** 매 클릭마다 새 commandId (12.2). crypto.randomUUID가 없는 오래된 브라우저 대비. */
export function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** replaceChildren + null 거르기 */
export function fill(node: Element, ...children: (Child | Child[])[]): void {
  node.replaceChildren();
  append(node, children);
}
