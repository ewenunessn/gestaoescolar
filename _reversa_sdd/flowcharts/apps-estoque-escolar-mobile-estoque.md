# Fluxo: App Estoque Escolar - consulta e movimentacao

```mermaid
flowchart TD
  A["MainTabs/Estoque"] --> B["useEstoque resolve escolaId"]
  B --> C["GET /api/estoque-escola/escola/:escolaId"]
  C --> D["Para cada produto: GET /api/estoque-escola/produtos/:produtoId/lotes"]
  D --> E["Calcular validade, status e flags"]
  E --> F["Exibir resumo e lista"]
  F --> G["Buscar/filtrar/ordenar"]
  F --> H["Abrir detalhes"]
  H --> I{"acao"}
  I -->|entrada simples| J["POST /api/estoque-escola/escola/:id/movimentacao"]
  I -->|saida inteligente| K["POST /api/estoque-escola/escola/:id/movimentacao-lotes"]
  I -->|ajuste| L["processarMovimentacaoLotes"]
  J --> M["refresh"]
  K --> M
  L --> M
```

## Evidencias

- `apps/estoque-escolar-mobile/src/hooks/useEstoque.ts`
- `apps/estoque-escolar-mobile/src/services/api.ts`
- `apps/estoque-escolar-mobile/src/screens/EstoqueScreen.tsx`
- `apps/estoque-escolar-mobile/src/components/ModalEntradaSimples.tsx`
- `apps/estoque-escolar-mobile/src/components/ModalSaidaInteligente.tsx`
- `apps/estoque-escolar-mobile/src/components/ModalLotesValidade.tsx`
