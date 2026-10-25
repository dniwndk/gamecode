// 종점 후일담과 묘비명. 결과 화면과 생애실, 공유 문구가 같은 문장을 쓴다.
import type { EndpointType, RunState } from './types';
import { bgById } from '../content/backgrounds';
import { formById, pathById } from '../content/progression';
import { josa } from './text';

export function positionName(s: RunState): string {
  const p = s.run.person;
  if (!p.path_id) return '이름 없는 시민';
  return pathById(p.path_id)?.tiers[p.position_tier]?.name ?? '이름 없는 시민';
}

export function ageNow(s: RunState): number {
  return Math.floor(s.run.clock.current_age_years);
}

export function buildEpilogue(s: RunState, type: EndpointType, cause: string, natural: boolean): string {
  const p = s.run.person;
  const name = p.name;
  const age = ageNow(s);
  const pos = positionName(s);
  const clears = s.run.counters.clears ?? 0;
  const lived = clears > 0 ? `${clears}번의 괴담에서 살아 돌아온 ` : '';
  switch (type) {
    case 'death':
      if (natural)
        return `${age}세. ${lived}${pos} ${josa(name, '은/는')} 괴물의 이빨이 아니라 늙은 시간의 품에서 눈을 감았습니다. 장례식장 창문은 끝까지 열려 있었고, 아무도 커튼을 치지 않았습니다.`;
      return `${age}세. ${cause} ${lived}${pos} ${name}의 이야기가 끝났습니다. 다음 날 아침, 재난청 보고서에는 '단순 사고'라는 네 글자가 적혔습니다. 그 네 글자 아래에 누군가 연필로 이름을 적어 두었습니다.`;
    case 'dissolution':
      return `${age}세 무렵. ${formById(p.form_id).name}의 몸을 붙들던 마지막 실이 풀렸습니다. ${josa(name, '은/는')} 소리 없이 흩어졌고, 그 자리에는 아무도 모르는 따뜻함이 잠깐 남았다가 사라졌습니다.`;
    case 'ascension':
      return `${josa(name, '은/는')} 마지막 문턱을 넘었습니다. 죽음은 더 이상 부를 이름을 찾지 못합니다. 도시의 안개가 걷힌 아침, 사람들은 이유도 모른 채 같은 방향을 향해 고개를 숙였습니다.`;
    case 'immortality':
      return `${josa(name, '은/는')} 누구의 희생도 빌리지 않고 스스로를 영원히 유지하는 법을 완성했습니다. 달력이 먼저 낡고, 왕좌의 주인은 끝내 바뀌지 않습니다.`;
    case 'perpetual_domain':
      return `${name}의 이름은 사람이 아니라 규칙으로 남았습니다. 꺼지지 않는 등불 아래에서, 이 도시의 아이들은 그 규칙을 자장가처럼 외웁니다.`;
    case 'eternal_binding':
      return `${josa(name, '은/는')} 죽지 않았습니다. 그러나 제단의 사슬은 풀리지 않았습니다. 제단의 시계는 오늘도 같은 시각을 가리키며 멈춰 있습니다.`;
  }
}

/** 묘비명: 한 줄 요약 */
export function buildEpitaph(s: RunState): string {
  const p = s.run.person;
  const bg = bgById(p.background_id);
  const age = ageNow(s);
  const ep = s.run.endpoint;
  const pos = positionName(s);
  const verb =
    !ep ? '이야기를 덮었다'
    : ep.endpoint_type === 'death' ? (ep.cause === '노환' ? '평온히 잠들었다' : '쓰러졌다')
    : ep.endpoint_type === 'dissolution' ? '흩어졌다'
    : ep.endpoint_type === 'ascension' ? '문밖으로 걸어 나갔다'
    : ep.endpoint_type === 'immortality' ? '영원이 되었다'
    : ep.endpoint_type === 'perpetual_domain' ? '규칙으로 남았다'
    : '제단에 묶였다';
  return `${josa(bg.name, '으로/로')} 태어나, ${josa(pos, '으로/로')}서 ${age}세에 ${verb}.`;
}
