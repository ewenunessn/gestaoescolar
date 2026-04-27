import type { SchoolItemProjection } from './deliveryProjectionCore';
import { cacheService } from './cacheService';
import {
  buildRouteSchoolProjections,
  type RouteSchoolProjection,
  upsertRouteSchoolProjection,
} from './deliveryRouteProjectionCore';

type RouteSchoolMeta = {
  escola_id: number;
  escola_nome?: string;
  escola_endereco?: string;
  ordem?: number;
};

export function getRouteProjectionCacheKey(routeId: number): string {
  return `rota_projection_${routeId}`;
}

export async function getRouteProjectionEntry(routeId: number) {
  return cacheService.getEntry<RouteSchoolProjection[]>(getRouteProjectionCacheKey(routeId));
}

export async function getRouteProjection(routeId: number) {
  return cacheService.get<RouteSchoolProjection[]>(getRouteProjectionCacheKey(routeId));
}

export async function saveRouteProjectionSnapshot(
  routeId: number,
  routeSchools: RouteSchoolMeta[],
  projectionsBySchool: Map<number, SchoolItemProjection[]>,
): Promise<RouteSchoolProjection[]> {
  const projections = buildRouteSchoolProjections(routeSchools, projectionsBySchool);
  await cacheService.set(getRouteProjectionCacheKey(routeId), projections);
  return projections;
}

export async function upsertRouteSchoolProjectionSnapshot(
  routeId: number,
  school: RouteSchoolMeta,
  projections: SchoolItemProjection[],
): Promise<RouteSchoolProjection[] | null> {
  const current = await getRouteProjection(routeId);
  if (!current) {
    return null;
  }

  const updated = upsertRouteSchoolProjection(current, {
    escola_id: school.escola_id,
    escola_nome: school.escola_nome,
    escola_endereco: school.escola_endereco,
    ordem: school.ordem,
    projections,
  });
  await cacheService.set(getRouteProjectionCacheKey(routeId), updated);
  return updated;
}
