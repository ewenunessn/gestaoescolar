# Fluxo: App Entregador - sincronizacao, comprovante e foto

```mermaid
flowchart TD
  A["NetInfo detecta online"] --> B["Aguardar 3 segundos"]
  B --> C["syncPendingOperations"]
  C --> D["loadDeliveryOutboxOperations"]
  D --> E["getSyncableOperations sem historicoId"]
  E --> F["markOperationsSyncing"]
  F --> G["POST /entregas/itens/:itemId/confirmar"]
  G -->|ok sem comprovante| H["status synced"]
  G -->|ok com historico_id| I["status comprovante_pending"]
  G -->|erro| J["classifySyncError"]
  J --> K["failed_retryable ou failed_needs_action"]
  I --> L["Agrupar por batch/escola/responsaveis"]
  L --> M["POST /entregas/comprovantes"]
  M -->|sem foto| H
  M -->|com foto| N["status foto_pending"]
  N --> O["POST /foto/upload-url"]
  O --> P["PUT URL assinada"]
  P --> Q["POST /foto/confirmar"]
  Q --> H
  H --> R["Remover synced da fila ao salvar"]
  R --> S["GET /entregas/sync/mudancas"]
  S --> T["Atualizar caches e cursor delivery_sync_cursor"]
```

## Evidencias

- `apps/entregador-native/src/contexts/OfflineContext.tsx`
- `apps/entregador-native/src/services/deliveryOutboxCore.ts`
- `apps/entregador-native/src/services/deliveryPhotoUpload.ts`
- `apps/entregador-native/src/services/deliveryRemoteChanges.ts`
