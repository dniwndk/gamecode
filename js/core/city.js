// 도시 자율 변화. 플레이어가 아무것도 하지 않아도 공급·물가·일자리·세력 계획이 움직인다.
import { withRng } from './rng.js';
import { cityDelta } from './rules.js';
import { clamp } from './util.js';
import { DISTRICTS, OTHER_DISTRICTS } from '../data/world.js';

const SEASON_DEMAND = [0, -8, 2, 12];

export function seasonTick(state) {
  const city = state.city;
  city.changeAcc = {};
  const g = city.global;
  const log = null; // 계절 변화는 줄 단위로 보여 주지 않는다. 원인이 있는 변화만 결산에 남는다
  // 수요: 계절 보정 + 해마다 조금씩 늘어나는 기본 수요
  city.demandNow = city.demandBase + SEASON_DEMAND[state.season];
  // 공급: 기본 용량 − 점검 부족 − 이번 계절 사고
  let supply = city.supplyBase;
  const accident = withRng(state, 'city', r => (r.pct(5) ? r.range(5, 15) : 0));
  if (accident) {
    supply -= accident;
    city.accidentsRecent.push(state.year);
    const where = withRng(state, 'city', r => r.pick([...Object.values(OTHER_DISTRICTS).slice(0, 4), DISTRICTS.brass.name]));
    pushNews(state, 'fact', `${where} 배관망에서 압력 사고. 이번 계절 공급이 ${accident}만큼 줄었다.`);
  }
  if (city.blackout && city.blackout.seasons > 0) { supply -= 6; city.blackout.seasons--; }
  city.supplyNow = supply;
  city.shortage = Math.max(0, city.demandNow - supply) / Math.max(1, city.demandNow);
  city.maxShortageYear = Math.max(city.maxShortageYear, city.shortage);

  if (city.shortage > 0.05) {
    cityDelta(state, 'global', 'supply', -3, log, '열 공급 부족');
    cityDelta(state, 'global', 'price', 2, log, '열 공급 부족');
  } else {
    if (g.supply < 70) cityDelta(state, 'global', 'supply', 1, log, '');
    if (g.price > 100) cityDelta(state, 'global', 'price', -1, log, '');
    if (g.price < 100) cityDelta(state, 'global', 'price', 1, log, '');
  }
  // 구역 열 공급은 전역 공급 안정과 겨울 수요를 따라간다
  for (const [k, d] of Object.entries(city.districts)) {
    const base = DISTRICTS[k].start.heat + (g.supply - 60) * 0.6 + (city.districtBonus?.[k] || 0) - (state.season === 3 ? 6 : 0) - (city.blackout?.district === k && city.blackout.seasons > 0 ? 15 : 0);
    const diff = Math.round(clamp(base, 5, 95) - d.heat);
    if (diff) cityDelta(state, k, 'heat', clamp(diff, -4, 4), log, '');
  }
  // 파업 중에는 공업대 일자리가 줄어든다
  if (city.factions.union.striking) cityDelta(state, 'brass', 'jobs', -3, log, '노동연맹 파업');
  else if (city.districts.brass.jobs < DISTRICTS.brass.start.jobs) cityDelta(state, 'brass', 'jobs', 1, log, '');
}

function pushNews(state, kind, text, editor) {
  state.city.news.push({ year: state.year, season: state.season, kind, text, editor: editor || null });
  if (state.city.news.length > 60) state.city.news.splice(0, state.city.news.length - 60);
}

