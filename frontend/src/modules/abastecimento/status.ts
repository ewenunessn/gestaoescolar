export type FlowStepId =
  | "guia"
  | "compra"
  | "entrega"
  | "documentos";

export const ABASTECIMENTO_FLOW_STEPS = [
  {
    id: "guia",
    title: "Guias de Demanda",
    path: "/guias-demanda",
    description: "Revisar escolas, produtos, quantidades e status.",
  },
  {
    id: "compra",
    title: "Compras / Pedidos",
    path: "/compras",
    description: "Gerar e acompanhar pedidos vinculados as guias.",
  },
  {
    id: "entrega",
    title: "Entregas",
    path: "/entregas",
    description: "Executar entrega por guia, escola e rota.",
  },
  {
    id: "documentos",
    title: "Romaneio e Comprovantes",
    path: "/romaneio",
    description: "Emitir documentos e consultar comprovantes.",
  },
] as const;

export const ABASTECIMENTO_STATUS = {
  guia: {
    aberta: { label: "Em revisao", color: "warning" },
    fechada: { label: "Concluida", color: "success" },
    cancelada: { label: "Cancelada", color: "error" },
  },
  itemGuia: {
    pendente: { label: "Pendente", color: "warning" },
    programada: { label: "Programada", color: "info" },
    parcial: { label: "Parcial", color: "warning" },
    entregue: { label: "Entregue", color: "success" },
    cancelado: { label: "Cancelado", color: "error" },
  },
  pedido: {
    pendente: { label: "Pendente", color: "warning" },
    recebido_parcial: { label: "Recebido parcial", color: "info" },
    concluido: { label: "Concluido", color: "success" },
    suspenso: { label: "Suspenso", color: "secondary" },
    cancelado: { label: "Cancelado", color: "error" },
  },
} as const;

export function getAbastecimentoStatus(
  group: keyof typeof ABASTECIMENTO_STATUS,
  value: string | null | undefined,
) {
  const groupMap = ABASTECIMENTO_STATUS[group] as Record<string, { label: string; color: string }>;
  return groupMap[value || ""] ?? { label: value || "Sem status", color: "default" };
}
