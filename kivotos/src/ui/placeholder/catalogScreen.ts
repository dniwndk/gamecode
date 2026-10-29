// 임시 화면(M0): 콘텐츠 카탈로그와 검증 결과를 보여 준다. 정식 UI가 오면 이 폴더째 교체한다.
// 게임과는 GameClient 계약으로만 이야기한다(docs/UI_CONTRACT.md).
import type { GameClient } from '../../app/gameClient';

const FACTION_COLOR: Record<string, string> = {
  syn_abydos: '#3b82f6', syn_gehenna: '#dc2626', syn_millennium: '#0ea5e9', syn_trinity: '#eab308',
  syn_hyakkiyako: '#db2777', syn_shanhaijing: '#16a34a', syn_red_winter: '#b91c1c', syn_valkyrie: '#1d4ed8',
  syn_srt: '#475569', syn_arius: '#7c3aed', syn_problem_solver: '#9f1239', syn_cc: '#111827',
  syn_highlander: '#0f766e', syn_outlaw: '#a16207',
};

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function mountCatalogScreen(root: HTMLElement, client: GameClient): void {
  const { pack, validation } = client.catalog;
  const snapshot = client.getSnapshot();
  root.replaceChildren();

  const header = el('header', 'top');
  header.append(el('h1', undefined, '키보토스 택티컬 프론트라인'));
  header.append(el('p', 'sub', `개발 단계 M0 · 콘텐츠 ${snapshot.contentVersion} · 규칙 ${snapshot.rulesVersion}`));
  root.append(header);

  const status = el('section', validation.errors.length ? 'status bad' : 'status ok');
  const { counts, effectsImplemented, effectsTotal, portraitsPresent } = validation.stats;
  status.append(el('h2', undefined, validation.errors.length ? `콘텐츠 검증 실패 (${validation.errors.length}건)` : '콘텐츠 검증 통과'));
  status.append(el('p', undefined,
    `유닛 ${counts.units} · 시너지 ${counts.synergies} · 장비 ${counts.equipment} · 전략 ${counts.strategies} · 적 ${counts.enemies} · 노드 ${counts.nodes} · 효과 ${counts.effects} · 대사 ${counts.dialogueFiles}`));
  status.append(el('p', undefined, `실행 연산이 붙은 효과 ${effectsImplemented}/${effectsTotal} · 초상화 ${portraitsPresent}/${counts.units}`));
  for (const issue of validation.errors.slice(0, 20)) status.append(el('p', 'issue', `[${issue.code}] ${issue.path}: ${issue.message}`));
  status.append(el('p', 'note', '아직 플레이할 수 없습니다. 상점·편성(M1)과 전투(M2)가 다음 단계입니다.'));
  root.append(status);

  const grid = el('section', 'grid');
  grid.setAttribute('aria-label', '학생 목록');
  for (const unit of [...pack.units].sort((a, b) => a.cost - b.cost || a.id.localeCompare(b.id))) {
    const card = el('article', `card cost${unit.cost}`);
    const url = client.catalog.assetUrl(unit.portraitAssetId);
    const faction = unit.synergyIds.find((id) => id in FACTION_COLOR);
    if (url) {
      const img = el('img');
      img.src = url;
      img.alt = unit.name;
      img.loading = 'lazy';
      img.decoding = 'async';
      // 이미지가 없거나 깨지면 이니셜로 대체(13.4: 이미지 실패가 진행을 막지 않는다)
      img.addEventListener('error', () => img.replaceWith(initials(unit.name, faction)));
      card.append(img);
    } else {
      card.append(initials(unit.name, faction));
    }
    card.append(el('h3', undefined, unit.name));
    card.append(el('p', 'meta', `${unit.cost}코스트 · ${unit.position === 'front_only' ? '전방' : unit.position === 'rear_only' ? '후방' : '겸용'}`));
    const tags = el('p', 'tags');
    tags.textContent = unit.synergyIds.map((id) => pack.synergies.find((s) => s.id === id)?.name ?? id).join(' · ');
    card.append(tags);
    grid.append(card);
  }
  root.append(grid);
}

function initials(name: string, faction: string | undefined): HTMLElement {
  const box = el('div', 'initials', name.split(' ').pop()?.slice(0, 2) ?? name.slice(0, 2));
  box.style.background = (faction && FACTION_COLOR[faction]) || '#64748b';
  box.setAttribute('aria-hidden', 'true');
  return box;
}
