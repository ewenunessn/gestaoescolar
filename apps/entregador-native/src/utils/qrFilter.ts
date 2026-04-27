export interface EntregaQrFilter {
  escopoRotas: 'todas' | 'selecionadas';
  rotaIds: number[] | 'todas';
  rotaId?: number;
  rotaNome?: string;
  rotaNomes?: string[];
  dataInicio: string;
  dataFim: string;
  status?: string;
  geradoEm?: string;
  geradoPor?: string;
}

const parseRouteIds = (value: unknown): number[] => {
  if (Array.isArray(value)) {
    return value
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id) && id > 0);
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? [value] : [];
  }

  if (typeof value === 'string') {
    if (value === 'todas' || value === '*') return [];

    return value
      .split(',')
      .map((id) => Number(id.trim()))
      .filter((id) => Number.isFinite(id) && id > 0);
  }

  return [];
};

export const normalizeQrFilter = (raw: string | Record<string, any>): EntregaQrFilter | null => {
  const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!data || typeof data !== 'object') return null;

  const dataInicio = data.dataInicio ?? data.di ?? data.inicio;
  const dataFim = data.dataFim ?? data.df ?? data.fim;
  const rawRouteIds = data.rotaIds ?? data.rids ?? data.r ?? data.rotaId;
  const isTodasRotas = data.escopoRotas === 'todas' || rawRouteIds === 'todas' || rawRouteIds === '*';
  const routeIds = parseRouteIds(rawRouteIds);

  if (!dataInicio || !dataFim || (!isTodasRotas && routeIds.length === 0)) {
    return null;
  }

  if (isTodasRotas) {
    return {
      escopoRotas: 'todas',
      rotaIds: 'todas',
      rotaNome: 'Todas as Rotas',
      rotaNomes: ['Todas as Rotas'],
      dataInicio,
      dataFim,
      status: data.status ?? data.s ?? 'todos',
      geradoEm: data.geradoEm,
      geradoPor: data.geradoPor,
    };
  }

  const rotaNomes = data.rotaNomes ?? data.rns;
  const rotaNome = data.rotaNome ?? data.rn ?? (routeIds.length === 1 ? `Rota ${routeIds[0]}` : `${routeIds.length} rotas selecionadas`);

  return {
    escopoRotas: 'selecionadas',
    rotaIds: routeIds,
    rotaId: routeIds.length === 1 ? routeIds[0] : undefined,
    rotaNome,
    rotaNomes: Array.isArray(rotaNomes) ? rotaNomes : rotaNome ? [rotaNome] : undefined,
    dataInicio,
    dataFim,
    status: data.status ?? data.s ?? 'todos',
    geradoEm: data.geradoEm,
    geradoPor: data.geradoPor,
  };
};
