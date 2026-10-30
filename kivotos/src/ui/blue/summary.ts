// 효과 문장(기획서 spec)을 툴팁용으로 짧게 나누고, 학생의 ATK·최대 HP 비율을 실제 수치로 바꿔 보여 준다.
// 표시 전용 추정치다(적 방어·치명타·버프 반영 전). 전투 규칙은 여기서 정하지 않는다.
import type { Ctx } from './app';
import { STATUS_LABEL, readable } from './components';
import { cls, h } from './dom';
import { icon } from './icons';

/** 수치를 계산할 기준: 성급에 맞춘 학생 스탯 */
export interface FxSource { atk: number; hp: number; star: number }

type Kind = 'dmg' | 'shield' | 'heal' | 'cc' | 'energy' | 'buff' | 'debuff' | 'misc';
type Part = string | { value: number; basis: string };
interface Line { kind: Kind; parts: Part[] }
interface Sentence { when: string | null; lines: Line[] }
export interface FxSummary { sentences: Sentence[]; limits: string[]; inherits: boolean }

const KIND_ICON: Record<Kind, string> = { dmg: 'sword', shield: 'shield', heal: 'heal', cc: 'warning', energy: 'xp', buff: 'plus', debuff: 'minus', misc: 'info' };
const NUM = '\\d+(?:\\.\\d+)?';
const EVENT_WORD: Record<string, string> = {
  damage_received: '피격', damage_dealt: '타격', skill_resolved: '스킬 사용', ultimate_resolved: '필살기 사용', turn_end: '턴 종료', turn_start: '턴 시작',
  status_applied: '상태 부여', healed: '치유받음', unit_defeated: '처치', rear_action: '정기 지원', battle_start: '전투 시작',
};

/** 기술용 표기를 걷어 낸다(이벤트 이름·상태 ID·root 같은 구현 용어) */
function clean(ctx: Ctx, spec: string): string {
  let t = spec
    .replace(/\(`st_[a-z_]+`[:,]\s*([^)]*)\)/g, '($1)')
    .replace(/\(\s*`[a-z_]+`\s*\)/g, '')
    .replace(/`true`\s*피해/g, '방어 무시 피해')
    .replace(/`true`/g, '방어 무시')
    .replace(/`delay_action`/g, '');
  t = readable(ctx, t)
    .replace(/\b(st_[a-z_]+)\b/g, (_, id: string) => STATUS_LABEL[id] ?? '')
    .replace(/\b(damage_received|damage_dealt|skill_resolved|ultimate_resolved|turn_end|turn_start|status_applied|healed|unit_defeated|rear_action|battle_start)\b/g, (_, ev: string) => EVENT_WORD[ev] ?? '');
  return t.replace(/방어 무시\s*\(\s*방어 무시\s*\)/g, '방어 무시').replace(/\s+/g, ' ').trim();
}

/** 스탯 이름을 우리말로 */
function statWords(t: string): string {
  return t
    .replace(new RegExp(`CRIT_DMG \\+(${NUM})(?![\\d.%])`, 'g'), (_, v: string) => `치명 피해 +${Math.round(Number(v) * 100)}%`)
    .replace(/CRIT_DMG/g, '치명 피해')
    .replace(/CRIT(?![_A-Z])/g, '치명 확률')
    .replace(new RegExp(`ATK ([+-]${NUM})`, 'g'), '공격력 $1')
    .replace(/DEF/g, '방어력')
    .replace(/SPD/g, '속도')
    .replace(new RegExp(`최대 HP ([+-]${NUM})`, 'g'), '최대 체력 $1')
    .replace(/적대 전방의 도발 우선 최전방 1명/g, '맨 앞 적 1명(도발 우선)')
    .replace(/\bnormal\s*/g, '')
    .replace(/적 최전열 1명/g, '맨 앞 적 1명')
    .replace(/적 최전열 (\d)명/g, '앞쪽 적 $1명')
    .replace(/최전열 적/g, '맨 앞 적')
    .replace(/(적|아군) 전방 전원/g, '$1 전방 전체')
    .replace(/팀 SP/g, 'SP');
}

