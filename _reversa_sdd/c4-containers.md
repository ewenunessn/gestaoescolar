# C4 Containers - gestaoescolar

```mermaid
flowchart TB
  subgraph Usuarios
    Admin["Admin / Secretaria"]
    Escola["Usuario Escola"]
    Entregador["Entregador"]
    Gestor["Gestor Mobile"]
  end

  subgraph Aplicacoes
    Web["Frontend React/Vite\nMUI, Router, TanStack"]
    MobileEntrega["Expo Entregador\nOffline outbox, Camera, QR"]
    MobileEstoque["Expo Estoque Escolar\nAsyncStorage, Tabs"]
    Electron["Electron Desktop\nmain/preload/downloads"]
  end

  subgraph Backend
    API["API Express TypeScript\nroutes/controllers/services"]
    Auth["Auth/RBAC\nJWT + permissoes"]
    Jobs["Jobs de geracao\nGuias/Compras"]
    Realtime["Realtime Events\nSocket.IO/refresh"]
  end

  subgraph Dados
    Postgres["PostgreSQL / Neon\nschema + migrations"]
    Cache["Cache/Redis\nuso parcial/inferido"]
    Storage["Supabase/S3/R2\nfotos comprovantes"]
    LocalStores["AsyncStorage / LocalStorage\noutbox e sessoes"]
  end

  Admin --> Web
  Escola --> Web
  Entregador --> MobileEntrega
  Gestor --> MobileEstoque
  Electron --> Web
  Electron --> API

  Web -->|Axios REST + JWT| API
  MobileEntrega -->|Axios/fetch REST + JWT| API
  MobileEstoque -->|fetch REST + token/codigo| API
  API --> Auth
  API --> Jobs
  API --> Realtime
  API --> Postgres
  API --> Cache
  API --> Storage
  Web --> LocalStores
  MobileEntrega --> LocalStores
  MobileEstoque --> LocalStores
```

## Containers confirmados

| Container | Porta/URL conhecida | Observacao |
| --- | --- | --- |
| Frontend dev | `127.0.0.1:5173` no desktop dev | Vite |
| Backend dev | `localhost:3000` fallback | Express |
| Backend desktop | `127.0.0.1:3131` padrao | Electron empacotado |
| Backend producao mobile | `https://gestaoescolar-backend.vercel.app` em apps | URL hardcoded em partes |
| Banco | `DATABASE_URL`/`POSTGRES_URL`/`NEON_DATABASE_URL` | SSL remoto verify-full |
