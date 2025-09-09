// Tipos globais para resolver problemas de compatibilidade

declare global {
  interface Window {
    // Adicionar propriedades do window se necessário
  }
}

// Tipos para componentes de detalhes de pedido
export interface PedidoDetalhesProps {
  pedido: any;
  produtosPedido: any[];
  onPedidoAtualizado: () => void;
  onError: () => void;
  onSuccess: () => void;
  loading: boolean;
}

// Tipos para ações pendentes
export interface PendingAction {
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

// Tipos para status de fornecedor
export interface FornecedorStatus {
  [key: number]: {
    fornecedor: {
      id: number;
      nome: string;
      status: string;
    };
    itens: any[];
    resumo: any;
  };
}

export {};