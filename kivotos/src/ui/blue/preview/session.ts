// 솔로 런 세션을 화면에 붙인다. 규칙은 app/run/session.ts에 있고, 여기서는 기기 저장소(레시피 공개 기록)만 넣는다.
import type { ContentCatalog, GameSnapshot } from '../../../app/gameClient';
import { createRunSession, type ProfileStore, type RunSession } from '../../../app/run/session';
import type { OopartProfile } from '../../../app/runRules';

// v2: 전투 엔진 배포(D-030) 때 이전 기록(레시피 공개)을 비웠다. 옛 키는 읽지 않고 지운다.
const PROFILE_KEY = 'kivotos-oopart-profile-v2';
const OLD_PROFILE_KEYS = ['kivotos-oopart-profile'];

export const localProfileStore: ProfileStore = {
  load(): OopartProfile {
    try {
      for (const k of OLD_PROFILE_KEYS) localStorage.removeItem(k);
      const v = JSON.parse(localStorage.getItem(PROFILE_KEY) ?? 'null') as OopartProfile | null;
      if (v && Array.isArray(v.revealedRecipes)) return { revealedRecipes: v.revealedRecipes.filter((x) => typeof x === 'string') };
    } catch { /* 저장소를 못 쓰면 빈 기록 */ }
    return { revealedRecipes: [] };
  },
  save(p) {
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch { /* 저장 불가 환경: 이번 세션에만 남는다 */ }
  },
};

/** opts.ooparts: 새 런을 이 오파츠를 가진 채로 시작(테스트·확인용) */
export function createPreviewSession(catalog: ContentCatalog, base: GameSnapshot, opts: { ooparts?: string[] } = {}): RunSession {
  return createRunSession(catalog, base, { ...opts, profile: localProfileStore });
}
