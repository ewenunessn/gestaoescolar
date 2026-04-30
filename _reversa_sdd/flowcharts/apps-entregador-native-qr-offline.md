# Fluxo: App Entregador - QR, cache e offline

```mermaid
flowchart TD
  A["Home sem filtro"] --> B["Abrir QRScanner"]
  B --> C["Solicitar permissao de camera"]
  C --> D["Ler QR Code"]
  D --> E["normalizeQrFilter"]
  E -->|valido| F["Salvar filtro_qrcode no AsyncStorage"]
  E -->|invalido| X["Alert: QR invalido"]
  F --> G["Navegar para OpcoesFiltro"]
  G --> H["RotasScreen"]
  H --> I["Ler cache rotas/projecoes"]
  I --> J{"cache ausente ou stale?"}
  J -->|nao| K["Exibir rotas filtradas"]
  J -->|sim| L["GET /entregas/offline-bundle"]
  L -->|ok| M["applyDeliveryOfflineBundle"]
  L -->|erro| N["Fallback GET /entregas/rotas"]
  M --> O["Salvar rotas, escolas, itens e projecoes"]
  N --> O
  O --> K
```

## Evidencias

- `apps/entregador-native/src/components/QRScanner.tsx`
- `apps/entregador-native/src/utils/qrFilter.ts`
- `apps/entregador-native/src/screens/HomeScreen.tsx`
- `apps/entregador-native/src/screens/RotasScreen.tsx`
- `apps/entregador-native/src/services/deliveryOfflineBundle.ts`
- `apps/entregador-native/src/services/cacheService.ts`
