# Arquitetura - gestaoescolar

Gerado pelo Reversa Architect em 2026-04-29.

## Visao geral

`gestaoescolar` e um monorepo TypeScript para gestao de alimentacao escolar. O sistema combina:

- SPA React/Vite para operacao administrativa e portal escola.
- API Node.js/Express modularizada por dominio.
- PostgreSQL como banco principal, com suporte a Neon/Vercel e banco local.
- App Expo/React Native ativo para entrega em campo; o app de estoque escolar existe apenas como legado descontinuado.
- Shell Electron para distribuicao desktop com frontend e backend local empacotado.
- Pacote `shared` de tipos TypeScript, hoje pouco integrado ao codigo ativo.

Confianca: CONFIRMADO por inventario, dependencias e analise de modulos.

## Principais responsabilidades

| Area | Responsabilidade | Containers/componentes |
| --- | --- | --- |
| Operacao administrativa | Cadastros, cardapios, compras, estoque, entregas, faturamento, RBAC | `frontend`, `backend` |
| Portal escola | Cardapios, solicitacoes, comprovantes e alunos por escola | `frontend`, `backend` |
| Entrega em campo | Rotas, QR de romaneio, confirmacao offline, comprovantes e fotos | `apps/entregador-native`, `backend` |
| Estoque escolar mobile | Legado descontinuado; nao usado em producao | `apps/estoque-escolar-mobile` |
| Desktop | Janela nativa, downloads, logs, backend local | `desktop`, `frontend`, `backend` |
| Persistencia | Dados relacionais, ledger de estoque, sessoes/permissoes | PostgreSQL |
| Arquivos/documentos | PDFs, Excel, fotos de comprovante, uploads assinados | Frontend/backend/Supabase ou S3 compativel |

## Estilo arquitetural

- Monorepo modular por dominio.
- Backend em arquitetura MVC/service por modulos (`controllers`, `models`, `routes`, `services`).
- Frontend React com rotas lazy-loaded, guards por permissao e servicos Axios.
- Comunicacao principal via REST JSON.
- Sincronizacao offline mobile baseada em outbox local e endpoints idempotentes.
- Banco relacional como fonte de verdade; ledger de estoque para auditoria/eventos.

## Containers

| Container | Tecnologia | Entrada | Funcao |
| --- | --- | --- | --- |
| Web Admin/Portal | React 18, Vite, MUI, TanStack Query | `frontend/src/main.tsx`, `AppRouter.tsx` | UI administrativa e portal escola |
| API | Express 4, TypeScript, pg, JWT | `backend/src/index.ts`, `registerApiRoutes.ts` | REST API, regras de negocio e integracoes |
| Banco | PostgreSQL/Neon/local | `DATABASE_URL`, `POSTGRES_URL`, `NEON_DATABASE_URL` | Persistencia relacional |
| App Entregador | Expo 51, RN 0.74 | `apps/entregador-native/App.tsx` | Operacao de entregas offline/online |
| App Estoque Escolar | Expo 54, RN 0.81 | `apps/estoque-escolar-mobile/App.tsx` | Legado descontinuado; fora do escopo operacional |
| Desktop Shell | Electron 37 | `desktop/main.cjs`, `preload.cjs` | Empacota frontend/backend e APIs nativas |
| Shared Types | TypeScript | `shared/types/index.ts` | Contratos pretendidos/compartilhados |

## Integracoes externas

| Integracao | Uso | Confianca |
| --- | --- | --- |
| Vercel | Deploy web/backend e ajustes de monorepo/MIME/env | CONFIRMADO |
| Neon/PostgreSQL remoto | Banco via connection string com SSL verify-full | CONFIRMADO |
| Supabase client / upload assinado | Fotos de comprovante e possiveis servicos auxiliares | CONFIRMADO |
| S3/R2 compativel | Historico Git cita R2; backend usa AWS SDK S3 | CONFIRMADO/INFERIDO |
| Socket.IO/Realtime | Eventos de refresh/notificacoes recentes | CONFIRMADO |
| Redis/ioredis | Dependencia de cache/realtime; uso efetivo requer validacao | INFERIDO |
| PDF/Excel libs | Geracao de documentos e exportacoes | CONFIRMADO |
| Expo/EAS/Android | Build e execucao mobile | CONFIRMADO |

## Riscos e dividas arquiteturais

- LACUNA: slugs RBAC divergem entre frontend e backend (`pedidos`/`compras`, `demandas`/`guias`, `faturamento`/`faturamentos`).
- LACUNA: `shared` nao aparece importado pelo codigo ativo, podendo estar defasado.
- DESCONTINUADO: app `estoque-escolar-mobile` tem fluxos simulados/legados e nao deve ser tratado como alvo de producao.
- LACUNA: desktop nao bloqueia renderer aguardando backend local saudavel.
- LACUNA: Data Master ainda deve validar constraints, triggers e cardinalidades reais do schema.

## Artefatos relacionados

- C4 Contexto: `_reversa_sdd/c4-context.md`
- C4 Containers: `_reversa_sdd/c4-containers.md`
- C4 Componentes: `_reversa_sdd/c4-components.md`
- ERD: `_reversa_sdd/erd-complete.md`
- Deploy: `_reversa_sdd/deployment.md`
- Impacto: `_reversa_sdd/traceability/spec-impact-matrix.md`
