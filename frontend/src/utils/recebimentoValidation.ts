export interface ItemConferido {
  id: number;
  produto_id: number;
  quantidade_pedida: number;
  quantidade_recebida: number;
  observacoes?: string;
  conferido: boolean;
}

export interface RecebimentoData {
  id: number;
  pedido_id: number;
  status: 'EM_ANDAMENTO' | 'FINALIZADO' | 'CANCELADO';
  itens: ItemConferido[];
  observacoes?: string;
}

export function validateItemConferido(item: ItemConferido): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!item.produto_id) {
    errors.push('Produto é obrigatório');
  }

  if (item.quantidade_recebida < 0) {
    errors.push('Quantidade recebida não pode ser negativa');
  }

  if (item.quantidade_recebida > item.quantidade_pedida * 1.1) {
    errors.push('Quantidade recebida não pode exceder 110% da quantidade pedida');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function validateRecebimento(recebimento: RecebimentoData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!recebimento.pedido_id) {
    errors.push('ID do pedido é obrigatório');
  }

  if (!recebimento.itens || recebimento.itens.length === 0) {
    errors.push('Pelo menos um item deve ser conferido');
  }

  // Validar cada item
  recebimento.itens?.forEach((item, index) => {
    const itemValidation = validateItemConferido(item);
    if (!itemValidation.valid) {
      errors.push(`Item ${index + 1}: ${itemValidation.errors.join(', ')}`);
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

export function formatarDadosItem(item: ItemConferido): ItemConferido {
  return {
    ...item,
    quantidade_recebida: Number(item.quantidade_recebida) || 0,
    quantidade_pedida: Number(item.quantidade_pedida) || 0,
    observacoes: item.observacoes?.trim() || undefined
  };
}