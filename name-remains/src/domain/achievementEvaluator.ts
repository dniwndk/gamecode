// 업적 판정기. 이번 동작에서 생긴 사실(fact)과 현재 상태만 본다. 이전 회차 기록은 절대 보지 않는다.
import type { AchievementFact } from './contentTypes';
import { ACHIEVEMENTS, TIER_LABEL } from '../content/achievements';
import { log, type Ctx } from './engineContext';

export function evaluateAchievements(ctx: Ctx): string[] {
  const s = ctx.s;
  const r = s.run;
  if (r.run_status === 'abandoned') return [];
  const have = new Set(r.achievements.map((a) => a.achievement_id));
  const facts: AchievementFact[] = [...ctx.facts, { type: 'step' }];
  const earned: string[] = [];
  for (const a of ACHIEVEMENTS) {
    if (have.has(a.id)) continue;
    for (let i = 0; i < facts.length; i++) {
      let ok = false;
      try {
        ok = a.check(s, facts[i]);
      } catch {
        ok = false;
      }
      if (!ok) continue;
      r.achievements.push({
        run_id: r.id,
        achievement_id: a.id,
        achievement_version: 1,
        tier_at_award: a.tier,
        earned_at_minute: r.clock.virtual_minute,
        state_revision: r.revision,
        evidence_fact_ids: [`${r.revision}:${i}:${facts[i].type}`],
      });
      have.add(a.id);
      earned.push(a.id);
      log(ctx, 'milestone', a.revealed, { title: `업적 · ${a.title}`, tone: 'gold', badges: [TIER_LABEL[a.tier]], sound: 'bell' });
      break;
    }
  }
  return earned;
}
