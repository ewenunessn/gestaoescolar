import type { StockEventInput } from "./estoqueLedgerService";

interface RecebimentoCentralInput {
  produto_id: number;
  quantidade: number;
  pedido_item_id: number;
}

interface TransferenciaParaEscolaInput {
  escola_id: number;
  produto_id: number;
  quantidade: number;
  guia_item_id: number;
}

export function buildRecebimentoCentralEvent(
  input: RecebimentoCentralInput,
): StockEventInput {
  return {
    escopo: "central",
    produto_id: Number(input.produto_id),
    tipo_evento: "recebimento_central",
    origem: "recebimento",
    quantidade_delta: Number(input.quantidade),
    referencia_tipo: "recebimento",
    referencia_id: Number(input.pedido_item_id),
  };
}

export function buildTransferenciaParaEscolaEvent(
  input: TransferenciaParaEscolaInput,
): StockEventInput {
  return {
    escopo: "escola",
    escola_id: Number(input.escola_id),
    produto_id: Number(input.produto_id),
    tipo_evento: "transferencia_para_escola",
    origem: "transferencia",
    quantidade_delta: Number(input.quantidade),
    referencia_tipo: "guia_produto_escola",
    referencia_id: Number(input.guia_item_id),
  };
}
