import { apiWithRetry } from "./api";

export interface HistoricoAlunosModalidadesFiltros {
  escola_id?: number | string;
  modalidade_id?: number | string;
  data_inicio?: string;
  data_fim?: string;
  limit?: number;
}

export interface RelatorioAlunosModalidadesFiltros {
  data_referencia?: string;
  escola_id?: number | string;
  modalidade_id?: number | string;
  escola_ativo?: 'true' | 'false' | 'todas';
}

export interface MetadadosHistoricoAlunos {
  vigente_de?: string;
  observacao?: string;
}

function buildQueryString(params: Record<string, unknown>) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  });

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export const escolasService = {
  async listar() {
    return listarEscolas();
  }
};

let escolasCache: any[] | null = null;
let escolasRequest: Promise<any[]> | null = null;
let escolasCacheAt = 0;
const ESCOLAS_CACHE_TTL_MS = 60_000;

function clearEscolasCache() {
  escolasCache = null;
  escolasCacheAt = 0;
}

export async function listarEscolas(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && escolasCache && now - escolasCacheAt < ESCOLAS_CACHE_TTL_MS) {
    return escolasCache;
  }

  if (!forceRefresh && escolasRequest) {
    return escolasRequest;
  }

  escolasRequest = apiWithRetry
    .get("/escolas")
    .then(({ data }) => {
      escolasCache = data.data || [];
      escolasCacheAt = Date.now();
      return escolasCache;
    })
    .finally(() => {
      escolasRequest = null;
    });

  return escolasRequest;
}

export async function buscarEscola(id: number) {
  const { data } = await apiWithRetry.get(`/escolas/${id}`);
  return data.data || null; // Return the actual data from the response
}

// Alias para compatibilidade
export async function obterEscola(id: number) {
  const { data } = await apiWithRetry.get(`/escolas/${id}`);
  return data.data || null; // Return the actual data from the response
}

export async function criarEscola(escola: Record<string, unknown>) {
  const { data } = await apiWithRetry.post("/escolas", escola);
  clearEscolasCache();
  return data.data || data; // Return the actual data from the response
}

export async function editarEscola(id: number, escola: Record<string, unknown>) {
  const { data } = await apiWithRetry.put(`/escolas/${id}`, escola);
  clearEscolasCache();
  return data.data || data; // Return the actual data from the response
}

// Alias para compatibilidade
export async function atualizarEscola(id: number, escola: Record<string, unknown>) {
  const { data } = await apiWithRetry.put(`/escolas/${id}`, escola);
  clearEscolasCache();
  return data.data || data; // Return the actual data from the response
}

export async function removerEscola(id: number) {
  await apiWithRetry.delete(`/escolas/${id}`);
  clearEscolasCache();
}

// Alias para manter compatibilidade com código existente
export async function deletarEscola(id: number) {
  await apiWithRetry.delete(`/escolas/${id}`);
}

export async function listarEscolaModalidades() {
  const { data } = await apiWithRetry.get("/escola-modalidades");
  return data.data || []; // Return the actual array from the response
}

export async function buscarEscolaModalidade(id: number) {
  const { data } = await apiWithRetry.get(`/escola-modalidades/${id}`);
  return data.data || null; // Return the actual data from the response
}

export async function criarEscolaModalidade(escolaModalidade: Record<string, unknown>) {
  const { data } = await apiWithRetry.post(
    "/escola-modalidades",
    escolaModalidade
  );
  return data.data || data; // Handle both new format {success, data} and old format
}

// Alias para manter compatibilidade com código existente
export async function adicionarEscolaModalidade(
  escolaId: number,
  modalidadeId: number,
  alunos: number,
  metadados?: MetadadosHistoricoAlunos
) {
  const { data } = await apiWithRetry.post("/escola-modalidades", {
    escola_id: escolaId,
    modalidade_id: modalidadeId,
    quantidade_alunos: alunos,
    ...metadados,
  });
  return data.data || data; // Handle both new format {success, data} and old format
}

export async function editarEscolaModalidade(
  id: number,
  escolaModalidade: Record<string, unknown>
) {
  const { data } = await apiWithRetry.put(
    `/escola-modalidades/${id}`,
    escolaModalidade
  );
  return data.data || data; // Handle both new format {success, data} and old format
}

export async function removerEscolaModalidade(id: number, metadados?: MetadadosHistoricoAlunos) {
  if (metadados && Object.keys(metadados).length > 0) {
    await apiWithRetry.delete(`/escola-modalidades/${id}`, { data: metadados });
    return;
  }

  await apiWithRetry.delete(`/escola-modalidades/${id}`);
}

export async function listarHistoricoAlunosModalidades(
  filtros: HistoricoAlunosModalidadesFiltros = {}
) {
  const { data } = await apiWithRetry.get(
    `/escola-modalidades/historico${buildQueryString(filtros)}`
  );
  return data.data || [];
}

export async function gerarRelatorioAlunosModalidades(
  filtros: RelatorioAlunosModalidadesFiltros = {}
) {
  const { data } = await apiWithRetry.get(
    `/escola-modalidades/relatorio-alunos${buildQueryString(filtros)}`
  );
  return data.data || data;
}

// Importar escolas em lote (sempre substitui existentes)
export async function importarEscolasLote(escolas: Array<Record<string, unknown>>) {
  // Usar timeout maior para importações grandes (5 minutos)
  const { data } = await apiWithRetry.post("/escolas/importar-lote", { escolas }, {
    timeout: 300000 // 5 minutos
  });
  clearEscolasCache();
  return data.data || data; // Handle both new format {success, data} and old format
}

// Exportar escolas com dados completos
export async function exportarEscolas() {
  const { data } = await apiWithRetry.get("/escolas");
  return data.data || []; // Return the actual array from the response
}
