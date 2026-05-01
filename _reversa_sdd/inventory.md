# Inventario do Projeto - gestaoescolar

Gerado pelo Reversa Scout em 2026-04-29.

## Resumo Executivo

- Projeto: `gestaoescolar`
- Tipo: monorepo JavaScript/TypeScript para gestao de alimentacao escolar.
- Linguagem principal: TypeScript.
- Aplicacoes identificadas:
  - `frontend`: SPA React com Vite e Material UI.
  - `backend`: API Node.js/Express em TypeScript.
  - `desktop`: shell Electron para empacotamento desktop.
  - `apps/entregador-native`: unico app mobile em uso operacional/producao.
  - `apps/estoque-escolar-mobile`: app Expo/React Native legado, descontinuado para uso operacional.
  - `shared`: pacote de tipos compartilhados.

## Estado dos apps mobile

- ATIVO: `apps/entregador-native` e o unico app mobile utilizado no sistema.
- DESCONTINUADO: `apps/estoque-escolar-mobile` deve ser tratado apenas como legado/documentacao historica. Nao deve orientar novas implementacoes, testes de producao ou prioridades de hardening, salvo decisao explicita de reativacao.

## Estrutura de Pastas

Diretorios de topo relevantes encontrados, excluindo `node_modules`, `.git`, `.reversa`, `_reversa_sdd`, `dist`, `build`, `coverage`, `__pycache__`, `.cache` e `.worktrees`:

- `.agents`: skills e instrucoes de agentes.
- `.claude`, `.kiro`, `.openclaude`, `.qwen`: configuracoes de agentes/IDEs.
- `.github/workflows`: CI.
- `.vercel`: metadados de deploy Vercel.
- `.vscode`: configuracoes locais de editor.
- `apps`: aplicacoes mobile.
- `backend`: API, modulos de dominio, migrations, scripts e testes backend.
- `desktop`: processo Electron, preload, helpers e testes desktop.
- `docs`: documentacao operacional, arquitetura, incidentes e planos/specs.
- `frontend`: aplicacao React/Vite.
- `release`: artefatos de empacotamento desktop.
- `scripts`: scripts auxiliares de setup, teste, deploy e debug.
- `shared`: tipos compartilhados.

## Linguagens e Contagem por Extensao

Total de arquivos inventariados: 1277.

| Extensao | Arquivos | Observacao |
| --- | ---: | --- |
| `.ts` | 409 | TypeScript backend, shared, mobile e testes |
| `.js` | 340 | scripts, migrations, configuracoes e utilitarios |
| `.tsx` | 208 | React/React Native |
| `.sql` | 172 | migrations, DDL e scripts de banco |
| `.md` | 36 | documentacao |
| `.json` | 23 | package/config manifests |
| `.webp` | 15 | assets Android/mobile |
| `.png` | 13 | assets |
| `.xml` | 10 | Android resources |
| `.cjs` | 10 | Electron e testes desktop |
| `.css` | 6 | estilos frontend |
| `.txt` | 5 | saidas/relatorios locais |
| `.bak` | 4 | backups de migrations |
| `.sh` | 4 | scripts shell |
| `.svg` | 4 | logos/assets |
| `.gradle` | 3 | Android Gradle |
| sem extensao | 3 | scripts/arquivos auxiliares |
| `.ps1` | 2 | scripts PowerShell |
| `.kt` | 2 | Android Kotlin |
| `.properties` | 2 | Android/Gradle |
| outros | 6 | `.http`, `.html`, `.pro`, `.jar`, `.keystore`, `.bat` |

## Modulos Identificados

### Backend (`backend/src/modules`)

- `cardapios`
- `compras`
- `contratos`
- `demandas`
- `entregas`
- `escolas`
- `estoque`
- `faturamentos`
- `guias`
- `nutricao`
- `produtos`
- `recebimentos`
- `sistema`
- `solicitacoes`
- `unidades`
- `usuarios`

### Frontend (`frontend/src/modules`)

- `abastecimento`
- `cardapios`
- `compras`
- `contratos`
- `demandas`
- `entregas`
- `escolas`
- `estoque`
- `faturamento`
- `fornecedores`
- `nutricao`
- `portal-escola`
- `produtos`
- `programacao`
- `rotas`
- `sistema`
- `solicitacoes`

### Mobile (`apps`)

