# Fluxo: App Estoque Escolar - login do gestor

```mermaid
flowchart TD
  A["App inicia"] --> B["AuthProvider.verificarSessao"]
  B --> C{"apiService.verificarSessao valida?"}
  C -->|sim| D["Set usuario normal/mock"]
  C -->|nao| E["obterSessaoGestor"]
  E --> F{"gestor_escola existe e nao expirou?"}
  F -->|sim| G["setToken(sessao.token)"]
  G --> H["Criar usuario Gestor - escola"]
  F -->|nao| I["LoginGestor"]
  I --> J["GET /api/gestor-escola/escolas"]
  J --> K["Selecionar escola"]
  K --> L["Informar codigo de 6 digitos"]
  L --> M["POST /api/gestor-escola/autenticar"]
  M -->|ok| N["Salvar auth_token e gestor_escola"]
  N --> H
  M -->|erro| O["Alert codigo invalido"]
  H --> P["MainTabs: Estoque e Historico"]
```

## Evidencias

- `apps/estoque-escolar-mobile/src/contexts/AuthContext.tsx`
- `apps/estoque-escolar-mobile/src/screens/LoginGestorScreen.tsx`
- `apps/estoque-escolar-mobile/src/services/gestorEscola.ts`
- `apps/estoque-escolar-mobile/src/services/api.ts`