// 연초: 세력마다 최대 하나의 주요 계획. 자원을 실제로 차감한다.
export function yearStartCity(state) {
  const city = state.city;
  const g = city.global;
  const f = city.factions;
  const plans = [];
  city.maxShortageYear = 0;
  city.demandBase = Math.min(118, city.demandBase + 0.3);
  // 노후화: 점검이 없으면 기본 용량이 조금씩 준다
  city.supplyBase = clamp(city.supplyBase - 1, 80, 130);
  for (const k of Object.keys(f)) f[k].funds = clamp(f[k].funds + 12, 0, 120);

  // 시정청
  if (g.supply < 55 && f.office.funds >= 30) {
    f.office.funds -= 30; city.supplyBase += 4;
    plans.push({ f: 'office', text: '시정청이 배관 점검 인력을 늘렸다. 올해 공급 용량이 회복된다.', effect: [['global', 'trust', 2]] });
  } else if (g.supply < 45) {
    plans.push({ f: 'office', text: '시정청이 비상 공급 통제를 선포했다. 구역별 열 배분 시간이 정해진다.', effect: [['global', 'trust', -3], ['brass', 'safety', 3]] });
  } else if (f.office.funds >= 20) {
    f.office.funds -= 20; city.supplyBase += 2;
    plans.push({ f: 'office', text: '시정청의 정기 점검이 예정대로 진행된다.', effect: [] });
  }
  // 동업회
  if (f.guild.funds >= 30 && g.employment > 55) {
    f.guild.funds -= 30;
    plans.push({ f: 'guild', text: '황동 동업회가 공업대 설비 확장에 투자했다. 일자리는 늘지만 굴뚝도 늘었다.', effect: [['brass', 'jobs', 4], ['brass', 'pollution', 2], ['global', 'employment', 2]] });
  } else {
    plans.push({ f: 'guild', text: '황동 동업회가 납품 단가를 올렸다. 생필품 가격이 따라 오른다.', effect: [['global', 'price', 3]] });
  }
  // 노동연맹: 최근 사고와 긴장에 따라 파업 준비 → 파업 또는 협상
  const recentAcc = city.accidentsRecent.filter(y => y >= state.year - 2).length;
  if (f.union.striking) {
    f.union.striking = false;
    plans.push({ f: 'union', text: '노동연맹 파업이 끝났다. 협상 결과 안전 점검 조항이 생겼다.', effect: [['brass', 'safety', 4], ['global', 'tension', -6]] });
  } else if (f.union.strikePrep >= 1 && (g.tension > 60 || recentAcc >= 3)) {
    f.union.striking = true; f.union.strikePrep = 0;
    plans.push({ f: 'union', text: '적동 노동연맹이 공업대 총파업에 들어갔다. 생산이 멈춘다.', effect: [['global', 'employment', -4], ['global', 'tension', 4]] });
  } else if (recentAcc >= 2 || g.tension > 60) {
    f.union.strikePrep += 1;
    plans.push({ f: 'union', text: '노동연맹이 파업 기금을 모으기 시작했다.', effect: [['global', 'tension', 5]] });
  } else {
    if (f.union.strikePrep > 0) f.union.strikePrep--;
    plans.push({ f: 'union', text: '노동연맹이 부상자 돌봄 기금을 늘렸다.', effect: [['global', 'tension', -2]] });
  }
  // 상호회
  if (city.districts.ash.heat < 40 && f.mutual.funds >= 15) {
    f.mutual.funds -= 15;
    city.districtBonus = city.districtBonus || {};
    city.districtBonus.ash = clamp((city.districtBonus.ash || 0) + 3, -20, 25);
    plans.push({ f: 'mutual', text: '등불 상호회가 재의 골목 공동 난로를 정비했다.', effect: [['ash', 'heat', 4]] });
  } else if (g.price > 110 && f.mutual.funds >= 10) {
    f.mutual.funds -= 10;
    plans.push({ f: 'mutual', text: '등불 상호회가 공동 배급을 열었다. 식비 부담이 조금 준다.', effect: [['global', 'price', -2]] });
  }

  for (const p of plans) {
    for (const [scope, key, v] of p.effect) cityDelta(state, scope, key, v, null, p.text);
    pushNews(state, 'fact', p.text, editorFor(state, p));
  }
  city.lastPlans = plans;
  if (state.city.clocks.supplyChain >= 4) pushNews(state, 'warn', `공급망 위기 경고 ${state.city.clocks.supplyChain}/6. 시정청은 "통제 가능한 수준"이라고 밝혔다.`, '편집자 해석: 통제 가능한 수준이라는 말은 지난 흰 안개 정전 직전에도 나왔다.');
  return plans;
}

function editorFor(state, p) {
  const lines = {
    office: ['편집자 해석: 점검 예산이 어느 구역에 먼저 쓰일지는 아직 공개되지 않았다.', '편집자 해석: 고지대부터 점검한다는 소문이 돈다.'],
    guild: ['편집자 해석: 동업회는 확장이 모두의 안정이라 말하지만, 굴뚝 아래 사는 사람의 생각은 다르다.', '편집자 해석: 이보 렌 대표의 제2심장 담보 문제가 배경에 있다는 관측이 있다.'],
    union: ['편집자 해석: 사빈 케르 조직가는 "파업은 마지막 수단"이라고 말했다.', '편집자 해석: 파업 기금이 겨울을 버틸 만큼인지는 미지수다.'],
    mutual: ['편집자 해석: 상호회 장부가 적자라는 소문은 아직 확인되지 않았다.', '편집자 해석: 토마 아쉬는 외부 자금 제안을 또 거절했다고 한다.'],
  };
  const arr = lines[p.f] || [];
  return arr.length ? arr[state.year % arr.length] : null;
}

// 연말: 위기 시계 갱신. 동일 원인 증가는 연 1회.
export function yearEndCity(state) {
  const city = state.city;
  const c = city.clocks;
  const notes = [];
  if (city.maxShortageYear > 0.08) {
    c.supplyChain = clamp(c.supplyChain + 1, 0, 6);
    notes.push(`올해 최대 공급 부족률 ${(city.maxShortageYear * 100).toFixed(0)}%. 공급망 위기 시계가 ${c.supplyChain}/6로 올라갔다.`);
  } else if (city.maxShortageYear < 0.03 && c.supplyChain > 0 && city.global.supply >= 55) {
    c.supplyChain -= 1;
    notes.push(`공급이 안정되어 공급망 위기 시계가 ${c.supplyChain}/6로 내려갔다.`);
  }
  if (c.supplyChain >= 6) {
    // 국면 전환: 한 구역의 정전과 물가 상승. 네 계절에 나눠 반영한다.
    const district = withRng(state, 'city', r => r.pick(Object.keys(city.districts)));
    city.blackout = { district, seasons: 4, year: state.year + 1 };
    city.demandBase -= 2;
    c.supplyChain = 3;
    notes.push(`공급망이 끊겼다. 내년 한 해 ${DISTRICTS[district].name}에 순환 정전이 시행된다.`);
    pushNews(state, 'warn', `국면 전환: ${DISTRICTS[district].name} 순환 정전 결정. 시정청 비상권한이 강화된다.`, '편집자 해석: 이번에도 저지대부터다.');
    state.flags.blackoutHappened = state.year;
  }
  for (const n of notes) state.yearLog.cityChanges.push({ text: n, cause: '도시 공급망' });
  city.accidentsRecent = city.accidentsRecent.filter(y => y >= state.year - 3);
  return notes;
}

export function districtStatus(v, invert = false) {
  const x = invert ? 100 - v : v;
  if (x >= 55) return '안정';
  if (x >= 35) return '주의';
  return '위기';
}
