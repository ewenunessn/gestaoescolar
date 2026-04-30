# Fluxo: App Entregador - confirmacao de entrega

```mermaid
flowchart TD
  A["RotaDetalhe"] --> B["Selecionar escola"]
  B --> C["EscolaDetalhe carrega cache_itens_escola"]
  C --> D{"cache stale?"}
  D -->|sim| E["GET /entregas/escolas/:id/itens"]
  D -->|nao| F["Mesclar itens com offline_queue"]
  E --> G["saveSchoolItemsSnapshot"]
  G --> F
  F --> H["Operador seleciona itens e quantidades"]
  H --> I{"quantidade parcial/diferente?"}
  I -->|sim| J["Alert de confirmacao"]
  I -->|nao| K["Tela de revisao"]
  J --> K
  K --> L["Validar entregador, recebedor e foto"]
  L --> M["Capturar foto via expo-camera"]
  M --> N["Persistir foto em documentDirectory/delivery-photos"]
  N --> O["Criar batch_id e client_operation_id por item"]
  O --> P["enqueueDeliveryOperation em offline_queue"]
  P --> Q["Atualizar cache local e projecoes"]
  Q --> R["Se online, chamar syncPendingOperations"]
  R --> S["Tela de sucesso e voltar"]
```

## Evidencias

- `apps/entregador-native/src/screens/EscolaDetalheScreen.tsx`
- `apps/entregador-native/src/services/deliveryOutbox.ts`
- `apps/entregador-native/src/services/deliveryOutboxCore.ts`
- `apps/entregador-native/src/services/deliveryPhotoLocalFile.ts`
- `apps/entregador-native/src/services/deliveryPhotoReview.ts`
