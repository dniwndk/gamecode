// 주요 사건 20종(EVT_01~EVT_20)과 호출·사후 장면을 한곳에 모은다.
import type { IncidentDef } from '../../domain/contentTypes';
import { EVT_01, EVT_02, EVT_03, EVT_04, EVT_05 } from './evt01to05';
import { EVT_06, EVT_07, EVT_08, EVT_09, EVT_10 } from './evt06to10';
import { EVT_11, EVT_12, EVT_13, EVT_14, EVT_15, EVT_16 } from './evt11to16';
import { EVT_17, EVT_18, EVT_19, EVT_20 } from './evt17to20';
import { CALLS, POSTMORTEM_SCENES } from './calls';

export const MAJOR_INCIDENTS: IncidentDef[] = [
  EVT_01, EVT_02, EVT_03, EVT_04, EVT_05, EVT_06, EVT_07, EVT_08, EVT_09, EVT_10,
  EVT_11, EVT_12, EVT_13, EVT_14, EVT_15, EVT_16, EVT_17, EVT_18, EVT_19, EVT_20,
];

export const ALL_SCENES: IncidentDef[] = [...MAJOR_INCIDENTS, ...CALLS, ...POSTMORTEM_SCENES];

const byId = new Map(ALL_SCENES.map((d) => [d.id, d]));
export const sceneById = (id: string): IncidentDef | undefined => byId.get(id);

export { CALLS, POSTMORTEM_SCENES };
