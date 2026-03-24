import api from './api';

export interface UnidadeMedida {
  id: number;
  codigo: string;
  nome: string;
  tipo: 'massa' | 'volume' | 'unidade';
  unidade_base_id: number | null;
  fator_conversao_base: number;
  ativo: boolean;
}

/**
 * Listar todas as unidades de medida
 */
export async function listarUnidadesMedida(tipo?: string): Promise<UnidadeMedida[]> {
  const params = tipo ? { tipo } : {};
  const response = await api.get('/unidades-medida', { params });
  return response.data.data;
}

/**
 * Buscar unidade por código ou ID
 */
export async function buscarUnidadeMedida(identificador: string | number): Promise<UnidadeMedida> {
  const response = await api.get(`/unidades-medida/${identificador}`);
  return response.data.data;
}

/**
 * Converter quantidade entre unidades
 */
export async function converterUnidades(
  quantidade: number,
  unidadeOrigemId: number,
  unidadeDestinoId: number,
  pesoEmbalagem?: number
): Promise<number> {
  const response = await api.post('/unidades-medida/converter', {
    quantidade,
    unidadeOrigemId,
    unidadeDestinoId,
    pesoEmbalagem
  });
  return response.data.data.quantidadeConvertida;
}

/**
 * Calcular fator de conversão entre unidades
 */
export async function calcularFatorConversao(
  unidadeOrigemId: number,
  unidadeDestinoId: number,
  pesoEmbalagem?: number,
  pesoProduto?: number
): Promise<number> {
  const response = await api.post('/unidades-medida/calcular-fator', {
    unidadeOrigemId,
    unidadeDestinoId,
    pesoEmbalagem,
    pesoProduto
  });
  return response.data.data.fatorConversao;
}

/**
 * Agrupar unidades por tipo para exibição em dropdowns
 */
export function agruparUnidadesPorTipo(unidades: UnidadeMedida[]) {
  const grupos: Record<string, UnidadeMedida[]> = {
    massa: [],
    volume: [],
    unidade: []
  };
  
  unidades.forEach(u => {
    if (grupos[u.tipo]) {
      grupos[u.tipo].push(u);
    }
  });
  
  return grupos;
}

/**
 * Formatar unidade para exibição
 */
export function formatarUnidade(unidade: UnidadeMedida): string {
  return `${unidade.nome} (${unidade.codigo})`;
}
