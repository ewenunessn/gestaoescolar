# C4 Componentes - gestaoescolar

## API Express

```mermaid
flowchart TB
  Router["registerApiRoutes.ts"] --> Auth["authMiddleware\nJWT"]
  Router --> Perm["permissionMiddleware\nRBAC 0..3"]
  Router --> Usuarios["usuarios/admin"]
  Router --> Sistema["sistema\npermissoes, periodos, calendario, notificacoes, realtime"]
  Router --> Escolas["escolas / portal"]
  Router --> Nutricao["cardapios, refeicoes, nutricionistas, TACO"]
  Router --> Produtos["produtos, unidades, produto-modalidades"]
  Router --> Contratos["fornecedores, contratos, saldos"]
  Router --> Guias["guias, demandas, geracao async"]
  Router --> Compras["compras, planejamento, programacoes"]
  Router --> Estoque["estoque central/escolar, ledger, lotes"]
  Router --> Entregas["entregas, rotas, comprovantes, fotos"]
  Router --> Recebimentos["recebimentos"]
  Router --> Faturamentos["faturamentos"]

  Usuarios --> DB["db.query / transaction"]
  Sistema --> DB
  Escolas --> DB
  Nutricao --> DB
  Produtos --> DB
  Contratos --> DB
  Guias --> DB
  Compras --> DB
  Estoque --> DB
  Entregas --> DB
  Recebimentos --> DB
  Faturamentos --> DB
  Entregas --> Storage["photo storage / signed upload"]
  Sistema --> Events["realtimeEvents"]
```

## Frontend React

```mermaid
flowchart TB
  App["App.tsx"] --> Router["AppRouter.tsx"]
  Router --> Private["PrivateRoute/PublicRoute"]
  Router --> Guard["PermissionGuard"]
  Guard --> PermHook["useUserPermissions"]
  Guard --> RoleHook["useUserRole"]
  Router --> Layout["AppShellLayout"]

  Layout --> Modules["Modulos lazy-loaded"]
  Modules --> Abastecimento["abastecimento"]
  Modules --> Cardapios["cardapios/nutricao"]
  Modules --> Compras["compras/programacao/faturamento"]
  Modules --> Estoque["estoque"]
  Modules --> Entregas["entregas/romaneio/comprovantes"]
  Modules --> Portal["portal-escola"]
  Modules --> Sistema["sistema/usuarios/periodos"]

  Modules --> Api["services/api.ts\nAxios + retry"]
  Api --> Backend["API REST"]
  Modules --> Pdfs["PDF/Excel/QR/Barcode"]
  Layout --> DesktopShell["window.desktopShell\nquando Electron"]
```

## App Entregador

```mermaid
flowchart TB
  AppEntrega["App.tsx Stack Navigator"] --> Screens["Login, Rotas, RotaDetalhe, EscolaDetalhe, Comprovantes, Romaneio"]
  Screens --> ApiRotas["api/rotas.ts"]
  Screens --> Offline["OfflineContext"]
  Offline --> Outbox["deliveryOutboxCore\nstatus + retry"]
  Offline --> Cache["cacheService\nAsyncStorage"]
  Screens --> QR["QRScanner / qrFilter"]
  Screens --> Photo["deliveryPhotoUpload"]
  ApiRotas --> Backend["API REST"]
  Outbox --> Backend
  Photo --> Storage["Signed upload URL"]
```

## Desktop

```mermaid
flowchart TB
  Main["main.cjs"] --> Window["BrowserWindow"]
  Main --> BackendSvc["backend-service.cjs"]
  Main --> Downloads["downloads.cjs"]
  Main --> Actions["window-actions.cjs"]
  Main --> Appearance["window-appearance.cjs"]
  Preload["preload.cjs"] --> DesktopShell["window.desktopShell"]
  BackendSvc --> LocalBackend["backend/dist/index.js ou backend/src/index.ts"]
  Window --> Renderer["frontend/dist ou Vite dev"]
  DesktopShell --> Downloads
  DesktopShell --> Actions
  DesktopShell --> Appearance
```

## Duvidas tecnicas

- LACUNA: rotas de alguns modulos usam slugs diferentes entre frontend/backend.
- LACUNA: `shared` nao esta conectado ativamente aos containers.
- LACUNA: apps mobile misturam Axios/fetch e URLs fixas.
- LACUNA: cobertura de testes e irregular entre modulos criticos.
