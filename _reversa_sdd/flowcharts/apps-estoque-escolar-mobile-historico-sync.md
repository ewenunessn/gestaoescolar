# Fluxo: App Estoque Escolar - historico e sync pendente

```mermaid
flowchart TD
  A["Historico tab"] --> B["carregarHistorico(reset=true)"]
  B --> C["GET /api/estoque-escola/escola/:id/historico?limit=10&offset=0"]
  C --> D["Aplicar filtros locais"]
  D --> E["Produto, periodo e tipo"]
  E --> F["FlatList paginada"]
  F --> G["onEndReached"]
  G --> H["Carregar proxima pagina"]

  I["useSyncManager.addToSync"] --> J["Salvar @sync_pending_items"]
  J --> K{"online?"}
  K -->|sim| L["syncPendingItems"]
  K -->|nao| M["Aguardar NetInfo/intervalo"]
  L --> N["apiService.movimentarEstoque"]
  N --> O["Remover sucesso ou max retries"]
  O --> P["Salvar @last_sync"]
```

## Evidencias

- `apps/estoque-escolar-mobile/src/screens/HistoricoScreen.tsx`
- `apps/estoque-escolar-mobile/src/hooks/useEstoque.ts`
- `apps/estoque-escolar-mobile/src/hooks/useSyncManager.ts`