function kindOf(t: string): Kind {
  if (/(?<![+\-\d.])(?:ATK|최대 HP) \d/.test(t)) {
    if (/보호막/.test(t)) return 'shield';
    if (/회복|치유/.test(t)) return 'heal';
    return 'dmg';
  }
  if (/가하는 피해|피해량 \+|피해가 \+/.test(t)) return 'buff';
  if (/보호막/.test(t) && !/양수/.test(t)) return 'shield';
  if (/(회복|치유)(?!량)/.test(t) && !/받는 치유량/.test(t) && !/에너지[^,]*회복/.test(t)) return 'heal';
  if (/기절|도발|지연|침묵|당기|당긴다/.test(t)) return 'cc';
  if (/받는 피해[^,]*감소|피해감소|피해 감소/.test(t)) return 'buff';
  if (/받는 피해 \+|받는 치유량 -/.test(t)) return 'debuff';
  if (/에너지|SP/.test(t) && !/공격력|방어력|속도|치명/.test(t)) return 'energy';
  if (/\+\s?\d/.test(t)) return 'buff';
  if (/-\s?\d/.test(t)) return 'debuff';
  if (/피해|사격|폭격|포격|일제|직격|산탄/.test(t)) return 'dmg';
  if (/감소|해제|화상|취약|약화/.test(t)) return 'debuff';
  if (/증가/.test(t)) return 'buff';
  return 'misc';
}

/** "ATK 145%" "아츠코 최대 HP 22%" 같은 비율을 수치로 바꾼다 */
function computeParts(t: string, src: FxSource | undefined): Part[] {
  const re = new RegExp(`(?<![+\\-\\d])(?:([가-힣]+) )?(ATK|최대 HP) (${NUM})%(?!\\s*비례)`, 'g');
  const out: Part[] = [];
  let last = 0;
  for (const m of t.matchAll(re)) {
    const [whole, word, stat, pct] = m;
    const i = m.index ?? 0;
    // 바로 앞 낱말: 조사로 끝나면 그냥 문장, 아니면 수치의 주인(자신·학생 이름·적·대상)
    const isOwner = !!word && !/\d/.test(word) && !['즉시', '추가', '매', '각각', '최대', '전체', '전원'].includes(word)
      && (!/(에게|에|로|으로|의|은|는|이|가|을|를|과|와|만큼|및|후|시|간)$/.test(word) || /^자신/.test(word));
    const enemySide = isOwner && /^(적|대상)/.test(word!);
    out.push(t.slice(last, i) + (word && !isOwner ? `${word} ` : ''));
    const label = stat === 'ATK' ? '공격력' : '최대 체력';
    const who = isOwner ? `${word} ` : '';
    if (src && !enemySide) {
      if (isOwner && /^자신/.test(word!)) out.push(who);
      const base = stat === 'ATK' ? src.atk : src.hp;
      out.push({ value: Math.round((base * Number(pct)) / 100), basis: `${label} ${pct}%` });
    } else {
      out.push(`${who}${label} ${pct}%`);
    }
    last = i + whole.length;
  }
  out.push(t.slice(last));
  return out.filter((p) => typeof p !== 'string' || p.length > 0);
}

