// 공통 도우미. DOM과 난수에 의존하지 않는다.

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// 한국어 조사: 받침 유무로 고른다. pair는 '이/가' 꼴이나 첫 형태('이','은','을','과','으로','아').
const PAIRS = {
  '이': ['이', '가'], '가': ['이', '가'], '은': ['은', '는'], '는': ['은', '는'],
  '을': ['을', '를'], '를': ['을', '를'], '과': ['과', '와'], '와': ['과', '와'],
  '으로': ['으로', '로'], '로': ['으로', '로'], '아': ['아', '야'], '야': ['아', '야'],
  '이다': ['이다', '다'], '이라': ['이라', '라'], '이랑': ['이랑', '랑'],
};

export function hasFinal(word) {
  const ch = String(word).trim().slice(-1);
  const code = ch.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28 !== 0;
  if (/[0-9]/.test(ch)) return '013678'.includes(ch);
  return false;
}

export function finalIsRieul(word) {
  const ch = String(word).trim().slice(-1);
  const code = ch.charCodeAt(0);
  return code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 === 8;
}

export function josa(word, p) {
  const pair = PAIRS[p];
  if (!pair) return word + p;
  if ((p === '으로' || p === '로') && finalIsRieul(word)) return word + '로';
  return word + (hasFinal(word) ? pair[0] : pair[1]);
}

export function signed(n) { return n > 0 ? `+${n}` : `${n}`; }

export function deepClone(o) { return JSON.parse(JSON.stringify(o)); }

export function shortName(full) { return String(full).split(' ')[0]; }
