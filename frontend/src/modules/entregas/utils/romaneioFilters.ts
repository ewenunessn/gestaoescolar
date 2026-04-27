export interface EntregaRomaneioFilters {
  dataInicio?: string;
  dataFim?: string;
  rotaId?: number;
  rotaIds?: number[];
  somentePendentes?: boolean;
}

export interface RomaneioPageFilters {
  dataInicio: string;
  dataFim: string;
  status: string;
  search?: string;
}

export const ROMANEIO_PATH = "/entregas/romaneio";

export function parseRouteIds(value?: string | null): number[] {
  if (!value) return [];

  const seen = new Set<number>();
  const routeIds: number[] = [];

  value.split(",").forEach((item) => {
    const parsed = Number(item.trim());
    if (!Number.isInteger(parsed) || parsed <= 0 || seen.has(parsed)) return;
    seen.add(parsed);
    routeIds.push(parsed);
  });

  return routeIds;
}

export function buildRomaneioUrlFromEntregaFilters(filtros: EntregaRomaneioFilters): string {
  const params = new URLSearchParams();

  if (filtros.dataInicio) params.set("dataInicio", filtros.dataInicio);
  if (filtros.dataFim) params.set("dataFim", filtros.dataFim);

  const routeIds = filtros.rotaIds?.length
    ? filtros.rotaIds
    : filtros.rotaId
      ? [filtros.rotaId]
      : [];
  if (routeIds.length > 0) params.set("rotaIds", routeIds.join(","));

  if (filtros.somentePendentes) params.set("status", "pendente");

  const query = params.toString();
  return query ? `${ROMANEIO_PATH}?${query}` : ROMANEIO_PATH;
}

export function parseRomaneioFiltersFromSearch(
  search: string,
  defaults: { dataInicio: string; dataFim: string },
) {
  const params = new URLSearchParams(search);
  const rotaIds = parseRouteIds(params.get("rotaIds") || params.get("rotaId"));

  return {
    filters: {
      dataInicio: params.get("dataInicio") || defaults.dataInicio,
      dataFim: params.get("dataFim") || defaults.dataFim,
      status: params.get("status") || "todos",
    },
    rotaIds,
  };
}

export function buildRomaneioApiParams(filters: RomaneioPageFilters, rotaIds: number[]) {
  return {
    data_inicio: filters.dataInicio,
    data_fim: filters.dataFim,
    status: filters.status === "todos" ? undefined : filters.status,
    rota_ids: rotaIds.length > 0 ? rotaIds.join(",") : undefined,
  };
}
