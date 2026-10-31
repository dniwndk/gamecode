// 정식 콘텐츠 팩(ba-content-2.4.0). JSON은 scripts/extract-content.mjs가 기획서에서 만든다 — 손으로 고치지 않는다.
import type {
  AssetEntry,
  ContentPack,
  DialogueFile,
  EffectDefinition,
  EnemyDefinition,
  EquipmentDefinition,
  NodeDefinition,
  OopartDefinition,
  PackManifest,
  RulesConfig,
  StatusDefinition,
  StrategyDefinition,
  SynergyDefinition,
  UnitDefinition,
} from '../core/types/content';
import manifest from './pack.json';
import rules from './rules.json';
import units from './units.json';
import synergies from './synergies.json';
import effects from './effects.json';
import equipment from './equipment.json';
import strategies from './strategies.json';
import ooparts from './ooparts.json';
import enemies from './enemies.json';
import nodes from './nodes.json';
import statuses from './statuses.json';
import assets from './assets.json';
import dialogue from './dialogue.ko.json';

// JSON 모듈은 문자열 리터럴 유니언을 string으로 넓히므로 여기서 한 번만 단언한다. 실제 형태는 validateContentPack이 검사한다.
export const contentPack: ContentPack = {
  manifest: manifest as PackManifest,
  rules: rules as RulesConfig,
  units: units as UnitDefinition[],
  synergies: synergies as SynergyDefinition[],
  effects: effects as EffectDefinition[],
  equipment: equipment as EquipmentDefinition[],
  strategies: strategies as StrategyDefinition[],
  ooparts: ooparts as OopartDefinition[],
  enemies: enemies as EnemyDefinition[],
  nodes: nodes as NodeDefinition[],
  statuses: statuses as StatusDefinition[],
  assets: assets as AssetEntry[],
  dialogue: dialogue as DialogueFile[],
};