- `entregador-native` - ativo.
- `estoque-escolar-mobile` - descontinuado/legado.

## Entry Points

- `package.json`: monorepo raiz, scripts desktop e workspaces `backend` e `shared`.
- `desktop/main.cjs`: processo principal Electron.
- `desktop/preload.cjs`: preload Electron.
- `backend/src/index.ts`: inicializacao da API Express, middlewares, health check, bootstrap de tabelas e registro de rotas.
- `backend/src/routes/registerApiRoutes.ts`: montagem dos endpoints `/api/*`.
- `frontend/src/main.tsx`: entrada do React/Vite.
- `frontend/src/App.tsx`: componente raiz do frontend.
- `frontend/src/routes/AppRouter.tsx`: rotas, lazy loading e protecao de telas.
- `apps/entregador-native/App.tsx`: entrada do app mobile de entregas.
- `apps/entregador-native/index.ts`: entrypoint Expo/React Native.
- `apps/estoque-escolar-mobile/App.tsx`: entrada do app mobile de estoque legado/descontinuado.
- `apps/estoque-escolar-mobile/index.ts`: entrypoint Expo/React Native legado/descontinuado.
- `shared/types/index.ts`: pacote de tipos compartilhados.

## Configuracoes Relevantes

- `package.json`, `package-lock.json`
- `backend/package.json`, `backend/package-lock.json`, `backend/tsconfig.json`, `backend/vercel.json`
- `frontend/package.json`, `frontend/package-lock.json`, `frontend/tsconfig.json`, `frontend/vite.config.ts`, `frontend/vitest.config.ts`, `frontend/vercel.json`
- `shared/package.json`, `shared/tsconfig.json`
- `apps/entregador-native/package.json`, `apps/entregador-native/app.json`, `apps/entregador-native/tsconfig.json`, `apps/entregador-native/babel.config.js`
- `apps/estoque-escolar-mobile/package.json`, `apps/estoque-escolar-mobile/app.json`, `apps/estoque-escolar-mobile/eas.json`, `apps/estoque-escolar-mobile/tsconfig.json`, `apps/estoque-escolar-mobile/metro.config.js`, `apps/estoque-escolar-mobile/babel.config.js`
- `app.json`, `eas.json`
- `.github/workflows/ci.yml`

## CI/CD e Deploy

- GitHub Actions em `.github/workflows/ci.yml`.
- O CI executa checagem TypeScript para backend e frontend, alem de lint no frontend.
- Configuracoes Vercel encontradas em `backend/vercel.json` e `frontend/vercel.json`.
- Scripts de deploy e verificacao Vercel encontrados em `scripts/vercel/` e `docs/deploy/vercel/`.
- Nao foram encontrados `Dockerfile` ou `docker-compose` no inventario util.

## Banco de Dados - Indicios Superficiais

O projeto contem forte presenca de SQL, migrations e modelos:

- `backend/database/schema.sql`
- `backend/database/setup-local.sql`
- `backend/migrations/`
- `backend/src/migrations/`
- `backend/src/database/migrations/`
- `backend/src/database.ts`
- `backend/src/database-vercel.ts`
- modelos em `backend/src/modules/*/models/`

Tecnologias inferidas superficialmente:

- PostgreSQL via pacote `pg`.
- Neon mencionado em scripts e nomes de comandos.
- Supabase client presente no backend.
- Migrations SQL e scripts JS/TS coexistem.

A analise detalhada de tabelas, relacionamentos, constraints, triggers e procedures deve ficar com o `reversa-data-master`.

## Testes

- Arquivos de teste estimados: 51 (`*.test.*` ou `*.spec.*`).
- Frameworks detectados:
  - Backend: Jest, ts-jest, Supertest.
  - Frontend: Vitest, Testing Library, jsdom.
  - Desktop: Node test runner (`node --test`).
  - Mobile: testes TypeScript pontuais com `tsx --test` em servicos.

## Observacoes de Superficie

- O projeto parece organizado por dominio em backend e frontend, com correspondencia parcial entre modulos.
- Ha grande volume de scripts operacionais e migrations historicas no backend, indicando evolucao incremental do schema.
- A aplicacao desktop empacota frontend e backend via Electron.
- Ha dois apps mobile separados: um focado em entregas e outro em estoque escolar.
- O repositorio contem artefatos de agentes e documentacao de planos anteriores, mas esses nao foram tratados como codigo legado principal.
