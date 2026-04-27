import type { ItemEntrega } from '../api/rotas';
import { cacheService } from './cacheService';
import { buildSchoolItemProjections, type SchoolItemProjection } from './deliveryProjectionCore';

export function getSchoolProjectionCacheKey(escolaId: number): string {
  return `itens_escola_projection_${escolaId}`;
}

export async function getSchoolProjectionEntry(escolaId: number) {
  return cacheService.getEntry<SchoolItemProjection[]>(getSchoolProjectionCacheKey(escolaId));
}

export async function getSchoolProjection(escolaId: number) {
  return cacheService.get<SchoolItemProjection[]>(getSchoolProjectionCacheKey(escolaId));
}

export async function saveSchoolItemsSnapshot(
  escolaId: number,
  rawItems: ItemEntrega[],
  projectionItems: ItemEntrega[] = rawItems,
): Promise<SchoolItemProjection[]> {
  await cacheService.set(`itens_escola_${escolaId}`, rawItems);
  return saveSchoolProjectionSnapshot(escolaId, projectionItems);
}

export async function saveSchoolProjectionSnapshot(
  escolaId: number,
  projectionItems: ItemEntrega[],
): Promise<SchoolItemProjection[]> {
  const projections = buildSchoolItemProjections(projectionItems);
  await cacheService.set(getSchoolProjectionCacheKey(escolaId), projections);
  return projections;
}