export function summarize(ctx: Ctx, spec: string, src?: FxSource): FxSummary {
  let t = clean(ctx, spec);
  const inherits = /\[하위 효과 포함\]/.test(t);
  t = t.replace(/\[[^\]]*(?:하위 효과 포함|고유 시너지)[^\]]*\]\s*/g, '');
  // 성급별 값 a/b/c → 지금 성급 값
  t = t.replace(new RegExp(`(${NUM})\\/(${NUM})\\/(${NUM})`, 'g'), (whole, a: string, b: string, c: string) => (src ? [a, b, c][Math.min(2, Math.max(0, src.star - 1))] : whole));
  // 횟수 제한 괄호는 따로 뺀다
  const limits: string[] = [];
  t = t.replace(/\(([^()]*(?:턴당|전투당|쿨다운|root당)[^()]*)\)/g, (_, inner: string) => {
    const kept = inner.split(/,\s*/).filter((x) => !/root당/.test(x)).join(', ').trim();
    if (kept) limits.push(kept.replace(/쿨다운 (\d+)턴/, '재사용 $1턴'));
    return '';
  });
  t = statWords(t);

  const sentences: Sentence[] = [];
  for (const raw of t.split(/(?<=[가-힣)%\]]\.)\s*|(?<=。)\s*/)) {
    let s = raw.replace(/[.。]\s*$/, '').trim();
    if (!s || /않는다|하지 않|중첩시키지|eff_|root|인스턴스|집계|분리한다|후보가 없으면/.test(s)) continue;
    if (/^(개인 )?(차례당|턴당|전투당|두 사건)/.test(s)) { limits.push(s.replace(/한도를 공유한다/, '한도 공유')); continue; }
    let when: string | null = null;
    const w = s.match(/^(.{2,34}?(?:\s시|마다|때|도달 시|해소 시))\s+(?=\S)/);
    if (w && !/에게|,/.test(w[1])) { when = w[1].trim(); s = s.slice(w[0].length); }
    // 괄호 안의 쉼표는 나누지 않는다
    const guarded = s.replace(/\([^)]*\)/g, (m) => m.replace(/,/g, '\u0001').replace(/ 및 /g, '\u0002'));
    const lines: Line[] = guarded.split(/,\s+|\s및\s|\s후\s|(?<!가)하고\s|하며\s|으며\s/).map((c) => c.replace(/\u0001/g, ',').replace(/\u0002/g, ' 및 ').trim())
      .map((c) => c.replace(/\s*(?:을|를)?\s*(?:동시\s)?(?:추가\s)?(?:부여|획득|부여한다|얻는다|얻고|증가시킨다|증가한다|증가)$/, '').replace(/\s+/g, ' ').trim())
      .filter((c) => c.length > 1)
      .map((c) => ({ kind: kindOf(c), parts: computeParts(c, src) }));
    if (lines.length) sentences.push({ when, lines });
  }
  return { sentences, limits, inherits };
}

/** 요약을 목록으로 그린다. compact면 첫 문장 위주로 짧게 */
export function fxList(ctx: Ctx, spec: string, src?: FxSource, extraLimits?: string, opts: { compact?: boolean } = {}): HTMLElement {
  const sum = summarize(ctx, spec, src);
  const limits = [...sum.limits];
  if (extraLimits) {
    for (const x of extraLimits.split(/[;；]/).map((s) => s.trim())) {
      if (!x || /handler|7\.4|10\.3|상시·초기|ActionResolver|root당|ENERGY100|개인 차례당/.test(x)) continue;
      limits.push(x.replace(/^CD(\d+)$/, (_, n: string) => (n === '0' ? '' : `재사용 ${n}턴`)).replace(/쿨다운 (\d+)턴/, '재사용 $1턴'));
    }
  }
  const sentences = opts.compact ? sum.sentences.slice(0, 2) : sum.sentences;
  return h('div', { class: cls('k-eff', opts.compact && 'is-compact') },
    sum.inherits ? h('span', { class: 'k-eff-inherit' }, '이전 단계 효과 포함') : null,
    ...sentences.map((s) => h('div', { class: 'k-eff-sentence' },
      s.when ? h('span', { class: 'k-eff-when' }, icon('flag', 14), s.when) : null,
      h('ul', null, ...s.lines.map((l) => h('li', { class: `k-eff-line is-${l.kind}` },
        h('i', { class: 'k-eff-ico' }, icon(KIND_ICON[l.kind], 15)),
        h('span', null, ...l.parts.map((p) => typeof p === 'string' ? p : h('b', { class: 'k-eff-v', title: p.basis }, p.value.toLocaleString(), h('small', null, p.basis))))))))),
    limits.filter(Boolean).length ? h('div', { class: 'k-eff-limits' }, ...limits.filter(Boolean).map((x) => h('span', null, x))) : null);
}
