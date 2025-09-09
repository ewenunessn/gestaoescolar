// Utilitários de validação para recebimentos
export interface RecebimentoItemData {
  recebimento_id: number;
  produto_id: number;
  quantidade_pedida: number;
  quantidade_recebida: number;
  validade?: string;
  observacao?: string;
}

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function validateRecebimentoItem(data: any): RecebimentoItemData {
  const errors: string[] = [];

  // Validar recebimento_id
  if (!data.recebimento_id || typeof data.recebimento_id !== 'number') {
    errors.push('ID do recebimento é obrigatório e deve ser um número');
  }

  // Validar produto_id
  if (!data.produto_id || typeof data.produto_id !== 'number') {
    errors.push('ID do produto é obrigatório e deve ser um número');
  }

  // Validar quantidade_pedida
  if (data.quantidade_pedida === undefined || data.quantidade_pedida === null) {
    errors.push('Quantidade pedida é obrigatória');
  } else if (typeof data.quantidade_pedida !== 'number' || data.quantidade_pedida <= 0) {
    errors.push('Quantidade pedida deve ser um número positivo');
  }

  // Validar quantidade_recebida
  if (data.quantidade_recebida === undefined || data.quantidade_recebida === null) {
    errors.push('Quantidade recebida é obrigatória');
  } else if (typeof data.quantidade_recebida !== 'number' || data.quantidade_recebida < 0) {
    errors.push('Quantidade recebida deve ser um número não negativo');
  }

  // Validar validade (se fornecida)
  if (data.validade && typeof data.validade !== 'string') {
    errors.push('Data de validade deve ser uma string válida');
  }

  if (errors.length > 0) {
    throw new ValidationError(errors.join('; '));
  }

  return {
    recebimento_id: data.recebimento_id,
    produto_id: data.produto_id,
    quantidade_pedida: data.quantidade_pedida,
    quantidade_recebida: data.quantidade_recebida,
    validade: data.validade || null,
    observacao: data.observacao || ''
  };
}

export function validateQuantidades(quantidadePedida: number, quantidadeRecebida: number, totalJaRecebido: number = 0): void {
  if (totalJaRecebido + quantidadeRecebida > quantidadePedida) {
    throw new ValidationError(
      `Quantidade total recebida (${totalJaRecebido + quantidadeRecebida}) excede a quantidade pedida (${quantidadePedida})`
    );
  }
}