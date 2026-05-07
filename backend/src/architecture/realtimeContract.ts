export interface RealtimeContract {
  module: string;
  emits: string[];
  transport: "sse" | "http-bff";
}

export const REALTIME_CONTRACTS: RealtimeContract[] = [
  {
    module: "entregas",
    emits: ["entregas.updated", "estoque_escolar.updated"],
    transport: "sse",
  },
  {
    module: "estoque",
    emits: ["estoque_central.updated", "estoque_escolar.updated"],
    transport: "sse",
  },
  {
    module: "compras",
    emits: ["compras.updated", "guias.updated"],
    transport: "sse",
  },
  {
    module: "solicitacoes",
    emits: ["solicitacoes_alimentos.updated"],
    transport: "sse",
  },
  {
    module: "chatbot",
    emits: ["chatbot.message.received", "chatbot.message.reply"],
    transport: "http-bff",
  },
  {
    module: "notificacoes",
    emits: ["notificacoes.created", "notificacoes.read"],
    transport: "sse",
  },
];

export function getRealtimeContract(moduleName: string): RealtimeContract | undefined {
  const contract = REALTIME_CONTRACTS.find((item) => item.module === moduleName);
  return contract
    ? {
        ...contract,
        emits: [...contract.emits],
      }
    : undefined;
}
