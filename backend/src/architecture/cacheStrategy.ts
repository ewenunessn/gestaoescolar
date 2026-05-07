export type CacheTtl = number | "token-expiration";

export interface CacheStrategy {
  caches: string;
  ttlSeconds: CacheTtl;
  invalidatesOn: string[];
}

export const CACHE_STRATEGY_BY_MODULE: Record<string, CacheStrategy> = {
  cardapios: {
    caches: "Listas e refeicoes de cardapios ativos",
    ttlSeconds: 10 * 60,
    invalidatesOn: ["cardapios.write", "refeicoes.write"],
  },
  estoque: {
    caches: "Quantidades disponiveis e projecoes por item/escola",
    ttlSeconds: 2 * 60,
    invalidatesOn: ["estoque.write", "entregas.confirmed", "recebimentos.write"],
  },
  dashboard: {
    caches: "Metricas agregadas por cliente BFF",
    ttlSeconds: 5 * 60,
    invalidatesOn: ["estoque.write", "entregas.write", "faturamentos.write", "solicitacoes.write"],
  },
  auth: {
    caches: "Blacklist de tokens e permissoes por usuario",
    ttlSeconds: "token-expiration",
    invalidatesOn: ["auth.logout", "usuarios.permissions.write"],
  },
  nutricao: {
    caches: "Tabela nutricional e composicao por item",
    ttlSeconds: 60 * 60,
    invalidatesOn: ["nutricao.write", "produtos.composicao.write"],
  },
};

export function getCacheStrategy(moduleName: string): CacheStrategy | undefined {
  const strategy = CACHE_STRATEGY_BY_MODULE[moduleName];
  return strategy
    ? {
        ...strategy,
        invalidatesOn: [...strategy.invalidatesOn],
      }
    : undefined;
}
