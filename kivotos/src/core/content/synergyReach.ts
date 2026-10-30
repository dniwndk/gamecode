import type { SynergyDefinition, UnitDefinition } from '../types/content';

export interface SynergyComposition {
  frontOnly: number;
  rearOnly: number;
  dual: number;
  /** 이 시너지만 노릴 때 실제 슬롯에 올릴 수 있는 구성원 최대 수 */
  maxLegalCount: number;
}

export interface BoardCapacity {
  frontSlots: number;
  rearSlots: number;
  maxDeployed: number;
}

/**
 * GDD v2.1 6장 시너지 용량 식.
 * 전후방 집계: min(N, 최대 편성, 전방칸+R+D, 후방칸+F+D). 전방 집계: min(전방칸, F+D). 후방 집계: min(후방칸, R+D).
 * 단독 도달 가능성만 본다. 여러 시너지 동시 성립은 실제 슬롯 할당으로 따로 검사해야 한다.
 * special 집계는 구성원 명단이 없으므로 0으로 둔다(편성 조건은 효과 문장에서 판정).
 */
export function synergyComposition(
  synergy: Pick<SynergyDefinition, 'memberIds' | 'countScope'>,
  unitsById: ReadonlyMap<string, Pick<UnitDefinition, 'position'>>,
  board: BoardCapacity,
): SynergyComposition {
  let frontOnly = 0;
  let rearOnly = 0;
  let dual = 0;
  for (const id of synergy.memberIds) {
    const position = unitsById.get(id)?.position;
    if (position === 'front_only') frontOnly++;
    else if (position === 'rear_only') rearOnly++;
    else if (position === 'dual') dual++;
  }
  const total = frontOnly + rearOnly + dual;
  const maxLegalCount =
    synergy.countScope === 'special'
      ? 0
      : synergy.countScope === 'front_only'
        ? Math.min(board.frontSlots, frontOnly + dual)
        : synergy.countScope === 'rear_only'
          ? Math.min(board.rearSlots, rearOnly + dual)
          : Math.min(total, board.maxDeployed, board.frontSlots + rearOnly + dual, board.rearSlots + frontOnly + dual);
  return { frontOnly, rearOnly, dual, maxLegalCount };
}
