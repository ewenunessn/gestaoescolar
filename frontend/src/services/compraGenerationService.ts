import api from "./api";
import type {
  GerarPedidoDaGuiaResponse,
  IniciarJobResponse,
  Job,
} from "./planejamentoCompras";

export type { GerarPedidoDaGuiaResponse, IniciarJobResponse, Job };

export interface ContratoSelecionadoParaCompra {
  produto_id: number;
  contrato_produto_id: number;
  quantidade?: number;
}

export interface GerarCompraDaGuiaParams {
  guia_id: number;
  contratos_selecionados?: ContratoSelecionadoParaCompra[];
  ignorar_sem_contrato?: boolean;
  observacoes?: string;
}

export async function validarCompraDaGuia(
  params: GerarCompraDaGuiaParams,
): Promise<GerarPedidoDaGuiaResponse> {
  const response = await api.post<GerarPedidoDaGuiaResponse>("/compras/gerar-da-guia", params);
  return response.data;
}

export async function iniciarGeracaoCompraDaGuia(
  params: GerarCompraDaGuiaParams,
): Promise<IniciarJobResponse> {
  const response = await api.post<IniciarJobResponse>("/compras/gerar-da-guia/async", params);
  return response.data;
}

export async function iniciarGeracaoPedidoAsync(
  guia_id: number,
  contratos_selecionados?: ContratoSelecionadoParaCompra[],
  ignorar_sem_contrato?: boolean,
  observacoes?: string,
): Promise<IniciarJobResponse> {
  return iniciarGeracaoCompraDaGuia({
    guia_id,
    contratos_selecionados,
    ignorar_sem_contrato,
    observacoes,
  });
}

export async function buscarStatusGeracaoCompra(jobId: number): Promise<Job> {
  const response = await api.get<Job>(`/compras/jobs/${jobId}`);
  return response.data;
}
