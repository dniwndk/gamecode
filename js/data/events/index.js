// 사건 등록부. 사건은 고유 ID로만 참조하며, 본문과 규칙(효과 목록)을 함께 담는다.
import life from './life.js';
import work from './work.js';
import relation from './relation.js';
import city from './city.js';
import resonance from './resonance.js';
import chain from './chain.js';
import danger from './danger.js';
import routes from './routes.js';
import daily from './daily.js';

// 조건은 앞에서부터 검사하므로, 대부분의 삶에서 걸러지는 열쇠 특성 조건을 맨 앞으로 옮겨 둔다
// (부작용 없는 검사만 옮긴다. 인물 조건은 후임을 정하며 난수를 쓸 수 있어 제자리에 둔다)
const FIRST = ['trait', 'allTraits', 'noTrait'];
function sortCond(o) {
  const c = o.cond;
  if (!c || !FIRST.some(k => k in c)) return o;
  o.cond = Object.fromEntries([...FIRST.filter(k => k in c), ...Object.keys(c).filter(k => !FIRST.includes(k))].map(k => [k, c[k]]));
  return o;
}

export const EVENT_LIST = [...life, ...work, ...relation, ...city, ...resonance, ...chain, ...danger, ...routes].map(sortCond);
export const EVENTS = Object.fromEntries(EVENT_LIST.map(e => [e.id, e]));
export const DAILY = daily.map(sortCond);

export const CATEGORY_NAMES = {
  life: '생활', work: '직업', relation: '관계', city: '도시', resonance: '공명', chain: '연속 사건', danger: '위험', recovery: '회복', route: '갈림길',
};
