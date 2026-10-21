// 사건 등록부. 사건은 고유 ID로만 참조하며, 본문과 규칙(효과 목록)을 함께 담는다.
import life from './life.js';
import work from './work.js';
import relation from './relation.js';
import city from './city.js';
import resonance from './resonance.js';
import chain from './chain.js';
import danger from './danger.js';
import daily from './daily.js';

export const EVENT_LIST = [...life, ...work, ...relation, ...city, ...resonance, ...chain, ...danger];
export const EVENTS = Object.fromEntries(EVENT_LIST.map(e => [e.id, e]));
export const DAILY = daily;

export const CATEGORY_NAMES = {
  life: '생활', work: '직업', relation: '관계', city: '도시', resonance: '공명', chain: '연속 사건', danger: '위험', recovery: '회복',
};
