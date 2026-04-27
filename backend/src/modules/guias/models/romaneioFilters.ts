export interface RomaneioRouteFilterInput {
  rota_id?: unknown;
  rota_ids?: unknown;
  rotaId?: unknown;
  rotaIds?: unknown;
}

function collectRouteIdValues(value: unknown, output: unknown[]) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectRouteIdValues(item, output));
    return;
  }

  if (typeof value === "string") {
    value.split(",").forEach((item) => output.push(item.trim()));
    return;
  }

  if (value !== undefined && value !== null) {
    output.push(value);
  }
}

export function normalizeRomaneioRouteIds(input: RomaneioRouteFilterInput = {}): number[] {
  const rawValues: unknown[] = [];
  collectRouteIdValues(input.rota_ids ?? input.rotaIds, rawValues);
  collectRouteIdValues(input.rota_id ?? input.rotaId, rawValues);

  const seen = new Set<number>();
  const routeIds: number[] = [];

  for (const value of rawValues) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0 || seen.has(parsed)) continue;
    seen.add(parsed);
    routeIds.push(parsed);
  }

  return routeIds;
}

export function buildRomaneioRouteFilter(routeIds: number[], paramIndex: number) {
  if (routeIds.length === 0) {
    return { sql: "", values: [] as any[] };
  }

  return {
    sql: ` AND EXISTS (
          SELECT 1 FROM rota_escolas res
          WHERE res.escola_id = e.id AND res.rota_id = ANY($${paramIndex}::int[])
        )`,
    values: [routeIds],
  };
}
