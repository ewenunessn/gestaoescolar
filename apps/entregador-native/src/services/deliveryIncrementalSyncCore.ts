import type { ItemEntrega } from '../api/rotas';

export type ItemEntregaWithEscola = ItemEntrega & {
  escola_id: number;
};

export function mergeChangedItemsIntoCachedItems(
  cachedItems: ItemEntrega[],
  changedItems: ItemEntrega[],
): ItemEntrega[] {
  if (changedItems.length === 0) {
    return cachedItems;
  }

  const changesById = new Map(changedItems.map((item) => [item.id, item]));
  const seen = new Set<number>();
  const merged = cachedItems.map((item) => {
    const changed = changesById.get(item.id);
    if (!changed) {
      return item;
    }

    seen.add(item.id);
    return changed;
  });

  for (const changed of changedItems) {
    if (!seen.has(changed.id)) {
      merged.push(changed);
    }
  }

  return merged;
}

export function groupItemsBySchool<T extends ItemEntregaWithEscola>(items: T[]): Map<number, T[]> {
  const groups = new Map<number, T[]>();

  for (const item of items) {
    const current = groups.get(item.escola_id) || [];
    current.push(item);
    groups.set(item.escola_id, current);
  }

  return groups;
}
