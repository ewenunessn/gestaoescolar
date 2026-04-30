export const CANONICAL_PERMISSION_SLUGS = {
  compras: "compras",
  guias: "guias",
  faturamentos: "faturamentos",
  refeicoes: "refeicoes",
} as const;

export const ROUTE_PERMISSION_SLUGS = {
  compras: CANONICAL_PERMISSION_SLUGS.compras,
  guiasDemanda: CANONICAL_PERMISSION_SLUGS.guias,
  faturamentos: CANONICAL_PERMISSION_SLUGS.faturamentos,
  preparacoes: CANONICAL_PERMISSION_SLUGS.refeicoes,
  portalEscola: "portal_escola",
} as const;
