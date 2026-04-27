import type { ItemEntrega } from '../api/rotas';

export interface SchoolItemProjection {
  id: number;
  entrega_confirmada?: boolean;
  saldo_pendente?: number;
  data_entrega?: string;
  latest_historico_entrega_date?: string;
}

interface DateFilter {
  dataInicio: string;
  dataFim: string;
}

export function buildSchoolItemProjections(items: ItemEntrega[]): SchoolItemProjection[] {
  return items.map((item) => ({
    id: item.id,
    entrega_confirmada: item.entrega_confirmada,
    saldo_pendente: item.saldo_pendente,
    data_entrega: item.data_entrega,
    latest_historico_entrega_date: item.historico_entregas?.length
      ? item.historico_entregas[item.historico_entregas.length - 1].data_entrega
      : undefined,
  }));
}

export function countPendingItemsFromProjection(
  projections: SchoolItemProjection[],
  filtro?: DateFilter | null,
): number {
  return projections.filter((projection) => {
    if (!isProjectionVisibleInFilter(projection, filtro)) {
      return false;
    }

    return !projection.entrega_confirmada || !!(projection.saldo_pendente && projection.saldo_pendente > 0);
  }).length;
}

export function hasPendingItemsFromProjection(
  projections: SchoolItemProjection[],
  filtro?: DateFilter | null,
): boolean {
  return countPendingItemsFromProjection(projections, filtro) > 0;
}

export function isSchoolFullyDeliveredOnDateFromProjection(
  projections: SchoolItemProjection[],
  targetDate: Date,
): boolean {
  if (projections.length === 0) {
    return false;
  }

  const targetDateToken = toUtcDateToken(targetDate);
  return projections.every((projection) => {
    if (!projection.entrega_confirmada) {
      return false;
    }

    if (projection.saldo_pendente && projection.saldo_pendente > 0) {
      return false;
    }

    if (!projection.latest_historico_entrega_date) {
      return false;
    }

    return toUtcDateToken(projection.latest_historico_entrega_date) === targetDateToken;
  });
}

function isProjectionVisibleInFilter(
  projection: SchoolItemProjection,
  filtro?: DateFilter | null,
): boolean {
  if (!filtro) {
    return true;
  }

  if (!projection.data_entrega) {
    return true;
  }

  const dataInicio = normalizeDate(new Date(filtro.dataInicio));
  const dataFim = normalizeDateEnd(new Date(filtro.dataFim));
  const dataEntrega = new Date(projection.data_entrega);

  return dataEntrega >= dataInicio && dataEntrega <= dataFim;
}

function normalizeDate(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function normalizeDateEnd(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(23, 59, 59, 999);
  return normalized;
}

function toUtcDateToken(value: string | Date): string {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }

  const date = typeof value === 'string' ? new Date(value) : value;
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${date.getUTCFullYear()}-${month}-${day}`;
}
