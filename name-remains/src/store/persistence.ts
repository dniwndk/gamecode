// IndexedDB 저장소. 회차 상태·판정 사실·계정 기록을 한 트랜잭션에 함께 쓴다(아이언맨 자동 저장).
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { AchievementFact } from '../domain/contentTypes';
import type { ProfileArchive, RunState } from '../domain/types';
import { emptyProfile } from '../domain/publicSelectors';

interface Schema extends DBSchema {
  runs: { key: string; value: { id: string; state: RunState; updated_at: string } };
  domain_facts: { key: number; value: { run_id: string; revision: number; fact: AchievementFact }; indexes: { by_run: string } };
  profile_archive: { key: string; value: ProfileArchive | { id: 'active'; run_id: string | null } };
}

const DB_NAME = 'name-remains';
let dbp: Promise<IDBPDatabase<Schema>> | null = null;

function db() {
  if (!dbp) {
    dbp = openDB<Schema>(DB_NAME, 1, {
      upgrade(d) {
        d.createObjectStore('runs', { keyPath: 'id' });
        const f = d.createObjectStore('domain_facts', { autoIncrement: true });
        f.createIndex('by_run', 'run_id');
        d.createObjectStore('profile_archive', { keyPath: 'id' });
      },
    });
  }
  return dbp;
}

const KEEP_FACT = new Set(['incident_completed', 'endpoint_committed', 'position_granted', 'capability_granted', 'power_override_triggered', 'contract_resolved', 'debt_cleared']);

/** 회차와 계정 기록을 한 번에 원자적으로 저장 */
export async function saveAll(state: RunState | null, profile: ProfileArchive, facts: AchievementFact[] = []) {
  const d = await db();
  const tx = d.transaction(['runs', 'domain_facts', 'profile_archive'], 'readwrite');
  const work: Array<Promise<unknown>> = [];
  if (state) {
    work.push(tx.objectStore('runs').put({ id: state.run.id, state, updated_at: new Date().toISOString() }));
    for (const f of facts) if (KEEP_FACT.has(f.type)) work.push(tx.objectStore('domain_facts').add({ run_id: state.run.id, revision: state.run.revision, fact: f }));
  }
  work.push(tx.objectStore('profile_archive').put(profile));
  work.push(tx.objectStore('profile_archive').put({ id: 'active', run_id: state && state.run.run_status === 'playing' ? state.run.id : null }));
  await Promise.all(work);
  await tx.done;
}

export async function loadAll(): Promise<{ profile: ProfileArchive; active: RunState | null }> {
  try {
    const d = await db();
    const profile = ((await d.get('profile_archive', 'profile')) as ProfileArchive | undefined) ?? emptyProfile();
    const pointer = (await d.get('profile_archive', 'active')) as { run_id: string | null } | undefined;
    let active: RunState | null = null;
    if (pointer?.run_id) {
      const row = await d.get('runs', pointer.run_id);
      if (row && row.state.run.run_status === 'playing') active = row.state;
    }
    return { profile: { ...emptyProfile(), ...profile }, active };
  } catch {
    return { profile: emptyProfile(), active: null };
  }
}

export async function clearAll() {
  const d = await db();
  const tx = d.transaction(['runs', 'domain_facts', 'profile_archive'], 'readwrite');
  await Promise.all([tx.objectStore('runs').clear(), tx.objectStore('domain_facts').clear(), tx.objectStore('profile_archive').clear()]);
  await tx.done;
}

export interface ExportFile {
  format: 'name-remains-save';
  version: 1;
  exported_at: string;
  profile: ProfileArchive;
  active: RunState | null;
}

export function buildExport(profile: ProfileArchive, active: RunState | null): ExportFile {
  return { format: 'name-remains-save', version: 1, exported_at: new Date().toISOString(), profile, active };
}

export function parseImport(text: string): ExportFile {
  const data = JSON.parse(text) as Partial<ExportFile>;
  if (data.format !== 'name-remains-save' || !data.profile || data.profile.id !== 'profile') throw new Error('이 게임의 저장 파일이 아닙니다.');
  const active = data.active && data.active.schema_version === 1 && data.active.run ? data.active : null;
  return { format: 'name-remains-save', version: 1, exported_at: data.exported_at ?? '', profile: data.profile, active };
}
