/**
 * Serviço de Conversão de Unidades de Medida
 * Baseado em como grandes ERPs gerenciam conversões
 */

import db from '../database';

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
 * Buscar unidade de medida por código ou ID
 */
export async function buscarUnidadeMedida(identificador: string | number): Promise<UnidadeMedida | null> {
  const query = typeof identificador === 'number'
    ? 'SELECT * FROM unidades_medida WHERE id = $1 AND ativo = true'
    : 'SELECT * FROM unidades_medida WHERE UPPER(codigo) = UPPER($1) AND ativo = true';
  
  const result = await db.query(query, [identificador]);
  return result.rows[0] || null;
}

/**
 * Listar todas as unidades de medida
 */
export async function listarUnidadesMedida(tipo?: string): Promise<UnidadeMedida[]> {
  let query = 'SELECT * FROM unidades_medida WHERE ativo = true';
  const params: any[] = [];
  
  if (tipo) {
    query += ' AND tipo = $1';
    params.push(tipo);
  }
  
  query += ' ORDER BY tipo, codigo';
  
  const result = await db.query(query, params);
  return result.rows;
}

/**
 * Converter quantidade de uma unidade para outra
 * 
 * @param quantidade - Quantidade a converter
 * @param unidadeOrigemId - ID da unidade de origem
 * @param unidadeDestinoId - ID da unidade de destino
 * @param pesoEmbalagem - Peso da embalagem (para unidades como CX, PCT que variam)
 * @returns Quantidade convertida
 * 
 * @example
 * // Converter 2 kg para gramas
 * await converterUnidade(2, idKG, idG) // retorna 2000
 * 
 * // Converter 1 caixa de 5kg para kg
 * await converterUnidade(1, idCX, idKG, 5000) // retorna 5
 */
export async function converterUnidade(
  quantidade: number,
  unidadeOrigemId: number,
  unidadeDestinoId: number,
  pesoEmbalagem?: number
): Promise<number> {
  // Se as unidades são iguais, não precisa converter
  if (unidadeOrigemId === unidadeDestinoId) {
    return quantidade;
  }

  // Buscar informações das unidades
  const [origem, destino] = await Promise.all([
    buscarUnidadeMedida(unidadeOrigemId),
    buscarUnidadeMedida(unidadeDestinoId)
  ]);

  if (!origem || !destino) {
    throw new Error('Unidade de medida não encontrada');
  }

  // Verificar se são do mesmo tipo
  if (origem.tipo !== destino.tipo) {
    throw new Error(`Não é possível converter ${origem.tipo} para ${destino.tipo}`);
  }

  // CASO 1: Conversão entre unidades com fator fixo (KG, G, L, ML, etc)
  if (origem.fator_conversao_base && destino.fator_conversao_base) {
    // Converter para unidade base, depois para unidade destino
    const quantidadeBase = quantidade * origem.fator_conversao_base;
    const quantidadeDestino = quantidadeBase / destino.fator_conversao_base;
    return quantidadeDestino;
  }

  // CASO 2: Conversão envolvendo embalagens (CX, PCT, SC, etc)
  // Precisa do peso da embalagem
  if (!pesoEmbalagem) {
    throw new Error('Peso da embalagem é necessário para converter unidades de embalagem');
  }

  // Se origem é embalagem e destino tem fator fixo
  if (!origem.fator_conversao_base && destino.fator_conversao_base) {
    // Ex: 1 caixa de 5000g para kg
    // quantidade * peso_embalagem / fator_destino
    return (quantidade * pesoEmbalagem) / destino.fator_conversao_base;
  }

  // Se origem tem fator fixo e destino é embalagem
  if (origem.fator_conversao_base && !destino.fator_conversao_base) {
    // Ex: 5 kg para caixas de 5000g
    // (quantidade * fator_origem) / peso_embalagem
    return (quantidade * origem.fator_conversao_base) / pesoEmbalagem;
  }

  // Se ambas são embalagens (raro, mas possível)
  // Não faz sentido converter caixa para pacote sem mais contexto
  throw new Error('Conversão entre embalagens requer mais informações');
}

/**
 * Calcular fator de conversão entre duas unidades
 * Usado para preencher o campo fator_conversao em contrato_produtos
 * 
 * @param unidadeOrigemId - ID da unidade de origem (distribuição)
 * @param unidadeDestinoId - ID da unidade de destino (compra)
 * @param pesoEmbalagem - Peso da embalagem de compra em gramas
 * @param pesoProduto - Peso do produto em gramas
 * @returns Fator de conversão
 */
export async function calcularFatorConversao(
  unidadeOrigemId: number,
  unidadeDestinoId: number,
  pesoEmbalagem?: number,
  pesoProduto?: number
): Promise<number> {
  // Se as unidades são iguais, fator = 1
  if (unidadeOrigemId === unidadeDestinoId) {
    return 1;
  }

  const [origem, destino] = await Promise.all([
    buscarUnidadeMedida(unidadeOrigemId),
    buscarUnidadeMedida(unidadeDestinoId)
  ]);

  if (!origem || !destino) {
    throw new Error('Unidade de medida não encontrada');
  }

  if (origem.tipo !== destino.tipo) {
    throw new Error(`Não é possível converter ${origem.tipo} para ${destino.tipo}`);
  }

  // Conversão com fatores fixos
  if (origem.fator_conversao_base && destino.fator_conversao_base) {
    return destino.fator_conversao_base / origem.fator_conversao_base;
  }

  // Conversão com embalagens
  if (pesoEmbalagem && pesoProduto && pesoProduto > 0) {
    return pesoEmbalagem / pesoProduto;
  }

  // Padrão
  return 1;
}

/**
 * Normalizar nome de unidade para código
 * Útil para migração de dados antigos
 */
export async function normalizarUnidade(nomeUnidade: string): Promise<string | null> {
  const mapeamento: Record<string, string> = {
    'quilograma': 'KG',
    'kg': 'KG',
    'grama': 'G',
    'g': 'G',
    'litro': 'L',
    'l': 'L',
    'mililitro': 'ML',
    'ml': 'ML',
    'unidade': 'UN',
    'un': 'UN',
    'dúzia': 'DZ',
    'duzia': 'DZ',
    'caixa': 'CX',
    'cx': 'CX',
    'pacote': 'PCT',
    'pct': 'PCT',
    'fardo': 'FD',
    'saco': 'SC',
    'lata': 'LT',
    'galão': 'GL',
    'galao': 'GL',
    'bandeja': 'BD',
    'maço': 'MC',
    'maco': 'MC',
    'pote': 'PT',
    'vidro': 'VD',
    'sachê': 'SH',
    'sache': 'SH',
    'balde': 'BL',
  };

  const normalizado = nomeUnidade.toLowerCase().trim();
  return mapeamento[normalizado] || null;
}
