// 런 규칙 창구. M1 런 엔진이 GameSnapshot.run을 내기 전까지, 미리보기 세션(src/ui/blue/preview)이
// 상점·오파츠 규칙을 흉내 내지 않고 코어 함수를 그대로 부르도록 연다. 화면 컴포넌트는 이 파일을 쓰지 않는다.
export { Rng, streamSeed } from '../core/rng';
export { aronaPick, costOdds, remainingCopies, rollShop, shopExcluded, type OwnedCopy } from '../core/shop/shop';
export { escalationDamageBps } from '../core/battle/escalation';
export { oopartModifiers, oopartSupport, type OopartModifiers, type OopartSupport } from '../core/ooparts/modifiers';
export {
  acquireOopart, emptyOopartProfile, emptyOopartRunState, markRescueUsed, oopartSkipGold, recipeBadge, rescueDue, rollOopartOffer,
  type OopartMerge, type OopartProfile, type OopartRunState, type RecipeBadge,
} from '../core/ooparts/ooparts';
