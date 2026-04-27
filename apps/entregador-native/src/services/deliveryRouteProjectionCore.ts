import type { SchoolItemProjection } from './deliveryProjectionCore';

export interface RouteSchoolProjection {
  escola_id: number;
  escola_nome?: string;
  escola_endereco?: string;
  ordem?: number;
  projections: SchoolItemProjection[];
}

type RouteSchoolMeta = {
  escola_id: number;
  escola_nome?: string;
  escola_endereco?: string;
  ordem?: number;
};

export function buildRouteSchoolProjections(
  routeSchools: RouteSchoolMeta[],
  projectionsBySchool: Map<number, SchoolItemProjection[]>,
): RouteSchoolProjection[] {
  return routeSchools.map((school) => ({
    escola_id: school.escola_id,
    escola_nome: school.escola_nome,
    escola_endereco: school.escola_endereco,
    ordem: school.ordem,
    projections: projectionsBySchool.get(school.escola_id) || [],
  }));
}

export function upsertRouteSchoolProjection(
  current: RouteSchoolProjection[],
  next: RouteSchoolProjection,
): RouteSchoolProjection[] {
  const existingIndex = current.findIndex((entry) => entry.escola_id === next.escola_id);

  if (existingIndex === -1) {
    return [...current, next];
  }

  return current.map((entry, index) => (index === existingIndex ? next : entry));
}
