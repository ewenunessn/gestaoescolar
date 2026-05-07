import {
  getEscolasDashboardResumo,
  type EscolasDashboardResumo,
} from "../../escolas/services/dashboardSummaryService";
import {
  getSolicitacoesDashboardResumo,
  type SolicitacoesDashboardResumo,
} from "../../solicitacoes/services/dashboardSummaryService";
import { cacheService } from "../../../utils/cacheService";
import type { ClientChannel } from "../../../gateway/clientChannel";

export interface DashboardProvider<TResumo> {
  getResumo(): Promise<TResumo>;
}

export interface DashboardServiceProviders {
  escolas: DashboardProvider<EscolasDashboardResumo>;
  solicitacoes: DashboardProvider<SolicitacoesDashboardResumo>;
}

export interface DashboardCache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, data: T, ttlSeconds: number): Promise<void>;
}

export interface DashboardResumo {
  escolas: {
    total: number;
    ativas: number;
  };
  alunos: number;
  solicitacoes: {
    total: number;
    atendidas: number;
  };
}

export class DashboardService {
  constructor(
    private readonly providers: DashboardServiceProviders,
    private readonly cache: DashboardCache | null = cacheService,
  ) {}

  async getResumo(clientChannel: ClientChannel = "api"): Promise<DashboardResumo> {
    const cacheKey = `dashboard:resumo:${clientChannel}`;
    const cached = await this.cache?.get<DashboardResumo>(cacheKey);
    if (cached) return cached;

    const [escolas, solicitacoes] = await Promise.all([
      this.providers.escolas.getResumo(),
      this.providers.solicitacoes.getResumo(),
    ]);

    const resumo = {
      escolas: {
        total: escolas.total,
        ativas: escolas.ativas,
      },
      alunos: escolas.alunos,
      solicitacoes,
    };

    await this.cache?.set(cacheKey, resumo, cacheService.TTL.dashboard);
    return resumo;
  }
}

export function createDashboardService(): DashboardService {
  return new DashboardService({
    escolas: { getResumo: getEscolasDashboardResumo },
    solicitacoes: { getResumo: getSolicitacoesDashboardResumo },
  });
}
