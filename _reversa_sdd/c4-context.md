# C4 Contexto - gestaoescolar

```mermaid
flowchart LR
  Admin["Administrador / Secretaria"] -->|Opera cadastros, compras, estoque, entregas| Sistema["gestaoescolar / NutriLog"]
  Nutri["Nutricionista"] -->|Cardapios, preparacoes, ficha tecnica| Sistema
  Escola["Usuario da Escola"] -->|Portal escola: cardapio, solicitacoes, comprovantes| Sistema
  Entregador["Entregador"] -->|Rotas, QR, confirmacao offline, fotos| Sistema
  Gestor["Gestor Escolar Mobile"] -->|Estoque da escola por codigo de acesso| Sistema
  SysAdmin["System Admin"] -->|Instituicoes, usuarios, permissoes| Sistema

  Sistema -->|REST/JSON + JWT| API["API Express"]
  Sistema -->|PDF, Excel, QR, Codigo de barras| Docs["Documentos gerados"]
  API -->|SQL/SSL| DB["PostgreSQL / Neon"]
  API -->|Upload assinado / storage| Storage["Supabase Storage ou S3/R2 compativel"]
  API -->|Eventos/refresh| Realtime["Socket.IO / Realtime"]
  API -->|Deploy serverless| Vercel["Vercel"]
  Desktop["App Desktop Electron"] -->|Carrega SPA e backend local| Sistema
```

## Notas

- CONFIRMADO: usuarios e sistemas foram extraidos de inventario, rotas, apps mobile e Detective.
- CONFIRMADO: comunicacao principal e REST/JSON com JWT.
- INFERIDO: Storage pode ser Supabase ou S3/R2 compativel conforme codigo e historico Git.
