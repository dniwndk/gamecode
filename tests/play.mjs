// headless 플레이 도우미: 정책 함수로 한 삶을 끝까지 진행한다.
import * as G from '../js/core/game.js';

export const POLICIES = {
  // 안전한 생계: 견습 → 직업 유지, 휴식/돌봄, 비가역·위험 회피
  safe: {
    childhood: (sc) => sc.choices[0].id,
    goal: (c) => c[0],
    plan(s, opts) {
      const m = opts.mains;
      if (s.age < 18) {
        const ap = m.find(o => o.id === 'm_apprentice' && o.target === (s.ch.home === 'ash' ? 'plumber' : 'merchant'));
        return [ap, 'study'];
      }
      if (s.ch.health < 45) return [m.find(o => o.id === 'recover'), 'rest'];
      const w = m.find(o => o.id === 'work') || m.find(o => o.id === 'publicwork') || m.find(o => o.id === 'jobhunt' && o.target === 'plumber');
      const sub = s.ch.load > 40 || s.ch.stress > 55 ? 'rest' : (s.year % 2 ? 'care' : 'network');
      return [w, sub];
    },
    choose(s, choices) {
      const ok = choices.filter(c => !c.disabled);
      const safe = ok.filter(c => !c.irreversible && !c.risk);
      const pool = safe.length ? safe : ok;
      return pool.sort((a, b) => (b.chance ?? 100) - (a.chance ?? 100))[0];
    },
  },
  // 숙련 투자: 야간교육·공부, 능력 활용
  skill: {
    childhood: (sc) => sc.choices[Math.min(sc.choices.length - 1, 2)].id,
    goal: (c) => c.includes('G03') ? 'G03' : c[1],
    plan(s, opts) {
      const m = opts.mains;
      if (s.age < 18) return [m.find(o => o.id === (s.age < 15 ? 'm_school' : 'm_apprentice') && (o.target ? o.target === 'plumber' : true)), 'study'];
      if (s.ch.health < 45 || s.ch.load > 60) return [m.find(o => o.id === 'recover'), 'rest'];
      if (s.ch.job && s.age % 6 === 0 && s.ch.cash > 30) return [m.find(o => o.id === 'school' && o.target === s.ch.job.id), 'study'];
      return [m.find(o => o.id === 'work_res') || m.find(o => o.id === 'work') || m.find(o => o.id === 'publicwork') || m.find(o => o.id === 'jobhunt'), 'study'];
    },
    choose(s, choices) {
      const ok = choices.filter(c => !c.disabled);
      return ok.sort((a, b) => (b.tag === 'resonance') - (a.tag === 'resonance') || (b.chance ?? 70) - (a.chance ?? 70))[0];
    },
  },
  // 관계 중심
  social: {
    childhood: (sc) => sc.choices[Math.min(sc.choices.length - 1, 1)].id,
    goal: (c) => c.includes('G12') ? 'G12' : c.includes('G07') ? 'G07' : c[0],
    plan(s, opts) {
      const m = opts.mains;
      if (s.age < 18) return [m.find(o => o.id === (s.age % 2 ? 'm_family' : 'm_apprentice') && (o.target ? o.target === 'recorder' : true)), 'network'];
      if (s.ch.health < 45) return [m.find(o => o.id === 'recover'), 'rest'];
      const w = s.age % 4 === 0 ? m.find(o => o.id === 'community') : (m.find(o => o.id === 'work') || m.find(o => o.id === 'publicwork') || m.find(o => o.id === 'jobhunt' && o.target === 'recorder'));
      return [w || m.find(o => o.id === 'community'), ['care', 'network', 'rest'][s.age % 3]];
    },
    choose(s, choices) {
      const ok = choices.filter(c => !c.disabled);
      return ok[Math.min(ok.length - 1, 0)];
    },
  },
  // 위험 추구
  risky: {
    childhood: (sc) => sc.choices[sc.choices.length - 1].id,
    goal: (c) => c[2],
    plan(s, opts) {
      const m = opts.mains;
      if (s.age < 18) return [m.find(o => o.id === 'm_delivery'), 'network'];
      return [m.find(o => o.id === 'work_res') || m.find(o => o.id === 'work') || m.find(o => o.id === 'publicwork') || m.find(o => o.id === 'jobhunt' && o.target === 'merchant'), s.ch.load > 70 ? 'rest' : 'network'];
    },
    choose(s, choices) {
      const ok = choices.filter(c => !c.disabled);
      const r = ok.find(c => c.irreversible || c.risk);
      return r || ok[ok.length - 1];
    },
  },
};

export function playLife(seed, policyName = 'safe', opts = {}) {
  const P = POLICIES[policyName];
  const s = G.createGame(seed, { name: opts.name || '시험' });
  const trace = [];
  let guard = 0;
  while (s.phase !== 'ended' && guard++ < 20000) {
    if (opts.stopAtAge && s.age >= opts.stopAtAge && s.phase === 'plan') break;
    switch (s.phase) {
      case 'childhood': { const sc = G.childhoodScene(s); G.chooseChildhood(s, P.childhood(sc)); break; }
      case 'goal': G.chooseGoal(s, P.goal(s.goalCandidates)); break;
      case 'plan': {
        if (opts.onPlan) opts.onPlan(s);
        if (s.phase !== 'plan') break;
        if (s.brief.insolvency?.length && s.ch.cash < 0 && !s.flags['insolvency_mutual_aid']) G.useInsolvencyPath(s, 'mutual_aid');
        if (opts.retireAt && s.age >= opts.retireAt) { G.retire(s); break; }
        const po = G.planOptions(s);
        let [m, sub] = P.plan(s, po);
        if (!m || m.disabled) m = po.mains.find(o => !o.disabled);
        if (po.forcedSub) sub = po.forcedSub;
        const ok = G.submitPlan(s, m.id, m.target || null, sub);
        if (!ok) throw new Error(`plan rejected ${m.id} ${m.target} ${sub} age ${s.age}`);
        trace.push(`P ${s.year} ${m.id}:${m.target || ''} ${sub}`);
        break;
      }
      case 'running': G.advance(s); break;
      case 'event': {
        const cs = G.getChoices(s);
        if (!cs.length) throw new Error('no choices for ' + s.current.eventId + ' node ' + s.current.node);
        const c = P.choose(s, cs) || cs[0];
        const pick = c.disabled ? cs.find(x => !x.disabled) : c;
        if (!pick) throw new Error('all choices disabled ' + s.current.eventId);
        const r = G.choose(s, pick.id, s.current.token);
        if (!r.ok) throw new Error(`choose failed ${s.current?.eventId} ${pick.id} ${r.reason}`);
        trace.push(`E ${s.year} ${pick.id}`);
        break;
      }
      case 'yearEnd': G.continueYear(s); break;
      default: throw new Error('phase ' + s.phase);
    }
  }
  if (guard >= 20000) throw new Error('infinite loop seed ' + seed);
  return { s, trace };
}
