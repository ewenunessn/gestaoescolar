# Fluxo: App Entregador - recebimentos e estoque central

```mermaid
flowchart TD
  A["Home"] --> B["Recebimentos"]
  B --> C["GET /recebimentos/pedidos-pendentes"]
  C --> D["Selecionar pedido"]
  D --> E["GET /recebimentos/pedidos/:pedidoId/fornecedores"]
  E --> F["Selecionar fornecedor"]
  F --> G["GET /recebimentos/pedidos/:pedidoId/fornecedores/:fornecedorId/itens"]
  G --> H["Registrar quantidade/lote/datas/NF"]
  H --> I["POST /recebimentos/registrar"]
  I --> J["Recarregar itens"]

  A --> K["Estoque central"]
  K --> L["GET /estoque-central"]
  L --> M["Detalhes do produto"]
  M --> N["Entrada"]
  M --> O["Saida"]
  M --> P["Ajuste"]
  M --> Q["Transferencia"]
  N --> R["POST /estoque-central/entrada"]
  O --> S["POST /estoque-central/saida"]
  P --> T["POST /estoque-central/ajuste"]
  Q --> U["POST /estoque-central/transferencias"]
```

## Evidencias

- `apps/entregador-native/src/api/recebimentos.ts`
- `apps/entregador-native/src/screens/RecebimentosScreen.tsx`
- `apps/entregador-native/src/screens/RecebimentoFornecedoresScreen.tsx`
- `apps/entregador-native/src/screens/RecebimentoItensScreen.tsx`
- `apps/entregador-native/src/api/estoqueCentral.ts`
- `apps/entregador-native/src/screens/EstoqueCentralScreen.tsx`
- `apps/entregador-native/src/screens/EstoqueCentralEntradaScreen.tsx`
- `apps/entregador-native/src/screens/EstoqueCentralSaidaScreen.tsx`
- `apps/entregador-native/src/screens/EstoqueCentralAjusteScreen.tsx`
- `apps/entregador-native/src/screens/EstoqueCentralTransferenciaScreen.tsx`
