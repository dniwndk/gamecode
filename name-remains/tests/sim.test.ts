import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createRun } from '../src/domain/runFactory';
import { advance, autoChoice, choose } from '../src/domain/engine';
import { validateContent } from '../src/content/contentValidator';
import type { RunState } from '../src/domain/types';

export function playOut(s: RunState, maxOps = 20000, policy = process.env.SIM_POLICY ?? 'auto') {
  let decisions = 0;
  let lcg = 12345;
  let bundles = 0;
  for (let i = 0; i < maxOps && s.run.run_status === 'playing'; i++) {
    if (s.run.pending_decision) {
      const avail = s.run.pending_decision.choices.filter((c) => c.is_available);
      lcg = (lcg * 1103515245 + 12345) & 0x7fffffff;
      const id = policy === 'random' ? avail[lcg % Math.max(1, avail.length)]?.id : autoChoice(s);
      if (!id) throw new Error(`선택 불가: ${s.run.incident?.incident_id} ${s.run.pending_decision.scene_node_id}`);
      choose(s, id);
      decisions++;
    } else {
      advance(s);
      bundles++;
    }
  }
  return { decisions, bundles };
}

describe('콘텐츠', () => {
  it('수량과 노드 연결이 명세와 맞는다', () => {
    expect(validateContent()).toEqual([]);
  });
});

describe('대량 시뮬레이션', () => {
  it('1000회 자동 생애가 예외 없이 종점에 닿는다', () => {
    const N = Number(process.env.SIM_N ?? 1000);
    const endpoints: Record<string, number> = {};
    const ach: Record<string, number> = {};
    const incidents: Record<string, number> = {};
    let decisions = 0;
    let bundles = 0;
    let pm = 0;
    let deaths = 0;
    let ages = 0;
    const causes: Record<string, number> = {};
    let violent = 0;
    let injured = 0;
    let injuries = 0;
    const mstSum: Record<string, number> = {};
    const aptSum: Record<string, number> = {};
    let minHp = 0;
    let clears = 0;
    let majors = 0;
    const minHpB: Record<string, number> = {};
    const ageBuckets: Record<string, number> = {};
    let paths = 0;
    const tiers: Record<number, number> = {};
    const bgDeath: Record<string, number[]> = {};
    for (let i = 0; i < N; i++) {
      const s = createRun({ seed: `sim-${i}`, name: '' });
      const res = playOut(s);
      expect(s.run.run_status).toBe('ended');
      decisions += res.decisions;
      bundles += res.bundles;
      const ep = s.run.endpoint!.endpoint_type;
      endpoints[ep] = (endpoints[ep] ?? 0) + 1;
      if (s.run.person.postmortem_count) pm++;
      if (s.run.person.body_death_history.length) deaths++;
      ages += s.run.clock.current_age_years;
      const c = s.run.endpoint!.cause;
      causes[c] = (causes[c] ?? 0) + 1;
      if (s.run.person.body_death_history.length) violent++;
      if (s.run.person.injuries?.length) injured++;
      injuries += (s.run.person.injuries?.length ?? 0) / N;
      for (const [k, v] of Object.entries(s.run.person.masteries)) mstSum[k] = (mstSum[k] ?? 0) + v / N;
      for (const [k, v] of Object.entries(s.run.person.aptitudes)) aptSum[k] = (aptSum[k] ?? 0) + v / N;
      minHp += s.run.person.min_hp_in_run / N;
      clears += (s.run.counters.clears ?? 0) / N;
      majors += s.run.incident_history.filter((h) => h.incident_id.startsWith('EVT')).length / N;
      const mb = `${Math.floor(s.run.person.min_hp_in_run / 20) * 20}`;
      minHpB[mb] = (minHpB[mb] ?? 0) + 1;
      const b = `${Math.floor(s.run.clock.current_age_years / 10) * 10}s`;
      ageBuckets[b] = (ageBuckets[b] ?? 0) + 1;
      if (s.run.person.path_id) paths++;
      tiers[s.run.person.position_tier] = (tiers[s.run.person.position_tier] ?? 0) + 1;
      for (const a of s.run.achievements) ach[a.achievement_id] = (ach[a.achievement_id] ?? 0) + 1;
      for (const h of s.run.incident_history) incidents[h.incident_id] = (incidents[h.incident_id] ?? 0) + 1;
      (bgDeath[s.run.person.background_id] ??= []).push(Math.round(s.run.clock.current_age_years));
    }
    const report = {
      endpoints,
      violentShare: violent / N,
      injuredShare: injured / N,
      avgInjuries: injuries,
      mstSum,
      aptSum,
      minHp,
      minHpB,
      clears,
      majors,
      ageBuckets,
      causes,
      avgDecisions: decisions / N,
      avgBundles: bundles / N,
      avgAge: ages / N,
      postmortemShareOfDeaths: deaths ? pm / deaths : 0,
      pathShare: paths / N,
      tiers,
      achievementsSeen: Object.keys(ach).length,
      ach: Object.fromEntries(Object.entries(ach).sort()),
      incidents: Object.fromEntries(Object.entries(incidents).sort()),
      bgAvgAge: Object.fromEntries(Object.entries(bgDeath).map(([k, v]) => [k, Math.round(v.reduce((a, b) => a + b, 0) / v.length)])),
    };
    if (process.env.SIM_REPORT) writeFileSync(process.env.SIM_REPORT, JSON.stringify(report, null, 1));
    expect(report.avgDecisions).toBeGreaterThan(3);
  });
});
