// 한국어 조사와 숫자 표기. 이름은 플레이어가 정하므로 받침에 따라 조사를 고른다.

function hasBatchim(word: string): boolean | null {
  const ch = word.trim().slice(-1);
  if (!ch) return null;
  const code = ch.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28 !== 0;
  if (/[0-9]/.test(ch)) return '013678'.includes(ch);
  if (/[a-zA-Z]/.test(ch)) return /[lmnr]$/i.test(ch);
  return null;
}

function rieul(word: string): boolean {
  const ch = word.trim().slice(-1);
  const code = ch.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28 === 8;
  return /[1lL7]$/.test(ch);
}

/** josa('김도윤', '이/가') → '김도윤이' */
export function josa(word: string, pair: '이/가' | '을/를' | '은/는' | '와/과' | '으로/로' | '아/야' | '이에요/예요'): string {
  const b = hasBatchim(word);
  // '와/과'만 받침 있는 쪽이 뒤에 온다(과: 받침 있음, 와: 받침 없음)
  const [withB, withoutB] = pair === '와/과' ? ['과', '와'] : pair.split('/');
  if (pair === '으로/로') return word + (b && !rieul(word) ? '으로' : '로');
  if (b === null) return `${word}${withB}(${withoutB})`;
  return word + (b ? withB : withoutB);
}

/** {name|이} 같은 토큰을 이름과 알맞은 조사로 바꾼다 */
export function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)(?:\|([^}]+))?\}/g, (_, k: string, j?: string) => {
    const v = vars[k] ?? '';
    if (!j) return v;
    const pairs: Record<string, '이/가' | '을/를' | '은/는' | '와/과' | '으로/로' | '아/야'> = {
      이: '이/가', 가: '이/가', 을: '을/를', 를: '을/를', 은: '은/는', 는: '은/는', 와: '와/과', 과: '와/과', 으로: '으로/로', 로: '으로/로', 아: '아/야', 야: '아/야',
    };
    const p = pairs[j];
    return p ? josa(v, p) : v + j;
  });
}

/** 만원 단위 금액 → "1억 2,000만원", "-3,200만원" */
export function won(manwon: number): string {
  const sign = manwon < 0 ? '-' : '';
  const v = Math.abs(Math.round(manwon));
  const eok = Math.floor(v / 10000);
  const man = v % 10000;
  if (eok > 0) return `${sign}${eok}억${man ? ` ${man.toLocaleString('ko-KR')}만` : ''}원`;
  return `${sign}${man.toLocaleString('ko-KR')}만원`;
}

export function signed(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}
