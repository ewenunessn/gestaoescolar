import api from "./api";
import type {
  GerarGuiasResponse,
  IniciarJobResponse,
  Job,
  PeriodoGerarPedido,
} from "./planejamentoCompras";

export type { GerarGuiasResponse, IniciarJobResponse, Job, PeriodoGerarPedido };

export interface GerarGuiaDemandaParams {
  competencia: string;
  periodos: PeriodoGerarPedido[];
  escola_ids?: number[];
  observacoes?: string;
  considerar_indice_coccao?: boolean;
  considerar_fator_correcao?: boolean;
  cardapio_ids?: number[];
}

export async function iniciarGeracaoGuiaDemanda(
  params: GerarGuiaDemandaParams,
): Promise<IniciarJobResponse> {
  const response = await api.post<IniciarJobResponse>("/guias/geracao-demanda/async", params);
  return response.data;
}

export async function gerarGuiaDemanda(params: GerarGuiaDemandaParams): Promise<GerarGuiasResponse> {
  const response = await api.post<GerarGuiasResponse>("/guias/geracao-demanda", params);
  return response.data;
}

export async function buscarStatusGeracaoGuiaDemanda(jobId: number): Promise<Job> {
  const response = await api.get<Job>(`/guias/geracao-demanda/jobs/${jobId}`);
  return response.data;
}
